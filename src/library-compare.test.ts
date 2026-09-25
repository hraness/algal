import { afterAll, expect, test } from "bun:test";
import { cp, lstat, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { Digest } from "./digest";
import { AlgalError } from "./errors";
import { compareLibraryRevision, loadLibraryIndex, verifyLibraryComparison, type LibraryComparisonOptions } from "./library-compare";
import {
  libraryCaseId, libraryComparisonToJson, libraryComparisonVerdict, parseLibraryComparison, parseLibraryUnseenCases,
  LIBRARY_COMPARISON_BOUNDS, LIBRARY_UNSEEN_CASES_CONTRACT, type LibraryComparison,
} from "./library-comparison";
import { checkLibraryIndex, LIBRARY_INDEX_PROJECTS } from "./library-index";
import { SourceError } from "./source";
import { createSourceLock, parseSourceLockCases, SOURCE_LOCK_BOUNDS } from "./source-lock";
import { loadSourceFixtures, loadSourceProject } from "./source-project";
import { canonicalize, type JsonObject } from "./values";

const repository = resolve(import.meta.dir, "..");
const projects = join(repository, LIBRARY_INDEX_PROJECTS);
const page = await readFile(join(repository, "docs/library.md"), "utf8");
const catalog = await loadLibraryIndex(repository);
const clamp = catalog.entries.find(entry => entry.name === "clamp")!;
const score = catalog.entries.find(entry => entry.name === "score_task")!;
const clampSource = await readFile(join(projects, clamp.path), "utf8");

/** Unseen cases, as maintainers would keep them outside the repository. */
const unseen = {
  contract: LIBRARY_UNSEEN_CASES_CONTRACT,
  cases: [
    // Urgency above the clamp's upper bound, which no case list reaches.
    { name: "urgency-above-range", entry: "task-planning/inspect_task.algal", args: { input: { task: { id: "keys", title: "Rotate keys", status: "open", urgency: 9, impact: 3 }, weights: { urgency: 2, impact: 1 }, threshold: 12 } } },
    // A ticket open longer than its window, with a negative impact.
    { name: "stale-ticket", entry: "support-queue/main.algal", args: { input: { tickets: [{ id: "T-9", subject: "Refund", urgency: 4, impact: -2, hours_open: 40 }], weights: { urgency: 1, impact: 2 }, window: 24 } }, responses: {} },
    // A malformed task: the listed program fails, and a revision must fail the same way.
    { name: "text-impact", entry: "task-planning/main.algal", args: { input: { tasks: [{ id: "x", title: "Bad", status: "open", urgency: 1, impact: "high" }], weights: { urgency: 1, impact: 1 } } }, outcome: "failed" },
  ],
};
const pin = parseLibraryUnseenCases(unseen).digest;
const revisions = {
  // Every comparison with its operands swapped: the same result for every input.
  equivalent: clampSource.replace("value < minimum", "minimum > value").replace("value > maximum", "maximum < value"),
  // Every value inside the bounds moves.
  plusOne: clampSource.replace("else { value }", "else { value + 1 }"),
  // No upper bound; no case list has a value above it.
  noUpper: clampSource.replace("if value > maximum { maximum } else { value }", "value"),
  // A renamed input, so no caller compiles.
  renamed: clampSource.replaceAll("maximum", "upper"),
};
const PINNED = ["pinned:support-queue/main.algal#three-tickets", "pinned:task-planning/inspect_task.algal#polish", "pinned:task-planning/main.algal#three-tasks"];
const UNSEEN = ["unseen:support-queue/main.algal#stale-ticket", "unseen:task-planning/inspect_task.algal#urgency-above-range", "unseen:task-planning/main.algal#text-impact"];
const CALLERS = ["support-queue/main.algal", "task-planning/inspect_task.algal", "task-planning/main.algal"];

/** Replace one field of one entry, including its continuation lines. */
function withField(text: string, name: string, label: string, value: string): string {
  const lines = text.split("\n");
  const start = lines.indexOf(`### \`${name}\``);
  const field = lines.findIndex((line, index) => index > start && line.startsWith(`- **${label}:** `));
  if (start < 0 || field < 0) throw new Error(`no field ${label} in ${name}`);
  let end = field + 1;
  while (/^ {2}\S/.test(lines[end] ?? "")) end++;
  return [...lines.slice(0, field), `- **${label}:** ${value}`, ...lines.slice(end)].join("\n");
}
const scratches: string[] = [];
afterAll(async () => { for (const dir of scratches) await rm(dir, { recursive: true, force: true }); });
/** A throwaway repository: every source project, the catalog page with
 * `unseenPin` on clamp's "Unseen cases" line, and each listed test file. */
async function scratch(unseenPin: Digest | null = pin): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "algal-library-compare-"));
  scratches.push(dir);
  await cp(projects, join(dir, LIBRARY_INDEX_PROJECTS), { recursive: true });
  for (const path of new Set(catalog.entries.flatMap(entry => entry.tests))) {
    if (path.startsWith(`${LIBRARY_INDEX_PROJECTS}/`)) continue;
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), "");
  }
  await mkdir(join(dir, "docs"));
  await writeFile(join(dir, "docs/library.md"), unseenPin === null ? page : withField(page, "clamp", "Unseen cases", `\`${unseenPin}\``));
  return dir;
}
/** Every file under a directory with its contents. */
async function snapshot(dir: string, base = dir, found: Record<string, string> = {}): Promise<Record<string, string>> {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) await snapshot(path, base, found);
    else found[path.slice(base.length + 1)] = await readFile(path, "utf8");
  }
  return found;
}
async function refusal(work: Promise<unknown>): Promise<AlgalError> {
  try { await work; } catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
}
const shared = await scratch();
const compare = (revision: string, options: Partial<LibraryComparisonOptions> = {}) =>
  compareLibraryRevision({ repository: shared, name: "clamp", revision, unseen, ...options });
const passing = await compare(revisions.equivalent);

test("a behavior-preserving rewrite passes every caller's cases and the unseen cases, and writes nothing", async () => {
  const before = await snapshot(shared);
  const record = await compare(revisions.equivalent);
  expect(await snapshot(shared)).toEqual(before);
  expect(record.verdict).toEqual({ passed: true, interfaceChanged: false, unseenMissing: false, notCompiled: [], changed: [], notRun: [] });
  expect(record.base).toEqual({ digest: clamp.digest, interface: clamp.interfaceDigest });
  expect(record.candidate.digest).not.toBe(clamp.digest);
  expect(record.candidate.interface).toBe(clamp.interfaceDigest);
  expect(record.unseen).toBe(pin);
  // Scoring calls the clamp helper, so its digest moves with the revision.
  expect(record.dependents.map(item => item.path)).toEqual([score.path]);
  expect(record.dependents[0]!.base).toBe(score.digest);
  expect(record.dependents[0]!.candidate).not.toBe(score.digest);
  expect(record.callers.map(item => [item.entry, item.cases?.path])).toEqual(CALLERS.map(entry => [entry, entry.replace(/\.algal$/, ".evaluation.json")]));
  expect(record.cases.map(libraryCaseId)).toEqual([...PINNED, ...UNSEEN]);
  for (const row of record.cases) expect(row.candidate).toEqual(row.base);
  expect(record.cases.find(row => row.name === "text-impact")!.base.outcome).toBe("failed");
  // A pinned result is what `lock --evaluation` pins for the same case list.
  const planner = await loadSourceProject(join(shared, LIBRARY_INDEX_PROJECTS, "task-planning/main.algal"));
  const cases = parseSourceLockCases(JSON.parse(await readFile(join(planner.root, "main.evaluation.json"), "utf8")));
  const fixtures = await loadSourceFixtures(planner.root, ["main.args.json"], SOURCE_LOCK_BOUNDS.evaluation.maxFixtureBytes);
  const pinned = (await createSourceLock(planner.source, planner.compilerOptions, { evaluation: cases, fixtures })).evaluation!.cases[0]!;
  const row = record.cases.find(item => libraryCaseId(item) === "pinned:task-planning/main.algal#three-tasks")!;
  expect({ args: row.args, outcome: row.base.outcome, outputs: row.base.outputs }).toEqual({ args: pinned.args.digest, outcome: pinned.outcome, outputs: pinned.outputs });
  // The same inputs give the same bytes, and running the comparison again verifies the record.
  expect(canonicalize(libraryComparisonToJson(record))).toBe(canonicalize(libraryComparisonToJson(passing)));
  expect(await verifyLibraryComparison(libraryComparisonToJson(passing), { repository: shared, name: "clamp", revision: revisions.equivalent, unseen })).toEqual(passing);
}, 60_000);

test("a behavior-changing rewrite fails on pinned and unseen cases, and a rewrite that keeps every pinned result fails on an unseen case", async () => {
  const shifted = await compare(revisions.plusOne);
  expect(shifted.verdict).toEqual({
    passed: false, interfaceChanged: false, unseenMissing: false, notCompiled: [],
    changed: [...PINNED, "unseen:support-queue/main.algal#stale-ticket", "unseen:task-planning/inspect_task.algal#urgency-above-range"], notRun: [],
  });
  // The malformed task fails under both versions, so it has not changed.
  const text = shifted.cases.find(row => row.name === "text-impact")!;
  expect(text.candidate).toEqual(text.base);
  const uncapped = await compare(revisions.noUpper);
  expect(uncapped.verdict).toMatchObject({ passed: false, changed: ["unseen:task-planning/inspect_task.algal#urgency-above-range"], notRun: [] });
  for (const row of uncapped.cases.filter(item => item.set === "pinned")) expect(row.candidate).toEqual(row.base);
}, 60_000);

test("an interface change is reported, with every caller and dependent it breaks", async () => {
  const record = await compare(revisions.renamed);
  expect(record.verdict).toEqual({
    passed: false, interfaceChanged: true, unseenMissing: false, notCompiled: [...CALLERS, score.path].sort(), changed: [], notRun: [...PINNED, ...UNSEEN],
  });
  expect(record.candidate.interface).not.toBe(clamp.interfaceDigest);
  expect(record.dependents[0]!.candidate).toBeNull();
  for (const caller of record.callers) {
    expect(caller.candidate).toBeNull();
    expect(caller.reason).toMatch(/^PARSE_FAILED: (task-planning\/)?score_task\.algal:\d+:\d+: arguments must match exactly: value, minimum, upper$/);
  }
  // A revision may import a file the current version does not; this one
  // compiles alone, but its extra call exceeds the depth scoring declares.
  const helper = await scratch();
  await writeFile(join(helper, LIBRARY_INDEX_PROJECTS, "task-planning/lib/lower.algal"),
    "program lower(value: json, minimum: json) -> json {\n  budget { max_agent_calls: 0 }\n\n  return if value < minimum { minimum } else { value }\n}\n");
  const nested = `import lower from "./lower.algal"\n${clampSource.replace("return if value < minimum { minimum } else {", "let low = call lower using { value: value, minimum: minimum }\n  return if value < minimum { low } else {")}`;
  const deeper = await compareLibraryRevision({ repository: helper, name: "clamp", revision: nested, unseen });
  expect(deeper.verdict).toMatchObject({ passed: false, interfaceChanged: false, notCompiled: [...CALLERS, score.path].sort() });
  for (const caller of deeper.callers) expect(caller.reason).toContain("exceeding max_depth");
}, 60_000);

test("the comparison enforces the unseen pin and refuses to start from anything but the listed program", async () => {
  const edited = { ...unseen, cases: unseen.cases.map((item, index) => index === 0 ? { ...item, name: "urgency-far-above-range" } : item) };
  const mismatch = await refusal(compare(revisions.equivalent, { unseen: edited }));
  expect(mismatch.code).toBe("DIGEST_MISMATCH");
  expect(mismatch.message).toBe(`library compare: the unseen case file has digest ${parseLibraryUnseenCases(edited).digest}, but the catalog pins ${pin} for clamp`);
  expect((await refusal(compareLibraryRevision({ repository: shared, name: "clamp", revision: revisions.equivalent }))).message).toContain(`clamp pins unseen cases ${pin}; supply that file`);
  // The repository's own page pins no unseen cases: a file is refused, and without one the comparison cannot pass.
  const unpinned = await refusal(compareLibraryRevision({ repository, name: "clamp", revision: revisions.equivalent, unseen }));
  expect(unpinned.message).toContain(`clamp pins no unseen cases; pin ${pin} on its "Unseen cases" line`);
  const partial = await compareLibraryRevision({ repository, name: "clamp", revision: revisions.equivalent });
  expect(partial.verdict).toEqual({ passed: false, interfaceChanged: false, unseenMissing: true, notCompiled: [], changed: [], notRun: [] });
  expect(partial.cases.map(libraryCaseId)).toEqual(PINNED);
  // Unseen cases must run through a listed entry point.
  const stray = { ...unseen, cases: [{ ...unseen.cases[0]!, entry: "typed-tasks/scores.algal" }] };
  const strayRepository = await scratch(parseLibraryUnseenCases(stray).digest);
  expect((await refusal(compareLibraryRevision({ repository: strayRepository, name: "clamp", revision: revisions.equivalent, unseen: stray }))).message)
    .toContain("unseen case urgency-above-range runs through typed-tasks/scores.algal, which is not a calling entry point on the page");
  // Other refusals: an unknown entry, no change, source that does not compile, oversized text, and a stale page.
  expect((await refusal(compare(revisions.equivalent, { name: "round" }))).message).toContain('the catalog lists no program named "round"');
  expect((await refusal(compare(`// A comment changes no executable digest.\n${clampSource}`))).message).toContain(`the revision compiles to the listed program ${clamp.digest}`);
  const broken = await compare("program clamp(value: json) -> json { budget { max_agent_calls: 0 } return missing }").catch((error: unknown) => error);
  expect(broken).toBeInstanceOf(SourceError);
  expect((await refusal(compare(`import gone from "./gone.algal"\n${clampSource}`))).message).toContain("cannot load task-planning/lib/gone.algal, which the revision imports");
  expect((await refusal(compare(" ".repeat(65_537)))).code).toBe("BUDGET_EXHAUSTED");
  expect((await refusal(compare(42 as unknown as string))).message).toContain("revision must be source text");
  const stale = await scratch();
  await writeFile(join(stale, LIBRARY_INDEX_PROJECTS, clamp.path), revisions.plusOne);
  const drifted = await refusal(compareLibraryRevision({ repository: stale, name: "clamp", revision: revisions.equivalent, unseen }));
  expect({ code: drifted.code, message: drifted.message }).toMatchObject({ code: "DIGEST_MISMATCH", message: expect.stringContaining("the catalog check must pass first") });
  const empty = await mkdtemp(join(tmpdir(), "algal-library-compare-"));
  scratches.push(empty);
  expect((await refusal(compareLibraryRevision({ repository: empty, name: "clamp", revision: revisions.equivalent }))).message).toContain("has no docs/library.md");
}, 90_000);

test("a record that hides a regression fails verification by rerunning the comparison", async () => {
  const shifted = await compare(revisions.plusOne);
  // Copy each revised result over the listed one, so the rows agree with a passing verdict.
  const hidden = shifted.cases.map(row => ({ ...row, base: row.candidate! }));
  const record = parseLibraryComparison(libraryComparisonToJson({ ...shifted, cases: hidden, verdict: libraryComparisonVerdict({ ...shifted, cases: hidden }) }));
  expect(record.verdict.passed).toBe(true);
  const options = { repository: shared, name: "clamp", revision: revisions.plusOne, unseen };
  const rejected = await refusal(verifyLibraryComparison(libraryComparisonToJson(record), options));
  expect({ code: rejected.code, message: rejected.message }).toEqual({ code: "RECEIPT_MISMATCH", message: "library compare: the record differs from a fresh comparison in cases, verdict" });
  expect((await refusal(verifyLibraryComparison(libraryComparisonToJson(passing), options))).message).toContain("differs from a fresh comparison in candidate, dependents, callers, cases, verdict");
  expect((await refusal(verifyLibraryComparison({ ...libraryComparisonToJson(passing), extra: true }, options))).message).toContain('unknown key "extra"');
}, 60_000);

/** Apply a comparison to a scratch repository the way the catalog asks: the
 * revised file, the record, and each changed entry's digest and status. */
async function activate(dir: string, record: LibraryComparison, revision: string, recordPath = "task-planning/lib/clamp.comparison.json"): Promise<string> {
  await writeFile(join(dir, LIBRARY_INDEX_PROJECTS, clamp.path), revision);
  await writeFile(join(dir, LIBRARY_INDEX_PROJECTS, recordPath), `${canonicalize(libraryComparisonToJson(record))}\n`);
  const status = (from: string) => `Revised from \`${from}\` after the comparison [\`${recordPath}\`](../${LIBRARY_INDEX_PROJECTS}/${recordPath}).`;
  let text = await readFile(join(dir, "docs/library.md"), "utf8");
  text = withField(withField(text, "clamp", "Executable digest", `\`${record.candidate.digest}\``), "clamp", "Status", status(clamp.digest));
  const dependent = record.dependents.find(item => item.path === score.path)!;
  text = withField(withField(text, "score_task", "Executable digest", `\`${dependent.candidate}\``), "score_task", "Status", status(score.digest));
  await writeFile(join(dir, "docs/library.md"), text);
  return text;
}
const check = async (dir: string) => checkLibraryIndex(await loadLibraryIndex(dir), { repository: dir });

test("the catalog accepts a changed digest only with a passing comparison record that ends at it", async () => {
  const dir = await scratch();
  const text = await activate(dir, passing, revisions.equivalent);
  expect(await check(dir)).toEqual([]);
  const recordFile = join(dir, LIBRARY_INDEX_PROJECTS, "task-planning/lib/clamp.comparison.json");
  const at = (entry: string) => `${entry}: comparison record task-planning/lib/clamp.comparison.json`;
  const withText = async (value: string) => { await writeFile(join(dir, "docs/library.md"), value); return check(dir); };
  const withRecord = async (value: string) => { await writeFile(recordFile, value); return check(dir); };
  const json = libraryComparisonToJson(passing);
  // New digests with the old status: each changed entry needs its record.
  const listed = withField(withField(text, "clamp", "Status", `Listed at \`${clamp.digest}\`.`), "score_task", "Status", `Listed at \`${score.digest}\`.`);
  expect(await withText(listed)).toEqual([
    `${clamp.path}: "Status" lists it at ${clamp.digest}, but the page pins ${passing.candidate.digest}; a revised program names its comparison record`,
    `${score.path}: "Status" lists it at ${score.digest}, but the page pins ${passing.dependents[0]!.candidate}; a revised program names its comparison record`,
  ]);
  // A status that starts from another digest.
  const zero = `sha256:${"0".repeat(64)}`;
  expect(await withText(text.replace(`Revised from \`${clamp.digest}\``, `Revised from \`${zero}\``))).toEqual([
    `${at(clamp.path)} starts from ${clamp.digest}, not the ${zero} that "Status" names`,
  ]);
  await writeFile(join(dir, "docs/library.md"), text);
  // A consistent record whose verdict failed.
  const moved = passing.cases.map((row, index) => index === 0 ? { ...row, candidate: { outcome: "failed" as const, outputs: zero as Digest } } : row);
  const failed = { ...passing, cases: moved, verdict: libraryComparisonVerdict({ ...passing, cases: moved }) };
  expect(await withRecord(canonicalize(libraryComparisonToJson(failed)))).toEqual([`${at(clamp.path)} did not pass`, `${at(score.path)} did not pass`]);
  // A record that omits the dependent entry it moved.
  expect(await withRecord(canonicalize({ ...json, dependents: [] }))).toEqual([`${at(score.path)} compares ${clamp.path} and does not list this entry as a dependent`]);
  // Forged, unknown, oversized, missing, and linked records are not valid records.
  const invalid = (problems: string[], pattern: RegExp) => {
    expect(problems).toHaveLength(2);
    for (const [index, entry] of [clamp.path, score.path].entries()) expect(problems[index]).toMatch(new RegExp(`^${at(entry).replaceAll(".", "\\.")} is not a valid record \\(${pattern.source}`));
  };
  invalid(await withRecord(canonicalize({ ...json, verdict: { ...(json.verdict as JsonObject), passed: false } })), /library comparison: the verdict does not follow/);
  // A changed row under a verdict that still says passed.
  invalid(await withRecord(canonicalize({ ...json, cases: libraryComparisonToJson({ ...passing, cases: moved }).cases! })), /library comparison: the verdict does not follow/);
  invalid(await withRecord(canonicalize({ ...json, note: "trust me" })), /library comparison has unknown key "note"/);
  invalid(await withRecord(" ".repeat(LIBRARY_COMPARISON_BOUNDS.record.maxBytes + 1)), /fixture task-planning\/lib\/clamp\.comparison\.json exceeds 524288 bytes/);
  invalid(await withRecord("{"), /JSON Parse error/);
  await rm(recordFile);
  invalid(await check(dir), /cannot read fixture task-planning\/lib\/clamp\.comparison\.json/);
  const elsewhere = join(dir, "record.json");
  await writeFile(elsewhere, canonicalize(json));
  await symlink(elsewhere, recordFile);
  expect((await lstat(recordFile)).isSymbolicLink()).toBe(true);
  invalid(await check(dir), /symlink traversal is not allowed/);
}, 120_000);
