import { expect, test } from "bun:test";
import { lookupGatewayGenerationCost } from "./gateway-accounting";
import { vercelGatewayExecutor } from "./gateway";
import { parseGatewayGeneration, parseGatewayReportedCost, type GatewayGeneration } from "./gateway-observation";
import { effectRequestDigest, type EffectRequest } from "./effects";
import { digestCanonical } from "./digest";

const id = "gen_01ARZ3NDEKTSV4RRFFQ69G5FAV", credential = "fixture-private-credential";
const data = { id, total_cost: 0.0012, gateway_cost: 0.0012, upstream_inference_cost: 0, is_byok: false, model: "test/model", provider_name: "test", tokens_prompt: 5, tokens_completion: 2 };
const request: EffectRequest = { contract: "algal.effect.v1", cellId: "one", kind: "agent", prompt: "fixture", context: {}, output: { kind: "text" }, budget: { maxContextBytes: 1000, maxOutputBytes: 1000 } };
test("Gateway generation sidecar binds the observed response without changing canonical metadata", async () => {
  const observations: GatewayGeneration[] = [];
  const response = () => Response.json({ id, model: "test/model", choices: [{ message: { content: '{"value":"fixture"}' } }], usage: { prompt_tokens: 5, completion_tokens: 2 } });
  const base = { model: "test/model", credential, fetch: async () => response() };
  const result = await vercelGatewayExecutor({ ...base, observeGeneration: observation => { observations.push(observation); } }).executeEffect!(request);
  expect(result).toEqual(await vercelGatewayExecutor(base).executeEffect!(request));
  expect(observations).toEqual([{ contract: "algal.gateway-generation.v1", generationId: id, requestDigest: effectRequestDigest(request), outputDigest: digestCanonical("fixture"), model: "test/model", tokensIn: 5, tokensOut: 2, providerAttestation: false }]);
  await expect(vercelGatewayExecutor({ ...base, observeGeneration: () => { throw new Error("private persistence error"); } }).execute(request)).rejects.toMatchObject({ uncertain: true, message: "AI Gateway response observation could not be retained; external completion uncertain" });
  expect(() => parseGatewayGeneration({ ...observations[0], providerAttestation: true })).toThrow();
  let observed = false;
  await vercelGatewayExecutor({ model: "test/model", credential, fetch: async () => Response.json({ choices: [{ message: { content: '{"value":"fixture"}' } }] }), observeGeneration: () => { observed = true; } }).execute(request);
  expect(observed).toBe(false);
});
test("cost lookup is one bounded GET, retains reported dollars and distinguishes pending from zero", async () => {
  let calls = 0;
  const result = await lookupGatewayGenerationCost(id, { credential, fetch: async (url, init) => {
    calls++; expect(String(url)).toBe(`https://ai-gateway.vercel.sh/v1/generation?id=${id}`); expect(init?.method).toBe("GET"); expect(init?.redirect).toBe("error");
    return Response.json({ data: { ...data, arbitrary_provider_field: "not retained" } });
  } });
  expect(calls).toBe(1); expect(result).toMatchObject({ source: "vercel-generation-api", totalCostUsd: 0.0012, gatewayCostUsd: 0.0012, isByok: false, providerAttestation: false });
  expect(result).not.toHaveProperty("arbitrary_provider_field");
  expect(await lookupGatewayGenerationCost(id, { credential, fetch: async () => new Response("Usage event not found", { status: 404 }) })).toBeNull();
  expect(() => parseGatewayReportedCost({ ...result, totalCostUsd: -1 })).toThrow();
  expect(() => parseGatewayReportedCost({ ...result, totalCostUsd: 1001, gatewayCostUsd: 1001 })).toThrow();
  expect(() => parseGatewayReportedCost({ ...result, totalCostUsd: NaN })).toThrow();
  expect(() => parseGatewayReportedCost({ ...result, gatewayCostUsd: 4 })).toThrow();
  expect(() => parseGatewayReportedCost({ ...result, upstreamInferenceCostUsd: 4 })).toThrow();
  expect(parseGatewayReportedCost({ ...result, totalCostUsd: 0, gatewayCostUsd: 0, isByok: true, upstreamInferenceCostUsd: 4 })).toMatchObject({ isByok: true, upstreamInferenceCostUsd: 4, gatewayCostUsd: 0 });
});
test("cost lookup refuses mismatched, unbounded, redirected and private failure responses", async () => {
  for (const body of [{ data: { ...data, id: "gen_01ARZ3NDEKTSV4RRFFQ69G5FAW" } }, { data: { ...data, total_cost: "0.0012" } }, { data: { ...data, tokens_prompt: 1.5 } }, { data: { ...data, large: "x".repeat(16384) } }]) {
    await expect(lookupGatewayGenerationCost(id, { credential, fetch: async () => Response.json(body) })).rejects.toThrow();
  }
  await expect(lookupGatewayGenerationCost(id, { credential, fetch: async () => new Response("private details", { status: 302 }) })).rejects.toThrow("HTTP 302; body withheld");
  await expect(lookupGatewayGenerationCost(id, { credential, fetch: async () => { throw new Error("secret.example"); } })).rejects.toThrow("transport failed; cost remains unknown");
  let calls = 0;
  await expect(lookupGatewayGenerationCost("bad", { credential, fetch: async () => { calls++; return Response.json({}); } })).rejects.toThrow("identity");
  expect(calls).toBe(0);
});
