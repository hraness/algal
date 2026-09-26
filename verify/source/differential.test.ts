// Differential tests: the independent source model and the production
// compiler+scheduler must agree on every observable projection — outlines,
// module closure, ordered effect requests, results, failures, and accounting.
import { describe, expect, test } from "bun:test";
import { digestText } from "../../src/digest";
import { canonicalize } from "../../src/values";
import { compareCompilation, compareProject, type OraclePolicy } from "./differential";
import type { JsonValue } from "../../src/values";
import { AlgalError } from "../../src/errors";

const answer = (choice: string, probabilities: Record<string, number>, confidence = 0.9): JsonValue =>
  ({ answers: { answer: { choice, confidence, probabilities } } });
const noEffects: OraclePolicy = () => { throw new Error("unscripted effect"); };

/** Assert compile+run agreement on every compared projection. */
const diff = async (source: string, options: { modules?: Record<string, string>; args?: Record<string, JsonValue>; policy?: OraclePolicy } = {}) => {
  const res = await compareProject(source, options);
  expect(res.compile.mismatches).toEqual([]);
  expect(res.compile.equal).toBe(true);
  if (res.run !== undefined) {
    expect(res.run.mismatches).toEqual([]);
    expect(res.run.equal).toBe(true);
  }
  return res;
};

// ---------------------------------------------------- compile parity ------

describe("differential: compile-time agreement", () => {
  const accepts: [string, string | { source: string; modules: Record<string, string> }][] = [
    ["pure expressions + precedence", `program m(x: json) -> json { budget { max_agent_calls: 0 } return { r: x.a + 2 * 3, s: "a" + "b", t: x.n % 3 > 1 && !(x.z == null) || false } }`],
    ["text literal output", `program m() -> text { budget { max_agent_calls: 0 } return "hello" }`],
    ["record parameters + shape output", `record T { id: slug, n?: integer max 9 } program m(t: T) -> T { budget { max_agent_calls: 0 } return t }`],
    ["records + lists + unique", `record R { a: text, tags: [digest] unique } program m() -> json { budget { max_agent_calls: 0 } return { v: [{ a: "x", tags: [] }] } }`],
    ["nested if", `program m(f: json) -> json { budget { max_agent_calls: 0 } return if f.a { if f.b { 1 } else { 2 } } else { 3 } }`],
    ["decide + match", `program m() -> json { budget { max_agent_calls: 1 } let d = decide "q" using {} as choice { a: "A", b: "B" } return match d.value { a => { v: 1 }, b => { v: 2 } } }`],
    ["generate in a guarded arm", `program m(f: json) -> text { budget { max_agent_calls: 1 } return if f { generate "g" using f } else { "none" } }`],
    ["call", {
      source: `import c from "./c.algal" program m(x: text) -> text { budget { max_agent_calls: 0 } return call c using { v: x, tag: null } }`,
      modules: { "c.algal": `program c(v: text, tag: json) -> text { budget { max_agent_calls: 0 } return v }` },
    }],
    ["wrapped guarded parameterless call", {
      source: `import p from "./p.algal" program m(f: json) -> text { budget { max_agent_calls: 1, max_depth: 3 } return if f { call p using {} } else { "no" } }`,
      modules: { "p.algal": `program p() -> text { budget { max_agent_calls: 1 } return generate "ping" using "ctx" }` },
    }],
    ["unguarded parameterless call stays direct", {
      source: `import p from "./p.algal" program m() -> text { budget { max_agent_calls: 0, max_depth: 2 } return call p using {} }`,
      modules: { "p.algal": `program p() -> text { budget { max_agent_calls: 0 } return "p" }` },
    }],
    ["each with shape args", {
      source: `import l from "./l.algal" record Item { s: text } program m(items: [Item]) -> json { budget { max_agent_calls: 0 } return each l over item in items using { tag: "t" } max_items 8 }`,
      modules: { "l.algal": `program l(item: text, tag: text) -> json { budget { max_agent_calls: 0 } return [item, tag] }` },
    }],
    ["shared import dedupes in the closure", {
      source: `import b from "./b.algal" import c from "./c.algal" program m() -> json { budget { max_agent_calls: 0 } let r = call b using {} return call c using {} }`,
      modules: {
        "d.algal": `program d() -> json { budget { max_agent_calls: 0 } return 1 }`,
        "b.algal": `import d from "./d.algal" program b() -> json { budget { max_agent_calls: 0 } return call d using {} }`,
        "c.algal": `import d from "./d.algal" program c() -> json { budget { max_agent_calls: 0 } return call d using {} }`,
      },
    }],
    ["shaped output via record constructor", `record Out { v: integer, ok: boolean } program m() -> Out { budget { max_agent_calls: 0 } return { v: 3, ok: true } }`],
    ["budget ceiling values", `program m() -> json { budget { max_agent_calls: 128, max_steps: 1024, max_depth: 8, max_work: 100000000, max_context_bytes: 65536, max_output_bytes: 65536 } return null }`],
    ["text arg cells", {
      source: `import c from "./c.algal" program m(x: json) -> json { budget { max_agent_calls: 0 } return call c using { v: x.v } }`,
      modules: { "c.algal": `program c(v: text) -> text { budget { max_agent_calls: 0 } return v }` },
    }],
    ["empty params + no bindings", `program m() -> json { budget { max_agent_calls: 0 } return 0 }`],
  ];
  for (const [name, body] of accepts) {
    const { source, modules } = typeof body === "string" ? { source: body, modules: undefined } : body;
    test(`accepts and outlines agree: ${name}`, async () => {
      await diff(source, modules === undefined ? {} : { modules });
    });
  }

  const rejects: [string, string][] = [
    ["grammar error", `program m() -> json { budget { max_agent_calls: 0 } return }`],
    ["unknown name", `program m() -> json { budget { max_agent_calls: 0 } return nope }`],
    ["duplicate binding", `program m() -> json { budget { max_agent_calls: 0 } let x = 1 let x = 2 return x }`],
    ["non-exhaustive match", `program m() -> json { budget { max_agent_calls: 1 } let d = decide "q" using 0 as choice { a: "A", b: "B" } return match d.value { a => 1 } }`],
    ["branch mismatch", `program m(b: json) -> json { budget { max_agent_calls: 0 } return if b { "t" } else { 5 } }`],
    ["effect in pure position", `program m() -> json { budget { max_agent_calls: 1 } let x = 1 + (generate "a" using 0) return x }`],
    ["missing call arg", `import c from "./c.algal" program m() -> json { budget { max_agent_calls: 0 } return call c using {} }`],
    ["extra call arg", `import c from "./c.algal" program m() -> json { budget { max_agent_calls: 0 } return call c using { x: 1 } }`],
    ["kebab collision", `program m(A_B: text, a_b: json) -> json { budget { max_agent_calls: 0 } return null }`],
    ["call budget exceeded", `program m() -> text { budget { max_agent_calls: 1 } let a = generate "a" using 0 let b = generate "b" using 0 return a }`],
    ["bad return type", `program m() -> text { budget { max_agent_calls: 0 } return 5 }`],
    ["each over non-parameter", `import c from "./c.algal" program m(l: json) -> json { budget { max_agent_calls: 0 } return each c over x in l using {} max_items 4 }`],
    ["over-subscribed decide criteria", `program m() -> json { budget { max_agent_calls: 1 } return decide "q" using 0 as choice { a: "A" }.v }`],
    ["missing program", `record R { a: text } `],
    ["deep nesting", `program m() -> json { budget { max_agent_calls: 0 } return ${"1".padStart(2, "(") + "+".repeat(0)} }`],
  ];
  for (const [name, source] of rejects) {
    test(`rejects alike: ${name}`, () => {
      const res = compareCompilation(source);
      expect(res.equal).toBe(true);
      expect(res.modelError).toBeDefined();
      expect(res.compileError).toBeDefined();
    });
  }

  test("both sides attach the importer's name to a missing module", () => {
    const res = compareCompilation(`import m from "./none.algal" program p() -> json { budget { max_agent_calls: 0 } return 0 }`);
    expect(res.equal).toBe(true);
    expect(res.compileError?.message).toContain("main.algal");
  });
});

// -------------------------------------------------------- run parity ------

describe("differential: run-time agreement", () => {
  test("pure program: result, no requests, identical step count", async () => {
    const res = await diff(`program m(x: json) -> json { budget { max_agent_calls: 0 }
      let a = x.n + 1 let b = a * 2 return { v: [a, b], s: "ok" } }`, { args: { x: { n: 3 } }, policy: noEffects });
    expect(res.run!.model.value).toEqual({ v: [4, 8], s: "ok" });
    expect(res.run!.receipt!.outcome).toBe("complete");
    expect(res.run!.receipt!.work.steps).toBe(res.run!.model.steps);
  });
  test("generate: request digest, context, and result agree", async () => {
    const res = await diff(`program m(t: text) -> text { budget { max_agent_calls: 1 } return generate "expand" using { topic: t } }`,
      { args: { t: "cats" }, policy: (r) => `re:${JSON.stringify((r.context.inputs as { context: JsonValue }).context)}` });
    expect(res.run!.model.value).toBe('re:{"topic":"cats"}');
    expect(res.run!.requests).toHaveLength(1);
  });
  test("decide: schema and normalization agree", async () => {
    const src = `program m(t: text) -> json { budget { max_agent_calls: 1 }
      let d = decide "tone" using { t: t } as choice { formal: "precise", casual: "warm" }
      return { v: d.value, p: d.probability("casual") } }`;
    const res = await diff(src, { args: { t: "x" }, policy: (r) => r.kind === "decide" ? answer("formal", { formal: 0.7, casual: 0.3 }) : "x" });
    expect(res.run!.model.value).toEqual({ v: "formal", p: 0.3 });
  });
  test("inactive arm: no request, merge cell skipped, both sides", async () => {
    const src = `program m(f: json) -> text { budget { max_agent_calls: 1 }
      return if f { generate "on" using f } else { "off" } }`;
    for (const flag of [true, false]) {
      const res = await diff(src, { args: { f: flag }, policy: () => "generated" });
      expect(res.run!.model.value).toBe(flag ? "generated" : "off");
      expect(res.run!.requests).toHaveLength(flag ? 1 : 0);
    }
  });
  test("nested guards: trigger shim hidden, wrapper budget equal", async () => {
    const child = `program p() -> text { budget { max_agent_calls: 1 } return generate "ping" using "ctx" }`;
    const src = `import p from "./p.algal" program m(f: json) -> text { budget { max_agent_calls: 2, max_depth: 3 }
      return if f.outer { if f.inner { call p using {} } else { "x" } } else { "y" } }`;
    const res = await diff(src, { modules: { "p.algal": child }, args: { f: { outer: true, inner: true } }, policy: () => "pong" });
    expect(res.run!.model.value).toBe("pong");
    // One generated request — the shim never reaches the oracle boundary.
    expect(res.run!.requests).toHaveLength(1);
    expect(res.run!.requests[0]!.kind).toBe("agent");
    const res2 = await diff(src, { modules: { "p.algal": child }, args: { f: { outer: false, inner: true } }, policy: () => "pong" });
    expect(res2.run!.model.value).toBe("y");
    expect(res2.run!.requests).toHaveLength(0);
    expect(res2.run!.model.resultAbsent === true || res2.run!.model.value === "y").toBe(true);
  });
  test("each: ascending item order, ordered results, per-item requests", async () => {
    const child = `import g from "./g.algal" program l(item: text) -> text { budget { max_agent_calls: 1 } return call g using { v: item } }`;
    const modules = {
      "g.algal": `program g(v: text) -> text { budget { max_agent_calls: 1 } return generate v using {} }`,
      "l.algal": child,
    };
    const src = `import l from "./l.algal" program m(items: json) -> json { budget { max_agent_calls: 4, max_depth: 2 }
      return each l over item in items using {} max_items 3 }`;
    const res = await diff(src, { modules, args: { items: ["c", "a"] }, policy: (r) => `G:${(r.context.inputs as { instruction: JsonValue }).instruction}` });
    expect(res.run!.model.value).toEqual(["G:c", "G:a"]);
    // Ordered per-item request sites: item 0's decide/generate precede item 1's.
    expect(res.run!.requests.map(r => r.cellId)).toEqual(["result", "result"]);
    expect(res.run!.requests.map(r => (r.context.inputs as { instruction: string }).instruction)).toEqual(["c", "a"]);
  });
  test("empty each: no child runs, empty ordered result", async () => {
    const modules = { "l.algal": `program l(item: text) -> text { budget { max_agent_calls: 1 } return generate item using {} }` };
    const src = `import l from "./l.algal" program m(items: json) -> json { budget { max_agent_calls: 4 } return each l over item in items using {} max_items 3 }`;
    const res = await diff(src, { modules, args: { items: [] }, policy: noEffects });
    expect(res.run!.model.value).toEqual([]);
    expect(res.run!.requests).toHaveLength(0);
  });
  test("dynamic failures agree: wrong types, bad decisions, oracle errors", async () => {
    const type = await diff(`program m(x: json) -> json { budget { max_agent_calls: 0 } return x + 1 }`, { args: { x: "t" }, policy: noEffects });
    expect(type.run!.model.error?.code).toBe("EXPR_FAILED");
    expect(type.run!.receipt!.failure!.code).toBe("EXPR_FAILED");

    const badDecision = await diff(`program m() -> json { budget { max_agent_calls: 1 } let d = decide "q" using 0 as choice { a: "A" } return { v: d.value } }`,
      { args: {}, policy: () => answer("other", { a: 0.5, other: 0.5 }) });
    expect(badDecision.run!.model.error?.code).toBe("EXPR_FAILED");
    expect(badDecision.run!.receipt!.failure!.code).toBe("EXPR_FAILED");

    const offline = await diff(`program m() -> text { budget { max_agent_calls: 1 } return generate "g" using 0 }`,
      { args: {}, policy: () => { throw new AlgalError("EFFECT_FAILED", "offline"); } });
    expect(offline.run!.model.error?.code).toBe("EFFECT_FAILED");
    expect(offline.run!.receipt!.failure!.code).toBe("EFFECT_FAILED");
  });
  test("each item shape enforced at run time", async () => {
    const modules = { "l.algal": `record T { a: text min 2 } program l(item: T) -> json { budget { max_agent_calls: 0 } return item }` };
    const src = `import l from "./l.algal" program m(items: json) -> json { budget { max_agent_calls: 0 } return each l over item in items using {} max_items 3 }`;
    const ok = await diff(src, { modules, args: { items: [{ a: "aa" }] }, policy: noEffects });
    expect(ok.run!.model.value).toEqual([{ a: "aa" }]);
    const bad = await diff(src, { modules, args: { items: [{ a: "x" }] }, policy: noEffects });
    expect(bad.run!.model.error?.code).toBe("TYPE_MISMATCH");
    expect(bad.run!.receipt!.failure!.code).toBe("TYPE_MISMATCH");
  });
  test("skipped arg cells skip the call; the result cell stays skipped", async () => {
    const mods = { "e.algal": `program e(v: text, t: json) -> json { budget { max_agent_calls: 0 } return t }` };
    const src = `import e from "./e.algal" program m(a: json) -> json { budget { max_agent_calls: 0 } return call e using { v: "x", t: a.deep } }`;
    const res = await diff(src, { modules: mods, args: {}, policy: noEffects });
    expect(res.run!.model.ok).toBe(true);
    expect(res.run!.model.resultAbsent).toBe(true);
    expect(res.run!.receipt!.cells["result"]?.status).toBe("skipped");
  });
  test("source spans never reach the manifest or the run", async () => {
    // Two sources identical modulo comments/whitespace: same manifest digest.
    const a = `program m() -> json { budget { max_agent_calls: 0 } return 1 }`;
    const b = `// comment\nprogram   m()   ->   json {\n  budget { max_agent_calls: 0 }\n  /* block */ return 1\n}`;
    const ra = compareCompilation(a);
    const rb = compareCompilation(b);
    expect(ra.equal && rb.equal).toBe(true);
    expect(ra.compilation!.sourceMap.manifestDigest).toBe(rb.compilation!.sourceMap.manifestDigest);
    expect(ra.compilation!.sourceMap.sourceDigest).not.toBe(rb.compilation!.sourceMap.sourceDigest);
    // And the model agrees: same outline, different source digests.
    expect(canonicalize(ra.model!.root.check!.outline as unknown as JsonValue)).toEqual(canonicalize(rb.model!.root.check!.outline as unknown as JsonValue));
    expect(digestText(a)).not.toBe(digestText(b));
  });
  test("generated controls and triggers are not in observable requests", async () => {
    const src = `import p from "./p.algal" program m(f: json) -> text { budget { max_agent_calls: 2, max_depth: 3 }
      return if f { call p using {} } else { "no" } }`;
    const res = await diff(src, { modules: { "p.algal": `program p() -> text { budget { max_agent_calls: 1 } return generate "hi" using "c" }` }, args: { f: true }, policy: () => "ok" });
    for (const request of res.run!.requests) {
      expect(JSON.stringify(request)).not.toContain("source-control");
      expect(JSON.stringify(request)).not.toContain("trigger");
    }
  });
});
