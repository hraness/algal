// Local source lock: pin a closed source project to the exact executable
// closure it compiles to, and verify that pin offline. A lock is data outside
// executable identity; it never supplies source or manifests, and verification
// recompiles from the closed source map with no network or package resolver.
import { BOUNDS } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { SOURCE_PROJECT_BOUNDS, type SourceCompilerOptions } from "./source";
import { boundedJsonSnapshot, createSourceDependencyReport, freezeDeep, printableText, type SourceDependencyReport } from "./source-dependencies";
import { compareUtf8 } from "./utf8";
import { asArray, asInt, asObject, asString, noUnknownKeys, reqField, type JsonObject, type JsonValue } from "./values";

export const SOURCE_LOCK_CONTRACT = "algal.source-lock.v1" as const;
export const SOURCE_LOCK_VERIFICATION_CONTRACT = "algal.source-lock-verification.v1" as const;
export const SOURCE_LOCK_BOUNDS = Object.freeze({
  maxUnits: SOURCE_PROJECT_BOUNDS.maxFiles,
  /** Twice today's largest closure: one module per imported file plus one
   * generated trigger wrapper per called child (15 + 15 for 16 files). */
  maxModules: 4 * (SOURCE_PROJECT_BOUNDS.maxFiles - 1),
  /** Above every possible drift list, so verification never truncates. */
  maxDrift: 256,
  maxKeyLength: 512,
  maxTokenLength: 64,
  /** Own-data snapshot limits for a supplied lock value; the largest legal lock is under 32 KiB. */
  lock: Object.freeze({ maxBytes: 65_536, maxDepth: 8, maxNodes: 16_384, maxEntries: 2_048, maxStringBytes: 2_048 }),
});
export type SourceLockUnit = { readonly source: string; readonly sourceDigest: Digest; readonly manifestDigest: Digest };
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
};
export type SourceLockDriftKind = "entry" | "compiler" | "source" | "unit" | "root" | "closure" | "interface" | "analysis";
export type SourceLockDrift = { readonly kind: SourceLockDriftKind; readonly subject: string; readonly expected: string; readonly actual: string };
export type SourceLockVerification = {
  readonly contract: typeof SOURCE_LOCK_VERIFICATION_CONTRACT;
  readonly ok: boolean;
  /** Digest of the parsed lock's canonical JSON, not of the supplied file bytes. */
  readonly lockDigest: Digest;
  readonly root: Digest;
  /** Fixed order: entry, compiler, source digests, unit digests, root, closure, interfaces, analysis. */
  readonly drift: readonly SourceLockDrift[];
  /** Always false today: the bound exceeds the largest possible list. */
  readonly truncated: boolean;
};

const verifications = new WeakSet<SourceLockVerification>();
const ABSENT = "(absent)";
const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DRIFT_ORDER: readonly SourceLockDriftKind[] = ["entry", "compiler", "source", "unit", "root", "closure", "interface", "analysis"];

/** The compiler's normalized project-relative key rules, applied to lock data. */
function sourceKey(value: unknown, what: string): string {
  const key = asString(value, what, SOURCE_LOCK_BOUNDS.maxKeyLength);
  const invalid = !key.endsWith(".algal") || key.includes("\\") || key.includes(":")
    || [...key].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    || key.split("/").some(part => !part || part === "." || part === "..");
  if (invalid) throw new AlgalError("PARSE_FAILED", `${what} must be a normalized project-relative .algal path`);
  return key;
}
function token(value: unknown, what: string): string {
  const text = asString(value, what, SOURCE_LOCK_BOUNDS.maxTokenLength);
  if (!TOKEN.test(text)) throw new AlgalError("PARSE_FAILED", `${what} must be a plain version token`);
  return text;
}

function lockFromReport(report: SourceDependencyReport): SourceLock {
  const interfaces: Record<Digest, Digest> = {};
  for (const module of report.modules) interfaces[module.manifestDigest] = digestCanonical(module.interface as unknown as JsonValue);
  return freezeDeep({
    contract: SOURCE_LOCK_CONTRACT,
    entry: report.entry,
    compiler: { version: report.compilerVersion, profile: report.profile },
    units: report.sourceUnits.map(unit => ({ source: unit.source, sourceDigest: unit.sourceDigest, manifestDigest: unit.manifestDigest })),
    root: report.rootManifestDigest,
    modules: report.modules.map(module => module.manifestDigest).filter(digest => digest !== report.rootManifestDigest).sort(compareUtf8),
    analysis: { maxAgentCalls: report.analysis.maxAgentCalls, requiredDepth: report.analysis.requiredDepth },
    interfaces,
  });
}

/** Compile a closed source project and pin its closure. Writes nothing. */
export async function createSourceLock(source: string, sourceOptions?: SourceCompilerOptions): Promise<SourceLock> {
  return lockFromReport(await createSourceDependencyReport(source, sourceOptions === undefined ? {} : { sourceOptions }));
}

/** Parse foreign lock data strictly: known keys only, bounded lists, key and
 * digest shapes, sorted unique units and modules, an entry unit that carries
 * the root digest, and interfaces covering exactly the root and its modules.
 * The result is fresh, frozen data.
 */
export function parseSourceLock(value: unknown): SourceLock {
  const data = boundedJsonSnapshot(value, SOURCE_LOCK_BOUNDS.lock, "source lock");
  const object = asObject(data, "source lock");
  noUnknownKeys(object, ["contract", "entry", "compiler", "units", "root", "modules", "analysis", "interfaces"], "source lock");
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
  return freezeDeep({ contract: SOURCE_LOCK_CONTRACT, entry, compiler, units, root, modules, analysis, interfaces });
}

export function sourceLockToJson(lock: SourceLock): JsonObject {
  return {
    contract: lock.contract, entry: lock.entry, compiler: { version: lock.compiler.version, profile: lock.compiler.profile },
    units: lock.units.map(unit => ({ source: unit.source, sourceDigest: unit.sourceDigest, manifestDigest: unit.manifestDigest })),
    root: lock.root, modules: [...lock.modules], analysis: { maxAgentCalls: lock.analysis.maxAgentCalls, requiredDepth: lock.analysis.requiredDepth },
    interfaces: { ...lock.interfaces },
  };
}

/** Recompile the source and compare it with a lock. Every difference is
 * reported in a fixed order so source, executable, compiler, closure, and
 * interface drift stay distinguishable; `ok` is true only when nothing differs.
 */
export async function verifySourceLock(source: string, sourceOptions: SourceCompilerOptions | undefined, lockValue: unknown): Promise<SourceLockVerification> {
  const expected = parseSourceLock(lockValue);
  const lockDigest = digestCanonical(sourceLockToJson(expected));
  const actual = await createSourceLock(source, sourceOptions);
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
    note("interface", key, expected.interfaces[wanted.manifestDigest] ?? ABSENT, actual.interfaces[found.manifestDigest] ?? ABSENT);
  }
  for (const digest of [expected.root, ...expected.modules]) {
    if (Object.hasOwn(actual.interfaces, digest)) note("interface", digest, expected.interfaces[digest]!, actual.interfaces[digest]!);
  }
  note("analysis", "maxAgentCalls", String(expected.analysis.maxAgentCalls), String(actual.analysis.maxAgentCalls));
  note("analysis", "requiredDepth", String(expected.analysis.requiredDepth), String(actual.analysis.requiredDepth));
  drift.sort((left, right) => DRIFT_ORDER.indexOf(left.kind) - DRIFT_ORDER.indexOf(right.kind));
  const truncated = drift.length > SOURCE_LOCK_BOUNDS.maxDrift;
  const verification: SourceLockVerification = {
    contract: SOURCE_LOCK_VERIFICATION_CONTRACT, ok: drift.length === 0, lockDigest, root: actual.root,
    drift: drift.slice(0, SOURCE_LOCK_BOUNDS.maxDrift), truncated,
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
  else {
    lines.push(`Drift (${verification.drift.length}${verification.truncated ? "+, truncated" : ""}):`);
    for (const entry of verification.drift) lines.push(`  ${entry.kind} ${label(entry.subject)}: expected ${label(entry.expected)}, actual ${label(entry.actual)}`);
  }
  return `${lines.join("\n")}\n`;
}
