/** Deterministic local-context execution and rejection cases through both
 * runtimes. The provider is scripted and replay never activates live tools. */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { scriptedExecutor } from "../src/effects";
import { builtinRegistry } from "../src/registry";
import { runOrganism } from "../src/run";
import { FileStore, MemoryStore } from "../src/store";
import { verifyReceipt } from "../src/verify";
import { canonicalize, type JsonObject, type JsonValue } from "../src/values";

const root = resolve(import.meta.dir, "..");
const binary = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const temporary = await mkdtemp(join(tmpdir(), "algal-local-context-parity-"));
const original = JSON.parse(await readFile(join(root, "examples/agent-local-context.algal.json"), "utf8")) as JsonObject;
const arguments_ = JSON.parse(await readFile(join(root, "examples/agent-local-context.args.json"), "utf8")) as Record<string, Record<string, JsonValue>>;
const responses = JSON.parse(await readFile(join(root, "examples/agent-local-context.responses.json"), "utf8")) as Record<string, JsonValue>;
const query = (value: JsonValue): JsonValue => ({ tool: "agent.context.local.v1", inputs: { query: value } });
const cases: { name: string; responses?: Record<string, JsonValue>; work?: number; standalone?: boolean }[] = [
  { name: "elision" },
  { name: "foreign-reference", responses: { agent: [query({ op: "read", index: 0, snapshot: "other-cell" })] } },
  { name: "unknown-key-order", responses: { agent: [query({ op: "inspect", z: true, a: true })] } },
  { name: "numeric-key-order", responses: { agent: [query({ op: "inspect", "2": true, "10": true })] } },
  { name: "unicode-key-order", responses: { agent: [query({ op: "inspect", "\ue000": true, "\u{10000}": true })] } },
  { name: "budget-error-order", responses: { agent: [query({ op: "inspect", z: "x".repeat(4097), a: [[1]] })] } },
  { name: "outer-key-order", responses: { agent: [{ tool: "agent.context.local.v1", inputs: { query: { op: "inspect" }, "\ue000": true, "\u{10000}": true } }] } },
  { name: "missing-query", responses: { agent: [{ tool: "agent.context.local.v1", inputs: {} }] } },
  { name: "hidden-entry", responses: { agent: [query({ op: "read", index: 999 })] } },
  { name: "hidden-large-slice", responses: { agent: [query({ op: "slice", index: 999, startByte: 0, endByte: 8192 })] } },
  { name: "search-schema-before-grant", responses: { agent: [query({ op: "search", query: "violet", maxResults: 17, maxScanBytes: 0 })] } },
  { name: "search-grant-limit", responses: { agent: [query({ op: "search", query: "violet", maxResults: 17 })] } },
  { name: "work-exhausted", work: 200 },
  { name: "standalone-after-agent", responses: { agent: ["The cell finished."] }, standalone: true },
];

async function native(argv: string[], expectedCode = 0): Promise<JsonValue> {
  const child = Bun.spawn([binary, ...argv], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const timeout = setTimeout(() => child.kill(), 30_000);
  try {
    const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    if (code !== expectedCode || child.signalCode !== null) throw new Error(`${argv[0]} exited ${code}: ${(err || out).slice(-2000)}`);
    return JSON.parse(out) as JsonValue;
  } finally { clearTimeout(timeout); }
}

try {
  for (const item of cases) {
    const raw = structuredClone(original);
    if (item.work !== undefined) raw.budgets = { maxWork: item.work };
    const args = structuredClone(arguments_);
    if (item.standalone) {
      const cells = raw.cells as JsonObject[];
      cells.push({ id: "query", kind: "input", outputs: { query: "json" } }, { id: "unbound", kind: "tool", tool: "agent.context.local.v1" });
      (raw.edges as JsonValue[]).push({ from: { cell: "query", port: "query" }, to: { cell: "unbound", port: "query" } });
      args.query = { query: { op: "inspect" } };
    }
    const manifest = parseOrganismManifest(raw);
    const executor = scriptedExecutor(item.responses ?? responses);
    const seen: string[] = [];
    const reference = await runOrganism({ manifest, args, store: new MemoryStore(), fns: builtinRegistry(), executors: [{ ...executor, execute: request => {
      seen.push(canonicalize(request.context));
      return executor.execute(request);
    } }] });
    if (seen.some(context => context.includes("UNDECLARED INPUT MUST STAY HIDDEN"))) throw new Error(`${item.name}: hidden input leaked`);
    if (item.name === "elision") {
      if (reference.outcome !== "complete" || seen.length !== 4 || seen[2]!.includes("HISTORICAL-violet") || !seen[3]!.includes("HISTORICAL-violet")) throw new Error("elision: exact history was not recovered after clipping");
    } else if (reference.outcome !== "failed") throw new Error(`${item.name}: expected refusal`);
    if (item.work !== undefined && seen.length !== 0) throw new Error("work exhaustion dispatched a provider");
    const prefix = join(temporary, item.name);
    const manifestPath = `${prefix}.algal.json`, argsPath = `${prefix}.args.json`, responsesPath = `${prefix}.responses.json`, receiptPath = `${prefix}.receipt.json`;
    await writeFile(manifestPath, canonicalize(manifestToJson(manifest)));
    await writeFile(argsPath, canonicalize(args));
    await writeFile(responsesPath, canonicalize(item.responses ?? responses));
    const actual = await native(["run", manifestPath, "--args", argsPath, "--responses", responsesPath, "--dir", prefix, "--write"], reference.outcome === "complete" ? 0 : 1);
    if (canonicalize(actual) !== canonicalize(reference as unknown as JsonValue)) throw new Error(`${item.name}: native/reference receipts differ\n${canonicalize({ reference, native: actual } as unknown as JsonValue)}`);
    await writeFile(receiptPath, canonicalize(reference as unknown as JsonValue));
    if ((await native(["verify", receiptPath, manifestPath, "--dir", prefix]) as JsonObject).ok !== true) throw new Error(`${item.name}: native replay failed`);
    if (!(await verifyReceipt(actual, manifestToJson(manifest), new FileStore(prefix))).ok) throw new Error(`${item.name}: reference replay failed`);
  }
  console.log(JSON.stringify({ cases: cases.length, passed: cases.length, checks: "scope, elision, authority, work, identical receipts, bidirectional offline replay" }));
} finally { await rm(temporary, { recursive: true, force: true }); }
