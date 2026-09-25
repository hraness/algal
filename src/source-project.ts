// Filesystem admission for the data-only source compiler. Imports never resolve
// through packages, executors, ambient source directories, or the network.
import { constants, type Stats } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { AlgalError } from "./errors";
import {
  compileSource, resolveSourceImport, sourceImports, SOURCE_BOUNDS, SOURCE_PROJECT_BOUNDS,
  SourceError, type SourceCompilation, type SourceErrorImport, type SourceSpan,
} from "./source";

export type SourceProjectOptions = { root?: string };
export type SourceProject = SourceCompilation & {
  source: string;
  root: string;
  entry: string;
  sources: Readonly<Record<string, string>>;
  files: string[];
  compilerOptions: { entry: string; modules: Readonly<Record<string, string>> };
};

const start: SourceSpan = { start: { offset: 0, line: 1, column: 1 }, end: { offset: 0, line: 1, column: 1 } };
type Location = { file: string; span: SourceSpan; sourceText?: string; imports: SourceErrorImport[] };
const fail = (message: string, location: Location): never => { throw new SourceError(message, location.span, {
  source: location.file, imports: location.imports,
  ...(location.sourceText === undefined ? {} : { sourceText: location.sourceText }),
}); };
const sameFile = (left: Stats, right: Stats): boolean => left.dev === right.dev && left.ino === right.ino;
function importedKey(location: Location, path: string): string {
  try { return resolveSourceImport(location.file, path, location.span); }
  catch (error) {
    if (error instanceof SourceError) return fail(error.diagnostic.message, { ...location, span: error.diagnostic.span });
    throw error;
  }
}

type ProjectFileFailure = "unreadable" | "symlink" | "not-regular" | "changed-before" | "too-large" | "changed" | "path-changed" | "not-utf8";
type ProjectFileRead = { ok: true; text: string; bytes: number } | { ok: false; failure: ProjectFileFailure; size?: number; code?: string };

/** Read one file beneath a canonical root. Every component, including the
 * final file, is checked: directories, then a regular file, never a symlink.
 * Identities are rechecked after reading so replaced directories or files are
 * rejected. Source imports and lock fixtures share this path.
 */
async function readProjectFile(root: string, key: string, limit: number): Promise<ProjectFileRead> {
  const paths = [root];
  for (const part of key.split("/")) paths.push(join(paths.at(-1)!, part));
  try {
    const checked: { path: string; stat: Stats }[] = [];
    for (const [index, path] of paths.entries()) {
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) return { ok: false, failure: "symlink" };
      if (index === paths.length - 1 ? !stat.isFile() : !stat.isDirectory()) return { ok: false, failure: "not-regular" };
      checked.push({ path, stat });
    }
    const file = checked.at(-1)!;
    // O_NONBLOCK keeps FIFOs from hanging even if the path changes after lstat;
    // O_NOFOLLOW also rejects a leaf symlink installed before open.
    const handle = await open(file.path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const before = await handle.stat();
      if (!before.isFile() || !sameFile(before, file.stat)) return { ok: false, failure: "changed-before" };
      if (before.size > limit) return { ok: false, failure: "too-large", size: before.size };
      // One extra byte detects a concurrent growth past the admitted length.
      const buffer = Buffer.alloc(Math.min(before.size + 1, limit + 1));
      let size = 0;
      while (size < buffer.length) {
        const { bytesRead } = await handle.read(buffer, size, buffer.length - size, size);
        if (bytesRead === 0) break;
        size += bytesRead;
      }
      const after = await handle.stat();
      if (size !== before.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) return { ok: false, failure: "changed" };
      for (const component of checked) {
        const current = await lstat(component.path);
        if (current.isSymbolicLink() || !sameFile(component.stat, current)) return { ok: false, failure: "path-changed" };
      }
      try { return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, size)), bytes: size }; }
      catch { return { ok: false, failure: "not-utf8" }; }
    } finally { await handle.close(); }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return { ok: false, failure: "unreadable", ...(code === undefined ? {} : { code }) };
  }
}

async function boundedSource(root: string, key: string, remainingBytes: number, location: Location, target: Location): Promise<{ source: string; bytes: number }> {
  const read = await readProjectFile(root, key, Math.min(SOURCE_BOUNDS.maxSourceBytes, remainingBytes));
  if (read.ok) return { source: read.text, bytes: read.bytes };
  switch (read.failure) {
    case "symlink": return fail(`symlink traversal is not allowed: ${key}`, location);
    case "not-regular": return fail(`source path must contain directories and end in a regular file: ${key}`, location);
    case "changed-before": return fail(`source file changed before reading: ${key}`, location);
    case "too-large": return fail((read.size ?? 0) > SOURCE_BOUNDS.maxSourceBytes ? `source exceeds ${SOURCE_BOUNDS.maxSourceBytes} UTF-8 bytes` : `source project exceeds ${SOURCE_PROJECT_BOUNDS.maxTotalBytes} bytes`, target);
    case "changed": return fail(`source file changed while reading: ${key}`, location);
    case "path-changed": return fail(`source path changed while reading: ${key}`, location);
    case "not-utf8": return fail("source is not valid UTF-8", target);
    case "unreadable": return fail(`cannot read source ${key}${read.code ? ` (${read.code})` : ""}`, location);
  }
}

/** Project data files, such as lock evaluation fixtures, use the source key
 * rules without the `.algal` suffix: relative, normalized, printable, and
 * well-formed UTF-16. */
function dataKey(key: unknown): key is string {
  return typeof key === "string" && key.length > 0 && key.length <= 512 && !key.includes("\\") && !key.includes(":")
    && ![...key].some(char => { const code = char.codePointAt(0)!; return code < 32 || code === 127 || (code >= 0xd800 && code <= 0xdfff); })
    && key.split("/").every(part => part !== "" && part !== "." && part !== "..");
}

/** Read named data files beneath a project's canonical root (`SourceProject.root`)
 * with the same guards as source imports: no symlink traversal, regular files
 * only, `maxBytes` per file, identities rechecked, and strict UTF-8. Returns a
 * closed key → text map; nothing outside the root is read.
 */
export async function loadSourceFixtures(root: string, keys: readonly string[], maxBytes: number): Promise<Record<string, string>> {
  const files: Record<string, string> = Object.create(null);
  for (const key of keys) {
    if (!dataKey(key)) throw new AlgalError("PARSE_FAILED", `fixture ${JSON.stringify(key)} must be a normalized project-relative path`);
    const read = await readProjectFile(root, key, maxBytes);
    if (read.ok) { files[key] = read.text; continue; }
    switch (read.failure) {
      case "too-large": throw new AlgalError("BUDGET_EXHAUSTED", `fixture ${key} exceeds ${maxBytes} bytes`);
      case "unreadable": throw new AlgalError("IO_FAILED", `cannot read fixture ${key}${read.code ? ` (${read.code})` : ""}`);
      case "symlink": throw new AlgalError("PARSE_FAILED", `symlink traversal is not allowed: ${key}`);
      case "not-regular": throw new AlgalError("PARSE_FAILED", `fixture path must contain directories and end in a regular file: ${key}`);
      case "not-utf8": throw new AlgalError("PARSE_FAILED", `fixture ${key} is not valid UTF-8`);
      default: throw new AlgalError("PARSE_FAILED", `fixture ${key} changed while reading`);
    }
  }
  return files;
}

/** Load only the entry and its transitive local imports under one explicit root.
 * The compiler receives a closed source map; it performs no filesystem IO.
 */
export async function loadSourceProject(entryPath: string, options: SourceProjectOptions = {}): Promise<SourceProject> {
  const location: Location = { file: entryPath, span: start, imports: [] };
  if (!entryPath || entryPath.includes("\\") || [...entryPath].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(entryPath)) fail("entry must be a local .algal file", location);
  const absoluteEntry = resolve(entryPath);
  const requestedRoot = resolve(options.root ?? dirname(absoluteEntry));
  let root: string;
  try { root = await realpath(requestedRoot); }
  catch (error) { return fail(`cannot resolve project root (${(error as NodeJS.ErrnoException).code ?? "IO_FAILED"})`, location); }
  const within = (base: string): string | undefined => {
    const value = relative(base, absoluteEntry);
    return value && value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value) ? value.split(sep).join("/") : undefined;
  };
  // Either spelling is accepted for the root itself; beneath it paths must be
  // real directories/files and may never traverse a symlink.
  const candidate = within(requestedRoot) ?? within(root);
  if (!candidate) fail("entry is outside the source project root", location);
  let entry: string;
  try { entry = resolveSourceImport("entry.algal", `./${candidate}`, start); }
  catch (error) {
    if (error instanceof SourceError) return fail(error.diagnostic.message, location);
    throw error;
  }
  const sources: Record<string, string> = Object.create(null);
  const heights = new Map<string, number>();
  const active = new Set<string>();
  let totalBytes = 0;
  const visit = async (key: string, depth: number, origin: Location, frames: SourceErrorImport[] = []): Promise<number> => {
    if (depth > SOURCE_PROJECT_BOUNDS.maxImportDepth) fail(`import depth exceeds ${SOURCE_PROJECT_BOUNDS.maxImportDepth}: ${key}`, origin);
    if (active.has(key)) fail(`import cycle includes ${key}`, origin);
    const cached = heights.get(key);
    if (cached !== undefined) {
      if (depth + cached > SOURCE_PROJECT_BOUNDS.maxImportDepth) fail(`import depth exceeds ${SOURCE_PROJECT_BOUNDS.maxImportDepth}: ${key}`, origin);
      return cached;
    }
    if (Object.keys(sources).length >= SOURCE_PROJECT_BOUNDS.maxFiles) fail(`source project exceeds ${SOURCE_PROJECT_BOUNDS.maxFiles} files`, origin);
    const loaded = await boundedSource(root, key, SOURCE_PROJECT_BOUNDS.maxTotalBytes - totalBytes, origin, { file: key, span: start, imports: frames });
    totalBytes += loaded.bytes;
    sources[key] = loaded.source;
    active.add(key);
    const current: Location = { file: key, span: start, sourceText: loaded.source, imports: frames };
    try {
      let imports: ReturnType<typeof sourceImports>;
      try { imports = sourceImports(loaded.source); }
      catch (error) {
        if (error instanceof SourceError) return fail(error.diagnostic.message, { ...current, span: error.diagnostic.span });
        throw error;
      }
      if (imports.length > SOURCE_PROJECT_BOUNDS.maxImports) fail(`source file exceeds ${SOURCE_PROJECT_BOUNDS.maxImports} imports`, { ...current, span: imports[SOURCE_PROJECT_BOUNDS.maxImports]!.span });
      let height = 0;
      for (const item of imports) {
        const importing = { ...current, span: item.span };
        const imported = importedKey(importing, item.path);
        height = Math.max(height, 1 + await visit(imported, depth + 1, importing, [...frames, { source: key, path: item.path, span: item.span }]));
      }
      heights.set(key, height);
      return height;
    } finally {
      active.delete(key);
    }
  };
  await visit(entry, 0, { file: entry, span: start, imports: [] });
  Object.freeze(sources);
  const source = sources[entry]!;
  const compilerOptions = { entry, modules: sources };
  const compilation = compileSource(source, compilerOptions);
  return { ...compilation, source, root, entry, sources, files: Object.keys(sources).sort().map(key => join(root, ...key.split("/"))), compilerOptions };
}
