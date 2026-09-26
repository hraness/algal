// The seeded record-triage family generator for the cumulative-skill
// study. One bounded `algal.experiment-family.v1` config deterministically
// produces a set of `algal.experiment-task.v1` specs: same config bytes in,
// same task bytes out. There is no wall-clock and no ambient randomness —
// every draw runs through a small seeded PRNG implemented here.
//
// Three phases, disjoint by construction:
//   acquisition — the initial environment,
//   unseen      — the same generator under a different seed,
//   shift       — a base task regenerated from `evolve.fromSeed`, then
//                 revised: the schema gains fields, part of the taxonomy is
//                 swapped, and rule thresholds move, so a pipeline that only
//                 memorized the old environment fails while one that reads
//                 the declared spec adapts.
//
// Generated truth labels never enter the spec's records: the class is only
// reflected in the record's text, and the declared expected outputs are
// what grading scores. `taskExpectationMismatches` re-derives every
// decision and summary from the declared labels, so a committed spec is
// auditable without the generator.

import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  asArray,
  asInt,
  asObject,
  noUnknownKeys,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";
import {
  BOOLEAN_SLOTS,
  CATEGORICAL_SLOTS,
  EXPERIMENT_TASK_BOUNDS,
  EXPERIMENT_TASK_CONTRACT,
  EXPERIMENT_TASK_FAMILY,
  EXPERIMENT_PHASES,
  NUMERIC_SLOTS,
  OUTPUT_FIELDS,
  RECORD_ID_FIELD,
  SUMMARY_NAMES,
  expectedTaskOutput,
  parseExperimentTaskSpec,
  type ExperimentGrader,
  type ExperimentPhase,
  type ExperimentSplit,
  type ExperimentTaskSpec,
  type NumericCondition,
  type OutputField,
  type SummaryName,
  type TaskOutputFormat,
  type TaskRecordField,
  type TaskRecordSchema,
  type TaskRule,
  type TaskRuleWhen,
  type TaskTaxonomy,
} from "./experiment-task";

export const EXPERIMENT_FAMILY_CONTRACT = "algal.experiment-family.v1" as const;
export const EXPERIMENT_SET_CONTRACT = "algal.experiment-set.v1" as const;

export const EXPERIMENT_FAMILY_BOUNDS = {
  maxBytes: 65_536,
  maxTasks: 32,
  maxSplitRecords: EXPERIMENT_TASK_BOUNDS.maxRecords,
} as const;

// -------------------------------------------------------------- seeded rng ---

/** mulberry32: a small deterministic PRNG over 32-bit state. Implemented
 * here (not imported) so the generator has zero dependencies and identical
 * draws on every host. */
export class SeededRng {
  #state: number;
  constructor(seed: number) {
    this.#state = seed >>> 0;
  }
  /** Next 32-bit unsigned value. */
  u32(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let t = this.#state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0;
    return (t ^ (t >>> 14)) >>> 0;
  }
  /** Uniform float in [0,1). */
  next(): number {
    return this.u32() / 0x1_0000_0000;
  }
  /** Uniform integer in the inclusive range. */
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)]!;
  }
  /** Draw `count` distinct items in draw order (partial Fisher-Yates). */
  sample<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const out: T[] = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      out.push(pool.splice(this.int(0, pool.length - 1), 1)[0]!);
    }
    return out;
  }
  /** An independent stream derived from this one — used per task/batch so
   * counts and contents stay stable when neighbors change. */
  fork(salt: number): SeededRng {
    return new SeededRng((this.#state ^ Math.imul((salt >>> 0) + 0x9e3779b9, 0x85ebca6b)) >>> 0);
  }
}

// ------------------------------------------------------------------ config ---

export type ExperimentFamilyConfig = {
  contract: typeof EXPERIMENT_FAMILY_CONTRACT;
  family: typeof EXPERIMENT_TASK_FAMILY;
  seed: number;
  phase: ExperimentPhase;
  /** Number of task specs to emit (1..32). */
  tasks: number;
  /** Records per input batch; every split is required, total ≤ 64. */
  splits: { train: number; validation: number; holdout: number };
  shape: {
    classes: [number, number];
    optionalFields: [number, number];
    rules: [number, number];
    decisionLabels: [number, number];
    queueLabels: [number, number];
    summaries: [number, number];
    /** exact: canonical equality only; scorer: every task gets the bounded
     * measure scorer; mixed: exact on even task indexes, scorer on odd. */
    grader: "exact" | "scorer" | "mixed";
    /** Pass threshold on scorer tasks (0..1). */
    scorerPassAt: number;
  };
  /** Required for phase "shift": the base environment to revise. */
  evolve?: {
    fromSeed: number;
    /** The phase the base tasks were generated under; their taskIds name
     * what `family.revisedFrom` records. Defaults to "acquisition". */
    fromPhase?: "acquisition" | "unseen";
    /** Fields the record schema gains (from the reserved pool). */
    addFields: number;
    /** Taxonomy classes swapped for unseen pool classes. */
    reviseClasses: number;
    /** Rule threshold/membership edits applied after the swap. */
    jitterRules: number;
  };
};

export type ExperimentSetTask = { taskId: string; file: string; digest: Digest };
export type ExperimentSet = {
  contract: typeof EXPERIMENT_SET_CONTRACT;
  family: typeof EXPERIMENT_TASK_FAMILY;
  phase: ExperimentPhase;
  seed: number;
  config: Digest;
  tasks: ExperimentSetTask[];
  digest: Digest;
};

export type GeneratedTaskSet = {
  set: ExperimentSet;
  tasks: ExperimentTaskSpec[];
};

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", `experiment family: ${message}`);
}

function closedRecord(value: unknown, fields: readonly string[], at: string): JsonObject {
  const record = asObject(value, `experiment family ${at}`);
  noUnknownKeys(record, fields, `experiment family ${at}`);
  return record;
}

function range(value: unknown, lo: number, hi: number, at: string): [number, number] {
  const pair = asArray(value, `experiment family ${at}`);
  if (pair.length !== 2) fail(`${at} must be a [min, max] pair`);
  const min = asInt(pair[0], `experiment family ${at}[0]`, lo, hi);
  const max = asInt(pair[1], `experiment family ${at}[1]`, lo, hi);
  if (min > max) fail(`${at}[0] exceeds ${at}[1]`);
  return [min, max];
}

export function parseExperimentFamilyConfig(value: unknown): ExperimentFamilyConfig {
  const config = closedRecord(value, ["contract", "family", "seed", "phase", "tasks", "splits", "shape", "evolve"], "config");
  if (config.contract !== EXPERIMENT_FAMILY_CONTRACT) fail(`contract must be ${EXPERIMENT_FAMILY_CONTRACT}`);
  if (config.family !== EXPERIMENT_TASK_FAMILY) fail(`family must be ${EXPERIMENT_TASK_FAMILY}`);
  const seed = asInt(reqField(config, "seed", "experiment family config"), "experiment family config.seed", 0, 4_294_967_295);
  const phase = reqField(config, "phase", "experiment family config");
  if (typeof phase !== "string" || !(EXPERIMENT_PHASES as readonly string[]).includes(phase)) {
    fail(`phase must be one of ${EXPERIMENT_PHASES.join(", ")}`);
  }
  const tasks = asInt(reqField(config, "tasks", "experiment family config"), "experiment family config.tasks", 1, EXPERIMENT_FAMILY_BOUNDS.maxTasks);
  const splitsRaw = closedRecord(reqField(config, "splits", "experiment family config"), ["train", "validation", "holdout"], "splits");
  const splits = {
    train: asInt(reqField(splitsRaw, "train", "experiment family splits"), "experiment family splits.train", 1, EXPERIMENT_FAMILY_BOUNDS.maxSplitRecords),
    validation: asInt(reqField(splitsRaw, "validation", "experiment family splits"), "experiment family splits.validation", 1, EXPERIMENT_FAMILY_BOUNDS.maxSplitRecords),
    holdout: asInt(reqField(splitsRaw, "holdout", "experiment family splits"), "experiment family splits.holdout", 1, EXPERIMENT_FAMILY_BOUNDS.maxSplitRecords),
  };
  if (splits.train + splits.validation + splits.holdout > EXPERIMENT_TASK_BOUNDS.maxRecords) {
    fail(`splits total ${splits.train + splits.validation + splits.holdout} records exceeds ${EXPERIMENT_TASK_BOUNDS.maxRecords}`);
  }
  const shapeRaw = closedRecord(reqField(config, "shape", "experiment family config"), ["classes", "optionalFields", "rules", "decisionLabels", "queueLabels", "summaries", "grader", "scorerPassAt"], "shape");
  const grader = reqField(shapeRaw, "grader", "experiment family shape");
  if (grader !== "exact" && grader !== "scorer" && grader !== "mixed") fail("shape.grader must be exact, scorer, or mixed");
  const scorerPassAt = reqField(shapeRaw, "scorerPassAt", "experiment family shape");
  if (typeof scorerPassAt !== "number" || !Number.isFinite(scorerPassAt) || scorerPassAt < 0 || scorerPassAt > 1) {
    fail("shape.scorerPassAt must be a number in [0,1]");
  }
  const shape: ExperimentFamilyConfig["shape"] = {
    classes: range(reqField(shapeRaw, "classes", "experiment family shape"), 2, 16, "shape.classes"),
    optionalFields: range(reqField(shapeRaw, "optionalFields", "experiment family shape"), 0, BASE_OPTIONAL_FIELDS.length, "shape.optionalFields"),
    rules: range(reqField(shapeRaw, "rules", "experiment family shape"), 2, EXPERIMENT_TASK_BOUNDS.maxRules, "shape.rules"),
    decisionLabels: range(reqField(shapeRaw, "decisionLabels", "experiment family shape"), 2, EXPERIMENT_TASK_BOUNDS.maxOutputLabels, "shape.decisionLabels"),
    queueLabels: range(reqField(shapeRaw, "queueLabels", "experiment family shape"), 2, EXPERIMENT_TASK_BOUNDS.maxOutputLabels, "shape.queueLabels"),
    summaries: range(reqField(shapeRaw, "summaries", "experiment family shape"), 1, SUMMARY_NAMES.length, "shape.summaries"),
    grader,
    scorerPassAt,
  };
  let evolve: ExperimentFamilyConfig["evolve"];
  if (config.evolve !== undefined) {
    const raw = closedRecord(config.evolve, ["fromSeed", "fromPhase", "addFields", "reviseClasses", "jitterRules"], "evolve");
    const fromPhase = raw.fromPhase;
    if (fromPhase !== undefined && fromPhase !== "acquisition" && fromPhase !== "unseen") {
      fail("evolve.fromPhase must be acquisition or unseen");
    }
    evolve = {
      fromSeed: asInt(reqField(raw, "fromSeed", "experiment family evolve"), "experiment family evolve.fromSeed", 0, 4_294_967_295),
      ...(fromPhase !== undefined ? { fromPhase } : {}),
      addFields: asInt(reqField(raw, "addFields", "experiment family evolve"), "experiment family evolve.addFields", 0, SHIFT_FIELDS.length),
      reviseClasses: asInt(reqField(raw, "reviseClasses", "experiment family evolve"), "experiment family evolve.reviseClasses", 0, 8),
      jitterRules: asInt(reqField(raw, "jitterRules", "experiment family evolve"), "experiment family evolve.jitterRules", 0, EXPERIMENT_TASK_BOUNDS.maxRules),
    };
  }
  if (phase === "shift" && evolve === undefined) fail("a shift config requires evolve");
  if (phase !== "shift" && evolve !== undefined) fail("evolve is only valid for phase shift");
  return { contract: EXPERIMENT_FAMILY_CONTRACT, family: EXPERIMENT_TASK_FAMILY, seed, phase: phase as ExperimentPhase, tasks, splits, shape, ...(evolve ? { evolve } : {}) };
}

/** Digest of the canonical config — binds a generated task to its
 * generator configuration. */
export function experimentFamilyConfigDigest(config: ExperimentFamilyConfig): Digest {
  return digestCanonical(config as unknown as JsonValue);
}

// ------------------------------------------------------------------ pools ---

type ClassTemplate = { id: string; about: string; subjects: string[]; bodies: string[]; hints: string[] };

/** The class vocabulary every task's taxonomy draws from. `subjects` and
 * `bodies` are the signal a classifier reads — `{n}` fills with a number,
 * `{thing}` with a noun phrase; `hints` are the distractor phrases the
 * generator sometimes leaks into a record of another class. */
const CLASS_POOL: ClassTemplate[] = [
  {
    id: "billing-inquiry",
    about: "Question about an invoice, charge, or payment method",
    subjects: ["Question about invoice {n}", "Charge on my {thing} bill", "Invoice total looks wrong"],
    bodies: ["My latest invoice lists a charge of {n} dollars I do not recognize.", "Can you explain the {n} dollar line item on my {thing} bill?", "The total on invoice {n} is higher than the quote I received."],
    hints: ["a charge I do not recognize", "the invoice total", "my last bill"],
  },
  {
    id: "billing-dispute",
    about: "A charge the customer says is wrong or duplicate",
    subjects: ["Duplicate charge of {n} dollars", "Charged twice this month", "Disputing a payment"],
    bodies: ["I was charged {n} dollars twice for the same {thing} order.", "There is a duplicate charge of {n} dollars on my card ending in {n}.", "Please reverse the second charge of {n} dollars; I only placed one order."],
    hints: ["charged twice", "a duplicate payment", "reverse the charge"],
  },
  {
    id: "refund-request",
    about: "Asking for money back on a purchase or subscription",
    subjects: ["Refund for order {n}", "Requesting my money back", "Refund after cancellation"],
    bodies: ["I cancelled within the window and would like the {n} dollars refunded.", "Please refund order {n}; the product never worked for us.", "I am requesting a refund of {n} dollars on my {thing} purchase."],
    hints: ["a refund", "my money back", "refund the order"],
  },
  {
    id: "subscription-change",
    about: "Upgrading, downgrading, or cancelling a plan",
    subjects: ["Change my plan", "Downgrade subscription", "Cancel my subscription"],
    bodies: ["Please move my {thing} subscription down to the cheaper tier.", "I want to cancel my subscription effective next cycle.", "Can I switch our {thing} plan from annual to monthly billing?"],
    hints: ["change my plan", "cancel the subscription", "a different tier"],
  },
  {
    id: "account-access",
    about: "Cannot reach the account: lockouts and ownership checks",
    subjects: ["Locked out of my account", "Cannot access workspace {n}", "Account locked"],
    bodies: ["My account was locked after the security review and I cannot sign in.", "I no longer have access to the email on the account.", "Our admin left and nobody can access the {thing} workspace now."],
    hints: ["locked out", "cannot sign in", "access to the account"],
  },
  {
    id: "login-problem",
    about: "Sign-in failures: passwords, codes, and sessions",
    subjects: ["Password reset not working", "Login code never arrives", "Session expires instantly"],
    bodies: ["The reset link for my account expires before the email arrives.", "Two-factor codes are rejected even though they are fresh.", "Every login redirects me back to the sign-in page."],
    hints: ["the login code", "sign-in", "the reset link"],
  },
  {
    id: "bug-report",
    about: "Something in the product is broken or errors out",
    subjects: ["Export crashes with error {n}", "Button does nothing", "Page throws an error"],
    bodies: ["Clicking save throws error {n} and my changes are lost.", "The dashboard shows a blank panel since the last update.", "Sync fails at {n} percent every single time."],
    hints: ["an error message", "it crashes", "a blank screen"],
  },
  {
    id: "performance-issue",
    about: "The product is slow, timing out, or degrading",
    subjects: ["Everything is slow today", "Requests timing out", "Pages take {n} seconds"],
    bodies: ["Every page takes {n} seconds to load since yesterday.", "Our reports time out after {n} seconds of waiting.", "The app is unusably slow during our morning peak."],
    hints: ["very slow", "times out", "takes forever to load"],
  },
  {
    id: "feature-request",
    about: "Asking for a capability the product does not have",
    subjects: ["Feature idea: bulk edit", "Please add {thing} support", "Suggestion for the roadmap"],
    bodies: ["Could you add a way to bulk-edit records? We have {n} of them.", "It would help if exports included {thing} fields.", "Feature request: scheduled reports for the {thing} view."],
    hints: ["it would be great if", "a feature request", "please add support"],
  },
  {
    id: "integration-help",
    about: "Help connecting the product to another system",
    subjects: ["Webhook not firing", "API returns {n} errors", "Help with the integration"],
    bodies: ["Our webhook endpoint never receives events from your side.", "The API returns {n} when we create a record.", "We cannot get the {thing} integration to sync contacts."],
    hints: ["the API", "our webhook", "the integration"],
  },
  {
    id: "service-outage",
    about: "The service itself appears down or unavailable",
    subjects: ["Is the service down?", "Cannot reach the app at all", "Outage on our side?"],
    bodies: ["Every request has failed for the last {n} minutes; is there an outage?", "The app is unreachable from two networks right now.", "Status page says green but we get {n} errors on every call."],
    hints: ["an outage", "is it down", "completely unreachable"],
  },
  {
    id: "security-concern",
    about: "Possible breach, phishing, or suspicious activity",
    subjects: ["Suspicious login from abroad", "Possible account compromise", "Phishing email pretending to be you"],
    bodies: ["I received a sign-in alert from a country I have never visited.", "Someone changed the recovery email on our account; it was not us.", "We got a phishing email asking for our {thing} credentials."],
    hints: ["suspicious activity", "a phishing email", "account compromise"],
  },
  {
    id: "data-export",
    about: "Getting data out of the product",
    subjects: ["Need a full data export", "Export our records", "Download all our data"],
    bodies: ["Please provide a complete export of our {n} records.", "How do we download all data for our {thing} workspace?", "We need the export for our audit before Friday."],
    hints: ["a data export", "download everything", "all our records"],
  },
  {
    id: "privacy-request",
    about: "Deletion, retention, and personal-data questions",
    subjects: ["Delete my personal data", "GDPR request", "What do you store about me"],
    bodies: ["Please delete all personal data tied to this account.", "Under data protection law I request a copy of my data.", "How long do you retain logs for account {n}?"],
    hints: ["delete my data", "personal information", "data retention"],
  },
  {
    id: "documentation",
    about: "Docs are missing, wrong, or hard to follow",
    subjects: ["Docs page is outdated", "Missing guide for {thing}", "Tutorial step is wrong"],
    bodies: ["The setup guide for {thing} references a menu that no longer exists.", "Your API docs do not document the {n} error code.", "The tutorial screenshots do not match the current product."],
    hints: ["the documentation", "the guide is wrong", "docs are outdated"],
  },
  {
    id: "shipping-delay",
    about: "A physical order is late or lost",
    subjects: ["Order {n} still not here", "Package stuck in transit", "Where is my shipment"],
    bodies: ["Order {n} was promised {n} days ago and has not moved since.", "Tracking says delivered but nothing arrived.", "Our {thing} shipment is two weeks late."],
    hints: ["the package", "tracking", "the shipment"],
  },
];

const THINGS = ["April", "team", "annual", "sandbox", "production", "monthly", "trial", "enterprise"];
const OPENERS = ["Hi team,", "Hello,", "Hi support,", "Good morning,"];
const CLOSERS = ["Thanks in advance.", "Please advise.", "Appreciate any help.", "This is blocking our work.", "We need this sorted this week."];

type FieldSpec = { name: string; field: TaskRecordField; value: (rng: SeededRng) => JsonValue };

const SEVERITY_WEIGHTS = [10, 25, 30, 22, 13];

function weightedIndex(rng: SeededRng, weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return i;
  }
  return weights.length - 1;
}

/** Fields every task's record schema declares, in declaration order. */
const CORE_FIELDS: FieldSpec[] = [
  { name: "id", field: { name: "id", kind: "text", maxLength: 32 }, value: () => "" },
  { name: "channel", field: { name: "channel", kind: "choice", labels: ["api", "chat", "email", "phone", "web"] }, value: (rng) => rng.pick(["api", "chat", "email", "phone", "web"]) },
  { name: "severity", field: { name: "severity", kind: "int", min: 1, max: 5 }, value: (rng) => weightedIndex(rng, SEVERITY_WEIGHTS) + 1 },
  { name: "tier", field: { name: "tier", kind: "choice", labels: ["enterprise", "free", "premium", "standard"] }, value: (rng) => rng.pick(["enterprise", "free", "premium", "standard"]) },
  { name: "subject", field: { name: "subject", kind: "text", maxLength: 240 }, value: () => "" },
  { name: "body", field: { name: "body", kind: "text", maxLength: 1024 }, value: () => "" },
];

/** Optional fields the base phases (acquisition, unseen) may draw. */
const BASE_OPTIONAL_FIELDS: FieldSpec[] = [
  { name: "amount", field: { name: "amount", kind: "int", min: 0, max: 50_000 }, value: (rng) => (rng.chance(0.5) ? rng.int(0, 2_000) : rng.int(0, 50_000)) },
  { name: "prior-contacts", field: { name: "prior-contacts", kind: "int", min: 0, max: 9 }, value: (rng) => rng.int(0, 9) },
  { name: "account-age-days", field: { name: "account-age-days", kind: "int", min: 0, max: 3_650 }, value: (rng) => rng.int(0, 3_650) },
  { name: "outage", field: { name: "outage", kind: "bool" }, value: (rng) => rng.chance(0.15) },
];

/** Fields reserved for the shift phase: the record schema only gains these
 * when the environment moves, so a generated pipeline that memorized the
 * old schema meets records it cannot see coming. */
const SHIFT_FIELDS: FieldSpec[] = [
  { name: "wait-minutes", field: { name: "wait-minutes", kind: "int", min: 0, max: 240 }, value: (rng) => rng.int(0, 240) },
  { name: "satisfaction-score", field: { name: "satisfaction-score", kind: "int", min: 1, max: 5 }, value: (rng) => weightedIndex(rng, SEVERITY_WEIGHTS) + 1 },
  { name: "region", field: { name: "region", kind: "choice", labels: ["apac", "eu", "latam", "na"] }, value: (rng) => rng.pick(["apac", "eu", "latam", "na"]) },
  { name: "device", field: { name: "device", kind: "choice", labels: ["android", "desktop", "ios", "web"] }, value: (rng) => rng.pick(["android", "desktop", "ios", "web"]) },
  { name: "locale", field: { name: "locale", kind: "choice", labels: ["de", "en", "es", "fr", "ja"] }, value: (rng) => rng.pick(["de", "en", "es", "fr", "ja"]) },
  { name: "verified", field: { name: "verified", kind: "bool" }, value: (rng) => rng.chance(0.6) },
];

const DECISION_POOL = ["escalate", "resolve", "review", "close", "monitor", "refund", "redirect", "defer"] as const;
const PRIORITY_POOL = ["p1", "p2", "p3", "p4"] as const;
const QUEUE_POOL = ["support", "billing", "engineering", "trust", "ops", "account", "logistics", "legal"] as const;

// ------------------------------------------------------------- generation ---

/** A task's complete internal state: the statement plus per-batch records
 * with their generated truth labels. */
type TaskSkeleton = {
  taxonomy: TaskTaxonomy;
  recordSchema: TaskRecordSchema;
  rules: TaskRule[];
  outputFormat: TaskOutputFormat;
  batches: { split: ExperimentSplit; records: JsonObject[]; labels: string[] }[];
};

function renderTemplate(rng: SeededRng, template: string): string {
  return template
    .replaceAll("{n}", String(rng.int(2, 9_800)))
    .replaceAll("{thing}", rng.pick(THINGS));
}

function renderRecordText(rng: SeededRng, klass: ClassTemplate, pool: readonly ClassTemplate[]): { subject: string; body: string } {
  const subject = renderTemplate(rng, rng.pick(klass.subjects));
  const parts: string[] = [];
  if (rng.chance(0.4)) parts.push(rng.pick(OPENERS));
  parts.push(renderTemplate(rng, rng.pick(klass.bodies)));
  if (rng.chance(0.25)) {
    const others = pool.filter((entry) => entry.id !== klass.id);
    parts.push(`Also, ${renderTemplate(rng, rng.pick(rng.pick(others).hints))} has been on my mind.`);
  }
  parts.push(rng.pick(CLOSERS));
  return { subject, body: parts.join(" ") };
}

function genNumericCondition(rng: SeededRng, field: TaskRecordField & { kind: "int" }): NumericCondition {
  const span = field.max - field.min;
  const kind = rng.next();
  if (kind < 0.4) return { min: field.min + Math.max(1, Math.round(span * (0.3 + rng.next() * 0.5))) };
  if (kind < 0.7) return { max: field.min + Math.max(0, Math.round(span * (0.15 + rng.next() * 0.5))) };
  if (kind < 0.85) {
    const min = field.min + Math.max(0, Math.round(span * rng.next() * 0.4));
    const max = Math.min(field.max, min + Math.max(1, Math.round(span * (0.15 + rng.next() * 0.3))));
    return { min, max };
  }
  return { eq: rng.int(field.min, field.max) };
}

function genRule(rng: SeededRng, index: number, classes: readonly string[], schema: TaskRecordSchema, format: TaskOutputFormat): TaskRule {
  // Slots the rule may condition on: label always; record fields only when
  // declared and of the matching kind.
  const numeric = schema.fields.filter((f) => f.kind === "int" && (NUMERIC_SLOTS as readonly string[]).includes(f.name));
  const categorical = schema.fields.filter((f) => f.kind === "choice" && (CATEGORICAL_SLOTS as readonly string[]).includes(f.name));
  const booleans = schema.fields.filter((f) => f.kind === "bool" && (BOOLEAN_SLOTS as readonly string[]).includes(f.name));
  const when: Record<string, unknown> = {};
  const slots = rng.int(1, 3);
  for (let s = 0; s < slots; s++) {
    const roll = rng.next();
    if (roll < 0.4) {
      when["label"] = { in: rng.sample(classes, rng.int(1, Math.min(3, classes.length))) };
    } else if (roll < 0.72 && numeric.length > 0) {
      const field = rng.pick(numeric);
      when[field.name] = genNumericCondition(rng, field as TaskRecordField & { kind: "int" });
    } else if (roll < 0.9 && categorical.length > 0) {
      const field = rng.pick(categorical);
      when[field.name] = { in: rng.sample(field.kind === "choice" ? field.labels : [], rng.int(1, 2)) };
    } else if (booleans.length > 0) {
      when[rng.pick(booleans).name] = rng.chance(0.8);
    } else {
      when["label"] = { in: rng.sample(classes, 1) };
    }
  }
  // Bias the assignment toward escalation when a high-severity or outage
  // condition is present, so the rule tables stay plausible.
  const urgent =
    (when["severity"] as NumericCondition | undefined)?.min !== undefined && (when["severity"] as NumericCondition).min! >= 4 ||
    when["outage"] === true ||
    ((when["label"] as { in: string[] } | undefined)?.in.some((id) => id === "security-concern" || id === "service-outage") ?? false);
  const then: Partial<Record<OutputField, string>> = {};
  const fieldCount = rng.int(1, 3);
  const picked = rng.sample([...OUTPUT_FIELDS], fieldCount);
  for (const field of picked) {
    const labels = format.fields[field];
    if (urgent && field === "decision" && labels.includes("escalate")) then[field] = "escalate";
    else if (urgent && field === "priority" && labels.includes("p1")) then[field] = "p1";
    else if (urgent && field === "queue" && labels.includes("trust") && ((when["label"] as { in: string[] } | undefined)?.in.includes("security-concern") || when["outage"] === true)) then[field] = "trust";
    else then[field] = rng.pick(labels);
  }
  return { id: `r${index}`, when: when as TaskRuleWhen, then };
}

function generateSkeleton(config: ExperimentFamilyConfig, index: number): TaskSkeleton {
  const rng = new SeededRng(config.seed).fork(index);
  const classCount = rng.int(config.shape.classes[0], config.shape.classes[1]);
  const classTemplates = rng.sample(CLASS_POOL, classCount);
  const taxonomy: TaskTaxonomy = { classes: classTemplates.map(({ id, about }) => ({ id, about })) };
  const classIds = classTemplates.map((entry) => entry.id);

  const optional = rng.sample(BASE_OPTIONAL_FIELDS, rng.int(config.shape.optionalFields[0], config.shape.optionalFields[1]));
  const recordSchema: TaskRecordSchema = {
    fields: [...CORE_FIELDS, ...optional].map((spec) => spec.field),
  };

  const decisionLabels = rng.sample(DECISION_POOL, rng.int(config.shape.decisionLabels[0], config.shape.decisionLabels[1]));
  const priorityLabels = PRIORITY_POOL.slice(0, rng.int(2, PRIORITY_POOL.length));
  const queueLabels = rng.sample(QUEUE_POOL, rng.int(config.shape.queueLabels[0], config.shape.queueLabels[1]));
  const summaryCount = rng.int(config.shape.summaries[0], config.shape.summaries[1]);
  const summaries: SummaryName[] = [];
  if (summaryCount >= 1 && rng.chance(0.9)) summaries.push("total");
  summaries.push(...(rng.sample(SUMMARY_NAMES.filter((n) => n !== "total"), summaryCount - summaries.length) as SummaryName[]));
  const outputFormat: TaskOutputFormat = {
    fields: { decision: decisionLabels, priority: [...priorityLabels], queue: queueLabels },
    summaries,
  };

  const ruleCount = rng.int(config.shape.rules[0], config.shape.rules[1]);
  const rules: TaskRule[] = [
    {
      id: "r0",
      when: {},
      then: {
        decision: rng.pick(decisionLabels),
        priority: rng.pick(priorityLabels),
        queue: rng.pick(queueLabels),
      },
    },
  ];
  for (let r = 1; r < ruleCount; r++) {
    rules.push(genRule(rng, r, classIds, recordSchema, outputFormat));
  }

  const valueFor = (name: string): ((rng: SeededRng) => JsonValue) | undefined =>
    [...CORE_FIELDS, ...optional].find((spec) => spec.name === name)?.value;
  const templateFor = new Map(classTemplates.map((entry) => [entry.id, entry]));
  const batches = (["train", "validation", "holdout"] as const).map((split, splitIndex) => {
    const records: JsonObject[] = [];
    const labels: string[] = [];
    const batchRng = rng.fork(1_000 + splitIndex);
    const count = config.splits[split];
    for (let i = 0; i < count; i++) {
      const truth = batchRng.pick(classIds);
      const template = templateFor.get(truth)!;
      const { subject, body } = renderRecordText(batchRng, template, CLASS_POOL);
      const record: JsonObject = { [RECORD_ID_FIELD]: `${split}-${String(i + 1).padStart(2, "0")}` };
      for (const field of recordSchema.fields) {
        if (field.name === "id") continue;
        if (field.name === "subject") { record["subject"] = subject; continue; }
        if (field.name === "body") { record["body"] = body; continue; }
        const gen = valueFor(field.name);
        record[field.name] = gen === undefined ? null : gen(batchRng);
      }
      records.push(record);
      labels.push(truth);
    }
    return { split, records, labels };
  });
  return { taxonomy, recordSchema, rules, outputFormat, batches };
}

// ------------------------------------------------------------- evolution ---

/** Shift-phase revision: same base skeleton, then the environment moves —
 * the schema gains reserved fields, part of the taxonomy is swapped
 * (records on a retired class are relabeled and their text regenerated),
 * and rule thresholds jitter. Expected outputs are always recomputed, so
 * the moved environment grades differently by construction. */
function evolveSkeleton(config: ExperimentFamilyConfig, index: number): { skeleton: TaskSkeleton; revisedFrom: string } {
  const evolve = config.evolve!;
  const fromPhase = evolve.fromPhase ?? "acquisition";
  const { evolve: _drop, ...rest } = config;
  const baseConfig: ExperimentFamilyConfig = { ...rest, seed: evolve.fromSeed, phase: fromPhase };
  const skeleton = generateSkeleton(baseConfig, index);
  const revisedFrom = `${fromPhase}-${padIndex(index)}`;
  const rng = new SeededRng(config.seed).fork(index);

  // 1. The record schema gains reserved fields.
  const have = new Set(skeleton.recordSchema.fields.map((f) => f.name));
  const gained = rng.sample(SHIFT_FIELDS.filter((spec) => !have.has(spec.name)), evolve.addFields);
  for (const spec of gained) skeleton.recordSchema.fields.push(spec.field);
  if (gained.length > 0) {
    for (const batch of skeleton.batches) {
      for (const record of batch.records) {
        for (const spec of gained) record[spec.name] = spec.value(rng);
      }
    }
  }

  // 2. The taxonomy is revised: swap out classes for unused pool classes.
  const swaps = Math.min(evolve.reviseClasses, skeleton.taxonomy.classes.length - 1);
  if (swaps > 0) {
    const current = skeleton.taxonomy.classes.map((entry) => entry.id);
    const removed = rng.sample(current, swaps);
    const unused = CLASS_POOL.filter((entry) => !current.includes(entry.id));
    const added = rng.sample(unused, swaps);
    const retired = new Set(removed);
    skeleton.taxonomy.classes = [
      ...skeleton.taxonomy.classes.filter((entry) => !retired.has(entry.id)),
      ...added.map(({ id, about }) => ({ id, about })),
    ];
    // Rules that conditioned on a retired class relearn nothing: retarget
    // their membership to the added classes so the rules stay meaningful.
    for (const rule of skeleton.rules) {
      const cond = rule.when.label;
      if (!cond) continue;
      cond.in = cond.in.flatMap((id) => (retired.has(id) ? added.map((entry) => entry.id) : [id]));
      cond.in = [...new Set(cond.in)];
    }
    const replacementIds = skeleton.taxonomy.classes.map((entry) => entry.id);
    const addedIds = added.map((entry) => entry.id);
    for (const batch of skeleton.batches) {
      for (let i = 0; i < batch.records.length; i++) {
        const truth = batch.labels[i]!;
        if (!retired.has(truth)) continue;
        const next = rng.chance(0.65) && addedIds.length > 0 ? rng.pick(addedIds) : rng.pick(replacementIds);
        batch.labels[i] = next;
        const template = CLASS_POOL.find((entry) => entry.id === next)!;
        const { subject, body } = renderRecordText(rng, template, CLASS_POOL);
        batch.records[i]!["subject"] = subject;
        batch.records[i]!["body"] = body;
      }
    }
  }

  // 3. Thresholds move: jitter rule conditions on declared fields. The
  // candidate edits are collected per rule — nudging a numeric bound,
  // swapping a categorical member, flipping a bool, or adding a condition
  // on a field the schema just gained — then one is drawn, so the moved
  // environment leans on the fields it introduced.
  const numericFields = new Map(
    skeleton.recordSchema.fields
      .filter((f) => f.kind === "int" && (NUMERIC_SLOTS as readonly string[]).includes(f.name))
      .map((f) => [f.name, f] as const),
  );
  const categoricalFields = new Map(
    skeleton.recordSchema.fields
      .filter((f) => f.kind === "choice" && (CATEGORICAL_SLOTS as readonly string[]).includes(f.name))
      .map((f) => [f.name, f] as const),
  );
  const gainedNames = new Set(gained.map((spec) => spec.name));
  for (let j = 0; j < evolve.jitterRules; j++) {
    const rule = skeleton.rules[rng.int(1, skeleton.rules.length - 1)]!;
    const when = rule.when as Record<string, unknown>;
    const edits: { kind: "numeric" | "categorical" | "bool" | "add"; slot: string; weight: number }[] = [];
    for (const slot of Object.keys(when)) {
      if (numericFields.has(slot)) edits.push({ kind: "numeric", slot, weight: 3 });
      else if (categoricalFields.has(slot)) edits.push({ kind: "categorical", slot, weight: 2 });
      else if (typeof when[slot] === "boolean") edits.push({ kind: "bool", slot, weight: 1 });
    }
    if (Object.keys(when).length < EXPERIMENT_TASK_BOUNDS.maxWhenSlots) {
      for (const [name] of numericFields) {
        if (when[name] === undefined) edits.push({ kind: "add", slot: name, weight: gainedNames.has(name) ? 4 : 1 });
      }
    }
    if (edits.length === 0) continue;
    const totalWeight = edits.reduce((sum, edit) => sum + edit.weight, 0);
    let roll = rng.next() * totalWeight;
    let edit = edits[0]!;
    for (const candidate of edits) {
      roll -= candidate.weight;
      if (roll < 0) { edit = candidate; break; }
    }
    if (edit.kind === "numeric") {
      const field = numericFields.get(edit.slot)! as TaskRecordField & { kind: "int" };
      const cond = when[edit.slot] as NumericCondition;
      const span = field.max - field.min;
      const step = Math.max(1, Math.round(span * (0.05 + rng.next() * 0.2)));
      if (cond.min !== undefined) cond.min = Math.min(field.max, Math.max(field.min, cond.min + (rng.chance(0.5) ? step : -step)));
      else if (cond.max !== undefined) cond.max = Math.min(field.max, Math.max(field.min, cond.max + (rng.chance(0.5) ? step : -step)));
      else if (cond.eq !== undefined) cond.eq = Math.min(field.max, Math.max(field.min, cond.eq + (rng.chance(0.5) ? step : -step)));
      if (cond.min !== undefined && cond.max !== undefined && cond.min > cond.max) {
        const swap = cond.min; cond.min = cond.max; cond.max = swap;
      }
    } else if (edit.kind === "categorical") {
      const field = categoricalFields.get(edit.slot)! as TaskRecordField & { kind: "choice" };
      const cond = when[edit.slot] as { in: string[] };
      const unused = field.labels.filter((label) => !cond.in.includes(label));
      if (unused.length > 0) cond.in[rng.int(0, cond.in.length - 1)] = rng.pick(unused);
    } else if (edit.kind === "bool") {
      when[edit.slot] = !when[edit.slot];
    } else {
      const field = numericFields.get(edit.slot)! as TaskRecordField & { kind: "int" };
      when[edit.slot] = genNumericCondition(rng, field);
    }
  }
  return { skeleton, revisedFrom };
}

// ------------------------------------------------------------------ tasks ---

/** The honest partial-credit scorer generated tasks can declare: a bounded
 * `algal.expr.v1` program over {args, expect, outputs} returning
 * 4/5 × (expected results found verbatim in the actual results) +
 * 1/5 × (summaries equal). Shapes that cannot be read score 0 — the scorer
 * never throws on missing `out`, it just gives no credit. */
const TASK_SCORER_PROGRAM: JsonValue = [
  "let", "er", ["get", "expect", "out", "results"],
  ["let", "ar0", ["get", "outputs", "out", "results"],
    ["let", "ar", ["if", ["isList", ["get", "ar0"]], ["get", "ar0"], ["list"]],
      ["let", "es", ["get", "expect", "out", "summary"],
        ["let", "asum", ["get", "outputs", "out", "summary"],
          ["if", ["neq", ["len", ["get", "er"]], ["len", ["get", "ar"]]], 0,
            ["div",
              ["add",
                ["mul", 4, ["div",
                  ["len", ["filter", ["get", "er"], "e", ["contains", ["get", "ar"], ["get", "e"]]]],
                  ["len", ["get", "er"]]]],
                ["if", ["eq", ["get", "es"], ["get", "asum"]], 1, 0]],
              5]]]]]]];

function taskGrader(config: ExperimentFamilyConfig, index: number): ExperimentGrader {
  const scorer =
    config.shape.grader === "scorer" ||
    (config.shape.grader === "mixed" && index % 2 === 1);
  if (!scorer) return { kind: "exact" };
  return {
    kind: "scorer",
    scorer: { contract: "algal.expr.v1", program: TASK_SCORER_PROGRAM },
    passAt: config.shape.scorerPassAt,
  };
}

function padIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Deterministically generate one phase's task set. The same config always
 * produces the same task bytes — regeneration is the audit path. */
export function generateExperimentTasks(config: ExperimentFamilyConfig): GeneratedTaskSet {
  const configDigest = experimentFamilyConfigDigest(config);
  const tasks: ExperimentTaskSpec[] = [];
  for (let index = 0; index < config.tasks; index++) {
    const { skeleton, revisedFrom } =
      config.phase === "shift"
        ? evolveSkeleton(config, index)
        : { skeleton: generateSkeleton(config, index), revisedFrom: undefined };
    const taskId = `${config.phase}-${padIndex(index)}`;
    const inputs = skeleton.batches.map((batch) => ({
      id: batch.split,
      split: batch.split,
      records: batch.records,
      expect: { out: expectedTaskOutput(skeleton, batch.records, batch.labels) },
    }));
    const family: ExperimentTaskSpec["family"] = {
      id: EXPERIMENT_TASK_FAMILY,
      seed: config.seed,
      index,
      config: configDigest,
      ...(revisedFrom !== undefined ? { revisedFrom } : {}),
    };
    const body = {
      contract: EXPERIMENT_TASK_CONTRACT,
      taskId,
      phase: config.phase,
      family,
      taxonomy: skeleton.taxonomy,
      recordSchema: skeleton.recordSchema,
      rules: skeleton.rules,
      outputFormat: skeleton.outputFormat,
      inputs,
      grader: taskGrader(config, index),
    };
    const task = { ...body, digest: digestCanonical(body as unknown as JsonValue) } as ExperimentTaskSpec;
    // The generator's own output must satisfy the contract it emits.
    tasks.push(parseExperimentTaskSpec(task as unknown as JsonValue));
  }
  const setBody = {
    contract: EXPERIMENT_SET_CONTRACT,
    family: EXPERIMENT_TASK_FAMILY,
    phase: config.phase,
    seed: config.seed,
    config: configDigest,
    tasks: tasks.map((task) => ({ taskId: task.taskId, file: `${task.taskId}.task.json`, digest: task.digest })),
  };
  const set: ExperimentSet = { ...setBody, digest: digestCanonical(setBody as unknown as JsonValue) };
  return { set, tasks };
}

export function parseExperimentSet(value: unknown): ExperimentSet {
  const record = closedRecord(value, ["contract", "family", "phase", "seed", "config", "tasks", "digest"], "set record");
  if (record.contract !== EXPERIMENT_SET_CONTRACT) fail(`set contract must be ${EXPERIMENT_SET_CONTRACT}`);
  if (record.family !== EXPERIMENT_TASK_FAMILY) fail(`set family must be ${EXPERIMENT_TASK_FAMILY}`);
  const phase = reqField(record, "phase", "experiment set record");
  if (typeof phase !== "string" || !(EXPERIMENT_PHASES as readonly string[]).includes(phase)) fail("set.phase must be a phase");
  const tasks = asArray(reqField(record, "tasks", "experiment set record"), "experiment set tasks").map((raw, i): ExperimentSetTask => {
    const entry = closedRecord(raw, ["taskId", "file", "digest"], `set.tasks[${i}]`);
    const taskId = entry.taskId;
    if (typeof taskId !== "string" || !/^[a-z][a-z0-9-]*$/.test(taskId) || taskId.length > EXPERIMENT_TASK_BOUNDS.maxTaskIdLen) {
      fail(`set.tasks[${i}].taskId must be a kebab-case id`);
    }
    const file = entry.file;
    if (typeof file !== "string" || file.length === 0 || file.length > 96) fail(`set.tasks[${i}].file must be a bounded file name`);
    return { taskId, file, digest: asDigest(entry.digest, `experiment set tasks[${i}].digest`) };
  });
  const digest = asDigest(reqField(record, "digest", "experiment set record"), "experiment set digest");
  const body: JsonObject = { ...record } as JsonObject;
  delete body["digest"];
  if (digestCanonical(body) !== digest) throw new AlgalError("DIGEST_MISMATCH", "experiment set: digest does not match the record");
  return {
    contract: EXPERIMENT_SET_CONTRACT,
    family: EXPERIMENT_TASK_FAMILY,
    phase: phase as ExperimentPhase,
    seed: asInt(reqField(record, "seed", "experiment set record"), "experiment set seed", 0, 4_294_967_295),
    config: asDigest(reqField(record, "config", "experiment set record"), "experiment set config"),
    tasks,
    digest,
  };
}
