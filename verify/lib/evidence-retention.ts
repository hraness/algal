/** Local evidence copies, not power-loss durability or a hostile same-user filesystem boundary.
 * Readers receive only a caller-selected physical root. Recorded argv is never executed here. */
import { constants } from "node:fs";
import { lstat, mkdir, open, opendir, realpath } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { hashBytes, readFileBounded, stableJson } from "./files";
import { requireThat } from "./schema";

export type EvidenceLimits = { maxBytes: number; maxFileBytes: number; maxEntries: number; maxDepth: number };
export type EvidenceFile = { path: string; bytes: number; sha256: string };
type Inventory = { directories: string[]; files: EvidenceFile[]; bytes: number };
type Selection = { suite: string; recordedArchive: string; authorityDigest: string; limits: EvidenceLimits };
type Manifest = Selection & Inventory & { contract: "algal.retained-evidence.v1"; classification: "admitted" | "diagnostic" };
export type EvidencePointer<T> = Selection & {
  contract: "algal.retained-evidence-pointer.v1";
  classification: "admitted" | "diagnostic";
  manifest: { path: string; sha256: string; bytes: number };
  rawRoot: string;
  files: number;
  rawBytes: number;
  admission: T | null;
};
type Base = Selection & { resultsRoot: string; sourceRoot: string };
export type RetainOptions<T> = Base & (
  { classification: "admitted"; readmit: (physicalRoot: string) => Promise<T> } |
  { classification: "diagnostic"; readmit?: never }
);
const MANIFEST_BYTES = 8_388_608, POINTER_BYTES = 16_384;
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const same = (a: unknown, b: unknown, message: string): void => requireThat(stableJson(a) === stableJson(b), message);
const digest = (value: string): void => requireThat(/^sha256:[0-9a-f]{64}$/.test(value), "invalid evidence digest");

function absolute(path: string): void {
  requireThat(isAbsolute(path) && path === resolve(path) && path.length <= 4096 && !path.includes("\0"), "absolute normalized evidence root required");
}
function relative(path: string): void {
  requireThat(path.length > 0 && Buffer.byteLength(path) <= 512 && !path.includes("\\") && !path.includes("\0") && path.split("/").every(p => p.length > 0 && p !== "." && p !== ".."), "invalid relative evidence path");
}
function selection(value: Selection): void {
  requireThat(/^[a-z][a-z0-9-]{0,79}$/.test(value.suite), "invalid evidence suite");
  absolute(value.recordedArchive); digest(value.authorityDigest);
  const l = value.limits;
  for (const n of Object.values(l)) requireThat(Number.isSafeInteger(n) && n > 0, "invalid evidence limit");
  requireThat(Object.keys(l).sort().join(",") === "maxBytes,maxDepth,maxEntries,maxFileBytes" && l.maxBytes <= 67_108_864 && l.maxFileBytes <= 8_388_608 && l.maxFileBytes <= l.maxBytes && l.maxEntries <= 8192 && l.maxDepth <= 16, "evidence limit ceiling");
}
async function directory(path: string): Promise<string> {
  absolute(path);
  requireThat((await lstat(path)).isDirectory(), "evidence root must be a regular directory");
  return realpath(path);
}
async function ensureDirectory(path: string): Promise<void> {
  try { await mkdir(path, { mode: 0o700 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  requireThat((await lstat(path)).isDirectory(), "evidence destination directory is nonregular");
}
async function inventory(root: string, limits: EvidenceLimits): Promise<Inventory> {
  const files: EvidenceFile[] = [], directories: string[] = []; let entries = 0, bytes = 0;
  async function walk(prefix: string, depth: number): Promise<void> {
    requireThat(depth <= limits.maxDepth, "evidence depth bound");
    for await (const entry of await opendir(join(root, prefix))) {
      requireThat(++entries <= limits.maxEntries, "evidence entry bound");
      const path = prefix ? `${prefix}/${entry.name}` : entry.name; relative(path);
      const stat = await lstat(join(root, path));
      if (stat.isDirectory()) { directories.push(path); await walk(path, depth + 1); }
      else {
        requireThat(stat.isFile() && !stat.isSymbolicLink(), "evidence requires regular files and directories");
        requireThat(stat.size <= limits.maxFileBytes && bytes + stat.size <= limits.maxBytes, "evidence inventory byte bound");
        const raw = await readFileBounded(root, path, limits.maxFileBytes);
        bytes += raw.byteLength; requireThat(bytes <= limits.maxBytes, "evidence actual byte bound");
        files.push({ path, bytes: raw.byteLength, sha256: hashBytes(raw) });
      }
    }
  }
  await walk("", 0); directories.sort(compare); files.sort((a, b) => compare(a.path, b.path));
  return { directories, files, bytes };
}
async function writeExact(root: string, path: string, bytes: Uint8Array): Promise<void> {
  relative(path); let file;
  try { file = await open(join(root, path), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  if (file) { try { await file.writeFile(bytes); } finally { await file.close(); } }
  const reread = await readFileBounded(root, path, Math.max(1, bytes.byteLength));
  requireThat(Buffer.from(reread).equals(Buffer.from(bytes)), "existing or written evidence bytes differ");
}
async function outerInventory(root: string, completed: boolean): Promise<void> {
  const names: string[] = [];
  for await (const entry of await opendir(root)) {
    requireThat(names.length < 2, "extra evidence container entry"); names.push(entry.name);
    requireThat(entry.name === "raw" ? entry.isDirectory() : entry.name === "manifest.json" && entry.isFile(), "nonregular evidence container entry");
  }
  names.sort(compare);
  requireThat(stableJson(names) === stableJson(completed ? ["manifest.json", "raw"] : ["raw"]) || !completed && stableJson(names) === stableJson(["manifest.json", "raw"]), "evidence container inventory");
}

/** Authority is selected outside the archive and closed over by readmit. Nothing in the
 * persisted manifest is allowed to select source paths, programs, or proof authority.
 * On readmission failure, this throws without publishing a success pointer or new manifest.
 * A separate diagnostic call can retain failed producer output without a passing claim. */
export async function retainEvidence<T = never>(options: RetainOptions<T>): Promise<EvidencePointer<T>> {
  selection(options);
  requireThat(options.classification === "admitted" ? typeof options.readmit === "function" : options.classification === "diagnostic" && options.readmit === undefined, "evidence classification/readmission mismatch");
  const sourceRoot = await directory(options.sourceRoot), resultsRoot = await directory(options.resultsRoot);
  const below = (child: string, parent: string): boolean => child.startsWith(parent.endsWith("/") ? parent : parent + "/");
  requireThat(sourceRoot !== resultsRoot && !below(resultsRoot, sourceRoot) && !below(sourceRoot, resultsRoot), "source and retained evidence roots must be disjoint");
  const original = await inventory(sourceRoot, options.limits);
  const manifest: Manifest = { contract: "algal.retained-evidence.v1", suite: options.suite, classification: options.classification, recordedArchive: options.recordedArchive, authorityDigest: options.authorityDigest, limits: options.limits, ...original };
  const wire = Buffer.from(stableJson(manifest) + "\n"); requireThat(wire.byteLength <= MANIFEST_BYTES, "evidence manifest byte bound");
  const name = hashBytes(wire).slice(7), destination = join(resultsRoot, name), rawRoot = join(destination, "raw");
  await ensureDirectory(destination); await ensureDirectory(rawRoot); await outerInventory(destination, false);
  for (const path of original.directories) await ensureDirectory(join(rawRoot, path));
  let copied = 0;
  for (const row of original.files) {
    const raw = await readFileBounded(sourceRoot, row.path, options.limits.maxFileBytes);
    copied += raw.byteLength; requireThat(copied <= options.limits.maxBytes && raw.byteLength === row.bytes && hashBytes(raw) === row.sha256, "source evidence changed during copy");
    await writeExact(rawRoot, row.path, raw);
  }
  same(await inventory(sourceRoot, options.limits), original, "source evidence inventory changed during copy");
  same(await inventory(rawRoot, options.limits), original, "retained evidence differs before admission");
  const admission = options.classification === "admitted" ? await options.readmit(rawRoot) : null;
  // Reader output is summary metadata only. Raw data stays in separate files.
  requireThat(Buffer.byteLength(stableJson(admission)) <= POINTER_BYTES / 2, "evidence admission summary byte bound");
  same(await inventory(rawRoot, options.limits), original, "retained evidence changed during admission");
  same(await inventory(sourceRoot, options.limits), original, "source evidence changed during admission");
  await writeExact(destination, "manifest.json", wire); await outerInventory(destination, true);
  const pointer: EvidencePointer<T> = { contract: "algal.retained-evidence-pointer.v1", suite: options.suite, classification: options.classification, recordedArchive: options.recordedArchive, authorityDigest: options.authorityDigest, limits: options.limits, manifest: { path: `${name}/manifest.json`, sha256: hashBytes(wire), bytes: wire.byteLength }, rawRoot: `${name}/raw`, files: original.files.length, rawBytes: original.bytes, admission };
  requireThat(Buffer.byteLength(stableJson(pointer)) <= POINTER_BYTES, "evidence pointer byte bound");
  return pointer;
}

/** Offline readback takes an independently selected directory/digest/authority, never
 * follows paths from an untrusted pointer, and never executes recorded commands. */
export async function readRetainedEvidence<T>(options: Selection & { directory: string; manifestSha256: string; classification: "admitted" | "diagnostic"; readmit?: (physicalRoot: string) => Promise<T> }): Promise<T | null> {
  selection(options); digest(options.manifestSha256);
  requireThat(options.classification === "admitted" ? typeof options.readmit === "function" : options.classification === "diagnostic" && options.readmit === undefined, "evidence classification/readmission mismatch");
  const root = await directory(options.directory); await outerInventory(root, true);
  const wire = await readFileBounded(root, "manifest.json", MANIFEST_BYTES);
  requireThat(hashBytes(wire) === options.manifestSha256, "retained manifest digest differs");
  const rawRoot = await directory(join(root, "raw"));
  const found = await inventory(rawRoot, options.limits);
  const expected: Manifest = { contract: "algal.retained-evidence.v1", suite: options.suite, classification: options.classification, recordedArchive: options.recordedArchive, authorityDigest: options.authorityDigest, limits: options.limits, ...found };
  requireThat(Buffer.from(wire).equals(Buffer.from(stableJson(expected) + "\n")), "retained manifest/inventory/selection differs");
  const admission = options.classification === "admitted" ? await options.readmit!(rawRoot) : null;
  requireThat(Buffer.byteLength(stableJson(admission)) <= POINTER_BYTES / 2, "evidence admission summary byte bound");
  same(await inventory(rawRoot, options.limits), found, "retained evidence changed during readmission");
  requireThat(hashBytes(await readFileBounded(root, "manifest.json", MANIFEST_BYTES)) === options.manifestSha256, "retained manifest changed during readmission");
  await outerInventory(root, true); return admission;
}
