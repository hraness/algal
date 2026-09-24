import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { canonicalize, type JsonValue } from "../src/values";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../src/contract";
import { FileStore, MemoryStore } from "../src/store";
import { fileTransport, type Transport } from "../src/transport";
import { scriptedExecutor } from "../src/effects";
import { builtinRegistry } from "../src/registry";
import { runOrganism } from "../src/run";
import { verifyReceipt } from "../src/verify";
import { compileSource } from "../src/source";
import { loadSourceProject } from "../src/source-project";
import { packOrganism } from "../src/bundle";

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
let failed = 0;

async function native(args: string[]) {
  const proc = Bun.spawn([binary, ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  if (code !== 0) throw new Error(stderr || stdout);
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
      if (generated.has(name) && reference.outcome !== "complete") throw new Error(`source example did not complete: ${reference.outcome}`);
      const bundlePath = generated.get(name)?.bundlePath;
      if (bundlePath !== undefined) await native(["unpack", bundlePath, "--dir", join(temporary, name)]);
      const result = await native(runArgs);
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
          "--responses", generated.get(name)!.responsesPath!, "--dir", join(temporary, `${name}-offline`)]);
        const expectedOutputs = Object.fromEntries(Object.entries(manifest.interface!.outputs)
          .map(([name, end]) => [name, reference.cells[end.cell]!.outputs![end.port]!]));
        if (called.ok !== true || canonicalize(called.outputs!) !== canonicalize(expectedOutputs)) {
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
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(JSON.stringify({ examples: files.length, passed: files.length - failed, failed }));
process.exitCode = failed ? 1 : 0;
