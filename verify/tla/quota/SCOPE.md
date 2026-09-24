# NamespaceQuota scratch model

This is a finite upper model of the conservative namespace reservation algorithm,
not a proof of the measured filesystem walker or a general CAS/storage quota.
Source correspondence: `src/application-quota.ts` `withApplicationQuota` and
`crates/algal/src/application_quota.rs` `reserve`; source hashes are retained in
`source-hashes.json` as historical audit inputs, not a qualification of
concurrent source repairs. None of this scratch evidence is a registered-suite receipt.

The Bun lifecycle reaches `withApplicationQuota` through
`FileApplicationStorage.publication` in `src/application-filesystem.ts`. The
`src/application-storage.ts` interface states the required retained-charge and
callback ordering contract. `MemoryApplicationStorage` has a separate volatile
allocation algorithm; this filesystem model does not qualify its implementation
or make its owner-replacement tests evidence of durable restart.

Three actors make one reservation each across two application identities, with
two actors targeting the same application. The quota boundary itself is shared
and independent of application custody. Allowing those same-application actors
to reach it concurrently overapproximates the surrounding lifecycle serializer;
it must still conserve their allocations. Byte weights are symbolic 1 and 2;
headroom and ledger spare are each one unit. Those units do not instantiate the
production canonical encoder or prove real headroom/SQLite size bounds.

`Scan` reads retained ledger identities, measured named namespaces and common
coordination bytes while holding quota custody. Candidate charges take max(old,
measured+headroom), then add max(target,headroom)+twice the publication bytes.
Retained zero-byte rows still occupy an identity; missing named directories do
not delete their rows. `Admit` enforces identity, per-application and aggregate
bounds. `Reserve` atomically represents the completed durable ledger publication.
Partial helper writes and bounded owner retry mechanics compose from the
earlier publication/custody models; they are not independently proved here.
`PublishCopies` admits one or two copies' worth of namespace growth as a
conservative overapproximation of a publication retaining temporary/final bytes;
it does not assert that every successful real helper leaves both copies.

The active publication callback, and not a live external dispatcher, runs under
this lease. Application outbox composition must separately establish release of
the quota owner before adapter invocation. CAS value/manifest/run/effect bytes
are excluded exactly as in production. Directory entry/depth and nonregular/
symlink/path validation are admitted scan inputs here and require implementation
boundary tests. Common coordination growth is bounded by the explicit fixed
common bytes and two owner headrooms; arbitrary external filesystem growth is
not part of this model.

Failure and process-death profiles retain published ledger state. This model
has at most one returned I/O failure and one process death; these may both occur
in a history. Death drops live SQLite custody by assumption from OwnerLease;
it does not erase durable charges. `Reopen` is an observation event, not repair.
No implicit retry/refund/reclamation is present. Deletion of owned retained
files after a completed publication and outside a same-application critical
section reduces measured bytes without changing charged allocation. A remaining
actor can reserve again afterwards; a dedicated witness reaches that sequence. The legacy
layout starts with a measured namespace absent from the ledger; physical
coverage is asserted only after a successful full scan and reservation first
accounts for it. It is not assumed to have already met the accounting invariant.

`NoLostReservation` compares current ledger rows/bytes with ghost high-water
allocations. `PublicationsReserved` requires retained reservation before any
namespace growth. `QuotaBound` checks admitted allocations; `PhysicalCovered`
checks the reserved upper bound of modeled namespace growth including headroom.
The ghost high-water is not a production field or a source of admission.

Unsafe controls move scan before quota acquisition (lost update), omit the
second publication copy, skip reservation, omit aggregate admission or refund a
failed publication. Each must violate its named invariant in an attributable
trace. The fairness control removes per-actor weak fairness and must produce a
loop violating `EventuallyDone`. Positive liveness excludes I/O failure/death
and promises eventual return including quota/contended rejection, not eventual
successful allocation. No state/action constraints, symmetry or operator
overrides restrict the finite graph.

Root independent review approved the algorithm within this stated scope. The
initial 32-case inventory passed; the deletion extension and its two witnesses,
then the three added contender/copy witnesses and the new one-copy positive
profile, passed focused diagnostics. The latter explored 1,951 distinct states
with 3,997 generated and an empty queue; its raw evidence is
`/private/tmp/algal-phase06-quota-one-copy-positive.log`.
These historical/focused runs are not one qualified receipt for the final module.

Pending work: real sparse-file and simultaneous-reservation conformance,
registration/source-definition binding, and a fresh full qualified runtime
closure through the root-owned admission gate.

## Registered inventory

The registered candidate retains every scratch witness and unsafe control. Profiles
without an important action now also require a reachable action witness. Multiple
witnesses of the same action are separate profiles to preserve the existing strict
inventory rule. No checker limit, property, mutation or raw-output admission is
weakened. Fresh repository qualification and real conformance remain required.
