import { describe, expect, test } from "bun:test";
import { AlgalError } from "./errors";
import { digestCanonical } from "./digest";
import { type JsonObject, type JsonValue } from "./values";
import {
  EXPERIMENT_GRADE_CONTRACT,
  EXPERIMENT_TASK_BOUNDS,
  EXPERIMENT_TASK_CONTRACT,
  EXPERIMENT_TASK_FAMILY,
  applyTaskRules,
  expectedTaskOutput,
  gradeExperimentCase,
  gradeExperimentMismatches,
  parseExperimentGrade,
  parseExperimentTaskSpec,
  summarizeTaskResults,
  taskCases,
  taskExpectationMismatches,
  whenMatches,
  type ExperimentTaskSpec,
  type TaskRule,
} from "./experiment-task";

/** A small hand-built spec: two classes, the core schema, a default rule
 * plus one severity rule, one record per split. Expectations are computed
 * through the reference path; the digest is computed, so tests can mutate
 * one field and confirm the whole record still rejects or re-verifies. */
function minimalSpec(labels: Record<"train" | "validation" | "holdout", string> = {
  train: "bug-report",
  validation: "billing-inquiry",
  holdout: "bug-report",
}): JsonObject {
  const taxonomy = {
    classes: [
      { id: "billing-inquiry", about: "Question about an invoice or charge" },
      { id: "bug-report", about: "Something in the product is broken" },
    ],
  };
  const recordSchema = {
    fields: [
      { name: "id", kind: "text", maxLength: 32 },
      { name: "channel", kind: "choice", labels: ["chat", "email", "phone"] },
      { name: "severity", kind: "int", min: 1, max: 5 },
      { name: "subject", kind: "text", maxLength: 240 },
      { name: "body", kind: "text", maxLength: 1024 },
      { name: "outage", kind: "bool" },
    ],
  };
  const rules = [
    { id: "r0", when: {}, then: { decision: "resolve", priority: "p3", queue: "support" } },
    { id: "r1", when: { severity: { min: 4 } }, then: { priority: "p1", decision: "escalate" } },
    { id: "r2", when: { label: { in: ["bug-report"] }, outage: true }, then: { queue: "engineering" } },
  ];
  const outputFormat = {
    fields: { decision: ["resolve", "escalate"], priority: ["p1", "p2", "p3"], queue: ["support", "engineering"] },
    summaries: ["total", "perLabel", "perPriority"],
  };
  const recordFor = (split: string, severity: number, outage = false): JsonObject => ({
    id: `${split}-01`,
    channel: "email",
    severity,
    subject: "Save throws error 12",
    body: "Clicking save throws an error and my changes are lost.",
    outage,
  });
  const statement = { taxonomy, recordSchema, rules, outputFormat } as unknown as Parameters<
    typeof expectedTaskOutput
  >[0];
  const recordsFor: Record<string, JsonObject[]> = {
    train: [recordFor("train", 5)],
    validation: [recordFor("validation", 2)],
    holdout: [recordFor("holdout", 4, true)],
  };
  const inputs = (["train", "validation", "holdout"] as const).map((split) => ({
    id: split,
    split,
    records: recordsFor[split]!,
    expect: {
      out: expectedTaskOutput(statement, recordsFor[split]!, [labels[split]]),
    },
  }));
  const body: JsonObject = {
    contract: EXPERIMENT_TASK_CONTRACT,
    taskId: "acquisition-01",
    phase: "acquisition",
    family: { id: EXPERIMENT_TASK_FAMILY, seed: 7, index: 0, config: digestCanonical({ probe: 1 }) },
    taxonomy,
    recordSchema,
    rules,
    outputFormat,
    inputs,
    grader: { kind: "exact" },
  };
  return { ...body, digest: digestCanonical(body) };
}

function parse(value: JsonObject): ExperimentTaskSpec {
  return parseExperimentTaskSpec(JSON.parse(JSON.stringify(value)) as JsonValue);
}

/** Recompute every batch's expect and the digest after mutating records —
 * the fixture stays a well-formed spec so the check under test is the one
 * that fires. */
function reseal(spec: JsonObject, labels: (batch: JsonObject) => string[]): JsonObject {
  const statement = {
    taxonomy: spec.taxonomy,
    recordSchema: spec.recordSchema,
    rules: spec.rules,
    outputFormat: spec.outputFormat,
  } as unknown as Parameters<typeof expectedTaskOutput>[0];
  for (const batch of spec.inputs as JsonObject[]) {
    const records = batch.records as JsonObject[];
    (batch.expect as JsonObject).out = expectedTaskOutput(statement, records, labels(batch)) as unknown as JsonValue;
  }
  spec["digest"] = digestCanonical((({ digest: _d, ...rest }) => rest)(spec) as JsonValue);
  return spec;
}

function expectParseError(value: unknown, fragment: string): void {
  try {
    parseExperimentTaskSpec(value);
  } catch (err) {
    expect(err).toBeInstanceOf(AlgalError);
    expect((err as AlgalError).code).toBe("PARSE_FAILED");
    expect(String(err)).toContain(fragment);
    return;
  }
  throw new Error(`expected parse failure containing ${fragment}`);
}

describe("parseExperimentTaskSpec", () => {
  test("accepts a well-formed spec and re-verifies its digest", () => {
    const task = parse(minimalSpec());
    expect(task.taskId).toBe("acquisition-01");
    expect(task.phase).toBe("acquisition");
    expect(task.inputs.map((batch) => batch.split)).toEqual(["train", "validation", "holdout"]);
  });

  test("rejects non-objects and wrong contracts", () => {
    expectParseError(42, "must be an object");
    expectParseError([], "must be an object");
    expectParseError({ ...minimalSpec(), contract: "algal.task.v0" }, "contract must be");
  });

  test("rejects unknown keys at every level", () => {
    const spec = minimalSpec();
    expectParseError({ ...spec, createdAt: "2026-01-01" }, 'unknown key "createdAt"');
    expectParseError({ ...spec, taxonomy: { classes: [], extra: 1 } }, 'unknown key "extra"');
    const badRule = minimalSpec();
    (badRule.rules as JsonObject[])[0] = { ...((badRule.rules as JsonObject[])[0]!), see: 1 };
    expectParseError(badRule, 'unknown key "see"');
    const badWhen = minimalSpec();
    ((badWhen.rules as JsonObject[])[1]!.when as JsonObject) = { nonesuch: 1 };
    expectParseError(badWhen, 'unknown key "nonesuch"');
    const badField = minimalSpec();
    (badField.recordSchema as JsonObject).fields = [
      ...((badField.recordSchema as JsonObject).fields as JsonValue[]),
      { name: "mood", kind: "int", min: 0, max: 3, labels: ["a", "b"] },
    ];
    expectParseError(badField, 'unknown key "labels"');
  });

  test("rejects missing required fields", () => {
    const spec = minimalSpec();
    delete spec["grader"];
    expectParseError(spec, 'requires "grader"');
    delete spec["phase"];
    expectParseError(spec, 'requires "phase"');
    const noId = minimalSpec();
    (noId.recordSchema as JsonObject).fields = (
      (noId.recordSchema as JsonObject).fields as JsonValue[]
    ).filter((f) => (f as JsonObject).name !== "id");
    expectParseError(noId, 'must declare the "id" field');
  });

  test("enforces every declared bound", () => {
    const big = minimalSpec();
    (big.taxonomy as JsonObject).classes = Array.from({ length: EXPERIMENT_TASK_BOUNDS.maxClasses + 1 }, (_, i) => ({
      id: `class-${i}`,
      about: "x",
    }));
    expectParseError(big, `taxonomy.classes must list 1..${EXPERIMENT_TASK_BOUNDS.maxClasses}`);

    const manyRules = minimalSpec();
    manyRules.rules = Array.from({ length: EXPERIMENT_TASK_BOUNDS.maxRules + 1 }, (_, i) => ({
      id: `r${i}`,
      when: i === 0 ? {} : { severity: { eq: 1 } },
      then: { decision: "resolve" },
    }));
    // r0 keeps the default shape but `then` is incomplete -> either way it must fail
    expectParseError(manyRules, "must");

    // Per-batch bound: one batch over the record cap.
    const fatBatch = minimalSpec();
    (fatBatch.inputs as JsonObject[])[0]!.records = Array.from(
      { length: EXPERIMENT_TASK_BOUNDS.maxRecords + 1 },
      (_, i) => ({ id: `train-${i}`, channel: "email", severity: 1, subject: "s", body: "b", outage: false }),
    );
    expectParseError(fatBatch, `records must list 1..${EXPERIMENT_TASK_BOUNDS.maxRecords}`);

    // Total bound: legal batches whose records sum over the cap.
    const manyRecords = minimalSpec();
    (manyRecords.inputs as JsonObject[])[0]!.records = Array.from(
      { length: EXPERIMENT_TASK_BOUNDS.maxRecords },
      (_, i) => ({ id: `train-${i}`, channel: "email", severity: 1, subject: "s", body: "b", outage: false }),
    );
    reseal(manyRecords, (batch) => (batch.records as JsonObject[]).map(() => "bug-report"));
    expectParseError(manyRecords, `more than ${EXPERIMENT_TASK_BOUNDS.maxRecords} records`);

    const longId = minimalSpec();
    longId.taskId = `task-${"x".repeat(EXPERIMENT_TASK_BOUNDS.maxTaskIdLen)}`;
    expectParseError(longId, `${EXPERIMENT_TASK_BOUNDS.maxTaskIdLen} characters`);

    const longAbout = minimalSpec();
    ((longAbout.taxonomy as JsonObject).classes as JsonObject[])[0]!.about = "y".repeat(
      EXPERIMENT_TASK_BOUNDS.maxClassAboutLen + 1,
    );
    expectParseError(longAbout, `${EXPERIMENT_TASK_BOUNDS.maxClassAboutLen} characters`);
  });

  test("rejects semantic violations inside declared keys", () => {
    const badLabel = minimalSpec();
    ((badLabel.rules as JsonObject[])[2]!.when as JsonObject) = { label: { in: ["nope"] } };
    expectParseError(badLabel, 'undeclared class "nope"');

    const badSlot = minimalSpec();
    ((badSlot.rules as JsonObject[])[1]!.when as JsonObject) = { amount: { min: 1 } };
    expectParseError(badSlot, "does not declare");

    const badThen = minimalSpec();
    ((badThen.rules as JsonObject[])[1]!.then as JsonObject) = { queue: "nowhere" };
    expectParseError(badThen, 'undeclared label "nowhere"');

    const badFirst = minimalSpec();
    ((badFirst.rules as JsonObject[])[0]!.when as JsonObject) = { severity: { eq: 1 } };
    expectParseError(badFirst, "must be empty");

    const dupSplit = minimalSpec();
    (dupSplit.inputs as JsonObject[])[1]!.split = "train";
    expectParseError(dupSplit, 'repeats "train"');

    const noHoldout = minimalSpec();
    noHoldout.inputs = (noHoldout.inputs as JsonObject[]).filter((b) => b.split !== "holdout") as JsonValue;
    expectParseError(noHoldout, "include a holdout batch");
  });

  test("rejects tampered digests", () => {
    const spec = minimalSpec();
    spec["digest"] = "sha256:" + "0".repeat(64);
    try {
      parseExperimentTaskSpec(spec);
      throw new Error("no throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AlgalError);
      expect((err as AlgalError).code).toBe("DIGEST_MISMATCH");
    }
  });
});

describe("reference semantics", () => {
  const statement = () => {
    const spec = minimalSpec();
    return parse(spec);
  };

  test("whenMatches covers every condition kind", () => {
    const record: JsonObject = { severity: 4, channel: "email", outage: true };
    expect(whenMatches({}, record, "bug-report")).toBe(true);
    expect(whenMatches({ severity: { min: 4 } }, record, "x")).toBe(true);
    expect(whenMatches({ severity: { min: 5 } }, record, "x")).toBe(false);
    expect(whenMatches({ severity: { max: 4, min: 2 } }, record, "x")).toBe(true);
    expect(whenMatches({ channel: { in: ["email", "chat"] } }, record, "x")).toBe(true);
    expect(whenMatches({ channel: { in: ["phone"] } }, record, "x")).toBe(false);
    expect(whenMatches({ outage: true }, record, "x")).toBe(true);
    expect(whenMatches({ outage: false }, record, "x")).toBe(false);
    expect(whenMatches({ label: { in: ["bug-report"] } }, record, "bug-report")).toBe(true);
    expect(whenMatches({ label: { in: ["billing-inquiry"] } }, record, "bug-report")).toBe(false);
  });

  test("applyTaskRules: matching rules merge in order, first is total", () => {
    const task = statement();
    const record: JsonObject = { severity: 5, channel: "email", outage: false };
    const decision = applyTaskRules(task.rules, task.outputFormat.fields, record, "billing-inquiry");
    expect(decision).toEqual({ decision: "escalate", priority: "p1", queue: "support" });
    const quiet = applyTaskRules(task.rules, task.outputFormat.fields, { ...record, severity: 1 }, "billing-inquiry");
    expect(quiet).toEqual({ decision: "resolve", priority: "p3", queue: "support" });
    const outBug = applyTaskRules(task.rules, task.outputFormat.fields, { ...record, outage: true }, "bug-report");
    expect(outBug.queue).toBe("engineering");
  });

  test("summarizeTaskResults zero-fills declared labels", () => {
    const task = statement();
    const summary = summarizeTaskResults(task.taxonomy, task.outputFormat, [
      { recordId: "a", label: "bug-report", decision: "resolve", priority: "p3", queue: "support" },
      { recordId: "b", label: "bug-report", decision: "resolve", priority: "p3", queue: "support" },
    ]);
    const perLabel = summary.find((entry) => entry.name === "perLabel")!;
    expect(perLabel.counts).toEqual([
      { key: "billing-inquiry", count: 0 },
      { key: "bug-report", count: 2 },
    ]);
    const total = summary.find((entry) => entry.name === "total")!;
    expect(total.counts).toEqual([{ key: "records", count: 2 }]);
  });

  test("taskExpectationMismatches flags a doctored expect", () => {
    const spec = minimalSpec();
    (((spec.inputs as JsonObject[])[0]!.expect as JsonObject).out as JsonObject).results = [
      { recordId: "train-01", label: "billing-inquiry", decision: "resolve", priority: "p3", queue: "support" },
    ];
    spec["digest"] = digestCanonical((({ digest: _d, ...rest }) => rest)(spec) as JsonValue);
    const mismatches = taskExpectationMismatches(parse(spec));
    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches[0]).toContain("train");
  });

  test("taskCases renders the foundry case shape", () => {
    const task = statement();
    const cases = taskCases(task);
    expect(cases.map((c) => c.split)).toEqual(["train", "validation", "holdout"]);
    const first = cases[0]!;
    expect(first.id).toBe("train");
    expect(Object.keys(first.args).sort()).toEqual(["records", "spec"]);
    expect(Object.keys(first.expect)).toEqual(["out"]);
    const specArg = first.args["spec"] as JsonObject;
    expect((specArg.taxonomy as JsonObject).classes).toBeArray();
  });
});

describe("grading", () => {
  test("exact grader scores 1 for the declared outputs and 0 otherwise", () => {
    const task = parse(minimalSpec());
    const batch = task.inputs[0]!;
    const good = gradeExperimentCase(task, batch, { out: batch.expect.out });
    expect(good.score).toBe(1);
    expect(good.passed).toBe(true);
    expect(good.contract).toBe(EXPERIMENT_GRADE_CONTRACT);
    const bad = gradeExperimentCase(task, batch, { out: { results: [], summary: [] } });
    expect(bad.score).toBe(0);
    expect(bad.passed).toBe(false);
  });

  test("scorer grader returns the program score and compares passAt", () => {
    const spec = minimalSpec();
    spec["grader"] = {
      kind: "scorer",
      scorer: {
        contract: "algal.expr.v1",
        program: [
          "if",
          ["eq", ["get", "expect", "out"], ["get", "outputs", "out"]],
          1,
          0.5,
        ],
      },
      passAt: 0.75,
    };
    spec["digest"] = digestCanonical((({ digest: _d, ...rest }) => rest)(spec) as JsonValue);
    const task = parse(spec);
    const batch = task.inputs[0]!;
    const pass = gradeExperimentCase(task, batch, { out: batch.expect.out });
    expect(pass.score).toBe(1);
    expect(pass.passed).toBe(true);
    const partial = gradeExperimentCase(task, batch, { out: { results: [], summary: [] } });
    expect(partial.score).toBe(0.5);
    expect(partial.passed).toBe(false);
  });

  test("rejects a scorer whose program does not check", () => {
    const spec = minimalSpec();
    spec["grader"] = {
      kind: "scorer",
      scorer: { contract: "algal.expr.v1", program: ["nope-op", 1] },
      passAt: 0.5,
    };
    spec["digest"] = digestCanonical((({ digest: _d, ...rest }) => rest)(spec) as JsonValue);
    try {
      parse(spec);
      throw new Error("no throw");
    } catch (err) {
      expect((err as AlgalError).code).toBe("SCORER_INVALID");
    }
  });

  test("grade records round-trip and re-verify", () => {
    const task = parse(minimalSpec());
    const batch = task.inputs[0]!;
    const grade = gradeExperimentCase(task, batch, { out: batch.expect.out });
    const reparsed = parseExperimentGrade(JSON.parse(JSON.stringify(grade)));
    expect(reparsed.digest).toBe(grade.digest);
    expect(gradeExperimentMismatches(task, reparsed)).toEqual([]);
    const tampered = { ...grade, score: 0 };
    tampered.digest = digestCanonical((({ digest: _d, ...rest }) => rest)(tampered) as JsonValue);
    const mismatches = gradeExperimentMismatches(task, tampered as unknown as typeof grade);
    expect(mismatches.length).toBeGreaterThan(0);
  });
});

describe("rule total order", () => {
  test("the parsed rules array preserves authored order", () => {
    const task = parse(minimalSpec());
    expect(task.rules.map((r: TaskRule) => r.id)).toEqual(["r0", "r1", "r2"]);
  });
});
