# V8 calibration evidence

This archive contains the closed September 29, 2026 V8 calibration study. The
predeclared calibration gate failed after one of four fresh seed searches
exhausted eight generations and only two fixed seeds could show headroom; the
fourth search was interrupted by the launching session during generation
seven and, by protocol, was not retried. No confirmatory block ran, and the
preregistered line rule ends the development-feedback seed line.

- Source commit: `dc64c02f9274ae92f5475cc9a9a2a4f2c8e4fd57`
- Freeze: `sha256:c926270aa709562c4ecc5b588bd65890dd1bd508676ea2e38809428bc02f8f0e`
- Archive: `evidence.tar.gz`
- Archive SHA-256: `8e25aa442f392247567fed30116997ea0d2783c74b47b39370fe740d67fdbb94`
- Archive contents: 373 reviewed files, 84 receipt records, 23,766,076 uncompressed bytes
- Extracted replay: passed 84 receipts using the frozen source commit and Bun 1.3.14

The archive is a deterministic, review-bound copy of the study's protocol,
task snapshots, attempt bindings, seed snapshots, development-score records,
the reconciliation record, and portable manifests, runs, and values. It
excludes local indexes, effect caches, mutable slots, logs, credentials, and
other local state. Its receipts preserve synthetic task evidence and model
outputs; they do not attest provider billing or establish model quality.
Hugging Face receives only the sanitized aggregate JSON and card, never this
raw archive.

Because the `cal-d` seed stage never closed, the driver could not write
`calibration.json`, `results.json`, or `replay.json`. The archive carries
`reconciliation.json` in their place: it reproduces the three complete rows
through the frozen driver's inspection code, verifies the incomplete stage's
binding, snapshot chain, account, route, and receipts, computes the gate
decision over the complete blocks, and replays every receipt in every store
with the driver's verifier. The `cal-d` seed attempt has its binding, input,
and every retained snapshot but no `result.json`. The packaging tool accepts
this shape only with the reconciliation record present and the completion
artifacts absent, and the extracted copy reproduces the record exactly.

The committed `arms/v8/protocol.json` is the preregistered artifact and keeps
its pre-run `status` field; the frozen copy inside this archive is
byte-identical to it at the source commit.

Use the machine-readable [public result](../../../../../docs/cumulative-skill-v8-results-2026-09-29.json)
for aggregate findings, the interruption, and limitations. The archive's own
manifest and review records describe its closure and hash checks.
