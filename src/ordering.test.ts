// Tests for the bounded ordering explorer: algal.ordering-scenario.v1
// intake and algal.ordering-report.v1 evidence.
//
// The fixture is two processes waiting on the same one-message mailbox:
// delivery order decides which process completes, so the schedule is real
// evidence, not a simulation.

import { describe, expect, test } from "bun:test";
import { digestCanonical } from "./digest";
import { canonicalize, type JsonObject, type JsonValue } from "./values";
import {
  ORDERING_BOUNDS,
  ORDERING_REPORT_CONTRACT,
  ORDERING_SCENARIO_CONTRACT,
  exploreOrdering,
  parseOrderingReport,
  parseOrderingScenario,
} from "./ordering";

const budgets = {
  maxSteps: 16,
  maxAgentCalls: 4,
  maxWork: 10_000,
  maxContextBytes: 8192,
  maxOutputBytes: 8192,
  maxDepth: 2,
};

/** A process that waits on a mailbox capability and completes with the
 * delivered message body. */
const waiter: JsonValue = {
  contract: "algal.organism.v1",
  key: "organism:waiter",
  name: "Waiter",
  cells: [
    {
      id: "inbox",
      kind: "input",
      outputs: { mailbox: { type: "cap", capability: "mailbox-receive" } },
    },
    { id: "take", kind: "tool", tool: "mailbox.receive.v1" },
  ],
  edges: [
    {
      from: { cell: "inbox", port: "mailbox" },
      to: { cell: "take", port: "mailbox" },
    },
  ],
  budgets,
};

const expr = (program: JsonValue): JsonValue => ({
  contract: "algal.expr.v1",
  program,
});

const ALL_COMPLETE = [
  "and",
  ["eq", ["get", "processes", "alpha", "status"], "complete"],
  ["eq", ["get", "processes", "beta", "status"], "complete"],
];
const ALPHA_COMPLETE = ["eq", ["get", "processes", "alpha", "status"], "complete"];

/** Two waiters racing for a single delivery on one mailbox. */
function raceScenario(program: JsonValue): JsonValue {
  return {
    contract: ORDERING_SCENARIO_CONTRACT,
    mailboxes: [{ name: "inbox", maxMessages: 4, maxMessageBytes: 1024 }],
    processes: [
      {
        name: "alpha",
        manifest: waiter,
        args: { inbox: { mailbox: "mailbox:inbox:receive" } },
      },
      {
        name: "beta",
        manifest: waiter,
        args: { inbox: { mailbox: "mailbox:inbox:receive" } },
      },
    ],
    sends: [{ mailbox: "inbox", value: "go", key: digestCanonical({ k: 1 }) }],
    invariant: expr(program),
    limits: { orderings: 16, depth: 12, work: 1_000_000, attempts: 64, runs: 64 },
  };
}

describe("algal.ordering-report.v1", () => {
  test("order matters: two waiters, one delivery — orderings differ", async () => {
    const { report } = await exploreOrdering(raceScenario(true));
    expect(report.contract).toBe(ORDERING_REPORT_CONTRACT);
    expect(report.outcome).toBe("complete");
    expect(report.counterexample).toBeNull();
    expect(report.orderings.length).toBeGreaterThanOrEqual(2);

    // not every ordering reaches the same terminal state
    const profiles = new Set(
      report.orderings.map((row) => canonicalize(row.processes)),
    );
    expect(profiles.size).toBeGreaterThan(1);

    // each row names the actions it took and a settled status per process
    for (const row of report.orderings) {
      expect(row.actions.length).toBeGreaterThan(0);
      for (const proc of row.processes) {
        expect([
          "ready",
          "suspended",
          "complete",
          "failed",
          "stuck",
        ]).toContain(proc.status);
      }
    }
    // every ordering's dispatches are charged to the closed account
    expect(report.account.contract).toBe("algal.habitat-budget.v1");
    expect(report.account.runs.length).toBeGreaterThan(0);
  });

  test("counterexample: the witness is the first failing ordering", async () => {
    const { report } = await exploreOrdering(raceScenario(ALPHA_COMPLETE));
    // some ordering lets beta take the only message
    expect(report.outcome).toBe("counterexample");
    expect(report.counterexample).not.toBeNull();
    const witness = report.orderings[report.counterexample!]!;
    expect(witness.invariant).toBe(false);
    const beta = witness.processes.find((proc) => proc.name === "beta");
    const alpha = witness.processes.find((proc) => proc.name === "alpha");
    expect(beta?.status).toBe("complete");
    expect(alpha?.status).not.toBe("complete");
    // no earlier row already failed — the parser enforces the same rule
    for (let i = 0; i < report.counterexample!; i++) {
      expect(report.orderings[i]!.invariant).not.toBe(false);
    }
  });

  test("order does not matter: two mailboxes, one waiter each", async () => {
    const scenario: JsonValue = {
      contract: ORDERING_SCENARIO_CONTRACT,
      mailboxes: [
        { name: "inbox-a", maxMessages: 4, maxMessageBytes: 1024 },
        { name: "inbox-b", maxMessages: 4, maxMessageBytes: 1024 },
      ],
      processes: [
        {
          name: "alpha",
          manifest: waiter,
          args: { inbox: { mailbox: "mailbox:inbox-a:receive" } },
        },
        {
          name: "beta",
          manifest: waiter,
          args: { inbox: { mailbox: "mailbox:inbox-b:receive" } },
        },
      ],
      sends: [
        { mailbox: "inbox-a", value: "for-a", key: digestCanonical({ k: "a" }) },
        { mailbox: "inbox-b", value: "for-b", key: digestCanonical({ k: "b" }) },
      ],
      invariant: expr(ALL_COMPLETE),
      limits: {
        orderings: 64,
        depth: 12,
        work: 1_000_000_000,
        attempts: 4096,
        runs: 4096,
      },
    };
    const { report } = await exploreOrdering(scenario);
    expect(report.outcome).toBe("complete");
    expect(report.orderings.length).toBeGreaterThanOrEqual(2);
    for (const row of report.orderings) {
      expect(row.invariant).toBe(true);
      for (const proc of row.processes) {
        expect(proc.status).toBe("complete");
      }
    }
  });

  test("deterministic construction: two explorations produce identical reports", async () => {
    const scenario = raceScenario(ALL_COMPLETE);
    const a = await exploreOrdering(scenario);
    const b = await exploreOrdering(scenario);
    // byte-identical canonical evidence: same orderings, same receipts
    expect(JSON.stringify(b.report)).toBe(JSON.stringify(a.report));
    // in the race every leaf leaves one waiter suspended, so the all-complete
    // invariant fails — the exploration stops at the first failure
    expect(a.report.outcome).toBe("counterexample");
    const witness = a.report.orderings[a.report.counterexample!]!;
    expect(witness.invariant).toBe(false);
  });

  test("habitat exhaustion is recorded, not silent", async () => {
    const base = raceScenario(true) as Record<string, JsonValue>;
    const report = (
      await exploreOrdering({
        ...base,
        limits: { ...(base.limits as JsonObject), runs: 1 },
      })
    ).report;
    expect(report.outcome).toBe("exhausted");
    expect(report.exhaustion?.reason).toBe("budget");
    // the partial ordering is recorded with the actions it took
    expect(report.orderings.length).toBeGreaterThan(0);
    expect(report.account.outcome).toBe("exhausted");
    expect(report.account.refused).not.toBeNull();
  });

  test("the ordering bound is recorded as exhaustion", async () => {
    const base = raceScenario(true) as Record<string, JsonValue>;
    const report = (
      await exploreOrdering({
        ...base,
        limits: { ...(base.limits as JsonObject), orderings: 1 },
      })
    ).report;
    expect(report.outcome).toBe("exhausted");
    expect(report.exhaustion?.reason).toBe("orderings");
    expect(report.orderings.length).toBe(1);
  });

  test("a tampered or oversized report is refused", () => {
    const digest = `sha256:${"a".repeat(64)}`;
    const ok: JsonValue = {
      contract: ORDERING_REPORT_CONTRACT,
      scenario: digest,
      limits: {
        orderings: 4,
        depth: 12,
        work: 1_000_000,
        attempts: 64,
        runs: 4,
      },
      orderings: [],
      counterexample: null,
      outcome: "complete",
      exhaustion: null,
      account: {
        contract: "algal.habitat-budget.v1",
        activity: "experiment",
        limits: { work: 1_000_000, attempts: 64, runs: 4 },
        runs: [],
        charged: { work: 0, attempts: 0, runs: 0 },
        outcome: "complete",
        refused: null,
      },
    };
    const parsed = parseOrderingReport(ok);
    expect(parsed.outcome).toBe("complete");

    // forged contract
    expect(() =>
      parseOrderingReport({ ...ok, contract: "algal.other.v1" }),
    ).toThrow();
    // forged outcome word
    expect(() => parseOrderingReport({ ...ok, outcome: "maybe" })).toThrow();
    // unknown key
    expect(() => parseOrderingReport({ ...ok, extra: 1 })).toThrow();
    // a counterexample must name a failing ordering
    const row = {
      actions: ["tick:alpha"],
      quiescent: true,
      invariant: true,
      processes: [
        { name: "alpha", status: "complete", generation: 1, receipt: digest },
      ],
      mailboxes: [{ name: "inbox", pending: 0, delivered: 1 }],
    };
    expect(() =>
      parseOrderingReport({ ...ok, orderings: [row], counterexample: 0 }),
    ).toThrow();
    // an exhausted outcome requires its record
    expect(() =>
      parseOrderingReport({ ...ok, outcome: "exhausted" }),
    ).toThrow();
    // oversized ordering list: more rows than the declared bound
    const tooMany = {
      ...ok,
      limits: { orderings: 1, depth: 12, work: 1_000_000, attempts: 64, runs: 4 },
      orderings: [row, row],
    };
    expect(() => parseOrderingReport(tooMany)).toThrow();
  });

  test("scenario parse rejects malformed input", async () => {
    await expect(parseOrderingScenario({ contract: "nope" })).rejects.toThrow();
    const base = raceScenario(true) as Record<string, JsonValue>;

    // unknown mailbox marker
    await expect(
      parseOrderingScenario({
        ...base,
        processes: [
          {
            name: "alpha",
            manifest: waiter,
            args: { inbox: { mailbox: "mailbox:nope:receive" } },
          },
        ],
      }),
    ).rejects.toThrow();

    // duplicate send idempotency keys in one mailbox
    const dup = digestCanonical({ dup: true });
    await expect(
      parseOrderingScenario({
        ...base,
        sends: [
          { mailbox: "inbox", value: "one", key: dup },
          { mailbox: "inbox", value: "two", key: dup },
        ],
      }),
    ).rejects.toThrow();

    // the invariant must be an algal.expr.v1 envelope
    await expect(
      parseOrderingScenario({ ...base, invariant: "true" }),
    ).rejects.toThrow();
    // an invariant over names outside its environment fails admission
    await expect(
      parseOrderingScenario({
        ...base,
        invariant: expr(["get", "nope"]),
      }),
    ).rejects.toThrow();

    // process count beyond the bound
    const many = Array.from(
      { length: ORDERING_BOUNDS.maxProcesses + 1 },
      (_, i) => ({
        name: `p${i}`,
        manifest: waiter,
        args: { inbox: { mailbox: "mailbox:inbox:receive" } },
      }),
    );
    await expect(
      parseOrderingScenario({ ...base, processes: many }),
    ).rejects.toThrow();
  });
});
