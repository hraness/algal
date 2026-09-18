#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
prefix=${1:-"$HOME/.local"}
cargo build --manifest-path "$root/Cargo.toml" --release --locked
mkdir -p "$prefix/bin"
if [ -e "$prefix/bin/algal" ]; then
  printf '%s\n' "An algal executable already exists at $prefix/bin/algal; move or replace it deliberately after reviewing the new build." >&2
  exit 1
fi
cp "$root/target/release/algal" "$prefix/bin/algal"
chmod 755 "$prefix/bin/algal"
if [ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ]; then
  if [ -e "$prefix/bin/algal-apple" ]; then
    printf '%s\n' "Keeping existing $prefix/bin/algal-apple; rebuild it deliberately with scripts/build-apple.sh." >&2
  elif xcrun --find swiftc >/dev/null 2>&1; then
    sh "$root/scripts/build-apple.sh" "$prefix/bin/algal-apple"
  else
    printf '%s\n' 'ALGAL installed without the optional Apple bridge; Xcode 26 is required to build it.' >&2
  fi
fi
printf '%s\n' "Installed $prefix/bin/algal"
