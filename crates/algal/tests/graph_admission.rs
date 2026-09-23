use algal::{
    contract::Manifest,
    effects::Host,
    graph::{Transports, compile},
    registry, runtime,
    store::Store,
};
use serde_json::{Value, json};

fn module(name: &str, cells: Vec<Value>, edges: Vec<Value>) -> Manifest {
    Manifest::parse(&json!({"contract":"algal.organism.v1","key":format!("organism:{name}"),"name":name,
        "cells":cells,"edges":edges,"interface":{"inputs":{},"outputs":{}},"budgets":{"maxSteps":1024,"maxDepth":8}})).unwrap()
}
fn constant(id: &str) -> Value {
    json!({"id":id,"kind":"const","outputs":{"out":{"type":"text","value":"ok"}}})
}
fn children(digest: &str, count: usize) -> Vec<Value> {
    (0..count)
        .map(|i| json!({"id":format!("child-{i}"),"kind":"organism","manifest":digest}))
        .collect()
}
fn admitted(manifest: Manifest, store: &mut Store) -> algal::Result<algal::graph::Compiled> {
    compile(manifest, store, &Default::default(), &Transports::new(), 0)
}
#[test]
fn compact_shared_dag_cannot_expand_before_runtime_budgets_apply() {
    let mut store = Store::default();
    let mut manifest = module("leaf", vec![constant("value")], vec![]);
    for level in 0..11 {
        let digest = store.admit(&manifest).unwrap();
        manifest = module(&format!("level-{level}"), children(&digest, 2), vec![]);
    }
    // Twelve stored definitions would otherwise expand into 4095 instances.
    assert_eq!(
        admitted(manifest, &mut store).err().unwrap().code,
        "BUDGET_EXHAUSTED"
    );
    assert!(admitted(module("later", vec![constant("v")], vec![]), &mut store).is_ok());
}
#[test]
fn expanded_cells_are_charged_for_each_repeated_child() {
    let mut store = Store::default();
    let leaf = module(
        "wide-leaf",
        (0..64).map(|i| constant(&format!("v-{i}"))).collect(),
        vec![],
    );
    let digest = store.admit(&leaf).unwrap();
    let empty = store.admit(&module("empty", vec![], vec![])).unwrap();
    let mut exact = children(&digest, 63);
    exact.push(json!({"id":"last","kind":"organism","manifest":empty}));
    assert!(admitted(module("exact-cells", exact, vec![]), &mut store).is_ok()); // 4096 cells
    assert_eq!(
        admitted(
            module("over-cells", children(&digest, 64), vec![]),
            &mut store
        )
        .err()
        .unwrap()
        .code,
        "BUDGET_EXHAUSTED"
    );
}
#[test]
fn expanded_edges_are_charged_across_valid_dense_modules() {
    let mut store = Store::default();
    let mut cells: Vec<_> = (0..16).map(|i| constant(&format!("source-{i}"))).collect();
    cells.extend((0..16).map(|i| json!({"id":format!("join-{i}"),"kind":"fn","fn":"join.v1"})));
    let edges = (0..256).map(|i| json!({"from":{"cell":format!("source-{}",i%16),"port":"out"},"to":{"cell":format!("join-{}",i/16),"port":"items"}})).collect();
    let digest = store.admit(&module("dense-leaf", cells, edges)).unwrap();
    let exact = module("exact-edges", children(&digest, 64), vec![]);
    assert!(admitted(exact.clone(), &mut store).is_ok()); // 16384 edges
    let all = store.admit(&exact).unwrap();
    let over = module(
        "over-edges",
        vec![
            json!({"id":"all","kind":"organism","manifest":all}),
            json!({"id":"extra","kind":"organism","manifest":digest}),
        ],
        vec![],
    );
    assert_eq!(
        admitted(over, &mut store).err().unwrap().code,
        "BUDGET_EXHAUSTED"
    );
}

#[test]
fn expanded_utf8_bytes_bound_large_constants_before_instance_count() {
    let mut store = Store::default();
    let leaf = module(
        "large-leaf",
        vec![
            json!({"id":"value","kind":"const","outputs":{"out":{"type":"text","value":"é".repeat(131_000)}}}),
        ],
        vec![],
    );
    let leaf_digest = store.admit(&leaf).unwrap();
    let group = module("large-group", children(&leaf_digest, 64), vec![]);
    let group_digest = store.admit(&group).unwrap();
    let root = module("large-root", children(&group_digest, 5), vec![]);
    let error = admitted(root, &mut store).err().unwrap();
    assert_eq!(error.code, "BUDGET_EXHAUSTED");
    assert_eq!(
        error.message,
        "expanded compilation manifest byte budget exceeded"
    );
}

#[test]
fn undeclared_constructor_edge_ports_are_missing_in_both_directions() {
    for (from, to) in [("constructor", "value"), ("out", "constructor")] {
        let manifest = module(
            "missing-constructor",
            vec![
                constant("source"),
                json!({"id":"sink","kind":"fn","fn":"echo.v1"}),
            ],
            vec![json!({"from":{"cell":"source","port":from},"to":{"cell":"sink","port":to}})],
        );
        assert_eq!(
            admitted(manifest, &mut Store::default())
                .err()
                .unwrap()
                .code,
            "MANIFEST_INVALID"
        );
    }
}

#[test]
fn constructor_interface_names_must_be_explicitly_declared() {
    for side in ["inputs", "outputs"] {
        let mut value = module(
            "missing-interface",
            vec![json!({"id":"input","kind":"input","outputs":{"value":"text"}})],
            vec![],
        )
        .value;
        value["interface"][side] = json!({"exposed":{"cell":"input","port":"constructor"}});
        assert_eq!(
            admitted(Manifest::parse(&value).unwrap(), &mut Store::default())
                .err()
                .unwrap()
                .code,
            "INTERFACE_MISMATCH"
        );
    }
    let mut store = Store::default();
    let mut value = module(
        "interface-source",
        vec![json!({"id":"input","kind":"input","outputs":{"value":"text"}})],
        vec![],
    )
    .value;
    value["interface"] = json!({"inputs":{"value":{"cell":"input","port":"value"}},"outputs":{"value":{"cell":"input","port":"value"}}});
    let digest = store.admit(&Manifest::parse(&value).unwrap()).unwrap();
    for cell in [
        json!({"id":"loop","kind":"repeat","manifest":digest,"maxRounds":2,"carry":{"constructor":"value"}}),
        json!({"id":"loop","kind":"repeat","manifest":digest,"maxRounds":2,"carry":{"value":"constructor"}}),
        json!({"id":"loop","kind":"repeat","manifest":digest,"maxRounds":2,"carry":{"constructor":"constructor"}}),
        json!({"id":"loop","kind":"repeat","manifest":digest,"maxRounds":2,"until":{"output":"constructor","equals":"done"}}),
        json!({"id":"loop","kind":"each","manifest":digest,"maxItems":2,"over":"constructor"}),
    ] {
        assert_eq!(
            admitted(
                module("inherited-interface", vec![cell], vec![]),
                &mut store
            )
            .err()
            .unwrap()
            .code,
            "INTERFACE_MISMATCH"
        );
    }
}

#[tokio::test]
async fn declared_constructor_ports_preserve_proto_data_through_replay() {
    let mut store = Store::default();
    let mut sub = module(
        "constructor-child",
        vec![json!({"id":"constructor","kind":"input","outputs":{"constructor":"json"}})],
        vec![],
    )
    .value;
    sub["interface"] = json!({"inputs":{"constructor":{"cell":"constructor","port":"constructor"}},"outputs":{"constructor":{"cell":"constructor","port":"constructor"}}});
    let child = store.admit(&Manifest::parse(&sub).unwrap()).unwrap();
    let data = json!({"__proto__":{"evidence":true},"constructor":"own-data"});
    let mut parent = module("constructor-parent", vec![
        json!({"id":"source","kind":"const","outputs":{"constructor":{"type":"json","value":data}}}),
        json!({"id":"constructor","kind":"organism","manifest":child}),
    ], vec![json!({"from":{"cell":"source","port":"constructor"},"to":{"cell":"constructor","port":"constructor"}})]).value;
    parent["interface"]["outputs"] =
        json!({"constructor":{"cell":"constructor","port":"constructor"}});
    let manifest = Manifest::parse(&parent).unwrap();
    let receipt = runtime::run(
        manifest.clone(),
        json!({}),
        &mut store,
        &mut Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(receipt["outcome"], "complete");
    assert_eq!(
        receipt["cells"]["constructor"]["outputs"]["constructor"],
        data
    );
    assert_eq!(
        runtime::verify(&receipt, manifest, &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
}

#[tokio::test]
async fn conflicting_interface_aliases_use_canonical_names_through_nested_replay() {
    let mut store = Store::default();
    let child = Manifest::parse(&serde_json::from_str::<Value>(r#"{
        "contract":"algal.organism.v1","key":"organism:nested-alias","name":"Nested alias",
        "cells":[{"id":"source","kind":"input","outputs":{"value":"json"}}],"edges":[],
        "interface":{"inputs":{"z":{"cell":"source","port":"value"},"a":{"cell":"source","port":"value"}},"outputs":{"answer":{"cell":"source","port":"value"}}}
    }"#).unwrap()).unwrap();
    assert_eq!(
        algal::graph::interface_args(&child, &json!({"z":"z","a":"a"})).unwrap(),
        json!({"source":{"value":"z"}})
    );
    let child_ref = store.admit(&child).unwrap();
    let parent = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:alias-parent","name":"Alias parent",
        "cells":[
            {"id":"source","kind":"const","outputs":{"z":{"type":"json","value":"z"},"a":{"type":"json","value":"a"}}},
            {"id":"child","kind":"organism","manifest":child_ref}
        ],
        "edges":[{"from":{"cell":"source","port":"z"},"to":{"cell":"child","port":"z"}},{"from":{"cell":"source","port":"a"},"to":{"cell":"child","port":"a"}}],
        "interface":{"inputs":{},"outputs":{"answer":{"cell":"child","port":"answer"}}}
    })).unwrap();
    let receipt = runtime::run(
        parent.clone(),
        json!({}),
        &mut store,
        &mut Host::default(),
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(
        runtime::outputs(&parent, &receipt).unwrap(),
        json!({"answer":"z"})
    );
    assert_eq!(
        runtime::verify(&receipt, parent, &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
}

#[test]
fn pick_preserves_own_proto_data_and_returns_null_for_missing_keys() {
    for field in ["constructor", "toString", "hasOwnProperty", "__proto__"] {
        let (output, _) = registry::invoke("pick.v1", &json!({"record":{},"field":field})).unwrap();
        assert_eq!(output, json!({"value":null}));
    }
    let record = json!({"constructor":"own","__proto__":{"kept":true}});
    for (field, expected) in [
        ("constructor", json!("own")),
        ("__proto__", json!({"kept":true})),
    ] {
        let (output, _) =
            registry::invoke("pick.v1", &json!({"record":record,"field":field})).unwrap();
        assert_eq!(output, json!({"value":expected}));
    }
    for port in ["__proto__", "toString", "hasOwnProperty"] {
        assert!(Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:invalid-port","name":"Invalid port","cells":[{"id":"source","kind":"input","outputs":{(port):"json"}}]})).is_err());
    }
}
