import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import {
  ApplicationService, admitApplicationActivation, builtinRegistry, evaluateApplicationRevision,
  getApplicationRecord, manifestToJson, parseApplicationRevision, parseOrganismManifest,
  parseRunReceipt, projectApplicationView, putApplicationRecord, verifyReceipt,
  type ApplicationAdmission, type ApplicationSnapshot,
} from "../../index";
import { collectApplicationViewEvidence } from "../../src/application-view";
import { evaluateApplicationGoals } from "../../src/application-goal";
import { ApplicationMemoryService } from "../../src/application-memory";
import { NativeMemoryQueryEngine } from "../../src/application-native-memory";
import { requestExecution, scheduleInvestigations } from "../../src/application-investigation";
import { canonicalize, type JsonValue } from "../../src/values";
import { digestCanonical, type Digest } from "../../src/digest";
import {
  createHarnessAdmission, createHarnessDispatcher, createHarnessDomain, drainProbes,
  drainProposals, harnessApplicationAdmission, harnessTerminal,
} from "../coding-harness/application";
import { json, object, sha256 } from "../coding-harness/memory-records";

const identity = (value: unknown) => digestCanonical(json(value));
function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const phases = ["initialize", "observe", "refresh", "propose", "evaluate", "activate", "execute", "inspect"] as const;
type Phase = typeof phases[number];
const toolA = "tools/inventory-a", toolB = "tools/inventory-b";

function planner(improved: boolean) {
  return parseOrganismManifest({
    contract: "algal.organism.v1", key: improved ? "organism:inventory-planner-v2" : "organism:inventory-planner-v1", name: "Inventory tool discovery and replenishment policy",
    budgets: { maxAgentCalls: 0, maxSteps: 4, maxWork: 4000 },
    interface: { inputs: { q: { cell: "stock", port: "value" } }, outputs: { decision: { cell: "plan", port: "out" }, tool: { cell: "tool", port: "out" } } },
    cells: [
      { id: "stock", kind: "input", outputs: { value: "json" } },
      { id: "plan", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program: improved ? ["if", ["lt", ["get", "value", "units"], 5], "restock", "hold"] : "hold" }, output: { kind: "text" } },
      { id: "tool", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program: improved ? ["get", "value", "tool"] : toolA }, output: { kind: "text" } },
    ],
    edges: ["plan", "tool"].map(cell => ({ from: { cell: "stock", port: "value" }, to: { cell, port: "value" } })),
  });
}

function authored(name: string, output: string, value: JsonValue, maxWork: number) {
  return parseOrganismManifest({
    contract: "algal.organism.v1", key: `organism:inventory-${name}`, name: `Authored inventory ${name}`,
    budgets: { maxAgentCalls: 0, maxSteps: 3, maxWork },
    interface: { inputs: { req: { cell: "request", port: "value" } }, outputs: { [output]: { cell: "decision", port: "value" } } },
    cells: [{ id: "request", kind: "input", outputs: { value: "json" } }, { id: "decision", kind: "const", outputs: { value: { type: "json", value } } }], edges: [],
  });
}

export type InventoryEvidence = {
  contract: "algal.adaptive-inventory-demo.v1";
  goal: {reference: Digest; statuses: string[]};
  root: string; nativeSha256: string; state: Digest; revision: Digest; evaluation: Digest;
  proposal: Digest; view: Digest; unknownView: Digest; decision: string; observations: number; probeEffects: number;
  episodeEffects: number; restartRedeliveries: number; contenders: { accepted: number; rejected: number };
  hostInvocations: { phase: Phase; pid: number; exitCode: number; evidence: Digest }[];
  toolDiscovery: { before: string; after: string; executions: number };
  evaluationCases: { train: number; validation: number; holdout: number; executions: number };
  inhabitants: { name: string; manifest: Digest; capabilities: string[]; maxWork: number; maxAgentCalls: number }[];
  qualification: { proposal: "authored-deterministic"; inference: "native-replay-verified"; modelCalls: 0; paidApiSpendUsd: 0 };
  report: string | null; unknownReport: string | null;
};
type PhaseEvidence = {
  goal?: Digest; goalStatuses?: string[];
  phase: Phase; pid: number; state: Digest; observations: number; probeEffects: number; episodeEffects: number;
  toolExecutions: number; proposal?: Digest; candidate?: Digest; evaluation?: Digest; evaluationExecutions?: number;
  accepted?: number; restartRedeliveries?: number; view?: Digest; unknownView?: Digest; inhabitants?: InventoryEvidence["inhabitants"];
};

/** Every application operation happens in a fresh host process. The parent only
 * starts and joins those processes and retains their bounded evidence. */
export async function runInventoryScenario(root: string, executable: string, reportExecutable?: string): Promise<InventoryEvidence> {
  if (!isAbsolute(root) || !isAbsolute(executable) || (reportExecutable && !isAbsolute(reportExecutable))) throw new Error("Demo paths must be absolute");
  const nativeSha256 = sha256(await readFile(executable));
  await mkdir(root, { mode: 0o700 });
  await writeFile(join(root, "native-sha256"), nativeSha256, { flag: "wx", mode: 0o600 });
  const hostInvocations: InventoryEvidence["hostInvocations"] = [];
  let final: PhaseEvidence | undefined;
  for (const phase of phases) {
    const output = await childOutput([process.execPath, import.meta.path, "--phase", root, executable, phase], root, 30000);
    const result = JSON.parse(output.toString("utf8")) as PhaseEvidence;
    ensure(result.phase === phase && Number.isSafeInteger(result.pid), "Host phase identity mismatch");
    const retained = json(result);
    await writeFile(join(root, `phase-${phase}.json`), canonicalize(retained), { flag: "wx", mode: 0o600 });
    hostInvocations.push({ phase, pid: result.pid, exitCode: 0, evidence: identity(retained) }); final = result;
  }
  ensure(new Set(hostInvocations.map(p => p.pid)).size === phases.length, "Host phases did not use distinct processes");
  ensure(final?.candidate && final.evaluation && final.proposal && final.view && final.unknownView && final.inhabitants && final.goal && final.goalStatuses && final.evaluationExecutions === 12 && final.accepted === 1, "Final phase evidence is incomplete");
  let report: string | null = null, unknownReport: string | null = null;
  if (reportExecutable) {
    for (const suffix of ["-unknown", ""]) {
      const output = await childOutput([reportExecutable, "--dir", join(root, "report-store"), "application", "report", join(root, `view${suffix}.json`)], root, 10000);
      const path = join(root, `report${suffix}.html`); await writeFile(path, output, { flag: "wx" });
      if (suffix) unknownReport = path; else report = path;
    }
  }
  const evidence: InventoryEvidence = {
    contract: "algal.adaptive-inventory-demo.v1", goal: {reference: final.goal, statuses: final.goalStatuses}, root, nativeSha256, state: final.state, revision: final.candidate,
    evaluation: final.evaluation, proposal: final.proposal, view: final.view, unknownView: final.unknownView, decision: "restock", observations: final.observations,
    probeEffects: final.probeEffects, episodeEffects: final.episodeEffects, restartRedeliveries: final.restartRedeliveries!,
    contenders: { accepted: final.accepted, rejected: 1 }, hostInvocations,
    toolDiscovery: { before: toolA, after: toolB, executions: final.toolExecutions },
    evaluationCases: { train: 2, validation: 3, holdout: 2, executions: final.evaluationExecutions },
    inhabitants: final.inhabitants, qualification: { proposal: "authored-deterministic", inference: "native-replay-verified", modelCalls: 0, paidApiSpendUsd: 0 }, report, unknownReport,
  };
  await writeFile(join(root, "evidence.json"), canonicalize(json(evidence)), { flag: "wx" });
  return evidence;
}

async function childOutput(argv: string[], cwd: string, timeoutMs: number): Promise<Buffer> {
  const child = Bun.spawn(argv, { cwd, stdout: "pipe", stderr: "pipe" });
  const timeout = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
  const read = async (stream: ReadableStream<Uint8Array>) => {
    const chunks: Uint8Array[] = []; let total = 0;
    for await (const chunk of stream) { total += chunk.length; if (total > 1_048_576) { child.kill("SIGKILL"); throw new Error("Child output bound exceeded"); } chunks.push(chunk); }
    return Buffer.concat(chunks);
  };
  try {
    const output = await Promise.allSettled([read(child.stdout), read(child.stderr), child.exited]);
    ensure(output[0].status === "fulfilled" && output[1].status === "fulfilled" && output[2].status === "fulfilled", "Child output did not settle");
    ensure(output[2].value === 0, `Inventory host failed: ${output[1].value.toString("utf8").slice(-4000)}`);
    return output[0].value;
  } finally { clearTimeout(timeout); if (child.exitCode === null) { child.kill("SIGKILL"); await child.exited; } }
}

async function runPhase(root: string, executable: string, phase: Phase): Promise<PhaseEvidence> {
  const index = phases.indexOf(phase);
  ensure(index >= 0 && isAbsolute(root) && isAbsolute(executable), "Invalid host phase");
  const prior = index ? JSON.parse(await readFile(join(root, `phase-${phases[index - 1]}.json`), "utf8")) as PhaseEvidence : undefined;
  const nativeSha256 = await readFile(join(root, "native-sha256"), "utf8");
  ensure(sha256(await readFile(executable)) === nativeSha256, "Native executable changed across host restart");
  const workspace = join(root, "workspace"), stateDir = join(root, "host"), appDir = join(root, "application");
  if (!prior) {
    await mkdir(workspace); await mkdir(join(workspace, "tools"));
    await writeFile(join(workspace, "inventory.json"), '{"units":10}');
    await writeFile(join(workspace, "toolchain.json"), JSON.stringify({ tool: toolA }));
    await writeFile(join(workspace, toolA), "#!/bin/sh\nprintf '%s\\n' inventory-tool-v1\n", { mode: 0o700, flag: "wx" });
  }
  const engine = new NativeMemoryQueryEngine({ executable, expectedSha256: nativeSha256, temporaryRoot: root });
  const baseAdmission = harnessApplicationAdmission();
  const admission: ApplicationAdmission = {
    async admitDispatch(context) { ensure(baseAdmission.admitDispatch, "Inventory dispatcher admission missing"); return baseAdmission.admitDispatch(context); },
    async admitCommit(context) {
      ensure(memory, "Inventory admission is not initialized");
      await memory.validateForRevision(context.command.memory, context.revision);
      if (context.command.kind === "activate") {
        ensure(context.current && context.command.evidence.length === 1, "Activation needs its checked evaluation");
        await admitApplicationActivation(context.store, { evaluation: context.command.evidence[0]!, expectedState: context.current.digest, revision: context.command.revision }, { fns: builtinRegistry(), executors: [] });
      }
    },
  };
  const service = new ApplicationService(appDir, admission), store = service.store;
  const schema = await store.putValue({ contract: "algal.application-memory-schema.v1", relations: [{ name: "observed-result", arity: 2 }] });
  const domain = await createHarnessDomain(store, {
    application: "inventory", environmentId: "inventory-lab", taskId: "restock", sequenceId: "inventory-sequence", schema,
    dependencies: { inventory: "inventory.json", toolchain: "toolchain.json" }, cwd: workspace, stateDir,
    procedures: [
      { id: "stock", description: "Read available stock units", operation: { kind: "read-json-field", path: "inventory.json", field: "units" }, dependencies: ["inventory"] },
      { id: "tool", description: "Discover the configured inventory tool", operation: { kind: "read-json-field", path: "toolchain.json", field: "tool" }, dependencies: ["toolchain"] },
    ],
  });
  const memoryAdmission = createHarnessAdmission(domain, store);
  const memory: ApplicationMemoryService = new ApplicationMemoryService({ store, engine, admission: memoryAdmission });
  const program = await store.putValue({ contract: "algal.query.v1", rules: [{ id: "stock-tool", head: { relation: "inventory", terms: [{ var: "tool" }, { var: "units" }, { var: "polarity" }] }, body: [
    { relation: "observed-result", terms: ["stock", { var: "units" }, { var: "polarity" }] },
    { relation: "observed-result", terms: ["tool", { var: "tool" }, { var: "polarity" }] },
  ] }], query: { relation: "inventory", terms: [{ var: "tool" }, { var: "units" }, { var: "polarity" }] }, limits: { maxWork: 10000, maxRounds: 8, maxDerived: 32, maxBindings: 32, maxRows: 8, maxOutputBytes: 262144 } });
  const query = await store.putValue({ contract: "algal.application-memory-query.v1", id: "stock", schema, program, procedures: [domain.procedureRefs.stock!, domain.procedureRefs.tool!].sort(), polarityColumn: 2, conflict: "single-value" });
  const queries = await store.putValue({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const goal = await putApplicationRecord(store, {contract: "algal.application-goal.v1", application: "inventory", id: "discover-inventory", description: "Establish current stock and discover the current inventory tool before selecting a replenishment recommendation.", query, entrypoint: "planner"});
  const viewSpec = { contract: "algal.application-view-spec.v1" as const, title: "Adaptive inventory", widgets: ["goals", "history", "investigations", "memory", "procedures"] as const };
  const views = await store.putValue(json(viewSpec));
  const runtimeProfile = await store.putValue({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await store.putValue({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 100000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const incumbent = await store.putManifest(planner(false)), improved = planner(true);
  const investigator = await store.putManifest(authored("investigator", "probes", { procedures: ["stock", "tool"] }, 2000));
  const proposer = await store.putManifest(authored("proposer", "proposed", manifestToJson(improved), 3000));
  const revision = await putApplicationRecord(store, {
    contract: "algal.application-revision.v1", application: "inventory", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, goals: [goal],
    capabilityRequirements: ["inventory-propose", "inventory-read"], entrypoints: [
      { name: "investigator", manifest: investigator, applicability: query, maxGenerations: 1, capabilities: ["inventory-read"], queries: [query] },
      { name: "planner", manifest: incumbent, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] },
      { name: "proposer", manifest: proposer, applicability: query, maxGenerations: 1, capabilities: ["inventory-propose"], queries: [query] },
    ],
  });
  const evidence: PhaseEvidence = { ...(prior ?? {}), phase, pid: process.pid, state: prior?.state ?? identity("uninitialized"), observations: prior?.observations ?? 0, probeEffects: prior?.probeEffects ?? 0, episodeEffects: prior?.episodeEffects ?? 0, toolExecutions: prior?.toolExecutions ?? 0 };
  const terminal = harnessTerminal(workspace);
  const inner = createHarnessDispatcher(domain, store, async (request, signal) => { evidence.probeEffects++; return terminal(request, signal); }, memoryAdmission.currentFrontier);
  const dispatcher = { ...inner, async dispatch(context: Parameters<typeof inner.dispatch>[0]) {
    if (context.intent.kind === "deliver") {
      const [name, capability] = context.intent.route === "probes" ? ["investigator", "inventory-read"] : ["proposer", "inventory-propose"];
      ensure(context.snapshot.revision.entrypoints.find(e => e.name === name)?.capabilities.includes(capability!), "Inhabitant lacks domain authority");
    } else evidence.episodeEffects++;
    return inner.dispatch(context);
  } };
  const inspect = async (): Promise<ApplicationSnapshot> => { const value = await service.inspect("inventory"); ensure(value, "Inventory head missing"); return value; };
  const captureGoal = async (head: ApplicationSnapshot) => {
    const captured = (await evaluateApplicationGoals(memory!, head))[0];
    ensure(captured?.goal === goal, "Inventory revision lost its retained goal");
    evidence.goal = captured.goal; evidence.goalStatuses = [...(evidence.goalStatuses ?? []), captured.status];
    return captured;
  };
  const captureView = async (head: ApplicationSnapshot, objective: Awaited<ReturnType<typeof captureGoal>>, filename: string) => {
    ensure(objective.derivation, "Captured goal has no derivation evidence");
    const entry = head.revision.entrypoints.find(e => e.name === objective.definition.entrypoint)!;
    const history = await service.history("inventory");
    const diagnostics = await collectApplicationViewEvidence(service, history, [objective.derivation]);
    const view = projectApplicationView({snapshot: head, spec: {...viewSpec, widgets: [...viewSpec.widgets]}, history, goals: [objective], evidence: diagnostics,
      applicability: {[entry.name]: {status: objective.status, queryResult: {digest: objective.derivation, state: head.digest, procedure: entry.manifest}}}});
    await writeFile(join(root, filename), canonicalize(json(view)), {flag: "wx"});
    return identity(view);
  };
  const schedule = async (head: ApplicationSnapshot, operation: string) => {
    const objective = await captureGoal(head);
    ensure(objective.status === "unknown" || objective.status === "stale", "Investigation must be driven by an unresolved retained goal");
    return scheduleInvestigations(service, memory!, { application: "inventory", operation: identity(operation), expectedHead: head.digest, expectedMemory: head.state.memory, route: "probes", entrypoints: [objective.definition.entrypoint] });
  };
  const observe = async () => {
    const delivered = await service.dispatchPending("inventory", dispatcher);
    ensure(delivered.length === 1 && delivered[0]!.status === "settled", "Investigation delivery did not settle");
    const drained = await drainProbes(domain, service, memory!);
    ensure(drained.rejected.length === 0 && drained.committed.length === 2, "Observations were not admitted"); evidence.observations += drained.committed.length;
    ensure((await drainProbes(domain, service, memory!)).committed.length === 0, "Observation replay duplicated a transition");
  };
  const execution = async (head: ApplicationSnapshot, operation: string, contend = false) => {
    const objective = await captureGoal(head);
    ensure(objective.status === "supported" && objective.derivation, "Retained goal is not supported at the execution state");
    const applicable = await memory!.query(head.digest, objective.definition.query);
    ensure(applicable.derivation.status === "supported" && applicable.derivation.result, `Planner lacks verified inventory evidence: ${applicable.derivation.status} (${applicable.derivation.reason ?? "no complete supporting result"})`);
    const rows = object(await store.getValue(applicable.derivation.result)).rows;
    ensure(Array.isArray(rows) && rows.length === 1, "Inventory query has no unique result");
    const tuple = object(rows[0]).tuple;
    ensure(Array.isArray(tuple) && typeof tuple[0] === "string" && typeof tuple[1] === "number", "Inventory result has wrong types");
    const input = await store.putValue({ stock: { value: { tool: tuple[0], units: tuple[1] } } });
    const submit = (name: string) => requestExecution(service, { application: "inventory", operation: identity(name), expectedHead: head.digest, expectedMemory: head.state.memory, entrypoint: objective.definition.entrypoint, input, derivation: applicable.ref });
    if (!contend) { await submit(operation); return; }
    const results = await Promise.allSettled([submit(operation + "-a"), submit(operation + "-b")]);
    evidence.accepted = results.filter(r => r.status === "fulfilled").length;
    ensure(evidence.accepted === 1, "Concurrent writers must publish exactly one episode");
    let rejected = false; try { await submit("stale-writer-retry"); } catch { rejected = true; }
    ensure(rejected, "Stale writer retry passed the head fence");
  };
  const settleEpisode = async (expectedTool: string, expectedDecision: string) => {
    const episodes = await service.dispatchPending("inventory", dispatcher);
    ensure(episodes.length === 1, "Expected one planner episode"); const episode = episodes[0]!;
    ensure(episode.status === "settled" && episode.plan.kind === "episode" && episode.result, "Planner episode did not settle once");
    const settled = object(await store.getValue(episode.result));
    ensure(typeof settled.outcome === "string", "Settled episode omitted its retained outcome");
    const outcome = object(await store.getValue(settled.outcome as Digest));
    ensure(outcome.contract === "algal.episode-outcome.v2" && outcome.binding === identity(episode.plan.binding) && typeof outcome.receipt === "string", "Outcome does not bind the episode");
    const receipt = parseRunReceipt(await store.getReceipt(outcome.receipt as Digest)), manifest = await store.getManifest(episode.plan.binding.manifest);
    ensure(manifest && (await verifyReceipt(receipt, manifestToJson(manifest), store)).ok, "Episode receipt failed replay verification");
    ensure(receipt.cells.plan?.outputs?.out === expectedDecision && receipt.cells.tool?.outputs?.out === expectedTool, "Planner did not discover the current tool and decision");
    ensure(expectedTool === toolA || expectedTool === toolB, "Tool path is outside the authored fixture");
    const checked = await childOutput([join(workspace, expectedTool)], workspace, 5000);
    ensure(checked.toString("utf8") === "inventory-tool-v1\n", "Discovered tool did not execute"); evidence.toolExecutions++;
    await writeFile(join(root, `tool-${phase}.json`), canonicalize(json({ tool: expectedTool, outcome: settled.outcome, stdout: checked.toString("utf8") })), { flag: "wx" });
  };
  try {
    if (phase === "initialize") {
      const genesisMemory = await memory.snapshot({ application: "inventory", schema, previous: null, scope: domain.scope, observations: [], hypotheses: [], withdrawn: [] });
      const genesis = await service.create({ application: "inventory", operation: identity("inventory-genesis"), kind: "create", expectedHead: null, revision, memory: genesisMemory, intents: [], evidence: [], causedBy: null });
      ensure((await memory.query(genesis.digest, query)).derivation.status === "unknown", "Genesis should have no observations");
      await schedule(genesis, "observe-stock");
      const pending = await inspect(), unknown = (await evaluateApplicationGoals(memory, pending))[0];
      ensure(unknown?.status === "unknown", "Initial diagnostic view must retain the unresolved goal");
      evidence.unknownView = await captureView(pending, unknown, "view-unknown.json");
    } else if (phase === "observe") {
      await observe(); await execution(await inspect(), "execute-incumbent"); await settleEpisode(toolA, "hold");
      await rename(join(workspace, toolA), join(workspace, toolB));
      await writeFile(join(workspace, "toolchain.json"), JSON.stringify({ tool: toolB }));
      await writeFile(join(workspace, "inventory.json"), '{"units":1}');
    } else if (phase === "refresh") {
      const head = await inspect();
      ensure((await memory.query(head.digest, query)).derivation.status === "stale", "Host restart resurrected stale tool/stock evidence");
      ensure((await service.dispatchPending("inventory", dispatcher)).length === 0, "Restart repeated settled incumbent work");
      await schedule(head, "refresh-stock");
    } else if (phase === "propose") {
      await observe(); const head = await inspect();
      const request = await store.putValue({ contract: "algal.proposal-request.v1", application: "inventory", entrypoint: "planner", state: head.digest, nonce: "authored-v2" });
      await service.commit({ application: "inventory", operation: identity("propose-policy"), kind: "investigate", expectedHead: head.digest, revision, memory: head.state.memory, intents: [{ kind: "deliver", route: "proposals", message: request }], evidence: [], causedBy: null });
    } else if (phase === "evaluate") {
      ensure((await service.dispatchPending("inventory", dispatcher))[0]?.status === "settled", "Proposal delivery failed");
      const candidates = await drainProposals(domain, service);
      ensure(candidates.rejected.length === 0 && candidates.proposals.length === 1, "Authored proposal evidence failed verification");
      const proposal = candidates.proposals[0]!, previous = await getApplicationRecord(store, revision, parseApplicationRevision);
      const candidate = await putApplicationRecord(store, { ...previous, parent: revision, entrypoints: previous.entrypoints.map(e => e.name === "planner" ? { ...e, manifest: proposal.manifest } : e) });
      const row = (id: string, split: string, tool: string, units: number) => ({ id, split, args: { q: { tool, units } }, expect: { decision: units < 5 ? "restock" : "hold", tool } });
      const cases = await store.putValue({ contract: "algal.application-evaluation-cases.v1", cases: [
        row("train-a-high", "train", toolA, 10), row("train-a-low", "train", toolA, 1),
        row("validation-a-boundary", "validation", toolA, 5), row("validation-b-high", "validation", toolB, 10), row("validation-b-low", "validation", toolB, 1),
        row("holdout-b-empty", "holdout", toolB, 0), row("holdout-b-boundary", "holdout", toolB, 5),
      ] });
      const scorer = await store.putValue({ contract: "algal.application-evaluation-scorer.v1", scorer: null }), head = await inspect();
      const evaluation = await evaluateApplicationRevision(store, { contract: "algal.application-evaluation-request.v1", parentState: head.digest, candidateRevision: candidate, entrypoint: "planner", cases, scorer, policy: evaluationPolicy }, { fns: builtinRegistry(), executors: [] });
      ensure(evaluation.evaluation.verdict.status === "accepted", "Improved authored policy was not accepted");
      const report = object(await store.getValue(evaluation.evaluation.foundryReport));
      ensure(Array.isArray(report.candidates), "Foundry report has no candidates");
      const count = report.candidates.reduce((n, c) => { const cases = object(c).cases; ensure(Array.isArray(cases), "Missing candidate cases"); return n + cases.length; }, 0);
      const holdout = object(report.holdout).cases; ensure(Array.isArray(holdout), "Missing holdout cases");
      evidence.evaluationExecutions = count + holdout.length; ensure(evidence.evaluationExecutions === 12, "Expected twelve evaluated executions");
      evidence.proposal = proposal.ref; evidence.candidate = candidate; evidence.evaluation = evaluation.evaluationRef;
    } else if (phase === "activate") {
      ensure(evidence.candidate && evidence.evaluation, "Missing evaluated revision"); const head = await inspect();
      const activated = await service.commit({ application: "inventory", operation: identity("activate-policy"), kind: "activate", expectedHead: head.digest, revision: evidence.candidate, memory: head.state.memory, intents: [], evidence: [evidence.evaluation], causedBy: null });
      await execution(activated, "planner", true);
    } else if (phase === "execute") {
      await settleEpisode(toolB, "restock");
    } else {
      evidence.restartRedeliveries = (await service.dispatchPending("inventory", dispatcher)).length;
      ensure(evidence.restartRedeliveries === 0, "Host restart repeated a settled delivery");
      const head = await inspect(), objective = await captureGoal(head);
      evidence.view = await captureView(head, objective, "view.json");
      evidence.inhabitants = await Promise.all(head.revision.entrypoints.map(async entry => { const manifest = await store.getManifest(entry.manifest); ensure(manifest, "Inhabitant manifest missing"); return { name: entry.name, manifest: entry.manifest, capabilities: entry.capabilities, maxWork: manifest.budgets.maxWork, maxAgentCalls: manifest.budgets.maxAgentCalls }; }));
    }
    evidence.state = (await inspect()).digest;
    return evidence;
  } finally { await engine.settle(); }
}

if (import.meta.main) {
  if (process.argv[2] === "--phase") {
    console.log(JSON.stringify(await runPhase(process.argv[3]!, process.argv[4]!, process.argv[5] as Phase)));
  } else {
    const destination = process.argv[2], executable = process.env.ALGAL_MEMORY_NATIVE;
    if (!destination || !executable) throw new Error("Usage: ALGAL_MEMORY_NATIVE=/absolute/algal [ALGAL_BIN=/absolute/algal] bun examples/adaptive-inventory/run.ts NEW_DIRECTORY");
    console.log(JSON.stringify(await runInventoryScenario(resolve(destination), resolve(executable), process.env.ALGAL_BIN ? resolve(process.env.ALGAL_BIN) : undefined)));
  }
}
