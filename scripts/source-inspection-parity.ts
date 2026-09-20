// Source inspection is a frontend over either runtime's ordinary receipts.
// Cross-check failed executions, provenance, and item-specific diagram states.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { compileSource, type SourceCompilerOptions } from "../src/source";
import { loadSourceProject } from "../src/source-project";
import { diagnoseSource } from "../src/source-diagnostics";
import { createProgramDiagram } from "../src/diagram";
import { packOrganism } from "../src/bundle";
import { manifestToJson } from "../src/contract";
import { FileStore, MemoryStore } from "../src/store";
import { builtinRegistry } from "../src/registry";
import { runOrganism, parseRunReceipt } from "../src/run";
import { scriptedExecutor } from "../src/effects";
import { verifyReceipt } from "../src/verify";
import { canonicalize, type JsonValue } from "../src/values";

const root = resolve(import.meta.dir, "..");
const binary = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const temp = await mkdtemp(join(tmpdir(), "algal-source-inspection-"));
const ratios = await loadSourceProject(join(root, "examples/source/projects/ratios/ratios.algal"));
type Case = { name: string; source: string; options?: SourceCompilerOptions; args: Record<string, Record<string, JsonValue>>; responses?: Record<string, JsonValue>; failurePath: string; sourceFile: string; focus?: string };
const cases: Case[] = [
  { name: "second-item", source: ratios.source, options: ratios.compilerOptions,
    args: JSON.parse(await readFile(join(root, "examples/source/projects/ratios/ratios.args.json"), "utf8")),
    failurePath: "result-each/i1/b1-fraction", sourceFile: "ratio.algal", focus: "result-each/i1" },
  { name: "guarded-parameterless", source: 'import child from "./child.algal" program parent(enabled: json) -> json { budget { max_agent_calls: 0 } return if enabled == true { call child using {} } else { 0 } }',
    options: { modules: { "child.algal": 'program child() -> json { budget { max_agent_calls: 0 } return 1 / 0 }' } },
    args: { input: { enabled: true } }, failurePath: "branch-1-arm-1/call/result", sourceFile: "child.algal", focus: "branch-1-arm-1/call" },
  { name: "argument-before-child", source: 'import child from "./child.algal" program parent(value: json) -> text { budget { max_agent_calls: 0 } return call child using { message: value } }',
    options: { modules: { "child.algal": 'program child(message: text) -> text { budget { max_agent_calls: 0 } return message }' } },
    args: { input: { value: 7 } }, failurePath: "result-arg-1", sourceFile: "main.algal" },
  { name: "decision-normalization", source: 'program choose() -> json { budget { max_agent_calls: 1 } return decide "Pick one" using null as choice { yes: "Yes", no: "No" } }',
    args: {}, responses: { "result-decide": { answers: { answer: { choice: "yes", confidence: 2, probabilities: { yes: 1, no: 0 } } } } },
    failurePath: "result", sourceFile: "main.algal" },
];
async function native(args: string[], expectedCode = 0): Promise<JsonValue> {
  const proc = Bun.spawn([binary, ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  if (code !== expectedCode) throw new Error(`native exited ${code}, expected ${expectedCode}: ${stderr || stdout}`);
  return JSON.parse(stdout) as JsonValue;
}
try {
  for (const item of cases) {
    const compilation = compileSource(item.source, item.options);
    const store = new MemoryStore();
    for (const module of compilation.modules) await store.putManifest(module);
    const manifest = compilation.manifest;
    const reference = await runOrganism({ manifest, args: item.args, store, fns: builtinRegistry(), executors: [scriptedExecutor(item.responses ?? {})] });
    if (reference.outcome !== "failed" || reference.failure?.path !== item.failurePath) throw new Error(`${item.name}: unexpected reference failure ${JSON.stringify(reference.failure)}`);
    const bundlePath = join(temp, `${item.name}.bundle.json`);
    const manifestPath = join(temp, `${item.name}.algal.json`);
    const argsPath = join(temp, `${item.name}.args.json`);
    const responsesPath = join(temp, `${item.name}.responses.json`);
    const receiptPath = join(temp, `${item.name}.receipt.json`);
    const nativeStore = join(temp, item.name);
    await writeFile(bundlePath, canonicalize(await packOrganism(manifest, store) as unknown as JsonValue));
    await writeFile(manifestPath, canonicalize(manifestToJson(manifest)));
    await writeFile(argsPath, canonicalize(item.args));
    await writeFile(responsesPath, canonicalize(item.responses ?? {}));
    await writeFile(receiptPath, canonicalize(reference as unknown as JsonValue));
    await native(["unpack", bundlePath, "--dir", nativeStore]);
    const recorded = parseRunReceipt(await native(["run", manifestPath, "--args", argsPath, "--responses", responsesPath, "--dir", nativeStore, "--write"], 1));
    const referenceReport = diagnoseSource(reference, item.source, item.options);
    const nativeReport = diagnoseSource(recorded, item.source, item.options);
    if (nativeReport.issues[0]?.location?.source !== item.sourceFile || nativeReport.issues[0]?.path !== item.failurePath) throw new Error(`${item.name}: wrong source origin`);
    const normalize = (report: typeof nativeReport) => canonicalize({ ...report, receiptDigest: null } as unknown as JsonValue);
    if (normalize(nativeReport) !== normalize(referenceReport)) throw new Error(`${item.name}: diagnostic mismatch between runtimes`);
    const forward = await native(["verify", receiptPath, manifestPath, "--dir", nativeStore]);
    if ((forward as { ok?: boolean }).ok !== true) throw new Error(`${item.name}: native replay failed`);
    const reverse = await verifyReceipt(recorded as unknown as JsonValue, manifestToJson(manifest), new FileStore(nativeStore), builtinRegistry());
    if (!reverse.ok) throw new Error(`${item.name}: reference replay failed`);
    if (item.focus) {
      const views = [reference, recorded].map(receipt => createProgramDiagram(manifest, { source: item.source, ...(item.options ? { sourceOptions: item.options } : {}), focus: item.focus!, receipt }));
      if (canonicalize(views[0]!.nodes as unknown as JsonValue) !== canonicalize(views[1]!.nodes as unknown as JsonValue)) throw new Error(`${item.name}: scoped statuses differ`);
      if (views.some(view => !view.nodes.some(node => node.status === "failed"))) throw new Error(`${item.name}: scoped failure absent`);
    }
    console.log(`${item.name}: source diagnostics and scoped evidence match; receipts cross-verified`);
  }
  console.log(JSON.stringify({ cases: cases.length, passed: cases.length }));
} finally { await rm(temp, { recursive: true, force: true }); }
