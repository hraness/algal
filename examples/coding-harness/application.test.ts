/** Development-workspace milestone with the real harness boundary: the real
 * Perl probe runs in a real sandbox through a bounded terminal, `decodeProbe`
 * is the trusted decoder, the mutation frontier tracks the actual dependency
 * files, and episode dispatch runs the entrypoint manifest through the VM. */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ApplicationService, admitApplicationActivation, builtinRegistry, evaluateApplicationRevision,
  getApplicationRecord, putApplicationRecord, runOrganism,
} from "../../index";
import {
  ApplicationMemoryService,
  type MemoryQueryEngine,
} from "../../src/application-memory";
import { requestExecution, scheduleInvestigations } from "../../src/application-investigation";
import { scriptedExecutor } from "../../src/effects";
import { applicationJson } from "../../src/application-contract";
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
  const investigator = await store.putManifest(parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:workspace-investigator", name: "workspace investigator",
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
    cwd, stateDir: join(dir, "host"), investigator, proposer,
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
  const revision = await putApplicationRecord(store, { contract: "algal.application-revision.v1", application: "workspace", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: query, maxGenerations: 1 }] });
  const genesisMemory = await memory.snapshot({ application: "workspace", schema, previous: null, scope: domain.scope, observations: [], hypotheses: [], withdrawn: [] });
  const genesis = await service.create({ application: "workspace", operation: ref("genesis"), kind: "create", expectedHead: null, revision, memory: genesisMemory, intents: [], evidence: [], causedBy: null });
  const reopen = () => {
    const service = new ApplicationService(join(dir, "app"), harnessApplicationAdmission());
    const admission = createHarnessAdmission(domain, service.store);
    return { service, memory: new ApplicationMemoryService({ store: service.store, engine, admission }), admission };
  };
  return { dir, cwd, service, memory, store, domain, query, genesis, reopen, manifest, admission, schema, queries, views, runtimeProfile, evaluationPolicy, executors: [investigatorExecutor], candidateManifestJson };
}

describe("development-workspace organism on the real harness boundary", () => {
  test("investigate → real probe → observe → execute → stale → restart → re-investigate", async () => {
    const f = await fixture();
    const { service, memory, domain } = f;
    const dispatcher = createHarnessDispatcher(domain, service.store, harnessTerminal(f.cwd), f.admission.currentFrontier, f.executors);

    // 1. Applicability is unresolved; scheduling publishes a durable intent.
    const scheduled = await scheduleInvestigations(service, memory, {
      application: "workspace", operation: ref("op-schedule-1"), expectedHead: f.genesis.digest,
      expectedMemory: f.genesis.state.memory, route: "probes",
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

    // 3. Applicability is supported now; the episode runs through the real VM.
    const q1 = await memory.query(head1.digest, f.query);
    expect(q1.derivation.status).toBe("supported");
    const input = await service.store.putValue({ src: { value: "ship it" } });
    const s3 = await requestExecution(service, {
      application: "workspace", operation: ref("op-exec-1"), expectedHead: head1.digest,
      expectedMemory: head1.state.memory, entrypoint: "run", input, derivation: q1.ref,
    });
    const [d2] = await service.dispatchPending("workspace", dispatcher);
    if (!d2 || d2.plan.kind !== "episode" || d2.status !== "settled") throw new Error("expected a settled episode");
    // The episode outcome is real CAS evidence: replaying the bound manifest
    // reproduces the deposited record bit-for-bit.
    const result = await getApplicationRecord(service.store, d2.result!, r => r as { kind: string; binding: Digest });
    const binding = await getApplicationRecord(service.store, result.binding, r => r as { manifest: Digest; arguments: Digest; process: string });
    const replay = await runOrganism({ manifest: (await service.store.getManifest(binding.manifest))!, fns: builtinRegistry(), store: service.store, executors: [], args: { src: { value: "ship it" } }, processName: binding.process });
    const outcomeRef = digestCanonical(applicationJson({ contract: "algal.episode-outcome.v1", binding: result.binding, receipt: replay }));
    await getApplicationRecord(service.store, outcomeRef, r => r); // resolves only if the dispatcher deposited it

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
      expectedMemory: s3.state.memory, route: "probes",
    });
    if (!again.snapshot) throw new Error("expected a re-investigation commit");
    const dispatcher2 = createHarnessDispatcher(domain, r.service.store, harnessTerminal(f.cwd), r.admission.currentFrontier, f.executors);
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
      schema: f.schema, queries: f.queries, views: f.views, runtimeProfile: f.runtimeProfile, evaluationPolicy: f.evaluationPolicy, capabilityRequirements: [],
      entrypoints: [{ name: "run", manifest: candidateManifest, applicability: f.query, maxGenerations: 1 }],
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
    if (!d4 || d4.plan.kind !== "episode" || d4.status !== "settled") throw new Error("post-upgrade episode was not settled");
    const result2 = await getApplicationRecord(service.store, d4.result!, r2 => r2 as { binding: Digest });
    const binding2 = await getApplicationRecord(service.store, result2.binding, r2 => r2 as { manifest: Digest; process: string });
    expect(binding2.manifest).toBe(candidateManifest);
    const replay2 = await runOrganism({ manifest: (await service.store.getManifest(candidateManifest))!, fns: builtinRegistry(), store: service.store, executors: [], args: { src: { value: "b-raw" } }, processName: binding2.process });
    const outcome2Ref = digestCanonical(applicationJson({ contract: "algal.episode-outcome.v1", binding: result2.binding, receipt: replay2 }));
    await getApplicationRecord(service.store, outcome2Ref, r2 => r2); // resolves only if the dispatcher deposited it
  });
});
