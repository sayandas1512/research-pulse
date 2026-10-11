import { fetchWithTimeout, RateLimiter, userAgent, withRetry } from "./limits";

const S2_BATCH_URL = "https://api.semanticscholar.org/graph/v1/paper/batch";
const BATCH_SIZE = 100;

export const scholarLimiter = new RateLimiter(1_100);

interface S2Author {
  name: string;
  hIndex?: number;
  paperCount?: number;
}

interface S2PaperResult {
  authors?: S2Author[];
}

/** Returns arXiv id -> max author h-index among that paper's authors. Missing id = no signal. */
export async function fetchAuthorSignal(
  arxivIds: string[],
  contactEmail: string,
  s2ApiKey?: string,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  for (let i = 0; i < arxivIds.length; i += BATCH_SIZE) {
    const batch = arxivIds.slice(i, i + BATCH_SIZE);
    await scholarLimiter.wait();
    try {
      const data = await withRetry(
        async () => {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "User-Agent": userAgent(contactEmail),
          };
          if (s2ApiKey) headers["x-api-key"] = s2ApiKey;
          const res = await fetchWithTimeout(
            `${S2_BATCH_URL}?fields=authors.hIndex`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ ids: batch.map((id) => `ARXIV:${id}`) }),
            },
            10_000,
          );
          if (!res.ok) throw new Error(`Semantic Scholar HTTP ${res.status}`);
          return (await res.json()) as (S2PaperResult | null)[];
        },
        { retries: 2, baseDelayMs: 1_000 },
      );
      data.forEach((paper, idx) => {
        const arxivId = batch[idx];
        const maxHIndex = (paper?.authors ?? []).reduce(
          (max, a) => Math.max(max, a.hIndex ?? 0),
          0,
        );
        if (paper && maxHIndex > 0) result.set(arxivId, maxHIndex);
      });
    } catch {
      // Author signal is optional enrichment; one failed batch must not fail the domain.
      continue;
    }
  }
  return result;
}
