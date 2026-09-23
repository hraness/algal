# Verification and assurance evidence

This directory tracks explicit correctness obligations for Algal. A valid ledger is an inventory, not a proof that the implementation satisfies it. The current work and acceptance criteria are in [the execution plan](../docs/formal-verification-plan.md); the original findings are in [the audit](../docs/formal-verification-audit-2026-09-23.md).

## Commands

Run from the repository root with the pinned Bun version:

```sh
bun scripts/verify.ts --suite claims
bun scripts/verify.ts --suite runner-selftest
bun scripts/verify.ts --suite boundary
bun scripts/verify.ts --suite all-required
```

`claims` admits the closed metadata schema, unique property identities, complete governed file inventory and current dependency hashes. `runner-selftest` exercises rejection of invalid, empty, skipped, timed-out, stale and vacuous result/configuration metadata. `boundary` runs focused production regressions and native/WASM raw-byte comparisons; first build its native test driver using the [boundary instructions](boundary/README.md). `all-required` runs the implemented infrastructure/regression suites and every activated required suite. A future suite cannot silently become successful merely because its name appears in the ledger. Infrastructure self-tests use synthetic tool output where stated; they do not establish production semantics. Result envelopes still license zero formal claims; regression observations do not upgrade a universal ledger obligation.

No runtime dependency on Lean, Java, TLC or another verifier is introduced. Formal tools are development/CI tools. Their immutable distributions, checksums and compatibility smoke evidence are recorded in `toolchains.json` and the toolchain-smoke report. Missing required tools fail their gate.

The command runner supports cooperating POSIX process groups. Its live supervisor receives cleanup requests over private IPC and signals its own group. `cleanupObserved` means supervisor termination and EOF on both captured command-output pipes were observed. It does not independently reap every descendant; detached descendants and absent OS progress are outside this contract. A missing cleanup witness fails the command. The registered Git/Bun checks use this bounded contract; wider process-tree qualification belongs to the host assurance phase.

## Reading a property

Each record in [properties.json](properties.json) has a stable ID, owner/reviewer, phase, observable failure, domain, quantifiers, bounds, assumptions, versioned specification and source bindings. `relation` states how the implementation is connected to the model. `licensedClaims` states precisely what public wording the evidence permits; it is empty for unstarted obligations.

The initial `versions` inventory lists identifiers mentioned by the mapped source and specifications, including negative-test identifiers in Rust inline tests. It is not a supported-version whitelist. Exact semantics-version admission is a separate obligation, and the ledger licenses no compatibility claim from this inventory.

Evidence labels are distinct:

| Label | Meaning |
| --- | --- |
| not-started | An obligation without admitted evidence |
| observed | Source inspection or a particular executed example |
| tested | Executed generated, differential or deterministic conformance cases |
| finite-checked | A completed exhaustive search of a named finite domain |
| proved-model | A checked theorem about the stated mathematical model |
| proved-implementation | A checked relation to governed production code |
| qualified | The exact artifact/environment boundary was exercised |

A finite model check never automatically upgrades its associated implementation to proved. Passing a Rust/WASM comparison does not establish independence from shared evaluator bugs. Positive memory derivations assume the selected facts; hashes do not authenticate them. See [assumptions and profiles](assumptions.md).

## Input binding and review

Primary property mappings initially cover whole modules. The separate conservative dependency inventory includes the full governed source/spec/build/workflow surface, including new untracked files. This intentionally invalidates more evidence than a fragile hand-maintained dependency graph. A missing, added or changed governed input fails validation.

When changing governed code:

1. Identify affected obligations and determine whether their statements, assumptions, domains or bounds changed.
2. Add the counterexample/regression or proof obligation before upgrading the evidence claim.
3. Independently review the abstraction and implementation relation; update source bindings only after that review.
4. Re-run affected suites and bind fresh output to exact production, proof/model, runner, toolchain and configuration inputs. Do not refresh hashes to pass off old evidence as new.
5. Run the repository's required final gate on the converged integration candidate.

Finite TLC configurations disclose constraints and overrides. Safety symmetry needs independent review; liveness configurations prohibit symmetry. Required action witnesses prevent constant/no-behavior models from passing as protocol exploration. Lean claims require nonempty theorem inventories and transitive axiom reports; sorry, hidden custom axioms and native-evaluation/compiler axioms are not admitted by default. Negative controls must fail at the intended invariant/theorem, not merely fail to launch a tool.

The core ledger inventories hosted obligations for visibility, but `hosted` is excluded from core release claims until the separately scoped algal-cloud assurance case exists. Physical power-loss and live-provider qualification likewise require their own exact evidence.
