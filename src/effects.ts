import { compareUtf8 } from "./utf8";
// Effect requests and receipts: the only seam through which agent,
// decision, approval, and recall cells reach the world. A request is fully
// determined by the manifest plus delivered inputs; its digest binds request to receipt.
// Executors are host-supplied — Algal never brokers provider access.

import {
  parseWakeCapabilities,
  type CapabilityHandle,
} from "./capabilities";
import { AlgalError, ERROR_CODES, errorReport, type ErrorCode } from "./errors";
import { commandJson } from "./io-runtime";
import { asDigest, digestCanonical, type Digest } from "./digest";
import type { AgentOutput, Route } from "./contract";
import { checkSchemaValueV2, type SchemaVersion } from "./schema";
import type { Store } from "./store-contract";
import {
  asArray,
  asJsonValue,
  asObject,
  asString,
  canonicalBytes,
  noUnknownKeys,
  optField,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";

export const EFFECT_CONTRACT = "algal.effect.v1" as const;

export const EFFECT_KINDS = ["agent", "classifier", "gate", "decide", "recall"] as const;
export type EffectKind = (typeof EFFECT_KINDS)[number];
export const MODEL_EFFECT_KINDS = ["agent", "classifier"] as const satisfies readonly EffectKind[];

/** The typed-decision question contract (`kind:"decide"` requests): the wire
 * shape any decision provider answers — provider-neutral by design (Jev is
 * the first backend). `noul` → a keep/relevance probability; `choice` → a
 * label from `criteria` keys; `score` → a rating. The parsers live in
 * decisions.ts; the type lives here because it is request-contract data. */
export type DecisionQuestion =
  | {
      type: "noul";
      instructions: string;
      criteria?: { true?: string; false?: string };
    }
  | {
      type: "choice";
      instructions: string;
      criteria: Record<string, string | null>;
    }
  | { type: "score"; instructions: string; criteria: string[] };

export type DecisionQuestions = Record<string, DecisionQuestion>;

export type EffectRequest = {
  contract: typeof EFFECT_CONTRACT;
  cellId: string;
  kind: EffectKind;
  prompt: string;
  context: JsonObject;
  output: AgentOutput;
  budget: { maxContextBytes: number; maxOutputBytes: number };
  route?: Route;
  /** Declared typed-decision questions — present only on `kind:"decide"`
   * requests (the `decide` cell kind's question map and internal compaction
   * probes). Digested with the request, so a replayed run serves the same
   * questions to the same answers. */
  questions?: DecisionQuestions;
  /** The derived semantic probe — present only on `kind:"recall"` requests:
   * the expr-evaluated query text, the hit cap, and the embedder spec whose
   * vectors the index must answer over. Digested with the request, so replay
   * reproduces the same ranking inputs against the recorded response. */
  recall?: { query: string; k: number; embedder: string };
};

export type EffectReceipt = {
  requestDigest: Digest;
  /** The executor's response. Absent when `error` is present — a failed
   * effect records what it reported so replay can reproduce the failure. */
  output?: JsonValue;
  error?: { code: ErrorCode; message: string };
  executor: string;
  usage?: { model?: string; tokensIn?: number; tokensOut?: number };
  /** True when the response was served from a prior run's record via
   * `cachedExecutor` rather than executed — a fact of the run, so replay
   * reproduces the flag. Only ever present as `cached: true`. */
  cached?: boolean;
  retryable?: false;
  wake?: CapabilityHandle[];
  /** Digest of the backend configuration that served the request — binds
   * the admitted executor's identity into the receipt. */
  configurationDigest?: Digest;
};

export type ExecutorMetadata = {
  executor?: string;
  usage?: EffectReceipt["usage"];
  cached?: boolean;
  retryable?: false;
  wake?: CapabilityHandle[];
  configurationDigest?: Digest;
};

export type ExecutorResult = {
  output: JsonValue;
  metadata?: ExecutorMetadata;
};

export type ExecutorCapabilities = {
  effects: readonly EffectKind[];
};

export type Executor = {
  id: string;
  capabilities?: ExecutorCapabilities;
  routeWildcard?: true;
  replay?: true;
  /** Present on replay executors: whether a recorded receipt exists for this
   * request's digest. The scheduler checks it before routing — a resume run
   * replays its recorded prefix and falls through to live executors for
   * requests the checkpoint never reached. */
  serves?(request: EffectRequest): boolean;
  cacheIdentity?: string;
  /** Stable host admission identity, independent of cache-hit receipt metadata.
   * Hosts must version this digest whenever adapter configuration/semantics change. */
  journalConfigurationFor?(request: EffectRequest): Digest | Promise<Digest>;
  cacheable?: boolean;
  retryable?: boolean;
  /** `signal` aborts when the cell's `budget.maxEffectMs` fires — an
   * executor should treat abort as cancellation (commandExecutor kills its
   * process). Advisory: the runner already raced the call to a timeout. */
  execute(request: EffectRequest, signal?: AbortSignal): Promise<JsonValue>;
  executeEffect?(request: EffectRequest, signal?: AbortSignal): Promise<ExecutorResult>;
  /** Receipt metadata recorded for this request. Executors that replay a
   * prior run implement this so the rerun reproduces the original receipt's
   * executor id and usage — making verification bit-for-bit. Called before
   * `execute` on each attempt. */
  receiptFor?(request: EffectRequest):
    | ExecutorMetadata
    | Promise<ExecutorMetadata>;
};

// Host-only invocation evidence. A preflight receiptFor cache hit can disappear
// before execution, so it cannot classify a later result or thrown error.
type DispatchObserver = (dispatched: boolean) => void;
type ObservedInvocation = (request: EffectRequest, signal: AbortSignal | undefined, observe: DispatchObserver) => Promise<ExecutorResult>;
const observedInvocations = new WeakMap<NonNullable<Executor["executeEffect"]>, ObservedInvocation>();

/** Internal scheduler/cache seam; no dispatch evidence enters the wire receipt. */
export async function invokeExecutorEffect(
  executor: Executor, request: EffectRequest, signal: AbortSignal | undefined, observe: DispatchObserver,
): Promise<ExecutorResult> {
  const invoke = executor.executeEffect && observedInvocations.get(executor.executeEffect);
  if (invoke) return invoke(request, signal, observe);
  observe(executor.replay !== true);
  const result = executor.executeEffect
    ? await executor.executeEffect(request, signal)
    : { output: await executor.execute(request, signal) };
  if (executor.replay === true) return result;
  const cached = result.metadata?.cached === true;
  if (cached) observe(false);
  return { ...result, metadata: { ...result.metadata, cached } };
}

export function executorSupports(executor: Executor, kind: EffectKind): boolean {
  const effects: readonly EffectKind[] = executor.capabilities?.effects ?? MODEL_EFFECT_KINDS;
  return effects.includes(kind);
}

export function effectRequestDigest(req: EffectRequest): Digest {
  const { contract: _c, ...rest } = req;
  return digestCanonical({ contract: EFFECT_CONTRACT, ...rest } as JsonValue);
}

// ------------------------------------------------------------- executors ---

/** Responses map: keys are either cell ids or "sha256:" request digests.
 * Digest keys win. A cell-id value may be an array, consumed one response per
 * turn — that is how tool-call loops are scripted. Mirrors the
 * writing-factory rule: fixed receipts in, deterministic orchestration out. */
export function scriptedExecutor(
  responses: Record<string, JsonValue>,
  id = "scripted",
): Executor {
  responses = structuredClone(responses);
  const queues = new Map<string, JsonValue[]>();
  return {
    id,
    capabilities: { effects: EFFECT_KINDS },
    routeWildcard: true,
    cacheIdentity: digestCanonical({ kind: "scripted", id, responses }),
    async execute(request) {
      const digest = effectRequestDigest(request);
      const exact = Object.hasOwn(responses, digest) ? responses[digest] : undefined;
      if (exact !== undefined) return exact;
      let hit = Object.hasOwn(responses, request.cellId) ? responses[request.cellId] : undefined;
      if (Array.isArray(hit)) {
        let q = queues.get(request.cellId);
        if (!q) {
          q = [...hit];
          queues.set(request.cellId, q);
        }
        hit = q.shift();
      }
      if (hit === undefined) {
        throw new AlgalError(
          "EFFECT_UNBOUND",
          `no scripted response for cell "${request.cellId}" (digest ${digest})`,
        );
      }
      return hit;
    },
  };
}

/** Replays receipts from a prior run. The verify path uses this so a run can
 * be re-executed offline with fixed effect outcomes. */
export function replayExecutor(
  effects: readonly EffectReceipt[],
  id = "replay",
): Executor {
  // several receipts may share a request digest — a retried effect issues
  // the same request again. Serve each digest's receipts in record order.
  const queues = new Map<Digest, EffectReceipt[]>();
  for (const e of effects) {
    const q = queues.get(e.requestDigest) ?? [];
    q.push(e);
    queues.set(e.requestDigest, q);
  }
  const next = (digest: Digest): EffectReceipt | undefined =>
    queues.get(digest)?.[0];
  return {
    id,
    capabilities: { effects: EFFECT_KINDS },
    replay: true,
    serves(request) {
      return next(effectRequestDigest(request)) !== undefined;
    },
    receiptFor(request) {
      const rec = next(effectRequestDigest(request));
      if (!rec) return {};
      const out: ExecutorMetadata = {
        executor: rec.executor,
      };
      if (rec.usage) out.usage = rec.usage;
      if (rec.cached) out.cached = true;
      if (rec.retryable === false) out.retryable = false;
      if (rec.wake) out.wake = rec.wake;
      if (rec.configurationDigest) out.configurationDigest = rec.configurationDigest;
      return out;
    },
    async execute(request) {
      const digest = effectRequestDigest(request);
      const q = queues.get(digest);
      const hit = q?.shift();
      if (hit === undefined) {
        throw new AlgalError(
          "EFFECT_UNBOUND",
          `replay has no receipt for request ${digest} (cell "${request.cellId}")`,
        );
      }
      if (hit.error !== undefined) {
        throw new AlgalError(hit.error.code, hit.error.message);
      }
      return hit.output!;
    },
  };
}

/** Memoizes successful effects across runs. Effect requests are pure — the
 * request digest covers cell path, kind, prompt, inputs, tools, and budget —
 * so an identical request issued by a later run may be served the earlier
 * recorded response instead of executing again. The served effect is still
 * recorded on the new run's receipt (with `cached: true`), still bounded by
 * agent-call and context budgets, and still contract-checked. Only successes
 * are memoized: a recorded error may be transient (a timeout, a flaky
 * provider) and must never determinize into permanent failure. First record
 * wins — a later differing response for the same request cannot overwrite. */
export function cachedExecutor(inner: Executor, store: Store): Executor {
  if (inner.cacheable === false) return inner;
  const identity = inner.cacheIdentity ?? inner.id;
  const lookup = (request: EffectRequest) =>
    store.getEffect(effectRequestDigest(request), identity);
  const invoke = async (request: EffectRequest, signal: AbortSignal | undefined, observe: DispatchObserver): Promise<ExecutorResult> => {
    let dispatched = false;
    const observed = (value: boolean) => { dispatched = value; observe(value); };
    const hit = await lookup(request);
    if (hit?.output !== undefined) {
      return {
        output: hit.output,
        metadata: { executor: hit.executor, ...(hit.usage ? { usage: hit.usage } : {}), cached: true },
      };
    }
    const metadata = inner.executeEffect ? undefined : await inner.receiptFor?.(request);
    let result = await invokeExecutorEffect(inner, request, signal, observed);
    try {
      result = { ...result, metadata: { ...metadata, ...result.metadata } };
      // Successful cache wrappers supply current provenance, replacing preflight
      // metadata. Thrown calls retain the invocation observer's actual phase.
      result = { ...result, metadata: { ...result.metadata, cached: result.metadata?.cached === true } };
      if (result.metadata?.cached === true) observed(false);
      if (result.output !== null && typeof result.output === "object" && !Array.isArray(result.output)
        && Object.hasOwn(result.output, "tool") && Object.hasOwn(result.output, "inputs")) return result;
      if (canonicalBytes(result.output) > request.budget.maxOutputBytes) return result;
      try { bindOutput(request.output, result.output, request.cellId); }
      catch { return result; }
      const entry: EffectReceipt = {
        requestDigest: effectRequestDigest(request), executor: result.metadata?.executor ?? inner.id, output: result.output,
      };
      if (result.metadata?.usage) entry.usage = result.metadata.usage;
      await store.putEffect(entry, identity);
      return result;
    } catch (error) {
      // A returned live result must not become a settled error just because
      // its cache encoding or publication failed before the caller received it.
      if (!dispatched || (error instanceof AlgalError && error.uncertain)) throw error;
      const report = errorReport(error);
      throw new AlgalError(report.code, report.message, error instanceof AlgalError ? error.details : undefined, { uncertain: true });
    }
  };
  const wrapper: Executor = {
    ...inner,
    id: inner.id,
    async journalConfigurationFor(request) {
      if (inner.journalConfigurationFor) return inner.journalConfigurationFor(request);
      const metadata = await inner.receiptFor?.(request);
      return asDigest(metadata?.configurationDigest ?? inner.cacheIdentity, "journal executor configuration");
    },
    async receiptFor(request) {
      const hit = await lookup(request);
      if (hit?.output !== undefined) {
        const out: {
          executor?: string;
          usage?: EffectReceipt["usage"];
          cached?: boolean;
        } = { executor: hit.executor, cached: true };
        if (hit.usage) out.usage = hit.usage;
        return out;
      }
      return inner.receiptFor?.(request) ?? {};
    },
    async execute(request, signal) {
      return (await this.executeEffect!(request, signal)).output;
    },
    async executeEffect(request, signal) {
      return invoke(request, signal, () => {});
    },
  };
  // Bind the hook to the actual method: copying the method keeps its evidence,
  // while replacing it cannot accidentally invoke an obsolete cache wrapper.
  observedInvocations.set(wrapper.executeEffect!, invoke);
  return wrapper;
}

/** Shells out: request JSON on stdin, output JSON on stdout. This is the live
 * seam — a wrapper script owns provider auth and prints the model's output.
 * Algal only ever sees the bounded response bytes. */
export function commandExecutor(
  command: string,
  opts: { timeoutMs?: number; maxStdoutBytes?: number } = {},
): Executor {
  const identity = digestCanonical({ command, options: opts });
  // The backend configuration digest mirrors the native executor's
  // `algal.host.v1` command backend — argv, cwd, and the effective timeout —
  // so receipts agree across runtimes.
  const configurationDigest = digestCanonical({
    argv: ["sh", "-c", command],
    cwd: null,
    kind: "command",
    timeoutMs: opts.timeoutMs ?? 120_000,
  });
  return {
    id: `cmd:${identity}`,
    capabilities: { effects: EFFECT_KINDS },
    cacheIdentity: identity,
    cacheable: false,
    retryable: false,
    receiptFor: () => ({ configurationDigest }),
    execute: (request, signal) => commandJson(
      ["sh", "-c", command], request as unknown as JsonValue, { ...opts, ...(signal ? { signal } : {}) },
    ),
  };
}

// ------------------------------------------------------------ validation ---

/** Coerce an executor's raw output into the declared contract. Strict: a
 * classifier returns a label or misses; adapters own any leniency. */
export function bindOutput(
  output: AgentOutput,
  raw: JsonValue,
  cellId: string,
): JsonValue {
  switch (output.kind) {
    case "text": {
      if (typeof raw !== "string") {
        throw new AlgalError(
          "EFFECT_UNPARSEABLE",
          `cell "${cellId}": expected text output`,
        );
      }
      return raw;
    }
    case "json": {
      checkSchema(output.schema, raw, `cell "${cellId}" output`, "EFFECT_UNPARSEABLE", output.schemaVersion);
      return raw;
    }
    case "choice": {
      const s = typeof raw === "string" ? raw : null;
      if (s !== null && output.labels.includes(s)) return s;
      if (output.onMiss !== undefined) return output.onMiss;
      throw new AlgalError(
        "EFFECT_UNPARSEABLE",
        `cell "${cellId}": output ${JSON.stringify(raw)} is not a declared label`,
      );
    }
  }
}

/** The bounded schema subset `{type, required, properties}` — used for
 * agent json output contracts and `json` port `schema` declarations.
 * Manifest admission bounds schema depth. In version 1 other schema keywords
 * are retained provider hints, not constraints enforced by the VM; version 2
 * also checks `items`, `enum`, `minimum`, and `maximum`. */
export function checkSchema(
  schema: JsonObject,
  value: JsonValue,
  _what: string,
  code: "EFFECT_UNPARSEABLE" | "TYPE_MISMATCH" = "EFFECT_UNPARSEABLE",
  version?: SchemaVersion,
): void {
  if (version === 2) {
    checkSchemaValueV2(schema, value, code);
    return;
  }
  const types = Array.isArray(schema.type) ? schema.type : [typeof schema.type === "string" ? schema.type : "object"];
  const matches = types.some(type =>
    (type === "string" && typeof value === "string") ||
    (type === "number" && typeof value === "number") ||
    (type === "integer" && typeof value === "number" && Number.isInteger(value)) ||
    (type === "boolean" && typeof value === "boolean") ||
    (type === "array" && Array.isArray(value)) ||
    (type === "object" && value !== null && typeof value === "object" && !Array.isArray(value)) ||
    (type === "null" && value === null));
  if (!matches) throw new AlgalError(code, `expected ${types.join("|")}`);
  const values = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject : undefined;
  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const key of required) {
    // Match native's bounded text parser, including the input-side parse code.
    const parseCode = code === "TYPE_MISMATCH" ? "PARSE_FAILED" : code;
    if (typeof key !== "string") throw new AlgalError(parseCode, "expected text");
    if (key.length > 64) throw new AlgalError(parseCode, "text exceeds bound");
    if (values === undefined || !Object.prototype.hasOwnProperty.call(values, key)) {
      throw new AlgalError(code, "missing required field");
    }
  }
  const props = schema.properties !== null && typeof schema.properties === "object" && !Array.isArray(schema.properties)
    ? schema.properties as JsonObject : undefined;
  if (values === undefined || props === undefined) return;
  // Native schema validation visits properties in UTF-8 order. Diagnostic choice
  // is receipt data, so use that same order, including non-BMP property names.
  const keys = Object.keys(props).sort(compareUtf8);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      const sub = props[key];
      const nested = sub !== null && typeof sub === "object" && !Array.isArray(sub)
        ? sub as JsonObject : {};
      checkSchema(nested, values[key]!, _what, code);
    }
  }
}

export function parseEffectReceipt(u: unknown): EffectReceipt {
  const obj = asObject(u, "effect receipt");
  noUnknownKeys(
    obj,
    [
      "requestDigest",
      "output",
      "error",
      "executor",
      "usage",
      "cached",
      "retryable",
      "wake",
      "configurationDigest",
    ],
    "effect receipt",
  );
  const digest = asDigest(
    reqField(obj, "requestDigest", "effect receipt"),
    "effect receipt.requestDigest",
  );
  const executor = asString(
    reqField(obj, "executor", "effect receipt"),
    "effect receipt.executor",
    256,
  );
  const outputRaw = optField(obj, "output");
  const errorRaw = optField(obj, "error");
  if ((outputRaw === undefined) === (errorRaw === undefined)) {
    throw new AlgalError(
      "PARSE_FAILED",
      "effect receipt: exactly one of output or error is required",
    );
  }
  const receipt: EffectReceipt = { requestDigest: digest, executor };
  if (outputRaw !== undefined) receipt.output = asJsonValue(outputRaw, "effect receipt.output");
  if (errorRaw !== undefined) {
    const eo = asObject(errorRaw, "effect receipt.error");
    noUnknownKeys(eo, ["code", "message"], "effect receipt.error");
    receipt.error = {
      code: asString(
        reqField(eo, "code", "effect receipt.error"),
        "effect receipt.error.code",
        64,
      ) as ErrorCode,
      message: asString(
        reqField(eo, "message", "effect receipt.error"),
        "effect receipt.error.message",
        2048,
      ),
    };
  }
  if (receipt.error && !ERROR_CODES.includes(receipt.error.code)) {
    throw new AlgalError("PARSE_FAILED", "effect receipt.error.code is unknown");
  }
  const usage = optField(obj, "usage");
  if (usage !== undefined) {
    const uo = asObject(usage, "effect receipt.usage");
    noUnknownKeys(uo, ["model", "tokensIn", "tokensOut"], "effect receipt.usage");
    const u2: EffectReceipt["usage"] = {};
    if (uo.model !== undefined) u2.model = asString(uo.model, "usage.model", 128);
    if (uo.tokensIn !== undefined)
      u2.tokensIn = asIntField(uo.tokensIn, "usage.tokensIn");
    if (uo.tokensOut !== undefined)
      u2.tokensOut = asIntField(uo.tokensOut, "usage.tokensOut");
    receipt.usage = u2;
  }
  const retryable = optField(obj, "retryable");
  if (retryable !== undefined) {
    if (retryable !== false) throw new AlgalError("PARSE_FAILED", "effect receipt.retryable must be false when present");
    receipt.retryable = false;
  }
  const cached = optField(obj, "cached");
  if (cached !== undefined) {
    if (cached !== true) {
      throw new AlgalError(
        "PARSE_FAILED",
        "effect receipt.cached must be true when present",
      );
    }
    receipt.cached = true;
  }
  const wake = optField(obj, "wake");
  if (wake !== undefined) {
    if (receipt.error?.code !== "EFFECT_SUSPENDED") {
      throw new AlgalError("PARSE_FAILED", "effect receipt.wake requires EFFECT_SUSPENDED");
    }
    receipt.wake = parseWakeCapabilities(wake, "effect receipt.wake");
  }
  const configurationDigest = optField(obj, "configurationDigest");
  if (configurationDigest !== undefined) {
    receipt.configurationDigest = asDigest(
      configurationDigest,
      "effect receipt.configurationDigest",
    );
  }
  return receipt;
}

function asIntField(u: unknown, what: string): number {
  if (typeof u !== "number" || !Number.isSafeInteger(u) || u < 0) {
    throw new AlgalError("PARSE_FAILED", `${what} must be a non-negative int`);
  }
  return u;
}

export function parseEffectReceipts(u: unknown): EffectReceipt[] {
  return asArray(u, "effects").map((e) => parseEffectReceipt(e));
}
