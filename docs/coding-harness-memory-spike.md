# Coding-harness memory spike

This opt-in example tests whether a coding agent can reuse an observation, explain
the dependencies that make it applicable, and request new evidence when those
dependencies change. The fixed harness and backend are held constant. Policy and
procedure evolution are outside the scored comparison.

The implementation uses the existing native positive Datalog engine through a
bounded asynchronous adapter. It introduces no public language, VM, or wire-format
change. The TypeScript runtime remains independently runnable without native
memory configuration.

## Records and effects

`examples/coding-harness/memory-contract.ts` defines the example-local interface.
An immutable host store holds procedures, raw probe observations, snapshots,
programs, and query results under canonical SHA-256 references. The adapter checks
source bytes and re-decodes observations before admitting facts. A model-authored
hypothesis is not an observation. Source records establish traceability, not
provider or world-state attestation.

Three small procedures are data: resolve a tool, read a scalar JSON field, and
fingerprint a file. Their interpreter admits only those operations. The model
chooses a procedure alias, never a host path or executable. `memory.read` and
`memory.query` are pure; `memory.probe` explicitly uses the task's sandbox terminal.
Every model-requested memory action consumes a normal model attempt. Physical
probe commands are counted separately without adding synthetic conversation turns.

Queries distinguish supported, opposed, conflicted, unknown, stale, exhausted,
and error outcomes. Positive rules join observations with declared prerequisite
bindings. Changed dependencies cause a new projection and full recomputation.
Native proofs retain the first canonical witness, so deleting one support cannot
be implemented by deleting everything that happened to cite that witness.

The authored scenarios provide complete dependency declarations and known initial
snapshots. Within a sequence and environment, an unrelated change can preserve an
observation. Arbitrary terminal commands invalidate prior applicability; a fresh
probe of one procedure cannot revive unrelated observations. Independent benchmark
tasks require fresh environment applicability. Automatic dependency discovery is
not part of this spike.

Normal ALGAL receipt replay consumes recorded memory results and repeats no
terminal effects or native queries. The separate native query verification reruns
the conditional derivation against its exact snapshot and program. Historical
records remain available after replacement or correction.

## Bounds and isolation

The example caps each episode at four memory operations and 8 KiB of retrieved
memory results. Procedure descriptions are fixed prompt configuration; full input
bytes are accounted separately. Queries admit at most 128 facts, 12 rules, 16
answer rows, eight rounds, and 50,000 native work units. Exhaustion is explicit and
never becomes a successful empty answer. The pinned executable digest is checked
at startup and on invocation.

Harbor keeps stores and receipts outside task-mounted directories. Each treatment
and sequence has its own store, mutable index, container, and evidence directory.
Only explicitly admitted immutable seed records are shared. No patches, packages,
processes, or grader labels carry between episodes. Host backend routing never
enters the task environment.

## Experiment

The three treatments use the same ALGAL loop, full-context policy, procedure data,
initial task snapshots, and terminal authority:

| Treatment | Persistent information |
| --- | --- |
| None | No prior observations available to the model |
| Episodic | Chronological observations, operation/result data, scopes, and source references |
| Logical | The same observations plus typed facts and bounded derived answers/proofs |

Real deterministic sandbox probes acquire the common seed without model calls.
Acquisition and storage are reported separately and equally for the persistent
treatments. This warm start does not establish autonomous learning.

Two fresh Terminal-Bench development tasks first calibrate the repaired harness
at eight attempts each. At least one independently graded solve is required.
The controlled comparison then has four scenario families, two follow-ups, and
three arms: 24 episodes at six attempts each. Transitions, ordering, metrics,
sources, and images are frozen before scores are observed.

The engineering gate requires all deterministic semantics checks, no stale or
unsupported logical admissions, logical solves at least matching episodic solves,
and benefits in at least two episode pairs through additional solves or fewer
redundant typed probes. Arbitrary commands are not guessed to be avoided probes.
This small comparison tests the whole structured-memory package; it cannot
isolate Datalog from structured facts or establish a general coding improvement.

Only after those gates pass does the plan permit four fresh standard benchmark
tasks, two repetitions, and two finalist treatments (16 episodes, eight attempts
each). The total planned ceiling is 288 live calls. The existing qualified
subscription backend has no paid API fallback; the user's incremental paid cap
is $20. Unknown subscription/token attribution stays unknown.

## Run and verify

Use Bun 1.3.14, Rust 1.97.1, Python >=3.12, and Harbor 0.23.0. Build and pin an
owned native executable; do not rely on another task's mutable target directory.

```sh
cargo build --locked -p algal --bin algal
ALGAL_MEMORY_NATIVE="$PWD/target/debug/algal" bun test \
  examples/coding-harness/memory-records.test.ts \
  examples/coding-harness/memory.test.ts
bun test examples/coding-harness/harness.test.ts \
  examples/coding-harness/protocol.test.ts examples/coding-harness/cli.test.ts
python -m unittest discover -s examples/coding-harness -p 'test_*.py'
python examples/coding-harness/memory-pilot.py --help
```

Live runner commands must execute under the admitted host scheduler and Docker
environment. The runner does not start Docker, pull/build images, or retry an
uncertain trial. Keep private backend selectors and raw transcripts out of public
reports. The original pilot's result evidence remains tied to its recorded source
revision and is not rewritten by these changes.

Results and exact execution identities will be recorded after the gates run.
