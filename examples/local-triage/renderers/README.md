# Local triage renderers and package

This isolated Rust workspace renders the local-triage captured DTO in a
Ratatui terminal application. The renderer invokes a
bounded local `triage-host` executable with argv and JSON files. It does not
invoke a shell, execute model text, make network requests, or substitute a
cloud provider. Policy, update and migration semantics stay in ALGAL.

```sh
cargo build --manifest-path examples/local-triage/renderers/Cargo.toml --locked --offline
cargo test --manifest-path examples/local-triage/renderers/Cargo.toml --locked
cargo clippy --manifest-path examples/local-triage/renderers/Cargo.toml --locked --all-targets -- -D warnings
cargo fmt --manifest-path examples/local-triage/renderers/Cargo.toml --all -- --check
```

On a Hraness machine, run build/native/packaging work through the installed
`host-run`, using the `mac-native` lane for packaging.
`--target-dir examples/malleable-site/renderers/target` reuses the existing
isolated renderer cache without adding dependencies to the root Rust workspace.

The earlier Dioxus desktop renderer was removed: its WebView, GTK and servo
dependency tree dominated this workspace's lockfile while carrying advisories
the example could not reach a fix for. The packaged artifact is now the
terminal application plus the standalone host.

## Terminal

Run `triage-tui [--host PATH] [--dir DIRECTORY] [--application ID]`. `--snapshot`
prints the actual captured task/draft view without opening an interactive
terminal.

| Key | Action |
| --- | --- |
| arrows / `j`, `k` | select task |
| `n`, `e`, `t` | new task / edit selected / edit draft title |
| `p`, `c` | cycle draft priority / edit category |
| space | captured complete/reopen action |
| `f`, `/` | cycle filter / edit title query |
| Enter in title/category | submit task draft |
| Escape | return to navigation |
| Ctrl-S | save draft separately |
| Ctrl-R, `r` | refresh / explicitly rebase draft |
| `L` | discard unsaved edits and load retained draft |
| `w` | explain selected task position |
| `S`, `G`, `V`, `R` | cycle sort/group/schema/reopening policy |
| `v`, `a` | evaluate/preview / explicitly adopt |
| `d`, `B` | edit transfer/proposal path / fork identity |
| `x`, `o`, `b`, `i` | export / verify-import / fork / import model proposal |
| `q`, Ctrl-Q | save-and-quit / quit keeping only the saved draft |

The TUI imports model proposals produced by the bundled host CLI. It uses the
authoritative captured semantic tree, command admission and bounded state.

## Standalone macOS arm64 artifact

```sh
bun examples/local-triage/package.ts --output /path/to/fresh-artifact-directory \
  --native /path/to/algal --bridge /path/to/algal-apple
bun examples/local-triage/package-smoke.ts \
  /path/to/fresh-artifact-directory/algal-triage-macos-arm64.tar.gz \
  /path/to/package-smoke-evidence.json
```

The optional inference binaries must be supplied as an explicit pair. Omitting
them produces a manual/proposal-import package. `--target-dir` selects the Rust
build directory; `--skip-rust` reuses already checked binaries. Package output
must be fresh; the script never overwrites an existing artifact directory.

The archive contains:

- `bin/triage-tui` and `bin/triage-host`: independently runnable terminal/CLI.
- Optional `algal-native` / `algal-apple` siblings.
- `manifest.json`: exact executable/file sizes and SHA-256 hashes, evaluator
  hash, platform, signing and inference requirements. It also records the
  Git HEAD and dirty status at assembly, Bun/Rust versions, build flags and a
  hashed source inventory. Assembly rejects changes to that inventory during
  the build. Bundled inference executables are identified by their exact bytes;
  this script does not claim to rebuild their source.

The compiled host embeds Bun and the committed expression WASM. Fresh-extraction
smoke runs the host with no project/tool directories on PATH, initializes and
reopens facts, retries commands, saves/restores drafts, migrates schema,
replays exports, forks, renders the TUI, serves the same captured application
through its authenticated loopback web host, verifies hashes, and checks that
executables link only macOS system libraries. It does not qualify network denial;
that requires the separate native acceptance run.

The package is unsigned. The TUI targets macOS arm64 in this artifact.
On-device Apple inference additionally requires macOS
26+, compatible Apple Silicon, enabled Apple Intelligence and downloaded model
assets. The shipped source is cross-platform for the TUI, but this packaging
script qualifies only the explicit macOS artifact. There is no mobile signing,
browser-local kernel, cloud synchronization or unbounded history claim here.
