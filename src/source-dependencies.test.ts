import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { packOrganism, type Bundle } from "./bundle";
import { COMPILE_BOUNDS } from "./graph";
import { manifestToJson, type OrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { AlgalError } from "./errors";
import { loadSourceProject } from "./source-project";
import { compileSource } from "./source";
import { MemoryStore } from "./store-memory";
import { utf8Length } from "./utf8";
import { canonicalize, type JsonObject, type JsonValue } from "./values";
import {
  classifySourceDependencyCells, createSourceDependencyReport, renderSourceDependencies,
  SOURCE_DEPENDENCY_BOUNDS, SOURCE_DEPENDENCY_CELL_KINDS, type SourceDependencyReport,
} from "./source-dependencies";

const planner = `${import.meta.dir}/../examples/source/projects/task-planning/main.algal`;
const ratios = `${import.meta.dir}/../examples/source/projects/ratios/ratios.algal`;
const failure = async (work: Promise<unknown> | (() => unknown)): Promise<AlgalError> => {
  try { await (typeof work === "function" ? work() : work); }
  catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
async function plannerBundle(): Promise<{ bundle: Bundle; source: string; options: { entry: string; modules: Readonly<Record<string, string>> } }> {
  const project = await loadSourceProject(planner);
  const store = new MemoryStore();
  for (const module of project.modules) await store.putManifest(module);
  await store.putManifest(project.manifest);
  return { bundle: await packOrganism(project.manifest, store), source: project.source, options: project.compilerOptions };
}
const json = (value: unknown): JsonObject => JSON.parse(JSON.stringify(value)) as JsonObject;

test("task planner report pins units, modules, shared helper occurrences and zero effects", async () => {
  const project = await loadSourceProject(planner);
  const report = await createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions });
  expect(report.contract).toBe("algal.source-dependencies.v1");
  expect(report.entry).toBe("main.algal");
  expect(report.rootManifestDigest).toBe(project.sourceMap.manifestDigest);
  expect(report.sourceDigest).toBe(project.sourceMap.sourceDigest);
  expect(report.compilerVersion).toBe(project.sourceMap.compilerVersion);
  expect(report.analysis).toEqual({ maxAgentCalls: 0, requiredDepth: 3 });
  expect(report.counts).toEqual({ sourceUnits: 6, uniqueModules: 6, dependencyModules: 5, occurrences: 7, compositionEdges: 6, maxDepth: 3 });
  expect(report.counts.dependencyModules).toBe(project.modules.length);
  expect(report.sourceUnits.map(unit => unit.source)).toEqual(["choose_action.algal", "lib/clamp.algal", "main.algal", "plan_task.algal", "present_task.algal", "score_task.algal"]);
  expect(report.sourceUnits.every(unit => unit.calledFromEntry)).toBe(true);
  expect(report.sourceUnits.map(unit => unit.manifestDigest)).toEqual(report.sourceUnits.map(unit => project.project.units[unit.source]!.manifestDigest));
  expect(report.modules.map(module => module.manifestDigest)).toEqual([...report.modules.map(module => module.manifestDigest)].sort());
  expect(report.modules.every(module => !module.generated && module.effects.direct.length === 0 && module.effects.transitive.length === 0)).toBe(true);
  const clampDigest = project.project.units["lib/clamp.algal"]!.manifestDigest;
  const clamp = report.modules.find(module => module.manifestDigest === clampDigest)!;
  expect(clamp).toMatchObject({ name: "clamp", key: "organism:clamp", sources: ["lib/clamp.algal"], occurrences: 2 });
  expect(Object.keys(clamp.interface.inputs)).toEqual(["maximum", "minimum", "value"]);
  expect(Object.values(clamp.interface.inputs).map(port => port.type)).toEqual(["json", "json", "json"]);
  expect(Object.keys(clamp.interface.outputs)).toEqual(["result"]);
  expect(clamp.interface.outputs.result?.type).toBe("json");
  expect(clamp.budgets.maxAgentCalls).toBe(0);
  const root = report.occurrences[0]!;
  expect(root).toEqual({ path: [], depth: 0, manifestDigest: report.rootManifestDigest, generated: false, source: "main.algal" });
  expect(report.occurrences.map(occurrence => occurrence.path.join("/"))).toEqual([
    "", "result-each", "result-each/b1-score", "result-each/b1-score/b1-urgency", "result-each/b1-score/b2-impact", "result-each/b2-action", "result-each/b3-view",
  ]);
  const each = report.occurrences[1]!;
  expect(each.source).toBe("plan_task.algal");
  expect(each.caller).toMatchObject({ path: [], cellId: "result-each", kind: "each", maxItems: 16 });
  expect(each.caller?.origin).toMatchObject({ source: "main.algal", cellId: "result-each", role: "each" });
  expect(each.caller?.origin?.span.start.line).toBe(6);
  const clamps = report.occurrences.filter(occurrence => occurrence.manifestDigest === clampDigest);
  expect(clamps).toHaveLength(2);
  expect(clamps.every(occurrence => occurrence.source === "lib/clamp.algal" && occurrence.depth === 3)).toBe(true);
  expect(clamps.map(occurrence => occurrence.caller?.cellId)).toEqual(["b1-urgency", "b2-impact"]);
  expect(clamps.map(occurrence => occurrence.caller?.origin?.source)).toEqual(["score_task.algal", "score_task.algal"]);
  expect(clamps[0]!.caller?.origin?.span.start.line).not.toBe(clamps[1]!.caller?.origin?.span.start.line);
  expect(clamps.every(occurrence => occurrence.caller?.maxItems === undefined)).toBe(true);
  expect(Object.isFrozen(report) && Object.isFrozen(report.occurrences) && Object.isFrozen(clamp.interface.inputs)).toBe(true);
  expect(report.bundle).toBeUndefined();
  // Insertion order of the supplied modules does not change canonical bytes or identities.
  const reversed = Object.fromEntries(Object.entries(project.compilerOptions.modules).reverse());
  const again = await createSourceDependencyReport(project.source, { sourceOptions: { entry: project.entry, modules: reversed } });
  expect(canonicalize(again as unknown as JsonValue)).toBe(canonicalize(report as unknown as JsonValue));
  expect(compileSource(project.source, { entry: project.entry, modules: reversed }).sourceMap.manifestDigest).toBe(project.sourceMap.manifestDigest);
  const text = renderSourceDependencies(report);
  expect(text).toContain("6 source files · 6 modules (5 dependencies) · 7 occurrences · 6 composition edges · depth 3");
  expect(text).toContain("lib/clamp.algal · 2 occurrences");
  expect(text).toContain("result-each  plan_task  plan_task.algal ← main.algal:6:10 [each ≤16 items]");
  expect(text).toContain("inputs maximum: json, minimum: json, value: json · outputs result: json");
});

test("identical child digests under different source names stay distinct source units", async () => {
  const child = 'program ratio(input: json) -> json { budget { max_agent_calls: 0 } return input.numerator / input.denominator }';
  const program = `import first from "./first.algal" import second from "./second.algal"
    program paired(value: json) -> json { budget { max_agent_calls: 0 }
      let a = call first using {input: value}
      return call second using {input: a}
    }`;
  const report = await createSourceDependencyReport(program, { sourceOptions: { modules: { "first.algal": child, "second.algal": `// a different file\n${child}` } } });
  expect(report.counts).toEqual({ sourceUnits: 3, uniqueModules: 2, dependencyModules: 1, occurrences: 3, compositionEdges: 2, maxDepth: 1 });
  const shared = report.modules.find(module => module.name === "ratio")!;
  expect(shared.sources).toEqual(["first.algal", "second.algal"]);
  expect(shared.occurrences).toBe(2);
  expect(report.sourceUnits.filter(unit => unit.source !== "main.algal").map(unit => unit.manifestDigest)).toEqual([shared.manifestDigest, shared.manifestDigest]);
  expect(report.sourceUnits.map(unit => unit.sourceDigest)).toHaveLength(3);
  expect(new Set(report.sourceUnits.map(unit => unit.sourceDigest)).size).toBe(3);
  expect(report.occurrences.slice(1).map(occurrence => [occurrence.path.join("/"), occurrence.source, occurrence.caller?.origin?.span.start.line])).toEqual([["b1-a", "first.algal", 3], ["result", "second.algal", 4]]);
});

const effectSources = {
  "triage.algal": `program triage(note: text) -> json {
  budget { max_agent_calls: 1 }
  let intent = decide "Is this urgent?" using note
    as choice { hot: "Needs attention now", cold: "Can wait" }
  return { label: intent.value }
}`,
  "ping.algal": 'program ping() -> text { budget { max_agent_calls: 1 } return generate "Say pong" using {} }',
  "unused.algal": 'program unused() -> text { budget { max_agent_calls: 1 } return generate "never" using {} }',
};
const effectEntry = `import triage from "./triage.algal"
import ping from "./ping.algal"
import unused from "./unused.algal"
program outer(flag: json, notes: json) -> json {
  budget { max_agent_calls: 5, max_depth: 3 }
  let verdicts = each triage over note in notes using {} max_items 3
  let extra = if flag { call ping using {} } else { "skip" }
  return { verdicts: verdicts, extra: extra }
}`;

test("effects are direct per module, transitive through branches and each, and absent for uncalled imports", async () => {
  const report = await createSourceDependencyReport(effectEntry, { sourceOptions: { modules: effectSources } });
  expect(report.analysis).toEqual({ maxAgentCalls: 4, requiredDepth: 2 });
  expect(report.counts).toEqual({ sourceUnits: 4, uniqueModules: 4, dependencyModules: 3, occurrences: 4, compositionEdges: 3, maxDepth: 2 });
  expect(report.sourceUnits.map(unit => [unit.source, unit.calledFromEntry])).toEqual([["main.algal", true], ["ping.algal", true], ["triage.algal", true], ["unused.algal", false]]);
  const named = Object.fromEntries(report.modules.map(module => [module.generated ? "wrapper" : module.name, module]));
  expect(named.outer!.effects).toEqual({ direct: [], transitive: ["agent", "decide"] });
  expect(named.triage!.effects).toEqual({ direct: ["decide"], transitive: ["decide"] });
  expect(named.ping!.effects).toEqual({ direct: ["agent"], transitive: ["agent"] });
  expect(named.wrapper).toMatchObject({ key: "organism:source-call-trigger", generated: true, sources: [], occurrences: 1, effects: { direct: [], transitive: ["agent"] } });
  expect(Object.keys(named.wrapper!.interface.inputs)).toEqual(["trigger"]);
  expect(named.wrapper!.interface.inputs.trigger?.type).toBe("json");
  expect(named.wrapper!.interface.outputs.result?.type).toBe("text");
  expect(named.wrapper!.budgets.maxAgentCalls).toBe(1);
  expect(report.modules.some(module => module.name === "unused")).toBe(false);
  expect(report.occurrences.map(occurrence => occurrence.path.join("/"))).toEqual(["", "b1-verdicts-each", "branch-1-arm-1", "branch-1-arm-1/call"]);
  const [, each, wrapper, inner] = report.occurrences;
  expect(each!.caller).toMatchObject({ kind: "each", maxItems: 3, cellId: "b1-verdicts-each" });
  expect(wrapper).toMatchObject({ generated: true, manifestDigest: named.wrapper!.manifestDigest });
  expect(wrapper!.source).toBeUndefined();
  expect(wrapper!.caller).toMatchObject({ path: [], cellId: "branch-1-arm-1", kind: "call" });
  expect(wrapper!.caller?.origin).toMatchObject({ source: "main.algal", role: "call" });
  expect(inner).toMatchObject({ source: "ping.algal", generated: false, caller: { path: ["branch-1-arm-1"], cellId: "call", kind: "call" } });
  expect(inner!.caller?.origin).toBeUndefined();
  const text = renderSourceDependencies(report);
  expect(text).toContain("unused.algal");
  expect(text).toContain("imported but not called");
  expect(text).toContain("Guarded parameterless call (generated) · no source file");
  expect(text).toContain("branch-1-arm-1/call  ping  ping.algal ← branch-1-arm-1 (generated) [call]");
});

test("unclassified reachable cell kinds are rejected instead of defaulting to pure", () => {
  const base: OrganismManifest = {
    contract: "algal.organism.v1", key: "organism:probe", name: "probe",
    budgets: { maxSteps: 8, maxAgentCalls: 0, maxWork: 1000, maxContextBytes: 1024, maxOutputBytes: 1024, maxDepth: 1 },
    cells: [{ id: "input", kind: "input", outputs: { x: { type: "json" } } }], edges: [],
  };
  expect(classifySourceDependencyCells(base)).toEqual({ effects: [] });
  expect(classifySourceDependencyCells({ ...base, cells: [...base.cells, { id: "d", kind: "decide", inputs: {}, questions: {}, view: { inputs: "*" } } as unknown as OrganismManifest["cells"][number], { id: "a", kind: "agent", inputs: {}, prompt: "p", view: { inputs: "*" }, output: { kind: "text" } }] })).toEqual({ effects: ["agent", "decide"] });
  for (const cell of [
    { id: "f", kind: "fn", fn: "identity" }, { id: "t", kind: "tool", tool: "http" }, { id: "r", kind: "repeat", manifest: "sha256:0", maxRounds: 1 },
    { id: "s", kind: "spawn" }, { id: "c", kind: "const", outputs: {} }, { id: "g", kind: "gate", inputs: {}, prompt: "", view: { inputs: "*" }, output: { kind: "choice", labels: ["a"] } },
    { id: "p1", kind: "constructor" }, { id: "p2", kind: "toString" }, { id: "p3", kind: "__proto__" }, { id: "p4", kind: "hasOwnProperty" },
  ] as unknown as OrganismManifest["cells"]) {
    expect(() => classifySourceDependencyCells({ ...base, cells: [...base.cells, cell] }), cell.kind).toThrow(/does not classify/);
    try { classifySourceDependencyCells({ ...base, cells: [cell] }); }
    catch (error) { expect(error instanceof AlgalError && error.code).toBe("MANIFEST_INVALID"); }
  }
  expect(Object.keys(SOURCE_DEPENDENCY_CELL_KINDS).sort()).toEqual(["agent", "decide", "each", "expr", "input", "organism"]);
  expect(() => classifySourceDependencyCells({ ...base, cells: [{ id: "f", kind: "fn", fn: "identity" }] })).toThrow(/does not classify/);
  expect(Object.isFrozen(SOURCE_DEPENDENCY_BOUNDS) && Object.isFrozen(SOURCE_DEPENDENCY_BOUNDS.bundle)).toBe(true);
  expect(SOURCE_DEPENDENCY_BOUNDS.maxOccurrences).toBe(COMPILE_BOUNDS.maxInstances);
});

test("a bundle is checked against the recompiled closure without repairing missing children from source", async () => {
  const { bundle, source, options } = await plannerBundle();
  const plain = await createSourceDependencyReport(source, { sourceOptions: options });
  const checked = await createSourceDependencyReport(source, { sourceOptions: options, bundle: json(bundle) });
  expect(checked.bundle).toEqual({ root: bundle.root, manifests: 6, values: 0, reachable: 6, unreachable: 0 });
  const { bundle: _bundle, ...rest } = checked;
  expect(json(rest)).toEqual(json(plain));
  const clamp = plain.modules.find(module => module.name === "clamp")!.manifestDigest;
  const missing = json(bundle);
  delete (missing.manifests as JsonObject)[clamp];
  expect((await failure(createSourceDependencyReport(source, { sourceOptions: options, bundle: missing }))).code).toBe("STORE_MISS");
  const altered = json(bundle);
  ((altered.manifests as JsonObject)[clamp] as JsonObject).name = "clamp-modified";
  expect((await failure(createSourceDependencyReport(source, { sourceOptions: options, bundle: altered }))).code).toBe("DIGEST_MISMATCH");
  const other = await loadSourceProject(ratios);
  const otherStore = new MemoryStore();
  for (const module of other.modules) await otherStore.putManifest(module);
  const otherBundle = await packOrganism(other.manifest, otherStore);
  const wrongRoot = await failure(createSourceDependencyReport(source, { sourceOptions: options, bundle: json(otherBundle) }));
  expect(wrongRoot.code).toBe("DIGEST_MISMATCH");
  expect(wrongRoot.message).toContain("bundle root");
  const extra = json(bundle);
  const extraDigest = digestCanonical(manifestToJson(other.manifest));
  (extra.manifests as JsonObject)[extraDigest] = manifestToJson(other.manifest);
  const withExtra = await createSourceDependencyReport(source, { sourceOptions: options, bundle: extra });
  expect(withExtra.bundle).toEqual({ root: bundle.root, manifests: 7, values: 0, reachable: 6, unreachable: 1 });
  expect(withExtra.counts).toEqual(plain.counts);
  expect(withExtra.modules.map(module => module.manifestDigest)).toEqual(plain.modules.map(module => module.manifestDigest));
  const malformed = json(bundle);
  (malformed.manifests as JsonObject)[extraDigest] = { contract: "algal.organism.v1", key: "organism:broken" };
  expect((await failure(createSourceDependencyReport(source, { sourceOptions: options, bundle: malformed }))).code).toBe("PARSE_FAILED");
  const misfiled = json(bundle);
  (misfiled.manifests as JsonObject)[digestCanonical({ unrelated: true })] = manifestToJson(other.manifest);
  expect((await failure(createSourceDependencyReport(source, { sourceOptions: options, bundle: misfiled }))).code).toBe("DIGEST_MISMATCH");
  const notBundle = await failure(createSourceDependencyReport(source, { sourceOptions: options, bundle: { contract: "algal.bundle.v1", root: bundle.root, manifests: bundle.manifests, values: {}, extra: 1 } }));
  expect(notBundle.code).toBe("PARSE_FAILED");
});

function ladder(levels: number): { source: string; modules: Record<string, string> } {
  const modules: Record<string, string> = {};
  for (let level = 1; level <= levels; level++) {
    modules[`l${level}.algal`] = level === levels
      ? `program l${level}(x: json) -> json { budget { max_agent_calls: 0 } return x }`
      : `import next from "./l${level + 1}.algal"
program l${level}(x: json) -> json { budget { max_agent_calls: 0, max_depth: 8 }
  let a = call next using { x: x }
  let b = call next using { x: x }
  let c = call next using { x: x }
  return [a, b, c]
}`;
  }
  return { source: modules["l1.algal"]!, modules };
}

test("a small shared DAG expands to counted occurrences until graph admission refuses it", async () => {
  const six = ladder(6);
  const report = await createSourceDependencyReport(six.source, { sourceOptions: { entry: "l1.algal", modules: six.modules } });
  expect(report.counts).toEqual({ sourceUnits: 6, uniqueModules: 6, dependencyModules: 5, occurrences: 364, compositionEdges: 363, maxDepth: 5 });
  expect(report.modules.map(module => module.occurrences).sort((left, right) => left - right)).toEqual([1, 3, 9, 27, 81, 243]);
  expect(report.occurrences.every(occurrence => !occurrence.generated)).toBe(true);
  expect(SOURCE_DEPENDENCY_BOUNDS.maxReportBytes).toBe(8_388_608);
  expect(utf8Length(canonicalize(report as unknown as JsonValue))).toBeLessThan(SOURCE_DEPENDENCY_BOUNDS.maxReportBytes / 16);
  const seven = ladder(7);
  const refused = await failure(createSourceDependencyReport(seven.source, { sourceOptions: { entry: "l1.algal", modules: seven.modules } }));
  expect(refused.code).toBe("BUDGET_EXHAUSTED");
});

test("hostile bundle data is refused at the snapshot boundary without invoking accessors", async () => {
  const { bundle, source, options } = await plannerBundle();
  const inspect = (value: unknown) => createSourceDependencyReport(source, { sourceOptions: options, bundle: value });
  const code = async (value: unknown) => (await failure(inspect(value))).code;
  // Payloads sit under valid digest keys: bundle parsing alone would admit or
  // canonicalize them, so only the snapshot can be what rejects them.
  const withValue = (payload: unknown, shape: JsonValue) => ({ ...json(bundle), values: { [digestCanonical(shape)]: payload } });
  const cyclic: Record<string, unknown> = { a: 1 };
  cyclic.self = cyclic;
  expect(await code(withValue(cyclic, { a: 1 }))).toBe("PARSE_FAILED");
  let nested: unknown = [];
  for (let depth = 0; depth < 130; depth++) nested = [nested];
  expect(await code(withValue(nested, []))).toBe("BUDGET_EXHAUSTED");
  expect(await code(withValue(Array.from({ length: 17 }, () => new Array<null>(60_000).fill(null)), []))).toBe("BUDGET_EXHAUSTED");
  expect(await code(withValue(new Array<null>(65_537).fill(null), []))).toBe("BUDGET_EXHAUSTED");
  expect(await code(withValue(Object.fromEntries(Array.from({ length: 65_537 }, (_, index) => [`k${index}`, 0])), {}))).toBe("BUDGET_EXHAUSTED");
  expect(await code(withValue("x".repeat(1_048_577), ""))).toBe("BUDGET_EXHAUSTED");
  // Escaped bytes are counted without building the escaped text.
  expect(await code(withValue(String.fromCodePoint(1).repeat(1_100_000), ""))).toBe("BUDGET_EXHAUSTED");
  // Shared subobjects are charged per occurrence against the cumulative limit.
  const shared = { text: "y".repeat(1_048_576) };
  expect(await code(withValue(Array.from({ length: 100 }, () => shared), []))).toBe("BUDGET_EXHAUSTED");
  const large = new Array<number>(4_000_000).fill(0);
  const started = performance.now();
  expect(await code(withValue(large, []))).toBe("BUDGET_EXHAUSTED");
  expect(await code(withValue(new Uint8Array(4_000_000), {}))).toBe("PARSE_FAILED");
  expect(performance.now() - started).toBeLessThan(2_000);
  for (const [payload, shape] of [
    [{ a: Number.NaN }, { a: null }], [{ a: Number.POSITIVE_INFINITY }, { a: null }], [{ a: 1, b: undefined }, { a: 1 }],
    [{ a: 10n }, { a: 10 }], [{ a: Symbol("s") }, { a: null }], [{ a: () => 1 }, { a: null }],
    [{ a: new Date(0) }, { a: "1970-01-01T00:00:00.000Z" }], [{ a: new Map() }, { a: {} }], [Object.create({ inherited: 1 }) as object, {}],
  ] as const) {
    expect(await code(withValue(payload, shape as JsonValue)), JSON.stringify(shape)).toBe("PARSE_FAILED");
  }
  const sparse = new Array<number>(3);
  sparse[0] = 1;
  sparse[2] = 3;
  expect(await code(withValue(sparse, [1, null, 3]))).toBe("PARSE_FAILED");
  const decorated: unknown[] = [1, 2];
  (decorated as unknown as Record<string, unknown>).extra = true;
  expect(await code(withValue(decorated, [1, 2]))).toBe("PARSE_FAILED");
  const hidden: Record<string, unknown> = { a: 1 };
  Object.defineProperty(hidden, "shadow", { value: 1, enumerable: false });
  expect(await code(withValue(hidden, { a: 1 }))).toBe("PARSE_FAILED");
  let reads = 0;
  const trapped: Record<string, unknown> = {};
  Object.defineProperty(trapped, "a", { get: () => { reads++; return 1; }, enumerable: true });
  expect(await code(withValue(trapped, { a: 1 }))).toBe("PARSE_FAILED");
  let serialized = 0;
  const custom = { a: 1, toJSON: () => { serialized++; return { a: 1 }; } };
  expect(await code(withValue(custom, { a: 1 }))).toBe("PARSE_FAILED");
  expect(reads + serialized).toBe(0);
  // Every read of the supplied artifact happens before the first await, so
  // later reads never occur and later mutation cannot change the capture.
  let traps = 0;
  const target = json(bundle);
  const observed = new Proxy(target, {
    ownKeys: value => { traps++; return Reflect.ownKeys(value); },
    getOwnPropertyDescriptor: (value, key) => { traps++; return Reflect.getOwnPropertyDescriptor(value, key); },
    get: (value, key, receiver) => { traps++; return Reflect.get(value, key, receiver); },
  });
  const pending = inspect(observed);
  const synchronous = traps;
  expect(synchronous).toBeGreaterThan(0);
  for (const key of Object.keys(target.manifests as JsonObject)) delete (target.manifests as JsonObject)[key];
  expect((await pending).bundle?.reachable).toBe(6);
  expect(traps).toBe(synchronous);
  const report = await inspect(json(bundle));
  expect(() => renderSourceDependencies(structuredClone(report))).toThrow(/created by createSourceDependencyReport/);
  expect(() => renderSourceDependencies({ ...report })).toThrow();
  expect(() => renderSourceDependencies(JSON.parse(JSON.stringify(report)) as SourceDependencyReport)).toThrow();
  expect(() => { (report as { entry: string }).entry = "forged.algal"; }).toThrow();
});

test("rendered labels neutralize terminal controls and direction overrides", async () => {
  // The loader already rejects C0 controls in keys; C1 controls and direction overrides pass through.
  const override = String.fromCodePoint(0x202e), nextLine = String.fromCodePoint(0x85), replacement = String.fromCodePoint(0xfffd);
  const key = `notes${override}${nextLine}[31m.algal`;
  const source = `import helper from "./${key}"
program main(x: json) -> json { budget { max_agent_calls: 0 } return call helper using { x: x } }`;
  const report = await createSourceDependencyReport(source, { sourceOptions: { modules: { [key]: "program helper(x: json) -> json { budget { max_agent_calls: 0 } return x }" } } });
  expect(report.sourceUnits.map(unit => unit.source)).toContain(key);
  const text = renderSourceDependencies(report);
  expect(text).not.toContain(override);
  expect(text).not.toContain(nextLine);
  expect(text).toContain(`notes${replacement}${replacement}[31m.algal`);
  expect(canonicalize(report as unknown as JsonValue)).toContain(override);
});

test("reports omit prompts, literals, comments and annotations while keeping structural labels", async () => {
  const sentinels = ["SENTINEL_LITERAL", "SENTINEL_INSTRUCTION", "SENTINEL_CONTEXT", "SENTINEL_QUESTION", "SENTINEL_CRITERIA", "SENTINEL_COMMENT", "SENTINEL_CHILD"];
  const modules = {
    "child/rank.algal": `// SENTINEL_COMMENT in the child
program rank(note: text) -> json {
  budget { max_agent_calls: 1 }
  let intent = decide "SENTINEL_QUESTION" using note
    as choice { hot: "SENTINEL_CRITERIA", cold: "SENTINEL_CHILD" }
  return { label: intent.value, fixed: "SENTINEL_LITERAL" }
}`,
    "child/ping.algal": 'program ping() -> text { budget { max_agent_calls: 1 } return generate "SENTINEL_INSTRUCTION" using { note: "SENTINEL_CONTEXT" } }',
  };
  const source = `// SENTINEL_COMMENT at the root
import rank from "./child/rank.algal"
import ping from "./child/ping.algal"
program main(flag: json, note: text) -> json {
  budget { max_agent_calls: 2, max_depth: 3 }
  let ranked = call rank using { note: note }
  let extra = if flag { call ping using {} } else { "SENTINEL_LITERAL" }
  return { ranked: ranked, extra: extra }
}`;
  const report = await createSourceDependencyReport(source, { sourceOptions: { modules } });
  const rendered = [canonicalize(report as unknown as JsonValue), renderSourceDependencies(report)];
  for (const output of rendered) for (const sentinel of sentinels) expect(output).not.toContain(sentinel);
  for (const output of rendered) {
    expect(output).toContain("child/rank.algal");
    expect(output).toContain("child/ping.algal");
    expect(output).toContain(report.rootManifestDigest);
  }
  expect(report.modules.find(module => module.name === "rank")!.interface.inputs).toEqual({ note: { type: "text" } });
  expect(report.occurrences[1]!.caller?.origin?.span.start.line).toBe(6);
  expect(report.occurrences.some(occurrence => occurrence.generated)).toBe(true);
  expect(JSON.stringify(report)).not.toContain("annotation");
  expect(JSON.stringify(report)).not.toContain("excerpt");
});

test("a program without calls reports one module and no edges", async () => {
  const report = await createSourceDependencyReport("program alone(x: json) -> json { budget { max_agent_calls: 0 } return x }");
  expect(report.counts).toEqual({ sourceUnits: 1, uniqueModules: 1, dependencyModules: 0, occurrences: 1, compositionEdges: 0, maxDepth: 0 });
  expect(report.modules[0]!.occurrences).toBe(1);
  expect(renderSourceDependencies(report)).toContain("(root)  alone  main.algal\n");
  const fixture = await readFile(planner, "utf8");
  expect(fixture).toContain("import plan_task");
});

test("a second entry shares helper digests and reports three clamp occurrences", async () => {
  const inspector = await loadSourceProject(`${import.meta.dir}/../examples/source/projects/task-planning/inspect_task.algal`);
  const reference = await loadSourceProject(planner);
  const report = await createSourceDependencyReport(inspector.source, { sourceOptions: inspector.compilerOptions });
  const expected = await createSourceDependencyReport(reference.source, { sourceOptions: reference.compilerOptions });
  expect(report.entry).toBe("inspect_task.algal");
  expect(report.counts).toEqual({ sourceUnits: 3, uniqueModules: 3, dependencyModules: 2, occurrences: 5, compositionEdges: 4, maxDepth: 2 });
  const digest = (source: SourceDependencyReport, name: string) => source.modules.find(module => module.name === name)!.manifestDigest;
  for (const name of ["score_task", "clamp"]) expect(digest(report, name)).toBe(digest(expected, name));
  expect(report.modules.find(module => module.name === "clamp")!.occurrences).toBe(3);
  expect(report.occurrences.filter(occurrence => occurrence.source === "lib/clamp.algal").map(occurrence => occurrence.path.join("/"))).toEqual(["b1-score/b1-urgency", "b1-score/b2-impact", "b2-gap"]);
  expect(report.occurrences.find(occurrence => occurrence.path.join("/") === "b2-gap")!.caller?.origin).toMatchObject({ source: "inspect_task.algal", role: "call" });
});

test("an imported but uncalled file stays uncalled even when a called file shares its digest", async () => {
  const helper = "program helper(x: json) -> json { budget { max_agent_calls: 0 } return x }";
  const source = `import used from "./used.algal"
import spare from "./spare.algal"
program main(x: json) -> json { budget { max_agent_calls: 0 } return call used using { x: x } }`;
  const modules = { "used.algal": helper, "spare.algal": helper };
  const report = await createSourceDependencyReport(source, { sourceOptions: { modules } });
  expect(report.counts).toEqual({ sourceUnits: 3, uniqueModules: 2, dependencyModules: 1, occurrences: 2, compositionEdges: 1, maxDepth: 1 });
  const units = Object.fromEntries(report.sourceUnits.map(unit => [unit.source, unit]));
  expect(units["used.algal"]!.manifestDigest).toBe(units["spare.algal"]!.manifestDigest);
  expect(units["used.algal"]!.calledFromEntry).toBe(true);
  expect(units["spare.algal"]!.calledFromEntry).toBe(false);
  expect(report.modules.find(module => module.name === "helper")!.sources).toEqual(["used.algal"]);
  // Building the report changes neither the executable digests nor the source-map digests.
  const compiled = compileSource(source, { modules });
  expect(report.rootManifestDigest).toBe(compiled.sourceMap.manifestDigest);
  expect(report.sourceUnits.map(unit => unit.sourceDigest)).toEqual(Object.keys(compiled.project.units).sort().map(key => compiled.project.units[key]!.sourceDigest));
});
