import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { digestCanonical } from "./digest";
import { scriptedExecutor } from "./effects";
import { AlgalError } from "./errors";
import { builtinRegistry } from "./registry";
import { runOrganism, RUNTIME_VERSION } from "./run";
import { loadSourceProject, type SourceProject } from "./source-project";
import {
  createSourceLock, parseSourceLock, parseSourceLockCases, renderSourceLockVerification, sourceLockFixtureKeys, sourceLockToJson,
  verifySourceLock, SOURCE_LOCK_BOUNDS, type SourceLockCase, type SourceLockVerification,
} from "./source-lock";
import { MemoryStore } from "./store-memory";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

const projects = `${import.meta.dir}/../examples/source/projects`;
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const failure = async (work: Promise<unknown> | (() => unknown)): Promise<AlgalError> => {
  try { await (typeof work === "function" ? work() : work); }
  catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
const kinds = (verification: SourceLockVerification) => verification.drift.reduce<Record<string, number>>((counts, entry) => ({ ...counts, [entry.kind]: (counts[entry.kind] ?? 0) + 1 }), {});
const subjects = (verification: SourceLockVerification, kind: string) => verification.drift.filter(entry => entry.kind === kind).map(entry => entry.subject);
const ORDER = ["entry", "compiler", "source", "unit", "root", "closure", "interface", "analysis", "version", "evaluation"];
const ordered = (verification: SourceLockVerification) => verification.drift.every((entry, index) => index === 0 || ORDER.indexOf(verification.drift[index - 1]!.kind) <= ORDER.indexOf(entry.kind));
const text = async (path: string) => readFile(path, "utf8");
const edit = (project: SourceProject, key: string, from: string, to: string) => {
  const modules = project.compilerOptions.modules;
  expect(modules[key]).toContain(from);
  return { entry: project.entry, modules: { ...modules, [key]: modules[key]!.replace(from, to) } };
};

async function planner() {
  const project = await loadSourceProject(`${projects}/task-planning/main.algal`);
  const args = await text(`${projects}/task-planning/main.args.json`);
  const invalid = JSON.stringify({ input: { tasks: [{ id: "x", title: "Late", status: "open", urgency: "soon", impact: 1 }], weights: { urgency: 2, impact: 1 } } });
  const fixtures = { "main.args.json": args, "fixtures/bad-urgency.args.json": invalid };
  const cases: SourceLockCase[] = [
    { name: "three-tasks", args: "main.args.json" },
    { name: "bad-urgency", args: "fixtures/bad-urgency.args.json", outcome: "failed" },
  ];
  const units = project.project.units;
  const versions = { "clamp-2026-09": units["lib/clamp.algal"]!.manifestDigest, "policy-2026-09": units["choose_action.algal"]!.manifestDigest, planner: project.sourceMap.manifestDigest };
  const lock = json(sourceLockToJson(await createSourceLock(project.source, project.compilerOptions, { evaluation: cases, fixtures, versions })));
  return { project, args, fixtures, cases, versions, lock };
}

test("a lock pins evaluation cases and version labels, round-trips canonically, and replays offline", async () => {
  const { project, args, fixtures, cases, versions, lock } = await planner();
  const evaluation = lock.evaluation as JsonObject;
  expect(evaluation.runtime).toBe(RUNTIME_VERSION);
  const pinned = evaluation.cases as JsonObject[];
  expect(pinned.map(item => item.name)).toEqual(["bad-urgency", "three-tasks"]);
  expect(pinned.map(item => item.outcome)).toEqual(["failed", "complete"]);
  expect(pinned[1]!.args).toEqual({ path: "main.args.json", digest: digestCanonical(JSON.parse(args) as JsonValue) });
  expect(Object.hasOwn(pinned[1]!, "responses")).toBe(false);
  // The outputs digest covers the interface outputs object that `algal call --interface` prints.
  const store = new MemoryStore();
  for (const module of project.modules) await store.putManifest(module);
  const receipt = await runOrganism({ manifest: project.manifest, args: JSON.parse(args) as Record<string, Record<string, JsonValue>>, fns: builtinRegistry(), store, executors: [scriptedExecutor({})] });
  const outputs = { result: receipt.cells.result!.outputs!.out! };
  expect((outputs.result as { score: number }[]).map(row => row.score)).toEqual([13, 4, 15]);
  expect(pinned[1]!.outputs).toBe(digestCanonical(outputs));
  expect(pinned[0]!.outputs).toBe(digestCanonical({}));
  expect(lock.versions).toEqual(versions);
  // Canonical bytes are stable: same request in another order, and a parse round trip.
  const again = await createSourceLock(project.source, project.compilerOptions, { evaluation: [...cases].reverse(), fixtures, versions });
  expect(canonicalize(sourceLockToJson(again))).toBe(canonicalize(lock));
  expect(canonicalize(sourceLockToJson(parseSourceLock(lock)))).toBe(canonicalize(lock));
  expect(Object.isFrozen(again.evaluation!.cases[0]!.args) && Object.isFrozen(again.versions)).toBe(true);
  // Optional sections leave a plain lock's JSON, and so its digest, unchanged.
  const plain = json(sourceLockToJson(await createSourceLock(project.source, project.compilerOptions)));
  expect(Object.keys(plain).sort()).toEqual(["analysis", "compiler", "contract", "entry", "interfaces", "modules", "root", "units"]);
  const { evaluation: _evaluation, versions: _versions, ...rest } = lock;
  expect(canonicalize(rest)).toBe(canonicalize(plain));
  const replayed = await verifySourceLock(project.source, project.compilerOptions, lock, { fixtures });
  expect(replayed).toMatchObject({ ok: true, drift: [], truncated: false, evaluation: { cases: 2, replayed: true } });
  expect(replayed.lockDigest).toBe(digestCanonical(lock));
  expect(renderSourceLockVerification(replayed)).toBe(`ALGAL source lock · verified · lock ${replayed.lockDigest} · root ${lock.root}\nThe source compiles to the locked closure.\nEvaluation: 2 pinned cases replayed offline.\n`);
  const unreplayed = await verifySourceLock(project.source, project.compilerOptions, lock);
  expect(unreplayed).toMatchObject({ ok: true, evaluation: { cases: 2, replayed: false } });
  expect(renderSourceLockVerification(unreplayed)).toContain("Evaluation: 2 pinned cases, not replayed.");
  expect(sourceLockFixtureKeys(parseSourceLock(lock))).toEqual(["fixtures/bad-urgency.args.json", "main.args.json"]);
  expect(sourceLockFixtureKeys(cases)).toEqual(sourceLockFixtureKeys(parseSourceLock(lock)));
});

test("evaluation drift is its own kind: fixture edits, pinned result edits, behavior changes, and refactors", async () => {
  const { project, fixtures, lock } = await planner();
  const verify = (value: JsonObject, supplied: Record<string, string> = fixtures, options = project.compilerOptions) => verifySourceLock(project.source, options, value, { fixtures: supplied });
  // A fixture edit moves the fixture digest and, here, the outputs.
  const reweighted = JSON.stringify({ ...JSON.parse(fixtures["main.args.json"]) as JsonObject, input: { ...(JSON.parse(fixtures["main.args.json"]) as { input: JsonObject }).input, weights: { urgency: 1, impact: 1 } } });
  const fixture = await verify(lock, { ...fixtures, "main.args.json": reweighted });
  expect(fixture.ok).toBe(false);
  expect(fixture.drift.map(entry => [entry.kind, entry.subject])).toEqual([["evaluation", "three-tasks/args"], ["evaluation", "three-tasks/outputs"]]);
  // Formatting a fixture changes no canonical JSON, so nothing drifts.
  const formatted = await verify(lock, { ...fixtures, "main.args.json": JSON.stringify(JSON.parse(fixtures["main.args.json"]), null, 4) });
  expect(formatted.ok).toBe(true);
  // A pinned result that no longer matches is reported by field.
  const cases = (lock.evaluation as { cases: JsonObject[] }).cases;
  const zero = `sha256:${"0".repeat(64)}`;
  const outputs = await verify({ ...lock, evaluation: { ...(lock.evaluation as JsonObject), cases: [cases[0]!, { ...cases[1]!, outputs: zero }] } });
  expect(outputs.drift).toEqual([{ kind: "evaluation", subject: "three-tasks/outputs", expected: zero, actual: cases[1]!.outputs as string }]);
  const outcome = await verify({ ...lock, evaluation: { ...(lock.evaluation as JsonObject), cases: [{ ...cases[0]!, outcome: "complete" }, cases[1]!] } });
  expect(outcome.drift).toEqual([{ kind: "evaluation", subject: "bad-urgency/outcome", expected: "complete", actual: "failed" }]);
  const runtime = await verify({ ...lock, evaluation: { ...(lock.evaluation as JsonObject), runtime: "0.0.9" } });
  expect(runtime.drift).toEqual([{ kind: "evaluation", subject: "runtime", expected: "0.0.9", actual: RUNTIME_VERSION }]);
  expect(renderSourceLockVerification(runtime)).toContain("  evaluation runtime: expected 0.0.9, actual 0.1.0");
  // A behavior change drifts the pinned outputs as well as the closure.
  const behavior = edit(project, "lib/clamp.algal", "else { value }", "else { value + 1 }");
  const changed = await verify(lock, fixtures, behavior);
  expect(kinds(changed)).toEqual({ source: 1, unit: 4, root: 1, closure: 6, version: 2, evaluation: 1 });
  expect(subjects(changed, "evaluation")).toEqual(["three-tasks/outputs"]);
  expect(ordered(changed)).toBe(true);
  expect(changed.drift.at(-1)!.kind).toBe("evaluation");
  // An equivalent refactor moves digests but reproduces every pinned result.
  const refactor = edit(project, "lib/clamp.algal",
    "return if value < minimum { minimum } else { if value > maximum { maximum } else { value } }",
    "return if value > maximum { maximum } else { if value < minimum { minimum } else { value } }");
  const equivalent = await verify(lock, fixtures, refactor);
  expect(equivalent.ok).toBe(false);
  expect(kinds(equivalent).evaluation).toBeUndefined();
  expect(kinds(equivalent)).toMatchObject({ source: 1, unit: 4, root: 1 });
  // Without fixtures the refactor and the behavior change look alike: no case runs.
  const unreplayed = await verifySourceLock(project.source, behavior, lock);
  expect(kinds(unreplayed).evaluation).toBeUndefined();
  expect(unreplayed.evaluation).toEqual({ cases: 2, replayed: false });
});

test("a case whose replay fails is reported by field, and writing refuses an unexpected outcome", async () => {
  const project = await loadSourceProject(`${projects}/inbox/inbox.algal`);
  const read = (name: string) => text(`${projects}/inbox/${name}`);
  const fixtures = {
    "inbox.args.json": await read("inbox.args.json"), "inbox.responses.json": await read("inbox.responses.json"),
    "inbox.empty.args.json": await read("inbox.empty.args.json"), "inbox.empty.responses.json": await read("inbox.empty.responses.json"),
  };
  const cases: SourceLockCase[] = [
    { name: "three-emails", args: "inbox.args.json", responses: "inbox.responses.json" },
    { name: "empty", args: "inbox.empty.args.json", responses: "inbox.empty.responses.json" },
  ];
  const lock = json(sourceLockToJson(await createSourceLock(project.source, project.compilerOptions, { evaluation: cases, fixtures })));
  const pinned = (lock.evaluation as { cases: JsonObject[] }).cases;
  expect(pinned.map(item => [item.name, item.outcome])).toEqual([["empty", "complete"], ["three-emails", "complete"]]);
  const expected = JSON.parse(await read("inbox.expected.json")) as JsonValue;
  expect(pinned[1]!.outputs).toBe(digestCanonical({ result: expected }));
  expect((await verifySourceLock(project.source, project.compilerOptions, lock, { fixtures })).ok).toBe(true);
  // One scripted answer for four executor attempts: the replay fails.
  const short = JSON.stringify({ result: ["Only one answer."] });
  const failed = await verifySourceLock(project.source, project.compilerOptions, lock, { fixtures: { ...fixtures, "inbox.responses.json": short } });
  expect(failed.ok).toBe(false);
  expect(failed.drift.map(entry => entry.subject)).toEqual(["three-emails/responses", "three-emails/outcome", "three-emails/outputs"]);
  expect(failed.drift.find(entry => entry.subject === "three-emails/outcome")).toMatchObject({ expected: "complete", actual: "failed" });
  expect(failed.drift.find(entry => entry.subject === "three-emails/outputs")!.actual).toBe(digestCanonical({}));
  // Unchanged fixtures, changed program: a helper that now fails at runtime.
  const planner = await loadSourceProject(`${projects}/task-planning/main.algal`);
  const plannerFixtures = { "main.args.json": await text(`${projects}/task-planning/main.args.json`) };
  const plannerLock = json(sourceLockToJson(await createSourceLock(planner.source, planner.compilerOptions, { evaluation: [{ name: "three-tasks", args: "main.args.json" }], fixtures: plannerFixtures })));
  const broken = edit(planner, "score_task.algal", "value: task.urgency", "value: task.missing");
  const regressed = await verifySourceLock(planner.source, broken, plannerLock, { fixtures: plannerFixtures });
  expect(subjects(regressed, "evaluation")).toEqual(["three-tasks/outcome", "three-tasks/outputs"]);
  expect(regressed.drift.find(entry => entry.subject === "three-tasks/outcome")).toMatchObject({ expected: "complete", actual: "failed" });
  // The writer pins a failure only when asked to; otherwise it names why the run ended.
  const unanswered = await failure(createSourceLock(project.source, project.compilerOptions, { evaluation: [{ name: "no-answers", args: "inbox.args.json" }], fixtures: { "inbox.args.json": fixtures["inbox.args.json"] } }));
  expect(unanswered.code).toBe("RECEIPT_MISMATCH");
  expect(unanswered.message).toContain("source lock case no-answers ended failed (EFFECT_UNBOUND");
  expect(unanswered.message).toContain("expected complete");
  const recorded = await createSourceLock(project.source, project.compilerOptions, { evaluation: [{ name: "no-answers", args: "inbox.args.json", outcome: "failed" }], fixtures: { "inbox.args.json": fixtures["inbox.args.json"] } });
  expect(recorded.evaluation!.cases[0]).toMatchObject({ name: "no-answers", outcome: "failed", outputs: digestCanonical({}) });
});

test("version labels drift when their digest leaves the closure, are never retargeted, and must start inside it", async () => {
  const { project, fixtures, versions, lock } = await planner();
  const changed = await verifySourceLock(project.source, edit(project, "lib/clamp.algal", "else { value }", "else { value + 1 }"), lock);
  expect(changed.drift.filter(entry => entry.kind === "version")).toEqual([
    { kind: "version", subject: "clamp-2026-09", expected: versions["clamp-2026-09"], actual: "(absent)" },
    { kind: "version", subject: "planner", expected: versions.planner, actual: "(absent)" },
  ]);
  expect(renderSourceLockVerification(changed)).toContain(`  version clamp-2026-09: expected ${versions["clamp-2026-09"]}, actual (absent)`);
  // The lock still names the old digests; verification never rewrote it.
  expect(parseSourceLock(lock).versions).toEqual(versions);
  // Labels are ordered by label bytes, including digit-only labels.
  const numbered = await verifySourceLock(project.source, edit(project, "lib/clamp.algal", "else { value }", "else { value + 1 }"),
    { ...lock, versions: { 9: versions["clamp-2026-09"], 10: versions.planner, stable: versions["policy-2026-09"] } });
  expect(subjects(numbered, "version")).toEqual(["10", "9"]);
  const outside = `sha256:${"1".repeat(64)}`;
  expect((await failure(() => parseSourceLock({ ...lock, versions: { ...versions, stray: outside } }))).message).toContain("outside the closure");
  const inspector = await loadSourceProject(`${projects}/task-planning/inspect_task.algal`);
  const request = await failure(createSourceLock(project.source, project.compilerOptions, { versions: { inspector: inspector.sourceMap.manifestDigest } }));
  expect(request.code).toBe("PARSE_FAILED");
  expect(request.message).toContain("outside the closure");
  for (const bad of ["-x", "a b", "x\ny", "", "é", "x".repeat(65), "a/b"]) {
    expect((await failure(() => parseSourceLock({ ...lock, versions: { [bad]: versions.planner } }))).code).toBe("PARSE_FAILED");
  }
  expect((await failure(() => parseSourceLock({ ...lock, versions: {} }))).message).toContain("at least one label");
  expect((await failure(() => parseSourceLock({ ...lock, versions: { planner: "latest" } }))).code).toBe("PARSE_FAILED");
  const many = Object.fromEntries(Array.from({ length: SOURCE_LOCK_BOUNDS.maxVersions + 1 }, (_, index) => [`v${index}`, versions.planner]));
  expect((await failure(() => parseSourceLock({ ...lock, versions: many }))).code).toBe("BUDGET_EXHAUSTED");
  expect((await failure(createSourceLock(project.source, project.compilerOptions, { versions: many }))).code).toBe("BUDGET_EXHAUSTED");
  expect((await verifySourceLock(project.source, project.compilerOptions, lock, { fixtures })).ok).toBe(true);
});

test("foreign evaluation data, case lists, and fixture maps are rejected before anything runs", async () => {
  const { project, fixtures, cases, lock } = await planner();
  const evaluation = lock.evaluation as { runtime: string; cases: JsonObject[] };
  const withCases = (list: unknown, extra: JsonObject = {}) => ({ ...lock, evaluation: { ...evaluation, ...extra, cases: list } });
  const parse = async (value: unknown) => failure(() => parseSourceLock(value));
  expect((await parse({ ...lock, evaluation: { ...evaluation, extra: 1 } })).message).toContain('unknown key "extra"');
  expect((await parse(withCases([{ ...evaluation.cases[0]!, note: "x" }, evaluation.cases[1]!]))).message).toContain('unknown key "note"');
  expect((await parse(withCases([{ ...evaluation.cases[0]!, args: { ...(evaluation.cases[0]!.args as JsonObject), size: 1 } }, evaluation.cases[1]!]))).code).toBe("PARSE_FAILED");
  expect((await parse(withCases([]))).message).toContain("at least one case");
  expect((await parse(withCases([...evaluation.cases].reverse()))).message).toContain("sorted by unique name");
  expect((await parse(withCases([evaluation.cases[0]!, evaluation.cases[0]!]))).message).toContain("sorted by unique name");
  expect((await parse(withCases([{ ...evaluation.cases[0]!, outcome: "passed" }, evaluation.cases[1]!]))).message).toContain("complete, failed, stuck, suspended");
  expect((await parse(withCases([{ ...evaluation.cases[0]!, outputs: "sha256:short" }, evaluation.cases[1]!]))).code).toBe("PARSE_FAILED");
  expect((await parse({ ...lock, evaluation: { ...evaluation, runtime: "0.1.0\nforged" } })).code).toBe("PARSE_FAILED");
  const twice = { ...evaluation.cases[0]!, args: { path: "main.args.json", digest: `sha256:${"2".repeat(64)}` } };
  expect((await parse(withCases([twice, evaluation.cases[1]!]))).message).toContain("pinned with two digests");
  const bulk = Array.from({ length: SOURCE_LOCK_BOUNDS.evaluation.maxCases + 1 }, (_, index) => ({ ...evaluation.cases[1]!, name: `c${String(index).padStart(2, "0")}` }));
  expect((await parse(withCases(bulk))).code).toBe("BUDGET_EXHAUSTED");
  // Fixture paths follow the compiler's key rules and stay under the source root.
  for (const path of ["../main.args.json", "/etc/passwd.json", "a//b.json", "./main.args.json", "a/../b.json", "a\\b.json", "C:main.args.json", "main.args.txt", "tab\t.json", `${String.fromCharCode(0xd800)}.json`, `${"a".repeat(508)}.json`]) {
    expect((await parse(withCases([{ ...evaluation.cases[0]!, args: { path, digest: (evaluation.cases[0]!.args as JsonObject).digest } }, evaluation.cases[1]!]))).code).toBe("PARSE_FAILED");
    expect((await failure(() => parseSourceLockCases([{ name: "x", args: path }]))).code).toBe("PARSE_FAILED");
  }
  // Requested case lists.
  expect((await failure(() => parseSourceLockCases({ cases }))).message).toContain("must be an array");
  expect((await failure(() => parseSourceLockCases([]))).message).toContain("at least one case");
  expect((await failure(() => parseSourceLockCases(bulk.map(item => ({ name: item.name, args: "main.args.json" }))))).code).toBe("BUDGET_EXHAUSTED");
  expect((await failure(() => parseSourceLockCases([{ name: "x", args: "main.args.json", expect: "complete" }]))).message).toContain('unknown key "expect"');
  expect((await failure(() => parseSourceLockCases([{ name: "x", args: "main.args.json" }, { name: "x", args: "main.args.json" }]))).message).toContain("unique");
  expect((await failure(() => parseSourceLockCases([{ name: "x", args: "main.args.json", responses: null }]))).code).toBe("PARSE_FAILED");
  expect((await failure(() => parseSourceLockCases([{ name: "x y", args: "main.args.json" }]))).code).toBe("PARSE_FAILED");
  // Fixture maps: exactly the named files, own string data, limited text and nesting, run shapes.
  const create = (supplied: unknown, list: unknown = cases) => failure(createSourceLock(project.source, project.compilerOptions, { evaluation: list as SourceLockCase[], fixtures: supplied as Record<string, string> }));
  expect((await create({ "main.args.json": fixtures["main.args.json"] })).message).toContain("omit fixtures/bad-urgency.args.json");
  expect((await create({ ...fixtures, "extra.json": "{}" })).message).toContain('"extra.json", which no case names');
  expect((await create({ ...fixtures, "main.args.json": { input: {} } })).message).toContain("must be JSON text");
  let reads = 0;
  const getter = { ...fixtures } as Record<string, unknown>;
  Object.defineProperty(getter, "main.args.json", { get: () => { reads++; return fixtures["main.args.json"]; }, enumerable: true });
  expect((await create(getter)).message).toContain("must be JSON text");
  expect(reads).toBe(0);
  expect((await create(Object.assign(Object.create({ inherited: true }) as object, fixtures))).message).toContain("plain object");
  expect((await create({ ...fixtures, [Symbol("x")]: "{}" })).message).toContain("symbol key");
  expect((await create({ ...fixtures, "main.args.json": `{"input":{"pad":"${"x".repeat(SOURCE_LOCK_BOUNDS.evaluation.maxFixtureBytes)}"}}` })).code).toBe("BUDGET_EXHAUSTED");
  expect((await create({ ...fixtures, "main.args.json": `{"input":{"x":"${"é".repeat(40_000)}"}}` })).code).toBe("BUDGET_EXHAUSTED");
  expect((await create({ ...fixtures, "main.args.json": "{not json" })).message).toContain("not valid JSON");
  expect((await create({ ...fixtures, "main.args.json": `{"input":{"deep":${"[".repeat(70)}${"]".repeat(70)}}}` })).code).toBe("BUDGET_EXHAUSTED");
  expect((await create({ ...fixtures, "main.args.json": "[1]" })).message).toContain("must be an object");
  expect((await create({ ...fixtures, "main.args.json": '{"input": 3}' })).message).toContain('cell "input"');
  expect((await create({ ...fixtures, "main.args.json": '{"input":{"n":1e400}}' })).message).toContain("finite");
  const responses = [{ name: "three-tasks", args: "main.args.json", responses: "fixtures/bad-urgency.args.json" }, { name: "r", args: "main.args.json", responses: "list.json" }];
  expect((await create({ ...fixtures, "list.json": "[]" }, responses)).message).toContain("responses fixture list.json must be an object");
  expect((await failure(createSourceLock(project.source, project.compilerOptions, { evaluation: cases }))).message).toContain("supplied together");
  expect((await failure(createSourceLock(project.source, project.compilerOptions, { fixtures }))).message).toContain("supplied together");
  const plain = json(sourceLockToJson(await createSourceLock(project.source, project.compilerOptions)));
  expect((await failure(verifySourceLock(project.source, project.compilerOptions, plain, { fixtures }))).message).toContain("pins no evaluation cases");
  expect((await failure(verifySourceLock(project.source, project.compilerOptions, lock, { fixtures: { "main.args.json": fixtures["main.args.json"] } }))).message).toContain("omit");
});

test("bounds admit the largest legal lock and keep every drift list whole", () => {
  const { maxUnits, maxModules, maxVersions, maxKeyLength, maxTokenLength } = SOURCE_LOCK_BOUNDS;
  const { maxCases } = SOURCE_LOCK_BOUNDS.evaluation;
  expect({ maxUnits, maxModules, maxVersions, maxCases, maxKeyLength, maxTokenLength }).toEqual({ maxUnits: 16, maxModules: 60, maxVersions: 16, maxCases: 16, maxKeyLength: 512, maxTokenLength: 64 });
  expect(SOURCE_LOCK_BOUNDS.evaluation.maxFixtureBytes).toBe(65_536);
  expect(SOURCE_LOCK_BOUNDS.lock.maxBytes).toBe(131_072);
  expect(Object.isFrozen(SOURCE_LOCK_BOUNDS.evaluation) && Object.isFrozen(SOURCE_LOCK_BOUNDS.evaluation.fixture)).toBe(true);
  // entry, compiler (2), source (either side), unit, root, closure (either side),
  // interfaces (paired by file, then by digest), analysis (2), labels, runtime, and four fields per case.
  const largest = 1 + 2 + 2 * maxUnits + maxUnits + 1 + 2 * maxModules + maxUnits + (maxModules + 1) + 2 + maxVersions + 1 + 4 * maxCases;
  expect(largest).toBe(332);
  expect(SOURCE_LOCK_BOUNDS.maxDrift).toBeGreaterThan(largest);
  // Every list at its limit, with the longest keys, names, and labels.
  const digest = (seed: number) => `sha256:${seed.toString(16).padStart(64, "0")}`;
  const wide = (prefix: string, suffix: string) => `${prefix}${"漢".repeat(maxKeyLength - prefix.length - suffix.length)}${suffix}`;
  const units = Array.from({ length: maxUnits }, (_, index) => ({ source: wide(String(index).padStart(2, "0"), ".algal"), sourceDigest: digest(1000 + index), manifestDigest: digest(2000 + index) }));
  const modules = Array.from({ length: maxModules }, (_, index) => digest(3000 + index));
  const root = units[0]!.manifestDigest;
  const name = (index: number) => `${String(index).padStart(2, "0")}${"n".repeat(maxTokenLength - 2)}`;
  const largestLock = {
    contract: "algal.source-lock.v1", entry: units[0]!.source, compiler: { version: "v".repeat(maxTokenLength), profile: "p".repeat(maxTokenLength) },
    units, root, modules, analysis: { maxAgentCalls: 64, requiredDepth: 8 },
    interfaces: Object.fromEntries([root, ...modules].map((key, index) => [key, digest(4000 + index)])),
    evaluation: {
      runtime: "r".repeat(maxTokenLength),
      cases: Array.from({ length: maxCases }, (_, index) => ({
        name: name(index), args: { path: wide(`a${String(index).padStart(2, "0")}`, ".json"), digest: digest(5000 + index) },
        responses: { path: wide(`r${String(index).padStart(2, "0")}`, ".json"), digest: digest(6000 + index) }, outcome: "suspended", outputs: digest(7000 + index),
      })),
    },
    versions: Object.fromEntries(Array.from({ length: maxVersions }, (_, index) => [name(index), index === 0 ? root : modules[index]!])),
  };
  const parsed = parseSourceLock(largestLock);
  expect(parsed.evaluation!.cases).toHaveLength(maxCases);
  const bytes = Buffer.byteLength(canonicalize(sourceLockToJson(parsed)));
  expect(bytes).toBeGreaterThan(90_000);
  expect(bytes).toBeLessThan(100 * 1024);
  expect(bytes).toBeLessThan(SOURCE_LOCK_BOUNDS.lock.maxBytes);
});
