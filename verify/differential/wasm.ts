/**
 * verify/differential/wasm.ts — committed-WASM boundary access. Fresh
 * instance per call: a trap in one case cannot poison the next. Used
 * in-process by tests and by the supervised batch worker (worker.ts).
 *
 * ABI (crates/algal-expr wasm32 exports):
 *   algal_alloc(len)->ptr, algal_dealloc(ptr,len),
 *   algal_eval(ptr,len)->u64 packed outPtr<<32|outLen   (raw {program,env,fuel} envelope)
 *   algal_check(ptr,len)->u64 same packing             (raw {program,names} envelope)
 */

import { requireThat } from "../lib/schema";
import { hashBytes } from "../lib/files";
import { readFile } from "node:fs/promises";

export type WasmExports = {
  memory: WebAssembly.Memory;
  algal_alloc(len: number): number;
  algal_dealloc(ptr: number, len: number): void;
  algal_eval(ptr: number, len: number): bigint;
  algal_check(ptr: number, len: number): bigint;
};

export type WasmModule = { module: WebAssembly.Module; sha256: string };

export async function loadWasmModule(path: string): Promise<WasmModule> {
  const bytes = new Uint8Array(await readFile(path));
  requireThat(bytes.byteLength > 0 && bytes.byteLength <= 8_388_608, "wasm artifact byte bound");
  const module = new WebAssembly.Module(bytes.slice().buffer);
  requireThat(WebAssembly.Module.imports(module).length === 0, "unexpected WASM imports");
  const names = WebAssembly.Module.exports(module).map(e => e.name).sort();
  requireThat(JSON.stringify(names) === JSON.stringify(["algal_alloc", "algal_check", "algal_dealloc", "algal_eval", "memory"]), "unexpected WASM export surface");
  return { module, sha256: hashBytes(bytes) };
}

const dec = new TextDecoder("utf-8", { fatal: true });

/** Calls one boundary entry point on a fresh instance. Throws on trap or a
 * malformed return — a trap is a finding, never silently retried. */
export function callRaw(mod: WasmModule, fn: "algal_eval" | "algal_check", input: Uint8Array): string {
  const ex = new WebAssembly.Instance(mod.module, {}).exports as unknown as WasmExports;
  const inPtr = ex.algal_alloc(input.byteLength) >>> 0;
  requireThat(inPtr !== 0, "wasm allocator returned null");
  try {
    new Uint8Array(ex.memory.buffer, inPtr, input.byteLength).set(input);
    const packed = ex[fn](inPtr, input.byteLength);
    const outPtr = Number(packed >> 32n), outLen = Number(packed & 0xffff_ffffn);
    requireThat(outPtr !== 0 && outLen > 0 && outLen <= 1_048_576, "wasm returned a null or unbounded buffer");
    const text = dec.decode(new Uint8Array(ex.memory.buffer, outPtr, outLen));
    ex.algal_dealloc(outPtr, outLen);
    return text;
  } finally {
    ex.algal_dealloc(inPtr, input.byteLength);
  }
}
