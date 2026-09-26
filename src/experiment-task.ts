// Experiment task specs for the cumulative-skill study: bounded, closed
// `algal.experiment-task.v1` records describing one compositional
// record-triage task — a taxonomy, a record schema, decision rules, an
// output format, bounded input batches with declared expected outputs, and
// a deterministic grader. Tasks are data: the seeded family generator in
// experiment-family.ts writes them, and harness tooling (arms, catalogs,
// reports) reads them. No wall-clock fields anywhere.
//
// A conforming pipeline declares interface inputs `records` (the batch, a
// bounded list of records matching `recordSchema`) and `spec` (the task
// statement `{taxonomy, recordSchema, rules, outputFormat}`), and one
// interface output `out` carrying `{results, summary}`. Judgment steps
// (assigning each record's `label`) run as agent cells; rule application
// and summary aggregation are deterministic cells. `taskCases` renders a
// spec into the {id, split, args, expect} case shape the foundry and bench
// paths already consume, so a task plugs into existing evaluation runs.
//
// Rule semantics (the reference path every grader replays): `when` is a
// closed map over a fixed slot vocabulary; a rule matches when every slot
// condition holds. Matching rules apply in list order, each merging its
// `then` fields over the accumulated decision — later matches win per
// field. The first rule must have an empty `when` and a complete `then`,
// so every record receives a total decision. `label` in a condition names
// the record's assigned class, not a record field.

import { checkProgram, evalProgram, parseExprEnvelope, type ExprEnvelope, type ExprScorer } from "./expr";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  asArray,
  asInt,
  asObject,
  canonicalize,
  noUnknownKeys,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";

export const EXPERIMENT_TASK_CONTRACT = "algal.experiment-task.v1" as const;
export const EXPERIMENT_GRADE_CONTRACT = "algal.experiment-grade.v1" as const;
export const EXPERIMENT_TASK_FAMILY = "record-triage" as const;

export const EXPERIMENT_TASK_BOUNDS = {
  /** One spec file read by the CLI. */
  maxBytes: 1_048_576,
  maxTaskIdLen: 64,
  maxClasses: 32,
  maxClassIdLen: 40,
  maxClassAboutLen: 240,
  maxSchemaFields: 16,
  maxFieldNameLen: 32,
  /** Choice labels per record field or output field. */
  maxLabels: 16,
  maxLabelLen: 32,
  /** Largest `maxLength` a text field may declare. */
  maxTextLen: 2_048,
  /** Record ids and bounded ids elsewhere. */
  maxIdLen: 40,
  maxRules: 16,
  maxRuleIdLen: 32,
  /** Slots one rule's `when` may carry. */
  maxWhenSlots: 8,
  /** Values inside one `in` condition. */
  maxInValues: 8,
  /** Labels per output field. */
  maxOutputLabels: 8,
  maxSummaries: 5,
  /** Records per input batch, and across all of a task's batches. */
  maxRecords: 64,
  /** Input batches (`inputs` entries). */
  maxBatches: 8,
  /** Canonical bytes of one input record. */
  maxRecordBytes: 4_096,
  /** Entries inside one summary's `counts`. */
  maxSummaryCounts: 40,
} as const;

/** Field the record schema must declare: the record's public id, echoed in
 * each result as `recordId`. */
export const RECORD_ID_FIELD = "id" as const;

/** The fixed condition-slot vocabulary. Rule `when` maps may only name
 * these keys; non-label slots require the record schema to declare a field
 * of the same name and matching kind, so a conforming pipeline can
 * implement matching over a closed vocabulary. */
export const NUMERIC_SLOTS = [
  "severity",
  "amount",
  "prior-contacts",
  "account-age-days",
  "wait-minutes",
  "satisfaction-score",
] as const;
export const CATEGORICAL_SLOTS = ["channel", "tier", "region", "device", "locale"] as const;
export const BOOLEAN_SLOTS = ["outage", "verified"] as const;
export const CONDITION_SLOTS = [
  "label",
  ...NUMERIC_SLOTS,
  ...CATEGORICAL_SLOTS,
  ...BOOLEAN_SLOTS,
] as const;

/** The fixed output-field names every task's `outputFormat.fields` declares. */
export const OUTPUT_FIELDS = ["decision", "priority", "queue"] as const;
export const SUMMARY_NAMES = ["total", "perLabel", "perDecision", "perPriority", "perQueue"] as const;
export const EXPERIMENT_PHASES = ["acquisition", "unseen", "shift"] as const;
export const EXPERIMENT_SPLITS = ["train", "validation", "holdout"] as const;

export type ExperimentPhase = (typeof EXPERIMENT_PHASES)[number];
export type ExperimentSplit = (typeof EXPERIMENT_SPLITS)[number];
export type OutputField = (typeof OUTPUT_FIELDS)[number];
export type SummaryName = (typeof SUMMARY_NAMES)[number];

export type TaskClass = { id: string; about: string };
export type TaskTaxonomy = { classes: TaskClass[] };

export type TaskRecordField =
  | { name: string; kind: "text"; maxLength: number }
  | { name: string; kind: "int"; min: number; max: number }
  | { name: string; kind: "choice"; labels: string[] }
  | { name: string; kind: "bool" };
export type TaskRecordSchema = { fields: TaskRecordField[] };

export type NumericCondition = { min?: number; max?: number; eq?: number };
export type LabelCondition = { in: string[] };
export type TaskRuleWhen = { label?: LabelCondition } & {
  [K in (typeof NUMERIC_SLOTS)[number]]?: NumericCondition;
} & {
  [K in (typeof CATEGORICAL_SLOTS)[number]]?: LabelCondition;
} & {
  [K in (typeof BOOLEAN_SLOTS)[number]]?: boolean;
};

export type TaskDecision = Record<OutputField, string>;
export type TaskRule = { id: string; when: TaskRuleWhen; then: Partial<TaskDecision> };

export type TaskOutputFormat = {
  fields: { [K in OutputField]: string[] };
  summaries: SummaryName[];
};

export type TaskResult = { recordId: string; label: string } & TaskDecision;
export type TaskSummaryEntry = { name: SummaryName; counts: { key: string; count: number }[] };
/** The value a conforming pipeline's `out` interface output must carry. */
export type TaskOutput = { results: TaskResult[]; summary: TaskSummaryEntry[] };

export type TaskBatch = {
  id: string;
  split: ExperimentSplit;
  records: JsonObject[];
  /** The declared expected outputs map: `{out: {results, summary}}`. */
  expect: { out: TaskOutput };
};

export type ExperimentGrader =
  | { kind: "exact" }
  | { kind: "scorer"; scorer: ExprEnvelope; passAt: number };

export type TaskFamily = {
  id: typeof EXPERIMENT_TASK_FAMILY;
  /** The family config's seed, this task's index, and the config digest. */
  seed: number;
  index: number;
  config: Digest;
  /** Shift tasks name the base task they revise. */
  revisedFrom?: string;
};

export type ExperimentTaskSpec = {
  contract: typeof EXPERIMENT_TASK_CONTRACT;
  taskId: string;
  phase: ExperimentPhase;
  family: TaskFamily;
  taxonomy: TaskTaxonomy;
  recordSchema: TaskRecordSchema;
  rules: TaskRule[];
  outputFormat: TaskOutputFormat;
  inputs: TaskBatch[];
  grader: ExperimentGrader;
  digest: Digest;
};

export type ExperimentGrade = {
  contract: typeof EXPERIMENT_GRADE_CONTRACT;
  taskId: string;
  taskDigest: Digest;
  case: string;
  split: ExperimentSplit;
  /** The measured score in [0,1]: 1 for exact matches, the scorer
   * program's value for scorer graders. */
  score: number;
  /** The declared threshold `passed` was compared against. */
  passAt: number;
  passed: boolean;
  expect: { out: TaskOutput };
  outputs: Record<string, JsonValue>;
  digest: Digest;
};

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", `experiment task: ${message}`);
}

function intIn(value: unknown, min: number, max: number, at: string): number {
  return asInt(value, `experiment task ${at}`, min, max);
}

function text(value: unknown, maxLen: number, at: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLen) {
    fail(`${at} must be a nonempty string of at most ${maxLen} characters`);
  }
  return value;
}

function safeId(value: unknown, at: string, maxLen: number = EXPERIMENT_TASK_BOUNDS.maxIdLen): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLen || !/^[a-z][a-z0-9-]*$/.test(value)) {
    fail(`${at} must be a lowercase kebab-case id of at most ${maxLen} characters`);
  }
  return value;
}

function labelText(value: unknown, at: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > EXPERIMENT_TASK_BOUNDS.maxLabelLen) {
    fail(`${at} must be a nonempty string of at most ${EXPERIMENT_TASK_BOUNDS.maxLabelLen} characters`);
  }
  return value;
}

function closedRecord(value: unknown, fields: readonly string[], at: string): JsonObject {
  const record = asObject(value, `experiment task ${at}`);
  noUnknownKeys(record, fields, `experiment task ${at}`);
  return record;
}

function labelList(value: unknown, min: number, max: number, at: string): string[] {
  const list = asArray(value, `experiment task ${at}`);
  if (list.length < min || list.length > max) fail(`${at} must list ${min}..${max} values`);
  const labels = list.map((entry, i) => labelText(entry, `${at}[${i}]`));
  if (new Set(labels).size !== labels.length) fail(`${at} repeats a value`);
  return labels;
}

// ----------------------------------------------------------------- schema ---

function parseSchemaField(value: unknown, at: string): TaskRecordField {
  const raw = asObject(value, `experiment task ${at}`);
  const name = safeId(reqField(raw, "name", `experiment task ${at}`), `${at}.name`, EXPERIMENT_TASK_BOUNDS.maxFieldNameLen);
  const kind = reqField(raw, "kind", `experiment task ${at}`);
  if (kind === "text") {
    noUnknownKeys(raw, ["name", "kind", "maxLength"], `experiment task ${at}`);
    const maxLength = intIn(reqField(raw, "maxLength", `experiment task ${at}`), 1, EXPERIMENT_TASK_BOUNDS.maxTextLen, `${at}.maxLength`);
    return { name, kind: "text", maxLength };
  }
  if (kind === "int") {
    noUnknownKeys(raw, ["name", "kind", "min", "max"], `experiment task ${at}`);
    const min = intIn(reqField(raw, "min", `experiment task ${at}`), -1_000_000_000, 1_000_000_000, `${at}.min`);
    const max = intIn(reqField(raw, "max", `experiment task ${at}`), -1_000_000_000, 1_000_000_000, `${at}.max`);
    if (min > max) fail(`${at}.min exceeds ${at}.max`);
    return { name, kind: "int", min, max };
  }
  if (kind === "choice") {
    noUnknownKeys(raw, ["name", "kind", "labels"], `experiment task ${at}`);
    return { name, kind: "choice", labels: labelList(reqField(raw, "labels", `experiment task ${at}`), 2, EXPERIMENT_TASK_BOUNDS.maxLabels, `${at}.labels`) };
  }
  if (kind === "bool") {
    noUnknownKeys(raw, ["name", "kind"], `experiment task ${at}`);
    return { name, kind: "bool" };
  }
  fail(`${at}.kind must be text, int, choice, or bool`);
}

export function parseRecordSchema(value: unknown, at = "recordSchema"): TaskRecordSchema {
  const schema = closedRecord(value, ["fields"], at);
  const list = asArray(reqField(schema, "fields", `experiment task ${at}`), `experiment task ${at}.fields`);
  if (list.length < 1 || list.length > EXPERIMENT_TASK_BOUNDS.maxSchemaFields) {
    fail(`${at}.fields must list 1..${EXPERIMENT_TASK_BOUNDS.maxSchemaFields} fields`);
  }
  const fields = list.map((entry, i) => parseSchemaField(entry, `${at}.fields[${i}]`));
  const names = new Set<string>();
  for (const field of fields) {
    if (names.has(field.name)) fail(`${at}.fields repeats "${field.name}"`);
    names.add(field.name);
  }
  const id = fields.find((field) => field.name === RECORD_ID_FIELD);
  if (!id) fail(`${at}.fields must declare the "${RECORD_ID_FIELD}" field`);
  if (id.kind !== "text") fail(`${at}.fields["${RECORD_ID_FIELD}"] must be text`);
  return { fields };
}

/** Check one record value against the schema: a closed object carrying
 * exactly the declared fields with conforming values. */
export function checkTaskRecord(schema: TaskRecordSchema, record: unknown, at: string): JsonObject {
  const value = closedRecord(record, schema.fields.map((field) => field.name), at);
  for (const field of schema.fields) {
    const v = value[field.name];
    switch (field.kind) {
      case "text":
        if (typeof v !== "string" || v.length > field.maxLength) fail(`${at}.${field.name} must be a string of at most ${field.maxLength} characters`);
        break;
      case "int":
        if (typeof v !== "number" || !Number.isInteger(v) || v < field.min || v > field.max) fail(`${at}.${field.name} must be an integer in ${field.min}..${field.max}`);
        break;
      case "choice":
        if (typeof v !== "string" || !field.labels.includes(v)) fail(`${at}.${field.name} must be one of its labels`);
        break;
      case "bool":
        if (typeof v !== "boolean") fail(`${at}.${field.name} must be a boolean`);
        break;
    }
  }
  return value;
}

// ------------------------------------------------------------------ rules ---

function parseNumericCondition(value: unknown, at: string): NumericCondition {
  const cond = closedRecord(value, ["min", "max", "eq"], at);
  const out: NumericCondition = {};
  if (cond.min !== undefined) out.min = intIn(cond.min, -1_000_000_000, 1_000_000_000, `${at}.min`);
  if (cond.max !== undefined) out.max = intIn(cond.max, -1_000_000_000, 1_000_000_000, `${at}.max`);
  if (cond.eq !== undefined) out.eq = intIn(cond.eq, -1_000_000_000, 1_000_000_000, `${at}.eq`);
  if (out.min === undefined && out.max === undefined && out.eq === undefined) fail(`${at} must declare min, max, or eq`);
  if (out.min !== undefined && out.max !== undefined && out.min > out.max) fail(`${at}.min exceeds ${at}.max`);
  if (out.eq !== undefined) {
    if (out.min !== undefined && out.eq < out.min) fail(`${at}.eq is below ${at}.min`);
    if (out.max !== undefined && out.eq > out.max) fail(`${at}.eq is above ${at}.max`);
  }
  return out;
}

function parseInCondition(value: unknown, at: string): LabelCondition {
  const cond = closedRecord(value, ["in"], at);
  return { in: labelList(reqField(cond, "in", `experiment task ${at}`), 1, EXPERIMENT_TASK_BOUNDS.maxInValues, `${at}.in`) };
}

function parseRuleWhen(value: unknown, schema: TaskRecordSchema, classes: Set<string>, at: string): TaskRuleWhen {
  const when = closedRecord(value, CONDITION_SLOTS, at);
  const out: Record<string, unknown> = {};
  for (const [slot, raw] of Object.entries(when)) {
    const slotAt = `${at}.${slot}`;
    if (slot === "label") {
      const cond = parseInCondition(raw, slotAt);
      for (const id of cond.in) if (!classes.has(id)) fail(`${slotAt}.in names undeclared class "${id}"`);
      out[slot] = cond;
    } else if ((NUMERIC_SLOTS as readonly string[]).includes(slot)) {
      const field = schema.fields.find((f) => f.name === slot);
      if (!field) fail(`${slotAt} conditions on a field the record schema does not declare`);
      if (field.kind !== "int") fail(`${slotAt} requires an int field`);
      const cond = parseNumericCondition(raw, slotAt);
      for (const bound of [cond.min, cond.max, cond.eq]) {
        if (bound !== undefined && (bound < field.min || bound > field.max)) fail(`${slotAt} bound ${bound} is outside ${slot}'s ${field.min}..${field.max}`);
      }
      out[slot] = cond;
    } else if ((CATEGORICAL_SLOTS as readonly string[]).includes(slot)) {
      const field = schema.fields.find((f) => f.name === slot);
      if (!field) fail(`${slotAt} conditions on a field the record schema does not declare`);
      if (field.kind !== "choice") fail(`${slotAt} requires a choice field`);
      const cond = parseInCondition(raw, slotAt);
      for (const label of cond.in) if (!field.labels.includes(label)) fail(`${slotAt}.in names undeclared label "${label}"`);
      out[slot] = cond;
    } else {
      const field = schema.fields.find((f) => f.name === slot);
      if (!field) fail(`${slotAt} conditions on a field the record schema does not declare`);
      if (field.kind !== "bool") fail(`${slotAt} requires a bool field`);
      if (typeof raw !== "boolean") fail(`${slotAt} must be a boolean`);
      out[slot] = raw;
    }
  }
  return out as TaskRuleWhen;
}

function parseRules(value: unknown, schema: TaskRecordSchema, classes: Set<string>, fields: { [K in OutputField]: string[] }, at = "rules"): TaskRule[] {
  const list = asArray(value, `experiment task ${at}`);
  if (list.length < 1 || list.length > EXPERIMENT_TASK_BOUNDS.maxRules) fail(`${at} must list 1..${EXPERIMENT_TASK_BOUNDS.maxRules} rules`);
  const ids = new Set<string>();
  const rules = list.map((raw, i): TaskRule => {
    const rule = closedRecord(raw, ["id", "when", "then"], `${at}[${i}]`);
    const id = safeId(reqField(rule, "id", `experiment task ${at}[${i}]`), `${at}[${i}].id`, EXPERIMENT_TASK_BOUNDS.maxRuleIdLen);
    if (ids.has(id)) fail(`${at}[${i}].id repeats "${id}"`);
    ids.add(id);
    const when = parseRuleWhen(reqField(rule, "when", `experiment task ${at}[${i}]`), schema, classes, `${at}[${i}].when`);
    if (Object.keys(when).length > EXPERIMENT_TASK_BOUNDS.maxWhenSlots) fail(`${at}[${i}].when carries more than ${EXPERIMENT_TASK_BOUNDS.maxWhenSlots} slots`);
    const then = closedRecord(reqField(rule, "then", `experiment task ${at}[${i}]`), OUTPUT_FIELDS, `${at}[${i}].then`);
    const assign: Partial<TaskDecision> = {};
    for (const [field, rawLabel] of Object.entries(then)) {
      const name = field as OutputField;
      const label = labelText(rawLabel, `${at}[${i}].then.${field}`);
      if (!fields[name].includes(label)) fail(`${at}[${i}].then.${field} names undeclared label "${label}"`);
      assign[name] = label;
    }
    if (Object.keys(assign).length === 0) fail(`${at}[${i}].then must set at least one field`);
    return { id, when, then: assign };
  });
  const first = rules[0]!;
  if (Object.keys(first.when).length !== 0) fail(`${at}[0].when must be empty — the first rule is the default`);
  for (const field of OUTPUT_FIELDS) {
    if (first.then[field] === undefined) fail(`${at}[0].then must set "${field}" so every record receives a complete decision`);
  }
  return rules;
}

// ------------------------------------------------------------ output format ---

function parseOutputFormat(value: unknown, at = "outputFormat"): TaskOutputFormat {
  const format = closedRecord(value, ["fields", "summaries"], at);
  const fieldsRaw = closedRecord(reqField(format, "fields", `experiment task ${at}`), OUTPUT_FIELDS, `${at}.fields`);
  const fields = {} as { [K in OutputField]: string[] };
  for (const name of OUTPUT_FIELDS) {
    fields[name] = labelList(reqField(fieldsRaw, name, `experiment task ${at}.fields`), 2, EXPERIMENT_TASK_BOUNDS.maxOutputLabels, `${at}.fields.${name}`);
  }
  const summaries = asArray(reqField(format, "summaries", `experiment task ${at}`), `experiment task ${at}.summaries`).map((raw, i) => {
    if (typeof raw !== "string" || !(SUMMARY_NAMES as readonly string[]).includes(raw)) {
      fail(`${at}.summaries[${i}] must be one of ${SUMMARY_NAMES.join(", ")}`);
    }
    return raw as SummaryName;
  });
  if (summaries.length < 1 || summaries.length > EXPERIMENT_TASK_BOUNDS.maxSummaries) fail(`${at}.summaries must list 1..${EXPERIMENT_TASK_BOUNDS.maxSummaries} names`);
  if (new Set(summaries).size !== summaries.length) fail(`${at}.summaries repeats a name`);
  return { fields, summaries };
}

// ----------------------------------------------------------------- expect ---

function parseExpect(value: unknown, records: JsonObject[], classes: Set<string>, format: TaskOutputFormat, at: string): { out: TaskOutput } {
  const wrapper = closedRecord(value, ["out"], at);
  const out = closedRecord(reqField(wrapper, "out", `experiment task ${at}`), ["results", "summary"], `${at}.out`);
  const results = asArray(reqField(out, "results", `experiment task ${at}.out`), `experiment task ${at}.out.results`).map((raw, i): TaskResult => {
    const result = closedRecord(raw, ["recordId", "label", "decision", "priority", "queue"], `${at}.out.results[${i}]`);
    const record = records[i];
    const recordId = safeId(reqField(result, "recordId", `experiment task ${at}.out.results[${i}]`), `${at}.out.results[${i}].recordId`);
    if (record === undefined || record[RECORD_ID_FIELD] !== recordId) {
      fail(`${at}.out.results[${i}].recordId must be the id of records[${i}]`);
    }
    const label = safeId(reqField(result, "label", `experiment task ${at}.out.results[${i}]`), `${at}.out.results[${i}].label`, EXPERIMENT_TASK_BOUNDS.maxClassIdLen);
    if (!classes.has(label)) fail(`${at}.out.results[${i}].label names undeclared class "${label}"`);
    const decision = {} as TaskDecision;
    for (const field of OUTPUT_FIELDS) {
      const labelValue = labelText(reqField(result, field, `experiment task ${at}.out.results[${i}]`), `${at}.out.results[${i}].${field}`);
      if (!format.fields[field].includes(labelValue)) fail(`${at}.out.results[${i}].${field} names undeclared label "${labelValue}"`);
      decision[field] = labelValue;
    }
    return { recordId, label, ...decision };
  });
  if (results.length !== records.length) fail(`${at}.out.results must list one result per record`);
  const summaryList = asArray(reqField(out, "summary", `experiment task ${at}.out`), `experiment task ${at}.out.summary`);
  if (summaryList.length !== format.summaries.length) {
    fail(`${at}.out.summary must list one entry per declared summary`);
  }
  const summary = summaryList.map((raw, i): TaskSummaryEntry => {
    const entry = closedRecord(raw, ["name", "counts"], `${at}.out.summary[${i}]`);
    const name = reqField(entry, "name", `experiment task ${at}.out.summary[${i}]`);
    if (format.summaries[i] !== name) fail(`${at}.out.summary[${i}].name must be "${format.summaries[i]}"`);
    const counts = asArray(reqField(entry, "counts", `experiment task ${at}.out.summary[${i}]`), `experiment task ${at}.out.summary[${i}].counts`);
    if (counts.length > EXPERIMENT_TASK_BOUNDS.maxSummaryCounts) fail(`${at}.out.summary[${i}].counts exceeds ${EXPERIMENT_TASK_BOUNDS.maxSummaryCounts} entries`);
    const keys = new Set<string>();
    return {
      name: name as SummaryName,
      counts: counts.map((rawCount, j) => {
        const count = closedRecord(rawCount, ["key", "count"], `${at}.out.summary[${i}].counts[${j}]`);
        const key = text(reqField(count, "key", `experiment task ${at}.out.summary[${i}].counts[${j}]`), EXPERIMENT_TASK_BOUNDS.maxLabelLen + EXPERIMENT_TASK_BOUNDS.maxFieldNameLen, `${at}.out.summary[${i}].counts[${j}].key`);
        if (keys.has(key)) fail(`${at}.out.summary[${i}].counts repeats key "${key}"`);
        keys.add(key);
        return { key, count: intIn(reqField(count, "count", `experiment task ${at}.out.summary[${i}].counts[${j}]`), 0, EXPERIMENT_TASK_BOUNDS.maxRecords, `${at}.out.summary[${i}].counts[${j}].count`) };
      }),
    };
  });
  return { out: { results, summary } };
}

function parseExperimentGrader(value: unknown): ExperimentGrader {
  const grader = closedRecord(value, ["kind", "scorer", "passAt"], "grader");
  const kind = reqField(grader, "kind", "experiment task grader");
  if (kind === "exact") {
    if (grader.scorer !== undefined || grader.passAt !== undefined) fail("an exact grader declares no scorer or passAt");
    return { kind: "exact" };
  }
  if (kind !== "scorer") fail("grader.kind must be exact or scorer");
  const scorer = parseExprEnvelope(reqField(grader, "scorer", "experiment task grader"), "experiment task grader.scorer");
  const check = checkProgram(scorer.program, ["args", "expect", "outputs"]);
  if (!check.ok) throw new AlgalError("SCORER_INVALID", `experiment task grader.scorer ${canonicalize(check.err)}`);
  const passAt = reqField(grader, "passAt", "experiment task grader");
  if (typeof passAt !== "number" || !Number.isFinite(passAt) || passAt < 0 || passAt > 1) fail("grader.passAt must be a number in [0,1]");
  return { kind: "scorer", scorer, passAt };
}

// ------------------------------------------------------------------ parse ---

/** Parses a closed `algal.experiment-task.v1` record: every field checked,
 * every referenced class/label/field resolved, records conformed to the
 * schema, and the self-`digest` recomputed. Semantic expectation checks
 * (rule replay and summary recomputation) live in
 * `taskExpectationMismatches`. */
export function parseExperimentTaskSpec(value: unknown): ExperimentTaskSpec {
  const spec = closedRecord(value, ["contract", "taskId", "phase", "family", "taxonomy", "recordSchema", "rules", "outputFormat", "inputs", "grader", "digest"], "record");
  if (spec.contract !== EXPERIMENT_TASK_CONTRACT) fail(`contract must be ${EXPERIMENT_TASK_CONTRACT}`);
  const taskId = safeId(reqField(spec, "taskId", "experiment task record"), "taskId", EXPERIMENT_TASK_BOUNDS.maxTaskIdLen);
  const phase = reqField(spec, "phase", "experiment task record");
  if (typeof phase !== "string" || !(EXPERIMENT_PHASES as readonly string[]).includes(phase)) fail(`phase must be one of ${EXPERIMENT_PHASES.join(", ")}`);
  const familyRaw = closedRecord(reqField(spec, "family", "experiment task record"), ["id", "seed", "index", "config", "revisedFrom"], "family");
  if (familyRaw.id !== EXPERIMENT_TASK_FAMILY) fail(`family.id must be ${EXPERIMENT_TASK_FAMILY}`);
  const family: TaskFamily = {
    id: EXPERIMENT_TASK_FAMILY,
    seed: intIn(reqField(familyRaw, "seed", "experiment task family"), 0, 4_294_967_295, "family.seed"),
    index: intIn(reqField(familyRaw, "index", "experiment task family"), 0, 255, "family.index"),
    config: asDigest(reqField(familyRaw, "config", "experiment task family"), "experiment task family.config"),
  };
  if (familyRaw.revisedFrom !== undefined) family.revisedFrom = safeId(familyRaw.revisedFrom, "family.revisedFrom", EXPERIMENT_TASK_BOUNDS.maxTaskIdLen);

  const taxonomyRaw = closedRecord(reqField(spec, "taxonomy", "experiment task record"), ["classes"], "taxonomy");
  const classList = asArray(reqField(taxonomyRaw, "classes", "experiment task taxonomy"), "experiment task taxonomy.classes");
  if (classList.length < 1 || classList.length > EXPERIMENT_TASK_BOUNDS.maxClasses) fail(`taxonomy.classes must list 1..${EXPERIMENT_TASK_BOUNDS.maxClasses} classes`);
  const classes = classList.map((raw, i): TaskClass => {
    const entry = closedRecord(raw, ["id", "about"], `taxonomy.classes[${i}]`);
    return {
      id: safeId(reqField(entry, "id", `experiment task taxonomy.classes[${i}]`), `taxonomy.classes[${i}].id`, EXPERIMENT_TASK_BOUNDS.maxClassIdLen),
      about: text(reqField(entry, "about", `experiment task taxonomy.classes[${i}]`), EXPERIMENT_TASK_BOUNDS.maxClassAboutLen, `taxonomy.classes[${i}].about`),
    };
  });
  const classIds = new Set(classes.map((entry) => entry.id));
  if (classIds.size !== classes.length) fail("taxonomy.classes repeats an id");

  const recordSchema = parseRecordSchema(reqField(spec, "recordSchema", "experiment task record"));
  const outputFormat = parseOutputFormat(reqField(spec, "outputFormat", "experiment task record"));
  const rules = parseRules(reqField(spec, "rules", "experiment task record"), recordSchema, classIds, outputFormat.fields);

  const inputList = asArray(reqField(spec, "inputs", "experiment task record"), "experiment task inputs");
  if (inputList.length < 1 || inputList.length > EXPERIMENT_TASK_BOUNDS.maxBatches) fail(`inputs must list 1..${EXPERIMENT_TASK_BOUNDS.maxBatches} batches`);
  const batchIds = new Set<string>();
  const splits = new Set<string>();
  let totalRecords = 0;
  const inputs = inputList.map((raw, i): TaskBatch => {
    const at = `inputs[${i}]`;
    const batch = closedRecord(raw, ["id", "split", "records", "expect"], at);
    const id = safeId(reqField(batch, "id", `experiment task ${at}`), `${at}.id`);
    if (batchIds.has(id)) fail(`${at}.id repeats "${id}"`);
    batchIds.add(id);
    const split = reqField(batch, "split", `experiment task ${at}`);
    if (typeof split !== "string" || !(EXPERIMENT_SPLITS as readonly string[]).includes(split)) fail(`${at}.split must be one of ${EXPERIMENT_SPLITS.join(", ")}`);
    if (splits.has(split)) fail(`${at}.split repeats "${split}"`);
    splits.add(split);
    const records = asArray(reqField(batch, "records", `experiment task ${at}`), `experiment task ${at}.records`);
    if (records.length < 1 || records.length > EXPERIMENT_TASK_BOUNDS.maxRecords) fail(`${at}.records must list 1..${EXPERIMENT_TASK_BOUNDS.maxRecords} records`);
    totalRecords += records.length;
    if (totalRecords > EXPERIMENT_TASK_BOUNDS.maxRecords) fail(`inputs carry more than ${EXPERIMENT_TASK_BOUNDS.maxRecords} records in total`);
    const parsedRecords = records.map((record, j) => checkTaskRecord(recordSchema, record, `${at}.records[${j}]`));
    const recordIds = new Set(parsedRecords.map((record) => record[RECORD_ID_FIELD]));
    if (recordIds.size !== parsedRecords.length) fail(`${at}.records repeats an id`);
    const expect = parseExpect(reqField(batch, "expect", `experiment task ${at}`), parsedRecords, classIds, outputFormat, `${at}.expect`);
    return { id, split: split as ExperimentSplit, records: parsedRecords, expect };
  });
  if (!splits.has("train")) fail("inputs must include a train batch");
  if (!splits.has("validation")) fail("inputs must include a validation batch");
  if (!splits.has("holdout")) fail("inputs must include a holdout batch");

  const grader = parseExperimentGrader(reqField(spec, "grader", "experiment task record"));
  const digest = asDigest(reqField(spec, "digest", "experiment task record"), "experiment task digest");
  const body: JsonObject = { ...spec } as JsonObject;
  delete body["digest"];
  if (digestCanonical(body) !== digest) {
    throw new AlgalError("DIGEST_MISMATCH", "experiment task: digest does not match the record");
  }
  return {
    contract: EXPERIMENT_TASK_CONTRACT,
    taskId,
    phase: phase as ExperimentPhase,
    family,
    taxonomy: { classes },
    recordSchema,
    rules,
    outputFormat,
    inputs,
    grader,
    digest,
  };
}

// ------------------------------------------------------- reference semantics ---

/** True when every slot condition in `when` holds for the record and its
 * assigned label. `in` and boolean conditions compare by strict equality;
 * records are schema-checked at parse so conditioned fields are present. */
export function whenMatches(when: TaskRuleWhen, record: JsonObject, label: string): boolean {
  for (const [slot, cond] of Object.entries(when)) {
    if (cond === undefined) continue;
    if (slot === "label") {
      if (!(cond as LabelCondition).in.includes(label)) return false;
      continue;
    }
    const fieldValue = record[slot];
    if ((NUMERIC_SLOTS as readonly string[]).includes(slot)) {
      const c = cond as NumericCondition;
      if (typeof fieldValue !== "number" || !Number.isInteger(fieldValue)) return false;
      if (c.min !== undefined && fieldValue < c.min) return false;
      if (c.max !== undefined && fieldValue > c.max) return false;
      if (c.eq !== undefined && fieldValue !== c.eq) return false;
    } else if ((CATEGORICAL_SLOTS as readonly string[]).includes(slot)) {
      if (typeof fieldValue !== "string" || !(cond as LabelCondition).in.includes(fieldValue)) return false;
    } else {
      if (fieldValue !== cond) return false;
    }
  }
  return true;
}

/** Apply the ordered rules: each matching rule merges its `then` over the
 * accumulated decision; the first (default) rule guarantees totality. */
export function applyTaskRules(rules: TaskRule[], fields: { [K in OutputField]: string[] }, record: JsonObject, label: string): TaskDecision {
  const decision: Partial<TaskDecision> = {};
  for (const rule of rules) {
    if (!whenMatches(rule.when, record, label)) continue;
    Object.assign(decision, rule.then);
  }
  // A parsed spec's first rule is a complete default, so this is total.
  return {
    decision: decision.decision ?? fields.decision[0]!,
    priority: decision.priority ?? fields.priority[0]!,
    queue: decision.queue ?? fields.queue[0]!,
  };
}

/** The deterministic summary over a results list, in declared order. Every
 * taxonomy class and every declared output label appears, zero-filled. */
export function summarizeTaskResults(
  taxonomy: TaskTaxonomy,
  format: TaskOutputFormat,
  results: readonly TaskResult[],
): TaskSummaryEntry[] {
  const perField = (name: SummaryName, field: OutputField): TaskSummaryEntry => ({
    name,
    counts: format.fields[field].map((label) => ({ key: label, count: results.filter((result) => result[field] === label).length })),
  });
  return format.summaries.map((name): TaskSummaryEntry => {
    switch (name) {
      case "total":
        return { name, counts: [{ key: "records", count: results.length }] };
      case "perLabel":
        return { name, counts: taxonomy.classes.map((entry) => ({ key: entry.id, count: results.filter((result) => result.label === entry.id).length })) };
      case "perDecision":
        return perField(name, "decision");
      case "perPriority":
        return perField(name, "priority");
      case "perQueue":
        return perField(name, "queue");
    }
  });
}

/** The reference path: expected `out` for a batch — the given labels
 * carried into the rule engine, then the declared summaries recomputed.
 * The generator calls this with generated truth labels; `check` calls it
 * with the declared expected labels to verify the spec is self-consistent. */
export function expectedTaskOutput(
  statement: Pick<ExperimentTaskSpec, "taxonomy" | "recordSchema" | "rules" | "outputFormat">,
  records: readonly JsonObject[],
  labels: readonly string[],
): TaskOutput {
  const results = records.map((record, i): TaskResult => ({
    recordId: record[RECORD_ID_FIELD] as string,
    label: labels[i]!,
    ...applyTaskRules(statement.rules, statement.outputFormat.fields, record, labels[i]!),
  }));
  return { results, summary: summarizeTaskResults(statement.taxonomy, statement.outputFormat, results) };
}

/** The `spec` interface input: the task statement a conforming pipeline
 * reads, `{taxonomy, recordSchema, rules, outputFormat}`. */
export function taskSpecData(task: Pick<ExperimentTaskSpec, "taxonomy" | "recordSchema" | "rules" | "outputFormat">): JsonObject {
  return {
    taxonomy: task.taxonomy as unknown as JsonObject,
    recordSchema: task.recordSchema as unknown as JsonObject,
    rules: task.rules as unknown as JsonObject,
    outputFormat: task.outputFormat as unknown as JsonObject,
  };
}

/** Interface args for one batch: `{records, spec}`. */
export function taskBatchArgs(task: ExperimentTaskSpec, batch: TaskBatch): Record<string, JsonValue> {
  return {
    records: batch.records as unknown as JsonValue,
    spec: taskSpecData(task) as unknown as JsonValue,
  };
}

/** The spec rendered into the {id, split, args, expect} case shape the
 * foundry and bench paths consume. `args` keys are interface input names;
 * `expect` keys are interface output names. */
export function taskCases(task: ExperimentTaskSpec): { id: string; split: ExperimentSplit; args: Record<string, JsonValue>; expect: Record<string, JsonValue> }[] {
  return task.inputs.map((batch) => ({
    id: batch.id,
    split: batch.split,
    args: taskBatchArgs(task, batch),
    expect: { out: batch.expect.out as unknown as JsonValue },
  }));
}

/** A boolean pass/fail scorer for the foundry and bench paths: exact
 * graders need none (their default pass claim is canonical equality);
 * scorer graders compile to `score >= passAt` over the same
 * {args, expect, outputs} environment. */
export function taskFoundryScorer(task: ExperimentTaskSpec): ExprScorer | undefined {
  if (task.grader.kind === "exact") return undefined;
  return {
    contract: "algal.expr.v1",
    program: ["gte", task.grader.scorer.program, task.grader.passAt],
  };
}

// ------------------------------------------------------------------ grading ---

const GRADER_FUEL = 100_000;

/** Score one case's outputs under the task's grader. `outputs` is the
 * interface-output map the run produced (`{out: …}` for the conforming
 * shape). Exact graders compare canonically; scorer graders run the
 * declared `algal.expr.v1` program over {args, expect, outputs} and require
 * a finite number in [0,1]. */
export function gradeExperimentCase(
  task: ExperimentTaskSpec,
  batch: TaskBatch,
  outputs: Record<string, JsonValue>,
): ExperimentGrade {
  let score: number;
  let passAt: number;
  if (task.grader.kind === "exact") {
    score = canonicalize(outputs as JsonValue) === canonicalize({ out: batch.expect.out } as unknown as JsonValue) ? 1 : 0;
    passAt = 1;
  } else {
    const result = evalProgram(
      task.grader.scorer.program,
      { args: taskBatchArgs(task, batch), expect: { out: batch.expect.out } as unknown as JsonObject, outputs },
      GRADER_FUEL,
    );
    if (!result.ok) throw new AlgalError("SCORER_INVALID", `experiment task grader ${canonicalize(result.err)}`);
    if (typeof result.value !== "number" || !Number.isFinite(result.value) || result.value < 0 || result.value > 1) {
      throw new AlgalError("SCORER_INVALID", `experiment task grader must produce a score in [0,1], got ${canonicalize(result.value)}`);
    }
    score = result.value;
    passAt = task.grader.passAt;
  }
  const body = {
    contract: EXPERIMENT_GRADE_CONTRACT,
    taskId: task.taskId,
    taskDigest: task.digest,
    case: batch.id,
    split: batch.split,
    score,
    passAt,
    passed: score >= passAt,
    expect: batch.expect,
    outputs,
  };
  return { ...body, digest: digestCanonical(body as unknown as JsonValue) };
}

/** Recomputes a grade record from the task: the declared grader rerun over
 * the record's own outputs. Returns mismatch strings (empty = verified). */
export function gradeExperimentMismatches(task: ExperimentTaskSpec, grade: ExperimentGrade): string[] {
  const batch = task.inputs.find((entry) => entry.id === grade.case);
  const mismatches: string[] = [];
  if (grade.taskId !== task.taskId) mismatches.push(`grade taskId is not ${task.taskId}`);
  if (grade.taskDigest !== task.digest) mismatches.push("grade taskDigest differs");
  if (!batch) {
    mismatches.push(`task has no batch "${grade.case}"`);
    return mismatches;
  }
  if (batch.split !== grade.split) mismatches.push(`grade split is not ${batch.split}`);
  if (canonicalize(grade.expect as unknown as JsonValue) !== canonicalize(batch.expect as unknown as JsonValue)) {
    mismatches.push("grade expect differs from the declared expect");
  }
  const recomputed = gradeExperimentCase(task, batch, grade.outputs);
  if (recomputed.score !== grade.score) mismatches.push(`grade score ${grade.score} recomputes to ${recomputed.score}`);
  if (recomputed.passAt !== grade.passAt) mismatches.push(`grade passAt ${grade.passAt} recomputes to ${recomputed.passAt}`);
  if (recomputed.passed !== grade.passed) mismatches.push(`grade passed ${grade.passed} recomputes to ${recomputed.passed}`);
  const { digest: _digest, ...body } = grade;
  if (digestCanonical(body as unknown as JsonValue) !== grade.digest) mismatches.push("grade digest does not match the record");
  return mismatches;
}

export function parseExperimentGrade(value: unknown): ExperimentGrade {
  const record = closedRecord(value, ["contract", "taskId", "taskDigest", "case", "split", "score", "passAt", "passed", "expect", "outputs", "digest"], "grade record");
  if (record.contract !== EXPERIMENT_GRADE_CONTRACT) fail(`grade contract must be ${EXPERIMENT_GRADE_CONTRACT}`);
  const taskId = safeId(reqField(record, "taskId", "experiment grade record"), "grade.taskId", EXPERIMENT_TASK_BOUNDS.maxTaskIdLen);
  const taskDigest = asDigest(reqField(record, "taskDigest", "experiment grade record"), "experiment grade taskDigest");
  const caseId = safeId(reqField(record, "case", "experiment grade record"), "grade.case");
  const split = reqField(record, "split", "experiment grade record");
  if (typeof split !== "string" || !(EXPERIMENT_SPLITS as readonly string[]).includes(split)) fail("grade.split must be train, validation, or holdout");
  const score = reqField(record, "score", "experiment grade record");
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) fail("grade.score must be a number in [0,1]");
  const passAt = reqField(record, "passAt", "experiment grade record");
  if (typeof passAt !== "number" || !Number.isFinite(passAt) || passAt < 0 || passAt > 1) fail("grade.passAt must be a number in [0,1]");
  const passed = reqField(record, "passed", "experiment grade record");
  if (typeof passed !== "boolean") fail("grade.passed must be a boolean");
  if ((score >= passAt) !== passed) fail("grade.passed is not score >= passAt");
  const expect = asObject(reqField(record, "expect", "experiment grade record"), "experiment grade expect");
  const outputs = asObject(reqField(record, "outputs", "experiment grade record"), "experiment grade outputs");
  const digest = asDigest(reqField(record, "digest", "experiment grade record"), "experiment grade digest");
  const body: JsonObject = { ...record } as JsonObject;
  delete body["digest"];
  if (digestCanonical(body) !== digest) {
    throw new AlgalError("DIGEST_MISMATCH", "experiment grade: digest does not match the record");
  }
  return {
    contract: EXPERIMENT_GRADE_CONTRACT,
    taskId,
    taskDigest,
    case: caseId,
    split: split as ExperimentSplit,
    score,
    passAt,
    passed,
    expect: expect as unknown as { out: TaskOutput },
    outputs: outputs as Record<string, JsonValue>,
    digest,
  };
}

// ------------------------------------------------------------- check path ---

/** Semantic consistency for `experiment check`: replay the reference path
 * over each batch using the declared expected labels, and compare the
 * recomputed results and summaries against the declared expect. A spec
 * whose declared decisions contradict its own rules is invalid — the one
 * thing a spec cannot self-certify is whether each declared label is the
 * class a reader would assign, which is exactly what the study measures. */
export function taskExpectationMismatches(task: ExperimentTaskSpec): string[] {
  const mismatches: string[] = [];
  for (const batch of task.inputs) {
    const labels = batch.expect.out.results.map((result) => result.label);
    const expected = expectedTaskOutput(task, batch.records, labels);
    if (canonicalize(expected as unknown as JsonValue) !== canonicalize(batch.expect.out as unknown as JsonValue)) {
      mismatches.push(`${batch.id}: declared expect differs from the rules applied to its labels`);
      for (let i = 0; i < expected.results.length; i++) {
        const want = expected.results[i]!;
        const got = batch.expect.out.results[i]!;
        if (canonicalize(want as unknown as JsonValue) !== canonicalize(got as unknown as JsonValue)) {
          mismatches.push(`${batch.id}.results[${i}] (${got.recordId}): rules give ${canonicalize(want as unknown as JsonValue)}`);
        }
      }
      if (canonicalize(expected.summary as unknown as JsonValue) !== canonicalize(batch.expect.out.summary as unknown as JsonValue)) {
        mismatches.push(`${batch.id}.summary differs from the results`);
      }
    }
  }
  return mismatches;
}
