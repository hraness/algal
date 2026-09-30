/**
 * Habitat Link host integration: how an organism reaches another habitat.
 *
 * Two halves share this module so a single process can play both roles in
 * tests and in a federation of local habitats:
 *
 * - `HabitatLinkService` is the caller side. The host connects verified
 *   peer descriptors, admits remote capabilities backed by signed grants,
 *   and exposes `habitat.invoke.v1` / `habitat.send.v1` tools. An
 *   invocation's identity derives from the dispatch idempotency key, so a
 *   retried dispatch after a lost acknowledgement reconciles the same
 *   operation instead of minting a second one. Results come back through a
 *   local reply mailbox that the process suspends on; `reconcile()` polls
 *   the peers and delivers verified terminal results there.
 *
 * - `LocalHabitatAcceptor` is the target side: the reference acceptor that
 *   verifies grants, pins a durable process to the exact manifest, and maps
 *   the organism interface to invocation args and result outputs. It is the
 *   in-process counterpart of the hosted `algal.cloud` route.
 *
 * Neither half owns a transport. A `HabitatLinkPeer` is whatever carries
 * the records: the HTTP client, a local acceptor, or a test wrapper that
 * drops acknowledgements.
 */
import { join } from "node:path";
import { hostLease, hostNames, hostRead, hostWrite, SHARED_LEASE_RETRY } from "./host-state";
import { capabilityHandle, parseCapabilityHandle, type CapabilityHandle } from "./capabilities";
import { manifestToJson, type OrganismManifest } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  HABITAT_LINK_BOUNDS,
  habitatInvocationDigest,
  parseHabitatAcceptance,
  parseHabitatInvocation,
  parseHabitatMessage,
  parseHabitatResult,
  type HabitatAcceptance,
  type HabitatId,
  type HabitatInvocation,
  type HabitatMessage,
  type HabitatResult,
  type OperationId,
} from "./habitat-link";
import {
  grantDigest,
  parseHabitatGrant,
  parseSignedHabitatDescriptor,
  verifyHabitatDescriptor,
  verifyHabitatGrant,
  type HabitatGrant,
  type HabitatGrantPermission,
  type SignedHabitatDescriptor,
} from "./habitat-link-authority";
import { MAILBOX_SEND, randomHex, type MailboxService } from "./mailbox-core";
import type { ProcessSupervisor } from "./process";
import type { RunReceipt } from "./run";
import type { ToolRegistry } from "./tools";
import { asInt, asJsonValue, asObject, asSafeId, asString, canonicalBytes, noUnknownKeys, reqField, type JsonValue } from "./values";

export const HABITAT_INVOKE = "habitat-invoke" as const;
export const HABITAT_MESSAGE = "habitat-message" as const;
export const HABITAT_INVOKE_TOOL = "habitat.invoke.v1" as const;
export const HABITAT_SEND_TOOL = "habitat.send.v1" as const;
export const HABITAT_LINK_CAPABILITY_CONTRACT = "algal.habitat-link-capability.v1" as const;
export const HABITAT_LINK_REPLY_CONTRACT = "algal.habitat-link-reply.v1" as const;
export const HABITAT_LINK_PENDING_CONTRACT = "algal.habitat-link-pending.v1" as const;
export const HABITAT_LINK_HOST_BOUNDS = Object.freeze({
  maxPeers: 256,
  maxCapabilities: 1024,
  maxPending: 4096,
  maxTrustedKeys: 64,
  maxApplications: 256,
  maxEntrypoints: 64,
  maxAcceptedInvocations: 4096,
  maxReconcilePolls: 256,
});

/** The transport-neutral shape every carrier of Habitat Link records offers. */
export interface HabitatLinkPeer {
  invoke(request: HabitatInvocation): Promise<HabitatAcceptance>;
  getInvocation(operationId: OperationId): Promise<HabitatResult>;
  sendMessage(message: HabitatMessage): Promise<{ deliveryId: string }>;
}

export type HabitatLinkCapabilityRecord = {
  contract: typeof HABITAT_LINK_CAPABILITY_CONTRACT;
  handle: CapabilityHandle;
  capability: typeof HABITAT_INVOKE | typeof HABITAT_MESSAGE;
  /** The remote habitat this capability reaches. */
  habitat: HabitatId;
  principal: string;
  grant: HabitatGrant;
  /** `habitat-message` only: the remote mailbox-send handle the grant covers. */
  recipient?: `cap:mailbox-send:${Digest}`;
  nonce: string;
  revoked: boolean;
};

export type HabitatLinkPending = {
  contract: typeof HABITAT_LINK_PENDING_CONTRACT;
  operationId: OperationId;
  habitat: HabitatId;
  invocation: Digest;
  reply: `cap:mailbox-send:${Digest}`;
  status: "submitted" | "accepted" | "settled";
  process?: string;
};

/** The record a settled invocation delivers into the caller's reply mailbox. */
export type HabitatLinkReply = {
  contract: typeof HABITAT_LINK_REPLY_CONTRACT;
  operationId: OperationId;
  habitat: HabitatId;
  invocation: Digest;
  result: HabitatResult;
};

function fail(code: ConstructorParameters<typeof AlgalError>[0], message: string): never {
  throw new AlgalError(code, message);
}

function operationIdOf(idempotencyKey: Digest): OperationId {
  // Dispatch identity is already a canonical digest; the 128-bit prefix is
  // the caller-chosen operation id the protocol expects.
  return asDigest(idempotencyKey, "idempotency key").slice(7, 39);
}

function replyKey(operationId: OperationId): Digest {
  return digestCanonical({ contract: HABITAT_LINK_REPLY_CONTRACT, operationId });
}

export function messageIdempotencyKey(messageId: OperationId): Digest {
  return digestCanonical({ contract: "algal.habitat-message-key.v1", messageId });
}

function interfaceDigest(manifest: OrganismManifest): Digest {
  if (manifest.interface === undefined) fail("INTERFACE_MISMATCH", "a Habitat Link target must declare an organism interface");
  return digestCanonical(manifest.interface as unknown as JsonValue);
}

function capabilityDescriptor(record: Pick<HabitatLinkCapabilityRecord, "capability" | "habitat" | "principal" | "nonce"> & { grant: Digest; recipient?: string }): JsonValue {
  return {
    capability: record.capability,
    contract: HABITAT_LINK_CAPABILITY_CONTRACT,
    grant: record.grant,
    habitat: record.habitat,
    principal: record.principal,
    nonce: record.nonce,
    ...(record.recipient === undefined ? {} : { recipient: record.recipient }),
  };
}

export function parseHabitatLinkCapabilityRecord(value: unknown): HabitatLinkCapabilityRecord {
  const what = "habitat-link capability";
  const obj = asObject(value, what);
  noUnknownKeys(obj, ["contract", "handle", "capability", "habitat", "principal", "grant", "recipient", "nonce", "revoked"], what);
  if (obj.contract !== HABITAT_LINK_CAPABILITY_CONTRACT) fail("PARSE_FAILED", `${what}.contract is invalid`);
  const capability = asSafeId(reqField(obj, "capability", what), `${what}.capability`);
  if (capability !== HABITAT_INVOKE && capability !== HABITAT_MESSAGE) fail("PARSE_FAILED", `${what}.capability is not a habitat-link right`);
  const grant = parseHabitatGrant(reqField(obj, "grant", what));
  if (obj.revoked !== true && obj.revoked !== false) fail("PARSE_FAILED", `${what}.revoked must be a boolean`);
  const record: HabitatLinkCapabilityRecord = {
    contract: HABITAT_LINK_CAPABILITY_CONTRACT,
    handle: parseCapabilityHandle(reqField(obj, "handle", what), capability, `${what}.handle`).handle,
    capability,
    habitat: asString(reqField(obj, "habitat", what), `${what}.habitat`, 34) as HabitatId,
    principal: asSafeId(reqField(obj, "principal", what), `${what}.principal`),
    grant,
    ...(obj.recipient === undefined ? {} : { recipient: parseCapabilityHandle(obj.recipient, MAILBOX_SEND, `${what}.recipient`).handle as `cap:mailbox-send:${Digest}` }),
    nonce: asString(reqField(obj, "nonce", what), `${what}.nonce`, 128),
    revoked: obj.revoked,
  };
  if (!/^h_[0-9a-f]{32}$/.test(record.habitat)) fail("PARSE_FAILED", `${what}.habitat must be h_<32 lowercase hex>`);
  if (capability === HABITAT_MESSAGE && record.recipient === undefined) fail("PARSE_FAILED", `${what}.recipient is required for habitat-message`);
  if (capability === HABITAT_INVOKE && record.recipient !== undefined) fail("PARSE_FAILED", `${what}.recipient is only valid for habitat-message`);
  if (capabilityHandle(capability, capabilityDescriptor({ ...record, grant: grantDigest(grant) })) !== record.handle) fail("DIGEST_MISMATCH", `${what}.handle does not match its admission`);
  return record;
}

export function parseHabitatLinkReply(value: unknown): HabitatLinkReply {
  const what = "habitat-link reply";
  const obj = asObject(value, what);
  noUnknownKeys(obj, ["contract", "operationId", "habitat", "invocation", "result"], what);
  if (obj.contract !== HABITAT_LINK_REPLY_CONTRACT) fail("PARSE_FAILED", `${what}.contract is invalid`);
  const result = parseHabitatResult(reqField(obj, "result", what));
  const operationId = asString(reqField(obj, "operationId", what), `${what}.operationId`, 32);
  const invocation = asDigest(reqField(obj, "invocation", what), `${what}.invocation`);
  const habitat = asString(reqField(obj, "habitat", what), `${what}.habitat`, 34) as HabitatId;
  if (!/^h_[0-9a-f]{32}$/.test(habitat)) fail("PARSE_FAILED", `${what}.habitat must be h_<32 lowercase hex>`);
  if (result.operationId !== operationId || result.invocation !== invocation) fail("DIGEST_MISMATCH", `${what} does not match its result`);
  return { contract: HABITAT_LINK_REPLY_CONTRACT, operationId, habitat, invocation, result };
}

export type HabitatLinkServiceOptions = {
  /** This habitat's identity, the `sender.habitat` of every outbound record. */
  habitat: HabitatId;
  /** Where replies land; the same service the local processes wake on. */
  mailboxes: MailboxService;
  /** Unix milliseconds for grant validity windows; never a hidden wall clock. */
  now: () => number;
  /** Descriptor keys this habitat trusts. Empty means no peer can connect. */
  trustedKeys?: readonly string[];
};

/** Caller-side Habitat Link: peers, remote capabilities, outbound identity,
 * and result delivery. State is in memory; `snapshot()` / `restore()` let a
 * host persist it beside its process directory. */
export class HabitatLinkService {
  readonly habitat: HabitatId;
  private readonly mailboxes: MailboxService;
  private readonly now: () => number;
  private readonly trustedKeys: readonly string[];
  private readonly peers = new Map<HabitatId, { descriptor: SignedHabitatDescriptor; peer: HabitatLinkPeer }>();
  private readonly records = new Map<CapabilityHandle, HabitatLinkCapabilityRecord>();
  private readonly pending = new Map<OperationId, HabitatLinkPending>();

  constructor(options: HabitatLinkServiceOptions) {
    if (!/^h_[0-9a-f]{32}$/.test(options.habitat)) fail("PARSE_FAILED", "habitat must be h_<32 lowercase hex>");
    this.habitat = options.habitat;
    this.mailboxes = options.mailboxes;
    this.now = options.now;
    this.trustedKeys = [...(options.trustedKeys ?? [])];
    if (this.trustedKeys.length > HABITAT_LINK_HOST_BOUNDS.maxTrustedKeys) fail("BUDGET_EXHAUSTED", "too many trusted keys");
  }

  /** Register a peer behind a signed descriptor. The descriptor must verify
   * under a trusted key and be unexpired at the host's supplied Unix millisecond timestamp. */
  connect(descriptor: SignedHabitatDescriptor, peer: HabitatLinkPeer): HabitatId {
    const signed = parseSignedHabitatDescriptor(descriptor);
    if (!verifyHabitatDescriptor(signed, this.trustedKeys)) fail("CAPABILITY_DENIED", "habitat descriptor is not trusted");
    if (signed.descriptor.expires < this.now()) fail("CAPABILITY_DENIED", "habitat descriptor has expired");
    if (signed.descriptor.habitat === this.habitat) fail("CAPABILITY_DENIED", "a habitat cannot connect to itself");
    if (!this.peers.has(signed.descriptor.habitat) && this.peers.size >= HABITAT_LINK_HOST_BOUNDS.maxPeers) fail("BUDGET_EXHAUSTED", "peer count exhausted");
    this.peers.set(signed.descriptor.habitat, { descriptor: signed, peer });
    return signed.descriptor.habitat;
  }

  /** Mint a local capability backed by a grant the remote habitat issued to
   * this habitat's principal. The grant is checked here so a bad grant fails
   * at admission, not inside a running organism. */
  admit(input: { capability: typeof HABITAT_INVOKE; grant: HabitatGrant } | { capability: typeof HABITAT_MESSAGE; grant: HabitatGrant; recipient: string }): HabitatLinkCapabilityRecord {
    const grant = parseHabitatGrant(input.grant);
    const required: HabitatGrantPermission = input.capability === HABITAT_INVOKE ? "invoke" : "message";
    if (grant.subject.habitat !== this.habitat) fail("CAPABILITY_DENIED", "grant subject is another habitat");
    if (!this.peers.has(grant.audience)) fail("CAPABILITY_DENIED", "grant audience is not a connected peer");
    if (!verifyHabitatGrant(grant, { now: this.now(), required })) fail("CAPABILITY_DENIED", "grant does not verify");
    if (this.records.size >= HABITAT_LINK_HOST_BOUNDS.maxCapabilities) fail("BUDGET_EXHAUSTED", "habitat-link capability count exhausted");
    const nonce = randomHex(32);
    const recipient = input.capability === HABITAT_MESSAGE ? parseCapabilityHandle(input.recipient, MAILBOX_SEND, "recipient").handle as `cap:mailbox-send:${Digest}` : undefined;
    const base = { capability: input.capability, habitat: grant.audience, principal: grant.subject.principal, nonce, ...(recipient === undefined ? {} : { recipient }) };
    const record: HabitatLinkCapabilityRecord = {
      contract: HABITAT_LINK_CAPABILITY_CONTRACT,
      handle: capabilityHandle(input.capability, capabilityDescriptor({ ...base, grant: grantDigest(grant) })),
      ...base,
      grant,
      revoked: false,
    };
    this.records.set(record.handle, parseHabitatLinkCapabilityRecord(record));
    return structuredClone(record);
  }

  revoke(handle: CapabilityHandle): void {
    const record = this.records.get(parseCapabilityHandle(handle).handle);
    if (!record) fail("CAPABILITY_DENIED", "capability is not admitted");
    record.revoked = true;
  }

  private resolve(handle: unknown, expected: typeof HABITAT_INVOKE | typeof HABITAT_MESSAGE): { record: HabitatLinkCapabilityRecord; peer: HabitatLinkPeer } {
    const parsed = parseCapabilityHandle(handle, expected);
    const record = this.records.get(parsed.handle);
    if (!record || record.revoked) fail("CAPABILITY_DENIED", "habitat-link capability is not active");
    const peer = this.peers.get(record.habitat);
    if (!peer) fail("CAPABILITY_DENIED", "habitat-link peer is not connected");
    if (!verifyHabitatGrant(record.grant, { now: this.now() })) fail("CAPABILITY_DENIED", "habitat-link grant is outside its validity window");
    return { record, peer: peer.peer };
  }

  pendingOperations(): HabitatLinkPending[] {
    return [...this.pending.values()].filter((p) => p.status !== "settled").map((p) => structuredClone(p));
  }

  /** Submit an invocation. Same idempotency key → same operation id, so a
   * retry after a lost acknowledgement is a reconciliation the target
   * answers with `replayed: true`. */
  async invoke(input: { peer: unknown; reply: unknown; application: string; entrypoint: string; manifest: Digest; interface: Digest; args: JsonValue; terms?: Partial<HabitatInvocation["terms"]> }, idempotencyKey: Digest): Promise<HabitatAcceptance> {
    const { record, peer } = this.resolve(input.peer, HABITAT_INVOKE);
    const reply = parseCapabilityHandle(input.reply, MAILBOX_SEND, "reply").handle as `cap:mailbox-send:${Digest}`;
    const operationId = operationIdOf(idempotencyKey);
    const ceiling = record.grant.terms;
    const request = parseHabitatInvocation({
      contract: "algal.habitat-invocation.v1",
      operationId,
      sender: { habitat: this.habitat, principal: record.principal },
      target: { application: input.application, entrypoint: input.entrypoint, manifest: input.manifest, interface: input.interface },
      args: input.args,
      reply: { kind: "poll", reference: operationId },
      terms: { maxWork: input.terms?.maxWork ?? ceiling.maxWork, maxAgentCalls: input.terms?.maxAgentCalls ?? ceiling.maxAgentCalls, maxBytes: input.terms?.maxBytes ?? ceiling.maxBytes, maxHops: input.terms?.maxHops ?? ceiling.maxHops },
      grant: grantDigest(record.grant),
    });
    if (!verifyHabitatGrant(record.grant, { now: this.now(), audience: record.habitat, required: "invoke", invocation: request })) fail("CAPABILITY_DENIED", "invocation exceeds its grant");
    const invocation = habitatInvocationDigest(request);
    const existing = this.pending.get(operationId);
    if (existing !== undefined) {
      if (existing.invocation !== invocation) fail("DIGEST_MISMATCH", "operation id already claims a different invocation");
    } else {
      if (this.pending.size >= HABITAT_LINK_HOST_BOUNDS.maxPending) fail("BUDGET_EXHAUSTED", "pending habitat-link operations exhausted");
      // Intent first: a lost acknowledgement leaves a submitted record to reconcile.
      this.pending.set(operationId, { contract: HABITAT_LINK_PENDING_CONTRACT, operationId, habitat: record.habitat, invocation, reply, status: "submitted" });
    }
    const acceptance = parseHabitatAcceptance(await peer.invoke(request));
    if (acceptance.operationId !== operationId || acceptance.invocation !== invocation || acceptance.target !== record.habitat) fail("DIGEST_MISMATCH", "acceptance does not match the invocation");
    const current = this.pending.get(operationId)!;
    if (current.status === "submitted") { current.status = "accepted"; current.process = acceptance.process; }
    return acceptance;
  }

  async send(input: { peer: unknown; body: JsonValue }, idempotencyKey: Digest): Promise<{ messageId: OperationId; deliveryId: string }> {
    const { record, peer } = this.resolve(input.peer, HABITAT_MESSAGE);
    const messageId = operationIdOf(idempotencyKey);
    const message = parseHabitatMessage({
      contract: "algal.habitat-message.v1",
      messageId,
      sender: { habitat: this.habitat, principal: record.principal },
      recipient: record.recipient,
      body: input.body,
      grant: grantDigest(record.grant),
    });
    if (!verifyHabitatGrant(record.grant, { now: this.now(), audience: record.habitat, required: "message", message })) fail("CAPABILITY_DENIED", "message exceeds its grant");
    const { deliveryId } = await peer.sendMessage(message);
    return { messageId, deliveryId: asString(deliveryId, "deliveryId", 256) };
  }

  /** Poll unsettled operations and deliver terminal results into their reply
   * mailboxes. A transport failure leaves the operation pending; a result
   * that does not name the submitted invocation is rejected. */
  async reconcile(maxPolls = 64): Promise<{ polled: number; settled: number; pending: number }> {
    asInt(maxPolls, "maxPolls", 1, HABITAT_LINK_HOST_BOUNDS.maxReconcilePolls);
    let polled = 0;
    let settled = 0;
    for (const entry of [...this.pending.values()].sort((a, b) => a.operationId.localeCompare(b.operationId))) {
      if (entry.status === "settled") continue;
      if (polled >= maxPolls) break;
      const peer = this.peers.get(entry.habitat);
      if (!peer) continue;
      polled++;
      let result: HabitatResult;
      try { result = parseHabitatResult(await peer.peer.getInvocation(entry.operationId)); }
      catch (error) {
        if (error instanceof AlgalError && (error.uncertain || error.code === "IO_FAILED" || error.code === "STORE_MISS")) continue;
        throw error;
      }
      if (result.operationId !== entry.operationId || result.invocation !== entry.invocation) fail("DIGEST_MISMATCH", "habitat-link result does not match its pending invocation");
      if (entry.status === "submitted") { entry.status = "accepted"; entry.process = result.process; }
      if (result.status === "accepted" || result.status === "running" || result.status === "suspended") continue;
      const reply: HabitatLinkReply = { contract: HABITAT_LINK_REPLY_CONTRACT, operationId: entry.operationId, habitat: entry.habitat, invocation: entry.invocation, result };
      await this.mailboxes.send(entry.reply, reply as unknown as JsonValue, replyKey(entry.operationId));
      entry.status = "settled";
      settled++;
    }
    return { polled, settled, pending: this.pendingOperations().length };
  }

  snapshot(): JsonValue {
    return {
      contract: "algal.habitat-link-service.v1",
      habitat: this.habitat,
      capabilities: [...this.records.values()].map((r) => r as unknown as JsonValue),
      pending: [...this.pending.values()].map((p) => p as unknown as JsonValue),
    };
  }

  /** Restore capabilities and pending operations; peers are live objects and
   * must be connected again by the host. */
  restore(value: unknown): void {
    const obj = asObject(value, "habitat-link snapshot");
    noUnknownKeys(obj, ["contract", "habitat", "capabilities", "pending"], "habitat-link snapshot");
    if (obj.contract !== "algal.habitat-link-service.v1" || obj.habitat !== this.habitat) fail("PARSE_FAILED", "habitat-link snapshot does not belong to this habitat");
    const capabilities = reqField(obj, "capabilities", "habitat-link snapshot");
    const pending = reqField(obj, "pending", "habitat-link snapshot");
    if (!Array.isArray(capabilities) || capabilities.length > HABITAT_LINK_HOST_BOUNDS.maxCapabilities) fail("PARSE_FAILED", "habitat-link snapshot capabilities are out of bounds");
    if (!Array.isArray(pending) || pending.length > HABITAT_LINK_HOST_BOUNDS.maxPending) fail("PARSE_FAILED", "habitat-link snapshot pending operations are out of bounds");
    for (const raw of capabilities) { const record = parseHabitatLinkCapabilityRecord(raw); this.records.set(record.handle, record); }
    for (const raw of pending) {
      const what = "habitat-link pending";
      const p = asObject(raw, what);
      noUnknownKeys(p, ["contract", "operationId", "habitat", "invocation", "reply", "status", "process"], what);
      if (p.contract !== HABITAT_LINK_PENDING_CONTRACT) fail("PARSE_FAILED", `${what}.contract is invalid`);
      const status = asString(reqField(p, "status", what), `${what}.status`, 16);
      if (status !== "submitted" && status !== "accepted" && status !== "settled") fail("PARSE_FAILED", `${what}.status is invalid`);
      const operationId = asString(reqField(p, "operationId", what), `${what}.operationId`, 32);
      if (!/^[0-9a-f]{32}$/.test(operationId)) fail("PARSE_FAILED", `${what}.operationId is invalid`);
      const habitat = asString(reqField(p, "habitat", what), `${what}.habitat`, 34) as HabitatId;
      if (!/^h_[0-9a-f]{32}$/.test(habitat)) fail("PARSE_FAILED", `${what}.habitat is invalid`);
      this.pending.set(operationId, {
        contract: HABITAT_LINK_PENDING_CONTRACT,
        operationId,
        habitat,
        invocation: asDigest(reqField(p, "invocation", what), `${what}.invocation`),
        reply: parseCapabilityHandle(reqField(p, "reply", what), MAILBOX_SEND, `${what}.reply`).handle as `cap:mailbox-send:${Digest}`,
        status,
        ...(p.process === undefined ? {} : { process: asSafeId(p.process, `${what}.process`) }),
      });
    }
  }

  /** Tools an organism reaches through host-admitted `cap` ports. */
  tools(): ToolRegistry {
    return new Map([
      [
        HABITAT_INVOKE_TOOL,
        {
          configurationDigest: digestCanonical({ contract: "algal.process-tool-binding.v1", tool: HABITAT_INVOKE_TOOL, driver: "builtin" }),
          signature: {
            inputs: {
              peer: { type: "cap", capability: HABITAT_INVOKE },
              reply: { type: "cap", capability: MAILBOX_SEND },
              application: { type: "text" },
              entrypoint: { type: "text" },
              manifest: { type: "text" },
              interface: { type: "text" },
              args: { type: "json" },
            },
            outputs: { operationId: { type: "text" }, invocation: { type: "text" }, status: { type: "text" }, replayed: { type: "json" } },
            effect: "write" as const,
            cost: 1_000,
            maxOutputBytes: 512,
          },
          tool: async (inputs, context) => {
            const acceptance = await this.invoke({
              peer: inputs.peer,
              reply: inputs.reply,
              application: asString(inputs.application, "application", 64),
              entrypoint: asString(inputs.entrypoint, "entrypoint", 64),
              manifest: asDigest(inputs.manifest, "manifest"),
              interface: asDigest(inputs.interface, "interface"),
              args: asJsonValue(inputs.args, "args"),
            }, context.idempotencyKey);
            return { operationId: acceptance.operationId, invocation: acceptance.invocation, status: acceptance.status, replayed: acceptance.replayed };
          },
        },
      ],
      [
        HABITAT_SEND_TOOL,
        {
          configurationDigest: digestCanonical({ contract: "algal.process-tool-binding.v1", tool: HABITAT_SEND_TOOL, driver: "builtin" }),
          signature: {
            inputs: { peer: { type: "cap", capability: HABITAT_MESSAGE }, body: { type: "json" } },
            outputs: { messageId: { type: "text" }, deliveryId: { type: "text" } },
            effect: "write" as const,
            cost: 100,
            maxOutputBytes: 512,
          },
          tool: async (inputs, context) => this.send({ peer: inputs.peer, body: asJsonValue(inputs.body, "body") }, context.idempotencyKey),
        },
      ],
    ]);
  }
}

export type LocalHabitatAcceptorOptions = {
  habitat: HabitatId;
  supervisor: ProcessSupervisor;
  mailboxes: MailboxService;
  now: () => number;
  /** Grant issuer keys this habitat honors. */
  trustedKeys: readonly string[];
};

type AcceptedInvocation = { operationId: OperationId; invocation: Digest; process: string; request: HabitatInvocation; failed?: boolean };

/** Target-side reference acceptor. Applications are registered by name with
 * entrypoint organisms; every entrypoint must declare an interface, which is
 * the only way invocation args enter and results leave. */
export class LocalHabitatAcceptor implements HabitatLinkPeer {
  readonly habitat: HabitatId;
  private readonly supervisor: ProcessSupervisor;
  private readonly mailboxes: MailboxService;
  private readonly now: () => number;
  private readonly trustedKeys: readonly string[];
  private readonly grants = new Map<Digest, HabitatGrant>();
  private readonly revokedGrants = new Set<Digest>();
  private readonly applications = new Map<string, Map<string, { manifest: OrganismManifest; hostArgs: Record<string, Record<string, JsonValue>> }>>();
  private readonly accepted = new Map<OperationId, AcceptedInvocation>();

  constructor(options: LocalHabitatAcceptorOptions) {
    if (!/^h_[0-9a-f]{32}$/.test(options.habitat)) fail("PARSE_FAILED", "habitat must be h_<32 lowercase hex>");
    this.habitat = options.habitat;
    this.supervisor = options.supervisor;
    this.mailboxes = options.mailboxes;
    this.now = options.now;
    this.trustedKeys = [...options.trustedKeys];
    if (this.trustedKeys.length > HABITAT_LINK_HOST_BOUNDS.maxTrustedKeys) fail("BUDGET_EXHAUSTED", "too many trusted keys");
  }

  /** Enroll a grant this habitat issued (or a trusted issuer issued for it). */
  enroll(grant: HabitatGrant): Digest {
    const parsed = parseHabitatGrant(grant);
    if (parsed.audience !== this.habitat) fail("CAPABILITY_DENIED", "grant audience is another habitat");
    if (!verifyHabitatGrant(parsed, { trustedKeys: this.trustedKeys })) fail("CAPABILITY_DENIED", "grant is not signed by a trusted issuer");
    const digest = grantDigest(parsed);
    if (this.revokedGrants.has(digest)) fail("CAPABILITY_DENIED", "grant was revoked");
    if (!this.grants.has(digest) && this.grants.size + this.revokedGrants.size >= HABITAT_LINK_HOST_BOUNDS.maxCapabilities) fail("BUDGET_EXHAUSTED", "enrolled grant count exhausted");
    this.grants.set(digest, parsed);
    return digest;
  }

  revoke(grant: Digest): void {
    const digest = asDigest(grant, "grant");
    if (!this.grants.has(digest)) return;
    this.grants.delete(digest);
    this.revokedGrants.add(digest);
  }

  /** Register an entrypoint. `hostArgs` are process args this habitat binds
   * itself (its own capabilities, for instance); a remote caller can neither
   * supply nor override them. */
  register(application: string, entrypoint: string, manifest: OrganismManifest, hostArgs: Record<string, Record<string, JsonValue>> = {}): { manifest: Digest; interface: Digest } {
    asSafeId(application, "application");
    asSafeId(entrypoint, "entrypoint");
    const iface = interfaceDigest(manifest);
    for (const [cell, ports] of Object.entries(asObject(hostArgs, "hostArgs"))) { asSafeId(cell, "hostArgs cell"); for (const port of Object.keys(asObject(ports, "hostArgs ports"))) asSafeId(port, "hostArgs port"); }
    let entrypoints = this.applications.get(application);
    if (!entrypoints) {
      if (this.applications.size >= HABITAT_LINK_HOST_BOUNDS.maxApplications) fail("BUDGET_EXHAUSTED", "application count exhausted");
      entrypoints = new Map();
      this.applications.set(application, entrypoints);
    }
    if (!entrypoints.has(entrypoint) && entrypoints.size >= HABITAT_LINK_HOST_BOUNDS.maxEntrypoints) fail("BUDGET_EXHAUSTED", "entrypoint count exhausted");
    entrypoints.set(entrypoint, { manifest, hostArgs: structuredClone(hostArgs) });
    return { manifest: digestCanonical(manifestToJson(manifest)), interface: iface };
  }

  private grantFor(digest: Digest, check: Parameters<typeof verifyHabitatGrant>[1]): HabitatGrant {
    const grant = this.grants.get(digest);
    if (!grant) fail("CAPABILITY_DENIED", "grant is not enrolled");
    if (!verifyHabitatGrant(grant, { trustedKeys: this.trustedKeys, now: this.now(), audience: this.habitat, ...check })) fail("CAPABILITY_DENIED", "grant does not cover this request");
    return grant;
  }

  async invoke(request: HabitatInvocation): Promise<HabitatAcceptance> {
    const invocation = parseHabitatInvocation(request);
    this.grantFor(invocation.grant, { required: "invoke", invocation });
    return hostLease(join(this.supervisor.dir, ".habitat-link-acceptance"), "habitat-link", () => this.invokeLocked(invocation), SHARED_LEASE_RETRY);
  }

  private async invokeLocked(request: HabitatInvocation): Promise<HabitatAcceptance> {
    const invocation = parseHabitatInvocation(request);
    const digest = habitatInvocationDigest(invocation);
    this.grantFor(invocation.grant, { required: "invoke", invocation });
    const existing = this.accepted.get(invocation.operationId);
    if (existing !== undefined) {
      if (existing.invocation !== digest) fail("RECEIPT_MISMATCH", "operation id was reused with a different invocation");
      return { contract: "algal.habitat-acceptance.v1", operationId: invocation.operationId, invocation: digest, status: "accepted", target: this.habitat, process: existing.process, replayed: true };
    }
    const registered = this.applications.get(invocation.target.application)?.get(invocation.target.entrypoint);
    if (!registered) fail("CAPABILITY_DENIED", "target application entrypoint is not registered");
    const { manifest, hostArgs } = registered;
    if (digestCanonical(manifestToJson(manifest)) !== invocation.target.manifest) fail("DIGEST_MISMATCH", "target manifest digest does not match the registered entrypoint");
    if (interfaceDigest(manifest) !== invocation.target.interface) fail("INTERFACE_MISMATCH", "target interface digest does not match the registered entrypoint");
    if (manifest.budgets.maxWork > invocation.terms.maxWork || manifest.budgets.maxAgentCalls > invocation.terms.maxAgentCalls) fail("BUDGET_EXHAUSTED", "entrypoint budget exceeds invocation terms");
    if (this.accepted.size >= HABITAT_LINK_HOST_BOUNDS.maxAcceptedInvocations) fail("BUDGET_EXHAUSTED", "accepted invocation capacity exhausted");
    const iface = manifest.interface!;
    const args = asObject(invocation.args, "invocation args");
    const processArgs: Record<string, Record<string, JsonValue>> = structuredClone(hostArgs);
    for (const [name, value] of Object.entries(args)) {
      const binding = iface.inputs[name];
      if (!binding) fail("INPUT_MISSING", `invocation args name an undeclared interface input "${name}"`);
      if (processArgs[binding.cell]?.[binding.port] !== undefined) fail("CAPABILITY_DENIED", `interface input "${name}" is bound by the host`);
      (processArgs[binding.cell] ??= {})[binding.port] = value;
    }
    const process = `link-${invocation.operationId}`;
    // The durable process is the acceptance record. After a restart the
    // in-memory index is empty, so a retried invocation is matched against
    // the pinned process on disk and replays instead of colliding.
    let replayed = false;
    const bindingDirectory = join(this.supervisor.dir, "habitat-link", "invocations");
    const bindingPath = join(bindingDirectory, `${invocation.operationId}.json`);
    const bound = await hostRead(bindingPath, HABITAT_LINK_BOUNDS.maxRecordBytes);
    if (bound !== undefined && habitatInvocationDigest(parseHabitatInvocation(bound)) !== digest) fail("RECEIPT_MISMATCH", "operation id was reused with a different invocation");
    const prior = await this.existingProcess(process);
    if (bound === undefined) {
      // A legacy process without the complete signed request cannot prove ownership.
      if (prior !== undefined) fail("RECEIPT_MISMATCH", "process lacks a durable Habitat Link invocation binding");
      const names = await hostNames(bindingDirectory, HABITAT_LINK_HOST_BOUNDS.maxAcceptedInvocations, /^[0-9a-f]{32}\.json$/);
      if (names.length >= HABITAT_LINK_HOST_BOUNDS.maxAcceptedInvocations) fail("BUDGET_EXHAUSTED", "accepted invocation capacity exhausted");
      try { await hostWrite(bindingPath, invocation as unknown as JsonValue, HABITAT_LINK_BOUNDS.maxRecordBytes); }
      catch (error) { if (error instanceof AlgalError && error.code === "DIGEST_MISMATCH") fail("RECEIPT_MISMATCH", "operation id was reused with a different invocation"); throw error; }
    }
    if (prior !== undefined) {
      if (prior.manifestDigest !== invocation.target.manifest || digestCanonical(prior.args) !== digestCanonical(processArgs)) fail("RECEIPT_MISMATCH", "operation id was reused with a different invocation");
      replayed = true;
    } else {
      this.grantFor(invocation.grant, { required: "invoke", invocation });
      await this.supervisor.create(process, manifest, processArgs);
    }
    this.accepted.set(invocation.operationId, { operationId: invocation.operationId, invocation: digest, process, request: invocation });
    return { contract: "algal.habitat-acceptance.v1", operationId: invocation.operationId, invocation: digest, status: "accepted", target: this.habitat, process, replayed };
  }

  private async existingProcess(name: string): Promise<{ manifestDigest: Digest; args: Record<string, Record<string, JsonValue>> } | undefined> {
    try {
      const snapshot = await this.supervisor.inspect(name);
      return { manifestDigest: snapshot.process.manifestDigest, args: snapshot.process.args };
    } catch (error) {
      if (error instanceof AlgalError && (error.code === "STORE_MISS" || error.code === "IO_FAILED")) return undefined;
      throw error;
    }
  }

  private async acceptedInvocation(operationId: OperationId): Promise<AcceptedInvocation> {
    if (!/^[0-9a-f]{32}$/.test(operationId)) fail("PARSE_FAILED", "invalid operation id");
    const existing = this.accepted.get(operationId);
    if (existing) return existing;
    const value = await hostRead(join(this.supervisor.dir, "habitat-link", "invocations", `${operationId}.json`), HABITAT_LINK_BOUNDS.maxRecordBytes);
    if (value === undefined) fail("STORE_MISS", "habitat-link invocation not found");
    const request = parseHabitatInvocation(value);
    if (request.operationId !== operationId) fail("RECEIPT_MISMATCH", "invocation binding names another operation");
    const entry = { operationId, invocation: habitatInvocationDigest(request), process: `link-${operationId}`, request };
    const process = await this.existingProcess(entry.process);
    if (process === undefined) fail("STORE_MISS", "habitat-link invocation has not been accepted");
    const registered = this.applications.get(request.target.application)?.get(request.target.entrypoint);
    if (!registered || digestCanonical(manifestToJson(registered.manifest)) !== request.target.manifest) fail("CAPABILITY_DENIED", "invocation entrypoint is no longer registered");
    const expectedArgs = structuredClone(registered.hostArgs);
    for (const [name, value] of Object.entries(asObject(request.args, "invocation args"))) {
      const binding = registered.manifest.interface!.inputs[name];
      if (!binding || expectedArgs[binding.cell]?.[binding.port] !== undefined) fail("CAPABILITY_DENIED", "invalid retained invocation input");
      (expectedArgs[binding.cell] ??= {})[binding.port] = value;
    }
    if (process.manifestDigest !== request.target.manifest || digestCanonical(process.args) !== digestCanonical(expectedArgs)) fail("RECEIPT_MISMATCH", "process does not match its retained invocation");
    return entry;
  }

  /** Network reads require the same enrolled grant and subject as submission. */
  async queryInvocation(operationId: OperationId, grant: Digest, sender: HabitatInvocation["sender"]): Promise<HabitatResult> {
    const entry = await this.acceptedInvocation(operationId);
    if (entry.request.grant !== grant || entry.request.sender.habitat !== sender.habitat || entry.request.sender.principal !== sender.principal) fail("CAPABILITY_DENIED", "query does not own this invocation");
    this.grantFor(grant, { required: "invoke", invocation: entry.request });
    return this.getInvocation(operationId);
  }

  async getInvocation(operationId: OperationId): Promise<HabitatResult> {
    const entry = await this.acceptedInvocation(operationId);
    const result: HabitatResult = { contract: "algal.habitat-result.v1", operationId: entry.operationId, invocation: entry.invocation, status: "accepted", process: entry.process };
    const snapshot = await this.supervisor.inspect(entry.process);
    const status = snapshot.process.status;
    result.status = status === "ready" ? "accepted" : status === "stuck" ? "failed" : status;
    if (snapshot.process.receipt !== undefined) result.receipt = snapshot.process.receipt;
    if (result.status === "complete" && snapshot.process.receipt !== undefined) {
      const receipt = await this.supervisor.store.getReceipt(snapshot.process.receipt) as RunReceipt | undefined;
      if (receipt !== undefined) {
        const outputs: Record<string, JsonValue> = {};
        const iface = this.interfaceOf(receipt.manifestDigest);
        for (const [name, binding] of Object.entries(iface.outputs)) {
          const value = receipt.cells[binding.cell]?.outputs?.[binding.port];
          if (value !== undefined) outputs[name] = value;
        }
        if (canonicalBytes(outputs) > HABITAT_LINK_BOUNDS.maxOutputsBytes) fail("BUDGET_EXHAUSTED", "invocation outputs exceed the result bound");
        result.outputs = outputs;
      }
    }
    return parseHabitatResult(result);
  }

  private interfaceOf(manifestDigest: Digest): NonNullable<OrganismManifest["interface"]> {
    for (const entrypoints of this.applications.values())
      for (const { manifest } of entrypoints.values())
        if (digestCanonical(manifestToJson(manifest)) === manifestDigest) return manifest.interface!;
    fail("STORE_MISS", "invocation manifest is no longer registered");
  }

  /** Durable message acknowledgment shared by native and hosted profiles. */
  async acceptMessage(message: HabitatMessage): Promise<JsonValue> {
    const parsed = parseHabitatMessage(message);
    this.grantFor(parsed.grant, { required: "message", message: parsed });
    return hostLease(join(this.supervisor.dir, ".habitat-link-acceptance"), "habitat-link", () => this.acceptMessageLocked(parsed), SHARED_LEASE_RETRY);
  }

  private async acceptMessageLocked(message: HabitatMessage): Promise<JsonValue> {
    const parsed = parseHabitatMessage(message);
    this.grantFor(parsed.grant, { required: "message", message: parsed });
    const directory = join(this.supervisor.dir, "habitat-link", "messages");
    const path = join(directory, `${parsed.messageId}.json`);
    const prior = await hostRead(path, HABITAT_LINK_BOUNDS.maxRecordBytes);
    const digest = digestCanonical(parsed as unknown as JsonValue);
    if (prior !== undefined) {
      const record = asObject(prior, "message acceptance");
      if (record.message !== digest) fail("RECEIPT_MISMATCH", "message id was reused with a different envelope");
      return { ...record, replayed: true };
    }
    const names = await hostNames(directory, HABITAT_LINK_HOST_BOUNDS.maxAcceptedInvocations, /^[0-9a-f]{32}\.json$/);
    if (names.length >= HABITAT_LINK_HOST_BOUNDS.maxAcceptedInvocations) fail("BUDGET_EXHAUSTED", "accepted message capacity exhausted");
    const { deliveryId } = await this.sendMessage(parsed);
    const record = { contract: "algal.habitat-message-acceptance.v1", messageId: parsed.messageId, message: digest, target: this.habitat, delivery: deliveryId, status: "accepted", replayed: false };
    await hostWrite(path, record, HABITAT_LINK_BOUNDS.maxRecordBytes);
    return record;
  }

  async sendMessage(message: HabitatMessage): Promise<{ deliveryId: string }> {
    const parsed = parseHabitatMessage(message);
    this.grantFor(parsed.grant, { required: "message", message: parsed });
    const { id } = await this.mailboxes.send(parsed.recipient, parsed as unknown as JsonValue, messageIdempotencyKey(parsed.messageId));
    return { deliveryId: id };
  }
}
