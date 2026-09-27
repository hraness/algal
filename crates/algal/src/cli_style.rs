//! Terminal style for the native CLI's human output: the shared audience
//! rule, status symbols with ASCII fallbacks, symbol-only color, and the
//! two-line error.
//!
//! TODO(df-0.8): use `hraness-cli-kit` (`audience::detect` and the style
//! helpers) once desktop-foundation tags the crate. Until then this module
//! copies that contract, and it follows the Bun copy in `src/cli-style.ts`,
//! which a test compares with the desktop-foundation 0.8 SDK.

use std::io::IsTerminal;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Audience {
    Human,
    Agent,
    Quiet,
}

const AGENT_MARKERS: [&str; 6] = [
    "AI_AGENT",
    "CLAUDECODE",
    "CODEX_SANDBOX",
    "CODEX_SANDBOX_NETWORK_DISABLED",
    "CURSOR_AGENT",
    "GEMINI_CLI",
];

/// `HRANESS_AUDIENCE` (any letter case, surrounding spaces ignored) wins,
/// then exact agent markers, then a terminal on stderr means a person;
/// anything else stays quiet.
pub fn detect_audience(env: &dyn Fn(&str) -> Option<String>, stderr_is_tty: bool) -> Audience {
    let explicit = env("HRANESS_AUDIENCE").map(|value| value.trim().to_ascii_lowercase());
    match explicit.as_deref() {
        Some("human") => return Audience::Human,
        Some("agent") => return Audience::Agent,
        Some("quiet" | "off") => return Audience::Quiet,
        _ => {}
    }
    if AGENT_MARKERS
        .iter()
        .any(|marker| env(marker).is_some_and(|value| !value.is_empty()))
    {
        return Audience::Agent;
    }
    if stderr_is_tty {
        Audience::Human
    } else {
        Audience::Quiet
    }
}

pub fn process_env(name: &str) -> Option<String> {
    std::env::var(name).ok()
}

/// The audience for this process's stderr.
pub fn audience() -> Audience {
    detect_audience(&process_env, std::io::stderr().is_terminal())
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Style {
    pub ascii: bool,
    pub color: bool,
}

impl Style {
    pub fn detect(env: &dyn Fn(&str) -> Option<String>, is_tty: bool) -> Self {
        let nonempty = |name: &str| env(name).filter(|value| !value.is_empty());
        let term_dumb = env("TERM").as_deref() == Some("dumb");
        let locale = nonempty("LC_ALL")
            .or_else(|| nonempty("LC_CTYPE"))
            .or_else(|| nonempty("LANG"));
        let utf8 = locale.is_some_and(|value| {
            let lower = value.to_ascii_lowercase();
            lower.contains("utf-8") || lower.contains("utf8")
        });
        let ascii = term_dumb || env("HRANESS_ASCII").as_deref() == Some("1") || !utf8;
        // A nonempty NO_COLOR wins; FORCE_COLOR other than `0` or `false` forces color.
        let forced = nonempty("FORCE_COLOR").is_some_and(|value| value != "0" && value != "false");
        let color = if nonempty("NO_COLOR").is_some() {
            false
        } else {
            forced || (is_tty && !term_dumb)
        };
        Self { ascii, color }
    }

    pub fn stderr() -> Self {
        Self::detect(&process_env, std::io::stderr().is_terminal())
    }

    pub fn stdout() -> Self {
        Self::detect(&process_env, std::io::stdout().is_terminal())
    }
}

#[derive(Clone, Copy, Debug)]
pub enum Symbol {
    Ok,
    Fail,
    Warn,
    Next,
    Skip,
}

pub fn symbol(symbol: Symbol, style: Style) -> String {
    let (unicode, ascii, color) = match symbol {
        Symbol::Ok => ("✓", "OK", "32"),
        Symbol::Fail => ("✗", "FAIL", "31"),
        Symbol::Warn => ("⚠", "WARN", "33"),
        Symbol::Next => ("→", "->", "2"),
        Symbol::Skip => ("–", "-", "2"),
    };
    let glyph = if style.ascii { ascii } else { unicode };
    if style.color {
        format!("\u{1b}[{color}m{glyph}\u{1b}[0m")
    } else {
        glyph.to_owned()
    }
}

/// A message as one sentence: capitalized, with a final period.
pub fn sentence(message: &str) -> String {
    let trimmed = message.trim();
    // Capitalize only a plain word: never a path, flag, or identifier.
    let first_word = trimmed.split(' ').next().unwrap_or("");
    let plain = first_word
        .trim_end_matches([',', ':'])
        .chars()
        .all(|c| c.is_ascii_lowercase());
    let mut chars = trimmed.chars();
    let mut text = match chars.next() {
        Some(first) if plain && first.is_ascii_lowercase() => {
            format!("{}{}", first.to_ascii_uppercase(), chars.as_str())
        }
        _ => trimmed.to_owned(),
    };
    if !text.ends_with(['.', '!', '?']) {
        text.push('.');
    }
    text
}

/// What happened, then exactly one next command.
pub fn render_failure(text: &str, next: &str, style: Style) -> String {
    format!(
        "{} {text}\n{} {next}\n",
        symbol(Symbol::Fail, style),
        symbol(Symbol::Next, style)
    )
}

/// Write human text (help, the doctor checklist) to stdout. `algal help
/// advanced | head -1` must exit quietly, and the crate forbids the `unsafe`
/// a SIGPIPE reset needs, so a closed pipe ends the process with status 0
/// instead of a `println!` panic. JSON results keep `println!`, so a failed
/// command never turns into a success when its reader goes away.
pub fn print_stdout(text: &str) {
    use std::io::Write;
    let mut stdout = std::io::stdout().lock();
    let result = stdout
        .write_all(text.as_bytes())
        .and_then(|()| stdout.flush());
    if let Err(error) = result {
        if error.kind() == std::io::ErrorKind::BrokenPipe {
            std::process::exit(0);
        }
        panic!("failed printing to stdout: {error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn env_of(pairs: &'static [(&'static str, &'static str)]) -> impl Fn(&str) -> Option<String> {
        move |name| {
            pairs
                .iter()
                .find(|(key, _)| *key == name)
                .map(|(_, value)| (*value).to_owned())
        }
    }

    #[test]
    fn audience_follows_the_shared_rule() {
        assert_eq!(
            detect_audience(
                &env_of(&[("HRANESS_AUDIENCE", "human"), ("CLAUDECODE", "1")]),
                false
            ),
            Audience::Human
        );
        assert_eq!(
            detect_audience(&env_of(&[("HRANESS_AUDIENCE", "off")]), true),
            Audience::Quiet
        );
        assert_eq!(
            detect_audience(&env_of(&[("CLAUDECODE", "1")]), true),
            Audience::Agent
        );
        assert_eq!(
            detect_audience(&env_of(&[("CODEX_HOME", "/x")]), true),
            Audience::Human
        );
        assert_eq!(
            detect_audience(&env_of(&[("CURSOR_AGENT", "")]), false),
            Audience::Quiet
        );
        assert_eq!(
            detect_audience(&env_of(&[("HRANESS_AUDIENCE", " Agent ")]), true),
            Audience::Agent
        );
        assert_eq!(
            detect_audience(
                &env_of(&[("HRANESS_AUDIENCE", "OFF"), ("CLAUDECODE", "1")]),
                true
            ),
            Audience::Quiet
        );
    }

    #[test]
    fn style_falls_back_to_ascii_and_drops_color() {
        let utf8 = env_of(&[("LANG", "en_US.UTF-8")]);
        assert_eq!(
            Style::detect(&utf8, true),
            Style {
                ascii: false,
                color: true
            }
        );
        assert_eq!(
            Style::detect(&utf8, false),
            Style {
                ascii: false,
                color: false
            }
        );
        let dumb = env_of(&[("LANG", "en_US.UTF-8"), ("TERM", "dumb")]);
        assert_eq!(
            Style::detect(&dumb, true),
            Style {
                ascii: true,
                color: false
            }
        );
        let no_color = env_of(&[("LANG", "en_US.UTF-8"), ("NO_COLOR", "1")]);
        assert_eq!(
            Style::detect(&no_color, true),
            Style {
                ascii: false,
                color: false
            }
        );
        assert!(Style::detect(&env_of(&[("LANG", "C")]), false).ascii);
        assert!(Style::detect(&env_of(&[("FORCE_COLOR", "1")]), false).color);
        assert!(Style::detect(&env_of(&[("FORCE_COLOR", "true")]), false).color);
        assert!(!Style::detect(&env_of(&[("FORCE_COLOR", "0")]), false).color);
        assert!(!Style::detect(&env_of(&[("FORCE_COLOR", "1"), ("NO_COLOR", "1")]), true).color);
    }

    #[test]
    fn failure_is_two_lines_with_fallbacks() {
        let plain = Style {
            ascii: false,
            color: false,
        };
        assert_eq!(
            render_failure("Nope.", "algal --help", plain),
            "✗ Nope.\n→ algal --help\n"
        );
        let ascii = Style {
            ascii: true,
            color: false,
        };
        assert_eq!(
            render_failure("Nope.", "algal --help", ascii),
            "FAIL Nope.\n-> algal --help\n"
        );
        let color = Style {
            ascii: false,
            color: true,
        };
        assert!(render_failure("Nope.", "x", color).starts_with("\u{1b}[31m✗\u{1b}[0m Nope."));
        assert_eq!(sentence("bad input"), "Bad input.");
        assert_eq!(sentence("Done!"), "Done!");
        assert_eq!(
            sentence("nothing.json: file not found"),
            "nothing.json: file not found."
        );
        assert_eq!(
            sentence("--dir must be a directory"),
            "--dir must be a directory."
        );
    }
}
