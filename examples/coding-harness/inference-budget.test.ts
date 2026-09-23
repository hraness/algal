import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rename, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EffectRequest, Executor } from "../../src/effects";
import { createBudgetedExecutor } from "./inference-budget";

const request: EffectRequest = { contract: "algal.effect.v1", cellId: "test", kind: "agent", prompt: "Return a word",
  context: {}, output: { kind: "json", schema: { type: "string" } }, budget: { maxContextBytes: 1024, maxOutputBytes: 1024 } };
const options = (ledgerPath: string, executor: Executor) => ({ ledgerPath, executor,
  budget: { maxCalls: 3, maxCostMicrousd: 10, reserveMicrousdPerCall: 5 }, maxRequestBytes: 4096, maxOutputBytes: 1024 });
const fixture: Executor = { id: "fixture", execute: async () => "word",
  executeEffect: async () => ({ output: "word", metadata: { usage: { tokensIn: 12, tokensOut: 2 } } }) };

test("durable reservations precede dispatch, never refund, and share a cross-instance spend ceiling", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-budget-"));
  try {
    let calls = 0;
    const executor: Executor = { ...fixture, executeEffect: async () => {
      calls++;
      const ledger = JSON.parse(await readFile(join(dir, "accounting.json"), "utf8"));
      expect(ledger.records.at(-1).status).toBe("reserved");
      expect(ledger.reservedMicrousd).toBe(calls * 5);
      return { output: "word", metadata: { usage: { tokensIn: 12, tokensOut: 2 } } };
    } };
    const first = await createBudgetedExecutor(options(dir, executor));
    const second = await createBudgetedExecutor(options(dir, executor));
    await Promise.all([first.executor.execute(request), second.executor.execute(request)]);
    const reopened = await createBudgetedExecutor(options(dir, executor));
    expect(reopened.accounting).toMatchObject({ calls: 2, completedCalls: 2, reservedMicrousd: 10, inputTokens: 24, outputTokens: 4, costUsd: null, stopped: false });
    await expect(reopened.executor.execute(request)).rejects.toThrow("budget exhausted");
    expect(calls).toBe(2);
    expect(reopened.executor.retryable).toBe(false);
    expect(reopened.executor.cacheable).toBe(false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("unknown completion retains reservation and permanently blocks reuse, including changed config", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-budget-unknown-"));
  try {
    let calls = 0;
    const executor: Executor = { ...fixture, executeEffect: async () => { calls++; throw new Error("credential-sensitive detail"); } };
    const first = await createBudgetedExecutor(options(dir, executor));
    await expect(first.executor.execute(request)).rejects.toThrow("ledger stopped; no retry");
    expect(first.accounting).toMatchObject({ calls: 1, completedCalls: 0, reservedMicrousd: 5, inputTokens: null, stopped: true });
    const reopened = await createBudgetedExecutor(options(dir, executor));
    await expect(reopened.executor.execute(request)).rejects.toThrow("unsettled or failed");
    expect(calls).toBe(1);
    expect(await readFile(join(dir, "accounting.json"), "utf8")).not.toContain("credential-sensitive");
    await expect(createBudgetedExecutor({ ...options(dir, executor), budget: { maxCalls: 4, maxCostMicrousd: 20, reserveMicrousdPerCall: 5 } })).rejects.toThrow("conflicts");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("known usage is retained when token ceiling is violated and stops subsequent spending", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-budget-usage-"));
  try {
    const backend = await createBudgetedExecutor({ ...options(dir, fixture), tokenLimits: { maxInputTokens: 10, maxOutputTokens: 2, requireUsage: true } });
    await expect(backend.executor.execute(request)).rejects.toMatchObject({ code: "EFFECT_FAILED", uncertain: true });
    expect(backend.accounting).toMatchObject({ inputTokens: 12, outputTokens: 2, stopped: true, reservedMicrousd: 5 });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("pre-dispatch cancellation and bounds do not spend; missing accounting cannot reset a frozen ledger", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-budget-admission-"));
  try {
    const backend = await createBudgetedExecutor(options(dir, fixture));
    await expect(backend.executor.execute(request, AbortSignal.abort())).rejects.toThrow("before reservation");
    await expect(backend.executor.execute({ ...request, prompt: "x".repeat(4096) })).rejects.toThrow("bounds");
    expect(backend.accounting.calls).toBe(0);
    await unlink(join(dir, "accounting.json"));
    await expect(createBudgetedExecutor(options(dir, fixture))).rejects.toThrow("lost its accounting");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("a killed owner leaves its fsynced pending reservation charged and cannot re-dispatch", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-budget-killed-"));
  let child: ReturnType<typeof Bun.spawn> | undefined;
  try {
    const script = `import {createBudgetedExecutor} from ${JSON.stringify(join(import.meta.dir, "inference-budget.ts"))};
      const executor={id:'fixture',execute:async()=>{console.log('DISPATCHED');await new Promise(()=>{});return 'word'}};
      const backend=await createBudgetedExecutor(${JSON.stringify({ ...options(dir, fixture), executor: undefined }).replace(/}$/, ",executor}")});
      await backend.executor.execute(${JSON.stringify(request)});`;
    child = Bun.spawn([process.execPath, "--eval", script], { stdout: "pipe", stderr: "pipe" });
    const stream = child.stdout as ReadableStream<Uint8Array>;
    const reader = stream.getReader();
    const chunk = await reader.read();
    expect(new TextDecoder().decode(chunk.value)).toContain("DISPATCHED");
    child.kill("SIGKILL");
    await child.exited;
    reader.releaseLock();
    const reopened = await createBudgetedExecutor(options(dir, fixture));
    expect(reopened.accounting).toMatchObject({ calls: 1, reservedMicrousd: 5, stopped: true });
    expect(reopened.accounting.records[0]?.status).toBe("reserved");
    await expect(reopened.executor.execute(request)).rejects.toThrow("unsettled or failed");
  } finally {
    if (child && child.exitCode === null) { child.kill("SIGKILL"); await child.exited; }
    await rm(dir, { recursive: true, force: true });
  }
});

test("deadline stops admission even when the executor ignores cancellation; settle retains custody", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-budget-timeout-"));
  let release!: () => void;
  const work = new Promise<void>(resolve => { release = resolve; });
  try {
    const backend = await createBudgetedExecutor({ ...options(dir, { id: "slow", execute: async () => { await work; return "late"; } }), timeoutMs: 20 });
    await expect(backend.executor.execute(request)).rejects.toThrow("no retry");
    expect(backend.accounting).toMatchObject({ calls: 1, stopped: true, reservedMicrousd: 5 });
    let joined = false;
    const settling = backend.settle().then(() => { joined = true; });
    await Bun.sleep(5);
    expect(joined).toBe(false);
    release();
    await settling;
    expect(backend.accounting.completedCalls).toBe(0);
    await expect(backend.executor.execute(request)).rejects.toThrow("unsettled or failed");
  } finally { release(); await rm(dir, { recursive: true, force: true }); }
});

test("per-request output bound and valid budgets are enforced; receipt identity binds ledger configuration", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-budget-request-"));
  try {
    const backend = await createBudgetedExecutor(options(dir, fixture));
    await expect(backend.executor.execute({ ...request, budget: { ...request.budget, maxOutputBytes: -1 } })).rejects.toThrow("request output bound");
    expect(backend.accounting.calls).toBe(0);
    const metadata = await backend.executor.receiptFor?.(request);
    expect(metadata?.configurationDigest).toBe(backend.accounting.configurationDigest);
    await expect(backend.executor.execute({ ...request, budget: { ...request.budget, maxOutputBytes: 2 } })).rejects.toThrow("no retry");
    expect(backend.accounting.records[0]?.status).toBe("unknown");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("a post-dispatch settlement write failure preserves uncertainty and the retained reservation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-budget-write-failure-"));
  const ledger = join(dir, "accounting.json"), retained = join(dir, "retained-reservation.json");
  try {
    const backend = await createBudgetedExecutor(options(dir, { id: "fixture", execute: async () => {
      // Inject a real filesystem publication failure after dispatch; preserve
      // the already-fsynced reservation exactly for the recovery assertion.
      await rename(ledger, retained); await mkdir(ledger);
      return "word";
    } }));
    await expect(backend.executor.execute(request)).rejects.toMatchObject({ code: "EFFECT_FAILED", uncertain: true });
    expect(backend.accounting.stopped).toBe(true);
    expect(JSON.parse(await readFile(retained, "utf8")).records[0].status).toBe("reserved");
    await rm(ledger, { recursive: true }); await rename(retained, ledger);
    const reopened = await createBudgetedExecutor(options(dir, fixture));
    await expect(reopened.executor.execute(request)).rejects.toThrow("unsettled or failed");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("lease cleanup failure cannot erase uncertainty or admit another call", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-budget-release-failure-"));
  try {
    const backend = await createBudgetedExecutor(options(dir, { id: "fixture", execute: async () => {
      await unlink(join(dir, "custody", ".lock")); // owned fault injection after dispatch
      return "word";
    } }));
    await expect(backend.executor.execute(request)).rejects.toMatchObject({ code: "EFFECT_FAILED", uncertain: true });
    const reopened = await createBudgetedExecutor(options(dir, fixture));
    expect(reopened.accounting.stopped).toBe(true);
    expect(reopened.accounting.reservedMicrousd).toBe(5);
    await expect(reopened.executor.execute(request)).rejects.toThrow("unsettled or failed");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
