/** Development-workspace milestone with the real harness boundary: the real
 * Perl probe runs in a real sandbox through a bounded terminal, `decodeProbe`
 * is the trusted decoder, the mutation frontier tracks the actual dependency
 * files, and episode dispatch runs the entrypoint manifest through the VM. */
import { afterEach, describe, expect, test } from "bun:test";
import { createXcbExecutor } from "./xcb";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ApplicationService, admitApplicationActivation, builtinRegistry, evaluateApplicationRevision,
  getApplicationRecord, manifestToJson, parseApplicationRevision, putApplicationRecord,
  parseRunReceipt, ProcessSupervisor, vercelGatewayExecutor, verifyReceipt,
} from "../../index";
import {
  ApplicationMemoryService, parseMemoryScope, parseMemorySnapshot,
  type MemoryQueryEngine,
} from "../../src/application-memory";
import { migrateApplicationMemory } from "../../src/application-migration";
import { requestExecution, scheduleInvestigations } from "../../src/application-investigation";
import { scriptedExecutor } from "../../src/effects";
import { parseOrganismManifest } from "../../src/contract";
import { digestCanonical, type Digest } from "../../src/digest";
import type { JsonValue } from "../../src/values";
import {
  createHarnessAdmission, createHarnessDispatcher, createHarnessDomain, drainProbes, drainProposals,
  harnessApplicationAdmission, harnessTerminal,
} from "./application";
import type { MemoryProcedure } from "./memory-contract";

const dirs: string[] = [];
const ref = (value: unknown) => digestCanonical(value as never);
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });

const engine: MemoryQueryEngine = {
  identity: ref({ contract: "algal.workspace-engine.v1" }),
  async query(snapshot, program) {
    const snap = snapshot as { facts?: { relation: string; tuple: JsonValue[]; sources: string[] }[] };
    const prog = program as { query: { relation: string } };
    const proofs: Record<string, JsonValue> = {}, rows: JsonValue[] = [];
    for (const fact of snap.facts ?? []) {
      if (fact.relation !== prog.query.relation) continue;
      const proof = { kind: "fact", fact: ref(fact), sources: fact.sources };
      const id = ref(proof); proofs[id] = proof as never;
      rows.push({ tuple: fact.tuple, proof: id });
    }
    return { kind: "complete", result: { contract: "algal.query-result.v1", snapshot: ref(snapshot), program: ref(program), complete: true, witnessPolicy: "first-canonical-derivation", rows, proofs, work: 1, rounds: 1, baseFacts: (snap.facts ?? []).length, derivedFacts: 0 } as never };
  },
  async verify() { return true; },
  async settle() {},
};

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "algal-workspace-")); dirs.push(dir);
  const cwd = join(dir, "sandbox"); await mkdir(cwd);
  await writeFile(join(cwd, "config.json"), '{"factor":3}'); await writeFile(join(cwd, "notes.txt"), "initial");
  const service = new ApplicationService(join(dir, "app"), harnessApplicationAdmission());
  const store = service.store;
  const schema = await store.putValue({ contract: "algal.application-memory-schema.v1", relations: [{ name: "observed-result", arity: 2 }] });
  const procedure: MemoryProcedure = { id: "factor", description: "Read configured factor", operation: { kind: "read-json-field", path: "config.json", field: "factor" }, dependencies: ["config"] };
  const notesProbe: MemoryProcedure = { id: "notes", description: "Fingerprint notes", operation: { kind: "fingerprint-file", path: "notes.txt" }, dependencies: ["unrelated"] };
  // The proposer inhabitant emits a candidate manifest as data: an agent
  // cell returns the whole manifest record for the named entrypoint.
  const candidateManifestJson = {
    contract: "algal.organism.v1", key: "organism:workspace-run-v2", name: "workspace run v2",
    interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "value" } } },
    cells: [
      { id: "src", kind: "input", outputs: { value: "json" } },
      { id: "fix", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program: ["if", ["eq", ["get", "value"], "b-raw"], "b", ["get", "value"]] }, output: { kind: "text" } },
      { id: "out", kind: "fn", fn: "echo.v1" },
    ],
    edges: [
      { from: { cell: "src", port: "value" }, to: { cell: "fix", port: "value" } },
      { from: { cell: "fix", port: "out" }, to: { cell: "out", port: "value" } },
    ],
  };
  const proposer = await store.putManifest(parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:workspace-proposer", name: "workspace proposer",
    interface: { inputs: { req: { cell: "req", port: "value" } }, outputs: { proposed: { cell: "propose", port: "out" } } },
    cells: [
      { id: "req", kind: "input", outputs: { value: "json" } },
      { id: "propose", kind: "agent", inputs: { req: "json" }, prompt: "Emit a candidate manifest for the entrypoint that preserves its interface.", view: { inputs: ["req"] }, output: { kind: "json", schema: { type: "object" } } },
    ],
    edges: [{ from: { cell: "req", port: "value" }, to: { cell: "propose", port: "req" } }],
  }));
  // The investigation strategy is a model-backed ALGAL program: an agent
  // cell reads the request's admitted procedures and decides which to run.
  // Its manifest budget is distinct — at most one model call per decision.
  const investigator = await store.putManifest(parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:workspace-investigator", name: "workspace investigator",
    budgets: { maxAgentCalls: 1 },
    interface: { inputs: { req: { cell: "req", port: "value" } }, outputs: { probes: { cell: "decide", port: "out" } } },
    cells: [
      { id: "req", kind: "input", outputs: { value: "json" } },
      { id: "decide", kind: "agent", inputs: { req: "json" }, prompt: "Choose which admitted procedures to probe for this entrypoint.", view: { inputs: ["req"] }, output: { kind: "json", schema: { type: "object", required: ["procedures"], properties: { procedures: { type: "array", items: { type: "string", maxLength: 64 }, maxItems: 8 } }, additionalProperties: false } } },
    ],
    edges: [{ from: { cell: "req", port: "value" }, to: { cell: "decide", port: "req" } }],
  }));
  const investigatorExecutor = scriptedExecutor({ decide: { procedures: ["factor"] }, propose: candidateManifestJson });
  const domain = await createHarnessDomain(store, {
    application: "workspace", environmentId: "fixture", taskId: "task-1", sequenceId: "sequence", schema,
    dependencies: { config: "config.json", unrelated: "notes.txt" }, procedures: [procedure, notesProbe],
    cwd, stateDir: join(dir, "host"),
  });
  const admission = createHarnessAdmission(domain, store);
  const memory = new ApplicationMemoryService({ store, engine, admission });
  const manifest = await store.putManifest(parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:workspace-run", name: "workspace run",
    interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "value" } } },
    cells: [{ id: "src", kind: "input", outputs: { value: "json" } }, { id: "out", kind: "fn", fn: "echo.v1" }],
    edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
  }));
  const program = await store.putValue({ contract: "algal.query.v1", rules: [], query: { relation: "observed-result", terms: [{ var: "p" }, { var: "v" }, { var: "polarity" }] }, limits: { maxWork: 50_000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144 } });
  const query = await store.putValue({ contract: "algal.application-memory-query.v1", id: "observed", schema, program, procedures: [domain.procedureRefs.factor!, domain.procedureRefs.notes!].sort(), polarityColumn: 2, conflict: "single-value" });
  const queries = await store.putValue({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await store.putValue({ contract: "algal.application-view-spec.v1", title: "Workspace", widgets: ["investigations", "memory", "procedures"] });
  const runtimeProfile = await store.putValue({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await store.putValue({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  // The revision carries every inhabitant as an entrypoint — the worker
  // ("run"), the probe strategist ("investigator"), and the revision
  // generator ("proposer") — so activation upgrades them together. The
  // inhabitants have distinct declared capabilities: only the strategist and
  // proposer may exercise model inference; the worker runs with none.
  const revision = await putApplicationRecord(store, {
    contract: "algal.application-revision.v1", application: "workspace", parent: null,
    schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: ["model-inference"],
    entrypoints: [
      { name: "investigator", manifest: investigator, applicability: query, maxGenerations: 1, capabilities: ["model-inference"], queries: [query] },
      { name: "proposer", manifest: proposer, applicability: query, maxGenerations: 1, capabilities: ["model-inference"], queries: [query] },
      { name: "run", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] },
    ],
  });
  const genesisMemory = await memory.snapshot({ application: "workspace", schema, previous: null, scope: domain.scope, observations: [], hypotheses: [], withdrawn: [] });
  const genesis = await service.create({ application: "workspace", operation: ref("genesis"), kind: "create", expectedHead: null, revision, memory: genesisMemory, intents: [], evidence: [], causedBy: null });
  const reopen = () => {
    const service = new ApplicationService(join(dir, "app"), harnessApplicationAdmission());
    const admission = createHarnessAdmission(domain, service.store);
    return { service, memory: new ApplicationMemoryService({ store: service.store, engine, admission }), admission };
  };
  return { dir, cwd, service, memory, store, domain, query, genesis, reopen, manifest, admission, schema, queries, views, runtimeProfile, evaluationPolicy, executors: [investigatorExecutor], candidateManifestJson, investigator, proposer };
}

describe("development-workspace organism on the real harness boundary", () => {
  test("the domain reconciles a completed episode after losing its dispatch acknowledgment", async () => {
    const f = await fixture();
    const dispatcher = createHarnessDispatcher(f.domain, f.store, harnessTerminal(f.cwd), f.admission.currentFrontier, { "model-inference": f.executors });
    await scheduleInvestigations(f.service, f.memory, { application: "workspace", operation: ref("reconcile-probe"), expectedHead: f.genesis.digest, expectedMemory: f.genesis.state.memory, route: "probes", entrypoints: ["run"] });
    await f.service.dispatchPending("workspace", dispatcher);
    await drainProbes(f.domain, f.service, f.memory);
    const head = (await f.service.inspect("workspace"))!, derived = await f.memory.query(head.digest, f.query);
    const input = await f.store.putValue({ src: { value: "retained" } });
    await requestExecution(f.service, { application: "workspace", operation: ref("reconcile-episode"), expectedHead: head.digest, expectedMemory: head.state.memory, entrypoint: "run", input, derivation: derived.ref });
    let dispatches = 0;
    const losing = { ...dispatcher, async dispatch(context: Parameters<typeof dispatcher.dispatch>[0]) { dispatches++; await dispatcher.dispatch(context); throw new Error("lost acknowledgment"); } };
    const [uncertain] = await f.service.dispatchPending("workspace", losing);
    if (!uncertain || uncertain.status !== "uncertain" || uncertain.plan.kind !== "episode") throw new Error("Expected uncertain episode dispatch");
    const processes = new ProcessSupervisor(f.service.dir), original = await processes.inspect(uncertain.plan.binding.process);
    expect(original.process.status).toBe("complete");
    const recovered = await f.service.reconcileDispatch("workspace", uncertain.intent, dispatcher);
    expect(recovered.status).toBe("settled");
    expect((await processes.inspect(uncertain.plan.binding.process)).digest).toBe(original.digest);
    expect(dispatches).toBe(1);
    expect(await f.service.dispatchPending("workspace", dispatcher)).toEqual([]);
  });

  test("a mutation after a probe cannot relabel its evidence as the new frontier", async () => {
    const f = await fixture();
    const terminal = harnessTerminal(f.cwd);
    const dispatcher = createHarnessDispatcher(f.domain, f.store, async (request, signal) => {
      const result = await terminal(request, signal);
      await writeFile(join(f.cwd, "config.json"), '{"factor":99}');
      return result;
    }, f.admission.currentFrontier, { "model-inference": f.executors });
    await scheduleInvestigations(f.service, f.memory, {
      application: "workspace", operation: ref("race-probe"), expectedHead: f.genesis.digest,
      expectedMemory: f.genesis.state.memory, route: "probes", entrypoints: ["run"],
    });
    expect((await f.service.dispatchPending("workspace", dispatcher))[0]!.status).toBe("uncertain");
    expect((await drainProbes(f.domain, f.service, f.memory)).committed).toEqual([]);
  });

  test("frontier metadata must agree with the referenced chain tip", async () => {
    const f = await fixture();
    await f.admission.currentFrontier("workspace");
    await writeFile(join(f.domain.stateDir, "frontier.json"), JSON.stringify({ ref: f.domain.frontier, sequence: 11 }));
    await expect(f.admission.currentFrontier("workspace")).rejects.toThrow("frontier");
  });

  test("frontier and channel corruption or symlinks fail closed", async () => {
    const f = await fixture();
    const path = join(f.domain.stateDir, "frontier.json");
    await writeFile(path, "{broken");
    await expect(f.admission.currentFrontier("workspace")).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe("{broken");
    await rm(path);
    const target = join(f.dir, "external.json"); await writeFile(target, "{}"); await symlink(target, path);
    await expect(f.admission.currentFrontier("workspace")).rejects.toThrow();
    expect(await readFile(target, "utf8")).toBe("{}");
    const channelDir = join(f.domain.stateDir, "probes"); await mkdir(channelDir);
    await writeFile(join(channelDir, "a".repeat(64) + ".json"), JSON.stringify({ contract: "algal.probe-channel.v1", request: ref("different"), outcomes: [] }));
    await expect(drainProbes(f.domain, f.service, f.memory)).rejects.toThrow("channel");
  });

  test("reconstructing a harness domain retains its original genesis", async () => {
    const f = await fixture();
    await writeFile(join(f.cwd, "config.json"), '{"factor":99}');
    const domain = await createHarnessDomain(f.store, { ...f.domain, schema: f.schema });
    expect(domain.baseline).toBe(f.domain.baseline);
    expect(domain.scope).toBe(f.domain.scope);
    const frontier = await createHarnessAdmission(domain, f.store).currentFrontier("workspace");
    expect(frontier).not.toBe(f.domain.frontier);
  });

  test("a candidate cannot borrow an unrelated generator receipt", async () => {
    const f = await fixture();
    const request = await f.store.putValue({ contract: "algal.proposal-request.v1", application: "workspace", entrypoint: "run", state: f.genesis.digest, nonce: "forged" });
    const manifest = await f.store.putManifest(parseOrganismManifest(f.candidateManifestJson));
    const proposal = await f.store.putValue({ contract: "algal.revision-proposal.v1", request, entrypoint: "run", manifest, receipt: await f.store.putValue({ unrelated: "evidence" }) });
    const dir = join(f.domain.stateDir, "proposals"); await mkdir(dir);
    await writeFile(join(dir, request.slice(7) + ".json"), JSON.stringify({ contract: "algal.proposal-channel.v1", request, proposals: [proposal] }));
    expect(await drainProposals(f.domain, f.service)).toEqual({ proposals: [], rejected: [proposal] });
  });

  test("investigate → real probe → observe → execute → stale → restart → re-investigate", async () => {
    const f = await fixture();
    const { service, memory, domain } = f;
    const dispatcher = createHarnessDispatcher(domain, service.store, harnessTerminal(f.cwd), f.admission.currentFrontier, { "model-inference": f.executors });

    // 1. Applicability is unresolved; scheduling publishes a durable intent.
    const scheduled = await scheduleInvestigations(service, memory, {
      application: "workspace", operation: ref("op-schedule-1"), expectedHead: f.genesis.digest,
      expectedMemory: f.genesis.state.memory, route: "probes", entrypoints: ["run"],
    });
    if (!scheduled.snapshot) throw new Error("expected an investigate commit");
    expect(scheduled.derivations[0]!.status).toBe("unknown");

    // 2. Dispatch runs the real Perl probe inside the sandbox and deposits
    //    bounded raw evidence plus a durable channel outcome.
    const [d1] = await service.dispatchPending("workspace", dispatcher);
    if (!d1 || d1.status !== "settled") throw new Error("probe request was not settled");
    const drained = await drainProbes(domain, service, memory);
    expect(drained.rejected).toEqual([]);
    expect(drained.committed.length).toBe(1);
    const head1 = (await service.inspect("workspace"))!;
    expect(head1.state.sequence).toBe(2);
    // The deposited evidence is a real bounded probe record of the admitted
    // command, and the inhabitant program decided the probe set: the request
    // admitted two procedures, the investigator chose only "factor".
    const channel = JSON.parse(await readFile(join(domain.stateDir, "probes", scheduled.requests[0]!.slice(7) + ".json"), "utf8")) as { outcomes: Digest[] };
    expect(channel.outcomes.length).toBe(1);
    const outcome = await getApplicationRecord(service.store, channel.outcomes[0]!, r => r as { raw: Digest; procedure: Digest; proposal: Digest });
    const proposal = await getApplicationRecord(service.store, outcome.proposal, r => r as { request: Digest; probes: Digest[]; receipt: Digest | null });
    expect(proposal.request).toBe(scheduled.requests[0]!);
    expect(proposal.probes).toEqual([domain.procedureRefs.factor!]);
    expect(proposal.receipt).not.toBeNull();
    // The proposal's receipt is the investigator organism's run record: its
    // decide cell consumed one agent call — the strategy was model-backed.
    const decisionReceipt = await getApplicationRecord(service.store, proposal.receipt!, r => r as { outcome: string; cells: Record<string, { status: string }>; work: { agentCalls: number } });
    expect(decisionReceipt.outcome).toBe("complete");
    expect(decisionReceipt.cells.decide?.status).toBe("committed");
    expect(decisionReceipt.work.agentCalls).toBe(1);
    const raw = await getApplicationRecord(service.store, outcome.raw, r => r as { contract: string; command: string; result: { exitCode: number } });
    expect(raw.contract).toBe("algal.harness-probe-raw.v1");
    expect(raw.command).toContain("perl -e");
    expect(raw.result.exitCode).toBe(0);
    const observedMemory = await getApplicationRecord(service.store, head1.state.memory, parseMemorySnapshot);
    const observedScope = await getApplicationRecord(service.store, observedMemory.scope, parseMemoryScope);
    expect(observedScope.completeFor).toEqual(Object.values(domain.procedureRefs).sort());

    // 3. Applicability is supported now; the episode runs through the real VM.
    const q1 = await memory.query(head1.digest, f.query);
    expect(q1.derivation.status).toBe("supported");
    const input = await service.store.putValue({ src: { value: "ship it" } });
    const s3 = await requestExecution(service, {
      application: "workspace", operation: ref("op-exec-1"), expectedHead: head1.digest,
      expectedMemory: head1.state.memory, entrypoint: "run", input, derivation: q1.ref,
    });
    const [d2] = await service.dispatchPending("workspace", dispatcher);
    if (!d2 || d2.status !== "settled" || d2.plan.kind !== "episode") throw new Error("expected a settled episode");
    // Resolve the actual settled outcome and replay its receipt. Verification
    // must not redispatch the episode to reconstruct an evidence address.
    const result = await getApplicationRecord(service.store, d2.result!, r => r as { kind: string; binding: Digest; outcome: Digest });
    const binding = await getApplicationRecord(service.store, result.binding, r => r as { manifest: Digest; arguments: Digest; process: string });
    const settled = await getApplicationRecord(service.store, result.outcome, r => r as { contract: string; binding: Digest; receipt: Digest });
    expect(settled.contract).toBe("algal.episode-outcome.v2");
    expect(settled.binding).toBe(result.binding);
    const actual = parseRunReceipt(await service.store.getReceipt(settled.receipt));
    expect(actual.cells.out?.outputs?.value).toBe("ship it");
    expect((await verifyReceipt(actual, manifestToJson((await service.store.getManifest(binding.manifest))!), service.store)).ok).toBe(true);

    // 4. A dependency mutation flips the same supported applicability stale.
    await writeFile(join(f.cwd, "config.json"), '{"factor":7}');
    const q2 = await memory.query((await service.inspect("workspace"))!.digest, f.query);
    expect(q2.derivation.status).toBe("stale");

    // 5. Restart keeps the head, the history, and the frontier chain; settled
    //    work is not repeated.
    const r = f.reopen();
    expect((await r.service.inspect("workspace"))!.digest).toBe(s3.digest);
    expect((await r.service.history("workspace")).length).toBe(4);
    expect(await r.service.dispatchPending("workspace", dispatcher)).toEqual([]);

    // 6. Re-investigation under the new frontier re-converges to supported.
    const again = await scheduleInvestigations(r.service, r.memory, {
      application: "workspace", operation: ref("op-schedule-2"), expectedHead: s3.digest,
      expectedMemory: s3.state.memory, route: "probes", entrypoints: ["run"],
    });
    if (!again.snapshot) throw new Error("expected a re-investigation commit");
    const dispatcher2 = createHarnessDispatcher(domain, r.service.store, harnessTerminal(f.cwd), r.admission.currentFrontier, { "model-inference": f.executors });
    const [d3] = await r.service.dispatchPending("workspace", dispatcher2);
    if (!d3 || d3.status !== "settled") throw new Error("re-investigation was not dispatched");
    const drained2 = await drainProbes(domain, r.service, r.memory);
    expect(drained2.committed.length).toBe(1);
    const head2 = (await r.service.inspect("workspace"))!;
    const q3 = await r.memory.query(head2.digest, f.query);
    expect(q3.derivation.status).toBe("supported");

    // 7. A second drain is idempotent: no duplicate observations, no new state.
    const drained3 = await drainProbes(domain, r.service, r.memory);
    expect(drained3.committed).toEqual([]);
    expect((await r.service.inspect("workspace"))!.digest).toBe(head2.digest);

    // 8. Evaluated adaptation on the real organism: a proposer inhabitant
    //    emits the candidate manifest as data through the real VM; the drain
    //    validates it against the incumbent interface; the foundry evaluates
    //    both manifests over bounded cases; the trusted gate admits the
    //    activation; an expected-head commit bumps the epoch.
    const proposalRequest = await f.store.putValue({ contract: "algal.proposal-request.v1", application: "workspace", entrypoint: "run", state: head2.digest, nonce: "prop-1" });
    const sProp = await r.service.commit({
      application: "workspace", operation: ref("op-propose-1"), kind: "investigate",
      expectedHead: head2.digest, revision: head2.state.revision, memory: head2.state.memory,
      intents: [{ kind: "deliver", route: "proposals", message: proposalRequest }], evidence: [], causedBy: null,
    });
    const [dProp] = await r.service.dispatchPending("workspace", dispatcher2);
    if (!dProp || dProp.status !== "settled") throw new Error("proposal request was not delivered");
    const drainedP = await drainProposals(domain, r.service);
    expect(drainedP.rejected).toEqual([]);
    if (drainedP.proposals.length !== 1) throw new Error("expected one admitted proposal");
    const candidateManifest = drainedP.proposals[0]!.manifest;
    expect(candidateManifest).toBe(await f.store.putManifest(parseOrganismManifest(f.candidateManifestJson)));
    const candidate = await putApplicationRecord(f.store, {
      contract: "algal.application-revision.v1", application: "workspace", parent: head2.state.revision,
      schema: f.schema, queries: f.queries, views: f.views, runtimeProfile: f.runtimeProfile, evaluationPolicy: f.evaluationPolicy, capabilityRequirements: ["model-inference"],
      entrypoints: [
        { name: "investigator", manifest: f.investigator, applicability: f.query, maxGenerations: 1, capabilities: ["model-inference"], queries: [f.query] },
        { name: "proposer", manifest: f.proposer, applicability: f.query, maxGenerations: 1, capabilities: ["model-inference"], queries: [f.query] },
        { name: "run", manifest: candidateManifest, applicability: f.query, maxGenerations: 1, capabilities: [], queries: [f.query] },
      ],
    });
    const cases = await f.store.putValue({ contract: "algal.application-evaluation-cases.v1", cases: [
      { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
      { id: "validation-b", split: "validation", args: { q: "b-raw" }, expect: { answer: "b" } },
      { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } },
    ] });
    const scorer = await f.store.putValue({ contract: "algal.application-evaluation-scorer.v1", scorer: null });
    const runtime = { fns: builtinRegistry(), executors: [] };
    const evaluated = await evaluateApplicationRevision(f.store, {
      contract: "algal.application-evaluation-request.v1", parentState: sProp.digest,
      candidateRevision: candidate, entrypoint: "run", cases, scorer, policy: f.evaluationPolicy,
    }, runtime);
    expect(evaluated.evaluation.verdict.status).toBe("accepted");
    const admitted = await admitApplicationActivation(f.store, { evaluation: evaluated.evaluationRef, expectedState: sProp.digest, revision: candidate }, runtime);
    expect(admitted.revision).toBe(candidate);
    const s4 = await r.service.commit({
      application: "workspace", operation: ref("op-activate-1"), kind: "activate",
      expectedHead: sProp.digest, revision: admitted.revision, memory: sProp.state.memory,
      intents: [], evidence: [evaluated.evaluationRef], causedBy: null,
    });
    expect(s4.state.epoch).toBe(1);
    expect(s4.state.revision).toBe(candidate);

    // 9. Post-upgrade execution runs the new manifest through the real VM:
    //    the same supported memory, the upgraded entrypoint, the corrected
    //    answer deposited as episode evidence.
    const q4 = await r.memory.query(s4.digest, f.query);
    expect(q4.derivation.status).toBe("supported");
    const input2 = await service.store.putValue({ src: { value: "b-raw" } });
    await requestExecution(r.service, {
      application: "workspace", operation: ref("op-exec-2"), expectedHead: s4.digest,
      expectedMemory: s4.state.memory, entrypoint: "run", input: input2, derivation: q4.ref,
    });
    const [d4] = await r.service.dispatchPending("workspace", dispatcher2);
    if (!d4 || d4.status !== "settled" || d4.plan.kind !== "episode") throw new Error("post-upgrade episode was not settled");
    const result2 = await getApplicationRecord(service.store, d4.result!, r2 => r2 as { binding: Digest; outcome: Digest });
    const binding2 = await getApplicationRecord(service.store, result2.binding, r2 => r2 as { manifest: Digest; process: string });
    expect(binding2.manifest).toBe(candidateManifest);
    const settled2 = await getApplicationRecord(service.store, result2.outcome, r2 => r2 as { contract: string; binding: Digest; receipt: Digest });
    expect(settled2.contract).toBe("algal.episode-outcome.v2");
    expect(settled2.binding).toBe(result2.binding);
    const actual2 = parseRunReceipt(await service.store.getReceipt(settled2.receipt));
    expect(actual2.cells.out?.outputs?.value).toBe("b");
    expect((await verifyReceipt(actual2, manifestToJson((await service.store.getManifest(candidateManifest))!), service.store)).ok).toBe(true);

    // 10. Schema evolution: a bounded migration program maps the schema-1
    //     claims into a renamed relation; the migrate transition activates a
    //     schema-2 revision carrying the migrated memory — the old claims ride
    //     the migration record as evidence, not a silent copy.
    const schema2 = await service.store.putValue({ contract: "algal.application-memory-schema.v1", relations: [{ name: "probe-result", arity: 2 }] });
    const migrationManifest = await service.store.putManifest(parseOrganismManifest({
      contract: "algal.organism.v1", key: "organism:workspace-migrate", name: "workspace migrate",
      interface: { inputs: { claims: { cell: "claims", port: "value" }, frontier: { cell: "frontier", port: "value" } }, outputs: { migrated: { cell: "map", port: "out" } } },
      cells: [
        { id: "claims", kind: "input", outputs: { value: "json" } },
        { id: "frontier", kind: "input", outputs: { value: "json" } },
        // Carry forward only claims still on the current frontier — the
        // mutation-staled factor=3 observation does not migrate.
        { id: "map", kind: "expr", inputs: { claims: "json", frontier: "json" }, expr: { contract: "algal.expr.v1", program: { claims: ["map", ["filter", ["get", "claims"], "c", ["eq", ["get", "c", "frontier"], ["get", "frontier"]]], "c", { relation: "probe-result", tuple: ["get", "c", "claim", "tuple"], polarity: ["get", "c", "claim", "polarity"] }] } }, output: { kind: "json", schema: { type: "object", required: ["claims"], properties: { claims: { type: "array", maxItems: 64 } }, additionalProperties: false } } },
      ],
      edges: [
        { from: { cell: "claims", port: "value" }, to: { cell: "map", port: "claims" } },
        { from: { cell: "frontier", port: "value" }, to: { cell: "map", port: "frontier" } },
      ],
    }));
    const migrationDecoder = await service.store.putValue({ contract: "algal.migration-decoder.v1" });
    const migrationProcedure = await service.store.putValue({ contract: "algal.application-memory-procedure.v1", id: "migrate", schema: schema2, manifest: migrationManifest, decoder: migrationDecoder, dependencies: [], prerequisite: null });
    const program2 = await service.store.putValue({ contract: "algal.query.v1", rules: [], query: { relation: "probe-result", terms: [{ var: "p" }, { var: "v" }, { var: "polarity" }] }, limits: { maxWork: 50_000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144 } });
    const query2 = await service.store.putValue({ contract: "algal.application-memory-query.v1", id: "observed", schema: schema2, program: program2, procedures: [migrationProcedure], polarityColumn: 2, conflict: "single-value" });
    const queries2 = await service.store.putValue({ contract: "algal.application-memory-queries.v1", queries: [query2] });
    const revision2 = await putApplicationRecord(service.store, {
      contract: "algal.application-revision.v1", application: "workspace", parent: s4.state.revision,
      schema: schema2, queries: queries2, views: f.views, runtimeProfile: f.runtimeProfile, evaluationPolicy: f.evaluationPolicy, capabilityRequirements: ["model-inference"],
      entrypoints: [
        { name: "investigator", manifest: f.investigator, applicability: query2, maxGenerations: 1, capabilities: ["model-inference"], queries: [query2] },
        { name: "proposer", manifest: f.proposer, applicability: query2, maxGenerations: 1, capabilities: ["model-inference"], queries: [query2] },
        { name: "run", manifest: candidateManifest, applicability: query2, maxGenerations: 1, capabilities: [], queries: [query2] },
      ],
    });
    // A migrate commit without migration evidence is refused.
    const head4 = (await r.service.inspect("workspace"))!;
    const frontierNow = await r.admission.currentFrontier("workspace");
    const currentMemory = await getApplicationRecord(service.store, head4.state.memory, parseMemorySnapshot);
    const currentScope = await getApplicationRecord(service.store, currentMemory.scope, parseMemoryScope);
    const scope2 = await putApplicationRecord(service.store, { ...currentScope, frontier: frontierNow, completeFor: [...currentScope.completeFor, migrationProcedure].sort() });
    const migrated = await migrateApplicationMemory(r.memory, {
      application: "workspace", from: head4.state.memory, schema: schema2, scope: scope2,
      program: migrationManifest, procedure: migrationProcedure, decoder: migrationDecoder,
      previousRevision: head4.state.revision, candidateRevision: revision2,
    }, { fns: builtinRegistry(), executors: [] });
    await expect(r.service.commit({
      application: "workspace", operation: ref("op-migrate-noev"), kind: "migrate",
      expectedHead: head4.digest, revision: revision2, memory: migrated.snapshot,
      intents: [], evidence: [], causedBy: null,
    })).rejects.toThrow("Migration transition lacks migration evidence");
    const s5 = await r.service.commit({
      application: "workspace", operation: ref("op-migrate-1"), kind: "migrate",
      expectedHead: head4.digest, revision: revision2, memory: migrated.snapshot,
      intents: [], evidence: [migrated.migration], causedBy: null,
    });
    expect(s5.state.epoch).toBe(2);
    expect(s5.state.revision).toBe(revision2);
    // The migrated claim answers the schema-2 query — the renamed relation,
    // the probed tuple, and the current frontier all check out.
    const q5 = await r.memory.query(s5.digest, query2);
    expect(q5.derivation.status).toBe("supported");
    const migratedResult = await getApplicationRecord(service.store, q5.derivation.result!, r2 => r2 as { rows: { tuple: JsonValue[] }[] });
    expect(migratedResult.rows[0]!.tuple).toEqual(["factor", 7, "supported"]);
    // A stale migrate commit against the pre-migration head is fenced out.
    await expect(r.service.commit({
      application: "workspace", operation: ref("op-migrate-stale"), kind: "migrate",
      expectedHead: s4.digest, revision: revision2, memory: migrated.snapshot,
      intents: [], evidence: [migrated.migration], causedBy: null,
    })).rejects.toThrow();
  });

  test("distinct inhabitant capability and memory-view declarations are enforced", async () => {
    const f = await fixture();
    const { service } = f;
    const base = await getApplicationRecord(service.store, f.genesis.state.revision, parseApplicationRevision);
    const widen = (name: string, patch: Partial<(typeof base.entrypoints)[number]>) =>
      base.entrypoints.map(e => e.name === name ? { ...e, ...patch } : e);
    const activate = (revision: Digest, operation: string) => service.commit({
      application: "workspace", operation: ref(operation), kind: "activate",
      expectedHead: f.genesis.digest, revision, memory: f.genesis.state.memory,
      intents: [], evidence: [], causedBy: null,
    });
    // A capability declaration outside the revision's requirements is refused.
    const badCaps = await putApplicationRecord(service.store, { ...base, parent: f.genesis.state.revision, entrypoints: widen("run", { capabilities: ["terminal-access"] }) });
    await expect(activate(badCaps, "op-badcap")).rejects.toThrow("Entrypoint capability exceeds");
    // A memory view that excludes the entrypoint's own applicability query is refused.
    const narrowView = await putApplicationRecord(service.store, { ...base, parent: f.genesis.state.revision, entrypoints: widen("run", { queries: [] }) });
    await expect(activate(narrowView, "op-narrowview")).rejects.toThrow("outside its declared memory view");
    // A memory view reaching outside the revision's query bundle is refused by
    // memory-layer validation.
    const foreign = ref({ contract: "foreign-query" }) as Digest;
    const wideView = await putApplicationRecord(service.store, { ...base, parent: f.genesis.state.revision, entrypoints: widen("run", { queries: [...base.entrypoints.find(e => e.name === "run")!.queries, foreign].sort() }) });
    const wideRevision = await getApplicationRecord(service.store, wideView, parseApplicationRevision);
    await expect(f.memory.validateForRevision(f.genesis.state.memory, wideRevision)).rejects.toThrow("exceeds the revision's queries");
    // A conforming revision — same declarations as the incumbent — activates fine.
    const same = await putApplicationRecord(service.store, { ...base, parent: f.genesis.state.revision });
    const upgraded = await activate(same, "op-same-decls");
    expect(upgraded.state.epoch).toBe(1);
  });

  // A live-provider leg: with VERCEL_OIDC_TOKEN or AI_GATEWAY_API_KEY in the
  // environment the investigator inhabitant makes a real model call through
  // the Vercel AI Gateway; its receipt is durable evidence that replays
  // offline. Without the credential the test skips like the native suite.
  const gatewayKey = process.env.VERCEL_OIDC_TOKEN ?? process.env.AI_GATEWAY_API_KEY;
  const liveTest = process.env.ALGAL_GATEWAY_LIVE === "1" && gatewayKey ? test : test.skip;
  liveTest("model-backed investigator decides through the real AI gateway", async () => {
    const f = await fixture();
    const { service, memory, domain } = f;
    const gateway = vercelGatewayExecutor({ model: "anthropic/claude-haiku-4.5" });
    const dispatcher = createHarnessDispatcher(domain, service.store, harnessTerminal(f.cwd), f.admission.currentFrontier, { "model-inference": [gateway] });

    const scheduled = await scheduleInvestigations(service, memory, {
      application: "workspace", operation: ref("op-live-schedule"), expectedHead: f.genesis.digest,
      expectedMemory: f.genesis.state.memory, route: "probes", entrypoints: ["run"],
    });
    if (!scheduled.snapshot) throw new Error("expected an investigate commit");
    const [d1] = await service.dispatchPending("workspace", dispatcher);
    if (!d1 || d1.status !== "settled") throw new Error("probe request was not settled");
    const drained = await drainProbes(domain, service, memory);
    expect(drained.rejected).toEqual([]);

    // The decision receipt is a real provider call: one agent effect served
    // by the gateway executor with metered usage — not a scripted response.
    const channel = JSON.parse(await readFile(join(domain.stateDir, "probes", scheduled.requests[0]!.slice(7) + ".json"), "utf8")) as { outcomes: Digest[] };
    const outcome = await getApplicationRecord(service.store, channel.outcomes[0]!, r => r as { proposal: Digest });
    const proposal = await getApplicationRecord(service.store, outcome.proposal, r => r as { receipt: Digest | null; probes: Digest[] });
    const receipt = await getApplicationRecord(service.store, proposal.receipt!, r => r as { outcome: string; effects: { executor: string; usage?: { model?: string; tokensIn?: number } }[] });
    expect(receipt.outcome).toBe("complete");
    const effect = receipt.effects.find(e => e.executor.startsWith("vercel:"))!;
    expect(effect.executor).toBe("vercel:anthropic/claude-haiku-4.5");
    expect(effect.usage?.tokensIn).toBeGreaterThan(0);
    // The model chose a subset of the admitted procedures; the drain probed
    // exactly those and committed their real observations.
    expect(proposal.probes.length).toBeGreaterThan(0);
    expect(drained.committed.length).toBe(proposal.probes.length);

    // The recorded call replays bit-for-bit without touching the provider —
    // the receipt itself is the restart-safe evidence.
    const investigatorManifest = await service.store.getManifest(f.investigator);
    const report = await verifyReceipt(await getApplicationRecord(service.store, proposal.receipt!, r => r as JsonValue), manifestToJson(investigatorManifest!), service.store);
    expect(report.ok).toBe(true);
  });

  // The subscription route: with ALGAL_XCB_LIVE=1 plus XCB_EXECUTABLE,
  // XCB_ACCOUNT and XCB_MODEL, the investigator inhabitant runs through a
  // qualified xcb `generate` call — a real subscription turn with zero tools
  // and zero hooks whose receipt is durable evidence replayable offline.
  // Skips by default; createXcbExecutor still hard-fails if the account is
  // not currently qualified for the requested model.
  const xcbLive = process.env.ALGAL_XCB_LIVE === "1"
    && process.env.XCB_EXECUTABLE && process.env.XCB_ACCOUNT && process.env.XCB_MODEL;
  const xcbTest = xcbLive ? test : test.skip;
  xcbTest("model-backed investigator decides through a qualified XCB subscription", async () => {
    const f = await fixture();
    const { service, memory, domain } = f;
    const { executor: xcb, accounting } = await createXcbExecutor({
      executable: process.env.XCB_EXECUTABLE!,
      account: process.env.XCB_ACCOUNT!,
      model: process.env.XCB_MODEL!,
      maxCalls: 4,
    });
    const dispatcher = createHarnessDispatcher(domain, service.store, harnessTerminal(f.cwd), f.admission.currentFrontier, { "model-inference": [xcb] });

    const scheduled = await scheduleInvestigations(service, memory, {
      application: "workspace", operation: ref("op-xcb-schedule"), expectedHead: f.genesis.digest,
      expectedMemory: f.genesis.state.memory, route: "probes", entrypoints: ["run"],
    });
    if (!scheduled.snapshot) throw new Error("expected an investigate commit");
    const [d1] = await service.dispatchPending("workspace", dispatcher);
    if (!d1 || d1.status !== "settled") throw new Error("probe request was not settled");
    const drained = await drainProbes(domain, service, memory);
    expect(drained.rejected).toEqual([]);

    // The decision receipt is a real subscription turn: one agent effect
    // served by the xcb executor, request settled through the qualified
    // zero-tool application route with no paid API spend.
    const channel = JSON.parse(await readFile(join(domain.stateDir, "probes", scheduled.requests[0]!.slice(7) + ".json"), "utf8")) as { outcomes: Digest[] };
    const outcome = await getApplicationRecord(service.store, channel.outcomes[0]!, r => r as { proposal: Digest });
    const proposal = await getApplicationRecord(service.store, outcome.proposal, r => r as { receipt: Digest | null; probes: Digest[] });
    const receipt = await getApplicationRecord(service.store, proposal.receipt!, r => r as { outcome: string; effects: { executor: string }[] });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.effects.find(e => e.executor.startsWith("xcb:"))!.executor).toBe(`xcb:${process.env.XCB_MODEL}`);
    expect(accounting.completedCalls).toBe(1);
    expect(accounting.incrementalPaidApiSpendUsd).toBe(0);
    expect(accounting.requestIds.length).toBe(1);
    expect(proposal.probes.length).toBeGreaterThan(0);
    expect(drained.committed.length).toBe(proposal.probes.length);

    // The recorded subscription turn replays bit-for-bit without the provider.
    const investigatorManifest = await service.store.getManifest(f.investigator);
    const report = await verifyReceipt(await getApplicationRecord(service.store, proposal.receipt!, r => r as JsonValue), manifestToJson(investigatorManifest!), service.store);
    expect(report.ok).toBe(true);
  }, 120_000);
});
