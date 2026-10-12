import { loadEnvLocal } from "./env";
loadEnvLocal();

import { SEED_DOMAINS } from "../src/config/seed-domains";
import { createCallCounter } from "../src/lib/gemini";
import { weeklyWindow } from "../src/lib/iso-week";
import { runDomainPipeline } from "../src/lib/pipeline";
import type { Candidate, DomainConfig, JudgedCandidate } from "../src/lib/types";

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function printCandidate(c: Candidate, verdict: JudgedCandidate["verdict"]) {
  console.log(`\n  #${c.rank} [score ${c.rankScore.toFixed(1)}] ${c.paper.title}`);
  console.log(`      arXiv:${c.paper.arxivId}  ${c.paper.absUrl}`);
  console.log(
    `      signals: keywordFit=${c.signals.keywordFit} hfUpvotes=${c.signals.hfUpvotes ?? "-"} venueHint=${c.signals.venueHint} code=${c.signals.codeLink} repoStars=${c.signals.repoStars ?? "-"} authorHIndex=${c.signals.authorSignal ?? "-"}`,
  );
  if (verdict) {
    console.log(
      `      VERDICT: significance=${verdict.significance} type=${verdict.paperType} evidence=${verdict.evidenceStrength} action=${verdict.action}`,
    );
    console.log(`      so_what: ${verdict.soWhat}`);
    console.log(`      caveat:  ${verdict.caveat}`);
  } else {
    console.log(`      VERDICT: (none — AI unavailable for this domain)`);
  }
}

async function runDomain(domainName: string, dry: boolean) {
  const domainConfig = SEED_DOMAINS.find((d) => d.name.toLowerCase() === domainName.toLowerCase());
  if (!domainConfig) {
    console.error(`Domain not found: "${domainName}". Available: ${SEED_DOMAINS.map((d) => d.name).join(", ")}`);
    process.exit(1);
  }

  const contactEmail = requireEnv("CONTACT_EMAIL");
  const geminiApiKey = requireEnv("OPENROUTER_API_KEY");
  const geminiModel = requireEnv("GEMINI_MODEL");

  const window = weeklyWindow(new Date());
  console.log(`Domain: ${domainConfig!.name} | Window: ${window.start.toISOString()} -> ${window.end.toISOString()} | dry=${dry}`);

  const counter = createCallCounter(25);
  const result = await runDomainPipeline({ ...domainConfig!, id: "dry-run" } as DomainConfig, window, {
    contactEmail,
    geminiApiKey,
    geminiModel,
    s2ApiKey: process.env.S2_API_KEY,
    githubToken: process.env.GITHUB_TOKEN,
    judgeCallCounter: counter,
  });

  console.log(`\n=== Funnel: ${result.domain.name} ===`);
  console.log(`  fetched:        ${result.funnel.fetched}`);
  console.log(`  after excludes: ${result.funnel.afterExcludes}`);
  console.log(`  shortlisted:    ${result.funnel.shortlisted}`);
  console.log(`  picked:         ${result.funnel.picked}`);

  console.log(`\nAI available: ${result.aiAvailable}${result.error ? ` (error: ${result.error})` : ""}`);
  console.log(`Gemini calls used: ${counter.count}/${counter.max}`);

  console.log(`\n--- Shortlist (ranked) ---`);
  for (const c of result.judged) {
    printCandidate(c, c.verdict);
  }

  console.log(`\n--- Picks (significance >= 6, action != skip, top 3) ---`);
  if (result.picks.length === 0) {
    console.log("  Nothing significant this week.");
    if (result.closestMiss?.verdict) {
      console.log(
        `  Closest miss: "${result.closestMiss.paper.title}" (significance=${result.closestMiss.verdict.significance}, action=${result.closestMiss.verdict.action})`,
      );
    }
  } else {
    for (const p of result.picks) {
      console.log(`  - [${p.verdict.significance}] ${p.paper.title} (${p.verdict.action})`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const domain = args.domain;
  if (typeof domain !== "string") {
    console.error('Usage: npm run pipeline -- --domain "AI agents" --dry');
    process.exit(1);
  }
  await runDomain(domain, Boolean(args.dry));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
