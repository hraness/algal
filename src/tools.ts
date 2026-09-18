import type { PortMap } from "./contract";
import type { JsonValue } from "./values";

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
