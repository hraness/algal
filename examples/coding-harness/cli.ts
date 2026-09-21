import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { runHarness, type HarnessModel, type HarnessOptions, type HarnessTerminalResult } from "./harness";
import { parseHarnessPolicy } from "./protocol";
import { createXcbModel, type XcbConfig } from "./xcb";
import { createHarnessMemory } from "./memory";
import type { HarnessMemory } from "./memory-contract";

const MAX_FRAME = 1_048_576;
async function* lines(): AsyncGenerator<unknown> {
  let pending = Buffer.alloc(0);
  for await (const chunk of Bun.stdin.stream()) {
    pending = Buffer.concat([pending, chunk]);
    let end: number;
    while ((end = pending.indexOf(10)) !== -1) {
      if (end > MAX_FRAME) throw new Error("Controller input frame exceeds bound");
      const line = pending.subarray(0, end).toString("utf8");
      pending = pending.subarray(end + 1);
      if (line.trim()) yield JSON.parse(line) as unknown;
    }
    if (pending.length > MAX_FRAME) throw new Error("Controller input frame exceeds bound");
  }
  if (pending.length) throw new Error("Controller input must end with a newline");
}
function object(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected controller object");
  return raw as Record<string, unknown>;
}
function closed(raw: unknown, keys: string[]): Record<string, unknown> {
  const result = object(raw);
  if (Object.keys(result).some(key => !keys.includes(key))) throw new Error("Unknown controller configuration key");
  return result;
}
function optionalNumber(raw: unknown, name: string): number | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "number" || !Number.isSafeInteger(raw)) throw new Error(`Invalid ${name}`);
  return raw;
}
function xcbConfig(raw: unknown): XcbConfig {
  const value = closed(raw, ["executable", "account", "model", "timeoutMs", "maxCalls"]);
  if (typeof value.executable !== "string" || typeof value.account !== "string" || typeof value.model !== "string") {
    throw new Error("Exact XCB executable/account/model required");
  }
  const timeoutMs = optionalNumber(value.timeoutMs, "xcb timeout");
  const maxCalls = optionalNumber(value.maxCalls, "xcb call bound");
  return { executable: value.executable, account: value.account, model: value.model,
    ...(timeoutMs === undefined ? {} : { timeoutMs }), ...(maxCalls === undefined ? {} : { maxCalls }) };
}
const emit = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);

export async function main(): Promise<void> {
  const input = lines();
  const first = await input.next();
  if (first.done) throw new Error("Initial controller configuration required");
  const config = closed(first.value, ["instruction", "mode", "policy", "xcb", "scriptedResponses", "artifactDir",
    "maxModelAttempts", "maxTerminalOutputBytes", "terminalTimeoutMs", "modelTimeoutMs", "memory"]);
  if (typeof config.instruction !== "string" || (config.mode !== "baseline" && config.mode !== "algal") ||
      typeof config.artifactDir !== "string" || !isAbsolute(config.artifactDir)) {
    throw new Error("Instruction, mode, and absolute host artifactDir are required");
  }
  if ((config.xcb === undefined) === (config.scriptedResponses === undefined)) {
    throw new Error("Choose exactly one XCB backend or explicitly scripted fixture backend");
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.on("SIGTERM", abort);
  process.on("SIGINT", abort);
  let settle = async () => {};
  let accounting: unknown;
  let memory: HarnessMemory | undefined;
  const pendingTerminals = new Set<Promise<HarnessTerminalResult>>();
  const settleAll = async () => {
    const outcomes = await Promise.allSettled([settle(), memory?.settle(), ...pendingTerminals]);
    const failure = outcomes.find(outcome => outcome.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  };
  const write = async (name: string, value: unknown) => {
    await mkdir(config.artifactDir as string, { recursive: true, mode: 0o700 });
    await writeFile(join(config.artifactDir as string, name), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  };
  try {
    if (config.memory !== undefined) memory = await createHarnessMemory(config.memory);
    let model: HarnessModel;
    let modelId: string;
    if (config.scriptedResponses !== undefined) {
      if (!Array.isArray(config.scriptedResponses) || config.scriptedResponses.length > 16) throw new Error("Invalid scripted fixture");
      const responses: unknown[] = [...config.scriptedResponses];
      model = async () => {
        if (!responses.length) throw new Error("Scripted fixture exhausted");
        return responses.shift();
      };
      modelId = "scripted-fixture";
      accounting = { billing: "scripted-fixture", costUsd: 0, inputTokens: 0, outputTokens: 0 };
    } else {
      const xcb = xcbConfig(config.xcb);
      const backend = await createXcbModel(xcb, controller.signal);
      model = backend.model;
      modelId = `${xcb.model}@${backend.accounting.executableDigest}`;
      accounting = backend.accounting;
      settle = backend.settle;
    }
    let sequence = 0;
    const dispatchTerminal: HarnessOptions["terminal"] = async (request, signal) => {
      if (signal?.aborted) throw new Error("Terminal dispatch cancelled before submission");
      const id = ++sequence;
      emit({ type: "terminal", id, request });
      const reply = await input.next();
      if (reply.done) throw new Error("Terminal transport closed with an outstanding command; completion uncertain");
      const message = object(reply.value);
      if (message.id !== id) throw new Error("Terminal reply identity mismatch; no retry");
      if (message.type === "terminal-error") throw new Error("Terminal transport failed; completion may be uncertain; no retry");
      if (message.type !== "terminal-result") throw new Error("Unknown terminal reply");
      return object(message.result) as unknown as HarnessTerminalResult;
    };
    const terminal: HarnessOptions["terminal"] = (request, signal) => {
      const promise = dispatchTerminal(request, signal);
      pendingTerminals.add(promise);
      void promise.then(() => pendingTerminals.delete(promise), () => pendingTerminals.delete(promise));
      return promise;
    };
    const limits: Partial<HarnessOptions> = {};
    for (const key of ["maxModelAttempts", "maxTerminalOutputBytes", "terminalTimeoutMs", "modelTimeoutMs"] as const) {
      const n = optionalNumber(config[key], key);
      if (n !== undefined) limits[key] = n;
    }
    const result = await runHarness({ ...limits, instruction: config.instruction, mode: config.mode,
      policy: parseHarnessPolicy(config.policy), model, terminal, modelId,
      terminalId: "harbor-environment-exec.v1", signal: controller.signal,
      ...(memory === undefined ? {} : { memory }) });
    await settleAll();
    await write("result.json", result);
    await write("accounting.json", accounting);
    if (memory) await write("memory-evidence.json", memory.evidence());
    if (result.receipt) await write("receipt.json", result.receipt);
    if (result.manifest) await write("manifest.json", result.manifest);
    emit({ type: "result", result: {
      mode: result.mode, policyId: result.policyId, termination: result.termination,
      summary: result.summary, error: result.error, modelAttempts: result.modelAttempts,
      terminalCalls: result.terminalCalls, verification: result.verification ?? null,
      accounting, artifactDir: config.artifactDir,
      ...(memory === undefined ? {} : { memory: memory.evidence() }),
    } });
  } finally {
    try {
      await settleAll();
    } finally {
      // Retain attempted-call accounting even if a later adapter/audit fails.
      try {
        if (accounting !== undefined) await write("accounting.json", accounting);
        if (memory) await write("memory-evidence.json", memory.evidence());
      } finally {
        process.off("SIGTERM", abort);
        process.off("SIGINT", abort);
      }
    }
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`Harness controller failed: ${error instanceof Error ? error.message : "unknown failure"}\n`);
    process.exitCode = 1;
  });
}
