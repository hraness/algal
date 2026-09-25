use algal::{
    canonical::digest,
    contract::Manifest,
    effects::Host,
    foundry::{self, FoundryCase},
    graph::Transports,
    habitat_budget::{self, Account, DynLedger, Limits},
    runtime,
    store::Store,
};
use serde_json::{Value, json};
use std::path::PathBuf;

fn repo() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn pure(key: &str, program: Value, max_work: u64) -> Manifest {
    Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":key,"name":key,
        "budgets":{"maxWork":max_work,"maxAgentCalls":0},
        "interface":{"inputs":{"q":{"cell":"src","port":"value"}},"outputs":{"answer":{"cell":"out","port":"out"}}},
        "cells":[
            {"id":"src","kind":"input","outputs":{"value":"json"}},
            {"id":"out","kind":"expr","inputs":{"value":"json"},"expr":{"contract":"algal.expr.v1","program":program},"output":{"kind":"json","schema":{"type":"string"}}},
        ],
        "edges":[{"from":{"cell":"src","port":"value"},"to":{"cell":"out","port":"value"}}],
    }))
    .unwrap()
}

fn constant() -> Manifest {
    pure("organism:budget-constant", json!("a"), 1_000)
}

fn echo() -> Manifest {
    pure("organism:budget-echo", json!(["get", "value"]), 1_000)
}

fn cases() -> Vec<FoundryCase> {
    [
        ("train-a", "train", "a"),
        ("validation-b", "validation", "b"),
        ("holdout-c", "holdout", "c"),
    ]
    .into_iter()
    .map(|(id, split, q)| FoundryCase {
        id: id.into(),
        split: split.into(),
        args: json!({"q":q}),
        expect: json!({"answer":q}),
    })
    .collect()
}

fn limits(work: u64, attempts: u64, runs: u64) -> Limits {
    Limits {
        work,
        attempts,
        runs,
    }
}

async fn run_once(
    manifest: &Manifest,
    store: &mut Store,
    host: &mut Host,
    account: &mut Account,
) -> Value {
    account.reserve(manifest).unwrap();
    let receipt = runtime::run(
        manifest.clone(),
        json!({"src":{"value":"x"}}),
        store,
        host,
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    let reference = store.put("runs", &receipt).unwrap();
    account.charge(&reference, &receipt).unwrap();
    receipt
}

async fn budgeted_foundry(budget: Limits, store: &mut Store) -> (Account, algal::Result<Value>) {
    let mut account = Account::new("foundry", budget).unwrap();
    let result = foundry::run_in(
        &[constant(), echo()],
        &cases(),
        None,
        None,
        store,
        &mut Host::default(),
        &Transports::new(),
        Some(&mut account),
    )
    .await;
    (account, result)
}

fn redigest(report: &Value) -> Value {
    let mut report = report.clone();
    report.as_object_mut().unwrap().remove("digest");
    report["digest"] = json!(digest(&report).unwrap());
    report
}

fn mismatches(verified: &Value) -> Vec<String> {
    verified["mismatches"]
        .as_array()
        .unwrap()
        .iter()
        .map(|m| m.as_str().unwrap().to_owned())
        .collect()
}

#[tokio::test]
async fn account_reserves_ceilings_charges_recorded_work_and_closes_complete() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let echo = echo();
    store.admit(&echo).unwrap();
    let mut account = Account::new("foundry", limits(2_000, 0, 2)).unwrap();
    for _ in 0..2 {
        run_once(&echo, &mut store, &mut Host::default(), &mut account).await;
    }
    let record = account.record().unwrap();
    assert_eq!(record["outcome"], "complete");
    assert_eq!(record["refused"], Value::Null);
    assert_eq!(
        record["runs"][0]["ceiling"],
        json!({"work":1_000,"attempts":0})
    );
    assert_eq!(record["charged"]["runs"], 2);
    assert_eq!(habitat_budget::parse(&record).unwrap(), record);
    let verified = habitat_budget::verify(&record, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(
        verified,
        json!({"ok":true,"digest":digest(&record).unwrap(),"outcome":"complete","checkedReceipts":2,"mismatches":[]})
    );
}

#[tokio::test]
async fn refusal_is_terminal_and_names_every_limit_it_exceeds() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let (echo, constant) = (echo(), constant());
    store.admit(&echo).unwrap();
    store.admit(&constant).unwrap();
    let mut account = Account::new("search", limits(1_100, 0, 1)).unwrap();
    run_once(&echo, &mut store, &mut Host::default(), &mut account).await;
    let refused = account.reserve(&constant).unwrap_err();
    assert_eq!(refused.code, "BUDGET_EXHAUSTED");
    assert!(account.exhausted());
    let tiny = pure("organism:budget-tiny", json!("a"), 1);
    assert_eq!(account.reserve(&tiny).unwrap_err().code, "BUDGET_EXHAUSTED");
    let record = account.record().unwrap();
    assert_eq!(record["outcome"], "exhausted");
    assert_eq!(
        record["refused"],
        json!({"manifest":constant.digest().unwrap(),"ceiling":{"work":1_000,"attempts":0},"reasons":["runs","work"]})
    );
    let verified = habitat_budget::verify(&record, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
}

#[tokio::test]
async fn executor_attempts_are_charged_and_refused_past_the_limit() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let agent = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:budget-agent","name":"budget agent",
        "budgets":{"maxWork":10_000,"maxAgentCalls":1},
        "cells":[{"id":"ask","kind":"agent","prompt":"fixture","output":{"kind":"text"}}],
        "edges":[],
    }))
    .unwrap();
    store.admit(&agent).unwrap();
    let mut host = Host::scripted(json!({"ask":"ok"}));
    let mut account = Account::new("experiment", limits(1_000_000, 2, 8)).unwrap();
    for _ in 0..2 {
        let receipt = run_once(&agent, &mut store, &mut host, &mut account).await;
        assert_eq!(receipt["work"]["agentCalls"], 1);
    }
    assert_eq!(
        account.reserve(&agent).unwrap_err().code,
        "BUDGET_EXHAUSTED"
    );
    let record = account.record().unwrap();
    assert_eq!(record["charged"]["attempts"], 2);
    assert_eq!(record["refused"]["reasons"], json!(["attempts"]));
    let verified = habitat_budget::verify(&record, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["checkedReceipts"], 2, "{verified}");
}

#[tokio::test]
async fn a_run_that_exhausts_its_own_max_work_is_charged_in_full() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let tight = pure("organism:budget-tight", json!(["get", "value"]), 150);
    store.admit(&tight).unwrap();
    let mut account = Account::new("foundry", limits(10_000, 0, 4)).unwrap();
    let receipt = run_once(&tight, &mut store, &mut Host::default(), &mut account).await;
    assert_eq!(receipt["outcome"], "failed");
    assert_eq!(receipt["failure"]["code"], "BUDGET_EXHAUSTED");
    let record = account.record().unwrap();
    assert_eq!(
        record["runs"][0]["charged"]["work"],
        receipt["work"]["units"]
    );
    assert!(
        record["runs"][0]["charged"]["work"].as_u64()
            > record["runs"][0]["ceiling"]["work"].as_u64()
    );
}

#[tokio::test]
async fn account_refuses_misuse() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let mut account = Account::new("foundry", limits(1_000, 0, 1)).unwrap();
    let receipt = runtime::run(
        echo(),
        json!({"src":{"value":"x"}}),
        &mut store,
        &mut Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    let reference = receipt["digest"].as_str().unwrap().to_owned();
    assert_eq!(
        account.charge(&reference, &receipt).unwrap_err().code,
        "INTERNAL"
    );
    account.reserve(&constant()).unwrap();
    assert_eq!(account.record().unwrap_err().code, "INTERNAL");
    assert_eq!(
        account.charge(&reference, &receipt).unwrap_err().code,
        "INTERNAL"
    );
    assert!(Account::new("habitat", limits(1, 0, 1)).is_err());
    let mut search = Account::new("search", limits(10_000, 0, 8)).unwrap();
    let wrong = foundry::run_in(
        &[echo()],
        &cases(),
        None,
        None,
        &mut store,
        &mut Host::default(),
        &Transports::new(),
        Some(&mut search),
    )
    .await
    .unwrap_err();
    assert_eq!(wrong.code, "PARSE_FAILED");
}

#[test]
fn limits_and_records_are_closed_bounded_and_arithmetic_checked() {
    let ok = habitat_budget::parse_limits(&json!({"work":1,"attempts":0,"runs":1})).unwrap();
    assert_eq!(ok, limits(1, 0, 1));
    let max = json!({"work":habitat_budget::MAX_WORK,"attempts":habitat_budget::MAX_ATTEMPTS,"runs":habitat_budget::MAX_RUNS});
    assert!(habitat_budget::parse_limits(&max).is_ok());
    for bad in [
        json!({"work":0,"attempts":0,"runs":1}),
        json!({"work":1,"attempts":0,"runs":0}),
        json!({"work":habitat_budget::MAX_WORK + 1,"attempts":0,"runs":1}),
        json!({"work":1,"attempts":habitat_budget::MAX_ATTEMPTS + 1,"runs":1}),
        json!({"work":1,"attempts":0,"runs":habitat_budget::MAX_RUNS + 1}),
        json!({"work":1.5,"attempts":0,"runs":1}),
        json!({"work":1,"attempts":-1,"runs":1}),
        json!({"work":1,"attempts":0}),
        json!({"work":1,"attempts":0,"runs":1,"extra":1}),
        json!([1, 0, 1]),
        Value::Null,
    ] {
        assert!(habitat_budget::parse_limits(&bad).is_err(), "{bad}");
    }
}

#[tokio::test]
async fn records_reject_broken_shape_and_arithmetic() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let (_, report) = budgeted_foundry(limits(5_000, 0, 5), &mut store).await;
    let record = report.unwrap()["budget"].clone();
    let (exhausted, _) = budgeted_foundry(limits(5_000, 0, 3), &mut store).await;
    let exhausted = exhausted.record().unwrap();
    let edit = |base: &Value, change: &dyn Fn(&mut Value)| {
        let mut value = base.clone();
        change(&mut value);
        value
    };
    let bad = [
        edit(&record, &|v| v["extra"] = json!(true)),
        edit(&record, &|v| {
            v.as_object_mut().unwrap().remove("refused");
        }),
        edit(&record, &|v| {
            v["contract"] = json!("algal.habitat-budget.v2")
        }),
        edit(&record, &|v| v["activity"] = json!("habitat")),
        edit(&record, &|v| v["limits"]["runs"] = json!(4)),
        edit(&record, &|v| v["charged"]["work"] = json!(1)),
        edit(&record, &|v| v["limits"]["work"] = json!(1_200)),
        edit(&record, &|v| {
            v["runs"][0]["charged"]["attempts"] = json!(1);
            v["charged"]["attempts"] = json!(1);
            v["limits"]["attempts"] = json!(5);
        }),
        edit(&record, &|v| {
            v["runs"][0]["ceiling"]["work"] = json!(100_000_001)
        }),
        edit(&record, &|v| v["runs"][0]["receipt"] = json!("sha256:ABC")),
        edit(&record, &|v| v["refused"] = exhausted["refused"].clone()),
        edit(&record, &|v| v["outcome"] = json!("partial")),
        edit(&exhausted, &|v| v["refused"] = Value::Null),
        edit(&exhausted, &|v| v["refused"]["reasons"] = json!(["work"])),
        edit(&exhausted, &|v| {
            v["refused"]["reasons"] = json!(["runs", "runs"])
        }),
        edit(&exhausted, &|v| v["limits"]["runs"] = json!(4)),
    ];
    for (i, value) in bad.iter().enumerate() {
        assert!(habitat_budget::parse(value).is_err(), "case {i}: {value}");
    }
    assert_eq!(habitat_budget::parse(&exhausted).unwrap(), exhausted);
}

#[tokio::test]
async fn complete_foundry_embeds_its_account_and_verifies_the_binding() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let (_, report) = budgeted_foundry(limits(5_000, 0, 5), &mut store).await;
    let report = report.unwrap();
    let budget = &report["budget"];
    assert_eq!(budget["outcome"], "complete");
    let (constant, echo) = (constant().digest().unwrap(), echo().digest().unwrap());
    let manifests: Vec<&str> = budget["runs"]
        .as_array()
        .unwrap()
        .iter()
        .map(|run| run["manifest"].as_str().unwrap())
        .collect();
    assert_eq!(
        manifests,
        [
            constant.as_str(),
            constant.as_str(),
            echo.as_str(),
            echo.as_str(),
            echo.as_str()
        ]
    );
    let runs: Vec<(String, String)> = budget["runs"]
        .as_array()
        .unwrap()
        .iter()
        .map(|run| {
            (
                run["manifest"].as_str().unwrap().to_owned(),
                run["receipt"].as_str().unwrap().to_owned(),
            )
        })
        .collect();
    assert_eq!(runs, foundry::report_runs(&report));
    let verified = foundry::verify(&report, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
    assert_eq!(verified["checkedReceipts"], 5);

    let mut swapped = report.clone();
    let first = swapped["budget"]["runs"][1].clone();
    swapped["budget"]["runs"][1] = swapped["budget"]["runs"][2].clone();
    swapped["budget"]["runs"][2] = first;
    let verified = foundry::verify(&redigest(&swapped), &store, &Host::default())
        .await
        .unwrap();
    assert!(mismatches(&verified).contains(&"budget run 1 is not the foundry's run 1".to_owned()));

    let mut widened = report.clone();
    widened["budget"]["limits"]["work"] = json!(6_000);
    widened["budget"]["runs"][0]["ceiling"]["work"] = json!(2_000);
    let verified = foundry::verify(&redigest(&widened), &store, &Host::default())
        .await
        .unwrap();
    assert!(
        mismatches(&verified)
            .contains(&"budget run 0: ceiling differs from its manifest".to_owned())
    );

    let mut recharged = report.clone();
    let work = recharged["budget"]["runs"][4]["charged"]["work"]
        .as_u64()
        .unwrap();
    recharged["budget"]["runs"][4]["charged"]["work"] = json!(work + 1);
    let total = recharged["budget"]["charged"]["work"].as_u64().unwrap();
    recharged["budget"]["charged"]["work"] = json!(total + 1);
    let verified = foundry::verify(&redigest(&recharged), &store, &Host::default())
        .await
        .unwrap();
    assert!(
        mismatches(&verified).contains(&"budget run 4: charge differs from its receipt".to_owned())
    );

    // A report without a budget keeps its original bytes and digest.
    let plain = foundry::run(
        &[self::constant(), self::echo()],
        &cases(),
        None,
        None,
        &mut store,
        &mut Host::default(),
        &Transports::new(),
    )
    .await
    .unwrap();
    assert!(plain.get("budget").is_none());
    let mut base = report.clone();
    base.as_object_mut().unwrap().remove("budget");
    base.as_object_mut().unwrap().remove("digest");
    assert_eq!(plain["digest"], json!(digest(&base).unwrap()));
}

#[tokio::test]
async fn exhaustion_stops_admitting_runs_and_leaves_a_terminal_record() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let (account, report) = budgeted_foundry(limits(1_300, 0, 5), &mut store).await;
    assert_eq!(report.unwrap_err().code, "BUDGET_EXHAUSTED");
    let record = account.record().unwrap();
    assert_eq!(record["outcome"], "exhausted");
    let constant = constant().digest().unwrap();
    assert_eq!(record["runs"].as_array().unwrap().len(), 2);
    assert!(
        record["runs"]
            .as_array()
            .unwrap()
            .iter()
            .all(|run| run["manifest"] == json!(constant))
    );
    assert_eq!(
        record["refused"],
        json!({"manifest":echo().digest().unwrap(),"ceiling":{"work":1_000,"attempts":0},"reasons":["work"]})
    );
    let verified = habitat_budget::verify(&record, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
    assert_eq!(verified["outcome"], "exhausted");
    assert_eq!(verified["checkedReceipts"], 2);
    let empty = tempfile::tempdir().unwrap();
    let verified = habitat_budget::verify(
        &record,
        &Store::open(empty.path(), false).unwrap(),
        &Host::default(),
    )
    .await
    .unwrap();
    assert!(mismatches(&verified).contains(&format!("budget run 0: manifest {constant} missing")));
}

#[tokio::test]
async fn generator_run_is_admitted_first_and_charged_to_the_same_account() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let generator = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:budget-generator","name":"budget generator",
        "budgets":{"maxWork":2_000,"maxAgentCalls":0},
        "interface":{"inputs":{},"outputs":{"candidates":{"cell":"out","port":"out"}}},
        "cells":[{"id":"out","kind":"expr","inputs":{},"expr":{"contract":"algal.expr.v1","program":["quote",[echo().value]]},"output":{"kind":"json","schema":{"type":"array"}}}],
        "edges":[],
    }))
    .unwrap();
    let mut account = Account::new("foundry", limits(3_000, 0, 6)).unwrap();
    let (generator_digest, receipt_digest, generated) = foundry::generate_in(
        &generator,
        &json!({}),
        "candidates",
        None,
        &mut store,
        &mut Host::default(),
        &Transports::new(),
        Some(&mut account),
    )
    .await
    .unwrap();
    let mut candidates = vec![constant()];
    candidates.extend(generated);
    let report = foundry::run_in(
        &candidates,
        &cases(),
        None,
        Some((generator_digest.clone(), receipt_digest.clone())),
        &mut store,
        &mut Host::default(),
        &Transports::new(),
        Some(&mut account),
    )
    .await
    .unwrap();
    assert_eq!(
        report["budget"]["runs"][0]["manifest"],
        json!(generator_digest)
    );
    assert_eq!(
        report["budget"]["runs"][0]["receipt"],
        json!(receipt_digest)
    );
    assert_eq!(report["budget"]["runs"].as_array().unwrap().len(), 6);
    let verified = foundry::verify(&report, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");

    let mut small = Account::new("foundry", limits(1_999, 0, 6)).unwrap();
    let refused = foundry::generate_in(
        &generator,
        &json!({}),
        "candidates",
        None,
        &mut store,
        &mut Host::default(),
        &Transports::new(),
        Some(&mut small),
    )
    .await
    .unwrap_err();
    assert_eq!(refused.code, "BUDGET_EXHAUSTED");
    let record = small.record().unwrap();
    assert_eq!(record["runs"], json!([]));
    assert_eq!(record["refused"]["manifest"], json!(generator_digest));
}

#[test]
fn config_budget_is_bounded_and_accepted_by_search() {
    let config =
        foundry::load_config(&repo().join("examples/foundry-budget.config.json"), false).unwrap();
    assert_eq!(config.budget, Some(limits(10_000_000, 256, 5)));
    let directory = tempfile::tempdir().unwrap();
    let write = |value: Value| -> PathBuf {
        let file = directory.path().join("config.json");
        std::fs::write(&file, serde_json::to_string(&value).unwrap()).unwrap();
        file
    };
    let base = json!({
        "contract":"algal.foundry.config.v1",
        "candidates":[repo().join("examples/foundry-echo.algal.json")],
        "cases":[
            {"id":"t","split":"train","args":{"q":"x"},"expect":{"answer":"x"}},
            {"id":"v","split":"validation","args":{"q":"x"},"expect":{"answer":"x"}},
            {"id":"h","split":"holdout","args":{"q":"x"},"expect":{"answer":"x"}},
        ],
    });
    let mut bad = base.clone();
    bad["budget"] = json!({"work":0,"attempts":0,"runs":1});
    assert!(foundry::load_config(&write(bad), false).is_err());
    let mut search = base.clone();
    search["budget"] = json!({"work":1,"attempts":0,"runs":1});
    search["search"] = json!({"maxGenerations":1,"feedbackInput":"feedback"});
    assert_eq!(
        foundry::load_config(&write(search.clone()), true)
            .unwrap()
            .budget,
        Some(limits(1, 0, 1))
    );
    search["budget"] = json!({"work":1,"attempts":0,"runs":0});
    assert!(foundry::load_config(&write(search), true).is_err());
    assert!(
        foundry::load_config(&write(base), false)
            .unwrap()
            .budget
            .is_none()
    );
}

#[tokio::test]
async fn release_clears_an_open_reservation_without_a_charge() {
    let mut account = Account::new("foundry", limits(1_000, 0, 1)).unwrap();
    let echo = echo();
    account.reserve(&echo).unwrap();
    assert!(account.record().is_err());
    account.release().unwrap();
    let record = account.record().unwrap();
    assert_eq!(record["runs"], json!([]));
    assert_eq!(record["charged"], json!({"work":0,"attempts":0,"runs":0}));
    assert!(account.release().is_err());
    account.reserve(&echo).unwrap();
    account.release().unwrap();
}

#[tokio::test]
async fn a_run_that_fails_before_a_receipt_releases_its_reservation() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let broken = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:broken","name":"broken",
        "budgets":{"maxWork":1_000,"maxAgentCalls":0},
        "interface":{"inputs":{"q":{"cell":"src","port":"value"}},"outputs":{"answer":{"cell":"child","port":"result"}}},
        "cells":[
            {"id":"src","kind":"input","outputs":{"value":"json"}},
            {"id":"child","kind":"organism","manifest":format!("sha256:{}", "0".repeat(64))}
        ],
        "edges":[]
    }))
    .unwrap();
    let mut account = Account::new("foundry", limits(10_000, 0, 8)).unwrap();
    let result = foundry::run_in(
        &[constant(), broken],
        &cases(),
        None,
        None,
        &mut store,
        &mut Host::default(),
        &Transports::new(),
        Some(&mut account),
    )
    .await;
    assert!(result.is_err());
    let record = account.record().unwrap();
    assert_eq!(record["outcome"], "complete");
    assert!(record["charged"]["runs"].as_u64().unwrap() > 0);
    assert!(!account.exhausted());
}

/// Proposes the constant before any feedback exists and the echo afterwards,
/// so the second generation evaluates both and the echo wins.
fn search_generator() -> foundry::Generator {
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:search-generator","name":"search generator",
        "budgets":{"maxWork":2_000,"maxAgentCalls":0},
        "interface":{"inputs":{"feedback":{"cell":"src","port":"value"}},"outputs":{"candidates":{"cell":"out","port":"out"}}},
        "cells":[
            {"id":"src","kind":"input","outputs":{"value":"json"}},
            {"id":"out","kind":"expr","inputs":{"value":"json"},"expr":{"contract":"algal.expr.v1","program":["if",["eq",["get","value"],null],["quote",[constant().value]],["quote",[echo().value]]]},"output":{"kind":"json","schema":{"type":"array"}}}
        ],
        "edges":[{"from":{"cell":"src","port":"value"},"to":{"cell":"out","port":"value"}}]
    }))
    .unwrap();
    foundry::Generator {
        manifest,
        args: json!({}),
        output: "candidates".into(),
        field: None,
    }
}

async fn budgeted_search(account: Option<&mut Account>, store: &mut Store) -> algal::Result<Value> {
    foundry::search_in(
        &search_generator(),
        &[],
        &cases(),
        &foundry::Search {
            max_generations: 2,
            feedback_input: "feedback".into(),
        },
        None,
        store,
        &mut Host::default(),
        &Transports::new(),
        account.map(|account| account as &mut DynLedger),
    )
    .await
}

#[tokio::test]
async fn search_charges_every_generator_candidate_and_final_run_to_one_account() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let mut account = Account::new("search", limits(100_000, 0, 64)).unwrap();
    let report = budgeted_search(Some(&mut account), &mut store)
        .await
        .unwrap();
    let budget = &report["budget"];
    assert_eq!(budget["activity"], "search");
    assert_eq!(budget["outcome"], "complete");
    let (g, c, e) = (
        search_generator().manifest.digest().unwrap(),
        constant().digest().unwrap(),
        echo().digest().unwrap(),
    );
    let manifests: Vec<&str> = budget["runs"]
        .as_array()
        .unwrap()
        .iter()
        .map(|run| run["manifest"].as_str().unwrap())
        .collect();
    assert_eq!(manifests, [&g, &c, &c, &g, &c, &c, &e, &e, &e, &e, &e]);
    let runs: Vec<(String, String)> = budget["runs"]
        .as_array()
        .unwrap()
        .iter()
        .map(|run| {
            (
                run["manifest"].as_str().unwrap().to_owned(),
                run["receipt"].as_str().unwrap().to_owned(),
            )
        })
        .collect();
    assert_eq!(runs, foundry::search_report_runs(&report));
    assert!(report["result"].get("budget").is_none());
    let verified = foundry::verify_search(&report, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");

    // A search without a budget keeps its bytes.
    let plain = budgeted_search(None, &mut store).await.unwrap();
    assert!(plain.get("budget").is_none());
    let mut base = report.clone();
    base.as_object_mut().unwrap().remove("budget");
    base.as_object_mut().unwrap().remove("digest");
    assert_eq!(plain["digest"], json!(digest(&base).unwrap()));

    let tampered = |change: &dyn Fn(&mut Value)| {
        let mut value = report.clone();
        change(&mut value);
        redigest(&value)
    };
    for (value, mismatch) in [
        (
            tampered(&|value| {
                let first = value["budget"]["runs"][1].clone();
                value["budget"]["runs"][1] = value["budget"]["runs"][3].clone();
                value["budget"]["runs"][3] = first;
            }),
            "budget run 1 is not the search's run 1",
        ),
        (
            tampered(&|value| value["budget"]["activity"] = json!("foundry")),
            "budget activity is not search",
        ),
        (
            tampered(&|value| value["result"]["budget"] = value["budget"].clone()),
            "result: the final foundry report carries a budget",
        ),
    ] {
        let verified = foundry::verify_search(&value, &store, &Host::default())
            .await
            .unwrap();
        assert!(
            mismatches(&verified).contains(&mismatch.to_owned()),
            "{verified}"
        );
    }
}

#[tokio::test]
async fn search_exhaustion_leaves_an_exhausted_account_and_no_report() {
    let (g, c, e) = (
        search_generator().manifest.digest().unwrap(),
        constant().digest().unwrap(),
        echo().digest().unwrap(),
    );
    for (budget, listed, refused, reasons) in [
        (limits(100_000, 0, 4), 4, c, json!(["runs"])),
        (limits(100_000, 0, 8), 8, e, json!(["runs"])),
        (limits(1_999, 0, 64), 0, g, json!(["work"])),
    ] {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::open(directory.path(), true).unwrap();
        let mut account = Account::new("search", budget).unwrap();
        let error = budgeted_search(Some(&mut account), &mut store)
            .await
            .unwrap_err();
        assert_eq!(error.code, "BUDGET_EXHAUSTED");
        let record = account.record().unwrap();
        assert_eq!(record["outcome"], "exhausted");
        assert_eq!(record["runs"].as_array().unwrap().len(), listed);
        assert_eq!(record["refused"]["manifest"], json!(refused));
        assert_eq!(record["refused"]["reasons"], reasons);
        let verified =
            habitat_budget::verify_for(&record, &store, &Host::default(), Some("search"))
                .await
                .unwrap();
        assert_eq!(verified["ok"], true, "{verified}");
        assert_eq!(verified["checkedReceipts"], listed);
    }
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path(), true).unwrap();
    let mut wrong = Account::new("foundry", limits(100_000, 0, 64)).unwrap();
    let error = budgeted_search(Some(&mut wrong), &mut store)
        .await
        .unwrap_err();
    assert_eq!(error.code, "PARSE_FAILED");
    let record = wrong.record().unwrap();
    let verified = habitat_budget::verify_for(&record, &store, &Host::default(), Some("search"))
        .await
        .unwrap();
    assert_eq!(
        mismatches(&verified).first().map(String::as_str),
        Some("budget activity is not search")
    );
}
