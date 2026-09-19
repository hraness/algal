// TypeSafe Jev ("systemone") — the first `DecisionAsker` backend. Sends the
// provider-neutral question map verbatim to api.typesafe.ai and returns
// strictly-typed answers. Credentials come from the host's credential
// resolver, never manifests, never receipts.

import {
  parseDecisionAnswers,
  type DecisionAsker,
  type DecisionQuestions,
  type DecisionResponse,
  type DecisionState,
  decisionExecutor,
} from "./decisions";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";
import { boundedBytes } from "./io";
import { digestCanonical } from "./digest";
import {
  asObject,
  asString,
  canonicalize,
  optField,
  reqField,
  type JsonValue,
} from "./values";

export const TYPESAFE_SYSTEMONE_URL =
  "https://api.typesafe.ai/v1/systemone" as const;
export const JEV_DEFAULT_MODEL = "jev-latest" as const;
export const JEV_CREDENTIAL_ENV = "TYPESAFE_API_KEY" as const;

const MAX_RESPONSE_BYTES = 1_048_576;

export type JevFetch = (
  input: Request | string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type JevAskerOptions = {
  /** The bearer credential — a value or an async resolver (env, vault, file).
   * Never logged, never digested, never recorded. */
  credential: string | (() => Promise<string>);
  model?: string;
  baseUrl?: string;
  fetch?: JevFetch;
  maxResponseBytes?: number;
};

async function boundedJson(
  response: Response,
  maxBytes: number,
): Promise<unknown> {
  if (response.status >= 300 && response.status < 400) {
    throw new AlgalError("EFFECT_FAILED", "Jev redirects are forbidden");
  }
  const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) {
    throw new AlgalError(
      "EFFECT_FAILED",
      `Jev response exceeds ${maxBytes} bytes`,
    );
  }
  const bytes = await boundedBytes(response.body, maxBytes, "Jev response");
  if (bytes.byteLength > maxBytes) {
    throw new AlgalError(
      "EFFECT_FAILED",
      `Jev response exceeds ${maxBytes} bytes`,
    );
  }
  const text = new TextDecoder().decode(bytes);
  if (!response.ok) {
    throw new AlgalError(
      "EFFECT_FAILED",
      `Jev returned HTTP ${response.status}; response body withheld`,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AlgalError("EFFECT_UNPARSEABLE", "Jev returned invalid JSON");
  }
}

export function jevAsker(options: JevAskerOptions): DecisionAsker {
  const model = options.model ?? JEV_DEFAULT_MODEL;
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(model)) {
    throw new AlgalError("PARSE_FAILED", `invalid Jev model "${model}"`);
  }
  const baseUrl = options.baseUrl ?? TYPESAFE_SYSTEMONE_URL;
  const fetcher = options.fetch ?? globalThis.fetch;
  const maxResponseBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES;
  const key = async (): Promise<string> => {
    const value =
      typeof options.credential === "function"
        ? await options.credential()
        : options.credential;
    if (
      typeof value !== "string" ||
      value.length < 8 ||
      value.length > 8192 ||
      /[\r\n]/.test(value)
    ) {
      throw new AlgalError(
        "EFFECT_UNBOUND",
        "Jev credential is not configured — run `algal auth jev` or set TYPESAFE_API_KEY",
      );
    }
    return value;
  };
  return {
    async ask(
      state: DecisionState,
      questions: DecisionQuestions,
      signal?: AbortSignal,
    ): Promise<DecisionResponse> {
      const response = await fetcher(baseUrl, {
        method: "POST",
        redirect: "error",
        ...(signal ? { signal } : {}),
        headers: {
          authorization: `Bearer ${await key()}`,
          "content-type": "application/json",
        },
        body: canonicalize({ model, state, questions } as JsonValue),
      });
      const raw = asObject(await boundedJson(response, maxResponseBytes), "Jev response");
      const answers = parseDecisionAnswers(
        reqField(raw, "answers", "Jev response"),
        questions,
        "Jev answers",
      );
      const out: DecisionResponse = { answers };
      const usage = optField(raw, "usage");
      const u: NonNullable<DecisionResponse["usage"]> = {};
      if (typeof raw.model === "string") u.model = asString(raw.model, "Jev model", 128);
      if (usage !== undefined) {
        const uo = asObject(usage, "Jev usage");
        const tin = uo.input_tokens;
        const tout = uo.output_tokens;
        if (Number.isSafeInteger(tin) && (tin as number) >= 0) u.tokensIn = tin as number;
        if (Number.isSafeInteger(tout) && (tout as number) >= 0) u.tokensOut = tout as number;
      }
      if (Object.keys(u).length) out.usage = u;
      return out;
    },
  };
}

export type JevExecutorOptions = {
  credential: string | (() => Promise<string>);
  model?: string;
  baseUrl?: string;
  fetch?: JevFetch;
  /** Inject a custom asker (tests, replay adapters). */
  asker?: DecisionAsker;
  maxResponseBytes?: number;
};

/** Jev as a decision executor: `classifier` cells become a single choice
 * question; `decide` cells forward their declared question map. Approval
 * `gate` cells are refused — they route to a human/policy executor, never
 * a model. Executor id `jev` (route.provider:"jev" selects it; `jev:<model>`
 * ids match a full-id provider route). */
export function jevExecutor(options: JevExecutorOptions): Executor {
  const model = options.model ?? JEV_DEFAULT_MODEL;
  const asker =
    options.asker ??
    jevAsker({
      credential: options.credential,
      model,
      ...(options.baseUrl !== undefined ? { baseUrl: options.baseUrl } : {}),
      ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
      ...(options.maxResponseBytes !== undefined
        ? { maxResponseBytes: options.maxResponseBytes }
        : {}),
    });
  return decisionExecutor({
    asker,
    id: model === JEV_DEFAULT_MODEL ? "jev" : `jev:${model}`,
    cacheIdentity: digestCanonical({
      provider: "typesafe",
      baseUrl: options.baseUrl ?? TYPESAFE_SYSTEMONE_URL,
      model,
    }),
  });
}
