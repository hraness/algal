use algal::{
    agent_context::{AgentContextEntryInput, AgentContextHost, put_agent_context},
    store::Store,
};
use serde_json::{Value, json};

#[test]
fn context_sources_scopes_and_results_match_typescript_fixture() {
    let fixture: Value =
        serde_json::from_str(include_str!("../../../scripts/fixtures/agent-context.json")).unwrap();
    let entries: Vec<AgentContextEntryInput> =
        serde_json::from_value(fixture["entries"].clone()).unwrap();
    let mut store = Store::default();
    let snapshot = put_agent_context(&mut store, &entries).unwrap();
    let mut host = AgentContextHost::new(&store);
    let reference = host
        .grant(&snapshot, Some(&[0, 2]), Some(&fixture["limits"]))
        .unwrap();
    let child = host
        .delegate(&reference, &[2], Some(&json!({"maxReadBytes":8})))
        .unwrap();
    let actual = json!({
        "snapshot":snapshot,
        "ref":reference,
        "child":child,
        "inspect":host.inspect(&reference).unwrap(),
        "read":host.read(&reference,0).unwrap(),
        "slice":host.slice(&child,2,0,6).unwrap(),
        "search":host.search(&child,&json!({"query":"needle"})).unwrap(),
    });
    assert_eq!(actual, fixture["expected"]);
}
