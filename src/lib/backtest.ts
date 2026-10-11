import { listDomains } from "./domains-repo";
import { runDomainPipeline } from "./pipeline";
import type { DomainConfig, DomainResult } from "./types";

export interface DomainBacktestResult {
  domain: DomainConfig;
  fetched: number;
  shortlisted: number;
  picked: number;
  fetchedIds: string[];
  shortlistedIds: string[];
  pickedIds: string[];
  error?: string;
}

export interface RecallLevel {
  found: number;
  total: number;
  recall: number | null;
  missingIds: string[];
}

export interface BacktestResult {
  windowStart: string;
  windowEnd: string;
  domains: DomainBacktestResult[];
  knownImportantIds: string[];
  recall: {
    fetched: RecallLevel;
    shortlisted: RecallLevel;
    picked: RecallLevel;
  };
}

function computeRecall(knownIds: string[], presentIds: Set<string>): RecallLevel {
  if (knownIds.length === 0) return { found: 0, total: 0, recall: null, missingIds: [] };
  const found = knownIds.filter((id) => presentIds.has(id));
  const missing = knownIds.filter((id) => !presentIds.has(id));
  return { found: found.length, total: knownIds.length, recall: found.length / knownIds.length, missingIds: missing };
}

export interface BacktestOptions {
  contactEmail: string;
  geminiApiKey: string;
  geminiModel: string;
  s2ApiKey?: string;
  githubToken?: string;
  domainIds?: string[];
}

/**
 * Replays a past window through the same fetch/enrich/rank/judge/select pipeline used for the
 * real weekly run, with no persistence and no email — purely to measure recall against a
 * known-important-papers list, at each funnel level (fetched / shortlisted / picked).
 */
export async function runBacktest(
  windowStart: Date,
  windowEnd: Date,
  knownImportantIds: string[],
  options: BacktestOptions,
): Promise<BacktestResult> {
  const allDomains = await listDomains(true);
  const domains = options.domainIds ? allDomains.filter((d) => options.domainIds!.includes(d.id)) : allDomains;

  const results: DomainBacktestResult[] = [];
  for (const domain of domains) {
    try {
      const result: DomainResult = await runDomainPipeline(
        domain,
        { start: windowStart, end: windowEnd },
        {
          contactEmail: options.contactEmail,
          geminiApiKey: options.geminiApiKey,
          geminiModel: options.geminiModel,
          s2ApiKey: options.s2ApiKey,
          githubToken: options.githubToken,
        },
      );
      results.push({
        domain,
        fetched: result.funnel.fetched,
        shortlisted: result.funnel.shortlisted,
        picked: result.funnel.picked,
        fetchedIds: result.allFetchedPapers.map((p) => p.arxivId),
        shortlistedIds: result.candidates.map((c) => c.paper.arxivId),
        pickedIds: result.picks.map((p) => p.paper.arxivId),
      });
    } catch (error) {
      results.push({
        domain,
        fetched: 0,
        shortlisted: 0,
        picked: 0,
        fetchedIds: [],
        shortlistedIds: [],
        pickedIds: [],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const fetchedIds = new Set(results.flatMap((r) => r.fetchedIds));
  const shortlistedIds = new Set(results.flatMap((r) => r.shortlistedIds));
  const pickedIds = new Set(results.flatMap((r) => r.pickedIds));

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    domains: results,
    knownImportantIds,
    recall: {
      fetched: computeRecall(knownImportantIds, fetchedIds),
      shortlisted: computeRecall(knownImportantIds, shortlistedIds),
      picked: computeRecall(knownImportantIds, pickedIds),
    },
  };
}
