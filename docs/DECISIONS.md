# Decisions Log

Format: decision, reason, alternative rejected.

## 2026-10-11 — Project location

Moved the project to `~/Desktop/research-pulse` instead of the session's ephemeral scratch
workspace. Reason: scratch workspaces are deleted when the session ends; a multi-stage,
multi-day build needs a durable location. Rejected: continuing in scratch workspace (would
lose all work on session end).

## 2026-10-11 — Separate Neon project

Created a new Neon project (`research-pulse`) rather than reusing an existing project
(`aangan-voice`, `Hiring System`) already in the user's account. Reason: isolation —
this project's schema/data shouldn't mix with unrelated prior work, and the brief calls for
a dedicated free-tier Postgres instance. Rejected: sharing an existing Neon project.

## 2026-10-11 — GitHub repo visibility: private

Brief's stated default is public; user explicitly chose private. Rejected: public (brief
default) — overridden per explicit user instruction.

## 2026-10-11 — KAVITA_EMAIL / ALERT_EMAIL use the Resend account owner's address

Resend free tier rejects sends to any address other than the account owner's verified email
unless a custom domain is verified (see `docs/SPIKES.md` S5). Verifying a domain requires DNS
control the user doesn't have handy for `pg27.mesaschool.co`. User chose to point
`KAVITA_EMAIL`/`ALERT_EMAIL` at `sayandas1512@gmail.com` instead. Rejected: switching to SMTP
adapter (brief's suggested fallback) — would need new credentials (Gmail app-password or
similar) for no added benefit, since Resend works fine once sending to the owner's address.

## 2026-10-11 — Admin password set to a weak value by explicit user request

Brief asks for a proposed admin password to be confirmed by the user. User chose `12345`
over the generated random password. Flagged as weak but accepted: the admin pages
(`/settings`, `/log`, `/runs`, `/backtest`) are low-stakes (no financial data, no PII beyond
paper metadata) and the whole app runs on a free-tier demo deployment for an exam submission.

## 2026-10-11 — GEMINI_MODEL = gemini-3.8-flash

Chosen as the newest stable (non-preview, non-lite) Flash model available to the provided key
at spike time (see `docs/SPIKES.md` S4). Rejected: `gemini-2.5-flash` (older, available but not
newest) and any `-preview` suffixed Flash model (not stable).

## 2026-10-11 — Rank-then-cap arXiv fetch at exactly MAX_RESULTS_PER_DOMAIN

Initial pagination loop could overshoot the 150-per-domain cap by one full page (observed
200 fetched for "AI agents" instead of 150) because the loop's `while` condition was only
checked between pages, not after accumulating results. Fixed by slicing the accumulated
array to the cap after the fetch loop, rather than trying to get the loop's exit condition
exactly right mid-page. Rejected: tightening the loop condition to stop mid-page — more
fragile against future pagination changes than a single post-fetch slice.

## 2026-10-11 — @google/genai SDK over raw REST for the Judge/Headline calls

Brief's stack section names `@google/genai`; used `GoogleGenAI.models.generateContent` with
`responseSchema`/`responseMimeType` for structured output, matching what Stage 0's spike (S4)
already verified works via raw REST. Rejected: keeping the raw `fetch`-based calls used in the
spike — the SDK gives typed request/response shapes or free, and the brief explicitly asks
for it in the stack.

## 2026-10-11 — content/significance.md refined after first real pipeline run (Stage 1, Gate 1 prep)

Running the full pipeline on two domains ("AI agents", "Computer vision for industrial
applications") surfaced two real patterns: (1) the CV-industrial domain's broad categories/
keywords (`anomaly detection`, `defect detection`) pull in off-topic papers (medical imaging,
satellite earth-observation, wildlife camera traps) that score well on generic evidence
quality but aren't relevant to industrial manufacturing — the model already discounted most
of these via `action: skip`, but the rubric didn't explicitly say to penalize domain drift,
so it was easy for an off-topic paper with strong execution to slip through on "evidence
quality" alone; (2) three "AI agents" picks tied at exactly significance=7, bumping against
the "at most 1-2 papers per domain score 7+" calibration guidance. Added two rubric lines:
an explicit "domain scope" anchor (strong execution on the wrong problem isn't decision-
relevant) and a tie-break preference for `evidence_strength: strong` over `moderate` when
multiple papers cluster near the threshold. Did not touch per-domain keywords/excludes yet —
that's a Gate 1 conversation with the user (e.g., whether to add `exclude_keywords` like
"medical", "satellite", "wildlife" to the CV-industrial domain), not something to decide
unilaterally in the rubric.

## 2026-10-11 — Tightened two seed domains' keywords/excludes after Gate 1 review

Discussed with the user at Gate 1: "LLM evaluation and benchmarks" used bare `benchmark`/
`evaluation` as include keywords, pulling 1,246 papers/week (vs. 13-539 for every other
domain) because those words appear in abstracts across all of cs.AI regardless of topic.
Replaced with multi-word phrases specific to *meta*-evaluation (`"new benchmark"`,
`"benchmark reveals"`, `"evaluation protocol"`, `"LLM-as-a-judge"`, `"contamination"`,
`"benchmark contamination"`) — volume dropped to 65/week, in line with other domains.
Also added `exclude_keywords: ["medical", "clinical", "satellite", "wildlife", "biopharma"]`
to "Computer vision for industrial applications" after observing it pull in off-topic papers
(medical imaging, satellite earth-observation, wildlife camera traps) that matched the
category/keyword filter but not the domain's actual intent — after-excludes count dropped
from 13 to 8 for that domain in a live re-run. Rejected: leaving the exclude list empty and
relying solely on the Judge's domain-scope rubric rule — the rule helps (correctly `skip`s
most off-topic papers) but exclude keywords are cheaper (filter before spending a Gemini
call's attention) and the brief's data model already has `exclude_keywords` for exactly
this purpose.

## 2026-10-11 — Cron schedule stays literally 0 2 * * 1 (Monday); testability via Run Now, not a schedule change

User asked whether the Monday-morning cron requirement should be relaxed since a grader
might review the submission on any day. Decided: no code/schedule change — `vercel.json`'s
`0 2 * * 1` stays as the real production cron (a concrete, checkable requirement). The
orchestrator itself is already day-agnostic: its window is `[run_time - 7 days, run_time)`
and idempotency keys off the ISO week, not "was this triggered on a Monday" — so a manual
trigger on any day of the week produces a correct brief for that week. The brief's own
`/runs` page already specs a "Run now" button for exactly this. Action items for later
stages: (1) `/runs` (Stage 3) should visibly show the next scheduled cron time and whether
the last run was triggered by `cron` or `manual`, so a grader can see at a glance that the
Monday schedule is real and wired up, even if they test via Run Now; (2) README (Stage 4)
should explain this explicitly — "the cron fires Monday 02:00 UTC in production; to test
on demand without waiting for Monday, use Run Now on /runs." Rejected: changing the cron
to run more frequently "to make grading easier" — would misrepresent the actual production
schedule the brief asks for.

## 2026-10-11 — Auth via Web Crypto (not node:crypto) so the same code works in middleware

`src/lib/auth.ts` uses `crypto.subtle` (Web Crypto, available in both the Node and Edge
runtimes) instead of `node:crypto`'s `createHmac`/`timingSafeEqual` for the session-token
HMAC. Reason: `middleware.ts`/`proxy.ts` (Next's request-interception layer) needs to verify
the session cookie, and `node:crypto` doesn't reliably work in the Edge runtime some Next.js
deployments use for this file. Rejected: `node:crypto` + forcing a Node.js runtime for the
proxy file — more fragile against future Next.js runtime defaults than just using a function
that's valid in both.

## 2026-10-11 — Renamed middleware.ts to proxy.ts

`next build` warned that the `middleware.ts` file convention is deprecated in this Next.js
version in favor of `proxy.ts` (same behavior, same `export async function proxy(request)`
signature instead of `middleware(request)`). Renamed immediately rather than leaving a
deprecation warning in a fresh Stage 2 build.

## 2026-10-11 — Gate 2 verification: created a domain via "Draft with Gemini" and previewed it live, then deleted it

To verify the Gate 2 requirement ("add a domain through the UI and preview it with real data,
no code change") actually works rather than just reading as correct, logged into `/settings`,
used "Draft with Gemini" with the description "on-device and edge deployment of LLMs," saved
the resulting domain config (Gemini produced genuinely specific keywords and excludes, e.g.
excluding "datacenter"/"GPU cluster" so edge papers aren't drowned out by cloud-inference
papers), and ran "Preview this domain" — got a real funnel (fetched 20 → shortlisted 12 →
picked 0, with a sensible closest-miss) with no code or seed-file change. Deleted the test
domain afterward via direct SQL so the database matches the documented 8 seed domains;
the capability itself (not this specific domain) is the Stage 2 deliverable.

## 2026-10-11 — Orchestrator design: finalize-from-persisted-state, not in-memory across invocations

A resumable run can take multiple separate invocations (time-budget driven). The naive design
(carry judged candidates in memory, finalize at the end of the same invocation that processes
the last domain) breaks across invocations — each invocation only has the in-memory results of
the domains *it* processed, not earlier ones. Fixed by persisting each candidate's verdict as a
jsonb column (`candidates.verdict`) alongside its signals, and having `finalizeRun` always
reconstruct every domain's judged candidates by reading `candidates` joined with `papers` from
the database, regardless of which invocation produced them. This also made alert-worthiness
(failed/zero-candidate/AI-unavailable domains) correct for free once fixed to match (see next
entry) — it's computed from the full persisted run state rather than one invocation's local
arrays. Rejected: keeping results in memory and relying on a single invocation completing the
whole run — doesn't survive the realistic case (8 domains x arXiv rate limits x Gemini calls
regularly exceeds a 260s budget, confirmed live).

## 2026-10-11 — Found and fixed via live testing: brief upsert and invocation-scoped alerting

Running the real orchestrator against live services (not just unit tests) surfaced two bugs
that no amount of reading the code would have caught:
1. `createBrief` did a plain `insert`, which violates `briefs.iso_week`'s unique constraint on
   any `force` re-run of a week that already has a brief (crashed with a 500 mid-finalization).
   Fixed with `onConflictDoUpdate` on `iso_week`, deleting and re-inserting `brief_items` (no
   stable identity to diff against) rather than trying to merge old and new items.
2. `hadIssues` (the decision to send a "run completed with issues" alert) was computed from
   arrays local to the current invocation's for-loop. A forced re-run that resumed a run whose
   domains were all already recorded (from an earlier, failed invocation) skipped the loop
   entirely, so `failedDomains`/`zeroCandidateDomains` stayed empty even though every domain had
   `aiAvailable: false` -- a real "Gemini key is broken, brief has zero picks" run that should
   alert the owner silently didn't. Fixed by recomputing `failedDomains` and
   `zeroCandidateDomains` from the full persisted `run_steps` for the run inside `finalizeRun`,
   and adding `unavailableDomains.length > 0` to the alert condition. Both bugs are logged here
   as the concrete reason this project treats "run it for real against live services" as part
   of Stage 3's definition of done, not just unit tests passing.

## 2026-10-11 — Deployed to Vercel production, verified live

Production URL: https://research-pulse-navy.vercel.app. Fixed `APP_URL` in Vercel's production
env (was still `http://localhost:3000` from local dev) to the real deployment URL, since it's
used both for the orchestrator's self-continuation trigger and the "View in browser" email
link. Verified live: `/`, `/archive`, `/brief/2026-W41` all return 200; `/runs` correctly
redirects unauthenticated requests to `/login` (307); `/api/cron/weekly` with the real
`CRON_SECRET` correctly returns `already_done` for the already-sent week (confirms Postgres
connectivity, env vars, and idempotency all work on the real deployment, without spending a
real Gemini/send cycle to prove it). Vercel cron `0 2 * * 1 -> /api/cron/weekly` confirmed
registered via `vercel crons ls`.

## 2026-10-11 — Removed shared-password admin auth entirely (deliberate deviation from the brief)

The brief (section 8) specifies shared-password login gating `/settings`, `/log`, `/runs`,
`/backtest`. Removed it entirely at the user's explicit request: the user was concerned a
grader wouldn't have the password and would be unable to reach `/settings`/`/runs` to verify
the "add a domain with no code change" and "Run now" requirements — both central to how this
submission is graded. I proposed the brief-compliant middle ground first (keep auth, put the
actual demo password in the README, which is literally what the brief's own grading checklist
asks for — "how a grader tests it: demo password, Run now, how to add a domain"), but the user
reaffirmed they want auth removed entirely after hearing that option. Deleted `src/lib/auth.ts`,
`middleware.ts`/`proxy.ts`'s gating, `/login` page, `/api/login` route; removed `ADMIN_PASSWORD`
and `SESSION_SECRET` from `.env.example`, `.env.local`, and Vercel's env (all three
environments). `FEEDBACK_HMAC_SECRET` and `CRON_SECRET` are unaffected (unrelated to admin
login — feedback links and the cron endpoint have their own independent auth). All admin pages
(`/settings`, `/runs`) are now public. Logged explicitly here and in the README so this reads
as a documented, deliberate choice during grading, not a missed requirement.

## 2026-10-11 — Feedback links: pre-generate brief_item ids so the email HTML can embed them

The email HTML is rendered and saved to `briefs.html` *before* `brief_items` rows exist (brief
rows are created in the same `createBrief` call that first produces their ids). But feedback
links need to reference a `brief_item_id` that's stable and already valid by the time someone
reads the email. Fixed by generating each pick's `itemId` with `crypto.randomUUID()` in the
orchestrator before rendering, threading it through `render.ts` (new `RenderPick` type extends
`SelectedPick`), and inserting `brief_items` with that same explicit id afterward (Drizzle allows
overriding a `defaultRandom()` column by passing an explicit value). Also made
`dedupeAcrossDomains` generic (`<T extends SelectedPick>`) so it preserves `itemId` through the
cross-domain dedupe step instead of narrowing back to plain `SelectedPick`. Found and fixed a
related latent bug while making this change: `applyWordBudget`'s returned (possibly-trimmed)
`data` was previously discarded — `brief_items` were built from the original, un-trimmed
`sections`, so a pick dropped for word-budget reasons could still end up in the DB (and get a
feedback link) even though it wasn't in the email that was actually sent. Now uses
`trimmedData.sections` for the `items` array.

## 2026-10-11 — Feedback links are the same signed-link pattern everywhere, not admin-session POSTs

The brief describes the archive page's feedback buttons as posting "with the admin session." That
assumed admin auth existing; it's since been removed (see above). Rather than building a separate
authenticated-POST code path for the archive page, both the email and `/brief/[isoWeek]` use the
identical signed-GET-link pattern: the archive page just signs fresh tokens at render time (its
`brief_item_id`s already exist in the DB by then, unlike the email). One mechanism, one code path,
works identically whether the click comes from an email client or a browser tab.

## 2026-10-11 — Backtest: no DB persistence, and the 4-week report has no known-important list

`runBacktest` calls the same `runDomainPipeline` function the live orchestrator uses, but doesn't
write to `runs`/`run_steps`/`candidates` — it's a pure replay-and-measure operation with no side
effects, matching the brief's "no email" instruction extended to "no persistence" as well, since
persisting a backtest run that's never going to be sent would just clutter `/runs` with entries
that look like real weekly runs but aren't. Rejected: reusing the full orchestrator's persistence
path with `type: 'backtest'` — the schema has that enum value ready if this needs to change later,
but it adds bookkeeping (run_steps, candidates rows) for no benefit when the only output anyone
reads is the recall numbers. The committed `docs/BACKTEST.md` (from `scripts/backtest-report.ts`)
has no known-important-papers list, because none was provided by the user — it verifies the
backtest *mechanism* (real funnel numbers across all 8 domains for each of the last 4 weeks) and
documents how to get real recall numbers via `/backtest`'s UI once a list is available, rather
than fabricating a list to make the report look more complete than it is.

## 2026-10-11 — Found and fixed via the 4-week backtest run: arXiv parser crash on numeric-looking text

Running `scripts/backtest-report.ts` for real (not just unit tests) against 4 actual past weeks
surfaced a crash in `src/lib/arxiv.ts`'s `collapseWhitespace`: `fast-xml-parser` occasionally
returns a non-string (a bare JS number) for a title/abstract/comment field whose text content
happens to look numeric, and the function assumed its input was always a string, calling
`.replace` on it directly. Two domains in the "2 weeks ago" backtest window hit this and failed
cleanly (caught by `runBacktest`'s per-domain try/catch, reported as a domain error, didn't crash
the run) — exactly the "one failed domain must never stop the others" behavior the brief asks
for, which is reassuring, but the underlying bug still needed fixing. Fixed by coercing with
`String(text)` before processing and widening the function's parameter type to `unknown` so this
class of bug can't silently type-check again. Added a regression test. Kept the two zero-value
rows in the committed `docs/BACKTEST.md` as evidence rather than quietly re-running the (very
slow, ~40 minute) full 4-week report after the fix — see `docs/BACKTEST.md`'s own note.

## 2026-10-11 — Disabled Gemini "thinking" for the Judge call to cut preview/run latency

User asked why `/settings`' Preview button and the backtest report were slow, and whether
latency could be reduced. Per the Stage 0 spike note flagged for Gate 1 revisit (`docs/SPIKES.md`
S4: 476 thinking tokens vs. 73 output tokens on a single test call), set
`thinkingConfig: { thinkingBudget: 0 }` on the Judge call in `src/lib/gemini.ts` — judging a
short rubric against 12 structured paper summaries doesn't need extended reasoning, and this call
runs once per domain (8x per full run), making it the actual per-domain bottleneck alongside the
arXiv fetch. Left the Headline and Domain-draft calls untouched: both run once per full run (not
per domain), so they're not the latency driver, and the Headline's cross-domain synthesis may
benefit from a bit of reasoning. Also added a live elapsed-seconds counter to the Preview,
Run Now, and Backtest buttons (`/settings`, `/runs`, `/backtest`) so a grader watching "Running..."
knows it's actually working, not stuck — these are the three actions that call the real pipeline
synchronously and can take tens of seconds to several minutes.

## 2026-10-12 — Real backtest recall run surfaced a genuine volume-cap tradeoff in high-volume domains

Ran `/backtest` for "1 week ago" against a real known-important list (top 10 most-upvoted
papers on Hugging Face Daily Papers for that week, used as a live proxy since no personal
"papers I know mattered" list was available — see docs/BACKTEST.md). Recall was low
(1/10 fetched, 0/10 shortlisted/picked). Diagnosed rather than dismissed: 3 of 10 were
published before the window even started (HF's "date" is a feature date, not a submission
date — not a pipeline issue). The other ~6-7 were in-window, in-category, and keyword-matching
(verified directly against arXiv's own search API) but never appeared in `fetched` at all.
Traced one example: "AI agents" alone matches 509 papers submitted *after* a Sept-30 paper
within the same 7-day window, and our fetcher sorts by `submittedDate` descending capped at
150 (`MAX_RESULTS_PER_DOMAIN`) — so a mid-week paper in a 500+/week domain gets silently
pushed out by newer papers before ranking or judging ever sees it. "AI agents" fetched exactly
150 (the cap) in all 4 weeks checked in this report, confirming it's volume-capped most weeks,
not just this one. Not fixed unilaterally: raising the cap or switching from pure-recency to a
window-sampling strategy both change core fetch behavior and cost (more arXiv calls), so this
is flagged as a decision for the user rather than picked silently.

## 2026-10-12 — Stage 5 optional upgrades: GitHub Actions backstop, OpenAlex fallback, OpenReview context, deep-read claim check

All three Stage 5 items from the brief, spiked against live services first:

- **GitHub Actions backstop** (`.github/workflows/weekly-backstop.yml`): fires Monday 06:00 UTC
  (4h after Vercel's own cron), calls the same `/api/cron/weekly` endpoint with the same
  `CRON_SECRET`. Idempotent on a normal week (returns `already_done`); only does real work if
  Vercel's cron somehow didn't fire. `APP_URL`/`CRON_SECRET` set as GitHub repo secrets.
- **OpenAlex author fallback** (`src/lib/openalex.ts`): exact match via arXiv's DOI
  (`10.48550/arxiv.<id>`), not fuzzy title search — spiked and confirmed reliable. Scoped as a
  genuine fallback, not a routine second lookup: only activates when Semantic Scholar's coverage
  for a domain is below 30% (S2 had 100% coverage in every spike run, so this should rarely
  trigger in practice), and even then caps at 15 extra papers, since each one costs a
  paper-lookup plus up to 3 author-profile lookups (OpenAlex doesn't return h-index inline).
- **OpenReview context signal** (`src/lib/openreview.ts`): scoped down from the brief's "scores"
  description to presence + venue only. Spiked against a real just-submitted ICLR 2027 paper and
  found no attached reviews yet — reviews trail submission by months, so a 7-day-old paper
  realistically never has a score, only a venue. Verified live: 8/12 shortlisted papers in one
  domain matched a real OpenReview venue. Scoped to the already-shortlisted top-12 only (not all
  fetched papers, which would be hundreds of lookups/domain) and fed to the Judge as context, not
  as a deterministic ranking weight — title search is exact-match-only to avoid false positives.
  Added a rubric line (`content/significance.md`) so the Judge never conflates "under review" with
  "peer reviewed."
- **Deep read** (`src/lib/deepread.ts`): for the single highest-significance pick per domain
  (brief says 1-2; scoped to 1 for time-budget safety), fetches arXiv's HTML rendering, strips to
  plain text (~18K chars), and asks Gemini (thinking disabled) whether the pick's `so_what` claim
  is actually supported by the paper's own text — falls back to the abstract if no HTML version
  exists. Verified correct in isolation (real paper, real claim, correct "yes" verdict citing the
  actual supporting text) before wiring into the orchestrator.

**Found via live full-run testing, not just isolated testing**: deep-read almost never got a
chance to run in the first integration test, because `finalizeRun` (headline, render, persist,
send, deep-read) was running in whatever invocation happened to finish the last domain — which,
given the orchestrator's already-tight 260s budget for 8 domains, usually had little headroom
left. Fixed structurally: before calling `finalizeRun`, check remaining budget; if under 110s,
return `continuing` (same mechanism as the per-domain check) so finalize gets its own fresh
invocation and deep-read's 90s requirement is almost always satisfiable. This is the same
"verify for real, not just in isolation" pattern that caught the arXiv parser crash and the
brief-upsert bug earlier in this build.

## 2026-10-12 — GSAP for entrance/attention motion; Dify-backed in-app assistant (post-submission UI additions)

Two UI additions made after the core 18-step pipeline was built and submission-tested, at the
user's explicit request:

- **GSAP replaces the CSS-keyframe animation system.** `app/components/motion/Reveal.tsx` (a
  client wrapper doing `gsap.from(el, {opacity, y})` on mount, `as`-polymorphic so it can render
  `<li>`/`<span>`/`<main>` without extra wrapper nodes) replaces the old `animate-fade-in-up` /
  `animate-fade-in` keyframe classes everywhere they were used: `PageShell`, `Badge`, the
  archive/runs/brief list staggers, the feedback toast, and the home page's two cards.
  `app/components/motion/PulseRings.tsx` and the Logo's glow (`app/components/Logo.tsx`) use
  GSAP's `repeat: -1` loops instead of CSS `animation: ... infinite`. Rejected animating
  `box-shadow` directly for the logo glow (GSAP can interpolate it as a complex string, but it's
  fragile against future edits) in favor of a separate scale/opacity glow layer — same visual
  effect, a strictly safer GSAP primitive. Every animation still checks
  `prefers-reduced-motion` via `matchMedia` in JS (the CSS media-query block this replaced is
  gone; the "a reduce-motion user gets a fully static page" guarantee now lives in each
  component instead of in `globals.css`).
- **In-app assistant via Dify** (`app/api/chat/route.ts`, `app/components/ChatWidget.tsx`,
  gated by `app/components/ChatWidgetGate.tsx`): a floating chat widget, GSAP-animated open/close,
  that proxies to a Dify chat app's `/chat-messages` endpoint. The Dify API key stays server-side
  only (never sent to the client), same pattern as `FEEDBACK_HMAC_SECRET`. The widget renders
  nothing at all when `DIFY_API_URL`/`DIFY_API_KEY` are unset — verified by temporarily setting a
  placeholder key: the proxy correctly reached Dify, got a real `401 unauthorized`, logged it
  server-side, and the widget surfaced a clean "couldn't answer that just now" instead of
  crashing. As of this entry, no real Dify app has been created yet for Research Pulse — the
  user plans to create one and paste the real URL/key later. Scoped deliberately narrow: this is
  a bare proxy, not a RAG pipeline over the brief/feedback data — grounding the assistant in
  Research Pulse's own data would mean configuring a knowledge base on Dify's side, which is
  outside this codebase's control and wasn't requested.

## 2026-10-12 — Dify app created and wired up live; observed hallucination risk without a knowledge base

Created the Dify Chatbot app ("Research Pulse Assistant") via the browser, with a system
prompt describing the real pipeline stages and app routes (`/archive`, `/brief/[week]`, `/log`,
`/export`, `/runs`, `/settings`, `/backtest`). Published it, generated an API key, and set
`DIFY_API_URL`/`DIFY_API_KEY` in Vercel's production env. Verified live on both local dev and
production: real questions return accurate, route-specific answers.

**Caveat found during testing, not fixed**: asked "how does the pipeline decide what goes in
the brief," the model (gpt-5, Dify's default) gave a detailed, confident answer that invented
specifics never in the system prompt or anywhere in this codebase — a "pre-rank" stage distinct
from the Ranker, 0-5 multi-dimension scores, a "wildcard slot" for uncertain picks. None of that
is real; `src/lib/scoring.ts`/`select.ts` do something simpler (percentile ranking, a single
0-10 significance score, threshold + cap). The model is filling gaps with plausible-sounding
fabrication because nothing grounds it in the actual implementation — the system prompt
describes the pipeline at a high level but doesn't include the scoring/selection internals, and
no Dify knowledge base is attached. Not fixed in this session: the fix is either (a) a stricter
system-prompt instruction to only state what's explicitly provided and say "I'm not sure of the
exact internals" otherwise, or (b) attaching a Dify knowledge base built from this repo's
`docs/AS_BUILT.md`/`docs/DECISIONS.md` so answers are grounded in the real build instead of the
model's prior. Flagging this now rather than letting the assistant's confident tone imply
authority it doesn't have — Kavita should know pipeline-internals answers from it aren't
verified against the actual code.

## 2026-10-12 — Dropped Dify; assistant now runs on the project's own Gemini key

Attempted option (b) above: built a Dify knowledge base from the repo docs via Dify's dataset
API. Embedding the documents exhausted the Sandbox workspace's shared 200-credit AI pool, which
also covers chat calls, so the live assistant itself started failing (graceful 502, but
non-functional). Rather than depend on a third-party free tier for a core feature, replaced it
with `src/lib/assistant.ts`: the same Gemini key the pipeline already uses, with the docs,
prompts and the actual selection code (`select.ts`, `scoring.ts`) injected as full context. At
roughly a thousand lines, full context is simpler than retrieval and can't miss the relevant
chunk. Re-asking the earlier question: the fabricated "pre-rank stage" was gone, but the model
said papers need "≥7" (inferred from the rubric prose) when `DEFAULT_SIGNIFICANCE_THRESHOLD` is
6 — fixed by adding the source files and a "only state numbers that appear literally" rule.
Re-verified live: it now answers 6. `DIFY_*` env vars removed locally and in Vercel; the unused
Dify app/dataset were left in the Dify account.

## 2026-10-12 — Editorial redesign, right-hand nav, simpler assistant answers

Kavita feedback (via the user): the UI looked generic, the GSAP work wasn't noticeable, nav
should sit in a column on the right, and assistant replies read as too technical. User approved
the specific GSAP features and the "research journal" direction before build. Notes:
- Assistant prompt now targets a non-engineer: direct answer first, ~80 words, bullets only for
  lists, no file/function/constant names unless asked. The widget renders bullets, bold, and
  in-app paths (e.g. `/runs`) as links, and offers starter questions.
- The assistant now also receives the latest brief's picks from the database per request, so
  "what's in this week's brief?" gets a real answer instead of a redirect. If the DB is
  unreachable it still answers from the docs.
- Home "Picked for you" uses the brief's actual item count (after dedupe and word budget), not
  the run's per-domain pick sum, so it matches what Kavita reads (23 vs 24 this week).
- The "How it works" demo showed 0–100 relevance scores; changed to the real 0–10 significance
  scale with the real cutoff of 6.
- Two GSAP gotchas fixed: the feedback toast is portaled to `<body>` because a transformed
  ancestor card turns `position: fixed` into card-relative; the nav indicator measures with
  bounding rects because the Magnetic wrapper's transform becomes the link's `offsetParent`.

## 2026-10-12 — Type and styling refresh (expressive serif)

Asked to make the fonts and styling more creative, using community sources for ideas. Reddit
was unreachable from the tools, so ideas came from Typewolf-based trend data, Awwwards
typography winners and 2026 type round-ups. The consistent signals were expressive variable
serifs, warmer neo-grotesques for body text, mono for data, and warmth over flat neutrals. The
user chose the "expressive serif" direction from three options, plus two extras (headline
ticker, hand-drawn highlights), and declined grain texture and drop caps. Fraunces' WONK axis is
only enabled on italics, so headlines stay calm and the quirk shows up as emphasis. The ticker
and scribbles are fully rendered on the server and only animated by GSAP, so they still work
without JS and under reduced motion (the ticker then simply stays still).
