import { chatCompletionsExecutor, type ChatCompletionsFetch, type ChatCompletionsFormat } from "./chat-completions";
import { digestCanonical } from "./digest";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";

export type OpenAICompatibleExecutorOptions = {
  baseUrl: string;
  model: string;
  /** Explicit library credential; never recorded. Mutually exclusive with credentialEnv. */
  credential?: string;
  /** Read per call; never fall back to unrelated provider credentials. */
  credentialEnv?: string;
  responseFormat?: ChatCompletionsFormat;
  timeoutMs?: number;
  maxResponseBytes?: number;
  fetch?: ChatCompletionsFetch;
};
export type { ChatCompletionsFetch, ChatCompletionsFormat } from "./chat-completions";

/** Local servers need no credential. Hosted endpoints require explicit host configuration. */
export function openAICompatibleExecutor(options: OpenAICompatibleExecutorOptions): Executor {
  if (options.credential !== undefined && options.credentialEnv !== undefined)
    throw new AlgalError("PARSE_FAILED", "choose credential or credentialEnv, not both");
  if (options.credentialEnv !== undefined && !/^[A-Za-z0-9_]{1,128}$/.test(options.credentialEnv))
    throw new AlgalError("PARSE_FAILED", "invalid provider credential environment name");
  const responseFormat = options.responseFormat ?? "json_schema";
  const timeoutMs = options.timeoutMs ?? 120_000;
  const maxResponseBytes = options.maxResponseBytes ?? 2_097_152;
  if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > 16_777_216)
    throw new AlgalError("PARSE_FAILED", "invalid provider response byte limit");
  // Match the native Backend::Openai serialization. Credentials are excluded.
  const configurationDigest = digestCanonical({ kind: "openai", baseUrl: options.baseUrl, model: options.model,
    credentialEnv: options.credentialEnv ?? null, responseFormat, timeoutMs, maxResponseBytes });
  return chatCompletionsExecutor({
    baseUrl: options.baseUrl, model: options.model, responseFormat, timeoutMs, maxResponseBytes,
    ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
    id: `openai:${configurationDigest}`, label: "Chat Completions provider", cacheIdentity: configurationDigest, configurationDigest,
    credential: () => {
      if (options.credentialEnv === undefined) return options.credential;
      const credential = process.env[options.credentialEnv];
      if (credential === undefined) throw new AlgalError("EFFECT_UNBOUND", "provider credential environment variable is not configured");
      return credential;
    },
  });
}
