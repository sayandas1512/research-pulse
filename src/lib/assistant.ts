import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";
import path from "node:path";
import { withRetry } from "./limits";

const ROOT = process.cwd();

let cachedSystemPrompt: string | null = null;

/** Kavita-facing docs only — not BUILD_BRIEF.md (written as build instructions, not as
 * documentation of what exists) and not AGENTS.md (dev-tool instructions, irrelevant to her).
 * Each path is a static literal (not a loop variable) so Next's file tracer can scope the
 * deployed function to exactly these files instead of bundling the whole project. */
function loadDocCorpus(): string {
  const files: Array<[string, string]> = [
    ["docs/AS_BUILT.md", readFileSync(path.join(ROOT, "docs/AS_BUILT.md"), "utf8")],
    ["docs/DECISIONS.md", readFileSync(path.join(ROOT, "docs/DECISIONS.md"), "utf8")],
    ["docs/BACKTEST.md", readFileSync(path.join(ROOT, "docs/BACKTEST.md"), "utf8")],
    ["README.md", readFileSync(path.join(ROOT, "README.md"), "utf8")],
    ["content/significance.md", readFileSync(path.join(ROOT, "content/significance.md"), "utf8")],
    ["content/judge.prompt.md", readFileSync(path.join(ROOT, "content/judge.prompt.md"), "utf8")],
    ["content/headline.prompt.md", readFileSync(path.join(ROOT, "content/headline.prompt.md"), "utf8")],
    ["content/domain-draft.prompt.md", readFileSync(path.join(ROOT, "content/domain-draft.prompt.md"), "utf8")],
    ["src/lib/select.ts", readFileSync(path.join(ROOT, "src/lib/select.ts"), "utf8")],
    ["src/lib/scoring.ts", readFileSync(path.join(ROOT, "src/lib/scoring.ts"), "utf8")],
  ];
  return files.map(([rel, text]) => `--- ${rel} ---\n${text}`).join("\n\n");
}

function buildSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt;

  const corpus = loadDocCorpus();

  cachedSystemPrompt = `You are the in-app assistant for Research Pulse, a weekly AI-research brief built for Kavita, a senior AI-strategy consultant. You're embedded directly in the app she uses.

GROUNDING RULES — follow strictly:
- Answer using ONLY the reference material below, which is this project's actual documentation, prompts, and decisions log. Do not use outside knowledge about "how a system like this probably works."
- If the reference material doesn't cover something, say plainly that it isn't documented — do not guess, estimate, or invent specific numbers, stage names, thresholds, or implementation details that aren't in the material below. A wrong specific answer is worse than an honest "I don't have that documented."
- When the reference material DOES have the answer, state it directly and concretely (exact numbers, file names, route paths, thresholds) in your own words — do not just tell her to "check the docs" when you already know the answer from them.
- For any specific number you state (a threshold, a cap, a word count, a score cutoff), only use a number that appears literally in the reference material — e.g. a named constant in the source files below, or a number written directly in the docs. Never infer a specific number from descriptive/qualitative text (like a rubric's prose description of what a score "means") — if you're not looking at the literal number, say what you can confirm qualitatively instead of stating a number you're inferring.
- For questions that depend on live, current-moment data you don't have access to — this week's actual picked papers, current feedback counts, whether the latest run succeeded — say you don't have live access and point her to the right page instead of guessing: /archive (past briefs), /brief/[week] (a specific week), /log (searchable paper log + CSV), /export (client-ready digest of saved picks), /runs (pipeline health, funnel, next cron), /settings (domains), /backtest (recall testing).

SCOPE RULES — follow strictly:
- Only answer questions about Research Pulse itself: its pipeline, architecture, features, how to use it, the AI-research papers/terminology it covers, or Kavita's workflow with it.
- For anything unrelated to Research Pulse or AI research — general chit-chat, unrelated coding help, personal tasks, topics with no connection to this app — politely decline and say this assistant is scoped to Research Pulse. Do not attempt to answer out-of-scope questions "to be helpful."

TONE:
- Keep answers concise and direct. Kavita is busy and technical — no filler, no over-explaining things a senior consultant already knows.

--- REFERENCE MATERIAL (Research Pulse's actual documentation — your only source of truth) ---

${corpus}`;

  return cachedSystemPrompt;
}

export interface AssistantMessage {
  role: "user" | "assistant";
  text: string;
}

export interface AssistantResult {
  answer: string | null;
  error?: string;
}

const MAX_HISTORY_TURNS = 12;

export async function askAssistant(messages: AssistantMessage[], apiKey: string, model: string): Promise<AssistantResult> {
  const ai = new GoogleGenAI({ apiKey });
  const recent = messages.slice(-MAX_HISTORY_TURNS);
  const contents = recent.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  try {
    const response = await withRetry(
      () =>
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: buildSystemPrompt(),
            temperature: 0.2,
          },
        }),
      { retries: 2, baseDelayMs: 1_500, isRetryable: (e) => e instanceof Error && /429|503/.test(e.message) },
    );
    return { answer: response.text ?? null };
  } catch (error) {
    return { answer: null, error: error instanceof Error ? error.message : String(error) };
  }
}
