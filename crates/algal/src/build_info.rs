//! Build context and checksum-bound local package attribution, not attestation.
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{fs, io::Read, path::Path};

const MAX_BINARY_BYTES: u64 = 100_000_000;
const MAX_METADATA_BYTES: u64 = 16_384;

/// Identity captured by Cargo's build script; no runtime environment overrides.
pub fn embedded() -> Value {
    let commit = env!("ALGAL_BUILD_COMMIT");
    let inputs = env!("ALGAL_BUILD_INPUTS_SHA256");
    json!({
        "contract": "algal.native-build.v1",
        "version": env!("CARGO_PKG_VERSION"),
        "sourceCommit": if commit.is_empty() { None } else { Some(commit) },
        "sourceState": env!("ALGAL_BUILD_STATE"),
        "sourceInputsSha256": if inputs.is_empty() { None } else { Some(inputs) },
        "target": env!("ALGAL_BUILD_TARGET"),
        "rustc": env!("ALGAL_BUILD_RUSTC"),
        "exactTagsAtBuild": env!("ALGAL_BUILD_TAGS").split(',').filter(|tag| !tag.is_empty()).collect::<Vec<_>>()
    })
}

fn regular_file(path: &Path, limit: u64) -> std::io::Result<fs::File> {
    let metadata = fs::symlink_metadata(path)?;
    if !metadata.is_file() || metadata.len() > limit {
        return Err(std::io::Error::other("regular bounded file required"));
    }
    let mut options = fs::OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
    }
    let file = options.open(path)?;
    if !file.metadata()?.is_file() || file.metadata()?.len() > limit {
        return Err(std::io::Error::other("regular bounded file required"));
    }
    Ok(file)
}

fn executable_hash(path: &Path) -> std::io::Result<String> {
    let mut source = regular_file(path, MAX_BINARY_BYTES)?.take(MAX_BINARY_BYTES + 1);
    let mut hasher = Sha256::new();
    let mut bytes = [0u8; 65_536];
    let mut total = 0;
    loop {
        let count = source.read(&mut bytes)?;
        if count == 0 {
            break;
        }
        total += count as u64;
        if total > MAX_BINARY_BYTES {
            return Err(std::io::Error::other("executable byte limit"));
        }
        hasher.update(&bytes[..count]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn release(path: &Path, hash: &str, build: &Value) -> std::result::Result<Option<Value>, String> {
    let directory = path
        .parent()
        .ok_or("executable parent unavailable")?
        .join(".algal-releases");
    let attributes = match fs::symlink_metadata(&directory) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err("release metadata directory unreadable".into()),
        Ok(attributes) => attributes,
    };
    if !attributes.is_dir() {
        return Err("release metadata directory is not a real directory".into());
    }
    let metadata_path = directory.join(format!("{hash}.json"));
    let file = match regular_file(&metadata_path, MAX_METADATA_BYTES) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err("release metadata is not a bounded regular file".into()),
        Ok(file) => file,
    };
    let mut bytes = Vec::new();
    file.take(MAX_METADATA_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "release metadata unreadable")?;
    if bytes.len() as u64 > MAX_METADATA_BYTES {
        return Err("release metadata byte limit".into());
    }
    let metadata: Value =
        serde_json::from_slice(&bytes).map_err(|_| "release metadata is invalid JSON")?;
    let fields = [
        "contract",
        "tag",
        "version",
        "commit",
        "sourceState",
        "target",
        "rustc",
        "build",
        "minimumPlatform",
        "binarySha256",
        "signed",
        "smoke",
    ];
    if !metadata.as_object().is_some_and(|object| {
        object.len() == fields.len() && object.keys().all(|key| fields.contains(&key.as_str()))
    }) || metadata["contract"] != "algal.native-release.v1"
        || metadata["binarySha256"] != hash
        || metadata["build"] != *build
        || metadata["commit"] != build["sourceCommit"]
        || metadata["target"] != build["target"]
        || metadata["version"] != build["version"]
        || metadata["rustc"] != build["rustc"]
        || !metadata["tag"].as_str().is_some_and(|tag| {
            let prefix = format!("v{}", env!("CARGO_PKG_VERSION"));
            tag.len() <= 128
                && tag.strip_prefix(&prefix).is_some_and(|suffix| {
                    suffix.is_empty() || (suffix.starts_with('-') && suffix.len() > 1)
                })
                && tag
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b".-".contains(&b))
        })
        || !matches!(
            metadata["sourceState"].as_str(),
            Some("clean" | "dirty-test-fixture")
        )
        || (metadata["sourceState"] == "clean" && build["sourceState"] != "clean")
        || metadata["signed"] != false
        || !metadata["minimumPlatform"]
            .as_str()
            .is_some_and(|value| value.len() <= 256)
        || !metadata["smoke"].is_object()
        || build["sourceCommit"].is_null()
        || build["sourceInputsSha256"].is_null()
    {
        return Err("release metadata does not match embedded build identity".into());
    }
    // The package's full smoke report is retained on disk, but this diagnostic
    // exposes only the fields whose local binary binding was checked above.
    Ok(Some(json!({
        "tag": metadata["tag"], "commit": metadata["commit"],
        "version": metadata["version"], "target": metadata["target"],
        "sourceState": metadata["sourceState"], "binarySha256": metadata["binarySha256"],
        "signed": false
    })))
}

/// Local diagnostics never make a publisher-signature or reproducible-build claim.
pub fn diagnostic() -> Value {
    diagnostic_at(std::env::current_exe().ok().as_deref())
}

fn diagnostic_at(executable: Option<&Path>) -> Value {
    let mut report = embedded();
    let identity = executable.and_then(|path| executable_hash(path).ok().map(|hash| (path, hash)));
    let Some((path, hash)) = identity else {
        report["executableSha256"] = Value::Null;
        report["release"] = json!({"status":"unavailable","reason":"executable bytes unavailable"});
        return report;
    };
    report["release"] = match release(path, &hash, &report) {
        Ok(Some(metadata)) => json!({"status":"matched","metadata":metadata}),
        Ok(None) => json!({"status":"absent"}),
        Err(reason) => json!({"status":"rejected","reason":reason}),
    };
    report["executableSha256"] = json!(hash);
    report
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_metadata_must_bind_the_actual_executable_and_embedded_build() {
        let directory = tempfile::tempdir().unwrap();
        let executable = directory.path().join("algal");
        fs::write(&executable, b"fixture executable bytes").unwrap();
        assert_eq!(
            diagnostic_at(Some(&executable))["release"]["status"],
            "absent"
        );
        let hash = executable_hash(&executable).unwrap();
        let records = directory.path().join(".algal-releases");
        fs::create_dir(&records).unwrap();
        let mut metadata = json!({
            "contract":"algal.native-release.v1", "binarySha256":hash,
            "build":embedded(), "commit":embedded()["sourceCommit"],
            "target":embedded()["target"], "version":embedded()["version"],
            "rustc":embedded()["rustc"], "tag":"v0.2.0-test", "sourceState":"dirty-test-fixture",
            "minimumPlatform":"test fixture", "signed":false, "smoke":{}
        });
        let path = records.join(format!("{hash}.json"));
        fs::write(&path, serde_json::to_vec(&metadata).unwrap()).unwrap();
        if !embedded()["sourceCommit"].is_null() {
            assert_eq!(
                diagnostic_at(Some(&executable))["release"]["status"],
                "matched"
            );
        }
        metadata["commit"] = json!("0000000000000000000000000000000000000000");
        fs::write(&path, serde_json::to_vec(&metadata).unwrap()).unwrap();
        assert_eq!(
            diagnostic_at(Some(&executable))["release"]["status"],
            "rejected"
        );
        fs::write(&executable, b"other executable bytes").unwrap();
        assert_eq!(
            diagnostic_at(Some(&executable))["release"]["status"],
            "absent"
        );
    }

    #[cfg(unix)]
    #[test]
    fn rejects_metadata_directory_and_file_symlinks() {
        use std::os::unix::fs::symlink;
        let directory = tempfile::tempdir().unwrap();
        let executable = directory.path().join("algal");
        fs::write(&executable, b"fixture executable bytes").unwrap();
        let other = tempfile::tempdir().unwrap();
        let records = directory.path().join(".algal-releases");
        symlink(other.path(), &records).unwrap();
        assert_eq!(
            diagnostic_at(Some(&executable))["release"]["status"],
            "rejected"
        );
        fs::remove_file(&records).unwrap();
        fs::create_dir(&records).unwrap();
        let hash = executable_hash(&executable).unwrap();
        let target = other.path().join("metadata.json");
        fs::write(&target, b"{}").unwrap();
        symlink(target, records.join(format!("{hash}.json"))).unwrap();
        assert_eq!(
            diagnostic_at(Some(&executable))["release"]["status"],
            "rejected"
        );
    }
}
