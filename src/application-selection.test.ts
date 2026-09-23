import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService, type ApplicationCommand } from "./application";
import { evaluateApplicationRevision } from "./application-adaptation";
import { produceApplicationComparison, type ApplicationComparison } from "./application-comparison";
import { applicationJson, parseApplicationRevision } from "./application-contract";
import { createApplicationPolicyHost } from "./application-host";
import { APPLICATION_MEMORY_NATIVE_LIMITS } from "./application-memory";
import { restoreApplicationRevision, type ApplicationRestorationPolicy } from "./application-restoration";
import {
  SELECTION_LIMITS, parseApplicationSelectionPolicy, selectApplicationStrategy, verifyApplicationSelectionPolicy, type ApplicationSelectionPolicy,
} from "./application-selection";
import { capabilityHandle } from "./capabilities";
import { parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { builtinRegistry } from "./registry";
import type { JsonValue } from "./values";

const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
const hash = (value: unknown) => digestCanonical(applicationJson(value));
const runtime = { fns: builtinRegistry() };
const strategy = (key: string, program: JsonValue) => parseOrganismManifest({
  contract: "algal.organism.v1", key: `organism:${key}`, name: key,
  interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "out" } } },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program }, output: { kind: "json", schema: { type: "string" } } },
  ],
  edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
});
const fixing = ["if", ["eq", ["get", "value"], "v2"], "v2-ok", ["if", ["eq", ["get", "value"], "h1"], "h1-ok", "ok"]];

async function fixture(options: { selectionEnvironment?: string; restoration?: boolean } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "algal-selection-")); directories.push(directory);
  const bootstrap = new ApplicationService(directory, { async admitCommit() { throw new Error("bootstrap cannot commit"); } });
  const store = bootstrap.store, put = (value: unknown) => store.putValue(applicationJson(value));
  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "applicable", schema, program, procedures: [], polarityColumn: 1, conflict: "single-value" });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await put({ contract: "algal.application-view-spec.v1", title: "Selection", widgets: ["procedures"] });
  const runtimeProfile = await put({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await put({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: "workspace", previous: null, sequence: 0, mutation: null, status: "settled" });
  const attestation = await put({ contract: "algal.selection-attestation.v1" });
  const scope = await put({ contract: "algal.application-memory-scope.v1", application: "workspace", environment: "fixture", task: "selection", frontier, bindings: [], completeFor: [], attestation });
  const memory = await put({ contract: "algal.application-memory.v1", application: "workspace", schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  const incumbentManifest = await store.putManifest(strategy("incumbent", "ok"));
  const winnerManifest = await store.putManifest(strategy("winner", fixing));
  const alternateManifest = await store.putManifest(strategy("alternate", ["if", ["eq", ["get", "value"], "h1"], "h1-ok", ["if", ["eq", ["get", "value"], "v2"], "v2-ok", "ok"]]));
  const loserManifest = await store.putManifest(strategy("loser", "nope"));
  const revisionBody = (parent: Digest | null, manifest: Digest) => ({ contract: "algal.application-revision.v1", application: "workspace", parent, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }] });
  const revision = await put(revisionBody(null, incumbentManifest));
  const winnerRevision = await put(revisionBody(revision, winnerManifest));
  const alternateRevision = await put(revisionBody(revision, alternateManifest));
  const loserRevision = await put(revisionBody(revision, loserManifest));
  const policy = { contract: "algal.application-host.v1", application: "workspace", frontier, hostProfile: hash("profile"), episodeAccess: "observe", routes: [{ route: "inbox", recipient: capabilityHandle("mailbox-send", "fixture"), hostProfile: hash("profile") }], attestation: "algal.selection-attestation.v1", decoders: [] };
  const restorationPolicy: ApplicationRestorationPolicy = { contract: "algal.application-restoration-policy.v1", application: "workspace", mode: "retained-pure-strategy-manifests" };
  const hostFor = (selectionEnvironment?: string, restoration = false) => createApplicationPolicyHost(policy, { channelsDir: join(directory, "channels"), ...(selectionEnvironment === undefined ? {} : { selectionEnvironment }), ...(restoration ? { restorationPolicy } : {}) });
  const host = hostFor(options.selectionEnvironment, options.restoration);
  const service = new ApplicationService(directory, host);
  const genesis = await service.create({ application: "workspace", operation: hash("create"), kind: "create", expectedHead: null, revision, memory, intents: [], evidence: [], causedBy: null });
  const cases = await put({ contract: "algal.application-evaluation-cases.v1", cases: [
    { id: "train-ok", split: "train", args: { q: "t1" }, expect: { answer: "ok" } },
    { id: "val-ok", split: "validation", args: { q: "v1" }, expect: { answer: "ok" } },
    { id: "val-fixed", split: "validation", args: { q: "v2" }, expect: { answer: "v2-ok" } },
    { id: "hold-fixed", split: "holdout", args: { q: "h1" }, expect: { answer: "h1-ok" } },
  ] });
  const scorer = await put({ contract: "algal.application-evaluation-scorer.v1", scorer: null });
  const evaluate = (parentState: Digest, candidateRevision: Digest, environment: string, caseSet = cases) =>
    evaluateApplicationRevision(store, { contract: "algal.application-evaluation-request.v1", parentState, candidateRevision, entrypoint: "run", cases: caseSet, scorer, policy: evaluationPolicy, environment }, runtime);
  const compare = (parentState: Digest, environment: string, evaluations: Digest[], selected: Digest | null) =>
    produceApplicationComparison(store, { application: "workspace", parentState, entrypoint: "run", environment, evaluations, selected }, runtime);
  const selectionPolicy = (parentState: Digest, selections: ApplicationSelectionPolicy["selections"]) => ({ contract: "algal.application-selection-policy.v1", application: "workspace", parentState, entrypoint: "run", selections });
  const activate = (name: string, expectedHead: Digest, revision: Digest, evidence: Digest[]): ApplicationCommand =>
    ({ application: "workspace", operation: hash(name), kind: "activate", expectedHead, revision, memory, intents: [], evidence: [...evidence].sort(), causedBy: null });
  return { directory, store, put, host, hostFor, policy, restorationPolicy, service, genesis, revision, memory, cases, scorer, evaluationPolicy, incumbentManifest, winnerManifest, alternateManifest, loserManifest, winnerRevision, alternateRevision, loserRevision, revisionBody, evaluate, compare, selectionPolicy, activate };
}

/** Evaluates winner, alternate and loser at the genesis head under one
 * environment, joins them, and returns a policy row for that environment. */
async function compared(f: Awaited<ReturnType<typeof fixture>>, environment = "prod") {
  const win = await f.evaluate(f.genesis.digest, f.winnerRevision, environment);
  const alt = await f.evaluate(f.genesis.digest, f.alternateRevision, environment);
  const lose = await f.evaluate(f.genesis.digest, f.loserRevision, environment);
  expect([win, alt, lose].map(e => e.evaluation.verdict.status)).toEqual(["accepted", "accepted", "rejected"]);
  const comparison = await f.compare(f.genesis.digest, environment, [win.evaluationRef, alt.evaluationRef, lose.evaluationRef], f.winnerManifest);
  return { win, alt, lose, comparison, row: { environment, comparison: comparison.comparisonRef, manifest: f.winnerManifest } };
}

describe("environment-keyed selection", () => {
  test("verifies every row, selects by environment, and admits an activation that installs the selection", async () => {
    const f = await fixture({ selectionEnvironment: "prod" });
    const prod = await compared(f, "prod");
    const staging = await compared(f, "staging");
    const policyRef = await f.put(f.selectionPolicy(f.genesis.digest, [prod.row, staging.row]));
    const verified = await verifyApplicationSelectionPolicy(f.store, policyRef, f.genesis.digest, runtime);
    expect([...verified.comparisons.keys()]).toEqual(["prod", "staging"]);
    const selected = await selectApplicationStrategy(f.store, policyRef, "prod", f.genesis.digest, runtime);
    expect(selected.manifest).toBe(f.winnerManifest);
    expect(selected.comparison.environment).toBe("prod");
    expect(selected.row.comparison).toBe(prod.comparison.comparisonRef);
    await expect(selectApplicationStrategy(f.store, policyRef, "lab", f.genesis.digest, runtime)).rejects.toThrow("no row for this environment");
    await expect(selectApplicationStrategy(f.store, policyRef, "prod", hash("elsewhere"), runtime)).rejects.toThrow("stale");
    const activated = await f.service.commit(f.activate("activate", f.genesis.digest, f.winnerRevision, [prod.win.evaluationRef, prod.comparison.comparisonRef, policyRef]));
    expect(activated.state.epoch).toBe(1);
    expect(activated.revision.entrypoints[0]!.manifest).toBe(f.winnerManifest);
    expect(activated.transition.evidence).toContain(policyRef);
  });

  test("a stored policy grants nothing without the host environment, and the environment must have a row", async () => {
    const f = await fixture();
    const prod = await compared(f, "prod");
    const policyRef = await f.put(f.selectionPolicy(f.genesis.digest, [prod.row]));
    const command = f.activate("activate", f.genesis.digest, f.winnerRevision, [prod.win.evaluationRef, prod.comparison.comparisonRef, policyRef]);
    await expect(f.service.commit(command)).rejects.toThrow("Host policy denies selection policy");
    await expect(new ApplicationService(f.directory, f.hostFor("lab")).commit(command)).rejects.toThrow("no row for this environment");
    expect(() => f.hostFor("Not An Id")).toThrow("Invalid application identifier");
    // Two cited policies are ambiguous; one policy for another application is refused.
    const twin = await f.put(f.selectionPolicy(f.genesis.digest, [prod.row, { ...prod.row, environment: "staging" }]));
    await expect(new ApplicationService(f.directory, f.hostFor("prod")).commit({ ...command, evidence: [...command.evidence, twin].sort() })).rejects.toThrow("exactly one selection policy");
    const foreign = await f.put({ ...f.selectionPolicy(f.genesis.digest, [prod.row]), application: "elsewhere" });
    await expect(new ApplicationService(f.directory, f.hostFor("prod")).commit({ ...command, evidence: [prod.win.evaluationRef, prod.comparison.comparisonRef, foreign].sort() })).rejects.toThrow("does not bind this policy");
    // Without a policy the ordinary activation still works under the same host.
    const activated = await new ApplicationService(f.directory, f.hostFor("prod")).commit({ ...command, evidence: [prod.win.evaluationRef, prod.comparison.comparisonRef].sort() });
    expect(activated.state.epoch).toBe(1);
  });

  test("rows must name the comparison's selection, environment, and a reproducible comparison", async () => {
    const f = await fixture({ selectionEnvironment: "prod" });
    const prod = await compared(f, "prod");
    const deny = async (selections: ApplicationSelectionPolicy["selections"], message: string) => {
      const policyRef = await f.put(f.selectionPolicy(f.genesis.digest, selections));
      await expect(selectApplicationStrategy(f.store, policyRef, "prod", f.genesis.digest, runtime)).rejects.toThrow(message);
      await expect(f.service.commit(f.activate(`activate-${message}`, f.genesis.digest, f.winnerRevision, [prod.win.evaluationRef, policyRef]))).rejects.toThrow(message);
    };
    await deny([{ ...prod.row, manifest: f.alternateManifest }], "does not name the comparison's selected manifest");
    await deny([{ ...prod.row, manifest: f.loserManifest }], "does not name the comparison's selected manifest");
    await deny([{ ...prod.row, environment: "staging" }], "does not bind this policy");
    const unselected = await f.compare(f.genesis.digest, "prod", [prod.lose.evaluationRef], null);
    await deny([{ ...prod.row, comparison: unselected.comparisonRef }], "does not name the comparison's selected manifest");
    const tampered = await f.put({ ...prod.comparison.comparison, cases: hash("other-cases") } satisfies ApplicationComparison);
    await deny([{ ...prod.row, comparison: tampered }], "not reproducible");
    const otherEntrypoint = await f.put({ ...f.selectionPolicy(f.genesis.digest, [prod.row]), entrypoint: "other" });
    await expect(selectApplicationStrategy(f.store, otherEntrypoint, "prod", f.genesis.digest, runtime)).rejects.toThrow("does not bind this policy");
  });

  test("an activation that installs another accepted alternative than the selection is denied", async () => {
    const f = await fixture({ selectionEnvironment: "prod" });
    const prod = await compared(f, "prod");
    const policyRef = await f.put(f.selectionPolicy(f.genesis.digest, [prod.row]));
    // The alternate is reproducibly accepted, but the environment selected the winner.
    await expect(f.service.commit(f.activate("alternate", f.genesis.digest, f.alternateRevision, [prod.alt.evaluationRef, policyRef]))).rejects.toThrow("does not install the selected strategy");
    expect((await f.service.inspect("workspace"))!.digest).toBe(f.genesis.digest);
    const activated = await f.service.commit(f.activate("winner", f.genesis.digest, f.winnerRevision, [prod.win.evaluationRef, policyRef]));
    expect(activated.revision.entrypoints[0]!.manifest).toBe(f.winnerManifest);
  });

  test("restoration under selection must install the selected strategy; migration cannot cite a selection", async () => {
    const f = await fixture({ selectionEnvironment: "prod", restoration: true });
    const prod = await compared(f, "prod");
    const active = await f.service.commit(f.activate("activate", f.genesis.digest, f.winnerRevision, [prod.win.evaluationRef, prod.comparison.comparisonRef]));
    // At the new head the frozen set changes: the historical "ok" strategy
    // now beats the incumbent winner, so restoring it is a compared, accepted
    // alternative for the production environment.
    const plainCases = await f.put({ contract: "algal.application-evaluation-cases.v1", cases: [
      { id: "train-ok", split: "train", args: { q: "t1" }, expect: { answer: "ok" } },
      { id: "val-ok", split: "validation", args: { q: "v1" }, expect: { answer: "ok" } },
      { id: "val-plain", split: "validation", args: { q: "v2" }, expect: { answer: "ok" } },
      { id: "hold-plain", split: "holdout", args: { q: "h1" }, expect: { answer: "ok" } },
    ] });
    const restoredBody = { ...f.revisionBody(f.winnerRevision, f.incumbentManifest) };
    const restoredRevision = await f.put(restoredBody);
    const plainManifest = await f.store.putManifest(strategy("plain", "ok"));
    const plainRevision = await f.put(f.revisionBody(f.winnerRevision, plainManifest));
    const back = await f.evaluate(active.digest, restoredRevision, "prod", plainCases);
    const plain = await f.evaluate(active.digest, plainRevision, "prod", plainCases);
    expect([back, plain].map(e => e.evaluation.verdict.status)).toEqual(["accepted", "accepted"]);
    const comparison = await f.compare(active.digest, "prod", [back.evaluationRef, plain.evaluationRef], f.incumbentManifest);
    const selectsRestored = await f.put(f.selectionPolicy(active.digest, [{ environment: "prod", comparison: comparison.comparisonRef, manifest: f.incumbentManifest }]));
    const other = await f.compare(active.digest, "prod", [back.evaluationRef, plain.evaluationRef], plainManifest);
    const selectsPlain = await f.put(f.selectionPolicy(active.digest, [{ environment: "prod", comparison: other.comparisonRef, manifest: plainManifest }]));
    const policyRef = await f.put(f.restorationPolicy);
    const input = { application: "workspace", operation: hash("restore"), expectedHead: active.digest, targetState: f.genesis.digest, policy: policyRef };
    await expect(restoreApplicationRevision(f.service, { ...input, evidence: [selectsPlain] })).rejects.toThrow("does not install the selected strategy");
    expect((await f.service.inspect("workspace"))!.digest).toBe(active.digest);
    const restored = await restoreApplicationRevision(f.service, { ...input, evidence: [selectsRestored] });
    expect(restored.snapshot.revision.entrypoints[0]!.manifest).toBe(f.incumbentManifest);
    expect(restored.snapshot.transition.evidence).toContain(selectsRestored);
    // Migration is a schema change; a selection policy can never attach to it.
    const revision = (await f.service.inspect("workspace"))!;
    await expect(f.host.admitCommit({
      command: { application: "workspace", operation: hash("migrate"), kind: "migrate", expectedHead: revision.digest, revision: revision.state.revision, memory: f.memory, intents: [], evidence: [selectsRestored], causedBy: null },
      current: revision, revision: parseApplicationRevision(revision.revision), previousRevision: revision.revision, pending: [], store: f.store,
    })).rejects.toThrow("cannot attach to a migration");
  });

  test("closes the policy parser with sorted unique environments and a row bound", () => {
    const ref = hash("selection-fixture");
    const row = (environment: string) => ({ environment, comparison: ref, manifest: ref });
    const base = { contract: "algal.application-selection-policy.v1", application: "workspace", parentState: ref, entrypoint: "run", selections: [row("prod"), row("staging")] };
    expect(parseApplicationSelectionPolicy(base).selections.length).toBe(2);
    expect(() => parseApplicationSelectionPolicy({ ...base, extra: 1 })).toThrow();
    expect(() => parseApplicationSelectionPolicy({ ...base, selections: [] })).toThrow("at least one");
    expect(() => parseApplicationSelectionPolicy({ ...base, selections: [row("staging"), row("prod")] })).toThrow("sorted and unique");
    expect(() => parseApplicationSelectionPolicy({ ...base, selections: [row("prod"), row("prod")] })).toThrow("sorted and unique");
    expect(() => parseApplicationSelectionPolicy({ ...base, selections: Array.from({ length: SELECTION_LIMITS.selections + 1 }, (_, i) => row(`env-${String(i).padStart(2, "0")}`)) })).toThrow("bound");
    expect(() => parseApplicationSelectionPolicy({ ...base, selections: [{ ...row("prod"), extra: true }] })).toThrow();
    expect(() => parseApplicationSelectionPolicy({ ...base, selections: [row("Prod")] })).toThrow("identifier");
    expect(() => parseApplicationSelectionPolicy({ ...base, entrypoint: "../run" })).toThrow("identifier");
  });
});
