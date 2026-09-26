# Evidence-mutation lane scope — `verify/mutation` (suite `evidence-mutation`)

Exhaustive targeted mutation of `algal.process-evidence.v1` documents,
distinguishing the **admission** stage (`parseProcessEvidence`: structure,
bounds, digest-key checks, record/receipt schema) from the **semantic**
stage (`verifyProcessEvidence`: chain transition rules, receipt-to-record
consistency, dependency closure, bit-for-bit replay).

## Method

1. `fixtures.ts` mints five genuine evidence documents through the real
   path (`MemoryStore` → `parseProcessRecord` → `runOrganism` →
   `exportProcessEvidence`): `complete`, `failed-miss`, `suspended`
   (wake-bearing), `uncertain`, `value-dep`. Each verifies before use.
2. `mutants.ts` applies one mutation per catalog entry. Mutants that
   change content call `rebind`, which honestly recomputes every digest
   linkage — receipt `digest` fields and map keys, `record.receipt`
   pointers, `previous` links, record keys, `head`, manifest keys and
   `root`. The digest layer is already proven by the corpus lane; this
   lane asks whether the semantic layer still catches the lie.
3. `run.ts` probes each mutant twice — admission parse, then full
   semantic verify — and matches observed stage/code/message against the
   expectation declared independently in the catalog.

## What the catalog covers

`FIELD_LEDGER` names every security/custody/policy-relevant field of the
envelope, the process-record schema (name, manifestDigest, args,
generation/maxGenerations, status, wake, previous, receipt, cause), the
receipt schema (contract, runtime, manifestDigest/Key, args, outcome,
all cell sub-fields, all effect sub-fields, events, work, failure,
digest), the embedded program (contract, root, manifests, values), the
tool table (names + signature fields), and the negative-declaration lists
(missing.manifests/values) — plus ordering/duplication, membership, and
cross-reference mutants.

## Documented survivors

Twenty-six (base × mutant) probes survive — each names the binding
obligation it illustrates:

- **Replay-echoed fields** (`via`, `runtime`, effect `executor`, `usage`,
  `configurationDigest`, `cached`): replay reproduces the recorded claim
  verbatim; evidence binds what the host claimed, not an independently
  re-derived fact.
- **Declared-but-unreferenced members** (extra record, extra tool, extra
  missing entry): membership is not endorsement; unreferenced evidence is
  inert.
- **Self-consistent rewrites** (`head` → earlier record, record+receipt
  wake strip): the verifier authenticates the presented digest chain;
  binding that chain to the intended process head is the caller's
  obligation, discharged through `evidenceDigest`.
- **Claimed admission metadata** (tool `cost`, `maxOutputBytes`): replay
  serves tool effects from recorded receipts and never re-prices the
  declared signature.

Non-obvious catches worth noting: even semantically inert manifest edits
are rejected because the `run.start` event binds the manifest digest; the
record parser itself enforces generation bounds; the receipt schema pins
`wake` handles to `EFFECT_SUSPENDED`.

## Exclusions

Single declared-field mutations only — no combinatorial multi-field
space. The five base topologies are representative, not exhaustive of
every manifest shape. No live tool/executor, mailbox, transport, or
durable-slot evidence. An expected survivor is a scoped boundary
statement, not a defect claim and not a proof obligation.

## Run

```sh
bun test verify/mutation
bun scripts/verify.ts --suite evidence-mutation   # after integrator wiring
```
