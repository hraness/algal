# ALGAL coding-harness pilot

ALGAL's useful hypothesis is that an agent's operating procedure should be inspectable, bounded data: something another agent can propose changing, test, compare, and retain with evidence. A coding harness makes that hypothesis concrete. Its context selection, testing habits, and recovery rules can change while the underlying model and tools stay fixed.

A DSL in an existing language can implement this. The experiment asks what ALGAL's execution and evidence model buys us before claiming that a new language or VM is necessary. This implementation uses the existing TypeScript reference runtime and required no core runtime changes.

## Result

[Draft PR #32 — Add a coding-harness policy-search pilot](https://github.com/hraness/algal/pull/32) implements and exercises matched conventional and ALGAL loops, independent Harbor grading, one model-generated policy proposal, and selection frozen before holdout.

| Arm | Development | Holdout |
|---|---:|---:|
| Conventional fixed loop | 0/2 | 0/2 |
| ALGAL fixed loop | 0/2 | 0/2 |
| ALGAL proposed policy | 0/2 | Not promoted |
| ALGAL frozen selection | Original policy retained | 0/2 |

The proposed policy retained the first message plus recent context, capped at four messages; testing and recovery instructions stayed unchanged. It tied the parent on development success and validity. The predeclared policy-digest tie-break retained the original policy. The selected and fixed ALGAL holdout arms therefore execute the same policy independently; differences between them would be run variability, not an evolution benefit.

The matrix completed **12 trials, 0 invalid or uncertain**. **8/8 ALGAL execution receipts verified offline.** These checks establish recorded execution integrity, not task correctness. No performance benefit or equivalence between engines is established by this tiny sample.

## What the development traces showed

- All three polyglot trials used their four-call budget. Interpreter discovery consumed much of it; one run reached useful compiler errors only on its last call.
- All six development runs edited before inspecting, despite an instruction to inspect first. Prompted procedures were not enforced transitions.
- Regex runs stopped without a successful behavioral check. One declared that it lacked tool access after executing three valid JSON terminal actions: an interface misunderstanding, not a transport failure.
- The candidate's context truncation could retain a tool result while dropping its command. Full-context runs also failed, so truncation is not established as the cause.

This points to a concrete next experiment: clarify that returning terminal JSON requests execution, expose remaining attempts, and retain complete action/result pairs. Compare those changes separately under the same development budget before increasing the call limit. Establish a competent baseline before interpreting policy-search differences.

## Protocol and scope

Harbor **0.23.0**; Terminal-Bench **2.0** at `69671fbaac6d67a7ef0dfec016cc38a64ef7a77c`; implementation `0bc12d8707da663472b0468e83b3f75899b77c07`. This is an older compatibility pilot, not a current leaderboard submission.

| Split | Tasks |
|---|---|
| Development | `polyglot-c-py`, `regex-log` |
| Holdout | `cancel-async-tasks`, `build-cython-ext` |

Each episode allowed four model attempts. Trials ran serially in fresh containers with pinned images, matching prompts/tools/limits, and no automatic retries. Hidden verifiers ran after the agent stopped. The proposer received development outcomes only. Holdout outcomes did not influence selection or implementation.

The model selector was `claude/sonnet/low` through the existing qualified XCB backend. ALGAL owned individual model calls and terminal effects. Immutable upstream model weights and token/subscription-cost attribution were unavailable. Linux amd64 images ran through QEMU on this ARM64 Mac. Ordinary persistent background jobs are unsupported by this bounded terminal adapter.

Policies currently vary context retention and test/recovery instructions. This is bounded policy search, not arbitrary-program evolution. Host callbacks remain opaque, and there is no cross-task persistent-memory treatment or equal-budget conventional policy search.

## Validation and accounting

- Local repository gate: **647 tests passed, one platform skip**; type checking, lint, executable documentation, and site build passed.
- Installed Harbor/Python adapter and runner suite: **36 tests passed**.
- Implementation commit `0bc12d8` passed every PR check, including Linux/macOS native tests, Python integration, CodeQL, and preview build.
- **47 inference calls** total: 41 matrix calls, one proposal call, and five calls across the retained smoke trials.
- **$0 incremental paid API spend against the $20 cap.** The adapter uses the existing subscription and has no paid API fallback. Subscription-attributable cost and token counts remain unknown.

The first smoke was retained as invalid: its Python capture wrapper could not start in the pinned Ubuntu image, before the model command executed or grading ran. The replacement uses distro-core Perl. A second smoke completed four model calls and three terminal commands, verified its receipt, and received a valid score of 0. Final helper qualification also tested noisy output, timeouts, and refusing clean completion when background-process settlement could not be confirmed.

Holdout startup paused at a disk guard before any holdout call. Only this task's unused, immutable development images were removed from its Docker VM: `alexgshaw/polyglot-c-py:20251031` and `alexgshaw/regex-log:20251031` (pinned compressed-layer sizes 148,540,671 and 29,723,240 bytes). Guest free space reached 2,554,748,928 bytes after cleanup and 1,371,172,864 bytes after the holdout images were pulled. The frozen selection and all experiment evidence were preserved.

## Implication for ALGAL

The promising claim is that procedures, experience, and evidence can become objects the application can inspect and revise. Merely putting code and memory in JSON does not establish that property. A useful next step is a narrow executable inspect/test/repair graph using existing ALGAL primitives, followed by equal-budget policy search in both representations. Then test the same frozen policy with and without provenance-bearing memory, including a memory-schema migration.

The pilot establishes a working experiment and identifies weaknesses in the harness. It supplies no evidence yet that a new VM is necessary or that evolving policies improve coding performance. The improvement ledger in the PR records those distinctions and the small integration fixes already made.

Machine-readable counts, policy identities, and receipt-verification summaries: [pilot evidence](coding-harness-pilot-evidence.json).
