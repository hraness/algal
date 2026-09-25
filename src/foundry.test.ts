import { describe, expect, test } from "bun:test";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { generateFoundryCandidates, runFoundry, type FoundryCase } from "./foundry";
import { verifyFoundryReport } from "./foundry-verify";
import { builtinRegistry } from "./registry";
import { runFoundrySearch } from "./search";
import { verifySearchReport } from "./search-verify";
import { MemoryStore } from "./store";
import { canonicalize, type JsonValue } from "./values";

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
  test("requires an own expected constructor output", async () => {
    const candidate = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:constructor-expect", name: "Constructor expectation",
      cells: [{ id: "source", kind: "input", outputs: { constructor: "json" } }], edges: [],
      interface: { inputs: {}, outputs: { constructor: { cell: "source", port: "constructor" } } },
    });
    await expect(runFoundry({
      candidates: [candidate],
      cases: (["train", "validation", "holdout"] as const).map(split => ({ id: split, split, args: {}, expect: {} })),
      fns: builtinRegistry(), store: new MemoryStore(), executors: [],
    })).rejects.toThrow('missing expected output "constructor"');
  });

  test("keeps a missing constructor output absent and verifies the failed cases", async () => {
    const candidate = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:missing-constructor-output", name: "Missing constructor output",
      cells: [{ id: "source", kind: "input", outputs: { value: "json", constructor: "json" } }], edges: [],
      interface: { inputs: { value: { cell: "source", port: "value" } }, outputs: { constructor: { cell: "source", port: "constructor" } } },
    });
    const store = new MemoryStore(), fns = builtinRegistry();
    const report = await runFoundry({
      candidates: [candidate],
      cases: (["train", "validation", "holdout"] as const).map(split => ({ id: split, split, args: { value: 1 }, expect: { constructor: null } })),
      fns, store, executors: [],
    });
    for (const c of [...report.candidates[0]!.cases, ...report.holdout.cases]) {
      expect(c.outcome).toBe("complete");
      expect(c.passed).toBe(false);
      expect(Object.keys(c.outputs)).toEqual([]);
      expect(Object.hasOwn(c.outputs, "constructor")).toBe(false);
    }
    expect((await verifyFoundryReport(report, store, fns)).mismatches).toEqual([]);
  });

  test("preserves declared constructor names and own __proto__ JSON data", async () => {
    const candidate = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:constructor-data", name: "Constructor data",
      cells: [{ id: "constructor", kind: "input", outputs: { constructor: "json" } }], edges: [],
      interface: {
        inputs: { constructor: { cell: "constructor", port: "constructor" } },
        outputs: { constructor: { cell: "constructor", port: "constructor" } },
      },
    });
    const value = JSON.parse('{"__proto__":{"kept":true},"constructor":"data"}') as Record<string, JsonValue>;
    const store = new MemoryStore(), fns = builtinRegistry();
    const report = await runFoundry({
      candidates: [candidate],
      cases: (["train", "validation", "holdout"] as const).map(split => ({ id: split, split, args: { constructor: value }, expect: { constructor: value } })),
      fns, store, executors: [],
    });
    expect(report.holdout.passed).toBe(1);
    const output = report.holdout.cases[0]!.outputs["constructor"]!;
    expect(output).toEqual(value);
    expect(Object.hasOwn(output as object, "__proto__")).toBe(true);
    expect((await verifyFoundryReport(report, store, fns)).mismatches).toEqual([]);
  });

  test("rejects inherited generator interface names before storing or executing", async () => {
    const generator = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:generator-admission", name: "Generator admission",
      cells: [{ id: "batch", kind: "const", outputs: { value: { type: "json", value: [manifestToJson(echo)] } } }], edges: [],
      interface: { inputs: {}, outputs: { candidates: { cell: "batch", port: "value" } } },
    });
    const options: { args: Record<string, JsonValue>; output: string; message: string }[] = [{ args: {}, output: "constructor", message: 'unknown interface output "constructor"' },
      { args: { constructor: 1 }, output: "candidates", message: 'unknown interface input "constructor"' }];
    for (const option of options) {
      const store = new MemoryStore();
      await expect(generateFoundryCandidates({ generator, args: option.args, output: option.output, fns: builtinRegistry(), store, executors: [] })).rejects.toThrow(option.message);
      expect(await store.getManifest(digestCanonical(manifestToJson(generator)))).toBeUndefined();
    }
  });

  test("generates through declared constructor names and an own __proto__ field", async () => {
    const generator = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:constructor-generator", name: "Constructor generator",
      cells: [{ id: "constructor", kind: "input", outputs: { constructor: "json" } }], edges: [],
      interface: {
        inputs: { constructor: { cell: "constructor", port: "constructor" } },
        outputs: { constructor: { cell: "constructor", port: "constructor" } },
      },
    });
    const value = Object.fromEntries([["__proto__", [manifestToJson(echo)]]]);
    const generated = await generateFoundryCandidates({ generator, args: { constructor: value }, output: "constructor", field: "__proto__", fns: builtinRegistry(), store: new MemoryStore(), executors: [] });
    expect(generated.candidates.map(candidate => candidate.key)).toEqual([echo.key]);
  });

  test.each(["missing-expect", "extra-expect", "extra-input"] as const)("rejects imported %s case admission even with genuine replayable receipts", async defect => {
    const cases: FoundryCase[] = (["train", "validation", "holdout"] as const).map(split => ({ id: split, split, args: { q: "a" }, expect: { answer: "a" } }));
    const store = new MemoryStore(), fns = builtinRegistry();
    const options = { candidates: [echo], cases, store, fns, executors: [], scorer: { contract: "algal.expr.v1" as const, program: ["eq", 1, 1] } };
    const report = await runFoundry(options);
    const original = await verifyFoundryReport(report, store, fns);
    expect(original.ok).toBe(true);
    expect(original.checkedReceipts).toBe(3);
    const change = (c: FoundryCase): void => {
      if (defect === "missing-expect") c.expect = {};
      else if (defect === "extra-expect") c.expect = { ...c.expect, constructor: null };
      else c.args = { ...c.args, constructor: null };
    };
    const badCases = structuredClone(cases);
    for (const c of badCases) change(c);
    const message = defect === "missing-expect" ? 'missing expected output "answer"'
      : defect === "extra-expect" ? 'unknown candidate output "constructor"' : 'unknown candidate input "constructor"';
    await expect(runFoundry({ ...options, cases: badCases })).rejects.toThrow(message);
    for (const c of [...report.candidates[0]!.cases, ...report.holdout.cases]) change(c);
    const { digest: _digest, ...body } = report;
    report.digest = digestCanonical(body as unknown as JsonValue);
    const checked = await verifyFoundryReport(report, store, fns);
    expect(checked.checkedReceipts).toBe(0);
    expect(checked.ok).toBe(false);
    expect(checked.mismatches.some(mismatch => mismatch.includes(message))).toBe(true);
  });

  test("binds admitted declared input values to genuine case receipts", async () => {
    const store = new MemoryStore(), fns = builtinRegistry();
    const report = await runFoundry({
      candidates: [echo],
      cases: (["train", "validation", "holdout"] as const).map(split => ({ id: split, split, args: { q: "a" }, expect: { answer: "a" } })),
      store, fns, executors: [], scorer: { contract: "algal.expr.v1", program: ["eq", 1, 1] },
    });
    expect((await verifyFoundryReport(report, store, fns)).ok).toBe(true);
    for (const c of [...report.candidates[0]!.cases, ...report.holdout.cases]) c.args = { q: "changed" };
    const { digest: _digest, ...body } = report;
    report.digest = digestCanonical(body as unknown as JsonValue);
    const checked = await verifyFoundryReport(report, store, fns);
    expect(checked.checkedReceipts).toBe(3);
    expect(checked.ok).toBe(false);
    expect(checked.mismatches).toEqual([
      "case train: receipt args differ from the case",
      "case validation: receipt args differ from the case",
      "case holdout: receipt args differ from the case",
    ]);
  });

  test("maps input aliases in canonical key order through report serialization", async () => {
    const candidate = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:alias-order", name: "Alias order",
      cells: [{ id: "source", kind: "input", outputs: { value: "json" } }], edges: [],
      interface: {
        inputs: { a: { cell: "source", port: "value" }, z: { cell: "source", port: "value" } },
        outputs: { answer: { cell: "source", port: "value" } },
      },
    });
    const store = new MemoryStore(), fns = builtinRegistry();
    const report = await runFoundry({
      candidates: [candidate],
      cases: (["train", "validation", "holdout"] as const).map(split => ({ id: split, split, args: Object.fromEntries([["z", "z"], ["a", "a"]]), expect: { answer: "z" } })),
      store, fns, executors: [],
    });
    expect(report.holdout.passed).toBe(1);
    expect(report.holdout.cases[0]!.outputs).toEqual({ answer: "z" });
    expect((await verifyFoundryReport(report, store, fns)).mismatches).toEqual([]);
    expect((await verifyFoundryReport(JSON.parse(canonicalize(report as unknown as JsonValue)), store, fns)).mismatches).toEqual([]);
  });

  test("maps generator input aliases in canonical key order", async () => {
    const generator = parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:generator-alias-order", name: "Generator alias order",
      cells: [{ id: "source", kind: "input", outputs: { value: "json" } }], edges: [],
      interface: {
        inputs: { a: { cell: "source", port: "value" }, z: { cell: "source", port: "value" } },
        outputs: { candidates: { cell: "source", port: "value" } },
      },
    });
    const generated = await generateFoundryCandidates({
      generator, args: Object.fromEntries([["z", [manifestToJson(echo)]], ["a", [manifestToJson(constant)]]]), output: "candidates",
      fns: builtinRegistry(), store: new MemoryStore(), executors: [],
    });
    expect(generated.candidates.map(candidate => candidate.key)).toEqual([echo.key]);
  });

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
