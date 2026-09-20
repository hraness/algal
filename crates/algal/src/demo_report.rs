//! A passive local view of a retained demo report. No executable host bindings.
use crate::{Error, Result, canonical::canonical, lease};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::Path,
};

const TEMPLATE: &str = include_str!("demo_report.html");
const MARKER: &str = "__ALGAL_REPORT_JSON__";
const MAX_REPORT_BYTES: usize = 1_048_576;
const MAX_HTML_BYTES: usize = 8_388_608;

pub fn render(report: &Value) -> Result<String> {
    lease::nodes(report)?;
    if report["contract"] != "algal.demo-report.v1" {
        return Err(Error::invalid("demo report contract"));
    }
    let data = canonical(report)?;
    if data.len() > MAX_REPORT_BYTES {
        return Err(Error::limit("demo report bytes"));
    }
    // JSON is data inside a script element. Prevent HTML tokenization from
    // interpreting even a literal closing-script sequence from user evidence.
    let escaped = data
        .replace('&', "\\u0026")
        .replace('<', "\\u003c")
        .replace('>', "\\u003e")
        .replace('\u{2028}', "\\u2028")
        .replace('\u{2029}', "\\u2029");
    let script = TEMPLATE
        .split_once("<script>")
        .and_then(|(_, tail)| tail.split_once("</script>"))
        .map(|(script, _)| script)
        .ok_or_else(|| Error::invalid("demo report script template"))?;
    let hash = Sha256::digest(script.as_bytes());
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut encoded = String::new();
    for bytes in hash.chunks(3) {
        let word = ((bytes[0] as u32) << 16)
            | ((bytes.get(1).copied().unwrap_or(0) as u32) << 8)
            | bytes.get(2).copied().unwrap_or(0) as u32;
        encoded.push(ALPHABET[((word >> 18) & 63) as usize] as char);
        encoded.push(ALPHABET[((word >> 12) & 63) as usize] as char);
        encoded.push(if bytes.len() > 1 {
            ALPHABET[((word >> 6) & 63) as usize] as char
        } else {
            '='
        });
        encoded.push(if bytes.len() > 2 {
            ALPHABET[(word & 63) as usize] as char
        } else {
            '='
        });
    }
    let html = TEMPLATE
        .replace("__ALGAL_SCRIPT_HASH__", &encoded)
        .replacen(MARKER, &escaped, 1);
    if html.len() > MAX_HTML_BYTES || TEMPLATE.matches(MARKER).count() != 1 {
        return Err(Error::limit("demo report HTML bound/template"));
    }
    Ok(html)
}

/// Publish only the derived report file beneath an already admitted demo root.
/// The caller owns the demo's lease and mutable-state admission. Identical
/// observations do not rewrite the existing report or create temporary files.
pub fn write(root: &Path, report: &Value) -> Result<()> {
    if !fs::symlink_metadata(root)?.file_type().is_dir() {
        return Err(Error::new(
            "IO_FAILED",
            "demo report root must be a real directory",
        ));
    }
    let path = root.join("report.html");
    let html = render(report)?;
    match fs::symlink_metadata(&path) {
        Ok(meta) => {
            if !meta.file_type().is_file() || meta.len() > MAX_HTML_BYTES as u64 {
                return Err(Error::new(
                    "IO_FAILED",
                    "demo report target must be a bounded regular file",
                ));
            }
            let mut options = OpenOptions::new();
            options.read(true);
            #[cfg(unix)]
            {
                use std::os::unix::fs::OpenOptionsExt;
                options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
            }
            use std::io::Read;
            let mut existing = String::new();
            options
                .open(&path)?
                .take((MAX_HTML_BYTES + 1) as u64)
                .read_to_string(&mut existing)?;
            if existing == html {
                return Ok(());
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
        Err(error) => return Err(error.into()),
    }
    let mut random = [0u8; 24];
    getrandom::fill(&mut random)
        .map_err(|_| Error::new("IO_FAILED", "demo report temporary entropy unavailable"))?;
    let nonce: String = random.iter().map(|byte| format!("{byte:02x}")).collect();
    let temporary = root.join(format!(".report-{nonce}.tmp"));
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let result = (|| -> Result<()> {
        let mut file = options.open(&temporary)?;
        file.write_all(html.as_bytes())?;
        file.sync_all()?;
        fs::rename(&temporary, &path)?;
        File::open(root)?.sync_all()?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}
