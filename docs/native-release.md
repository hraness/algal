# Native prerelease distribution

The native process VM can run without Bun, Cargo, or a repository checkout.
Binary packages are qualified on two targets:

| Archive target | Supported qualification environment |
| --- | --- |
| `x86_64-unknown-linux-gnu` | Ubuntu 24.04 x86_64, glibc 2.39 or newer |
| `aarch64-apple-darwin` | macOS 14 or newer on Apple silicon |

These are prerelease targets. Other Linux architectures, older glibc systems,
Intel Macs, and Windows do not yet have equivalent package qualification.
The Apple Foundation Models bridge is a separate optional build requiring
compatible macOS/Xcode; it is not part of the portable CLI package.

## Verify and install

Download the target's `.tar.gz` and matching `.tar.gz.sha256` from the same
GitHub release. Each archive contains `bin/algal`, `LICENSE`, `release.json`,
and `smoke.py`. The metadata records the source commit, release tag, native
version, clean source state, Rust toolchain, target, binary digest, and smoke result.
The adjacent `.release.json` manifest also binds the archive filename and SHA-256.

For example, with a reviewed checkout at the release tag:

```sh
sh scripts/install-native.sh "$HOME/.local" \
  --archive ./algal-v0.2.0-vm.3-aarch64-apple-darwin.tar.gz \
  --checksum ./algal-v0.2.0-vm.3-aarch64-apple-darwin.tar.gz.sha256
"$HOME/.local/bin/algal" doctor
```

The archive installer requires Python 3 and verifies both the archive checksum
and the binary digest before executing or installing it. Compressed input,
expanded tar bytes and individual members are bounded before extraction; PAX
headers cannot bypass the expansion limit. It extracts only the
executable, rejects a mismatched platform, and refuses an existing installation
unless `--force` is supplied. Replacements use an atomic rename on the target
filesystem; failed verification preserves the existing executable. Source
installation keeps the original `sh scripts/install-native.sh [PREFIX]` form,
builds with `--locked`, and honors `CARGO_TARGET_DIR`.

You can instead verify the checksum yourself, unpack the archive, and run
`bin/algal` directly. Run `python3 smoke.py ./bin/algal` from the unpacked
package to check native execution in a fresh store. Python is a verification
helper dependency, not a CLI runtime dependency. The smoke creates a process,
suspends on a mailbox, wakes and resumes it in separate CLI invocations, and
verifies both generations offline with no provider credentials.

Checksums detect corruption and accidental substitution against the checksum
file you trust. They are not a publisher signature. macOS packages are unsigned
and not notarized; this workflow does not request signing credentials or remove
quarantine attributes. Follow your organization's policy for downloaded CLI
binaries. Production signing/notarization remains separate work.

## Build and publish an exact source release

`.github/workflows/release.yml` is manually dispatched with an existing version
tag. The tagged commit must have a completed successful main push CI run.
The workflow checks out that exact commit on each qualified platform, builds
with pinned Rust 1.97.1 and `Cargo.lock`, and qualifies the actual release binary.
Production packaging refuses a dirty checkout. The test helper allows temporary
dirty fixtures but labels their metadata `dirty-test-fixture`; publication rejects them.

Each platform runs `scripts/test-native-release.py`: extracted-archive smoke,
installation, overwrite refusal, explicit replacement, checksum-tamper refusal,
existing-binary preservation, and a custom Cargo target directory. Packaging
runs the extracted binary smoke again and emits an archive, checksum file,
and metadata. No Bun installation is needed in these release jobs.

With `publish=false` (the default), artifacts remain on the workflow run for
review. `publish=true` attaches verified assets to a draft or prerelease,
creating a prerelease if needed. Stable releases and existing asset names are
never overwritten. Publishing is one explicit owner-operated workflow action;
merging source alone does not publish binaries.

The next intended source prerelease is `v0.2.0-vm.3`; the native semver remains
`0.2.0`. The metadata's tag and source commit distinguish prerelease builds even
when `algal --version` is identical. These packages distribute the native kernel
and process CLI; the GitHub shepherd host currently remains a Bun application.
