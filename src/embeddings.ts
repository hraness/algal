// Embedding providers — a provider-neutral interface with two
// implementations: the Vercel AI Gateway `/embeddings` endpoint and a
// deterministic local fallback (hashed trigram features, FNV-1a 64, L2
// normalized). The local provider needs no network and no credential; the
// Rust mirror produces bit-identical vectors, so indexes and ranks are
// cross-runtime reproducible.
//
// Embeddings are a derived artifact — they rank the semantic index
// (src/semantic.ts) and never enter manifests, digests, or receipts.

import { AlgalError } from "./errors";
import { boundedBytes } from "./io-runtime";
import { asArray, asObject, reqField } from "./values";

export const VERCEL_GATEWAY_BASE = "https://ai-gateway.vercel.sh/v1" as const;
export const GATEWAY_EMBED_MODEL = "openai/text-embedding-3-small" as const;

export const EMBED_BOUNDS = {
  maxTexts: 256,
  maxTextBytes: 65_536,
  maxDimension: 4096,
  maxResponseBytes: 8_388_608,
} as const;

/** Anything that maps bounded text to fixed-dimension vectors: a remote
 * endpoint (gateway) or the deterministic local embedder. */
export interface Embedder {
  /** Stable provider id recorded in the index's meta table. */
  id: string;
  /** Model/provider identity — indexes are scoped to it. */
  model: string;
  /** Vector dimensionality; fixed per provider. */
  dimension: number;
  embed(texts: string[], signal?: AbortSignal): Promise<number[][]>;
}

export function checkTexts(texts: string[], at = "embed texts"): string[] {
  if (texts.length === 0 || texts.length > EMBED_BOUNDS.maxTexts) {
    throw new AlgalError(
      "PARSE_FAILED",
      `${at} requires 1..${EMBED_BOUNDS.maxTexts} texts`,
    );
  }
  for (const [i, text] of texts.entries()) {
    if (typeof text !== "string" || text.length === 0) {
      throw new AlgalError("PARSE_FAILED", `${at}[${i}] must be nonempty text`);
    }
    if (Buffer.byteLength(text, "utf8") > EMBED_BOUNDS.maxTextBytes) {
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        `${at}[${i}] exceeds ${EMBED_BOUNDS.maxTextBytes} bytes`,
      );
    }
  }
  return texts;
}

// ------------------------------------------------------------ local hash ---

/** The local vector dimension — shared with the Rust mirror, never changed
 * without a new provider id. */
export const LOCAL_DIM = 384;
export const LOCAL_MODEL = "algal/local-trigram-384" as const;
const LOCAL_MAX_TOKENS = 16_384;

/** ASCII lowercase alnum tokenizer — identical in both runtimes. */
export function embedTokens(text: string, maxTokens = LOCAL_MAX_TOKENS): string[] {
  const lower = text.toLowerCase();
  const tokens: string[] = [];
  let start = -1;
  const flush = (end: number) => {
    if (start >= 0) tokens.push(lower.slice(start, end));
    start = -1;
  };
  for (let i = 0; i < lower.length; i++) {
    const c = lower.charCodeAt(i);
    const alnum =
      (c >= 97 && c <= 122) || (c >= 48 && c <= 57);
    if (alnum) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      flush(i);
      if (tokens.length >= maxTokens) return tokens;
    }
  }
  flush(lower.length);
  return tokens.slice(0, maxTokens);
}

/** FNV-1a 64-bit — wraps through BigInt so TS and Rust agree bit-for-bit. */
function fnv1a(bytes: string): bigint {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < bytes.length; i++) {
    h = ((h ^ BigInt(bytes.charCodeAt(i) & 0xff)) * prime) & mask;
  }
  return h;
}

/** One hashed-trigram embedding: character trigrams over each token map to
 * `±1` feature accumulators (`h % dim` position, `h & 1` sign), then L2
 * normalize. Deterministic, symmetric, cross-runtime bit-identical. */
export function localVector(text: string, dimension = LOCAL_DIM): number[] {
  if (dimension <= 0 || dimension > EMBED_BOUNDS.maxDimension) {
    throw new AlgalError("PARSE_FAILED", `invalid embedding dimension ${dimension}`);
  }
  const vec = new Float64Array(dimension);
  const dim = BigInt(dimension);
  for (const token of embedTokens(text)) {
    for (let i = 0; i + 3 <= token.length; i++) {
      const h = fnv1a(token.slice(i, i + 3));
      const idx = Number(h % dim);
      vec[idx] = vec[idx]! + ((h & 1n) === 0n ? 1 : -1);
    }
  }
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  const out = new Array<number>(dimension);
  for (let i = 0; i < dimension; i++) {
    // round through f32 — the same value both runtimes persist
    out[i] = norm === 0 ? 0 : Math.fround(vec[i]! / norm);
  }
  return out;
}

/** The deterministic local embedder — no network, no credential, identical
 * vectors to the Rust `local_embed`. Default whenever the gateway is not
 * configured. */
export function localEmbedder(dimension = LOCAL_DIM): Embedder {
  return {
    id: "local",
    model: LOCAL_MODEL,
    dimension,
    async embed(texts) {
      const checked = checkTexts(texts);
      return checked.map((text) => localVector(text, dimension));
    },
  };
}

// ------------------------------------------------------------ gateway -----

export type GatewayEmbedderOptions = {
  /** Gateway bearer — value or async resolver (env/vercel OIDC). */
  credential: string | (() => Promise<string>);
  model?: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  /** Response ceiling; defaults to EMBED_BOUNDS.maxResponseBytes. */
  maxResponseBytes?: number;
};

async function boundedJson(
  response: Response,
  maxBytes: number,
  at: string,
): Promise<unknown> {
  if (response.status >= 300 && response.status < 400) {
    throw new AlgalError("EFFECT_FAILED", `${at} redirects are forbidden`);
  }
  const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) {
    throw new AlgalError("EFFECT_FAILED", `${at} exceeds ${maxBytes} bytes`);
  }
  const bytes = await boundedBytes(response.body, maxBytes, at);
  if (!response.ok) {
    throw new AlgalError(
      "EFFECT_FAILED",
      `${at} returned HTTP ${response.status}; response body withheld`,
    );
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new AlgalError("EFFECT_UNPARSEABLE", `${at} returned invalid JSON`);
  }
}

/** OpenAI-compatible gateway embeddings: `POST {base}/embeddings` with
 * `{model, input:[...]}` → `{data:[{index, embedding:[…]}]}` sorted by
 * index. Credentials resolve per call, never recorded. */
export function gatewayEmbedder(options: GatewayEmbedderOptions): Embedder {
  const model = options.model ?? GATEWAY_EMBED_MODEL;
  if (!/^[a-z0-9][a-z0-9._/-]{0,127}$/i.test(model)) {
    throw new AlgalError("PARSE_FAILED", `invalid embedding model "${model}"`);
  }
  const baseUrl = (options.baseUrl ?? VERCEL_GATEWAY_BASE).replace(/\/+$/, "");
  const fetcher = options.fetch ?? globalThis.fetch;
  const maxBytes = options.maxResponseBytes ?? EMBED_BOUNDS.maxResponseBytes;
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
        "gateway credential is not configured — set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN",
      );
    }
    return value;
  };
  return {
    id: "gateway",
    model,
    // dimension is learned from the first response; 0 until then
    dimension: 0,
    async embed(texts, signal) {
      const checked = checkTexts(texts);
      const response = await fetcher(`${baseUrl}/embeddings`, {
        method: "POST",
        redirect: "error",
        ...(signal ? { signal } : {}),
        headers: {
          authorization: `Bearer ${await key()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ model, input: checked }),
      });
      const raw = asObject(await boundedJson(response, maxBytes, "embedding response"), "embedding response");
      const data = asArray(reqField(raw, "data", "embedding response"), "embedding data");
      if (data.length !== checked.length) {
        throw new AlgalError(
          "EFFECT_UNPARSEABLE",
          `embedding response returned ${data.length} vectors for ${checked.length} texts`,
        );
      }
      const vectors: (number[] | undefined)[] = new Array(data.length);
      let dimension: number | undefined;
      for (const entry of data) {
        const obj = asObject(entry, "embedding data[]");
        const index = obj.index;
        if (!Number.isSafeInteger(index) || (index as number) < 0 || (index as number) >= data.length) {
          throw new AlgalError("EFFECT_UNPARSEABLE", "embedding data index invalid");
        }
        const vec = asArray(reqField(obj, "embedding", "embedding data[]"), "embedding vector")
          .map((v, i) => {
            if (typeof v !== "number" || !Number.isFinite(v)) {
              throw new AlgalError("EFFECT_UNPARSEABLE", `embedding vector[${i}] invalid`);
            }
            return v;
          });
        if (vec.length === 0 || vec.length > EMBED_BOUNDS.maxDimension) {
          throw new AlgalError("EFFECT_UNPARSEABLE", "embedding dimension invalid");
        }
        if (dimension === undefined) dimension = vec.length;
        if (vec.length !== dimension) {
          throw new AlgalError("EFFECT_UNPARSEABLE", "embedding dimensions differ");
        }
        vectors[index as number] = vec;
      }
      this.dimension = dimension ?? 0;
      return vectors.map((v) => v!);
    },
  };
}

/** Gateway credential env chain — matches the gateway effect backend. */
export function gatewayCredential(): string | undefined {
  return process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
}

/** Validate an embedder spec and return it normalized — `local`, `gateway`,
 * or `gateway:<model>`. Used at contract boundaries where the spec is data. */
export function checkEmbedderSpec(spec: string, at: string): string {
  if (spec === "local" || spec === "gateway") return spec;
  if (spec.startsWith("gateway:") && spec.length > "gateway:".length) {
    return spec;
  }
  throw new AlgalError(
    "PARSE_FAILED",
    `${at}: unknown embedder "${spec}" (want local, gateway, or gateway:<model>)`,
  );
}

/** Resolve the embedder for a CLI invocation: the gateway model when one
 * is named, the deterministic local embedder otherwise. */
export function resolveEmbedder(spec?: string): Embedder {
  const normalized = checkEmbedderSpec(spec ?? "local", "embedder");
  if (normalized === "local") return localEmbedder();
  if (normalized === "gateway") {
    return gatewayEmbedder({ credential: credentialResolver });
  }
  return gatewayEmbedder({
    credential: credentialResolver,
    model: normalized.slice("gateway:".length),
  });
}

async function credentialResolver(): Promise<string> {
  const value = gatewayCredential();
  if (value === undefined) {
    throw new AlgalError(
      "EFFECT_UNBOUND",
      "gateway credential is not configured — set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN",
    );
  }
  return value;
}

// ------------------------------------------------------------ ranking -----

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** Deterministic token overlap `|q ∩ d| / |q|` — the lexical half of the
 * hybrid score, computed identically in both runtimes. */
export function tokenOverlap(query: string, text: string): number {
  const q = new Set(embedTokens(query));
  if (q.size === 0) return 0;
  const d = new Set(embedTokens(text));
  let hit = 0;
  for (const t of q) if (d.has(t)) hit++;
  return hit / q.size;
}
