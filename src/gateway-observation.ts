/** Host observations, separate from canonical execution receipts. No credential,
 * prompt, clock or authority is carried by these bounded records. */
import type { Digest } from "./digest-type";

export type GatewayGeneration = {
  contract: "algal.gateway-generation.v1"; generationId: string;
  requestDigest: Digest; outputDigest: Digest; model: string;
  tokensIn: number | null; tokensOut: number | null; providerAttestation: false;
};
export type GatewayReportedCost = {
  contract: "algal.gateway-reported-cost.v1"; source: "vercel-generation-api";
  generationId: string; model: string; provider: string;
  totalCostUsd: number; gatewayCostUsd: number; upstreamInferenceCostUsd: number;
  isByok: boolean; tokensIn: number; tokensOut: number; providerAttestation: false;
};
function object(raw: unknown, keys: string[]): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).sort().join("\0") !== keys.sort().join("\0")) throw new Error("Invalid Gateway observation fields");
  return raw as Record<string, unknown>;
}
export function gatewayGenerationId(raw: unknown): string {
  if (typeof raw !== "string" || !/^gen_[0-9A-HJKMNP-TV-Z]{26}$/i.test(raw)) throw new Error("Invalid Gateway generation identity");
  return raw;
}
function text(raw: unknown, max: number): string {
  if (typeof raw !== "string" || !raw.length || raw.length > max || Array.from(raw).some(char => { const code = char.charCodeAt(0); return code < 32 || code >= 127 && code <= 159; })) throw new Error("Invalid Gateway observation text");
  return raw;
}
function digest(raw: unknown): Digest {
  if (typeof raw !== "string" || !/^sha256:[a-f0-9]{64}$/.test(raw)) throw new Error("Invalid Gateway observation digest");
  return raw as Digest;
}
function tokens(raw: unknown): number {
  if (!Number.isSafeInteger(raw) || (raw as number) < 0 || (raw as number) > 1_000_000_000) throw new Error("Invalid Gateway token count");
  return raw as number;
}
function usd(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > 1000) throw new Error("Invalid Gateway reported USD");
  return raw;
}
export function parseGatewayGeneration(raw: unknown): GatewayGeneration {
  const v = object(raw, ["contract", "generationId", "requestDigest", "outputDigest", "model", "tokensIn", "tokensOut", "providerAttestation"]);
  if (v.contract !== "algal.gateway-generation.v1" || v.providerAttestation !== false) throw new Error("Invalid Gateway generation claim");
  return { contract: v.contract, generationId: gatewayGenerationId(v.generationId), requestDigest: digest(v.requestDigest), outputDigest: digest(v.outputDigest), model: text(v.model, 128), tokensIn: v.tokensIn === null ? null : tokens(v.tokensIn), tokensOut: v.tokensOut === null ? null : tokens(v.tokensOut), providerAttestation: false };
}
export function parseGatewayReportedCost(raw: unknown): GatewayReportedCost {
  const v = object(raw, ["contract", "source", "generationId", "model", "provider", "totalCostUsd", "gatewayCostUsd", "upstreamInferenceCostUsd", "isByok", "tokensIn", "tokensOut", "providerAttestation"]);
  if (v.contract !== "algal.gateway-reported-cost.v1" || v.source !== "vercel-generation-api" || v.providerAttestation !== false || typeof v.isByok !== "boolean") throw new Error("Invalid Gateway cost claim");
  const totalCostUsd = usd(v.totalCostUsd), gatewayCostUsd = usd(v.gatewayCostUsd), upstreamInferenceCostUsd = usd(v.upstreamInferenceCostUsd);
  if (totalCostUsd !== gatewayCostUsd || !v.isByok && upstreamInferenceCostUsd !== 0) throw new Error("Inconsistent Gateway cost fields");
  return { contract: v.contract, source: v.source, generationId: gatewayGenerationId(v.generationId), model: text(v.model, 128), provider: text(v.provider, 64), totalCostUsd, gatewayCostUsd, upstreamInferenceCostUsd, isByok: v.isByok, tokensIn: tokens(v.tokensIn), tokensOut: tokens(v.tokensOut), providerAttestation: false };
}
