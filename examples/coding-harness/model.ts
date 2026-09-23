import { createBudgetedExecutor, type InferenceAccounting } from "./inference-budget";
import { vercelGatewayExecutor, type GatewayFetch, type GatewayExecutorOptions } from "../../src/gateway";
import { openAICompatibleExecutor } from "../../src/openai-compatible";
import { asJsonValue, canonicalize } from "../../src/values";
import { digestCanonical } from "../../src/digest";
import type { Executor, ExecutorResult } from "../../src/effects";
import type { HarnessModel } from "./harness";

export type GatewayInferenceConfig = {
  model: string; gatewayProvider: string; ledgerPath: string;
  maxCalls: number; maxCostMicrousd: number;
  maxInputTokens: number; maxOutputTokens: number;
  inputMicrousdPerToken: number; outputMicrousdPerToken: number;
  maxRequestBytes: number; maxOutputBytes: number; timeoutMs?: number;
};
export type LocalInferenceConfig = {
  provider: "local"; model: string; baseUrl: string; ledgerPath: string;
  maxCalls: number; maxRequestBytes: number; maxOutputBytes: number; timeoutMs?: number;
  responseFormat?: "json_schema" | "json_object" | "prompt";
};
export type HarnessBackendConfig = ({ provider: "gateway" } & GatewayInferenceConfig) | LocalInferenceConfig;
type Backend = { executor: Executor; accounting: InferenceAccounting; settle: () => Promise<void> };
export type HarnessModelObservations = Pick<GatewayExecutorOptions, "observeGeneration">;
function integer(value: unknown, min: number, max: number, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid backend ${name}`);
  return value;
}
function text(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.length || value.length > 4096 || /[\0\r\n]/.test(value)) throw new Error(`Invalid backend ${name}`);
  return value;
}
const commonKeys = ["provider", "model", "ledgerPath", "maxCalls", "maxRequestBytes", "maxOutputBytes", "timeoutMs"];
const gatewayKeys = ["gatewayProvider", "maxCostMicrousd", "maxInputTokens", "maxOutputTokens", "inputMicrousdPerToken", "outputMicrousdPerToken"];
export function parseHarnessBackend(raw: unknown): HarnessBackendConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected backend configuration object");
  const value = raw as Record<string, unknown>;
  const allowed = value.provider === "gateway" ? [...commonKeys, ...gatewayKeys]
    : value.provider === "local" ? [...commonKeys, "baseUrl", "responseFormat"] : [];
  if (!allowed.length || Object.keys(value).some(key => !allowed.includes(key))) throw new Error("Unknown backend or configuration key");
  const common = { model: text(value.model, "model"), ledgerPath: text(value.ledgerPath, "ledgerPath"),
    maxCalls: integer(value.maxCalls, 1, 64, "maxCalls"), maxRequestBytes: integer(value.maxRequestBytes, 1, 1_048_576, "maxRequestBytes"),
    maxOutputBytes: integer(value.maxOutputBytes, 1, 65_536, "maxOutputBytes"),
    ...(value.timeoutMs === undefined ? {} : { timeoutMs: integer(value.timeoutMs, 1, 600_000, "timeoutMs") }) };
  if (value.provider === "local") {
    if (value.responseFormat !== undefined && !["json_schema", "json_object", "prompt"].includes(String(value.responseFormat))) {
      throw new Error("Invalid local responseFormat");
    }
    return { provider: "local", ...common, baseUrl: text(value.baseUrl, "baseUrl"),
      ...(value.responseFormat === undefined ? {} : { responseFormat: value.responseFormat as LocalInferenceConfig["responseFormat"] & string }) };
  }
  return { provider: "gateway", ...common, gatewayProvider: text(value.gatewayProvider, "gatewayProvider"),
    maxCostMicrousd: integer(value.maxCostMicrousd, 1, 1_000_000_000, "maxCostMicrousd"),
    maxInputTokens: integer(value.maxInputTokens, 4097, 2_097_152, "maxInputTokens"),
    maxOutputTokens: integer(value.maxOutputTokens, 1, 16_384, "maxOutputTokens"),
    inputMicrousdPerToken: integer(value.inputMicrousdPerToken, 1, 1_000_000, "input price ceiling"),
    outputMicrousdPerToken: integer(value.outputMicrousdPerToken, 1, 1_000_000, "output price ceiling") };
}

/** Verified price ceilings belong to the caller. This adapter admits a single
 * provider, no model fallback, no retries, no thinking or tools. It reserves the
 * complete fixed input/output ceiling before dispatch; actual cost is unknown.
 * The input ceiling uses serialized UTF-8 bytes plus 4096 framing/schema tokens,
 * deliberately overcounting ordinary text tokenization. Keep a provider-side
 * credit cap too: accounting is not control over a provider's billing changes. */
export async function createGatewayInference(config: GatewayInferenceConfig,
  options: { fetch?: GatewayFetch; credential?: string } & HarnessModelObservations = {}): Promise<Backend> {
  const parsed = parseHarnessBackend({ ...config, provider: "gateway" });
  if (parsed.provider !== "gateway") throw new Error("Expected Gateway configuration");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(parsed.gatewayProvider)) throw new Error("Invalid Gateway provider selector");
  const reserveMicrousdPerCall = parsed.maxInputTokens * parsed.inputMicrousdPerToken + parsed.maxOutputTokens * parsed.outputMicrousdPerToken;
  integer(reserveMicrousdPerCall, 1, 1_000_000_000, "call cost ceiling");
  const fetcher = options.fetch ?? globalThis.fetch;
  const gateway = vercelGatewayExecutor({ model: parsed.model, ...(options.credential === undefined ? {} : { credential: options.credential }),
    ...(options.observeGeneration === undefined ? {} : { observeGeneration: options.observeGeneration }),
    fetch: async (input, init) => {
      if (typeof init?.body !== "string") throw new Error("Expected Gateway JSON request body");
      const body = JSON.parse(init.body) as Record<string, unknown>;
      body.max_tokens = parsed.maxOutputTokens;
      body.providerOptions = { gateway: { only: [parsed.gatewayProvider] } };
      const serialized = canonicalize(asJsonValue(body, "Gateway body"));
      if (Buffer.byteLength(serialized) + 4096 > parsed.maxInputTokens) throw new Error("Gateway input exceeds reserved token ceiling");
      return fetcher(input, { ...init, body: serialized });
    } });
  return createBudgetedExecutor({ executor: gateway, ledgerPath: parsed.ledgerPath,
    budget: { maxCalls: parsed.maxCalls, maxCostMicrousd: parsed.maxCostMicrousd, reserveMicrousdPerCall },
    maxRequestBytes: parsed.maxRequestBytes, maxOutputBytes: parsed.maxOutputBytes,
    tokenLimits: { maxInputTokens: parsed.maxInputTokens, maxOutputTokens: parsed.maxOutputTokens, requireUsage: true },
    ...(parsed.timeoutMs === undefined ? {} : { timeoutMs: parsed.timeoutMs }),
    providerIdentity: digestCanonical(asJsonValue({ ...parsed, ledgerPath: null }, "Gateway configuration")) });
}

export async function createHarnessModel(raw: unknown, parentSignal?: AbortSignal, observations: HarnessModelObservations = {}): Promise<Backend & { model: HarnessModel; modelId: string }> {
  const config = parseHarnessBackend(raw);
  let backend: Backend;
  if (config.provider === "gateway") {
    const { provider: _provider, ...gateway } = config;
    backend = await createGatewayInference(gateway, observations);
  } else {
    // Local means loopback-only and carries no cloud credential. Remote hosted
    // OpenAI-compatible providers use the SDK's explicit endpoint API instead.
    let url: URL;
    try { url = new URL(config.baseUrl); }
    catch { throw new Error("Invalid local inference endpoint"); }
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password) {
      throw new Error("Local inference requires an unauthenticated loopback endpoint");
    }
    backend = await createBudgetedExecutor({ executor: openAICompatibleExecutor({ baseUrl: config.baseUrl, model: config.model,
      ...(config.responseFormat === undefined ? {} : { responseFormat: config.responseFormat }),
      ...(config.timeoutMs === undefined ? {} : { timeoutMs: config.timeoutMs }) }), ledgerPath: config.ledgerPath,
      budget: { maxCalls: config.maxCalls, maxCostMicrousd: 0, reserveMicrousdPerCall: 0 },
      maxRequestBytes: config.maxRequestBytes, maxOutputBytes: config.maxOutputBytes,
      ...(config.timeoutMs === undefined ? {} : { timeoutMs: config.timeoutMs }) });
  }
  const model: HarnessModel = async (request, signal) => {
    const result: ExecutorResult = await backend.executor.executeEffect!({ contract: "algal.effect.v1", kind: "agent", cellId: "harness-model",
      prompt: `${request.prompt}\n\nEncode the exact requested JSON object as a JSON string inside the response's value field.`,
      context: { messages: asJsonValue(request.context, "harness context") },
      output: { kind: "json", schema: { type: "string" } },
      budget: { maxContextBytes: config.maxRequestBytes, maxOutputBytes: request.maxOutputBytes } },
    AbortSignal.any([...(parentSignal ? [parentSignal] : []), ...(signal ? [signal] : [])]));
    return result.output;
  };
  return { ...backend, model, modelId: `${backend.executor.id}@${backend.accounting.configurationDigest}` };
}
