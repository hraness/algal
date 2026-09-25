use algal::{
    Error, Result, application, application_adaptation, application_comparison,
    application_experiment,
    application_host::{DomainDispatcher, PolicyHost},
    application_memory::{self as app_memory, MemoryService, NativeEngine},
    application_migration, application_proposal, application_selection, application_view,
    canonical::{MAX_DOCUMENT_BYTES, canonical, digest_bytes, read_json},
    context,
    contract::{Manifest, object},
    effects::{Backend, Host, ResponseFormat},
    graph::{Transports, compile, interface_signature},
    mailbox::{self, MailboxService},
    memory,
    process::ProcessService,
    runtime,
    store::{Store, pack, unpack},
};
use clap::{Args, Parser, Subcommand};
use serde_json::{Value, json};
use std::{
    io::{self, IsTerminal},
    path::{Path, PathBuf},
};

/// Reject-all admission used when no `--policy` record is supplied; read-only
/// commands still work, every trusted boundary denies.
struct NoAdmission;

impl application::Admission for NoAdmission {
    fn admit_commit(&self, _: &application::CommitContext) -> Result<()> {
        Err(Error::new(
            "CAPABILITY_DENIED",
            "No application admission host",
        ))
    }
    fn admit_dispatch(&self, _: &application::DispatchAdmission) -> Result<Value> {
        Err(Error::new(
            "CAPABILITY_DENIED",
            "No dispatch admission host",
        ))
    }
}

impl app_memory::MemoryAdmission for NoAdmission {
    fn identity(&self) -> &str {
        "denied"
    }
    fn current_frontier(&self, _: &str) -> Result<String> {
        Err(Error::new("CAPABILITY_DENIED", "No memory admission host"))
    }
    fn validate_scope(
        &self,
        _: &app_memory::MemoryScope,
        _: &app_memory::MemoryFrontier,
        _: &Value,
    ) -> Result<()> {
        Err(Error::new("CAPABILITY_DENIED", "No memory admission host"))
    }
    fn decode_observation(
        &self,
        _: &app_memory::ObservationAdmission,
    ) -> Result<Vec<app_memory::Claim>> {
        Err(Error::new(
            "CAPABILITY_DENIED",
            "No observation admission host",
        ))
    }
}

#[derive(Parser)]
#[command(
    name = "algal",
    version,
    about = "Language and VM for agent programs that wait for approval and resume"
)]
struct Cli {
    /// Store directory: manifests, receipts, values, slots, and process state.
    #[arg(long, global = true, default_value = ".algal")]
    dir: PathBuf,
    #[command(subcommand)]
    command: Commands,
}

#[derive(Clone, Args, Default)]
struct Execution {
    /// Input-cell values as a JSON file, or `-` to read them from stdin.
    #[arg(long)]
    args: Option<String>,
    /// Scripted executor: JSON map of cell id (or request digest) to output.
    #[arg(long)]
    responses: Option<PathBuf>,
    /// `algal.host.v1` executor configuration file (named backends).
    #[arg(long)]
    host: Option<PathBuf>,
    /// Shell executor: bounded request JSON on stdin, response JSON on stdout.
    #[arg(long)]
    executor_cmd: Option<String>,
    /// Delegated coding agent over ACP: devin, codex, claude, or xcb.
    #[arg(long)]
    agent: Option<String>,
    /// Working directory handed to the delegated coding agent.
    #[arg(long, default_value = ".")]
    workspace: PathBuf,
    /// Vercel AI Gateway structured-output executor (`provider/model`).
    #[arg(long)]
    gateway_model: Option<String>,
    /// TypeSafe Jev decision executor; bare `--jev` uses `jev-latest`.
    #[arg(long, num_args = 0..=1, default_missing_value = "jev-latest")]
    jev: Option<String>,
    /// Derived-index recall executor; embedder is `local` or `gateway[:<model>]`.
    #[arg(long, num_args = 0..=1, default_missing_value = "local")]
    recall: Option<String>,
    /// OpenAI-compatible Chat Completions endpoint (HTTPS, or explicit loopback).
    #[arg(long, requires = "model")]
    base_url: Option<String>,
    /// Model name sent to the `--base-url` endpoint.
    #[arg(long, requires = "base_url")]
    model: Option<String>,
    /// Environment variable holding the `--base-url` endpoint's credential.
    #[arg(long, requires = "base_url")]
    credential_env: Option<String>,
    /// Structured-output mode for `--base-url`: json_schema or json_object.
    #[arg(long, default_value = "json_schema")]
    response_format: String,
    /// Route model cells to Apple's on-device Foundation Models bridge.
    #[arg(long)]
    apple: bool,
    /// Explicit `algal-apple` bridge executable (default: sibling binary).
    #[arg(long, requires = "apple")]
    apple_bridge: Option<PathBuf>,
    /// Directory of `*.algal.json` manifests loaded into the store for organism cells.
    #[arg(long)]
    modules: Option<PathBuf>,
    /// JSON map of transport name to bundle directory for `via` cells.
    #[arg(long)]
    transports: Option<PathBuf>,
    /// Tool registry file: tool name to `{signature, exec}`.
    #[arg(long)]
    tools: Option<PathBuf>,
    /// Memoize effects: identical request digests reuse the stored response.
    #[arg(long)]
    cache_effects: bool,
    /// Persist the manifest and receipt under `--dir`.
    #[arg(long)]
    write: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// Run one civilization epoch: propose plans, admit them, measure, and promote.
    Civ {
        /// Use a live executor for the designer instead of the recorded fixture.
        #[arg(long)]
        live: bool,
        /// Custom goals file (default: the bundled civilization goals).
        #[arg(long)]
        goals: Option<PathBuf>,
        #[command(flatten)]
        options: Execution,
    },
    /// Replay and audit a recorded civilization epoch offline.
    CivVerify {
        /// Population file to verify (default: the one under `--dir`).
        population: Option<PathBuf>,
        /// Goals file the epoch was measured against.
        #[arg(long)]
        goals: Option<PathBuf>,
    },
    /// Measure several systems on one workload and report the Pareto set.
    Bench {
        #[command(subcommand)]
        command: Option<BenchCommand>,
        /// `algal.bench.config.v1` file
        config: Option<PathBuf>,
        /// Write the bench report here as well as to stdout.
        #[arg(long)]
        out: Option<PathBuf>,
        /// Explicit `algal-apple` bridge executable for Apple-routed systems.
        #[arg(long)]
        apple_bridge: Option<PathBuf>,
        /// Tool registry file: tool name to `{signature, exec}`.
        #[arg(long)]
        tools: Option<PathBuf>,
        /// Directory of `*.algal.json` manifests loaded into the store.
        #[arg(long)]
        modules: Option<PathBuf>,
        /// JSON map of transport name to bundle directory for `via` cells.
        #[arg(long)]
        transports: Option<PathBuf>,
    },
    /// Generate and evaluate candidate organisms, then promote a winner.
    Foundry {
        #[command(subcommand)]
        command: Option<FoundryCommand>,
        /// `algal.foundry.config.v1` file
        config: Option<PathBuf>,
        /// Write the foundry report here as well as to stdout.
        #[arg(long)]
        out: Option<PathBuf>,
        #[command(flatten)]
        options: Execution,
    },
    /// Run a compiled manifest and print its receipt.
    Run {
        /// Compiled `algal.organism.v1` manifest (JSON).
        manifest: PathBuf,
        #[command(flatten)]
        options: Execution,
    },
    /// Run a packed organism bundle and print a compact result.
    Call {
        /// Closure bundle written by `pack`.
        bundle: PathBuf,
        /// Accept named interface arguments and return declared interface outputs.
        #[arg(long)]
        interface: bool,
        #[command(flatten)]
        options: Execution,
    },
    /// Admit a compiled manifest without running it.
    Check {
        /// Compiled `algal.organism.v1` manifest (JSON).
        manifest: PathBuf,
        #[command(flatten)]
        options: Execution,
    },
    /// Print the compiled signature: resolved ports and guards.
    Explain {
        /// Compiled `algal.organism.v1` manifest (JSON).
        manifest: PathBuf,
        #[command(flatten)]
        options: Execution,
    },
    /// Print a manifest's canonical digest.
    Digest {
        /// Compiled `algal.organism.v1` manifest (JSON).
        manifest: PathBuf,
    },
    /// Summarize a run receipt.
    Inspect {
        /// Run receipt (JSON).
        receipt: PathBuf,
    },
    /// Compare two receipts canonically and report divergence.
    Diff {
        /// First receipt.
        a: PathBuf,
        /// Second receipt.
        b: PathBuf,
    },
    /// List receipts stored under `--dir`.
    Runs,
    /// List manifests stored under `--dir`.
    Manifests,
    /// Print a stored manifest.
    Manifest {
        /// Manifest digest (`sha256:…`).
        digest: String,
    },
    /// List durable slot cells and their current state.
    Slots,
    /// Read or seed one durable slot directly.
    Slot {
        #[command(subcommand)]
        command: SlotCommand,
    },
    /// Bounded durable mailboxes: external wakeups for suspended runs.
    Mailbox {
        #[command(subcommand)]
        command: MailboxCommand,
    },
    /// Try durable local review, owned crash recovery, and offline evidence.
    #[command(
        after_help = "Decision effects are deterministic fixtures. Demo commands use their explicit ROOT or FILE argument and reject --dir."
    )]
    Demo {
        #[command(subcommand)]
        command: DemoCommand,
    },
    /// Durable, bounded processes: create, tick, recover, and verify.
    Process {
        #[command(subcommand)]
        command: ProcessCommand,
    },
    /// Print one bundled example manifest.
    Example {
        /// Example id (the file name without `.algal.json`).
        id: String,
        /// Examples directory (the repository's `examples/`).
        #[arg(long, default_value = "examples")]
        examples: PathBuf,
    },
    /// Re-run a receipt with recorded effects fixed and compare bit-for-bit.
    Verify {
        /// Run receipt (JSON).
        receipt: PathBuf,
        /// Manifest; resolves from the store when omitted.
        manifest: Option<PathBuf>,
        #[command(flatten)]
        options: Execution,
    },
    /// Continue a suspended run: recorded effects replay, the rest routes
    /// to the live executors.
    Resume {
        /// Suspended run receipt (JSON).
        receipt: PathBuf,
        /// Manifest; resolves from the store when omitted.
        manifest: Option<PathBuf>,
        #[command(flatten)]
        options: Execution,
    },
    /// Print a closure bundle: the manifest plus embedded sub-manifests and payloads.
    Pack {
        /// Compiled `algal.organism.v1` manifest (JSON).
        manifest: PathBuf,
        /// Directory of `*.algal.json` manifests loaded into the store.
        #[arg(long)]
        modules: Option<PathBuf>,
        /// Also write `<root-hex>.bundle.json` into this directory.
        #[arg(long)]
        out: Option<PathBuf>,
    },
    /// Install a bundle into the store with every digest verified.
    Unpack {
        /// Closure bundle written by `pack`.
        bundle: PathBuf,
    },
    /// Print a tool definition for the organism's declared interface.
    ToolDef {
        /// Compiled `algal.organism.v1` manifest (JSON).
        manifest: PathBuf,
        /// Directory of `*.algal.json` manifests loaded into the store.
        #[arg(long)]
        modules: Option<PathBuf>,
        /// Definition format: openai or anthropic.
        #[arg(long, default_value = "openai")]
        format: String,
    },
    /// Run and verify every bundled example with its scripted responses.
    Suite {
        /// Examples directory (the repository's `examples/`).
        #[arg(long, default_value = "examples")]
        examples: PathBuf,
        /// Directory of `*.algal.json` manifests loaded into the store.
        #[arg(long)]
        modules: Option<PathBuf>,
    },
    /// Content-addressed store: put, get, or probe a JSON value.
    Store {
        #[command(subcommand)]
        command: StoreCommand,
    },
    /// Bounded memory snapshots: query, verify, and remember facts.
    Memory {
        #[command(subcommand)]
        command: MemoryCommand,
    },
    /// Durable application lifecycle over the content-addressed store (experimental).
    /// `--dir` is the application root; host authority comes from the
    /// declarative `algal.application-host.v1` policy record.
    Application {
        /// `algal.application-host.v1` policy record; required for
        /// operations that admit work.
        #[arg(long)]
        policy: Option<PathBuf>,
        /// Explicit retained-pure-strategy restoration authority.
        #[arg(long)]
        restoration_policy: Option<PathBuf>,
        /// Environment label this host deploys into; enables environment-keyed
        /// selection policy admission. Host authority, outside the policy record.
        #[arg(long)]
        selection_environment: Option<String>,
        /// Channel directory for the policy dispatcher
        /// (default `<dir>/channels`).
        #[arg(long)]
        channels: Option<PathBuf>,
        #[command(subcommand)]
        command: ApplicationCommand,
    },
    /// Recorded context compaction: compact, recall, and verify a view.
    Context {
        #[command(subcommand)]
        command: ContextCommand,
    },
    /// Run one bounded coding task through the built-in agent harness.
    Agent {
        /// Task text; read from stdin when omitted and stdin is not a terminal.
        #[arg(short, long)]
        prompt: Option<String>,
        #[command(flatten)]
        options: Execution,
    },
    /// Rebuild the derived semantic index over the store + optional docs.
    Index {
        /// Host document directory (*.md/*.txt/*.json).
        #[arg(long)]
        docs: Option<PathBuf>,
        /// Embedder: local (default), gateway, or gateway:<model>.
        #[arg(long)]
        embedder: Option<String>,
    },
    /// Hybrid-rank the semantic index: embedding cosine ⊕ token overlap.
    Search {
        /// Query text.
        query: String,
        /// Result count (1..=64).
        #[arg(short, long, default_value = "8")]
        k: usize,
        /// Embedder: local (default), gateway, or gateway:<model>.
        #[arg(long)]
        embedder: Option<String>,
    },
    /// Vault a provider credential locally; never echoes the key.
    Auth {
        /// Credential provider (`jev`).
        provider: String,
        /// Report the credential's redacted status and exit.
        #[arg(long)]
        status: bool,
        /// Remove the credential from every local store.
        #[arg(long)]
        forget: bool,
        /// Read the key from the OS clipboard instead of a prompt.
        #[arg(long)]
        clipboard: bool,
    },
    /// Report runtime, build identity, and provider availability.
    Doctor {
        /// Probe the Apple Foundation Models bridge.
        #[arg(long)]
        apple: bool,
        /// Explicit `algal-apple` bridge executable (default: sibling binary).
        #[arg(long)]
        apple_bridge: Option<PathBuf>,
        /// TypeSafe Jev availability: credential status plus a live probe.
        #[arg(long)]
        jev: bool,
    },
    /// Serve the Agent Client Protocol over stdio with a host-admitted executor.
    Acp {
        #[command(flatten)]
        options: Execution,
    },
}

#[derive(Subcommand)]
enum BenchCommand {
    /// Replay every case receipt in a bench report offline.
    Verify {
        /// Bench report (JSON).
        report: PathBuf,
        /// Tool registry file: tool name to `{signature, exec}`.
        #[arg(long)]
        tools: Option<PathBuf>,
        /// Directory of `*.algal.json` manifests loaded into the store.
        #[arg(long)]
        modules: Option<PathBuf>,
    },
    /// Summarize a bench report's Pareto comparison.
    Inspect {
        /// Bench report (JSON).
        report: PathBuf,
    },
}

#[derive(Subcommand)]
enum FoundryCommand {
    /// Replay every run in a foundry report or budget record offline.
    Verify {
        /// Foundry report or habitat budget record (JSON).
        report: PathBuf,
        /// Tool registry file: tool name to `{signature, exec}`.
        #[arg(long)]
        tools: Option<PathBuf>,
        /// Directory of `*.algal.json` manifests loaded into the store.
        #[arg(long)]
        modules: Option<PathBuf>,
    },
    /// Summarize scores, lineage, and promotion.
    Inspect {
        /// Foundry report (JSON).
        report: PathBuf,
    },
    /// Export the promoted organism's verified bundle.
    Pack {
        /// Foundry report (JSON).
        report: PathBuf,
        /// Output directory for the bundle.
        #[arg(long)]
        out: PathBuf,
        /// Tool registry file: tool name to `{signature, exec}`.
        #[arg(long)]
        tools: Option<PathBuf>,
        /// Directory of `*.algal.json` manifests loaded into the store.
        #[arg(long)]
        modules: Option<PathBuf>,
    },
    /// Evolve candidates over bounded generations.
    Search {
        /// `algal.foundry.config.v1` file with a `search` block
        config: PathBuf,
        /// Write the search report here as well as to stdout.
        #[arg(long)]
        out: Option<PathBuf>,
        #[command(flatten)]
        options: Box<Execution>,
    },
    /// Replay every run in a search report offline.
    SearchVerify {
        /// Search report (JSON).
        report: PathBuf,
        /// Tool registry file: tool name to `{signature, exec}`.
        #[arg(long)]
        tools: Option<PathBuf>,
        /// Directory of `*.algal.json` manifests loaded into the store.
        #[arg(long)]
        modules: Option<PathBuf>,
    },
    /// Summarize a search report's generations and winner.
    SearchInspect {
        /// Search report (JSON).
        report: PathBuf,
    },
    /// Export a verified search winner's bundle.
    SearchPack {
        /// Search report (JSON).
        report: PathBuf,
        /// Output directory for the bundle.
        #[arg(long)]
        out: PathBuf,
        /// Tool registry file: tool name to `{signature, exec}`.
        #[arg(long)]
        tools: Option<PathBuf>,
        /// Directory of `*.algal.json` manifests loaded into the store.
        #[arg(long)]
        modules: Option<PathBuf>,
    },
}

#[derive(Subcommand)]
enum StoreCommand {
    /// Write a JSON value to the store and print its ref token.
    Put {
        /// JSON file, or `-` for stdin.
        file: String,
        /// CAS kind; manifests and values are the durable record kinds.
        #[arg(long, default_value = "values", value_parser = ["manifests", "values"])]
        kind: String,
    },
    /// Print the payload a ref resolves to.
    Get {
        /// Ref token (`sha256:…`).
        digest: String,
        /// CAS kind; manifests and values are the durable record kinds.
        #[arg(long, default_value = "values", value_parser = ["manifests", "values"])]
        kind: String,
    },
    /// Report whether a ref resolves.
    Has {
        /// Ref token (`sha256:…`).
        digest: String,
        /// CAS kind; manifests and values are the durable record kinds.
        #[arg(long, default_value = "values", value_parser = ["manifests", "values"])]
        kind: String,
    },
}

#[derive(Subcommand)]
enum SlotCommand {
    /// Print a slot's current value.
    Get {
        /// Slot name.
        name: String,
    },
    /// Write a slot directly (seeding).
    Set {
        /// Slot name.
        name: String,
        /// JSON value file.
        value: PathBuf,
    },
}

#[derive(Subcommand)]
enum DemoCommand {
    /// Demonstrate approval, denial, detached verification, and two owned crashes.
    #[command(
        after_help = "Uses deterministic fixtures. ROOT must be new. Demo commands reject --dir."
    )]
    Prove {
        /// New directory for the crash laboratory and retained proof.json.
        root: PathBuf,
    },
    #[command(hide = true)]
    FixtureStart {
        root: PathBuf,
        #[arg(long)]
        mode: String,
        #[arg(long)]
        token: String,
    },
    #[command(hide = true)]
    FixtureRecover {
        root: PathBuf,
        #[arg(long)]
        token: String,
        #[arg(long)]
        intent: String,
    },
    /// Retain a fixture proposal and leave it waiting for your decision.
    #[command(
        after_help = "Open ROOT/report.html for the exact approve or deny command. Use the explicit ROOT; demo commands reject --dir."
    )]
    Start {
        /// New review directory; it must not already exist.
        root: PathBuf,
        /// Optional JSON evidence file, at most 8 KiB; retained without AI analysis.
        #[arg(long)]
        evidence: Option<PathBuf>,
    },
    /// Verify retained state and refresh the report without advancing the VM.
    #[command(after_help = "Use the explicit ROOT; demo commands reject --dir.")]
    Inspect {
        /// Existing review workbench directory.
        root: PathBuf,
    },
    /// Authorize the exact retained proposal for local publication.
    #[command(
        after_help = "Copy the digest and action from ROOT/report.html. Repeating the same completed decision creates no new publication. Demo commands reject --dir."
    )]
    Approve {
        /// Existing review workbench directory.
        root: PathBuf,
        /// Exact sha256 proposal digest shown in the review report.
        #[arg(long)]
        proposal: String,
        /// Allowed local action: publish-local-report.
        #[arg(long)]
        action: String,
    },
    /// Finish the retained review without publishing its proposal.
    #[command(
        after_help = "Copy the digest and action from ROOT/report.html. A conflicting prior decision is rejected. Demo commands reject --dir."
    )]
    Deny {
        /// Existing review workbench directory.
        root: PathBuf,
        /// Exact sha256 proposal digest shown in the review report.
        #[arg(long)]
        proposal: String,
        /// Allowed local action: publish-local-report.
        #[arg(long)]
        action: String,
    },
    /// Write portable evidence JSON to stdout and retain a copy in the workbench.
    #[command(
        after_help = "Inspect retained prompts, outputs, and capability strings before sharing; exports do not redact them. Demo commands reject --dir."
    )]
    Export {
        /// Existing review workbench directory.
        root: PathBuf,
    },
    /// Verify an exported evidence file offline without its original store.
    #[command(
        after_help = "Checks recorded execution consistency, not factual truth or provider identity. Demo commands reject --dir."
    )]
    Verify {
        /// Portable evidence JSON produced by demo export or process export.
        file: PathBuf,
    },
}

#[derive(Subcommand)]
enum ProcessCommand {
    /// Export bounded execution evidence without executable tool bindings.
    Export {
        /// Process name.
        name: String,
        /// Tool registry file: tool name to `{signature, exec}`.
        #[arg(long)]
        tools: Option<PathBuf>,
    },
    /// Verify one portable evidence file in memory, with no host/store setup.
    VerifyEvidence {
        /// Portable evidence JSON written by `process export`.
        file: PathBuf,
    },
    /// Admit a durable, bounded process from a compiled manifest.
    Create {
        /// Process name.
        name: String,
        /// Compiled `algal.organism.v1` manifest (JSON).
        manifest: PathBuf,
        /// Maximum generations before the process stops.
        #[arg(long, default_value_t = 16)]
        max_generations: usize,
        #[command(flatten)]
        options: Execution,
    },
    /// List processes retained under `--dir`.
    List,
    /// Print a process's retained state.
    Inspect {
        /// Process name.
        name: String,
    },
    /// Print a process's ordered effect journal.
    Journal {
        /// Process name.
        name: String,
    },
    /// Execute one generation under a lease.
    Tick {
        /// Process name.
        name: String,
        /// Journal each effect before dispatch for exact-intent recovery.
        #[arg(long)]
        journal: bool,
        /// Maximum automatic journal recoveries per tick.
        #[arg(long, default_value_t = 2)]
        max_recoveries: usize,
        #[command(flatten)]
        options: Execution,
    },
    /// Recover an uncertain journaled effect whose intent you have confirmed.
    Recover {
        /// Process name.
        name: String,
        /// Digest of the exact journaled intent being recovered.
        #[arg(long)]
        expected_intent: String,
        #[command(flatten)]
        options: Execution,
    },
    /// Run ready processes and recorded mailbox wakeups.
    Schedule {
        /// Journal each effect before dispatch for exact-intent recovery.
        #[arg(long)]
        journal: bool,
        /// Maximum automatic journal recoveries per tick.
        #[arg(long, default_value_t = 2)]
        max_recoveries: usize,
        /// Maximum ticks across all processes in this invocation.
        #[arg(long, default_value_t = 16)]
        max_ticks: usize,
        #[command(flatten)]
        options: Execution,
    },
    /// Replay a process's history offline and compare every receipt.
    Verify {
        /// Process name.
        name: String,
        #[command(flatten)]
        options: Execution,
    },
}

#[derive(Subcommand)]
enum MailboxCommand {
    /// Create a bounded mailbox and print its send/receive capabilities.
    Create {
        /// Mailbox name.
        name: String,
        /// Maximum retained messages.
        #[arg(long, default_value_t = 64)]
        max_messages: usize,
        /// Maximum bytes per message.
        #[arg(long, default_value_t = 65_536)]
        max_message_bytes: usize,
    },
    /// List admitted mailboxes and their handles.
    List,
    /// Enqueue an external wakeup message.
    Send {
        /// Send capability handle.
        capability: String,
        /// JSON message file.
        value: PathBuf,
        /// Idempotency key (`sha256:…`); a repeated key delivers once.
        #[arg(long)]
        idempotency_key: Option<String>,
    },
    /// Consume one message, or report that the mailbox is empty.
    Receive {
        /// Receive capability handle.
        capability: String,
    },
    /// Revoke one mailbox capability.
    Revoke {
        /// Capability handle to revoke.
        capability: String,
    },
}

#[derive(Subcommand)]
enum MemoryCommand {
    /// Evaluate a bounded query program over a memory snapshot.
    Query {
        /// Memory snapshot (JSON).
        snapshot: PathBuf,
        /// Query program (JSON).
        program: PathBuf,
    },
    /// Re-derive a query result and report whether it matches.
    Verify {
        /// Memory snapshot (JSON).
        snapshot: PathBuf,
        /// Query program (JSON).
        program: PathBuf,
        /// Previously emitted query result (JSON).
        result: PathBuf,
    },
    /// Admit one sourced fact into a memory snapshot and store the result.
    Remember {
        /// Source record the fact is attributed to (JSON).
        source: PathBuf,
        /// Relation name.
        relation: String,
        /// Tuple as a JSON array.
        tuple: String,
        /// Existing `algal.memory.v1` snapshot to extend (default: empty).
        #[arg(long)]
        snapshot: Option<PathBuf>,
    },
}

#[derive(Subcommand)]
enum ApplicationCommand {
    /// Persist a bounded JSON value into the store; emits its digest.
    Put { value: PathBuf },
    /// Admit + persist an `algal.application-memory-scope.v1` record.
    Scope { scope: PathBuf },
    /// Admit + persist an `algal.application-memory.v1` snapshot input.
    Snapshot { memory: PathBuf },
    /// Admit + persist an observation record; emits the observation digest.
    Observe { observation: PathBuf },
    /// Derive a query over a captured state; emits the derivation digest.
    Query { state: String, query: String },
    /// Genesis commit: `command` is an `ApplicationCommand` record with
    /// kind `create` and `expectedHead: null`.
    Create { command: PathBuf },
    /// Expected-head commit.
    Commit { command: PathBuf },
    /// Print the current head snapshot (`null` when absent).
    Inspect { application: String },
    /// Deterministic lineage: retained history projected to one row per
    /// committed state in genesis→head order (`[]` when absent).
    Lineage { application: String },
    /// Print unsettled intents.
    Pending { application: String },
    /// Admit and dispatch pending intents through the policy host.
    Dispatch {
        /// Application name.
        application: String,
        #[arg(long, default_value_t = 32)]
        max: usize,
        /// Dispatch through the bare `algal.application-host.v1` host rather
        /// than the domain dispatcher — episodes are blocked honestly.
        #[arg(long)]
        host_only: bool,
    },
    /// Explicitly reconcile one uncertain dispatch.
    Reconcile {
        /// Application name.
        application: String,
        /// Intent digest to reconcile.
        intent: String,
        #[arg(long)]
        host_only: bool,
    },
    /// `schedule_investigations`: derivation → investigation requests → commit.
    Schedule { input: PathBuf },
    /// `request_execution`: verified support → start-episode commit.
    Execute { input: PathBuf },
    /// `append_observation`: observation → snapshot → memory commit.
    Publish { input: PathBuf },
    /// Archive an active memory selection and commit on the exact expected head.
    RolloverMemory { input: PathBuf },
    /// Restore retained pure strategy manifests as a forward child revision.
    Restore { input: PathBuf },
    /// `evaluateApplicationRevision`: foundry over incumbent/candidate
    /// entrypoints; emits the stored evaluation digest and verdict.
    Evaluate { request: PathBuf },
    /// `verifyApplicationEvaluation`: re-verify a stored evaluation record
    /// against an expected parent state.
    VerifyEvaluation { input: PathBuf },
    /// `admitApplicationActivation`: require a reproducibly accepted
    /// candidate revision; emits the bound revision and state digests.
    AdmitActivation { input: PathBuf },
    /// `checkApplicationCompatibility` between two stored revisions; input
    /// is `{"previous": <ref>, "candidate": <ref>}`.
    Compatible { input: PathBuf },
    /// `produceApplicationComparison`: join several evaluated alternatives
    /// under one environment into a stored comparison record.
    Compare { input: PathBuf },
    /// `verifyApplicationComparison`: replay a stored comparison's evidence
    /// against an expected parent state.
    VerifyComparison { input: PathBuf },
    /// `proposeApplicationRevision`: run a generator entrypoint case-pure and
    /// commit the `propose` transition with the emitted candidate evidence.
    Propose { input: PathBuf },
    /// `verifyApplicationProposal`: replay a stored proposal's receipt and
    /// derived candidates against an expected parent state.
    VerifyProposal { input: PathBuf },
    /// `selectApplicationStrategy`: replay a selection policy and resolve the
    /// manifest its row for one environment selected.
    Select { input: PathBuf },
    /// `produceApplicationSelection`: resolve one policy row into a retained
    /// `algal.application-selection.v1` record.
    SelectRecord { input: PathBuf },
    /// `verifyApplicationSelection`: replay a stored selection record against
    /// an expected parent state.
    VerifySelection { input: PathBuf },
    /// `produceApplicationExperiment`: join proposal/evaluation/comparison/
    /// selection evidence into one bounded experiment record.
    Experiment { input: PathBuf },
    /// `verifyApplicationExperiment`: replay a stored experiment's whole
    /// evidence chain against an expected parent state.
    VerifyExperiment { input: PathBuf },
    /// `migrateApplicationMemory`: run the migration program and admit its
    /// emitted claims into a fresh memory chain under the new schema.
    MigrateMemory { input: PathBuf },
    /// `produceApplicationDrain`: record the explicit disposition of every
    /// undispatched pending intent at a parent state.
    Drain { input: PathBuf },
    /// `verifyApplicationDrain`: re-verify a stored drain record against an
    /// expected parent state.
    VerifyDrain { input: PathBuf },
    /// `projectApplicationView`: pure bounded projection of the captured
    /// head — fenced procedures, history, investigations and actions.
    View { input: PathBuf },
    /// Render a captured view as a passive, standalone HTML workbench.
    Report { view: PathBuf },
    /// `verifyInterappDelivery`: verify a retained `algal.interapp-message.v1`
    /// record against CAS, history, and the durable channel; input is
    /// `{"message": <ref>}`.
    VerifyMessage { input: PathBuf },
    /// `produceApplicationContention`: race several commands against one
    /// expected head and retain the `algal.application-contention.v1`
    /// record; input is `{"parentState": <ref>, "attempts": [<command>…]}`.
    Contend { input: PathBuf },
    /// `verifyApplicationContention`: verify a retained contention record
    /// against the application history; input is `{"contention": <ref>}`.
    VerifyContention { input: PathBuf },
}

#[derive(Subcommand)]
enum ContextCommand {
    /// Elide an `algal.context.v1` record to a byte bound and print the view.
    Compact {
        /// `algal.context.v1` source record (JSON).
        source: PathBuf,
        /// Byte bound for the compacted view.
        #[arg(long)]
        max_bytes: usize,
        /// Most recent entries kept verbatim.
        #[arg(long, default_value_t = 4)]
        keep_recent: usize,
    },
    /// Resolve one elided reference back to its recorded source entry.
    Recall {
        /// `algal.context.v1` source record (JSON).
        source: PathBuf,
        /// Reference token from a compacted view.
        reference: String,
    },
    /// Check that a compacted view derives from its source.
    Verify {
        /// `algal.context.v1` source record (JSON).
        source: PathBuf,
        /// Compacted view (JSON).
        view: PathBuf,
    },
}

/// Read one bounded JSON input; every failure names the path.
fn load(path: &Path, max: usize) -> Result<Value> {
    let at = |error: Error| {
        Error::new(
            &error.code,
            format!("{}: {}", path.display(), error.message),
        )
    };
    if path.extension().is_some_and(|ext| ext == "algal") {
        return Err(Error::invalid(format!(
            "{}: `.algal` source must be compiled first — run `bun cli.ts compile {} --out <manifest.json>` and pass the compiled manifest (the native CLI does not invoke Bun)",
            path.display(),
            path.display()
        )));
    }
    let file = algal::store::open_input_file(path, max)
        .map_err(at)?
        .ok_or_else(|| Error::new("IO_FAILED", format!("{}: file not found", path.display())))?;
    read_json(file, max).map_err(at)
}
fn emit(value: &Value) -> Result<()> {
    println!("{}", canonical(value)?);
    Ok(())
}
/// Explain an `EFFECT_UNBOUND` run failure on stderr: which cell asked for
/// which route, and which executors the host admitted. The receipt itself is
/// shared wire bytes with the reference runtime and stays unchanged.
fn unbound_hint(receipt: &Value, manifest: &Manifest, host: &Host) {
    if receipt["failure"]["code"] != "EFFECT_UNBOUND" {
        return;
    }
    let path = receipt["failure"]["path"].as_str().unwrap_or("?");
    let leaf = path.rsplit('/').next().unwrap_or(path);
    let route = manifest
        .cells
        .iter()
        .find(|cell| cell["id"] == leaf)
        .map(|cell| cell["route"].clone())
        .unwrap_or(Value::Null);
    let asked = if let Some(provider) = route["provider"].as_str() {
        format!("route.provider \"{provider}\"")
    } else if let Some(preset) = route["preset"].as_str() {
        format!("route.preset \"{preset}\"")
    } else {
        "no route".to_string()
    };
    let admitted: Vec<String> = host
        .entries
        .iter()
        .map(|(id, _)| format!("\"{id}\""))
        .collect();
    let admitted = if admitted.is_empty() {
        "none".to_string()
    } else {
        admitted.join(", ")
    };
    eprintln!(
        "hint: cell \"{path}\" requested {asked}; admitted executors: {admitted}. Routes match an executor by id (--host names backends; --responses serves any route)."
    );
}
fn manifest(path: &Path) -> Result<Manifest> {
    Manifest::parse(&load(path, 1_048_576)?)
}
fn args(options: &Execution) -> Result<Value> {
    match options.args.as_deref() {
        None => Ok(json!({})),
        Some("-") => read_json(io::stdin().lock(), 1_048_576),
        Some(file) => load(Path::new(file), 1_048_576),
    }
}

fn bridge_path(explicit: Option<&PathBuf>) -> Result<PathBuf> {
    if let Some(path) = explicit {
        return Ok(path.clone());
    }
    if let Some(path) = std::env::var_os("ALGAL_APPLE_BRIDGE") {
        return Ok(path.into());
    }
    let binary = std::env::current_exe()?;
    let path = binary
        .parent()
        .unwrap_or(Path::new("."))
        .join("algal-apple");
    // The default sibling is managed: build (or rebuild) it from the pinned
    // apple-foundation source when absent or stale. Explicit flag/env paths
    // are user-managed and used as-is.
    apple_foundation::ensure_bridge(&path)
        .map_err(|e| Error::invalid(format!("apple bridge unavailable: {e}")))?;
    Ok(path)
}

fn host(options: &Execution, dir: &Path) -> Result<Host> {
    let count = usize::from(options.responses.is_some())
        + usize::from(options.host.is_some())
        + usize::from(options.executor_cmd.is_some())
        + usize::from(options.gateway_model.is_some())
        + usize::from(options.jev.is_some())
        + usize::from(options.recall.is_some())
        + usize::from(options.base_url.is_some())
        + usize::from(options.apple)
        + usize::from(options.agent.is_some());
    if count > 1 {
        return Err(Error::invalid(
            "choose one default executor or use --host for named routes",
        ));
    }
    let mut host = if let Some(path) = &options.responses {
        Host::scripted(load(path, 1_048_576)?)
    } else if let Some(path) = &options.host {
        Host::from_config(&load(path, 1_048_576)?)?
    } else if let Some(command) = &options.executor_cmd {
        let backend = Backend::Command {
            argv: vec!["sh".into(), "-c".into(), command.clone()],
            cwd: None,
            timeout_ms: 120_000,
        };
        backend.validate()?;
        let identity = algal::canonical::digest(&json!({"command":command,"options":{}}))?;
        let mut host = Host::default();
        host.entries.push((format!("cmd:{identity}"), backend));
        host
    } else {
        let backend = if let Some(agent) = &options.agent {
            let cwd = options.workspace.canonicalize()?;
            Some(match agent.as_str() {
                "devin" => Backend::Acp {
                    argv: vec!["devin".into(), "acp".into()],
                    cwd,
                },
                "codex" => Backend::Acp {
                    argv: vec!["codex-acp".into()],
                    cwd,
                },
                "claude" | "claude-code" => Backend::Acp {
                    argv: vec!["claude-agent-acp".into()],
                    cwd,
                },
                "xcb" => Backend::Xcb {
                    executable: "xcb".into(),
                    cwd,
                    account: None,
                    model: None,
                },
                _ => {
                    return Err(Error::invalid(
                        "agent must be devin, codex, claude, or xcb; use --host for a custom ACP command",
                    ));
                }
            })
        } else if let Some(model) = &options.gateway_model {
            if std::env::var_os("AI_GATEWAY_API_KEY").is_none()
                && std::env::var_os("VERCEL_OIDC_TOKEN").is_none()
            {
                return Err(Error::new(
                    "EFFECT_UNBOUND",
                    format!(
                        "--gateway-model {model}: no AI Gateway credential; set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN before running"
                    ),
                ));
            }
            Some(Backend::Gateway {
                model: model.clone(),
            })
        } else if let Some(model) = &options.jev {
            Some(Backend::Jev {
                model: model.clone(),
                credential_env: None,
            })
        } else if let Some(embedder) = &options.recall {
            Some(Backend::Recall {
                dir: dir.to_path_buf(),
                embedder: embedder.clone(),
            })
        } else if let Some(base_url) = &options.base_url {
            let response_format: ResponseFormat =
                serde_json::from_value(json!(options.response_format))?;
            Some(Backend::Openai {
                base_url: base_url.clone(),
                model: options
                    .model
                    .clone()
                    .ok_or_else(|| Error::invalid("--model required"))?,
                credential_env: options.credential_env.clone(),
                response_format,
                timeout_ms: 120_000,
                max_response_bytes: 2_097_152,
            })
        } else if options.apple {
            Some(Backend::Apple {
                bridge: bridge_path(options.apple_bridge.as_ref())?,
            })
        } else {
            None
        };
        let mut host = Host::default();
        if let Some(backend) = backend {
            backend.validate()?;
            host.entries.push(("default".into(), backend));
        }
        host
    };
    if let Some(file) = &options.tools {
        host.load_tools(file)?;
    }
    Ok(host)
}

fn prepare(options: &Execution, dir: &Path) -> Result<(Store, Host, Transports)> {
    let mut store = Store::open(dir, options.write)?;
    if let Some(path) = &options.modules {
        store.load_modules(path)?;
    }
    let mut host = host(options, dir)?;
    host.install_mailboxes(MailboxService::open(dir))?;
    host.cache = options.cache_effects;
    let mut transports = Transports::new();
    if let Some(file) = &options.transports {
        let value = load(file, 65_536)?;
        if object(&value)?.len() > 16 {
            return Err(Error::limit("transport count"));
        }
        for (name, target) in object(&value)? {
            let target = target
                .as_str()
                .ok_or_else(|| Error::invalid("transport directory"))?;
            if target.contains("://") {
                return Err(Error::new(
                    "EFFECT_UNBOUND",
                    "native transports currently require local bundle directories",
                ));
            }
            transports.insert(name.clone(), PathBuf::from(target));
        }
    }
    Ok((store, host, transports))
}

fn persist(store: &mut Store, manifest: &Manifest, receipt: &Value) -> Result<String> {
    store.admit(manifest)?;
    store.put("runs", receipt)
}

fn tool_definition(
    manifest: Manifest,
    store: &mut Store,
    format: &str,
    tools: &Host,
) -> Result<Value> {
    let compiled = compile(
        manifest,
        store,
        &tools.tool_signatures(),
        &Default::default(),
        0,
    )?;
    let signature = interface_signature(&compiled)?;
    let mut properties = MapBuilder::default();
    let mut required = Vec::new();
    for (name, port) in signature.inputs {
        let mut schema = match port["type"].as_str() {
            Some("text") | Some("ref") => json!({"type":"string"}),
            Some("cap") => json!({
                "type":"string",
                "pattern":format!(
                    "^cap:{}:sha256:[a-f0-9]{{64}}$",
                    port["capability"].as_str().unwrap_or("[a-z][a-z0-9-]*")
                )
            }),
            Some("choice") => json!({"type":"string","enum":port["labels"]}),
            _ => port.get("schema").cloned().unwrap_or(json!({})),
        };
        if port["many"] == true {
            schema = json!({"type":"array","items":schema});
        }
        if port["optional"] != true {
            required.push(name.clone());
        }
        properties.0.insert(name, schema);
    }
    let name = compiled.manifest.value["key"]
        .as_str()
        .unwrap()
        .trim_start_matches("organism:");
    let description = compiled
        .manifest
        .value
        .get("note")
        .unwrap_or(&compiled.manifest.value["name"]);
    let schema = json!({"type":"object","additionalProperties":false,"properties":properties.0,"required":required});
    match format {
        "openai" => Ok(
            json!({"type":"function","function":{"name":name,"description":description,"parameters":schema}}),
        ),
        "anthropic" => Ok(json!({"name":name,"description":description,"input_schema":schema})),
        _ => Err(Error::invalid("tool format must be openai or anthropic")),
    }
}
#[derive(Default)]
struct MapBuilder(serde_json::Map<String, Value>);

fn listing(dir: &Path, kind: &str) -> Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    match std::fs::read_dir(dir.join(kind)) {
        Ok(entries) => {
            for entry in entries {
                let path = entry?.path();
                if path.extension().and_then(|e| e.to_str()) == Some("json") {
                    files.push(path);
                }
            }
        }
        Err(e) if e.kind() == io::ErrorKind::NotFound => {}
        Err(e) => return Err(e.into()),
    }
    files.sort();
    Ok(files)
}

fn disp(value: &Value) -> String {
    value
        .as_str()
        .map(String::from)
        .unwrap_or_else(|| canonical(value).unwrap_or_else(|_| "null".into()))
}

/// The receipt inspector: a bounded summary of cell statuses and effect
/// counts, matching `algal inspect` on the TypeScript CLI.
fn inspect_receipt(raw: &Value) -> Value {
    let mut cells = serde_json::Map::new();
    if let Some(map) = raw["cells"].as_object() {
        for (name, cell) in map {
            let mut entry = serde_json::Map::new();
            entry.insert("status".into(), cell["status"].clone());
            if cell["work"].as_u64().unwrap_or(0) > 0 {
                entry.insert("work".into(), cell["work"].clone());
            }
            for field in [
                "failure",
                "shadowOut",
                "rounds",
                "items",
                "via",
                "slot",
                "effectDigest",
            ] {
                if !cell[field].is_null() {
                    entry.insert(field.into(), cell[field].clone());
                }
            }
            if let Some(calls) = cell["toolCalls"].as_array().filter(|t| !t.is_empty()) {
                entry.insert("toolCalls".into(), json!(calls.len()));
            }
            cells.insert(name.clone(), Value::Object(entry));
        }
    }
    json!({
        "contract":raw["contract"],
        "manifestKey":raw["manifestKey"],
        "outcome":raw["outcome"],
        "work":raw["work"],
        "cells":cells,
        "effects":raw["effects"].as_array().map(|e| e.len()).unwrap_or(0),
        "failure":raw["failure"],
        "digest":raw["digest"],
    })
}

async fn execute(cli: Cli) -> Result<bool> {
    if let Commands::Application {
        command: ApplicationCommand::Report { view },
        ..
    } = &cli.command
    {
        print!(
            "{}",
            algal::application_report::render(&load(view, 262_144)?)?
        );
        return Ok(true);
    }
    match cli.command {
        Commands::Demo { command } => {
            if std::env::args().any(|arg| arg == "--dir" || arg.starts_with("--dir=")) {
                return Err(Error::invalid(
                    "demo commands use their explicit root and accept no --dir",
                ));
            }
            let report = match command {
                DemoCommand::Prove { root } => algal::demo::prove(&root).await?,
                DemoCommand::FixtureStart { root, mode, token } => {
                    algal::demo::fixture_start(&root, &mode, &token).await?
                }
                DemoCommand::FixtureRecover {
                    root,
                    token,
                    intent,
                } => algal::demo::fixture_recover(&root, &token, &intent).await?,
                DemoCommand::Start { root, evidence } => {
                    algal::demo::start(&root, evidence.map(|file| load(&file, 8192)).transpose()?)
                        .await?
                }
                DemoCommand::Inspect { root } => algal::demo::refresh(&root).await?,
                DemoCommand::Approve {
                    root,
                    proposal,
                    action,
                } => algal::demo::choose(&root, &proposal, &action, true).await?,
                DemoCommand::Deny {
                    root,
                    proposal,
                    action,
                } => algal::demo::choose(&root, &proposal, &action, false).await?,
                DemoCommand::Export { root } => {
                    let evidence = algal::demo::export(&root).await?;
                    print!("{}", canonical(&evidence)?);
                    return Ok(true);
                }
                DemoCommand::Verify { file } => {
                    algal::process_evidence::verify_process_evidence(&load(
                        &file,
                        MAX_DOCUMENT_BYTES,
                    )?)
                    .await?
                }
            };
            emit(&report)?;
            Ok(true)
        }
        Commands::Civ {
            live,
            goals,
            mut options,
        } => {
            let _lock = algal::civilization::lock(&cli.dir)?;
            let mut store = Store::open(&cli.dir, true)?;
            if live
                && options.host.is_none()
                && options.gateway_model.is_none()
                && options.jev.is_none()
                && options.recall.is_none()
                && options.base_url.is_none()
                && !options.apple
                && options.agent.is_none()
            {
                options.gateway_model = Some("alibaba/qwen3.7-flash".into());
            }
            let provider = if live {
                Some(host(&options, &cli.dir)?)
            } else {
                None
            };
            let result =
                algal::civilization::evolve(&mut store, provider, goals.as_deref()).await?;
            let verified = algal::civilization::verify_population(
                &result["population"],
                &store,
                goals.as_deref(),
            )
            .await?;
            emit(
                &json!({"head":result["head"],"population":result["population"],"verification":verified}),
            )?;
            Ok(!object(&result["population"]["members"])?.is_empty())
        }
        Commands::CivVerify { population, goals } => {
            let store = Store::open(&cli.dir, false)?;
            let population = match population {
                Some(file) => {
                    let value = load(&file, 1_048_576)?;
                    value.get("population").cloned().unwrap_or(value)
                }
                None => {
                    let head = store
                        .get_slot("civilization")?
                        .ok_or_else(|| Error::new("STORE_MISS", "no civilization head"))?;
                    store
                        .get(
                            "values",
                            head["head"]
                                .as_str()
                                .ok_or_else(|| Error::invalid("population head"))?,
                        )?
                        .ok_or_else(|| Error::new("STORE_MISS", "population snapshot missing"))?
                }
            };
            emit(
                &algal::civilization::verify_population(&population, &store, goals.as_deref())
                    .await?,
            )?;
            Ok(true)
        }
        Commands::Bench {
            command,
            config,
            out,
            apple_bridge,
            tools,
            modules,
            transports,
        } => match command {
            Some(BenchCommand::Verify {
                report,
                tools,
                modules,
            }) => {
                let mut store = Store::open(&cli.dir, false)?;
                if let Some(path) = modules {
                    store.load_modules(&path)?;
                }
                let mut host = Host::default();
                if let Some(path) = tools {
                    host.load_tools(&path)?;
                }
                host.install_mailboxes(MailboxService::open(&cli.dir))?;
                let result =
                    algal::bench::verify(&load(&report, MAX_DOCUMENT_BYTES)?, &store, &host)
                        .await?;
                emit(&result)?;
                Ok(result["ok"] == true)
            }
            Some(BenchCommand::Inspect { report }) => {
                emit(&algal::bench::inspect(&load(&report, MAX_DOCUMENT_BYTES)?)?)?;
                Ok(true)
            }
            None => {
                let config = config.ok_or_else(|| {
                    Error::invalid(
                        "usage: algal bench <config.json> | bench verify|inspect <report.json>",
                    )
                })?;
                let mut store = Store::open(&cli.dir, true)?;
                if let Some(path) = modules {
                    store.load_modules(&path)?;
                }
                let mut host = Host::default();
                if let Some(path) = tools {
                    host.load_tools(&path)?;
                }
                host.install_mailboxes(MailboxService::open(&cli.dir))?;
                let mut transports_map = Transports::new();
                if let Some(file) = transports {
                    let value = load(&file, 65_536)?;
                    if object(&value)?.len() > 16 {
                        return Err(Error::limit("transport count"));
                    }
                    for (name, target) in object(&value)? {
                        let target = target
                            .as_str()
                            .ok_or_else(|| Error::invalid("transport directory"))?;
                        if target.contains("://") {
                            return Err(Error::new(
                                "EFFECT_UNBOUND",
                                "native transports currently require local bundle directories",
                            ));
                        }
                        transports_map.insert(name.clone(), PathBuf::from(target));
                    }
                }
                let config = algal::bench::load_config(&config, apple_bridge.as_deref())?;
                let report = algal::bench::run(&config, &mut store, &host, &transports_map).await?;
                if let Some(path) = out {
                    std::fs::write(&path, canonical(&report)?)?;
                }
                emit(&report)?;
                Ok(true)
            }
        },
        Commands::Foundry {
            command,
            config,
            out,
            options,
        } => {
            let verifier =
                |tools: Option<PathBuf>, modules: Option<PathBuf>| -> Result<(Store, Host)> {
                    let mut store = Store::open(&cli.dir, false)?;
                    if let Some(path) = modules {
                        store.load_modules(&path)?;
                    }
                    let mut host = Host::default();
                    if let Some(path) = tools {
                        host.load_tools(&path)?;
                    }
                    host.install_mailboxes(MailboxService::open(&cli.dir))?;
                    Ok((store, host))
                };
            match command {
                Some(FoundryCommand::Verify {
                    report,
                    tools,
                    modules,
                }) => {
                    let (store, host) = verifier(tools, modules)?;
                    let value = load(&report, MAX_DOCUMENT_BYTES)?;
                    // An exhausted foundry writes its terminal habitat budget
                    // record in place of a report; `verify` accepts either.
                    let result = if value["contract"] == algal::habitat_budget::CONTRACT {
                        algal::habitat_budget::verify(&value, &store, &host).await?
                    } else {
                        algal::foundry::verify(&value, &store, &host).await?
                    };
                    emit(&result)?;
                    Ok(result["ok"] == true)
                }
                Some(FoundryCommand::Inspect { report }) => {
                    emit(&algal::foundry::inspect(&load(
                        &report,
                        MAX_DOCUMENT_BYTES,
                    )?)?)?;
                    Ok(true)
                }
                Some(FoundryCommand::Pack {
                    report,
                    out,
                    tools,
                    modules,
                }) => {
                    let (store, host) = verifier(tools, modules)?;
                    emit(
                        &algal::foundry::pack_promoted(
                            &load(&report, MAX_DOCUMENT_BYTES)?,
                            false,
                            &store,
                            &host,
                            &out,
                        )
                        .await?,
                    )?;
                    Ok(true)
                }
                Some(FoundryCommand::SearchVerify {
                    report,
                    tools,
                    modules,
                }) => {
                    let (store, host) = verifier(tools, modules)?;
                    let result = algal::foundry::verify_search(
                        &load(&report, MAX_DOCUMENT_BYTES)?,
                        &store,
                        &host,
                    )
                    .await?;
                    emit(&result)?;
                    Ok(result["ok"] == true)
                }
                Some(FoundryCommand::SearchInspect { report }) => {
                    emit(&algal::foundry::inspect_search(&load(
                        &report,
                        MAX_DOCUMENT_BYTES,
                    )?)?)?;
                    Ok(true)
                }
                Some(FoundryCommand::SearchPack {
                    report,
                    out,
                    tools,
                    modules,
                }) => {
                    let (store, host) = verifier(tools, modules)?;
                    emit(
                        &algal::foundry::pack_promoted(
                            &load(&report, MAX_DOCUMENT_BYTES)?,
                            true,
                            &store,
                            &host,
                            &out,
                        )
                        .await?,
                    )?;
                    Ok(true)
                }
                Some(FoundryCommand::Search {
                    config,
                    out,
                    mut options,
                }) => {
                    options.write = true;
                    let (mut store, mut host, transports) = prepare(&options, &cli.dir)?;
                    let config = algal::foundry::load_config(&config, true)?;
                    let generator = config.generator.as_ref().ok_or_else(|| {
                        Error::invalid("foundry search requires a generator in the config")
                    })?;
                    let search = config.search.as_ref().ok_or_else(|| {
                        Error::invalid("foundry search requires a search block in the config")
                    })?;
                    let report = algal::foundry::search(
                        generator,
                        &config.candidates,
                        &config.cases,
                        search,
                        config.scorer.as_ref(),
                        &mut store,
                        &mut host,
                        &transports,
                    )
                    .await?;
                    if let Some(path) = out {
                        std::fs::write(&path, canonical(&report)?)?;
                    }
                    emit(&report)?;
                    Ok(true)
                }
                None => {
                    let config = config.ok_or_else(|| {
                        Error::invalid(
                            "usage: algal foundry <config.json> | foundry verify|inspect|pack <report.json>",
                        )
                    })?;
                    let mut options = options;
                    options.write = true;
                    let (mut store, mut host, transports) = prepare(&options, &cli.dir)?;
                    let mut config = algal::foundry::load_config(&config, false)?;
                    // One account admits every run of this activity: the
                    // generator, each selection case, then holdout.
                    let mut account = config
                        .budget
                        .map(|limits| algal::habitat_budget::Account::new("foundry", limits))
                        .transpose()?;
                    let result: Result<Value> = async {
                        let lineage = match &config.generator {
                            Some(generator) => {
                                let (generator_digest, receipt_digest, generated) =
                                    algal::foundry::generate_in(
                                        &generator.manifest,
                                        &generator.args,
                                        &generator.output,
                                        generator.field.as_deref(),
                                        &mut store,
                                        &mut host,
                                        &transports,
                                        account.as_mut(),
                                    )
                                    .await?;
                                config.candidates.extend(generated);
                                Some((generator_digest, receipt_digest))
                            }
                            None => None,
                        };
                        algal::foundry::run_in(
                            &config.candidates,
                            &config.cases,
                            config.scorer.as_ref(),
                            lineage,
                            &mut store,
                            &mut host,
                            &transports,
                            account.as_mut(),
                        )
                        .await
                    }
                    .await;
                    let report = match result {
                        Ok(report) => report,
                        // Exhaustion is a terminal outcome, not a partial
                        // report: emit the account record. Completed runs
                        // keep their stored receipts.
                        Err(error) => {
                            match account.as_ref().filter(|account| account.exhausted()) {
                                Some(account) => account.record()?,
                                None => return Err(error),
                            }
                        }
                    };
                    if let Some(path) = out {
                        std::fs::write(&path, canonical(&report)?)?;
                    }
                    emit(&report)?;
                    Ok(report["contract"] != algal::habitat_budget::CONTRACT)
                }
            }
        }
        Commands::Run {
            manifest: file,
            options,
        } => {
            let manifest = manifest(&file)?;
            let (mut store, mut host, transports) = prepare(&options, &cli.dir)?;
            let receipt = runtime::run(
                manifest.clone(),
                args(&options)?,
                &mut store,
                &mut host,
                &transports,
                None,
            )
            .await?;
            if options.write {
                eprintln!("receipt {}", persist(&mut store, &manifest, &receipt)?);
            }
            unbound_hint(&receipt, &manifest, &host);
            emit(&receipt)?;
            Ok(receipt["outcome"] == "complete")
        }
        Commands::Call {
            bundle,
            interface,
            mut options,
        } => {
            options.write = true;
            let (mut store, mut host, transports) = prepare(&options, &cli.dir)?;
            let manifest = unpack(&load(&bundle, MAX_DOCUMENT_BYTES)?, &mut store)?;
            let raw = args(&options)?;
            let input = if interface {
                let declared = manifest.value.get("interface").ok_or_else(|| {
                    Error::invalid("call --interface requires a declared manifest interface")
                })?;
                let inputs = object(&declared["inputs"])?;
                let supplied = object(&raw)?;
                if inputs.len() != supplied.len()
                    || supplied.keys().any(|name| !inputs.contains_key(name))
                {
                    return Err(Error::invalid(
                        "call --interface requires exactly the declared input names",
                    ));
                }
                let mut mapped = json!({});
                for (name, target) in inputs {
                    let cell = target["cell"].as_str().unwrap();
                    let port = target["port"].as_str().unwrap();
                    if mapped.get(cell).is_none() {
                        mapped[cell] = json!({});
                    }
                    if let Some(previous) = mapped[cell].get(port)
                        && canonical(previous)? != canonical(&supplied[name])?
                    {
                        return Err(Error::invalid(
                            "call --interface aliases contain conflicting arguments",
                        ));
                    }
                    mapped[cell][port] = supplied[name].clone();
                }
                mapped
            } else {
                raw
            };
            let receipt = runtime::run(
                manifest.clone(),
                input,
                &mut store,
                &mut host,
                &transports,
                None,
            )
            .await?;
            unbound_hint(&receipt, &manifest, &host);
            let reference = persist(&mut store, &manifest, &receipt)?;
            let ok = receipt["outcome"] == "complete";
            let outputs: serde_json::Map<String, Value> = if interface {
                object(&manifest.value["interface"]["outputs"])?
                    .iter()
                    .filter_map(|(name, target)| {
                        receipt["cells"][target["cell"].as_str().unwrap()]["outputs"]
                            .get(target["port"].as_str().unwrap())
                            .map(|value| (name.clone(), value.clone()))
                    })
                    .collect()
            } else {
                object(&receipt["cells"])?
                    .iter()
                    .filter_map(|(name, cell)| {
                        cell.get("outputs")
                            .map(|outputs| (name.clone(), outputs.clone()))
                    })
                    .collect()
            };
            let mut result = json!({"ok":ok,"outputs":outputs,"receiptDigest":reference,"manifestDigest":receipt["manifestDigest"]});
            if !ok {
                result["error"] = match receipt.get("failure") {
                    Some(failure) => json!({"code":failure["code"],"message":failure["message"]}),
                    None => json!({"code":"FAILED","message":receipt["outcome"]}),
                };
            }
            emit(&result)?;
            Ok(ok)
        }
        Commands::Check {
            manifest: file,
            options,
        } => {
            let (mut store, host, transports) = prepare(&options, &cli.dir)?;
            let compiled = compile(
                manifest(&file)?,
                &mut store,
                &host.tool_signatures(),
                &transports,
                0,
            )?;
            let cells: Vec<_> = compiled
                .manifest
                .cells
                .iter()
                .map(|cell| json!({"id":cell["id"],"kind":cell["kind"]}))
                .collect();
            emit(
                &json!({"ok":true,"key":compiled.manifest.value["key"],"digest":compiled.manifest.digest()?,"cells":cells,"edges":compiled.manifest.edges.len()}),
            )?;
            Ok(true)
        }
        Commands::Explain {
            manifest: file,
            options,
        } => {
            let (mut store, host, transports) = prepare(&options, &cli.dir)?;
            let compiled = compile(
                manifest(&file)?,
                &mut store,
                &host.tool_signatures(),
                &transports,
                0,
            )?;
            let cells: serde_json::Map<String, Value> = compiled.manifest.cells.iter().map(|cell| {
                let name = cell["id"].as_str().unwrap();
                let summarize = |ports: &algal::contract::Ports| -> serde_json::Map<String, Value> {
                    ports.iter().map(|(name, port)| {
                        let mut value = json!({"type":port["type"]});
                        for field in ["optional", "many"] {
                            if port[field] == true { value[field] = json!(true); }
                        }
                        for field in ["labels", "schema", "schemaVersion", "capability"] {
                            if let Some(v) = port.get(field) { value[field] = v.clone(); }
                        }
                        (name.clone(), value)
                    }).collect()
                };
                (name.to_owned(), json!({"kind":cell["kind"],"inputs":summarize(&compiled.signatures[name].inputs),"outputs":summarize(&compiled.signatures[name].outputs)}))
            }).collect();
            let edges: Vec<_> = compiled.manifest.edges.iter().map(|edge| {
                let mut value = json!({"from":format!("{}.{}",edge["from"]["cell"].as_str().unwrap(),edge["from"]["port"].as_str().unwrap()),"to":format!("{}.{}",edge["to"]["cell"].as_str().unwrap(),edge["to"]["port"].as_str().unwrap())});
                if let Some(guard) = edge.get("guard") { value["guard"] = guard.clone(); }
                if let Some(on) = edge.get("on") { value["on"] = on.clone(); }
                value
            }).collect();
            emit(
                &json!({"key":compiled.manifest.value["key"],"digest":compiled.manifest.digest()?,"cells":cells,"edges":edges}),
            )?;
            Ok(true)
        }
        Commands::Digest { manifest: file } => {
            emit(&json!({"digest":manifest(&file)?.digest()?}))?;
            Ok(true)
        }
        Commands::Inspect { receipt } => {
            let receipt = load(&receipt, MAX_DOCUMENT_BYTES)?;
            algal::receipt::validate(&receipt)?;
            emit(&inspect_receipt(&receipt))?;
            Ok(true)
        }
        Commands::Diff { a, b } => {
            let a = load(&a, MAX_DOCUMENT_BYTES)?;
            let b = load(&b, MAX_DOCUMENT_BYTES)?;
            algal::receipt::validate(&a)?;
            algal::receipt::validate(&b)?;
            let mut mismatches = algal::receipt::diff(&a, &b);
            if a["manifestDigest"] != b["manifestDigest"] {
                mismatches.insert(
                    0,
                    format!(
                        "manifestDigest: {} vs {}",
                        disp(&a["manifestDigest"]),
                        disp(&b["manifestDigest"])
                    ),
                );
            }
            emit(&json!({
                "same":mismatches.is_empty(),
                "a":a["digest"],
                "b":b["digest"],
                "mismatches":mismatches,
            }))?;
            Ok(mismatches.is_empty())
        }
        Commands::Runs => {
            let mut runs = Vec::new();
            for path in listing(&cli.dir, "runs")? {
                let digest = format!(
                    "sha256:{}",
                    path.file_stem().and_then(|s| s.to_str()).unwrap_or("")
                );
                match load(&path, MAX_DOCUMENT_BYTES) {
                    Ok(raw) => runs.push(json!({
                        "digest":digest,
                        "manifestKey":raw["manifestKey"],
                        "outcome":raw["outcome"],
                        "effects":raw["effects"].as_array().map(|e| e.len()).unwrap_or(0),
                    })),
                    Err(error) => runs.push(json!({"digest":digest,"error":error.message})),
                }
            }
            runs.sort_by(|a, b| {
                format!("{}{}", a["manifestKey"].as_str().unwrap_or(""), a["digest"]).cmp(&format!(
                    "{}{}",
                    b["manifestKey"].as_str().unwrap_or(""),
                    b["digest"]
                ))
            });
            emit(&json!({"dir":cli.dir.join("runs"),"runs":runs}))?;
            Ok(true)
        }
        Commands::Manifests => {
            let mut manifests = Vec::new();
            for path in listing(&cli.dir, "manifests")? {
                let digest = format!(
                    "sha256:{}",
                    path.file_stem().and_then(|s| s.to_str()).unwrap_or("")
                );
                match load(&path, MAX_DOCUMENT_BYTES) {
                    Ok(raw) => manifests.push(json!({
                        "digest":digest,
                        "key":raw["key"],
                        "name":raw["name"],
                        "cells":raw["cells"].as_array().map(|c| c.len()).unwrap_or(0),
                    })),
                    Err(error) => manifests.push(json!({"digest":digest,"error":error.message})),
                }
            }
            manifests.sort_by(|a, b| {
                format!("{}{}", a["key"].as_str().unwrap_or(""), a["digest"]).cmp(&format!(
                    "{}{}",
                    b["key"].as_str().unwrap_or(""),
                    b["digest"]
                ))
            });
            emit(&json!({"dir":cli.dir.join("manifests"),"manifests":manifests}))?;
            Ok(true)
        }
        Commands::Manifest { digest } => {
            let store = Store::open(&cli.dir, false)?;
            emit(&store.get("manifests", &digest)?.ok_or_else(|| {
                Error::new("STORE_MISS", format!("manifest {digest} not found"))
            })?)?;
            Ok(true)
        }
        Commands::Slots => {
            let mut slots = Vec::new();
            for path in listing(&cli.dir, "slots")? {
                let name = path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_owned();
                match load(&path, 262_144) {
                    Ok(value) => slots.push(json!({"name":name,"value":value})),
                    Err(error) => slots.push(json!({"name":name,"error":error.message})),
                }
            }
            emit(&json!({"dir":cli.dir.join("slots"),"slots":slots}))?;
            Ok(true)
        }
        Commands::Slot { command } => {
            let mut store = Store::open(&cli.dir, true)?;
            match command {
                SlotCommand::Get { name } => emit(&store.get_slot(&name)?.ok_or_else(|| {
                    Error::new("STORE_MISS", format!("slot \"{name}\" is empty"))
                })?)?,
                SlotCommand::Set { name, value } => {
                    store.set_slot(&name, &load(&value, 1_048_576)?)?;
                    emit(&json!({"name":name,"set":true}))?;
                }
            }
            Ok(true)
        }
        Commands::Process {
            command: ProcessCommand::VerifyEvidence { file },
        } => {
            if std::env::args().skip(1).any(|arg| arg.starts_with("--")) {
                return Err(Error::invalid(
                    "process verify-evidence accepts no host flags",
                ));
            }
            emit(
                &algal::process_evidence::verify_process_evidence(&load(
                    &file,
                    MAX_DOCUMENT_BYTES,
                )?)
                .await?,
            )?;
            Ok(true)
        }
        Commands::Process { command } => {
            let mut service = ProcessService::open(&cli.dir)?;
            match command {
                ProcessCommand::VerifyEvidence { .. } => unreachable!(),
                ProcessCommand::Export { name, tools } => {
                    let mut host = Host::default();
                    host.install_mailboxes(MailboxService::open(&cli.dir))?;
                    if let Some(file) = tools {
                        let definitions = load(&file, 1_048_576)?;
                        let mut signatures = serde_json::Map::new();
                        for (name, entry) in object(&definitions)? {
                            if name.is_empty()
                                || name.len() > 128
                                || !name.as_bytes()[0].is_ascii_alphanumeric()
                                || !name.bytes().all(|b| {
                                    b.is_ascii_lowercase()
                                        || b.is_ascii_digit()
                                        || b == b'.'
                                        || b == b'-'
                                })
                            {
                                return Err(Error::invalid("evidence CLI tool name"));
                            }
                            algal::contract::keys(entry, &["signature", "exec"])?;
                            if entry.get("exec").is_some_and(|value| !value.is_string()) {
                                return Err(Error::invalid("evidence CLI tool exec must be text"));
                            }
                            signatures.insert(name.clone(), entry["signature"].clone());
                        }
                        for (name, tool) in
                            algal::process_evidence::evidence_host(&Value::Object(signatures))?
                                .tools
                        {
                            if host.tools.insert(name, tool).is_some() {
                                return Err(Error::invalid("duplicate evidence tool"));
                            }
                        }
                    }
                    let snapshot = service.inspect(&name)?;
                    let evidence = algal::process_evidence::export_process_evidence(
                        &snapshot,
                        &service.store,
                        &host,
                    )
                    .await?;
                    // A maximum-size capsule must round-trip through the same
                    // byte-bounded reader; do not append an extra newline.
                    print!("{}", canonical(&evidence)?);
                }
                ProcessCommand::Create {
                    name,
                    manifest: file,
                    max_generations,
                    mut options,
                } => {
                    options.write = true;
                    let (store, host, transports) = prepare(&options, &cli.dir)?;
                    service.store = store;
                    emit(&serde_json::to_value(service.create(
                        &name,
                        manifest(&file)?,
                        args(&options)?,
                        max_generations,
                        &host,
                        &transports,
                    )?)?)?;
                }
                ProcessCommand::List => emit(&json!({"processes":service.list()?}))?,
                ProcessCommand::Inspect { name } => {
                    emit(&serde_json::to_value(service.inspect(&name)?)?)?
                }
                ProcessCommand::Journal { name } => emit(&service.journal(&name)?)?,
                ProcessCommand::Tick {
                    name,
                    journal,
                    max_recoveries,
                    mut options,
                } => {
                    options.write = true;
                    let (store, mut host, transports) = prepare(&options, &cli.dir)?;
                    service.store = store;
                    let state = service
                        .tick_journal(&name, None, &mut host, &transports, journal, max_recoveries)
                        .await?;
                    let successful = !["failed", "stuck"].contains(&state.process.status.as_str());
                    emit(&serde_json::to_value(state)?)?;
                    return Ok(successful);
                }
                ProcessCommand::Recover {
                    name,
                    expected_intent,
                    mut options,
                } => {
                    options.write = true;
                    let (store, mut host, transports) = prepare(&options, &cli.dir)?;
                    service.store = store;
                    let state = service
                        .recover(&name, &expected_intent, &mut host, &transports)
                        .await?;
                    let successful = !["failed", "stuck"].contains(&state.process.status.as_str());
                    emit(&serde_json::to_value(state)?)?;
                    return Ok(successful);
                }
                ProcessCommand::Schedule {
                    max_ticks,
                    journal,
                    max_recoveries,
                    mut options,
                } => {
                    options.write = true;
                    let (store, mut host, transports) = prepare(&options, &cli.dir)?;
                    service.store = store;
                    emit(
                        &service
                            .schedule_journal(
                                max_ticks,
                                &mut host,
                                &transports,
                                journal,
                                max_recoveries,
                            )
                            .await?,
                    )?;
                }
                ProcessCommand::Verify { name, options } => {
                    let (store, host, _) = prepare(&options, &cli.dir)?;
                    service.store = store;
                    emit(&service.verify(&name, &host).await?)?;
                }
            }
            Ok(true)
        }
        Commands::Mailbox { command } => {
            let service = MailboxService::open(&cli.dir);
            match command {
                MailboxCommand::Create {
                    name,
                    max_messages,
                    max_message_bytes,
                } => emit(&serde_json::to_value(service.create(
                    &name,
                    max_messages,
                    max_message_bytes,
                )?)?)?,
                MailboxCommand::List => emit(&json!({
                    "dir":cli.dir.join("mailboxes"),
                    "mailboxes":service.list()?,
                }))?,
                MailboxCommand::Send {
                    capability,
                    value,
                    idempotency_key,
                } => {
                    let key = match idempotency_key {
                        Some(key) => key,
                        None => mailbox::external_wake_key()?,
                    };
                    emit(&service.send(&capability, load(&value, MAX_DOCUMENT_BYTES)?, &key)?)?;
                }
                MailboxCommand::Receive { capability } => emit(&service.receive(&capability)?)?,
                MailboxCommand::Revoke { capability } => {
                    service.revoke(&capability)?;
                    emit(&json!({"handle":capability,"revoked":true}))?;
                }
            }
            Ok(true)
        }
        Commands::Example { id, examples } => {
            let valid = !id.is_empty()
                && id.len() <= 64
                && id.chars().next().is_some_and(|c| c.is_ascii_lowercase())
                && id
                    .chars()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
            if !valid {
                return Err(Error::invalid("usage: algal example <id>"));
            }
            let algal = examples.join(format!("{id}.algal.json"));
            let legacy = examples.join(format!("{id}.algal.json"));
            let path = if algal.exists() { algal } else { legacy };
            emit(&load(&path, 1_048_576)?)?;
            Ok(true)
        }
        Commands::Verify {
            receipt: file,
            manifest: manifest_file,
            options,
        } => {
            let receipt = load(&file, MAX_DOCUMENT_BYTES)?;
            let (store, host, _) = prepare(&options, &cli.dir)?;
            let manifest = match manifest_file {
                Some(file) => manifest(&file)?,
                None => store.manifest(
                    receipt["manifestDigest"]
                        .as_str()
                        .ok_or_else(|| Error::invalid("receipt manifestDigest"))?,
                )?,
            };
            let result = runtime::verify(&receipt, manifest, &store, &host).await?;
            emit(&result)?;
            Ok(result["ok"] == true)
        }
        Commands::Resume {
            receipt: file,
            manifest: manifest_file,
            options,
        } => {
            let receipt = load(&file, MAX_DOCUMENT_BYTES)?;
            let (mut store, mut host, transports) = prepare(&options, &cli.dir)?;
            let manifest = match manifest_file {
                Some(file) => manifest(&file)?,
                None => store.manifest(
                    receipt["manifestDigest"]
                        .as_str()
                        .ok_or_else(|| Error::invalid("receipt manifestDigest"))?,
                )?,
            };
            let resumed = runtime::resume(
                &receipt,
                manifest.clone(),
                &mut store,
                &mut host,
                &transports,
            )
            .await?;
            if options.write {
                eprintln!("receipt {}", persist(&mut store, &manifest, &resumed)?);
            }
            emit(&resumed)?;
            Ok(resumed["outcome"] == "complete")
        }
        Commands::Suite { examples, modules } => {
            if !examples.is_dir() {
                return Err(Error::new(
                    "IO_FAILED",
                    format!(
                        "examples directory {} not found; run from the repository checkout or pass --examples <dir>",
                        examples.display()
                    ),
                ));
            }
            let mut store = Store::open(&cli.dir, true)?;
            if let Some(path) = modules {
                store.load_modules(&path)?;
            }
            let result = algal::suite::run(&examples, &mut store).await?;
            emit(&result)?;
            Ok(result["ok"] == true)
        }
        Commands::Pack {
            manifest: file,
            modules,
            out,
        } => {
            let mut store = Store::open(&cli.dir, false)?;
            if let Some(modules) = modules {
                store.load_modules(&modules)?;
            }
            let bundle = pack(&manifest(&file)?, &store)?;
            if let Some(out) = out {
                std::fs::create_dir_all(&out)?;
                let root = bundle["root"].as_str().unwrap();
                let file = out.join(format!("{}.bundle.json", &root[7..]));
                let bytes = canonical(&bundle)?;
                match std::fs::OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .open(&file)
                {
                    Ok(mut f) => {
                        use std::io::Write;
                        f.write_all(bytes.as_bytes())?;
                    }
                    Err(e) if e.kind() == io::ErrorKind::AlreadyExists => {
                        if canonical(&load(&file, MAX_DOCUMENT_BYTES)?)? != bytes {
                            return Err(Error::new(
                                "DIGEST_MISMATCH",
                                "existing bundle file differs",
                            ));
                        }
                    }
                    Err(e) => return Err(e.into()),
                }
            }
            emit(&bundle)?;
            Ok(true)
        }
        Commands::Unpack { bundle } => {
            let mut store = Store::open(&cli.dir, true)?;
            let manifest = unpack(&load(&bundle, MAX_DOCUMENT_BYTES)?, &mut store)?;
            emit(&json!({"root":manifest.digest()?,"ok":true}))?;
            Ok(true)
        }
        Commands::ToolDef {
            manifest: file,
            modules,
            format,
        } => {
            let mut store = Store::open(&cli.dir, false)?;
            if let Some(modules) = modules {
                store.load_modules(&modules)?;
            }
            let mut tools = Host::default();
            tools.install_mailboxes(MailboxService::open(&cli.dir))?;
            emit(&tool_definition(
                manifest(&file)?,
                &mut store,
                &format,
                &tools,
            )?)?;
            Ok(true)
        }
        Commands::Store { command } => {
            let mut store = Store::open(&cli.dir, true)?;
            match command {
                StoreCommand::Put { file, kind } => {
                    let value = if file == "-" {
                        read_json(io::stdin().lock(), 262_144)?
                    } else {
                        load(Path::new(&file), 262_144)?
                    };
                    let bytes = canonical(&value)?.len();
                    emit(&json!({"ref":store.put(&kind, &value)?, "bytes":bytes}))?;
                }
                StoreCommand::Get { digest, kind } => emit(
                    &store
                        .get(&kind, &digest)?
                        .ok_or_else(|| Error::new("STORE_MISS", "value not in store"))?,
                )?,
                StoreCommand::Has { digest, kind } => {
                    emit(&json!({"ref":digest,"ok":store.get(&kind, &digest)?.is_some()}))?
                }
            }
            Ok(true)
        }
        Commands::Memory { command } => {
            match command {
                MemoryCommand::Query { snapshot, program } => emit(&memory::query(
                    &load(&snapshot, 262_144)?,
                    &load(&program, 65_536)?,
                )?)?,
                MemoryCommand::Verify {
                    snapshot,
                    program,
                    result,
                } => {
                    let ok = memory::verify(
                        &load(&snapshot, 262_144)?,
                        &load(&program, 65_536)?,
                        &load(&result, 262_144)?,
                    )?;
                    emit(&json!({"ok":ok}))?;
                    return Ok(ok);
                }
                MemoryCommand::Remember {
                    source,
                    relation,
                    tuple,
                    snapshot,
                } => {
                    let source = load(&source, 262_144)?;
                    let snapshot = snapshot
                        .map(|path| load(&path, 262_144))
                        .transpose()?
                        .unwrap_or(json!({"contract":"algal.memory.v1","facts":[]}));
                    let tuple: Vec<Value> = serde_json::from_str(&tuple)?;
                    let next = memory::remember(&snapshot, &relation, tuple, &source)?;
                    let mut store = Store::open(&cli.dir, true)?;
                    emit(
                        &json!({"source":store.put("values",&source)?,"previous":store.put("values",&snapshot)?,"snapshot":store.put("values",&next)?,"memory":next}),
                    )?;
                }
            }
            Ok(true)
        }
        Commands::Application {
            policy,
            restoration_policy,
            selection_environment,
            channels,
            command,
        } => {
            let channels_dir = channels.unwrap_or_else(|| cli.dir.join("channels"));
            let mut host = match &policy {
                Some(path) => Some(PolicyHost::new(&load(path, 262_144)?, &channels_dir)?),
                None => None,
            };
            if let Some(path) = restoration_policy {
                host.as_mut()
                    .ok_or_else(|| {
                        Error::invalid("Restoration authority requires an application host policy")
                    })?
                    .set_restoration_policy(&load(&path, 262_144)?)?;
            }
            if let Some(environment) = selection_environment {
                host.as_mut()
                    .ok_or_else(|| {
                        Error::invalid("Selection environment requires an application host policy")
                    })?
                    .set_selection_environment(&environment)?;
            }
            let denied = NoAdmission;
            let engine_sha = digest_bytes(&std::fs::read(std::env::current_exe()?)?);
            let engine = NativeEngine::new(engine_sha.trim_start_matches("sha256:"), 10_000)?;
            if let Some(host) = host.as_mut() {
                host.set_memory_engine(engine.clone());
            }
            // Read-only commands (inspect/pending/put) admit nothing, so a
            // missing policy substitutes a host that denies all admission.
            let mut service = match &host {
                Some(host) => application::Service::new(&cli.dir, host)?,
                None => application::Service::new(&cli.dir, &denied)?,
            };
            let memory_service = match &host {
                Some(host) => MemoryService {
                    engine: &engine,
                    admission: host,
                },
                None => MemoryService {
                    engine: &engine,
                    admission: &denied,
                },
            };
            match command {
                ApplicationCommand::Put { value } => {
                    let digest = service
                        .store
                        .put("values", &app_memory::app_json(&load(&value, 262_144)?)?)?;
                    emit(&json!({"digest": digest}))?;
                }
                ApplicationCommand::Scope { scope } => {
                    let digest =
                        memory_service.put_scope(&mut service.store, &load(&scope, 262_144)?)?;
                    emit(&json!({"scope": digest}))?;
                }
                ApplicationCommand::Snapshot { memory } => {
                    let digest =
                        memory_service.snapshot(&mut service.store, &load(&memory, 262_144)?)?;
                    emit(&json!({"memory": digest}))?;
                }
                ApplicationCommand::Observe { observation } => {
                    let digest = memory_service
                        .observe(&mut service.store, &load(&observation, 262_144)?)?;
                    emit(&json!({"observation": digest}))?;
                }
                ApplicationCommand::Query { state, query } => {
                    let (digest, derivation) =
                        memory_service.query(&mut service.store, &state, &query)?;
                    emit(&json!({"derivation": digest, "status": derivation.status}))?;
                }
                ApplicationCommand::Create { command } => {
                    let snapshot = service.create(&load(&command, 262_144)?).await?;
                    emit(&json!({
                        "state": snapshot.digest, "transition": snapshot.state.transition,
                        "revision": snapshot.state.revision, "memory": snapshot.state.memory,
                    }))?;
                }
                ApplicationCommand::Commit { command } => {
                    let snapshot = service.commit(&load(&command, 262_144)?).await?;
                    emit(&json!({
                        "state": snapshot.digest, "transition": snapshot.state.transition,
                        "revision": snapshot.state.revision, "memory": snapshot.state.memory,
                    }))?;
                }
                ApplicationCommand::Inspect { application: name } => {
                    match service.inspect(&name)? {
                        Some(snapshot) => emit(&json!({
                            "state": snapshot.digest, "sequence": snapshot.state.sequence,
                            "epoch": snapshot.state.epoch, "revision": snapshot.state.revision,
                            "memory": snapshot.state.memory,
                            "kind": snapshot.transition.kind.as_str(),
                        }))?,
                        None => emit(&Value::Null)?,
                    }
                }
                ApplicationCommand::Lineage { application: name } => {
                    emit(&Value::Array(service.lineage(&name)?))?;
                }
                ApplicationCommand::Pending { application: name } => {
                    let history = service.history(&name)?;
                    let pending = service.pending(&history)?;
                    emit(&json!({
                        "pending": pending.iter().map(|p| json!({
                            "intent": p.intent, "sourceState": p.source_state,
                            "dispatch": p.dispatch.as_ref().map(|d| d.value.clone()),
                        })).collect::<Vec<_>>(),
                    }))?;
                }
                ApplicationCommand::Dispatch {
                    application: name,
                    max,
                    host_only,
                } => {
                    let host = host
                        .as_ref()
                        .ok_or_else(|| Error::invalid("application dispatch requires --policy"))?;
                    let results = if host_only {
                        service.dispatch_pending(&name, host, max).await?
                    } else {
                        let dispatcher = DomainDispatcher::new(host, &cli.dir)?;
                        service.dispatch_pending(&name, &dispatcher, max).await?
                    };
                    emit(&json!({
                        "dispatches": results.iter().map(|d| d.value()).collect::<Vec<_>>(),
                    }))?;
                }
                ApplicationCommand::Reconcile {
                    application: name,
                    intent,
                    host_only,
                } => {
                    let host = host
                        .as_ref()
                        .ok_or_else(|| Error::invalid("application reconcile requires --policy"))?;
                    let result = if host_only {
                        service.reconcile_dispatch(&name, &intent, host).await?
                    } else {
                        let dispatcher = DomainDispatcher::new(host, &cli.dir)?;
                        service
                            .reconcile_dispatch(&name, &intent, &dispatcher)
                            .await?
                    };
                    emit(&result.value)?;
                }
                ApplicationCommand::Schedule { input } => {
                    let result = application::schedule_investigations(
                        &mut service,
                        &memory_service,
                        &load(&input, 262_144)?,
                    )
                    .await?;
                    emit(&json!({
                        "snapshot": result.snapshot.map(|s| s.digest),
                        "derivations": result.derivations, "requests": result.requests,
                    }))?;
                }
                ApplicationCommand::Execute { input } => {
                    let snapshot =
                        application::request_execution(&mut service, &load(&input, 262_144)?)
                            .await?;
                    emit(&json!({"state": snapshot.digest}))?;
                }
                ApplicationCommand::Publish { input } => {
                    let result = application::append_observation(
                        &mut service,
                        &memory_service,
                        &load(&input, 262_144)?,
                    )
                    .await?;
                    emit(&result)?;
                }
                ApplicationCommand::Restore { input } => {
                    emit(
                        &algal::application_restoration::restore_revision(
                            &mut service,
                            &load(&input, 262_144)?,
                        )
                        .await?,
                    )?;
                }
                ApplicationCommand::RolloverMemory { input } => {
                    let result = application::rollover_memory(
                        &mut service,
                        &memory_service,
                        &load(&input, 262_144)?,
                    )
                    .await?;
                    emit(&result)?;
                }
                ApplicationCommand::Evaluate { request } => {
                    // Case-pure evaluation runs without executors or tools:
                    // the builtin fn registry is the only admitted surface.
                    let mut run_host = Host::default();
                    let (digest, evaluation) =
                        application_adaptation::evaluate_application_revision(
                            &mut service.store,
                            &load(&request, 262_144)?,
                            &mut run_host,
                            &Transports::new(),
                        )
                        .await?;
                    emit(&json!({
                        "evaluation": digest, "verdict": evaluation["verdict"],
                    }))?;
                }
                ApplicationCommand::VerifyEvaluation { input } => {
                    let input = load(&input, 262_144)?;
                    let v = app_memory::app_object(&input, &["evaluation", "expectedState"])?;
                    let evaluation = app_memory::app_ref(&v["evaluation"])?.to_owned();
                    let state = app_memory::app_ref(&v["expectedState"])?.to_owned();
                    let checked = application_adaptation::verify_application_evaluation(
                        &service.store,
                        &evaluation,
                        &state,
                        &Host::default(),
                    )
                    .await?;
                    emit(&json!({"ok": true, "verdict": checked["verdict"]}))?;
                }
                ApplicationCommand::AdmitActivation { input } => {
                    let admitted = application_adaptation::admit_application_activation(
                        &service.store,
                        &load(&input, 262_144)?,
                        &Host::default(),
                    )
                    .await?;
                    emit(&admitted)?;
                }
                ApplicationCommand::Compatible { input } => {
                    let input = load(&input, 262_144)?;
                    let v = app_memory::app_object(&input, &["previous", "candidate"])?;
                    let previous = app_memory::app_ref(&v["previous"])?.to_owned();
                    let candidate = app_memory::app_ref(&v["candidate"])?.to_owned();
                    let compatibility = application_adaptation::check_application_compatibility(
                        &service.store,
                        &previous,
                        &candidate,
                    )?;
                    emit(&json!({"compatibility": compatibility}))?;
                }
                ApplicationCommand::Compare { input } => {
                    let (digest, comparison) = application_comparison::produce_comparison(
                        &mut service.store,
                        &load(&input, 262_144)?,
                        &Host::default(),
                    )
                    .await?;
                    emit(&json!({
                        "comparison": digest, "selected": comparison["selected"],
                    }))?;
                }
                ApplicationCommand::VerifyComparison { input } => {
                    let input = load(&input, 262_144)?;
                    let v = app_memory::app_object(&input, &["comparison", "expectedState"])?;
                    let comparison = app_memory::app_ref(&v["comparison"])?.to_owned();
                    let state = app_memory::app_ref(&v["expectedState"])?.to_owned();
                    let checked = application_comparison::verify_comparison(
                        &service.store,
                        &comparison,
                        &state,
                        &Host::default(),
                    )
                    .await?;
                    emit(&json!({"ok": true, "selected": checked["selected"]}))?;
                }
                ApplicationCommand::Propose { input } => {
                    // Case-pure generation runs without executors or tools:
                    // the builtin fn registry is the only admitted surface.
                    let mut run_host = Host::default();
                    let result = application_proposal::propose_revision(
                        &mut service,
                        &load(&input, 262_144)?,
                        &mut run_host,
                        &Transports::new(),
                    )
                    .await?;
                    emit(&json!({
                        "proposal": result["proposal"], "status": result["status"],
                        "candidates": result["candidates"],
                    }))?;
                }
                ApplicationCommand::VerifyProposal { input } => {
                    let input = load(&input, 262_144)?;
                    let v = app_memory::app_object(&input, &["proposal", "expectedState"])?;
                    let proposal = app_memory::app_ref(&v["proposal"])?.to_owned();
                    let state = app_memory::app_ref(&v["expectedState"])?.to_owned();
                    let checked = application_proposal::verify_proposal(
                        &service.store,
                        &proposal,
                        &state,
                        &Host::default(),
                    )
                    .await?;
                    emit(
                        &json!({"ok": true, "status": checked["status"], "candidates": checked["candidates"]}),
                    )?;
                }
                ApplicationCommand::Select { input } => {
                    let input = load(&input, 262_144)?;
                    let v = app_memory::app_object(
                        &input,
                        &["policy", "environment", "expectedState"],
                    )?;
                    let policy = app_memory::app_ref(&v["policy"])?.to_owned();
                    let environment = app_memory::app_id(&v["environment"])?.to_owned();
                    let state = app_memory::app_ref(&v["expectedState"])?.to_owned();
                    let selected = application_selection::select_application_strategy(
                        &service.store,
                        &policy,
                        &environment,
                        &state,
                        &Host::default(),
                    )
                    .await?;
                    emit(
                        &json!({"manifest": selected["manifest"], "comparison": selected["comparison"]}),
                    )?;
                }
                ApplicationCommand::SelectRecord { input } => {
                    let (digest, record) = application_selection::produce_selection(
                        &mut service.store,
                        &load(&input, 262_144)?,
                        &Host::default(),
                    )
                    .await?;
                    emit(&json!({"selection": digest, "revision": record["revision"]}))?;
                }
                ApplicationCommand::VerifySelection { input } => {
                    let input = load(&input, 262_144)?;
                    let v = app_memory::app_object(&input, &["selection", "expectedState"])?;
                    let selection = app_memory::app_ref(&v["selection"])?.to_owned();
                    let state = app_memory::app_ref(&v["expectedState"])?.to_owned();
                    let checked = application_selection::verify_selection(
                        &service.store,
                        &selection,
                        &state,
                        &Host::default(),
                    )
                    .await?;
                    emit(&json!({"ok": true, "revision": checked["revision"]}))?;
                }
                ApplicationCommand::Experiment { input } => {
                    let (digest, record) = application_experiment::produce_experiment(
                        &mut service.store,
                        &load(&input, 262_144)?,
                        &Host::default(),
                    )
                    .await?;
                    emit(&json!({"experiment": digest, "result": record["result"]}))?;
                }
                ApplicationCommand::VerifyExperiment { input } => {
                    let input = load(&input, 262_144)?;
                    let v = app_memory::app_object(&input, &["experiment", "expectedState"])?;
                    let experiment = app_memory::app_ref(&v["experiment"])?.to_owned();
                    let state = app_memory::app_ref(&v["expectedState"])?.to_owned();
                    let checked = application_experiment::verify_experiment(
                        &service.store,
                        &experiment,
                        &state,
                        &Host::default(),
                    )
                    .await?;
                    emit(&json!({"ok": true, "result": checked["result"]}))?;
                }
                ApplicationCommand::MigrateMemory { input } => {
                    let mut run_host = Host::default();
                    let result = application_migration::migrate_memory(
                        &memory_service,
                        &mut service.store,
                        &mut run_host,
                        &Transports::new(),
                        &load(&input, 262_144)?,
                    )
                    .await?;
                    emit(&result)?;
                }
                ApplicationCommand::Drain { input } => {
                    let drain = algal::application_drain::produce_drain(
                        &mut service,
                        &load(&input, 262_144)?,
                    )?;
                    emit(&json!({"drain": drain}))?;
                }
                ApplicationCommand::VerifyDrain { input } => {
                    let input = load(&input, 262_144)?;
                    let v = app_memory::app_object(&input, &["drain", "expectedState"])?;
                    let drain = app_memory::app_ref(&v["drain"])?.to_owned();
                    let state = app_memory::app_ref(&v["expectedState"])?.to_owned();
                    algal::application_drain::verify_drain(&service, &drain, &state)?;
                    emit(&json!({"verified": true}))?;
                }
                ApplicationCommand::View { input } => {
                    emit(&application_view::view(&service, &load(&input, 262_144)?)?)?;
                }
                ApplicationCommand::Report { view } => {
                    print!(
                        "{}",
                        algal::application_report::render(&load(&view, 262_144)?)?
                    );
                }
                ApplicationCommand::VerifyMessage { input } => {
                    let raw = load(&input, 262_144)?;
                    let v = app_memory::app_object(&raw, &["message"])?;
                    let verified = algal::application_message::verify_interapp_delivery(
                        &service,
                        app_memory::app_ref(&v["message"])?,
                        Some(&channels_dir),
                    )?;
                    emit(&json!({
                        "ok": true, "application": verified.application,
                        "operation": verified.operation, "intent": verified.intent,
                        "route": verified.route, "to": verified.to,
                    }))?;
                }
                ApplicationCommand::Contend { input } => {
                    let (contention, record, _) =
                        algal::application_contention::produce_contention(
                            &mut service,
                            &load(&input, 262_144)?,
                        )
                        .await?;
                    emit(&json!({"contention": contention, "winner": record.winner}))?;
                }
                ApplicationCommand::VerifyContention { input } => {
                    let raw = load(&input, 262_144)?;
                    let v = app_memory::app_object(&raw, &["contention"])?;
                    let record = algal::application_contention::verify_contention(
                        &service,
                        app_memory::app_ref(&v["contention"])?,
                    )?;
                    emit(&json!({"ok": true, "winner": record.winner}))?;
                }
            }
            Ok(true)
        }
        Commands::Context { command } => {
            match command {
                ContextCommand::Compact {
                    source,
                    max_bytes,
                    keep_recent,
                } => {
                    let source = load(&source, 1_048_576)?;
                    let view = context::compact(
                        &source,
                        &json!({"maxBytes":max_bytes,"keepRecent":keep_recent}),
                    )?;
                    let mut store = Store::open(&cli.dir, true)?;
                    store.put("values", &source)?;
                    for item in source["items"].as_array().unwrap() {
                        store.put("values", item)?;
                    }
                    store.put("values", &view)?;
                    emit(&view)?;
                }
                ContextCommand::Recall { source, reference } => {
                    emit(&context::recall(&load(&source, 1_048_576)?, &reference)?)?
                }
                ContextCommand::Verify { source, view } => {
                    let ok = context::verify(&load(&source, 1_048_576)?, &load(&view, 1_048_576)?)?;
                    emit(&json!({"ok":ok}))?;
                    return Ok(ok);
                }
            }
            Ok(true)
        }
        Commands::Agent {
            prompt,
            mut options,
        } => {
            let prompt = match prompt {
                Some(prompt) => prompt,
                None if !io::stdin().is_terminal() => {
                    use std::io::Read;
                    let mut bytes = Vec::new();
                    io::stdin().take(65_537).read_to_end(&mut bytes)?;
                    if bytes.len() > 65_536 {
                        return Err(Error::limit("task bytes"));
                    }
                    String::from_utf8(bytes).map_err(|_| Error::invalid("UTF-8 task"))?
                }
                None => return Err(Error::invalid("use --prompt or pipe a task on stdin")),
            };
            if prompt.trim().is_empty() || prompt.len() > 65_536 {
                return Err(Error::invalid("task must contain 1..65536 bytes"));
            }
            options.write = true;
            let (mut store, mut host, transports) = prepare(&options, &cli.dir)?;
            let program = Manifest::parse(
                &json!({"contract":"algal.organism.v1","key":"organism:algal-agent","name":"ALGAL coding-agent harness","cells":[
                {"id":"task","kind":"input","outputs":{"text":"text"}},
                {"id":"work","kind":"agent","inputs":{"task":"text"},"prompt":"Complete the user's bounded task using only host-admitted capabilities. State what was verified and what remains uncertain.","output":{"kind":"text"},"budget":{"maxEffectMs":600000}}
            ],"edges":[{"from":{"cell":"task","port":"text"},"to":{"cell":"work","port":"task"}}],"interface":{"inputs":{"task":{"cell":"task","port":"text"}},"outputs":{"answer":{"cell":"work","port":"out"}}}}),
            )?;
            let receipt = runtime::run(
                program.clone(),
                json!({"task":{"text":prompt}}),
                &mut store,
                &mut host,
                &transports,
                None,
            )
            .await?;
            let reference = persist(&mut store, &program, &receipt)?;
            let ok = receipt["outcome"] == "complete";
            emit(
                &json!({"ok":ok,"outputs":runtime::outputs(&program,&receipt)?,"receiptDigest":reference,"error":receipt.get("failure")}),
            )?;
            Ok(ok)
        }
        Commands::Acp { options } => {
            let host = host(&options, &cli.dir)?;
            if !host.has_executor() {
                return Err(Error::invalid("ACP requires a host-admitted executor"));
            }
            algal::acp::serve(
                tokio::io::stdin(),
                tokio::io::stdout(),
                host,
                cli.dir,
                options.workspace.canonicalize()?,
            )
            .await?;
            Ok(true)
        }
        Commands::Index { docs, embedder } => {
            let backend = algal::embeddings::Embedder::resolve(embedder.as_deref())?;
            let report =
                algal::semantic::index_store(&cli.dir, docs.as_deref(), &backend, 120_000).await?;
            emit(&report.to_json())?;
            Ok(true)
        }
        Commands::Search { query, k, embedder } => {
            let backend = algal::embeddings::Embedder::resolve(embedder.as_deref())?;
            let hits = algal::semantic::search(&cli.dir, &backend, &query, k, 120_000).await?;
            emit(&json!({
                "query":query,
                "hits":hits.iter().map(|h| h.to_json()).collect::<Vec<_>>()
            }))?;
            Ok(!hits.is_empty())
        }
        Commands::Auth {
            provider,
            status,
            forget,
            clipboard,
        } => {
            algal::credentials::spec(&provider)?;
            if status {
                emit(&algal::credentials::status(&provider)?)?;
                return Ok(true);
            }
            if forget {
                let removed = algal::credentials::forget(&provider)?;
                emit(&json!({"provider":provider,"removed":removed}))?;
                return Ok(!removed.is_empty());
            }
            let key = if clipboard {
                read_clipboard()?
            } else {
                read_secret_line(&format!(
                    "paste your {provider} key (env {} also works): ",
                    algal::credentials::spec(&provider)?.env
                ))?
            };
            let (source, location) = tokio::task::spawn_blocking({
                let provider = provider.clone();
                let key = key.clone();
                move || algal::credentials::store(&provider, &key)
            })
            .await
            .map_err(|e| Error::new("IO_FAILED", format!("credential store join: {e}")))??;
            if source == "file" {
                eprintln!(
                    "warning: no OS vault was available; the key is stored as plaintext (mode 0600) at {location}"
                );
            }
            emit(&json!({
                "ok":true,"provider":provider,"stored":source,
                "location":location,"hint":algal::credentials::redact(&key)
            }))?;
            Ok(true)
        }
        Commands::Doctor {
            apple,
            apple_bridge,
            jev,
        } => {
            if jev {
                let status = tokio::task::spawn_blocking(|| algal::credentials::status("jev"))
                    .await
                    .map_err(|e| Error::new("IO_FAILED", format!("credential join: {e}")))??;
                let mut report = json!({"provider":"jev","credential":status});
                if status["configured"] != true {
                    report["available"] = json!(false);
                    report["error"] = json!(
                        "credential not configured — run `algal auth jev` or set TYPESAFE_API_KEY"
                    );
                    emit(&report)?;
                    return Ok(false);
                }
                let credential = algal::credentials::resolve("jev", None)?
                    .map(|(key, _)| key)
                    .unwrap();
                match algal::decisions::ask(
                    algal::decisions::DEFAULT_MODEL,
                    &credential,
                    &json!({"check":"algal doctor connectivity probe"}),
                    &json!({"probe":{"type":"noul","instructions":"Is this a connectivity check?"}}),
                    15_000,
                )
                .await
                {
                    Ok((out, meta)) => {
                        report["available"] = json!(true);
                        if let Some(noul) = out["answers"]["probe"]["noul"].as_f64() {
                            report["noul"] = json!(noul);
                        }
                        if let Some(usage) = meta.get("usage") {
                            report["usage"] = usage.clone();
                        }
                        emit(&report)?;
                        Ok(true)
                    }
                    Err(error) => {
                        report["available"] = json!(false);
                        report["error"] = json!(format!("{}: {}", error.code, error.message));
                        emit(&report)?;
                        Ok(false)
                    }
                }
            } else if apple {
                let bridge = bridge_path(apple_bridge.as_ref())?;
                let output = algal::effects::command_output(
                    &[bridge.to_string_lossy().into_owned(), "--check".into()],
                    None,
                    b"",
                    4096,
                    10_000,
                )
                .await?;
                let result: Value = serde_json::from_slice(&output)?;
                emit(&result)?;
                Ok(result["available"] == true)
            } else {
                emit(
                    &json!({"runtime":"algal","version":env!("CARGO_PKG_VERSION"),"native":true,"platform":std::env::consts::OS,"wireContract":"algal.organism.v1","build":algal::build_info::diagnostic()}),
                )?;
                Ok(true)
            }
        }
    }
}

/// Best-effort clipboard read across platforms; errors when nothing yields
/// text. Never echoes what it read.
fn read_clipboard() -> Result<String> {
    let candidates: Vec<Vec<&str>> = if cfg!(target_os = "macos") {
        vec![vec!["pbpaste"]]
    } else if cfg!(target_os = "windows") {
        vec![vec![
            "powershell",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Get-Clipboard",
        ]]
    } else {
        vec![
            vec!["wl-paste", "-n"],
            vec!["xclip", "-o", "-selection", "clipboard"],
            vec!["xsel", "-b", "-o"],
        ]
    };
    for argv in candidates {
        if let Ok(out) = std::process::Command::new(argv[0])
            .args(&argv[1..])
            .stderr(std::process::Stdio::null())
            .output()
            && out.status.success()
        {
            let text = String::from_utf8_lossy(&out.stdout).trim().to_owned();
            if !text.is_empty() {
                return Ok(text);
            }
        }
    }
    Err(Error::new("IO_FAILED", "clipboard is empty or unavailable"))
}

/// Read one line of secret input: the prompt goes to stderr, echo is
/// suppressed through `stty` where available. Never prints what it read.
fn read_secret_line(prompt: &str) -> Result<String> {
    use std::io::{BufRead, Write};
    eprint!("{prompt}");
    let _ = std::io::stderr().flush();
    #[cfg(unix)]
    let unecho = std::process::Command::new("stty")
        .arg("-echo")
        .status()
        .is_ok_and(|s| s.success());
    let mut line = String::new();
    let read = std::io::stdin().lock().read_line(&mut line);
    #[cfg(unix)]
    if unecho {
        let _ = std::process::Command::new("stty").arg("echo").status();
        eprintln!();
    }
    read.map_err(|_| Error::new("IO_FAILED", "credential input failed"))?;
    let key = line.trim().to_owned();
    if key.is_empty() {
        return Err(Error::new("IO_FAILED", "empty credential input"));
    }
    Ok(key)
}

#[tokio::main]
async fn main() {
    let code = match execute(Cli::parse()).await {
        Ok(true) => 0,
        Ok(false) => 1,
        Err(error) => {
            let report = json!({"ok":false,"error":error});
            eprintln!(
                "{}",
                canonical(&report).unwrap_or_else(|_| "{\"ok\":false}".into())
            );
            2
        }
    };
    std::process::exit(code);
}
