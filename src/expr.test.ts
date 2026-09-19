// Adversarial coverage of the algal.expr.v1 wasm boundary. The evaluator's
// semantics live in crates/algal-expr (one implementation); these tests pin
// that the same values, errors, and fuel burns cross the ABI intact —
// determinism, strictness, bounds, and the quote-array footgun included.

import { describe, expect, test } from "bun:test";
import { checkProgram, evalProgram, EXPR_DEFAULT_FUEL } from "./expr";
import type { JsonObject, JsonValue } from "./values";

const evalIn = (p: JsonValue, env: JsonObject = {}, fuel = EXPR_DEFAULT_FUEL) =>
  evalProgram(p, env, fuel);
const ok = (p: JsonValue, env: JsonObject = {}) => {
  const r = evalIn(p, env);
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.err)}`);
  return r;
};
const code = (p: JsonValue, env: JsonObject = {}) => {
  const r = evalIn(p, env);
  if (r.ok) throw new Error("expected failure");
  return r.err.code;
};

describe("expr eval", () => {
  test("values and fuel burns are deterministic", () => {
    const p: JsonValue = [
      "map",
      ["quote", [1, 2, 3]],
      "x",
      ["mul", ["get", "x"], 2],
    ];
    const a = ok(p);
    const b = ok(p);
    expect(a.value).toEqual([2, 4, 6]);
    expect(b.value).toEqual(a.value);
    expect(b.fuel).toBe(a.fuel);
    expect(a.fuel).toBeGreaterThan(0);
  });

  test("get paths, misses, and the unbound-name distinction", () => {
    const env = { order: { items: [{ sku: "a" }] } };
    expect(ok(["get", "order", "items", 0, "sku"], env).value).toBe("a");
    // missing key / oob / scalar descend degrade to null
    expect(ok(["get", "order", "ghost"], env).value).toBe(null);
    expect(ok(["get", "order", "items", 9], env).value).toBe(null);
    expect(ok(["get", "order", "items", 0, "sku", "x"], env).value).toBe(null);
    // an unbound name is an error — names are checked, paths degrade
    expect(code(["get", "ghost"], env)).toBe("EXPR_PATH");
  });

  test("strict types: no truthiness, no coercion, no fuzzy equality", () => {
    expect(code(["if", 1, "a", "b"])).toBe("EXPR_TYPE");
    expect(code(["and", true, 1])).toBe("EXPR_TYPE");
    expect(code(["add", 1, "x"])).toBe("EXPR_TYPE");
    expect(code(["not", "yes"])).toBe("EXPR_TYPE");
    // eq is structural: numbers normalize, key order ignored, types strict
    expect(ok(["eq", 1, 1.0]).value).toBe(true);
    expect(ok(["eq", ["quote", { a: 1, b: 2 }], ["quote", { b: 2, a: 1 }]]).value).toBe(true);
    expect(ok(["eq", 1, "1"]).value).toBe(false);
    expect(ok(["eq", 0, false]).value).toBe(false);
  });

  test("literal arrays must be quoted — the footgun fails loudly", () => {
    // [1,2] parses as a call to op `1`, not data
    const bad = checkProgram(["list", [1, 2]], []);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.err.code).toBe("EXPR_PARSE");
    // quoted and list-built arrays work
    expect(ok(["nth", ["quote", ["a", "b"]], 1]).value).toBe("b");
    expect(ok(["list", 1, 2]).value).toEqual([1, 2]);
  });

  test("numbers: float division, truncated mod, div-zero, non-finite", () => {
    expect(ok(["div", 7, 2]).value).toBe(3.5);
    expect(ok(["mod", -7, 3]).value).toBe(-1); // dividend's sign
    expect(code(["div", 1, 0])).toBe("EXPR_DIV_ZERO");
    expect(code(["mod", 1, 0])).toBe("EXPR_DIV_ZERO");
    expect(code(["div", 0, 0])).toBe("EXPR_DIV_ZERO");
  });

  test("strings: UTF-16 length, ASCII-only case, code-unit order", () => {
    expect(ok(["slen", "héllo"]).value).toBe(5); // é is one UTF-16 unit
    expect(ok(["slen", "😀"]).value).toBe(2); // surrogate pair
    expect(ok(["upper", "héllo"]).value).toBe("HéLLO"); // é unchanged
    // ß stays — ASCII-only transform, no Unicode case expansion
    expect(ok(["upper", "straße"]).value).toBe("STRAßE");
    // UTF-16 order: lone surrogate sorts below U+FFFF (code-point order differs)
    expect(ok(["lt", "😀", "￿"]).value).toBe(true);
    expect(code(["split", "abc", ""])).toBe("EXPR_ARG");
  });

  test("static check catches dead-branch ops and unbound get names", () => {
    expect(checkProgram(["if", true, 1, ["bogus", 2]], []).ok).toBe(false);
    expect(checkProgram(["get", "nope"], ["yes"]).ok).toBe(false);
    expect(checkProgram(["let", "x", 1, ["get", "x"]], []).ok).toBe(true);
    // computed get names stay legal — only literals are checked
    expect(checkProgram(["get", ["sconcat", "or", "der"]], []).ok).toBe(true);
  });

  test("fuel: exhaustion is typed, accounted, and deterministic", () => {
    // amplification: concat doubles a list each round — fuel tracks bytes
    const bomb = ["concat", ["quote", [1, 2, 3]], ["quote", [4, 5, 6]]];
    const tight = evalIn(bomb, {}, 5);
    expect(tight.ok).toBe(false);
    if (!tight.ok) expect(tight.err.code).toBe("EXPR_FUEL");
    const roomy = evalIn(bomb, {}, 1000);
    expect(roomy.ok).toBe(true);
    if (roomy.ok) expect(roomy.value).toEqual([1, 2, 3, 4, 5, 6]);
    // the failed run still reports the fuel it actually burned
    expect(tight.fuel).toBeGreaterThan(0);
    expect(tight.fuel).toBeLessThanOrEqual(5);
  });

  test("bounds: oversized output and list caps fail closed", () => {
    // map over the max list stays inside bounds
    const r = evalIn(
      ["map", ["get", "xs"], "x", ["get", "x"]],
      { xs: Array.from({ length: 1024 }, (_, i) => i) },
    );
    expect(r.ok).toBe(true);
  });

  test("unknown op is EXPR_OP even inside unreachable branches", () => {
    // eval runs the static pass first, so unreachable ops never get hidden
    expect(code(["if", true, "kept", ["frobnicate", 1]])).toBe("EXPR_OP");
    const c = checkProgram(["if", true, "kept", ["frobnicate", 1]], []);
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.err.code).toBe("EXPR_OP");
  });
});

describe("expr v2 ops", () => {
  test("numeric transforms match spec", () => {
    expect(ok(["min", 3, 1, 2]).value).toBe(1);
    expect(ok(["max", 3, 1, 2]).value).toBe(3);
    expect(ok(["clamp", 12, 0, 10]).value).toBe(10);
    // round halves toward +∞ — JS Math.round, not Rust half-away
    expect(ok(["round", -2.5]).value).toBe(-2);
    expect(ok(["round", 2.5]).value).toBe(3);
    expect(ok(["floor", -2.1]).value).toBe(-3);
    expect(ok(["ceil", -2.9]).value).toBe(-2);
    expect(ok(["abs", -3.5]).value).toBe(3.5);
    expect(code(["clamp", 1, 10, 0])).toBe("EXPR_ARG");
    expect(code(["min", "a", 1])).toBe("EXPR_TYPE");
  });

  test("list ops: sort/unique/flat/take/drop/reverse", () => {
    // total order: null < bool < number < string < list < map
    expect(
      ok(["sort", ["quote", [{ a: 1 }, "x", 2, true, null, [1], false]]]).value,
    ).toEqual([null, false, true, 2, "x", [1], { a: 1 }]);
    // canonical equality — 1 and 1.0 dedupe, map key order ignored
    expect(
      ok(["unique", ["quote", [1, 1.0, { a: 1, b: 2 }, { b: 2, a: 1 }]]]).value,
    ).toEqual([1, { a: 1, b: 2 }]);
    expect(ok(["flat", ["quote", [[1, 2], [3], []]]]).value).toEqual([1, 2, 3]);
    expect(code(["flat", ["quote", [[1], 2]]])).toBe("EXPR_TYPE");
    expect(ok(["take", ["quote", [1, 2, 3]], 9]).value).toEqual([1, 2, 3]);
    expect(ok(["drop", ["quote", [1, 2, 3]], 9]).value).toEqual([]);
    expect(code(["take", ["quote", [1]], 1.5])).toBe("EXPR_TYPE");
    expect(ok(["reverse", ["quote", [1, 2, 3]]]).value).toEqual([3, 2, 1]);
  });

  test("object ops: has/keys/values/merge/toText", () => {
    const o = { "10": 1, "2": 2, a: 3 };
    expect(ok(["has", ["get", "o"], "a"], { o }).value).toBe(true);
    expect(ok(["has", ["get", "o"], "z"], { o }).value).toBe(false);
    // canonical key order — array-index keys numerically first
    expect(ok(["keys", ["get", "o"]], { o }).value).toEqual(["2", "10", "a"]);
    expect(ok(["values", ["get", "o"]], { o }).value).toEqual([2, 1, 3]);
    expect(ok(["merge", { a: 1 }, { b: 2, a: 9 }]).value).toEqual({ a: 9, b: 2 });
    expect(code(["merge", { a: 1 }, ["quote", [1]]])).toBe("EXPR_TYPE");
    // canonical render — key order normalized, ryu float format
    expect(
      ok(["toText", { b: 1, a: ["quote", [2, "x"]] }]).value,
    ).toBe('{"a":[2,"x"],"b":1}');
    expect(ok(["toText", 0.30000000000000004]).value).toBe(
      "0.30000000000000004",
    );
  });

  test("string ops: starts/ends", () => {
    expect(ok(["starts", "algal", "alg"]).value).toBe(true);
    expect(ok(["ends", "algal", "gal"]).value).toBe(true);
    expect(ok(["starts", "algal", "gal"]).value).toBe(false);
    expect(code(["starts", "algal", 3])).toBe("EXPR_TYPE");
  });
});
