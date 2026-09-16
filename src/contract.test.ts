import { describe, expect, test } from "bun:test";
import {
  BOUNDS,
  manifestToJson,
  parseOrganismManifest,
} from "./contract";
import { compileOrganism } from "./graph";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import { MorphogenError } from "./errors";

const minimal = {
  contract: "morphogen.organism.v1",
  key: "organism:min",
  name: "Minimal",
  cells: [
    { id: "src", kind: "input", outputs: { text: "text" } },
    { id: "sink", kind: "fn", fn: "echo.v1" },
  ],
  edges: [
    { from: { cell: "src", port: "text" }, to: { cell: "sink", port: "value" } },
  ],
};

describe("manifest parsing", () => {
  test("accepts a minimal manifest", () => {
    const m = parseOrganismManifest(minimal);
    expect(m.key).toBe("organism:min");
    expect(m.budgets.maxSteps).toBe(256);
  });

  test("round-trips through manifestToJson", () => {
    const m = parseOrganismManifest(minimal);
    const m2 = parseOrganismManifest(manifestToJson(m));
    expect(m2).toEqual(m);
  });

  test("rejects wrong contract", () => {
    expect(() =>
      parseOrganismManifest({ ...minimal, contract: "other.v9" }),
    ).toThrow(MorphogenError);
  });

  test("rejects bad key shape", () => {
    expect(() =>
      parseOrganismManifest({ ...minimal, key: "Min" }),
    ).toThrow(/organism:<kebab-key>/);
  });

  test("rejects unknown keys (fail closed)", () => {
    expect(() =>
      parseOrganismManifest({ ...minimal, surprise: true }),
    ).toThrow(/unknown key/);
  });

  test("rejects over-bound cell counts", () => {
    const cells = Array.from({ length: BOUNDS.maxCells + 1 }, (_, i) => ({
      id: `c${i}`,
      kind: "input",
      outputs: { v: "json" },
    }));
    expect(() =>
      parseOrganismManifest({ ...minimal, cells, edges: [] }),
    ).toThrow(/exceeds/);
  });

  test("rejects duplicate cell ids", async () => {
    const m = parseOrganismManifest({
      ...minimal,
      cells: [
        { id: "a", kind: "input", outputs: { v: "json" } },
        { id: "a", kind: "input", outputs: { v: "json" } },
      ],
      edges: [],
    });
    await expect(
      compileOrganism(m, builtinRegistry(), new MemoryStore()),
    ).rejects.toThrow(/duplicate cell id/);
  });
});

describe("graph admission", () => {
  test("rejects cycles", async () => {
    const m = parseOrganismManifest({
      contract: "morphogen.organism.v1",
      key: "organism:cyc",
      name: "Cyclic",
      cells: [
        { id: "a", kind: "fn", fn: "echo.v1" },
        { id: "b", kind: "fn", fn: "echo.v1" },
      ],
      edges: [
        { from: { cell: "a", port: "value" }, to: { cell: "b", port: "value" } },
        { from: { cell: "b", port: "value" }, to: { cell: "a", port: "value" } },
      ],
    });
    await expect(
      compileOrganism(m, builtinRegistry(), new MemoryStore()),
    ).rejects.toThrow(/cycle/);
  });

  test("rejects type-mismatched edges", async () => {
    const m = parseOrganismManifest({
      ...minimal,
      cells: [
        { id: "src", kind: "input", outputs: { rec: "json" } },
        {
          id: "agent",
          kind: "agent",
          inputs: { note: "text" },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "rec" }, to: { cell: "agent", port: "note" } },
      ],
    });
    await expect(
      compileOrganism(m, builtinRegistry(), new MemoryStore()),
    ).rejects.toThrow(/TYPE_MISMATCH|cannot feed/);
  });

  test("rejects guards on non-choice producers", async () => {
    const m = parseOrganismManifest({
      ...minimal,
      cells: [
        { id: "src", kind: "input", outputs: { v: "json" } },
        { id: "sink", kind: "fn", fn: "echo.v1" },
      ],
      edges: [
        {
          from: { cell: "src", port: "v" },
          to: { cell: "sink", port: "value" },
          guard: { equals: "x" },
        },
      ],
    });
    await expect(
      compileOrganism(m, builtinRegistry(), new MemoryStore()),
    ).rejects.toThrow(/GUARD_INVALID|guard/);
  });

  test("rejects unknown fn refs", async () => {
    const m = parseOrganismManifest({
      ...minimal,
      cells: [{ id: "f", kind: "fn", fn: "nonexistent.v9" }],
      edges: [],
    });
    await expect(
      compileOrganism(m, builtinRegistry(), new MemoryStore()),
    ).rejects.toThrow(/FN_UNKNOWN|unknown fn/);
  });

  test("rejects double-routed input ports", async () => {
    const m = parseOrganismManifest({
      ...minimal,
      cells: [
        { id: "a", kind: "input", outputs: { v: "json" } },
        { id: "b", kind: "input", outputs: { v: "json" } },
        { id: "sink", kind: "fn", fn: "echo.v1" },
      ],
      edges: [
        { from: { cell: "a", port: "v" }, to: { cell: "sink", port: "value" } },
        { from: { cell: "b", port: "v" }, to: { cell: "sink", port: "value" } },
      ],
    });
    await expect(
      compileOrganism(m, builtinRegistry(), new MemoryStore()),
    ).rejects.toThrow(/single-assignment/);
  });

  test("rejects view.inputs referencing undeclared inputs", async () => {
    const m = parseOrganismManifest({
      ...minimal,
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "a",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "p",
          view: { inputs: ["v", "ghost"] },
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "a", port: "v" } },
      ],
    });
    await expect(
      compileOrganism(m, builtinRegistry(), new MemoryStore()),
    ).rejects.toThrow(/undeclared input/);
  });
});
