import { describe, expect, test } from "bun:test";
import { putApplicationRecord } from "./application-contract";
import { parseApplicationEvaluationRequest, parseEvaluationPolicy, evaluateApplicationRevision, verifyApplicationEvaluation, admitApplicationActivation, checkApplicationCompatibility, pureManifest } from "./application-adaptation";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import { canonicalize, type JsonValue } from "./values";

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

async function fixture(candidate = echo, capabilities: string[] = [], options: { store?: MemoryStore; composition?: "closed-pure-v1" } = {}) {
  const store = options.store ?? new MemoryStore();
  const schema = await store.putValue({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 2 }] });
  const program = await store.putValue({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [] } });
  const query = await store.putValue({ contract: "algal.application-memory-query.v1", id: "available-query", schema, program, procedures: [], polarityColumn: 1, conflict: "single-value" });
  const queries = await store.putValue({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const view = await store.putValue({ contract: "algal.application-view.v1", widgets: [] });
  const profile = await store.putValue({ contract: "algal.application-runtime-profile.v1", effects: [] });
  const policy = await store.putValue({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true, ...(options.composition ? { composition: options.composition } : {}) });
  const incumbentManifest = await store.putManifest(constant("a", "incumbent-adaptation"));
  const candidateManifest = await store.putManifest(candidate);
  const revisionBody = (parent: Digest | null, manifest: Digest, caps: string[] = []) => ({ contract: "algal.application-revision.v1", application: "workspace", parent, schema, queries, views: view, runtimeProfile: profile, evaluationPolicy: policy, capabilityRequirements: caps, entrypoints: [{ name: "discover", manifest, applicability: query, maxGenerations: 4, capabilities: [], queries: [query] }] });
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

/** Every layer keeps the same public ports and private output mapping. */
function composed(child: Digest, kind: "organism" | "repeat" | "each", key: string, via?: string): OrganismManifest {
  const collection = kind === "each";
  return parseOrganismManifest({
    contract: "algal.organism.v1", key: `organism:${key}`, name: key,
    interface: echo.interface,
    cells: [
      { id: "src", kind: "input", outputs: { value: "json" } },
      ...(collection ? [{ id: "list", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program: ["list", ["get", "value"]] }, output: { kind: "json", schema: { type: "array" } } }] : []),
      { id: "child", kind, manifest: child, ...(kind === "repeat" ? { maxRounds: 2, carry: { answer: "q" } } : collection ? { over: "q", maxItems: 2 } : {}), ...(via ? { via } : {}) },
      ...(collection ? [{ id: "first", kind: "expr", inputs: { items: "json" }, expr: { contract: "algal.expr.v1", program: ["nth", ["get", "items"], 0] }, output: { kind: "json", schema: { type: ["null", "boolean", "object", "array", "number", "string"] } } }] : []),
      { id: "out", kind: "fn", fn: "echo.v1" },
    ],
    edges: [
      ...(collection ? [{ from: { cell: "src", port: "value" }, to: { cell: "list", port: "value" } }] : []),
      { from: { cell: collection ? "list" : "src", port: collection ? "out" : "value" }, to: { cell: "child", port: "q" } },
      ...(collection ? [{ from: { cell: "child", port: "answer" }, to: { cell: "first", port: "items" } }] : []),
      { from: { cell: collection ? "first" : "child", port: collection ? "out" : "answer" }, to: { cell: "out", port: "value" } },
    ],
  });
}

async function nested(store: MemoryStore, leaf = echo): Promise<OrganismManifest> {
  const child = await store.putManifest(leaf);
  const each = await store.putManifest(composed(child, "each", "each-pure"));
  const repeat = await store.putManifest(composed(each, "repeat", "repeat-pure"));
  return composed(repeat, "organism", "nested-pure");
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

  test("binds evaluation policy to the candidate revision", async () => {
    const f = await fixture();
    const alternate = await f.store.putValue({ contract: "algal.application-evaluation-policy.v1", maxCases: 3, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
    await expect(evaluateApplicationRevision(f.store, { ...f.request, policy: alternate }, { fns: builtinRegistry(), executors: [] })).rejects.toThrow("policy");
  });

  test("rejects an evaluation whose top-level candidate differs from its request", async () => {
    const f = await fixture();
    const runtime = { fns: builtinRegistry(), executors: [] };
    const result = await evaluateApplicationRevision(f.store, f.request, runtime);
    const forged = await putApplicationRecord(f.store, { ...result.evaluation, candidateRevision: f.state });
    await expect(admitApplicationActivation(f.store, { evaluation: forged, expectedState: f.state, revision: f.state }, runtime)).rejects.toThrow("bound to its request");
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

  test("composition policy is exact and absent fields preserve canonical policy bytes", () => {
    const original = { contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true };
    for (const policy of [original, { ...original, research: digestCanonical("research") }, { ...original, composition: "closed-pure-v1" }, { ...original, research: digestCanonical("research"), composition: "closed-pure-v1" }]) {
      expect(canonicalize(parseEvaluationPolicy(policy))).toBe(canonicalize(policy));
      expect(digestCanonical(parseEvaluationPolicy(policy))).toBe(digestCanonical(policy));
    }
    for (const composition of [null, false, 1, "", "closed-pure-v2", {}]) expect(() => parseEvaluationPolicy({ ...original, composition })).toThrow("composition");
    expect(() => parseEvaluationPolicy({ ...original, composition: "closed-pure-v1", extra: true })).toThrow();
  });

  test("explicit policy evaluates, replays and activates pure nested call, repeat and each", async () => {
    const store = new MemoryStore();
    const candidate = await nested(store);
    const f = await fixture(candidate, [], { store, composition: "closed-pure-v1" });
    const runtime = { fns: builtinRegistry() };
    const result = await evaluateApplicationRevision(store, f.request, runtime);
    expect(result.evaluation.verdict.status).toBe("accepted");
    const checked = await verifyApplicationEvaluation(store, result.evaluationRef, f.state, runtime);
    expect(checked.evaluation).toEqual(result.evaluation);
    expect(checked.report.candidates.every(row => row.work.agentCalls === 0)).toBe(true);
    expect((await admitApplicationActivation(store, { evaluation: result.evaluationRef, expectedState: f.state, revision: f.candidateRevision }, runtime)).revision).toBe(f.candidateRevision);
    // The synchronous rule used by proposal generation remains unchanged.
    expect(() => pureManifest(candidate, runtime.fns)).toThrow("organism");
  });

  test("old policies reject composition and flat evaluation evidence remains identical", async () => {
    const store = new MemoryStore();
    const f = await fixture(await nested(store), [], { store });
    await expect(evaluateApplicationRevision(store, f.request, { fns: builtinRegistry() })).rejects.toThrow("organism");
    const flat = await fixture();
    const result = await evaluateApplicationRevision(flat.store, flat.request, { fns: builtinRegistry() });
    expect((await verifyApplicationEvaluation(flat.store, result.evaluationRef, flat.state, { fns: builtinRegistry() })).evaluation).toEqual(result.evaluation);
    expect(result.evaluationRef).toBe(digestCanonical(result.evaluation));
  });

  test("closed composition rejects inactive effects at any depth before executor use", async () => {
    const forbidden: JsonValue[] = [
      { id: "hidden", kind: "agent", inputs: { value: "json" }, prompt: "must not execute", view: { inputs: ["value"] }, output: { kind: "text" } },
      { id: "hidden", kind: "slot", name: "private", mode: "read", default: null },
      { id: "hidden", kind: "store" },
      { id: "hidden", kind: "load" },
      { id: "hidden", kind: "spawn" },
      { id: "hidden", kind: "tool", tool: "hidden.v1" },
      { id: "hidden", kind: "recall", inputs: { value: "json" }, query: { contract: "algal.expr.v1", program: "query" } },
    ];
    for (const cell of forbidden) {
      const store = new MemoryStore();
      const base = manifestToJson(echo);
      const leaf = parseOrganismManifest({ ...base, cells: [...echo.cells, cell], edges: [...echo.edges,
        // The model and recall cells would be skipped even if run. The full
        // closure still must reject them instead of trusting reachability.
        ...((cell as { kind: string }).kind === "agent" || (cell as { kind: string }).kind === "recall" ? [{ from: { cell: "src", port: "value" }, to: { cell: "hidden", port: "value" }, guard: { expr: { contract: "algal.expr.v1", program: false } } }] : []),
      ] });
      const f = await fixture(await nested(store, leaf), [], { store, composition: "closed-pure-v1" });
      let attempts = 0;
      await expect(evaluateApplicationRevision(store, f.request, { fns: builtinRegistry(), executors: [{ id: "must-not-run", capabilities: { effects: ["agent", "recall"] }, execute: async () => { attempts++; throw new Error("executed"); } }] })).rejects.toThrow();
      expect(attempts).toBe(0);
    }
  });

  test("closed composition rejects local via references, missing modules and custom registries", async () => {
    const store = new MemoryStore();
    const leaf = await store.putManifest(echo);
    for (const candidate of [composed(leaf, "organism", "via-child", "local"), composed(digestCanonical("missing"), "organism", "missing-child")]) {
      const f = await fixture(candidate, [], { store, composition: "closed-pure-v1" });
      await expect(evaluateApplicationRevision(store, f.request, { fns: builtinRegistry() })).rejects.toThrow();
    }
    const f = await fixture(await nested(store), [], { store, composition: "closed-pure-v1" });
    const registry = builtinRegistry();
    registry.get("echo.v1")!.fn = () => ({ value: "changed" });
    await expect(evaluateApplicationRevision(store, f.request, { fns: registry })).rejects.toThrow("builtin function registry");
  });

  test("closed composition binds root and child bytes on evaluation and replay", async () => {
    for (const replaceRoot of [true, false]) {
      const store = new MemoryStore();
      const candidate = await nested(store);
      const f = await fixture(candidate, [], { store, composition: "closed-pure-v1" });
      const runtime = { fns: builtinRegistry() };
      const result = await evaluateApplicationRevision(store, f.request, runtime);
      const target = replaceRoot ? f.candidateManifest : digestCanonical(manifestToJson(echo));
      const replacement = parseOrganismManifest({ ...manifestToJson(replaceRoot ? candidate : echo), name: "substituted pure manifest" });
      const original = store.getManifest.bind(store);
      store.getManifest = async ref => ref === target ? replacement : original(ref);
      await expect(evaluateApplicationRevision(store, f.request, runtime)).rejects.toThrow("digest mismatch");
      await expect(verifyApplicationEvaluation(store, result.evaluationRef, f.state, runtime)).rejects.toThrow("digest mismatch");
    }
  });

  test("a store cannot swap an effectful dependency between preflight and execution", async () => {
    const store = new MemoryStore();
    const f = await fixture(await nested(store), [], { store, composition: "closed-pure-v1" });
    const leafRef = digestCanonical(manifestToJson(echo));
    const substituted = parseOrganismManifest({ ...manifestToJson(echo), cells: [...echo.cells, { id: "hidden", kind: "agent", inputs: {}, prompt: "must not execute", view: { inputs: [] }, output: { kind: "text" } }] });
    let reads = 0, attempts = 0;
    const original = store.getManifest.bind(store);
    store.getManifest = async ref => ref === leafRef && ++reads > 1 ? substituted : original(ref);
    await expect(evaluateApplicationRevision(store, f.request, { fns: builtinRegistry(), executors: [{ id: "must-not-run", capabilities: { effects: ["agent"] }, execute: async () => { attempts++; return "unexpected"; } }] })).rejects.toThrow("digest mismatch");
    expect(reads).toBeGreaterThan(1);
    expect(attempts).toBe(0);
  });

  test("a store cannot opt an old policy into composition under its existing digest", async () => {
    const store = new MemoryStore();
    const f = await fixture(await nested(store), [], { store });
    const policy = await store.getValue(f.policy) as Record<string, JsonValue>;
    const original = store.getValue.bind(store);
    store.getValue = async ref => ref === f.policy ? { ...policy, composition: "closed-pure-v1" } : original(ref);
    await expect(evaluateApplicationRevision(store, f.request, { fns: builtinRegistry() })).rejects.toThrow("policy digest mismatch");
  });

  test("closed composition shares root execution budgets and bounds compilation expansion", async () => {
    for (const budgets of [{ maxDepth: 1 }, { maxSteps: 4 }, { maxWork: 100 }]) {
      const store = new MemoryStore();
      const candidate = parseOrganismManifest({ ...manifestToJson(await nested(store)), budgets });
      const f = await fixture(candidate, [], { store, composition: "closed-pure-v1" });
      const result = await evaluateApplicationRevision(store, f.request, { fns: builtinRegistry() });
      expect(result.evaluation.verdict.status).toBe("rejected");
      const checked = await verifyApplicationEvaluation(store, result.evaluationRef, f.state, { fns: builtinRegistry() });
      expect(checked.report.candidates.find(row => row.manifestDigest === f.candidateManifest)!.cases.every(row => row.outcome !== "complete")).toBe(true);
    }
    const store = new MemoryStore();
    let child = await store.putManifest(echo);
    for (let i = 0; i < 65; i++) child = await store.putManifest(composed(child, "organism", `depth-${i}`));
    const f = await fixture(composed(child, "organism", "too-deep"), [], { store, composition: "closed-pure-v1" });
    await expect(evaluateApplicationRevision(store, f.request, { fns: builtinRegistry() })).rejects.toThrow("depth");
    const shared = new MemoryStore();
    let ref = await shared.putManifest(echo);
    for (let i = 0; i < 10; i++) {
      const unit = composed(ref, "organism", `wide-${i}`);
      ref = await shared.putManifest(parseOrganismManifest({ ...manifestToJson(unit), cells: [...unit.cells, { id: "second", kind: "organism", manifest: ref }], edges: [...unit.edges, { from: { cell: "src", port: "value" }, to: { cell: "second", port: "q" } }] }));
    }
    const expanded = await fixture(composed(ref, "organism", "expanded"), [], { store: shared, composition: "closed-pure-v1" });
    await expect(evaluateApplicationRevision(shared, expanded.request, { fns: builtinRegistry() })).rejects.toThrow("expanded compilation");
    // A store violating its digest contract cannot turn a cycle into an
    // unbounded compilation. Real content-addressed stores reject such data.
    const cyclic = composed(child, "organism", "cycle");
    const original = store.getManifest.bind(store);
    store.getManifest = async ref => ref === child ? cyclic : original(ref);
    await expect(evaluateApplicationRevision(store, f.request, { fns: builtinRegistry() })).rejects.toThrow("digest mismatch");
  });
});
