import { NextResponse } from "next/server";
import { z } from "zod";
import { askAssistant, type AssistantMessage } from "@/src/lib/assistant";

const BodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1) }))
    .min(1)
    .max(40),
});

export async function POST(request: Request) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL;
  if (!geminiApiKey || !geminiModel) {
    return NextResponse.json({ error: "not_configured", message: "The assistant isn't set up yet." }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", message: "Malformed request." }, { status: 400 });
  }

  const result = await askAssistant(parsed.data.messages as AssistantMessage[], geminiApiKey, geminiModel);
  if (!result.answer) {
    console.error("Assistant call failed", result.error);
    return NextResponse.json({ error: "upstream_error", message: "The assistant couldn't answer that just now." }, { status: 502 });
  }

  return NextResponse.json({ answer: result.answer });
}
