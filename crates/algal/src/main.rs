use algal::{
    Error, Result,
    canonical::{MAX_DOCUMENT_BYTES, canonical, read_json},
    context,
    contract::{Manifest, object},
    effects::{Backend, Host, ResponseFormat},
    graph::{Transports, compile, interface_args, interface_signature},
    mailbox::{self, MailboxService},
    memory,
    process::ProcessService,
    runtime,
    store::{Store, pack, unpack},
};
use clap::{Args, Parser, Subcommand};
use serde_json::{Value, json};
use std::{
    fs::File,
    io::{self, IsTerminal},
    path::{Path, PathBuf},
};

#[derive(Parser)]
#[command(
    name = "algal",
    version,
    about = "Programs that grow. A typed language and harness for bounded agent work."
)]
struct Cli {
    #[arg(long, global = true, default_value = ".algal")]
    dir: PathBuf,
    #[command(subcommand)]
    command: Commands,
}

#[derive(Clone, Args, Default)]
struct Execution {
    #[arg(long)]
    args: Option<String>,
    #[arg(long)]
    responses: Option<PathBuf>,
    #[arg(long)]
    host: Option<PathBuf>,
    /// Shell executor: bounded request JSON on stdin, response JSON on stdout.
    #[arg(long)]
    executor_cmd: Option<String>,
    #[arg(long)]
    agent: Option<String>,
    #[arg(long, default_value = ".")]
    workspace: PathBuf,
    #[arg(long)]
    gateway_model: Option<String>,
    /// TypeSafe Jev decision executor; bare `--jev` uses `jev-latest`.
    #[arg(long, num_args = 0..=1, default_missing_value = "jev-latest")]
    jev: Option<String>,
    #[arg(long, num_args = 0..=1, default_missing_value = "local")]
    recall: Option<String>,
    #[arg(long, requires = "model")]
    base_url: Option<String>,
    #[arg(long, requires = "base_url")]
    model: Option<String>,
    #[arg(long, requires = "base_url")]
    credential_env: Option<String>,
    #[arg(long, default_value = "json_schema")]
    response_format: String,
    #[arg(long)]
    apple: bool,
    #[arg(long, requires = "apple")]
    apple_bridge: Option<PathBuf>,
    #[arg(long)]
    modules: Option<PathBuf>,
    #[arg(long)]
    transports: Option<PathBuf>,
    #[arg(long)]
    tools: Option<PathBuf>,
    #[arg(long)]
    cache_effects: bool,
    #[arg(long)]
    write: bool,
}

#[derive(Subcommand)]
enum Commands {
    Civ {
        #[arg(long)]
        live: bool,
        #[arg(long)]
        goals: Option<PathBuf>,
        #[command(flatten)]
        options: Execution,
    },
    CivVerify {
        population: Option<PathBuf>,
        #[arg(long)]
        goals: Option<PathBuf>,
    },
    Bench {
        #[command(subcommand)]
        command: Option<BenchCommand>,
        /// `algal.bench.config.v1` file
        config: Option<PathBuf>,
        #[arg(long)]
        out: Option<PathBuf>,
        #[arg(long)]
        apple_bridge: Option<PathBuf>,
        #[arg(long)]
        tools: Option<PathBuf>,
        #[arg(long)]
        modules: Option<PathBuf>,
        #[arg(long)]
        transports: Option<PathBuf>,
    },
    Foundry {
        #[command(subcommand)]
        command: Option<FoundryCommand>,
        /// `algal.foundry.config.v1` file
        config: Option<PathBuf>,
        #[arg(long)]
        out: Option<PathBuf>,
        #[command(flatten)]
        options: Execution,
    },
    Run {
        manifest: PathBuf,
        #[command(flatten)]
        options: Execution,
    },
    Call {
        bundle: PathBuf,
        #[command(flatten)]
        options: Execution,
    },
    Check {
        manifest: PathBuf,
        #[command(flatten)]
        options: Execution,
    },
    Explain {
        manifest: PathBuf,
        #[command(flatten)]
        options: Execution,
    },
    Digest {
        manifest: PathBuf,
    },
    Inspect {
        receipt: PathBuf,
    },
    Diff {
        a: PathBuf,
        b: PathBuf,
    },
    Runs,
    Manifests,
    Manifest {
        digest: String,
    },
    Slots,
    Slot {
        #[command(subcommand)]
        command: SlotCommand,
    },
    Mailbox {
        #[command(subcommand)]
        command: MailboxCommand,
    },
    Process {
        #[command(subcommand)]
        command: ProcessCommand,
    },
    Example {
        id: String,
        #[arg(long, default_value = "examples")]
        examples: PathBuf,
    },
    Verify {
        receipt: PathBuf,
        manifest: Option<PathBuf>,
        #[command(flatten)]
        options: Execution,
    },
    /// Continue a suspended run: recorded effects replay, the rest routes
    /// to the live executors.
    Resume {
        receipt: PathBuf,
        manifest: Option<PathBuf>,
        #[command(flatten)]
        options: Execution,
    },
    Pack {
        manifest: PathBuf,
        #[arg(long)]
        modules: Option<PathBuf>,
        #[arg(long)]
        out: Option<PathBuf>,
    },
    Unpack {
        bundle: PathBuf,
    },
    ToolDef {
        manifest: PathBuf,
        #[arg(long)]
        modules: Option<PathBuf>,
        #[arg(long, default_value = "openai")]
        format: String,
    },
    Suite {
        #[arg(long, default_value = "examples")]
        examples: PathBuf,
        #[arg(long)]
        modules: Option<PathBuf>,
    },
    Store {
        #[command(subcommand)]
        command: StoreCommand,
    },
    Memory {
        #[command(subcommand)]
        command: MemoryCommand,
    },
    Context {
        #[command(subcommand)]
        command: ContextCommand,
    },
    Agent {
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
        query: String,
        /// Result count (1..=64).
        #[arg(short, long, default_value = "8")]
        k: usize,
        /// Embedder: local (default), gateway, or gateway:<model>.
        #[arg(long)]
        embedder: Option<String>,
    },
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
    Doctor {
        #[arg(long)]
        apple: bool,
        #[arg(long)]
        apple_bridge: Option<PathBuf>,
        /// TypeSafe Jev availability: credential status plus a live probe.
        #[arg(long)]
        jev: bool,
    },
    Acp {
        #[command(flatten)]
        options: Execution,
    },
}

#[derive(Subcommand)]
enum BenchCommand {
    Verify {
        report: PathBuf,
        #[arg(long)]
        tools: Option<PathBuf>,
        #[arg(long)]
        modules: Option<PathBuf>,
    },
    Inspect {
        report: PathBuf,
    },
}

#[derive(Subcommand)]
enum FoundryCommand {
    Verify {
        report: PathBuf,
        #[arg(long)]
        tools: Option<PathBuf>,
        #[arg(long)]
        modules: Option<PathBuf>,
    },
    Inspect {
        report: PathBuf,
    },
    Pack {
        report: PathBuf,
        #[arg(long)]
        out: PathBuf,
        #[arg(long)]
        tools: Option<PathBuf>,
        #[arg(long)]
        modules: Option<PathBuf>,
    },
    Search {
        /// `algal.foundry.config.v1` file with a `search` block
        config: PathBuf,
        #[arg(long)]
        out: Option<PathBuf>,
        #[command(flatten)]
        options: Box<Execution>,
    },
    SearchVerify {
        report: PathBuf,
        #[arg(long)]
        tools: Option<PathBuf>,
        #[arg(long)]
        modules: Option<PathBuf>,
    },
    SearchInspect {
        report: PathBuf,
    },
    SearchPack {
        report: PathBuf,
        #[arg(long)]
        out: PathBuf,
        #[arg(long)]
        tools: Option<PathBuf>,
        #[arg(long)]
        modules: Option<PathBuf>,
    },
}

#[derive(Subcommand)]
enum StoreCommand {
    Put { file: String },
    Get { digest: String },
    Has { digest: String },
}

#[derive(Subcommand)]
enum SlotCommand {
    Get { name: String },
    Set { name: String, value: PathBuf },
}

#[derive(Subcommand)]
enum ProcessCommand {
    Create {
        name: String,
        manifest: PathBuf,
        #[arg(long, default_value_t = 16)]
        max_generations: usize,
        #[command(flatten)]
        options: Execution,
    },
    List,
    Inspect {
        name: String,
    },
    Tick {
        name: String,
        #[command(flatten)]
        options: Execution,
    },
    Schedule {
        #[arg(long, default_value_t = 16)]
        max_ticks: usize,
        #[command(flatten)]
        options: Execution,
    },
    Verify {
        name: String,
        #[command(flatten)]
        options: Execution,
    },
}

#[derive(Subcommand)]
enum MailboxCommand {
    Create {
        name: String,
        #[arg(long, default_value_t = 64)]
        max_messages: usize,
        #[arg(long, default_value_t = 65_536)]
        max_message_bytes: usize,
    },
    List,
    Send {
        capability: String,
        value: PathBuf,
        #[arg(long)]
        idempotency_key: Option<String>,
    },
    Receive {
        capability: String,
    },
    Revoke {
        capability: String,
    },
}

#[derive(Subcommand)]
enum MemoryCommand {
    Query {
        snapshot: PathBuf,
        program: PathBuf,
    },
    Verify {
        snapshot: PathBuf,
        program: PathBuf,
        result: PathBuf,
    },
    Remember {
        source: PathBuf,
        relation: String,
        tuple: String,
        #[arg(long)]
        snapshot: Option<PathBuf>,
    },
}

#[derive(Subcommand)]
enum ContextCommand {
    Compact {
        source: PathBuf,
        #[arg(long)]
        max_bytes: usize,
        #[arg(long, default_value_t = 4)]
        keep_recent: usize,
    },
    Recall {
        source: PathBuf,
        reference: String,
    },
    Verify {
        source: PathBuf,
        view: PathBuf,
    },
}

fn load(path: &Path, max: usize) -> Result<Value> {
    read_json(File::open(path)?, max)
}
fn emit(value: &Value) -> Result<()> {
    println!("{}", canonical(value)?);
    Ok(())
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

fn canon_eq(a: Option<&Value>, b: Option<&Value>) -> bool {
    let empty = Value::Null;
    canonical(a.unwrap_or(&empty)).unwrap_or_default()
        == canonical(b.unwrap_or(&empty)).unwrap_or_default()
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

/// Compare two run receipts field by field — the `algal diff` surface.
fn receipt_diff(a: &Value, b: &Value) -> Vec<String> {
    let mut out = Vec::new();
    if a["outcome"] != b["outcome"] {
        out.push(format!(
            "outcome: {} vs {}",
            disp(&a["outcome"]),
            disp(&b["outcome"])
        ));
    }
    let a_cells: Vec<String> = a["cells"]
        .as_object()
        .map(|m| m.keys().cloned().collect())
        .unwrap_or_default();
    let b_cells: Vec<String> = b["cells"]
        .as_object()
        .map(|m| m.keys().cloned().collect())
        .unwrap_or_default();
    if a_cells != b_cells {
        out.push(format!(
            "cells: {} vs {}",
            a_cells.join(","),
            b_cells.join(",")
        ));
    }
    for name in &a_cells {
        let (ac, bc) = (&a["cells"][name], &b["cells"][name]);
        if bc.is_null() {
            continue;
        }
        if ac["status"] != bc["status"] {
            out.push(format!(
                "cell {name}: status {} vs {}",
                disp(&ac["status"]),
                disp(&bc["status"])
            ));
        }
        let empty = json!({});
        if !canon_eq(
            Some(if ac["outputs"].is_null() {
                &empty
            } else {
                &ac["outputs"]
            }),
            Some(if bc["outputs"].is_null() {
                &empty
            } else {
                &bc["outputs"]
            }),
        ) {
            out.push(format!("cell {name}: outputs differ"));
        }
        if ac["work"] != bc["work"] {
            out.push(format!(
                "cell {name}: work {} vs {}",
                disp(&ac["work"]),
                disp(&bc["work"])
            ));
        }
        if ac["rounds"] != bc["rounds"] {
            out.push(format!(
                "cell {name}: rounds {} vs {}",
                disp(&ac["rounds"]),
                disp(&bc["rounds"])
            ));
        }
        if ac["items"] != bc["items"] {
            out.push(format!(
                "cell {name}: items {} vs {}",
                disp(&ac["items"]),
                disp(&bc["items"])
            ));
        }
        if !canon_eq(ac.get("failure"), bc.get("failure")) {
            out.push(format!("cell {name}: failure differs"));
        }
        if !canon_eq(ac.get("toolCalls"), bc.get("toolCalls")) {
            out.push(format!("cell {name}: toolCalls differ"));
        }
        if !canon_eq(ac.get("shadowOut"), bc.get("shadowOut")) {
            out.push(format!("cell {name}: shadowOut differs"));
        }
        if ac["via"] != bc["via"] {
            out.push(format!(
                "cell {name}: via {} vs {}",
                ac["via"].as_str().unwrap_or("local"),
                bc["via"].as_str().unwrap_or("local")
            ));
        }
        if !canon_eq(ac.get("slot"), bc.get("slot")) {
            out.push(format!("cell {name}: slot differs"));
        }
    }
    let a_effects = a["effects"].as_array().map(|e| e.len()).unwrap_or(0);
    let b_effects = b["effects"].as_array().map(|e| e.len()).unwrap_or(0);
    if a_effects != b_effects {
        out.push(format!("effects: {a_effects} vs {b_effects}"));
    } else if let (Some(ae), Some(be)) = (a["effects"].as_array(), b["effects"].as_array()) {
        for (i, (e, o)) in ae.iter().zip(be.iter()).enumerate() {
            if e["requestDigest"] != o["requestDigest"] {
                out.push(format!("effect {i}: requestDigest differs"));
            }
            if !canon_eq(e.get("output"), o.get("output")) {
                out.push(format!("effect {i}: output differs"));
            }
            if !canon_eq(e.get("error"), o.get("error")) {
                out.push(format!("effect {i}: error differs"));
            }
            if e["executor"] != o["executor"] {
                out.push(format!(
                    "effect {i}: executor {} vs {}",
                    disp(&e["executor"]),
                    disp(&o["executor"])
                ));
            }
            if !canon_eq(e.get("usage"), o.get("usage")) {
                out.push(format!("effect {i}: usage differs"));
            }
        }
    }
    if !canon_eq(a.get("events"), b.get("events")) {
        out.push("events: event logs differ".into());
    }
    for field in ["steps", "agentCalls", "units"] {
        if a["work"][field] != b["work"][field] {
            out.push(format!(
                "work.{field}: {} vs {}",
                disp(&a["work"][field]),
                disp(&b["work"][field])
            ));
        }
    }
    if a.get("failure").is_some() != b.get("failure").is_some() {
        out.push("failure presence differs".into());
    } else if let (Some(af), Some(bf)) = (a.get("failure"), b.get("failure")) {
        if af["code"] != bf["code"] {
            out.push(format!(
                "failure.code: {} vs {}",
                disp(&af["code"]),
                disp(&bf["code"])
            ));
        }
    }
    out
}

async fn execute(cli: Cli) -> Result<bool> {
    match cli.command {
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
                    let result =
                        algal::foundry::verify(&load(&report, MAX_DOCUMENT_BYTES)?, &store, &host)
                            .await?;
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
                    let lineage = match &config.generator {
                        Some(generator) => {
                            let (generator_digest, receipt_digest, generated) =
                                algal::foundry::generate(
                                    &generator.manifest,
                                    &generator.args,
                                    &generator.output,
                                    generator.field.as_deref(),
                                    &mut store,
                                    &mut host,
                                    &transports,
                                )
                                .await?;
                            config.candidates.extend(generated);
                            Some((generator_digest, receipt_digest))
                        }
                        None => None,
                    };
                    let report = algal::foundry::run(
                        &config.candidates,
                        &config.cases,
                        config.scorer.as_ref(),
                        lineage,
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
            emit(&receipt)?;
            Ok(receipt["outcome"] == "complete")
        }
        Commands::Call {
            bundle,
            mut options,
        } => {
            options.write = true;
            let (mut store, mut host, transports) = prepare(&options, &cli.dir)?;
            let manifest = unpack(&load(&bundle, MAX_DOCUMENT_BYTES)?, &mut store)?;
            let input = interface_args(&manifest, &args(&options)?)?;
            let receipt = runtime::run(
                manifest.clone(),
                input,
                &mut store,
                &mut host,
                &transports,
                None,
            )
            .await?;
            let reference = persist(&mut store, &manifest, &receipt)?;
            let ok = receipt["outcome"] == "complete";
            emit(
                &json!({"ok":ok,"outputs":runtime::outputs(&manifest,&receipt)?,"receiptDigest":reference,"manifestDigest":receipt["manifestDigest"],"error":receipt.get("failure")}),
            )?;
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
            emit(
                &json!({"ok":true,"manifestDigest":compiled.manifest.digest()?,"cells":compiled.manifest.cells.len()}),
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
            let cells: Vec<_> = compiled.manifest.cells.iter().map(|cell| {
                let name = cell["id"].as_str().unwrap();
                json!({"id":name,"kind":cell["kind"],"inputs":compiled.signatures[name].inputs,"outputs":compiled.signatures[name].outputs})
            }).collect();
            emit(
                &json!({"manifestDigest":compiled.manifest.digest()?,"cells":cells,"edges":compiled.manifest.edges}),
            )?;
            Ok(true)
        }
        Commands::Digest { manifest: file } => {
            emit(&json!({"digest":manifest(&file)?.digest()?}))?;
            Ok(true)
        }
        Commands::Inspect { receipt } => {
            emit(&inspect_receipt(&load(&receipt, MAX_DOCUMENT_BYTES)?))?;
            Ok(true)
        }
        Commands::Diff { a, b } => {
            let a = load(&a, MAX_DOCUMENT_BYTES)?;
            let b = load(&b, MAX_DOCUMENT_BYTES)?;
            let mut mismatches = receipt_diff(&a, &b);
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
        Commands::Process { command } => {
            let mut service = ProcessService::open(&cli.dir)?;
            match command {
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
                ProcessCommand::Tick { name, mut options } => {
                    options.write = true;
                    let (store, mut host, transports) = prepare(&options, &cli.dir)?;
                    service.store = store;
                    let state = service.tick(&name, None, &mut host, &transports).await?;
                    let successful = !["failed", "stuck"].contains(&state.process.status.as_str());
                    emit(&serde_json::to_value(state)?)?;
                    return Ok(successful);
                }
                ProcessCommand::Schedule {
                    max_ticks,
                    mut options,
                } => {
                    options.write = true;
                    let (store, mut host, transports) = prepare(&options, &cli.dir)?;
                    service.store = store;
                    emit(&service.schedule(max_ticks, &mut host, &transports).await?)?;
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
                StoreCommand::Put { file } => {
                    let value = if file == "-" {
                        read_json(io::stdin().lock(), 262_144)?
                    } else {
                        load(Path::new(&file), 262_144)?
                    };
                    emit(&json!({"ref":store.put("values", &value)?}))?;
                }
                StoreCommand::Get { digest } => emit(
                    &store
                        .get("values", &digest)?
                        .ok_or_else(|| Error::new("STORE_MISS", "value not in store"))?,
                )?,
                StoreCommand::Has { digest } => {
                    emit(&json!({"ref":digest,"ok":store.get("values", &digest)?.is_some()}))?
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
                    &json!({"runtime":"algal","version":env!("CARGO_PKG_VERSION"),"native":true,"platform":std::env::consts::OS,"legacyWireContract":"algal.organism.v1"}),
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
