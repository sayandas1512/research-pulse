# Backtest Results — Past 4 Weeks

Run date: 2026-10-11. No known-important-papers list was provided for this run (the brief's backtest feature accepts one; none was supplied for this report), so recall is reported as "not computed" at each level — this report instead verifies the backtest mechanism itself: that replaying a past week through the real pipeline (fetch → enrich → rank → judge → select, no email, no persistence) produces sensible funnel numbers for each of the last 4 weeks, across all 8 active domains.

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
