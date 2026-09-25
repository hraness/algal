import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import type { FoundryCase } from "./foundry";
import { HabitatAccount, verifyHabitatBudget, type HabitatLimits } from "./habitat-budget";
import { builtinRegistry } from "./registry";
import { runFoundrySearch, searchReportRuns, type SearchReport } from "./search";
import { verifySearchReport } from "./search-verify";
import { MemoryStore } from "./store";
import type { JsonValue } from "./values";

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

const constant = pure("organism:search-constant", "a");
const echo = pure("organism:search-echo", ["get", "value"]);
// Proposes the constant before any feedback exists and the echo afterwards,
// so the second generation evaluates both and the echo wins.
const generator = parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:search-generator", name: "search generator",
  budgets: { maxWork: 2_000, maxAgentCalls: 0 },
  interface: { inputs: { feedback: { cell: "src", port: "value" } }, outputs: { candidates: { cell: "out", port: "out" } } },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    {
      id: "out", kind: "expr", inputs: { value: "json" },
      expr: { contract: "algal.expr.v1", program: ["if", ["eq", ["get", "value"], null], ["quote", [manifestToJson(constant)]], ["quote", [manifestToJson(echo)]]] },
      output: { kind: "json", schema: { type: "array" } },
    },
  ],
  edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
});
const cases: FoundryCase[] = [
  { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
  { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
  { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } },
];
const digestOf = (manifest: OrganismManifest): Digest => digestCanonical(manifestToJson(manifest));

async function search(account?: HabitatAccount, store = new MemoryStore()) {
  let report: SearchReport | undefined;
  let error: unknown;
  try {
    report = await runFoundrySearch({
      generator, generatorArgs: {}, feedbackInput: "feedback", output: "candidates", cases, maxGenerations: 2,
      fns: builtinRegistry(), store, executors: [], ...(account ? { account } : {}),
    });
  } catch (caught) {
    error = caught;
  }
  return { report, error, store };
}

// Rebind the digest so only the budget evidence is under test.
function redigest(value: SearchReport): SearchReport {
  const { digest: _digest, ...base } = value;
  return { ...base, digest: digestCanonical(base as unknown as JsonValue) };
}

describe("search under a habitat budget", () => {
  test("one account charges every generator, candidate, and final run, and the report embeds it", async () => {
    const account = new HabitatAccount("search", { work: 100_000, attempts: 0, runs: 64 });
    const { report, error, store } = await search(account);
    expect(error).toBeUndefined();
    const budget = report!.budget!;
    expect(budget).toMatchObject({ activity: "search", outcome: "complete", refused: null });
    // Generation 0: generator, constant x2. Generation 1: generator, constant
    // x2, echo x2. Final epoch: echo x2 and one holdout run.
    const G = digestOf(generator), C = digestOf(constant), E = digestOf(echo);
    expect(budget.runs.map(run => run.manifest)).toEqual([G, C, C, G, C, C, E, E, E, E, E]);
    expect(budget.runs.map(({ manifest, receipt }) => ({ manifest, receipt }))).toEqual(searchReportRuns(report!));
    expect(budget.runs[0]!.ceiling).toEqual({ work: 2_000, attempts: 0 });
    // The final epoch never carries its own account.
    expect("budget" in report!.result).toBe(false);
    const verified = await verifySearchReport(report, store, builtinRegistry());
    expect(verified.mismatches).toEqual([]);
    expect(verified.ok).toBe(true);

    // A search without a budget keeps its bytes: the same report minus the
    // account, under the digest of the remaining fields.
    const plain = (await search()).report!;
    expect("budget" in plain).toBe(false);
    const { budget: _budget, digest: _digest, ...base } = report!;
    expect(plain.digest).toBe(digestCanonical(base as unknown as JsonValue));
    expect(plain.result).toEqual(report!.result);
  });

  test("verification rejects an account that does not bind the search", async () => {
    const { report, store } = await search(new HabitatAccount("search", { work: 100_000, attempts: 0, runs: 64 }));
    const reject = async (change: (value: SearchReport) => void, mismatch: string) => {
      const tampered = structuredClone(report!);
      change(tampered);
      const verified = await verifySearchReport(redigest(tampered), store, builtinRegistry());
      expect(verified.ok).toBe(false);
      expect(verified.mismatches).toContain(mismatch);
    };
    await reject(value => {
      const runs = value.budget!.runs;
      [runs[1], runs[3]] = [runs[3]!, runs[1]!];
    }, "budget run 1 is not the search's run 1");
    await reject(value => {
      value.budget!.runs[4]!.charged.work += 1;
      value.budget!.charged.work += 1;
    }, "budget run 4: charge differs from its receipt");
    await reject(value => { value.budget!.activity = "foundry"; }, "budget activity is not search");
    await reject(value => { value.result = { ...value.result, budget: value.budget! }; }, "result: the final foundry report carries a budget");
  });

  test("exhaustion stops the search and leaves an exhausted account, never a report", async () => {
    // Runs limit 4: generation 0 takes three runs and generation 1's generator
    // the fourth, so the constant's next case is refused.
    const scenarios: [HabitatLimits, number, OrganismManifest, string[]][] = [
      [{ work: 100_000, attempts: 0, runs: 4 }, 4, constant, ["runs"]],
      // Eight runs finish both generations; the final epoch is refused.
      [{ work: 100_000, attempts: 0, runs: 8 }, 8, echo, ["runs"]],
      // The first generator's ceiling does not fit, so nothing runs.
      [{ work: 1_999, attempts: 0, runs: 64 }, 0, generator, ["work"]],
    ];
    for (const [limits, listed, refused, reasons] of scenarios) {
      const account = new HabitatAccount("search", limits);
      const { report, error, store } = await search(account);
      expect(report).toBeUndefined();
      expect((error as AlgalError).code).toBe("BUDGET_EXHAUSTED");
      expect(account.exhausted).toBe(true);
      const record = account.record();
      expect(record).toMatchObject({ activity: "search", outcome: "exhausted", refused: { manifest: digestOf(refused), reasons } });
      expect(record.runs).toHaveLength(listed);
      const verified = await verifyHabitatBudget(record, store, builtinRegistry(), undefined, "search");
      expect(verified).toMatchObject({ ok: true, outcome: "exhausted", checkedReceipts: listed, mismatches: [] });
    }
  });

  test("a search runs only under a search account, and search-verify expects one", async () => {
    const { error } = await search(new HabitatAccount("foundry", { work: 100_000, attempts: 0, runs: 64 }));
    expect((error as AlgalError).code).toBe("PARSE_FAILED");
    const store = new MemoryStore();
    const foundryAccount = new HabitatAccount("foundry", { work: 1, attempts: 0, runs: 1 });
    expect(() => foundryAccount.reserve(digestOf(echo), echo.budgets)).toThrow(AlgalError);
    const verified = await verifyHabitatBudget(foundryAccount.record(), store, builtinRegistry(), undefined, "search");
    expect(verified.ok).toBe(false);
    expect(verified.mismatches[0]).toBe("budget activity is not search");
  });
});
