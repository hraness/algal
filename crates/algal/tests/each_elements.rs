use algal::{contract::Manifest, effects::Host, runtime, store::Store};
use serde_json::{Value, json};

fn manifest(mut value: Value, key: &str) -> Manifest {
    value["contract"] = json!("algal.organism.v1");
    value["key"] = json!(key);
    value["name"] = json!("Each elements");
    Manifest::parse(&value).unwrap()
}

// The reference runtime checks each element against the inner input port's
// declared type before starting that element's run. Native must record the
// same failure: on the each cell, with no cells under the rejected element.
#[tokio::test]
async fn each_checks_every_element_before_its_run() {
    // The shape the source compiler emits for `record Task { id: text, urgency: number }`.
    let schema = json!({"type":"object","required":["id","urgency"],
        "properties":{"id":{"type":"string"},"urgency":{"type":"number"}}});
    let child = manifest(
        json!({"cells":[
            {"id":"input","kind":"input","outputs":{"task":{"type":"json","schema":schema}}},
            {"id":"result","kind":"expr","inputs":{"task":"json"},
                "expr":{"contract":"algal.expr.v1","program":["get","task","urgency"]},
                "output":{"kind":"json","schema":{"type":"number"}}}],
        "edges":[{"from":{"cell":"input","port":"task"},"to":{"cell":"result","port":"task"}}],
        "interface":{"inputs":{"task":{"cell":"input","port":"task"}},
            "outputs":{"result":{"cell":"result","port":"out"}}}}),
        "organism:element",
    );
    let mut store = Store::default();
    let digest = store.admit(&child).unwrap();
    let parent = manifest(
        json!({"cells":[
            {"id":"input","kind":"input","outputs":{"tasks":"json"}},
            {"id":"map","kind":"each","manifest":digest,"over":"task","maxItems":4}],
        "edges":[{"from":{"cell":"input","port":"tasks"},"to":{"cell":"map","port":"task"}}]}),
        "organism:elements",
    );
    let valid = runtime::run(
        parent.clone(),
        json!({"input":{"tasks":[{"id":"a","urgency":1},{"id":"b","urgency":2,"extra":true}]}}),
        &mut store,
        &mut Host::default(),
        &Default::default(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(valid["outcome"], "complete");
    assert_eq!(valid["cells"]["map"]["outputs"]["result"], json!([1, 2]));
    for (tasks, message) in [
        (
            json!([{"id":"a","urgency":1},{"id":"b","urgency":"soon"},{"id":"c","urgency":3}]),
            "expected number",
        ),
        (
            json!([{"id":"a","urgency":1},{"id":"b"}]),
            "missing required field",
        ),
        (json!([{"id":"a","urgency":1},["b"]]), "expected object"),
    ] {
        let receipt = runtime::run(
            parent.clone(),
            json!({"input":{"tasks":tasks}}),
            &mut store,
            &mut Host::default(),
            &Default::default(),
            None,
        )
        .await
        .unwrap();
        assert_eq!(receipt["outcome"], "failed");
        assert_eq!(
            receipt["failure"],
            json!({"code":"TYPE_MISMATCH","message":message,"path":"map"})
        );
        assert_eq!(receipt["cells"]["map/i0/result"]["outputs"]["out"], 1);
        let cells = receipt["cells"].as_object().unwrap();
        assert!(cells.keys().all(|path| !path.starts_with("map/i1")));
        let verified = runtime::verify(&receipt, parent.clone(), &store, &Host::default())
            .await
            .unwrap();
        assert_eq!(verified["ok"], true, "{verified}");
    }
    // List-shape failures carry the reference runtime's messages too.
    for (tasks, code, message) in [
        (
            json!({"id":"a","urgency":1}),
            "TYPE_MISMATCH",
            "each cell \"map\" over \"task\" expected a list",
        ),
        (
            json!([1, 2, 3, 4, 5]),
            "BUDGET_EXHAUSTED",
            "each cell \"map\" got 5 items, maxItems 4",
        ),
    ] {
        let receipt = runtime::run(
            parent.clone(),
            json!({"input":{"tasks":tasks}}),
            &mut store,
            &mut Host::default(),
            &Default::default(),
            None,
        )
        .await
        .unwrap();
        assert_eq!(
            receipt["failure"],
            json!({"code":code,"message":message,"path":"map"})
        );
        let cells = receipt["cells"].as_object().unwrap();
        assert!(cells.keys().all(|path| !path.starts_with("map/")));
    }
}
