import { boundedBytes } from "./io-runtime";
import { gatewayGenerationId, parseGatewayReportedCost, type GatewayReportedCost } from "./gateway-observation";
import type { GatewayFetch } from "./gateway";

/** One explicit read, never inference or automatic polling. An unavailable
 * event remains unknown; Gateway ingestion can lag completion. The projected
 * response is a host observation of reported charges, not an attestation. */
export async function lookupGatewayGenerationCost(generationId: string, options: { credential: string; fetch?: GatewayFetch; signal?: AbortSignal; timeoutMs?: number }): Promise<GatewayReportedCost | null> {
  gatewayGenerationId(generationId);
  if (typeof options.credential !== "string" || options.credential.length < 16 || options.credential.length > 8192 || /[\r\n]/.test(options.credential)) throw new Error("Gateway lookup credential is not configured");
  const timeout = options.timeoutMs ?? 15_000;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 60_000) throw new Error("Invalid Gateway lookup timeout");
  const controller = new AbortController(), signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  if (signal.aborted) throw new Error("Gateway cost lookup cancelled");
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    let response: Response;
    try { response = await (options.fetch ?? globalThis.fetch)(`https://ai-gateway.vercel.sh/v1/generation?id=${generationId}`, { method: "GET", redirect: "error", signal, headers: { authorization: `Bearer ${options.credential}`, "content-type": "application/json" } }); }
    catch { throw new Error("Gateway cost lookup transport failed; cost remains unknown"); }
    if (!response.ok) { void response.body?.cancel().catch(() => {}); if (response.status === 404) return null; throw new Error(`Gateway cost lookup returned HTTP ${response.status}; body withheld`); }
    if (Number(response.headers.get("content-length")) > 16_384) { void response.body?.cancel().catch(() => {}); throw new Error("Gateway cost lookup exceeds byte limit"); }
    let raw: unknown;
    try { raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await boundedBytes(response.body, 16_384, "Gateway cost lookup", signal))); }
    catch { throw new Error("Gateway cost lookup response is invalid or exceeds bounds"); }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid Gateway lookup envelope");
    const data = (raw as Record<string, unknown>).data;
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid Gateway lookup data");
    // The provider owns an extensible response. Retain only this closed projection.
    const v = data as Record<string, unknown>;
    const result = parseGatewayReportedCost({ contract: "algal.gateway-reported-cost.v1", source: "vercel-generation-api", generationId: v.id, model: v.model, provider: v.provider_name, totalCostUsd: v.total_cost, gatewayCostUsd: v.gateway_cost, upstreamInferenceCostUsd: v.upstream_inference_cost, isByok: v.is_byok, tokensIn: v.tokens_prompt, tokensOut: v.tokens_completion, providerAttestation: false });
    if (result.generationId !== generationId) throw new Error("Gateway lookup generation mismatch");
    return result;
  } finally { clearTimeout(timer); }
}
