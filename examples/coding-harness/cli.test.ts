import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BASELINE_POLICY } from "./protocol";

test("JSONL controller executes through its parent and retains offline-verifiable evidence", async () => {
  const artifacts = await mkdtemp(join(tmpdir(), "algal-controller-test-"));
  const child = Bun.spawn([process.execPath, join(import.meta.dir, "cli.ts")], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  try {
    child.stdin.write(`${JSON.stringify({
      mode: "algal", instruction: "Repair the toy artifact", policy: BASELINE_POLICY,
      artifactDir: artifacts, terminalTimeoutMs: 30_000,
      scriptedResponses: [{ type: "terminal", command: "write toy" }, { type: "finish", summary: "stopped" }],
    })}\n`);
    let pending = "";
    const events: Record<string, unknown>[] = [];
    for await (const chunk of child.stdout) {
      pending += Buffer.from(chunk).toString("utf8");
      let end: number;
      while ((end = pending.indexOf("\n")) !== -1) {
        const message = JSON.parse(pending.slice(0, end)) as Record<string, unknown>;
        pending = pending.slice(end + 1);
        events.push(message);
        if (message.type === "terminal") {
          expect(message.request).toEqual({ command: "write toy", maxOutputBytes: 8192, timeoutMs: 30_000 });
          child.stdin.write(`${JSON.stringify({ type: "terminal-result", id: message.id,
            result: { exitCode: 0, stdout: "written", stderr: "" } })}\n`);
        } else child.stdin.end();
      }
    }
    const stderr = await new Response(child.stderr).text();
    expect(await child.exited, stderr).toBe(0);
    expect(events.map(event => event.type)).toEqual(["terminal", "result"]);
    const result = JSON.parse(await readFile(join(artifacts, "result.json"), "utf8")) as Record<string, unknown>;
    expect(result.termination).toBe("finished");
    expect(result.verification).toMatchObject({ ok: true });
    expect(result).not.toHaveProperty("success");
    expect((await readFile(join(artifacts, "receipt.json"), "utf8")).length).toBeGreaterThan(100);
  } finally {
    if (child.exitCode === null) { child.kill("SIGTERM"); child.stdin.end(); await child.exited; }
    await rm(artifacts, { recursive: true, force: true });
  }
});

test("controller rejects mixed fixture/live backend before any inference", async () => {
  const child = Bun.spawn([process.execPath, join(import.meta.dir, "cli.ts")], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  child.stdin.write(`${JSON.stringify({ instruction: "task", mode: "baseline", policy: BASELINE_POLICY,
    artifactDir: "/tmp/unused-algal-controller", scriptedResponses: [], xcb: {} })}\n`);
  child.stdin.end();
  const stderr = await new Response(child.stderr).text();
  expect(await child.exited).toBe(1);
  expect(stderr).toContain("exactly one");
});

test("controller configured local backend retains shared reservation accounting and verifiable actions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-controller-local-"));
  let calls = 0;
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch() {
    calls++;
    return Response.json({ choices: [{ message: { content: JSON.stringify({ value: JSON.stringify({ type: "finish", summary: "local result" }) }) } }],
      usage: { prompt_tokens: 20, completion_tokens: 10 } });
  } });
  const child = Bun.spawn([process.execPath, join(import.meta.dir, "cli.ts")], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  try {
    child.stdin.write(`${JSON.stringify({ instruction: "A bounded local controller task", mode: "algal", policy: BASELINE_POLICY,
      artifactDir: dir, backend: { provider: "local", baseUrl: `http://127.0.0.1:${server.port}/v1`, model: "fixture",
        ledgerPath: join(dir, "ledger"), maxCalls: 1, maxRequestBytes: 32768, maxOutputBytes: 16384 } })}\n`);
    child.stdin.end();
    const stdout = new Response(child.stdout).text();
    const stderr = await new Response(child.stderr).text();
    expect(await child.exited, stderr).toBe(0);
    const result = JSON.parse((await stdout).trim());
    expect(result.result.termination).toBe("finished");
    expect(result.result.verification).toMatchObject({ ok: true });
    expect(result.result.accounting).toMatchObject({ calls: 1, completedCalls: 1, inputTokens: 20, outputTokens: 10 });
    expect(calls).toBe(1);
  } finally {
    if (child.exitCode === null) { child.kill("SIGTERM"); await child.exited; }
    server.stop(true); await rm(dir, { recursive: true, force: true });
  }
});

test("SIGTERM during capability startup joins XCB and removes controller listeners", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-startup-cancel-"));
  const executable = join(dir, "fake-xcb");
  const ready = join(dir, "ready");
  const joined = join(dir, "joined");
  await writeFile(executable, `#!${process.execPath}\nimport { writeFileSync } from 'node:fs';\nprocess.on('SIGTERM', () => { writeFileSync(${JSON.stringify(joined)}, 'settled'); process.exit(0); });\nwriteFileSync(${JSON.stringify(ready)}, 'ready');\nsetInterval(() => {}, 1000);\n`, { mode: 0o700 });
  const child = Bun.spawn([process.execPath, join(import.meta.dir, "cli.ts")], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  try {
    child.stdin.write(`${JSON.stringify({ instruction: "task", mode: "baseline", policy: BASELINE_POLICY,
      artifactDir: dir, xcb: { executable, account: "fixture", model: "fixture", timeoutMs: 10_000 } })}\n`);
    let started = false;
    // Observe real startup before cancellation; cold script launch may take
    // several seconds. Cancellation and joined-child assertions stay exact.
    const startupDeadline = performance.now() + 8000;
    while (performance.now() < startupDeadline) {
      try { await access(ready); started = true; break; } catch { await Bun.sleep(10); }
    }
    expect(started).toBe(true);
    child.kill("SIGTERM");
    child.stdin.end();
    const stderr = await new Response(child.stderr).text();
    expect(await child.exited).toBe(1);
    expect(stderr).toContain("cancelled; child joined");
    expect(await readFile(joined, "utf8")).toBe("settled");
  } finally {
    if (child.exitCode === null) { child.kill("SIGTERM"); child.stdin.end(); await child.exited; }
    await rm(dir, { recursive: true, force: true });
  }
});

test("controller waits for outstanding terminal settlement after cancellation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-terminal-cancel-"));
  const child = Bun.spawn([process.execPath, join(import.meta.dir, "cli.ts")], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  try {
    child.stdin.write(`${JSON.stringify({ instruction: "task", mode: "baseline", policy: BASELINE_POLICY,
      artifactDir: dir, scriptedResponses: [{ type: "terminal", command: "long-running" }] })}\n`);
    let text = "";
    const reader = child.stdout.getReader();
    while (!text.includes('"type":"terminal"')) {
      const chunk = await reader.read();
      if (chunk.done) throw new Error("Controller exited before terminal dispatch");
      text += Buffer.from(chunk.value).toString("utf8");
    }
    const output = (async () => { while (!(await reader.read()).done) { /* drain */ } })();
    child.kill("SIGTERM");
    await Bun.sleep(50);
    expect(child.exitCode).toBe(null);
    child.stdin.write(`${JSON.stringify({ type: "terminal-result", id: 1,
      result: { stdout: "", stderr: "", exitCode: 143 } })}\n`);
    child.stdin.end();
    expect(await child.exited, await new Response(child.stderr).text()).toBe(0);
    await output;
    const result = JSON.parse(await readFile(join(dir, "result.json"), "utf8")) as Record<string, unknown>;
    expect(result.termination).toBe("failed");
  } finally {
    if (child.exitCode === null) { child.kill("SIGTERM"); child.stdin.end(); await child.exited; }
    await rm(dir, { recursive: true, force: true });
  }
});
