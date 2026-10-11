import { fetchWithTimeout, RateLimiter, userAgent, withRetry } from "./limits";

export const githubLimiter = new RateLimiter(200);

export interface GithubRepoRef {
  owner: string;
  repo: string;
}

export function parseGithubRepo(url: string | null): GithubRepoRef | null {
  if (!url) return null;
  const match = /github\.com\/([\w-]+)\/([\w.-]+)/i.exec(url);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

/** Returns null if the repo is private, missing, or the lookup fails — not a signal, not zero. */
export async function fetchRepoStars(
  ref: GithubRepoRef,
  contactEmail: string,
  githubToken?: string,
): Promise<number | null> {
  await githubLimiter.wait();
  try {
    return await withRetry(
      async () => {
        const headers: Record<string, string> = {
          "User-Agent": userAgent(contactEmail),
          Accept: "application/vnd.github+json",
        };
        if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
        const res = await fetchWithTimeout(
          `https://api.github.com/repos/${ref.owner}/${ref.repo}`,
          { headers },
          10_000,
        );
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
        const data = (await res.json()) as { stargazers_count?: number };
        return data.stargazers_count ?? null;
      },
      { retries: 2, baseDelayMs: 500, isRetryable: (e) => !(e instanceof Error && e.message.includes("404")) },
    );
  } catch {
    return null;
  }
}
