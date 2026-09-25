import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import vm from "node:vm";
import { digestText } from "./digest";
import type { EvalExports } from "./expr";
import { compileSource, SOURCE_BOUNDS, SourceError, sourceImports } from "./source";
import { createSourceErrorReport, renderSourceError, SOURCE_ERROR_BOUNDS } from "./source-errors";

type Host = Pick<typeof import("./source"), "compileSource" | "sourceImports" | "SourceError">
  & Pick<typeof import("./source-errors"), "createSourceErrorReport" | "renderSourceError">;
type BrowserHost = Host & Pick<typeof import("./expr"), "setExprExports">;

const bun: Host = { compileSource, sourceImports, SourceError, createSourceErrorReport, renderSourceError };
const repository = join(import.meta.dir, "..");
// This consumer exists only in memory. It imports the compiler by package
// name, so the bundle resolves the package.json export map as a host would.
const consumer = join(repository, "browser-consumer.ts");
let bundled: Promise<Bun.BuildOutput> | undefined;
function bundle(): Promise<Bun.BuildOutput> {
  bundled ??= Bun.build({
    entrypoints: [consumer],
    files: { [consumer]: [
      'export * from "@hraness/algal/source";',
      'export * from "@hraness/algal/source-errors";',
      'export { setExprExports } from "@hraness/algal/expr";',
    ].join("\n") },
    target: "browser", format: "esm", metafile: true, throw: false,
  });
  return bundled;
}

/** Evaluate the bundle in a fresh realm. It starts with the ECMAScript
 * built-ins, WebAssembly and console; add only web APIs that browser pages
 * and workers also provide. */
async function browserRealm(): Promise<{ host: BrowserHost; context: vm.Context }> {
  const result = await bundle();
  expect(result.outputs).toHaveLength(1);
  const context = vm.createContext({ TextDecoder, TextEncoder, URL, structuredClone });
  const url = "https://example.invalid/app.js";
  const module = new vm.SourceTextModule(await result.outputs[0]!.text(), { context, identifier: url, initializeImportMeta: meta => { meta.url = url; } });
  await module.link(specifier => { throw new Error(`the browser bundle imports ${specifier}`); });
  await module.evaluate();
  return { host: module.namespace as BrowserHost, context };
}
/** The committed evaluator, instantiated as a browser host does after fetching it. */
const evaluator = (): EvalExports =>
  new WebAssembly.Instance(new WebAssembly.Module(readFileSync(join(import.meta.dir, "algal_expr.wasm"))), {}).exports as unknown as EvalExports;

const project = {
  entry: "tasks/triage.algal",
  source: [
    'import clamp from "../lib/clamp.algal"',
    "",
    "program triage(task: json) -> json {",
    "  budget { max_agent_calls: 0, max_depth: 1 }",
    "  let urgency = call clamp using { value: task.urgency, minimum: 0, maximum: 5 }",
    '  return { title: task.title, urgency: urgency, note: "Priorité élevée ✓" }',
    "}",
  ].join("\n"),
  modules: { "lib/clamp.algal": [
    "program clamp(value: json, minimum: json, maximum: json) -> json {",
    "  budget { max_agent_calls: 0 }",
    "  return if value < minimum { minimum } else { if value > maximum { maximum } else { value } }",
    "}",
  ].join("\n") },
};
const broken = {
  entry: "main.algal",
  source: 'import helper from "./lib/helper.algal"\nprogram main() -> json {\n  budget { max_agent_calls: 0, max_depth: 1 }\n  return call helper using {}\n}\n',
  modules: { "lib/helper.algal": 'program helper() -> json {\n  budget { max_agent_calls: 0 }\n  return { note: "é ✓", value: missing }\n}\n' },
};

function observe(host: Host) {
  const compiled = host.compileSource(project.source, { entry: project.entry, modules: project.modules });
  let failure: unknown;
  try { host.compileSource(broken.source, { entry: broken.entry, modules: broken.modules }); } catch (error) { failure = error; }
  if (!(failure instanceof host.SourceError)) throw new Error(`expected a SourceError, received ${String(failure)}`);
  const report = host.createSourceErrorReport(failure);
  // Rebuild both hosts' values in this realm so they compare structurally.
  return JSON.parse(JSON.stringify({ compiled, report, rendered: host.renderSourceError(report) }));
}

test("source subpaths bundle for the browser from package source only", async () => {
  const result = await bundle();
  expect(result.logs.map(log => `${log.level}: ${log.message}`)).toEqual([]);
  expect(result.success).toBe(true);
  // A browser build still succeeds when it leaves a Node built-in external or
  // substitutes a polyfill for one, so check every import and input file.
  const inputs = result.metafile!.inputs;
  expect(Object.values(inputs).flatMap(input => input.imports).filter(item => item.external).map(item => item.path)).toEqual([]);
  const files = Object.keys(inputs).map(path => relative(repository, resolve(path)));
  expect(files.filter(file => file !== "browser-consumer.ts" && !/^src\/[\w-]+\.ts$/.test(file))).toEqual([]);
  expect(files).toEqual(expect.arrayContaining(["src/source.ts", "src/source-errors.ts", "src/expr.ts"]));
  expect(files).not.toContain("src/source-project.ts");
});

test("the browser bundle compiles and reports source errors without Node or Bun globals", async () => {
  const { host, context } = await browserRealm();
  expect(vm.runInContext("[typeof Buffer, typeof process, typeof Bun, typeof require].join()", context)).toBe("undefined,undefined,undefined,undefined");
  // With no filesystem, expression checks wait for the host to inject the evaluator.
  expect(() => host.compileSource(project.source, { entry: project.entry, modules: project.modules })).toThrow("call setExprExports with the algal_expr.wasm instance");
  host.setExprExports(evaluator());
  const expected = observe(bun);
  expect(observe(host)).toEqual(expected);
  expect(expected.compiled.modules).toHaveLength(1);
  expect(expected.compiled.sourceMap.sourceDigest).toBe(digestText(project.source));
  expect(expected.report.source).toBe("lib/helper.algal");
  expect(expected.report.imports.map((frame: { source: string; path: string }) => [frame.source, frame.path])).toEqual([["main.algal", "./lib/helper.algal"]]);
  expect(expected.report.excerpt.lines.map((line: { line: number }) => line.line)).toEqual([3]);
  expect(expected.rendered).toContain("At lib/helper.algal:3:");
});

test("byte limits count an unpaired surrogate as the three UTF-8 bytes of U+FFFD in Bun and the browser", async () => {
  const { host: browser } = await browserRealm();
  browser.setExprExports(evaluator());
  const encoded = (text: string): number => new TextEncoder().encode(text).length;
  const head = "program big() -> json {\n  budget { max_agent_calls: 0 }\n  return 1\n}\n//";
  const fits = head + "\ud800".repeat(Math.floor((SOURCE_BOUNDS.maxSourceBytes - head.length) / 3));
  const over = `${fits}\ud800`;
  // TextEncoder writes U+FFFD for an unpaired surrogate. Bun 1.3.14's
  // Buffer.byteLength counts two bytes for one, which would admit `over`.
  expect(encoded(fits)).toBeLessThanOrEqual(SOURCE_BOUNDS.maxSourceBytes);
  expect(encoded(over)).toBeGreaterThan(SOURCE_BOUNDS.maxSourceBytes);
  const origin = { start: { offset: 0, line: 1, column: 1 }, end: { offset: 0, line: 1, column: 1 } };
  for (const host of [bun, browser]) {
    expect(host.compileSource(fits).sourceMap.sourceDigest).toBe(digestText(fits));
    expect(() => host.compileSource(over)).toThrow("source exceeds 65536 UTF-8 bytes");
    expect(() => host.sourceImports(over)).toThrow("source exceeds 65536 UTF-8 bytes");
    expect(new host.SourceError("oops", origin, { sourceText: fits }).sourceText).toBe(fits);
    expect(new host.SourceError("oops", origin, { sourceText: over }).sourceText).toBeUndefined();
    const truncated = host.createSourceErrorReport(new host.SourceError("\ud800".repeat(200), origin));
    expect(truncated.truncated).toBe(true);
    expect(encoded(truncated.message)).toBeLessThanOrEqual(SOURCE_ERROR_BOUNDS.maxMessageBytes);
    const oversized = new host.SourceError("oops", origin);
    Object.defineProperty(oversized, "sourceText", { value: over });
    expect(host.createSourceErrorReport(oversized).excerptUnavailable).toBe("source-too-large");
  }
});
