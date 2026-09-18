#!/bin/sh
# Build the algal-expr evaluator for wasm32 and place it where the Bun
# runtime loads it (src/algal_expr.wasm). One evaluator, two targets:
# crates/algal links the crate natively; this wasm serves the TS runtime.
#
# wasm32 std requires a rustup-managed toolchain — Homebrew rustc ships
# without it. Honor ALGAL_EXPR_TOOLCHAIN (e.g. "1.97.1") or auto-detect the
# first installed rustup toolchain that has the target.
set -eu

cd "$(dirname "$0")/.."
OUT=src/algal_expr.wasm
TARGET=wasm32-unknown-unknown

pick_toolchain() {
    if [ -n "${ALGAL_EXPR_TOOLCHAIN:-}" ]; then
        echo "$ALGAL_EXPR_TOOLCHAIN"
        return
    fi
    for tc in $(rustup toolchain list 2>/dev/null | sed 's/ .*//'); do
        if rustup target list --toolchain "$tc" --installed 2>/dev/null | grep -qx "$TARGET"; then
            echo "$tc"
            return
        fi
    done
}

if command -v rustup >/dev/null 2>&1; then
    TC=$(pick_toolchain)
    if [ -z "$TC" ]; then
        echo "no rustup toolchain has $TARGET — run: rustup target add $TARGET" >&2
        exit 1
    fi
    echo "building with rustup toolchain $TC" >&2
    # cargo resolves rustc via PATH, which may be a rustup-less rustc
    # (Homebrew) — pin RUSTC to the toolchain's so wasm32 std is found.
    RUSTC="$(rustup which --toolchain "$TC" rustc)"
    export RUSTC
    rustup run "$TC" cargo build -p algal-expr --target "$TARGET" --release
else
    echo "rustup not found; trying PATH cargo" >&2
    cargo build -p algal-expr --target "$TARGET" --release
fi

cp "target/$TARGET/release/algal_expr.wasm" "$OUT"
echo "wrote $OUT ($(wc -c <"$OUT" | tr -d ' ') bytes)" >&2
