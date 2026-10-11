import { describe, expect, it } from "vitest";
import { buildSearchQuery, parseAtomFeed } from "../src/lib/arxiv";

describe("buildSearchQuery", () => {
  it("builds a category + keyword + date-range query", () => {
    const query = buildSearchQuery(
      { arxivCategories: ["cs.AI", "cs.CL"], includeKeywords: ["agent", "tool use"] },
      { start: new Date("2026-10-04T15:11:00Z"), end: new Date("2026-10-11T15:11:00Z") },
    );
    expect(query).toBe(
      '(cat:cs.AI OR cat:cs.CL) AND (abs:"agent" OR ti:"agent" OR abs:"tool use" OR ti:"tool use") AND submittedDate:[202610041511 TO 202610111511]',
    );
  });

  it("omits the keyword clause when there are no include keywords", () => {
    const query = buildSearchQuery(
      { arxivCategories: ["cs.AI"], includeKeywords: [] },
      { start: new Date("2026-01-01T00:00:00Z"), end: new Date("2026-01-08T00:00:00Z") },
    );
    expect(query).toBe("(cat:cs.AI) AND submittedDate:[202601010000 TO 202601080000]");
  });
});

describe("parseAtomFeed", () => {
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2610.12453v1</id>
    <updated>2026-10-08T17:58:56Z</updated>
    <published>2026-10-08T17:58:56Z</published>
    <title>  Mental-Models for
      Multi-Agent Systems  </title>
    <summary>  We study mental models in multi-agent systems. Code at https://github.com/foo/bar.  </summary>
    <author><name>Hanan Gani</name></author>
    <author><name>M. Chandraker</name></author>
    <arxiv:comment>Accepted to NeurIPS 2026</arxiv:comment>
    <link href="http://arxiv.org/abs/2610.12453v1" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/2610.12453v1" rel="related" type="application/pdf"/>
    <category term="cs.MA" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <arxiv:primary_category term="cs.MA" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>`;

  it("parses a single entry into a Paper with stripped version suffix", () => {
    const [paper] = parseAtomFeed(sampleXml);
    expect(paper.arxivId).toBe("2610.12453");
    expect(paper.title).toBe("Mental-Models for Multi-Agent Systems");
    expect(paper.authors).toEqual(["Hanan Gani", "M. Chandraker"]);
    expect(paper.primaryCategory).toBe("cs.MA");
    expect(paper.categories).toEqual(["cs.MA", "cs.AI"]);
    expect(paper.comment).toBe("Accepted to NeurIPS 2026");
    expect(paper.pdfUrl).toBe("http://arxiv.org/pdf/2610.12453v1");
    expect(paper.codeUrl).toBe("https://github.com/foo/bar");
  });

  it("returns an empty array for a feed with no entries", () => {
    const empty = `<feed xmlns="http://www.w3.org/2005/Atom"></feed>`;
    expect(parseAtomFeed(empty)).toEqual([]);
  });

  it("does not crash when fast-xml-parser hands back a numeric-looking title/summary/comment (observed in production)", () => {
    const numericLooking = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2610.00001v1</id>
    <updated>2026-10-01T00:00:00Z</updated>
    <published>2026-10-01T00:00:00Z</published>
    <title>2024</title>
    <summary>42</summary>
    <author><name>A. Author</name></author>
    <arxiv:comment>7</arxiv:comment>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <arxiv:primary_category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>`;
    const [paper] = parseAtomFeed(numericLooking);
    expect(paper.title).toBe("2024");
    expect(paper.abstract).toBe("42");
    expect(paper.comment).toBe("7");
  });
});
