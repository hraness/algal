import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import type { HabitatAcceptance, HabitatId, HabitatInvocation, HabitatResult, HabitatMessage } from "./habitat-link";
import { generateHabitatAuthorityKeyPair, grantDigest, signHabitatDescriptor, signHabitatGrant, type HabitatGrant, type SignedHabitatDescriptor } from "./habitat-link-authority";
import {
  HABITAT_INVOKE,
  HABITAT_MESSAGE,
  HabitatLinkService,
  LocalHabitatAcceptor,
  parseHabitatLinkReply,
  type HabitatLinkPeer,
} from "./habitat-link-host";
import { FileMailboxService, externalWakeKey, mailboxToolRegistry } from "./mailbox";
import { ProcessSupervisor } from "./process";
import { mergeToolRegistries, type ToolRegistry } from "./tools";

const dirs: string[] = [];
async function directory() {
  const d = await mkdtemp(join(tmpdir(), "algal-habitat-link-"));
  dirs.push(d);
  return d;
}
afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true });
});

const PLANNER = "h_0123456789abcdef0123456789abcdef" as HabitatId;
const SPECIALIST = "h_fedcba9876543210fedcba9876543210" as HabitatId;
const THIRD = "h_00000000000000000000000000000001" as HabitatId;

/** The target organism: waits on its own inbox, then answers with the message. */
function specialistManifest(): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:specialist",
    name: "Specialist",
    budgets: { maxWork: 1000, maxAgentCalls: 0 },
    interface: { inputs: { seed: { cell: "src", port: "seed" } }, outputs: { label: { cell: "wait", port: "message" }, seed: { cell: "src", port: "seed" } } },
    cells: [
      { id: "src", kind: "input", outputs: { seed: { type: "json" }, inbox: { type: "cap", capability: "mailbox-receive" } } },
      { id: "wait", kind: "tool", tool: "mailbox.receive.v1" },
    ],
    edges: [{ from: { cell: "src", port: "inbox" }, to: { cell: "wait", port: "mailbox" } }],
  });
}

/** The caller organism: one remote invocation through host-admitted capabilities. */
function plannerCallManifest(): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:planner-call",
    name: "Planner call",
    cells: [
      {
        id: "src",
        kind: "input",
        outputs: {
          peer: { type: "cap", capability: HABITAT_INVOKE },
          reply: { type: "cap", capability: "mailbox-send" },
          application: { type: "text" },
          entrypoint: { type: "text" },
          manifest: { type: "text" },
          interface: { type: "text" },
          args: { type: "json" },
        },
      },
      { id: "call", kind: "tool", tool: "habitat.invoke.v1" },
    ],
    edges: ["peer", "reply", "application", "entrypoint", "manifest", "interface", "args"].map((port) => ({ from: { cell: "src", port }, to: { cell: "call", port } })),
  });
}

/** The caller's continuation: a durable process that wakes on the reply mailbox. */
function plannerWaitManifest(): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:planner-wait",
    name: "Planner wait",
    cells: [
      { id: "src", kind: "input", outputs: { inbox: { type: "cap", capability: "mailbox-receive" } } },
      { id: "wait", kind: "tool", tool: "mailbox.receive.v1" },
    ],
    edges: [{ from: { cell: "src", port: "inbox" }, to: { cell: "wait", port: "mailbox" } }],
  });
}

function plannerSendManifest(): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:planner-send",
    name: "Planner send",
    cells: [
      { id: "src", kind: "input", outputs: { peer: { type: "cap", capability: HABITAT_MESSAGE }, body: { type: "json" } } },
      { id: "send", kind: "tool", tool: "habitat.send.v1" },
    ],
    edges: [{ from: { cell: "src", port: "peer" }, to: { cell: "send", port: "peer" } }, { from: { cell: "src", port: "body" }, to: { cell: "send", port: "body" } }],
  });
}

type Specialist = {
  dir: string;
  keys: ReturnType<typeof generateHabitatAuthorityKeyPair>;
  descriptor: SignedHabitatDescriptor;
  mailbox: FileMailboxService;
  supervisor: ProcessSupervisor;
  acceptor: LocalHabitatAcceptor;
  inbox: Awaited<ReturnType<FileMailboxService["create"]>>;
  target: { manifest: Digest; interface: Digest };
  grant: (permissions: HabitatGrant["permissions"], overrides?: { [K in keyof Omit<HabitatGrant, "signature" | "publicKey">]?: HabitatGrant[K] | undefined }) => HabitatGrant;
};

async function specialist(now: () => number): Promise<Specialist> {
  const dir = await directory();
  const keys = generateHabitatAuthorityKeyPair();
  const mailbox = new FileMailboxService(dir);
  const supervisor = new ProcessSupervisor(dir, { mailboxes: mailbox, tools: mailboxToolRegistry(mailbox) });
  const descriptor = signHabitatDescriptor({
    contract: "algal.habitat-descriptor.v1",
    habitat: SPECIALIST,
    key: digestCanonical({ key: "specialist" }),
    protocols: ["algal.habitat-link.v1"],
    transports: [{ kind: "http", base: "https://specialist.test/v1/habitats/" + SPECIALIST }],
    expires: 1_000,
  }, keys.privateKey);
  const publicKey = descriptor.publicKey;
  const acceptor = new LocalHabitatAcceptor({ habitat: SPECIALIST, supervisor, mailboxes: mailbox, now, trustedKeys: [publicKey] });
  const inbox = await mailbox.create("specialist-inbox");
  const target = acceptor.register("specialist", "classify", specialistManifest(), { src: { inbox: inbox.receive } });
  // An override of `undefined` removes the field from the signed record.
  const grant: Specialist["grant"] = (permissions, overrides = {}) => signHabitatGrant(Object.fromEntries(Object.entries({
    contract: "algal.habitat-grant.v1",
    issuer: SPECIALIST,
    subject: { habitat: PLANNER, principal: "planner" },
    audience: SPECIALIST,
    permissions,
    ...(permissions.includes("invoke") ? { application: "specialist", entrypoint: "classify", interface: target.interface } : {}),
    terms: { maxWork: 1_000, maxAgentCalls: 0, maxBytes: 4_096, maxHops: 1 },
    notBefore: 0,
    expires: 500,
    nonce: `nonce-${permissions.join("-")}`,
    ...overrides,
  }).filter(([, v]) => v !== undefined)) as Omit<HabitatGrant, "signature" | "publicKey">, keys.privateKey);
  return { dir, keys, descriptor, mailbox, supervisor, acceptor, inbox, target, grant };
}

type Planner = {
  dir: string;
  mailbox: FileMailboxService;
  service: HabitatLinkService;
  supervisor: ProcessSupervisor;
  tools: ToolRegistry;
  reply: Awaited<ReturnType<FileMailboxService["create"]>>;
};

async function planner(target: Specialist, peer: HabitatLinkPeer, now: () => number, journal = false): Promise<Planner> {
  const dir = await directory();
  const mailbox = new FileMailboxService(dir);
  const service = new HabitatLinkService({ habitat: PLANNER, mailboxes: mailbox, now, trustedKeys: [target.descriptor.publicKey] });
  service.connect(target.descriptor, peer);
  const tools = mergeToolRegistries(mailboxToolRegistry(mailbox), service.tools());
  const supervisor = new ProcessSupervisor(dir, { mailboxes: mailbox, tools, ...(journal ? { journal: true } : {}) });
  const reply = await mailbox.create("planner-reply");
  return { dir, mailbox, service, supervisor, tools, reply };
}

function callArgs(p: Planner, s: Specialist, peer: string, seed: unknown = "oak") {
  return { src: { peer, reply: p.reply.send, application: "specialist", entrypoint: "classify", manifest: s.target.manifest, interface: s.target.interface, args: { seed } } };
}

describe("two habitats over Habitat Link", () => {
  test("the process issuing invoke suspends and wakes with its result", async () => {
    const now = () => 100;
    const s = await specialist(now);
    const p = await planner(s, s.acceptor, now);
    const grant = s.grant(["invoke"]);
    s.acceptor.enroll(grant);
    const cap = p.service.admit({ capability: HABITAT_INVOKE, grant });
    const combined = plannerCallManifest();
    const source = combined.cells[0]!;
    if (source.kind !== "input") throw new Error("expected input source");
    source.outputs.inbox = { type: "cap", capability: "mailbox-receive" };
    combined.cells.push({ id: "wait", kind: "tool", tool: "mailbox.receive.v1" });
    combined.edges.push({ from: { cell: "src", port: "inbox" }, to: { cell: "wait", port: "mailbox" } });
    const args = callArgs(p, s, cap.handle);
    await p.supervisor.create("planner", parseOrganismManifest(manifestToJson(combined)), { src: { ...args.src, inbox: p.reply.receive } });
    expect((await p.supervisor.tick("planner"))?.process.status).toBe("suspended");
    const operation = p.service.pendingOperations()[0]!;
    await s.supervisor.schedule();
    await s.mailbox.send(s.inbox.send, "tree", externalWakeKey());
    await s.supervisor.schedule();
    expect(await p.service.reconcile()).toEqual({ polled: 1, settled: 1, pending: 0 });
    const woke = await p.supervisor.schedule();
    expect(woke.processes[0]!.process).toMatchObject({ name: "planner", status: "complete" });
    const receipt = await p.supervisor.store.getReceipt(woke.processes[0]!.process.receipt!) as { cells: Record<string, { outputs?: Record<string, unknown> }> };
    expect(parseHabitatLinkReply(receipt.cells.wait!.outputs!.message)).toMatchObject({ operationId: operation.operationId, result: { outputs: { label: "tree", seed: "oak" } } });
    expect(await p.supervisor.verify("planner")).toMatchObject({ ok: true, generations: 2 });
    expect(await p.service.reconcile()).toEqual({ polled: 0, settled: 0, pending: 0 });
  });

  test("planner invokes, suspends on a reply mailbox, resumes with a verified result", async () => {
    const now = () => 100;
    const s = await specialist(now);
    const p = await planner(s, s.acceptor, now);
    const grant = s.grant(["invoke"]);
    s.acceptor.enroll(grant);
    const cap = p.service.admit({ capability: HABITAT_INVOKE, grant });

    // 1. The caller's durable process submits the invocation and completes.
    await p.supervisor.create("planner-call", plannerCallManifest(), callArgs(p, s, cap.handle));
    const called = await p.supervisor.tick("planner-call");
    expect(called?.process.status).toBe("complete");
    const pending = p.service.pendingOperations();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.status).toBe("accepted");
    const operationId = pending[0]!.operationId;
    expect(pending[0]!.process).toBe(`link-${operationId}`);

    // 2. The continuation suspends on the reply mailbox; nothing wakes it yet.
    await p.supervisor.create("planner-wait", plannerWaitManifest(), { src: { inbox: p.reply.receive } });
    expect((await p.supervisor.tick("planner-wait"))?.process.status).toBe("suspended");
    expect(await p.service.reconcile()).toEqual({ polled: 1, settled: 0, pending: 1 });
    expect(await p.supervisor.schedule()).toEqual({ ticks: 0, processes: [] });

    // 3. The specialist's pinned process runs, suspends on its own inbox, then
    //    resumes durably when its host delivers the input it was waiting for.
    const target = await s.supervisor.inspect(`link-${operationId}`);
    expect(target.process.args).toEqual({ src: { seed: "oak", inbox: s.inbox.receive } });
    expect((await s.supervisor.schedule()).processes[0]!.process.status).toBe("suspended");
    expect(await p.service.reconcile()).toEqual({ polled: 1, settled: 0, pending: 1 });
    await s.mailbox.send(s.inbox.send, { label: "tree" }, externalWakeKey());
    expect((await s.supervisor.schedule()).processes[0]!.process.status).toBe("complete");

    // 4. Reconciliation delivers the terminal result; the planner wakes with it.
    expect(await p.service.reconcile()).toEqual({ polled: 1, settled: 1, pending: 0 });
    const woke = await p.supervisor.schedule();
    expect(woke.ticks).toBe(1);
    expect(woke.processes[0]!.process.name).toBe("planner-wait");
    expect(woke.processes[0]!.process.status).toBe("complete");
    const receipt = await p.supervisor.store.getReceipt(woke.processes[0]!.process.receipt!) as { cells: Record<string, { outputs?: Record<string, unknown> }> };
    const reply = parseHabitatLinkReply(receipt.cells.wait!.outputs!.message);
    expect(reply.habitat).toBe(SPECIALIST);
    expect(reply.operationId).toBe(operationId);
    expect(reply.result.status).toBe("complete");
    expect(reply.result.outputs).toEqual({ label: { label: "tree" }, seed: "oak" });
    // The result names the specialist's receipt, which replays offline there.
    const specialistHead = await s.supervisor.inspect(`link-${operationId}`);
    expect(reply.result.receipt).toBe(specialistHead.process.receipt!);
    expect(await s.supervisor.verify(`link-${operationId}`)).toMatchObject({ ok: true });

    // 5. Verifying the planner's processes never reaches the live peer.
    const forbidden = mergeToolRegistries(mailboxToolRegistry(p.mailbox), p.service.tools());
    for (const entry of forbidden.values()) entry.tool = async () => { throw new Error("live habitat-link reached in verification"); };
    const verifier = new ProcessSupervisor(p.dir, { mailboxes: p.mailbox, tools: forbidden });
    expect(await verifier.verify("planner-call")).toMatchObject({ ok: true });
    expect(await verifier.verify("planner-wait")).toMatchObject({ ok: true, generations: 2 });

    // Delivering the reply twice cannot double-wake: the reply key is the operation.
    expect(await p.service.reconcile()).toEqual({ polled: 0, settled: 0, pending: 0 });
    expect(await p.mailbox.hasPending(p.reply.receive)).toBe(false);
  });

  test("a lost acknowledgement reconciles the same operation instead of a second one", async () => {
    const now = () => 100;
    const s = await specialist(now);
    let dropAcks = 1;
    let invocations = 0;
    const lossy: HabitatLinkPeer = {
      async invoke(request: HabitatInvocation): Promise<HabitatAcceptance> {
        invocations++;
        const acceptance = await s.acceptor.invoke(request);
        if (dropAcks-- > 0) throw new AlgalError("IO_FAILED", "habitat-link transport failed", undefined, { uncertain: true });
        return acceptance;
      },
      getInvocation: (id) => s.acceptor.getInvocation(id),
      sendMessage: (m) => s.acceptor.sendMessage(m),
    };
    const p = await planner(s, lossy, now, true);
    const grant = s.grant(["invoke"]);
    s.acceptor.enroll(grant);
    const cap = p.service.admit({ capability: HABITAT_INVOKE, grant });
    await p.supervisor.create("planner-call", plannerCallManifest(), callArgs(p, s, cap.handle));
    await p.supervisor.create("planner-wait", plannerWaitManifest(), { src: { inbox: p.reply.receive } });
    expect((await p.supervisor.tick("planner-wait"))?.process.status).toBe("suspended");
    // The target accepted the work, but the acknowledgement never arrived.
    await expect(p.supervisor.tick("planner-call")).rejects.toMatchObject({ code: "IO_FAILED", uncertain: true });
    const intent = await p.supervisor.inspect("planner-call");
    expect(intent.process.status).toBe("uncertain");
    const submitted = p.service.pendingOperations();
    expect(submitted).toHaveLength(1);
    expect(submitted[0]!.status).toBe("submitted");
    const operationId = submitted[0]!.operationId;
    // The kernel will not re-run an unacknowledged write on its own: that is
    // the adapter's reconciliation to perform, never a blind resend.
    await expect(p.supervisor.recover("planner-call", intent.digest)).rejects.toMatchObject({ code: "IO_FAILED" });
    expect(invocations).toBe(1);
    // Reconciliation asks the target about the same operation id and finds it
    // accepted, so the continuation still gets exactly one result.
    expect(await p.service.reconcile()).toEqual({ polled: 1, settled: 0, pending: 1 });
    expect(p.service.pendingOperations()[0]).toMatchObject({ status: "accepted", process: `link-${operationId}` });
    expect((await s.supervisor.schedule()).processes[0]!.process.status).toBe("suspended");
    await s.mailbox.send(s.inbox.send, { label: "tree" }, externalWakeKey());
    expect((await s.supervisor.schedule()).processes[0]!.process.status).toBe("complete");
    expect(await p.service.reconcile()).toEqual({ polled: 1, settled: 1, pending: 0 });
    const woke = await p.supervisor.schedule();
    expect(woke.processes.map((snap) => [snap.process.name, snap.process.status])).toEqual([["planner-wait", "complete"]]);
    // A host that does resend the same dispatch identity gets the replay, not a
    // second process: the operation id is the idempotency key, not a fresh nonce.
    const replay = await p.service.invoke({ peer: cap.handle, reply: p.reply.send, application: "specialist", entrypoint: "classify", manifest: s.target.manifest, interface: s.target.interface, args: { seed: "oak" } }, digestCanonical({ dispatch: "manual" }));
    expect(replay.replayed).toBe(false);
    expect(invocations).toBe(2);
    expect((await s.supervisor.list()).map((snap) => snap.process.name).sort()).toEqual([`link-${operationId}`, `link-${replay.operationId}`].sort());
  });

  test("an operation id cannot be reused for a different invocation", async () => {
    const now = () => 100;
    const s = await specialist(now);
    const p = await planner(s, s.acceptor, now);
    const grant = s.grant(["invoke"]);
    s.acceptor.enroll(grant);
    const cap = p.service.admit({ capability: HABITAT_INVOKE, grant });
    const key = digestCanonical({ dispatch: 1 });
    const base = { peer: cap.handle, reply: p.reply.send, application: "specialist", entrypoint: "classify", manifest: s.target.manifest, interface: s.target.interface };
    const first = await p.service.invoke({ ...base, args: { seed: "oak" } }, key);
    expect(first.replayed).toBe(false);
    expect((await p.service.invoke({ ...base, args: { seed: "oak" } }, key)).replayed).toBe(true);
    await expect(p.service.invoke({ ...base, args: { seed: "ash" } }, key)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    // The target refuses the same reuse even from a caller that skipped its own ledger.
    const request: HabitatInvocation = {
      contract: "algal.habitat-invocation.v1",
      operationId: first.operationId,
      sender: { habitat: PLANNER, principal: "planner" },
      target: { application: "specialist", entrypoint: "classify", manifest: s.target.manifest, interface: s.target.interface },
      args: { seed: "ash" },
      reply: { kind: "poll", reference: first.operationId },
      terms: grant.terms,
      grant: grantDigest(grant),
    };
    await expect(s.acceptor.invoke(request)).rejects.toMatchObject({ code: "RECEIPT_MISMATCH" });
  });

  test("grant, interface, and budget checks fail closed at the target and the caller", async () => {
    const clock = { now: 100 };
    const now = () => clock.now;
    const s = await specialist(now);
    const p = await planner(s, s.acceptor, now);
    const grant = s.grant(["invoke"]);
    s.acceptor.enroll(grant);
    const cap = p.service.admit({ capability: HABITAT_INVOKE, grant });
    const request = (overrides: Partial<HabitatInvocation> = {}): HabitatInvocation => ({
      contract: "algal.habitat-invocation.v1",
      operationId: "0123456789abcdef0123456789abcdef",
      sender: { habitat: PLANNER, principal: "planner" },
      target: { application: "specialist", entrypoint: "classify", manifest: s.target.manifest, interface: s.target.interface },
      args: { seed: "oak" },
      reply: { kind: "poll", reference: "0123456789abcdef0123456789abcdef" },
      terms: grant.terms,
      grant: grantDigest(grant),
      ...overrides,
    });
    // Unknown grant, another principal, and a foreign interface digest.
    await expect(s.acceptor.invoke(request({ grant: digestCanonical({ grant: "unknown" }) }))).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(s.acceptor.invoke(request({ sender: { habitat: PLANNER, principal: "stranger" } }))).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(s.acceptor.invoke(request({ target: { ...request().target, interface: digestCanonical({ other: true }) } }))).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    // A grant without an interface pin still stops at the registered entrypoint's interface.
    const loose = s.grant(["invoke"], { interface: undefined, nonce: "loose" });
    s.acceptor.enroll(loose);
    await expect(s.acceptor.invoke(request({ grant: grantDigest(loose), target: { ...request().target, interface: digestCanonical({ other: true }) } }))).rejects.toMatchObject({ code: "INTERFACE_MISMATCH" });
    await expect(s.acceptor.invoke(request({ grant: grantDigest(loose), target: { ...request().target, manifest: digestCanonical({ other: true }) } }))).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    // Terms above the grant are denied; terms inside the grant but above the
    // entrypoint budget are exhausted.
    await expect(s.acceptor.invoke(request({ terms: { ...grant.terms, maxWork: grant.terms.maxWork + 1 } }))).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    const wide = s.grant(["invoke"], { terms: { maxWork: 1_000_000, maxAgentCalls: 128, maxBytes: 4_096, maxHops: 1 }, nonce: "wide" });
    s.acceptor.enroll(wide);
    await expect(s.acceptor.invoke(request({ grant: grantDigest(wide), terms: { ...wide.terms, maxWork: 999 } }))).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
    // Undeclared and host-bound interface inputs are refused.
    await expect(s.acceptor.invoke(request({ args: { seed: "oak", extra: 1 } }))).rejects.toMatchObject({ code: "INPUT_MISSING" });
    // Expiry is logical time supplied by the host, on both sides.
    clock.now = 501;
    await expect(s.acceptor.invoke(request())).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(p.service.invoke({ peer: cap.handle, reply: p.reply.send, application: "specialist", entrypoint: "classify", manifest: s.target.manifest, interface: s.target.interface, args: { seed: "oak" } }, digestCanonical({ dispatch: 2 }))).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    clock.now = 100;
    // The caller refuses grants for other subjects, unknown peers, and untrusted descriptors.
    const foreign = s.grant(["invoke"], { subject: { habitat: THIRD, principal: "planner" }, nonce: "foreign" });
    expect(() => p.service.admit({ capability: HABITAT_INVOKE, grant: foreign })).toThrow(AlgalError);
    const elsewhere = s.grant(["invoke"], { audience: THIRD, nonce: "elsewhere" });
    expect(() => p.service.admit({ capability: HABITAT_INVOKE, grant: elsewhere })).toThrow(AlgalError);
    const impostor = generateHabitatAuthorityKeyPair();
    const forged = signHabitatDescriptor(s.descriptor.descriptor, impostor.privateKey);
    expect(() => p.service.connect(forged, s.acceptor)).toThrow(AlgalError);
    expect(() => s.acceptor.enroll(signHabitatGrant({ ...grant, nonce: "forged" }, impostor.privateKey))).toThrow(AlgalError);
    // Revocation closes the capability without touching the peer.
    p.service.revoke(cap.handle);
    await expect(p.service.invoke({ peer: cap.handle, reply: p.reply.send, application: "specialist", entrypoint: "classify", manifest: s.target.manifest, interface: s.target.interface, args: { seed: "oak" } }, digestCanonical({ dispatch: 3 }))).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
  });

  test("messages are accepted before they are read, and identity is bound to the body", async () => {
    const now = () => 100;
    const s = await specialist(now);
    const p = await planner(s, s.acceptor, now);
    const invokeOnly = s.grant(["invoke"]);
    const grant = s.grant(["message"]);
    s.acceptor.enroll(invokeOnly);
    s.acceptor.enroll(grant);
    expect(() => p.service.admit({ capability: HABITAT_MESSAGE, grant: invokeOnly, recipient: s.inbox.send })).toThrow(AlgalError);
    const cap = p.service.admit({ capability: HABITAT_MESSAGE, grant, recipient: s.inbox.send });
    await p.supervisor.create("planner-send", plannerSendManifest(), { src: { peer: cap.handle, body: { hello: "specialist" } } });
    const sent = await p.supervisor.tick("planner-send");
    expect(sent?.process.status).toBe("complete");
    const receipt = await p.supervisor.store.getReceipt(sent!.process.receipt!) as { cells: Record<string, { outputs?: Record<string, unknown> }> };
    const { messageId, deliveryId } = receipt.cells.send!.outputs! as { messageId: string; deliveryId: string };
    expect(messageId).toMatch(/^[0-9a-f]{32}$/);
    // Accepted: durably in the specialist's mailbox. Not read: no consumer yet.
    expect(await s.mailbox.hasPending(s.inbox.receive)).toBe(true);
    const envelope = (m: HabitatMessage["body"]): HabitatMessage => ({ contract: "algal.habitat-message.v1", messageId, sender: { habitat: PLANNER, principal: "planner" }, recipient: s.inbox.send as HabitatMessage["recipient"], body: m, grant: grantDigest(grant) });
    expect(await s.acceptor.sendMessage(envelope({ hello: "specialist" }))).toEqual({ deliveryId });
    await expect(s.acceptor.sendMessage(envelope({ hello: "someone else" }))).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    await expect(s.acceptor.sendMessage({ ...envelope({ hello: "specialist" }), grant: grantDigest(invokeOnly) })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(s.acceptor.sendMessage(envelope({ pad: "x".repeat(5_000) }))).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    // Read is a separate transition the recipient owns; the envelope arrives intact.
    const read = await s.mailbox.receive(s.inbox.receive);
    expect(read.id).toBe(deliveryId as Digest);
    expect(read.message).toEqual(envelope({ hello: "specialist" }));
    expect(await s.mailbox.hasPending(s.inbox.receive)).toBe(false);
    // A replay after the read is still the same delivery, not a second message.
    expect(await s.acceptor.sendMessage(envelope({ hello: "specialist" }))).toEqual({ deliveryId });
    expect(await s.mailbox.hasPending(s.inbox.receive)).toBe(false);
  });

  test("the acceptor and the caller survive restart from durable state", async () => {
    const now = () => 100;
    const s = await specialist(now);
    const p = await planner(s, s.acceptor, now);
    const grant = s.grant(["invoke"]);
    s.acceptor.enroll(grant);
    const cap = p.service.admit({ capability: HABITAT_INVOKE, grant });
    const key = digestCanonical({ dispatch: 1 });
    const input = { peer: cap.handle, reply: p.reply.send, application: "specialist", entrypoint: "classify", manifest: s.target.manifest, interface: s.target.interface, args: { seed: "oak" } };
    const first = await p.service.invoke(input, key);
    // A fresh acceptor over the same process directory recognises the pinned process.
    const restarted = new LocalHabitatAcceptor({ habitat: SPECIALIST, supervisor: new ProcessSupervisor(s.dir, { mailboxes: s.mailbox, tools: mailboxToolRegistry(s.mailbox) }), mailboxes: s.mailbox, now, trustedKeys: [s.descriptor.publicKey] });
    restarted.enroll(grant);
    restarted.register("specialist", "classify", specialistManifest(), { src: { inbox: s.inbox.receive } });
    // A fresh caller service restores its ledger and reconnects the peer.
    const again = new HabitatLinkService({ habitat: PLANNER, mailboxes: p.mailbox, now, trustedKeys: [s.descriptor.publicKey] });
    again.restore(p.service.snapshot());
    again.connect(s.descriptor, restarted);
    const retainedRequest: HabitatInvocation = { contract: "algal.habitat-invocation.v1", operationId: first.operationId, sender: { habitat: PLANNER, principal: "planner" }, target: { application: "specialist", entrypoint: "classify", ...s.target }, args: { seed: "oak" }, reply: { kind: "poll", reference: first.operationId }, terms: grant.terms, grant: grantDigest(grant) };
    // A fresh index must bind every field, even when manifest and args match.
    await expect(restarted.invoke({ ...retainedRequest, reply: { kind: "poll", reference: "changed" } })).rejects.toMatchObject({ code: "RECEIPT_MISMATCH" });
    expect((await restarted.queryInvocation(first.operationId, grantDigest(grant), retainedRequest.sender)).status).toBe("accepted");
    const replayed = await again.invoke(input, key);
    expect(replayed).toEqual({ ...first, replayed: true });
    expect((await restarted.getInvocation(first.operationId)).status).toBe("accepted");
    await expect(restarted.invoke({ ...(await (async () => {
      const r: HabitatInvocation = { contract: "algal.habitat-invocation.v1", operationId: first.operationId, sender: { habitat: PLANNER, principal: "planner" }, target: { application: "specialist", entrypoint: "classify", manifest: s.target.manifest, interface: s.target.interface }, args: { seed: "ash" }, reply: { kind: "poll", reference: first.operationId }, terms: grant.terms, grant: grantDigest(grant) };
      return r;
    })()) })).rejects.toMatchObject({ code: "RECEIPT_MISMATCH" });
    // A result that does not name the pending invocation is refused, not delivered.
    const forged: HabitatLinkPeer = { invoke: (r) => restarted.invoke(r), sendMessage: (m) => restarted.sendMessage(m), async getInvocation(id): Promise<HabitatResult> { return { ...(await restarted.getInvocation(id)), invocation: digestCanonical({ forged: true }), status: "complete" }; } };
    const suspicious = new HabitatLinkService({ habitat: PLANNER, mailboxes: p.mailbox, now, trustedKeys: [s.descriptor.publicKey] });
    suspicious.restore(p.service.snapshot());
    suspicious.connect(s.descriptor, forged);
    await expect(suspicious.reconcile()).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    expect(await p.mailbox.hasPending(p.reply.receive)).toBe(false);
  });
});
