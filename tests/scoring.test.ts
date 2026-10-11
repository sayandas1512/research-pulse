import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS } from "../src/config/ranking";
import { scoreCandidates } from "../src/lib/scoring";
import type { Paper, RawSignals } from "../src/lib/types";

function paper(id: string): Paper {
  return {
    arxivId: id,
    title: id,
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

function signals(partial: Partial<RawSignals>): RawSignals {
  return {
    keywordFit: 0,
    hfUpvotes: null,
    venueHint: false,
    codeLink: false,
    repoStars: null,
    authorSignal: null,
    crossDomainHits: 0,
    ...partial,
  };
}

describe("scoreCandidates", () => {
  it("ranks a clearly-stronger candidate above a weaker one", () => {
    const strong = { paper: paper("strong"), signals: signals({ keywordFit: 6, venueHint: true, codeLink: true, authorSignal: 20 }) };
    const weak = { paper: paper("weak"), signals: signals({ keywordFit: 1 }) };
    const [scoredStrong, scoredWeak] = scoreCandidates([strong, weak], DEFAULT_WEIGHTS);
    expect(scoredStrong.rankScore).toBeGreaterThan(scoredWeak.rankScore);
  });

  it("redistributes weight away from signals missing for nearly all candidates", () => {
    // hfUpvotes/repoStars/authorSignal are null for all 5 -> coverage 0 -> excluded,
    // and their combined weight (40 of 100) is redistributed across keywordFit/venueHint/
    // codeLink/crossDomainHits. Candidate 0 maxes out every still-included signal except
    // crossDomainHits (tied at 0 with everyone, so it reads as the lowest percentile at
    // index 0 under the stable tie-break) and should score well above its 25/100 raw weight
    // share of keywordFit+venueHint+codeLink would suggest without redistribution.
    const candidates = [
      { paper: paper("p0"), signals: signals({ keywordFit: 10, venueHint: true, codeLink: true }) },
      ...Array.from({ length: 4 }, (_, i) => ({ paper: paper(`p${i + 1}`), signals: signals({}) })),
    ];
    const [top] = scoreCandidates(candidates, DEFAULT_WEIGHTS);
    expect(top.rankScore).toBeGreaterThan(80);
  });

  it("scores 100 for a single candidate when all its coverage-qualifying signals max out", () => {
    // With one candidate, numeric signals always percentile to 100 regardless of raw value
    // (nothing to rank against) and null-valued signals (hfUpvotes/repoStars/authorSignal)
    // get redistributed away since their coverage is 0. Only boolean signals can still read
    // as 0, so set those true to hit the ceiling.
    const [only] = scoreCandidates(
      [{ paper: paper("only"), signals: signals({ venueHint: true, codeLink: true }) }],
      DEFAULT_WEIGHTS,
    );
    expect(only.rankScore).toBe(100);
  });

  it("returns an empty array for no candidates", () => {
    expect(scoreCandidates([], DEFAULT_WEIGHTS)).toEqual([]);
  });
});
