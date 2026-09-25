// The `algal.vendor.v1` record: which shared-catalog entry a project copied,
// where the catalog page came from, and the digests its files must keep. This
// module parses and checks records, and reads them with the files they list
// beneath a project root through the source loader's guarded reads. It never
// uses the network: `vendor.ts` alone reads a catalog page, and
// `source-lock.ts` pins records and checks them offline.
import { lstat } from "node:fs/promises";
import { join } from "node:path";
import { asDigest, digestCanonical, digestText, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { SOURCE_BOUNDS, SOURCE_PROJECT_BOUNDS } from "./source";
import { boundedJsonSnapshot, createSourceDependencyReport, freezeDeep, printableText, type SourceDependencyReport } from "./source-dependencies";
import { loadSourceFiles } from "./source-project";
import { compareUtf8 } from "./utf8";
import { asArray, asObject, asString, noUnknownKeys, reqField, type JsonObject, type JsonValue } from "./values";

export const VENDOR_CONTRACT = "algal.vendor.v1" as const;
/** The record's file name inside a vendored directory, where `lock` finds it. */
export const VENDOR_RECORD_FILE = "algal.vendor.json" as const;
export const VENDOR_BOUNDS = Object.freeze({
  /** The entry and every entry it depends on: a source project's file limit. */
  maxFiles: SOURCE_PROJECT_BOUNDS.maxFiles,
  /** UTF-8 bytes of one copied file: the per-file source limit, so 16 files fit a project's 1 MiB. */
  maxFileBytes: SOURCE_BOUNDS.maxSourceBytes,
  /** Vendored directories above one project's files. */
  maxDirectories: SOURCE_PROJECT_BOUNDS.maxFiles,
  /** Characters of a catalog path; the catalog page parser uses the same limit. */
  maxPathLength: 256,
  /** Characters of the origin URL. */
  maxOriginLength: 512,
  /** Own-data limits for a record value and bytes of its file; a 16-file record is under 10 KiB. */
  record: Object.freeze({ maxBytes: 16_384, maxDepth: 4, maxNodes: 128, maxEntries: 16, maxStringBytes: 1_024 }),
});

export type VendorFile = {
  /** Catalog path, relative to the vendored directory. */
  readonly path: string;
  /** SHA-256 of the file's text, as the source loader reads it: the source digest `lock` records. */
  readonly sourceDigest: Digest;
  /** Executable digest the catalog lists for this program. */
  readonly manifestDigest: Digest;
  /** Interface digest the catalog lists for this program. */
  readonly interfaceDigest: Digest;
};
export type VendorRecord = {
  readonly contract: typeof VENDOR_CONTRACT;
  /** Where the catalog page was read: an https URL, or a file URL for a local page. */
  readonly origin: string;
  /** SHA-256 of the catalog page's bytes. */
  readonly catalog: Digest;
  /** Catalog path of the vendored entry; one of `files`. */
  readonly entry: string;
  /** The entry and every entry it depends on, sorted by path. */
  readonly files: readonly VendorFile[];
};
/** One way vendored files differ from their record. `subject` is a file's
 * path, or that path with `:executable`, `:interface`, or `:compile`. */
export type VendorDifference = { readonly subject: string; readonly expected: string; readonly actual: string };
/** A project's vendored sources as closed data, the shape `lock` consumes. */
export type VendoredSources = {
  /** Vendored directory, relative to the project root → the parsed JSON of its record file. */
  readonly records: Readonly<Record<string, unknown>>;
  /** Project-relative key → text of each listed file that exists. */
  readonly files: Readonly<Record<string, string>>;
};

const ABSENT = "(absent)";
/** Plain path segments, as the catalog page allows them: no empty, `.`, `..`, or hidden segment. */
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** A catalog path: a project directory, then plain segments, ending in `.algal`. */
export function vendorPath(value: unknown, what: string): string {
  const path = asString(value, what, VENDOR_BOUNDS.maxPathLength);
  const parts = path.split("/");
  if (!path.endsWith(".algal") || parts.length < 2 || parts.some(part => !SEGMENT.test(part))) {
    throw new AlgalError("PARSE_FAILED", `${what} must be a relative path of plain segments ending in .algal, such as task-planning/score_task.algal`);
  }
  return path;
}

/** An origin is a normalized https URL or file URL, with no credentials,
 * query, or fragment. Plain http is accepted only for a loopback host, which
 * only tests vendor from. Lock and verify never contact an origin. */
export function vendorOrigin(value: unknown, what: string): string {
  const text = asString(value, what, VENDOR_BOUNDS.maxOriginLength);
  let url: URL | undefined;
  try { url = new URL(text); } catch { url = undefined; }
  const allowed = url !== undefined && (url.protocol === "https:" || url.protocol === "file:" || (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname)));
  if (url === undefined || !allowed || url.username !== "" || url.password !== "" || text.includes("?") || text.includes("#") || url.href !== text) {
    throw new AlgalError("PARSE_FAILED", `${what} must be a normalized https or file URL without credentials, query, or fragment`);
  }
  return text;
}

/** Parse foreign record data strictly: known keys only, at most 16 files
 * sorted by unique path, plain catalog paths that cannot collide when written
 * (letter case, a file where a directory goes, or the record's own name), an
 * entry among the files, and digest shapes. The result is fresh, frozen data.
 */
export function parseVendorRecord(value: unknown, label = "vendor record"): VendorRecord {
  const object = asObject(boundedJsonSnapshot(value, VENDOR_BOUNDS.record, label), label);
  noUnknownKeys(object, ["contract", "origin", "catalog", "entry", "files"], label);
  if (object.contract !== VENDOR_CONTRACT) throw new AlgalError("PARSE_FAILED", `${label}: expected contract "${VENDOR_CONTRACT}"`);
  const origin = vendorOrigin(reqField(object, "origin", label), `${label} origin`);
  const catalog = asDigest(reqField(object, "catalog", label), `${label} catalog`);
  const entry = vendorPath(reqField(object, "entry", label), `${label} entry`);
  const raw = asArray(reqField(object, "files", label), `${label} files`);
  if (raw.length === 0) throw new AlgalError("PARSE_FAILED", `${label} files must include the entry`);
  if (raw.length > VENDOR_BOUNDS.maxFiles) throw new AlgalError("BUDGET_EXHAUSTED", `${label} files exceed ${VENDOR_BOUNDS.maxFiles} entries`);
  const files = raw.map((item, index): VendorFile => {
    const what = `${label} file ${index}`;
    const file = asObject(item, what);
    noUnknownKeys(file, ["path", "sourceDigest", "manifestDigest", "interfaceDigest"], what);
    return {
      path: vendorPath(reqField(file, "path", what), `${what} path`),
      sourceDigest: asDigest(reqField(file, "sourceDigest", what), `${what} sourceDigest`),
      manifestDigest: asDigest(reqField(file, "manifestDigest", what), `${what} manifestDigest`),
      interfaceDigest: asDigest(reqField(file, "interfaceDigest", what), `${what} interfaceDigest`),
    };
  });
  for (let index = 1; index < files.length; index++) {
    if (compareUtf8(files[index - 1]!.path, files[index]!.path) >= 0) throw new AlgalError("PARSE_FAILED", `${label} files must be sorted by unique path`);
  }
  if (!files.some(file => file.path === entry)) throw new AlgalError("PARSE_FAILED", `${label} entry must be one of its files`);
  const folded = new Set(files.map(file => file.path.toLowerCase()));
  if (folded.size !== files.length) throw new AlgalError("PARSE_FAILED", `${label} file paths must differ in more than letter case`);
  for (const file of files) {
    const lower = file.path.toLowerCase();
    if (lower.startsWith(`${VENDOR_RECORD_FILE}/`) || [...folded].some(other => other.startsWith(`${lower}/`))) {
      throw new AlgalError("PARSE_FAILED", `${label} file ${file.path} would be written where a directory or the record belongs`);
    }
  }
  return freezeDeep({ contract: VENDOR_CONTRACT, origin, catalog, entry, files });
}

export function vendorRecordToJson(record: VendorRecord): JsonObject {
  return {
    contract: record.contract, origin: record.origin, catalog: record.catalog, entry: record.entry,
    files: record.files.map(file => ({ path: file.path, sourceDigest: file.sourceDigest, manifestDigest: file.manifestDigest, interfaceDigest: file.interfaceDigest })),
  };
}

/** The first four differences on one line, for an error message. */
export function vendorDifferenceList(differences: readonly VendorDifference[]): string {
  const shown = differences.slice(0, 4).map(item => `${item.subject} (expected ${item.expected}, actual ${item.actual})`).join("; ");
  return differences.length > 4 ? `${shown}; and ${differences.length - 4} more` : shown;
}

/** One line of a compiler message, printable and at most 240 characters. */
const reason = (error: unknown): string => [...printableText((error instanceof Error ? error.message : String(error)).replaceAll("\n", " "))].slice(0, 240).join("");

/** Compare vendored files with their record: each file's text digest, then,
 * once every file is present, the executable and interface digests of each
 * file compiled from exactly the listed files. `texts` maps record paths to
 * text. Compilation is pure; nothing is read, fetched, or run. An empty list
 * means the files match the record.
 */
export async function checkVendoredFiles(record: VendorRecord, texts: ReadonlyMap<string, string>): Promise<VendorDifference[]> {
  const differences: VendorDifference[] = [];
  const modules: Record<string, string> = Object.create(null);
  for (const file of record.files) {
    const text = texts.get(file.path);
    const digest = text === undefined ? ABSENT : digestText(text);
    if (digest !== file.sourceDigest) differences.push({ subject: file.path, expected: file.sourceDigest, actual: digest });
    if (text !== undefined) modules[file.path] = text;
  }
  if (Object.keys(modules).length !== record.files.length) return differences;
  const compiled = new Map<string, { readonly executable: Digest; readonly interface: Digest }>();
  const compile = async (path: string): Promise<SourceDependencyReport | VendorDifference> => {
    try { return await createSourceDependencyReport(modules[path]!, { sourceOptions: { entry: path, modules } }); }
    catch (error) { return { subject: `${path}:compile`, expected: "compiles", actual: reason(error) }; }
  };
  const collect = (report: SourceDependencyReport): void => {
    const interfaces = new Map(report.modules.map(module => [module.manifestDigest, digestCanonical(module.interface as unknown as JsonValue)]));
    for (const unit of report.sourceUnits) {
      const found = interfaces.get(unit.manifestDigest);
      if (found !== undefined && !compiled.has(unit.source)) compiled.set(unit.source, { executable: unit.manifestDigest, interface: found });
    }
  };
  const entry = await compile(record.entry);
  if (!("contract" in entry)) return [...differences, entry];
  collect(entry);
  for (const file of record.files) {
    // A listed file outside the entry's call closure is compiled as its own root.
    if (!compiled.has(file.path)) {
      const own = await compile(file.path);
      if (!("contract" in own)) { differences.push(own); continue; }
      collect(own);
    }
    const found = compiled.get(file.path)!;
    if (found.executable !== file.manifestDigest) differences.push({ subject: `${file.path}:executable`, expected: file.manifestDigest, actual: found.executable });
    if (found.interface !== file.interfaceDigest) differences.push({ subject: `${file.path}:interface`, expected: file.interfaceDigest, actual: found.interface });
  }
  return differences;
}

/** Find the record of every vendored directory above a project's source files
 * and read it, with each file it lists, beneath the canonical root
 * (`SourceProject.root`) through the source loader's guarded reads: no symlink
 * traversal, regular files only, byte limits, strict UTF-8. Every directory
 * above a key is checked, the root excepted: at most 16 keys of 256 segments,
 * so a bounded number of probes. A listed file that does not exist is left
 * out, so verification reports it as absent. Nothing is fetched.
 */
export async function loadVendoredSources(root: string, keys: readonly string[]): Promise<VendoredSources> {
  const directories = new Set<string>();
  for (const key of keys) {
    const parts = key.split("/");
    for (let length = 1; length < parts.length; length++) directories.add(parts.slice(0, length).join("/"));
  }
  const found: string[] = [];
  for (const directory of [...directories].sort(compareUtf8)) {
    // Only a probe: a record that exists is read below with every guard.
    const present = await lstat(join(root, ...directory.split("/"), VENDOR_RECORD_FILE)).then(() => true, (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
      throw new AlgalError("IO_FAILED", `cannot check ${directory}/${VENDOR_RECORD_FILE}${error.code ? ` (${error.code})` : ""}`);
    });
    if (!present) continue;
    if (found.length === VENDOR_BOUNDS.maxDirectories) throw new AlgalError("BUDGET_EXHAUSTED", `a project may hold at most ${VENDOR_BOUNDS.maxDirectories} vendored directories`);
    found.push(directory);
  }
  const recordKeys = found.map(directory => `${directory}/${VENDOR_RECORD_FILE}`);
  const texts = await loadSourceFiles(root, recordKeys, VENDOR_BOUNDS.record.maxBytes, { noun: "vendor record" });
  const records: Record<string, unknown> = Object.create(null);
  const listed = new Set<string>();
  for (const [index, directory] of found.entries()) {
    const key = recordKeys[index]!;
    let value: unknown;
    try { value = JSON.parse(texts[key]!); } catch { throw new AlgalError("PARSE_FAILED", `${key} is not valid JSON`); }
    for (const file of parseVendorRecord(value, key).files) listed.add(`${directory}/${file.path}`);
    records[directory] = value;
  }
  const files = await loadSourceFiles(root, [...listed], VENDOR_BOUNDS.maxFileBytes, { noun: "vendored file", missing: "skip" });
  return { records, files };
}
