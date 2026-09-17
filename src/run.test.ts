import { describe, expect, test } from "bun:test";
import {
  manifestToJson,
  parseOrganismManifest,
  type OrganismManifest,
} from "./contract";
import { cachedExecutor, scriptedExecutor } from "./effects";
import { digestCanonical } from "./digest";
import { MorphogenError } from "./errors";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { verifyReceipt } from "./verify";
import type { JsonValue } from "./values";

function manifest(u: unknown): OrganismManifest {
  return parseOrganismManifest(u);
}

async function run(
  m: OrganismManifest,
  opts: {
    args?: Record<string, Record<string, unknown>>;
    responses?: Record<string, unknown>;
    store?: MemoryStore;
  } = {},
) {
  return runOrganism({
    manifest: m,
    args: (opts.args ?? {}) as never,
    fns: builtinRegistry(),
    store: opts.store ?? new MemoryStore(),
    executors: opts.responses
      ? [scriptedExecutor(opts.responses as never)]
      : [],
  });
}

const chain = {
  contract: "morphogen.organism.v1",
  key: "organism:chain",
  name: "Chain",
  cells: [
    { id: "src", kind: "input", outputs: { v: "json" } },
    { id: "mid", kind: "fn", fn: "echo.v1" },
    { id: "end", kind: "fn", fn: "echo.v1" },
  ],
  edges: [
    { from: { cell: "src", port: "v" }, to: { cell: "mid", port: "value" } },
    { from: { cell: "mid", port: "value" }, to: { cell: "end", port: "value" } },
  ],
};

describe("scheduler", () => {
  test("runs a linear chain in declared order", async () => {
    const r = await run(manifest(chain), { args: { src: { v: "hi" } } });
    expect(r.outcome).toBe("complete");
    expect(r.cells["end"]?.outputs?.value).toBe("hi");
    const commits = r.events
      .filter((e) => e.kind === "cell.commit")
      .map((e) => e.path);
    expect(commits).toEqual(["src", "mid", "end"]);
  });

  test("guarded edges route choice outputs; dead branches skip", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:guard",
      name: "Guard",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        { id: "lab", kind: "fn", fn: "label.v1" },
        { id: "only-a", kind: "fn", fn: "tag.v1" },
        { id: "only-b", kind: "fn", fn: "tag.v1" },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "lab", port: "value" } },
        {
          from: { cell: "lab", port: "value" },
          to: { cell: "only-a", port: "tag" },
          guard: { equals: "a" },
        },
        {
          from: { cell: "lab", port: "value" },
          to: { cell: "only-b", port: "tag" },
          guard: { equals: "b" },
        },
        { from: { cell: "src", port: "v" }, to: { cell: "only-a", port: "value" } },
        { from: { cell: "src", port: "v" }, to: { cell: "only-b", port: "value" } },
      ],
    });
    const r = await run(m, { args: { src: { v: "a" } } });
    expect(r.outcome).toBe("complete");
    expect(r.cells["only-a"]?.status).toBe("committed");
    expect(r.cells["only-b"]?.status).toBe("skipped");
    expect(r.cells["only-a"]?.outputs?.value).toBe("A: a");
  });

  test("agent cells get bounded context and commit typed output", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:ag",
      name: "Agent",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "brain",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "Summarize.",
          view: { inputs: ["v"] },
          output: { kind: "text" },
        },
        { id: "wrap", kind: "fn", fn: "tag.v1" },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "brain", port: "v" } },
        { from: { cell: "brain", port: "out" }, to: { cell: "wrap", port: "tag" } },
        { from: { cell: "src", port: "v" }, to: { cell: "wrap", port: "value" } },
      ],
    });
    const r = await run(m, {
      args: { src: { v: "hello" } },
      responses: { brain: "a greeting" },
    });
    expect(r.outcome).toBe("complete");
    expect(r.effects).toHaveLength(1);
    expect(r.effects[0]!.executor).toBe("scripted");
    expect(r.cells["brain"]?.effectDigest).toMatch(/^sha256:/);
    expect(r.cells["wrap"]?.outputs?.value).toBe("A GREETING: hello");
    expect(r.work.agentCalls).toBe(1);
  });

  test("classifier onMiss absorbs undeclared output", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:miss",
      name: "Miss",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "c",
          kind: "classifier",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "choice", labels: ["x", "y"], onMiss: "y" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "c", port: "v" } },
      ],
    });
    const r = await run(m, {
      args: { src: { v: "t" } },
      responses: { c: "not-a-label" },
    });
    expect(r.outcome).toBe("complete");
    expect(r.cells["c"]?.outputs?.out).toBe("y");
  });

  test("classifier without onMiss fails closed on bad output", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:miss2",
      name: "Miss2",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "c",
          kind: "classifier",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "choice", labels: ["x", "y"] },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "c", port: "v" } },
      ],
    });
    const r = await run(m, {
      args: { src: { v: "t" } },
      responses: { c: "nope" },
    });
    expect(r.outcome).toBe("failed");
    expect(r.failure?.code).toBe("EFFECT_UNPARSEABLE");
  });

  test("budget exhaustion fails the run", async () => {
    const m = manifest({
      ...chain,
      key: "organism:budget",
      budgets: { maxSteps: 2 },
    });
    const r = await run(m, { args: { src: { v: 1 } } });
    expect(r.outcome).toBe("failed");
    expect(r.failure?.code).toBe("BUDGET_EXHAUSTED");
  });

  test("nested organism cells run and expose interface outputs", async () => {
    const store = new MemoryStore();
    const inner = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:inner",
      name: "Inner",
      interface: {
        inputs: { v: { cell: "in", port: "v" } },
        outputs: { result: { cell: "echo", port: "value" } },
      },
      cells: [
        { id: "in", kind: "input", outputs: { v: "text" } },
        { id: "echo", kind: "fn", fn: "tag.v1" },
      ],
      edges: [
        { from: { cell: "in", port: "v" }, to: { cell: "echo", port: "tag" } },
        { from: { cell: "in", port: "v" }, to: { cell: "echo", port: "value" } },
      ],
    });
    const innerDigest = await store.putManifest(inner);

    const outer = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:outer",
      name: "Outer",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        { id: "sub", kind: "organism", manifest: innerDigest },
        { id: "done", kind: "fn", fn: "echo.v1" },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "sub", port: "v" } },
        { from: { cell: "sub", port: "result" }, to: { cell: "done", port: "value" } },
      ],
    });
    const r = await run(outer, { args: { src: { v: "deep" } }, store });
    expect(r.outcome).toBe("complete");
    expect(r.cells["sub/in"]?.status).toBe("committed");
    expect(r.cells["sub/echo"]?.outputs?.value).toBe("DEEP: deep");
    expect(r.cells["done"]?.outputs?.value).toBe("DEEP: deep");
  });

  test("agent context exceeding maxContextBytes fails the run", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:ctx",
      name: "Ctx",
      budgets: { maxContextBytes: 64 },
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "a",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "a", port: "v" } },
      ],
    });
    const r = await run(m, {
      args: { src: { v: "x".repeat(500) } },
      responses: { a: "never reached" },
    });
    expect(r.outcome).toBe("failed");
    expect(r.failure?.code).toBe("BUDGET_EXHAUSTED");
    expect(r.effects).toHaveLength(0);
  });

  test("organism nesting is bounded by the root manifest's maxDepth", async () => {
    // A manifest can never contain its own digest, so embedding graphs are
    // acyclic by construction — but a chain can still exceed maxDepth.
    const store = new MemoryStore();
    const mk = (key: string, innerDigest?: string) =>
      manifest({
        contract: "morphogen.organism.v1",
        key,
        name: key,
        interface: {
          inputs: { v: { cell: "in", port: "v" } },
          outputs: {
            r: innerDigest
              ? { cell: "sub", port: "r" }
              : { cell: "echo", port: "value" },
          },
        },
        cells: [
          { id: "in", kind: "input", outputs: { v: "text" } },
          innerDigest
            ? { id: "sub", kind: "organism", manifest: innerDigest }
            : { id: "echo", kind: "fn", fn: "echo.v1" },
        ],
        edges: innerDigest
          ? [{ from: { cell: "in", port: "v" }, to: { cell: "sub", port: "v" } }]
          : [{ from: { cell: "in", port: "v" }, to: { cell: "echo", port: "value" } }],
      });
    const d1 = await store.putManifest(mk("organism:l1"));
    const d2 = await store.putManifest(mk("organism:l2", d1));
    const d3 = await store.putManifest(mk("organism:l3", d2));
    const outer = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:outer-chain",
      name: "Outer",
      budgets: { maxDepth: 2 },
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        { id: "sub", kind: "organism", manifest: d3 },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "sub", port: "v" } },
      ],
    });
    // outer(0) → l3(1) → l2(2) → l1(3): depth 3 exceeds root maxDepth 2
    const r = await run(outer, { args: { src: { v: "x" } }, store });
    expect(r.outcome).toBe("failed");
    expect(r.failure?.code).toBe("DEPTH_EXCEEDED");
  });

  test("agent tool calls loop back into declared fns", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:tools",
      name: "Tools",
      cells: [
        { id: "src", kind: "input", outputs: { v: "json" } },
        {
          id: "a",
          kind: "agent",
          inputs: { v: "json" },
          prompt: "p",
          output: { kind: "text" },
          tools: ["pick.v1"],
          budget: { maxTurns: 4 },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "a", port: "v" } },
      ],
    });
    const r = await run(m, {
      args: { src: { v: { name: "wisp", age: 3 } } },
      responses: {
        a: [
          { tool: "pick.v1", inputs: { record: { name: "wisp", age: 3 }, field: "name" } },
          "the name is wisp",
        ],
      },
    });
    expect(r.outcome).toBe("complete");
    expect(r.cells["a"]?.outputs?.out).toBe("the name is wisp");
    expect(r.work.agentCalls).toBe(2);
    expect(r.effects).toHaveLength(2);
    // each turn is a distinct effect request (turn + toolLog differ)
    expect(r.effects[0]!.requestDigest).not.toBe(r.effects[1]!.requestDigest);
    const calls = r.cells["a"]?.toolCalls as { fn: string; output: { value: string } }[];
    expect(calls).toHaveLength(1);
    expect(calls[0]!.fn).toBe("pick.v1");
    expect(calls[0]!.output.value).toBe("wisp");
  });

  test("tool loop that never settles exhausts maxTurns", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:tools-loop",
      name: "Loop",
      cells: [
        { id: "src", kind: "input", outputs: { v: "json" } },
        {
          id: "a",
          kind: "agent",
          inputs: { v: "json" },
          prompt: "p",
          output: { kind: "text" },
          tools: ["pick.v1"],
          budget: { maxTurns: 3 },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "a", port: "v" } },
      ],
    });
    const r = await run(m, {
      args: { src: { v: { name: "w" } } },
      responses: {
        a: [
          { tool: "pick.v1", inputs: { record: {}, field: "x" } },
          { tool: "pick.v1", inputs: { record: {}, field: "x" } },
          { tool: "pick.v1", inputs: { record: {}, field: "x" } },
          { tool: "pick.v1", inputs: { record: {}, field: "x" } },
        ],
      },
    });
    expect(r.outcome).toBe("failed");
    expect(r.failure?.code).toBe("BUDGET_EXHAUSTED");
  });

  test("tool call to an undeclared ref is just output (fail closed)", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:tools-scope",
      name: "Scope",
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
    });
    // echo.v1 is NOT in tools → the object binds as output → not text → fail
    const r = await run(m, {
      args: { src: { v: {} } },
      responses: { a: { tool: "echo.v1", inputs: { value: 1 } } },
    });
    expect(r.outcome).toBe("failed");
    expect(r.failure?.code).toBe("EFFECT_UNPARSEABLE");
  });

  test("tool call with missing required input fails the cell", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:tools-req",
      name: "Req",
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
    });
    const r = await run(m, {
      args: { src: { v: {} } },
      responses: { a: { tool: "pick.v1", inputs: { field: "name" } } },
    });
    expect(r.outcome).toBe("failed");
    expect(r.failure?.code).toBe("EFFECT_FAILED");
  });

  test("tools entries must name known registry fns", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:bad-tool",
      name: "BadTool",
      cells: [
        {
          id: "a",
          kind: "agent",
          inputs: {},
          prompt: "p",
          output: { kind: "text" },
          tools: ["nope.v9"],
        },
      ],
    });
    await expect(
      runOrganism({
        manifest: m,
        args: {},
        fns: builtinRegistry(),
        store: new MemoryStore(),
        executors: [],
      }),
    ).rejects.toThrowError(/unknown tool fn/);
  });

  test("shadow classifier records the decision but takes the declared label", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:shadow",
      name: "Shadow",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "c",
          kind: "classifier",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "choice", labels: ["live", "shadowed"] },
          shadow: { take: "live" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "c", port: "v" } },
      ],
    });
    const r = await run(m, {
      args: { src: { v: "t" } },
      responses: { c: "shadowed" },
    });
    expect(r.outcome).toBe("complete");
    // the committed output is the declared label; the model's pick is recorded
    expect(r.cells["c"]?.outputs?.out).toBe("live");
    expect(r.cells["c"]?.shadowOut).toBe("shadowed");
  });

  test("shadow.take must be a declared label", () => {
    expect(() =>
      manifest({
        contract: "morphogen.organism.v1",
        key: "organism:bad-shadow",
        name: "BadShadow",
        cells: [
          {
            id: "c",
            kind: "classifier",
            inputs: {},
            prompt: "p",
            output: { kind: "choice", labels: ["a"] },
            shadow: { take: "not-a-label" },
          },
        ],
      }),
    ).toThrowError(/declared label/);
  });

  test("route.preset selects a named executor", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:routed",
      name: "Routed",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "a",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "text" },
          route: { preset: "small" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "a", port: "v" } },
      ],
    });
    const receipt = await runOrganism({
      manifest: m,
      args: { src: { v: "x" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [
        { id: "preset:small", execute: scriptedExecutor({ a: "from-small" }).execute },
        { id: "preset:big", execute: scriptedExecutor({ a: "from-big" }).execute },
      ],
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["a"]?.outputs?.out).toBe("from-small");
    expect(receipt.effects[0]!.executor).toBe("preset:small");
  });

  test("gate cells emit kind:gate effect requests and drive guards", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:gate",
      name: "Gate",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "approve",
          kind: "gate",
          inputs: { v: "text" },
          prompt: "Ship it?",
          output: { kind: "choice", labels: ["allow", "deny"] },
        },
        { id: "ship", kind: "fn", fn: "tag.v1" },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "approve", port: "v" } },
        {
          from: { cell: "approve", port: "out" },
          to: { cell: "ship", port: "tag" },
          guard: { equals: "allow" },
        },
        { from: { cell: "src", port: "v" }, to: { cell: "ship", port: "value" } },
      ],
    });
    const seen: string[] = [];
    const receipt = await runOrganism({
      manifest: m,
      args: { src: { v: "release-1" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [{
        id: "approver",
        async execute(req) {
          seen.push(req.kind);
          return "allow";
        },
      }],
    });
    expect(receipt.outcome).toBe("complete");
    expect(seen).toEqual(["gate"]);
    expect(receipt.cells["ship"]?.outputs?.value).toBe("ALLOW: release-1");
  });

  test("view.cells delivers ancestor records into the effect context", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:viewcells",
      name: "ViewCells",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        { id: "prep", kind: "fn", fn: "tag.v1" },
        {
          id: "brain",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "p",
          view: { inputs: "*", cells: ["prep"] },
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "prep", port: "tag" } },
        { from: { cell: "src", port: "v" }, to: { cell: "prep", port: "value" } },
        { from: { cell: "prep", port: "value" }, to: { cell: "brain", port: "v" } },
      ],
    });
    let captured: JsonValue | undefined;
    const receipt = await runOrganism({
      manifest: m,
      args: { src: { v: "seed" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [{
        id: "capture",
        async execute(req) {
          captured = req.context as unknown as JsonValue;
          return "ok";
        },
      }],
    });
    expect(receipt.outcome).toBe("complete");
    const ctx = captured as { cells?: Record<string, { status: string; outputs?: Record<string, JsonValue> }> };
    expect(ctx.cells?.prep?.status).toBe("committed");
    expect(ctx.cells?.prep?.outputs?.value).toBe("SEED: seed");
  });

  test("view.cells port slicing limits which ancestor outputs enter context", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:vcslice",
      name: "VcSlice",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text", secret: "text" } },
        {
          id: "brain",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "p",
          view: { inputs: "*", cells: [{ cell: "src", ports: ["v"] }] },
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "brain", port: "v" } },
      ],
    });
    let captured: JsonValue | undefined;
    const receipt = await runOrganism({
      manifest: m,
      args: { src: { v: "shown", secret: "hidden" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [{
        id: "capture",
        async execute(req) {
          captured = req.context as unknown as JsonValue;
          return "ok";
        },
      }],
    });
    expect(receipt.outcome).toBe("complete");
    const ctx = captured as {
      cells: { src: { outputs: Record<string, JsonValue> } };
    };
    expect(ctx.cells.src.outputs).toEqual({ v: "shown" });
    // admission rejects a slice naming a port the ancestor lacks
    await expect(
      runOrganism({
        manifest: manifest({
          contract: "morphogen.organism.v1",
          key: "organism:vcslice-bad",
          name: "Bad",
          cells: [
            { id: "src", kind: "input", outputs: { v: "text" } },
            {
              id: "brain",
              kind: "agent",
              inputs: { v: "text" },
              prompt: "p",
              view: { inputs: "*", cells: [{ cell: "src", ports: ["nope"] }] },
              output: { kind: "text" },
            },
          ],
          edges: [
            { from: { cell: "src", port: "v" }, to: { cell: "brain", port: "v" } },
          ],
        }),
        args: { src: { v: "x" } },
        fns: builtinRegistry(),
        store: new MemoryStore(),
        executors: [],
      }),
    ).rejects.toThrowError(/not an output port/);
  });

  test("field guard routes on a json record field", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:fguard",
      name: "FGuard",
      cells: [
        { id: "src", kind: "input", outputs: { rec: "json" } },
        {
          id: "urgent",
          kind: "agent",
          inputs: { rec: "json" },
          prompt: "p",
          output: { kind: "text" },
        },
        {
          id: "calm",
          kind: "agent",
          inputs: { rec: "json" },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [
        {
          from: { cell: "src", port: "rec" },
          to: { cell: "urgent", port: "rec" },
          guard: { field: "severity", equals: "high" },
        },
        {
          from: { cell: "src", port: "rec" },
          to: { cell: "calm", port: "rec" },
          guard: { field: "severity", equals: "low" },
        },
      ],
    });
    const run = (rec: JsonValue) =>
      runOrganism({
        manifest: m,
        args: { src: { rec } },
        fns: builtinRegistry(),
        store: new MemoryStore(),
        executors: [scriptedExecutor({ urgent: "URGENT", calm: "CALM" })],
      });
    const hi = await run({ severity: "high", msg: "disk full" });
    expect(hi.outcome).toBe("complete");
    expect(hi.cells["urgent"]?.status).toBe("committed");
    expect(hi.cells["urgent"]?.outputs?.out).toBe("URGENT");
    expect(hi.cells["calm"]?.status).toBe("skipped");
    // a record without the field matches nothing — both consumers skip
    const miss = await run({ msg: "hello" });
    expect(miss.cells["urgent"]?.status).toBe("skipped");
    expect(miss.cells["calm"]?.status).toBe("skipped");
    // a non-object value can never match a field guard
    const scalar = await run("high");
    expect(scalar.cells["urgent"]?.status).toBe("skipped");
  });

  test("field guard requires a json producer", async () => {
    await expect(
      runOrganism({
        manifest: manifest({
          contract: "morphogen.organism.v1",
          key: "organism:fguard-bad",
          name: "Bad",
          cells: [
            { id: "src", kind: "input", outputs: { rec: "text" } },
            { id: "dst", kind: "fn", fn: "echo.v1" },
          ],
          edges: [
            {
              from: { cell: "src", port: "rec" },
              to: { cell: "dst", port: "value" },
              guard: { field: "s", equals: "x" },
            },
          ],
        }),
        args: {},
        fns: builtinRegistry(),
        store: new MemoryStore(),
        executors: [],
      }),
    ).rejects.toThrowError(/field guard requires a json producer/);
  });

  test("until.field exits a repeat when a json field matches", async () => {
    const store = new MemoryStore();
    const inner = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:statuser",
      name: "Statuser",
      interface: {
        inputs: { draft: { cell: "in", port: "draft" } },
        outputs: { report: { cell: "critic", port: "out" } },
      },
      cells: [
        { id: "in", kind: "input", outputs: { draft: "text" } },
        {
          id: "critic",
          kind: "agent",
          inputs: { draft: "text" },
          prompt: "Report status.",
          output: { kind: "json", schema: { type: "object" } },
        },
      ],
      edges: [
        { from: { cell: "in", port: "draft" }, to: { cell: "critic", port: "draft" } },
      ],
    });
    const d = await store.putManifest(inner);
    const outer = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:untilfield",
      name: "UntilField",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "loop",
          kind: "repeat",
          manifest: d,
          maxRounds: 5,
          until: { output: "report", field: "status", equals: "done" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "loop", port: "draft" } },
      ],
    });
    const receipt = await runOrganism({
      manifest: outer,
      args: { src: { v: "v0" } },
      fns: builtinRegistry(),
      store,
      executors: [
        scriptedExecutor({
          critic: [{ status: "go" }, { status: "go" }, { status: "done" }],
        }),
      ],
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["loop"]?.rounds).toBe(3);
    expect(receipt.cells["loop/r3"]).toBeUndefined();
    // until.field on a non-json output fails admission
    const innerChoice = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:statuser-c",
      name: "StatuserC",
      interface: {
        inputs: { draft: { cell: "in", port: "draft" } },
        outputs: { verdict: { cell: "critic", port: "out" } },
      },
      cells: [
        { id: "in", kind: "input", outputs: { draft: "text" } },
        {
          id: "critic",
          kind: "classifier",
          inputs: { draft: "text" },
          prompt: "p",
          output: { kind: "choice", labels: ["go", "done"] },
        },
      ],
      edges: [
        { from: { cell: "in", port: "draft" }, to: { cell: "critic", port: "draft" } },
      ],
    });
    const dc = await store.putManifest(innerChoice);
    await expect(
      runOrganism({
        manifest: manifest({
          contract: "morphogen.organism.v1",
          key: "organism:untilfield-bad",
          name: "Bad",
          cells: [
            { id: "src", kind: "input", outputs: { v: "text" } },
            {
              id: "loop",
              kind: "repeat",
              manifest: dc,
              maxRounds: 2,
              until: { output: "verdict", field: "status", equals: "done" },
            },
          ],
          edges: [
            { from: { cell: "src", port: "v" }, to: { cell: "loop", port: "draft" } },
          ],
        }),
        args: { src: { v: "x" } },
        fns: builtinRegistry(),
        store,
        executors: [],
      }),
    ).rejects.toThrowError(/until\.field requires a json output/);
  });

  test("view.graph puts the ancestor wiring into context", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:vgraph",
      name: "VGraph",
      cells: [
        { id: "src", kind: "input", outputs: { rec: "json" } },
        {
          id: "mid",
          kind: "agent",
          inputs: { rec: "json" },
          prompt: "p",
          output: { kind: "text" },
        },
        {
          id: "brain",
          kind: "agent",
          inputs: { rec: "json" },
          prompt: "p",
          view: { cells: ["src", "mid"], graph: true },
          output: { kind: "text" },
        },
        { id: "sink", kind: "fn", fn: "echo.v1" },
      ],
      edges: [
        { from: { cell: "src", port: "rec" }, to: { cell: "mid", port: "rec" } },
        { from: { cell: "mid", port: "out" }, to: { cell: "brain", port: "rec" } },
        { from: { cell: "src", port: "rec" }, to: { cell: "sink", port: "value" } },
      ],
    });
    let captured: JsonValue | undefined;
    const receipt = await runOrganism({
      manifest: m,
      args: { src: { rec: { n: 1 } } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [
        {
          id: "cap",
          async execute(req) {
            if (req.cellId === "brain") {
              captured = req.context as unknown as JsonValue;
            }
            return "ok";
          },
        },
      ],
    });
    expect(receipt.outcome).toBe("complete");
    const ctx = captured as {
      graph: { edges: { from: string; to: string }[] };
    };
    // wiring among the named ancestors plus into the viewer — the sink edge
    // is excluded because sink is not a named cell
    expect(ctx.graph.edges).toEqual([
      { from: "src.rec", to: "mid.rec" },
      { from: "mid.out", to: "brain.rec" },
    ]);
  });

  test("on:fail edge routes a failure record to a recovery cell", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:failroute",
      name: "FailRoute",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "worker",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "text" },
        },
        {
          id: "fallback",
          kind: "agent",
          inputs: { err: "json" },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "worker", port: "v" } },
        {
          from: { cell: "worker", port: "out" },
          to: { cell: "fallback", port: "err" },
          on: "fail",
        },
      ],
    });
    let captured: JsonValue | undefined;
    const exec = {
      id: "flaky",
      async execute(req: { cellId: string; context: JsonValue }) {
        if (req.cellId === "worker") {
          throw new MorphogenError("EFFECT_FAILED", "boom");
        }
        captured = req.context;
        return "recovered";
      },
    };
    const receipt = await runOrganism({
      manifest: m,
      args: { src: { v: "job" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [exec],
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["worker"]?.status).toBe("failed");
    expect(receipt.cells["worker"]?.failure).toEqual({
      code: "EFFECT_FAILED",
      message: "boom",
    });
    expect(receipt.cells["worker"]?.work).toBeGreaterThan(0);
    // the recovery cell received the failure record and committed
    const ctx = captured as { inputs: { err: { code: string; message: string } } };
    expect(ctx.inputs.err).toEqual({ code: "EFFECT_FAILED", message: "boom" });
    expect(receipt.cells["fallback"]?.status).toBe("committed");
    // the failed effect was recorded — replay can reproduce it
    expect(receipt.effects[0]?.error).toEqual({
      code: "EFFECT_FAILED",
      message: "boom",
    });
  });

  test("a handled failure replays bit-for-bit through verify", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:failroute",
      name: "FailRoute",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "worker",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "text" },
        },
        {
          id: "fallback",
          kind: "agent",
          inputs: { err: "json" },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "worker", port: "v" } },
        {
          from: { cell: "worker", port: "out" },
          to: { cell: "fallback", port: "err" },
          on: "fail",
        },
      ],
    });
    const receipt = await runOrganism({
      manifest: m,
      args: { src: { v: "job" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [{
        id: "flaky",
        async execute(req) {
          if (req.cellId === "worker") {
            throw new MorphogenError("EFFECT_FAILED", "boom");
          }
          return "recovered";
        },
      }],
    });
    const report = await verifyReceipt(
      receipt as unknown as JsonValue,
      manifestToJson(m),
      new MemoryStore(),
    );
    expect(report.ok).toBe(true);
    expect(report.digest).toBe(receipt.digest);
  });

  test("an unhandled failure still fails the run, with the effect recorded", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:failbare",
      name: "FailBare",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "worker",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "worker", port: "v" } },
      ],
    });
    const receipt = await runOrganism({
      manifest: m,
      args: { src: { v: "job" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [{
        id: "flaky",
        async execute() {
          throw new MorphogenError("EFFECT_FAILED", "boom");
        },
      }],
    });
    expect(receipt.outcome).toBe("failed");
    expect(receipt.failure?.code).toBe("EFFECT_FAILED");
    expect(receipt.cells["worker"]?.failure?.message).toBe("boom");
    expect(receipt.effects[0]?.error?.code).toBe("EFFECT_FAILED");
    // and a failed run replays bit-for-bit too
    const report = await verifyReceipt(
      receipt as unknown as JsonValue,
      manifestToJson(m),
      new MemoryStore(),
    );
    expect(report.ok).toBe(true);
  });

  test("on:fail admission: json consumer, no guard, no port mixing", async () => {
    const base = (toPort: string, extra: Record<string, unknown> = {}) => ({
      contract: "morphogen.organism.v1",
      key: "organism:fadm",
      name: "FAdm",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "worker",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "text" },
        },
        {
          id: "recovery",
          kind: "agent",
          inputs: { err: "text", note: "json" },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "worker", port: "v" } },
        {
          from: { cell: "worker", port: "out" },
          to: { cell: "recovery", port: toPort },
          on: "fail",
          ...extra,
        },
      ],
    });
    // fail edge into a text port — the record is json
    await expect(
      runOrganism({
        manifest: manifest(base("err")),
        args: { src: { v: "x" } },
        fns: builtinRegistry(),
        store: new MemoryStore(),
        executors: [],
      }),
    ).rejects.toThrowError(/must be json/);
    // guard on a fail edge
    await expect(
      runOrganism({
        manifest: manifest(base("note", { guard: { equals: "x" } })),
        args: { src: { v: "x" } },
        fns: builtinRegistry(),
        store: new MemoryStore(),
        executors: [],
      }),
    ).rejects.toThrowError(/not valid on an on:"fail" edge/);
    // normal + fail edges into the same port
    const mixed = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:fmix",
      name: "FMix",
      cells: [
        { id: "src", kind: "input", outputs: { v: "json" } },
        { id: "worker", kind: "agent", inputs: { v: "json" }, prompt: "p", output: { kind: "text" } },
        { id: "recovery", kind: "agent", inputs: { err: "json" }, prompt: "p", output: { kind: "text" } },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "worker", port: "v" } },
        { from: { cell: "src", port: "v" }, to: { cell: "recovery", port: "err" } },
        { from: { cell: "worker", port: "out" }, to: { cell: "recovery", port: "err" }, on: "fail" },
      ],
    });
    await expect(
      runOrganism({
        manifest: mixed,
        args: {},
        fns: builtinRegistry(),
        store: new MemoryStore(),
        executors: [],
      }),
    ).rejects.toThrowError(/mixes normal and on:"fail" edges/);
  });

  test("view.cells rejects non-ancestor and unknown cells", async () => {
    // sibling commits before "brain" in declared order but is not an ancestor
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:viewcells-bad",
      name: "Bad",
      cells: [
        { id: "sibling", kind: "fn", fn: "echo.v1" },
        {
          id: "brain",
          kind: "agent",
          inputs: {},
          prompt: "p",
          view: { cells: ["sibling"] },
          output: { kind: "text" },
        },
      ],
      edges: [],
    });
    await expect(
      runOrganism({
        manifest: m,
        args: {},
        fns: builtinRegistry(),
        store: new MemoryStore(),
        executors: [],
      }),
    ).rejects.toThrowError(/not an ancestor|cycle/i);
  });

  test("repeat cell loops a sub-manifest with carry until the guard", async () => {
    const store = new MemoryStore();
    const inner = manifest({
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
    });
    const innerDigest = await store.putManifest(inner);
    const outer = manifest({
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
    });
    const receipt = await runOrganism({
      manifest: outer,
      args: { src: { v: "v0" } },
      fns: builtinRegistry(),
      store,
      executors: [scriptedExecutor({
        editor: ["v1-draft", "v2-draft", "v3-draft", "v4-draft"],
        critic: ["revise", "revise", "ship"],
      })],
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["loop"]?.rounds).toBe(3);
    expect(receipt.cells["loop"]?.outputs?.draft).toBe("v3-draft");
    expect(receipt.cells["loop"]?.outputs?.verdict).toBe("ship");
    // carried draft: round 1's editor saw round 0's output
    expect(receipt.cells["loop/r1/in"]?.outputs?.draft).toBe("v1-draft");
    expect(receipt.cells["loop/r2/in"]?.outputs?.draft).toBe("v2-draft");
    expect(receipt.cells["loop/r3"]).toBeUndefined();
    expect(receipt.work.agentCalls).toBe(6); // editor+critic × 3 rounds
  });

  test("repeat without until runs exactly maxRounds", async () => {
    const store = new MemoryStore();
    const inner = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:spin",
      name: "Spin",
      interface: {
        inputs: { v: { cell: "in", port: "v" } },
        outputs: { v: { cell: "pass", port: "value" } },
      },
      cells: [
        { id: "in", kind: "input", outputs: { v: "json" } },
        { id: "pass", kind: "fn", fn: "echo.v1" },
      ],
      edges: [{ from: { cell: "in", port: "v" }, to: { cell: "pass", port: "value" } }],
    });
    const d = await store.putManifest(inner);
    const outer = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:spinner",
      name: "Spinner",
      cells: [
        { id: "src", kind: "input", outputs: { v: "json" } },
        { id: "loop", kind: "repeat", manifest: d, maxRounds: 3, carry: { v: "v" } },
      ],
      edges: [{ from: { cell: "src", port: "v" }, to: { cell: "loop", port: "v" } }],
    });
    const receipt = await runOrganism({
      manifest: outer,
      args: { src: { v: 1 } },
      fns: builtinRegistry(),
      store,
      executors: [],
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["loop"]?.rounds).toBe(3);
    expect(receipt.cells["loop/r0/pass"]?.status).toBe("committed");
    expect(receipt.cells["loop/r2/pass"]?.status).toBe("committed");
  });

  test("repeat carry must name interface ports", async () => {
    const store = new MemoryStore();
    const inner = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:tiny",
      name: "Tiny",
      interface: {
        inputs: { v: { cell: "in", port: "v" } },
        outputs: { v: { cell: "in", port: "v" } },
      },
      cells: [{ id: "in", kind: "input", outputs: { v: "text" } }],
    });
    const d = await store.putManifest(inner);
    const outer = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:badcarry",
      name: "BadCarry",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        { id: "loop", kind: "repeat", manifest: d, maxRounds: 2, carry: { nope: "v" } },
      ],
      edges: [{ from: { cell: "src", port: "v" }, to: { cell: "loop", port: "v" } }],
    });
    await expect(
      runOrganism({
        manifest: outer,
        args: { src: { v: "x" } },
        fns: builtinRegistry(),
        store,
        executors: [],
      }),
    ).rejects.toThrowError(/not an interface output/);
  });

  test("many ports fan in every delivered edge in manifest order", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:fanin",
      name: "FanIn",
      cells: [
        { id: "a", kind: "input", outputs: { v: "text" } },
        { id: "b", kind: "input", outputs: { v: "text" } },
        { id: "c", kind: "input", outputs: { v: "text" } },
        { id: "join", kind: "fn", fn: "join.v1" },
      ],
      edges: [
        { from: { cell: "a", port: "v" }, to: { cell: "join", port: "items" } },
        { from: { cell: "b", port: "v" }, to: { cell: "join", port: "items" } },
        { from: { cell: "c", port: "v" }, to: { cell: "join", port: "items" } },
      ],
    });
    const receipt = await run(m, {
      args: { a: { v: "x" }, b: { v: "y" }, c: { v: "z" } },
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["join"]?.outputs?.value).toBe("x\ny\nz");
  });

  test("guarded fan-in contributes only the edges that fired", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:condfan",
      name: "CondFan",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "route",
          kind: "classifier",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "choice", labels: ["a", "b"] },
        },
        { id: "as-a", kind: "fn", fn: "tag.v1" },
        { id: "as-b", kind: "fn", fn: "tag.v1" },
        { id: "join", kind: "fn", fn: "join.v1" },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "route", port: "v" } },
        {
          from: { cell: "route", port: "out" }, to: { cell: "as-a", port: "tag" },
          guard: { equals: "a" },
        },
        { from: { cell: "src", port: "v" }, to: { cell: "as-a", port: "value" } },
        {
          from: { cell: "route", port: "out" }, to: { cell: "as-b", port: "tag" },
          guard: { equals: "b" },
        },
        { from: { cell: "src", port: "v" }, to: { cell: "as-b", port: "value" } },
        { from: { cell: "as-a", port: "value" }, to: { cell: "join", port: "items" } },
        { from: { cell: "as-b", port: "value" }, to: { cell: "join", port: "items" } },
      ],
    });
    const receipt = await run(m, {
      args: { src: { v: "hi" } },
      responses: { route: "b" },
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["as-a"]?.status).toBe("skipped");
    expect(receipt.cells["as-b"]?.status).toBe("committed");
    expect(receipt.cells["join"]?.outputs?.value).toBe("B: hi");
  });

  test("many on a producer port is rejected", async () => {
    expect(() =>
      manifest({
        contract: "morphogen.organism.v1",
        key: "organism:badmany",
        name: "Bad",
        cells: [
          { id: "src", kind: "input", outputs: { v: { type: "text", many: true } } },
        ],
      }),
    ).toThrowError(/many is only valid on input ports/);
  });

  test("an agent many input arrives as a list in context.inputs", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:manyagent",
      name: "ManyAgent",
      cells: [
        { id: "a", kind: "input", outputs: { v: "text" } },
        { id: "b", kind: "input", outputs: { v: "text" } },
        {
          id: "synth",
          kind: "agent",
          inputs: { notes: { type: "text", many: true } },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "a", port: "v" }, to: { cell: "synth", port: "notes" } },
        { from: { cell: "b", port: "v" }, to: { cell: "synth", port: "notes" } },
      ],
    });
    let captured: JsonValue | undefined;
    const receipt = await runOrganism({
      manifest: m,
      args: { a: { v: "n1" }, b: { v: "n2" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [{
        id: "capture",
        async execute(req) {
          captured = req.context as unknown as JsonValue;
          return "done";
        },
      }],
    });
    expect(receipt.outcome).toBe("complete");
    const ctx = captured as { inputs: { notes: JsonValue } };
    expect(ctx.inputs.notes).toEqual(["n1", "n2"]);
  });

  test("each maps a list through a sub-manifest and flattens into many", async () => {
    const store = new MemoryStore();
    const inner = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:rate-one",
      name: "RateOne",
      interface: {
        inputs: { item: { cell: "in", port: "item" } },
        outputs: { note: { cell: "rater", port: "out" } },
      },
      cells: [
        { id: "in", kind: "input", outputs: { item: "text" } },
        {
          id: "rater",
          kind: "agent",
          inputs: { item: "text" },
          prompt: "Rate the item.",
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "in", port: "item" }, to: { cell: "rater", port: "item" } },
      ],
    });
    const d = await store.putManifest(inner);
    const outer = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:batch",
      name: "Batch",
      cells: [
        { id: "src", kind: "input", outputs: { items: "json" } },
        { id: "map", kind: "each", manifest: d, over: "item", maxItems: 8 },
        { id: "join", kind: "fn", fn: "join.v1" },
      ],
      edges: [
        { from: { cell: "src", port: "items" }, to: { cell: "map", port: "item" } },
        { from: { cell: "map", port: "note" }, to: { cell: "join", port: "items" } },
      ],
    });
    const receipt = await runOrganism({
      manifest: outer,
      args: { src: { items: ["a", "b", "c"] } },
      fns: builtinRegistry(),
      store,
      executors: [scriptedExecutor({ rater: ["A+", "B-", "C"] })],
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["map"]?.items).toBe(3);
    expect(receipt.cells["map"]?.outputs?.note).toEqual(["A+", "B-", "C"]);
    expect(receipt.cells["map/i1/in"]?.outputs?.item).toBe("b");
    // many -> many flattens: join sees the three notes, not one list
    expect(receipt.cells["join"]?.outputs?.value).toBe("A+\nB-\nC");
    expect(receipt.work.agentCalls).toBe(3);
  });

  test("each enforces maxItems and element types", async () => {
    const store = new MemoryStore();
    const inner = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:one",
      name: "One",
      interface: {
        inputs: { item: { cell: "in", port: "item" } },
        outputs: { v: { cell: "in", port: "item" } },
      },
      cells: [{ id: "in", kind: "input", outputs: { item: "text" } }],
    });
    const d = await store.putManifest(inner);
    const outer = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:batcher",
      name: "Batcher",
      cells: [
        { id: "src", kind: "input", outputs: { items: "json" } },
        { id: "map", kind: "each", manifest: d, over: "item", maxItems: 2 },
      ],
      edges: [
        { from: { cell: "src", port: "items" }, to: { cell: "map", port: "item" } },
      ],
    });
    const over = await runOrganism({
      manifest: outer,
      args: { src: { items: ["a", "b", "c"] } },
      fns: builtinRegistry(),
      store,
      executors: [],
    });
    expect(over.outcome).toBe("failed");
    expect(over.failure?.code).toBe("BUDGET_EXHAUSTED");
    const bad = await runOrganism({
      manifest: outer,
      args: { src: { items: ["a", 42] } },
      fns: builtinRegistry(),
      store,
      executors: [],
    });
    expect(bad.outcome).toBe("failed");
    expect(bad.failure?.code).toBe("TYPE_MISMATCH");
  });

  test("each composes inside a repeat round; cell work is attributed", async () => {
    const store = new MemoryStore();
    // inner of each: classify one item as keep/drop
    const voteInner = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:vote",
      name: "Vote",
      interface: {
        inputs: { item: { cell: "in", port: "item" } },
        outputs: { keep: { cell: "keep", port: "out" } },
      },
      cells: [
        { id: "in", kind: "input", outputs: { item: "text" } },
        {
          id: "keep",
          kind: "classifier",
          inputs: { item: "text" },
          prompt: "Keep it?",
          output: { kind: "choice", labels: ["keep", "drop"] },
        },
      ],
      edges: [
        { from: { cell: "in", port: "item" }, to: { cell: "keep", port: "item" } },
      ],
    });
    const voteDigest = await store.putManifest(voteInner);
    // repeat body: run an each over the carried list, emit count + verdict
    const roundBody = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:round",
      name: "Round",
      interface: {
        inputs: { items: { cell: "in", port: "items" } },
        outputs: {
          items: { cell: "in", port: "items" },
          verdict: { cell: "done", port: "out" },
        },
      },
      cells: [
        { id: "in", kind: "input", outputs: { items: "json" } },
        {
          id: "votes",
          kind: "each",
          manifest: voteDigest,
          over: "item",
          maxItems: 8,
        },
        {
          id: "done",
          kind: "classifier",
          inputs: { items: "json", votes: { type: "choice", many: true } },
          prompt: "All kept?",
          output: { kind: "choice", labels: ["again", "finished"] },
        },
      ],
      edges: [
        { from: { cell: "in", port: "items" }, to: { cell: "votes", port: "item" } },
        { from: { cell: "in", port: "items" }, to: { cell: "done", port: "items" } },
        { from: { cell: "votes", port: "keep" }, to: { cell: "done", port: "votes" } },
      ],
    });
    const roundDigest = await store.putManifest(roundBody);
    const outer = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:winnow",
      name: "Winnow",
      cells: [
        { id: "src", kind: "input", outputs: { items: "json" } },
        {
          id: "loop",
          kind: "repeat",
          manifest: roundDigest,
          maxRounds: 3,
          carry: { items: "items" },
          until: { output: "verdict", equals: "finished" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "items" }, to: { cell: "loop", port: "items" } },
      ],
    });
    const receipt = await runOrganism({
      manifest: outer,
      args: { src: { items: ["x", "y"] } },
      fns: builtinRegistry(),
      store,
      executors: [scriptedExecutor({
        keep: ["keep", "drop", "keep", "keep"],
        done: ["again", "finished"],
      })],
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["loop"]?.rounds).toBe(2);
    // each inside round 0 and round 1
    expect(receipt.cells["loop/r0/votes"]?.items).toBe(2);
    expect(receipt.cells["loop/r1/votes"]?.items).toBe(2);
    // many->many flatten inside the nested scope: the votes reached `done`
    // (two items -> two votes per round)
    expect(receipt.cells["loop/r0/votes"]?.outputs?.keep).toEqual(["keep", "drop"]);
    // per-cell work is attributed, not zero
    expect(receipt.cells["loop"]?.work).toBeGreaterThan(0);
    expect(receipt.cells["loop/r0/votes"]?.work).toBeGreaterThan(0);
  });

  test("unresolvable cells produce a stuck outcome", async () => {
    // two pending cells blocked behind a skipped branch with a required input
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:stuck",
      name: "Stuck",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        { id: "lab", kind: "fn", fn: "label.v1" },
        {
          id: "gate",
          kind: "agent",
          inputs: { "from-a": "text", "from-b": "text" },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "lab", port: "value" } },
        {
          from: { cell: "lab", port: "value" },
          to: { cell: "gate", port: "from-a" },
          guard: { equals: "a" },
        },
        {
          from: { cell: "lab", port: "value" },
          to: { cell: "gate", port: "from-b" },
          guard: { equals: "b" },
        },
      ],
    });
    // label.v1 returns "a" for "a", "b" otherwise → choose "z" → label "b"
    // fromA dead (guard mismatch) → required input missing → gate SKIPS (not stuck).
    const r = await run(m, { args: { src: { v: "z" } }, responses: { gate: "x" } });
    expect(r.outcome).toBe("complete");
    expect(r.cells["gate"]?.status).toBe("skipped");
  });
});

describe("ref ports and store/load cells", () => {
  const cas = {
    contract: "morphogen.organism.v1",
    key: "organism:cas",
    name: "Cas",
    cells: [
      { id: "src", kind: "input", outputs: { doc: "json" } },
      { id: "put", kind: "store" },
      { id: "get", kind: "load" },
      { id: "end", kind: "fn", fn: "echo.v1" },
    ],
    edges: [
      { from: { cell: "src", port: "doc" }, to: { cell: "put", port: "data" } },
      { from: { cell: "put", port: "ref" }, to: { cell: "get", port: "ref" } },
      { from: { cell: "get", port: "data" }, to: { cell: "end", port: "value" } },
    ],
  };

  test("store writes the payload to CAS; load resolves it back", async () => {
    const store = new MemoryStore();
    const doc = { title: "big", body: "x".repeat(1000) };
    const r = await run(manifest(cas), {
      args: { src: { doc } },
      store,
    });
    expect(r.outcome).toBe("complete");
    const token = r.cells["put"]?.outputs?.ref;
    expect(typeof token).toBe("string");
    expect(token).toMatch(/^sha256:[0-9a-f]{64}$/);
    // only the token rode the edge — the payload is in the store
    expect(await store.getValue(token as never)).toEqual(doc);
    expect(r.cells["end"]?.outputs?.value).toEqual(doc);
  });

  test("a caller-supplied ref must already resolve in the store", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:refin",
      name: "RefIn",
      cells: [{ id: "src", kind: "input", outputs: { r: "ref" } }],
    });
    const store = new MemoryStore();
    const d = await store.putValue({ kept: true });
    const ok = await run(m, { args: { src: { r: d } }, store });
    expect(ok.cells["src"]?.outputs?.r).toBe(d);
    const r = await run(m, {
      args: {
        src: {
          r: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        },
      },
      store,
    });
    expect(r.outcome).toBe("failed");
    expect(r.cells["src"]?.failure?.code).toBe("INPUT_MISSING");
  });

  test("a non-digest ref value fails the type check", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:badref",
      name: "BadRef",
      cells: [{ id: "src", kind: "input", outputs: { r: "ref" } }],
    });
    const r = await run(m, { args: { src: { r: "not-a-digest" } } });
    expect(r.cells["src"]?.failure?.code).toBe("TYPE_MISMATCH");
  });

  test("a load cell fails closed when the blob is absent", async () => {
    // a ref minted in one store does not resolve in another
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:dangle",
      name: "Dangle",
      cells: [
        { id: "src", kind: "input", outputs: { r: "ref" } },
        { id: "get", kind: "load" },
      ],
      edges: [
        { from: { cell: "src", port: "r" }, to: { cell: "get", port: "ref" } },
      ],
    });
    const writer = new MemoryStore();
    const d = await writer.putValue({ kept: true });
    const r = await run(m, {
      args: { src: { r: d } },
      store: writer,
    });
    expect(r.outcome).toBe("complete");
    // the same manifest against an empty store fails at the input boundary
    const r2 = await run(m, {
      args: { src: { r: d } },
      store: new MemoryStore(),
    });
    expect(r2.cells["src"]?.failure?.code).toBe("INPUT_MISSING");
  });

  test("ref↔ref only: ref cannot feed json, json cannot feed ref", async () => {
    const bad = (toCell: string, toPort: string, fromCell = "put", fromPort = "ref") =>
      manifest({
        contract: "morphogen.organism.v1",
        key: "organism:rtype",
        name: "RType",
        cells: [
          { id: "src", kind: "input", outputs: { doc: "json" } },
          { id: "put", kind: "store" },
          { id: "end", kind: "fn", fn: "echo.v1" },
          { id: "get", kind: "load" },
        ],
        edges: [
          { from: { cell: "src", port: "doc" }, to: { cell: "put", port: "data" } },
          { from: { cell: fromCell, port: fromPort }, to: { cell: toCell, port: toPort } },
        ],
      });
    // ref → json consumer (echo.value is json): rejected
    await expect(run(bad("end", "value"))).rejects.toThrow("cannot feed");
    // json → ref consumer (load.ref): rejected
    await expect(run(bad("get", "ref", "src", "doc"))).rejects.toThrow(
      "cannot feed",
    );
  });

  test("payloads over maxValueBytes fail bounded at the boundary", async () => {
    const r = await run(manifest(cas), {
      args: { src: { doc: { blob: "x".repeat(300_000) } } },
    });
    expect(r.outcome).toBe("failed");
    // the value never enters the graph — src cannot commit an over-bound
    // port value, so the store cell is never even reached
    expect(r.cells["src"]?.failure?.code).toBe("BUDGET_EXHAUSTED");
    expect(r.cells["src"]?.failure?.message).toContain("store cell");
    expect(r.cells["put"]).toBeUndefined();
  });

  test("store/load runs replay bit-for-bit", async () => {
    const m = manifest(cas);
    const store = new MemoryStore();
    const receipt = await runOrganism({
      manifest: m,
      args: { src: { doc: { a: 1 } } },
      fns: builtinRegistry(),
      store,
      executors: [],
    });
    const report = await verifyReceipt(
      receipt as unknown as JsonValue,
      manifestToJson(m),
      store,
    );
    expect(report.ok).toBe(true);
    expect(report.digest).toBe(receipt.digest);
  });

  test("refs compose across organism boundaries (shared store)", async () => {
    const inner = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:refinner",
      name: "RefInner",
      cells: [
        { id: "in", kind: "input", outputs: { r: "ref" } },
        { id: "get", kind: "load" },
      ],
      edges: [
        { from: { cell: "in", port: "r" }, to: { cell: "get", port: "ref" } },
      ],
      interface: {
        inputs: { r: { cell: "in", port: "r" } },
        outputs: { doc: { cell: "get", port: "data" } },
      },
    });
    const store = new MemoryStore();
    const innerDigest = await store.putManifest(inner);
    const outer = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:refouter",
      name: "RefOuter",
      cells: [
        { id: "src", kind: "input", outputs: { doc: "json" } },
        { id: "put", kind: "store" },
        { id: "sub", kind: "organism", manifest: innerDigest },
      ],
      edges: [
        { from: { cell: "src", port: "doc" }, to: { cell: "put", port: "data" } },
        { from: { cell: "put", port: "ref" }, to: { cell: "sub", port: "r" } },
      ],
      interface: { outputs: { doc: { cell: "sub", port: "doc" } } },
    });
    const doc = { nested: [1, 2, 3] };
    const r = await run(outer, { args: { src: { doc } }, store });
    expect(r.outcome).toBe("complete");
    expect(r.cells["sub"]?.outputs?.doc).toEqual(doc);
    expect(r.cells["sub/get"]?.outputs?.data).toEqual(doc);
  });
});

describe("json port schemas", () => {
  const ticketer = (consumerSchema?: unknown, withFailEdge = false) => ({
    contract: "morphogen.organism.v1",
    key: "organism:schema",
    name: "Schema",
    cells: [
      { id: "src", kind: "input", outputs: { doc: "json" } },
      {
        id: "sink",
        kind: "agent",
        inputs: {
          rec: consumerSchema
            ? { type: "json", schema: consumerSchema }
            : "json",
        },
        prompt: "p",
        output: { kind: "text" },
      },
      ...(withFailEdge
        ? [{ id: "fallback", kind: "agent", inputs: { err: "json" }, prompt: "p", output: { kind: "text" } }]
        : []),
    ],
    edges: [
      { from: { cell: "src", port: "doc" }, to: { cell: "sink", port: "rec" } },
      ...(withFailEdge
        ? [{ from: { cell: "sink", port: "out" }, to: { cell: "fallback", port: "err" }, on: "fail" }]
        : []),
    ],
  });

  const schema = {
    type: "object",
    required: ["severity"],
    properties: { severity: { type: "string" } },
  };

  test("a schema'd consumer accepts a conforming record", async () => {
    const r = await run(manifest(ticketer(schema)), {
      args: { src: { doc: { severity: "high", title: "t" } } },
      responses: { sink: "ok" },
    });
    expect(r.outcome).toBe("complete");
    expect(r.cells["sink"]?.outputs?.out).toBe("ok");
  });

  test("a schema'd consumer fails on a missing required key", async () => {
    const r = await run(manifest(ticketer(schema)), {
      args: { src: { doc: { title: "t" } } },
      responses: { sink: "ok" },
    });
    expect(r.outcome).toBe("failed");
    expect(r.cells["sink"]?.failure?.code).toBe("TYPE_MISMATCH");
    expect(r.cells["sink"]?.failure?.message).toContain("severity");
  });

  test("a schema violation is routable via on:fail", async () => {
    const r = await run(manifest(ticketer(schema, true)), {
      args: { src: { doc: { title: "t" } } },
      responses: { sink: "ok", fallback: "handled" },
    });
    expect(r.outcome).toBe("complete");
    expect(r.cells["sink"]?.status).toBe("failed");
    expect(r.cells["fallback"]?.outputs?.out).toBe("handled");
  });

  test("a schema on a producer output is enforced at commit", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:schprod",
      name: "SchProd",
      cells: [
        {
          id: "c",
          kind: "const",
          outputs: {
            rec: { type: "json", schema, value: { title: "no severity" } },
          },
        },
      ],
    });
    const r = await run(m);
    expect(r.outcome).toBe("failed");
    expect(r.cells["c"]?.failure?.code).toBe("TYPE_MISMATCH");
  });
});

describe("retry", () => {
  const flaky = {
    contract: "morphogen.organism.v1",
    key: "organism:retry",
    name: "Retry",
    cells: [
      { id: "src", kind: "input", outputs: { v: "text" } },
      {
        id: "worker",
        kind: "agent",
        inputs: { v: "text" },
        prompt: "p",
        output: { kind: "text" },
        retry: { attempts: 3 },
      },
    ],
    edges: [
      { from: { cell: "src", port: "v" }, to: { cell: "worker", port: "v" } },
    ],
  };

  test("a failed attempt is recorded and the next attempt can succeed", async () => {
    let calls = 0;
    const r = await runOrganism({
      manifest: manifest(flaky),
      args: { src: { v: "job" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [{
        id: "flaky",
        async execute() {
          calls++;
          if (calls === 1) throw new MorphogenError("EFFECT_FAILED", "transient");
          return "done";
        },
      }],
    });
    expect(r.outcome).toBe("complete");
    expect(calls).toBe(2);
    expect(r.cells["worker"]?.outputs?.out).toBe("done");
    // both attempts recorded under the same request digest
    expect(r.effects.length).toBe(2);
    expect(r.effects[0]?.error?.code).toBe("EFFECT_FAILED");
    expect(r.effects[1]?.output).toBe("done");
    expect(r.effects[0]?.requestDigest).toBe(r.effects[1]?.requestDigest);
    expect(r.work.agentCalls).toBe(2);
  });

  test("exhausted attempts fail the cell; on:fail still routes the failure", async () => {
    const m = manifest({
      ...flaky,
      key: "organism:retryfail",
      cells: [
        ...flaky.cells,
        { id: "fallback", kind: "agent", inputs: { err: "json" }, prompt: "p", output: { kind: "text" } },
      ],
      edges: [
        ...flaky.edges,
        { from: { cell: "worker", port: "out" }, to: { cell: "fallback", port: "err" }, on: "fail" },
      ],
    });
    let calls = 0;
    const r = await runOrganism({
      manifest: m,
      args: { src: { v: "job" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [{
        id: "flaky",
        async execute(req) {
          calls++;
          if (req.cellId === "worker") throw new MorphogenError("EFFECT_FAILED", "down");
          return "handled";
        },
      }],
    });
    expect(r.outcome).toBe("complete");
    expect(calls).toBe(4); // 3 worker attempts + 1 fallback
    expect(r.cells["worker"]?.status).toBe("failed");
    expect(r.effects.filter((e) => e.error).length).toBe(3);
    expect(r.cells["fallback"]?.outputs?.out).toBe("handled");
  });

  test("a retried run replays bit-for-bit", async () => {
    const m = manifest(flaky);
    let calls = 0;
    const receipt = await runOrganism({
      manifest: m,
      args: { src: { v: "job" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [{
        id: "flaky",
        async execute() {
          calls++;
          if (calls < 3) throw new MorphogenError("EFFECT_FAILED", `f${calls}`);
          return "done";
        },
      }],
    });
    expect(receipt.effects.length).toBe(3);
    const report = await verifyReceipt(
      receipt as unknown as JsonValue,
      manifestToJson(m),
      new MemoryStore(),
    );
    expect(report.ok).toBe(true);
    expect(report.digest).toBe(receipt.digest);
  });

  test("a contract-violating response is recorded and retried", async () => {
    let calls = 0;
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:retrybind",
      name: "RetryBind",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "c",
          kind: "classifier",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "choice", labels: ["a", "b"] },
          retry: { attempts: 2 },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "c", port: "v" } },
      ],
    });
    const r = await runOrganism({
      manifest: m,
      args: { src: { v: "x" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [{
        id: "e",
        async execute() {
          calls++;
          return calls === 1 ? "not-a-label" : "a";
        },
      }],
    });
    expect(r.outcome).toBe("complete");
    expect(calls).toBe(2);
    expect(r.cells["c"]?.outputs?.out).toBe("a");
    expect(r.effects[0]?.output).toBe("not-a-label");
  });
});

describe("effect timeouts", () => {
  const m = manifest({
    contract: "morphogen.organism.v1",
    key: "organism:slow",
    name: "Slow",
    cells: [
      { id: "src", kind: "input", outputs: { v: "text" } },
      {
        id: "worker",
        kind: "agent",
        inputs: { v: "text" },
        prompt: "p",
        output: { kind: "text" },
        budget: { maxEffectMs: 25 },
        retry: { attempts: 2 },
      },
      {
        id: "fallback",
        kind: "agent",
        inputs: { err: "json" },
        prompt: "p",
        output: { kind: "text" },
      },
    ],
    edges: [
      { from: { cell: "src", port: "v" }, to: { cell: "worker", port: "v" } },
      {
        from: { cell: "worker", port: "out" },
        to: { cell: "fallback", port: "err" },
        on: "fail",
      },
    ],
  });

  test("a hung effect records a timeout error and retries the same request", async () => {
    let calls = 0;
    const r = await runOrganism({
      manifest: m,
      args: { src: { v: "job" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [
        {
          id: "slow",
          async execute(req) {
            calls++;
            if (req.cellId === "worker") {
              // never settles — the maxEffectMs race must end it
              return new Promise<JsonValue>(() => {});
            }
            return "handled";
          },
        },
      ],
    });
    expect(r.outcome).toBe("complete");
    expect(calls).toBe(3); // 2 timed-out attempts + 1 fallback
    expect(r.cells["worker"]?.status).toBe("failed");
    expect(r.cells["worker"]?.failure?.code).toBe("BUDGET_EXHAUSTED");
    expect(
      r.effects.filter((e) => e.error?.code === "BUDGET_EXHAUSTED").length,
    ).toBe(2);
    expect(r.cells["fallback"]?.outputs?.out).toBe("handled");
  });

  test("a fast executor is unaffected by the bound", async () => {
    const r = await runOrganism({
      manifest: m,
      args: { src: { v: "job" } },
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [
        {
          id: "fast",
          async execute() {
            return "quick";
          },
        },
      ],
    });
    expect(r.cells["worker"]?.outputs?.out).toBe("quick");
  });
});

describe("cachedExecutor", () => {
  const m = manifest({
    contract: "morphogen.organism.v1",
    key: "organism:memo",
    name: "Memo",
    cells: [
      { id: "src", kind: "input", outputs: { v: "text" } },
      {
        id: "agent",
        kind: "agent",
        inputs: { v: "text" },
        prompt: "p",
        output: { kind: "text" },
      },
    ],
    edges: [
      { from: { cell: "src", port: "v" }, to: { cell: "agent", port: "v" } },
    ],
  });

  test("a second run serves the recorded response and marks it cached", async () => {
    const store = new MemoryStore();
    let calls = 0;
    const inner = {
      id: "counting",
      async execute() {
        calls++;
        return "answer";
      },
    };
    const opts = {
      manifest: m,
      args: { src: { v: "job" } },
      fns: builtinRegistry(),
      store,
      executors: [cachedExecutor(inner, store)],
    };
    const r1 = await runOrganism(opts);
    expect(calls).toBe(1);
    expect(r1.effects[0]?.cached).toBeUndefined();

    const r2 = await runOrganism(opts);
    expect(calls).toBe(1); // memo hit — inner never ran again
    expect(r2.effects[0]?.cached).toBe(true);
    expect(r2.effects[0]?.output).toBe("answer");
    expect(r2.effects[0]?.executor).toBe("counting");
    // the memoized run is a different receipt — and it verifies bit-for-bit
    expect(r2.digest).not.toBe(r1.digest);
    const rep = await verifyReceipt(
      r2 as unknown as JsonValue,
      manifestToJson(m),
      store,
      builtinRegistry(),
    );
    expect(rep.ok).toBe(true);
  });

  test("errors are not memoized — a retry reaches the executor again", async () => {
    const store = new MemoryStore();
    let calls = 0;
    const inner = {
      id: "flaky",
      async execute() {
        calls++;
        if (calls === 1) throw new MorphogenError("EFFECT_FAILED", "boom");
        return "recovered";
      },
    };
    const withRetry = manifest({
      ...manifestToJson(m),
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "agent",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "text" },
          retry: { attempts: 2 },
        },
      ],
    });
    const r = await runOrganism({
      manifest: withRetry,
      args: { src: { v: "job" } },
      fns: builtinRegistry(),
      store,
      executors: [cachedExecutor(inner, store)],
    });
    expect(r.outcome).toBe("complete");
    expect(calls).toBe(2); // error attempt did not poison the memo
    expect(await store.getEffect(r.effects[0]!.requestDigest)).toBeDefined();
  });
});

describe("assert.v1", () => {
  const m = manifest({
    contract: "morphogen.organism.v1",
    key: "organism:assert",
    name: "Assert",
    cells: [
      { id: "src", kind: "input", outputs: { v: "json" } },
      { id: "invariant", kind: "fn", fn: "assert.v1" },
      { id: "recover", kind: "fn", fn: "pick.v1" },
      {
        id: "tagger",
        kind: "const",
        outputs: { field: { type: "text", value: "code" } },
      },
    ],
    edges: [
      {
        from: { cell: "src", port: "v" },
        to: { cell: "invariant", port: "value" },
      },
      {
        from: { cell: "src", port: "v" },
        to: { cell: "invariant", port: "expect" },
      },
      {
        from: { cell: "invariant", port: "value" },
        to: { cell: "recover", port: "record" },
        on: "fail",
      },
      {
        from: { cell: "tagger", port: "field" },
        to: { cell: "recover", port: "field" },
      },
    ],
  });

  test("matching expect passes the value through", async () => {
    const r = await run(m, {
      args: { src: { v: { status: "ok" } } },
    });
    // expect arg delivered to both ports — assert sees value===expect
    expect(r.cells["invariant"]?.outputs?.value).toEqual({ status: "ok" });
    expect(r.outcome).toBe("complete");
  });

  test("a mismatch fails FN_FAILED and routes through on:fail", async () => {
    const store = new MemoryStore();
    // separate producers so value and expect can differ
    const m2 = manifest({
      ...manifestToJson(m),
      cells: [
        { id: "src", kind: "input", outputs: { v: "json", e: "json" } },
        { id: "invariant", kind: "fn", fn: "assert.v1" },
        { id: "recover", kind: "fn", fn: "pick.v1" },
        {
          id: "tagger",
          kind: "const",
          outputs: { field: { type: "text", value: "code" } },
        },
      ],
      edges: [
        {
          from: { cell: "src", port: "v" },
          to: { cell: "invariant", port: "value" },
        },
        {
          from: { cell: "src", port: "e" },
          to: { cell: "invariant", port: "expect" },
        },
        {
          from: { cell: "invariant", port: "value" },
          to: { cell: "recover", port: "record" },
          on: "fail",
        },
        {
          from: { cell: "tagger", port: "field" },
          to: { cell: "recover", port: "field" },
        },
      ],
    });
    const r = await runOrganism({
      manifest: m2,
      args: { src: { v: { status: "bad" }, e: { status: "ok" } } },
      fns: builtinRegistry(),
      store,
      executors: [],
    });
    expect(r.cells["invariant"]?.status).toBe("failed");
    expect(r.cells["invariant"]?.failure?.code).toBe("FN_FAILED");
    // on:"fail" delivered {code,message} to recover.record; pick.v1 read .code
    expect(r.cells["recover"]?.outputs?.value).toBe("FN_FAILED");
    expect(r.outcome).toBe("complete");
  });
});

describe("slot cells", () => {
  const counter = manifest({
    contract: "morphogen.organism.v1",
    key: "organism:counter",
    name: "Counter",
    cells: [
      {
        id: "mem",
        kind: "slot",
        name: "test-counter",
        mode: "read",
        default: 0,
      },
      { id: "bump", kind: "fn", fn: "inc.v1" },
      { id: "sink", kind: "slot", name: "test-counter", mode: "write" },
    ],
    edges: [
      {
        from: { cell: "mem", port: "data" },
        to: { cell: "bump", port: "value" },
      },
      {
        from: { cell: "bump", port: "value" },
        to: { cell: "sink", port: "data" },
      },
    ],
  });

  test("an empty slot emits the declared default; a write persists across runs", async () => {
    const store = new MemoryStore();
    const opts = {
      manifest: counter,
      args: {},
      fns: builtinRegistry(),
      store,
      executors: [],
    };
    const r1 = await runOrganism(opts);
    expect(r1.outcome).toBe("complete");
    expect(r1.cells["mem"]?.outputs?.data).toBe(0); // default
    expect(r1.cells["sink"]?.outputs?.data).toBe(1); // bumped
    expect(r1.cells["mem"]?.slot).toEqual({
      name: "test-counter",
      mode: "read",
    });
    expect(await store.getSlot("test-counter")).toBe(1);

    // a second run in the same store reads what the first wrote
    const r2 = await runOrganism(opts);
    expect(r2.cells["mem"]?.outputs?.data).toBe(1);
    expect(r2.cells["sink"]?.outputs?.data).toBe(2);
  });

  test("a recorded read replays verbatim after the live slot moved on", async () => {
    const store = new MemoryStore();
    const opts = {
      manifest: counter,
      args: {},
      fns: builtinRegistry(),
      store,
      executors: [],
    };
    const r1 = await runOrganism(opts);
    await runOrganism(opts); // slot now holds 2
    await runOrganism(opts); // 3
    // r1 recorded a read of 0; replay must serve 0 even though the slot is 3
    const rep = await verifyReceipt(
      r1 as unknown as JsonValue,
      manifestToJson(counter),
      store,
      builtinRegistry(),
    );
    expect(rep.ok).toBe(true);
    expect(rep.mismatches).toEqual([]);
  });

  test("an empty slot with no default fails INPUT_MISSING, routable", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:slot-miss",
      name: "SlotMiss",
      cells: [
        { id: "mem", kind: "slot", name: "never-written", mode: "read" },
        { id: "recover", kind: "fn", fn: "pick.v1" },
        {
          id: "fname",
          kind: "const",
          outputs: { f: { type: "text", value: "code" } },
        },
      ],
      edges: [
        {
          from: { cell: "mem", port: "data" },
          to: { cell: "recover", port: "record" },
          on: "fail",
        },
        {
          from: { cell: "fname", port: "f" },
          to: { cell: "recover", port: "field" },
        },
      ],
    });
    const store = new MemoryStore();
    const r = await runOrganism({
      manifest: m,
      args: {},
      fns: builtinRegistry(),
      store,
      executors: [],
    });
    expect(r.outcome).toBe("complete");
    expect(r.cells["mem"]?.status).toBe("failed");
    expect(r.cells["mem"]?.failure?.code).toBe("INPUT_MISSING");
    expect(r.cells["recover"]?.outputs?.value).toBe("INPUT_MISSING");
    // and the failed read replays identically even after the slot is filled
    await store.setSlot("never-written", "now-it-exists");
    const rep = await verifyReceipt(
      r as unknown as JsonValue,
      manifestToJson(m),
      store,
      builtinRegistry(),
    );
    expect(rep.ok).toBe(true);
  });

  test("a write-mode slot rejects default at parse time", () => {
    expect(() =>
      manifest({
        contract: "morphogen.organism.v1",
        key: "organism:bad",
        name: "Bad",
        cells: [
          {
            id: "sink",
            kind: "slot",
            name: "x",
            mode: "write",
            default: 0,
          },
        ],
      }),
    ).toThrow("only valid on read-mode");
  });
});

describe("spawn cells", () => {
  const inner = {
    contract: "morphogen.organism.v1",
    key: "organism:spawned",
    name: "Spawned",
    interface: {
      inputs: { v: { cell: "src", port: "v" } },
      outputs: { out: { cell: "echo", port: "value" } },
    },
    cells: [
      { id: "src", kind: "input", outputs: { v: "text" } },
      { id: "echo", kind: "fn", fn: "echo.v1" },
    ],
    edges: [
      { from: { cell: "src", port: "v" }, to: { cell: "echo", port: "value" } },
    ],
  };

  const outer = manifest({
    contract: "morphogen.organism.v1",
    key: "organism:breeder",
    name: "Breeder",
    cells: [
      {
        id: "prog",
        kind: "const",
        outputs: { m: { type: "json", value: inner } },
      },
      {
        id: "in",
        kind: "const",
        outputs: { a: { type: "json", value: { v: "hello" } } },
      },
      { id: "run", kind: "spawn" },
    ],
    edges: [
      {
        from: { cell: "prog", port: "m" },
        to: { cell: "run", port: "manifest" },
      },
      { from: { cell: "in", port: "a" }, to: { cell: "run", port: "args" } },
    ],
  });

  test("a manifest delivered as data is admitted and run; digest is provenance", async () => {
    const store = new MemoryStore();
    const r = await runOrganism({
      manifest: outer,
      args: {},
      fns: builtinRegistry(),
      store,
      executors: [],
    });
    expect(r.outcome).toBe("complete");
    expect(r.cells["run"]?.outputs?.data).toEqual({ out: "hello" });
    const d = r.cells["run"]?.outputs?.digest as string;
    expect(d).toBe(digestCanonical(manifestToJson(parseOrganismManifest(inner))));
    // admitted to CAS — resolvable
    expect(await store.getManifest(d as `sha256:${string}`)).toBeDefined();
    // inner cells recorded under the spawn path
    expect(r.cells["run/src"]?.status).toBe("committed");
    expect(r.cells["run/echo"]?.outputs?.value).toBe("hello");
    // and it replays bit-for-bit — the manifest rides a const, deterministic
    const rep = await verifyReceipt(
      r as unknown as JsonValue,
      manifestToJson(outer),
      store,
      builtinRegistry(),
    );
    expect(rep.ok).toBe(true);
  });

  test("a non-manifest input fails the cell, routable via on:fail", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:badspawn",
      name: "BadSpawn",
      cells: [
        {
          id: "prog",
          kind: "const",
          outputs: { m: { type: "json", value: { not: "a manifest" } } },
        },
        { id: "run", kind: "spawn" },
        { id: "recover", kind: "fn", fn: "pick.v1" },
        {
          id: "fname",
          kind: "const",
          outputs: { f: { type: "text", value: "code" } },
        },
      ],
      edges: [
        {
          from: { cell: "prog", port: "m" },
          to: { cell: "run", port: "manifest" },
        },
        {
          from: { cell: "run", port: "data" },
          to: { cell: "recover", port: "record" },
          on: "fail",
        },
        {
          from: { cell: "fname", port: "f" },
          to: { cell: "recover", port: "field" },
        },
      ],
    });
    const r = await runOrganism({
      manifest: m,
      args: {},
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [],
    });
    expect(r.outcome).toBe("complete");
    expect(r.cells["run"]?.status).toBe("failed");
    expect(r.cells["run"]?.failure?.code).toBe("PARSE_FAILED");
    expect(r.cells["recover"]?.outputs?.value).toBe("PARSE_FAILED");
  });

  test("a spawned organism runs its own effects through the outer executor", async () => {
    const innerAgent = {
      ...inner,
      key: "organism:spawned-agent",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "brain",
          kind: "agent",
          inputs: { v: "text" },
          prompt: "p",
          output: { kind: "text" },
        },
      ],
      edges: [
        {
          from: { cell: "src", port: "v" },
          to: { cell: "brain", port: "v" },
        },
      ],
      interface: {
        inputs: { v: { cell: "src", port: "v" } },
        outputs: { out: { cell: "brain", port: "out" } },
      },
    };
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:breeder2",
      name: "Breeder2",
      cells: [
        {
          id: "prog",
          kind: "const",
          outputs: { m: { type: "json", value: innerAgent } },
        },
        {
          id: "in",
          kind: "const",
          outputs: { a: { type: "json", value: { v: "q" } } },
        },
        { id: "run", kind: "spawn" },
      ],
      edges: [
        {
          from: { cell: "prog", port: "m" },
          to: { cell: "run", port: "manifest" },
        },
        { from: { cell: "in", port: "a" }, to: { cell: "run", port: "args" } },
      ],
    });
    const r = await runOrganism({
      manifest: m,
      args: {},
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [scriptedExecutor({ brain: "spawned-answer" })],
    });
    expect(r.outcome).toBe("complete");
    expect(r.cells["run/brain"]?.outputs?.out).toBe("spawned-answer");
    expect(r.cells["run"]?.outputs?.data).toEqual({ out: "spawned-answer" });
    // the inner effect lands on the outer receipt under the spawn path
    expect(r.effects.length).toBe(1);
  });

  test("a spawned manifest can itself spawn — recursion is depth-bounded", async () => {
    const grandchild = {
      ...inner,
      key: "organism:grandchild",
    };
    const child = {
      contract: "morphogen.organism.v1",
      key: "organism:child",
      name: "Child",
      interface: {
        inputs: { v: { cell: "src", port: "v" } },
        outputs: { out: { cell: "run2", port: "data" } },
      },
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        {
          id: "prog2",
          kind: "const",
          outputs: { m: { type: "json", value: grandchild } },
        },
        {
          id: "in2",
          kind: "const",
          outputs: { a: { type: "json", value: { v: "deep" } } },
        },
        { id: "run2", kind: "spawn" },
      ],
      edges: [
        {
          from: { cell: "prog2", port: "m" },
          to: { cell: "run2", port: "manifest" },
        },
        {
          from: { cell: "in2", port: "a" },
          to: { cell: "run2", port: "args" },
        },
      ],
    };
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:rec",
      name: "Rec",
      cells: [
        {
          id: "prog",
          kind: "const",
          outputs: { m: { type: "json", value: child } },
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
    const r = await runOrganism({
      manifest: m,
      args: {},
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [],
    });
    expect(r.outcome).toBe("complete");
    // grandchild cells recorded three paths deep
    expect(r.cells["run/run2/echo"]?.outputs?.value).toBe("deep");
    expect(r.cells["run"]?.outputs?.data).toEqual({ out: { out: "deep" } });
  });


  test("each over spawn runs a bounded population of generated manifests", async () => {
    const store = new MemoryStore();
    const wrapper = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:spawn-one",
      name: "SpawnOne",
      interface: {
        inputs: { m: { cell: "in", port: "v" } },
        outputs: {
          result: { cell: "run", port: "data" },
          child: { cell: "run", port: "digest" },
        },
      },
      cells: [
        { id: "in", kind: "input", outputs: { v: "json" } },
        { id: "run", kind: "spawn" },
      ],
      edges: [
        {
          from: { cell: "in", port: "v" },
          to: { cell: "run", port: "manifest" },
        },
      ],
    });
    const wd = await store.putManifest(wrapper);
    const cand = (key: string, v: string) => ({
      contract: "morphogen.organism.v1",
      key,
      name: key,
      interface: { outputs: { out: { cell: "emit", port: "v" } } },
      cells: [
        {
          id: "emit",
          kind: "const",
          outputs: { v: { type: "text", value: v } },
        },
      ],
      edges: [],
    });
    const outer = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:hive-t",
      name: "HiveT",
      cells: [
        {
          id: "prog",
          kind: "const",
          outputs: {
            list: {
              type: "json",
              value: [
                cand("organism:cand-a", "alpha"),
                cand("organism:cand-b", "beta"),
              ],
            },
          },
        },
        { id: "map", kind: "each", manifest: wd, over: "m", maxItems: 4 },
      ],
      edges: [
        {
          from: { cell: "prog", port: "list" },
          to: { cell: "map", port: "m" },
        },
      ],
    });
    const r = await runOrganism({
      manifest: outer,
      args: {},
      fns: builtinRegistry(),
      store,
      executors: [],
    });
    expect(r.outcome).toBe("complete");
    expect(r.cells["map"]?.items).toBe(2);
    // population outputs collect in item order; child digests are lineage
    expect(r.cells["map"]?.outputs?.result).toEqual([
      { out: "alpha" },
      { out: "beta" },
    ]);
    const kids = r.cells["map"]?.outputs?.child as string[];
    expect(kids[0]).toMatch(/^sha256:/);
    expect(await store.getManifest(kids[0] as `sha256:${string}`)).toBeDefined();
    // per-item spawned cells record under map/i<n>/run/…
    expect(r.cells["map/i0/run/emit"]?.outputs?.v).toBe("alpha");
    expect(r.cells["map/i1/run/emit"]?.outputs?.v).toBe("beta");
  });


  test("push.v1 appends and rejects non-arrays", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:push-t",
      name: "PushT",
      cells: [
        {
          id: "log",
          kind: "slot",
          name: "push-test",
          mode: "read",
          default: [],
        },
        {
          id: "item",
          kind: "const",
          outputs: { x: { type: "json", value: "new" } },
        },
        { id: "acc", kind: "fn", fn: "push.v1" },
        { id: "sink", kind: "slot", name: "push-test", mode: "write" },
      ],
      edges: [
        { from: { cell: "log", port: "data" }, to: { cell: "acc", port: "list" } },
        { from: { cell: "item", port: "x" }, to: { cell: "acc", port: "item" } },
        { from: { cell: "acc", port: "value" }, to: { cell: "sink", port: "data" } },
      ],
    });
    const store = new MemoryStore();
    const r1 = await runOrganism({
      manifest: m,
      args: {},
      fns: builtinRegistry(),
      store,
      executors: [],
    });
    expect(r1.outcome).toBe("complete");
    expect(r1.cells["sink"]?.outputs?.data).toEqual(["new"]);
    // second run sees the accumulated log
    const r2 = await runOrganism({
      manifest: m,
      args: {},
      fns: builtinRegistry(),
      store,
      executors: [],
    });
    expect(r2.cells["sink"]?.outputs?.data).toEqual(["new", "new"]);
    // non-array list fails FN_FAILED
    const bad = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:push-bad",
      name: "PushBad",
      cells: [
        {
          id: "log",
          kind: "const",
          outputs: { l: { type: "json", value: { not: "a list" } } },
        },
        {
          id: "item",
          kind: "const",
          outputs: { x: { type: "json", value: 1 } },
        },
        { id: "acc", kind: "fn", fn: "push.v1" },
      ],
      edges: [
        { from: { cell: "log", port: "l" }, to: { cell: "acc", port: "list" } },
        { from: { cell: "item", port: "x" }, to: { cell: "acc", port: "item" } },
      ],
    });
    const r3 = await runOrganism({
      manifest: bad,
      args: {},
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [],
    });
    expect(r3.cells["acc"]?.failure?.code).toBe("FN_FAILED");
  });


  test("a spawned manifest naming an unknown fn fails closed — no code injection", async () => {
    const evil = {
      ...inner,
      key: "organism:evil",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        { id: "bad", kind: "fn", fn: "host.shell.exec" },
      ],
      interface: {
        inputs: { v: { cell: "src", port: "v" } },
        outputs: { out: { cell: "bad", port: "value" } },
      },
    };
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:breeder-sec",
      name: "BreederSec",
      cells: [
        {
          id: "prog",
          kind: "const",
          outputs: { m: { type: "json", value: evil } },
        },
        { id: "run", kind: "spawn" },
        { id: "recover", kind: "fn", fn: "pick.v1" },
        {
          id: "fname",
          kind: "const",
          outputs: { f: { type: "text", value: "code" } },
        },
      ],
      edges: [
        {
          from: { cell: "prog", port: "m" },
          to: { cell: "run", port: "manifest" },
        },
        {
          from: { cell: "run", port: "data" },
          to: { cell: "recover", port: "record" },
          on: "fail",
        },
        {
          from: { cell: "fname", port: "f" },
          to: { cell: "recover", port: "field" },
        },
      ],
    });
    const r = await runOrganism({
      manifest: m,
      args: {},
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [],
    });
    expect(r.outcome).toBe("complete");
    expect(r.cells["run"]?.status).toBe("failed");
    expect(r.cells["run"]?.failure?.code).toBe("FN_UNKNOWN");
    expect(r.cells["recover"]?.outputs?.value).toBe("FN_UNKNOWN");
  });

  test("executor results record usage produced by the completed call", async () => {
    const m = manifest({
      contract: "morphogen.organism.v1",
      key: "organism:post-call-usage",
      name: "Post-call usage",
      cells: [{
        id: "answer",
        kind: "agent",
        inputs: {},
        prompt: "Answer.",
        view: { inputs: [] },
        output: { kind: "text" },
      }],
      edges: [],
    });
    const receipt = await runOrganism({
      manifest: m,
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [{
        id: "metered",
        async execute() {
          throw new Error("legacy execute must not run");
        },
        async executeEffect() {
          return {
            output: "ok",
            metadata: {
              executor: "gateway:qwen-flash",
              usage: { model: "alibaba/qwen3.5-flash", tokensIn: 12, tokensOut: 3 },
            },
          };
        },
      }],
    });

    expect(receipt.outcome).toBe("complete");
    expect(receipt.effects[0]?.executor).toBe("gateway:qwen-flash");
    expect(receipt.effects[0]?.usage).toEqual({
      model: "alibaba/qwen3.5-flash",
      tokensIn: 12,
      tokensOut: 3,
    });
    const verified = await verifyReceipt(
      receipt as unknown as JsonValue,
      manifestToJson(m),
      new MemoryStore(),
      builtinRegistry(),
    );
    expect(verified.ok).toBe(true);
  });

});
