/** Bounded task campaigns and offline reconstruction from recorded effects. */
import { manifestToJson, parseOrganismManifest } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { replayExecutor, type EffectReceipt } from "./effects";
import { AlgalError } from "./errors";
import { parseExprScorer } from "./expr";
import type { FoundryScorer } from "./foundry";
import { parseFoundryCandidate, parseFoundryReport } from "./foundry-verify";
import { checkHabitatBudgetEvidence, parseHabitatBudget } from "./habitat-budget";
import { boundedJsonSnapshot } from "./json-snapshot";
import { builtinRegistry } from "./registry";
import { parseRunReceipt, RUNTIME_VERSION } from "./run";
import type { Store } from "./store-contract";
import { MemoryStore } from "./store-memory";
import { compileTask, type TaskDefinition } from "./task";
import { optimizeTask, parseTaskCases, parseTaskOptimizerLimits, parseTaskReviser, TASK_OPTIMIZATION_CONTRACT, TASK_OPTIMIZER_BOUNDS, type TaskCase, type TaskOptimizationCandidate, type TaskRevision, type TaskOptimizationReport, type TaskOptimizerLimits, type TaskReviser } from "./task-optimizer";
import { asInt, asObject, canonicalize, noUnknownKeys, type JsonValue } from "./values";

export const TASK_WORKFLOW_CONTRACT = "algal.task-workflow.v1" as const;
export const TASK_WORKFLOW_ARCHIVE_CONTRACT = "algal.task-workflow-archive.v1" as const;
export const TASK_WORKFLOW_BOUNDS = Object.freeze({
  config: Object.freeze({ maxBytes: 4_194_304, maxDepth: 48, maxNodes: 262_144, maxEntries: 512, maxStringBytes: 1_048_576 }),
  report: Object.freeze({ maxBytes: 16_777_216, maxDepth: 64, maxNodes: 1_048_576, maxEntries: 4096, maxStringBytes: 1_048_576 }),
  archive: Object.freeze({ maxBytes: 67_108_864, maxDepth: 72, maxNodes: 4_194_304, maxEntries: 8192, maxStringBytes: 1_048_576 }),
});
export type TaskWorkflowConfig = {
  contract: typeof TASK_WORKFLOW_CONTRACT;
  task: TaskDefinition;
  cases: TaskCase[];
  strategy: TaskOptimizationReport["strategy"];
  limits: TaskOptimizerLimits;
  scorer?: FoundryScorer;
  reviser?: TaskReviser;
};
export type TaskWorkflowArchive = {
  contract: typeof TASK_WORKFLOW_ARCHIVE_CONTRACT;
  config: TaskWorkflowConfig;
  report: TaskOptimizationReport;
  manifests: Record<Digest, JsonValue>;
  receipts: Record<Digest, JsonValue>;
  digest: Digest;
};
const json = (value: unknown) => value as JsonValue;
function fail(message: string): never { throw new AlgalError("PARSE_FAILED", `task workflow: ${message}`); }
function same(actual: unknown, expected: unknown, label: string): void {
  if (canonicalize(json(actual)) !== canonicalize(json(expected))) throw new AlgalError("DIGEST_MISMATCH", `task workflow: ${label} differs`);
}
function signed<T extends object>(raw: T & { digest: Digest }, label: string): void {
  const { digest, ...base } = raw;
  if (digestCanonical(json(base)) !== digest) throw new AlgalError("DIGEST_MISMATCH", `task workflow: ${label} digest differs`);
}

export function parseTaskWorkflowConfig(value: unknown): TaskWorkflowConfig {
  const raw = asObject(boundedJsonSnapshot(value, TASK_WORKFLOW_BOUNDS.config, "task workflow config"), "task workflow config");
  noUnknownKeys(raw, ["contract", "task", "cases", "strategy", "limits", "scorer", "reviser"], "task workflow config");
  if (raw.contract !== TASK_WORKFLOW_CONTRACT) fail(`expected ${TASK_WORKFLOW_CONTRACT}`);
  const task = compileTask(raw.task).task;
  const cases = parseTaskCases(task, raw.cases);
  const limits = parseTaskOptimizerLimits(raw.limits);
  const strategy = raw.strategy;
  if (strategy !== "fixed" && strategy !== "labeled" && strategy !== "feedback") fail("invalid strategy");
  if (strategy === "feedback" && limits.maxRounds === 0) fail("feedback requires positive maxRounds");
  if (strategy !== "feedback" && raw.reviser !== undefined) fail("reviser requires feedback strategy");
  const training = cases.filter(item => item.split === "train").map(({ split: _split, ...item }) => canonicalize(json(item)));
  if (task.examples.length > limits.maxExamples || task.examples.some(item => !training.includes(canonicalize(json(item))))) fail("task examples must exactly match training cases within maxExamples");
  return { contract: TASK_WORKFLOW_CONTRACT, task, cases, strategy, limits,
    ...(raw.scorer === undefined ? {} : { scorer: parseExprScorer(raw.scorer, "task workflow scorer") }),
    ...(strategy === "feedback" ? { reviser: parseTaskReviser(raw.reviser) } : {}),
  };
}

export function parseTaskOptimizationReport(value: unknown): TaskOptimizationReport {
  const raw = asObject(boundedJsonSnapshot(value, TASK_WORKFLOW_BOUNDS.report, "task optimization report"), "task optimization report");
  noUnknownKeys(raw, ["contract", "strategy", "limits", "datasetDigest", "status", "candidates", "revisions", "portfolio", "selected", "result", "budget", "digest"], "task optimization report");
  if (raw.contract !== TASK_OPTIMIZATION_CONTRACT) fail(`expected ${TASK_OPTIMIZATION_CONTRACT}`);
  const strategy = raw.strategy;
  if (strategy !== "fixed" && strategy !== "labeled" && strategy !== "feedback") fail("invalid report strategy");
  const status = raw.status;
  if (status !== "complete" && status !== "budget-exhausted") fail("invalid report status");
  if (!Array.isArray(raw.candidates) || raw.candidates.length > TASK_OPTIMIZER_BOUNDS.maxCandidates) fail("candidate count exceeds bound");
  if (!Array.isArray(raw.revisions) || raw.revisions.length > TASK_OPTIMIZER_BOUNDS.maxRounds) fail("revision count exceeds bound");
  if (!Array.isArray(raw.portfolio) || raw.portfolio.length > TASK_OPTIMIZER_BOUNDS.maxPortfolio) fail("portfolio count exceeds bound");
  const candidates = raw.candidates.map((item, index): TaskOptimizationCandidate => {
    const candidate = asObject(item, "task candidate");
    noUnknownKeys(candidate, ["stage", "task", "evaluation"], "task candidate");
    const stage = candidate.stage;
    if (stage !== "fixed" && stage !== "labeled" && stage !== "feedback") return fail("invalid candidate stage");
    const compiled = compileTask(candidate.task);
    const evaluation = parseFoundryCandidate(candidate.evaluation!, index);
    if (evaluation.manifestDigest !== compiled.manifestDigest || evaluation.manifestKey !== compiled.manifest.key) fail("candidate compilation differs");
    return { stage, task: compiled.task, evaluation };
  });
  const revisions = raw.revisions.map((item): TaskRevision => {
    const revision = asObject(item, "task revision");
    noUnknownKeys(revision, ["round", "parent", "manifestDigest", "receiptDigest", "outcome", "patchDigest", "candidate", "rejection"], "task revision");
    const outcome = revision.outcome;
    if (outcome !== "complete" && outcome !== "failed" && outcome !== "stuck") return fail("invalid revision outcome");
    if (revision.rejection !== null && (typeof revision.rejection !== "string" || revision.rejection.length > TASK_OPTIMIZER_BOUNDS.maxRejectionLength)) fail("invalid revision rejection");
    return { round: asInt(revision.round, "revision round", 0, TASK_OPTIMIZER_BOUNDS.maxRounds - 1), parent: asDigest(revision.parent, "revision parent"), manifestDigest: asDigest(revision.manifestDigest, "revision manifest"), receiptDigest: asDigest(revision.receiptDigest, "revision receipt"), outcome,
      patchDigest: revision.patchDigest === null ? null : asDigest(revision.patchDigest, "revision patch"), candidate: revision.candidate === null ? null : asDigest(revision.candidate, "revision candidate"), rejection: revision.rejection as string | null };
  });
  let selected = null;
  if (raw.selected !== null) {
    const selection = asObject(raw.selected, "task selected");
    noUnknownKeys(selection, ["task", "taskDigest", "manifest", "manifestDigest"], "task selected");
    selected = compileTask(selection.task);
    same(selection, selected, "selected compilation");
  }
  const report: TaskOptimizationReport = { contract: TASK_OPTIMIZATION_CONTRACT, strategy, limits: parseTaskOptimizerLimits(raw.limits), datasetDigest: asDigest(raw.datasetDigest, "dataset digest"), status, candidates, revisions,
    portfolio: raw.portfolio.map(item => asDigest(item, "portfolio digest")), selected, result: raw.result === null ? null : parseFoundryReport(raw.result), budget: parseHabitatBudget(raw.budget), digest: asDigest(raw.digest, "report digest") };
  if ((status === "complete") !== (report.selected !== null && report.result !== null)) fail("status and selection differ");
  if (status === "budget-exhausted" && (report.selected !== null || report.result !== null)) fail("exhausted report has a selection");
  signed(report, "report");
  same(raw, report, "normalized report");
  return report;
}

/** Build from the complete account, including partial candidate runs/refusal. */
export async function buildTaskWorkflowArchive(options: { config: TaskWorkflowConfig; report: TaskOptimizationReport; store: Store }): Promise<TaskWorkflowArchive> {
  const config = parseTaskWorkflowConfig(options.config);
  const report = parseTaskOptimizationReport(options.report);
  const manifests: Record<Digest, JsonValue> = {};
  const receipts: Record<Digest, JsonValue> = {};
  const needed = new Set(report.budget.runs.map(run => run.manifest));
  if (report.budget.refused) needed.add(report.budget.refused.manifest);
  for (const digest of needed) {
    const manifest = await options.store.getManifest(digest);
    if (!manifest) fail(`missing manifest ${digest}`);
    manifests[digest] = manifestToJson(manifest);
  }
  for (const { receipt: digest } of report.budget.runs) {
    const receipt = await options.store.getReceipt(digest);
    if (!receipt) fail(`missing receipt ${digest}`);
    receipts[digest] = receipt;
  }
  const base = { contract: TASK_WORKFLOW_ARCHIVE_CONTRACT, config, report, manifests, receipts };
  return parseTaskWorkflowArchive({ ...base, digest: digestCanonical(json(base)) });
}

export function parseTaskWorkflowArchive(value: unknown): TaskWorkflowArchive {
  const raw = asObject(boundedJsonSnapshot(value, TASK_WORKFLOW_BOUNDS.archive, "task workflow archive"), "task workflow archive");
  noUnknownKeys(raw, ["contract", "config", "report", "manifests", "receipts", "digest"], "task workflow archive");
  if (raw.contract !== TASK_WORKFLOW_ARCHIVE_CONTRACT) fail(`expected ${TASK_WORKFLOW_ARCHIVE_CONTRACT}`);
  const config = parseTaskWorkflowConfig(raw.config);
  const report = parseTaskOptimizationReport(raw.report);
  const manifestsRaw = asObject(raw.manifests, "archive manifests");
  const receiptsRaw = asObject(raw.receipts, "archive receipts");
  const manifestKeys = new Set(report.budget.runs.map(run => run.manifest));
  if (report.budget.refused) manifestKeys.add(report.budget.refused.manifest);
  same(Object.keys(manifestsRaw).sort(), [...manifestKeys].sort(), "manifest closure");
  same(Object.keys(receiptsRaw).sort(), [...new Set(report.budget.runs.map(run => run.receipt))].sort(), "receipt closure");
  const manifests: Record<Digest, JsonValue> = {};
  const receipts: Record<Digest, JsonValue> = {};
  for (const [key, value] of Object.entries(manifestsRaw)) {
    const digest = asDigest(key, "archive manifest key");
    const normalized = manifestToJson(parseOrganismManifest(value));
    same(value, normalized, "normalized manifest");
    if (digestCanonical(normalized) !== digest) fail("manifest CAS digest differs");
    manifests[digest] = normalized;
  }
  for (const [key, value] of Object.entries(receiptsRaw)) {
    const digest = asDigest(key, "archive receipt key");
    const receipt = parseRunReceipt(value);
    if (digestCanonical(value) !== digest) fail("receipt CAS digest differs");
    // Do not discard fields normalized by receipt parsing; replay checks original bytes.
    if (receipt.runtime.version !== RUNTIME_VERSION) fail(`unsupported replay runtime ${receipt.runtime.version}`);
    receipts[digest] = value;
  }
  const archive = { contract: TASK_WORKFLOW_ARCHIVE_CONTRACT, config, report, manifests, receipts, digest: asDigest(raw.digest, "archive digest") };
  signed(archive, "archive");
  same(raw, archive, "normalized archive");
  return archive;
}

/** Reconstruct every selection, proposal, failed run and final frozen audit.
 * No provider, tool, transport or host executor can be supplied to this API.
 * Passing proves faithful execution of recorded effects, not label truth. */
export async function verifyTaskWorkflowArchive(value: unknown): Promise<{ archive: TaskWorkflowArchive; store: MemoryStore; report: TaskOptimizationReport }> {
  const archive = parseTaskWorkflowArchive(value);
  const store = new MemoryStore();
  const effects: EffectReceipt[] = [];
  for (const run of archive.report.budget.runs) effects.push(...parseRunReceipt(archive.receipts[run.receipt]!).effects);
  const report = await optimizeTask({ ...archive.config, store, executors: [replayExecutor(effects)] });
  same(report, archive.report, "reconstructed optimizer report");
  // The report binds every admitted receipt, not only completed candidates.
  for (const [key, value] of Object.entries(archive.manifests)) {
    const actual = await store.getManifest(asDigest(key, "manifest"));
    if (!actual) fail("reconstructed manifest missing");
    same(manifestToJson(actual), value, "reconstructed manifest");
  }
  for (const [key, value] of Object.entries(archive.receipts)) same(await store.getReceipt(asDigest(key, "receipt")), value, "reconstructed receipt");
  const evidence = await checkHabitatBudgetEvidence(report.budget, store, { fns: builtinRegistry() });
  if (evidence.mismatches.length) fail(evidence.mismatches.slice(0, 8).join("; "));
  return { archive, store, report };
}

export function inspectTaskWorkflow(value: unknown) {
  const archive = parseTaskWorkflowArchive(value);
  const report = archive.report;
  return { archiveDigest: archive.digest, reportDigest: report.digest, datasetDigest: report.datasetDigest, strategy: report.strategy, status: report.status,
    selectedTaskDigest: report.selected?.taskDigest ?? null, selectedManifestDigest: report.selected?.manifestDigest ?? null,
    candidates: report.candidates.map(item => ({ stage: item.stage, manifestDigest: item.evaluation.manifestDigest, train: item.evaluation.train, validation: item.evaluation.validation })),
    holdout: report.result ? { passed: report.result.holdout.passed, total: report.result.holdout.total } : null,
    revisions: { total: report.revisions.length, rejected: report.revisions.filter(item => item.rejection !== null).length },
    budget: { charged: report.budget.charged, limits: report.budget.limits, outcome: report.budget.outcome, refused: report.budget.refused },
    verification: "parsed-only" as const,
  };
}

export function compareTaskWorkflows(left: unknown, right: unknown) {
  const a = parseTaskWorkflowArchive(left);
  const b = parseTaskWorkflowArchive(right);
  const sameDataset = a.report.datasetDigest === b.report.datasetDigest;
  const sameBaseTask = compileTask(a.config.task).taskDigest === compileTask(b.config.task).taskDigest;
  const sameScorer = canonicalize(json(a.config.scorer ?? null)) === canonicalize(json(b.config.scorer ?? null));
  return { comparable: sameDataset && sameBaseTask && sameScorer, sameDataset, sameBaseTask, sameScorer,
    left: inspectTaskWorkflow(a), right: inspectTaskWorkflow(b),
    changedParameters: a.report.selected && b.report.selected ? {
      instructions: a.report.selected.task.instructions === b.report.selected.task.instructions ? null : { before: a.report.selected.task.instructions, after: b.report.selected.task.instructions },
      examples: canonicalize(json(a.report.selected.task.examples)) === canonicalize(json(b.report.selected.task.examples)) ? null : { before: a.report.selected.task.examples, after: b.report.selected.task.examples },
    } : null };
}
