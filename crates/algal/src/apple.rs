//! Apple's on-device model for the native CLI: building the `algal-apple`
//! helper without surprises, and saying in plain words why the model can't
//! be used.
//!
//! The reason copy comes from `apple_foundation::Reason::explain`, so ALGAL
//! says the same thing as every other Hraness product. The helper build
//! never opens the macOS "install command line developer tools" dialog on
//! its own: apple-foundation checks `xcode-select -p` first, and ALGAL only
//! offers the installer after telling the person what it is, at a terminal,
//! when they press Enter. Compiler output is captured to a log file.

use crate::error::{Error, Result};
use apple_foundation::{Error as AppleError, Reason, ToolsProblem};
// Who is reading, how a stream renders symbols, and the permission copy all
// come from `hraness-cli-kit`; ALGAL keeps no copy of the shared contract.
pub use hraness_cli_kit::audience::Audience;
use hraness_cli_kit::permissions::{
    self, NoticeKind, PermissionKind, PermissionNeed, ProductRef, RecoveryState, Surface,
};
pub use hraness_cli_kit::style::{Style, Symbol};
use serde_json::{Value, json};
use std::io::{BufRead as _, IsTerminal as _, Write as _};
use std::path::{Path, PathBuf};
use std::time::Duration;

/// What to tell the person about one problem with Apple's model.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Advice {
    pub reason: Reason,
    /// What is wrong, as a sentence.
    pub summary: String,
    /// The one thing to do about it, as a sentence.
    pub fix: String,
    /// A command that does it, when there is one.
    pub next: Option<String>,
    pub settings_url: Option<&'static str>,
}

impl Advice {
    /// `summary fix`, for an error message.
    pub fn message(&self) -> String {
        format!("{} {}", self.summary, self.fix)
    }

    fn open(explained: &apple_foundation::Explanation) -> Option<String> {
        explained
            .command
            .map(str::to_owned)
            .or_else(|| explained.settings_url.map(|url| format!("open {url}")))
    }
}

/// Copy for a reason the model can't be used, with ALGAL's own fixes where
/// the shared copy is product-neutral.
pub fn advice(reason: Reason) -> Advice {
    let explained = reason.explain();
    let next = Advice::open(&explained);
    let fix = match reason {
        Reason::DeviceNotEligible => "Use --gateway-model or --base-url instead.".to_owned(),
        Reason::HelperMissing => "Check the path in --apple-bridge or ALGAL_APPLE_BRIDGE, or unset it so algal builds its own helper.".to_owned(),
        _ => explained.fix,
    };
    Advice {
        reason,
        summary: explained.summary,
        fix,
        next,
        settings_url: explained.settings_url,
    }
}

/// The product's shared identity, for the kit's permission copy.
fn product() -> ProductRef {
    ProductRef::new("algal", "algal")
}

fn tools_advice(problem: &ToolsProblem) -> Advice {
    if *problem == ToolsProblem::NotInstalled {
        // The permissions kit's "missing developer-tools" recovery.
        let need = PermissionNeed::new(
            product(),
            PermissionKind::DeveloperTools,
            "build a small helper",
            "Nothing is installed unless you agree in that window.",
        );
        let rendered =
            permissions::render_recovery(&need, RecoveryState::Missing, Surface::Cli, &env_var);
        let next = rendered
            .next
            .unwrap_or_else(|| "xcode-select --install".to_owned());
        return Advice {
            reason: Reason::HelperMissing,
            summary: rendered.title,
            fix: format!("Run {next}, then try again."),
            next: Some(next),
            settings_url: None,
        };
    }
    let explained = problem.explain();
    Advice {
        reason: Reason::HelperMissing,
        next: Advice::open(&explained),
        settings_url: explained.settings_url,
        summary: explained.summary,
        fix: explained.fix,
    }
}

fn other_advice(summary: String, fix: &str) -> Advice {
    Advice {
        reason: Reason::HelperMissing,
        summary,
        fix: fix.to_owned(),
        next: None,
        settings_url: None,
    }
}

/// The effect error for a request made while the model can't be used.
pub fn unavailable_error(reason: Reason) -> Error {
    Error::new("EFFECT_UNBOUND", advice(reason).message())
}

fn env_var(key: &str) -> Option<String> {
    std::env::var(key).ok()
}

/// The shared "XCODE_TOOLS" notice, shown before ALGAL lets macOS offer to
/// install Apple's command line tools.
pub fn xcode_tools_notice(style: Style, skip_effect: &str) -> String {
    let need = permissions::presets::xcode_tools(product(), skip_effect);
    let rendered = permissions::render_pre_prompt(&need, Surface::Cli, &env_var);
    permissions::format_notice(&rendered, NoticeKind::PrePrompt, true, style)
}

/// The apple-foundation calls the helper build makes, behind a seam so tests
/// never run a compiler or the installer.
pub trait System {
    fn is_current(&self, path: &Path) -> bool;
    fn platform(&self) -> apple_foundation::Result<()>;
    fn tools(&self) -> apple_foundation::Result<()>;
    fn build(&self, path: &Path) -> apple_foundation::Result<PathBuf>;
    fn write_log(&self, path: &Path, text: &str) -> std::io::Result<()>;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Answer {
    Continue,
    Skip,
    Timeout,
}

/// The person at the terminal, behind a seam for the same reason.
pub trait Terminal {
    fn audience(&self) -> Audience;
    /// stdin and stderr are both terminals, so a question can be answered.
    fn interactive(&self) -> bool;
    fn style(&self) -> Style;
    fn notice(&mut self, text: &str);
    fn answer(&mut self, timeout: Duration) -> Answer;
    /// Ask macOS to offer the command line tools (`xcode-select --install`).
    fn open_installer(&mut self) -> std::io::Result<()>;
}

struct AppleSystem;

impl System for AppleSystem {
    fn is_current(&self, path: &Path) -> bool {
        apple_foundation::bridge_is_current(path)
    }
    fn platform(&self) -> apple_foundation::Result<()> {
        apple_foundation::platform_check()
    }
    fn tools(&self) -> apple_foundation::Result<()> {
        apple_foundation::build_tools_check()
    }
    fn build(&self, path: &Path) -> apple_foundation::Result<PathBuf> {
        apple_foundation::ensure_bridge(path)
    }
    fn write_log(&self, path: &Path, text: &str) -> std::io::Result<()> {
        std::fs::write(path, text)
    }
}

struct StdTerminal;

impl Terminal for StdTerminal {
    fn audience(&self) -> Audience {
        hraness_cli_kit::audience::detect(&env_var, std::io::stderr().is_terminal())
    }
    fn interactive(&self) -> bool {
        std::io::stdin().is_terminal() && std::io::stderr().is_terminal()
    }
    fn style(&self) -> Style {
        Style::detect(&env_var, std::io::stderr().is_terminal())
    }
    fn notice(&mut self, text: &str) {
        let mut stderr = std::io::stderr();
        let _ = stderr.write_all(text.as_bytes());
        let _ = stderr.flush();
    }
    fn answer(&mut self, timeout: Duration) -> Answer {
        let (send, receive) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            let mut line = String::new();
            let read = std::io::stdin().lock().read_line(&mut line);
            let _ = send.send(read.map(|_| line));
        });
        match receive.recv_timeout(timeout) {
            Ok(Ok(line)) if line.trim().is_empty() => Answer::Continue,
            Ok(_) => Answer::Skip,
            Err(_) => Answer::Timeout,
        }
    }
    fn open_installer(&mut self) -> std::io::Result<()> {
        std::process::Command::new("/usr/bin/xcode-select")
            .arg("--install")
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .map(|_| ())
    }
}

/// How long the command line tools notice waits for an answer.
const ANSWER_TIMEOUT: Duration = Duration::from_secs(120);

/// Build (or rebuild) ALGAL's own `algal-apple` helper at `path` when it is
/// missing or stale, and return its path.
///
/// `skip_effect` finishes the notice's "Or skip: …" sentence. With
/// `may_offer_install`, a person at a terminal whose Mac lacks Apple's
/// command line tools is asked before macOS offers to install them;
/// otherwise, and whenever nobody can answer, the error says how to install
/// them and nothing opens.
pub fn ensure_default_bridge(
    path: &Path,
    skip_effect: &str,
    may_offer_install: bool,
) -> Result<PathBuf> {
    ensure_with(
        &AppleSystem,
        &mut StdTerminal,
        path,
        skip_effect,
        may_offer_install,
    )
    .map_err(|advice| Error::invalid(advice.message()))
}

/// [`ensure_default_bridge`], keeping the typed advice for `doctor`.
pub fn ensure_default_bridge_advice(
    path: &Path,
    may_offer_install: bool,
) -> std::result::Result<PathBuf, Advice> {
    ensure_with(
        &AppleSystem,
        &mut StdTerminal,
        path,
        "algal doctor reports the Apple model as unavailable",
        may_offer_install,
    )
}

pub fn ensure_with(
    system: &dyn System,
    terminal: &mut dyn Terminal,
    path: &Path,
    skip_effect: &str,
    may_offer_install: bool,
) -> std::result::Result<PathBuf, Advice> {
    if system.is_current(path) {
        return Ok(path.to_path_buf());
    }
    system.platform().map_err(resolve_advice)?;
    match system.tools() {
        Ok(()) => {}
        Err(AppleError::ToolsMissing(ToolsProblem::NotInstalled)) => {
            return Err(offer_tools(terminal, skip_effect, may_offer_install));
        }
        Err(error) => return Err(resolve_advice(error)),
    }
    if terminal.audience() == Audience::Human {
        let style = terminal.style();
        terminal.notice(&format!(
            "{} Building the Apple model helper (one time, about 10 seconds)…\n",
            style.symbol(Symbol::Progress)
        ));
    }
    match system.build(path) {
        Ok(built) => Ok(built),
        Err(AppleError::BuildFailed { status, log_tail }) => {
            let log = path.with_extension("build.log");
            let saved = match system.write_log(&log, &format!("{log_tail}\n")) {
                Ok(()) => true,
                // swiftc fails the same way when it can't write its output;
                // say what actually needs fixing.
                Err(error) if error.kind() == std::io::ErrorKind::PermissionDenied => {
                    return Err(cannot_write(path, &error));
                }
                Err(_) => false,
            };
            let how = match status {
                Some(code) => format!("swiftc exited with status {code}"),
                None => "swiftc was stopped".to_owned(),
            };
            let mut fix =
                "Check that Xcode 26 or later is selected (xcode-select -p), then try again."
                    .to_owned();
            if saved {
                fix.push_str(&format!(" Compiler output: {}", log.display()));
            }
            Err(other_advice(
                format!("The Apple model helper didn't build: {how}."),
                &fix,
            ))
        }
        Err(AppleError::Io(error)) => Err(cannot_write(path, &error)),
        Err(error) => Err(resolve_advice(error)),
    }
}

fn cannot_write(path: &Path, error: &std::io::Error) -> Advice {
    let dir = path.parent().unwrap_or(Path::new("."));
    other_advice(
        format!(
            "algal can't write the Apple model helper to {}: {error}.",
            dir.display()
        ),
        "Build one with scripts/build-apple.sh and pass it with --apple-bridge or ALGAL_APPLE_BRIDGE.",
    )
}

/// Copy for any apple-foundation error met while preparing or checking the
/// helper.
pub fn resolve_advice(error: AppleError) -> Advice {
    match error {
        AppleError::Unavailable(reason) => advice(reason),
        AppleError::ToolsMissing(problem) => tools_advice(&problem),
        AppleError::Unsupported(_) => Advice {
            reason: Reason::DeviceNotEligible,
            summary: "Apple's on-device model only runs on macOS.".to_owned(),
            fix: "Use --gateway-model or --base-url instead.".to_owned(),
            next: None,
            settings_url: None,
        },
        other => other_advice(
            format!("algal couldn't prepare the Apple model helper: {other}."),
            "Try again, or pass a helper you built with --apple-bridge.",
        ),
    }
}

fn offer_tools(terminal: &mut dyn Terminal, skip_effect: &str, may_offer_install: bool) -> Advice {
    let recovery = tools_advice(&ToolsProblem::NotInstalled);
    if !may_offer_install || !terminal.interactive() || terminal.audience() != Audience::Human {
        return recovery;
    }
    let style = terminal.style();
    terminal.notice(&xcode_tools_notice(style, skip_effect));
    match terminal.answer(ANSWER_TIMEOUT) {
        Answer::Continue => match terminal.open_installer() {
            Ok(()) => other_advice(
                "Apple's command line tools are installing.".to_owned(),
                "Finish in the window macOS opened, then run this again.",
            ),
            Err(_) => recovery,
        },
        Answer::Skip | Answer::Timeout => recovery,
    }
}

/// What `algal doctor --apple` found.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Diagnosis {
    pub bridge: Option<PathBuf>,
    pub advice: Option<Advice>,
}

impl Diagnosis {
    pub fn available(&self) -> bool {
        self.advice.is_none()
    }

    pub fn from_check(bridge: PathBuf, availability: apple_foundation::Availability) -> Self {
        Self {
            bridge: Some(bridge),
            advice: (!availability.available)
                .then(|| advice(availability.reason.unwrap_or(Reason::Unavailable))),
        }
    }

    pub fn to_json(&self) -> Value {
        let advice = self.advice.as_ref();
        json!({
            "provider": "apple",
            "available": self.available(),
            "reason": advice.map(|a| a.reason.as_str()),
            "bridge": self.bridge.as_ref().map(|p| p.display().to_string()),
            "message": advice.map(|a| a.summary.clone()),
            "fix": advice.map(|a| a.fix.clone()),
            "settingsUrl": advice.and_then(|a| a.settings_url),
            "next": advice.and_then(|a| a.next.clone()),
        })
    }

    /// Text for a person: one ✓ or ⚠ line, the fix, the helper path, then
    /// one `→` step unless the audience is quiet.
    pub fn to_text(&self, style: Style, audience: Audience) -> String {
        let helper = self
            .bridge
            .as_ref()
            .map(|p| format!("  Helper: {}\n", p.display()))
            .unwrap_or_default();
        let Some(advice) = &self.advice else {
            return format!(
                "{} Apple's on-device model is ready.\n{helper}",
                style.symbol(Symbol::Ok)
            );
        };
        let mut out = format!(
            "{} {}\n  {}\n{helper}",
            style.symbol(Symbol::Warn),
            advice.summary,
            advice.fix
        );
        if let Some(next) = advice.next.as_ref().filter(|_| audience != Audience::Quiet) {
            out.push_str(&format!("{} {next}\n", style.symbol(Symbol::Next)));
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use hraness_cli_kit::audience::detect as detect_audience;
    use std::cell::{Cell, RefCell};

    fn plain() -> Style {
        Style::default()
    }

    fn assert_golden(name: &str, rendered: &str) {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests/golden")
            .join(name);
        if std::env::var_os("ALGAL_BLESS").is_some() {
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(&path, rendered).unwrap();
        }
        let golden = std::fs::read_to_string(&path).unwrap();
        assert_eq!(rendered, golden, "\n--- rendered ---\n{rendered}");
    }

    struct FakeSystem {
        current: bool,
        platform: fn() -> apple_foundation::Result<()>,
        tools: fn() -> apple_foundation::Result<()>,
        build: fn() -> apple_foundation::Result<()>,
        built: Cell<bool>,
        log: RefCell<Option<(PathBuf, String)>>,
        log_denied: bool,
    }

    impl Default for FakeSystem {
        fn default() -> Self {
            Self {
                current: false,
                platform: || Ok(()),
                tools: || Ok(()),
                build: || Ok(()),
                built: Cell::new(false),
                log: RefCell::new(None),
                log_denied: false,
            }
        }
    }

    impl System for FakeSystem {
        fn is_current(&self, _: &Path) -> bool {
            self.current
        }
        fn platform(&self) -> apple_foundation::Result<()> {
            (self.platform)()
        }
        fn tools(&self) -> apple_foundation::Result<()> {
            (self.tools)()
        }
        fn build(&self, path: &Path) -> apple_foundation::Result<PathBuf> {
            self.built.set(true);
            (self.build)().map(|()| path.to_path_buf())
        }
        fn write_log(&self, path: &Path, text: &str) -> std::io::Result<()> {
            if self.log_denied {
                return Err(std::io::ErrorKind::PermissionDenied.into());
            }
            *self.log.borrow_mut() = Some((path.to_path_buf(), text.to_owned()));
            Ok(())
        }
    }

    struct FakeTerminal {
        audience: Audience,
        interactive: bool,
        answer: Answer,
        installer_opened: bool,
        shown: String,
    }

    impl FakeTerminal {
        fn new(audience: Audience, interactive: bool, answer: Answer) -> Self {
            Self {
                audience,
                interactive,
                answer,
                installer_opened: false,
                shown: String::new(),
            }
        }
    }

    impl Terminal for FakeTerminal {
        fn audience(&self) -> Audience {
            self.audience
        }
        fn interactive(&self) -> bool {
            self.interactive
        }
        fn style(&self) -> Style {
            plain()
        }
        fn notice(&mut self, text: &str) {
            self.shown.push_str(text);
        }
        fn answer(&mut self, _: Duration) -> Answer {
            self.answer
        }
        fn open_installer(&mut self) -> std::io::Result<()> {
            self.installer_opened = true;
            Ok(())
        }
    }

    const HELPER: &str = "/opt/algal/bin/algal-apple";
    const SKIP: &str = "run without --apple, or use --gateway-model or --base-url";

    fn run(
        label: &str,
        system: &FakeSystem,
        terminal: &mut FakeTerminal,
        offer: bool,
        out: &mut String,
    ) {
        let result = ensure_with(system, terminal, Path::new(HELPER), SKIP, offer);
        out.push_str(&format!("[{label}]\n--- notices\n{}", terminal.shown));
        match result {
            Ok(path) => out.push_str(&format!("--- ok {}\n", path.display())),
            Err(advice) => out.push_str(&format!(
                "--- error {}\n{}\nnext: {}\n",
                advice.reason.as_str(),
                advice.message(),
                advice.next.as_deref().unwrap_or("-")
            )),
        }
    }

    #[test]
    fn helper_build_paths_match_golden() {
        let mut out = String::new();
        let human = || FakeTerminal::new(Audience::Human, true, Answer::Continue);

        let current = FakeSystem {
            current: true,
            ..FakeSystem::default()
        };
        run("current", &current, &mut human(), true, &mut out);
        assert!(!current.built.get());

        let fresh = FakeSystem::default();
        run("fresh human", &fresh, &mut human(), true, &mut out);
        let quiet = FakeSystem::default();
        let mut terminal = FakeTerminal::new(Audience::Quiet, false, Answer::Continue);
        run("fresh quiet", &quiet, &mut terminal, true, &mut out);
        assert!(terminal.shown.is_empty(), "no progress for scripts");

        let no_tools = || FakeSystem {
            tools: || Err(AppleError::ToolsMissing(ToolsProblem::NotInstalled)),
            ..FakeSystem::default()
        };
        let system = no_tools();
        let mut terminal = human();
        run("no tools, Enter", &system, &mut terminal, true, &mut out);
        assert!(terminal.installer_opened);
        assert!(!system.built.get(), "never compile without tools");

        let mut terminal = FakeTerminal::new(Audience::Human, true, Answer::Skip);
        run("no tools, s", &no_tools(), &mut terminal, true, &mut out);
        assert!(!terminal.installer_opened);

        let mut terminal = FakeTerminal::new(Audience::Human, true, Answer::Timeout);
        run(
            "no tools, no answer",
            &no_tools(),
            &mut terminal,
            true,
            &mut out,
        );
        assert!(!terminal.installer_opened);

        for (label, mut terminal, offer) in [
            (
                "no tools, unattended",
                FakeTerminal::new(Audience::Quiet, false, Answer::Continue),
                true,
            ),
            (
                "no tools, agent",
                FakeTerminal::new(Audience::Agent, true, Answer::Continue),
                true,
            ),
            (
                "no tools, doctor",
                FakeTerminal::new(Audience::Human, true, Answer::Continue),
                false,
            ),
        ] {
            run(label, &no_tools(), &mut terminal, offer, &mut out);
            assert!(!terminal.installer_opened, "{label}");
            assert!(terminal.shown.is_empty(), "{label}");
        }

        let old_sdk = FakeSystem {
            tools: || {
                Err(AppleError::ToolsMissing(ToolsProblem::SdkTooOld {
                    version: "15.4".into(),
                }))
            },
            ..FakeSystem::default()
        };
        run("old sdk", &old_sdk, &mut human(), true, &mut out);

        let broken = FakeSystem {
            build: || {
                Err(AppleError::BuildFailed {
                    status: Some(1),
                    log_tail: "error: no such module 'FoundationModels'".into(),
                })
            },
            ..FakeSystem::default()
        };
        run("build failed", &broken, &mut human(), true, &mut out);
        let (log, text) = broken.log.borrow().clone().unwrap();
        assert_eq!(log, PathBuf::from("/opt/algal/bin/algal-apple.build.log"));
        assert_eq!(text, "error: no such module 'FoundationModels'\n");

        let read_only = FakeSystem {
            build: || {
                Err(AppleError::Io(std::io::Error::from(
                    std::io::ErrorKind::PermissionDenied,
                )))
            },
            ..FakeSystem::default()
        };
        run("read-only prefix", &read_only, &mut human(), true, &mut out);

        let unwritable = FakeSystem {
            build: || {
                Err(AppleError::BuildFailed {
                    status: Some(1),
                    log_tail: "error: unable to open output file".into(),
                })
            },
            log_denied: true,
            ..FakeSystem::default()
        };
        run(
            "build failed, read-only prefix",
            &unwritable,
            &mut human(),
            true,
            &mut out,
        );

        let intel = FakeSystem {
            platform: || Err(AppleError::Unavailable(Reason::DeviceNotEligible)),
            ..FakeSystem::default()
        };
        run("intel", &intel, &mut human(), true, &mut out);
        assert!(!intel.built.get());

        let old_macos = FakeSystem {
            platform: || Err(AppleError::Unavailable(Reason::RequiresMacOS26)),
            ..FakeSystem::default()
        };
        run("old macos", &old_macos, &mut human(), true, &mut out);

        let linux = FakeSystem {
            platform: || Err(AppleError::Unsupported("needs macOS".into())),
            ..FakeSystem::default()
        };
        run("not macos", &linux, &mut human(), true, &mut out);

        assert_golden("apple_helper.txt", &out);
    }

    #[test]
    fn reasons_and_doctor_match_golden() {
        let mut out = String::new();
        for reason in Reason::ALL {
            let error = unavailable_error(reason);
            out.push_str(&format!(
                "[effect {}]\n{}: {}\n",
                reason.as_str(),
                error.code,
                error.message
            ));
        }
        let helper = PathBuf::from(HELPER);
        let ready = Diagnosis::from_check(helper.clone(), apple_foundation::Availability::ready());
        let off = Diagnosis::from_check(
            helper.clone(),
            apple_foundation::Availability::unavailable(Reason::AppleIntelligenceNotEnabled),
        );
        let intel = Diagnosis::from_check(
            helper,
            apple_foundation::Availability::unavailable(Reason::DeviceNotEligible),
        );
        let no_tools = Diagnosis {
            bridge: None,
            advice: Some(tools_advice(&ToolsProblem::NotInstalled)),
        };
        for (label, diagnosis) in [
            ("ready", &ready),
            ("off", &off),
            ("intel", &intel),
            ("no tools", &no_tools),
        ] {
            out.push_str(&format!(
                "[doctor {label}]\n{}[doctor {label} quiet ascii]\n{}[doctor {label} json]\n{}\n",
                diagnosis.to_text(plain(), Audience::Human),
                diagnosis.to_text(
                    Style {
                        color: false,
                        ascii: true
                    },
                    Audience::Quiet
                ),
                diagnosis.to_json()
            ));
        }
        out.push_str(&format!(
            "[xcode tools notice]\n{}",
            xcode_tools_notice(plain(), SKIP)
        ));
        out.push_str(&format!(
            "[xcode tools notice ascii]\n{}",
            xcode_tools_notice(
                Style {
                    color: false,
                    ascii: true
                },
                SKIP
            )
        ));
        assert_golden("apple_copy.txt", &out);
        assert!(ready.available() && !off.available());
    }

    #[test]
    fn style_and_audience_follow_the_cli_contract() {
        let env = |pairs: &'static [(&'static str, &'static str)]| {
            move |key: &str| {
                pairs
                    .iter()
                    .find(|(k, _)| *k == key)
                    .map(|(_, v)| (*v).to_owned())
            }
        };
        let utf8 = env(&[("LANG", "en_US.UTF-8")]);
        assert_eq!(
            Style::detect(&utf8, true),
            Style {
                color: true,
                ascii: false
            }
        );
        assert!(!Style::detect(&utf8, false).color);
        assert!(!Style::detect(&env(&[("LANG", "en_US.UTF-8"), ("NO_COLOR", "1")]), true).color);
        assert!(Style::detect(&env(&[("LANG", "en_US.UTF-8"), ("TERM", "dumb")]), true).ascii);
        assert!(Style::detect(&env(&[("LANG", "C")]), false).ascii);
        assert_eq!(
            Style {
                color: true,
                ascii: false
            }
            .symbol(Symbol::Warn),
            "\x1b[33m⚠\x1b[0m"
        );
        assert_eq!(detect_audience(&env(&[]), true), Audience::Human);
        assert_eq!(detect_audience(&env(&[]), false), Audience::Quiet);
        assert_eq!(
            detect_audience(&env(&[("CLAUDECODE", "1")]), false),
            Audience::Agent
        );
        assert_eq!(
            detect_audience(&env(&[("CODEX_HOME", "/x")]), true),
            Audience::Human
        );
        assert_eq!(
            detect_audience(
                &env(&[("HRANESS_AUDIENCE", "off"), ("AI_AGENT", "1")]),
                true
            ),
            Audience::Quiet
        );
    }
}
