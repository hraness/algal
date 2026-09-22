import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ModelCallback } from "./harness";
import type { EffectRequest, Executor, ExecutorResult } from "../../src/effects";
import { canonicalize, type JsonValue } from "../../src/values";
import { digestCanonical } from "../../src/digest";

// XCB owns authentication and provider isolation. This adapter only uses the
// qualified, zero-tool application API; it never falls back to `xcb run`.
export interface XcbConfig {
  executable: string;
  account: string;
  model: string;
  timeoutMs?: number;
  maxCalls?: number;
}

export interface XcbAccounting {
  calls: number;
  completedCalls: number;
  model: string;
  executableDigest: string;
  requestIds: string[];
  inputTokens: null;
  outputTokens: null;
  costUsd: null;
  billing: "existing-subscription";
  // Unknown attribution of subscription cost is not a zero-price model claim.
  incrementalPaidApiSpendUsd: 0;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected an XCB object");
  }
  return value as Record<string, unknown>;
}

export function validateXcbCapability(
  value: unknown,
  config: XcbConfig,
  executableDigest: string,
  now = Date.now(),
): void {
  const inventory = object(value);
  if (inventory.version !== 1 || inventory.supported !== true ||
      inventory.zeroTools !== true || inventory.zeroHooks !== true || inventory.ephemeral !== true ||
      !Array.isArray(inventory.accounts) || inventory.accounts.length > 128) {
    throw new Error("XCB application inference is not qualified");
  }
  const account = inventory.accounts.map(object).find((row) => row.id === config.account);
  if (!account || account.available !== true || account.enabled !== true ||
      account.connected !== true || account.runtimeAdmitted !== true || account.busy !== false ||
      !Array.isArray(account.models)) {
    throw new Error("Selected XCB account is unavailable");
  }
  const model = account.models.map(object).find((row) => row.key === config.model);
  if (!model || typeof model.observedAtMs !== "number" ||
      model.observedAtMs > now || now - model.observedAtMs >= 86_400_000) {
    throw new Error("Selected XCB model metadata is absent or expired");
  }
  const qualification = object(account.qualification);
  if (qualification.runtimeDigest !== executableDigest ||
      typeof qualification.expiresAt !== "number" || qualification.expiresAt <= now ||
      typeof qualification.evidenceDigest !== "string" || !/^[a-f0-9]{64}$/.test(qualification.evidenceDigest)) {
    throw new Error("XCB qualification is expired or does not bind the executable");
  }
}

export function parseXcbResponse(value: unknown, config: XcbConfig): { text: string; requestId: string } {
  const response = object(value);
  const keys = Object.keys(response).sort().join(",");
  if (keys !== "account,model,outcome,requestId,status,text,version" || response.version !== 1 ||
      response.status !== "completed" || response.account !== config.account ||
      response.model !== config.model || typeof response.text !== "string" ||
      typeof response.requestId !== "string" || response.requestId.length > 256) {
    throw new Error("XCB did not return a matching completed application response");
  }
  const outcome = object(response.outcome);
  if (Object.keys(outcome).sort().join(",") !== "effects,joined,terminal" ||
      outcome.terminal !== "completed" || outcome.joined !== true || outcome.effects !== "none") {
    throw new Error("XCB application outcome is not settled");
  }
  return { text: response.text, requestId: response.requestId };
}

async function invoke(
  executable: string,
  args: string[],
  input: unknown | undefined,
  byteLimit: number,
  signal?: AbortSignal,
): Promise<unknown> {
  if (signal?.aborted) throw new Error("XCB call cancelled before launch");
  const child = Bun.spawn([executable, "--json", "generate", ...args], {
    stdin: input === undefined ? "ignore" : "pipe",
    stdout: "pipe",
    stderr: "ignore",
  });
  const abort = () => child.kill("SIGTERM");
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let overflow = false;
  try {
    if (input !== undefined && typeof child.stdin !== "number" && child.stdin) {
      child.stdin.write(JSON.stringify(input));
      child.stdin.end();
    }
    for await (const chunk of child.stdout) {
      bytes += chunk.byteLength;
      if (bytes > byteLimit) {
        if (!overflow) abort();
        overflow = true;
      } else if (!overflow) chunks.push(chunk);
    }
    // Wait for XCB's own custody settlement after cancellation; never SIGKILL
    // its provider group or turn an uncertain call into an automatic retry.
    const code = await child.exited;
    if (signal?.aborted) throw new Error("XCB call cancelled; child joined");
    if (overflow) throw new Error("XCB output exceeded its transport bound");
    if (code !== 0) throw new Error(`XCB application call failed (exit ${code}); no retry`);
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally {
    if (child.exitCode === null) {
      abort();
      await child.exited;
    }
    signal?.removeEventListener("abort", abort);
  }
}

export async function createXcbModel(config: XcbConfig, parentSignal?: AbortSignal): Promise<{
  model: ModelCallback;
  accounting: XcbAccounting;
  settle: () => Promise<void>;
}> {
  if (!config.executable.startsWith("/") || !config.account || !config.model ||
      config.account.length > 256 || config.model.length > 256) {
    throw new Error("XCB requires an absolute executable and exact account/model selectors");
  }
  const timeoutMs = config.timeoutMs ?? 60_000;
  const maxCalls = config.maxCalls ?? 12;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000 ||
      !Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 64) {
    throw new Error("Invalid XCB call bounds");
  }
  const executableDigest = createHash("sha256").update(await readFile(config.executable)).digest("hex");
  const boundedSignal = (signal?: AbortSignal) => AbortSignal.any([
    AbortSignal.timeout(timeoutMs),
    ...(parentSignal ? [parentSignal] : []),
    ...(signal ? [signal] : []),
  ]);
  const capabilities = await invoke(config.executable, ["--capabilities"], undefined, 2_097_152, boundedSignal());
  validateXcbCapability(capabilities, config, executableDigest);
  const accounting: XcbAccounting = {
    calls: 0, completedCalls: 0, model: config.model, executableDigest, requestIds: [],
    inputTokens: null, outputTokens: null, costUsd: null,
    billing: "existing-subscription", incrementalPaidApiSpendUsd: 0,
  };
  const pending = new Set<Promise<unknown>>();
  const generate: ModelCallback = async (request, signal) => {
    if (accounting.calls >= maxCalls) throw new Error("XCB pilot call limit exhausted");
    // Recheck time and local inventory before each call. The XCB API also
    // rechecks its own binding and settlement; no credentials are inspected.
    validateXcbCapability(capabilities, config, executableDigest);
    const currentDigest = createHash("sha256").update(await readFile(config.executable)).digest("hex");
    if (currentDigest !== executableDigest) throw new Error("XCB executable changed during the experiment");
    const prompt = `${request.prompt}\n\nConversation observations (JSON):\n${JSON.stringify(request.context)}\n\nReturn exactly the JSON object requested above, without markdown.`;
    const maxOutputBytes = Math.min(request.maxOutputBytes, 65_536);
    const input = { version: 1, account: config.account, model: config.model, prompt, timeoutMs, maxOutputBytes };
    if (Buffer.byteLength(JSON.stringify(input)) > 1_048_576) throw new Error("XCB input exceeds 1 MiB");
    accounting.calls++;
    const raw = await invoke(config.executable, [], input, maxOutputBytes * 6 + 4096, boundedSignal(signal));
    const response = parseXcbResponse(raw, config);
    if (Buffer.byteLength(response.text) > maxOutputBytes) throw new Error("XCB model text exceeds bound");
    accounting.completedCalls++;
    accounting.requestIds.push(response.requestId);
    return response.text;
  };
  const model: ModelCallback = (request, signal) => {
    const promise = generate(request, signal);
    pending.add(promise);
    void promise.then(() => pending.delete(promise), () => pending.delete(promise));
    return promise;
  };
  return { model, accounting, settle: async () => { await Promise.allSettled([...pending]); } };
}

// The same qualified application route as a substrate Executor: an agent
// cell's declared output schema rides as a {"value": ...} JSON instruction,
// and the response text must be exactly that object. Capability admission,
// per-call inventory recheck, executable pinning and call bounds are identical
// to createXcbModel — the only difference is the substrate's request shape.
export async function createXcbExecutor(config: XcbConfig, parentSignal?: AbortSignal): Promise<{
  executor: Executor;
  accounting: XcbAccounting;
  settle: () => Promise<void>;
}> {
  const timeoutMs = config.timeoutMs ?? 60_000;
  const maxCalls = config.maxCalls ?? 12;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000 ||
      !Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 64) {
    throw new Error("Invalid XCB call bounds");
  }
  const executableDigest = createHash("sha256").update(await readFile(config.executable)).digest("hex");
  const boundedSignal = (signal?: AbortSignal) => AbortSignal.any([
    AbortSignal.timeout(timeoutMs),
    ...(parentSignal ? [parentSignal] : []),
    ...(signal ? [signal] : []),
  ]);
  const capabilities = await invoke(config.executable, ["--capabilities"], undefined, 2_097_152, boundedSignal());
  validateXcbCapability(capabilities, config, executableDigest);
  const accounting: XcbAccounting = {
    calls: 0, completedCalls: 0, model: config.model, executableDigest, requestIds: [],
    inputTokens: null, outputTokens: null, costUsd: null,
    billing: "existing-subscription", incrementalPaidApiSpendUsd: 0,
  };
  const pending = new Set<Promise<unknown>>();
  const call = async (request: EffectRequest, signal?: AbortSignal): Promise<ExecutorResult> => {
    if (request.kind !== "agent" && request.kind !== "classifier") {
      throw new Error(`XCB cannot serve effect kind "${request.kind}"`);
    }
    if (accounting.calls >= maxCalls) throw new Error("XCB pilot call limit exhausted");
    validateXcbCapability(capabilities, config, executableDigest);
    const currentDigest = createHash("sha256").update(await readFile(config.executable)).digest("hex");
    if (currentDigest !== executableDigest) throw new Error("XCB executable changed during the experiment");
    const prompt = [
      "Execute the declared bounded cell.",
      "",
      request.prompt,
      "",
      "Request (JSON):",
      canonicalize({ context: request.context, output: request.output as unknown as JsonValue }),
      "",
      "Respond with exactly one JSON object of the form {\"value\": <result>}, where <result> validates against the request's output schema. No prose, no markdown fences.",
    ].join("\n");
    const maxOutputBytes = Math.min(request.budget.maxOutputBytes, 65_536);
    const input = { version: 1, account: config.account, model: config.model, prompt, timeoutMs, maxOutputBytes };
    if (Buffer.byteLength(JSON.stringify(input)) > 1_048_576) throw new Error("XCB input exceeds 1 MiB");
    accounting.calls++;
    const raw = await invoke(config.executable, [], input, maxOutputBytes * 6 + 4096, boundedSignal(signal));
    const response = parseXcbResponse(raw, config);
    if (Buffer.byteLength(response.text) > maxOutputBytes) throw new Error("XCB model text exceeds bound");
    accounting.completedCalls++;
    accounting.requestIds.push(response.requestId);
    let parsed: unknown;
    const text = response.text.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/s, "$1").trim();
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("XCB application output is not JSON");
    }
    const structured = object(parsed);
    if (Object.keys(structured).join(",") !== "value") {
      throw new Error("XCB application output must be a single value field");
    }
    return {
      output: structured.value as JsonValue,
      metadata: {
        executor: `xcb:${config.model}`,
        usage: { model: config.model },
      },
    };
  };
  const executor: Executor = {
    id: `xcb:${config.model}`,
    capabilities: { effects: ["agent", "classifier"] },
    cacheIdentity: digestCanonical({ kind: "xcb", executableDigest, account: config.account, model: config.model }),
    receiptFor: () => ({
      configurationDigest: digestCanonical({ kind: "xcb", executableDigest, account: config.account, model: config.model }),
    }),
    execute: async (request, signal) => {
      const promise = call(request, signal);
      pending.add(promise);
      try {
        return (await promise).output;
      } finally {
        pending.delete(promise);
      }
    },
    executeEffect: async (request, signal) => {
      const promise = call(request, signal);
      pending.add(promise);
      try {
        return await promise;
      } finally {
        pending.delete(promise);
      }
    },
  };
  return { executor, accounting, settle: async () => { await Promise.allSettled([...pending]); } };
}
