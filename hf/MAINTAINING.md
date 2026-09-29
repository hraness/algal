# Maintaining the Hugging Face dataset

Target: `hranesscom/algal-experiments`, repository type `dataset`.
The source of truth is this Git repository. `README.md` in this directory is the
dataset card; `manifest.json` is the explicit source/destination/checksum list.
`stage.py` uses Python's standard library and performs no network or inference.

## Prepare an update

1. Add a dated, public experiment summary through the repository's
   normal review and checks. Preserve earlier files, failures, fixture versions,
   model/runtime identities, exposure, and timing boundaries. A new fixture
   requires a new identity. Never relabel a development set as unseen.
2. Review the exact content and redistribution terms before adding it to
   `manifest.json`. Keep provider credentials, user inputs, raw execution stores, third-party Terminal-Bench task content, private traces,
   signing material, and provider account records out. The current export
   includes only the reviewed public JSON summaries and the root license.
3. Add explicit paths and SHA-256 values, plus the exact source/destination pair
   in `stage.py`. New studies need new immutable `studies/<study-id>/` paths.
   Do not glob `docs/` or export a workspace. A changed checksum requires reviewing the changed bytes. Update
   the card alongside a new study and retain its limitations.
4. Run `python3 -B hf/stage.py` and `python3 -B hf/test_stage.py`, then the
   repository gate `bun run check`. Commit and integrate the reviewed changes.
5. From the clean integrated checkout, stage to a new directory outside it:

   ```sh
   python3 -B hf/stage.py --output /tmp/algal-hf-reviewed-export
   ```

   Choose another new directory for subsequent updates. Inspect the card and
   manifest, compare them with the last Hub revision, and preserve history.
   `rights_status: reviewed-existing-mit` records the review of the current
   project-owned public summaries and license. Review redistribution rights
   again for every added or changed artifact; staging does not approve publication.

## Publish the reviewed export

Use the supported Hugging Face `hf` CLI in an authenticated environment. The
reviewed command version is `huggingface-hub==2.0.0`, invoked through
`uvx --from huggingface-hub==2.0.0 hf`. Check its `--help`, `auth whoami`, and
`upload --help` before use; this checkout
does not install the CLI, create tokens, or configure credentials. Confirm the
account can write to the `hranesscom` organization and that the destination is
the dataset above. Keep authentication material outside the repository and logs.

On 2026-09-27, Ben approved the reviewed initial publication and granted standing
authority for routine reviewed synchronization to the existing
`hranesscom/algal-experiments` dataset. Future agents may publish reviewed updates
there without asking for the same permission again after the repository's
required checks pass. Preserve historical study files, license and attribution
records, source identities, limitations, and the remote hash verification below.
Review rights for each changed or added artifact. This permission does not cover
new destinations, private data, paid resources, or deletion of historical studies.
A completed local stage alone does not satisfy these review and validation gates.
Upload the reviewed stage:

```sh
uvx --from huggingface-hub==2.0.0 hf auth whoami
uvx --from huggingface-hub==2.0.0 hf upload hranesscom/algal-experiments \
  /tmp/algal-hf-reviewed-export . --repo-type dataset --revision main \
  --commit-message "Sync reviewed ALGAL experiment export"
```

The CLI has no dry-run flag; local validation and the reviewed file comparison
provide that check. `--create-pr` is available when a Hub review branch is needed.
Do not upload the Git checkout. Do not delete remote files or overwrite an
existing study with new observations. Coordinate one publisher and recheck the
observed remote revision immediately before writing. If it changed, compare and
restage before proceeding. Reconcile an uncertain upload before retrying.

Record the resulting Hub commit URL with the source commit and manifest digest.
Read the card and downloaded manifest back from that revision, compare all file
hashes, and check the canonical `https://algal.computer` link. No weight download,
provider run, new benchmark, or product release is required by dataset sync.

## Copy record

Dataset card and runbook drafted by the Codex ALGAL Hugging Face worker.
Publication permission is recorded above; successful uploads require their own
remote commit and verification evidence.

On 2026-09-28, Codex reviewed redistribution of
`docs/cumulative-skill-results-2026-09-28.json` for the existing MIT dataset.
It contains project-owned synthetic-study methods, aggregate measurements,
content hashes, failures, and limitations. The export contains no task text,
raw stores, private traces, credentials, or provider account records. Provider
charges remain unknown. The earlier two study files and license are unchanged.

On 2026-09-29, Codex reviewed redistribution of
`docs/cumulative-skill-v6-results-2026-09-28.json`. It contains the stopped
calibration aggregate, execution identities, partial token accounting, archive
hash, failures, and limits. The raw GitHub evidence archive, synthetic task
text, model responses, recovery diagnosis, and provider account records remain
outside the Hugging Face export. Provider charges remain unknown.

On 2026-09-29, Claude Code reviewed redistribution of
`docs/cumulative-skill-v7-results-2026-09-29.json`. It contains the stopped
calibration aggregate with per-generation round modes, batch pass counts,
writer-request and manifest digests, execution identities, partial token
accounting, one recorded transport failure, and limits. The raw evidence
archive in the source repository, synthetic task text, model responses, and
provider account records remain outside the Hugging Face export. Provider
charges remain unknown.
