/**
 * Signed Habitat Link authority records.
 *
 * Habitat Link requests carry only a digest-sized grant reference. The grant
 * itself is an immutable, signed record that can be stored in a habitat CAS or
 * exchanged out of band. Verification is deliberately pure: callers provide
 * the current logical time and trusted issuer keys, so replay never depends on
 * wall-clock state hidden inside a receipt.
 */
import { createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import { digestCanonical, asDigest, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { canonicalBytes, canonicalize, asJsonValue, asObject, asString, noUnknownKeys, type JsonValue } from "./values";
import {
  HABITAT_LINK_BOUNDS,
  parseHabitatDescriptor,

  type HabitatDescriptor,
  type HabitatId,
  type HabitatInvocation,
  type HabitatMessage,
} from "./habitat-link";

export const HABITAT_DESCRIPTOR_SIGNED_CONTRACT = "algal.habitat-descriptor-signed.v1" as const;
export const HABITAT_GRANT_CONTRACT = "algal.habitat-grant.v1" as const;
export const HABITAT_AUTHORITY_BOUNDS = Object.freeze({
  maxKeyBytes: 256,
  maxSignatureBytes: 256,
  maxGrantBytes: 16_384,
  maxKeys: 64,
  maxPermissions: 4,
});

export type SignedHabitatDescriptor = {
  contract: typeof HABITAT_DESCRIPTOR_SIGNED_CONTRACT;
  descriptor: HabitatDescriptor;
  publicKey: string;
  signature: string;
};

export type HabitatGrantPermission = "invoke" | "message";
export type HabitatGrant = {
  contract: typeof HABITAT_GRANT_CONTRACT;
  issuer: HabitatId;
  subject: { habitat: HabitatId; principal: string };
  audience: HabitatId;
  permissions: HabitatGrantPermission[];
  application?: string;
  entrypoint?: string;
  interface?: Digest;
  terms: { maxWork: number; maxAgentCalls: number; maxBytes: number; maxHops: number };
  notBefore: number;
  expires: number;
  nonce: string;
  publicKey: string;
  signature: string;
};

export type HabitatAuthorityKeyset = ReadonlyMap<HabitatId, readonly string[]>;

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", message);
}

function bounded(value: unknown, what: string, max = HABITAT_AUTHORITY_BOUNDS.maxGrantBytes): JsonValue {
  const checked = asJsonValue(value, what);
  if (canonicalBytes(checked) > max) throw new AlgalError("BUDGET_EXHAUSTED", `${what} exceeds ${max} bytes`);
  return checked;
}

function obj(value: unknown, what: string, keys: readonly string[]): Record<string, JsonValue> {
  const out = asObject(bounded(value, what), what);
  noUnknownKeys(out, keys, what);
  return out;
}

function base64(value: unknown, what: string, max: number): string {
  const text = asString(value, what, max * 2);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text) || text.length % 4 !== 0) fail(`${what} must be base64`);
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(Buffer.from(text, "base64")); } catch { fail(`${what} must be base64`); }
  if (bytes.length === 0 || bytes.length > max) fail(`${what} exceeds key/signature bounds`);
  return text;
}

function habitatId(value: unknown, what: string): HabitatId {
  const text = asString(value, what, 34);
  if (!/^h_[0-9a-f]{32}$/.test(text)) fail(`${what} must be h_<32 lowercase hex>`);
  return text as HabitatId;
}

function principal(value: unknown, what: string): string {
  const text = asString(value, what, HABITAT_LINK_BOUNDS.maxPrincipalLength);
  if (!/^[a-z][a-z0-9-]*$/.test(text)) fail(`${what} must be a lowercase kebab-case id`);
  return text;
}

function safeId(value: unknown, what: string, max = 64): string {
  const text = asString(value, what, max);
  if (!/^[a-z][a-z0-9-]*$/.test(text)) fail(`${what} must be a lowercase kebab-case id`);
  return text;
}

function int(value: unknown, what: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) fail(`${what} must be an integer ${min}..${max}`);
  return value as number;
}

function publicKeyObject(encoded: string): KeyObject {
  try { return createPublicKey({ key: Buffer.from(encoded, "base64"), format: "der", type: "spki" }); }
  catch { throw new AlgalError("PARSE_FAILED", "invalid Ed25519 public key"); }
}

function unsignedDescriptor(value: SignedHabitatDescriptor): JsonValue {
  return { contract: value.contract, descriptor: value.descriptor, publicKey: value.publicKey };
}

function unsignedGrant(value: HabitatGrant): JsonValue {
  const { signature: _signature, ...unsigned } = value;
  return unsigned;
}

export function parseSignedHabitatDescriptor(value: unknown): SignedHabitatDescriptor {
  const v = obj(value, "signed habitat descriptor", ["contract", "descriptor", "publicKey", "signature"]);
  if (v.contract !== HABITAT_DESCRIPTOR_SIGNED_CONTRACT) fail("invalid signed habitat descriptor contract");
  const descriptor = parseHabitatDescriptor(v.descriptor);
  const publicKey = base64(v.publicKey, "descriptor.publicKey", HABITAT_AUTHORITY_BOUNDS.maxKeyBytes);
  const signature = base64(v.signature, "descriptor.signature", HABITAT_AUTHORITY_BOUNDS.maxSignatureBytes);
  publicKeyObject(publicKey);
  return { contract: HABITAT_DESCRIPTOR_SIGNED_CONTRACT, descriptor, publicKey, signature };
}

export function parseHabitatGrant(value: unknown): HabitatGrant {
  const v = obj(value, "habitat grant", ["contract", "issuer", "subject", "audience", "permissions", "application", "entrypoint", "interface", "terms", "notBefore", "expires", "nonce", "publicKey", "signature"]);
  if (v.contract !== HABITAT_GRANT_CONTRACT) fail("invalid habitat grant contract");
  const subject = obj(v.subject, "grant.subject", ["habitat", "principal"]);
  const terms = obj(v.terms, "grant.terms", ["maxWork", "maxAgentCalls", "maxBytes", "maxHops"]);
  if (!Array.isArray(v.permissions) || v.permissions.length < 1 || v.permissions.length > HABITAT_AUTHORITY_BOUNDS.maxPermissions) fail("grant.permissions is out of bounds");
  const permissions = v.permissions.map((p, i) => {
    if (p !== "invoke" && p !== "message") fail(`grant.permissions[${i}] is invalid`);
    return p as HabitatGrantPermission;
  });
  if (new Set(permissions).size !== permissions.length) fail("grant.permissions must be unique");
  const grant: HabitatGrant = {
    contract: HABITAT_GRANT_CONTRACT,
    issuer: habitatId(v.issuer, "grant.issuer"),
    subject: { habitat: habitatId(subject.habitat, "grant.subject.habitat"), principal: principal(subject.principal, "grant.subject.principal") },
    audience: habitatId(v.audience, "grant.audience"),
    permissions,
    ...(v.application === undefined ? {} : { application: safeId(v.application, "grant.application") }),
    ...(v.entrypoint === undefined ? {} : { entrypoint: safeId(v.entrypoint, "grant.entrypoint") }),
    ...(v.interface === undefined ? {} : { interface: asDigest(v.interface, "grant.interface") }),
    terms: { maxWork: int(terms.maxWork, "grant.terms.maxWork", 1, HABITAT_LINK_BOUNDS.maxWork), maxAgentCalls: int(terms.maxAgentCalls, "grant.terms.maxAgentCalls", 0, HABITAT_LINK_BOUNDS.maxAgentCalls), maxBytes: int(terms.maxBytes, "grant.terms.maxBytes", 1, HABITAT_LINK_BOUNDS.maxBytes), maxHops: int(terms.maxHops, "grant.terms.maxHops", 0, HABITAT_LINK_BOUNDS.maxHops) },
    notBefore: int(v.notBefore, "grant.notBefore", 0, Number.MAX_SAFE_INTEGER),
    expires: int(v.expires, "grant.expires", 0, Number.MAX_SAFE_INTEGER),
    nonce: asString(v.nonce, "grant.nonce", 128),
    publicKey: base64(v.publicKey, "grant.publicKey", HABITAT_AUTHORITY_BOUNDS.maxKeyBytes),
    signature: base64(v.signature, "grant.signature", HABITAT_AUTHORITY_BOUNDS.maxSignatureBytes),
  };
  if (grant.expires < grant.notBefore) fail("grant.expires precedes grant.notBefore");
  if (grant.application === undefined && grant.entrypoint !== undefined) fail("grant.entrypoint requires application");
  if (grant.interface !== undefined && grant.application === undefined) fail("grant.interface requires application");
  publicKeyObject(grant.publicKey);
  return grant;
}

export function descriptorDigest(value: SignedHabitatDescriptor): Digest {
  return digestCanonical(unsignedDescriptor(parseSignedHabitatDescriptor(value)));
}

export function grantDigest(value: HabitatGrant): Digest {
  return digestCanonical(parseHabitatGrant(value) as unknown as JsonValue);
}

export function signHabitatDescriptor(descriptor: HabitatDescriptor, privateKey: KeyObject): SignedHabitatDescriptor {
  const parsed = parseHabitatDescriptor(descriptor);
  const publicKey = createPublicKey(privateKey).export({ format: "der", type: "spki" }).toString("base64");
  const unsigned = { contract: HABITAT_DESCRIPTOR_SIGNED_CONTRACT, descriptor: parsed, publicKey } as SignedHabitatDescriptor;
  const signature = sign(null, Buffer.from(canonicalize(unsignedDescriptor(unsigned))), privateKey).toString("base64");
  return parseSignedHabitatDescriptor({ ...unsigned, signature });
}

export function signHabitatGrant(grant: Omit<HabitatGrant, "signature" | "publicKey">, privateKey: KeyObject): HabitatGrant {
  const publicKey = createPublicKey(privateKey).export({ format: "der", type: "spki" }).toString("base64");
  const unsigned = { ...grant, publicKey, signature: "AAAA" } as HabitatGrant;
  const signature = sign(null, Buffer.from(canonicalize(unsignedGrant(unsigned))), privateKey).toString("base64");
  return parseHabitatGrant({ ...unsigned, signature });
}

export function verifyHabitatDescriptor(value: SignedHabitatDescriptor, trustedKeys?: readonly string[]): boolean {
  const signed = parseSignedHabitatDescriptor(value);
  if (trustedKeys !== undefined && !trustedKeys.includes(signed.publicKey)) return false;
  return verify(null, Buffer.from(canonicalize(unsignedDescriptor(signed))), publicKeyObject(signed.publicKey), Buffer.from(signed.signature, "base64"));
}

export type HabitatGrantCheck = {
  /** Enrolled issuer keys; an unknown key fails even with a valid signature. */
  trustedKeys?: readonly string[];
  /** Caller-supplied logical time; grants never read the wall clock. */
  now?: number;
  /** The verifying habitat. A grant addressed to another habitat is void here. */
  audience?: HabitatId;
  required?: HabitatGrantPermission;
  invocation?: HabitatInvocation;
  message?: HabitatMessage;
};

/** Pure verification: signature, trust, validity window, audience, permission,
 * and (when a request is supplied) that the grant's subject is the request's
 * sender and every requested term fits inside the granted ceiling. The
 * invocation's `grant` digest must also match `grantDigest(grant)`. */
export function verifyHabitatGrant(value: HabitatGrant, options: HabitatGrantCheck = {}): boolean {
  const grant = parseHabitatGrant(value);
  if (options.trustedKeys !== undefined && !options.trustedKeys.includes(grant.publicKey)) return false;
  if (!verify(null, Buffer.from(canonicalize(unsignedGrant(grant))), publicKeyObject(grant.publicKey), Buffer.from(grant.signature, "base64"))) return false;
  if (options.now !== undefined && (options.now < grant.notBefore || options.now > grant.expires)) return false;
  if (options.audience !== undefined && grant.audience !== options.audience) return false;
  if (options.required !== undefined && !grant.permissions.includes(options.required)) return false;
  const digest = grantDigest(grant);
  const invocation = options.invocation;
  if (invocation !== undefined) {
    if (invocation.grant !== digest || !grant.permissions.includes("invoke")) return false;
    if (grant.subject.habitat !== invocation.sender.habitat || grant.subject.principal !== invocation.sender.principal) return false;
    if (grant.application !== undefined && grant.application !== invocation.target.application) return false;
    if (grant.entrypoint !== undefined && grant.entrypoint !== invocation.target.entrypoint) return false;
    if (grant.interface !== undefined && grant.interface !== invocation.target.interface) return false;
    if (invocation.terms.maxWork > grant.terms.maxWork || invocation.terms.maxAgentCalls > grant.terms.maxAgentCalls || invocation.terms.maxBytes > grant.terms.maxBytes || invocation.terms.maxHops > grant.terms.maxHops) return false;
  }
  const message = options.message;
  if (message !== undefined) {
    if (message.grant !== digest || !grant.permissions.includes("message")) return false;
    if (grant.subject.habitat !== message.sender.habitat || grant.subject.principal !== message.sender.principal) return false;
    if (canonicalBytes(message.body) > grant.terms.maxBytes) return false;
  }
  return true;
}

/** Test and fixture helper; production callers should load an enrolled key. */
export function generateHabitatAuthorityKeyPair(): { publicKey: KeyObject; privateKey: KeyObject } {
  return generateKeyPairSync("ed25519");
}
