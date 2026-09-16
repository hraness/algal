// Effect requests and receipts: the only seam through which agent and
// classifier cells reach the world. A request is fully determined by the
// manifest plus delivered inputs; its digest binds request to receipt.
// Executors are host-supplied — Morphogen never brokers provider access.

import { MorphogenError, type ErrorCode } from "./errors";
import { digestCanonical, type Digest } from "./digest";
import type { AgentOutput, Route } from "./contract";
import {
  asArray,
  asObject,
  asString,
  canonicalize,
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
};

export type Executor = {
  id: string;
  execute(request: EffectRequest): Promise<JsonValue>;
  /** Receipt metadata recorded for this request. Executors that replay a
   * prior run implement this so the rerun reproduces the original receipt's
   * executor id and usage — making verification bit-for-bit. */
  receiptFor?(request: EffectRequest): {
    executor?: string;
    usage?: EffectReceipt["usage"];
  };
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
  const queues = new Map<string, JsonValue[]>();
  return {
    id,
    async execute(request) {
      const digest = effectRequestDigest(request);
      if (responses[digest] !== undefined) return responses[digest];
      let hit = responses[request.cellId];
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
  const byDigest = new Map(effects.map((e) => [e.requestDigest, e]));
  return {
    id,
    receiptFor(request) {
      const rec = byDigest.get(effectRequestDigest(request));
      if (!rec) return {};
      const out: { executor?: string; usage?: EffectReceipt["usage"] } = {
        executor: rec.executor,
      };
      if (rec.usage) out.usage = rec.usage;
      return out;
    },
    async execute(request) {
      const digest = effectRequestDigest(request);
      const hit = byDigest.get(digest);
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

/** Shells out: request JSON on stdin, output JSON on stdout. This is the live
 * seam — a wrapper script owns provider auth and prints the model's output.
 * Morphogen only ever sees the bounded response bytes. */
export function commandExecutor(
  command: string,
  opts: { timeoutMs?: number; maxStdoutBytes?: number } = {},
): Executor {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const maxStdout = opts.maxStdoutBytes ?? 1_048_576;
  return {
    id: `cmd:${command}`,
    async execute(request) {
      const proc = Bun.spawn(["sh", "-c", command], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      });
      const payload = canonicalize(request as unknown as JsonValue);
      proc.stdin.write(payload);
      proc.stdin.end();
      const timer = setTimeout(() => proc.kill("SIGKILL"), timeoutMs);
      let stdout: Buffer;
      try {
        stdout = Buffer.from(await new Response(proc.stdout).arrayBuffer());
      } finally {
        clearTimeout(timer);
      }
      const code = await proc.exited;
      if (stdout.byteLength > maxStdout) {
        throw new MorphogenError(
          "EFFECT_FAILED",
          `executor output exceeds ${maxStdout} bytes`,
        );
      }
      if (code !== 0) {
        const stderr = Buffer.from(
          await new Response(proc.stderr).arrayBuffer(),
        )
          .toString("utf8")
          .slice(0, 2000);
        throw new MorphogenError(
          "EFFECT_FAILED",
          `executor exited ${code}: ${stderr}`,
        );
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(stdout.toString("utf8"));
      } catch {
        throw new MorphogenError(
          "EFFECT_UNPARSEABLE",
          "executor stdout is not JSON",
        );
      }
      return parsed as JsonValue;
    },
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

function checkSchema(schema: JsonObject, value: JsonValue, what: string): void {
  const type = typeof schema.type === "string" ? schema.type : undefined;
  if (type === "object" || type === undefined) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new MorphogenError(
        "EFFECT_UNPARSEABLE",
        `${what}: expected object`,
      );
    }
    const required = Array.isArray(schema.required) ? schema.required : [];
    const props =
      schema.properties !== null && typeof schema.properties === "object"
        ? (schema.properties as JsonObject)
        : {};
    for (const r of required) {
      if (typeof r === "string" && !(r in (value as JsonObject))) {
        throw new MorphogenError(
          "EFFECT_UNPARSEABLE",
          `${what}: missing required key "${r}"`,
        );
      }
    }
    for (const [k, v] of Object.entries(value as JsonObject)) {
      const sub = props[k];
      if (sub !== null && typeof sub === "object" && !Array.isArray(sub)) {
        checkSchemaValue(sub as JsonObject, v, `${what}.${k}`);
      }
    }
  }
}

function checkSchemaValue(schema: JsonObject, value: JsonValue, what: string): void {
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
    throw new MorphogenError(
      "EFFECT_UNPARSEABLE",
      `${what}: expected ${t}`,
    );
  }
}

export function parseEffectReceipt(u: unknown): EffectReceipt {
  const obj = asObject(u, "effect receipt");
  noUnknownKeys(
    obj,
    ["requestDigest", "output", "error", "executor", "usage"],
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
