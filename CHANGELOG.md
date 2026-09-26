# Changelog

Entries are seeded from the GitHub release notes for each tag
(`gh release view <tag>`); the release page remains the authoritative record,
including archive checksums and qualified source commits. Native semver stays
`0.2.0` across the `v0.2.0-vm.N` prereleases; the embedded build identity and
the installed package record distinguish them. The receipt `runtime.version`
wire constant (`0.1.0`) is independent of these package versions.

## Unreleased

- `algal experiment <config.json>` runs one cumulative-skill experiment arm
  over a bounded task set: `retained`, `ablation`, `fresh`, and `fixed`
  profiles share one code path, every generation, task, and promotion run
  charges to the arm's own `algal.habitat-budget.v1` account (activity
  `experiment`), and a refused reservation records the exhausted run instead
  of aborting the session. The retained arm consults a bounded
  `algal.experiment-catalog.v1` kept-procedure list before each task (a hit
  digest-resolves the kept manifest through the store) and promotes programs
  that pass every declared validation case through the ordinary foundry
  path; holdout cases are declared but never run. Each task writes a closed
  `algal.experiment-run.v1` record and the session writes
  `algal.experiment-session.v1`, both strict-parsed and digest-bearing.
- `algal replay`, `algal ordering`, and `algal process replay` run in the
  native runtime: the Rust CLI emits byte-identical
  `algal.replay-comparison.v1` and `algal.ordering-report.v1` records
  (verified in both directions through the parity fixtures), removes the
  previous explicit refusals, and charges ordering dispatches to the same
  `algal.habitat-budget.v1` account semantics as the TypeScript runtime.
- `--executor-profile isolated` runs `--executor-cmd`, shell commands in
  `--executors` maps, and `cmd:` bench specs under a declared isolation
  profile: the child's environment is reduced to a fixed set plus
  operator-named variables (`--executor-env` `NAME` inherits the host value
  at call time, `NAME=value` declares a digested fixed value), it starts in
  `--executor-cwd` (default `.`), and a fixed POSIX wrapper applies
  declared `ulimit` bounds before `exec` (`--executor-limits` with
  `cpuSeconds`, `fileSizeBlocks`, `openFiles`, `processes`,
  `addressSpaceKiB`, `stackKiB`, `noCore`; the default set is
  `cpuSeconds=60,noCore`, `none` clears it). A knob the platform cannot
  apply is refused at admission; the allowlist, working directory, declared
  limits, per-limit enforcement truth, and platform all feed the executor's
  recorded `configurationDigest`, so a weaker posture never shares a
  stronger profile's identity. SDK: `isolatedCommandExecutor`,
  `resolveIsolation`, `ISOLATION_BOUNDS`. Native parity is proposed, not
  implemented; tool-registry `cmd:` execs are not covered.
- `algal fmt <program.algal|dir> [more ...]` rewrites `.algal` source to one
  canonical layout: two-space indent, width 100, at most one blank line,
  dropped optional `;`, flat-when-it-fits groups with canonical trailing
  commas when broken, `match` and `as choice` always broken, `in` allowed
  values sorted the way the compiler sorts them, and comments preserved
  (line comments take their own line; same-line block comments stay inline).
  Formatting is input-independent, idempotent, and never changes the
  compiled manifest digest. `--check` exits 1 listing non-canonical files,
  `--write` rewrites in place reporting only changed files, and `--out`
  writes a single formatted file elsewhere. Directories scan for `.algal`
  files with bounded depth and no symlink traversal. The bundled source
  examples are formatted canonically. SDK: `formatSource`.
- `generate instruction using context as <field type>` declares a source
  generation's output type: a record (`as Reply`), a list (`as [Reply]`),
  a bounded number or integer, a closed choice (`as text in ["a", "b"]`),
  a text format, or any `json`. The agent cell's output contract is the
  type's compiled schema at its lowest enforcing schema version, the runtime
  checks the executor's output against it before downstream cells run, and
  the declared type types the value downstream, so record fields read
  directly and `match` covers allowed values. `as text` is the same contract
  as an undeclared `generate`.
- `decide` accepts all three provider question forms: `as noul` binds a keep
  probability as a plain number, `as score { "label", ... }` binds a scored
  decision exposing `score`, `confidence`, `probabilities`, and
  `probability(label)`, and `as choice { label: "criterion" }` is unchanged.
  Each form compiles to the matching `noul`, `score`, or `choice` decision
  question and a generated pure adapter validates the provider's answer
  (range, required members, every declared label's probability) before
  downstream cells can consume it.
- `algal vendor check <program.algal>` consults the catalog origin each
  vendored copy's `algal.vendor.v1` record names — under the same fetch
  limits as vendoring — and emits a digest-bearing `algal.vendor-check.v1`
  report: per directory, `unchanged`, `update-available`, `removed`, or
  `unreadable` (with the pinned and live page digests and a reason), every
  outcome a fact rather than an abort. `algal vendor update <dir> --into
  <dir>` re-vendors one copy's recorded entry and origin through the ordinary
  pipeline into a fresh directory and emits an `algal.vendor-update.v1`
  proposal naming the pin the lock holds and the pin a re-lock would write;
  it never edits a lock, never mutates or deletes the pinned copy, and refuses
  when the live page no longer lists the entry or its listed digests no longer
  match. `algal.registries.json` (`algal.registries.v1`, at most 16 names)
  lets `vendor --from` and `vendor check --from` resolve named catalog
  addresses, and `lock --registries` records the same map in the lock's
  optional, advisory `registries` field — parsed strictly, never verified,
  and byte-identical output when absent. `lock`, `verify`, `dependencies`,
  and `db` remain offline; only `vendor` subcommands fetch. SDK:
  `checkVendoredCatalogs`, `proposeVendorUpdate`, `parseVendorCheck`,
  `parseVendorUpdate`, `renderVendorCheck`, `vendorCheckToJson`,
  `vendorUpdateToJson`, `parseVendorRegistries`, `readVendorRegistries`,
  `vendorRegistryOrigin`, `catalogForOrigin`. Native parity is proposed, not
  implemented.
- `map`, `filter`, and `fold` transform lists inside pure expressions:
  `map over <item> in <list> using <expr>` returns the body's value per
  element in order, `filter` keeps each original element whose boolean body
  returns true, and `fold over <acc>, <item> in <list> from <init> using
  <expr>` folds left to right with the accumulator bound under `<acc>` (the
  two binder names must differ; the body must reproduce the widened `init`
  type — literal seeds widen to their kind). Binders shadow outer names only
  inside their `using` body, the list operand must be a typed list or `json`,
  effects are rejected inside bodies, and all three lower to the existing
  fuel-, size-, and byte-bounded `algal.expr.v1` operations.
- `algal envelope <program.algal|manifest.json>` writes an
  `algal.authority-envelope.v1` report: a static review of a manifest and its
  compiled child closure before any cell runs. Per capability class it lists
  every producer port (caller args, `fn`/`tool` mints, delegated child
  outputs, model-called tool results) marked live when a run could emit it,
  and every consumer channel — wired `tool`/`fn` inputs, `delegated` child
  interfaces, `context` disclosures, `data` copies, and model-declared tools —
  with a `can`/`cannot`/`unknown` verdict; `--capability` answers classes the
  program never declares. The `work` section composes per-occurrence
  invocation bounds (`each` items and `repeat` rounds multiply; products past
  the 65,536-cell receipt cap are `saturated`) with per-cell worst-case
  charges — activation, declared costs, fuel, retry attempts, turns, and byte
  ceilings — and clamps each dimension to the enforced ceiling: `maxSteps`,
  `maxAgentCalls`, or `maxWork` plus `activationCeiling`, the largest charge
  one activation can add before the next check. A runnable `spawn` cell marks
  the closure open and every bound `open`, and degrades verdicts for classes
  an admitted signature consumes to `unknown`. SDK:
  `createAuthorityEnvelope`, `parseAuthorityEnvelope`,
  `renderAuthorityEnvelope`. Native parity is proposed, not implemented.
- `algal db` builds and answers a program database: a derived, disposable
  structural index over the store (`program.db`, `bun:sqlite`) plus a
  limited declarative query surface. `algal db build` materializes
  manifests, cells, port maps, child-manifest links, receipts, per-cell
  outcomes and work, capability classes, process records and heads, slots,
  effects, application revisions/entrypoints/states/transitions/evaluations/
  operations/dispatches, a record-kind histogram, and skipped records under
  per-place file, byte, and row caps. `algal db query` composes whitelisted
  table/column/operator predicates (never raw SQL); canned projections cover
  `callers-of`, `revisions-for-executable`, `receipts-touching-capability`,
  `unevaluated-revisions`, `largest-work`, `process-status`, and `kinds`.
  `algal db status` reports index-versus-store drift per place and exits 1
  when stale. Unreadable or foreign records are counted and skipped, never
  fatal. See `docs/program-database.md`. Native CLI support is proposed, not
  shipped.
- `algal observe --dir <store>` prints one read-only snapshot of live store
  state: every process (status, generation, manifest and head digests), each
  mailbox's pending deliveries and counts, capability records, host events,
  application heads, stored habitat accounts and schedules, and a
  digest-ordered tail of run receipts. Every listing carries an explicit
  `total` and `truncated` flag; malformed records count toward `unreadable`
  and foreign layout entries toward `foreign` instead of aborting the read.
  A confirm pass re-reads each emitted pointer, so a snapshot that straddled
  a transition reports `consistent: false`. `algal observe --follow` (alias
  `algal tail`) streams each change as a canonical JSON line in a fixed
  section order, bounded by `--interval-ms`, `--max-polls`, and
  `--max-events`; emitted lines carry no wall-clock fields. Native Rust
  support is proposed, not shipped.
- `schemaVersion: 3` extends the bounded JSON schema subset with whole
  numbers over the exact JSON range (`"type":"integer"` now also bounds a
  version 3 value to ±9,007,199,254,740,991), `minLength`/`maxLength` counted
  in Unicode code points, fixed `format` names (`digest`, `name`, `slug`,
  `uri`), `uniqueItems` with canonical equality, and
  `additionalProperties: false` for records closed to undeclared fields.
  Both runtimes share the same declaration rules, check order, and failure
  messages, and a runtime that predates version 3 refuses the declaration
  before any step runs. The source compiler (`algal.source.profile.v1`
  version `1.6.0`) adds matching syntax: `integer`, `text min`/`max` length
  bounds, the four format types, `[type] unique`, and `closed record`.
  Programs written before this syntax compile to byte-identical manifests.
- Counterfactual replay and ordering exploration: `algal replay <receipt>
  --with <manifest>` and `algal process replay <name> --with <manifest>` run a
  revised manifest against a recorded run's evidence — recorded effects answer
  while the trace matches, admitted live executors take over after divergence —
  and emit a bounded `algal.replay-comparison.v1` record with the reproduced
  prefix, first divergent cell, and an `identical`/`diverged`/
  `could-not-replay` verdict. `algal ordering <scenario.json>` enumerates
  bounded mailbox/dispatch orderings of an `algal.ordering-scenario.v1`
  durable-process setup under a shared habitat budget, evaluates an
  `algal.expr.v1` invariant per terminal state, and emits an
  `algal.ordering-report.v1` with each ordering's outcome, the first
  counterexample witness, and explicit exhaustion. Both are TypeScript-only;
  the native CLI accepts the commands and refuses them explicitly.
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
- `algal dependencies --application <name> --episodes` also follows each
  settled `start-episode` dispatch in the application's committed history
  through its result, `algal.episode-outcome.v2` record, and run receipt, and
  counts that receipt's recorded invocations against every occurrence whose
  digest the episode's program contains, matched by digest alone. Each
  counted row shows the dispatch index, the call site inside the episode's
  program, the recorded count, and the site's static invocation bound, marked
  `exceeded` when the count is above it. Settled dispatches appear under
  `application.episodes.dispatches`; unreadable intents, dispatch, result,
  outcome, and receipt records are counted rather than guessed, and
  unresolved recorded cells are reported. The join keeps the latest 64
  settled dispatches and 16 count rows per occurrence and counts the rest as
  omitted.
- `algal library compare --intended <declaration.json>` lets a revision
  declare the exact case results it changes: the declaration lists the case
  identifiers (`set:entry#name`) expected to change, sorted and unique, with
  a reason of `corrected`, `extended`, or `restricted`. The comparison passes
  only when the declared list equals the observed `changed` list exactly, and
  the `algal.library-comparison.v1` record carries the declaration under
  `intended`, so `--verify` needs the same file to match such a record.
  Without a declaration, any changed case fails as before.
- Catalog entries may pin an optional `Evidence` field: record files under
  `examples/source/projects` named with the digest of their canonical JSON.
  The catalog test reads each pinned record; a comparison must have passed
  and must end the entry's listed digest or move it there as a dependent.
  Records that cannot be read, parsed, or justified, and record kinds the
  check does not know, are problems rather than passes. Entries without the
  field are unchanged.
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
  field keep their digests. Both CLIs add `foundry schedule` and
  `foundry schedule-verify`: several foundry and search configs share one
  account in round-robin order, recorded as `algal.habitat-schedule.v1`, and
  `--journal <dir>` resumes an interrupted schedule from its stored receipts
  and refuses entries that do not match them. Both runtimes write identical
  schedule and journal bytes.
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
- `algal vendor <catalog> --entry <path> --into <dir>` copies a shared-catalog
  entry, with every entry it depends on, from a catalog page (an https URL or a
  local path) into a new directory of a project. It refuses the copy unless
  each file compiles to the executable and interface digests the page lists,
  and writes an `algal.vendor.v1` record of the page's address and digest and
  each file's digests. Requests stay on the page's host over https, with
  same-host redirects only, 128 KiB for the page, 64 KiB per file, 16 files,
  and 15 seconds per request; writing follows no symlink and replaces no file.
  `algal lock` pins each vendored directory in an optional `vendored` section
  of `algal.source-lock.v1`, so existing locks keep their digest, and
  `lock --verify` checks the copies offline against their records and the
  catalog's digests, reporting `vendor` drift after `evaluation`.
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
- IndexedDB durable drivers for browser hosts: `IndexedDbMailboxService` and
  `IndexedDbHostEventService` run the existing `algal.mailbox.v1`,
  capability, message, delivery, `algal.host-event.v1`, and
  `algal.host-delivery.v1` wire records in IndexedDB. Rows are
  canonical-JSON envelopes with content digests; every atomic transition
  commits inside one readwrite transaction under the strict durability hint
  (fail closed when the engine cannot report it), and serialized readwrite
  transactions across connections and tabs replace the file drivers' leases
  and locks. Same observable semantics: idempotent sends and event
  admission, immutable-conflict `DIGEST_MISMATCH`, pending/consumed delivery
  dedupe, capability checks, every documented bound, `EFFECT_SUSPENDED`,
  durable sending-intent before mailbox acknowledgement, and bounded `poll`.
  Quota failures surface as `BUDGET_EXHAUSTED`; other engine failures as
  `IO_FAILED` without touching retained data. Browser-safe package subpaths
  `mailbox-core`, `mailbox-idb`, `host-events-core`, `host-events-idb` share
  the wire layer extracted from `mailbox.ts`/`host-events.ts`; a real
  Chromium qualification fixture covers reopen, revocation, delivery, and a
  peer-tab handoff. SDK: `IndexedDbMailboxService`, `IndexedDbHostEventService`,
  `MAILBOX_IDB_NAME`, `HOST_EVENTS_IDB_NAME`.

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
