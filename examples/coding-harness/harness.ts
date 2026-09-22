import {
  AlgalError, MemoryStore, builtinRegistry, canonicalize, digestCanonical,
  manifestToJson, parseOrganismManifest, runOrganism, verifyReceipt,
  type Executor, type JsonValue, type RunReceipt, type Store,
  type ToolRegistry, type VerifyReport,
} from "../../index";
import {
  parseHarnessPolicy, policyId, selectContext,
  type HarnessMessage, type HarnessPolicy,
} from "./protocol";
import { asJsonValue } from "../../src/values";
import type { HarnessMemory, MemoryAction } from "./memory-contract";

export const HARNESS_PROMPT_VERSION = "algal.coding-harness.prompt.v2";
export type HarnessAction =
  | { type: "terminal"; command: string }
  | { type: "finish"; summary: string }
  | MemoryAction;
export type HarnessModelRequest = {
  prompt: string;
  context: HarnessMessage[];
  maxOutputBytes: number;
};
export type HarnessModel = (request: HarnessModelRequest, signal?: AbortSignal) => Promise<unknown>;
export type ModelCallback = HarnessModel;
export type HarnessTerminalRequest = { command: string; maxOutputBytes: number; timeoutMs: number };
export type HarnessTerminalResult = { exitCode: number; stdout: string; stderr: string };
export type HarnessTerminal = (request: HarnessTerminalRequest, signal?: AbortSignal) => Promise<HarnessTerminalResult>;
export type TerminalCallback = HarnessTerminal;
export type HarnessTrace =
  | { kind: "model"; request: HarnessModelRequest; action: HarnessAction }
  | { kind: "terminal"; command: string; result: HarnessTerminalResult; source?: "memory.probe" }
  | { kind: "memory"; action: MemoryAction; result: JsonValue };
export type HarnessOptions = {
  mode: "baseline" | "algal";
  instruction: string;
  policy: HarnessPolicy;
  model: HarnessModel;
  terminal: HarnessTerminal;
  memory?: HarnessMemory;
  modelId?: string;
  terminalId?: string;
  maxModelAttempts?: number;
  maxTerminalOutputBytes?: number;
  terminalTimeoutMs?: number;
  modelTimeoutMs?: number;
  store?: Store;
  signal?: AbortSignal;
};
export type HarnessResult = {
  mode: "baseline" | "algal";
  policyId: string;
  termination: "finished" | "budget-exhausted" | "failed";
  summary: string | null;
  error: string | null;
  modelAttempts: number;
  terminalCalls: number;
  messages: HarnessMessage[];
  trace: HarnessTrace[];
  manifest?: JsonValue;
  receipt?: RunReceipt;
  verification?: VerifyReport;
};

const MAX_ACTION_BYTES = 16384;
const MAX_INSTRUCTION_BYTES = 8192;
const MAX_CONTEXT_BYTES = 262144;
const MAX_MEMORY_BYTES = 8192;
const TERMINAL = "harness-terminal.v1";
const MEMORY = "harness-memory.v1";
const bytes = (text: string) => Buffer.byteLength(text, "utf8");
const encode = (value: HarnessAction | HarnessTerminalResult | JsonValue) => canonicalize(value as JsonValue);
const isMemoryAction = (action: HarnessAction): action is MemoryAction => action.type.startsWith("memory.");
function integer(value: number, min: number, max: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${name} must be ${min}..${max}`);
  return value;
}
function object(raw: unknown, keys: string[]): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("expected an object");
  const record = raw as Record<string, unknown>;
  const actual = Object.keys(record);
  if (actual.length !== keys.length || actual.some(key => !keys.includes(key))) throw new Error("unexpected or missing fields");
  return record;
}
export function parseHarnessAction(raw: unknown): HarnessAction {
  if (typeof raw === "string") {
    if (bytes(raw) > MAX_ACTION_BYTES) throw new Error("model action exceeds byte bound");
    raw = JSON.parse(raw) as unknown;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("model action must be an object");
  const type = (raw as Record<string, unknown>).type;
  if (type === "memory.read") {
    object(raw, ["type"]);
    return { type };
  }
  if (type === "memory.query" || type === "memory.probe") {
    const record = object(raw, ["type", "procedure"]);
    if (typeof record.procedure !== "string" || !/^[a-z][a-z0-9._-]{0,63}$/.test(record.procedure)) throw new Error("invalid memory procedure alias");
    return { type, procedure: record.procedure };
  }
  const field = type === "terminal" ? "command" : type === "finish" ? "summary" : undefined;
  if (!field) throw new Error("model action type must be terminal, finish, or an admitted memory action");
  const record = object(raw, ["type", field]);
  const value = record[field];
  if (typeof value !== "string" || !value.trim() || value.includes("\0") || bytes(value) > 8192) throw new Error(`invalid action ${field}`);
  const action: HarnessAction = type === "terminal" ? { type, command: value } : { type: "finish", summary: value };
  if (bytes(encode(action)) > MAX_ACTION_BYTES) throw new Error("model action exceeds byte bound");
  return action;
}
function terminalResult(raw: unknown, maxBytes: number): HarnessTerminalResult {
  const value = object(raw, ["exitCode", "stdout", "stderr"]);
  if (!Number.isInteger(value.exitCode) || (value.exitCode as number) < 0 || (value.exitCode as number) > 255
    || typeof value.stdout !== "string" || typeof value.stderr !== "string") throw new Error("invalid terminal result");
  const result = { exitCode: value.exitCode as number, stdout: value.stdout, stderr: value.stderr };
  if (bytes(result.stdout) + bytes(result.stderr) > maxBytes) throw new Error("terminal output exceeds byte bound");
  return result;
}
function memoryResult(raw: unknown): JsonValue {
  const result = asJsonValue(raw, "memory result");
  if (bytes(encode(result)) > MAX_MEMORY_BYTES) throw new Error("memory result exceeds 8192-byte bound");
  return result;
}

export function harnessPrompt(policy: HarnessPolicy): string {
  return [
    HARNESS_PROMPT_VERSION,
    "Complete the user's coding task in the supplied terminal workspace.",
    'Return exactly one JSON object: {"type":"terminal","command":"..."} or {"type":"finish","summary":"..."}. No markdown or extra fields.',
    "Native provider tools are intentionally disabled. Your execution interface is the JSON action proxy: return a terminal object and the host runs its command in the task workspace, then records stdout, stderr, and exitCode in the conversation observations.",
    "The terminal JSON action remains available on every response, including the final allowed model attempt. You do not need a native tool call to use it. Inspect the workspace before editing. Normal nonzero exit codes are observations, not harness failures.",
    "Use only the user's task and visible workspace tests. Finishing is a declaration that you have stopped; it is not evidence that the task passes independent grading.",
    policy.testPolicy === "focused-first"
      ? "Test policy: run the smallest relevant workspace test first, then broader checks when the focused check passes."
      : "Test policy: after each edit, run the relevant workspace tests before making another edit.",
    policy.recoveryPolicy === "diagnose-once"
      ? "Recovery policy: after a failed command, perform one targeted diagnostic before choosing a changed command; do not blindly repeat the failure."
      : "Recovery policy: after a failed command, use its recorded output to choose a corrected command and retry with that context.",
    "Each response, including finish, consumes one model attempt. The attempt budget below includes the current response. A terminal action on the last attempt still runs, but there is no later model response to inspect its result or repair it. Return a finish action when work is complete or cannot proceed.",
  ].join("\n");
}

async function bounded<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number, parent?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const signal = parent ? AbortSignal.any([parent, controller.signal]) : controller.signal;
  if (signal.aborted) throw new Error("host callback cancelled before dispatch");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    const cancelled = new Promise<never>((_resolve, reject) => {
      abort = () => reject(new Error("host callback cancelled or timed out; completion may be uncertain"));
      signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(() => controller.abort(), timeoutMs);
    });
    const pending = Promise.resolve().then(() => {
      if (signal.aborted) throw new Error("host callback cancelled before dispatch");
      return fn(signal);
    });
    return await Promise.race([pending, cancelled]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (abort) signal.removeEventListener("abort", abort);
  }
}

/** The host model sees the same messages in both engines; ALGAL's full tool log
 * is the authoritative source on its path, not mutable state in this adapter. */
function messagesFromLog(instruction: string, raw: JsonValue | undefined): HarnessMessage[] {
  const messages: HarnessMessage[] = [{ role: "user", content: instruction }];
  if (raw === undefined) return messages;
  if (!Array.isArray(raw)) throw new Error("invalid runtime tool log");
  for (const item of raw) {
    const entry = object(item, ["fn", "inputs", "output"]);
    const output = object(entry.output, ["result"]);
    let action: HarnessAction;
    let result: HarnessTerminalResult | JsonValue;
    if (entry.fn === TERMINAL) {
      const inputs = object(entry.inputs, ["command"]);
      action = parseHarnessAction({ type: "terminal", command: inputs.command });
      result = terminalResult(output.result, 8192);
    } else if (entry.fn === MEMORY) {
      const inputs = object(entry.inputs, ["action"]);
      action = parseHarnessAction(inputs.action);
      if (!isMemoryAction(action)) throw new Error("invalid runtime memory action");
      result = memoryResult(output.result);
    } else throw new Error("unexpected runtime tool");
    messages.push({ role: "assistant", content: encode(action) }, { role: "tool", content: encode(result) });
  }
  return messages;
}

export async function runHarness(options: HarnessOptions): Promise<HarnessResult> {
  const pendingEffects = new Set<Promise<unknown>>();
  try {
    return await runHarnessEpisode(options, pendingEffects);
  } finally {
    // A deadline ends admission, not custody. Join actual adapter/terminal work
    // before reporting completion; CLI settlement is an additional outer guard.
    while (pendingEffects.size) await Promise.allSettled([...pendingEffects]);
    await options.memory?.settle();
  }
}

async function runHarnessEpisode(options: HarnessOptions, pendingEffects: Set<Promise<unknown>>): Promise<HarnessResult> {
  const policy = parseHarnessPolicy(options.policy);
  if (options.mode !== "baseline" && options.mode !== "algal") throw new Error("unknown harness mode");
  if (typeof options.instruction !== "string" || !options.instruction.trim() || bytes(options.instruction) > MAX_INSTRUCTION_BYTES) throw new Error("instruction must be nonempty and at most 8192 bytes");
  const attempts = integer(options.maxModelAttempts ?? 12, 1, 16, "maxModelAttempts");
  const outputBytes = integer(options.maxTerminalOutputBytes ?? 8192, 1, 8192, "maxTerminalOutputBytes");
  const terminalMs = integer(options.terminalTimeoutMs ?? 120000, 1, 600000, "terminalTimeoutMs");
  const modelMs = integer(options.modelTimeoutMs ?? 120000, 1, 600000, "modelTimeoutMs");
  const memory = options.memory;
  if (memory && (typeof memory.description !== "string" || !memory.description.trim() || bytes(memory.description) > MAX_MEMORY_BYTES
    || !/^sha256:[a-f0-9]{64}$/.test(memory.configurationDigest))) throw new Error("invalid bounded memory adapter description or identity");
  const prompt = harnessPrompt(policy) + (memory ? [
    "", 'Memory JSON actions are also available: {"type":"memory.read"}, {"type":"memory.query","procedure":"alias"}, or {"type":"memory.probe","procedure":"alias"}.',
    "Use only procedure aliases listed below. Memory read/query actions cannot execute commands. Only an explicit memory.probe may run its admitted probe. Each memory action consumes one model attempt.",
    memory.description,
  ].join("\n") : "");
  const result: HarnessResult = {
    mode: options.mode, policyId: policyId(policy), termination: "failed", summary: null, error: null,
    modelAttempts: 0, terminalCalls: 0,
    messages: [{ role: "user", content: options.instruction }], trace: [],
  };
  const completedTools: JsonValue[] = [];
  const trackEffect = <T>(fn: () => Promise<T>): Promise<T> => {
    const pending = Promise.resolve().then(fn);
    pendingEffects.add(pending);
    void pending.then(() => pendingEffects.delete(pending), () => pendingEffects.delete(pending));
    return pending;
  };
  const invokeModel = async (messages: HarnessMessage[], signal?: AbortSignal, runtimeContext?: JsonValue): Promise<HarnessAction> => {
    if (result.modelAttempts >= attempts) throw new Error("model attempt budget exhausted");
    // Apply ALGAL's full, canonical context bound before projection in both
    // engines. Decoded UTF-8 sizes do not include JSON escaping overhead.
    const rawContext = runtimeContext ?? {
      inputs: { instruction: options.instruction, policy: policy as unknown as JsonValue },
      turn: completedTools.length,
      ...(completedTools.length ? { toolLog: completedTools } : {}),
    };
    const contextBytes = bytes(canonicalize(rawContext));
    if (contextBytes > MAX_CONTEXT_BYTES) throw new Error(`context view ${contextBytes}B exceeds maxContextBytes ${MAX_CONTEXT_BYTES}B`);
    const attemptBudget = {
      currentAttempt: result.modelAttempts + 1,
      maxAttempts: attempts,
      remainingAttemptsIncludingCurrent: attempts - result.modelAttempts,
      remainingAttemptsAfterCurrent: attempts - result.modelAttempts - 1,
    };
    const request = {
      prompt: `${prompt}\nAttempt budget (JSON): ${JSON.stringify(attemptBudget)}`,
      context: selectContext(messages, policy), maxOutputBytes: MAX_ACTION_BYTES,
    };
    result.modelAttempts++;
    const parent = options.signal && signal ? AbortSignal.any([options.signal, signal]) : options.signal ?? signal;
    const raw = await bounded(s => options.model(structuredClone(request), s), modelMs, parent);
    const action = parseHarnessAction(raw);
    if (isMemoryAction(action) && !memory) throw new Error("memory actions require a configured memory adapter");
    result.trace.push({ kind: "model", request: structuredClone(request), action });
    result.messages.push({ role: "assistant", content: encode(action) });
    return action;
  };
  const physicalTerminal = async (request: HarnessTerminalRequest, signal?: AbortSignal, source?: "memory.probe"): Promise<HarnessTerminalResult> => {
    const maximum = Math.min(outputBytes, integer(request.maxOutputBytes, 1, 8192, "terminal maxOutputBytes"));
    const timeout = Math.min(terminalMs, integer(request.timeoutMs, 1, 600000, "terminal timeoutMs"));
    const action = parseHarnessAction({ type: "terminal", command: request.command });
    if (action.type !== "terminal") throw new Error("invalid terminal action");
    const parent = options.signal && signal ? AbortSignal.any([options.signal, signal]) : options.signal ?? signal;
    const output = terminalResult(await bounded(s => trackEffect(() => {
      result.terminalCalls++;
      return options.terminal({ command: action.command, maxOutputBytes: maximum, timeoutMs: timeout }, s);
    }), timeout, parent), maximum);
    result.trace.push({ kind: "terminal", command: action.command, result: output, ...(source ? { source } : {}) });
    return output;
  };
  const invokeTerminal = async (command: string, signal?: AbortSignal): Promise<HarnessTerminalResult> => {
    memory?.invalidate();
    const output = await physicalTerminal({ command, maxOutputBytes: outputBytes, timeoutMs: terminalMs }, signal);
    result.messages.push({ role: "tool", content: encode(output) });
    completedTools.push({ fn: TERMINAL, inputs: { command }, output: { result: output } });
    return output;
  };
  const invokeMemory = async (action: MemoryAction, signal?: AbortSignal): Promise<JsonValue> => {
    if (!memory) throw new Error("memory actions require a configured memory adapter");
    const parent = options.signal && signal ? AbortSignal.any([options.signal, signal]) : options.signal ?? signal;
    const output = memoryResult(await bounded(s => trackEffect(async () => {
      let active = true;
      try {
        return await memory.execute(action, async (request, probeSignal) => {
          if (!active || s.aborted) throw new Error("memory probe callback is no longer active");
          if (action.type !== "memory.probe") throw new Error("memory read/query cannot execute terminal probes");
          return physicalTerminal(request, probeSignal ? AbortSignal.any([s, probeSignal]) : s, "memory.probe");
        }, s);
      } finally { active = false; }
    }), terminalMs, parent));
    result.trace.push({ kind: "memory", action, result: output });
    result.messages.push({ role: "tool", content: encode(output) });
    completedTools.push({ fn: MEMORY, inputs: { action }, output: { result: output } });
    return output;
  };
  if (options.mode === "baseline") {
    try {
      for (let turn = 0; turn < attempts; turn++) {
        const action = await invokeModel(result.messages);
        if (action.type === "finish") {
          result.termination = "finished";
          result.summary = action.summary;
          return result;
        }
        if (action.type === "terminal") await invokeTerminal(action.command);
        else await invokeMemory(action);
      }
      result.termination = "budget-exhausted";
      result.error = "model attempt budget exhausted without a finish action";
    } catch (error) { result.error = error instanceof Error ? error.message : "host callback failed"; }
    return result;
  }

  const store = options.store ?? new MemoryStore();
  const fns = builtinRegistry();
  const toolRegistry: ToolRegistry = new Map([[TERMINAL, {
    signature: {
      inputs: { command: { type: "text" } }, outputs: { result: { type: "json" } },
      effect: "write", cost: 100, maxOutputBytes: 65536,
    },
    configurationDigest: digestCanonical({ terminal: options.terminalId ?? "host-terminal.v1", outputBytes, terminalMs,
      ...(memory ? { memory: memory.configurationDigest } : {}) }),
    tool: async (inputs, context) => ({ result: await invokeTerminal(inputs.command as string, context.signal) }),
  }]]);
  if (memory) toolRegistry.set(MEMORY, {
    signature: {
      inputs: { action: { type: "json" } }, outputs: { result: { type: "json" } },
      effect: "write", cost: 100, maxOutputBytes: 65536,
    },
    configurationDigest: digestCanonical({ memory: memory.configurationDigest,
      terminal: options.terminalId ?? "host-terminal.v1", outputBytes, terminalMs }),
    tool: async (inputs, context) => {
      const action = parseHarnessAction(inputs.action);
      if (!isMemoryAction(action)) throw new Error("invalid memory tool action");
      return { result: await invokeMemory(action, context.signal) };
    },
  });
  const executor: Executor = {
    id: options.modelId ?? "host-model.v1", capabilities: { effects: ["agent"] }, cacheable: false, retryable: false,
    receiptFor: () => ({ configurationDigest: digestCanonical({
      adapter: HARNESS_PROMPT_VERSION, model: options.modelId ?? "host-model.v1", policy: policyId(policy),
      maxModelAttempts: attempts, maxOutputBytes: MAX_ACTION_BYTES, timeoutMs: modelMs,
      ...(memory ? { memory: memory.configurationDigest } : {}),
    }) }),
    execute: async (request, signal) => {
      try {
        const action = await invokeModel(messagesFromLog(options.instruction, request.context.toolLog), signal, request.context);
        if (action.type === "terminal") return { tool: TERMINAL, inputs: { command: action.command } };
        if (isMemoryAction(action)) return { tool: MEMORY, inputs: { action } };
        return action;
      } catch (error) {
        throw new AlgalError("EFFECT_FAILED", error instanceof Error ? error.message : "model callback failed");
      }
    },
  };
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:coding-harness", name: "Bounded coding harness",
    budgets: { maxSteps: 8, maxAgentCalls: attempts, maxWork: 100000000, maxContextBytes: MAX_CONTEXT_BYTES, maxOutputBytes: 65536 },
    interface: { inputs: { instruction: { cell: "input", port: "instruction" } }, outputs: { result: { cell: "coder", port: "out" } } },
    cells: [
      { id: "input", kind: "input", outputs: { instruction: "text" } },
      { id: "policy", kind: "const", outputs: { value: { type: "json", value: policy } } },
      { id: "coder", kind: "agent", inputs: { instruction: "text", policy: "json" }, view: { inputs: "*" },
        prompt, tools: [...toolRegistry.keys()], output: { kind: "json", schema: { type: "object", required: ["type", "summary"], properties: { type: { type: "string" }, summary: { type: "string" } } } },
        budget: { maxTurns: attempts, maxContextBytes: MAX_CONTEXT_BYTES, maxOutputBytes: 65536, maxEffectMs: Math.max(modelMs, terminalMs) },
      },
    ],
    edges: [
      { from: { cell: "input", port: "instruction" }, to: { cell: "coder", port: "instruction" } },
      { from: { cell: "policy", port: "value" }, to: { cell: "coder", port: "policy" } },
    ],
  });
  result.manifest = manifestToJson(manifest);
  try {
    await store.putManifest(manifest);
    result.receipt = await runOrganism({ manifest, args: { input: { instruction: options.instruction } }, fns, store, executors: [executor], tools: toolRegistry });
    await store.putReceipt(result.receipt as unknown as JsonValue);
    result.verification = await verifyReceipt(result.receipt as unknown as JsonValue, result.manifest, store, fns, undefined, toolRegistry);
    if (!result.verification.ok) throw new Error("offline receipt verification failed");
    const final = result.receipt.cells.coder?.outputs?.out;
    if (result.receipt.outcome === "complete" && final !== undefined) {
      const action = parseHarnessAction(final);
      if (action.type !== "finish") throw new Error("runtime returned a non-final action");
      result.termination = "finished";
      result.summary = action.summary;
    } else {
      result.termination = result.receipt.failure?.code === "BUDGET_EXHAUSTED" && result.modelAttempts === attempts
        ? "budget-exhausted" : "failed";
      result.error = result.receipt.failure?.message ?? "runtime did not finish";
    }
  } catch (error) { result.termination = "failed"; result.error = error instanceof Error ? error.message : "runtime failed"; }
  return result;
}
