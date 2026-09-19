// Effect requests and receipts: the only seam through which agent and
// classifier cells reach the world. A request is fully determined by the
// manifest plus delivered inputs; its digest binds request to receipt.
// Executors are host-supplied — Morphogen never brokers provider access.

import { MorphogenError, type ErrorCode } from "./errors";
import { commandJson } from "./io";
import { digestCanonical, type Digest } from "./digest";
import type { AgentOutput, Route } from "./contract";
import type { Store } from "./store";
import {
  asArray,
  asObject,
  asString,
  canonicalBytes,
  noUnknownKeys,
  optField,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";

export const EFFECT_CONTRACT = "morphogen.effect.v1" as const;

export type EffectRequest = {
  contract: typeof EFFECT_CONTRACT;
  cellId: string;
  kind: "agent" | "classifier" | "gate";
  prompt: string;
  context: JsonObject;
  output: AgentOutput;
  budget: { maxContextBytes: number; maxOutputBytes: number };
  route?: Route;
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
};

export type ExecutorMetadata = {
  executor?: string;
  usage?: EffectReceipt["usage"];
  cached?: boolean;
  retryable?: false;
};

export type ExecutorResult = {
  output: JsonValue;
  metadata?: ExecutorMetadata;
};

export type Executor = {
  id: string;
  cacheIdentity?: string;
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
    | {
        executor?: string;
        usage?: EffectReceipt["usage"];
        /** The response will be served from a memoized record. */
        cached?: boolean;
        retryable?: false;
      }
    | Promise<{
        executor?: string;
        usage?: EffectReceipt["usage"];
        cached?: boolean;
        retryable?: false;
      }>;
};

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
    cacheIdentity: digestCanonical({ kind: "scripted", id, responses }),
    async execute(request) {
      const digest = effectRequestDigest(request);
      if (responses[digest] !== undefined) return responses[digest];
      let hit: JsonValue | undefined = responses[request.cellId];
      if (Array.isArray(hit)) {
        let q = queues.get(request.cellId);
        if (!q) {
          q = [...hit];
          queues.set(request.cellId, q);
        }
        hit = q.shift();
      }
      if (hit === undefined) {
        throw new MorphogenError(
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
    receiptFor(request) {
      const rec = next(effectRequestDigest(request));
      if (!rec) return {};
      const out: {
        executor?: string;
        usage?: EffectReceipt["usage"];
        cached?: boolean;
        retryable?: false;
      } = {
        executor: rec.executor,
      };
      if (rec.usage) out.usage = rec.usage;
      if (rec.cached) out.cached = true;
      if (rec.retryable === false) out.retryable = false;
      return out;
    },
    async execute(request) {
      const digest = effectRequestDigest(request);
      const q = queues.get(digest);
      const hit = q?.shift();
      if (hit === undefined) {
        throw new MorphogenError(
          "EFFECT_UNBOUND",
          `replay has no receipt for request ${digest} (cell "${request.cellId}")`,
        );
      }
      if (hit.error !== undefined) {
        throw new MorphogenError(hit.error.code, hit.error.message);
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
  return {
    ...inner,
    id: inner.id,
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
      const hit = await lookup(request);
      if (hit?.output !== undefined) {
        return {
          output: hit.output,
          metadata: {
            executor: hit.executor,
            ...(hit.usage ? { usage: hit.usage } : {}),
            cached: true,
          },
        };
      }
      let result: ExecutorResult;
      if (inner.executeEffect) {
        result = await inner.executeEffect(request, signal);
      } else {
        const metadata = await inner.receiptFor?.(request);
        result = {
          output: await inner.execute(request, signal),
          ...(metadata ? { metadata } : {}),
        };
      }
      if (result.output !== null && typeof result.output === "object" && !Array.isArray(result.output)
        && Object.hasOwn(result.output, "tool") && Object.hasOwn(result.output, "inputs")) return result;
      if (canonicalBytes(result.output) > request.budget.maxOutputBytes) return result;
      try { bindOutput(request.output, result.output, request.cellId); }
      catch { return result; }
      const entry: EffectReceipt = {
        requestDigest: effectRequestDigest(request),
        executor: result.metadata?.executor ?? inner.id,
        output: result.output,
      };
      if (result.metadata?.usage) entry.usage = result.metadata.usage;
      await store.putEffect(entry, identity);
      return result;
    },
  };
}

/** Shells out: request JSON on stdin, output JSON on stdout. This is the live
 * seam — a wrapper script owns provider auth and prints the model's output.
 * Morphogen only ever sees the bounded response bytes. */
export function commandExecutor(
  command: string,
  opts: { timeoutMs?: number; maxStdoutBytes?: number } = {},
): Executor {
  const identity = digestCanonical({ command, options: opts });
  return {
    id: `cmd:${identity}`,
    cacheIdentity: identity,
    cacheable: false,
    retryable: false,
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
        throw new MorphogenError(
          "EFFECT_UNPARSEABLE",
          `cell "${cellId}": expected text output`,
        );
      }
      return raw;
    }
    case "json": {
      if (raw === null || typeof raw !== "object") {
        throw new MorphogenError(
          "EFFECT_UNPARSEABLE",
          `cell "${cellId}": expected json object output`,
        );
      }
      checkSchema(output.schema, raw, `cell "${cellId}" output`);
      return raw;
    }
    case "choice": {
      const s = typeof raw === "string" ? raw : null;
      if (s !== null && output.labels.includes(s)) return s;
      if (output.onMiss !== undefined) return output.onMiss;
      throw new MorphogenError(
        "EFFECT_UNPARSEABLE",
        `cell "${cellId}": output ${JSON.stringify(raw)} is not a declared label`,
      );
    }
  }
}

/** The bounded schema subset `{type, required, properties}` — used for
 * agent json output contracts and `json` port `schema` declarations. */
export function checkSchema(
  schema: JsonObject,
  value: JsonValue,
  what: string,
  code: "EFFECT_UNPARSEABLE" | "TYPE_MISMATCH" = "EFFECT_UNPARSEABLE",
): void {
  const type = typeof schema.type === "string" ? schema.type : undefined;
  if (type === "object" || type === undefined) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new MorphogenError(code, `${what}: expected object`);
    }
    const required = Array.isArray(schema.required) ? schema.required : [];
    const props =
      schema.properties !== null && typeof schema.properties === "object"
        ? (schema.properties as JsonObject)
        : {};
    for (const r of required) {
      if (typeof r === "string" && !(r in (value as JsonObject))) {
        throw new MorphogenError(
          code,
          `${what}: missing required key "${r}"`,
        );
      }
    }
    for (const [k, v] of Object.entries(value as JsonObject)) {
      const sub = props[k];
      if (sub !== null && typeof sub === "object" && !Array.isArray(sub)) {
        checkSchemaValue(sub as JsonObject, v, `${what}.${k}`, code);
      }
    }
  }
}

function checkSchemaValue(
  schema: JsonObject,
  value: JsonValue,
  what: string,
  code: "EFFECT_UNPARSEABLE" | "TYPE_MISMATCH",
): void {
  const t = typeof schema.type === "string" ? schema.type : undefined;
  const ok =
    t === undefined ||
    (t === "string" && typeof value === "string") ||
    (t === "number" && typeof value === "number") ||
    (t === "boolean" && typeof value === "boolean") ||
    (t === "array" && Array.isArray(value)) ||
    (t === "object" && value !== null && typeof value === "object" && !Array.isArray(value)) ||
    (t === "null" && value === null);
  if (!ok) {
    throw new MorphogenError(code, `${what}: expected ${t}`);
  }
}

export function parseEffectReceipt(u: unknown): EffectReceipt {
  const obj = asObject(u, "effect receipt");
  noUnknownKeys(
    obj,
    ["requestDigest", "output", "error", "executor", "usage", "cached", "retryable"],
    "effect receipt",
  );
  const digest = asString(
    reqField(obj, "requestDigest", "effect receipt"),
    "effect receipt.requestDigest",
    72,
  ) as Digest;
  const executor = asString(
    reqField(obj, "executor", "effect receipt"),
    "effect receipt.executor",
    256,
  );
  const outputRaw = optField(obj, "output");
  const errorRaw = optField(obj, "error");
  if ((outputRaw === undefined) === (errorRaw === undefined)) {
    throw new MorphogenError(
      "PARSE_FAILED",
      "effect receipt: exactly one of output or error is required",
    );
  }
  const receipt: EffectReceipt = { requestDigest: digest, executor };
  if (outputRaw !== undefined) receipt.output = asJson(outputRaw);
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
  const usage = optField(obj, "usage");
  if (usage !== undefined) {
    const uo = asObject(usage, "effect receipt.usage");
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
    if (retryable !== false) throw new MorphogenError("PARSE_FAILED", "effect receipt.retryable must be false when present");
    receipt.retryable = false;
  }
  const cached = optField(obj, "cached");
  if (cached !== undefined) {
    if (cached !== true) {
      throw new MorphogenError(
        "PARSE_FAILED",
        "effect receipt.cached must be true when present",
      );
    }
    receipt.cached = true;
  }
  return receipt;
}

function asIntField(u: unknown, what: string): number {
  if (typeof u !== "number" || !Number.isInteger(u) || u < 0) {
    throw new MorphogenError("PARSE_FAILED", `${what} must be a non-negative int`);
  }
  return u;
}

function asJson(u: unknown): JsonValue {
  const v = u as JsonValue;
  return v;
}

export function parseEffectReceipts(u: unknown): EffectReceipt[] {
  return asArray(u, "effects").map((e) => parseEffectReceipt(e));
}
