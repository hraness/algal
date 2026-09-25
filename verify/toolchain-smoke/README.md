# Verification toolchain smoke checks

These small fixtures qualify invocation and result classification for pinned
TLC and Lean tools. They do not model or prove ALGAL production behavior.

The publication model has two Boolean variables. Its good configuration has
three reachable states, checks preparation before commitment, and requires
eventual commitment under weak fairness of preparation and publication. It
uses full breadth-first checking, one worker, fingerprint index 0, and action
coverage. There is no symmetry, state/action constraint, definition override,
or depth-limited/simulation mode in these configurations.

The safety mutation permits publication before preparation. The liveness
mutation disables publication and must produce an uncommitted stuttering
counterexample, despite the now-vacuous publication fairness clause. Separate
intentionally false invariants retain concrete preparation/publication action
witnesses. A model-parser failure, timeout, process crash, or host refusal does
not satisfy any expected counterexample.

The Lean project uses only the bundled `Std` library, without mathlib or any
external package dependency. Its three toy theorems must report no transitive
axioms. `WrongProof.lean` must fail because `1 < 1` is false. The other two
negative fixtures demonstrate that successful Lean exit alone is insufficient:
`HiddenAxiom.lean` exposes a custom axiom, and `HiddenSorry.lean` exposes
`sorryAx` through an intermediate theorem. Their claims are refused by the
smoke audit even though Lean accepts the declarations.

## Run

Use Python 3.11 or later and provision the exact tools in the
[recorded smoke evidence](../../docs/formal-verification-evidence/toolchain-smoke.md).
This runner does not install tools or verify publisher authenticity; verify
the recorded archive pins before running it. Provide absolute executable paths
and a new output directory:

```sh
python3 verify/toolchain-smoke/run.py \
  --java /private/tmp/algal-verification-tools/jdk-21.0.12.1+1/Contents/Home/bin/java \
  --tlc-jar /private/tmp/algal-verification-tools/downloads/tla2tools-v1.7.4.jar \
  --lean-bin /private/tmp/algal-verification-tools/lean-4.34.0-darwin_aarch64/bin \
  --output /private/tmp/algal-verification-tools/results/new-run
```

TLC 1.7.4 creates an internal RMI listener even for this local checker; this
host required reviewed execution outside its network sandbox. A denied
listener is an environment refusal, not a passed negative control. Follow the
active host's access/scheduling controls; do not weaken them to obtain a pass.

Each child owns a new process group and has a 45-second deadline. Timeout
cleanup signals only that created group. Build files, TLC state, JVM home and
temporary files remain under the fresh output directory. JVM telemetry is
disabled through its task-local `.tlaplus/esc.txt`, and ambient Java option and
Lean library overrides are removed for the child environment. No global
installation, shell profile, or user toolchain selection is changed.

The runner records exact commands, exit codes, expected classifications,
logs, input hashes and observed executable hashes in `receipt.json`. A receipt
is execution evidence, not an attestation. It cannot independently establish
the integrity of the host, compiler, JVM, Lean kernel, or their libraries.

The retained [2026-09-23 run](evidence/2026-09-23/receipt.json) is an example
result for those exact inputs and this host. Future required gates must rerun
their current inputs rather than reusing this receipt.
