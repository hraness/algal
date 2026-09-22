# Contents

- `src/` — the contract (`contract.ts`, `graph.ts`), the scheduler (`run.ts`),
  the effect seam (`effects.ts`), the store (`store.ts`), verification
  (`verify.ts`), Vercel AI Gateway execution (`gateway.ts`), typed external
  tools (`tools.ts`), opaque capability handles (`capabilities.ts`) and the
  bounded durable mailbox driver (`mailbox.ts`), the named durable process
  supervisor (`process.ts`), the provider-neutral
  typed-decision layer (`decisions.ts`) with the TypeSafe Jev adapter
  (`jev.ts`), cross-platform
  credential custody (`credentials.ts`), embeddings (`embeddings.ts`) and
  the derived semantic index plus recall executor (`semantic.ts`), foundry
  evaluation and search (`foundry.ts`, `search.ts`), benchmark comparison (`bench.ts`,
  `bench-verify.ts`), bundles (`bundle.ts`), transports (`transport.ts`),
  the `algal.expr.v1` WASM loader (`expr.ts` + committed `algal_expr.wasm`),
  canonical values and digests, and colocated tests.
- `crates/algal-expr/` — the one expression evaluator (Rust): linked into
  the kernel as an rlib and compiled to `wasm32-unknown-unknown` for Bun.
  `scripts/build-expr-wasm.sh` rebuilds `src/algal_expr.wasm` (needs a
  rustup toolchain with the wasm target; pins `RUSTC` past Homebrew).
- `cli.ts` — the Bun CLI (`run`, `check`, `verify`, `resume`, `inspect`,
  `explain`, `diff`, `foundry`, `bench`, `runs`, `digest`, `store`,
  `manifests`, `manifest`, `slots`, `slot`, `mailbox`, `process`, `pack`, `unpack`,
  `example`, `suite`, `index`, `search`, `auth`, `doctor`).
- `index.ts` — the package's public surface.
- `examples/` — bundled manifests and scripted responses used by `suite`.
- `spec/v1/organism.md`, `spec/v1/expr.md`, `spec/v1/foundry.md`,
  `spec/v1/search.md`, `spec/v1/bench.md`, `spec/v1/process.md` — authoritative
  contract prose, including the bounded durable process filesystem ABI.
- `site/` — the static algal.dev source; `build.ts` writes `site/dist`.
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md` — the public contract.

# Guidelines

- Bun 1.3.x, strict TypeScript, zero required runtime dependencies. Shared
  foundations attach through the `Store` and `Executor` seams; do not add a
  package dependency for something the contract can express.
- Parse foreign values from `unknown` and reject unknown keys. Model invalid
  states out rather than checking them late.
- The manifest is data and carries no host code. `fn` cells resolve against
  the host registry; agent cells resolve against an executor the host
  supplies; `expr` cells carry bounded `algal.expr.v1` programs that the
  contract-owned evaluator (`crates/algal-expr`, one implementation for
  both runtimes) interprets under fuel — data, not executables.
- Receipts contain no wall-clock fields. `verify` must replay a run
  bit-for-bit; keep nondeterminism at the executor boundary only.
- `cap` ports carry host-admitted authority. Keep capability classes exact,
  reject widening to `json`, never let manifests mint handles with `const`,
  and make every mutable driver idempotent and replay-safe.
- Bound every count, byte size, depth, and list. New contract fields need a
  bound and a test.
- Colocate tests with source (`src/*.test.ts`); cover failure modes with a
  deterministic example, not a mock-heavy harness.
- Keep the public surfaces honest: README claims match what `bun run check`
  and the tests actually prove; mark proposals as proposals.

# ALGAL native migration

- The product is ALGAL; all wire identifiers are `algal.*.v1` and manifest
  fixtures use `*.algal.json`. There is no compatibility surface for older
  naming.
- `crates/algal/` is the Rust kernel, native CLI, memory/context primitives,
  and ACP boundary. Keep the TypeScript runtime independently runnable as the
  reference implementation. No implicit native-to-Bun fallback.
- Native checks: `cargo test --workspace --locked`,
  `cargo clippy --workspace --all-targets --locked -- -D warnings`, and
  `cargo fmt --all -- --check`. Use `cargo build --locked` followed by
  `bun scripts/native-parity.ts` to compare all 44 existing examples and verify
  receipts in both directions between TypeScript and Rust, and
  `bun scripts/application-parity.ts` to replay the durable application
  lifecycle (create/commit including activate and migrate transitions,
  dispatch/reconcile, memory scope/observe/snapshot/query, and the
  `algal.application-host.v1` policy host) through both runtimes with
  identical digests, and `bun scripts/process-parity.ts` for the durable
  process lifecycle (create/inspect/list/tick/verify/schedule, the mailbox
  suspension/wake chain with shared capability records, uncertain-intent
  recovery through `recover`/`journal`, and the `.creating.json`
  interrupted-creation recovery contract).
- The Foundation Models bridge comes from the pinned `apple-foundation`
  crate (`hraness/apple-foundation`); `sh scripts/build-apple.sh` emits its
  embedded source and builds it with Xcode 26 on Apple Silicon, and the
  default `algal-apple` sibling auto-builds on first use.
  `target/debug/algal doctor --apple` checks availability; compilation alone
  is not evidence that inference works.
- xcb is the current repository for AgentMixer. It owns subscription custody
  and settled failover. Never recreate credential copying in ALGAL or treat
  ACP/cwd as OS isolation. Delegated coding tasks are non-cacheable and must
  not be automatically retried after uncertain completion.
- Canonical receipts are execution evidence, not truth or provider attestation.
  Memory query proofs are positive derivations from explicitly selected facts.
  Compaction preserves sources; byte reduction is not a token/billing claim.

<!-- oompa-local-efficiency:start -->
- Treat the user's request to change this repository as standing authorization for routine task-owned commits, pushes, pull requests, merges, releases, deployments, and production verification after the gates applicable to that action pass. Do not ask for duplicate confirmation. Build confidence through relevant automated checks, bounded diagnostics, and independent review, not another human approval. Passing checks does not expand task scope or authority.
- Prefer agentic service provisioning for new infrastructure. Check Vercel Marketplace for a native product that can provision the required resource first; use Stripe Projects as a supported alternative when it better covers the service or the Marketplace route only connects an existing account. Verify the current catalog, account, region, plan, recurring cost and resource capabilities before selecting a route. Prefer supported provider CLIs or APIs over browser-only setup when neither catalog fits, and explain the concrete exception. Reuse existing owner-controlled resources where appropriate; this preference alone does not authorize migrations, duplicate accounts, paid upgrades or wider access. Continue setup already authorized by the task and budget without duplicate confirmation. Keep provider credentials and generated environment files private, complete required interactive authentication, and verify deployment, persistence and recovery separately from successful provisioning.
- Separate artifact admission from live qualification and operational activation. Use applicable automated source, security, package/install, and provenance evidence for artifact admission; live provider qualification is not a universal publication prerequisite. Preserve explicit live acceptance criteria and require relevant live evidence for claims that depend on it. If publication or an artifact's install, upgrade, or default-use path activates risky unqualified behavior, keep that behavior guarded or disabled, or obtain bounded relevant evidence before shipping or activation.
- Use the repository's documented delivery workflow and preserve the identity, target, capacity, migration, and recovery guards applicable to operational activation. Replace an obsolete gate through a reviewed source and policy change with corresponding tests, never an ad hoc skip. Preserve every runtime-enforced approval, access control, branch protection, environment rule, safety policy, and required final gate. Ask for user input only when delivery needs a material product decision, missing credentials or authority, unavoidable interactive authentication, an irreversibly destructive action outside task scope, or resolution of a failure that cannot be handled safely and autonomously.
- Preserve production and user data throughout delivery. Inspect the exact account, environment, deployment, and data target before writes. For data changes, inspect a dry run or equivalent migration plan and validate the recovery path before any effect that could lose or corrupt data. Prefer additive, backward-compatible migrations and bounded batches. Record mutation intent, use idempotency or conditional writes, and reconcile uncertain results before retrying. Verify deployed identity, health, and relevant data invariants after delivery. Routine delivery never authorizes resetting, truncating, dropping, or overwriting user data; stop the unsafe operation if preservation or recovery cannot be established.
- Prefer short-lived repository workload identities such as OIDC trusted publishing, GitHub Apps, and narrowly scoped machine identities. Use unattended stable publication and production promotion when supported by the provider and repository. Establish supported machine authority once and verify it with a non-publishing preflight where available; routine releases should not require recurring interactive authentication or conversational approval. Retain account two-factor authentication and provider controls, including required authentication for approval of an exact staged artifact; do not add long-lived personal tokens to eliminate an interactive prompt.
- Keep delivery gates proportional to the failure they prevent. Prefer required checks on the current integration candidate, independent agent review, and atomic or conditional integration. Add a merge queue or another approval stage only for a demonstrated coordination or safety need. Replace redundant queues, serial waits, and duplicate checks through reviewed policy changes while retaining evidence for the integrated result.
- Preserve useful reasoning fan-out, but avoid unnecessary checkout fan-out. Prefer subagents in the current task for bounded research, review, diagnosis, and focused checks when they can safely share one working tree; create a separate task or worktree only for independently deliverable divergent edits, an isolated verification tree, or a different execution environment.
- Give each expensive focused validation command and external wait one owner. The integration owner reviews that evidence and runs the repository-required aggregate or final gate once after convergence. Reuse evidence only for the exact Git tree, command, lockfiles, toolchain, relevant environment, and validity period, and never to skip a required final integration, merge, release, deployment, or production-verification gate.
- On Hraness development machines, use `$oompa-local-efficiency` and the installed host scheduler for heavyweight top-level commands when available. Keep ordinary work in the compute lane; give authenticated browser/dev-server/Chromium work one `browser-auth` owner and Mac-only validation one `mac-native` owner.
- When a CI or policy gate scans complete Git history, check out the exact governed SHA and fetch only the fully qualified governed refs before scanning. Preserve the complete-history gate and reject unexpected refs instead of importing unrelated concurrent heads.
- At closeout, record applicable branch, PR, check, merge, release, deployment, and production evidence. Archive only conclusively finished tasks, never from silence alone, and reclaim only freshly revalidated clean merged worktrees through the guarded exact-path flow.
<!-- oompa-local-efficiency:end -->

<!-- algal-skills:start -->
## ALGAL skills

- Prefer the globally installed `algal-*` skills for bounded git state, diffs, repository survey/search, test and release gates, CI polling, and web fetches instead of repeated raw tool output.
- At session start, if the `algal` skill is unavailable, install the current skill pack for Claude Code, Codex, and Devin for Terminal with `bunx skills add 0thernet/algal-skills --global --agent claude-code codex devin --skill '*' --copy --yes`.
- Confirm installation with `bunx skills list --global`. If Bun or network access is unavailable, continue with repository-native tools instead of blocking delivery.
- Treat ALGAL receipts as execution evidence, not provider attestation, and preserve the repository's normal verification and release gates.
<!-- algal-skills:end -->
