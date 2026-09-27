// Offline record-triage scoring. No executor is constructed and no store is written.
// bun experiments/cumulative-skill/arms/v4/grade.ts <store> <config.json> <session>
import { open } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { manifestToJson, type OrganismManifest } from "../../../../src/contract";
import { asDigest, digestCanonical, type Digest } from "../../../../src/digest";
import { parseExperimentArm, parseExperimentRun, parseExperimentSession, parseExperimentTaskSet } from "../../../../src/experiment-run";
import { evalScorer } from "../../../../src/expr";
import { parseHabitatBudget } from "../../../../src/habitat-budget";
import { parseRunReceipt, receiptDigest } from "../../../../src/run";
import { FileStore, type Store } from "../../../../src/store";
import { boundedJsonSnapshot } from "../../../../src/source-dependencies";
import { asObject, canonicalize, noUnknownKeys, type JsonObject, type JsonValue } from "../../../../src/values";

const CONFIG_BYTES = 16_777_216;
const equal = (a: JsonValue, b: JsonValue) => canonicalize(a) === canonicalize(b);
function requireMatch(ok: boolean, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

async function readJson(path: string): Promise<JsonValue> {
  const file = await open(path, "r");
  try {
    const stat = await file.stat();
    requireMatch(stat.isFile() && stat.size <= CONFIG_BYTES, "study config file exceeds byte/type bound");
    const bytes = Buffer.alloc(CONFIG_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const read = await file.read(bytes, length, bytes.length - length, null);
      if (read.bytesRead === 0) break;
      length += read.bytesRead;
    }
    requireMatch(length <= CONFIG_BYTES, "study config file exceeds byte bound");
    return boundedJsonSnapshot(JSON.parse(bytes.subarray(0, length).toString("utf8")), {
      maxBytes: CONFIG_BYTES, maxDepth: 64, maxNodes: 1_000_000,
      maxEntries: 1_000_000, maxStringBytes: CONFIG_BYTES,
    }, "study config");
  } finally { await file.close(); }
}

/** Resolve config-relative generator files before parsing and fingerprinting. */
export async function loadStudyConfig(path: string): Promise<JsonObject> {
  const config = asObject(await readJson(path), "study config");
  const arm = asObject(config.arm, "study arm");
  if (typeof arm.manifest === "string") arm.manifest = await readJson(resolve(dirname(path), arm.manifest));
  for (const name of ["generator", "reviser"] as const) {
    if (arm[name] === undefined) continue;
    const generator = asObject(arm[name], name);
    if (typeof generator.manifest === "string") generator.manifest = await readJson(resolve(dirname(path), generator.manifest));
  }
  return config;
}

export type Counts = {
  tasks: number; complete: number; labelsCorrect: number; recordsCorrect: number;
  recordsTotal: number; summariesExact: number; outputsExact: number; scorerPassed: number;
};
const empty = (): Counts => ({ tasks: 0, complete: 0, labelsCorrect: 0, recordsCorrect: 0,
  recordsTotal: 0, summariesExact: 0, outputsExact: 0, scorerPassed: 0 });

function resultRecords(value: JsonValue | undefined, at: string): JsonObject[] {
  requireMatch(Array.isArray(value) && value.length > 0 && value.length <= 64, `${at}: expected 1..64 records`);
  const seen = new Set<string>();
  return value.map((v) => {
    const r = asObject(v, at);
    requireMatch(typeof r.recordId === "string" && r.recordId.length > 0 && r.recordId.length <= 128 &&
      typeof r.label === "string" && r.label.length > 0 && r.label.length <= 128, `${at}: invalid record id or label`);
    requireMatch(!seen.has(r.recordId), `${at}: duplicate record id ${r.recordId}`);
    seen.add(r.recordId);
    return r;
  });
}

function mappedArgs(manifest: OrganismManifest, args: Record<string, JsonValue>): JsonObject {
  requireMatch(manifest.interface !== undefined, "task manifest has no interface");
  const result: Record<string, JsonObject> = Object.create(null) as Record<string, JsonObject>;
  for (const [name, value] of Object.entries(args)) {
    const target = manifest.interface.inputs[name];
    requireMatch(target !== undefined, `task argument ${name} absent from manifest interface`);
    (result[target.cell] ??= Object.create(null) as JsonObject)[target.port] = value;
  }
  return result;
}

/** Grades the session's ordered records; unrelated records in the store cannot enter the result.
 * Integrity errors stop scoring. Failed/invalid runs and missing outputs remain in denominators.
 * The supplied expectations/scorer are fingerprints of this evaluation, not a claim that the
 * old session cryptographically committed to a complete experiment configuration. */
export async function gradeStudy(store: Pick<Store, "getValue" | "getReceipt" | "getManifest">,
  configValue: unknown, sessionDigest: Digest) {
  const config = asObject(configValue, "study config");
  noUnknownKeys(config, ["contract", "arm", "tasks"], "study config");
  requireMatch(config.contract === "algal.experiment.config.v1", "wrong study config contract");
  const arm = parseExperimentArm(config.arm);
  const configuredTasks = parseExperimentTaskSet({ contract: "algal.experiment-tasks.v1", tasks: config.tasks }).tasks;
  const value = async (digest: Digest) => {
    const found = await store.getValue(digest);
    requireMatch(found !== undefined, `missing value ${digest}`);
    requireMatch(digestCanonical(found) === digest, `value digest mismatch ${digest}`);
    return found;
  };
  const session = parseExperimentSession(await value(sessionDigest));
  requireMatch(session.arm === arm.arm && session.family === arm.family, "config/session arm or family mismatch");
  requireMatch(session.tasks.length === configuredTasks.length, "config/session task coverage mismatch");
  requireMatch(new Set(session.tasks.map((t) => t.taskId)).size === session.tasks.length, "duplicate session task");
  requireMatch(new Set(session.tasks.map((t) => t.run)).size === session.tasks.length, "duplicate session record");
  const account = parseHabitatBudget(await value(session.budget));
  requireMatch(account.activity === "experiment" && account.outcome === session.outcome, "session/account activity or outcome mismatch");
  requireMatch(equal(account.limits as JsonValue, arm.budget as JsonValue), "config/account budget limits mismatch");
  const admitted = new Set(account.runs.map((r) => `${r.manifest}/${r.receipt}`));
  const generators = new Set<Digest>();
  const revisers = new Set<Digest>();
  const models = new Set<string>();
  const configurations = new Set<Digest>();
  const checkedReceipts = new Set<Digest>();
  // All charged runs, including generation, revision and evaluation, contribute model provenance.
  for (const run of account.runs) {
    if (checkedReceipts.has(run.receipt)) continue;
    const raw = await store.getReceipt(run.receipt);
    requireMatch(raw !== undefined, `missing charged receipt ${run.receipt}`);
    requireMatch(digestCanonical(raw) === run.receipt, `receipt digest mismatch ${run.receipt}`);
    const receipt = parseRunReceipt(raw);
    requireMatch(receipt.manifestDigest === run.manifest && receipt.digest === receiptDigest(receipt), "charged receipt identity mismatch");
    for (const effect of receipt.effects) {
      if (effect.usage?.model) models.add(effect.usage.model);
      if (effect.configurationDigest) configurations.add(effect.configurationDigest);
    }
    checkedReceipts.add(run.receipt);
  }
  const groups = { all: empty(), acquisition: empty(), unseen: empty(), shift: empty(), "unseen+shift": empty() };
  const rows = [];
  for (const [index, entry] of session.tasks.entries()) {
    const task = configuredTasks[index]!;
    requireMatch(task.taskId === entry.taskId && task.phase === entry.phase, "config/session task order or phase mismatch");
    requireMatch(task.expect !== undefined, `${task.taskId}: config has no expectation`);
    if (task.args.spec !== undefined) requireMatch(equal(task.args.spec, task.spec), `${task.taskId}: task spec/argument mismatch`);
    const want = asObject(task.expect.out, `${task.taskId}.expect.out`);
    const expectedRecords = resultRecords(want.results, `${task.taskId}.expect.results`);
    requireMatch(want.summary !== undefined, `${task.taskId}: expected summary missing`);
    const record = parseExperimentRun(await value(entry.run));
    requireMatch(record.arm === arm.arm && record.taskId === task.taskId && record.phase === task.phase,
      `${task.taskId}: session/run identity mismatch`);
    if (record.generator) {
      requireMatch(arm.generator !== undefined && record.generator.manifest === digestCanonical(manifestToJson(arm.generator.manifest)), "config/generator manifest mismatch");
      generators.add(record.generator.manifest);
    }
    if (record.revise?.generator) {
      requireMatch(arm.reviser !== undefined && record.revise.generator.manifest === digestCanonical(manifestToJson(arm.reviser.manifest)), "config/reviser manifest mismatch");
      revisers.add(record.revise.generator.manifest);
    }
    if (record.revise?.trigger === "missed-expectation") {
      const evidence = asObject(await value(record.revise.evidence), "revision evidence");
      requireMatch(evidence.expect !== undefined && equal(evidence.expect, task.expect), `${task.taskId}: revision/config expectation mismatch`);
    }
    const counts = empty();
    counts.tasks = 1;
    counts.recordsTotal = expectedRecords.length;
    const problems: string[] = [];
    let outputs: JsonObject | null = null;
    let executionOutcome: string | null = null;
    if (record.receipt !== null) {
      requireMatch(record.manifest !== null && record.args !== null, `${task.taskId}: receipt has no manifest/args`);
      requireMatch(admitted.has(`${record.manifest}/${record.receipt}`), `${task.taskId}: receipt is not charged to session`);
      const manifest = await store.getManifest(record.manifest);
      requireMatch(manifest !== undefined && digestCanonical(manifestToJson(manifest)) === record.manifest, `${task.taskId}: manifest missing or mismatched`);
      const expectedArgs = mappedArgs(manifest, task.args);
      requireMatch(equal(await value(record.args), expectedArgs), `${task.taskId}: config/stored input mismatch`);
      const receipt = parseRunReceipt(await store.getReceipt(record.receipt));
      const maintenanceExhausted = record.outcome === "exhausted" && receipt.outcome === "complete" && account.outcome === "exhausted";
      requireMatch(receipt.manifestDigest === record.manifest && equal(receipt.args, expectedArgs) && (receipt.outcome === record.outcome || maintenanceExhausted),
        `${task.taskId}: receipt/config identity mismatch`);
      executionOutcome = receipt.outcome;
      if (receipt.outcome === "complete") {
        counts.complete = 1;
        outputs = Object.create(null) as JsonObject;
        for (const [name, source] of Object.entries(manifest.interface!.outputs)) {
          const result = receipt.cells[source.cell]?.outputs?.[source.port];
          if (result === undefined) problems.push(`missing interface output ${name}`);
          else outputs[name] = result;
        }
      }
    }
    if (outputs !== null && problems.length === 0) {
      counts.outputsExact = Number(equal(outputs, task.expect));
      // Do not turn scorer faults into passing/failing data: an invalid evaluator stops the audit.
      counts.scorerPassed = Number(arm.scorer ? evalScorer(arm.scorer, { args: task.args, expect: task.expect }, outputs) : counts.outputsExact === 1);
      const got = outputs.out;
      if (got === null || typeof got !== "object" || Array.isArray(got)) problems.push("invalid record-triage output");
      else {
        let actual: JsonObject[] = [];
        try { actual = resultRecords(got.results, `${task.taskId}.results`); }
        catch { problems.push("invalid or duplicate result records"); }
        const byId = new Map(actual.map((r) => [r.recordId, r]));
        for (const expected of expectedRecords) {
          const received = byId.get(expected.recordId);
          if (received?.label === expected.label) counts.labelsCorrect++;
          if (received !== undefined && equal(received, expected)) counts.recordsCorrect++;
        }
        counts.summariesExact = Number(got.summary !== undefined && equal(got.summary, want.summary));
      }
    }
    if (record.outcome !== "complete") problems.push(executionOutcome === "complete"
      ? "task completed; subsequent maintenance exhausted the account" : `run outcome ${record.outcome}`);
    for (const group of [groups.all, groups[task.phase], ...(task.phase === "acquisition" ? [] : [groups["unseen+shift"]])]) {
      for (const key of Object.keys(counts) as (keyof Counts)[]) group[key] += counts[key];
    }
    rows.push({ taskId: task.taskId, phase: task.phase, run: entry.run, receipt: record.receipt,
      manifest: record.manifest, outcome: record.outcome, executionOutcome, consult: record.consult.outcome,
      counts, problems });
  }
  return {
    session: sessionDigest, arm: session.arm, family: session.family,
    configDigest: digestCanonical(config as JsonValue),
    taskSetDigest: digestCanonical(configuredTasks as unknown as JsonValue),
    provenance: {
      account: session.budget, catalog: session.catalog, charged: account.charged,
      sessionOutcome: session.outcome, distinctChargedReceipts: checkedReceipts.size,
      generatorManifests: [...generators].sort(), reviserManifests: [...revisers].sort(),
      observedModels: [...models].sort(), effectConfigurations: [...configurations].sort(),
      limits: ["Session records do not bind the original complete arm config or task expectations; supplied evaluation config is fingerprinted here.",
        "Model names and effect configuration digests are receipt claims, not provider attestations or dollar costs.",
        "Offline scoring does not replace experiment report verification or establish independent repetitions."],
    },
    groups, tasks: rows,
  };
}

if (import.meta.main) {
  const [store, config, session, ...extra] = process.argv.slice(2);
  requireMatch(store !== undefined && config !== undefined && session !== undefined && extra.length === 0,
    "usage: grade.ts <store> <config.json> <session digest>");
  const result = await gradeStudy(new FileStore(resolve(store)), await loadStudyConfig(resolve(config)), asDigest(session, "session"));
  console.log(JSON.stringify(result, null, 2));
}
