import { describe, expect, test } from "bun:test";
import { parseXcbResponse, validateXcbCapability } from "./xcb";

const config = { executable: "/admitted/xcb", account: "selected", model: "claude/sonnet/low" };
const digest = "a".repeat(64);
function capability() {
  return {
    version: 1, supported: true, zeroTools: true, zeroHooks: true, ephemeral: true,
    accounts: [{ id: "selected", available: true, enabled: true, busy: false,
      connected: true, runtimeAdmitted: true,
      models: [{ key: config.model, observedAtMs: 900 }],
      qualification: { runtimeDigest: digest, evidenceDigest: "b".repeat(64), expiresAt: 2000 } }],
  };
}
function completed() {
  return { version: 1, status: "completed", account: config.account, model: config.model,
    requestId: "request-1", text: '{"type":"finish","summary":"done"}',
    outcome: { terminal: "completed", joined: true, effects: "none" } };
}

describe("qualified raw XCB inference", () => {
  test("accepts exact qualified account/model and settled response", () => {
    expect(() => validateXcbCapability(capability(), config, digest, 1000)).not.toThrow();
    expect(parseXcbResponse(completed(), config).requestId).toBe("request-1");
  });
  test("rejects expired/mismatched qualification and unavailable account", () => {
    expect(() => validateXcbCapability(capability(), config, digest, 2000)).toThrow();
    expect(() => validateXcbCapability(capability(), config, "c".repeat(64), 1000)).toThrow();
    const value = capability(); value.accounts[0]!.available = false;
    expect(() => validateXcbCapability(value, config, digest, 1000)).toThrow();
  });
  test("rejects tool-enabled providers and stale model observations", () => {
    const value = capability(); value.zeroTools = false;
    expect(() => validateXcbCapability(value, config, digest, 1000)).toThrow();
    const stale = capability(); stale.accounts[0]!.models[0]!.observedAtMs = -86_400_000;
    expect(() => validateXcbCapability(stale, config, digest, 1000)).toThrow();
  });
  test("never accepts fallback model, extra fields or unjoined success", () => {
    expect(() => parseXcbResponse({ ...completed(), model: "another" }, config)).toThrow();
    expect(() => parseXcbResponse({ ...completed(), extra: true }, config)).toThrow();
    const value = completed(); value.outcome.joined = false;
    expect(() => parseXcbResponse(value, config)).toThrow();
  });
});
