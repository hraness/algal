// Source–generated differential harness. This file alone straddles the
// boundary: it compiles and runs the same source project through the
// production compiler/scheduler (the compared artifact) and through the
// independent model in this directory, then compares them at the projections
// a source program can observe — outline structure, module identity, ordered
// effect requests, results, failures, and selected-path accounting.
//
// Everything imported from `src/` here produces the compared artifact or a
// shared contract value (digests, decision schemas); none of it is consulted
// by `model.ts`, `parse.ts`, `check.ts`, `types.ts`, or `interp.ts`.
import { compileSource, type SourceCompilation, type SourceCompilerOptions } from "../../src/source";
import { compileOrganism } from "../../src/graph";
import { runOrganism, type RunReceipt } from "../../src/run";
import { builtinRegistry } from "../../src/registry";
import { MemoryStore } from "../../src/store";
import { manifestToJson, parseOrganismManifest } from "../../src/contract";
import { digestCanonical, digestText } from "../../src/digest";
import { effectRequestDigest, type EffectRequest, type Executor } from "../../src/effects";
import { decisionAnswerSchema } from "../../src/decisions";
import { canonicalize, type JsonObject, type JsonValue } from "../../src/values";
import { loadProject, moduleClosure, runProgram, type LoadedProject } from "./interp";
import type { Outline, OutlineCell, OutlineEdge } from "./check";
import { DEFAULT_BUDGETS, type Budgets, type CheckedModule, type SourceObservation, type SourceRun, SrcError } from "./model";

const GENERATE_PROMPT = "Algal source generation envelope v1. Follow the instruction in inputs.instruction. Use only inputs.context as task context. Return the requested text.";

/** Policy the two sides share: production executor requests and the model's
 *  observations both lower to the same `algal.effect.v1` request shape, so a
 *  single policy decides both sides deterministically. */
export type OraclePolicy = (request: EffectRequest) => JsonValue;

// ------------------------------------------------------ manifest outline --

type ManifestCell = {
  id: string; kind: string;
  inputs?: Record<string, JsonValue>;
  outputs?: Record<string, JsonValue>;
  expr?: { contract: string; program: JsonValue };
  output?: JsonObject;
  view?: { inputs?: string[] | "*" };
  prompt?: string; questions?: JsonObject;
  manifest?: string; over?: string; maxItems?: number;
};
type ManifestEdge = { from: { cell: string; port: string }; to: { cell: string; port: string };
  guard?: { equals: string; field?: string } | { expr: { contract: string; program: JsonValue } } };
type ManifestLike = {
  key: string; name: string; budgets: Budgets;
  interface?: { inputs: Record<string, { cell: string; port: string }>; outputs: Record<string, { cell: string; port: string }> };
  cells: ManifestCell[];
  edges: ManifestEdge[];
};

/** Project a generated manifest to the cell/edge skeleton the independent
 *  checker predicts. `resolveManifest` maps child manifest digests back to
 *  source keys so the model's `manifest: <child key>` field compares. */
export function manifestOutline(manifest: ManifestLike, resolveManifest?: (digest: string) => string): Outline {
  const cell = (cell: ManifestCell): OutlineCell => {
    const inputs = Object.entries(cell.inputs ?? {}).map(([name, port]) => ({ name, port: port as never }));
    const guarded = inputs.some(input => /^source-control-\d+$/.test(input.name)) ? { guarded: true as const } : {};
    return {
      id: cell.id, kind: cell.kind as OutlineCell["kind"],
      inputs,
      ...(cell.outputs !== undefined ? { outputs: Object.entries(cell.outputs).map(([name, port]) => ({ name, port: port as never })) } : {}),
      ...(cell.expr !== undefined ? { program: cell.expr.program } : {}),
      ...(cell.output !== undefined ? { output: cell.output } : {}),
      ...(cell.view?.inputs !== undefined ? { viewInputs: cell.view.inputs as string[] } : {}),
      ...(cell.prompt !== undefined ? { prompt: cell.prompt } : {}),
      ...(cell.questions !== undefined ? { questions: cell.questions } : {}),
      ...(cell.over !== undefined ? { over: cell.over } : {}),
      ...(cell.maxItems !== undefined ? { maxItems: cell.maxItems } : {}),
      ...guarded,
      ...(cell.manifest !== undefined && resolveManifest !== undefined ? { manifest: resolveManifest(cell.manifest) } : {}),
    };
  };
  const edge = (edge: ManifestEdge): OutlineEdge => ({
    from: `${edge.from.cell}.${edge.from.port}`,
    to: `${edge.to.cell}.${edge.to.port}`,
    ...(edge.guard !== undefined && "equals" in edge.guard && edge.guard.equals !== undefined ? { guard: edge.guard.equals } : {}),
  });
  return {
    key: manifest.key, name: manifest.name, budgets: manifest.budgets,
    interface: manifest.interface ?? { inputs: {}, outputs: {} },
    cells: manifest.cells.map(cell),
    edges: manifest.edges.map(edge),
  };
}

// ------------------------------------------------------------- wrappers ---

/** The fixed trigger-wrapper manifest the production compiler emits for a
 *  guarded parameterless `call` — predicted here and compared byte-for-byte
 *  through `parseOrganismManifest` normalization. */
export function predictedWrapper(childManifestDigest: string, childCalls: number, childDepth: number): JsonObject {
  return {
    contract: "algal.organism.v1", key: "organism:source-call-trigger", name: "Guarded parameterless call",
    budgets: { ...DEFAULT_BUDGETS, maxAgentCalls: childCalls, maxDepth: Math.min(8, childDepth + 1) },
    interface: { inputs: { trigger: { cell: "input", port: "trigger" } }, outputs: { result: { cell: "call", port: "result" } } },
    cells: [
      { id: "input", kind: "input", outputs: { trigger: { type: "json" } } },
      { id: "call", kind: "organism", manifest: childManifestDigest },
    ],
    edges: [],
  };
}

// ------------------------------------------------------------- compare ----

export type CompileDiff = {
  /** `equal` — both sides accepted or both rejected, and (on acceptance)
   *  every projection compared equal. */
  equal: boolean;
  mismatches: string[];
  model?: LoadedProject & { root: CheckedModule } | undefined;
  modelError?: { phase: string; code: string; message: string } | undefined;
  compilation?: SourceCompilation | undefined;
  compileError?: { code: string; message: string } | undefined;
};

const describeError = (error: unknown): { code: string; message: string } => {
  if (error instanceof Error && "code" in error && typeof (error as { code: unknown }).code === "string") {
    return { code: (error as { code: string }).code, message: error.message };
  }
  return { code: "INTERNAL", message: error instanceof Error ? error.message : String(error) };
};

const canon = (value: unknown): JsonValue => canonicalize(value as JsonValue);
const canonText = (value: unknown): string => JSON.stringify(canon(value));

/** Compile the same source through the model (`loadProject`) and through the
 *  production compiler (`compileSource`), then compare accept/reject
 *  agreement plus every semantic projection: per-module outlines, analysis,
 *  the calls table, the modules closure, and predicted wrapper manifests. */
export function compareCompilation(source: string, options: SourceCompilerOptions = {}): CompileDiff {
  const mismatches: string[] = [];
  let model: (LoadedProject & { root: CheckedModule }) | undefined;
  let modelError: CompileDiff["modelError"];
  let compilation: SourceCompilation | undefined;
  let compileError: CompileDiff["compileError"];
  try { model = loadProject(source, options); }
  catch (error) {
    if (error instanceof SrcError) modelError = { phase: error.phase, code: error.code, message: error.message };
    else throw error;
  }
  try { compilation = compileSource(source, options); }
  catch (error) { compileError = describeError(error); }

  if (modelError !== undefined || compileError !== undefined) {
    // Production source rejections are all `PARSE_FAILED`; the model's
    // parse/check/load phase distinction refines that, so agreement is on
    // rejected-or-not only (plus the production code).
    const agree = modelError !== undefined && compileError !== undefined;
    if (agree && compileError!.code !== "PARSE_FAILED") mismatches.push(`production rejected with ${compileError!.code}, expected PARSE_FAILED`);
    if (modelError !== undefined && compileError === undefined) mismatches.push(`model rejected (${modelError.phase}: ${modelError.message}) but production compiled`);
    if (compileError !== undefined && modelError === undefined) mismatches.push(`production rejected (${compileError.message}) but model compiled`);
    return { equal: mismatches.length === 0, mismatches, model, modelError, compilation, compileError };
  }
  const project = model!;
  const prod = compilation!;
  const check = project.root.check!;

  // Digest maps: source key → digest, and digest → the manifest object.
  const digestByKey = new Map<string, string>(Object.entries(prod.project.units).map(([key, unit]) => [key, unit.manifestDigest]));
  const keyByDigest = new Map<string, string>(Object.entries(prod.project.units).map(([key, unit]) => [unit.manifestDigest, key]));
  const manifestByDigest = new Map<string, SourceCompilation["manifest"]>();
  for (const m of prod.modules) manifestByDigest.set(digestCanonical(manifestToJson(m)), m);
  manifestByDigest.set(prod.sourceMap.manifestDigest, prod.manifest);
  const resolveManifest = (digest: string): string =>
    keyByDigest.get(digest) ?? prod.project.calls.find(call => call.wrapper?.manifestDigest === digest)?.childSource ?? `unresolved:${digest}`;

  // --- Per-module outlines ----------------------------------------------
  const compareModule = (key: string, mod: CheckedModule, manifest: SourceCompilation["manifest"]): void => {
    const expected = mod.check!.outline;
    const actual = manifestOutline(manifest, resolveManifest);
    if (canonText(expected) === canonText(actual)) return;
    mismatches.push(`module ${key}: outline divergence`);
    const cellsA = new Map(expected.cells.map(c => [c.id, c]));
    const cellsB = new Map(actual.cells.map(c => [c.id, c]));
    for (const id of new Set([...cellsA.keys(), ...cellsB.keys()])) {
      if (canonText(cellsA.get(id)) !== canonText(cellsB.get(id))) {
        mismatches.push(`  cell ${id}:\n    expected ${canonText(cellsA.get(id))}\n    actual   ${canonText(cellsB.get(id))}`);
      }
    }
    if (canonText(expected.edges) !== canonText(actual.edges)) {
      mismatches.push(`  edges:\n    expected ${canonText(expected.edges)}\n    actual   ${canonText(actual.edges)}`);
    }
    for (const field of ["key", "name", "budgets", "interface"] as const) {
      if (canonText(expected[field]) !== canonText(actual[field])) {
        mismatches.push(`  ${field}: expected ${canonText(expected[field])}, actual ${canonText(actual[field])}`);
      }
    }
  };
  compareModule(project.entry, project.root, prod.manifest);
  for (const [key, digest] of digestByKey) {
    if (key === project.entry) continue;
    const mod = project.checked.get(key);
    const manifest = manifestByDigest.get(digest);
    if (mod === undefined) { mismatches.push(`project.units[${key}]: unknown to the model`); continue; }
    if (manifest === undefined) { mismatches.push(`project.units[${key}]: manifest digest ${digest} not in modules`); continue; }
    compareModule(key, mod, manifest);
  }

  // --- Analysis (root only — the compilation reports it for the entry) ----
  if (prod.analysis.maxAgentCalls !== check.analysis.maxAgentCalls || prod.analysis.requiredDepth !== check.analysis.requiredDepth) {
    mismatches.push(`analysis: expected ${canonText(check.analysis)}, actual ${canonText(prod.analysis)}`);
  }

  // --- Modules closure: call-reachability, lowering order, digest dedup ---
  const closure = moduleClosure(project.root);
  const actualClosure = prod.modules.map(m => digestCanonical(manifestToJson(m)));
  const expectedClosure = closure.map(entry =>
    entry.kind === "module" ? digestByKey.get(entry.module.key) : prod.project.calls.find(c => c.childSource === entry.child.key && c.wrapper !== undefined)?.wrapper?.manifestDigest);
  if (canonText(expectedClosure) !== canonText(actualClosure)) {
    mismatches.push(`modules closure digests: expected ${canonText(expectedClosure)}, actual ${canonText(actualClosure)}`);
  }

  // --- Wrapper manifests: predicted vs generated, byte-for-byte ----------
  const wrapperSeen = new Set<string>();
  for (const call of prod.project.calls) {
    if (call.wrapper === undefined || wrapperSeen.has(call.wrapper.manifestDigest)) continue;
    wrapperSeen.add(call.wrapper.manifestDigest);
    const actual = manifestByDigest.get(call.wrapper.manifestDigest);
    if (actual === undefined) { mismatches.push(`wrapper for ${call.cellId}: digest ${call.wrapper.manifestDigest} not in modules`); continue; }
    const child = project.checked.get(call.childSource);
    if (child === undefined) { mismatches.push(`wrapper for ${call.cellId}: child ${call.childSource} unknown to the model`); continue; }
    const predicted = parseOrganismManifest(predictedWrapper(call.childManifestDigest, child.check!.analysis.maxAgentCalls, child.check!.analysis.requiredDepth));
    if (canonText(manifestToJson(actual)) !== canonText(manifestToJson(predicted))) {
      mismatches.push(`wrapper for ${call.cellId}: manifest divergence:\n    expected ${canonText(manifestToJson(predicted))}\n    actual   ${canonText(manifestToJson(actual))}`);
    }
  }

  // --- Calls table: owners, cell ids, child keys, wrap markers ----------
  const modelCalls = new Map<string, { cellId: string; child: string; wrapped: boolean }[]>();
  const gather = (mod: CheckedModule): void => {
    if (modelCalls.has(mod.key)) return;
    modelCalls.set(mod.key, mod.check!.calls.map(site => ({ cellId: site.cellId, child: site.child.key, wrapped: site.wrapped })));
    for (const site of mod.check!.calls) gather(site.child);
  };
  gather(project.root);
  for (const actual of prod.project.calls) {
    const hit = (modelCalls.get(actual.source) ?? []).find(item => item.cellId === actual.cellId);
    if (!hit) { mismatches.push(`call ${actual.cellId} (source ${actual.source}): absent from the model's call table`); continue; }
    if (hit.child !== actual.childSource) mismatches.push(`call ${actual.cellId}: child expected ${hit.child}, actual ${actual.childSource}`);
    if (hit.wrapped !== (actual.wrapper !== undefined)) mismatches.push(`call ${actual.cellId}: wrapped expected ${hit.wrapped}, actual ${actual.wrapper !== undefined}`);
    // The organism/each cell's `manifest` field must equal the resolved
    // child digest (or its trigger wrapper's) — module identity, not layout.
    const expectedDigest = actual.wrapper !== undefined ? actual.wrapper.manifestDigest : actual.childManifestDigest;
    const ownerManifest = actual.source === project.entry ? prod.manifest : manifestByDigest.get(digestByKey.get(actual.source)!);
    const cell = ownerManifest?.cells.find(c => c.id === actual.cellId);
    if (cell !== undefined && "manifest" in cell && cell.manifest !== expectedDigest) {
      mismatches.push(`call ${actual.cellId}: cell manifest ${cell.manifest} != expected ${expectedDigest}`);
    }
  }
  for (const [source, list] of modelCalls) {
    for (const item of list) {
      if (!prod.project.calls.some(a => a.source === source && a.cellId === item.cellId)) {
        mismatches.push(`model call ${item.cellId} (source ${source}): absent from production project.calls`);
      }
    }
  }

  // --- Per-unit metadata: source digests compare; source spans do not
  //     enter the comparison surface (layout trivia is outside identity). --
  for (const [key, unit] of Object.entries(prod.project.units)) {
    const text = project.sources.get(key);
    if (text === undefined) { mismatches.push(`project.units[${key}]: no model source`); continue; }
    if (digestText(text) !== unit.sourceDigest) mismatches.push(`project.units[${key}].sourceDigest divergence`);
  }
  for (const key of project.sources.keys()) {
    if (prod.project.units[key] === undefined) mismatches.push(`model module ${key}: absent from production project.units`);
  }

  return { equal: mismatches.length === 0, mismatches, model, compilation };
}

// ------------------------------------------------------------ run side ----

/** The `algal.effect.v1` request the generated cell would issue for one
 *  source observation — prompt, context view, declared output contract, and
 *  budget envelope the model must predict exactly. */
export function expectedRequest(obs: SourceObservation, budgets: Budgets): EffectRequest {
  const cellId = obs.site.slice(obs.site.lastIndexOf("/") + 1);
  const budget = { maxContextBytes: budgets.maxContextBytes, maxOutputBytes: budgets.maxOutputBytes };
  if (obs.kind === "generate") {
    return {
      contract: "algal.effect.v1", cellId, kind: "agent", prompt: GENERATE_PROMPT,
      context: { inputs: { instruction: obs.instruction, context: obs.context }, turn: 0 },
      output: { kind: "text" }, budget,
    };
  }
  const questions = { answer: { type: "choice", instructions: obs.question, criteria: Object.fromEntries(obs.criteria) } };
  return {
    contract: "algal.effect.v1", cellId, kind: "decide", prompt: "",
    context: { inputs: { context: obs.context }, turn: 0 },
    output: { kind: "json", schema: decisionAnswerSchema(questions as never) },
    budget,
    questions: questions as never,
  };
}

export type RunDiff = {
  equal: boolean;
  mismatches: string[];
  model: SourceRun;
  receipt?: RunReceipt;
  requests: EffectRequest[];
};

/** Run both sides over the same args and the same oracle policy, then compare
 *  the observable record: outcome/failure class, result value, ordered effect
 *  requests by digest, and selected-path step/agent-call accounting. */
export async function compareRun(
  project: LoadedProject & { root: CheckedModule },
  compilation: SourceCompilation,
  args: Record<string, JsonValue>,
  policy: OraclePolicy,
): Promise<RunDiff> {
  const mismatches: string[] = [];
  const budgets = project.root.module.program.budgets;

  const requests: EffectRequest[] = [];
  const executor: Executor = {
    id: "source-differential-oracle",
    capabilities: { effects: ["agent", "decide"] },
    routeWildcard: true,
    async execute(request) { requests.push(request); return policy(request); },
  };
  const modelOracle = {
    decide: (obs: Extract<SourceObservation, { kind: "decide" }>): JsonValue => policy(expectedRequest(obs, budgets)),
    generate: (obs: Extract<SourceObservation, { kind: "generate" }>): JsonValue => policy(expectedRequest(obs, budgets)),
  };
  const modelRun = runProgram(project, project.root, args, modelOracle);

  const store = new MemoryStore();
  for (const manifest of compilation.modules) await store.putManifest(manifest);
  let receipt: RunReceipt | undefined;
  try {
    await compileOrganism(compilation.manifest, builtinRegistry(), store);
    receipt = await runOrganism({
      manifest: compilation.manifest, args: { input: args }, store,
      fns: builtinRegistry(), executors: [executor],
    });
  } catch (error) {
    mismatches.push(`production run threw: ${describeError(error).message}`);
    return { equal: false, mismatches, model: modelRun, requests };
  }

  // Outcome and failure class.
  const complete = receipt.outcome === "complete";
  if (complete !== modelRun.ok) {
    mismatches.push(`outcome: model ${modelRun.ok ? "complete" : `failed ${modelRun.error?.code}`}, receipt ${receipt.outcome} ${receipt.failure?.code ?? ""}`);
  } else if (!complete && receipt.failure !== undefined && receipt.failure.code !== modelRun.error?.code) {
    mismatches.push(`failure code: model ${modelRun.error?.code}, receipt ${receipt.failure.code} (${receipt.failure.message})`);
  }
  // Result value through the interface output port.
  const out = compilation.manifest.interface?.outputs.result;
  if (out === undefined) {
    mismatches.push("manifest carries no interface.outputs.result");
    return { equal: false, mismatches, model: modelRun, receipt, requests };
  }
  const record = receipt.cells[out.cell];
  const produced = record?.outputs?.[out.port];
  if (modelRun.ok) {
    if (modelRun.resultAbsent === true) {
      if (record?.status === "committed" || produced !== undefined) {
        mismatches.push(`result: model left the result cell skipped; receipt produced ${canonText(produced ?? null)}`);
      }
    } else if (canonText(modelRun.value ?? null) !== canonText(produced ?? null)) {
      mismatches.push(`result: model ${canonText(modelRun.value ?? null)}, receipt ${canonText(produced ?? null)}`);
    }
  }
  // Ordered effect observations, compared as request digests — the requests
  // are the external oracle boundary; cell-level plumbing (source-control
  // inputs, trigger shims) never reaches a request.
  const modelDigests = modelRun.observations.map(obs => effectRequestDigest(expectedRequest(obs, budgets)));
  const actualDigests = receipt.effects.map(effect => effect.requestDigest);
  if (modelDigests.length !== actualDigests.length || modelDigests.some((d, i) => d !== actualDigests[i])) {
    mismatches.push(`effects: model issued ${modelDigests.length} request(s), receipt ${actualDigests.length}`);
    for (const [i, digest] of modelDigests.entries()) {
      if (digest !== actualDigests[i]) mismatches.push(`  effect[${i}]: model ${digest}, receipt ${actualDigests[i] ?? "(none)"}`);
    }
  }
  // Selected-path accounting.
  if (receipt.work.agentCalls !== modelRun.agentCalls) mismatches.push(`work.agentCalls: model ${modelRun.agentCalls}, receipt ${receipt.work.agentCalls}`);
  if (receipt.work.steps !== modelRun.steps) mismatches.push(`work.steps: model ${modelRun.steps}, receipt ${receipt.work.steps}`);
  return { equal: mismatches.length === 0, mismatches, model: modelRun, receipt, requests };
}

/** One call for the common case: compile-and-run comparison with diagnostics
 *  joined. `null` when `args` is omitted — compile-only comparison. */
export async function compareProject(
  source: string,
  options: SourceCompilerOptions & { args?: Record<string, JsonValue>; policy?: OraclePolicy } = {},
): Promise<{ compile: CompileDiff; run?: RunDiff | undefined }> {
  const { args, policy, ...compileOptions } = options;
  const compile = compareCompilation(source, compileOptions);
  let run: RunDiff | undefined;
  if (compile.equal && compile.model !== undefined && compile.compilation !== undefined && args !== undefined && policy !== undefined) {
    run = await compareRun(compile.model, compile.compilation, args, policy);
  }
  return { compile, run };
}
