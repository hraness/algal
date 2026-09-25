# Local triage renderers and package

This isolated Rust workspace renders the local-triage captured DTO in a Dioxus
desktop app (system WebView) and a Ratatui terminal application. Both invoke a
bounded local `triage-host` executable with argv and JSON files. They do not
invoke a shell, execute model text, make network requests, or substitute a
cloud provider. Policy, update and migration semantics stay in ALGAL.

```sh
cargo build --manifest-path examples/local-triage/renderers/Cargo.toml --locked --offline --features desktop
cargo test --manifest-path examples/local-triage/renderers/Cargo.toml --locked --features desktop
cargo clippy --manifest-path examples/local-triage/renderers/Cargo.toml --locked --all-targets --features desktop -- -D warnings
cargo fmt --manifest-path examples/local-triage/renderers/Cargo.toml --all -- --check
```

On a Hraness machine, run build/native/packaging work through the installed
`host-run`, using the `mac-native` lane for desktop builds and packaging.
`--target-dir examples/malleable-site/renderers/target` reuses the existing
isolated renderer cache without adding dependencies to the root Rust workspace.

## Desktop

The task pane supports add/edit, priorities, categories after v2 migration,
complete/reopen, title search, filtering and ordering explanations. Form fields
and task rows have stable keys. Composition events defer command, navigation,
refresh and adoption controls until text composition ends. Shared session
fixtures cover added fields, changed kind/parent, removal and unchanged identity;
all retain draft text, with explicit rebasing and incompatible focus clearing.
Text fields keep their live DOM value across delayed WebView messages; only
explicit draft replacement remounts the editor. Dropdowns initialize each
option's selection before mounting. Native mutation-stream regressions cover
rapid text echoes, deliberate replacement and nonfirst default options.
Typing changes only the session draft; no
inference or authoritative write occurs on a keystroke. **Save draft before
closing**. Submit writes a typed exact-head command, clears the successfully
submitted draft and saves that session.

The workflow pane previews sorting, grouping, reopening and schema revisions,
shows independent checks, and explicitly adopts a candidate. Captured facts and
candidate presentation stay separate. The portability pane exports immutable
evidence, imports without adoption and forks into a new identity. Field-conflict
review/resolution remains in the bundled CLI; this UI never silently merges.

A stale captured state retains the draft and exposes explicit refresh/rebase.
Concurrent saves fail their session compare-and-set. Loading the saved draft is
an explicit discard of unsaved edits. The host rejects corrupt retained session
files and preserves them for reconciliation.

Apple inference is an explicit button and instruction field in the workflow
pane. It selects only bundled sibling `algal-native` / `algal-apple` binaries and
creates a fresh bounded attempt directory for that click. The UI runs the call on a
worker thread, retains the live draft, evaluates the returned proposal, and
requires a separate adoption. It never retries an admitted attempt or falls
back to network inference. A changed application head can reject evaluation;
the model attempt remains retained for inspection. Typing never starts a call.

## Terminal

Run `triage-tui [--host PATH] [--dir DIRECTORY] [--application ID]`. `--snapshot`
prints the actual captured task/draft view without opening an interactive
terminal. The same flags work for `triage-desktop`.

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

The TUI imports model proposals produced by the bundled host CLI. The desktop
also offers the explicit on-device call. Both use the same authoritative
captured semantic tree, command admission and bounded state.

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

- `ALGAL Triage.app`: Dioxus desktop executable and bundled standalone host.
- `bin/triage-tui` and `bin/triage-host`: independently runnable terminal/CLI.
- Optional `algal-native` / `algal-apple` siblings, also in app Resources/bin.
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
through its authenticated loopback web host, verifies hashes, checks that
executables link only macOS system libraries and verifies the app's ad-hoc
signature. It does not qualify window interaction or network denial;
those require the separate native acceptance run.

The package is ad-hoc signed, **not notarized**. The UI targets macOS arm64 and
uses its system WebView. On-device Apple inference additionally requires macOS
26+, compatible Apple Silicon, enabled Apple Intelligence and downloaded model
assets. The shipped source is cross-platform for the TUI, but this packaging
script qualifies only the explicit macOS artifact. There is no mobile signing,
browser-local kernel, cloud synchronization or unbounded history claim here.
