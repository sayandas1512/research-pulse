import { loadEnvLocal } from "./env";
loadEnvLocal();

import { DEFAULT_WEIGHTS, SHORTLIST_SIZE } from "../src/config/ranking";
import { SEED_DOMAINS } from "../src/config/seed-domains";
import { fetchArxivDomain } from "../src/lib/arxiv";
import { fetchRepoStars, parseGithubRepo } from "../src/lib/github";
import { fetchHfUpvotes } from "../src/lib/hf";
import { createCallCounter, judgeDomain } from "../src/lib/gemini";
import { weeklyWindow } from "../src/lib/iso-week";
import { computeRawSignals, rankAndShortlist, type EnrichmentData } from "../src/lib/scoring";
import { selectPicks } from "../src/lib/select";
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

async function buildEnrichment(
  domain: Omit<DomainConfig, "id">,
  papers: { arxivId: string; codeUrl: string | null }[],
  window: { start: Date; end: Date },
  contactEmail: string,
): Promise<EnrichmentData> {
  const hfUpvotes = await fetchHfUpvotes(window, contactEmail);

  const authorHIndex = new Map<string, number>();
  const { fetchAuthorSignal } = await import("../src/lib/scholar");
  const s2Result = await fetchAuthorSignal(
    papers.map((p) => p.arxivId),
    contactEmail,
    process.env.S2_API_KEY,
  );
  for (const [id, h] of s2Result) authorHIndex.set(id, h);

  const repoStars = new Map<string, number>();
  for (const paper of papers) {
    const ref = parseGithubRepo(paper.codeUrl);
    if (!ref) continue;
    const stars = await fetchRepoStars(ref, contactEmail, process.env.GITHUB_TOKEN);
    if (stars !== null) repoStars.set(paper.arxivId, stars);
  }

  return { hfUpvotes, authorHIndex, repoStars, crossDomainHits: new Map() };
}

function printFunnel(label: string, funnel: { fetched: number; afterExcludes: number; shortlisted: number; picked: number }) {
  console.log(`\n=== Funnel: ${label} ===`);
  console.log(`  fetched:       ${funnel.fetched}`);
  console.log(`  after excludes: ${funnel.afterExcludes}`);
  console.log(`  shortlisted:   ${funnel.shortlisted}`);
  console.log(`  picked:        ${funnel.picked}`);
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
  const geminiKey = requireEnv("GEMINI_API_KEY");
  const geminiModel = requireEnv("GEMINI_MODEL");

  const window = weeklyWindow(new Date());
  console.log(`Domain: ${domainConfig!.name} | Window: ${window.start.toISOString()} -> ${window.end.toISOString()} | dry=${dry}`);

  console.log("\nFetching from arXiv...");
  const { fetched, afterExcludes } = await fetchArxivDomain(domainConfig as DomainConfig, window, contactEmail);
  console.log(`  fetched=${fetched.length} afterExcludes=${afterExcludes.length}`);

  console.log("\nEnriching (HF upvotes, Semantic Scholar authors, GitHub stars)...");
  const enrichment = await buildEnrichment(domainConfig!, afterExcludes, window, contactEmail);
  console.log(
    `  hfUpvotes coverage: ${afterExcludes.filter((p) => enrichment.hfUpvotes.has(p.arxivId)).length}/${afterExcludes.length}`,
  );
  console.log(
    `  authorSignal coverage: ${afterExcludes.filter((p) => enrichment.authorHIndex.has(p.arxivId)).length}/${afterExcludes.length}`,
  );
  console.log(`  repoStars found: ${enrichment.repoStars.size}`);

  console.log("\nRanking...");
  const papersWithSignals = afterExcludes.map((paper) => ({
    paper,
    signals: computeRawSignals(paper, domainConfig!, enrichment),
  }));
  const weights = { ...DEFAULT_WEIGHTS, ...domainConfig!.weightOverrides };
  const shortlisted = rankAndShortlist(papersWithSignals, weights, SHORTLIST_SIZE);

  console.log(`\nJudging ${shortlisted.length} candidates with Gemini (${geminiModel})...`);
  const counter = createCallCounter(25);
  const judgeResult = await judgeDomain(domainConfig!, shortlisted, counter, geminiKey, geminiModel);

  const verdictById = new Map((judgeResult.verdicts ?? []).map((v) => [v.arxivId, v]));
  const judged: JudgedCandidate[] = shortlisted.map((c) => ({
    ...c,
    verdict: verdictById.get(c.paper.arxivId) ?? null,
  }));

  const { picks, closestMiss } = selectPicks(judged);

  printFunnel(domainConfig!.name, {
    fetched: fetched.length,
    afterExcludes: afterExcludes.length,
    shortlisted: shortlisted.length,
    picked: picks.length,
  });

  console.log(`\nAI available: ${judgeResult.aiAvailable}${judgeResult.error ? ` (error: ${judgeResult.error})` : ""}`);
  console.log(`Gemini calls used: ${counter.count}/${counter.max}`);

  console.log(`\n--- Shortlist (ranked) ---`);
  for (const c of judged) {
    printCandidate(c, c.verdict);
  }

  console.log(`\n--- Picks (significance >= 6, action != skip, top 3) ---`);
  if (picks.length === 0) {
    console.log("  Nothing significant this week.");
    if (closestMiss?.verdict) {
      console.log(
        `  Closest miss: "${closestMiss.paper.title}" (significance=${closestMiss.verdict.significance}, action=${closestMiss.verdict.action})`,
      );
    }
  } else {
    for (const p of picks) {
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
