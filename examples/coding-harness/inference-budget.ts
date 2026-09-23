import { isAbsolute, join } from "node:path";
import { digestCanonical, type Digest } from "../../src/digest";
import { effectRequestDigest, type EffectRequest, type Executor, type ExecutorResult } from "../../src/effects";
import { AlgalError } from "../../src/errors";
import { hostLease, hostRead, hostWrite, SHARED_LEASE_RETRY } from "../../src/host-state";
import { asJsonValue, canonicalize } from "../../src/values";

/** Host accounting, not a canonical runtime contract or provider billing receipt.
 * Reservations never refund: even a killed owner consumes its full reservation.
 * Rates/upper bounds are supplied by the admitting host, not by model output. */
export type InferenceBudget = { maxCalls: number; maxCostMicrousd: number; reserveMicrousdPerCall: number };
export type InferenceCall = {
  sequence: number; requestDigest: string; status: "reserved" | "completed" | "unknown";
  reservedMicrousd: number; tokensIn: number | null; tokensOut: number | null;
  outputDigest: string | null;
};
export type InferenceAccounting = {
  schema: "algal.inference-accounting.v1"; configurationDigest: Digest;
  calls: number; completedCalls: number; reservedMicrousd: number;
  inputTokens: number | null; outputTokens: number | null;
  costUsd: null; billing: "host-reserved"; stopped: boolean; records: InferenceCall[];
};
export type BudgetedExecutorOptions = {
  executor: Executor; ledgerPath: string; budget: InferenceBudget;
  maxRequestBytes: number; maxOutputBytes: number; timeoutMs?: number; providerIdentity?: string;
  tokenLimits?: { maxInputTokens: number; maxOutputTokens: number; requireUsage: boolean };
};
const MAX_LEDGER = 131_072;
function integer(value: unknown, minimum: number, maximum: number, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Invalid inference ${name}`);
  }
  return value;
}
function object(raw: unknown, keys: string[]): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
      Object.keys(raw).sort().join(",") !== [...keys].sort().join(",")) throw new Error("Invalid inference ledger fields");
  return raw as Record<string, unknown>;
}
function tokens(value: unknown): number | null {
  return value === null || value === undefined ? null : integer(value, 0, 1_000_000_000, "token count");
}
function digest(value: unknown): string {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value)) throw new Error("Invalid inference ledger digest");
  return value;
}
function totals(records: InferenceCall[], configurationDigest: Digest): InferenceAccounting {
  const sum = (field: "tokensIn" | "tokensOut") => records.some(row => row[field] === null)
    ? null : records.reduce((n, row) => n + (row[field] ?? 0), 0);
  return { schema: "algal.inference-accounting.v1", configurationDigest,
    calls: records.length, completedCalls: records.filter(row => row.status === "completed").length,
    reservedMicrousd: records.reduce((n, row) => n + row.reservedMicrousd, 0),
    inputTokens: sum("tokensIn"), outputTokens: sum("tokensOut"), costUsd: null,
    billing: "host-reserved", stopped: records.some(row => row.status !== "completed"), records };
}
function parse(raw: unknown, configurationDigest: Digest, budget: InferenceBudget): InferenceAccounting {
  const value = object(raw, ["schema", "configurationDigest", "calls", "completedCalls", "reservedMicrousd",
    "inputTokens", "outputTokens", "costUsd", "billing", "stopped", "records"]);
  if (value.schema !== "algal.inference-accounting.v1" || value.configurationDigest !== configurationDigest ||
      !Array.isArray(value.records) || value.records.length > budget.maxCalls) throw new Error("Inference ledger configuration mismatch");
  const rawRecords = value.records;
  const records = rawRecords.map((rawRow, index): InferenceCall => {
    const row = object(rawRow, ["sequence", "requestDigest", "status", "reservedMicrousd", "tokensIn", "tokensOut", "outputDigest"]);
    if (row.sequence !== index + 1 || !["reserved", "completed", "unknown"].includes(String(row.status)) ||
        row.reservedMicrousd !== budget.reserveMicrousdPerCall) throw new Error("Invalid inference ledger reservation");
    const status = row.status as InferenceCall["status"];
    if ((status === "completed") !== (row.outputDigest !== null) ||
        (status !== "completed" && index !== rawRecords.length - 1)) throw new Error("Invalid inference ledger settlement");
    return { sequence: index + 1, requestDigest: digest(row.requestDigest), status,
      reservedMicrousd: budget.reserveMicrousdPerCall, tokensIn: tokens(row.tokensIn), tokensOut: tokens(row.tokensOut),
      outputDigest: row.outputDigest === null ? null : digest(row.outputDigest) };
  });
  const expected = totals(records, configurationDigest);
  if (expected.reservedMicrousd > budget.maxCostMicrousd || canonicalize(asJsonValue(expected, "ledger")) !== canonicalize(asJsonValue(value, "ledger"))) {
    throw new Error("Inference ledger accounting mismatch");
  }
  return expected;
}

export async function createBudgetedExecutor(options: BudgetedExecutorOptions): Promise<{
  executor: Executor; accounting: InferenceAccounting; settle: () => Promise<void>;
}> {
  if (!isAbsolute(options.ledgerPath)) throw new Error("Absolute inference ledgerPath required");
  const budget = { maxCalls: integer(options.budget.maxCalls, 1, 64, "call bound"),
    maxCostMicrousd: integer(options.budget.maxCostMicrousd, 0, 1_000_000_000, "spend bound"),
    reserveMicrousdPerCall: integer(options.budget.reserveMicrousdPerCall, 0, 1_000_000_000, "call reservation") };
  if (budget.reserveMicrousdPerCall > budget.maxCostMicrousd) throw new Error("Inference call reservation exceeds spend bound");
  const maxRequestBytes = integer(options.maxRequestBytes, 1, 1_048_576, "request bound");
  const maxOutputBytes = integer(options.maxOutputBytes, 1, 65_536, "output bound");
  const timeoutMs = integer(options.timeoutMs ?? 60_000, 1, 600_000, "timeout");
  const tokenLimits = options.tokenLimits === undefined ? null : {
    maxInputTokens: integer(options.tokenLimits.maxInputTokens, 1, 2_097_152, "input token bound"),
    maxOutputTokens: integer(options.tokenLimits.maxOutputTokens, 1, 16_384, "output token bound"),
    requireUsage: options.tokenLimits.requireUsage,
  };
  if (tokenLimits !== null && typeof tokenLimits.requireUsage !== "boolean") throw new Error("Invalid inference usage requirement");
  const providerIdentity = options.providerIdentity ?? options.executor.cacheIdentity ?? options.executor.id;
  if (!providerIdentity || providerIdentity.length > 4096) throw new Error("Bounded inference provider identity required");
  const configuration = { schema: "algal.inference-budget.v1", executor: options.executor.id, providerIdentity,
    budget, maxRequestBytes, maxOutputBytes, timeoutMs, tokenLimits };
  const configurationDigest = digestCanonical(asJsonValue(configuration, "inference configuration"));
  const path = join(options.ledgerPath, "accounting.json");
  const stoppedPath = join(options.ledgerPath, "stopped.json");
  const lock = join(options.ledgerPath, "custody");
  const accounting = totals([], configurationDigest);
  const publish = async () => { await hostWrite(path, asJsonValue(accounting, "inference accounting"), MAX_LEDGER, false); };
  const refresh = async () => {
    const raw = await hostRead(path, MAX_LEDGER);
    if (raw === undefined) throw new Error("Inference ledger missing after initialization");
    Object.assign(accounting, parse(raw, configurationDigest, budget));
    const stopped = await hostRead(stoppedPath, 4096);
    if (stopped !== undefined) {
      const marker = object(stopped, ["configurationDigest", "reason"]);
      if (marker.configurationDigest !== configurationDigest || marker.reason !== "post-reservation-failure") throw new Error("Invalid inference stop marker");
      accounting.stopped = true;
    }
  };
  await hostLease(lock, "inference-budget", async () => {
    const initialized = await hostRead(join(options.ledgerPath, "configuration.json"), 16384);
    await hostWrite(join(options.ledgerPath, "configuration.json"), asJsonValue(configuration, "inference configuration"), 16384);
    if (await hostRead(path, MAX_LEDGER) === undefined) {
      if (initialized !== undefined) throw new Error("Initialized inference ledger lost its accounting; admission refused");
      await publish();
    }
    else await refresh();
  }, SHARED_LEASE_RETRY);
  const pending = new Set<Promise<unknown>>();
  let failedAfterReservation = false;
  const track = <T>(promise: Promise<T>): Promise<T> => {
    pending.add(promise);
    void promise.then(() => pending.delete(promise), () => pending.delete(promise));
    return promise;
  };
  const call = async (request: EffectRequest, signal?: AbortSignal): Promise<ExecutorResult> => {
    let reserved = false;
    if (failedAfterReservation) throw new Error("Inference ledger has an unsettled or failed call; no retry");
    if (signal?.aborted) throw new Error("Inference cancelled before reservation");
    integer(request.budget.maxOutputBytes, 1, maxOutputBytes, "request output bound");
    integer(request.budget.maxContextBytes, 1, 1_048_576, "request context bound");
    if ((request.kind !== "agent" && request.kind !== "classifier") ||
        Buffer.byteLength(canonicalize(asJsonValue(request, "inference request"))) > maxRequestBytes ||
        request.budget.maxOutputBytes > maxOutputBytes) throw new Error("Inference request exceeds admitted bounds");
    try { return await hostLease(lock, "inference-budget", async () => {
      await refresh();
      if (accounting.stopped) throw new Error("Inference ledger has an unsettled or failed call; no retry");
      if (accounting.calls >= budget.maxCalls || accounting.reservedMicrousd + budget.reserveMicrousdPerCall > budget.maxCostMicrousd) {
        throw new Error("Inference reservation budget exhausted");
      }
      if (signal?.aborted) throw new Error("Inference cancelled before reservation");
      const row: InferenceCall = { sequence: accounting.calls + 1, requestDigest: effectRequestDigest(request),
        status: "reserved", reservedMicrousd: budget.reserveMicrousdPerCall, tokensIn: null, tokensOut: null, outputDigest: null };
      accounting.records.push(row);
      Object.assign(accounting, totals(accounting.records, configurationDigest));
      // fsync + directory sync completes before the provider sees the request.
      await publish();
      reserved = true;
      const boundedSignal = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
      let abort: (() => void) | undefined;
      try {
        const work = track(Promise.resolve().then(() => {
          if (boundedSignal.aborted) throw new Error("Inference cancelled after reservation");
          return options.executor.executeEffect
            ? options.executor.executeEffect(request, boundedSignal)
            : options.executor.execute(request, boundedSignal).then(output => ({ output }));
        }));
        // Deadline closes admission even for an executor ignoring AbortSignal.
        // Actual work remains owned by settle(); a late response never refunds
        // or reopens this permanently stopped ledger.
        const cancelled = new Promise<never>((_resolve, reject) => {
          abort = () => reject(new Error("Inference deadline expired; completion unknown"));
          boundedSignal.addEventListener("abort", abort, { once: true });
          if (boundedSignal.aborted) abort();
        });
        const result: ExecutorResult = await Promise.race([work, cancelled]);
        row.tokensIn = tokens(result.metadata?.usage?.tokensIn);
        row.tokensOut = tokens(result.metadata?.usage?.tokensOut);
        if (tokenLimits && ((tokenLimits.requireUsage && (row.tokensIn === null || row.tokensOut === null)) ||
            (row.tokensIn !== null && row.tokensIn > tokenLimits.maxInputTokens) ||
            (row.tokensOut !== null && row.tokensOut > tokenLimits.maxOutputTokens))) throw new Error("Inference usage exceeds reserved token bound");
        if (boundedSignal.aborted) throw new Error("Inference deadline expired; no retry");
        const output = asJsonValue(result.output, "inference output");
        if (Buffer.byteLength(canonicalize(output)) > request.budget.maxOutputBytes) throw new Error("Inference output exceeds admitted bound");
        row.outputDigest = digestCanonical(output);
        row.status = "completed";
        Object.assign(accounting, totals(accounting.records, configurationDigest));
        await publish();
        return { output, metadata: { ...result.metadata, retryable: false, configurationDigest } };
      } catch {
        row.status = "unknown";
        row.outputDigest = null;
        Object.assign(accounting, totals(accounting.records, configurationDigest));
        let settlementSaved = true;
        try { await publish(); } catch { settlementSaved = false; }
        // The fsynced pre-dispatch reservation still blocks reopening when a
        // full disk or interrupted publication prevents this final update.
        throw new AlgalError("EFFECT_FAILED", settlementSaved
          ? "Inference completion unavailable; reservation retained and ledger stopped; no retry"
          : "Inference completion unavailable; reservation retained but settlement could not be persisted; no retry", undefined, { uncertain: true });
      } finally {
        if (abort) boundedSignal.removeEventListener("abort", abort);
      }
    }, SHARED_LEASE_RETRY); }
    catch (error) {
      if (!reserved) throw error;
      failedAfterReservation = true;
      accounting.stopped = true;
      // Lease cleanup is also fallible and must never turn a submitted call
      // into a definite/retryable error. An independent immutable marker closes
      // admission even when the answer was saved before cleanup failed.
      try { await hostWrite(stoppedPath, { configurationDigest, reason: "post-reservation-failure" }, 4096); } catch { /* Retain the original reservation and in-memory stop on storage failure. */ }
      throw new AlgalError("EFFECT_FAILED", "Inference completion unavailable; reservation retained and ledger stopped; no retry", undefined, { uncertain: true });
    }
  };
  const executeEffect = (request: EffectRequest, signal?: AbortSignal): Promise<ExecutorResult> => {
    return track(call(request, signal));
  };
  return { executor: { ...options.executor, id: `reserved:${options.executor.id}`, cacheable: false, retryable: false,
    cacheIdentity: configurationDigest, journalConfigurationFor: () => configurationDigest,
    receiptFor: async request => ({ ...await options.executor.receiptFor?.(request), configurationDigest, retryable: false }),
    executeEffect, execute: async (request, signal) => (await executeEffect(request, signal)).output },
    accounting, settle: async () => { while (pending.size) await Promise.allSettled([...pending]); } };
}
