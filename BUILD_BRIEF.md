# Research Pulse: build brief for Claude Code

## How to use this file

1. In an empty folder: `mkdir research-pulse && cd research-pulse && claude`
2. Save this file in that folder as `BUILD_BRIEF.md`.
3. Tell Claude Code: **"Read BUILD_BRIEF.md in full, then execute it stage by stage. Stop at every GATE and wait for me."**

Everything below is the brief. It is written to Claude Code ("you").

---

## 1. Mission

You are the lead engineer. Build and deploy **Research Pulse**, an AI-powered weekly research monitor that emails a brief every Monday morning and mirrors it on a web archive.

This is the final examination for MESA Cohort C4, "AI and its Applications", Section 1. The problem statement:

> Kavita is a senior consultant in a technology advisory practice. Her credibility depends on being genuinely current on AI/ML research: what is actually being published and validated, not press coverage. She monitors 8 to 10 technical domains (AI agents, retrieval-augmented generation, LLMs for code, computer vision for industrial applications, and others). Today she checks research repositories every morning: about 45 minutes on a quiet week, 2 hours when something significant drops, and she still misses things. Her running log of notable papers is perpetually incomplete. She wants a weekly research brief, organised by domain, delivered every Monday morning, short enough to read in under ten minutes, that surfaces the papers that seem significant this week and gives enough context on each to decide whether to read it or bring it to a client. Her domain list must be adjustable without touching the code.

**Exam rules (non-negotiable):**
- All AI tasks use **Gemini Flash**. Do not use the Claude API, or any other LLM, at runtime.
- Use **live external data** wherever possible, and the system must also work with data present at submission.
- Deploy on **Vercel**. Submission is a public URL, a GitHub repository link, and a component map.
- Everything must be on **free** plans or free tiers.

## 2. The diagnosis that drives every decision

Kavita does not have a search problem. arXiv is free and searchable. She has a **triage problem** (deciding what matters out of far more than she can read) and a **memory problem** (her log is manual). So:

1. **Retrieval is solved.** Plain API calls and dedupe. No AI, no scraping.
2. **Cut volume before AI sees it.** Cheap deterministic signals shrink each domain's candidates to about 12, then Gemini judges them in one call per domain.
3. **"Significant" cannot be proven in week one.** New papers have no citations. Use visible proxies (community upvotes, released code, venue acceptance noted in the paper's comment, author track record, claim type), show them on every pick, and label everything as an unreviewed preprint. **Never use the word "validated".**
4. **A padded brief is worse than none.** A domain with nothing worth her time says so. The brief is capped near 1,800 words (about 8 minutes of reading).
5. **The log is half the problem.** Every shortlisted paper is stored. A Save-for-client click replaces her hand-kept document; the log is searchable and exportable.
6. **Domains are data, not code.** A settings page backed by the database. Each domain carries its own "what counts as significant here" note that steers the AI.
7. **Judgment stays with Kavita.** The AI sorts and explains. It never writes client advice.

## 3. Operating rules for you

- **Work in stages with gates (section 12).** At each GATE, stop, report using the format in section 14, and wait for my go-ahead.
- **Verify, don't assume.** Several facts below are marked VERIFY. Test them against the live service in Stage 0 and record results in `docs/SPIKES.md`. If reality differs from this brief, say so at the gate and propose the smallest adjustment.
- **Never invent data.** Seed data must come from the live arXiv pipeline.
- **Free only.** If something would cost money or require a card, stop and ask.
- **Secrets:** never print, log, or commit secrets. Keep them in `.env.local` (gitignored) and in Vercel's environment settings. Commit only `.env.example`.
- **Every external call** has a 10 second timeout, bounded retries with exponential backoff, and a descriptive `User-Agent` including `CONTACT_EMAIL`.
- **Idempotency everywhere.** Running the same week twice must never send two emails or create two briefs.
- **Small, pure, tested functions** for parsing, scoring, selection, word budget, ISO week, and feedback tokens.
- **TypeScript strict, no `any`.** Validate all external input with `zod`.
- **Commit after every stage** with a clear message. Keep a running `docs/DECISIONS.md` (decision, reason, alternative rejected).
- **Don't build anything not in this brief.** If you see a worthwhile extra, note it in `docs/DECISIONS.md` instead.
- Destructive database operations (drop, truncate) need my explicit confirmation.

## 4. Credentials and logins protocol

At the start of Stage 0:

1. Check which of these exist **without printing values** (check names only): `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), `RESEND_API_KEY`, `DATABASE_URL`, `VERCEL_TOKEN`, `GITHUB_TOKEN`, `HF_TOKEN`. Also run `gh auth status` and `vercel whoami`.
2. For anything missing, ask me **one item at a time** with exact steps, for example:
   - Gemini: create a free key in Google AI Studio.
   - Neon: create a free project and give me the pooled connection string (or ask me to run `neonctl auth`).
   - Resend: create an API key.
   - GitHub: run `gh auth login`.
   - Vercel: run `vercel login`.
3. Also ask me for: the recipient email (`KAVITA_EMAIL`), an alert email (`ALERT_EMAIL`), `CONTACT_EMAIL` for User-Agent strings, and whether the GitHub repo should be public (default: public).
4. Generate `CRON_SECRET`, `SESSION_SECRET`, `FEEDBACK_HMAC_SECRET` yourself (random 32+ bytes) and propose an `ADMIN_PASSWORD` for me to confirm.

`.env.example` must list at least:

```
GEMINI_API_KEY=
GEMINI_MODEL=              # resolved in Stage 0; never hard-code
DATABASE_URL=
RESEND_API_KEY=
MAIL_PROVIDER=resend       # resend | smtp
MAIL_FROM=
SMTP_URL=                  # only if MAIL_PROVIDER=smtp
KAVITA_EMAIL=
ALERT_EMAIL=
CONTACT_EMAIL=
APP_URL=
CRON_SECRET=
ADMIN_PASSWORD=
SESSION_SECRET=
FEEDBACK_HMAC_SECRET=
GITHUB_TOKEN=              # optional, raises GitHub API rate limit
HF_TOKEN=                  # optional
S2_API_KEY=                # optional, Semantic Scholar
DISPLAY_TZ=Asia/Kolkata
```

## 5. Architecture

```
Vercel Cron (Mon 02:00 UTC) / "Run now" button
        |
  Orchestrator  (idempotent per ISO week; time-budgeted; resumable)
        |  for each active domain, sequentially:
        |-- Fetch    arXiv API, last 7 days, categories + keywords, dedupe
        |-- Enrich   HF Daily Papers (upvotes), GitHub (stars), Semantic Scholar (authors), venue regex
        |-- Rank     deterministic score -> top ~12
        |-- Judge    Gemini Flash, ONE call per domain, structured JSON
        |-- Select   2-3 picks above threshold, or "nothing significant"
        |
  Headline (Gemini Flash, one call)  ->  Render (HTML email + archive page)
        |
  Persist brief FIRST  ->  Send email (Resend)  ->  Alert owner on any failure
```

Stack: Next.js (App Router) + TypeScript on Vercel Hobby; Neon Postgres; `@google/genai`; `resend`; `drizzle-orm` + `@neondatabase/serverless`; `zod`; `fast-xml-parser`; `vitest`. Hand-written inline-CSS HTML for the email (no heavy email framework).

## 6. Data model (Postgres; refine if needed, record changes in DECISIONS.md)

```
domains(id uuid pk, name, description, arxiv_categories text[], include_keywords text[],
        exclude_keywords text[], significance_note text, weight_overrides jsonb,
        active bool, sort_order int, created_at, updated_at)

papers(arxiv_id pk, title, abstract, authors jsonb, categories text[], primary_category,
       comment text, published_at, updated_at, abs_url, pdf_url, code_url, first_seen_at)

runs(id uuid pk, iso_week, type enum('weekly','backtest'), trigger enum('cron','manual','backtest'),
     status enum('queued','running','continuing','complete','partial','failed'),
     window_start, window_end, started_at, finished_at, stats jsonb, error)

run_steps(id, run_id, domain_id null, step, status, started_at, finished_at, counts jsonb, error)

candidates(run_id, domain_id, arxiv_id, signals jsonb, rank_score real, rank int,
           shortlisted bool, primary key(run_id, domain_id, arxiv_id))

briefs(id uuid pk, iso_week unique, run_id, headline text, html text, word_count int,
       status enum('saved','sent','send_failed'), created_at, sent_at)

brief_items(id uuid pk, brief_id, domain_id, arxiv_id, position int, significance int,
            paper_type text, evidence_strength text, so_what text, caveat text, action text,
            ai_available bool, model text, prompt_version text)

feedback(id, brief_item_id null, arxiv_id, kind enum('useful','not_relevant','saved','missed'),
         note text, created_at, unique(brief_item_id, kind))

author_cache(author_key pk, h_index, works_count, source, fetched_at)
http_cache(key pk, body jsonb, fetched_at)   -- dev/backtest cache to spare free-tier quotas
```

## 7. Pipeline specification

**Window.** `[run_time - 7 days, run_time)` in UTC. ISO week key = ISO week of `run_time`.

**Fetch (deterministic).** `https://export.arxiv.org/api/query`. Build `search_query` as `(cat:A OR cat:B ...) AND (abs:"kw1" OR ti:"kw1" OR ...)` plus `submittedDate:[YYYYMMDDHHMM TO YYYYMMDDHHMM]`, `sortBy=submittedDate`, `sortOrder=descending`, up to 150 per domain (paginate). Minimum 3 seconds between arXiv requests (global limiter). Parse Atom with `fast-xml-parser`. Apply exclude keywords after fetch. Upsert into `papers`. One failed domain must never stop the others.

**Enrich (deterministic, each source optional).**
- Hugging Face Daily Papers upvotes. VERIFY the endpoint and its date parameter (start from `https://huggingface.co/api/daily_papers`). Map to arXiv ids.
- GitHub stars: detect `github.com/owner/repo` in abstract/comment, call `GET /repos/{owner}/{repo}` (use `GITHUB_TOKEN` if present).
- Venue hint: regex on the arXiv comment field, e.g. `accepted (at|to|by)|to appear (in|at)` or a known venue name (NeurIPS, ICML, ICLR, CVPR, ICCV, ECCV, ACL, EMNLP, NAACL, AAAI, IJCAI, KDD, SIGIR, ICSE, FSE).
- Author signal via Semantic Scholar batch endpoint. VERIFY coverage of week-old papers in Stage 0. **If coverage is below about 30%, drop the author signal from v1 and say so.**
- Never use citation counts for ranking.

**Rank.** Score 0 to 100 from percentile-ranked signals within the domain: keyword fit (title hits count double), HF upvotes, venue hint, code link, repo stars, author signal, cross-domain hits. Default weights in `src/config/ranking.ts`, overridable per domain via `weight_overrides`. **If a signal is missing for nearly all candidates in a domain (for example HF upvotes in industrial vision), redistribute its weight automatically.** Keep the top N (default 12). Store all candidates and signals.

**Judge (Gemini Flash, one call per domain).** Send the rubric (`content/significance.md`), the domain's `significance_note`, and the shortlisted papers (id, title, abstract, comment, signals). Use structured output (`responseSchema`), temperature about 0.2, and validate with zod. On invalid output, retry once with a repair instruction; on failure fall back (below). Per paper return:

```
{ arxiv_id, significance: 0-10,
  paper_type: new_benchmark | surprising_result | new_method | system_or_framework | survey | negative_result | theory | incremental | other,
  evidence_strength: strong | moderate | weak | unclear,
  so_what: string (<= 45 words), caveat: string (<= 25 words),
  action: read | skim | flag_for_client | skip }
```

**Select.** Keep `action != skip` and `significance >= 6` (configurable), at most 3 per domain, highest first. A paper in several domains appears once, under the domain where it scored highest, with an "also in" note. If a domain has no picks, print "Nothing significant this week" plus a "closest miss" line (title and why it fell short) and the counts. **Do not pad.**

**Headline (Gemini Flash, one call).** At most three short lines summarising what mattered across domains using only the chosen picks. If very few picks, say it was a quiet week and name where to look.

**Word budget.** Count rendered words. Cap near 1,800 words; if over, drop the lowest-significance picks. Show "about N min read" (words / 230).

**Render.** One data model, two outputs:
- HTML email: table-based, inline CSS, about 600px wide, readable on a phone.
- Archive page `/brief/[isoWeek]`.
Each pick shows: title (link to the arXiv abstract page), first three authors and "et al.", "why it surfaced" chips (upvotes, code, venue note), paper type, the `so_what`, the `caveat`, an action pill, and three buttons: Useful, Not relevant, Save for client. Footer on every brief: "Preprints, not peer reviewed unless noted. Summaries are AI-generated from abstracts. Scanned N, shortlisted M, shown K." Coverage line per domain. If AI summaries are unavailable for a domain, show a banner and the ranked list with a truncated abstract.

**Persist, then send.** Save the brief (status `saved`) before sending. Send through the mailer interface (Resend adapter; SMTP adapter via `nodemailer` as fallback). One retry. On success set `sent`; on failure `send_failed` and alert.

**Alerts.** If a run fails, a domain fails, a domain returns zero candidates, or the send fails, email `ALERT_EMAIL` a short summary. If only some domains fail, still send the brief with a notice naming the unavailable domains.

**Idempotency, time budget, resume.**
- `briefs.iso_week` is unique. A weekly trigger for a week that already has a `sent` brief returns `already_done` unless `force=1` (admin only).
- The orchestrator tracks elapsed time against a budget (set from the verified `maxDuration`; leave a safety margin). Each step records completion in `run_steps`. If the budget is nearly spent, set status `continuing` and continue in a fresh invocation (use the supported post-response mechanism, for example Next.js `after` or `waitUntil` from `@vercel/functions`; VERIFY in current docs). A resumed run skips completed steps.
- Cap Gemini calls per run (default 25). Rate-limit calls (default 10 per minute). Retry 429/503 with exponential backoff and jitter.

**Feedback.** Email buttons are signed links: `base64url(payload).hmac` where payload holds `{brief_item_id, kind, exp}`. `GET /api/feedback?t=...` is idempotent (upsert) and redirects to a confirmation page. In the archive page, buttons post with the admin session. A "Missed this paper" form (arXiv id or URL) stores `kind=missed`.

## 8. Web app surfaces and auth

| Route | Access | Purpose |
|---|---|---|
| `/` | public | What this is, latest brief link, how to log in |
| `/brief/[isoWeek]`, `/archive` | public, read-only | Brief pages and list of past briefs |
| `/login` | public | Shared-password login (sets signed cookie, 30 days) |
| `/settings` | admin | Domain CRUD, reorder, active toggle, per-domain significance note, "Draft with Gemini", and a "Preview this domain" action that runs fetch to rank to judge without saving or sending |
| `/log` | admin | Searchable paper log (filter by domain, action, saved, week), CSV export, and the "Missed this paper" form |
| `/runs` | admin | Run health: funnel counts per run (fetched, shortlisted, picked), useful-pick rate, failures, Gemini calls used, last backtest recall, and a **Run now** button |
| `/backtest` | admin | Replay a past week with an optional list of known important arXiv ids; no email; shows recall at candidate, shortlist and pick level |
| `/api/cron/weekly` | `Authorization: Bearer $CRON_SECRET` | Vercel Cron target |
| `/api/admin/*` | admin | Run, resume, backtest, domain draft |

`vercel.json`: cron `0 2 * * 1` (Monday 02:00 UTC, about 07:30 IST; Hobby fires anywhere in the hour). Set `maxDuration` as high as the plan allows and record the verified value.

**"Draft with Gemini"** takes a plain-English description of a domain and returns `{name, arxiv_categories, include_keywords, exclude_keywords, significance_note}`. Validate categories against a whitelist (`cs.*`, `stat.ML`, `eess.*`, `math.*` as needed). The user always edits before saving.

## 9. Content files (versioned; store `prompt_version` on every `brief_item`)

`content/significance.md` (starting point, refine at Gate 1 using real papers):

```
Score each paper 0-10 for a senior AI-strategy consultant.
Weigh, in this order:
1. Evidence quality: realistic or standard benchmarks, strong baselines, ablations,
   multiple runs, honest limitations. Claims without evidence in the abstract = "unclear".
2. Novel finding vs incremental tweak. Negative or surprising results are valuable.
3. Decision relevance: would it change which architecture to bet on, which use case
   has real backing, or which direction the field is moving?
4. Credibility signals provided: released code, accepted venue named in the comment,
   community uptake. These support, never replace, the evidence in the text.
Anchors: 9-10 rare, field-shifting benchmark or evaluation. 7-8 worth mentioning to a client.
5-6 worth a skim. 4 or below skip.
Calibration: in a typical week at most 1-2 papers per domain score 7 or more,
and many weeks have none in a domain. Do not inflate scores.
```

`content/judge.prompt.md` (system prompt):

```
You are a research analyst supporting a senior AI-strategy consultant.
You receive one domain's focus note and up to 12 recent arXiv preprints
(title, abstract, author comment, objective signals). Judge each against the rubric.
Rules:
- Use only the text provided. Do not rely on outside knowledge of the paper.
- Never say or imply results are validated, replicated, or peer reviewed, unless the
  provided comment names an accepting venue.
- Do not invent numbers. If the abstract gives no evidence, evidence_strength = "unclear".
- so_what: at most 45 words, plain language, what this changes for someone advising on AI strategy.
- caveat: at most 25 words, the main reason for caution.
- Be calibrated; do not inflate. Output JSON only, matching the schema.
```

`content/headline.prompt.md`: at most three short lines, only from the supplied picks, no new facts, honest about quiet weeks.

`content/domain-draft.prompt.md`: produce the domain config JSON from a description; categories only from the whitelist; keywords specific enough to avoid pulling the whole of cs.AI.

**Seed domains** (insert on first migrate; she can edit all of them):

| Domain | arXiv categories | Include keywords (examples) | Significance note |
|---|---|---|---|
| AI agents | cs.AI, cs.CL, cs.MA, cs.LG | agent, agentic, tool use, multi-agent, computer use, web agent | New agent benchmarks, honest reliability evaluations, evidence on what works in production. Discount toy-environment demos. |
| Retrieval-augmented generation | cs.IR, cs.CL, cs.AI | retrieval-augmented, RAG, dense retrieval, reranking, grounded generation | Realistic corpora, failure analysis, cost and latency trade-offs. Discount chunking tricks without strong baselines. |
| LLMs for code | cs.SE, cs.CL, cs.AI, cs.LG | code generation, code LLM, SWE-bench, program repair, repository-level | Real-repository evaluations, contamination awareness, productivity evidence. |
| Computer vision for industrial applications | cs.CV, eess.IV | industrial, defect detection, anomaly detection, visual inspection, manufacturing | Real production-line deployment, small-data regimes, real-defect datasets. Discount marginal gains on saturated benchmarks. |
| LLM evaluation and benchmarks | cs.CL, cs.AI, cs.LG | benchmark, evaluation, contamination, LLM-as-a-judge | New benchmarks with validation, evidence that popular metrics mislead. |
| Multimodal and vision-language models | cs.CV, cs.CL | vision-language, multimodal LLM, VLM | Capability gaps, evaluation rigor, cost-to-serve. |
| Efficient inference and small models | cs.LG, cs.CL | quantization, distillation, speculative decoding, small language model | Measured speed/cost/quality trade-offs on realistic workloads. |
| AI safety, security and governance | cs.CR, cs.CL, cs.CY, cs.AI | prompt injection, jailbreak, red teaming, safety evaluation | Reproducible attacks and defenses relevant to enterprise deployment. |

## 10. Repo layout

```
app/                    # routes and pages
src/lib/{arxiv,hf,github,scholar,scoring,select,gemini,compose,render,mailer,db,auth,runs,iso-week,feedback,limits}.ts
src/config/ranking.ts
content/                # prompts and rubric (versioned)
scripts/                # pipeline CLI, seed, backtest
tests/                  # vitest + recorded fixtures (arXiv Atom XML), Gemini mocked
docs/{SPIKES,DECISIONS,BACKTEST,AS_BUILT}.md
README.md  .env.example  vercel.json
```

## 11. Quality bar

- Tests (vitest): arXiv Atom parsing against a recorded fixture; query builder; scoring and weight redistribution; selection and dedupe across domains; word budget; ISO week; feedback token sign/verify and tamper rejection; mailer adapter selection; Gemini output validation and fallback path.
- Structured logging with run id and step on every log line.
- The email must render acceptably in a narrow viewport and not rely on web fonts.
- Accessible markup in the archive pages: real buttons and links, sufficient contrast.

## 12. Stages and gates

### Stage 0: Preflight and spikes
Scaffold the repo (Next.js, TypeScript strict, vitest), connect GitHub and Vercel, run the credentials protocol, then run these spikes and write results to `docs/SPIKES.md`:
- **S1** arXiv: fetch last 7 days for one query, confirm parsing, date filter and rate behavior.
- **S2** Hugging Face Daily Papers: confirm the endpoint, how to query by date, and coverage vs arXiv ids.
- **S3** Semantic Scholar: fraction of week-old arXiv papers found with author data, and rate limits without a key.
- **S4** Gemini: list available models for my key, choose the newest stable Flash that works on the free tier, test structured output, and measure latency, token use and observed rate limits. Set `GEMINI_MODEL`.
- **S5** Email: send a test email to `KAVITA_EMAIL` via Resend. If it can only reach the account owner, switch to the SMTP adapter and ask me for credentials.
- **S6** Vercel: confirm the max function duration and cron behavior on my plan; deploy a hello-world cron route and show the log.

**GATE 0:** report spike results, the chosen model, any deviation from this brief, and the proposed final design adjustments.

### Stage 1: One domain, end to end, on screen
`npm run pipeline -- --domain "AI agents" --dry` runs Fetch, Enrich, Rank, Judge, Select for one domain with no database and prints a readable shortlist with signals, verdicts and the funnel (fetched, after excludes, shortlisted, picked). Cache HTTP responses locally. Write the first real `content/significance.md` refinement from what you see.

**GATE 1:** show real output for 2 domains, the **true weekly paper volume** per domain, and a candid assessment of pick quality. Do I agree the picks look like what a senior consultant would care about? Adjust weights and rubric with me.

### Stage 2: Database, settings, auth
Drizzle migrations, seed domains, shared-password auth, `/settings` with CRUD, "Draft with Gemini" and "Preview this domain".

**GATE 2:** I add a new domain through the UI and preview it with real data, with no code change.

### Stage 3: Full run, brief, email, cron
Orchestrator with idempotency, time budget and resume; headline; word budget; HTML email and archive page; persist-then-send; alerts; `vercel.json` cron; `/runs` with **Run now**. Deploy to Vercel.

**GATE 3:** a live run on the deployed app emails me a real brief; show the archive page, funnel counts, word count and read time; demonstrate (a) running twice creates one brief and one email, and (b) an invalid Gemini key produces a ranked-list fallback brief plus an alert email.

### Stage 4: Feedback, log, backtest, submission polish
Signed feedback links, "Missed this paper", `/log` with CSV export, `/runs` metrics (useful-pick rate), `/backtest`, seeded real brief, README, `docs/AS_BUILT.md`. Run the backtest on the **past four weeks**, using any known important papers I provide, and write `docs/BACKTEST.md` with recall at each funnel level.

**GATE 4:** submission checklist (section 13) fully green; production deploy URL.

### Stage 5: Optional upgrades (only if I say so after Gate 4)
- Deep read: for the top 1 to 2 picks per domain, fetch arXiv's HTML version, extract the results sections, and have Flash check the claim against the evidence (fall back to the abstract when HTML is unavailable).
- GitHub Actions backstop: a scheduled workflow calling the same secured route, keyed on the ISO week so a repeat is harmless.
- OpenReview scores for ML papers under review, and OpenAlex as a fallback for author data.

## 13. Definition of done (submission checklist)

- [ ] Public Vercel URL works; GitHub repo link; README explains architecture, setup, and how a grader tests it (demo password, **Run now**, how to add a domain).
- [ ] Every AI call goes through Gemini Flash; no Claude API or other LLM in runtime code (verify with a grep and report it).
- [ ] Live data in use; a real seeded brief exists for last week.
- [ ] Brief is under about 1,800 words, shows read time, and is grouped by domain with the coverage line.
- [ ] A domain added in Settings appears in the next run with no code change.
- [ ] Idempotency, fallback, and alert behavior demonstrated.
- [ ] Backtest results documented honestly, including misses.
- [ ] No secrets in the repo or git history.
- [ ] `docs/AS_BUILT.md` lists, for each step of the component map (below), shipped / changed / dropped, so the map can be updated to "as built".

**Component map steps to account for in AS_BUILT.md:** 01 Settings with Gemini domain drafting; 02 Cron and Run-now; 03 Domains table; 04 Sources (arXiv, HF, Semantic Scholar, GitHub); 05 Fetcher; 06 Ranker; 07 Rubric and context; 08 Gemini judging; 09 Selection and word budget; 10 Gemini headline; 11 Brief render; 12 Email send; 13 Alert email; 14 Archive with feedback buttons, log and CSV; 15 Reader; 16 Paper log storage; 17 Run-health page; 18 Backtest.

## 14. How to report at each gate

Keep it short:
1. What you built (3 to 6 bullets).
2. Proof: command output, URLs, or screenshots-as-text, including the funnel numbers.
3. Deviations from this brief and why.
4. Risks or open questions.
5. What you need from me next (credentials, decisions).

## 15. Out of scope

No vector database, agent framework, chat interface, scraping, paid APIs, multi-user accounts, client-facing writing, or daily alerts. Do not label any paper "validated".
