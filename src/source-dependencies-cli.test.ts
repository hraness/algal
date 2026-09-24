import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { canonicalize, type JsonObject } from "./values";

const root = resolve(import.meta.dir, "..");
const planner = join(root, "examples/source/projects/task-planning/main.algal");
async function cli(...args: string[]) {
  const child = Bun.spawn([process.execPath, "cli.ts", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  return { stdout, stderr, code };
}

test("dependencies prints a canonical report, renders text, and checks a bundle", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-dependencies-cli-"));
  try {
    const plain = await cli("dependencies", planner);
    expect(plain.code, plain.stderr).toBe(0);
    expect(plain.stderr).toBe("");
    const report = JSON.parse(plain.stdout) as JsonObject;
    expect(plain.stdout).toBe(`${canonicalize(report)}\n`);
    expect(report.contract).toBe("algal.source-dependencies.v1");
    expect(report.counts).toEqual({ sourceUnits: 6, uniqueModules: 6, dependencyModules: 5, occurrences: 7, compositionEdges: 6, maxDepth: 3 });
    expect(report.bundle).toBeUndefined();
    const text = await cli("dependencies", planner, "--format", "text");
    expect(text.code, text.stderr).toBe(0);
    expect(text.stdout).toContain("Source files");
    expect(text.stdout).toContain("lib/clamp.algal · 2 occurrences");
    expect(text.stdout).toContain("[each ≤16 items]");
    const out = join(dir, "report.json");
    const written = await cli("dependencies", planner, "--out", out);
    expect(written.code, written.stderr).toBe(0);
    expect(written.stdout).toBe("");
    expect(written.stderr).toContain("wrote");
    expect(await readFile(out, "utf8")).toBe(plain.stdout);
    const bundlePath = join(dir, "planner.bundle.json");
    const compiled = await cli("compile", planner, "--bundle-out", bundlePath);
    expect(compiled.code, compiled.stderr).toBe(0);
    const checked = await cli("dependencies", planner, "--bundle", bundlePath);
    expect(checked.code, checked.stderr).toBe(0);
    const checkedReport = JSON.parse(checked.stdout) as JsonObject;
    expect(checkedReport.bundle).toMatchObject({ manifests: 6, values: 0, reachable: 6, unreachable: 0 });
    const { bundle: _bundle, ...rest } = checkedReport;
    expect(rest).toEqual(report);
    const bundle = JSON.parse(await readFile(bundlePath, "utf8")) as JsonObject;
    const manifests = bundle.manifests as JsonObject;
    const [victim] = Object.keys(manifests).filter(digest => digest !== bundle.root);
    const tampered = join(dir, "tampered.bundle.json");
    await writeFile(tampered, JSON.stringify({ ...bundle, manifests: { ...manifests, [victim!]: { ...(manifests[victim!] as JsonObject), name: "changed" } } }));
    const mismatch = await cli("dependencies", planner, "--bundle", tampered);
    expect(mismatch.code).toBe(2);
    expect(mismatch.stdout).toBe("");
    expect(JSON.parse(mismatch.stderr).error).toBe("DIGEST_MISMATCH");
    const incomplete = join(dir, "incomplete.bundle.json");
    const { [victim!]: _removed, ...remaining } = manifests;
    await writeFile(incomplete, JSON.stringify({ ...bundle, manifests: remaining }));
    const missing = await cli("dependencies", planner, "--bundle", incomplete);
    expect(missing.code).toBe(2);
    expect(JSON.parse(missing.stderr).error).toBe("STORE_MISS");
    const deep = join(dir, "deep.json");
    await writeFile(deep, `${"[".repeat(200)}${"]".repeat(200)}`);
    const nested = await cli("dependencies", planner, "--bundle", deep);
    expect(nested.code).toBe(2);
    expect(JSON.parse(nested.stderr)).toMatchObject({ error: "BUDGET_EXHAUSTED" });
    expect(JSON.parse(nested.stderr).message).toContain("nesting depth");
    const directory = await cli("dependencies", planner, "--bundle", dir);
    expect(directory.code).toBe(2);
    expect(JSON.parse(directory.stderr).error).toBe("BUDGET_EXHAUSTED");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("dependencies rejects malformed flags, aliased outputs, and reports source errors without writing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-dependencies-flags-"));
  try {
    for (const [args, fragment] of [
      [[], "usage:"], [[planner, planner], "usage:"], [[planner, "--format", "yaml"], "json or text"],
      [[planner, "--bundle"], "--bundle requires a value"], [[planner, "--modules", dir], "unknown dependencies option"],
      [[planner, "--out", planner], "aliases an input"], [[planner, "--out", join(root, "examples/source/projects/task-planning/lib/clamp.algal")], "aliases an input"],
    ] as const) {
      const result = await cli("dependencies", ...args);
      expect(result.code, args.join(" ")).toBe(2);
      expect(result.stdout).toBe("");
      const error = JSON.parse(result.stderr) as JsonObject;
      expect(error.error).toBe("PARSE_FAILED");
      expect(String(error.message)).toContain(fragment);
    }
    const bundlePath = join(dir, "planner.bundle.json");
    expect((await cli("compile", planner, "--bundle-out", bundlePath)).code).toBe(0);
    const aliased = await cli("dependencies", planner, "--bundle", bundlePath, "--out", bundlePath);
    expect(aliased.code).toBe(2);
    expect(JSON.parse(aliased.stderr).message).toContain("aliases an input");
    expect(JSON.parse(await readFile(bundlePath, "utf8")).contract).toBe("algal.bundle.v1");
    await mkdir(join(dir, "broken"));
    const entry = join(dir, "broken/main.algal");
    await writeFile(entry, `import helper from "./helper.algal"
program main(x: json) -> json { budget { max_agent_calls: 0 } return call helper using { x: x } }`);
    await writeFile(join(dir, "broken/helper.algal"), `program helper(x: json) -> json {
  budget { max_agent_calls: 0 }
  return y
}`);
    const out = join(dir, "never.json");
    const failed = await cli("dependencies", entry, "--out", out);
    expect(failed.code).toBe(2);
    expect(failed.stdout).toBe("");
    const error = JSON.parse(failed.stderr) as JsonObject;
    expect(error.error).toBe("PARSE_FAILED");
    expect(String(error.message)).toContain("helper.algal:3:");
    expect((error.diagnostic as JsonObject).contract).toBe("algal.source-error.v1");
    expect(await Bun.file(out).exists()).toBe(false);
    const text = await cli("dependencies", entry, "--diagnostic-format", "text");
    expect(text.code).toBe(2);
    expect(text.stderr).toContain("return y");
    expect(text.stderr).toContain("main.algal:1:");
    const rooted = await cli("dependencies", entry, "--source-root", dir);
    expect(rooted.code).toBe(2);
    expect((JSON.parse(rooted.stderr).diagnostic as JsonObject).source).toBe("broken/helper.algal");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("dependencies joins a recorded receipt and rejects aliased or nonregular receipt paths", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-dependencies-receipt-"));
  try {
    const receiptPath = join(dir, "planner.receipt.json");
    const ran = await cli("run", planner, "--args", join(root, "examples/source/projects/task-planning/main.args.json"), "--dir", join(dir, "store"));
    expect(ran.code, ran.stderr).toBe(0);
    await writeFile(receiptPath, ran.stdout);
    const joined = await cli("dependencies", planner, "--receipt", receiptPath);
    expect(joined.code, joined.stderr).toBe(0);
    const report = JSON.parse(joined.stdout) as JsonObject;
    const execution = report.execution as JsonObject;
    expect(execution.outcome).toBe("complete");
    expect(execution.unattributed).toEqual({ cells: 0, work: 0 });
    expect((execution.occurrences as JsonObject[]).map(entry => entry.invocations)).toEqual([1, 3, 3, 3, 3, 3, 3]);
    expect(joined.stdout).toBe(`${canonicalize(report)}\n`);
    const text = await cli("dependencies", planner, "--receipt", receiptPath, "--format", "text");
    expect(text.code, text.stderr).toBe(0);
    expect(text.stdout).toContain("Recorded execution");
    expect(text.stdout).toContain("Unattributed: 0 cells · 0 work");
    const aliased = await cli("dependencies", planner, "--receipt", receiptPath, "--out", receiptPath);
    expect(aliased.code).toBe(2);
    expect(JSON.parse(aliased.stderr).message).toContain("aliases an input");
    expect(JSON.parse(await readFile(receiptPath, "utf8")).contract).toBe("algal.run.v1");
    const directory = await cli("dependencies", planner, "--receipt", dir);
    expect(directory.code).toBe(2);
    expect(JSON.parse(directory.stderr).error).toBe("BUDGET_EXHAUSTED");
    const inspector = join(root, "examples/source/projects/task-planning/inspect_task.algal");
    const mismatch = await cli("dependencies", inspector, "--receipt", receiptPath);
    expect(mismatch.code).toBe(2);
    expect(JSON.parse(mismatch.stderr).error).toBe("DIGEST_MISMATCH");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
