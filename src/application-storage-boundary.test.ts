import { expect } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationCore, type ApplicationAdmission, type ApplicationCommand } from "./application-core";
import { applicationJson } from "./application-contract";
import { FileApplicationStorage } from "./application-filesystem";
import { MemoryApplicationStorage, type ApplicationStorage } from "./application-storage";
import { parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { applicationTests } from "./fixtures/application-test-scope";
import { MemoryStore } from "./store-memory";
import { FileStore } from "./store";
import type { JsonValue } from "./values";

const { test, resources } = applicationTests();
const hash = (value: unknown) => digestCanonical(applicationJson(value));
const allow: ApplicationAdmission = { async admitCommit() {} };
type Backend = "memory" | "filesystem";
type Cut = { at: "custody" | "publication" | "head"; when: "before" | "after" };

/** Real storage callbacks still execute and settle; this wrapper injects only
 * a failed boundary acknowledgement, never rolls back a published record. */
class InterruptedStorage implements ApplicationStorage {
  readonly store: ApplicationStorage["store"];
  enabled = true;
  headAttempts = 0;
  readonly cause = new AlgalError("IO_FAILED", "fixture storage boundary failed", { fixture: "storage-boundary" });
  constructor(readonly base: ApplicationStorage, readonly cut: Cut) { this.store = base.store; }
  private fail(at: Cut["at"], when: Cut["when"]): void {
    if (this.enabled && this.cut.at === at && this.cut.when === when) throw this.cause;
  }
  readHead(application: string) { return this.base.readHead(application); }
  readOperation(application: string, operation: Digest) { return this.base.readOperation(application, operation); }
  readDispatch(application: string, intent: Digest) { return this.base.readDispatch(application, intent); }
  operationCount(application: string) { return this.base.operationCount(application); }
  async writeHead(application: string, value: JsonValue): Promise<void> {
    this.headAttempts++;
    this.fail("head", "before");
    await this.base.writeHead(application, value);
    this.fail("head", "after");
  }
  writeOperation(application: string, operation: Digest, value: JsonValue) { return this.base.writeOperation(application, operation, value); }
  writeDispatch(application: string, intent: Digest, value: JsonValue, immutable: boolean) { return this.base.writeDispatch(application, intent, value, immutable); }
  async custody<T>(application: string, creating: boolean, action: () => Promise<T>): Promise<T> {
    this.fail("custody", "before");
    const result = await this.base.custody(application, creating, action);
    this.fail("custody", "after");
    return result;
  }
  async publication<T>(application: string, writes: JsonValue[], action: () => Promise<T>): Promise<T> {
    this.fail("publication", "before");
    const result = await this.base.publication(application, writes, action);
    this.fail("publication", "after");
    return result;
  }
}

async function storage(kind: Backend): Promise<ApplicationStorage> {
  if (kind === "memory") return new MemoryApplicationStorage();
  const root = resources().directory(await mkdtemp(join(tmpdir(), "algal-storage-boundary-")));
  return new FileApplicationStorage(root);
}
function reopened(adapter: ApplicationStorage): ApplicationStorage {
  // A new filesystem adapter must recover persisted records. The memory
  // reference deliberately promises restart only while the adapter is retained.
  return adapter instanceof FileApplicationStorage ? new FileApplicationStorage(adapter.dir) : adapter;
}
async function fixture(adapter: ApplicationStorage) {
  const store = adapter.store;
  const manifest = await store.putManifest(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:storage-boundary", name: "Storage boundary", cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [] }));
  const value = await store.putValue({ fixture: "storage-boundary" });
  const revisionValue = { contract: "algal.application-revision.v1", application: "boundary", parent: null, schema: value, queries: value, views: value, runtimeProfile: value, evaluationPolicy: value, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: value, maxGenerations: 1, capabilities: [], queries: [value] }] };
  const revision = await store.putValue(applicationJson(revisionValue)), memory = await store.putValue({ facts: [] });
  const command: ApplicationCommand = { application: "boundary", operation: hash("storage-create"), kind: "create", expectedHead: null, revision, memory, intents: [], evidence: [], causedBy: null };
  return { command, revisionValue };
}
const uncertain = (operation: Digest) => ({
  name: "AlgalError", code: "IO_FAILED", uncertain: true,
  message: "Application commit acknowledgment uncertain; inspect the exact operation", details: { operation },
});

for (const kind of ["memory", "filesystem"] as const) {
  for (const at of ["custody", "publication"] as const) {
    test(`${kind}: ${at} release after a published head keeps the exact operation uncertain and replayable`, async () => {
      const adapter = await storage(kind), { command } = await fixture(adapter);
      const interrupted = new InterruptedStorage(adapter, { at, when: "after" });
      await expect(new ApplicationCore(interrupted, allow).create(command)).rejects.toMatchObject(uncertain(command.operation));
      expect(interrupted.headAttempts).toBe(1);
      const retainedHead = await adapter.readHead(command.application);
      const retainedOperation = await adapter.readOperation(command.application, command.operation);
      const owner = new ApplicationCore(reopened(adapter), allow);
      const selected = await owner.inspect(command.application);
      expect(selected).not.toBeNull();
      if (selected === null) throw new Error("Published head was not retained");
      expect(selected.state.sequence).toBe(0);
      expect(selected.transition.operation).toBe(command.operation);
      expect(await owner.create(command)).toEqual(selected);
      expect((await owner.history(command.application)).map(row => row.digest)).toEqual([selected.digest]);
      expect(await adapter.operationCount(command.application)).toBe(1);
      expect(await adapter.readHead(command.application)).toEqual(retainedHead);
      expect(await adapter.readOperation(command.application, command.operation)).toEqual(retainedOperation);
    });

    test(`${kind}: ${at} refusal before any head attempt preserves the original known failure`, async () => {
      const adapter = await storage(kind), { command } = await fixture(adapter);
      const interrupted = new InterruptedStorage(adapter, { at, when: "before" });
      await expect(new ApplicationCore(interrupted, allow).create(command)).rejects.toBe(interrupted.cause);
      expect(interrupted.cause.uncertain).toBe(false);
      expect(interrupted.headAttempts).toBe(0);
      expect(await adapter.readHead(command.application)).toBeUndefined();
      expect(await adapter.readOperation(command.application, command.operation)).toBeUndefined();
      expect(await adapter.operationCount(command.application)).toBe(0);
      interrupted.enabled = false;
      expect((await new ApplicationCore(interrupted, allow).create(command)).state.sequence).toBe(0);
    });
  }

  test(`${kind}: a failed head-write attempt is conservatively uncertain and resumes its prepared operation`, async () => {
    const adapter = await storage(kind), { command } = await fixture(adapter);
    const interrupted = new InterruptedStorage(adapter, { at: "head", when: "before" });
    const service = new ApplicationCore(interrupted, allow);
    await expect(service.create(command)).rejects.toMatchObject(uncertain(command.operation));
    expect(interrupted.headAttempts).toBe(1);
    expect(await adapter.readHead(command.application)).toBeUndefined();
    const prepared = await adapter.readOperation(command.application, command.operation);
    expect(prepared).toBeDefined();
    expect(await adapter.operationCount(command.application)).toBe(1);
    interrupted.enabled = false;
    const resumed = await service.create(command);
    expect(resumed.state.sequence).toBe(0);
    expect(await adapter.readOperation(command.application, command.operation)).toEqual(prepared);
    expect((await service.history(command.application)).map(row => row.digest)).toEqual([resumed.digest]);
  });

  test(`${kind}: a release error during exact committed replay does not invent a new uncertain write`, async () => {
    const adapter = await storage(kind), { command } = await fixture(adapter);
    const committed = await new ApplicationCore(adapter, allow).create(command);
    const interrupted = new InterruptedStorage(adapter, { at: "custody", when: "after" });
    let admissions = 0;
    const refusing: ApplicationAdmission = { async admitCommit() { admissions++; throw new Error("fresh admission must not run"); } };
    await expect(new ApplicationCore(interrupted, refusing).create(command)).rejects.toBe(interrupted.cause);
    expect(interrupted.cause.uncertain).toBe(false);
    expect(interrupted.headAttempts).toBe(0);
    expect(admissions).toBe(0);
    const owner = new ApplicationCore(reopened(adapter), refusing);
    expect(await owner.create(command)).toEqual(committed);
    expect((await owner.history(command.application)).map(row => row.digest)).toEqual([committed.digest]);
    expect(await adapter.operationCount(command.application)).toBe(1);
  });
}

class SubstitutedStore extends MemoryStore {
  substitution: { ref: Digest; value: JsonValue } | undefined;
  override async getValue(ref: Digest): Promise<JsonValue | undefined> {
    if (this.substitution?.ref === ref) return structuredClone(this.substitution.value);
    return super.getValue(ref);
  }
}
class SubstitutedFileStore extends FileStore {
  substitution: { ref: Digest; value: JsonValue } | undefined;
  override async getValue(ref: Digest): Promise<JsonValue | undefined> {
    if (this.substitution?.ref === ref) return structuredClone(this.substitution.value);
    return super.getValue(ref);
  }
}
async function substitutedStore(kind: Backend): Promise<SubstitutedStore | SubstitutedFileStore> {
  if (kind === "memory") return new SubstitutedStore();
  const root = resources().directory(await mkdtemp(join(tmpdir(), "algal-store-subclass-")));
  return new SubstitutedFileStore(root);
}
for (const kind of ["memory", "filesystem"] as const) for (const target of ["revision", "memory"] as const) {
  test(`${kind} Store subclass: injected ${target} digest mismatch is refused before admission or application publication`, async () => {
    // The injected CAS may be a FileStore subclass while the host namespace is
    // portable. A Store class identity must never bypass application admission.
    const store = await substitutedStore(kind), adapter = new MemoryApplicationStorage(store);
    const { command, revisionValue } = await fixture(adapter);
    store.substitution = { ref: command[target], value: target === "revision"
      ? applicationJson({ ...revisionValue, views: await store.putValue({ changed: "view" }) })
      : { facts: ["substituted"] } };
    let admissions = 0;
    const service = new ApplicationCore(adapter, { async admitCommit() { admissions++; } });
    await expect(service.create(command)).rejects.toMatchObject({ code: "DIGEST_MISMATCH", uncertain: false });
    expect(admissions).toBe(0);
    expect(await adapter.readHead(command.application)).toBeUndefined();
    expect(await adapter.readOperation(command.application, command.operation)).toBeUndefined();
    expect(await adapter.operationCount(command.application)).toBe(0);
    store.substitution = undefined;
    expect((await service.create(command)).state.sequence).toBe(0);
    expect(admissions).toBe(1);
  });
}
