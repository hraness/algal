import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { effectRequestDigest, type EffectRequest } from "./effects";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { canonicalBytes, type JsonValue } from "./values";
import { verifyReceipt } from "./verify";

type Mode = "default" | "narrow" | "equal" | "widen" | "positive" | "exact" | "one-below";
const modes: Mode[] = ["default", "narrow", "equal", "widen", "positive", "exact", "one-below"];

describe("root byte budgets govern every agent and recall occurrence", () => {
  for (const nested of [false, true]) {
    for (const kind of ["agent", "recall"] as const) {
      for (const field of ["maxContextBytes", "maxOutputBytes"] as const) {
        for (const mode of modes) {
          test(`${nested ? "nested" : "flat"} ${kind} ${field} ${mode}`, async () => {
            const contextBytes = kind === "agent" ? 22 : 13;
            const output: JsonValue = kind === "agent" ? "ok" : { hits: [] };
            const outputBytes = kind === "agent" ? 4 : 11;
            const actualBytes = field === "maxContextBytes" ? contextBytes : outputBytes;
            const rootLimit = mode === "narrow" || mode === "positive" ? 65_536
              : mode === "exact" ? actualBytes : mode === "one-below" ? actualBytes - 1 : 1;
            const cellLimit = mode === "narrow" || mode === "equal" ? 1 : 65_536;
            const rootBudget = { maxContextBytes: 65_536, maxOutputBytes: 65_536, [field]: rootLimit };
            const effectiveBudget = { ...rootBudget, [field]: Math.min(rootLimit, mode === "default" ? rootLimit : cellLimit) };
            const admitted = effectiveBudget[field] >= actualBytes;
            const dispatched = admitted || field === "maxOutputBytes";
            const budget = mode === "default" ? {} : { budget: { maxContextBytes: 65_536, maxOutputBytes: 65_536, [field]: cellLimit } };
            const cell = kind === "agent"
              ? { id: "cell", kind, prompt: "fixture", output: { kind: "text" }, ...budget }
              : { id: "cell", kind, query: { contract: "algal.expr.v1", program: "q" }, ...budget };
            const store = new MemoryStore();
            const child = parseOrganismManifest({
              contract: "algal.organism.v1", key: "organism:byte-bound-child", name: "Byte bound child",
              ...(!nested ? { budgets: rootBudget } : {}),
              interface: { inputs: {}, outputs: { out: { cell: "cell", port: "out" } } },
              cells: [cell], edges: [],
            });
            const manifest = nested ? parseOrganismManifest({
              contract: "algal.organism.v1", key: "organism:byte-bound-root", name: "Byte bound root",
              budgets: rootBudget, cells: [{ id: "sub", kind: "organism", manifest: await store.putManifest(child) }], edges: [],
            }) : child;
            const requests: EffectRequest[] = [];
            const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [{
              id: "fixture", capabilities: { effects: ["agent", "recall"] },
              async execute(request) { requests.push(structuredClone(request)); return structuredClone(output); },
            }] });
            const expectedRequest = {
              contract: "algal.effect.v1", cellId: "cell", kind, prompt: kind === "agent" ? "fixture" : "",
              context: kind === "agent" ? { inputs: {}, turn: 0 } : { inputs: {} },
              output: kind === "agent" ? { kind: "text" } : {
                kind: "json", schema: { type: "object", required: ["hits"], properties: { hits: { type: "array" } } },
              },
              budget: effectiveBudget,
              ...(kind === "recall" ? { recall: { query: "q", k: 8, embedder: "local" } } : {}),
            } as EffectRequest;
            expect(canonicalBytes(expectedRequest.context)).toBe(contextBytes);
            expect(canonicalBytes(output)).toBe(outputBytes);
            expect(requests).toEqual(dispatched ? [expectedRequest] : []);
            expect(receipt.effects).toHaveLength(dispatched ? 1 : 0);
            if (dispatched) {
              expect(receipt.effects[0]?.requestDigest).toBe(effectRequestDigest(expectedRequest));
              expect(receipt.effects[0]?.output).toEqual(output);
            }
            const leafWork = 100 + (kind === "recall" ? 1 : 0)
              + (dispatched ? 500 + contextBytes : 0) + (admitted ? outputBytes : 0);
            expect(receipt.work).toEqual({ steps: nested ? 2 : 1, agentCalls: dispatched ? 1 : 0, units: leafWork + (nested ? 100 : 0) });
            const leafPath = nested ? "sub/cell" : "cell";
            expect(receipt.cells[leafPath]?.work).toBe(leafWork);
            expect(receipt.cells[leafPath]?.status).toBe(admitted ? "committed" : "failed");
            expect(receipt.cells[leafPath]?.outputs).toEqual(admitted ? { out: output } : undefined);
            expect(receipt.outcome).toBe(admitted ? "complete" : "failed");
            if (admitted) expect(receipt.failure).toBeUndefined();
            else expect(receipt.failure).toMatchObject({ code: "BUDGET_EXHAUSTED", path: leafPath });
            if (nested) {
              expect(receipt.cells.sub?.work).toBe(leafWork + 100);
              expect(receipt.cells.sub?.status).toBe(admitted ? "committed" : "failed");
              expect(receipt.cells.sub?.outputs).toEqual(admitted ? { out: output } : undefined);
            }
            expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store)).ok).toBe(true);
          });
        }
      }
    }
  }
});
