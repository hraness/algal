import { expect, test } from "bun:test";
import fixture from "../scripts/fixtures/agent-context.json";
import { AgentContextHost, putAgentContext, type AgentContextEntryInput } from "./agent-context";
import { MemoryStore } from "./store-memory";

test("context sources, scopes and results match the native shared fixture", async () => {
  const store = new MemoryStore();
  const snapshot = await putAgentContext(store, fixture.entries as AgentContextEntryInput[]);
  const host = new AgentContextHost(store);
  const ref = await host.grant(snapshot, fixture.indices, fixture.limits);
  const child = await host.delegate(ref, [2], { maxReadBytes: 8 });
  expect(fixture.expected).toEqual({ snapshot, ref, child, inspect: await host.inspect(ref), read: await host.read(ref, 0),
    slice: await host.slice(child, 2, 0, 6), search: await host.search(child, { query: "needle" }) });
});
