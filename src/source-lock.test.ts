import { expect, test } from "bun:test";
import { BOUNDS } from "./contract";
import { digestCanonical } from "./digest";
import { AlgalError } from "./errors";
import { loadSourceProject } from "./source-project";
import { compileSource, SOURCE_PROFILE } from "./source";
import {
  createSourceLock, parseSourceLock, renderSourceLockVerification, sourceLockToJson, verifySourceLock,
  SOURCE_LOCK_BOUNDS, type SourceLock, type SourceLockVerification,
} from "./source-lock";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

const projects = `${import.meta.dir}/../examples/source/projects`;
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const failure = async (work: Promise<unknown> | (() => unknown)): Promise<AlgalError> => {
  try { await (typeof work === "function" ? work() : work); }
  catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
const kinds = (verification: SourceLockVerification) => verification.drift.reduce<Record<string, number>>((counts, entry) => ({ ...counts, [entry.kind]: (counts[entry.kind] ?? 0) + 1 }), {});
const ORDER = ["entry", "compiler", "source", "unit", "root", "closure", "interface", "analysis"];
const ordered = (verification: SourceLockVerification) => verification.drift.every((entry, index) => index === 0 || ORDER.indexOf(verification.drift[index - 1]!.kind) <= ORDER.indexOf(entry.kind));
async function plannerLock() {
  const project = await loadSourceProject(`${projects}/task-planning/main.algal`);
  return { project, lock: json(sourceLockToJson(await createSourceLock(project.source, project.compilerOptions))) };
}

test("a lock pins the planner's units, closure, analysis and interfaces, and verifies against unchanged source", async () => {
  const project = await loadSourceProject(`${projects}/task-planning/main.algal`);
  const lock = await createSourceLock(project.source, project.compilerOptions);
  expect(lock.contract).toBe("algal.source-lock.v1");
  expect(lock.entry).toBe("main.algal");
  expect(lock.compiler).toEqual({ version: SOURCE_PROFILE.compilerVersion, profile: SOURCE_PROFILE.id });
  expect(lock.units.map(unit => unit.source)).toEqual(["choose_action.algal", "lib/clamp.algal", "main.algal", "plan_task.algal", "present_task.algal", "score_task.algal"]);
  expect(lock.units.map(unit => unit.manifestDigest)).toEqual(lock.units.map(unit => project.project.units[unit.source]!.manifestDigest));
  expect(lock.units.map(unit => unit.sourceDigest)).toEqual(lock.units.map(unit => project.project.units[unit.source]!.sourceDigest));
  expect(lock.root).toBe(project.sourceMap.manifestDigest);
  expect(lock.modules).toHaveLength(5);
  expect([...lock.modules].sort()).toEqual([...lock.modules]);
  expect(lock.modules.includes(lock.root)).toBe(false);
  expect(lock.analysis).toEqual({ maxAgentCalls: 0, requiredDepth: 3 });
  expect(Object.keys(lock.interfaces).sort()).toEqual([lock.root, ...lock.modules].sort());
  expect(Object.isFrozen(lock) && Object.isFrozen(lock.units)).toBe(true);
  const serialized = json(sourceLockToJson(lock));
  const verification = await verifySourceLock(project.source, project.compilerOptions, serialized);
  expect(verification).toMatchObject({ contract: "algal.source-lock-verification.v1", ok: true, root: lock.root, drift: [], truncated: false });
  expect(verification.lockDigest).toBe(digestCanonical(serialized));
  expect(renderSourceLockVerification(verification)).toBe(`ALGAL source lock · verified · lock ${verification.lockDigest} · root ${lock.root}\nThe source compiles to the locked closure.\n`);
  const reversed = Object.fromEntries(Object.entries(project.compilerOptions.modules).reverse());
  const again = await createSourceLock(project.source, { entry: project.entry, modules: reversed });
  expect(canonicalize(sourceLockToJson(again))).toBe(canonicalize(sourceLockToJson(lock)));
  expect(canonicalize(sourceLockToJson(parseSourceLock(serialized)))).toBe(canonicalize(serialized));
  expect(() => renderSourceLockVerification(json(verification))).toThrow(/created by verifySourceLock/);
  expect(canonicalize(serialized).length).toBeLessThan(SOURCE_LOCK_BOUNDS.lock.maxBytes / 4);
});

test("drift is reported by kind: helper edits, formatting edits, interface changes, and other projects", async () => {
  const { project, lock } = await plannerLock();
  const modules = project.compilerOptions.modules;
  const edited = { ...modules, "lib/clamp.algal": modules["lib/clamp.algal"]!.replace("else { value }", "else { value + 1 }") };
  const changed = await verifySourceLock(project.source, { entry: project.entry, modules: edited }, lock);
  expect(changed.ok).toBe(false);
  expect(kinds(changed)).toEqual({ source: 1, unit: 4, root: 1, closure: 6 });
  expect(ordered(changed)).toBe(true);
  expect(changed.drift[0]).toMatchObject({ kind: "source", subject: "lib/clamp.algal" });
  expect(changed.drift.filter(entry => entry.kind === "unit").map(entry => entry.subject)).toEqual(["lib/clamp.algal", "main.algal", "plan_task.algal", "score_task.algal"]);
  const unchanged = [project.project.units["choose_action.algal"]!.manifestDigest, project.project.units["present_task.algal"]!.manifestDigest];
  expect(changed.drift.some(entry => unchanged.includes(entry.subject as never))).toBe(false);
  const moved = changed.drift.filter(entry => entry.kind === "closure");
  expect(moved.filter(entry => entry.actual === "(absent)")).toHaveLength(3);
  expect(moved.filter(entry => entry.expected === "(absent)")).toHaveLength(3);
  const text = renderSourceLockVerification(changed);
  expect(text).toContain("ALGAL source lock · drift");
  expect(text).toContain("Drift (12):");
  expect(text).toContain("source lib/clamp.algal: expected sha256:");
  const formatted = { ...modules, "lib/clamp.algal": `// formatting only\n${modules["lib/clamp.algal"]}` };
  const cosmetic = await verifySourceLock(project.source, { entry: project.entry, modules: formatted }, lock);
  expect(cosmetic.ok).toBe(false);
  expect(kinds(cosmetic)).toEqual({ source: 1 });
  // Renaming a helper parameter changes its public interface; the pair is matched by file key.
  const renamed = {
    ...modules,
    "lib/clamp.algal": modules["lib/clamp.algal"]!.replaceAll("value", "amount"),
    "score_task.algal": modules["score_task.algal"]!.replaceAll("value: task.urgency", "amount: task.urgency").replaceAll("value: task.impact", "amount: task.impact"),
  };
  const iface = await verifySourceLock(project.source, { entry: project.entry, modules: renamed }, lock);
  expect(iface.ok).toBe(false);
  expect(kinds(iface)).toMatchObject({ source: 2, unit: 4, root: 1, interface: 1 });
  expect(iface.drift.find(entry => entry.kind === "interface")).toMatchObject({ subject: "lib/clamp.algal" });
  expect(ordered(iface)).toBe(true);
  const other = await loadSourceProject(`${projects}/ratios/ratios.algal`);
  const foreign = await verifySourceLock(other.source, other.compilerOptions, lock);
  expect(foreign.ok).toBe(false);
  expect(foreign.drift[0]).toMatchObject({ kind: "entry", expected: "main.algal", actual: "ratios.algal" });
  expect(foreign.drift.some(entry => entry.kind === "root")).toBe(true);
  expect(foreign.drift.some(entry => entry.kind === "analysis" && entry.subject === "requiredDepth" && entry.expected === "3" && entry.actual === "1")).toBe(true);
});

test("tampered locks that keep their shape are caught: unit digests, interfaces, analysis, compiler, profile", async () => {
  const { project, lock } = await plannerLock();
  const verify = (value: JsonObject) => verifySourceLock(project.source, project.compilerOptions, value);
  const zero = `sha256:${"0".repeat(64)}`;
  const swapped = json(lock);
  for (const unit of swapped.units as JsonObject[]) if (unit.source !== "main.algal") unit.manifestDigest = zero;
  const units = await verify(swapped);
  expect(units.ok).toBe(false);
  // A forged file digest has no interface pin in the lock, so the pair reports an absent interface as well.
  expect(kinds(units)).toEqual({ unit: 5, interface: 5 });
  expect(units.drift.filter(entry => entry.kind === "interface").every(entry => entry.expected === "(absent)")).toBe(true);
  const forgedInterface = json(lock);
  (forgedInterface.interfaces as JsonObject)[(lock.modules as string[])[0]!] = zero;
  const interfaces = await verify(forgedInterface);
  expect(kinds(interfaces)).toEqual({ interface: 1 });
  const analysis = await verify({ ...lock, analysis: { maxAgentCalls: 2, requiredDepth: 3 } });
  expect(analysis.drift).toEqual([{ kind: "analysis", subject: "maxAgentCalls", expected: "2", actual: "0" }]);
  const stale = await verify({ ...lock, compiler: { version: "0.0.1", profile: (lock.compiler as JsonObject).profile as string } });
  expect(stale.drift).toEqual([{ kind: "compiler", subject: "version", expected: "0.0.1", actual: SOURCE_PROFILE.compilerVersion }]);
  const profile = await verify({ ...lock, compiler: { version: SOURCE_PROFILE.compilerVersion, profile: "other.profile" } });
  expect(kinds(profile)).toEqual({ compiler: 1 });
  expect(renderSourceLockVerification(profile)).toContain(`compiler profile: expected other.profile, actual ${SOURCE_PROFILE.id}`);
});

test("the inspector entry shares locked helper digests with the planner", async () => {
  const { lock: plannerLockJson } = await plannerLock();
  const planner = parseSourceLock(plannerLockJson);
  const inspector = await loadSourceProject(`${projects}/task-planning/inspect_task.algal`);
  const lock = await createSourceLock(inspector.source, inspector.compilerOptions);
  expect(lock.entry).toBe("inspect_task.algal");
  expect(lock.units).toHaveLength(3);
  const shared = lock.modules.filter(digest => planner.modules.includes(digest));
  expect(shared).toHaveLength(2);
  for (const digest of shared) expect(lock.interfaces[digest]).toBe(planner.interfaces[digest]);
});

test("foreign lock data is rejected before comparison with the failing rule named", async () => {
  const { project, lock } = await plannerLock();
  const code = async (value: unknown) => (await failure(verifySourceLock(project.source, project.compilerOptions, value))).code;
  const message = async (value: unknown) => (await failure(verifySourceLock(project.source, project.compilerOptions, value))).message;
  expect(await code({ ...lock, extra: 1 })).toBe("PARSE_FAILED");
  expect(await code({ ...lock, contract: "algal.source-lock.v2" })).toBe("PARSE_FAILED");
  expect(await code({ ...lock, root: "sha256:short" })).toBe("PARSE_FAILED");
  expect(await message({ ...lock, units: [...(lock.units as JsonValue[])].reverse() })).toContain("sorted");
  expect(await message({ ...lock, units: [] })).toContain("entry");
  expect(await code({ ...lock, units: [(lock.units as JsonObject[])[0]!, (lock.units as JsonObject[])[0]!] })).toBe("PARSE_FAILED");
  expect(await message({ ...lock, modules: [...(lock.modules as string[]), lock.root as string].sort() })).toContain("root");
  expect(await message({ ...lock, modules: [...(lock.modules as string[])].reverse() })).toContain("sorted");
  expect(await message({ ...lock, modules: [(lock.modules as string[])[0]!, (lock.modules as string[])[0]!, ...(lock.modules as string[]).slice(1)] })).toContain("sorted and unique");
  const { [(lock.modules as string[])[0]!]: _dropped, ...fewer } = lock.interfaces as JsonObject;
  expect(await message({ ...lock, interfaces: fewer })).toContain("interfaces");
  expect(await message({ ...lock, interfaces: { ...(lock.interfaces as JsonObject), [`sha256:${"1".repeat(64)}`]: `sha256:${"2".repeat(64)}` } })).toContain("exactly");
  expect(await code({ ...lock, interfaces: { ...(lock.interfaces as JsonObject), extra: "sha256:x" } })).toBe("PARSE_FAILED");
  expect(await message({ ...lock, entry: "other.algal" })).toContain("entry must be a unit");
  expect(await message({ ...lock, entry: "main.algal\nThe source compiles to the locked closure." })).toContain("normalized");
  for (const entry of ["../main.algal", "dir//main.algal", "main.txt", "C:main.algal", "a\\b.algal"]) expect(await code({ ...lock, entry })).toBe("PARSE_FAILED");
  expect(await code({ ...lock, compiler: { version: "1.3.0\nforged", profile: (lock.compiler as JsonObject).profile } })).toBe("PARSE_FAILED");
  expect(await code({ ...lock, analysis: { maxAgentCalls: BOUNDS.maxAgentCalls + 1, requiredDepth: 3 } })).toBe("PARSE_FAILED");
  expect(await code({ ...lock, analysis: { maxAgentCalls: 0, requiredDepth: BOUNDS.maxDepth + 1 } })).toBe("PARSE_FAILED");
  expect(await code({ ...lock, units: Array.from({ length: 17 }, (_, index) => ({ source: `u${String(index).padStart(2, "0")}.algal`, sourceDigest: lock.root, manifestDigest: lock.root })) })).toBe("BUDGET_EXHAUSTED");
  expect(await code({ ...lock, modules: Array.from({ length: SOURCE_LOCK_BOUNDS.maxModules + 1 }, (_, index) => `sha256:${index.toString(16).padStart(64, "0")}`) })).toBe("BUDGET_EXHAUSTED");
  const polluted = JSON.parse(`{"__proto__": {"admin": true}, "contract": "algal.source-lock.v1"}`) as unknown;
  expect(await code(polluted)).toBe("PARSE_FAILED");
  expect(({} as Record<string, unknown>).admin).toBeUndefined();
  const cyclic: Record<string, unknown> = { ...lock };
  cyclic.self = cyclic;
  expect(await code(cyclic)).toBe("PARSE_FAILED");
  let reads = 0;
  const trapped = { ...lock } as Record<string, unknown>;
  Object.defineProperty(trapped, "root", { get: () => { reads++; return lock.root; }, enumerable: true });
  expect(await code(trapped)).toBe("PARSE_FAILED");
  expect(reads).toBe(0);
  let nested: unknown = [];
  for (let depth = 0; depth < 12; depth++) nested = [nested];
  expect(await code({ ...lock, modules: nested })).toBe("BUDGET_EXHAUSTED");
  expect(await code({ ...lock, modules: new Array<null>(70_000).fill(null) })).toBe("BUDGET_EXHAUSTED");
  expect(SOURCE_LOCK_BOUNDS.maxUnits).toBe(16);
  expect(Object.isFrozen(SOURCE_LOCK_BOUNDS.lock)).toBe(true);
  const typed: SourceLock = parseSourceLock(lock);
  expect(typed.units).toHaveLength(6);
});

test("long non-ASCII keys round-trip and a fully edited project never truncates its drift list", async () => {
  const helper = "program helper(x: json) -> json { budget { max_agent_calls: 0 } return x }";
  const key = `${"漢".repeat(340)}.algal`;
  const source = `import helper from "./${key}"\nprogram main(x: json) -> json { budget { max_agent_calls: 0 } return call helper using { x: x } }`;
  const lock = await createSourceLock(source, { modules: { [key]: helper } });
  expect(lock.units.map(unit => unit.source)).toContain(key);
  const verification = await verifySourceLock(source, { modules: { [key]: helper } }, json(sourceLockToJson(lock)));
  expect(verification.ok).toBe(true);
  // Sixteen files: eleven helpers behind guarded parameterless calls (one
  // generated wrapper each, within the 64-cell manifest limit) and four called
  // directly; then every file is edited.
  const files: Record<string, string> = {};
  const imports: string[] = [];
  const calls: string[] = [];
  for (let index = 1; index < 16; index++) {
    files[`h${index}.algal`] = `program h${index}() -> text { budget { max_agent_calls: 0 } return "h${index}" }`;
    imports.push(`import h${index} from "./h${index}.algal"`);
    calls.push(index <= 11 ? `  let v${index} = if flag { call h${index} using {} } else { "n${index}" }` : `  let v${index} = call h${index} using {}`);
  }
  const entry = `${imports.join("\n")}\nprogram main(flag: json) -> json {\n  budget { max_agent_calls: 0, max_depth: 3 }\n${calls.join("\n")}\n  return [${Array.from({ length: 15 }, (_, index) => `v${index + 1}`).join(", ")}]\n}`;
  const compiled = compileSource(entry, { modules: files });
  expect(compiled.modules).toHaveLength(26);
  const big = json(sourceLockToJson(await createSourceLock(entry, { modules: files })));
  expect((big.modules as string[]).length).toBe(26);
  expect(canonicalize(big).length).toBeLessThan(SOURCE_LOCK_BOUNDS.lock.maxBytes / 2);
  const editedFiles = Object.fromEntries(Object.entries(files).map(([name, text]) => [name, text.replace('return "', 'return "changed ')]));
  const drifted = await verifySourceLock(entry.replace("[v1,", "[v1, v1,"), { modules: editedFiles }, big);
  expect(drifted.ok).toBe(false);
  expect(drifted.truncated).toBe(false);
  expect(drifted.drift.length).toBeGreaterThan(64);
  expect(drifted.drift.length).toBeLessThanOrEqual(SOURCE_LOCK_BOUNDS.maxDrift);
  expect(kinds(drifted)).toMatchObject({ source: 16, unit: 16, root: 1 });
  expect(kinds(drifted).closure).toBe(52);
  expect(ordered(drifted)).toBe(true);
  expect(renderSourceLockVerification(drifted)).toContain(`Drift (${drifted.drift.length}):`);
});
