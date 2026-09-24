import { describe, expect, test } from "bun:test";
import { applicationJson } from "../../src/application-contract";
import { MemoryApplicationStorage } from "../../src/application-storage";
import { digestCanonical, type Digest } from "../../src/digest";
import { MemoryStore } from "../../src/store-memory";
import { APPLICATION, MarketingCore } from "../malleable-site/core";
import { DEFAULT_CONFIG } from "../malleable-site/surface";
import { BrowserGrowController, ruleConfig, type GrowBundle } from "./controller";

const hash = (value: unknown): Digest => digestCanonical(applicationJson(value));
async function fixture(storage = new MemoryApplicationStorage()) {
  const controller = new BrowserGrowController(storage), capture = await controller.initialize();
  return { controller, capture, storage };
}

describe("pure browser evolution domain", () => {
  test("retains a strict improvement, survives owner restart, adopts and restores without losing signals", async () => {
    const f = await fixture(), initial = f.capture;
    const signaled = await f.controller.signal(initial.head, { kind: "audience", value: "operators" });
    const candidate = await f.controller.propose(signaled.head, { source: "rules" });
    expect(candidate.source).toBe("rules");
    expect(candidate.proposal.source).toBe("owner");
    expect(candidate.fit.after).toBe(4);
    expect(candidate.fit.after).toBeGreaterThan(candidate.fit.before);
    expect(candidate.shadow.report.cases).toHaveLength(4);
    expect(candidate.accepted).toBe(true);
    expect((await f.controller.capture()).head).toBe(signaled.head);
    const restarted = new BrowserGrowController(f.storage), recovered = await restarted.initialize();
    expect(recovered.pending?.reference).toBe(candidate.reference);
    const active = await restarted.adopt(recovered.head, candidate.reference);
    expect(active.definition.config).toEqual(ruleConfig(active.signals));
    expect(active.signals.audience).toBe("operators");
    const paused = await restarted.setControls(active.head, { ...active.controls, inferencePaused: true, modelActivationPaused: true });
    const restored = await restarted.restore(paused.head, initial.head);
    expect(restored.definition.config).toEqual(DEFAULT_CONFIG);
    expect(restored.signals).toEqual(active.signals);
    expect(restored.controls).toEqual(paused.controls);
    expect(restored.sequence).toBe(paused.sequence + 1);
    expect(restored.history.at(-1)?.kind).toBe("restore");
  });
  test("one candidate per captured state, ordered signals and stale admission keep the exact head", async () => {
    const f = await fixture(), candidate = await f.controller.propose(f.capture.head, { source: "rules" });
    await expect(f.controller.propose(f.capture.head, { source: "rules" })).rejects.toThrow("one retained proposal");
    const next = await f.controller.signal(f.capture.head, { kind: "release", value: "available" });
    expect(next.pending).toBeNull();
    await expect(f.controller.adopt(next.head, candidate.reference)).rejects.toThrow("earlier state");
    await expect(f.controller.signal(f.capture.head, { kind: "audience", value: "operators" })).rejects.toThrow("changed");
    const changed = await f.controller.signal(next.head, { kind: "audience", value: "operators" });
    expect((await f.controller.host.memoryDetails()).cursors[0]?.sequence).toBe(2);
    expect(changed.signals).toEqual({ audience: "operators", release: "available" });
    expect(changed.candidates).toHaveLength(1);
  });
  test("model values use the same parser, declared fit and independent shadow gates", async () => {
    const f = await fixture();
    await expect(f.controller.propose(f.capture.head, { source: "model", config: { ...DEFAULT_CONFIG, script: "alert(1)" }, rationale: "Untrusted" })).rejects.toThrow("Unknown");
    const candidate = await f.controller.propose(f.capture.head, { source: "model", config: { ...ruleConfig(f.capture.signals), body: "A preview with guaranteed safety." }, rationale: "An untrusted model suggestion." });
    expect(candidate.fit.after).toBe(4);
    expect(candidate.shadow.report.outcome).toBe("fail");
    expect(candidate.accepted).toBe(false);
    await expect(f.controller.adopt(f.capture.head, candidate.reference)).rejects.toThrow("guardrails");
    expect((await new BrowserGrowController(f.storage).capture()).pending?.proposal.rationale).toContain("untrusted");
  });
  test("unchanged model output is retained as inconclusive and never adopted", async () => {
    const f = await fixture(), candidate = await f.controller.propose(f.capture.head, { source: "model", config: f.capture.definition.config, rationale: "No change." });
    expect(candidate.shadow.report.outcome).toBe("inconclusive");
    expect(candidate.fit.strictlyImproves).toBe(false);
    await expect(f.controller.adopt(f.capture.head, candidate.reference)).rejects.toThrow("strictly improve");
    expect((await f.controller.capture()).head).toBe(f.capture.head);
  });
  test("pause and pin are durable controls that signals cannot clear", async () => {
    const f = await fixture();
    const paused = await f.controller.setControls(f.capture.head, { ...f.capture.controls, inferencePaused: true });
    await expect(f.controller.propose(paused.head, { source: "rules" })).rejects.toThrow("paused");
    const pinned = await f.controller.setControls(paused.head, { ...paused.controls, inferencePaused: false, pinnedRevision: paused.revisionDigest });
    const signaled = await f.controller.signal(pinned.head, { kind: "audience", value: "operators" });
    expect(signaled.controls).toEqual(pinned.controls);
    await expect(f.controller.propose(signaled.head, { source: "rules" })).rejects.toThrow("pinned");
    await expect(f.controller.setControls(signaled.head, { ...signaled.controls, pinnedRevision: hash("another revision") })).rejects.toThrow("Pin must name");
  });
  test("portable export verifies rejected and adopted candidates, imports only into a fresh workspace", async () => {
    const f = await fixture(), candidate = await f.controller.propose(f.capture.head, { source: "rules" });
    const active = await f.controller.adopt(f.capture.head, candidate.reference);
    const noChange = await f.controller.propose(active.head, { source: "model", config: active.definition.config, rationale: "An unchanged model result." });
    expect(noChange.accepted).toBe(false);
    const bundle = await f.controller.exportBundle();
    expect(await BrowserGrowController.verifyBundle(bundle)).toMatchObject({ ok: true, head: active.head, states: 2, candidates: 2 });
    const storage = new MemoryApplicationStorage(), imported = await BrowserGrowController.importBundle(storage, bundle), recovered = await imported.capture();
    expect(recovered.head).toBe(active.head);
    expect(recovered.pending?.reference).toBe(noChange.reference);
    expect(recovered.candidates[0]?.source).toBe("rules");
    await expect(BrowserGrowController.importBundle(storage, bundle)).rejects.toThrow("fresh");
    expect((await imported.capture()).head).toBe(active.head);
  });
  test("tampered, missing and fabricated evaluation records cannot be healed by replay or imported", async () => {
    const f = await fixture(), candidate = await f.controller.propose(f.capture.head, { source: "model", config: DEFAULT_CONFIG, rationale: "No change." });
    const bundle = await f.controller.exportBundle();
    const tampered = structuredClone(bundle); tampered.evidence.records[0]!.value = { tampered: true };
    await expect(BrowserGrowController.verifyBundle(tampered)).rejects.toThrow("tampered");
    const missing = structuredClone(bundle); missing.evidence.records = missing.evidence.records.filter(row => row.reference !== candidate.shadow.report.policy);
    await expect(BrowserGrowController.verifyBundle(missing)).rejects.toThrow();
    const forged = structuredClone(bundle), row = forged.evidence.records.find(item => item.reference === candidate.reference)!;
    row.value = applicationJson({ ...(row.value as object), accepted: true }); row.reference = hash(row.value); forged.journal.evaluations[0] = row.reference;
    await expect(BrowserGrowController.verifyBundle(forged)).rejects.toThrow("admission replay");
    const noJournal: GrowBundle = { ...bundle, journal: { contract: "algal.browser-grow-journal.v1", evaluations: [] } };
    await expect(BrowserGrowController.verifyBundle(noJournal)).rejects.toThrow("omits or invents");
    const fresh = new MemoryApplicationStorage();
    await expect(BrowserGrowController.importBundle(fresh, missing)).rejects.toThrow();
    expect(await fresh.readHead(APPLICATION)).toBeUndefined();
  });
  test("an adoption cannot lose its journal and a missing receipt stays missing after inspection", async () => {
    class MissingStore extends MemoryStore { denied: Digest | null = null; override async getReceipt(ref: Digest) { return ref === this.denied ? undefined : super.getReceipt(ref); } }
    const store = new MissingStore(), f = await fixture(new MemoryApplicationStorage(store)), candidate = await f.controller.propose(f.capture.head, { source: "rules" });
    await f.controller.adopt(f.capture.head, candidate.reference);
    const bundle = await f.controller.exportBundle(), stripped = { ...bundle, journal: { contract: "algal.browser-grow-journal.v1", evaluations: [] } };
    await expect(BrowserGrowController.verifyBundle(stripped)).rejects.toThrow("omits or invents");
    store.denied = candidate.shadow.report.cases[0]!.candidateReceipt;
    await expect(f.controller.capture()).rejects.toThrow("receipt");
    expect(await store.getReceipt(store.denied)).toBeUndefined();
  });
  test("reconciles only the exact retained default prepared genesis without healing missing evidence", async () => {
    class InterruptedStorage extends MemoryApplicationStorage {
      fail = true;
      override async writeHead(application: string, value: Parameters<MemoryApplicationStorage["writeHead"]>[1]) {
        if (this.fail) { this.fail = false; throw new Error("Interrupted before publishing genesis"); }
        return super.writeHead(application, value);
      }
    }
    const storage = new InterruptedStorage(), controller = new BrowserGrowController(storage);
    await expect(controller.initialize()).rejects.toThrow("uncertain");
    expect(await storage.readHead(APPLICATION)).toBeUndefined();
    expect(await storage.operationCount(APPLICATION)).toBe(1);
    const recovered = await new BrowserGrowController(storage).initialize();
    expect(recovered.sequence).toBe(0);
    expect(recovered.definition.config).toEqual(DEFAULT_CONFIG);
    expect(await storage.operationCount(APPLICATION)).toBe(1);

    const foreign = new InterruptedStorage();
    await foreign.store.setSlot("browser-grow-journal", { contract: "algal.browser-grow-journal.v1", evaluations: [] });
    await expect(new MarketingCore(foreign).initialize({ ...DEFAULT_CONFIG, headline: "A different prepared application." })).rejects.toThrow("uncertain");
    await expect(new BrowserGrowController(foreign).initialize()).rejects.toThrow("exact default");
    expect(await foreign.readHead(APPLICATION)).toBeUndefined();

    class MissingValue extends MemoryStore {
      denied: Digest | null = null;
      override async getValue(ref: Digest) { return ref === this.denied ? undefined : super.getValue(ref); }
    }
    const missing = new MissingValue(), damaged = new InterruptedStorage(missing);
    await expect(new BrowserGrowController(damaged).initialize()).rejects.toThrow("uncertain");
    const clean = await fixture();
    missing.denied = (await clean.controller.host.current()).revision.schema;
    await expect(new BrowserGrowController(damaged).initialize()).rejects.toThrow("missing retained evidence");
    expect(await damaged.readHead(APPLICATION)).toBeUndefined();
    expect(await missing.getValue(missing.denied)).toBeUndefined();
  });

  test("missing signal proofs and proposal indexes are rejected before reads or later writes can reconstruct them", async () => {
    class RepairableStore extends MemoryStore {
      missingReceipt: Digest | null = null;
      hideJournal = false;
      repaired = false;
      override async getReceipt(ref: Digest) { return ref === this.missingReceipt ? undefined : super.getReceipt(ref); }
      override async putReceipt(value: Parameters<MemoryStore["putReceipt"]>[0]) {
        const ref = await super.putReceipt(value);
        if (ref === this.missingReceipt) { this.repaired = true; this.missingReceipt = null; }
        return ref;
      }
      override async getSlot(name: string) { return this.hideJournal && name === "browser-grow-journal" ? undefined : super.getSlot(name); }
    }
    const store = new RepairableStore(), f = await fixture(new MemoryApplicationStorage(store));
    const signaled = await f.controller.signal(f.capture.head, { kind: "release", value: "available" });
    const state = await f.controller.host.current(), memory = await store.getValue(state.state.memory) as { receipt: Digest };
    store.missingReceipt = memory.receipt;
    await expect(f.controller.capture()).rejects.toThrow("receipt");
    await expect(f.controller.signal(signaled.head, { kind: "release", value: "available" })).rejects.toThrow("receipt");
    expect(store.repaired).toBe(false);
    expect((await f.controller.host.current()).digest).toBe(signaled.head);
    store.missingReceipt = null;
    store.hideJournal = true;
    await expect(new BrowserGrowController(f.storage).initialize()).rejects.toThrow("Missing retained browser evolution journal");
    expect((await f.controller.host.current()).digest).toBe(signaled.head);
  });

  test("portable archives use the archive byte bound, while each CAS record remains independently bounded", async () => {
    const f = await fixture(), bundle = await f.controller.exportBundle();
    for (let index = 0; index < 2; index++) {
      const value = { retained: index, text: "x".repeat(160_000) };
      bundle.evidence.records.push({ kind: "value", reference: hash(value), value });
    }
    expect(JSON.stringify(bundle).length).toBeGreaterThan(262_144);
    expect(await BrowserGrowController.verifyBundle(bundle)).toMatchObject({ ok: true, head: f.capture.head });
    const imported = await BrowserGrowController.importBundle(new MemoryApplicationStorage(), bundle);
    expect((await imported.capture()).head).toBe(f.capture.head);
  });

});
