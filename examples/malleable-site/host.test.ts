import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applicationJson } from "../../src/application-contract";
import { digestCanonical } from "../../src/digest";
import { APPLICATION, MarketingHost, exportEvidence, verifyEvidence } from "./host";
import { DEFAULT_CONFIG, DEFAULT_SIGNALS, type SurfaceProposal } from "./surface";
import { generateProposal } from "./propose";
import { createGatewayInference, type HarnessBackendConfig } from "../coding-harness/model";

const directories: string[] = [];
const hash = (v: unknown) => digestCanonical(applicationJson(v));
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "algal-marketing-test-")); directories.push(dir);
  const host = new MarketingHost(dir), initial = await host.initialize();
  const proposal: SurfaceProposal = { contract: "algal.marketing-proposal.v1", baseRevision: hash(await host.revision()), config: { ...DEFAULT_CONFIG, headline: "A component you can reshape." }, source: "owner", rationale: "Explicit owner preview." };
  return { host, dir, initial, proposal };
}
describe("experimental owner-edit host", () => {
  test("activates a real compatible pure manifest, persists signals, and restores forward", async () => {
    const f = await fixture(), preview = await f.host.preview(f.initial.digest, f.proposal);
    expect((await f.host.current()).digest).toBe(f.initial.digest);
    const active = await f.host.activate(preview.reference, hash("activate"));
    expect(active.state.epoch).toBe(1);
    expect((await f.host.activate(preview.reference, hash("activate"))).digest).toBe(active.digest);
    const signaled = await f.host.signal(active.digest, { kind: "audience", value: "operators" }, hash("signal"));
    expect((await f.host.signal(active.digest, { kind: "audience", value: "operators" }, hash("signal"))).digest).toBe(signaled.digest);
    const restored = await f.host.restore(signaled.digest, f.initial.digest, hash("restore"));
    expect(restored.state.epoch).toBe(2);
    expect(restored.state.memory).toBe(signaled.state.memory);
    expect(restored.revision.parent).toBe(active.state.revision);
    expect((await f.host.revision()).config).toEqual(DEFAULT_CONFIG);
    expect(await f.host.signals()).toEqual({ ...DEFAULT_SIGNALS, audience: "operators" });
    const reopened = new MarketingHost(f.dir);
    expect((await reopened.restore(signaled.digest, f.initial.digest, hash("restore"))).digest).toBe(restored.digest);
    expect((await reopened.service.history(APPLICATION)).length).toBe(4);
    const evidence = await exportEvidence(reopened);
    expect(await verifyEvidence(evidence, restored.digest)).toMatchObject({ ok: true, states: 4, receipts: 2 });
  });
  test("a signal invalidates an exact-head preview; stale proposal cannot be rebased silently", async () => {
    const f = await fixture(), preview = await f.host.preview(f.initial.digest, f.proposal);
    const signal = await f.host.signal(f.initial.digest, { kind: "release", value: "available" }, hash("signal"));
    await expect(f.host.activate(preview.reference, hash("activate"))).rejects.toThrow("Stale");
    await expect(f.host.signal(f.initial.digest, { kind: "release", value: "preview" }, hash("stale"))).rejects.toThrow("Stale");
    const fresh = await f.host.preview(signal.digest, f.proposal);
    await f.host.activate(fresh.reference, hash("activate-fresh"));
    await expect(f.host.preview((await f.host.current()).digest, f.proposal)).rejects.toThrow("Stale");
  });
  test("direct commits cannot bypass known programs, empty capabilities, receipts or memory preservation", async () => {
    const f = await fixture(), store = f.host.service.store;
    const put = (value: unknown) => store.putValue(applicationJson(value));
    const command = { application: APPLICATION, operation: hash("bypass"), kind: "activate", expectedHead: f.initial.digest, revision: f.initial.state.revision, memory: f.initial.state.memory, intents: [], evidence: [], causedBy: null };
    const badAuthority = await put({ ...f.initial.revision, parent: f.initial.state.revision, capabilityRequirements: ["network"] });
    await expect(f.host.service.commit({ ...command, revision: badAuthority })).rejects.toThrow();
    const preview = await f.host.preview(f.initial.digest, f.proposal);
    await expect(f.host.service.commit({ ...command, revision: preview.record.candidateRevision })).rejects.toThrow("preview");
    await expect(f.host.service.commit({ ...command, kind: "memory", revision: preview.record.candidateRevision })).rejects.toThrow("cannot change");
    const alteredMemory = await put({ contract: "algal.marketing-memory.v1", signals: { ...DEFAULT_SIGNALS, audience: "operators" }, previous: f.initial.state.memory, event: null, receipt: null });
    await expect(f.host.service.commit({ ...command, revision: preview.record.candidateRevision, memory: alteredMemory, evidence: [preview.reference] })).rejects.toThrow("preserve");
    await expect(f.host.service.commit({ ...command, kind: "memory", memory: alteredMemory })).rejects.toThrow("receipt");
    const widened = await put({ ...f.initial.revision, parent: f.initial.state.revision, entrypoints: f.initial.revision.entrypoints.map(entry => ({ ...entry, maxGenerations: 2 })) });
    await expect(f.host.service.commit({ ...command, revision: widened, evidence: [preview.reference] })).rejects.toThrow("entrypoint");
    const noProfile = await put({ ...f.initial.revision, parent: f.initial.state.revision, runtimeProfile: await put({ owner: true }) });
    await expect(f.host.service.commit({ ...command, revision: noProfile, evidence: [preview.reference] })).rejects.toThrow();
    expect((await f.host.current()).digest).toBe(f.initial.digest);
  });
  test("export replay rejects modified bytes, omitted evidence, altered order and a substituted anchor", async () => {
    const f = await fixture(), p = await f.host.preview(f.initial.digest, f.proposal), state = await f.host.activate(p.reference, hash("activate"));
    const evidence = await exportEvidence(f.host);
    const changed = structuredClone(evidence);
    changed.records[0]!.value = { tampered: true };
    await expect(verifyEvidence(changed, state.digest)).rejects.toThrow("tampered");
    const missing = structuredClone(evidence); missing.records = missing.records.filter(row => row.reference !== p.record.receipt);
    await expect(verifyEvidence(missing, state.digest)).rejects.toThrow("receipt");
    await expect(verifyEvidence({ ...evidence, states: [...evidence.states].reverse() }, state.digest)).rejects.toThrow();
    await expect(verifyEvidence(evidence, f.initial.digest)).rejects.toThrow("head");
    await expect(verifyEvidence({ ...evidence, extra: true }, state.digest)).rejects.toThrow();
  });
  test("one budgeted model proposal retains replayable inference evidence and never activates", async () => {
    const f = await fixture(); let calls = 0;
    const factory = async (config: HarnessBackendConfig) => {
      if (config.provider !== "gateway") throw new Error("Expected gateway fixture");
      const { provider: _provider, ...gateway } = config;
      return createGatewayInference(gateway, { credential: "fixture-not-a-real-key", fetch: async () => {
      calls++;
      return Response.json({ choices: [{ message: { content: JSON.stringify({ value: { ...DEFAULT_CONFIG, headline: "A considered local proposal.", rationale: "A deterministic provider fixture, not live model qualification." } }) }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
      } });
    };
      const backend = { provider: "gateway", model: "fixture/model", gatewayProvider: "fixture", ledgerPath: join(f.dir, "model-ledger"), maxCalls: 1, maxRequestBytes: 8192, maxOutputBytes: 4096, maxCostMicrousd: 100_000, maxInputTokens: 16_384, maxOutputTokens: 1024, inputMicrousdPerToken: 2, outputMicrousdPerToken: 6 };
      const result = await generateProposal(f.host, backend, factory);
      expect(result.proposal.source).toBe("model");
      expect(result.accounting.calls).toBe(1);
      expect(result.accounting.completedCalls).toBe(1);
      expect((await f.host.current()).digest).toBe(f.initial.digest);
      await expect(generateProposal(f.host, backend, factory)).rejects.toThrow();
      expect(calls).toBe(1);
  });
});
