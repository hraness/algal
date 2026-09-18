//! Writes the pinned apple-foundation bridge Swift source to stdout.
//! Used by scripts/build-apple.sh to compile `algal-apple` without
//! vendoring a copy of the bridge.

fn main() {
    print!("{}", apple_foundation::SWIFT_SOURCE);
}
