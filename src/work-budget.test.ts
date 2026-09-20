import { expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { AlgalError } from "./errors";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { verifyReceipt } from "./verify";
import type { JsonValue } from "./values";

test("handled failure spends maxWork before a recovery effect can execute", async () => {
  for (const maxWork of [1, 10_000]) {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:handled-work-budget", name: "Handled work budget",
      budgets: { maxWork, maxAgentCalls: 2 },
      cells: [
        { id: "worker", kind: "agent", prompt: "fixture", output: { kind: "text" } },
        { id: "fallback", kind: "agent", inputs: { err: "json" }, prompt: "fixture", output: { kind: "text" } },
      ],
      edges: [{ from: { cell: "worker", port: "out" }, to: { cell: "fallback", port: "err" }, on: "fail" }],
    });
    const calls: string[] = [];
    const receipt = await runOrganism({
      manifest, fns: builtinRegistry(), store: new MemoryStore(),
      executors: [{ id: "deterministic-work-budget", async execute(request) {
        calls.push(request.cellId);
        if (request.cellId === "worker") throw new AlgalError("EFFECT_FAILED", "fixture");
        return "recovered";
      } }],
    });
    expect(receipt.cells.worker?.status).toBe("failed");
    if (maxWork === 1) {
      expect(calls).toEqual(["worker"]);
      expect(receipt.effects).toHaveLength(1);
      expect(receipt.work.agentCalls).toBe(1);
      expect(receipt.cells.fallback).toBeUndefined();
      expect(receipt.failure).toEqual({ code: "BUDGET_EXHAUSTED", message: "maxWork exhausted", path: "worker" });
      expect(receipt.outcome).toBe("failed");
    } else {
      expect(calls).toEqual(["worker", "fallback"]);
      expect(receipt.cells.fallback?.outputs?.out).toBe("recovered");
      expect(receipt.outcome).toBe("complete");
    }
    expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), new MemoryStore())).ok).toBe(true);
  }
});
