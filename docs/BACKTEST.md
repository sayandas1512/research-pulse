# Backtest Results — Past 4 Weeks

Run date: 2026-10-11/12. Two runs are documented here: a 4-week mechanism check with no
known-important list, and a follow-up single-week run with a real list, both using the live
`/backtest` pipeline (fetch → enrich → rank → judge → select, no email, no persistence).

## Recall run: "1 week ago" against a real known-important list

No one supplied a personal "papers I know mattered this week" list (this is a solo build, not
an actual Kavita), so the known-important list used here is the **top 10 most-upvoted papers on
Hugging Face Daily Papers** for the same window — a defensible live proxy for "papers the
community considered significant," clearly not the same thing as a domain expert's judgment,
but a real external signal rather than a fabricated list.

Window: `2026-09-27T18:27:15Z` → `2026-10-04T18:27:15Z`

| Level | Found | Recall |
|---|---|---|
| Fetched | 1/10 | 10% |
| Shortlisted | 0/10 | 0% |
| Picked | 0/10 | 0% |

**This recall is low, and the reason is a real, diagnosed finding, not noise:**

- **3 of the 10** known-important papers were actually published *before* the 7-day window
  started (checked each one's real arXiv `<published>` date directly) — HF Daily Papers'
  "date" reflects when HF *featured* a paper, not when it was submitted to arXiv, so some
  HF-trending papers are days or weeks old by the time they trend. Not a pipeline bug; a
  genuine mismatch between "trending this week" and "submitted this week."
- **The other ~6–7** were published inside the window, in the right categories, and would
  match the domain's keywords (verified directly against arXiv's search API — e.g.
  `abs:"agent" OR ti:"agent"` does match "False Frontiers: ... Self-Evolving Search Agents"),
  but never appeared in `fetched` at all. Root cause, traced for one example (`2609.39102`,
  published Sept 30): the "AI agents" domain alone matches **509 papers** submitted *after*
  it within the same window. Our fetcher sorts by `submittedDate` descending and caps at 150
  per domain (`MAX_RESULTS_PER_DOMAIN`, matching the brief's "up to 150 per domain" spec) —
  so a paper from the middle of a high-volume week gets silently pushed out by newer papers
  before ranking or judging ever sees it. "AI agents" fetched exactly 150 (the cap) in every
  week tested in this report, which is itself evidence the domain is volume-capped most weeks,
  not just this one.

**This is a real limitation worth a decision, not a bug to quietly patch here**: a pure
recency cap trades off "catches everything recent" against "catches everything significant,"
and for a domain this high-volume (500+/week before any ranking), recency alone may be too
blunt a pre-filter. Two options worth discussing before changing it: (a) raise
`MAX_RESULTS_PER_DOMAIN` for this domain specifically via `weight_overrides`-style per-domain
config, accepting more arXiv API calls; or (b) sample across the window instead of taking the
most-recent-150, so a paper from day 2 of a 7-day window isn't structurally disadvantaged
against a paper from day 7. Not implemented here — flagging it for a decision rather than
picking one unilaterally, since it changes core fetch behavior.

## Mechanism check: past 4 weeks, no known-important list

**This run caught a real bug**, left in the numbers below deliberately rather than quietly re-run:
two domains in "2 weeks ago" show `0/0/0 (error: (text ?? "").replace is not a function)`. Cause:
`fast-xml-parser` occasionally hands back a non-string (observed: a bare number) for an arXiv
title/abstract/comment field whose text content happens to look numeric, and
`collapseWhitespace` assumed its input was always already a string. Fixed in
`src/lib/arxiv.ts` (coerce with `String(text)` before processing) and covered by a regression
test (`tests/arxiv.test.ts`, "does not crash when fast-xml-parser hands back a numeric-looking
title/summary/comment"). The error was caught cleanly — `runBacktest`'s per-domain try/catch
reported it and moved on rather than crashing the whole backtest, exactly as the brief's
"one failed domain must never stop the others" rule requires. The two zero-rows are kept as-is
here as evidence of that, rather than deleted or silently re-run after the fix.

## 1 week ago

Window: 2026-09-27T17:41:03.734Z → 2026-10-04T17:41:03.734Z

| Domain | Fetched | Shortlisted | Picked |
|---|---|---|---|
| AI agents | 150 | 12 | 3 |
| Retrieval-augmented generation | 94 | 12 | 3 |
| LLMs for code | 99 | 12 | 3 |
| Computer vision for industrial applications | 30 | 12 | 3 |
| LLM evaluation and benchmarks | 104 | 12 | 3 |
| Multimodal and vision-language models | 150 | 12 | 2 |
| Efficient inference and small models | 150 | 12 | 2 |
| AI safety, security and governance | 76 | 12 | 3 |
| **Total** | **853** | **96** | **22** |

## 2 weeks ago

Window: 2026-09-20T17:41:03.734Z → 2026-09-27T17:41:03.734Z

| Domain | Fetched | Shortlisted | Picked |
|---|---|---|---|
| AI agents | 150 | 12 | 3 |
| Retrieval-augmented generation | 78 | 12 | 2 |
| LLMs for code | 0 | 0 | 0 (error: (text ?? "").replace is not a function) |
| Computer vision for industrial applications | 18 | 12 | 2 |
| LLM evaluation and benchmarks | 0 | 0 | 0 (error: (text ?? "").replace is not a function) |
| Multimodal and vision-language models | 150 | 12 | 3 |
| Efficient inference and small models | 150 | 12 | 3 |
| AI safety, security and governance | 39 | 12 | 3 |
| **Total** | **585** | **72** | **16** |

## 3 weeks ago

Window: 2026-09-13T17:41:03.734Z → 2026-09-20T17:41:03.734Z

| Domain | Fetched | Shortlisted | Picked |
|---|---|---|---|
| AI agents | 150 | 12 | 3 |
| Retrieval-augmented generation | 81 | 12 | 2 |
| LLMs for code | 39 | 12 | 3 |
| Computer vision for industrial applications | 26 | 12 | 3 |
| LLM evaluation and benchmarks | 56 | 12 | 3 |
| Multimodal and vision-language models | 129 | 12 | 3 |
| Efficient inference and small models | 112 | 12 | 3 |
| AI safety, security and governance | 30 | 12 | 3 |
| **Total** | **623** | **96** | **23** |

## 4 weeks ago

Window: 2026-09-06T17:41:03.734Z → 2026-09-13T17:41:03.734Z

| Domain | Fetched | Shortlisted | Picked |
|---|---|---|---|
| AI agents | 150 | 12 | 3 |
| Retrieval-augmented generation | 82 | 12 | 3 |
| LLMs for code | 33 | 12 | 3 |
| Computer vision for industrial applications | 17 | 12 | 1 |
| LLM evaluation and benchmarks | 64 | 12 | 3 |
| Multimodal and vision-language models | 102 | 12 | 3 |
| Efficient inference and small models | 106 | 12 | 2 |
| AI safety, security and governance | 34 | 12 | 3 |
| **Total** | **588** | **96** | **21** |

## Notes

- Recall at the fetched/shortlisted/picked levels is computed by comparing a provided `knownImportantIds` list against each level's arXiv ids — see `src/lib/backtest.ts` `computeRecall`. With a list, this report would show `found/total` and a recall percentage at each level, plus which known-important ids were missed and at which stage (e.g., "fetched but not shortlisted" points at a ranking/weight problem; "never fetched" points at a keyword/category problem).
- Use `/backtest` (interactive) to supply a real known-important-papers list and get recall numbers immediately — this script exists to produce a committed, reproducible 4-week record for the submission.
