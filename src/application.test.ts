import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService } from "./application";
import { digestCanonical } from "./digest";
import { manifestToJson, parseOrganismManifest } from "./contract";

const dirs: string[] = [];
const ref = (v: unknown) => digestCanonical(v as never);
async function fixture(options: {fault?: (point: "prepared" | "head-published" | "dispatch-started" | "dispatch-settled") => void} = {}) {
  const dir = await mkdtemp(join(tmpdir(), "algal-application-")); dirs.push(dir);
  const service = new ApplicationService(dir, {
    async admitCommit() {},
    async admitDispatch() { throw new Error("not used"); },
  }, options);
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:application-fixture", name: "Application fixture",
    cells: [{id: "out", kind: "const", outputs: {value: {type: "json", value: "ok"}}}], edges: [],
  });
  const manifestRef = await service.store.putManifest(manifest);
  const schema = await service.store.putValue({contract: "algal.schema.fixture.v1"});
  const queries = await service.store.putValue({contract: "algal.queries.fixture.v1"});
  const views = await service.store.putValue({contract: "algal.views.fixture.v1"});
  const runtime = await service.store.putValue({contract: "algal.runtime.fixture.v1"});
  const policy = await service.store.putValue({contract: "algal.policy.fixture.v1"});
  const applicability = await service.store.putValue({contract: "algal.query.fixture.v1"});
  const revision = {contract: "algal.application-revision.v1", application: "fixture", parent: null, schema, queries, views, runtimeProfile: runtime, evaluationPolicy: policy, capabilityRequirements: [], entrypoints: [{name: "run", manifest: manifestRef, applicability, maxGenerations: 1}]};
  const revisionRef = await service.store.putValue(revision);
  const memory = await service.store.putValue({contract: "algal.memory.fixture.v1", facts: []});
  return {service, revisionRef, memory};
}
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, {recursive: true, force: true}); });

describe("experimental application lifecycle", () => {
  test("publishes a genesis state and makes the exact operation idempotent", async () => {
    const {service, revisionRef, memory} = await fixture();
    const command = {application: "fixture", operation: ref("create-1"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    const first = await service.create(command), second = await service.create(command);
    expect(second.digest).toBe(first.digest);
    expect((await service.history("fixture")).map(row => row.state.sequence)).toEqual([0]);
    expect((await service.inspect("fixture"))?.state.epoch).toBe(0);
  });
  test("rejects a stale writer and preserves the current head", async () => {
    const {service, revisionRef, memory} = await fixture();
    const first = await service.create({application: "fixture", operation: ref("create-2"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null});
    const nextMemory = await service.store.putValue({contract: "algal.memory.fixture.v1", facts: ["new"]});
    const advance = await service.commit({application: "fixture", operation: ref("memory-1"), kind: "memory", expectedHead: first.digest, revision: revisionRef, memory: nextMemory, intents: [], evidence: [], causedBy: null});
    await expect(service.commit({application: "fixture", operation: ref("stale"), kind: "memory", expectedHead: first.digest, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null})).rejects.toThrow("Stale application head");
    expect((await service.inspect("fixture"))?.digest).toBe(advance.digest);
  });
  test("retains an uncertain head publication for exact operation reconciliation", async () => {
    const {service, revisionRef, memory} = await fixture({fault: point => { if (point === "head-published") throw new Error("simulated lost acknowledgement"); }});
    const command = {application: "fixture", operation: ref("uncertain-1"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    await expect(service.create(command)).rejects.toMatchObject({uncertain: true});
    const committed = await service.inspect("fixture");
    expect(committed?.state.sequence).toBe(0);
    // The same operation is read back from the durable head; no second state is created.
    expect((await service.create(command)).digest).toBe(committed?.digest);
  });
});
