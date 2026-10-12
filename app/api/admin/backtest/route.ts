import { NextResponse } from "next/server";
import { z } from "zod";
import { runBacktest } from "@/src/lib/backtest";
import { weeklyWindow } from "@/src/lib/iso-week";

export const maxDuration = 300;

const BodySchema = z.object({
  weeksAgo: z.number().int().min(1).max(12).default(1),
  knownImportantIds: z.array(z.string()).default([]),
  domainIds: z.array(z.string()).optional(),
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const now = new Date();
  const anchor = new Date(now.getTime() - parsed.data.weeksAgo * 7 * 86_400_000);
  const window = weeklyWindow(anchor);

  try {
    const result = await runBacktest(window.start, window.end, parsed.data.knownImportantIds, {
      contactEmail: requireEnv("CONTACT_EMAIL"),
      geminiApiKey: requireEnv("OPENROUTER_API_KEY"),
      geminiModel: requireEnv("GEMINI_MODEL"),
      s2ApiKey: process.env.S2_API_KEY,
      githubToken: process.env.GITHUB_TOKEN,
      domainIds: parsed.data.domainIds,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
