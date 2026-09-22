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
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
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
    let length = key.encode_utf16().count();
    if !(KEY_MIN..=KEY_MAX).contains(&length) || key.contains(['\r', '\n']) || key != key.trim() {
        return Err(Error::invalid(format!(
            "{at} is not a plausible credential ({KEY_MIN}..{KEY_MAX} chars, no whitespace)"
        )));
    }
    Ok(())
}

pub fn redact(key: &str) -> String {
    if key.encode_utf16().count() > 8 {
        let tail: String = key
            .chars()
            .rev()
            .take(4)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect();
        format!("…{tail}")
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

#[cfg(unix)]
fn current_uid() -> Result<u32> {
    // Keep the crate's forbid(unsafe_code) contract: query the platform's
    // identity utility once, never a shell or a credential-bearing process.
    static UID: std::sync::OnceLock<Result<u32>> = std::sync::OnceLock::new();
    UID.get_or_init(|| {
        let output = Command::new("/usr/bin/id")
            .arg("-u")
            .stdin(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .output()
            .map_err(|_| Error::new("IO_FAILED", "credential owner identity unavailable"))?;
        if !output.status.success() || output.stdout.len() > 32 {
            return Err(Error::new(
                "IO_FAILED",
                "credential owner identity unavailable",
            ));
        }
        std::str::from_utf8(&output.stdout)
            .ok()
            .and_then(|text| text.trim().parse::<u32>().ok())
            .ok_or_else(|| Error::new("IO_FAILED", "credential owner identity unavailable"))
    })
    .clone()
}

fn private_metadata(metadata: &std::fs::Metadata, directory: bool) -> Result<()> {
    if metadata.file_type().is_symlink()
        || (if directory {
            !metadata.is_dir()
        } else {
            !metadata.is_file()
        })
    {
        return Err(Error::new(
            "IO_FAILED",
            "credential state must be private, owned, and free of symlinks",
        ));
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        if metadata.mode() & 0o077 != 0
            || metadata.uid() != current_uid()?
            || (!directory && metadata.nlink() != 1)
        {
            return Err(Error::new(
                "IO_FAILED",
                "credential state must be private, owned, and free of symlinks",
            ));
        }
    }
    Ok(())
}

fn credential_directory(home: &Path, create: bool) -> Result<bool> {
    // Check the home before recursive mkdir so a symlink cannot redirect even
    // creation of the credentials directory into another tree.
    match std::fs::symlink_metadata(home) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() || !metadata.is_dir() {
                return Err(Error::new(
                    "IO_FAILED",
                    "credential home must be a real directory",
                ));
            }
            #[cfg(unix)]
            {
                use std::os::unix::fs::MetadataExt;
                if metadata.uid() != current_uid()? || metadata.mode() & 0o022 != 0 {
                    return Err(Error::new(
                        "IO_FAILED",
                        "credential home must be owned and not writable by others",
                    ));
                }
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound && !create => return Ok(false),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
        Err(_) => {
            return Err(Error::new(
                "IO_FAILED",
                "credential home cannot be inspected",
            ));
        }
    }
    let dir = home.join("credentials");
    if create {
        let mut builder = std::fs::DirBuilder::new();
        builder.recursive(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt;
            builder.mode(0o700);
        }
        builder
            .create(&dir)
            .map_err(|_| Error::new("IO_FAILED", "credential directory failed"))?;
    }
    match std::fs::symlink_metadata(&dir) {
        Ok(metadata) => private_metadata(&metadata, true)?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(_) => {
            return Err(Error::new(
                "IO_FAILED",
                "credential directory cannot be inspected",
            ));
        }
    }
    Ok(true)
}

fn read_file(home: &Path, provider: &str) -> Result<Option<String>> {
    if !credential_directory(home, false)? {
        return Ok(None);
    }
    let path = home.join("credentials").join(format!("{provider}.key"));
    // Descriptor admission rejects final symlinks/FIFOs without blocking.
    let Some(file) = crate::store::open_regular_file(&path, KEY_MAX * 4 + 1)? else {
        return Ok(None);
    };
    private_metadata(&file.metadata()?, false)?;
    let mut bytes = Vec::new();
    file.take((KEY_MAX * 4 + 2) as u64)
        .read_to_end(&mut bytes)
        .map_err(|_| Error::new("IO_FAILED", "credential file read failed"))?;
    if bytes.len() > KEY_MAX * 4 + 1 {
        return Err(Error::new(
            "IO_FAILED",
            "credential file exceeds its byte bound",
        ));
    }
    let raw = String::from_utf8(bytes)
        .map_err(|_| Error::new("IO_FAILED", "credential file is not UTF-8"))?;
    let key = raw.trim().to_owned();
    check_shape(&key, "stored credential")?;
    Ok(Some(key))
}

fn write_file(home: &Path, provider: &str, key: &str) -> Result<()> {
    credential_directory(home, true)?;
    let dir = home.join("credentials");
    let target = dir.join(format!("{provider}.key"));
    match std::fs::symlink_metadata(&target) {
        Ok(metadata) => private_metadata(&metadata, false)?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
        Err(_) => {
            return Err(Error::new(
                "IO_FAILED",
                "credential file cannot be inspected",
            ));
        }
    }
    let mut entropy = [0u8; 24];
    getrandom::fill(&mut entropy)
        .map_err(|_| Error::new("IO_FAILED", "credential write entropy unavailable"))?;
    let name: String = entropy.iter().map(|byte| format!("{byte:02x}")).collect();
    let temporary = dir.join(format!(".credential-{name}"));
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600).custom_flags(libc::O_NOFOLLOW);
    }
    let result = (|| {
        let mut file = options
            .open(&temporary)
            .map_err(|_| Error::new("IO_FAILED", "credential temporary file failed"))?;
        file.write_all(key.as_bytes())
            .and_then(|_| file.write_all(b"\n"))
            .and_then(|_| file.sync_all())
            .map_err(|_| Error::new("IO_FAILED", "credential file write failed"))?;
        drop(file);
        credential_directory(home, false)?;
        std::fs::rename(&temporary, &target)
            .map_err(|_| Error::new("IO_FAILED", "credential file publish failed"))?;
        #[cfg(unix)]
        std::fs::File::open(&dir)?.sync_all()?;
        Ok(())
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&temporary);
    }
    result
}

fn forget_file(home: &Path, provider: &str) -> Result<bool> {
    if !credential_directory(home, false)? {
        return Ok(false);
    }
    let path = home.join("credentials").join(format!("{provider}.key"));
    match std::fs::symlink_metadata(&path) {
        Ok(metadata) => private_metadata(&metadata, false)?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(_) => {
            return Err(Error::new(
                "IO_FAILED",
                "credential file cannot be inspected",
            ));
        }
    }
    std::fs::remove_file(path)
        .map_err(|_| Error::new("IO_FAILED", "credential file removal failed"))?;
    Ok(true)
}
fn file_get(provider: &str) -> Result<Option<String>> {
    read_file(&algal_home(), provider)
}
fn file_set(provider: &str, key: &str) -> Result<()> {
    write_file(&algal_home(), provider, key)
}
fn file_forget(provider: &str) -> Result<bool> {
    forget_file(&algal_home(), provider)
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
        check_shape(&key, "environment credential")?;
        return Ok(Some((key, "env")));
    }
    if let Some(key) = vault_get(provider, &spec)? {
        check_shape(&key, "vault credential")?;
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
    if file_forget(provider)? {
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
        let n =
            chunk.iter().fold(0u32, |acc, b| (acc << 8) | u32::from(*b)) << ((3 - chunk.len()) * 8);
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_tail_groups_and_unicode_redaction_are_exact() {
        for (plain, encoded) in [
            ("", ""),
            ("f", "Zg=="),
            ("fo", "Zm8="),
            ("foo", "Zm9v"),
            ("foob", "Zm9vYg=="),
            ("fooba", "Zm9vYmE="),
            ("foobar", "Zm9vYmFy"),
            ("é", "w6k="),
        ] {
            assert_eq!(base64_encode(plain.as_bytes()), encoded);
        }
        assert_eq!(redact("abcdefghé😀é😀é"), "…😀é😀é");
        assert_eq!(redact("short"), "…");
        assert!(check_shape(&"😀".repeat(4), "fixture").is_ok());
    }

    #[test]
    fn synthetic_private_file_round_trips_and_atomically_replaces() {
        let home = tempfile::tempdir().unwrap();
        write_file(home.path(), "jev", "fixture-key-one").unwrap();
        write_file(home.path(), "jev", "fixture-key-two").unwrap();
        assert_eq!(
            read_file(home.path(), "jev").unwrap().as_deref(),
            Some("fixture-key-two")
        );
        #[cfg(unix)]
        {
            use std::os::unix::fs::MetadataExt;
            assert_eq!(
                std::fs::metadata(home.path().join("credentials"))
                    .unwrap()
                    .mode()
                    & 0o777,
                0o700
            );
            assert_eq!(
                std::fs::metadata(home.path().join("credentials/jev.key"))
                    .unwrap()
                    .mode()
                    & 0o777,
                0o600
            );
        }
        assert!(forget_file(home.path(), "jev").unwrap());
        assert!(read_file(home.path(), "jev").unwrap().is_none());
    }

    #[cfg(unix)]
    #[test]
    fn foreign_paths_modes_and_links_are_not_credential_state() {
        use std::os::unix::fs::{PermissionsExt, symlink};
        let home = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let target = outside.path().join("unrelated");
        std::fs::write(&target, "unrelated-user-data").unwrap();
        std::fs::set_permissions(&target, std::fs::Permissions::from_mode(0o600)).unwrap();
        write_file(home.path(), "jev", "fixture-private-key").unwrap();
        let credential = home.path().join("credentials/jev.key");
        std::fs::remove_file(&credential).unwrap();
        symlink(&target, &credential).unwrap();
        assert!(read_file(home.path(), "jev").is_err());
        assert!(write_file(home.path(), "jev", "replacement-key").is_err());
        assert!(forget_file(home.path(), "jev").is_err());
        assert_eq!(
            std::fs::read_to_string(&target).unwrap(),
            "unrelated-user-data"
        );
        std::fs::remove_file(&credential).unwrap();
        write_file(home.path(), "jev", "fixture-private-key").unwrap();
        std::fs::set_permissions(&credential, std::fs::Permissions::from_mode(0o644)).unwrap();
        assert!(read_file(home.path(), "jev").is_err());
        assert!(write_file(home.path(), "jev", "replacement-key").is_err());
        let link = home.path().join("redirected-home");
        symlink(outside.path(), &link).unwrap();
        assert!(write_file(&link, "jev", "replacement-key").is_err());
        assert!(!outside.path().join("credentials").exists());
    }
}
