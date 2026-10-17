# Event-loop P1 pure-effect edge evidence

In the proposed `algal.event-loop.trace.v1` contract, an accepted fast transition has `effects.requested: 0`, `effects.settled: 0`, and `effects.receipts: []`. Notifications are data, and pending requests do not establish an external call. The shape parser still distinguishes a nonzero request within its general 0-to-64 count range from a count outside that range. Neither range allows a completed effect in this version.

The [replay vectors](../../scripts/event-loop-pure-effect-vectors.ts) derive a one-entry control from the echo behavior and repair its output digest and expression fuel before replay. Each damaged trace has a fresh root digest. The [colocated test](../../src/event-loop-pure-effects.test.ts) restores the original effect fields to show that the mutation was isolated, checks the control through shape parsing, structural joining, and replay, then checks all three entry points' refusal codes. The [parity script](../../scripts/event-loop-pure-effects-parity.ts) compares TypeScript and Rust replay results, including the control's digest and summary.

| Changed claim | Refusal with the accepted zero control |
| --- | --- |
| Request 1 or 64 effects | `EVENT_LOOP_SEMANTIC` |
| Request 65 effects | `EVENT_LOOP_BOUNDS` |
| Settle 1 or 65 effects with zero requested | `EVENT_LOOP_BOUNDS` |
| Claim one or 65 valid digest strings with zero settled | `EVENT_LOOP_BOUNDS` |
| Request, settle, and list matching sets of 1 or 64 | `EVENT_LOOP_SEMANTIC` |

Agent-decided, owner may revisit: the three **E₀** cells in the [P1 matrix](event-loop-p1-matrix.md) record the accepted zero or empty control and first nonzero refusal at shape, structural, and replay scope. The v1 maximum is zero or an empty list, not an untested nonzero upper edge. A nonzero successful control would require new semantics, not another P1 fixture. These checks do not observe delivery, provider execution, or host publication. They also do not establish that the whole P1 contract is ready to merge.

## Local verification snapshot, 2026-10-15

On the unpublished worktree at `d64d3c14bf8513a02beb6b607230d024d830004b`, 65 focused event-loop tests passed (1,651 assertions), as did all 12 event-loop parity scripts, focused Cargo event-loop tests, TypeScript typecheck, lint, docs check, site build, Cargo Clippy, format and build checks, and native parity. Tracked diff and the 11 untracked files' trailing whitespace and final newlines passed inspection. `bun run check` timed out at 600 seconds after a vendor-catalog loopback `EADDRINUSE`; `cargo test --workspace --locked` failed because both HTTP tests could not bind loopback (`PermissionDenied`). The aggregate gates are not green. Final-head Required and affirmative independent review have not been established for these local files. Keep draft PR #278 unmerged.
