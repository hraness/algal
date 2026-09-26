// Reference tests for the independent source semantics — these exercise the
// model directly (no production compiler or runtime involvement). Cases here
// pin the meaning the differential harness then cross-checks against
// generated manifests: scope, branches, short-circuiting, ordered effects,
// exact arguments, and bounded accounting.
import { describe, expect, test } from "bun:test";
import { parseModule } from "./parse";
import { loadProject, runProgram } from "./interp";
import { SrcError, type SourceObservation, type SourceOracle } from "./model";
import type { JsonValue } from "../../src/values";

const load = (source: string, modules?: Record<string, string>) => loadProject(source, modules === undefined ? {} : { modules });
/** Assert `fn` rejects with a SrcError whose message matches. */
const reject = (fn: () => unknown, re: RegExp | string, phase?: SrcError["phase"]): SrcError => {
  try { fn(); } catch (error) {
    expect(error).toBeInstanceOf(SrcError);
    const err = error as SrcError;
    const pattern = typeof re === "string" ? new RegExp(re.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) : re;
    if (!pattern.test(err.message)) throw new Error(`expected rejection matching ${pattern}, got "${err.message}" (${err.phase})`);
    if (phase !== undefined) expect(err.phase).toBe(phase);
    return err;
  }
  throw new Error("expected a rejection, but the input was accepted");
};
const oracle = (handlers: Partial<SourceOracle> = {}): SourceOracle => ({
  decide: handlers.decide ?? (() => { throw new SrcError("eval", "EFFECT_FAILED", "unscripted decide"); }),
  generate: handlers.generate ?? (() => { throw new SrcError("eval", "EFFECT_FAILED", "unscripted generate"); }),
});
const run = (source: string, args: Record<string, JsonValue> = {}, orc = oracle(), modules?: Record<string, string>) => {
  const project = load(source, modules);
  return runProgram(project, project.root, args, orc);
};
/** A decision answer the generated decision-check cell would normalize. */
const answer = (choice: string, probabilities: Record<string, number>, confidence = 0.9): JsonValue =>
  ({ answers: { answer: { choice, confidence, probabilities } } });

// ------------------------------------------------------------- parse ------

describe("parse: accept", () => {
  test("the full expression surface", () => {
    const { program } = parseModule(`import child from "./parts/child.algal"
      record Task { id: text min 1 max 40, done: boolean?, tags: [slug] unique, n: integer min 0 max 9 }
      program main(a: text, b: [Task], c: json) -> Task {
        budget { max_agent_calls: 0, max_depth: 4 }
        let x = -(1 * 2) + 3 % 2 // comment
        let y = if x > 1 && !(x == 3) { a } else { "z" }
        return { "id": "t1", "done": c.flag == true, tags: [], "n": 4 }
      }`);
    expect(program.name).toBe("main");
    expect(program.parameters.map(p => p.name)).toEqual(["a", "b", "c"]);
    expect(program.budgets.maxDepth).toBe(4);
  });
  test("field types: formats, allowed values, bounds, nested lists", () => {
    parseModule(`record R { a: digest, b: number min -10 max 10, c: integer in [1, 2], d: boolean, e: json, f: [digest] unique, g: text in ["x", "y"], h: uri }
      program m() -> json { budget { max_agent_calls: 0 } return null }`);
  });
  test("a parameterless program parses", () => {
    expect(parseModule(`program p() -> json { budget { max_agent_calls: 0 } return 0 }`).program.parameters).toEqual([]);
  });
  test("both comment forms", () => {
    parseModule(`// line\n/* block */ program m() -> json { budget { max_agent_calls: 0 } /* x */ return 1 }`);
  });
});

describe("parse: reject", () => {
  const bad = (src: string, re: RegExp | string) => reject(() => parseModule(src), re, "parse");
  test("reserved words cannot be names", () => {
    bad(`program program() -> json { budget { max_agent_calls: 0 } return 0 }`, "non-reserved");
    bad(`program let() -> json { budget { max_agent_calls: 0 } return 0 }`, "non-reserved");
  });
  test("unterminated strings and bad characters", () => {
    bad(`program m() -> json { budget { max_agent_calls: 0 } return "abc }`, "unterminated");
    bad(`program m() -> json { budget { max_agent_calls: 0 } return $ }`, "unsupported character");
  });
  test("duplicate structure members", () => {
    bad(`record R { x: text, x: text } program m() -> json { budget { max_agent_calls: 0 } return null }`, "duplicate field");
    bad(`import a from "./x.algal" import a from "./y.algal" program m() -> json { budget { max_agent_calls: 0 } return null }`, "duplicate import alias");
  });
  test("match arm commas are required", () => {
    bad(`program m(c: json) -> json { budget { max_agent_calls: 0 } return match c { a => 1 b => 2 } }`, "expected");
  });
  test("bounds: max_items range, budgets need max_agent_calls", () => {
    bad(`import c from "./c.algal" program m() -> json { budget { max_agent_calls: 0 } return each c over x in [] using {} max_items 0 }`, "max_items");
    bad(`import c from "./c.algal" program m() -> json { budget { max_agent_calls: 0 } return each c over x in [] using {} max_items 65 }`, "max_items");
    bad(`program m() -> json { budget { max_steps: 1 } return null }`, "max_agent_calls");
  });
  test("field type modifiers are exact", () => {
    // `text` takes `in` or `min`/`max`, never a format suffix — formats are
    // standalone field types.
    bad(`record R { a: text format slug } program m() -> json { budget { max_agent_calls: 0 } return null }`, "expected");
    bad(`record R { a: text min 5 max 2 } program m() -> json { budget { max_agent_calls: 0 } return null }`, "exceeds");
    bad(`record R { a: text in ["x", "x"] } program m() -> json { budget { max_agent_calls: 0 } return null }`, "duplicate allowed value");
    bad(`record R { a: integer in [1.5] } program m() -> json { budget { max_agent_calls: 0 } return null }`, "whole numbers");
  });
});

describe("load: project closure and path rules", () => {
  const child = `program c() -> json { budget { max_agent_calls: 0 } return 1 }`;
  test("import path validation is exact", () => {
    const base = `program m() -> json { budget { max_agent_calls: 0 } return null }`;
    for (const path of ["/tmp/x.algal", "https://x/a.algal", "a.algal", "./a.json", "../outside.algal", "./a\\b.algal", "./a\nb.algal", "./a//b.algal"]) {
      reject(() => load(`import c from ${JSON.stringify(path)} ${base}`, { "child.algal": child }), /path|import|project-relative/i);
    }
    expect(() => load(`import c from "./child.algal" ${base}`, { "child.algal": child })).not.toThrow();
  });
  test("a missing module is a load failure naming the importer", () => {
    const err = reject(() => load(`import m from "./none.algal" program p() -> json { budget { max_agent_calls: 0 } return 0 }`), "not supplied", "load");
    expect(err.message).toContain("main.algal");
  });
  test("non-string module text and invalid keys reject", () => {
    reject(() => load(`program m() -> json { budget { max_agent_calls: 0 } return 0 }`, { "x.json": "" }), "project-relative", "load");
    reject(() => load(`program m() -> json { budget { max_agent_calls: 0 } return 0 }`, { "ok.algal": 5 as unknown as string }), "source text", "load");
    reject(() => load(`program m() -> json { budget { max_agent_calls: 0 } return 0 }`, { "../evil.algal": "" }), "project-relative", "load");
    reject(() => load(`program m() -> json { budget { max_agent_calls: 0 } return 0 }`, { "a\\b.algal": "" }), "project-relative", "load");
  });
  test("import cycles are detected", () => {
    const a = `import b from "./b.algal" program a() -> json { budget { max_agent_calls: 0 } return call b using {} }`;
    const b = `import a from "./a.algal" program b() -> json { budget { max_agent_calls: 0 } return call a using {} }`;
    reject(() => load(a, { "a.algal": a, "b.algal": b }), /cycle/, "load");
  });
  test("a shared import is checked once; import depth still accumulates", () => {
    const d = `program d() -> json { budget { max_agent_calls: 0 } return 1 }`;
    const mods = {
      "d.algal": d,
      "b.algal": `import d from "./d.algal" program b() -> json { budget { max_agent_calls: 0 } return call d using {} }`,
      "c.algal": `import d from "./d.algal" program c() -> json { budget { max_agent_calls: 0 } return call d using {} }`,
    };
    const project = load(`import b from "./b.algal" import c from "./c.algal"
      program m() -> json { budget { max_agent_calls: 0 } return call b using {} }
    `, mods);
    expect(project.checked.size).toBe(4); // entry + b + c + d, d visited once
    expect(project.checked.get("b.algal")!.importDepth).toBe(1);
  });
  test("import depth is enforced through both fresh and memoized paths", () => {
    const mods: Record<string, string> = { "leaf.algal": `program leaf() -> json { budget { max_agent_calls: 0 } return 0 }` };
    // Chain of 9 imports — exceeds maxImportDepth 8.
    for (let i = 7; i >= 0; i--) {
      mods[`m${i}.algal`] = `import n from "./${i === 7 ? "leaf" : `m${i + 1}`}.algal" program m${i}() -> json { budget { max_agent_calls: 0 } return 0 }`;
    }
    reject(() => load(`import n from "./m0.algal" program root() -> json { budget { max_agent_calls: 0 } return 0 }`, mods), "import depth");
    // Same depth reached through a memoized re-import still counts.
    reject(() => load(`import n from "./m0.algal" import n2 from "./m0.algal" program root() -> json { budget { max_agent_calls: 0 } return 0 }`, mods), "import depth");
  });
  test("file count and byte bounds", () => {
    const mods: Record<string, string> = {};
    for (let i = 0; i < 17; i++) mods[`f${i}.algal`] = `program f${i}() -> json { budget { max_agent_calls: 0 } return 0 }`;
    reject(() => load(`program root() -> json { budget { max_agent_calls: 0 } return 0 }`, mods), /files|exceeds/);
  });
});

// ------------------------------------------------------------- check ------

describe("check: name hygiene and scope", () => {
  test("duplicate parameters and kebab collisions", () => {
    reject(() => load(`program m(a: text, a: json) -> json { budget { max_agent_calls: 0 } return null }`), "duplicate parameter", "check");
    reject(() => load(`program m(My_X: text, my_x: json) -> json { budget { max_agent_calls: 0 } return null }`), "kebab-case interface", "check");
  });
  test("parameter shadowing an import rejects", () => {
    reject(() => load(`import c from "./c.algal" program m(c: text) -> json { budget { max_agent_calls: 0 } return null }`, { "c.algal": child }), /shadow/, "check");
  });
  test("duplicate bindings and forward references", () => {
    reject(() => load(`program m() -> json { budget { max_agent_calls: 0 } let x = 1 let x = 2 return x }`), "duplicate binding", "check");
    reject(() => load(`program m() -> json { budget { max_agent_calls: 0 } let x = y let y = 1 return x }`), "unknown name", "check");
    reject(() => load(`program m() -> json { budget { max_agent_calls: 0 } return unknown_name }`), "unknown name", "check");
  });
});
const child = `program c() -> json { budget { max_agent_calls: 0 } return 1 }`;

describe("check: types and composition", () => {
  test("return type must agree with the declaration", () => {
    reject(() => load(`program m() -> text { budget { max_agent_calls: 0 } return 5 }`), "declares text", "check");
    reject(() => load(`program m() -> json { budget { max_agent_calls: 0 } return "text" }`), "declares json but returns text", "check");
  });
  test("branches must agree on text versus json", () => {
    reject(() => load(`program m(b: json) -> json { budget { max_agent_calls: 0 } return if b { "text" } else { 5 } }`), "branches must agree", "check");
  });
  test("match must cover exactly the declared labels", () => {
    const prog = (arms: string) => `program m() -> json { budget { max_agent_calls: 1 } let d = decide "q" using 0 as choice { a: "A", b: "B" } return match d.value { ${arms} } }`;
    reject(() => load(prog(`a => 1`)), "cover exactly", "check");
    reject(() => load(prog(`a => 1, b => 2, c => 3`)), "cover exactly", "check");
    expect(() => load(prog(`b => 2, a => 1`))).not.toThrow();
  });
  test("call arguments must be exact named parameters", () => {
    const c = `program c(a: text, b: json) -> json { budget { max_agent_calls: 0 } return null }`;
    reject(() => load(`import c from "./c.algal" program m(x: text) -> json { budget { max_agent_calls: 0 } return call c using { a: x } }`, { "c.algal": c }), "must match exactly", "check");
    reject(() => load(`import c from "./c.algal" program m(x: text) -> json { budget { max_agent_calls: 0 } return call c using { a: x, b: null, extra: 1 } }`, { "c.algal": c }), "must match exactly", "check");
    reject(() => load(`import c from "./c.algal" program m(x: text) -> json { budget { max_agent_calls: 0 } return call c using [x, null] }`, { "c.algal": c }), "record literal", "check");
    // A call projected through field access is pure-position and rejects;
    // binding the result first is the legal form.
    reject(() => load(`import c from "./c.algal" program m(x: text) -> json { budget { max_agent_calls: 0 } return (call c using { a: x, b: null }).again }`, { "c.algal": c }), "pure", "check");
    expect(() => load(`import c from "./c.algal" program m(x: text) -> json { budget { max_agent_calls: 0 } let r = call c using { a: x, b: null } return r.again }`, { "c.algal": c })).not.toThrow();
  });
  test("effects and calls cannot sit in pure positions", () => {
    const c = `program c() -> json { budget { max_agent_calls: 0 } return 1 }`;
    reject(() => load(`import c from "./c.algal" program m() -> json { budget { max_agent_calls: 0 } return { wrap: call c using {} } }`, { "c.algal": c }), "pure", "check");
    reject(() => load(`program m() -> json { budget { max_agent_calls: 1 } let x = 1 + (generate "a" using 0) return x }`), "pure", "check");
    reject(() => load(`program m() -> json { budget { max_agent_calls: 1 } return if (decide "q" using 0 as choice { a: "A" }).value { 1 } else { 2 } }`), "pure", "check");
  });
  test("static analysis bounds calls and depth", () => {
    reject(() => load(`program m() -> text { budget { max_agent_calls: 1 } let a = generate "a" using 0 let b = generate "b" using 0 return a }`), "exceed", "check");
    reject(() => load(`import c from "./c.algal" program m() -> json { budget { max_agent_calls: 0, max_depth: 1 } return call c using {} }`, { "c.algal": `import d from "./d.algal" program c() -> json { budget { max_agent_calls: 0 } return call d using {} }`, "d.algal": child }), "depth", "check");
  });
  test("each requires an existing parameter and forbids double-supply", () => {
    const c = `program c(item: text, extra: json) -> json { budget { max_agent_calls: 0 } return null }`;
    reject(() => load(`import c from "./c.algal" program m(l: json) -> json { budget { max_agent_calls: 0 } return each c over wrong in l using { item: 0 } max_items 4 }`, { "c.algal": c }), "not a parameter", "check");
    reject(() => load(`import c from "./c.algal" program m(l: json) -> json { budget { max_agent_calls: 0 } return each c over item in l using { item: 0, extra: null } max_items 4 }`, { "c.algal": c }), "already supplied", "check");
  });
  test("generate instruction must be statically text", () => {
    reject(() => load(`program m(x: json) -> json { budget { max_agent_calls: 1 } return generate x using 0 }`), "text", "check");
  });
  test("records check fields: required, declared, assignable", () => {
    const base = `record T { a: text, b: integer? } `;
    reject(() => load(`${base} program m() -> T { budget { max_agent_calls: 0 } return { b: 1 } }`), "missing field", "check");
    reject(() => load(`${base} program m() -> T { budget { max_agent_calls: 0 } return { a: "x", nope: 1 } }`), "does not declare", "check");
    reject(() => load(`${base} program m() -> T { budget { max_agent_calls: 0 } return { a: 1 } }`), "text", "check");
  });
});

// -------------------------------------------------------------- interp ----

describe("interp: pure evaluation", () => {
  test("operators, precedence, short-circuiting", () => {
    const r = run(`program m(x: json) -> json { budget { max_agent_calls: 0 }
      return { a: 1 + 2 * 3, b: false && x.bad, c: true || x.bad, d: "a" + "b", e: -x, f: 10 % 3 } }`, { x: 4 });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 7, b: false, c: true, d: "ab", e: -4, f: 1 });
  });
  test("records evaluate fields in canonical order and byte-bounds apply", () => {
    const r = run(`program m() -> json { budget { max_agent_calls: 0 } return { z: 1 / 0, a: "x" } }`);
    // canonical order: `a` first — succeeds; `z` fails with a divide-by-zero.
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe("EXPR_FAILED");
  });
  test("dynamic type failures are typed failures", () => {
    const r = run(`program m(x: json) -> json { budget { max_agent_calls: 0 } return x + 1 }`, { x: "text" });
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe("EXPR_FAILED");
  });
  test("missing parameters leave downstream cells skipped", () => {
    const r = run(`program m(a: text, b: json) -> json { budget { max_agent_calls: 0 } let x = a + "!" return { got: x, b: b } }`, { b: 1 });
    expect(r.ok).toBe(true);
    expect(r.resultAbsent).toBe(true);
  });
  test("a non-matching arg type fails the input port", () => {
    const r = run(`program m(a: text) -> json { budget { max_agent_calls: 0 } return { a: a } }`, { a: 5 });
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe("TYPE_MISMATCH");
  });
  test("shape ports enforce schema versions", () => {
    // `text min` is a version-3-only schema rule; the param port carries it.
    const src = `record T { a: text min 5 } program m(t: T) -> json { budget { max_agent_calls: 0 } return t }`;
    const ok = run(src, { t: { a: "long enough" } });
    expect(ok.ok).toBe(true);
    const short = run(src, { t: { a: "no" } });
    expect(short.ok).toBe(false);
    expect(short.error?.code).toBe("TYPE_MISMATCH");
  });
});

describe("interp: branches and matching", () => {
  test("nested guards evaluate only the selected arm — no effects or steps", () => {
    const source = `program m(o: json) -> text { budget { max_agent_calls: 2 }
      return if o.outer {
        if o.inner { generate "inner" using o.x } else { generate "outer" using o.x }
      } else { "skip" }
    }`;
    for (const [o, expected] of [
      [{ outer: true, inner: true, x: 1 }, "inner"],
      [{ outer: true, inner: false, x: 1 }, "outer"],
      [{ outer: false, inner: true, x: 1 }, "skip"],
    ] as const) {
      const obs: string[] = [];
      const r = run(source, { o }, oracle({ generate: (g) => { obs.push(g.instruction); return g.instruction; } }));
      expect(r.ok).toBe(true);
      expect(r.value).toBe(expected === "skip" ? "skip" : expected);
      expect(obs).toEqual(expected === "skip" ? [] : [expected]);
    }
  });
  test("match selects exactly one arm", () => {
    const obs: SourceObservation[] = [];
    const src = `program m() -> text { budget { max_agent_calls: 3 }
      let d = decide "pick" using 0 as choice { a: "A", b: "B", c: "C" }
      return match d.value {
        a => generate "fa" using 1,
        b => generate "fb" using 1,
        c => generate "fc" using 1
      }
    }`;
    const r = run(src, {}, oracle({
      decide: () => answer("b", { a: 0.1, b: 0.8, c: 0.1 }),
      generate: (g) => { obs.push(g); return `got:${g.instruction}`; },
    }));
    expect(r.ok).toBe(true);
    expect(r.value).toBe("got:fb");
    // One decide observation + one generate — the unselected arms emit none.
    expect(r.observations.map(o => o.kind)).toEqual(["decide", "generate"]);
    expect(obs).toHaveLength(1);
  });
  test("a skipped selector value skips the whole branch", () => {
    const r = run(`program m(a: json) -> json { budget { max_agent_calls: 0 }
      return if a.flag { a.yes } else { a.no }
    }`, {});
    expect(r.ok).toBe(true);
    expect(r.resultAbsent).toBe(true);
  });
  test("decision metadata is normalized and validated", () => {
    const src = `program m() -> json { budget { max_agent_calls: 1 }
      return decide "q" using 0 as choice { a: "A", b: "B" }
    }`;
    const good = run(src, {}, oracle({ decide: () => answer("a", { a: 0.6, b: 0.4 }) }));
    expect(good.ok).toBe(true);
    expect(good.value).toEqual({ value: "a", confidence: 0.9, probabilities: { a: 0.6, b: 0.4 } });
    // An undeclared label fails in the decision-check cell.
    const bad = run(src, {}, oracle({ decide: () => answer("zz", { a: 0.6, b: 0.4 }) }));
    expect(bad.ok).toBe(false);
    expect(bad.error?.code).toBe("EXPR_FAILED");
    // Out-of-range probability fails too.
    const wide = run(src, {}, oracle({ decide: () => answer("a", { a: 0.6, b: 1.7 }) }));
    expect(wide.ok).toBe(false);
    expect(wide.error?.code).toBe("EXPR_FAILED");
  });
});

describe("interp: composition", () => {
  const echo = `program e(v: text, tag: json) -> json { budget { max_agent_calls: 0 } return { v: v, tag: tag } }`;
  test("call passes exact arguments and returns the child result", () => {
    const r = run(`import e from "./e.algal" program m() -> json { budget { max_agent_calls: 0 }
      return call e using { tag: { k: 1 }, v: "hello" }
    }`, {}, oracle(), { "e.algal": echo });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ v: "hello", tag: { k: 1 } });
  });
  test("call args are checked against child ports at the boundary", () => {
    const mods = { "c.algal": `record T { a: text min 3 } program c(t: T) -> json { budget { max_agent_calls: 0 } return t }` };
    // A literal record that violates the schema rejects at check time, before any run.
    reject(() => load(`import c from "./c.algal" program m() -> json { budget { max_agent_calls: 0 } return call c using { t: { a: "no" } } }`, mods), "at least 3", "check");
    const bad = run(`import c from "./c.algal" program m(t: json) -> json { budget { max_agent_calls: 0 } return call c using { t: t } }`, { t: { a: "no" } }, oracle(), mods);
    expect(bad.ok).toBe(false);
    expect(bad.error?.code).toBe("TYPE_MISMATCH");
  });
  test("a skipped argument cell skips the whole call", () => {
    const r = run(`import e from "./e.algal" program m(a: json) -> json { budget { max_agent_calls: 0 }
      return call e using { v: "x", tag: a.missing.link }
    }`, {}, oracle(), { "e.algal": echo });
    // `a` absent → a.missing never produced → arg cell skipped → call skipped.
    expect(r.ok).toBe(true);
    expect(r.resultAbsent).toBe(true);
  });
  test("each returns ordered results and an empty batch invokes nothing", () => {
    const mods = { "l.algal": `program l(item: text, p: text) -> text { budget { max_agent_calls: 0 } return p + item }` };
    const src = `import l from "./l.algal" program m(items: json) -> json { budget { max_agent_calls: 0 }
      return each l over item in items using { p: "#" } max_items 4
    }`;
    const many = run(src, { items: ["c", "a", "b"] }, oracle(), mods);
    expect(many.ok).toBe(true);
    expect(many.value).toEqual(["#c", "#a", "#b"]);
    const empty = run(src, { items: [] }, oracle(), mods);
    expect(empty.ok).toBe(true);
    expect(empty.value).toEqual([]);
  });
  test("each item checks and item bounds are enforced at run time", () => {
    const mods = { "l.algal": `program l(item: text) -> text { budget { max_agent_calls: 0 } return item }` };
    const src = `import l from "./l.algal" program m(items: json) -> json { budget { max_agent_calls: 0 }
      return each l over item in items using {} max_items 2
    }`;
    expect(run(src, { items: "nope" }, oracle(), mods).error?.code).toBe("TYPE_MISMATCH");
    expect(run(src, { items: [1] }, oracle(), mods).error?.code).toBe("TYPE_MISMATCH");
    expect(run(src, { items: ["a", "b", "c"] }, oracle(), mods).error?.code).toBe("BUDGET_EXHAUSTED");
  });
  test("nested calls account depth and fail at max_depth", () => {
    const mods = {
      "inner.algal": `program inner() -> json { budget { max_agent_calls: 0 } return 0 }`,
      "outer.algal": `import i from "./inner.algal" program outer() -> json { budget { max_agent_calls: 0 } return call i using {} }`,
    };
    const src = `import o from "./outer.algal" program m() -> json { budget { max_agent_calls: 0, max_depth: 2 } return call o using {} }`;
    expect(run(src, {}, oracle(), mods).ok).toBe(true);
    const shallow = `import o from "./outer.algal" program m() -> json { budget { max_agent_calls: 0, max_depth: 1 } return call o using {} }`;
    reject(() => load(shallow, mods), "depth", "check");
  });
});

describe("interp: observations and budgets", () => {
  test("observations record in issue order with the site path", () => {
    const seen: string[] = [];
    const r = run(`program m() -> json { budget { max_agent_calls: 2 }
      let a = generate "first" using 1
      let b = generate "second" using 2
      return { r: [a, b] }
    }`, {}, oracle({ generate: (g) => { seen.push(g.instruction); return g.instruction; } }));
    expect(r.ok).toBe(true);
    expect(seen).toEqual(["first", "second"]);
    expect(r.observations.map(o => (o as { site: string }).site)).toEqual(["b1-a", "b2-b"]);
    expect(r.agentCalls).toBe(2);
  });
  test("oracle errors propagate as typed failures and count attempts", () => {
    const r = run(`program m() -> text { budget { max_agent_calls: 2 }
      let a = generate "a" using 1
      let b = generate "b" using 2
      return a
    }`, {}, oracle({ generate: (g) => g.instruction === "b" ? (() => { throw new SrcError("eval", "EFFECT_FAILED", "offline"); })() : g.instruction }));
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe("EFFECT_FAILED");
    expect(r.observations).toHaveLength(2); // both requests issued
    expect(r.agentCalls).toBe(2);
  });
  test("static call bounds reject upfront; runtime step budgets exhaust mid-run", () => {
    // Static: declared effects cannot exceed the budget at compile time.
    reject(() => load(`program m() -> text { budget { max_agent_calls: 1 } let a = generate "a" using 1 let b = generate "b" using 2 return a }`), "exceed", "check");
    // Runtime: cell activations charge work.steps; a tight budget stops mid-run.
    const r = run(`program m() -> json { budget { max_agent_calls: 0, max_steps: 2 }
      let a = 1 + 1 let b = a + 1 let c = a + b return c
    }`);
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe("BUDGET_EXHAUSTED");
    expect(r.steps).toBe(2);
  });
  test("a generated-control name never appears in observations", () => {
    const seen: JsonValue[] = [];
    const r = run(`program m(f: json) -> text { budget { max_agent_calls: 1 }
      return if f { generate "only" using f } else { "no" }
    }`, { f: true }, oracle({ generate: (g) => { seen.push(g.context); return "ok"; } }));
    expect(r.ok).toBe(true);
    expect(JSON.stringify(seen)).not.toContain("source-control");
    expect(JSON.stringify(seen)).not.toContain("trigger");
  });
});
