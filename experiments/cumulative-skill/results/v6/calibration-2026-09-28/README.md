# V6 calibration evidence

This archive contains the closed September 28, 2026 V6 calibration study. The
predeclared calibration gate stopped the study after two of three fresh seed
searches produced passing seeds and the third exhausted eight generations. No
confirmatory block ran.

- Source commit: `f8ddcf9dc0fb82e638c0a9405d2b0df289b09274`
- Freeze: `sha256:0beca4ec2f85482adb8806506fa902702e4b36eb32a5adb166bc487e254d8a27`
- Archive: `evidence.tar.gz`
- Archive SHA-256: `3d536bf21475745992461730b07a6fea7561759cdae80a5cccce0178159fff79`
- Archive contents: 239 reviewed files, 43 receipt records, 19,484,593 uncompressed bytes
- Extracted replay: passed 43 receipts using the frozen source commit and Bun 1.3.14

The archive is a deterministic, review-bound copy of the study's protocol,
task snapshots, completion records, attempt bindings, seed snapshots, and
portable manifests, runs, and values. It excludes local indexes, effect caches,
mutable slots, logs, credentials, and other local state. Its receipts preserve
synthetic task evidence and model outputs; they do not attest provider billing
or establish model quality. Hugging Face receives only the sanitized aggregate
JSON and card, never this raw archive.

Use the machine-readable [public result](../../../../../docs/cumulative-skill-v6-results-2026-09-28.json)
for aggregate findings and limitations. Replay the archive with the V6 replay
entry point at the frozen source commit; the archive's own manifest and review
records describe its closure and hash checks.
