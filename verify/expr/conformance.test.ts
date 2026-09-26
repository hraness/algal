// expr-conformance — the Phase 10 agreement suite.
//
// What this file proves and what it does not: every case asserts
// byte-exact agreement between the committed WASM module and the native
// verification_boundary driver, wrapper fidelity through src/expr.ts, and —
// on the modelled subset — agreement of the independent model
// (verify/expr/model.ts) on result value, fuel charge, and error code.
// Agreement on finite cases is sampled correspondence, not a proof of the
// Rust implementation; see verify/expr/SCOPE.md for the exact claims.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stableJson } from "../lib/files";
import {
  admit, canonical, checkMirror, programOps, run as modelRun,
  type MV,
} from "./model";
import {
  AUTHORED, catalog, seededCatalog, SEEDS, SEEDED_PER_SEED,
  admitCase, type Case,
} from "./catalog";
import { generate } from "./generate";
import {
  artifactPath, bindArtifacts, compareCase, evalRequestBytes, nativeBoundary,
  project, projectModel, rawCall, wasmInstance, LEAN_FIXTURES,
} from "./harness";
import { runCommand, requireSuccess } from "../lib/runner";

const REPO = join(import.meta.dir, "..", "..");

const encode = (s: string): Uint8Array => new TextEncoder().encode(s);

// ---------------------------------------------------------------- catalog --

describe("catalog integrity", () => {
  test("catalog is deterministic and nonvacuous", () => {
    const a = catalog(), b = catalog();
    expect(stableJson(a)).toBe(stableJson(b));
    expect(a.length).toBeGreaterThanOrEqual(200);
    const families = new Map<string, number>();
    for (const c of a) families.set(c.family, (families.get(c.family) ?? 0) + 1);
    for (const f of ["seeded", "corner", "boundary", "reject", "unmodeled", "gap"]) {
      expect(families.get(f) ?? 0).toBeGreaterThan(0);
    }
    // seeded generation is seeded and shaped
    expect(seededCatalog().length).toBe(SEEDS.length * SEEDED_PER_SEED);
    const seeds = new Set(SEEDS.map(s => stableJson(generate(s, 0))));
    expect(seeds.size).toBe(SEEDS.length);
  });

  test("every case admits into the domain and rejects are rejected", () => {
    for (const c of catalog()) {
      const adm = admitCase(c);
      if (c.family === "reject") {
        expect(checkMirror(adm.program, Object.keys(c.env)).ok).toBe(false);
        expect(adm.relation).toBe("wasm-native");
      }
      if ((c.family === "corner" || c.family === "boundary" || c.family === "seeded") && c.model === "agree") {
        expect(adm.relation).toBe("three-way");
      }
    }
  });

  test("op coverage: every modelled op occurs in the corpus", () => {
    const MODELLED = [
      "add", "sub", "mul", "div", "neg", "min", "max", "abs", "floor", "ceil", "round", "clamp",
      "lt", "lte", "gt", "gte", "eq", "neq", "and", "or", "not", "if", "let", "get",
      "list", "len", "nth", "concat", "map", "filter", "fold", "contains", "reverse",
      "take", "drop", "flat", "unique", "slen", "sconcat", "upper", "lower", "trim",
      "split", "join", "scontains", "starts", "ends", "has", "keys", "values", "merge",
      "isText", "isNum", "isBool", "isList", "isMap", "isNull",
    ];
    const seen = new Map<string, number>();
    for (const c of catalog()) {
      for (const op of programOps(admit(c.program))) seen.set(op, (seen.get(op) ?? 0) + 1);
    }
    const missing = MODELLED.filter(op => (seen.get(op) ?? 0) < 2);
    expect(missing).toEqual([]);
  });

  test("error-code coverage: the corpus exercises the closed error set", () => {
    const codes = new Set<string>();
    for (const c of catalog()) {
      const adm = admitCase(c);
      const out = projectModel(modelRun(adm.program, adm.env, c.fuel));
      if (!out.ok) codes.add(out.code);
      if (c.expect && !c.expect.ok) codes.add(c.expect.code!);
    }
    for (const code of ["EXPR_PARSE", "EXPR_OP", "EXPR_ARITY", "EXPR_TYPE", "EXPR_PATH",
      "EXPR_ARG", "EXPR_NUM", "EXPR_DIV_ZERO", "EXPR_BOUNDS", "EXPR_FUEL"]) {
      expect(codes.has(code)).toBe(true);
    }
  });
});

// ------------------------------------------------------- model self-check --

describe("independent-model self-consistency", () => {
  const mrun = (p: unknown, e: Record<string, unknown> = {}, f = 10_000) =>
    modelRun(admit(p), admit(e) as Map<string, MV>, f);

  test("signed zero bit patterns are preserved internally (rendered 0 on the wire)", () => {
    const r = mrun(["min", ["mul", -1, 0], 0]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.is(r.value, -0)).toBe(true);   // the fmin tie rule keeps -0
      expect(canonical(r.value)).toBe("0");        // canonical render erases the sign
    }
    const rMax = mrun(["max", ["mul", -1, 0], 0]);
    if (rMax.ok) expect(Object.is(rMax.value, -0)).toBe(false);
  });

  test("utf16 ordering, key order and canonical render helpers", () => {
    expect(mrun(["lt", "b", "😀"]).ok).toBe(true);
    const r = mrun(["keys", ["get", "m"]], { m: { "2": 1, "10": 2, a: 3, b: 4 } });
    expect(r.ok && r.value).toEqual(["2", "10", "a", "b"]);
    expect(canonical(admit({ "10": 1, "2": 2, b: 3, a: 4 }))).toBe('{"2":2,"10":1,"a":4,"b":3}');
  });

  test("scope restoration pins (the Lean witnesses)", () => {
    // let restores: env x survives the let shadowing (concat flattens its
    // list operands, so the witness lands as [1, 9]).
    const r = mrun(["concat", ["let", "x", 1, ["list", ["get", "x"]]], ["list", ["get", "x"]]], { x: 9 });
    expect(r.ok && r.value).toEqual([1, 9]);
    // map binder dies with the map; the mapped element keeps its own list.
    const r2 = mrun(["concat", ["map", ["list", 1], "x", ["list", ["get", "x"]]], ["list", ["get", "x"]]], { x: 9 });
    expect(r2.ok && r2.value).toEqual([[1], 9]);
  });

  test("fuel replay: under-budget reports the failing charge", () => {
    const program = admit(["add", 1, 2]);
    const at = modelRun(program, new Map(), 4);
    expect(at).toMatchObject({ ok: true, used: 4 });
    const under = modelRun(program, new Map(), 3);
    expect(under).toMatchObject({ ok: false, code: "fuel", used: 3 });
    const zero = modelRun(program, new Map(), 0);
    expect(zero).toMatchObject({ ok: false, code: "fuel", used: 0 });
  });

  test("the quote gap is real: model reports EXPR_OP where production returns the payload", () => {
    const r = mrun(["quote", [1, 2]]);
    expect(r).toMatchObject({ ok: false, code: "op", used: 1 });
  });
});

// ------------------------------------------------------------- agreement ---

describe("seeded corpus agreement", () => {
  const seeded = seededCatalog();
  const CHUNK = Math.ceil(seeded.length / 4);
  for (let i = 0; i < 4; i++) {
    const slice = seeded.slice(i * CHUNK, (i + 1) * CHUNK);
    test(`seeded slice ${i} (${slice.length} cases)`, async () => {
      for (const c of slice) await compareCase(c);
    }, 90_000);
  }
});

describe("authored agreement families", () => {
  const authored = AUTHORED;
  test("corner cases", async () => {
    for (const c of authored.filter(c => c.family === "corner")) await compareCase(c);
  }, 120_000);
  test("boundary cases", async () => {
    for (const c of authored.filter(c => c.family === "boundary")) await compareCase(c);
  }, 120_000);
  test("check-reject and asymmetry pins", async () => {
    for (const c of authored.filter(c => c.family === "reject")) await compareCase(c);
  }, 90_000);
  test("unmodeled ops and the quote gap", async () => {
    for (const c of authored.filter(c => c.family === "unmodeled" || c.family === "gap")) {
      await compareCase(c);
    }
  }, 90_000);
});

// ---------------------------------------------------------- fuel boundary --

describe("fuel boundary sweep", () => {
  // boundary−1 / boundary / boundary+1 around the charge the program needs,
  // on every three-way case; native joins for a fixed deterministic subset.
  const NATIVE_EVERY = 5;
  test("all agree cases at used-1/used/used+1 on wasm+model", async () => {
    let nativeCount = 0;
    for (const c of catalog()) {
      if (c.model !== "agree") continue;
      const adm = admitCase(c);
      const nominal = modelRun(adm.program, adm.env, c.fuel);
      const used = nominal.used;
      const budgets = [...new Set([used - 1, used, used + 1])].filter(b => b >= 0 && b <= 1_000_000);
      const takeNative = (nativeCount++ % NATIVE_EVERY) === 0;
      const ex = wasmInstance();
      for (const b of budgets) {
        const variant: Case = { ...c, fuel: b };
        const wasmRaw = rawCall(ex, "algal_eval", evalRequestBytes(variant));
        const wire = project(wasmRaw, `${c.id}@fuel${b}`);
        const model = projectModel(modelRun(adm.program, adm.env, b));
        if (b < used) {
          expect(wire.ok).toBe(false);
          if (!wire.ok) expect(wire.code).toBe("EXPR_FUEL");
          expect(model.ok).toBe(false);
          if (!model.ok) expect(model.code).toBe("EXPR_FUEL");
          if (!wire.ok && !model.ok) expect(model.fuel).toBe(wire.fuel);
        } else if (nominal.ok || (!nominal.ok && nominal.code !== "fuel" && nominal.used > 0)) {
          // `used` is a sufficient budget for the nominal trace, so extra
          // headroom is invisible: the response reports fuel consumed, not
          // the budget granted.
          const nominalRaw = rawCall(ex, "algal_eval", evalRequestBytes({ ...c, fuel: used }));
          expect(wasmRaw).toBe(nominalRaw); // budget headroom is invisible
        } else {
          // Nominal never produced an eval-level trace (envelope rejection
          // at used 0, or a fuel cut where `used` is the burned budget, not
          // the charge needed) — replay equivalence does not apply. The
          // standing claim is still three-way agreement at this budget.
          expect(wire.ok).toBe(model.ok);
          expect(wire.fuel).toBe(model.fuel);
          if (!wire.ok && !model.ok) expect(wire.code).toBe(model.code);
          if (wire.ok && model.ok) expect(canonical(wire.value)).toBe(canonical(model.value));
        }
        if (takeNative) {
          const nativeRaw = await nativeBoundary("eval", evalRequestBytes(variant));
          expect(nativeRaw).toBe(wasmRaw);
        }
      }
    }
    expect(nativeCount).toBeGreaterThan(0);
  }, 300_000);
});

// ------------------------------------------------- canonical codec oracle --

describe("verification_lean_vectors canonical cross-check", () => {
  test("native canonical codec matches the model renderer", async () => {
    const vec = artifactPath("verification_lean_vectors");
    const core = join(LEAN_FIXTURES, "core-vectors.json");
    const strs = join(LEAN_FIXTURES, "string-vectors.json");
    const r1 = await runCommand([vec, core], REPO, { timeoutMs: 15_000 });
    requireSuccess(r1);
    const out1 = JSON.parse(r1.stdout) as {
      contract: string;
      canonicalNumbers: (string | null)[];
      canonicalTexts: string[];
      canonicalKeys: string;
      ownMap: { key: string; present: boolean; value?: unknown }[];
    };
    expect(out1.contract).toBe("algal.lean-native-vectors.v1");
    const fixture = JSON.parse(readFileSync(core, "utf8")) as {
      binary64: { bits: string; admitted: boolean }[];
      texts: { text: string }[];
      keyIndices: { key: string }[];
    };
    // number renders: native canonical vs JS String(n) on admitted values.
    // Bits decode big-endian both ways — a typed-array buffer would smuggle
    // in host endianness and misread e.g. the negative-zero pattern.
    fixture.binary64.forEach((row, i) => {
      const view = new DataView(new ArrayBuffer(8));
      view.setBigUint64(0, BigInt(row.bits), false);
      const n = view.getFloat64(0, false);
      if (row.admitted) {
        expect(out1.canonicalNumbers[i]).toBe(String(n));
      } else {
        expect(out1.canonicalNumbers[i]).toBeNull();
      }
    });
    // text renders: native canonical escape profile vs model stringBytes
    fixture.texts.forEach((row, i) => {
      expect(out1.canonicalTexts[i]).toBe(JSON.stringify(row.text));
    });
    // canonical key order through the production canonical() API
    const keyObj = admit(Object.fromEntries(fixture.keyIndices.map(k => [k.key, null])));
    expect(out1.canonicalKeys).toBe(canonical(keyObj));
    // ownMap: duplicate-key last-wins + __proto__ + present-null semantics
    for (const row of out1.ownMap) {
      if (row.key === "x") expect(row).toMatchObject({ present: true, value: 2 });
      if (row.key === "__proto__") expect(row).toMatchObject({ present: true, value: 7 });
      if (row.key === "present-null") expect(row).toMatchObject({ present: true, value: null });
      if (row.key === "missing") expect(row).toMatchObject({ present: false });
    }

    const r2 = await runCommand([vec, strs], REPO, { timeoutMs: 15_000 });
    requireSuccess(r2);
    const out2 = JSON.parse(r2.stdout) as { strings: { text: string; bytes: number[] }[] };
    expect(out2.strings.length).toBe(56);
    for (const row of out2.strings) {
      const rendered = canonical(admit(row.text));
      expect([...encode(rendered)]).toEqual(row.bytes);
    }
  }, 30_000);
});

// --------------------------------------------------------- artifact wiring --

describe("artifact identity", () => {
  test("bound artifacts are hashed and reachable", async () => {
    const ids = await bindArtifacts();
    expect(ids.wasmBytes).toBeGreaterThan(1000);
    for (const a of [ids.boundary, ids.leanVectors, ids.algal]) {
      expect(a.sha256.length).toBe(71);
      expect(a.bytes).toBeGreaterThan(1000);
    }
  });
});
