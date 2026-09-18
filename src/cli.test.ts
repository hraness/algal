import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { AlgalError, MorphogenError } from "./errors";

const root = resolve(import.meta.dir, "..");

async function cli(...args: string[]) {
  const child = Bun.spawn([process.execPath, "cli.ts", ...args], {
    cwd: root, stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  return { stdout, stderr, code };
}

test("ALGAL branding retains the v1 wire identity and error alias", async () => {
  const result = await cli("--version");
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    name: "algal", version: "0.1.0", contract: "morphogen.organism.v1",
  });
  expect(AlgalError).toBe(MorphogenError);
});

test("new and legacy example filenames are both discoverable and runnable", async () => {
  const result = await cli("examples");
  expect(JSON.parse(result.stdout).examples).toContain("hello");
  expect(JSON.parse(result.stdout).examples).toContain("triage");
  expect((await cli("example", "hello")).code).toBe(0);
  const run = await cli("run", "examples/hello.algal.json");
  expect(run.code).toBe(0);
  expect(JSON.parse(run.stdout).cells.hello.outputs.text).toBe("Programs that grow.");
});
