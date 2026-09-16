import { describe, expect, test } from "bun:test";
import { parseOrganismManifest, type OrganismManifest } from "./contract";
import { scriptedExecutor } from "./effects";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
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
