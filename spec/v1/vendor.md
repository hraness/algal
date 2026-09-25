# algal.vendor.v1 · algal.registries.v1 · algal.vendor-check.v1 · algal.vendor-update.v1

Vendoring copies a catalog entry, with every entry it calls, from a `docs/library.md`-format catalog page into a fresh directory of a project. The `algal.vendor.v1` record beside the copy names the page's address and digests the copy must keep. Three additive contracts extend that pin without changing it: `algal.registries.v1` gives catalog addresses names, `algal.vendor-check.v1` reports what a recorded address serves now, and `algal.vendor-update.v1` proposes a fresh copy. `lock` and `lock --verify` read every record offline; only the `vendor` commands contact the network, and downloaded program text is compiled, never executed.

These contracts ship in the TypeScript runtime. Native parity is proposed, not implemented.

## Vendored record

`algal vendor <catalog> --entry <path.algal> --into <dir>` writes the copied files, each keeping its catalog path, plus `algal.vendor.json`: `{contract, origin, catalog, entry, files[]}`. The `origin` is the normalized address the page was read from (an https URL, or a file URL for a local page), `catalog` the SHA-256 of the page bytes, `entry` the vendored path, and each `files` item `{path, sourceDigest, manifestDigest, interfaceDigest}`. The copy is refused unless every file compiles, from the copied files alone, to the digests the page lists, and it is written only into a directory that did not exist, without following symlinks and without replacing a file. A lock's `vendored` section pins `{directory, origin, catalog, entry, record}` per directory, where `record` is the digest of the record's canonical JSON.

Fetches stay inside the vendoring bounds: https only (plain http is refused, and a loopback http address is reachable only through the test seam), no credentials, query, or fragment, redirects only within the page's host, at most 4 of them, one timeout per request (15 seconds default, at most 60), 128 KiB for the page, 64 KiB for each program, at most 16 files and 16 vendored directories per project.

## Named origins

`algal.registries.v1` is `{contract, registries}`: a map of at most 16 names to catalog origins. A name is at most 64 characters of ASCII letters, digits, `.`, `_`, and `-`, starting with a letter or digit. The file `algal.registries.json` at a project root supplies the names `vendor --from` and `vendor check --from` resolve; `lock --registries` copies the map into the lock's optional `registries` field. The field is advisory: it is parsed strictly (unknown keys rejected, every name and origin validated) but never verified, because it cannot be derived from source. Its presence changes the lock digest only for locks that carry it; a lock without the field serializes exactly as before.

## Vendor check

`algal vendor check <program.algal>` finds each vendored directory the project imports, reads the record's `origin` under the vendoring bounds, and emits an `algal.vendor-check.v1` report: `{contract, from?, entries[]}` with one entry per directory sorted by unique directory — `{directory, entry, origin, catalog, record, status, live?, reason?}`. `catalog` is the pinned page digest, `record` the pin a lock would write, `live` the fetched page's digest, and `status` one of:

- `unchanged` — the live page digests to the pinned catalog.
- `update-available` — the page moved and still lists the entry.
- `removed` — the page parses but cannot resolve the entry; requires `live` and `reason`.
- `unreadable` — the page could not be fetched or parsed; requires `reason` and carries `live` when bytes arrived.

Every outcome is a fact, not a failure: the command exits 0 on any status, writes nothing, and performs at most one fetch per vendored directory. `--from` restricts the report to records naming one origin and is recorded on the report. The parser enforces the coherence a forged report cannot pass: `reason` appears exactly on `removed` and `unreadable`, `live` is required for `unchanged`, `update-available`, and `removed`, entries are sorted and unique, and the report fits its byte and node bounds. Rendering accepts only a report this module produced or parsed.

## Vendor update

`algal vendor update <directory> --into <dir>` reads the copy's record, re-runs the vendoring pipeline against its `origin` and `entry`, and writes the result into a directory that did not exist. It emits an `algal.vendor-update.v1` proposal `{contract, status, from, to}`: `from` is the pin the lock holds, `to` is the pin a re-lock would write for the new directory, and `status` is `update-available` when the fetched page's digest moved, `unchanged` when a re-vendor produced the identical pin. The proposal is data; nothing edits a lock, updates an import, or removes the pinned copy. A page that drops the entry or lists digests the programs no longer compile to refuses before anything is written. Applying a proposal is a separate, visible step: point imports at the new directory, write a new lock, and remove the old directory when nothing pins it.
