import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db/client";
import { briefItems, briefs, candidates, papers, runs, runSteps } from "./db/schema";
import type { DomainResult, Paper } from "./types";

export async function findRunForWeek(isoWeek: string) {
  const db = getDb();
  const [run] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.isoWeek, isoWeek), eq(runs.type, "weekly")))
    .orderBy(desc(runs.startedAt))
    .limit(1);
  return run ?? null;
}

export async function createRun(input: {
  isoWeek: string;
  trigger: "cron" | "manual" | "backtest";
  type: "weekly" | "backtest";
  windowStart: Date;
  windowEnd: Date;
}) {
  const db = getDb();
  const [run] = await db
    .insert(runs)
    .values({ ...input, status: "running" })
    .returning();
  return run;
}

export async function updateRunStatus(
  runId: string,
  status: "queued" | "running" | "continuing" | "complete" | "partial" | "failed",
  extra: { stats?: Record<string, unknown>; error?: string; finishedAt?: Date } = {},
) {
  const db = getDb();
  await db
    .update(runs)
    .set({ status, ...extra })
    .where(eq(runs.id, runId));
}

export async function getCompletedDomainIds(runId: string): Promise<Set<string>> {
  const db = getDb();
  const rows = await db
    .select({ domainId: runSteps.domainId })
    .from(runSteps)
    .where(and(eq(runSteps.runId, runId), eq(runSteps.step, "domain"), eq(runSteps.status, "complete")));
  return new Set(rows.map((r) => r.domainId).filter((id): id is string => id !== null));
}

export async function recordDomainStep(
  runId: string,
  domainId: string,
  status: "complete" | "failed",
  counts: Record<string, number>,
  error?: string,
) {
  const db = getDb();
  await db.insert(runSteps).values({
    runId,
    domainId,
    step: "domain",
    status,
    finishedAt: new Date(),
    counts,
    error,
  });
}

export async function upsertPapers(papersToSave: Paper[]) {
  if (papersToSave.length === 0) return;
  const db = getDb();
  await db
    .insert(papers)
    .values(
      papersToSave.map((p) => ({
        arxivId: p.arxivId,
        title: p.title,
        abstract: p.abstract,
        authors: p.authors,
        categories: p.categories,
        primaryCategory: p.primaryCategory,
        comment: p.comment,
        publishedAt: new Date(p.publishedAt),
        updatedAt: new Date(p.updatedAt),
        absUrl: p.absUrl,
        pdfUrl: p.pdfUrl,
        codeUrl: p.codeUrl,
      })),
    )
    .onConflictDoUpdate({
      target: papers.arxivId,
      set: {
        title: sql`excluded.title`,
        abstract: sql`excluded.abstract`,
        updatedAt: sql`excluded.updated_at`,
        comment: sql`excluded.comment`,
        codeUrl: sql`excluded.code_url`,
      },
    });
}

export async function saveCandidates(runId: string, domainId: string, result: DomainResult) {
  if (result.candidates.length === 0) return;
  const db = getDb();
  const verdictById = new Map(result.judged.map((j) => [j.paper.arxivId, j.verdict]));
  await db
    .insert(candidates)
    .values(
      result.candidates.map((c) => ({
        runId,
        domainId,
        arxivId: c.paper.arxivId,
        signals: c.signals as unknown as Record<string, unknown>,
        rankScore: c.rankScore,
        rank: c.rank,
        shortlisted: true,
        verdict: (verdictById.get(c.paper.arxivId) as unknown as Record<string, unknown> | null) ?? null,
      })),
    )
    .onConflictDoNothing();
}

/** Reconstructs each completed domain's judged candidates from persisted candidates+papers rows — used when finalizing a run across multiple (possibly resumed) invocations. */
export async function loadJudgedCandidatesForRun(runId: string) {
  const db = getDb();
  const rows = await db
    .select({
      domainId: candidates.domainId,
      arxivId: candidates.arxivId,
      signals: candidates.signals,
      rankScore: candidates.rankScore,
      rank: candidates.rank,
      verdict: candidates.verdict,
      paper: papers,
    })
    .from(candidates)
    .innerJoin(papers, eq(candidates.arxivId, papers.arxivId))
    .where(eq(candidates.runId, runId));
  return rows;
}

export async function findBriefForWeek(isoWeek: string) {
  const db = getDb();
  const [brief] = await db.select().from(briefs).where(eq(briefs.isoWeek, isoWeek));
  return brief ?? null;
}

export interface BriefItemInput {
  /** Pre-generated so the email HTML (rendered before this insert) can embed working feedback links. */
  id: string;
  domainId: string;
  arxivId: string;
  position: number;
  significance: number;
  paperType: string;
  evidenceStrength: string;
  soWhat: string;
  caveat: string;
  action: string;
  aiAvailable: boolean;
  model?: string;
  promptVersion?: string;
}

/**
 * Upserts the brief by isoWeek (not a plain insert): a `force` re-run of a week that
 * already has a brief must replace it, not violate the unique(iso_week) constraint.
 * Replaces brief_items wholesale since there's no stable identity to diff against.
 */
export async function createBrief(input: {
  isoWeek: string;
  runId: string;
  headline: string | null;
  html: string;
  wordCount: number;
  items: BriefItemInput[];
}) {
  const db = getDb();
  const [brief] = await db
    .insert(briefs)
    .values({
      isoWeek: input.isoWeek,
      runId: input.runId,
      headline: input.headline,
      html: input.html,
      wordCount: input.wordCount,
      status: "saved",
    })
    .onConflictDoUpdate({
      target: briefs.isoWeek,
      set: {
        runId: input.runId,
        headline: input.headline,
        html: input.html,
        wordCount: input.wordCount,
        status: "saved",
        sentAt: null,
      },
    })
    .returning();

  await db.delete(briefItems).where(eq(briefItems.briefId, brief.id));
  if (input.items.length > 0) {
    await db.insert(briefItems).values(input.items.map((item) => ({ ...item, briefId: brief.id })));
  }
  return brief;
}

export async function markBriefSent(briefId: string) {
  const db = getDb();
  await db.update(briefs).set({ status: "sent", sentAt: new Date() }).where(eq(briefs.id, briefId));
}

export async function markBriefSendFailed(briefId: string) {
  const db = getDb();
  await db.update(briefs).set({ status: "send_failed" }).where(eq(briefs.id, briefId));
}

export async function listBriefs() {
  const db = getDb();
  return db.select().from(briefs).orderBy(desc(briefs.isoWeek));
}

export async function getBriefWithItems(isoWeek: string) {
  const db = getDb();
  const [brief] = await db.select().from(briefs).where(eq(briefs.isoWeek, isoWeek));
  if (!brief) return null;
  const items = await db.select().from(briefItems).where(eq(briefItems.briefId, brief.id));
  return { brief, items };
}

export async function getBriefWithItemsDetailed(isoWeek: string) {
  const db = getDb();
  const [brief] = await db.select().from(briefs).where(eq(briefs.isoWeek, isoWeek));
  if (!brief) return null;

  const { domains } = await import("./db/schema");
  const rows = await db
    .select({ item: briefItems, paper: papers, domainName: domains.name })
    .from(briefItems)
    .innerJoin(papers, eq(briefItems.arxivId, papers.arxivId))
    .innerJoin(domains, eq(briefItems.domainId, domains.id))
    .where(eq(briefItems.briefId, brief.id))
    .orderBy(briefItems.position);

  return { brief, items: rows };
}

export async function listRuns(limit = 20) {
  const db = getDb();
  return db.select().from(runs).orderBy(desc(runs.startedAt)).limit(limit);
}

export async function listRunSteps(runId: string) {
  const db = getDb();
  return db.select().from(runSteps).where(eq(runSteps.runId, runId));
}
