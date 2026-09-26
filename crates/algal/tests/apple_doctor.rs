//! `algal doctor --apple` through the real binary against owned fake
//! helpers. Nothing here builds the real helper, runs a compiler, or opens
//! the command line tools installer.
#![cfg(target_os = "macos")]

use serde_json::Value;
use std::{
    fs,
    io::Read as _,
    os::unix::fs::PermissionsExt,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

fn fake_helper(dir: &Path, check: &str) -> PathBuf {
    let path = dir.join("fake-apple");
    fs::write(
        &path,
        format!("#!/bin/sh\n[ \"$1\" = --check ] && printf '%s\\n' '{check}'\nexit 0\n"),
    )
    .unwrap();
    fs::set_permissions(&path, fs::Permissions::from_mode(0o700)).unwrap();
    path
}

fn algal(dir: &Path) -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_algal"));
    command
        .env_clear()
        .env("PATH", "/usr/bin:/bin")
        .env("HOME", dir)
        .env("LANG", "en_US.UTF-8")
        .stdin(Stdio::null());
    command
}

const OFF: &str = r#"{"available":false,"reason":"appleIntelligenceNotEnabled"}"#;

#[test]
fn doctor_help_exits_zero() {
    let dir = tempfile::tempdir().unwrap();
    let output = algal(dir.path())
        .args(["doctor", "--help"])
        .output()
        .unwrap();
    assert!(output.status.success());
    let help = String::from_utf8(output.stdout).unwrap();
    assert!(
        help.contains("--apple") && help.contains("--json"),
        "{help}"
    );
}

#[test]
fn doctor_pipes_json_with_the_reason() {
    let dir = tempfile::tempdir().unwrap();
    let helper = fake_helper(dir.path(), OFF);
    let output = algal(dir.path())
        .args(["doctor", "--apple", "--apple-bridge"])
        .arg(&helper)
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(1), "unavailable exits 1");
    let report: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(report["available"], false);
    assert_eq!(report["reason"], "appleIntelligenceNotEnabled");
    assert_eq!(
        report["settingsUrl"],
        "x-apple.systempreferences:com.apple.Siri-Settings.extension"
    );
    assert_eq!(report["message"], "Apple Intelligence is off.");
    assert!(output.stderr.is_empty());

    let ready = fake_helper(dir.path(), r#"{"available":true}"#);
    let output = algal(dir.path())
        .args(["doctor", "--apple", "--json", "--apple-bridge"])
        .arg(&ready)
        .output()
        .unwrap();
    assert!(output.status.success());
    let report: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(report["available"], true);
    assert_eq!(report["reason"], Value::Null);
}

#[test]
fn doctor_reports_a_missing_helper_in_plain_words() {
    let dir = tempfile::tempdir().unwrap();
    let output = algal(dir.path())
        .args(["doctor", "--apple"])
        .env("ALGAL_APPLE_BRIDGE", dir.path().join("nowhere"))
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(1));
    let report: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(report["reason"], "helperMissing");
    assert!(
        report["fix"]
            .as_str()
            .unwrap()
            .contains("ALGAL_APPLE_BRIDGE"),
        "{report}"
    );
}

#[test]
fn doctor_json_for_agents_and_no_color_anywhere() {
    let dir = tempfile::tempdir().unwrap();
    let helper = fake_helper(dir.path(), OFF);
    for (key, value) in [("CLAUDECODE", "1"), ("NO_COLOR", "1"), ("TERM", "dumb")] {
        let output = algal(dir.path())
            .args(["doctor", "--apple", "--apple-bridge"])
            .arg(&helper)
            .env(key, value)
            .output()
            .unwrap();
        let stdout = String::from_utf8(output.stdout).unwrap();
        assert!(!stdout.contains('\x1b'), "{key}: {stdout}");
        let report: Value = serde_json::from_str(&stdout).unwrap();
        assert_eq!(report["reason"], "appleIntelligenceNotEnabled", "{key}");
    }
}

#[test]
fn doctor_survives_a_closed_pipe() {
    let dir = tempfile::tempdir().unwrap();
    let helper = fake_helper(dir.path(), OFF);
    // The text report; JSON keeps println!, so a vanished reader can't turn
    // a failed command into a success.
    let mut child = algal(dir.path())
        .args(["doctor", "--apple", "--apple-bridge"])
        .arg(&helper)
        .env("HRANESS_AUDIENCE", "human")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    drop(child.stdout.take());
    let mut stderr = String::new();
    child
        .stderr
        .take()
        .unwrap()
        .read_to_string(&mut stderr)
        .unwrap();
    child.wait().unwrap();
    assert!(!stderr.contains("panicked"), "{stderr}");
}

#[tokio::test]
async fn effect_explains_an_unusable_model_instead_of_a_code() {
    use algal::{
        contract::Manifest,
        effects::{Backend, Host},
        graph::Transports,
        process::ProcessService,
    };
    use serde_json::json;
    let dir = tempfile::tempdir().unwrap();
    let helper = dir.path().join("off-apple");
    fs::write(
        &helper,
        "#!/bin/sh\nid=0\nwhile IFS= read -r request; do\nid=$((id + 1))\n\
         printf '{\"id\":%s,\"ok\":false,\"error\":{\"code\":\"modelUnavailable\",\"reason\":\"appleIntelligenceNotEnabled\"}}\\n' \"$id\"\ndone\n",
    )
    .unwrap();
    fs::set_permissions(&helper, fs::Permissions::from_mode(0o700)).unwrap();
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1",
        "key":"organism:apple-off",
        "name":"Apple off fixture",
        "cells":[{
            "id":"worker","kind":"agent","prompt":"Return one word.",
            "output":{"kind":"text"},"budget":{"maxEffectMs":10_000}
        }],
        "edges":[]
    }))
    .unwrap();
    let mut host = Host::default();
    host.entries
        .push(("apple".into(), Backend::Apple { bridge: helper }));
    let mut service = ProcessService::open(&dir.path().join("store")).unwrap();
    service
        .create("off", manifest, json!({}), 1, &host, &Transports::new())
        .unwrap();
    let failed = service
        .tick_journal("off", None, &mut host, &Transports::new(), true, 1)
        .await
        .unwrap();
    assert_eq!(failed.process.status, "failed");
    let journal = service.journal("off").unwrap();
    let error = &journal["effects"][0]["record"]["receipt"]["error"];
    assert_eq!(error["code"], "EFFECT_UNBOUND");
    assert_eq!(
        error["message"],
        "Apple Intelligence is off. Turn it on in System Settings › Apple Intelligence & Siri, then try again."
    );
}

#[test]
fn doctor_text_for_a_person_says_why_and_one_step() {
    let dir = tempfile::tempdir().unwrap();
    let helper = fake_helper(dir.path(), OFF);
    let output = algal(dir.path())
        .args(["doctor", "--apple", "--apple-bridge"])
        .arg(&helper)
        .env("HRANESS_AUDIENCE", "human")
        .env("NO_COLOR", "1")
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(1));
    let text = String::from_utf8(output.stdout).unwrap();
    assert_eq!(
        text,
        format!(
            "⚠ Apple Intelligence is off.\n  Turn it on in System Settings › Apple Intelligence & Siri, then try again.\n  Helper: {}\n→ open x-apple.systempreferences:com.apple.Siri-Settings.extension\n",
            helper.display()
        )
    );
}
