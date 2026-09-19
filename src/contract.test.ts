import { describe, expect, test } from "bun:test";
import {
  BOUNDS,
  manifestToJson,
  parseOrganismManifest,
} from "./contract";
import { compileOrganism } from "./graph";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import { AlgalError } from "./errors";

const minimal = {
  contract: "algal.organism.v1",
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
    ).toThrow(AlgalError);
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
    contract: "algal.organism.v1",
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
      contract: "algal.organism.v1",
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
      contract: "algal.organism.v1",
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
      contract: "algal.organism.v1",
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
      contract: "algal.organism.v1",
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
      contract: "algal.organism.v1",
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
      contract: "algal.organism.v1",
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
    contract: "algal.organism.v1",
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
      contract: "algal.organism.v1",
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
      contract: "algal.organism.v1",
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

  test("retry parses on effect cells, round-trips, and is bounded", () => {
    const cell = (kind: string, retry?: unknown) => ({
      contract: "algal.organism.v1",
      key: "organism:rt",
      name: "RT",
      cells: [
        {
          id: "a",
          kind,
          prompt: "p",
          output:
            kind === "agent"
              ? { kind: "text" }
              : { kind: "choice", labels: ["a", "b"] },
          ...(retry === undefined ? {} : { retry }),
        },
      ],
      edges: [],
    });
    for (const kind of ["agent", "classifier", "gate"]) {
      const m = parseOrganismManifest(
        cell(kind, { attempts: 3 }),
      );
      const a = m.cells[0] as { retry?: { attempts: number } };
      expect(a.retry).toEqual({ attempts: 3 });
      const back = parseOrganismManifest(manifestToJson(m));
      expect((back.cells[0] as typeof a).retry).toEqual({ attempts: 3 });
      expect(() =>
        parseOrganismManifest(cell(kind, { attempts: 1 })),
      ).toThrow(/attempts/);
      expect(() =>
        parseOrganismManifest(
          cell(kind, { attempts: BOUNDS.maxRetryAttempts + 1 }),
        ),
      ).toThrow(/attempts/);
      expect(() =>
        parseOrganismManifest(cell(kind, { attempts: "x" })),
      ).toThrow();
      expect(() =>
        parseOrganismManifest(cell(kind, { attempts: 2, extra: 1 })),
      ).toThrow(/unknown key/);
    }
    expect(() =>
      parseOrganismManifest(cell("fn", { attempts: 2 })),
    ).toThrow(/unknown key/);
  });
});

describe("slot cells", () => {
  test("slot cells parse, bound, and round-trip", () => {
    const m = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:slots",
      name: "Slots",
      cells: [
        {
          id: "mem",
          kind: "slot",
          name: "count",
          mode: "read",
          default: { n: 0 },
        },
        { id: "sink", kind: "slot", name: "count", mode: "write" },
      ],
      edges: [],
    });
    const mem = m.cells[0] as {
      kind: string;
      name: string;
      mode: string;
      default?: unknown;
    };
    expect(mem.mode).toBe("read");
    expect(mem.default).toEqual({ n: 0 });
    const back = parseOrganismManifest(manifestToJson(m));
    expect(manifestToJson(back)).toEqual(manifestToJson(m));
  });

  test("slot cells reject bad mode, bad name, and unknown keys", () => {
    const cell = (extra: Record<string, unknown>) => ({
      contract: "algal.organism.v1",
      key: "organism:s",
      name: "S",
      cells: [{ id: "s", kind: "slot", name: "x", mode: "read", ...extra }],
    });
    expect(() =>
      parseOrganismManifest(cell({ mode: "append" })),
    ).toThrow(/mode/);
    expect(() =>
      parseOrganismManifest(
        cell({ name: "has/slash" }),
      ),
    ).toThrow();
    expect(() =>
      parseOrganismManifest(cell({ via: "x" })),
    ).toThrow(/unknown key/);
  });

  test("spawn cells carry no config and round-trip", () => {
    const m = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:t",
      name: "T",
      cells: [
        {
          id: "prog",
          kind: "const",
          outputs: { m: { type: "json", value: {} } },
        },
        { id: "run", kind: "spawn" },
      ],
      edges: [
        {
          from: { cell: "prog", port: "m" },
          to: { cell: "run", port: "manifest" },
        },
      ],
    });
    const back = parseOrganismManifest(manifestToJson(m));
    expect(manifestToJson(back)).toEqual(manifestToJson(m));
    expect(() =>
      parseOrganismManifest({
        contract: "algal.organism.v1",
        key: "organism:t",
        name: "T",
        cells: [{ id: "s", kind: "spawn", extra: 1 }],
        edges: [],
      }),
    ).toThrow("unknown key");
  });

  test("tool cells parse, bound time, and round-trip", () => {
    const raw = {
      contract: "algal.organism.v1",
      key: "organism:tool",
      name: "Tool",
      cells: [{
        id: "lookup",
        kind: "tool",
        tool: "records.lookup.v1",
        budget: { maxEffectMs: 1000 },
      }],
      edges: [],
    };
    const parsed = parseOrganismManifest(raw);
    expect(manifestToJson(parseOrganismManifest(manifestToJson(parsed)))).toEqual(manifestToJson(parsed));
    expect(() => parseOrganismManifest({
      ...raw,
      cells: [{ id: "lookup", kind: "tool", tool: "records.lookup.v1", budget: { maxEffectMs: 0 } }],
    })).toThrow("maxEffectMs");
    expect(() => parseOrganismManifest({
      ...raw,
      cells: [{ id: "lookup", kind: "tool", tool: "records.lookup.v1", shell: "curl" }],
    })).toThrow("unknown key");
  });
});

describe("expr cells", () => {
  const base = {
    contract: "algal.organism.v1",
    key: "organism:expr-t",
    name: "Expr",
    cells: [
      { id: "in", kind: "input", outputs: { ticket: "json" } },
      {
        id: "rate",
        kind: "expr",
        inputs: { ticket: "json" },
        expr: {
          contract: "algal.expr.v1",
          program: [
            "if",
            ["gt", ["get", "ticket", "amount"], 1000],
            "high",
            "std",
          ],
        },
        output: { kind: "choice", labels: ["high", "std"] },
      },
    ],
    edges: [
      {
        from: { cell: "in", port: "ticket" },
        to: { cell: "rate", port: "ticket" },
      },
    ],
  };

  const cell = (over: Record<string, unknown>) => ({
    ...base,
    cells: [base.cells[0], { ...(base.cells[1] as object), ...over }],
  });

  test("parses, round-trips, and checks literal get names at parse", () => {
    const m = parseOrganismManifest(base);
    expect(manifestToJson(parseOrganismManifest(manifestToJson(m)))).toEqual(
      manifestToJson(m),
    );
    // a get naming an undeclared port fails admission, not the run
    expect(() =>
      parseOrganismManifest(
        cell({
          expr: { contract: "algal.expr.v1", program: ["get", "ghost"] },
        }),
      ),
    ).toThrow("unbound name");
  });

  test("rejects bad envelopes, unknown ops, and onMiss", () => {
    const exprCell = (base.cells[1] as { expr: object }).expr;
    expect(() =>
      parseOrganismManifest(
        cell({ expr: { contract: "other.v1", program: 1 } }),
      ),
    ).toThrow("algal.expr.v1");
    // unknown ops are caught statically — even in dead branches
    expect(() =>
      parseOrganismManifest(
        cell({
          expr: {
            contract: "algal.expr.v1",
            program: ["if", true, "high", ["bogus", "x"]],
          },
        }),
      ),
    ).toThrow("EXPR_OP");
    // literal arrays must be quoted — [1,2] parses as an op call
    expect(() =>
      parseOrganismManifest(
        cell({ expr: { contract: "algal.expr.v1", program: ["list", [1, 2]] } }),
      ),
    ).toThrow("EXPR_PARSE");
    expect(() =>
      parseOrganismManifest(
        cell({
          expr: exprCell,
          output: { kind: "choice", labels: ["a"], onMiss: "a" },
        }),
      ),
    ).toThrow("onMiss");
    // strict keys
    expect(() =>
      parseOrganismManifest(cell({ fuel: 5 })),
    ).toThrow("unknown key");
  });
});

describe("expr guards", () => {
  const base = {
    contract: "algal.organism.v1",
    key: "organism:g",
    name: "G",
    cells: [
      { id: "in", kind: "input", outputs: { n: "json" } },
      { id: "sink", kind: "fn", fn: "echo.v1" },
    ],
    edges: [
      {
        from: { cell: "in", port: "n" },
        to: { cell: "sink", port: "value" },
        guard: {
          expr: {
            contract: "algal.expr.v1",
            program: ["gt", ["get", "value"], 10],
          },
        },
      },
    ],
  };

  test("parses on a non-choice producer and round-trips", () => {
    const m = parseOrganismManifest(base);
    expect(manifestToJson(parseOrganismManifest(manifestToJson(m)))).toEqual(
      manifestToJson(m),
    );
  });

  test("rejects mixing expr with equals/field and unbound names", () => {
    const edge = (guard: unknown) => ({
      ...base,
      edges: [{ ...base.edges[0], guard }],
    });
    expect(() =>
      parseOrganismManifest(edge({ expr: { contract: "algal.expr.v1", program: true }, equals: "x" })),
    ).toThrow("cannot mix");
    // literal get names must resolve to the guard env — "value" only
    expect(() =>
      parseOrganismManifest(
        edge({ expr: { contract: "algal.expr.v1", program: ["get", "ghost"] } }),
      ),
    ).toThrow("unbound name");
    expect(() =>
      parseOrganismManifest(edge({ expr: { contract: "other.v1", program: true } })),
    ).toThrow("algal.expr.v1");
  });
});
