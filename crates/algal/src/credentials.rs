// Provider credential custody, mirroring src/credentials.ts:
//
//   explicit option → provider env var → OS vault → permission-checked file
//
// OS vaults are zero-dependency: macOS `security`, Linux `secret-tool`
// (libsecret), Windows DPAPI through bundled PowerShell. The file fallback
// is `~/.algal/credentials/<provider>.key` mode 0600 inside a 0700
// directory. Secrets never reach manifests, receipts, digests, or logs.

use crate::{Error, Result};
use serde_json::{Value, json};
use std::path::PathBuf;
use std::process::Command;

const KEY_MIN: usize = 8;
const KEY_MAX: usize = 8192;

pub struct ProviderSpec {
    pub env: &'static str,
    pub service: &'static str,
    pub account: &'static str,
}

pub fn spec(provider: &str) -> Result<ProviderSpec> {
    match provider {
        "jev" => Ok(ProviderSpec {
            env: "TYPESAFE_API_KEY",
            service: "algal.jev",
            account: "typesafe",
        }),
        _ => Err(Error::invalid(format!(
            "unknown credential provider {provider}"
        ))),
    }
}

pub fn check_shape(key: &str, at: &str) -> Result<()> {
    if key.len() < KEY_MIN || key.len() > KEY_MAX || key.contains(['\r', '\n']) || key != key.trim()
    {
        return Err(Error::invalid(format!(
            "{at} is not a plausible credential ({KEY_MIN}..{KEY_MAX} chars, no whitespace)"
        )));
    }
    Ok(())
}

pub fn redact(key: &str) -> String {
    if key.len() > 8 {
        format!("…{}", &key[key.len() - 4..])
    } else {
        "…".to_owned()
    }
}

fn algal_home() -> PathBuf {
    if let Some(dir) = std::env::var_os("ALGAL_HOME").filter(|v| !v.is_empty()) {
        return PathBuf::from(dir);
    }
    PathBuf::from(std::env::var_os("HOME").unwrap_or_default()).join(".algal")
}

fn credential_file(provider: &str) -> PathBuf {
    algal_home()
        .join("credentials")
        .join(format!("{provider}.key"))
}

fn dpapi_file(provider: &str) -> PathBuf {
    algal_home()
        .join("credentials")
        .join(format!("{provider}.dpapi"))
}

fn run(argv: &[&str], stdin: Option<&str>) -> Result<(bool, String)> {
    let mut command = Command::new(argv[0]);
    command.args(&argv[1..]);
    command.stderr(std::process::Stdio::null());
    if stdin.is_some() {
        command.stdin(std::process::Stdio::piped());
    }
    let mut child = match command.stdout(std::process::Stdio::piped()).spawn() {
        Ok(child) => child,
        // absent tooling (no `security`/`secret-tool` on PATH) is a miss,
        // not a failure — the chain falls through to the file store
        Err(_) => return Ok((false, String::new())),
    };
    if let Some(input) = stdin
        && let Some(mut pipe) = child.stdin.take()
    {
        use std::io::Write;
        let _ = pipe.write_all(input.as_bytes());
    }
    let out = child
        .wait_with_output()
        .map_err(|_| Error::new("IO_FAILED", "credential vault call failed"))?;
    Ok((
        out.status.success(),
        String::from_utf8_lossy(&out.stdout).trim().to_owned(),
    ))
}

fn vault_get(provider: &str, spec: &ProviderSpec) -> Result<Option<String>> {
    if cfg!(target_os = "macos") {
        let (ok, out) = run(
            &[
                "security",
                "find-generic-password",
                "-s",
                spec.service,
                "-a",
                spec.account,
                "-w",
            ],
            None,
        )?;
        return Ok((ok && !out.is_empty()).then_some(out));
    }
    if cfg!(target_os = "linux") {
        let (ok, out) = run(
            &[
                "secret-tool",
                "lookup",
                "service",
                spec.service,
                "account",
                spec.account,
            ],
            None,
        )?;
        return Ok((ok && !out.is_empty()).then_some(out));
    }
    if cfg!(target_os = "windows") {
        let file = dpapi_file(provider);
        let script = format!(
            "[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String((Get-Content -Raw '{}')),$null,'CurrentUser'))",
            file.display().to_string().replace('\'', "''")
        );
        let (ok, out) = run(
            &[
                "powershell",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &script,
            ],
            None,
        )?;
        return Ok((ok && !out.is_empty()).then_some(out));
    }
    Ok(None)
}

fn vault_set(provider: &str, spec: &ProviderSpec, key: &str) -> Result<()> {
    if cfg!(target_os = "macos") {
        let (ok, _) = run(
            &[
                "security",
                "add-generic-password",
                "-U",
                "-s",
                spec.service,
                "-a",
                spec.account,
                "-w",
                key,
            ],
            None,
        )?;
        if !ok {
            return Err(Error::new(
                "IO_FAILED",
                "security add-generic-password failed",
            ));
        }
        return Ok(());
    }
    if cfg!(target_os = "linux") {
        let label = format!("algal {}", spec.service);
        let (ok, _) = run(
            &[
                "secret-tool",
                "store",
                &format!("--label={label}"),
                "service",
                spec.service,
                "account",
                spec.account,
            ],
            Some(key),
        )?;
        if !ok {
            return Err(Error::new("IO_FAILED", "secret-tool store failed"));
        }
        return Ok(());
    }
    if cfg!(target_os = "windows") {
        let dir = algal_home().join("credentials");
        std::fs::create_dir_all(&dir)
            .map_err(|_| Error::new("IO_FAILED", "credential directory failed"))?;
        let file = dpapi_file(provider);
        let b64 = base64_encode(key.as_bytes());
        let script = format!(
            "[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Convert]::FromBase64String('{b64}'),$null,'CurrentUser')) | Set-Content -NoNewline '{}'",
            file.display().to_string().replace('\'', "''")
        );
        let (ok, _) = run(
            &[
                "powershell",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &script,
            ],
            None,
        )?;
        if !ok {
            return Err(Error::new("IO_FAILED", "DPAPI protect failed"));
        }
        return Ok(());
    }
    Err(Error::new("IO_FAILED", "no OS credential vault"))
}

fn vault_forget(provider: &str, spec: &ProviderSpec) -> Result<bool> {
    if cfg!(target_os = "macos") {
        return Ok(run(
            &[
                "security",
                "delete-generic-password",
                "-s",
                spec.service,
                "-a",
                spec.account,
            ],
            None,
        )?
        .0);
    }
    if cfg!(target_os = "linux") {
        return Ok(run(
            &[
                "secret-tool",
                "clear",
                "service",
                spec.service,
                "account",
                spec.account,
            ],
            None,
        )?
        .0);
    }
    if cfg!(target_os = "windows") {
        return Ok(std::fs::remove_file(dpapi_file(provider)).is_ok());
    }
    Ok(false)
}

fn vault_detail() -> Option<&'static str> {
    if cfg!(target_os = "macos") {
        Some("macOS Keychain (security)")
    } else if cfg!(target_os = "linux") {
        Some("libsecret (secret-tool)")
    } else if cfg!(target_os = "windows") {
        Some("Windows DPAPI (PowerShell)")
    } else {
        None
    }
}

fn file_get(provider: &str) -> Result<Option<String>> {
    match std::fs::read_to_string(credential_file(provider)) {
        Ok(raw) => Ok((!raw.trim().is_empty()).then(|| raw.trim().to_owned())),
        Err(_) => Ok(None),
    }
}

fn file_set(provider: &str, key: &str) -> Result<()> {
    let dir = algal_home().join("credentials");
    std::fs::create_dir_all(&dir)
        .map_err(|_| Error::new("IO_FAILED", "credential directory failed"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o700));
    }
    let file = credential_file(provider);
    std::fs::write(&file, format!("{key}\n"))
        .map_err(|_| Error::new("IO_FAILED", "credential file write failed"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o600));
    }
    Ok(())
}

fn file_forget(provider: &str) -> bool {
    std::fs::remove_file(credential_file(provider)).is_ok()
}

/// Resolve through the custody chain: explicit option → provider env var →
/// OS vault → permission-checked file. Returns `(key, source)` or `None`.
pub fn resolve(provider: &str, explicit: Option<&str>) -> Result<Option<(String, &'static str)>> {
    let spec = spec(provider)?;
    if let Some(key) = explicit {
        check_shape(key, &format!("{provider} credential"))?;
        return Ok(Some((key.to_owned(), "option")));
    }
    if let Ok(key) = std::env::var(spec.env)
        && !key.is_empty()
    {
        return Ok(Some((key, "env")));
    }
    if let Some(key) = vault_get(provider, &spec)? {
        return Ok(Some((key, "keychain")));
    }
    if let Some(key) = file_get(provider)? {
        return Ok(Some((key, "file")));
    }
    Ok(None)
}

/// Store in the OS vault when the platform offers one, the
/// permission-checked file otherwise. Returns `(source, location)`.
pub fn store(provider: &str, key: &str) -> Result<(&'static str, String)> {
    check_shape(key, &format!("{provider} credential"))?;
    let spec = spec(provider)?;
    if vault_detail().is_some() {
        match vault_set(provider, &spec, key) {
            Ok(()) => return Ok(("keychain", vault_detail().unwrap().to_owned())),
            // vault tooling present but failed (headless libsecret) — fall
            // through to the file store rather than lose the credential
            Err(error) if error.code != "IO_FAILED" => return Err(error),
            _ => (),
        }
    }
    file_set(provider, key)?;
    Ok(("file", credential_file(provider).display().to_string()))
}

/// Remove the credential from every local store. Returns the sources that
/// yielded a removal.
pub fn forget(provider: &str) -> Result<Vec<&'static str>> {
    let spec = spec(provider)?;
    let mut removed = Vec::new();
    if vault_forget(provider, &spec)? {
        removed.push("keychain");
    }
    if file_forget(provider) {
        removed.push("file");
    }
    Ok(removed)
}

/// The redacted status record for `algal auth <provider> --status`.
pub fn status(provider: &str) -> Result<Value> {
    spec(provider)?;
    match resolve(provider, None)? {
        None => Ok(json!({"provider":provider,"configured":false})),
        Some((key, source)) => {
            let mut out = json!({
                "provider":provider,"configured":true,
                "source":source,"hint":redact(&key)
            });
            if source == "file" {
                out["location"] = json!(credential_file(provider).display().to_string());
            }
            if source == "keychain"
                && let Some(detail) = vault_detail()
            {
                out["location"] = json!(detail);
            }
            Ok(out)
        }
    }
}

fn base64_encode(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in bytes.chunks(3) {
        let n = chunk.iter().fold(0u32, |acc, b| (acc << 8) | u32::from(*b));
        let shift = [18, 12, 6, 0];
        for (i, s) in shift.iter().enumerate() {
            out.push(if i < chunk.len() + 1 {
                ALPHABET[((n >> s) & 63) as usize] as char
            } else {
                '='
            });
        }
    }
    out
}
