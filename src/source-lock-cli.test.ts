import { expect, test } from "bun:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
