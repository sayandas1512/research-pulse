# Stage 0 Spike Results

Run date: 2026-10-11. All spikes executed against live services with `CONTACT_EMAIL`
in the `User-Agent` string, per the brief's operating rules.

## S1 — arXiv API

- Endpoint: `https://export.arxiv.org/api/query`
- Query shape confirmed: `search_query=(cat:X OR cat:Y) AND (abs:"kw" OR ti:"kw") AND submittedDate:[YYYYMMDDHHMM TO YYYYMMDDHHMM]`
- **Gotcha:** `[` and `]` in the date range must be percent-encoded (`%5B` / `%5D`) or many
  HTTP clients/shells mishandle them. Our fetcher must build the URL with `encodeURIComponent`
  per-component, not string-concat raw brackets.
- Date filtering works correctly — a 7-day window for "AI agents" (cs.AI/cs.CL/cs.MA/cs.LG +
  keyword "agent") returned **534 total results**, confirming real weekly volume is far above
  what one Gemini call can judge — the rank-to-12 cutoff is necessary, not optional.
- Atom response parses cleanly with `fast-xml-parser`.
- No rate-limit error observed on a single request; brief's 3-second global limiter between
  requests will be implemented regardless, since arXiv's own guidance asks for it.

## S2 — Hugging Face Daily Papers

- Endpoint confirmed: `https://huggingface.co/api/daily_papers`
- Optional `date=YYYY-MM-DD` query param works (returns up to 50 items per call).
- Each item: `paper.id` is the bare arXiv id (e.g. `2610.11216`) — maps directly to our
  `papers.arxiv_id`, no transformation needed.
- Upvote count lives at `paper.upvotes` (not top-level `upvotes`).
- Coverage: good overlap with arXiv ids from the same week in spot checks. Treat HF upvotes
  as optional-per-paper signal (most papers will have no HF entry at all, which is expected —
  HF Daily Papers only curates a subset).

## S3 — Semantic Scholar author signal

- Endpoint: `POST https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,authors.name,authors.hIndex,authors.paperCount,venue,year`
- Body: `{"ids": ["ARXIV:<id>", ...]}`
- **Coverage on a sample of 10 papers submitted in the last ~3 days: 10/10 found (100%)**,
  well above the brief's 30% threshold — the author signal stays in v1.
- No API key required for this batch size; `S2_API_KEY` remains optional (raises rate limits
  for larger/more frequent batches, which matters at full 8-domain × ~12-candidate volume).

## S4 — Gemini

- Key works against `https://generativelanguage.googleapis.com/v1beta/models` (HTTP 200).
- Available Flash models include several preview/lite variants plus stable non-preview
  releases up through **Gemini 3.8 Flash**. Chose `gemini-3.8-flash` as the newest stable
  (non-preview, non-lite) Flash model — set as `GEMINI_MODEL`.
- Structured output (`responseMimeType: application/json` + `responseSchema`) works exactly
  as specified: tested the Judge schema end-to-end (significance, paper_type, evidence_strength,
  so_what, caveat, action) against a real paper abstract and got valid, schema-conforming JSON.
- Token usage for one small test call: 82 prompt tokens, 73 output tokens, **476 thinking
  tokens** (model has `"thinking": true` by default) — total 631 tokens. Latency ~5s per call.
  **Decision to revisit at Gate 1:** thinking mode adds real latency/cost per domain; one call
  per domain × 8-10 domains is still well within free-tier budgets, but if judge quality doesn't
  need the extra reasoning, we can set `thinkingConfig.thinkingBudget: 0` to cut latency/cost.
- No 429/503 observed on these few calls; the brief's retry-with-backoff and 25-call-per-run /
  10-calls-per-minute caps will be implemented as designed regardless.

## S5 — Email (Resend)

- **VERIFY confirmed the anticipated failure mode:** Resend's free tier only allows sending to
  the account owner's own verified email unless a custom domain is verified on
  resend.com/domains. Sending to the originally-requested `KAVITA_EMAIL`
  (`sayan_das@pg27.mesaschool.co`) returned `403 validation_error`.
- **Decision (confirmed with user):** `KAVITA_EMAIL` and `ALERT_EMAIL` both set to
  `sayandas1512@gmail.com` (the Resend account owner's address) rather than switching to SMTP.
  Test send to that address succeeded (`HTTP 200`, message id returned). This keeps the mailer
  on Resend (simpler, no SMTP app-password needed) while staying within brief rule #4 (free only).
- `MAIL_FROM` set to `Research Pulse <onboarding@resend.dev>` (Resend's shared sending domain,
  usable without domain verification).

## S6 — Vercel

- CLI (`vercel`) already authenticated as `sayandas1512`; `vercel link` created project
  `research-pulse` under team `sayandas1512s-projects`.
- GitHub auto-connect from `vercel link` failed once (private-repo permission prompt) — not
  blocking, since `vercel deploy` from the CLI deploys directly without needing the Git
  integration. Can revisit GitHub integration later for click-to-deploy if desired.
- Deployed a hello-world cron route (`/api/cron/hello`) with `export const maxDuration = 300`
  — build succeeded, confirming **300s is accepted as a function duration on this Hobby
  account**, consistent with Vercel's current default (up from the old 60-90s ceiling).
- `vercel.json` cron (`0 2 * * 1`) registered successfully (`vercel crons ls` shows it).
  Deployed endpoint responds correctly (`GET /api/cron/hello` → `200 {"ok":true,...}`).
- **Design implication:** orchestrator time budget should target well under 300s per
  invocation (leaving safety margin for the resumable-run logic in section 7 of the brief),
  e.g. budget ~260s before triggering `continuing` status and a resumed invocation.

## Summary of deviations from the brief

1. `KAVITA_EMAIL` / `ALERT_EMAIL` changed from the originally-given address to the Resend
   account owner's Gmail address, to stay on the free Resend tier without SMTP. No code impact —
   still a single configurable env var.
2. Chosen `GEMINI_MODEL=gemini-3.8-flash` (newest stable Flash at spike time) rather than a
   hard-coded guess; this is expected to drift over time, which is why the brief treats it as a
   resolved-at-Stage-0 env var rather than a hard-coded string.
3. GitHub repo created **private** (user's explicit choice, overriding the brief's stated
   default of public). Can be made public later with `gh repo edit --visibility public`.
