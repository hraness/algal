//! Executable maintenance runs before application configuration or provider I/O.
//! Release identity is embedded by the official packaging scripts, never inferred
//! from a receipt, a pathname, the runtime environment, or CARGO's version alone.
use anyhow::{Result, bail};
use clap::{Args, ValueEnum};
use hraness_cli_update::{
    ActiveLease, Channel, CommandAction, CurlGithub, Paths, Product, RunningIdentity,
    StartupContext, StartupOutcome, UpdateResult, Updater,
};
use std::path::{Path, PathBuf};

#[cfg(unix)]
#[path = "self_update/unix.rs"]
mod native;

#[derive(Clone, Copy, Debug, ValueEnum)]
pub(crate) enum Action {
    Install,
    Check,
    Status,
    Enable,
    Disable,
}

#[derive(Args)]
pub(crate) struct UpdateArgs {
    /// Install, check, inspect settings, enable automatic updates, or disable them.
    #[arg(value_enum, default_value = "install")]
    action: Action,
    /// Print the update result as JSON.
    #[arg(long)]
    json: bool,
}

#[derive(Args)]
pub(crate) struct InitialInstall {
    #[arg(long)]
    pub archive: PathBuf,
    #[arg(long)]
    pub checksum: PathBuf,
    #[arg(long)]
    pub prefix: PathBuf,
    /// An explicitly selected version remains fixed.
    #[arg(long)]
    pub pinned: bool,
}

pub(crate) fn product() -> Product {
    Product {
        id: "algal".into(), repository: "hraness/algal".into(), tag_prefix: "v".into(),
        channel: Channel::Prerelease("vm".into()),
        running_identity: match option_env!("ALGAL_BUILD_RELEASE_TAG") {
            Some(tag) if !tag.is_empty() => RunningIdentity::Release { release_tag: tag, build_sha: Some(env!("ALGAL_BUILD_COMMIT")) },
            _ => RunningIdentity::Source,
        },
        executable_name: if cfg!(windows) { "algal.exe" } else { "algal" }.into(),
        platform: platform().into(),
        required_assets: if cfg!(windows) {
            vec!["algal-{version}-{platform}.zip".into(), "algal-{version}-{platform}.zip.sha256".into()]
        } else {
            vec!["algal-{tag}-{platform}.tar.gz".into(), "algal-{tag}-{platform}.tar.gz.sha256".into(), "algal-{tag}-{platform}.release.json".into()]
        },
        require_immutable: true,
        manual_instructions: "Re-run ALGAL's verified installer for native releases. Use cargo install for Cargo copies. Bun and source builds keep their original update workflow. Native release updates support macOS and Linux.".into(),
    }
}

fn platform() -> &'static str {
    env!("ALGAL_BUILD_TARGET")
}

pub(crate) fn paths(executable: &Path) -> Result<Paths> {
    let directory = executable
        .parent()
        .ok_or_else(|| anyhow::anyhow!("executable has no parent"))?
        .join(".hraness-cli-update-algal");
    Ok(Paths {
        receipt: directory.join("install.json"),
        // A source/Cargo user may save an opt-out. Preferences must not create
        // the separate managed-install activity authority without a receipt.
        state_dir: executable
            .parent()
            .unwrap()
            .join(".hraness-cli-update-algal-preferences"),
    })
}

fn updater() -> Result<Updater> {
    let executable = std::env::current_exe()?.canonicalize()?;
    Ok(Updater::new(product(), paths(&executable)?)?)
}

fn client() -> Result<CurlGithub> {
    Ok(CurlGithub::new(if cfg!(windows) {
        "C:/Windows/System32/curl.exe"
    } else {
        "/usr/bin/curl"
    })?)
}

#[cfg(not(unix))]
struct UnsupportedInstaller;
#[cfg(not(unix))]
impl hraness_cli_update::Installer for UnsupportedInstaller {
    fn install(
        &self,
        _: &hraness_cli_update::InstallRequest<'_>,
    ) -> hraness_cli_update::Result<()> {
        Err(hraness_cli_update::Error::new(
            hraness_cli_update::ErrorCode::Unsupported,
            "This platform has no supported native release updater; use its source workflow.",
        ))
    }
}

fn print_result(report: &UpdateResult, json: bool) -> Result<()> {
    if json {
        println!("{}", report.json()?);
    } else {
        println!(
            "ALGAL updates: {:?} (automatic policy: {:?})",
            report.status, report.policy
        );
        if let Some(reason) = &report.reason {
            println!("{reason}");
        }
        if let Some(instructions) = &report.instructions {
            println!("{instructions}");
        }
        if let Some(current) = &report.current {
            println!("Installed: {current}");
        }
        if let Some(available) = &report.latest {
            println!("Available: {available}");
        }
    }
    Ok(())
}

pub(crate) fn explicit(args: &UpdateArgs) -> Result<()> {
    let updater = updater()?;
    let action = match args.action {
        Action::Install => CommandAction::Install,
        Action::Check => CommandAction::Check,
        Action::Status => CommandAction::Status,
        Action::Enable => CommandAction::Enable,
        Action::Disable => CommandAction::Disable,
    };
    let source = client()?;
    #[cfg(unix)]
    let installer = native::NativeInstaller;
    #[cfg(not(unix))]
    let installer = UnsupportedInstaller;
    let report = updater.execute_with_context(
        action,
        &StartupContext {
            exact_version_bound: std::env::var_os("ALGAL_EXPECTED_BINARY_SHA256").is_some(),
            ..StartupContext::from_process()
        },
        &source,
        &installer,
    )?;
    print_result(&report, args.json)
}

pub(crate) fn startup(offline: bool, no_update: bool) -> Result<Option<ActiveLease>> {
    let mut context = StartupContext::from_process();
    context.offline = offline;
    context.no_update |= no_update;
    let expected = std::env::var("ALGAL_EXPECTED_BINARY_SHA256")
        .map(Some)
        .or_else(|error| match error {
            std::env::VarError::NotPresent => Ok(None),
            _ => Err(error),
        })?;
    context.exact_version_bound = expected.is_some();
    #[cfg(unix)]
    {
        context.no_update |= rustix::process::geteuid().is_root();
    }
    let updater = updater()?;
    let source = client()?;
    #[cfg(unix)]
    let installer = native::NativeInstaller;
    #[cfg(not(unix))]
    let installer = UnsupportedInstaller;
    match updater.startup(&context, &source, &installer)? {
        StartupOutcome::Continue { lease, .. } => {
            if let Some(expected) = expected {
                verify_expected_hash(&std::env::current_exe()?, &expected)?;
            }
            Ok(lease)
        }
        StartupOutcome::Reenter(reentry) => reentry.run_and_exit(),
    }
}

// The SDK already has this pin. Recheck after native admission holds its lease,
// closing the SDK's hash-check-to-spawn gap without inventing any new pin.
pub(crate) fn verify_expected_hash(executable: &Path, expected: &str) -> Result<()> {
    use anyhow::ensure;
    use sha2::{Digest, Sha256};
    use std::io::Read;
    ensure!(
        expected.len() == 64
            && expected
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)),
        "Native caller supplied an invalid executable hash"
    );
    let mut options = std::fs::OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
    }
    let file = options.open(executable)?;
    ensure!(
        file.metadata()?.is_file() && file.metadata()?.len() <= 256 * 1024 * 1024,
        "Pinned executable exceeds its byte limit"
    );
    let mut source = file.take(256 * 1024 * 1024 + 1);
    let mut hasher = Sha256::new();
    let mut bytes = [0; 65_536];
    let mut total = 0;
    loop {
        let count = source.read(&mut bytes)?;
        if count == 0 {
            break;
        }
        total += count;
        ensure!(
            total <= 256 * 1024 * 1024,
            "Pinned executable grew beyond its byte limit"
        );
        hasher.update(&bytes[..count]);
    }
    ensure!(
        format!("{:x}", hasher.finalize()) == expected,
        "Pinned native executable changed before command admission"
    );
    Ok(())
}

pub(crate) fn initial_install(args: &InitialInstall) -> Result<()> {
    #[cfg(unix)]
    {
        native::initial_install(args)
    }
    #[cfg(not(unix))]
    {
        let _ = args;
        bail!("This platform has no supported native release updater; use its source workflow.");
    }
}

pub(crate) fn build_identity() {
    let identity = match product().running_identity {
        RunningIdentity::Release { release_tag, .. } => Some(release_tag),
        RunningIdentity::Source => None,
    };
    println!(
        "{}",
        serde_json::json!({"schema":"algal.build.v1","version":env!("CARGO_PKG_VERSION"),"releaseTag":identity,"platform":platform(),"buildSha":env!("ALGAL_BUILD_COMMIT"),"build":algal::build_info::embedded()})
    );
}

#[cfg(unix)]
pub(crate) fn released_tag() -> Result<&'static str> {
    match product().running_identity {
        RunningIdentity::Release { release_tag, .. } => Ok(release_tag),
        RunningIdentity::Source => {
            bail!("This source build cannot enroll as an official release installation.")
        }
    }
}
