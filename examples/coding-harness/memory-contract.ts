import type { JsonValue } from "../../index";

/** Example-local contract: native algal.memory.v1 remains unchanged. */
export type MemoryMode = "none" | "episodic" | "logical";
export type MemoryAction =
  | { type: "memory.read" }
  | { type: "memory.query"; procedure: string }
  | { type: "memory.probe"; procedure: string };
export type MemoryProcedure = {
  id: string;
  description: string;
  operation:
    | { kind: "resolve-tool"; tool: string }
    | { kind: "read-json-field"; path: string; field: string }
    | { kind: "fingerprint-file"; path: string };
  /** Names in scope.dependencies; only these determine this record's reuse. */
  dependencies: string[];
};
export type MemoryScope = {
  sequenceId: string;
  taskId: string;
  environmentId: string;
  dependencies: Record<string, { path: string; digest: string }>;
};
export type HarnessMemoryConfig = {
  mode: MemoryMode;
  owner: string;
  storeDir: string;
  nativeExecutable: string;
  expectedNativeSha256: string;
  scope: MemoryScope;
  procedures: MemoryProcedure[];
  /** Explicit immutable inputs. Non-seed live records must match owner. */
  seedRefs?: string[];
  /** Host-authored corrections; never model-selected. */
  excludedRefs?: string[];
  maxOperations?: number;
  maxVisibleBytes?: number;
  maxWork?: number;
};
export type MemoryTerminal = (request: {
  command: string; maxOutputBytes: number; timeoutMs: number;
}, signal?: AbortSignal) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
export interface HarnessMemory {
  /** Bind mode, owner/scope, sources, procedures, adapter and native identity. */
  configurationDigest: string;
  description: string;
  execute(action: MemoryAction, terminal: MemoryTerminal, signal?: AbortSignal): Promise<JsonValue>;
  /** Any ordinary terminal command may mutate the dependencies. Queries stay pure. */
  invalidate(): void;
  settle(): Promise<void>;
  evidence(): JsonValue;
}
