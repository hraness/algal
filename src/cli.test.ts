import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
    name: "algal", version: "0.2.0", contract: "algal.organism.v1",
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

test("suite rejects malformed optional evidence instead of silently dropping it", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-suite-invalid-"));
  try {
    await writeFile(join(dir, "hello.algal.json"), await readFile(join(root, "examples/hello.algal.json")));
    expect((await cli("suite", "--examples", dir, "--dir", join(dir, "store"))).code).toBe(0);
    await writeFile(join(dir, "hello.responses.json"), "{malformed");
    expect((await cli("suite", "--examples", dir, "--dir", join(dir, "store"))).code).not.toBe(0);
  } finally { await rm(dir, {recursive: true, force: true}); }
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


test("process tick and schedule honor executor-bound effect caching", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-cli-process-cache-"));
  try {
    const manifest = join(dir, "workflow.algal.json");
    const responses = join(dir, "responses.json");
    await writeFile(manifest, JSON.stringify({
      contract: "algal.organism.v1", key: "organism:cli-cache", name: "CLI cache",
      cells: [{ id: "answer", kind: "agent", prompt: "Give the fixed answer", output: { kind: "text" } }],
    }));
    await writeFile(responses, JSON.stringify({ answer: "retained answer" }));
    expect((await cli("process", "create", "first", manifest, "--dir", dir)).code).toBe(0);
    const firstRun = await cli("process", "tick", "first", "--responses", responses, "--cache-effects", "--dir", dir);
    expect(firstRun.code).toBe(0);
    const first = JSON.parse(firstRun.stdout);
    const firstReceipt = JSON.parse(await readFile(join(dir, "runs", `${first.process.receipt.slice(7)}.json`), "utf8"));
    expect(firstReceipt.effects[0].cached).toBeUndefined();
    expect((await cli("process", "create", "second", manifest, "--dir", dir)).code).toBe(0);
    const scheduled = await cli("process", "schedule", "--max-ticks", "1", "--responses", responses, "--cache-effects", "--dir", dir);
    expect(scheduled.code).toBe(0);
    const result = JSON.parse(scheduled.stdout);
    expect(result.ticks).toBe(1);
    expect(result.processes[0].process.name).toBe("second");
    const secondReceipt = JSON.parse(await readFile(join(dir, "runs", `${result.processes[0].process.receipt.slice(7)}.json`), "utf8"));
    expect(secondReceipt.effects[0].cached).toBe(true);
    expect(secondReceipt.cells.answer.outputs.out).toBe("retained answer");
    expect((await cli("process", "verify", "second", "--dir", dir)).code).toBe(0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("envelope reports the static authority and work bound without running", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-cli-envelope-"));
  try {
    const manifest = join(dir, "program.algal.json");
    await writeFile(manifest, JSON.stringify({
      contract: "algal.organism.v1", key: "organism:cli-envelope", name: "CLI envelope",
      cells: [
        { id: "in", kind: "input", outputs: { v: "text" } },
        { id: "echo", kind: "fn", fn: "echo.v1" },
      ],
      edges: [{ from: { cell: "in", port: "v" }, to: { cell: "echo", port: "value" } }],
    }));
    const json = await cli("envelope", manifest, "--capability", "mailbox-send", "--dir", dir);
    expect(json.code).toBe(0);
    const report = JSON.parse(json.stdout);
    expect(report.contract).toBe("algal.authority-envelope.v1");
    expect(report.basis).toBe("static-structure");
    expect(report.closure.closed).toBe(true);
    expect(report.capabilities).toEqual([
      { class: "mailbox-send", verdict: "cannot", producers: [], consumers: [] },
    ]);
    expect(report.functions).toEqual([
      { ref: "echo.v1", cost: 10, uses: [{ path: [], cell: "echo", via: "cell" }] },
    ]);
    expect(report.work.steps).toEqual({ structural: 2, bound: 2 });
    const text = await cli("envelope", manifest, "--format", "text", "--dir", dir);
    expect(text.code).toBe(0);
    expect(text.stdout).toContain("organism:cli-envelope");
    expect(text.stdout).toContain("Work per root invocation");
    expect((await cli("envelope", manifest, "--format", "bogus", "--dir", dir)).code).not.toBe(0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
