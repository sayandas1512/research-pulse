import { loadEnvLocal } from "./env";
loadEnvLocal();

import { writeFileSync } from "node:fs";
import path from "node:path";
import { runBacktest } from "../src/lib/backtest";
import { weeklyWindow } from "../src/lib/iso-week";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function main() {
  const options = {
    contactEmail: requireEnv("CONTACT_EMAIL"),
    geminiApiKey: requireEnv("GEMINI_API_KEY"),
    geminiModel: requireEnv("GEMINI_MODEL"),
    s2ApiKey: process.env.S2_API_KEY,
    githubToken: process.env.GITHUB_TOKEN,
  };

  const now = new Date();
  const sections: string[] = [];
  sections.push(
    "# Backtest Results — Past 4 Weeks\n\n" +
      `Run date: ${now.toISOString().slice(0, 10)}. No known-important-papers list was provided ` +
      "for this run (the brief's backtest feature accepts one; none was supplied for this report), " +
      "so recall is reported as \"not computed\" at each level — this report instead verifies the " +
      "backtest mechanism itself: that replaying a past week through the real pipeline (fetch → " +
      "enrich → rank → judge → select, no email, no persistence) produces sensible funnel numbers " +
      "for each of the last 4 weeks, across all 8 active domains.\n",
  );

  for (let weeksAgo = 1; weeksAgo <= 4; weeksAgo++) {
    const anchor = new Date(now.getTime() - weeksAgo * 7 * 86_400_000);
    const window = weeklyWindow(anchor);
    console.error(`Running backtest for ${weeksAgo} week(s) ago (${window.start.toISOString()} -> ${window.end.toISOString()})...`);

    const result = await runBacktest(window.start, window.end, [], options);

    sections.push(`## ${weeksAgo} week${weeksAgo > 1 ? "s" : ""} ago\n`);
    sections.push(`Window: ${result.windowStart} → ${result.windowEnd}\n`);
    sections.push("| Domain | Fetched | Shortlisted | Picked |");
    sections.push("|---|---|---|---|");
    for (const d of result.domains) {
      sections.push(`| ${d.domain.name} | ${d.fetched} | ${d.shortlisted} | ${d.picked}${d.error ? ` (error: ${d.error})` : ""} |`);
    }
    const totals = result.domains.reduce(
      (acc, d) => ({ fetched: acc.fetched + d.fetched, shortlisted: acc.shortlisted + d.shortlisted, picked: acc.picked + d.picked }),
      { fetched: 0, shortlisted: 0, picked: 0 },
    );
    sections.push(`| **Total** | **${totals.fetched}** | **${totals.shortlisted}** | **${totals.picked}** |\n`);
  }

  sections.push(
    "## Notes\n\n" +
      "- Recall at the fetched/shortlisted/picked levels is computed by comparing a provided " +
      "`knownImportantIds` list against each level's arXiv ids — see `src/lib/backtest.ts` " +
      "`computeRecall`. With a list, this report would show `found/total` and a recall percentage " +
      "at each level, plus which known-important ids were missed and at which stage (e.g., \"fetched " +
      "but not shortlisted\" points at a ranking/weight problem; \"never fetched\" points at a " +
      "keyword/category problem).\n" +
      "- Use `/backtest` (interactive) to supply a real known-important-papers list and get recall " +
      "numbers immediately — this script exists to produce a committed, reproducible 4-week record " +
      "for the submission.\n",
  );

  const outPath = path.join(process.cwd(), "docs", "BACKTEST.md");
  writeFileSync(outPath, sections.join("\n"));
  console.error(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
