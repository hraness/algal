import { describe, expect, test } from "bun:test";
import { parseOrganismManifest } from "./contract";
import { runFoundry } from "./foundry";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";

const echo = parseOrganismManifest({
  contract: "morphogen.organism.v1",
  key: "organism:echo-candidate",
  name: "Echo candidate",
  interface: {
    inputs: { q: { cell: "src", port: "value" } },
    outputs: { answer: { cell: "echo", port: "value" } },
  },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "echo", kind: "fn", fn: "echo.v1" },
  ],
  edges: [
    { from: { cell: "src", port: "value" }, to: { cell: "echo", port: "value" } },
  ],
});

const constant = parseOrganismManifest({
  contract: "morphogen.organism.v1",
  key: "organism:constant-candidate",
  name: "Constant candidate",
  interface: {
    inputs: { q: { cell: "src", port: "value" } },
    outputs: { answer: { cell: "out", port: "value" } },
  },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value: "a" } } },
  ],
  edges: [],
});

describe("foundry", () => {
  test("evaluates train and validation cases and promotes the best candidate", async () => {
    const store = new MemoryStore();
    const result = await runFoundry({
      candidates: [constant, echo],
      cases: [
        { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
        { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
      ],
      fns: builtinRegistry(),
      store,
      executors: [],
    });

    expect(result.contract).toBe("morphogen.foundry.v1");
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]?.train.passed).toBe(1);
    expect(result.candidates[0]?.validation.passed).toBe(0);
    expect(result.candidates[1]?.validation.passed).toBe(1);
    expect(result.promoted).toBe(result.candidates[1]!.manifestDigest);
    expect(result.candidates[1]?.cases[1]?.receiptDigest).toMatch(/^sha256:/);
    expect(await store.getReceipt(result.candidates[1]!.cases[1]!.receiptDigest!)).toBeDefined();
  });

  test("rejects duplicate case ids and candidates without interfaces", async () => {
    const noInterface = parseOrganismManifest({
      contract: "morphogen.organism.v1",
      key: "organism:no-interface",
      name: "No interface",
      cells: [{ id: "x", kind: "const", outputs: { value: { type: "text", value: "x" } } }],
      edges: [],
    });
    const base = {
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [],
    };

    await expect(runFoundry({
      ...base,
      candidates: [echo],
      cases: [
        { id: "same", split: "train" as const, args: { q: "a" }, expect: { answer: "a" } },
        { id: "same", split: "validation" as const, args: { q: "b" }, expect: { answer: "b" } },
      ],
    })).rejects.toThrow("duplicate foundry case id");
    await expect(runFoundry({
      ...base,
      candidates: [noInterface],
      cases: [
        { id: "train", split: "train", args: {}, expect: {} },
        { id: "validation", split: "validation", args: {}, expect: {} },
      ],
    })).rejects.toThrow("must declare an interface");
  });

  test("bounds candidate populations", async () => {
    await expect(runFoundry({
      candidates: Array.from({ length: 33 }, () => echo),
      cases: [
        { id: "train", split: "train", args: { q: "a" }, expect: { answer: "a" } },
        { id: "validation", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
      ],
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [],
    })).rejects.toThrow("candidates exceed 32");
  });

  test("requires both train and validation cases", async () => {
    await expect(runFoundry({
      candidates: [echo],
      cases: [{ id: "one", split: "train", args: { q: "a" }, expect: { answer: "a" } }],
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [],
    })).rejects.toThrow("at least one validation case");
  });
});
