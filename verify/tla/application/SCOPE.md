# ApplicationSelection scratch model

This finite model starts with one admitted genesis state for each of two named
applications. Three operation actors may capture commands before competing for
custody. Ordinary profiles use one application; the namespace profile assigns
one actor to the second application and permits both owners simultaneously.
There are at most three new operations total and a retained state bound of two
or four including genesis. This is an explicit small abstraction, not a proof
at production state/pending/CAS byte limits or an induction over unbounded history.
Genesis creation/custody and raw storage qualification compose from earlier
models and real application creation tests; this model does not re-prove them.

Bun correspondence is to `ApplicationCore.commit` and history validation in
`src/application-core.ts`. The filesystem facade `src/application.ts` supplies
`FileApplicationStorage` from `src/application-filesystem.ts`; custody, publication
and the host obligations in `src/application-storage.ts` remain separate
composition assumptions. Volatile memory-adapter conformance does not establish
filesystem durability or qualify arbitrary injected storage.

The head is an atomic content-addressed state selection. A ghost immutable
intern table maps equal node contents to the same compact integer identity,
and distinct contents to distinct identities. `ContentIdentity` checks both
directions. Allocation order is a symbolic renaming, not a claim about actual
digest bytes. This keeps finite traces within the unchanged strict evidence
size bounds, replacing recursively printed copies of the same predecessors. A node carries all
state fields plus the finite normalized-request projection (standing for its
transition and request hashes); equal contents produce equal identities, including exact
retries. Hash injectivity and parser/canonical validation are assumptions.
Unmodeled command details, including `causedBy`, are fixed within each profile;
this is not a field-by-field proof of every production request. Evidence fields
`targetMemory`, `targetSchema`, and `consumed` summarize verified relationships;
they are not asserted to be literal ApplicationMigration record fields.
The `history` variable is a ghost sequence of selected heads, so prefix loss
would remain visible even if corrupt predecessor links skipped an old selection
in actual traversal. It is not a second authoritative on-disk history journal.
Revision and memory projections are derived from the selected head together.

Commands are captured before custody. Both direct expected-head comparison and
the independent `checkStep` predecessor check are modeled. A positive profile
removes just the first check and witnesses rejection by the second. The stale-
head negative control explicitly removes both checks. Normalized request binding
remains a separate invariant and is not omitted by that control.

Operation lookup distinguishes exact indexed committed retry, conflicting
request, orphan preparation, and a missing index whose identity is retained in
history. Indexed exact retry returns the historical node before the current-
head check, even after later selection. Missing-index exact retry rejects. A
fresh changed request under the missing identity also rejects. The unsafe
identity control removes only the history identity guard. The unsafe retry
control abstracts bypassing both retained request comparisons (index/request
and committed transition/request); it does not purport to show that removing
only the first comparison defeats the implementation's second binding.

Dependencies and operation index precede head selection. Quota reservation and
trusted commit admission are separate gates, composed as completed results.
`BeginHead` marks mutation before the head helper starts; failures both before
actual selection and after selection report uncertainty. Returned errors after
this mark cannot claim known non-application. A single failure and a single
process death can occur per faulty profile. Death releases the abstract owner
as established by the earlier lease model and leaves prepared/index/head/CAS
state intact. A subsequent actor can finish an orphan only while the original
expected head remains valid. This does not qualify helpers for power loss.

Structural transition checks include application namespace, sequence/epoch,
revision ancestry/runtime/capability narrowing/retained entrypoints, activate's
schema preservation, and restore/propose/investigate's memory and intent rules.
The model admits typed revision metadata, store dependencies, and successful
async migration/restoration/proposal evidence verification as inputs. It checks
restore/propose evidence is applied to its exact parent, while migration binds
its source memory/revision and target revision/memory/schema and consumption; it does not reproduce
cryptographic proof replay, memory derivation, comparison/evaluation coverage,
research policy, or arbitrary custom admission. Those remain separate authority,
memory/evolution, implementation-conformance, and refinement obligations.
Unsettled activation barriers and drain disposition are in ApplicationOutbox;
stateful integration must show the real `commit` composes both boundaries.

The fair profile requires weak fairness separately for each finite operation's
progressing steps, excludes injected faults and index removal, and promises
return (including stale-head or policy rejection), not successful publication.
The restore action admits an overapproximated successful verifier result. Its
singleton seeded history does not establish the retained differing-strategy
ancestor required by the real restoration verifier; the structural action
witness is not production restoration conformance. A real restoration history
is required separately.

There are no symmetry declarations, state/action constraints, or operator
overrides. All 76 compact-model diagnostics passed: 31 positive profiles,
36 declared action witnesses, and 9 intended unsafe controls. Positive fairness
completed; the unfair control produced its expected temporal loop. The raw batch
is `/private/tmp/algal-phase06-selection-compact-diagnostics.log`, with exact
per-run output paths in each row. Independent source review approved the repaired
semantic scope, and root independently approved the compact representation
within this scope. Real conformance and registered-suite qualification remain
pending. No operational qualification or
source-to-model refinement is claimed.

## Registered inventory

The registered candidate retains every scratch witness and unsafe control. Profiles
without an important action now also require a reachable action witness. Multiple
witnesses of the same action are separate profiles to preserve the existing strict
inventory rule. No checker limit, property, mutation or raw-output admission is
weakened. Fresh repository qualification and real conformance remain required.
