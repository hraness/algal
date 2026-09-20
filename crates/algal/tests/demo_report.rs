use algal::demo_report::{render, write};
use serde_json::json;
use std::fs;

#[test]
fn report_embeds_untrusted_evidence_only_as_escaped_data() {
    let hostile = "</script><script>alert(1)</script><img src=x onerror=alert(2)>&\u{2028}\u{2029}";
    let report = json!({"contract":"algal.demo-report.v1","status":"waiting","evidence":{"value":hostile},"commands":{"approve":hostile}});
    let html = render(&report).unwrap();
    assert!(!html.contains(hostile));
    assert!(!html.contains("<img src=x"));
    let data = html
        .split("<script id=\"algal-report\" type=\"application/json\">")
        .nth(1)
        .unwrap()
        .split("</script>")
        .next()
        .unwrap();
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(data).unwrap(),
        report
    );
    assert!(!data.contains('<'));
    assert!(html.contains("connect-src 'none'"));
    assert!(html.contains("script-src 'sha256-"));
    assert!(!html.contains("innerHTML"));
    assert!(!html.contains("eval("));
}

#[test]
fn report_rejects_unknown_contract_and_oversized_input() {
    assert!(render(&json!({"contract":"other"})).is_err());
    assert!(
        render(&json!({"contract":"algal.demo-report.v1","evidence":"x".repeat(1_048_576)}))
            .is_err()
    );
}

#[test]
fn report_publication_is_atomic_idempotent_and_rejects_symlinks() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("report.html");
    let report = json!({"contract":"algal.demo-report.v1","status":"waiting"});
    write(directory.path(), &report).unwrap();
    let first = fs::metadata(&path).unwrap().modified().unwrap();
    write(directory.path(), &report).unwrap();
    assert_eq!(fs::metadata(&path).unwrap().modified().unwrap(), first);
    assert_eq!(fs::read_to_string(&path).unwrap(), render(&report).unwrap());
    assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;
        fs::remove_file(&path).unwrap();
        let target = directory.path().join("unrelated");
        fs::write(&target, "preserve").unwrap();
        symlink(&target, &path).unwrap();
        assert!(write(directory.path(), &report).is_err());
        assert_eq!(fs::read_to_string(&target).unwrap(), "preserve");
    }
}
