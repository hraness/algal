//! Golden-style checks for the native CLI's help, version, errors, and doctor
//! output. Every child runs with a fixed environment so the terminal and
//! audience rules are deterministic.

use serde_json::Value;
use std::process::{Command, Output, Stdio};

fn algal(args: &[&str], env: &[(&str, &str)]) -> Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_algal"));
    command
        .args(args)
        .env_clear()
        .env("PATH", std::env::var("PATH").unwrap_or_default())
        .env("LANG", "en_US.UTF-8")
        .stdin(Stdio::null());
    for (key, value) in env {
        command.env(key, value);
    }
    command.output().unwrap()
}

fn text(bytes: &[u8]) -> String {
    String::from_utf8(bytes.to_vec()).unwrap()
}

const HUMAN: [(&str, &str); 1] = [("HRANESS_AUDIENCE", "human")];

#[test]
fn root_help_leads_with_first_run_commands_and_hides_research_ones() {
    let output = algal(&["--help"], &[]);
    assert!(output.status.success());
    let help = text(&output.stdout);
    assert!(help.starts_with(
        "ALGAL is a programming language and VM for AI agent programs that wait for approval and leave receipts you can replay.\n"
    ));
    let commands: Vec<&str> = help
        .lines()
        .skip_while(|line| *line != "Commands:")
        .skip(1)
        .take(4)
        .map(|line| line.split_whitespace().next().unwrap_or(""))
        .collect();
    assert_eq!(commands, ["demo", "doctor", "run", "check"]);
    for hidden in ["civ", "civ-verify", "bench", "foundry", "acp"] {
        assert!(
            !help
                .lines()
                .any(|line| line.trim_start().starts_with(&format!("{hidden} "))),
            "{hidden} should be hidden from root help"
        );
    }
    assert!(help.contains("More commands: algal help advanced"));
}

#[test]
fn help_advanced_lists_hidden_commands_within_80_columns() {
    let output = algal(&["help", "advanced"], &[]);
    assert!(output.status.success());
    let help = text(&output.stdout);
    for name in [
        "civ",
        "civ-verify",
        "bench",
        "foundry",
        "ordering",
        "application",
        "agent",
        "acp",
    ] {
        assert!(help.contains(&format!("  {name} ")), "{name} missing");
    }
    assert!(
        help.lines().all(|line| line.chars().count() <= 80),
        "{help}"
    );
}

#[test]
fn hidden_commands_keep_their_own_help() {
    let output = algal(&["civ", "--help"], &[]);
    assert!(output.status.success());
    assert!(text(&output.stdout).contains("Usage: algal civ"));
}

#[test]
fn version_prints_name_and_version() {
    for flag in ["--version", "-V"] {
        let output = algal(&[flag], &[]);
        assert!(output.status.success());
        assert_eq!(
            text(&output.stdout),
            format!("algal {}\n", env!("CARGO_PKG_VERSION"))
        );
    }
}

#[test]
fn errors_are_two_lines_for_a_person_and_json_otherwise() {
    let human = algal(&["run", "missing.json"], &HUMAN);
    assert_eq!(human.status.code(), Some(2));
    assert_eq!(
        text(&human.stderr),
        "✗ missing.json: file not found.\n→ algal run --help\n"
    );
    assert!(human.stdout.is_empty());

    let dumb = algal(
        &["run", "missing.json"],
        &[("HRANESS_AUDIENCE", "human"), ("TERM", "dumb")],
    );
    assert_eq!(
        text(&dumb.stderr),
        "FAIL missing.json: file not found.\n-> algal run --help\n"
    );

    let global = algal(
        &["--dir", "/nonexistent-algal-store", "run", "missing.json"],
        &HUMAN,
    );
    assert!(
        text(&global.stderr).ends_with("→ algal run --help\n"),
        "{}",
        text(&global.stderr)
    );

    let debug = algal(
        &["run", "missing.json"],
        &[("HRANESS_AUDIENCE", "human"), ("HRANESS_DEBUG", "1")],
    );
    assert!(text(&debug.stderr).ends_with("  code: IO_FAILED\n"));

    for env in [
        &[][..],
        &[("CLAUDECODE", "1")][..],
        &[("HRANESS_AUDIENCE", "human")][..],
    ] {
        let args: &[&str] = if env == HUMAN.as_slice() {
            &["run", "missing.json", "--json"]
        } else {
            &["run", "missing.json"]
        };
        let output = algal(args, env);
        if env == HUMAN.as_slice() {
            // `--json` is not a `run` flag, so clap rejects it before running.
            assert_eq!(output.status.code(), Some(2));
            continue;
        }
        assert_eq!(output.status.code(), Some(2));
        let report: Value = serde_json::from_slice(&output.stderr).unwrap();
        assert_eq!(report["ok"], false);
        assert_eq!(report["error"]["code"], "IO_FAILED");
    }
}

#[test]
fn doctor_prints_sentences_for_a_person_and_json_for_scripts() {
    let human = algal(&["doctor"], &HUMAN);
    assert!(human.status.success());
    let stdout = text(&human.stdout);
    assert!(
        stdout.starts_with(&format!(
            "✓ ALGAL {} is ready (native, ",
            env!("CARGO_PKG_VERSION")
        )),
        "{stdout}"
    );
    assert!(stdout.contains("– Jev decisions: not checked."));
    assert_eq!(text(&human.stderr), "Next: algal demo start ./my-review\n");

    let piped = algal(&["doctor"], &[]);
    let report: Value = serde_json::from_slice(&piped.stdout).unwrap();
    assert_eq!(report["runtime"], "algal");
    assert_eq!(report["native"], true);

    let json = algal(&["doctor", "--json"], &HUMAN);
    let report: Value = serde_json::from_slice(&json.stdout).unwrap();
    assert_eq!(report["wireContract"], "algal.organism.v1");
}

#[test]
fn jev_doctor_without_a_key_names_the_setup_command() {
    // An empty PATH means no `security` or `secret-tool`, so the lookup never
    // touches the real keychain; ALGAL_HOME points the file store at a temp dir.
    let home = tempfile::tempdir().unwrap();
    let home_path = home.path().to_str().unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_algal"))
        .args(["doctor", "--jev"])
        .env_clear()
        .env("PATH", home_path)
        .env("HOME", home_path)
        .env("ALGAL_HOME", home_path)
        .env("LANG", "en_US.UTF-8")
        .env("HRANESS_AUDIENCE", "human")
        .stdin(Stdio::null())
        .output()
        .unwrap();
    let stdout = text(&output.stdout);
    assert_eq!(output.status.code(), Some(1), "{stdout}");
    assert_eq!(
        stdout,
        "⚠ Jev isn't set up. Save a key, or set TYPESAFE_API_KEY.\n\n1 warning.\n→ algal auth jev\n"
    );
}

#[test]
fn closed_pipe_exits_quietly() {
    let mut child = Command::new(env!("CARGO_BIN_EXE_algal"))
        .args(["help", "advanced"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    drop(child.stdout.take());
    let output = child.wait_with_output().unwrap();
    assert!(!text(&output.stderr).contains("panicked"));
}
