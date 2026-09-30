# Native prerelease distribution

The native process VM can run without Bun, Cargo, or a repository checkout.
Binary packages are tested on three targets:

| Archive target | Supported qualification environment |
| --- | --- |
| `x86_64-unknown-linux-gnu` | Ubuntu 24.04 x86_64, glibc 2.39 or newer |
| `aarch64-unknown-linux-gnu` | Ubuntu 24.04 arm64, glibc 2.39 or newer (from `v0.2.0-vm.11`) |
| `aarch64-apple-darwin` | macOS 14 or newer on Apple silicon |

These are prerelease targets. Other Linux architectures, older glibc systems,
Intel Macs, and Windows do not yet have equivalent package qualification.
The Apple Foundation Models bridge is a separate optional build requiring
compatible macOS/Xcode; it is not part of the portable CLI package.

## Install with one command

On a supported target, this downloads the current prerelease for your
platform from GitHub Releases and installs `~/.local/bin/algal`:

```sh
curl -fsSL https://algal.computer/install.sh | sh
```

The script uses `sh`, `curl`, `tar`, and `sha256sum` or `shasum`. Current
update-enabled releases also need the [GitHub CLI](https://cli.github.com/)
(`gh`) authenticated with github.com to verify immutable release files.
Install `gh` and run `gh auth login` before installing. The script checks the archive against its `.sha256` file, accepts only the four files an
archive holds, checks `bin/algal` against the `binarySha256` and target in the
archive's `release.json`, and runs `algal --version` before it moves the
executable into place. Rerunning it upgrades in place. It also keeps the release
record at `~/.local/bin/.algal-releases/BINARY_SHA256.json`, so `algal doctor`
reports `build.release.status: "matched"`. Set `ALGAL_VERSION=<tag>` to install
one exact release, or `ALGAL_INSTALL_PREFIX` to install somewhere other than
`~/.local`. The script's source is `site/install.sh`; the site fills in the
default release tag from `site/published-release.json`.

## Updates

From `v0.2.0-vm.14`, verified native installs on macOS and Linux check for a
newer `vm` preview before product work, at most once a day. Automatic updates
are enabled by default. They keep the current platform and preview channel,
and compare the full release tag and build SHA rather than the `0.2.0` package
version shared by the previews.

```sh
algal update
algal update check --json
algal update status
algal update disable
algal update enable
```

The updater verifies the immutable GitHub release, archive and checksum
digests, and the release record stored both inside and beside the archive.
macOS also requires the expected Developer ID, Apple notarization, hardened
runtime and secure timestamp before executing the candidate. Every running
command protects the installed executable until it finishes. Updates wait
for another invocation when a command is active; they do not restart services.
A failed replacement restores the previous executable and install record.
Hash-keyed `.algal-releases` records stay with the bytes they describe.

CI, offline verification, memory queries and existing SDK executable pins skip
automatic updates. Use `--no-update` or `HRANESS_NO_UPDATE=1` to skip a single
invocation. `ALGAL_VERSION` and manually installed archives pin the chosen
release; an ordinary reinstall preserves that pin and saved update preferences.
Re-run the public installer to enroll a `vm.11` native copy whose bytes match
the fixed historical hashes recorded in the updater. That older release was
mutable and unsigned. A `vm.12` copy can migrate when its canonical release
is immutable. Unknown copies need their original update workflow or a new
`ALGAL_INSTALL_PREFIX`.

Source and package Bun installations retain their original update workflow.
Their `algal update` command prints manual guidance without network access,
installation changes or a switch to the native runtime. Native updates do
not rebuild the Apple bridge or change a downstream application's executable
pin.

## Verify and install by hand

Download the target's `.tar.gz` and matching `.tar.gz.sha256` from the same
[GitHub release](https://github.com/hraness/algal/releases). The native workbench
requires `v0.2.0-vm.6` or newer. Each archive contains `bin/algal`, `LICENSE`, `release.json`,
and `smoke.py`. The metadata records the source commit, release tag, native
version, clean source state, Rust toolchain, target, binary digest, and smoke result.
The adjacent `.release.json` manifest also binds the archive filename and SHA-256.
New packages also embed their source commit, a SHA-256 of the bounded Rust build
inputs, build-time source state, compiler, and target in the executable. Packaging
compares those fields with the admitted checkout before qualification, so an old
executable cannot inherit the checkout's current commit or source contents.

For example, with a reviewed checkout at the release tag (the installer script
uses the checkout's `scripts/unpack-native.py`; the installed executable itself
needs no checkout):

```sh
sh scripts/install-native.sh "$HOME/.local" \
  --archive ./algal-<tag>-aarch64-apple-darwin.tar.gz \
  --checksum ./algal-<tag>-aarch64-apple-darwin.tar.gz.sha256
"$HOME/.local/bin/algal" doctor
```

The archive installer requires Python 3 and verifies both the archive checksum
and the binary digest before executing or installing it. Compressed input,
expanded tar bytes and individual members are bounded before extraction; PAX
headers cannot bypass the expansion limit. It extracts the
executable and release metadata, rejects a mismatched platform, and refuses an existing installation
unless `--force` is supplied. Replacements use an atomic rename on the target
filesystem; failed verification preserves the existing executable. Source
installation keeps the original `sh scripts/install-native.sh [PREFIX]` form,
builds with `--locked`, and honors `CARGO_TARGET_DIR`.

`algal doctor` keeps its existing fields and adds a `build` object. The semver
output of `algal --version` stays unchanged. `build.sourceCommit`, `sourceState`,
`sourceInputsSha256`, `target`, and `rustc` describe the compiled build context.
`exactTagsAtBuild` is informational: a shallow source checkout may expose no
tag. Builds outside Git report an unknown commit/state, and packaging rejects
that identity. The input digest covers `Cargo.toml`, `Cargo.lock`, `crates/`, and
`.cargo/`; it is not a claim of reproducible compilation or of every environment
variable and system dependency used by the compiler.

The installer retains the checked package record at
`PREFIX/bin/.algal-releases/BINARY_SHA256.json` before atomically publishing the
executable. The diagnostic hashes the executable file at its resolved path and
only reports `build.release.status: "matched"` when that record agrees with the
embedded build identity and binary hash. Its small `metadata` object gives the
release tag, commit, target, version, source state, and binary hash. A missing
record reports `absent`; malformed, conflicting, or symlinked records report
`rejected`. Same-binary records with different package metadata are refused on
installation rather than silently replacing a release identity. Interrupted or
failed installation leaves the existing executable and its identity intact.
Source builds and manually copied binaries still report their embedded identity
without requiring a package record. Older binaries preserve their original
diagnostic behavior.

You can instead verify the checksum yourself, unpack the archive, and run
`bin/algal` directly. Run `python3 smoke.py ./bin/algal` from the unpacked
package to check native execution in a fresh store. Python is a verification
helper dependency, not a CLI runtime dependency. The smoke creates a process,
suspends on a mailbox, wakes and resumes it in separate CLI invocations, and
verifies both generations offline with no provider credentials.

Checksums detect corruption and accidental substitution against the checksum
file you trust. They are not a publisher signature. The currently published
`vm.11` macOS package is unsigned and not notarized. Starting with `vm.12`,
release packaging and installation require Developer ID and Apple notarization,
as described below. No installer removes quarantine attributes.
The embedded identity and `matched` local package attribution are diagnostics,
not authentication: they cannot prove who built or published a binary. A package
record's historical smoke result is retained on disk but is not re-attested by
`doctor`.

## Build and publish an exact source release

`.github/workflows/release.yml` is manually dispatched at the desired release
ref with an existing version tag as input. Select that tag as the workflow ref
for every release; selecting `main` is rejected even when its current commit
matches the tag. The tag must resolve to the workflow event commit, which must
have a completed successful main push CI run. The tag input never selects code
to execute: every checkout uses the workflow event commit. The workflow builds
that exact source on each qualified platform with pinned Rust 1.97.1 and
`Cargo.lock`, and qualifies the actual release binary.
Production packaging refuses a dirty checkout. The test helper allows temporary
dirty fixtures but labels their metadata `dirty-test-fixture`; publication rejects them.

Each platform runs `scripts/test-native-release.py`: extracted-archive smoke,
installation, overwrite refusal, explicit replacement, checksum-tamper refusal,
existing-binary preservation, and a custom Cargo target directory. It also
checks stale build/source rejection, unchanged semver, retained package
identity, conflicting metadata, and symlinked or modified sidecars. Packaging
runs the extracted binary smoke again and emits an archive, checksum file,
and metadata. No Bun installation is needed in these release jobs.

With `publish=false` (the default), artifacts remain on the workflow run for
review. `publish=true` stages all nine assets in a draft and compares GitHub's
recorded sizes and SHA-256 digests with the qualified local files before it
publishes an immutable prerelease. Already published releases and existing
asset names are never overwritten. Publishing is one explicit owner-operated workflow action;
merging source alone does not publish binaries.

A retry preserves matching assets in a partial draft and uploads only the
missing files. An exactly matching immutable release is verified without
changing it. Retain the original qualified artifacts and rerun only the failed
publisher job after an uncertain publication response; rebuilding signed
bytes for the same tag can produce a different package.

The release page is titled `ALGAL <tag>`. Its summary and `## Changes` come from
the tag's section of `CHANGELOG.md` (`## <tag>` with an optional ` - YYYY-MM-DD`
date), and `scripts/release-notes.py` generates the `## Install` and `## Verify`
sections from the qualified package records. Publishing stops before it creates
or edits the release when that section is missing, empty, or still says
Unreleased. The body ends with an `algal.release-page.v1` HTML comment that
records the tag, source commit, and archive digests. A retry accepts an existing
page only when its notes match the rendered changelog section exactly, so a
hand-edited draft is refused. Published releases are immutable; corrections
need a new changelog section and release tag.

The native semver remains `0.2.0`. The embedded commit/input digest and installed
package tag distinguish prerelease builds even when `algal --version` is identical. These packages
distribute the native kernel and process CLI. GitHub shepherd, coding-job
reconciliation, and repair validation currently run through the Bun host; the
native CLI independently verifies their portable process histories.

## Developer ID release setup

Starting with `v0.2.0-vm.12`, the macOS release pipeline requires Developer ID
Application signing for team `8AAP53VTW3`, identifier `dev.hraness.algal`, hardened
runtime, and a secure timestamp. Apple must return `Accepted`; `codesign
--check-notarization` must also pass before the binary can enter a release.
This source change alone does not publish a signed release or change the
published version record.

The `hraness-apple-release` GitHub environment must permit version tags only,
with no reviewer requirement or wait timer. Configure its five secrets:
`APPLE_DEVELOPER_ID_P12_BASE64`, `APPLE_DEVELOPER_ID_P12_PASSWORD`,
`APPLE_NOTARY_KEY_P8_BASE64`, `APPLE_NOTARY_KEY_ID`, and
`APPLE_NOTARY_ISSUER_ID`. Keep credentials out of build and packaging jobs.
Include the Developer ID Application certificate, its private key, and its
issuing Apple intermediate certificate in the PKCS#12 bundle. The current
identity uses Developer ID Certification Authority G2; a clean runner needs
that intermediate to validate the signing identity.

Dispatch `Native release` with the workflow ref set to the exact version tag
and `tag` set to the same value. A dispatch from `main` is rejected even when
its commit matches the tag. Successful CI for that exact main commit is still
required. The unsigned build artifact is selected by immutable artifact ID,
verified against its uploaded ZIP digest, and checked against the current run
and source commit before signing. The signing runner never executes the binary.
A fresh runner verifies and tests signed bytes, then creates the final archive,
manifest, and provenance. Publication checks the archive binary against the
hash recorded by the signing job.
When rerunning failed jobs, successful producers from earlier attempts remain
usable through their exact artifact IDs and digests. New uploads use separate
attempt names, and publication downloads only the selected producer outputs.

Apple review has a 15-minute wait limit. A timeout, rejection, or interruption
fails closed and does not publish. The `algal-apple-notarization-*` workflow
artifact retains the submission UUID and input, executable, and upload hashes
without credentials. Query that existing submission before deciding on another
release attempt; rerunning the signing job submits again. Do not automatically
retry. The temporary keychain and credential files are removed in the helper's
cleanup and an unconditional workflow cleanup step. Hard runner termination
may prevent final diagnostic upload; inspect the completed submission log.

The installers verify the team, identifier, Developer ID certificate, hardened
runtime, timestamp, and online notarization before executing new Mac releases.
Explicit `vm.1` through `vm.11` and earlier versions remain installable under
the historical checksum checks. Linux installation behavior is unchanged.
A stable signing identity helps macOS recognize an upgrade; it does not grant
or replace Accessibility, Screen Recording, or other user permissions.
