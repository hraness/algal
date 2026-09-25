import { basename, dirname } from "node:path";
import { readFileBounded, hashBytes } from "../lib/files";
import { evalProgram, setExprExports, type EvalExports } from "../../src/expr";
import { inputBytes, LIMITS, parseCase } from "./schema";
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
export function rawEval(ex: EvalExports, input: Uint8Array): string {
  const ptr = ex.algal_alloc(input.length);
  if (!ptr) throw new Error("WASM input allocation");
  let packed: bigint;
  try {
    new Uint8Array(ex.memory.buffer, ptr, input.length).set(input);
    packed = ex.algal_eval(ptr, input.length);
  } finally { ex.algal_dealloc(ptr, input.length); }
  if (!packed) throw new Error("WASM output allocation");
  const address = Number(packed >> 32n), length = Number(packed & 0xffffffffn);
  try {
    if (length > LIMITS.outputBytes) throw new Error("WASM output bound");
    return decoder.decode(new Uint8Array(ex.memory.buffer, address, length));
  } finally { ex.algal_dealloc(address, length); }
}
if (import.meta.main) {
  const [casePath, wasmPath, mode] = process.argv.slice(2);
  if (!casePath || !wasmPath || !["both", "raw"].includes(mode ?? "") || process.argv.length !== 5) throw new Error("worker arguments");
  const bytes = await readFileBounded(dirname(casePath), basename(casePath), 65_536);
  const c = parseCase(JSON.parse(decoder.decode(bytes))), input = inputBytes(c);
  const wasm = await readFileBounded(dirname(wasmPath), basename(wasmPath), 16_777_216);
  const module = new WebAssembly.Module(new Uint8Array(wasm));
  if (WebAssembly.Module.imports(module).length !== 0) throw new Error("unexpected WASM imports");
  const instance = () => new WebAssembly.Instance(module, {}).exports as unknown as EvalExports;
  const raw = rawEval(instance(), input);
  let bun: unknown = null;
  if (mode === "both" && c.domain === "grammar") { setExprExports(instance()); bun = evalProgram(c.program, {}, 10_000); }
  console.log(JSON.stringify({ contract: "algal.corpus-worker.v1", id: c.id, inputSha256: hashBytes(input), wasmSha256: hashBytes(wasm), raw, bun }));
}
