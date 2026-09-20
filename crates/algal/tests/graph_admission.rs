use algal::{
    contract::Manifest,
    graph::{Transports, compile},
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
