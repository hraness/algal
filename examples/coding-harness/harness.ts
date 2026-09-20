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

export const HARNESS_PROMPT_VERSION = "algal.coding-harness.prompt.v1";
export type HarnessAction =
  | { type: "terminal"; command: string }
  | { type: "finish"; summary: string };
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
  | { kind: "terminal"; command: string; result: HarnessTerminalResult };
export type HarnessOptions = {
  mode: "baseline" | "algal";
  instruction: string;
  policy: HarnessPolicy;
  model: HarnessModel;
  terminal: HarnessTerminal;
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
const TERMINAL = "harness-terminal.v1";
const bytes = (text: string) => Buffer.byteLength(text, "utf8");
const encode = (value: HarnessAction | HarnessTerminalResult) => canonicalize(value as JsonValue);
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
  const field = type === "terminal" ? "command" : type === "finish" ? "summary" : undefined;
  if (!field) throw new Error("model action type must be terminal or finish");
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

export function harnessPrompt(policy: HarnessPolicy): string {
  return [
    HARNESS_PROMPT_VERSION,
    "Complete the user's coding task in the supplied terminal workspace.",
    'Return exactly one JSON object: {"type":"terminal","command":"..."} or {"type":"finish","summary":"..."}. No markdown or extra fields.',
    "Terminal commands run only through the supplied host terminal. Inspect the workspace before editing. Normal nonzero exit codes are observations, not harness failures.",
    "Use only the user's task and visible workspace tests. Finishing is a declaration that you have stopped; it is not evidence that the task passes independent grading.",
    policy.testPolicy === "focused-first"
      ? "Test policy: run the smallest relevant workspace test first, then broader checks when the focused check passes."
      : "Test policy: after each edit, run the relevant workspace tests before making another edit.",
    policy.recoveryPolicy === "diagnose-once"
      ? "Recovery policy: after a failed command, perform one targeted diagnostic before choosing a changed command; do not blindly repeat the failure."
      : "Recovery policy: after a failed command, use its recorded output to choose a corrected command and retry with that context.",
    "Each response consumes one model attempt. Return a finish action when work is complete or cannot proceed.",
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
    if (entry.fn !== TERMINAL) throw new Error("unexpected runtime tool");
    const inputs = object(entry.inputs, ["command"]);
    const action = parseHarnessAction({ type: "terminal", command: inputs.command });
    const output = object(entry.output, ["result"]);
    const result = terminalResult(output.result, 8192);
    messages.push({ role: "assistant", content: encode(action) }, { role: "tool", content: encode(result) });
  }
  return messages;
}

export async function runHarness(options: HarnessOptions): Promise<HarnessResult> {
  const policy = parseHarnessPolicy(options.policy);
  if (options.mode !== "baseline" && options.mode !== "algal") throw new Error("unknown harness mode");
  if (typeof options.instruction !== "string" || !options.instruction.trim() || bytes(options.instruction) > MAX_INSTRUCTION_BYTES) throw new Error("instruction must be nonempty and at most 8192 bytes");
  const attempts = integer(options.maxModelAttempts ?? 12, 1, 16, "maxModelAttempts");
  const outputBytes = integer(options.maxTerminalOutputBytes ?? 8192, 1, 8192, "maxTerminalOutputBytes");
  const terminalMs = integer(options.terminalTimeoutMs ?? 120000, 1, 600000, "terminalTimeoutMs");
  const modelMs = integer(options.modelTimeoutMs ?? 120000, 1, 600000, "modelTimeoutMs");
  const prompt = harnessPrompt(policy);
  const result: HarnessResult = {
    mode: options.mode, policyId: policyId(policy), termination: "failed", summary: null, error: null,
    modelAttempts: 0, terminalCalls: 0,
    messages: [{ role: "user", content: options.instruction }], trace: [],
  };
  const completedTools: JsonValue[] = [];
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
    result.modelAttempts++;
    const request = { prompt, context: selectContext(messages, policy), maxOutputBytes: MAX_ACTION_BYTES };
    const parent = options.signal && signal ? AbortSignal.any([options.signal, signal]) : options.signal ?? signal;
    const raw = await bounded(s => options.model(structuredClone(request), s), modelMs, parent);
    const action = parseHarnessAction(raw);
    result.trace.push({ kind: "model", request: structuredClone(request), action });
    result.messages.push({ role: "assistant", content: encode(action) });
    return action;
  };
  const invokeTerminal = async (command: string, signal?: AbortSignal): Promise<HarnessTerminalResult> => {
    result.terminalCalls++;
    const parent = options.signal && signal ? AbortSignal.any([options.signal, signal]) : options.signal ?? signal;
    const output = terminalResult(await bounded(s => options.terminal({ command, maxOutputBytes: outputBytes, timeoutMs: terminalMs }, s), terminalMs, parent), outputBytes);
    result.trace.push({ kind: "terminal", command, result: output });
    result.messages.push({ role: "tool", content: encode(output) });
    completedTools.push({ fn: TERMINAL, inputs: { command }, output: { result: output } });
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
        await invokeTerminal(action.command);
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
    configurationDigest: digestCanonical({ terminal: options.terminalId ?? "host-terminal.v1", outputBytes, terminalMs }),
    tool: async (inputs, context) => ({ result: await invokeTerminal(inputs.command as string, context.signal) }),
  }]]);
  const executor: Executor = {
    id: options.modelId ?? "host-model.v1", capabilities: { effects: ["agent"] }, cacheable: false, retryable: false,
    receiptFor: () => ({ configurationDigest: digestCanonical({
      adapter: HARNESS_PROMPT_VERSION, model: options.modelId ?? "host-model.v1", policy: policyId(policy),
      maxOutputBytes: MAX_ACTION_BYTES, timeoutMs: modelMs,
    }) }),
    execute: async (request, signal) => {
      try {
        const action = await invokeModel(messagesFromLog(options.instruction, request.context.toolLog), signal, request.context);
        return action.type === "terminal"
          ? { tool: TERMINAL, inputs: { command: action.command } }
          : action;
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
        prompt, tools: [TERMINAL], output: { kind: "json", schema: { type: "object", required: ["type", "summary"], properties: { type: { type: "string" }, summary: { type: "string" } } } },
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
