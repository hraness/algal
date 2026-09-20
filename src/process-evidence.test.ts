import { describe, expect, test } from "bun:test";
import {
  manifestToJson,
  parseOrganismManifest,
  type OrganismManifest,
} from "./contract";
import { digestCanonical, digestText } from "./digest";
import { AlgalError } from "./errors";
import {
  exportProcessEvidence,
  parseProcessEvidence,
  verifyProcessEvidence,
} from "./process-evidence";
import {
  parseProcessRecord,
  readProcessHistory,
  type ProcessSnapshot,
} from "./process";
import { builtinRegistry } from "./registry";
import { runOrganism, receiptDigest, type RunReceipt } from "./run";
import { compileSource } from "./source";
import { MemoryStore, type Store } from "./store";
import { type ToolRegistry } from "./tools";
import { type JsonValue } from "./values";
const json = (value: unknown): JsonValue => value as JsonValue;
function manifest(cells: unknown[], edges: unknown[] = []): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:evidence",
    name: "Portable evidence",
    cells,
    edges,
  });
}
async function initial(
  store: MemoryStore,
  program: OrganismManifest,
  args = {},
): Promise<ProcessSnapshot> {
  const record = parseProcessRecord({
    contract: "algal.process.v1",
    name: "portable",
    manifestDigest: await store.putManifest(program),
    args,
    maxGenerations: 4,
    generation: 0,
    status: "ready",
    wake: [],
  });
  return { digest: await store.putValue(json(record)), process: record };
}
async function intent(
  store: MemoryStore,
  prior: ProcessSnapshot,
): Promise<ProcessSnapshot> {
  const record = parseProcessRecord({
    ...prior.process,
    previous: prior.digest,
    generation: prior.process.generation + 1,
    status: "uncertain",
    cause: prior.process.status === "ready" ? "start" : "manual",
  });
  return { digest: await store.putValue(json(record)), process: record };
}
async function completion(
  store: MemoryStore,
  dispatched: ProcessSnapshot,
  receipt: RunReceipt,
): Promise<ProcessSnapshot> {
  const wake = [
    ...new Set(
      receipt.effects
        .filter((item) => item.error?.code === "EFFECT_SUSPENDED")
        .flatMap((item) => item.wake ?? []),
    ),
  ].sort();
  const record = parseProcessRecord({
    ...dispatched.process,
    previous: dispatched.digest,
    status: receipt.outcome,
    receipt: await store.putReceipt(json(receipt)),
    wake,
  });
  return { digest: await store.putValue(json(record)), process: record };
}
async function execute(
  store: MemoryStore,
  program: OrganismManifest,
  args = {},
  tools?: ToolRegistry,
) {
  const ready = await initial(store, program, args),
    dispatched = await intent(store, ready);
  const receipt = await runOrganism({
    manifest: program,
    args,
    store,
    fns: builtinRegistry(),
    executors: [],
    ...(tools ? { tools } : {}),
  });
  return {
    snapshot: await completion(store, dispatched, receipt),
    receipt,
    ready,
    dispatched,
  };
}
function frozenSource(store: Store): Store {
  const read = new Set(["getManifest", "getReceipt", "getValue"]);
  return new Proxy(store, {
    get(target, property) {
      if (read.has(String(property)))
        return Reflect.get(target, property).bind(target);
      return () => {
        throw new Error(`source activation forbidden: ${String(property)}`);
      };
    },
  });
}
const simple = () =>
  manifest([
    {
      id: "source",
      kind: "const",
      outputs: { value: { type: "json", value: { answer: 42 } } },
    },
  ]);

describe("portable process evidence", () => {
  test("round trips fixed history without source writes, ambient state or runtime metadata changes", async () => {
    const store = new MemoryStore(),
      { snapshot, receipt } = await execute(store, simple());
    const evidence = await exportProcessEvidence(snapshot, frozenSource(store));
    expect(Object.keys(evidence.records)).toHaveLength(3);
    expect(Object.keys(evidence.receipts)).toHaveLength(1);
    expect(evidence.receipts[snapshot.process.receipt!]!.runtime).toEqual(
      receipt.runtime,
    );
    expect(
      await verifyProcessEvidence(JSON.parse(JSON.stringify(evidence))),
    ).toEqual({
      ok: true,
      digest: snapshot.digest,
      status: "complete",
      generations: 1,
      receipts: 1,
      evidenceDigest: digestCanonical(json(evidence)),
    });
    expect(JSON.stringify(evidence.tools)).not.toContain("configurationDigest");
    expect(JSON.stringify(evidence.tools)).not.toContain("executable");
  });

  test("captures runtime input refs and many refs without scanning digest-looking text", async () => {
    const store = new MemoryStore(),
      a = await store.putValue({ a: 1 }),
      b = await store.putValue({ b: 2 }),
      unrelated = digestText("not a ref");
    const tools: ToolRegistry = new Map([
      [
        "fixture.many.v1",
        {
          signature: {
            inputs: { refs: { type: "ref", many: true } },
            outputs: {},
            effect: "read",
            cost: 1,
            maxOutputBytes: 256,
          },
          tool: async () => ({}),
        },
      ],
    ]);
    const program = manifest(
      [
        {
          id: "input",
          kind: "input",
          outputs: { a: "ref", b: "ref", note: "text" },
        },
        { id: "many", kind: "tool", tool: "fixture.many.v1" },
      ],
      [
        {
          from: { cell: "input", port: "a" },
          to: { cell: "many", port: "refs" },
        },
        {
          from: { cell: "input", port: "b" },
          to: { cell: "many", port: "refs" },
        },
      ],
    );
    const { snapshot, receipt } = await execute(
      store,
      program,
      { input: { a, b, note: unrelated } },
      tools,
    );
    expect(receipt.outcome).toBe("complete");
    const evidence = await exportProcessEvidence(
      snapshot,
      frozenSource(store),
      tools,
    );
    expect(Object.keys(evidence.program.values).sort()).toEqual([a, b].sort());
    expect(evidence.missing.values).toEqual([]);
    expect((await verifyProcessEvidence(evidence)).ok).toBe(true);
    const broken = structuredClone(evidence);
    delete broken.program.values[a];
    await expect(verifyProcessEvidence(broken)).rejects.toThrow();
  });

  test("captures tool-produced refs using signatures only and never invokes supplied callbacks", async () => {
    const store = new MemoryStore(),
      ref = await store.putValue({ from: "tool" });
    let calls = 0;
    const tools: ToolRegistry = new Map([
      [
        "fixture.ref.v1",
        {
          signature: {
            inputs: {},
            outputs: { ref: { type: "ref" } },
            effect: "read",
            cost: 1,
            maxOutputBytes: 256,
          },
          configurationDigest: digestText("private configuration"),
          tool: async () => {
            calls++;
            return { ref };
          },
        },
      ],
    ]);
    const { snapshot } = await execute(
      store,
      manifest(
        [
          { id: "work", kind: "tool", tool: "fixture.ref.v1" },
          { id: "load", kind: "load" },
        ],
        [
          {
            from: { cell: "work", port: "ref" },
            to: { cell: "load", port: "ref" },
          },
        ],
      ),
      {},
      tools,
    );
    expect(calls).toBe(1);
    tools.get("fixture.ref.v1")!.tool = async () => {
      throw new Error("live callback invoked");
    };
    const evidence = await exportProcessEvidence(
      snapshot,
      frozenSource(store),
      tools,
    );
    expect(evidence.program.values[ref]).toEqual({ from: "tool" });
    expect(Object.keys(evidence.tools["fixture.ref.v1"]!)).not.toContain(
      "configurationDigest",
    );
    expect((await verifyProcessEvidence(evidence)).status).toBe("complete");
    expect(calls).toBe(1);
  });

  test("excludes values generated by replay overlay and dynamic spawn manifests", async () => {
    const store = new MemoryStore(),
      child = simple(),
      document = { retained: "as input, not ambient CAS" };
    const program = manifest(
      [
        { id: "data", kind: "input", outputs: { document: "json" } },
        { id: "put", kind: "store" },
        { id: "load", kind: "load" },
        {
          id: "program",
          kind: "const",
          outputs: { value: { type: "json", value: manifestToJson(child) } },
        },
        {
          id: "args",
          kind: "const",
          outputs: { value: { type: "json", value: {} } },
        },
        { id: "child", kind: "spawn" },
      ],
      [
        {
          from: { cell: "data", port: "document" },
          to: { cell: "put", port: "data" },
        },
        {
          from: { cell: "put", port: "ref" },
          to: { cell: "load", port: "ref" },
        },
        {
          from: { cell: "program", port: "value" },
          to: { cell: "child", port: "manifest" },
        },
        {
          from: { cell: "args", port: "value" },
          to: { cell: "child", port: "args" },
        },
      ],
    );
    const { snapshot, receipt } = await execute(store, program, {
      data: { document },
    });
    expect(receipt.outcome).toBe("complete");
    const evidence = await exportProcessEvidence(snapshot, frozenSource(store));
    expect(evidence.program.values[digestCanonical(document)]).toBeUndefined();
    expect(
      evidence.program.manifests[digestCanonical(manifestToJson(child))],
    ).toBeUndefined();
    expect((await verifyProcessEvidence(evidence)).ok).toBe(true);
  });

  test("captures compiled source project module closure through actual reads", async () => {
    const compiled = compileSource(
      'import child from "./child.algal" program root() -> text { budget { max_agent_calls: 0 } return call child using {name: "portable"} }',
      {
        modules: {
          "child.algal":
            "program child(name: text) -> text { budget { max_agent_calls: 0 } return name }",
        },
      },
    );
    const store = new MemoryStore();
    for (const module of compiled.modules) await store.putManifest(module);
    const { snapshot } = await execute(store, compiled.manifest);
    const evidence = await exportProcessEvidence(snapshot, frozenSource(store));
    expect(Object.keys(evidence.program.manifests)).toHaveLength(
      compiled.modules.length + 1,
    );
    expect((await verifyProcessEvidence(evidence)).status).toBe("complete");
  });

  test("declared negative reads replay legitimate failure; undeclared negatives fail closed", async () => {
    const store = new MemoryStore(),
      absent = digestText("absent value");
    const { snapshot, receipt } = await execute(
      store,
      manifest([{ id: "input", kind: "input", outputs: { ref: "ref" } }]),
      { input: { ref: absent } },
    );
    expect(receipt.outcome).toBe("failed");
    const evidence = await exportProcessEvidence(snapshot, frozenSource(store));
    expect(evidence.missing.values).toEqual([absent]);
    expect((await verifyProcessEvidence(evidence)).status).toBe("failed");
    const broken = structuredClone(evidence);
    broken.missing.values = [];
    await expect(verifyProcessEvidence(broken)).rejects.toThrow();
    const overlap = structuredClone(evidence);
    overlap.missing.values = [evidence.head];
    expect(() => parseProcessEvidence(overlap)).toThrow("overlap");
  });

  test("suspended and uncertain heads retain their status without replaying unfinished work", async () => {
    const store = new MemoryStore(),
      tools: ToolRegistry = new Map([
        [
          "fixture.wait.v1",
          {
            signature: {
              inputs: {},
              outputs: {},
              effect: "write",
              cost: 1,
              maxOutputBytes: 256,
            },
            tool: async () => {
              throw new AlgalError("EFFECT_SUSPENDED", "waiting");
            },
          },
        ],
      ]);
    const { snapshot } = await execute(
      store,
      manifest([{ id: "wait", kind: "tool", tool: "fixture.wait.v1" }]),
      {},
      tools,
    );
    expect(
      (
        await verifyProcessEvidence(
          await exportProcessEvidence(snapshot, frozenSource(store), tools),
        )
      ).status,
    ).toBe("suspended");
    const unresolved = await intent(store, snapshot);
    expect(
      await verifyProcessEvidence(
        await exportProcessEvidence(unresolved, frozenSource(store), tools),
      ),
    ).toMatchObject({ status: "uncertain", generations: 2, receipts: 1 });
  });

  test("individually valid receipt cannot rewrite a completed continuation prefix", async () => {
    const store = new MemoryStore();
    let text = "original",
      suspended = true;
    const tools: ToolRegistry = new Map([
      [
        "fixture.prefix.v1",
        {
          signature: {
            inputs: {},
            outputs: { value: { type: "text" } },
            effect: "write",
            cost: 1,
            maxOutputBytes: 256,
          },
          tool: async () => ({ value: text }),
        },
      ],
      [
        "fixture.wait.v1",
        {
          signature: {
            inputs: { value: { type: "text" } },
            outputs: {},
            effect: "write",
            cost: 1,
            maxOutputBytes: 256,
          },
          tool: async () => {
            if (suspended) throw new AlgalError("EFFECT_SUSPENDED", "waiting");
            return {};
          },
        },
      ],
    ]);
    const program = manifest(
      [
        { id: "prefix", kind: "tool", tool: "fixture.prefix.v1" },
        { id: "wait", kind: "tool", tool: "fixture.wait.v1" },
      ],
      [
        {
          from: { cell: "prefix", port: "value" },
          to: { cell: "wait", port: "value" },
        },
      ],
    );
    const { snapshot } = await execute(store, program, {}, tools);
    const next = await intent(store, snapshot);
    text = "forged prefix";
    suspended = false;
    const standalone = await runOrganism({
      manifest: program,
      args: {},
      store,
      fns: builtinRegistry(),
      executors: [],
      tools,
    });
    const forged = await completion(store, next, standalone);
    await expect(
      exportProcessEvidence(forged, frozenSource(store), tools),
    ).rejects.toThrow("continuation changed completed effects");
  });

  test("tampering, unknown fields and malformed counts fail before admission", async () => {
    const store = new MemoryStore(),
      { snapshot } = await execute(store, simple()),
      evidence = await exportProcessEvidence(snapshot, store);
    const changed = structuredClone(evidence);
    changed.records[changed.head]!.name = "tampered";
    expect(() => parseProcessEvidence(changed)).toThrow("digest mismatch");
    expect(() =>
      parseProcessEvidence({ ...evidence, executable: "/bin/sh" }),
    ).toThrow("unknown key");
    const shorthand = structuredClone(evidence);
    (
      shorthand.tools["mailbox.send.v1"]!.outputs as unknown as Record<
        string,
        unknown
      >
    ).id = "text";
    expect((await verifyProcessEvidence(shorthand)).evidenceDigest).toBe(
      digestCanonical(json(shorthand)),
    );
    const excessive = structuredClone(evidence);
    excessive.missing.values = Array.from({ length: 513 }, (_, i) =>
      digestText(String(i)),
    ).sort();
    expect(() => parseProcessEvidence(excessive)).toThrow();
    let nested: unknown = {};
    for (let i = 0; i < 66; i++) nested = { nested };
    expect(() => parseProcessEvidence(nested)).toThrow("structure bound");
    await expect(verifyProcessEvidence(nested)).rejects.toThrow("structure bound");
    const extra = structuredClone(evidence),
      value = { harmless: true },
      key = digestCanonical(value);
    extra.program.values[key] = value;
    expect((await verifyProcessEvidence(extra)).ok).toBe(true);
    const orphan = structuredClone(
      evidence.receipts[snapshot.process.receipt!]!,
    );
    orphan.runtime.version = "unreferenced-history";
    orphan.digest = receiptDigest(orphan);
    extra.receipts[digestCanonical(json(orphan))] = orphan;
    await expect(verifyProcessEvidence(extra)).rejects.toThrow(
      "exactly match the retained history",
    );
  });

  test("ready heads require builtin functions and complete static closure", async () => {
    const store = new MemoryStore(),
      ready = await initial(
        store,
        manifest([{ id: "custom", kind: "fn", fn: "custom.private.v1" }]),
      );
    await expect(exportProcessEvidence(ready, store)).rejects.toThrow();
    const child = simple(),
      absent = digestCanonical(manifestToJson(child));
    const missingReady = await initial(
      store,
      manifest([{ id: "child", kind: "organism", manifest: absent }]),
    );
    await expect(exportProcessEvidence(missingReady, store)).rejects.toThrow();
    expect(await readProcessHistory(ready, store)).toHaveLength(1);
  });
  test("an undeclared dependency poisons verification even when replay reproduces its error receipt", async () => {
    const store = new MemoryStore(),
      absent = digestText("undeclared"),
      program = manifest([
        { id: "input", kind: "input", outputs: { ref: "ref" } },
      ]),
      args = { input: { ref: absent } };
    const ready = await initial(store, program, args),
      dispatched = await intent(store, ready);
    const source = new Proxy(store, {
      get(target, property) {
        if (property === "getValue")
          return async () => {
            throw new AlgalError(
              "STORE_MISS",
              "process evidence lacks a declared dependency",
            );
          };
        return Reflect.get(target, property).bind(target);
      },
    });
    const receipt = await runOrganism({
      manifest: program,
      args,
      store: source,
      fns: builtinRegistry(),
      executors: [],
    });
    const finished = await completion(store, dispatched, receipt);
    const evidence = {
      contract: "algal.process-evidence.v1",
      head: finished.digest,
      records: Object.fromEntries(
        [ready, dispatched, finished].map((item) => [
          item.digest,
          item.process,
        ]),
      ),
      receipts: { [finished.process.receipt!]: receipt },
      program: {
        contract: "algal.bundle.v1",
        root: ready.process.manifestDigest,
        manifests: { [ready.process.manifestDigest]: manifestToJson(program) },
        values: {},
      },
      tools: {},
      missing: { manifests: [], values: [] },
    };
    expect(receipt.outcome).toBe("failed");
    await expect(verifyProcessEvidence(evidence)).rejects.toThrow(
      "accessed an undeclared dependency",
    );
  });

  test("verification snapshots foreign input before its first asynchronous read", async () => {
    const store = new MemoryStore(),
      { snapshot } = await execute(store, simple()),
      evidence = await exportProcessEvidence(snapshot, store),
      originalDigest = digestCanonical(json(evidence));
    const pending = verifyProcessEvidence(evidence);
    evidence.records[evidence.head]!.name = "concurrent mutation";
    evidence.program.manifests = {};
    expect((await pending).evidenceDigest).toBe(originalDigest);
  });
  test("verification bounds a foreign object's materialized snapshot before replay", async () => {
    const store = new MemoryStore(),
      { snapshot } = await execute(store, simple()),
      evidence = await exportProcessEvidence(snapshot, store);
    let nested: unknown = {};
    for (let i = 0; i < 66; i++) nested = { nested };
    let reads = 0;
    // The original checks read tools three times (structure, JSON validity and
    // canonicalization). structuredClone then materializes this fourth value.
    Object.defineProperty(evidence, "tools", {
      enumerable: true,
      get: () => ++reads <= 3 ? {} : nested,
    });
    await expect(verifyProcessEvidence(evidence)).rejects.toMatchObject({
      code: "BUDGET_EXHAUSTED",
    });
  });

  test("export bounds foreign snapshot structure before cloning or recursive hashing", async () => {
    const store = new MemoryStore(),
      { snapshot } = await execute(store, simple());
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    await expect(
      exportProcessEvidence(
        {
          ...snapshot,
          process: cyclic as unknown as ProcessSnapshot["process"],
        },
        frozenSource(store),
      ),
    ).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    await expect(
      exportProcessEvidence(
        { ...snapshot, digest: digestText("wrong snapshot") },
        frozenSource(store),
      ),
    ).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });
});
