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
