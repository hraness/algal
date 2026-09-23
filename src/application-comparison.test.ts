import { describe, expect, test } from "bun:test";
import { putApplicationRecord } from "./application-contract";
import { evaluateApplicationRevision, verifyApplicationEvaluation } from "./application-adaptation";
import { checkComparisonBinding, comparisonDigest, parseApplicationComparison, produceApplicationComparison, verifyApplicationComparison } from "./application-comparison";
import { parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";

const constant = (answer: string, key: string) => parseOrganismManifest({
  contract: "algal.organism.v1", key: `organism:${key}`, name: key,
  interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "value" } } },
  cells: [
    { id: "src", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value: answer } } },
  ], edges: [],
});
const echo = parseOrganismManifest({
  contract: "algal.organism.v1", key: "organism:echo-comparison", name: "echo comparison",
  interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "value" } } },
  cells: [{ id: "src", kind: "input", outputs: { value: "json" } }, { id: "out", kind: "fn", fn: "echo.v1" }],
  edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
});

async function fixture() {
  const store = new MemoryStore();
  const schema = await store.putValue({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 2 }] });
  const program = await store.putValue({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [] } });
  const query = await store.putValue({ contract: "algal.application-memory-query.v1", id: "available-query", schema, program, procedures: [], polarityColumn: 1, conflict: "single-value" });
  const queries = await store.putValue({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const view = await store.putValue({ contract: "algal.application-view.v1", widgets: [] });
  const profile = await store.putValue({ contract: "algal.application-runtime-profile.v1", effects: [] });
  const policy = await store.putValue({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const incumbentManifest = await store.putManifest(constant("a", "incumbent-comparison"));
  const revisionBody = (parent: Digest | null, manifest: Digest) => ({ contract: "algal.application-revision.v1", application: "workspace", parent, schema, queries, views: view, runtimeProfile: profile, evaluationPolicy: policy, capabilityRequirements: [], entrypoints: [{ name: "discover", manifest, applicability: query, maxGenerations: 4, capabilities: [], queries: [query] }] });
  const incumbentRevision = await putApplicationRecord(store, revisionBody(null, incumbentManifest));
  const memory = await store.putValue({ contract: "algal.application-memory.v1", application: "workspace", schema, previous: null, scope: schema, observations: [], hypotheses: [], withdrawn: [] });
  const transition = await store.putValue({ contract: "algal.application-transition.v1", application: "workspace", operation: schema, request: schema, kind: "create", previous: null, revision: incumbentRevision, memory, intents: [], evidence: [], causedBy: null });
  const state = await putApplicationRecord(store, { contract: "algal.application-state.v1", application: "workspace", sequence: 0, epoch: 0, revision: incumbentRevision, memory, previous: null, transition });
  const winningManifest = await store.putManifest(echo);
  const losingManifest = await store.putManifest(constant("z", "losing-comparison"));
  const winnerRevision = await putApplicationRecord(store, revisionBody(incumbentRevision, winningManifest));
  const loserRevision = await putApplicationRecord(store, revisionBody(incumbentRevision, losingManifest));
  const cases = await store.putValue({ contract: "algal.application-evaluation-cases.v1", cases: [
    { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
    { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
    { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } },
  ] });
  const scorer = await store.putValue({ contract: "algal.application-evaluation-scorer.v1", scorer: null });
  const request = (candidateRevision: Digest) => ({ contract: "algal.application-evaluation-request.v1", parentState: state, candidateRevision, entrypoint: "discover", cases, scorer, policy, environment: "harbor-fixture" });
  const runtime = { fns: builtinRegistry(), executors: [] };
  return { store, state, policy, cases, scorer, incumbentRevision, winnerRevision, loserRevision, winningManifest, losingManifest, request, runtime };
}

describe("application comparison", () => {
  test("joins several evaluated alternatives under one environment and retains the loser", async () => {
    const f = await fixture();
    const win = await evaluateApplicationRevision(f.store, f.request(f.winnerRevision), f.runtime);
    const lose = await evaluateApplicationRevision(f.store, f.request(f.loserRevision), f.runtime);
    expect(win.evaluation.verdict.status).toBe("accepted");
    expect(lose.evaluation.verdict.status).toBe("rejected");

    const produced = await produceApplicationComparison(f.store, {
      application: "workspace", parentState: f.state, entrypoint: "discover", environment: "harbor-fixture",
      evaluations: [lose.evaluationRef, win.evaluationRef], selected: f.winningManifest,
    }, f.runtime);
    expect(produced.comparison.selected).toBe(f.winningManifest);
    expect(produced.comparison.results.length).toBe(2);
    expect(produced.comparison.results.every(r => r.evaluation === win.evaluationRef || r.evaluation === lose.evaluationRef)).toBe(true);
    expect(produced.comparison.results.find(r => r.manifest === f.losingManifest)?.verdict).toBe("rejected");

    const checked = await verifyApplicationComparison(f.store, produced.comparisonRef, f.state, f.runtime);
    expect(comparisonDigest(checked)).toBe(produced.comparisonRef);
  });

  test("records an all-failing comparison with no selection", async () => {
    const f = await fixture();
    const lose = await evaluateApplicationRevision(f.store, f.request(f.loserRevision), f.runtime);
    const produced = await produceApplicationComparison(f.store, {
      application: "workspace", parentState: f.state, entrypoint: "discover", environment: "harbor-fixture",
      evaluations: [lose.evaluationRef], selected: null,
    }, f.runtime);
    expect(produced.comparison.selected).toBeNull();
    await verifyApplicationComparison(f.store, produced.comparisonRef, f.state, f.runtime);
  });

  test("requires environment-attributed requests and shared measurement fields", async () => {
    const f = await fixture();
    const win = await evaluateApplicationRevision(f.store, f.request(f.winnerRevision), f.runtime);
    // An evaluation without the environment label cannot join a comparison.
    const untagged = { ...f.request(f.winnerRevision) } as Record<string, unknown>;
    delete untagged.environment;
    const untaggedEval = await evaluateApplicationRevision(f.store, untagged, f.runtime);
    await expect(produceApplicationComparison(f.store, {
      application: "workspace", parentState: f.state, entrypoint: "discover", environment: "harbor-fixture",
      evaluations: [untaggedEval.evaluationRef], selected: f.winningManifest,
    }, f.runtime)).rejects.toThrow("parent state and environment");
    // An evaluation under a different environment cannot join either.
    const other = await evaluateApplicationRevision(f.store, { ...f.request(f.loserRevision), environment: "other-env" }, f.runtime);
    await expect(produceApplicationComparison(f.store, {
      application: "workspace", parentState: f.state, entrypoint: "discover", environment: "harbor-fixture",
      evaluations: [win.evaluationRef, other.evaluationRef], selected: f.winningManifest,
    }, f.runtime)).rejects.toThrow("parent state and environment");
  });

  test("rejects a selected manifest that was not accepted", async () => {
    const f = await fixture();
    const win = await evaluateApplicationRevision(f.store, f.request(f.winnerRevision), f.runtime);
    const lose = await evaluateApplicationRevision(f.store, f.request(f.loserRevision), f.runtime);
    await expect(produceApplicationComparison(f.store, {
      application: "workspace", parentState: f.state, entrypoint: "discover", environment: "harbor-fixture",
      evaluations: [win.evaluationRef, lose.evaluationRef], selected: f.losingManifest,
    }, f.runtime)).rejects.toThrow("accepted");
  });

  test("a stale parent state and a tampered record fail verification", async () => {
    const f = await fixture();
    const win = await evaluateApplicationRevision(f.store, f.request(f.winnerRevision), f.runtime);
    const produced = await produceApplicationComparison(f.store, {
      application: "workspace", parentState: f.state, entrypoint: "discover", environment: "harbor-fixture",
      evaluations: [win.evaluationRef], selected: f.winningManifest,
    }, f.runtime);
    const laterTransition = await f.store.putValue({ contract: "algal.application-transition.v1", application: "workspace", operation: f.policy, request: f.policy, kind: "memory", previous: f.state, revision: f.incumbentRevision, memory: f.cases, intents: [], evidence: [], causedBy: null });
    const state2 = await putApplicationRecord(f.store, { contract: "algal.application-state.v1", application: "workspace", sequence: 1, epoch: 1, revision: f.incumbentRevision, memory: f.cases, previous: f.state, transition: laterTransition });
    await expect(verifyApplicationComparison(f.store, produced.comparisonRef, state2, f.runtime)).rejects.toThrow("stale");
    const tampered = await putApplicationRecord(f.store, { ...produced.comparison, selected: f.losingManifest });
    await expect(verifyApplicationComparison(f.store, tampered, f.state, f.runtime)).rejects.toThrow();
  });

  test("binding check fences the committing application and parent state", async () => {
    const f = await fixture();
    const win = await evaluateApplicationRevision(f.store, f.request(f.winnerRevision), f.runtime);
    const produced = await produceApplicationComparison(f.store, {
      application: "workspace", parentState: f.state, entrypoint: "discover", environment: "harbor-fixture",
      evaluations: [win.evaluationRef], selected: f.winningManifest,
    }, f.runtime);
    expect(() => checkComparisonBinding(produced.comparison, "workspace", f.state)).not.toThrow();
    expect(() => checkComparisonBinding(produced.comparison, "other", f.state)).toThrow("bind");
    expect(() => checkComparisonBinding(produced.comparison, "workspace", digestCanonical("elsewhere"))).toThrow("bind");
    // With a committed revision, the selection must be exactly what that
    // revision installs for the compared entrypoint.
    const entry = (manifest: Digest, name = "discover") => ({ entrypoints: [{ name, manifest }] });
    expect(() => checkComparisonBinding(produced.comparison, "workspace", f.state, entry(f.winningManifest))).not.toThrow();
    expect(() => checkComparisonBinding(produced.comparison, "workspace", f.state, entry(f.losingManifest))).toThrow("not the committed entrypoint manifest");
    expect(() => checkComparisonBinding(produced.comparison, "workspace", f.state, entry(f.winningManifest, "other"))).toThrow("not in the committed revision");
    const unselected = { ...produced.comparison, selected: null };
    expect(() => checkComparisonBinding(unselected, "workspace", f.state, entry(f.winningManifest))).toThrow("not the committed entrypoint manifest");
  });

  test("rejects too many, duplicate, foreign, and mis-targeted evaluations", async () => {
    const f = await fixture();
    const win = await evaluateApplicationRevision(f.store, f.request(f.winnerRevision), f.runtime);
    const base = { application: "workspace", parentState: f.state, entrypoint: "discover", environment: "harbor-fixture", selected: null };
    await expect(produceApplicationComparison(f.store, { ...base, evaluations: [win.evaluationRef, win.evaluationRef] }, f.runtime)).rejects.toThrow("unique");
    await expect(produceApplicationComparison(f.store, { ...base, evaluations: Array.from({ length: 9 }, (_, i) => digestCanonical(`e${i}`)) }, f.runtime)).rejects.toThrow("bound");
    await expect(produceApplicationComparison(f.store, { ...base, application: "elsewhere", evaluations: [win.evaluationRef] }, f.runtime)).rejects.toThrow("another application");
    await expect(produceApplicationComparison(f.store, { ...base, entrypoint: "missing", evaluations: [win.evaluationRef] }, f.runtime)).rejects.toThrow("entrypoint");
    // Shared measurement fields: a second evaluation under different cases cannot join.
    const otherCases = await f.store.putValue({ contract: "algal.application-evaluation-cases.v1", cases: [
      { id: "train-x", split: "train", args: { q: "x" }, expect: { answer: "x" } },
      { id: "validation-y", split: "validation", args: { q: "y" }, expect: { answer: "y" } },
      { id: "holdout-z", split: "holdout", args: { q: "z" }, expect: { answer: "z" } },
    ] });
    const otherEval = await evaluateApplicationRevision(f.store, { ...f.request(f.loserRevision), cases: otherCases }, f.runtime);
    await expect(produceApplicationComparison(f.store, { ...base, evaluations: [win.evaluationRef, otherEval.evaluationRef] }, f.runtime)).rejects.toThrow("share cases, scorer, and policy");
  });

  test("closes the parser: unknown fields, unsorted results, duplicate manifests, bad verdicts", () => {
    const ref = digestCanonical("comparison-fixture");
    const result = { revision: ref, manifest: digestCanonical("m1"), evaluation: ref, verdict: "accepted" };
    const base = { contract: "algal.application-comparison.v1", application: "workspace", parentState: ref, entrypoint: "discover", environment: "env", cases: ref, scorer: ref, policy: ref, results: [result], selected: digestCanonical("m1") };
    expect(parseApplicationComparison(base).selected).toBe(digestCanonical("m1"));
    expect(() => parseApplicationComparison({ ...base, extra: 1 })).toThrow();
    expect(() => parseApplicationComparison({ ...base, results: [] })).toThrow("at least one");
    const dupManifest = [result, { revision: digestCanonical("r2"), manifest: digestCanonical("m1"), evaluation: digestCanonical("e2"), verdict: "rejected" }]
      .sort((a, b) => (a.revision < b.revision ? -1 : 1));
    expect(dupManifest[0]!.revision).not.toBe(dupManifest[1]!.revision);
    expect(() => parseApplicationComparison({ ...base, results: dupManifest, selected: null })).toThrow("unique");
    expect(() => parseApplicationComparison({ ...base, selected: digestCanonical("absent") })).toThrow("accepted");
    expect(() => parseApplicationComparison({ ...base, results: [{ ...result, verdict: "maybe" }] })).toThrow("verdict");
  });

  test("legacy evaluation requests without an environment still evaluate and verify", async () => {
    const f = await fixture();
    const request = f.request(f.winnerRevision) as Record<string, unknown>;
    delete request.environment;
    const evaluated = await evaluateApplicationRevision(f.store, request, f.runtime);
    const checked = await verifyApplicationEvaluation(f.store, evaluated.evaluationRef, f.state, f.runtime);
    expect(checked.verdict.status).toBe("accepted");
  });
});
