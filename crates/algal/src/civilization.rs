use crate::{
    Error, Result,
    canonical::{canonical, digest},
    contract::{Manifest, id, keys, list, object, text},
    effects::Host,
    graph::{Transports, compile, interface_args, interface_signature},
    runtime,
    store::{Store, pack},
};
use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs::{self, File, OpenOptions},
    path::{Path, PathBuf},
};

pub struct PopulationLock {
    path: PathBuf,
    _file: File,
}
impl Drop for PopulationLock {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}
pub fn lock(root: &Path) -> Result<PopulationLock> {
    Store::open(root, true)?;
    fs::create_dir_all(root)?;
    let path = root.join("civilization.lock");
    let file = OpenOptions::new().write(true).create_new(true).open(&path).map_err(|_| Error::new("IO_FAILED","habitat is locked; do not remove a lock until the prior writer is confirmed stopped"))?;
    Ok(PopulationLock { path, _file: file })
}

#[derive(Clone)]
struct Case {
    id: String,
    split: String,
    input: Value,
    expected: Value,
}
#[derive(Clone)]
struct Goal {
    id: String,
    description: String,
    scripted: Option<Value>,
    cases: Vec<Case>,
}
#[derive(Clone)]
struct Candidate {
    manifest: Manifest,
    proposal: Value,
    cases: Vec<Value>,
    train: usize,
    validation: usize,
    work: u64,
}

fn demo_goals() -> Vec<Goal> {
    let mut result = Vec::new();
    for (id, description, scripted, examples) in [
        (
            "greet",
            "Return the exact prefix Hello, and a space, followed by the supplied name.",
            json!(["fn:format.v1;prefix=Hello, "]),
            vec![
                (json!("Ada"), json!("Hello, Ada")),
                (json!("Lin"), json!("Hello, Lin")),
                (json!("Tao"), json!("Hello, Tao")),
                (json!("Mira"), json!("Hello, Mira")),
            ],
        ),
        (
            "double",
            "Return twice the numeric input.",
            json!(["fn:double.v1"]),
            vec![
                (json!(2), json!(4)),
                (json!(7), json!(14)),
                (json!(-3), json!(-6)),
                (json!(0.5), json!(1)),
            ],
        ),
        (
            "invert",
            "Return the logical negation of the boolean input.",
            json!(["fn:not.v1"]),
            vec![
                (json!(true), json!(false)),
                (json!(false), json!(true)),
                (json!(true), json!(false)),
                (json!(false), json!(true)),
            ],
        ),
        (
            "shout",
            "Return the input text in uppercase.",
            json!(["fn:uppercase.v1"]),
            vec![
                (json!("hello"), json!("HELLO")),
                (json!("world"), json!("WORLD")),
                (json!("algal"), json!("ALGAL")),
                (json!("Grow!"), json!("GROW!")),
            ],
        ),
    ] {
        let cases = examples
            .into_iter()
            .enumerate()
            .map(|(i, (input, expected))| Case {
                id: format!("{id}-{i}"),
                split: match i {
                    0 | 1 => "train",
                    2 => "validation",
                    _ => "holdout",
                }
                .to_owned(),
                input,
                expected,
            })
            .collect();
        result.push(Goal {
            id: id.to_owned(),
            description: description.to_owned(),
            scripted: Some(scripted),
            cases,
        });
    }
    result
}

fn load_goals(path: &Path) -> Result<Vec<Goal>> {
    let bytes = std::fs::read(path)
        .map_err(|error| Error::invalid(format!("cannot read goals file: {error}")))?;
    if bytes.len() > 262_144 {
        return Err(Error::limit("goals file bytes"));
    }
    let value: Value =
        serde_json::from_slice(&bytes).map_err(|_| Error::invalid("goals file is not JSON"))?;
    keys(&value, &["contract", "goals"])?;
    if value["contract"] != "algal.goals.v1" {
        return Err(Error::invalid("goals file requires algal.goals.v1"));
    }
    let goals = list(&value["goals"], 16)?;
    if goals.is_empty() {
        return Err(Error::invalid("goals requires at least one goal"));
    }
    let mut result = Vec::new();
    let mut seen = std::collections::BTreeSet::new();
    for raw in goals.iter() {
        keys(raw, &["id", "description", "scripted", "cases"])?;
        let goal_id = id(&raw["id"])?;
        if goal_id.len() > 64 {
            return Err(Error::limit("goal id bytes"));
        }
        let goal_id = goal_id.to_owned();
        if !seen.insert(goal_id.clone()) {
            return Err(Error::invalid("goal ids must be unique"));
        }
        let description = text(&raw["description"], 1024)?;
        if description.is_empty() {
            return Err(Error::invalid("goal description required"));
        }
        let scripted = match raw.get("scripted") {
            Some(plan) if !plan.is_null() => {
                crate::registry::compile_plan(plan).map_err(|error| {
                    Error::invalid(format!(
                        "goal {goal_id} scripted plan does not compile: {error}"
                    ))
                })?;
                Some(plan.clone())
            }
            _ => None,
        };
        let raw_cases = list(&raw["cases"], 8)?;
        if raw_cases.len() < 3 {
            return Err(Error::invalid("goal requires at least three cases"));
        }
        let mut cases = Vec::new();
        for (i, raw_case) in raw_cases.iter().enumerate() {
            keys(raw_case, &["input", "expected", "split"])?;
            if canonical(&raw_case["input"])?.len() > 4096
                || canonical(&raw_case["expected"])?.len() > 4096
            {
                return Err(Error::limit("case bytes"));
            }
            let split = match raw_case.get("split") {
                Some(split) => {
                    let split = text(split, 16)?;
                    match split {
                        "train" | "validation" | "holdout" => split.to_owned(),
                        _ => {
                            return Err(Error::invalid(
                                "split must be train, validation, or holdout",
                            ));
                        }
                    }
                }
                None => match i {
                    0 | 1 => "train".to_owned(),
                    2 => "validation".to_owned(),
                    _ => "holdout".to_owned(),
                },
            };
            cases.push(Case {
                id: format!("{goal_id}-{i}"),
                split,
                input: raw_case["input"].clone(),
                expected: raw_case["expected"].clone(),
            });
        }
        for split in ["train", "validation", "holdout"] {
            if !cases.iter().any(|case| case.split == split) {
                return Err(Error::invalid(format!(
                    "goal {goal_id} requires a {split} case"
                )));
            }
        }
        result.push(Goal {
            id: goal_id,
            description: description.to_owned(),
            scripted,
            cases,
        });
    }
    Ok(result)
}

fn plan_fixture(goal: &Goal, constant: bool) -> Result<Value> {
    if !constant && let Some(plan) = &goal.scripted {
        return Ok(plan.clone());
    }
    Ok(json!([format!(
        "const:{}",
        canonical(&goal.cases[0].expected)?
    )]))
}

fn generator() -> Result<Manifest> {
    Manifest::parse(
        &json!({"contract":"morphogen.organism.v1","key":"organism:civilization-designer","name":"Bounded civilization designer",
        "budgets":{"maxSteps":8,"maxAgentCalls":1,"maxWork":1000000,"maxContextBytes":32768,"maxOutputBytes":32768},
        "cells":[
            {"id":"goal","kind":"input","outputs":{"task":"json"}},
            {"id":"designer","kind":"agent","inputs":{"task":"json"},"prompt":"Return a JSON array of 1-4 step strings, no markdown or code. Step grammar: 'fn:NAME' optionally followed by ';PORT=VALUE' bindings (raw text for text ports, JSON-encoded for other ports), or 'const:JSON_LITERAL' for a constant result. Fns: echo.v1(value:json)->value:json; format.v1(prefix:text,value:json)->value:text; tag.v1(tag:text,value:json)->value:text; pick.v1(record:json,field:text)->value:json; inc.v1(value:json)->value:json; double.v1(value:json)->value:json; not.v1(value:json)->value:json; uppercase.v1(value:text)->value:text. Examples: [\"fn:double.v1\"] doubles a number; [\"fn:format.v1;prefix=Hello, \"] greets. Emit exactly the steps needed - usually one step. Choose the shortest pipeline that maps input value to the expected out for every train case and generalizes beyond them.","output":{"kind":"json","schema":{"type":"array","items":{"type":"string"}}},"budget":{"maxEffectMs":120000}},
            {"id":"compiler","kind":"fn","fn":"manifest.compile.v1"}
        ],"edges":[{"from":{"cell":"goal","port":"task"},"to":{"cell":"designer","port":"task"}},{"from":{"cell":"designer","port":"out"},"to":{"cell":"compiler","port":"plan"}}],
        "interface":{"inputs":{"task":{"cell":"goal","port":"task"}},"outputs":{"proposal":{"cell":"compiler","port":"manifest"}}}}),
    )
}

fn policy(manifest: &Manifest, store: &mut Store) -> Result<()> {
    if manifest.budgets.max_steps > 256 || manifest.budgets.max_work > 1_000_000 {
        return Err(Error::limit("candidate exceeds habitat work policy"));
    }
    for cell in &manifest.cells {
        if !["input", "const", "fn"]
            .iter()
            .any(|kind| cell["kind"] == *kind)
        {
            return Err(Error::new(
                "MANIFEST_INVALID",
                "habitat candidates may use only input, const, and pure fn cells",
            ));
        }
        if cell["kind"] == "const"
            && object(&cell["outputs"])?
                .values()
                .any(|port| port["type"] == "ref")
        {
            return Err(Error::new(
                "MANIFEST_INVALID",
                "habitat candidates cannot read ambient CAS values",
            ));
        }
    }
    let compiled = compile(
        manifest.clone(),
        store,
        &Default::default(),
        &Default::default(),
        0,
    )?;
    let signature = interface_signature(&compiled)?;
    if signature
        .inputs
        .keys()
        .map(String::as_str)
        .collect::<Vec<_>>()
        != vec!["value"]
        || signature
            .outputs
            .keys()
            .map(String::as_str)
            .collect::<Vec<_>>()
            != vec!["out"]
    {
        return Err(Error::new(
            "INTERFACE_MISMATCH",
            "habitat requires value -> out interface",
        ));
    }
    Ok(())
}

async fn evaluate(manifest: &Manifest, case: &Case, store: &mut Store) -> Result<Value> {
    let args = interface_args(manifest, &json!({"value":case.input}))?;
    let receipt = runtime::run(
        manifest.clone(),
        args,
        &mut store.overlay(),
        &mut Host::default(),
        &Transports::new(),
        None,
    )
    .await?;
    let output = runtime::outputs(manifest, &receipt)?;
    let expected = json!({"out":case.expected});
    let passed = receipt["outcome"] == "complete" && canonical(&output)? == canonical(&expected)?;
    let reference = store.put("runs", &receipt)?;
    Ok(
        json!({"id":case.id,"split":case.split,"passed":passed,"outputs":output,"expect":expected,"receipt":reference,"work":receipt["work"]}),
    )
}

fn ranking(
    candidate: &Candidate,
) -> (
    std::cmp::Reverse<usize>,
    std::cmp::Reverse<usize>,
    u64,
    String,
) {
    (
        std::cmp::Reverse(candidate.validation),
        std::cmp::Reverse(candidate.train),
        candidate.work,
        candidate.manifest.digest().unwrap_or_default(),
    )
}

async fn checked_candidate(
    manifest: Manifest,
    proposal: Value,
    goal: &Goal,
    store: &mut Store,
    total_work: &mut u64,
) -> Result<Candidate> {
    policy(&manifest, store)?;
    store.admit(&manifest)?;
    let mut candidate = Candidate {
        manifest,
        proposal,
        cases: Vec::new(),
        train: 0,
        validation: 0,
        work: 0,
    };
    for case in goal.cases.iter().filter(|case| case.split != "holdout") {
        let result = evaluate(&candidate.manifest, case, store).await?;
        candidate.work += result["work"]["units"].as_u64().unwrap_or(0);
        if result["passed"] == true {
            if case.split == "train" {
                candidate.train += 1;
            } else {
                candidate.validation += 1;
            }
        }
        candidate.cases.push(result);
    }
    *total_work += candidate.work;
    if *total_work > 10_000_000 {
        return Err(Error::limit("habitat epoch work exhausted"));
    }
    Ok(candidate)
}

fn candidate_json(candidate: &Candidate) -> Result<Value> {
    Ok(
        json!({"manifest":candidate.manifest.digest()?,"proposal":candidate.proposal,"cases":candidate.cases,"trainPassed":candidate.train,"validationPassed":candidate.validation,"work":candidate.work}),
    )
}

pub async fn evolve(
    store: &mut Store,
    live: Option<Host>,
    goals_path: Option<&Path>,
) -> Result<Value> {
    let (goals, policy, evidence_scope) = match goals_path {
        Some(path) => (
            load_goals(path)?,
            "algal.goals-selection.v1",
            format!(
                "Host-defined goals from {}; not a learning or generalization benchmark.",
                path.display()
            ),
        ),
        None => (
            demo_goals(),
            "algal.demo-selection.v1",
            "Four toy contracts, not a learning or generalization benchmark; boolean cases cover a two-value domain.".to_owned(),
        ),
    };
    if live
        .as_ref()
        .is_some_and(|host| host.entries.iter().any(|(_, backend)| !backend.retryable()))
    {
        return Err(Error::new(
            "MANIFEST_INVALID",
            "civilization designers must be context-only model executors, not coding agents or arbitrary commands",
        ));
    }
    let initial_head = store.get_slot("civilization")?;
    let previous = match &initial_head {
        Some(head) => {
            let reference = head["head"]
                .as_str()
                .ok_or_else(|| Error::invalid("civilization head"))?;
            let value = store
                .get("values", reference)?
                .ok_or_else(|| Error::new("STORE_MISS", "previous population"))?;
            keys(
                &value,
                &[
                    "contract",
                    "epoch",
                    "previous",
                    "policy",
                    "members",
                    "reports",
                    "evidenceScope",
                ],
            )?;
            if value["contract"] != "algal.population.v1" {
                return Err(Error::invalid("foreign population head"));
            }
            Some(value)
        }
        None => None,
    };
    let epoch = previous
        .as_ref()
        .and_then(|p| p["epoch"].as_u64())
        .unwrap_or(0)
        + 1;
    if epoch > 100_000 {
        return Err(Error::limit("habitat epoch count"));
    }
    let mut members: BTreeMap<String, Value> = previous
        .as_ref()
        .and_then(|p| p["members"].as_object())
        .map(|m| m.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
        .unwrap_or_default();
    if members.len() > 64 {
        return Err(Error::limit("population members"));
    }
    let designer = generator()?;
    let designer_digest = store.admit(&designer)?;
    let mut reports = Vec::new();
    let mut total_work = 0;
    for goal in &goals {
        let incumbent = members.get(&goal.id).cloned();
        let mut candidates = Vec::new();
        let mut seen = BTreeSet::new();
        let mut rejected = Vec::new();
        if let Some(member) = &incumbent {
            let manifest = store.manifest(
                member["manifest"]
                    .as_str()
                    .ok_or_else(|| Error::invalid("population manifest"))?,
            )?;
            let candidate = checked_candidate(
                manifest,
                member["proposal"].clone(),
                goal,
                store,
                &mut total_work,
            )
            .await?;
            seen.insert(candidate.manifest.digest()?);
            candidates.push(candidate);
        }
        let attempts = if live.is_some() { 1 } else { 2 };
        for attempt in 0..attempts {
            let mut host = match &live {
                Some(host) => host.clone(),
                None => Host::scripted(json!({"designer":[plan_fixture(goal,attempt == 0)?]})),
            };
            let train: Vec<_> = goal
                .cases
                .iter()
                .filter(|case| case.split == "train")
                .map(|case| json!({"input":case.input,"expect":case.expected}))
                .collect();
            let task = json!({"goal":&goal.description,"train":train,"incumbent":incumbent.as_ref().map(|member| &member["manifest"])});
            let parent = runtime::run(
                designer.clone(),
                json!({"goal":{"task":task}}),
                store,
                &mut host,
                &Transports::new(),
                None,
            )
            .await?;
            let parent_ref = store.put("runs", &parent)?;
            let proposal = json!({"parent":designer_digest,"receipt":parent_ref});
            let raw = runtime::outputs(&designer, &parent)?["proposal"].clone();
            let candidate = if parent["outcome"] != "complete" {
                Err(Error::new("EFFECT_FAILED", "designer did not complete"))
            } else {
                Manifest::parse(&raw)
            };
            let candidate = match candidate {
                Ok(manifest) => {
                    let identity = manifest.digest()?;
                    if !seen.insert(identity) {
                        rejected.push(json!({"proposal":proposal,"reason":"duplicate"}));
                        continue;
                    }
                    checked_candidate(manifest, proposal.clone(), goal, store, &mut total_work)
                        .await
                }
                Err(error) => Err(error),
            };
            match candidate {
                Ok(candidate) => candidates.push(candidate),
                Err(error) => rejected.push(json!({"proposal":proposal,"error":error})),
            }
        }
        candidates.sort_by_key(ranking);
        let mut selected = Value::Null;
        let mut holdout = Vec::new();
        let train_total = goal.cases.iter().filter(|c| c.split == "train").count();
        let validation_total = goal
            .cases
            .iter()
            .filter(|c| c.split == "validation")
            .count();
        if let Some(winner) = candidates.first() {
            if winner.train == train_total && winner.validation == validation_total {
                selected = json!(winner.manifest.digest()?);
                for case in goal.cases.iter().filter(|case| case.split == "holdout") {
                    holdout.push(evaluate(&winner.manifest, case, store).await?);
                }
                if holdout.iter().all(|result| result["passed"] == true) {
                    let bundle = pack(&winner.manifest, store)?;
                    let evidence = json!({"contract":"algal.promotion.v1","goal":&goal.id,"policy":policy,"candidate":candidate_json(winner)?,"holdout":holdout});
                    let evidence = store.put("values", &evidence)?;
                    let member = json!({"manifest":winner.manifest.digest()?,"bundle":store.put("values",&bundle)?,"evidence":evidence,"proposal":winner.proposal});
                    members.insert(goal.id.clone(), member);
                }
            }
        }
        reports.push(json!({"goal":&goal.id,"selected":selected,"holdout":holdout,"candidates":candidates.iter().map(candidate_json).collect::<Result<Vec<_>>>()?,"rejected":rejected}));
    }
    let population = json!({
        "contract":"algal.population.v1","epoch":epoch,"previous":initial_head.as_ref().map(|v| &v["head"]),
        "policy":policy,"members":members,"reports":reports,
        "evidenceScope":evidence_scope,
    });
    if canonical(&population)?.len() > 1_048_576 {
        return Err(Error::limit("population record bytes"));
    }
    if store.get_slot("civilization")? != initial_head {
        return Err(Error::new(
            "IO_FAILED",
            "population head changed; refusing stale promotion",
        ));
    }
    verify_population(&population, store, goals_path).await?;
    let head = store.put("values", &population)?;
    store.set_slot("civilization", &json!({"head":head}))?;
    Ok(json!({"head":head,"population":population}))
}

async fn verify_cases(
    manifest: &Manifest,
    results: &[Value],
    goal: &Goal,
    store: &Store,
) -> Result<()> {
    let mut ids = BTreeSet::new();
    for result in results {
        let id = result["id"]
            .as_str()
            .ok_or_else(|| Error::invalid("case id"))?;
        if !ids.insert(id) {
            return Err(Error::invalid("duplicate case evidence"));
        }
        let case = goal
            .cases
            .iter()
            .find(|case| case.id == id)
            .ok_or_else(|| Error::invalid("unknown goal case"))?;
        let reference = result["receipt"]
            .as_str()
            .ok_or_else(|| Error::invalid("case receipt"))?;
        let receipt = store
            .get("runs", reference)?
            .ok_or_else(|| Error::new("STORE_MISS", "case receipt missing"))?;
        if runtime::verify(&receipt, manifest.clone(), store, &Host::default()).await?["ok"] != true
        {
            return Err(Error::new("RECEIPT_MISMATCH", "case replay differs"));
        }
        let expected_args = interface_args(manifest, &json!({"value":case.input}))?;
        let output = runtime::outputs(manifest, &receipt)?;
        let expected = json!({"out":case.expected});
        let passed =
            receipt["outcome"] == "complete" && canonical(&output)? == canonical(&expected)?;
        if receipt["args"] != expected_args
            || result["split"] != case.split
            || result["expect"] != expected
            || result["outputs"] != output
            || result["passed"] != passed
            || result["work"] != receipt["work"]
        {
            return Err(Error::new(
                "RECEIPT_MISMATCH",
                "evaluation does not match its case and receipt",
            ));
        }
    }
    Ok(())
}

async fn verify_proposal(
    proposal: &Value,
    manifest: Option<&Manifest>,
    goal: &Goal,
    store: &Store,
) -> Result<Value> {
    keys(proposal, &["parent", "receipt"])?;
    let parent = store.manifest(
        proposal["parent"]
            .as_str()
            .ok_or_else(|| Error::invalid("proposal parent"))?,
    )?;
    if parent.digest()? != generator()?.digest()? {
        return Err(Error::new("RECEIPT_MISMATCH", "foreign habitat generator"));
    }
    let receipt = store
        .get(
            "runs",
            proposal["receipt"]
                .as_str()
                .ok_or_else(|| Error::invalid("proposal receipt"))?,
        )?
        .ok_or_else(|| Error::new("STORE_MISS", "proposal receipt"))?;
    if runtime::verify(&receipt, parent.clone(), store, &Host::default()).await?["ok"] != true {
        return Err(Error::new("RECEIPT_MISMATCH", "proposal replay differs"));
    }
    let task = &receipt["args"]["goal"]["task"];
    keys(task, &["goal", "train", "incumbent"])?;
    let train: Vec<_> = goal
        .cases
        .iter()
        .filter(|case| case.split == "train")
        .map(|case| json!({"input":case.input,"expect":case.expected}))
        .collect();
    if task["goal"] != goal.description || canonical(&task["train"])? != canonical(&json!(train))? {
        return Err(Error::new(
            "RECEIPT_MISMATCH",
            "designer context differs from the training-only goal",
        ));
    }
    if !task["incumbent"].is_null() {
        crate::canonical::check_digest(
            task["incumbent"]
                .as_str()
                .ok_or_else(|| Error::invalid("incumbent digest"))?,
        )?;
    }
    let raw = runtime::outputs(&parent, &receipt)?["proposal"].clone();
    if let Some(manifest) = manifest {
        if Manifest::parse(&raw)?.digest()? != manifest.digest()? {
            return Err(Error::new(
                "RECEIPT_MISMATCH",
                "proposal does not identify candidate",
            ));
        }
    }
    Ok(raw)
}

async fn verify_reports(population: &Value, store: &Store, known: &[Goal]) -> Result<()> {
    let epoch = population["epoch"]
        .as_u64()
        .filter(|n| *n > 0 && *n <= 100_000)
        .ok_or_else(|| Error::invalid("population epoch"))?;
    let previous = if epoch == 1 {
        if !population["previous"].is_null() {
            return Err(Error::invalid("genesis population has a parent"));
        }
        json!({"members":{}})
    } else {
        let reference = population["previous"]
            .as_str()
            .ok_or_else(|| Error::invalid("population parent"))?;
        let previous = store
            .get("values", reference)?
            .ok_or_else(|| Error::new("STORE_MISS", "previous population missing"))?;
        if previous["contract"] != "algal.population.v1"
            || previous["epoch"].as_u64() != Some(epoch - 1)
            || previous["policy"] != population["policy"]
        {
            return Err(Error::new("RECEIPT_MISMATCH", "population continuity"));
        }
        previous
    };
    let reports = population["reports"]
        .as_array()
        .filter(|r| r.len() == known.len())
        .ok_or_else(|| Error::invalid("population report count does not match goals"))?;
    let mut seen_goals = BTreeSet::new();
    for report in reports {
        keys(
            report,
            &["goal", "selected", "holdout", "candidates", "rejected"],
        )?;
        let goal_id = report["goal"]
            .as_str()
            .ok_or_else(|| Error::invalid("report goal"))?;
        if !seen_goals.insert(goal_id) {
            return Err(Error::invalid("duplicate goal report"));
        }
        let goal = known
            .iter()
            .find(|g| g.id == goal_id)
            .ok_or_else(|| Error::invalid("unknown report goal"))?;
        let candidates = report["candidates"]
            .as_array()
            .filter(|v| v.len() <= 4)
            .ok_or_else(|| Error::limit("reported candidates"))?;
        let mut ranking = Vec::new();
        let mut seen_candidates = BTreeSet::new();
        for candidate in candidates {
            keys(
                candidate,
                &[
                    "manifest",
                    "proposal",
                    "cases",
                    "trainPassed",
                    "validationPassed",
                    "work",
                ],
            )?;
            let identity = candidate["manifest"]
                .as_str()
                .ok_or_else(|| Error::invalid("candidate manifest"))?;
            if !seen_candidates.insert(identity) {
                return Err(Error::invalid("duplicate candidate evidence"));
            }
            let manifest = store.manifest(identity)?;
            policy(&manifest, &mut store.overlay())?;
            verify_proposal(&candidate["proposal"], Some(&manifest), goal, store).await?;
            let cases = candidate["cases"]
                .as_array()
                .filter(|v| v.len() == 3 && v.iter().all(|c| c["split"] != "holdout"))
                .ok_or_else(|| Error::invalid("candidate selection cases"))?;
            verify_cases(&manifest, cases, goal, store).await?;
            let train = cases
                .iter()
                .filter(|c| c["split"] == "train" && c["passed"] == true)
                .count();
            let validation = cases
                .iter()
                .filter(|c| c["split"] == "validation" && c["passed"] == true)
                .count();
            let work: u64 = cases
                .iter()
                .map(|c| c["work"]["units"].as_u64().unwrap_or(0))
                .sum();
            if candidate["trainPassed"] != train
                || candidate["validationPassed"] != validation
                || candidate["work"] != work
            {
                return Err(Error::new("RECEIPT_MISMATCH", "candidate score differs"));
            }
            ranking.push((
                std::cmp::Reverse(validation),
                std::cmp::Reverse(train),
                work,
                identity,
            ));
        }
        ranking.sort();
        let train_total = goal.cases.iter().filter(|c| c.split == "train").count();
        let validation_total = goal
            .cases
            .iter()
            .filter(|c| c.split == "validation")
            .count();
        let holdout_total = goal.cases.iter().filter(|c| c.split == "holdout").count();
        let selected = ranking
            .first()
            .filter(|(validation, train, _, _)| {
                validation.0 == validation_total && train.0 == train_total
            })
            .map(|(_, _, _, id)| *id);
        if report["selected"] != json!(selected) {
            return Err(Error::new(
                "RECEIPT_MISMATCH",
                "selection does not follow measured ranking",
            ));
        }
        let holdout = report["holdout"]
            .as_array()
            .ok_or_else(|| Error::invalid("holdout evidence"))?;
        let promoted = if let Some(selected) = selected {
            if holdout.len() != holdout_total
                || holdout.iter().any(|case| case["split"] != "holdout")
            {
                return Err(Error::invalid(
                    "selected candidate requires the sealed holdout cases",
                ));
            }
            verify_cases(&store.manifest(selected)?, holdout, goal, store).await?;
            holdout.iter().all(|case| case["passed"] == true)
        } else {
            if !holdout.is_empty() {
                return Err(Error::invalid("unselected candidate saw holdout"));
            }
            false
        };
        let member = population["members"].get(goal_id);
        if promoted {
            let selected = selected.unwrap();
            let candidate = candidates
                .iter()
                .find(|c| c["manifest"] == selected)
                .unwrap();
            let member = member.ok_or_else(|| {
                Error::new(
                    "RECEIPT_MISMATCH",
                    "passing selected candidate was not promoted",
                )
            })?;
            if member["manifest"] != selected || member["proposal"] != candidate["proposal"] {
                return Err(Error::new(
                    "RECEIPT_MISMATCH",
                    "member is not the selected candidate",
                ));
            }
            let evidence = store
                .get(
                    "values",
                    member["evidence"]
                        .as_str()
                        .ok_or_else(|| Error::invalid("member evidence"))?,
                )?
                .ok_or_else(|| Error::new("STORE_MISS", "member evidence"))?;
            if evidence["candidate"] != *candidate || evidence["holdout"] != report["holdout"] {
                return Err(Error::new(
                    "RECEIPT_MISMATCH",
                    "promotion does not match selection evidence",
                ));
            }
        } else if member != previous["members"].get(goal_id) {
            return Err(Error::new(
                "RECEIPT_MISMATCH",
                "unjustified population change",
            ));
        }
        for rejected in report["rejected"]
            .as_array()
            .filter(|r| r.len() <= 4)
            .ok_or_else(|| Error::limit("rejection records"))?
        {
            keys(rejected, &["proposal", "reason", "error"])?;
            let raw = verify_proposal(&rejected["proposal"], None, goal, store).await?;
            let parsed = Manifest::parse(&raw).and_then(|manifest| {
                policy(&manifest, &mut store.overlay())?;
                Ok(manifest)
            });
            if rejected["reason"] == "duplicate" {
                let parsed = parsed?;
                if !seen_candidates.contains(parsed.digest()?.as_str()) {
                    return Err(Error::new(
                        "RECEIPT_MISMATCH",
                        "rejected duplicate was never evaluated",
                    ));
                }
            } else if parsed.is_ok() {
                return Err(Error::new(
                    "RECEIPT_MISMATCH",
                    "valid proposal has an unsupported rejection",
                ));
            }
        }
    }
    Ok(())
}

pub async fn verify_population(
    population: &Value,
    store: &Store,
    goals_path: Option<&Path>,
) -> Result<Value> {
    keys(
        population,
        &[
            "contract",
            "epoch",
            "previous",
            "policy",
            "members",
            "reports",
            "evidenceScope",
        ],
    )?;
    let (known, expected_policy) = match goals_path {
        Some(path) => (load_goals(path)?, "algal.goals-selection.v1"),
        None => (demo_goals(), "algal.demo-selection.v1"),
    };
    if population["contract"] != "algal.population.v1" || population["policy"] != expected_policy {
        return Err(Error::invalid("population contract/policy"));
    }
    if canonical(population)?.len() > 1_048_576 || object(&population["members"])?.len() > 64 {
        return Err(Error::limit("population bytes/members"));
    }
    verify_reports(population, store, &known).await?;
    for (goal_id, member) in object(&population["members"])? {
        let goal = known
            .iter()
            .find(|goal| goal.id == *goal_id)
            .ok_or_else(|| Error::invalid("unknown population goal"))?;
        let manifest = store.manifest(
            member["manifest"]
                .as_str()
                .ok_or_else(|| Error::invalid("member manifest"))?,
        )?;
        policy(&manifest, &mut store.overlay())?;
        let evidence = store
            .get(
                "values",
                member["evidence"]
                    .as_str()
                    .ok_or_else(|| Error::invalid("promotion evidence"))?,
            )?
            .ok_or_else(|| Error::new("STORE_MISS", "promotion evidence"))?;
        if evidence["contract"] != "algal.promotion.v1"
            || evidence["goal"] != *goal_id
            || evidence["candidate"]["manifest"] != member["manifest"]
        {
            return Err(Error::new("RECEIPT_MISMATCH", "promotion identity"));
        }
        let mut cases = evidence["candidate"]["cases"]
            .as_array()
            .ok_or_else(|| Error::invalid("promotion cases"))?
            .clone();
        cases.extend(
            evidence["holdout"]
                .as_array()
                .ok_or_else(|| Error::invalid("holdout cases"))?
                .clone(),
        );
        if cases.len() != goal.cases.len() || cases.iter().any(|case| case["passed"] != true) {
            return Err(Error::new(
                "RECEIPT_MISMATCH",
                "promotion requires every goal case",
            ));
        }
        verify_cases(&manifest, &cases, goal, store).await?;
        verify_proposal(&member["proposal"], Some(&manifest), goal, store).await?;
        let bundle = store
            .get(
                "values",
                member["bundle"]
                    .as_str()
                    .ok_or_else(|| Error::invalid("member bundle"))?,
            )?
            .ok_or_else(|| Error::new("STORE_MISS", "member bundle"))?;
        if canonical(&bundle)? != canonical(&pack(&manifest, store)?)? {
            return Err(Error::new("DIGEST_MISMATCH", "promoted bundle differs"));
        }
    }
    Ok(
        json!({"ok":true,"population":digest(population)?,"members":object(&population["members"])?.len()}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn selection_rejects_memorized_constants_and_keeps_a_replayable_lineage() {
        let mut store = Store::default();
        let first = evolve(&mut store, None, None).await.unwrap();
        assert_eq!(first["population"]["members"].as_object().unwrap().len(), 4);
        assert_eq!(
            verify_population(&first["population"], &store, None)
                .await
                .unwrap()["ok"],
            true
        );
        for report in first["population"]["reports"].as_array().unwrap() {
            assert_eq!(report["candidates"].as_array().unwrap().len(), 2);
            assert!(
                report["candidates"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|c| c["validationPassed"] != 1 || c["trainPassed"] != 2)
            );
        }
        let second = evolve(&mut store, None, None).await.unwrap();
        assert_eq!(second["population"]["previous"], first["head"]);
        assert_eq!(second["population"]["epoch"], 2);
        assert!(
            store
                .get("values", first["head"].as_str().unwrap())
                .unwrap()
                .is_some()
        );
        assert_eq!(
            verify_population(&second["population"], &store, None)
                .await
                .unwrap()["ok"],
            true
        );
    }

    #[tokio::test]
    async fn forged_selection_and_population_changes_are_detected() {
        let mut store = Store::default();
        let result = evolve(&mut store, None, None).await.unwrap();
        let mut forged = result["population"].clone();
        forged["reports"][0]["candidates"][0]["trainPassed"] = json!(0);
        assert!(verify_population(&forged, &store, None).await.is_err());
        let mut forged = result["population"].clone();
        forged["members"].as_object_mut().unwrap().remove("double");
        assert!(verify_population(&forged, &store, None).await.is_err());
    }

    #[tokio::test]
    async fn invalid_live_proposals_are_recorded_but_never_promoted() {
        let mut store = Store::default();
        let host = Host::scripted(json!({"designer":{"not":"a manifest"}}));
        let result = evolve(&mut store, Some(host), None).await.unwrap();
        assert_eq!(result["population"]["members"], json!({}));
        for report in result["population"]["reports"].as_array().unwrap() {
            assert_eq!(report["rejected"].as_array().unwrap().len(), 1);
        }
    }

    fn goals_file(dir: &Path, body: &str) -> PathBuf {
        let path = dir.join("goals.json");
        fs::write(&path, body).unwrap();
        path
    }

    #[tokio::test]
    async fn custom_goals_epoch_promotes_scripted_answers_and_verifies() {
        let dir = std::env::temp_dir().join(format!("algal-goals-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let path = goals_file(
            &dir,
            r#"{"contract":"algal.goals.v1","goals":[
                {"id":"echo-back","description":"Return the input unchanged.","scripted":["fn:echo.v1"],"cases":[
                    {"input":"a","expected":"a"},
                    {"input":"b","expected":"b"},
                    {"input":"c","expected":"c"},
                    {"input":"d","expected":"d"}]},
                {"id":"triple","description":"Return three times the input.","cases":[
                    {"input":1,"expected":3},
                    {"input":2,"expected":6},
                    {"input":-1,"expected":-3},
                    {"input":10,"expected":30}]}]}"#,
        );
        let mut store = Store::default();
        let result = evolve(&mut store, None, Some(&path)).await.unwrap();
        assert_eq!(result["population"]["policy"], "algal.goals-selection.v1");
        let members = result["population"]["members"].as_object().unwrap();
        assert_eq!(members.len(), 1);
        assert!(members.contains_key("echo-back"));
        assert_eq!(
            verify_population(&result["population"], &store, Some(&path))
                .await
                .unwrap()["ok"],
            true
        );
        // A different goals file must not verify this population.
        let other = goals_file(
            &dir,
            r#"{"contract":"algal.goals.v1","goals":[
                {"id":"other","description":"Different.","cases":[
                    {"input":1,"expected":1},
                    {"input":2,"expected":2},
                    {"input":3,"expected":3},
                    {"input":4,"expected":4}]}]}"#,
        );
        assert!(
            verify_population(&result["population"], &store, Some(&other))
                .await
                .is_err()
        );
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn goals_files_are_bounded_and_validated() {
        let dir = std::env::temp_dir().join(format!("algal-goals-bad-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        // Missing holdout coverage rejects at load.
        let missing_holdout = goals_file(
            &dir,
            r#"{"contract":"algal.goals.v1","goals":[{"id":"g","description":"x","cases":[
                {"input":1,"expected":1},
                {"input":2,"expected":2},
                {"input":3,"expected":3}]}]}"#,
        );
        assert!(load_goals(&missing_holdout).is_err());
        // Uncompilable scripted plans reject at load.
        let bad_plan = goals_file(
            &dir,
            r#"{"contract":"algal.goals.v1","goals":[{"id":"g","description":"x","scripted":["fn:bogus.v9"],"cases":[
                {"input":1,"expected":1},
                {"input":2,"expected":2},
                {"input":3,"expected":3},
                {"input":4,"expected":4}]}]}"#,
        );
        assert!(load_goals(&bad_plan).is_err());
        // Explicit splits are honored; scripted plans compile.
        let ok = goals_file(
            &dir,
            r#"{"contract":"algal.goals.v1","goals":[{"id":"g","description":"x","scripted":["fn:echo.v1"],"cases":[
                {"input":1,"expected":1,"split":"train"},
                {"input":2,"expected":2,"split":"validation"},
                {"input":3,"expected":3,"split":"holdout"}]}]}"#,
        );
        let loaded = load_goals(&ok).unwrap();
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].cases.len(), 3);
        let _ = fs::remove_dir_all(&dir);
    }
}
