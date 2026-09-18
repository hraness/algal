use algal::{
    Error, Result,
    canonical::{MAX_DOCUMENT_BYTES, canonical, read_json},
    context,
    contract::{Manifest, object},
    effects::{Backend, Host, ResponseFormat},
    graph::{Transports, compile, interface_args, interface_signature},
    memory, runtime,
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
    #[arg(long)]
    agent: Option<String>,
    #[arg(long, default_value = ".")]
    workspace: PathBuf,
    #[arg(long)]
    gateway_model: Option<String>,
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
    Verify {
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
    Doctor {
        #[arg(long)]
        apple: bool,
        #[arg(long)]
        apple_bridge: Option<PathBuf>,
    },
    Acp {
        #[command(flatten)]
        options: Execution,
    },
}

#[derive(Subcommand)]
enum StoreCommand {
    Put { file: String },
    Get { digest: String },
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
    Ok(binary
        .parent()
        .unwrap_or(Path::new("."))
        .join("algal-apple"))
}

fn host(options: &Execution) -> Result<Host> {
    let count = usize::from(options.responses.is_some())
        + usize::from(options.host.is_some())
        + usize::from(options.gateway_model.is_some())
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
    let host = host(options)?;
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

fn tool_definition(manifest: Manifest, store: &mut Store, format: &str) -> Result<Value> {
    let compiled = compile(manifest, store, &Default::default(), &Default::default(), 0)?;
    let signature = interface_signature(&compiled)?;
    let mut properties = MapBuilder::default();
    let mut required = Vec::new();
    for (name, port) in signature.inputs {
        let mut schema = match port["type"].as_str() {
            Some("text") | Some("ref") => json!({"type":"string"}),
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
                && options.base_url.is_none()
                && !options.apple
                && options.agent.is_none()
            {
                options.gateway_model = Some("alibaba/qwen3.7-flash".into());
            }
            let provider = if live { Some(host(&options)?) } else { None };
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
            emit(&tool_definition(manifest(&file)?, &mut store, &format)?)?;
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
                &json!({"contract":"morphogen.organism.v1","key":"organism:algal-agent","name":"ALGAL coding-agent harness","cells":[
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
            let host = host(&options)?;
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
        Commands::Doctor {
            apple,
            apple_bridge,
        } => {
            if apple {
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
                    &json!({"runtime":"algal","version":env!("CARGO_PKG_VERSION"),"native":true,"platform":std::env::consts::OS,"legacyWireContract":"morphogen.organism.v1"}),
                )?;
                Ok(true)
            }
        }
    }
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
