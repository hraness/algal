import { expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { libraryComparisonVerdict, LIBRARY_COMPARISON_CONTRACT } from "./library-comparison";
import { checkLibraryIndex, parseLibraryIndex, LIBRARY_INDEX_BOUNDS, LIBRARY_INDEX_PROJECTS, type LibraryIndex } from "./library-index";
import { builtinRegistry } from "./registry";
import { runOrganism, type RunReceipt } from "./run";
import { compileSource, SourceError } from "./source";
import { loadSourceProject } from "./source-project";
import { MemoryStore } from "./store-memory";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

const repository = resolve(import.meta.dir, "..");
const projects = join(repository, LIBRARY_INDEX_PROJECTS);
const page = await readFile(join(repository, "docs/library.md"), "utf8");
const parsed = parseLibraryIndex(page);
const entry = (name: string) => parsed.entries.find(candidate => candidate.name === name)!;
const link = (path: string) => `[\`${path}\`](../${LIBRARY_INDEX_PROJECTS}/${path})`;
const failure = (work: () => unknown): AlgalError => {
  try { work(); } catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
/** Replace one field of one entry, including its continuation lines, so page
 * variants do not depend on the wording of other fields. */
function withField(text: string, name: string, label: string, value: string): string {
  const lines = text.split("\n");
  const start = lines.indexOf(`### \`${name}\``);
  const field = lines.findIndex((line, index) => index > start && line.startsWith(`- **${label}:** `));
  if (start < 0 || field < 0) throw new Error(`no field ${label} in ${name}`);
  let end = field + 1;
  while (/^ {2}\S/.test(lines[end] ?? "")) end++;
  return [...lines.slice(0, field), `- **${label}:** ${value}`, ...lines.slice(end)].join("\n");
}
/** Insert a new field line after the named field's continuation block, so an
 * optional field can be added to an entry without disturbing the others. */
function addedField(text: string, name: string, after: string, label: string, value: string): string {
  const lines = text.split("\n");
  const start = lines.indexOf(`### \`${name}\``);
  const field = lines.findIndex((line, index) => index > start && line.startsWith(`- **${after}:** `));
  if (start < 0 || field < 0) throw new Error(`no field ${after} in ${name}`);
  let end = field + 1;
  while (/^ {2}\S/.test(lines[end] ?? "")) end++;
  return [...lines.slice(0, end), `- **${label}:** ${value}`, ...lines.slice(end)].join("\n");
}
const withoutLine = (text: string, prefix: string) => {
  const lines = text.split("\n");
  const index = lines.findIndex(line => line.startsWith(prefix));
  if (index < 0) throw new Error(`no line starting with ${prefix}`);
  return [...lines.slice(0, index), ...lines.slice(index + 1)].join("\n");
};
const check = (text: string, root = repository) => checkLibraryIndex(parseLibraryIndex(text), { repository: root });
/** A throwaway repository with every source project and a placeholder for each listed test file. */
async function scratchRepository(index: LibraryIndex): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "algal-library-"));
  await cp(projects, join(dir, LIBRARY_INDEX_PROJECTS), { recursive: true });
  for (const path of new Set(index.entries.flatMap(item => item.tests))) {
    const target = join(dir, path);
    await mkdir(dirname(target), { recursive: true });
    if (!path.startsWith(`${LIBRARY_INDEX_PROJECTS}/`)) await writeFile(target, "");
  }
  return dir;
}
async function program(path: string) {
  const project = await loadSourceProject(join(projects, path), { root: projects });
  const store = new MemoryStore();
  for (const module of project.modules) await store.putManifest(module);
  await store.putManifest(project.manifest);
  return (input: Record<string, JsonValue>): Promise<RunReceipt> => runOrganism({ manifest: project.manifest, args: { input }, store, fns: builtinRegistry(), executors: [] });
}
const outcome = (receipt: RunReceipt): JsonValue => receipt.outcome === "complete"
  ? receipt.cells.result!.outputs!.out! : { failed: receipt.failure?.code ?? null, at: receipt.failure?.path ?? null };

test("the shared program catalog matches fresh compiles of every entry and calling project", async () => {
  expect(parsed.entries.map(item => item.path)).toEqual(expect.arrayContaining(["task-planning/lib/clamp.algal", "task-planning/score_task.algal"]));
  expect(parsed.applications.map(item => item.entry)).toContain("support-queue/main.algal");
  for (const item of parsed.entries) {
    expect(new Set(item.callers).size).toBeGreaterThanOrEqual(2);
    expect(new Set(item.callers.map(path => path.split("/")[0])).size).toBeGreaterThanOrEqual(2);
  }
  expect(await checkLibraryIndex(parsed, { repository })).toEqual([]);
  expect(Object.isFrozen(parsed.entries[0]) && Object.isFrozen(parsed.entries[0]!.callers)).toBe(true);
});

test("clamp returns a bound or the value and rejects mixed comparisons, as its entry states", async () => {
  const clamp = await program(entry("clamp").path);
  const cases: [Record<string, JsonValue>, JsonValue][] = [
    [{ value: 3, minimum: 0, maximum: 5 }, 3],
    [{ value: 5, minimum: 0, maximum: 5 }, 5],
    [{ value: -2, minimum: 0, maximum: 5 }, 0],
    [{ value: 7, minimum: 0, maximum: 5 }, 5],
    // Two strings compare by UTF-16 code units, so "B" sorts before "a".
    [{ value: "m", minimum: "a", maximum: "k" }, "k"],
    [{ value: "B", minimum: "a", maximum: "k" }, "a"],
    // maximum is compared only when value is not below minimum.
    [{ value: 1, minimum: 2, maximum: "x" }, 2],
    [{ value: 3, minimum: 2, maximum: "x" }, { failed: "EXPR_FAILED", at: "result" }],
    [{ value: "3", minimum: 0, maximum: 5 }, { failed: "EXPR_FAILED", at: "result" }],
    [{ value: null, minimum: 0, maximum: 5 }, { failed: "EXPR_FAILED", at: "result" }],
    // Unordered bounds: minimum for a smaller value, maximum for any other.
    [{ value: 3, minimum: 5, maximum: 0 }, 5],
    [{ value: 7, minimum: 5, maximum: 0 }, 0],
  ];
  const steps = new Set<number>();
  for (const [input, expected] of cases) {
    const receipt = await clamp(input);
    expect({ input, result: outcome(receipt) }).toEqual({ input, result: expected });
    if (receipt.outcome === "complete") steps.add(receipt.work.steps);
  }
  // No lists or loops: every completed call takes the same number of steps.
  expect(steps.size).toBe(1);
});

test("score_task clamps, weights, and rejects missing or non-numeric fields, as its entry states", async () => {
  const score = await program(entry("score_task").path);
  const weights = { urgency: 2, impact: 1 };
  const cases: [Record<string, JsonValue>, JsonValue][] = [
    [{ task: { urgency: 4, impact: 5 }, weights }, 13],
    // Other fields are ignored; out-of-range fields count as 5 and 0.
    [{ task: { id: "T-1", subject: "Ticket", urgency: 9, impact: -1 }, weights }, 10],
    [{ task: { urgency: 2, impact: 3 }, weights: { urgency: -1, impact: 0 } }, -2],
    [{ task: { urgency: 2 }, weights }, { failed: "EXPR_FAILED", at: "b2-impact/result" }],
    [{ task: { urgency: "2", impact: 1 }, weights }, { failed: "EXPR_FAILED", at: "b1-urgency/result" }],
    [{ task: { urgency: 2, impact: 1 }, weights: { urgency: 2 } }, { failed: "EXPR_FAILED", at: "result" }],
    [{ task: { urgency: 2, impact: 1 }, weights: { urgency: "2", impact: 1 } }, { failed: "EXPR_FAILED", at: "result" }],
    [{ task: { urgency: 5, impact: 1 }, weights: { urgency: 1e308, impact: 1 } }, { failed: "EXPR_FAILED", at: "result" }],
  ];
  for (const [input, expected] of cases) expect({ input, result: outcome(await score(input)) }).toEqual({ input, result: expected });
});

test("callers declare the nesting depth each entry states", async () => {
  const modules = Object.fromEntries(await Promise.all(["task-planning/score_task.algal", "task-planning/lib/clamp.algal"]
    .map(async key => [key, await readFile(join(projects, key), "utf8")] as const)));
  const caller = (alias: string, key: string, depth: number) => `import ${alias} from "./${key}"
program caller(a: json, b: json, c: json) -> json {
  budget { max_agent_calls: 0, max_depth: ${depth} }
  return call ${alias} using ${alias === "clamp" ? "{ value: a, minimum: b, maximum: c }" : "{ task: a, weights: b }"}
}`;
  const compile = (alias: string, key: string, depth: number) => () => compileSource(caller(alias, key, depth), { entry: "caller.algal", modules });
  expect(compile("clamp", "task-planning/lib/clamp.algal", 1)().analysis.requiredDepth).toBe(1);
  expect(compile("score_task", "task-planning/score_task.algal", 2)().analysis.requiredDepth).toBe(2);
  for (const [alias, key, depth] of [["clamp", "task-planning/lib/clamp.algal", 0], ["score_task", "task-planning/score_task.algal", 1]] as const) {
    const error = failure(compile(alias, key, depth));
    expect(error).toBeInstanceOf(SourceError);
    expect(error.message).toContain(`composition requires depth ${depth + 1}, exceeding max_depth ${depth}`);
  }
});

test("page drift is reported against the compiled source", async () => {
  const zero = `sha256:${"0".repeat(64)}`;
  const clamp = entry("clamp"), score = entry("score_task");
  // Every calling project reaches clamp, so each one reports the mismatch too,
  // and a digest that moved without a comparison record contradicts "Status".
  expect(await check(withField(page, "clamp", "Executable digest", `\`${zero}\``))).toEqual([
    `${clamp.path}: page pins executable digest ${zero}; the source compiles to ${clamp.digest}`,
    ...parsed.applications.map(item => `${item.entry}: ${clamp.path} compiles to ${clamp.digest}, not the listed ${zero}`),
    `${clamp.path}: "Status" lists it at ${clamp.digest}, but the page pins ${zero}; a revised program names its comparison record`,
  ]);
  const wrongInterface = await check(withField(page, "clamp", "Interface digest", `\`${zero}\``));
  expect(wrongInterface.slice(0, 2)).toEqual([
    `${clamp.path}: page pins interface digest ${zero}; the lock records ${clamp.interfaceDigest}`,
    `${clamp.path}: page pins interface digest ${zero}; the dependency report resolves ${clamp.interfaceDigest}`,
  ]);
  expect(wrongInterface.slice(2)).toEqual(parsed.applications.map(item => `${item.entry}: ${clamp.path} resolves interface digest ${clamp.interfaceDigest}, not the listed ${zero}`));
  expect(await check(withField(page, "score_task", "Interface", "inputs `task: json`, `weights: json`; outputs `result: json`."))).toEqual([
    `${score.path}: page shows interface "inputs \`task: json\`, \`weights: json\`; outputs \`result: json\`."; the source resolves "${score.interface}"`,
  ]);
  expect(await check(withField(page, "score_task", "Depends on", "None."))).toEqual([`${score.path}: calls ${clamp.path}, which "Depends on" omits`]);
  expect(await check(withField(page, "clamp", "Depends on", `${link(score.path)}.`))).toEqual([`${clamp.path}: "Depends on" lists ${score.path}, which it does not call`]);
  expect(await check(withField(page, "clamp", "Compiler", "`algal.source.profile.v1`, version `0.0.0`."))).toEqual([
    `${clamp.path}: page names compiler "\`algal.source.profile.v1\`, version \`0.0.0\`."; the source compiles with "${clamp.compiler}"`,
  ]);
  const omitted = clamp.callers.filter(path => path !== "task-planning/inspect_task.algal");
  expect(await check(withField(page, "clamp", "Callers", omitted.map(link).join(", ")))).toEqual([
    `${clamp.path}: caller task-planning/inspect_task.algal is missing from the page`,
  ]);
  expect(await check(withField(page, "clamp", "Callers", [...clamp.callers, "task-planning/choose_action.algal"].map(link).join(", ")))).toEqual([
    `${clamp.path}: listed caller task-planning/choose_action.algal does not call it in any calling project`,
  ]);
});

test("an entry needs calling files in two projects", async () => {
  // Drop the support queue and its callers: every remaining caller is in one project.
  let single = withoutLine(page, `| ${link("support-queue/main.algal")} |`);
  for (const item of parsed.entries) {
    single = withField(single, item.name, "Callers", item.callers.filter(path => !path.startsWith("support-queue/")).map(link).join(", "));
  }
  expect(await check(single)).toEqual(parsed.entries.map(item => `${item.path}: needs callers in at least two files across at least two projects; the page lists 2 files in 1 project`));
});

test("source drift fails the check until the page carries the new digests", async () => {
  const dir = await scratchRepository(parsed);
  try {
    expect(await check(page, dir)).toEqual([]);
    const clampFile = join(dir, LIBRARY_INDEX_PROJECTS, "task-planning/lib/clamp.algal");
    const original = await readFile(clampFile, "utf8");
    // A comment changes the source text, not the executable digest the catalog pins.
    await writeFile(clampFile, `// Formatting only.\n${original}`);
    expect(await check(page, dir)).toEqual([]);
    await writeFile(clampFile, original.replace("else { value }", "else { value + 1 }"));
    const drift = await check(page, dir);
    const clamp = entry("clamp"), score = entry("score_task");
    expect(drift).toHaveLength(2 + 2 * parsed.applications.length);
    expect(drift[0]).toStartWith(`${clamp.path}: page pins executable digest ${clamp.digest}; the source compiles to sha256:`);
    expect(drift[1]).toStartWith(`${score.path}: page pins executable digest ${score.digest}; the source compiles to sha256:`);
    for (const line of drift.slice(2)) expect(line).toMatch(/^(task-planning\/main|task-planning\/inspect_task|support-queue\/main)\.algal: task-planning\/(lib\/clamp|score_task)\.algal compiles to sha256:[0-9a-f]{64}, not the listed sha256:[0-9a-f]{64}$/);
    await writeFile(clampFile, original);
    // A copied helper keeps the digest but is not the listed file, so its caller no longer counts.
    const queue = join(dir, LIBRARY_INDEX_PROJECTS, "support-queue");
    await writeFile(join(queue, "clamp_copy.algal"), original);
    const triage = await readFile(join(queue, "triage_ticket.algal"), "utf8");
    await writeFile(join(queue, "triage_ticket.algal"), triage.replace("../task-planning/lib/clamp.algal", "./clamp_copy.algal"));
    expect(await check(page, dir)).toEqual([
      `support-queue/main.algal: support-queue/clamp_copy.algal has the digest of ${clamp.path}; import the listed file instead of a copy`,
      `${clamp.path}: listed caller support-queue/triage_ticket.algal does not call it in any calling project`,
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the page parser rejects unknown, missing, malformed, and oversized data", () => {
  const rejects = (text: unknown, pattern: RegExp, code = "PARSE_FAILED") => {
    const error = failure(() => parseLibraryIndex(text));
    expect({ code: error.code, message: error.message }).toMatchObject({ code, message: expect.stringMatching(pattern) });
  };
  rejects(42, /page must be text/);
  rejects("x".repeat(LIBRARY_INDEX_BOUNDS.maxBytes + 1), /exceeds 131072 bytes/, "BUDGET_EXHAUSTED");
  rejects("\n".repeat(LIBRARY_INDEX_BOUNDS.maxLines), /exceeds 2048 lines/, "BUDGET_EXHAUSTED");
  rejects(`${page}\tstray`, /control character/);
  rejects(`${page}\n\`\`\`sh\n`, /code fence is not closed/);
  rejects(page.replace("## Calling projects", "## Callers"), /exactly one "## Calling projects" section/);
  rejects(page.replace("| Entry point | Source root | Purpose |", "| Entry point | Root | Purpose |"), /columns must be Entry point, Source root, Purpose/);
  rejects(page.replace("| `examples/source/projects` |", "| `examples/source` |"), /source root must be examples\/source\/projects or examples\/source\/projects\/support-queue/);
  rejects(withField(page, "clamp", "Status", "Listed.\n- **Owner:** Someone."), /unknown field "Owner"/);
  rejects(withField(page, "clamp", "Status", "Listed.\n- **Status:** Listed again."), /repeats the field "Status"/);
  rejects(withoutLine(page, "- **Status:** "), /missing the field "Status"/);
  rejects(withField(page, "clamp", "Status", "Listed.\n  - A nested item."), /list item without a field label/);
  rejects(withField(page, "clamp", "Status", "Listed.\nAn unindented continuation."), /must be indented two spaces or follow a blank line/);
  rejects(withField(page, "clamp", "Executable digest", "`sha256:abc`"), /must be one sha256 digest in code/);
  rejects(withField(page, "clamp", "Unseen cases", "A file the maintainers keep."), /"Unseen cases" must be "None pinned." or one sha256 digest in code/);
  const clampDigest = parsed.entries[0]!.digest;
  const revised = (record: string) => `Revised from \`${clampDigest}\` after the comparison ${record}.`;
  rejects(withField(page, "clamp", "Status", "Listed, first revision."), /"Status" must be "Listed at `sha256:…`." or "Revised from/);
  rejects(withField(page, "clamp", "Status", `Listed at ${clampDigest}.`), /"Status" must be "Listed at/);
  rejects(withField(page, "clamp", "Status", revised("in review")), /"Status" must be "Listed at/);
  rejects(withField(page, "clamp", "Status", revised(`${link("task-planning/a.algal")} and ${link("task-planning/b.algal")}`)), /"Status" must be "Listed at/);
  rejects(withField(page, "clamp", "Status", revised("[`clamp.comparison.json`](../examples/source/projects/clamp.comparison.json)")), /relative path of plain segments ending in \.json/);
  rejects(withField(page, "clamp", "Status", revised("[`task-planning/c.json`](../records/task-planning/c.json)")), /must link to \.\.\/examples\/source\/projects\/task-planning\/c\.json/);
  rejects(withField(page, "clamp", "Path", "[`task-planning/lib/clamp.algal`](../examples/source/projects/task-planning/score_task.algal)"), /must link to/);
  rejects(withField(page, "clamp", "Path", link("task-planning/../clamp.algal")), /relative path of plain segments/);
  rejects(withField(page, "clamp", "Callers", "[clamp](../examples/source/projects/task-planning/score_task.algal)"), /label is not a single code span/);
  rejects(withField(page, "clamp", "Callers", `${link("task-planning/score_task.algal")}, ${link("task-planning/score_task.algal")}`), /lists task-planning\/score_task\.algal twice/);
  rejects(withField(page, "clamp", "Callers", "The planner."), /needs at least one link/);
  rejects(withField(page, "clamp", "Callers", Array.from({ length: LIBRARY_INDEX_BOUNDS.maxLinks + 1 }, (_, index) => link(`p${index}/x.algal`)).join(" ")), /more than 32 links/, "BUDGET_EXHAUSTED");
  const section = page.slice(page.indexOf("### `clamp`"), page.indexOf("### `score_task`"));
  rejects(page.replace(section, `${section}${section}`), /"Programs" lists clamp twice/);
  rejects(page.replace(section, section.repeat(LIBRARY_INDEX_BOUNDS.maxEntries + 1)), /more than 32 entries/, "BUDGET_EXHAUSTED");
});

const digest0 = (char: string): Digest => `sha256:${char.repeat(64)}`;
/** A passing comparison record over made-up digests that ends `path` at `to`. */
function comparisonRecord(change: { path: string; name: string; to: Digest; interface: Digest; dependent?: { path: string; to: Digest }; moved?: boolean }): JsonObject {
  const parts = {
    base: { digest: digest0("0"), interface: change.interface },
    candidate: { digest: change.to, interface: change.interface },
    unseen: digest0("1"),
    dependents: change.dependent === undefined ? [] : [{ path: change.dependent.path, base: digest0("5"), candidate: change.dependent.to }],
    callers: [{ entry: "a/main.algal", root: "examples/source/projects", cases: null, base: digest0("2"), candidate: digest0("3") }],
    cases: [{
      set: "unseen", entry: "a/main.algal", name: "case",
      base: { outcome: "complete", outputs: digest0("4") },
      candidate: change.moved === true ? { outcome: "failed", outputs: digest0("6") } : { outcome: "complete", outputs: digest0("4") },
    }],
  };
  const verdict = libraryComparisonVerdict(parts as Parameters<typeof libraryComparisonVerdict>[0]);
  return {
    contract: LIBRARY_COMPARISON_CONTRACT, name: change.name, path: change.path,
    compiler: { profile: "algal.source.profile.v1", version: "1.5.0" }, runtime: "0.1.0",
    ...parts, verdict: { ...verdict, notCompiled: [...verdict.notCompiled], changed: [...verdict.changed], notRun: [...verdict.notRun] },
  } as JsonObject;
}
/** Pin `record` under `projects` in the scratch repository and name it in an
 * "Evidence" field appended to the entry, returning the page variant. */
async function pinEvidence(dir: string, name: string, recordPath: string, value: JsonObject, pin = digestCanonical(value)): Promise<string> {
  const target = join(dir, LIBRARY_INDEX_PROJECTS, recordPath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, canonicalize(value));
  return addedField(page, name, "Status", "Evidence", `[${`\`${recordPath}\``}](../${LIBRARY_INDEX_PROJECTS}/${recordPath}) \`${pin}\`.`);
}

test("an entry's evidence field pins a passing comparison record by digest", async () => {
  const dir = await scratchRepository(parsed);
  try {
    const clamp = entry("clamp"), score = entry("score_task");
    const recordPath = "task-planning/clamp.comparison.json";
    // A record that revises the entry itself to its listed digest justifies it.
    const direct = comparisonRecord({ path: clamp.path, name: clamp.name, to: clamp.digest, interface: clamp.interfaceDigest });
    const withDirect = parseLibraryIndex(await pinEvidence(dir, "clamp", recordPath, direct));
    expect(withDirect.entries.find(item => item.name === "clamp")!.evidence).toEqual([{ path: recordPath, digest: digestCanonical(direct) }]);
    expect(await checkLibraryIndex(withDirect, { repository: dir })).toEqual([]);
    // So does a record of another revision that moves it as a dependent.
    const asDependent = comparisonRecord({ path: score.path, name: score.name, to: digest0("7"), interface: score.interfaceDigest, dependent: { path: clamp.path, to: clamp.digest } });
    expect(await check(await pinEvidence(dir, "clamp", recordPath, asDependent), dir)).toEqual([]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("evidence problems are reported, never guessed past", async () => {
  const dir = await scratchRepository(parsed);
  try {
    const clamp = entry("clamp"), score = entry("score_task");
    const recordPath = "task-planning/clamp.comparison.json";
    const record = comparisonRecord({ path: clamp.path, name: clamp.name, to: clamp.digest, interface: clamp.interfaceDigest });
    // A record the entry does not pin is not read at all; the entry stays clean.
    const unpinned = parseLibraryIndex(addedField(page, "clamp", "Status", "Evidence", `[\`${recordPath}\`](../${LIBRARY_INDEX_PROJECTS}/${recordPath}) \`${digestCanonical(record)}\`.`));
    const pinnedElsewhere = await pinEvidence(dir, "clamp", recordPath, record);
    expect(await check(pinnedElsewhere, dir)).toEqual([]);
    expect(await checkLibraryIndex(unpinned, { repository: dir })).toEqual([]);
    // Missing file.
    const missing = parseLibraryIndex(addedField(page, "clamp", "Status", "Evidence", `[\`task-planning/absent.json\`](../${LIBRARY_INDEX_PROJECTS}/task-planning/absent.json) \`${digest0("9")}\`.`));
    const absent = await checkLibraryIndex(missing, { repository: dir });
    expect(absent).toEqual([expect.stringMatching(new RegExp(`^${clamp.path.replaceAll("/", "\\/")}: evidence record task-planning\\/absent\\.json could not be read`))]);
    // Pinned digest does not match the file's canonical JSON.
    const wrongPin = parseLibraryIndex(addedField(page, "clamp", "Status", "Evidence", `[\`${recordPath}\`](../${LIBRARY_INDEX_PROJECTS}/${recordPath}) \`${digest0("9")}\`.`));
    const mismatch = await checkLibraryIndex(wrongPin, { repository: dir });
    expect(mismatch).toHaveLength(1);
    expect(mismatch[0]).toMatch(new RegExp(`evidence record ${recordPath.replaceAll("/", "\\/")} has digest ${digestCanonical(record)}, not the pinned ${digest0("9")}`));
    // A record that passes but justifies a different entry at a different digest.
    const other = comparisonRecord({ path: score.path, name: score.name, to: score.digest, interface: score.interfaceDigest });
    const unjustified = await check(await pinEvidence(dir, "clamp", recordPath, other), dir);
    expect(unjustified).toEqual([`${clamp.path}: evidence record ${recordPath} does not justify ${clamp.path} at the listed digest`]);
    // A record that did not pass is not evidence either.
    const failed = comparisonRecord({ path: clamp.path, name: clamp.name, to: clamp.digest, interface: clamp.interfaceDigest, moved: true });
    expect(await check(await pinEvidence(dir, "clamp", recordPath, failed), dir)).toEqual([`${clamp.path}: evidence record ${recordPath} did not pass`]);
    // Foreign and contractless records are problems, not guesses.
    const foreign = { contract: "algal.run.v1", run: digest0("8") };
    expect(await check(await pinEvidence(dir, "clamp", recordPath, foreign), dir)).toEqual([
      `${clamp.path}: evidence record ${recordPath} is "algal.run.v1"; only ${LIBRARY_COMPARISON_CONTRACT} evidence is defined`,
    ]);
    const contractless = { note: "some text" };
    expect(await check(await pinEvidence(dir, "clamp", recordPath, contractless), dir)).toEqual([
      `${clamp.path}: evidence record ${recordPath} is a record without a contract; only ${LIBRARY_COMPARISON_CONTRACT} evidence is defined`,
    ]);
    // And a record under the right contract that does not parse.
    const malformed = { contract: LIBRARY_COMPARISON_CONTRACT };
    const invalidProblem = await check(await pinEvidence(dir, "clamp", recordPath, malformed), dir);
    expect(invalidProblem).toHaveLength(1);
    expect(invalidProblem[0]).toStartWith(`${clamp.path}: evidence record ${recordPath} is not a valid record (`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the evidence field parses strictly", () => {
  const rejects = (text: unknown, pattern: RegExp, code = "PARSE_FAILED") => {
    const error = failure(() => parseLibraryIndex(text));
    expect({ code: error.code, message: error.message }).toMatchObject({ code, message: expect.stringMatching(pattern) });
  };
  const pinned = `[\`task-planning/c.json\`](../${LIBRARY_INDEX_PROJECTS}/task-planning/c.json) \`${digest0("1")}\`.`;
  const two = `${pinned.slice(0, -1)}, [\`task-planning/d.json\`](../${LIBRARY_INDEX_PROJECTS}/task-planning/d.json) \`${digest0("2")}\`.`;
  const parsed2 = parseLibraryIndex(addedField(page, "clamp", "Status", "Evidence", two));
  expect(parsed2.entries.find(item => item.name === "clamp")!.evidence).toEqual([
    { path: "task-planning/c.json", digest: digest0("1") }, { path: "task-planning/d.json", digest: digest0("2") },
  ]);
  const evidence = (value: string) => addedField(page, "clamp", "Status", "Evidence", value);
  rejects(evidence("No records."), /"Evidence" needs at least one record link/);
  rejects(evidence(`[\`task-planning/c.json\`](../${LIBRARY_INDEX_PROJECTS}/task-planning/c.json).`), /must list "\[`record`\]\(path\) `sha256:…`" items separated by ", "/);
  rejects(evidence(`[\`task-planning/c.json\`](../${LIBRARY_INDEX_PROJECTS}/task-planning/c.json) digest.` ), /item task-planning\/c\.json must carry one sha256 digest in code/);
  rejects(evidence(`[\`task-planning/c.json\`](../${LIBRARY_INDEX_PROJECTS}/task-planning/c.json) \`${digest0("1")}\``), /items are separated by ", " and end in "\."/);
  rejects(evidence(`[\`task-planning/c.json\`](../${LIBRARY_INDEX_PROJECTS}/task-planning/c.json)\`${digest0("1")}\`.`), /must list "\[`record`\]\(path\) `sha256:…`" items separated by ", "/);
  rejects(evidence(`[\`task-planning/c.algal\`](../${LIBRARY_INDEX_PROJECTS}/task-planning/c.algal) \`${digest0("1")}\`.`), /relative path of plain segments ending in \.json/);
  rejects(evidence(`[\`task-planning/c.json\`](../records/task-planning/c.json) \`${digest0("1")}\`.`), /must link to/);
  rejects(evidence(`${pinned.slice(0, -1)}, [\`task-planning/c.json\`](../${LIBRARY_INDEX_PROJECTS}/task-planning/c.json) \`${digest0("2")}\`.`), /lists task-planning\/c\.json twice/);
  rejects(evidence(`[label](../${LIBRARY_INDEX_PROJECTS}/task-planning/c.json) \`${digest0("1")}\`.`), /label is not a single code span/);
  // The links bound counts `](` markers, so bare links reach it first.
  rejects(evidence(Array.from({ length: LIBRARY_INDEX_BOUNDS.maxLinks + 1 }, (_, index) => `[\`t/c${index}.json\`](../${LIBRARY_INDEX_PROJECTS}/t/c${index}.json)`).join(", ")), /more than 32 links/, "BUDGET_EXHAUSTED");
});
