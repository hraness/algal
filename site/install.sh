#!/bin/sh
# Install the ALGAL native CLI.
#
#   curl -fsSL https://algal.computer/install.sh | sh
#   curl -fsSL https://algal.computer/install.sh | ALGAL_VERSION=<tag> sh   # one exact release
#
# This script downloads the archive for your platform from the GitHub Release,
# checks it against the release's .sha256 file, checks the executable against
# the digest recorded inside the archive, and installs ~/.local/bin/algal.
# Nothing runs as root, and it needs only sh, curl, tar, and sha256sum or shasum.
# Options (environment): ALGAL_VERSION (a release tag such as v0.2.0-vm.11),
# ALGAL_INSTALL_PREFIX (default ~/.local).
# Source: https://github.com/hraness/algal/blob/main/site/install.sh
#
# Everything is inside main(), so a partial download runs nothing.

main() {
  set -eu
  # algal.computer renders this from site/published-release.json; never type it.
  default_tag="@ALGAL_RELEASE_TAG@"
  repository="hraness/algal"
  guide="https://algal.computer/docs/native-release/"

  tag="${ALGAL_VERSION:-$default_tag}"
  case "$tag" in v*) ;; *) tag="v$tag" ;; esac
  printf '%s\n' "$tag" | LC_ALL=C grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?$' \
    || fail "ALGAL_VERSION must be a release tag such as v0.2.0-vm.11 (got '$tag')"
  [ -n "${HOME:-}" ] || [ -n "${ALGAL_INSTALL_PREFIX:-}" ] \
    || fail "HOME is not set; set ALGAL_INSTALL_PREFIX to choose where algal goes"

  os=$(uname -s)
  arch=$(uname -m)
  case "$os/$arch" in
    Darwin/arm64 | Darwin/aarch64) target=aarch64-apple-darwin ;;
    Linux/x86_64 | Linux/amd64) target=x86_64-unknown-linux-gnu ;;
    Linux/aarch64 | Linux/arm64) target=aarch64-unknown-linux-gnu ;;
    *) fail "there is no release build for $os/$arch yet; build from source: $guide" ;;
  esac

  command -v curl >/dev/null 2>&1 || fail "curl is required"
  command -v tar >/dev/null 2>&1 || fail "tar is required"
  if command -v sha256sum >/dev/null 2>&1; then
    hash_file() { sha256sum "$1" | cut -d ' ' -f 1; }
  elif command -v shasum >/dev/null 2>&1; then
    hash_file() { shasum -a 256 "$1" | cut -d ' ' -f 1; }
  else
    fail "sha256sum or shasum is required"
  fi

  # ALGAL_DOWNLOAD_BASE exists for testing a packaged release before upload.
  base="${ALGAL_DOWNLOAD_BASE:-https://github.com/$repository/releases/download/$tag}"
  protocols='=https'
  case "$base" in file://*) protocols='=file' ;; esac
  name="algal-$tag-$target"

  temporary=$(mktemp -d "${TMPDIR:-/tmp}/algal-install.XXXXXX")
  trap 'rm -rf "$temporary"' EXIT
  trap 'exit 1' HUP INT TERM

  echo "Installing ALGAL $tag for $os $arch"
  download "$base/$name.tar.gz.sha256" "$temporary/$name.tar.gz.sha256" \
    || fail "$tag has no release build for $target; see $guide"
  download "$base/$name.tar.gz" "$temporary/$name.tar.gz" \
    || fail "could not download $name.tar.gz"

  # The checksum file must name exactly this archive.
  expected=$(cat "$temporary/$name.tar.gz.sha256")
  [ "$expected" = "$(hash_file "$temporary/$name.tar.gz")  $name.tar.gz" ] \
    || fail "checksum mismatch for $name.tar.gz; nothing was installed"

  # Accept exactly the four files a release archive holds.
  listing=$(tar -tzf "$temporary/$name.tar.gz" | LC_ALL=C sort | tr '\n' ' ')
  [ "$listing" = "$name/LICENSE $name/bin/algal $name/release.json $name/smoke.py " ] \
    || fail "unexpected files in $name.tar.gz; nothing was installed"
  mkdir "$temporary/x"
  tar -xzf "$temporary/$name.tar.gz" -C "$temporary/x" "$name/bin/algal" "$name/release.json"
  staged="$temporary/x/$name/bin/algal"
  metadata="$temporary/x/$name/release.json"
  [ -f "$staged" ] && [ ! -L "$staged" ] && [ -f "$metadata" ] && [ ! -L "$metadata" ] \
    || fail "the archive does not hold a regular executable; nothing was installed"
  [ "$(wc -c < "$metadata")" -le 16384 ] || fail "release metadata is too large"

  # release.json records the target and the executable's SHA-256.
  digest=$(hash_file "$staged")
  grep -q "\"binarySha256\":\"$digest\"" "$metadata" \
    || fail "the executable does not match its release record; nothing was installed"
  grep -q "\"target\":\"$target\"" "$metadata" \
    || fail "the archive is for another platform; nothing was installed"
  chmod 755 "$staged"
  version=$("$staged" --version 2>/dev/null) || {
    if [ "$os" = Linux ]; then
      fail "the $target build did not start; it needs glibc 2.39 or newer (check with: getconf GNU_LIBC_VERSION)"
    fi
    fail "the $target build did not start"
  }

  prefix="${ALGAL_INSTALL_PREFIX:-$HOME/.local}"
  bin="$prefix/bin"
  [ ! -L "$prefix" ] && [ ! -L "$bin" ] || fail "$prefix and $bin must not be symlinks"
  [ ! -L "$bin/algal" ] || fail "refusing to replace the symlink $bin/algal"
  [ ! -e "$bin/algal" ] || [ -f "$bin/algal" ] || fail "$bin/algal is not a regular file"
  had_algal=0
  [ -e "$bin/algal" ] && had_algal=1
  mkdir -p "$bin"

  # Keep the release record keyed by the executable's digest, so `algal doctor`
  # reports which release it came from. Never replace a different record.
  records="$bin/.algal-releases"
  [ ! -L "$records" ] || fail "$records must not be a symlink"
  mkdir -p "$records"
  record="$records/$digest.json"
  if [ -e "$record" ] || [ -L "$record" ]; then
    [ ! -L "$record" ] && cmp -s "$record" "$metadata" \
      || fail "$record holds a different release record; nothing was installed"
  else
    cp "$metadata" "$record.$$"
    mv "$record.$$" "$record"
  fi

  # Rename on the same filesystem, so the old executable stays until the new
  # one is complete.
  cp "$staged" "$bin/.algal-install.$$"
  chmod 755 "$bin/.algal-install.$$"
  mv -f "$bin/.algal-install.$$" "$bin/algal"

  echo "Installed $version at $bin/algal"
  case ":${PATH:-}:" in
    *":$bin:"*) ;;
    *) echo "Add $bin to your PATH to run algal by name." ;;
  esac
  if [ "$had_algal" = 0 ]; then
    echo
    echo "Next: algal doctor"
    echo "Guide: $guide"
  fi
}

download() {
  curl -fsSL --proto "$protocols" --tlsv1.2 --connect-timeout 15 --max-time 300 -o "$2" "$1"
}

fail() {
  printf 'algal install: %s\n' "$*" >&2
  exit 1
}

main "$@"
