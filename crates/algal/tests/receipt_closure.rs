use algal::{
    contract::Manifest,
    effects::{Backend, Host},
    receipt, runtime,
    store::Store,
};
use serde_json::{Value, json};

fn inputs(ids: &[&str]) -> Manifest {
    Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:receipt-closure","name":"Receipt closure",
        "cells":ids.iter().map(|id| json!({"id":id,"kind":"input","outputs":{"value":"json"}})).collect::<Vec<_>>(),
        "edges":[]
    })).unwrap()
}

async fn run(manifest: &Manifest, args: Value, store: &mut Store) -> algal::Result<Value> {
    runtime::run(
        manifest.clone(),
        args,
        store,
        &mut Host::default(),
        &Default::default(),
        None,
    )
    .await
}

async fn readable(value: &Value, manifest: &Manifest, memory: &Store) {
    receipt::validate(value).unwrap();
    assert_eq!(runtime::receipt_digest(value).unwrap(), value["digest"]);
    let directory = tempfile::tempdir().unwrap();
    let mut file = Store::open(directory.path(), true).unwrap();
    let key = file.put("runs", value).unwrap();
    let reopened = Store::open(directory.path(), false)
        .unwrap()
        .get("runs", &key)
        .unwrap()
        .unwrap();
    receipt::validate(&reopened).unwrap();
    assert_eq!(&reopened, value);
    assert_eq!(runtime::receipt_digest(&reopened).unwrap(), value["digest"]);
    assert_eq!(
        runtime::verify(&reopened, manifest.clone(), memory, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
}

#[tokio::test]
async fn receipt_wrapper_depth_is_admitted_before_return() {
    for depth in [59, 60, 61, 62] {
        let mut value = Value::Null;
        for _ in 0..depth {
            value = json!([value]);
        }
        let manifest = inputs(&["source"]);
        let mut store = Store::default();
        let result = run(&manifest, json!({"source":{"value":value}}), &mut store).await;
        if depth > 60 {
            let error = result.unwrap_err();
            assert_eq!(error.code, "BUDGET_EXHAUSTED", "depth {depth}");
            assert_eq!(error.message, "receipt structural bounds exceeded");
        } else {
            let receipt = result.unwrap();
            assert_eq!(receipt["outcome"], "complete");
            readable(&receipt, &manifest, &store).await;
        }
    }
}

fn large_args(count: usize) -> Value {
    let mut args = json!({});
    for id in ["a", "b", "c", "d"] {
        args[id] = json!({"value":vec![0;count]});
    }
    args
}

#[tokio::test]
async fn duplicated_args_and_cell_outputs_count_toward_the_receipt_limit() {
    for count in [124_990, 125_000, 130_000] {
        let manifest = inputs(&["a", "b", "c", "d"]);
        let mut store = Store::default();
        let result = run(&manifest, large_args(count), &mut store).await;
        if count >= 125_000 {
            assert_eq!(result.unwrap_err().code, "BUDGET_EXHAUSTED", "{count}");
        } else {
            let receipt = result.unwrap();
            assert_eq!(receipt["outcome"], "complete");
            readable(&receipt, &manifest, &store).await;
        }
    }
}

// Measure the fixture independently, including every container and digest.
fn nodes(value: &Value) -> usize {
    let mut pending = vec![value];
    let mut count = 0;
    while let Some(current) = pending.pop() {
        count += 1;
        match current {
            Value::Array(values) => pending.extend(values.iter()),
            Value::Object(values) => pending.extend(values.values()),
            _ => {}
        }
    }
    count
}

#[tokio::test]
async fn exact_node_limit_includes_digest_and_foreign_errors_remain_parse_failures() {
    let manifest = inputs(&["a", "b", "c", "d"]);
    let mut store = Store::default();
    let mut args = large_args(124_990);
    let base = run(&manifest, args.clone(), &mut store).await.unwrap();
    let padding = 1_000_000 - nodes(&base) - 2;
    args["unused"] = json!({"value":vec![0;padding]});
    let exact = run(&manifest, args.clone(), &mut store).await.unwrap();
    assert_eq!(nodes(&exact), 1_000_000);
    readable(&exact, &manifest, &store).await;
    args["unused"]["value"]
        .as_array_mut()
        .unwrap()
        .push(json!(0));
    assert_eq!(
        run(&manifest, args, &mut store).await.unwrap_err().code,
        "BUDGET_EXHAUSTED"
    );
    let mut foreign = exact;
    foreign["args"]["unused"]["value"]
        .as_array_mut()
        .unwrap()
        .push(json!(0));
    assert_eq!(
        receipt::validate(&foreign).unwrap_err().code,
        "PARSE_FAILED"
    );
}

#[cfg(unix)]
#[tokio::test]
async fn failed_and_suspended_receipts_also_satisfy_reader_store_and_replay() {
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:receipt-closure","name":"Receipt closure",
        "cells":[{"id":"agent","kind":"agent","prompt":"fixture","output":{"kind":"text"}}],"edges":[]
    })).unwrap();
    for (outcome, command) in [("failed", "exit 1"), ("suspended", "exit 75")] {
        let mut store = Store::default();
        let mut host = Host::default();
        host.entries.push((
            "fixture".into(),
            Backend::Command {
                argv: vec!["sh".into(), "-c".into(), command.into()],
                cwd: None,
                timeout_ms: 5_000,
            },
        ));
        let receipt = runtime::run(
            manifest.clone(),
            json!({}),
            &mut store,
            &mut host,
            &Default::default(),
            None,
        )
        .await
        .unwrap();
        assert_eq!(receipt["outcome"], outcome);
        readable(&receipt, &manifest, &store).await;
    }
}
