import { sendAlert } from "./alerts";
import { fetchPaperFullText, verifyClaim } from "./deepread";
import { createCallCounter, generateHeadline } from "./gemini";
import { isoWeekKey, weeklyWindow } from "./iso-week";
import { listDomains } from "./domains-repo";
import { sendMail } from "./mailer";
import { runDomainPipeline } from "./pipeline";
import { applyWordBudget, type BriefData, type DomainBriefSection, type RenderPick } from "./render";
import { dedupeAcrossDomains, selectPicks } from "./select";
import {
  createBrief,
  createRun,
  findBriefForWeek,
  findRunForWeek,
  getCompletedDomainIds,
  listRunSteps,
  loadJudgedCandidatesForRun,
  markBriefSendFailed,
  markBriefSent,
  recordDomainStep,
  saveCandidates,
  updateRunStatus,
  upsertPapers,
} from "./runs-repo";
import type { DomainConfig, JudgedCandidate, JudgeVerdict } from "./types";

/** Safety margin under Vercel's 300s maxDuration for this route. */
const ORCHESTRATOR_BUDGET_MS = 260_000;

/** Headroom finalize (headline + render + persist + send, optionally deep-read) needs before
 * starting — if an invocation doesn't have this much left after finishing the last domain,
 * finalize waits for a fresh invocation rather than risk being cut off mid-send. */
const FINALIZE_MIN_REMAINING_MS = 110_000;

export interface OrchestratorOptions {
  trigger: "cron" | "manual";
  force?: boolean;
  contactEmail: string;
  geminiApiKey: string;
  geminiModel: string;
  s2ApiKey?: string;
  githubToken?: string;
  appUrl: string;
}

export interface OrchestratorResult {
  status: "already_done" | "complete" | "continuing" | "failed";
  isoWeek: string;
  runId?: string;
  needsContinuation?: boolean;
}

export async function runWeeklyOrchestrator(options: OrchestratorOptions): Promise<OrchestratorResult> {
  const invocationStart = Date.now();
  const runTime = new Date();
  const isoWeek = isoWeekKey(runTime);
  const window = weeklyWindow(runTime);

  const existingBrief = await findBriefForWeek(isoWeek);
  if (existingBrief?.status === "sent" && !options.force) {
    return { status: "already_done", isoWeek };
  }

  let run = await findRunForWeek(isoWeek);
  if (!run || (run.status !== "continuing" && run.status !== "running")) {
    run = await createRun({
      isoWeek,
      trigger: options.trigger,
      type: "weekly",
      windowStart: window.start,
      windowEnd: window.end,
    });
  } else {
    await updateRunStatus(run.id, "running");
  }

  const allDomains = await listDomains(true);
  const completedDomainIds = await getCompletedDomainIds(run.id);
  const remainingDomains = allDomains.filter((d) => !completedDomainIds.has(d.id));

  for (const domain of remainingDomains) {
    if (Date.now() - invocationStart > ORCHESTRATOR_BUDGET_MS) {
      await updateRunStatus(run.id, "continuing", { stats: { reason: "time_budget" } });
      return { status: "continuing", isoWeek, runId: run.id, needsContinuation: true };
    }

    try {
      const result = await runDomainPipeline(domain, window, {
        contactEmail: options.contactEmail,
        geminiApiKey: options.geminiApiKey,
        geminiModel: options.geminiModel,
        s2ApiKey: options.s2ApiKey,
        githubToken: options.githubToken,
        judgeCallCounter: createCallCounter(25),
      });

      await upsertPapers(result.allFetchedPapers);
      await saveCandidates(run.id, domain.id, result);
      await recordDomainStep(run.id, domain.id, "complete", {
        fetched: result.funnel.fetched,
        afterExcludes: result.funnel.afterExcludes,
        shortlisted: result.funnel.shortlisted,
        picked: result.funnel.picked,
        aiAvailable: result.aiAvailable ? 1 : 0,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await recordDomainStep(run.id, domain.id, "failed", {}, message);
      await sendAlert(`Domain fetch failed: ${domain.name}`, `Run ${run.id} (${isoWeek}): ${message}`);
    }
  }

  // All active domains for this run are now complete (across however many invocations it took).
  // Finalize (headline, render, persist, send, and optionally deep-read) needs its own headroom.
  // If this invocation already spent most of its budget just finishing the last few domains,
  // hand finalize to a fresh invocation instead of cramming it in — this is what makes deep-read
  // actually get a chance to run in practice, rather than always being skipped for lack of time.
  if (ORCHESTRATOR_BUDGET_MS - (Date.now() - invocationStart) < FINALIZE_MIN_REMAINING_MS) {
    await updateRunStatus(run.id, "continuing", { stats: { reason: "reserving_budget_for_finalize" } });
    return { status: "continuing", isoWeek, runId: run.id, needsContinuation: true };
  }

  try {
    return await finalizeRun(run.id, isoWeek, allDomains, options, invocationStart);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateRunStatus(run.id, "failed", { error: message, finishedAt: new Date() });
    await sendAlert(`Run ${isoWeek} failed during finalization`, `Run ${run.id}: ${message}`);
    return { status: "failed", isoWeek, runId: run.id };
  }
}

interface CandidateRow {
  domainId: string | null;
  arxivId: string;
  signals: unknown;
  rankScore: number;
  rank: number;
  verdict: Record<string, unknown> | null;
  paper: {
    arxivId: string;
    title: string;
    abstract: string;
    authors: unknown;
    categories: string[];
    primaryCategory: string;
    comment: string | null;
    publishedAt: Date;
    updatedAt: Date;
    absUrl: string;
    pdfUrl: string;
    codeUrl: string | null;
  };
}

function toJudgedCandidate(row: CandidateRow): JudgedCandidate {
  const verdict = row.verdict
    ? ({
        arxivId: row.arxivId,
        significance: Number(row.verdict.significance),
        paperType: row.verdict.paperType as JudgeVerdict["paperType"],
        evidenceStrength: row.verdict.evidenceStrength as JudgeVerdict["evidenceStrength"],
        soWhat: String(row.verdict.soWhat),
        caveat: String(row.verdict.caveat),
        action: row.verdict.action as JudgeVerdict["action"],
      } satisfies JudgeVerdict)
    : null;

  return {
    paper: {
      arxivId: row.paper.arxivId,
      title: row.paper.title,
      abstract: row.paper.abstract,
      authors: row.paper.authors as string[],
      categories: row.paper.categories,
      primaryCategory: row.paper.primaryCategory,
      comment: row.paper.comment,
      publishedAt: row.paper.publishedAt.toISOString(),
      updatedAt: row.paper.updatedAt.toISOString(),
      absUrl: row.paper.absUrl,
      pdfUrl: row.paper.pdfUrl,
      codeUrl: row.paper.codeUrl,
    },
    signals: row.signals as JudgedCandidate["signals"],
    rankScore: row.rankScore,
    rank: row.rank,
    verdict,
  };
}

/** Deep-read needs this much headroom left in the invocation's budget to be worth attempting
 * (one pick per domain, each ~ arXiv HTML fetch + rate limit + a Gemini call). If there isn't
 * enough left, skip it entirely rather than risk the brief itself getting killed by Vercel's
 * hard 300s limit — deep-read is optional context, sending the brief is not. */
const DEEP_READ_MIN_REMAINING_MS = 90_000;

async function finalizeRun(
  runId: string,
  isoWeek: string,
  allDomains: DomainConfig[],
  options: OrchestratorOptions,
  invocationStart: number,
): Promise<OrchestratorResult> {
  const candidateRows = await loadJudgedCandidatesForRun(runId);
  const steps = await listRunSteps(runId);
  const stepByDomain = new Map(steps.map((s) => [s.domainId, s]));

  // Recomputed from the full persisted run state (not invocation-local arrays) so that
  // issues recorded in an earlier invocation of a resumed run are never silently dropped.
  const domainNameById = new Map(allDomains.map((d) => [d.id, d.name]));
  const failedDomains = steps
    .filter((s) => s.status === "failed")
    .map((s) => (s.domainId ? domainNameById.get(s.domainId) ?? s.domainId : "unknown"));
  const zeroCandidateDomains = allDomains
    .filter((d) => ((stepByDomain.get(d.id)?.counts as Record<string, number> | undefined)?.afterExcludes ?? -1) === 0)
    .map((d) => d.name);

  const judgedByDomain = new Map<string, JudgedCandidate[]>();
  for (const row of candidateRows) {
    if (!row.domainId) continue;
    const list = judgedByDomain.get(row.domainId) ?? [];
    list.push(toJudgedCandidate(row as CandidateRow));
    judgedByDomain.set(row.domainId, list);
  }

  const picksByDomainName = new Map<string, RenderPick[]>();
  const sections: DomainBriefSection[] = [];
  const unavailableDomains: string[] = [];

  for (const domain of allDomains) {
    const judged = judgedByDomain.get(domain.id) ?? [];
    const { picks: selected, closestMiss } = selectPicks(judged);
    const picks: RenderPick[] = selected.map((p) => ({ ...p, itemId: crypto.randomUUID() }));
    const step = stepByDomain.get(domain.id);
    const aiAvailable = step?.counts ? (step.counts as Record<string, number>).aiAvailable !== 0 : true;
    if (!aiAvailable) unavailableDomains.push(domain.name);

    picksByDomainName.set(domain.name, picks);
    sections.push({
      domain,
      picks,
      closestMissTitle: closestMiss?.paper.title ?? null,
      scanned: (step?.counts as Record<string, number> | undefined)?.fetched ?? 0,
      shortlisted: (step?.counts as Record<string, number> | undefined)?.shortlisted ?? 0,
      aiAvailable,
    });
  }

  const dedupedByDomain = dedupeAcrossDomains(picksByDomainName);
  for (const section of sections) {
    section.picks = dedupedByDomain.get(section.domain.name) ?? [];
  }

  const allPicksText = sections
    .flatMap((s) => s.picks.map((p) => `[${s.domain.name}] ${p.paper.title}: ${p.verdict.soWhat}`))
    .join("\n");
  const headlineCounter = createCallCounter(5);
  const headlineResult =
    allPicksText.length > 0
      ? await generateHeadline(allPicksText, options.geminiApiKey, options.geminiModel, headlineCounter)
      : { text: null, aiAvailable: true };

  const briefData: BriefData = {
    isoWeek,
    headline: headlineResult.text,
    sections,
    unavailableDomains,
    appUrl: options.appUrl,
    feedbackSecret: process.env.FEEDBACK_HMAC_SECRET,
  };

  const { data: trimmedData, html, wordCount } = await applyWordBudget(briefData);

  const remainingMs = ORCHESTRATOR_BUDGET_MS - (Date.now() - invocationStart);
  const claimChecks = new Map<string, Awaited<ReturnType<typeof verifyClaim>>>();
  if (remainingMs >= DEEP_READ_MIN_REMAINING_MS) {
    const deepReadCounter = createCallCounter(10);
    for (const section of trimmedData.sections) {
      const topPick = section.picks[0]; // picks are pre-sorted by significance descending
      if (!topPick) continue;
      if (Date.now() - invocationStart > ORCHESTRATOR_BUDGET_MS) break; // bail if we've run over mid-loop
      try {
        const fullText = await fetchPaperFullText(topPick.paper.arxivId, options.contactEmail);
        const result = await verifyClaim(
          topPick.paper.title,
          topPick.paper.abstract,
          topPick.verdict.soWhat,
          fullText,
          options.geminiApiKey,
          options.geminiModel,
          deepReadCounter,
        );
        claimChecks.set(topPick.paper.arxivId, result);
      } catch {
        // Deep read is optional context; a failure here must not affect the brief.
      }
    }
  }

  const items = trimmedData.sections.flatMap((section) =>
    section.picks.map((pick, idx) => ({
      id: pick.itemId,
      domainId: section.domain.id,
      arxivId: pick.paper.arxivId,
      position: idx,
      significance: pick.verdict.significance,
      paperType: pick.verdict.paperType,
      evidenceStrength: pick.verdict.evidenceStrength,
      soWhat: pick.verdict.soWhat,
      caveat: pick.verdict.caveat,
      action: pick.verdict.action,
      aiAvailable: section.aiAvailable,
      model: options.geminiModel,
      promptVersion: "v1",
      claimCheck: claimChecks.get(pick.paper.arxivId) ?? null,
    })),
  );

  const brief = await createBrief({ isoWeek, runId, headline: headlineResult.text, html, wordCount, items });

  const kavitaEmail = process.env.KAVITA_EMAIL;
  let sendOk = false;
  if (kavitaEmail) {
    const mailResult = await sendMail({ to: kavitaEmail, subject: `Research Pulse — ${isoWeek}`, html });
    sendOk = mailResult.ok;
    if (sendOk) {
      await markBriefSent(brief.id);
    } else {
      await markBriefSendFailed(brief.id);
      await sendAlert(`Brief send failed for ${isoWeek}`, mailResult.error ?? "unknown error");
    }
  } else {
    await markBriefSendFailed(brief.id);
  }

  const hadIssues = failedDomains.length > 0 || zeroCandidateDomains.length > 0 || unavailableDomains.length > 0 || !sendOk;
  if (hadIssues) {
    await sendAlert(
      `Run ${isoWeek} completed with issues`,
      [
        failedDomains.length > 0 ? `Domains with AI/fetch issues: ${failedDomains.join(", ")}` : "",
        zeroCandidateDomains.length > 0 ? `Domains with zero candidates: ${zeroCandidateDomains.join(", ")}` : "",
        !sendOk ? "Email send failed." : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  await updateRunStatus(runId, sendOk ? "complete" : "partial", {
    finishedAt: new Date(),
    stats: { wordCount, picksTotal: items.length, failedDomains, zeroCandidateDomains, sendOk },
  });

  return { status: "complete", isoWeek, runId };
}
