import { XMLParser } from "fast-xml-parser";
import type { DomainConfig, Paper } from "./types";
import { fetchWithTimeout, RateLimiter, sleep, userAgent, withRetry } from "./limits";

const ARXIV_API_BASE = "https://export.arxiv.org/api/query";
const PAGE_SIZE = 100;
const MAX_RESULTS_PER_DOMAIN = 150;

/** Global limiter shared across all arXiv calls in a run: arXiv asks for >=3s between requests. */
export const arxivLimiter = new RateLimiter(3_000);

function formatArxivDate(date: Date): string {
  const iso = date.toISOString();
  return iso.slice(0, 4) + iso.slice(5, 7) + iso.slice(8, 10) + iso.slice(11, 13) + iso.slice(14, 16);
}

export function buildSearchQuery(
  domain: Pick<DomainConfig, "arxivCategories" | "includeKeywords">,
  window: { start: Date; end: Date },
): string {
  const catClause = `(${domain.arxivCategories.map((c) => `cat:${c}`).join(" OR ")})`;
  const keywordClauses = domain.includeKeywords.flatMap((kw) => [`abs:"${kw}"`, `ti:"${kw}"`]);
  const keywordClause = keywordClauses.length > 0 ? ` AND (${keywordClauses.join(" OR ")})` : "";
  const dateClause = ` AND submittedDate:[${formatArxivDate(window.start)} TO ${formatArxivDate(window.end)}]`;
  return `${catClause}${keywordClause}${dateClause}`;
}

function buildUrl(searchQuery: string, start: number, maxResults: number): string {
  const params = new URLSearchParams({
    search_query: searchQuery,
    sortBy: "submittedDate",
    sortOrder: "descending",
    start: String(start),
    max_results: String(maxResults),
  });
  return `${ARXIV_API_BASE}?${params.toString()}`;
}

function stripArxivId(rawId: string): string {
  const match = /arxiv\.org\/abs\/([^/]+?)(v\d+)?$/.exec(rawId);
  return match ? match[1] : rawId;
}

function collapseWhitespace(text: string | undefined | null): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

interface AtomEntry {
  id: string;
  title: string;
  summary: string;
  published: string;
  updated: string;
  author?: { name: string } | { name: string }[];
  category?: { "@_term": string } | { "@_term": string }[];
  primary_category?: { "@_term": string };
  comment?: string;
  link?: { "@_href": string; "@_title"?: string; "@_type"?: string } | { "@_href": string; "@_title"?: string; "@_type"?: string }[];
}

function parseEntry(entry: AtomEntry): Paper {
  const arxivId = stripArxivId(entry.id);
  const authors = toArray(entry.author).map((a) => a.name);
  const categories = toArray(entry.category).map((c) => c["@_term"]);
  const primaryCategory = entry.primary_category?.["@_term"] ?? categories[0] ?? "";
  const links = toArray(entry.link);
  const pdfLink = links.find((l) => l["@_title"] === "pdf" || l["@_type"] === "application/pdf");

  let codeUrl: string | null = null;
  const combinedText = `${entry.summary ?? ""} ${entry.comment ?? ""}`;
  const githubMatch = /github\.com\/[\w-]+\/[\w.-]+/i.exec(combinedText);
  if (githubMatch) codeUrl = `https://${githubMatch[0].replace(/[).,]+$/, "")}`;

  return {
    arxivId,
    title: collapseWhitespace(entry.title),
    abstract: collapseWhitespace(entry.summary),
    authors,
    categories,
    primaryCategory,
    comment: entry.comment ? collapseWhitespace(entry.comment) : null,
    publishedAt: entry.published,
    updatedAt: entry.updated,
    absUrl: `https://arxiv.org/abs/${arxivId}`,
    pdfUrl: pdfLink?.["@_href"] ?? `https://arxiv.org/pdf/${arxivId}`,
    codeUrl,
  };
}

export function parseAtomFeed(xml: string): Paper[] {
  const parsed = parser.parse(xml);
  const entries = toArray<AtomEntry>(parsed?.feed?.entry);
  return entries.map(parseEntry);
}

function matchesExcludeKeyword(paper: Paper, excludeKeywords: string[]): boolean {
  if (excludeKeywords.length === 0) return false;
  const haystack = `${paper.title} ${paper.abstract}`.toLowerCase();
  return excludeKeywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

export interface FetchArxivResult {
  fetched: Paper[];
  afterExcludes: Paper[];
}

export async function fetchArxivDomain(
  domain: DomainConfig,
  window: { start: Date; end: Date },
  contactEmail: string,
): Promise<FetchArxivResult> {
  const searchQuery = buildSearchQuery(domain, window);
  const fetched: Paper[] = [];
  const seen = new Set<string>();

  let start = 0;
  while (start < MAX_RESULTS_PER_DOMAIN) {
    await arxivLimiter.wait();
    const url = buildUrl(searchQuery, start, PAGE_SIZE);
    const xml = await withRetry(
      async () => {
        const res = await fetchWithTimeout(url, { headers: { "User-Agent": userAgent(contactEmail) } }, 10_000);
        if (!res.ok) throw new Error(`arXiv HTTP ${res.status}`);
        return res.text();
      },
      { retries: 3, baseDelayMs: 1_000 },
    );
    const papers = parseAtomFeed(xml);
    if (papers.length === 0) break;
    for (const paper of papers) {
      if (!seen.has(paper.arxivId)) {
        seen.add(paper.arxivId);
        fetched.push(paper);
      }
    }
    if (papers.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
    await sleep(0);
  }

  const capped = fetched.slice(0, MAX_RESULTS_PER_DOMAIN);
  const afterExcludes = capped.filter((p) => !matchesExcludeKeyword(p, domain.excludeKeywords));
  return { fetched: capped, afterExcludes };
}
