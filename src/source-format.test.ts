import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { digestCanonical } from "./digest";
import { manifestToJson } from "./contract";
import { compileSource, SourceError } from "./source";
import { formatSource } from "./source-format";
import { loadSourceProject } from "./source-project";

const root = resolve(import.meta.dir, "..");

async function cli(...args: string[]) {
  const child = Bun.spawn([process.execPath, "cli.ts", ...args], {
    cwd: root, stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  return { stdout, stderr, code };
}

/** Every `.algal` file under `dir`, recursively, keyed by repo-relative path. */
async function algalFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await algalFiles(path));
    else if (entry.name.endsWith(".algal")) found.push(path);
  }
  return found;
}

const digestOf = (source: string, modules?: Record<string, string>, entry?: string) =>
  digestCanonical(manifestToJson(compileSource(source, { ...(modules === undefined ? {} : { modules }), ...(entry === undefined ? {} : { entry }) }).manifest));

describe("formatSource", () => {
  test("canonical layout is independent of source whitespace", () => {
    const source = `record   Item{name:text,count:  integer  min   0   max 9, tags:[text] unique?}
program   pick( x:json ,  items : [Item] unique )->text{budget{max_agent_calls:0}
let   a=1;let b=  x.ok;return    if a>0  {  "yes"  }else{"no"};}`;
    expect(formatSource(source)).toBe(`record Item { name: text, count: integer min 0 max 9, tags: [text] unique? }

program pick(x: json, items: [Item] unique) -> text {
  budget { max_agent_calls: 0 }

  let a = 1
  let b = x.ok
  return if a > 0 { "yes" } else { "no" }
}
`);
  });

  test("optional semicolons are dropped", () => {
    const source = `import a from "./a.algal";
record R { x: text }
program p(x: text) -> text { budget { max_agent_calls: 0 } let y = x; return y; }`;
    const formatted = formatSource(source);
    expect(formatted).not.toContain(";");
  });

  test("comments survive: line comments take their own line, inline blocks stay inline", () => {
    const source = `// leading file comment
import a from "./a.algal" // after the import
/* a block comment on its own line */
record R { x: text } // after a record
program p(x: R) -> text {
  budget { max_agent_calls: 0 } // after budget
  // between statements
  let a = x.x + /*inline*/ 1
  return a /* before the brace */
}
// after the program
`;
    const formatted = formatSource(source);
    expect(formatted).toBe(`// leading file comment
import a from "./a.algal"

// after the import
/* a block comment on its own line */
record R { x: text }

// after a record
program p(x: R) -> text {
  budget { max_agent_calls: 0 }

  // after budget
  // between statements
  let a = x.x + /*inline*/ 1
  return a /* before the brace */
}
// after the program
`);
    expect(formatSource(formatted)).toBe(formatted);
  });

  test("blank lines collapse to one and never border a brace", () => {
    const source = `program p(x: text) -> text {\n\n\n  budget { max_agent_calls: 0 }\n\n\n\n  let a = x\n\n  return a\n\n\n}`;
    const formatted = formatSource(source);
    expect(formatted).toBe(`program p(x: text) -> text {
  budget { max_agent_calls: 0 }

  let a = x

  return a
}
`);
  });

  test("a source blank line between statements survives", () => {
    const formatted = formatSource(`program p(x: text) -> text { budget { max_agent_calls: 0 } let a = x\n\n\nlet b = a return b }`);
    expect(formatted).toContain("let a = x\n\n  let b = a\n");
  });

  test("allowed values sort the way the compiler sorts them", () => {
    const source = `record R { s: text in ["b", "a"], n: number in [9, 1, 3], i: integer in [5, -2, 0] }
program p(x: R) -> text { budget { max_agent_calls: 0 } return x.s }`;
    expect(formatSource(source)).toContain(`text in ["a", "b"], n: number in [1, 3, 9], i: integer in [-2, 0, 5]`);
  });

  test("a comment inside an allowed list keeps source order", () => {
    const source = `record R { s: text in ["b", /* keep b first */ "a"] }
program p(x: R) -> text { budget { max_agent_calls: 0 } return x.s }`;
    expect(formatSource(source)).toContain(`text in ["b", /* keep b first */ "a"]`);
  });

  test("match and choice blocks always break", () => {
    const source = `program p(x: text) -> text { budget { max_agent_calls: 0 } return match x { a => "A", b => "B" } }`;
    expect(formatSource(source)).toBe(`program p(x: text) -> text {
  budget { max_agent_calls: 0 }

  return match x {
    a => "A",
    b => "B"
  }
}
`);
  });

  test("trailing commas drop; broken groups gain them", () => {
    const source = `program p(x: text) -> text { budget { max_agent_calls: 0 } let a = [1, 2, 3,] return { k: 1, } }`;
    const formatted = formatSource(source);
    expect(formatted).toContain("[1, 2, 3]");
    expect(formatted).toContain("{ k: 1 }");
  });

  test("a comment inside a list forces it broken with trailing commas", () => {
    const formatted = formatSource(`program p(x: text) -> text { budget { max_agent_calls: 0 } return [1, // keep\n 2] }`);
    expect(formatted).toContain(`[
    1,
    // keep
    2,
  ]`);
  });

  test("long chains break before the lowest-precedence operators", () => {
    const source = `program p(x: json) -> text { budget { max_agent_calls: 0 } return if x.aaaaaaaaaaaaaaaaaaaaa + x.bbbbbbbbbbbbbbbbbbbbb * x.ccccccccccccccccccccc + x.ddddddddddddddddddddddd > 100 { "y" } else { "n" } }`;
    const formatted = formatSource(source);
    const broken = formatted.split("\n").find(line => line.trimStart().startsWith(">"));
    expect(broken).toBeDefined();
    for (const line of formatted.split("\n")) expect(line.length).toBeLessThanOrEqual(100);
  });

  test("a still-too-wide operand segment breaks at its own operators", () => {
    const source = `program p(x: json) -> text { budget { max_agent_calls: 0 } return x.a + x.bbbbbbbbbbbbbbbbbb * x.cccccccccccccccccc * x.dddddddddddddddd + x.e }`;
    const formatted = formatSource(source);
    for (const line of formatted.split("\n")) expect(line.length).toBeLessThanOrEqual(100);
    expect(formatted).toContain("*");
  });

  test("each/call/generate break before using only when the line would overflow", () => {
    const short = formatSource(`import s from "./s.algal" program p(x: json) -> json { budget { max_agent_calls: 4 } return each s over item in x.items using { w: 1 } max_items 3 }`);
    expect(short).toContain("return each s over item in x.items using { w: 1 } max_items 3\n");
    const long = formatSource(`import s from "./s.algal" program p(x: json) -> json { budget { max_agent_calls: 4 } return each s over item in x.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa using { w: 1, z: 2, y: 3 } max_items 3 }`);
    expect(long).toContain("\n    using { w: 1, z: 2, y: 3 } max_items 3");
  });

  test("map, filter, and fold keep their over/from/using structure", () => {
    const formatted = formatSource(`program p(x: json) -> json { budget { max_agent_calls: 0 } return { a: map over n in x using n*2, b: filter over n in x using n>1, c: fold over s,n in x from 0 using s+n } }`);
    expect(formatted).toContain("map over n in x using n * 2");
    expect(formatted).toContain("filter over n in x using n > 1");
    expect(formatted).toContain("fold over s, n in x from 0 using s + n");
    const long = formatSource(`program p(x: json) -> json { budget { max_agent_calls: 0 } let total = fold over accumulated_total, current_line_item in x from 0 using accumulated_total + current_line_item.weight * current_line_item.quantity; return total }`);
    expect(long).toContain("\n    from 0 using accumulated_total + current_line_item.weight");
  });

  test("decide as choice keeps its block broken", () => {
    const formatted = formatSource(`program p(x: text) -> text { budget { max_agent_calls: 1 } return decide "what?" using x as choice { a: "first", b: "second" } }`);
    expect(formatted).toContain(`as choice {
      a: "first",
      b: "second"
    }`);
  });

  test("decide as noul stays bare and as score breaks its label list", () => {
    const noul = formatSource(`program p(x: text) -> json { budget { max_agent_calls: 1 } return decide "keep?" using x as noul }`);
    expect(noul).toContain(`return decide "keep?" using x
    as noul\n`);
    const score = formatSource(`program p(x: text) -> json { budget { max_agent_calls: 1 } return decide "rate?" using x as score {"poor","ok","great"} }`);
    expect(score).toContain(`as score {
      "poor",
      "ok",
      "great"
    }`);
  });

  test("generate as type keeps its declared type with the context", () => {
    const formatted = formatSource(`record Reply { verdict: text in ["keep","drop"], note: text } program p(x: text) -> Reply { budget { max_agent_calls: 1 } return generate "judge" using x as Reply }`);
    expect(formatted).toContain(`return generate "judge" using x as Reply\n`);
    const typed = formatSource(`record Reply { verdict: text in ["keep","drop"], note: text } program p(x: text) -> json { budget { max_agent_calls: 1 } let v = generate "judge" using x as [Reply]; return v }`);
    expect(typed).toContain(`let v = generate "judge" using x as [Reply]\n`);
  });

  test("invalid source fails with SourceError, not a formatter error", () => {
    expect(() => formatSource(`program p(x: text) -> text { budget { max_agent_calls: 0 } return }`)).toThrow(SourceError);
    expect(() => formatSource(`program p(x: Undeclared) -> text { budget { max_agent_calls: 0 } return "x" }`)).toThrow(SourceError);
    expect(() => formatSource(`program p(x: text) -> text { budget { max_agent_calls: 0 } let a = "unclosed }`)).toThrow(SourceError);
  });

  test("formatting never changes the compiled manifest digest", async () => {
    const files = await algalFiles(join(root, "examples/source"));
    expect(files.length).toBeGreaterThan(15);
    for (const file of files) {
      const source = await readFile(file, "utf8");
      const formatted = formatSource(source);
      expect(formatSource(formatted), `${file}: not idempotent`).toBe(formatted);
    }
    // Compile originals and formatted copies project-wide; every entry whose
    // source compiles must compile identically after formatting.
    for (const file of files.filter(path => !path.includes("helpers/") && !path.includes("/lib/") || path.endsWith("main.algal"))) {
      let project;
      try {
        project = await loadSourceProject(file, { root: join(root, "examples/source/projects") });
      } catch {
        try { project = await loadSourceProject(file); }
        catch { continue; }   // intentional error fixtures stay unformatted-checked above
      }
      const modules: Record<string, string> = {};
      for (const [key, text] of Object.entries(project.sources)) modules[key] = formatSource(text);
      expect(digestOf(modules[project.entry]!, modules, project.entry), `${file}: digest changed`).toBe(
        digestCanonical(manifestToJson(project.manifest)));
    }
  });
});

describe("algal fmt", () => {
  test("formats to stdout and via --out", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-fmt-"));
    try {
      const file = join(dir, "messy.algal");
      await writeFile(file, `program p(x:text)->text{budget{max_agent_calls:0}return x}`);
      const printed = await cli("fmt", file);
      expect(printed.code, printed.stderr).toBe(0);
      expect(printed.stdout).toBe(`program p(x: text) -> text {
  budget { max_agent_calls: 0 }

  return x
}
`);
      const target = join(dir, "out.algal");
      const written = await cli("fmt", file, "--out", target);
      expect(written.code, written.stderr).toBe(0);
      expect(await readFile(target, "utf8")).toBe(printed.stdout);
      // The source was left alone.
      expect(await readFile(file, "utf8")).toBe(`program p(x:text)->text{budget{max_agent_calls:0}return x}`);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("--check exits 1 listing non-canonical files and 0 when clean", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-fmt-"));
    try {
      const messy = join(dir, "messy.algal");
      const clean = join(dir, "clean.algal");
      await writeFile(messy, `program p(x:text)->text{budget{max_agent_calls:0}return x}`);
      await writeFile(clean, formatSource(`program p(x:text)->text{budget{max_agent_calls:0}return x}`));
      const dirty = await cli("fmt", messy, clean, "--check");
      expect(dirty.code, dirty.stderr).toBe(1);
      expect(JSON.parse(dirty.stdout)).toEqual({ ok: false, changed: [messy] });
      const done = await cli("fmt", clean, "--check");
      expect(done.code, done.stderr).toBe(0);
      expect(JSON.parse(done.stdout)).toEqual({ ok: true, changed: [] });
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("--write rewrites in place and reports only changed files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-fmt-"));
    try {
      const messy = join(dir, "messy.algal");
      const clean = join(dir, "clean.algal");
      const canonical = formatSource(`program p(x:text)->text{budget{max_agent_calls:0}return x}`);
      await writeFile(messy, `program p(x:text)->text{budget{max_agent_calls:0}return x}`);
      await writeFile(clean, canonical);
      const ran = await cli("fmt", messy, clean, "--write");
      expect(ran.code, ran.stderr).toBe(0);
      expect(JSON.parse(ran.stdout)).toEqual({ ok: true, changed: [messy] });
      expect(await readFile(messy, "utf8")).toBe(canonical);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("a directory scans nested .algal files for --check and --write", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-fmt-"));
    try {
      const nested = join(dir, "sub");
      await mkdir(nested);
      const messy = join(nested, "messy.algal");
      const clean = join(dir, "clean.algal");
      const canonical = formatSource(`program p(x:text)->text{budget{max_agent_calls:0}return x}`);
      await writeFile(messy, `program p(x:text)->text{budget{max_agent_calls:0}return x}`);
      await writeFile(clean, canonical);
      await writeFile(join(dir, "notes.txt"), "not source");
      const dirty = await cli("fmt", dir, "--check");
      expect(dirty.code, dirty.stderr).toBe(1);
      expect(JSON.parse(dirty.stdout)).toEqual({ ok: false, changed: [join(dir, "sub", "messy.algal")] });
      const ran = await cli("fmt", dir, "--write");
      expect(ran.code, ran.stderr).toBe(0);
      expect(await readFile(messy, "utf8")).toBe(canonical);
      const done = await cli("fmt", dir, "--check");
      expect(done.code).toBe(0);
      // Directories never write to stdout.
      expect((await cli("fmt", dir)).code).toBe(2);
      // An empty directory is an input error, not a quiet pass.
      const empty = join(dir, "empty");
      await mkdir(empty);
      expect((await cli("fmt", empty, "--check")).code).toBe(2);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("rejects invalid flag combinations and bad source", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-fmt-"));
    try {
      const file = join(dir, "a.algal");
      await writeFile(file, `program p(x:text)->text{budget{max_agent_calls:0}return x}`);
      for (const args of [
        ["fmt"],
        ["fmt", file, file],
        ["fmt", file, "--check", "--write"],
        ["fmt", file, file, "--out", join(dir, "o.algal")],
        ["fmt", file, "--nope"],
      ]) {
        const ran = await cli(...args);
        expect(ran.code, `${args.join(" ")}: ${ran.stdout}`).toBe(2);
      }
      const broken = join(dir, "broken.algal");
      await writeFile(broken, `program p(x:text)->text{budget{`);
      const failed = await cli("fmt", broken);
      expect(failed.code).toBe(2);
      expect(JSON.parse(failed.stdout === "" ? failed.stderr : failed.stdout).error).toBe("PARSE_FAILED");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
