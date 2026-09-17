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

describe("view.cells and repeat parsing", () => {
  const agent = (view: unknown) => ({
    contract: "morphogen.organism.v1",
    key: "organism:v",
    name: "V",
    cells: [
      { id: "src", kind: "input", outputs: { v: "text" } },
      {
        id: "a",
        kind: "agent",
        inputs: { v: "text" },
        prompt: "p",
        view,
        output: { kind: "text" },
      },
    ],
    edges: [
      { from: { cell: "src", port: "v" }, to: { cell: "a", port: "v" } },
    ],
  });

  test("view.cells round-trips through manifestToJson", () => {
    const m = parseOrganismManifest(agent({ cells: ["src"] }));
    expect(m.cells[1]!.kind === "agent" && m.cells[1]!.view.cells)
      .toEqual([{ cell: "src" }]);
    // bare strings serialize back as bare strings; sliced entries keep ports
    const sliced = parseOrganismManifest(
      agent({ cells: [{ cell: "src", ports: ["v"] }] }),
    );
    const reparsed = parseOrganismManifest(manifestToJson(sliced));
    expect(
      reparsed.cells[1]!.kind === "agent" && reparsed.cells[1]!.view.cells,
    ).toEqual([{ cell: "src", ports: ["v"] }]);
    const reparsedBare = parseOrganismManifest(manifestToJson(m));
    expect(
      reparsedBare.cells[1]!.kind === "agent" && reparsedBare.cells[1]!.view.cells,
    ).toEqual([{ cell: "src" }]);
  });

  test("view.cells rejects duplicates, bad ids, and over-bound lists", () => {
    expect(() => parseOrganismManifest(agent({ cells: ["src", "src"] })))
      .toThrowError(/unique/);
    expect(() => parseOrganismManifest(agent({ cells: ["Bad Id"] })))
      .toThrowError();
    const tooMany = Array.from({ length: BOUNDS.maxViewCells + 1 }, (_, i) => `c${i}`);
    expect(() => parseOrganismManifest(agent({ cells: tooMany })))
      .toThrowError();
  });

  test("repeat requires a digest manifest and bounded maxRounds", async () => {
    const store = new MemoryStore();
    const inner = parseOrganismManifest({
      contract: "morphogen.organism.v1",
      key: "organism:inner",
      name: "Inner",
      interface: {
        inputs: { v: { cell: "in", port: "v" } },
        outputs: { v: { cell: "in", port: "v" } },
      },
      cells: [{ id: "in", kind: "input", outputs: { v: "text" } }],
    });
    const d = await store.putManifest(inner);
    const outer = (cell: Record<string, unknown>) => ({
      contract: "morphogen.organism.v1",
      key: "organism:o",
      name: "O",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        cell,
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "loop", port: "v" } },
      ],
    });
    // valid
    const ok = parseOrganismManifest(outer({
      id: "loop", kind: "repeat", manifest: d, maxRounds: 3,
      carry: { v: "v" }, until: { output: "v", equals: "done" },
    }));
    expect(ok.cells[1]!.kind).toBe("repeat");
    // bounds
    expect(() => parseOrganismManifest(outer({
      id: "loop", kind: "repeat", manifest: d, maxRounds: 0,
    }))).toThrowError();
    expect(() => parseOrganismManifest(outer({
      id: "loop", kind: "repeat", manifest: d,
      maxRounds: BOUNDS.maxRounds + 1,
    }))).toThrowError();
    expect(() => parseOrganismManifest(outer({
      id: "loop", kind: "repeat", manifest: d, maxRounds: 2, extra: 1,
    }))).toThrowError();
    // admission: until must name an interface output
    await expect(
      compileOrganism(
        parseOrganismManifest(outer({
          id: "loop", kind: "repeat", manifest: d, maxRounds: 2,
          until: { output: "nope", equals: "x" },
        })),
        builtinRegistry(),
        store,
      ),
    ).rejects.toThrowError(/not an interface output/);
    // admission: child without interface is rejected
    const noIface = parseOrganismManifest({
      contract: "morphogen.organism.v1",
      key: "organism:noiface",
      name: "NI",
      cells: [{ id: "in", kind: "input", outputs: { v: "text" } }],
    });
    const d2 = await store.putManifest(noIface);
    await expect(
      compileOrganism(
        parseOrganismManifest(outer({
          id: "loop", kind: "repeat", manifest: d2, maxRounds: 2,
        })),
        builtinRegistry(),
        store,
      ),
    ).rejects.toThrowError(/interface/);
  });

  test("field guard and until.field round-trip through manifestToJson", async () => {
    const store = new MemoryStore();
    const inner = parseOrganismManifest({
      contract: "morphogen.organism.v1",
      key: "organism:rep-json",
      name: "RepJson",
      interface: {
        inputs: { v: { cell: "in", port: "v" } },
        outputs: { report: { cell: "in", port: "rec" } },
      },
      cells: [
        { id: "in", kind: "input", outputs: { v: "json", rec: "json" } },
      ],
    });
    const d = await store.putManifest(inner);
    const m = parseOrganismManifest({
      contract: "morphogen.organism.v1",
      key: "organism:fg",
      name: "FG",
      cells: [
        { id: "src", kind: "input", outputs: { rec: "json" } },
        { id: "dst", kind: "fn", fn: "echo.v1" },
        { id: "loop", kind: "repeat", manifest: d, maxRounds: 4,
          until: { output: "report", field: "status", equals: "done" } },
      ],
      edges: [
        { from: { cell: "src", port: "rec" }, to: { cell: "dst", port: "value" },
          guard: { field: "severity", equals: "high" } },
        { from: { cell: "src", port: "rec" }, to: { cell: "loop", port: "v" } },
      ],
    });
    const reparsed = parseOrganismManifest(manifestToJson(m));
    expect(reparsed.edges[0]!.guard).toEqual({
      field: "severity",
      equals: "high",
    });
    const loop = reparsed.cells[2]!;
    expect(loop.kind === "repeat" && loop.until).toEqual({
      output: "report",
      equals: "done",
      field: "status",
    });
  });

  test("view.graph round-trips and requires view.cells", async () => {
    const m = parseOrganismManifest(
      agent({ cells: ["src"], graph: true }),
    );
    const reparsed = parseOrganismManifest(manifestToJson(m));
    expect(
      reparsed.cells[1]!.kind === "agent" && reparsed.cells[1]!.view.graph,
    ).toBe(true);
    // graph without named cells fails admission
    await expect(
      compileOrganism(
        parseOrganismManifest(agent({ graph: true })),
        builtinRegistry(),
        new MemoryStore(),
      ),
    ).rejects.toThrowError(/view\.graph requires view\.cells/);
    expect(() => parseOrganismManifest(agent({ graph: "yes" })))
      .toThrowError(/must be a boolean/);
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

describe("ref ports and store/load cells", () => {
  const cas = {
    contract: "morphogen.organism.v1",
    key: "organism:cas",
    name: "Cas",
    cells: [
      { id: "src", kind: "input", outputs: { doc: "json" } },
      { id: "pin", kind: "store" },
      { id: "get", kind: "load" },
      { id: "refin", kind: "input", outputs: { r: "ref" } },
    ],
    edges: [
      { from: { cell: "src", port: "doc" }, to: { cell: "pin", port: "data" } },
      { from: { cell: "pin", port: "ref" }, to: { cell: "get", port: "ref" } },
    ],
  };

  test("parses store/load cells and ref ports; round-trips", () => {
    const m = parseOrganismManifest(cas);
    const pin = m.cells.find((c) => c.id === "pin")!;
    expect(pin.kind).toBe("store");
    const reparsed = parseOrganismManifest(manifestToJson(m));
    expect(reparsed).toEqual(m);
  });

  test("ref port accepts optional and many on consumers", () => {
    const m = parseOrganismManifest({
      ...cas,
      cells: [
        {
          id: "a",
          kind: "agent",
          inputs: { rs: { type: "ref", many: true } },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [],
    });
    const cell = m.cells[0] as {
      inputs: Record<string, { type: string; many?: boolean }>;
    };
    expect(cell.inputs.rs!.type).toBe("ref");
    expect(cell.inputs.rs!.many).toBe(true);
  });

  test("store/load reject unknown keys and extra fields", () => {
    expect(() =>
      parseOrganismManifest({
        ...cas,
        cells: [{ id: "pin", kind: "store", prompt: "nope" }],
      }),
    ).toThrow(/unknown key/);
  });
});

describe("json port schemas", () => {
  test("schema parses on json ports and round-trips", () => {
    const m = parseOrganismManifest({
      contract: "morphogen.organism.v1",
      key: "organism:sch",
      name: "Sch",
      cells: [
        {
          id: "a",
          kind: "agent",
          inputs: {
            rec: {
              type: "json",
              schema: { type: "object", required: ["severity"] },
            },
          },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [],
    });
    expect(parseOrganismManifest(manifestToJson(m))).toEqual(m);
  });

  test("schema is rejected on non-json ports and beyond depth bound", () => {
    const cell = (inputs: unknown) => ({
      contract: "morphogen.organism.v1",
      key: "organism:sch2",
      name: "Sch2",
      cells: [
        { id: "a", kind: "agent", inputs, prompt: "p", output: { kind: "text" } },
      ],
      edges: [],
    });
    expect(() =>
      parseOrganismManifest(
        cell({ r: { type: "ref", schema: { type: "object" } } }),
      ),
    ).toThrow(/requires type "json"/);
    let deep: Record<string, unknown> = {};
    for (let i = 0; i < BOUNDS.maxSchemaDepth + 1; i++) {
      deep = { properties: { ["k" + i]: deep } };
    }
    expect(() =>
      parseOrganismManifest(cell({ r: { type: "json", schema: deep } })),
    ).toThrow(/schema depth/);
  });
});
