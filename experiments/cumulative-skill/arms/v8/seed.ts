// Training examples, train-only repairs, a bounded development score, and a
// fixed round schedule. Validation selects the first passing candidate but
// never enters a writer request; the development batch is scored outside the
// selection foundry and only its pass count reaches the writer.
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../../../../src/contract";
import { asDigest, digestCanonical, type Digest } from "../../../../src/digest";
import type { Executor } from "../../../../src/effects";
import { AlgalError } from "../../../../src/errors";
import { normalizeEmittedManifest, parseExperimentArm, parseExperimentCatalog, parseExperimentRun, parseExperimentSession, runExperimentArm,
  type ExperimentCatalog, type ExperimentRun } from "../../../../src/experiment-run";
import { taskBatchArgs, taskCases, taskSpecData, type ExperimentTaskSpec } from "../../../../src/experiment-task";
import { evalProgram, evalScorer } from "../../../../src/expr";
import { HabitatAccount, parseHabitatBudget, parseHabitatLimits, type HabitatBudget, type HabitatLimits } from "../../../../src/habitat-budget";
import { builtinRegistry } from "../../../../src/registry";
import { parseRunReceipt, receiptDigest, runOrganism, type RunReceipt } from "../../../../src/run";
import type { Store } from "../../../../src/store";
import { asInt, asObject, canonicalize, noUnknownKeys, type JsonObject, type JsonValue } from "../../../../src/values";
import { developmentHistory, roundFor, seedTrainingExamples, studyGenerator, type DevelopmentScore } from "./generators";
import { DEVELOPMENT_AGREEMENT, PROTOCOL_DIGEST, SCORER, SEED_BUDGET, SEED_MAX_GENERATIONS, type RoundMode } from "./protocol";

export const SEED_CONTRACT = "algal.study-seed.v3" as const;
export const DEVELOPMENT_CONTRACT = "algal.study-development-score.v2" as const;
type Score = { passed: number; total: number };
/** The bounded development result: the agreement value rounded to hundredths. */
type DevelopmentResult = { score: number };
export type SeedPlan = {
  generation: number; round: RoundMode; configuration: Digest; parentManifest: Digest | null;
  trainEvidence: Digest | null; feedbackReceipt: Digest | null; developmentHistory: DevelopmentScore[];
  mode: "generate" | "revise"; fallback: "no-valid-prior" | null;
};
/** The stored development result for one executed candidate. */
export type DevelopmentRecord = {
  contract: typeof DEVELOPMENT_CONTRACT; generation: number; round: RoundMode; manifest: Digest; case: string;
  receipt: Digest | null; outcome: RunReceipt["outcome"] | "refused"; score: number; account: Digest;
};
export type SeedAttempt = SeedPlan & {
  session: Digest; run: Digest; account: Digest; manifest: Digest | null; report: Digest | null;
  generator: ExperimentRun["generator"]; outcome: ExperimentRun["outcome"]; failure: ExperimentRun["failure"];
  validation: Score | null; train: Score | null;
  /** Digest of the writer's executed manifest and exact arguments. */
  request: Digest | null; duplicateRequest: boolean; repeatedManifest: boolean;
  development: DevelopmentResult | null; developmentRecord: Digest | null;
};
export type SeedSummary = {
  contract: typeof SEED_CONTRACT; blockId: string; protocol: Digest; corpus: string;
  taskId: string; taskDigest: Digest; manifest: Digest | null; report: Digest | null;
  catalog: Digest | null; account: Digest; validation: Score | null; train: Score | null;
  qualified: boolean; duplicateRequests: number;
  termination: "in-progress" | "interrupted" | "qualified" | "generation-limit" | "budget-limit" | "duplicate-request";
  maxGenerations: number; attempts: SeedAttempt[]; inFlight: SeedPlan | null;
};
type Prior = { manifest: Digest; evidence: JsonObject; evidenceDigest: Digest; receipt: Digest };
const json = (value: unknown) => value as JsonValue;
const same = (a: unknown, b: unknown) => canonicalize(json(a)) === canonicalize(json(b));
function requireMatch(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(`v8 seed: ${message}`);
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
function exhausted(limits: HabitatLimits, account: HabitatBudget): boolean {
  const budget = remaining(limits, account);
  return account.outcome === "exhausted" || budget.work < 1 || budget.runs < 1 || budget.attempts < 1;
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
function manifestOutputs(manifest: OrganismManifest, cells: RunReceipt["cells"]): JsonObject {
  const out: JsonObject = {};
  for (const [name, source] of Object.entries(manifest.interface?.outputs ?? {})) {
    const result = cells[source.cell]?.outputs?.[source.port];
    if (result !== undefined) out[name] = result;
  }
  return out;
}
async function outputs(store: Store, address: Digest, manifest: OrganismManifest, args: Record<string, JsonValue>) {
  const recorded = await receipt(store, address);
  requireMatch(recorded.manifestDigest === digestCanonical(manifestToJson(manifest)) &&
    same(recorded.args, mappedArgs(manifest, args)), "evaluation receipt binding mismatch");
  return { recorded, out: manifestOutputs(manifest, recorded.cells) };
}
/** The scored development case, never part of the selection foundry's cases. */
export function developmentCase(first: ExperimentTaskSpec) {
  const batch = first.inputs.find(batch => batch.split === "development");
  requireMatch(batch !== undefined, `${first.taskId}: no development batch`);
  const row = taskCases(first).find(c => c.split === "development")!;
  return { id: `${first.taskId}-${row.id}`, split: row.split, args: row.args, expect: row.expect };
}
async function configuration(first: ExperimentTaskSpec, store: Store, budget: HabitatLimits, generation: number, prior: Prior | null,
  history: DevelopmentScore[]) {
  const generator = studyGenerator(prior === null ? "generator.algal.json" : "reviser.algal.json", seedTrainingExamples(first));
  generator.args.generation = generation;
  generator.args.round = roundFor(generation);
  generator.args.development = json(developmentHistory(history));
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
      cases: taskCases(first).filter(c => c.split !== "development").map(c => ({ ...c, id: `${first.taskId}-${c.id}` })) },
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
/** The writer request identity: the executed writer manifest and its exact arguments. */
async function requestIdentity(store: Store, run: ExperimentRun): Promise<Digest | null> {
  if (run.generator === null) return null;
  const recorded = await receipt(store, run.generator.receipt);
  requireMatch(recorded.manifestDigest === run.generator.manifest, "writer receipt ran another manifest");
  return digestCanonical({ manifest: run.generator.manifest, args: recorded.args });
}
function parseDevelopmentRecord(raw: unknown, at: string): DevelopmentRecord {
  const record = asObject(raw, at);
  noUnknownKeys(record, ["contract", "generation", "round", "manifest", "case", "receipt", "outcome", "score", "account"], at);
  requireMatch(record.contract === DEVELOPMENT_CONTRACT, `${at}: contract mismatch`);
  const generation = asInt(record.generation, `${at}.generation`, 1, SEED_MAX_GENERATIONS);
  requireMatch(record.round === roundFor(generation), `${at}: round differs from the schedule`);
  const score = record.score;
  requireMatch(typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 1 && roundedScore(score) === score, `${at}: invalid score`);
  requireMatch(typeof record.case === "string" && typeof record.outcome === "string", `${at}: invalid case or outcome`);
  requireMatch((record.receipt === null) === (record.outcome === "refused"), `${at}: receipt and outcome disagree`);
  requireMatch(record.outcome !== "refused" || score === 0, `${at}: a refused run cannot score`);
  return { contract: DEVELOPMENT_CONTRACT, generation, round: record.round as RoundMode, manifest: asDigest(record.manifest, `${at}.manifest`),
    case: record.case, receipt: record.receipt === null ? null : asDigest(record.receipt, `${at}.receipt`),
    outcome: record.outcome as DevelopmentRecord["outcome"], score: score as number, account: asDigest(record.account, `${at}.account`) };
}

function roundedScore(value: number) {
  return Math.round(value * 100) / 100;
}

/** The agreement value of one development execution: 0 unless the run
 * completed, otherwise the v6 agreement program rounded to hundredths. */
function developmentScore(c: { args: Record<string, JsonValue>; expect: Record<string, JsonValue> }, outcome: RunReceipt["outcome"],
  out: Record<string, JsonValue>): number {
  if (outcome !== "complete") return 0;
  const r = evalProgram(DEVELOPMENT_AGREEMENT, { args: c.args, expect: c.expect, outputs: out });
  if (!r.ok) throw new AlgalError("SCORER_INVALID", `development agreement ${canonicalize(r.err)}`);
  requireMatch(typeof r.value === "number" && Number.isFinite(r.value) && r.value >= 0 && r.value <= 1, "development agreement must be a number in [0,1]");
  return roundedScore(r.value as number);
}
/** Executes the candidate once on the development batch under the remaining
 * seed budget and stores the bounded result. */
async function scoreDevelopment(first: ExperimentTaskSpec, store: Store, executors: Executor[], limits: HabitatLimits, generation: number,
  manifestDigest: Digest): Promise<{ record: DevelopmentRecord; digest: Digest; account: HabitatBudget }> {
  const candidate = await store.getManifest(manifestDigest);
  requireMatch(candidate !== undefined, "development candidate missing");
  const c = developmentCase(first);
  const args = mappedArgs(candidate, c.args) as Record<string, Record<string, JsonValue>>;
  const ledger = new HabitatAccount("experiment", limits);
  let executed: { receipt: RunReceipt; receiptDigest: Digest } | null = null;
  try {
    executed = await ledger.admit({ manifest: manifestDigest, budgets: candidate.budgets, args }, () => runOrganism({
      manifest: candidate, args, fns: builtinRegistry(), store, executors }), store);
  } catch (error) {
    if (!(error instanceof AlgalError && error.code === "BUDGET_EXHAUSTED")) throw error;
  }
  const account = ledger.record();
  const accountDigest = await store.putValue(json(account));
  const score = executed === null ? 0 : developmentScore(c, executed.receipt.outcome, manifestOutputs(candidate, executed.receipt.cells));
  const record: DevelopmentRecord = { contract: DEVELOPMENT_CONTRACT, generation, round: roundFor(generation), manifest: manifestDigest, case: c.id,
    receipt: executed?.receiptDigest ?? null, outcome: executed?.receipt.outcome ?? "refused", score, account: accountDigest };
  return { record, digest: await store.putValue(json(record)), account };
}

export async function generateStudySeed(opts: {
  first: ExperimentTaskSpec; blockId: string; corpus: string; protocolDigest?: Digest;
  store: Store; executors: Executor[]; maxGenerations?: number; budget?: HabitatLimits;
  onAttempt?: (summary: SeedSummary) => void | Promise<void>;
}): Promise<{ summary: SeedSummary; catalog: ExperimentCatalog | null; manifest: OrganismManifest | null }> {
  const { first, store } = opts;
  requireMatch(first.phase === "acquisition", "first task must be acquisition");
  developmentCase(first);
  requireMatch(/^[a-z0-9-]{1,64}$/.test(opts.blockId), "invalid block id");
  requireMatch(opts.corpus.length > 0 && opts.corpus.length <= 512, "invalid corpus identity");
  const protocol = opts.protocolDigest ?? PROTOCOL_DIGEST;
  requireMatch(protocol === PROTOCOL_DIGEST, "protocol identity mismatch");
  const maxGenerations = asInt(opts.maxGenerations ?? SEED_MAX_GENERATIONS, "maxGenerations", 1, SEED_MAX_GENERATIONS);
  const limits = parseHabitatLimits(opts.budget ?? SEED_BUDGET);
  requireMatch(limits.work <= SEED_BUDGET.work && limits.attempts <= SEED_BUDGET.attempts && limits.runs <= SEED_BUDGET.runs, "budget exceeds protocol");
  let account = new HabitatAccount("experiment", limits).record();
  const summary: SeedSummary = { contract: SEED_CONTRACT, blockId: opts.blockId, protocol, corpus: opts.corpus,
    taskId: first.taskId, taskDigest: first.digest, manifest: null, report: null, catalog: null,
    account: await store.putValue(json(account)), validation: null, train: null, qualified: false, duplicateRequests: 0,
    termination: "in-progress", maxGenerations, attempts: [], inFlight: null };
  const snapshot = async () => { await opts.onAttempt?.(structuredClone(summary)); };
  await snapshot();
  let prior: Prior | null = null;
  const history: DevelopmentScore[] = [];
  for (let generation = 1; generation <= maxGenerations; generation++) {
    if (exhausted(limits, account)) {
      summary.termination = "budget-limit";
      break;
    }
    const config = await configuration(first, store, remaining(limits, account), generation, prior, history);
    const plan: SeedPlan = {
      generation, round: roundFor(generation), configuration: await store.putValue(json(config)), parentManifest: prior?.manifest ?? null,
      trainEvidence: prior === null ? null : await store.putValue(prior.evidence), feedbackReceipt: prior?.receipt ?? null,
      developmentHistory: structuredClone(history),
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
      const request = await requestIdentity(store, run);
      const duplicateRequest = request !== null && summary.attempts.some(attempt => attempt.request === request);
      const repeatedManifest = run.manifest !== null && summary.attempts.some(attempt => attempt.manifest === run.manifest);
      const attempt: SeedAttempt = { ...plan, session: result.sessionDigest, run: result.runDigests[0]!, account: result.session.budget,
        manifest: run.manifest, report, generator: run.generator, outcome: run.outcome, failure: run.failure,
        train: scores?.train ?? null, validation: scores?.validation ?? null,
        request, duplicateRequest, repeatedManifest, development: null, developmentRecord: null };
      summary.attempts.push(attempt);
      summary.inFlight = null;
      if (duplicateRequest) summary.duplicateRequests += 1;
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
      // A duplicate writer request is a protocol failure: keep it, stop, never retry it.
      if (duplicateRequest) {
        summary.termination = "duplicate-request";
        await snapshot();
        break;
      }
      // An executed candidate that failed selection earns one bounded
      // development score under the remaining budget.
      if (run.manifest !== null && run.receipt !== null && !exhausted(limits, account)) {
        const scored = await scoreDevelopment(first, store, opts.executors, remaining(limits, account), generation, run.manifest);
        account = append(account, scored.account);
        summary.account = await store.putValue(json(account));
        attempt.development = { score: scored.record.score };
        attempt.developmentRecord = scored.digest;
        if (scored.record.outcome !== "refused") history.push({ generation, round: plan.round, score: scored.record.score });
      }
      // An invalid emission cannot replace the last usable candidate/evidence.
      prior = await feedback(first, store, run) ?? prior;
      if (exhausted(limits, account)) summary.termination = "budget-limit";
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
  requireMatch(summary.contract === SEED_CONTRACT && summary.protocol === PROTOCOL_DIGEST, "summary protocol mismatch");
  requireMatch(summary.taskId === first.taskId && summary.taskDigest === first.digest, "summary task mismatch");
  requireMatch(/^[a-z0-9-]{1,64}$/.test(summary.blockId) && summary.corpus.length > 0 && summary.corpus.length <= 512,
    "summary identity invalid");
  requireMatch(summary.inFlight === null && !["in-progress", "interrupted"].includes(summary.termination), "unfinished seed evidence");
  asInt(summary.maxGenerations, "maxGenerations", 1, SEED_MAX_GENERATIONS);
  requireMatch(summary.attempts.length <= summary.maxGenerations, "too many generations");
  const c = developmentCase(first);
  const aggregate = parseHabitatBudget(await value(store, summary.account));
  requireMatch(aggregate.limits.work <= SEED_BUDGET.work && aggregate.limits.runs <= SEED_BUDGET.runs &&
    aggregate.limits.attempts <= SEED_BUDGET.attempts, "evidence budget exceeds protocol");
  let account = new HabitatAccount("experiment", aggregate.limits).record();
  let prior: Prior | null = null;
  const history: DevelopmentScore[] = [];
  const requests = new Set<Digest>();
  const manifests = new Set<Digest>();
  let duplicateRequests = 0;
  for (const [index, attempt] of summary.attempts.entries()) {
    const generation = index + 1;
    requireMatch(attempt.generation === generation && attempt.round === roundFor(generation), "attempt order or round mismatch");
    requireMatch(!exhausted(account.limits, account), "attempt started after the budget was exhausted");
    const config = await configuration(first, store, remaining(account.limits, account), generation, prior, history);
    requireMatch(same(await value(store, attempt.configuration), config), "attempt configuration differs from the v8 protocol");
    requireMatch(same(attempt.developmentHistory, developmentHistory(history)), "attempt development history mismatch");
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
        recorded.manifestDigest === run.generator.manifest && same(recorded.args, args), "writer request differs from the v8 protocol");
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
    // Writer request identity, duplicate accounting, and repeated manifests.
    const request = await requestIdentity(store, run);
    requireMatch(attempt.request === request, "writer request identity mismatch");
    requireMatch(attempt.duplicateRequest === (request !== null && requests.has(request)), "duplicate request flag mismatch");
    requireMatch(attempt.repeatedManifest === (run.manifest !== null && manifests.has(run.manifest)), "repeated manifest flag mismatch");
    if (request !== null) requests.add(request);
    if (run.manifest !== null) manifests.add(run.manifest);
    if (attempt.duplicateRequest) duplicateRequests += 1;
    const selected = attempt.report !== null && attempt.manifest !== null ? await selection(store, attempt.report, attempt.manifest) : null;
    requireMatch(attempt.report === null || (selected !== null && run.manifest !== null && run.receipt !== null),
      "selection lacks an executed candidate");
    requireMatch(same(attempt.train, selected?.train ?? null) && same(attempt.validation, selected?.validation ?? null), "summary scores mismatch");
    requireMatch(Boolean(run.promote?.promoted) === (selected !== null && selected.validation.passed === selected.validation.total),
      "promotion differs from validation");
    const expectedCharges: Digest[] = run.generator === null ? [] : [run.generator.receipt];
    let candidate: OrganismManifest | undefined;
    if (run.receipt !== null && run.manifest !== null) {
      candidate = await store.getManifest(run.manifest);
      requireMatch(candidate !== undefined, "candidate manifest absent");
      const execution = await outputs(store, run.receipt, candidate, config.tasks[0]!.args);
      requireMatch(run.args !== null && same(await value(store, run.args), execution.recorded.args), "run arguments mismatch");
      expectedCharges.push(run.receipt);
      if (selected !== null) {
        const cases = selected.candidate.cases;
        const declared = config.arm.cases.filter(c => c.split !== "holdout");
        requireMatch(declared.every(c => c.split !== "development"), "development case entered the selection foundry");
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
      candidate ??= await store.getManifest(run.manifest);
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
    const promoted = Boolean(run.promote?.promoted);
    // The development score exists exactly when an executed candidate failed
    // selection, the request was not a duplicate, and budget remained.
    const scoreDue = !promoted && !attempt.duplicateRequest && run.manifest !== null && run.receipt !== null && !exhausted(account.limits, account);
    requireMatch((attempt.developmentRecord !== null) === scoreDue && (attempt.development !== null) === scoreDue, "development score presence mismatch");
    if (attempt.developmentRecord !== null) {
      const record = parseDevelopmentRecord(await value(store, attempt.developmentRecord), "development record");
      requireMatch(record.generation === generation && record.manifest === run.manifest && record.case === c.id, "development record identity mismatch");
      requireMatch(same(attempt.development, { score: record.score }), "development score differs from its record");
      const ledger = parseHabitatBudget(await value(store, record.account));
      requireMatch(same(ledger.limits, remaining(account.limits, account)), "development ceiling renewed");
      if (record.receipt === null) {
        requireMatch(ledger.outcome === "exhausted" && ledger.runs.length === 0 && ledger.refused?.manifest === run.manifest, "refused development run mismatch");
      } else {
        requireMatch(candidate !== undefined, "development candidate absent");
        requireMatch(ledger.outcome === "complete" && ledger.runs.length === 1 && ledger.runs[0]!.receipt === record.receipt &&
          ledger.runs[0]!.manifest === run.manifest, "development charge mismatch");
        const { recorded, out } = await outputs(store, record.receipt, candidate, c.args);
        requireMatch(recorded.outcome === record.outcome && recorded.work.units === ledger.runs[0]!.charged.work &&
          recorded.work.agentCalls === ledger.runs[0]!.charged.attempts, "development receipt differs from its charge");
        requireMatch(record.score === developmentScore(c, recorded.outcome, out), "development score differs from receipt");
        history.push({ generation, round: record.round, score: record.score });
      }
      account = append(account, ledger);
    }
    if (promoted) requireMatch(index === summary.attempts.length - 1, "attempts continue after qualification");
    if (attempt.duplicateRequest) requireMatch(index === summary.attempts.length - 1 && !promoted, "attempts continue after a duplicate request");
    prior = await feedback(first, store, run) ?? prior;
  }
  requireMatch(same(account, aggregate), "aggregate account mismatch");
  requireMatch(summary.duplicateRequests === duplicateRequests, "duplicate request count mismatch");
  const last = summary.attempts.at(-1);
  requireMatch(summary.qualified === (last?.report !== null && last?.report !== undefined && last.validation?.passed === last.validation?.total), "qualification mismatch");
  if (!summary.qualified) {
    requireMatch(summary.manifest === null && summary.report === null && summary.catalog === null &&
      summary.train === null && summary.validation === null, "failed seed exposes a selected candidate");
    if (summary.termination === "duplicate-request") requireMatch(last?.duplicateRequest === true, "duplicate termination without a duplicate");
    else if (summary.termination === "generation-limit") {
      requireMatch(summary.attempts.length === summary.maxGenerations && !exhausted(account.limits, account) && last?.duplicateRequest !== true, "termination mismatch");
    } else requireMatch(summary.termination === "budget-limit" && exhausted(account.limits, account), "termination mismatch");
  } else requireMatch(summary.termination === "qualified", "qualified seed termination mismatch");
  return aggregate;
}
