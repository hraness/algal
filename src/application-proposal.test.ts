import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService } from "./application";
import { evaluateApplicationRevision } from "./application-adaptation";
import { applicationJson, getApplicationRecord, parseApplicationRevision, putApplicationRecord } from "./application-contract";
import { createApplicationPolicyHost } from "./application-host";
import { APPLICATION_MEMORY_NATIVE_LIMITS } from "./application-memory";
import {
  PROPOSAL_LIMITS, parseApplicationProposal, parseProposalRequest, produceApplicationProposal, proposeApplicationRevision,
  verifyApplicationProposal, verifyApplicationProposalBinding, type ApplicationProposal,
} from "./application-proposal";
import { capabilityHandle } from "./capabilities";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { builtinRegistry } from "./registry";
import type { JsonValue } from "./values";

const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
const hash = (value: unknown) => digestCanonical(applicationJson(value));
const runtime = { fns: builtinRegistry() };

// Strategy manifests share one interface so every candidate is a genuine
// contest for the `run` entrypoint over the frozen case set.
const strategyInterface = { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "out" } } };
const strategy = (key: string, program: JsonValue) => manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: `organism:${key}`, name: key, interface: strategyInterface,
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program }, output: { kind: "json", schema: { type: "string" } } },
  ],
  edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
}));
const incumbentStrategy = strategy("incumbent", "ok");
const winnerStrategy = strategy("winner", ["if", ["eq", ["get", "value"], "v2"], "v2-ok", ["if", ["eq", ["get", "value"], "h1"], "h1-ok", "ok"]]);
const loserStrategy = strategy("loser", "nope");
const agentStrategy = { contract: "algal.organism.v1", key: "organism:agent-candidate", name: "agent candidate", interface: strategyInterface,
  cells: [{ id: "src", kind: "input", outputs: { value: "json" } }, { id: "out", kind: "agent", prompt: "Never executed", output: { kind: "json", schema: { type: "string" } } }], edges: [] };
// One generator: the emitted list is a pure function of its `seed` input, so
// a single entrypoint exercises success, failure, and every retained reason.
const generator = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:generator", name: "generator",
  interface: { inputs: { seed: { cell: "src", port: "value" } }, outputs: { candidates: { cell: "gen", port: "out" } } },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "gen", kind: "expr", inputs: { seed: "json" }, expr: { contract: "algal.expr.v1", program:
      ["if", ["eq", ["get", "seed"], "fail"], ["div", 1, 0],
        ["if", ["eq", ["get", "seed"], "impure"], ["list", ["quote", agentStrategy]],
          ["if", ["eq", ["get", "seed"], "duplicate"], ["list", ["quote", winnerStrategy], ["quote", incumbentStrategy]],
            ["if", ["eq", ["get", "seed"], "invalid"], ["list", ["quote", { nope: true }]],
              ["if", ["eq", ["get", "seed"], "empty"], ["list"],
                ["list", ["quote", winnerStrategy], ["quote", loserStrategy]]]]]]] }, output: { kind: "json", schema: { type: "array" } } },
  ],
  edges: [{ from: { cell: "src", port: "value" }, to: { cell: "gen", port: "seed" } }],
}));
const many = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:generator-many", name: "generator many",
  interface: { inputs: {}, outputs: { candidates: { cell: "out", port: "value" } } },
  cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: Array.from({ length: PROPOSAL_LIMITS.candidates + 1 }, (_, i) => strategy(`many-${i}`, `m${i}`)) } } }], edges: [],
}));
const agentGenerator = { contract: "algal.organism.v1", key: "organism:generator-agent", name: "generator agent",
  interface: { inputs: {}, outputs: { candidates: { cell: "out", port: "out" } } },
  cells: [{ id: "out", kind: "agent", prompt: "Never executed", output: { kind: "json", schema: { type: "array" } } }], edges: [] };

async function proposalFixture(options: { selectionEnvironment?: string } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "algal-proposal-")); directories.push(directory);
  const bootstrap = new ApplicationService(directory, { async admitCommit() { throw new Error("bootstrap cannot commit"); } });
  const store = bootstrap.store, put = (value: unknown) => store.putValue(applicationJson(value));
  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "applicable", schema, program, procedures: [], polarityColumn: 1, conflict: "single-value" });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await put({ contract: "algal.application-view-spec.v1", title: "Proposal", widgets: ["procedures"] });
  const runtimeProfile = await put({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await put({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: "workspace", previous: null, sequence: 0, mutation: null, status: "settled" });
  const attestation = await put({ contract: "algal.proposal-attestation.v1" });
  const scope = await put({ contract: "algal.application-memory-scope.v1", application: "workspace", environment: "fixture", task: "proposal", frontier, bindings: [], completeFor: [], attestation });
  const memory = await put({ contract: "algal.application-memory.v1", application: "workspace", schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  const incumbentManifest = await store.putManifest(parseOrganismManifest(incumbentStrategy));
  const generatorManifest = await store.putManifest(parseOrganismManifest(generator));
  const manyManifest = await store.putManifest(parseOrganismManifest(many));
  const agentManifest = await store.putManifest(parseOrganismManifest(agentGenerator));
  const entry = (name: string, manifest: Digest) => ({ name, manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] });
  const revisionBody = { contract: "algal.application-revision.v1", application: "workspace", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [],
    entrypoints: [entry("generate", generatorManifest), entry("generate-agent", agentManifest), entry("generate-many", manyManifest), entry("run", incumbentManifest)] };
  const revision = await put(revisionBody);
  const policy = { contract: "algal.application-host.v1", application: "workspace", frontier, hostProfile: hash("profile"), episodeAccess: "observe", routes: [{ route: "inbox", recipient: capabilityHandle("mailbox-send", "fixture"), hostProfile: hash("profile") }], attestation: "algal.proposal-attestation.v1", decoders: [] };
  const host = createApplicationPolicyHost(policy, { channelsDir: join(directory, "channels"), ...options });
  const service = new ApplicationService(directory, host);
  const genesis = await service.create({ application: "workspace", operation: hash("create"), kind: "create", expectedHead: null, revision, memory, intents: [], evidence: [], causedBy: null });
  const cases = await put({ contract: "algal.application-evaluation-cases.v1", cases: [
    { id: "train-ok", split: "train", args: { q: "t1" }, expect: { answer: "ok" } },
    { id: "val-ok", split: "validation", args: { q: "v1" }, expect: { answer: "ok" } },
    { id: "val-fixed", split: "validation", args: { q: "v2" }, expect: { answer: "v2-ok" } },
    { id: "hold-fixed", split: "holdout", args: { q: "h1" }, expect: { answer: "h1-ok" } },
  ] });
  const scorer = await put({ contract: "algal.application-evaluation-scorer.v1", scorer: null });
  const arguments_ = async (seed: JsonValue) => put({ seed });
  const request = async (seed: JsonValue, overrides: Record<string, unknown> = {}) => ({
    contract: "algal.application-proposal-request.v1", application: "workspace", parentState: genesis.digest, generator: "generate", target: "run",
    arguments: await arguments_(seed), output: "candidates", policy: evaluationPolicy, ...overrides,
  });
  const evaluate = (parentState: Digest, candidateRevision: Digest, environment = "harbor") =>
    evaluateApplicationRevision(store, { contract: "algal.application-evaluation-request.v1", parentState, candidateRevision, entrypoint: "run", cases, scorer, policy: evaluationPolicy, environment }, runtime);
  const winnerManifest = digestCanonical(winnerStrategy), loserManifest = digestCanonical(loserStrategy);
  return { directory, store, put, host, policy, service, genesis, revision, revisionBody, memory, evaluationPolicy, cases, scorer, request, evaluate, incumbentManifest, generatorManifest, winnerManifest, loserManifest, arguments: arguments_ };
}

describe("application proposals", () => {
  test("generates candidate child revisions, verifies, commits, and replays the same operation", async () => {
    const f = await proposalFixture();
    const produced = await produceApplicationProposal(f.store, await f.request("go"), runtime);
    expect(produced.proposal.status).toBe("generated");
    expect(produced.proposal.reasons).toEqual([]);
    expect(produced.proposal.candidates.length).toBe(2);
    expect(produced.proposal.candidates.map(c => c.manifest).sort()).toEqual([f.winnerManifest, f.loserManifest].sort());
    expect(produced.proposal.candidates[0]!.revision < produced.proposal.candidates[1]!.revision).toBe(true);
    expect(produced.proposal.revision).toBe(f.revision);
    expect(produced.proposal.generatorManifest).toBe(f.generatorManifest);
    expect(produced.proposal.work.agentCalls).toBe(0);
    for (const candidate of produced.proposal.candidates) {
      const revision = await getApplicationRecord(f.store, candidate.revision, parseApplicationRevision);
      expect(revision).toEqual({ ...f.revisionBody, parent: f.revision, entrypoints: f.revisionBody.entrypoints.map(e => e.name === "run" ? { ...e, manifest: candidate.manifest } : e) } as unknown as typeof revision);
      expect(await f.store.getManifest(candidate.manifest)).not.toBeUndefined();
    }
    expect(await verifyApplicationProposal(f.store, produced.proposalRef, f.genesis.digest, runtime)).toEqual(produced.proposal);
    // The candidate that fixes the failing cases is accepted by the ordinary evaluator.
    const winner = produced.proposal.candidates.find(c => c.manifest === f.winnerManifest)!;
    expect((await f.evaluate(f.genesis.digest, winner.revision)).evaluation.verdict.status).toBe("accepted");

    const input = { application: "workspace", operation: hash("propose"), expectedHead: f.genesis.digest, generator: "generate", target: "run", arguments: await f.arguments("go"), output: "candidates", policy: f.evaluationPolicy };
    const proposed = await proposeApplicationRevision(f.service, input, runtime);
    expect(proposed.proposal).toBe(produced.proposalRef);
    expect(proposed.snapshot.transition.kind).toBe("propose");
    expect(proposed.snapshot.state.epoch).toBe(f.genesis.state.epoch);
    expect(proposed.snapshot.state.revision).toBe(f.genesis.state.revision);
    expect(proposed.snapshot.state.memory).toBe(f.genesis.state.memory);
    expect(proposed.snapshot.transition.intents).toEqual([]);
    expect(proposed.snapshot.transition.evidence).toEqual([produced.proposalRef]);
    const reopened = new ApplicationService(f.directory, f.host);
    expect((await reopened.inspect("workspace"))!.digest).toBe(proposed.snapshot.digest);
    expect((await proposeApplicationRevision(reopened, input, runtime)).snapshot.digest).toBe(proposed.snapshot.digest);
    await expect(proposeApplicationRevision(reopened, { ...input, operation: hash("stale") }, runtime)).rejects.toThrow("Stale");
  });

  test("rejects an effectful generator before running and binds policy, entrypoints, and interface", async () => {
    const f = await proposalFixture();
    await expect(produceApplicationProposal(f.store, await f.request("go", { generator: "generate-agent" }), runtime)).rejects.toThrow("Case-pure evaluation rejects agent cells");
    const other = await f.put({ contract: "algal.application-evaluation-policy.v1", maxCases: 4, maxWork: 1000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
    await expect(produceApplicationProposal(f.store, await f.request("go", { policy: other }), runtime)).rejects.toThrow("not bound to the incumbent");
    await expect(produceApplicationProposal(f.store, await f.request("go", { generator: "missing" }), runtime)).rejects.toThrow("Unknown application entrypoint missing");
    await expect(produceApplicationProposal(f.store, await f.request("go", { target: "missing" }), runtime)).rejects.toThrow("Unknown application entrypoint missing");
    await expect(produceApplicationProposal(f.store, await f.request("go", { output: "nothing" }), runtime)).rejects.toThrow('no interface output "nothing"');
    await expect(produceApplicationProposal(f.store, await f.request("go", { arguments: await f.put({ seed: "go", extra: 1 }) }), runtime)).rejects.toThrow('no interface input "extra"');
    await expect(produceApplicationProposal(f.store, await f.request("go", { arguments: await f.put(["go"]) }), runtime)).rejects.toThrow("keyed by interface input");
    await expect(produceApplicationProposal(f.store, await f.request("go", { application: "other" }), runtime)).rejects.toThrow("another application");
    expect((await f.service.inspect("workspace"))!.digest).toBe(f.genesis.digest);
  });

  test("retains impure, duplicate, invalid, empty, over-bound and failed emissions as reproducible failed evidence", async () => {
    const f = await proposalFixture();
    const failed = async (seed: JsonValue, reasons: string[], overrides: Record<string, unknown> = {}) => {
      const produced = await produceApplicationProposal(f.store, await f.request(seed, overrides), runtime);
      expect(produced.proposal.status).toBe("failed");
      expect(produced.proposal.reasons).toEqual(reasons);
      expect(produced.proposal.candidates).toEqual([]);
      expect(await f.store.getReceipt(produced.proposal.receipt)).toBeDefined();
      expect(await verifyApplicationProposal(f.store, produced.proposalRef, f.genesis.digest, runtime)).toEqual(produced.proposal);
      return produced;
    };
    await failed("impure", ["impure-candidate"]);
    await failed("duplicate", ["duplicate-candidate"]);
    await failed("invalid", ["invalid-candidate"]);
    await failed("empty", ["no-candidates"]);
    await failed("unused", ["candidate-bound"], { generator: "generate-many", arguments: await f.put({}) });
    const broken = await failed("fail", ["generator-failed"]);
    expect(broken.proposal.work.units).toBeGreaterThan(0);
    // A failed proposal still commits as retained evidence without touching the head's selection.
    const committed = await f.service.commit({ application: "workspace", operation: hash("failed-propose"), kind: "propose", expectedHead: f.genesis.digest, revision: f.revision, memory: f.memory, intents: [], evidence: [broken.proposalRef], causedBy: null });
    expect(committed.state.epoch).toBe(0);
  });

  test("tampered or stale proposals fail verification byte-for-byte", async () => {
    const f = await proposalFixture();
    const produced = await produceApplicationProposal(f.store, await f.request("go"), runtime);
    const forge = (patch: Partial<ApplicationProposal>) => putApplicationRecord(f.store, { ...produced.proposal, ...patch });
    await expect(verifyApplicationProposal(f.store, await forge({ work: { ...produced.proposal.work, units: 1 } }), f.genesis.digest, runtime)).rejects.toThrow("not reproducible");
    await expect(verifyApplicationProposal(f.store, await forge({ candidates: [produced.proposal.candidates[0]!] }), f.genesis.digest, runtime)).rejects.toThrow("not reproducible");
    await expect(verifyApplicationProposal(f.store, await forge({ status: "failed", reasons: ["budget-exhausted"], candidates: [] }), f.genesis.digest, runtime)).rejects.toThrow("not reproducible");
    await expect(verifyApplicationProposal(f.store, await forge({ generator: "run" }), f.genesis.digest, runtime)).rejects.toThrow("not bound to its request");
    await expect(verifyApplicationProposal(f.store, await forge({ receipt: hash("elsewhere") }), f.genesis.digest, runtime)).rejects.toThrow("Missing or changed proposal receipt");
    await expect(verifyApplicationProposal(f.store, produced.proposalRef, hash("another-state"), runtime)).rejects.toThrow("stale");
    // A receipt produced by another argument record cannot stand in for the bound one.
    const other = await produceApplicationProposal(f.store, await f.request("empty"), runtime);
    await expect(verifyApplicationProposal(f.store, await forge({ receipt: other.proposal.receipt }), f.genesis.digest, runtime)).rejects.toThrow("does not bind its generator and arguments");
  });

  test("core lifecycle rejects propose commits that change memory, revision, or intents, or carry unbound candidates", async () => {
    const f = await proposalFixture();
    const produced = await produceApplicationProposal(f.store, await f.request("go"), runtime);
    const bypass = new ApplicationService(f.directory, { async admitCommit() {} });
    const raw = { application: "workspace", operation: hash("raw"), kind: "propose", expectedHead: f.genesis.digest, revision: f.revision, memory: f.memory, intents: [], evidence: [produced.proposalRef], causedBy: null };
    const otherMemory = await f.put({ ...(await getApplicationRecord(f.store, f.memory, applicationJson) as object), hypotheses: [] , previous: f.memory });
    await expect(bypass.commit({ ...raw, memory: otherMemory })).rejects.toThrow("preserve current memory");
    await expect(bypass.commit({ ...raw, intents: [{ kind: "deliver", route: "inbox", message: await f.put("message") }] })).rejects.toThrow("create no intents");
    await expect(bypass.commit({ ...raw, evidence: [] })).rejects.toThrow("exactly one");
    await expect(bypass.commit({ ...raw, revision: produced.proposal.candidates[0]!.revision })).rejects.toThrow("cannot change the revision");
    // A candidate that differs from the incumbent beyond the target manifest is not a proposal candidate.
    const widened = await f.put({ ...f.revisionBody, parent: f.revision, capabilityRequirements: ["net"], entrypoints: f.revisionBody.entrypoints.map(e => e.name === "run" ? { ...e, manifest: f.winnerManifest } : e) });
    const forged = await f.put({ ...produced.proposal, candidates: [{ manifest: f.winnerManifest, revision: widened }] });
    await expect(bypass.commit({ ...raw, evidence: [forged] })).rejects.toThrow("only at the target manifest");
    const stray = await f.put({ ...produced.proposal, parentState: hash("elsewhere") });
    await expect(bypass.commit({ ...raw, evidence: [stray] })).rejects.toThrow("does not bind this transition");
    await expect(verifyApplicationProposalBinding(f.store, { application: "workspace", parentState: f.genesis.digest, revision: f.revision, evidence: [produced.proposalRef, forged].sort() })).rejects.toThrow("exactly one");
    // Structural binding passes for the genuine record; the default host additionally replays the receipt.
    await verifyApplicationProposalBinding(f.store, { application: "workspace", parentState: f.genesis.digest, revision: f.revision, evidence: [produced.proposalRef] });
    const irreproducible = await f.put({ ...produced.proposal, work: { ...produced.proposal.work, steps: produced.proposal.work.steps + 1 } });
    await expect(f.service.commit({ ...raw, evidence: [irreproducible] })).rejects.toThrow("not reproducible");
    expect((await f.service.inspect("workspace"))!.digest).toBe(f.genesis.digest);
  });

  test("closes the parsers with bounds on candidates, reasons, and status coherence", () => {
    const ref = hash("proposal-fixture");
    const request = { contract: "algal.application-proposal-request.v1", application: "workspace", parentState: ref, generator: "generate", target: "run", arguments: ref, output: "candidates", policy: ref };
    expect(parseProposalRequest(request)).toEqual(request as never);
    expect(parseProposalRequest({ ...request, environment: "harbor" }).environment).toBe("harbor");
    expect(() => parseProposalRequest({ ...request, extra: 1 })).toThrow();
    expect(() => parseProposalRequest({ ...request, output: "Bad Output" })).toThrow();
    expect(() => parseProposalRequest({ ...request, environment: "" })).toThrow();
    const candidate = (n: number) => ({ manifest: hash(`m${n}`), revision: hash(`r${n}`) });
    const sorted = (rows: { manifest: Digest; revision: Digest }[]) => [...rows].sort((a, b) => (a.revision < b.revision ? -1 : 1));
    const base = { contract: "algal.application-proposal.v1", request: ref, application: "workspace", parentState: ref, revision: ref, generator: "generate", target: "run", generatorManifest: ref, receipt: ref, status: "generated", reasons: [], candidates: sorted([candidate(1), candidate(2)]), work: { steps: 1, agentCalls: 0, units: 100 } };
    expect(parseApplicationProposal(base).candidates.length).toBe(2);
    expect(() => parseApplicationProposal({ ...base, extra: true })).toThrow();
    expect(() => parseApplicationProposal({ ...base, candidates: sorted([candidate(1), candidate(2)]).reverse() })).toThrow("sorted");
    expect(() => parseApplicationProposal({ ...base, candidates: sorted([candidate(1), { ...candidate(2), manifest: candidate(1).manifest }]) })).toThrow("unique");
    expect(() => parseApplicationProposal({ ...base, candidates: sorted(Array.from({ length: PROPOSAL_LIMITS.candidates + 1 }, (_, i) => candidate(i))) })).toThrow("bound");
    expect(() => parseApplicationProposal({ ...base, candidates: [] })).toThrow("status");
    expect(() => parseApplicationProposal({ ...base, status: "failed" })).toThrow("status");
    expect(() => parseApplicationProposal({ ...base, status: "failed", candidates: [], reasons: Array.from({ length: PROPOSAL_LIMITS.reasons + 1 }, (_, i) => `r${i}`) })).toThrow("bound");
    expect(() => parseApplicationProposal({ ...base, status: "failed", candidates: [], reasons: ["x".repeat(PROPOSAL_LIMITS.reasonBytes + 1)] })).toThrow("bounded text");
    expect(() => parseApplicationProposal({ ...base, status: "partial" })).toThrow("status");
    expect(() => parseApplicationProposal({ ...base, work: { steps: -1, agentCalls: 0, units: 0 } })).toThrow();
    expect(() => parseApplicationProposal({ ...base, work: { steps: 1, agentCalls: 0 } })).toThrow();
    expect(parseApplicationProposal({ ...base, status: "failed", candidates: [], reasons: ["generator-failed"] }).status).toBe("failed");
  });
});
