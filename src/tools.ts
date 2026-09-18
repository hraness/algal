import { BOUNDS, parsePortMap, type PortMap } from "./contract";
import { AlgalError } from "./errors";
import {
  asObject,
  asString,
  noUnknownKeys,
  reqField,
  type JsonValue,
} from "./values";

export type ToolEffect = "read" | "write";

export type ToolSignature = {
  inputs: PortMap;
  outputs: PortMap;
  effect: ToolEffect;
  cost: number;
  maxOutputBytes: number;
};

export type ToolContext = {
  requestDigest: `sha256:${string}`;
  idempotencyKey: `sha256:${string}`;
  signal?: AbortSignal;
};

export type Tool = (
  inputs: Record<string, JsonValue>,
  context: ToolContext,
) => Promise<Record<string, JsonValue>>;

export type ToolRegistry = Map<string, { signature: ToolSignature; tool: Tool }>;

export function emptyToolRegistry(): ToolRegistry {
  return new Map();
}

export const TOOL_SIGNATURE_BOUNDS = {
  maxNameLen: 128,
  maxCost: 1_000_000,
} as const;

/** Parse a tool signature from foreign data — the same PortMap grammar cells
 * use, plus effect class, modeled cost, and the output bound the runtime
 * enforces on every call. */
export function parseToolSignature(u: unknown, what = "tool signature"): ToolSignature {
  const obj = asObject(u, what);
  noUnknownKeys(obj, ["inputs", "outputs", "effect", "cost", "maxOutputBytes"], what);
  const effect = asString(reqField(obj, "effect", what), `${what}.effect`, 8);
  if (effect !== "read" && effect !== "write") {
    throw new AlgalError("PARSE_FAILED", `${what}.effect must be read|write`);
  }
  const cost = reqField(obj, "cost", what);
  if (!Number.isInteger(cost) || (cost as number) < 0 || (cost as number) > TOOL_SIGNATURE_BOUNDS.maxCost) {
    throw new AlgalError("PARSE_FAILED", `${what}.cost must be an integer 0..${TOOL_SIGNATURE_BOUNDS.maxCost}`);
  }
  const maxOutputBytes = reqField(obj, "maxOutputBytes", what);
  if (
    !Number.isInteger(maxOutputBytes) ||
    (maxOutputBytes as number) <= 0 ||
    (maxOutputBytes as number) > BOUNDS.maxValueBytes
  ) {
    throw new AlgalError(
      "PARSE_FAILED",
      `${what}.maxOutputBytes must be an integer 1..${BOUNDS.maxValueBytes}`,
    );
  }
  return {
    inputs: parsePortMap(reqField(obj, "inputs", what), `${what}.inputs`),
    outputs: parsePortMap(reqField(obj, "outputs", what), `${what}.outputs`, "producer"),
    effect,
    cost: cost as number,
    maxOutputBytes: maxOutputBytes as number,
  };
}
