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

The coding pilot used Terminal-Bench 2.0, a four-attempt limit, and the `claude/sonnet/low` selector. Its [method and interpretation](https://github.com/hraness/algal/blob/0c458a95ee04a01f16265dd9825c202b75b929d9/docs/coding-harness-pilot-results.md) describe the small sample, policy selection, and unavailable token and subscription-cost attribution. Receipt verification checks recorded execution integrity; task grading measures task success. The selected policy remained the original policy. This pilot demonstrated no performance benefit.

The [warehouse-route study](https://github.com/hraness/algal/blob/0c458a95ee04a01f16265dd9825c202b75b929d9/docs/application-research.md) used eight synthetic cases in fixed order and `anthropic/claude-haiku-4.5`. Its proposal exceeded the fixed rationale-length limit and was rejected. The separate frozen comparison completed. These cases support no general performance conclusion.

The record-triage study used `grok-4.5` through `https://api.x.ai/v1`. Four strategies started from the same generated program that passed validation and had equal resource ceilings. Two additional corpora each exhausted eight seed-generation attempts without a passing program. Their failed attempts remain in the cost totals. Learning scores and the final evaluation of fixed programs are reported separately. ALGAL work units and model-call counts describe recorded execution; provider charges are unavailable. One completed corpus and one session per strategy do not establish a general improvement in later work.

## Files and reuse

The JSON files preserve the published result records byte for byte, including recorded failures, null usage values, source identities, and limitations. Their schemas differ because the studies answer different questions. Use Python's `json` module or another JSON reader to inspect a study; this archive does not define a combined training split.

`export-manifest.json` records source paths, hashes, and the source Git commit. Cite the study path and immutable Hugging Face commit when using these results. Each study directory stays fixed; later experiments receive new directories. The MIT license covers this archive's published summaries. Terminal-Bench tasks, raw execution stores, private traces, and provider account records are excluded.

[Project](https://algal.computer) · [Source](https://github.com/hraness/algal)
