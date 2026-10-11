import { fetchWithTimeout, RateLimiter, userAgent, withRetry } from "./limits";

const HF_DAILY_PAPERS_URL = "https://huggingface.co/api/daily_papers";

export const hfLimiter = new RateLimiter(500);

interface HfDailyPaperItem {
  paper: { id: string; upvotes?: number };
}

function dateRangeDays(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/**
 * Returns a map of arXiv id -> HF upvote count for papers curated on Daily Papers
 * within the window. Most papers in the window will have no entry (HF only
 * curates a subset) — callers should treat a missing id as "no signal", not zero.
 */
export async function fetchHfUpvotes(
  window: { start: Date; end: Date },
  contactEmail: string,
): Promise<Map<string, number>> {
  const upvotes = new Map<string, number>();
  const days = dateRangeDays(window.start, window.end);

  for (const day of days) {
    await hfLimiter.wait();
    try {
      const items = await withRetry(
        async () => {
          const url = `${HF_DAILY_PAPERS_URL}?date=${day}`;
          const res = await fetchWithTimeout(url, { headers: { "User-Agent": userAgent(contactEmail) } }, 10_000);
          if (!res.ok) throw new Error(`HF HTTP ${res.status}`);
          return (await res.json()) as HfDailyPaperItem[];
        },
        { retries: 2, baseDelayMs: 500 },
      );
      for (const item of items) {
        if (item.paper?.id && typeof item.paper.upvotes === "number") {
          upvotes.set(item.paper.id, Math.max(upvotes.get(item.paper.id) ?? 0, item.paper.upvotes));
        }
      }
    } catch {
      // HF is an optional enrichment source; one failed day must not fail the domain.
      continue;
    }
  }
  return upvotes;
}
