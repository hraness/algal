import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { foundryReportRuns, generateFoundryCandidates, runFoundry, type FoundryCase, type FoundryReport } from "./foundry";
import { verifyFoundryReport } from "./foundry-verify";
import {
  HABITAT_BUDGET_BOUNDS, HabitatAccount, parseHabitatBudget, parseHabitatLimits, verifyHabitatBudget,
  type HabitatBudget, type HabitatLimits,
} from "./habitat-budget";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import type { JsonObject, JsonValue } from "./values";

const root = resolve(import.meta.dir, "..");

function pure(key: string, program: JsonValue, maxWork = 1_000): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1", key, name: key,
    budgets: { maxWork, maxAgentCalls: 0 },
    interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "out" } } },
    cells: [
      { id: "src", kind: "input", outputs: { value: "json" } },
      { id: "out", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program }, output: { kind: "json", schema: { type: "string" } } },
    ],
    edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
  });
}

const constant = pure("organism:budget-constant", "a");
const echo = pure("organism:budget-echo", ["get", "value"]);
const cases: FoundryCase[] = [
  { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
  { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
  { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } },
];
const digestOf = (manifest: OrganismManifest): Digest => digestCanonical(manifestToJson(manifest));

async function foundry(limits: HabitatLimits, store = new MemoryStore()) {
  const account = new HabitatAccount("foundry", limits);
  let report: FoundryReport | undefined;
  let error: unknown;
  try {
    report = await runFoundry({ candidates: [constant, echo], cases, fns: builtinRegistry(), store, executors: [], account });
  } catch (caught) {
    error = caught;
  }
  return { account, report, error, store };
}

async function refusal(action: () => unknown): Promise<AlgalError> {
  try {
    await action();
  } catch (error) {
    if (error instanceof AlgalError) return error;
    throw error;
  }
  throw new Error("expected a refusal");
}

describe("habitat account", () => {
  test("reserves declared ceilings, charges recorded work, and closes complete", async () => {
    const store = new MemoryStore();
    await store.putManifest(echo);
    const account = new HabitatAccount("foundry", { work: 2_000, attempts: 0, runs: 2 });
    for (const q of ["x", "y"]) {
      account.reserve(digestOf(echo), echo.budgets);
      const receipt = await runOrganism({ manifest: echo, args: { src: { value: q } }, fns: builtinRegistry(), store, executors: [] });
      account.charge(await store.putReceipt(receipt as unknown as JsonValue), receipt);
    }
    const record = account.record();
    expect(record.outcome).toBe("complete");
    expect(record.refused).toBeNull();
    expect(record.runs.map(run => run.ceiling)).toEqual([{ work: 1_000, attempts: 0 }, { work: 1_000, attempts: 0 }]);
    expect(record.charged.runs).toBe(2);
    expect(record.charged.work).toBe(record.runs[0]!.charged.work + record.runs[1]!.charged.work);
    expect(parseHabitatBudget(JSON.parse(JSON.stringify(record)))).toEqual(record);
    const verified = await verifyHabitatBudget(record, store, builtinRegistry());
    expect(verified).toEqual({ ok: true, digest: digestCanonical(record as unknown as JsonValue), outcome: "complete", checkedReceipts: 2, mismatches: [] });
  });

  test("a refusal is terminal and names every limit it would exceed", async () => {
    const account = new HabitatAccount("search", { work: 1_100, attempts: 0, runs: 1 });
    account.reserve(digestOf(echo), echo.budgets);
    const store = new MemoryStore();
    for (const manifest of [echo, constant]) await store.putManifest(manifest);
    const receipt = await runOrganism({ manifest: echo, args: { src: { value: "x" } }, fns: builtinRegistry(), store, executors: [] });
    account.charge(await store.putReceipt(receipt as unknown as JsonValue), receipt);
    const refused = await refusal(() => account.reserve(digestOf(constant), constant.budgets));
    expect(refused.code).toBe("BUDGET_EXHAUSTED");
    expect(account.exhausted).toBe(true);
    // Terminal: nothing else is admitted, even a reservation that would fit.
    expect((await refusal(() => account.reserve(digestOf(constant), { maxWork: 1, maxAgentCalls: 0 }))).code).toBe("BUDGET_EXHAUSTED");
    const record = account.record();
    expect(record.outcome).toBe("exhausted");
    expect(record.refused).toEqual({ manifest: digestOf(constant), ceiling: { work: 1_000, attempts: 0 }, reasons: ["runs", "work"] });
    expect(record.runs).toHaveLength(1);
    expect((await verifyHabitatBudget(record, store, builtinRegistry())).ok).toBe(true);
  });

  test("executor attempts are charged per provider attempt and refuse past the limit", async () => {
    const agent = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:budget-agent", name: "budget agent",
      budgets: { maxWork: 10_000, maxAgentCalls: 1 },
      cells: [{ id: "ask", kind: "agent", prompt: "fixture", output: { kind: "text" } }],
      edges: [],
    });
    const store = new MemoryStore();
    await store.putManifest(agent);
    const executors = [{ id: "fixture", async execute() { return "ok"; } }];
    const account = new HabitatAccount("experiment", { work: 1_000_000, attempts: 2, runs: 8 });
    for (let i = 0; i < 2; i++) {
      account.reserve(digestOf(agent), agent.budgets);
      const receipt = await runOrganism({ manifest: agent, fns: builtinRegistry(), store, executors });
      expect(receipt.work.agentCalls).toBe(1);
      account.charge(await store.putReceipt(receipt as unknown as JsonValue), receipt);
    }
    expect((await refusal(() => account.reserve(digestOf(agent), agent.budgets))).code).toBe("BUDGET_EXHAUSTED");
    const record = account.record();
    expect(record.charged.attempts).toBe(2);
    expect(record.refused?.reasons).toEqual(["attempts"]);
    expect((await verifyHabitatBudget(record, store, builtinRegistry(), undefined)).checkedReceipts).toBe(2);
  });

  test("a run that exhausts its own maxWork is charged in full", async () => {
    const tight = pure("organism:budget-tight", ["get", "value"], 150);
    const store = new MemoryStore();
    await store.putManifest(tight);
    const account = new HabitatAccount("foundry", { work: 10_000, attempts: 0, runs: 4 });
    account.reserve(digestOf(tight), tight.budgets);
    const receipt = await runOrganism({ manifest: tight, args: { src: { value: "x" } }, fns: builtinRegistry(), store, executors: [] });
    expect(receipt.outcome).toBe("failed");
    expect(receipt.failure?.code).toBe("BUDGET_EXHAUSTED");
    account.charge(await store.putReceipt(receipt as unknown as JsonValue), receipt);
    const record = account.record();
    // The runtime stops a run after the activation that crossed its limit and
    // records that amount; the account never truncates it.
    expect(record.runs[0]!.charged.work).toBe(receipt.work.units);
    expect(record.runs[0]!.charged.work).toBeGreaterThan(record.runs[0]!.ceiling.work);
    expect((await verifyHabitatBudget(record, store, builtinRegistry())).ok).toBe(true);
  });

  test("the account refuses misuse", async () => {
    const account = new HabitatAccount("foundry", { work: 1_000, attempts: 0, runs: 1 });
    const receipt = await runOrganism({ manifest: echo, args: { src: { value: "x" } }, fns: builtinRegistry(), store: new MemoryStore(), executors: [] });
    expect((await refusal(() => account.charge(receipt.digest, receipt))).code).toBe("INTERNAL");
    account.reserve(digestOf(constant), constant.budgets);
    expect((await refusal(() => account.record())).code).toBe("INTERNAL");
    expect((await refusal(() => account.charge(receipt.digest, receipt))).code).toBe("INTERNAL");
    expect((await refusal(() => new HabitatAccount("habitat" as "foundry", { work: 1, attempts: 0, runs: 1 }))).code).toBe("PARSE_FAILED");
    expect((await refusal(() => runFoundry({
      candidates: [echo], cases, fns: builtinRegistry(), store: new MemoryStore(), executors: [],
      account: new HabitatAccount("search", { work: 10_000, attempts: 0, runs: 8 }),
    }))).code).toBe("PARSE_FAILED");
  });
});

describe("habitat budget record", () => {
  const complete = async (): Promise<HabitatBudget> => (await foundry({ work: 5_000, attempts: 0, runs: 5 })).report!.budget!;

  test("limits are closed and bounded", () => {
    expect(parseHabitatLimits({ work: 1, attempts: 0, runs: 1 })).toEqual({ work: 1, attempts: 0, runs: 1 });
    const max = { work: HABITAT_BUDGET_BOUNDS.maxWork, attempts: HABITAT_BUDGET_BOUNDS.maxAttempts, runs: HABITAT_BUDGET_BOUNDS.maxRuns };
    expect(parseHabitatLimits(max)).toEqual(max);
    for (const bad of [
      { work: 0, attempts: 0, runs: 1 },
      { work: 1, attempts: 0, runs: 0 },
      { work: HABITAT_BUDGET_BOUNDS.maxWork + 1, attempts: 0, runs: 1 },
      { work: 1, attempts: HABITAT_BUDGET_BOUNDS.maxAttempts + 1, runs: 1 },
      { work: 1, attempts: 0, runs: HABITAT_BUDGET_BOUNDS.maxRuns + 1 },
      { work: 1.5, attempts: 0, runs: 1 },
      { work: 1, attempts: -1, runs: 1 },
      { work: 1, attempts: 0 },
      { work: 1, attempts: 0, runs: 1, extra: 1 },
      [1, 0, 1],
      null,
    ]) {
      expect(() => parseHabitatLimits(bad)).toThrow(AlgalError);
    }
  });

  test("rejects records whose arithmetic or shape does not hold", async () => {
    const record = await complete();
    const exhausted = (await foundry({ work: 5_000, attempts: 0, runs: 3 })).account.record();
    const edit = (base: HabitatBudget, change: (value: JsonObject) => void): JsonObject => {
      const value = JSON.parse(JSON.stringify(base)) as JsonObject;
      change(value);
      return value;
    };
    const runsOf = (value: JsonObject) => value.runs as JsonObject[];
    const bad: [string, JsonObject][] = [
      ["unknown field", edit(record, v => { v.extra = true; })],
      ["missing field", edit(record, v => { delete v.refused; })],
      ["contract", edit(record, v => { v.contract = "algal.habitat-budget.v2"; })],
      ["activity", edit(record, v => { v.activity = "habitat"; })],
      ["runs beyond limits", edit(record, v => { (v.limits as JsonObject).runs = 4; })],
      ["totals", edit(record, v => { (v.charged as JsonObject).work = 1; })],
      ["admitted beyond limits", edit(record, v => { (v.limits as JsonObject).work = 1_200; })],
      ["charge above attempt ceiling", edit(record, v => { (runsOf(v)[0]!.charged as JsonObject).attempts = 1; (v.charged as JsonObject).attempts = 1; (v.limits as JsonObject).attempts = 5; })],
      ["ceiling bound", edit(record, v => { (runsOf(v)[0]!.ceiling as JsonObject).work = 100_000_001; })],
      ["digest", edit(record, v => { runsOf(v)[0]!.receipt = "sha256:ABC"; })],
      ["complete with refusal", edit(record, v => { v.refused = (exhausted.refused as unknown as JsonObject); })],
      ["outcome", edit(record, v => { v.outcome = "partial"; })],
      ["exhausted without refusal", edit(exhausted, v => { v.refused = null; })],
      ["wrong reasons", edit(exhausted, v => { (v.refused as JsonObject).reasons = ["work"]; })],
      ["unsorted reasons", edit(exhausted, v => { (v.refused as JsonObject).reasons = ["runs", "runs"]; })],
      ["refusal that fits", edit(exhausted, v => { (v.limits as JsonObject).runs = 4; })],
    ];
    for (const [name, value] of bad) {
      expect(() => parseHabitatBudget(value), name).toThrow(AlgalError);
    }
    expect(parseHabitatBudget(JSON.parse(JSON.stringify(exhausted)))).toEqual(exhausted);
  });
});

describe("foundry under a habitat budget", () => {
  test("a complete foundry embeds its account and verifies it against the report's runs", async () => {
    const { report, error, store } = await foundry({ work: 5_000, attempts: 0, runs: 5 });
    expect(error).toBeUndefined();
    const budget = report!.budget!;
    expect(budget.outcome).toBe("complete");
    expect(budget.runs.map(({ manifest, receipt }) => ({ manifest, receipt }))).toEqual(foundryReportRuns(report!));
    expect(budget.runs.map(run => run.manifest)).toEqual([digestOf(constant), digestOf(constant), digestOf(echo), digestOf(echo), digestOf(echo)]);
    const verified = await verifyFoundryReport(report, store, builtinRegistry());
    expect(verified.ok).toBe(true);
    expect(verified.checkedReceipts).toBe(5);

    // Rebind the digest so only the budget evidence is under test.
    const redigest = (value: FoundryReport): FoundryReport => {
      const { digest: _digest, ...base } = value;
      return { ...base, digest: digestCanonical(base as unknown as JsonValue) };
    };
    const swapped = structuredClone(report!);
    const runs = swapped.budget!.runs;
    [runs[1], runs[2]] = [runs[2]!, runs[1]!];
    const reordered = await verifyFoundryReport(redigest(swapped), store, builtinRegistry());
    expect(reordered.ok).toBe(false);
    expect(reordered.mismatches).toContain("budget run 1 is not the foundry's run 1");

    const widened = structuredClone(report!);
    widened.budget!.limits.work = 6_000;
    widened.budget!.runs[0]!.ceiling.work = 2_000;
    const ceiling = await verifyFoundryReport(redigest(widened), store, builtinRegistry());
    expect(ceiling.mismatches).toContain("budget run 0: ceiling differs from its manifest");

    const recharged = structuredClone(report!);
    recharged.budget!.runs[4]!.charged.work += 1;
    recharged.budget!.charged.work += 1;
    const charge = await verifyFoundryReport(redigest(recharged), store, builtinRegistry());
    expect(charge.mismatches).toContain("budget run 4: charge differs from its receipt");

    // A report without a budget keeps its original bytes and digest.
    const plain = await runFoundry({ candidates: [constant, echo], cases, fns: builtinRegistry(), store: new MemoryStore(), executors: [] });
    expect("budget" in plain).toBe(false);
    const { budget: _budget, digest: _digest, ...base } = report!;
    expect(plain.digest).toBe(digestCanonical(base as unknown as JsonValue));
  });

  test("exhaustion stops admitting runs and leaves a terminal record, not a report", async () => {
    const { account, report, error, store } = await foundry({ work: 1_300, attempts: 0, runs: 5 });
    expect(report).toBeUndefined();
    expect((error as AlgalError).code).toBe("BUDGET_EXHAUSTED");
    const record = account.record();
    expect(record.outcome).toBe("exhausted");
    // The losing candidate spent the budget; the winner never ran.
    expect(record.runs.map(run => run.manifest)).toEqual([digestOf(constant), digestOf(constant)]);
    expect(record.refused).toEqual({ manifest: digestOf(echo), ceiling: { work: 1_000, attempts: 0 }, reasons: ["work"] });
    for (const run of record.runs) expect(await store.getReceipt(run.receipt)).toBeDefined();
    const verified = await verifyHabitatBudget(record, store, builtinRegistry());
    expect(verified).toMatchObject({ ok: true, outcome: "exhausted", checkedReceipts: 2, mismatches: [] });
    const missing = await verifyHabitatBudget(record, new MemoryStore(), builtinRegistry());
    expect(missing.ok).toBe(false);
    expect(missing.mismatches).toContain(`budget run 0: manifest ${digestOf(constant)} missing`);
  });

  test("the generator run is admitted first and charged to the same account", async () => {
    const generator = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:budget-generator", name: "budget generator",
      budgets: { maxWork: 2_000, maxAgentCalls: 0 },
      interface: { inputs: {}, outputs: { candidates: { cell: "out", port: "out" } } },
      cells: [{ id: "out", kind: "expr", inputs: {}, expr: { contract: "algal.expr.v1", program: ["quote", [manifestToJson(echo)]] }, output: { kind: "json", schema: { type: "array" } } }],
      edges: [],
    });
    const store = new MemoryStore();
    const account = new HabitatAccount("foundry", { work: 3_000, attempts: 0, runs: 6 });
    const generated = await generateFoundryCandidates({ generator, args: {}, output: "candidates", fns: builtinRegistry(), store, executors: [], account });
    const report = await runFoundry({
      candidates: [constant, ...generated.candidates], cases, fns: builtinRegistry(), store, executors: [], account,
      lineage: { generatorDigest: generated.generatorDigest, receiptDigest: generated.receiptDigest },
    });
    expect(report.budget!.runs[0]).toMatchObject({ manifest: generated.generatorDigest, receipt: generated.receiptDigest, ceiling: { work: 2_000, attempts: 0 } });
    expect(report.budget!.runs).toHaveLength(6);
    expect((await verifyFoundryReport(report, store, builtinRegistry())).ok).toBe(true);

    // A generator whose ceiling does not fit is refused before it runs.
    const small = new HabitatAccount("foundry", { work: 1_999, attempts: 0, runs: 6 });
    const refused = await refusal(() => generateFoundryCandidates({ generator, args: {}, output: "candidates", fns: builtinRegistry(), store, executors: [], account: small }));
    expect(refused.code).toBe("BUDGET_EXHAUSTED");
    expect(small.record()).toMatchObject({ runs: [], outcome: "exhausted", refused: { manifest: generated.generatorDigest, reasons: ["work"] } });
  });
});

describe("foundry command", () => {
  async function cli(...args: string[]) {
    const child = Bun.spawn([process.execPath, "cli.ts", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    return { stdout, stderr, code };
  }

  test("the bundled budget example exhausts, writes its record, and verifies", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-habitat-budget-"));
    try {
      const out = join(dir, "record.json");
      const run = await cli("foundry", "examples/foundry-budget.config.json", "--dir", dir, "--out", out);
      expect(run.code).toBe(1);
      const record = parseHabitatBudget(JSON.parse(run.stdout));
      expect(JSON.parse(await readFile(out, "utf8"))).toEqual(JSON.parse(run.stdout));
      expect(record).toMatchObject({ activity: "foundry", outcome: "exhausted", charged: { runs: 5 }, refused: { reasons: ["runs"] } });
      const verified = await cli("foundry", "verify", out, "--dir", dir);
      expect(verified.code).toBe(0);
      expect(JSON.parse(verified.stdout)).toMatchObject({ ok: true, outcome: "exhausted", checkedReceipts: 5 });

      // Raising the run limit lets the same activity complete with a report.
      const config = JSON.parse(await readFile(join(root, "examples/foundry-budget.config.json"), "utf8")) as JsonObject;
      const roomy = join(dir, "roomy.config.json");
      await writeFile(roomy, JSON.stringify({
        ...config,
        candidates: (config.candidates as string[]).map(path => join(root, "examples", path)),
        budget: { ...(config.budget as JsonObject), runs: 7 },
      }));
      const complete = await cli("foundry", roomy, "--dir", dir, "--out", join(dir, "report.json"));
      expect(complete.code).toBe(0);
      expect(JSON.parse(complete.stdout).budget).toMatchObject({ outcome: "complete", charged: { runs: 7 } });
      expect((await cli("foundry", "verify", join(dir, "report.json"), "--dir", dir)).code).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("a budgeted search writes its report or its exhausted account, and search-verify checks either", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-search-budget-"));
    try {
      // The generator proposes the echo once feedback exists.
      const generator = join(dir, "generator.algal.json");
      await writeFile(generator, JSON.stringify(manifestToJson(parseOrganismManifest({
        contract: "algal.organism.v1", key: "organism:budget-search-generator", name: "budget search generator",
        budgets: { maxWork: 2_000, maxAgentCalls: 0 },
        interface: { inputs: { feedback: { cell: "src", port: "value" } }, outputs: { candidates: { cell: "out", port: "out" } } },
        cells: [
          { id: "src", kind: "input", outputs: { value: "json" } },
          { id: "out", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program: ["if", ["eq", ["get", "value"], null], ["quote", [manifestToJson(constant)]], ["quote", [manifestToJson(echo)]]] }, output: { kind: "json", schema: { type: "array" } } },
        ],
        edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
      }))));
      const config = (runs: number) => ({
        contract: "algal.foundry.config.v1", generator: { manifest: generator, args: {}, output: "candidates" },
        cases, search: { maxGenerations: 2, feedbackInput: "feedback" }, budget: { work: 100_000, attempts: 0, runs },
      });
      const roomy = join(dir, "roomy.config.json");
      await writeFile(roomy, JSON.stringify(config(64)));
      const complete = await cli("foundry", "search", roomy, "--dir", dir, "--out", join(dir, "search.json"));
      expect(complete.code).toBe(0);
      expect(JSON.parse(complete.stdout)).toMatchObject({ contract: "algal.search.v1", budget: { activity: "search", outcome: "complete", charged: { runs: 11 } } });
      const verified = await cli("foundry", "search-verify", join(dir, "search.json"), "--dir", dir);
      expect(verified.code).toBe(0);

      const tight = join(dir, "tight.config.json");
      await writeFile(tight, JSON.stringify(config(4)));
      const out = join(dir, "record.json");
      const exhausted = await cli("foundry", "search", tight, "--dir", dir, "--out", out);
      expect(exhausted.code).toBe(1);
      expect(parseHabitatBudget(JSON.parse(exhausted.stdout))).toMatchObject({ activity: "search", outcome: "exhausted", charged: { runs: 4 }, refused: { reasons: ["runs"] } });
      expect(JSON.parse(await readFile(out, "utf8"))).toEqual(JSON.parse(exhausted.stdout));
      const replayed = await cli("foundry", "search-verify", out, "--dir", dir);
      expect(replayed.code).toBe(0);
      expect(JSON.parse(replayed.stdout)).toMatchObject({ ok: true, outcome: "exhausted", checkedReceipts: 4 });
      // A foundry's record is not a search's.
      const foundryRecord = await cli("foundry", "examples/foundry-budget.config.json", "--dir", dir, "--out", join(dir, "foundry-record.json"));
      expect(foundryRecord.code).toBe(1);
      const wrong = await cli("foundry", "search-verify", join(dir, "foundry-record.json"), "--dir", dir);
      expect(wrong.code).toBe(1);
      expect(JSON.parse(wrong.stdout).mismatches[0]).toBe("budget activity is not search");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

test("a run that fails before a receipt releases its reservation so the account stays usable", async () => {
  const broken = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:broken", name: "broken", budgets: { maxWork: 1_000, maxAgentCalls: 0 },
    interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "child", port: "result" } } },
    cells: [{ id: "src", kind: "input", outputs: { value: "json" } }, { id: "child", kind: "organism", manifest: `sha256:${"0".repeat(64)}` }],
    edges: [],
  });
  const account = new HabitatAccount("foundry", { work: 10_000, attempts: 0, runs: 8 });
  const store = new MemoryStore();
  const error = await refusal(() => runFoundry({ candidates: [constant, broken], cases, fns: builtinRegistry(), store, executors: [], account }));
  expect(error.code).toBe("STORE_MISS");
  const record = account.record();
  expect(record.outcome).toBe("complete");
  expect(record.runs.length).toBeGreaterThan(0);
  expect(record.runs.map(run => run.manifest)).not.toContain(digestOf(broken));
  expect(record.charged.runs).toBe(record.runs.length);
  expect(account.exhausted).toBe(false);
});

test("release clears an open reservation without a charge and refuses without one", () => {
  const account = new HabitatAccount("foundry", { work: 1_000, attempts: 0, runs: 1 });
  account.reserve(digestOf(constant), constant.budgets);
  expect(() => account.record()).toThrow(/still open/);
  account.release();
  expect(account.record().runs).toEqual([]);
  expect(() => account.release()).toThrow(/no reservation to release/);
  account.reserve(digestOf(constant), constant.budgets);
  account.release();
  expect(account.record().charged).toEqual({ work: 0, attempts: 0, runs: 0 });
});
