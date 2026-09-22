import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { generateFoundryCandidates, runFoundry } from "./foundry";
import { verifyFoundryReport } from "./foundry-verify";
import { builtinRegistry } from "./registry";
import { runFoundrySearch } from "./search";
import { verifySearchReport } from "./search-verify";
import { MemoryStore } from "./store";

const echo = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:echo-candidate",
  name: "Echo candidate",
  interface: {
    inputs: { q: { cell: "src", port: "value" } },
    outputs: { answer: { cell: "echo", port: "value" } },
  },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "echo", kind: "fn", fn: "echo.v1" },
  ],
  edges: [
    { from: { cell: "src", port: "value" }, to: { cell: "echo", port: "value" } },
  ],
});

const constant = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:constant-candidate",
  name: "Constant candidate",
  interface: {
    inputs: { q: { cell: "src", port: "value" } },
    outputs: { answer: { cell: "out", port: "value" } },
  },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value: "a" } } },
  ],
  edges: [],
});

describe("foundry", () => {
  test("search carries validation evidence across bounded generations without exposing holdout", async () => {
    const generator = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:evolving-generator",
      name: "Evolving generator",
      interface: {
        inputs: { feedback: { cell: "src", port: "feedback" } },
        outputs: { candidates: { cell: "writer", port: "out" } },
      },
      cells: [
        { id: "src", kind: "input", outputs: { feedback: "json" } },
        {
          id: "writer",
          kind: "agent",
          inputs: { feedback: "json" },
          prompt: "Improve the candidate population from validation evidence.",
          view: { inputs: ["feedback"] },
          output: {
            kind: "json",
            schema: {
              type: "object",
              required: ["candidates"],
              properties: { candidates: { type: "array" } },
            },
          },
        },
      ],
      edges: [
        { from: { cell: "src", port: "feedback" }, to: { cell: "writer", port: "feedback" } },
      ],
    });
    let calls = 0;
    const store = new MemoryStore();
    const result = await runFoundrySearch({
      generator,
      generatorArgs: {},
      feedbackInput: "feedback",
      output: "candidates",
      field: "candidates",
      cases: [
        { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
        { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
        { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } },
      ],
      maxGenerations: 2,
      fns: builtinRegistry(),
      store,
      executors: [{
        id: "evolver",
        async execute() {
          return { candidates: [manifestToJson(calls++ === 0 ? constant : echo)] };
        },
      }],
    });

    expect(result.generations).toHaveLength(2);
    expect(result.generations[0]?.candidates[0]?.validation.passed).toBe(0);
    expect(result.generations[1]?.candidates).toHaveLength(2);
    expect(result.generations.every((generation) =>
      generation.candidates.every((candidate) => candidate.cases.every((c) => c.split !== "holdout")),
    )).toBe(true);
    expect(result.result.holdout.passed).toBe(1);
    expect(result.result.promoted).toBe(digestCanonical(manifestToJson(echo)));
    const verified = await verifySearchReport(result, store, builtinRegistry());
    expect(verified.ok).toBe(true);
    expect(verified.checkedReceipts).toBeGreaterThan(0);
  });

  test("search verify honours a custom scorer across generations", async () => {
    const generator = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:scored-evolving-generator",
      name: "Scored evolving generator",
      interface: {
        inputs: { feedback: { cell: "src", port: "feedback" } },
        outputs: { candidates: { cell: "writer", port: "out" } },
      },
      cells: [
        { id: "src", kind: "input", outputs: { feedback: "json" } },
        {
          id: "writer",
          kind: "agent",
          inputs: { feedback: "json" },
          prompt: "Improve the candidate population from validation evidence.",
          view: { inputs: ["feedback"] },
          output: {
            kind: "json",
            schema: {
              type: "object",
              required: ["candidates"],
              properties: { candidates: { type: "array" } },
            },
          },
        },
      ],
      edges: [
        { from: { cell: "src", port: "feedback" }, to: { cell: "writer", port: "feedback" } },
      ],
    });
    let calls = 0;
    const store = new MemoryStore();
    const scorer = {
      contract: "algal.expr.v1" as const,
      program: ["eq", ["get", "outputs", "answer"], ["get", "args", "q"]],
    };
    const result = await runFoundrySearch({
      generator,
      generatorArgs: {},
      feedbackInput: "feedback",
      output: "candidates",
      field: "candidates",
      cases: [
        // expect is a declared-output placeholder; the scorer derives the
        // verdict from args, so exact-match would mark every pass invalid.
        { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "" } },
        { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "" } },
        { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "" } },
      ],
      scorer,
      maxGenerations: 2,
      fns: builtinRegistry(),
      store,
      executors: [{
        id: "evolver",
        async execute() {
          return { candidates: [manifestToJson(calls++ === 0 ? constant : echo)] };
        },
      }],
    });
    const verified = await verifySearchReport(result, store, builtinRegistry());
    expect(verified.mismatches).toEqual([]);
    expect(verified.ok).toBe(true);
  });

  test("runs an organism that emits candidate manifests and records its lineage", async () => {
    const generator = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:test-generator",
      name: "Test generator",
      interface: { inputs: {}, outputs: { candidates: { cell: "batch", port: "value" } } },
      cells: [{
        id: "batch",
        kind: "const",
        outputs: {
          value: {
            type: "json",
            value: [manifestToJson(constant), manifestToJson(echo)],
          },
        },
      }],
      edges: [],
    });
    const store = new MemoryStore();
    const generated = await generateFoundryCandidates({
      generator,
      args: {},
      output: "candidates",
      fns: builtinRegistry(),
      store,
      executors: [],
    });
    const result = await runFoundry({
      candidates: generated.candidates,
      cases: [
        { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
        { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
        { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } },
      ],
      fns: builtinRegistry(),
      store,
      executors: [],
      lineage: {
        generatorDigest: generated.generatorDigest,
        receiptDigest: generated.receiptDigest,
      },
    });

    expect(generated.candidates).toHaveLength(2);
    expect(generated.receiptDigest).toMatch(/^sha256:/);
    expect(result.lineage?.generatorDigest).toBe(generated.generatorDigest);
    expect(result.promoted).toBe(result.candidates[1]!.manifestDigest);
    const verified = await verifyFoundryReport(result, store, builtinRegistry());
    expect(verified.ok).toBe(true);
    expect(verified.checkedReceipts).toBe(6);

    const tampered = structuredClone(result);
    tampered.holdout.cases[0]!.expect.answer = "wrong";
    const { digest: _digest, ...tamperedBase } = tampered;
    tampered.digest = digestCanonical(tamperedBase as never);
    const rejected = await verifyFoundryReport(tampered, store, builtinRegistry());
    expect(rejected.ok).toBe(false);
    expect(rejected.mismatches).toContain("holdout case holdout-c has an invalid pass claim");
  });

  test("evaluates train and validation cases and promotes the best candidate", async () => {
    const store = new MemoryStore();
    const result = await runFoundry({
      candidates: [constant, echo],
      cases: [
        { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
        { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
        { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } },
      ],
      fns: builtinRegistry(),
      store,
      executors: [],
    });

    expect(result.contract).toBe("algal.foundry.v1");
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]?.train.passed).toBe(1);
    expect(result.candidates[0]?.validation.passed).toBe(0);
    expect(result.candidates[1]?.validation.passed).toBe(1);
    expect(result.promoted).toBe(result.candidates[1]!.manifestDigest);
    expect(result.holdout.passed).toBe(1);
    expect(result.holdout.cases[0]?.outputs).toEqual({ answer: "c" });
    expect(result.candidates[1]?.cases[1]?.receiptDigest).toMatch(/^sha256:/);
    expect(await store.getReceipt(result.candidates[1]!.cases[1]!.receiptDigest!)).toBeDefined();
  });

  test("expr scorer replaces exact-match and flows through verify", async () => {
    const store = new MemoryStore();
    // scorer: "the answer must be 'a'" — constant passes every case,
    // echo only the train case; exact-match would promote echo instead.
    const scorer = {
      contract: "algal.expr.v1" as const,
      program: ["eq", ["get", "outputs", "answer"], "a"],
    };
    const cases = [
      { id: "train-a", split: "train" as const, args: { q: "a" }, expect: { answer: "a" } },
      { id: "validation-b", split: "validation" as const, args: { q: "b" }, expect: { answer: "b" } },
      { id: "holdout-c", split: "holdout" as const, args: { q: "c" }, expect: { answer: "c" } },
    ];
    const result = await runFoundry({
      candidates: [constant, echo],
      cases,
      fns: builtinRegistry(),
      store,
      executors: [],
      scorer,
    });

    expect(result.scorer).toEqual(scorer);
    expect(result.promoted).toBe(result.candidates[0]!.manifestDigest);
    expect(result.candidates[0]!.validation.passed).toBe(1);
    expect(result.candidates[1]!.validation.passed).toBe(0);
    expect(result.holdout.passed).toBe(1);
    // args landed on the case records — the report is self-contained
    expect(result.holdout.cases[0]?.args).toEqual({ q: "c" });

    const verified = await verifyFoundryReport(result, store, builtinRegistry());
    expect(verified.ok).toBe(true);

    // a tampered scorer changes the recomputed pass claims
    const tampered = structuredClone(result);
    tampered.scorer!.program = ["eq", ["get", "outputs", "answer"], ["get", "args", "q"]];
    const { digest: _d, ...tBase } = tampered;
    tampered.digest = digestCanonical(tBase as never);
    const rejected = await verifyFoundryReport(tampered, store, builtinRegistry());
    expect(rejected.ok).toBe(false);
    expect(rejected.mismatches.some((m) => m.includes("invalid pass claim"))).toBe(true);
  });

  test("scorer sees args, expect, and outputs; errors are SCORER_INVALID", async () => {
    const store = new MemoryStore();
    // relational scorer: answer must echo the input arg
    const result = await runFoundry({
      candidates: [echo],
      cases: [
        { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "zzz" } },
        { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "zzz" } },
        { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "zzz" } },
      ],
      fns: builtinRegistry(),
      store,
      executors: [],
      scorer: {
        contract: "algal.expr.v1",
        program: ["eq", ["get", "outputs", "answer"], ["get", "args", "q"]],
      },
    });
    // expect mismatches don't matter — the scorer defined success
    expect(result.candidates[0]!.train.passed).toBe(1);
    expect(result.holdout.passed).toBe(1);

    const base = {
      candidates: [echo],
      cases: [
        { id: "train", split: "train" as const, args: { q: "a" }, expect: { answer: "a" } },
        { id: "validation", split: "validation" as const, args: { q: "b" }, expect: { answer: "b" } },
        { id: "holdout", split: "holdout" as const, args: { q: "c" }, expect: { answer: "c" } },
      ],
      fns: builtinRegistry(),
      store,
      executors: [],
    };
    // unbound name fails static check at validate()
    const err1 = await runFoundry({
      ...base,
      scorer: { contract: "algal.expr.v1", program: ["get", "nope"] },
    }).catch((e) => e);
    expect(err1.code).toBe("SCORER_INVALID");
    // non-boolean result fails at eval
    const err2 = await runFoundry({
      ...base,
      scorer: { contract: "algal.expr.v1", program: ["get", "outputs", "answer"] },
    }).catch((e) => e);
    expect(err2.code).toBe("SCORER_INVALID");
    // thrown expr (div by zero on case data) also fails SCORER_INVALID
    const err3 = await runFoundry({
      ...base,
      scorer: { contract: "algal.expr.v1", program: ["div", 1, 0] },
    }).catch((e) => e);
    expect(err3.code).toBe("SCORER_INVALID");
  });

  test("rejects duplicate case ids and candidates without interfaces", async () => {
    const noInterface = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:no-interface",
      name: "No interface",
      cells: [{ id: "x", kind: "const", outputs: { value: { type: "text", value: "x" } } }],
      edges: [],
    });
    const base = {
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [],
    };

    await expect(runFoundry({
      ...base,
      candidates: [echo],
      cases: [
        { id: "same", split: "train" as const, args: { q: "a" }, expect: { answer: "a" } },
        { id: "same", split: "validation" as const, args: { q: "b" }, expect: { answer: "b" } },
        { id: "holdout", split: "holdout" as const, args: { q: "c" }, expect: { answer: "c" } },
      ],
    })).rejects.toThrow("duplicate foundry case id");
    await expect(runFoundry({
      ...base,
      candidates: [noInterface],
      cases: [
        { id: "train", split: "train", args: {}, expect: {} },
        { id: "validation", split: "validation", args: {}, expect: {} },
        { id: "holdout", split: "holdout", args: {}, expect: {} },
      ],
    })).rejects.toThrow("must declare an interface");
  });

  test("bounds candidate populations", async () => {
    await expect(runFoundry({
      candidates: Array.from({ length: 33 }, () => echo),
      cases: [
        { id: "train", split: "train", args: { q: "a" }, expect: { answer: "a" } },
        { id: "validation", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
      ],
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [],
    })).rejects.toThrow("candidates exceed 32");
  });

  test("requires both train and validation cases", async () => {
    await expect(runFoundry({
      candidates: [echo],
      cases: [{ id: "one", split: "train", args: { q: "a" }, expect: { answer: "a" } }],
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [],
    })).rejects.toThrow("at least one validation case");
  });
});
