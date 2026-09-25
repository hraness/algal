import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { AlgalError } from "./errors";
import { builtinRegistry } from "./registry";
import { receiptDigest, runOrganism, RECEIPT_BOUNDS, type RunReceipt } from "./run";
import { compileSource, type SourceCompilation } from "./source";
import { loadSourceProject } from "./source-project";
import { MemoryStore } from "./store-memory";
import { createSourceDependencyReport, renderSourceDependencies, SOURCE_DEPENDENCY_BOUNDS, type SourceDependencyReport } from "./source-dependencies";
import { SOURCE_DEPENDENCY_ESTIMATE_BOUNDS } from "./source-dependencies-estimate";
import { canonicalize, type JsonValue } from "./values";

const projects = `${import.meta.dir}/../examples/source/projects`;
type Args = Record<string, Record<string, JsonValue>>;
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
async function run(compilation: SourceCompilation, args: Args): Promise<RunReceipt> {
  const store = new MemoryStore();
  for (const module of compilation.modules) await store.putManifest(module);
  await store.putManifest(compilation.manifest);
  return runOrganism({ manifest: compilation.manifest, args, store, fns: builtinRegistry(), executors: [] });
}
const redigest = (receipt: RunReceipt): RunReceipt => {
  const { digest: _digest, ...body } = receipt;
  return { ...body, digest: receiptDigest(body) };
};
const bound = (report: SourceDependencyReport, path: string) => report.estimate!.occurrences.find(entry => entry.path.join("/") === path)!;
const failure = async (work: Promise<unknown>): Promise<AlgalError> => {
  try { await work; } catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};

// A pure fixture with nested `each`, a call under a branch arm, and a call
// after the branch merges.
const shopModules = {
  "item.algal": "program item(entry: json, rate: json) -> json { budget { max_agent_calls: 0 } return entry * rate }",
  "bonus.algal": "program bonus(total: json) -> json { budget { max_agent_calls: 0 } return total + 1 }",
  "tally.algal": "program tally(values: json) -> json { budget { max_agent_calls: 0 } return values }",
  "order.algal": `import item from "./item.algal"
program order(lines: json, rate: json) -> json { budget { max_agent_calls: 0, max_depth: 1 }
  return each item over entry in lines using { rate: rate } max_items 4 }`,
};
const shop = `import order from "./order.algal"
import bonus from "./bonus.algal"
import tally from "./tally.algal"
program shop(orders: json, rate: json, express: json) -> json {
  budget { max_agent_calls: 0, max_depth: 2 }
  let totals = each order over lines in orders using { rate: rate } max_items 8
  let extra = if express { call bonus using { total: 1 } } else { 0 }
  let summary = call tally using { values: [totals, extra] }
  return summary
}`;

test("task planner bounds multiply the item limit through nested calls without changing the static report", async () => {
  const project = await loadSourceProject(`${projects}/task-planning/main.algal`);
  const plain = await createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions });
  const report = await createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions, estimate: true });
  const { estimate, ...rest } = report;
  expect(canonicalize(json(rest) as unknown as JsonValue)).toBe(canonicalize(json(plain) as unknown as JsonValue));
  expect(JSON.stringify(plain)).not.toContain("estimate");
  expect(estimate).toMatchObject({ basis: "static-structure", cap: RECEIPT_BOUNDS.maxCells });
  expect(estimate!.occurrences.map(entry => entry.path)).toEqual(report.occurrences.map(entry => entry.path));
  expect(estimate!.occurrences.map(entry => [entry.min, entry.max])).toEqual([[1, 1], [0, 16], [0, 16], [0, 16], [0, 16], [0, 16], [0, 16]]);
  expect(estimate!.occurrences.some(entry => "saturated" in entry || "recorded" in entry)).toBe(false);
  expect(estimate!.exceeded).toBeUndefined();
  const clamp = report.modules.find(module => module.name === "clamp")!.manifestDigest;
  expect(estimate!.modules.map(entry => entry.manifestDigest)).toEqual(report.modules.map(module => module.manifestDigest));
  expect(estimate!.modules.find(entry => entry.manifestDigest === clamp)).toEqual({ manifestDigest: clamp, min: 0, max: 32 });
  const text = renderSourceDependencies(report);
  expect(text).toContain("Estimate: invocations per root invocation from static structure · an upper bound on possible work, not observed work · cap 65536");
  expect(text).toContain("\n  (root)  exactly 1\n");
  expect(text).toContain("\n  result-each/b1-score/b1-urgency  0 to 16\n");
  expect(text).toContain(`${clamp}  clamp  0 to 32`);
  expect(Object.isFrozen(estimate!.occurrences[0])).toBe(true);
  expect(SOURCE_DEPENDENCY_BOUNDS.estimate).toBe(SOURCE_DEPENDENCY_ESTIMATE_BOUNDS);
});

test("a branch arm has minimum 0, a call after the merge keeps minimum 1, and nested each limits multiply", async () => {
  const report = await createSourceDependencyReport(shop, { sourceOptions: { modules: shopModules }, estimate: true });
  expect(report.estimate!.occurrences.map(entry => [entry.path.join("/"), entry.min, entry.max])).toEqual([
    ["", 1, 1], ["b1-totals-each", 0, 8], ["b1-totals-each/result-each", 0, 32], ["b3-summary", 1, 1], ["branch-1-arm-1", 0, 1],
  ]);
  const named = new Map(report.modules.map(module => [module.name, module.manifestDigest]));
  const modules = new Map(report.estimate!.modules.map(entry => [entry.manifestDigest, [entry.min, entry.max]]));
  expect(modules.get(named.get("item")!)).toEqual([0, 32]);
  expect(modules.get(named.get("bonus")!)).toEqual([0, 1]);
  expect(modules.get(named.get("tally")!)).toEqual([1, 1]);
  // Every recorded run stays inside the bound; completed runs with every
  // input supplied reach each minimum.
  const compilation = compileSource(shop, { modules: shopModules });
  for (const args of [
    { orders: [[1, 2, 3, 4], [5]], rate: 2, express: true },
    { orders: [], rate: 1, express: false },
    { orders: Array.from({ length: 8 }, () => [1, 2, 3, 4]), rate: 1, express: false },
  ]) {
    const receipt = await run(compilation, { input: args });
    expect(receipt.outcome).toBe("complete");
    const joined = await createSourceDependencyReport(shop, { sourceOptions: { modules: shopModules }, estimate: true, receipt: json(receipt) });
    expect(joined.estimate!.exceeded).toEqual([]);
    joined.estimate!.occurrences.forEach((entry, index) => {
      expect(entry.recorded).toBe(joined.execution!.occurrences[index]!.invocations);
      expect(entry.recorded!).toBeGreaterThanOrEqual(entry.min);
      expect(entry.recorded!).toBeLessThanOrEqual(entry.max);
    });
    expect(bound(joined, "branch-1-arm-1").recorded).toBe(args.express ? 1 : 0);
    expect(bound(joined, "b1-totals-each/result-each").recorded).toBe(args.orders.flat().length);
    expect(renderSourceDependencies(joined)).toContain("recorded invocations within the bound");
  }
});

test("a receipt that records an item beyond an each limit is flagged above the maximum", async () => {
  const modules = { "item.algal": shopModules["item.algal"] };
  const source = 'import item from "./item.algal" program pair(values: json, rate: json) -> json { budget { max_agent_calls: 0, max_depth: 1 } return each item over entry in values using { rate: rate } max_items 2 }';
  const receipt = await run(compileSource(source, { modules }), { input: { values: [3, 4], rate: 2 } });
  const inspect = (value: RunReceipt) => createSourceDependencyReport(source, { sourceOptions: { modules }, estimate: true, receipt: json(value) });
  const clean = await inspect(receipt);
  expect(bound(clean, "result-each")).toEqual({ path: ["result-each"], min: 0, max: 2, recorded: 2 });
  expect(clean.estimate!.exceeded).toEqual([]);
  // Re-signed so only the join's own checks can object to the extra item.
  const forged = json(receipt);
  for (const cell of ["input", "result"]) forged.cells[`result-each/i2/${cell}`] = { status: "committed", work: 1 };
  const report = await inspect(redigest(forged));
  expect(bound(report, "result-each")).toEqual({ path: ["result-each"], min: 0, max: 2, recorded: 3 });
  expect(report.estimate!.exceeded).toEqual([["result-each"]]);
  // The execution join still leaves the out-of-range cells unattributed.
  expect(report.execution!.occurrences[1]!.invocations).toBe(2);
  expect(report.execution!.unattributed).toEqual({ cells: 2, work: 2 });
  const text = renderSourceDependencies(report);
  expect(text).toContain("inconsistent: 1 occurrence recorded above the maximum");
  expect(text).toContain("\n  result-each  0 to 2 · recorded 3 · above the maximum\n");
  // Receipts without the estimate keep their existing report bytes.
  const without = await createSourceDependencyReport(source, { sourceOptions: { modules }, receipt: json(redigest(forged)) });
  expect(without.estimate).toBeUndefined();
  expect(JSON.stringify(without)).not.toContain("exceeded");
});

test("generated wrappers and effect calls under a branch inherit minimum 0", async () => {
  const modules = {
    "triage.algal": `program triage(note: text) -> json {
  budget { max_agent_calls: 1 }
  let intent = decide "Is this urgent?" using note
    as choice { hot: "Needs attention now", cold: "Can wait" }
  return { label: intent.value }
}`,
    "ping.algal": 'program ping() -> text { budget { max_agent_calls: 1 } return generate "Say pong" using {} }',
  };
  const source = `import triage from "./triage.algal"
import ping from "./ping.algal"
program outer(flag: json, notes: json) -> json {
  budget { max_agent_calls: 5, max_depth: 3 }
  let verdicts = each triage over note in notes using {} max_items 3
  let extra = if flag { call ping using {} } else { "skip" }
  return { verdicts: verdicts, extra: extra }
}`;
  const report = await createSourceDependencyReport(source, { sourceOptions: { modules }, estimate: true });
  expect(report.estimate!.occurrences.map(entry => [entry.path.join("/"), entry.min, entry.max])).toEqual([
    ["", 1, 1], ["b1-verdicts-each", 0, 3], ["branch-1-arm-1", 0, 1], ["branch-1-arm-1/call", 0, 1],
  ]);
  // The compiler's executor-attempt bound agrees with the per-occurrence maxima.
  const attempts = report.occurrences.reduce((sum, occurrence, index) => sum + report.modules.find(module => module.manifestDigest === occurrence.manifestDigest)!.effects.direct.length * report.estimate!.occurrences[index]!.max, 0);
  expect(attempts).toBe(report.analysis.maxAgentCalls);
});

function tower(levels: number): { source: string; modules: Record<string, string> } {
  const modules: Record<string, string> = { "leaf.algal": "program leaf(x: json) -> json { budget { max_agent_calls: 0 } return x }" };
  for (let level = 1; level < levels; level++) {
    const child = level === 1 ? "leaf" : `t${level - 1}`;
    modules[`t${level}.algal`] = `import child from "./${child}.algal"
program t${level}(x: json) -> json { budget { max_agent_calls: 0, max_depth: ${level} } return each child over x in x using {} max_items 64 }`;
  }
  const top = levels === 1 ? "leaf" : `t${levels - 1}`;
  return {
    modules,
    source: `import top from "./${top}.algal"
program main(x: json) -> json { budget { max_agent_calls: 0, max_depth: ${levels} } return each top over x in x using {} max_items 64 }`,
  };
}

test("products beyond the cap saturate instead of overflowing", async () => {
  expect(SOURCE_DEPENDENCY_ESTIMATE_BOUNDS.maxInvocations).toBe(65_536);
  const two = tower(2);
  const unsaturated = await createSourceDependencyReport(two.source, { sourceOptions: { modules: two.modules }, estimate: true });
  expect(unsaturated.estimate!.occurrences.map(entry => entry.max)).toEqual([1, 64, 4_096]);
  expect(unsaturated.estimate!.occurrences.some(entry => entry.saturated === true)).toBe(false);
  const three = tower(3);
  const report = await createSourceDependencyReport(three.source, { sourceOptions: { modules: three.modules }, estimate: true });
  expect(report.estimate!.occurrences.map(entry => [entry.max, entry.saturated ?? false])).toEqual([[1, false], [64, false], [4_096, false], [65_536, true]]);
  const leaf = report.modules.find(module => module.name === "leaf")!.manifestDigest;
  expect(report.estimate!.modules.find(entry => entry.manifestDigest === leaf)).toEqual({ manifestDigest: leaf, min: 0, max: 65_536, saturated: true });
  const text = renderSourceDependencies(report);
  expect(text).toContain("cap 65536 · 1 saturated occurrence");
  expect(text).toContain("0 to 65536+ (saturated)");
});

test("the estimate option must be a boolean", async () => {
  const program = "program alone(x: json) -> json { budget { max_agent_calls: 0 } return x }";
  expect((await failure(createSourceDependencyReport(program, { estimate: "yes" as unknown as boolean }))).code).toBe("PARSE_FAILED");
  const off = await createSourceDependencyReport(program, { estimate: false });
  expect(off.estimate).toBeUndefined();
  const on = await createSourceDependencyReport(program, { estimate: true });
  expect(on.estimate!.occurrences).toEqual([{ path: [], min: 1, max: 1 }]);
  expect(renderSourceDependencies(on)).toContain("\n  (root)  exactly 1\n");
  const fixture = await readFile(`${projects}/task-planning/main.algal`, "utf8");
  expect(fixture).toContain("max_items 16");
});
