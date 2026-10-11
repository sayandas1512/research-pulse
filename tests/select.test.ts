import { describe, expect, it } from "vitest";
import { dedupeAcrossDomains, selectPicks } from "../src/lib/select";
import type { JudgedCandidate, Paper, SelectedPick } from "../src/lib/types";

function paper(id: string, title = id): Paper {
  return {
    arxivId: id,
    title,
    abstract: "",
    authors: [],
    categories: [],
    primaryCategory: "",
    comment: null,
    publishedAt: "",
    updatedAt: "",
    absUrl: "",
    pdfUrl: "",
    codeUrl: null,
  };
}

type Action = "read" | "skim" | "flag_for_client" | "skip";

function judged(id: string, significance: number, action: Action = "skim"): JudgedCandidate {
  return {
    paper: paper(id),
    signals: {
      keywordFit: 0,
      hfUpvotes: null,
      venueHint: false,
      codeLink: false,
      repoStars: null,
      authorSignal: null,
      crossDomainHits: 0,
    },
    rankScore: 0,
    rank: 0,
    verdict: {
      arxivId: id,
      significance,
      paperType: "new_method",
      evidenceStrength: "moderate",
      soWhat: "",
      caveat: "",
      action,
    },
  };
}

describe("selectPicks", () => {
  it("keeps only significance >= threshold and action != skip, sorted descending, capped at maxPicks", () => {
    const candidates = [
      judged("low", 3),
      judged("skip-high", 9, "skip"),
      judged("mid", 6),
      judged("high", 8, "flag_for_client"),
      judged("mid2", 7),
      judged("mid3", 6, "read"),
    ];
    const { picks } = selectPicks(candidates);
    expect(picks.map((p) => p.paper.arxivId)).toEqual(["high", "mid2", "mid"]);
  });

  it("reports the closest miss among non-picked judged candidates", () => {
    const candidates = [judged("picked", 8), judged("miss", 5), judged("worse-miss", 2)];
    const { picks, closestMiss } = selectPicks(candidates);
    expect(picks).toHaveLength(1);
    expect(closestMiss?.paper.arxivId).toBe("miss");
  });

  it("returns no picks and a null closest miss for an empty domain", () => {
    const { picks, closestMiss } = selectPicks([]);
    expect(picks).toEqual([]);
    expect(closestMiss).toBeNull();
  });

  it("ignores candidates with no verdict (AI unavailable)", () => {
    const noVerdict: JudgedCandidate = { ...judged("x", 9), verdict: null };
    const { picks, closestMiss } = selectPicks([noVerdict]);
    expect(picks).toEqual([]);
    expect(closestMiss).toBeNull();
  });
});

function pick(id: string, significance: number, action: Action = "skim"): SelectedPick {
  const base = judged(id, significance, action);
  if (!base.verdict) throw new Error("test helper always sets a verdict");
  return { ...base, verdict: base.verdict, alsoInDomains: [] };
}

describe("dedupeAcrossDomains", () => {
  it("keeps a cross-listed paper only under the domain where it scored highest, with an also-in note", () => {
    const sharedPaperA: SelectedPick = pick("shared", 7);
    const sharedPaperB: SelectedPick = pick("shared", 9);
    const uniqueToDomainA: SelectedPick = pick("unique-a", 6);

    const picksByDomain = new Map<string, SelectedPick[]>([
      ["Domain A", [sharedPaperA, uniqueToDomainA]],
      ["Domain B", [sharedPaperB]],
    ]);

    const result = dedupeAcrossDomains(picksByDomain);

    expect(result.get("Domain A")!.map((p) => p.paper.arxivId)).toEqual(["unique-a"]);
    expect(result.get("Domain B")!.map((p) => p.paper.arxivId)).toEqual(["shared"]);
    expect(result.get("Domain B")![0].alsoInDomains).toEqual(["Domain A"]);
  });
});
