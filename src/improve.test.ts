import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import {
  IMPROVE_CONTRACT,
  improveReportRuns,
  runImprovement,
  type ImproveCase,
} from "./improve";
import { parseEvaluationEvidence, verifyPromotionDecision } from "./host-contract";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import type { JsonValue } from "./values";

const candidate = (value: string) =>
  parseOrganismManifest({
    contract: "algal.organism.v1",
    key: `organism:answer-${value}`,
    name: `Answer ${value}`,
    interface: {
      inputs: { q: { cell: "src", port: "value" } },
      outputs: { answer: { cell: "out", port: "value" } },
    },
    cells: [
      { id: "src", kind: "input", outputs: { value: "json" } },
      { id: "out", kind: "const", outputs: { value: { type: "json", value } } },
    ],
    edges: [],
  });

const generator = () =>
  parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:test-generator",
    name: "Test generator",
    interface: {
      inputs: {
        labeled: { cell: "src", port: "labeled" },
        feedback: { cell: "src", port: "feedback" },
      },
      outputs: { candidates: { cell: "gen", port: "candidates" } },
    },
    cells: [
      { id: "src", kind: "input", outputs: { labeled: "json", feedback: "json" } },
      { id: "gen", kind: "fn", fn: "test.improve-gen.v1" },
    ],
    edges: [
      { from: { cell: "src", port: "labeled" }, to: { cell: "gen", port: "labeled" } },
      { from: { cell: "src", port: "feedback" }, to: { cell: "gen", port: "feedback" } },
    ],
  });

const GEN_FN = "test.improve-gen.v1";

function fns() {
  const reg = builtinRegistry();
  reg.set(GEN_FN, {
    signature: {
      inputs: {
        labeled: { type: "json", optional: true },
        feedback: { type: "json", optional: true },
      },
      outputs: { candidates: { type: "json" } },
      cost: 1,
    },
    fn: (inputs) => {
      let answer = "a";
      const labeled = inputs.labeled as { cases?: { expect?: { answer?: string } }[] } | null | undefined;
      const expected = labeled?.cases?.[0]?.expect?.answer;
      if (typeof expected === "string") answer = expected;
      const feedback = inputs.feedback as
        | { candidates?: { cases?: { feedback?: string | null }[] }[] }
        | null
        | undefined;
      for (const c of feedback?.candidates ?? []) {
        for (const cs of c.cases ?? []) {
          const m = /expected (\{[^}]*\}), got/.exec(cs.feedback ?? "");
          if (m) {
            const parsed = JSON.parse(m[1]!) as { answer?: string };
            if (typeof parsed.answer === "string") answer = parsed.answer;
          }
        }
      }
      return { candidates: [generatedCandidate(answer) as unknown as JsonValue] };
    },
  });
  return reg;
}

const generatedCandidate = (value: string) => ({
  contract: "algal.organism.v1",
  key: `organism:generated-${value}`,
  name: `Generated ${value}`,
  interface: {
    inputs: { q: { cell: "src", port: "value" } },
    outputs: { answer: { cell: "out", port: "value" } },
  },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value } } },
  ],
  edges: [],
});

const cases: ImproveCase[] = [
  { id: "t1", split: "train", group: "tr-a", args: { q: "?" }, expect: { answer: "b" } },
  { id: "t2", split: "train", group: "tr-b", args: { q: "!" }, expect: { answer: "b" } },
  { id: "v1", split: "validation", group: "va-a", args: { q: "." }, expect: { answer: "b" } },
  { id: "v2", split: "validation", group: "va-b", args: { q: "," }, expect: { answer: "b" } },
  { id: "h1", split: "holdout", group: "ho-a", args: { q: "x" }, expect: { answer: "b" } },
  { id: "h2", split: "holdout", group: "ho-b", args: { q: "y" }, expect: { answer: "b" } },
  { id: "h3", split: "holdout", group: "ho-c", args: { q: "z" }, expect: { answer: "b" } },
];

const labels = {
  provenance: "hand-written suite expectations",
  redactionPolicy: "none",
  independent: true,
};

describe("improve", () => {
  test("compares fixed, labeled and feedback arms and exports a decisive winner", async () => {
    const store = new MemoryStore();
    const result = await runImprovement({
      incumbent: candidate("a"),
      arms: [
        { kind: "fixed", name: "fixed", candidates: [candidate("a"), candidate("b")] },
        { kind: "labeled", name: "labeled", generator: generator(), generatorArgs: {}, labeledInput: "labeled", output: "candidates", maxGenerations: 1 },
        { kind: "feedback", name: "feedback", generator: generator(), generatorArgs: {}, feedbackInput: "feedback", output: "candidates", maxGenerations: 2 },
      ],
      cases,
      labels,
      fns: fns(),
      store,
      executors: [],
    });
    const { report, evidence, decisions } = result;
    expect(report.contract).toBe(IMPROVE_CONTRACT);
    expect(report.incumbent).toBe(digestCanonical(manifestToJson(candidate("a"))));
    expect(report.arms[0]!.name).toBe("incumbent");
    expect(report.arms[0]!.holdout.filter((c) => c.passed).length).toBe(0);

    // Feedback arm learned "b" from bounded failure text in generation 1.
    const feedbackArm = report.arms.find((a) => a.name === "feedback")!;
    expect(feedbackArm.generations.length).toBe(2);
    expect(feedbackArm.generations[0]!.promoted).toBe(digestCanonical(manifestToJson(parseOrganismManifest(generatedCandidate("a")))));
    expect(feedbackArm.promoted).toBe(digestCanonical(manifestToJson(parseOrganismManifest(generatedCandidate("b")))));

    expect(report.comparison).toBe("decisive");
    expect(report.winner).not.toBeNull();
    expect(report.winner).not.toBe("incumbent");
    expect(report.insufficientReasons).toEqual([]);

    // Every arm with a promoted candidate exports verifiable evidence.
    expect(evidence.length).toBe(4);
    for (const record of evidence) {
      expect(() => parseEvaluationEvidence(record)).not.toThrow();
      expect(record.outcomes.holdout.total).toBe(3);
      expect(record.claimCategory).toBe("effectiveness");
      expect(record.dataset.groups).toEqual(["ho-a", "ho-b", "ho-c", "tr-a", "tr-b", "va-a", "va-b"]);
      expect(record.dataset.splitPolicy).toContain("group-disjoint");
    }

    // Only the winner's promotion decision is approved; the rest are rejected.
    for (const arm of report.arms) {
      if (arm.decision === null) continue;
      const decision = decisions.find((d) => d.digest === arm.decision)!;
      expect(() => verifyPromotionDecision(decision)).not.toThrow();
      expect(decision.incumbent).toBe(report.incumbent);
      expect(decision.rollout.mode).toBe("shadow");
      expect(decision.reviewer.status).toBe(arm.name === report.winner ? "approved" : "rejected");
    }

    // The run list covers every stored receipt in admission order.
    const runs = improveReportRuns(report);
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      expect(await store.getManifest(run.manifest)).toBeDefined();
      expect(await store.getReceipt(run.receipt)).toBeDefined();
    }
  });

  test("dependent labels keep the comparison insufficient and decisions rejected", async () => {
    const store = new MemoryStore();
    const { report, evidence, decisions } = await runImprovement({
      incumbent: candidate("a"),
      arms: [
        { kind: "labeled", name: "labeled", generator: generator(), generatorArgs: {}, labeledInput: "labeled", output: "candidates", maxGenerations: 1 },
      ],
      cases,
      labels: { ...labels, independent: false },
      fns: fns(),
      store,
      executors: [],
    });
    expect(report.comparison).toBe("insufficient");
    expect(report.winner).toBeNull();
    expect(report.insufficientReasons).toContain("labels are not independent");
    for (const record of evidence) {
      expect(record.claimCategory).toBe("replay");
      expect(record.limitations).toContain("labels are not independent");
    }
    for (const decision of decisions) {
      expect(decision.reviewer.status).toBe("rejected");
    }
  });

  test("a group that crosses the holdout boundary is rejected before any run", async () => {
    const store = new MemoryStore();
    await expect(
      runImprovement({
        incumbent: candidate("a"),
        arms: [{ kind: "fixed", name: "fixed", candidates: [candidate("b")] }],
        cases: cases.map((c) => (c.id === "h1" ? { ...c, group: "tr-a" } : c)),
        labels,
        fns: fns(),
        store,
        executors: [],
      }),
    ).rejects.toThrow(/crosses the holdout boundary/);
  });

  test("an exhausted account retires the arm and retains partial evidence", async () => {
    const store = new MemoryStore();
    const { report } = await runImprovement({
      incumbent: candidate("a"),
      arms: [
        { kind: "fixed", name: "fixed", candidates: [candidate("b")] },
      ],
      cases,
      labels,
      fns: fns(),
      store,
      executors: [],
      budget: { work: 262_144, attempts: 262_144, runs: 1 },
    });
    const incumbent = report.arms[0]!;
    expect(incumbent.exhausted).toBe(true);
    expect(incumbent.holdout.length).toBe(0);
    expect(report.comparison).toBe("insufficient");
    expect(report.insufficientReasons).toContain("incumbent baseline has no holdout evidence");
    expect(incumbent.budget?.outcome).toBe("exhausted");
  });

  test("identical inputs produce an identical report digest", async () => {
    const run = async () => {
      const store = new MemoryStore();
      const { report } = await runImprovement({
        incumbent: candidate("a"),
        arms: [
          { kind: "labeled", name: "labeled", generator: generator(), generatorArgs: {}, labeledInput: "labeled", output: "candidates", maxGenerations: 1 },
        ],
        cases,
        labels,
        fns: fns(),
        store,
        executors: [],
      });
      return report.digest;
    };
    expect(await run()).toBe(await run());
  });
});
