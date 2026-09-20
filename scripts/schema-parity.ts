// Focused native/Bun acceptance and error-code parity for the documented schema
// subset. Uses scripted responses only; never activates a model or provider.
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../src/contract";
import { scriptedExecutor } from "../src/effects";
import { builtinRegistry } from "../src/registry";
import { runOrganism } from "../src/run";
import { MemoryStore } from "../src/store";
import { canonicalize, type JsonObject, type JsonValue } from "../src/values";
import { verifyReceipt } from "../src/verify";

const binary = resolve(process.argv[2] ?? process.env.ALGAL_BIN ?? "target/debug/algal");
const directory = await mkdtemp(join(tmpdir(), "algal-schema-parity-"));
const cases: { name: string; schema: JsonObject; good: JsonValue; bad: JsonValue }[] = [
  { name: "string", schema: { type: "string" }, good: "brief", bad: {} },
  { name: "number", schema: { type: "number" }, good: 3.5, bad: [] },
  { name: "integer", schema: { type: "integer" }, good: 3, bad: 3.5 },
  { name: "boolean", schema: { type: "boolean" }, good: false, bad: {} },
  { name: "null", schema: { type: "null" }, good: null, bad: {} },
  { name: "array", schema: { type: "array" }, good: ["one"], bad: {} },
  { name: "object", schema: { type: "object" }, good: {}, bad: [] },
  { name: "nested-required", schema: { required: ["ticket"], properties: { ticket: { required: ["owner"] } } },
    good: { ticket: { owner: "reviewer" } }, bad: { ticket: {} } },
  { name: "nested-type", schema: { properties: { ticket: { properties: { detail: {} } } } },
    good: { ticket: { detail: {} } }, bad: { ticket: { detail: 4 } } },
  { name: "property-order", schema: { properties: { z: { type: "string" }, a: { required: ["new"] } } },
    good: { z: "ok", a: { new: true } }, bad: { z: 3, a: {} } },
  { name: "unicode-order", schema: { properties: { "😀": { type: "boolean" }, "\ue000": { type: "number" } } },
    good: { "😀": true, "\ue000": 3 }, bad: { "😀": 3, "\ue000": false } },
  { name: "numeric-key-order", schema: { properties: { "2": { type: "boolean" }, "10": { type: "string" } } },
    good: { "2": true, "10": "ok" }, bad: { "2": 3, "10": false } },
  { name: "provider-hints", schema: { type: "object", additionalProperties: false, properties: { summary: { type: "string", maxLength: 2, enum: ["ok"] } } },
    good: { summary: "longer than hint", extra: true }, bad: { summary: 3 } },
];

function require(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function native(args: string[]) {
  const child = Bun.spawn([binary, ...args], { cwd: directory, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  let expired = false;
  const timer = setTimeout(() => { expired = true; child.kill("SIGKILL"); }, 10_000);
  async function bounded(stream: ReadableStream<Uint8Array>, max: number): Promise<string> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > max) { child.kill("SIGKILL"); throw new Error("schema parity native output bound"); }
        chunks.push(next.value);
      }
      return Buffer.concat(chunks).toString("utf8");
    } finally { reader.releaseLock(); }
  }
  try {
    const [out, err, code] = await Promise.all([bounded(child.stdout, 1_048_576), bounded(child.stderr, 65_536), child.exited]);
    require(!expired, "schema parity native deadline");
    require(out.length, `native command returned no JSON: ${err}`);
    return { value: JSON.parse(out) as Record<string, JsonValue>, code };
  } finally { clearTimeout(timer); if (child.exitCode === null) child.kill("SIGKILL"); await child.exited; }
}

let comparisons = 0;
let failedSelfVerified = 0;
const crossVerified = { complete: 0, failed: 0 };
async function crossVerify(reference: Record<string, JsonValue>, actual: Record<string, JsonValue>, manifest: JsonValue, file: string, label: string) {
  require(canonicalize(actual.cells!) === canonicalize(reference.cells!), `${label}: cell records differ`);
  require((await verifyReceipt(actual, manifest, new MemoryStore(), builtinRegistry())).ok, `${label}: Bun cannot verify native receipt`);
  const receiptFile = join(directory, `${label}.bun.receipt.json`);
  await writeFile(receiptFile, canonicalize(reference));
  const checked = await native(["verify", receiptFile, file, "--dir", join(directory, "store")]);
  require(checked.code === 0 && checked.value.ok === true, `${label}: native cannot verify Bun receipt`);
  crossVerified[reference.outcome as "complete" | "failed"] += 2;
  if (reference.outcome === "failed") {
    require((await verifyReceipt(reference, manifest, new MemoryStore(), builtinRegistry())).ok, `${label}: Bun failed receipt cannot self-verify`);
    const nativeFile = join(directory, `${label}.native.receipt.json`);
    await writeFile(nativeFile, canonicalize(actual));
    const self = await native(["verify", nativeFile, file, "--dir", join(directory, "store")]);
    require(self.code === 0 && self.value.ok === true, `${label}: native failed receipt cannot self-verify`);
    failedSelfVerified += 2;
  }
}
try {
  for (const item of cases) {
    const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:schema-${item.name}`, name: `Schema ${item.name}`,
      cells: [{ id: "answer", kind: "agent", prompt: "Return the admitted scripted output.", output: { kind: "json", schema: item.schema } }], edges: [] });
    const manifestJson = manifestToJson(manifest);
    const file = join(directory, `${item.name}.algal.json`);
    await writeFile(file, canonicalize(manifestJson));
    for (const [valid, value] of [[true, item.good], [false, item.bad]] as const) {
      const responses = { answer: [value] };
      const responseFile = join(directory, `${item.name}-${valid}.responses.json`);
      await writeFile(responseFile, canonicalize(responses));
      const reference = await runOrganism({ manifest, fns: builtinRegistry(), store: new MemoryStore(), executors: [scriptedExecutor(responses)] });
      const result = await native(["run", file, "--responses", responseFile, "--dir", join(directory, "store")]);
      require(result.value.contract === "algal.run.v1", `${item.name}: native run receipt missing`);
      require(result.value.outcome === reference.outcome && reference.outcome === (valid ? "complete" : "failed"), `${item.name}: runtime acceptance differs`);
      if (!valid) {
        require(reference.failure?.code === "EFFECT_UNPARSEABLE", `${item.name}: reference failure code`);
        require((result.value.failure as JsonObject).code === reference.failure.code, `${item.name}: failure codes differ`);
      } else require(result.code === 0, `${item.name}: native successful run exit`);
      await crossVerify(reference as unknown as Record<string, JsonValue>, result.value, manifestJson, file, `${item.name}-${valid}`);
      comparisons++;
    }
  }
  const inputCases = cases.filter(item => item.name === "string" || item.name.startsWith("nested-"));
  for (const item of inputCases) {
    const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:input-${item.name}`, name: `Input ${item.name}`,
      cells: [{ id: "input", kind: "input", outputs: { data: "json" } },
        { id: "consumer", kind: "agent", inputs: { data: { type: "json", schema: item.schema } }, prompt: "Must not activate.", output: { kind: "text" } }],
      edges: [{ from: { cell: "input", port: "data" }, to: { cell: "consumer", port: "data" } }] });
    const manifestJson = manifestToJson(manifest);
    const file = join(directory, `input-${item.name}.algal.json`);
    const argsFile = join(directory, `input-${item.name}.args.json`);
    const args = { input: { data: item.bad } };
    await writeFile(file, canonicalize(manifestJson));
    await writeFile(argsFile, canonicalize(args));
    const reference = await runOrganism({ manifest, fns: builtinRegistry(), store: new MemoryStore(), executors: [], args });
    const result = await native(["run", file, "--args", argsFile, "--dir", join(directory, "store")]);
    require(reference.failure?.code === "TYPE_MISMATCH" && (result.value.failure as JsonObject).code === "TYPE_MISMATCH", `${item.name}: input schema error code differs`);
    require(reference.effects.length === 0 && (result.value.effects as JsonValue[]).length === 0, `${item.name}: malformed input activated an effect`);
    await crossVerify(reference as unknown as Record<string, JsonValue>, result.value, manifestJson, file, `input-${item.name}`);
  }
  console.log(JSON.stringify({ ok: true, cases: cases.length, comparisons, inputBoundaryCases: inputCases.length,
    successfulCrossVerifications: crossVerified.complete, failedCrossVerifications: crossVerified.failed, failedSelfVerifications: failedSelfVerified, providerCalls: 0 }));
} finally { await rm(directory, { recursive: true, force: true }); }
