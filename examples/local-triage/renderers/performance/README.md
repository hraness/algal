# Bounded renderer measurements

The 2026-09-23 qualification measures the existing marketing embed and the exact
macOS arm64 package from commit `39607174063030eb4793ab65601a41d7d7c918d4`.
[measurement.json](measurement.json) retains the results, artifact identities,
environment, evidence hashes and limitations. [budgets.json](budgets.json) was
written before measurement; these are provisional local budgets, not production
SLOs. No model call was made.

| Measurement | Observed | Declared ceiling | Result |
| --- | ---: | ---: | --- |
| Embed assets, raw / gzip | 288,821 / 95,438 bytes | 1 MiB / 256 KiB | Pass |
| Embed cold readiness, 5 contexts, p95 | 40.8 ms | 2,000 ms | Pass |
| Synchronous evaluation and DOM update, 1,000 swaps, p95 | 0.2 ms | 16.7 ms | Pass |
| Retained JS heap after swaps and 100 mount cycles | +772,676 bytes | +8 MiB | Pass |
| Retained DOM nodes / outside mutations | 0 / 0 | 0 / 0 | Pass |
| Packaged host cold capture, 5 processes, p95 | 83.0 ms | 2,000 ms | Pass |
| Packaged TUI complete snapshot, 5 processes, p95 | 241.7 ms | 2,500 ms | Pass |
| CLI/TUI peak RSS | 87,425,024 bytes | 256 MiB | Pass |
| Desktop accessibility-visible readiness, observed upper bound | 4,976 ms | 5,000 ms | Pass, one upper bound |
| Desktop complete/reopen including CUA, 20 actions, p95 | 2,751 ms | 2,000 ms | **Fail** |
| Desktop main-process RSS growth after 20 actions | +1,622,016 bytes | +32 MiB | Pass |
| Separate packaged host action path, 20 actions, p95 | 916.5 ms | 2,000 ms | Pass, separate diagnostic |

The desktop result includes CUA clicking, automatic scrolling and accessibility
observation. The service-only diagnostic includes the operation-digest process,
command file staging, command process, durable publication and returned capture
parsing used by the native model. It excludes UI dispatch and painting. It does
not replace the failed desktop result or establish click-to-paint latency.
Desktop performance therefore remains experimental within this bounded profile.
All 20 observed native transitions completed correctly, followed by normal quit.

The embed's nine checks also retained keyboard focus, the second mount, host
styles, the host draft and the host route. Startup starts before module import
and ends at the first animation frame after both mounts; static fallback already
exists. Tests use fresh Chromium contexts and loopback transport. Synchronous
update time excludes later paint. Heap measurements follow explicit GC and do
not establish total native/WASM memory behavior. Desktop RSS excludes separately
managed WebKit processes. The TUI number measures its complete terminal snapshot,
not a terminal emulator's presentation latency.

The earlier [Dioxus Web spike](../../../malleable-site/renderers/measurement.json)
weighed 362,713 raw / 148,449 gzip bytes. It is a passive captured-tree renderer,
so this is not an equivalent interactive workload comparison.

The Dioxus desktop renderer and its WebView/GTK/servo dependency tree were
subsequently removed: the example could not reach fixes for advisories the tree
carried. The desktop rows and the CUA/native observer scripts that produced them
are retained here only as this dated record; the package is now the terminal
application plus the standalone host.

## Reproduce

Use an existing site build and extracted package, installed Bun, and explicitly
supplied installed Playwright/Chromium. Each output directory must be fresh;
declarations and results use exclusive writes. The scripts retain generated
32-task qualification state and do not access personal application state.
Run through the installed host scheduler with the full child arguments:

```sh
host-run --mode=shared --lane=browser-auth --label=algal-renderer-performance-browser -- \
  bun examples/local-triage/renderers/performance/browser.ts \
  SITE_DIST FRESH_BROWSER_OUTPUT PLAYWRIGHT_MODULE CHROMIUM_EXECUTABLE
host-run --mode=shared --lane=mac-native --label=algal-renderer-performance-native -- \
  bun examples/local-triage/renderers/performance/native.ts \
  PACKAGE_ROOT FRESH_NATIVE_OUTPUT
host-run --mode=shared --lane=mac-native --label=algal-renderer-performance-host-actions -- \
  bun examples/local-triage/renderers/performance/host-actions.ts \
  PACKAGE_ROOT FRESH_ACTION_OUTPUT
```

Resolve these tools to installed absolute paths for reviewed host access.
Preserve failed/unavailable reports alongside successful
diagnostics. Raw local receipts are identified by name and SHA-256 in the summary;
they remain outside the repository with the package qualification evidence.
