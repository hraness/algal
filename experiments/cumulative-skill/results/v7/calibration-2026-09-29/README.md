# V7 calibration evidence

This archive contains the closed September 29, 2026 V7 calibration study. The
predeclared calibration gate stopped the study after two of four fresh seed
searches produced passing seeds and the other two exhausted eight generations.
No confirmatory block ran.

- Source commit: `741f19ec9f0e82bb8d87a89ff39eeee6e82d01e3`
- Freeze: `sha256:cf5d70311223896ab5baad1a515652a5245b2a59f042c3ba9e2e70be2c0dc77a`
- Archive: `evidence.tar.gz`
- Archive SHA-256: `93a9944964905ecfb8def566446863e647eff241c3581113ad4bb97d6b4b1a86`
- Archive contents: 496 reviewed files, 115 receipt records, 26,266,596 uncompressed bytes
- Extracted replay: passed 115 receipts using the frozen source commit and Bun 1.3.14

The archive is a deterministic, review-bound copy of the study's protocol,
task snapshots, completion records, attempt bindings, seed snapshots,
development-score records, and portable manifests, runs, and values. It
excludes local indexes, effect caches, mutable slots, logs, credentials, and
other local state. Its receipts preserve synthetic task evidence and model
outputs; they do not attest provider billing or establish model quality.
Hugging Face receives only the sanitized aggregate JSON and card, never this
raw archive.

The committed `arms/v7/protocol.json` is the preregistered artifact and keeps
its pre-run `status` field; the frozen copy inside this archive is
byte-identical to it at the source commit.

Use the machine-readable [public result](../../../../../docs/cumulative-skill-v7-results-2026-09-29.json)
for aggregate findings and limitations. Replay the archive with the V7 replay
entry point at the frozen source commit; the archive's own manifest and review
records describe its closure and hash checks.
