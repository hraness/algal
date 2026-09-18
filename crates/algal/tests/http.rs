use algal::{
    canonical::canonical,
    effects::{Backend, Host, ResponseFormat},
};
use serde_json::{Value, json};
use std::{
    io::{Read, Write},
    net::TcpListener,
    thread,
};

fn effect() -> Value {
    json!({"contract":"algal.effect.v1","cellId":"route","kind":"classifier","prompt":"Choose yes","context":{},"output":{"kind":"choice","labels":["yes","no"]},"budget":{"maxContextBytes":4096,"maxOutputBytes":4096}})
}

fn server(status: &str, body: String, headers: &str) -> (String, thread::JoinHandle<String>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let status = status.to_owned();
    let headers = headers.to_owned();
    let task = thread::spawn(move || {
        let (mut socket, _) = listener.accept().unwrap();
        socket
            .set_read_timeout(Some(std::time::Duration::from_secs(5)))
            .unwrap();
        let mut data = Vec::new();
        let mut chunk = [0u8; 4096];
        loop {
            let n = socket.read(&mut chunk).unwrap();
            if n == 0 {
                break;
            }
            data.extend_from_slice(&chunk[..n]);
            assert!(data.len() <= 65536);
            if let Some(end) = data.windows(4).position(|v| v == b"\r\n\r\n") {
                let header = String::from_utf8_lossy(&data[..end]).to_lowercase();
                let length: usize = header
                    .lines()
                    .find_map(|line| {
                        line.strip_prefix("content-length: ")
                            .and_then(|n| n.parse().ok())
                    })
                    .unwrap();
                if data.len() >= end + 4 + length {
                    break;
                }
            }
        }
        let response = format!(
            "HTTP/1.1 {status}\r\ncontent-type: application/json\r\ncontent-length: {}\r\n{headers}connection: close\r\n\r\n{body}",
            body.len()
        );
        socket.write_all(response.as_bytes()).unwrap();
        String::from_utf8(data).unwrap()
    });
    (format!("http://{address}/v1"), task)
}

#[tokio::test]
async fn openai_compatible_provider_uses_bound_configuration_and_records_usage() {
    let response = json!({"model":"fixture-model","choices":[{"finish_reason":"stop","message":{"content":"{\"value\":\"yes\"}"}}],"usage":{"prompt_tokens":12,"completion_tokens":3}});
    let (url, server) = server("200 OK", canonical(&response).unwrap(), "");
    let backend = Backend::Openai {
        base_url: url,
        model: "fixture-model".into(),
        credential_env: None,
        response_format: ResponseFormat::JsonSchema,
        timeout_ms: 5000,
        max_response_bytes: 8192,
    };
    let mut host = Host::default();
    host.entries.push(("fixture".into(), backend));
    let receipt = host.effect(&effect(), 5000, None).await.unwrap();
    assert_eq!(receipt["output"], "yes");
    assert_eq!(receipt["usage"]["tokensIn"], 12);
    assert_eq!(receipt["usage"]["tokensOut"], 3);
    let request = server.join().unwrap();
    assert!(request.starts_with("POST /v1/chat/completions "));
    assert!(!request.to_lowercase().contains("authorization:"));
    let body: Value = serde_json::from_str(request.split_once("\r\n\r\n").unwrap().1).unwrap();
    assert_eq!(body["response_format"]["type"], "json_schema");
}

#[tokio::test]
async fn redirects_oversized_bodies_and_upstream_errors_fail_without_leaking_content() {
    for (status, body, headers, max) in [
        (
            "302 Found",
            "do-not-log".into(),
            "location: https://example.com/redirect\r\n",
            8192,
        ),
        ("401 Unauthorized", "do-not-log".into(), "", 8192),
        ("200 OK", "x".repeat(1000), "", 32),
    ] {
        let (url, server) = server(status, body, headers);
        let backend = Backend::Openai {
            base_url: url,
            model: "fixture-model".into(),
            credential_env: None,
            response_format: ResponseFormat::JsonObject,
            timeout_ms: 5000,
            max_response_bytes: max,
        };
        let mut host = Host::default();
        host.entries.push(("fixture".into(), backend));
        let receipt = host.effect(&effect(), 5000, None).await.unwrap();
        assert!(receipt.get("error").is_some());
        assert!(!canonical(&receipt).unwrap().contains("do-not-log"));
        server.join().unwrap();
    }
}
