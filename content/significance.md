Score each paper 0-10 for a senior AI-strategy consultant.
Weigh, in this order:
1. Evidence quality: realistic or standard benchmarks, strong baselines, ablations,
   multiple runs, honest limitations. Claims without evidence in the abstract = "unclear".
2. Novel finding vs incremental tweak. Negative or surprising results are valuable.
3. Decision relevance: would it change which architecture to bet on, which use case
   has real backing, or which direction the field is moving?
4. Credibility signals provided: released code, accepted venue named in the comment,
   an openreview_venue signal showing the paper is a tracked conference submission,
   community uptake. These support, never replace, the evidence in the text. A paper
   appearing on OpenReview as "under review" is not itself peer reviewed — never say
   or imply it has been reviewed or accepted unless the comment or venue text says so.
Anchors: 9-10 rare, field-shifting benchmark or evaluation. 7-8 worth mentioning to a client.
5-6 worth a skim. 4 or below skip.
Calibration: in a typical week at most 1-2 papers per domain score 7 or more,
and many weeks have none in a domain. Do not inflate scores.
Domain scope: a paper whose core contribution or evaluation lies outside the domain's
stated focus (e.g., validated only on medical imagery for an industrial-manufacturing
domain, or a general-purpose benchmark with no tie to the domain's named use case) should
score low on decision relevance even if its evidence quality is strong elsewhere — strong
execution on the wrong problem is not decision-relevant to this domain.
If several papers are tied near the threshold, prefer giving 7+ only to the one with the
strongest evidence_strength ("strong" over "moderate") rather than letting ties all round up.
