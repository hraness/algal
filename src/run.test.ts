import { describe, expect, test } from "bun:test";
import { parseOrganismManifest, type OrganismManifest } from "./contract";
import { scriptedExecutor } from "./effects";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";

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
