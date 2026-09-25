// Compare a proposed revision of a shared catalog program with its current
// version before the catalog page changes. The revision replaces the entry's
// file only inside closed source maps: the entry, every other entry that calls
// it, and every calling entry point on the page compile with both versions,
// and each calling entry point's case list and the entry's unseen cases run
// through the source lock's in-memory replay with scripted responses. Nothing
// under the repository is written, and no model, tool, or network is called.
import { lstat, realpath } from "node:fs/promises";
import { join } from "node:path";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError, type ErrorCode } from "./errors";
import {
  libraryComparisonToJson, libraryComparisonVerdict, parseLibraryComparison, parseLibraryUnseenCases,
  LIBRARY_COMPARISON_BOUNDS, LIBRARY_COMPARISON_CONTRACT,
  type LibraryComparison, type LibraryComparisonCaller, type LibraryComparisonCase, type LibraryComparisonDependent,
  type LibraryComparisonSet, type LibraryUnseenCase, type LibraryUnseenCases,
} from "./library-comparison";
import { LIBRARY_INDEX_BOUNDS, LIBRARY_INDEX_PROJECTS, parseLibraryIndex, type LibraryIndex, type LibraryIndexEntry } from "./library-index";
import { RUNTIME_VERSION, type RunOutcome } from "./run";
import { compileSource, resolveSourceImport, sourceImports, SourceError, SOURCE_BOUNDS, SOURCE_PROJECT_BOUNDS } from "./source";
import { boundedJsonSnapshot, printableText } from "./source-dependencies";
import {
  createSourceLock, parseSourceLockCases, sourceLockFixtureKeys, sourceLockToJson, verifySourceLock,
  SOURCE_LOCK_BOUNDS, type SourceLock, type SourceLockCase, type SourceLockVerification,
} from "./source-lock";
import { loadSourceFixtures, loadSourceProject, type SourceProject } from "./source-project";
import { compareUtf8, utf8Length } from "./utf8";
import { canonicalize } from "./values";

/** The catalog page, relative to the repository directory. */
export const LIBRARY_INDEX_PAGE = "docs/library.md";
export type LibraryComparisonOptions = {
  /** Repository directory holding the catalog page and its projects directory. */
  readonly repository: string;
  /** Program name of the catalog entry, such as `clamp`. */
  readonly name: string;
  /** Proposed source text for the entry's file. */
  readonly revision: string;
  /** The unseen case file as parsed JSON; required exactly when the entry pins one. */
  readonly unseen?: unknown;
};

function fail(code: ErrorCode, message: string): never { throw new AlgalError(code, `library compare: ${message}`); }
async function canonicalRepository(path: string): Promise<string> {
  try { return await realpath(path); }
  catch (error) { return fail("IO_FAILED", `cannot resolve the repository directory (${(error as NodeJS.ErrnoException).code ?? "IO_FAILED"})`); }
}

/** Read and parse the catalog page under `repository` with the source
 * loader's file guards and the page's byte limit. */
export async function loadLibraryIndex(repository: string): Promise<LibraryIndex> {
  const root = await canonicalRepository(repository);
  const found = await lstat(join(root, ...LIBRARY_INDEX_PAGE.split("/"))).then(() => true, () => false);
  if (!found) fail("IO_FAILED", `the repository directory has no ${LIBRARY_INDEX_PAGE}`);
  return parseLibraryIndex((await loadSourceFixtures(root, [LIBRARY_INDEX_PAGE], LIBRARY_INDEX_BOUNDS.maxBytes))[LIBRARY_INDEX_PAGE]!);
}

/** The closed source map `project` loads with `text` in place of `key`: every
 * file its entry reaches, with a file the revision newly imports read from
 * disk beneath the same root under the source loader's guards. */
async function substitute(project: SourceProject, key: string, text: string): Promise<Record<string, string>> {
  const modules: Record<string, string> = Object.create(null);
  const pending = [project.entry];
  while (pending.length > 0) {
    const next = pending.pop()!;
    if (Object.hasOwn(modules, next)) continue;
    if (Object.keys(modules).length >= SOURCE_PROJECT_BOUNDS.maxFiles) fail("BUDGET_EXHAUSTED", `the revised project exceeds ${SOURCE_PROJECT_BOUNDS.maxFiles} files`);
    const source = next === key ? text : Object.hasOwn(project.sources, next) ? project.sources[next]! : await readSource(project.root, next);
    modules[next] = source;
    try {
      for (const item of sourceImports(source)) pending.push(resolveSourceImport(next, item.path, item.span));
    } catch (error) {
      if (error instanceof SourceError) throw new SourceError(error.diagnostic.message, error.diagnostic.span, { source: next, sourceText: source });
      throw error;
    }
  }
  return modules;
}
async function readSource(root: string, key: string): Promise<string> {
  try { return (await loadSourceFixtures(root, [key], SOURCE_BOUNDS.maxSourceBytes))[key]!; }
  catch (error) {
    if (error instanceof AlgalError) fail(error.code, `cannot load ${key}, which the revision imports (${error.message})`);
    throw error;
  }
}
/** A dependent entry's executable digest with the revision, or null when it does not compile. */
async function revisedDigest(project: SourceProject, key: string, text: string): Promise<Digest | null> {
  try {
    const modules = await substitute(project, key, text);
    return compileSource(modules[project.entry]!, { entry: project.entry, modules }).sourceMap.manifestDigest;
  } catch (error) {
    if (error instanceof AlgalError) return null;
    throw error;
  }
}
function reasonOf(error: AlgalError): string {
  const text = [...printableText(`${error.code}: ${error.message}`.replaceAll("\n", " "))];
  const limit = LIBRARY_COMPARISON_BOUNDS.maxReasonLength;
  return text.length <= limit ? text.join("") : `${text.slice(0, limit - 1).join("")}…`;
}

type CaseSet = { readonly set: LibraryComparisonSet; readonly cases: readonly SourceLockCase[]; readonly fixtures: Readonly<Record<string, string>> };
type CaseList = CaseSet & { readonly path: string; readonly digest: Digest };
/** The case list beside a calling entry point (`main.evaluation.json` for
 * `main.algal`) in the `lock --evaluation` format, with the files it names. */
async function caseList(project: SourceProject, prefix: string): Promise<CaseList | undefined> {
  const key = `${project.entry.slice(0, -".algal".length)}.evaluation.json`;
  const found = await lstat(join(project.root, ...key.split("/"))).then(() => true, (error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
    throw error;
  });
  if (!found) return undefined;
  const text = (await loadSourceFixtures(project.root, [key], SOURCE_LOCK_BOUNDS.lock.maxBytes))[key]!;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return fail("PARSE_FAILED", `case list ${prefix}${key} is not valid JSON`); }
  const cases = parseSourceLockCases(value);
  const fixtures = await loadSourceFixtures(project.root, sourceLockFixtureKeys(cases), SOURCE_LOCK_BOUNDS.evaluation.maxFixtureBytes);
  return { set: "pinned", cases, fixtures, path: `${prefix}${key}`, digest: digestCanonical(boundedJsonSnapshot(value, SOURCE_LOCK_BOUNDS.lock, "case list")) };
}
/** Unseen cases as lock cases over an in-memory fixture map. */
function unseenSet(cases: readonly LibraryUnseenCase[]): CaseSet {
  const fixtures: Record<string, string> = {};
  const listed = cases.map((item): SourceLockCase => {
    const args = `unseen/${item.name}.args.json`;
    fixtures[args] = JSON.stringify(item.args);
    const responses = item.responses === undefined ? undefined : `unseen/${item.name}.responses.json`;
    if (responses !== undefined) fixtures[responses] = JSON.stringify(item.responses);
    return { name: item.name, args, ...(responses === undefined ? {} : { responses }), ...(item.outcome === undefined ? {} : { outcome: item.outcome }) };
  });
  return { set: "unseen", cases: listed, fixtures };
}
/** Replay a case set against the listed program; a case that misses its expected outcome stops the comparison. */
async function baseline(project: SourceProject, item: CaseSet, entry: string): Promise<SourceLock> {
  try { return await createSourceLock(project.source, project.compilerOptions, { evaluation: item.cases, fixtures: item.fixtures }); }
  catch (error) {
    if (error instanceof AlgalError && error.code === "RECEIPT_MISMATCH") fail("RECEIPT_MISMATCH", `${entry}: the listed program misses a ${item.set} case's expected outcome (${error.message})`);
    throw error;
  }
}
function checkUnseenPin(entry: LibraryIndexEntry, holdout: LibraryUnseenCases | undefined, index: LibraryIndex): void {
  if (holdout === undefined) {
    if (entry.unseen !== null) fail("PARSE_FAILED", `${entry.name} pins unseen cases ${entry.unseen}; supply that file`);
    return;
  }
  if (entry.unseen === null) fail("DIGEST_MISMATCH", `${entry.name} pins no unseen cases; pin ${holdout.digest} on its "Unseen cases" line before comparing with this file`);
  if (holdout.digest !== entry.unseen) fail("DIGEST_MISMATCH", `the unseen case file has digest ${holdout.digest}, but the catalog pins ${entry.unseen} for ${entry.name}`);
  const entries = new Set(index.applications.map(application => application.entry));
  for (const item of holdout.cases) {
    if (!entries.has(item.entry)) fail("PARSE_FAILED", `unseen case ${item.name} runs through ${item.entry}, which is not a calling entry point on the page`);
  }
}

/** Compare a proposed revision of a catalog entry with its listed version.
 *
 * The entry's file must still compile to the digests on the page. The
 * revision compiles in the file's place; each other entry that calls the file
 * and each calling entry point that loads it compiles with both versions; and
 * each calling entry point's case list and the entry's unseen cases replay
 * against both. The page's unseen digest must match the supplied file. The
 * result is an `algal.library-comparison.v1` record whose verdict names an
 * interface change, missing unseen cases, programs that do not compile with
 * the revision, and every case that changed or could not run. Reads files
 * under `repository` only; writes nothing.
 */
export async function compareLibraryRevision(options: LibraryComparisonOptions): Promise<LibraryComparison> {
  // Foreign options are copied and checked once, before the first await.
  const repositoryPath: unknown = options.repository, name: unknown = options.name, revision: unknown = options.revision;
  const suppliedUnseen: unknown = options.unseen;
  if (typeof repositoryPath !== "string" || repositoryPath.length === 0) fail("PARSE_FAILED", "repository must be a directory path");
  if (typeof name !== "string" || name.length === 0 || name.length > 64) fail("PARSE_FAILED", "name must be a catalog program name");
  if (typeof revision !== "string") fail("PARSE_FAILED", "revision must be source text");
  if (revision.length > SOURCE_BOUNDS.maxSourceBytes || utf8Length(revision) > SOURCE_BOUNDS.maxSourceBytes) fail("BUDGET_EXHAUSTED", `revision exceeds ${SOURCE_BOUNDS.maxSourceBytes} UTF-8 bytes`);
  const holdout = suppliedUnseen === undefined ? undefined : parseLibraryUnseenCases(suppliedUnseen);
  const repository = await canonicalRepository(repositoryPath);
  const index = await loadLibraryIndex(repository);
  const entry = index.entries.find(item => item.name === name) ?? fail("PARSE_FAILED", `the catalog lists no program named ${JSON.stringify(name)}`);
  checkUnseenPin(entry, holdout, index);
  const projects = join(repository, ...LIBRARY_INDEX_PROJECTS.split("/"));
  const load = (path: string, root: string) => loadSourceProject(join(projects, ...path.split("/")), { root: join(repository, ...root.split("/")) });

  // The comparison always starts from the listed program.
  const current = await load(entry.path, LIBRARY_INDEX_PROJECTS);
  const currentLock = await createSourceLock(current.source, current.compilerOptions);
  const currentInterface = currentLock.interfaces[currentLock.root]!;
  if (currentLock.root !== entry.digest || currentInterface !== entry.interfaceDigest) {
    fail("DIGEST_MISMATCH", `${entry.path} compiles to ${currentLock.root} with interface ${currentInterface}, not the listed ${entry.digest} and ${entry.interfaceDigest}; the catalog check must pass first`);
  }
  const revisedLock = await createSourceLock(revision, { entry: entry.path, modules: await substitute(current, entry.path, revision) });
  if (revisedLock.root === currentLock.root) fail("PARSE_FAILED", `the revision compiles to the listed program ${entry.digest}, so nothing would change`);

  const dependents: LibraryComparisonDependent[] = [];
  for (const other of index.entries) {
    if (other.path === entry.path) continue;
    const project = await load(other.path, LIBRARY_INDEX_PROJECTS);
    if (!Object.hasOwn(project.sources, entry.path)) continue;
    if (project.sourceMap.manifestDigest !== other.digest) fail("DIGEST_MISMATCH", `${other.path} compiles to ${project.sourceMap.manifestDigest}, not the listed ${other.digest}; the catalog check must pass first`);
    dependents.push({ path: other.path, base: other.digest, candidate: await revisedDigest(project, entry.path, revision) });
  }

  const callers: LibraryComparisonCaller[] = [];
  const cases: LibraryComparisonCase[] = [];
  for (const application of index.applications) {
    const project = await load(application.entry, application.root);
    // Source keys are relative to the listed root; a project root drops its own directory.
    const prefix = application.root === LIBRARY_INDEX_PROJECTS ? "" : `${application.entry.split("/")[0]!}/`;
    const key = entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : undefined;
    const unseen = holdout?.cases.filter(item => item.entry === application.entry) ?? [];
    if (key === undefined || !Object.hasOwn(project.sources, key)) {
      if (unseen.length > 0) fail("PARSE_FAILED", `unseen case ${unseen[0]!.name} runs through ${application.entry}, which does not load ${entry.path}`);
      continue;
    }
    if (project.project.units[key]?.manifestDigest !== entry.digest) fail("DIGEST_MISMATCH", `${application.entry} does not compile ${entry.path} to the listed ${entry.digest}; the catalog check must pass first`);
    const listed = await caseList(project, prefix);
    const sets: CaseSet[] = [...(listed === undefined ? [] : [listed]), ...(unseen.length === 0 ? [] : [unseenSet(unseen)])];
    const baselines: SourceLock[] = [];
    for (const item of sets) baselines.push(await baseline(project, item, application.entry));
    // Any failure to build or run the revised closure leaves this caller's cases unrun.
    let candidate: Digest | null = null;
    let reason: string | undefined;
    let verifications: SourceLockVerification[] = [];
    try {
      const modules = await substitute(project, key, revision);
      const revised = { entry: project.entry, modules };
      candidate = (await createSourceLock(modules[project.entry]!, revised)).root;
      for (const [position, item] of sets.entries()) {
        verifications.push(await verifySourceLock(modules[project.entry]!, revised, sourceLockToJson(baselines[position]!), { fixtures: item.fixtures }));
      }
    } catch (error) {
      if (!(error instanceof AlgalError)) throw error;
      candidate = null;
      reason = reasonOf(error);
      verifications = [];
    }
    callers.push({
      entry: application.entry, root: application.root, cases: listed === undefined ? null : { path: listed.path, digest: listed.digest },
      base: project.sourceMap.manifestDigest, candidate, ...(reason === undefined ? {} : { reason }),
    });
    for (const [position, item] of sets.entries()) {
      const drift = verifications[position]?.drift ?? [];
      for (const pinned of baselines[position]!.evaluation!.cases) {
        // Evaluation drift names each case field whose replay moved; a field without drift kept its pinned value.
        const moved = (part: "outcome" | "outputs"): string | undefined => drift.find(found => found.kind === "evaluation" && found.subject === `${pinned.name}/${part}`)?.actual;
        cases.push({
          set: item.set, entry: application.entry, name: pinned.name,
          ...(item.set === "pinned" ? { args: pinned.args.digest, ...(pinned.responses === undefined ? {} : { responses: pinned.responses.digest }) } : {}),
          base: { outcome: pinned.outcome, outputs: pinned.outputs },
          candidate: candidate === null ? null : { outcome: (moved("outcome") ?? pinned.outcome) as RunOutcome, outputs: (moved("outputs") ?? pinned.outputs) as Digest },
        });
      }
    }
  }
  if (callers.length === 0) fail("PARSE_FAILED", `no calling entry point on the page loads ${entry.path}`);

  dependents.sort((left, right) => compareUtf8(left.path, right.path));
  callers.sort((left, right) => compareUtf8(left.entry, right.entry));
  cases.sort((left, right) => compareUtf8(left.set, right.set) || compareUtf8(left.entry, right.entry) || compareUtf8(left.name, right.name));
  const parts = {
    base: { digest: currentLock.root, interface: currentInterface },
    candidate: { digest: revisedLock.root, interface: revisedLock.interfaces[revisedLock.root]! },
    unseen: holdout?.digest ?? null, dependents, callers, cases,
  };
  // Parsing the assembled record applies the same rules as to a supplied one.
  return parseLibraryComparison(libraryComparisonToJson({
    contract: LIBRARY_COMPARISON_CONTRACT, name: entry.name, path: entry.path,
    compiler: { profile: currentLock.compiler.profile, version: currentLock.compiler.version }, runtime: RUNTIME_VERSION,
    ...parts, verdict: libraryComparisonVerdict(parts),
  }));
}

/** Check a supplied record by running the same comparison again: the record
 * must parse and equal the fresh result exactly. Run it on the repository
 * state the record starts from, with the same revision and unseen file. */
export async function verifyLibraryComparison(record: unknown, options: LibraryComparisonOptions): Promise<LibraryComparison> {
  const supplied = libraryComparisonToJson(parseLibraryComparison(record));
  const fresh = await compareLibraryRevision(options);
  const recomputed = libraryComparisonToJson(fresh);
  const differing = Object.keys(recomputed).filter(key => canonicalize(supplied[key]!) !== canonicalize(recomputed[key]!));
  if (differing.length > 0) fail("RECEIPT_MISMATCH", `the record differs from a fresh comparison in ${differing.join(", ")}`);
  return fresh;
}
