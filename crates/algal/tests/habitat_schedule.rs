use algal::{
    canonical::canonical,
    contract::Manifest,
    effects::Host,
    foundry::{self, FoundryCase, Generator, Search},
    graph::Transports,
    habitat_budget::Limits,
    habitat_schedule::{self, Activity, Journal, ScheduledLedger},
    store::Store,
};
use serde_json::{Value, json};
use std::{
    future::Future,
    path::{Path, PathBuf},
    pin::Pin,
};

fn pure(key: &str, program: Value) -> Manifest {
    Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":key,"name":key,
        "budgets":{"maxWork":1_000,"maxAgentCalls":0},
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
    pure("organism:schedule-constant", json!("a"))
}

fn echo() -> Manifest {
    pure("organism:schedule-echo", json!(["get", "value"]))
}

/// Proposes the constant before any feedback exists and the echo afterwards.
fn generator() -> Generator {
    Generator {
        manifest: Manifest::parse(&json!({
            "contract":"algal.organism.v1","key":"organism:schedule-generator","name":"schedule generator",
            "budgets":{"maxWork":2_000,"maxAgentCalls":0},
            "interface":{"inputs":{"feedback":{"cell":"src","port":"value"}},"outputs":{"candidates":{"cell":"out","port":"out"}}},
            "cells":[
                {"id":"src","kind":"input","outputs":{"value":"json"}},
                {"id":"out","kind":"expr","inputs":{"value":"json"},"expr":{"contract":"algal.expr.v1","program":["if",["eq",["get","value"],null],["quote",[constant().value]],["quote",[echo().value]]]},"output":{"kind":"json","schema":{"type":"array"}}}
            ],
            "edges":[{"from":{"cell":"src","port":"value"},"to":{"cell":"out","port":"value"}}]
        }))
        .unwrap(),
        args: json!({}),
        output: "candidates".into(),
        field: None,
    }
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

fn limits() -> Limits {
    Limits {
        work: 1_000_000,
        attempts: 0,
        runs: 64,
    }
}

type ActivityFuture<'a> = Pin<Box<dyn Future<Output = algal::Result<Value>> + Send + 'a>>;

fn foundry_activity() -> Activity {
    let (candidates, cases) = (vec![constant(), echo()], cases());
    Activity {
        kind: "foundry",
        run: Box::new(
            move |ledger: &mut ScheduledLedger,
                  store: &mut Store,
                  host: &mut Host,
                  transports: &Transports|
                  -> ActivityFuture<'_> {
                Box::pin(async move {
                    foundry::run_within(
                        &candidates,
                        &cases,
                        None,
                        None,
                        store,
                        host,
                        transports,
                        Some(ledger),
                    )
                    .await
                })
            },
        ),
    }
}

fn search_activity() -> Activity {
    Activity {
        kind: "search",
        run: Box::new(
            move |ledger: &mut ScheduledLedger,
                  store: &mut Store,
                  host: &mut Host,
                  transports: &Transports|
                  -> ActivityFuture<'_> {
                let generator = generator();
                Box::pin(async move {
                    foundry::search_in(
                        &generator,
                        &[],
                        &cases(),
                        &Search {
                            max_generations: 2,
                            feedback_input: "feedback".into(),
                        },
                        None,
                        store,
                        host,
                        transports,
                        Some(ledger),
                    )
                    .await
                })
            },
        ),
    }
}

fn activities() -> Vec<Activity> {
    vec![foundry_activity(), search_activity()]
}

/// The activities take these turns: the foundry finishes after its fifth
/// run, then the search takes every remaining turn.
const RR: [u64; 16] = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1];

fn turns(schedule: &Value) -> Vec<u64> {
    schedule["runs"]
        .as_array()
        .unwrap()
        .iter()
        .map(|run| run["activity"].as_u64().unwrap())
        .collect()
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
async fn activities_take_turns_on_one_account_and_reports_are_unbudgeted() {
    let directory = tempfile::tempdir().unwrap();
    let store = Store::open(directory.path(), true).unwrap();
    let outcome = habitat_schedule::run(
        "round-robin",
        &limits(),
        activities(),
        &store,
        &Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    let schedule = &outcome.schedule;
    assert_eq!(schedule["outcome"], "complete");
    assert_eq!(schedule["refused"], Value::Null);
    assert_eq!(schedule["charged"]["runs"], 16);
    assert_eq!(turns(schedule), RR);
    assert_eq!(
        schedule["activities"]
            .as_array()
            .unwrap()
            .iter()
            .map(|a| json!({"kind":a["kind"],"outcome":a["outcome"]}))
            .collect::<Vec<_>>(),
        [
            json!({"kind":"foundry","outcome":"complete"}),
            json!({"kind":"search","outcome":"complete"}),
        ]
    );
    // A report written inside a schedule carries no account and matches the
    // unbudgeted report byte for byte.
    let alone = tempfile::tempdir().unwrap();
    let mut alone_store = Store::open(alone.path(), true).unwrap();
    let plain = foundry::run(
        &[constant(), echo()],
        &cases(),
        None,
        None,
        &mut alone_store,
        &mut Host::default(),
        &Transports::new(),
    )
    .await
    .unwrap();
    assert_eq!(outcome.reports[0].as_ref().unwrap(), &plain);
    let searched = foundry::search_in(
        &generator(),
        &[],
        &cases(),
        &Search {
            max_generations: 2,
            feedback_input: "feedback".into(),
        },
        None,
        &mut alone_store,
        &mut Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(outcome.reports[1].as_ref().unwrap(), &searched);
    let digest = schedule["activities"][1]["report"].as_str().unwrap();
    assert_eq!(
        store.get("values", digest).unwrap().as_ref(),
        outcome.reports[1].as_ref()
    );
    let verified = habitat_schedule::verify(schedule, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
    // The reports' own verifications replayed their runs: the foundry's
    // five, and the search's final epoch plus per-generation evidence.
    assert_eq!(verified["checkedReceipts"], 19);
    // The order depends on nothing but the activities: a second schedule
    // writes the same bytes.
    let again = tempfile::tempdir().unwrap();
    let again_store = Store::open(again.path(), true).unwrap();
    let second = habitat_schedule::run(
        "round-robin",
        &limits(),
        activities(),
        &again_store,
        &Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(
        canonical(&second.schedule).unwrap(),
        canonical(schedule).unwrap()
    );
    assert_eq!(habitat_schedule::parse(schedule).unwrap(), schedule.clone());
}

#[tokio::test]
async fn the_first_refused_reservation_ends_every_unfinished_activity() {
    // Twelve runs: the foundry finishes at run nine, and the search's next
    // request after run twelve is refused.
    let directory = tempfile::tempdir().unwrap();
    let store = Store::open(directory.path(), true).unwrap();
    let partial = habitat_schedule::run(
        "round-robin",
        &Limits {
            runs: 12,
            ..limits()
        },
        activities(),
        &store,
        &Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    let schedule = &partial.schedule;
    assert_eq!(schedule["outcome"], "exhausted");
    assert_eq!(schedule["refused"]["activity"], 1);
    assert_eq!(schedule["refused"]["reasons"], json!(["runs"]));
    assert_eq!(turns(schedule), RR[..12]);
    assert_eq!(
        schedule["activities"]
            .as_array()
            .unwrap()
            .iter()
            .map(|a| a["outcome"].as_str().unwrap())
            .collect::<Vec<_>>(),
        ["complete", "exhausted"]
    );
    assert!(partial.reports[1].is_none());
    assert_eq!(schedule["activities"][1]["report"], Value::Null);
    let verified = habitat_schedule::verify(schedule, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
    assert_eq!(verified["outcome"], "exhausted");
    // Three runs: the search's second request is refused, then the
    // foundry's.
    let early = habitat_schedule::run(
        "round-robin",
        &Limits {
            runs: 3,
            ..limits()
        },
        activities(),
        &store,
        &Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(early.schedule["outcome"], "exhausted");
    assert_eq!(early.schedule["refused"]["activity"], 1);
    assert_eq!(
        early.schedule["activities"]
            .as_array()
            .unwrap()
            .iter()
            .map(|a| a["outcome"].as_str().unwrap())
            .collect::<Vec<_>>(),
        ["exhausted", "exhausted"]
    );
    assert_eq!(
        habitat_schedule::verify(&early.schedule, &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
    // The first ceiling does not fit: nothing runs.
    let none = habitat_schedule::run(
        "round-robin",
        &Limits {
            work: 999,
            ..limits()
        },
        activities(),
        &store,
        &Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(none.schedule["runs"], json!([]));
    assert_eq!(none.schedule["outcome"], "exhausted");
    assert_eq!(none.schedule["refused"]["activity"], 0);
    assert_eq!(none.schedule["refused"]["reasons"], json!(["work"]));
    assert_eq!(
        habitat_schedule::verify(&none.schedule, &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
}

/// The entries a journal directory holds: one per live charged run.
fn journal_entries(dir: &Path) -> usize {
    let runs = dir.join("runs");
    if !runs.exists() {
        return 0;
    }
    std::fs::read_dir(runs).unwrap().count()
}

#[tokio::test]
async fn a_journal_resumes_an_interrupted_schedule_and_replays_whole() {
    let directory = tempfile::tempdir().unwrap();
    let store_dir = directory.path().join("store");
    let journal_dir = directory.path().join("journal");
    let reference = habitat_schedule::run(
        "round-robin",
        &limits(),
        activities(),
        &Store::open(&directory.path().join("reference"), true).unwrap(),
        &Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap()
    .schedule;
    let mut store = Store::open(&store_dir, true).unwrap();
    // The host stops after journaling six runs: drive the schedule once in
    // a scratch directory, then keep only its first six journaled entries.
    {
        let scratch = tempfile::tempdir().unwrap();
        let scratch_store = Store::open(&scratch.path().join("s"), true).unwrap();
        let scratch_journal = scratch.path().join("j");
        habitat_schedule::run(
            "round-robin",
            &limits(),
            activities(),
            &scratch_store,
            &Host::default(),
            &Transports::new(),
            Some(Journal::open(&scratch_journal, "round-robin", &limits()).unwrap()),
        )
        .await
        .unwrap();
        let full: Vec<Value> = Journal::open(&scratch_journal, "round-robin", &limits())
            .unwrap()
            .runs()
            .to_vec();
        let mut journal = Journal::open(&journal_dir, "round-robin", &limits()).unwrap();
        for (i, run) in full.iter().take(6).enumerate() {
            assert_eq!(run["activity"].as_u64().unwrap(), RR[i]);
            journal.append(run).unwrap();
            // The receipt a journaled entry names must be in the store.
            let receipt = scratch_store
                .get("runs", run["receipt"].as_str().unwrap())
                .unwrap()
                .unwrap();
            store.put("runs", &receipt).unwrap();
        }
    }
    // Resume: six runs come from their stored receipts; each live run
    // appends one journal entry, so the entry delta counts started runs.
    let before = journal_entries(&journal_dir);
    let resumed = Journal::open(&journal_dir, "round-robin", &limits()).unwrap();
    let finished = habitat_schedule::run(
        "round-robin",
        &limits(),
        activities(),
        &store,
        &Host::default(),
        &Transports::new(),
        Some(resumed),
    )
    .await
    .unwrap();
    assert_eq!(
        canonical(&finished.schedule).unwrap(),
        canonical(&reference).unwrap()
    );
    assert_eq!(journal_entries(&journal_dir) - before, 10);
    assert_eq!(
        Journal::open(&journal_dir, "round-robin", &limits())
            .unwrap()
            .runs()
            .len(),
        16
    );
    // A complete journal replays without starting a run.
    let before = journal_entries(&journal_dir);
    let replayed = habitat_schedule::run(
        "round-robin",
        &limits(),
        activities(),
        &store,
        &Host::default(),
        &Transports::new(),
        Some(Journal::open(&journal_dir, "round-robin", &limits()).unwrap()),
    )
    .await
    .unwrap();
    assert_eq!(
        canonical(&replayed.schedule).unwrap(),
        canonical(&reference).unwrap()
    );
    assert_eq!(journal_entries(&journal_dir), before);
    assert_eq!(
        habitat_schedule::verify(&replayed.schedule, &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
}

#[tokio::test]
async fn journal_entries_that_do_not_reconcile_are_refused() {
    let directory = tempfile::tempdir().unwrap();
    let store_dir = directory.path().join("store");
    let store = Store::open(&store_dir, true).unwrap();
    let complete = directory.path().join("complete");
    habitat_schedule::run(
        "round-robin",
        &limits(),
        activities(),
        &store,
        &Host::default(),
        &Transports::new(),
        Some(Journal::open(&complete, "round-robin", &limits()).unwrap()),
    )
    .await
    .unwrap();
    let entry = |journal: &Path, n: usize| -> Value {
        let path = journal.join("runs").join(format!("{n:06}.json"));
        serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
    };
    let put = |journal: &Path, n: usize, value: &Value| {
        std::fs::write(
            journal.join("runs").join(format!("{n:06}.json")),
            canonical(value).unwrap(),
        )
        .unwrap();
    };
    let copy = |name: &str| -> PathBuf {
        let journal = directory.path().join(name);
        copy_dir(&complete, &journal);
        journal
    };
    // Runs 0 and 2 are the constant's two selection cases: same manifest,
    // different arguments.
    let args = copy("args");
    let mut bad = entry(&args, 2);
    bad["receipt"] = entry(&args, 0)["receipt"].clone();
    put(&args, 2, &bad);
    assert!(
        resumed(&args, &store)
            .await
            .err()
            .unwrap()
            .message
            .contains("run 2: receipt arguments differ")
    );
    let charge = copy("charge");
    let mut bad = entry(&charge, 4);
    bad["charged"]["work"] = json!(bad["charged"]["work"].as_u64().unwrap() + 1);
    put(&charge, 4, &bad);
    assert!(
        resumed(&charge, &store)
            .await
            .err()
            .unwrap()
            .message
            .contains("run 4: charge differs from its receipt")
    );
    let turn = copy("turn");
    let mut bad = entry(&turn, 0);
    bad["activity"] = json!(1);
    put(&turn, 0, &bad);
    assert!(
        resumed(&turn, &store)
            .await
            .err()
            .unwrap()
            .message
            .contains("run 0 served activity 1")
    );
    let manifest = copy("manifest");
    let mut bad = entry(&manifest, 3);
    bad["activity"] = json!(1);
    put(&manifest, 1, &bad);
    assert!(
        resumed(&manifest, &store)
            .await
            .err()
            .unwrap()
            .message
            .contains("run 1 ran another manifest")
    );
    // A journal opened with other limits is refused.
    assert_eq!(
        Journal::open(
            &complete,
            "round-robin",
            &Limits {
                runs: 32,
                ..limits()
            },
        )
        .err()
        .unwrap()
        .code,
        "RECEIPT_MISMATCH"
    );
    // A gap in the entries is refused.
    let gap = copy("gap");
    std::fs::remove_file(gap.join("runs").join("000003.json")).unwrap();
    assert!(
        Journal::open(&gap, "round-robin", &limits())
            .err()
            .unwrap()
            .message
            .contains("entry 3 is missing")
    );
    // A journal holding more runs than the schedule requests does not
    // reconcile either: drop one activity so entry 1 names a missing index.
    let result = habitat_schedule::run(
        "round-robin",
        &limits(),
        vec![foundry_activity()],
        &store,
        &Host::default(),
        &Transports::new(),
        Some(Journal::open(&complete, "round-robin", &limits()).unwrap()),
    )
    .await
    .err()
    .unwrap();
    assert!(result.message.contains("names activity 1"), "{result:?}");
    // A surplus trailing entry is refused once the schedule closes.
    let surplus = copy("surplus");
    let extra = entry(&surplus, 15);
    put(&surplus, 16, &extra);
    let result = habitat_schedule::run(
        "round-robin",
        &limits(),
        activities(),
        &store,
        &Host::default(),
        &Transports::new(),
        Some(Journal::open(&surplus, "round-robin", &limits()).unwrap()),
    )
    .await
    .err()
    .unwrap();
    assert!(result.message.contains("did not request"), "{result:?}");
}

/// Resume a schedule against a journal directory.
async fn resumed(journal: &Path, store: &Store) -> algal::Result<habitat_schedule::Outcome> {
    let journal = Journal::open(journal, "round-robin", &limits())?;
    habitat_schedule::run(
        "round-robin",
        &limits(),
        activities(),
        store,
        &Host::default(),
        &Transports::new(),
        Some(journal),
    )
    .await
}

fn copy_dir(from: &Path, to: &Path) {
    fn visit(from: &Path, to: &Path) {
        std::fs::create_dir_all(to).unwrap();
        for entry in std::fs::read_dir(from).unwrap() {
            let entry = entry.unwrap();
            let target = to.join(entry.file_name());
            if entry.file_type().unwrap().is_dir() {
                visit(&entry.path(), &target);
            } else {
                std::fs::copy(entry.path(), target).unwrap();
            }
        }
    }
    visit(from, to);
}

#[tokio::test]
async fn the_record_parser_recomputes_the_account_outcomes_and_order() {
    let directory = tempfile::tempdir().unwrap();
    let store = Store::open(directory.path(), true).unwrap();
    let schedule = habitat_schedule::run(
        "round-robin",
        &limits(),
        activities(),
        &store,
        &Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap()
    .schedule;
    let exhausted = habitat_schedule::run(
        "round-robin",
        &Limits {
            runs: 12,
            ..limits()
        },
        activities(),
        &store,
        &Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap()
    .schedule;
    let edit = |base: &Value, change: &dyn Fn(&mut Value)| {
        let mut value = base.clone();
        change(&mut value);
        value
    };
    let bad = [
        edit(&schedule, &|v| v["extra"] = json!(1)),
        edit(&schedule, &|v| {
            v["contract"] = json!("algal.habitat-schedule.v2")
        }),
        edit(&schedule, &|v| v["order"] = json!("fifo")),
        edit(&schedule, &|v| {
            let first = v["activities"][0].clone();
            v["activities"] = json!(vec![first; 9]);
        }),
        edit(&schedule, &|v| v["activities"] = json!([])),
        edit(&schedule, &|v| v["activities"][0]["report"] = Value::Null),
        edit(&exhausted, &|v| {
            v["activities"][1]["report"] = v["activities"][0]["report"].clone();
        }),
        edit(&schedule, &|v| {
            v["activities"][0]["kind"] = json!("experiment")
        }),
        edit(&schedule, &|v| v["runs"][0]["activity"] = json!(2)),
        edit(&schedule, &|v| {
            v["runs"][0].as_object_mut().unwrap().remove("activity");
        }),
        edit(&schedule, &|v| {
            v["runs"][0]["activity"] = json!(1);
            v["runs"][1]["activity"] = json!(0);
        }),
        edit(&schedule, &|v| v["charged"]["runs"] = json!(15)),
        edit(&schedule, &|v| {
            v["activities"][1]["outcome"] = json!("exhausted");
            v["activities"][1]["report"] = Value::Null;
        }),
        edit(&exhausted, &|v| v["refused"]["activity"] = json!(0)),
        edit(&schedule, &|v| v["limits"]["runs"] = json!(15)),
    ];
    for (i, value) in bad.iter().enumerate() {
        assert!(habitat_schedule::parse(value).is_err(), "case {i}: {value}");
    }
    // Verification reports evidence that is missing or of the wrong kind.
    let swapped = edit(&schedule, &|v| {
        let first = v["activities"][0]["report"].clone();
        v["activities"][0]["report"] = v["activities"][1]["report"].clone();
        v["activities"][1]["report"] = first;
    });
    let wrong = habitat_schedule::verify(&swapped, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(wrong["ok"], false);
    assert!(
        mismatches(&wrong)
            .contains(&"activity 0: report is not an algal.foundry.v1 report".to_owned())
    );
    let empty = tempfile::tempdir().unwrap();
    let missing = habitat_schedule::verify(
        &schedule,
        &Store::open(empty.path(), false).unwrap(),
        &Host::default(),
    )
    .await
    .unwrap();
    assert_eq!(missing["ok"], false);
    assert!(
        mismatches(&missing)[0].starts_with("activity 0: report sha256:"),
        "{missing}"
    );
}

#[test]
fn the_config_is_closed_and_bounded() {
    let config = json!({
        "contract":"algal.habitat-schedule.config.v1",
        "order":"round-robin",
        "budget":{"work":1_000_000,"attempts":0,"runs":64},
        "activities":[{"kind":"search","config":"search.config.json"}],
    });
    let parsed = habitat_schedule::parse_config(&config).unwrap();
    assert_eq!(parsed.order, "round-robin");
    assert_eq!(parsed.budget, limits());
    assert_eq!(parsed.activities.len(), 1);
    assert_eq!(parsed.activities[0].kind, "search");
    assert_eq!(parsed.activities[0].config, "search.config.json");
    let bad = [
        {
            let mut v = config.clone();
            v["extra"] = json!(true);
            v
        },
        {
            let mut v = config.clone();
            v["contract"] = json!("algal.foundry.config.v1");
            v
        },
        {
            let mut v = config.clone();
            v["order"] = json!("priority");
            v
        },
        {
            let mut v = config.clone();
            v["budget"]["runs"] = json!(0);
            v
        },
        {
            let mut v = config.clone();
            v["activities"] = json!([]);
            v
        },
        {
            let mut v = config.clone();
            v["activities"] = json!(vec![v["activities"][0].clone(); 9]);
            v
        },
        {
            let mut v = config.clone();
            v["activities"][0]["kind"] = json!("experiment");
            v
        },
        {
            let mut v = config.clone();
            v["activities"][0]["config"] = json!("");
            v
        },
        {
            let mut v = config.clone();
            v["activities"][0].as_object_mut().unwrap().remove("config");
            v
        },
    ];
    for (i, value) in bad.iter().enumerate() {
        assert!(
            habitat_schedule::parse_config(value).is_err(),
            "case {i}: {value}"
        );
    }
}
