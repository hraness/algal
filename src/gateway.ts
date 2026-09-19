import type { AgentOutput } from "./contract";
import type {
  EffectRequest,
  Executor,
  ExecutorResult,
} from "./effects";
import { AlgalError } from "./errors";
import { boundedBytes } from "./io";
import { digestCanonical } from "./digest";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

export const VERCEL_AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1" as const;

export type GatewayFetch = (
  input: Request | string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type GatewayExecutorOptions = {
  model: string;
  credential?: string;
  fetch?: GatewayFetch;
  maxResponseBytes?: number;
};

function record(value: unknown, at: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AlgalError("EFFECT_UNPARSEABLE", `${at} must be an object`);
  }
  return value as Record<string, unknown>;
}

function integer(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) >= 0
    ? value as number
    : undefined;
}

function outputSchema(output: AgentOutput): JsonObject {
  if (output.kind === "text") return { type: "string" };
  if (output.kind === "choice") {
    return { type: "string", enum: output.labels } as unknown as JsonObject;
  }
  return output.schema;
}

async function boundedJson(response: Response, maxBytes: number): Promise<unknown> {
  if (response.status >= 300 && response.status < 400) {
    throw new AlgalError("EFFECT_FAILED", "AI Gateway redirects are forbidden");
  }
  const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) {
    throw new AlgalError("EFFECT_FAILED", `AI Gateway response exceeds ${maxBytes} bytes`);
  }
  const bytes = await boundedBytes(response.body, maxBytes, "AI Gateway response");
  if (bytes.byteLength > maxBytes) {
    throw new AlgalError("EFFECT_FAILED", `AI Gateway response exceeds ${maxBytes} bytes`);
  }
  const text = new TextDecoder().decode(bytes);
  if (!response.ok) {
    throw new AlgalError(
      "EFFECT_FAILED",
      `AI Gateway returned HTTP ${response.status}; response body withheld`,

    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AlgalError("EFFECT_UNPARSEABLE", "AI Gateway returned invalid JSON");
  }
}

function credential(options: GatewayExecutorOptions): string {
  const value = options.credential
    ?? process.env.AI_GATEWAY_API_KEY
    ?? process.env.VERCEL_OIDC_TOKEN;
  if (typeof value !== "string" || value.length < 16 || value.length > 8192) {
    throw new AlgalError(
      "EFFECT_FAILED",
      "AI Gateway credential is not configured",
    );
  }
  return value;
}

export function vercelGatewayExecutor(options: GatewayExecutorOptions): Executor {
  if (!/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i.test(options.model)) {
    throw new AlgalError("PARSE_FAILED", `invalid AI Gateway model "${options.model}"`);
  }
  const fetcher = options.fetch ?? globalThis.fetch;
  const maxResponseBytes = options.maxResponseBytes ?? 2_097_152;
  const run = async (request: EffectRequest, signal?: AbortSignal): Promise<ExecutorResult> => {
    if (request.kind !== "agent" && request.kind !== "classifier") {
      throw new AlgalError(
        "EFFECT_UNBOUND",
        `AI Gateway cannot serve effect kind "${request.kind}"`,
      );
    }
    const token = credential(options);
    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["value"],
      properties: { value: outputSchema(request.output) },
    } as unknown as JsonObject;
    const body = {
      model: options.model,
      messages: [
        {
          role: "system",
          content: "Execute the declared bounded cell. Return only one JSON object with exactly one key named value and no extra fields.",
        },
        {
          role: "user",
          content: canonicalize({
            prompt: request.prompt,
            context: request.context,
            output: request.output as unknown as JsonValue,
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "algal_cell_output",
          strict: true,
          schema,
        },
      },
      max_tokens: Math.max(1, Math.min(16_384, Math.ceil(request.budget.maxOutputBytes / 4))),
      temperature: 0,
    };
    const response = await fetcher(`${VERCEL_AI_GATEWAY_BASE_URL}/chat/completions`, {
      method: "POST",
      redirect: "error",
      ...(signal ? { signal } : {}),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: canonicalize(body as unknown as JsonValue),
    });
    const raw = record(await boundedJson(response, maxResponseBytes), "AI Gateway response");
    if (!Array.isArray(raw.choices) || raw.choices.length !== 1) {
      throw new AlgalError("EFFECT_UNPARSEABLE", "AI Gateway response must contain one choice");
    }
    const choice = record(raw.choices[0], "AI Gateway choice");
    const message = record(choice.message, "AI Gateway message");
    if (typeof message.content !== "string") {
      throw new AlgalError("EFFECT_UNPARSEABLE", "AI Gateway message content must be text");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(message.content);
    } catch {
      throw new AlgalError("EFFECT_UNPARSEABLE", "AI Gateway structured output is invalid JSON");
    }
    const structured = record(parsed, "AI Gateway structured output");
    if (!("value" in structured)) {
      throw new AlgalError("EFFECT_UNPARSEABLE", "AI Gateway structured output has no value");
    }
    const usage = record(raw.usage ?? {}, "AI Gateway usage");
    const tokensIn = integer(usage.prompt_tokens ?? usage.input_tokens);
    const tokensOut = integer(usage.completion_tokens ?? usage.output_tokens);
    return {
      output: structured.value as JsonValue,
      metadata: {
        executor: `vercel:${options.model}`,
        usage: {
          model: typeof raw.model === "string" ? raw.model : options.model,
          ...(tokensIn !== undefined ? { tokensIn } : {}),
          ...(tokensOut !== undefined ? { tokensOut } : {}),
        },
      },
    };
  };
  return {
    id: `vercel:${options.model}`,
    capabilities: { effects: ["agent", "classifier"] },
    cacheIdentity: digestCanonical({ provider: "vercel", baseUrl: VERCEL_AI_GATEWAY_BASE_URL, model: options.model, responseFormat: "json_schema" }),
    // the backend configuration digest mirrors the native gateway backend —
    // `{kind:"gateway", model}` — so receipts agree across runtimes
    receiptFor: () => ({
      configurationDigest: digestCanonical({ kind: "gateway", model: options.model }),
    }),
    execute: async (request, signal) => (await run(request, signal)).output,
    executeEffect: run,
  };
}
