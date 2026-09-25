// `algal vendor`: copy one shared-catalog entry, with every entry it depends
// on, from a catalog page in the `docs/library.md` format into a new directory
// of a project. Vendoring uses the network only here; `lock` and its
// verification read the copy offline. The page comes from a local path or an
// https URL, and program files come from the page's own relative links, so
// every request stays on the page's host.
// Responses are limited in bytes, count, and time; downloaded text is only
// compiled, never run; and the copy is written only after it compiles to the
// digests the page lists, into a directory that did not exist, without
// following a symlink or replacing a file.
import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, rm, rmdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { digestText } from "./digest";
import { AlgalError } from "./errors";
import { boundedBytes, boundedFileBytes } from "./io";
import { LIBRARY_INDEX_BOUNDS, LIBRARY_INDEX_PROJECTS, parseLibraryIndex, type LibraryIndex, type LibraryIndexEntry } from "./library-index";
import { loadSourceFiles } from "./source-project";
import { compareUtf8, utf8Bytes } from "./utf8";
import { canonicalize } from "./values";
import {
  checkVendoredFiles, parseVendorRecord, vendorDifferenceList, vendorPath, vendorRecordToJson, VENDOR_BOUNDS, VENDOR_CONTRACT, VENDOR_RECORD_FILE,
  type VendorRecord,
} from "./vendor-record";

export const VENDOR_FETCH_BOUNDS = Object.freeze({
  /** Default milliseconds for one request, response body included. */
  timeoutMs: 15_000,
  /** Largest per-request timeout a caller may choose. */
  maxTimeoutMs: 60_000,
  /** Redirects followed for one request, each to the same scheme, host, and port. */
  maxRedirects: 4,
  /** Characters of the directory to create. */
  maxDirectoryLength: 256,
});

export type VendorOptions = {
  /** Catalog page in the `docs/library.md` format: an https URL or a local file path. */
  readonly catalog: string;
  /** Catalog path of the entry to copy, such as `task-planning/score_task.algal`. */
  readonly entry: string;
  /** Directory to create beneath `root`, in plain segments; it must not exist yet. */
  readonly into: string;
  /** Existing directory that `into` is relative to, usually the project directory. */
  readonly root: string;
  /** Milliseconds allowed for each request, 1 to 60,000; 15,000 when omitted. */
  readonly timeoutMs?: number;
  /** For tests against a loopback server: also accept plain http to
   * 127.0.0.1, localhost, or [::1]. The CLI never sets it. */
  readonly allowLoopbackHttp?: boolean;
};

/** Plain path segments, as the catalog page allows them: no empty, `.`, `..`, or hidden segment. */
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(["127.0.0.1", "localhost", "[::1]"]);
const refuse = (message: string): never => { throw new AlgalError("PARSE_FAILED", `vendor: ${message}`); };
const failed = (message: string, error: unknown): AlgalError => {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return new AlgalError("IO_FAILED", `vendor: ${message}${typeof code === "string" ? ` (${code})` : ""}`);
};

function vendorDirectory(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > VENDOR_FETCH_BOUNDS.maxDirectoryLength || value.split("/").some(part => !SEGMENT.test(part))) {
    return refuse(`the directory to create must be a relative path of plain segments (letters, digits, ".", "_", "-") of at most ${VENDOR_FETCH_BOUNDS.maxDirectoryLength} characters, such as vendor/algal`);
  }
  return value;
}

/** https only, or loopback http when a test asks for it; no credentials, query, or fragment. */
function remoteUrl(text: string, what: string, allowLoopbackHttp: boolean): URL {
  let url: URL;
  try { url = new URL(text); } catch { return refuse(`${what} is not a valid URL`); }
  const permitted = url.protocol === "https:" || (allowLoopbackHttp && url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname));
  if (!permitted) refuse(`${what} must be an https URL`);
  if (url.username !== "" || url.password !== "" || text.includes("?") || text.includes("#")) refuse(`${what} must not carry credentials, a query, or a fragment`);
  if (url.href.length > VENDOR_BOUNDS.maxOriginLength) refuse(`${what} exceeds ${VENDOR_BOUNDS.maxOriginLength} characters`);
  return url;
}

type Location = { readonly kind: "url"; readonly url: URL } | { readonly kind: "path"; readonly path: string };
function catalogLocation(value: unknown, allowLoopbackHttp: boolean): Location {
  if (typeof value !== "string" || value.length === 0 || value.length > VENDOR_BOUNDS.maxOriginLength
    || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
    return refuse(`the catalog must be an https URL or a local path of at most ${VENDOR_BOUNDS.maxOriginLength} characters`);
  }
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) ? { kind: "url", url: remoteUrl(value, "the catalog", allowLoopbackHttp) } : { kind: "path", path: value };
}

/** A catalog page keeps any byte order mark, so its digest is the SHA-256 of
 * its bytes; a program is decoded as the source loader decodes it. */
function decode(bytes: Uint8Array, what: string, page: boolean): string {
  try { return new TextDecoder("utf-8", { fatal: true, ignoreBOM: page }).decode(bytes); }
  catch { throw new AlgalError("PARSE_FAILED", `vendor: ${what} is not valid UTF-8`); }
}

type FetchContext = { readonly timeoutMs: number; readonly allowLoopbackHttp: boolean };
/** GET one resource: same-origin redirects only, status 200, at most `limit`
 * bytes whether or not a length is declared, and one timeout covering the
 * response headers and body. No credentials or cookies are sent. */
async function fetchText(url: URL, limit: number, what: string, page: boolean, context: FetchContext): Promise<{ text: string; url: URL }> {
  let current = url;
  for (let redirects = 0; ; redirects++) {
    const signal = AbortSignal.timeout(context.timeoutMs);
    const late = (): AlgalError => new AlgalError("IO_FAILED", `vendor: ${what} did not arrive within ${context.timeoutMs} ms`);
    let response: Response;
    try { response = await fetch(current, { redirect: "manual", signal, credentials: "omit" }); }
    catch (error) { throw signal.aborted ? late() : failed(`cannot fetch ${what} from ${current.host}`, error); }
    if (response.status >= 300 && response.status < 400) {
      void response.body?.cancel().catch(() => {});
      const location = response.headers.get("location");
      let next: URL | undefined;
      try { next = location === null ? undefined : new URL(location, current); } catch { next = undefined; }
      if (next === undefined) throw new AlgalError("IO_FAILED", `vendor: ${what} redirects without a valid location`);
      if (next.origin !== current.origin) throw new AlgalError("IO_FAILED", `vendor: ${what} redirects to ${next.host}; only redirects within ${current.host} are followed`);
      if (redirects >= VENDOR_FETCH_BOUNDS.maxRedirects) throw new AlgalError("IO_FAILED", `vendor: ${what} redirects more than ${VENDOR_FETCH_BOUNDS.maxRedirects} times`);
      current = remoteUrl(next.href, what, context.allowLoopbackHttp);
      continue;
    }
    if (response.status !== 200) {
      void response.body?.cancel().catch(() => {});
      throw new AlgalError("IO_FAILED", `vendor: ${what} returned HTTP ${response.status}`);
    }
    const declared = response.headers.get("content-length");
    if (declared !== null && Number(declared) > limit) {
      void response.body?.cancel().catch(() => {});
      throw new AlgalError("BUDGET_EXHAUSTED", `vendor: ${what} exceeds ${limit} bytes`);
    }
    let bytes: Uint8Array;
    try { bytes = await boundedBytes(response.body, limit, `vendor: ${what}`, signal); }
    catch (error) {
      if (signal.aborted) throw late();
      if (error instanceof AlgalError) throw error;
      throw failed(`${what} could not be read`, error);
    }
    return { text: decode(bytes, what, page), url: current };
  }
}

type Catalog = {
  readonly text: string;
  /** Normalized address of the page, recorded as the copy's origin. */
  readonly origin: string;
  /** Read the named programs through the page's own links. */
  readonly programs: (paths: readonly string[]) => Promise<Record<string, string>>;
};

async function localCatalog(path: string): Promise<Catalog> {
  let real: string;
  try { real = await realpath(resolve(path)); } catch (error) { throw failed(`cannot read the catalog page ${path}`, error); }
  const info = await stat(real).catch((error: unknown) => { throw failed(`cannot read the catalog page ${path}`, error); });
  if (!info.isFile()) refuse(`the catalog page ${path} is not a regular file`);
  if (info.size > LIBRARY_INDEX_BOUNDS.maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", `vendor: catalog page exceeds ${LIBRARY_INDEX_BOUNDS.maxBytes} bytes`);
  let bytes: Uint8Array;
  try { bytes = await boundedFileBytes(real, LIBRARY_INDEX_BOUNDS.maxBytes, "vendor: catalog page"); }
  catch (error) { throw error instanceof AlgalError ? error : failed(`cannot read the catalog page ${path}`, error); }
  // Links on the page point at ../examples/source/projects/<path>; programs
  // are read beneath that directory with the source loader's guards.
  const directory = join(dirname(real), "..", ...LIBRARY_INDEX_PROJECTS.split("/"));
  return {
    text: decode(bytes, "catalog page", true), origin: pathToFileURL(real).href,
    async programs(paths) {
      let root: string;
      try { root = await realpath(directory); } catch (error) { throw failed(`cannot read the catalog's programs in ../${LIBRARY_INDEX_PROJECTS}`, error); }
      return loadSourceFiles(root, paths, VENDOR_BOUNDS.maxFileBytes, { noun: "catalog program" });
    },
  };
}

async function remoteCatalog(url: URL, context: FetchContext): Promise<Catalog> {
  const page = await fetchText(url, LIBRARY_INDEX_BOUNDS.maxBytes, "catalog page", true, context);
  return {
    text: page.text, origin: page.url.href,
    async programs(paths) {
      const texts: Record<string, string> = Object.create(null);
      for (const path of paths) {
        const target = new URL(`../${LIBRARY_INDEX_PROJECTS}/${path}`, page.url);
        if (target.origin !== page.url.origin) throw new AlgalError("INTERNAL", "vendor: a catalog link left the page's host");
        texts[path] = (await fetchText(target, VENDOR_BOUNDS.maxFileBytes, `catalog program ${path}`, false, context)).text;
      }
      return texts;
    },
  };
}

/** The entry and, transitively, every entry it depends on, sorted by path. */
function entryClosure(index: LibraryIndex, entry: string): LibraryIndexEntry[] {
  const byPath = new Map(index.entries.map(item => [item.path, item]));
  if (!byPath.has(entry)) refuse(`the catalog lists no entry ${entry}`);
  const found = new Map<string, LibraryIndexEntry>();
  const visit = (path: string, from: string): void => {
    if (found.has(path)) return;
    const item = byPath.get(path);
    if (item === undefined) return refuse(`${from} depends on ${path}, which the catalog does not list`);
    found.set(path, item);
    if (found.size > VENDOR_BOUNDS.maxFiles) throw new AlgalError("BUDGET_EXHAUSTED", `vendor: ${entry} and the entries it depends on exceed ${VENDOR_BOUNDS.maxFiles} files`);
    for (const dependency of item.dependencies) visit(dependency, path);
  };
  visit(entry, entry);
  return [...found.values()].sort((left, right) => compareUtf8(left.path, right.path));
}

/** Walk the directory to create beneath `base`. Existing parents must be real
 * directories, never symlinks, and the last segment must not exist. With
 * `created`, missing directories are made one at a time and recorded. */
async function walkTarget(base: string, into: string, created?: string[]): Promise<string> {
  const parts = into.split("/");
  let current = base;
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const shown = parts.slice(0, index + 1).join("/");
    const info = await lstat(current).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return undefined;
      throw failed(`cannot inspect ${shown}`, error);
    });
    if (info === undefined) {
      if (created === undefined) return current;
      await makeDirectory(current, shown, created);
      continue;
    }
    if (info.isSymbolicLink()) refuse(`${shown} is a symlink; vendoring never follows one`);
    if (index === parts.length - 1) refuse(`${shown} already exists; vendoring writes only a new directory`);
    if (!info.isDirectory()) refuse(`${shown} is not a directory`);
  }
  return current;
}
async function makeDirectory(path: string, shown: string, created: string[]): Promise<void> {
  try { await mkdir(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") refuse(`${shown} already exists; vendoring writes only a new directory`);
    throw failed(`cannot create ${shown}`, error);
  }
  created.push(path);
  const info = await lstat(path);
  if (info.isSymbolicLink() || !info.isDirectory()) refuse(`${shown} changed while it was created`);
}
async function writeNewFile(path: string, shown: string, text: string): Promise<void> {
  let handle: Awaited<ReturnType<typeof open>>;
  try { handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") refuse(`${shown} already exists; vendoring never replaces a file`);
    throw failed(`cannot write ${shown}`, error);
  }
  try { await handle.writeFile(utf8Bytes(text)); } finally { await handle.close(); }
}

/** Write the checked copy, then its record. On failure, remove only what this
 * call created: the new directory with its files, then any parents it made. */
async function writeCopy(base: string, into: string, record: VendorRecord, texts: Readonly<Record<string, string>>): Promise<void> {
  const created: string[] = [];
  try {
    const target = await walkTarget(base, into, created);
    const made = new Set<string>();
    for (const file of record.files) {
      const segments = file.path.split("/");
      let directory = target;
      for (const [index, segment] of segments.slice(0, -1).entries()) {
        directory = join(directory, segment);
        if (!made.has(directory)) await makeDirectory(directory, `${into}/${segments.slice(0, index + 1).join("/")}`, []);
        made.add(directory);
      }
      await writeNewFile(join(directory, segments.at(-1)!), `${into}/${file.path}`, texts[file.path]!);
    }
    await writeNewFile(join(target, VENDOR_RECORD_FILE), `${into}/${VENDOR_RECORD_FILE}`, `${canonicalize(vendorRecordToJson(record))}\n`);
  } catch (error) {
    const target = join(base, ...into.split("/"));
    for (const path of created.reverse()) {
      await (path === target ? rm(path, { recursive: true, force: true }) : rmdir(path)).catch(() => {});
    }
    throw error;
  }
}

/** Copy `entry` and every entry it depends on from a catalog page into the
 * new directory `into` beneath `root`, and write its `algal.vendor.v1` record.
 * The copy is refused unless every file compiles, from exactly the copied
 * files, to the executable and interface digests the page lists. Existing
 * files and symlinks are refused before any request is made.
 */
export async function vendorCatalogEntry(options: VendorOptions): Promise<VendorRecord> {
  const entry = vendorPath(options.entry, "vendor entry");
  const into = vendorDirectory(options.into);
  const allowLoopbackHttp = options.allowLoopbackHttp === true;
  const timeoutMs = options.timeoutMs ?? VENDOR_FETCH_BOUNDS.timeoutMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > VENDOR_FETCH_BOUNDS.maxTimeoutMs) refuse(`timeout must be 1 to ${VENDOR_FETCH_BOUNDS.maxTimeoutMs} milliseconds`);
  const location = catalogLocation(options.catalog, allowLoopbackHttp);
  let base: string;
  try { base = await realpath(options.root); } catch (error) { throw failed("cannot resolve the project directory", error); }
  await walkTarget(base, into);
  const catalog = location.kind === "url" ? await remoteCatalog(location.url, { timeoutMs, allowLoopbackHttp }) : await localCatalog(location.path);
  const entries = entryClosure(parseLibraryIndex(catalog.text), entry);
  const texts = await catalog.programs(entries.map(item => item.path));
  const record = parseVendorRecord({
    contract: VENDOR_CONTRACT, origin: catalog.origin, catalog: digestText(catalog.text), entry,
    files: entries.map(item => ({ path: item.path, sourceDigest: digestText(texts[item.path]!), manifestDigest: item.digest, interfaceDigest: item.interfaceDigest })),
  });
  const differences = await checkVendoredFiles(record, new Map(Object.entries(texts)));
  if (differences.length > 0) throw new AlgalError("DIGEST_MISMATCH", `vendor: the copied files do not compile to the digests the catalog lists: ${vendorDifferenceList(differences)}`);
  await writeCopy(base, into, record, texts);
  return record;
}
