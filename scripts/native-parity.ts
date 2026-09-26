import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { canonicalize, type JsonObject, type JsonValue } from "../src/values";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../src/contract";
import { FileStore, MemoryStore } from "../src/store";
import { fileTransport, type Transport } from "../src/transport";
import { scriptedExecutor } from "../src/effects";
import { builtinRegistry } from "../src/registry";
import { runOrganism } from "../src/run";
import { verifyReceipt } from "../src/verify";
import { replayComparison, replayComparisonToJson } from "../src/replay";
import { exploreOrdering } from "../src/ordering";
import { digestCanonical } from "../src/digest";
import { FileMailboxService, mailboxToolRegistry } from "../src/mailbox";
import { compileSource } from "../src/source";
import { loadSourceProject } from "../src/source-project";
import { packOrganism } from "../src/bundle";
import { habitatBudgetParity } from "./habitat-budget-fixture";

const root = resolve(import.meta.dir, "..");
const examples = join(root, "examples");
const binary = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const temporary = await mkdtemp(join(tmpdir(), "algal-parity-"));
const files = (await readdir(examples)).filter((f) => /\.algal\.json$/.test(f)).sort();
const modules = await Promise.all(files.map(async (file) => parseOrganismManifest(JSON.parse(await readFile(join(examples, file), "utf8")))));
// The readable front end stays outside the kernel: both runtimes receive the
// exact same compiled artifact. Exercise all committed source examples too.
const sourceFiles = await readdir(join(examples, "source"));
const sourceEntries = sourceFiles.filter(f => f.endsWith(".algal")).sort();
const generated = new Map<string, { manifestPath: string; fixtureBase: string; responsesPath?: string; argsPath?: string; bundlePath?: string; modules?: OrganismManifest[] }>();
for (const file of sourceEntries) {
  const source = await readFile(join(examples, "source", file), "utf8");
  const { manifest } = compileSource(source);
  const base = file.slice(0, -6);
  const name = `source-${base}`;
  const manifestPath = join(temporary, `${name}.algal.json`);
  await writeFile(manifestPath, canonicalize(manifestToJson(manifest)));
  // Named response fixtures exercise every selected path of a source program.
  // Keep each run's store and receipt separate even when the manifest is shared.
  const variants = sourceFiles.filter(f => f.startsWith(`${base}.responses.`) && f.endsWith(".json") && f.length > `${base}.responses..json`.length).sort();
  for (const variant of variants.length ? variants : [undefined]) {
    const label = variant?.slice(`${base}.responses.`.length, -5);
    const caseName = label === undefined ? name : `${name}-${label}`;
    files.push(`${caseName}.algal.json`);
    modules.push(manifest);
    generated.set(caseName, { manifestPath, fixtureBase: join(examples, "source", base),
      ...(variant === undefined ? {} : { responsesPath: join(examples, "source", variant) }) });
  }
}
// Source projects compile once into a portable closure. Native runs only need
// this artifact and fixtures, never the source loader or the source files.
const inbox = await loadSourceProject(join(examples, "source/projects/inbox/inbox.algal"));
const projectStore = new MemoryStore();
for (const module of inbox.modules) await projectStore.putManifest(module);
const projectBundle = await packOrganism(inbox.manifest, projectStore);
const bundlePath = join(temporary, "source-inbox.bundle.json");
const projectManifestPath = join(temporary, "source-inbox.algal.json");
await writeFile(bundlePath, canonicalize(projectBundle as unknown as JsonValue));
await writeFile(projectManifestPath, canonicalize(manifestToJson(inbox.manifest)));
for (const variant of ["", ".empty"]) {
  const name = `source-inbox${variant.replace(".", "-")}`;
  const fixtureBase = join(examples, "source/projects/inbox/inbox");
  files.push(`${name}.algal.json`);
  modules.push(inbox.manifest);
  generated.set(name, { manifestPath: projectManifestPath, fixtureBase, bundlePath, modules: inbox.modules,
    argsPath: `${fixtureBase}${variant}.args.json`, responsesPath: `${fixtureBase}${variant}.responses.json` });
}
// A larger pure project separates orchestration, domain policy, presentation,
// and a helper called twice. Its complete closure must run without the source.
const planner = await loadSourceProject(join(examples, "source/projects/task-planning/main.algal"));
const plannerStore = new MemoryStore();
for (const module of planner.modules) await plannerStore.putManifest(module);
const plannerBundlePath = join(temporary, "source-task-planning.bundle.json");
const plannerManifestPath = join(temporary, "source-task-planning.algal.json");
await writeFile(plannerBundlePath, canonicalize(await packOrganism(planner.manifest, plannerStore) as unknown as JsonValue));
await writeFile(plannerManifestPath, canonicalize(manifestToJson(planner.manifest)));
const plannerFixtureBase = join(examples, "source/projects/task-planning/main");
files.push("source-task-planning.algal.json");
modules.push(planner.manifest);
generated.set("source-task-planning", {
  manifestPath: plannerManifestPath, fixtureBase: plannerFixtureBase,
  bundlePath: plannerBundlePath, modules: planner.modules,
  argsPath: `${plannerFixtureBase}.args.json`, responsesPath: `${plannerFixtureBase}.responses.json`,
});
// A second entry in the same project reuses the scoring and clamp programs
// under identical digests; both runtimes must agree on that closure too.
const inspector = await loadSourceProject(join(examples, "source/projects/task-planning/inspect_task.algal"));
const inspectorStore = new MemoryStore();
for (const module of inspector.modules) await inspectorStore.putManifest(module);
const inspectorBundlePath = join(temporary, "source-task-inspector.bundle.json");
const inspectorManifestPath = join(temporary, "source-task-inspector.algal.json");
await writeFile(inspectorBundlePath, canonicalize(await packOrganism(inspector.manifest, inspectorStore) as unknown as JsonValue));
await writeFile(inspectorManifestPath, canonicalize(manifestToJson(inspector.manifest)));
const inspectorFixtureBase = join(examples, "source/projects/task-planning/inspect_task");
files.push("source-task-inspector.algal.json");
modules.push(inspector.manifest);
generated.set("source-task-inspector", {
  manifestPath: inspectorManifestPath, fixtureBase: inspectorFixtureBase,
  bundlePath: inspectorBundlePath, modules: inspector.modules,
  argsPath: `${inspectorFixtureBase}.args.json`, responsesPath: `${inspectorFixtureBase}.responses.json`,
});
// A separate project imports the planner's scoring and clamp programs with ../
// paths, so it loads under the projects directory as its explicit source root.
const queue = await loadSourceProject(join(examples, "source/projects/support-queue/main.algal"), { root: join(examples, "source/projects") });
const queueStore = new MemoryStore();
for (const module of queue.modules) await queueStore.putManifest(module);
const queueBundlePath = join(temporary, "source-support-queue.bundle.json");
const queueManifestPath = join(temporary, "source-support-queue.algal.json");
await writeFile(queueBundlePath, canonicalize(await packOrganism(queue.manifest, queueStore) as unknown as JsonValue));
await writeFile(queueManifestPath, canonicalize(manifestToJson(queue.manifest)));
const queueFixtureBase = join(examples, "source/projects/support-queue/main");
files.push("source-support-queue.algal.json");
modules.push(queue.manifest);
generated.set("source-support-queue", {
  manifestPath: queueManifestPath, fixtureBase: queueFixtureBase,
  bundlePath: queueBundlePath, modules: queue.modules,
  argsPath: `${queueFixtureBase}.args.json`, responsesPath: `${queueFixtureBase}.responses.json`,
});
// Branches around child calls need the same isolation in both runtimes. Cover
// the generated parameterless wrapper and nested list results through a merge.
for (const [kind, child, source] of [
  ["guarded-call", 'program child() -> text { budget { max_agent_calls: 0 } return "active" }',
    'import child from "./child.algal" program main(enabled: json) -> text { budget { max_agent_calls: 0 } return if enabled == true { call child using {} } else { "inactive" } }'],
  ["guarded-each", 'program child(email: text) -> json { budget { max_agent_calls: 0 } return [email, email] }',
    'import child from "./child.algal" program main(enabled: json) -> json { budget { max_agent_calls: 0 } return if enabled == true { each child over email in ["one", "two"] using {} max_items 2 } else { [] } }'],
] as const) {
  const result = compileSource(source, { modules: { "child.algal": child } });
  const store = new MemoryStore();
  for (const module of result.modules) await store.putManifest(module);
  const bundle = await packOrganism(result.manifest, store);
  const bundlePath = join(temporary, `${kind}.bundle.json`);
  const manifestPath = join(temporary, `${kind}.algal.json`);
  await writeFile(bundlePath, canonicalize(bundle as unknown as JsonValue));
  await writeFile(manifestPath, canonicalize(manifestToJson(result.manifest)));
  for (const enabled of [true, false]) {
    const name = `source-${kind}-${enabled ? "active" : "inactive"}`;
    const fixtureBase = join(temporary, name);
    await writeFile(`${fixtureBase}.args.json`, canonicalize({ input: { enabled } }));
    await writeFile(`${fixtureBase}.responses.json`, "{}");
    files.push(`${name}.algal.json`);
    modules.push(result.manifest);
    generated.set(name, { manifestPath, fixtureBase, bundlePath, modules: result.modules,
      responsesPath: `${fixtureBase}.responses.json` });
  }
}
// Record types lower to json ports with schemas. Valid and malformed values
// must produce identical receipts where each is checked: a root parameter, a
// list element, a call argument, and a record result.
const failing = new Set<string>();
const typedTasks = join(examples, "source/projects/typed-tasks");
const taskArgs = JSON.parse(await readFile(join(typedTasks, "scores.args.json"), "utf8")) as { input: Record<string, JsonValue> };
const recordCases: [string, { manifest: OrganismManifest; modules: OrganismManifest[] }, [string, JsonValue][]][] = [
  ["typed-tasks", await loadSourceProject(join(typedTasks, "scores.algal")), [["valid", taskArgs],
    ["malformed", JSON.parse(await readFile(join(typedTasks, "scores.malformed.args.json"), "utf8")) as JsonValue],
    ["malformed-weights", { input: { ...taskArgs.input, weights: { urgency: "high", impact: 1 } } }]]],
  ["record-call", compileSource('import child from "./child.algal" record S { total: number } program main(value: json) -> S { budget { max_agent_calls: 0 } return call child using { t: value } }',
    { modules: { "child.algal": "record T { n: number, extra: json? } program child(t: T) -> json { budget { max_agent_calls: 0 } return t.extra }" } }), [
    ["valid", { input: { value: { n: 1, extra: { total: 3 } } } }],
    ["malformed-argument", { input: { value: { n: "one" } } }],
    ["malformed-result", { input: { value: { n: 1, extra: { total: "three" } } } }]]],
];
for (const [kind, result, variants] of recordCases) {
  const store = new MemoryStore();
  for (const module of result.modules) await store.putManifest(module);
  const bundlePath = join(temporary, `${kind}.bundle.json`);
  const manifestPath = join(temporary, `${kind}.algal.json`);
  await writeFile(bundlePath, canonicalize(await packOrganism(result.manifest, store) as unknown as JsonValue));
  await writeFile(manifestPath, canonicalize(manifestToJson(result.manifest)));
  for (const [variant, args] of variants) {
    const name = `source-${kind}-${variant}`;
    const fixtureBase = join(temporary, name);
    await writeFile(`${fixtureBase}.args.json`, canonicalize(args));
    await writeFile(`${fixtureBase}.responses.json`, "{}");
    files.push(`${name}.algal.json`);
    modules.push(result.manifest);
    generated.set(name, { manifestPath, fixtureBase, bundlePath, modules: result.modules,
      responsesPath: `${fixtureBase}.responses.json` });
    if (variant.startsWith("malformed")) failing.add(name);
  }
}
// Schema version 2 records: the typed-tasks plan declares a list of nested
// records with allowed values and number bounds. Each malformed variant breaks
// one rule and must fail at the root parameter with identical receipts.
{
  const plan = await loadSourceProject(join(typedTasks, "plan.algal"));
  const planArgs = JSON.parse(await readFile(join(typedTasks, "plan.args.json"), "utf8")) as { input: { tasks: Record<string, JsonValue>[]; weights: JsonValue } };
  const tasks = planArgs.input.tasks;
  const edit = (index: number, fields: Record<string, JsonValue>) => tasks.map((task, i) => i === index ? { ...task, ...fields } : task);
  const variants: [string, Record<string, JsonValue>][] = [
    ["valid", planArgs.input],
    ["malformed-list", { ...planArgs.input, tasks: tasks[0]! }],
    ["malformed-item", { ...planArgs.input, tasks: [...tasks.slice(0, 2), "backup"] }],
    ["malformed-status", { ...planArgs.input, tasks: edit(1, { status: "later" }) }],
    ["malformed-maximum", { ...planArgs.input, tasks: edit(1, { urgency: 7 }) }],
    ["malformed-minimum", { ...planArgs.input, tasks: edit(0, { impact: -1 }) }],
    ["malformed-nested-team", { ...planArgs.input, tasks: edit(2, { owner: { name: "Sam", team: "sales" } }) }],
    ["malformed-nested-field", { ...planArgs.input, tasks: edit(0, { owner: { team: "platform" } }) }],
    ["malformed-weights", { ...planArgs.input, weights: { urgency: 11, impact: 1 } }],
  ];
  const store = new MemoryStore();
  for (const module of plan.modules) await store.putManifest(module);
  const bundlePath = join(temporary, "typed-plan.bundle.json");
  const manifestPath = join(temporary, "typed-plan.algal.json");
  await writeFile(bundlePath, canonicalize(await packOrganism(plan.manifest, store) as unknown as JsonValue));
  await writeFile(manifestPath, canonicalize(manifestToJson(plan.manifest)));
  for (const [variant, input] of variants) {
    const name = `source-typed-plan-${variant}`;
    const fixtureBase = join(temporary, name);
    await writeFile(`${fixtureBase}.args.json`, canonicalize({ input }));
    await writeFile(`${fixtureBase}.responses.json`, "{}");
    files.push(`${name}.algal.json`);
    modules.push(plan.manifest);
    generated.set(name, { manifestPath, fixtureBase, bundlePath, modules: plan.modules, responsesPath: `${fixtureBase}.responses.json` });
    if (variant.startsWith("malformed")) failing.add(name);
  }
}
let failed = 0;

async function native(args: string[], exitCode = 0) {
  const proc = Bun.spawn([binary, ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  if (code !== exitCode) throw new Error(stderr || stdout);
  return JSON.parse(stdout) as Record<string, JsonValue>;
}

try {
  for (const [index, file] of files.entries()) {
    const name = file.replace(/\.algal\.json$/, "");
    const manifest = modules[index]!;
    const store = new MemoryStore();
    for (const module of modules) await store.putManifest(module);
    for (const module of generated.get(name)?.modules ?? []) await store.putManifest(module);
    let args: Record<string, Record<string, JsonValue>> = {};
    let responses: Record<string, JsonValue> = {};
    const manifestPath = generated.get(name)?.manifestPath ?? join(examples, file);
    const fixtureBase = generated.get(name)?.fixtureBase ?? join(examples, name);
    const runArgs = ["run", manifestPath, "--modules", examples, "--dir", join(temporary, name), "--write"];
    for (const suffix of ["args", "responses"] as const) {
      const path = suffix === "responses" ? generated.get(name)?.responsesPath ?? `${fixtureBase}.responses.json`
        : generated.get(name)?.argsPath ?? `${fixtureBase}.args.json`;
      try {
        const value = JSON.parse(await readFile(path, "utf8"));
        if (suffix === "args") args = value;
        else responses = value;
        runArgs.push(`--${suffix}`, path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    const transports: Record<string, Transport> = {};
    const transportFile = join(examples, `${name}.transports.json`);
    if (await Bun.file(transportFile).exists()) {
      const targets: Record<string, string> = JSON.parse(await readFile(transportFile, "utf8"));
      for (const [key, target] of Object.entries(targets)) transports[key] = fileTransport(resolve(root, target), key);
      runArgs.push("--transports", transportFile);
    }
    const reference = await runOrganism({ manifest, args, store, transports, fns: builtinRegistry(), executors: [scriptedExecutor(responses)] });
    try {
      if (generated.has(name) && reference.outcome !== (failing.has(name) ? "failed" : "complete")) throw new Error(`source example outcome: ${reference.outcome}`);
      const bundlePath = generated.get(name)?.bundlePath;
      if (bundlePath !== undefined) await native(["unpack", bundlePath, "--dir", join(temporary, name)]);
      const result = await native(runArgs, failing.has(name) ? 1 : 0);
      const expected = reference as unknown as Record<string, JsonValue>;
      const differences = ["manifestDigest", "manifestKey", "args", "outcome", "cells", "effects", "events", "work", "failure"]
        .filter((field) => canonicalize(result[field] ?? null) !== canonicalize(expected[field] ?? null));
      if (differences.length) {
        failed++;
        console.error(`${name}: differs in ${differences.join(", ")}`);
        for (const field of differences) console.error(JSON.stringify({ field, native: result[field], reference: expected[field] }));
        continue;
      }
      const reverse = await verifyReceipt(
        result as JsonValue,
        manifestToJson(manifest),
        new FileStore(join(temporary, name)),
        builtinRegistry(),
        transports,
      );
      if (!reverse.ok) throw new Error(`reference could not verify native receipt: ${JSON.stringify(reverse)}`);
      const receiptFile = join(temporary, `${name}.receipt.json`);
      await writeFile(receiptFile, canonicalize(expected));
      const verification = await native(["verify", receiptFile, manifestPath, "--modules", examples, "--dir", join(temporary, name)]);
      if (verification.ok !== true) throw new Error(`native could not verify reference receipt: ${JSON.stringify(verification)}`);
      const identity = await native(["digest", manifestPath]);
      if (identity.digest !== reference.manifestDigest) throw new Error("manifest identity mismatch");
      if (bundlePath !== undefined) {
        const namedArgs = Object.fromEntries(Object.entries(manifest.interface!.inputs)
          .map(([name, end]) => [name, args[end.cell]![end.port]!]));
        const namedArgsPath = join(temporary, `${name}.named-args.json`);
        await writeFile(namedArgsPath, canonicalize(namedArgs));
        const called = await native(["call", bundlePath, "--interface", "--args", namedArgsPath,
          "--responses", generated.get(name)!.responsesPath!, "--dir", join(temporary, `${name}-offline`)], failing.has(name) ? 1 : 0);
        // A rejected input fails the standalone call with the reference failure and no outputs.
        const expectedOutputs = failing.has(name) ? {} : Object.fromEntries(Object.entries(manifest.interface!.outputs)
          .map(([name, end]) => [name, reference.cells[end.cell]!.outputs![end.port]!]));
        const expectedError = failing.has(name) ? { code: reference.failure!.code, message: reference.failure!.message } : null;
        if (called.ok !== !failing.has(name) || canonicalize(called.outputs!) !== canonicalize(expectedOutputs)
          || canonicalize(called.error ?? null) !== canonicalize(expectedError)) {
          throw new Error("standalone source-project bundle call did not match reference outputs");
        }
      }
      console.log(`${name}: identical semantics + receipts cross-verified`);
    } catch (error) {
      failed++;
      console.error(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`manifest: ${canonicalize(manifestToJson(manifest)).slice(0, 160)}`);
    }
  }
  // Counterfactual replay parity: a recorded run replayed under revised
  // manifests must emit the same algal.replay-comparison.v1 record through
  // both runtimes, and the revised receipts must verify in the opposite
  // runtime in both directions.
  {
    const manifestPath = join(examples, "approve.algal.json");
    const manifest = parseOrganismManifest(JSON.parse(await readFile(manifestPath, "utf8")));
    const args = JSON.parse(await readFile(join(examples, "approve.args.json"), "utf8")) as Record<string, Record<string, JsonValue>>;
    const responses = JSON.parse(await readFile(join(examples, "approve.responses.json"), "utf8")) as Record<string, JsonValue>;
    const responsesPath = join(examples, "approve.responses.json");
    const replayDir = join(temporary, "replay-store");
    const store = new FileStore(replayDir);
    const original = await runOrganism({
      manifest, args, store, fns: builtinRegistry(), executors: [scriptedExecutor(responses)],
    });
    const receiptPath = join(temporary, "replay.receipt.json");
    await writeFile(receiptPath, canonicalize(original as unknown as JsonValue));
    // Mutate a plain copy, then re-admit it: port types must come back in
    // their normalized object form, exactly like a caller-edited manifest.
    const revision = (edit: (copy: JsonObject) => void): JsonValue => {
      const copy = JSON.parse(canonicalize(manifestToJson(manifest))) as JsonObject & { cells: JsonValue[]; edges: JsonValue[] };
      edit(copy);
      return manifestToJson(parseOrganismManifest(copy)) as unknown as JsonValue;
    };
    const revisions: [string, JsonValue][] = [
      ["identical", manifestToJson(manifest) as unknown as JsonValue],
      ["diverged", revision((copy) => {
        (copy.cells as { id: string; prompt?: string }[]).find((cell) => cell.id === "gate")!.prompt = "Approve this change for merge? Answer decisively.";
      })],
      ["missing-effect", revision((copy) => {
        (copy.cells as JsonValue[]).push({ id: "postmortem", kind: "agent", inputs: { summary: "text" },
          prompt: "One-line postmortem.", view: { inputs: "*" }, output: { kind: "text" } });
        (copy.edges as JsonValue[]).push({ from: { cell: "review", port: "out" }, to: { cell: "postmortem", port: "summary" } });
      })],
      ["missing-input", revision((copy) => {
        const input = (copy.cells as { id: string; outputs?: Record<string, JsonValue> }[]).find((cell) => cell.id === "pr")!;
        input.outputs!.extra = "text";
        (copy.cells as JsonValue[]).push({ id: "audit", kind: "agent", inputs: { extra: "text" },
          prompt: "Audit the extra input.", view: { inputs: "*" }, output: { kind: "text" } });
        (copy.edges as JsonValue[]).push({ from: { cell: "pr", port: "extra" }, to: { cell: "audit", port: "extra" } });
      })],
    ];
    for (const [label, rev] of revisions) {
      const caseName = `replay-${label}`;
      try {
        const revPath = join(temporary, `${caseName}.algal.json`);
        await writeFile(revPath, canonicalize(rev));
        const expected = await replayComparison({
          receipt: original as unknown as JsonValue, revision: rev,
          store: new MemoryStore(), fns: builtinRegistry(), executors: [scriptedExecutor(responses)],
        });
        const expectedJson = replayComparisonToJson(expected.comparison);
        const nativeDir = join(temporary, `${caseName}-native`);
        const result = await native(
          ["replay", receiptPath, "--with", revPath, "--responses", responsesPath, "--write", "--dir", nativeDir],
          expected.comparison.verdict === "could-not-replay" ? 1 : 0,
        );
        if (canonicalize(result) !== canonicalize(expectedJson)) {
          throw new Error(`comparison differs: ${canonicalize(result)}`);
        }
        // The native revised receipt was persisted by --write under its CAS
        // storage digest — locate it by its intrinsic receipt digest. The
        // reference runtime must replay it offline; the reference's revised
        // receipt must verify under the native runtime.
        if (expected.comparison.revisedReceipt !== null) {
          let persisted: JsonValue | undefined;
          for (const file of await readdir(join(nativeDir, "runs"))) {
            const candidate = JSON.parse(await readFile(join(nativeDir, "runs", file), "utf8")) as { digest?: string };
            if (candidate.digest === expected.comparison.revisedReceipt) persisted = candidate as JsonValue;
          }
          if (persisted === undefined) throw new Error("native did not persist the revised receipt");
          const reverse = await verifyReceipt(persisted, rev, new FileStore(nativeDir), builtinRegistry());
          if (!reverse.ok) throw new Error(`reference could not verify native revised receipt: ${JSON.stringify(reverse)}`);
          const revisedPath = join(temporary, `${caseName}.revised.json`);
          await writeFile(revisedPath, canonicalize(expected.revised as JsonValue));
          const forward = await native(["verify", revisedPath, revPath, "--dir", nativeDir]);
          if (forward.ok !== true) throw new Error(`native could not verify reference revised receipt: ${JSON.stringify(forward)}`);
        }
        console.log(`${caseName}: identical comparison + revised receipts cross-verified`);
      } catch (error) {
        failed++;
        console.error(`${caseName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  // Ordering exploration parity: the same algal.ordering-scenario.v1 must
  // produce the same algal.ordering-report.v1 through both runtimes, and the
  // dispatch receipts the evidence store accumulates must verify natively.
  {
    const budgets = { maxSteps: 16, maxAgentCalls: 4, maxWork: 10_000, maxContextBytes: 8192, maxOutputBytes: 8192, maxDepth: 2 };
    const waiter = {
      contract: "algal.organism.v1", key: "organism:waiter", name: "Waiter",
      cells: [
        { id: "inbox", kind: "input", outputs: { mailbox: { type: "cap", capability: "mailbox-receive" } } },
        { id: "take", kind: "tool", tool: "mailbox.receive.v1" },
      ],
      edges: [{ from: { cell: "inbox", port: "mailbox" }, to: { cell: "take", port: "mailbox" } }],
      budgets,
    };
    const allComplete = ["and",
      ["eq", ["get", "processes", "alpha", "status"], "complete"],
      ["eq", ["get", "processes", "beta", "status"], "complete"]];
    const base: JsonObject = {
      contract: "algal.ordering-scenario.v1",
      mailboxes: [{ name: "inbox", maxMessages: 4, maxMessageBytes: 1024 }],
      processes: [
        { name: "alpha", manifest: waiter as JsonValue, args: { inbox: { mailbox: "mailbox:inbox:receive" } } },
        { name: "beta", manifest: waiter as JsonValue, args: { inbox: { mailbox: "mailbox:inbox:receive" } } },
      ],
      sends: [{ mailbox: "inbox", value: "go", key: digestCanonical({ k: 1 }) }],
      invariant: { contract: "algal.expr.v1", program: allComplete },
      limits: { orderings: 16, depth: 12, work: 1_000_000, attempts: 64, runs: 64 },
    };
    const scenarios: [string, JsonValue][] = [
      ["ordering-counterexample", base],
      ["ordering-exhaust-budget", { ...base, limits: { ...base.limits as JsonObject, runs: 1 } }],
      ["ordering-exhaust-orderings", { ...base, limits: { ...base.limits as JsonObject, orderings: 1 } }],
      ["ordering-complete", {
        ...base,
        mailboxes: [
          { name: "inbox-a", maxMessages: 4, maxMessageBytes: 1024 },
          { name: "inbox-b", maxMessages: 4, maxMessageBytes: 1024 },
        ],
        processes: [
          { name: "alpha", manifest: waiter as JsonValue, args: { inbox: { mailbox: "mailbox:inbox-a:receive" } } },
          { name: "beta", manifest: waiter as JsonValue, args: { inbox: { mailbox: "mailbox:inbox-b:receive" } } },
        ],
        sends: [
          { mailbox: "inbox-a", value: "for-a", key: digestCanonical({ k: "a" }) },
          { mailbox: "inbox-b", value: "for-b", key: digestCanonical({ k: "b" }) },
        ],
        limits: { orderings: 64, depth: 12, work: 1_000_000_000, attempts: 4096, runs: 4096 },
      }],
    ];
    const waiterPath = join(temporary, "ordering-waiter.algal.json");
    await writeFile(waiterPath, canonicalize(waiter as JsonValue));
    for (const [caseName, scenario] of scenarios) {
      try {
        const scenarioPath = join(temporary, `${caseName}.scenario.json`);
        await writeFile(scenarioPath, canonicalize(scenario));
        const refStore = new MemoryStore();
        const expected = await exploreOrdering(scenario, { store: refStore });
        const dir = join(temporary, `${caseName}-native`);
        const report = await native(["ordering", scenarioPath, "--dir", dir],
          expected.report.outcome === "complete" ? 0 : 1);
        if (canonicalize(report) !== canonicalize(expected.report as unknown as JsonValue)) {
          throw new Error(`report differs: ${canonicalize(report)}`);
        }
        // Every dispatch receipt the reference produced verifies natively,
        // and the native evidence store's receipts verify under the
        // reference runtime.
        for (const receipt of expected.receipts) {
          const receiptPath = join(temporary, `${caseName}.${receipt.digest.slice(7, 15)}.receipt.json`);
          await writeFile(receiptPath, canonicalize(receipt as unknown as JsonValue));
          const forward = await native(["verify", receiptPath, waiterPath, "--dir", dir]);
          if (forward.ok !== true) throw new Error(`native could not verify ordering dispatch receipt: ${JSON.stringify(forward)}`);
        }
        const nativeStore = new FileStore(dir);
        const digests = new Set<string>();
        for (const row of report.orderings as { processes: { receipt: string | null }[] }[]) {
          for (const proc of row.processes) if (proc.receipt !== null) digests.add(proc.receipt);
        }
        const tools = mailboxToolRegistry(new FileMailboxService(dir));
        for (const digest of digests) {
          const receipt = await nativeStore.getReceipt(digest as `sha256:${string}`);
          if (receipt === undefined) throw new Error(`native evidence store missing receipt ${digest}`);
          const reverse = await verifyReceipt(receipt, waiter as JsonValue, new FileStore(dir), builtinRegistry(), undefined, tools);
          if (!reverse.ok) throw new Error(`reference could not verify native ordering receipt: ${JSON.stringify(reverse)}`);
        }
        console.log(`${caseName}: identical ordering report + dispatch receipts cross-verified`);
      } catch (error) {
        failed++;
        console.error(`${caseName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
// One budgeted foundry activity through both CLIs: complete, exhausted on
// each limit, and refused configurations.
const budget = await habitatBudgetParity(binary);
console.log(JSON.stringify({ examples: files.length, passed: files.length - failed, failed }));
console.log(JSON.stringify({ habitatBudgetCases: budget.cases, failed: budget.failed }));
process.exitCode = failed || budget.failed ? 1 : 0;
