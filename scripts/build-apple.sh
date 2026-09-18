#!/bin/sh
set -eu
if [ "$(uname -s)" != Darwin ]; then
  printf '%s\n' 'Apple Foundation Models requires macOS and Xcode 26 or newer.' >&2
  exit 1
fi
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output=${1:-"$root/target/debug/algal-apple"}
mkdir -p "$(dirname -- "$output")"
src=$(mktemp "${TMPDIR:-/tmp}/algal-apple.XXXXXX.swift")
trap 'rm -f "$src"' EXIT
# The bridge source lives in the pinned apple-foundation crate; emit it
# rather than vendoring a copy.
cargo run --quiet --manifest-path "$root/Cargo.toml" --example emit_bridge_source > "$src"
xcrun swiftc -parse-as-library -O -target arm64-apple-macosx26.0 \
  "$src" -o "$output"
printf '%s\n' "$output"
