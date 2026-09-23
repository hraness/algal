import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService, type ApplicationDispatch } from "./application";
import { createApplicationPolicyHost } from "./application-host";
import {
  applicationJson, getApplicationRecord, parseWorkIntent, putApplicationRecord,
} from "./application-contract";
import {
  interappMessageRecord, mintInterappMessage, parseInterappMessage,
  verifyInterappDelivery, verifyInterappMessage,
} from "./application-message";
import { capabilityHandle } from "./capabilities";
import { digestCanonical, type Digest } from "./digest";
import { APPLICATION_MEMORY_NATIVE_LIMITS } from "./application-memory";
import { parseOrganismManifest } from "./contract";
import { FileStore } from "./store";
import type { JsonValue } from "./values";

const directories: string[] = [];
afterEach(async () => { for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });
const hash = (value: unknown) => digestCanonical(value as JsonValue);

// Same durable fixture shape as application-host.test.ts: a policy host that
// admits the `inbox` route and settles deliveries through a real channel.
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "algal-interapp-message-")); directories.push(dir);
  const store = new FileStore(dir), put = (v: unknown) => store.putValue(v as JsonValue);
  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "applicable", schema, program, procedures: [], polarityColumn: 1, conflict: "single-value" });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await put({ contract: "algal.application-view-spec.v1", title: "Fixture", widgets: ["procedures"] });
  const runtimeProfile = await put({ contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" });
  const evaluationPolicy = await put({ contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 1_000_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true });
  const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: "fixture", previous: null, sequence: 0, mutation: null, status: "settled" });
  const attestation = await put({ contract: "algal.fixture-attestation.v1" });
  const scope = await put({ contract: "algal.application-memory-scope.v1", application: "fixture", environment: "fixture", task: "fixture", frontier, bindings: [], completeFor: [], attestation });
  const memoryBody = { contract: "algal.application-memory.v1", application: "fixture", schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] };
  const memory = await put(memoryBody);
  const manifest = await store.putManifest(parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:message-fixture", name: "fixture",
    cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [],
  }));
  const body = { contract: "algal.application-revision.v1", application: "fixture", parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }] };
  const revision = await put(body);
  const recipient = capabilityHandle("mailbox-send", { route: "inbox" });
  const policy = { contract: "algal.application-host.v1", application: "fixture", frontier, hostProfile: hash("profile"), episodeAccess: "observe", routes: [{ route: "inbox", recipient, hostProfile: hash("profile") }], attestation: "algal.fixture-attestation.v1", decoders: [] };
  const channelsDir = join(dir, "channels");
  const host = createApplicationPolicyHost(policy, { channelsDir });
  const service = new ApplicationService(dir, host);
  const command = { application: "fixture", operation: hash("create"), kind: "create", expectedHead: null, revision, memory, intents: [], evidence: [], causedBy: null };
  return { dir, put, store, host, service, command, recipient, channelsDir };
}

/** Commit a `deliver` intent and settle it through the policy host channel. */
async function settleDelivery(f: Awaited<ReturnType<typeof fixture>>, payload: JsonValue) {
  const message = await f.put(payload);
  const source = await f.service.create({ ...f.command, intents: [{ kind: "deliver", route: "inbox", message }] });
  const intent = source.transition.intents[0]!;
  const attempts = await f.service.dispatchPending("fixture", f.host);
  const dispatch = attempts[0] as ApplicationDispatch;
  expect(dispatch.status).toBe("settled");
  const work = parseWorkIntent(await f.store.getValue(intent));
  const body = await f.store.getValue(message);
  if (body === undefined) throw new Error("payload missing from CAS");
  const record = interappMessageRecord(dispatch, work, body);
  if (record === null) throw new Error("expected a mintable delivery record");
  const reference = digestCanonical(applicationJson(record));
  return { source, intent, work, message, body, dispatch, record, reference };
}

describe("algal.interapp-message.v1", () => {
  test("a settled delivery mints a fully verifiable message record", async () => {
    const f = await fixture();
    const { intent, reference, record, dispatch, message } = await settleDelivery(f, { contract: "algal.message.fixture.v1", body: "hello" });
    // CAS-level: the record binds its intent, sender, operation, route, body.
    const verified = await verifyInterappMessage(f.store, reference);
    expect(verified).toEqual(record);
    expect(verified.application).toBe("fixture");
    expect(verified.intent).toBe(intent);
    expect(verified.route).toBe("inbox");
    expect(verified.to).toBe(f.recipient);
    // Delivery-level: settled dispatch inside validated history + channel row.
    const delivered = await verifyInterappDelivery(f.service, reference, { channelsDir: f.channelsDir });
    expect(delivered.intent).toBe(intent);
    // The channel retains exactly the outcome the record implies.
    const channel = JSON.parse(await Bun.file(join(f.channelsDir, "inbox.json")).text());
    expect(channel.outcomes).toEqual([{ identity: dispatch.identity, message }]);
  });

  test("the minted record is recomputable from the retained dispatch", async () => {
    const f = await fixture();
    const { dispatch, work, body, reference } = await settleDelivery(f, "recompute");
    // Minting again is idempotent — the same settled dispatch derives the
    // same record digest.
    expect(await mintInterappMessage(f.store, dispatch, work)).toBe(reference);
    const stored = await getApplicationRecord(f.store, reference, parseInterappMessage);
    expect(stored).toEqual(interappMessageRecord(dispatch, work, body)!);
  });

  test("channel evidence is required when a channel directory is supplied", async () => {
    const f = await fixture();
    const { dispatch, message, reference } = await settleDelivery(f, "channel-check");
    // CAS+history verification alone passes without the directory.
    await verifyInterappDelivery(f.service, reference);
    // An empty channel directory cannot satisfy the receiver-side check.
    const empty = join(f.dir, "empty-channels");
    await mkdir(empty);
    await expect(verifyInterappDelivery(f.service, reference, { channelsDir: empty })).rejects.toThrow("channel outcome");
    // A channel carrying the right message but a foreign identity fails too.
    await mkdir(join(f.dir, "foreign"), { recursive: true });
    await writeFile(join(f.dir, "foreign", "inbox.json"), JSON.stringify({ contract: "algal.host-channel.v2", route: "inbox", outcomes: [{ identity: hash("foreign"), message }] }));
    await expect(verifyInterappDelivery(f.service, reference, { channelsDir: join(f.dir, "foreign") })).rejects.toThrow("channel outcome");
    // The genuine channel still verifies.
    await verifyInterappDelivery(f.service, reference, { channelsDir: f.channelsDir });
    expect(dispatch.status).toBe("settled");
  });

  test("tampered sender, route, recipient, or payload records fail verification", async () => {
    const f = await fixture();
    const { record } = await settleDelivery(f, "tamper-target");
    const forged = async (patch: Record<string, JsonValue>) => putApplicationRecord(f.store, { ...record, ...patch });
    // Relabelling the sender or route breaks the intent binding.
    await expect(verifyInterappMessage(f.store, await forged({ application: "foreign" }))).rejects.toThrow("does not bind its intent");
    await expect(verifyInterappMessage(f.store, await forged({ route: "elsewhere" }))).rejects.toThrow("does not bind its intent");
    await expect(verifyInterappMessage(f.store, await forged({ operation: hash("other-operation") }))).rejects.toThrow("does not bind its intent");
    // Relabelling the payload breaks the payload binding.
    await expect(verifyInterappMessage(f.store, await forged({ body: { contract: "algal.message.fixture.v1", body: "swapped" } }))).rejects.toThrow("does not bind its payload");
    // Relabelling the recipient passes CAS checks but fails delivery
    // verification against the admitted plan.
    const otherRecipient = capabilityHandle("mailbox-send", { route: "elsewhere" });
    const swapped = await forged({ to: otherRecipient });
    await verifyInterappMessage(f.store, swapped);
    await expect(verifyInterappDelivery(f.service, swapped)).rejects.toThrow("recipient mismatch");
  });

  test("a forged message for an intent outside history fails delivery verification", async () => {
    const f = await fixture();
    await settleDelivery(f, "real-delivery");
    // Fabricate a deliver intent record that exists in CAS but was never
    // committed to this application's history.
    const message = await f.put("never-delivered");
    const intentRecord = { contract: "algal.application-intent.v1", application: "fixture", operation: hash("uncommitted"), ordinal: 0, kind: "deliver", route: "inbox", message };
    const intent = await putApplicationRecord(f.store, intentRecord);
    const body = await f.store.getValue(message);
    const forged = await putApplicationRecord(f.store, {
      contract: "algal.interapp-message.v1", application: "fixture", operation: hash("uncommitted"),
      intent, route: "inbox", to: f.recipient, body,
    });
    // Every CAS binding holds — only the history check can refuse it.
    await verifyInterappMessage(f.store, forged);
    await expect(verifyInterappDelivery(f.service, forged)).rejects.toThrow("not in application history");
  });

  test("non-delivery and non-settled dispatches mint nothing", async () => {
    const f = await fixture();
    const { dispatch, work } = await settleDelivery(f, "shape");
    // The same dispatch with a non-settled status mints nothing.
    expect(await mintInterappMessage(f.store, { ...dispatch, status: "blocked", result: null, reason: "held" }, work)).toBeNull();
    expect(await mintInterappMessage(f.store, { ...dispatch, status: "uncertain", result: null, reason: "lost" }, work)).toBeNull();
    // An episode-shaped work intent mints nothing either.
    const start = parseWorkIntent({ contract: "algal.application-intent.v1", application: "fixture", operation: work.operation, ordinal: 1, kind: "start-episode", entrypoint: "run", input: hash("input") });
    expect(await mintInterappMessage(f.store, dispatch, start)).toBeNull();
  });

  test("a payload that overflows the record bound settles without a message record", async () => {
    const f = await fixture();
    // Body near (but under) the record bound; the record envelope pushes the
    // canonical message record past 256 KiB so minting yields nothing.
    const big = "x".repeat(261_800);
    const message = await f.put({ contract: "algal.message.fixture.v1", body: big });
    const source = await f.service.create({ ...f.command, intents: [{ kind: "deliver", route: "inbox", message }] });
    const [dispatch] = await f.service.dispatchPending("fixture", f.host) as ApplicationDispatch[];
    if (dispatch === undefined) throw new Error("delivery was not dispatched");
    expect(dispatch.status).toBe("settled");
    const work = parseWorkIntent(await f.store.getValue(source.transition.intents[0]!));
    const body = await f.store.getValue(message);
    if (body === undefined) throw new Error("payload missing from CAS");
    const record = interappMessageRecord(dispatch, work, body);
    expect(record).not.toBeNull();
    // The digest the record would carry is computable, but the canonical
    // record itself exceeds the application byte bound — mint yields nothing.
    expect(() => applicationJson(record)).toThrow("byte bound");
    const expected = digestCanonical(record as unknown as JsonValue);
    // The delivery settled and the channel carries its outcome; the
    // oversized record simply does not exist.
    await expect(getApplicationRecord(f.store, expected, parseInterappMessage)).rejects.toThrow("Missing or changed");
  });

  test("parse rejects malformed records", async () => {
    const { record } = await settleDelivery(await fixture(), "parse");
    const value = (patch: Record<string, unknown>) => ({ ...record, ...patch });
    expect(() => parseInterappMessage({ ...record, extra: 1 })).toThrow("Unknown or missing");
    expect(() => parseInterappMessage(value({ contract: "algal.other.v1" }))).toThrow();
    expect(() => parseInterappMessage(value({ intent: "not-a-digest" }))).toThrow();
    expect(() => parseInterappMessage(value({ to: "cap:file-write:sha256:" + "0".repeat(64) }))).toThrow();
    expect(() => parseInterappMessage(value({ route: "Bad Route" }))).toThrow();
    const { contract: _contract, ...rest } = record;
    expect(() => parseInterappMessage(rest)).toThrow("Unknown or missing");
  });

  test("minting pins the intent digest and application to the dispatch", async () => {
    const f = await fixture();
    const { dispatch, work } = await settleDelivery(f, "binding");
    const other = parseWorkIntent({ ...work, application: "foreign" });
    await expect(mintInterappMessage(f.store, dispatch, other)).rejects.toThrow("intent binding mismatch");
    expect(await mintInterappMessage(f.store, dispatch, work)).not.toBeNull();
    // The minted digest equals the record's own content address.
    const digest: Digest = (await mintInterappMessage(f.store, dispatch, work))!;
    await verifyInterappDelivery(f.service, digest, { channelsDir: f.channelsDir });
  });
});
