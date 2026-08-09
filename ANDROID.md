# OmniGraph: native Android build

This checkout is pinned to upstream `v0.8.1`. Build it from the normal Termux
prompt, **not** from Debian/Ubuntu started through PRoot.

## Build

```sh
pkg update
pkg install rust clang lld cmake ninja pkg-config protobuf

rustc -vV
# Expected host: aarch64-linux-android

cargo build --release --locked -p omnigraph-cli
./target/release/omnigraph --version
```

If `rustc -vV` reports `aarch64-unknown-linux-gnu`, run `exit` until you are
back in native Termux. A GNU build still goes through PRoot and does not test
the Android/Bionic path.

## Verify native storage

```sh
./scripts/check-android-native.ts
```

Keep databases in Termux private storage (`$PREFIX/var/lib` or the Termux home
directory), not `/sdcard`, whose shared-storage filesystem has different rename
and locking semantics.

## Ponytail rules

- Use native `cargo build`; do not add `cargo-ndk`, Docker, Gradle, or a wrapper
  until the direct build proves insufficient.
- Fix only the first reproducible compiler/runtime failure. Do not fork Lance
  pre-emptively.
- Build `omnigraph-cli`, not the whole workspace.
- Record the first failure with
  `cargo build --release --locked -p omnigraph-cli 2>&1 | tee build.log`.

Known PRoot failure: [ModernRelay/omnigraph#453](https://github.com/ModernRelay/omnigraph/issues/453).

<!-- ponytail: Android has no upstream CI/support contract; add an aarch64-linux-android CI job only when the native build works and upstream agrees to maintain the target. -->
