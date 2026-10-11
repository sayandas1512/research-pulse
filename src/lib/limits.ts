export class RateLimiter {
  private lastCallAt = 0;

  constructor(private readonly minIntervalMs: number) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallAt;
    if (elapsed < this.minIntervalMs) {
      await sleep(this.minIntervalMs - elapsed);
    }
    this.lastCallAt = Date.now();
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, baseDelayMs = 500, isRetryable }: RetryOptions = {},
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = isRetryable ? isRetryable(error) : true;
      if (!retryable || attempt === retries) break;
      const jitter = Math.random() * baseDelayMs;
      await sleep(baseDelayMs * 2 ** attempt + jitter);
      attempt += 1;
    }
  }
  throw lastError;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function userAgent(contactEmail: string): string {
  return `ResearchPulse/0.1 (mailto:${contactEmail})`;
}
