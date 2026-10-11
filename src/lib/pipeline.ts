import { DEFAULT_WEIGHTS, SHORTLIST_SIZE } from "../config/ranking";
import { fetchArxivDomain } from "./arxiv";
import { createCallCounter, judgeDomain, type JudgeCallCounter } from "./gemini";
import { fetchRepoStars, parseGithubRepo } from "./github";
import { fetchHfUpvotes } from "./hf";
import { fetchAuthorSignal } from "./scholar";
import { computeRawSignals, rankAndShortlist, type EnrichmentData } from "./scoring";
import { selectPicks } from "./select";
import type { DomainConfig, DomainResult, JudgedCandidate, Paper } from "./types";
import type { Window } from "./iso-week";

export interface RunDomainOptions {
  contactEmail: string;
  geminiApiKey: string;
  geminiModel: string;
  s2ApiKey?: string;
  githubToken?: string;
  judgeCallCounter?: JudgeCallCounter;
  skipJudge?: boolean;
}

async function buildEnrichment(
  papers: Paper[],
  window: Window,
  options: RunDomainOptions,
): Promise<EnrichmentData> {
  const [hfUpvotes, authorHIndex] = await Promise.all([
    fetchHfUpvotes(window, options.contactEmail),
    fetchAuthorSignal(
      papers.map((p) => p.arxivId),
      options.contactEmail,
      options.s2ApiKey,
    ),
  ]);

  const repoStars = new Map<string, number>();
  for (const paper of papers) {
    const ref = parseGithubRepo(paper.codeUrl);
    if (!ref) continue;
    const stars = await fetchRepoStars(ref, options.contactEmail, options.githubToken);
    if (stars !== null) repoStars.set(paper.arxivId, stars);
  }

  return { hfUpvotes, authorHIndex, repoStars, crossDomainHits: new Map() };
}

/**
 * Runs fetch -> enrich -> rank -> judge -> select for a single domain. Does not
 * persist anything — callers (CLI dry-run, "Preview this domain" admin action,
 * or the weekly orchestrator) decide what to do with the result.
 */
export async function runDomainPipeline(
  domain: DomainConfig,
  window: Window,
  options: RunDomainOptions,
): Promise<DomainResult> {
  const { fetched, afterExcludes } = await fetchArxivDomain(domain, window, options.contactEmail);

  let enrichment: EnrichmentData;
  try {
    enrichment = await buildEnrichment(afterExcludes, window, options);
  } catch {
    enrichment = { hfUpvotes: new Map(), authorHIndex: new Map(), repoStars: new Map(), crossDomainHits: new Map() };
  }

  const papersWithSignals = afterExcludes.map((paper) => ({
    paper,
    signals: computeRawSignals(paper, domain, enrichment),
  }));
  const weights = { ...DEFAULT_WEIGHTS, ...domain.weightOverrides };
  const shortlisted = rankAndShortlist(papersWithSignals, weights, SHORTLIST_SIZE);

  let judged: JudgedCandidate[];
  let aiAvailable = true;
  let error: string | undefined;

  if (options.skipJudge) {
    judged = shortlisted.map((c) => ({ ...c, verdict: null }));
    aiAvailable = false;
  } else {
    const counter = options.judgeCallCounter ?? createCallCounter(25);
    const judgeResult = await judgeDomain(domain, shortlisted, counter, options.geminiApiKey, options.geminiModel);
    aiAvailable = judgeResult.aiAvailable;
    error = judgeResult.error;
    const verdictById = new Map((judgeResult.verdicts ?? []).map((v) => [v.arxivId, v]));
    judged = shortlisted.map((c) => ({ ...c, verdict: verdictById.get(c.paper.arxivId) ?? null }));
  }

  const { picks, closestMiss } = selectPicks(judged);

  return {
    domain,
    funnel: {
      fetched: fetched.length,
      afterExcludes: afterExcludes.length,
      shortlisted: shortlisted.length,
      picked: picks.length,
    },
    allFetchedPapers: fetched,
    candidates: shortlisted,
    judged,
    picks,
    closestMiss,
    aiAvailable,
    error,
  };
}
