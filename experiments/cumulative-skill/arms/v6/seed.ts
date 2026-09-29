// Training examples, then train-only repairs. Validation selects the first
// passing candidate but never enters a writer request.
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../../../../src/contract";
import { asDigest, digestCanonical, type Digest } from "../../../../src/digest";
import type { Executor } from "../../../../src/effects";
import { normalizeEmittedManifest, parseExperimentArm, parseExperimentCatalog, parseExperimentRun, parseExperimentSession, runExperimentArm,
  type ExperimentCatalog, type ExperimentRun } from "../../../../src/experiment-run";
import { taskBatchArgs, taskCases, taskSpecData, type ExperimentTaskSpec } from "../../../../src/experiment-task";
import { evalScorer } from "../../../../src/expr";
import { HabitatAccount, parseHabitatBudget, parseHabitatLimits, type HabitatBudget, type HabitatLimits } from "../../../../src/habitat-budget";
import { builtinRegistry } from "../../../../src/registry";
import { parseRunReceipt, receiptDigest } from "../../../../src/run";
import type { Store } from "../../../../src/store";
import { asInt, asObject, canonicalize, type JsonObject, type JsonValue } from "../../../../src/values";
import { seedTrainingExamples, studyGenerator } from "./generators";
import { PROTOCOL_DIGEST, SCORER, SEED_BUDGET, SEED_MAX_GENERATIONS } from "./protocol";

type Score = { passed: number; total: number };
export type SeedPlan = {
  generation: number; configuration: Digest; parentManifest: Digest | null;
  trainEvidence: Digest | null; feedbackReceipt: Digest | null;
  mode: "generate" | "revise"; fallback: "no-valid-prior" | null;
};
export type SeedAttempt = SeedPlan & {
  session: Digest; run: Digest; account: Digest; manifest: Digest | null; report: Digest | null;
  generator: ExperimentRun["generator"]; outcome: ExperimentRun["outcome"]; failure: ExperimentRun["failure"];
  validation: Score | null; train: Score | null;
};
export type SeedSummary = {
  contract: "algal.study-seed.v2"; blockId: string; protocol: Digest; corpus: string;
  taskId: string; taskDigest: Digest; manifest: Digest | null; report: Digest | null;
  catalog: Digest | null; account: Digest; validation: Score | null; train: Score | null;
  qualified: boolean; termination: "in-progress" | "interrupted" | "qualified" | "generation-limit" | "budget-limit";
  maxGenerations: number; attempts: SeedAttempt[]; inFlight: SeedPlan | null;
};
type Prior = { manifest: Digest; evidence: JsonObject; evidenceDigest: Digest; receipt: Digest };
const json = (value: unknown) => value as JsonValue;
const same = (a: unknown, b: unknown) => canonicalize(json(a)) === canonicalize(json(b));
function requireMatch(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(`v6 seed: ${message}`);
}
async function value(store: Store, digest: Digest) {
  const result = await store.getValue(digest);
  requireMatch(result !== undefined && digestCanonical(result) === digest, `missing or altered value ${digest}`);
  return result;
}
async function receipt(store: Store, digest: Digest) {
  const raw = await store.getReceipt(digest);
  requireMatch(raw !== undefined && digestCanonical(raw) === digest, "receipt CAS mismatch");
  const result = parseRunReceipt(raw);
  requireMatch(receiptDigest(result) === result.digest, "receipt signed digest mismatch");
  return result;
}
function score(value: unknown, at: string): Score {
  const raw = asObject(value, at);
  const total = asInt(raw.total, `${at}.total`, 1, 64);
  return { passed: asInt(raw.passed, `${at}.passed`, 0, total), total };
}
async function selection(store: Store, report: Digest, manifest: Digest) {
  const raw = asObject(await value(store, report), "selection");
  requireMatch(raw.promoted === manifest, "selection winner mismatch");
  requireMatch(Array.isArray(raw.candidates) && raw.candidates.length === 1, "selection must contain one candidate");
  const candidate = asObject(raw.candidates[0], "candidate");
  requireMatch(candidate.manifestDigest === manifest, "selection manifest mismatch");
  return { candidate, train: score(candidate.train, "train"), validation: score(candidate.validation, "validation") };
}
function remaining(limits: HabitatLimits, account: HabitatBudget): HabitatLimits {
  return { work: limits.work - account.charged.work, attempts: limits.attempts - account.charged.attempts,
    runs: limits.runs - account.charged.runs };
}
function append(account: HabitatBudget, attempt: HabitatBudget) {
  return parseHabitatBudget({ ...account, runs: [...account.runs, ...attempt.runs],
    charged: { work: account.charged.work + attempt.charged.work, attempts: account.charged.attempts + attempt.charged.attempts,
      runs: account.charged.runs + attempt.charged.runs }, outcome: attempt.outcome, refused: attempt.refused });
}
function mappedArgs(manifest: OrganismManifest, args: Record<string, JsonValue>): JsonObject {
  const mapped: JsonObject = {};
  for (const [name, arg] of Object.entries(args)) {
    const input = manifest.interface?.inputs[name];
    requireMatch(input !== undefined, "manifest input absent");
    (mapped[input.cell] ??= {}) as JsonObject;
    (mapped[input.cell] as JsonObject)[input.port] = arg;
  }
  return mapped;
}
async function outputs(store: Store, address: Digest, manifest: OrganismManifest, args: Record<string, JsonValue>) {
  const recorded = await receipt(store, address);
  requireMatch(recorded.manifestDigest === digestCanonical(manifestToJson(manifest)) &&
    same(recorded.args, mappedArgs(manifest, args)), "evaluation receipt binding mismatch");
  const out: JsonObject = {};
  for (const [name, source] of Object.entries(manifest.interface?.outputs ?? {})) {
    const result = recorded.cells[source.cell]?.outputs?.[source.port];
    if (result !== undefined) out[name] = result;
  }
  return { recorded, out };
}
async function configuration(first: ExperimentTaskSpec, store: Store, budget: HabitatLimits, generation: number, prior: Prior | null) {
  const generator = studyGenerator(prior === null ? "generator.algal.json" : "reviser.algal.json", seedTrainingExamples(first));
  if (prior !== null) {
    const manifest = await store.getManifest(prior.manifest);
    requireMatch(manifest !== undefined, "prior manifest missing");
    generator.args.kept = manifestToJson(manifest);
    generator.args.evidence = prior.evidence;
  }
  const train = first.inputs.find(batch => batch.split === "train")!;
  return {
    contract: "algal.experiment.config.v1",
    arm: { contract: "algal.experiment-arm.v1", arm: "retained", family: "record-triage", budget, generator,
      normalizeEmitted: true, citeKeptEvaluation: true, maxEntries: 1, scorer: SCORER,
      cases: taskCases(first).map(c => ({ ...c, id: `${first.taskId}-${c.id}` })) },
    tasks: [{ taskId: `seed-${first.taskId}-${generation}`, phase: "acquisition" as const,
      spec: taskSpecData(first), args: taskBatchArgs(first, train) }],
  };
}
/** Read one executed training receipt, never project the selection report. */
async function feedback(first: ExperimentTaskSpec, store: Store, run: ExperimentRun): Promise<Prior | null> {
  if (run.manifest === null || run.receipt === null) return null;
  let source = run.receipt;
  if (run.promote?.report !== null && run.promote?.report !== undefined) {
    const { candidate } = await selection(store, run.promote.report, run.manifest);
    requireMatch(Array.isArray(candidate.cases), "selection cases absent");
    const train = candidate.cases.map(c => asObject(c, "case")).find(c => c.split === "train");
    requireMatch(train !== undefined, "selection training case absent");
    source = asDigest(train.receiptDigest, "training receipt");
  }
  const recorded = await receipt(store, source);
  const manifest = await store.getManifest(run.manifest);
  requireMatch(manifest !== undefined && recorded.manifestDigest === run.manifest, "training manifest mismatch");
  const examples = seedTrainingExamples(first);
  requireMatch(same(recorded.args, mappedArgs(manifest, { records: examples.records, spec: taskSpecData(first) })),
    "feedback receipt is not the exact training batch");
  const output = manifest.interface?.outputs.out;
  const actual = output === undefined ? null : recorded.cells[output.cell]?.outputs?.[output.port] ?? null;
  const evidence: JsonObject = { records: examples.records, expected: examples.expected, actual };
  return { manifest: run.manifest, receipt: source, evidence, evidenceDigest: digestCanonical(evidence) };
}

export async function generateStudySeed(opts: {
  first: ExperimentTaskSpec; blockId: string; corpus: string; protocolDigest?: Digest;
  store: Store; executors: Executor[]; maxGenerations?: number; budget?: HabitatLimits;
  onAttempt?: (summary: SeedSummary) => void | Promise<void>;
}): Promise<{ summary: SeedSummary; catalog: ExperimentCatalog | null; manifest: OrganismManifest | null }> {
  const { first, store } = opts;
  requireMatch(first.phase === "acquisition", "first task must be acquisition");
  requireMatch(/^[a-z0-9-]{1,64}$/.test(opts.blockId), "invalid block id");
  requireMatch(opts.corpus.length > 0 && opts.corpus.length <= 512, "invalid corpus identity");
  const protocol = opts.protocolDigest ?? PROTOCOL_DIGEST;
  requireMatch(protocol === PROTOCOL_DIGEST, "protocol identity mismatch");
  const maxGenerations = asInt(opts.maxGenerations ?? SEED_MAX_GENERATIONS, "maxGenerations", 1, SEED_MAX_GENERATIONS);
  const limits = parseHabitatLimits(opts.budget ?? SEED_BUDGET);
  requireMatch(limits.work <= SEED_BUDGET.work && limits.attempts <= SEED_BUDGET.attempts && limits.runs <= SEED_BUDGET.runs, "budget exceeds protocol");
  let account = new HabitatAccount("experiment", limits).record();
  const summary: SeedSummary = { contract: "algal.study-seed.v2", blockId: opts.blockId, protocol, corpus: opts.corpus,
    taskId: first.taskId, taskDigest: first.digest, manifest: null, report: null, catalog: null,
    account: await store.putValue(json(account)), validation: null, train: null, qualified: false,
    termination: "in-progress", maxGenerations, attempts: [], inFlight: null };
  const snapshot = async () => { await opts.onAttempt?.(structuredClone(summary)); };
  await snapshot();
  let prior: Prior | null = null;
  for (let generation = 1; generation <= maxGenerations; generation++) {
    const budget = remaining(limits, account);
    if (account.outcome === "exhausted" || budget.work < 1 || budget.runs < 1 || budget.attempts < 1) {
      summary.termination = "budget-limit";
      break;
    }
    const config = await configuration(first, store, budget, generation, prior);
    const plan: SeedPlan = {
      generation, configuration: await store.putValue(json(config)), parentManifest: prior?.manifest ?? null,
      trainEvidence: prior === null ? null : await store.putValue(prior.evidence), feedbackReceipt: prior?.receipt ?? null,
      mode: prior === null ? "generate" : "revise", fallback: generation > 1 && prior === null ? "no-valid-prior" : null,
    };
    summary.inFlight = plan;
    await snapshot();
    try {
      const result = await runExperimentArm({ arm: parseExperimentArm(config.arm), tasks: config.tasks,
        fns: builtinRegistry(), store, executors: opts.executors });
      const attemptAccount = parseHabitatBudget(await value(store, result.session.budget));
      account = append(account, attemptAccount);
      summary.account = await store.putValue(json(account));
      const run = result.runs[0]!;
      const report = run.promote?.report ?? null;
      const scores = report !== null && run.manifest !== null ? await selection(store, report, run.manifest) : null;
      summary.attempts.push({ ...plan, session: result.sessionDigest, run: result.runDigests[0]!, account: result.session.budget,
        manifest: run.manifest, report, generator: run.generator, outcome: run.outcome, failure: run.failure,
        train: scores?.train ?? null, validation: scores?.validation ?? null });
      summary.inFlight = null;
      const entry = result.catalog.entries[0];
      if (entry !== undefined) {
        requireMatch(run.generator !== null && run.promote?.promoted === true && scores !== null &&
          scores.validation.passed === scores.validation.total, "promotion lacks passing validation");
        const manifest = await store.getManifest(entry.manifest);
        requireMatch(manifest !== undefined, "promoted manifest missing");
        Object.assign(summary, { manifest: entry.manifest, report: entry.report, catalog: result.catalogDigest,
          train: scores.train, validation: scores.validation, qualified: true, termination: "qualified" });
        await snapshot();
        return { summary, catalog: result.catalog, manifest };
      }
      // An invalid emission cannot replace the last usable candidate/evidence.
      prior = await feedback(first, store, run) ?? prior;
      if (account.outcome === "exhausted") summary.termination = "budget-limit";
      else if (generation === maxGenerations) summary.termination = "generation-limit";
      await snapshot();
    } catch (error) {
      summary.termination = "interrupted";
      await snapshot();
      throw error;
    }
  }
  if (summary.termination === "in-progress") summary.termination = "generation-limit";
  await snapshot();
  return { summary, catalog: null, manifest: null };
}

/** Offline identity/account join. Does not replay or call an executor. */
export async function verifySeedEvidence(summary: SeedSummary, first: ExperimentTaskSpec, store: Store): Promise<HabitatBudget> {
  requireMatch(summary.contract === "algal.study-seed.v2" && summary.protocol === PROTOCOL_DIGEST, "summary protocol mismatch");
  requireMatch(summary.taskId === first.taskId && summary.taskDigest === first.digest, "summary task mismatch");
  requireMatch(/^[a-z0-9-]{1,64}$/.test(summary.blockId) && summary.corpus.length > 0 && summary.corpus.length <= 512,
    "summary identity invalid");
  requireMatch(summary.inFlight === null && !["in-progress", "interrupted"].includes(summary.termination), "unfinished seed evidence");
  asInt(summary.maxGenerations, "maxGenerations", 1, SEED_MAX_GENERATIONS);
  requireMatch(summary.attempts.length <= summary.maxGenerations, "too many generations");
  const aggregate = parseHabitatBudget(await value(store, summary.account));
  requireMatch(aggregate.limits.work <= SEED_BUDGET.work && aggregate.limits.runs <= SEED_BUDGET.runs &&
    aggregate.limits.attempts <= SEED_BUDGET.attempts, "evidence budget exceeds protocol");
  let account = new HabitatAccount("experiment", aggregate.limits).record();
  let prior: Prior | null = null;
  for (const [index, attempt] of summary.attempts.entries()) {
    const generation = index + 1;
    requireMatch(attempt.generation === generation, "attempt order mismatch");
    const config = await configuration(first, store, remaining(account.limits, account), generation, prior);
    requireMatch(same(await value(store, attempt.configuration), config), "attempt configuration differs from train-only protocol");
    requireMatch(attempt.parentManifest === (prior?.manifest ?? null) && attempt.trainEvidence === (prior?.evidenceDigest ?? null) &&
      attempt.feedbackReceipt === (prior?.receipt ?? null), "attempt training lineage mismatch");
    requireMatch(attempt.mode === (prior === null ? "generate" : "revise") &&
      attempt.fallback === (generation > 1 && prior === null ? "no-valid-prior" : null), "attempt mode mismatch");
    if (prior !== null) requireMatch(same(await value(store, attempt.trainEvidence!), prior.evidence), "training evidence mismatch");
    const session = parseExperimentSession(await value(store, attempt.session));
    const run = parseExperimentRun(await value(store, attempt.run));
    requireMatch(session.budget === attempt.account && session.tasks.length === 1 && session.tasks[0]!.run === attempt.run &&
      session.tasks[0]!.taskId === config.tasks[0]!.taskId && session.arm === "retained" && session.family === "record-triage", "session mismatch");
    requireMatch(run.taskId === config.tasks[0]!.taskId && run.manifest === attempt.manifest && same(run.generator, attempt.generator) &&
      run.outcome === attempt.outcome && same(run.failure, attempt.failure) && (run.promote?.report ?? null) === attempt.report &&
      run.phase === "acquisition" && run.arm === "retained" && run.consult.outcome === "miss", "run mismatch");
    const charged = parseHabitatBudget(await value(store, attempt.account));
    requireMatch(same(charged.limits, remaining(account.limits, account)), "attempt ceiling renewed");
    requireMatch(session.outcome === charged.outcome, "session/account outcome mismatch");
    for (const admission of charged.runs) {
      const recorded = await receipt(store, admission.receipt);
      const manifest = await store.getManifest(admission.manifest);
      requireMatch(manifest !== undefined && digestCanonical(manifestToJson(manifest)) === admission.manifest &&
        same(admission.ceiling, { work: manifest.budgets.maxWork, attempts: manifest.budgets.maxAgentCalls }),
      "admission ceiling differs from manifest");
      requireMatch(recorded.manifestDigest === admission.manifest && recorded.work.units === admission.charged.work &&
        recorded.work.agentCalls === admission.charged.attempts, "charge differs from receipt");
    }
    if (run.generator !== null) {
      const generator = parseExperimentArm(config.arm).generator!;
      const recorded = await receipt(store, run.generator.receipt);
      const args = mappedArgs(generator.manifest, { ...generator.args, task: taskSpecData(first) });
      requireMatch(run.generator.manifest === digestCanonical(manifestToJson(generator.manifest)) &&
        recorded.manifestDigest === run.generator.manifest && same(recorded.args, args), "writer request differs from train-only protocol");
      requireMatch(charged.runs[0]?.receipt === run.generator.receipt, "generator charge missing");
      if (run.manifest !== null) {
        const source = generator.manifest.interface!.outputs[generator.output]!;
        const wrapper = asObject(recorded.cells[source.cell]?.outputs?.[source.port], "generated output");
        const emitted = wrapper[generator.field!];
        const repairs = run.generator.normalized ?? [];
        const normalized = repairs.length > 0 ? normalizeEmittedManifest(emitted) : { value: emitted, repairs: [] };
        requireMatch(same(repairs, normalized.repairs) &&
          digestCanonical(manifestToJson(parseOrganismManifest(normalized.value))) === run.manifest,
        "executed manifest differs from generated candidate");
      }
    } else requireMatch(charged.runs.length === 0 && run.outcome === "exhausted", "missing generator evidence");
    const selected = attempt.report !== null && attempt.manifest !== null ? await selection(store, attempt.report, attempt.manifest) : null;
    requireMatch(attempt.report === null || (selected !== null && run.manifest !== null && run.receipt !== null),
      "selection lacks an executed candidate");
    requireMatch(same(attempt.train, selected?.train ?? null) && same(attempt.validation, selected?.validation ?? null), "summary scores mismatch");
    requireMatch(Boolean(run.promote?.promoted) === (selected !== null && selected.validation.passed === selected.validation.total),
      "promotion differs from validation");
    const expectedCharges: Digest[] = run.generator === null ? [] : [run.generator.receipt];
    if (run.receipt !== null && run.manifest !== null) {
      const candidate = await store.getManifest(run.manifest);
      requireMatch(candidate !== undefined, "candidate manifest absent");
      const execution = await outputs(store, run.receipt, candidate, config.tasks[0]!.args);
      requireMatch(run.args !== null && same(await value(store, run.args), execution.recorded.args), "run arguments mismatch");
      expectedCharges.push(run.receipt);
      if (selected !== null) {
        const cases = selected.candidate.cases;
        const declared = config.arm.cases.filter(c => c.split !== "holdout");
        requireMatch(Array.isArray(cases) && cases.length === declared.length, "selection cases mismatch");
        for (const [caseIndex, input] of declared.entries()) {
          const row = asObject(cases[caseIndex], "selection case");
          requireMatch(row.id === input.id && row.split === input.split && same(row.args, input.args) && same(row.expect, input.expect),
            "selection case differs from declared task");
          const address = asDigest(row.receiptDigest, "case receipt");
          const { recorded, out } = await outputs(store, address, candidate, input.args);
          requireMatch(same(row.outputs, out) && row.outcome === recorded.outcome && same(row.work, recorded.work),
            "selection case differs from receipt");
          const passed = recorded.outcome === "complete" && evalScorer(SCORER, input, out);
          requireMatch(row.passed === passed && same(input.split === "train" ? selected.train : selected.validation,
            { passed: Number(passed), total: 1 }), "selection score differs from receipt");
          expectedCharges.push(address);
        }
      }
    }
    // A budget refusal can leave a completed evaluation prefix without a
    // selection report. Its extra receipts must still be exact declared cases.
    if (run.outcome === "exhausted" && selected === null && run.manifest !== null) {
      const candidate = await store.getManifest(run.manifest);
      requireMatch(candidate !== undefined, "exhausted candidate absent");
      const suffix = charged.runs.slice(expectedCharges.length);
      const declared = config.arm.cases.filter(c => c.split !== "holdout");
      requireMatch(suffix.length <= declared.length, "unexpected exhausted charges");
      for (const [caseIndex, admission] of suffix.entries()) {
        await outputs(store, admission.receipt, candidate, declared[caseIndex]!.args);
        expectedCharges.push(admission.receipt);
      }
    }
    requireMatch(same(charged.runs.map(admission => admission.receipt), expectedCharges), "charged run order differs from attempt");
    const catalog = parseExperimentCatalog(await value(store, session.catalog));
    requireMatch(catalog.entries.length === (run.promote?.promoted ? 1 : 0), "catalog promotion mismatch");
    if (run.promote?.promoted) {
      requireMatch(index === summary.attempts.length - 1 && summary.qualified && summary.termination === "qualified" &&
        selected?.validation.passed === selected?.validation.total && summary.manifest === run.manifest &&
        summary.report === run.promote.report && summary.catalog === session.catalog && same(summary.train, selected?.train) &&
        same(summary.validation, selected?.validation), "promotion summary mismatch");
      const entry = catalog.entries[0]!;
      const kept = await store.getManifest(entry.manifest);
      requireMatch(entry.manifest === run.manifest && entry.report === run.promote.report && entry.taskId === run.taskId &&
        kept !== undefined && entry.interfaceDigest === digestCanonical(json(kept.interface)) &&
        entry.family === "record-triage" && same(entry.cases, config.arm.cases.filter(c => c.split !== "holdout")
          .map(c => ({ id: c.id, split: c.split }))), "selected entry mismatch");
    }
    account = append(account, charged);
    prior = await feedback(first, store, run) ?? prior;
  }
  requireMatch(same(account, aggregate), "aggregate account mismatch");
  const last = summary.attempts.at(-1);
  requireMatch(summary.qualified === (last?.report !== null && last?.report !== undefined && last.validation?.passed === last.validation?.total), "qualification mismatch");
  if (!summary.qualified) {
    requireMatch(summary.manifest === null && summary.report === null && summary.catalog === null &&
      summary.train === null && summary.validation === null, "failed seed exposes a selected candidate");
    requireMatch(summary.termination === "generation-limit"
      ? summary.attempts.length === summary.maxGenerations && account.outcome !== "exhausted"
      : summary.termination === "budget-limit" && (account.outcome === "exhausted" ||
        Object.values(remaining(account.limits, account)).some(v => v < 1)), "termination mismatch");
  }
  return aggregate;
}
