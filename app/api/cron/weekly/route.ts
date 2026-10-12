import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { runWeeklyOrchestrator } from "@/src/lib/orchestrator";

export const maxDuration = 300;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function triggerSelf() {
  const appUrl = process.env.APP_URL;
  const cronSecret = process.env.CRON_SECRET;
  if (!appUrl || !cronSecret) return;
  try {
    await fetch(`${appUrl}/api/cron/weekly`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
  } catch {
    // Best-effort continuation trigger; if it fails, the next scheduled cron tick
    // (or a manual Run Now) will pick the "continuing" run back up.
  }
}

async function handle(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runWeeklyOrchestrator({
      trigger: "cron",
      contactEmail: requireEnv("CONTACT_EMAIL"),
      geminiApiKey: requireEnv("OPENROUTER_API_KEY"),
      geminiModel: requireEnv("GEMINI_MODEL"),
      s2ApiKey: process.env.S2_API_KEY,
      githubToken: process.env.GITHUB_TOKEN,
      appUrl: requireEnv("APP_URL"),
    });

    if (result.needsContinuation) {
      waitUntil(triggerSelf());
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
