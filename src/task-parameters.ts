import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { boundedJsonSnapshot } from "./json-snapshot";
import { compileTask, TASK_BOUNDS, type TaskDefinition } from "./task";
import { asObject, noUnknownKeys, type JsonValue } from "./values";

export const TASK_PARAMETER_PATCH_CONTRACT = "algal.task-parameter-patch.v1" as const;
export const TASK_PARAMETER_IDS = ["task.instructions", "task.examples"] as const;
export type TaskParameterId = (typeof TASK_PARAMETER_IDS)[number];
export type TaskParameter = { id: TaskParameterId; digest: Digest; value: JsonValue };
export type TaskParameters = { taskDigest: Digest; manifestDigest: Digest; parameters: TaskParameter[] };
export type TaskParameterPatch = {
  contract: typeof TASK_PARAMETER_PATCH_CONTRACT;
  taskDigest: Digest;
  changes: { id: TaskParameterId; expectedDigest: Digest; value: JsonValue }[];
};

export function taskParameters(value: unknown): TaskParameters {
  const { task, taskDigest, manifestDigest } = compileTask(value);
  const values: Record<TaskParameterId, JsonValue> = { "task.instructions": task.instructions, "task.examples": task.examples as unknown as JsonValue };
  return { taskDigest, manifestDigest, parameters: TASK_PARAMETER_IDS.map(id => ({ id, value: values[id], digest: digestCanonical(values[id]) })) };
}

export function parseTaskParameterPatch(value: unknown): TaskParameterPatch {
  const raw = asObject(boundedJsonSnapshot(value, TASK_BOUNDS.data, "task parameter patch"), "task parameter patch");
  noUnknownKeys(raw, ["contract", "taskDigest", "changes"], "task parameter patch");
  if (raw.contract !== TASK_PARAMETER_PATCH_CONTRACT) throw new AlgalError("PARSE_FAILED", `task parameter patch contract must be ${TASK_PARAMETER_PATCH_CONTRACT}`);
  if (!Array.isArray(raw.changes) || raw.changes.length < 1 || raw.changes.length > TASK_PARAMETER_IDS.length) throw new AlgalError("PARSE_FAILED", "task parameter patch requires one or two changes");
  const ids = new Set<string>();
  const changes = raw.changes.map((value, i) => {
    const change = asObject(value, `task parameter change ${i}`);
    noUnknownKeys(change, ["id", "expectedDigest", "value"], `task parameter change ${i}`);
    if (!(TASK_PARAMETER_IDS as readonly unknown[]).includes(change.id)) throw new AlgalError("PARSE_FAILED", "task parameter is not editable");
    const id = change.id as TaskParameterId;
    if (ids.has(id)) throw new AlgalError("PARSE_FAILED", `duplicate task parameter ${id}`);
    ids.add(id);
    if (!Object.hasOwn(change, "value")) throw new AlgalError("PARSE_FAILED", "task parameter change requires value");
    return { id, expectedDigest: asDigest(change.expectedDigest, "task parameter expectedDigest"), value: change.value! };
  });
  return { contract: TASK_PARAMETER_PATCH_CONTRACT, taskDigest: asDigest(raw.taskDigest, "task parameter taskDigest"), changes };
}

/** Atomic immutable update. No fields besides instructions and labeled
 * examples can change; the task and every old value must match their guard. */
export function applyTaskParameterPatch(value: unknown, suppliedPatch: unknown): TaskDefinition {
  const original = compileTask(value).task;
  const current = taskParameters(original);
  const patch = parseTaskParameterPatch(suppliedPatch);
  if (patch.taskDigest !== current.taskDigest) throw new AlgalError("DIGEST_MISMATCH", "task parameter patch has a stale task digest");
  const next: Record<string, unknown> = { ...original };
  for (const change of patch.changes) {
    const parameter = current.parameters.find(parameter => parameter.id === change.id)!;
    if (change.expectedDigest !== parameter.digest) throw new AlgalError("DIGEST_MISMATCH", `task parameter ${change.id} has a stale value digest`);
    next[change.id === "task.instructions" ? "instructions" : "examples"] = change.value;
  }
  // Validate the entire replacement before returning anything. Invalid
  // values, schemas, or combined prompt lengths leave the source untouched.
  return compileTask(next).task;
}
