import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ApplicationService } from "./application";
import { APPLICATION, buildGradesApplication, gradeSource, labelSource, permissive } from "./fixtures/source-dependencies-application";
import { canonicalize, type JsonObject } from "./values";

const root = resolve(import.meta.dir, "..");
async function cli(...args: string[]) {
  const child = Bun.spawn([process.execPath, "cli.ts", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
}
/** Every file below `dir` with its size, so a read-only command can be checked. */
async function listing(dir: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (path: string): Promise<void> => {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) await walk(child);
      else out.push(`${child.slice(dir.length)}:${(await stat(child)).size}`);
    }
  };
  await walk(dir);
  return out.sort();
}

test("dependencies links an application store read-only and adds invocation bounds", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-dependencies-application-"));
  try {
    const project = join(dir, "project");
    await mkdir(join(project, "lib"), { recursive: true });
    await writeFile(join(project, "main.algal"), gradeSource);
    await writeFile(join(project, "lib/label.algal"), labelSource);
    const entry = join(project, "main.algal");
    const store = join(dir, "store");
    const fixture = await buildGradesApplication(new ApplicationService(store, permissive));
    const before = await listing(store);
    const joined = await cli("dependencies", entry, "--application", APPLICATION, "--dir", store, "--estimate");
    expect(joined.code, joined.stderr).toBe(0);
    const report = JSON.parse(joined.stdout) as JsonObject;
    expect(joined.stdout).toBe(`${canonicalize(report)}\n`);
    const application = report.application as JsonObject;
    expect(application.head).toBe(fixture.states.noted.digest);
    expect(application.counts).toEqual({
      states: 3, revisions: { matched: 2, unmatched: 1, unresolved: 0 }, evaluations: { matched: 2, unmatched: 1, unreadable: 1 },
      evidence: { examined: 5, unreadable: 0 }, manifests: { examined: 3, unreadable: 0 },
    });
    expect((application.entrypoints as JsonObject[]).map(row => [row.revision, row.root, row.current])).toEqual([[fixture.revisions.r1, true, true], [fixture.revisions.r2, false, false]]);
    expect(((report.estimate as JsonObject).occurrences as JsonObject[]).map(entry => [entry.min, entry.max])).toEqual([[1, 1], [1, 1]]);
    const text = await cli("dependencies", entry, "--application", APPLICATION, "--dir", store, "--format", "text");
    expect(text.code, text.stderr).toBe(0);
    expect(text.stdout).toContain("Application revision entrypoints");
    expect(text.stdout).toContain("contains the root · activated by activate at state 1 · current");
    expect(text.stdout).not.toContain("Invocation bounds");
    const plain = await cli("dependencies", entry);
    const { application: _application, estimate: _estimate, ...rest } = report;
    expect(JSON.parse(plain.stdout)).toEqual(rest);
    expect(await listing(store)).toEqual(before);
    // A changed record file in the store is counted as unreadable evidence.
    await writeFile(join(store, "values", `${fixture.evidence.note.slice(7)}.json`), JSON.stringify({ contract: "algal.fixture-note.v1", text: "changed" }));
    const tampered = await cli("dependencies", entry, "--application", APPLICATION, "--dir", store);
    expect(tampered.code, tampered.stderr).toBe(0);
    expect(((JSON.parse(tampered.stdout) as JsonObject).application as JsonObject).counts).toMatchObject({ evidence: { examined: 5, unreadable: 1 } });
    // The store is an input, so a report may not be written inside it.
    const head = join(store, "applications", APPLICATION, "head.json");
    const original = await readFile(head, "utf8");
    const inside = await cli("dependencies", entry, "--application", APPLICATION, "--dir", store, "--out", head);
    expect(inside.code).toBe(2);
    expect(JSON.parse(inside.stderr).message).toContain("must not write inside the application store");
    expect(await readFile(head, "utf8")).toBe(original);
    const missing = await cli("dependencies", entry, "--application", "absent", "--dir", store);
    expect(missing.code).toBe(2);
    expect(JSON.parse(missing.stderr).error).toBe("STORE_MISS");
    const nowhere = join(dir, "nowhere");
    const empty = await cli("dependencies", entry, "--application", APPLICATION, "--dir", nowhere);
    expect(JSON.parse(empty.stderr).error).toBe("STORE_MISS");
    expect(await stat(nowhere).then(() => true, () => false)).toBe(false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("dependencies rejects malformed estimate and application flags", async () => {
  const planner = join(root, "examples/source/projects/task-planning/main.algal");
  for (const [args, fragment] of [
    [[planner, "--estimate", "yes"], "--estimate is a boolean flag without a value"],
    [[planner, "--dir", "somewhere"], "requires --application"],
    [[planner, "--application"], "--application requires a value"],
    [[planner, "--application", "Not A Name", "--dir", "somewhere"], "application name must match"],
  ] as const) {
    const result = await cli("dependencies", ...args);
    expect(result.code, args.join(" ")).toBe(2);
    expect(result.stdout).toBe("");
    const error = JSON.parse(result.stderr) as JsonObject;
    expect(error.error).toBe("PARSE_FAILED");
    expect(String(error.message)).toContain(fragment);
  }
  const estimated = await cli("dependencies", planner, "--estimate", "--format", "text");
  expect(estimated.code, estimated.stderr).toBe(0);
  expect(estimated.stdout).toContain("Invocation bounds per root invocation");
  expect(estimated.stdout).toContain("\n  result-each  0 to 16\n");
});
