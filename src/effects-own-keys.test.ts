import { expect, test } from "bun:test";
import { effectRequestDigest, scriptedExecutor, type EffectRequest } from "./effects";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import type { JsonValue } from "./values";
import { verifyReceipt } from "./verify";

const request: EffectRequest = {
  contract: "algal.effect.v1", cellId: "constructor", kind: "agent", prompt: "Respond",
  context: { inputs: {} }, output: { kind: "text" }, budget: { maxContextBytes: 4096, maxOutputBytes: 4096 },
};

test("missing constructor scripted response is unbound, not inherited host code", async () => {
  await expect(scriptedExecutor({}).execute(request)).rejects.toMatchObject({ code: "EFFECT_UNBOUND" });
});

test("declared constructor response queues and digest precedence remain valid", async () => {
  const queue = scriptedExecutor({ constructor: ["first", "second"] });
  expect(await queue.execute(request)).toBe("first");
  expect(await queue.execute(request)).toBe("second");
  await expect(queue.execute(request)).rejects.toMatchObject({ code: "EFFECT_UNBOUND" });
  const digest = effectRequestDigest(request);
  expect(await scriptedExecutor({ constructor: "named", [digest]: "exact" }).execute(request)).toBe("exact");
  const value = JSON.parse('{"__proto__":{"kept":true},"constructor":"data"}') as JsonValue;
  expect(await scriptedExecutor({ constructor: value }).execute(request)).toEqual(value);
});

test("missing scripted constructor cell produces a replayable error receipt", async () => {
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:scripted-own", name: "Scripted own response",
    cells: [{ id: "constructor", kind: "agent", prompt: "Respond", output: { kind: "text" } }] });
  const store = new MemoryStore();
  const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [scriptedExecutor({})] });
  expect(receipt.failure?.code).toBe("EFFECT_UNBOUND");
  expect(receipt.effects[0]!.output).toBeUndefined();
  expect(receipt.effects[0]!.error?.code).toBe("EFFECT_UNBOUND");
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store)).ok).toBe(true);
});
