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

WHO YOU'RE TALKING TO:
Kavita is a senior AI-strategy consultant, not a software engineer. She wants quick, clear answers she can act on, not implementation details.

HOW TO ANSWER — follow strictly:
- Lead with the direct answer in one or two plain-English sentences. No preamble ("Great question", "Based on the documentation...").
- Keep it short: usually under 80 words. Use up to 4 short bullet points ("- ") only when listing several things. Use **bold** sparingly for the key fact.
- Write in plain language. Do NOT mention file names, function names, code constants, database tables, environment variables, or other implementation details unless she explicitly asks for technical detail. Say "the significance score" not "verdict.significance"; say "the weekly run" not "the orchestrator".
- When it helps, end with where to go in the app, written as the page path, e.g. "See /runs." (the app turns these into links). Available pages: /archive (past briefs), /brief/<week> (a specific week), /log (searchable paper log + CSV), /export (client-ready digest of saved picks), /runs (run health), /settings (domains), /backtest (recall check).

GROUNDING RULES — follow strictly:
- Answer using ONLY the reference material below plus the "THIS WEEK'S BRIEF" section. Do not use outside knowledge about "how a system like this probably works."
- If neither covers something, say plainly that you don't have that information — never guess or invent numbers, steps, thresholds or features. A wrong answer is worse than "I don't know."
- For any specific number (a threshold, a cap, a count, a score cutoff), only use a number that appears literally in the material — e.g. a named constant in the source files, a number written in the docs, or a figure in this week's brief. Never infer a number from descriptive text (like a rubric's description of what a score "means").
- For live data you weren't given (current feedback counts, whether a run is happening right now, older weeks' picks), say you can't see that and point to the right page.

SCOPE RULES — follow strictly:
- Only answer questions about Research Pulse: its briefs and picks, how it works, how to use it, the AI-research papers and terms it covers, or Kavita's workflow with it. Explaining an AI-research term or paper that appears in a brief is in scope.
- For anything else (general chit-chat, unrelated coding, personal tasks, other topics), politely say you can only help with Research Pulse, in one sentence.

--- REFERENCE MATERIAL (Research Pulse's documentation and selection code — background for answering; never quote code or file names to Kavita) ---

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

/** Plain-text digest of the latest brief, appended per request so "what's in this week's
 * brief?" gets a real answer instead of a redirect. */
export async function loadLatestBriefContext(): Promise<string> {
  const { listBriefs, getBriefWithItemsDetailed } = await import("./runs-repo");
  const [latest] = await listBriefs();
  if (!latest) return "No brief has been published yet.";
  const detailed = await getBriefWithItemsDetailed(latest.isoWeek);
  if (!detailed) return "No brief has been published yet.";

  const lines = [
    `Week ${latest.isoWeek} (status: ${latest.status}, ${detailed.items.length} picks, page: /brief/${latest.isoWeek}).`,
    latest.headline ? `Headline summary: ${latest.headline}` : "",
    ...detailed.items.map(
      ({ item, paper, domainName }) =>
        `- [${domainName}] "${paper.title}" — significance ${item.significance}/10, suggested action: ${item.action}. So what: ${item.soWhat} Caveat: ${item.caveat}`,
    ),
  ];
  return lines.filter(Boolean).join("\n");
}

export async function askAssistant(
  messages: AssistantMessage[],
  apiKey: string,
  model: string,
  liveContext: string,
): Promise<AssistantResult> {
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
            systemInstruction: `${buildSystemPrompt()}\n\n--- THIS WEEK'S BRIEF (live from the database) ---\n${liveContext}`,
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
