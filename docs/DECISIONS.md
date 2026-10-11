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
