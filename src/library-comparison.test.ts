import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { digestCanonical } from "./digest";
import { AlgalError } from "./errors";
import {
  libraryComparisonToJson, libraryComparisonVerdict, parseLibraryComparison, parseLibraryUnseenCases, renderLibraryComparison,
  LIBRARY_COMPARISON_BOUNDS, LIBRARY_COMPARISON_CONTRACT, LIBRARY_UNSEEN_CASES_CONTRACT, type LibraryComparison,
} from "./library-comparison";
import { LIBRARY_INDEX_BOUNDS } from "./library-index";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

const digest = (n: number): string => `sha256:${n.toString(16).padStart(64, "0")}`;
const failure = (work: () => unknown): AlgalError => {
  try { work(); } catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
const rejects = (value: unknown, pattern: RegExp, code = "PARSE_FAILED") => {
  const error = failure(() => parseLibraryComparison(value));
  expect({ code: error.code, message: error.message }).toMatchObject({ code, message: expect.stringMatching(pattern) });
};
type Row = JsonObject & { set: string; entry: string; name: string };
/** A consistent record over made-up digests, with its verdict derived from the rows. */
function record(change: { callers?: JsonObject[]; cases?: Row[]; dependents?: JsonObject[]; unseen?: string | null; candidateInterface?: string } = {}): JsonObject {
  const callers = change.callers ?? [
    { entry: "a/main.algal", root: "examples/source/projects", cases: { path: "a/main.evaluation.json", digest: digest(1) }, base: digest(2), candidate: digest(3) },
    { entry: "b/main.algal", root: "examples/source/projects/b", cases: null, base: digest(4), candidate: digest(5) },
  ];
  const cases = change.cases ?? [
    { set: "pinned", entry: "a/main.algal", name: "one", args: digest(6), base: { outcome: "complete", outputs: digest(7) }, candidate: { outcome: "complete", outputs: digest(7) } },
    { set: "unseen", entry: "b/main.algal", name: "two", base: { outcome: "failed", outputs: digest(8) }, candidate: { outcome: "failed", outputs: digest(8) } },
  ];
  const parts = {
    base: { digest: digest(10), interface: digest(11) }, candidate: { digest: digest(12), interface: change.candidateInterface ?? digest(11) },
    unseen: change.unseen === undefined ? digest(13) : change.unseen,
    dependents: change.dependents ?? [{ path: "a/score.algal", base: digest(14), candidate: digest(15) }], callers, cases,
  };
  const verdict = libraryComparisonVerdict(parts as unknown as Parameters<typeof libraryComparisonVerdict>[0]);
  return {
    contract: LIBRARY_COMPARISON_CONTRACT, name: "clamp", path: "a/lib/clamp.algal", compiler: { profile: "algal.source.profile.v1", version: "1.4.0" }, runtime: "0.1.0",
    ...parts, verdict: { ...verdict, notCompiled: [...verdict.notCompiled], changed: [...verdict.changed], notRun: [...verdict.notRun] },
  } as JsonObject;
}
const caseRows = (value: JsonObject) => value.cases as Row[];
const callerRows = (value: JsonObject) => value.callers as JsonObject[];

test("a comparison record round-trips canonically with the verdict its rows imply", () => {
  const value = record();
  const parsed = parseLibraryComparison(value);
  expect(parsed.verdict).toEqual({ passed: true, interfaceChanged: false, unseenMissing: false, notCompiled: [], changed: [], notRun: [] });
  expect(canonicalize(libraryComparisonToJson(parsed))).toBe(canonicalize(value));
  expect(Object.isFrozen(parsed.cases[0]) && Object.isFrozen(parsed.verdict.changed)).toBe(true);
  // Each failure reason appears in the derived verdict.
  const changed = caseRows(value).map((row, index) => index === 0 ? { ...row, candidate: { outcome: "failed", outputs: digest(9) } } : row);
  expect(parseLibraryComparison(record({ cases: changed })).verdict).toMatchObject({ passed: false, changed: ["pinned:a/main.algal#one"], notRun: [] });
  expect(parseLibraryComparison(record({ candidateInterface: digest(99) })).verdict).toMatchObject({ passed: false, interfaceChanged: true });
  const noUnseen = record({ unseen: null, cases: caseRows(value).filter(row => row.set === "pinned") });
  expect(parseLibraryComparison(noUnseen).verdict).toMatchObject({ passed: false, unseenMissing: true });
  const broken = callerRows(value).map((row, index) => index === 1 ? { ...row, candidate: null, reason: "PARSE_FAILED: b/main.algal:1:1: arguments must match exactly" } : row);
  const unrun = caseRows(value).map(row => row.entry === "b/main.algal" ? { ...row, candidate: null } : row);
  expect(parseLibraryComparison(record({ callers: broken, cases: unrun, dependents: [{ path: "a/score.algal", base: digest(14), candidate: null }] })).verdict).toEqual({
    passed: false, interfaceChanged: false, unseenMissing: false, notCompiled: ["a/score.algal", "b/main.algal"], changed: [], notRun: ["unseen:b/main.algal#two"],
  });
});

test("a record whose verdict does not follow from its rows is rejected", () => {
  const value = record();
  const verdict = value.verdict as JsonObject;
  for (const forged of [
    { ...verdict, passed: false },
    { ...verdict, changed: ["pinned:a/main.algal#one"] },
    { ...verdict, notRun: ["unseen:b/main.algal#two"] },
    { ...verdict, interfaceChanged: true },
  ]) rejects({ ...value, verdict: forged }, /verdict does not follow/);
  // A changed row with the verdict left at passed.
  const changed = caseRows(value).map((row, index) => index === 0 ? { ...row, candidate: { outcome: "complete", outputs: digest(9) } } : row);
  rejects({ ...value, cases: changed }, /verdict does not follow/);
  rejects({ ...value, verdict: { ...verdict, extra: true } }, /unknown key "extra"/);
  rejects({ ...value, verdict: { ...verdict, passed: "yes" } }, /passed must be true or false/);
});

test("the record parser rejects unknown, malformed, inconsistent, and oversized data", () => {
  const value = record();
  const [pinned, unseen] = caseRows(value) as [Row, Row];
  const [first, second] = callerRows(value) as [JsonObject, JsonObject];
  rejects(42, /must be an object/);
  rejects({ ...value, extra: 1 }, /unknown key "extra"/);
  rejects({ ...value, contract: "algal.library-comparison.v2" }, /expected contract/);
  rejects({ ...value, name: "Clamp" }, /name must be a program name/);
  rejects({ ...value, path: "a/../clamp.algal" }, /relative path of plain segments/);
  rejects({ ...value, path: "clamp.algal" }, /relative path of plain segments/);
  rejects({ ...value, runtime: "0.1.0\nforged" }, /runtime must be at most 64/);
  rejects({ ...value, candidate: value.base }, /base and candidate must be different programs/);
  rejects({ ...value, base: { ...(value.base as JsonObject), digest: "sha256:short" } }, /sha256/);
  rejects({ ...value, dependents: [{ path: "a/lib/clamp.algal", base: digest(14), candidate: digest(15) }] }, /cannot be its own dependent/);
  rejects({ ...value, dependents: [{ path: "a/z.algal", base: digest(1), candidate: null }, { path: "a/b.algal", base: digest(1), candidate: null }] }, /dependents must be sorted without repeats/);
  rejects({ ...value, callers: [second, first] }, /callers must be sorted without repeats/);
  rejects({ ...value, callers: [], cases: [] }, /at least one caller/);
  rejects({ ...value, callers: [{ ...first, candidate: first.base }, second] }, /compiles to a new digest/);
  rejects({ ...value, callers: [{ ...first, reason: "stray" }, second] }, /reason exactly when/);
  rejects({ ...value, callers: [{ ...first, candidate: null }, second] }, /reason exactly when/);
  for (const reason of ["two\nlines", "bell\u0007", "", "x".repeat(LIBRARY_COMPARISON_BOUNDS.maxReasonLength + 1)]) {
    rejects({ ...value, callers: [{ ...first, candidate: null, reason }, second], cases: [{ ...pinned, candidate: null }, unseen] }, /one line of at most 240 printable characters/);
  }
  rejects({ ...value, callers: [{ ...first, root: "../outside" }, second] }, /root must be a relative path/);
  rejects({ ...value, callers: [{ ...first, cases: null }, second] }, /pinned cases exactly when it names a case list/);
  rejects({ ...value, cases: [unseen, pinned] }, /sorted by set, entry point, and name/);
  rejects({ ...value, cases: [pinned, pinned, unseen] }, /sorted by set, entry point, and name/);
  rejects({ ...value, cases: [{ ...pinned, entry: "c/main.algal" }, unseen] }, /not a listed caller/);
  rejects({ ...value, cases: [{ ...pinned, set: "holdout" }, unseen] }, /set must be pinned or unseen/);
  rejects({ ...value, cases: [{ set: pinned.set, entry: pinned.entry, name: pinned.name, base: pinned.base, candidate: pinned.candidate }, unseen] }, /requires "args"/);
  rejects({ ...value, cases: [pinned, { ...unseen, args: digest(6) }] }, /records no input digests/);
  rejects({ ...value, cases: [{ ...pinned, candidate: null }, unseen] }, /runs exactly when its caller compiles/);
  rejects({ ...value, cases: [{ ...pinned, base: { outcome: "passed", outputs: digest(7) } }, unseen] }, /complete, failed, stuck, suspended/);
  rejects({ ...value, cases: [{ ...pinned, name: "two words" }, unseen] }, /name must be at most 64/);
  rejects({ ...value, cases: [pinned] }, /unseen cases exactly when it names an unseen case file/);
  rejects({ ...value, unseen: null }, /unseen cases exactly when it names an unseen case file/);
  // Lists over their limits, and data over the byte limit.
  const many = (count: number) => Array.from({ length: count }, (_, index) => ({ ...pinned, name: `c${String(index).padStart(3, "0")}` }));
  rejects({ ...value, cases: [...many(LIBRARY_COMPARISON_BOUNDS.maxCases + 1), unseen] }, /exceeds 16 pinned cases/, "BUDGET_EXHAUSTED");
  rejects({ ...value, cases: many(LIBRARY_COMPARISON_BOUNDS.maxRows + 1) }, /cases exceed 272 entries/, "BUDGET_EXHAUSTED");
  const callers = Array.from({ length: LIBRARY_COMPARISON_BOUNDS.maxCallers + 1 }, (_, index) => ({ ...second, entry: `c${String(index).padStart(2, "0")}/main.algal` }));
  rejects({ ...value, callers }, /callers exceed 16 entries/, "BUDGET_EXHAUSTED");
  const dependents = Array.from({ length: LIBRARY_COMPARISON_BOUNDS.maxDependents + 1 }, (_, index) => ({ path: `d/${String(index).padStart(2, "0")}.algal`, base: digest(1), candidate: digest(2) }));
  rejects({ ...value, dependents }, /dependents exceed 31 entries/, "BUDGET_EXHAUSTED");
  rejects({ ...value, name: "x".repeat(LIBRARY_COMPARISON_BOUNDS.record.maxBytes) }, /exceeds/, "BUDGET_EXHAUSTED");
  const block = Array.from({ length: 300 }, () => "x".repeat(1_000));
  rejects({ ...value, padding: [block, block] }, /exceeds 524288 JSON bytes/, "BUDGET_EXHAUSTED");
});

test("the largest legal record fits the record limits", () => {
  const { maxCallers, maxCases, maxDependents, maxPathLength, maxTokenLength } = LIBRARY_COMPARISON_BOUNDS;
  const pad = (prefix: string, suffix: string) => `${prefix}${"x".repeat(maxPathLength - prefix.length - suffix.length)}${suffix}`;
  const callers = Array.from({ length: maxCallers }, (_, index) => {
    const project = `c${String(index).padStart(2, "0")}`;
    return { entry: pad(`${project}/`, ".algal"), root: pad(`examples/source/projects/${project}/`, ""), cases: { path: pad(`${project}/`, ".evaluation.json"), digest: digest(1) }, base: digest(2), candidate: digest(3) };
  });
  const name = (index: number) => `n${String(index).padStart(2, "0")}${"y".repeat(maxTokenLength - 3)}`;
  const row = (set: string, entry: string, index: number): Row => ({
    set, entry, name: name(index), ...(set === "pinned" ? { args: digest(4), responses: digest(5) } : {}),
    base: { outcome: "suspended", outputs: digest(6) }, candidate: { outcome: "suspended", outputs: digest(7) },
  });
  const cases = [
    ...callers.flatMap(caller => Array.from({ length: maxCases }, (_, index) => row("pinned", caller.entry as string, index))),
    ...Array.from({ length: maxCases }, (_, index) => row("unseen", callers[0]!.entry as string, index)),
  ];
  const dependents = Array.from({ length: maxDependents }, (_, index) => ({ path: pad(`d${String(index).padStart(2, "0")}/`, ".algal"), base: digest(8), candidate: null }));
  const value = record({ callers, cases, dependents });
  const parsed = parseLibraryComparison(value);
  expect(parsed.cases).toHaveLength(LIBRARY_COMPARISON_BOUNDS.maxRows);
  expect(parsed.verdict.changed).toHaveLength(LIBRARY_COMPARISON_BOUNDS.maxRows);
  expect(canonicalize(value).length).toBeLessThan(400 * 1_024);
  // The limits mirror the catalog page's.
  expect(LIBRARY_COMPARISON_BOUNDS.maxCallers).toBe(LIBRARY_INDEX_BOUNDS.maxApplications);
  expect(LIBRARY_COMPARISON_BOUNDS.maxDependents + 1).toBe(LIBRARY_INDEX_BOUNDS.maxEntries);
  expect(LIBRARY_COMPARISON_BOUNDS.maxPathLength).toBe(LIBRARY_INDEX_BOUNDS.maxPathLength);
});

test("the text report names the verdict, callers, and every changed or unrun case", () => {
  const value = record();
  expect(renderLibraryComparison(parseLibraryComparison(value))).toBe([
    "ALGAL library comparison · passed · clamp (a/lib/clamp.algal)",
    `Current ${digest(10)}`,
    `Revision ${digest(12)}`,
    "Interface unchanged.",
    `Unseen cases: ${digest(13)}`,
    `Dependent a/score.algal: ${digest(14)} to ${digest(15)}`,
    "Caller a/main.algal: 1 pinned case, 0 unseen cases; runs with the revision",
    "Caller b/main.algal: 0 pinned cases, 1 unseen case; runs with the revision",
    "Cases: 2 of 2 ran; 0 changed.",
    "",
  ].join("\n"));
  const broken = callerRows(value).map((row, index) => index === 1 ? { ...row, candidate: null, reason: "PARSE_FAILED: arguments must match exactly" } : row);
  const rows = caseRows(value).map(row => row.entry === "b/main.algal" ? { ...row, candidate: null } : { ...row, candidate: { outcome: "failed", outputs: digest(9) } });
  const failed = renderLibraryComparison(parseLibraryComparison(record({ callers: broken, cases: rows })));
  expect(failed).toStartWith("ALGAL library comparison · failed · clamp");
  expect(failed).toContain("Caller b/main.algal: 0 pinned cases, 1 unseen case; does not run with the revision (PARSE_FAILED: arguments must match exactly)");
  expect(failed).toContain(`  changed pinned:a/main.algal#one: complete ${digest(7)} to failed ${digest(9)}`);
  expect(failed).toContain("  not run unseen:b/main.algal#two");
  const text = renderLibraryComparison(parseLibraryComparison(record({ unseen: null, cases: caseRows(value).filter(row => row.set === "pinned") })));
  expect(text).toContain("Unseen cases: none pinned, so the comparison cannot pass.");
  // A typed object built outside the parser still renders on one line per field.
  const forged = { ...parseLibraryComparison(value), name: "clamp\nextra line" } as LibraryComparison;
  expect(renderLibraryComparison(forged).split("\n")[0]).toBe("ALGAL library comparison · passed · clamp extra line (a/lib/clamp.algal)");
});

test("an unseen case file parses strictly, and its digest ignores formatting", async () => {
  const file = {
    contract: LIBRARY_UNSEEN_CASES_CONTRACT,
    cases: [
      { name: "late", entry: "support-queue/main.algal", args: { input: { tickets: [], weights: {}, window: 1 } }, responses: {}, outcome: "complete" },
      { name: "bad-impact", entry: "task-planning/main.algal", args: { input: { tasks: [{ impact: "high" }], weights: {} } }, outcome: "failed" },
    ],
  };
  const parsed = parseLibraryUnseenCases(file);
  expect(parsed.digest).toBe(digestCanonical(file as unknown as JsonValue));
  expect(parseLibraryUnseenCases(JSON.parse(JSON.stringify(file, null, 4))).digest).toBe(parsed.digest);
  expect(parsed.cases.map(item => [item.name, item.entry, item.outcome ?? "complete"])).toEqual([["late", "support-queue/main.algal", "complete"], ["bad-impact", "task-planning/main.algal", "failed"]]);
  expect(Object.isFrozen(parsed.cases[0]!.args)).toBe(true);
  const refuse = (value: unknown, pattern: RegExp, code = "PARSE_FAILED") => {
    const error = failure(() => parseLibraryUnseenCases(value));
    expect({ code: error.code, message: error.message }).toMatchObject({ code, message: expect.stringMatching(pattern) });
  };
  const [first] = file.cases;
  refuse([first], /must be an object/);
  refuse({ ...file, contract: "algal.library-comparison.v1" }, /expected contract/);
  refuse({ ...file, note: "x" }, /unknown key "note"/);
  refuse({ ...file, cases: [] }, /at least one case/);
  refuse({ ...file, cases: [{ ...first, extra: 1 }] }, /unknown key "extra"/);
  refuse({ ...file, cases: [first, first] }, /names must be unique: late/);
  refuse({ ...file, cases: [{ ...first, name: "-late" }] }, /name must be at most 64/);
  refuse({ ...file, cases: [{ ...first, entry: "../main.algal" }] }, /relative path of plain segments/);
  refuse({ ...file, cases: [{ ...first, args: { input: 3 } }] }, /input cell must be an object/);
  refuse({ ...file, cases: [{ ...first, args: [] }] }, /args must be an object/);
  refuse({ ...file, cases: [{ ...first, responses: [] }] }, /responses must be an object/);
  refuse({ ...file, cases: [{ ...first, outcome: "passed" }] }, /complete, failed, stuck, suspended/);
  refuse({ ...file, cases: Array.from({ length: LIBRARY_COMPARISON_BOUNDS.maxCases + 1 }, (_, index) => ({ ...first, name: `c${index}` })) }, /exceed 16 cases/, "BUDGET_EXHAUSTED");
  refuse({ ...file, cases: [{ ...first, args: { input: { text: "x".repeat(LIBRARY_COMPARISON_BOUNDS.unseen.maxBytes) } } }] }, /exceeds/, "BUDGET_EXHAUSTED");
  // The example on the catalog page is a valid file.
  const page = await readFile(join(resolve(import.meta.dir, ".."), "docs/library.md"), "utf8");
  const section = page.slice(page.indexOf("### Pin unseen cases"));
  const example = section.slice(section.indexOf("```json\n") + 8, section.indexOf("\n```", section.indexOf("```json\n")));
  expect(parseLibraryUnseenCases(JSON.parse(example)).cases.map(item => item.entry)).toEqual(["task-planning/inspect_task.algal"]);
});
