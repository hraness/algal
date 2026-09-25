# Changelog

Entries are seeded from the GitHub release notes for each tag
(`gh release view <tag>`); the release page remains the authoritative record,
including archive checksums and qualified source commits. Native semver stays
`0.2.0` across the `v0.2.0-vm.N` prereleases; the embedded build identity and
the installed package record distinguish them. The receipt `runtime.version`
wire constant (`0.1.0`) is independent of these package versions.

## Unreleased

- Public copy adopts the canonical portfolio messaging record: the site
  title, hero, footer, social card, `llms.txt` introduction, README lead,
  both CLI introductions, and the package and crate descriptions now carry
  the same tagline and description lines.
- `algal dependencies --estimate` gives every call and module a minimum and
  maximum number of runs per run of the entry: enclosing `each` item limits
  multiply, a call under a branch arm has a minimum of 0, and products above
  65,536 saturate. With `--receipt`, recorded invocations appear beside each
  bound, and any occurrence recorded above its maximum is listed as
  `exceeded`. `--application <name> [--dir <path>]` links each module and call,
  by executable digest, to the application revision entrypoints whose recorded
  closure contains it, with the transition that activated each revision and
  the evaluation records that measured it. The join reads validated history,
  commits nothing, and reports verdicts as recorded without replay; unreadable,
  unbound, foreign, and unresolved records are counted instead of linked. It
  reads at most 4,096 records and keeps the latest 64 entrypoints. Reports
  without the new flags are unchanged.
- Package subpaths `./source` and `./source-errors` let a browser bundle
  compile `.algal` source. `compileSource` takes every source file as a
  string, and `createSourceErrorReport` and `renderSourceError` format its
  errors. Before compiling, a browser host instantiates `./algal_expr.wasm`
  and passes its exports to `setExprExports` from `./expr`.
  `loadSourceProject` reads files and remains on the root entry. Source byte
  limits no longer use `Buffer`: an unpaired UTF-16 surrogate counts as the
  three bytes `TextEncoder` writes for it (U+FFFD), where Bun's
  `Buffer.byteLength` counted two.
- `scripts/measure-source-scaling.ts` measures compile, bundle, and run cost
  for every example source project and for generated projects that share
  helpers, growing each until compilation refuses it on the instance, cell,
  edge, manifest byte, import depth, or executor attempt limit, and records
  where and after how much of the expansion it stopped.
  `scripts/measure-history-scaling.ts` measures Browser Tasks history
  verification separately as history approaches its transfer limits.
  `docs/scale-measurements.md` publishes the results, and
  `scripts/source-scaling.test.ts` fails when a published count stops matching
  the compiler. Compiler and runtime behavior are unchanged.
- Foundry configs accept an optional habitat budget, `budget: {work, attempts,
  runs}`, that covers every run of the activity: the generator, each
  candidate's cases, and holdout. An `algal.habitat-budget.v1` account reserves
  each run's declared `maxWork` and `maxAgentCalls` before it starts and charges
  the work and executor attempts its receipt records, including losing
  candidates, failed runs, and retries. The first run that does not fit stops
  the foundry, which writes the exhausted account instead of a report and exits
  with status 1; a complete foundry embeds the account in its report.
  `foundry verify` checks either file, and both runtimes write identical bytes.
- `foundry search` accepts the habitat budget: one `search` account covers
  every generation's generator and candidate runs and the final epoch. The
  first run that does not fit stops the search, which writes the exhausted
  account instead of a report and exits with status 1; `foundry search-verify`
  checks either file, and both runtimes write identical bytes. Application
  evaluations can charge an `experiment` account the host supplies (native:
  `application evaluate --budget <file>`), and an experiment may cite the
  stored account as `budget`; evaluation records and experiments without the
  field keep their digests. The TypeScript CLI adds `foundry schedule` and
  `foundry schedule-verify`: several foundry and search configs share one
  account in round-robin order, recorded as `algal.habitat-schedule.v1`, and
  `--journal <dir>` resumes an interrupted schedule from its stored receipts
  and refuses entries that do not match them. The native CLI refuses
  schedules with status 2.
- Source record types: `record Task { id: text, urgency: number, notes: text? }`
  declares fields for a parameter or result. A record compiles to a `json` port
  with a schema in the existing subset, which both runtimes check where a value
  enters or leaves a program; the compiler also rejects mismatches it can prove.
  Compiler version 1.4.0; existing programs compile to the same manifests. The
  `typed-tasks` example scores a task list and rejects a malformed task.
- A `json` port or JSON output contract may carry `"schemaVersion": 2` beside
  its schema. Version 2 makes both runtimes check `items`, `enum` (1 to 32
  distinct scalar values), `minimum`, and `maximum`, which were provider
  hints, and rejects every other keyword; nesting is limited to 8 levels and
  `required` and `properties` to 64 names each. Schemas without the key keep
  their bytes, digests, and version 1 checks, and runtimes that predate
  version 2 refuse a manifest with the key at admission, before any cell runs.
- Source record fields and list items accept `[Task]` (a list whose items all
  have one type, also as a parameter or result type), `text in ["open",
  "done"]` or `number in [1, 2, 3]` (allowed values; allowed text values form
  a closed choice that `match` must cover exactly), `number min 0 max 5`
  (inclusive bounds, either optional), and records nested up to the
  eight-level schema limit. The compiler rejects mismatches it can prove and
  adds schema version 2 only where a schema needs it, so earlier programs
  compile to the same manifests. Compiler version 1.5.0. Bounds: 16 allowed
  values of at most 64 characters and 64 KiB per compiled record or list
  schema. The `typed-tasks` example gains a plan that checks a task list
  before scoring it.
- Native `each` checks each item against the child's input type before that
  item's run, and reports a non-list or oversized list with the reference
  runtime's messages, so a rejected item yields the same receipt in both
  runtimes. Earlier native receipts that recorded such a failure under
  `<each>/i<n>/input` need their original binary to replay.
- A shared program catalog (`docs/library.md`) lists pure programs called from
  more than one project, each with its path, executable and interface digests,
  interface, rejected inputs, limits, callers, compiler, maintainer, and
  status. `src/library-index.test.ts` recompiles every entry and calling
  project and fails when the page drifts. A separate `support-queue` project
  reuses the task planner's `score_task.algal` and `lib/clamp.algal` through
  `--source-root`, with native parity coverage.
- Shared program catalog revisions: `algal library compare <name>
  <revision.algal>` compiles a proposed revision of a listed program, runs each
  calling entry point's case list and the entry's unseen cases against both
  versions in memory with scripted responses, and writes an
  `algal.library-comparison.v1` record that names any interface change,
  changed case, or case that could not run (exit 1 when it does not pass). An
  entry pins the digest of an unseen case file kept outside the repository;
  the comparison refuses a file with another digest, and `library unseen`
  prints the digest to pin. The catalog test accepts a changed digest only
  when the entry's status names a passing record that starts from the
  previous digest and ends at the new one; `--verify` checks a record's case
  results by running the comparison again. The task planner's inspector and
  the support queue gain case lists. SDK: `compareLibraryRevision`,
  `verifyLibraryComparison`.
- `algal lock --evaluation <cases.json>` pins evaluation cases in an optional
  `evaluation` section of `algal.source-lock.v1`: the digests of each case's
  argument and scripted-response files, the run outcome, and a digest of the
  program's declared outputs. `lock --verify --evaluate` runs the cases again
  in memory with scripted responses only and reports `evaluation` drift.
  `--versions <labels.json>` adds labels for exact closure digests; a label
  whose digest leaves the recompiled closure reports `version` drift and is
  never moved. Both sections are optional, so existing locks keep their digest.
- Browser Tasks checks saved workflow evaluations in the same history replay
  that checks its saved operations, instead of giving each evaluation its own
  replay, while history and evaluations together fit the 1,024-record and
  8 MiB transfer limits. With 16 tasks and 16 saved evaluations, one
  instrumented in-memory edit replayed the history 6 times instead of 22, with
  identical states, captures, transfers, and writes. Each of those checks
  rereads every saved evaluation, so an operation fails if one disappears or
  changes after an earlier check in it. Adds
  `scripts/triage-history-performance.ts`. This reduces verification work; no
  latency change is claimed.
- Package subpaths `./decisions`, `./effects`, `./digest`, `./values`, `./errors`
  and `./store-contract` expose the browser-clean decision and effect contract
  modules to consumers that bundle ALGAL for the browser; the root entry still
  targets Bun.
- Site: `docs/model-router.md` joins the documentation shelf and `llms.txt`, so
  hraness.com/prompting and the README can link the router doc on the site.
- `algal dependencies` and `createSourceDependencyReport` report a source
  project's files, executable modules, static call occurrences with caller
  locations, and direct and transitive model effects, and can check a bundle
  against the recompiled closure. The report is presentation-only and outside
  executable identity.
- `algal dependencies --receipt` attributes a recorded run to the static
  report: invocations, recorded cells by status, effect cells, and self and
  inclusive work per occurrence, with unattributable paths counted rather than
  guessed and a `reconciled` flag naming any failed consistency rule. The join
  is digest-bound, not replay.
- `algal lock` writes an `algal.source-lock.v1` record pinning a source
  project's source and executable digests, compiler identity, closure, and
  interface digests; `lock --verify` recompiles offline and reports drift by
  kind with exit code 1. No network, install scripts, or upgrades.
- The task-planning project gains a second entry, `inspect_task.algal`, that
  reuses the scoring and clamp programs under identical digests, with runtime
  failure examples and native parity coverage.
- Application evaluation can opt into `composition: "closed-pure-v1"` to
  check and run stored pure subprograms in both runtimes. Existing policies
  keep their flat-program behavior; generated proposals remain flat.
- Browser Tasks shares verification within unchanged read phases while
  rereading published records after changes. Adds synthetic performance
  diagnostics and regressions for missing evidence at an unchanged head.
- A six-file task planner demonstrates pure code reuse, dependency change
  propagation, portable bundles, and separate policy/presentation modules.
  The larger-program guide covers architecture and standard-library design.
- `examples/model-router.algal.json` ships generation 1 of the fitted head: a
  prior-anchored update of the September 22 fit on the 84 labeled September
  2026 first prompts (cross-validated AUC 0.64 against 0.63 for the parent on
  the same window). `docs/model-router.md` records both generations and why
  neither a September-only fit nor a full-corpus fit is shipped.
- Docs: `docs/vision.md` links to the Hraness essay “The thread through
  hraness”, which places ALGAL among the other Hraness projects.
- Docs: `docs/vision.md` states the project thesis (software that
  accumulates competence), the four design properties that make it testable,
  and the cumulative-skill experiment that would justify it; `docs/lineage.md`
  places ALGAL among Lisp, Emacs, Smalltalk, Urbit, Engelbart, and the
  research on evolving programs. The README, site home page, docs shelf,
  `llms.txt`, and a blog post link to both.
- Launch polish: the TypeScript package is `@hraness/algal` 0.2.0 and states
  that it is Bun-only; test files and fixtures are excluded from the npm
  tarball; repository, homepage, and bug-tracker metadata added.
- Both CLIs reject `--gateway-model` without a credential before running and
  explain `EFFECT_UNBOUND` failures on stderr (requested route, admitted
  executors) without changing receipt bytes.
- `suite` resolves bundled transports relative to the examples directory's
  parent in both runtimes; the native CLI names the missing examples path.
- Native CLI: one-line help on every subcommand and option, input errors
  name the path, `.algal` source files point at `bun cli.ts compile`.
- Both CLIs warn on stderr when a credential falls back to the plaintext file
  store; exit codes follow one rule (0 success, 1 negative result, 2 could
  not run); the Bun CLI names an unknown command.
- Docs: SDK imports use `@hraness/algal`, site anchors link `/tour/`,
  SECURITY.md is advisory-only and names executor/tool config as trusted
  input, and this changelog exists.
- Milestone-6 verification: the adaptive-inventory example's test now asserts
  the documented evidence counts, host-process identities, per-inhabitant
  zero model-call budgets, emitted artifact names, passive report markers,
  evidence truncation flags, and the SHA-256 executable pin; the npm tarball
  also excludes colocated test files under `examples/`; the README's
  `algal application` subcommand list now includes `propose`,
  `verify-proposal`, and `select`; the programmable-applications milestone
  record marks the packaged surfaces, native workbench, and second
  application as existing.

## v0.2.0-vm.9 — 2026-09-20

ALGAL VM9: bounded execution and shared design.

- Recursive compilation shares limits across child occurrences: 1,024 manifest
  instances, 4,096 cells, 16,384 edges, 64 MiB normalized manifest bytes.
- Handled failures consume work before recovery effects can execute, matching
  the native runtime.
- Local transport/process inputs reject non-regular files before reading; the
  Bun HTTP transport bounds streamed bytes and body lifetime with strict UTF-8
  admission.
- Initialized host leases avoid redundant bootstrap writes before taking
  custody in both runtimes; incompatible database state is rejected.
- The site adopts the shared Hraness design system.

## v0.2.0-vm.8 — 2026-09-20

Stricter admission, safer retained-state reads, race-safe mailbox creation,
and less repeated evidence serialization.

- Malformed schema declarations are rejected before dispatch; the 1 MiB
  manifest limit applies to raw and normalized documents.
- FIFOs, devices, and symlinked retained state are refused without hanging.
- Mailbox names, exact bounds, and the 1,024-mailbox capacity are admitted
  under shared Bun/native custody; oversized retained messages are rejected
  before a delivery is consumed.
- Source-level compile errors and runtime diagnostics carry exact file spans,
  import frames, structured JSON reports, and nested execution diagrams.
- Opt-in deterministic context elision bounds what the next model call
  receives while retaining complete tool evidence (a byte policy, not a token
  or billing guarantee).
- Upgrade boundary: concurrent mailbox creators sharing a store must all
  implement this release's admission ABI.

## v0.2.0-vm.7 — 2026-09-20

Retain a real on-device model decision, stop for human review, and finish
later with the model disconnected.

- Private change brief: an optional graph asks Apple Foundation Models for a
  bounded summary and holds the exact result for approval or denial.
- One dispatch per Apple effect; a lost response remains uncertain.
- Bun and native enforce the same recursive schema subset and choose failure
  diagnostics in deterministic property order.
- A blocked process retains the original executor error in its diagnostic
  without manufacturing a settled receipt.

## v0.2.0-vm.6 — 2026-09-20

Native workbench and crash laboratory.

- `algal demo start ./my-review` produces `report.html` with the exact
  approval or denial command; no Bun, Cargo, checkout, credentials, or web
  server needed to run it.
- `algal demo prove ./crash-laboratory` kills and joins its own VM child at a
  durable journal barrier; reads recover without repeating the completed
  prefix write, uncertain writes stay blocked.
- Portable evidence export and verification without the source store.
- `doctor` reports build identity; packaging rejects stale binaries.

## v0.2.0-vm.5 — 2026-09-20

Portable process evidence: a process history can be checked on another
machine from one bounded JSON file with the standalone native executable.
Verification admits no live adapter and creates no runnable process.

## v0.2.0-vm.4 — 2026-09-20

Explicit recovery of a coding result whose acknowledgement was lost:
`job prepare-operation` and `job reconcile`, immutable bounded observations,
and read-only reconciliation that never resubmits the coding task. Includes
selected-branch generation and source-annotated execution diagrams.

## v0.2.0-vm.3 — 2026-09-19

Coding repair as a durable, inspectable VM workload, plus installable native
process-kernel packages for Ubuntu 24.04 x86_64 and macOS 14+ Apple silicon.
Dispatched deadlines, interrupted responses, and unknown coding outcomes
remain uncertain; no automatic push, merge, or provider retry.

## v0.2.0-vm.2 — 2026-09-19

Explicit crash recovery across Bun and the Rust VM (ordered effect journals,
exact-intent recovery, SQLite custody that survives process death) and a
read-only PR/CI shepherd. Fixes an early-stdin-close race in both runtimes.
Source only; no packages published.

## v0.2.0-vm.1 — 2026-09-19

Source preview of the ALGAL process VM: bounded typed agent programs that
persist their identity and history, exit, and resume from verified
checkpoints in either runtime, with a cross-runtime release-review
demonstration. Source only.
