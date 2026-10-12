# As-Built Component Map

Status of each component-map step from `BUILD_BRIEF.md` section 13, as actually shipped.
Updated at the end of each stage.

| # | Component | Status | Notes |
|---|---|---|---|
| 01 | Settings with Gemini domain drafting | Shipped | `/settings`: CRUD, reorder, active toggle, "Draft with Gemini" (validated against the arXiv category whitelist), "Preview this domain" |
| 02 | Cron and Run-now | Shipped | `vercel.json` cron `0 2 * * 1` → `/api/cron/weekly` (Bearer `$CRON_SECRET`); `/runs` "Run now" button → `/api/admin/run` (same orchestrator, `trigger: manual`) |
| 03 | Domains table | Shipped | Drizzle schema, migrated to Neon, seeded with 8 domains |
| 04 | Sources (arXiv, HF, Semantic Scholar, GitHub) | Shipped | `src/lib/{arxiv,hf,scholar,github}.ts`; verified live in Stage 0 spikes |
| 05 | Fetcher | Shipped | `src/lib/arxiv.ts`: category+keyword+date-range query builder, pagination capped at 150/domain, exclude-keyword filter, global 3s rate limiter |
| 06 | Ranker | Shipped | `src/lib/scoring.ts`: percentile-ranked signals, automatic weight redistribution when a signal has <10% coverage in a domain |
| 07 | Rubric and context | Shipped | `content/significance.md`, refined after real Stage 1 output (domain-scope anchor, tie-break rule) |
| 08 | Gemini judging | Shipped | `src/lib/gemini.ts`: one structured-output call per domain, Zod-validated, one repair retry on invalid JSON, ranked-list fallback on persistent failure |
| 09 | Selection and word budget | Shipped | `src/lib/select.ts` (threshold/cap/cross-domain dedupe), `src/lib/render.ts` `applyWordBudget` (drops lowest-significance picks globally until under ~1,800 words) |
| 10 | Gemini headline | Shipped | `src/lib/gemini.ts` `generateHeadline`, one call per run, fed only the final picks |
| 11 | Brief render | Shipped | `src/lib/render.ts`: inline-CSS HTML email (~600px); `/brief/[isoWeek]` archive page reads the same `briefs`/`brief_items` rows and renders its own React markup |
| 12 | Email send | Shipped | `src/lib/mailer.ts`: Resend adapter (default) + SMTP/nodemailer fallback adapter, one retry |
| 13 | Alert email | Shipped | `src/lib/alerts.ts`, triggered on domain failure, zero-candidate domain, send failure, or run error |
| 14 | Archive with feedback buttons, log and CSV | Shipped | `/brief/[isoWeek]` and the email both carry signed (HMAC, 180-day) Useful/Not relevant/Save-for-client links to `/api/feedback`; "Missed this paper" form on the archive page; `/log` with filters; CSV export at `/api/log/export` |
| 15 | Reader | Shipped | `/` (what this is + latest brief), `/archive` (list), `/brief/[isoWeek]` (detail) — all public, read-only |
| 16 | Paper log storage | Shipped | `papers` table upserted on every fetch; `/log` browses `brief_items` joined with `papers`/`domains`/`briefs`, filterable by domain/action/week/saved-only |
| 17 | Run-health page | Shipped | `/runs`: per-run funnel totals, failed-domain errors, next scheduled cron time, Run now / Force re-run, useful-pick-rate from recorded feedback |
| 18 | Backtest | Shipped | `/backtest`: replays a past week (1-4 weeks back) through the real pipeline, no email/persistence, computes recall at fetched/shortlisted/picked levels against an optional known-important-ids list; see `docs/BACKTEST.md` |

## Stage 5 (optional upgrades, built at user's request)

| Upgrade | Status | Notes |
|---|---|---|
| Deep read / claim check | Shipped | `src/lib/deepread.ts`: for the top 1 pick per domain (brief says 1-2; scoped to 1 for time-budget safety), fetches arXiv's HTML version, asks Gemini whether the `so_what` claim is supported by the text, falls back to the abstract if no HTML exists. Verified correct in isolation; orchestrator restructured (budget check before finalize) so it reliably gets a chance to run in a real weekly run, not just in isolation |
| GitHub Actions backstop | Shipped | `.github/workflows/weekly-backstop.yml`, Monday 06:00 UTC, calls the same secured `/api/cron/weekly` route; idempotent on a normal week |
| OpenReview / OpenAlex | Shipped | OpenReview scoped to presence+venue (not scores — spiked and confirmed reviews aren't available for week-old papers), fed to the Judge as context for the shortlisted top-12 only. OpenAlex author h-index as a bounded fallback when Semantic Scholar's coverage looks degraded, not a routine second lookup |

## Post-submission UI additions (not part of the brief's 18 steps)

| Addition | Status | Notes |
|---|---|---|
| GSAP motion system | Shipped | Replaces the CSS-keyframe animations app-wide (`app/components/motion/Reveal.tsx`, `PulseRings.tsx`, `Logo.tsx`'s glow). Respects `prefers-reduced-motion` via JS in each component. |
| In-app assistant (Dify) | Shipped, live | `app/api/chat/route.ts` proxies to a Dify Chatbot app ("Research Pulse Assistant"); widget (`ChatWidget.tsx`) is gated by `DIFY_API_URL`/`DIFY_API_KEY`, set in Vercel production env. System prompt grounds it in the actual pipeline stages and app routes. Verified live, both locally and on the production deployment, with real questions returning accurate, route-specific answers (e.g. correctly pointing to `/export` and `/brief/[week]` for saved picks). No knowledge base attached — see `docs/DECISIONS.md` for the accuracy caveat this implies. |

## Known deviations from the brief (see `docs/DECISIONS.md` for full reasoning)

- `KAVITA_EMAIL`/`ALERT_EMAIL` point at the Resend account owner's address, not the originally
  named address, due to Resend's free-tier sending restriction.
- GitHub repo was private during development (user's explicit choice, overriding the brief's
  public default); switched to public before final submission so the repo link in the submission
  form resolves.
- **Shared-password admin auth removed entirely** (not weakened — removed). The brief specifies
  it; the user explicitly chose to drop it so a grader can reach `/settings` and `/runs` without
  needing a password passed out of band. `/settings` and `/runs` are public in this deployment.
- `middleware.ts` originally implemented this auth gate; both the file and the gate are gone
  (not just renamed to `proxy.ts` — see the auth-removal decision above, which supersedes the
  earlier `proxy.ts` rename entry).
