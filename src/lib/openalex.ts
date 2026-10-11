import { fetchWithTimeout, RateLimiter, userAgent, withRetry } from "./limits";

const OPENALEX_BASE = "https://api.openalex.org";
const MAX_AUTHORS_CHECKED = 3; // bound N+1 author-profile calls per paper

export const openAlexLimiter = new RateLimiter(300);

interface OpenAlexAuthor {
  id?: string;
}
interface OpenAlexAuthorship {
  author?: OpenAlexAuthor;
}
interface OpenAlexWork {
  authorships?: OpenAlexAuthorship[];
}
interface OpenAlexAuthorProfile {
  summary_stats?: { h_index?: number };
}

async function fetchJson<T>(url: string, contactEmail: string): Promise<T | null> {
  await openAlexLimiter.wait();
  try {
    return await withRetry(
      async () => {
        const res = await fetchWithTimeout(url, { headers: { "User-Agent": userAgent(contactEmail) } }, 10_000);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
        return (await res.json()) as T;
      },
      { retries: 1, baseDelayMs: 500 },
    );
  } catch {
    return null;
  }
}

/**
 * Fallback author signal (max h-index among the first few authors) for an arXiv id that
 * Semantic Scholar's batch endpoint didn't cover — exact match via arXiv's DOI
 * (10.48550/arxiv.<id>), not fuzzy title search, so this is reliable when it returns a value.
 * Bounded to a few author-profile lookups per paper since OpenAlex doesn't return h-index
 * inline with the work.
 */
export async function fetchOpenAlexAuthorSignal(arxivId: string, contactEmail: string): Promise<number | null> {
  const work = await fetchJson<OpenAlexWork>(`${OPENALEX_BASE}/works/doi:10.48550/arxiv.${arxivId}`, contactEmail);
  const authorIds = (work?.authorships ?? [])
    .map((a) => a.author?.id)
    .filter((id): id is string => Boolean(id))
    .slice(0, MAX_AUTHORS_CHECKED);
  if (authorIds.length === 0) return null;

  let maxHIndex = 0;
  for (const authorId of authorIds) {
    const profile = await fetchJson<OpenAlexAuthorProfile>(authorId, contactEmail);
    const h = profile?.summary_stats?.h_index;
    if (typeof h === "number") maxHIndex = Math.max(maxHIndex, h);
  }
  return maxHIndex > 0 ? maxHIndex : null;
}
