import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  manifestToJson,
  parseOrganismManifest,
} from "./contract";
import { scriptedExecutor } from "./effects";
import { builtinRegistry } from "./registry";
import { runOrganism, type RunReceipt } from "./run";
import { MemoryStore } from "./store";
import { verifyReceipt } from "./verify";
import type { JsonObject, JsonValue } from "./values";

const EXAMPLES = join(__dirname, "..", "examples");

function loadExample() {
  const manifestRaw = JSON.parse(
    readFileSync(join(EXAMPLES, "triage.morphogen.json"), "utf8"),
  ) as JsonValue;
  const responses = JSON.parse(
    readFileSync(join(EXAMPLES, "triage.responses.json"), "utf8"),
  ) as Record<string, JsonValue>;
  return { manifestRaw, responses };
}

async function runTriage() {
  const { manifestRaw, responses } = loadExample();
  const manifest = parseOrganismManifest(manifestRaw);
  const receipt = await runOrganism({
    manifest,
    args: { ticket: { text: "Export crashes on second click" } },
    fns: builtinRegistry(),
    store: new MemoryStore(),
    executors: [scriptedExecutor(responses)],
  });
  return { manifestRaw, receipt };
}

describe("verify", () => {
  test("a clean run verifies bit-for-bit", async () => {
    const { manifestRaw, receipt } = await runTriage();
    expect(receipt.outcome).toBe("complete");
    const report = await verifyReceipt(
      receipt as unknown as JsonValue,
      manifestRaw,
      new MemoryStore(),
      builtinRegistry(),
    );
    expect(report.mismatches).toEqual([]);
    expect(report.ok).toBe(true);
  });

  test("tampered cell output is caught", async () => {
    const { manifestRaw, receipt } = await runTriage();
    const tampered = structuredClone(receipt) as unknown as JsonObject;
    const cells = tampered.cells as JsonObject;
    const result = cells.result as JsonObject;
    (result.outputs as JsonObject).value = "FORGED: nothing happened";
    const report = await verifyReceipt(
      tampered as JsonValue,
      manifestRaw,
      new MemoryStore(),
      builtinRegistry(),
    );
    expect(report.ok).toBe(false);
    expect(report.mismatches.join(" ")).toMatch(/result/);
  });

  test("manifest digest mismatch is reported, not run", async () => {
    const { receipt } = await runTriage();
    const other = manifestToJson(
      parseOrganismManifest({
        contract: "morphogen.organism.v1",
        key: "organism:other",
        name: "Other",
        cells: [{ id: "x", kind: "input", outputs: { v: "json" } }],
      }),
    );
    const report = await verifyReceipt(
      receipt as unknown as JsonValue,
      other,
      new MemoryStore(),
      builtinRegistry(),
    );
    expect(report.ok).toBe(false);
    expect(report.mismatches[0]).toMatch(/manifestDigest/);
  });

  test("different scripted responses route differently and verify", async () => {
    const { manifestRaw } = loadExample();
    const manifest = parseOrganismManifest(manifestRaw);
    const receipt = await runOrganism({
      manifest,
      args: { ticket: { text: "Can it sync to my calendar?" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [scriptedExecutor({ route: "question" })],
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["as-question"]?.status).toBe("committed");
    expect(receipt.cells["as-bug"]?.status).toBe("skipped");
    expect(receipt.cells["result"]?.outputs?.value).toBe(
      "QUESTION: Can it sync to my calendar?",
    );
    const report = await verifyReceipt(
      receipt as unknown as JsonValue,
      manifestRaw,
      new MemoryStore(),
      builtinRegistry(),
    );
    expect(report.ok).toBe(true);
  });

  test("a tool-call loop replays bit-for-bit", async () => {
    const manifestRaw = {
      contract: "morphogen.organism.v1",
      key: "organism:vtools",
      name: "VTools",
      cells: [
        { id: "src", kind: "input", outputs: { v: "json" } },
        {
          id: "a",
          kind: "agent",
          inputs: { v: "json" },
          prompt: "p",
          output: { kind: "text" },
          tools: ["pick.v1"],
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "a", port: "v" } },
      ],
    } as JsonValue;
    const responses = {
      a: [
        { tool: "pick.v1", inputs: { record: { k: "v1" }, field: "k" } },
        "done",
      ],
    };
    const manifest = parseOrganismManifest(manifestRaw);
    const receipt = await runOrganism({
      manifest,
      args: { src: { v: { k: "v1" } } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [scriptedExecutor(responses)],
    });
    expect(receipt.outcome).toBe("complete");
    const report = await verifyReceipt(
      receipt as unknown as JsonValue,
      manifestRaw,
      new MemoryStore(),
      builtinRegistry(),
    );
    expect(report.mismatches).toEqual([]);
    expect(report.ok).toBe(true);
  });

  test("a repeat run replays bit-for-bit", async () => {
    const store = new MemoryStore();
    const innerRaw = {
      contract: "morphogen.organism.v1",
      key: "organism:polish",
      name: "Polish",
      interface: {
        inputs: { draft: { cell: "in", port: "draft" } },
        outputs: {
          draft: { cell: "editor", port: "out" },
          verdict: { cell: "critic", port: "out" },
        },
      },
      cells: [
        { id: "in", kind: "input", outputs: { draft: "text" } },
        {
          id: "editor",
          kind: "agent",
          inputs: { draft: "text" },
          prompt: "Improve the draft.",
          output: { kind: "text" },
        },
        {
          id: "critic",
          kind: "classifier",
          inputs: { draft: "text" },
          prompt: "Ship it?",
          output: { kind: "choice", labels: ["revise", "ship"] },
        },
      ],
      edges: [
        { from: { cell: "in", port: "draft" }, to: { cell: "editor", port: "draft" } },
        { from: { cell: "editor", port: "out" }, to: { cell: "critic", port: "draft" } },
      ],
    } as JsonValue;
    const innerDigest = await store.putManifest(parseOrganismManifest(innerRaw));
    const outerRaw = {
      contract: "morphogen.organism.v1",
      key: "organism:refine",
      name: "Refine",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "loop",
          kind: "repeat",
          manifest: innerDigest,
          maxRounds: 4,
          carry: { draft: "draft" },
          until: { output: "verdict", equals: "ship" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "loop", port: "draft" } },
      ],
    } as JsonValue;
    const receipt = await runOrganism({
      manifest: parseOrganismManifest(outerRaw),
      args: { src: { v: "v0" } },
      fns: builtinRegistry(),
      store,
      executors: [scriptedExecutor({
        editor: ["d1", "d2", "d3"],
        critic: ["revise", "revise", "ship"],
      })],
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["loop"]?.rounds).toBe(3);
    const report = await verifyReceipt(
      receipt as unknown as JsonValue,
      outerRaw,
      store,
      builtinRegistry(),
    );
    expect(report.mismatches).toEqual([]);
    expect(report.ok).toBe(true);
  });

  test("digest over receipt is stable", async () => {
    const { receipt } = await runTriage();
    const again = JSON.parse(
      JSON.stringify(receipt),
    ) as RunReceipt;
    expect(again.digest).toBe(receipt.digest);
  });
});
