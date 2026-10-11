import type { JudgedCandidate, SelectedPick } from "./types";

export const DEFAULT_SIGNIFICANCE_THRESHOLD = 6;
export const MAX_PICKS_PER_DOMAIN = 3;

export interface SelectionResult {
  picks: SelectedPick[];
  closestMiss: JudgedCandidate | null;
}

/**
 * Per-domain selection: keep action != skip and significance >= threshold, highest
 * first, capped at maxPicks. Cross-domain "also in" dedupe happens at the orchestrator
 * level once all domains have been judged, since it needs the full run's picks.
 */
export function selectPicks(
  judged: JudgedCandidate[],
  threshold = DEFAULT_SIGNIFICANCE_THRESHOLD,
  maxPicks = MAX_PICKS_PER_DOMAIN,
): SelectionResult {
  const withVerdict = judged.filter(
    (c): c is JudgedCandidate & { verdict: NonNullable<JudgedCandidate["verdict"]> } => c.verdict !== null,
  );

  const qualifying = withVerdict
    .filter((c) => c.verdict.action !== "skip" && c.verdict.significance >= threshold)
    .sort((a, b) => b.verdict.significance - a.verdict.significance);

  const picks: SelectedPick[] = qualifying.slice(0, maxPicks).map((c) => ({ ...c, alsoInDomains: [] }));

  const pickedIds = new Set(picks.map((p) => p.paper.arxivId));
  const closestMiss =
    withVerdict
      .filter((c) => !pickedIds.has(c.paper.arxivId))
      .sort((a, b) => b.verdict.significance - a.verdict.significance)[0] ?? null;

  return { picks, closestMiss };
}

/**
 * Cross-domain dedupe: a paper appearing in multiple domains' picks is kept only
 * under the domain where it scored highest, with an "also in" note on that pick.
 */
export function dedupeAcrossDomains(
  picksByDomain: Map<string, SelectedPick[]>,
): Map<string, SelectedPick[]> {
  const bestDomainForPaper = new Map<string, { domainName: string; significance: number }>();
  for (const [domainName, picks] of picksByDomain) {
    for (const pick of picks) {
      const existing = bestDomainForPaper.get(pick.paper.arxivId);
      if (!existing || pick.verdict.significance > existing.significance) {
        bestDomainForPaper.set(pick.paper.arxivId, { domainName, significance: pick.verdict.significance });
      }
    }
  }

  const result = new Map<string, SelectedPick[]>();
  for (const [domainName, picks] of picksByDomain) {
    const kept: SelectedPick[] = [];
    for (const pick of picks) {
      const best = bestDomainForPaper.get(pick.paper.arxivId);
      if (best?.domainName !== domainName) continue;
      const alsoIn = [...picksByDomain.entries()]
        .filter(([d, ps]) => d !== domainName && ps.some((p) => p.paper.arxivId === pick.paper.arxivId))
        .map(([d]) => d);
      kept.push({ ...pick, alsoInDomains: alsoIn });
    }
    result.set(domainName, kept);
  }
  return result;
}
