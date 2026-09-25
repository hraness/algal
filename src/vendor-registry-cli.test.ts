import { expect, test } from "bun:test";
import { mkdir, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ENTRY, scratchCatalog, temporary } from "./fixtures/vendor-catalog";
import { canonicalize, type JsonObject } from "./values";

const repository = resolve(import.meta.dir, "..");
async function cli(cwd: string, ...args: string[]) {
  const child = Bun.spawn([process.execPath, join(repository, "cli.ts"), ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
}
const message = (stderr: string) => String((JSON.parse(stderr) as JsonObject).message);
const CONSUMER = `import score_task from "./vendor/algal/task-planning/score_task.algal"

program main(task: json, weights: json) -> json {
  budget { max_agent_calls: 0, max_depth: 2 }
  return call score_task using { task: task, weights: weights }
}
`;

test("vendor check emits the report, vendor update proposes into a fresh directory, and --from resolves registry names", async () => {
  await temporary("algal-registry-cli-", async dir => {
    const page = await scratchCatalog(dir);
    const project = join(dir, "project");
    await mkdir(project);
    const vendored = await cli(project, "vendor", page, "--entry", ENTRY, "--into", "vendor/algal");
    expect(vendored.code, vendored.stderr).toBe(0);
    const record = JSON.parse(vendored.stdout) as JsonObject;
    await writeFile(join(project, "main.algal"), CONSUMER);

    // check: one unchanged entry, printed as canonical JSON.
    const checked = await cli(project, "vendor", "check", "main.algal");
    expect(checked.code, checked.stderr).toBe(0);
    const report = JSON.parse(checked.stdout) as JsonObject & { entries: JsonObject[] };
    expect(checked.stdout).toBe(`${canonicalize(report)}\n`);
    expect(report).toMatchObject({ contract: "algal.vendor-check.v1" });
    expect(report.entries).toMatchObject([{ directory: "vendor/algal", entry: ENTRY, origin: record.origin, catalog: record.catalog, status: "unchanged", live: record.catalog }]);
    const text = await cli(project, "vendor", "check", "main.algal", "--format", "text");
    expect(text.code).toBe(0);
    expect(text.stdout).toContain("1 directory");
    expect(text.stdout).toContain("1 unchanged");
    expect(text.stdout).toContain("vendor/algal");
    // An origin that cannot be read is a fact in the report, exit 0.
    await rm(page);
    const gone = await cli(project, "vendor", "check", "main.algal");
    expect(gone.code, gone.stderr).toBe(0);
    expect((JSON.parse(gone.stdout) as { entries: JsonObject[] }).entries[0]).toMatchObject({ status: "unreadable" });

    // update: a proposal naming old and new pins, and a fresh directory.
    await scratchCatalog(dir);
    const updated = await cli(project, "vendor", "update", "vendor/algal", "--into", "vendor/next");
    expect(updated.code, updated.stderr).toBe(0);
    const proposal = JSON.parse(updated.stdout) as JsonObject & { from: JsonObject; to: JsonObject };
    expect(updated.stdout).toBe(`${canonicalize(proposal)}\n`);
    expect(proposal).toMatchObject({ contract: "algal.vendor-update.v1", status: "unchanged" });
    expect(proposal.from).toMatchObject({ directory: "vendor/algal", origin: record.origin, catalog: record.catalog, entry: ENTRY });
    expect(proposal.to).toMatchObject({ directory: "vendor/next", origin: record.origin, catalog: record.catalog, entry: ENTRY });
    expect(updated.stderr).toContain("vendored an update for vendor/algal into vendor/next");
    // The copy it wrote is real, and the pinned copy is untouched.
    expect((await readdir(join(project, "vendor"))).sort()).toEqual(["algal", "next"]);
    expect(await readFile(join(project, "vendor/algal/algal.vendor.json"), "utf8")).toBe(vendored.stdout);
    const refused = await cli(project, "vendor", "update", "vendor/algal", "--into", "vendor/algal");
    expect(refused.code).toBe(2);
    expect(message(refused.stderr)).toContain("vendor/algal already exists");

    // --from resolves names in algal.registries.json for vendor and vendor check.
    const registries = { contract: "algal.registries.v1", registries: { local: pathToFileURL(await realpath(page)).href } };
    await writeFile(join(project, "algal.registries.json"), JSON.stringify(registries));
    const named = await cli(project, "vendor", "--from", "local", "--entry", ENTRY, "--into", "vendor/named");
    expect(named.code, named.stderr).toBe(0);
    expect((JSON.parse(named.stdout) as JsonObject).origin).toBe(registries.registries.local);
    const filtered = await cli(project, "vendor", "check", "main.algal", "--from", "local", "--format", "text");
    expect(filtered.code, filtered.stderr).toBe(0);
    expect(filtered.stdout).toContain("vendor/algal");
    expect(filtered.stdout).not.toContain("vendor/next");
    const unknown = await cli(project, "vendor", "check", "main.algal", "--from", "elsewhere");
    expect(unknown.code).toBe(2);
    expect(message(unknown.stderr)).toContain('no registry named "elsewhere"');
    // Positional and --from are exclusive.
    expect((await cli(project, "vendor", page, "--from", "local", "--entry", ENTRY, "--into", "vendor/x")).code).toBe(2);
    // Bad and unknown options stay exit 2.
    for (const [args, fragment] of [
      [["vendor", "check"], "usage: algal vendor check"],
      [["vendor", "check", "main.algal", "--into", "x"], "unknown vendor check option --into"],
      [["vendor", "update", "vendor/algal"], "usage: algal vendor update"],
      [["vendor", "update", "vendor/algal", "--into", "vendor/x", "--format", "text"], "unknown vendor update option --format"],
      [["vendor", "update", "../escape", "--into", "vendor/x"], "normalized project-relative directory"],
      [["vendor", page, "--entry", ENTRY, "--into", "vendor/x", "--timeout-ms", "0"], "timeout must be 1 to 60000"],
    ] as const) {
      const result = await cli(project, ...args);
      expect(result.code, args.join(" ")).toBe(2);
      expect(result.stdout).toBe("");
      expect(message(result.stderr)).toContain(fragment);
    }

    // lock --registries records the names; verify accepts them without fetching.
    const lockPath = join(dir, "main.lock.json");
    const locked = await cli(project, "lock", "main.algal", "--registries", join(project, "algal.registries.json"), "--out", lockPath);
    expect(locked.code, locked.stderr).toBe(0);
    const lock = JSON.parse(await readFile(lockPath, "utf8")) as JsonObject;
    expect(lock.registries).toEqual(registries.registries);
    const verified = await cli(project, "lock", "main.algal", "--verify", lockPath);
    expect(verified.code, verified.stderr).toBe(0);
    // A lock without the field keeps its exact bytes: no registries key appears.
    const plainPath = join(dir, "plain.lock.json");
    expect((await cli(project, "lock", "main.algal", "--out", plainPath)).code).toBe(0);
    expect(await readFile(plainPath, "utf8")).not.toContain("registries");
  });
}, 120_000);

test("dependencies and other offline commands never contact a vendored copy's origin", async () => {
  await temporary("algal-registry-cli-offline-", async dir => {
    const page = await scratchCatalog(dir);
    const project = join(dir, "project");
    await mkdir(project);
    expect((await cli(project, "vendor", page, "--entry", ENTRY, "--into", "vendor/algal")).code).toBe(0);
    await writeFile(join(project, "main.algal"), CONSUMER);
    // The origin is gone entirely: offline commands do not notice.
    await rm(join(dir, "catalog"), { recursive: true });
    const dependencies = await cli(project, "dependencies", "main.algal");
    expect(dependencies.code, dependencies.stderr).toBe(0);
    const lockPath = join(dir, "main.lock.json");
    expect((await cli(project, "lock", "main.algal", "--out", lockPath)).code).toBe(0);
    expect((await cli(project, "lock", "main.algal", "--verify", lockPath)).code).toBe(0);
  });
}, 120_000);
