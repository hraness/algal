import { describe, expect, it, test } from "bun:test";
import { LOCAL_AGENT_CONTEXT_TOOL, localAgentContextTools, prepareLocalAgentContext } from "./agent-context-runtime";
import { parseOrganismManifest, manifestToJson } from "./contract";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import { runOrganism } from "./run";
import { verifyReceipt } from "./verify";
import type { EffectRequest, Executor } from "./effects";
import type { JsonObject, JsonValue } from "./values";
import { AgentContextHost, putAgentContext } from "./agent-context";
import { AGENT_CONTEXT_QUERY_TOOL, agentContextToolRegistry } from "./agent-context-tools";
import { ProcessSupervisor } from "./process";
import { exportProcessEvidence, verifyProcessEvidence } from "./process-evidence";
import { AlgalError } from "./errors";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compileOrganism } from "./graph";

function executor(answer: (request: EffectRequest) => JsonValue): Executor {
  return { id: "context-fixture", capabilities: { effects: ["agent", "classifier", "decide"] }, execute: async request => answer(request) };
}
function manifest(tools: string[] = [LOCAL_AGENT_CONTEXT_TOOL], maxTurns = 3) {
  return parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:context", name: "Context fixture",
    cells: [{ id: "source", kind: "input", outputs: { visible: "text", hidden: "text" } },
      { id: "agent", kind: "agent", prompt: "Answer from admitted context", inputs: { visible: "text", hidden: "text" }, view: { inputs: ["visible"] }, output: { kind: "text" }, tools, budget: { maxTurns } }],
    edges: ["visible", "hidden"].map(port => ({ from: { cell: "source", port }, to: { cell: "agent", port } })) });
}
const args = { source: { visible: "Shared violet picnic", hidden: "HIDDEN ANOTHER CONTACT" } };
const request = (query: JsonValue) => ({ tool: LOCAL_AGENT_CONTEXT_TOOL, inputs: { query } });

describe("runtime local cell context", () => {
  it("searches only permitted view inputs, records a read effect, and replays exactly", async () => {
    const store = new MemoryStore(), program = manifest();
    let calls = 0;
    const receipt = await runOrganism({ manifest: program, args, store, fns: builtinRegistry(), executors: [executor(value => {
      expect(JSON.stringify(value.context.inputs)).not.toContain("HIDDEN ANOTHER CONTACT");
      calls++;
      if (calls === 1) return request({ op: "search", query: "HIDDEN ANOTHER CONTACT" });
      expect((value.context.toolLog as JsonObject[])[0]!.output).toMatchObject({ result: { matches: [] } });
      return "visible only";
    })] });
    expect(receipt.outcome).toBe("complete"); expect(calls).toBe(2);
    expect(receipt.effects.filter(effect => effect.executor === `tool:${LOCAL_AGENT_CONTEXT_TOOL}`)).toHaveLength(1);
    expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(program), store)).ok).toBe(true);
  });

  it("retrieves exact tool history after elision with the same finite turns", async () => {
    const store = new MemoryStore(), fns = builtinRegistry();
    fns.set("long-source.v1", { signature: { inputs: {}, outputs: { text: { type: "text" } }, cost: 1 }, fn: () => ({ text: "a".repeat(2000) + " hidden-violet" }) });
    fns.set("next-source.v1", { signature: { inputs: {}, outputs: { text: { type: "text" } }, cost: 1 }, fn: () => ({ text: "recent" }) });
    const program = manifest(["long-source.v1", "next-source.v1", LOCAL_AGENT_CONTEXT_TOOL], 4);
    const cell = program.cells[1]!; if (cell.kind !== "agent") throw Error("fixture");
    cell.compact = { mode: "elide", maxLogBytes: 512, keepRecent: 1 };
    let calls = 0;
    const receipt = await runOrganism({ manifest: program, args, store, fns, executors: [executor(value => {
      calls++;
      if (calls === 1) return { tool: "long-source.v1", inputs: {} };
      if (calls === 2) return { tool: "next-source.v1", inputs: {} };
      if (calls === 3) {
        expect(JSON.stringify(value.context)).not.toContain("hidden-violet");
        return request({ op: "read", index: 2 });
      }
      expect(JSON.stringify(value.context)).toContain("hidden-violet");
      return "recovered";
    })] });
    expect(receipt.outcome).toBe("complete"); expect(calls).toBe(4);
    expect(receipt.cells.agent?.outputs?.out).toBe("recovered");
    expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(program), store, fns)).ok).toBe(true);
  });

  it("rejects arbitrary references and extra turns without falling back to another scope", async () => {
    for (const query of [{ op: "read", index: 0, snapshot: "another-tenant" }, { op: "read", index: 0, path: "/secret" }]) {
      const receipt = await runOrganism({ manifest: manifest(), args, store: new MemoryStore(), fns: builtinRegistry(), executors: [executor(() => request(query))] });
      expect(receipt.outcome).toBe("failed");
    }
    const receipt = await runOrganism({ manifest: manifest([LOCAL_AGENT_CONTEXT_TOOL], 1), args, store: new MemoryStore(), fns: builtinRegistry(), executors: [executor(() => request({ op: "inspect" }))] });
    expect(receipt.outcome).toBe("failed"); expect(receipt.failure?.code).toBe("BUDGET_EXHAUSTED"); expect(receipt.work.agentCalls).toBe(1);
  });

  it("keeps standalone tool cells unbound and forbids overriding the reserved query", async () => {
    const tools = localAgentContextTools(undefined);
    await expect(tools.get(LOCAL_AGENT_CONTEXT_TOOL)!.tool({ query: { op: "inspect" } }, { requestDigest: `sha256:${"a".repeat(64)}`, idempotencyKey: `sha256:${"b".repeat(64)}` })).rejects.toThrow("declared agent");
    const override = { ...tools.get(LOCAL_AGENT_CONTEXT_TOOL)!, signature: { ...tools.get(LOCAL_AGENT_CONTEXT_TOOL)!.signature, cost: 0 } };
    expect(() => localAgentContextTools(new Map([[LOCAL_AGENT_CONTEXT_TOOL, override]]))).toThrow("reserved");
  });
});


test("local context cannot replace an explicitly host-bound query reader", async () => {
  const store = new MemoryStore(), host = new AgentContextHost(store);
  const snapshot = await putAgentContext(store, [{ kind: "input", label: "host-source", text: "explicit host-granted bytes" }]);
  const tools = agentContextToolRegistry(host.bind(await host.grant(snapshot))), program = manifest([AGENT_CONTEXT_QUERY_TOOL, LOCAL_AGENT_CONTEXT_TOOL]);
  let calls = 0;
  const receipt = await runOrganism({ manifest: program, args, store, tools, fns: builtinRegistry(), executors: [executor(value => {
    calls++;
    if (calls === 1) return { tool: AGENT_CONTEXT_QUERY_TOOL, inputs: { query: { op: "read", index: 0 } } };
    if (calls === 2) { expect(JSON.stringify(value.context)).toContain("explicit host-granted bytes"); return request({ op: "read", index: 0 }); }
    expect((value.context.toolLog as JsonObject[])[1]!.output).toMatchObject({ result: { text: "Answer from admitted context" } });
    return "separate readers";
  })] });
  expect(receipt.outcome).toBe("complete"); expect(calls).toBe(3);
});

test("source capture exhausts the original work allowance before another model call", async () => {
  const program = manifest(); program.budgets.maxWork = 12;
  let calls = 0;
  const receipt = await runOrganism({ manifest: program, args, store: new MemoryStore(), fns: builtinRegistry(), executors: [executor(() => { calls++; return "unexpected"; })] });
  expect(receipt.outcome).toBe("failed"); expect(receipt.failure?.code).toBe("BUDGET_EXHAUSTED"); expect(calls).toBe(0);
});

test("ancestor capture includes only explicitly selected ports", async () => {
  const program = manifest(), cell = program.cells[1]!;
  if (cell.kind !== "agent") throw Error("fixture");
  cell.view.cells = [{ cell: "source", ports: ["visible"] }];
  let calls = 0;
  const receipt = await runOrganism({ manifest: program, args, store: new MemoryStore(), fns: builtinRegistry(), executors: [executor(value => {
    if (++calls === 1) return request({ op: "read", index: 2 });
    const entry = (value.context.toolLog as JsonObject[])[0]!.output;
    expect(JSON.stringify(entry)).toContain("Shared violet picnic");
    expect(JSON.stringify(entry)).not.toContain("HIDDEN ANOTHER CONTACT");
    return "permitted ancestor";
  })] });
  expect(receipt.outcome).toBe("complete");
});

test("reserved local context cannot execute a substituted implementation", async () => {
  const tools = localAgentContextTools(), original = tools.get(LOCAL_AGENT_CONTEXT_TOOL)!;
  let invoked = false;
  tools.set(LOCAL_AGENT_CONTEXT_TOOL, { ...original, tool: async () => { invoked = true; return { result: "unrelated data" }; } });
  let calls = 0;
  const receipt = await runOrganism({ manifest: manifest(), args, tools, store: new MemoryStore(), fns: builtinRegistry(), executors: [executor(value => {
    if (++calls === 1) return request({ op: "read", index: 0 });
    expect(JSON.stringify(value.context)).not.toContain("unrelated data"); return "actual cell reader";
  })] });
  expect(receipt.outcome).toBe("complete"); expect(invoked).toBe(false);
});

test("model-directed compaction cannot erase the exact local tool archive", async () => {
  const store = new MemoryStore(), fns = builtinRegistry();
  fns.set("source.v1", { signature: { inputs: {}, outputs: { text: { type: "text" } }, cost: 1 }, fn: () => ({ text: "a".repeat(600) + " exact-violet" }) });
  const program = manifest(["source.v1", LOCAL_AGENT_CONTEXT_TOOL], 3), cell = program.cells[1]!;
  if (cell.kind !== "agent") throw Error("fixture");
  cell.compact = { maxLogBytes: 512 };
  let calls = 0, compactions = 0;
  const receipt = await runOrganism({ manifest: program, args, store, fns, executors: [executor(value => {
    if (value.kind === "decide") { compactions++; return { answers: Object.fromEntries(Object.keys(value.questions!).map(key => [key, { noul: 0 }])) }; }
    if (++calls === 1) return { tool: "source.v1", inputs: {} };
    if (calls === 2) { expect(JSON.stringify(value.context)).not.toContain("exact-violet"); return request({ op: "read", index: 2 }); }
    // The new read may itself be compacted; the exact archive remains usable.
    return "done";
  })] });
  expect(receipt.failure).toBeUndefined(); expect(receipt.outcome).toBe("complete"); expect(compactions).toBeGreaterThan(0);
  const read = receipt.effects.find(effect => effect.executor === `tool:${LOCAL_AGENT_CONTEXT_TOOL}`);
  expect(JSON.stringify(read?.output)).toContain("exact-violet");
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(program), store, fns)).ok).toBe(true);
});

test("a durable process reconstructs local context after suspension and supervisor replacement", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-local-context-"));
  try {
    let suspend = true, providerCalls = 0;
    const model: Executor = { id: "durable-context", execute: async value => {
      providerCalls++;
      if (value.context.turn === 0) return request({ op: "read", index: 1 });
      if (suspend) throw new AlgalError("EFFECT_SUSPENDED", "wait for fixture wake");
      expect(JSON.stringify(value.context)).toContain("Shared violet picnic");
      expect(JSON.stringify(value.context)).not.toContain("HIDDEN ANOTHER CONTACT");
      return "resumed";
    } };
    const first = new ProcessSupervisor(directory, { executors: [model] });
    expect(first.evidenceTools().has(LOCAL_AGENT_CONTEXT_TOOL)).toBe(false);
    await first.create("context", manifest(), args);
    expect((await first.tick("context"))?.process.status).toBe("suspended");
    suspend = false;
    const restarted = new ProcessSupervisor(directory, { executors: [model] });
    const complete = await restarted.tick("context");
    expect(complete?.process.status).toBe("complete");
    expect(providerCalls).toBe(3);
    expect((await restarted.verify("context")).ok).toBe(true);
    const evidence = await exportProcessEvidence(complete!, restarted.store, restarted.evidenceTools());
    expect((await verifyProcessEvidence(evidence)).ok).toBe(true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("local context opt-in preserves model cancellation and finite call budgets", async () => {
  const program = manifest(), cell = program.cells[1]!;
  if (cell.kind !== "agent") throw Error("fixture");
  cell.budget = { ...cell.budget, maxEffectMs: 10 };
  let aborted = false;
  const receipt = await runOrganism({ manifest: program, args, store: new MemoryStore(), fns: builtinRegistry(), executors: [{ id: "cancel-context", execute: async (_value, signal) => new Promise<JsonValue>(() => { signal?.addEventListener("abort", () => { aborted = true; }); }) }] });
  expect(aborted).toBe(true); expect(receipt.outcome).toBe("failed"); expect(receipt.work.agentCalls).toBe(1);
});

test("local query refusals use canonical UTF-16 keys while host-bound queries keep their original ordering", async () => {
  const store = new MemoryStore();
  const prepared = await prepareLocalAgentContext({ store, prompt: "fixture", inputs: {}, toolLog: [], remainingWork: 10000 });
  const local = prepared.tools.get(LOCAL_AGENT_CONTEXT_TOOL)!;
  const host = new AgentContextHost(store), snapshot = await putAgentContext(store, [{ kind: "input", label: "source", text: "fixture" }]);
  const legacy = agentContextToolRegistry(host.bind(await host.grant(snapshot))).get(AGENT_CONTEXT_QUERY_TOOL)!;
  const context = { requestDigest: `sha256:${"a".repeat(64)}` as const, idempotencyKey: `sha256:${"b".repeat(64)}` as const };
  for (const [first, second, canonical, original] of [["z", "a", "a", "z"], ["2", "10", "10", "2"], ["\uE000", "\u{10000}", "\u{10000}", "\uE000"]]) {
    const query: JsonObject = { op: "inspect", [first!]: true, [second!]: true };
    await expect(local.tool({ query }, context)).rejects.toThrow(`context inspect has unknown key "${canonical}"`);
    await expect(local.tool({ query: { op: "inspect", [second!]: true, [first!]: true } }, context)).rejects.toThrow(`context inspect has unknown key "${canonical}"`);
    await expect(legacy.tool({ query }, context)).rejects.toThrow(`context inspect has unknown key "${original}"`);
  }
});

test("local malformed-field traversal is canonical and bounded before query parsing", async () => {
  const store = new MemoryStore();
  const prepared = await prepareLocalAgentContext({ store, prompt: "fixture", inputs: {}, toolLog: [], remainingWork: 10000 });
  const local = prepared.tools.get(LOCAL_AGENT_CONTEXT_TOOL)!;
  const context = { requestDigest: `sha256:${"a".repeat(64)}` as const, idempotencyKey: `sha256:${"b".repeat(64)}` as const };
  for (const query of [{ op: "inspect", z: { deep: [] }, a: "x".repeat(4097) }, { a: "x".repeat(4097), z: { deep: [] }, op: "inspect" }]) {
    await expect(local.tool({ query }, context)).rejects.toThrow("agent context query: string exceeds 4096 bytes");
  }
  let invoked = 0;
  const unsafe = Object.defineProperty({ op: "inspect" }, "a", { enumerable: true, get: () => { invoked++; return "secret"; } });
  await expect(local.tool({ query: unsafe }, context)).rejects.toThrow("accessor property");
  expect(invoked).toBe(0);
});

test("local cancellation and outer-input refusal precede query access", async () => {
  const prepared = await prepareLocalAgentContext({ store: new MemoryStore(), prompt: "fixture", inputs: {}, toolLog: [], remainingWork: 10000 });
  const local = prepared.tools.get(LOCAL_AGENT_CONTEXT_TOOL)!;
  const context = { requestDigest: `sha256:${"a".repeat(64)}` as const, idempotencyKey: `sha256:${"b".repeat(64)}` as const };
  let invoked = 0;
  const inputs: JsonObject = Object.defineProperty({ z: true, a: true }, "query", { enumerable: true, get: () => { invoked++; return { op: "inspect" }; } });
  await expect(local.tool(inputs, { ...context, signal: AbortSignal.abort() })).rejects.toThrow("context read cancelled");
  await expect(local.tool(inputs, context)).rejects.toThrow('context tool inputs has unknown key "a"');
  expect(invoked).toBe(0);
});

test("compilation rejects a function shadowing the runtime-owned local context name", async () => {
  const fns = builtinRegistry(), store = new MemoryStore();
  let invoked = 0;
  fns.set(LOCAL_AGENT_CONTEXT_TOOL, { signature: { inputs: { query: { type: "json" } }, outputs: { result: { type: "json" } }, cost: 100 },
    fn: () => { invoked++; return { result: "unrelated scope" }; } });
  await expect(compileOrganism(manifest(), fns, store)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
  await expect(runOrganism({ manifest: manifest(), args, store, fns, executors: [executor(() => { invoked++; return "unexpected provider"; })] })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
  expect(invoked).toBe(0);
});
