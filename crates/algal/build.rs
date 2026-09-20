use sha2::{Digest, Sha256};
use std::{
    env, fs,
    io::Read,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

const MAX_INPUT_BYTES: u64 = 67_108_864;
const MAX_INPUT_FILES: usize = 4096;

fn output(root: &Path, program: &str, args: &[&str], max: u64) -> Option<String> {
    let mut command = Command::new(program);
    if program == "git" {
        for name in [
            "GIT_DIR",
            "GIT_WORK_TREE",
            "GIT_INDEX_FILE",
            "GIT_COMMON_DIR",
        ] {
            command.env_remove(name);
        }
    }
    let mut child = command
        .args(args)
        .current_dir(root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;
    let mut bytes = Vec::new();
    let read = child.stdout.take()?.take(max + 1).read_to_end(&mut bytes);
    if read.is_err() || bytes.len() as u64 > max {
        let _ = child.kill();
        let _ = child.wait();
        return None;
    }
    if !child.wait().ok()?.success() {
        return None;
    }
    String::from_utf8(bytes).ok()
}

fn watch(path: &Path) {
    println!("cargo:rerun-if-changed={}", path.display());
}

fn inputs(root: &Path, path: &Path, files: &mut Vec<PathBuf>) -> Option<()> {
    watch(path);
    let metadata = fs::symlink_metadata(path).ok()?;
    if metadata.is_dir() {
        let mut entries = fs::read_dir(path)
            .ok()?
            .map(|entry| entry.ok().map(|entry| entry.path()))
            .collect::<Option<Vec<_>>>()?;
        entries.sort();
        for entry in entries {
            inputs(root, &entry, files)?;
        }
    } else if metadata.is_file() {
        if files.len() >= MAX_INPUT_FILES || path.strip_prefix(root).ok()?.to_str()?.contains('\n')
        {
            return None;
        }
        files.push(path.to_owned());
    } else {
        return None;
    }
    Some(())
}

fn source_digest(root: &Path) -> Option<String> {
    let mut files = Vec::new();
    for name in ["Cargo.toml", "Cargo.lock", "crates", ".cargo"] {
        let path = root.join(name);
        watch(&path);
        if path.exists() {
            inputs(root, &path, &mut files)?;
        } else if name != ".cargo" {
            return None;
        }
    }
    files.sort();
    let mut hasher = Sha256::new();
    hasher.update(b"algal.native-source-inputs.v1\0");
    let mut total = 0u64;
    for path in files {
        let name = path.strip_prefix(root).ok()?.to_str()?.replace('\\', "/");
        let mut bytes = Vec::new();
        fs::File::open(&path)
            .ok()?
            .take(MAX_INPUT_BYTES.checked_sub(total)? + 1)
            .read_to_end(&mut bytes)
            .ok()?;
        total = total.checked_add(bytes.len() as u64)?;
        if total > MAX_INPUT_BYTES {
            return None;
        }
        hasher.update((name.len() as u64).to_be_bytes());
        hasher.update(name.as_bytes());
        hasher.update((bytes.len() as u64).to_be_bytes());
        hasher.update(bytes);
    }
    Some(format!("{:x}", hasher.finalize()))
}

fn set(name: &str, value: &str) {
    println!("cargo:rustc-env=ALGAL_BUILD_{name}={value}");
}

fn main() {
    let manifest = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let root = manifest.parent().unwrap().parent().unwrap();
    watch(&root.join(".git"));
    // Watch the actual Git directories, including a linked worktree's own HEAD
    // and index and the common refs/packed-refs. No shell or environment override
    // supplies source identity.
    for option in ["--git-dir", "--git-common-dir"] {
        if let Some(value) = output(root, "git", &["rev-parse", option], 4096) {
            let path = root.join(value.trim());
            for name in ["HEAD", "index", "refs", "packed-refs"] {
                watch(&path.join(name));
            }
        }
    }
    let commit = output(root, "git", &["rev-parse", "HEAD"], 128)
        .map(|value| value.trim().to_owned())
        .filter(|value| {
            value.len() == 40
                && value
                    .bytes()
                    .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
        });
    let status = output(
        root,
        "git",
        &[
            "--no-optional-locks",
            "status",
            "--porcelain",
            "--untracked-files=normal",
        ],
        1_048_576,
    );
    let state = match (&commit, status.as_deref()) {
        (Some(_), Some("")) => "clean",
        (Some(_), Some(_)) => "dirty",
        _ => "unknown",
    };
    let tags = output(root, "git", &["tag", "--points-at", "HEAD"], 16384)
        .unwrap_or_default()
        .lines()
        .filter(|tag| {
            tag.len() <= 128
                && tag
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"._+-".contains(&b))
        })
        .take(64)
        .collect::<Vec<_>>()
        .join(",");
    let rustc = env::var("RUSTC").unwrap_or_else(|_| "rustc".into());
    let rustc = output(root, &rustc, &["--version"], 512).unwrap_or_default();
    set("COMMIT", commit.as_deref().unwrap_or(""));
    set("STATE", state);
    set("INPUTS_SHA256", &source_digest(root).unwrap_or_default());
    set("TARGET", &env::var("TARGET").unwrap_or_default());
    set("RUSTC", rustc.trim());
    set("TAGS", &tags);
}
