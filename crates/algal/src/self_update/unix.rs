//! ALGAL's native transaction preserves its release archive and Apple
//! signature contract. Only this process writes installed files or receipts.
use super::{InitialInstall, paths, product, released_tag};
use anyhow::{Context, Result, bail, ensure};
use hraness_cli_update::{
    Asset, CurlGithub, InstallReceipt, InstallRequest, InstallationKind, Installer, Product,
    Release, run_bounded,
};
use serde::Deserialize;
use std::path::Path;
use std::process::Command;
use std::time::Duration;

#[path = "unix/files.rs"]
mod files;
#[path = "unix/legacy.rs"]
mod legacy;
use files::{Directory, Stage, digest, read_path};

#[cfg(target_os = "macos")]
const MACOS_REQUIREMENT: &str = "=anchor apple generic and identifier \"dev.hraness.algal\" and certificate 1[field.1.2.840.113635.100.6.2.6] exists and certificate leaf[field.1.2.840.113635.100.6.1.13] exists and certificate leaf[subject.OU] = \"8AAP53VTW3\"";

const ARCHIVE_LIMIT: usize = 100_000_000;
const BINARY_LIMIT: usize = 100_000_000;
const CHECKSUM_LIMIT: usize = 1024;
const RECEIPT_LIMIT: usize = 64 * 1024;
const METADATA_LIMIT: usize = 16_384;
// The last release before installer ownership receipts. Compare verified bytes,
// never execute an unknown installed binary to discover its claimed version.
const HISTORICAL_RELEASE: &str = "v0.2.0-vm.11";
const LEGACY_RELEASE: &str = "v0.2.0-vm.12";

pub(super) struct NativeInstaller;

impl Installer for NativeInstaller {
    fn install(&self, request: &InstallRequest<'_>) -> hraness_cli_update::Result<()> {
        install_update(request).map_err(|error| {
            hraness_cli_update::Error::new(
                hraness_cli_update::ErrorCode::Installer,
                format!("{error:#}"),
            )
        })
    }
}

struct Published {
    release: Release,
    archive: Asset,
    checksum: Asset,
    archive_sha256: String,
    checksum_sha256: String,
    metadata: Asset,
    metadata_sha256: String,
}

#[derive(Deserialize)]
struct AssetDigest {
    id: u64,
    name: String,
    digest: Option<String>,
}

#[derive(Deserialize)]
struct DigestList {
    assets: Vec<AssetDigest>,
}

impl Published {
    fn parse(profile: &Product, expected_tag: &str, bytes: &[u8]) -> Result<Self> {
        let release: Release =
            serde_json::from_slice(bytes).context("Read canonical release metadata")?;
        release.validate(profile)?;
        ensure!(
            release.tag_name == expected_tag,
            "Canonical release tag differs from the requested version"
        );
        let raw: DigestList = serde_json::from_slice(bytes)?;
        let names = profile.asset_names(expected_tag)?;
        ensure!(
            names.len() == 3,
            "ALGAL requires an archive, checksum and release metadata"
        );
        let archive = release
            .asset(&names[0])
            .context("Missing release archive")?
            .clone();
        let checksum = release
            .asset(&names[1])
            .context("Missing release checksum")?
            .clone();
        let metadata = release
            .asset(&names[2])
            .context("Missing release metadata")?
            .clone();
        ensure!(
            archive.size <= ARCHIVE_LIMIT as u64
                && checksum.size <= CHECKSUM_LIMIT as u64
                && metadata.size <= METADATA_LIMIT as u64,
            "Release assets exceed the native install size limits"
        );
        let published_digest = |asset: &Asset| -> Result<String> {
            let rows: Vec<_> = raw
                .assets
                .iter()
                .filter(|row| row.id == asset.id && row.name == asset.name)
                .collect();
            ensure!(
                rows.len() == 1,
                "Canonical release asset digest is ambiguous"
            );
            let hash = rows[0]
                .digest
                .as_deref()
                .and_then(|value| value.strip_prefix("sha256:"))
                .context("Canonical release is missing its asset SHA-256")?;
            ensure!(valid_digest(hash), "Canonical asset SHA-256 is invalid");
            Ok(hash.to_owned())
        };
        let archive_sha256 = published_digest(&archive)?;
        let checksum_sha256 = published_digest(&checksum)?;
        let metadata_sha256 = published_digest(&metadata)?;
        Ok(Self {
            release,
            archive,
            checksum,
            archive_sha256,
            checksum_sha256,
            metadata,
            metadata_sha256,
        })
    }

    fn fetch(profile: &Product, tag: &str) -> Result<Self> {
        let version = profile.version(tag)?;
        ensure!(
            profile.accepts(&version),
            "Release is outside ALGAL's vm channel"
        );
        let url = format!(
            "https://api.github.com/repos/{}/releases/tags/{}",
            profile.repository,
            tag.replace('+', "%2B")
        );
        let mut command = Command::new("/usr/bin/curl");
        // No redirect, credential lookup, curl config, or replaceable authority.
        command.args([
            "--disable",
            "--silent",
            "--show-error",
            "--fail",
            "--proto",
            "=https",
            "--tlsv1.2",
            "--connect-timeout",
            "5",
            "--max-time",
            "30",
            "--max-filesize",
            "2097152",
            "--header",
            "Accept: application/vnd.github+json",
            "--user-agent",
            "algal-native-update",
            "--write-out",
            "\n%{http_code}",
            "--url",
            &url,
        ]);
        let output = run_bounded(
            &mut command,
            2 * 1024 * 1024 + 4,
            8192,
            Duration::from_secs(32),
        )?;
        ensure!(
            output.status.success(),
            "Could not read canonical GitHub release metadata; installation was not changed"
        );
        let bytes = output
            .stdout
            .strip_suffix(b"\n200")
            .context("GitHub did not return an exact HTTP 200 release response")?;
        Self::parse(profile, tag, bytes)
    }

    fn matches_selected(&self, selected: &Release) -> Result<()> {
        ensure!(
            self.release.id == selected.id && self.release.tag_name == selected.tag_name,
            "Selected release changed during verification"
        );
        for asset in [&self.archive, &self.checksum, &self.metadata] {
            let selected_asset = selected
                .asset(&asset.name)
                .context("Selected release asset disappeared")?;
            ensure!(
                asset.id == selected_asset.id
                    && asset.size == selected_asset.size
                    && asset.browser_download_url == selected_asset.browser_download_url,
                "Selected release asset changed during verification"
            );
        }
        Ok(())
    }

    fn download(&self, profile: &Product, stage: &Stage<'_>) -> Result<()> {
        let source = CurlGithub::new("/usr/bin/curl")?;
        source.download_verified(
            profile,
            &self.release,
            &self.archive,
            &self.archive_sha256,
            &stage.directory.path.join("archive"),
            ARCHIVE_LIMIT,
        )?;
        source.download_verified(
            profile,
            &self.release,
            &self.checksum,
            &self.checksum_sha256,
            &stage.directory.path.join("checksum"),
            CHECKSUM_LIMIT,
        )?;
        self.download_metadata(profile, stage)?;
        self.verify_staged(stage, true)
    }

    fn download_metadata(&self, profile: &Product, stage: &Stage<'_>) -> Result<()> {
        CurlGithub::new("/usr/bin/curl")?.download_verified(
            profile,
            &self.release,
            &self.metadata,
            &self.metadata_sha256,
            &stage.directory.path.join("metadata"),
            METADATA_LIMIT,
        )?;
        Ok(())
    }

    fn import(&self, stage: &Stage<'_>, archive: &Path, checksum: &Path) -> Result<()> {
        stage
            .directory
            .write_new("archive", &read_path(archive, ARCHIVE_LIMIT)?, false)?;
        stage
            .directory
            .write_new("checksum", &read_path(checksum, CHECKSUM_LIMIT)?, false)?;
        self.verify_staged(stage, false)?;
        self.download_metadata(&product(), stage)?;
        self.verify_staged(stage, true)
    }

    fn verify_staged(&self, stage: &Stage<'_>, check_metadata: bool) -> Result<()> {
        let archive = stage
            .directory
            .read("archive", ARCHIVE_LIMIT)?
            .context("Missing staged archive")?;
        let checksum = stage
            .directory
            .read("checksum", CHECKSUM_LIMIT)?
            .context("Missing staged checksum")?;
        ensure!(
            archive.len() as u64 == self.archive.size && digest(&archive) == self.archive_sha256,
            "Release archive differs from its canonical size or SHA-256"
        );
        ensure!(
            checksum.len() as u64 == self.checksum.size
                && digest(&checksum) == self.checksum_sha256,
            "Release checksum differs from its canonical size or SHA-256"
        );
        verify_checksum(&checksum, &self.archive.name, &self.archive_sha256)?;
        if !check_metadata {
            return Ok(());
        }
        let metadata = stage
            .directory
            .read("metadata", METADATA_LIMIT)?
            .context("Missing release metadata")?;
        ensure!(
            metadata.len() as u64 == self.metadata.size
                && digest(&metadata) == self.metadata_sha256,
            "Release metadata differs from its canonical size or SHA-256"
        );
        Ok(())
    }

    fn receipt(
        &self,
        executable: &Path,
        binary_sha256: String,
        pinned: bool,
        build_sha: &str,
    ) -> InstallReceipt {
        InstallReceipt {
            schema: InstallReceipt::SCHEMA.into(),
            product: "algal".into(),
            repository: "hraness/algal".into(),
            kind: InstallationKind::NativeRelease,
            executable: executable.into(),
            binary_sha256,
            release_tag: self.release.tag_name.clone(),
            build_sha: Some(build_sha.into()),
            release_id: self.release.id,
            archive_name: self.archive.name.clone(),
            archive_sha256: self.archive_sha256.clone(),
            platform: super::platform().into(),
            pinned,
        }
    }
}

fn valid_digest(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

fn verify_checksum(bytes: &[u8], archive: &str, expected: &str) -> Result<()> {
    let text = std::str::from_utf8(bytes)?.trim_end_matches(['\r', '\n']);
    let plain = format!("{expected}  {archive}");
    let binary = format!("{expected} *{archive}");
    ensure!(
        text == plain || text == binary,
        "Checksum must name only the exact release archive with its canonical SHA-256"
    );
    Ok(())
}

// Decode gzip under the pre-existing expanded archive bound. Parse raw USTAR
// headers before interpreting sizes or extensions; PAX, GNU extensions, links
// and directories are not part of the four-file ALGAL release format.
fn expanded_archive(archive: &Path) -> Result<Vec<u8>> {
    let mut command = Command::new("/usr/bin/gzip");
    command
        .env_remove("GZIP")
        .args(["--decompress", "--stdout", "--"])
        .arg(archive);
    let output = run_bounded(&mut command, 101_000_000, 8192, Duration::from_secs(30))?;
    ensure!(
        output.status.success(),
        "Release archive gzip stream is invalid"
    );
    Ok(output.stdout)
}

fn octal(bytes: &[u8]) -> Result<usize> {
    let value = std::str::from_utf8(bytes)?.trim_matches([' ', '\0']);
    ensure!(
        !value.is_empty() && value.bytes().all(|b| (b'0'..=b'7').contains(&b)),
        "Archive integer is not canonical octal"
    );
    Ok(usize::from_str_radix(value, 8)?)
}

fn tar_name(bytes: &[u8]) -> Result<&str> {
    let length = bytes.iter().position(|b| *b == 0).unwrap_or(bytes.len());
    ensure!(
        bytes[length..].iter().all(|b| *b == 0),
        "Archive name has data after its terminator"
    );
    Ok(std::str::from_utf8(&bytes[..length])?)
}

fn archive_members(expanded: &[u8]) -> Result<std::collections::BTreeMap<String, &[u8]>> {
    ensure!(
        expanded.len() <= 101_000_000 && expanded.len().is_multiple_of(512),
        "Expanded release archive byte limit or alignment"
    );
    let mut members = std::collections::BTreeMap::new();
    let mut offset = 0;
    while offset + 512 <= expanded.len() {
        let header = &expanded[offset..offset + 512];
        if header.iter().all(|byte| *byte == 0) {
            ensure!(
                expanded.len() - offset >= 1024 && expanded[offset..].iter().all(|byte| *byte == 0),
                "Archive needs two zero end blocks without trailing data"
            );
            ensure!(
                members.len() == 4,
                "Release archive must contain exactly four files"
            );
            return Ok(members);
        }
        ensure!(
            members.len() < 4
                && matches!(header[156], 0 | b'0')
                && &header[257..263] == b"ustar\0"
                && header[157..257].iter().all(|byte| *byte == 0),
            "Unexpected archive entry or extension"
        );
        let checksum: usize = header
            .iter()
            .enumerate()
            .map(|(index, byte)| {
                if (148..156).contains(&index) {
                    32
                } else {
                    usize::from(*byte)
                }
            })
            .sum();
        ensure!(
            octal(&header[148..156])? == checksum,
            "Archive header checksum mismatch"
        );
        let size = octal(&header[124..136])?;
        ensure!(size <= BINARY_LIMIT, "Archive member byte limit");
        let name = tar_name(&header[..100])?;
        let prefix = tar_name(&header[345..500])?;
        let name = if prefix.is_empty() {
            name.to_owned()
        } else {
            format!("{prefix}/{name}")
        };
        offset += 512;
        let end = offset.checked_add(size).context("Archive size overflow")?;
        ensure!(end <= expanded.len(), "Truncated archive member");
        ensure!(
            members.insert(name, &expanded[offset..end]).is_none(),
            "Duplicate archive member"
        );
        offset = end.div_ceil(512) * 512;
    }
    bail!("Archive has no complete end marker")
}

struct Package {
    binary_sha256: String,
    commit: String,
    metadata: serde_json::Value,
    bytes: Vec<u8>,
}

fn unpack(stage: &Stage<'_>, published: &Published) -> Result<Package> {
    let archive = stage.directory.path.join("archive");
    let prefix = published
        .archive
        .name
        .strip_suffix(".tar.gz")
        .context("Expected a tar.gz release archive")?;
    let expanded = expanded_archive(&archive)?;
    let members = archive_members(&expanded)?;
    let wanted: Vec<_> = ["LICENSE", "bin/algal", "release.json", "smoke.py"]
        .map(|name| format!("{prefix}/{name}"))
        .into();
    ensure!(
        members.keys().collect::<Vec<_>>() == wanted.iter().collect::<Vec<_>>(),
        "Release archive paths differ from the exact release layout"
    );
    let bytes = members[&format!("{prefix}/release.json")].to_vec();
    ensure!(bytes.len() <= METADATA_LIMIT, "Release metadata byte limit");
    let metadata: serde_json::Value = serde_json::from_slice(&bytes)?;
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
    ensure!(
        metadata
            .as_object()
            .is_some_and(|object| object.len() == fields.len()
                && object.keys().all(|key| fields.contains(&key.as_str()))),
        "Release metadata has unexpected fields"
    );
    let version = product().version(&published.release.tag_name)?;
    let base = format!("{}.{}.{}", version.major, version.minor, version.patch);
    let commit = metadata["commit"]
        .as_str()
        .context("Missing full release commit")?
        .to_owned();
    ensure!(
        commit.len() == 40
            && commit
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)),
        "Release commit must be a full lowercase SHA"
    );
    let build = &metadata["build"];
    let build_fields = [
        "contract",
        "version",
        "sourceCommit",
        "sourceState",
        "sourceInputsSha256",
        "target",
        "rustc",
        "exactTagsAtBuild",
    ];
    ensure!(
        build
            .as_object()
            .is_some_and(|object| object.len() == build_fields.len()
                && object
                    .keys()
                    .all(|key| build_fields.contains(&key.as_str()))),
        "Release build identity has unexpected fields"
    );
    ensure!(
        metadata["contract"] == "algal.native-release.v1"
            && metadata["tag"] == published.release.tag_name
            && metadata["version"] == base
            && metadata["target"] == super::platform()
            && metadata["sourceState"] == "clean"
            && metadata["signed"].is_boolean()
            && (!cfg!(target_os = "macos") || metadata["signed"] == true)
            && metadata["smoke"].is_object()
            && metadata["minimumPlatform"]
                .as_str()
                .is_some_and(|value| value.len() <= 256),
        "Release package identity or signature declaration is invalid"
    );
    ensure!(
        build["contract"] == "algal.native-build.v1"
            && build["version"] == base
            && build["sourceCommit"] == commit
            && build["sourceState"] == "clean"
            && build["target"] == super::platform()
            && build["rustc"] == metadata["rustc"]
            && build["rustc"]
                .as_str()
                .is_some_and(|value| value.starts_with("rustc ") && value.len() <= 512)
            && build["sourceInputsSha256"]
                .as_str()
                .is_some_and(valid_digest)
            && build["exactTagsAtBuild"]
                .as_array()
                .is_some_and(|tags| tags.len() <= 64
                    && tags
                        .iter()
                        .all(|tag| tag.as_str().is_some_and(|value| value.len() <= 128))
                    && (published.release.tag_name == LEGACY_RELEASE
                        || tags.iter().any(|tag| tag == &published.release.tag_name))),
        "Release build identity does not bind the full tag, source and target"
    );
    let sidecar: serde_json::Value = serde_json::from_slice(
        &stage
            .directory
            .read("metadata", METADATA_LIMIT)?
            .context("Missing verified release metadata")?,
    )?;
    let mut expected_sidecar = metadata.clone();
    expected_sidecar["archive"] = published.archive.name.clone().into();
    expected_sidecar["archiveSha256"] = published.archive_sha256.clone().into();
    ensure!(
        sidecar == expected_sidecar,
        "Archive release record differs from the verified release sidecar"
    );
    let binary = members[&format!("{prefix}/bin/algal")];
    let binary_sha256 = digest(binary);
    ensure!(
        !binary.is_empty() && metadata["binarySha256"] == binary_sha256,
        "Executable differs from the release record"
    );
    stage.directory.write_new("algal", binary, true)?;
    Ok(Package {
        binary_sha256,
        commit,
        metadata,
        bytes,
    })
}

/// A hash-keyed record can be published before replacing the executable: it
/// cannot label different bytes, and old records remain valid after rollback.
fn publish_package(bin: &Directory, package: &Package) -> Result<()> {
    let records = Directory::open(&bin.path.join(".algal-releases"), true, false)?;
    let name = format!("{}.json", package.binary_sha256);
    match records.read(&name, METADATA_LIMIT)? {
        Some(bytes) => ensure!(
            bytes == package.bytes,
            "Conflicting hash-keyed ALGAL release record"
        ),
        None => records.write_new(&name, &package.bytes, false)?,
    }
    Ok(())
}

fn verify_candidate(stage: &Stage<'_>, tag: &str, package: &Package) -> Result<()> {
    let candidate = stage.directory.path.join("algal");
    #[cfg(target_os = "macos")]
    {
        let mut command = Command::new("/usr/bin/codesign");
        command
            .args([
                "--verify",
                "--strict",
                "--check-notarization",
                "--test-requirement",
                MACOS_REQUIREMENT,
            ])
            .arg(&candidate);
        ensure!(
            run_bounded(&mut command, 8192, 8192, Duration::from_secs(30))?
                .status
                .success(),
            "Release does not have ALGAL's required Apple Developer ID signature and notarization"
        );
        let mut command = Command::new("/usr/bin/codesign");
        command.args(["--display", "--verbose=4"]).arg(&candidate);
        let output = run_bounded(&mut command, 8192, 8192, Duration::from_secs(10))?;
        ensure!(
            output.status.success(),
            "Release signature inspection failed"
        );
        let signature = String::from_utf8(output.stderr)? + &String::from_utf8(output.stdout)?;
        ensure!(
            signature
                .lines()
                .any(|line| line.starts_with("CodeDirectory ")
                    && line.contains("flags=")
                    && line
                        .split_once('(')
                        .and_then(|(_, rest)| rest.split_once(')'))
                        .is_some_and(|(flags, _)| flags.split(',').any(|flag| flag == "runtime"))),
            "Release lacks hardened runtime"
        );
        ensure!(
            signature.lines().any(|line| line
                .strip_prefix("Timestamp=")
                .is_some_and(|stamp| !stamp.trim().is_empty())),
            "Release lacks a secure timestamp"
        );
    }
    let mut command = Command::new(&candidate);
    command.arg("--version");
    let output = run_bounded(&mut command, 4096, 4096, Duration::from_secs(10))?;
    ensure!(
        output.status.success()
            && output.stdout
                == format!("algal {}\n", package.metadata["version"].as_str().unwrap()).as_bytes(),
        "Release executable reports the wrong base version"
    );

    let mut command = Command::new(&candidate);
    command.arg("__build-identity");
    let output = run_bounded(&mut command, 4096, 4096, Duration::from_secs(10))?;
    ensure!(
        output.status.success(),
        "Release executable cannot report its embedded identity"
    );
    let identity: serde_json::Value = serde_json::from_slice(&output.stdout)?;
    ensure!(
        identity["schema"] == "algal.build.v1"
            && identity["releaseTag"] == tag
            && identity["platform"] == super::platform()
            && identity["buildSha"] == package.commit
            && identity["build"] == package.metadata["build"],
        "Release executable is not an official build for this tag and platform"
    );
    Ok(())
}

fn eligible_destination(executable: &Path) -> Result<()> {
    ensure!(
        !rustix::process::geteuid().is_root(),
        "Install ALGAL as your ordinary user; root-owned installations do not self-update"
    );
    ensure!(executable.is_absolute(), "Install prefix must be absolute");
    for component in executable.components() {
        ensure!(
            !matches!(
                component.as_os_str().to_str(),
                Some("Cellar" | ".cargo" | "target" | "node_modules" | ".git")
            ),
            "Cargo, Homebrew and source installations must use their original update workflow"
        );
    }
    for parent in executable.ancestors().skip(1) {
        ensure!(
            !(parent.join(".git").exists() && parent.join("Cargo.toml").exists()),
            "Install destination is inside a source checkout; use its source workflow"
        );
    }
    Ok(())
}

fn install_update(request: &InstallRequest<'_>) -> Result<()> {
    let target = &request.installation.receipt.executable;
    eligible_destination(target)?;
    let bin = Directory::open(
        target.parent().context("Install target has no parent")?,
        false,
        false,
    )?;
    let state = Directory::open(
        request
            .paths
            .receipt
            .parent()
            .context("Receipt has no parent")?,
        false,
        true,
    )?;
    let mut stage = Stage::new(&bin)?;
    let published = Published::fetch(request.product, &request.release.tag_name)?;
    published.matches_selected(request.release)?;
    published.download(request.product, &stage)?;
    let package = unpack(&stage, &published)?;
    let binary_sha = package.binary_sha256.clone();
    verify_candidate(&stage, &published.release.tag_name, &package)?;
    let receipt = published.receipt(target, binary_sha, false, &package.commit);
    let old = snapshot(&bin, &state, &stage)?;
    request.revalidate()?;
    replace(
        &bin,
        &state,
        &mut stage,
        &old,
        &receipt,
        || {
            request.revalidate()?;
            publish_package(&bin, &package)?;
            Ok(())
        },
        || {
            request.publish_receipt(&receipt)?;
            Ok(())
        },
    )
}

struct Previous {
    binary_sha256: Option<String>,
    receipt: Option<Vec<u8>>,
}

fn snapshot(bin: &Directory, state: &Directory, stage: &Stage<'_>) -> Result<Previous> {
    let binary = bin.read("algal", BINARY_LIMIT)?;
    if let Some(bytes) = &binary {
        stage.directory.write_new("previous", bytes, true)?;
        stage.directory.copy_mode("previous", bin, "algal")?;
    }
    let receipt = state.read("install.json", RECEIPT_LIMIT)?;
    if let Some(bytes) = &receipt {
        stage.directory.write_new("old-receipt", bytes, false)?;
    }
    Ok(Previous {
        binary_sha256: binary.as_deref().map(digest),
        receipt,
    })
}

/// Keep binary replacement, receipt publication and rollback in the lock owner.
/// If rollback fails, retain the private backup and fail closed on the next run.
fn replace(
    bin: &Directory,
    state: &Directory,
    stage: &mut Stage<'_>,
    old: &Previous,
    receipt: &InstallReceipt,
    revalidate: impl FnOnce() -> Result<()>,
    publish: impl FnOnce() -> Result<()>,
) -> Result<()> {
    ensure!(
        bin.read("algal", BINARY_LIMIT)?.as_deref().map(digest) == old.binary_sha256,
        "Installed bytes changed before replacement"
    );
    ensure!(
        state.read("install.json", RECEIPT_LIMIT)? == old.receipt,
        "Install receipt changed before replacement"
    );
    ensure!(
        stage
            .directory
            .read("algal", BINARY_LIMIT)?
            .as_deref()
            .map(digest)
            .as_deref()
            == Some(&receipt.binary_sha256),
        "Staged binary changed after verification"
    );
    revalidate()?;
    let result: Result<()> = (|| {
        stage.directory.rename("algal", bin, "algal")?;
        publish()?;
        Ok(())
    })();
    if let Err(error) = result {
        let rollback: Result<()> = (|| {
            let now = bin.read("algal", BINARY_LIMIT)?.as_deref().map(digest);
            ensure!(
                now == old.binary_sha256 || now.as_deref() == Some(&receipt.binary_sha256),
                "Installed binary changed outside the transaction; backup was retained"
            );
            if old.binary_sha256.is_some() {
                stage.directory.rename("previous", bin, "algal")?;
            } else {
                bin.remove("algal", false)?;
            }
            if old.receipt.is_some() {
                stage
                    .directory
                    .rename("old-receipt", state, "install.json")?;
            } else {
                state.remove("install.json", false)?;
            }
            Ok(())
        })();
        if let Err(rollback) = rollback {
            stage.preserve = true;
            bail!(
                "Installation failed: {error:#}; restoration failed: {rollback:#}. Verified backup retained at {}",
                stage.directory.path.display()
            );
        }
        return Err(error).context("Installation failed; original files were restored");
    }
    Ok(())
}

fn verify_previous(
    profile: &Product,
    published: &Published,
    bin: &Directory,
    current: Option<&[u8]>,
    receipt: Option<&[u8]>,
    explicit_pin: bool,
) -> Result<bool> {
    let Some(binary) = current else {
        ensure!(
            receipt.is_none(),
            "An install receipt exists without its executable"
        );
        return Ok(explicit_pin);
    };
    if let Some(bytes) = receipt {
        let old: InstallReceipt =
            serde_json::from_slice(bytes).context("Read previous native install receipt")?;
        ensure!(
            old.schema == InstallReceipt::SCHEMA
                && old.product == profile.id
                && old.repository == profile.repository
                && old.kind == InstallationKind::NativeRelease
                && old.platform == profile.platform
                && old.executable == bin.path.join("algal")
                && old.binary_sha256 == digest(binary)
                && old.release_id != 0
                && valid_digest(&old.archive_sha256)
                && profile
                    .asset_names(&old.release_tag)?
                    .contains(&old.archive_name),
            "Previous install receipt does not match the installed native release"
        );
        ensure!(
            !old.pinned || explicit_pin || old.release_tag == published.release.tag_name,
            "This install is pinned; set ALGAL_VERSION to explicitly select a replacement version"
        );
        return Ok(old.pinned || explicit_pin);
    }
    // The older release was mutable and unsigned. Only its fixed reviewed byte
    // pins may migrate; new candidates still require the normal signing checks.
    let current_hash = digest(binary);
    if legacy::matches(profile, &current_hash, binary.len())? {
        return Ok(explicit_pin);
    }
    // Accept the following signing release only with canonical immutable proof.
    let legacy = Published::fetch(profile, LEGACY_RELEASE)
        .context("Cannot verify the pre-update installation; use a new ALGAL_INSTALL_PREFIX")?;
    let stage = Stage::new(bin)?;
    legacy.download(profile, &stage)?;
    let old_hash = unpack(&stage, &legacy)?.binary_sha256;
    ensure!(
        current_hash == old_hash,
        "Existing file is not a verified {HISTORICAL_RELEASE} or {LEGACY_RELEASE} release; use its source/package-manager update workflow or select a new ALGAL_INSTALL_PREFIX"
    );
    Ok(explicit_pin)
}

pub(super) fn initial_install(args: &InitialInstall) -> Result<()> {
    let tag = released_tag()?;
    let profile = product();
    let target = args.prefix.join("bin/algal");
    eligible_destination(&target)?;
    let bin = Directory::open(
        target.parent().context("Install target has no parent")?,
        true,
        false,
    )?;
    let mut stage = Stage::new(&bin)?;
    let published = Published::fetch(&profile, tag)?;
    published.import(&stage, &args.archive, &args.checksum)?;
    let package = unpack(&stage, &published)?;
    let binary_sha = package.binary_sha256.clone();
    let running = std::env::current_exe()?.canonicalize()?;
    ensure!(
        digest(&read_path(&running, BINARY_LIMIT)?) == binary_sha,
        "Installer executable differs from the verified release archive"
    );
    verify_candidate(&stage, tag, &package)?;
    let pinned = enroll_verified(
        &profile,
        &published,
        &bin,
        &mut stage,
        &target,
        &package,
        args.pinned,
    )?;
    println!(
        "Installed {} ({}); automatic updates {}",
        target.display(),
        tag,
        if pinned {
            "off for this pinned version"
        } else {
            "enabled by default"
        }
    );
    Ok(())
}

fn enroll_verified(
    profile: &Product,
    published: &Published,
    bin: &Directory,
    stage: &mut Stage<'_>,
    target: &Path,
    package: &Package,
    explicit_pin: bool,
) -> Result<bool> {
    let update_paths = paths(target)?;
    let coordination = update_paths
        .receipt
        .parent()
        .context("Receipt has no parent")?;
    let state_name = ".hraness-cli-update-algal";
    // Verify an old unmanaged installation before creating the coordination
    // authority; a failed ownership check must not disable the old executable.
    let current = bin.read("algal", BINARY_LIMIT)?;
    let old_receipt = match std::fs::symlink_metadata(coordination) {
        Ok(_) => Directory::open(coordination, false, true)?.read("install.json", RECEIPT_LIMIT)?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(error.into()),
    };
    let pinned = if old_receipt.is_none()
        && current.as_deref().map(digest).as_deref() == Some(&package.binary_sha256)
    {
        explicit_pin
    } else {
        verify_previous(
            profile,
            published,
            bin,
            current.as_deref(),
            old_receipt.as_deref(),
            explicit_pin,
        )?
    };
    let created_state = bin.mkdir(state_name)?;
    let state = Directory::open(coordination, false, true)?;
    let lock = state.lock()?;
    let outcome = (|| {
        let old = snapshot(bin, &state, stage)?;
        ensure!(
            old.binary_sha256 == current.as_deref().map(digest) && old.receipt == old_receipt,
            "Installation changed while its release identity was checked; retry installation"
        );
        let receipt = published.receipt(
            target,
            package.binary_sha256.clone(),
            pinned,
            &package.commit,
        );
        replace(
            bin,
            &state,
            stage,
            &old,
            &receipt,
            || {
                lock.validate()?;
                publish_package(bin, package)?;
                Ok(())
            },
            || {
                receipt.write_verified(profile, &update_paths.receipt)?;
                Ok(())
            },
        )
    })();
    if outcome.is_err() && created_state && !stage.preserve {
        // No managed install survived this failed first enrollment. Remove only
        // our freshly created empty authority, while still holding its lock.
        let _ = state.remove("activity.lock", false);
        let _ = bin.remove(state_name, true);
    }
    outcome?;
    Ok(pinned)
}

#[cfg(test)]
mod tests {
    #[test]
    #[cfg(target_os = "macos")]
    fn macos_requirement_is_compilable_inline_source() {
        let mut command = Command::new("/usr/bin/csreq");
        command.args(["-r", MACOS_REQUIREMENT, "-t"]);
        let output = run_bounded(&mut command, 8192, 8192, Duration::from_secs(10)).unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    use super::*;
    use hraness_cli_update::{
        ReleaseSource, RunningIdentity, StartupContext, StartupOutcome, Updater,
    };
    use std::fs;
    use std::os::unix::fs::{PermissionsExt, symlink};
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};

    static SERIAL: AtomicU64 = AtomicU64::new(0);

    struct Fixture {
        root: PathBuf,
    }
    impl Fixture {
        fn new() -> Self {
            let base = std::env::temp_dir().canonicalize().unwrap();
            let root = base.join(format!(
                "algal-native-test-{}-{}",
                std::process::id(),
                SERIAL.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir(&root).unwrap();
            fs::set_permissions(&root, fs::Permissions::from_mode(0o700)).unwrap();
            Self { root }
        }
        fn bin(&self) -> Directory {
            Directory::open(&self.root.join("bin"), true, false).unwrap()
        }
        fn state(&self) -> Directory {
            Directory::open(&self.root.join("bin/.hraness-cli-update-algal"), true, true).unwrap()
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.root);
        }
    }

    fn metadata() -> serde_json::Value {
        let names = product().asset_names("v1.0.0-vm.1").unwrap();
        serde_json::json!({
            "id":42,"tag_name":"v1.0.0-vm.1","draft":false,"prerelease":true,"immutable":true,
            "assets": names.iter().enumerate().map(|(index, name)| serde_json::json!({
                "id": index + 1, "name":name, "size":123,
                "browser_download_url":format!("https://github.com/hraness/algal/releases/download/v1.0.0-vm.1/{name}"),
                "digest":format!("sha256:{}", "a".repeat(64)),
            })).collect::<Vec<_>>()
        })
    }

    fn published() -> Published {
        Published::parse(
            &product(),
            "v1.0.0-vm.1",
            &serde_json::to_vec(&metadata()).unwrap(),
        )
        .unwrap()
    }

    fn package(binary: &[u8]) -> Package {
        let commit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        let metadata = serde_json::json!({
            "contract":"algal.native-release.v1", "tag":"v1.0.0-vm.1", "version":"1.0.0",
            "commit":commit, "sourceState":"clean", "target":super::super::platform(),
            "rustc":"rustc fixture", "minimumPlatform":"fixture", "signed":cfg!(target_os = "macos"),
            "binarySha256":digest(binary), "smoke":{},
            "build":{
                "contract":"algal.native-build.v1", "version":"1.0.0", "sourceCommit":commit,
                "sourceState":"clean", "sourceInputsSha256":"b".repeat(64),
                "target":super::super::platform(), "rustc":"rustc fixture",
                "exactTagsAtBuild":["v1.0.0-vm.1"]
            }
        });
        Package {
            binary_sha256: digest(binary),
            commit: commit.into(),
            bytes: serde_json::to_vec(&metadata).unwrap(),
            metadata,
        }
    }

    #[test]
    fn canonical_release_proof_requires_immutable_assets_and_digests() {
        published();
        let mut variants = vec![];
        let mut value = metadata();
        value["immutable"] = false.into();
        variants.push(value);
        let mut value = metadata();
        value["assets"][0]["digest"] = serde_json::Value::Null;
        variants.push(value);
        let mut value = metadata();
        value["assets"][0]["digest"] = format!("sha256:{}", "A".repeat(64)).into();
        variants.push(value);
        let mut value = metadata();
        value["assets"][0]["browser_download_url"] = "https://example.test/algal".into();
        variants.push(value);
        let mut value = metadata();
        value["tag_name"] = "v1.0.1-vm.1".into();
        variants.push(value);
        for value in variants {
            assert!(
                Published::parse(
                    &product(),
                    "v1.0.0-vm.1",
                    &serde_json::to_vec(&value).unwrap()
                )
                .is_err()
            );
        }
    }

    #[test]
    fn checksum_binds_one_exact_archive() {
        let hash = "b".repeat(64);
        for text in [
            format!("{hash}  exact.tar.gz\n"),
            format!("{hash} *exact.tar.gz\r\n"),
        ] {
            verify_checksum(text.as_bytes(), "exact.tar.gz", &hash).unwrap();
        }
        for text in [
            format!("{hash}  other.tar.gz\n"),
            format!("{hash}  exact.tar.gz\n{hash}  other.tar.gz\n"),
            "b".repeat(64),
        ] {
            assert!(verify_checksum(text.as_bytes(), "exact.tar.gz", &hash).is_err());
        }
    }

    #[test]
    fn local_archive_cannot_claim_canonical_release_ownership() {
        let fixture = Fixture::new();
        let bin = fixture.bin();
        let stage = Stage::new(&bin).unwrap();
        stage
            .directory
            .write_new("archive", b"foreign archive", false)
            .unwrap();
        stage
            .directory
            .write_new("checksum", b"foreign checksum", false)
            .unwrap();
        assert!(published().verify_staged(&stage, true).is_err());
        assert!(fixture.bin().read("algal", BINARY_LIMIT).unwrap().is_none());
    }

    fn make_archive(source: &Path, archive: &Path, members: &[&str]) {
        let mut command = Command::new("/usr/bin/tar");
        command
            .env("COPYFILE_DISABLE", "1")
            .env_remove("TAR_OPTIONS")
            .arg("--format=ustar")
            .arg("-czf")
            .arg(archive)
            .arg("-C")
            .arg(source)
            .args(members);
        assert!(
            run_bounded(&mut command, 8192, 8192, Duration::from_secs(10))
                .unwrap()
                .status
                .success()
        );
    }

    #[test]
    fn archive_refuses_links_extensions_and_extra_members_without_execution() {
        let fixture = Fixture::new();
        let bin = fixture.bin();
        let stage = Stage::new(&bin).unwrap();
        let source = fixture.root.join("source");
        fs::create_dir(&source).unwrap();
        for name in ["one", "two", "three", "four", "extra"] {
            fs::write(source.join(name), b"not executed").unwrap();
        }
        let archive = stage.directory.path.join("archive");
        make_archive(&source, &archive, &["one", "two", "three", "four"]);
        let expanded = expanded_archive(&archive).unwrap();
        assert_eq!(archive_members(&expanded).unwrap().len(), 4);
        let mut extension = expanded.clone();
        extension[156] = b'x';
        assert!(archive_members(&extension).is_err());
        let mut huge = expanded.clone();
        huge[124..136].copy_from_slice(b"77777777777\0");
        assert!(archive_members(&huge).is_err());
        fs::remove_file(&archive).unwrap();
        make_archive(&source, &archive, &["one", "two", "three", "four", "extra"]);
        assert!(archive_members(&expanded_archive(&archive).unwrap()).is_err());
        fs::remove_file(&archive).unwrap();
        fs::remove_file(source.join("one")).unwrap();
        symlink("/bin/sh", source.join("one")).unwrap();
        make_archive(&source, &archive, &["one", "two", "three", "four"]);
        assert!(archive_members(&expanded_archive(&archive).unwrap()).is_err());
    }

    #[test]
    fn release_record_binds_binary_tag_target_build_and_sidecar() {
        for invalid in 0..8 {
            let fixture = Fixture::new();
            let bin = fixture.bin();
            let stage = Stage::new(&bin).unwrap();
            let mut published = published();
            let prefix = published.archive.name.strip_suffix(".tar.gz").unwrap();
            let source = fixture.root.join("source");
            fs::create_dir_all(source.join(prefix).join("bin")).unwrap();
            let mut record = package(b"candidate bytes").metadata;
            match invalid {
                1 => record["tag"] = "v1.0.0-vm.2".into(),
                2 => record["binarySha256"] = "c".repeat(64).into(),
                3 => record["target"] = "wrong-target".into(),
                4 => record["build"]["sourceCommit"] = "d".repeat(40).into(),
                5 => record["build"]["exactTagsAtBuild"] = serde_json::json!([]),
                6 => record["unexpected"] = true.into(),
                _ => {}
            }
            let members: Vec<_> = ["LICENSE", "bin/algal", "release.json", "smoke.py"]
                .map(|name| format!("{prefix}/{name}"))
                .into();
            for (name, bytes) in members.iter().zip([
                b"fixture license".to_vec(),
                b"candidate bytes".to_vec(),
                serde_json::to_vec(&record).unwrap(),
                b"fixture smoke".to_vec(),
            ]) {
                fs::write(source.join(name), bytes).unwrap();
            }
            let archive = stage.directory.path.join("archive");
            make_archive(
                &source,
                &archive,
                &members.iter().map(String::as_str).collect::<Vec<_>>(),
            );
            published.archive_sha256 = digest(&fs::read(archive).unwrap());
            let mut sidecar = record;
            sidecar["archive"] = published.archive.name.clone().into();
            sidecar["archiveSha256"] = published.archive_sha256.clone().into();
            if invalid == 7 {
                sidecar["commit"] = "e".repeat(40).into();
            }
            stage
                .directory
                .write_new("metadata", &serde_json::to_vec(&sidecar).unwrap(), false)
                .unwrap();
            let result = unpack(&stage, &published);
            if invalid == 0 {
                assert_eq!(result.unwrap().binary_sha256, digest(b"candidate bytes"));
                assert_eq!(
                    stage
                        .directory
                        .read("algal", BINARY_LIMIT)
                        .unwrap()
                        .unwrap(),
                    b"candidate bytes"
                );
            } else {
                assert!(result.is_err(), "invalid record variant {invalid}");
                assert!(
                    stage
                        .directory
                        .read("algal", BINARY_LIMIT)
                        .unwrap()
                        .is_none()
                );
            }
        }
    }

    #[test]
    fn rollback_restores_binary_and_receipt_after_publication_failure() {
        let fixture = Fixture::new();
        let bin = fixture.bin();
        let state = fixture.state();
        bin.write_new("algal", b"old binary", true).unwrap();
        fs::set_permissions(bin.path.join("algal"), fs::Permissions::from_mode(0o700)).unwrap();
        state
            .write_new("install.json", b"old receipt", false)
            .unwrap();
        let mut stage = Stage::new(&bin).unwrap();
        stage
            .directory
            .write_new("algal", b"new binary", true)
            .unwrap();
        let old = snapshot(&bin, &state, &stage).unwrap();
        let old_package = package(b"old binary");
        let new_package = package(b"new binary");
        publish_package(&bin, &old_package).unwrap();
        let receipt = published().receipt(
            &bin.path.join("algal"),
            digest(b"new binary"),
            false,
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        );
        let result = replace(
            &bin,
            &state,
            &mut stage,
            &old,
            &receipt,
            || publish_package(&bin, &new_package),
            || {
                state.remove("install.json", false)?;
                state.write_new("install.json", b"partially published receipt", false)?;
                bail!("injected receipt publication failure")
            },
        );
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("original files were restored")
        );
        assert_eq!(
            bin.read("algal", BINARY_LIMIT).unwrap().unwrap(),
            b"old binary"
        );
        assert_eq!(
            fs::metadata(bin.path.join("algal"))
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o700
        );
        assert_eq!(
            state.read("install.json", RECEIPT_LIMIT).unwrap().unwrap(),
            b"old receipt"
        );
        let records = Directory::open(&bin.path.join(".algal-releases"), false, false).unwrap();
        for record in [old_package, new_package] {
            assert_eq!(
                records
                    .read(&format!("{}.json", record.binary_sha256), METADATA_LIMIT)
                    .unwrap()
                    .unwrap(),
                record.bytes
            );
        }
    }

    #[test]
    fn failed_final_revalidation_performs_no_installed_writes() {
        let fixture = Fixture::new();
        let bin = fixture.bin();
        let state = fixture.state();
        bin.write_new("algal", b"old", true).unwrap();
        state.write_new("install.json", b"old", false).unwrap();
        let mut stage = Stage::new(&bin).unwrap();
        stage.directory.write_new("algal", b"new", true).unwrap();
        let old = snapshot(&bin, &state, &stage).unwrap();
        let receipt = published().receipt(
            &bin.path.join("algal"),
            digest(b"new"),
            false,
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        );
        assert!(
            replace(
                &bin,
                &state,
                &mut stage,
                &old,
                &receipt,
                || bail!("policy disabled"),
                || panic!("publication must not run")
            )
            .is_err()
        );
        assert_eq!(bin.read("algal", BINARY_LIMIT).unwrap().unwrap(), b"old");
        assert_eq!(
            state.read("install.json", RECEIPT_LIMIT).unwrap().unwrap(),
            b"old"
        );
    }

    #[test]
    fn installed_symlinks_and_shared_files_are_never_replaced() {
        let fixture = Fixture::new();
        let bin = fixture.bin();
        let foreign = fixture.root.join("foreign");
        fs::write(&foreign, b"preserve").unwrap();
        symlink(&foreign, bin.path.join("algal")).unwrap();
        assert!(bin.read("algal", BINARY_LIMIT).is_err());
        fs::remove_file(bin.path.join("algal")).unwrap();
        fs::hard_link(&foreign, bin.path.join("algal")).unwrap();
        assert!(bin.read("algal", BINARY_LIMIT).is_err());
        assert_eq!(fs::read(&foreign).unwrap(), b"preserve");
    }

    #[test]
    fn manager_and_source_destinations_are_ineligible() {
        for path in [
            "/opt/homebrew/Cellar/algal/1/bin/algal",
            "/home/user/.cargo/bin/algal",
            "/work/target/release/algal",
        ] {
            assert!(eligible_destination(Path::new(path)).is_err());
        }
        let fixture = Fixture::new();
        fs::create_dir(fixture.root.join(".git")).unwrap();
        fs::write(fixture.root.join("Cargo.toml"), b"").unwrap();
        assert!(eligible_destination(&fixture.root.join("bin/algal")).is_err());
    }

    #[test]
    fn initial_enrollment_refuses_an_unpublished_source_build() {
        if matches!(product().running_identity, RunningIdentity::Source) {
            let args = InitialInstall {
                archive: "/missing".into(),
                checksum: "/missing".into(),
                prefix: "/missing".into(),
                pinned: false,
            };
            assert!(
                initial_install(&args)
                    .unwrap_err()
                    .to_string()
                    .contains("source build")
            );
        }
    }

    #[test]
    fn reinstall_preserves_pins_and_rejects_foreign_receipts() {
        let fixture = Fixture::new();
        let bin = fixture.bin();
        let published = published();
        let profile = product();
        let binary = b"verified binary";
        let mut receipt = published.receipt(
            &bin.path.join("algal"),
            digest(binary),
            true,
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        );
        let bytes = serde_json::to_vec(&receipt).unwrap();
        assert!(
            verify_previous(
                &profile,
                &published,
                &bin,
                Some(binary),
                Some(&bytes),
                false
            )
            .unwrap()
        );
        receipt.release_tag = "v0.9.0-vm.1".into();
        receipt.archive_name = profile.asset_names("v0.9.0-vm.1").unwrap()[0].clone();
        let bytes = serde_json::to_vec(&receipt).unwrap();
        assert!(
            verify_previous(
                &profile,
                &published,
                &bin,
                Some(binary),
                Some(&bytes),
                false
            )
            .is_err()
        );
        assert!(
            verify_previous(&profile, &published, &bin, Some(binary), Some(&bytes), true).unwrap()
        );
        receipt.kind = InstallationKind::Cargo;
        assert!(
            verify_previous(
                &profile,
                &published,
                &bin,
                Some(binary),
                Some(&serde_json::to_vec(&receipt).unwrap()),
                true
            )
            .is_err()
        );
    }

    struct NeverNetwork;
    impl ReleaseSource for NeverNetwork {
        fn releases(&self, _: &Product) -> hraness_cli_update::Result<Vec<Release>> {
            panic!("offline command must not fetch")
        }
    }

    #[test]
    fn initial_install_keeps_preferences_separate_from_ownership() {
        let fixture = Fixture::new();
        let bin = fixture.bin();
        bin.write_new("algal", b"source bytes", true).unwrap();
        let target = bin.path.join("algal");
        let profile = product();
        let update_paths = paths(&target).unwrap();
        let updater =
            Updater::for_executable(profile.clone(), update_paths.clone(), target.clone()).unwrap();
        updater
            .execute(
                hraness_cli_update::CommandAction::Disable,
                &NeverNetwork,
                &NativeInstaller,
            )
            .unwrap();
        assert!(update_paths.state_dir.exists());
        assert!(!update_paths.receipt.parent().unwrap().exists());
        bin.remove("algal", false).unwrap();
        let mut stage = Stage::new(&bin).unwrap();
        stage
            .directory
            .write_new("algal", b"verified native bytes", true)
            .unwrap();
        let mut package = package(b"verified native bytes");
        assert!(
            !enroll_verified(
                &profile,
                &published(),
                &bin,
                &mut stage,
                &target,
                &package,
                false
            )
            .unwrap()
        );
        let receipt: InstallReceipt =
            serde_json::from_slice(&fs::read(&update_paths.receipt).unwrap()).unwrap();
        assert_eq!(receipt.binary_sha256, package.binary_sha256);
        assert!(
            update_paths
                .receipt
                .parent()
                .unwrap()
                .join("activity.lock")
                .exists()
        );
        let status = updater
            .execute(
                hraness_cli_update::CommandAction::Status,
                &NeverNetwork,
                &NativeInstaller,
            )
            .unwrap();
        assert_eq!(status.policy, hraness_cli_update::Policy::Disabled);
        package.bytes.push(b' ');
        assert!(publish_package(&bin, &package).is_err());
    }

    #[test]
    fn installer_lock_obeys_the_running_command_sdk_lease() {
        let fixture = Fixture::new();
        let bin = fixture.bin();
        let state = fixture.state();
        bin.write_new("algal", b"release bytes", true).unwrap();
        let target = bin.path.join("algal");
        let paths = paths(&target).unwrap();
        let mut profile = product();
        profile.running_identity = RunningIdentity::Release {
            release_tag: "v1.0.0-vm.1",
            build_sha: Some("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
        };
        let receipt = published().receipt(
            &target,
            digest(b"release bytes"),
            false,
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        );
        receipt.write_verified(&profile, &paths.receipt).unwrap();
        let updater = Updater::for_executable(profile, paths, target.clone()).unwrap();
        let mut context = StartupContext::from_process();
        context.args = vec!["proxy".into(), "serve".into()];
        context.no_update = true;
        let outcome = updater
            .startup(&context, &NeverNetwork, &NativeInstaller)
            .unwrap();
        let StartupOutcome::Continue {
            lease: Some(lease), ..
        } = outcome
        else {
            panic!("command must retain an active lease")
        };
        super::super::verify_expected_hash(&target, &digest(b"release bytes")).unwrap();
        assert!(state.lock().is_err());
        drop(lease);
        state.lock().unwrap();
        bin.write_new("replacement", b"new release bytes", true)
            .unwrap();
        bin.rename("replacement", &bin, "algal").unwrap();
        assert!(super::super::verify_expected_hash(&target, &digest(b"release bytes")).is_err());
        super::super::verify_expected_hash(&target, &digest(b"new release bytes")).unwrap();
    }
}
