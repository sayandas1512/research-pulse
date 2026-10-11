import { describe, expect, it } from "vitest";
import { applyWordBudget, renderBriefHtml, readTimeMinutes, WORD_BUDGET, type BriefData, type DomainBriefSection, type RenderPick } from "../src/lib/render";
import type { DomainConfig, Paper } from "../src/lib/types";

function domain(name: string): DomainConfig {
  return {
    id: name,
    name,
    description: "",
    arxivCategories: [],
    includeKeywords: [],
    excludeKeywords: [],
    significanceNote: "",
    active: true,
    sortOrder: 0,
  };
}

function paper(id: string, title: string): Paper {
  return {
    arxivId: id,
    title,
    abstract: "",
    authors: ["A. Author"],
    categories: [],
    primaryCategory: "",
    comment: null,
    publishedAt: "",
    updatedAt: "",
    absUrl: `https://arxiv.org/abs/${id}`,
    pdfUrl: "",
    codeUrl: null,
  };
}

function pick(id: string, significance: number, soWhatWords: number): RenderPick {
  return {
    itemId: `item-${id}`,
    paper: paper(id, `Title ${id}`),
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
    rank: 1,
    verdict: {
      arxivId: id,
      significance,
      paperType: "new_method",
      evidenceStrength: "moderate",
      soWhat: Array.from({ length: soWhatWords }, (_, i) => `word${i}`).join(" "),
      caveat: "a caveat",
      action: "skim",
    },
    alsoInDomains: [],
  };
}

function section(name: string, picks: RenderPick[]): DomainBriefSection {
  return { domain: domain(name), picks, closestMissTitle: null, scanned: 10, shortlisted: picks.length, aiAvailable: true };
}

describe("renderBriefHtml", () => {
  it("renders domain sections, picks, and the footer with coverage counts", async () => {
    const data: BriefData = {
      isoWeek: "2026-W41",
      headline: "A quiet week overall.",
      sections: [section("AI agents", [pick("1", 7, 10)])],
      unavailableDomains: [],
      appUrl: "https://example.com",
    };
    const { html, wordCount } = await renderBriefHtml(data);
    expect(html).toContain("AI agents");
    expect(html).toContain("Title 1");
    expect(html).toContain("Scanned 10, shortlisted 1, shown 1.");
    expect(wordCount).toBeGreaterThan(0);
  });

  it("shows a 'nothing significant' message with closest miss when a domain has no picks", async () => {
    const data: BriefData = {
      isoWeek: "2026-W41",
      headline: null,
      sections: [{ ...section("Quiet domain", []), closestMissTitle: "Almost Made It" }],
      unavailableDomains: [],
      appUrl: "https://example.com",
    };
    const { html } = await renderBriefHtml(data);
    expect(html).toContain("Nothing significant this week");
    expect(html).toContain("Almost Made It");
  });

  it("shows an AI-unavailable banner instead of picks when aiAvailable is false", async () => {
    const data: BriefData = {
      isoWeek: "2026-W41",
      headline: null,
      sections: [{ ...section("Broken domain", []), aiAvailable: false }],
      unavailableDomains: ["Broken domain"],
      appUrl: "https://example.com",
    };
    const { html } = await renderBriefHtml(data);
    expect(html).toContain("AI summaries unavailable");
    expect(html).toContain("Unavailable this week: Broken domain");
  });
});

describe("applyWordBudget", () => {
  it("leaves a brief under budget unchanged", async () => {
    const data: BriefData = {
      isoWeek: "2026-W41",
      headline: null,
      sections: [section("Domain", [pick("1", 8, 10)])],
      unavailableDomains: [],
      appUrl: "https://example.com",
    };
    const { dropped, wordCount } = await applyWordBudget(data);
    expect(dropped).toBe(0);
    expect(wordCount).toBeLessThan(WORD_BUDGET);
  });

  it("drops the lowest-significance pick across all domains, never the highest, until under budget", async () => {
    // Each pick's so_what is long enough that a handful of them blow well past budget.
    const bigPick = (id: string, significance: number) => pick(id, significance, 400);
    const data: BriefData = {
      isoWeek: "2026-W41",
      headline: null,
      sections: [
        section("Domain A", [bigPick("low", 6), bigPick("high", 9)]),
        section("Domain B", [bigPick("mid", 7)]),
      ],
      unavailableDomains: [],
      appUrl: "https://example.com",
    };
    const result = await applyWordBudget(data, 500);
    expect(result.wordCount).toBeLessThanOrEqual(500);
    expect(result.dropped).toBeGreaterThan(0);

    const remainingIds = result.data.sections.flatMap((s) => s.picks.map((p) => p.paper.arxivId));
    expect(remainingIds).toContain("high"); // highest-significance pick must survive
    expect(remainingIds).not.toContain("low"); // lowest-significance pick is dropped first
  });

  it("stops dropping once every pick is gone, even if still over budget", async () => {
    const data: BriefData = {
      isoWeek: "2026-W41",
      headline: "A headline so long it alone exceeds any reasonable tiny budget for this test case here.",
      sections: [section("Domain", [pick("1", 5, 5)])],
      unavailableDomains: [],
      appUrl: "https://example.com",
    };
    const result = await applyWordBudget(data, 1);
    expect(result.data.sections[0].picks).toHaveLength(0);
  });
});

describe("readTimeMinutes", () => {
  it("rounds to the nearest minute at 230 words/minute, minimum 1", () => {
    expect(readTimeMinutes(230)).toBe(1);
    expect(readTimeMinutes(460)).toBe(2);
    expect(readTimeMinutes(10)).toBe(1);
  });
});
