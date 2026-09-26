# `lean-replay` — Lean replay module build + axiom audit

Phase 14 suite: compiles `Algal.Replay.Model` and `Algal.Replay.Theorems`
under the pinned Lean toolchain and audits every theorem's transitive
axioms.

## What it does

1. `leanRuntime` — verifies the pinned toolchain identity (binary digests,
   `verify/toolchains.json` entries, full distribution inventory hash).
2. `stageLeanProject` — copies `verify/lean`'s `.lean`/`lakefile.toml`/
   `lean-toolchain` inputs into a fresh mkdtemp tree with pre/post-copy
   digest equality, so a stale `.lake` artifact cannot pretend to be a
   build.
3. `lake build` for `Algal.Replay.Model`, `Algal.Replay.Theorems`, and
   `Algal.Audit` (the audit machinery is a build dependency of the
   generated audit sources) via `runCommand` under a scrubbed environment,
   120 s deadline, 2 MiB output bound.
4. `audit_theorem` over every public `Algal.Replay` theorem —
   `parseTheoremAudit` requires each to be a `theorem` declaration with
   transitive axioms inside `propext`/`Quot.sound`/`Classical.choice` only
   (`sorryAx` and `Lean.ofReduceBool`/`native_decide` are rejected by the
   admitted-axiom list).
5. `audit_modules Algal.Replay.Theorems` — whole-module audit covering
   every declared theorem including generated equation lemmas
   (`serve.eq_def`, `steps.eq_def`, `*.eq_1` helpers, `_private.*` match
   encodings); the public-name set is asserted exactly.

## Load-bearing statement pinned

`Algal.Replay.steps_replay_reproduces` — replaying a run under its own
produced effect tape reproduces the run under any oracle. The suite checks
the audited type contains `RunAgree` so a vacuous restatement cannot pass.

## What is claimed

- The replay model and theorem library compile under the pinned toolchain
  in a fresh tree.
- Every theorem in the audited module keeps its transitive axioms inside
  the standard set — no `sorry`/`native_decide`/unreviewed axioms reach
  the audited surface.

## What is not claimed

- No production-refinement claim — see `verify/lean/Algal/Replay/SCOPE.md`.
- No audit of other Lean modules — `Algal.Audit` is built for the audit
  verbs only; only `Algal.Replay.Model`/`Theorems` are theorem-audited.
- No whole-tree trust check — imports are compiled, not audited, here.
