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
import { AlgalError } from "../src/errors";
import v2Admission from "./fixtures/schema-v2-admission.json";
import v2Values from "./fixtures/schema-v2-values.json";

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
  { name: "nullable-string", schema: { type: ["null", "string"] }, good: null, bad: false },
  { name: "number-or-array", schema: { type: ["number", "array"] }, good: [1, 2], bad: "2" },
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

/** A rejected command writes its JSON error to stderr; `rejection` reads it. */
async function native(args: string[], rejection = false) {
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
    require(out.length || (rejection && err.length), `native command returned no JSON: ${err}`);
    return { value: JSON.parse(out.length ? out : err) as Record<string, JsonValue>, code };
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
  const v2 = await schemaVersion2();
  console.log(JSON.stringify({ ok: true, cases: cases.length, comparisons, inputBoundaryCases: inputCases.length, ...v2,
    successfulCrossVerifications: crossVerified.complete, failedCrossVerifications: crossVerified.failed, failedSelfVerifications: failedSelfVerified, providerCalls: 0 }));
} finally { await rm(directory, { recursive: true, force: true }); }

// Schema version 2 (spec/v1/organism.md, "JSON schemas"): every value rule runs
// through both runtimes at an agent output and at a consumer's input port with
// identical receipts, and every declaration rule is refused at admission with
// the same code and reason (the reference prefixes the schema's location).
async function schemaVersion2() {
  const store = join(directory, "store");
  let valueComparisons = 0, inputComparisons = 0, admissionComparisons = 0;
  const manifestFor = (key: string, cells: JsonValue[], edges: JsonValue[] = []) => ({ contract: "algal.organism.v1", key: `organism:${key}`, name: key, cells, edges });
  for (const item of v2Values as unknown as { name: string; schema: JsonObject; good: JsonValue[]; bad: [JsonValue, string][] }[]) {
    const agent = parseOrganismManifest(manifestFor(`v2-${item.name}`, [{ id: "answer", kind: "agent", prompt: "Return the admitted scripted output.",
      output: { kind: "json", schema: item.schema, schemaVersion: 2 } }]));
    const input = parseOrganismManifest(manifestFor(`v2-input-${item.name}`, [{ id: "input", kind: "input", outputs: { data: "json" } },
      { id: "consumer", kind: "agent", inputs: { data: { type: "json", schema: item.schema, schemaVersion: 2 } }, prompt: "Runs only for an admitted value.", output: { kind: "text" } }],
    [{ from: { cell: "input", port: "data" }, to: { cell: "consumer", port: "data" } }]));
    const files: string[] = [];
    for (const manifest of [agent, input]) {
      const file = join(directory, `${manifest.key.slice("organism:".length)}.algal.json`);
      await writeFile(file, canonicalize(manifestToJson(manifest)));
      files.push(file);
    }
    const runs: [JsonValue, string | undefined][] = [...item.good.map((value): [JsonValue, undefined] => [value, undefined]), ...item.bad];
    for (const [index, [value, message]] of runs.entries()) {
      for (const [boundary, manifest, file] of [["output", agent, files[0]!], ["input", input, files[1]!]] as const) {
        const label = `v2-${boundary}-${item.name}-${index}`;
        const responses = boundary === "output" ? { answer: [value] } : { consumer: ["admitted"] };
        const args = boundary === "output" ? {} : { input: { data: value } };
        const responseFile = join(directory, `${label}.responses.json`);
        const argsFile = join(directory, `${label}.args.json`);
        await writeFile(responseFile, canonicalize(responses));
        await writeFile(argsFile, canonicalize(args));
        const reference = await runOrganism({ manifest, fns: builtinRegistry(), store: new MemoryStore(), executors: [scriptedExecutor(responses)], args });
        const result = await native(["run", file, "--args", argsFile, "--responses", responseFile, "--dir", store]);
        const expected = message === undefined ? null
          : { code: boundary === "output" ? "EFFECT_UNPARSEABLE" : "TYPE_MISMATCH", message, path: boundary === "output" ? "answer" : "consumer" };
        require(canonicalize((reference.failure ?? null) as JsonValue) === canonicalize(expected), `${label}: reference failure ${JSON.stringify(reference.failure)}`);
        require(canonicalize(result.value.failure ?? null) === canonicalize(expected), `${label}: native failure ${JSON.stringify(result.value.failure)}`);
        require(result.code === (message === undefined ? 0 : 1), `${label}: native exit ${result.code}`);
        if (boundary === "input" && message !== undefined) require(reference.effects.length === 0 && (result.value.effects as JsonValue[]).length === 0, `${label}: malformed input activated an effect`);
        await crossVerify(reference as unknown as Record<string, JsonValue>, result.value, manifestToJson(manifest), file, label);
        if (boundary === "output") valueComparisons++; else inputComparisons++;
      }
    }
  }
  const names = (count: number) => Array.from({ length: count }, (_, i) => `f${i}`);
  const admission = [...v2Admission as { name: string; schema: JsonObject; reason: string }[],
    { name: "required-over-bound", schema: { required: names(65) }, reason: "required must list at most 64 distinct names of at most 64 UTF-16 code units" },
    { name: "properties-over-bound", schema: { properties: Object.fromEntries(names(65).map(name => [name, {}])) }, reason: "properties must map at most 64 names to schemas" },
    { name: "enum-over-bound", schema: { type: "number", enum: Array.from({ length: 33 }, (_, i) => i) }, reason: "enum must list 1 to 32 distinct values" },
    { name: "enum-value-over-bound", schema: { type: "string", enum: ["x".repeat(255)] }, reason: "enum values must be strings, finite numbers, booleans, or null of at most 256 canonical JSON bytes" },
    { name: "version-3", schema: { type: "string" }, version: 3, reason: "schemaVersion must be 2" },
  ] as { name: string; schema: JsonObject; reason: string; version?: number }[];
  for (const item of admission) {
    const version = item.version ?? 2;
    const placements: [string, JsonValue][] = [
      ["output", { id: "answer", kind: "agent", prompt: "No effect before admission.", output: { kind: "json", schema: item.schema, schemaVersion: version } }],
      ["input-port", { id: "answer", kind: "agent", inputs: { data: { type: "json", schema: item.schema, schemaVersion: version } }, prompt: "No effect before admission.", output: { kind: "text" } }],
      ["producer-port", { id: "input", kind: "input", outputs: { data: { type: "json", schema: item.schema, schemaVersion: version } } }],
    ];
    for (const [placement, cell] of placements) {
      const raw = manifestFor(`v2-admission-${item.name}`, [cell]);
      const file = join(directory, `v2-admission-${item.name}-${placement}.algal.json`);
      await writeFile(file, JSON.stringify(raw));
      let reference: unknown;
      try { parseOrganismManifest(raw); } catch (error) { reference = error; }
      require(reference instanceof AlgalError && reference.code === "PARSE_FAILED" && reference.message.endsWith(item.reason), `${item.name} ${placement}: reference ${String(reference)}`);
      const rejected = await native(["check", file, "--dir", store], true);
      const error = rejected.value.error as JsonObject | undefined;
      require(rejected.code === 2 && error?.code === "PARSE_FAILED" && error.message === item.reason, `${item.name} ${placement}: native ${JSON.stringify(rejected.value)}`);
      admissionComparisons++;
    }
  }
  return { schemaV2ValueCases: valueComparisons, schemaV2InputCases: inputComparisons, schemaV2AdmissionCases: admissionComparisons };
}
