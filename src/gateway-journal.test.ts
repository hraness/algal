import { expect } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseOrganismManifest } from "./contract";
import { cachedExecutor, type Executor } from "./effects";
import { applicationTests } from "./fixtures/application-test-scope";
import { vercelGatewayExecutor } from "./gateway";
import { ProcessSupervisor } from "./process";
import { FileStore } from "./store";

const { test, resources } = applicationTests();
const generationId = "gen_01ARZ3NDEKTSV4RRFFQ69G5FAV";
const manifest = (deadline = false) => parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:gateway-journal", name: "Gateway journal",
  cells: [{ id: "answer", kind: "agent", prompt: "Local fixture only", output: { kind: "text" },
    ...(deadline ? { budget: { maxEffectMs: 1000 } } : {}) }], edges: [],
});
const response = () => Response.json({ id: generationId, model: "test/model",
  choices: [{ message: { content: '{"value":"retained"}' } }], usage: { prompt_tokens: 5, completion_tokens: 2 } });
async function directory() { return resources().directory(await mkdtemp(join(tmpdir(), "algal-gateway-journal-"))); }

for (const cache of [false, true]) test(`observer failure preserves durable uncertainty through ${cache ? "cached" : "direct"} execution`, async () => {
  const root = await directory(), store = new FileStore(root);
  let requests = 0, observations = 0;
  const gateway = vercelGatewayExecutor({ model: "test/model", credential: "local-fixture-credential", fetch: async () => { requests++; return response(); },
    observeGeneration: () => { observations++; throw new Error("private sidecar persistence cause"); } });
  const executor = cache ? cachedExecutor(gateway, store) : gateway;
  const vm = new ProcessSupervisor(root, { executors: [executor], journal: true });
  await vm.create("actor", manifest());
  await expect(vm.tick("actor")).rejects.toMatchObject({ code: "EFFECT_FAILED", uncertain: true,
    message: "AI Gateway response observation could not be retained; external completion uncertain" });
  const selected = await vm.inspect("actor"), journal = await vm.journal("actor");
  expect(selected.process.status).toBe("uncertain"); expect(selected.process.receipt).toBeUndefined();
  expect(journal).toMatchObject({ effects: [{ record: { state: "started", recovery: "never" } }] });
  const reopened = new ProcessSupervisor(root, { executors: [executor], journal: true });
  await expect(reopened.tick("actor")).rejects.toThrow("uncertain");
  await expect(reopened.recover("actor", selected.digest)).rejects.toThrow("unknown completion");
  expect((await reopened.inspect("actor")).digest).toBe(selected.digest);
  expect(await reopened.journal("actor")).toEqual(journal);
  expect(requests).toBe(1); expect(observations).toBe(1);
});

test("successful observations and cache hits retain replay without another provider call", async () => {
  const root = await directory(), store = new FileStore(root);
  let requests = 0, observations = 0;
  const executor = cachedExecutor(vercelGatewayExecutor({ model: "test/model", credential: "local-fixture-credential",
    fetch: async () => { requests++; return response(); }, observeGeneration: observation => {
      observations++; expect(observation).toMatchObject({ generationId, providerAttestation: false, tokensIn: 5, tokensOut: 2 });
    } }), store);
  const vm = new ProcessSupervisor(root, { executors: [executor], journal: true });
  for (const actor of ["first", "cached"]) {
    await vm.create(actor, manifest());
    expect((await vm.tick(actor))?.process.status).toBe("complete");
    expect(await vm.journal(actor)).toMatchObject({ effects: [{ record: { state: "completed", receipt: { output: "retained" } } }] });
    expect(await vm.verify(actor)).toMatchObject({ ok: true });
  }
  expect(requests).toBe(1); expect(observations).toBe(1);
});

test("a late observation cannot settle a journal after the effect deadline", async () => {
  const root = await directory(), released = resources().barrier();
  let requests = 0, observations = 0, completed = 0;
  const gateway = vercelGatewayExecutor({ model: "test/model", credential: "local-fixture-credential",
    fetch: async () => { requests++; return response(); }, observeGeneration: async () => { observations++; await released.wait; completed++; } });
  // Own the complete losing adapter promise so cleanup joins it after releasing
  // the diagnostic barrier, even if the test body itself is interrupted.
  let adapter: Promise<unknown> | undefined;
  const executor: Executor = { ...gateway, executeEffect: (request, signal) => {
    const pending = resources().own(gateway.executeEffect!(request, signal)); adapter = pending; return pending;
  } };
  const vm = new ProcessSupervisor(root, { executors: [executor], journal: true });
  await vm.create("late", manifest(true));
  await expect(vm.tick("late")).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED", uncertain: true });
  expect(observations).toBe(1); expect(completed).toBe(0);
  const selected = await vm.inspect("late"), journal = await vm.journal("late");
  expect(selected.process.status).toBe("uncertain");
  expect(journal).toMatchObject({ effects: [{ record: { state: "started", recovery: "never" } }] });
  released.release(); await adapter;
  expect(completed).toBe(1); expect(await vm.journal("late")).toEqual(journal);
  await expect(vm.recover("late", selected.digest)).rejects.toThrow("unknown completion");
  expect((await vm.inspect("late")).digest).toBe(selected.digest); expect(requests).toBe(1);
});
