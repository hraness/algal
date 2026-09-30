import { digestCanonical, asDigest, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { canonicalBytes, asJsonValue, asObject, asString, noUnknownKeys, type JsonValue } from "./values";
import { parseCapabilityHandle } from "./capabilities";

export const HABITAT_LINK_CONTRACT = "algal.habitat-link.v1" as const;
export const HABITAT_LINK_BOUNDS = Object.freeze({
  maxRecordBytes: 262_144,
  maxBodyBytes: 262_144,
  maxDescriptorTransports: 4,
  maxTransportUrl: 2_048,
  maxPrincipalLength: 64,
  maxReplyReference: 128,
  maxWork: 1_000_000,
  maxAgentCalls: 128,
  maxBytes: 8_388_608,
  maxHops: 16,
  maxOutputsBytes: 262_144,
});

export type HabitatId = `h_${string}`;
export type OperationId = string;
export type LinkStatus = "accepted" | "running" | "suspended" | "complete" | "failed" | "uncertain" | "cancelled";

export type HabitatDescriptor = {
  contract: "algal.habitat-descriptor.v1";
  habitat: HabitatId;
  key: Digest;
  protocols: [typeof HABITAT_LINK_CONTRACT, ...typeof HABITAT_LINK_CONTRACT[]];
  transports: HabitatTransport[];
  expires: number;
};

export type HabitatTransport = {
  kind: "http" | "iroh";
  base: string;
};

export type HabitatLinkGrant = Digest;

export type HabitatInvocation = {
  contract: "algal.habitat-invocation.v1";
  operationId: OperationId;
  sender: { habitat: HabitatId; principal: string };
  target: { application: string; entrypoint: string; manifest: Digest; interface: Digest };
  args: JsonValue;
  reply: { kind: "poll" | "mailbox"; reference: string };
  terms: { maxWork: number; maxAgentCalls: number; maxBytes: number; maxHops: number };
  grant: HabitatLinkGrant;
};

export type HabitatAcceptance = {
  contract: "algal.habitat-acceptance.v1";
  operationId: OperationId;
  invocation: Digest;
  status: "accepted";
  target: HabitatId;
  process: string;
  replayed: boolean;
};

export type HabitatResult = {
  contract: "algal.habitat-result.v1";
  operationId: OperationId;
  invocation: Digest;
  status: LinkStatus;
  process: string;
  outputs?: JsonValue;
  receipt?: Digest;
};

export type HabitatMessage = {
  contract: "algal.habitat-message.v1";
  messageId: OperationId;
  sender: { habitat: HabitatId; principal: string };
  recipient: `cap:mailbox-send:${Digest}`;
  body: JsonValue;
  grant: HabitatLinkGrant;
};

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", message);
}

function boundedJson(value: unknown, what: string, maxBytes: number = HABITAT_LINK_BOUNDS.maxRecordBytes): JsonValue {
  let nodes = 0;
  const visit = (v: unknown, depth: number): void => {
    if (++nodes > 100_000 || depth > 64) throw new AlgalError("BUDGET_EXHAUSTED", `${what} is too deep or large`);
    if (v !== null && typeof v === "object") for (const child of Object.values(v)) visit(child, depth + 1);
  };
  visit(value, 0);
  const checked = asJsonValue(value, what);
  if (canonicalBytes(checked) > maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", `${what} exceeds ${maxBytes} bytes`);
  return checked;
}

function object(value: unknown, what: string, keys: readonly string[]): Record<string, JsonValue> {
  const out = asObject(boundedJson(value, what), what);
  noUnknownKeys(out, keys, what);
  return out;
}

function habitatId(value: unknown, what: string): HabitatId {
  const s = asString(value, what, 34);
  if (!/^h_[0-9a-f]{32}$/.test(s)) fail(`${what} must be h_<32 lowercase hex>`);
  return s as HabitatId;
}

function operationId(value: unknown, what: string): OperationId {
  const s = asString(value, what, 32);
  if (!/^[0-9a-f]{32}$/.test(s)) fail(`${what} must be 32 lowercase hex characters`);
  return s;
}

function safeId(value: unknown, what: string, max = 64): string {
  const s = asString(value, what, max);
  if (!/^[a-z][a-z0-9-]*$/.test(s)) fail(`${what} must be a lowercase kebab-case id`);
  return s;
}

function parseSender(value: unknown): { habitat: HabitatId; principal: string } {
  const v = object(value, "sender", ["habitat", "principal"]);
  return { habitat: habitatId(v.habitat, "sender.habitat"), principal: safeId(v.principal, "sender.principal", HABITAT_LINK_BOUNDS.maxPrincipalLength) };
}

function parseGrant(value: unknown): Digest {
  return asDigest(value, "grant");
}

export function parseHabitatDescriptor(value: unknown): HabitatDescriptor {
  const v = object(value, "habitat descriptor", ["contract", "habitat", "key", "protocols", "transports", "expires"]);
  if (v.contract !== "algal.habitat-descriptor.v1") fail("invalid habitat descriptor contract");
  const protocols = v.protocols;
  if (!Array.isArray(protocols) || protocols.length < 1 || protocols.length > HABITAT_LINK_BOUNDS.maxDescriptorTransports || protocols.some(p => p !== HABITAT_LINK_CONTRACT)) fail("descriptor protocols must name habitat-link.v1");
  const rawTransports = v.transports;
  if (!Array.isArray(rawTransports) || rawTransports.length < 1 || rawTransports.length > HABITAT_LINK_BOUNDS.maxDescriptorTransports) fail("descriptor transports are out of bounds");
  const transports = rawTransports.map((raw, i) => {
    const t = object(raw, `descriptor transports[${i}]`, ["kind", "base"]);
    if (t.kind !== "http" && t.kind !== "iroh") fail(`descriptor transports[${i}].kind is unsupported`);
    const base = asString(t.base, `descriptor transports[${i}].base`, HABITAT_LINK_BOUNDS.maxTransportUrl);
    if (base.length === 0 || /[\r\n]/.test(base)) fail(`descriptor transports[${i}].base is invalid`);
    return { kind: t.kind, base } as HabitatTransport;
  });
  const expires = v.expires;
  if (typeof expires !== "number" || !Number.isSafeInteger(expires) || expires < 0) fail("descriptor expires must be a non-negative safe integer");
  return { contract: "algal.habitat-descriptor.v1", habitat: habitatId(v.habitat, "descriptor.habitat"), key: asDigest(v.key, "descriptor.key"), protocols: protocols as HabitatDescriptor["protocols"], transports, expires };
}

export function parseHabitatInvocation(value: unknown): HabitatInvocation {
  const v = object(value, "habitat invocation", ["contract", "operationId", "sender", "target", "args", "reply", "terms", "grant"]);
  if (v.contract !== "algal.habitat-invocation.v1") fail("invalid habitat invocation contract");
  const target = object(v.target, "invocation target", ["application", "entrypoint", "manifest", "interface"]);
  const reply = object(v.reply, "invocation reply", ["kind", "reference"]);
  const terms = object(v.terms, "invocation terms", ["maxWork", "maxAgentCalls", "maxBytes", "maxHops"]);
  const int = (x: unknown, label: string, min: number, max: number): number => {
    if (typeof x !== "number" || !Number.isSafeInteger(x) || x < min || x > max) fail(`${label} is out of bounds`);
    return x;
  };
  if (reply.kind !== "poll" && reply.kind !== "mailbox") fail("invocation reply.kind is invalid");
  return {
    contract: "algal.habitat-invocation.v1",
    operationId: operationId(v.operationId, "operationId"),
    sender: parseSender(v.sender),
    target: { application: safeId(target.application, "target.application"), entrypoint: safeId(target.entrypoint, "target.entrypoint"), manifest: asDigest(target.manifest, "target.manifest"), interface: asDigest(target.interface, "target.interface") },
    args: boundedJson(v.args, "invocation args", 250_000),
    reply: { kind: reply.kind, reference: asString(reply.reference, "reply.reference", HABITAT_LINK_BOUNDS.maxReplyReference) },
    terms: { maxWork: int(terms.maxWork, "terms.maxWork", 1, HABITAT_LINK_BOUNDS.maxWork), maxAgentCalls: int(terms.maxAgentCalls, "terms.maxAgentCalls", 0, HABITAT_LINK_BOUNDS.maxAgentCalls), maxBytes: int(terms.maxBytes, "terms.maxBytes", 1, HABITAT_LINK_BOUNDS.maxBytes), maxHops: int(terms.maxHops, "terms.maxHops", 0, HABITAT_LINK_BOUNDS.maxHops) },
    grant: parseGrant(v.grant),
  };
}

export function habitatInvocationDigest(value: HabitatInvocation): Digest {
  return digestCanonical(value as unknown as JsonValue);
}

export function parseHabitatAcceptance(value: unknown): HabitatAcceptance {
  const v = object(value, "habitat acceptance", ["contract", "operationId", "invocation", "status", "target", "process", "replayed"]);
  if (v.contract !== "algal.habitat-acceptance.v1" || v.status !== "accepted") fail("invalid habitat acceptance");
  if (typeof v.replayed !== "boolean") fail("acceptance.replayed must be boolean");
  return { contract: "algal.habitat-acceptance.v1", operationId: operationId(v.operationId, "acceptance.operationId"), invocation: asDigest(v.invocation, "acceptance.invocation"), status: "accepted", target: habitatId(v.target, "acceptance.target"), process: safeId(v.process, "acceptance.process"), replayed: v.replayed };
}

export function parseHabitatResult(value: unknown): HabitatResult {
  const v = object(value, "habitat result", ["contract", "operationId", "invocation", "status", "process", "outputs", "receipt"]);
  if (v.contract !== "algal.habitat-result.v1") fail("invalid habitat result contract");
  const statuses: LinkStatus[] = ["accepted", "running", "suspended", "complete", "failed", "uncertain", "cancelled"];
  if (typeof v.status !== "string" || !statuses.includes(v.status as LinkStatus)) fail("result.status is invalid");
  const result: HabitatResult = { contract: "algal.habitat-result.v1", operationId: operationId(v.operationId, "result.operationId"), invocation: asDigest(v.invocation, "result.invocation"), status: v.status as LinkStatus, process: safeId(v.process, "result.process") };
  if (v.outputs !== undefined) result.outputs = boundedJson(v.outputs, "result.outputs", HABITAT_LINK_BOUNDS.maxOutputsBytes);
  if (v.receipt !== undefined) result.receipt = asDigest(v.receipt, "result.receipt");
  return result;
}

export function parseHabitatMessage(value: unknown): HabitatMessage {
  const v = object(value, "habitat message", ["contract", "messageId", "sender", "recipient", "body", "grant"]);
  if (v.contract !== "algal.habitat-message.v1") fail("invalid habitat message contract");
  const recipient = parseCapabilityHandle(v.recipient, "mailbox-send", "message.recipient").handle as `cap:mailbox-send:${Digest}`;
  return { contract: "algal.habitat-message.v1", messageId: operationId(v.messageId, "messageId"), sender: parseSender(v.sender), recipient, body: boundedJson(v.body, "message.body", HABITAT_LINK_BOUNDS.maxBodyBytes), grant: parseGrant(v.grant) };
}

export type HabitatLinkFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type HabitatLinkClientOptions = { baseUrl: string; habitat: HabitatId; authorization?: string; fetch?: HabitatLinkFetch; timeoutMs?: number };

export class HabitatLinkClient {
  private readonly fetcher: HabitatLinkFetch;
  private readonly timeoutMs: number;
  constructor(private readonly options: HabitatLinkClientOptions) {
    if (!/^https?:\/\//.test(options.baseUrl) || /[\r\n]/.test(options.baseUrl)) throw new AlgalError("PARSE_FAILED", "habitat-link baseUrl must be an HTTP(S) URL");
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 600_000) throw new AlgalError("PARSE_FAILED", "habitat-link timeout must be 1..600000 milliseconds");
  }
  private async request(path: string, method: "GET" | "POST", body?: JsonValue, headers: Record<string, string> = {}): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const init: RequestInit = { method, signal: controller.signal, headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(this.options.authorization === undefined ? {} : { authorization: this.options.authorization }), ...headers } };
      if (body !== undefined) init.body = JSON.stringify(boundedJson(body, "habitat-link request", HABITAT_LINK_BOUNDS.maxBodyBytes));
      const response = await this.fetcher(new URL(path, this.options.baseUrl).toString(), init);
      let value: unknown;
      try { value = await response.json(); } catch { throw new AlgalError("IO_FAILED", "habitat-link response was not JSON", undefined, { uncertain: !response.ok }); }
      if (!response.ok) {
        const code = (response.status === 401 || response.status === 403) ? "CAPABILITY_DENIED" : response.status === 404 ? "STORE_MISS" : response.status === 413 ? "BUDGET_EXHAUSTED" : response.status === 409 ? "RECEIPT_MISMATCH" : "IO_FAILED";
        const message = value && typeof value === "object" && "error" in value && typeof (value as { error?: unknown }).error === "object" ? String(((value as { error: { message?: unknown } }).error).message ?? code) : code;
        throw new AlgalError(code, message, undefined, { uncertain: response.status >= 500 });
      }
      return value;
    } catch (error) {
      if (error instanceof AlgalError) throw error;
      throw new AlgalError("IO_FAILED", "habitat-link transport failed", undefined, { uncertain: true });
    } finally { clearTimeout(timer); }
  }
  async invoke(request: HabitatInvocation): Promise<HabitatAcceptance> {
    const parsed = parseHabitatInvocation(request);
    return parseHabitatAcceptance(await this.request(`/v1/habitats/${this.options.habitat}/habitat-link/invocations`, "POST", parsed as unknown as JsonValue, { "idempotency-key": parsed.operationId }));
  }
  async getInvocation(operationIdValue: OperationId): Promise<HabitatResult> {
    const id = operationId(operationIdValue, "operationId");
    return parseHabitatResult(await this.request(`/v1/habitats/${this.options.habitat}/habitat-link/invocations/${id}`, "GET"));
  }
  async sendMessage(message: HabitatMessage): Promise<{ deliveryId: string }> {
    const parsed = parseHabitatMessage(message);
    const value = parsed as unknown as JsonValue;
    // The grant-verified route: the target resolves the envelope's grant
    // before it retains anything, and the message id is the retry identity.
    // The whole signed envelope is what lands in the recipient mailbox.
    const result = await this.request(`/v1/habitats/${this.options.habitat}/habitat-link/messages`, "POST", value, { "idempotency-key": parsed.messageId });
    const obj = asObject(boundedJson(result, "message acceptance", 4096), "message acceptance");
    if (obj.contract !== "algal.habitat-message-acceptance.v1") fail("message acceptance contract mismatch");
    if (obj.messageId !== parsed.messageId) fail("message acceptance names another message");
    if (obj.message !== digestCanonical(value)) fail("message acceptance digest mismatch");
    if (obj.status !== "accepted") fail("message was not accepted");
    const deliveryId = asString(obj.delivery, "delivery", 256);
    if (deliveryId.length === 0) fail("delivery must not be empty");
    return { deliveryId };
  }
}
