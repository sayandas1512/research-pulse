import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Candidate, DomainConfig, JudgeVerdict } from "./types";
import { RateLimiter, sleep, withRetry } from "./limits";

const CONTENT_DIR = path.join(process.cwd(), "content");

const PAPER_TYPES = [
  "new_benchmark",
  "surprising_result",
  "new_method",
  "system_or_framework",
  "survey",
  "negative_result",
  "theory",
  "incremental",
  "other",
] as const;
const EVIDENCE_STRENGTHS = ["strong", "moderate", "weak", "unclear"] as const;
const ACTIONS = ["read", "skim", "flag_for_client", "skip"] as const;

const VerdictSchema = z.object({
  arxiv_id: z.string(),
  significance: z.number().int().min(0).max(10),
  paper_type: z.enum(PAPER_TYPES),
  evidence_strength: z.enum(EVIDENCE_STRENGTHS),
  so_what: z.string(),
  caveat: z.string(),
  action: z.enum(ACTIONS),
});
const VerdictsResponseSchema = z.object({ verdicts: z.array(VerdictSchema) });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    verdicts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          arxiv_id: { type: Type.STRING },
          significance: { type: Type.INTEGER },
          paper_type: { type: Type.STRING, enum: [...PAPER_TYPES] },
          evidence_strength: { type: Type.STRING, enum: [...EVIDENCE_STRENGTHS] },
          so_what: { type: Type.STRING },
          caveat: { type: Type.STRING },
          action: { type: Type.STRING, enum: [...ACTIONS] },
        },
        required: ["arxiv_id", "significance", "paper_type", "evidence_strength", "so_what", "caveat", "action"],
      },
    },
  },
  required: ["verdicts"],
};

export const PROMPT_VERSION = "v1";

let cachedPrompt: { judgeSystem: string; rubric: string } | null = null;
function loadPrompts() {
  if (!cachedPrompt) {
    cachedPrompt = {
      judgeSystem: readFileSync(path.join(CONTENT_DIR, "judge.prompt.md"), "utf8"),
      rubric: readFileSync(path.join(CONTENT_DIR, "significance.md"), "utf8"),
    };
  }
  return cachedPrompt;
}

export const geminiCallLimiter = new RateLimiter(6_000); // <=10 calls/minute

export interface JudgeCallCounter {
  count: number;
  max: number;
}

export function createCallCounter(max = 25): JudgeCallCounter {
  return { count: 0, max };
}

export class GeminiCallBudgetExceeded extends Error {
  constructor() {
    super("Gemini call budget exceeded for this run");
  }
}

function buildCandidatePayload(candidates: Candidate[]) {
  return candidates.map((c) => ({
    arxiv_id: c.paper.arxivId,
    title: c.paper.title,
    abstract: c.paper.abstract,
    comment: c.paper.comment,
    signals: {
      hf_upvotes: c.signals.hfUpvotes,
      venue_hint: c.signals.venueHint,
      has_code: c.signals.codeLink,
      repo_stars: c.signals.repoStars,
      author_h_index: c.signals.authorSignal,
    },
  }));
}

export interface JudgeResult {
  verdicts: JudgeVerdict[] | null;
  aiAvailable: boolean;
  error?: string;
  model: string;
  promptVersion: string;
}

export async function judgeDomain(
  domain: Pick<DomainConfig, "name" | "significanceNote">,
  candidates: Candidate[],
  counter: JudgeCallCounter,
  apiKey: string,
  model: string,
): Promise<JudgeResult> {
  if (candidates.length === 0) {
    return { verdicts: [], aiAvailable: true, model, promptVersion: PROMPT_VERSION };
  }

  const { judgeSystem, rubric } = loadPrompts();
  const ai = new GoogleGenAI({ apiKey });
  const userPrompt = JSON.stringify({
    domain: domain.name,
    significance_note: domain.significanceNote,
    rubric,
    papers: buildCandidatePayload(candidates),
  });

  async function callOnce(repairNote?: string) {
    if (counter.count >= counter.max) throw new GeminiCallBudgetExceeded();
    await geminiCallLimiter.wait();
    counter.count += 1;
    const contents = repairNote ? `${userPrompt}\n\nREPAIR INSTRUCTION: ${repairNote}` : userPrompt;
    return withRetry(
      async () => {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: judgeSystem,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            // Judging a short rubric against 12 structured summaries doesn't need the model's
            // extended "thinking" — Stage 0 measured 476 thinking tokens vs. 73 output tokens on
            // a single-paper test, which dominates latency. Disabling it cuts per-domain time
            // noticeably; see docs/DECISIONS.md for the quality spot-check before keeping this.
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        return response.text ?? "";
      },
      {
        retries: 3,
        baseDelayMs: 2_000,
        isRetryable: (e) => e instanceof Error && /429|503/.test(e.message),
      },
    );
  }

  try {
    let raw = await callOnce();
    let parsed = safeParse(raw);
    if (!parsed) {
      raw = await callOnce("Your previous response was not valid JSON matching the schema. Return JSON only.");
      parsed = safeParse(raw);
    }
    if (!parsed) {
      return {
        verdicts: null,
        aiAvailable: false,
        error: "Gemini output failed JSON validation twice",
        model,
        promptVersion: PROMPT_VERSION,
      };
    }
    const byId = new Map(parsed.verdicts.map((v) => [v.arxiv_id, v]));
    const verdicts: JudgeVerdict[] = candidates
      .map((c) => byId.get(c.paper.arxivId))
      .filter((v): v is z.infer<typeof VerdictSchema> => v !== undefined)
      .map((v) => ({
        arxivId: v.arxiv_id,
        significance: v.significance,
        paperType: v.paper_type,
        evidenceStrength: v.evidence_strength,
        soWhat: v.so_what,
        caveat: v.caveat,
        action: v.action,
      }));
    return { verdicts, aiAvailable: true, model, promptVersion: PROMPT_VERSION };
  } catch (error) {
    if (error instanceof GeminiCallBudgetExceeded) throw error;
    return {
      verdicts: null,
      aiAvailable: false,
      error: error instanceof Error ? error.message : String(error),
      model,
      promptVersion: PROMPT_VERSION,
    };
  }
}

function safeParse(raw: string): z.infer<typeof VerdictsResponseSchema> | null {
  try {
    const json = JSON.parse(raw);
    const result = VerdictsResponseSchema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export interface HeadlineResult {
  text: string | null;
  aiAvailable: boolean;
  error?: string;
}

export async function generateHeadline(
  picksSummary: string,
  apiKey: string,
  model: string,
  counter: JudgeCallCounter,
): Promise<HeadlineResult> {
  if (counter.count >= counter.max) {
    return { text: null, aiAvailable: false, error: "Gemini call budget exceeded" };
  }
  const prompt = readFileSync(path.join(CONTENT_DIR, "headline.prompt.md"), "utf8");
  const ai = new GoogleGenAI({ apiKey });
  await geminiCallLimiter.wait();
  counter.count += 1;
  try {
    const response = await withRetry(
      () =>
        ai.models.generateContent({
          model,
          contents: `${prompt}\n\nPicks:\n${picksSummary}`,
          config: { temperature: 0.3 },
        }),
      { retries: 2, baseDelayMs: 2_000, isRetryable: (e) => e instanceof Error && /429|503/.test(e.message) },
    );
    return { text: response.text ?? null, aiAvailable: true };
  } catch (error) {
    return { text: null, aiAvailable: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function sleepBetweenDomains() {
  await sleep(0);
}

const ARXIV_CATEGORY_WHITELIST_PATTERN = /^(cs\.[A-Z]{2}|stat\.ML|eess\.[A-Z]{2}|math\.[A-Z]{2})$/;

const DomainDraftSchema = z.object({
  name: z.string(),
  arxiv_categories: z.array(z.string()),
  include_keywords: z.array(z.string()),
  exclude_keywords: z.array(z.string()),
  significance_note: z.string(),
});

const DOMAIN_DRAFT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    arxiv_categories: { type: Type.ARRAY, items: { type: Type.STRING } },
    include_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    exclude_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    significance_note: { type: Type.STRING },
  },
  required: ["name", "arxiv_categories", "include_keywords", "exclude_keywords", "significance_note"],
};

export interface DomainDraft {
  name: string;
  arxivCategories: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  significanceNote: string;
  rejectedCategories: string[];
}

export interface DomainDraftResult {
  draft: DomainDraft | null;
  aiAvailable: boolean;
  error?: string;
}

export async function draftDomain(
  description: string,
  apiKey: string,
  model: string,
): Promise<DomainDraftResult> {
  const prompt = readFileSync(path.join(CONTENT_DIR, "domain-draft.prompt.md"), "utf8");
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await withRetry(
      () =>
        ai.models.generateContent({
          model,
          contents: `Whitelist of allowed arxiv_categories prefixes: cs.*, stat.ML, eess.*, math.*\n\nDescription: ${description}`,
          config: {
            systemInstruction: prompt,
            temperature: 0.4,
            responseMimeType: "application/json",
            responseSchema: DOMAIN_DRAFT_RESPONSE_SCHEMA,
          },
        }),
      { retries: 2, baseDelayMs: 1_500, isRetryable: (e) => e instanceof Error && /429|503/.test(e.message) },
    );
    const json = JSON.parse(response.text ?? "");
    const parsed = DomainDraftSchema.safeParse(json);
    if (!parsed.success) {
      return { draft: null, aiAvailable: false, error: "Draft response failed validation" };
    }
    const valid = parsed.data.arxiv_categories.filter((c) => ARXIV_CATEGORY_WHITELIST_PATTERN.test(c));
    const rejected = parsed.data.arxiv_categories.filter((c) => !ARXIV_CATEGORY_WHITELIST_PATTERN.test(c));
    return {
      draft: {
        name: parsed.data.name,
        arxivCategories: valid,
        includeKeywords: parsed.data.include_keywords,
        excludeKeywords: parsed.data.exclude_keywords,
        significanceNote: parsed.data.significance_note,
        rejectedCategories: rejected,
      },
      aiAvailable: true,
    };
  } catch (error) {
    return { draft: null, aiAvailable: false, error: error instanceof Error ? error.message : String(error) };
  }
}
