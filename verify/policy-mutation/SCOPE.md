# policy-mutation — Phase 15 application-host policy lane

This lane connects logical evidence to host admission by systematically
mutating every decision-relevant input of the production
`algal.application-host.v1` policy host (`src/application-host.ts`,
`createApplicationPolicyHost`) and re-running the production decision. It is
the policy-mutation leg of Phase 15: deterministic policy/model decisions
are probed at the exact seams where the host grants or denies authority —
commit admission, dispatch admission, scope validation, decoder admission,
frontier service, execution/settlement, reconciliation, and the evaluation /
selection / restoration / research evidence gates the host delegates to.

## What the lane verifies

For every security-relevant field of the host surface — every field of the
policy record, every constructor option (deployed authority), and every
consumed context row (command, revision, intent, scope, observation,
evidence, dispatch record, channel file) — `mutants.ts` declares one or more
mutants, and `run.ts` replays the relevant production call on a bounded,
fully committed world (`harness.ts`). Each mutant pins:

- **construction rejection** — the mutated policy record fails
  `parseApplicationHostPolicy` (unknown contract version, missing required
  rows, extra keys, unsorted/duplicate allowlist rows, malformed digests,
  oversized text, bound breaches) — before any decision runs;
- **decision rejection** — the mutated decision denies with the pinned
  production message (or the `algal.application-admission-denied.v1`
  record's reason at `dispatchPending`);
- **decision change** — the call still admits but the normalized admitted
  payload differs (echoed `hostProfile`/`episodeAccess`/`recipient`, moved
  `frontier`);
- **flip** — a widening mutant (added route, absent attestation
  requirement) admits what the same context under the base policy denies;
- **contractual survivor** — the field is deliberately not consulted by that
  decision, documented per mutant (see below);
- **identity effect** — whether the mutant re-mints admission `identity`,
  rebinds only `configurationDigest`, or leaves both unchanged (checked by
  constructing the mutant host).

## Production seams exercised

| Probe | Production call |
|---|---|
| `identity` | `identity`/`configurationDigest` minting (`algal.host-admission.v2` / `algal.host-dispatcher.v1`) |
| `current-frontier` | `currentFrontier(application)` |
| `commit-*` | `admitCommit` — create/memory/investigate(deliver)/investigate(start-episode)/activate(+selection)/restore/migrate, research-runtime create |
| `admit-deliver`, `admit-deliver-alerts`, `admit-episode` | `admitDispatch` — delivery plans and episode bindings |
| `validate-scope`, `scope-mint`, `validate-memory` | `validateScope` directly, `ApplicationMemoryService.putScope`, and `validateForRevision` (the composed scope→snapshot→observation authority chain) |
| `decode-raw`, `decode-receipted` | `decodeObservation` — decoder allowlist, `rawContract`, `receiptContract`, both `receiptBinding` modes |
| `exec-deliver`, `exec-episode` | `dispatch()` — channel append settlement and the episode `blocked` boundary |
| `exec-reconcile` | `reconcile()` + `readApplicationChannel` — the durable `algal.host-channel.v2` file's closed shape, legacy-version fence, route bind, identity uniqueness, and bounds |
| `dispatch-pending` | `ApplicationCore.dispatchPending` — admission denial becomes the typed `algal.application-admission-denied.v1` record |
| `dispatch-reconcile` | `ApplicationCore.reconcileDispatch` — dispatch records refuse a changed dispatcher `configurationDigest` |
| `research-verify`, `research-activate` | `verifyApplicationResearchEvaluation` / `admitApplicationResearchActivation` — the evaluator-sealed seam |

The fixture (`harness.ts`) mints a real committed world through
`ApplicationCore` + `ApplicationMemoryService` on `MemoryStore`: genesis,
two admitted observations, an intents commit (deliver + start-episode left
pending), supported derivations, two accepted `evaluateApplicationRevision`
evaluations, a `produceApplicationComparison` comparison, selection policy
records, a committed `activate`, a restoration record + host restoration
policy option, and a full `sealed-research-evaluation.v1` chain
(policy/corpus/request/report/seal plus an evaluation admitted under an
explicit verifier). No mock replaces the production host; the only
double is `checkerEngine` — the `verify/reference/memory/checker` least-
fixpoint oracle, used as the `MemoryQueryEngine` — whose `identity` is
parameterized so a second engine exercises engine-identity narrowing.

## Fail-closed boundaries

Every malformed, withheld, or mismatched input denies rather than admits:
unknown policy contract versions; missing/extra/unsorted/duplicate/oversized
policy rows; malformed digests and identifiers; wrong application on the
command, revision, intent, snapshot, or scope; missing/incompatible/wrong-
predecessor memory; stale derivations and evaluation parent states;
foreign/doubled/stripped evidence (evaluation, comparison binding is
upstream, selection policy, restoration, drain); foreign decoder digests and
raw/receipt contract mismatches; malformed frontier lineage at scope mint;
channel files failing every v2 guard; foreign engine/verifier/restoration/
selection-environment options; the 33-claim bound on decoded evidence. All
denials surface as typed harness outcomes (`construct` vs `decision`) —
production throws ordinary `Error`s for most of these, which is a known
surface choice this lane normalizes, not a gap it papers over.

## Contractual survivors (pinned, not bugs)

- `frontier` is excluded from admission identity — the movable attested
  selection rebinds `configurationDigest` only (`frontier-moved-identity`,
  `frontier-moved-memory`). The stale-dispatch consequence is pinned by
  `dispatch-reconcile-config-changed`.
- `hostProfile` echoes only into episode bindings; delivery plans read
  `routes[].hostProfile` (`hostprofile-swapped-deliver`).
- `episodeAccess`/`hostProfile`/`route` fields echo into admitted plans by
  design — the change mutants pin the echo exactly.
- Host options (`memoryEngine`, `restorationPolicy`,
  `selectionEnvironment`, `researchVerifier`, `channelsDir`) never enter
  `identity` or `configurationDigest` (`options-excluded-from-identity`) —
  they are deployed authority pinned by the decision gates they open.
- `options.memoryEngine` is consulted only on episode reproduction
  (`engine-withheld-commit-memory`); a swapped honest engine replans
  episodes identically — provenance binds the derivation record, which is
  exactly what the commit-side evidence citation denies (`engine-swapped-*`).
- `previousDispatch.plan` replays verbatim; the route allowlist gates fresh
  admission only (`dispatch-replay-under-dropped-route`), and `dispatch()`
  settles the admitted plan without re-running it (`exec-route-dropped-settles`).
- Host `validateScope` consults `application`+`attestation` only — scope
  frontier freshness is the service's job upstream (`scope-frontier-foreign`);
  host `decodeObservation` is application-agnostic and procedure-agnostic —
  cross-application and procedure↔decoder fences live upstream
  (`decode-application-foreign`, `decode-procedure-foreign`).
- Object member order in the policy record carries no authority
  (`policy-key-order`; canonicalization is VAL-04's surface).

## Sampled, not proved

Mutation sampling is exhaustive over *fields* but pointwise over *values*:
each field gets boundary-targeted values (foreign digests, bound+1, wrong
contract, wrong mode), not exhaustive input spaces. Probes assert the
canonical message substring, not the whole call graph. `unknown`-shaped
inputs all pass through production parsers; mutation of already-parsed
objects models what a hostile caller hands the host.

## Limitations / open surface

- `admitCommit` trusts `intent.entrypoint`'s presence in
  `revision.entrypoints` — an unknown name crashes with a raw `TypeError`
  rather than a typed message (`episode-entrypoint-unknown` pins the
  boundary; the lifecycle's `Unknown intent entrypoint` guard upstream is
  the typed fence).
- `channelsDir` custody semantics (file locking, `.custody` leases,
  uncertain-write journals) belong to the host-conformance lane; this lane
  covers the channel file's *parsed* contract.
- Multi-application policy composition, multi-revision histories, and
  habitat-level budget accounts are out of scope — the policy contract
  admits exactly one application.
- `selected` manifest verification inside comparisons is replayed through
  `produceApplicationComparison` evidence, not re-run at admission.

## Why this lane does not modify production guards

The lane's contract is to *pin* the existing decision surface so Phase 15's
reviewer can see precisely which fields move authority. Changing a guard
while testing it would make the suite non-falsifiable; every expected
outcome here is measured against unmodified production code.
