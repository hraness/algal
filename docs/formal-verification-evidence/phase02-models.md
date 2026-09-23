# Phase02 model and integration evidence

The operational suites completed 91 runner-owned TLC invocations: 13 exhausted
finite profiles, 58 reachable nonstuttering action witnesses, and 20 deliberate
protocol mutations rejected at their intended invariant or temporal property.
Raw output was independently re-admitted against current model/source definitions
and the qualified Java runtime. Earlier failed runner attempts are excluded.

| Profile | Distinct states |
| --- | ---: |
| custody-stable | 323 |
| custody-legacy | 514 |
| custody-prepared | 341 |
| custody-zero-capacity | 126 |
| custody-independent | 169 |
| custody-progress | 323 |
| store-fresh | 56 |
| store-existing-ancestors | 58 |
| store-retained | 190 |
| store-corrupt | 96 |
| selected-head | 163 |
| mailbox-clean | 62 |
| mailbox-ambiguous | 10 |

Every successful profile exhausted its queue; the fair-progress profile completed
its temporal check. There are no symmetry, state/action constraints, depth cuts or
recovered checkpoints. These are the explicit finite bounds in
[definitions.ts](../../verify/tla/definitions.ts), with the assumptions and
implementation mapping in the [model guide](../../verify/tla/README.md).
TLC's optimistic fingerprint collision estimates are recorded, not promoted to
guaranteed collision freedom. Abstract model safety and sampled runtime agreement
do not prove implementation refinement or physical power-loss safety.

## Exact model receipts

- [Custody raw evidence](../../verify/results/acc555dae0039a2df0752b76235652f49a5180f2d12ff28df35c14bd0cfec621/custody-model.json): 29 calls, definition `sha256:3354ce918ff3c9f6a8782c69c8d055ce2ae32235140c81f47d1f8035e047da45`; content SHA256 is the directory name.
- [Publication raw evidence](../../verify/results/5c5210e874a80dbe2bc95f612cf325c605f3a36db3aa510859353b5ed09d7941/publication-model.json): 62 calls, definition `sha256:bd1d52e0dd07eeaa3c06e6210513ff88e81f3851368c67a4f803e422f56d5f1d`; content SHA256 is the directory name.

Each receipt includes actual framed logs, exact generated configuration, static
command arguments, bounded process completion and tool identities. Readmission
re-parses the logs and rejects changed live source/tool definitions. Results live
outside the definition input inventory to avoid self-referential evidence.

## Current integration candidate

After publication source convergence, the integration owner rebuilt the native
CLI and custody fixture with the absolute pinned Rust 1.97.1 toolchain, preserving
the isolated target directory. The rebuilt CLI SHA256 is
`9068dfe021d983b06ecc0b822428208b210f7e62f202a626f838f3859800d863`.

- Application parity: **250 identical steps** across Bun and native.
- Native example parity: **62/62**, with receipt cross-verification.
- Mailbox admission parity: mutual readback, conflicting bounds, live contention,
  forced collection, owned SIGKILL takeover and exact owner archive passed.
- The rebuilt custody fixture SHA256 is
  `616fbd2802e2c032ce1e202992e9c934f324a8916b7e0013397cbced8c426e6b`.
  Its [eight-schedule receipt](../../verify/results/49b4fa122f53a6c2bf354d9b485159b082168cf178fcbdcddbd76e7039527bef/custody-runtime.json)
  passed closed report admission, exact runtime combinations, required observations,
  identical initial/final digests, before/after native identity and process cleanup.
- Integrated admission tests: **70 passed, 275 assertions**, including actual runner
  GC/backpressure controls and TLC parser/negative controls.
- Strict TypeScript and focused ESLint passed.

The separately owned [publication checks](phase02-publication.md) and
[custody/crash/runner checks](phase02-custody-runner.md) retain exact focused native
and Bun commands and their red/green evidence. They are composed here without
unnecessarily repeating unchanged focused checks. The repository-wide final gate,
CI, merge and release remain required after the remaining planned work converges.

Broad ledger statements remain open. In particular, the dependency model assumes
composition of qualified Store publications; arbitrary imported dependency graphs,
overlapping unfixed legacy writers, unlimited retries/crashes, hostile namespace
changes, exactly-once mailbox delivery and native OwnerLease clean-marker return
are not established by these results.
