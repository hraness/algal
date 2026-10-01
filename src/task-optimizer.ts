import { BOUNDS, parseOrganismManifest, type Budgets, type CellBudget, type OrganismManifest, type Route } from "./contract";
import { AgentContextHost, putAgentContext, type AgentContextEntryInput } from "./agent-context";
import { AGENT_CONTEXT_SELECT_TOOL, agentContextSelectionToolRegistry } from "./agent-context-tools";
import { digestCanonical, type Digest } from "./digest";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";
import { evaluateFoundryPopulation, FOUNDRY_BOUNDS, runFoundryWithin, selectFoundryCandidate, type FoundryCandidateResult, type FoundryCase, type FoundryReport, type FoundryScorer } from "./foundry";
import { argsForSubOrganism } from "./graph";
import { HabitatAccount, parseHabitatLimits, type HabitatBudget, type HabitatLimits } from "./habitat-budget";
import { boundedJsonSnapshot } from "./json-snapshot";
import { builtinRegistry } from "./registry";
import { runOrganism, type RunOutcome } from "./run";
import type { Store } from "./store-contract";
import type { ToolRegistry } from "./tools";
import { compileTask, parseTaskExample, TASK_BOUNDS, type TaskCompilation, type TaskDefinition, type TaskExample } from "./task";
import { applyTaskParameterPatch, parseTaskParameterPatch, taskParameters, TASK_PARAMETER_PATCH_CONTRACT } from "./task-parameters";
import { asInt, asObject, asSafeId, canonicalize, noUnknownKeys, type JsonValue } from "./values";

export const TASK_OPTIMIZATION_CONTRACT = "algal.task-optimization.v1" as const;
export const TASK_OPTIMIZER_BOUNDS = Object.freeze({
  maxRounds: 8,
  maxCandidates: 16,
  maxPortfolio: 8,
  maxFeedbackCases: 16,
  maxRejectionLength: 512,
  cases: Object.freeze({ maxBytes: 2_097_152, maxDepth: 36, maxNodes: 131_072, maxEntries: 512, maxStringBytes: 65_536 }),
});

export type TaskCase = TaskExample & { split: FoundryCase["split"] };
export type TaskOptimizerLimits = {
  maxRounds: number;
  maxCandidates: number;
  maxExamples: number;
  portfolioSize: number;
  budget: HabitatLimits;
};
export type TaskReviser = {
  manifest: OrganismManifest;
  input: string;
  output: string;
  args?: Record<string, JsonValue>;
  /** Opt-in exact training-context selection. Only its fixed read tool is attached. */
  context?: true;
};
export type TaskOptimizationOptions = {
  task: TaskDefinition;
  cases: TaskCase[];
  strategy: "fixed" | "labeled" | "feedback";
  limits: TaskOptimizerLimits;
  store: Store;
  executors: Executor[];
  scorer?: FoundryScorer;
  reviser?: TaskReviser;
};
export type TaskOptimizationCandidate = {
  stage: "fixed" | "labeled" | "feedback";
  task: TaskDefinition;
  evaluation: FoundryCandidateResult;
};
export type TaskRevision = {
  round: number;
  parent: Digest;
  manifestDigest: Digest;
  receiptDigest: Digest;
  outcome: RunOutcome;
  patchDigest: Digest | null;
  candidate: Digest | null;
  rejection: string | null;
};
export type TaskOptimizationReport = {
  contract: typeof TASK_OPTIMIZATION_CONTRACT;
  strategy: TaskOptimizationOptions["strategy"];
  limits: TaskOptimizerLimits;
  datasetDigest: Digest;
  status: "complete" | "budget-exhausted";
  candidates: TaskOptimizationCandidate[];
  revisions: TaskRevision[];
  portfolio: Digest[];
  /** Only populated after the frozen winner's audit finishes. */
  selected: TaskCompilation | null;
  /** Existing foundry evidence; its holdout never influences selection. */
  result: FoundryReport | null;
  budget: HabitatBudget;
  digest: Digest;
};

/** A model-facing proposer with explicit run limits. Its output remains
 * untrusted data, checked by the strict patch parser before evaluation. */
export function buildTaskReviser(options: { budgets: Budgets; effectBudget?: CellBudget; route?: Route }): TaskReviser {
  const { manifest } = compileTask({
    contract: "algal.task.v1",
    key: "organism:task-parameter-reviser",
    name: "Task parameter reviser",
    inputs: { feedback: { type: "json" } },
    output: {
      name: "patch",
      contract: {
        kind: "json",
        schemaVersion: 3,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["contract", "taskDigest", "changes"],
          properties: {
            contract: { type: "string", enum: [TASK_PARAMETER_PATCH_CONTRACT] },
            taskDigest: { type: "string" },
            changes: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "expectedDigest", "value"],
                properties: {
                  id: { type: "string", enum: ["task.instructions"] },
                  expectedDigest: { type: "string" },
                  value: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    instructions: "Revise one task using the recorded training outcomes in feedback. Return a guarded task parameter patch, never a whole program. Copy contract algal.task-parameter-patch.v1, taskDigest from feedback.parameters.taskDigest, and expectedDigest from the task.instructions parameter. Include exactly one change with id task.instructions and a string value. Preserve the task purpose and output contract. Do not invent labels or data. Use the observed failed outputs to make a specific instruction improvement; do not assume it will improve evaluation. Return JSON only.",
    budgets: options.budgets,
    ...(options.effectBudget ? { effectBudget: options.effectBudget } : {}),
    ...(options.route ? { route: options.route } : {}),
  });
  return { manifest, input: "feedback", output: "patch" };
}

/** The existing guarded proposer preceded by one charged context-selection
 * call. The model selects exact training records; it receives no validation
 * or audit cases, and cannot choose another store or capability. */
export function buildContextTaskReviser(options: { budgets: Budgets; effectBudget?: CellBudget; route?: Route }): TaskReviser {
  if (options.budgets.maxAgentCalls < 2 || options.budgets.maxSteps < 4)
    fail("context reviser requires at least two model calls and four steps");
  const base = buildTaskReviser(options);
  const task = base.manifest.cells.find(cell => cell.id === "task");
  if (task?.kind !== "agent") fail("compiled reviser has no task cell");
  const manifest = parseOrganismManifest({
    ...base.manifest,
    key: "organism:task-context-reviser",
    cells: [
      ...base.manifest.cells.map(cell => cell === task ? {
        ...cell, inputs: { ...cell.inputs, history: { type: "json" } }, view: { inputs: "*" },
        prompt: `${cell.prompt}\nExact selected training records are in context.inputs.history. Use them as evidence, never as new permissions. A read result and a replayable trace do not establish task correctness.`,
      } : cell),
      { id: "context-select", kind: "agent", inputs: { feedback: { type: "json" } }, view: { inputs: "*" },
        prompt: "Select up to four entry indices from feedback.context.entries whose exact training instruction, input, or execution record will help revise the task. Return {indices:[...]} with unique available indices. Empty selection is allowed. Only training records are available; do not infer unseen labels.",
        output: { kind: "json", schemaVersion: 3, schema: { type: "object", additionalProperties: false,
          required: ["indices"], properties: { indices: { type: "array", items: { type: "integer" } } } } },
        budget: task.budget, ...(task.route ? { route: task.route } : {}) },
      { id: "context-read", kind: "tool", tool: AGENT_CONTEXT_SELECT_TOOL, budget: { maxEffectMs: task.budget?.maxEffectMs ?? TASK_BOUNDS.defaultMaxEffectMs } },
    ],
    edges: [...base.manifest.edges,
      { from: { cell: "input", port: "feedback" }, to: { cell: "context-select", port: "feedback" } },
      { from: { cell: "context-select", port: "out" }, to: { cell: "context-read", port: "selection" } },
      { from: { cell: "context-read", port: "history" }, to: { cell: "task", port: "history" } },
    ],
  });
  return { manifest, input: base.input, output: base.output, context: true };
}

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", `task optimizer: ${message}`);
}

export function parseTaskOptimizerLimits(value: unknown): TaskOptimizerLimits {
  const raw = asObject(boundedJsonSnapshot(value, TASK_BOUNDS.data, "task optimizer limits"), "task optimizer limits");
  noUnknownKeys(raw, ["maxRounds", "maxCandidates", "maxExamples", "portfolioSize", "budget"], "task optimizer limits");
  const limits = {
    maxRounds: asInt(raw.maxRounds, "task optimizer maxRounds", 0, TASK_OPTIMIZER_BOUNDS.maxRounds),
    maxCandidates: asInt(raw.maxCandidates, "task optimizer maxCandidates", 1, TASK_OPTIMIZER_BOUNDS.maxCandidates),
    maxExamples: asInt(raw.maxExamples, "task optimizer maxExamples", 0, TASK_BOUNDS.maxExamples),
    portfolioSize: asInt(raw.portfolioSize, "task optimizer portfolioSize", 1, TASK_OPTIMIZER_BOUNDS.maxPortfolio),
    budget: parseHabitatLimits(raw.budget),
  };
  if (limits.portfolioSize > limits.maxCandidates) fail("portfolioSize exceeds maxCandidates");
  return limits;
}

/** Splits are explicit, sources may occur in only one split, and identical
 * inputs cannot cross splits even when their source labels differ. */
export function parseTaskCases(task: TaskDefinition, value: unknown): TaskCase[] {
  const data = boundedJsonSnapshot(value, TASK_OPTIMIZER_BOUNDS.cases, "task cases");
  if (!Array.isArray(data) || data.length < 3 || data.length > FOUNDRY_BOUNDS.maxCases) fail(`cases must contain 3..${FOUNDRY_BOUNDS.maxCases} entries`);
  const ids = new Set<string>();
  const sources = new Map<string, string>();
  const inputs = new Map<string, string>();
  const cases = data.map((item, index): TaskCase => {
    const raw = asObject(item, `task case ${index}`);
    noUnknownKeys(raw, ["id", "sourceId", "split", "args", "expect"], `task case ${index}`);
    const { split, ...example } = raw;
    if (split !== "train" && split !== "validation" && split !== "holdout") fail(`case ${index} has an invalid split`);
    const parsed = parseTaskExample(task, example);
    if (ids.has(parsed.id)) fail(`duplicate case id "${parsed.id}"`);
    ids.add(parsed.id);
    if (sources.has(parsed.sourceId) && sources.get(parsed.sourceId) !== split) fail(`source "${parsed.sourceId}" crosses splits`);
    sources.set(parsed.sourceId, split);
    const inputDigest = digestCanonical(parsed.args);
    if (inputs.has(inputDigest) && inputs.get(inputDigest) !== split) fail(`case ${parsed.id} repeats inputs across splits`);
    inputs.set(inputDigest, split);
    return { ...parsed, split };
  });
  for (const split of ["train", "validation", "holdout"]) {
    if (!cases.some(item => item.split === split)) fail(`missing ${split} cases`);
  }
  return cases;
}

function assertTrainingExamples(task: TaskDefinition, cases: TaskCase[], maximum: number): void {
  if (task.examples.length > maximum) fail("candidate examples exceed maxExamples");
  const train = new Map(cases.filter(item => item.split === "train").map(({ split: _split, ...example }) => [example.id, canonicalize(example as unknown as JsonValue)]));
  for (const example of task.examples) {
    if (train.get(example.id) !== canonicalize(example as unknown as JsonValue)) fail(`example ${example.id} must exactly match a training case`);
  }
}

/** Keep the validation winner first, then greedily keep candidates that add
 * distinct passing validation cases. Remaining slots use foundry ordering. */
export function selectTaskPortfolio(candidates: FoundryCandidateResult[], maximum: number): Digest[] {
  asInt(maximum, "task portfolio size", 1, TASK_OPTIMIZER_BOUNDS.maxPortfolio);
  if (candidates.length === 0 || candidates.length > TASK_OPTIMIZER_BOUNDS.maxCandidates) fail("portfolio requires a limited non-empty candidate list");
  const remaining = [...candidates];
  const chosen: Digest[] = [];
  const covered = new Set<string>();
  while (remaining.length > 0 && chosen.length < maximum) {
    let eligible = remaining;
    if (chosen.length > 0) {
      const gains = remaining.map(candidate => candidate.cases.filter(item => item.split === "validation" && item.passed && !covered.has(item.id)).length);
      const largest = Math.max(...gains);
      eligible = remaining.filter((_, i) => gains[i] === largest);
    }
    const digest = selectFoundryCandidate(eligible);
    const index = remaining.findIndex(candidate => candidate.manifestDigest === digest);
    const candidate = remaining.splice(index, 1)[0]!;
    chosen.push(digest);
    for (const item of candidate.cases) if (item.split === "validation" && item.passed) covered.add(item.id);
  }
  return chosen;
}

export function parseTaskReviser(value: unknown): TaskReviser {
  const raw = asObject(boundedJsonSnapshot(value, { ...TASK_OPTIMIZER_BOUNDS.cases, maxBytes: BOUNDS.maxManifestBytes, maxStringBytes: BOUNDS.maxManifestBytes }, "task reviser"), "task reviser");
  noUnknownKeys(raw, ["manifest", "input", "output", "args", "context"], "task reviser");
  if (raw.context !== undefined && raw.context !== true) fail("reviser context must be true when supplied");
  const manifest = parseOrganismManifest(raw.manifest);
  const input = asSafeId(raw.input, "task reviser input");
  const output = asSafeId(raw.output, "task reviser output");
  if (!manifest.interface || !Object.hasOwn(manifest.interface.inputs, input) || !Object.hasOwn(manifest.interface.outputs, output)) fail("reviser input/output must be declared in its interface");
  // Proposal generation may compute and ask a model. The opt-in context
  // profile has exactly one host-bound, read-only tool name; it cannot access
  // arbitrary tools, slots, child programs, or capabilities.
  for (const cell of manifest.cells) {
    if (cell.kind === "tool" && raw.context === true && cell.tool === AGENT_CONTEXT_SELECT_TOOL) continue;
    if (cell.kind !== "agent" && cell.kind !== "input" && cell.kind !== "const" && cell.kind !== "expr") fail(`reviser cell kind ${cell.kind} is not allowed`);
    if (cell.kind === "agent" && cell.tools?.length) fail("reviser cannot attach tools");
    if (cell.kind === "agent" && cell.budget?.maxEffectMs === undefined) fail("reviser agent requires an explicit maxEffectMs deadline");
    const ports = cell.kind === "input" || cell.kind === "const" ? cell.outputs : cell.inputs;
    if (Object.values(ports).some(port => port.type === "cap")) fail("reviser cannot carry capabilities");
  }
  const args = asObject(raw.args ?? {}, "task reviser args");
  noUnknownKeys(args, Object.keys(manifest.interface.inputs).filter(name => name !== input), "task reviser args");
  return { manifest, input, output, args, ...(raw.context === true ? { context: true } : {}) };
}

function feedback(parent: TaskOptimizationCandidate, cases: TaskCase[], round: number): JsonValue {
  const evidence = parent.evaluation.cases.filter(item => item.split === "train");
  const ordered = [...evidence.filter(item => !item.passed), ...evidence.filter(item => item.passed)].slice(0, TASK_OPTIMIZER_BOUNDS.maxFeedbackCases);
  return {
    round,
    task: parent.task as unknown as JsonValue,
    parameters: taskParameters(parent.task) as unknown as JsonValue,
    training: ordered.map(item => ({
      id: item.id,
      sourceId: cases.find(example => example.id === item.id)!.sourceId,
      args: item.args,
      expect: item.expect,
      outputs: item.outputs,
      passed: item.passed,
      outcome: item.outcome,
      receiptDigest: item.receiptDigest,
    })),
  };
}

/** Exact contiguous chunks fit the selector's whole-entry read interface.
 * Byte ranges identify their position in the original retained text. */
function appendTrainingContext(entries: AgentContextEntryInput[], kind: AgentContextEntryInput["kind"], label: string, text: string): void {
  const bytes = new TextEncoder().encode(text);
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  if (bytes.length <= 8192) { entries.push({ kind, label, text }); return; }
  for (let start = 0; start < bytes.length;) {
    if (entries.length >= 1024) throw new AlgalError("BUDGET_EXHAUSTED", "training context entry count exceeded");
    let end = Math.min(bytes.length, start + 8192);
    while (end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end--;
    entries.push({ kind, label: `${label} bytes ${start}:${end}`, text: decoder.decode(bytes.subarray(start, end)) });
    start = end;
  }
}

/** A small optimizer ladder over ordinary foundry runs. Revision sees only
 * training examples and their recorded outcomes. Validation chooses the
 * winner; a single final foundry evaluates that frozen winner on holdout.
 * This evidence measures the supplied executor, not model effectiveness. */
export async function optimizeTask(options: TaskOptimizationOptions): Promise<TaskOptimizationReport> {
  const initial = compileTask(options.task);
  const cases = parseTaskCases(initial.task, options.cases);
  const limits = parseTaskOptimizerLimits(options.limits);
  const strategy = options.strategy;
  if (strategy !== "fixed" && strategy !== "labeled" && strategy !== "feedback") fail("unknown strategy");
  assertTrainingExamples(initial.task, cases, limits.maxExamples);
  const reviser = strategy === "feedback" ? parseTaskReviser(options.reviser) : undefined;
  if (strategy === "feedback" && limits.maxRounds === 0) fail("feedback requires a positive maxRounds");
  const datasetDigest = digestCanonical(cases as unknown as JsonValue);
  const account = new HabitatAccount("search", limits.budget);
  const fns = builtinRegistry();
  // This snapshot prevents a caller from changing the dataset or source task
  // while executor calls are in flight. Executor implementations stay host-owned.
  const foundry = { cases: cases.map(({ sourceId: _sourceId, ...item }) => item), fns, store: options.store, executors: [...options.executors], account, ...(options.scorer ? { scorer: options.scorer } : {}) };
  const candidates: TaskOptimizationCandidate[] = [];
  const revisions: TaskRevision[] = [];
  let portfolio: Digest[] = [];
  let selected: TaskCompilation | null = null;
  let result: FoundryReport | null = null;
  let status: TaskOptimizationReport["status"] = "complete";
  const evaluate = async (task: TaskDefinition, stage: TaskOptimizationCandidate["stage"]): Promise<Digest> => {
    assertTrainingExamples(task, cases, limits.maxExamples);
    const compiled = compileTask(task);
    if (candidates.some(candidate => candidate.evaluation.manifestDigest === compiled.manifestDigest)) return compiled.manifestDigest;
    if (candidates.length >= limits.maxCandidates) throw new AlgalError("BUDGET_EXHAUSTED", "task optimizer candidate limit reached");
    const selection = await evaluateFoundryPopulation({ ...foundry, candidates: [compiled.manifest] });
    candidates.push({ stage, task: compiled.task, evaluation: selection.candidates[0]! });
    portfolio = selectTaskPortfolio(candidates.map(candidate => candidate.evaluation), limits.portfolioSize);
    return compiled.manifestDigest;
  };
  try {
    await evaluate(initial.task, "fixed");
    if (strategy !== "fixed" && limits.maxExamples > 0 && candidates.length < limits.maxCandidates) {
      const examples = cases.filter(item => item.split === "train").sort((a, b) => a.id.localeCompare(b.id)).slice(0, limits.maxExamples).map(({ split: _split, ...example }) => example);
      // Oversized demonstrations are an invalid configuration, never silently
      // dropped or truncated into a different unrecorded experiment.
      await evaluate(compileTask({ ...initial.task, examples }).task, "labeled");
    }
    if (reviser) {
      const manifestDigest = await options.store.putManifest(reviser.manifest);
      for (let round = 0; round < limits.maxRounds && candidates.length < limits.maxCandidates; round++) {
        const parentDigest = portfolio[round % portfolio.length]!;
        const parent = candidates.find(candidate => candidate.evaluation.manifestDigest === parentDigest)!;
        const suppliedFeedback = feedback(parent, cases, round) as Record<string, JsonValue>;
        let contextTools: ToolRegistry | undefined;
        if (reviser.context) {
          const entries: AgentContextEntryInput[] = [];
          appendTrainingContext(entries, "instruction", "task instructions", parent.task.instructions);
          for (const item of suppliedFeedback.training as Record<string, JsonValue>[]) {
            appendTrainingContext(entries, "input", `training ${String(item.id)} inputs`, canonicalize(item.args!));
            const receipt = await options.store.getReceipt(item.receiptDigest as Digest);
            if (receipt === undefined) throw new AlgalError("STORE_MISS", "training trajectory is unavailable");
            if (digestCanonical(receipt) !== item.receiptDigest) throw new AlgalError("DIGEST_MISMATCH", "training trajectory identity changed");
            appendTrainingContext(entries, "observation", `training ${String(item.id)} execution`, canonicalize(receipt));
          }
          const source = await putAgentContext(options.store, entries);
          const host = new AgentContextHost(options.store);
          const reader = host.bind(await host.grant(source, undefined, { maxReadBytes: 32_768 }));
          suppliedFeedback.context = await reader.inspect() as unknown as JsonValue;
          contextTools = agentContextSelectionToolRegistry(reader);
        }
        const args = argsForSubOrganism(reviser.manifest, { ...reviser.args, [reviser.input]: suppliedFeedback });
        const { receipt, receiptDigest } = await account.admit({ manifest: manifestDigest, budgets: reviser.manifest.budgets, args }, () => runOrganism({ manifest: reviser.manifest, args, fns, store: options.store, executors: foundry.executors, ...(contextTools ? { tools: contextTools } : {}) }), options.store);
        const revision: TaskRevision = { round, parent: parentDigest, manifestDigest, receiptDigest, outcome: receipt.outcome, patchDigest: null, candidate: null, rejection: null };
        revisions.push(revision);
        if (receipt.outcome !== "complete") {
          revision.rejection = receipt.failure?.code ?? receipt.outcome;
          continue;
        }
        const endpoint = reviser.manifest.interface!.outputs[reviser.output]!;
        const raw = receipt.cells[endpoint.cell]?.outputs?.[endpoint.port];
        let proposed: TaskDefinition;
        try {
          const patch = parseTaskParameterPatch(raw);
          revision.patchDigest = digestCanonical(patch as unknown as JsonValue);
          proposed = applyTaskParameterPatch(parent.task, patch);
          assertTrainingExamples(proposed, cases, limits.maxExamples);
        } catch (error) {
          // Malformed proposals are recorded failed attempts. The charged
          // generation is not erased, retried, or presented as improvement.
          if (!(error instanceof AlgalError)) throw error;
          revision.rejection = `${error.code}: ${error.message}`.slice(0, TASK_OPTIMIZER_BOUNDS.maxRejectionLength);
          continue;
        }
        revision.candidate = await evaluate(proposed, "feedback");
      }
    }
    const winner = candidates.find(candidate => candidate.evaluation.manifestDigest === portfolio[0])!;
    const frozen = compileTask(winner.task);
    // Existing foundry reevaluates the winner's train/validation cases before
    // audit. These extra runs are charged and reported; they cannot change
    // which candidate was frozen because this population has exactly one.
    result = await runFoundryWithin({ ...foundry, candidates: [frozen.manifest] });
    selected = frozen;
  } catch (error) {
    if (!(error instanceof AlgalError) || error.code !== "BUDGET_EXHAUSTED" || !account.exhausted) throw error;
    status = "budget-exhausted";
  }
  const base = { contract: TASK_OPTIMIZATION_CONTRACT, strategy, limits, datasetDigest, status, candidates, revisions, portfolio, selected, result, budget: account.record() };
  return { ...base, digest: digestCanonical(base as unknown as JsonValue) };
}
