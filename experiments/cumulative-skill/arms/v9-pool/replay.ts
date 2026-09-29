// Replays only a closed study. Recorded effects replace the provider. A
// reconciled stage is listed as reconciled; its retained receipts still replay.
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Digest } from "../../../../src/digest";
import { parseRunReceipt } from "../../../../src/run";
import { FileStore } from "../../../../src/store";
import { verifyReceipt } from "../../../../src/verify";
import { checkFreeze, hash, readJson, requireMatch, writeNew } from "./guards";
import { PROTOCOL } from "./protocol";
import { collect, datasets, STAGE_PATTERN } from "./run";

export async function replayStudy(study: string) {
  requireMatch(existsSync(join(study, "results.json")), "complete and collect the study before replay");
  const freeze = checkFreeze(study, PROTOCOL, datasets());
  const result = await collect(study, freeze);
  const stores: { store: string; checkedReceipts: number; reconciled: boolean }[] = [];
  for (const block of PROTOCOL.blocks) {
    const parent = join(study, "stores", block.id);
    if (!existsSync(parent)) continue;
    const stages = readdirSync(parent).sort();
    requireMatch(stages.length <= 9, "too many stage stores");
    for (const stage of stages) {
      requireMatch(STAGE_PATTERN.test(stage), "unexpected stage store");
      const attempt = join(study, block.id, "attempts", stage);
      requireMatch(existsSync(join(attempt, "result.json")), "store has an unreconciled attempt");
      const reconciled = existsSync(join(attempt, "reconciliation.json"));
      const dir = join(parent, stage);
      const store = new FileStore(dir);
      // A search interrupted before its first writer call retained no receipt.
      const names = existsSync(join(dir, "runs")) ? readdirSync(join(dir, "runs")).sort() : [];
      requireMatch((names.length > 0 || reconciled) && names.length <= 8192, "invalid store receipt count");
      for (const name of names) {
        requireMatch(/^[a-f0-9]{64}\.json$/.test(name), "unexpected receipt path");
        const digest = `sha256:${name.slice(0, -5)}` as Digest;
        const raw = await store.getReceipt(digest);
        requireMatch(raw !== undefined && hash(raw) === digest, `receipt hash mismatch ${digest}`);
        const receipt = parseRunReceipt(raw);
        const manifest = await store.getManifest(receipt.manifestDigest);
        requireMatch(manifest !== undefined, "missing replay manifest");
        const checked = await verifyReceipt(raw, manifest, store);
        requireMatch(checked.ok, `replay failed ${block.id}/${stage}/${digest}: ${checked.mismatches.join("; ")}`);
      }
      stores.push({ store: `${block.id}/${stage}`, checkedReceipts: names.length, reconciled });
    }
  }
  // v2: each store row says whether `reconcile` closed its stage.
  const record = { contract: "algal.study-replay.v2", freeze: freeze.digest, results: hash(result),
    ok: true, checkedReceipts: stores.reduce((n, store) => n + store.checkedReceipts, 0), stores,
    countScope: "Receipt files per store; copied seed receipts are counted in every store that contains them." };
  const path = join(study, "replay.json");
  if (existsSync(path)) requireMatch(hash(readJson(path)) === hash(record), "replay result differs from earlier verification");
  else writeNew(path, record);
  return record;
}

if (import.meta.main) {
  const [path, ...extra] = process.argv.slice(2);
  requireMatch(path !== undefined && extra.length === 0, "usage: bun arms/v9-pool/replay.ts <study-directory>");
  console.log(JSON.stringify(await replayStudy(resolve(path))));
}
