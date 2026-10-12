import { NextResponse } from "next/server";
import { z } from "zod";
import { draftDomain } from "@/src/lib/gemini";

const BodySchema = z.object({ description: z.string().min(1) });

export async function POST(request: Request) {
  const geminiApiKey = process.env.OPENROUTER_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL;
  if (!geminiApiKey || !geminiModel) {
    return NextResponse.json({ error: "Server misconfigured: missing Gemini env vars" }, { status: 500 });
  }

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await draftDomain(parsed.data.description, geminiApiKey, geminiModel);
  if (!result.draft) {
    return NextResponse.json({ error: result.error ?? "Draft generation failed" }, { status: 502 });
  }
  return NextResponse.json({ draft: result.draft });
}
