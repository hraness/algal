# Phase 08 closure and admission checkpoint

Phase 08 remains in progress. Deterministic counterexamples have driven repairs
in both runtimes; the unified grammar corpus, semantic evidence mutation driver,
fuzzing/shrinking engine and full obligation matrix remain unimplemented. These
regressions are sampled behavior evidence, not a universal closure theorem.

## Receipt, journal and cache composition

The runtime now checks complete return-receipt resource/schema admission before
hashing and returning it, including its fixed-length digest. Regression witnesses
cover wrapper depth, one-million-node amplification and complete/failed/suspended
readback and replay. Bun SDK cases additionally count sparse, inherited and
nonenumerable array positions and reject explicit undefined values.

Journal completion checks the prospective wrapped record before CAS/head writes.
An overbound completion leaves readable started evidence. Both runtimes preserve
post-dispatch uncertainty, stop guest fallback when the journal is poisoned and
refuse recovery of an unknown external write. Real owned effects establish that
replay of an admitted completed prefix does not execute it twice. Bun cache
tracking distinguishes lookup/metadata failure, actual execution, current cache
hits and replay; encoding/publication failure after a live result remains uncertain.
The independent repair review is retained in
`/private/tmp/algal-closure-final-review/REVIEW.md`.

These checks do not reserve capacity before every effect, preserve every ordinary
run prefix after finalization failure, establish all process settlement liveness,
or make every individually valid artifact exportable in a larger wrapper.

## Bundle producer/consumer closure

The original probes demonstrated that Bun exported 513 distinct values while its
own importer rejected more than 512. They also demonstrated Bun/native disagreement
for otherwise individually accepted payload depths 63/64 after bundle wrapping.
The repaired producer charges distinct values and manifests, skips repeated
references, and accounts for the complete envelope while collecting entries.
Both importers check the supplied and manifest-normalized envelopes before writes.
Limits remain 512 entries per namespace, 64 MiB, depth 64 from root zero and one
million value nodes. Partial supplied-record imports remain compatible; they do
not assert static dependency completeness or transactional rollback.

Independent review requested a lone-surrogate byte-boundary witness, which found
that Bun 1.3.14's `Buffer.byteLength` returns 2 for a lone UTF-16 surrogate. Assuming
standard UTF-8 replacement length 3 undercounted its JSON escape and admitted the
next byte. The corrected helper counts JSON UTF-8 directly from code units:
valid pairs contribute 4 bytes and lone surrogates contribute their 6-byte escape.
The minimized failing witness and logs remain in
`/private/tmp/algal-bundle-closure-repair/bun-escaped-bytes.log`.

Final focused bundle evidence passed 29 Bun tests/84 assertions and seven native
tests. The native cases include 511/512/513 manifests/values, shared references,
whole-envelope byte/node triples, wrapper depths 61–64, normalization expansion
and partial-import behavior. Native tests ran serially with pinned Rust 1.97.1;
the seven cases finished in 68.71 seconds. Bun's parser also refuses the 513th own
entry before reading its value, with throwing-getter sentinels that expose an
allocation/admission-order regression. Worker evidence and source hashes are in
`/private/tmp/algal-bundle-closure-repair/HANDOFF.json`.

## Raw ingress and directory admission

Bun CLI unpack/call now admit bounded regular-file bytes and strict UTF-8 before
JSON parsing. Two supervised ingress tests passed 166 assertions: exact 64 MiB
files, overbound files, explicit regular symlinks, FIFO/device rejection,
malformed UTF-8 in overwritten duplicate members, BOM/truncation, no rejected
record publication and no provider command launch. The command supervisor owns
cooperating descendants; failed cleanup retains the owned test namespace.
Detached descendants remain outside that supervisor contract.

Mailbox namespace scans now count every physical entry before filtering, up to
2,064, separately from 1,024 admitted mailbox configurations. Store listings have
a 4,096-entry bound; module loading separately limits 4,096 entries and 512 module
files. Rejection preserves ordinary files, orphan directories, lock contents and
all recovery evidence. Missing optional listing directories remain empty; later
scan failures do not become empty successful inventories. See
[directory admission](../directory-admission.md) for per-record limits and error
behavior. Inner interrupted-process-creation residue remains a separate follow-up.

These counters bound consumer admission. Bun 1.3.14 eagerly materializes the
directory before `opendir` yields entries, and `Glob.scan` also collects its
matches before yielding. Neither provides a qualified memory bound. Native
`read_dir` depends on libc/filesystem enumeration behavior; Apple libc can cache
a whole union directory. A guarded enumeration primitive and its supported
platform/filesystem qualification remain open. This checkpoint does not complete
MBX-04 or Phase 08's traversal obligation.

Five native directory regressions passed in 13.27 seconds with the actual CLI and
filesystem service. Bun focused checks cover corresponding boundary triples,
real retained-owner bytes, missing/non-directory namespaces and bounded individual
record reads. The final per-test split retains the repository's 20-second ceiling;
it does not reduce the tested boundary domain.

## Integration qualification

The required renderer fixture/format/test/clippy jobs passed for the current
malleable-site project and local-triage with macOS desktop enabled. Their initial
sandboxed dependency fetch failed DNS resolution; the configured approval route
allowed the exact lockfile fetch, after which all jobs passed. Raw full log:
`/var/folders/k3/s4y7dlcj4mz2j1kbg428r5bw0000gn/T/system-one-Uh8g0e/check.log`.
This is renderer contract/build evidence, not live GUI or user-intent qualification.

The integrated source subsequently passed the full Bun check, native workspace
gates, all 20 parity/fixture commands and the 23-suite formal aggregate.
[The integration checkpoint](integration-checkpoint.json) records counts and
qualification limits; [independent review](integration-review.md) found no new
source blocker. Saved model, Lean, protocol and scheduler evidence passed
readmission against the exact source/tool/artifact bindings. Historical green
receipts remain unchanged. These gates complete this repair checkpoint, while
the Phase 08 corpus, mutation and allocation obligations above remain open.
