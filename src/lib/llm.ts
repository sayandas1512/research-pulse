/**
 * Single gateway for every model call in Research Pulse. All requests go through OpenRouter
 * (OpenAI-compatible chat completions), use Google models only, and are pinned to Google's own
 * infrastructure (Vertex / AI Studio) with no fallback to other providers.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const GOOGLE_ONLY_PROVIDER = { only: ["google-vertex", "google-ai-studio"], allow_fallbacks: false } as const;

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  apiKey: string;
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  /** Standard JSON Schema; when set, the model must return JSON matching it. */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  /** Skip the model's internal "thinking" — for short, structured tasks where it only adds latency. */
  disableReasoning?: boolean;
}

/** Error carrying the HTTP status, so callers' retry checks (/429|503/) keep working. */
export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export async function chatCompletion(req: LlmRequest): Promise<string> {
  if (!req.model.startsWith("google/")) {
    throw new LlmError(`Only Google models are allowed; got "${req.model}"`);
  }

  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    provider: req.jsonSchema ? { ...GOOGLE_ONLY_PROVIDER, require_parameters: true } : GOOGLE_ONLY_PROVIDER,
  };
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.disableReasoning) body.reasoning = { effort: "minimal" };
  if (req.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: req.jsonSchema.name, strict: true, schema: req.jsonSchema.schema },
    };
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${req.apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Research Pulse",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string | null } }[];
    error?: { message?: string; code?: number };
  } | null;

  if (!res.ok || json?.error) {
    const status = json?.error?.code ?? res.status;
    throw new LlmError(`OpenRouter ${status}: ${json?.error?.message ?? res.statusText}`, status);
  }

  return json?.choices?.[0]?.message?.content ?? "";
}
