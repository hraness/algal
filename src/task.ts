import { BOUNDS, CONTRACT, manifestToJson, parseOrganismManifest, type AgentOutput, type Budgets, type CellBudget, type OrganismManifest, type PortMap, type Route } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { bindOutput, type Executor } from "./effects";
import { AlgalError } from "./errors";
import { boundedJsonSnapshot } from "./json-snapshot";
import { builtinRegistry } from "./registry";
import { checkValue, runOrganism, type RunReceipt } from "./run";
import type { Store } from "./store-contract";
import { asObject, asSafeId, asString, canonicalize, noUnknownKeys, type JsonValue } from "./values";

/** Authoring data. Compilation produces the existing organism contract. */
export const TASK_CONTRACT = "algal.task.v1" as const;
export const TASK_BOUNDS = Object.freeze({
  maxExamples: 16,
  defaultMaxEffectMs: 60_000,
  data: Object.freeze({ maxBytes: 262_144, maxDepth: 32, maxNodes: 16_384, maxEntries: 512, maxStringBytes: 65_536 }),
});

export type TaskEffectBudget = CellBudget & { maxEffectMs: number; maxContextBytes: number; maxOutputBytes: number };

export type TaskExample = {
  id: string;
  /** Dataset provenance group, such as document, user, or conversation. */
  sourceId: string;
  args: Record<string, JsonValue>;
  expect: Record<string, JsonValue>;
};

export type TaskDefinition = {
  contract: typeof TASK_CONTRACT;
  key: string;
  name: string;
  inputs: PortMap;
  output: { name: string; contract: AgentOutput };
  instructions: string;
  budgets: Budgets;
  /** Normalized at parse time: context/output default to the run ceilings;
   * each model call times out after 60 seconds unless explicitly configured. */
  effectBudget: TaskEffectBudget;
  route?: Route;
  examples: TaskExample[];
};

export type TaskCompilation = {
  task: TaskDefinition;
  taskDigest: Digest;
  manifest: OrganismManifest;
  manifestDigest: Digest;
};

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", `task: ${message}`);
}

function manifestData(task: { key: unknown; name: unknown; inputs: Record<string, unknown>; output: { name: string; contract: unknown }; instructions: string; budgets: unknown; effectBudget: unknown; route?: unknown }, examples: TaskExample[]): unknown {
  const names = Object.keys(task.inputs).sort();
  const prompt = examples.length === 0 ? task.instructions : `${task.instructions}\n\nLabeled examples (inputs and expected outputs):\n${canonicalize(examples.map(({ args, expect }) => ({ args, expect })))}`;
  return {
    contract: CONTRACT,
    key: task.key,
    name: task.name,
    budgets: task.budgets,
    interface: {
      inputs: Object.fromEntries(names.map(name => [name, { cell: "input", port: name }])),
      outputs: { [task.output.name]: { cell: "task", port: "out" } },
    },
    cells: [
      { id: "input", kind: "input", outputs: task.inputs },
      { id: "task", kind: "agent", inputs: task.inputs, prompt, view: { inputs: names }, output: task.output.contract, budget: task.effectBudget, ...(task.route === undefined ? {} : { route: task.route }) },
    ],
    edges: names.map(name => ({ from: { cell: "input", port: name }, to: { cell: "task", port: name } })),
  };
}

/** Reject accidental label leakage: callers must select exactly the declared
 * input names. Missing optional inputs are allowed; unknown inputs are not. */
export function parseTaskArgs(task: Pick<TaskDefinition, "inputs">, value: unknown): Record<string, JsonValue> {
  const args = asObject(boundedJsonSnapshot(value, TASK_BOUNDS.data, "task args"), "task args");
  noUnknownKeys(args, Object.keys(task.inputs), "task args");
  for (const [name, port] of Object.entries(task.inputs)) {
    if (!Object.hasOwn(args, name)) {
      if (!port.optional) fail(`missing input "${name}"`);
    } else {
      checkValue(args[name]!, port, `task input ${name}`);
    }
  }
  return args;
}

export function parseTaskExample(task: Pick<TaskDefinition, "inputs" | "output">, value: unknown): TaskExample {
  const raw = asObject(boundedJsonSnapshot(value, TASK_BOUNDS.data, "task example"), "task example");
  noUnknownKeys(raw, ["id", "sourceId", "args", "expect"], "task example");
  const id = asSafeId(raw.id, "task example id");
  const sourceId = asSafeId(raw.sourceId, "task example sourceId");
  const args = parseTaskArgs(task, raw.args);
  const expect = asObject(raw.expect, "task example expect");
  noUnknownKeys(expect, [task.output.name], "task example expect");
  if (!Object.hasOwn(expect, task.output.name)) fail(`example ${id} is missing output "${task.output.name}"`);
  // Labels are checked strictly: onMiss is an execution policy, not a way
  // to accept incorrectly labeled training data.
  const output = task.output.contract;
  const strictOutput = output.kind === "choice" && "labels" in output
    ? { kind: "choice" as const, labels: output.labels } : output;
  bindOutput(strictOutput, expect[task.output.name]!, `example ${id}`);
  return { id, sourceId, args, expect };
}

export function parseTaskDefinition(value: unknown): TaskDefinition {
  const raw = asObject(boundedJsonSnapshot(value, TASK_BOUNDS.data, "task"), "task");
  noUnknownKeys(raw, ["contract", "key", "name", "inputs", "output", "instructions", "budgets", "effectBudget", "route", "examples"], "task");
  if (raw.contract !== TASK_CONTRACT) fail(`contract must be ${TASK_CONTRACT}`);
  if (!Object.hasOwn(raw, "budgets")) fail("budgets must be explicit");
  const budgets = asObject(raw.budgets, "task budgets");
  for (const name of ["maxSteps", "maxAgentCalls", "maxWork", "maxContextBytes", "maxOutputBytes", "maxDepth"]) {
    if (!Object.hasOwn(budgets, name)) fail(`budgets must explicitly declare ${name}`);
  }
  const effectBudget = {
    maxContextBytes: budgets.maxContextBytes,
    maxOutputBytes: budgets.maxOutputBytes,
    maxEffectMs: TASK_BOUNDS.defaultMaxEffectMs,
    ...(raw.effectBudget === undefined ? {} : asObject(raw.effectBudget, "task effectBudget")),
  };
  const output = asObject(raw.output, "task output");
  noUnknownKeys(output, ["name", "contract"], "task output");
  const outputName = asSafeId(output.name, "task output name");
  const inputs = asObject(raw.inputs, "task inputs");
  if (Object.keys(inputs).length === 0) fail("at least one input is required");
  const instructions = asString(raw.instructions, "task instructions", BOUNDS.maxPromptLen);
  if (instructions.trim().length === 0) fail("instructions must not be empty");
  const normalized = parseOrganismManifest(manifestData({ ...raw, key: raw.key, name: raw.name, inputs, output: { name: outputName, contract: output.contract }, instructions, budgets, effectBudget }, []));
  const agent = normalized.cells[1]!;
  if (agent.kind !== "agent") fail("compiled task must be an agent");
  if (Object.values(agent.inputs).some(port => port.type === "cap")) fail("task inputs cannot carry capabilities");
  if (agent.output.kind === "choice" && !("labels" in agent.output)) fail("task choices require static labels");
  const parsedEffectBudget = agent.budget as TaskEffectBudget;
  if (parsedEffectBudget.maxContextBytes > normalized.budgets.maxContextBytes || parsedEffectBudget.maxOutputBytes > normalized.budgets.maxOutputBytes) fail("effectBudget context/output limits cannot exceed the run budgets");
  const task: TaskDefinition = {
    contract: TASK_CONTRACT,
    key: normalized.key,
    name: normalized.name,
    inputs: agent.inputs,
    output: { name: outputName, contract: agent.output },
    instructions,
    budgets: normalized.budgets,
    effectBudget: parsedEffectBudget,
    ...(agent.route ? { route: agent.route } : {}),
    examples: [],
  };
  const supplied = raw.examples ?? [];
  if (!Array.isArray(supplied) || supplied.length > TASK_BOUNDS.maxExamples) fail(`examples must list at most ${TASK_BOUNDS.maxExamples} entries`);
  const ids = new Set<string>();
  task.examples = supplied.map(item => {
    const example = parseTaskExample(task, item);
    if (ids.has(example.id)) fail(`duplicate example id "${example.id}"`);
    ids.add(example.id);
    return example;
  });
  // Prompt size and manifest checks apply equally to authored and optimized
  // definitions. Graph admission follows the ordinary path when executing.
  parseOrganismManifest(manifestData(task, task.examples));
  return task;
}

export function compileTask(value: unknown): TaskCompilation {
  const task = parseTaskDefinition(value);
  const manifest = parseOrganismManifest(manifestData(task, task.examples));
  return { task, taskDigest: digestCanonical(task as unknown as JsonValue), manifest, manifestDigest: digestCanonical(manifestToJson(manifest)) };
}

export type RunTaskOptions = { task: TaskDefinition; args: Record<string, JsonValue>; store: Store; executors: Executor[] };
export type TaskRun = { compilation: TaskCompilation; outputs: Record<string, JsonValue>; receipt: RunReceipt; receiptDigest: Digest };

/** Executes through the ordinary executor seam and saves replayable evidence. */
export async function runTask(options: RunTaskOptions): Promise<TaskRun> {
  const compilation = compileTask(options.task);
  const args = parseTaskArgs(compilation.task, options.args);
  await options.store.putManifest(compilation.manifest);
  const receipt = await runOrganism({ manifest: compilation.manifest, args: { input: args }, fns: builtinRegistry(), store: options.store, executors: options.executors });
  const receiptDigest = await options.store.putReceipt(receipt as unknown as JsonValue);
  const value = receipt.cells.task?.outputs?.out;
  const outputs = value === undefined ? {} : { [compilation.task.output.name]: value };
  return { compilation, outputs, receipt, receiptDigest };
}
