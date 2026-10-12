import { z } from "zod";
import { fetchWithTimeout, RateLimiter, userAgent, withRetry } from "./limits";
import { geminiCallLimiter, type JudgeCallCounter } from "./gemini";
import { chatCompletion } from "./llm";

const MAX_FULL_TEXT_CHARS = 18_000;

export const arxivHtmlLimiter = new RateLimiter(3_000); // same courtesy spacing as the Atom API

/**
 * Fetches arXiv's HTML rendering of a paper and strips it to plain text, truncated to a
 * budget that leaves room for the prompt and response. Returns null if the HTML version
 * doesn't exist (not every paper has one) or the fetch fails — callers fall back to the
 * abstract in that case, per the brief.
 */
export async function fetchPaperFullText(arxivId: string, contactEmail: string): Promise<string | null> {
  await arxivHtmlLimiter.wait();
  try {
    return await withRetry(
      async () => {
        const res = await fetchWithTimeout(
          `https://arxiv.org/html/${arxivId}`,
          { headers: { "User-Agent": userAgent(contactEmail) } },
          10_000,
        );
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`arXiv HTML HTTP ${res.status}`);
        const html = await res.text();
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&[a-z]+;/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
        return text.slice(0, MAX_FULL_TEXT_CHARS);
      },
      { retries: 1, baseDelayMs: 1_000 },
    );
  } catch {
    return null;
  }
}

const ClaimCheckSchema = z.object({
  supported: z.enum(["yes", "partial", "no", "unclear"]),
  note: z.string(),
});

export interface ClaimCheckResult {
  supported: "yes" | "partial" | "no" | "unclear";
  note: string;
  usedFullText: boolean;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    supported: { type: "string", enum: ["yes", "partial", "no", "unclear"] },
    note: { type: "string" },
  },
  required: ["supported", "note"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You check whether a one-sentence claim about an AI research paper is actually
supported by the paper's own text. You will be given either the paper's full text or, if that
wasn't available, just its abstract — the response tells you which.
Rules:
- Base your answer only on the provided text, not outside knowledge of the paper or topic.
- "yes": the text gives concrete evidence (numbers, named baselines, described experiments)
  directly supporting the claim.
- "partial": the text is relevant but doesn't fully substantiate the specific claim as stated.
- "no": the text contradicts the claim or the claim overstates what the text shows.
- "unclear": the provided text doesn't contain enough information to judge (common when only
  the abstract was available).
- note: at most 30 words, the specific textual reason for your answer.
Output JSON only, matching the schema.`;

/** For the top 1-2 picks per domain only (brief's own scope) — one extra Gemini call each. */
export async function verifyClaim(
  paperTitle: string,
  abstract: string,
  claim: string,
  fullText: string | null,
  apiKey: string,
  model: string,
  counter: JudgeCallCounter,
): Promise<ClaimCheckResult | null> {
  if (counter.count >= counter.max) return null;
  await geminiCallLimiter.wait();
  counter.count += 1;

  const usedFullText = fullText !== null;
  const contents = JSON.stringify({
    title: paperTitle,
    text_source: usedFullText ? "full_text" : "abstract_only",
    text: fullText ?? abstract,
    claim,
  });

  try {
    const text = await withRetry(
      () =>
        chatCompletion({
          apiKey,
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: contents },
          ],
          temperature: 0.1,
          jsonSchema: { name: "claim_check", schema: RESPONSE_SCHEMA },
          disableReasoning: true,
        }),
      { retries: 2, baseDelayMs: 1_500, isRetryable: (e) => e instanceof Error && /429|503/.test(e.message) },
    );
    const parsed = ClaimCheckSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return null;
    return { ...parsed.data, usedFullText };
  } catch {
    return null;
  }
}
