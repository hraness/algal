import { expect, test } from "bun:test";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { CLAMP, CONSUMER, ENTRY, scratchCatalog, serveCatalog, temporary } from "./fixtures/vendor-catalog";
import { canonicalize, type JsonObject } from "./values";
import { vendorCatalogEntry } from "./vendor";

const repository = resolve(import.meta.dir, "..");
async function cli(cwd: string, ...args: string[]) {
  const child = Bun.spawn([process.execPath, join(repository, "cli.ts"), ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
}
const message = (stderr: string) => String((JSON.parse(stderr) as JsonObject).message);

test("vendor copies a catalog entry, and lock pins the copy and checks it with the usual exit codes", async () => {
  await temporary("algal-vendor-cli-", async dir => {
    const page = await scratchCatalog(dir);
    const project = join(dir, "project");
    await mkdir(project);
    const vendored = await cli(project, "vendor", page, "--entry", ENTRY, "--into", "vendor/algal");
    expect(vendored.code, vendored.stderr).toBe(0);
    const record = JSON.parse(vendored.stdout) as JsonObject & { files: JsonObject[] };
    expect(vendored.stdout).toBe(`${canonicalize(record)}\n`);
    expect(vendored.stderr).toBe("vendored 2 files into vendor/algal\n");
    expect(await readFile(join(project, "vendor/algal/algal.vendor.json"), "utf8")).toBe(vendored.stdout);
    for (const [args, fragment] of [
      [[page, "--entry", ENTRY], "usage: algal vendor"],
      [[page, "--entry", ENTRY, "--into", "vendor/other", "--source-root", project], "unknown vendor option --source-root"],
      [["http://127.0.0.1:9/docs/library.md", "--entry", ENTRY, "--into", "vendor/other"], "the catalog must be an https URL"],
      [[page, "--entry", ENTRY, "--into", "vendor/algal"], "vendor/algal already exists"],
      [[page, "--entry", ENTRY, "--into", "../outside"], "the directory to create must be a relative path"],
    ] as const) {
      const result = await cli(project, "vendor", ...args);
      expect(result.code, args.join(" ")).toBe(2);
      expect(result.stdout).toBe("");
      expect(message(result.stderr)).toContain(fragment);
    }
    expect(await readdir(join(project, "vendor"))).toEqual(["algal"]);
    await writeFile(join(project, "main.algal"), CONSUMER);
    const lockPath = join(dir, "main.lock.json");
    const written = await cli(project, "lock", "main.algal", "--out", lockPath);
    expect(written.code, written.stderr).toBe(0);
    const lock = JSON.parse(await readFile(lockPath, "utf8")) as { vendored: JsonObject[] };
    expect(lock.vendored).toMatchObject([{ directory: "vendor/algal", origin: record.origin, catalog: record.catalog, entry: ENTRY }]);
    const verified = await cli(project, "lock", "main.algal", "--verify", lockPath, "--format", "text");
    expect(verified.code, verified.stderr).toBe(0);
    expect(verified.stdout).toContain("The source compiles to the locked closure.\nVendored: 1 pinned directory checked offline.\n");
    // An output may not overwrite the record or a vendored file it reads.
    for (const target of ["vendor/algal/algal.vendor.json", `vendor/algal/${CLAMP}`]) {
      const aliased = await cli(project, "lock", "main.algal", "--out", join(project, target));
      expect(aliased.code).toBe(2);
      expect(message(aliased.stderr)).toContain("aliases an input");
    }
    // An edited copy is drift, exit 1, listed after every other kind.
    const clampPath = join(project, "vendor/algal", CLAMP);
    const clamp = await readFile(clampPath, "utf8");
    await writeFile(clampPath, clamp.replace("else { value }", "else { value + 1 }"));
    const drifted = await cli(project, "lock", "main.algal", "--verify", lockPath, "--format", "text");
    expect(drifted.code).toBe(1);
    expect(drifted.stderr).toBe("");
    expect(drifted.stdout).toContain(`  vendor vendor/algal/${CLAMP}:executable: expected ${String(record.files[0]!.manifestDigest)}, actual sha256:`);
    expect(drifted.stdout.trimEnd().split("\n").at(-1)).toStartWith(`  vendor vendor/algal/${ENTRY}:executable:`);
    // Writing a new lock refuses a copy that no longer matches its record.
    const refused = await cli(project, "lock", "main.algal");
    expect(refused.code).toBe(2);
    expect(JSON.parse(refused.stderr)).toMatchObject({ error: "DIGEST_MISMATCH" });
    expect(message(refused.stderr)).toContain("vendor/algal differs from its vendor record");
    // A record with an unknown key stops verification with exit 2.
    await writeFile(clampPath, clamp);
    await writeFile(join(project, "vendor/algal/algal.vendor.json"), JSON.stringify({ ...record, note: "edited" }));
    const unknown = await cli(project, "lock", "main.algal", "--verify", lockPath);
    expect(unknown.code).toBe(2);
    expect(JSON.parse(unknown.stderr)).toEqual({ error: "PARSE_FAILED", message: 'vendor/algal/algal.vendor.json has unknown key "note"' });
  });
}, 120_000);

test("lock and lock --verify never contact the origin a vendored record names", async () => {
  await temporary("algal-vendor-cli-offline-", async dir => {
    await scratchCatalog(dir);
    const server = serveCatalog(dir);
    try {
      const project = join(dir, "project");
      await mkdir(project);
      await vendorCatalogEntry({ catalog: `${server.base}/catalog/docs/library.md`, entry: ENTRY, into: "vendor/algal", root: project, allowLoopbackHttp: true });
      await writeFile(join(project, "main.algal"), CONSUMER);
      const served = [...server.requests];
      expect(served).toHaveLength(3);
      const lockPath = join(dir, "main.lock.json");
      expect((await cli(project, "lock", "main.algal", "--out", lockPath)).code).toBe(0);
      expect((JSON.parse(await readFile(lockPath, "utf8")) as { vendored: JsonObject[] }).vendored[0]!.origin).toBe(`${server.base}/catalog/docs/library.md`);
      expect((await cli(project, "lock", "main.algal", "--verify", lockPath)).code).toBe(0);
      const clampPath = join(project, "vendor/algal", CLAMP);
      await writeFile(clampPath, `// Edited.\n${await readFile(clampPath, "utf8")}`);
      expect((await cli(project, "lock", "main.algal", "--verify", lockPath)).code).toBe(1);
      expect(server.requests).toEqual(served);
    } finally { server.stop(); }
  });
}, 60_000);
