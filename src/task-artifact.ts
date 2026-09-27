/** Portable selected task. Evaluation digests are references, never approval. */
import { BUNDLE_CONTRACT, parseBundle, type Bundle } from "./bundle";
import { manifestToJson } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { boundedJsonSnapshot } from "./json-snapshot";
import type { Store } from "./store-contract";
import { compileTask, type TaskCompilation, type TaskDefinition } from "./task";
import type { TaskOptimizationReport } from "./task-optimizer";
import { asObject, canonicalize, noUnknownKeys, type JsonValue } from "./values";

export const EVALUATED_TASK_CONTRACT = "algal.evaluated-task.v1" as const;
export const EVALUATED_TASK_BOUNDS = Object.freeze({ maxBytes: 2_097_152, maxDepth: 48, maxNodes: 131_072, maxEntries: 512, maxStringBytes: 1_048_576 });
export type EvaluatedTaskArtifact = {
  contract: typeof EVALUATED_TASK_CONTRACT;
  baseTaskDigest: Digest;
  task: TaskDefinition;
  taskDigest: Digest;
  manifestDigest: Digest;
  bundle: Bundle;
  evaluation: { reportDigest: Digest; datasetDigest: Digest; strategy: TaskOptimizationReport["strategy"] };
  digest: Digest;
};
const json = (value: unknown) => value as JsonValue;
function mismatch(message: string): never { throw new AlgalError("DIGEST_MISMATCH", `evaluated task: ${message}`); }

export function parseEvaluatedTaskArtifact(value: unknown): EvaluatedTaskArtifact {
  const raw = asObject(boundedJsonSnapshot(value, EVALUATED_TASK_BOUNDS, "evaluated task"), "evaluated task");
  noUnknownKeys(raw, ["contract", "baseTaskDigest", "task", "taskDigest", "manifestDigest", "bundle", "evaluation", "digest"], "evaluated task");
  if (raw.contract !== EVALUATED_TASK_CONTRACT) throw new AlgalError("PARSE_FAILED", `expected ${EVALUATED_TASK_CONTRACT}`);
  const compiled = compileTask(raw.task);
  const bundle = parseBundle(raw.bundle);
  const evaluation = asObject(raw.evaluation, "evaluated task evaluation");
  noUnknownKeys(evaluation, ["reportDigest", "datasetDigest", "strategy"], "evaluated task evaluation");
  const strategy = evaluation.strategy;
  if (strategy !== "fixed" && strategy !== "labeled" && strategy !== "feedback") throw new AlgalError("PARSE_FAILED", "evaluated task: invalid strategy");
  const base: Omit<EvaluatedTaskArtifact, "digest"> = {
    contract: EVALUATED_TASK_CONTRACT,
    baseTaskDigest: asDigest(raw.baseTaskDigest, "evaluated task baseTaskDigest"),
    task: compiled.task,
    taskDigest: asDigest(raw.taskDigest, "evaluated task taskDigest"),
    manifestDigest: asDigest(raw.manifestDigest, "evaluated task manifestDigest"),
    bundle,
    evaluation: { reportDigest: asDigest(evaluation.reportDigest, "evaluated task reportDigest"), datasetDigest: asDigest(evaluation.datasetDigest, "evaluated task datasetDigest"), strategy },
  };
  if (base.taskDigest !== compiled.taskDigest || base.manifestDigest !== compiled.manifestDigest) mismatch("compiled task digests differ");
  const expectedBundle: Bundle = { contract: BUNDLE_CONTRACT, root: compiled.manifestDigest, manifests: { [compiled.manifestDigest]: manifestToJson(compiled.manifest) }, values: {} };
  if (canonicalize(json(bundle)) !== canonicalize(json(expectedBundle))) mismatch("bundle must contain exactly the compiled task");
  const digest = asDigest(raw.digest, "evaluated task digest");
  if (digestCanonical(json(base)) !== digest) mismatch("artifact digest differs");
  // Refuse normalization that could hide unsigned foreign fields or defaults.
  if (canonicalize(raw) !== canonicalize(json({ ...base, digest }))) mismatch("artifact is not normalized");
  return { ...base, digest };
}

/** Only instructions and training examples may differ from the host's base. */
export function assertEvaluatedTaskCompatible(value: EvaluatedTaskArtifact, hostBaseTask: TaskDefinition): TaskCompilation {
  const artifact = parseEvaluatedTaskArtifact(value);
  const base = compileTask(hostBaseTask);
  if (artifact.baseTaskDigest !== base.taskDigest) mismatch("host base task differs");
  const { instructions: _a, examples: _b, ...immutableBase } = base.task;
  const { instructions: _c, examples: _d, ...immutableTask } = artifact.task;
  if (canonicalize(json(immutableBase)) !== canonicalize(json(immutableTask))) mismatch("immutable task contract differs");
  return compileTask(artifact.task);
}

/** The caller must verify and admit the referenced evaluation separately. */
export async function buildEvaluatedTaskArtifact(options: { baseTask: TaskDefinition; report: TaskOptimizationReport; store: Store }): Promise<EvaluatedTaskArtifact> {
  const { report } = options;
  if (report.status !== "complete" || !report.selected || !report.result) throw new AlgalError("PARSE_FAILED", "evaluated task requires a completed selection");
  const compiled = compileTask(report.selected.task);
  if (report.result.promoted !== compiled.manifestDigest || report.portfolio[0] !== compiled.manifestDigest) mismatch("selected task differs from evaluation");
  const { digest: reportDigest, ...reportBase } = report;
  if (digestCanonical(json(reportBase)) !== reportDigest) mismatch("report digest differs");
  const stored = await options.store.getManifest(compiled.manifestDigest);
  if (!stored || canonicalize(manifestToJson(stored)) !== canonicalize(manifestToJson(compiled.manifest))) mismatch("selected manifest is absent or differs");
  const base: Omit<EvaluatedTaskArtifact, "digest"> = {
    contract: EVALUATED_TASK_CONTRACT,
    baseTaskDigest: compileTask(options.baseTask).taskDigest,
    task: compiled.task, taskDigest: compiled.taskDigest, manifestDigest: compiled.manifestDigest,
    bundle: { contract: BUNDLE_CONTRACT, root: compiled.manifestDigest, manifests: { [compiled.manifestDigest]: manifestToJson(compiled.manifest) }, values: {} },
    evaluation: { reportDigest, datasetDigest: report.datasetDigest, strategy: report.strategy },
  };
  const artifact = parseEvaluatedTaskArtifact({ ...base, digest: digestCanonical(json(base)) });
  assertEvaluatedTaskCompatible(artifact, options.baseTask);
  return artifact;
}
