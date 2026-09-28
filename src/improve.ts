/** Bounded improvement comparison over ordinary ALGAL organisms. Each arm —
 * a fixed parameter-set, a labeled-example generator, or a feedback-driven
 * generator — runs the same group-disjoint case suite under the same work
 * account limits, promotes one candidate on train/validation evidence, and is
 * scored once on a holdout the generator never sees. The report exports
 * `algal.evaluation-evidence.v1` records per arm and
 * `algal.promotion-decision.v1` records binding incumbent, candidate,
 * evidence, and policy. All records are data-only projections: they grant no
 * authority and never retry an external effect. */
import { manifestToJson, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";
import { checkProgram, evalScorer } from "./expr";
import {
  FOUNDRY_BOUNDS,
  generateFoundryCandidates,
  type FoundryCase,
  type FoundryScorer,
} from "./foundry";
import {
  HabitatAccount,
  habitatBindingMismatches,
  habitatCeiling,
  type HabitatBudget,
  type HabitatLimits,
} from "./habitat-budget";
import {
  buildEvaluationEvidence,
  buildPromotionDecision,
  type EvaluationEvidence,
  type EvaluationOutcome,
  type EvaluationOutcomeCase,
  type PromotionDecision,
} from "./host-contract";
import type { FnRegistry } from "./registry";
import { runOrganism, RUNTIME_VERSION, type RunOutcome, type RunReceipt } from "./run";
import type { Store } from "./store-contract";
import type { Transport } from "./transport-contract";
import type { ToolRegistry } from "./tools";
import { canonicalize, type JsonValue } from "./values";

export const IMPROVE_CONTRACT = "algal.improve.v1" as const;

export const IMPROVE_BOUNDS = {
  maxArms: 8,
  maxGenerations: 8,
  maxArmNameLen: 64,
  maxCaseGroupLen: 64,
  maxFeedbackText: 512,
  minHoldoutGroups: 3,
  maxRolloutLimit: 4_294_967_295,
} as const;

/** The split policy this module enforces: every case declares a group and the
 * three splits are pairwise group-disjoint. Labeled arms see train cases only;
 * feedback arms see selection outcomes only; holdout runs happen once, after
 * promotion, on the promoted candidate. */
export const IMPROVE_SPLIT_POLICY =
  "group-disjoint train/validation/holdout on case.group; labeled arms receive train labels; holdout evaluates the promoted candidate only" as const;

export type ImproveCase = FoundryCase & { group: string };

export type ImproveCaseResult = {
  id: string;
  group: string;
  split: FoundryCase["split"];
  passed: boolean;
  outcome: RunOutcome;
  /** Bounded failure text carried into feedback and evidence; null on pass. */
  feedback: string | null;
  args: Record<string, JsonValue>;
  outputs: Record<string, JsonValue>;
  expect: Record<string, JsonValue>;
  receiptDigest: Digest | null;
  /** The candidate manifest's declared work ceiling — the reservation amount
   * for this run (0 when no receipt exists). */
  reservedUnits: number;
  work: { steps: number; agentCalls: number; units: number };
  usage: { tokensIn: number; tokensOut: number };
};

export type ImproveCandidateResult = {
  manifestDigest: Digest;
  manifestKey: string;
  train: { passed: number; total: number };
  validation: { passed: number; total: number };
  work: { steps: number; agentCalls: number; units: number };
  usage: { tokensIn: number; tokensOut: number };
  cases: ImproveCaseResult[];
};

export type ImproveGeneration = {
  generation: number;
  generatorDigest: Digest;
  receiptDigest: Digest | null;
  proposed: Digest[];
  candidates: ImproveCandidateResult[];
  promoted: Digest | null;
};

export type ImproveArmResult = {
  name: string;
  kind: "fixed" | "labeled" | "feedback";
  generations: ImproveGeneration[];
  /** The fixed arm's single evaluation population; empty for generator arms,
   * which keep theirs inside `generations`. */
  candidates: ImproveCandidateResult[];
  promoted: Digest | null;
  /** The reservation was refused and the arm stopped early; partial evidence
   * is retained. */
  exhausted: boolean;
  /** A non-budget arm failure (generator error, invalid proposals); partial
   * evidence is retained. */
  failure: string | null;
  /** Settled work units over every run the arm admitted — candidate cases,
   * generator calls and holdout runs. The Pareto cost axis. */
  workUnits: number;
  holdout: ImproveCaseResult[];
  evidence: Digest | null;
  decision: Digest | null;
  /** No other arm has both greater-or-equal holdout score and less-or-equal
   * settled cost with at least one strict. */
  pareto: boolean;
  budget?: HabitatBudget;
};

export type ImproveLabels = {
  /** Where the case `expect` values came from. */
  provenance: string;
  redactionPolicy: string;
  /** True when labels were produced independently of every candidate and
   * strategy under comparison. Required for any "effectiveness" claim. */
  independent: boolean;
};

export type ImproveFixedArm = {
  kind: "fixed";
  name: string;
  candidates: OrganismManifest[];
};

export type ImproveGeneratorArm = {
  kind: "labeled" | "feedback";
  name: string;
  generator: OrganismManifest;
  generatorArgs: Record<string, JsonValue>;
  /** Interface input receiving the labeled train cases (required for
   * "labeled", optional for "feedback"). */
  labeledInput?: string;
  /** Interface input receiving the bounded per-generation feedback record
   * (required for "feedback", forbidden for "labeled"). */
  feedbackInput?: string;
  output: string;
  field?: string;
  seeds?: OrganismManifest[];
  maxGenerations: number;
};

export type ImproveArm = ImproveFixedArm | ImproveGeneratorArm;

export type ImproveRollout = {
  mode: "shadow" | "canary" | "active";
  sampleLimit: number;
  trafficLimit: number;
  expiresAfter: number | null;
};

export type ImproveOptions = {
  /** The baseline organism every arm improves on. Evaluated as the implicit
   * "incumbent" arm so the comparison has same-suite baseline evidence. */
  incumbent: OrganismManifest;
  arms: ImproveArm[];
  cases: ImproveCase[];
  labels: ImproveLabels;
  fns: FnRegistry;
  store: Store;
  executors: Executor[];
  transports?: Record<string, Transport>;
  tools?: ToolRegistry;
  scorer?: FoundryScorer;
  /** When set, each arm runs under a fresh `HabitatAccount` with these limits
   * (fixed arms run as "foundry", generator arms as "search"). A refused
   * reservation ends that arm's evaluation with `exhausted` and retains its
   * partial evidence. */
  budget?: HabitatLimits;
  environment?: string;
  /** Rollout recorded on exported promotion decisions; default is a
   * zero-traffic shadow. The record is data-only and activates nothing. */
  rollout?: ImproveRollout;
  /** Acceptance-policy record the decisions bind by digest; defaults to the
   * module's strict-holdout-improvement rule. */
  policy?: JsonValue;
  reviewerId?: string;
};

export type ImproveReport = {
  contract: typeof IMPROVE_CONTRACT;
  incumbent: Digest;
  dataset: {
    digest: Digest;
    groups: string[];
    splitPolicy: string;
    labelProvenance: string;
    redactionPolicy: string;
  };
  arms: ImproveArmResult[];
  /** The winning arm's name, or null when evidence is insufficient. */
  winner: string | null;
  comparison: "decisive" | "insufficient";
  insufficientReasons: string[];
  digest: Digest;
};

export type ImproveResult = {
  report: ImproveReport;
  /** One `algal.evaluation-evidence.v1` record per arm that promoted a
   * candidate, in arm order. */
  evidence: EvaluationEvidence[];
  /** One `algal.promotion-decision.v1` record per arm whose promoted candidate
   * differs from the incumbent, in arm order. */
  decisions: PromotionDecision[];
};

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", message);
}

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function truncate(text: string): string {
  return text.length > IMPROVE_BOUNDS.maxFeedbackText ? `${text.slice(0, IMPROVE_BOUNDS.maxFeedbackText)}…` : text;
}

function dedupe(candidates: OrganismManifest[]): OrganismManifest[] {
  const seen = new Set<Digest>();
  return candidates.filter((candidate) => {
    const digest = digestCanonical(manifestToJson(candidate));
    if (seen.has(digest)) return false;
    seen.add(digest);
    return true;
  });
}

function checkPopulation(candidates: OrganismManifest[], cases: ImproveCase[], at: string): void {
  for (const candidate of candidates) {
    if (!candidate.interface) fail(`${at}: candidate ${candidate.key} must declare an interface`);
    const inputs = new Set(Object.keys(candidate.interface!.inputs));
    const outputs = new Set(Object.keys(candidate.interface!.outputs));
    for (const c of cases) {
      for (const name of Object.keys(c.args)) {
        if (!inputs.has(name)) fail(`${at}: case ${c.id}: unknown candidate input "${name}"`);
      }
      for (const name of outputs) {
        if (!(name in c.expect)) fail(`${at}: case ${c.id}: missing expected output "${name}"`);
      }
      for (const name of Object.keys(c.expect)) {
        if (!outputs.has(name)) fail(`${at}: case ${c.id}: unknown candidate output "${name}"`);
      }
    }
  }
}

function validate(opts: ImproveOptions): void {
  if (opts.scorer !== undefined) {
    const c = checkProgram(opts.scorer.program, ["args", "expect", "outputs"]);
    if (!c.ok) throw new AlgalError("SCORER_INVALID", `scorer ${canonicalize(c.err)}`);
  }
  if (!opts.incumbent.interface) fail("incumbent must declare an interface");
  if (opts.arms.length > IMPROVE_BOUNDS.maxArms) fail(`improvement arms exceed ${IMPROVE_BOUNDS.maxArms}`);
  const names = new Set<string>(["incumbent"]);
  for (const arm of opts.arms) {
    if (!NAME_RE.test(arm.name) || arm.name.length > IMPROVE_BOUNDS.maxArmNameLen) fail(`invalid arm name "${arm.name}"`);
    if (names.has(arm.name)) fail(`duplicate arm name "${arm.name}"`);
    names.add(arm.name);
    if (arm.kind === "fixed") {
      if (arm.candidates.length === 0) fail(`arm ${arm.name}: fixed arms need at least one candidate`);
      if (arm.candidates.length > FOUNDRY_BOUNDS.maxCandidates) fail(`arm ${arm.name}: candidates exceed ${FOUNDRY_BOUNDS.maxCandidates}`);
      checkPopulation(arm.candidates, opts.cases, `arm ${arm.name}`);
    } else {
      if (!arm.generator.interface) fail(`arm ${arm.name}: generator must declare an interface`);
      const genInputs = new Set(Object.keys(arm.generator.interface!.inputs));
      for (const name of Object.keys(arm.generatorArgs)) {
        if (!genInputs.has(name)) fail(`arm ${arm.name}: unknown generator input "${name}"`);
      }
      if (arm.kind === "labeled") {
        if (!arm.labeledInput) fail(`arm ${arm.name}: labeled arms must name labeledInput`);
        if (arm.feedbackInput) fail(`arm ${arm.name}: labeled arms must not take feedbackInput`);
      } else if (!arm.feedbackInput) {
        fail(`arm ${arm.name}: feedback arms must name feedbackInput`);
      }
      for (const input of [arm.labeledInput, arm.feedbackInput]) {
        if (input !== undefined && !genInputs.has(input)) fail(`arm ${arm.name}: unknown generator input "${input}"`);
      }
      if (arm.seeds && arm.seeds.length > FOUNDRY_BOUNDS.maxCandidates) fail(`arm ${arm.name}: seeds exceed ${FOUNDRY_BOUNDS.maxCandidates}`);
      if (!Number.isInteger(arm.maxGenerations) || arm.maxGenerations < 1 || arm.maxGenerations > IMPROVE_BOUNDS.maxGenerations) {
        fail(`arm ${arm.name}: maxGenerations must be 1..${IMPROVE_BOUNDS.maxGenerations}`);
      }
    }
  }
  if (opts.cases.length === 0) fail("improvement requires at least one case");
  if (opts.cases.length > FOUNDRY_BOUNDS.maxCases) fail(`improvement cases exceed ${FOUNDRY_BOUNDS.maxCases}`);
  const ids = new Set<string>();
  const groups = new Map<FoundryCase["split"], Set<string>>([["train", new Set()], ["validation", new Set()], ["holdout", new Set()]]);
  for (const c of opts.cases) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id) || c.id.length > FOUNDRY_BOUNDS.maxCaseIdLen) fail(`invalid case id "${c.id}"`);
    if (ids.has(c.id)) fail(`duplicate case id "${c.id}"`);
    ids.add(c.id);
    if (!NAME_RE.test(c.group) || c.group.length > IMPROVE_BOUNDS.maxCaseGroupLen) fail(`case ${c.id}: invalid group "${c.group}"`);
    groups.get(c.split)!.add(c.group);
  }
  for (const split of ["train", "validation", "holdout"] as const) {
    if (!opts.cases.some((c) => c.split === split)) fail(`improvement requires at least one ${split} case`);
  }
  for (const group of groups.get("holdout")!) {
    if (groups.get("train")!.has(group) || groups.get("validation")!.has(group)) {
      fail(`group "${group}" crosses the holdout boundary`);
    }
  }
  for (const group of groups.get("validation")!) {
    if (groups.get("train")!.has(group)) fail(`group "${group}" crosses the train/validation boundary`);
  }
  if (typeof opts.labels.provenance !== "string" || opts.labels.provenance.length === 0 || opts.labels.provenance.length > 1024) {
    fail("labels.provenance must be a non-empty string within 1024 bytes");
  }
  if (typeof opts.labels.redactionPolicy !== "string" || opts.labels.redactionPolicy.length > 1024) {
    fail("labels.redactionPolicy must be a string within 1024 bytes");
  }
  if (typeof opts.labels.independent !== "boolean") fail("labels.independent must be boolean");
  if (opts.rollout) {
    const r = opts.rollout;
    if (!Number.isInteger(r.sampleLimit) || r.sampleLimit < 0 || r.sampleLimit > IMPROVE_BOUNDS.maxRolloutLimit) fail("rollout.sampleLimit out of range");
    if (!Number.isInteger(r.trafficLimit) || r.trafficLimit < 0 || r.trafficLimit > IMPROVE_BOUNDS.maxRolloutLimit) fail("rollout.trafficLimit out of range");
    if (r.expiresAfter !== null && (!Number.isInteger(r.expiresAfter) || r.expiresAfter <= 0 || r.expiresAfter > IMPROVE_BOUNDS.maxRolloutLimit)) {
      fail("rollout.expiresAfter out of range");
    }
  }
  if (opts.environment !== undefined && (typeof opts.environment !== "string" || opts.environment.length === 0 || opts.environment.length > 256)) {
    fail("environment must be a non-empty string within 256 bytes");
  }
}

function caseArgs(candidate: OrganismManifest, c: ImproveCase): Record<string, Record<string, JsonValue>> {
  const args: Record<string, Record<string, JsonValue>> = Object.create(null) as Record<string, Record<string, JsonValue>>;
  for (const [name, value] of Object.entries(c.args)) {
    const target = candidate.interface!.inputs[name]!;
    (args[target.cell] ??= Object.create(null) as Record<string, JsonValue>)[target.port] = value;
  }
  return args;
}

function caseOutputs(candidate: OrganismManifest, cells: RunReceipt["cells"]): Record<string, JsonValue> {
  const outputs: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
  for (const [name, source] of Object.entries(candidate.interface!.outputs)) {
    const value = cells[source.cell]?.outputs?.[source.port];
    if (value !== undefined) outputs[name] = value;
  }
  return outputs;
}

function failureText(c: ImproveCase, outputs: Record<string, JsonValue>, outcome: RunOutcome): string {
  const detail = `expected ${canonicalize(c.expect)}, got ${canonicalize(outputs)}`;
  return truncate(outcome === "complete" ? detail : `run ended ${outcome}; ${detail}`);
}

type ArmState = {
  runs: { manifest: Digest; receipt: Digest; units: number }[];
  account?: HabitatAccount;
};

async function evaluateCase(
  state: ArmState,
  opts: ImproveOptions,
  candidate: OrganismManifest,
  manifestDigest: Digest,
  c: ImproveCase,
): Promise<ImproveCaseResult> {
  const args = caseArgs(candidate, c);
  const execute = () => runOrganism({
    manifest: candidate,
    args,
    fns: opts.fns,
    store: opts.store,
    executors: opts.executors,
    ...(opts.transports ? { transports: opts.transports } : {}),
    ...(opts.tools ? { tools: opts.tools } : {}),
  });
  let receipt: RunReceipt;
  let receiptDigest: Digest | null = null;
  try {
    if (state.account) {
      const admitted = await state.account.admit({ manifest: manifestDigest, budgets: candidate.budgets, args }, execute, opts.store);
      receipt = admitted.receipt;
      receiptDigest = admitted.receiptDigest;
    } else {
      receipt = await execute();
      receiptDigest = await opts.store.putReceipt(receipt as unknown as JsonValue);
    }
  } catch (error) {
    if (error instanceof AlgalError && error.code === "BUDGET_EXHAUSTED") throw error;
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: c.id, group: c.group, split: c.split, passed: false, outcome: "failed",
      feedback: truncate(`run error: ${message}`),
      args: c.args, outputs: {}, expect: c.expect, receiptDigest: null,
      reservedUnits: 0,
      work: { steps: 0, agentCalls: 0, units: 0 }, usage: { tokensIn: 0, tokensOut: 0 },
    };
  }
  state.runs.push({ manifest: manifestDigest, receipt: receiptDigest, units: receipt.work.units });
  const outputs = caseOutputs(candidate, receipt.cells);
  const usage = receipt.effects.reduce(
    (total, effect) => ({
      tokensIn: total.tokensIn + (effect.usage?.tokensIn ?? 0),
      tokensOut: total.tokensOut + (effect.usage?.tokensOut ?? 0),
    }),
    { tokensIn: 0, tokensOut: 0 },
  );
  const passed = receipt.outcome === "complete" && (opts.scorer !== undefined
    ? evalScorer(opts.scorer, c, outputs)
    : canonicalize(outputs) === canonicalize(c.expect));
  return {
    id: c.id, group: c.group, split: c.split, passed, outcome: receipt.outcome,
    feedback: passed ? null : failureText(c, outputs, receipt.outcome),
    args: c.args, outputs, expect: c.expect, receiptDigest,
    reservedUnits: habitatCeiling(candidate.budgets).work,
    work: receipt.work, usage,
  };
}

function score(cases: ImproveCaseResult[], split: FoundryCase["split"]) {
  const selected = cases.filter((c) => c.split === split);
  return { passed: selected.filter((c) => c.passed).length, total: selected.length };
}

function better(a: ImproveCandidateResult, b: ImproveCandidateResult): number {
  const ah = a.validation.passed / a.validation.total;
  const bh = b.validation.passed / b.validation.total;
  if (ah !== bh) return bh - ah;
  const at = a.train.passed / a.train.total;
  const bt = b.train.passed / b.train.total;
  if (at !== bt) return bt - at;
  if (a.work.agentCalls !== b.work.agentCalls) return a.work.agentCalls - b.work.agentCalls;
  if (a.work.units !== b.work.units) return a.work.units - b.work.units;
  return a.manifestDigest.localeCompare(b.manifestDigest);
}

function select(candidates: ImproveCandidateResult[]): Digest | null {
  return candidates.length ? [...candidates].sort(better)[0]!.manifestDigest : null;
}

async function evaluatePopulation(
  state: ArmState,
  opts: ImproveOptions,
  population: OrganismManifest[],
  cases: ImproveCase[],
): Promise<ImproveCandidateResult[]> {
  const results: ImproveCandidateResult[] = [];
  for (const candidate of population) {
    const manifestDigest = await opts.store.putManifest(candidate);
    const evaluated: ImproveCaseResult[] = [];
    for (const c of cases) evaluated.push(await evaluateCase(state, opts, candidate, manifestDigest, c));
    results.push({
      manifestDigest,
      manifestKey: candidate.key,
      train: score(evaluated, "train"),
      validation: score(evaluated, "validation"),
      work: evaluated.reduce((t, c) => ({ steps: t.steps + c.work.steps, agentCalls: t.agentCalls + c.work.agentCalls, units: t.units + c.work.units }), { steps: 0, agentCalls: 0, units: 0 }),
      usage: evaluated.reduce((t, c) => ({ tokensIn: t.tokensIn + c.usage.tokensIn, tokensOut: t.tokensOut + c.usage.tokensOut }), { tokensIn: 0, tokensOut: 0 }),
      cases: evaluated,
    });
  }
  return results;
}

function feedbackPayload(generation: number, prior: ImproveCandidateResult[] | null, promoted: Digest | null): JsonValue {
  if (!prior) return null;
  return {
    generation,
    promoted,
    candidates: prior.map((candidate) => ({
      manifestDigest: candidate.manifestDigest,
      manifestKey: candidate.manifestKey,
      train: candidate.train,
      validation: candidate.validation,
      work: candidate.work,
      usage: candidate.usage,
      cases: candidate.cases.map((c) => ({
        id: c.id,
        group: c.group,
        split: c.split,
        outcome: c.outcome,
        passed: c.passed,
        feedback: c.feedback,
      })),
    })),
  } as JsonValue;
}

async function runArm(state: ArmState, opts: ImproveOptions, arm: ImproveArm): Promise<Pick<ImproveArmResult, "generations" | "candidates" | "promoted" | "holdout">> {
  const selectionCases = opts.cases.filter((c) => c.split !== "holdout");
  const holdoutCases = opts.cases.filter((c) => c.split === "holdout");
  let promoted: Digest | null = null;
  const generations: ImproveGeneration[] = [];
  let candidates: ImproveCandidateResult[] = [];

  if (arm.kind === "fixed") {
    candidates = await evaluatePopulation(state, opts, dedupe(arm.candidates), selectionCases);
    promoted = select(candidates);
  } else {
    const labeledPayload = arm.labeledInput
      ? ({ cases: opts.cases.filter((c) => c.split === "train").map((c) => ({ id: c.id, group: c.group, args: c.args, expect: c.expect })) } as JsonValue)
      : undefined;
    let survivors = dedupe(arm.seeds ?? []);
    for (let generation = 0; generation < arm.maxGenerations; generation++) {
      const generatorArgs: Record<string, JsonValue> = {
        ...arm.generatorArgs,
        ...(arm.labeledInput ? { [arm.labeledInput]: labeledPayload! } : {}),
        ...(arm.feedbackInput ? { [arm.feedbackInput]: feedbackPayload(generation, candidates.length ? candidates : null, promoted) } : {}),
      };
      const generated = await generateFoundryCandidates({
        generator: arm.generator,
        args: generatorArgs,
        output: arm.output,
        ...(arm.field ? { field: arm.field } : {}),
        fns: opts.fns,
        store: opts.store,
        executors: opts.executors,
        ...(opts.transports ? { transports: opts.transports } : {}),
        ...(opts.tools ? { tools: opts.tools } : {}),
        ...(state.account ? { account: state.account } : {}),
      });
      const stored = (await opts.store.getReceipt(generated.receiptDigest)) as { work?: { units?: number } } | undefined;
      state.runs.push({ manifest: generated.generatorDigest, receipt: generated.receiptDigest, units: stored?.work?.units ?? 0 });
      const population = dedupe([...survivors, ...generated.candidates]);
      if (population.length > FOUNDRY_BOUNDS.maxCandidates) {
        throw new AlgalError("BUDGET_EXHAUSTED", `arm ${arm.name}: population exceeds ${FOUNDRY_BOUNDS.maxCandidates}`);
      }
      checkPopulation(population, opts.cases, `arm ${arm.name}`);
      candidates = await evaluatePopulation(state, opts, population, selectionCases);
      promoted = select(candidates);
      generations.push({
        generation,
        generatorDigest: generated.generatorDigest,
        receiptDigest: generated.receiptDigest,
        proposed: generated.candidates.map((candidate) => digestCanonical(manifestToJson(candidate))),
        candidates,
        promoted,
      });
      survivors = population.filter(
        (candidate) => digestCanonical(manifestToJson(candidate)) === promoted,
      );
    }
  }

  const holdout: ImproveCaseResult[] = [];
  if (promoted !== null) {
    // The promoted manifest was evaluated, so it is in the store; check the
    // declared population first so a store read is never load-bearing.
    const promotedManifest =
      (arm.kind === "fixed" ? dedupe(arm.candidates) : dedupe(arm.seeds ?? []))
        .find((candidate) => digestCanonical(manifestToJson(candidate)) === promoted)
      ?? (await opts.store.getManifest(promoted));
    if (!promotedManifest) fail(`arm ${arm.name}: promoted manifest ${promoted} is not in the store`);
    for (const c of holdoutCases) holdout.push(await evaluateCase(state, opts, promotedManifest, promoted, c));
  }
  return { generations, candidates, promoted, holdout };
}

function outcomeFor(cases: ImproveCaseResult[], split: FoundryCase["split"]): EvaluationOutcome {
  const selected = cases.filter((c) => c.split === split);
  const mapped: EvaluationOutcomeCase[] = selected.map((c) => ({
    id: c.id,
    group: c.group,
    outcome: c.outcome === "complete" ? "complete" : c.outcome === "suspended" ? "uncertain" : "failed",
    passed: c.passed,
    score: c.passed ? 1 : 0,
    receipt: c.receiptDigest,
    feedback: c.feedback,
  }));
  const passed = mapped.filter((c) => c.passed).length;
  return { passed, total: mapped.length, score: mapped.length ? passed / mapped.length : 0, cases: mapped };
}

function evidenceFor(
  opts: ImproveOptions,
  incumbentDigest: Digest,
  dataset: ImproveReport["dataset"],
  arm: ImproveArmResult,
  promoted: Digest,
  holdoutGroups: number,
): EvaluationEvidence {
  const promotedResults =
    arm.candidates.find((c) => c.manifestDigest === promoted)
    ?? arm.generations.at(-1)?.candidates.find((c) => c.manifestDigest === promoted);
  const selection = promotedResults?.cases ?? [];
  const all = [...selection, ...arm.holdout];
  const reservedUnits = all.reduce((t, c) => t + c.reservedUnits, 0);
  const settledUnits = all.reduce((t, c) => t + c.work.units, 0);
  const limitations: string[] = ["independent review pending"];
  if (!opts.labels.independent) limitations.push("labels are not independent");
  if (holdoutGroups < IMPROVE_BOUNDS.minHoldoutGroups) limitations.push(`holdout covers ${holdoutGroups} group(s), below the minimum ${IMPROVE_BOUNDS.minHoldoutGroups}`);
  if (arm.exhausted) limitations.push("arm stopped early: budget exhausted");
  if (arm.failure) limitations.push(`arm failed: ${truncate(arm.failure)}`);
  if (arm.kind !== "fixed") limitations.push(`generator arm over ${arm.generations.length} generation(s)`);
  return buildEvaluationEvidence({
    contract: "algal.evaluation-evidence.v1",
    baseArtifact: incumbentDigest,
    candidateArtifact: promoted,
    dataset: {
      digest: dataset.digest,
      groups: dataset.groups,
      splitPolicy: dataset.splitPolicy,
      labelProvenance: dataset.labelProvenance,
      redactionPolicy: dataset.redactionPolicy,
    },
    evaluator: {
      scorerDigest: digestCanonical((opts.scorer ?? { kind: "exact-output-match" }) as unknown as JsonValue),
      runtimeDigest: digestCanonical({ name: "algal", version: RUNTIME_VERSION } as unknown as JsonValue),
      routeDigest: null,
    },
    usage: {
      modelCalls: all.reduce((t, c) => t + c.work.agentCalls, 0),
      tokensIn: all.reduce((t, c) => t + c.usage.tokensIn, 0),
      tokensOut: all.reduce((t, c) => t + c.usage.tokensOut, 0),
      units: "algal work units (receipt work.units)",
    },
    charges: {
      reserved: reservedUnits,
      settled: settledUnits,
      unit: "work-units",
    },
    outcomes: {
      train: outcomeFor(selection, "train"),
      validation: outcomeFor(selection, "validation"),
      holdout: outcomeFor(arm.holdout, "holdout"),
    },
    independentReview: { status: "not-reviewed", reviewer: null, notes: null },
    claimCategory: opts.labels.independent && holdoutGroups >= IMPROVE_BOUNDS.minHoldoutGroups && arm.holdout.length > 0
      ? "effectiveness"
      : "replay",
    limitations: [...new Set(limitations)].sort(),
  });
}

/** Every run an improvement report records, in admission order: the incumbent
 * arm first, then each arm's generator runs and candidate cases per
 * generation, then each arm's holdout cases. */
export function improveReportRuns(report: Pick<ImproveReport, "arms">): { manifest: Digest; receipt: Digest }[] {
  return report.arms.flatMap((arm) => [
    ...arm.generations.flatMap((g) => [
      ...(g.receiptDigest ? [{ manifest: g.generatorDigest, receipt: g.receiptDigest }] : []),
      ...g.candidates.flatMap((c) => c.cases.flatMap((r) => (r.receiptDigest ? [{ manifest: c.manifestDigest, receipt: r.receiptDigest }] : []))),
    ]),
    ...arm.candidates.flatMap((c) => c.cases.flatMap((r) => (r.receiptDigest ? [{ manifest: c.manifestDigest, receipt: r.receiptDigest }] : []))),
    ...arm.holdout.flatMap((r) => (r.receiptDigest ? [{ manifest: arm.promoted!, receipt: r.receiptDigest }] : [])),
  ]);
}

export async function runImprovement(opts: ImproveOptions): Promise<ImproveResult> {
  validate(opts);
  const incumbentDigest = digestCanonical(manifestToJson(opts.incumbent));
  const groups = [...new Set(opts.cases.map((c) => c.group))].sort();
  const holdoutGroupCount = new Set(opts.cases.filter((c) => c.split === "holdout").map((c) => c.group)).size;
  const dataset: ImproveReport["dataset"] = {
    digest: digestCanonical(opts.cases as unknown as JsonValue),
    groups,
    splitPolicy: IMPROVE_SPLIT_POLICY,
    labelProvenance: opts.labels.provenance,
    redactionPolicy: opts.labels.redactionPolicy,
  };
  const arms: { spec: ImproveArm; result: ImproveArmResult }[] = [];

  const specs: ImproveArm[] = [{ kind: "fixed", name: "incumbent", candidates: [opts.incumbent] }, ...opts.arms];
  for (const spec of specs) {
    const account = opts.budget
      ? new HabitatAccount(spec.kind === "fixed" ? "foundry" : "search", opts.budget)
      : undefined;
    const state: ArmState = { runs: [], ...(account ? { account } : {}) };
    const result: ImproveArmResult = {
      name: spec.name,
      kind: spec.kind,
      generations: [],
      candidates: [],
      promoted: null,
      exhausted: false,
      failure: null,
      workUnits: 0,
      holdout: [],
      evidence: null,
      decision: null,
      pareto: false,
    };
    try {
      const arm = await runArm(state, opts, spec);
      result.generations = arm.generations;
      result.candidates = arm.candidates;
      result.promoted = arm.promoted;
      result.holdout = arm.holdout;
    } catch (error) {
      if (error instanceof AlgalError && error.code === "BUDGET_EXHAUSTED") {
        result.exhausted = true;
      } else {
        result.failure = error instanceof Error ? error.message : String(error);
      }
    }
    if (account) {
      const budget = account.record();
      const activity = spec.kind === "fixed" ? "foundry" : "search";
      const mismatches = habitatBindingMismatches(budget, activity, state.runs);
      // An arm retired early records an exhausted budget on purpose; the
      // run list itself must still bind.
      const real = result.exhausted || result.failure !== null
        ? mismatches.filter((m) => m !== "budget outcome is not complete")
        : mismatches;
      if (real.length) throw new AlgalError("INTERNAL", `arm ${spec.name} habitat budget: ${real.join("; ")}`);
      result.budget = budget;
    }
    result.workUnits = state.runs.reduce((t, r) => t + r.units, 0);
    arms.push({ spec, result });
  }

  const evidence: EvaluationEvidence[] = [];
  for (const { result } of arms) {
    if (result.promoted === null) continue;
    const record = evidenceFor(opts, incumbentDigest, dataset, result, result.promoted, holdoutGroupCount);
    result.evidence = record.digest;
    evidence.push(record);
  }

  const holdoutScore = (arm: ImproveArmResult): number =>
    arm.holdout.length ? arm.holdout.filter((c) => c.passed).length / arm.holdout.length : 0;
  for (const { result } of arms) {
    result.pareto = !arms.some(({ result: other }) =>
      other !== result
      && other.holdout.length > 0
      && holdoutScore(other) >= holdoutScore(result)
      && other.workUnits <= result.workUnits
      && (holdoutScore(other) > holdoutScore(result) || other.workUnits < result.workUnits));
  }

  const insufficientReasons: string[] = [];
  const incumbentArm = arms[0]!.result;
  if (incumbentArm.holdout.length === 0) insufficientReasons.push("incumbent baseline has no holdout evidence");
  if (!opts.labels.independent) insufficientReasons.push("labels are not independent");
  if (holdoutGroupCount < IMPROVE_BOUNDS.minHoldoutGroups) insufficientReasons.push(`holdout covers ${holdoutGroupCount} group(s), below the minimum ${IMPROVE_BOUNDS.minHoldoutGroups}`);
  const contenders = arms.filter(({ result }) => result.name !== "incumbent" && result.promoted !== null && result.holdout.length > 0);
  if (contenders.length === 0) insufficientReasons.push("no non-incumbent arm completed a holdout evaluation");
  const improving = contenders.filter(({ result }) => holdoutScore(result) > holdoutScore(incumbentArm));
  if (contenders.length > 0 && improving.length === 0) insufficientReasons.push("no arm improved on the incumbent baseline holdout score");
  const winner = insufficientReasons.length === 0
    ? improving.sort((a, b) => {
        const d = holdoutScore(b.result) - holdoutScore(a.result);
        if (d !== 0) return d;
        const c = a.result.workUnits - b.result.workUnits;
        return c !== 0 ? c : a.result.name.localeCompare(b.result.name);
      })[0]!.result.name
    : null;
  const comparison: "decisive" | "insufficient" = winner === null ? "insufficient" : "decisive";

  const policy = opts.policy ?? ({
    rule: "strict-holdout-improvement",
    minHoldoutGroups: IMPROVE_BOUNDS.minHoldoutGroups,
    independentLabels: opts.labels.independent,
  } as JsonValue);
  const policyDigest = digestCanonical(policy);
  const interfaceDigest = digestCanonical((opts.incumbent.interface ?? null) as JsonValue);
  const rollout = opts.rollout ?? { mode: "shadow" as const, sampleLimit: 0, trafficLimit: 0, expiresAfter: null };
  const decisions: PromotionDecision[] = [];
  for (const { result } of arms) {
    if (result.name === "incumbent" || result.promoted === null || result.promoted === incumbentDigest || result.evidence === null) continue;
    const approved = result.name === winner;
    const record = buildPromotionDecision({
      contract: "algal.promotion-decision.v1",
      incumbent: incumbentDigest,
      candidate: result.promoted,
      evidence: result.evidence,
      policy: policyDigest,
      scope: { environment: opts.environment ?? "experiment", tenant: null, contact: null },
      rollout: { mode: rollout.mode, sampleLimit: rollout.sampleLimit, trafficLimit: rollout.trafficLimit, expiresAfter: rollout.expiresAfter },
      reviewer: { id: opts.reviewerId ?? IMPROVE_CONTRACT, status: approved ? "approved" : "rejected" },
      rollback: {
        target: incumbentDigest,
        compatibility: interfaceDigest,
        reason: approved ? null : comparison === "insufficient" ? "insufficient evidence" : "another arm won the comparison",
      },
      observedMetrics: {
        holdoutPassed: result.holdout.filter((c) => c.passed).length,
        holdoutTotal: result.holdout.length,
        holdoutScore: holdoutScore(result),
        incumbentHoldoutScore: holdoutScore(incumbentArm),
        workUnits: result.workUnits,
        incumbentWorkUnits: incumbentArm.workUnits,
      },
    });
    result.decision = record.digest;
    decisions.push(record);
  }

  const base = {
    contract: IMPROVE_CONTRACT,
    incumbent: incumbentDigest,
    dataset,
    arms: arms.map(({ result }) => result),
    winner,
    comparison,
    insufficientReasons: [...new Set(insufficientReasons)].sort(),
  };
  const report: ImproveReport = { ...base, digest: digestCanonical(base as unknown as JsonValue) };
  return { report, evidence, decisions };
}
