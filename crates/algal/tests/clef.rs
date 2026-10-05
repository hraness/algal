use algal::{clef, effects::Backend};
use serde_json::{Value, json};

fn image() -> Value {
    json!({"content_type":"image/png","base64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII="})
}
fn questions() -> Value {
    json!({"keep":{"type":"noul","instructions":"Keep this?"},"label":{"type":"choice","instructions":"Choose","criteria":{"yes":null,"no":null}},"rate":{"type":"score","instructions":"Rate","criteria":["low","high"]}})
}
fn envelope() -> Value {
    json!({"success":true,"errors":[],"messages":[],"result":{"model":"clef","answers":{"keep":{"type":"noul","noul":0.8},"label":{"type":"choice","choice":"yes","confidence":0.9,"probabilities":{"yes":0.9,"no":0.1}},"rate":{"type":"score","score":0.7,"confidence":0.7,"probabilities":{"0":0.3,"1":0.7},"legend":{"0":"low","1":"high"}}},"usage":{"input_tokens":12,"output_tokens":0}}})
}

#[test]
fn captured_cloudflare_contract_preserves_images_and_legends() {
    let account = "a".repeat(32);
    assert_eq!(
        clef::endpoint(&account, "clef").unwrap(),
        format!(
            "https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/@cf/cloudflare/clef"
        )
    );
    assert!(clef::endpoint("../other", "clef").is_err());
    assert!(clef::endpoint(&account, "jev").is_err());
    let images = json!([image()]);
    let body = clef::request(
        "clef",
        &json!({"text":"state"}),
        &questions(),
        Some(&images),
    )
    .unwrap();
    assert_eq!(
        body,
        json!({"model":"clef","state":{"text":"state"},"questions":questions(),"images":images})
    );
    let (out, meta) = clef::response(&envelope(), "clef", &questions()).unwrap();
    assert_eq!(
        out["answers"]["rate"]["legend"],
        json!({"0":"low","1":"high"})
    );
    assert_eq!(
        meta,
        json!({"usage":{"model":"clef","tokensIn":12,"tokensOut":0}})
    );
}

#[test]
fn mismatched_or_invalid_responses_are_private_errors() {
    for (path, value) in [
        ("/success", json!(false)),
        ("/result/model", json!("clef-flash")),
        ("/result/usage/input_tokens", json!(-1)),
        ("/result/answers/keep/noul", json!(2)),
        ("/result/answers/label/confidence", json!(-0.1)),
        ("/result/answers/label/choice", json!("other")),
        ("/result/answers/label/probabilities/yes", json!(0.8)),
        ("/result/answers/rate/legend/0", json!("PRIVATE")),
        ("/result/answers/rate/score", json!(1.8)),
    ] {
        let mut bad = envelope();
        *bad.pointer_mut(path).unwrap() = value;
        let error = clef::response(&bad, "clef", &questions()).unwrap_err();
        assert_eq!(error.code, "EFFECT_UNPARSEABLE");
        assert!(!error.message.contains("PRIVATE"));
    }
    let mut extra = envelope();
    extra["result"]["answers"]["extra"] = json!({"type":"noul","noul":0.5});
    assert!(clef::response(&extra, "clef", &questions()).is_err());
    assert!(clef::response(&envelope()["result"], "clef", &questions()).is_err());
}

#[test]
fn preflight_rejects_unsafe_images_and_question_variants() {
    for images in [
        json!(["https://example.com/a.png"]),
        json!([{ "content_type":"image/svg+xml","base64":"AAAA" }]),
        json!([{ "content_type":"image/png","base64":"broken" }]),
        json!([image(), image(), image(), image(), image()]),
    ] {
        assert!(clef::request("clef", &json!({}), &questions(), Some(&images)).is_err());
    }
    let url = format!(
        "data:image/png;base64,{}",
        image()["base64"].as_str().unwrap()
    );
    assert!(clef::check_images(&json!([url])).is_ok());
    assert!(
        clef::request(
            "clef",
            &json!({}),
            &json!({"bad id":{"type":"noul","instructions":"q"}}),
            None
        )
        .is_err()
    );
    assert!(
        clef::request(
            "clef",
            &json!({}),
            &json!({"q":{"type":"choice","instructions":"q","criteria":{"one":null}}}),
            None
        )
        .is_err()
    );
    let name = "a".repeat(100);
    assert!(
        clef::request(
            "clef",
            &json!({}),
            &json!({name:{"type":"noul","instructions":"q"}}),
            None
        )
        .is_ok()
    );
    let effect = json!({"kind":"decide","prompt":"Evaluate","context":{},"questions":questions(),"images":[image()]});
    assert_eq!(
        clef::prepare("clef", &effect, None).unwrap().0["images"],
        effect["images"]
    );
    assert!(clef::prepare("clef", &json!({"kind":"gate"}), None).is_err());
}

#[test]
fn canonical_backend_is_explicit_and_does_not_accept_old_credentials() {
    let backend: Backend =
        serde_json::from_value(json!({"kind":"clef","accountId":"a".repeat(32)})).unwrap();
    backend.validate().unwrap();
    assert!(backend.supports("classifier"));
    assert!(backend.supports("decide"));
    assert!(!backend.supports("agent"));
    assert!(!backend.supports("gate"));
    assert_eq!(clef::executor_id("clef"), "clef");
    assert_eq!(clef::executor_id("clef-flash"), "clef:clef-flash");
    assert!(
        serde_json::from_value::<Backend>(
            json!({"kind":"clef","accountId":"a".repeat(32),"credentialEnv":"TYPESAFE_API_KEY"})
        )
        .is_err()
    );
    assert!(algal::credentials::store("clef", "fake-test-token").is_err());
    assert_eq!(
        algal::credentials::spec("clef").unwrap().env,
        "CLOUDFLARE_API_TOKEN"
    );
}

#[test]
fn inline_clef_images_share_the_unchanged_one_mib_host_limit() {
    let mut config = json!({"contract":"algal.host.v1","executors":{"judge":{"kind":"clef","accountId":"a".repeat(32),"images":[image()]}}});
    let host = algal::effects::Host::from_config(&config).unwrap();
    assert!(host.entries[0].1.supports("decide"));
    config["executors"]["judge"]["images"][0]["base64"] = json!("A".repeat(1_048_576));
    let error = match algal::effects::Host::from_config(&config) {
        Ok(_) => panic!("oversized host accepted"),
        Err(error) => error,
    };
    assert_eq!(error.message, "host config bytes");
}

#[test]
fn cli_configuration_checks_do_not_contact_either_provider() {
    let run = |args: &[&str], env: &[(&str, &str)]| {
        let mut command = std::process::Command::new(env!("CARGO_BIN_EXE_algal"));
        command
            .arg("--no-update")
            .args(args)
            .env_clear()
            .stdin(std::process::Stdio::null());
        for (key, value) in env {
            command.env(key, value);
        }
        command.output().unwrap()
    };
    let help = run(&["run", "--help"], &[]);
    let text = String::from_utf8(help.stdout).unwrap();
    assert!(text.contains("--clef"));
    assert!(text.contains("--images"));
    let status = run(
        &["auth", "clef", "--status"],
        &[("TYPESAFE_API_KEY", "fake-legacy-token")],
    );
    assert_eq!(
        serde_json::from_slice::<Value>(&status.stdout).unwrap(),
        json!({"provider":"clef","configured":false})
    );
    let account = "a".repeat(32);
    let checked = run(
        &["doctor", "--clef"],
        &[
            ("CLOUDFLARE_ACCOUNT_ID", &account),
            ("CLOUDFLARE_AUTH_TOKEN", "fake-cloudflare-token"),
        ],
    );
    assert!(checked.status.success());
    let report: Value = serde_json::from_slice(&checked.stdout).unwrap();
    assert_eq!(report["configured"], true);
    assert_eq!(report["liveChecked"], false);
    assert!(
        !String::from_utf8(checked.stdout)
            .unwrap()
            .contains("fake-cloudflare-token")
    );
    let missing = run(&["doctor", "--clef"], &[]);
    assert_eq!(missing.status.code(), Some(1));
    let save = run(&["auth", "clef"], &[]);
    assert!(!save.status.success());
    assert!(
        String::from_utf8(save.stderr)
            .unwrap()
            .contains("environment-only")
    );
}
