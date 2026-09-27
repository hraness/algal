/** Cumulative-skill experiment arm-runner: host tooling that runs one bounded
 * task set through one arm configuration and records everything in the store.
 * The four arms share one code path and differ only in which hooks the arm
 * kind enables:
 *
 * - `retained`: a catalog-consult hook before each task (the last kept
 *   procedure matching the arm's declared family signature runs again, its
 *   manifest digest-resolved through the store) and a promote hook after each
 *   task (the program is evaluated through the ordinary foundry path on the
 *   arm's declared train/validation cases — holdout cases are declared but
 *   never run — and a candidate that passes every validation case is added to
 *   the catalog with its recorded cases).
 * - `ablation`: identical machinery with both hooks disabled. Every task
 *   generates and runs fresh under the same budget.
 * - `fresh`: one generation produces a manifest per task; no consult, no
 *   evaluation loop, no catalog writes.
 * - `fixed`: one declared manifest runs every task.
 * - `optimizer`: the retained arms' consult-and-promote path plus three
 *   revision triggers on a consulted entry — the hit run failing, the hit
 *   run's outputs failing the task's declared `expect` under the arm's
 *   scorer (or canonical equality), and the entry going stale past
 *   `requalifyAfter` tasks and losing its re-qualification. A retired entry
 *   stops matching `consult`; the declared `reviser` generator receives the
 *   task spec, the kept manifest, and a bounded evidence record, and its
 *   emitted manifest is evaluated on the same cases — a passing revision
 *   joins the catalog carrying `supersedes` back to the retired entry.
 *   Revision repairs the catalog, not the task that tripped it: the task's
 *   run record stands, later tasks consult the revised entry.
 *
 * Every run — generation, the task itself, and promotion evaluation — is an
 * ordinary `runOrganism` run with an ordinary receipt, admitted through the
 * arm's own `algal.habitat-budget.v1` account (activity `experiment`), so
 * generation, evaluation, promotion, and task runs all charge to the same
 * account. The first refused reservation is terminal: it is recorded on the
 * account and on the run record, and the session ends `exhausted` rather than
 * aborting.
 *
 * Records: one bounded `algal.experiment-run.v1` per task, one
 * `algal.experiment-catalog.v1` per session (the kept-procedure list), and one
 * `algal.experiment-session.v1` per arm joining them. All are closed,
 * digest-bearing, and carry no wall-clock values. */
import { parseOrganismManifest, type OrganismManifest } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";
import { evalScorer, parseExprScorer, type ExprScorer } from "./expr";
import { evaluateFoundryPopulation, FOUNDRY_BOUNDS, type FoundryCase } from "./foundry";
import {
  HabitatAccount,
  parseHabitatLimits,
  type HabitatLedger,
  type HabitatLimits,
} from "./habitat-budget";
import type { FnRegistry } from "./registry";
import type { RunOutcome, RunReceipt } from "./run";
import { runOrganism } from "./run";
import { boundedJsonSnapshot } from "./source-dependencies";
import type { Store } from "./store-contract";
import type { Transport } from "./transport-contract";
import type { ToolRegistry } from "./tools";
import {
  asInt,
  asObject,
  noUnknownKeys,
  type JsonValue,
} from "./values";

export const EXPERIMENT_ARM_CONTRACT = "algal.experiment-arm.v1" as const;
export const EXPERIMENT_TASKS_CONTRACT = "algal.experiment-tasks.v1" as const;
export const EXPERIMENT_CATALOG_CONTRACT = "algal.experiment-catalog.v1" as const;
export const EXPERIMENT_RUN_CONTRACT = "algal.experiment-run.v1" as const;
export const EXPERIMENT_SESSION_CONTRACT = "algal.experiment-session.v1" as const;

export const EXPERIMENT_BOUNDS = Object.freeze({
  /** Tasks in one set; the pre-registered study uses 20. */
  maxTasks: 64,
  maxTaskIdLength: 128,
  maxFamilyLength: 64,
  /** Kept procedures in one catalog. */
  maxCatalogEntries: 32,
  /** Promotion-evaluation cases; the foundry case bound. */
  maxCases: FOUNDRY_BOUNDS.maxCases,
  /** Recorded failure message length. */
  maxFailureLength: 512,
  /** Operator corrections one task may declare and one run record may carry. */
  maxCorrections: 32,
  /** A correction's `kind` label length. */
  maxCorrectionKindLength: 64,
  /** Repair kinds one normalization pass may record on a run's generator. */
  maxRepairs: 8,
  /** A correction's `note` length. */
  maxCorrectionNoteLength: 512,
  /** Snapshot limits for a task's opaque `spec` or one argument value. */
  spec: Object.freeze({ maxBytes: 65_536, maxDepth: 32, maxNodes: 16_384, maxEntries: 16_384, maxStringBytes: 65_536 }),
  /** Snapshot limits for a foreign record value. */
  record: Object.freeze({ maxBytes: 262_144, maxDepth: 8, maxNodes: 8_192, maxEntries: 4_096, maxStringBytes: 4_096 }),
});

export const EXPERIMENT_ARMS = ["retained", "ablation", "fresh", "fixed", "optimizer"] as const;
export type ExperimentArmKind = (typeof EXPERIMENT_ARMS)[number];
export const EXPERIMENT_PHASES = ["acquisition", "unseen", "shift"] as const;
export type ExperimentPhase = (typeof EXPERIMENT_PHASES)[number];

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", `experiment: ${message}`);
}

/** Closed record: unknown keys rejected, every listed field required. Optional
 * fields are not listed — callers read them through `opt` after the shape
 * check and parse them when present. */
function closed(value: unknown, required: readonly string[], optional: readonly string[], at: string): Record<string, unknown> {
  const object = asObject(value, `experiment ${at}`);
  noUnknownKeys(object, [...required, ...optional], `experiment ${at}`);
  for (const key of required) {
    if (!Object.hasOwn(object, key)) fail(`${at} is missing "${key}"`);
  }
  return object;
}

function opt(object: Record<string, unknown>, key: string): { present: boolean; value: unknown } {
  return Object.hasOwn(object, key) ? { present: true, value: object[key] } : { present: false, value: undefined };
}

function count(value: unknown, min: number, max: number, at: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    fail(`${at} must be an integer in ${min}..${max}`);
  }
  return value;
}

function reference(value: unknown, at: string): Digest {
  return asDigest(value, `experiment ${at}`);
}

function nullableRef(value: unknown, at: string): Digest | null {
  return value === null ? null : reference(value, at);
}

function label(value: unknown, at: string, max: number = EXPERIMENT_BOUNDS.maxTaskIdLength): string {
  if (typeof value !== "string" || value.length === 0 || value.length > max || [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) {
    fail(`${at} must be a printable string of 1..${max} characters`);
  }
  return value;
}

function armKind(value: unknown, at: string): ExperimentArmKind {
  if (!(EXPERIMENT_ARMS as readonly unknown[]).includes(value)) fail(`${at} must be one of ${EXPERIMENT_ARMS.join(", ")}`);
  return value as ExperimentArmKind;
}

function phase(value: unknown, at: string): ExperimentPhase {
  if (!(EXPERIMENT_PHASES as readonly unknown[]).includes(value)) fail(`${at} must be one of ${EXPERIMENT_PHASES.join(", ")}`);
  return value as ExperimentPhase;
}

/** One explicit human/operator intervention in a run — an operator-edited
 * manifest or spec, a manually corrected label, a hand-supplied hint. `kind`
 * is a short label for the intervention; `note` says what was done. */
export type ExperimentCorrection = { kind: string; note: string };

/** A bounded non-empty correction list. Absence is the honest "none recorded"
 * signal, so a present list must carry at least one entry. */
function parseCorrections(value: unknown, at: string): ExperimentCorrection[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > EXPERIMENT_BOUNDS.maxCorrections) {
    fail(`${at} must list 1..${EXPERIMENT_BOUNDS.maxCorrections} entries`);
  }
  return value.map((entry, i) => {
    const c = closed(entry, ["kind", "note"], [], `${at}[${i}]`);
    return {
      kind: label(c.kind, `${at}[${i}].kind`, EXPERIMENT_BOUNDS.maxCorrectionKindLength),
      note: label(c.note, `${at}[${i}].note`, EXPERIMENT_BOUNDS.maxCorrectionNoteLength),
    };
  });
}

/** A bounded named-value map (task args, case args, expectations). */
function valueMap(value: unknown, at: string): Record<string, JsonValue> {
  const object = asObject(boundedJsonSnapshot(value, EXPERIMENT_BOUNDS.spec, at), `experiment ${at}`);
  const out: Record<string, JsonValue> = {};
  for (const [name, item] of Object.entries(object)) {
    if (name.length === 0 || name.length > EXPERIMENT_BOUNDS.maxTaskIdLength) fail(`${at} has an over-long key`);
    out[name] = item;
  }
  return out;
}

// ------------------------------------------------------------ task spec ---

/** The runner's minimal task record: `spec` is the opaque task description the
 * generation path receives (bounded JSON, shape owned by the task set), and
 * `args` is the interface-input-keyed argument map both the consult-hit and
 * generation paths map through the executed manifest's interface. */
export type ExperimentTask = {
  taskId: string;
  phase: ExperimentPhase;
  spec: JsonValue;
  args: Record<string, JsonValue>;
  /** Interface-output-keyed expectations the optimizer arm grades a catalog
   * hit's outputs against — under `arm.scorer` when declared, else canonical
   * equality. A miss triggers revision. Other arm kinds ignore it. */
  expect?: Record<string, JsonValue>;
  /** Operator interventions declared for this task; the runner records them
   * on the run record it writes. Absent means none were recorded — the
   * measure counts what was declared, not zero by default. */
  corrections?: ExperimentCorrection[];
};

export type ExperimentTaskSet = {
  contract: typeof EXPERIMENT_TASKS_CONTRACT;
  tasks: ExperimentTask[];
};

export function parseExperimentTask(value: unknown, at = "task"): ExperimentTask {
  const raw = asObject(value, `experiment ${at}`);
  // `spec` and `args` carry task data that nests legitimately past the shared
  // record depth; each re-parses under the deeper `spec` bound.
  const shallow: Record<string, unknown> = { ...raw };
  for (const key of ["spec", "args", "expect"] as const) {
    if (Object.hasOwn(shallow, key)) shallow[key] = true;
  }
  const v = closed(boundedJsonSnapshot(shallow, EXPERIMENT_BOUNDS.record, at), ["taskId", "phase", "spec", "args"], ["corrections", "expect"], at);
  const task: ExperimentTask = {
    taskId: label(v.taskId, `${at}.taskId`),
    phase: phase(v.phase, `${at}.phase`),
    spec: boundedJsonSnapshot(raw.spec, EXPERIMENT_BOUNDS.spec, `${at}.spec`),
    args: valueMap(raw.args, `${at}.args`),
  };
  const corrections = opt(v, "corrections");
  if (corrections.present) task.corrections = parseCorrections(corrections.value, `${at}.corrections`);
  const expect = opt(v, "expect");
  if (expect.present) task.expect = valueMap(expect.value, `${at}.expect`);
  return task;
}

export function parseExperimentTaskSet(value: unknown): ExperimentTaskSet {
  const raw = asObject(value, "experiment task set");
  const shallow: Record<string, unknown> = { ...raw };
  if (Object.hasOwn(shallow, "tasks")) shallow.tasks = true;
  const v = closed(boundedJsonSnapshot(shallow, EXPERIMENT_BOUNDS.record, "task set"), ["contract", "tasks"], [], "task set");
  if (v.contract !== EXPERIMENT_TASKS_CONTRACT) fail(`contract must be ${EXPERIMENT_TASKS_CONTRACT}`);
  if (!Array.isArray(raw.tasks) || raw.tasks.length === 0 || raw.tasks.length > EXPERIMENT_BOUNDS.maxTasks) {
    fail(`tasks must list 1..${EXPERIMENT_BOUNDS.maxTasks} entries`);
  }
  const ids = new Set<string>();
  const tasks = raw.tasks.map((entry, i) => {
    const task = parseExperimentTask(entry, `tasks[${i}]`);
    if (ids.has(task.taskId)) fail(`tasks[${i}] repeats taskId "${task.taskId}"`);
    ids.add(task.taskId);
    return task;
  });
  return { contract: EXPERIMENT_TASKS_CONTRACT, tasks };
}

// ------------------------------------------------------------ arm config ---

/** The generation manifest a non-fixed arm runs per task: its interface input
 * `task` receives the task's `spec`, and the declared interface output emits
 * one complete manifest (with `field` selecting it from an object output). */
export type ExperimentGenerator = {
  manifest: OrganismManifest;
  output: string;
  field?: string;
  /** Extra interface-input-keyed arguments merged beside `task`. */
  args?: Record<string, JsonValue>;
};

export type ExperimentArm = {
  contract: typeof EXPERIMENT_ARM_CONTRACT;
  arm: ExperimentArmKind;
  /** Family signature the consult hook matches catalog entries against. */
  family: string;
  /** The arm's own habitat account ceilings; every run charges to it. */
  budget: HabitatLimits;
  /** Required for retained, ablation, and fresh. */
  generator?: ExperimentGenerator;
  /** Required for fixed: the declared manifest every task runs. */
  manifest?: OrganismManifest;
  /** Required for retained: train/validation/holdout cases the promote hook
   * evaluates through the foundry path (holdout is declared but never run). */
  cases?: FoundryCase[];
  scorer?: ExprScorer;
  /** Catalog bound; defaults to `maxCatalogEntries`. */
  maxEntries?: number;
  /** Retained only: when true, a task that ran an already-kept manifest
   * re-cites the entry's stored promotion evidence instead of re-evaluating
   * it, so a catalog hit charges the task run alone. */
  citeKeptEvaluation?: boolean;
  /** Optimizer only: the revision generator run when a consulted entry
   * trips a trigger. Its interface input `task` receives the task's `spec`
   * like the primary generator, and may additionally declare `kept` (the
   * consulted manifest's JSON) and `evidence` (a bounded record naming the
   * trigger, the task, and the run's outcome) — undeclared inputs are simply
   * not delivered. */
  reviser?: ExperimentGenerator;
  /** Optimizer only: tasks a consulted entry may cite its stored promotion
   * evidence for before it is re-evaluated on the declared cases — the
   * staleness window in task ordinals. */
  requalifyAfter?: number;
  /** Generative arms only: when true, an emitted value that fails
   * `parseOrganismManifest` is passed through the bounded deterministic
   * repairs (`normalizeEmittedManifest`) and parsed again; applied repairs
   * land on the run record's `generator.normalized`. */
  normalizeEmitted?: boolean;
};

function parseGenerator(value: unknown, at: string): ExperimentGenerator {
  const raw = asObject(value, `experiment ${at}`);
  const shallow: Record<string, unknown> = { ...raw };
  for (const key of ["manifest", "args"] as const) {
    if (Object.hasOwn(shallow, key)) shallow[key] = true;
  }
  const v = closed(boundedJsonSnapshot(shallow, EXPERIMENT_BOUNDS.record, at), ["manifest", "output"], ["field", "args"], at);
  const generator: ExperimentGenerator = {
    manifest: parseOrganismManifest(raw.manifest),
    output: label(v.output, `${at}.output`, EXPERIMENT_BOUNDS.maxFamilyLength),
  };
  const field = opt(v, "field");
  if (field.present) generator.field = label(field.value, `${at}.field`, EXPERIMENT_BOUNDS.maxFamilyLength);
  if (raw.args !== undefined) generator.args = valueMap(raw.args, `${at}.args`);
  return generator;
}

function parseFoundryCase(value: unknown, at: string): FoundryCase {
  const v = closed(boundedJsonSnapshot(value, EXPERIMENT_BOUNDS.record, at), ["id", "split", "args", "expect"], [], at);
  if (v.split !== "train" && v.split !== "validation" && v.split !== "holdout") fail(`${at}.split must be train, validation, or holdout`);
  return {
    id: label(v.id, `${at}.id`, FOUNDRY_BOUNDS.maxCaseIdLen),
    split: v.split,
    args: valueMap(v.args, `${at}.args`),
    expect: valueMap(v.expect, `${at}.expect`),
  };
}

/** Parse a closed `algal.experiment-arm.v1` record. Manifests arrive as inline
 * manifest JSON; a caller that reads paths resolves them before parsing. */
export function parseExperimentArm(value: unknown): ExperimentArm {
  const raw = asObject(value, "experiment arm");
  // Manifest, generator, case, and scorer subtrees carry their own bounds
  // (organism manifests legitimately nest past the shared record depth), so
  // the shared snapshot only checks this record's own shape.
  const shallow: Record<string, unknown> = { ...raw };
  for (const key of ["generator", "manifest", "cases", "scorer", "reviser"] as const) {
    if (Object.hasOwn(shallow, key)) shallow[key] = true;
  }
  const v = closed(boundedJsonSnapshot(shallow, EXPERIMENT_BOUNDS.record, "arm"), ["contract", "arm", "family", "budget"], ["generator", "manifest", "cases", "scorer", "maxEntries", "citeKeptEvaluation", "normalizeEmitted", "reviser", "requalifyAfter"], "arm");
  if (v.contract !== EXPERIMENT_ARM_CONTRACT) fail(`contract must be ${EXPERIMENT_ARM_CONTRACT}`);
  const arm: ExperimentArm = {
    contract: EXPERIMENT_ARM_CONTRACT,
    arm: armKind(v.arm, "arm.arm"),
    family: label(v.family, "arm.family", EXPERIMENT_BOUNDS.maxFamilyLength),
    budget: parseHabitatLimits(v.budget),
  };
  if (raw.generator !== undefined) arm.generator = parseGenerator(raw.generator, "arm.generator");
  if (raw.manifest !== undefined) arm.manifest = parseOrganismManifest(raw.manifest);
  if (raw.cases !== undefined) {
    if (!Array.isArray(raw.cases) || raw.cases.length === 0 || raw.cases.length > EXPERIMENT_BOUNDS.maxCases) {
      fail(`arm.cases must list 1..${EXPERIMENT_BOUNDS.maxCases} entries`);
    }
    arm.cases = raw.cases.map((entry, i) => parseFoundryCase(entry, `arm.cases[${i}]`));
  }
  if (raw.scorer !== undefined) arm.scorer = parseExprScorer(raw.scorer, "arm.scorer");
  const maxEntries = opt(v, "maxEntries");
  if (maxEntries.present) arm.maxEntries = asInt(maxEntries.value, "arm.maxEntries", 1, EXPERIMENT_BOUNDS.maxCatalogEntries);
  const citeKeptEvaluation = opt(v, "citeKeptEvaluation");
  if (citeKeptEvaluation.present) {
    if (typeof citeKeptEvaluation.value !== "boolean") fail("arm.citeKeptEvaluation must be boolean");
    arm.citeKeptEvaluation = citeKeptEvaluation.value;
  }
  const normalizeEmitted = opt(v, "normalizeEmitted");
  if (normalizeEmitted.present) {
    if (typeof normalizeEmitted.value !== "boolean") fail("arm.normalizeEmitted must be boolean");
    arm.normalizeEmitted = normalizeEmitted.value;
  }
  if (raw.reviser !== undefined) arm.reviser = parseGenerator(raw.reviser, "arm.reviser");
  const requalifyAfter = opt(v, "requalifyAfter");
  if (requalifyAfter.present) {
    arm.requalifyAfter = asInt(requalifyAfter.value, "arm.requalifyAfter", 1, EXPERIMENT_BOUNDS.maxTasks);
  }

  const generatorInterface = (generator: ExperimentGenerator, at: string): void => {
    const iface = generator.manifest.interface;
    if (iface === undefined) fail(`${at} must declare an interface`);
    if (iface.inputs.task === undefined) fail(`${at} needs a "task" interface input`);
    if (iface.outputs[generator.output] === undefined) {
      fail(`${at} has no interface output "${generator.output}"`);
    }
    for (const name of Object.keys(generator.args ?? {})) {
      if (iface.inputs[name] === undefined) fail(`${at}.args names unknown interface input "${name}"`);
    }
  };

  if (arm.arm === "fixed") {
    if (arm.manifest === undefined) fail("a fixed arm requires manifest");
    if (arm.generator !== undefined) fail("a fixed arm declares no generator");
    if (arm.normalizeEmitted !== undefined) fail("a fixed arm declares no normalizeEmitted");
  } else {
    if (arm.manifest !== undefined) fail(`a ${arm.arm} arm declares no manifest`);
    if (arm.generator === undefined) fail(`a ${arm.arm} arm requires a generator`);
    generatorInterface(arm.generator, `a ${arm.arm} generator`);
  }
  if (arm.arm === "retained" || arm.arm === "optimizer") {
    if (arm.cases === undefined) fail(`a ${arm.arm} arm requires promotion cases`);
    for (const split of ["train", "validation", "holdout"] as const) {
      if (!arm.cases.some(c => c.split === split)) fail(`a ${arm.arm} arm needs at least one ${split} case`);
    }
  } else {
    if (arm.cases !== undefined) fail(`a ${arm.arm} arm declares no cases`);
    if (arm.scorer !== undefined) fail(`a ${arm.arm} arm declares no scorer`);
  }
  if (arm.arm === "optimizer") {
    if (arm.citeKeptEvaluation !== undefined) {
      fail("an optimizer arm declares no citeKeptEvaluation — hits cite within the requalifyAfter window by construction");
    }
    if (arm.reviser === undefined) fail("an optimizer arm requires a reviser");
    if (arm.requalifyAfter === undefined) fail("an optimizer arm requires requalifyAfter");
    generatorInterface(arm.reviser, "an optimizer reviser");
  } else {
    if (arm.citeKeptEvaluation !== undefined && arm.arm !== "retained") {
      fail(`a ${arm.arm} arm declares no citeKeptEvaluation`);
    }
    if (arm.reviser !== undefined) fail(`a ${arm.arm} arm declares no reviser`);
    if (arm.requalifyAfter !== undefined) fail(`a ${arm.arm} arm declares no requalifyAfter`);
  }
  return arm;
}

// --------------------------------------------------------------- catalog ---

/** One kept procedure: the manifest that qualified, the interface and cases it
 * qualified under, and the stored evaluation that promoted it. */
export type ExperimentCatalogEntry = {
  family: string;
  manifest: Digest;
  interfaceDigest: Digest | null;
  cases: { id: string; split: "train" | "validation" }[];
  /** Digest of the stored promotion-evaluation evidence value. */
  report: Digest;
  taskId: string;
  /** Set when an optimizer arm's re-qualification or failed hit retired the
   * entry: the digest of the evaluation report that demoted it. A retired
   * entry stays in the record but no longer matches `consult`. */
  retired?: Digest;
  /** Set when this entry was promoted by a revision: the catalog index of
   * the retired entry it replaced. */
  supersedes?: number;
};

export type ExperimentCatalog = {
  contract: typeof EXPERIMENT_CATALOG_CONTRACT;
  entries: ExperimentCatalogEntry[];
};

function parseCatalogCase(value: unknown, at: string): ExperimentCatalogEntry["cases"][number] {
  const v = closed(value, ["id", "split"], [], at);
  if (v.split !== "train" && v.split !== "validation") fail(`${at}.split must be train or validation`);
  return { id: label(v.id, `${at}.id`, FOUNDRY_BOUNDS.maxCaseIdLen), split: v.split };
}

function parseCatalogEntry(value: unknown, at: string): ExperimentCatalogEntry {
  const v = closed(value, ["family", "manifest", "interfaceDigest", "cases", "report", "taskId"], ["retired", "supersedes"], at);
  if (!Array.isArray(v.cases) || v.cases.length === 0 || v.cases.length > EXPERIMENT_BOUNDS.maxCases) fail(`${at}.cases must list 1..${EXPERIMENT_BOUNDS.maxCases} entries`);
  const entry: ExperimentCatalogEntry = {
    family: label(v.family, `${at}.family`, EXPERIMENT_BOUNDS.maxFamilyLength),
    manifest: reference(v.manifest, `${at}.manifest`),
    interfaceDigest: nullableRef(v.interfaceDigest, `${at}.interfaceDigest`),
    cases: v.cases.map((raw, i) => parseCatalogCase(raw, `${at}.cases[${i}]`)),
    report: reference(v.report, `${at}.report`),
    taskId: label(v.taskId, `${at}.taskId`),
  };
  const retired = opt(v, "retired");
  if (retired.present) entry.retired = reference(retired.value, `${at}.retired`);
  const supersedes = opt(v, "supersedes");
  if (supersedes.present) entry.supersedes = count(supersedes.value, 0, EXPERIMENT_BOUNDS.maxCatalogEntries - 1, `${at}.supersedes`);
  return entry;
}

export function parseExperimentCatalog(value: unknown): ExperimentCatalog {
  const v = closed(boundedJsonSnapshot(value, EXPERIMENT_BOUNDS.record, "catalog"), ["contract", "entries"], [], "catalog");
  if (v.contract !== EXPERIMENT_CATALOG_CONTRACT) fail(`contract must be ${EXPERIMENT_CATALOG_CONTRACT}`);
  if (!Array.isArray(v.entries) || v.entries.length > EXPERIMENT_BOUNDS.maxCatalogEntries) fail(`entries must list at most ${EXPERIMENT_BOUNDS.maxCatalogEntries}`);
  return { contract: EXPERIMENT_CATALOG_CONTRACT, entries: v.entries.map((raw, i) => parseCatalogEntry(raw, `entries[${i}]`)) };
}

/** The session's kept-procedure list. `consult` is a pure lookup by declared
 * family signature — the last promoted entry wins, matching "reuse or
 * deliberately revise a kept procedure" recency — and `add` appends a new
 * entry once the promote hook's candidate passes every validation case. */
export class ExperimentCatalogState {
  readonly #entries: ExperimentCatalogEntry[];
  readonly #maxEntries: number;

  constructor(seed: readonly ExperimentCatalogEntry[] = [], maxEntries: number = EXPERIMENT_BOUNDS.maxCatalogEntries) {
    this.#maxEntries = asInt(maxEntries, "maxEntries", 1, EXPERIMENT_BOUNDS.maxCatalogEntries);
    if (seed.length > this.#maxEntries) fail(`catalog seed exceeds ${this.#maxEntries} entries`);
    this.#entries = [...seed];
  }

  get entries(): readonly ExperimentCatalogEntry[] {
    return this.#entries;
  }

  /** The most recently promoted active entry matching `family`, or
   * undefined. Retired entries stay in the record but no longer match. */
  consult(family: string): ExperimentCatalogEntry | undefined {
    for (let i = this.#entries.length - 1; i >= 0; i--) {
      const entry = this.#entries[i]!;
      if (entry.family === family && entry.retired === undefined) return entry;
    }
    return undefined;
  }

  /** True when `manifest` is already kept on an active entry; re-promotion
   * of the same program is evaluated and recorded but does not duplicate
   * the entry. A retired entry no longer counts — the same manifest may be
   * re-promoted after the entry that held it was demoted. */
  kept(manifest: Digest): boolean {
    return this.#entries.some(entry => entry.manifest === manifest && entry.retired === undefined);
  }

  /** Mark an entry retired: it keeps its row in the record, carries the
   * digest of the evidence that demoted it, and stops matching `consult`. */
  retire(index: number, report: Digest): void {
    const entry = this.#entries[index];
    if (entry === undefined) fail(`catalog has no entry ${index}`);
    if (entry.retired !== undefined) fail(`catalog entry ${index} is already retired`);
    entry.retired = report;
  }

  add(entry: ExperimentCatalogEntry): number {
    if (this.#entries.length >= this.#maxEntries) fail(`catalog exceeds ${this.#maxEntries} entries`);
    this.#entries.push(entry);
    return this.#entries.length - 1;
  }

  record(): ExperimentCatalog {
    return parseExperimentCatalog({ contract: EXPERIMENT_CATALOG_CONTRACT, entries: this.#entries });
  }
}

// ---------------------------------------------------------------- records ---

export type ExperimentConsult = {
  outcome: "hit" | "miss" | "disabled";
  /** Catalog index consulted on a hit; null otherwise. */
  entry: number | null;
  /** The kept manifest a hit resolved to; null otherwise. */
  manifest: Digest | null;
};

export type ExperimentPromote = {
  evaluated: boolean;
  /** True when this run added a catalog entry. */
  promoted: boolean;
  /** Stored promotion-evaluation evidence digest; null when not evaluated. */
  report: Digest | null;
  /** The catalog index the evaluation concerned: the entry added when
   * promoted, else the consulted entry cited or re-qualified. */
  entry: number | null;
  validation: { passed: number; total: number } | null;
  /** Optimizer only: set true when a stale entry's re-qualification failed
   * and `entry` names the catalog index it retired. */
  demoted?: boolean;
};

/** An optimizer arm's revision episode: which trigger fired, the bounded
 * evidence record the reviser received, the revision run's lineage, and
 * whether its emitted manifest passed evaluation and joined the catalog. */
export type ExperimentRevise = {
  trigger: "failed-run" | "missed-expectation" | "requalification";
  /** Stored digest of the evidence record delivered to the reviser. */
  evidence: Digest;
  /** The revision run's lineage; null when its admission was refused. */
  generator: { manifest: Digest; receipt: Digest; normalized?: string[] } | null;
  /** Whether the emitted revision was evaluated on the arm's cases. */
  evaluated: boolean;
  /** True when the revision passed every validation case and was kept. */
  promoted: boolean;
  /** Stored revision-evaluation report digest; null when not evaluated. */
  report: Digest | null;
  /** The revision's validation score; null when not evaluated. */
  validation: { passed: number; total: number } | null;
  /** The catalog index the promoted revision added; null otherwise. */
  entry: number | null;
  /** The consulted catalog index this episode retired; null when the
   * trigger fired on an entry that stays active. */
  supersedes: number | null;
};

/** One task's outcome. Every referenced record is stored; a run that never
 * produced a manifest or receipt records nulls there, and `outcome` says why:
 * an ordinary `RunOutcome`, `exhausted` when the account refused the run, or
 * `invalid` when the harness could not build a valid run (bad generated
 * manifest, an interface the task's args do not fit, a missing kept entry). */
export type ExperimentRun = {
  contract: typeof EXPERIMENT_RUN_CONTRACT;
  arm: ExperimentArmKind;
  taskId: string;
  phase: ExperimentPhase;
  consult: ExperimentConsult;
  /** The generation run, when this task generated its manifest. */
  generator: { manifest: Digest; receipt: Digest; normalized?: string[] } | null;
  /** The executed manifest's digest; null when none was produced. */
  manifest: Digest | null;
  /** Digest of the stored run arguments; null when the run never admitted. */
  args: Digest | null;
  receipt: Digest | null;
  outcome: RunOutcome | "exhausted" | "invalid";
  work: { units: number; agentCalls: number };
  failure: { code: string; message: string } | null;
  promote: ExperimentPromote | null;
  /** The revision episode an optimizer arm ran for this task's consulted
   * entry; absent on every other arm and on untriggered optimizer runs. */
  revise?: ExperimentRevise;
  /** Operator interventions recorded for this run — the human-correction
   * measure's raw signal. Absent means none were recorded; the arm runner
   * only copies what the task declares, it produces none itself. */
  corrections?: ExperimentCorrection[];
};

function parseConsult(value: unknown, at: string): ExperimentConsult {
  const v = closed(value, ["outcome", "entry", "manifest"], [], at);
  if (v.outcome !== "hit" && v.outcome !== "miss" && v.outcome !== "disabled") fail(`${at}.outcome must be hit, miss, or disabled`);
  const outcome = v.outcome;
  const entry = v.entry === null ? null : count(v.entry, 0, EXPERIMENT_BOUNDS.maxCatalogEntries - 1, `${at}.entry`);
  const manifest = nullableRef(v.manifest, `${at}.manifest`);
  if (outcome === "hit" && (entry === null || manifest === null)) fail(`${at}: a hit needs an entry and a manifest`);
  if (outcome !== "hit" && (entry !== null || manifest !== null)) fail(`${at}: only a hit records an entry and manifest`);
  return { outcome, entry, manifest };
}

function parsePromote(value: unknown, at: string): ExperimentPromote {
  const v = closed(value, ["evaluated", "promoted", "report", "entry", "validation"], ["demoted"], at);
  if (typeof v.evaluated !== "boolean" || typeof v.promoted !== "boolean") fail(`${at} flags must be boolean`);
  const report = nullableRef(v.report, `${at}.report`);
  const entry = v.entry === null ? null : count(v.entry, 0, EXPERIMENT_BOUNDS.maxCatalogEntries - 1, `${at}.entry`);
  let validation: ExperimentPromote["validation"] = null;
  if (v.validation !== null) {
    const score = closed(v.validation, ["passed", "total"], [], `${at}.validation`);
    const total = count(score.total, 1, EXPERIMENT_BOUNDS.maxCases, `${at}.validation.total`);
    validation = { passed: count(score.passed, 0, total, `${at}.validation.passed`), total };
  }
  if (v.promoted && (entry === null || report === null)) fail(`${at}: a promotion needs an entry and a report`);
  if (v.evaluated && (report === null || validation === null)) fail(`${at}: an evaluation needs a report and a validation score`);
  const demoted = opt(v, "demoted");
  if (demoted.present) {
    if (typeof demoted.value !== "boolean") fail(`${at}.demoted must be boolean`);
    if (demoted.value === true && (entry === null || !v.evaluated || v.promoted)) {
      fail(`${at}: a demotion needs the evaluated consulted entry it retired`);
    }
  }
  const promote: ExperimentPromote = { evaluated: v.evaluated, promoted: v.promoted, report, entry, validation };
  if (demoted.present) promote.demoted = demoted.value as boolean;
  return promote;
}

function parseRevise(value: unknown, at: string): ExperimentRevise {
  const v = closed(value, ["trigger", "evidence", "generator", "evaluated", "promoted", "report", "validation", "entry", "supersedes"], [], at);
  if (v.trigger !== "failed-run" && v.trigger !== "missed-expectation" && v.trigger !== "requalification") {
    fail(`${at}.trigger must be failed-run, missed-expectation, or requalification`);
  }
  let generator: ExperimentRevise["generator"] = null;
  if (v.generator !== null) {
    const g = closed(v.generator, ["manifest", "receipt"], ["normalized"], `${at}.generator`);
    generator = { manifest: reference(g.manifest, `${at}.generator.manifest`), receipt: reference(g.receipt, `${at}.generator.receipt`) };
    if (g.normalized !== undefined) {
      if (!Array.isArray(g.normalized) || g.normalized.length === 0 || g.normalized.length > EXPERIMENT_BOUNDS.maxRepairs) {
        fail(`${at}.generator.normalized must list 1..${EXPERIMENT_BOUNDS.maxRepairs} repairs`);
      }
      generator.normalized = g.normalized.map((entry, i) => label(entry, `${at}.generator.normalized[${i}]`, 64));
    }
  }
  const report = nullableRef(v.report, `${at}.report`);
  let validation: ExperimentRevise["validation"] = null;
  if (v.validation !== null) {
    const score = closed(v.validation, ["passed", "total"], [], `${at}.validation`);
    const total = count(score.total, 1, EXPERIMENT_BOUNDS.maxCases, `${at}.validation.total`);
    validation = { passed: count(score.passed, 0, total, `${at}.validation.passed`), total };
  }
  const entry = v.entry === null ? null : count(v.entry, 0, EXPERIMENT_BOUNDS.maxCatalogEntries - 1, `${at}.entry`);
  const supersedes = v.supersedes === null ? null : count(v.supersedes, 0, EXPERIMENT_BOUNDS.maxCatalogEntries - 1, `${at}.supersedes`);
  if (typeof v.evaluated !== "boolean" || typeof v.promoted !== "boolean") fail(`${at} flags must be boolean`);
  if (v.promoted && (entry === null || report === null)) fail(`${at}: a promoted revision needs an entry and a report`);
  if (v.evaluated && (report === null || validation === null)) fail(`${at}: an evaluated revision needs a report and a validation score`);
  return { trigger: v.trigger, evidence: reference(v.evidence, `${at}.evidence`), generator, evaluated: v.evaluated, promoted: v.promoted, report, validation, entry, supersedes };
}

export function parseExperimentRun(value: unknown): ExperimentRun {
  const at = "run";
  const v = closed(boundedJsonSnapshot(value, EXPERIMENT_BOUNDS.record, at), ["contract", "arm", "taskId", "phase", "consult", "generator", "manifest", "args", "receipt", "outcome", "work", "failure", "promote"], ["corrections", "revise"], at);
  if (v.contract !== EXPERIMENT_RUN_CONTRACT) fail(`contract must be ${EXPERIMENT_RUN_CONTRACT}`);
  let generator: ExperimentRun["generator"] = null;
  if (v.generator !== null) {
    const g = closed(v.generator, ["manifest", "receipt"], ["normalized"], `${at}.generator`);
    generator = { manifest: reference(g.manifest, `${at}.generator.manifest`), receipt: reference(g.receipt, `${at}.generator.receipt`) };
    if (g.normalized !== undefined) {
      if (!Array.isArray(g.normalized) || g.normalized.length === 0 || g.normalized.length > EXPERIMENT_BOUNDS.maxRepairs) {
        fail(`${at}.generator.normalized must list 1..${EXPERIMENT_BOUNDS.maxRepairs} repairs`);
      }
      generator.normalized = g.normalized.map((entry, i) => label(entry, `${at}.generator.normalized[${i}]`, 64));
    }
  }
  const outcomes = ["complete", "failed", "stuck", "suspended", "exhausted", "invalid"];
  if (!outcomes.includes(v.outcome as string)) fail(`${at}.outcome must be one of ${outcomes.join(", ")}`);
  const outcome = v.outcome as ExperimentRun["outcome"];
  const work = closed(v.work, ["units", "agentCalls"], [], `${at}.work`);
  let failure: ExperimentRun["failure"] = null;
  if (v.failure !== null) {
    const f = closed(v.failure, ["code", "message"], [], `${at}.failure`);
    failure = {
      code: label(f.code, `${at}.failure.code`, 64),
      message: label(f.message, `${at}.failure.message`, EXPERIMENT_BOUNDS.maxFailureLength),
    };
  }
  const manifest = nullableRef(v.manifest, `${at}.manifest`);
  const args = nullableRef(v.args, `${at}.args`);
  const receipt = nullableRef(v.receipt, `${at}.receipt`);
  if (outcome === "complete" || outcome === "failed" || outcome === "stuck" || outcome === "suspended") {
    if (manifest === null || receipt === null) fail(`${at}: a finished run needs a manifest and a receipt`);
  }
  const run: ExperimentRun = {
    contract: EXPERIMENT_RUN_CONTRACT,
    arm: armKind(v.arm, `${at}.arm`),
    taskId: label(v.taskId, `${at}.taskId`),
    phase: phase(v.phase, `${at}.phase`),
    consult: parseConsult(v.consult, `${at}.consult`),
    generator,
    manifest,
    args,
    receipt,
    outcome,
    work: {
      units: count(work.units, 0, Number.MAX_SAFE_INTEGER, `${at}.work.units`),
      agentCalls: count(work.agentCalls, 0, Number.MAX_SAFE_INTEGER, `${at}.work.agentCalls`),
    },
    failure,
    promote: v.promote === null ? null : parsePromote(v.promote, `${at}.promote`),
  };
  const corrections = opt(v, "corrections");
  if (corrections.present) run.corrections = parseCorrections(corrections.value, `${at}.corrections`);
  const revise = opt(v, "revise");
  if (revise.present) run.revise = parseRevise(revise.value, `${at}.revise`);
  return run;
}

/** The per-arm record: each task's run record in task order, the arm's closed
 * habitat account, and the catalog the session ended with. */
export type ExperimentSession = {
  contract: typeof EXPERIMENT_SESSION_CONTRACT;
  arm: ExperimentArmKind;
  family: string;
  tasks: { taskId: string; phase: ExperimentPhase; run: Digest }[];
  /** Digest of the stored `algal.habitat-budget.v1` account. */
  budget: Digest;
  /** Digest of the stored `algal.experiment-catalog.v1` record. */
  catalog: Digest;
  outcome: "complete" | "exhausted";
};

export function parseExperimentSession(value: unknown): ExperimentSession {
  const at = "session";
  const v = closed(boundedJsonSnapshot(value, EXPERIMENT_BOUNDS.record, at), ["contract", "arm", "family", "tasks", "budget", "catalog", "outcome"], [], at);
  if (v.contract !== EXPERIMENT_SESSION_CONTRACT) fail(`contract must be ${EXPERIMENT_SESSION_CONTRACT}`);
  if (!Array.isArray(v.tasks) || v.tasks.length > EXPERIMENT_BOUNDS.maxTasks) fail(`tasks must list at most ${EXPERIMENT_BOUNDS.maxTasks}`);
  const tasks = v.tasks.map((raw, i) => {
    const t = closed(raw, ["taskId", "phase", "run"], [], `${at}.tasks[${i}]`);
    return { taskId: label(t.taskId, `${at}.tasks[${i}].taskId`), phase: phase(t.phase, `${at}.tasks[${i}].phase`), run: reference(t.run, `${at}.tasks[${i}].run`) };
  });
  if (v.outcome !== "complete" && v.outcome !== "exhausted") fail(`${at}.outcome must be complete or exhausted`);
  return {
    contract: EXPERIMENT_SESSION_CONTRACT,
    arm: armKind(v.arm, `${at}.arm`),
    family: label(v.family, `${at}.family`, EXPERIMENT_BOUNDS.maxFamilyLength),
    tasks,
    budget: reference(v.budget, `${at}.budget`),
    catalog: reference(v.catalog, `${at}.catalog`),
    outcome: v.outcome,
  };
}

// ---------------------------------------------------------------- engine ---

export type ExperimentTaskContext = {
  arm: ExperimentArm;
  task: ExperimentTask;
  store: Store;
  fns: FnRegistry;
  executors: Executor[];
  transports?: Record<string, Transport>;
  tools?: ToolRegistry;
  /** The arm's account; a host `runTask` admits its own runs through it. */
  account: HabitatLedger;
};

/** The task-mapping result: either a manifest with its mapped arguments, or a
 * `failure` when the mapping could not produce a runnable program — the
 * generation run's references stay attached either way, so a generator that
 * charged the account and then failed is still joined in the record. */
export type ExperimentRunTaskResult =
  | {
    manifest: OrganismManifest;
    args: Record<string, Record<string, JsonValue>>;
    /** The generation run that produced the manifest, when one ran. */
    generator?: { manifest: Digest; receipt: Digest; normalized?: string[] };
  }
  | {
    failure: { code: string; message: string };
    generator?: { manifest: Digest; receipt: Digest; normalized?: string[] };
  };

export type ExperimentRunTask = (ctx: ExperimentTaskContext) => Promise<ExperimentRunTaskResult>;

export type ExperimentRunOptions = {
  arm: ExperimentArm;
  tasks: ExperimentTask[];
  fns: FnRegistry;
  store: Store;
  executors: Executor[];
  transports?: Record<string, Transport>;
  tools?: ToolRegistry;
  /** Kept entries the catalog starts with, for sessions that resume retention. */
  catalog?: ExperimentCatalogEntry[];
  /** Host override for the task-to-manifest mapping; the default runs the
   * arm's generator (or serves the fixed arm's declared manifest). */
  runTask?: ExperimentRunTask;
};

export type ExperimentRunResult = {
  session: ExperimentSession;
  sessionDigest: Digest;
  runs: ExperimentRun[];
  runDigests: Digest[];
  catalog: ExperimentCatalog;
  catalogDigest: Digest;
};

const exhausted = (error: unknown): boolean => error instanceof AlgalError && error.code === "BUDGET_EXHAUSTED";

const truncate = (value: string, max: number): string => [...value].slice(0, max).join("");

function failureOf(error: unknown): { code: string; message: string } {
  const code = error instanceof AlgalError ? error.code : "INTERNAL";
  const message = error instanceof Error ? error.message : String(error);
  return { code: truncate(code, 64), message: truncate(message, EXPERIMENT_BOUNDS.maxFailureLength) };
}

/** Maps interface-input-keyed args through the executed manifest's declared
 * interface. An input name the manifest does not declare is an admission
 * failure — for a catalog hit that is "a vendored procedure that failed
 * admission on reuse". */
function interfaceArgs(manifest: OrganismManifest, args: Record<string, JsonValue>): Record<string, Record<string, JsonValue>> {
  const inputs = manifest.interface?.inputs;
  if (inputs === undefined) throw new AlgalError("PARSE_FAILED", `experiment: manifest ${manifest.key} declares no interface inputs`);
  const out: Record<string, Record<string, JsonValue>> = {};
  for (const [name, value] of Object.entries(args)) {
    const target = inputs[name];
    if (target === undefined) throw new AlgalError("PARSE_FAILED", `experiment: manifest ${manifest.key} has no interface input "${name}"`);
    (out[target.cell] ??= {})[target.port] = value;
  }
  return out;
}

/** The bounded deterministic repairs `normalizeEmitted` applies to a
 * generator's emitted value before its second parse attempt — one entry per
 * defect class observed in live generation:
 * - `"view-inputs-wildcard"`: a cell's `view.inputs` list containing `"*"`
 *   is replaced by the contract's wildcard form — the bare string `"*"`,
 *   meaning all declared inputs. A list cannot hold `"*"`; the intent is
 *   unambiguous.
 * - `"expr-id"`: an `expr` descriptor carrying a stray `id` member (the cell's
 *   own id duplicated into it) drops that member.
 * Repairs are keyed by class, not position: the returned list names each kind
 * applied at least once. Anything else stays untouched so the residual parse
 * failure describes what the generator actually emitted. */
export function normalizeEmittedManifest(value: unknown): { value: unknown; repairs: string[] } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return { value, repairs: [] };
  const root = value as Record<string, unknown>;
  if (!Array.isArray(root.cells)) return { value, repairs: [] };
  const repairs = new Set<string>();
  const cells = root.cells.map((cell) => {
    if (cell === null || typeof cell !== "object" || Array.isArray(cell)) return cell;
    const c = { ...(cell as Record<string, unknown>) };
    const view = c.view;
    if (view !== null && typeof view === "object" && !Array.isArray(view)) {
      const v = { ...(view as Record<string, unknown>) };
      if (Array.isArray(v.inputs) && v.inputs.includes("*")) {
        v.inputs = "*";
        repairs.add("view-inputs-wildcard");
      }
      c.view = v;
    }
    const expr = c.expr;
    if (expr !== null && typeof expr === "object" && !Array.isArray(expr) && Object.hasOwn(expr, "id")) {
      const e = { ...(expr as Record<string, unknown>) };
      delete e.id;
      c.expr = e;
      repairs.add("expr-id");
    }
    return c;
  });
  if (repairs.size === 0) return { value, repairs: [] };
  return { value: { ...root, cells }, repairs: [...repairs].sort() };
}

/** The default task mapping: `fixed` serves its declared manifest; every other
 * arm runs the generator through the arm's account and parses the emitted
 * manifest with `parseOrganismManifest`. A generator that ran and charged but
 * did not emit a valid manifest returns a `failure` result carrying the
 * generation run's references. */
async function defaultRunTask(ctx: ExperimentTaskContext): Promise<ExperimentRunTaskResult> {
  const { arm, task } = ctx;
  if (arm.arm === "fixed") {
    const manifest = arm.manifest!;
    return { manifest, args: interfaceArgs(manifest, task.args) };
  }
  const generator = arm.generator!;
  const genArgs = interfaceArgs(generator.manifest, { ...(generator.args ?? {}), task: task.spec });
  const generatorDigest = await ctx.store.putManifest(generator.manifest);
  const { receipt, receiptDigest } = await ctx.account.admit(
    { manifest: generatorDigest, budgets: generator.manifest.budgets, args: genArgs },
    () => runOrganism({
      manifest: generator.manifest,
      args: genArgs,
      fns: ctx.fns,
      store: ctx.store,
      executors: ctx.executors,
      ...(ctx.transports ? { transports: ctx.transports } : {}),
      ...(ctx.tools ? { tools: ctx.tools } : {}),
    }),
    ctx.store,
  );
  const lineage = { manifest: generatorDigest, receipt: receiptDigest };
  if (receipt.outcome !== "complete") {
    return { failure: { code: "RUN_FAILED", message: `generator ${generator.manifest.key} ended ${receipt.outcome}` }, generator: lineage };
  }
  const source = generator.manifest.interface!.outputs[generator.output]!;
  const output = receipt.cells[source.cell]?.outputs?.[source.port];
  const value = generator.field !== undefined && output !== null && typeof output === "object" && !Array.isArray(output)
    ? output[generator.field]
    : output;
  try {
    const manifest = parseOrganismManifest(value);
    return { manifest, args: interfaceArgs(manifest, task.args), generator: lineage };
  } catch (first) {
    if (arm.normalizeEmitted === true) {
      const repaired = normalizeEmittedManifest(value);
      if (repaired.repairs.length > 0) {
        const normalized = { ...lineage, normalized: repaired.repairs };
        try {
          const manifest = parseOrganismManifest(repaired.value);
          return { manifest, args: interfaceArgs(manifest, task.args), generator: normalized };
        } catch (second) {
          return { failure: failureOf(second), generator: normalized };
        }
      }
    }
    return { failure: failureOf(first), generator: lineage };
  }
}

/** The promote hook: the task's manifest is evaluated through the ordinary
 * foundry path on the arm's declared cases — train and validation run and
 * charge to the account, holdout is declared but never touched — and a
 * candidate that passes every validation case joins the catalog. For an
 * optimizer arm's consulted entry the same path doubles as re-qualification
 * (`hit.requalify`): a pass refreshes the entry's staleness window, a
 * failure retires it. */
async function promoteHook(
  ctx: ExperimentTaskContext,
  manifest: OrganismManifest,
  manifestDigest: Digest,
  catalog: ExperimentCatalogState,
  hit?: { index: number; requalify: boolean },
): Promise<ExperimentPromote> {
  const arm = ctx.arm;
  const evaluate = async (): Promise<ExperimentPromote> => {
    const selection = await evaluateFoundryPopulation({
      candidates: [manifest],
      cases: arm.cases!,
      fns: ctx.fns,
      store: ctx.store,
      executors: ctx.executors,
      ...(ctx.transports ? { transports: ctx.transports } : {}),
      ...(ctx.tools ? { tools: ctx.tools } : {}),
      ...(arm.scorer ? { scorer: arm.scorer } : {}),
      account: ctx.account,
    });
    const candidate = selection.candidates[0]!;
    const report = await ctx.store.putValue(selection as unknown as JsonValue);
    return { evaluated: true, promoted: false, report, entry: null, validation: { passed: candidate.validation.passed, total: candidate.validation.total } };
  };
  // Re-qualification: a consulted entry past its staleness window is
  // re-evaluated before citing — a pass keeps it live, a failure demotes it.
  if (arm.arm === "optimizer" && hit?.requalify === true) {
    const evaluated = await evaluate();
    if (evaluated.validation!.passed === evaluated.validation!.total) {
      return { evaluated: true, promoted: false, report: evaluated.report, entry: hit.index, validation: evaluated.validation };
    }
    catalog.retire(hit.index, evaluated.report!);
    return { evaluated: true, promoted: false, report: evaluated.report, entry: hit.index, validation: evaluated.validation, demoted: true };
  }
  // A task that ran an already-kept manifest re-cites the entry's stored
  // promotion evidence when the arm opts in — for an optimizer arm, inside
  // the staleness window — so a catalog hit charges the task run alone, not
  // another evaluation.
  if (arm.citeKeptEvaluation === true || arm.arm === "optimizer") {
    const keptIndex = hit?.index ?? catalog.entries.findIndex(entry => entry.manifest === manifestDigest && entry.retired === undefined);
    if (keptIndex >= 0) {
      const entry = catalog.entries[keptIndex]!;
      const validations = entry.cases.filter(c => c.split === "validation").length;
      return {
        evaluated: false,
        promoted: false,
        report: entry.report,
        entry: keptIndex,
        validation: { passed: validations, total: validations },
      };
    }
  }
  const evaluated = await evaluate();
  const report = evaluated.report!;
  const validation = evaluated.validation!;
  const passing = validation.passed === validation.total;
  if (passing && !catalog.kept(manifestDigest)) {
    const entry = catalog.add({
      family: arm.family,
      manifest: manifestDigest,
      interfaceDigest: manifest.interface !== undefined ? digestCanonical(manifest.interface as unknown as JsonValue) : null,
      cases: arm.cases!.flatMap((c): { id: string; split: "train" | "validation" }[] =>
        c.split === "holdout" ? [] : [{ id: c.id, split: c.split }]),
      report,
      taskId: ctx.task.taskId,
    });
    return { evaluated: true, promoted: true, report, entry, validation };
  }
  return { evaluated: true, promoted: false, report, entry: null, validation };
}

/** The interface-output-keyed value map a settled run produced — the same
 * shape the foundry scorer's `outputs` environment sees. */
function interfaceOutputs(manifest: OrganismManifest, receipt: RunReceipt): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  for (const [name, target] of Object.entries(manifest.interface?.outputs ?? {})) {
    out[name] = receipt.cells[target.cell]?.outputs?.[target.port] ?? null;
  }
  return out;
}

/** Grades a catalog hit's outputs against the task's declared `expect`:
 * the arm's scorer when one is declared (same `{args, expect, outputs}`
 * environment a foundry case sees, `args` = the task's interface-input map),
 * else canonical equality of the full output map. */
function taskOutputsMatch(
  manifest: OrganismManifest,
  task: ExperimentTask,
  receipt: RunReceipt,
  arm: ExperimentArm,
): boolean {
  const outputs = interfaceOutputs(manifest, receipt);
  if (arm.scorer !== undefined) {
    return evalScorer(arm.scorer, { args: task.args, expect: task.expect! }, outputs);
  }
  return digestCanonical(outputs as JsonValue) === digestCanonical(task.expect as JsonValue);
}

/** The revision hook — optimizer arms only. A trigger's evidence record is
 * stored and delivered to the reviser beside `task` and the kept manifest
 * (interface inputs declared); the consulted entry retires on the evidence
 * digest, so a failed re-qualification or hit run demotes it whether or not
 * a repair follows. The reviser's emitted manifest is parsed (through
 * `normalizeEmittedManifest` when the arm opts in) and evaluated on the
 * arm's declared cases; a passing revision joins the catalog with
 * `supersedes` back to the retired index. */
async function reviseHook(
  ctx: ExperimentTaskContext,
  consultEntry: number,
  trigger: ExperimentRevise["trigger"],
  evidenceValue: Record<string, JsonValue>,
  kept: OrganismManifest,
  catalog: ExperimentCatalogState,
): Promise<ExperimentRevise> {
  const arm = ctx.arm;
  const reviser = arm.reviser!;
  const evidence = await ctx.store.putValue(evidenceValue as JsonValue);
  if (catalog.entries[consultEntry]?.retired === undefined) catalog.retire(consultEntry, evidence);
  const base: Omit<ExperimentRevise, "evidence"> = {
    trigger, generator: null, evaluated: false, promoted: false, report: null, validation: null, entry: null, supersedes: consultEntry,
  };
  const declared: Record<string, JsonValue> = { task: ctx.task.spec };
  const inputs = reviser.manifest.interface?.inputs ?? {};
  if (inputs["kept"] !== undefined) declared["kept"] = kept as unknown as JsonValue;
  if (inputs["evidence"] !== undefined) declared["evidence"] = evidenceValue;
  const revArgs = interfaceArgs(reviser.manifest, { ...(reviser.args ?? {}), ...declared });
  const reviserDigest = await ctx.store.putManifest(reviser.manifest);
  let lineage: { manifest: Digest; receipt: Digest; normalized?: string[] } | null = null;
  let value: unknown;
  try {
    const { receipt, receiptDigest } = await ctx.account.admit(
      { manifest: reviserDigest, budgets: reviser.manifest.budgets, args: revArgs },
      () => runOrganism({
        manifest: reviser.manifest,
        args: revArgs,
        fns: ctx.fns,
        store: ctx.store,
        executors: ctx.executors,
        ...(ctx.transports ? { transports: ctx.transports } : {}),
        ...(ctx.tools ? { tools: ctx.tools } : {}),
      }),
      ctx.store,
    );
    lineage = { manifest: reviserDigest, receipt: receiptDigest };
    if (receipt.outcome !== "complete") return { ...base, evidence, generator: lineage };
    const source = reviser.manifest.interface!.outputs[reviser.output]!;
    const output = receipt.cells[source.cell]?.outputs?.[source.port];
    value = reviser.field !== undefined && output !== null && typeof output === "object" && !Array.isArray(output)
      ? output[reviser.field]
      : output;
  } catch (error) {
    if (exhausted(error)) return { ...base, evidence, generator: lineage };
    throw error;
  }
  let revision: OrganismManifest;
  try {
    revision = parseOrganismManifest(value);
  } catch {
    if (arm.normalizeEmitted === true) {
      const repaired = normalizeEmittedManifest(value);
      if (repaired.repairs.length > 0) {
        lineage = { ...lineage!, normalized: repaired.repairs };
        try {
          revision = parseOrganismManifest(repaired.value);
        } catch {
          return { ...base, evidence, generator: lineage };
        }
      } else {
        return { ...base, evidence, generator: lineage };
      }
    } else {
      return { ...base, evidence, generator: lineage };
    }
  }
  const revisionDigest = await ctx.store.putManifest(revision);
  const selection = await evaluateFoundryPopulation({
    candidates: [revision],
    cases: arm.cases!,
    fns: ctx.fns,
    store: ctx.store,
    executors: ctx.executors,
    ...(ctx.transports ? { transports: ctx.transports } : {}),
    ...(ctx.tools ? { tools: ctx.tools } : {}),
    ...(arm.scorer ? { scorer: arm.scorer } : {}),
    account: ctx.account,
  });
  const candidate = selection.candidates[0]!;
  const report = await ctx.store.putValue(selection as unknown as JsonValue);
  const validation = { passed: candidate.validation.passed, total: candidate.validation.total };
  if (candidate.validation.passed !== candidate.validation.total || catalog.kept(revisionDigest)) {
    return { ...base, evidence, generator: lineage, evaluated: true, report, validation };
  }
  const entry = catalog.add({
    family: arm.family,
    manifest: revisionDigest,
    interfaceDigest: revision.interface !== undefined ? digestCanonical(revision.interface as unknown as JsonValue) : null,
    cases: arm.cases!.flatMap((c): { id: string; split: "train" | "validation" }[] =>
      c.split === "holdout" ? [] : [{ id: c.id, split: c.split }]),
    report,
    taskId: ctx.task.taskId,
    supersedes: consultEntry,
  });
  return { ...base, evidence, generator: lineage, evaluated: true, promoted: true, report, validation, entry };
}

/** Runs one arm configuration over the task set and records everything.
 * Never throws on an exhausted account or an invalid task: those land on the
 * run and session records. Other host failures (store IO, registry holes)
 * propagate. */
export async function runExperimentArm(opts: ExperimentRunOptions): Promise<ExperimentRunResult> {
  const arm = opts.arm;
  if (arm.arm === "fixed") {
    if (arm.manifest === undefined) fail("a fixed arm requires manifest");
  } else {
    if (arm.generator === undefined) fail(`a ${arm.arm} arm requires a generator`);
    if (arm.generator.manifest.interface?.outputs[arm.generator.output] === undefined) {
      fail(`a ${arm.arm} generator must declare interface output "${arm.generator.output}"`);
    }
    if ((arm.arm === "retained" || arm.arm === "optimizer") && arm.cases === undefined) {
      fail(`a ${arm.arm} arm requires promotion cases`);
    }
    if (arm.arm === "optimizer") {
      if (arm.reviser === undefined) fail("an optimizer arm requires a reviser");
      if (arm.requalifyAfter === undefined) fail("an optimizer arm requires requalifyAfter");
      if (arm.reviser.manifest.interface?.outputs[arm.reviser.output] === undefined) {
        fail(`an optimizer reviser must declare interface output "${arm.reviser.output}"`);
      }
    }
  }
  if (opts.tasks.length === 0 || opts.tasks.length > EXPERIMENT_BOUNDS.maxTasks) fail(`tasks must list 1..${EXPERIMENT_BOUNDS.maxTasks} entries`);
  const account = new HabitatAccount("experiment", arm.budget);
  const catalog = new ExperimentCatalogState(opts.catalog ?? [], arm.maxEntries ?? EXPERIMENT_BOUNDS.maxCatalogEntries);
  const consultEnabled = arm.arm === "retained" || arm.arm === "optimizer";
  const promoteEnabled = arm.arm === "retained" || arm.arm === "optimizer";
  // Optimizer staleness bookkeeping: the task ordinal each catalog index was
  // last evaluated at. Entries seeded into the catalog count as evaluated at
  // session start, so a seeded entry goes stale `requalifyAfter` tasks in.
  const evalOrdinals = new Map<number, number>();
  const runTask = opts.runTask ?? defaultRunTask;
  const shared = {
    fns: opts.fns,
    store: opts.store,
    executors: opts.executors,
    ...(opts.transports ? { transports: opts.transports } : {}),
    ...(opts.tools ? { tools: opts.tools } : {}),
  };

  const runs: ExperimentRun[] = [];
  const runDigests: Digest[] = [];
  let stopped = false;

  for (const [taskIndex, task] of opts.tasks.entries()) {
    if (stopped) break;
    const ctx: ExperimentTaskContext = { arm, task, ...shared, account };
    const record = async (partial: Omit<ExperimentRun, "contract" | "arm" | "taskId" | "phase">): Promise<ExperimentRun> => {
      const run = parseExperimentRun({
        contract: EXPERIMENT_RUN_CONTRACT, arm: arm.arm, taskId: task.taskId, phase: task.phase,
        // Operator-declared corrections ride from the task onto whatever
        // record the task writes; the runner itself records none.
        ...(task.corrections === undefined ? {} : { corrections: task.corrections }),
        ...partial,
      });
      runs.push(run);
      runDigests.push(await opts.store.putValue(run as unknown as JsonValue));
      return run;
    };

    // Consult hook: a hit digest-resolves the kept manifest through the store;
    // a miss or disabled hook falls through to the task mapping. On an
    // optimizer arm the hit also computes staleness — past `requalifyAfter`
    // tasks without an evaluation the entry must re-qualify before citing.
    let consult: ExperimentConsult = { outcome: consultEnabled ? "miss" : "disabled", entry: null, manifest: null };
    let requalify = false;
    let prepared: ExperimentRunTaskResult | null = null;
    if (consultEnabled) {
      const hit = catalog.consult(arm.family);
      if (hit !== undefined) {
        const kept = await opts.store.getManifest(hit.manifest);
        if (kept === undefined) {
          consult = { outcome: "miss", entry: null, manifest: null };
        } else {
          consult = { outcome: "hit", entry: catalog.entries.indexOf(hit), manifest: hit.manifest };
          requalify = arm.arm === "optimizer" &&
            taskIndex - (evalOrdinals.get(consult.entry!) ?? 0) >= arm.requalifyAfter!;
          try {
            prepared = { manifest: kept, args: interfaceArgs(kept, task.args) };
          } catch (error) {
            await record({
              consult, generator: null, manifest: hit.manifest, args: null, receipt: null,
              outcome: "invalid", work: { units: 0, agentCalls: 0 }, failure: failureOf(error), promote: null,
            });
            continue;
          }
        }
      }
    }

    let manifest: OrganismManifest | null = null;
    let args: Record<string, Record<string, JsonValue>> | null = null;
    let generator: ExperimentRun["generator"] = null;
    if (prepared === null) {
      try {
        prepared = await runTask(ctx);
      } catch (error) {
        const run = await record({
          consult, generator: null, manifest: null, args: null, receipt: null,
          outcome: exhausted(error) ? "exhausted" : "invalid",
          work: { units: 0, agentCalls: 0 }, failure: failureOf(error), promote: null,
        });
        if (run.outcome === "exhausted") stopped = true;
        continue;
      }
    }
    if ("failure" in prepared) {
      await record({
        consult, generator: prepared.generator ?? null, manifest: null, args: null, receipt: null,
        outcome: "invalid", work: { units: 0, agentCalls: 0 }, failure: prepared.failure, promote: null,
      });
      continue;
    }
    manifest = prepared.manifest;
    args = prepared.args;
    generator = prepared.generator ?? null;

    let settled: { manifest: Digest; args: Digest; receipt: RunReceipt; receiptDigest: Digest } | null = null;
    let refused: Digest | null = null;
    try {
      const manifestDigest = await opts.store.putManifest(manifest);
      refused = manifestDigest;
      const admitted = await account.admit(
        { manifest: manifestDigest, budgets: manifest.budgets, args },
        () => runOrganism({ manifest, args, ...shared }),
        opts.store,
      );
      settled = {
        manifest: manifestDigest,
        receipt: admitted.receipt,
        receiptDigest: admitted.receiptDigest,
        args: await opts.store.putValue(args as JsonValue),
      };
    } catch (error) {
      // A refused reservation records the manifest it tried to admit — the
      // same digest the account's terminal refusal names.
      const run = await record({
        consult, generator, manifest: refused, args: null, receipt: null,
        outcome: exhausted(error) ? "exhausted" : "invalid",
        work: { units: 0, agentCalls: 0 }, failure: failureOf(error), promote: null,
      });
      if (run.outcome === "exhausted") stopped = true;
      continue;
    }

    // Revision triggers on a consulted entry: the hit run failing outright,
    // or its outputs failing the task's declared `expect`. Re-qualification
    // is decided inside the promote hook and joins the triggers below.
    let reviseTrigger: ExperimentRevise["trigger"] | undefined;
    let reviseEvidence: Record<string, JsonValue> | undefined;
    if (arm.arm === "optimizer" && consult.outcome === "hit") {
      if (settled.receipt.outcome !== "complete") {
        reviseTrigger = "failed-run";
        reviseEvidence = { taskId: task.taskId, trigger: "failed-run", outcome: settled.receipt.outcome, receipt: settled.receiptDigest };
      } else if (task.expect !== undefined && !taskOutputsMatch(manifest!, task, settled.receipt, arm)) {
        reviseTrigger = "missed-expectation";
        reviseEvidence = { taskId: task.taskId, trigger: "missed-expectation", outcome: "complete", receipt: settled.receiptDigest, expect: task.expect };
      }
    }

    // Promote hook: evaluate the program that ran; passing candidates join the
    // catalog later tasks consult. For optimizer hits this doubles as the
    // citation or re-qualification point for the consulted entry.
    let promote: ExperimentPromote | null = null;
    if (promoteEnabled) {
      try {
        promote = await promoteHook(ctx, manifest, settled.manifest, catalog,
          consult.outcome === "hit" ? { index: consult.entry!, requalify } : undefined);
      } catch (error) {
        const run = await record({
          consult, generator, manifest: settled.manifest, args: settled.args,
          receipt: settled.receiptDigest, outcome: exhausted(error) ? "exhausted" : settled.receipt.outcome,
          work: { units: settled.receipt.work.units, agentCalls: settled.receipt.work.agentCalls },
          failure: failureOf(error), promote: null,
        });
        if (run.outcome === "exhausted") stopped = true;
        continue;
      }
      if (arm.arm === "optimizer" && promote.evaluated && promote.entry !== null && promote.demoted !== true) {
        evalOrdinals.set(promote.entry, taskIndex);
      }
    }
    if (promote?.demoted === true) {
      reviseTrigger = "requalification";
      reviseEvidence = { taskId: task.taskId, trigger: "requalification", report: promote.report };
    }

    let revise: ExperimentRevise | undefined;
    if (reviseTrigger !== undefined) {
      try {
        revise = await reviseHook(ctx, consult.entry!, reviseTrigger, reviseEvidence!, manifest!, catalog);
      } catch (error) {
        const run = await record({
          consult, generator, manifest: settled.manifest, args: settled.args,
          receipt: settled.receiptDigest, outcome: exhausted(error) ? "exhausted" : settled.receipt.outcome,
          work: { units: settled.receipt.work.units, agentCalls: settled.receipt.work.agentCalls },
          failure: failureOf(error), promote,
        });
        if (run.outcome === "exhausted") stopped = true;
        continue;
      }
      if (revise.promoted && revise.entry !== null) evalOrdinals.set(revise.entry, taskIndex);
    }

    await record({
      consult,
      generator,
      manifest: settled.manifest,
      args: settled.args,
      receipt: settled.receiptDigest,
      outcome: settled.receipt.outcome,
      work: { units: settled.receipt.work.units, agentCalls: settled.receipt.work.agentCalls },
      failure: null,
      promote,
      ...(revise === undefined ? {} : { revise }),
    });
  }

  const budgetDigest = await opts.store.putValue(account.record() as unknown as JsonValue);
  const catalogDigest = await opts.store.putValue(catalog.record() as unknown as JsonValue);
  const session = parseExperimentSession({
    contract: EXPERIMENT_SESSION_CONTRACT,
    arm: arm.arm,
    family: arm.family,
    tasks: runs.map((run, i) => ({ taskId: run.taskId, phase: run.phase, run: runDigests[i]! })),
    budget: budgetDigest,
    catalog: catalogDigest,
    outcome: account.exhausted ? "exhausted" : "complete",
  });
  const sessionDigest = await opts.store.putValue(session as unknown as JsonValue);
  return { session, sessionDigest, runs, runDigests, catalog: catalog.record(), catalogDigest };
}
