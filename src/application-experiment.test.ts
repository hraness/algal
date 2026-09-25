import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService } from "./application";
import { evaluateApplicationRevision } from "./application-adaptation";
import { applicationJson } from "./application-contract";
import { produceApplicationComparison } from "./application-comparison";
import {
  checkExperimentBinding, parseApplicationExperiment, produceApplicationExperiment, verifyApplicationExperiment,
  type ApplicationExperiment, type ProduceExperimentInput,
} from "./application-experiment";
import { createApplicationPolicyHost } from "./application-host";
import { APPLICATION_MEMORY_NATIVE_LIMITS } from "./application-memory";
import { produceApplicationProposal } from "./application-proposal";
import { produceApplicationSelection } from "./application-selection";
import { capabilityHandle } from "./capabilities";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { HabitatAccount, type HabitatBudget, type HabitatLimits } from "./habitat-budget";
import { builtinRegistry } from "./registry";
import type { Digest } from "./digest";
import type { JsonValue } from "./values";

const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
const hash = (value: unknown) => digestCanonical(applicationJson(value));
const runtime = { fns: builtinRegistry() };
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
const generator = manifestToJson(parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:generator", name: "generator",
  interface: { inputs: {}, outputs: { candidates: { cell: "gen", port: "out" } } },
  cells: [{ id: "gen", kind: "expr", inputs: {}, expr: { contract: "algal.expr.v1", program: ["list", ["quote", winnerStrategy], ["quote", loserStrategy]] }, output: { kind: "json", schema: { type: "array" } } }],
  edges: [],
}));

async function fixture(options: { selectionEnvironment?: string } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "algal-experiment-")); directories.push(directory);
  const bootstrap = new ApplicationService(directory, { async admitCommit() { throw new Error("bootstrap cannot commit"); } });
  const store = bootstrap.store, put = (value: unknown) => store.putValue(applicationJson(value));
  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "applicable", schema, program, procedures: [], polarityColumn: 1, conflict: "single-value" });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await put({ contract: "algal.application-view-spec.v1", title: "Experiment", widgets: ["procedures"] });
  const runtimeProfile = await put({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await put({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: "workspace", previous: null, sequence: 0, mutation: null, status: "settled" });
  const attestation = await put({ contract: "algal.experiment-attestation.v1" });
  const scope = await put({ contract: "algal.application-memory-scope.v1", application: "workspace", environment: "fixture", task: "experiment", frontier, bindings: [], completeFor: [], attestation });
  const memory = await put({ contract: "algal.application-memory.v1", application: "workspace", schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  const incumbentManifest = await store.putManifest(parseOrganismManifest(incumbentStrategy));
  const generatorManifest = await store.putManifest(parseOrganismManifest(generator));
  const entry = (name: string, manifest: Digest) => ({ name, manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] });
  const revisionBody = { contract: "algal.application-revision.v1", application: "workspace", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [],
    entrypoints: [entry("generate", generatorManifest), entry("run", incumbentManifest)] };
  const revision = await put(revisionBody);
  const policy = { contract: "algal.application-host.v1", application: "workspace", frontier, hostProfile: hash("profile"), episodeAccess: "observe", routes: [{ route: "inbox", recipient: capabilityHandle("mailbox-send", "fixture"), hostProfile: hash("profile") }], attestation: "algal.experiment-attestation.v1", decoders: [] };
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
  const evaluate = (parentState: Digest, candidateRevision: Digest, environment = "harbor") =>
    evaluateApplicationRevision(store, { contract: "algal.application-evaluation-request.v1", parentState, candidateRevision, entrypoint: "run", cases, scorer, policy: evaluationPolicy, environment }, runtime);
  const winnerManifest = digestCanonical(winnerStrategy), loserManifest = digestCanonical(loserStrategy);
  return { directory, store, put, host, policy, service, genesis, revision, memory, evaluationPolicy, cases, scorer, evaluate, winnerManifest, loserManifest };
}

/** Produces the full chain at genesis: proposal → two evaluations →
 * comparison → selection policy → retained selection. */
async function chain(f: Awaited<ReturnType<typeof fixture>>, environment = "harbor") {
  const produced = await produceApplicationProposal(f.store, {
    contract: "algal.application-proposal-request.v1", application: "workspace", parentState: f.genesis.digest,
    generator: "generate", target: "run", arguments: await f.put({}), output: "candidates", policy: f.evaluationPolicy, environment,
  }, runtime);
  const winner = produced.proposal.candidates.find(c => c.manifest === f.winnerManifest)!;
  const loser = produced.proposal.candidates.find(c => c.manifest === f.loserManifest)!;
  const winEval = await f.evaluate(f.genesis.digest, winner.revision, environment);
  const loseEval = await f.evaluate(f.genesis.digest, loser.revision, environment);
  const comparison = await produceApplicationComparison(f.store, {
    application: "workspace", parentState: f.genesis.digest, entrypoint: "run", environment,
    evaluations: [winEval.evaluationRef, loseEval.evaluationRef], selected: f.winnerManifest,
  }, runtime);
  const policyRef = await f.put({ contract: "algal.application-selection-policy.v1", application: "workspace", parentState: f.genesis.digest, entrypoint: "run", selections: [{ environment, comparison: comparison.comparisonRef, manifest: f.winnerManifest }] });
  const selection = await produceApplicationSelection(f.store, { policy: policyRef, environment, expectedParentState: f.genesis.digest }, runtime);
  const input: ProduceExperimentInput = {
    application: "workspace", parentState: f.genesis.digest, entrypoint: "run", environment,
    proposals: [produced.proposalRef], evaluations: [winEval.evaluationRef, loseEval.evaluationRef].sort(),
    comparison: comparison.comparisonRef, selectionPolicy: policyRef, selection: selection.selectionRef,
    result: { promoted: true, revision: winner.revision },
  };
  return { produced, winner, loser, winEval, loseEval, comparison, policyRef, selection, input };
}

describe("application experiments", () => {
  test("joins proposals, evaluations, comparison, policy and selection into one reproducible record", async () => {
    const f = await fixture();
    const c = await chain(f);
    const produced = await produceApplicationExperiment(f.store, c.input, runtime);
    const stored = await verifyApplicationExperiment(f.store, produced.experimentRef, f.genesis.digest, runtime);
    expect(stored).toEqual(produced.experiment);
    expect(stored.result).toEqual({ promoted: true, revision: c.winner.revision });
    // Re-minting the identical join is byte-stable.
    const again = await produceApplicationExperiment(f.store, c.input, runtime);
    expect(again.experimentRef).toBe(produced.experimentRef);
    // The default host replays a cited experiment and binds its result to the committed revision.
    const activated = await f.service.commit({ application: "workspace", operation: hash("activate"), kind: "activate", expectedHead: f.genesis.digest, revision: c.winner.revision, memory: f.memory, intents: [], evidence: [c.winEval.evaluationRef, produced.experimentRef].sort(), causedBy: null });
    expect(activated.state.epoch).toBe(1);
    const lineage = await f.service.lineage("workspace");
    expect(lineage.map(row => row.kind)).toEqual(["create", "activate"]);
    expect(lineage[1]!.evidence).toContain(produced.experimentRef);
  });

  test("experiments that promote nothing remain valid retained evidence", async () => {
    const f = await fixture();
    const c = await chain(f);
    const input: ProduceExperimentInput = { ...c.input, comparison: null, selectionPolicy: null, selection: null, result: { promoted: false, revision: null } };
    const produced = await produceApplicationExperiment(f.store, input, runtime);
    expect(produced.experiment.result).toEqual({ promoted: false, revision: null });
    expect(await verifyApplicationExperiment(f.store, produced.experimentRef, f.genesis.digest, runtime)).toEqual(produced.experiment);
    // An unpromoted selection is also honest evidence.
    const selectedOnly = await produceApplicationExperiment(f.store, { ...c.input, result: { promoted: false, revision: c.winner.revision } }, runtime);
    expect(selectedOnly.experiment.result).toEqual({ promoted: false, revision: c.winner.revision });
  });

  test("rejects joins across environments, parents, and evidence sets", async () => {
    const f = await fixture();
    const c = await chain(f);
    const deny = async (patch: Partial<ProduceExperimentInput>, message: string) => {
      await expect(produceApplicationExperiment(f.store, { ...c.input, ...patch }, runtime)).rejects.toThrow(message);
    };
    // Cross-environment mixing: the proposal request and the evaluation
    // requests are frozen to "harbor".
    await deny({ environment: "other" }, "not bound to this environment");
    // Cross-parent mixing: another application's state and an unknown head
    // both refuse the join.
    const foreign = await f.put({ contract: "algal.application-state.v1", application: "other", sequence: 0, epoch: 0, revision: f.revision, memory: f.memory, previous: null, transition: hash("foreign-transition") });
    await deny({ parentState: foreign }, "belongs to another application");
    await deny({ parentState: hash("elsewhere") }, "Missing or changed application record");
    // Evaluations not in the comparison set.
    await deny({ evaluations: [c.winEval.evaluationRef] }, "does not join exactly the cited evaluations");
    // A selection outside the cited proposals.
    await deny({ proposals: [] }, "not among the cited proposals");
    // The policy must serve the experiment environment through this
    // comparison — a policy minted over a different comparison refuses.
    const otherComparison = await produceApplicationComparison(f.store, { application: "workspace", parentState: f.genesis.digest, entrypoint: "run", environment: "harbor", evaluations: [c.winEval.evaluationRef], selected: f.winnerManifest }, runtime);
    const otherPolicy = await f.put({ contract: "algal.application-selection-policy.v1", application: "workspace", parentState: f.genesis.digest, entrypoint: "run", selections: [{ environment: "harbor", comparison: otherComparison.comparisonRef, manifest: f.winnerManifest }] });
    await deny({ selectionPolicy: otherPolicy }, "a different comparison");
    // Result must name the selected candidate.
    await deny({ result: { promoted: false, revision: c.loser.revision } }, "not the selected candidate");
    await deny({ result: { promoted: true, revision: null } }, "promotion requires a revision");
    // No evidence at all.
    await deny({ proposals: [], evaluations: [] }, "at least one evidence record");
    // Stale verification.
    const produced = await produceApplicationExperiment(f.store, c.input, runtime);
    await expect(verifyApplicationExperiment(f.store, produced.experimentRef, hash("elsewhere"), runtime)).rejects.toThrow("stale");
    const forged = await f.put({ ...produced.experiment, environment: "other" } satisfies ApplicationExperiment);
    await expect(verifyApplicationExperiment(f.store, forged, f.genesis.digest, runtime)).rejects.toThrow("not bound to this environment");
    expect((await f.service.inspect("workspace"))!.digest).toBe(f.genesis.digest);
  });

  test("a cited experiment binds the committed revision or nothing", async () => {
    const f = await fixture();
    const c = await chain(f);
    const produced = await produceApplicationExperiment(f.store, c.input, runtime);
    const activate = (name: string, revision: Digest, evidence: Digest[]) =>
      f.service.commit({ application: "workspace", operation: hash(name), kind: "activate", expectedHead: f.genesis.digest, revision, memory: f.memory, intents: [], evidence: [...evidence].sort(), causedBy: null });
    // The experiment's winner is what the commit installs.
    await expect(activate("activate-loser", c.loser.revision, [c.loseEval.evaluationRef, produced.experimentRef])).rejects.toThrow("does not name the committed revision");
    expect((await f.service.inspect("workspace"))!.digest).toBe(f.genesis.digest);
    const activated = await activate("activate-winner", c.winner.revision, [c.winEval.evaluationRef, produced.experimentRef]);
    expect(activated.state.epoch).toBe(1);
    // Binding check: application/parent-state mismatch is refused structurally.
    const stored = produced.experiment;
    expect(() => checkExperimentBinding(stored, "other", f.genesis.digest)).toThrow("does not bind this transition");
    expect(() => checkExperimentBinding(stored, "workspace", hash("elsewhere"))).toThrow("does not bind this transition");
    expect(() => checkExperimentBinding(stored, "workspace", f.genesis.digest)).not.toThrow();
  });

  test("closed parser rejects unknown keys, wrong contract, and malformed joins", async () => {
    const f = await fixture();
    const c = await chain(f);
    const produced = await produceApplicationExperiment(f.store, c.input, runtime);
    const record = produced.experiment;
    expect(() => parseApplicationExperiment({ ...record, extra: 1 })).toThrow("Unknown or missing application field");
    expect(() => parseApplicationExperiment({ ...record, contract: "algal.other.v1" })).toThrow("Expected algal.application-experiment.v1");
    expect(() => parseApplicationExperiment({ ...record, selectionPolicy: null })).toThrow("requires a selection policy");
    expect(() => parseApplicationExperiment({ ...record, result: { promoted: true, revision: null } })).toThrow("promotion requires a revision");
    expect(() => parseApplicationExperiment({ ...record, proposals: [...record.proposals, ...record.proposals] })).toThrow("sorted and unique");
    expect(() => parseApplicationExperiment({ ...record, proposals: [], evaluations: [] })).toThrow("at least one evidence record");
    expect(() => parseApplicationExperiment({ ...record, result: { promoted: "yes", revision: null } })).toThrow("Invalid experiment promotion flag");
    // Lineage is a pure projection: genesis row carries the committed revision and no evidence.
    const lineage = await f.service.lineage("workspace");
    expect(lineage).toEqual([{ sequence: 0, kind: "create", operation: hash("create"), revision: f.revision, memory: f.memory, evidence: [], causedBy: null }]);
    expect(await f.service.lineage("missing")).toEqual([]);
  });
});

describe("experiments under a habitat budget", () => {
  // Each evaluation runs three selection cases for the incumbent and the
  // candidate, then one holdout case: seven runs at the default ceiling.
  const roomy: HabitatLimits = { work: 100_000_000, attempts: 1_024, runs: 64 };
  const request = (f: Awaited<ReturnType<typeof fixture>>, candidateRevision: Digest) => ({
    contract: "algal.application-evaluation-request.v1", parentState: f.genesis.digest, candidateRevision,
    entrypoint: "run", cases: f.cases, scorer: f.scorer, policy: f.evaluationPolicy, environment: "harbor",
  });
  const charged = async (f: Awaited<ReturnType<typeof fixture>>, account: HabitatAccount, ...revisions: Digest[]) => {
    for (const revision of revisions) await evaluateApplicationRevision(f.store, request(f, revision), runtime, { account });
    return f.put(account.record());
  };

  test("charged evaluations keep their records, and the experiment cites the account", async () => {
    const f = await fixture();
    const c = await chain(f);
    const account = new HabitatAccount("experiment", roomy);
    const winner = await evaluateApplicationRevision(f.store, request(f, c.winner.revision), runtime, { account });
    const loser = await evaluateApplicationRevision(f.store, request(f, c.loser.revision), runtime, { account });
    // The account changes no evaluation, report, or digest.
    expect(winner.evaluationRef).toBe(c.winEval.evaluationRef);
    expect(loser.evaluationRef).toBe(c.loseEval.evaluationRef);
    const record = account.record();
    expect(record).toMatchObject({ activity: "experiment", outcome: "complete", charged: { runs: 14 } });
    expect(record.runs[0]!.ceiling).toEqual({ work: 1_000_000, attempts: 16 });
    const budget = await f.put(record);
    const produced = await produceApplicationExperiment(f.store, { ...c.input, budget }, runtime);
    expect(produced.experiment.budget).toBe(budget);
    expect(await verifyApplicationExperiment(f.store, produced.experimentRef, f.genesis.digest, runtime)).toEqual(produced.experiment);
    // Without the field the record keeps the bytes it had before.
    const plain = await produceApplicationExperiment(f.store, c.input, runtime);
    expect("budget" in plain.experiment).toBe(false);
    const { budget: _budget, ...unbudgeted } = produced.experiment;
    expect(plain.experimentRef).toBe(hash(unbudgeted));
    // The evaluations may run in either order.
    const reversed = await charged(f, new HabitatAccount("experiment", roomy), c.loser.revision, c.winner.revision);
    expect((await produceApplicationExperiment(f.store, { ...c.input, budget: reversed }, runtime)).experiment.budget).toBe(reversed);
    // An account rebuilt from its record continues where it stopped.
    const resumed = await HabitatAccount.resume(record, f.store);
    expect(resumed.record()).toEqual(record);
    await evaluateApplicationRevision(f.store, request(f, c.winner.revision), runtime, { account: resumed });
    expect(resumed.record().charged.runs).toBe(21);
  });

  test("refuses accounts that do not charge exactly the cited evaluations", async () => {
    const f = await fixture();
    const c = await chain(f);
    const deny = async (budget: Digest, message: string) => {
      await expect(produceApplicationExperiment(f.store, { ...c.input, budget }, runtime)).rejects.toThrow(message);
    };
    await deny(await charged(f, new HabitatAccount("experiment", roomy), c.winner.revision), "does not charge exactly the cited evaluations");
    await deny(await charged(f, new HabitatAccount("experiment", roomy), c.winner.revision, c.loser.revision, c.winner.revision), "does not charge exactly the cited evaluations");
    const complete = (await f.store.getValue(await charged(f, new HabitatAccount("experiment", roomy), c.winner.revision, c.loser.revision))) as unknown as HabitatBudget;
    await deny(await f.put({ ...complete, activity: "foundry" }), "not an experiment account");
    const recharged = structuredClone(complete);
    recharged.runs[2]!.charged.work += 1;
    recharged.charged.work += 1;
    await deny(await f.put(recharged), "does not reconcile with the store");
    await deny(hash("missing-budget"), "Missing or changed application record");
    await deny(await f.put({ ...c.input }), "habitat budget");
    // Exhaustion stops the evaluation that does not fit and leaves the
    // terminal record; an exhausted account is not experiment evidence.
    const small = new HabitatAccount("experiment", { ...roomy, runs: 10 });
    await evaluateApplicationRevision(f.store, request(f, c.winner.revision), runtime, { account: small });
    const refused = await evaluateApplicationRevision(f.store, request(f, c.loser.revision), runtime, { account: small }).catch((error: unknown) => error);
    expect((refused as { code?: string }).code).toBe("BUDGET_EXHAUSTED");
    const exhausted = small.record();
    expect(exhausted).toMatchObject({ outcome: "exhausted", charged: { runs: 10 }, refused: { reasons: ["runs"] } });
    await deny(await f.put(exhausted), "not complete");
    await expect(HabitatAccount.resume(exhausted, f.store)).rejects.toThrow("cannot continue");
    await expect(HabitatAccount.resume(recharged, f.store)).rejects.toThrow("does not reconcile");
    // Only an experiment account charges an evaluation.
    await expect(evaluateApplicationRevision(f.store, request(f, c.winner.revision), runtime, { account: new HabitatAccount("foundry", roomy) })).rejects.toThrow("experiment habitat account");
    // The closed parser accepts the optional reference and nothing else.
    const produced = await produceApplicationExperiment(f.store, { ...c.input, budget: await charged(f, new HabitatAccount("experiment", roomy), c.winner.revision, c.loser.revision) }, runtime);
    expect(() => parseApplicationExperiment({ ...produced.experiment, budget: null })).toThrow();
    expect(() => parseApplicationExperiment({ ...produced.experiment, budget: "sha256:bad" })).toThrow();
  });
});
