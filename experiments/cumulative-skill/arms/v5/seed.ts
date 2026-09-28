// Generate the first passing retained program, then give its exact catalog
// entry and manifest to all four arms. Failed generations and evaluations
// remain in their sessions and in one common, capped seed account.
//
// bun seed.ts <corpusDir> <store> --out <outDir>
//   [--responses file | --executor-cmd cmd | --base-url url --model m [--credential-env e]]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { manifestToJson, type OrganismManifest } from "../../../../src/contract";
import { type Digest } from "../../../../src/digest";
import { commandExecutor, scriptedExecutor, type Executor } from "../../../../src/effects";
import { parseExperimentArm, runExperimentArm, type ExperimentCatalog, type ExperimentRun } from "../../../../src/experiment-run";
import { taskBatchArgs, taskCases, taskSpecData, type ExperimentTaskSpec } from "../../../../src/experiment-task";
import { HabitatAccount, parseHabitatBudget, parseHabitatLimits, type HabitatLimits } from "../../../../src/habitat-budget";
import { builtinRegistry } from "../../../../src/registry";
import { FileStore, type Store } from "../../../../src/store";
import { asInt, asObject, type JsonValue } from "../../../../src/values";
import { learningTasks, SCORER, SEED_BUDGET, SEED_MAX_GENERATIONS, studyGenerator } from "./shared";

type Score = { passed: number; total: number };
export type SeedAttempt = {
  generation: number;
  session: Digest;
  run: Digest;
  account: Digest;
  manifest: Digest | null;
  report: Digest | null;
  generator: ExperimentRun["generator"];
  outcome: ExperimentRun["outcome"];
  failure: ExperimentRun["failure"];
  validation: Score | null;
  train: Score | null;
};
export type SeedSummary = {
  contract: "algal.study-seed.v1";
  corpus: string;
  taskId: string;
  taskDigest: Digest;
  manifest: Digest | null;
  report: Digest | null;
  catalog: Digest | null;
  account: Digest;
  validation: Score | null;
  train: Score | null;
  qualified: boolean;
  termination: "qualified" | "generation-limit" | "budget-limit";
  maxGenerations: number;
  attempts: SeedAttempt[];
};

function score(value: unknown, at: string): Score {
  const v = asObject(value, at);
  const total = asInt(v.total, `${at}.total`, 1, 64);
  return { passed: asInt(v.passed, `${at}.passed`, 0, total), total };
}

async function selectionScores(store: Store, report: Digest, manifest: Digest): Promise<{ train: Score; validation: Score }> {
  const selection = asObject(await store.getValue(report), "seed selection");
  if (!Array.isArray(selection.candidates) || selection.candidates.length !== 1) throw new Error("seed selection must contain its single generated candidate");
  const candidate = asObject(selection.candidates[0], "seed candidate");
  if (candidate.manifestDigest !== manifest) throw new Error("seed selection names another manifest");
  return { train: score(candidate.train, "seed train"), validation: score(candidate.validation, "seed validation") };
}

export async function generateStudySeed(opts: {
  first: ExperimentTaskSpec;
  corpus: string;
  store: Store;
  executors: Executor[];
  maxGenerations?: number;
  budget?: HabitatLimits;
  onAttempt?: (summary: SeedSummary) => void;
}): Promise<{ summary: SeedSummary; catalog: ExperimentCatalog | null; manifest: OrganismManifest | null }> {
  const { first, store } = opts;
  if (first.phase !== "acquisition") throw new Error("seed task must be acquisition");
  const maxGenerations = asInt(opts.maxGenerations ?? SEED_MAX_GENERATIONS, "maxGenerations", 1, SEED_MAX_GENERATIONS);
  const limits = parseHabitatLimits(opts.budget ?? SEED_BUDGET);
  const train = first.inputs.find((batch) => batch.split === "train");
  if (train === undefined) throw new Error(`${first.taskId}: seed task has no train batch`);
  const cases = taskCases(first).map((c) => ({ ...c, id: `${first.taskId}-${c.id}` }));
  let account = new HabitatAccount("experiment", limits).record();
  const summary: SeedSummary = {
    contract: "algal.study-seed.v1", corpus: opts.corpus, taskId: first.taskId, taskDigest: first.digest,
    manifest: null, report: null, catalog: null, account: await store.putValue(account as unknown as JsonValue),
    validation: null, train: null, qualified: false, termination: "generation-limit", maxGenerations, attempts: [],
  };
  opts.onAttempt?.(summary);
  for (let generation = 1; generation <= maxGenerations; generation++) {
    const remaining = {
      work: limits.work - account.charged.work,
      attempts: limits.attempts - account.charged.attempts,
      runs: limits.runs - account.charged.runs,
    };
    if (account.outcome === "exhausted" || remaining.work < 1 || remaining.runs < 1) {
      summary.termination = "budget-limit";
      break;
    }
    // An ordinary empty-catalog retained session performs generation, the
    // task run, and machine-scored promotion. Retries get only the remaining
    // common ceiling and never receive validation labels as generator input.
    const result = await runExperimentArm({
      arm: parseExperimentArm({
        contract: "algal.experiment-arm.v1", arm: "retained", family: "record-triage",
        budget: remaining, generator: studyGenerator("generator.algal.json"),
        normalizeEmitted: true, citeKeptEvaluation: true, maxEntries: 1, cases, scorer: SCORER,
      }),
      tasks: [{ taskId: `seed-${first.taskId}-${generation}`, phase: "acquisition", spec: taskSpecData(first), args: taskBatchArgs(first, train) }],
      fns: builtinRegistry(), store, executors: opts.executors,
    });
    const attemptAccount = parseHabitatBudget(await store.getValue(result.session.budget));
    account = parseHabitatBudget({
      ...account, runs: [...account.runs, ...attemptAccount.runs],
      charged: {
        work: account.charged.work + attemptAccount.charged.work,
        attempts: account.charged.attempts + attemptAccount.charged.attempts,
        runs: account.charged.runs + attemptAccount.charged.runs,
      },
      outcome: attemptAccount.outcome, refused: attemptAccount.refused,
    });
    summary.account = await store.putValue(account as unknown as JsonValue);
    const run = result.runs[0]!;
    const report = run.promote?.report ?? null;
    const scores = report !== null && run.manifest !== null ? await selectionScores(store, report, run.manifest) : null;
    summary.attempts.push({
      generation, session: result.sessionDigest, run: result.runDigests[0]!, account: result.session.budget,
      manifest: run.manifest, report, generator: run.generator, outcome: run.outcome, failure: run.failure,
      train: scores?.train ?? null, validation: scores?.validation ?? null,
    });
    const entry = result.catalog.entries[0];
    if (entry !== undefined) {
      if (run.generator === null || run.promote?.promoted !== true || scores === null || scores.validation.passed !== scores.validation.total) {
        throw new Error("seed promotion lacks a generated manifest and passing machine validation");
      }
      const manifest = await store.getManifest(entry.manifest);
      if (manifest === undefined) throw new Error("promoted seed manifest is absent from store");
      Object.assign(summary, { manifest: entry.manifest, report: entry.report, catalog: result.catalogDigest, ...scores, qualified: true, termination: "qualified" });
      opts.onAttempt?.(summary);
      return { summary, catalog: result.catalog, manifest };
    }
    if (account.outcome === "exhausted") summary.termination = "budget-limit";
    opts.onAttempt?.(summary);
  }
  opts.onAttempt?.(summary);
  return { summary, catalog: null, manifest: null };
}

async function main(): Promise<void> {
  const positional: string[] = [];
  const flags = new Map<string, string>();
  const allowed = new Set(["--responses", "--executor-cmd", "--base-url", "--model", "--credential-env", "--out"]);
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) { positional.push(arg); continue; }
    if (!allowed.has(arg) || flags.has(arg)) throw new Error(`unknown or repeated seed flag ${arg}`);
    const value = args[++i];
    if (value === undefined || value.startsWith("--")) throw new Error(`flag ${arg} needs a value`);
    flags.set(arg, value);
  }
  const [corpusDir, storeDir] = positional;
  if (corpusDir === undefined || storeDir === undefined || positional.length !== 2) {
    throw new Error("usage: seed.ts <corpusDir> <store> [--out dir] [--responses f | --executor-cmd c | --base-url u --model m [--credential-env e]]");
  }
  const outDir = resolve(flags.get("--out") ?? corpusDir);
  for (const file of ["seed-summary.json", "seed-catalog.json", "seed-manifest.json"]) {
    if (existsSync(join(outDir, file))) throw new Error(`${outDir}/${file} already exists; use a new study directory to preserve seed attempts`);
  }
  const routes = [flags.has("--responses"), flags.has("--executor-cmd"), flags.has("--base-url") || flags.has("--model") || flags.has("--credential-env")].filter(Boolean).length;
  if (routes !== 1) throw new Error("seed.ts requires exactly one executor route");
  const executors: Executor[] = [];
  if (flags.has("--responses")) {
    executors.push(scriptedExecutor(asObject(JSON.parse(readFileSync(resolve(flags.get("--responses")!), "utf8")), "responses")));
  } else if (flags.has("--executor-cmd")) {
    executors.push(commandExecutor(flags.get("--executor-cmd")!, {}));
  } else if (flags.has("--base-url") && flags.has("--model")) {
    const { openAICompatibleExecutor } = await import("../../../../src/openai-compatible");
    executors.push(openAICompatibleExecutor({
      baseUrl: flags.get("--base-url")!, model: flags.get("--model")!,
      ...(flags.has("--credential-env") ? { credentialEnv: flags.get("--credential-env")! } : {}),
    }));
  } else throw new Error("seed.ts live route needs --base-url and --model");
  const first = learningTasks(corpusDir).find((task) => task.phase === "acquisition");
  if (first === undefined) throw new Error(`${corpusDir}: no acquisition task`);
  mkdirSync(outDir, { recursive: true });
  const result = await generateStudySeed({
    first, corpus: corpusDir, store: new FileStore(resolve(storeDir)), executors,
    onAttempt: (summary) => writeFileSync(join(outDir, "seed-summary.json"), JSON.stringify(summary, null, 1) + "\n"),
  });
  console.log(JSON.stringify(result.summary, null, 1));
  if (result.catalog === null || result.manifest === null) {
    process.exitCode = 1;
    return;
  }
  writeFileSync(join(outDir, "seed-manifest.json"), JSON.stringify(manifestToJson(result.manifest), null, 1) + "\n");
  writeFileSync(join(outDir, "seed-catalog.json"), JSON.stringify(result.catalog, null, 1) + "\n");
}

if (import.meta.main) await main();
