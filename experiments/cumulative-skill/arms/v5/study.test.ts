import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { digestCanonical } from "../../../../src/digest";
import { parseExperimentArm, parseExperimentCatalog, runExperimentArm, type ExperimentCatalogEntry, type ExperimentTask } from "../../../../src/experiment-run";
import { builtinRegistry } from "../../../../src/registry";
import { MemoryStore } from "../../../../src/store";
import { type JsonValue } from "../../../../src/values";
import { gradeStudy } from "./grade";
import { SCORER } from "./shared";

const output = (decision = "accept") => ({
  results: [{ recordId: "r1", label: "billing", decision }], summary: { billing: 1 },
});

// A manifest whose interface output passes `payload` straight through — case
// args carry the expected `out` object, so the passthrough scores a hit.
const passthrough = (key: string) => parseOrganismManifest({
  contract: "algal.organism.v1", key, name: key,
  interface: { inputs: { payload: { cell: "input", port: "data" } }, outputs: { out: { cell: "input", port: "data" } } },
  cells: [{ id: "input", kind: "input", outputs: { data: "json" } }], edges: [],
});
const emitter = (key: string, manifest: ReturnType<typeof passthrough>) => ({
  contract: "algal.organism.v1", key, name: key,
  interface: { inputs: { task: { cell: "task", port: "value" } }, outputs: { manifest: { cell: "emit", port: "value" } } },
  cells: [{ id: "task", kind: "input", outputs: { value: "json" } },
    { id: "emit", kind: "const", outputs: { value: { type: "json", value: manifestToJson(manifest) } } }], edges: [],
});

async function fixture(opts: { arm: string; revise?: boolean; wrong?: Record<string, number> } = { arm: "retained" }) {
  const store = new MemoryStore();
  const seed = passthrough("organism:v5-seed");
  const revised = passthrough("organism:v5-revised");
  const manifestDigest = await store.putManifest(seed);
  const cases = ["train", "validation", "holdout"].map((split) => ({
    id: split, split: split as "train" | "validation" | "holdout",
    args: { payload: output() }, expect: { out: output() },
  }));
  const entry: ExperimentCatalogEntry = {
    family: "record-triage", manifest: manifestDigest,
    interfaceDigest: digestCanonical(seed.interface as unknown as JsonValue),
    cases: cases.flatMap((c) => c.split === "holdout" ? [] : [{ id: c.id, split: c.split as "train" | "validation" }]),
    report: await store.putValue({ contract: "algal.foundry-selection.v1", note: "fixture" }),
    taskId: "acquisition-01",
  };
  const generator = emitter("organism:v5-generator", seed);
  const reviser = emitter("organism:v5-reviser", revised);
  const armValue: Record<string, unknown> = {
    contract: "algal.experiment-arm.v1", arm: opts.arm, family: "record-triage",
    budget: { work: 4_000_000_000, runs: 256, attempts: 256 },
    generator: { manifest: generator, output: "manifest" },
    cases, scorer: SCORER,
  };
  if (opts.arm === "retained") armValue.citeKeptEvaluation = true;
  if (opts.arm === "optimizer") {
    armValue.reviser = { manifest: reviser, output: "manifest" };
    armValue.requalifyAfter = 10;
  }
  // `expect` rides acquisition and unseen records only — shift is sealed.
  const tasks: ExperimentTask[] = (["acquisition", "unseen", "shift"] as const).map((phase) => {
    const payload = output(opts.wrong?.[phase] === 1 ? "wrong" : "accept");
    const task: ExperimentTask = { taskId: `${phase}-01`, phase, spec: {}, args: { payload } };
    if (phase !== "shift") task.expect = { out: output() };
    return task;
  });
  const catalog = parseExperimentCatalog({ contract: "algal.experiment-catalog.v1", entries: [entry] });
  const result = await runExperimentArm({
    arm: parseExperimentArm(armValue), tasks, store, fns: builtinRegistry(), executors: [],
    catalog: catalog.entries,
  });
  return {
    store, result, seed, revised, manifestDigest,
    truth: new Map(tasks.map((t) => [t.taskId, { out: output() as JsonValue }])),
    config: { contract: "algal.experiment.config.v1", arm: armValue, tasks },
    session: result.sessionDigest,
  };
}

describe("v5 shared catalog seed", () => {
  test("a seeded retained arm consults the kept manifest on every task and never generates", async () => {
    const f = await fixture({ arm: "retained" });
    expect(f.result.runs).toHaveLength(3);
    for (const run of f.result.runs) {
      expect(run.consult.outcome).toBe("hit");
      expect(run.generator).toBeNull();
      expect(run.manifest).toBe(f.manifestDigest);
      expect(run.revise).toBeUndefined();
    }
    // The seeded entry is still live: it was never demoted (retained arms
    // don't requalify) and nothing newer promoted.
    const catalog = parseExperimentCatalog(await f.store.getValue(f.result.session.catalog));
    expect(catalog.entries).toHaveLength(1);
    expect(catalog.entries[0]!.manifest).toBe(f.manifestDigest);
    expect(catalog.entries[0]!.retired).toBeUndefined();
  });

  test("a seeded optimizer arm revises on a missed expectation and supersedes the seed", async () => {
    const f = await fixture({ arm: "optimizer", wrong: { unseen: 1 } });
    const revised = await f.store.putManifest(f.revised);
    const revisedRun = f.result.runs.find((r) => r.revise !== undefined);
    expect(revisedRun?.taskId).toBe("unseen-01");
    expect(revisedRun!.revise!.trigger).toBe("missed-expectation");
    expect(revisedRun!.revise!.promoted).toBe(true);
    const catalog = parseExperimentCatalog(await f.store.getValue(f.result.session.catalog));
    expect(catalog.entries[0]!.retired).toBeDefined();
    expect(catalog.entries[1]!.manifest).toBe(revised);
    expect(catalog.entries[1]!.supersedes).toBe(0);
    // The sealed shift task produced no revision: it carried no expectation.
    const shift = f.result.runs.find((r) => r.taskId === "shift-01")!;
    expect(shift.revise).toBeUndefined();
  });

  test("a sealed shift task cannot trigger revision even when its outputs differ", async () => {
    const f = await fixture({ arm: "optimizer", wrong: { shift: 1 } });
    const shift = f.result.runs.find((r) => r.taskId === "shift-01")!;
    expect(shift.outcome).toBe("complete");
    expect(shift.revise).toBeUndefined();
  });
});

describe("v5 offline grading against corpus truth", () => {
  test("scores sealed shift tasks against spec truth, not config records", async () => {
    const f = await fixture({ arm: "retained" });
    const report = await gradeStudy(f.store, f.truth, f.config, f.session);
    expect(report.groups.shift).toEqual({ tasks: 1, complete: 1, labelsCorrect: 1, recordsCorrect: 1,
      recordsTotal: 1, summariesExact: 1, outputsExact: 1, scorerPassed: 1 });
    expect(report.groups.all.scorerPassed).toBe(3);
  });

  test("rejects an arm-visible expectation on a shift task (seal broken)", async () => {
    const f = await fixture({ arm: "retained" });
    const config = { ...f.config, tasks: f.config.tasks.map((t) =>
      t.phase === "shift" ? { ...t, expect: { out: output() } } : t) };
    await expect(gradeStudy(f.store, f.truth, config, f.session)).rejects.toThrow("seal broken");
  });

  test("rejects a config expectation that drifts from corpus truth", async () => {
    const f = await fixture({ arm: "retained" });
    const config = { ...f.config, tasks: f.config.tasks.map((t) =>
      t.taskId === "unseen-01" ? { ...t, expect: { out: output("drifted") } } : t) };
    await expect(gradeStudy(f.store, f.truth, config, f.session)).rejects.toThrow("differs from corpus truth");
  });
});
