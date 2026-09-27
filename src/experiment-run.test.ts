import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { scriptedExecutor } from "./effects";
import {
  EXPERIMENT_BOUNDS,
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

  test("retained with citeKeptEvaluation re-cites stored evidence on hits instead of re-evaluating", async () => {
    const { store, run } = fixture({ arm: "retained", ...generating, cases: promotionCases, citeKeptEvaluation: true });
    const result = await run();

    expect(result.session.outcome).toBe("complete");
    expect(result.catalog.entries).toHaveLength(1);
    const entry = result.catalog.entries[0]!;

    // Task one still generates, evaluates, and promotes.
    const first = result.runs[0]!;
    expect(first.consult.outcome).toBe("miss");
    expect(first.promote!.evaluated).toBe(true);
    expect(first.promote!.promoted).toBe(true);

    // Hits run the kept manifest but re-cite its stored promotion evidence:
    // no evaluation ran, the promote record points at the kept entry and its
    // original report digest.
    for (const hit of result.runs.slice(1)) {
      expect(hit.consult.outcome).toBe("hit");
      expect(hit.promote!.evaluated).toBe(false);
      expect(hit.promote!.promoted).toBe(false);
      expect(hit.promote!.entry).toBe(0);
      expect(hit.promote!.report).toBe(entry.report);
      expect(hit.promote!.validation).toEqual({ passed: 1, total: 1 });
    }

    // The account charged fewer runs: task one generated + ran + evaluated two
    // cases; each hit ran the kept manifest alone.
    const account = await budgetOf(store, result.session.budget);
    expect(account.runs).toHaveLength(4 + 2);
  });

  test("citeKeptEvaluation parses only on retained arms", async () => {
    expect(() => arm({ arm: "ablation", ...generating, citeKeptEvaluation: true })).toThrow();
    expect(() => arm({ arm: "retained", ...generating, cases: promotionCases, citeKeptEvaluation: "yes" })).toThrow();
    expect(() => arm({ arm: "retained", ...generating, cases: promotionCases, citeKeptEvaluation: true })).not.toThrow();
  });

  test("normalizeEmitted repairs an emitted wildcard view and records the repair", async () => {
    // The emission is `kept` with the fn cell swapped for an agent cell whose
    // view declares `inputs: ["*"]` — the observed live defect: a list cannot
    // hold "*", the bare string is the contract's wildcard form.
    const emitted = manifestToJson(kept) as Record<string, unknown>;
    const cells = [...(emitted.cells as Record<string, unknown>[])];
    cells[1] = {
      id: "echo",
      kind: "agent",
      inputs: { value: "json" },
      prompt: "Echo the input.",
      view: { inputs: ["*"] },
      output: { kind: "json", schema: { type: "object" } },
    };
    emitted.cells = cells;
    (emitted.interface as Record<string, unknown>).outputs = { label: { cell: "echo", port: "out" } };
    const repaired = { ...emitted, cells: [{ ...cells[0] }, { ...(cells[1] as Record<string, unknown>), view: { inputs: "*" } }] };
    const repairedManifest = parseOrganismManifest(repaired);
    const wildResponses = { writer: emitted as JsonValue, echo: { value: "seen" } as JsonValue };

    const store = new MemoryStore();
    const result = await runExperimentArm({
      arm: arm({ arm: "ablation", ...generating, normalizeEmitted: true }),
      tasks: [tasks[0]!],
      fns: builtinRegistry(),
      store,
      executors: [scriptedExecutor(wildResponses)],
    });

    const run = result.runs[0]!;
    expect(run.outcome).toBe("complete");
    expect(run.generator!.normalized).toEqual(["view-inputs-wildcard"]);
    expect(run.manifest).toBe(digestCanonical(manifestToJson(repairedManifest)));
    // The stored record round-trips with the repair list.
    const stored = parseExperimentRun((await store.getValue(result.runDigests[0]!))!);
    expect(stored.generator!.normalized).toEqual(["view-inputs-wildcard"]);
  });

  test("normalizeEmitted repairs a stray id on an expr descriptor", async () => {
    const emitted = manifestToJson(kept) as Record<string, unknown>;
    const cells = [...(emitted.cells as Record<string, unknown>[])];
    cells[1] = {
      id: "echo",
      kind: "expr",
      inputs: { value: "json" },
      expr: { contract: "algal.expr.v1", id: "echo", program: { label: ["get", "value"] } },
      output: { kind: "json", schema: { type: "object" } },
    };
    emitted.cells = cells;
    (emitted.interface as Record<string, unknown>).outputs = { label: { cell: "echo", port: "out" } };
    const idResponses = { writer: emitted as JsonValue };

    const result = await runExperimentArm({
      arm: arm({ arm: "ablation", ...generating, normalizeEmitted: true }),
      tasks: [tasks[0]!],
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [scriptedExecutor(idResponses)],
    });

    const run = result.runs[0]!;
    expect(run.outcome).toBe("complete");
    expect(run.generator!.normalized).toEqual(["expr-id"]);
  });

  test("without normalizeEmitted the same emissions stay invalid", async () => {
    const emitted = manifestToJson(kept) as Record<string, unknown>;
    const cells = [...(emitted.cells as Record<string, unknown>[])];
    cells[1] = {
      id: "echo",
      kind: "agent",
      inputs: { value: "json" },
      prompt: "Echo the input.",
      view: { inputs: ["*"] },
      output: { kind: "json", schema: { type: "object" } },
    };
    emitted.cells = cells;
    (emitted.interface as Record<string, unknown>).outputs = { label: { cell: "echo", port: "out" } };

    const result = await runExperimentArm({
      arm: arm({ arm: "ablation", ...generating }),
      tasks: [tasks[0]!],
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [scriptedExecutor({ writer: emitted as JsonValue })],
    });

    const run = result.runs[0]!;
    expect(run.outcome).toBe("invalid");
    expect(run.generator!.normalized).toBeUndefined();
  });

  test("normalizeEmitted parses only on generative arms", async () => {
    expect(() => arm({ arm: "fixed", manifest: manifestToJson(kept), normalizeEmitted: true })).toThrow();
    expect(() => arm({ arm: "ablation", ...generating, normalizeEmitted: "yes" })).toThrow();
    expect(() => arm({ arm: "ablation", ...generating, normalizeEmitted: true })).not.toThrow();
    expect(() => arm({ arm: "fresh", ...generating, normalizeEmitted: true })).not.toThrow();
    expect(() => arm({ arm: "retained", ...generating, cases: promotionCases, normalizeEmitted: true })).not.toThrow();
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
      tasks: [...tasks, { taskId: "with-expect", phase: "unseen" as const, spec: {}, args: {}, expect: { out: { label: "x" } } }],
    });
    expect(taskSet.tasks).toHaveLength(4);
    expect(taskSet.tasks[3]!.expect).toEqual({ out: { label: "x" } });
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

    const set = parseExperimentTaskSet({
      contract: "algal.experiment-tasks.v1",
      tasks: [
        {
          taskId: "deep-1",
          phase: "unseen",
          spec: { nested: { deeper: { still: { going: { here: "yes" } } } } },
          args: { in: { records: [{ a: { b: { c: { d: 1 } } } }] } },
        },
      ],
    });
    expect(set.tasks[0]!.taskId).toBe("deep-1");
  });

  test("operator corrections declared on a task land on its run record", async () => {
    const declared = [{ kind: "operator-edit", note: "spec threshold raised by hand" }];
    const corrected: ExperimentTask[] = [
      { ...tasks[0]!, corrections: declared },
      tasks[1]!,
    ];
    const { store, run } = fixture({ arm: "fixed", manifest: manifestToJson(kept) }, corrected);
    const result = await run();

    // The task's declarations ride onto its record; an undeclared task
    // writes none — absent, not an empty list.
    expect(result.runs[0]!.corrections).toEqual(declared);
    expect(result.runs[1]!.corrections).toBeUndefined();
    const stored = parseExperimentRun((await store.getValue(result.runDigests[0]!))!);
    expect(stored.corrections).toEqual(declared);
    expect("corrections" in (stored as unknown as Record<string, unknown>)).toBe(true);
    const plain = parseExperimentRun((await store.getValue(result.runDigests[1]!))!);
    expect("corrections" in (plain as unknown as Record<string, unknown>)).toBe(false);
  });

  test("corrections parse when present and reject bad shapes", async () => {
    const { run } = fixture({ arm: "fixed", manifest: manifestToJson(kept) }, tasks.slice(0, 1));
    const result = await run();
    const record = result.runs[0]! as unknown as Record<string, unknown>;
    // The runner records no corrections itself.
    expect(record.corrections).toBeUndefined();

    const correction = { kind: "hint", note: "operator supplied the taxonomy" };
    expect(parseExperimentRun({ ...record, corrections: [correction] }).corrections).toEqual([correction]);
    expect(() => parseExperimentRun({ ...record, corrections: "yes" })).toThrow();
    // An empty list is not "none recorded": the field must be absent.
    expect(() => parseExperimentRun({ ...record, corrections: [] })).toThrow();
    expect(() => parseExperimentRun({ ...record, corrections: [{ kind: "hint" }] })).toThrow();
    expect(() => parseExperimentRun({ ...record, corrections: [{ ...correction, extra: 1 }] })).toThrow("unknown");
    expect(() => parseExperimentRun({ ...record, corrections: [{ kind: "", note: "x" }] })).toThrow();
    expect(() => parseExperimentRun({ ...record, corrections: [{ kind: "k", note: "x".repeat(EXPERIMENT_BOUNDS.maxCorrectionNoteLength + 1) }] })).toThrow();
    const over = Array.from({ length: EXPERIMENT_BOUNDS.maxCorrections + 1 }, () => correction);
    expect(() => parseExperimentRun({ ...record, corrections: over })).toThrow();

    // Task entries carry the same optional field through the task set.
    const entry = { taskId: "t", phase: "unseen", spec: {}, args: {}, corrections: [correction] };
    const set = parseExperimentTaskSet({ contract: "algal.experiment-tasks.v1", tasks: [entry] });
    expect(set.tasks[0]!.corrections).toEqual([correction]);
    expect(() => parseExperimentTaskSet({ contract: "algal.experiment-tasks.v1", tasks: [{ ...entry, corrections: [] }] })).toThrow();
    expect(() => parseExperimentTaskSet({ contract: "algal.experiment-tasks.v1", tasks: [{ ...entry, corrections: [{ note: "x" }] }] })).toThrow();
  });

  test("optimizer consults, cites within the staleness window, and re-qualifies stale entries", async () => {
    // requalifyAfter=2: task 1 cites (ordinal gap 1 < 2), task 2 is stale
    // (gap 2 >= 2) and re-qualifies, task 3 cites the refreshed entry.
    const reviser = {
      manifest: manifestToJson(generator),
      output: "manifest",
    };
    const four: ExperimentTask[] = [...tasks, { taskId: "task-four", phase: "unseen", spec: { family: "triage" }, args: { record: "d" } }];
    const { store, run } = fixture({
      arm: "optimizer", ...generating, reviser, requalifyAfter: 2, cases: promotionCases,
    }, four);
    const result = await run();

    expect(result.runs).toHaveLength(4);
    // Task 0: miss → generate → promote (ordinal 0).
    expect(result.runs[0]!.promote).toMatchObject({ evaluated: true, promoted: true, entry: 0 });
    // Task 1: hit inside the window → cite stored evidence, no evaluation.
    expect(result.runs[1]!.consult.outcome).toBe("hit");
    expect(result.runs[1]!.promote).toMatchObject({ evaluated: false, promoted: false, entry: 0 });
    expect(result.runs[1]!.revise).toBeUndefined();
    // Task 2: stale → re-evaluated; the pass refreshes the entry, no demotion.
    expect(result.runs[2]!.promote).toMatchObject({ evaluated: true, promoted: false, entry: 0 });
    expect(result.runs[2]!.promote!.demoted).toBeUndefined();
    expect(result.runs[2]!.revise).toBeUndefined();
    // Task 3: back inside the refreshed window → cite again.
    expect(result.runs[3]!.promote).toMatchObject({ evaluated: false, entry: 0 });
    // One entry total, still active.
    const catalog = parseExperimentCatalog((await store.getValue(result.catalogDigest))!);
    expect(catalog.entries).toHaveLength(1);
    expect(catalog.entries[0]!.retired).toBeUndefined();
  });

  test("optimizer demotes an entry whose re-qualification fails and promotes the revision that supersedes it", async () => {
    // A stale kept manifest: always emits "stale" regardless of the record —
    // it completes task runs but fails the arm's echo-shaped cases.
    const stale = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:stale-echo",
      name: "Stale echo",
      interface: {
        inputs: { record: { cell: "src", port: "value" } },
        outputs: { label: { cell: "fixed", port: "value" } },
      },
      cells: [
        { id: "src", kind: "input", outputs: { value: "json" } },
        { id: "fixed", kind: "const", outputs: { value: { type: "json", value: "stale" } } },
      ],
    });
    const store = new MemoryStore();
    const staleDigest = await store.putManifest(stale);
    const seedReport = await store.putValue({ kind: "stale-promotion" } as JsonValue);
    const catalog = [{
      family: "triage", manifest: staleDigest, interfaceDigest: null,
      cases: [{ id: "t-1", split: "train" as const }, { id: "v-1", split: "validation" as const }],
      report: seedReport, taskId: "seeded",
    }];

    // The reviser declares kept+evidence inputs; the scripted response emits
    // the good echo manifest — the "repaired" procedure.
    const reviserManifest = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:reviser",
      name: "Reviser",
      interface: {
        inputs: {
          task: { cell: "spec", port: "value" },
          kept: { cell: "prior", port: "value" },
          evidence: { cell: "why", port: "value" },
        },
        outputs: { manifest: { cell: "writer", port: "out" } },
      },
      cells: [
        { id: "spec", kind: "input", outputs: { value: "json" } },
        { id: "prior", kind: "input", outputs: { value: "json" } },
        { id: "why", kind: "input", outputs: { value: "json" } },
        {
          id: "writer", kind: "agent",
          inputs: { task: "json", kept: "json", evidence: "json" },
          prompt: "Revise the kept manifest using the evidence.",
          view: { inputs: ["task", "kept", "evidence"] },
          output: { kind: "json", schema: { type: "object" } },
        },
      ],
      edges: [
        { from: { cell: "spec", port: "value" }, to: { cell: "writer", port: "task" } },
        { from: { cell: "prior", port: "value" }, to: { cell: "writer", port: "kept" } },
        { from: { cell: "why", port: "value" }, to: { cell: "writer", port: "evidence" } },
      ],
    });
    const result = await runExperimentArm({
      arm: arm({
        arm: "optimizer", ...generating,
        reviser: { manifest: manifestToJson(reviserManifest), output: "manifest" },
        requalifyAfter: 1, cases: promotionCases,
      }),
      tasks, fns: builtinRegistry(), store,
      executors: [scriptedExecutor({ writer: manifestToJson(kept) as JsonValue })],
      catalog,
    });

    expect(result.runs).toHaveLength(3);
    // Task 0 cites the seeded entry inside its window (ordinal gap 0 < 1).
    expect(result.runs[0]!.consult.outcome).toBe("hit");
    expect(result.runs[0]!.promote).toMatchObject({ evaluated: false, entry: 0 });
    // Task 1 is stale: re-qualification fails (stale echoes "stale", the
    // cases want the record back) → the entry demotes and the reviser runs.
    expect(result.runs[1]!.promote).toMatchObject({ evaluated: true, promoted: false, entry: 0, demoted: true });
    expect(result.runs[1]!.revise).toMatchObject({
      trigger: "requalification", evaluated: true, promoted: true, entry: 1, supersedes: 0,
    });
    // Task 2 consults the revision — entry 0 no longer matches consult.
    expect(result.runs[2]!.consult).toMatchObject({ outcome: "hit", entry: 1 });
    const storedCatalog = parseExperimentCatalog((await store.getValue(result.catalogDigest))!);
    expect(storedCatalog.entries).toHaveLength(2);
    expect(storedCatalog.entries[0]!.retired).toMatch(/^sha256:/);
    expect(storedCatalog.entries[1]!.supersedes).toBe(0);
    // The reviser received the evidence record it declared.
    const reviseRecord = result.runs[1]!.revise!;
    const evidence = (await store.getValue(reviseRecord.evidence))! as Record<string, JsonValue>;
    expect(evidence).toMatchObject({ taskId: "task-two", trigger: "requalification", report: result.runs[1]!.promote!.report });
  });

  test("optimizer revises on a missed task expectation and the demotion lands in the catalog", async () => {
    const reviser = {
      manifest: manifestToJson(generator),
      output: "manifest",
    };
    const grading: ExperimentTask[] = [
      tasks[0]!,
      { taskId: "task-two", phase: "unseen", spec: { family: "triage" }, args: { record: "b" }, expect: { label: "WRONG" } },
      tasks[2]!,
    ];
    const { store, run } = fixture({
      arm: "optimizer", ...generating, reviser, requalifyAfter: 8, cases: promotionCases,
    }, grading);
    const result = await run();

    // Task 1's kept manifest echoes "b", the task expects "WRONG": the hit
    // still cites within the window, but the miss retires the entry and the
    // reviser promotes a repair that supersedes it.
    expect(result.runs[1]!.consult.outcome).toBe("hit");
    expect(result.runs[1]!.promote).toMatchObject({ evaluated: false, entry: 0 });
    expect(result.runs[1]!.revise).toMatchObject({ trigger: "missed-expectation", promoted: true, entry: 1, supersedes: 0 });
    const catalog = parseExperimentCatalog((await store.getValue(result.catalogDigest))!);
    expect(catalog.entries[0]!.retired).toMatch(/^sha256:/);
    expect(catalog.entries[1]!.supersedes).toBe(0);
    const evidence = await store.getValue(result.runs[1]!.revise!.evidence);
    expect(evidence).toMatchObject({
      taskId: "task-two", trigger: "missed-expectation",
      args: { record: "b" }, outputs: { label: "b" }, expect: { label: "WRONG" },
      receipt: result.runs[1]!.receipt,
    });
    // Task 2 consults the revision.
    expect(result.runs[2]!.consult).toMatchObject({ outcome: "hit", entry: 1 });
  });

  test.each([5, 7])("optimizer keeps its revision episode when the account exhausts after %i admitted runs", async (runs) => {
    const grading: ExperimentTask[] = [tasks[0]!, { ...tasks[1]!, expect: { label: "WRONG" } }, tasks[2]!];
    const { store, run } = fixture({
      arm: "optimizer", ...generating,
      reviser: { manifest: manifestToJson(generator), output: "manifest" },
      requalifyAfter: 8, cases: promotionCases, budget: { ...budget, runs },
    }, grading);
    const result = await run();

    expect(result.session.outcome).toBe("exhausted");
    expect(result.runs).toHaveLength(2);
    const stopped = result.runs[1]!;
    expect(stopped.outcome).toBe("exhausted");
    expect(stopped.failure?.code).toBe("BUDGET_EXHAUSTED");
    expect(stopped.receipt).not.toBeNull();
    expect(stopped.revise).toMatchObject({
      trigger: "missed-expectation", evaluated: false, promoted: false,
      report: null, validation: null, entry: null, supersedes: 0,
    });
    if (runs === 5) expect(stopped.revise!.generator).toBeNull();
    else expect(stopped.revise!.generator?.receipt).toMatch(/^sha256:/);
    expect(result.catalog.entries[0]!.retired).toBe(stopped.revise!.evidence);
    expect((await budgetOf(store, result.session.budget)).runs).toHaveLength(runs);
    expect(parseExperimentRun((await store.getValue(result.runDigests[1]!))!).revise).toEqual(stopped.revise);
  });

  test("optimizer preserves the evaluated revision and retirement when the catalog is full", async () => {
    const { store, run } = fixture({
      arm: "optimizer", ...generating,
      reviser: { manifest: manifestToJson(generator), output: "manifest" },
      requalifyAfter: 8, cases: promotionCases, maxEntries: 1,
    }, [tasks[0]!, { ...tasks[1]!, expect: { label: "WRONG" } }]);
    const result = await run();
    const last = result.runs[1]!;

    expect(result.session.outcome).toBe("complete");
    expect(last.outcome).toBe("complete");
    expect(last.failure?.message).toContain("catalog is full");
    expect(last.revise).toMatchObject({
      trigger: "missed-expectation", evaluated: true, promoted: false,
      validation: { passed: 1, total: 1 }, entry: null, supersedes: 0,
    });
    expect(last.revise!.report).toMatch(/^sha256:/);
    expect(last.revise!.generator?.receipt).toMatch(/^sha256:/);
    expect(result.catalog.entries).toHaveLength(1);
    expect(result.catalog.entries[0]!.retired).toBe(last.revise!.evidence);
    expect(await store.getValue(last.revise!.report!)).toBeDefined();
  });

  test("optimizer bounds actual outputs in the evidence delivered to the reviser", async () => {
    const large = "x".repeat(EXPERIMENT_BOUNDS.spec.maxBytes + 1);
    const oversized = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:oversized-output", name: "Large output",
      interface: {
        inputs: { record: { cell: "src", port: "value" } },
        outputs: { label: { cell: "fixed", port: "value" } },
      },
      cells: [
        { id: "src", kind: "input", outputs: { value: "json" } },
        { id: "fixed", kind: "const", outputs: { value: { type: "json", value: large } } },
      ],
    });
    const { store, run } = fixture({
      arm: "optimizer", ...generating,
      reviser: { manifest: manifestToJson(generator), output: "manifest" },
      requalifyAfter: 8, cases: promotionCases,
    }, [{ ...tasks[0]!, expect: { label: "WRONG" } }]);
    const manifest = await store.putManifest(oversized);
    const report = await store.putValue({ kind: "seed" });
    const result = await run([{
      family: "triage", manifest, interfaceDigest: null,
      cases: [{ id: "validation-b", split: "validation" }], report, taskId: "seeded",
    }]);
    const episode = result.runs[0]!.revise!;
    const evidence = await store.getValue(episode.evidence) as Record<string, JsonValue>;
    expect(episode.trigger).toBe("missed-expectation");
    expect(evidence.outputs).toBeUndefined();
    expect(evidence.outputsOmitted).toBe("exceeds-task-data-bound");
    expect(evidence.outputsDigest).toBe(digestCanonical({ label: large }));
    expect(evidence.receipt).toBe(result.runs[0]!.receipt);
    expect(evidence.args).toEqual({ record: "a" });
  });

  test("optimizer revises on a failed hit run and records the failure evidence", async () => {
    // A kept manifest whose agent cell has no scripted response: admitted,
    // then fails at the executor boundary mid-run.
    const broken = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:broken",
      name: "Broken",
      interface: {
        inputs: { record: { cell: "src", port: "value" } },
        outputs: { label: { cell: "bad", port: "out" } },
      },
      cells: [
        { id: "src", kind: "input", outputs: { value: "json" } },
        {
          id: "bad", kind: "agent",
          inputs: { record: "json" },
          prompt: "Classify the record.",
          view: { inputs: ["record"] },
          output: { kind: "json", schema: { type: "object" } },
        },
      ],
      edges: [
        { from: { cell: "src", port: "value" }, to: { cell: "bad", port: "record" } },
      ],
    });
    const store = new MemoryStore();
    const brokenDigest = await store.putManifest(broken);
    const seedReport = await store.putValue({ kind: "seed" } as JsonValue);
    const catalog = [{
      family: "triage", manifest: brokenDigest, interfaceDigest: null,
      cases: [{ id: "t-1", split: "train" as const }, { id: "v-1", split: "validation" as const }],
      report: seedReport, taskId: "seeded",
    }];
    const result = await runExperimentArm({
      arm: arm({
        arm: "optimizer", ...generating,
        reviser: { manifest: manifestToJson(generator), output: "manifest" },
        requalifyAfter: 4, cases: promotionCases,
      }),
      tasks, fns: builtinRegistry(), store,
      executors: [scriptedExecutor(responses)],
      catalog,
    });

    expect(result.runs[0]!.outcome).toBe("failed");
    expect(result.runs[0]!.revise).toMatchObject({ trigger: "failed-run", promoted: true, entry: 1, supersedes: 0 });
    const storedCatalog = parseExperimentCatalog((await store.getValue(result.catalogDigest))!);
    expect(storedCatalog.entries[0]!.retired).toMatch(/^sha256:/);
    // The evidence names the failed receipt.
    const evidence = (await store.getValue(result.runs[0]!.revise!.evidence))! as Record<string, JsonValue>;
    expect(evidence).toMatchObject({ taskId: "task-one", trigger: "failed-run", outcome: "failed" });
  });

  test("optimizer arm parsing gates its declared fields", () => {
    const reviser = { manifest: manifestToJson(generator), output: "manifest" };
    const base = { ...generating, cases: promotionCases, reviser, requalifyAfter: 2 };
    expect(() => arm({ arm: "optimizer", ...base })).not.toThrow();
    expect(() => arm({ arm: "optimizer", ...generating, cases: promotionCases, requalifyAfter: 2 })).toThrow("reviser");
    expect(() => arm({ arm: "optimizer", ...generating, cases: promotionCases, reviser })).toThrow("requalifyAfter");
    expect(() => arm({ arm: "optimizer", ...generating, cases: promotionCases, reviser, requalifyAfter: 0 })).toThrow();
    expect(() => arm({ arm: "optimizer", ...base, citeKeptEvaluation: true })).toThrow("citeKeptEvaluation");
    expect(() => arm({ arm: "optimizer", ...generating, reviser, requalifyAfter: 2 })).toThrow("cases");
    expect(() => arm({ arm: "optimizer", manifest: manifestToJson(kept), ...base })).toThrow("manifest");
    // Other arms reject the optimizer fields.
    expect(() => arm({ arm: "retained", ...generating, cases: promotionCases, reviser })).toThrow("reviser");
    expect(() => arm({ arm: "fixed", manifest: manifestToJson(kept), requalifyAfter: 2 })).toThrow("requalifyAfter");
    // The reviser interface must expose task input + the declared output.
    const noTask = manifestToJson(parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:no-task", name: "No task",
      interface: {
        inputs: { other: { cell: "src", port: "value" } },
        outputs: { manifest: { cell: "src", port: "value" } },
      },
      cells: [{ id: "src", kind: "input", outputs: { value: "json" } }],
    }));
    expect(() => arm({ arm: "optimizer", ...generating, cases: promotionCases, requalifyAfter: 2, reviser: { manifest: noTask, output: "manifest" } })).toThrow('"task"');
  });

  test("run record parser accepts and bounds revise records", async () => {
    const reviser = { manifest: manifestToJson(generator), output: "manifest" };
    const grading: ExperimentTask[] = [
      tasks[0]!,
      { ...tasks[1]!, expect: { label: "WRONG" } },
    ];
    const { run } = fixture({
      arm: "optimizer", ...generating, reviser, requalifyAfter: 8, cases: promotionCases,
    }, grading);
    const result = await run();
    const record = result.runs[1]! as unknown as Record<string, unknown>;
    const revise = record["revise"] as Record<string, unknown>;
    expect(revise["trigger"]).toBe("missed-expectation");
    expect(() => parseExperimentRun({ ...record, revise: { ...revise, trigger: "renamed" } })).toThrow("trigger");
    expect(() => parseExperimentRun({ ...record, revise: { ...revise, promoted: true, entry: null } })).toThrow();
    expect(() => parseExperimentRun({ ...record, revise: { ...revise, evaluated: true, report: null } })).toThrow();
    expect(() => parseExperimentRun({ ...record, revise: { ...revise, extra: 1 } })).toThrow("unknown");
    // promote.demoted parses and is shape-checked.
    const promoted = record["promote"] as Record<string, unknown>;
    expect(() => parseExperimentRun({ ...record, promote: { ...promoted, demoted: true } })).toThrow();
    expect(parseExperimentRun({ ...record, promote: { ...promoted, demoted: false } }).promote!.demoted).toBe(false);
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
