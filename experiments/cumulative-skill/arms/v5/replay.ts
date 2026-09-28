// Offline replay of the archived study. Recorded effects supply every model
// response; this command does not contact a provider.
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { digestCanonical, type Digest } from "../../../../src/digest";
import { parseRunReceipt } from "../../../../src/run";
import { FileStore } from "../../../../src/store";
import { verifyReceipt } from "../../../../src/verify";

const root = process.argv[2];
if (!root || process.argv.length !== 3) throw new Error("Usage: bun experiments/cumulative-skill/arms/v5/replay.ts <store>");
const store = new FileStore(resolve(root));
const files = (await readdir(join(root, "runs"))).sort();
// Four arm accounts, up to eight seed attempts, and the frozen evaluation
// share a corpus store; the single-arm budget is not a whole-store limit.
if (files.length === 0 || files.length > 8192) throw new Error("Expected 1..8192 archived receipts");
const failures: { receipt: string; mismatches: string[] }[] = [];
for (const name of files) {
  if (!/^[a-f0-9]{64}\.json$/.test(name)) throw new Error(`Unexpected receipt filename: ${name}`);
  const digest = `sha256:${name.slice(0, -5)}` as Digest;
  const value = await store.getReceipt(digest);
  if (!value || digestCanonical(value) !== digest) throw new Error(`Receipt content does not match ${digest}`);
  const receipt = parseRunReceipt(value);
  const manifest = await store.getManifest(receipt.manifestDigest);
  if (!manifest) throw new Error(`Missing manifest: ${receipt.manifestDigest}`);
  const verified = await verifyReceipt(value, manifest, store);
  if (!verified.ok) failures.push({ receipt: digest, mismatches: verified.mismatches });
}
console.log(JSON.stringify({ ok: failures.length === 0, checkedReceipts: files.length, failures }, null, 2));
if (failures.length > 0) process.exitCode = 1;
