import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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

test("ALGAL branding reports the v1 wire identity", async () => {
  const result = await cli("--version");
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    name: "algal", version: "0.1.0", contract: "algal.organism.v1",
  });
});

test("bundled examples are discoverable and runnable", async () => {
  const result = await cli("examples");
  expect(JSON.parse(result.stdout).examples).toContain("hello");
  expect(JSON.parse(result.stdout).examples).toContain("triage");
  expect((await cli("example", "hello")).code).toBe(0);
  const run = await cli("run", "examples/hello.algal.json");
  expect(run.code).toBe(0);
  expect(JSON.parse(run.stdout).cells.hello.outputs.text).toBe("Programs that grow.");
});

test("mailbox commands create capabilities and deliver a durable wakeup", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-cli-mailbox-"));
  const value = join(dir, "wake.json");
  try {
    await writeFile(value, JSON.stringify({ wake: true }));
    const created = await cli(
      "mailbox",
      "create",
      "worker",
      "--max-messages",
      "2",
      "--dir",
      dir,
    );
    expect(created.code).toBe(0);
    const mailbox = JSON.parse(created.stdout);
    const key = `sha256:${"a".repeat(64)}`;
    const sent = await cli(
      "mailbox", "send", mailbox.send, value,
      "--idempotency-key", key, "--dir", dir,
    );
    expect(sent.code).toBe(0);
    const resent = await cli(
      "mailbox", "send", mailbox.send, value,
      "--idempotency-key", key, "--dir", dir,
    );
    expect(JSON.parse(resent.stdout)).toEqual(JSON.parse(sent.stdout));
    const received = await cli("mailbox", "receive", mailbox.receive, "--dir", dir);
    expect(received.code).toBe(0);
    expect(JSON.parse(received.stdout)).toEqual({
      id: JSON.parse(sent.stdout).id,
      message: { wake: true },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
