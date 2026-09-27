//! Terminal style for the native CLI's human output: the shared audience
//! rule, status symbols with ASCII fallbacks, symbol-only color, and the
//! two-line error — now the `hraness-cli-kit` crate's own APIs (pinned at
//! desktop-foundation v0.8.1). The Bun copy in `src/cli-style.ts` follows the
//! same contract, and a test compares it with the desktop-foundation SDK.
//!
//! Kept local because the kit has no equivalent:
//! - `explicit_audience`: `audience::detect` folds `HRANESS_AUDIENCE` into
//!   its chain; `algal doctor` needs the explicit value alone so a piped
//!   human still gets sentences.
//! - `sentence`: the kit's `sentence` spares only `keep` prefixes; ALGAL
//!   never capitalizes a path, flag, or identifier ("nothing.json: file not
//!   found." keeps its case).
//! - `print_stdout`: the kit's `write_stdout` swallows write errors; a failed
//!   print must never read as success, so only a closed pipe exits quietly.

pub use hraness_cli_kit::audience::{Audience, detect_current as audience, process_env};
pub use hraness_cli_kit::style::{CliError, Style, Symbol, is_broken_pipe};

/// The audience `HRANESS_AUDIENCE` names, in any letter case with
/// surrounding spaces ignored (`off` means quiet), or `None`.
pub fn explicit_audience(env: &dyn Fn(&str) -> Option<String>) -> Option<Audience> {
    match env("HRANESS_AUDIENCE")?
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "human" => Some(Audience::Human),
        "agent" => Some(Audience::Agent),
        "quiet" | "off" => Some(Audience::Quiet),
        _ => None,
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
    CliError::new("error", text)
        .with_next(next)
        .render_human(style)
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
        if is_broken_pipe(&error) {
            std::process::exit(0);
        }
        panic!("failed printing to stdout: {error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use hraness_cli_kit::audience::detect as detect_audience;

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
            explicit_audience(&env_of(&[("HRANESS_AUDIENCE", "Human")])),
            Some(Audience::Human)
        );
        assert_eq!(
            explicit_audience(&env_of(&[("HRANESS_AUDIENCE", "robot")])),
            None
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
