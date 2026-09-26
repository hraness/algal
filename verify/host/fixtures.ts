// Deterministic fixtures for the host-conformance harness. Every value here is
// fixed data or a pure builder — no clocks, randomness, filesystem, subprocess,
// or network. Builders that need a store take one as a parameter.
//
// The fixtures deliberately model contract violations: oversized streams before
// allocation, a response that resolves after its deadline, stale/mismatched
// configuration digests, cancellation mid-stream, and an uncertain-completion
// marker (an acknowledged send whose caller never saw the reply).

import { putApplicationRecord } from "../../src/application-contract";
import { parseOrganismManifest, manifestToJson, type OrganismManifest } from "../../src/contract";
import { digestCanonical, type Digest } from "../../src/digest";
import type { EffectRequest } from "../../src/effects";
import type { MailboxConfig, MailboxService } from "../../src/mailbox";
import { MemoryStore } from "../../src/store-memory";
import type { Store } from "../../src/store-contract";
import type { JsonValue } from "../../src/values";

// ------------------------------------------------------------ manifests ---

/** Raw manifest documents for `parseOrganismManifest`. Kept as data so the
 * digest of each admitted form is computable without running the parser. */
export const MANIFEST_AGENT_TEXT = {
  contract: "algal.organism.v1",
  key: "organism:host-conformance-agent",
  name: "Host conformance agent",
  cells: [
    {
      id: "answer",
      kind: "agent",
      prompt: "Return the admitted fixture output.",
      output: { kind: "text" },
    },
  ],
  edges: [],
} as const;

export const MANIFEST_AGENT_JSON = {
  contract: "algal.organism.v1",
  key: "organism:host-conformance-agent-json",
  name: "Host conformance agent (json)",
  cells: [
    {
      id: "answer",
      kind: "agent",
      prompt: "Return the admitted fixture output.",
      output: {
        kind: "json",
        schema: { type: "object", required: ["summary"], properties: { summary: { type: "string" } } },
      },
    },
  ],
  edges: [],
} as const;

/** Permissive `type:"object"` schema — admits any object so cyclic/exotic
 * values reach the canonicalization and receipt-admission stages. */
export const MANIFEST_AGENT_OPEN_JSON = {
  contract: "algal.organism.v1",
  key: "organism:host-conformance-agent-open-json",
  name: "Host conformance agent (open json)",
  cells: [
    {
      id: "answer",
      kind: "agent",
      prompt: "Return the admitted fixture output.",
      output: { kind: "json", schema: { type: "object" } },
    },
  ],
  edges: [],
} as const;

/** Agent cell with a per-call deadline and retry headroom — the fixture for
 * "a deadline violation must not be retried" (the retry declaration exists to
 * prove the runtime declines to use it). */
export const MANIFEST_AGENT_DEADLINE = {
  contract: "algal.organism.v1",
  key: "organism:host-conformance-deadline",
  name: "Host conformance deadline",
  cells: [
    {
      id: "answer",
      kind: "agent",
      prompt: "Return the admitted fixture output.",
      output: { kind: "text" },
      budget: { maxEffectMs: 25 },
      retry: { attempts: 4 },
    },
  ],
  edges: [],
} as const;

export const MANIFEST_AGENT_ROUTED = {
  contract: "algal.organism.v1",
  key: "organism:host-conformance-routed",
  name: "Host conformance routed agent",
  cells: [
    {
      id: "answer",
      kind: "agent",
      prompt: "Return the admitted fixture output.",
      output: { kind: "text" },
      route: { provider: "trusted" },
    },
  ],
  edges: [],
} as const;

export const MANIFEST_TOOL = {
  contract: "algal.organism.v1",
  key: "organism:host-conformance-tool",
  name: "Host conformance tool",
  cells: [{ id: "probe", kind: "tool", tool: "probe" }],
  edges: [],
} as const;

export const MANIFEST_TOOL_DEADLINE = {
  contract: "algal.organism.v1",
  key: "organism:host-conformance-tool-deadline",
  name: "Host conformance tool deadline",
  cells: [{ id: "probe", kind: "tool", tool: "probe", budget: { maxEffectMs: 25 } }],
  edges: [],
} as const;

export const MANIFEST_DECIDE = {
  contract: "algal.organism.v1",
  key: "organism:host-conformance-decide",
  name: "Host conformance decide",
  cells: [
    {
      id: "judgement",
      kind: "decide",
      questions: {
        keep: { type: "noul", instructions: "Is the fixture worth keeping?" },
      },
    },
  ],
  edges: [],
} as const;

export const MANIFEST_GATE = {
  contract: "algal.organism.v1",
  key: "organism:host-conformance-gate",
  name: "Host conformance gate",
  cells: [
    {
      id: "approve",
      kind: "gate",
      prompt: "Approve the fixture?",
      output: { kind: "choice", labels: ["yes", "no"] },
    },
  ],
  edges: [],
} as const;

/** The manifest a `via` cell asks a transport to resolve. The harness never
 * installs it: the point is that a transport cannot supply it dishonestly. */
export const MANIFEST_REMOTE_TARGET = {
  contract: "algal.organism.v1",
  key: "organism:host-conformance-remote-target",
  name: "Remote target",
  cells: [{ id: "done", kind: "const", outputs: { value: { type: "text", value: "remote" } } }],
  edges: [],
} as const;

/** The bundle the dishonest transport actually serves — a valid bundle rooted
 * at a different manifest than the one requested. */
export const MANIFEST_REMOTE_OTHER = {
  contract: "algal.organism.v1",
  key: "organism:host-conformance-remote-other",
  name: "Remote other",
  cells: [{ id: "done", kind: "const", outputs: { value: { type: "text", value: "other" } } }],
  edges: [],
} as const;

export function parsedManifest(document: unknown): OrganismManifest {
  return parseOrganismManifest(structuredClone(document));
}

export function manifestDigest(document: unknown): Digest {
  return digestCanonical(manifestToJson(parsedManifest(document)));
}

/** A `via`-cell manifest asking for the remote target through transport "net". */
export function manifestWithViaCell(): { manifest: OrganismManifest; wanted: Digest } {
  const wanted = manifestDigest(MANIFEST_REMOTE_TARGET);
  const manifest = parsedManifest({
    contract: "algal.organism.v1",
    key: "organism:host-conformance-via",
    name: "Host conformance via cell",
    cells: [{ id: "remote", kind: "organism", manifest: wanted, via: "net" }],
    edges: [],
  });
  return { manifest, wanted };
}

// ------------------------------------------------------------- digests ----

export const DIGEST_A: Digest = digestCanonical({ fixture: "host-conformance-a" });
export const DIGEST_B: Digest = digestCanonical({ fixture: "host-conformance-b" });

/** The recorded run's `configurationDigest` (preflight) and the digest the
 * execute path actually reports — the stale-config pair. */
export const CONFIG_DIGEST_RECORDED: Digest = digestCanonical({ configuration: "preflight" });
export const CONFIG_DIGEST_REPORTED: Digest = digestCanonical({ configuration: "reported" });

// ----------------------------------------------------- effect fixtures ----

export function fixtureRequest(overrides: Partial<EffectRequest> = {}): EffectRequest {
  return {
    contract: "algal.effect.v1",
    cellId: "answer",
    kind: "agent",
    prompt: "Return the admitted fixture output.",
    context: { inputs: {} },
    output: { kind: "text" },
    budget: { maxContextBytes: 65_536, maxOutputBytes: 65_536 },
    ...overrides,
  };
}

/** Exceeds the default maxOutputBytes (65_536) — the oversized-output probe. */
export const OVERSIZED_OUTPUT = "x".repeat(70_000);

/** Usage metadata an honest executor never reports; every entry must fail
 * receipt admission (PARSE_FAILED) rather than silently mint. */
export const MALFORMED_USAGES: { name: string; usage: unknown }[] = [
  { name: "negative-tokens-in", usage: { tokensIn: -1 } },
  { name: "negative-tokens-out", usage: { tokensOut: -5 } },
  { name: "fractional-tokens", usage: { tokensIn: 1.5 } },
  { name: "infinite-tokens", usage: { tokensIn: Number.POSITIVE_INFINITY } },
  { name: "unsafe-tokens", usage: { tokensOut: Number.MAX_SAFE_INTEGER + 1 } },
  { name: "string-tokens", usage: { tokensIn: "1000" } },
  { name: "oversized-model", usage: { model: "m".repeat(200) } },
  { name: "unknown-usage-key", usage: { billed_usd: 0.02 } },
];

/** A credential-shaped string. Nothing in this suite is a real credential; the
 * fixture exists to prove metadata fields outside the contract never reach a
 * receipt and that redaction does not expose a key. */
export const SECRET_LIKE = "sk-host-conformance-not-a-real-key-0123456789";

/** Non-JSON executor results — none may appear on a minted receipt. */
export function exoticOutputs(): { name: string; output: unknown }[] {
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  return [
    { name: "undefined-output", output: undefined },
    { name: "undefined-member", output: { summary: undefined } },
    { name: "function-member", output: { summary: () => "ok" } },
    { name: "bigint-member", output: { summary: 7n } },
    { name: "cyclic", output: cyclic },
  ];
}

/** Effect-receipt documents that must fail `parseEffectReceipt` admission. */
export function malformedReceipts(): { name: string; receipt: unknown }[] {
  const digest = DIGEST_A;
  return [
    { name: "requestDigest-not-a-digest", receipt: { requestDigest: "sha256:nope", executor: "e", output: 1 } },
    { name: "output-and-error", receipt: { requestDigest: digest, executor: "e", output: 1, error: { code: "EFFECT_FAILED", message: "m" } } },
    { name: "neither-output-nor-error", receipt: { requestDigest: digest, executor: "e" } },
    { name: "cached-false", receipt: { requestDigest: digest, executor: "e", output: 1, cached: false } },
    { name: "retryable-true", receipt: { requestDigest: digest, executor: "e", output: 1, retryable: true } },
    {
      name: "wake-without-suspension",
      receipt: {
        requestDigest: digest, executor: "e",
        error: { code: "EFFECT_FAILED", message: "m" },
        wake: [`cap:mailbox-send:${DIGEST_B}`],
      },
    },
    { name: "executor-over-256", receipt: { requestDigest: digest, executor: "e".repeat(300), output: 1 } },
    { name: "unknown-receipt-key", receipt: { requestDigest: digest, executor: "e", output: 1, secret: SECRET_LIKE } },
    { name: "unknown-error-code", receipt: { requestDigest: digest, executor: "e", error: { code: "NOT_A_CODE", message: "m" } } },
    { name: "configurationDigest-not-a-digest", receipt: { requestDigest: digest, executor: "e", output: 1, configurationDigest: "sha256:zz" } },
    { name: "usage-negative", receipt: { requestDigest: digest, executor: "e", output: 1, usage: { tokensIn: -1 } } },
  ];
}

/** Tool-signature documents that must fail `parseToolSignature` admission. */
export function malformedToolSignatures(): { name: string; signature: unknown }[] {
  const base = {
    inputs: {},
    outputs: { result: { type: "text" } },
    effect: "read",
    cost: 10,
    maxOutputBytes: 1024,
  };
  return [
    { name: "negative-cost", signature: { ...base, cost: -1 } },
    { name: "cost-over-bound", signature: { ...base, cost: 1_000_001 } },
    { name: "fractional-cost", signature: { ...base, cost: 0.5 } },
    { name: "string-cost", signature: { ...base, cost: "10" } },
    { name: "unknown-effect-class", signature: { ...base, effect: "exec" } },
    { name: "zero-output-bound", signature: { ...base, maxOutputBytes: 0 } },
    { name: "output-over-port-bound", signature: { ...base, maxOutputBytes: 262_145 } },
    { name: "unknown-key", signature: { ...base, api_key: SECRET_LIKE } },
    { name: "missing-effect", signature: { inputs: {}, outputs: {}, cost: 0, maxOutputBytes: 8 } },
  ];
}

// ------------------------------------------------------------- streams ----

/** A stream that overflows the byte bound partway: chunk sizes are fixed. */
export function overflowStream(chunkBytes: number, chunks: number): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent++ < chunks) controller.enqueue(new Uint8Array(chunkBytes).fill(0x41));
      else controller.close();
    },
  });
}

/** A stream that yields one chunk then never produces again — the vehicle for
 * cancellation-during-stream. `cancelled` flips when the reader cancels. */
export function cancellableStream(): { stream: ReadableStream<Uint8Array>; cancelled: () => boolean } {
  let flag = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(16).fill(0x42));
    },
    pull() {
      // Never yields again: the second read stays pending until cancel.
    },
    cancel() {
      flag = true;
    },
  });
  return { stream, cancelled: () => flag };
}

/** Host-event input for the durable-outbound seam. Delivery identity is
 * (source, deliveryId); `dueAtMs` is the wall-clock eligibility field. */
export function hostEventInput(
  mailbox: MailboxConfig,
  overrides: Partial<{ source: string; deliveryId: string; payload: JsonValue; dueAtMs: number }> = {},
) {
  return {
    source: "conformance",
    deliveryId: "delivery-1",
    target: mailbox.send,
    payload: { probe: 1 } as JsonValue,
    ...overrides,
  };
}

// -------------------------------------------------------------- memory ----

/** Minimal memory-service records over a supplied store, mirroring the
 * observation-bridge fixture: schema → frontier → scope → procedure → decoder.
 * The admission host supplied to the service is what the case varies. */
export type MemoryFixture = {
  store: Store;
  application: string;
  schema: Digest;
  frontier: Digest;
  scope: Digest;
  procedure: Digest;
  decoder: Digest;
  attestation: Digest;
  raw: Digest;
  receipt: Digest;
  observationInput: {
    application: string;
    scope: Digest;
    procedure: Digest;
    raw: Digest;
    receipt: Digest;
    decoder: Digest;
  };
};

export async function memoryFixture(store: Store = new MemoryStore()): Promise<MemoryFixture> {
  const application = "workspace";
  const schema = await store.putValue({
    contract: "algal.application-memory-schema.v1",
    relations: [{ name: "available", arity: 1 }],
  });
  const frontier = await putApplicationRecord(store, {
    contract: "algal.application-memory-frontier.v1",
    application,
    previous: null,
    sequence: 0,
    mutation: null,
    status: "settled",
  });
  const manifest = await store.putManifest(parsedManifest({
    contract: "algal.organism.v1",
    key: "organism:host-conformance-memory",
    name: "memory fixture",
    cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }],
    edges: [],
  }));
  const decoder = await store.putValue({ contract: "algal.fixture-decoder.v1" });
  const procedure = await store.putValue({
    contract: "algal.application-memory-procedure.v1",
    id: "probe",
    schema,
    manifest,
    decoder,
    dependencies: [],
    prerequisite: null,
  });
  const attestation = await store.putValue({ contract: "algal.fixture-attestation.v1" });
  const scope = await store.putValue({
    contract: "algal.application-memory-scope.v1",
    application,
    environment: "fixture",
    task: "task-1",
    frontier,
    bindings: [],
    completeFor: [procedure],
    attestation,
  });
  const raw = await store.putValue({ contract: "algal.fixture-probe-raw.v1", value: 3 });
  const receipt = await store.putValue({ contract: "algal.fixture-receipt.v1", value: 3 });
  return {
    store,
    application,
    schema,
    frontier,
    scope,
    procedure,
    decoder,
    attestation,
    raw,
    receipt,
    observationInput: { application, scope, procedure, raw, receipt, decoder },
  };
}

export const VALID_CLAIM = { relation: "available", tuple: ["tool"], polarity: "supported" } as const;

/** A claim parse rejects (bad polarity), one the schema check rejects
 * (undeclared relation), and the over-limit decode (33 > 32 bound). */
export const MALFORMED_CLAIM = { relation: "available", tuple: ["tool"], polarity: "certain" };
export const UNDECLARED_CLAIM = { relation: "absent", tuple: ["tool"], polarity: "supported" };
export function claimOverflow(): unknown[] {
  return Array.from({ length: 33 }, () => ({ ...VALID_CLAIM }));
}

/** A deterministic query-engine stand-in: always incomplete. The memory
 * service only needs `identity` and the three methods to be shaped right. */
export function fixtureEngine(identity: Digest = DIGEST_B) {
  return {
    identity,
    async query(): Promise<never> {
      throw new Error("fixture engine does not run queries");
    },
    async verify(): Promise<boolean> {
      throw new Error("fixture engine does not verify");
    },
    async settle(): Promise<void> {},
  };
}

// ------------------------------------------------------------- mailbox ----

/** A MailboxService wrapper that performs the real send, then reports the
 * acknowledgement as lost — the uncertain-completion fixture. The sent message
 * is durably queued; the caller only sees the thrown error. */
export function lostAckMailboxes(inner: MailboxService): MailboxService & { sentKeys: Digest[] } {
  const sentKeys: Digest[] = [];
  return {
    sentKeys,
    create: (name, options) => inner.create(name, options),
    list: () => inner.list(),
    inspect: (name) => inner.inspect(name),
    revoke: (handle) => inner.revoke(handle),
    receive: (handle) => inner.receive(handle),
    hasPending: (handle) => inner.hasPending(handle),
    async send(handle, value, key) {
      await inner.send(handle, value, key);
      sentKeys.push(key);
      throw new Error("fixture: send acknowledgement lost after durable send");
    },
  };
}

/** A MailboxService wrapper whose send blocks on a caller-controlled gate —
 * the vehicle for cancellation landing while a send is in flight. */
export function gatedMailboxes(inner: MailboxService): MailboxService & {
  entered: Promise<void>;
  release(): void;
} {
  let enterSend: () => void = () => {};
  let releaseSend: () => void = () => {};
  const entered = new Promise<void>((r) => (enterSend = r));
  const release = new Promise<void>((r) => (releaseSend = r));
  return {
    entered,
    release: () => releaseSend(),
    create: (name, options) => inner.create(name, options),
    list: () => inner.list(),
    inspect: (name) => inner.inspect(name),
    revoke: (handle) => inner.revoke(handle),
    receive: (handle) => inner.receive(handle),
    hasPending: (handle) => inner.hasPending(handle),
    async send(handle, value, key) {
      enterSend(); // "sending" is already published at this point
      await release;
      return inner.send(handle, value, key);
    },
  };
}
