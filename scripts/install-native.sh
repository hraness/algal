#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
prefix="$HOME/.local"
force=false
archive=
checksum=
seen_prefix=false
while [ "$#" -gt 0 ]; do
  case "$1" in
    --force) force=true ;;
    --archive) shift; archive=${1:?--archive requires a file} ;;
    --checksum) shift; checksum=${1:?--checksum requires a file} ;;
    --help) printf '%s\n' 'Usage: install-native.sh [PREFIX] [--force] [--archive PACKAGE.tar.gz --checksum PACKAGE.tar.gz.sha256]'; exit 0 ;;
    --*) printf '%s\n' "Unknown option: $1" >&2; exit 2 ;;
    *) [ "$seen_prefix" = false ] || { printf '%s\n' 'Only one installation prefix is accepted.' >&2; exit 2; }; prefix=$1; seen_prefix=true ;;
  esac
  shift
done
if [ -e "$prefix/bin/algal" ] && [ ! -f "$prefix/bin/algal" ]; then
  printf '%s\n' 'Installation target must be a regular executable file.' >&2; exit 1
fi
if [ -L "$prefix/bin/algal" ]; then
  printf '%s\n' 'Refusing to replace a symlink installation target.' >&2; exit 1
fi
if [ -e "$prefix/bin/algal" ] && [ "$force" != true ]; then
  printf '%s\n' "An algal executable exists at $prefix/bin/algal; use --force to replace it explicitly." >&2; exit 1
fi
if [ -n "$archive" ]; then
  [ -n "$checksum" ] || { printf '%s\n' '--archive requires --checksum' >&2; exit 2; }
else
  [ -z "$checksum" ] || { printf '%s\n' '--checksum requires --archive' >&2; exit 2; }
fi
mkdir -p "$prefix/bin"
staging=$(mktemp -d "$prefix/bin/.algal-install.XXXXXX")
trap 'rm -rf "$staging"' EXIT
trap 'exit 1' HUP INT TERM
if [ -n "$archive" ]; then
  python3 "$root/scripts/unpack-native.py" --archive "$archive" --checksum "$checksum" --out "$staging/algal"
else
  build_dir=${CARGO_TARGET_DIR:-"$root/target"}
  case "$build_dir" in /*) ;; *) build_dir="$PWD/$build_dir" ;; esac
  cargo build --manifest-path "$root/Cargo.toml" --target-dir "$build_dir" --release --locked -p algal --bin algal
  cp "$build_dir/release/algal" "$staging/algal"
fi
chmod 755 "$staging/algal"
"$staging/algal" doctor > "$staging/doctor.json"
# Install on the same filesystem. A concurrent target creation never gets
# overwritten without --force; both publication paths expose complete bytes.
if [ "$force" = true ]; then
  [ ! -L "$prefix/bin/algal" ] || { printf '%s\n' 'Installation target became a symlink.' >&2; exit 1; }
  [ ! -e "$prefix/bin/algal" ] || [ -f "$prefix/bin/algal" ] || { printf '%s\n' 'Installation target is no longer a regular file.' >&2; exit 1; }
  mv -f "$staging/algal" "$prefix/bin/algal"
else
  ln "$staging/algal" "$prefix/bin/algal"
fi
printf '%s\n' "Installed $prefix/bin/algal"
printf '%s\n' 'Optional Apple bridge: build separately with scripts/build-apple.sh.'
