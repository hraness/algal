#!/bin/sh
# Rebuild with the reviewed, isolated, locked recipe. Install Rust 1.97.1
# and wasm32-unknown-unknown, then cargo fetch --locked once. The build is
# offline and never selects a fallback toolchain.
set -eu

cd "$(dirname "$0")/.."
exec bun verify/artifact/run.ts build
