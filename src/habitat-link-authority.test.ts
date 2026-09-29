import { describe, expect, test } from "bun:test";
import { digestCanonical } from "./digest";
import {
  generateHabitatAuthorityKeyPair,
  grantDigest,
  parseHabitatGrant,
  signHabitatDescriptor,
  signHabitatGrant,
  verifyHabitatDescriptor,
  verifyHabitatGrant,
} from "./habitat-link-authority";

const habitat = "h_0123456789abcdef0123456789abcdef" as const;
const other = "h_fedcba9876543210fedcba9876543210" as const;
const digest = (seed: string) => digestCanonical({ seed });

function invocation() {
  return {
    contract: "algal.habitat-invocation.v1" as const,
    operationId: "0123456789abcdef0123456789abcdef",
    sender: { habitat, principal: "scout" },
    target: { application: "garden", entrypoint: "grow", manifest: digest("manifest"), interface: digest("interface") },
    args: { seed: "oak" },
    reply: { kind: "poll" as const, reference: "0123456789abcdef0123456789abcdef" },
    terms: { maxWork: 100, maxAgentCalls: 2, maxBytes: 1024, maxHops: 2 },
    grant: digest("grant"),
  };
}

describe("signed Habitat Link authority", () => {
  test("signs and verifies descriptors with canonical bytes", () => {
    const keys = generateHabitatAuthorityKeyPair();
    const descriptor = signHabitatDescriptor({
      contract: "algal.habitat-descriptor.v1",
      habitat,
      key: digest("key"),
      protocols: ["algal.habitat-link.v1"],
      transports: [{ kind: "http", base: "https://example.test/v1/habitats/h_0123456789abcdef0123456789abcdef" }],
      expires: 100,
    }, keys.privateKey);
    expect(verifyHabitatDescriptor(descriptor, [descriptor.publicKey])).toBe(true);
    expect(verifyHabitatDescriptor({ ...descriptor, signature: descriptor.signature.slice(0, -4) + "AAAA" }, [descriptor.publicKey])).toBe(false);
    expect(verifyHabitatDescriptor(descriptor, [])).toBe(false);
  });

  test("binds grants to subject, audience, interface, and invocation terms", () => {
    const keys = generateHabitatAuthorityKeyPair();
    const grant = signHabitatGrant({
      contract: "algal.habitat-grant.v1",
      issuer: other,
      subject: { habitat, principal: "scout" },
      audience: other,
      permissions: ["invoke"],
      application: "garden",
      entrypoint: "grow",
      interface: digest("interface"),
      manifest: digest("manifest"),
      terms: { maxWork: 100, maxAgentCalls: 2, maxBytes: 1024, maxHops: 2 },
      notBefore: 10,
      expires: 20,
      nonce: "nonce-1",
    }, keys.privateKey);
    expect(grantDigest(grant)).toMatch(/^sha256:/);
    const bound = { ...invocation(), grant: grantDigest(grant) };
    expect(verifyHabitatGrant(grant, { trustedKeys: [grant.publicKey], now: 15, audience: other, required: "invoke", invocation: bound })).toBe(true);
    // Validity window, audience, trust, and permission are each independent gates.
    expect(verifyHabitatGrant(grant, { now: 21 })).toBe(false);
    expect(verifyHabitatGrant(grant, { now: 9 })).toBe(false);
    expect(verifyHabitatGrant(grant, { audience: habitat })).toBe(false);
    expect(verifyHabitatGrant(grant, { trustedKeys: [] })).toBe(false);
    expect(verifyHabitatGrant(grant, { required: "message" })).toBe(false);
    // The request must carry this grant's digest and stay inside its ceiling.
    expect(verifyHabitatGrant(grant, { invocation: invocation() })).toBe(false);
    expect(verifyHabitatGrant(grant, { invocation: { ...bound, sender: { habitat, principal: "stranger" } } })).toBe(false);
    expect(verifyHabitatGrant(grant, { invocation: { ...bound, target: { ...bound.target, entrypoint: "prune" } } })).toBe(false);
    expect(verifyHabitatGrant(grant, { invocation: { ...bound, target: { ...bound.target, interface: digest("other-interface") } } })).toBe(false);
    expect(verifyHabitatGrant(grant, { invocation: { ...bound, target: { ...bound.target, manifest: digest("different-code-same-interface") } } })).toBe(false);
    expect(() => parseHabitatGrant({ ...grant, manifest: "not-a-digest" })).toThrow();
    expect(verifyHabitatGrant(grant, { invocation: { ...bound, terms: { ...bound.terms, maxWork: 101 } } })).toBe(false);
    // Tampering with any signed field breaks the signature.
    expect(verifyHabitatGrant({ ...grant, expires: 40 }, { now: 15 })).toBe(false);
    // An invoke-only grant cannot carry a message.
    const message = { contract: "algal.habitat-message.v1" as const, messageId: "0123456789abcdef0123456789abcdef", sender: { habitat, principal: "scout" }, recipient: `cap:mailbox-send:${digest("mailbox")}` as const, body: { hello: "world" }, grant: grantDigest(grant) };
    expect(verifyHabitatGrant(grant, { message })).toBe(false);
  });

  test("message grants bind the sender and bound the body", () => {
    const keys = generateHabitatAuthorityKeyPair();
    const grant = signHabitatGrant({
      contract: "algal.habitat-grant.v1",
      issuer: other,
      subject: { habitat, principal: "scout" },
      audience: other,
      permissions: ["message"],
      terms: { maxWork: 1, maxAgentCalls: 0, maxBytes: 32, maxHops: 0 },
      notBefore: 0,
      expires: 100,
      nonce: "nonce-2",
    }, keys.privateKey);
    const message = { contract: "algal.habitat-message.v1" as const, messageId: "0123456789abcdef0123456789abcdef", sender: { habitat, principal: "scout" }, recipient: `cap:mailbox-send:${digest("mailbox")}` as const, body: { hello: "world" }, grant: grantDigest(grant) };
    expect(verifyHabitatGrant(grant, { now: 5, audience: other, required: "message", message })).toBe(true);
    expect(verifyHabitatGrant(grant, { message: { ...message, body: { hello: "a much longer body that exceeds the granted byte ceiling" } } })).toBe(false);
    expect(verifyHabitatGrant(grant, { message: { ...message, sender: { habitat: other, principal: "scout" } } })).toBe(false);
    expect(() => parseHabitatGrant({ ...grant, permissions: ["invoke", "invoke"] })).toThrow();
    expect(() => parseHabitatGrant({ ...grant, entrypoint: "grow" })).toThrow();
  });
});


test("grant windows use inclusive Unix milliseconds and reject invalid clocks", () => {
  const keys = generateHabitatAuthorityKeyPair();
  const start = Date.UTC(2026, 8, 29);
  const grant = signHabitatGrant({
    contract: "algal.habitat-grant.v1", issuer: other,
    subject: { habitat, principal: "scout" }, audience: other, permissions: ["invoke"],
    terms: { maxWork: 1, maxAgentCalls: 0, maxBytes: 32, maxHops: 0 },
    notBefore: start, expires: start + 1000, nonce: "milliseconds",
  }, keys.privateKey);
  for (const now of [start, start + 1, start + 1000]) expect(verifyHabitatGrant(grant, { now })).toBe(true);
  for (const now of [start / 1000, start - 1, start + 1001, NaN, Infinity, -1, start + 0.5]) expect(verifyHabitatGrant(grant, { now })).toBe(false);
  for (const expires of [8_640_000_000_000_001, NaN, Infinity, start + 0.5]) expect(() => parseHabitatGrant({ ...grant, expires })).toThrow();
});
