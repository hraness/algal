import { constants } from "node:fs";
import { mkdtemp, open, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { EvalExports } from "../../src/expr";
import { hashBytes, stableJson } from "../lib/files";
import { requireSuccess, runCommand } from "../lib/runner";
import { array, digest, record, requireThat, string } from "../lib/schema";

type Vector = { name: string; mode: "eval" | "check"; bytes: Uint8Array; expected: unknown };
const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const RELATION = "sampled byte-entry-point agreement; binary/source provenance is separately gated by artifact suite";
const evalVector = (name: string, program: unknown, expected: unknown): Vector => ({
  name, mode: "eval", bytes: enc.encode(JSON.stringify({ program, env: {}, fuel: 10_000 })), expected,
});

async function artifactBytes(path: string, max: number): Promise<Uint8Array> {
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
  try {
    const metadata = await file.stat();
    requireThat(metadata.isFile() && metadata.size > 0 && metadata.size <= max, "boundary artifact type/byte bound");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(Math.min(65_536, max + 1 - total));
      const { bytesRead } = await file.read(chunk);
      if (bytesRead === 0) break;
      total += bytesRead;
      requireThat(total <= max, "boundary artifact grew past byte bound");
      chunks.push(chunk.subarray(0, bytesRead));
    }
    return Buffer.concat(chunks);
  } finally { await file.close(); }
}

function vectors(): Vector[] {
  const all: Vector[] = [];
  for (const [index, rendered] of [
    [-0, "0"], [1024, "1024"], [4294967295, "4294967295"], [4294967296, "4294967296"],
    [9007199254740992, "9007199254740992"], [18446744073709552000, "18446744073709552000"], [1e308, "1e+308"],
  ] as const) all.push(evalVector(`wide-index-${rendered}`, ["nth", ["quote", []], index], {
    ok: false, err: { code: "EXPR_PATH", op: "nth", what: `index ${rendered} out of range 0` }, fuel: 4,
  }));
  for (const input of [0.49999999999999994, 4503599627370497, -4503599627370497, -2.5, 2.5])
    all.push(evalVector(`round-${input}`, ["round", input], { ok: true, value: Math.round(input), fuel: 3 }));
  all.push(evalVector("scalar-pair", "😀", { ok: true, value: "😀", fuel: 1 }));
  all.push(evalVector("replacement-scalar", "\ufffd", { ok: true, value: "\ufffd", fuel: 1 }));
  // Identical raw bytes reach serde_json on each target; no JSON.parse or
  // nonfatal TextDecoder can normalize away the malformed input first.
  const malformed: [string, Uint8Array][] = [
    ["invalid-utf8", Uint8Array.from([...enc.encode('{"program":"'), 0xff, ...enc.encode('","env":{}}')])],
    ["truncated-utf8", Uint8Array.from([...enc.encode('{"program":"'), 0xe2, 0x82, ...enc.encode('","env":{}}')])],
    ["surrogate-utf8", Uint8Array.from([...enc.encode('{"program":"'), 0xed, 0xa0, 0x80, ...enc.encode('","env":{}}')])],
    ["bom", enc.encode('\ufeff{"program":true,"env":{}}')],
    ["lone-surrogate", enc.encode('{"program":"\\ud800","env":{}}')],
    ["overwritten-lone-surrogate", enc.encode('{"program":"\\ud800","program":true,"env":{}}')],
  ];
  for (const [name, bytes] of malformed) for (const mode of ["eval", "check"] as const)
    all.push({ name: `${name}-${mode}`, mode, bytes, expected: { code: "EXPR_PARSE" } });
  all.push({ name: "duplicate-last-wins", mode: "eval", bytes: enc.encode('{"program":false,"program":true,"env":{}}'), expected: { ok: true, value: true, fuel: 1 } });
  for (const [name, program, expected] of [
    ["check-good", ["round", 2.5], { ok: true }],
    ["check-unknown-op", ["not-an-op", true], { ok: false, err: { code: "EXPR_OP", op: "not-an-op" } }],
    ["check-unbound-name", ["get", "missing"], { ok: false, err: { code: "EXPR_PATH", op: "get", what: 'unbound name "missing"' } }],
  ] as const) all.push({ name, mode: "check", bytes: enc.encode(JSON.stringify({ program, names: [] })), expected });
  return all;
}

function rawWasm(exports: EvalExports, vector: Vector): string {
  const ptr = exports.algal_alloc(vector.bytes.length);
  requireThat(ptr !== 0, "WASM fixture allocation failed");
  let packed: bigint;
  try {
    new Uint8Array(exports.memory.buffer, ptr, vector.bytes.length).set(vector.bytes);
    packed = exports[vector.mode === "eval" ? "algal_eval" : "algal_check"](ptr, vector.bytes.length);
  } finally { exports.algal_dealloc(ptr, vector.bytes.length); }
  requireThat(packed !== 0n, "WASM result allocation failed");
  const outPtr = Number(packed >> 32n), outLen = Number(packed & 0xffff_ffffn);
  requireThat(outLen <= 1_048_576, "WASM result byte bound");
  try { return dec.decode(new Uint8Array(exports.memory.buffer, outPtr, outLen)); }
  finally { exports.algal_dealloc(outPtr, outLen); }
}

function checkExpected(vector: Vector, output: string): void {
  const parsed: unknown = JSON.parse(output);
  if (vector.expected !== null && typeof vector.expected === "object" && "code" in vector.expected) {
    const failed = parsed as { ok: boolean; err: { code: string }; fuel: number };
    requireThat(failed?.ok === false && failed.err?.code === "EXPR_PARSE" && failed.fuel === 0, `${vector.name}: malformed raw input was not rejected before evaluation`);
  } else requireThat(stableJson(parsed) === stableJson(vector.expected), `${vector.name}: independent expected value/error/fuel differs`);
}

export async function runBoundary(root: string, binary = join(root, "target/debug/examples/verification_boundary")) {
  const nativePath = await realpath(binary);
  const wasmPath = join(root, "src/algal_expr.wasm");
  const nativeMax = 67_108_864, wasmMax = 16_777_216;
  const nativeBytes = await artifactBytes(nativePath, nativeMax), wasmBytes = await artifactBytes(wasmPath, wasmMax);
  const nativeDigest = hashBytes(nativeBytes), wasmDigest = hashBytes(wasmBytes);
  const wasm = new WebAssembly.Instance(new WebAssembly.Module(wasmBytes), {}).exports as unknown as EvalExports;
  const directory = await mkdtemp(join(tmpdir(), "algal-boundary-"));
  const observations: unknown[] = [];
  try {
    for (const vector of vectors()) {
      const path = join(directory, `${vector.name}.json`);
      await writeFile(path, vector.bytes);
      const result = await runCommand([nativePath, vector.mode, path], root, { timeoutMs: 10_000, maxOutputBytes: 1_048_576 });
      requireSuccess(result);
      requireThat(result.stdout.endsWith("\n"), `${vector.name}: native driver omitted its terminal LF`);
      const native = result.stdout.slice(0, -1), wasmOutput = rawWasm(wasm, vector);
      requireThat(native === wasmOutput, `${vector.name}: native/WASM full response bytes differ`);
      checkExpected(vector, native);
      requireThat(hashBytes(await readFile(path)) === hashBytes(vector.bytes), `${vector.name}: input was rewritten`);
      observations.push({ name: vector.name, mode: vector.mode, inputSha256: hashBytes(vector.bytes), output: native });
    }
    requireThat(hashBytes(await artifactBytes(nativePath, nativeMax)) === nativeDigest && hashBytes(await artifactBytes(wasmPath, wasmMax)) === wasmDigest, "target artifact changed during comparison");
    return { contract: "algal.verification-boundary.v1", comparisons: observations.length, native: { path: nativePath, sha256: nativeDigest }, wasm: { path: "src/algal_expr.wasm", sha256: wasmDigest },
      relation: RELATION, observations };
  } finally { await rm(directory, { recursive: true, force: true }); }
}

/** The supervising process admits completion for the exact vector inventory. */
export function admitBoundarySummary(value: unknown): void {
  const summary = record(value, ["contract", "comparisons", "native", "wasm", "relation", "observations"], "boundary summary");
  requireThat(summary.contract === "algal.verification-boundary.v1", "unknown boundary summary");
  const expected = vectors();
  requireThat(summary.comparisons === expected.length, "boundary comparison count mismatch");
  for (const kind of ["native", "wasm"] as const) {
    const artifact = record(summary[kind], ["path", "sha256"], `boundary ${kind}`);
    string(artifact.path, "target artifact path", 4096); digest(artifact.sha256, "target artifact hash");
  }
  requireThat(summary.relation === RELATION, "boundary evidence relation mismatch");
  const rows = array(summary.observations, "boundary observations", expected.length, expected.length);
  for (const [index, raw] of rows.entries()) {
    const row = record(raw, ["name", "mode", "inputSha256", "output"], "boundary observation");
    const vector = expected[index]!;
    requireThat(row.name === vector.name && row.mode === vector.mode && row.inputSha256 === hashBytes(vector.bytes), "boundary vector inventory mismatch");
    checkExpected(vector, string(row.output, "boundary full output", 1_048_576));
  }
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "../..");
  console.log(JSON.stringify(await runBoundary(root, process.argv[2]), null, 2));
}
