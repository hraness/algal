import { describe, expect, test } from "bun:test";
import { AlgalError } from "./errors";
import { canonicalize, type JsonObject, type JsonValue } from "./values";
import {
  EXPERIMENT_FAMILY_CONTRACT,
  EXPERIMENT_SET_CONTRACT,
  SeededRng,
  generateExperimentTasks,
  parseExperimentFamilyConfig,
  parseExperimentSet,
  type ExperimentFamilyConfig,
} from "./experiment-family";
import {
  EXPERIMENT_TASK_BOUNDS,
  EXPERIMENT_TASK_CONTRACT,
  gradeExperimentCase,
  taskExpectationMismatches,
} from "./experiment-task";

const BASE_SHAPE = {
  classes: [6, 10] as [number, number],
  optionalFields: [2, 4] as [number, number],
  rules: [5, 9] as [number, number],
  decisionLabels: [3, 5] as [number, number],
  queueLabels: [3, 5] as [number, number],
  summaries: [2, 4] as [number, number],
  grader: "mixed" as const,
  scorerPassAt: 0.9,
};

function rawConfig(overrides: Partial<Record<string, unknown>> = {}): JsonObject {
  return {
    contract: EXPERIMENT_FAMILY_CONTRACT,
    family: "record-triage",
    seed: 20260925,
    phase: "acquisition",
    tasks: 8,
    splits: { train: 24, validation: 12, holdout: 12 },
    shape: { ...BASE_SHAPE },
    ...overrides,
  } as JsonObject;
}

function config(overrides: Partial<Record<string, unknown>> = {}): ExperimentFamilyConfig {
  return parseExperimentFamilyConfig(rawConfig(overrides));
}

function expectConfigError(value: unknown, fragment: string): void {
  try {
    parseExperimentFamilyConfig(value);
  } catch (err) {
    expect(err).toBeInstanceOf(AlgalError);
    expect(String(err)).toContain(fragment);
    return;
  }
  throw new Error(`expected config failure containing ${fragment}`);
}

describe("SeededRng", () => {
  test("same seed reproduces the same stream", () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    const seqA = Array.from({ length: 32 }, () => a.u32());
    const seqB = Array.from({ length: 32 }, () => b.u32());
    expect(seqA).toEqual(seqB);
  });

  test("different seeds produce different streams", () => {
    const a = new SeededRng(42);
    const b = new SeededRng(43);
    const seqA = Array.from({ length: 8 }, () => a.u32());
    const seqB = Array.from({ length: 8 }, () => b.u32());
    expect(seqA).not.toEqual(seqB);
  });

  test("forks are independent and deterministic", () => {
    const a = new SeededRng(7);
    const x = a.fork(3).u32();
    const y = a.fork(3).u32();
    const z = a.fork(4).u32();
    expect(x).toBe(y);
    expect(x).not.toBe(z);
  });
});

describe("parseExperimentFamilyConfig", () => {
  test("accepts a well-formed config", () => {
    const cfg = config();
    expect(cfg.seed).toBe(20260925);
    expect(cfg.phase).toBe("acquisition");
    expect(cfg.tasks).toBe(8);
  });

  test("rejects unknown keys, bad phases, and out-of-range counts", () => {
    expectConfigError({ ...config(), extra: 1 }, 'unknown key "extra"');
    expectConfigError({ ...config(), phase: "elsewhere" }, "phase must be one of");
    expectConfigError({ ...config(), tasks: 0 }, "tasks");
    expectConfigError({ ...config(), tasks: 33 }, "tasks");
    expectConfigError(
      { ...config(), splits: { train: 50, validation: 10, holdout: 10 } },
      `exceeds ${EXPERIMENT_TASK_BOUNDS.maxRecords}`,
    );
    expectConfigError({ ...config(), shape: { ...BASE_SHAPE, classes: [1, 10] } }, "shape.classes");
    expectConfigError({ ...config(), shape: { ...BASE_SHAPE, classes: [9, 6] } }, "exceeds");
  });

  test("evolve is required for shift and forbidden elsewhere", () => {
    expectConfigError({ ...config(), phase: "shift" }, "requires evolve");
    expectConfigError(
      { ...config(), evolve: { fromSeed: 1, addFields: 1, reviseClasses: 0, jitterRules: 0 } },
      "only valid for phase shift",
    );
    const shift = parseExperimentFamilyConfig(
      rawConfig({ phase: "shift", evolve: { fromSeed: 20260925, addFields: 3, reviseClasses: 2, jitterRules: 4 } }),
    );
    expect(shift.evolve?.fromSeed).toBe(20260925);
  });
});

describe("generateExperimentTasks", () => {
  test("identical configs produce identical canonical bytes (two seeds)", () => {
    for (const seed of [20260925, 777]) {
      const a = generateExperimentTasks(config({ seed }));
      const b = generateExperimentTasks(config({ seed }));
      expect(canonicalize(a.tasks as unknown as JsonValue)).toBe(canonicalize(b.tasks as unknown as JsonValue));
      expect(canonicalize(a.set as unknown as JsonValue)).toBe(canonicalize(b.set as unknown as JsonValue));
    }
  });

  test("different seeds produce different tasks with the same family shape", () => {
    const a = generateExperimentTasks(config({ seed: 1 }));
    const b = generateExperimentTasks(config({ seed: 2 }));
    expect(canonicalize(a.tasks as unknown as JsonValue)).not.toBe(canonicalize(b.tasks as unknown as JsonValue));
    for (const [i, task] of b.tasks.entries()) {
      expect(task.taskId).toBe(`${task.phase}-${String(i + 1).padStart(2, "0")}`);
      expect(task.phase).toBe("acquisition");
      expect(task.inputs.map((batch) => batch.split)).toEqual(["train", "validation", "holdout"]);
      expect(task.taxonomy.classes.length).toBeGreaterThanOrEqual(2);
      expect(task.taxonomy.classes.length).toBeLessThanOrEqual(EXPERIMENT_TASK_BOUNDS.maxClasses);
      expect(task.rules.length).toBeLessThanOrEqual(EXPERIMENT_TASK_BOUNDS.maxRules);
      const totalRecords = task.inputs.reduce((sum, batch) => sum + batch.records.length, 0);
      expect(totalRecords).toBeLessThanOrEqual(EXPERIMENT_TASK_BOUNDS.maxRecords);
      // Same family shape: identical schema core fields and output fields.
      expect(task.recordSchema.fields[0]!.name).toBe("id");
      expect(Object.keys(task.outputFormat.fields).sort()).toEqual(["decision", "priority", "queue"]);
      expect(task.family.seed).toBe(2);
      expect(task.family.index).toBe(i);
    }
    expect(a.tasks.length).toBe(b.tasks.length);
  });

  test("every generated task parses and replays cleanly", () => {
    const gen = generateExperimentTasks(config({ seed: 5150 }));
    for (const task of gen.tasks) {
      expect(task.contract).toBe(EXPERIMENT_TASK_CONTRACT);
      expect(taskExpectationMismatches(task)).toEqual([]);
      for (const batch of task.inputs) {
        for (const record of batch.records) {
          expect(typeof record["id"]).toBe("string");
        }
        // Exact tasks grade their declared expect to 1.
        if (task.grader.kind === "exact") {
          const grade = gradeExperimentCase(task, batch, { out: batch.expect.out });
          expect(grade.score).toBe(1);
          expect(grade.passed).toBe(true);
        }
      }
    }
    expect(gen.set.contract).toBe(EXPERIMENT_SET_CONTRACT);
    expect(gen.set.tasks.map((entry) => entry.taskId)).toEqual(gen.tasks.map((task) => task.taskId));
    expect(parseExperimentSet(JSON.parse(JSON.stringify(gen.set))).digest).toBe(gen.set.digest);
  });

  test("generated truth labels never appear in record fields", () => {
    const gen = generateExperimentTasks(config({ seed: 99 }));
    for (const task of gen.tasks) {
      for (const batch of task.inputs) {
        for (const record of batch.records) {
          for (const key of Object.keys(record)) {
            expect(task.recordSchema.fields.some((field) => field.name === key)).toBe(true);
          }
          expect(record).not.toHaveProperty("label");
          expect(record).not.toHaveProperty("class");
        }
      }
    }
  });
});

describe("shift evolution", () => {
  const shiftGen = () =>
    generateExperimentTasks(
      config({
        seed: 77013,
        phase: "shift",
        tasks: 4,
        evolve: { fromSeed: 20260925, addFields: 3, reviseClasses: 2, jitterRules: 4 },
      }),
    );

  test("shift tasks revise their base task", () => {
    const acq = generateExperimentTasks(config({ seed: 20260925 }));
    const shift = shiftGen();
    expect(shift.tasks.length).toBe(4);
    for (const [i, task] of shift.tasks.entries()) {
      const base = acq.tasks[i]!;
      expect(task.taskId).toBe(`shift-${String(i + 1).padStart(2, "0")}`);
      expect(task.phase).toBe("shift");
      expect(task.family.revisedFrom).toBe(base.taskId);
      // The schema gains fields the base schema did not declare.
      expect(task.recordSchema.fields.length).toBeGreaterThan(base.recordSchema.fields.length);
      const gained = task.recordSchema.fields.map((f) => f.name).filter((name) => !base.recordSchema.fields.some((f) => f.name === name));
      expect(gained.length).toBe(3);
      // Records carry the new fields.
      for (const batch of task.inputs) {
        for (const record of batch.records) {
          for (const name of gained) expect(record).toHaveProperty(name);
        }
      }
      // The taxonomy moved: same size, different membership.
      expect(task.taxonomy.classes.length).toBe(base.taxonomy.classes.length);
      expect(canonicalize(task.taxonomy)).not.toBe(canonicalize(base.taxonomy));
      // Thresholds moved: rule tables differ.
      expect(canonicalize(task.rules)).not.toBe(canonicalize(base.rules));
      // And everything still replays.
      expect(taskExpectationMismatches(task)).toEqual([]);
    }
  });

  test("shift generation is deterministic", () => {
    const a = shiftGen();
    const b = shiftGen();
    expect(canonicalize(a.tasks as unknown as JsonValue)).toBe(canonicalize(b.tasks as unknown as JsonValue));
  });
});
