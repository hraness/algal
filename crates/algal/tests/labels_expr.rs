use algal::{
    canonical::canonical, contract::Manifest, effects::Host, graph::Transports, runtime,
    store::Store,
};
use serde_json::{Value, json};

fn transports() -> Transports {
    Transports::new()
}

fn labels_expr() -> Value {
    json!({
        "contract": "algal.expr.v1",
        "program": ["get", "spec", "labels"]
    })
}

fn manifest(output: Value) -> Manifest {
    Manifest::parse(&json!({
        "contract": "algal.organism.v1",
        "key": "organism:labels-expr",
        "name": "LabelsExpr",
        "cells": [
            {"id": "src", "kind": "input", "outputs": {"spec": "json", "record": "json"}},
            {"id": "cls", "kind": "classifier",
             "inputs": {"spec": "json", "record": "json"},
             "prompt": "classify", "output": output}
        ],
        "edges": [
            {"from": {"cell": "src", "port": "spec"}, "to": {"cell": "cls", "port": "spec"}},
            {"from": {"cell": "src", "port": "record"}, "to": {"cell": "cls", "port": "record"}}
        ]
    }))
    .unwrap()
}

fn args(spec: Value) -> Value {
    json!({"src": {"spec": spec, "record": {"text": "t"}}})
}

#[test]
fn labels_expr_admitted_and_mutually_exclusive_with_labels() {
    let m = manifest(json!({"kind": "choice", "labelsExpr": labels_expr()}));
    assert_eq!(
        m.value["cells"][1]["output"]["labelsExpr"]["contract"],
        "algal.expr.v1"
    );
    // labels + labelsExpr together are rejected
    assert!(
        Manifest::parse(&json!({
            "contract": "algal.organism.v1", "key": "organism:le-bad", "name": "Bad",
            "cells": [
                {"id": "src", "kind": "input", "outputs": {"spec": "json"}},
                {"id": "cls", "kind": "classifier", "inputs": {"spec": "json"},
                 "prompt": "p",
                 "output": {"kind": "choice", "labels": ["a"], "labelsExpr": labels_expr()}}
            ],
            "edges": [{"from": {"cell": "src", "port": "spec"}, "to": {"cell": "cls", "port": "spec"}}]
        }))
        .is_err()
    );
    // a program naming an undeclared input port fails admission
    assert!(
        Manifest::parse(&json!({
            "contract": "algal.organism.v1", "key": "organism:le-ghost", "name": "Ghost",
            "cells": [
                {"id": "src", "kind": "input", "outputs": {"spec": "json"}},
                {"id": "cls", "kind": "classifier", "inputs": {"spec": "json"},
                 "prompt": "p",
                 "output": {"kind": "choice",
                     "labelsExpr": {"contract": "algal.expr.v1", "program": ["get", "ghost"]}}}
            ],
            "edges": [{"from": {"cell": "src", "port": "spec"}, "to": {"cell": "cls", "port": "spec"}}]
        }))
        .is_err()
    );
}

#[tokio::test]
async fn resolves_labels_into_the_request_and_replays_verified() {
    let m = manifest(json!({"kind": "choice", "labelsExpr": labels_expr()}));
    let mut store = Store::default();
    let receipt = runtime::run(
        m.clone(),
        args(json!({"labels": ["bug", "feat"]})),
        &mut store,
        &mut Host::scripted(json!({"cls": "bug"})),
        &transports(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(
        receipt["outcome"],
        "complete",
        "{}",
        canonical(&receipt).unwrap()
    );
    assert_eq!(receipt["cells"]["cls"]["outputs"]["out"], "bug");
    let verified = runtime::verify(&receipt, m, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
}

#[tokio::test]
async fn dynamic_on_miss_validated_and_bad_result_rejected() {
    // onMiss in the resolved set absorbs undeclared executor output
    let ok = runtime::run(
        manifest(json!({"kind": "choice", "labelsExpr": labels_expr(), "onMiss": "bug"})),
        args(json!({"labels": ["bug", "feat"]})),
        &mut Store::default(),
        &mut Host::scripted(json!({"cls": "not-a-label"})),
        &transports(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(ok["cells"]["cls"]["outputs"]["out"], "bug");
    // onMiss outside the resolved set fails before any effect is issued
    let bad = runtime::run(
        manifest(json!({"kind": "choice", "labelsExpr": labels_expr(), "onMiss": "ghost"})),
        args(json!({"labels": ["bug", "feat"]})),
        &mut Store::default(),
        &mut Host::scripted(json!({"cls": "bug"})),
        &transports(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(bad["outcome"], "failed");
    assert_eq!(bad["failure"]["code"], "EXPR_FAILED");
    // a duplicate/empty/non-list resolved value fails closed
    for spec in [
        json!({"labels": ["a", "a"]}),
        json!({"labels": []}),
        json!({"labels": "bug"}),
    ] {
        let receipt = runtime::run(
            manifest(json!({"kind": "choice", "labelsExpr": labels_expr()})),
            args(spec.clone()),
            &mut Store::default(),
            &mut Host::scripted(json!({"cls": "bug"})),
            &transports(),
            None,
        )
        .await
        .unwrap();
        assert_eq!(receipt["outcome"], "failed", "{spec}");
        assert_eq!(receipt["failure"]["code"], "EXPR_FAILED", "{spec}");
    }
}
