import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { cachedExecutor, replayExecutor, type EffectReceipt, type Executor } from "./effects";
import { AlgalError, errorReport } from "./errors";
import { commandJson } from "./io";
import { ProcessJournal, type JournalBinding, type RuntimeJournal } from "./process-journal";
import { runOrganism, type RunOptions } from "./run";
import { MemoryStore } from "./store";
import type { Tool, ToolRegistry } from "./tools";
import { verifyReceipt } from "./verify";
import type { JsonValue } from "./values";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
const config = digestCanonical({ adapter: "test-v1" });
const intent = digestCanonical({ dispatch: 1 });
const name = "journal-test";
async function setup(manifest: OrganismManifest) {
  const dir = await mkdtemp(join(tmpdir(), "algal-journal-runtime-"));
  directories.push(dir);
  const digest = digestCanonical(manifestToJson(manifest));
  const journal = await ProcessJournal.create(dir, name, intent, digest);
  const recover = async () => {
    const recovered = await ProcessJournal.open(dir, name, intent, digest);
    await recovered.beginRecovery();
    return recovered;
  };
  const options: RunOptions = { manifest, store: new MemoryStore(), fns: new Map(), executors: [], processName: name, journal };
  return { dir, journal, recover, options };
}
function observed(journal: ProcessJournal, events: string[], overrides: Partial<RuntimeJournal> = {}): RuntimeJournal {
  return {
    before: async (binding) => { events.push(`before:${binding.executor}`); return journal.before(binding); },
    after: async (token, receipt) => { events.push(`after:${receipt.executor}`); await journal.after(token, receipt); },
    assertHealthy: () => journal.assertHealthy(), poison: (error) => journal.poison(error), ...overrides,
  };
}
function toolManifest(kind: "read" | "write" = "write", timeout?: number): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:journal-tools", name: "Journal tools",
    cells: [{ id: "effect", kind: "tool", tool: `${kind}.v1`, ...(timeout === undefined ? {} : { budget: { maxEffectMs: timeout } }) }],
  });
}
function toolsFor(kind: "read" | "write", invoke: Tool): ToolRegistry {
  return new Map([[`${kind}.v1`, {
    signature: { inputs: {}, outputs: { value: { type: "text" } }, effect: kind, cost: 1, maxOutputBytes: 1000 },
    configurationDigest: config, tool: invoke,
  }]]);
}

describe("runtime durable journal boundaries", () => {
  test("repeated identical provider requests consume distinct ordinal receipts with exact metadata", async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:journal-retry", name: "Journal retry",
      cells: [{ id: "agent", kind: "agent", prompt: "A string", output: { kind: "text" }, retry: { attempts: 2 } }],
    });
    const { options, journal, recover } = await setup(manifest);
    const events: string[] = [];
    let calls = 0;
    const executor: Executor = {
      id: "admitted-provider", cacheIdentity: config,
      receiptFor: () => ({ executor: "actual-backend", usage: { model: "v1", tokensIn: 2 }, cached: true, configurationDigest: config }),
      execute: async () => { events.push("execute"); return ++calls === 1 ? 42 : "done"; },
    };
    const first = await runOrganism({ ...options, journal: observed(journal, events), executors: [executor] });
    journal.assertComplete();
    expect(first.outcome).toBe("complete");
    expect(first.effects).toHaveLength(2);
    expect(first.effects[0]?.requestDigest).toBe(first.effects[1]?.requestDigest);
    expect(events).toEqual(["before:admitted-provider", "execute", "after:actual-backend", "before:admitted-provider", "execute", "after:actual-backend"]);
    const restored = await recover();
    const rerun = await runOrganism({ ...options, journal: restored, executors: [executor] });
    restored.assertComplete();
    expect(calls).toBe(2);
    expect(rerun).toEqual(first);
    expect((await verifyReceipt(first as unknown as JsonValue, manifestToJson(manifest), options.store, options.fns)).ok).toBe(true);
  });

  test("cache fill cannot change stable journal admission identity during recovery", async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:cached-journal", name: "Cached journal",
      cells: [{ id: "agent", kind: "agent", prompt: "Answer", output: { kind: "text" } }],
    });
    const { options, journal, recover } = await setup(manifest);
    let calls = 0;
    const inner: Executor = {
      id: "provider", cacheIdentity: digestCanonical({ cache: "distinct identity" }),
      receiptFor: () => ({ configurationDigest: config, usage: { tokensIn: 3 } }),
      execute: async () => { calls++; return "done"; },
    };
    const cached = cachedExecutor(inner, options.store);
    const first = await runOrganism({ ...options, executors: [cached] });
    journal.assertComplete();
    expect(first.effects[0]?.configurationDigest).toBe(config);
    expect(first.effects[0]?.cached).toBeUndefined();
    const restored = await recover();
    const recovered = await runOrganism({ ...options, journal: restored, executors: [cached] });
    restored.assertComplete();
    expect(recovered).toEqual(first);
    expect(calls).toBe(1);
    const fresh = await setup(manifest);
    const hit = await runOrganism({ ...options, journal: fresh.journal, executors: [cached] });
    fresh.journal.assertComplete();
    expect(hit.effects[0]?.cached).toBe(true);
    expect(hit.effects[0]?.configurationDigest).toBeUndefined();
    expect((await verifyReceipt(hit as unknown as JsonValue, manifestToJson(manifest), options.store, options.fns)).ok).toBe(true);
    expect(calls).toBe(1);
  });

  test("a completed write replays without invoking its adapter and uses one process-scoped key", async () => {
    const manifest = toolManifest();
    const { options, journal, recover } = await setup(manifest);
    const events: string[] = [];
    let calls = 0;
    let key: Digest | undefined;
    const tools = toolsFor("write", async (_inputs, context) => {
      calls++; events.push("write"); key = context.idempotencyKey;
      expect(context.idempotencyKey).toBe(digestCanonical({ contract: "algal.process-effect.v1", process: name, requestDigest: context.requestDigest }));
      return { value: "saved" };
    });
    const first = await runOrganism({ ...options, tools, journal: observed(journal, events) });
    journal.assertComplete();
    expect(events).toEqual(["before:tool:write.v1", "write", "after:tool:write.v1"]);
    const restored = await recover();
    expect(await runOrganism({ ...options, tools, journal: restored })).toEqual(first);
    restored.assertComplete();
    expect(calls).toBe(1);
    expect(key).toBeDefined();
    expect((await verifyReceipt(first as unknown as JsonValue, manifestToJson(manifest), options.store, options.fns, undefined, tools)).ok).toBe(true);
  });

  test("raw tool output is journaled before its byte bound rejects it, including offline replay", async () => {
    const manifest = toolManifest();
    const { options, journal, recover } = await setup(manifest);
    let calls = 0;
    const tools = toolsFor("write", async () => { calls++; return { value: "too large" }; });
    tools.get("write.v1")!.signature.maxOutputBytes = 1;
    const result = await runOrganism({ ...options, tools });
    journal.assertComplete();
    expect(result.outcome).toBe("failed");
    expect(result.effects[0]?.output).toEqual({ value: "too large" });
    const restored = await recover();
    expect(await runOrganism({ ...options, tools, journal: restored })).toEqual(result);
    restored.assertComplete();
    expect(calls).toBe(1);
    expect((await verifyReceipt(result as unknown as JsonValue, manifestToJson(manifest), options.store, options.fns, undefined, tools)).ok).toBe(true);
  });

  test("a suspended receipt replays its error, wake authority, and retry policy exactly", async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:journal-suspend", name: "Journal suspension",
      cells: [{ id: "agent", kind: "agent", prompt: "Wait", output: { kind: "text" } }],
    });
    const { options, journal, recover } = await setup(manifest);
    let calls = 0;
    const wake = `cap:mailbox-receive:sha256:${"a".repeat(64)}`;
    const executor: Executor = {
      id: "provider", cacheIdentity: config,
      receiptFor: () => ({ configurationDigest: config }),
      execute: async () => { calls++; throw new AlgalError("EFFECT_SUSPENDED", "waiting", { wake: [wake] }); },
    };
    const first = await runOrganism({ ...options, executors: [executor] });
    journal.assertComplete();
    expect(first.outcome).toBe("suspended");
    expect(first.effects[0]).toMatchObject({ wake: [wake], retryable: false, error: { code: "EFFECT_SUSPENDED" } });
    const restored = await recover();
    expect(await runOrganism({ ...options, executors: [executor], journal: restored })).toEqual(first);
    restored.assertComplete();
    expect(calls).toBe(1);
  });

  for (const kind of ["provider", "tool"] as const) {
    test(`${kind} terminal receipt snapshots adapter-owned outputs before awaited persistence`, async () => {
      const manifest = kind === "tool" ? toolManifest() : parseOrganismManifest({
        contract: "algal.organism.v1", key: "organism:journal-snapshot", name: "Journal snapshot",
        cells: [{ id: "agent", kind: "agent", prompt: "Snapshot", output: { kind: "json", schema: { type: "object" } } }],
      });
      const { options, journal, recover } = await setup(manifest);
      const output = { value: "original" };
      const tools = toolsFor("write", async () => output);
      const executors: Executor[] = [{ id: "provider", cacheIdentity: config, execute: async () => output }];
      const wrapped = observed(journal, [], { after: async (token, receipt) => {
        output.value = "mutated during persistence";
        await journal.after(token, receipt);
      } });
      const result = await runOrganism({ ...options, tools, executors, journal: wrapped });
      journal.assertComplete();
      expect(result.effects[0]?.output).toEqual({ value: "original" });
      expect(result.outcome).toBe("complete");
      const restored = await recover();
      expect(await runOrganism({ ...options, tools, executors, journal: restored })).toEqual(result);
      restored.assertComplete();
    });
  }

  test("a journal completion failure poisons execution before guest fail handlers and leaves a pending write unrecoverable", async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:journal-poison", name: "Journal poison",
      cells: [{ id: "effect", kind: "tool", tool: "write.v1" }, { id: "fallback", kind: "tool", tool: "fallback.v1" }],
      edges: [{ from: { cell: "effect", port: "value" }, to: { cell: "fallback", port: "error" }, on: "fail" }],
    });
    const { options, journal, recover } = await setup(manifest);
    let writes = 0;
    let fallbacks = 0;
    const tools = toolsFor("write", async () => { writes++; return { value: "saved" }; });
    tools.set("fallback.v1", {
      signature: { inputs: { error: { type: "json" } }, outputs: { value: { type: "text" } }, effect: "write", cost: 1, maxOutputBytes: 1000 },
      configurationDigest: config, tool: async () => { fallbacks++; return { value: "unsafe fallback" }; },
    });
    const failing = observed(journal, [], { after: async () => { throw new AlgalError("IO_FAILED", "journal disk failed"); } });
    await expect(runOrganism({ ...options, tools, journal: failing })).rejects.toThrow("journal disk failed");
    expect(writes).toBe(1);
    expect(fallbacks).toBe(0);
    expect(() => journal.assertComplete()).toThrow("journal disk failed");
    await expect(recover()).rejects.toThrow("unknown completion");
  });

  test("changed adapter configuration or missing identity stops before live invocation", async () => {
    const manifest = toolManifest("read");
    const { options, journal, recover } = await setup(manifest);
    let calls = 0;
    const tools = toolsFor("read", async () => { calls++; return { value: "known" }; });
    await runOrganism({ ...options, tools }); journal.assertComplete();
    tools.get("read.v1")!.configurationDigest = digestCanonical({ adapter: "changed" });
    const restored = await recover();
    await expect(runOrganism({ ...options, tools, journal: restored })).rejects.toThrow("configuration/order changed");
    expect(calls).toBe(1);
    const missing = await setup(manifest);
    delete tools.get("read.v1")!.configurationDigest;
    await expect(runOrganism({ ...missing.options, tools })).rejects.toThrow("journal tool configuration");
    expect(() => missing.journal.assertComplete()).toThrow("journal tool configuration");
    expect(calls).toBe(1);
  });

  test("a pending read can be repeated only under explicit recovery", async () => {
    const manifest = toolManifest("read");
    const { options, journal, recover } = await setup(manifest);
    let calls = 0;
    const tools = toolsFor("read", async () => { calls++; return { value: "result" }; });
    await expect(runOrganism({ ...options, tools, journal: observed(journal, [], {
      after: async () => { throw new AlgalError("IO_FAILED", "lost read result"); },
    }) })).rejects.toThrow("lost read result");
    const restored = await recover();
    const result = await runOrganism({ ...options, tools, journal: restored });
    restored.assertComplete();
    expect(result.outcome).toBe("complete");
    expect(calls).toBe(2);
  });

  test("old checkpoint replay skips the new dispatch journal and only the live suffix enters it", async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:journal-prefix", name: "Journal prefix",
      cells: [{ id: "a", kind: "agent", prompt: "first", output: { kind: "text" } }, { id: "b", kind: "agent", prompt: "second", output: { kind: "text" } }],
    });
    const { options, journal } = await setup(manifest);
    const { journal: _journal, ...plainOptions } = options;
    const plain = await runOrganism({ ...plainOptions, executors: [{ id: "provider", execute: async () => "done" }] });
    const bindings: JournalBinding[] = [];
    let live = 0;
    const wrapped = observed(journal, [], { before: async (binding) => { bindings.push(binding); return journal.before(binding); } });
    const result = await runOrganism({
      ...options, journal: wrapped,
      executors: [replayExecutor([plain.effects[0]!]), { id: "provider", cacheIdentity: config, execute: async () => { live++; return "done"; } }],
    });
    journal.assertComplete();
    expect(result).toEqual(plain);
    expect(live).toBe(1);
    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.requestDigest).toBe(plain.effects[1]?.requestDigest);
    expect(bindings[0]?.recovery).toBe("never");
  });

  test("agent tool loops journal the provider, external write, and next provider in execution order", async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:journal-agent-tool", name: "Journal tool loop",
      cells: [{ id: "agent", kind: "agent", prompt: "write then answer", tools: ["write.v1"], output: { kind: "text" }, budget: { maxTurns: 2 } }],
    });
    const { options, journal, recover } = await setup(manifest);
    const events: string[] = [];
    let providers = 0;
    let writes = 0;
    const tools = toolsFor("write", async () => { writes++; return { value: "saved" }; });
    const executor: Executor = { id: "provider", cacheIdentity: config, execute: async () => ++providers === 1 ? { tool: "write.v1", inputs: {} } : "done" };
    const first = await runOrganism({ ...options, tools, executors: [executor], journal: observed(journal, events) });
    journal.assertComplete();
    expect(events).toEqual(["before:provider", "after:provider", "before:tool:write.v1", "after:tool:write.v1", "before:provider", "after:provider"]);
    const restored = await recover();
    expect(await runOrganism({ ...options, tools, executors: [executor], journal: restored })).toEqual(first);
    restored.assertComplete();
    expect([providers, writes]).toEqual([2, 1]);
  });

  for (const phase of ["metadata", "configuration"] as const) {
    test(`a hung ${phase} hook is bounded and poisoned before journal or adapter dispatch`, async () => {
      const manifest = parseOrganismManifest({
        contract: "algal.organism.v1", key: "organism:journal-admission-timeout", name: "Admission timeout",
        cells: [{ id: "agent", kind: "agent", prompt: "Wait", output: { kind: "text" }, budget: { maxEffectMs: 10 } }],
      });
      const { options, journal } = await setup(manifest);
      let release!: () => void;
      const delayed = new Promise<void>((done) => { release = done; });
      let calls = 0;
      let starts = 0;
      const executor: Executor = {
        id: "provider", cacheIdentity: config,
        receiptFor: async () => { if (phase === "metadata") await delayed; return { configurationDigest: config }; },
        journalConfigurationFor: async () => { if (phase === "configuration") await delayed; return config; },
        execute: async () => { calls++; return "never"; },
      };
      const wrapped = observed(journal, [], { before: async (binding) => { starts++; return journal.before(binding); } });
      await expect(runOrganism({ ...options, journal: wrapped, executors: [executor] })).rejects.toThrow("exceeded maxEffectMs");
      expect(() => journal.assertComplete()).toThrow("exceeded maxEffectMs");
      release();
      await new Promise((done) => setTimeout(done, 1));
      expect([starts, calls]).toEqual([0, 0]);
    });
  }

  test("journal admission consumes the same deadline and cannot launch an already expired provider", async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:journal-expired-admission", name: "Expired admission",
      cells: [{ id: "agent", kind: "agent", prompt: "Wait", output: { kind: "text" }, budget: { maxEffectMs: 20 } }],
    });
    const { options, journal } = await setup(manifest);
    let calls = 0;
    const wrapped = observed(journal, [], { before: async (binding) => {
      const ticket = await journal.before(binding);
      await new Promise((done) => setTimeout(done, 30));
      return ticket;
    } });
    const result = await runOrganism({ ...options, journal: wrapped, executors: [{
      id: "provider", cacheIdentity: config, execute: async () => { calls++; return "never"; },
    }] });
    journal.assertComplete();
    expect(result.outcome).toBe("failed");
    expect(result.effects[0]?.error?.code).toBe("BUDGET_EXHAUSTED");
    expect(calls).toBe(0);
  });

  test("an unresolved provider deadline leaves its journal uncertain despite a late result", async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:journal-timeout", name: "Journal timeout",
      cells: [{ id: "agent", kind: "agent", prompt: "wait", output: { kind: "text" }, budget: { maxEffectMs: 50 } }],
    });
    const { options, journal, recover } = await setup(manifest);
    let release!: () => void;
    const late = new Promise<void>((done) => { release = done; });
    let entered = false;
    const persisted: EffectReceipt[] = [];
    const executor: Executor = {
      id: "provider", cacheIdentity: config,
      receiptFor: () => ({ configurationDigest: config, usage: { tokensIn: 1 } }),
      execute: async () => "unused",
      executeEffect: async () => { entered = true; await late; return { output: "late", metadata: { executor: "late-provider", usage: { tokensIn: 999 } } }; },
    };
    const wrapped = observed(journal, [], { after: async (token, receipt) => { persisted.push(structuredClone(receipt)); await journal.after(token, receipt); } });
    await expect(runOrganism({ ...options, executors: [executor], journal: wrapped })).rejects.toThrow("exceeded maxEffectMs");
    expect(entered).toBe(true);
    expect(() => journal.assertComplete()).toThrow("exceeded maxEffectMs");
    release();
    await new Promise((done) => setTimeout(done, 1));
    expect(persisted).toEqual([]);
    await expect(recover()).rejects.toThrow("unknown completion");
  });

  test("a provider abort handler cannot settle a deadline as an ordinary adapter error", async () => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:journal-abort", name: "Journal abort",
      cells: [{ id: "agent", kind: "agent", prompt: "wait", output: { kind: "text" }, budget: { maxEffectMs: 50 } }],
    });
    const { options, journal, recover } = await setup(manifest);
    const executor: Executor = {id: "provider", cacheIdentity: config, execute: async (_request, signal) => new Promise((_, reject) => {
      signal!.addEventListener("abort", () => reject(new AlgalError("BUDGET_EXHAUSTED", "adapter noticed abort")), {once: true});
    })};
    await expect(runOrganism({...options, executors: [executor]})).rejects.toThrow("exceeded maxEffectMs");
    expect(() => journal.assertComplete()).toThrow("exceeded maxEffectMs");
    await expect(recover()).rejects.toThrow("unknown completion");
  });

  test("an adapter-returned budget error remains a settled and replayable result", async () => {
    const { options, journal, recover } = await setup(toolManifest("write", 50));
    let calls = 0;
    const tools = toolsFor("write", async () => { calls++; throw new AlgalError("BUDGET_EXHAUSTED", "adapter quota exhausted before write"); });
    const result = await runOrganism({...options, tools});
    journal.assertComplete();
    expect(result.effects[0]?.error).toEqual({code: "BUDGET_EXHAUSTED", message: "adapter quota exhausted before write"});
    const restored = await recover();
    expect(await runOrganism({...options, journal: restored, tools})).toEqual(result);
    restored.assertComplete();
    expect(calls).toBe(1);
  });

  test("a command adapter's own timeout remains an unsettled journaled write", async () => {
    const { options, journal, recover } = await setup(toolManifest("write"));
    const tools = toolsFor("write", async () => {
      await commandJson([process.execPath, "-e", "await Bun.stdin.text(); await Bun.sleep(10000);"], null, {timeoutMs: 20});
      return {value: "never"};
    });
    await expect(runOrganism({...options, tools})).rejects.toMatchObject({code: "BUDGET_EXHAUSTED", uncertain: true});
    expect(() => journal.assertComplete()).toThrow("command cancelled or timed out");
    await expect(recover()).rejects.toThrow("unknown completion");
  });

  for (const failure of ["overflow", "signal"] as const) {
    test(`a command ${failure} cannot complete or retry a journaled write`, async () => {
      const {options, journal, recover} = await setup(toolManifest());
      let calls = 0;
      const tools = toolsFor("write", async () => {
        calls++;
        if (failure === "signal") await commandJson(["/bin/sh", "-c", "kill -KILL $$"], null);
        else await commandJson([process.execPath, "-e", "await Bun.stdin.text(); console.log('x'.repeat(4096)); await Bun.sleep(10000);"], null, {maxStdoutBytes: 64});
        return {value: "unreachable"};
      });
      await expect(runOrganism({...options, tools})).rejects.toMatchObject({uncertain: true});
      expect(() => journal.assertComplete()).toThrow();
      await expect(recover()).rejects.toThrow("unknown completion");
      expect(calls).toBe(1);
    });
  }

  test("adapter uncertainty prevents nonjournal retries without entering error wire data", async () => {
    const error = new AlgalError("EFFECT_FAILED", "completion unknown", {detail: "host-only"}, {uncertain: true});
    expect(errorReport(error)).toEqual({code: "EFFECT_FAILED", message: "completion unknown"});
    expect(error.details).toEqual({detail: "host-only"});
    const manifest = parseOrganismManifest({contract: "algal.organism.v1", key: "organism:uncertain-retry", name: "Uncertain retry",
      cells: [{id: "agent", kind: "agent", prompt: "Write", output: {kind: "text"}, retry: {attempts: 2}}]});
    let calls = 0;
    const result = await runOrganism({manifest, store: new MemoryStore(), fns: new Map(), executors: [{id: "provider", execute: async () => {calls++; throw error;}}]});
    expect(calls).toBe(1);
    expect(result.effects[0]).toMatchObject({error: {code: "EFFECT_FAILED", message: "completion unknown"}, retryable: false});
    expect(JSON.stringify(result)).not.toContain('"uncertain":');
  });

});
