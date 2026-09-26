/**
 * verify/differential/worker.ts — supervised batch worker. Reads a bounded
 * JSON manifest {wasm, cases:[{id, path, mode, wrapper}]}, evaluates each
 * case against the committed WASM on a fresh instance per call, optionally
 * runs the Bun `evalProgram`/`checkProgram` leg for flagged cases, and emits
 * one bounded NDJSON line per case on stdout.
 *
 * A WASM trap or wrapper throw is a typed record for that case — never a
 * silent retry, never a swallowed crash.
 *
 * This file is only ever executed by the harness driver; it never chooses
 * its own inputs.
 */

import { readFileBounded } from "../lib/files";
import { requireThat } from "../lib/schema";
import { dirname, isAbsolute } from "node:path";
import { loadWasmModule, callRaw } from "./wasm";
import { wrapperFaithful } from "./engine";

export type CaseRef = { id: string; path: string; mode: "eval" | "check"; wrapper: boolean };
export type WorkerLine =
  | { id: string; wasm: { status: "ok"; text: string }; wrapper: unknown | "skipped" | { threw: string } }
  | { id: string; wasm: { status: "trap" | "bad-output" | "null-input"; error: string }; wrapper: unknown | "skipped" | { threw: string } }
  | { id: string; wasm: { status: "read-error"; error: string }; wrapper: "skipped" };

export const WORKER_LIMITS = { manifestBytes: 8_388_608, cases: 2_048, inputBytes: 400_000, lineBytes: 2_097_152 } as const;

async function wrapperEval(mode: "eval" | "check", bytes: Uint8Array, inst: WebAssembly.Instance): Promise<unknown | "skipped" | { threw: string }> {
  try {
    let doc: unknown;
    try {
      doc = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      return "skipped"; // the wrapper leg only admits JS-parseable envelopes
    }
    const { setExprExports, evalProgram, checkProgram } = await import("../../src/expr");
    setExprExports(inst.exports as never);
    if (doc === null || typeof doc !== "object" || Array.isArray(doc)) return "skipped";
    const d = doc as Record<string, unknown>;
    if (mode === "check") {
      const names = Array.isArray(d.names) ? d.names.filter((n): n is string => typeof n === "string") : [];
      return await checkProgram(d.program as never, names);
    }
    const env = d.env !== null && typeof d.env === "object" && !Array.isArray(d.env) ? d.env : {};
    const fuel = typeof d.fuel === "number" && Number.isInteger(d.fuel) && d.fuel >= 0 ? d.fuel : 10_000;
    return await evalProgram(d.program as never, env as never, fuel);
  } catch (error) {
    return { threw: error instanceof Error ? error.message.slice(0, 512) : String(error).slice(0, 512) };
  }
}

export async function runWorkerManifest(manifestPath: string): Promise<WorkerLine[]> {
  requireThat(isAbsolute(manifestPath) && manifestPath.length <= 4096, "worker manifest path must be absolute");
  const raw = await readFileBounded(dirname(manifestPath), manifestPath.split("/").pop()!, WORKER_LIMITS.manifestBytes);
  const manifest = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)) as {
    wasm: string; cases: CaseRef[];
  };
  requireThat(typeof manifest === "object" && manifest !== null && !Array.isArray(manifest), "worker manifest not an object");
  requireThat(isAbsolute(manifest.wasm), "worker wasm path must be absolute");
  requireThat(Array.isArray(manifest.cases) && manifest.cases.length <= WORKER_LIMITS.cases, "worker case bound");
  const mod = await loadWasmModule(manifest.wasm);
  const lines: WorkerLine[] = [];
  let bytes = 0;
  for (const c of manifest.cases) {
    requireThat(typeof c.id === "string" && c.id.length <= 128 && /^[a-z0-9._-]+$/i.test(c.id), "invalid case id");
    requireThat(c.mode === "eval" || c.mode === "check", "invalid case mode");
    requireThat(typeof c.path === "string" && isAbsolute(c.path), "case path must be absolute");
    let input: Uint8Array;
    try {
      input = await readFileBounded(dirname(c.path), c.path.split("/").pop()!, WORKER_LIMITS.inputBytes);
    } catch (error) {
      lines.push({ id: c.id, wasm: { status: "read-error", error: String(error).slice(0, 200) }, wrapper: "skipped" });
      continue;
    }
    if (input.byteLength === 0) {
      // The wasm ABI cannot carry a zero-byte input (algal_alloc(0) returns
      // null) — this is a transport admission edge, not a semantic result.
      lines.push({ id: c.id, wasm: { status: "null-input", error: "zero-byte input cannot allocate" }, wrapper: "skipped" });
      continue;
    }
    let text: string;
    try {
      text = callRaw(mod, c.mode === "eval" ? "algal_eval" : "algal_check", input);
      JSON.parse(text); // the boundary must emit parseable JSON
    } catch (error) {
      lines.push({ id: c.id, wasm: { status: "trap", error: String(error).slice(0, 512) }, wrapper: "skipped" });
      continue;
    }
    const wrapper = c.wrapper && wrapperFaithful(input)
      ? await wrapperEval(c.mode, input, new WebAssembly.Instance(mod.module, {}))
      : "skipped";
    const line = { id: c.id, wasm: { status: "ok" as const, text }, wrapper };
    bytes += JSON.stringify(line).length;
    requireThat(bytes <= WORKER_LIMITS.lineBytes, "worker output byte bound");
    lines.push(line);
  }
  return lines;
}

async function main(): Promise<void> {
  const manifestPath = process.argv[2];
  requireThat(typeof manifestPath === "string", "worker requires a manifest path");
  const lines = await runWorkerManifest(manifestPath);
  for (const line of lines) process.stdout.write(JSON.stringify(line) + "\n");
}

if (import.meta.main) await main();
