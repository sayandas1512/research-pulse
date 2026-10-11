import { VENUE_PATTERN } from "../config/ranking";
import type { Candidate, DomainConfig, Paper, RawSignals, SignalWeights } from "./types";

const LOW_COVERAGE_THRESHOLD = 0.1;

export interface EnrichmentData {
  hfUpvotes: Map<string, number>;
  authorHIndex: Map<string, number>;
  repoStars: Map<string, number>;
  /** How many other domains in this run also shortlisted this arXiv id. */
  crossDomainHits: Map<string, number>;
}

function countKeywordHits(paper: Paper, includeKeywords: string[]): number {
  const title = paper.title.toLowerCase();
  const abstract = paper.abstract.toLowerCase();
  let score = 0;
  for (const kw of includeKeywords) {
    const needle = kw.toLowerCase();
    if (title.includes(needle)) score += 2;
    if (abstract.includes(needle)) score += 1;
  }
  return score;
}

export function computeRawSignals(
  paper: Paper,
  domain: Pick<DomainConfig, "includeKeywords">,
  enrichment: EnrichmentData,
): RawSignals {
  const hfUpvotes = enrichment.hfUpvotes.get(paper.arxivId) ?? null;
  const authorSignal = enrichment.authorHIndex.get(paper.arxivId) ?? null;
  const repoStars = paper.codeUrl ? enrichment.repoStars.get(paper.arxivId) ?? null : null;
  const venueHint = VENUE_PATTERN.test(paper.comment ?? "");

  return {
    keywordFit: countKeywordHits(paper, domain.includeKeywords),
    hfUpvotes,
    venueHint,
    codeLink: paper.codeUrl !== null,
    repoStars,
    authorSignal,
    crossDomainHits: enrichment.crossDomainHits.get(paper.arxivId) ?? 0,
  };
}

/** Index-based percentile in [0, 100]; ties keep sort-stable ordering (acceptable for ranking, not scientific percentiles). */
function percentileRanks(values: number[]): number[] {
  const n = values.length;
  if (n <= 1) return values.map(() => 100);
  const sortedIndices = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v)
    .map((x) => x.i);
  const percentiles = new Array<number>(n);
  sortedIndices.forEach((originalIndex, sortedPosition) => {
    percentiles[originalIndex] = (sortedPosition / (n - 1)) * 100;
  });
  return percentiles;
}

type NumericSignalKey = "keywordFit" | "hfUpvotes" | "repoStars" | "authorSignal" | "crossDomainHits";
type BooleanSignalKey = "venueHint" | "codeLink";

const NUMERIC_KEYS: NumericSignalKey[] = ["keywordFit", "hfUpvotes", "repoStars", "authorSignal", "crossDomainHits"];
const BOOLEAN_KEYS: BooleanSignalKey[] = ["venueHint", "codeLink"];

export interface RankedCandidate {
  rankScore: number;
  percentiles: Record<keyof SignalWeights, number>;
}

/**
 * Scores candidates 0-100 from percentile-ranked signals within the domain.
 * A signal missing for nearly all candidates (coverage < 10%) has its weight
 * redistributed proportionally across the remaining covered signals.
 */
export function scoreCandidates(
  papers: { paper: Paper; signals: RawSignals }[],
  weights: SignalWeights,
): RankedCandidate[] {
  const n = papers.length;
  if (n === 0) return [];

  const coverage: Record<keyof SignalWeights, number> = {
    keywordFit: 1,
    hfUpvotes: 0,
    venueHint: 1,
    codeLink: 1,
    repoStars: 0,
    authorSignal: 0,
    crossDomainHits: 1,
  };
  for (const key of ["hfUpvotes", "repoStars", "authorSignal"] as const) {
    const present = papers.filter((p) => p.signals[key] !== null).length;
    coverage[key] = n === 0 ? 0 : present / n;
  }

  const includedKeys = Object.keys(weights).filter(
    (k) => coverage[k as keyof SignalWeights] >= LOW_COVERAGE_THRESHOLD,
  ) as (keyof SignalWeights)[];
  const excludedKeys = (Object.keys(weights) as (keyof SignalWeights)[]).filter(
    (k) => !includedKeys.includes(k),
  );

  const totalIncludedWeight = includedKeys.reduce((sum, k) => sum + weights[k], 0);
  const excludedWeightTotal = excludedKeys.reduce((sum, k) => sum + weights[k], 0);

  const effectiveWeights: Record<keyof SignalWeights, number> = { ...weights };
  for (const k of excludedKeys) effectiveWeights[k] = 0;
  if (totalIncludedWeight > 0) {
    for (const k of includedKeys) {
      effectiveWeights[k] = weights[k] + (weights[k] / totalIncludedWeight) * excludedWeightTotal;
    }
  }

  const percentilesByKey: Partial<Record<keyof SignalWeights, number[]>> = {};
  for (const key of NUMERIC_KEYS) {
    const values = papers.map((p) => p.signals[key] ?? 0);
    percentilesByKey[key] = percentileRanks(values);
  }
  for (const key of BOOLEAN_KEYS) {
    percentilesByKey[key] = papers.map((p) => (p.signals[key] ? 100 : 0));
  }

  return papers.map((_, idx) => {
    const percentiles = {} as Record<keyof SignalWeights, number>;
    let rankScore = 0;
    for (const key of Object.keys(weights) as (keyof SignalWeights)[]) {
      const pct = percentilesByKey[key]?.[idx] ?? 0;
      percentiles[key] = pct;
      rankScore += (pct * effectiveWeights[key]) / 100;
    }
    return { rankScore, percentiles };
  });
}

export function rankAndShortlist(
  papers: { paper: Paper; signals: RawSignals }[],
  weights: SignalWeights,
  shortlistSize: number,
): Candidate[] {
  const scored = scoreCandidates(papers, weights);
  const candidates: Candidate[] = papers.map((p, idx) => ({
    paper: p.paper,
    signals: p.signals,
    rankScore: scored[idx].rankScore,
    rank: 0,
  }));
  candidates.sort((a, b) => b.rankScore - a.rankScore);
  candidates.forEach((c, idx) => {
    c.rank = idx + 1;
  });
  return candidates.slice(0, shortlistSize);
}
