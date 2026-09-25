import { expect, test } from "bun:test";
import { cp, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { digestCanonical } from "./digest";
import { canonicalize, type JsonObject } from "./values";

const root = resolve(import.meta.dir, "..");
const planner = join(root, "examples/source/projects/task-planning/main.algal");
async function cli(...args: string[]) { return cliIn(root, ...args); }
async function cliIn(cwd: string, ...args: string[]) {
  const child = Bun.spawn([process.execPath, join(root, "cli.ts"), ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  return { stdout, stderr, code };
}

test("lock writes a canonical record, verifies it, and reports drift with exit 1", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-lock-cli-"));
  try {
    const lockPath = join(dir, "planner.lock.json");
    const written = await cli("lock", planner, "--out", lockPath);
    expect(written.code, written.stderr).toBe(0);
    expect(written.stdout).toBe("");
    const lock = JSON.parse(await readFile(lockPath, "utf8")) as JsonObject;
    expect(lock.contract).toBe("algal.source-lock.v1");
    expect(await readFile(lockPath, "utf8")).toBe(`${canonicalize(lock)}\n`);
    const printed = await cli("lock", planner);
    expect(printed.code).toBe(0);
    expect(printed.stdout).toBe(`${canonicalize(lock)}\n`);
    const verified = await cli("lock", planner, "--verify", lockPath);
    expect(verified.code, verified.stderr).toBe(0);
    const verification = JSON.parse(verified.stdout) as JsonObject;
    expect(verification).toMatchObject({ contract: "algal.source-lock-verification.v1", ok: true, drift: [] });
    const text = await cli("lock", planner, "--verify", lockPath, "--format", "text");
    expect(text.code).toBe(0);
    expect(text.stdout).toContain("ALGAL source lock · verified");
    const copy = join(dir, "project");
    await cp(join(root, "examples/source/projects/task-planning"), copy, { recursive: true });
    const clamp = join(copy, "lib/clamp.algal");
    await writeFile(clamp, (await readFile(clamp, "utf8")).replace("else { value }", "else { value + 1 }"));
    const drifted = await cli("lock", join(copy, "main.algal"), "--verify", lockPath, "--format", "text");
    expect(drifted.code).toBe(1);
    expect(drifted.stderr).toBe("");
    expect(drifted.stdout).toContain("ALGAL source lock · drift");
    expect(drifted.stdout).toContain("source lib/clamp.algal: expected sha256:");
    const driftedJson = await cli("lock", join(copy, "main.algal"), "--verify", lockPath);
    expect(driftedJson.code).toBe(1);
    expect((JSON.parse(driftedJson.stdout) as JsonObject).ok).toBe(false);
    for (const [args, fragment] of [
      [[planner, "--format", "text"], "only available with --verify"], [[planner, "--format", "yaml"], "json or text"],
      [[planner, "--modules", dir], "unknown lock option"], [[], "usage:"], [[planner, "--verify", lockPath, "--out", lockPath], "aliases an input"],
      [[planner, "--out", planner], "aliases an input"],
    ] as const) {
      const result = await cli("lock", ...args);
      expect(result.code, args.join(" ")).toBe(2);
      expect(result.stdout).toBe("");
      expect(String((JSON.parse(result.stderr) as JsonObject).message)).toContain(fragment);
    }
    expect(JSON.parse(await readFile(lockPath, "utf8")).contract).toBe("algal.source-lock.v1");
    const directory = await cli("lock", planner, "--verify", dir);
    expect(directory.code).toBe(2);
    expect((JSON.parse(directory.stderr) as JsonObject).error).toBe("BUDGET_EXHAUSTED");
    const broken = join(dir, "broken.algal");
    await writeFile(broken, "program broken(x: json) -> json { budget { max_agent_calls: 0 } return y }");
    const failed = await cli("lock", broken, "--out", join(dir, "never.json"));
    expect(failed.code).toBe(2);
    expect((JSON.parse(failed.stderr) as JsonObject).error).toBe("PARSE_FAILED");
    expect(await Bun.file(join(dir, "never.json")).exists()).toBe(false);
    // Usage errors come before compilation, and a lock that fails to parse writes nothing.
    const usageFirst = await cli("lock", broken, "--format", "text");
    expect(String((JSON.parse(usageFirst.stderr) as JsonObject).message)).toContain("only available with --verify");
    const malformed = join(dir, "malformed.lock.json");
    await writeFile(malformed, JSON.stringify({ ...lock, extra: true }));
    const report = join(dir, "verification.json");
    const rejected = await cli("lock", planner, "--verify", malformed, "--out", report);
    expect(rejected.code).toBe(2);
    expect((JSON.parse(rejected.stderr) as JsonObject).error).toBe("PARSE_FAILED");
    expect(await Bun.file(report).exists()).toBe(false);
    const stored = await cli("lock", planner, "--verify", lockPath, "--out", report);
    expect(stored.code, stored.stderr).toBe(0);
    expect((JSON.parse(await readFile(report, "utf8")) as JsonObject).ok).toBe(true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

type Drift = { kind: string; subject: string; expected: string; actual: string };
test("lock pins evaluation cases and labels, replays them only with --evaluate, and reports their drift with exit 1", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-lock-evaluation-cli-"));
  try {
    const copy = join(dir, "project");
    await cp(join(root, "examples/source/projects/task-planning"), copy, { recursive: true });
    const entry = join(copy, "main.algal");
    const plain = JSON.parse((await cli("lock", entry)).stdout) as { units: { source: string; manifestDigest: string }[] };
    const clamp = plain.units.find(unit => unit.source === "lib/clamp.algal")!.manifestDigest;
    const labels = join(dir, "labels.json");
    await writeFile(labels, JSON.stringify({ "clamp-2026-09": clamp }));
    const lockPath = join(dir, "task-plan.lock.json");
    // The committed case list pins the planner's three-task fixture.
    const written = await cli("lock", entry, "--evaluation", join(copy, "main.evaluation.json"), "--versions", labels, "--out", lockPath);
    expect(written.code, written.stderr).toBe(0);
    const lock = JSON.parse(await readFile(lockPath, "utf8")) as { evaluation: { cases: JsonObject[] }; versions: JsonObject };
    expect(lock.evaluation.cases.map(item => [item.name, item.outcome, (item.args as JsonObject).path])).toEqual([["three-tasks", "complete", "main.args.json"]]);
    expect(lock.versions).toEqual({ "clamp-2026-09": clamp });
    // The pinned outputs digest is the digest of the outputs `call --interface` prints.
    const bundle = join(dir, "task-plan.bundle.json");
    expect((await cli("compile", entry, "--bundle-out", bundle, "--out", join(dir, "task-plan.algal.json"))).code).toBe(0);
    const namedArgs = join(dir, "named-args.json");
    await writeFile(namedArgs, JSON.stringify((JSON.parse(await readFile(join(copy, "main.args.json"), "utf8")) as { input: JsonObject }).input));
    const called = await cli("call", bundle, "--interface", "--args", namedArgs, "--dir", join(dir, "store"));
    expect(called.code, called.stderr).toBe(0);
    const printed: string = digestCanonical((JSON.parse(called.stdout) as { outputs: JsonObject }).outputs);
    expect(printed).toBe(lock.evaluation.cases[0]!.outputs as string);
    const replayed = await cli("lock", entry, "--verify", lockPath, "--evaluate");
    expect(replayed.code, replayed.stderr).toBe(0);
    expect(JSON.parse(replayed.stdout)).toMatchObject({ ok: true, drift: [], evaluation: { cases: 1, replayed: true } });
    expect((await cli("lock", entry, "--verify", lockPath, "--evaluate", "--format", "text")).stdout).toContain("Evaluation: 1 pinned case replayed offline.");
    const skipped = await cli("lock", entry, "--verify", lockPath);
    expect(JSON.parse(skipped.stdout)).toMatchObject({ ok: true, evaluation: { cases: 1, replayed: false } });
    // A fixture edit is evaluation drift, visible only when cases replay.
    const argsPath = join(copy, "main.args.json");
    const original = await readFile(argsPath, "utf8");
    await writeFile(argsPath, original.replace('"weights": { "urgency": 2, "impact": 1 }', '"weights": { "urgency": 1, "impact": 1 }'));
    const fixture = await cli("lock", entry, "--verify", lockPath, "--evaluate", "--format", "text");
    expect(fixture.code).toBe(1);
    expect(fixture.stderr).toBe("");
    expect(fixture.stdout).toContain("ALGAL source lock · drift");
    expect(fixture.stdout).toContain("  evaluation three-tasks/args: expected sha256:");
    expect(fixture.stdout).toContain("  evaluation three-tasks/outputs: expected sha256:");
    expect((await cli("lock", entry, "--verify", lockPath)).code).toBe(0);
    await writeFile(argsPath, original);
    // A helper change drifts its label and the pinned outputs; the label is not moved.
    const clampPath = join(copy, "lib/clamp.algal");
    await writeFile(clampPath, (await readFile(clampPath, "utf8")).replace("else { value }", "else { value + 1 }"));
    const helper = await cli("lock", entry, "--verify", lockPath, "--evaluate");
    expect(helper.code).toBe(1);
    const drift = (JSON.parse(helper.stdout) as { drift: Drift[] }).drift;
    expect(drift.filter(item => item.kind === "version")).toEqual([{ kind: "version", subject: "clamp-2026-09", expected: clamp, actual: "(absent)" }]);
    expect(drift.at(-1)).toMatchObject({ kind: "evaluation", subject: "three-tasks/outputs" });
    expect((JSON.parse(await readFile(lockPath, "utf8")) as { versions: JsonObject }).versions).toEqual({ "clamp-2026-09": clamp });
    // Fixture keys are relative to the source root, like file keys.
    const rooted = join(dir, "rooted.lock.json");
    const rootedCases = join(dir, "rooted-cases.json");
    await writeFile(rootedCases, JSON.stringify([{ name: "three-tasks", args: "project/main.args.json" }]));
    await writeFile(clampPath, (await readFile(clampPath, "utf8")).replace("else { value + 1 }", "else { value }"));
    const fromRoot = await cli("lock", entry, "--source-root", dir, "--evaluation", rootedCases, "--out", rooted);
    expect(fromRoot.code, fromRoot.stderr).toBe(0);
    expect((JSON.parse(await readFile(rooted, "utf8")) as { evaluation: { cases: { args: JsonObject }[] } }).evaluation.cases[0]!.args.path).toBe("project/main.args.json");
    expect((await cli("lock", entry, "--source-root", dir, "--verify", rooted, "--evaluate")).code).toBe(0);
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 60_000);

test("lock evaluation refuses malformed requests, unguarded fixtures, and aliased outputs, and writes no store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-lock-evaluation-guards-"));
  try {
    const copy = join(dir, "project");
    await cp(join(root, "examples/source/projects/task-planning"), copy, { recursive: true });
    const entry = join(copy, "main.algal");
    const cases = join(copy, "main.evaluation.json");
    const lockPath = join(dir, "task-plan.lock.json");
    const plainPath = join(dir, "plain.lock.json");
    // Run from an empty directory: neither command creates a store.
    const cwd = join(dir, "cwd");
    await cp(join(copy, "lib"), join(cwd, "unrelated"), { recursive: true });
    expect((await cliIn(cwd, "lock", entry, "--evaluation", cases, "--out", lockPath)).code).toBe(0);
    expect((await cliIn(cwd, "lock", entry, "--verify", lockPath, "--evaluate")).code).toBe(0);
    expect((await readdir(cwd)).sort()).toEqual(["unrelated"]);
    expect((await cli("lock", entry, "--out", plainPath)).code).toBe(0);
    const rejected = async (args: string[], fragment: string, error?: string) => {
      const result = await cli("lock", ...args);
      expect(result.code, args.join(" ")).toBe(2);
      expect(result.stdout).toBe("");
      const report = JSON.parse(result.stderr) as JsonObject;
      expect(String(report.message), args.join(" ")).toContain(fragment);
      if (error !== undefined) expect(report.error).toBe(error);
    };
    await rejected([entry, "--evaluate"], "only available with --verify");
    await rejected([entry, "--verify", lockPath, "--evaluation", cases], "--verify reads them from the lock");
    await rejected([entry, "--verify", lockPath, "--versions", cases], "--verify reads them from the lock");
    await rejected([entry, "--verify", lockPath, "--evaluate", "extra"], "--evaluate is a boolean flag");
    await rejected([entry, "--evaluation"], "--evaluation requires a value");
    const write = async (name: string, value: unknown) => { const path = join(dir, name); await writeFile(path, JSON.stringify(value)); return path; };
    await rejected([entry, "--evaluation", await write("extra.json", [{ name: "x", args: "main.args.json", expect: "ok" }])], 'unknown key "expect"', "PARSE_FAILED");
    await rejected([entry, "--evaluation", await write("escape.json", [{ name: "x", args: "../outside.json" }])], "normalized project-relative .json path", "PARSE_FAILED");
    await rejected([entry, "--versions", await write("stray.json", { stray: `sha256:${"1".repeat(64)}` })], "outside the closure", "PARSE_FAILED");
    await writeFile(join(copy, "bad.args.json"), JSON.stringify({ input: { tasks: [{ title: "x", status: "open", urgency: "soon", impact: 1 }], weights: { urgency: 1, impact: 1 } } }));
    await rejected([entry, "--evaluation", await write("fails.json", [{ name: "bad", args: "bad.args.json" }])], "source lock case bad ended failed", "RECEIPT_MISMATCH");
    expect((await cli("lock", entry, "--evaluation", await write("expected-failure.json", [{ name: "bad", args: "bad.args.json", outcome: "failed" }]))).code).toBe(0);
    await rejected([entry, "--verify", plainPath, "--evaluate"], "pins no evaluation cases", "PARSE_FAILED");
    // An output may not overwrite a fixture it reads.
    const argsPath = join(copy, "main.args.json");
    const original = await readFile(argsPath, "utf8");
    await rejected([entry, "--evaluation", cases, "--out", argsPath], "aliases an input");
    await rejected([entry, "--verify", lockPath, "--evaluate", "--out", argsPath], "aliases an input");
    expect(await readFile(argsPath, "utf8")).toBe(original);
    // Fixtures use the source loader's guards: no symlinks, regular files only, a byte limit.
    await rm(argsPath);
    await rejected([entry, "--verify", lockPath, "--evaluate"], "cannot read fixture main.args.json (ENOENT)", "IO_FAILED");
    await writeFile(join(dir, "outside.json"), original);
    await symlink(join(dir, "outside.json"), argsPath);
    await rejected([entry, "--verify", lockPath, "--evaluate"], "symlink traversal is not allowed: main.args.json", "PARSE_FAILED");
    await rejected([entry, "--evaluation", cases], "symlink traversal is not allowed: main.args.json", "PARSE_FAILED");
    await rm(argsPath);
    await cp(join(copy, "lib"), argsPath, { recursive: true });
    await rejected([entry, "--verify", lockPath, "--evaluate"], "must contain directories and end in a regular file", "PARSE_FAILED");
    await rm(argsPath, { recursive: true });
    await writeFile(argsPath, `{"input":{"pad":"${"x".repeat(70_000)}"}}`);
    await rejected([entry, "--verify", lockPath, "--evaluate"], "fixture main.args.json exceeds 65536 bytes", "BUDGET_EXHAUSTED");
    await writeFile(argsPath, "{not json");
    await rejected([entry, "--verify", lockPath, "--evaluate"], "fixture main.args.json is not valid JSON", "PARSE_FAILED");
    await writeFile(argsPath, '{"input": []}');
    await rejected([entry, "--verify", lockPath, "--evaluate"], 'args fixture main.args.json cell "input" must be an object', "PARSE_FAILED");
    await writeFile(argsPath, original);
    expect((await cli("lock", entry, "--verify", lockPath, "--evaluate")).code).toBe(0);
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 60_000);
