import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { relativePath, requireThat } from "./schema";

export const MAX_METADATA_BYTES = 8_388_608;
const MAX_SOURCE_BYTES = 67_108_864;
export type FileBinding = { path: string; sha256: string };

export function hashBytes(value: Uint8Array | string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

/** Canonical only for the small, already-admitted verification metadata domain. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  const encoded = JSON.stringify(value);
  requireThat(encoded !== undefined, "verification metadata is not JSON");
  return encoded;
}

export function hashJson(value: unknown): string { return hashBytes(stableJson(value)); }

/** This is a cooperating-checkout reader, not protection against a hostile same-user race. */
export async function readFileBounded(root: string, path: string, max = MAX_METADATA_BYTES): Promise<Uint8Array> {
  relativePath(path, "file path");
  requireThat(Number.isSafeInteger(max) && max > 0 && max <= MAX_SOURCE_BYTES, "invalid read limit");
  const absoluteRoot = await realpath(root);
  const parts = path.split("/");
  let current = absoluteRoot;
  for (const [i, part] of parts.entries()) {
    current = join(current, part);
    const info = await lstat(current);
    requireThat(!info.isSymbolicLink(), `${path}: symbolic links are not verification inputs`);
    requireThat(i === parts.length - 1 ? info.isFile() : info.isDirectory(), `${path}: expected regular file and directories`);
  }
  const file = await open(current, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    requireThat(info.isFile() && info.size <= max, `${path}: file size bound`);
    const chunks: Buffer[] = [];
    let size = 0;
    for (;;) {
      const buffer = Buffer.alloc(Math.min(65_536, max + 1 - size));
      const { bytesRead } = await file.read(buffer);
      if (bytesRead === 0) break;
      size += bytesRead;
      requireThat(size <= max, `${path}: file grew past byte bound`);
      chunks.push(buffer.subarray(0, bytesRead));
    }
    return Buffer.concat(chunks);
  } finally { await file.close(); }
}

export async function readJson(root: string, path: string): Promise<unknown> {
  const bytes = await readFileBounded(root, path);
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  requireThat(!text.startsWith("\ufeff"), `${path}: BOM is not admitted`);
  return JSON.parse(text) as unknown;
}

export async function hashFile(root: string, path: string): Promise<string> {
  return hashBytes(await readFileBounded(root, path, MAX_SOURCE_BYTES));
}

const ROOT_INPUTS = ["Cargo.toml", "Cargo.lock", "package.json", "bun.lock", "bun.lockb", "tsconfig.json", "index.ts", "cli.ts", "rust-toolchain", "rust-toolchain.toml", ".cargo/config", ".cargo/config.toml"];
const BUILD_INPUTS = new Set(["scripts/package-native.py", "scripts/install-native.sh", "scripts/unpack-native.py"]);
const GENERATED_DIRECTORIES = new Set(["__pycache__", ".venv", "node_modules", ".algal", "target"]);

/** Whole source inventory includes untracked additions, never filtering fixture/data extensions.
 * Explicit generated directories are excluded; .lake is tool output in production/example roots. */
export async function governedPaths(root: string): Promise<string[]> {
  const found = new Set<string>();
  let visited = 0;
  async function walk(path: string): Promise<void> {
    let entries;
    try { entries = await readdir(join(root, path), { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      requireThat(++visited <= 20_000, "governed file inventory exceeds 20000 entries");
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory() && (GENERATED_DIRECTORIES.has(entry.name) || entry.name === ".lake")) continue;
      if (entry.isDirectory()) { await walk(child); continue; }
      requireThat(entry.isFile(), `${child}: nonregular governed input`);
      found.add(child);
    }
  }
  for (const directory of ["src", "crates", "spec", "examples", ".github/workflows"]) await walk(directory);
  for (const path of ROOT_INPUTS) {
    try {
      requireThat((await lstat(join(root, path))).isFile(), `${path}: nonregular governed input`);
      found.add(path);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  let scripts: string[] = [];
  try { scripts = await readdir(join(root, "scripts")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  for (const name of scripts) {
    const path = `scripts/${name}`;
    if (/^build-.*\.sh$/.test(name) || BUILD_INPUTS.has(path)) {
      requireThat((await lstat(join(root, path))).isFile(), `${path}: nonregular build input`);
      found.add(path);
    }
  }
  return [...found].sort();
}

/** Proof/model/config changes invalidate evidence independently of production changes.
 * Exclude generated results/tools/cache directories and .lake/build. Keep .lake/packages
 * source inputs: downloaded proof libraries are part of proof identity, not just build cache. */
export async function verificationPaths(root: string): Promise<string[]> {
  const paths: string[] = [];
  let visited = 0;
  async function walk(path: string): Promise<void> {
    for (const entry of await readdir(join(root, path), { withFileTypes: true })) {
      requireThat(++visited <= 20_000, "verification input inventory exceeds 20000 entries");
      const child = `${path}/${entry.name}`;
      if (path === "verify" && ["results", "tools", ".cache"].includes(entry.name)) continue;
      if (entry.isDirectory() && (GENERATED_DIRECTORIES.has(entry.name) || entry.name === "build" && path.endsWith("/.lake"))) continue;
      if (entry.isDirectory()) { await walk(child); continue; }
      requireThat(entry.isFile(), `${child}: nonregular verification input`);
      paths.push(child);
    }
  }
  await walk("verify");
  paths.push("scripts/verify.ts");
  return paths.sort();
}

export async function inputBindings(root: string): Promise<FileBinding[]> {
  const paths = [...new Set([...await governedPaths(root), ...await verificationPaths(root)])].sort();
  const result: FileBinding[] = [];
  for (const path of paths) result.push({ path, sha256: await hashFile(root, path) });
  return result;
}

export async function repositoryRoot(script: string): Promise<string> {
  return realpath(resolve(dirname(script), ".."));
}
