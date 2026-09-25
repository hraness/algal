// Local source lock: pin a closed source project to the exact executable
// closure it compiles to, and verify that pin offline. A lock is data outside
// executable identity; it never supplies source or manifests, and verification
// recompiles from the closed source map with no network or package resolver.
// Three optional sections extend the pin: evaluation cases (fixture digests
// plus the outcome and interface outputs of an in-memory scripted replay),
// human labels for closure digests, and vendored directories (the
// `algal.vendor.v1` record of each copied catalog entry). Fixtures, records,
// and vendored files arrive as closed maps, so this module performs no
// filesystem IO and never contacts a catalog's origin.
import { BOUNDS } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { scriptedExecutor } from "./effects";
import { AlgalError } from "./errors";
import { builtinRegistry } from "./registry";
import { runOrganism, RUNTIME_VERSION, type RunOutcome } from "./run";
import { compileSource, SOURCE_BOUNDS, SOURCE_PROJECT_BOUNDS, type SourceCompilation, type SourceCompilerOptions } from "./source";
import { boundedJsonSnapshot, createSourceDependencyReport, freezeDeep, printableText, type SourceDependencyReport } from "./source-dependencies";
import { MemoryStore } from "./store-memory";
import { compareUtf8, utf8Length } from "./utf8";
import { asArray, asInt, asObject, asString, noUnknownKeys, optField, reqField, type JsonObject, type JsonValue } from "./values";
import {
  checkVendoredFiles, parseVendorRecord, vendorDifferenceList, vendorOrigin, vendorPath, vendorRecordToJson, VENDOR_BOUNDS, VENDOR_RECORD_FILE,
  type VendoredSources, type VendorRecord,
} from "./vendor-record";

export const SOURCE_LOCK_CONTRACT = "algal.source-lock.v1" as const;
export const SOURCE_LOCK_VERIFICATION_CONTRACT = "algal.source-lock-verification.v1" as const;
export const SOURCE_LOCK_BOUNDS = Object.freeze({
  maxUnits: SOURCE_PROJECT_BOUNDS.maxFiles,
  /** Twice today's largest closure: one module per imported file plus one
   * generated trigger wrapper per called child (15 + 15 for 16 files). */
  maxModules: 4 * (SOURCE_PROJECT_BOUNDS.maxFiles - 1),
  /** Above every possible drift list, so verification never truncates: at
   * most 332 entries for the closure, labels, and cases, plus 832 for 16
   * vendored directories (four record fields and three per listed file). */
  maxDrift: 1_280,
  maxKeyLength: 512,
  maxTokenLength: 64,
  /** Human labels for closure digests. */
  maxVersions: 16,
  /** Vendored directories, each above at least one of the project's files. */
  maxVendored: VENDOR_BOUNDS.maxDirectories,
  evaluation: Object.freeze({
    maxCases: 16,
    /** UTF-8 bytes of one fixture's JSON text; the per-file source limit. */
    maxFixtureBytes: SOURCE_BOUNDS.maxSourceBytes,
    /** Own-data limits for a parsed fixture; containers nest at most 64 deep, as run arguments do. */
    fixture: Object.freeze({ maxBytes: BOUNDS.maxArgsBytes, maxDepth: 64, maxNodes: 65_536, maxEntries: 65_536, maxStringBytes: SOURCE_BOUNDS.maxSourceBytes }),
  }),
  /** Own-data snapshot limits for a supplied lock value; the largest legal lock measured is under 100 KiB. */
  lock: Object.freeze({ maxBytes: 131_072, maxDepth: 8, maxNodes: 16_384, maxEntries: 2_048, maxStringBytes: 2_048 }),
});
export type SourceLockUnit = { readonly source: string; readonly sourceDigest: Digest; readonly manifestDigest: Digest };
/** A project-relative `.json` fixture and the digest of its canonical JSON. */
export type SourceLockFixture = { readonly path: string; readonly digest: Digest };
export type SourceLockEvaluationCase = {
  readonly name: string;
  /** Run arguments in the `algal run --args` shape: input cell → port → value. */
  readonly args: SourceLockFixture;
  /** Scripted responses in the `algal run --responses` shape; without it, every effect is unbound. */
  readonly responses?: SourceLockFixture;
  readonly outcome: RunOutcome;
  /** Digest of the canonical JSON of the root's interface outputs (output name → recorded value). */
  readonly outputs: Digest;
};
export type SourceLockEvaluation = {
  /** Runtime semantics version (`RUNTIME_VERSION`) that produced the pinned results. */
  readonly runtime: string;
  /** Sorted by unique name. */
  readonly cases: readonly SourceLockEvaluationCase[];
};
/** One vendored directory: where its copy came from and a digest of its record. */
export type SourceLockVendored = {
  /** Project-relative directory holding `algal.vendor.json`, above at least one unit. */
  readonly directory: string;
  /** The catalog page's address, as the record names it. Lock and verify never contact it. */
  readonly origin: string;
  /** SHA-256 of the catalog page the copy was checked against. */
  readonly catalog: Digest;
  /** Catalog path of the vendored entry. */
  readonly entry: string;
  /** Digest of the record's canonical JSON, which pins each listed file's digests. */
  readonly record: Digest;
};
export type SourceLock = {
  readonly contract: typeof SOURCE_LOCK_CONTRACT;
  readonly entry: string;
  readonly compiler: { readonly version: string; readonly profile: string };
  /** Imported source files, sorted by key, each with its text and executable digest. */
  readonly units: readonly SourceLockUnit[];
  readonly root: Digest;
  /** Reachable executable closure excluding the root, sorted. */
  readonly modules: readonly Digest[];
  readonly analysis: { readonly maxAgentCalls: number; readonly requiredDepth: number };
  /** Executable digest (root included) → digest of its resolved public interface. */
  readonly interfaces: Readonly<Record<Digest, Digest>>;
  readonly evaluation?: SourceLockEvaluation;
  /** Human label → executable digest in this closure. Labels are for people;
   * digests are what execute, and verification never moves a label. */
  readonly versions?: Readonly<Record<string, Digest>>;
  /** Vendored directories above the project's files, sorted by directory. */
  readonly vendored?: readonly SourceLockVendored[];
};
/** One requested case, as `lock --evaluation` reads it. Paths are project-relative keys into `fixtures`. */
export type SourceLockCase = {
  readonly name: string;
  readonly args: string;
  readonly responses?: string;
  /** Outcome the replay must reach before the case is pinned; `complete` when omitted. */
  readonly outcome?: RunOutcome;
};
export type SourceLockOptions = {
  readonly evaluation?: readonly SourceLockCase[];
  /** Closed fixture map, project-relative path → JSON text; exactly the paths the cases name. */
  readonly fixtures?: Readonly<Record<string, string>>;
  /** Label → executable digest; every digest must be in the compiled closure. */
  readonly versions?: Readonly<Record<string, string>>;
  /** Records and listed files of the vendored directories above the project's
   * files (`loadVendoredSources`). Each copy must still match its record. */
  readonly vendored?: VendoredSources;
};
export type SourceLockVerifyOptions = {
  /** Replay every pinned case offline against this closed map of the lock's fixture paths → JSON text. */
  readonly fixtures?: Readonly<Record<string, string>>;
  /** Check vendored copies against these records and files; without them, no copy is checked. */
  readonly vendored?: VendoredSources;
};
export type SourceLockDriftKind = "entry" | "compiler" | "source" | "unit" | "root" | "closure" | "interface" | "analysis" | "version" | "evaluation" | "vendor";
export type SourceLockDrift = { readonly kind: SourceLockDriftKind; readonly subject: string; readonly expected: string; readonly actual: string };
export type SourceLockVerification = {
  readonly contract: typeof SOURCE_LOCK_VERIFICATION_CONTRACT;
  readonly ok: boolean;
  /** Digest of the parsed lock's canonical JSON, not of the supplied file bytes. */
  readonly lockDigest: Digest;
  readonly root: Digest;
  /** Fixed order: entry, compiler, source digests, unit digests, root, closure,
   * interfaces, analysis, version labels, evaluation, vendored copies. */
  readonly drift: readonly SourceLockDrift[];
  /** Always false today: the bound exceeds the largest possible list. */
  readonly truncated: boolean;
  /** Present when the lock pins evaluation cases; `replayed` is false unless fixtures were supplied. */
  readonly evaluation?: { readonly cases: number; readonly replayed: boolean };
  /** Present when the lock pins vendored directories; `checked` is false unless their sources were supplied. */
  readonly vendored?: { readonly directories: number; readonly checked: boolean };
};

const verifications = new WeakSet<SourceLockVerification>();
const ABSENT = "(absent)";
const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DRIFT_ORDER: readonly SourceLockDriftKind[] = ["entry", "compiler", "source", "unit", "root", "closure", "interface", "analysis", "version", "evaluation", "vendor"];
const OUTCOMES: readonly RunOutcome[] = ["complete", "failed", "stuck", "suspended"];

/** Lone surrogates are not text; they would also cost six JSON bytes each. */
function wellFormed(text: string): boolean {
  for (let index = 0; index < text.length; index++) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xdc00 && unit <= 0xdfff) return false;
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index++;
    }
  }
  return true;
}
/** The compiler's normalized project-relative key rules, applied to lock data.
 * An empty suffix names a directory. */
function projectPath(value: unknown, what: string, suffix: ".algal" | ".json" | ""): string {
  const key = asString(value, what, SOURCE_LOCK_BOUNDS.maxKeyLength);
  const invalid = !key.endsWith(suffix) || key.includes("\\") || key.includes(":") || !wellFormed(key)
    || [...key].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    || key.split("/").some(part => !part || part === "." || part === "..");
  if (invalid) throw new AlgalError("PARSE_FAILED", `${what} must be a normalized project-relative ${suffix === "" ? "directory" : `${suffix} path`}`);
  return key;
}
const sourceKey = (value: unknown, what: string): string => projectPath(value, what, ".algal");
const fixtureKey = (value: unknown, what: string): string => projectPath(value, what, ".json");
const directoryKey = (value: unknown, what: string): string => projectPath(value, what, "");
function token(value: unknown, what: string): string {
  const text = asString(value, what, SOURCE_LOCK_BOUNDS.maxTokenLength);
  if (!TOKEN.test(text)) throw new AlgalError("PARSE_FAILED", `${what} must be a plain token of letters, digits, ".", "_", or "-"`);
  return text;
}
function outcome(value: unknown, what: string): RunOutcome {
  if (typeof value !== "string" || !(OUTCOMES as readonly string[]).includes(value)) throw new AlgalError("PARSE_FAILED", `${what} must be one of ${OUTCOMES.join(", ")}`);
  return value as RunOutcome;
}
function caseCount(length: number, what: string): void {
  if (length === 0) throw new AlgalError("PARSE_FAILED", `${what} must name at least one case`);
  if (length > SOURCE_LOCK_BOUNDS.evaluation.maxCases) throw new AlgalError("BUDGET_EXHAUSTED", `${what} exceed ${SOURCE_LOCK_BOUNDS.evaluation.maxCases} cases`);
}
/** Labels map token names to digests; `closure`, when given, must contain every digest. */
function versionLabels(value: unknown, what: string, closure?: ReadonlySet<string>): Record<string, Digest> {
  const object = asObject(value, what);
  const labels = Object.keys(object).sort(compareUtf8);
  if (labels.length === 0) throw new AlgalError("PARSE_FAILED", `${what} must name at least one label`);
  if (labels.length > SOURCE_LOCK_BOUNDS.maxVersions) throw new AlgalError("BUDGET_EXHAUSTED", `${what} exceed ${SOURCE_LOCK_BOUNDS.maxVersions} labels`);
  const out: Record<string, Digest> = {};
  for (const label of labels) {
    token(label, "version label");
    const digest = asDigest(object[label], `version ${label}`);
    if (closure !== undefined && !closure.has(digest)) throw new AlgalError("PARSE_FAILED", `version ${label} names ${digest}, which is outside the closure`);
    out[label] = digest;
  }
  return out;
}

/** Parse a requested case list (the `lock --evaluation` file) from foreign
 * data: one to 16 cases, unique token names, and `.json` fixture paths. */
export function parseSourceLockCases(value: unknown): SourceLockCase[] {
  const list = asArray(boundedJsonSnapshot(value, SOURCE_LOCK_BOUNDS.lock, "source lock cases"), "source lock cases");
  caseCount(list.length, "source lock cases");
  const names = new Set<string>();
  return freezeDeep(list.map((raw, index) => {
    const item = asObject(raw, `source lock case ${index}`);
    noUnknownKeys(item, ["name", "args", "responses", "outcome"], `source lock case ${index}`);
    const name = token(reqField(item, "name", "source lock case"), "case name");
    if (names.has(name)) throw new AlgalError("PARSE_FAILED", `source lock case names must be unique: ${name}`);
    names.add(name);
    const responses = optField(item, "responses");
    const expected = optField(item, "outcome");
    return {
      name, args: fixtureKey(reqField(item, "args", "source lock case"), "case args"),
      ...(responses === undefined ? {} : { responses: fixtureKey(responses, "case responses") }),
      ...(expected === undefined ? {} : { outcome: outcome(expected, "case outcome") }),
    };
  }));
}

const isCaseList = (value: SourceLock | readonly SourceLockCase[]): value is readonly SourceLockCase[] => Array.isArray(value);
/** Distinct fixture paths that a case list or a lock's evaluation names,
 * sorted. A host reads exactly these files and passes their text as `fixtures`. */
export function sourceLockFixtureKeys(value: SourceLock | readonly SourceLockCase[]): string[] {
  const paths = isCaseList(value)
    ? value.flatMap(item => item.responses === undefined ? [item.args] : [item.args, item.responses])
    : (value.evaluation?.cases ?? []).flatMap(item => item.responses === undefined ? [item.args.path] : [item.args.path, item.responses.path]);
  return [...new Set(paths)].sort(compareUtf8);
}

type FixtureValue = { readonly value: JsonValue; readonly digest: Digest };
/** Copy exactly the named fixtures out of a closed map, synchronously: own
 * enumerable string data only, each within the byte limit, then parse and
 * digest each one's canonical JSON. */
function fixtureValues(value: unknown, keys: readonly string[]): Map<string, FixtureValue> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new AlgalError("PARSE_FAILED", "source lock fixtures must be an object");
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) throw new AlgalError("PARSE_FAILED", "source lock fixtures must be a plain object");
  const names = Reflect.ownKeys(value);
  if (names.length > 2 * SOURCE_LOCK_BOUNDS.evaluation.maxCases) throw new AlgalError("BUDGET_EXHAUSTED", `source lock fixtures exceed ${2 * SOURCE_LOCK_BOUNDS.evaluation.maxCases} files`);
  const wanted = new Set(keys);
  const values = new Map<string, FixtureValue>();
  for (const name of names) {
    if (typeof name !== "string" || !wanted.has(name)) throw new AlgalError("PARSE_FAILED", `source lock fixtures include ${typeof name === "string" ? JSON.stringify(name) : "a symbol key"}, which no case names`);
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    const text: unknown = descriptor !== undefined && Object.hasOwn(descriptor, "value") && descriptor.enumerable ? descriptor.value : undefined;
    if (typeof text !== "string") throw new AlgalError("PARSE_FAILED", `fixture ${name} must be JSON text`);
    const limit = SOURCE_LOCK_BOUNDS.evaluation.maxFixtureBytes;
    if (text.length > limit || utf8Length(text) > limit) throw new AlgalError("BUDGET_EXHAUSTED", `fixture ${name} exceeds ${limit} bytes`);
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new AlgalError("PARSE_FAILED", `fixture ${name} is not valid JSON`); }
    const data = boundedJsonSnapshot(parsed, SOURCE_LOCK_BOUNDS.evaluation.fixture, `fixture ${name}`);
    values.set(name, { value: data, digest: digestCanonical(data) });
  }
  for (const key of keys) if (!values.has(key)) throw new AlgalError("PARSE_FAILED", `source lock fixtures omit ${key}`);
  return values;
}
type RunArguments = Record<string, Record<string, JsonValue>>;
function runArguments(value: JsonValue, path: string): RunArguments {
  const object = asObject(value, `args fixture ${path}`);
  for (const cell of Object.keys(object)) asObject(object[cell], `args fixture ${path} cell ${JSON.stringify(cell)}`);
  return object as RunArguments;
}
type Prepared = { readonly name: string; readonly args: RunArguments; readonly responses: JsonObject };
/** Shape-check every case before anything runs, so a malformed fixture fails first. */
function prepare(cases: readonly { readonly name: string; readonly args: string; readonly responses?: string | undefined }[], values: ReadonlyMap<string, FixtureValue>): Prepared[] {
  return cases.map(item => ({
    name: item.name, args: runArguments(values.get(item.args)!.value, item.args),
    responses: item.responses === undefined ? {} : asObject(values.get(item.responses)!.value, `responses fixture ${item.responses}`),
  }));
}

/** Run one case in memory against the compiled closure: builtin functions, a
 * scripted executor over the case's responses, and no tools, transports, or
 * durable store. Only the outcome and the interface outputs are kept. */
async function replay(compilation: SourceCompilation, prepared: Prepared): Promise<{ outcome: RunOutcome; outputs: Digest; failure?: string }> {
  const store = new MemoryStore();
  for (const module of compilation.modules) await store.putManifest(module);
  await store.putManifest(compilation.manifest);
  const receipt = await runOrganism({ manifest: compilation.manifest, args: prepared.args, fns: builtinRegistry(), store, executors: [scriptedExecutor(prepared.responses)] });
  const outputs = Object.create(null) as JsonObject;
  for (const [name, target] of Object.entries(compilation.manifest.interface?.outputs ?? {})) {
    const ports = Object.hasOwn(receipt.cells, target.cell) ? receipt.cells[target.cell]!.outputs : undefined;
    if (ports !== undefined && Object.hasOwn(ports, target.port)) outputs[name] = ports[target.port]!;
  }
  return { outcome: receipt.outcome, outputs: digestCanonical(outputs), ...(receipt.failure === undefined ? {} : { failure: `${receipt.failure.code}: ${receipt.failure.message}` }) };
}
/** The replayed program must be the root the lock pins or compares. */
function sameRoot(compilation: SourceCompilation | undefined, root: Digest): void {
  if (compilation !== undefined && compilation.sourceMap.manifestDigest !== root) throw new AlgalError("INTERNAL", "source lock: replay compiled a different root");
}

/** Own enumerable string-keyed data properties of a plain object, read once. */
function closedEntries(value: unknown, limit: number, what: string): [string, unknown][] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new AlgalError("PARSE_FAILED", `${what} must be an object`);
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) throw new AlgalError("PARSE_FAILED", `${what} must be a plain object`);
  const names = Reflect.ownKeys(value);
  if (names.length > limit) throw new AlgalError("BUDGET_EXHAUSTED", `${what} exceed ${limit} entries`);
  return names.map(name => {
    const descriptor = typeof name === "string" ? Object.getOwnPropertyDescriptor(value, name) : undefined;
    if (typeof name !== "string" || descriptor === undefined || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      throw new AlgalError("PARSE_FAILED", `${what} must hold only plain data properties`);
    }
    return [name, descriptor.value as unknown];
  });
}
type VendoredInput = { readonly directory: string; readonly record: VendorRecord; readonly digest: Digest; readonly texts: ReadonlyMap<string, string> };
/** Copy supplied vendored sources synchronously: records keyed by directory,
 * each parsed strictly, and exactly the files they list as text within the
 * per-file source limit. A listed file with no text is absent. */
function vendoredInputs(value: unknown): VendoredInput[] {
  const parts = new Map(closedEntries(value, 8, "source lock vendored sources"));
  for (const key of parts.keys()) if (key !== "records" && key !== "files") throw new AlgalError("PARSE_FAILED", `source lock vendored sources has unknown key "${key}"`);
  if (!parts.has("records") || !parts.has("files")) throw new AlgalError("PARSE_FAILED", "source lock vendored sources require records and files");
  const texts = new Map<string, string>();
  for (const [key, text] of closedEntries(parts.get("files"), SOURCE_LOCK_BOUNDS.maxVendored * VENDOR_BOUNDS.maxFiles, "source lock vendored files")) {
    if (typeof text !== "string") throw new AlgalError("PARSE_FAILED", `vendored file ${key} must be text`);
    if (text.length > VENDOR_BOUNDS.maxFileBytes || utf8Length(text) > VENDOR_BOUNDS.maxFileBytes) throw new AlgalError("BUDGET_EXHAUSTED", `vendored file ${key} exceeds ${VENDOR_BOUNDS.maxFileBytes} bytes`);
    texts.set(key, text);
  }
  const listed = new Set<string>();
  const inputs = closedEntries(parts.get("records"), SOURCE_LOCK_BOUNDS.maxVendored, "source lock vendored records").map(([name, raw]): VendoredInput => {
    const directory = directoryKey(name, "vendored directory");
    const record = parseVendorRecord(raw, `${directory}/${VENDOR_RECORD_FILE}`);
    const own = new Map<string, string>();
    for (const file of record.files) {
      const key = `${directory}/${file.path}`;
      listed.add(key);
      const text = texts.get(key);
      if (text !== undefined) own.set(file.path, text);
    }
    return { directory, record, digest: digestCanonical(vendorRecordToJson(record)), texts: own };
  });
  for (const key of texts.keys()) if (!listed.has(key)) throw new AlgalError("PARSE_FAILED", `source lock vendored files include ${JSON.stringify(key)}, which no record lists`);
  return inputs.sort((left, right) => compareUtf8(left.directory, right.directory));
}
/** Pin each record; its directory must be above one of the project's files. */
function vendoredPins(inputs: readonly VendoredInput[], sources: readonly string[]): SourceLockVendored[] {
  return inputs.map(input => {
    if (!sources.some(source => source.startsWith(`${input.directory}/`))) throw new AlgalError("PARSE_FAILED", `vendored directory ${input.directory} holds none of the project's source files`);
    return { directory: input.directory, origin: input.record.origin, catalog: input.record.catalog, entry: input.record.entry, record: input.digest };
  });
}

function lockFromReport(report: SourceDependencyReport): SourceLock {
  const interfaces: Record<Digest, Digest> = {};
  for (const module of report.modules) interfaces[module.manifestDigest] = digestCanonical(module.interface as unknown as JsonValue);
  return {
    contract: SOURCE_LOCK_CONTRACT,
    entry: report.entry,
    compiler: { version: report.compilerVersion, profile: report.profile },
    units: report.sourceUnits.map(unit => ({ source: unit.source, sourceDigest: unit.sourceDigest, manifestDigest: unit.manifestDigest })),
    root: report.rootManifestDigest,
    modules: report.modules.map(module => module.manifestDigest).filter(digest => digest !== report.rootManifestDigest).sort(compareUtf8),
    analysis: { maxAgentCalls: report.analysis.maxAgentCalls, requiredDepth: report.analysis.requiredDepth },
    interfaces,
  };
}

/** Compile a closed source project and pin its closure. Writes nothing. A
 * closure beyond the lock's own bound is refused here rather than at
 * verification. With `evaluation`, each case is replayed in memory and pinned
 * only if it reaches its requested outcome; with `versions`, each label must
 * name a digest in the compiled closure; with `vendored`, each record is
 * pinned only if every file it lists still matches it.
 */
export async function createSourceLock(source: string, sourceOptions?: SourceCompilerOptions, options: SourceLockOptions = {}): Promise<SourceLock> {
  // Foreign options are copied and checked once, before the first await.
  const requested: unknown = options.evaluation;
  const cases = requested === undefined ? undefined : parseSourceLockCases(requested);
  const suppliedFixtures: unknown = options.fixtures;
  if ((cases === undefined) !== (suppliedFixtures === undefined)) throw new AlgalError("PARSE_FAILED", "source lock evaluation cases and fixtures must be supplied together");
  const values = cases === undefined ? undefined : fixtureValues(suppliedFixtures, sourceLockFixtureKeys(cases));
  const prepared = cases === undefined || values === undefined ? undefined : prepare(cases, values);
  const suppliedVersions: unknown = options.versions;
  const labels = suppliedVersions === undefined ? undefined : versionLabels(boundedJsonSnapshot(suppliedVersions, SOURCE_LOCK_BOUNDS.lock, "source lock versions"), "source lock versions");
  const suppliedVendored: unknown = options.vendored;
  const vendoredInput = suppliedVendored === undefined ? [] : vendoredInputs(suppliedVendored);
  const compilation = prepared === undefined ? undefined : compileSource(source, sourceOptions ?? {});
  const lock = lockFromReport(await createSourceDependencyReport(source, sourceOptions === undefined ? {} : { sourceOptions }));
  if (lock.modules.length > SOURCE_LOCK_BOUNDS.maxModules) throw new AlgalError("BUDGET_EXHAUSTED", `source lock: closure exceeds ${SOURCE_LOCK_BOUNDS.maxModules} modules`);
  sameRoot(compilation, lock.root);
  if (labels !== undefined) versionLabels(labels, "source lock versions", new Set([lock.root, ...lock.modules]));
  let evaluation: SourceLockEvaluation | undefined;
  if (cases !== undefined && values !== undefined && prepared !== undefined && compilation !== undefined) {
    const pinned: SourceLockEvaluationCase[] = [];
    for (const [index, item] of cases.entries()) {
      const result = await replay(compilation, prepared[index]!);
      const wanted = item.outcome ?? "complete";
      if (result.outcome !== wanted) {
        const reason = result.failure === undefined ? "" : ` (${[...printableText(result.failure.replaceAll("\n", " "))].slice(0, 240).join("")})`;
        throw new AlgalError("RECEIPT_MISMATCH", `source lock case ${item.name} ended ${result.outcome}${reason}; expected ${wanted}`);
      }
      pinned.push({
        name: item.name, args: { path: item.args, digest: values.get(item.args)!.digest },
        ...(item.responses === undefined ? {} : { responses: { path: item.responses, digest: values.get(item.responses)!.digest } }),
        outcome: result.outcome, outputs: result.outputs,
      });
    }
    evaluation = { runtime: RUNTIME_VERSION, cases: pinned.sort((left, right) => compareUtf8(left.name, right.name)) };
  }
  const vendored = vendoredInput.length === 0 ? undefined : vendoredPins(vendoredInput, lock.units.map(unit => unit.source));
  for (const input of vendoredInput) {
    const differences = await checkVendoredFiles(input.record, input.texts);
    if (differences.length > 0) throw new AlgalError("DIGEST_MISMATCH", `source lock: ${input.directory} differs from its vendor record: ${vendorDifferenceList(differences)}`);
  }
  return freezeDeep({
    ...lock, ...(evaluation === undefined ? {} : { evaluation }), ...(labels === undefined ? {} : { versions: labels }),
    ...(vendored === undefined ? {} : { vendored }),
  });
}

function fixturePin(value: unknown, what: string): SourceLockFixture {
  const object = asObject(value, what);
  noUnknownKeys(object, ["path", "digest"], what);
  return { path: fixtureKey(reqField(object, "path", what), `${what} path`), digest: asDigest(reqField(object, "digest", what), `${what} digest`) };
}
function parseEvaluation(value: unknown): SourceLockEvaluation {
  const object = asObject(value, "source lock evaluation");
  noUnknownKeys(object, ["runtime", "cases"], "source lock evaluation");
  const runtime = token(reqField(object, "runtime", "source lock evaluation"), "evaluation runtime");
  const raw = asArray(reqField(object, "cases", "source lock evaluation"), "source lock evaluation cases");
  caseCount(raw.length, "source lock evaluation cases");
  const pinned = new Map<string, Digest>();
  const cases = raw.map((entry, index): SourceLockEvaluationCase => {
    const item = asObject(entry, `source lock evaluation case ${index}`);
    noUnknownKeys(item, ["name", "args", "responses", "outcome", "outputs"], `source lock evaluation case ${index}`);
    const responses = optField(item, "responses");
    const parsed: SourceLockEvaluationCase = {
      name: token(reqField(item, "name", "source lock evaluation case"), "case name"),
      args: fixturePin(reqField(item, "args", "source lock evaluation case"), "case args"),
      ...(responses === undefined ? {} : { responses: fixturePin(responses, "case responses") }),
      outcome: outcome(reqField(item, "outcome", "source lock evaluation case"), "case outcome"),
      outputs: asDigest(reqField(item, "outputs", "source lock evaluation case"), "case outputs"),
    };
    for (const fixture of parsed.responses === undefined ? [parsed.args] : [parsed.args, parsed.responses]) {
      const seen = pinned.get(fixture.path);
      if (seen !== undefined && seen !== fixture.digest) throw new AlgalError("PARSE_FAILED", `source lock fixture ${fixture.path} is pinned with two digests`);
      pinned.set(fixture.path, fixture.digest);
    }
    return parsed;
  });
  for (let index = 1; index < cases.length; index++) {
    if (compareUtf8(cases[index - 1]!.name, cases[index]!.name) >= 0) throw new AlgalError("PARSE_FAILED", "source lock evaluation cases must be sorted by unique name");
  }
  return { runtime, cases };
}
function parseVendored(value: unknown, units: readonly SourceLockUnit[]): SourceLockVendored[] {
  const raw = asArray(value, "source lock vendored");
  if (raw.length === 0) throw new AlgalError("PARSE_FAILED", "source lock vendored must name at least one directory");
  if (raw.length > SOURCE_LOCK_BOUNDS.maxVendored) throw new AlgalError("BUDGET_EXHAUSTED", `source lock vendored exceeds ${SOURCE_LOCK_BOUNDS.maxVendored} directories`);
  const pins = raw.map((item, index): SourceLockVendored => {
    const what = `source lock vendored ${index}`;
    const object = asObject(item, what);
    noUnknownKeys(object, ["directory", "origin", "catalog", "entry", "record"], what);
    return {
      directory: directoryKey(reqField(object, "directory", what), `${what} directory`),
      origin: vendorOrigin(reqField(object, "origin", what), `${what} origin`),
      catalog: asDigest(reqField(object, "catalog", what), `${what} catalog`),
      entry: vendorPath(reqField(object, "entry", what), `${what} entry`),
      record: asDigest(reqField(object, "record", what), `${what} record`),
    };
  });
  for (let index = 1; index < pins.length; index++) {
    if (compareUtf8(pins[index - 1]!.directory, pins[index]!.directory) >= 0) throw new AlgalError("PARSE_FAILED", "source lock vendored directories must be sorted and unique");
  }
  for (const pin of pins) {
    if (!units.some(unit => unit.source.startsWith(`${pin.directory}/`))) throw new AlgalError("PARSE_FAILED", `source lock vendored directory ${pin.directory} holds no unit`);
  }
  return pins;
}

/** Parse foreign lock data strictly: known keys only, bounded lists, key and
 * digest shapes, sorted unique units and modules, an entry unit that carries
 * the root digest, interfaces covering exactly the root and its modules,
 * sorted uniquely named evaluation cases, version labels whose digests are in
 * the closure, and sorted vendored directories that each hold a unit. The
 * result is fresh, frozen data.
 */
export function parseSourceLock(value: unknown): SourceLock {
  const data = boundedJsonSnapshot(value, SOURCE_LOCK_BOUNDS.lock, "source lock");
  const object = asObject(data, "source lock");
  noUnknownKeys(object, ["contract", "entry", "compiler", "units", "root", "modules", "analysis", "interfaces", "evaluation", "versions", "vendored"], "source lock");
  if (object.contract !== SOURCE_LOCK_CONTRACT) throw new AlgalError("PARSE_FAILED", `source lock: expected contract "${SOURCE_LOCK_CONTRACT}"`);
  const entry = sourceKey(reqField(object, "entry", "source lock"), "source lock entry");
  const compilerObject = asObject(reqField(object, "compiler", "source lock"), "source lock compiler");
  noUnknownKeys(compilerObject, ["version", "profile"], "source lock compiler");
  const compiler = {
    version: token(reqField(compilerObject, "version", "source lock compiler"), "compiler version"),
    profile: token(reqField(compilerObject, "profile", "source lock compiler"), "compiler profile"),
  };
  const unitsRaw = asArray(reqField(object, "units", "source lock"), "source lock units");
  if (unitsRaw.length === 0) throw new AlgalError("PARSE_FAILED", "source lock units must include the entry");
  if (unitsRaw.length > SOURCE_LOCK_BOUNDS.maxUnits) throw new AlgalError("BUDGET_EXHAUSTED", `source lock units exceed ${SOURCE_LOCK_BOUNDS.maxUnits} entries`);
  const units: SourceLockUnit[] = unitsRaw.map((raw, index) => {
    const unit = asObject(raw, `source lock unit ${index}`);
    noUnknownKeys(unit, ["source", "sourceDigest", "manifestDigest"], `source lock unit ${index}`);
    return {
      source: sourceKey(reqField(unit, "source", "source lock unit"), "unit source"),
      sourceDigest: asDigest(reqField(unit, "sourceDigest", "source lock unit"), "unit sourceDigest"),
      manifestDigest: asDigest(reqField(unit, "manifestDigest", "source lock unit"), "unit manifestDigest"),
    };
  });
  for (let index = 1; index < units.length; index++) {
    if (compareUtf8(units[index - 1]!.source, units[index]!.source) >= 0) throw new AlgalError("PARSE_FAILED", "source lock units must be sorted by unique source key");
  }
  const root = asDigest(reqField(object, "root", "source lock"), "source lock root");
  const entryUnit = units.find(unit => unit.source === entry);
  if (entryUnit === undefined || entryUnit.manifestDigest !== root) throw new AlgalError("PARSE_FAILED", "source lock entry must be a unit whose executable digest is the root");
  const modulesRaw = asArray(reqField(object, "modules", "source lock"), "source lock modules");
  if (modulesRaw.length > SOURCE_LOCK_BOUNDS.maxModules) throw new AlgalError("BUDGET_EXHAUSTED", `source lock modules exceed ${SOURCE_LOCK_BOUNDS.maxModules} entries`);
  const modules = modulesRaw.map((raw, index) => asDigest(raw, `source lock module ${index}`));
  for (let index = 1; index < modules.length; index++) {
    if (compareUtf8(modules[index - 1]!, modules[index]!) >= 0) throw new AlgalError("PARSE_FAILED", "source lock modules must be sorted and unique");
  }
  if (modules.includes(root)) throw new AlgalError("PARSE_FAILED", "source lock modules must not include the root");
  const analysisObject = asObject(reqField(object, "analysis", "source lock"), "source lock analysis");
  noUnknownKeys(analysisObject, ["maxAgentCalls", "requiredDepth"], "source lock analysis");
  const analysis = {
    maxAgentCalls: asInt(reqField(analysisObject, "maxAgentCalls", "source lock analysis"), "analysis.maxAgentCalls", 0, BOUNDS.maxAgentCalls),
    requiredDepth: asInt(reqField(analysisObject, "requiredDepth", "source lock analysis"), "analysis.requiredDepth", 0, BOUNDS.maxDepth),
  };
  const interfacesObject = asObject(reqField(object, "interfaces", "source lock"), "source lock interfaces");
  const keys = Object.keys(interfacesObject);
  if (keys.length !== modules.length + 1) throw new AlgalError("PARSE_FAILED", "source lock interfaces must cover exactly the root and its modules");
  const interfaces: Record<Digest, Digest> = {};
  for (const key of keys) interfaces[asDigest(key, "source lock interface key")] = asDigest(interfacesObject[key], "source lock interface digest");
  for (const digest of [root, ...modules]) {
    if (!Object.hasOwn(interfaces, digest)) throw new AlgalError("PARSE_FAILED", `source lock interfaces omit ${digest}`);
  }
  const evaluationValue = optField(object, "evaluation");
  const evaluation = evaluationValue === undefined ? undefined : parseEvaluation(evaluationValue);
  const versionsValue = optField(object, "versions");
  const versions = versionsValue === undefined ? undefined : versionLabels(versionsValue, "source lock versions", new Set([root, ...modules]));
  const vendoredValue = optField(object, "vendored");
  const vendored = vendoredValue === undefined ? undefined : parseVendored(vendoredValue, units);
  return freezeDeep({
    contract: SOURCE_LOCK_CONTRACT, entry, compiler, units, root, modules, analysis, interfaces,
    ...(evaluation === undefined ? {} : { evaluation }), ...(versions === undefined ? {} : { versions }),
    ...(vendored === undefined ? {} : { vendored }),
  });
}

export function sourceLockToJson(lock: SourceLock): JsonObject {
  const fixture = (pin: SourceLockFixture): JsonObject => ({ path: pin.path, digest: pin.digest });
  return {
    contract: lock.contract, entry: lock.entry, compiler: { version: lock.compiler.version, profile: lock.compiler.profile },
    units: lock.units.map(unit => ({ source: unit.source, sourceDigest: unit.sourceDigest, manifestDigest: unit.manifestDigest })),
    root: lock.root, modules: [...lock.modules], analysis: { maxAgentCalls: lock.analysis.maxAgentCalls, requiredDepth: lock.analysis.requiredDepth },
    interfaces: { ...lock.interfaces },
    ...(lock.evaluation === undefined ? {} : {
      evaluation: {
        runtime: lock.evaluation.runtime,
        cases: lock.evaluation.cases.map(item => ({
          name: item.name, args: fixture(item.args), ...(item.responses === undefined ? {} : { responses: fixture(item.responses) }),
          outcome: item.outcome, outputs: item.outputs,
        })),
      },
    }),
    ...(lock.versions === undefined ? {} : { versions: { ...lock.versions } }),
    ...(lock.vendored === undefined ? {} : {
      vendored: lock.vendored.map(pin => ({ directory: pin.directory, origin: pin.origin, catalog: pin.catalog, entry: pin.entry, record: pin.record })),
    }),
  };
}

/** Recompile the source and compare it with a lock. Every difference is
 * reported in a fixed order so source, executable, compiler, closure,
 * interface, label, evaluation, and vendored-copy drift stay distinguishable;
 * `ok` is true only when nothing differs. With `fixtures`, every pinned case
 * is replayed in memory against the recompiled program; without them, no case
 * runs and `evaluation.replayed` is false. With `vendored`, the supplied
 * records are compared with the pinned directories and every listed file with
 * its record, by source digest and by the executable and interface digests it
 * compiles to; without them, no copy is checked.
 */
export async function verifySourceLock(source: string, sourceOptions: SourceCompilerOptions | undefined, lockValue: unknown, options: SourceLockVerifyOptions = {}): Promise<SourceLockVerification> {
  const expected = parseSourceLock(lockValue);
  const suppliedFixtures: unknown = options.fixtures;
  if (suppliedFixtures !== undefined && expected.evaluation === undefined) throw new AlgalError("PARSE_FAILED", "source lock pins no evaluation cases to replay");
  const values = suppliedFixtures === undefined ? undefined : fixtureValues(suppliedFixtures, sourceLockFixtureKeys(expected));
  const suppliedVendored: unknown = options.vendored;
  const vendoredInput = suppliedVendored === undefined ? undefined : vendoredInputs(suppliedVendored);
  const cases = expected.evaluation?.cases ?? [];
  const prepared = values === undefined ? undefined
    : prepare(cases.map(item => ({ name: item.name, args: item.args.path, responses: item.responses?.path })), values);
  const compilation = prepared === undefined ? undefined : compileSource(source, sourceOptions ?? {});
  const lockDigest = digestCanonical(sourceLockToJson(expected));
  const actual = await createSourceLock(source, sourceOptions);
  sameRoot(compilation, actual.root);
  const drift: SourceLockDrift[] = [];
  const note = (kind: SourceLockDriftKind, subject: string, wanted: string, found: string): void => {
    if (wanted !== found) drift.push({ kind, subject, expected: wanted, actual: found });
  };
  note("entry", "entry", expected.entry, actual.entry);
  note("compiler", "version", expected.compiler.version, actual.compiler.version);
  note("compiler", "profile", expected.compiler.profile, actual.compiler.profile);
  const expectedUnits = new Map(expected.units.map(unit => [unit.source, unit]));
  const actualUnits = new Map(actual.units.map(unit => [unit.source, unit]));
  const keys = [...new Set([...expectedUnits.keys(), ...actualUnits.keys()])].sort(compareUtf8);
  for (const key of keys) note("source", key, expectedUnits.get(key)?.sourceDigest ?? ABSENT, actualUnits.get(key)?.sourceDigest ?? ABSENT);
  for (const key of keys) {
    const wanted = expectedUnits.get(key);
    const found = actualUnits.get(key);
    if (wanted !== undefined && found !== undefined) note("unit", key, wanted.manifestDigest, found.manifestDigest);
  }
  note("root", "root", expected.root, actual.root);
  const expectedModules = new Set(expected.modules);
  const actualModules = new Set(actual.modules);
  for (const digest of [...new Set([...expectedModules, ...actualModules])].sort(compareUtf8)) {
    note("closure", digest, expectedModules.has(digest) ? digest : ABSENT, actualModules.has(digest) ? digest : ABSENT);
  }
  // A file whose executable digest moved is paired by key, so a changed
  // interface shows even though no digest is shared; an unchanged digest is
  // compared directly, which only a tampered lock can fail.
  for (const key of keys) {
    const wanted = expectedUnits.get(key);
    const found = actualUnits.get(key);
    if (wanted === undefined || found === undefined || wanted.manifestDigest === found.manifestDigest) continue;
    const pinned = Object.hasOwn(expected.interfaces, wanted.manifestDigest) ? expected.interfaces[wanted.manifestDigest]! : ABSENT;
    const resolved = Object.hasOwn(actual.interfaces, found.manifestDigest) ? actual.interfaces[found.manifestDigest]! : ABSENT;
    note("interface", key, pinned, resolved);
  }
  for (const digest of [expected.root, ...expected.modules]) {
    if (Object.hasOwn(actual.interfaces, digest)) note("interface", digest, expected.interfaces[digest]!, actual.interfaces[digest]!);
  }
  note("analysis", "maxAgentCalls", String(expected.analysis.maxAgentCalls), String(actual.analysis.maxAgentCalls));
  note("analysis", "requiredDepth", String(expected.analysis.requiredDepth), String(actual.analysis.requiredDepth));
  // A label never follows a new digest: it drifts once its digest leaves the closure.
  const closure = new Set<string>([actual.root, ...actual.modules]);
  const versions = expected.versions ?? {};
  for (const name of Object.keys(versions).sort(compareUtf8)) note("version", name, versions[name]!, closure.has(versions[name]!) ? versions[name]! : ABSENT);
  if (expected.evaluation !== undefined && values !== undefined && prepared !== undefined && compilation !== undefined) {
    note("evaluation", "runtime", expected.evaluation.runtime, RUNTIME_VERSION);
    for (const [index, item] of cases.entries()) {
      note("evaluation", `${item.name}/args`, item.args.digest, values.get(item.args.path)!.digest);
      if (item.responses !== undefined) note("evaluation", `${item.name}/responses`, item.responses.digest, values.get(item.responses.path)!.digest);
      const result = await replay(compilation, prepared[index]!);
      note("evaluation", `${item.name}/outcome`, item.outcome, result.outcome);
      note("evaluation", `${item.name}/outputs`, item.outputs, result.outputs);
    }
  }
  if (vendoredInput !== undefined) {
    // Directories are paired by name: a record that appeared, disappeared, or
    // changed is reported first, then each listed file that no longer matches it.
    const pinned = new Map((expected.vendored ?? []).map(pin => [pin.directory, pin]));
    const found = new Map(vendoredPins(vendoredInput, actual.units.map(unit => unit.source)).map(pin => [pin.directory, pin]));
    const inputs = new Map(vendoredInput.map(input => [input.directory, input]));
    for (const directory of [...new Set([...pinned.keys(), ...found.keys()])].sort(compareUtf8)) {
      const wanted = pinned.get(directory);
      const current = found.get(directory);
      note("vendor", directory, wanted?.record ?? ABSENT, current?.record ?? ABSENT);
      if (wanted !== undefined && current !== undefined) {
        note("vendor", `${directory}:origin`, wanted.origin, current.origin);
        note("vendor", `${directory}:catalog`, wanted.catalog, current.catalog);
        note("vendor", `${directory}:entry`, wanted.entry, current.entry);
      }
      const input = inputs.get(directory);
      if (input === undefined) continue;
      for (const difference of await checkVendoredFiles(input.record, input.texts)) {
        drift.push({ kind: "vendor", subject: `${directory}/${difference.subject}`, expected: difference.expected, actual: difference.actual });
      }
    }
  }
  drift.sort((left, right) => DRIFT_ORDER.indexOf(left.kind) - DRIFT_ORDER.indexOf(right.kind));
  const truncated = drift.length > SOURCE_LOCK_BOUNDS.maxDrift;
  const verification: SourceLockVerification = {
    contract: SOURCE_LOCK_VERIFICATION_CONTRACT, ok: drift.length === 0, lockDigest, root: actual.root,
    drift: drift.slice(0, SOURCE_LOCK_BOUNDS.maxDrift), truncated,
    ...(expected.evaluation === undefined ? {} : { evaluation: { cases: cases.length, replayed: values !== undefined } }),
    ...(expected.vendored === undefined ? {} : { vendored: { directories: expected.vendored.length, checked: vendoredInput !== undefined } }),
  };
  freezeDeep(verification);
  verifications.add(verification);
  return verification;
}

/** One-line label: parsed keys and tokens exclude controls already; this keeps a forged field on its own line. */
const label = (text: string): string => printableText(text.replaceAll("\n", "�"));

/** Render a verification this module produced; foreign objects are refused. */
export function renderSourceLockVerification(verification: SourceLockVerification): string {
  if (!verifications.has(verification)) throw new AlgalError("PARSE_FAILED", "source lock: only verifications created by verifySourceLock can be rendered");
  const lines = [
    `ALGAL source lock · ${verification.ok ? "verified" : "drift"} · lock ${verification.lockDigest} · root ${verification.root}`,
  ];
  if (verification.drift.length === 0) lines.push("The source compiles to the locked closure.");
  const evaluation = Object.hasOwn(verification, "evaluation") ? verification.evaluation : undefined;
  if (evaluation !== undefined) {
    lines.push(`Evaluation: ${evaluation.cases} pinned case${evaluation.cases === 1 ? "" : "s"}${evaluation.replayed ? " replayed offline" : ", not replayed"}.`);
  }
  const vendored = Object.hasOwn(verification, "vendored") ? verification.vendored : undefined;
  if (vendored !== undefined) {
    lines.push(`Vendored: ${vendored.directories} pinned director${vendored.directories === 1 ? "y" : "ies"}${vendored.checked ? " checked offline" : ", not checked"}.`);
  }
  if (verification.drift.length > 0) {
    lines.push(`Drift (${verification.drift.length}${verification.truncated ? "+, truncated" : ""}):`);
    for (const entry of verification.drift) lines.push(`  ${entry.kind} ${label(entry.subject)}: expected ${label(entry.expected)}, actual ${label(entry.actual)}`);
  }
  return `${lines.join("\n")}\n`;
}
