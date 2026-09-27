import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { compileOrganism } from "./graph";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store-memory";
import { compileTask, parseTaskDefinition, runTask, TASK_BOUNDS } from "./task";
import { verifyReceipt } from "./verify";
import type { JsonValue } from "./values";

const definition = () => ({
  contract: "algal.task.v1",
  key: "organism:reply-policy",
  name: "Reply policy",
  inputs: { message: "text", history: { type: "json", optional: true } },
  output: { name: "action", contract: { kind: "choice", labels: ["reply", "silence"] } },
  instructions: "Reply when the message asks a question.",
  budgets: { maxSteps: 4, maxAgentCalls: 1, maxWork: 100_000, maxContextBytes: 16_384, maxOutputBytes: 4096, maxDepth: 0 },
});

describe("task authoring", () => {
  test("compiles to an ordinary admitted manifest and replays a saved run", async () => {
    const task = parseTaskDefinition(definition());
    const { manifest, manifestDigest } = compileTask(task);
    const store = new MemoryStore();
    await expect(compileOrganism(manifest, builtinRegistry(), store)).resolves.toBeDefined();
    expect(digestCanonical(manifestToJson(parseOrganismManifest(manifestToJson(manifest))))).toBe(manifestDigest);
    let seen: unknown;
    const result = await runTask({ task, args: { message: "Can you help?" }, store, executors: [{ id: "recorded-policy", async execute(request) { seen = request.context; return "reply"; } }] });
    expect(result.receipt.outcome).toBe("complete");
    expect(result.outputs).toEqual({ action: "reply" });
    expect(JSON.stringify(seen)).toContain("Can you help?");
    const replay = await verifyReceipt(result.receipt as unknown as JsonValue, manifestToJson(manifest), store, builtinRegistry());
    expect(replay.ok).toBe(true);
    expect(await store.getReceipt(result.receiptDigest)).toEqual(result.receipt);
  });

  test("rejects undeclared labels in run inputs before any executor is called", async () => {
    let calls = 0;
    await expect(runTask({ task: parseTaskDefinition(definition()), args: { message: "Hello", action: "reply" }, store: new MemoryStore(), executors: [{ id: "never", async execute() { calls++; return "reply"; } }] })).rejects.toThrow("unknown key");
    expect(calls).toBe(0);
  });

  test("normalizes labeled examples, validates labels and rejects capabilities", () => {
    const example = { id: "train-a", sourceId: "conversation-a", args: { message: "Hello?" }, expect: { action: "reply" } };
    const task = parseTaskDefinition({ ...definition(), examples: [example] });
    const agent = compileTask(task).manifest.cells[1]!;
    expect(agent.kind === "agent" && agent.prompt).toContain('"expect":{"action":"reply"}');
    expect(() => parseTaskDefinition({ ...definition(), examples: [{ ...example, expect: { action: "invalid" } }] })).toThrow("declared label");
    expect(() => parseTaskDefinition({ ...definition(), inputs: { secret: { type: "cap", capability: "mailbox" } } })).toThrow("capabilities");
    expect(() => parseTaskDefinition({ ...definition(), examples: [example, example] })).toThrow("duplicate example");
    expect(() => parseTaskDefinition({ ...definition(), examples: Array(TASK_BOUNDS.maxExamples + 1).fill(example) })).toThrow("at most");
  });

  test("bounds combined prompt data and requires explicit budgets", () => {
    const { budgets: _budgets, ...missing } = definition();
    expect(() => parseTaskDefinition(missing)).toThrow("explicit");
    expect(() => parseTaskDefinition({ ...definition(), budgets: {} })).toThrow("explicitly declare");
    expect(parseTaskDefinition(definition()).effectBudget).toEqual({ maxEffectMs: 60_000, maxContextBytes: 16_384, maxOutputBytes: 4096 });
    expect(() => parseTaskDefinition({ ...definition(), effectBudget: { maxEffectMs: 0 } })).toThrow("maxEffectMs");
    expect(() => parseTaskDefinition({ ...definition(), effectBudget: { maxContextBytes: 16_385 } })).toThrow("exceed the run budgets");
    expect(() => parseTaskDefinition({ ...definition(), instructions: "x".repeat(8190), examples: [{ id: "a", sourceId: "s", args: { message: "hello" }, expect: { action: "reply" } }] })).toThrow();
    expect(() => parseTaskDefinition({ ...definition(), tools: ["send.email"] })).toThrow("unknown key");
  });

  test("never invokes getters at its foreign data boundary", () => {
    let invoked = false;
    const raw = Object.defineProperty(definition(), "instructions", { enumerable: true, get() { invoked = true; return "bad"; } });
    expect(() => parseTaskDefinition(raw)).toThrow("accessor");
    expect(invoked).toBe(false);
  });

  test("a hanging model call times out, signals cancellation once and replays without another call", async () => {
    const task = parseTaskDefinition({ ...definition(), effectBudget: { maxEffectMs: 10 } });
    const store = new MemoryStore();
    let calls = 0;
    let cancellations = 0;
    const result = await runTask({ task, args: { message: "Wait?" }, store, executors: [{
      id: "hanging-executor",
      async execute(_request, signal) {
        calls++;
        signal?.addEventListener("abort", () => cancellations++);
        return new Promise<JsonValue>(() => {});
      },
    }] });
    expect(result.receipt.outcome).toBe("failed");
    expect(result.receipt.effects[0]!.error?.message).toContain("exceeded maxEffectMs 10");
    expect(result.receipt.effects[0]!.retryable).toBe(false);
    expect(calls).toBe(1);
    expect(cancellations).toBe(1);
    expect((await verifyReceipt(result.receipt as unknown as JsonValue, manifestToJson(result.compilation.manifest), store)).ok).toBe(true);
    expect(calls).toBe(1);
  });
});
