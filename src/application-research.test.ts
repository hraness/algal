import { afterEach, describe, expect, test } from "bun:test";
import { generateKeyPairSync, sign, verify } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService } from "./application";
import { applicationJson } from "./application-contract";
import { parseEvaluationPolicy } from "./application-adaptation";
import { createApplicationPolicyHost } from "./application-host";
import { ApplicationMemoryService, APPLICATION_MEMORY_NATIVE_LIMITS } from "./application-memory";
import {
  admitApplicationResearchEvaluation, admitApplicationResearchActivation, verifyApplicationResearchEvaluation,
  parseApplicationResearchReport, parseApplicationResearchPolicy, type ApplicationResearchAttempt,
  type ApplicationResearchReport, type ApplicationResearchVerifier,
} from "./application-research";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { canonicalize } from "./values";

const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
const hash = (value: unknown) => digestCanonical(applicationJson(value));
const strategy = (value: string) => parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:strategy", name: "Strategy", interface: { inputs: {}, outputs: { strategy: { cell: "out", port: "value" } } }, cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value } } }], edges: [] });

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "algal-research-")); directories.push(directory);
  const bootstrap = new ApplicationService(directory, { async admitCommit() { throw new Error("bootstrap"); } });
  const store = bootstrap.store, put = (value: unknown) => store.putValue(applicationJson(value));
  const keys = generateKeyPairSync("ed25519");
  const evaluator = await put({ contract: "algal.fixture-evaluator.v1", publicKey: keys.publicKey.export({ format: "der", type: "spki" }).toString("base64") });
  const harness = await put({ contract: "algal.fixture-harness.v1", version: 1 });
  const cases = await Promise.all(["dev-a", "dev-b", "holdout-a", "holdout-b"].map(async id => ({ id, split: id.startsWith("dev") ? "development" : "holdout", task: await put({ id, task: "frozen" }), sources: await put({ id, sources: [] }) })));
  const corpus = await put({ contract: "algal.application-research-corpus.v1", cases });
  const researchPolicy = { contract: "algal.application-research-policy.v1", evaluator, harness, corpus, strategyEntrypoints: ["strategy"], maxAttemptsPerCase: 2 };
  const research = await put(researchPolicy);
  const evaluationPolicy = await put({ contract: "algal.application-evaluation-policy.v1", maxCases: 4, maxWork: 1000, maxModelCalls: 8, requireHoldoutPass: true, strictValidationImprovement: true, research });
  let verifications = 0;
  const verifier: ApplicationResearchVerifier = {
    identity: evaluator,
    async verify(context) {
      verifications++;
      const seal = context.seal as { request: Digest; report: Digest; journal: Digest; signature: string };
      const payload = { request: hash(context.request), report: hash(context.report), journal: context.report.attemptJournal };
      if (hash({ request: seal.request, report: seal.report, journal: seal.journal }) !== hash(payload) || typeof seal.signature !== "string" || !verify(null, Buffer.from(canonicalize(payload)), keys.publicKey, Buffer.from(seal.signature, "base64"))) return false;
      const journal = await context.store.getValue(context.report.attemptJournal);
      if (hash(journal) !== hash({ request: payload.request, receipts: context.report.attempts.map(attempt => attempt.receipt) })) return false;
      for (const attempt of context.report.attempts) {
        const { receipt, ...accounting } = attempt;
        if (hash(await context.store.getValue(receipt)) !== hash({ request: payload.request, ...accounting })) return false;
      }
      return true;
    },
  };
  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "ready", schema, program, procedures: [], polarityColumn: 1, conflict: "set-of-values" });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await put({ contract: "algal.application-view-spec.v1", title: "Research", widgets: ["memory"] });
  const runtimeProfile = await put({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "sealed-research-evaluation.v1" });
  const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: "workspace", previous: null, sequence: 0, mutation: null, status: "settled" });
  const scope = await put({ contract: "algal.application-memory-scope.v1", application: "workspace", environment: "fixture", task: "research", frontier, bindings: [], completeFor: [], attestation: await put("attestation") });
  const policy = { contract: "algal.application-host.v1", application: "workspace", frontier, hostProfile: hash("profile"), episodeAccess: "observe", routes: [], attestation: null, decoders: [] };
  const host = createApplicationPolicyHost(policy, { channelsDir: join(directory, "channels"), researchVerifier: verifier });
  const service = new ApplicationService(directory, host);
  const engine = { identity: hash("unused-engine"), async query(): Promise<never> { throw new Error("No provider calls"); }, async verify(): Promise<never> { throw new Error("No provider calls"); }, async settle() {} };
  const memory = new ApplicationMemoryService({ store, engine, admission: host });
  const memoryRef = await memory.snapshot({ application: "workspace", schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  const manifest = await store.putManifest(strategy("before"));
  const revisionBody = { contract: "algal.application-revision.v1", application: "workspace", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "strategy", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }] };
  const revision = await put(revisionBody);
  const create = { application: "workspace", operation: hash("create"), kind: "create", expectedHead: null, revision, memory: memoryRef, intents: [], evidence: [], causedBy: null };
  const genesis = await service.create(create);
  const candidate = { ...revisionBody, parent: revision, entrypoints: [{ ...revisionBody.entrypoints[0], manifest: await store.putManifest(strategy("after")) }] };
  const candidateRevision = await put(candidate);
  const request = { contract: "algal.application-research-request.v1", parentState: genesis.digest, candidateRevision, entrypoint: "strategy", policy: evaluationPolicy };
  const requestRef = await put(request);
  const rows: Omit<ApplicationResearchAttempt, "receipt">[] = cases.flatMap(row => (["incumbent", "candidate"] as const).map(role => ({ caseId: row.id, role, attempt: 1, outcome: "complete", passed: role === "candidate" || row.id !== "dev-b", work: 64, modelCalls: 1 })));
  const evidence = async (attempts = rows, reference = requestRef) => {
    const admitted = await Promise.all(attempts.map(async attempt => ({ ...attempt, receipt: await put({ request: reference, ...attempt }) })));
    const attemptJournal = await put({ request: reference, receipts: admitted.map(attempt => attempt.receipt) });
    const report: ApplicationResearchReport = { contract: "algal.application-research-report.v1", request: reference, attemptJournal, attempts: admitted };
    const reportRef = await put(report), payload = { request: reference, report: reportRef, journal: attemptJournal };
    const seal = await put({ ...payload, signature: sign(null, Buffer.from(canonicalize(payload)), keys.privateKey).toString("base64") });
    return { input: { request: reference, report: reportRef, seal }, report };
  };
  const activate = (evaluation: Digest) => ({ application: "workspace", operation: hash("activate"), kind: "activate", expectedHead: genesis.digest, revision: candidateRevision, memory: memoryRef, intents: [], evidence: [evaluation], causedBy: null });
  return { directory, store, put, service, genesis, create, policy, host, candidate, candidateRevision, request, requestRef, researchPolicy, verifier, verifications: () => verifications, evidence, rows, activate };
}

describe("sealed application research admission", () => {
  test("verifies exact signed records, recomputes the verdict, re-verifies at activation and reopens", async () => {
    const f = await fixture(), evidence = await f.evidence();
    const result = await admitApplicationResearchEvaluation(f.store, evidence.input, { verifier: f.verifier });
    expect(result.evaluation.verdict.status).toBe("accepted");
    const activated = await f.service.commit(f.activate(result.evaluationRef));
    expect(f.verifications()).toBe(2);
    expect(activated.state.memory).toBe(f.genesis.state.memory);
    expect(activated.state.epoch).toBe(1);
    expect((await new ApplicationService(f.directory, f.host).inspect("workspace"))!.digest).toBe(activated.digest);
    await expect(admitApplicationResearchActivation(f.store, { evaluation: result.evaluationRef, expectedState: activated.digest, revision: f.candidateRevision }, { verifier: f.verifier })).rejects.toThrow("stale");
    await expect(admitApplicationResearchActivation(f.store, { evaluation: result.evaluationRef, expectedState: f.genesis.digest, revision: f.genesis.state.revision }, { verifier: f.verifier })).rejects.toThrow("accepted candidate");
  });

  test("no policy record, signature or pure-case report grants implicit verifier authority", async () => {
    const f = await fixture(), evidence = await f.evidence();
    const denied = new ApplicationService(f.directory, createApplicationPolicyHost(f.policy, { channelsDir: join(f.directory, "channels") }));
    await expect(denied.commit({ ...f.create, operation: hash("memory"), kind: "memory", expectedHead: f.genesis.digest })).rejects.toThrow("explicit trusted verifier");
    await expect(admitApplicationResearchEvaluation(f.store, evidence.input, { verifier: { ...f.verifier, identity: hash("foreign") } })).rejects.toThrow("pinned evaluator");
    await expect(admitApplicationResearchEvaluation(f.store, evidence.input, { verifier: { identity: f.verifier.identity, async verify() { return false; } } })).rejects.toThrow("did not verify");
    const forgedSeal = await f.put({ request: f.requestRef, report: evidence.input.report, journal: evidence.report.attemptJournal, signature: "forged" });
    await expect(admitApplicationResearchEvaluation(f.store, { ...evidence.input, seal: forgedSeal }, { verifier: f.verifier })).rejects.toThrow("did not verify");
    const pure = await f.put({ contract: "algal.application-evaluation.v1" });
    await expect(f.service.commit(f.activate(pure))).rejects.toThrow("cannot use pure-case evidence");
  });

  test("candidate cannot edit policy, harness settings, strategy interface or budget", async () => {
    const f = await fixture();
    const enlarged = parseOrganismManifest({ ...manifestToJson(strategy("large")) as object, budgets: { ...strategy("large").budgets, maxWork: strategy("large").budgets.maxWork + 1 } });
    for (const candidate of [{ ...f.candidate, goals: [] }, { ...f.candidate, evaluationPolicy: hash("unowned-policy") }, { ...f.candidate, entrypoints: [{ ...f.candidate.entrypoints[0], maxGenerations: 2 }] }, { ...f.candidate, entrypoints: [{ ...f.candidate.entrypoints[0], manifest: await f.store.putManifest(enlarged) }] }]) {
      const request = await f.put({ ...f.request, candidateRevision: await f.put(candidate) });
      const evidence = await f.evidence(f.rows, request);
      await expect(admitApplicationResearchEvaluation(f.store, evidence.input, { verifier: f.verifier })).rejects.toThrow();
    }
    expect(f.verifications()).toBe(0);
  });

  test("rejects signed regressions, heldout failure, absent improvement, uncertainty and all-attempt resource overruns", async () => {
    const f = await fixture();
    const variants: [string, Omit<ApplicationResearchAttempt, "receipt">[]][] = [
      ["case-regression", f.rows.map(row => ({ ...row, passed: row.role === "candidate" && row.caseId === "dev-a" ? false : row.passed }))],
      ["holdout-failure", f.rows.map(row => ({ ...row, passed: row.role === "candidate" && row.caseId === "holdout-a" ? false : row.passed }))],
      ["no-strict-development-improvement", f.rows.map(row => ({ ...row, passed: row.caseId === "dev-b" ? false : row.passed }))],
      ["uncertain-attempt", f.rows.map(row => row.caseId === "dev-a" && row.role === "candidate" ? { ...row, outcome: "uncertain", passed: false } : row)],
      ["work-budget", [{ ...f.rows[0]!, outcome: "failed", passed: false, work: 900 }, ...f.rows.map((row, i) => i === 0 ? { ...row, attempt: 2 } : row)]],
      ["model-call-budget", f.rows.map(row => ({ ...row, modelCalls: 3 }))],
    ];
    for (const [reason, rows] of variants) {
      const evidence = await f.evidence(rows), result = await admitApplicationResearchEvaluation(f.store, evidence.input, { verifier: f.verifier });
      expect(result.evaluation.verdict.status).toBe("rejected");
      if (result.evaluation.verdict.status === "rejected") expect(result.evaluation.verdict.reasons).toContain(reason);
      await expect(f.service.commit(f.activate(result.evaluationRef))).rejects.toThrow("accepted candidate");
    }
  });

  test("rejects omitted cases, reused receipts, hidden attempts, wrong requests and forged aggregate verdicts", async () => {
    const f = await fixture();
    const missing = await f.evidence(f.rows.slice(1));
    await expect(admitApplicationResearchEvaluation(f.store, missing.input, { verifier: f.verifier })).rejects.toThrow("omits");
    const skipped = await f.evidence(f.rows.map((row, i) => i === 0 ? { ...row, attempt: 2 } : row));
    await expect(admitApplicationResearchEvaluation(f.store, skipped.input, { verifier: f.verifier })).rejects.toThrow("sequence");
    const evidence = await f.evidence();
    const reused = { ...evidence.report, attempts: evidence.report.attempts.map((row, i) => i === 1 ? { ...row, receipt: evidence.report.attempts[0]!.receipt } : row) };
    await expect(admitApplicationResearchEvaluation(f.store, { ...evidence.input, report: await f.put(reused) }, { verifier: f.verifier })).rejects.toThrow("distinct");
    const altered = { ...evidence.report, attempts: evidence.report.attempts.map(row => ({ ...row, work: 0 })) };
    await expect(admitApplicationResearchEvaluation(f.store, { ...evidence.input, report: await f.put(altered) }, { verifier: f.verifier })).rejects.toThrow("did not verify");
    const wrong = await f.put({ ...evidence.report, request: hash("wrong") });
    await expect(admitApplicationResearchEvaluation(f.store, { ...evidence.input, report: wrong }, { verifier: f.verifier })).rejects.toThrow("another request");
    const result = await admitApplicationResearchEvaluation(f.store, evidence.input, { verifier: f.verifier });
    const forged = await f.put({ ...result.evaluation, verdict: { status: "accepted", selectedManifest: f.genesis.revision.entrypoints[0]!.manifest } });
    await expect(verifyApplicationResearchEvaluation(f.store, forged, f.genesis.digest, { verifier: f.verifier })).rejects.toThrow("not reproducible");
    expect((await f.service.inspect("workspace"))!.digest).toBe(f.genesis.digest);
  });

  test("legacy policy bytes stay exact and research parsers remain closed and bounded", async () => {
    const legacy = { contract: "algal.application-evaluation-policy.v1", maxCases: 3, maxWork: 1000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true };
    expect(hash(parseEvaluationPolicy(legacy))).toBe(hash(legacy));
    expect(() => parseEvaluationPolicy({ ...legacy, research: null })).toThrow();
    const f = await fixture(), evidence = await f.evidence();
    expect(() => parseApplicationResearchPolicy({ ...f.researchPolicy, extra: true })).toThrow();
    expect(() => parseApplicationResearchPolicy({ ...f.researchPolicy, maxAttemptsPerCase: 9 })).toThrow();
    expect(() => parseApplicationResearchReport({ ...evidence.report, attempts: [{ ...evidence.report.attempts[0], outcome: "uncertain", passed: true }] })).toThrow();
  });
});
