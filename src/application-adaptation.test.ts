import { describe, expect, test } from "bun:test";
import { parseApplicationRevision, parseApplicationState, putApplicationRecord } from "./application-contract";
import { parseApplicationEvaluationRequest, evaluateApplicationRevision, verifyApplicationEvaluation, admitApplicationActivation, checkApplicationCompatibility } from "./application-adaptation";
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
  contract: "algal.organism.v1", key: "organism:echo-adaptation", name: "echo adaptation",
  interface: { inputs: { q: { cell: "src", port: "value" } }, outputs: { answer: { cell: "out", port: "value" } } },
  cells: [{ id: "src", kind: "input", outputs: { value: "json" } }, { id: "out", kind: "fn", fn: "echo.v1" }],
  edges: [{ from: { cell: "src", port: "value" }, to: { cell: "out", port: "value" } }],
});

async function fixture(candidate = echo, capabilities: string[] = []) {
  const store = new MemoryStore();
  const schema = await store.putValue({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 2 }] });
  const program = await store.putValue({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [] } });
  const query = await store.putValue({ contract: "algal.application-memory-query.v1", id: "available-query", schema, program, procedures: [], polarityColumn: 1, conflict: "single-value" });
  const queries = await store.putValue({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const view = await store.putValue({ contract: "algal.application-view.v1", widgets: [] });
  const profile = await store.putValue({ contract: "algal.application-runtime-profile.v1", effects: [] });
  const policy = await store.putValue({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const incumbentManifest = await store.putManifest(constant("a", "incumbent-adaptation"));
  const candidateManifest = await store.putManifest(candidate);
  const revisionBody = (parent: Digest | null, manifest: Digest, caps: string[] = []) => ({ contract: "algal.application-revision.v1", application: "workspace", parent, schema, queries, views: view, runtimeProfile: profile, evaluationPolicy: policy, capabilityRequirements: caps, entrypoints: [{ name: "discover", manifest, applicability: query, maxGenerations: 4 }] });
  const incumbentRevision = await putApplicationRecord(store, revisionBody(null, incumbentManifest));
  const memory = await store.putValue({ contract: "algal.application-memory.v1", application: "workspace", schema, previous: null, scope: schema, observations: [], hypotheses: [], withdrawn: [] });
  const transition = await store.putValue({ contract: "algal.application-transition.v1", application: "workspace", operation: schema, request: schema, kind: "create", previous: null, revision: incumbentRevision, memory, intents: [], evidence: [], causedBy: null });
  const state = await putApplicationRecord(store, { contract: "algal.application-state.v1", application: "workspace", sequence: 0, epoch: 0, revision: incumbentRevision, memory, previous: null, transition });
  const candidateRevision = await putApplicationRecord(store, revisionBody(incumbentRevision, candidateManifest, capabilities));
  const cases = await store.putValue({ contract: "algal.application-evaluation-cases.v1", cases: [
    { id: "train-a", split: "train", args: { q: "a" }, expect: { answer: "a" } },
    { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } },
    { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } },
  ] });
  const scorer = await store.putValue({ contract: "algal.application-evaluation-scorer.v1", scorer: null });
  const request = { contract: "algal.application-evaluation-request.v1", parentState: state, candidateRevision, entrypoint: "discover", cases, scorer, policy };
  return { store, state, candidateRevision, request, cases, policy, scorer, incumbentRevision, candidateManifest, schema };
}

describe("application adaptation", () => {
  test("accepts a real pure ALGAL candidate and rechecks activation evidence", async () => {
    const f = await fixture();
    const runtime = { fns: builtinRegistry(), executors: [] };
    const result = await evaluateApplicationRevision(f.store, f.request, runtime);
    expect(result.evaluation.verdict.status).toBe("accepted");
    const checked = await verifyApplicationEvaluation(f.store, result.evaluationRef, f.state, runtime);
    expect(checked.verdict.status).toBe("accepted");
    const admitted = await admitApplicationActivation(f.store, { evaluation: result.evaluationRef, expectedState: f.state, revision: f.candidateRevision }, runtime);
    expect(admitted.revision).toBe(f.candidateRevision);
  });

  test("rejects a foundry winner when every candidate fails validation", async () => {
    const f = await fixture(constant("z", "all-fail-candidate"));
    const result = await evaluateApplicationRevision(f.store, f.request, { fns: builtinRegistry(), executors: [] });
    expect(result.evaluation.verdict.status).toBe("rejected");
    if (result.evaluation.verdict.status === "rejected") expect(result.evaluation.verdict.reasons.length).toBeGreaterThan(0);
  });

  test("rejects changed capabilities before acceptance", async () => {
    const f = await fixture(echo, ["write"]);
    const compatibility = await checkApplicationCompatibility(f.store, f.incumbentRevision, f.candidateRevision);
    expect(compatibility.status).toBe("incompatible");
    expect(compatibility.reasons).toContain("capability-expansion");
  });

  test("rejects stale parent and tampered frozen case evidence", async () => {
    const f = await fixture();
    const runtime = { fns: builtinRegistry(), executors: [] };
    const result = await evaluateApplicationRevision(f.store, f.request, runtime);
    const nextMemory = await f.store.putValue({ contract: "algal.application-memory.v1", application: "workspace", schema: f.schema, previous: null, scope: f.schema, observations: [], hypotheses: [], withdrawn: [] });
    const nextTransition = await f.store.putValue({ contract: "algal.application-transition.v1", application: "workspace", operation: f.policy, request: f.policy, kind: "memory", previous: f.state, revision: f.incumbentRevision, memory: nextMemory, intents: [], evidence: [], causedBy: null });
    const state2 = await putApplicationRecord(f.store, { contract: "algal.application-state.v1", application: "workspace", sequence: 1, epoch: 1, revision: f.incumbentRevision, memory: nextMemory, previous: f.state, transition: nextTransition });
    await expect(verifyApplicationEvaluation(f.store, result.evaluationRef, state2, runtime)).rejects.toThrow("stale");
    const alteredCases = await f.store.putValue({ contract: "algal.application-evaluation-cases.v1", cases: [{ id: "train-a", split: "train", args: { q: "tampered" }, expect: { answer: "a" } }, { id: "validation-b", split: "validation", args: { q: "b" }, expect: { answer: "b" } }, { id: "holdout-c", split: "holdout", args: { q: "c" }, expect: { answer: "c" } }] });
    const alteredRequest = { ...f.request, cases: alteredCases };
    const alteredRef = await putApplicationRecord(f.store, alteredRequest);
    const alteredEvaluation = { ...result.evaluation, request: alteredRef, cases: alteredCases };
    const alteredEvaluationRef = await putApplicationRecord(f.store, alteredEvaluation);
    await expect(verifyApplicationEvaluation(f.store, alteredEvaluationRef, f.state, runtime)).rejects.toThrow();
  });

  test("closes request parser against unknown fields and malformed refs", () => {
    const ref = digestCanonical("adaptation");
    expect(() => parseApplicationEvaluationRequest({ contract: "algal.application-evaluation-request.v1", parentState: ref, candidateRevision: ref, entrypoint: "discover", cases: ref, scorer: ref, policy: ref, extra: true })).toThrow();
  });
});
