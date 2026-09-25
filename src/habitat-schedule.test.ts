import { describe, expect, test } from "bun:test";
import { cp, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { AlgalError } from "./errors";
import { runFoundry, runFoundryWithin, type FoundryCase } from "./foundry";
import type { HabitatLimits } from "./habitat-budget";
import {
  openHabitatJournal, parseHabitatSchedule, parseHabitatScheduleConfig, runHabitatSchedule, verifyHabitatSchedule,
  type HabitatJournal, type HabitatSchedule, type HabitatScheduleActivitySpec,
} from "./habitat-schedule";
import { builtinRegistry } from "./registry";
import { runFoundrySearch } from "./search";
import { MemoryStore } from "./store";
import type { Store } from "./store-contract";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

const root = resolve(import.meta.dir, "..");

function pure(key: string, program: JsonValue): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1", key, name: key,
    budgets: { maxWork: 1_000, maxAgentCalls: 0 },
    interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "out" } } },
    cells: [
      { id: "src", kind: "input", outputs: { value: "json" } },
      { id: "out", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program }, output: { kind: "json", schema: { type: "string" } } },
    ],
    edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
  });
}

const constant = pure("organism:schedule-constant", "a");
const echo = pure("organism:schedule-echo", ["get", "value"]);
// Proposes the constant before any feedback exists and the echo afterwards.
const generator = parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:schedule-generator", name: "schedule generator",
  budgets: { maxWork: 2_000, maxAgentCalls: 0 },
  interface: { inputs: { feedback: { cell: "src", port: "value" } }, outputs: { candidates: { cell: "out", port: "out" } } },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program: ["if", ["eq", ["get", "value"], null], ["quote", [manifestToJson(constant)]], ["quote", [manifestToJson(echo)]]] }, output: { kind: "json", schema: { type: "array" } } },
  ],
  edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
});
const cases: FoundryCase[] = [
  { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
  { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
  { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } },
];
const roomy: HabitatLimits = { work: 1_000_000, attempts: 0, runs: 64 };
const fns = builtinRegistry();

// A foundry over two candidates (five runs) and a two-generation search
// (eleven runs) share one account.
function activities(store: Store): HabitatScheduleActivitySpec[] {
  return [
    { kind: "foundry", run: account => runFoundryWithin({ candidates: [constant, echo], cases, fns, store, executors: [], account }) },
    {
      kind: "search",
      run: account => runFoundrySearch({ generator, generatorArgs: {}, feedbackInput: "feedback", output: "candidates", cases, maxGenerations: 2, fns, store, executors: [], account }),
    },
  ];
}

/** Counts the runs a schedule starts: each started run stores one receipt. */
function counting(store: Store): { store: Store; started: () => number } {
  let count = 0;
  return {
    store: new Proxy(store, {
      get(target, key) {
        if (key === "putReceipt") return async (value: JsonValue) => { count++; return target.putReceipt(value); };
        const value = Reflect.get(target, key) as unknown;
        return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
      },
    }),
    started: () => count,
  };
}

async function refusal(action: () => Promise<unknown>): Promise<AlgalError> {
  try {
    await action();
  } catch (error) {
    if (error instanceof AlgalError) return error;
    throw error;
  }
  throw new Error("expected a refusal");
}

const turnsOf = (schedule: HabitatSchedule) => schedule.runs.map(run => run.activity);
const RR = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1];

describe("habitat schedule", () => {
  test("activities take turns on one account, and each report is the one it writes alone", async () => {
    const store = new MemoryStore();
    const { schedule, reports } = await runHabitatSchedule({ order: "round-robin", limits: roomy, activities: activities(store), store });
    expect(schedule).toMatchObject({ outcome: "complete", refused: null, charged: { runs: 16 } });
    // Round-robin: the foundry finishes after its fifth run, then the search
    // takes every remaining turn.
    expect(turnsOf(schedule)).toEqual(RR);
    expect(schedule.activities.map(({ kind, outcome }) => ({ kind, outcome }))).toEqual([{ kind: "foundry", outcome: "complete" }, { kind: "search", outcome: "complete" }]);
    // A report in a schedule carries no account and matches the unbudgeted report.
    const alone = new MemoryStore();
    expect(reports[0]).toEqual(await runFoundry({ candidates: [constant, echo], cases, fns, store: alone, executors: [] }));
    expect(reports[1]).toEqual(await runFoundrySearch({ generator, generatorArgs: {}, feedbackInput: "feedback", output: "candidates", cases, maxGenerations: 2, fns, store: alone, executors: [] }));
    expect(await store.getValue(schedule.activities[1]!.report!)).toEqual(reports[1] as unknown as JsonValue);
    const verified = await verifyHabitatSchedule(schedule, store, fns);
    expect(verified.mismatches).toEqual([]);
    expect(verified).toMatchObject({ ok: true, outcome: "complete" });
    // The order depends on nothing but the activities: a second schedule
    // writes the same bytes.
    const again = new MemoryStore();
    const second = await runHabitatSchedule({ order: "round-robin", limits: roomy, activities: activities(again), store: again });
    expect(canonicalize(second.schedule as unknown as JsonValue)).toBe(canonicalize(schedule as unknown as JsonValue));
    expect(parseHabitatSchedule(JSON.parse(JSON.stringify(schedule)))).toEqual(schedule);
  });

  test("the first refused reservation ends every unfinished activity", async () => {
    // Twelve runs: the foundry finishes at run nine, and the search's next
    // request after run twelve is refused.
    const store = new MemoryStore();
    const partial = await runHabitatSchedule({ order: "round-robin", limits: { ...roomy, runs: 12 }, activities: activities(store), store });
    expect(partial.schedule).toMatchObject({ outcome: "exhausted", refused: { activity: 1, reasons: ["runs"] } });
    expect(turnsOf(partial.schedule)).toEqual(RR.slice(0, 12));
    expect(partial.schedule.activities.map(a => a.outcome)).toEqual(["complete", "exhausted"]);
    expect(partial.reports[1]).toBeNull();
    expect(partial.schedule.activities[1]!.report).toBeNull();
    const verified = await verifyHabitatSchedule(partial.schedule, store, fns);
    expect(verified).toMatchObject({ ok: true, outcome: "exhausted", mismatches: [] });
    // Three runs: the search's second request is refused, then the foundry's.
    const early = await runHabitatSchedule({ order: "round-robin", limits: { ...roomy, runs: 3 }, activities: activities(store), store });
    expect(early.schedule).toMatchObject({ outcome: "exhausted", refused: { activity: 1 } });
    expect(early.schedule.activities.map(a => a.outcome)).toEqual(["exhausted", "exhausted"]);
    expect((await verifyHabitatSchedule(early.schedule, store, fns)).ok).toBe(true);
    // The first ceiling does not fit: nothing runs.
    const none = await runHabitatSchedule({ order: "round-robin", limits: { ...roomy, work: 999 }, activities: activities(store), store });
    expect(none.schedule).toMatchObject({ runs: [], outcome: "exhausted", refused: { activity: 0, reasons: ["work"] } });
    expect((await verifyHabitatSchedule(none.schedule, store, fns)).ok).toBe(true);
  });

  test("a journal resumes an interrupted schedule, and a complete journal replays without starting a run", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-habitat-journal-"));
    try {
      const reference = (await runHabitatSchedule({ order: "round-robin", limits: roomy, activities: activities(new MemoryStore()), store: new MemoryStore() })).schedule;
      const base = new MemoryStore();
      const inner = await openHabitatJournal(dir, "round-robin", roomy);
      // The host stops after journaling six runs; the seventh run's receipt
      // is stored but never journaled.
      const interrupted: HabitatJournal = {
        get runs() { return inner.runs; },
        async append(run) {
          if (inner.runs.length === 6) throw new Error("interrupted");
          await inner.append(run);
        },
      };
      await expect(runHabitatSchedule({ order: "round-robin", limits: roomy, activities: activities(base), store: base, journal: interrupted })).rejects.toThrow("interrupted");
      const resumed = await openHabitatJournal(dir, "round-robin", roomy);
      expect(resumed.runs.map(run => run.activity)).toEqual(RR.slice(0, 6));
      const counted = counting(base);
      const finished = await runHabitatSchedule({ order: "round-robin", limits: roomy, activities: activities(counted.store), store: counted.store, journal: resumed });
      expect(canonicalize(finished.schedule as unknown as JsonValue)).toBe(canonicalize(reference as unknown as JsonValue));
      // Six runs came from their stored receipts; ten started.
      expect(counted.started()).toBe(10);
      expect(resumed.runs).toHaveLength(16);
      const replay = counting(base);
      const replayed = await runHabitatSchedule({ order: "round-robin", limits: roomy, activities: activities(replay.store), store: replay.store, journal: await openHabitatJournal(dir, "round-robin", roomy) });
      expect(canonicalize(replayed.schedule as unknown as JsonValue)).toBe(canonicalize(reference as unknown as JsonValue));
      expect(replay.started()).toBe(0);
      expect((await verifyHabitatSchedule(replayed.schedule, base, fns)).ok).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("journal entries that do not reconcile are refused", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-habitat-journal-"));
    try {
      const store = new MemoryStore();
      const complete = join(dir, "complete");
      await runHabitatSchedule({ order: "round-robin", limits: roomy, activities: activities(store), store, journal: await openHabitatJournal(complete, "round-robin", roomy) });
      const entry = async (journal: string, n: number) => JSON.parse(await readFile(join(journal, "runs", `${String(n).padStart(6, "0")}.json`), "utf8")) as JsonObject;
      const tampered = async (name: string, change: (journal: string) => Promise<void>) => {
        const journal = join(dir, name);
        await cp(complete, journal, { recursive: true });
        await change(journal);
        return journal;
      };
      const put = async (journal: string, n: number, value: JsonObject) => writeFile(join(journal, "runs", `${String(n).padStart(6, "0")}.json`), canonicalize(value));
      const resume = async (journal: string, count = 2) => runHabitatSchedule({
        order: "round-robin", limits: roomy, activities: activities(store).slice(0, count), store, journal: await openHabitatJournal(journal, "round-robin", roomy),
      });
      // Runs 0 and 2 are the constant's two selection cases: same manifest,
      // different arguments.
      const args = await tampered("args", async journal => put(journal, 2, { ...await entry(journal, 2), receipt: (await entry(journal, 0)).receipt! }));
      expect((await refusal(() => resume(args))).message).toContain("run 2: receipt arguments differ");
      const charge = await tampered("charge", async journal => {
        const run = await entry(journal, 4);
        await put(journal, 4, { ...run, charged: { ...(run.charged as JsonObject), work: ((run.charged as JsonObject).work as number) + 1 } });
      });
      expect((await refusal(() => resume(charge))).message).toContain("run 4: charge differs from its receipt");
      const turn = await tampered("turn", async journal => put(journal, 0, { ...await entry(journal, 0), activity: 1 }));
      expect((await refusal(() => resume(turn))).message).toContain("run 0 served activity 1");
      const manifest = await tampered("manifest", async journal => put(journal, 1, { ...await entry(journal, 3), activity: 1 }));
      expect((await refusal(() => resume(manifest))).message).toContain("run 1 ran another manifest");
      expect((await refusal(() => resume(complete, 1))).message).toContain("names activity 1");
      const gap = await tampered("gap", async journal => unlink(join(journal, "runs", "000003.json")));
      expect((await refusal(() => openHabitatJournal(gap, "round-robin", roomy))).message).toContain("entry 3 is missing");
      expect((await refusal(() => openHabitatJournal(complete, "round-robin", { ...roomy, runs: 32 }))).code).toBe("RECEIPT_MISMATCH");
      // A journal holding more runs than the schedule requests does not
      // reconcile either.
      const recorded = (await openHabitatJournal(complete, "round-robin", roomy)).runs;
      expect((await refusal(() => runHabitatSchedule({
        order: "round-robin", limits: roomy, store, activities: activities(store),
        journal: { runs: [...recorded, recorded[15]!], append: async () => {} },
      }))).message).toContain("did not request");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("the record parser recomputes the account, the outcomes, and the round-robin order", async () => {
    const store = new MemoryStore();
    const { schedule } = await runHabitatSchedule({ order: "round-robin", limits: roomy, activities: activities(store), store });
    const exhausted = (await runHabitatSchedule({ order: "round-robin", limits: { ...roomy, runs: 12 }, activities: activities(store), store })).schedule;
    const edit = (base: HabitatSchedule, change: (value: JsonObject) => void): JsonObject => {
      const value = JSON.parse(JSON.stringify(base)) as JsonObject;
      change(value);
      return value;
    };
    const runs = (value: JsonObject) => value.runs as JsonObject[];
    const activitiesOf = (value: JsonObject) => value.activities as JsonObject[];
    for (const [name, bad] of [
      ["unknown field", edit(schedule, v => { v.extra = 1; })],
      ["contract", edit(schedule, v => { v.contract = "algal.habitat-schedule.v2"; })],
      ["order", edit(schedule, v => { v.order = "fifo"; })],
      ["too many activities", edit(schedule, v => { v.activities = Array.from({ length: 9 }, () => activitiesOf(v)[0]!); })],
      ["no activities", edit(schedule, v => { v.activities = []; })],
      ["complete without report", edit(schedule, v => { activitiesOf(v)[0]!.report = null; })],
      ["exhausted with report", edit(exhausted, v => { activitiesOf(v)[1]!.report = activitiesOf(v)[0]!.report!; })],
      ["kind", edit(schedule, v => { activitiesOf(v)[0]!.kind = "experiment"; })],
      ["activity out of range", edit(schedule, v => { runs(v)[0]!.activity = 2; })],
      ["run without activity", edit(schedule, v => { delete runs(v)[0]!.activity; })],
      ["not round-robin", edit(schedule, v => { runs(v)[0]!.activity = 1; runs(v)[1]!.activity = 0; })],
      ["totals", edit(schedule, v => { (v.charged as JsonObject).runs = 15; })],
      ["complete with an exhausted activity", edit(schedule, v => { activitiesOf(v)[1]!.outcome = "exhausted"; activitiesOf(v)[1]!.report = null; })],
      ["refused activity", edit(exhausted, v => { (v.refused as JsonObject).activity = 0; })],
      ["runs beyond limits", edit(schedule, v => { (v.limits as JsonObject).runs = 15; })],
    ] as const) {
      expect(() => parseHabitatSchedule(bad), name).toThrow(AlgalError);
    }
    // Verification reports evidence that is missing or of the wrong kind.
    const swapped = edit(schedule, v => {
      [activitiesOf(v)[0]!.report, activitiesOf(v)[1]!.report] = [activitiesOf(v)[1]!.report!, activitiesOf(v)[0]!.report!];
    });
    const wrong = await verifyHabitatSchedule(swapped, store, fns);
    expect(wrong.ok).toBe(false);
    expect(wrong.mismatches).toContain("activity 0: report is not an algal.foundry.v1 report");
    const missing = await verifyHabitatSchedule(schedule, new MemoryStore(), fns);
    expect(missing.ok).toBe(false);
    expect(missing.mismatches[0]).toStartWith("activity 0: report sha256:");
  });

  test("the config is closed and bounded", () => {
    const config = { contract: "algal.habitat-schedule.config.v1", order: "round-robin", budget: roomy, activities: [{ kind: "search", config: "search.config.json" }] };
    expect(parseHabitatScheduleConfig(config)).toEqual({ order: "round-robin", budget: roomy, activities: [{ kind: "search", config: "search.config.json" }] });
    for (const bad of [
      { ...config, extra: true },
      { ...config, contract: "algal.foundry.config.v1" },
      { ...config, order: "priority" },
      { ...config, budget: { ...roomy, runs: 0 } },
      { ...config, activities: [] },
      { ...config, activities: Array.from({ length: 9 }, () => config.activities[0]) },
      { ...config, activities: [{ kind: "experiment", config: "x.json" }] },
      { ...config, activities: [{ kind: "search", config: "" }] },
      { ...config, activities: [{ kind: "search" }] },
    ]) {
      expect(() => parseHabitatScheduleConfig(bad)).toThrow(AlgalError);
    }
  });
});

describe("foundry schedule command", () => {
  async function cli(...args: string[]) {
    const child = Bun.spawn([process.execPath, "cli.ts", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    return { stdout, stderr, code };
  }

  test("runs, resumes, and verifies a schedule, and refuses an activity with its own budget", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-habitat-schedule-"));
    try {
      for (const [name, manifest] of Object.entries({ constant, echo, generator })) {
        await writeFile(join(dir, `${name}.algal.json`), JSON.stringify(manifestToJson(manifest)));
      }
      await writeFile(join(dir, "foundry.config.json"), JSON.stringify({ contract: "algal.foundry.config.v1", candidates: ["constant.algal.json", "echo.algal.json"], cases }));
      const search = { contract: "algal.foundry.config.v1", generator: { manifest: "generator.algal.json", args: {}, output: "candidates" }, cases, search: { maxGenerations: 2, feedbackInput: "feedback" } };
      await writeFile(join(dir, "search.config.json"), JSON.stringify(search));
      const schedule = (budget: HabitatLimits, config = "search.config.json") => ({
        contract: "algal.habitat-schedule.config.v1", order: "round-robin", budget,
        activities: [{ kind: "foundry", config: "foundry.config.json" }, { kind: "search", config }],
      });
      await writeFile(join(dir, "schedule.json"), JSON.stringify(schedule(roomy)));
      const store = join(dir, "store"), journal = join(dir, "journal"), out = join(dir, "record.json");
      const run = await cli("foundry", "schedule", join(dir, "schedule.json"), "--dir", store, "--journal", journal, "--out", out);
      expect(run.code).toBe(0);
      const record = parseHabitatSchedule(JSON.parse(run.stdout));
      expect(turnsOf(record)).toEqual(RR);
      expect(JSON.parse(await readFile(out, "utf8"))).toEqual(JSON.parse(run.stdout));
      const verified = await cli("foundry", "schedule-verify", out, "--dir", store);
      expect(verified.code).toBe(0);
      expect(JSON.parse(verified.stdout)).toMatchObject({ ok: true, outcome: "complete", mismatches: [] });
      // Running again with the complete journal replays it: same bytes.
      const replayed = await cli("foundry", "schedule", join(dir, "schedule.json"), "--dir", store, "--journal", journal);
      expect(replayed.code).toBe(0);
      expect(replayed.stdout).toBe(run.stdout);
      // Exhaustion writes the record and exits 1.
      await writeFile(join(dir, "tight.json"), JSON.stringify(schedule({ ...roomy, runs: 3 })));
      const tight = await cli("foundry", "schedule", join(dir, "tight.json"), "--dir", store);
      expect(tight.code).toBe(1);
      expect(parseHabitatSchedule(JSON.parse(tight.stdout))).toMatchObject({ outcome: "exhausted", refused: { activity: 1 } });
      // A scheduled config cannot bring its own budget.
      await writeFile(join(dir, "budgeted.config.json"), JSON.stringify({ ...search, budget: roomy }));
      await writeFile(join(dir, "budgeted.json"), JSON.stringify(schedule(roomy, "budgeted.config.json")));
      const budgeted = await cli("foundry", "schedule", join(dir, "budgeted.json"), "--dir", store);
      expect(budgeted.code).toBe(2);
      expect(budgeted.stderr).toContain("schedule budget");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
