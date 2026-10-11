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
