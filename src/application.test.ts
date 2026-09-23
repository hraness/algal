import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, open, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService, applicationProcessName, type ApplicationAdmission, type ApplicationDispatchContext } from "./application";
import { digestCanonical, type Digest } from "./digest";
import { capabilityHandle } from "./capabilities";
import { parseOrganismManifest } from "./contract";
import { hostLease, hostRead, hostWrite } from "./host-state";
import type { JsonValue } from "./values";

const dirs: string[] = [];
type DispatchAdmissionContext = Parameters<NonNullable<ApplicationAdmission["admitDispatch"]>>[0];
const ref = (v: unknown) => digestCanonical(v as never);
async function fixture(options: {fault?: (point: "prepared" | "head-published" | "dispatch-started" | "dispatch-settled") => void} = {}) {
  const dir = await mkdtemp(join(tmpdir(), "algal-application-")); dirs.push(dir);
  const service = new ApplicationService(dir, {
    async admitCommit() {},
    async admitDispatch() { return {kind: "delivery" as const, recipient: capabilityHandle("mailbox-send", {fixture: true}), hostProfile: ref("profile")}; },
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
  const revision = {contract: "algal.application-revision.v1", application: "fixture", parent: null, schema, queries, views, runtimeProfile: runtime, evaluationPolicy: policy, capabilityRequirements: [], entrypoints: [{name: "run", manifest: manifestRef, applicability, maxGenerations: 1, capabilities: [], queries: [applicability]}]};
  const revisionRef = await service.store.putValue(revision);
  const memory = await service.store.putValue({contract: "algal.memory.fixture.v1", facts: []});
  return {service, revisionRef, memory};
}
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, {recursive: true, force: true}); });

describe("experimental application lifecycle", () => {
  test("quota denial of genesis does not reserve an application name", async () => {
    const {service, revisionRef, memory} = await fixture();
    await hostWrite(join(service.dir, ".application-quota", "ledger.json"), {contract: "algal.application-quota.v1", applications: [{application: "fixture", bytes: 256 * 1024 * 1024}]}, 8192);
    await expect(service.create({application: "fixture", operation: ref("quota-denied-create"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null})).rejects.toThrow("per-application");
    expect(await readdir(join(service.dir, "applications"))).toEqual([".creation"]);
    expect(await service.inspect("fixture")).toBeNull();
  });

  test("quota exhaustion after live dispatch preserves started evidence and never automatically repeats", async () => {
    const {service, revisionRef, memory} = await fixture(), message = await service.store.putValue({payload: true});
    const initial = await service.create({application: "fixture", operation: ref("quota-live"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [{kind: "deliver", route: "inbox", message}], evidence: [], causedBy: null});
    let calls = 0;
    const dispatcher = {configurationDigest: ref("quota-dispatcher"), async dispatch(context: ApplicationDispatchContext) {
      calls++;
      await hostWrite(join(service.dir, ".application-quota", "ledger.json"), {contract: "algal.application-quota.v1", applications: [{application: "fixture", bytes: 256 * 1024 * 1024}]}, 8192, false);
      return {status: "settled", result: {kind: "delivery", message, idempotencyKey: context.dispatch.identity}};
    }};
    await expect(service.dispatchPending("fixture", dispatcher)).rejects.toThrow("per-application");
    const retained = await hostRead(join(service.dir, "applications", "fixture", "outbox", initial.transition.intents[0]!.slice(7) + ".json"), 262144);
    expect((retained as Record<string, JsonValue>).status).toBe("started");
    expect((await service.dispatchPending("fixture", dispatcher))[0]!.status).toBe("started");
    expect(calls).toBe(1);
    expect((await service.inspect("fixture"))!.digest).toBe(initial.digest);
  });

  test("namespace quota rejects new publication while preserving inspection and committed idempotence", async () => {
    const {service, revisionRef, memory} = await fixture();
    const command = {application: "fixture", operation: ref("quota-create"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    const initial = await service.create(command);
    const file = await open(join(service.dir, "applications", "fixture", "orphan"), "w");
    try { await file.truncate(256 * 1024 * 1024); } finally { await file.close(); }
    await expect(service.commit({...command, kind: "memory", expectedHead: initial.digest, operation: ref("quota-next")})).rejects.toThrow("per-application");
    expect((await service.inspect("fixture"))!.digest).toBe(initial.digest);
    expect((await service.create(command)).digest).toBe(initial.digest);
    expect((await service.history("fixture")).length).toBe(1);
  });
  test("rejected first commits and unknown dispatches do not reserve application capacity", async () => {
    const {service, revisionRef, memory} = await fixture();
    const base = {application: "fixture", operation: ref("valid-create"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    for (let i = 0; i < 40; i++) {
      await expect(service.create({...base, application: `rejected-${i}`, revision: ref("missing")})).rejects.toThrow();
      expect(await service.dispatchPending(`unknown-${i}`, {configurationDigest: ref("unused"), async dispatch() { throw new Error("must not dispatch"); }})).toEqual([]);
    }
    const rejecting = new ApplicationService(service.dir, {async admitCommit() { throw new Error("host denied genesis"); }});
    await expect(rejecting.create(base)).rejects.toThrow("host denied genesis");
    expect(await readdir(join(service.dir, "applications"))).toEqual([".creation"]);
    expect((await service.create(base)).state.sequence).toBe(0);
  });

  test("first publication retains creation custody and the admitted application bound", async () => {
    const {service, revisionRef, memory} = await fixture();
    const base = {application: "fixture", operation: ref("concurrent-create"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    let release!: () => void, entered!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const admitted = new Promise<void>(resolve => { entered = resolve; });
    const paused = new ApplicationService(service.dir, {async admitCommit() { entered(); await waiting; }});
    const first = paused.create(base);
    await admitted;
    try {
      expect(await readdir(join(service.dir, "applications"))).toEqual([".creation"]);
      await expect(service.create(base)).rejects.toThrow("held by another live operation");
    } finally { release(); }
    const initial = await first;
    expect((await service.create(base)).digest).toBe(initial.digest);
    const revision = await service.store.getValue(revisionRef) as Record<string, JsonValue>;
    for (let i = 1; i < 32; i++) {
      const application = `admitted-${i}`, selected = await service.store.putValue({...revision, application});
      await service.create({...base, application, revision: selected, operation: ref(application)});
    }
    await expect(service.create({...base, application: "overflow"})).rejects.toThrow("Application count exhausted");
    expect((await service.inspect("fixture"))!.digest).toBe(initial.digest);
  });

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
    expect((await service.create(command)).digest).toBe(committed!.digest);
  });

  test("persists intents before the head and never dispatches an orphan after a prepared crash", async () => {
    let failPrepared = false;
    const {service, revisionRef, memory} = await fixture({fault: point => {
      if (point === "prepared" && failPrepared) { failPrepared = false; throw new Error("prepared crash"); }
    }});
    const genesis = {application: "fixture", operation: ref("create-delivery"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    // The fault is consumed by the following transition, leaving its objects unreachable.
    await service.create(genesis);
    failPrepared = true;
    const message = await service.store.putValue({contract: "algal.message.fixture.v1", value: "hello"});
    const command: Record<string, unknown> = {application: "fixture", operation: ref("delivery-1"), kind: "investigate", expectedHead: null, revision: revisionRef, memory,
      intents: [{kind: "deliver", route: "inbox", message}], evidence: [], causedBy: null};
    command.expectedHead = (await service.inspect("fixture"))!.digest;
    await expect(service.commit(command)).rejects.toThrow("prepared crash");
    expect((await service.inspect("fixture"))?.state.sequence).toBe(0);
    let calls = 0;
    const dispatcher = {configurationDigest: ref("dispatcher-v1"), async dispatch() { calls++; return {status: "settled", result: {kind: "delivery", message: ref("mailbox-message"), idempotencyKey: ref("unused")}}; }};
    // A prepared transition is not reachable from a head and therefore cannot run.
    expect(await service.dispatchPending("fixture", dispatcher)).toEqual([]);
    expect(calls).toBe(0);
  });

  test("settles one delivery and does not duplicate it after restart", async () => {
    const {service, revisionRef, memory} = await fixture();
    await service.create({application: "fixture", operation: ref("create-delivery"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null});
    const message = await service.store.putValue({contract: "algal.message.fixture.v1", value: "hello"});
    await service.commit({application: "fixture", operation: ref("delivery-2"), kind: "investigate", expectedHead: (await service.inspect("fixture"))!.digest, revision: revisionRef, memory, intents: [{kind: "deliver", route: "inbox", message}], evidence: [], causedBy: null});
    let calls = 0;
    const dispatcher = {configurationDigest: ref("dispatcher-v2"), async dispatch(context: ApplicationDispatchContext) {
      calls++;
      if (context.intent.kind !== "deliver") throw new Error("expected delivery intent");
      return {status: "settled", result: {kind: "delivery", message: context.intent.message, idempotencyKey: context.dispatch.identity}};
    }};
    const first = await service.dispatchPending("fixture", dispatcher);
    expect(first[0]?.status).toBe("settled");
    expect(calls).toBe(1);
    expect(await service.dispatchPending("fixture", dispatcher)).toEqual([]);
    expect(calls).toBe(1);
  });

  test("rejects a delivery settlement for a different message", async () => {
    const {service, revisionRef, memory} = await fixture();
    await service.create({application: "fixture", operation: ref("create-message-binding"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null});
    const message = await service.store.putValue({contract: "algal.message.fixture.v1", value: "bound"});
    await service.commit({application: "fixture", operation: ref("delivery-message-binding"), kind: "investigate", expectedHead: (await service.inspect("fixture"))!.digest, revision: revisionRef, memory, intents: [{kind: "deliver", route: "inbox", message}], evidence: [], causedBy: null});
    const dispatcher = {configurationDigest: ref("dispatcher-message-binding"), async dispatch(context: {dispatch: {identity: Digest}}) {
      return {status: "settled", result: {kind: "delivery", message: ref("wrong-message"), idempotencyKey: context.dispatch.identity}};
    }};
    const [record] = await service.dispatchPending("fixture", dispatcher);
    expect(record?.status).toBe("uncertain");
  });

  test("rejects arbitrary success output and requires explicit reconciliation for uncertainty", async () => {
    const {service, revisionRef, memory} = await fixture();
    await service.create({application: "fixture", operation: ref("create-uncertain"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null});
    const message = await service.store.putValue({contract: "algal.message.fixture.v1", value: "opaque"});
    await service.commit({application: "fixture", operation: ref("delivery-uncertain"), kind: "investigate", expectedHead: (await service.inspect("fixture"))!.digest, revision: revisionRef, memory, intents: [{kind: "deliver", route: "inbox", message}], evidence: [], causedBy: null});
    const dispatcher = {configurationDigest: ref("dispatcher-v3"), async dispatch() { return {status: "settled", result: {ok: true}}; }};
    const [record] = await service.dispatchPending("fixture", dispatcher);
    expect(record?.status).toBe("uncertain");
    await expect(service.reconcileDispatch("fixture", record!.intent, dispatcher)).rejects.toThrow("Explicit dispatcher reconciliation");
  });

  test("does not let an old external-writer episode cross a memory fence", async () => {
    const {service, revisionRef, memory} = await fixture();
    const first = await service.create({application: "fixture", operation: ref("create-writer"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null});
    const input = await service.store.putValue({contract: "algal.input.fixture.v1"});
    await service.commit({application: "fixture", operation: ref("episode-writer"), kind: "investigate", expectedHead: first.digest, revision: revisionRef, memory,
      intents: [{kind: "start-episode", entrypoint: "run", input}], evidence: [], causedBy: null});
    const newerMemory = await service.store.putValue({contract: "algal.memory.fixture.v1", facts: ["new"]});
    const current = (await service.inspect("fixture"))!;
    await service.commit({application: "fixture", operation: ref("memory-writer"), kind: "memory", expectedHead: current.digest, revision: revisionRef, memory: newerMemory, intents: [], evidence: [], causedBy: null});
    const history = await service.history("fixture");
    const oldEpisode = history[1]!;
    const intent = oldEpisode.transition.intents[0]!;
    const revisionValue = await service.store.getValue(revisionRef) as {entrypoints: {manifest: Digest}[]};
    const dispatcher = {configurationDigest: ref("dispatcher-v4"), async dispatch() { return {status: "settled", result: {kind: "episode", binding: ref("x"), process: "x"}}; }};
    const admitting = new ApplicationService(service.dir, {
      async admitCommit() {},
      async admitDispatch(context: DispatchAdmissionContext) {
        return {kind: "episode" as const, binding: {contract: "algal.application-episode.v1" as const, application: "fixture", intent, sourceState: context.snapshot.digest, revision: revisionRef, memory, epoch: 0, entrypoint: "run", manifest: revisionValue.entrypoints[0]!.manifest, arguments: input, process: applicationProcessName("fixture", intent), maxGenerations: 1, hostProfile: ref("profile"), access: "external-write" as const}};
      },
    });
    // This service has a fresh admission object but the same durable state; the binding is intentionally stale.
    expect((await admitting.dispatchPending("fixture", dispatcher))[0]).toMatchObject({ status: "denied", reason: "Stale episode cannot acquire an external writer" });
  });

  test("an admitted writer reconciles its exact old effect after memory advances", async () => {
    const {service, revisionRef, memory} = await fixture();
    const input = await service.store.putValue("writer-input");
    let changePlan = false, dispatches = 0, reconciliations = 0;
    const admitted = new ApplicationService(service.dir, {
      async admitCommit() {},
      async admitDispatch(context) {
        if (context.previousDispatch) {
          const plan = context.previousDispatch.plan;
          return changePlan && plan.kind === "episode" ? { ...plan, binding: { ...plan.binding, hostProfile: ref("changed-host") } } : plan;
        }
        const intent = ref(context.intent), entry = context.snapshot.revision.entrypoints[0]!;
        return {kind: "episode", binding: {contract: "algal.application-episode.v1", application: "fixture", intent,
          sourceState: context.snapshot.digest, revision: revisionRef, memory, epoch: 0, entrypoint: "run", manifest: entry.manifest,
          arguments: input, process: applicationProcessName("fixture", intent), maxGenerations: 1, hostProfile: ref("profile"), access: "external-write"}};
      },
    });
    const head = await admitted.create({application: "fixture", operation: ref("writer-create"), kind: "create", expectedHead: null,
      revision: revisionRef, memory, intents: [{kind: "start-episode", entrypoint: "run", input}], evidence: [], causedBy: null});
    const dispatcher = {
      configurationDigest: ref("writer-dispatcher"),
      async dispatch() { dispatches++; return {status: "uncertain", reason: "lost acknowledgement"}; },
      async reconcile(context: ApplicationDispatchContext) {
        reconciliations++;
        if (context.dispatch.plan.kind !== "episode") throw new Error("wrong plan");
        return {status: "settled", result: {kind: "episode", binding: ref(context.dispatch.plan.binding), process: context.dispatch.plan.binding.process}};
      },
    };
    const [started] = await admitted.dispatchPending("fixture", dispatcher);
    if (!started || started.status === "denied") throw new Error("writer not admitted");
    await admitted.commit({application: "fixture", operation: ref("writer-memory"), kind: "memory", expectedHead: head.digest, revision: revisionRef,
      memory: await service.store.putValue("new-memory"), intents: [], evidence: [], causedBy: null});
    changePlan = true;
    await expect(admitted.reconcileDispatch("fixture", started.intent, dispatcher)).rejects.toThrow("cannot change");
    expect(reconciliations).toBe(0);
    changePlan = false;
    const settled = await admitted.reconcileDispatch("fixture", started.intent, dispatcher);
    expect(settled.status).toBe("settled");
    expect(settled.identity).toBe(started.identity);
    expect(dispatches).toBe(1);
    expect(reconciliations).toBe(1);
  });

  test("denied and retained blocked work cannot starve a later delivery at max one", async () => {
    const {service, revisionRef, memory} = await fixture();
    const message = await service.store.putValue("fairness");
    const admitting = new ApplicationService(service.dir, {
      async admitCommit() {},
      async admitDispatch({intent}) {
        if (intent.kind !== "deliver" || intent.route === "denied") throw new Error("Route denied by fixture");
        return {kind: "delivery", recipient: capabilityHandle("mailbox-send", {fixture: true}), hostProfile: ref("profile")};
      },
    });
    await admitting.create({application: "fixture", operation: ref("fairness"), kind: "create", expectedHead: null, revision: revisionRef, memory,
      intents: ["denied", "blocked", "eligible"].map(route => ({kind: "deliver", route, message})), evidence: [], causedBy: null});
    const calls: string[] = [];
    const dispatcher = {configurationDigest: ref("fairness-dispatcher"), async dispatch(context: ApplicationDispatchContext) {
      if (context.intent.kind !== "deliver") throw new Error("Unexpected work");
      calls.push(context.intent.route);
      return context.intent.route === "blocked" ? {status: "blocked", reason: "Needs explicit reconciliation"}
        : {status: "settled", result: {kind: "delivery", message, idempotencyKey: context.dispatch.identity}};
    }};
    expect((await admitting.dispatchPending("fixture", dispatcher, 1)).map(row => row.status)).toEqual(["denied", "blocked"]);
    expect((await admitting.dispatchPending("fixture", dispatcher, 1)).map(row => row.status)).toEqual(["denied", "blocked", "settled"]);
    expect(calls).toEqual(["blocked", "eligible"]);
    expect((await admitting.dispatchPending("fixture", dispatcher, 1)).map(row => row.status)).toEqual(["denied", "blocked"]);
    expect(calls).toEqual(["blocked", "eligible"]);
  });
});

describe("application custody robustness", () => {
  test("stray regular files in applications/ and operations/ never brick custody; symlinks still do", async () => {
    const {service, revisionRef, memory} = await fixture();
    const applications = join(service.dir, "applications");
    await mkdir(applications, {recursive: true});
    await writeFile(join(applications, ".DS_Store"), "finder residue");
    await writeFile(join(applications, "stray.txt"), "not an application");
    const base = {application: "fixture", operation: ref("stray-create"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    const initial = await service.create(base);
    await writeFile(join(service.dir, "applications", "fixture", "operations", "README"), "operator note");
    const message = await service.store.putValue({contract: "algal.message.fixture.v1", value: "stray"});
    const next = await service.commit({...base, operation: ref("stray-delivery"), kind: "investigate", expectedHead: initial.digest, intents: [{kind: "deliver", route: "inbox", message}]});
    expect(next.state.sequence).toBe(1);
    const dispatcher = {configurationDigest: ref("stray-dispatcher"), async dispatch(context: ApplicationDispatchContext) {
      if (context.intent.kind !== "deliver") throw new Error("expected delivery intent");
      return {status: "settled", result: {kind: "delivery", message: context.intent.message, idempotencyKey: context.dispatch.identity}};
    }};
    expect((await service.dispatchPending("fixture", dispatcher)).map(row => row.status)).toEqual(["settled"]);
    expect((await service.create(base)).digest).toBe(initial.digest);
    await symlink(join(service.dir, "values"), join(applications, "linked"));
    await expect(service.inspect("fixture")).resolves.toBeTruthy(); // inspection scans no siblings
    await expect(service.commit({...base, operation: ref("after-symlink"), kind: "memory", expectedHead: next.digest})).rejects.toThrow("Invalid application directory");
  });

  test("a removed operation record cannot let the same operation commit twice", async () => {
    const {service, revisionRef, memory} = await fixture();
    const base = {application: "fixture", operation: ref("dup-create"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    const initial = await service.create(base);
    const operation = ref("dup-memory"), nextMemory = await service.store.putValue({contract: "algal.memory.fixture.v1", facts: ["dup"]});
    const advanced = await service.commit({...base, operation, kind: "memory", expectedHead: initial.digest, memory: nextMemory});
    await rm(join(service.dir, "applications", "fixture", "operations", operation.slice(7) + ".json"));
    for (const retry of [{...base, operation, kind: "memory", expectedHead: initial.digest, memory: nextMemory}, {...base, operation, kind: "memory", expectedHead: advanced.digest, memory}]) {
      await expect(service.commit(retry)).rejects.toThrow("Operation already committed in application history");
    }
    expect((await service.history("fixture")).map(row => row.transition.operation)).toEqual([base.operation, operation]);
    expect((await service.inspect("fixture"))!.digest).toBe(advanced.digest);
  });

  test("shared creation and quota leases wait out a briefly held owner instead of failing", async () => {
    const {service, revisionRef, memory} = await fixture();
    const base = {application: "fixture", operation: ref("waited-create"), kind: "create", expectedHead: null, revision: revisionRef, memory, intents: [], evidence: [], causedBy: null};
    const hold = async (directory: string, name: string) => {
      let released!: () => void, acquired!: () => void;
      const held = new Promise<void>(resolve => { released = resolve; });
      const owned = new Promise<void>(resolve => { acquired = resolve; });
      const holder = hostLease(directory, name, () => { acquired(); return held; });
      await owned; // the contender must start against a live owner
      return {release: released, holder};
    };
    const started = Date.now();
    const creation = await hold(join(service.dir, "applications", ".creation"), "application-creation");
    const creating = service.create(base);
    setTimeout(creation.release, 300);
    const initial = await creating;
    await creation.holder;
    expect(initial.state.sequence).toBe(0);
    expect(Date.now() - started).toBeGreaterThanOrEqual(300);
    const quota = await hold(join(service.dir, ".application-quota"), "application-quota");
    const committing = service.commit({...base, operation: ref("waited-memory"), kind: "memory", expectedHead: initial.digest, memory: await service.store.putValue({contract: "algal.memory.fixture.v1", facts: ["waited"]})});
    setTimeout(quota.release, 300);
    expect((await committing).state.sequence).toBe(1);
    await quota.holder;
  });
});
