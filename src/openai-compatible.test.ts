import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { digestCanonical } from "./digest";
import type { EffectRequest } from "./effects";
import { openAICompatibleExecutor } from "./openai-compatible";

const request: EffectRequest = {
  contract: "algal.effect.v1", cellId: "answer", kind: "agent", prompt: "Reply yes.",
  context: { inputs: {}, turn: 0 }, output: { kind: "text" },
  budget: { maxContextBytes: 4096, maxOutputBytes: 256 },
};
const config = { baseUrl: "http://127.0.0.1:11434/v1", model: "local-model" };
const response = (content = '{"value":"yes"}', finish_reason: unknown = "stop") => ({
  model: "served-model", choices: [{ finish_reason, message: { content } }],
  usage: { prompt_tokens: 12, completion_tokens: 3 },
});

test("compatible endpoints send bounded structured requests without implicit credentials", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const executor = openAICompatibleExecutor({ ...config, fetch: async (url, init) => {
    calls.push({ url: String(url), init: init! });
    return Response.json(response());
  } });
  const result = await executor.executeEffect!(request);
  expect(result.output).toBe("yes");
  expect(result.metadata?.usage).toEqual({ model: "served-model", tokensIn: 12, tokensOut: 3 });
  expect(calls[0]!.url).toBe(`${config.baseUrl}/chat/completions`);
  expect(calls[0]!.init.redirect).toBe("error");
  expect(new Headers(calls[0]!.init.headers).has("authorization")).toBe(false);
  const body = JSON.parse(String(calls[0]!.init.body));
  expect(body.max_tokens).toBe(64);
  expect(body.response_format.json_schema.schema).toEqual({ type: "object", additionalProperties: false,
    required: ["value"], properties: { value: { type: "string" } } });
  expect(await executor.receiptFor!(request)).toEqual({ configurationDigest: digestCanonical({
    kind: "openai", ...config, credentialEnv: null, responseFormat: "json_schema", timeoutMs: 120_000, maxResponseBytes: 2_097_152,
  }) });
});

test("compatible endpoint configuration scopes cache identity without credentials", () => {
  const first = openAICompatibleExecutor({ ...config, credential: "private-one" });
  const rotated = openAICompatibleExecutor({ ...config, credential: "private-two" });
  expect(rotated.cacheIdentity).toBe(first.cacheIdentity);
  for (const change of [{ baseUrl: "http://localhost:1234/v1" }, { model: "other" }, { responseFormat: "prompt" as const }])
    expect(openAICompatibleExecutor({ ...config, ...change }).cacheIdentity).not.toBe(first.cacheIdentity);
});

for (const responseFormat of ["json_schema", "json_object", "prompt"] as const) {
  test(`compatible endpoint ${responseFormat} is explicit and never falls back`, async () => {
    let calls = 0;
    const executor = openAICompatibleExecutor({ ...config, responseFormat, fetch: async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      expect(body.response_format?.type).toBe(responseFormat === "prompt" ? undefined : responseFormat);
      return Response.json(response());
    } });
    expect(await executor.execute(request)).toBe("yes");
    expect(calls).toBe(1);
  });
}

test("compatible endpoint admission rejects unsafe URLs and malformed configuration without echoing secrets", () => {
  for (const baseUrl of ["not a URL", "http://example.com/v1", "file:///private", "https://private-secret@example.com/v1",
    "https://example.com/v1?key=private-secret", "https://example.com/v1#private-secret", "https://example.com/v1?"]) {
    let caught: unknown;
    try { openAICompatibleExecutor({ ...config, baseUrl }); } catch (error) { caught = error; }
    expect(caught).toBeDefined();
    expect(String(caught)).not.toContain("private-secret");
  }
  for (const baseUrl of ["http://localhost:1234/v1", "http://[::1]:8080/v1", "https://provider.example/v1"])
    expect(() => openAICompatibleExecutor({ ...config, baseUrl })).not.toThrow();
  for (const change of [{ model: "" }, { model: "x".repeat(129) }, { timeoutMs: 0 }, { timeoutMs: 600_001 },
    { maxResponseBytes: 0 }, { maxResponseBytes: 16_777_217 }, { credentialEnv: "BAD-NAME" },
    { credential: "secret", credentialEnv: "KEY" }])
    expect(() => openAICompatibleExecutor({ ...config, ...change })).toThrow();
});

test("compatible credentials resolve only their explicit source and remain outside receipts", async () => {
  const envName = "ALGAL_COMPATIBLE_TEST_CREDENTIAL";
  const previous = process.env[envName];
  let calls = 0;
  try {
    delete process.env[envName];
    const executor = openAICompatibleExecutor({ ...config, credentialEnv: envName, fetch: async (_url, init) => {
      calls++;
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer private-test-token");
      return Response.json(response());
    } });
    await expect(executor.execute(request)).rejects.toMatchObject({ code: "EFFECT_UNBOUND", uncertain: false });
    expect(calls).toBe(0);
    process.env[envName] = "private-test-token";
    const result = await executor.executeEffect!(request);
    expect(JSON.stringify(result)).not.toContain("private-test-token");
    expect(JSON.stringify(await executor.receiptFor!(request))).not.toContain("private-test-token");
    process.env[envName] = "private-test-token\ninvalid";
    await expect(executor.execute(request)).rejects.toMatchObject({ code: "EFFECT_UNBOUND", uncertain: false });
    expect(calls).toBe(1);
  } finally {
    if (previous === undefined) delete process.env[envName]; else process.env[envName] = previous;
  }
});

test("compatible model executors cannot approve gates or serve decisions", async () => {
  let calls = 0;
  const executor = openAICompatibleExecutor({ ...config, fetch: async () => { calls++; return Response.json(response()); } });
  for (const kind of ["gate", "decide", "recall"] as const)
    await expect(executor.execute({ ...request, kind })).rejects.toMatchObject({ code: "EFFECT_UNBOUND", uncertain: false });
  const controller = new AbortController(); controller.abort();
  await expect(executor.execute(request, controller.signal)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED", uncertain: false });
  expect(calls).toBe(0);
});

test("compatible responses reject incomplete, malformed, or widened output envelopes", async () => {
  for (const body of [response('{"value":"yes"}', "length"), response('{"value":"yes"}', "tool_calls"),
    response('{"value":"yes","private-secret":true}'), response("{}"), response("not JSON"),
    { choices: [] }, { ...response(), model: "\nprivate-secret" }]) {
    const executor = openAICompatibleExecutor({ ...config, fetch: async () => Response.json(body) });
    let caught: unknown;
    try { await executor.execute(request); } catch (error) { caught = error; }
    expect(caught).toMatchObject({ code: "EFFECT_UNPARSEABLE", uncertain: false });
    expect(String(caught)).not.toContain("private-secret");
  }
});

test("compatible transport bounds responses and withholds network diagnostics", async () => {
  for (const failure of ["send", "body", "limit", "declared"] as const) {
    const executor = openAICompatibleExecutor({ ...config, maxResponseBytes: 32, fetch: async () => {
      if (failure === "send") throw new Error("private-secret");
      if (failure === "body") return new Response(new ReadableStream({ start(controller) { controller.error(new Error("private-secret")); } }));
      return new Response("x".repeat(33), failure === "declared" ? { headers: { "content-length": "33" } } : {});
    } });
    let caught: unknown;
    try { await executor.execute(request); } catch (error) { caught = error; }
    expect(caught).toMatchObject({ uncertain: true });
    expect(String(caught)).not.toContain("private-secret");
  }
  for (const status of [302, 401, 429, 500]) {
    const executor = openAICompatibleExecutor({ ...config, fetch: async () => new Response("private-secret", { status }) });
    let caught: unknown;
    try { await executor.execute(request); } catch (error) { caught = error; }
    expect(caught).toMatchObject({ code: "EFFECT_FAILED", uncertain: false });
    expect(String(caught)).not.toContain("private-secret");
  }
});

test("compatible timeout and cancellation bound a stalled response body", async () => {
  for (const cancel of [false, true]) {
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const executor = openAICompatibleExecutor({ ...config, timeoutMs: cancel ? 120_000 : 10,
      fetch: async () => new Response(new ReadableStream({ pull() { started(); } })),
    });
    const controller = new AbortController();
    const pending = executor.execute(request, controller.signal);
    await entered;
    if (cancel) controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED", uncertain: true });
  }
});

const root = resolve(import.meta.dir, "..");
async function cli(...args: string[]) {
  const child = Bun.spawn([process.execPath, "cli.ts", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
}

test("CLI runs a real loopback endpoint and verifies its retained receipt offline", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-local-provider-"));
  const calls: Request[] = [];
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
    calls.push(request);
    const body = await request.json() as { model?: unknown; response_format?: unknown };
    expect(body.model).toBe("fixture-model");
    expect(body.response_format).toEqual({ type: "json_object" });
    return Response.json(response());
  } });
  try {
    const manifest = join(dir, "local.algal.json");
    await writeFile(manifest, JSON.stringify({ contract: "algal.organism.v1", key: "organism:local-test", name: "Local inference",
      cells: [{ id: "answer", kind: "agent", prompt: "Reply yes.", output: { kind: "text" } }], edges: [],
    }));
    const result = await cli("run", manifest, "--base-url", `http://127.0.0.1:${server.port}/v1`, "--model", "fixture-model",
      "--response-format", "json_object", "--write", "--dir", join(dir, "store"));
    expect(result.code).toBe(0);
    const receipt = JSON.parse(result.stdout);
    expect(receipt.cells.answer.outputs.out).toBe("yes");
    expect(receipt.effects[0].usage.tokensIn).toBe(12);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.headers.has("authorization")).toBe(false);
    server.stop(true);
    const receiptPath = join(dir, "receipt.json");
    await writeFile(receiptPath, result.stdout);
    const verified = await cli("verify", receiptPath, "--dir", join(dir, "store"));
    expect(verified.code).toBe(0);
    expect(JSON.parse(verified.stdout).ok).toBe(true);
  } finally { server.stop(true); await rm(dir, { recursive: true, force: true }); }
});

test("CLI rejects incomplete or mixed endpoint options before dispatch", async () => {
  for (const options of [["--base-url", config.baseUrl], ["--model", config.model], ["--credential-env", "KEY"],
    ["--response-format", "prompt"], ["--base-url"],
    ["--base-url", config.baseUrl, "--model", config.model, "--response-format", "invalid"],
    ...["--gateway-model", "--jev", "--recall", "--responses", "--executor-cmd", "--apple", "--apple-bridge", "--agent", "--host"].map(flag =>
      ["--base-url", config.baseUrl, "--model", config.model, flag, "unused"])]) {
    const result = await cli("run", "examples/hello.algal.json", ...options);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--");
  }
});
