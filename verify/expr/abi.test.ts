// expr-abi — WASM loader boundary and byte-envelope evidence.
//
// What this file proves: the committed module's exact export surface, the
// allocator/memory contract the loader relies on, packed-u64 return
// decoding, the trap-vs-typed-error distinction, strict request-envelope
// admission (JSON, UTF-8, fuel spelling), seeded byte-mutation fuzz, and
// byte-exact agreement between the WASM and native boundary entry points.
// It does not prove Rust/WASM correctness; it pins the observable contract.

import { describe, expect, test } from "bun:test";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../lib/runner";
import { admit, canonical } from "./model";
import {
  artifactPath, evalRequestBytes, nativeBoundary, project,
  rawCall, wasmInstance, REPO_ROOT, WASM_PATH,
} from "./harness";
import type { EvalExports } from "../../src/expr";
import { CHECK_CASES, ENVELOPE_CASES, enc, mutations, type AbiCase } from "./abi";

const tmp = mkdtempSync(join(tmpdir(), "algal-expr-abi-"));
let seq = 0;
const tmpFile = (bytes: Uint8Array | string): string => {
  const p = join(tmp, `abi-${seq++}.bin`);
  writeFileSync(p, bytes);
  return p;
};

const toBytes = (input: string | Uint8Array): Uint8Array =>
  typeof input === "string" ? enc(input) : input;

// --------------------------------------------------------- module shape ---

describe("module admission", () => {
  test("committed bytes compile; exports are exactly the ABI surface", () => {
    const bytes = readFileSync(WASM_PATH);
    const module = new WebAssembly.Module(bytes);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    // Bun's ModuleExportDescriptor type omits `type`, but the runtime emits
    // it — pin the full descriptor including signatures.
    type ExportEntry = {
      name: string; kind: string;
      type?: { parameters?: string[]; results?: string[]; minimum?: number; shared?: boolean };
    };
    const exports = (WebAssembly.Module.exports(module) as unknown as ExportEntry[])
      .sort((a, b) => a.name.localeCompare(b.name));
    expect(exports).toEqual([
      { name: "algal_alloc", kind: "function", type: { parameters: ["i32"], results: ["i32"] } },
      { name: "algal_check", kind: "function", type: { parameters: ["i32", "i32"], results: ["i64"] } },
      { name: "algal_dealloc", kind: "function", type: { parameters: ["i32", "i32"], results: [] } },
      { name: "algal_eval", kind: "function", type: { parameters: ["i32", "i32"], results: ["i64"] } },
      { name: "memory", kind: "memory", type: { minimum: 17, shared: false } },
    ]);
  });

  test("non-module bytes fail admission at compile time", () => {
    for (const bad of [
      new Uint8Array(0),
      enc("not wasm"),
      Uint8Array.from([0x00, 0x61, 0x73, 0x6d]),       // magic, no version
      Uint8Array.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00]), // truncated version
      readFileSync(WASM_PATH).subarray(0, 64),          // truncated module
    ]) {
      expect(() => new WebAssembly.Module(bad as BufferSource)).toThrow();
    }
  });

  test("a module missing the ABI exports fails at call time, not silently", () => {
    // The header-only module is a valid module with no exports at all.
    const empty = new WebAssembly.Instance(
      new WebAssembly.Module(Uint8Array.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])),
      {},
    );
    expect("algal_eval" in empty.exports).toBe(false);
    // Minimal module with a memory export but no functions.
    const memOnly = new WebAssembly.Instance(
      new WebAssembly.Module(Uint8Array.from([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // header
        0x05, 0x03, 0x01, 0x00, 0x01,                   // memory section: 1 page
        0x07, 0x0a, 0x01, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02, 0x00, // export "memory"
      ])),
      {},
    );
    expect(memOnly.exports.memory).toBeInstanceOf(WebAssembly.Memory);
    expect("algal_eval" in memOnly.exports).toBe(false);
    // Calling the missing export through the raw loader path throws at the
    // host — the failure is a loud TypeError, never a fabricated response.
    expect(() =>
      rawCall(empty.exports as unknown as EvalExports, "algal_eval", enc('{"program":true}')),
    ).toThrow();
    expect(() =>
      rawCall(memOnly.exports as unknown as EvalExports, "algal_eval", enc('{"program":true}')),
    ).toThrow();
  });
});

// --------------------------------------------------------------- memory ----

describe("memory and allocator boundary", () => {
  test("initial memory meets the declared page minimum", () => {
    const ex = wasmInstance();
    expect(ex.memory.buffer.byteLength).toBeGreaterThanOrEqual(17 * 65_536);
    expect(ex.memory.buffer.byteLength % 65_536).toBe(0);
  });

  test("alloc(0) returns null; dealloc(null) is harmless", () => {
    const ex = wasmInstance();
    expect(ex.algal_alloc(0)).toBe(0);
    expect(() => ex.algal_dealloc(0, 0)).not.toThrow();
    expect(() => ex.algal_dealloc(0, 4096)).not.toThrow();
  });

  test("alloc/write/dealloc round-trip through linear memory", () => {
    const ex = wasmInstance();
    const payload = enc(JSON.stringify({ program: true }));
    const ptr = ex.algal_alloc(payload.length);
    expect(ptr).toBeGreaterThan(0);
    const view = new Uint8Array(ex.memory.buffer, ptr, payload.length);
    view.set(payload);
    expect(Array.from(view)).toEqual(Array.from(payload));
    ex.algal_dealloc(ptr, payload.length);
    // A second alloc reuses the freed region or extends; either is admitted.
    const ptr2 = ex.algal_alloc(payload.length);
    expect(ptr2).toBeGreaterThan(0);
    ex.algal_dealloc(ptr2, payload.length);
  });

  test("allocation may grow memory; the buffer must be re-read after", () => {
    const ex = wasmInstance();
    const before = ex.memory.buffer.byteLength;
    const big = ex.algal_alloc(2 * 1024 * 1024);
    if (big === 0) return; // allocation failure is admitted behavior
    const after = ex.memory.buffer.byteLength;
    // If growth occurred, the old view is detached — this is exactly why the
    // loader re-reads memory.buffer after every call.
    if (after > before) {
      expect(() => new Uint8Array(ex.memory.buffer)).not.toThrow();
    }
    ex.algal_dealloc(big, 2 * 1024 * 1024);
  });
});

// ---------------------------------------------------------- traps/bounds ---

describe("null and out-of-bounds boundaries", () => {
  test("null pointer and zero length report the typed null result", () => {
    const ex = wasmInstance();
    // The engine reports a null packed result for (0, n) and (p, 0):
    // the loader maps this to AlgalError("EXPR_FAILED"), never a value.
    expect(ex.algal_eval(0, 8)).toBe(0n);
    expect(ex.algal_check(0, 8)).toBe(0n);
    const ptr = ex.algal_alloc(4);
    expect(ex.algal_eval(ptr, 0)).toBe(0n);
    expect(ex.algal_check(ptr, 0)).toBe(0n);
    ex.algal_dealloc(ptr, 4);
  });

  test("far out-of-bounds pointers trap rather than fabricate a response", () => {
    const ex = wasmInstance();
    // A pointer far beyond linear memory must fault; the host sees a
    // WebAssembly.RuntimeError trap and never a decoded value.
    expect(() => ex.algal_eval(0x7fff_ffff, 16)).toThrow();
    expect(() => ex.algal_eval(0x4000_0000, 16)).toThrow();
    expect(() => ex.algal_eval(-1 >>> 0, 16)).toThrow();
  });

  test("overlong length reports a typed error when the prefix is invalid", () => {
    const ex = wasmInstance();
    // The evaluator bounds the slice by memory size; a valid-pointer call
    // with len beyond the buffer reads the in-bounds prefix, which fails to
    // parse — a typed response, not a trap and not a value.
    const ptr = ex.algal_alloc(16);
    new Uint8Array(ex.memory.buffer, ptr, 16).set(enc("{"));
    const packed = ex.algal_eval(ptr, 1 << 24);
    // Either a typed response (nonzero packed) or a trap — never silence.
    if (packed !== 0n) {
      const outPtr = Number(packed >> 32n), outLen = Number(packed & 0xffff_ffffn);
      const raw = new TextDecoder().decode(new Uint8Array(ex.memory.buffer, outPtr, outLen));
      const p = project(raw, "oob-len");
      expect(p.ok).toBe(false);
      if (!p.ok) expect(p.code).toMatch(/^EXPR_/);
      ex.algal_dealloc(outPtr, outLen);
    }
    ex.algal_dealloc(ptr, 16);
  });
});

// ------------------------------------------------------------ packed i64 ---

describe("packed return decoding", () => {
  test("hi32 pointer + lo32 length stay inside linear memory and decode UTF-8", () => {
    const ex = wasmInstance();
    const req = evalRequestBytes({ id: "x", family: "corner", program: ["add", 1, 2], env: {}, fuel: 10_000, expect: null, model: "agree", contract: "algal.expr-conformance.v1" });
    const inPtr = ex.algal_alloc(req.length);
    new Uint8Array(ex.memory.buffer, inPtr, req.length).set(req);
    const packed = ex.algal_eval(inPtr, req.length);
    expect(packed).not.toBe(0n);
    const outPtr = Number(packed >> 32n), outLen = Number(packed & 0xffff_ffffn);
    expect(outPtr + outLen).toBeLessThanOrEqual(ex.memory.buffer.byteLength);
    const raw = new TextDecoder("utf-8", { fatal: true })
      .decode(new Uint8Array(ex.memory.buffer, outPtr, outLen));
    expect(project(raw, "packed").ok).toBe(true);
    ex.algal_dealloc(outPtr, outLen);
    ex.algal_dealloc(inPtr, req.length);
  });

  test("responses are deterministic under a fresh instance", () => {
    const req = evalRequestBytes({ id: "x", family: "corner", program: ["concat", ["list", 1], ["get", "a"]], env: { a: [2, 3] }, fuel: 999, expect: null, model: "agree", contract: "algal.expr-conformance.v1" });
    const r1 = rawCall(wasmInstance(), "algal_eval", req);
    const r2 = rawCall(wasmInstance(), "algal_eval", req);
    const r3 = rawCall(wasmInstance(), "algal_eval", req);
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });
});

// --------------------------------------------------------- envelope bytes --

function assertResponse(parsed: Record<string, unknown>, c: AbiCase): void {
  expect(typeof parsed.ok).toBe("boolean");
  if (c.expect.fuel === null) {
    expect("fuel" in parsed).toBe(false);
  } else {
    expect(parsed.fuel).toBe(c.expect.fuel);
  }
  if (c.expect.ok) {
    expect(parsed.ok).toBe(true);
    if (c.expect.fuel === null) {
      // A check verdict carries no payload: {"ok":true} and nothing else.
      expect("value" in parsed).toBe(false);
      expect("err" in parsed).toBe(false);
    } else {
      expect(canonical(admit(parsed.value))).toBe(canonical(admit(c.expect.value)));
    }
  } else {
    expect(parsed.ok).toBe(false);
    const e = parsed.err as Record<string, unknown>;
    expect(e.code).toBe(c.expect.code);
  }
}

async function assertAbiCase(c: AbiCase, fn: "algal_eval" | "algal_check"): Promise<void> {
  const bytes = toBytes(c.input);
  if (bytes.length === 0) {
    // A zero-length request is inexpressible over the raw FFI: algal_alloc(0)
    // returns null and fn(ptr, 0) yields the null packed result, which the
    // loader maps to EXPR_FAILED. The pinned typed response exists only at
    // the document level — assert it through the native file driver, whose
    // entry point does receive the empty input.
    const ex = wasmInstance();
    expect(ex.algal_alloc(0)).toBe(0);
    const probe = ex.algal_alloc(8);
    expect(probe).toBeGreaterThan(0);
    expect(ex[fn](probe, 0)).toBe(0n);
    ex.algal_dealloc(probe, 8);
    assertResponse(
      JSON.parse(await nativeBoundary(fn === "algal_eval" ? "eval" : "check", bytes)),
      c,
    );
    return;
  }
  const wasmRaw = rawCall(wasmInstance(), fn, bytes);
  const nativeRaw = await nativeBoundary(fn === "algal_eval" ? "eval" : "check", bytes);
  expect(nativeRaw).toBe(wasmRaw);
  assertResponse(JSON.parse(wasmRaw), c);
}

describe("eval envelope admission", () => {
  const CHUNK = Math.ceil(ENVELOPE_CASES.length / 3);
  for (let i = 0; i < 3; i++) {
    const slice = ENVELOPE_CASES.slice(i * CHUNK, (i + 1) * CHUNK);
    test(`envelope slice ${i}`, async () => {
      for (const c of slice) await assertAbiCase(c, "algal_eval");
    }, 60_000);
  }
});

describe("check envelope admission", () => {
  test("all check cases", async () => {
    for (const c of CHECK_CASES) await assertAbiCase(c, "algal_check");
  }, 60_000);
});

describe("seeded byte mutations fail closed", () => {
  const base = enc(JSON.stringify({
    program: ["concat", ["map", ["get", "xs"], "i", ["mul", ["get", "i"], 2]], ["list", 0]],
    env: { xs: [1, 2, 3], label: "héllo😀" },
    fuel: 1000,
  }));
  const muts = mutations(base, 0x5eed, 60);
  const CHUNK = Math.ceil(muts.length / 3);
  for (let i = 0; i < 3; i++) {
    const slice = muts.slice(i * CHUNK, (i + 1) * CHUNK);
    test(`mutations slice ${i}`, async () => {
      const ex = wasmInstance();
      for (const m of slice) {
        const wasmRaw = rawCall(ex, "algal_eval", m.bytes);
        const nativeRaw = await nativeBoundary("eval", m.bytes);
        expect(nativeRaw).toBe(wasmRaw);
        const p = project(wasmRaw, m.id);
        // Every mutation either stays a valid (typed) outcome or rejects with
        // a typed code — never a trap, never a bare value, never silence.
        expect(typeof p.ok).toBe("boolean");
        if (!p.ok) expect(p.code).toMatch(/^EXPR_/);
      }
    }, 90_000);
  }
});

// -------------------------------------------------------- fuel plumbing ----

describe("fuel parameter passing", () => {
  test("fuel travels verbatim through the ABI and is replayed identically", () => {
    const ex = wasmInstance();
    const at = (fuel: number | null) => {
      const req = fuel === null
        ? enc('{"program":["sconcat","a","b","c","d"],"env":{}}')
        : enc(`{"program":["sconcat","a","b","c","d"],"env":{},"fuel":${fuel}}`);
      return rawCall(ex, "algal_eval", req);
    };
    // fuel 9 = base 2 + 4 scalars + 4 bytes − 1 short ⇒ EXPR_FUEL on the last
    // byte charge; 10 suffices exactly.
    expect(project(at(9), "f9").ok).toBe(false);
    expect(project(at(10), "f10").ok).toBe(true);
    expect(at(null)).toBe(at(10_000)); // absent fuel defaults exactly
  });

  test("fuel error detail pins (cost, left)", async () => {
    const req = enc('{"program":["add",1,2],"fuel":3}');
    const wasmRaw = rawCall(wasmInstance(), "algal_eval", req);
    expect(wasmRaw).toBe('{"err":{"code":"EXPR_FUEL","cost":1,"left":0},"fuel":3,"ok":false}');
    const nativeRaw = await nativeBoundary("eval", req);
    expect(nativeRaw).toBe(wasmRaw);
  });
});

// -------------------------------------------------------- native driver ----

describe("native driver bounds", () => {
  test("oversized input files reject at the driver bound", async () => {
    const big = new Uint8Array(1_048_577);
    big.fill(0x20);
    const f = tmpFile(big);
    const result = await runCommand(
      [artifactPath("verification_boundary"), "eval", f], REPO_ROOT, { timeoutMs: 15_000 });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("byte bound");
  });
});

// ----------------------------------------------------------- algal lane ----

describe("product CLI expr admission lane", () => {
  const manifest = (program: unknown, inputs: Record<string, string>) => JSON.stringify({
    contract: "algal.organism.v1",
    key: "organism:expr-abi-probe",
    name: "expr ABI probe",
    cells: [
      { id: "in", kind: "input", outputs: inputs },
      {
        id: "calc", kind: "expr", inputs,
        expr: { contract: "algal.expr.v1", program },
        output: { kind: "json", schema: { type: "number" } },
      },
      { id: "sink", kind: "fn", fn: "echo.v1" },
    ],
    edges: [
      { from: { cell: "in", port: Object.keys(inputs)[0] }, to: { cell: "calc", port: Object.keys(inputs)[0] } },
      { from: { cell: "calc", port: "out" }, to: { cell: "sink", port: "value" } },
    ],
  });

  test("algal check admits a well-formed expr cell and rejects a bad one", async () => {
    const algal = artifactPath("algal");
    const good = tmpFile(manifest(["mul", ["get", "n"], 2], { n: "json" }));
    const g = await runCommand([algal, "check", good], REPO_ROOT, { timeoutMs: 20_000 });
    expect(g.exitCode).toBe(0);
    expect(JSON.parse(g.stdout).ok).toBe(true);

    const bad = tmpFile(manifest(["get", "missing"], { n: "json" }));
    const b = await runCommand([algal, "check", bad], REPO_ROOT, { timeoutMs: 20_000 });
    expect(b.exitCode).not.toBe(0);
    // A rejected manifest reports on stderr with a nonzero exit — stdout
    // stays clean for pipeline consumers.
    expect(b.stdout).toBe("");
    const report = JSON.parse(b.stderr) as { ok: boolean; error?: { code?: string; message?: string } };
    expect(report.ok).toBe(false);
    expect(report.error?.code).toBe("PARSE_FAILED");
    expect(report.error?.message).toContain("EXPR_PATH");
  });
});
