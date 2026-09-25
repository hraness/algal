// Shared program catalog records. `algal.library-comparison.v1` records one
// comparison of a proposed revision of a listed program with its current
// version; `algal.library-unseen-cases.v1` is the case file whose digest a
// catalog entry pins. Both are parsed from `unknown` under fixed limits. A
// record's verdict is derived from its rows, so a record whose verdict and rows
// disagree is rejected; whether the rows are true can only be answered by
// running the comparison again. This module reads no files and does not know
// the catalog page.
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import type { RunOutcome } from "./run";
import { boundedJsonSnapshot, freezeDeep, printableText } from "./source-dependencies";
import { SOURCE_LOCK_BOUNDS } from "./source-lock";
import { compareUtf8 } from "./utf8";
import { asArray, asObject, canonicalize, noUnknownKeys, optField, reqField, type JsonObject, type JsonValue } from "./values";

export const LIBRARY_COMPARISON_CONTRACT = "algal.library-comparison.v1" as const;
export const LIBRARY_UNSEEN_CASES_CONTRACT = "algal.library-unseen-cases.v1" as const;
const CASES = SOURCE_LOCK_BOUNDS.evaluation.maxCases;
const FIXTURE = SOURCE_LOCK_BOUNDS.evaluation.fixture;
export const LIBRARY_COMPARISON_BOUNDS = Object.freeze({
  /** Calling entry points: the catalog page's limit. */
  maxCallers: 16,
  /** Other catalog entries whose executable digests move with a revision. */
  maxDependents: 31,
  /** Cases in one caller's case list, and in one unseen case file: the lock's case limit. */
  maxCases: CASES,
  /** Case rows in one record: every caller's case list plus the unseen cases. */
  maxRows: 16 * CASES + CASES,
  maxPathLength: 256,
  maxTokenLength: 64,
  /** Characters of a caller's reason for not running its cases. */
  maxReasonLength: 240,
  /** Own-data limits for a record. The largest legal record, with every list
   * full and every path at its limit, measures under 400 KiB. */
  record: Object.freeze({ maxBytes: 524_288, maxDepth: 6, maxNodes: 16_384, maxEntries: 512, maxStringBytes: 1_024 }),
  /** Own-data limits for an unseen case file: one lock fixture's 64 KiB, with
   * each case's arguments allowed to nest as deeply as run arguments. */
  unseen: Object.freeze({
    maxBytes: SOURCE_LOCK_BOUNDS.evaluation.maxFixtureBytes, maxDepth: FIXTURE.maxDepth + 3,
    maxNodes: FIXTURE.maxNodes, maxEntries: FIXTURE.maxEntries, maxStringBytes: SOURCE_LOCK_BOUNDS.evaluation.maxFixtureBytes,
  }),
});

/** `pinned` cases come from a calling entry point's case list; `unseen` cases from the pinned case file. */
export type LibraryComparisonSet = "pinned" | "unseen";
/** Closed reason classes for a deliberate case change: the author must say
 * which kind of change the record authorizes, not only which cases. */
export const LIBRARY_INTENDED_REASONS = ["corrected", "extended", "restricted"] as const;
export type LibraryIntendedReason = typeof LIBRARY_INTENDED_REASONS[number];
/** The cases a proposer declares will change, with the declared reason class.
 * The record passes with changed rows only when this list is exactly the
 * cases whose outcome or outputs moved — unlisted changes and cases declared
 * but unchanged both fail. */
export type LibraryIntendedChange = {
  /** Case identifiers (`set:entry#name`), sorted and unique. */
  readonly changed: readonly string[];
  readonly reason: LibraryIntendedReason;
};
export type LibraryComparisonResult = { readonly outcome: RunOutcome; readonly outputs: Digest };
/** A program's executable digest and the digest of its resolved interface. */
export type LibraryComparisonVersion = { readonly digest: Digest; readonly interface: Digest };
/** Another catalog entry that calls the revised file, so its executable digest moves too. */
export type LibraryComparisonDependent = {
  readonly path: string;
  readonly base: Digest;
  /** Null when it does not compile with the revision. */
  readonly candidate: Digest | null;
};
export type LibraryComparisonCaller = {
  /** Calling entry point, relative to the catalog's projects directory. */
  readonly entry: string;
  /** Source root, relative to the repository, as the catalog page lists it. */
  readonly root: string;
  /** The case list beside the entry point and the digest of its canonical JSON, or null when there is none. */
  readonly cases: { readonly path: string; readonly digest: Digest } | null;
  readonly base: Digest;
  /** Null when the entry point does not compile or run with the revision. */
  readonly candidate: Digest | null;
  /** Present exactly when `candidate` is null. */
  readonly reason?: string;
};
export type LibraryComparisonCase = {
  readonly set: LibraryComparisonSet;
  readonly entry: string;
  readonly name: string;
  /** Digests of a pinned case's argument and response files. Unseen cases
   * record none: the pinned file digest already covers their inputs. */
  readonly args?: Digest;
  readonly responses?: Digest;
  readonly base: LibraryComparisonResult;
  /** Null when the case could not run with the revision. */
  readonly candidate: LibraryComparisonResult | null;
};
export type LibraryComparisonVerdict = {
  readonly passed: boolean;
  readonly interfaceChanged: boolean;
  /** The entry pins no unseen case file, so no unseen case ran. */
  readonly unseenMissing: boolean;
  /** Calling entry points and dependent entries that do not compile or run with the revision. */
  readonly notCompiled: readonly string[];
  /** Case identifiers (`set:entry#name`) whose outcome or outputs differ. */
  readonly changed: readonly string[];
  /** Case identifiers that could not run with the revision. */
  readonly notRun: readonly string[];
};
export type LibraryComparison = {
  readonly contract: typeof LIBRARY_COMPARISON_CONTRACT;
  readonly name: string;
  /** The entry's file, relative to the catalog's projects directory. */
  readonly path: string;
  readonly compiler: { readonly profile: string; readonly version: string };
  /** Runtime semantics version (`RUNTIME_VERSION`) of every replay. */
  readonly runtime: string;
  readonly base: LibraryComparisonVersion;
  readonly candidate: LibraryComparisonVersion;
  /** Digest of the unseen case file's canonical JSON, or null when the entry pins none. */
  readonly unseen: Digest | null;
  /** Sorted by path. */
  readonly dependents: readonly LibraryComparisonDependent[];
  /** Sorted by entry point. */
  readonly callers: readonly LibraryComparisonCaller[];
  /** Sorted by set, entry point, and name. */
  readonly cases: readonly LibraryComparisonCase[];
  /** Present when the proposer declares the exact cases the revision changes;
   * the verdict passes only when the observed changes equal the declaration. */
  readonly intended?: LibraryIntendedChange;
  readonly verdict: LibraryComparisonVerdict;
};
export type LibraryUnseenCase = {
  readonly name: string;
  /** Calling entry point the case runs through. */
  readonly entry: string;
  /** Run arguments in the `algal run --args` shape: input cell → port → value. */
  readonly args: Readonly<Record<string, Readonly<Record<string, JsonValue>>>>;
  /** Scripted responses in the `algal run --responses` shape. */
  readonly responses?: Readonly<JsonObject>;
  /** Outcome the current program must reach; `complete` when omitted. */
  readonly outcome?: RunOutcome;
};
export type LibraryUnseenCases = {
  /** Digest of the file's canonical JSON: the value a catalog entry pins. */
  readonly digest: Digest;
  readonly cases: readonly LibraryUnseenCase[];
};

function invalid(message: string): never { throw new AlgalError("PARSE_FAILED", message); }
function exceeded(message: string): never { throw new AlgalError("BUDGET_EXHAUSTED", message); }
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const PROGRAM = /^[a-z][a-z0-9_]{0,39}$/;
const OUTCOMES: readonly RunOutcome[] = ["complete", "failed", "stuck", "suspended"];

/** A relative path of plain segments ending in `suffix`, the way the catalog writes paths. */
function plainPath(value: unknown, suffix: string, what: string): string {
  if (typeof value !== "string" || value.length > LIBRARY_COMPARISON_BOUNDS.maxPathLength) return invalid(`${what} must be a path of at most ${LIBRARY_COMPARISON_BOUNDS.maxPathLength} characters`);
  const parts = value.split("/");
  if (!value.endsWith(suffix) || parts.length < 2 || parts.some(part => !SEGMENT.test(part))) invalid(`${what} must be a relative path of plain segments${suffix ? ` ending in ${suffix}` : ""}`);
  return value;
}
function token(value: unknown, what: string): string {
  if (typeof value !== "string" || value.length > LIBRARY_COMPARISON_BOUNDS.maxTokenLength || !TOKEN.test(value)) {
    return invalid(`${what} must be at most ${LIBRARY_COMPARISON_BOUNDS.maxTokenLength} letters, digits, ".", "_", or "-", starting with a letter or digit`);
  }
  return value;
}
function outcome(value: unknown, what: string): RunOutcome {
  if (typeof value !== "string" || !(OUTCOMES as readonly string[]).includes(value)) return invalid(`${what} must be one of ${OUTCOMES.join(", ")}`);
  return value as RunOutcome;
}
function record(value: unknown, keys: readonly string[], what: string): JsonObject {
  const found = asObject(value, what);
  noUnknownKeys(found, keys, what);
  return found;
}
function list<T>(value: unknown, max: number, what: string, parse: (item: unknown, index: number) => T): T[] {
  const items = asArray(value, what);
  if (items.length > max) exceeded(`${what} exceed ${max} entries`);
  return items.map(parse);
}
const nullable = <T,>(value: unknown, parse: (value: unknown) => T): T | null => value === null ? null : parse(value);
function ordered(values: readonly string[], what: string): void {
  for (let index = 1; index < values.length; index++) {
    if (compareUtf8(values[index - 1]!, values[index]!) >= 0) invalid(`${what} must be sorted without repeats`);
  }
}
/** One line of printable text: no control, line-separator, or direction characters. */
function reasonText(value: unknown, what: string): string {
  if (typeof value !== "string" || value.length === 0 || [...value].length > LIBRARY_COMPARISON_BOUNDS.maxReasonLength
    || value.includes("\n") || printableText(value) !== value) {
    return invalid(`${what} must be one line of at most ${LIBRARY_COMPARISON_BOUNDS.maxReasonLength} printable characters`);
  }
  return value;
}

/** The identifier a verdict uses for a case: `set:entry#name`. */
export function libraryCaseId(item: { readonly set: LibraryComparisonSet; readonly entry: string; readonly name: string }): string {
  return `${item.set}:${item.entry}#${item.name}`;
}
const rowOrder = (left: LibraryComparisonCase, right: LibraryComparisonCase): number =>
  compareUtf8(left.set, right.set) || compareUtf8(left.entry, right.entry) || compareUtf8(left.name, right.name);
const moved = (item: LibraryComparisonCase): boolean =>
  item.candidate !== null && (item.candidate.outcome !== item.base.outcome || item.candidate.outputs !== item.base.outputs);

/** Derive a verdict from a comparison's rows. It passes only when the
 * interface is unchanged, unseen cases ran, every calling entry point and
 * dependent entry compiles with the revision, and every case reaches the same
 * outcome with the same outputs under both versions — except that a declared
 * `intended` change authorizes exactly the case identifiers it lists: the
 * observed `changed` list must equal the declaration, no more and no less. */
export function libraryComparisonVerdict(parts: Pick<LibraryComparison, "base" | "candidate" | "unseen" | "dependents" | "callers" | "cases">, intended?: LibraryIntendedChange): LibraryComparisonVerdict {
  const interfaceChanged = parts.base.interface !== parts.candidate.interface;
  const unseenMissing = parts.unseen === null;
  const notCompiled = [...new Set([
    ...parts.callers.filter(item => item.candidate === null).map(item => item.entry),
    ...parts.dependents.filter(item => item.candidate === null).map(item => item.path),
  ])].sort(compareUtf8);
  const changed = parts.cases.filter(moved).map(libraryCaseId);
  const notRun = parts.cases.filter(item => item.candidate === null).map(libraryCaseId);
  const authorized = intended === undefined ? changed.length === 0
    : intended.changed.length === changed.length && intended.changed.every((id, index) => id === changed[index]);
  const passed = !interfaceChanged && !unseenMissing && notCompiled.length === 0 && notRun.length === 0 && authorized;
  return { passed, interfaceChanged, unseenMissing, notCompiled, changed, notRun };
}

function verdictJson(verdict: LibraryComparisonVerdict): JsonObject {
  return {
    passed: verdict.passed, interfaceChanged: verdict.interfaceChanged, unseenMissing: verdict.unseenMissing,
    notCompiled: [...verdict.notCompiled], changed: [...verdict.changed], notRun: [...verdict.notRun],
  };
}
function suppliedVerdict(value: unknown, what: string): JsonObject {
  const found = record(value, ["passed", "interfaceChanged", "unseenMissing", "notCompiled", "changed", "notRun"], what);
  for (const key of ["passed", "interfaceChanged", "unseenMissing"]) {
    if (typeof reqField(found, key, what) !== "boolean") invalid(`${what} ${key} must be true or false`);
  }
  const bound = { notCompiled: LIBRARY_COMPARISON_BOUNDS.maxCallers + LIBRARY_COMPARISON_BOUNDS.maxDependents, changed: LIBRARY_COMPARISON_BOUNDS.maxRows, notRun: LIBRARY_COMPARISON_BOUNDS.maxRows };
  for (const [key, max] of Object.entries(bound)) {
    list(reqField(found, key, what), max, `${what} ${key}`, item => typeof item === "string" ? item : invalid(`${what} ${key} must list text`));
  }
  return found;
}
function result(value: unknown, what: string): LibraryComparisonResult {
  const found = record(value, ["outcome", "outputs"], what);
  return { outcome: outcome(reqField(found, "outcome", what), `${what} outcome`), outputs: asDigest(reqField(found, "outputs", what), `${what} outputs`) };
}
const CASE_ID = /^(pinned|unseen):[A-Za-z0-9_-][A-Za-z0-9_./-]*#[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** Parse an intended-change declaration: a bounded, sorted, unique list of
 * case identifiers (`set:entry#name`) plus one closed reason class. */
export function parseLibraryIntended(value: unknown): LibraryIntendedChange {
  const what = "intended change declaration";
  const found = record(value, ["changed", "reason"], what);
  const changed = list(reqField(found, "changed", what), LIBRARY_COMPARISON_BOUNDS.maxRows, `${what} changed`, (item, index) => {
    if (typeof item !== "string" || item.length > LIBRARY_COMPARISON_BOUNDS.maxPathLength + LIBRARY_COMPARISON_BOUNDS.maxTokenLength + 8 || !CASE_ID.test(item)) {
      invalid(`${what} changed ${index} must be a case identifier "pinned:entry#name" or "unseen:entry#name"`);
    }
    return item;
  });
  if (changed.length === 0) invalid(`${what} must name at least one case`);
  ordered(changed, `${what} changed`);
  const reason = reqField(found, "reason", what);
  if (typeof reason !== "string" || !(LIBRARY_INTENDED_REASONS as readonly string[]).includes(reason)) {
    invalid(`${what} reason must be one of ${LIBRARY_INTENDED_REASONS.join(", ")}`);
  }
  return freezeDeep({ changed, reason: reason as LibraryIntendedReason });
}
function version(value: unknown, what: string): LibraryComparisonVersion {
  const found = record(value, ["digest", "interface"], what);
  return { digest: asDigest(reqField(found, "digest", what), `${what} digest`), interface: asDigest(reqField(found, "interface", what), `${what} interface`) };
}

/** Parse a comparison record strictly: known keys only, bounded lists, path,
 * token, and digest shapes, sorted unique rows, cases that belong to a listed
 * caller and run exactly when that caller's revised closure compiles, pinned
 * rows exactly for callers that name a case list, unseen rows exactly when an
 * unseen file is named, and a verdict equal to the one the rows imply. The
 * result is fresh, frozen data. */
export function parseLibraryComparison(value: unknown): LibraryComparison {
  const what = "library comparison";
  const data = boundedJsonSnapshot(value, LIBRARY_COMPARISON_BOUNDS.record, what);
  const top = record(data, ["contract", "name", "path", "compiler", "runtime", "base", "candidate", "unseen", "dependents", "callers", "cases", "intended", "verdict"], what);
  const field = (key: string): unknown => reqField(top, key, what);
  if (field("contract") !== LIBRARY_COMPARISON_CONTRACT) invalid(`${what}: expected contract "${LIBRARY_COMPARISON_CONTRACT}"`);
  const name = field("name");
  if (typeof name !== "string" || !PROGRAM.test(name)) invalid(`${what} name must be a program name`);
  const path = plainPath(field("path"), ".algal", `${what} path`);
  const compilerRecord = record(field("compiler"), ["profile", "version"], `${what} compiler`);
  const compiler = {
    profile: token(reqField(compilerRecord, "profile", `${what} compiler`), `${what} compiler profile`),
    version: token(reqField(compilerRecord, "version", `${what} compiler`), `${what} compiler version`),
  };
  const runtime = token(field("runtime"), `${what} runtime`);
  const base = version(field("base"), `${what} base`);
  const candidate = version(field("candidate"), `${what} candidate`);
  if (base.digest === candidate.digest) invalid(`${what}: base and candidate must be different programs`);
  const unseen = nullable(field("unseen"), item => asDigest(item, `${what} unseen`));

  const dependents = list(field("dependents"), LIBRARY_COMPARISON_BOUNDS.maxDependents, `${what} dependents`, (item, index): LibraryComparisonDependent => {
    const label = `${what} dependent ${index}`;
    const found = record(item, ["path", "base", "candidate"], label);
    return {
      path: plainPath(reqField(found, "path", label), ".algal", `${label} path`), base: asDigest(reqField(found, "base", label), `${label} base`),
      candidate: nullable(reqField(found, "candidate", label), digest => asDigest(digest, `${label} candidate`)),
    };
  });
  ordered(dependents.map(item => item.path), `${what} dependents`);
  if (dependents.some(item => item.path === path)) invalid(`${what}: the revised program cannot be its own dependent`);

  const callers = list(field("callers"), LIBRARY_COMPARISON_BOUNDS.maxCallers, `${what} callers`, (item, index): LibraryComparisonCaller => {
    const label = `${what} caller ${index}`;
    const found = record(item, ["entry", "root", "cases", "base", "candidate", "reason"], label);
    const cases = nullable(reqField(found, "cases", label), pin => {
      const cased = record(pin, ["path", "digest"], `${label} cases`);
      return { path: plainPath(reqField(cased, "path", `${label} cases`), ".json", `${label} cases path`), digest: asDigest(reqField(cased, "digest", `${label} cases`), `${label} cases digest`) };
    });
    const baseDigest = asDigest(reqField(found, "base", label), `${label} base`);
    const candidateDigest = nullable(reqField(found, "candidate", label), digest => asDigest(digest, `${label} candidate`));
    const reason = optField(found, "reason");
    if ((candidateDigest === null) !== (reason !== undefined)) invalid(`${label} has a reason exactly when it did not compile or run with the revision`);
    if (candidateDigest === baseDigest) invalid(`${label}: a caller of the revised file compiles to a new digest`);
    return {
      entry: plainPath(reqField(found, "entry", label), ".algal", `${label} entry`), root: plainPath(reqField(found, "root", label), "", `${label} root`),
      cases, base: baseDigest, candidate: candidateDigest, ...(reason === undefined ? {} : { reason: reasonText(reason, `${label} reason`) }),
    };
  });
  if (callers.length === 0) invalid(`${what} must name at least one caller`);
  ordered(callers.map(item => item.entry), `${what} callers`);
  const byEntry = new Map(callers.map(item => [item.entry, item]));

  const cases = list(field("cases"), LIBRARY_COMPARISON_BOUNDS.maxRows, `${what} cases`, (item, index): LibraryComparisonCase => {
    const label = `${what} case ${index}`;
    const found = record(item, ["set", "entry", "name", "args", "responses", "base", "candidate"], label);
    const set = reqField(found, "set", label);
    if (set !== "pinned" && set !== "unseen") return invalid(`${label} set must be pinned or unseen`);
    const entry = plainPath(reqField(found, "entry", label), ".algal", `${label} entry`);
    const caller = byEntry.get(entry) ?? invalid(`${label} runs through ${entry}, which is not a listed caller`);
    const args = optField(found, "args"), responses = optField(found, "responses");
    if (set === "unseen" && (args !== undefined || responses !== undefined)) invalid(`${label}: an unseen case records no input digests`);
    if (set === "pinned" && args === undefined) invalid(`${label} requires "args"`);
    const candidateResult = nullable(reqField(found, "candidate", label), outcomeRecord => result(outcomeRecord, `${label} candidate`));
    if ((candidateResult === null) !== (caller.candidate === null)) invalid(`${label} runs exactly when its caller compiles with the revision`);
    return {
      set, entry, name: token(reqField(found, "name", label), `${label} name`),
      ...(args === undefined ? {} : { args: asDigest(args, `${label} args`) }),
      ...(responses === undefined ? {} : { responses: asDigest(responses, `${label} responses`) }),
      base: result(reqField(found, "base", label), `${label} base`), candidate: candidateResult,
    };
  });
  for (let index = 1; index < cases.length; index++) {
    if (rowOrder(cases[index - 1]!, cases[index]!) >= 0) invalid(`${what} cases must be sorted by set, entry point, and name without repeats`);
  }
  for (const caller of callers) {
    const pinned = cases.filter(item => item.set === "pinned" && item.entry === caller.entry).length;
    if ((caller.cases === null) !== (pinned === 0)) invalid(`${what} caller ${caller.entry} has pinned cases exactly when it names a case list`);
    if (pinned > CASES) exceeded(`${what} caller ${caller.entry} exceeds ${CASES} pinned cases`);
  }
  const unseenRows = cases.filter(item => item.set === "unseen").length;
  if ((unseen === null) !== (unseenRows === 0)) invalid(`${what} has unseen cases exactly when it names an unseen case file`);
  if (unseenRows > CASES) exceeded(`${what} exceeds ${CASES} unseen cases`);

  const declared = optField(top, "intended");
  const intended = declared === undefined ? undefined : parseLibraryIntended(declared);
  const parts = { base, candidate, unseen, dependents, callers, cases };
  const verdict = libraryComparisonVerdict(parts, intended);
  if (canonicalize(suppliedVerdict(field("verdict"), `${what} verdict`)) !== canonicalize(verdictJson(verdict))) {
    invalid(`${what}: the verdict does not follow from the recorded interfaces, programs, cases, and declaration`);
  }
  return freezeDeep({ contract: LIBRARY_COMPARISON_CONTRACT, name: name as string, path, compiler, runtime, ...parts, ...(intended === undefined ? {} : { intended }), verdict });
}

export function libraryComparisonToJson(comparison: LibraryComparison): JsonObject {
  const outcomeJson = (item: LibraryComparisonResult): JsonObject => ({ outcome: item.outcome, outputs: item.outputs });
  return {
    contract: comparison.contract, name: comparison.name, path: comparison.path,
    compiler: { profile: comparison.compiler.profile, version: comparison.compiler.version }, runtime: comparison.runtime,
    base: { digest: comparison.base.digest, interface: comparison.base.interface },
    candidate: { digest: comparison.candidate.digest, interface: comparison.candidate.interface },
    unseen: comparison.unseen,
    dependents: comparison.dependents.map(item => ({ path: item.path, base: item.base, candidate: item.candidate })),
    callers: comparison.callers.map(item => ({
      entry: item.entry, root: item.root, cases: item.cases === null ? null : { path: item.cases.path, digest: item.cases.digest },
      base: item.base, candidate: item.candidate, ...(item.reason === undefined ? {} : { reason: item.reason }),
    })),
    cases: comparison.cases.map(item => ({
      set: item.set, entry: item.entry, name: item.name,
      ...(item.args === undefined ? {} : { args: item.args }), ...(item.responses === undefined ? {} : { responses: item.responses }),
      base: outcomeJson(item.base), candidate: item.candidate === null ? null : outcomeJson(item.candidate),
    })),
    ...(comparison.intended === undefined ? {} : { intended: { changed: [...comparison.intended.changed], reason: comparison.intended.reason } }),
    verdict: verdictJson(comparison.verdict),
  };
}

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? "" : "s"}`;
const line = (text: string): string => printableText(text.replaceAll("\n", " "));

/** A short text report of a comparison: versions, interface, callers, and
 * every changed or unrun case. */
export function renderLibraryComparison(comparison: LibraryComparison): string {
  const { verdict } = comparison;
  const lines = [
    `ALGAL library comparison · ${verdict.passed ? "passed" : "failed"} · ${line(comparison.name)} (${line(comparison.path)})`,
    `Current ${comparison.base.digest}`,
    `Revision ${comparison.candidate.digest}`,
    verdict.interfaceChanged ? `Interface changed: ${comparison.base.interface} to ${comparison.candidate.interface}.` : "Interface unchanged.",
    comparison.unseen === null ? "Unseen cases: none pinned, so the comparison cannot pass." : `Unseen cases: ${comparison.unseen}`,
  ];
  for (const item of comparison.dependents) {
    lines.push(`Dependent ${line(item.path)}: ${item.candidate === null ? "does not compile with the revision" : `${item.base} to ${item.candidate}`}`);
  }
  for (const item of comparison.callers) {
    const count = (set: LibraryComparisonSet) => comparison.cases.filter(row => row.set === set && row.entry === item.entry).length;
    const state = item.candidate === null ? `does not run with the revision (${line(item.reason ?? "")})` : "runs with the revision";
    lines.push(`Caller ${line(item.entry)}: ${plural(count("pinned"), "pinned case")}, ${plural(count("unseen"), "unseen case")}; ${state}`);
  }
  if (comparison.intended !== undefined) {
    lines.push(`Intended change: ${comparison.intended.reason} · declares ${plural(comparison.intended.changed.length, "case")}`);
  }
  lines.push(`Cases: ${comparison.cases.length - verdict.notRun.length} of ${comparison.cases.length} ran; ${verdict.changed.length} changed.`);
  const declared = new Set(comparison.intended?.changed ?? []);
  for (const item of comparison.cases.filter(moved)) {
    lines.push(`  changed ${line(libraryCaseId(item))}: ${item.base.outcome} ${item.base.outputs} to ${item.candidate!.outcome} ${item.candidate!.outputs}${declared.has(libraryCaseId(item)) ? " · declared" : ""}`);
  }
  for (const id of verdict.notRun) lines.push(`  not run ${line(id)}`);
  return `${lines.join("\n")}\n`;
}

/** Parse an unseen case file: one to 16 uniquely named cases, each naming a
 * calling entry point, its run arguments, optional scripted responses, and
 * the outcome the current program must reach. The digest covers the file's
 * canonical JSON, so formatting does not change it. */
export function parseLibraryUnseenCases(value: unknown): LibraryUnseenCases {
  const what = "unseen cases";
  const data = boundedJsonSnapshot(value, LIBRARY_COMPARISON_BOUNDS.unseen, what);
  const top = record(data, ["contract", "cases"], what);
  if (reqField(top, "contract", what) !== LIBRARY_UNSEEN_CASES_CONTRACT) invalid(`${what}: expected contract "${LIBRARY_UNSEEN_CASES_CONTRACT}"`);
  const items = asArray(reqField(top, "cases", what), `${what} list`);
  if (items.length === 0) invalid(`${what} must name at least one case`);
  if (items.length > CASES) exceeded(`${what} exceed ${CASES} cases`);
  const names = new Set<string>();
  const cases = items.map((item, index): LibraryUnseenCase => {
    const label = `unseen case ${index}`;
    const found = record(item, ["name", "entry", "args", "responses", "outcome"], label);
    const name = token(reqField(found, "name", label), `${label} name`);
    if (names.has(name)) invalid(`unseen case names must be unique: ${name}`);
    names.add(name);
    const args = asObject(reqField(found, "args", label), `${label} args`);
    for (const cell of Object.values(args)) asObject(cell, `${label} args input cell`);
    const responses = optField(found, "responses");
    const expected = optField(found, "outcome");
    return {
      name, entry: plainPath(reqField(found, "entry", label), ".algal", `${label} entry`),
      args: args as Record<string, Record<string, JsonValue>>,
      ...(responses === undefined ? {} : { responses: asObject(responses, `${label} responses`) }),
      ...(expected === undefined ? {} : { outcome: outcome(expected, `${label} outcome`) }),
    };
  });
  return freezeDeep({ digest: digestCanonical(data), cases });
}
