//! The foundry: measured candidate selection over a split workload.
//! Candidates are admitted manifests; every case is a replayable run
//! receipt. Train and validation splits select; holdout is sealed until
//! after promotion. A generator organism can propose candidates, and
//! `search` iterates propose → measure → survive across bounded
//! generations. Port of src/foundry.ts, src/search.ts,
//! src/foundry-verify.ts, and src/search-verify.ts.

use crate::{
    Error, Result,
    canonical::{canonical, digest, read_json},
    contract::{Manifest, keys, object, text},
    effects::Host,
    graph::Transports,
    runtime,
    store::Store,
};
use serde_json::{Map, Value, json};
use std::{collections::BTreeSet, fs::File, path::Path};

const MAX_CANDIDATES: usize = 32;
const MAX_CASES: usize = 256;
const MAX_ID: usize = 64;
const MAX_GENERATIONS: usize = 8;

fn foundry_id(value: &Value, at: &str) -> Result<String> {
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

#[derive(Clone)]
pub struct FoundryCase {
    pub id: String,
    pub split: String,
    pub args: Value,
    pub expect: Value,
}

pub struct Generator {
    pub manifest: Manifest,
    pub args: Value,
    pub output: String,
    pub field: Option<String>,
}

pub struct Search {
    pub max_generations: usize,
    pub feedback_input: String,
}

/// A parsed `algal.foundry.config.v1`.
pub struct Config {
    pub candidates: Vec<Manifest>,
    pub generator: Option<Generator>,
    pub cases: Vec<FoundryCase>,
    pub search: Option<Search>,
    pub scorer: Option<Value>,
}

/// Parse a `algal.foundry.config.v1` file: candidate manifest paths,
/// an optional generator, and a split workload. `search` settings are only
/// legal under the `foundry search` command.
pub fn load_config(path: &Path, search_mode: bool) -> Result<Config> {
    let config = read_json(File::open(path)?, 1_048_576)?;
    keys(
        &config,
        &[
            "contract",
            "candidates",
            "generator",
            "cases",
            "search",
            "scorer",
        ],
    )?;
    if config["contract"] != "algal.foundry.config.v1" {
        return Err(Error::invalid(
            "foundry config.contract must be algal.foundry.config.v1",
        ));
    }
    if !search_mode && config.get("search").is_some() {
        return Err(Error::invalid(
            "search settings require the foundry search command",
        ));
    }
    // Contract-level validation before any file IO.
    let scorer = if config["scorer"].is_null() {
        None
    } else {
        let scorer = config["scorer"].clone();
        check_scorer(&scorer)?;
        Some(scorer)
    };
    let base = path.parent().unwrap_or(Path::new("."));
    let mut candidates = Vec::new();
    if let Some(entries) = config["candidates"].as_array() {
        if entries.len() > MAX_CANDIDATES {
            return Err(Error::limit(format!(
                "foundry candidates exceed {MAX_CANDIDATES}"
            )));
        }
        for (i, entry) in entries.iter().enumerate() {
            let path = base.join(text(entry, 512).map_err(|_| {
                Error::invalid(format!("foundry config.candidates[{i}] must be a path"))
            })?);
            candidates.push(Manifest::parse(&read_json(File::open(&path)?, 1_048_576)?)?);
        }
    } else if !config["candidates"].is_null() {
        return Err(Error::invalid("foundry config.candidates must be a list"));
    }
    if candidates.is_empty() && config["generator"].is_null() {
        return Err(Error::invalid(
            "foundry config needs candidates or a generator",
        ));
    }
    let generator = if config["generator"].is_null() {
        None
    } else {
        let raw = &config["generator"];
        keys(raw, &["manifest", "args", "output", "field"])?;
        if object(&raw["args"]).is_err() {
            return Err(Error::invalid(
                "foundry config.generator.args must be an object",
            ));
        }
        let manifest = base.join(text(&raw["manifest"], 512)?);
        Some(Generator {
            manifest: Manifest::parse(&read_json(File::open(&manifest)?, 1_048_576)?)?,
            args: raw["args"].clone(),
            output: text(&raw["output"], MAX_ID)?.to_owned(),
            field: match raw.get("field") {
                None | Some(Value::Null) => None,
                Some(field) => Some(text(field, MAX_ID)?.to_owned()),
            },
        })
    };
    let raw_cases = config["cases"]
        .as_array()
        .filter(|list| !list.is_empty())
        .ok_or_else(|| Error::invalid("foundry config.cases must be a non-empty list"))?;
    if raw_cases.len() > MAX_CASES {
        return Err(Error::limit(format!("foundry cases exceed {MAX_CASES}")));
    }
    let mut cases = Vec::with_capacity(raw_cases.len());
    let mut ids = BTreeSet::new();
    let mut splits = BTreeSet::new();
    for (i, raw) in raw_cases.iter().enumerate() {
        let at = format!("foundry config.cases[{i}]");
        keys(raw, &["id", "split", "args", "expect"])?;
        let split = text(&raw["split"], 16)?;
        if !["train", "validation", "holdout"].contains(&split) {
            return Err(Error::invalid(format!(
                "{at} needs a train|validation|holdout split"
            )));
        }
        splits.insert(split.to_owned());
        let id = foundry_id(&raw["id"], &format!("{at}.id"))?;
        if !ids.insert(id.clone()) {
            return Err(Error::invalid(format!(
                "duplicate foundry case id \"{id}\""
            )));
        }
        if object(&raw["args"]).is_err() || object(&raw["expect"]).is_err() {
            return Err(Error::invalid(format!(
                "{at} needs args and expect objects"
            )));
        }
        cases.push(FoundryCase {
            id,
            split: split.to_owned(),
            args: raw["args"].clone(),
            expect: raw["expect"].clone(),
        });
    }
    for split in ["train", "validation", "holdout"] {
        if !splits.contains(split) {
            return Err(Error::invalid(format!(
                "foundry requires at least one {split} case"
            )));
        }
    }
    let search = if search_mode && !config["search"].is_null() {
        let raw = &config["search"];
        keys(raw, &["maxGenerations", "feedbackInput"])?;
        let max = raw["maxGenerations"]
            .as_u64()
            .filter(|n| (1..=MAX_GENERATIONS as u64).contains(n))
            .ok_or_else(|| {
                Error::invalid(format!(
                    "search maxGenerations must be 1..{MAX_GENERATIONS}"
                ))
            })? as usize;
        Some(Search {
            max_generations: max,
            feedback_input: text(&raw["feedbackInput"], MAX_ID)?.to_owned(),
        })
    } else {
        None
    };
    Ok(Config {
        candidates,
        generator,
        cases,
        search,
        scorer,
    })
}

fn case_args(manifest: &Manifest, case: &FoundryCase) -> Result<Value> {
    let mut args = Map::new();
    for (name, value) in object(&case.args)? {
        let target = object(&manifest.value["interface"]["inputs"])?
            .get(name)
            .ok_or_else(|| {
                Error::invalid(format!(
                    "case {}: unknown candidate input \"{name}\"",
                    case.id
                ))
            })?;
        args.entry(target["cell"].as_str().unwrap_or("").to_owned())
            .or_insert_with(|| json!({}))[target["port"].as_str().unwrap_or("")] = value.clone();
    }
    Ok(Value::Object(args))
}

fn check_interfaces(candidates: &[Manifest], cases: &[FoundryCase]) -> Result<()> {
    let mut digests = BTreeSet::new();
    for candidate in candidates {
        let interface = object(&candidate.value["interface"]).map_err(|_| {
            Error::invalid(format!(
                "candidate {} must declare an interface",
                candidate.value["key"]
            ))
        })?;
        let digest = candidate.digest()?;
        if !digests.insert(digest.clone()) {
            return Err(Error::invalid(format!(
                "duplicate foundry candidate {digest}"
            )));
        }
        let inputs = object(&interface["inputs"])?;
        let outputs = object(&interface["outputs"])?;
        for case in cases {
            for name in object(&case.args)?.keys() {
                if !inputs.contains_key(name) {
                    return Err(Error::invalid(format!(
                        "case {}: unknown candidate input \"{name}\"",
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
                        "case {}: unknown candidate output \"{name}\"",
                        case.id
                    )));
                }
            }
        }
    }
    Ok(())
}

fn usage_of(effects: &[Value]) -> Value {
    let (mut tokens_in, mut tokens_out) = (0u64, 0u64);
    for effect in effects {
        tokens_in += effect["usage"]["tokensIn"].as_u64().unwrap_or(0);
        tokens_out += effect["usage"]["tokensOut"].as_u64().unwrap_or(0);
    }
    json!({"tokensIn":tokens_in,"tokensOut":tokens_out})
}

/// `BOUNDS.maxExprFuel` in src/contract.ts — same budget the runtime gives
/// expr cells and edge guards.
const MAX_EXPR_FUEL: u64 = 100_000;

/// An `algal.expr.v1` scorer program replaces exact-match with a bounded
/// predicate over {"args","expect","outputs"} — fitness as data. A thrown
/// or non-boolean scorer is a config bug and fails SCORER_INVALID.
fn eval_scorer(program: &Value, case: &FoundryCase, outputs: &Value) -> Result<bool> {
    let mut env = Map::new();
    env.insert("args".to_owned(), case.args.clone());
    env.insert("expect".to_owned(), case.expect.clone());
    env.insert("outputs".to_owned(), outputs.clone());
    match algal_expr::run(program, &env, MAX_EXPR_FUEL) {
        Ok((Value::Bool(b), _)) => Ok(b),
        Ok((value, _)) => Err(Error::new(
            "SCORER_INVALID",
            format!("scorer must produce boolean, got {}", canonical(&value)?),
        )),
        Err((e, _)) => Err(Error::new(
            "SCORER_INVALID",
            format!("scorer {}", canonical(&e.to_json())?),
        )),
    }
}

/// Same predicate on a recorded report case (id/split/passed extra).
fn eval_scorer_record(program: &Value, case: &Value) -> Result<bool> {
    let mapped = FoundryCase {
        id: case["id"].as_str().unwrap_or("").to_owned(),
        split: case["split"].as_str().unwrap_or("").to_owned(),
        args: case["args"].clone(),
        expect: case["expect"].clone(),
    };
    eval_scorer(program, &mapped, &case["outputs"])
}

fn check_scorer(scorer: &Value) -> Result<()> {
    keys(scorer, &["contract", "program"])?;
    if scorer["contract"] != "algal.expr.v1" {
        return Err(Error::invalid("scorer.contract must be algal.expr.v1"));
    }
    let names: BTreeSet<String> = ["args", "expect", "outputs"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    algal_expr::check_program(&scorer["program"], &names).map_err(|e| {
        Error::new(
            "SCORER_INVALID",
            format!("scorer {}", canonical(&e.to_json()).unwrap_or_default()),
        )
    })
}

async fn evaluate_case(
    manifest: &Manifest,
    case: &FoundryCase,
    scorer: Option<&Value>,
    store: &mut Store,
    host: &mut Host,
    transports: &Transports,
) -> Result<Value> {
    let receipt = runtime::run(
        manifest.clone(),
        case_args(manifest, case)?,
        store,
        host,
        transports,
        None,
    )
    .await?;
    let reference = store.put("runs", &receipt)?;
    let outputs = runtime::outputs(manifest, &receipt)?;
    let outcome = receipt["outcome"].as_str().unwrap_or("");
    let passed = outcome == "complete"
        && match scorer {
            Some(scorer) => eval_scorer(&scorer["program"], case, &outputs)?,
            None => canonical(&outputs)? == canonical(&case.expect)?,
        };
    let effects = receipt["effects"].as_array().cloned().unwrap_or_default();
    Ok(json!({
        "id":case.id,
        "split":case.split,
        "passed":passed,
        "outcome":outcome,
        "args":case.args,
        "outputs":outputs,
        "expect":case.expect,
        "receiptDigest":reference,
        "work":receipt["work"],
        "usage":usage_of(&effects),
    }))
}

fn score(cases: &[Value], split: &str) -> Value {
    let selected: Vec<&Value> = cases
        .iter()
        .filter(|c| c["split"].as_str() == Some(split))
        .collect();
    json!({
        "passed":selected.iter().filter(|c| c["passed"] == true).count(),
        "total":selected.len(),
    })
}

fn ratio(score: &Value) -> f64 {
    let total = score["total"].as_f64().unwrap_or(0.0);
    if total == 0.0 {
        0.0
    } else {
        score["passed"].as_f64().unwrap_or(0.0) / total
    }
}

/// Deterministic winner: validation pass rate, then train rate, then
/// fewest agent calls, then least work, then digest order.
pub fn select(candidates: &[Value]) -> Result<String> {
    let mut sorted: Vec<&Value> = candidates.iter().collect();
    sorted.sort_by(|a, b| {
        ratio(&b["validation"])
            .total_cmp(&ratio(&a["validation"]))
            .then(ratio(&b["train"]).total_cmp(&ratio(&a["train"])))
            .then(
                a["work"]["agentCalls"]
                    .as_u64()
                    .cmp(&b["work"]["agentCalls"].as_u64()),
            )
            .then(
                a["work"]["units"]
                    .as_u64()
                    .cmp(&b["work"]["units"].as_u64()),
            )
            .then(
                a["manifestDigest"]
                    .as_str()
                    .unwrap_or("")
                    .cmp(b["manifestDigest"].as_str().unwrap_or("")),
            )
    });
    sorted
        .first()
        .and_then(|c| c["manifestDigest"].as_str())
        .map(String::from)
        .ok_or_else(|| Error::invalid("foundry requires at least one candidate result"))
}

async fn evaluate_cases(
    manifest: &Manifest,
    cases: &[&FoundryCase],
    scorer: Option<&Value>,
    store: &mut Store,
    host: &mut Host,
    transports: &Transports,
) -> Result<Vec<Value>> {
    let mut results = Vec::with_capacity(cases.len());
    for case in cases {
        results.push(evaluate_case(manifest, case, scorer, store, host, transports).await?);
    }
    Ok(results)
}

/// Evaluate every non-holdout case for every candidate and select the
/// promoted manifest digest.
pub async fn evaluate_population(
    candidates: &[Manifest],
    cases: &[FoundryCase],
    scorer: Option<&Value>,
    store: &mut Store,
    host: &mut Host,
    transports: &Transports,
) -> Result<(Vec<Value>, String)> {
    let selection_cases: Vec<&FoundryCase> =
        cases.iter().filter(|c| c.split != "holdout").collect();
    let mut results = Vec::with_capacity(candidates.len());
    for candidate in candidates {
        let manifest_digest = store.admit(candidate)?;
        let evaluated =
            evaluate_cases(candidate, &selection_cases, scorer, store, host, transports).await?;
        let mut work = json!({"steps":0,"agentCalls":0,"units":0});
        let mut usage = json!({"tokensIn":0,"tokensOut":0});
        for case in &evaluated {
            for field in ["steps", "agentCalls", "units"] {
                work[field] = json!(
                    work[field].as_u64().unwrap_or(0) + case["work"][field].as_u64().unwrap_or(0)
                );
            }
            for field in ["tokensIn", "tokensOut"] {
                usage[field] = json!(
                    usage[field].as_u64().unwrap_or(0) + case["usage"][field].as_u64().unwrap_or(0)
                );
            }
        }
        results.push(json!({
            "manifestDigest":manifest_digest,
            "manifestKey":candidate.value["key"],
            "train":score(&evaluated, "train"),
            "validation":score(&evaluated, "validation"),
            "work":work,
            "usage":usage,
            "cases":evaluated,
        }));
    }
    let promoted = select(&results)?;
    Ok((results, promoted))
}

/// Run a foundry epoch: select on train+validation, then unseal holdout
/// for the promoted candidate only, and digest the whole report.
pub async fn run(
    candidates: &[Manifest],
    cases: &[FoundryCase],
    scorer: Option<&Value>,
    lineage: Option<(String, String)>,
    store: &mut Store,
    host: &mut Host,
    transports: &Transports,
) -> Result<Value> {
    check_interfaces(candidates, cases)?;
    if let Some(scorer) = scorer {
        check_scorer(scorer)?;
    }
    let (results, promoted) =
        evaluate_population(candidates, cases, scorer, store, host, transports).await?;
    let winner = candidates
        .iter()
        .find(|candidate| candidate.digest().ok().as_deref() == Some(promoted.as_str()))
        .ok_or_else(|| Error::invalid("promoted candidate missing"))?;
    let holdout_cases: Vec<&FoundryCase> = cases.iter().filter(|c| c.split == "holdout").collect();
    let evaluated = evaluate_cases(winner, &holdout_cases, scorer, store, host, transports).await?;
    let mut report = json!({
        "contract":"algal.foundry.v1",
        "candidates":results,
        "promoted":promoted,
        "holdout":{
            "passed":evaluated.iter().filter(|c| c["passed"] == true).count(),
            "total":evaluated.len(),
            "cases":evaluated,
        },
    });
    if let Some(scorer) = scorer {
        report["scorer"] = scorer.clone();
    }
    if let Some((generator_digest, receipt_digest)) = lineage {
        report["lineage"] =
            json!({"generatorDigest":generator_digest,"receiptDigest":receipt_digest});
    }
    report["digest"] = json!(digest(&report)?);
    Ok(report)
}

/// Run the generator organism and parse its emitted manifest list into
/// bounded candidate manifests. Returns the lineage digests and the
/// parsed candidates.
pub async fn generate(
    generator: &Manifest,
    args: &Value,
    output: &str,
    field: Option<&str>,
    store: &mut Store,
    host: &mut Host,
    transports: &Transports,
) -> Result<(String, String, Vec<Manifest>)> {
    let interface = object(&generator.value["interface"]).map_err(|_| {
        Error::invalid(format!(
            "generator {} must declare an interface",
            generator.value["key"]
        ))
    })?;
    let source = interface
        .get("outputs")
        .and_then(|outputs| outputs.get(output))
        .ok_or_else(|| {
            Error::invalid(format!(
                "generator {}: unknown interface output \"{output}\"",
                generator.value["key"]
            ))
        })?
        .clone();
    let empty = Map::new();
    let inputs = interface
        .get("inputs")
        .and_then(|i| i.as_object())
        .unwrap_or(&empty);
    let mut run_args = Map::new();
    for (name, value) in object(args)? {
        let target = inputs.get(name).ok_or_else(|| {
            Error::invalid(format!(
                "generator {}: unknown interface input \"{name}\"",
                generator.value["key"]
            ))
        })?;
        run_args
            .entry(target["cell"].as_str().unwrap_or("").to_owned())
            .or_insert_with(|| json!({}))[target["port"].as_str().unwrap_or("")] = value.clone();
    }
    let generator_digest = store.admit(generator)?;
    let receipt = runtime::run(
        generator.clone(),
        Value::Object(run_args),
        store,
        host,
        transports,
        None,
    )
    .await?;
    let receipt_digest = store.put("runs", &receipt)?;
    if receipt["outcome"] != "complete" {
        return Err(Error::invalid(format!(
            "generator {} ended {}",
            generator.value["key"], receipt["outcome"]
        )));
    }
    let emitted = &receipt["cells"][source["cell"].as_str().unwrap_or("")]["outputs"]
        [source["port"].as_str().unwrap_or("")];
    let value = match field {
        Some(field) if emitted.is_object() => &emitted[field],
        _ => emitted,
    };
    let list = value
        .as_array()
        .filter(|list| !list.is_empty())
        .ok_or_else(|| {
            Error::invalid(format!(
                "generator {}.{output} must emit a non-empty manifest list",
                generator.value["key"]
            ))
        })?;
    if list.len() > MAX_CANDIDATES {
        return Err(Error::limit(format!(
            "generated candidates exceed {MAX_CANDIDATES}"
        )));
    }
    let mut candidates = Vec::with_capacity(list.len());
    for (i, candidate) in list.iter().enumerate() {
        candidates.push(Manifest::parse(candidate).map_err(|error| {
            Error::invalid(format!("generated candidate {i}: {}", error.message))
        })?);
    }
    Ok((generator_digest, receipt_digest, candidates))
}

fn dedupe(candidates: Vec<Manifest>) -> Result<Vec<Manifest>> {
    let mut seen = BTreeSet::new();
    let mut out = Vec::new();
    for candidate in candidates {
        if seen.insert(candidate.digest()?) {
            out.push(candidate);
        }
    }
    Ok(out)
}

fn shrunk(selection: &[Value]) -> Vec<Value> {
    selection
        .iter()
        .map(|candidate| {
            json!({
                "manifestDigest":candidate["manifestDigest"],
                "manifestKey":candidate["manifestKey"],
                "train":candidate["train"],
                "validation":candidate["validation"],
                "work":candidate["work"],
                "usage":candidate["usage"],
            })
        })
        .collect()
}

/// Generational search: each generation the generator proposes candidates
/// seeded with the previous winner and the prior selection fed back
/// through `search.feedback_input`; the final epoch replays the surviving
/// population for a sealed-holdout report.
#[allow(clippy::too_many_arguments)]
pub async fn search(
    generator: &Generator,
    seeds: &[Manifest],
    cases: &[FoundryCase],
    spec: &Search,
    scorer: Option<&Value>,
    store: &mut Store,
    host: &mut Host,
    transports: &Transports,
) -> Result<Value> {
    let max_generations = spec.max_generations;
    if !(1..=MAX_GENERATIONS).contains(&max_generations) {
        return Err(Error::invalid(format!(
            "search maxGenerations must be 1..{MAX_GENERATIONS}"
        )));
    }
    let mut survivors = dedupe(seeds.to_vec())?;
    let mut prior: Option<(Vec<Value>, String)> = None;
    let mut generations = Vec::new();
    for generation in 0..max_generations {
        let mut args = object(&generator.args)?.clone();
        let feedback = match &prior {
            None => Value::Null,
            Some((candidates, promoted)) => json!({
                "generation":generation,
                "promoted":promoted,
                "candidates":shrunk(candidates),
            }),
        };
        args.insert(spec.feedback_input.clone(), feedback);
        let (generator_digest, receipt_digest, proposed) = generate(
            &generator.manifest,
            &Value::Object(args),
            &generator.output,
            generator.field.as_deref(),
            store,
            host,
            transports,
        )
        .await?;
        let proposed_digests: Vec<String> = proposed
            .iter()
            .map(|candidate| candidate.digest())
            .collect::<Result<_>>()?;
        let population = dedupe(survivors.iter().cloned().chain(proposed).collect())?;
        if population.len() > MAX_CANDIDATES {
            return Err(Error::limit(format!(
                "search population exceeds {MAX_CANDIDATES}"
            )));
        }
        check_interfaces(&population, cases)?;
        let (selection, promoted) =
            evaluate_population(&population, cases, scorer, store, host, transports).await?;
        generations.push(json!({
            "generation":generation,
            "generatorDigest":generator_digest,
            "receiptDigest":receipt_digest,
            "proposed":proposed_digests,
            "candidates":selection,
            "promoted":promoted,
        }));
        survivors = population
            .into_iter()
            .filter(|candidate| candidate.digest().ok().as_deref() == Some(promoted.as_str()))
            .collect();
        prior = Some((selection, promoted));
    }
    let last = generations
        .last()
        .ok_or_else(|| Error::invalid("search produced no generations"))?;
    let mut final_population = survivors;
    for digest in last["proposed"]
        .as_array()
        .map(|list| list.to_vec())
        .unwrap_or_default()
    {
        if let Some(value) = store.get("manifests", digest.as_str().unwrap_or(""))? {
            final_population.push(Manifest::parse(&value)?);
        }
    }
    let final_population = dedupe(final_population)?;
    let (generator_digest, receipt_digest) = (
        last["generatorDigest"].as_str().unwrap_or("").to_owned(),
        last["receiptDigest"].as_str().unwrap_or("").to_owned(),
    );
    let result = run(
        &final_population,
        cases,
        scorer,
        Some((generator_digest, receipt_digest)),
        store,
        host,
        transports,
    )
    .await?;
    let mut report = json!({
        "contract":"algal.search.v1",
        "generatorDigest":generator.manifest.digest()?,
        "generations":generations,
        "result":result,
    });
    report["digest"] = json!(digest(&report)?);
    Ok(report)
}

fn parse_case_result(value: &Value, at: &str) -> Result<()> {
    keys(
        value,
        &[
            "id",
            "split",
            "passed",
            "outcome",
            "args",
            "outputs",
            "expect",
            "receiptDigest",
            "work",
            "usage",
        ],
    )?;
    let split = text(&value["split"], 16)?;
    if !["train", "validation", "holdout"].contains(&split) {
        return Err(Error::invalid(format!("{at}.split is invalid")));
    }
    let outcome = text(&value["outcome"], 16)?;
    if !["complete", "failed", "stuck"].contains(&outcome) {
        return Err(Error::invalid(format!("{at}.outcome is invalid")));
    }
    if !value["passed"].is_boolean() {
        return Err(Error::invalid(format!("{at}.passed must be boolean")));
    }
    text(&value["id"], MAX_ID)?;
    object(&value["args"])?;
    object(&value["outputs"])?;
    object(&value["expect"])?;
    sha(&value["receiptDigest"], &format!("{at}.receiptDigest"))?;
    keys(&value["work"], &["steps", "agentCalls", "units"])?;
    for field in ["steps", "agentCalls", "units"] {
        count(&value["work"][field], &format!("{at}.work.{field}"))?;
    }
    keys(&value["usage"], &["tokensIn", "tokensOut"])?;
    for field in ["tokensIn", "tokensOut"] {
        count(&value["usage"][field], &format!("{at}.usage.{field}"))?;
    }
    Ok(())
}

fn parse_score(value: &Value, at: &str) -> Result<()> {
    keys(value, &["passed", "total"])?;
    let passed = count(&value["passed"], &format!("{at}.passed"))?;
    let total = count(&value["total"], &format!("{at}.total"))?;
    if total == 0 || passed > total {
        return Err(Error::invalid(format!("{at} is not a valid score")));
    }
    Ok(())
}

/// Parse a `algal.foundry.v1` report within its bounds.
pub fn parse_report(report: &Value) -> Result<()> {
    keys(
        report,
        &[
            "contract",
            "candidates",
            "promoted",
            "holdout",
            "scorer",
            "lineage",
            "digest",
        ],
    )?;
    if report["contract"] != "algal.foundry.v1" {
        return Err(Error::invalid("foundry.contract must be algal.foundry.v1"));
    }
    if let Some(scorer) = report.get("scorer") {
        check_scorer(scorer)?;
    }
    sha(&report["promoted"], "foundry.promoted")?;
    sha(&report["digest"], "foundry.digest")?;
    let candidates = report["candidates"]
        .as_array()
        .filter(|list| !list.is_empty() && list.len() <= MAX_CANDIDATES)
        .ok_or_else(|| Error::invalid("foundry.candidates must be a bounded non-empty list"))?;
    for (i, candidate) in candidates.iter().enumerate() {
        let at = format!("foundry.candidates[{i}]");
        keys(
            candidate,
            &[
                "manifestDigest",
                "manifestKey",
                "train",
                "validation",
                "work",
                "usage",
                "cases",
            ],
        )?;
        sha(
            &candidate["manifestDigest"],
            &format!("{at}.manifestDigest"),
        )?;
        text(&candidate["manifestKey"], 256)?;
        parse_score(&candidate["train"], &format!("{at}.train"))?;
        parse_score(&candidate["validation"], &format!("{at}.validation"))?;
        keys(&candidate["work"], &["steps", "agentCalls", "units"])?;
        for field in ["steps", "agentCalls", "units"] {
            count(&candidate["work"][field], &format!("{at}.work.{field}"))?;
        }
        keys(&candidate["usage"], &["tokensIn", "tokensOut"])?;
        for field in ["tokensIn", "tokensOut"] {
            count(&candidate["usage"][field], &format!("{at}.usage.{field}"))?;
        }
        let cases = candidate["cases"]
            .as_array()
            .filter(|list| !list.is_empty() && list.len() <= MAX_CASES)
            .ok_or_else(|| {
                Error::invalid(format!("{at}.cases must be a bounded non-empty list"))
            })?;
        for (j, case) in cases.iter().enumerate() {
            parse_case_result(case, &format!("{at}.cases[{j}]"))?;
        }
    }
    let holdout = &report["holdout"];
    keys(holdout, &["passed", "total", "cases"])?;
    let passed = count(&holdout["passed"], "foundry.holdout.passed")?;
    let total = count(&holdout["total"], "foundry.holdout.total")?;
    if total == 0 || passed > total {
        return Err(Error::invalid("foundry.holdout is not a valid score"));
    }
    let cases = holdout["cases"]
        .as_array()
        .filter(|list| list.len() as u64 == total)
        .ok_or_else(|| Error::invalid("foundry.holdout.cases must match its total"))?;
    for (i, case) in cases.iter().enumerate() {
        parse_case_result(case, &format!("foundry.holdout.cases[{i}]"))?;
    }
    if let Some(lineage) = report.get("lineage") {
        keys(lineage, &["generatorDigest", "receiptDigest"])?;
        sha(
            &lineage["generatorDigest"],
            "foundry.lineage.generatorDigest",
        )?;
        sha(&lineage["receiptDigest"], "foundry.lineage.receiptDigest")?;
    }
    Ok(())
}

fn expected_pass(case: &Value, scorer: Option<&Value>) -> Result<bool> {
    if case["outcome"] != "complete" {
        return Ok(false);
    }
    match scorer {
        Some(scorer) => eval_scorer_record(&scorer["program"], case),
        None => Ok(canonical(&case["outputs"])? == canonical(&case["expect"])?),
    }
}

fn check_score(
    label: &str,
    cases: &[Value],
    split: &str,
    claimed: &Value,
    scorer: Option<&Value>,
    mismatches: &mut Vec<String>,
) -> Result<()> {
    let selected: Vec<&Value> = cases
        .iter()
        .filter(|c| c["split"].as_str() == Some(split))
        .collect();
    let passed = selected.iter().filter(|c| c["passed"] == true).count() as u64;
    if selected.len() as u64 != claimed["total"].as_u64().unwrap_or(0)
        || passed != claimed["passed"].as_u64().unwrap_or(0)
    {
        mismatches.push(format!("{label} score does not match its cases"));
    }
    for case in selected {
        let id = case["id"].as_str().unwrap_or("");
        match expected_pass(case, scorer) {
            Ok(expected) => {
                if case["passed"].as_bool() != Some(expected) {
                    mismatches.push(format!("{label} case {id} has an invalid pass claim"));
                }
            }
            Err(e) => mismatches.push(format!("{label} case {id} scorer error: {e}")),
        }
    }
    Ok(())
}

async fn verify_cases(
    manifest_digest: &str,
    cases: &[Value],
    verify_claims: bool,
    store: &Store,
    tools: &Host,
    mismatches: &mut Vec<String>,
    checked: &mut u64,
) -> Result<()> {
    let Some(manifest_value) = store.get("manifests", manifest_digest)? else {
        mismatches.push(format!("manifest {manifest_digest} missing"));
        return Ok(());
    };
    let manifest = Manifest::parse(&manifest_value)?;
    for case in cases {
        let id = case["id"].as_str().unwrap_or("");
        let receipt_digest = case["receiptDigest"].as_str().unwrap_or("");
        let Some(receipt) = store.get("runs", receipt_digest)? else {
            mismatches.push(format!("receipt {receipt_digest} missing"));
            continue;
        };
        if receipt["manifestDigest"].as_str() != Some(manifest_digest) {
            mismatches.push(format!(
                "receipt {receipt_digest} ran {}, expected {manifest_digest}",
                receipt["manifestDigest"].as_str().unwrap_or("")
            ));
            continue;
        }
        if verify_claims {
            if manifest.value["interface"].as_object().is_some() {
                let outputs = runtime::outputs(&manifest, &receipt)?;
                if canonical(&outputs)? != canonical(&case["outputs"])? {
                    mismatches.push(format!("case {id}: outputs differ from receipt"));
                }
            }
            if receipt["outcome"].as_str() != case["outcome"].as_str() {
                mismatches.push(format!("case {id}: outcome differs from receipt"));
            }
            if canonical(&receipt["work"])? != canonical(&case["work"])? {
                mismatches.push(format!("case {id}: work differs from receipt"));
            }
            let effects = receipt["effects"].as_array().cloned().unwrap_or_default();
            if canonical(&usage_of(&effects))? != canonical(&case["usage"])? {
                mismatches.push(format!("case {id}: usage differs from receipt"));
            }
        }
        let verified = runtime::verify(&receipt, manifest.clone(), store, tools).await?;
        *checked += 1;
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
            mismatches.push(format!("receipt {receipt_digest}: {detail}"));
        }
    }
    Ok(())
}

/// Recompute a foundry report against the store: digest, deterministic
/// winner, score sums, sealed-holdout discipline, and every case receipt
/// replayed offline.
pub async fn verify(report: &Value, store: &Store, tools: &Host) -> Result<Value> {
    parse_report(report)?;
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
    let candidates = report["candidates"].as_array().cloned().unwrap_or_default();
    if select(&candidates)? != report["promoted"].as_str().unwrap_or("") {
        mismatches.push("promoted digest is not the deterministic winner".into());
    }
    let scorer = report.get("scorer");
    for candidate in &candidates {
        let key = candidate["manifestKey"].as_str().unwrap_or("");
        let cases = candidate["cases"].as_array().cloned().unwrap_or_default();
        check_score(
            key,
            &cases,
            "train",
            &candidate["train"],
            scorer,
            &mut mismatches,
        )?;
        check_score(
            key,
            &cases,
            "validation",
            &candidate["validation"],
            scorer,
            &mut mismatches,
        )?;
        if cases.iter().any(|c| c["split"].as_str() == Some("holdout")) {
            mismatches.push(format!("{key} exposes holdout results before promotion"));
        }
        let mut work = json!({"steps":0,"agentCalls":0,"units":0});
        let mut usage = json!({"tokensIn":0,"tokensOut":0});
        for case in &cases {
            for field in ["steps", "agentCalls", "units"] {
                work[field] = json!(
                    work[field].as_u64().unwrap_or(0) + case["work"][field].as_u64().unwrap_or(0)
                );
            }
            for field in ["tokensIn", "tokensOut"] {
                usage[field] = json!(
                    usage[field].as_u64().unwrap_or(0) + case["usage"][field].as_u64().unwrap_or(0)
                );
            }
        }
        if canonical(&work)? != canonical(&candidate["work"])? {
            mismatches.push(format!("{key} work does not match its cases"));
        }
        if canonical(&usage)? != canonical(&candidate["usage"])? {
            mismatches.push(format!("{key} usage does not match its cases"));
        }
    }
    let holdout_cases = report["holdout"]["cases"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    check_score(
        "holdout",
        &holdout_cases,
        "holdout",
        &report["holdout"],
        scorer,
        &mut mismatches,
    )?;
    if holdout_cases
        .iter()
        .any(|c| c["split"].as_str() != Some("holdout"))
    {
        mismatches.push("holdout contains a non-holdout case".into());
    }
    let mut checked = 0u64;
    for candidate in &candidates {
        verify_cases(
            candidate["manifestDigest"].as_str().unwrap_or(""),
            &candidate["cases"].as_array().cloned().unwrap_or_default(),
            true,
            store,
            tools,
            &mut mismatches,
            &mut checked,
        )
        .await?;
    }
    verify_cases(
        report["promoted"].as_str().unwrap_or(""),
        &holdout_cases,
        true,
        store,
        tools,
        &mut mismatches,
        &mut checked,
    )
    .await?;
    if let Some(lineage) = report.get("lineage") {
        verify_cases(
            lineage["generatorDigest"].as_str().unwrap_or(""),
            &[json!({
                "id":"generator","split":"train","passed":true,"outcome":"complete",
                "outputs":{},"expect":{},
                "receiptDigest":lineage["receiptDigest"],
                "work":{"steps":0,"agentCalls":0,"units":0},
                "usage":{"tokensIn":0,"tokensOut":0},
            })],
            false,
            store,
            tools,
            &mut mismatches,
            &mut checked,
        )
        .await?;
    }
    Ok(json!({
        "ok":mismatches.is_empty(),
        "digest":claimed,
        "checkedReceipts":checked,
        "mismatches":mismatches,
    }))
}

/// The foundry inspect surface.
pub fn inspect(report: &Value) -> Result<Value> {
    parse_report(report)?;
    let candidates = report["candidates"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|candidate| {
            json!({
                "manifestDigest":candidate["manifestDigest"],
                "manifestKey":candidate["manifestKey"],
                "train":candidate["train"],
                "validation":candidate["validation"],
                "work":candidate["work"],
                "usage":candidate["usage"],
            })
        })
        .collect::<Vec<_>>();
    Ok(json!({
        "contract":report["contract"],
        "digest":report["digest"],
        "promoted":report["promoted"],
        "lineage":report.get("lineage").cloned().unwrap_or(Value::Null),
        "candidates":candidates,
        "holdout":{"passed":report["holdout"]["passed"],"total":report["holdout"]["total"]},
    }))
}

/// Parse a `algal.search.v1` report within its bounds.
pub fn parse_search_report(report: &Value) -> Result<()> {
    keys(
        report,
        &[
            "contract",
            "generatorDigest",
            "generations",
            "result",
            "digest",
        ],
    )?;
    if report["contract"] != "algal.search.v1" {
        return Err(Error::invalid("search.contract must be algal.search.v1"));
    }
    sha(&report["generatorDigest"], "search.generatorDigest")?;
    sha(&report["digest"], "search.digest")?;
    let generations = report["generations"]
        .as_array()
        .filter(|list| !list.is_empty() && list.len() <= MAX_GENERATIONS)
        .ok_or_else(|| Error::invalid("search.generations must be a bounded non-empty list"))?;
    parse_report(&report["result"])?;
    for (index, entry) in generations.iter().enumerate() {
        let at = format!("search.generations[{index}]");
        keys(
            entry,
            &[
                "generation",
                "generatorDigest",
                "receiptDigest",
                "proposed",
                "candidates",
                "promoted",
            ],
        )?;
        if entry["generation"] != json!(index) {
            return Err(Error::invalid(format!("{at}.generation must be {index}")));
        }
        sha(&entry["generatorDigest"], &format!("{at}.generatorDigest"))?;
        sha(&entry["receiptDigest"], &format!("{at}.receiptDigest"))?;
        sha(&entry["promoted"], &format!("{at}.promoted"))?;
        let proposed = entry["proposed"]
            .as_array()
            .filter(|list| !list.is_empty() && list.len() <= MAX_CANDIDATES)
            .ok_or_else(|| Error::invalid(format!("{at}.proposed must be non-empty")))?;
        for (i, item) in proposed.iter().enumerate() {
            sha(item, &format!("{at}.proposed[{i}]"))?;
        }
        let synthetic = json!({
            "contract":"algal.foundry.v1",
            "candidates":entry["candidates"],
            "promoted":entry["promoted"],
            "holdout":report["result"]["holdout"],
            "digest":report["result"]["digest"],
        });
        parse_report(&synthetic)?;
    }
    Ok(())
}

/// Recompute a search report: the embedded result must verify as a
/// foundry report, every generation must preserve the previous winner,
/// every proposal must have been evaluated, and every generator receipt
/// must replay offline.
pub async fn verify_search(report: &Value, store: &Store, tools: &Host) -> Result<Value> {
    parse_search_report(report)?;
    let claimed = report["digest"].as_str().unwrap_or("").to_owned();
    let mut mismatches: Vec<String> = Vec::new();
    let mut base = report.clone();
    if let Some(body) = base.as_object_mut() {
        body.remove("digest");
    }
    let computed = digest(&base)?;
    if computed != claimed {
        mismatches.push(format!("digest: claimed {claimed}, computed {computed}"));
    }
    let final_result = verify(&report["result"], store, tools).await?;
    let mut checked = final_result["checkedReceipts"].as_u64().unwrap_or(0);
    if final_result["ok"] != true {
        for mismatch in final_result["mismatches"]
            .as_array()
            .cloned()
            .unwrap_or_default()
        {
            mismatches.push(format!("result: {}", mismatch.as_str().unwrap_or("")));
        }
    }
    let mut previous_winner: Option<String> = None;
    for (index, generation) in report["generations"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .iter()
        .enumerate()
    {
        if generation["generatorDigest"].as_str() != report["generatorDigest"].as_str() {
            mismatches.push(format!("generation {index}: generator digest changed"));
        }
        let candidates = generation["candidates"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        if select(&candidates)? != generation["promoted"].as_str().unwrap_or("") {
            mismatches.push(format!(
                "generation {index}: promoted candidate is not the winner"
            ));
        }
        if candidates.iter().any(|candidate| {
            candidate["cases"]
                .as_array()
                .is_some_and(|cases| cases.iter().any(|c| c["split"].as_str() == Some("holdout")))
        }) {
            mismatches.push(format!(
                "generation {index}: holdout evidence leaked into selection"
            ));
        }
        if let Some(previous) = &previous_winner {
            if !candidates
                .iter()
                .any(|candidate| candidate["manifestDigest"].as_str() == Some(previous.as_str()))
            {
                mismatches.push(format!(
                    "generation {index}: previous winner did not survive"
                ));
            }
        }
        for proposed in generation["proposed"]
            .as_array()
            .cloned()
            .unwrap_or_default()
        {
            let digest = proposed.as_str().unwrap_or("");
            if !candidates
                .iter()
                .any(|candidate| candidate["manifestDigest"].as_str() == Some(digest))
            {
                mismatches.push(format!(
                    "generation {index}: proposed {digest} was not evaluated"
                ));
            }
        }
        let promoted = generation["promoted"].as_str().unwrap_or("");
        let evidence = candidates
            .iter()
            .find(|candidate| candidate["manifestDigest"].as_str() == Some(promoted))
            .and_then(|candidate| candidate["cases"].as_array().and_then(|c| c.first()));
        match evidence {
            None => mismatches.push(format!("generation {index}: winner has no evidence")),
            Some(evidence) => {
                let mut case = evidence.clone();
                case["split"] = json!("holdout");
                let mut synthetic = json!({
                    "contract":"algal.foundry.v1",
                    "candidates":candidates,
                    "promoted":promoted,
                    "holdout":{"passed":if evidence["passed"] == true {1} else {0},"total":1,"cases":[case]},
                });
                synthetic["digest"] = json!(digest(&synthetic)?);
                let verified = verify(&synthetic, store, tools).await?;
                checked += verified["checkedReceipts"].as_u64().unwrap_or(0);
                if verified["ok"] != true {
                    for mismatch in verified["mismatches"]
                        .as_array()
                        .cloned()
                        .unwrap_or_default()
                    {
                        mismatches.push(format!(
                            "generation {index}: {}",
                            mismatch.as_str().unwrap_or("")
                        ));
                    }
                }
            }
        }
        let generator_digest = generation["generatorDigest"].as_str().unwrap_or("");
        let generator_receipt = generation["receiptDigest"].as_str().unwrap_or("");
        let manifest_value = store.get("manifests", generator_digest)?;
        let receipt = store.get("runs", generator_receipt)?;
        match (manifest_value, receipt) {
            (None, _) => mismatches.push(format!("generation {index}: generator manifest missing")),
            (Some(_), None) => {
                mismatches.push(format!("generation {index}: generator receipt missing"));
            }
            (Some(manifest_value), Some(receipt)) => {
                let manifest = Manifest::parse(&manifest_value)?;
                let verified = runtime::verify(&receipt, manifest, store, tools).await?;
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
                    mismatches.push(format!("generation {index}: generator receipt: {detail}"));
                }
            }
        }
        previous_winner = Some(promoted.to_owned());
    }
    if previous_winner.as_deref() != report["result"]["promoted"].as_str() {
        mismatches.push("final result did not preserve the last generation winner".into());
    }
    Ok(json!({
        "ok":mismatches.is_empty(),
        "digest":claimed,
        "checkedReceipts":checked,
        "mismatches":mismatches,
    }))
}

/// The search inspect surface.
pub fn inspect_search(report: &Value) -> Result<Value> {
    parse_search_report(report)?;
    let generations = report["generations"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|generation| {
            json!({
                "generation":generation["generation"],
                "proposed":generation["proposed"].as_array().map(|p| p.len()).unwrap_or(0),
                "population":generation["candidates"].as_array().map(|c| c.len()).unwrap_or(0),
                "promoted":generation["promoted"],
            })
        })
        .collect::<Vec<_>>();
    Ok(json!({
        "contract":report["contract"],
        "digest":report["digest"],
        "generatorDigest":report["generatorDigest"],
        "generations":generations,
        "promoted":report["result"]["promoted"],
        "holdout":{"passed":report["result"]["holdout"]["passed"],"total":report["result"]["holdout"]["total"]},
    }))
}

/// Verify a report, then emit a pack bundle for the promoted manifest.
pub async fn pack_promoted(
    report: &Value,
    search: bool,
    store: &Store,
    tools: &Host,
    out: &Path,
) -> Result<Value> {
    let (verified, promoted) = if search {
        (
            verify_search(report, store, tools).await?,
            report["result"]["promoted"]
                .as_str()
                .unwrap_or("")
                .to_owned(),
        )
    } else {
        (
            verify(report, store, tools).await?,
            report["promoted"].as_str().unwrap_or("").to_owned(),
        )
    };
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
        return Err(Error::new(
            "RECEIPT_MISMATCH",
            format!("report failed verification: {detail}"),
        ));
    }
    let manifest_value = store.get("manifests", &promoted)?.ok_or_else(|| {
        Error::new(
            "STORE_MISS",
            format!("promoted manifest {promoted} missing"),
        )
    })?;
    let bundle = crate::store::pack(&Manifest::parse(&manifest_value)?, store)?;
    std::fs::create_dir_all(out)?;
    let file = out.join(format!("{}.bundle.json", &promoted[7..]));
    std::fs::write(&file, canonical(&bundle)?)?;
    let mut result = json!({
        "bundle":file,
        "root":bundle["root"],
    });
    result[if search { "search" } else { "foundry" }] = report["digest"].clone();
    Ok(result)
}
