import { expect, test } from "bun:test";
import { vercelGatewayExecutor } from "./gateway";
import type { EffectRequest } from "./effects";

const request: EffectRequest = {
  contract: "morphogen.effect.v1",
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
