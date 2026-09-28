# Shared host contracts

The additive `algal.evaluation-evidence.v1`, `algal.host-profile.v1`, `algal.promotion-decision.v1`, and `algal.host-lifecycle.v1` records carry bounded, canonical JSON. Every record has a `digest` equal to the SHA-256 digest of its canonical JSON with `digest` removed. Parsers reject unknown or missing fields, malformed digests, out-of-bound lists and non-normalized values. Set-valued lists (`groups`, `limitations`, `supportedContracts`, `absentCapabilities`, `heldAuthority`, `permittedOperatorActions`, `probes` by id) must be sorted and unique so both runtimes produce identical canonical bytes.

Evaluation evidence binds base and candidate artifact digests, a dataset split and label provenance, scorer/runtime/route identity, usage and charges, complete train/validation/holdout cases, review status, claim category and limitations. Each case retains its outcome (complete, failed or uncertain), score, receipt reference and feedback. Settled charges may not exceed the reservation, and outcome totals must match their cases exactly. It is evidence of replayable internal consistency only; it does not attest to labels, provider truth or external effects.

A host profile records host and runtime identity, route/account scope digests, bounded limits, usage units, result retention, uncertain-effect policy, probes and explicitly absent capabilities. It is qualification evidence and never grants authority.

A promotion decision joins a distinct incumbent and candidate with evidence and policy digests, scope, shadow/canary/active rollout limits and expiry, reviewer status, rollback target and observed metrics. It cannot grant capabilities, send effects or mutate a workspace.

A host lifecycle record is a read-only projection of owner, generation, state, pending intent, backlog, held authority, usage, receipt and permitted operator actions. An uncertain state always retains its pending intent, and a pending intent is valid only while running, suspended or uncertain. Inspection and offline replay never invoke a provider and never retry an uncertain effect.

The shared fixture `scripts/fixtures/host-contract.json` is exercised by `src/host-contract.test.ts` and `crates/algal/tests/host_contract.rs`; both runtimes must produce identical canonical digests and reject the same invalid cases with the same error code.
