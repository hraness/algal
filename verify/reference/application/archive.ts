import { lstat, mkdir, readdir, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { hashBytes, readFileBounded, stableJson } from "../../lib/files";
import { relativePath } from "../../lib/schema";
import { CaptureBudget, encodeRecord, jsonSize, LIMITS, utf8Size } from "./bounded";

export type Retained = { path: string; sha256: string; bytes: number };
function require_(condition: unknown, why: string): asserts condition { if (!condition) throw new Error(`Application history archive: ${why}`); }
export function archivePath(path: string): string[] {
  relativePath(path, "archive path");
  const parts = path.split("/");
  require_(parts.length <= LIMITS.archiveDepth, "path depth"); return parts;
}

/** Exact retained inventory, including directories. Runtime readdir prefetch remains a premise. */
export async function requireInventory(root: string, files: readonly string[]): Promise<void> {
  require_(isAbsolute(root), "absolute root");
  const info = await lstat(root);
  require_(info.isDirectory() && !info.isSymbolicLink(), "owned regular directory root");
  require_(files.length > 0 && files.length <= LIMITS.retainedFiles, "file count");
  const wantedFiles = new Set<string>(), wantedDirs = new Set<string>();
  for (const path of files) {
    const parts = archivePath(path);
    require_(!wantedFiles.has(path), "duplicate expected file"); wantedFiles.add(path);
    for (let i = 1; i < parts.length; i++) wantedDirs.add(parts.slice(0, i).join("/"));
  }
  require_(wantedFiles.size + wantedDirs.size <= LIMITS.physicalEntries, "physical inventory count");
  for (const path of wantedDirs) require_(!wantedFiles.has(path), "file/directory alias");
  let seen = 0;
  async function walk(path: string, depth: number): Promise<void> {
    require_(depth < LIMITS.archiveDepth, "directory depth");
    for (const entry of await readdir(join(root, path), { withFileTypes: true })) {
      require_(++seen <= LIMITS.physicalEntries, "physical entry bound");
      const child = path ? `${path}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        require_(wantedDirs.delete(child), "unexpected directory"); await walk(child, depth + 1);
      } else require_(entry.isFile() && wantedFiles.delete(child), "unexpected/nonregular file");
    }
  }
  await walk("", 0);
  require_(wantedDirs.size === 0 && wantedFiles.size === 0, "missing physical evidence");
}

export class ArchiveWriter {
  readonly retained: Retained[] = [];
  readonly budget = new CaptureBudget();
  private readonly paths = new Set<string>();
  private readonly directories = new Set<string>();
  private constructor(readonly root: string) {}
  static async open(root: string): Promise<ArchiveWriter> {
    require_(isAbsolute(root), "absolute writer root");
    const info = await lstat(root);
    require_(info.isDirectory() && !info.isSymbolicLink() && (await readdir(root)).length === 0, "empty owned writer root");
    return new ArchiveWriter(root);
  }
  async directory(path: string): Promise<void> {
    const parts = archivePath(path);
    require_(parts.length < LIMITS.archiveDepth && !this.paths.has(path) && !this.directories.has(path), "directory identity");
    require_(parts.length === 1 || this.directories.has(parts.slice(0, -1).join("/")), "known directory parent");
    require_(this.paths.size + this.directories.size < LIMITS.physicalEntries, "physical entry reservation");
    await mkdir(join(this.root, path)); this.directories.add(path);
  }
  private reserve(path: string, size: number): void {
    const parts = archivePath(path);
    require_(!this.paths.has(path) && !this.directories.has(path), "duplicate retained path");
    require_(parts.length === 1 || this.directories.has(parts.slice(0, -1).join("/")), "known file parent");
    require_(this.paths.size + this.directories.size < LIMITS.physicalEntries, "physical entry reservation");
    this.budget.reserveFile(size); this.paths.add(path);
  }
  async bytes(path: string, bytes: Uint8Array | string): Promise<Retained> {
    const size = typeof bytes === "string" ? utf8Size(bytes) : bytes.byteLength;
    this.reserve(path, size);
    await writeFile(join(this.root, path), bytes, { flag: "wx", mode: 0o600 });
    const row = { path, sha256: hashBytes(bytes), bytes: size }; this.retained.push(row); return row;
  }
  async json(path: string, value: unknown): Promise<Retained> {
    return this.bytes(path, encodeRecord(value, this.budget.remainingRecordLimit()));
  }
  /** Target output is already on disk: bound the read before creating a retained copy. */
  async adopt(path: string, max: number = LIMITS.packetBytes): Promise<{ row: Retained; bytes: Uint8Array }> {
    const capacity = Math.min(max, this.budget.remainingRecordLimit());
    const bytes = await readFileBounded(this.root, path, capacity);
    this.reserve(path, bytes.byteLength);
    const row = { path, sha256: hashBytes(bytes), bytes: bytes.byteLength }; this.retained.push(row); return { row, bytes };
  }
  async stable(): Promise<void> {
    await requireInventory(this.root, this.retained.map(row => row.path));
    for (const row of this.retained) {
      const bytes = await readFileBounded(this.root, row.path, Math.max(1, row.bytes));
      require_(bytes.byteLength === row.bytes && hashBytes(bytes) === row.sha256, "retained bytes changed");
    }
  }
}

export function parseCanonical(bytes: Uint8Array): unknown {
  require_(bytes.byteLength <= LIMITS.recordBytes, "metadata byte bound");
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  require_(!text.startsWith("\ufeff"), "BOM");
  const value: unknown = JSON.parse(text);
  jsonSize(value, LIMITS.recordBytes);
  require_(stableJson(value) + "\n" === text, "canonical unique-key metadata"); return value;
}
