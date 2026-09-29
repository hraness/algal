---
license: mit
language:
- en
tags:
- agents
- evaluation
- experiments
---

# ALGAL experiment results

This archive contains recorded experiment results from [ALGAL](https://algal.computer). It preserves unsuccessful experiments alongside their methods and limits so readers can inspect what was tested and what happened.

## Studies

| Study | Files | Result |
| --- | --- | --- |
| Coding-harness pilot, September 20, 2026 | `studies/coding-harness-pilot-2026-09-20/results.json` | All 12 trials failed their task grading. Eight ALGAL execution receipts verified offline. |
| Synthetic warehouse routes, September 23, 2026 | `studies/application-research-2026-09-23/results.json` | Structured facts scored six of eight exact answers; adding verified query answers scored five of eight. No revision activated. |
| Synthetic record triage, September 28, 2026 | `studies/cumulative-skill-v5-2026-09-28/results.json` | One of three seed searches produced a passing program. The three-corpus comparison remains insufficient. |
| Synthetic record triage calibration, September 28, 2026 | `studies/cumulative-skill-v6-2026-09-28/results.json` | Two of three calibration seeds passed; the preregistered gate stopped the nine-block comparison. |
| Synthetic record triage with development feedback, September 29, 2026 | `studies/cumulative-skill-v7-2026-09-29/results.json` | Two of four calibration seeds passed and every development-batch score was zero; the preregistered gate stopped the nine-block comparison. |
| Synthetic record triage with graded development feedback, September 29, 2026 | `studies/cumulative-skill-v8-2026-09-29/results.json` | Two of four calibration seeds passed, one search exhausted eight generations, and the fourth was interrupted; the graded score varied from 0.33 to 0.80 without a pass, the gate failed, and the preregistered line rule ended this seed line. |

The coding pilot used Terminal-Bench 2.0, a four-attempt limit, and the `claude/sonnet/low` selector. Its [method and interpretation](https://github.com/hraness/algal/blob/0c458a95ee04a01f16265dd9825c202b75b929d9/docs/coding-harness-pilot-results.md) describe the small sample, policy selection, and unavailable token and subscription-cost attribution. Receipt verification checks recorded execution integrity; task grading measures task success. The selected policy remained the original policy. This pilot demonstrated no performance benefit.

The [warehouse-route study](https://github.com/hraness/algal/blob/0c458a95ee04a01f16265dd9825c202b75b929d9/docs/application-research.md) used eight synthetic cases in fixed order and `anthropic/claude-haiku-4.5`. Its proposal exceeded the fixed rationale-length limit and was rejected. The separate frozen comparison completed. These cases support no general performance conclusion.

The record-triage study used `grok-4.5` through `https://api.x.ai/v1`. Four strategies started from the same generated program that passed validation and had equal resource ceilings. Two additional corpora each exhausted eight seed-generation attempts without a passing program. Their failed attempts remain in the cost totals. Learning scores and the final evaluation of fixed programs are reported separately. ALGAL work units and model-call counts describe recorded execution; provider charges are unavailable. One completed corpus and one session per strategy do not establish a general improvement in later work.

The follow-up calibration used three fresh corpora with labeled training examples and training-only feedback. Two seeds passed validation and the third exhausted eight generations, so no confirmatory arm ran. Fixed calibration tests passed 2/8 and 3/8; one recorded transport failure had uncertain external completion and missing usage. Runtime work and charged-attempt totals are reported, while provider billing remains unavailable.

The second calibration added a fourth corpus, a separate development batch whose pass indicator was the only new signal the seed writer received, and a fixed schedule of eight revision modes. Two seeds passed validation and two exhausted eight generations. All 22 scored development batches failed, so the writer's score history never varied. Both fixed seeds passed 4/8 tests. One recorded transport failure again had missing usage. The fresh draws provide no paired comparison with the previous calibration.

The third calibration replaced the development pass indicator with the graded agreement score, rounded to hundredths, and preregistered a line rule ending the development-feedback idea if its gate failed. Two seeds passed validation, one exhausted eight generations, and the fourth search was interrupted by the launching session during generation seven and, by protocol, not retried; a reconciliation record verified in place of the driver's collection. Fifteen scored development batches ranged from 0.33 to 0.80 without reaching the 0.9 threshold. Both fixed seeds showed headroom (3/8 and 1/8). Every effect recorded usage; provider billing remains unavailable. The gate failed on the three complete blocks alone, and the line ended.

## Files and reuse

The JSON files preserve the published result records byte for byte, including recorded failures, null usage values, source identities, and limitations. Their schemas differ because the studies answer different questions. Use Python's `json` module or another JSON reader to inspect a study; this archive does not define a combined training split.

`export-manifest.json` records source paths, hashes, and the source Git commit. Cite the study path and immutable Hugging Face commit when using these results. Each study directory stays fixed; later experiments receive new directories. The MIT license covers this archive's published summaries. Terminal-Bench tasks, raw execution stores, private traces, and provider account records are excluded.

[Project](https://algal.computer) · [Source](https://github.com/hraness/algal)
