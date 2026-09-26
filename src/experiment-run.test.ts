import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { scriptedExecutor } from "./effects";
import {
  EXPERIMENT_CATALOG_CONTRACT,
  EXPERIMENT_RUN_CONTRACT,
  parseExperimentArm,
  parseExperimentCatalog,
  parseExperimentRun,
  parseExperimentSession,
  parseExperimentTaskSet,
  runExperimentArm,
  type ExperimentArm,
  type ExperimentTask,
} from "./experiment-run";
import { parseHabitatBudget, type HabitatBudget } from "./habitat-budget";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import type { JsonValue } from "./values";

/** The "kept procedure": echoes its `record` interface input into `label`. */
const kept = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:triage-echo",
  name: "Triage echo",
  interface: {
    inputs: { record: { cell: "src", port: "value" } },
    outputs: { label: { cell: "echo", port: "value" } },
  },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "echo", kind: "fn", fn: "echo.v1" },
  ],
  edges: [
    { from: { cell: "src", port: "value" }, to: { cell: "echo", port: "value" } },
  ],
});

const keptDigest = digestCanonical(manifestToJson(kept));

/** The generator: one agent call emits the task's manifest. Scripted responses
 * serve it `kept`, so generation is deterministic and free. */
const generator = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:task-generator",
  name: "Task generator",
  interface: {
    inputs: { task: { cell: "spec", port: "value" } },
    outputs: { manifest: { cell: "writer", port: "out" } },
  },
  cells: [
    { id: "spec", kind: "input", outputs: { value: "json" } },
    {
      id: "writer",
      kind: "agent",
      inputs: { task: "json" },
      prompt: "Emit a manifest that triages the task's records.",
      view: { inputs: ["task"] },
      output: { kind: "json", schema: { type: "object" } },
    },
  ],
  edges: [
    { from: { cell: "spec", port: "value" }, to: { cell: "writer", port: "task" } },
  ],
});

const tasks: ExperimentTask[] = [
  { taskId: "task-one", phase: "acquisition", spec: { family: "triage" }, args: { record: "a" } },
  { taskId: "task-two", phase: "unseen", spec: { family: "triage" }, args: { record: "b" } },
  { taskId: "task-three", phase: "shift", spec: { family: "triage" }, args: { record: "c" } },
];

const budget = { work: 4_000_000_000, attempts: 256, runs: 256 };

const promotionCases = [
  { id: "train-a", split: "train" as const, args: { record: "a" }, expect: { label: "a" } },
  { id: "validation-b", split: "validation" as const, args: { record: "b" }, expect: { label: "b" } },
  // Declared so the foundry admission passes; the promote hook never runs it.
  { id: "holdout-c", split: "holdout" as const, args: { record: "c" }, expect: { label: "c" } },
];

const arm = (over: Record<string, unknown>): ExperimentArm =>
  parseExperimentArm({
    contract: "algal.experiment-arm.v1",
    family: "triage",
    budget,
    ...over,
  });

const generating = {
  generator: { manifest: manifestToJson(generator), output: "manifest" },
};

const responses = { writer: manifestToJson(kept) as JsonValue };

function fixture(over: Record<string, unknown>, taskList = tasks) {
  const store = new MemoryStore();
  return {
    store,
    run: (catalog?: Parameters<typeof runExperimentArm>[0]["catalog"]) =>
      runExperimentArm({
        arm: arm(over),
        tasks: taskList,
        fns: builtinRegistry(),
        store,
        executors: [scriptedExecutor(responses)],
        ...(catalog ? { catalog } : {}),
      }),
  };
}

async function budgetOf(store: MemoryStore, digest: Digest): Promise<HabitatBudget> {
  return parseHabitatBudget((await store.getValue(digest))!);
}

describe("experiment arm runner", () => {
  test("retained consults the catalog, promotes passing programs, and reuses them on later tasks", async () => {
    const { store, run } = fixture({ arm: "retained", ...generating, cases: promotionCases });
    const result = await run();

    expect(result.session.outcome).toBe("complete");
    expect(result.session.arm).toBe("retained");
    expect(result.runs).toHaveLength(3);

    // Task one missed an empty catalog: it generated, ran, and promoted.
    const first = result.runs[0]!;
    expect(first.consult).toEqual({ outcome: "miss", entry: null, manifest: null });
    expect(first.generator).not.toBeNull();
    expect(first.manifest).toBe(keptDigest);
    expect(first.outcome).toBe("complete");
    expect(first.receipt).not.toBeNull();
    expect(first.promote).not.toBeNull();
    expect(first.promote!.evaluated).toBe(true);
    expect(first.promote!.promoted).toBe(true);
    expect(first.promote!.entry).toBe(0);
    expect(first.promote!.validation).toEqual({ passed: 1, total: 1 });

    // Task two consulted the kept procedure and ran it again — same manifest
    // digest, resolved through the store, with no generation run.
    const second = result.runs[1]!;
    expect(second.consult.outcome).toBe("hit");
    expect(second.consult.entry).toBe(0);
    expect(second.consult.manifest).toBe(keptDigest);
    expect(second.manifest).toBe(keptDigest);
    expect(second.generator).toBeNull();
    expect(second.receipt).not.toBeNull();
    // The hit was evaluated too but did not duplicate the entry.
    expect(second.promote!.evaluated).toBe(true);
    expect(second.promote!.promoted).toBe(false);

    const third = result.runs[2]!;
    expect(third.consult.outcome).toBe("hit");
    expect(third.manifest).toBe(keptDigest);

    // The catalog keeps exactly one entry, promoted by the first task.
    expect(result.catalog.contract).toBe(EXPERIMENT_CATALOG_CONTRACT);
    expect(result.catalog.entries).toHaveLength(1);
    const entry = result.catalog.entries[0]!;
    expect(entry.family).toBe("triage");
    expect(entry.manifest).toBe(keptDigest);
    expect(entry.interfaceDigest).not.toBeNull();
    expect(entry.cases).toEqual([
      { id: "train-a", split: "train" },
      { id: "validation-b", split: "validation" },
    ]);
    expect(entry.taskId).toBe("task-one");
    expect(entry.report).not.toBeNull();

    // The account charged every run: task one generated + ran + evaluated two
    // cases; later tasks ran + evaluated two cases each. Holdout never ran.
    const account = await budgetOf(store, result.session.budget);
    expect(account.activity).toBe("experiment");
    expect(account.outcome).toBe("complete");
    expect(account.runs).toHaveLength(4 + 3 + 3);
    // The catalog record round-trips through the store.
    expect(parseExperimentCatalog((await store.getValue(result.catalogDigest))!)).toEqual(result.catalog);
    // Every run record parses back exactly.
    for (let i = 0; i < result.runs.length; i++) {
      const stored = parseExperimentRun((await store.getValue(result.runDigests[i]!))!);
      expect(stored).toEqual(result.runs[i]!);
      expect(stored.contract).toBe(EXPERIMENT_RUN_CONTRACT);
    }
    expect(parseExperimentSession((await store.getValue(result.sessionDigest))!)).toEqual(result.session);
  });

  test("ablation disables both hooks: every task regenerates and the catalog stays empty", async () => {
    const { store, run } = fixture({ arm: "ablation", ...generating });
    const result = await run();

    expect(result.session.outcome).toBe("complete");
    for (const run of result.runs) {
      expect(run.consult).toEqual({ outcome: "disabled", entry: null, manifest: null });
      expect(run.generator).not.toBeNull();
      expect(run.manifest).toBe(keptDigest);
      expect(run.outcome).toBe("complete");
      expect(run.promote).toBeNull();
    }
    expect(result.catalog.entries).toHaveLength(0);
    const account = await budgetOf(store, result.session.budget);
    expect(account.runs).toHaveLength(3 * 2);
  });

  test("fresh generates one manifest per task with no evaluation and no kept entries", async () => {
    const { store, run } = fixture({ arm: "fresh", ...generating });
    const result = await run();

    expect(result.session.outcome).toBe("complete");
    for (const run of result.runs) {
      expect(run.consult.outcome).toBe("disabled");
      expect(run.generator).not.toBeNull();
      expect(run.manifest).toBe(keptDigest);
      expect(run.promote).toBeNull();
    }
    expect(result.catalog.entries).toHaveLength(0);
    const account = await budgetOf(store, result.session.budget);
    expect(account.runs).toHaveLength(6);
  });

  test("fixed runs the declared manifest for every task", async () => {
    const { store, run } = fixture({ arm: "fixed", manifest: manifestToJson(kept) });
    const result = await run();

    expect(result.session.outcome).toBe("complete");
    for (const run of result.runs) {
      expect(run.consult.outcome).toBe("disabled");
      expect(run.generator).toBeNull();
      expect(run.manifest).toBe(keptDigest);
      expect(run.outcome).toBe("complete");
      expect(run.work.units).toBeGreaterThan(0);
      expect(run.promote).toBeNull();
    }
    const account = await budgetOf(store, result.session.budget);
    expect(account.runs).toHaveLength(3);
  });

  test("a refused reservation is recorded, not aborted: the session ends exhausted", async () => {
    // Task one fits exactly: generator + task run + two evaluation cases.
    // Task two consults the promoted entry, then its run's reservation is
    // refused and recorded rather than thrown away.
    const { store, run } = fixture(
      { arm: "retained", ...generating, cases: promotionCases, budget: { work: 4_000_000_000, attempts: 256, runs: 4 } },
    );
    const result = await run();

    expect(result.session.outcome).toBe("exhausted");
    expect(result.runs).toHaveLength(2);
    const first = result.runs[0]!;
    expect(first.outcome).toBe("complete");
    expect(first.promote!.promoted).toBe(true);

    const refused = result.runs[1]!;
    expect(refused.consult.outcome).toBe("hit");
    expect(refused.outcome).toBe("exhausted");
    // The refused run records the manifest it tried to admit — the same
    // digest the account's terminal refusal names.
    expect(refused.manifest).toBe(keptDigest);
    expect(refused.receipt).toBeNull();

    const account = await budgetOf(store, result.session.budget);
    expect(account.outcome).toBe("exhausted");
    expect(account.refused).not.toBeNull();
    expect(account.refused!.manifest).toBe(keptDigest);
    expect(account.runs).toHaveLength(4);
    // The session record still round-trips.
    expect(parseExperimentSession((await store.getValue(result.sessionDigest))!).outcome).toBe("exhausted");
  });

  test("a hit whose interface no longer fits the task args is recorded invalid", async () => {
    const store = new MemoryStore();
    // Seed the catalog with a kept entry whose interface wants a different
    // input name than the task's args provide.
    const other = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:other-interface",
      name: "Other interface",
      interface: {
        inputs: { item: { cell: "src", port: "value" } },
        outputs: { label: { cell: "echo", port: "value" } },
      },
      cells: [
        { id: "src", kind: "input", outputs: { value: "json" } },
        { id: "echo", kind: "fn", fn: "echo.v1" },
      ],
      edges: [
        { from: { cell: "src", port: "value" }, to: { cell: "echo", port: "value" } },
      ],
    });
    const seed = [{
      family: "triage",
      manifest: digestCanonical(manifestToJson(other)),
      interfaceDigest: null,
      cases: [{ id: "train-a", split: "train" as const }],
      report: await store.putValue({ note: "seed" }),
      taskId: "seeded",
    }];
    await store.putManifest(other);
    const result = await runExperimentArm({
      arm: arm({ arm: "retained", ...generating, cases: promotionCases }),
      tasks: tasks.slice(0, 1),
      fns: builtinRegistry(),
      store,
      executors: [scriptedExecutor(responses)],
      catalog: seed,
    });
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]!.consult.outcome).toBe("hit");
    expect(result.runs[0]!.outcome).toBe("invalid");
    expect(result.runs[0]!.failure).not.toBeNull();
    expect(result.catalog.entries).toHaveLength(1);
  });

  test("strict parsing: unknown keys, bad arms, and bad records are rejected", async () => {
    const base = { contract: "algal.experiment-arm.v1", arm: "fixed", family: "triage", budget, manifest: manifestToJson(kept) };
    expect(() => parseExperimentArm({ ...base, surprise: 1 })).toThrow("unknown");
    expect(() => parseExperimentArm({ ...base, arm: "magic" })).toThrow();
    expect(() => parseExperimentArm({ ...base, generator: generating.generator })).toThrow("no generator");
    expect(() => parseExperimentArm({ contract: "algal.experiment-arm.v1", arm: "retained", family: "triage", budget, ...generating }))
      .toThrow("promotion cases");
    expect(() => parseExperimentArm({ contract: "algal.experiment-arm.v1", arm: "fixed", family: "triage", budget }))
      .toThrow("manifest");

    const taskSet = parseExperimentTaskSet({
      contract: "algal.experiment-tasks.v1",
      tasks,
    });
    expect(taskSet.tasks).toHaveLength(3);
    expect(() => parseExperimentTaskSet({ contract: "algal.experiment-tasks.v1", tasks: [{ taskId: "x", phase: "nowhere", spec: {}, args: {} }] }))
      .toThrow();
    expect(() => parseExperimentTaskSet({ contract: "algal.experiment-tasks.v1", tasks: [tasks[0], tasks[0]] }))
      .toThrow("taskId");
  });

  test("arm records parse embedded manifests deeper than the shared record bound", () => {
    // Manifests nest legitimately past the record snapshot depth (cell config,
    // schemas, expression trees); the shared bound only covers the arm's own
    // fields, and each embedded structure re-parses under its own bounds.
    const deep = manifestToJson(parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:deep-const",
      name: "Deep const",
      interface: {
        outputs: { out: { cell: "k", port: "value" } },
      },
      cells: [
        {
          id: "k",
          kind: "const",
          outputs: {
            value: { type: "json", value: { a: { b: { c: { d: { e: { f: "g" } } } } } } },
          },
        },
      ],
      edges: [],
    }));
    const arm = parseExperimentArm({
      contract: "algal.experiment-arm.v1",
      arm: "fixed",
      family: "triage",
      budget,
      manifest: deep,
    });
    expect(arm.manifest).toBeDefined();
  });

  test("run record parser rejects unknown keys and inconsistent digests", async () => {
    const { run } = fixture({ arm: "fixed", manifest: manifestToJson(kept) }, tasks.slice(0, 1));
    const result = await run();
    const record = result.runs[0]! as unknown as Record<string, unknown>;
    expect(() => parseExperimentRun({ ...record, extra: true })).toThrow("unknown");
    expect(() => parseExperimentRun({ ...record, consult: { outcome: "hit", entry: null, manifest: null } })).toThrow();
    expect(() => parseExperimentRun({ ...record, receipt: null })).toThrow("receipt");
    expect(() => parseExperimentSession({ ...(result.session as unknown as Record<string, unknown>), arm: "bogus" })).toThrow();
  });
});
