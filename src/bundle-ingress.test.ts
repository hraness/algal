import { expect } from "bun:test";
import { appendFile, lstat, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { packOrganism } from "./bundle";
import { BOUNDS, parseOrganismManifest } from "./contract";
import { applicationTests } from "./fixtures/application-test-scope";
import { runCommand } from "../verify/lib/runner";
import { MemoryStore } from "./store-memory";
import { canonicalize, type JsonValue } from "./values";

const { test, resources } = applicationTests();
const repository = resolve(import.meta.dir, "..");
const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:bundle-ingress", name: "Bundle ingress",
  cells: [{ id: "answer", kind: "agent", prompt: "Owned fixture", output: { kind: "text" } }], edges: [] });
const bundle = await packOrganism(manifest, new MemoryStore());
const body = canonicalize(bundle as unknown as JsonValue);
const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
async function pathExists(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}
async function cli(args: string[]) {
  const result = await runCommand([process.execPath, join(repository, "cli.ts"), ...args], repository,
    { timeoutMs: 5000, maxOutputBytes: 65536 });
  expect(result.cleanupObserved, "CLI and descendants must be collected").toBe(true);
  expect(result.timedOut).toBe(false); expect(result.outputExceeded).toBe(false); expect(result.signal).toBeNull();
  return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

for (const command of ["unpack", "call"]) test(`${command} admits regular bundle bytes and refuses invalid ingress before publication or dispatch`, async () => {
  // Register cleanup only after every supervised command was collected. A
  // timeout/custody failure retains the owned namespace for diagnosis.
  const root = await mkdtemp(join(tmpdir(), "algal-bundle-ingress-"));
  const file = join(root, "bundle.json"), link = join(root, "link.json"), marker = join(root, "called"), adapter = join(root, "executor.ts");
  await writeFile(adapter, `await Bun.stdin.text(); await Bun.write(${JSON.stringify(marker)}, "called"); console.log(JSON.stringify("retained"));`);
  const run = (path: string, name: string) => cli([command, path, "--dir", join(root, name), ...(command === "call" ? ["--executor-cmd", `${quote(process.execPath)} ${quote(adapter)}`] : [])]);
  await writeFile(file, body); await symlink(file, link);
  expect((await run(link, "linked-store")).code).toBe(0);
  expect(await Bun.file(marker).exists()).toBe(command === "call");
  await rm(marker, { force: true });
  // Raw UTF-8 remains authoritative even in an overwritten duplicate member.
  // Replacement decoding would erase this defect before parseBundle sees it.
  const invalidBodies = [
    Buffer.concat([Buffer.from('{"values":"'), Buffer.from([0xff]), Buffer.from('",'), Buffer.from(body.slice(1))]),
    Buffer.concat([Buffer.from('{"values":"'), Buffer.from([0xc2]), Buffer.from('",'), Buffer.from(body.slice(1))]),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(body)]),
    Buffer.from(body.slice(0, -1)),
  ];
  for (const [index, invalid] of invalidBodies.entries()) {
    await writeFile(file, invalid);
    const result = await run(file, `invalid-${index}`);
    expect(result.code).not.toBe(0); expect(result.stderr).toContain("PARSE_FAILED");
    expect(await Bun.file(marker).exists()).toBe(false);
    for (const namespace of ["manifests", "values", "runs", "effects"]) expect(await pathExists(join(root, `invalid-${index}`, namespace))).toBe(false);
  }
  // Whitespace counts at the ingress boundary even though canonical bundle
  // admission removes it. Test both actual public CLI consumers at 64 MiB.
  await writeFile(file, body + " ".repeat(BOUNDS.maxBundleBytes - Buffer.byteLength(body)));
  expect((await run(file, "exact-store")).code).toBe(0);
  expect(await Bun.file(marker).exists()).toBe(command === "call"); await rm(marker, { force: true });
  await appendFile(file, " ");
  const oversized = await run(file, "oversized-store");
  expect(oversized.code).not.toBe(0); expect(oversized.stderr).toContain("BUDGET_EXHAUSTED");
  expect(await Bun.file(marker).exists()).toBe(false);
  if (process.platform !== "win32") {
    const fifo = join(root, "input.fifo"), make = await runCommand(["/usr/bin/mkfifo", fifo], repository,
      { timeoutMs: 5000, maxOutputBytes: 4096 });
    expect(make.cleanupObserved).toBe(true); expect(make.timedOut).toBe(false); expect(make.outputExceeded).toBe(false);
    expect(make.signal).toBeNull(); expect(make.exitCode).toBe(0);
    for (const path of [fifo, "/dev/null"]) {
      const rejected = await run(path, "special-store");
      expect(rejected.code).not.toBe(0); expect(rejected.stderr).toContain("BUDGET_EXHAUSTED");
      expect(await Bun.file(marker).exists()).toBe(false);
    }
    expect((await lstat(fifo)).isFIFO()).toBe(true);
  }
  resources().directory(root);
});
