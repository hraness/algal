//! Benchmark evaluation: one workload, several systems, quality/cost evidence.
//! A system is an admitted organism plus a host-resolved executor list — a
//! cheap single call, a frontier single call, and a decomposed circuit are
//! all just systems. Every case result is a replayable run receipt, so the
//! report is a content-addressed claim about a Pareto comparison. There is
//! no promotion here and no split: a bench measures, the foundry selects.
//! Port of src/bench.ts and src/bench-verify.ts.

use crate::{
    Error, Result,
    canonical::{canonical, digest, read_json},
    contract::{Manifest, keys, object, text},
    effects::{Backend, Host},
    graph::Transports,
    runtime,
    scorer::{check_axis_program, check_envelope, check_scorer, eval_axis, eval_scorer},
    store::Store,
};
use serde_json::{Map, Value, json};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs::File,
    path::{Path, PathBuf},
};

const MAX_SYSTEMS: usize = 8;
const MAX_CASES: usize = 256;
const MAX_ID: usize = 64;
const MAX_AXES: usize = 8;

/// The names an axis program may see — the system's aggregate record
/// minus its case list. Static-checked against every axis program.
const AXIS_NAMES: [&str; 9] = [
    "id",
    "manifestKey",
    "manifestDigest",
    "passed",
    "total",
    "effectCalls",
    "work",
    "usage",
    "attribution",
];

/// A configured Pareto axis: a bounded `algal.expr.v1` program over the
/// system aggregate whose `dir` says which direction is better.
#[derive(Clone)]
pub struct Axis {
    pub name: String,
    pub dir: String,
    pub expr: Value,
}

fn axis_name_set() -> BTreeSet<String> {
    AXIS_NAMES.iter().map(|s| s.to_string()).collect()
}

fn parse_axis(value: &Value, at: &str) -> Result<Axis> {
    keys(value, &["name", "dir", "expr"])?;
    let name = bench_id(&value["name"], &format!("{at}.name"))?;
    let dir = text(&value["dir"], 4)?;
    if dir != "up" && dir != "down" {
        return Err(Error::invalid(format!(
            "{at}.dir must be \"up\" or \"down\""
        )));
    }
    check_envelope(&value["expr"], &format!("{at}.expr"))?;
    check_axis_program(&value["expr"]["program"], &axis_name_set(), at)?;
    Ok(Axis {
        name,
        dir: dir.to_owned(),
        expr: value["expr"].clone(),
    })
}

fn parse_axes(value: &Value, at: &str) -> Result<Vec<Axis>> {
    let list = value
        .as_array()
        .filter(|list| !list.is_empty() && list.len() <= MAX_AXES)
        .ok_or_else(|| {
            Error::invalid(format!(
                "{at} must be a bounded non-empty list of at most {MAX_AXES}"
            ))
        })?;
    let mut axes = Vec::with_capacity(list.len());
    let mut names = BTreeSet::new();
    for (i, entry) in list.iter().enumerate() {
        let axis = parse_axis(entry, &format!("{at}[{i}]"))?;
        if !names.insert(axis.name.clone()) {
            return Err(Error::invalid(format!(
                "{at} has duplicate axis \"{}\"",
                axis.name
            )));
        }
        axes.push(axis);
    }
    Ok(axes)
}

/// The aggregate record an axis program sees: the system result minus
/// its case list, matching AXIS_NAMES.
fn axis_env(system: &Value) -> Map<String, Value> {
    AXIS_NAMES
        .iter()
        .map(|name| (name.to_string(), system[name].clone()))
        .collect()
}

fn bench_id(value: &Value, at: &str) -> Result<String> {
    let id = text(value, MAX_ID)?.to_owned();
    let valid = !id.is_empty()
        && id.len() <= MAX_ID
        && id.split('-').all(|part| {
            !part.is_empty()
                && part
                    .chars()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
        });
    if !valid {
        return Err(Error::invalid(format!("{at} is not a valid id")));
    }
    Ok(id)
}

fn sha(value: &Value, at: &str) -> Result<String> {
    let parsed = text(value, 71)?;
    if parsed.len() != 71
        || !parsed.starts_with("sha256:")
        || !parsed[7..]
            .chars()
            .all(|c| c.is_ascii_digit() || ('a'..='f').contains(&c))
    {
        return Err(Error::invalid(format!("{at} must be a sha256 digest")));
    }
    Ok(parsed.to_owned())
}

fn count(value: &Value, at: &str) -> Result<u64> {
    value
        .as_u64()
        .filter(|n| *n <= u64::from(u32::MAX))
        .ok_or_else(|| Error::invalid(format!("{at} must be a non-negative integer")))
}

fn number(value: &Value, at: &str) -> Result<f64> {
    value
        .as_f64()
        .filter(|n| n.is_finite() && *n >= 0.0)
        .ok_or_else(|| Error::invalid(format!("{at} must be a non-negative number")))
}

pub struct BenchCase {
    pub id: String,
    pub args: Value,
    pub expect: Value,
}

pub struct BenchSystem {
    pub id: String,
    pub manifest: Manifest,
    /// Host-resolved executors: the first (alphabetically by name) is the
    /// default; named ids are reached through route.provider / route.preset.
    pub executors: Vec<(String, Backend)>,
}

#[derive(Clone, Copy, Default)]
pub struct Attribution {
    pub calls: u64,
    pub tokens_in: u64,
    pub tokens_out: u64,
    pub cost: f64,
}

impl Attribution {
    fn value(&self) -> Value {
        json!({"calls":self.calls,"tokensIn":self.tokens_in,"tokensOut":self.tokens_out,"cost":self.cost})
    }
    fn add(&mut self, other: &Self) {
        self.calls += other.calls;
        self.tokens_in += other.tokens_in;
        self.tokens_out += other.tokens_out;
        self.cost += other.cost;
    }
}

type Prices = BTreeMap<String, [f64; 2]>;

/// Parse a `algal.bench.config.v1` file: bounded cases, systems whose
/// manifests load relative to the config directory, and an optional price
/// card. Executor specs are `gateway:<model>`, `scripted:<file>`,
/// `cmd:<command>`, or `apple` (the on-device bridge; a native extension).
/// An optional `algal.expr.v1` scorer replaces exact-match as the pass
/// claim — the same bounded predicate the foundry selects under.
pub struct BenchConfig {
    pub cases: Vec<BenchCase>,
    pub systems: Vec<BenchSystem>,
    pub prices: Option<Prices>,
    pub scorer: Option<Value>,
    pub axes: Option<Vec<Axis>>,
}

pub fn load_config(path: &Path, apple_bridge: Option<&Path>) -> Result<BenchConfig> {
    let config = read_json(File::open(path)?, 1_048_576)?;
    keys(
        &config,
        &["contract", "cases", "systems", "prices", "scorer", "axes"],
    )?;
    if config["contract"] != "algal.bench.config.v1" {
        return Err(Error::invalid(
            "bench config.contract must be algal.bench.config.v1",
        ));
    }
    let scorer = match config.get("scorer") {
        None | Some(Value::Null) => None,
        Some(raw) => {
            check_scorer(raw)?;
            Some(raw.clone())
        }
    };
    let axes = match config.get("axes") {
        None | Some(Value::Null) => None,
        Some(raw) => Some(parse_axes(raw, "bench config.axes")?),
    };
    let base = path.parent().unwrap_or(Path::new("."));
    let raw_cases = config["cases"]
        .as_array()
        .filter(|list| !list.is_empty())
        .ok_or_else(|| Error::invalid("bench config.cases must be a non-empty list"))?;
    if raw_cases.len() > MAX_CASES {
        return Err(Error::limit(format!("bench cases exceed {MAX_CASES}")));
    }
    let mut cases = Vec::with_capacity(raw_cases.len());
    let mut case_ids = BTreeSet::new();
    for (i, raw) in raw_cases.iter().enumerate() {
        let at = format!("bench config.cases[{i}]");
        keys(raw, &["id", "args", "expect"])?;
        let id = bench_id(&raw["id"], &format!("{at}.id"))?;
        if !case_ids.insert(id.clone()) {
            return Err(Error::invalid(format!("duplicate bench case id \"{id}\"")));
        }
        if object(&raw["args"]).is_err() || object(&raw["expect"]).is_err() {
            return Err(Error::invalid(format!("{at} needs object args and expect")));
        }
        cases.push(BenchCase {
            id,
            args: raw["args"].clone(),
            expect: raw["expect"].clone(),
        });
    }
    let raw_systems = config["systems"]
        .as_array()
        .filter(|list| !list.is_empty())
        .ok_or_else(|| Error::invalid("bench config.systems must be a non-empty list"))?;
    if raw_systems.len() > MAX_SYSTEMS {
        return Err(Error::limit(format!("bench systems exceed {MAX_SYSTEMS}")));
    }
    let mut systems = Vec::with_capacity(raw_systems.len());
    let mut system_ids = BTreeSet::new();
    for (i, raw) in raw_systems.iter().enumerate() {
        let at = format!("bench config.systems[{i}]");
        keys(raw, &["id", "manifest", "executors"])?;
        let id = bench_id(&raw["id"], &format!("{at}.id"))?;
        if !system_ids.insert(id.clone()) {
            return Err(Error::invalid(format!(
                "duplicate bench system id \"{id}\""
            )));
        }
        let manifest_path = base.join(
            text(&raw["manifest"], 512)
                .map_err(|_| Error::invalid(format!("{at}.manifest must be a path")))?,
        );
        let manifest = Manifest::parse(&read_json(File::open(&manifest_path)?, 1_048_576)?)?;
        if manifest.value["interface"].as_object().is_none() {
            return Err(Error::invalid(format!(
                "bench system \"{id}\" manifest must declare an interface"
            )));
        }
        let specs = object(&raw["executors"])?;
        if specs.is_empty() {
            return Err(Error::invalid(format!(
                "bench system \"{id}\" requires at least one executor"
            )));
        }
        let mut executors = Vec::with_capacity(specs.len());
        for (name, spec) in specs {
            text(&json!(name), MAX_ID)?;
            let spec = spec.as_str().filter(|s| !s.is_empty()).ok_or_else(|| {
                Error::invalid(format!("bench executor \"{name}\" must be a spec string"))
            })?;
            let backend = if let Some(model) = spec.strip_prefix("gateway:") {
                Backend::Gateway {
                    model: model.to_owned(),
                }
            } else if let Some(file) = spec.strip_prefix("scripted:") {
                Backend::Scripted {
                    responses: read_json(File::open(base.join(file))?, 1_048_576)?,
                }
            } else if let Some(command) = spec.strip_prefix("cmd:") {
                Backend::Command {
                    argv: vec!["sh".into(), "-c".into(), command.to_owned()],
                    cwd: None,
                    timeout_ms: 120_000,
                }
            } else if spec == "apple" {
                let explicit = apple_bridge
                    .map(|p| p.to_path_buf())
                    .or_else(|| std::env::var_os("ALGAL_APPLE_BRIDGE").map(PathBuf::from));
                let bridge = match explicit {
                    Some(path) => path,
                    None => {
                        let sibling = std::env::current_exe()
                            .ok()
                            .map(|exe| exe.parent().unwrap_or(Path::new(".")).join("algal-apple"))
                            .ok_or_else(|| Error::invalid("apple spec needs a bridge path"))?;
                        apple_foundation::ensure_bridge(&sibling)
                            .map_err(|e| Error::invalid(format!("apple bridge unavailable: {e}")))?
                    }
                };
                Backend::Apple { bridge }
            } else {
                return Err(Error::invalid(format!(
                    "bench executor \"{name}\": unknown spec (want gateway:<model>, scripted:<file>, cmd:<command>, or apple)"
                )));
            };
            backend.validate()?;
            executors.push((name.clone(), backend));
        }
        systems.push(BenchSystem {
            id,
            manifest,
            executors,
        });
    }
    let prices = match config.get("prices") {
        None | Some(Value::Null) => None,
        Some(raw) => {
            let mut map = Prices::new();
            for (name, price) in object(raw)? {
                if name.is_empty() || name.len() > 256 {
                    return Err(Error::invalid("bench config.prices has an invalid key"));
                }
                keys(price, &["input", "output"])?;
                map.insert(
                    name.clone(),
                    [
                        number(&price["input"], "prices.input")?,
                        number(&price["output"], "prices.output")?,
                    ],
                );
            }
            Some(map)
        }
    };
    // Case args and expected outputs must line up with every system's interface.
    for system in &systems {
        let inputs = object(&system.manifest.value["interface"]["inputs"])?;
        let outputs = object(&system.manifest.value["interface"]["outputs"])?;
        for case in &cases {
            for name in object(&case.args)?.keys() {
                if !inputs.contains_key(name) {
                    return Err(Error::invalid(format!(
                        "case {}: unknown system input \"{name}\"",
                        case.id
                    )));
                }
            }
            for name in outputs.keys() {
                if object(&case.expect)?.get(name).is_none() {
                    return Err(Error::invalid(format!(
                        "case {}: missing expected output \"{name}\"",
                        case.id
                    )));
                }
            }
            for name in object(&case.expect)?.keys() {
                if !outputs.contains_key(name) {
                    return Err(Error::invalid(format!(
                        "case {}: unknown expected output \"{name}\"",
                        case.id
                    )));
                }
            }
        }
    }
    Ok(BenchConfig {
        cases,
        systems,
        prices,
        scorer,
        axes,
    })
}

fn case_args(manifest: &Manifest, case: &BenchCase) -> Result<Value> {
    let mut args = Map::new();
    for (name, value) in object(&case.args)? {
        let target = &object(&manifest.value["interface"]["inputs"])?[name];
        args.entry(text(&target["cell"], MAX_ID)?.to_owned())
            .or_insert_with(|| json!({}))[text(&target["port"], MAX_ID)?] = value.clone();
    }
    Ok(Value::Object(args))
}

fn cost_for(prices: &Option<Prices>, key: &str, tokens_in: u64, tokens_out: u64) -> f64 {
    match prices.as_ref().and_then(|p| p.get(key)) {
        Some([input, output]) => {
            (tokens_in as f64 * input + tokens_out as f64 * output) / 1_000_000.0
        }
        None => 0.0,
    }
}

fn attribute(effects: &[Value], prices: &Option<Prices>) -> (Value, BTreeMap<String, Attribution>) {
    let mut usage = Attribution::default();
    let mut attribution = BTreeMap::new();
    for effect in effects {
        let key = effect["usage"]["model"]
            .as_str()
            .or_else(|| effect["executor"].as_str())
            .unwrap_or("unknown")
            .to_owned();
        let tokens_in = effect["usage"]["tokensIn"].as_u64().unwrap_or(0);
        let tokens_out = effect["usage"]["tokensOut"].as_u64().unwrap_or(0);
        let extra = cost_for(prices, &key, tokens_in, tokens_out);
        let entry: &mut Attribution = attribution.entry(key).or_default();
        entry.calls += 1;
        entry.tokens_in += tokens_in;
        entry.tokens_out += tokens_out;
        entry.cost += extra;
        usage.tokens_in += tokens_in;
        usage.tokens_out += tokens_out;
        usage.cost += extra;
    }
    (
        json!({"tokensIn":usage.tokens_in,"tokensOut":usage.tokens_out,"cost":usage.cost}),
        attribution,
    )
}

fn attribution_value(map: &BTreeMap<String, Attribution>) -> Value {
    map.iter()
        .map(|(key, entry)| (key.clone(), entry.value()))
        .collect::<Map<_, _>>()
        .into()
}

fn work_of(receipt: &Value) -> Value {
    receipt["work"].clone()
}

fn add_work(total: &mut [u64; 3], work: &Value) {
    total[0] += work["steps"].as_u64().unwrap_or(0);
    total[1] += work["agentCalls"].as_u64().unwrap_or(0);
    total[2] += work["units"].as_u64().unwrap_or(0);
}

fn work_value(work: &[u64; 3]) -> Value {
    json!({"steps":work[0],"agentCalls":work[1],"units":work[2]})
}

fn usage_of(usage: &Value) -> Attribution {
    Attribution {
        calls: 0,
        tokens_in: usage["tokensIn"].as_u64().unwrap_or(0),
        tokens_out: usage["tokensOut"].as_u64().unwrap_or(0),
        cost: usage["cost"].as_f64().unwrap_or(0.0),
    }
}

fn usage_value(usage: &Attribution) -> Value {
    json!({"tokensIn":usage.tokens_in,"tokensOut":usage.tokens_out,"cost":usage.cost})
}

/// Non-dominated ids over an axis matrix: `dirs[k]` says which direction
/// is better on axis k (true = higher), `rows[i]` is system `ids[i]`'s
/// axis values. A row is dominated when another is at least as good on
/// every axis (per dir) and strictly better on one. Survivors sort by the
/// axes in order, then id — deterministic.
fn dominance(ids: &[String], dirs: &[bool], rows: &[Vec<f64>]) -> Vec<String> {
    let mut kept: Vec<usize> = (0..ids.len())
        .filter(|&i| {
            !(0..ids.len()).any(|j| {
                j != i
                    && rows[j].iter().enumerate().all(|(k, v)| {
                        if dirs[k] {
                            *v >= rows[i][k]
                        } else {
                            *v <= rows[i][k]
                        }
                    })
                    && rows[j].iter().enumerate().any(|(k, v)| {
                        if dirs[k] {
                            *v > rows[i][k]
                        } else {
                            *v < rows[i][k]
                        }
                    })
            })
        })
        .collect();
    kept.sort_by(|&a, &b| {
        for (k, up) in dirs.iter().enumerate() {
            let ord = if *up {
                rows[b][k].total_cmp(&rows[a][k])
            } else {
                rows[a][k].total_cmp(&rows[b][k])
            };
            if ord != std::cmp::Ordering::Equal {
                return ord;
            }
        }
        ids[a].cmp(&ids[b])
    });
    kept.into_iter().map(|i| ids[i].clone()).collect()
}

/// Non-dominated systems on (passed ↑, cost signal ↓, effect calls ↓). The
/// cost signal is the dollar `cost` when prices were supplied, otherwise
/// total token count — the default axis triple, computed through the same
/// dominance machinery configured axes use.
pub fn pareto(systems: &[Value], has_prices: bool) -> Vec<String> {
    let tokens = |s: &Value| -> f64 {
        s["usage"]["tokensIn"].as_f64().unwrap_or(0.0)
            + s["usage"]["tokensOut"].as_f64().unwrap_or(0.0)
    };
    let ids: Vec<String> = systems
        .iter()
        .map(|s| s["id"].as_str().unwrap_or("").to_owned())
        .collect();
    let rows: Vec<Vec<f64>> = systems
        .iter()
        .map(|s| {
            vec![
                s["passed"].as_f64().unwrap_or(0.0),
                if has_prices {
                    s["usage"]["cost"].as_f64().unwrap_or(0.0)
                } else {
                    tokens(s)
                },
                s["effectCalls"].as_f64().unwrap_or(0.0),
            ]
        })
        .collect();
    dominance(&ids, &[true, false, false], &rows)
}

/// Pareto under configured axes: every axis evaluated once per system —
/// the recorded axisValues are what dominance ran on.
fn axes_pareto(systems: &[Value], axes: &[Axis]) -> Vec<String> {
    let ids: Vec<String> = systems
        .iter()
        .map(|s| s["id"].as_str().unwrap_or("").to_owned())
        .collect();
    let dirs: Vec<bool> = axes.iter().map(|a| a.dir == "up").collect();
    let rows: Vec<Vec<f64>> = systems
        .iter()
        .map(|s| {
            axes.iter()
                .map(|a| s["axisValues"][&a.name].as_f64().unwrap_or(0.0))
                .collect()
        })
        .collect();
    dominance(&ids, &dirs, &rows)
}

/// Run every case of every system, persist the receipts, and emit a
/// `algal.bench.v1` report whose digest covers the whole comparison.
pub async fn run(
    config: &BenchConfig,
    store: &mut Store,
    tools: &Host,
    transports: &Transports,
) -> Result<Value> {
    let BenchConfig {
        cases,
        systems,
        prices,
        scorer,
        axes,
    } = config;
    let scorer = scorer.as_ref();
    let axes = axes.as_deref();
    let prices = prices.clone();
    let mut results = Vec::with_capacity(systems.len());
    for system in systems {
        let manifest_digest = store.admit(&system.manifest)?;
        let mut host = Host::default();
        host.entries = system.executors.clone();
        host.tools = tools.tools.clone();
        host.mailbox = tools.mailbox.clone();
        let mut case_results = Vec::with_capacity(cases.len());
        let mut work = [0u64; 3];
        let mut usage = Attribution::default();
        let mut attribution: BTreeMap<String, Attribution> = BTreeMap::new();
        let mut effect_calls = 0u64;
        let mut passed = 0u64;
        for case in cases {
            let receipt = runtime::run(
                system.manifest.clone(),
                case_args(&system.manifest, case)?,
                store,
                &mut host,
                transports,
                None,
            )
            .await?;
            let reference = store.put("runs", &receipt)?;
            let outputs = runtime::outputs(&system.manifest, &receipt)?;
            let outcome = receipt["outcome"].as_str().unwrap_or("");
            let ok = outcome == "complete"
                && match scorer {
                    Some(scorer) => {
                        eval_scorer(&scorer["program"], &case.args, &case.expect, &outputs)?
                    }
                    None => canonical(&outputs)? == canonical(&case.expect)?,
                };
            if ok {
                passed += 1;
            }
            let effects = receipt["effects"].as_array().cloned().unwrap_or_default();
            let (case_usage, case_attribution) = attribute(&effects, &prices);
            effect_calls += effects.len() as u64;
            add_work(&mut work, &receipt["work"]);
            usage.add(&usage_of(&case_usage));
            for (key, entry) in &case_attribution {
                attribution.entry(key.clone()).or_default().add(entry);
            }
            case_results.push(json!({
                "id":case.id,
                "passed":ok,
                "outcome":outcome,
                "outputs":outputs,
                "expect":case.expect,
                "receiptDigest":reference,
                "effectCalls":effects.len(),
                "work":work_of(&receipt),
                "usage":case_usage,
                "attribution":attribution_value(&case_attribution),
            }));
        }
        let mut result = json!({
            "id":system.id,
            "manifestDigest":manifest_digest,
            "manifestKey":system.manifest.value["key"],
            "passed":passed,
            "total":cases.len(),
            "effectCalls":effect_calls,
            "work":work_value(&work),
            "usage":usage_value(&usage),
            "attribution":attribution_value(&attribution),
            "cases":case_results,
        });
        if let Some(axes) = axes {
            let env = axis_env(&result);
            let mut values = Map::new();
            for axis in axes {
                values.insert(
                    axis.name.clone(),
                    json!(eval_axis(&axis.expr["program"], &env)?),
                );
            }
            result["axisValues"] = Value::Object(values);
        }
        results.push(result);
    }
    let case_values: Vec<Value> = cases
        .iter()
        .map(|c| json!({"id":c.id,"args":c.args,"expect":c.expect}))
        .collect();
    let pareto = match axes {
        Some(axes) => axes_pareto(&results, axes),
        None => pareto(&results, prices.is_some()),
    };
    let mut report = json!({
        "contract":"algal.bench.v1",
        "workload":digest(&Value::Array(case_values.clone()))?,
        "cases":Value::Array(case_values),
        "systems":Value::Array(results),
        "pareto":pareto,
    });
    if let Some(prices) = &prices {
        report["prices"] = prices
            .iter()
            .map(|(key, [input, output])| (key.clone(), json!({"input":input,"output":output})))
            .collect::<Map<_, _>>()
            .into();
    }
    if let Some(scorer) = scorer {
        report["scorer"] = scorer.clone();
    }
    if let Some(axes) = axes {
        report["axes"] = axes
            .iter()
            .map(|a| json!({"name":a.name,"dir":a.dir,"expr":a.expr}))
            .collect();
    }
    report["digest"] = json!(digest(&report)?);
    Ok(report)
}

fn parse_case(value: &Value, at: &str) -> Result<BenchCase> {
    keys(value, &["id", "args", "expect"])?;
    if object(&value["args"]).is_err() || object(&value["expect"]).is_err() {
        return Err(Error::invalid(format!("{at} needs object args and expect")));
    }
    Ok(BenchCase {
        id: bench_id(&value["id"], &format!("{at}.id"))?,
        args: value["args"].clone(),
        expect: value["expect"].clone(),
    })
}

fn parse_prices(value: &Value, at: &str) -> Result<Prices> {
    let mut map = Prices::new();
    for (key, price) in object(value)? {
        if key.is_empty() || key.len() > 256 {
            return Err(Error::invalid(format!("{at} has an invalid price key")));
        }
        keys(price, &["input", "output"])?;
        map.insert(
            key.clone(),
            [
                number(&price["input"], &format!("{at}.{key}.input"))?,
                number(&price["output"], &format!("{at}.{key}.output"))?,
            ],
        );
    }
    Ok(map)
}

fn parse_attribution(value: &Value, at: &str) -> Result<BTreeMap<String, Attribution>> {
    let mut map = BTreeMap::new();
    for (key, entry) in object(value)? {
        if key.is_empty() || key.len() > 256 {
            return Err(Error::invalid(format!(
                "{at} has an invalid attribution key"
            )));
        }
        keys(entry, &["calls", "tokensIn", "tokensOut", "cost"])?;
        map.insert(
            key.clone(),
            Attribution {
                calls: count(&entry["calls"], &format!("{at}.{key}.calls"))?,
                tokens_in: count(&entry["tokensIn"], &format!("{at}.{key}.tokensIn"))?,
                tokens_out: count(&entry["tokensOut"], &format!("{at}.{key}.tokensOut"))?,
                cost: number(&entry["cost"], &format!("{at}.{key}.cost"))?,
            },
        );
    }
    Ok(map)
}

fn parse_work(value: &Value, at: &str) -> Result<[u64; 3]> {
    keys(value, &["steps", "agentCalls", "units"])?;
    Ok([
        count(&value["steps"], &format!("{at}.steps"))?,
        count(&value["agentCalls"], &format!("{at}.agentCalls"))?,
        count(&value["units"], &format!("{at}.units"))?,
    ])
}

fn parse_usage(value: &Value, at: &str) -> Result<Attribution> {
    keys(value, &["tokensIn", "tokensOut", "cost"])?;
    Ok(Attribution {
        calls: 0,
        tokens_in: count(&value["tokensIn"], &format!("{at}.tokensIn"))?,
        tokens_out: count(&value["tokensOut"], &format!("{at}.tokensOut"))?,
        cost: number(&value["cost"], &format!("{at}.cost"))?,
    })
}

/// The parsed front matter of a `algal.bench.v1` report: the workload,
/// price card, scorer, and axis definitions verification replays against.
pub struct ParsedReport {
    pub cases: Vec<BenchCase>,
    pub prices: Option<Prices>,
    pub scorer: Option<Value>,
    pub axes: Option<Vec<Axis>>,
}

/// Parse a `algal.bench.v1` report within its bounds.
pub fn parse_report(report: &Value) -> Result<ParsedReport> {
    keys(
        report,
        &[
            "contract", "workload", "cases", "prices", "scorer", "axes", "systems", "pareto",
            "digest",
        ],
    )?;
    if report["contract"] != "algal.bench.v1" {
        return Err(Error::invalid("bench.contract must be algal.bench.v1"));
    }
    sha(&report["workload"], "bench.workload")?;
    sha(&report["digest"], "bench.digest")?;
    let cases = report["cases"]
        .as_array()
        .filter(|list| !list.is_empty() && list.len() <= MAX_CASES)
        .ok_or_else(|| Error::invalid("bench.cases must be a bounded non-empty list"))?;
    let systems = report["systems"]
        .as_array()
        .filter(|list| !list.is_empty() && list.len() <= MAX_SYSTEMS)
        .ok_or_else(|| Error::invalid("bench.systems must be a bounded non-empty list"))?;
    let pareto = report["pareto"]
        .as_array()
        .filter(|list| list.len() <= MAX_SYSTEMS)
        .ok_or_else(|| Error::invalid("bench.pareto must be a bounded list"))?;
    let system_ids: BTreeSet<String> = systems
        .iter()
        .map(|s| s["id"].as_str().unwrap_or("").to_owned())
        .collect();
    let mut seen = BTreeSet::new();
    for (i, entry) in pareto.iter().enumerate() {
        let id = bench_id(entry, &format!("bench.pareto[{i}]"))?;
        if !system_ids.contains(&id) {
            return Err(Error::invalid(format!(
                "bench.pareto[{i}] names an unknown system"
            )));
        }
        if !seen.insert(id) {
            return Err(Error::invalid("bench.pareto contains duplicates"));
        }
    }
    let cases = cases
        .iter()
        .enumerate()
        .map(|(i, c)| parse_case(c, &format!("bench.cases[{i}]")))
        .collect::<Result<Vec<_>>>()?;
    let prices = match report.get("prices") {
        None | Some(Value::Null) => None,
        Some(raw) => Some(parse_prices(raw, "bench.prices")?),
    };
    let scorer = match report.get("scorer") {
        None | Some(Value::Null) => None,
        Some(raw) => {
            check_scorer(raw)?;
            Some(raw.clone())
        }
    };
    let axes = match report.get("axes") {
        None | Some(Value::Null) => None,
        Some(raw) => Some(parse_axes(raw, "bench.axes")?),
    };
    for (i, system) in systems.iter().enumerate() {
        let at = format!("bench.systems[{i}].axisValues");
        match (&axes, system.get("axisValues")) {
            (None, Some(_)) => {
                return Err(Error::invalid(format!("{at} requires bench.axes")));
            }
            (Some(_), None) => {
                return Err(Error::invalid(format!("{at} is required by bench.axes")));
            }
            (Some(axes), Some(values)) => {
                let map = object(values)
                    .map_err(|_| Error::invalid(format!("{at} must be an object")))?;
                let names: BTreeSet<&str> = axes.iter().map(|a| a.name.as_str()).collect();
                if map.len() != names.len() || !map.keys().all(|k| names.contains(k.as_str())) {
                    return Err(Error::invalid(format!("{at} must name every axis")));
                }
                for (key, value) in map {
                    if value.as_f64().filter(|n| n.is_finite()).is_none() {
                        return Err(Error::invalid(format!(
                            "{at}.{key} must be a finite number"
                        )));
                    }
                }
            }
            (None, None) => {}
        }
    }
    Ok(ParsedReport {
        cases,
        prices,
        scorer,
        axes,
    })
}

/// Recompute a bench report against the store: the report digest, workload
/// digest, and Pareto order must hold, and every case must match a stored,
/// offline-replayable run receipt.
pub async fn verify(report: &Value, store: &Store, tools: &Host) -> Result<Value> {
    let ParsedReport {
        cases: workload_cases,
        prices,
        scorer,
        axes,
    } = parse_report(report)?;
    let claimed = report["digest"].as_str().unwrap_or("").to_owned();
    let mut mismatches: Vec<String> = Vec::new();
    let mut base = report.clone();
    if let Some(body) = base.as_object_mut() {
        body.remove("digest");
    }
    let actual = digest(&base)?;
    if actual != claimed {
        mismatches.push(format!("digest: claimed {claimed}, computed {actual}"));
    }
    let workload = digest(&report["cases"])?;
    if workload != report["workload"].as_str().unwrap_or("") {
        mismatches.push(format!(
            "workload: claimed {}, computed {workload}",
            report["workload"].as_str().unwrap_or("")
        ));
    }
    let systems = report["systems"].as_array().cloned().unwrap_or_default();
    if let Some(axes) = &axes {
        for system in &systems {
            let id = system["id"].as_str().unwrap_or("");
            let env = axis_env(system);
            for axis in axes {
                match eval_axis(&axis.expr["program"], &env) {
                    Ok(value) => {
                        if system["axisValues"][axis.name.as_str()].as_f64() != Some(value) {
                            mismatches.push(format!(
                                "{id} axis \"{}\" does not match the system totals",
                                axis.name
                            ));
                        }
                    }
                    Err(e) => mismatches
                        .push(format!("{id} axis \"{}\" failed: {}", axis.name, e.message)),
                }
            }
        }
    }
    let recomputed = match &axes {
        Some(axes) => axes_pareto(&systems, axes),
        None => pareto(&systems, prices.is_some()),
    };
    if canonical(&json!(recomputed))? != canonical(&report["pareto"])? {
        mismatches.push("pareto does not match the system totals".into());
    }
    let mut case_ids = BTreeSet::new();
    let mut cases_by_id = BTreeMap::new();
    for case in &workload_cases {
        if !case_ids.insert(case.id.clone()) {
            mismatches.push(format!("duplicate case id \"{}\"", case.id));
        }
        cases_by_id.insert(case.id.clone(), case);
    }
    let mut system_ids = BTreeSet::new();
    let mut checked = 0u64;
    for (i, system) in systems.iter().enumerate() {
        let at = format!("bench.systems[{i}]");
        keys(
            system,
            &[
                "id",
                "manifestDigest",
                "manifestKey",
                "passed",
                "total",
                "effectCalls",
                "work",
                "usage",
                "attribution",
                "cases",
                "axisValues",
            ],
        )?;
        let id = bench_id(&system["id"], &format!("{at}.id"))?;
        if !system_ids.insert(id.clone()) {
            mismatches.push(format!("duplicate system id \"{id}\""));
        }
        let manifest_digest = sha(&system["manifestDigest"], &format!("{at}.manifestDigest"))?;
        let manifest_value = match store.get("manifests", &manifest_digest)? {
            Some(value) => value,
            None => {
                mismatches.push(format!("{id}: manifest {manifest_digest} missing"));
                continue;
            }
        };
        let manifest = Manifest::parse(&manifest_value)?;
        if manifest.value["interface"].as_object().is_none() {
            mismatches.push(format!("{id}: manifest has no interface"));
        }
        let system_cases = system["cases"]
            .as_array()
            .filter(|list| !list.is_empty() && list.len() <= MAX_CASES)
            .ok_or_else(|| Error::invalid(format!("{at}.cases must be a bounded list")))?;
        if count(&system["total"], &format!("{at}.total"))? != system_cases.len() as u64
            || count(&system["passed"], &format!("{at}.passed"))? > system_cases.len() as u64
        {
            return Err(Error::invalid(format!("{at} is not a valid score")));
        }
        let recount = system_cases.iter().filter(|c| c["passed"] == true).count() as u64;
        if recount != count(&system["passed"], &format!("{at}.passed"))? {
            mismatches.push(format!("{id}: passed does not match its cases"));
        }
        if system_cases.len() != workload_cases.len() {
            mismatches.push(format!("{id}: case count differs from the workload"));
        }
        let mut work = [0u64; 3];
        let mut usage = Attribution::default();
        let mut attribution: BTreeMap<String, Attribution> = BTreeMap::new();
        let mut effect_calls = 0u64;
        for (j, case) in system_cases.iter().enumerate() {
            let cat = format!("{at}.cases[{j}]");
            keys(
                case,
                &[
                    "id",
                    "passed",
                    "outcome",
                    "outputs",
                    "expect",
                    "receiptDigest",
                    "effectCalls",
                    "work",
                    "usage",
                    "attribution",
                ],
            )?;
            let case_id = bench_id(&case["id"], &format!("{cat}.id"))?;
            let outcome = case["outcome"].as_str().unwrap_or("");
            if !["complete", "failed", "stuck"].contains(&outcome) {
                return Err(Error::invalid(format!("{cat}.outcome is invalid")));
            }
            if !case["passed"].is_boolean() {
                return Err(Error::invalid(format!("{cat}.passed must be boolean")));
            }
            object(&case["outputs"])?;
            object(&case["expect"])?;
            sha(&case["receiptDigest"], &format!("{cat}.receiptDigest"))?;
            parse_work(&case["work"], &cat)?;
            parse_usage(&case["usage"], &cat)?;
            parse_attribution(&case["attribution"], &cat)?;
            let Some(bench_case) = cases_by_id.get(&case_id) else {
                mismatches.push(format!("{id}: case \"{case_id}\" is not in the workload"));
                continue;
            };
            if canonical(&case["expect"])? != canonical(&bench_case.expect)? {
                mismatches.push(format!(
                    "{id} case {case_id}: expect differs from the workload"
                ));
            }
            let expected_pass = if outcome == "complete" {
                match &scorer {
                    Some(scorer) => match eval_scorer(
                        &scorer["program"],
                        &bench_case.args,
                        &case["expect"],
                        &case["outputs"],
                    ) {
                        Ok(p) => p,
                        Err(e) => {
                            mismatches
                                .push(format!("{id} case {case_id} scorer error: {}", e.message));
                            continue;
                        }
                    },
                    None => canonical(&case["outputs"])? == canonical(&case["expect"])?,
                }
            } else {
                false
            };
            if case["passed"].as_bool() != Some(expected_pass) {
                mismatches.push(format!("{id} case {case_id}: invalid pass claim"));
            }
            let case_work = parse_work(&case["work"], &cat)?;
            work[0] += case_work[0];
            work[1] += case_work[1];
            work[2] += case_work[2];
            usage.add(&parse_usage(&case["usage"], &cat)?);
            effect_calls += count(&case["effectCalls"], &format!("{cat}.effectCalls"))?;
            for (key, entry) in parse_attribution(&case["attribution"], &cat)? {
                attribution.entry(key).or_default().add(&entry);
            }
            let receipt_digest = case["receiptDigest"].as_str().unwrap_or("");
            let Some(receipt) = store.get("runs", receipt_digest)? else {
                mismatches.push(format!(
                    "{id} case {case_id}: receipt {receipt_digest} missing"
                ));
                continue;
            };
            if receipt["manifestDigest"].as_str() != Some(manifest_digest.as_str()) {
                mismatches.push(format!(
                    "{id} case {case_id}: receipt ran {}",
                    receipt["manifestDigest"].as_str().unwrap_or("")
                ));
                continue;
            }
            if receipt["outcome"].as_str() != Some(outcome) {
                mismatches.push(format!("{id} case {case_id}: outcome differs from receipt"));
            }
            if manifest.value["interface"].as_object().is_some() {
                let outputs = runtime::outputs(&manifest, &receipt)?;
                if canonical(&outputs)? != canonical(&case["outputs"])? {
                    mismatches.push(format!("{id} case {case_id}: outputs differ from receipt"));
                }
                let empty = Map::new();
                let inputs = manifest.value["interface"]["inputs"]
                    .as_object()
                    .unwrap_or(&empty);
                let mut expected_args = Map::new();
                for (name, value) in object(&bench_case.args)? {
                    match inputs.get(name) {
                        Some(target) => {
                            expected_args
                                .entry(target["cell"].as_str().unwrap_or("").to_owned())
                                .or_insert_with(|| json!({}))
                                [target["port"].as_str().unwrap_or("")] = value.clone();
                        }
                        None => {
                            mismatches.push(format!(
                                "{id} case {case_id}: unknown workload input \"{name}\""
                            ));
                        }
                    }
                }
                if canonical(&receipt["args"])? != canonical(&Value::Object(expected_args))? {
                    mismatches.push(format!(
                        "{id} case {case_id}: receipt args differ from the workload"
                    ));
                }
            }
            if canonical(&receipt["work"])? != canonical(&case["work"])? {
                mismatches.push(format!("{id} case {case_id}: work differs from receipt"));
            }
            let effects = receipt["effects"].as_array().cloned().unwrap_or_default();
            if effects.len() as u64 != count(&case["effectCalls"], &format!("{cat}.effectCalls"))? {
                mismatches.push(format!(
                    "{id} case {case_id}: effectCalls differs from receipt"
                ));
            }
            let (receipt_usage, receipt_attribution) = attribute(&effects, &prices);
            if canonical(&receipt_usage)? != canonical(&case["usage"])? {
                mismatches.push(format!("{id} case {case_id}: usage differs from receipt"));
            }
            if canonical(&attribution_value(&receipt_attribution))?
                != canonical(&case["attribution"])?
            {
                mismatches.push(format!(
                    "{id} case {case_id}: attribution differs from receipt"
                ));
            }
            let verified = runtime::verify(&receipt, manifest.clone(), store, tools).await?;
            checked += 1;
            if verified["ok"] != true {
                let detail = verified["mismatches"]
                    .as_array()
                    .map(|list| {
                        list.iter()
                            .filter_map(|m| m.as_str())
                            .collect::<Vec<_>>()
                            .join("; ")
                    })
                    .unwrap_or_default();
                mismatches.push(format!("{id} case {case_id}: {detail}"));
            }
        }
        if canonical(&work_value(&work))? != canonical(&system["work"])? {
            mismatches.push(format!("{id}: work does not match its cases"));
        }
        if canonical(&usage_value(&usage))? != canonical(&system["usage"])? {
            mismatches.push(format!("{id}: usage does not match its cases"));
        }
        if canonical(&attribution_value(&attribution))? != canonical(&system["attribution"])? {
            mismatches.push(format!("{id}: attribution does not match its cases"));
        }
        if effect_calls != count(&system["effectCalls"], &format!("{at}.effectCalls"))? {
            mismatches.push(format!("{id}: effectCalls does not match its cases"));
        }
    }
    Ok(json!({
        "ok":mismatches.is_empty(),
        "digest":claimed,
        "checkedReceipts":checked,
        "mismatches":mismatches,
    }))
}

/// The inspect surface: a bounded summary of a parsed report.
pub fn inspect(report: &Value) -> Result<Value> {
    parse_report(report)?;
    let pareto = report["pareto"]
        .as_array()
        .map(|list| list.iter().filter_map(|s| s.as_str()).collect::<Vec<_>>())
        .unwrap_or_default();
    let systems = report["systems"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|system| {
            json!({
                "id":system["id"],
                "manifestKey":system["manifestKey"],
                "manifestDigest":system["manifestDigest"],
                "passed":system["passed"],
                "total":system["total"],
                "effectCalls":system["effectCalls"],
                "work":system["work"],
                "usage":system["usage"],
                "attribution":system["attribution"],
                "pareto":pareto.contains(&system["id"].as_str().unwrap_or("")),
            })
        })
        .collect::<Vec<_>>();
    Ok(json!({
        "contract":report["contract"],
        "digest":report["digest"],
        "workload":report["workload"],
        "pareto":report["pareto"],
        "systems":systems,
    }))
}
