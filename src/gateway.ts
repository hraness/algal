import { chatCompletionsExecutor, type ChatCompletionsFetch } from "./chat-completions";
import { digestCanonical } from "./digest";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";

export const VERCEL_AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1" as const;
export type GatewayFetch = ChatCompletionsFetch;
export type GatewayExecutorOptions = {
  model: string;
  credential?: string;
  fetch?: GatewayFetch;
  maxResponseBytes?: number;
};

export function vercelGatewayExecutor(options: GatewayExecutorOptions): Executor {
  if (!/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i.test(options.model)) {
    throw new AlgalError("PARSE_FAILED", "invalid AI Gateway model identifier");
  }
  return chatCompletionsExecutor({
    baseUrl: VERCEL_AI_GATEWAY_BASE_URL, model: options.model,
    responseFormat: "json_schema", timeoutMs: 120_000,
    maxResponseBytes: options.maxResponseBytes ?? 2_097_152,
    ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
    id: `vercel:${options.model}`, receiptExecutor: `vercel:${options.model}`, label: "AI Gateway",
    cacheIdentity: digestCanonical({ provider: "vercel", baseUrl: VERCEL_AI_GATEWAY_BASE_URL, model: options.model, responseFormat: "json_schema" }),
    // Preserve the native gateway backend configuration and existing receipts.
    configurationDigest: digestCanonical({ kind: "gateway", model: options.model }),
    credential: () => {
      const value = options.credential ?? process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
      if (typeof value !== "string" || value.length < 16 || value.length > 8192 || /[\r\n]/.test(value)) {
        throw new AlgalError("EFFECT_FAILED", "AI Gateway credential is not configured");
      }
      return value;
    },
  });
}
