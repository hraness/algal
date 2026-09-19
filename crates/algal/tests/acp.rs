use algal::{
    acp::{Frames, request, send, serve},
    effects::Host,
    store::Store,
};
use serde_json::{Value, json};
use std::{path::PathBuf, time::Duration};
use tokio::io::{BufReader, split};

fn fixture(mode: &str) -> Vec<String> {
    vec![
        "python3".into(),
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/acp_agent.py")
            .to_string_lossy()
            .into_owned(),
        mode.into(),
    ]
}
fn effect() -> Value {
    json!({"contract":"algal.effect.v1","cellId":"work","kind":"agent","prompt":"synthetic task","context":{},"output":{"kind":"text"},"budget":{"maxContextBytes":4096,"maxOutputBytes":4096}})
}

#[tokio::test]
async fn acp_client_is_bounded_and_denies_permissions_without_a_host() {
    let directory = tempfile::tempdir().unwrap();
    let cwd = directory.path().canonicalize().unwrap();
    let (output, _) = request(
        &fixture("normal"),
        &cwd,
        &effect(),
        4096,
        3000,
        Default::default(),
    )
    .await
    .unwrap();
    assert_eq!(output, "fixture-ok");
    let (output, _) = request(
        &fixture("permission"),
        &cwd,
        &effect(),
        4096,
        3000,
        Default::default(),
    )
    .await
    .unwrap();
    assert_eq!(output, "denied");
    let (early, _) = request(
        &fixture("early"),
        &cwd,
        &effect(),
        4096,
        3000,
        Default::default(),
    )
    .await
    .unwrap();
    assert_eq!(early, "fixture-ok");
    for mode in ["foreign", "early-foreign", "version", "eof"] {
        assert!(
            request(
                &fixture(mode),
                &cwd,
                &effect(),
                4096,
                3000,
                Default::default()
            )
            .await
            .is_err()
        );
    }
    assert!(
        request(
            &fixture("hang"),
            &cwd,
            &effect(),
            4096,
            100,
            Default::default()
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn server_negotiates_runs_and_loads_a_persisted_session() {
    let directory = tempfile::tempdir().unwrap();
    let cwd = directory.path().canonicalize().unwrap();
    let state = cwd.join("state");
    let (client, server) = tokio::io::duplex(131072);
    let (read, write) = split(server);
    let host = Host::scripted(json!({"work":"hello from ALGAL"}));
    let server = tokio::spawn(serve(read, write, host, state.clone(), cwd.clone()));
    let (read, mut write) = split(client);
    let mut frames = Frames::new(BufReader::new(read));
    send(&mut write,&json!({"jsonrpc":"2.0","id":0,"method":"session/new","params":{"cwd":cwd,"mcpServers":[]}})).await.unwrap();
    assert!(frames.next().await.unwrap().unwrap().get("error").is_some());
    send(&mut write,&json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":1,"clientCapabilities":{}}})).await.unwrap();
    assert_eq!(
        frames.next().await.unwrap().unwrap()["result"]["protocolVersion"],
        1
    );
    send(&mut write,&json!({"jsonrpc":"2.0","id":2,"method":"session/new","params":{"cwd":cwd,"mcpServers":[]}})).await.unwrap();
    let session = frames.next().await.unwrap().unwrap()["result"]["sessionId"]
        .as_str()
        .unwrap()
        .to_owned();
    send(&mut write,&json!({"jsonrpc":"2.0","id":3,"method":"session/prompt","params":{"sessionId":session,"prompt":[{"type":"text","text":"remember the task"}]}})).await.unwrap();
    let update = frames.next().await.unwrap().unwrap();
    assert_eq!(
        update["params"]["update"]["content"]["text"],
        "hello from ALGAL"
    );
    let result = frames.next().await.unwrap().unwrap();
    assert_eq!(result["result"]["stopReason"], "end_turn");
    let reference = result["result"]["_meta"]["algal"]["receiptRef"]
        .as_str()
        .unwrap();
    assert!(
        Store::open(&state, false)
            .unwrap()
            .get("runs", reference)
            .unwrap()
            .is_some()
    );
    send(&mut write,&json!({"jsonrpc":"2.0","id":4,"method":"session/load","params":{"sessionId":session,"cwd":cwd,"mcpServers":[]}})).await.unwrap();
    assert_eq!(
        frames.next().await.unwrap().unwrap()["params"]["update"]["sessionUpdate"],
        "user_message_chunk"
    );
    assert_eq!(
        frames.next().await.unwrap().unwrap()["params"]["update"]["sessionUpdate"],
        "agent_message_chunk"
    );
    assert_eq!(frames.next().await.unwrap().unwrap()["id"], 4);
    drop(write);
    drop(frames);
    tokio::time::timeout(Duration::from_secs(2), server)
        .await
        .unwrap()
        .unwrap()
        .unwrap();
}

#[tokio::test]
async fn delegated_permissions_reach_the_client_instead_of_being_auto_approved() {
    let directory = tempfile::tempdir().unwrap();
    let cwd = directory.path().canonicalize().unwrap();
    let host = Host::from_config(&json!({"contract":"algal.host.v1","executors":{"coding":{"kind":"acp","argv":fixture("permission"),"cwd":cwd}}})).unwrap();
    let (client, server) = tokio::io::duplex(131072);
    let (read, write) = split(server);
    let server = tokio::spawn(serve(read, write, host, cwd.join("state"), cwd.clone()));
    let (read, mut write) = split(client);
    let mut frames = Frames::new(BufReader::new(read));
    send(&mut write,&json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":1,"clientCapabilities":{}}})).await.unwrap();
    frames.next().await.unwrap();
    send(&mut write,&json!({"jsonrpc":"2.0","id":2,"method":"session/new","params":{"cwd":cwd,"mcpServers":[]}})).await.unwrap();
    let session = frames.next().await.unwrap().unwrap()["result"]["sessionId"].clone();
    send(&mut write,&json!({"jsonrpc":"2.0","id":3,"method":"session/prompt","params":{"sessionId":session,"prompt":[{"type":"text","text":"bounded test"}]}})).await.unwrap();
    let mut requested = false;
    loop {
        let message = tokio::time::timeout(Duration::from_secs(5), frames.next())
            .await
            .unwrap()
            .unwrap()
            .unwrap();
        if message["method"] == "session/request_permission" {
            requested = true;
            assert_eq!(message["params"]["sessionId"], session);
            send(&mut write,&json!({"jsonrpc":"2.0","id":message["id"],"result":{"outcome":{"outcome":"selected","optionId":"allow"}}})).await.unwrap();
        }
        if message["id"] == 3 {
            assert_eq!(message["result"]["stopReason"], "end_turn");
            break;
        }
    }
    assert!(requested);
    drop(write);
    drop(frames);
    tokio::time::timeout(Duration::from_secs(2), server)
        .await
        .unwrap()
        .unwrap()
        .unwrap();
}

#[tokio::test]
async fn lost_acp_prompt_acknowledgement_leaves_journal_unsettled() {
    use algal::{canonical::digest, effects::Backend, journal::Journal};
    use std::sync::{Arc, Mutex};
    let directory = tempfile::tempdir().unwrap();
    let cwd = directory.path().canonicalize().unwrap();
    let journal = Arc::new(Mutex::new(
        Journal::create(
            &cwd,
            "actor",
            &digest(&json!("intent")).unwrap(),
            &digest(&json!("manifest")).unwrap(),
            2,
        )
        .unwrap(),
    ));
    let mut host = Host::default();
    host.journal = Some(journal.clone());
    host.entries.push((
        "acp".into(),
        Backend::Acp {
            argv: fixture("eof"),
            cwd,
        },
    ));
    let error = host.effect(&effect(), 3000, None).await.unwrap_err();
    assert!(error.uncertain);
    let journal = journal.lock().unwrap();
    assert!(journal.finish().is_err());
    assert_eq!(
        journal.describe().unwrap()["effects"][0]["record"]["state"],
        "started"
    );
    let serialized = serde_json::to_value(&error).unwrap();
    assert!(
        serialized.get("uncertain").is_none(),
        "uncertainty is host state, not a receipt field"
    );
}
