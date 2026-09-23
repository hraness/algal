import { describe, expect, test } from "bun:test";
import {
  decisionAnswerSchema,
  decisionExecutor,
  parseDecisionAnswers,
  parseDecisionQuestions,
  type DecisionAsker,
} from "./decisions";
import { scriptedExecutor, type EffectRequest } from "./effects";
import { AlgalError } from "./errors";
import type { JsonObject, JsonValue } from "./values";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { verifyReceipt } from "./verify";

const req = (over: Partial<EffectRequest> = {}): EffectRequest => ({
  contract: "algal.effect.v1",
  cellId: "c1",
  kind: "classifier",
  prompt: "keep this result?",
  context: { inputs: { text: "hello" } },
  output: { kind: "choice", labels: ["yes", "no"] },
  budget: { maxContextBytes: 4096, maxOutputBytes: 4096 },
  ...over,
});

const askerReturning = (answers: Record<string, unknown>): DecisionAsker => ({
  async ask(_state, questions) {
    // echo back an answers object covering every asked question
    const out: Record<string, never> = {};
    for (const name of Object.keys(questions)) {
      const a = answers[name];
      if (a === undefined) throw new Error(`fixture missing ${name}`);
      (out as Record<string, unknown>)[name] = a;
    }
    return { answers: out as never };
  },
});

describe("parseDecisionQuestions", () => {
  test("own __proto__ question names and choice criteria survive normalization", () => {
    const qs = parseDecisionQuestions(JSON.parse('{"__proto__":{"type":"choice","instructions":"Pick","criteria":{"__proto__":null,"constructor":"own"}}}'), "q");
    expect(Object.keys(qs)).toEqual(["__proto__"]);
    expect(Object.hasOwn(qs, "__proto__")).toBe(true);
    const q = qs["__proto__"]!;
    expect(q.type).toBe("choice");
    if (q.type !== "choice") throw new Error("expected choice fixture");
    expect(Object.keys(q.criteria)).toEqual(["__proto__", "constructor"]);
    expect(Object.hasOwn(q.criteria, "__proto__")).toBe(true);
    const schema = decisionAnswerSchema(qs);
    const answers = (schema.properties as JsonObject).answers as JsonObject;
    expect(answers.required).toEqual(["__proto__"]);
    expect(Object.keys(answers.properties as JsonObject)).toEqual(["__proto__"]);
  });
  test("accepts all three question types", () => {
    const qs = parseDecisionQuestions(
      {
        keep: { type: "noul", instructions: "still relevant?" },
        pick: {
          type: "choice",
          instructions: "best lane",
          criteria: { a: null, b: "the b lane" },
        },
        rate: {
          type: "score",
          instructions: "how good",
          criteria: ["poor", "ok", "great"],
        },
      },
      "q",
    );
    expect(qs.keep?.type).toBe("noul");
    expect((qs.pick as { criteria: Record<string, string | null> }).criteria.b).toBe("the b lane");
    expect((qs.rate as { criteria: string[] }).criteria).toHaveLength(3);
  });

  test("rejects unknown keys, bad types, empty maps", () => {
    expect(() =>
      parseDecisionQuestions({ q: { type: "noul", instructions: "x", extra: 1 } }, "q"),
    ).toThrow(AlgalError);
    expect(() =>
      parseDecisionQuestions({ q: { type: "essay", instructions: "x" } }, "q"),
    ).toThrow(AlgalError);
    expect(() => parseDecisionQuestions({}, "q")).toThrow(AlgalError);
    expect(() =>
      parseDecisionQuestions({ q: { type: "choice", instructions: "x", criteria: {} } }, "q"),
    ).toThrow(AlgalError);
    expect(() =>
      parseDecisionQuestions({ q: { type: "noul", instructions: "" } }, "q"),
    ).toThrow(AlgalError);
  });
});

describe("parseDecisionAnswers", () => {
  const questions = parseDecisionQuestions(
    {
      keep: { type: "noul", instructions: "k" },
      pick: { type: "choice", instructions: "p", criteria: { a: null } },
    },
    "q",
  );

  test("typed-shape enforcement per question type", () => {
    const answers = parseDecisionAnswers(
      {
        keep: { noul: 0.8 },
        pick: { choice: "a", confidence: 0.9, probabilities: { a: 0.9 } },
      },
      questions,
      "a",
    );
    expect((answers.keep as { noul: number }).noul).toBe(0.8);
    expect((answers.pick as { choice: string }).choice).toBe("a");
  });

  test("missing answer / wrong shape / nonfinite rejected", () => {
    expect(() =>
      parseDecisionAnswers({ keep: { noul: 0.5 } }, questions, "a"),
    ).toThrow(AlgalError);
    expect(() =>
      parseDecisionAnswers(
        { keep: { choice: "a", confidence: 1, probabilities: {} }, pick: { choice: "a", confidence: 1, probabilities: {} } },
        questions,
        "a",
      ),
    ).toThrow(AlgalError);
    expect(() =>
      parseDecisionAnswers(
        { keep: { noul: Number.NaN }, pick: { choice: "a", confidence: 1, probabilities: {} } },
        questions,
        "a",
      ),
    ).toThrow(AlgalError);
  });

  test("missing constructor and inherited answers are rejected as missing", () => {
    const own = parseDecisionQuestions({ constructor: { type: "noul", instructions: "Answer" } }, "q");
    expect(() => parseDecisionAnswers({}, own, "a")).toThrow('missing answer "constructor"');
    const inherited = Object.create({ keep: { noul: 0.5 } }) as JsonObject;
    expect(() => parseDecisionAnswers(inherited, { keep: questions.keep! }, "a")).toThrow('missing answer "keep"');
  });

  test("own __proto__ answers and probability keys survive normalization", () => {
    const own = parseDecisionQuestions(JSON.parse('{"__proto__":{"type":"choice","instructions":"Pick","criteria":{"__proto__":null,"constructor":null}}}'), "q");
    const answers = parseDecisionAnswers(JSON.parse('{"__proto__":{"choice":"__proto__","confidence":0.5,"probabilities":{"__proto__":0.5,"constructor":0.5}}}'), own, "a");
    expect(Object.keys(answers)).toEqual(["__proto__"]);
    const answer = answers["__proto__"]!;
    if (!("probabilities" in answer)) throw new Error("expected choice fixture");
    expect(Object.keys(answer.probabilities)).toEqual(["__proto__", "constructor"]);
    expect(answer.probabilities["__proto__"]).toBe(0.5);
  });
});

describe("decisionExecutor", () => {
  test("classifier labels preserve __proto__ and constructor as own criteria", async () => {
    const ex = decisionExecutor({ id: "test", cacheIdentity: "t", asker: { async ask(_state, questions) {
      const question = questions.answer!;
      if (question.type !== "choice") throw new Error("expected choice fixture");
      expect(Object.keys(question.criteria)).toEqual(["__proto__", "constructor"]);
      return { answers: { answer: { choice: "__proto__", confidence: 1, probabilities: JSON.parse('{"__proto__":1,"constructor":0}') as Record<string, number> } } };
    } } });
    expect(await ex.execute(req({ output: { kind: "choice", labels: ["__proto__", "constructor"] } }))).toBe("__proto__");
  });

  test("classifier answers and their choice must be own fields", async () => {
    for (const answers of [Object.create({ answer: { choice: "yes" } }), { answer: Object.create({ choice: "yes" }) }]) {
      const ex = decisionExecutor({ asker: { async ask() { return { answers }; } }, id: "test", cacheIdentity: "t" });
      await expect(ex.execute(req())).rejects.toMatchObject({ code: "EFFECT_UNPARSEABLE" });
    }
  });
  test("classifier requests become one choice question", async () => {
    let seen: { state: unknown; questions: Record<string, unknown> } | undefined;
    const asker: DecisionAsker = {
      async ask(state, questions) {
        seen = { state, questions };
        return {
          answers: {
            answer: { choice: "yes", confidence: 0.7, probabilities: { yes: 0.7, no: 0.3 } },
          },
          usage: { model: "m", tokensIn: 10, tokensOut: 4 },
        };
      },
    };
    const ex = decisionExecutor({ asker, id: "test", cacheIdentity: "t" });
    expect(ex.capabilities?.effects).toEqual(["classifier", "decide"]);
    const out = await ex.execute(req());
    expect(out).toBe("yes");
    const q = seen!.questions.answer as { type: string; instructions: string; criteria: Record<string, string | null> };
    expect(q.type).toBe("choice");
    expect(q.instructions).toBe("keep this result?");
    expect(Object.keys(q.criteria).sort()).toEqual(["no", "yes"]);
    const meta = await ex.executeEffect!(req());
    expect(meta.metadata?.executor).toBe("test");
    expect(meta.metadata?.usage?.tokensIn).toBe(10);
  });

  test("kind:decide forwards declared questions and returns answers record", async () => {
    const questions = parseDecisionQuestions(
      {
        keep: { type: "noul", instructions: "k" },
        lane: { type: "choice", instructions: "l", criteria: { x: null, y: null } },
      },
      "q",
    );
    const ex = decisionExecutor({
      asker: askerReturning({
        keep: { noul: 0.42 },
        lane: { choice: "x", confidence: 0.5, probabilities: { x: 0.5, y: 0.5 } },
      }),
      id: "test",
      cacheIdentity: "t",
    });
    const out = await ex.execute(
      req({ kind: "decide", output: { kind: "json", schema: {} }, questions }),
    );
    const answers = (out as JsonObject).answers as JsonObject;
    expect((answers.keep as JsonObject).noul).toBe(0.42);
    expect((answers.lane as JsonObject).choice).toBe("x");
  });

  test("rejects agent/text outputs, gates, and question-less decide requests", async () => {
    const ex = decisionExecutor({ asker: askerReturning({}), id: "t", cacheIdentity: "t" });
    await expect(
      ex.execute(req({ kind: "agent", output: { kind: "text" } })),
    ).rejects.toThrow(AlgalError);
    // approval gates route to a human/policy executor, never a model
    await expect(
      ex.execute(req({ kind: "gate" })),
    ).rejects.toThrow(AlgalError);
    await expect(
      ex.execute(req({ kind: "decide", output: { kind: "json", schema: {} } })),
    ).rejects.toThrow(AlgalError);
  });

  test("decide answer schema is derived from question types", () => {
    const schema = decisionAnswerSchema(
      parseDecisionQuestions(
        { k: { type: "noul", instructions: "k" }, c: { type: "choice", instructions: "c", criteria: { x: null } } },
        "q",
      ),
    );
    const answers = (schema.properties as JsonObject).answers as JsonObject;
    expect((answers.required as string[]).sort()).toEqual(["c", "k"]);
  });
});

test("decide preserves an own __proto__ question and answer through execution and replay", async () => {
  const questions = JSON.parse('{"__proto__":{"type":"choice","instructions":"Pick","criteria":{"__proto__":null,"constructor":null}}}') as JsonObject;
  const output = JSON.parse('{"answers":{"__proto__":{"choice":"__proto__","confidence":0.5,"probabilities":{"__proto__":0.5,"constructor":0.5}}}}') as JsonObject;
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:decision-own", name: "Own question",
    cells: [{ id: "decider", kind: "decide", prompt: "Choose", questions }] });
  const serializedCell = (manifestToJson(manifest).cells as JsonObject[])[0]!;
  expect(serializedCell.questions).toEqual(questions);
  const store = new MemoryStore();
  const receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [scriptedExecutor({ decider: output })] });
  expect(receipt.outcome).toBe("complete");
  expect(receipt.cells.decider!.outputs!.out).toEqual(output);
  const answers = (receipt.cells.decider!.outputs!.out as JsonObject).answers as JsonObject;
  expect(Object.hasOwn(answers, "__proto__")).toBe(true);
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store)).ok).toBe(true);
});
