import { fetchWithTimeout, RateLimiter, userAgent, withRetry } from "./limits";

const OPENREVIEW_SEARCH_URL = "https://api2.openreview.net/notes/search";

export const openReviewLimiter = new RateLimiter(500);

export interface OpenReviewMatch {
  venue: string;
}

interface SearchNote {
  content?: { title?: { value?: string }; venue?: { value?: string } };
}
interface SearchResponse {
  notes?: SearchNote[];
}

/**
 * Best-effort: is this paper findable on OpenReview, and under what venue note?
 * Title search is fuzzy (OpenReview has no arXiv-id lookup), so this only accepts a match
 * whose returned title closely matches the one we searched for, to avoid false positives.
 * Reviews/scores are not fetched: a spike against a real just-submitted paper (ICLR 2027)
 * found no attached review notes yet — reviews trail submission by months, so for a 7-day-old
 * paper "under review" presence/venue is the realistic signal, not a score.
 */
export async function findOpenReviewSubmission(
  title: string,
  contactEmail: string,
): Promise<OpenReviewMatch | null> {
  await openReviewLimiter.wait();
  try {
    const result = await withRetry(
      async () => {
        const url = `${OPENREVIEW_SEARCH_URL}?${new URLSearchParams({
          term: title,
          content: "all",
          group: "all",
          source: "all",
        })}`;
        const res = await fetchWithTimeout(url, { headers: { "User-Agent": userAgent(contactEmail) } }, 10_000);
        if (!res.ok) throw new Error(`OpenReview HTTP ${res.status}`);
        return (await res.json()) as SearchResponse;
      },
      { retries: 1, baseDelayMs: 500 },
    );

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const target = normalize(title);
    const match = (result.notes ?? []).find((n) => {
      const noteTitle = n.content?.title?.value;
      return noteTitle && normalize(noteTitle) === target;
    });
    const venue = match?.content?.venue?.value;
    return venue ? { venue } : null;
  } catch {
    return null;
  }
}
