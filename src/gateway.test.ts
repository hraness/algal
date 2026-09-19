import { expect, test } from "bun:test";
import { vercelGatewayExecutor } from "./gateway";
import type { EffectRequest } from "./effects";

const request: EffectRequest = {
  contract: "algal.effect.v1",
  cellId: "route",
  kind: "classifier",
  prompt: "Classify the ticket.",
  context: { inputs: { ticket: "refund please" }, turn: 0 },
  output: { kind: "choice", labels: ["billing", "other"] },
  budget: { maxContextBytes: 4096, maxOutputBytes: 256 },
};

test("Vercel Gateway executor binds structured output and post-call usage", async () => {
  let seen: RequestInit | undefined;
  const executor = vercelGatewayExecutor({
    model: "alibaba/qwen3.5-flash",
    credential: "test-credential-value",
    async fetch(_input, init) {
      seen = init;
      return Response.json({
        model: "alibaba/qwen3.5-flash",
        choices: [{ message: { content: JSON.stringify({ value: "billing" }) } }],
        usage: { prompt_tokens: 123, completion_tokens: 4 },
      });
    },
  });

  const result = await executor.executeEffect!(request);
  expect(executor.capabilities?.effects).toEqual(["agent", "classifier"]);
  expect(result.output).toBe("billing");
  expect(result.metadata?.usage).toEqual({
    model: "alibaba/qwen3.5-flash",
    tokensIn: 123,
    tokensOut: 4,
  });
  expect(seen?.redirect).toBe("error");
  expect(seen?.headers).toEqual({
    authorization: "Bearer test-credential-value",
    "content-type": "application/json",
  });
  const body = JSON.parse(String(seen?.body));
  expect(body.messages[0].content).toContain("JSON");
  expect(body.response_format.json_schema.schema.properties.value.enum).toEqual([
    "billing",
    "other",
  ]);
});

test("Vercel Gateway executor refuses authority outside model generation", async () => {
  let fetched = false;
  const executor = vercelGatewayExecutor({
    model: "alibaba/qwen3.5-flash",
    credential: "test-credential-value",
    async fetch() {
      fetched = true;
      return Response.json({});
    },
  });
  await expect(executor.execute({ ...request, kind: "gate" }))
    .rejects.toThrow(/cannot serve effect kind/);
  await expect(executor.execute({ ...request, kind: "decide" }))
    .rejects.toThrow(/cannot serve effect kind/);
  expect(fetched).toBe(false);
});

test("Vercel Gateway executor rejects redirects and malformed output", async () => {
  const redirected = vercelGatewayExecutor({
    model: "alibaba/qwen3.5-flash",
    credential: "test-credential-value",
    fetch: async () => new Response(null, { status: 302 }),
  });
  await expect(redirected.executeEffect!(request)).rejects.toThrow("redirects are forbidden");

  const malformed = vercelGatewayExecutor({
    model: "alibaba/qwen3.5-flash",
    credential: "test-credential-value",
    fetch: async () => Response.json({ choices: [{ message: { content: "{}" } }] }),
  });
  await expect(malformed.executeEffect!(request)).rejects.toThrow("has no value");
});


for (const failure of ["send", "body", "limit"] as const) {
  test(`AI Gateway ${failure} failure marks completion uncertain without leaking transport details`, async () => {
    const executor = vercelGatewayExecutor({model: "test/model", credential: "test-credential-value", maxResponseBytes: 32,
      fetch: async () => {
        if (failure === "send") throw new Error("PRIVATE transport with test-credential-value");
        if (failure === "limit") return new Response("x".repeat(33));
        return new Response(new ReadableStream({start(controller) {
          controller.enqueue(new TextEncoder().encode('{"choices":'));
          controller.error(new Error("PRIVATE body with test-credential-value"));
        }}));
      }});
    let caught: unknown;
    try {await executor.execute(request);} catch (error) {caught = error;}
    expect(caught).toMatchObject({uncertain: true});
    expect(String(caught)).not.toContain("PRIVATE");
    expect(String(caught)).not.toContain("test-credential-value");
  });
}

test("AI Gateway preflight failures never dispatch and remain definite", async () => {
  let calls = 0;
  const fetch = async () => {calls++; return Response.json({});};
  const executor = vercelGatewayExecutor({model: "test/model", credential: "test-credential-value", fetch});
  const controller = new AbortController(); controller.abort();
  await expect(executor.execute(request, controller.signal)).rejects.toMatchObject({code: "BUDGET_EXHAUSTED", uncertain: false});
  await expect(vercelGatewayExecutor({model: "test/model", credential: "", fetch}).execute(request))
    .rejects.toMatchObject({code: "EFFECT_FAILED", uncertain: false});
  expect(() => vercelGatewayExecutor({model: "test/model", maxResponseBytes: 0, fetch})).toThrow("byte limit");
  expect(calls).toBe(0);
});

test("AI Gateway complete malformed responses remain definite", async () => {
  const executor = vercelGatewayExecutor({model: "test/model", credential: "test-credential-value", fetch: async () => new Response("not JSON")});
  await expect(executor.execute(request)).rejects.toMatchObject({code: "EFFECT_UNPARSEABLE", uncertain: false});
});

test("AI Gateway cancellation while reading the response is uncertain", async () => {
  let bodyEntered!: () => void;
  const reading = new Promise<void>(done => {bodyEntered = done;});
  const executor = vercelGatewayExecutor({model: "test/model", credential: "test-credential-value", fetch: async () => new Response(new ReadableStream({pull() {bodyEntered();}}))});
  const controller = new AbortController();
  const pending = executor.execute(request, controller.signal);
  await reading; controller.abort();
  await expect(pending).rejects.toMatchObject({code: "BUDGET_EXHAUSTED", uncertain: true});
});
