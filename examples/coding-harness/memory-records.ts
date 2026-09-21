import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, lstat } from "node:fs/promises";
import { isAbsolute, join, normalize } from "node:path";
import { canonicalize, digestCanonical, type JsonValue } from "../../index";
import type { HarnessMemoryConfig, MemoryProcedure, MemoryScope } from "./memory-contract";

export const MEMORY_ADAPTER_VERSION = "algal.harness-memory.v1";
export const REF = /^sha256:[a-f0-9]{64}$/;
const ID = /^[a-z][a-z0-9._-]{0,63}$/;
export function object(value: unknown, label = "memory object"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Expected ${label}`);
  return value as Record<string, unknown>;
}
export function keys(value: Record<string, unknown>, allowed: string[], required = allowed): void {
  if (Object.keys(value).some((key) => !allowed.includes(key)) || required.some((key) => !(key in value))) throw new Error("Invalid memory record keys");
}
function id(value: unknown): string {
  if (typeof value !== "string" || !ID.test(value)) throw new Error("Invalid memory identifier");
  return value;
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length === 0 || Buffer.byteLength(value) > max || value.includes("\0")) throw new Error("Invalid memory text");
  return value;
}
function relativePath(value: unknown): string {
  const path = text(value, 256);
  if (isAbsolute(path) || path !== normalize(path) || path === ".." || path.startsWith("../") || /[\r\n]/.test(path)) throw new Error("Probe path must be a normalized relative path");
  return path;
}
export function boundedInteger(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > max) throw new Error("Invalid memory bound");
  return value as number;
}
export function parseScope(value: unknown): MemoryScope {
  const row = object(value); keys(row, ["sequenceId", "taskId", "environmentId", "dependencies"]);
  const deps = object(row.dependencies);
  if (Object.keys(deps).length > 8) throw new Error("At most eight memory dependencies");
  const dependencies: MemoryScope["dependencies"] = {};
  for (const [name, value] of Object.entries(deps).sort()) {
    id(name); const dep = object(value); keys(dep, ["path", "digest"]);
    if (typeof dep.digest !== "string" || !/^[a-f0-9]{64}$/.test(dep.digest)) throw new Error("Invalid dependency digest");
    dependencies[name] = { path: relativePath(dep.path), digest: dep.digest };
  }
  return { sequenceId: id(row.sequenceId), taskId: id(row.taskId), environmentId: id(row.environmentId), dependencies };
}
export function parseProcedure(value: unknown): MemoryProcedure {
  const row = object(value); keys(row, ["id", "description", "operation", "dependencies"]);
  const op = object(row.operation);
  let operation: MemoryProcedure["operation"];
  if (op.kind === "resolve-tool") {
    keys(op, ["kind", "tool"]);
    if (typeof op.tool !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,63}$/.test(op.tool)) throw new Error("Invalid tool name");
    operation = { kind: "resolve-tool", tool: op.tool };
  } else if (op.kind === "read-json-field") {
    keys(op, ["kind", "path", "field"]);
    const field = text(op.field, 128);
    if (!/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(field)) throw new Error("Invalid JSON field selector");
    operation = { kind: "read-json-field", path: relativePath(op.path), field };
  } else if (op.kind === "fingerprint-file") {
    keys(op, ["kind", "path"]); operation = { kind: "fingerprint-file", path: relativePath(op.path) };
  } else throw new Error("Unadmitted memory operation");
  if (!Array.isArray(row.dependencies) || row.dependencies.length > 5) throw new Error("At most five procedure dependencies fit the eight-round query bound");
  const dependencies = row.dependencies.map(id).sort();
  if (new Set(dependencies).size !== dependencies.length) throw new Error("Duplicate procedure dependency");
  return { id: id(row.id), description: text(row.description, 512), operation, dependencies };
}
function refs(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 128 || value.some((ref) => typeof ref !== "string" || !REF.test(ref)) || new Set(value).size !== value.length) throw new Error("Invalid memory source references");
  return value as string[];
}
export function parseHarnessMemoryConfig(value: unknown): HarnessMemoryConfig {
  const row = object(value); const required = ["mode", "owner", "storeDir", "nativeExecutable", "expectedNativeSha256", "scope", "procedures"];
  keys(row, [...required, "seedRefs", "excludedRefs", "maxOperations", "maxVisibleBytes", "maxWork"], required);
  if (row.mode !== "none" && row.mode !== "episodic" && row.mode !== "logical") throw new Error("Invalid memory mode");
  const storeDir = text(row.storeDir, 4096), nativeExecutable = text(row.nativeExecutable, 4096);
  if (!isAbsolute(storeDir) || !isAbsolute(nativeExecutable)) throw new Error("Memory host paths must be absolute");
  if (typeof row.expectedNativeSha256 !== "string" || !/^[a-f0-9]{64}$/.test(row.expectedNativeSha256)) throw new Error("Memory executable digest required");
  const scope = parseScope(row.scope);
  if (!Array.isArray(row.procedures) || row.procedures.length < 1 || row.procedures.length > 8) throw new Error("Require one to eight procedures");
  const procedures = row.procedures.map(parseProcedure);
  if (new Set(procedures.map((p) => p.id)).size !== procedures.length) throw new Error("Duplicate procedure ID");
  for (const p of procedures) for (const dep of p.dependencies) if (!scope.dependencies[dep]) throw new Error("Procedure dependency not declared in scope");
  return { mode: row.mode, owner: id(row.owner), storeDir, nativeExecutable, expectedNativeSha256: row.expectedNativeSha256, scope, procedures,
    seedRefs: refs(row.seedRefs), excludedRefs: refs(row.excludedRefs), maxOperations: boundedInteger(row.maxOperations, 4, 4), maxVisibleBytes: boundedInteger(row.maxVisibleBytes, 8192, 8192), maxWork: boundedInteger(row.maxWork, 50_000, 50_000) };
}
export const json = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value)) as JsonValue;
export const sha256 = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
export function recordRefPath(storeDir: string, ref: string): string {
  if (!REF.test(ref)) throw new Error("Invalid record reference");
  return join(storeDir, "records", `${ref.slice(7)}.json`);
}
export async function prepareMemoryStore(storeDir: string): Promise<void> {
  await mkdir(storeDir, { recursive: true, mode: 0o700 });
  if (!(await lstat(storeDir)).isDirectory()) throw new Error("Memory store must be a real directory");
  await mkdir(join(storeDir, "records"), { mode: 0o700 }).catch((e: NodeJS.ErrnoException) => { if (e.code !== "EEXIST") throw e; });
  if (!(await lstat(join(storeDir, "records"))).isDirectory()) throw new Error("Memory record directory must not be a symlink");
}
export async function readBoundedFile(path: string, maxBytes = 262_144): Promise<string> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maxBytes) throw new Error("Memory file exceeds bound or is not regular");
    const buffer = Buffer.alloc(maxBytes + 1);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (bytesRead > maxBytes) throw new Error("Memory file exceeds bound");
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally { await file.close(); }
}
export async function putMemoryRecord(storeDir: string, value: JsonValue): Promise<string> {
  const encoded = canonicalize(value);
  if (Buffer.byteLength(encoded) > 262_144) throw new Error("Memory record exceeds byte bound");
  const ref = digestCanonical(value), path = recordRefPath(storeDir, ref);
  try { const file = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o400); try { await file.writeFile(encoded); } finally { await file.close(); } }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; if (await readBoundedFile(path) !== encoded) throw new Error("Existing immutable memory record differs"); }
  return ref;
}
export async function getMemoryRecord(storeDir: string, ref: string): Promise<unknown> {
  const bytes = await readBoundedFile(recordRefPath(storeDir, ref));
  const value: unknown = JSON.parse(bytes);
  if (digestCanonical(json(value)) !== ref || canonicalize(json(value)) !== bytes) throw new Error("Memory source digest mismatch");
  return value;
}
export type Observation = {
  contract: "algal.harness-observation.v1"; owner: string; ordinal: number; scope: MemoryScope;
  procedureRef: string; rawRef: string; decoder: "algal.harness-probe.v1";
};
export function parseObservation(value: unknown): Observation {
  const row = object(value); keys(row, ["contract", "owner", "ordinal", "scope", "procedureRef", "rawRef", "decoder"]);
  if (row.contract !== "algal.harness-observation.v1" || row.decoder !== "algal.harness-probe.v1" || typeof row.procedureRef !== "string" || !REF.test(row.procedureRef) || typeof row.rawRef !== "string" || !REF.test(row.rawRef)) throw new Error("Not an admitted observation");
  return { contract: row.contract, owner: id(row.owner), ordinal: boundedInteger(row.ordinal, 1, 128), scope: parseScope(row.scope), procedureRef: row.procedureRef, rawRef: row.rawRef, decoder: row.decoder };
}
export function applicable(observed: MemoryScope, current: MemoryScope, procedure: MemoryProcedure): boolean {
  return observed.sequenceId === current.sequenceId && observed.environmentId === current.environmentId && procedure.dependencies.every((name) => {
    const a = observed.dependencies[name], b = current.dependencies[name]; return !!a && !!b && a.path === b.path && a.digest === b.digest;
  });
}
