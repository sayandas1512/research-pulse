import { NextResponse } from "next/server";
import { z } from "zod";
import { runWeeklyOrchestrator } from "@/src/lib/orchestrator";

export const maxDuration = 300;

const BodySchema = z.object({ force: z.boolean().optional() });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  const force = parsed.success ? parsed.data.force : undefined;

  try {
    const result = await runWeeklyOrchestrator({
      trigger: "manual",
      force,
      contactEmail: requireEnv("CONTACT_EMAIL"),
      geminiApiKey: requireEnv("GEMINI_API_KEY"),
      geminiModel: requireEnv("GEMINI_MODEL"),
      s2ApiKey: process.env.S2_API_KEY,
      githubToken: process.env.GITHUB_TOKEN,
      appUrl: requireEnv("APP_URL"),
    });

    if (result.needsContinuation) {
      const appUrl = process.env.APP_URL;
      const cronSecret = process.env.CRON_SECRET;
      if (appUrl && cronSecret) {
        fetch(`${appUrl}/api/cron/weekly`, { headers: { Authorization: `Bearer ${cronSecret}` } }).catch(() => {});
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
