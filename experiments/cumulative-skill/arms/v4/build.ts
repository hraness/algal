// Writes the v4 study's arm configs: `retained.config.json` (cite-on-hit)
// and `optimizer.config.json`, identical except for the arm kind and the
// arm-specific `citeKeptEvaluation`, `reviser`, and `requalifyAfter` fields.
//
//   bun experiments/cumulative-skill/arms/v4/build.ts [outDir]
//   algal experiment <outDir>/optimizer.config.json --dir <store> ...
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseExperimentTaskSpec, taskBatchArgs, taskCases, taskSpecData } from "../../../../src/experiment-task";

const here = import.meta.dir;
const root = resolve(here, "..", "..");
const outDir = resolve(process.argv[2] ?? here);

const tasks = (["acquisition", "unseen", "shift"] as const).flatMap((phase) =>
  readdirSync(join(root, "tasks", "v4", phase))
    .filter((f) => f.endsWith(".task.json"))
    .sort()
    .map((f) => parseExperimentTaskSpec(JSON.parse(readFileSync(join(root, "tasks", "v4", phase, f), "utf8")))));

// The foundry evaluates only train/validation cases; it leaves this first
// acquisition task's holdout unused. Unseen/shift tasks are never promotion
// cases. Their expected outputs become optimizer feedback AFTER execution.
const first = tasks[0]!;
const cases = taskCases(first).map((c) => ({ ...c, id: `${first.taskId}-${c.id}` }));

// The family's agreement scorer, (4 x result match + summary match) / 5,
// passing at 0.9.
const agreement = [
  "let", "er", ["get", "expect", "out", "results"],
  ["let", "ar0", ["get", "outputs", "out", "results"],
    ["let", "ar", ["if", ["isList", ["get", "ar0"]], ["get", "ar0"], ["list"]],
      ["let", "es", ["get", "expect", "out", "summary"],
        ["let", "asum", ["get", "outputs", "out", "summary"],
          ["if", ["neq", ["len", ["get", "er"]], ["len", ["get", "ar"]]], 0,
            ["div",
              ["add",
                ["mul", 4, ["div", ["len", ["filter", ["get", "er"], "e", ["contains", ["get", "ar"], ["get", "e"]]]], ["len", ["get", "er"]]]],
                ["if", ["eq", ["get", "es"], ["get", "asum"]], 1, 0]],
              5]]]]]],
];

const library = JSON.parse(readFileSync(join(root, "pipeline", "record-triage.algal.json"), "utf8"));
// Embed manifests so moving a config cannot silently select different code.
const generator = (file: string) => ({ manifest: JSON.parse(readFileSync(join(here, file), "utf8")), output: "manifest", field: "manifest", args: { library } });

const arm = {
  contract: "algal.experiment-arm.v1",
  arm: "retained",
  family: "record-triage",
  budget: { work: 40_000_000, attempts: 1024, runs: 512 },
  generator: generator("generator.algal.json"),
  normalizeEmitted: true,
  maxEntries: 32,
  scorer: { contract: "algal.expr.v1", program: ["gte", agreement, 0.9] },
  cases,
};

const taskRecords = tasks.map((task) => {
  const holdout = task.inputs.find((b) => b.split === "holdout")!;
  return {
    taskId: task.taskId,
    phase: task.phase,
    spec: taskSpecData(task),
    args: taskBatchArgs(task, holdout),
    expect: { out: holdout.expect.out },
  };
});

const configs = {
  retained: { ...arm, citeKeptEvaluation: true },
  optimizer: { ...arm, arm: "optimizer", reviser: generator("reviser.algal.json"), requalifyAfter: 2 },
};
mkdirSync(outDir, { recursive: true });
for (const [name, armConfig] of Object.entries(configs)) {
  const path = join(outDir, `${name}.config.json`);
  writeFileSync(path, JSON.stringify({ contract: "algal.experiment.config.v1", arm: armConfig, tasks: taskRecords }, null, 1) + "\n");
  console.log(`${path}: ${taskRecords.length} tasks, ${cases.length} cases`);
}
