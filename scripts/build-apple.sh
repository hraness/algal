#!/bin/sh
set -eu
if [ "$(uname -s)" != Darwin ]; then
  printf '%s\n' 'Apple Foundation Models requires macOS and Xcode 26 or newer.' >&2
  exit 1
fi
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output=${1:-"$root/target/debug/algal-apple"}
mkdir -p "$(dirname -- "$output")"
xcrun swiftc -parse-as-library -O -target arm64-apple-macosx26.0 \
  "$root/native/apple/AlgalApple.swift" -o "$output"
printf '%s\n' "$output"
