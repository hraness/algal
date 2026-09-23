import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGatewayInference, createHarnessModel, parseHarnessBackend, type GatewayInferenceConfig } from "./model";
import type { EffectRequest } from "../../src/effects";

const request: EffectRequest = { contract: "algal.effect.v1", cellId: "test", kind: "agent", prompt: "Return a word",
  context: {}, output: { kind: "json", schema: { type: "string" } }, budget: { maxContextBytes: 4096, maxOutputBytes: 1024 } };
function config(ledgerPath: string): GatewayInferenceConfig { return { model: "anthropic/claude-haiku-4.5", gatewayProvider: "anthropic",
  ledgerPath, maxCalls: 2, maxCostMicrousd: 100_000, maxInputTokens: 8192, maxOutputTokens: 128,
  inputMicrousdPerToken: 2, outputMicrousdPerToken: 6, maxRequestBytes: 4096, maxOutputBytes: 1024 }; }
const response = (tokensIn = 12, tokensOut = 2) => Response.json({ choices: [{ message: { content: JSON.stringify({ value: "word" }) } }], usage: { prompt_tokens: tokensIn, completion_tokens: tokensOut } });

test("Gateway reserves verified ceilings before dispatch, pins one provider, and retains actual usage", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-gateway-budget-"));
  try {
    let calls = 0;
    const backend = await createGatewayInference(config(dir), { credential: "test-not-a-real-credential", fetch: async (_input, init) => {
      calls++;
      const body = JSON.parse(init?.body as string);
      expect(body.max_tokens).toBe(128);
      expect(body.providerOptions).toEqual({ gateway: { only: ["anthropic"] } });
      expect(body).not.toHaveProperty("tools");
      const ledger = JSON.parse(await readFile(join(dir, "accounting.json"), "utf8"));
      expect(ledger.reservedMicrousd).toBe(8192 * 2 + 128 * 6);
      expect(ledger.records[0].status).toBe("reserved");
      return response();
    } });
    expect(await backend.executor.execute(request)).toBe("word");
    expect(calls).toBe(1);
    expect(backend.accounting).toMatchObject({ completedCalls: 1, inputTokens: 12, outputTokens: 2, costUsd: null });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("Gateway failure or out-of-bound usage stops shared inference without retry", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-gateway-usage-"));
  try {
    let calls = 0;
    const backend = await createGatewayInference(config(dir), { credential: "test-not-a-real-credential", fetch: async () => { calls++; return response(9000, 2); } });
    await expect(backend.executor.execute(request)).rejects.toThrow("no retry");
    expect(backend.accounting.inputTokens).toBe(9000);
    await expect(backend.executor.execute(request)).rejects.toThrow("unsettled or failed");
    expect(calls).toBe(1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("backend parsing rejects credentials, unknown keys, invalid limits and remote local endpoints", async () => {
  expect(() => parseHarnessBackend({ ...config("/tmp/example"), provider: "gateway", credential: "no" })).toThrow("configuration key");
  expect(() => parseHarnessBackend({ ...config("/tmp/example"), provider: "gateway", maxCalls: 0 })).toThrow("maxCalls");
  await expect(createHarnessModel({ provider: "local", model: "model", baseUrl: "https://example.com/v1", ledgerPath: "/tmp/example",
    maxCalls: 1, maxRequestBytes: 4096, maxOutputBytes: 1024 })).rejects.toThrow("loopback");
  await expect(createHarnessModel({ provider: "local", model: "model", baseUrl: "private-invalid-url-token", ledgerPath: "/tmp/example",
    maxCalls: 1, maxRequestBytes: 4096, maxOutputBytes: 1024 })).rejects.toThrow(/^Invalid local inference endpoint$/);
});

test("local backend sends the shared model prompt and JSON observations to a real loopback endpoint", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-local-harness-"));
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(req) {
    expect(req.headers.get("authorization")).toBeNull();
    const body = await req.json() as { messages: { content: string }[] };
    expect(body.messages[1]?.content).toContain("shared task");
    return Response.json({ choices: [{ message: { content: JSON.stringify({ value: JSON.stringify({ type: "finish", summary: "done" }) }) } }],
      usage: { prompt_tokens: 20, completion_tokens: 10 } });
  } });
  try {
    const backend = await createHarnessModel({ provider: "local", model: "fixture", baseUrl: `http://127.0.0.1:${server.port}/v1`,
      ledgerPath: dir, maxCalls: 1, maxRequestBytes: 4096, maxOutputBytes: 1024 });
    expect(JSON.parse(await backend.model({ prompt: "shared task", context: [], maxOutputBytes: 1024 }) as string)).toEqual({ type: "finish", summary: "done" });
    expect(backend.accounting).toMatchObject({ calls: 1, completedCalls: 1, inputTokens: 20, outputTokens: 10 });
  } finally { server.stop(true); await rm(dir, { recursive: true, force: true }); }
});
