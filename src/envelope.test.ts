import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { parseOrganismManifest, manifestToJson, type OrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import {
  AUTHORITY_ENVELOPE_BOUNDS,
  AUTHORITY_ENVELOPE_CONTRACT,
  createAuthorityEnvelope,
  parseAuthorityEnvelope,
  renderAuthorityEnvelope,
} from "./envelope";
import { MemoryMailboxService, mailboxToolRegistry } from "./mailbox";
import { MemoryStore } from "./store-memory";
import { canonicalize, type JsonValue } from "./values";

const mailboxTools = () => mailboxToolRegistry(new MemoryMailboxService());

const parse = (value: JsonValue) => parseOrganismManifest(value);

const minimalManifest = (): OrganismManifest => parse({
  contract: "algal.organism.v1",
  key: "organism:env-min",
  name: "Minimal echo organism",
  cells: [
    { id: "input", kind: "input", outputs: { value: "text" } },
    { id: "echo", kind: "fn", fn: "echo.v1" },
  ],
  edges: [
    { from: { cell: "input", port: "value" }, to: { cell: "echo", port: "value" } },
  ],
});

const withManifests = async (children: OrganismManifest[]) => {
  const store = new MemoryStore();
  for (const child of children) await store.putManifest(child);
  return store;
};

describe("authority envelope", () => {
  test("closed manifest reports an exact static structure", async () => {
    const report = await createAuthorityEnvelope(minimalManifest());
    expect(report.contract).toBe(AUTHORITY_ENVELOPE_CONTRACT);
    expect(report.basis).toBe("static-structure");
    expect(report.root.key).toBe("organism:env-min");
    expect(report.counts).toEqual({
      modules: 1, occurrences: 1, cells: 2, spawnCells: 0,
      capabilities: 0, functions: 1, tools: 0, slots: 0,
    });
    expect(report.closure.closed).toBe(true);
    expect(report.closure.cells).toEqual([]);
    expect(report.capabilities).toEqual([]);
    expect(report.functions).toEqual([
      { ref: "echo.v1", cost: 10, uses: [{ path: [], cell: "echo", via: "cell" }] },
    ]);
    // Per-cell worst case: activation 100 + echo.v1's declared cost 10.
    const module = report.modules[0]!;
    expect(module.selfWork).toEqual({ steps: 2, agentCalls: 0, units: 210 });
    expect(module.cells).toEqual([
      { id: "input", kind: "input", units: 100, agentCalls: 0 },
      { id: "echo", kind: "fn", units: 110, agentCalls: 0, fn: "echo.v1" },
    ]);
    expect(report.occurrences).toHaveLength(1);
    expect(report.occurrences[0]).toMatchObject({
      path: [], depth: 0, runnable: true,
      invocations: { min: 1, max: 1 },
      work: { steps: 2, agentCalls: 0, units: 210 },
    });
    // Structural bound is far below default budgets — bound equals structural.
    expect(report.work.steps).toEqual({ structural: 2, bound: 2 });
    expect(report.work.agentCalls).toEqual({ structural: 0, bound: 0 });
    expect(report.work.units).toEqual({ structural: 210, bound: 210 });
    expect(report.work.activationCeiling).toBe(110);
    // Full determinism: serializing twice is identical.
    expect(canonicalize(report as unknown as JsonValue)).toBe(
      canonicalize(await createAuthorityEnvelope(minimalManifest()) as unknown as JsonValue),
    );
  });

  test("a capability wired to a tool cell reports can", async () => {
    const child = parse({
      contract: "algal.organism.v1",
      key: "organism:env-child",
      name: "Child that publishes",
      interface: {
        inputs: { outbox: { cell: "in", port: "mb" } },
        outputs: { receipt: { cell: "send", port: "id" } },
      },
      cells: [
        { id: "in", kind: "input", outputs: { mb: { type: "cap", capability: "mailbox-send" } } },
        { id: "send", kind: "tool", tool: "mailbox.send.v1" },
      ],
      edges: [
        { from: { cell: "in", port: "mb" }, to: { cell: "send", port: "mailbox" } },
      ],
    });
    const store = await withManifests([child]);
    const parent = parse({
      contract: "algal.organism.v1",
      key: "organism:env-parent",
      name: "Parent delegating publish",
      cells: [
        { id: "caps", kind: "input", outputs: { mb: { type: "cap", capability: "mailbox-send" } } },
        { id: "run", kind: "organism", manifest: digestCanonical(manifestToJson(child)) },
      ],
      edges: [
        { from: { cell: "caps", port: "mb" }, to: { cell: "run", port: "outbox" } },
      ],
    });
    const report = await createAuthorityEnvelope(parent, { store, tools: mailboxTools() });
    const send = report.capabilities.find(c => c.class === "mailbox-send")!;
    expect(send.verdict).toBe("can");
    // The whole delegation chain is listed: root arg → organism port → child
    // input → tool input.
    expect(send.producers).toEqual([
      { path: [], cell: "caps", port: "mb", role: "args", live: true },
      { path: ["run"], cell: "in", port: "mb", role: "args", interface: ["outbox"], live: true },
    ]);
    expect(send.consumers).toEqual([
      {
        path: [], cell: "run", port: "outbox", use: "delegated", fed: true,
        feeds: [{ cell: "caps", port: "mb", live: true }],
      },
      {
        path: ["run"], cell: "send", port: "mailbox", use: "tool", fed: true,
        feeds: [{ cell: "in", port: "mb", live: true }],
      },
    ]);
    const occurrence = report.occurrences.find(o => o.path.join("/") === "run")!;
    expect(occurrence.caller).toMatchObject({ cellId: "run", kind: "organism" });
    expect(occurrence.invocations).toEqual({ min: 1, max: 1 });
    expect(report.tools.find(t => t.ref === "mailbox.send.v1")).toMatchObject({
      effect: "write", cost: 100, maxOutputBytes: 256,
      uses: [{ path: ["run"], cell: "send", via: "cell" }],
    });
  });

  test("a declared capability never reaching a consuming port reports cannot", async () => {
    const manifest = parse({
      contract: "algal.organism.v1",
      key: "organism:env-shielded",
      name: "Declares a capability it cannot use",
      cells: [
        { id: "caps", kind: "input", outputs: { mb: { type: "cap", capability: "mailbox-send" } } },
        { id: "see", kind: "expr",
          inputs: { mb: { type: "cap", capability: "mailbox-send" } },
          expr: { contract: "algal.expr.v1", program: "seen" },
          output: { kind: "text" } },
      ],
      edges: [
        { from: { cell: "caps", port: "mb" }, to: { cell: "see", port: "mb" } },
      ],
    });
    const report = await createAuthorityEnvelope(manifest, {
      tools: mailboxTools(),
      capabilities: ["mailbox-send", "mailbox-receive", "vault-key"],
    });
    const send = report.capabilities.find(c => c.class === "mailbox-send")!;
    // The handle reaches an expr as data — data can be copied, never exercised.
    expect(send.verdict).toBe("cannot");
    expect(send.consumers).toEqual([
      {
        path: [], cell: "see", port: "mb", use: "data", fed: true,
        feeds: [{ cell: "caps", port: "mb", live: true }],
      },
    ]);
    // Queried classes are answered even when undeclared.
    expect(report.capabilities.find(c => c.class === "mailbox-receive")).toMatchObject({
      verdict: "cannot", producers: [], consumers: [],
    });
    expect(report.capabilities.find(c => c.class === "vault-key")).toMatchObject({
      verdict: "cannot", producers: [], consumers: [],
    });
  });

  test("a model-declared tool is a can channel — supply is context data", async () => {
    const manifest = parse({
      contract: "algal.organism.v1",
      key: "organism:env-agent",
      name: "Agent with a declared publishing tool",
      cells: [
        { id: "in", kind: "input", outputs: { brief: "text" } },
        {
          id: "writer", kind: "agent",
          inputs: { brief: "text" },
          prompt: "Publish the brief.",
          view: { inputs: "*" },
          tools: ["mailbox.send.v1"],
          output: { kind: "text" },
        },
      ],
      edges: [
        { from: { cell: "in", port: "brief" }, to: { cell: "writer", port: "brief" } },
      ],
    });
    const report = await createAuthorityEnvelope(manifest, { tools: mailboxTools() });
    const send = report.capabilities.find(c => c.class === "mailbox-send")!;
    expect(send.verdict).toBe("can");
    expect(send.consumers).toEqual([
      { path: [], cell: "writer", port: "mailbox", use: "model", tool: "mailbox.send.v1", fed: true },
    ]);
    expect(report.tools.find(t => t.ref === "mailbox.send.v1")!.uses).toEqual([
      { path: [], cell: "writer", via: "model" },
    ]);
  });

  test("repeat and each compose invocation bounds", async () => {
    const leaf = parse({
      contract: "algal.organism.v1",
      key: "organism:env-leaf",
      name: "Leaf",
      interface: {
        inputs: { item: { cell: "in", port: "v" } },
        outputs: { v: { cell: "in", port: "v" } },
      },
      cells: [{ id: "in", kind: "input", outputs: { v: "json" } }],
      edges: [],
    });
    const mid = parse({
      contract: "algal.organism.v1",
      key: "organism:env-mid",
      name: "Each over leaf",
      interface: {
        inputs: { item: { cell: "in", port: "v" } },
        outputs: { v: { cell: "row", port: "v" } },
      },
      cells: [
        { id: "in", kind: "input", outputs: { v: "json" } },
        { id: "xs", kind: "const", outputs: { list: { type: "json", value: [0, 1] } } },
        { id: "row", kind: "each", manifest: digestCanonical(manifestToJson(leaf)), over: "item", maxItems: 8 },
      ],
      edges: [
        { from: { cell: "xs", port: "list" }, to: { cell: "row", port: "item" } },
      ],
    });
    const loop = parse({
      contract: "algal.organism.v1",
      key: "organism:env-loop",
      name: "Repeat inner",
      interface: {
        inputs: { draft: { cell: "in", port: "v" } },
        outputs: { draft: { cell: "in", port: "v" } },
      },
      cells: [{ id: "in", kind: "input", outputs: { v: "text" } }],
      edges: [],
    });
    const store = await withManifests([leaf, mid, loop]);
    const root = parse({
      contract: "algal.organism.v1",
      key: "organism:env-root",
      name: "Composition root",
      cells: [
        { id: "seed", kind: "input", outputs: { v: "text", xs: "json" } },
        { id: "loop", kind: "repeat", manifest: digestCanonical(manifestToJson(loop)), maxRounds: 4 },
        { id: "batch", kind: "each", manifest: digestCanonical(manifestToJson(mid)), over: "item", maxItems: 6 },
      ],
      edges: [
        { from: { cell: "seed", port: "v" }, to: { cell: "loop", port: "draft" } },
        { from: { cell: "seed", port: "xs" }, to: { cell: "batch", port: "item" } },
      ],
    });
    const report = await createAuthorityEnvelope(root, { store });
    expect(report.counts).toMatchObject({ modules: 4, occurrences: 4 });
    const byPath = (path: string) => report.occurrences.find(o => o.path.join("/") === path)!;
    // repeat runs at least once per activation; each can run zero items.
    expect(byPath("loop").invocations).toEqual({ min: 1, max: 4 });
    expect(byPath("batch").invocations).toEqual({ min: 0, max: 6 });
    // Nested occurrence under each: item-bound × the parent's own bound.
    const nested = byPath("batch/row");
    expect(nested.caller).toMatchObject({ cellId: "row", kind: "each", maxItems: 8 });
    expect(nested.invocations).toEqual({ min: 0, max: 48 });
    // Work composes per invocation: leaf self work 100 × 48.
    expect(nested.work.steps).toBe(48);
    expect(nested.work.units).toBe(4800);
    // root's 3 cells + 4×(loop's 1) + 6×(mid's 3 + 8×leaf's 1)
    expect(report.work.steps.bound).toBe(
      3 + 4 * 1 + 6 * (3 + 8 * 1),
    );
  });

  test("invocation products saturate at the documented cap", async () => {
    const leaf = parse({
      contract: "algal.organism.v1",
      key: "organism:env-sat-leaf",
      name: "Leaf",
      interface: {
        inputs: { item: { cell: "in", port: "v" } },
        outputs: { v: { cell: "in", port: "v" } },
      },
      cells: [{ id: "in", kind: "input", outputs: { v: "json" } }],
      edges: [],
    });
    const eachLevel = (key: string, child: OrganismManifest): OrganismManifest => parse({
      contract: "algal.organism.v1",
      key: `organism:env-sat-${key}`,
      name: `Level ${key}`,
      interface: {
        inputs: { item: { cell: "in", port: "v" } },
        outputs: { v: { cell: "each", port: "v" } },
      },
      cells: [
        { id: "in", kind: "input", outputs: { v: "json" } },
        { id: "xs", kind: "const", outputs: { list: { type: "json", value: [0] } } },
        { id: "each", kind: "each", manifest: digestCanonical(manifestToJson(child)), over: "item", maxItems: 64 },
      ],
      edges: [{ from: { cell: "xs", port: "list" }, to: { cell: "each", port: "item" } }],
    });
    const m2 = eachLevel("m2", leaf);
    const m1 = eachLevel("m1", m2);
    const store = await withManifests([leaf, m1, m2]);
    const root = parse({
      contract: "algal.organism.v1",
      key: "organism:env-sat-root",
      name: "Saturation root",
      cells: [
        { id: "xs", kind: "const", outputs: { list: { type: "json", value: [0] } } },
        { id: "e1", kind: "each", manifest: digestCanonical(manifestToJson(m1)), over: "item", maxItems: 64 },
      ],
      edges: [{ from: { cell: "xs", port: "list" }, to: { cell: "e1", port: "item" } }],
    });
    const report = await createAuthorityEnvelope(root, { store });
    const byPath = (path: string) => report.occurrences.find(o => o.path.join("/") === path)!;
    // 64³ = 262144 exceeds the 65536 occurrence-product cap.
    expect(byPath("e1").invocations.max).toBe(64);
    expect(byPath("e1/each").invocations.max).toBe(64 * 64);
    const deepest = byPath("e1/each/each");
    expect(deepest.invocations).toEqual({
      min: 0, max: AUTHORITY_ENVELOPE_BOUNDS.maxInvocations, saturated: true,
    });
    expect(report.work.steps.saturated).toBe(true);
    expect(report.work.units.saturated).toBe(true);
  });

  test("a wired spawn cell opens the closure and marks consumable classes unknown", async () => {
    const manifest = parse({
      contract: "algal.organism.v1",
      key: "organism:env-spawn",
      name: "Program that can run emitted manifests",
      cells: [
        { id: "in", kind: "input", outputs: { spec: "json" } },
        { id: "breed", kind: "spawn" },
      ],
      edges: [
        { from: { cell: "in", port: "spec" }, to: { cell: "breed", port: "manifest" } },
      ],
    });
    const report = await createAuthorityEnvelope(manifest, {
      tools: mailboxTools(),
      capabilities: ["mailbox-send", "vault-key"],
    });
    expect(report.closure.closed).toBe(false);
    expect(report.closure.cells).toEqual([
      { path: [], cell: "breed", kind: "spawn", possible: true },
    ]);
    // mailbox-send is consumable by the admitted registry — spawned content
    // could exercise it given a handle embedded in args data.
    expect(report.capabilities.find(c => c.class === "mailbox-send")!.verdict).toBe("unknown");
    // No admitted signature consumes vault-key — even spawned content cannot.
    expect(report.capabilities.find(c => c.class === "vault-key")!.verdict).toBe("cannot");
    for (const bound of [report.work.steps, report.work.agentCalls, report.work.units]) {
      expect(bound.open).toBe(true);
      // Under an open closure the bound is the ceiling the runtime enforces.
      expect(bound.bound).toBeGreaterThan(bound.structural);
    }
    expect(report.work.activationCeiling).toBeGreaterThan(262144);
  });

  test("an unwired spawn cell is recorded but never possible", async () => {
    const manifest = parse({
      contract: "algal.organism.v1",
      key: "organism:env-spawn-dead",
      name: "Spawn without a manifest feed",
      cells: [
        { id: "in", kind: "input", outputs: { v: "text" } },
        { id: "breed", kind: "spawn" },
      ],
      edges: [],
    });
    const report = await createAuthorityEnvelope(manifest, { tools: mailboxTools() });
    expect(report.closure.cells[0]).toMatchObject({ cell: "breed", possible: false });
    expect(report.closure.closed).toBe(true);
    expect(report.capabilities.find(c => c.class === "mailbox-send")?.verdict ?? "absent").toBe("absent");
  });

  test("occurrences deeper than maxDepth are reported but not runnable", async () => {
    const leaf = parse({
      contract: "algal.organism.v1",
      key: "organism:env-deep-leaf",
      name: "Leaf",
      interface: {
        inputs: { v: { cell: "in", port: "v" } },
        outputs: { v: { cell: "in", port: "v" } },
      },
      cells: [{ id: "in", kind: "input", outputs: { v: "text" } }],
      edges: [],
    });
    const mid = parse({
      contract: "algal.organism.v1",
      key: "organism:env-deep-mid",
      name: "Mid",
      interface: {
        inputs: { v: { cell: "in", port: "v" } },
        outputs: { v: { cell: "call", port: "v" } },
      },
      cells: [
        { id: "in", kind: "input", outputs: { v: "text" } },
        { id: "call", kind: "organism", manifest: digestCanonical(manifestToJson(leaf)) },
      ],
      edges: [{ from: { cell: "in", port: "v" }, to: { cell: "call", port: "v" } }],
    });
    const store = await withManifests([leaf, mid]);
    const root = parse({
      contract: "algal.organism.v1",
      key: "organism:env-deep-root",
      name: "Root at the depth edge",
      budgets: { maxDepth: 1 },
      cells: [
        { id: "in", kind: "input", outputs: { v: "text" } },
        { id: "call", kind: "organism", manifest: digestCanonical(manifestToJson(mid)) },
      ],
      edges: [{ from: { cell: "in", port: "v" }, to: { cell: "call", port: "v" } }],
    });
    const report = await createAuthorityEnvelope(root, { store });
    const deep = report.occurrences.find(o => o.path.join("/") === "call/call")!;
    expect(deep.runnable).toBe(false);
    // Structural composition is still reported; no work accrues from it.
    expect(report.work.steps.bound).toBe(2 + 2); // root cells + mid's own cells
    const leafModule = report.modules.find(m => m.key === "organism:env-deep-leaf")!;
    expect(leafModule.selfWork.steps).toBe(1);
  });

  test("reports are bounded, canonical, and round-trip through the parser", async () => {
    const report = await createAuthorityEnvelope(minimalManifest());
    const parsed = parseAuthorityEnvelope(JSON.parse(canonicalize(report as unknown as JsonValue)));
    expect(canonicalize(parsed as unknown as JsonValue)).toBe(
      canonicalize(report as unknown as JsonValue),
    );
    // The renderer admits only envelopes this module produced or parsed.
    expect(renderAuthorityEnvelope(parsed)).toContain("organism:env-min");
    expect(renderAuthorityEnvelope(report)).toContain("Work per root invocation");
    expect(() => renderAuthorityEnvelope(JSON.parse(canonicalize(report as unknown as JsonValue)))).toThrow(/created by createAuthorityEnvelope or parseAuthorityEnvelope/);
  });

  test("parser rejects foreign, malformed, and oversized reports", async () => {
    expect(() => parseAuthorityEnvelope(null)).toThrow();
    expect(() => parseAuthorityEnvelope({ contract: "algal.authority-envelope.v2" })).toThrow(/contract must be/);
    const report = JSON.parse(canonicalize(await createAuthorityEnvelope(minimalManifest()) as unknown as JsonValue)) as Record<string, unknown>;
    expect(() => parseAuthorityEnvelope({ ...report, stray: 1 })).toThrow(/unknown key/);
    expect(() => parseAuthorityEnvelope({ ...report, contract: "other.v1" })).toThrow(/contract must be/);
    // An unbounded producer list is refused at the declared bound.
    expect(() => parseAuthorityEnvelope({
      ...report,
      capabilities: Array.from({ length: AUTHORITY_ENVELOPE_BOUNDS.maxCapabilities + 1 }, (_, i) => ({
        class: `cls-${i}`, verdict: "cannot", producers: [], consumers: [],
      })),
    })).toThrow(/exceeds/);
    // A malformed capability class inside the list is rejected.
    expect(() => parseAuthorityEnvelope({
      ...report,
      capabilities: [{ class: "Not Ke  y", verdict: "cannot", producers: [], consumers: [] }],
    })).toThrow();
  });

  test("a missing child digest fails like check does", async () => {
    const parent = parse({
      contract: "algal.organism.v1",
      key: "organism:env-missing",
      name: "References an absent child",
      cells: [
        { id: "in", kind: "input", outputs: { v: "text" } },
        { id: "call", kind: "organism", manifest: "sha256:" + "0".repeat(64) },
      ],
      edges: [],
    });
    await expect(createAuthorityEnvelope(parent)).rejects.toThrow(/STORE_MISS|not in store/);
  });

  test("capability query classes are validated", async () => {
    await expect(createAuthorityEnvelope(minimalManifest(), { capabilities: ["Not-A-Class"] })).rejects.toThrow(/lowercase kebab-case/);
    const tooMany = Array.from({ length: AUTHORITY_ENVELOPE_BOUNDS.maxQueries + 1 }, (_, i) => `cls-${i}`);
    await expect(createAuthorityEnvelope(minimalManifest(), { capabilities: tooMany })).rejects.toThrow(/exceeds/);
  });

  test("release-review example: send can, channels traced through the child", async () => {
    const parent = parseOrganismManifest(JSON.parse(await readFile("examples/vm/release-review.algal.json", "utf8")));
    const child = parseOrganismManifest(JSON.parse(await readFile("examples/vm/approval-wait.algal.json", "utf8")));
    const store = await withManifests([child]);
    const report = await createAuthorityEnvelope(parent, { store, tools: mailboxTools() });
    expect(report.counts.modules).toBe(2);
    for (const cls of ["mailbox-send", "mailbox-receive"]) {
      expect(report.capabilities.find(c => c.class === cls)!.verdict).toBe("can");
    }
    // The receive capability is exercised inside the approval-wait child.
    const receive = report.capabilities.find(c => c.class === "mailbox-receive")!;
    expect(receive.consumers.find(c => c.use === "tool")).toMatchObject({
      path: ["wait"], cell: "receive", port: "mailbox", fed: true,
    });
    // The delegated input records its interface name.
    expect(receive.producers.find(p => p.role === "args" && p.path.length === 1)).toMatchObject({
      path: ["wait"], cell: "input", port: "inbox", interface: ["inbox"], live: true,
    });
    const text = renderAuthorityEnvelope(report);
    expect(text).toContain("mailbox-send: can");
    expect(text).toContain("mailbox-receive: can");
    expect(text).toContain("organism:vm-approval-wait");
  });
});
