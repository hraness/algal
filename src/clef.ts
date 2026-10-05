import { decisionExecutor, parseDecisionQuestions, type DecisionAsker, type DecisionQuestions, type DecisionResponse, type DecisionState } from "./decisions";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";
import { boundedBytes } from "./io";
import { digestCanonical } from "./digest";
import { asJsonValue, asObject, canonicalBytes, canonicalize, noUnknownKeys, type JsonValue } from "./values";
import { checkCredentialShape, credentialResolver } from "./credentials";
import type { ClefImage } from "./clef-image";

export type { ClefImage };
export const CLEF_DEFAULT_MODEL = "clef" as const;
export const CLEF_MODELS = ["clef", "clef-flash"] as const;
export type ClefModel = typeof CLEF_MODELS[number];
export const CLEF_IMAGE_LIMITS = { maxImages: 4, maxImageBytes: 4 * 1024 * 1024, maxTotalImageBytes: 8 * 1024 * 1024, maxPixels: 16_000_000, maxBodyBytes: 13 * 1024 * 1024 } as const;

function invalidImage(): never { throw new AlgalError("PARSE_FAILED", "Invalid Clef image: use embedded PNG, JPEG or WebP within the image limits"); }

function dimensions(bytes: Buffer, mime: string): [number, number] {
  if (mime === "image/png" && bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    let offset = 8, data = 0;
    let size: [number, number] | undefined;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset), end = offset + 12 + length;
      if (end > bytes.length) return invalidImage();
      const chunk = bytes.toString("ascii", offset + 4, offset + 8);
      if (offset === 8 && chunk !== "IHDR") return invalidImage();
      if (chunk === "IHDR") {
        if (size || length !== 13 || bytes[offset + 18] !== 0 || bytes[offset + 19] !== 0 || bytes[offset + 20]! > 1) return invalidImage();
        const depths: Record<number, number[]> = { 0: [1,2,4,8,16], 2: [8,16], 3: [1,2,4,8], 4: [8,16], 6: [8,16] };
        if (!depths[bytes[offset + 17]!]?.includes(bytes[offset + 16]!)) return invalidImage();
        size = [bytes.readUInt32BE(offset + 8), bytes.readUInt32BE(offset + 12)];
      }
      if (chunk === "IDAT") data += length;
      if (chunk === "IEND") return length === 0 && end === bytes.length && data > 0 && size ? size : invalidImage();
      offset = end;
    }
  }
  if (mime === "image/jpeg" && bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2, scans = 0;
    let size: [number, number] | undefined;
    while (offset + 2 <= bytes.length) {
      if (bytes[offset++] !== 255) return invalidImage();
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217) return offset === bytes.length && scans > 0 && size ? size : invalidImage();
      if (marker === 1) continue;
      if (marker === undefined || marker === 0 || marker === 216 || (marker >= 208 && marker <= 215) || offset + 2 > bytes.length) return invalidImage();
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) return invalidImage();
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        if (size || length < 11 || length !== 8 + 3 * bytes[offset + 7]!) return invalidImage();
        size = [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
      }
      if (marker === 218) {
        if (!size || length < 8 || length !== 6 + 2 * bytes[offset + 2]!) return invalidImage();
        offset += length;
        const start = offset;
        while (offset < bytes.length) {
          if (bytes[offset] !== 255) { offset++; continue; }
          if (bytes[offset + 1] === 0 || (bytes[offset + 1]! >= 208 && bytes[offset + 1]! <= 215)) { offset += 2; continue; }
          break;
        }
        if (offset === start) return invalidImage();
        scans++;
      } else offset += length;
    }
  }
  if (mime === "image/webp" && bytes.length >= 25 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.readUInt32LE(4) + 8 === bytes.length && bytes.toString("ascii", 8, 12) === "WEBP") {
    let offset = 12;
    let size: [number, number] | undefined, canvas: [number, number] | undefined;
    while (offset + 8 <= bytes.length) {
      const chunk = bytes.toString("ascii", offset, offset + 4), length = bytes.readUInt32LE(offset + 4), start = offset + 8, end = start + length;
      if (end + length % 2 > bytes.length) return invalidImage();
      if (chunk === "VP8X") {
        if (offset !== 12 || length !== 10) return invalidImage();
        canvas = [1 + bytes.readUIntLE(start + 4, 3), 1 + bytes.readUIntLE(start + 7, 3)];
      }
      if (chunk === "VP8L" || chunk === "VP8 ") {
        if (size) return invalidImage();
        if (chunk === "VP8L" && length > 5 && bytes[start] === 47) { const bits = bytes.readUInt32LE(start + 1); size = [1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff)]; }
        else if (chunk === "VP8 " && length > 10 && bytes[start + 3] === 157 && bytes[start + 4] === 1 && bytes[start + 5] === 42) size = [bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff];
        else return invalidImage();
      }
      offset = end + length % 2;
    }
    if (offset === bytes.length && size && (!canvas || (canvas[0] === size[0] && canvas[1] === size[1]))) return size;
  }
  return invalidImage();
}

export function validateClefImages(value: unknown): ClefImage[] {
  if (!Array.isArray(value) || value.length > CLEF_IMAGE_LIMITS.maxImages) return invalidImage();
  let total = 0;
  return value.map((image: unknown) => {
    let mime: string;
    let encoded: string;
    if (typeof image === "string") {
      if (image.length > Math.ceil(CLEF_IMAGE_LIMITS.maxImageBytes / 3) * 4 + 32) return invalidImage();
      const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i.exec(image);
      if (!match) return invalidImage();
      mime = match[1]!.toLowerCase(); encoded = match[2]!;
    } else {
      const obj = asObject(image, "Clef image"); noUnknownKeys(obj, ["content_type", "base64"], "Clef image");
      if (typeof obj.content_type !== "string" || typeof obj.base64 !== "string") return invalidImage();
      mime = obj.content_type; encoded = obj.base64;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(mime) || encoded.length < 4 || encoded.length > Math.ceil(CLEF_IMAGE_LIMITS.maxImageBytes / 3) * 4 || encoded.length % 4 !== 0) return invalidImage();
    for (let i = 0; i < encoded.length; i++) {
      const c = encoded.charCodeAt(i);
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47) continue;
      if (c !== 61 || i < encoded.length - 2 || (i === encoded.length - 2 && encoded[i + 1] !== "=")) return invalidImage();
    }
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.toString("base64") !== encoded || bytes.length > CLEF_IMAGE_LIMITS.maxImageBytes) return invalidImage();
    total += bytes.length;
    if (total > CLEF_IMAGE_LIMITS.maxTotalImageBytes) return invalidImage();
    const [width, height] = dimensions(bytes, mime);
    if (width === 0 || height === 0 || width * height > CLEF_IMAGE_LIMITS.maxPixels) return invalidImage();
    return structuredClone(image) as ClefImage;
  });
}

export function clefEndpoint(accountId: string, model: ClefModel = CLEF_DEFAULT_MODEL): string {
  if (!/^[a-f0-9]{32}$/.test(accountId) || !CLEF_MODELS.includes(model)) throw new AlgalError("PARSE_FAILED", "Invalid Cloudflare Clef account or model");
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/cloudflare/${model}`;
}

export function clefRequest(model: ClefModel, state: DecisionState, questions: DecisionQuestions, images?: unknown): JsonValue {
  if (!CLEF_MODELS.includes(model)) throw new AlgalError("PARSE_FAILED", "Invalid Clef model");
  const parsed = parseDecisionQuestions(questions, "Clef questions");
  for (const [id, q] of Object.entries(parsed)) {
    if (!/^[A-Za-z0-9_.-]{1,100}$/.test(id) || !q.instructions.trim()) throw new AlgalError("PARSE_FAILED", "Invalid Clef question ID or instructions");
    if (new TextEncoder().encode(q.instructions).byteLength > 4096 || (q.criteria !== undefined && Object.values(q.criteria).some(value => typeof value === "string" && new TextEncoder().encode(value).byteLength > 512))) throw new AlgalError("PARSE_FAILED", "Clef question exceeds instruction or criterion byte limit");
    const count = q.criteria === undefined ? 0 : Object.keys(q.criteria).length;
    if ((q.type === "choice" && count < 2) || (q.type === "score" && (count < 2 || count > 10))) throw new AlgalError("PARSE_FAILED", "Clef choice requires at least two options; score requires 2..10 levels");
  }
  asJsonValue(state, "Clef state");
  if (canonicalBytes(state) > 262_144) throw new AlgalError("BUDGET_EXHAUSTED", "Clef state exceeds 262144 bytes");
  const body: JsonValue = { model, state, questions: parsed as unknown as JsonValue, ...(images !== undefined ? { images: validateClefImages(images) as unknown as JsonValue } : {}) };
  if (canonicalBytes(body) > CLEF_IMAGE_LIMITS.maxBodyBytes) throw new AlgalError("BUDGET_EXHAUSTED", "Clef request exceeds 13 MiB");
  return body;
}

export function parseClefResponse(value: unknown, model: ClefModel, questions: DecisionQuestions): DecisionResponse {
  try {
    const envelope = asObject(value, "Clef envelope");
    noUnknownKeys(envelope, ["success", "result", "errors", "messages"], "Clef envelope");
    if (envelope.success !== true || (envelope.errors !== undefined && (!Array.isArray(envelope.errors) || envelope.errors.length !== 0)) || (envelope.messages !== undefined && (!Array.isArray(envelope.messages) || envelope.messages.length > 64))) throw new Error();
    const raw = asObject(envelope.result, "Clef result"); noUnknownKeys(raw, ["model", "answers", "usage"], "Clef result");
    if (raw.model !== model) throw new Error();
    const declared = asObject(raw.answers, "Clef answers");
    if (Object.keys(declared).length !== Object.keys(questions).length || Object.keys(declared).some(id => !Object.hasOwn(questions, id))) throw new Error();
    const answers = Object.create(null) as DecisionResponse["answers"];
    const prob = (value: unknown): number => { if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw new Error(); return value; };
    for (const [id, q] of Object.entries(questions)) {
      const a = asObject(declared[id], "Clef answer");
      if (a.type !== q.type) throw new Error();
      if (q.type === "noul") { noUnknownKeys(a, ["type", "noul"], "Clef answer"); answers[id] = { type: "noul", noul: prob(a.noul) }; continue; }
      noUnknownKeys(a, q.type === "choice" ? ["type", "choice", "confidence", "probabilities"] : ["type", "score", "legend", "confidence", "probabilities"], "Clef answer");
      const p = asObject(a.probabilities, "Clef probabilities");
      const expected = q.type === "choice" ? Object.keys(q.criteria) : q.criteria.map((_, i) => String(i));
      if (Object.keys(p).length !== expected.length || expected.some(k => !Object.hasOwn(p, k))) throw new Error();
      const probabilities = Object.create(null) as Record<string, number>;
      let sum = 0;
      for (const k of expected) { probabilities[k] = prob(p[k]); sum += probabilities[k]!; }
      const bounds = expected.map(k => ({ lower: Math.max(0, probabilities[k]! - 0.0005), upper: Math.min(1, probabilities[k]! + 0.0005) }));
      const lowerTotal = bounds.reduce((n, b) => n + b.lower, 0), upperTotal = bounds.reduce((n, b) => n + b.upper, 0);
      if (sum <= 0 || lowerTotal > 1 + 1e-9 || upperTotal < 1 - 1e-9) throw new Error();
      const confidence = prob(a.confidence);
      if (q.type === "choice") {
        if (typeof a.choice !== "string" || !expected.includes(a.choice) || expected.some(k => probabilities[k]! > probabilities[a.choice as string]! + 0.000001)) throw new Error();
        answers[id] = { type: "choice", choice: a.choice, confidence, probabilities };
      } else {
        const legend = asObject(a.legend, "Clef legend");
        const expectedLegend = Object.fromEntries(q.criteria.map((v, i) => [String(i), v]));
        const endpoint = (maximum: boolean): number => {
          let mean = bounds.reduce((n, b, i) => n + i * b.lower, 0), remaining = Math.max(0, 1 - lowerTotal);
          for (let position = 0; position < bounds.length && remaining > 0; position++) {
            const i = maximum ? bounds.length - 1 - position : position, b = bounds[i]!;
            const added = Math.min(remaining, b.upper - b.lower);
            mean += i * added; remaining -= added;
          }
          return mean;
        };
        if (canonicalize(legend as JsonValue) !== canonicalize(expectedLegend) || typeof a.score !== "number" || !Number.isFinite(a.score) || a.score < 0 || a.score > q.criteria.length - 1 || a.score + 0.0005 < endpoint(false) - 1e-9 || a.score - 0.0005 > endpoint(true) + 1e-9) throw new Error();
        answers[id] = { type: "score", score: a.score, confidence, probabilities, legend: expectedLegend };
      }
    }
    const usage = asObject(raw.usage, "Clef usage"); noUnknownKeys(usage, ["input_tokens", "output_tokens"], "Clef usage");
    const tokens = (value: unknown): number => { if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 1_000_000_000) throw new Error(); return value as number; };
    return { answers, usage: { model, tokensIn: tokens(usage.input_tokens), tokensOut: tokens(usage.output_tokens) } };
  } catch { throw new AlgalError("EFFECT_UNPARSEABLE", "Invalid Cloudflare Clef response; body withheld"); }
}

export type ClefAskerOptions = {
  credential?: string | (() => Promise<string>);
  accountId?: string;
  model?: ClefModel;
  baseUrl?: string;
  fetch?: (input: Request | string | URL, init?: RequestInit) => Promise<Response>;
  maxResponseBytes?: number;
  images?: ClefImage[];
};

export function clefAsker(options: ClefAskerOptions = {}): DecisionAsker {
  const model = options.model ?? CLEF_DEFAULT_MODEL;
  if (!CLEF_MODELS.includes(model)) throw new AlgalError("PARSE_FAILED", "Invalid Clef model");
  const max = options.maxResponseBytes ?? 1_048_576;
  if (!Number.isSafeInteger(max) || max < 1 || max > 16_777_216) throw new AlgalError("PARSE_FAILED", "Invalid Clef response byte limit");
  const configuredAccount = options.accountId;
  if (configuredAccount !== undefined) clefEndpoint(configuredAccount, model);
  if (options.baseUrl !== undefined && options.baseUrl !== clefEndpoint(configuredAccount ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? "", model)) throw new AlgalError("PARSE_FAILED", "Clef endpoint must be the fixed Cloudflare account/model endpoint");
  if (options.images !== undefined) validateClefImages(options.images);
  const resolver = options.credential ?? credentialResolver("clef");
  return {
    async ask(state, questions, signal, images) {
      if (signal?.aborted) throw new AlgalError("BUDGET_EXHAUSTED", "Clef request cancelled before dispatch");
      if (images !== undefined && options.images !== undefined) throw new AlgalError("PARSE_FAILED", "images must have one source");
      signal = signal ? AbortSignal.any([signal, AbortSignal.timeout(120_000)]) : AbortSignal.timeout(120_000);
      const request = clefRequest(model, state, questions, images ?? options.images) as { questions: JsonValue } & Record<string, JsonValue>;
      const body = canonicalize(request);
      const endpoint = clefEndpoint(configuredAccount ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? "", model);
      const token = typeof resolver === "function" ? await resolver() : resolver;
      checkCredentialShape(token, "Cloudflare credential");
      if (signal?.aborted) throw new AlgalError("BUDGET_EXHAUSTED", "Clef request cancelled before dispatch");
      let response: Response;
      try { response = await (options.fetch ?? globalThis.fetch)(endpoint, { method: "POST", redirect: "error", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body, ...(signal ? { signal } : {}) }); }
      catch { throw new AlgalError(signal?.aborted ? "BUDGET_EXHAUSTED" : "EFFECT_FAILED", "Clef request transport failed; external completion uncertain", undefined, { uncertain: true }); }
      if (!response.ok) { void response.body?.cancel().catch(() => {}); throw new AlgalError("EFFECT_FAILED", `Clef returned HTTP ${response.status}; redirects and response body withheld`); }
      if (Number(response.headers.get("content-length")) > max) { void response.body?.cancel().catch(() => {}); throw new AlgalError("EFFECT_FAILED", "Clef response exceeds byte limit", undefined, { uncertain: true }); }
      let bytes: Uint8Array;
      try { bytes = await boundedBytes(response.body, max, "Clef response", signal); }
      catch { throw new AlgalError(signal?.aborted ? "BUDGET_EXHAUSTED" : "EFFECT_FAILED", "Clef response read failed; external completion uncertain", undefined, { uncertain: true }); }
      let raw: unknown;
      try { raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
      catch { throw new AlgalError("EFFECT_UNPARSEABLE", "Invalid Cloudflare Clef response; body withheld"); }
      return parseClefResponse(raw, model, request.questions as unknown as DecisionQuestions);
    },
  };
}

export type ClefExecutorOptions = ClefAskerOptions & { asker?: DecisionAsker };

export function clefExecutor(options: ClefExecutorOptions = {}): Executor {
  if (options.asker !== undefined && options.images !== undefined) throw new AlgalError("PARSE_FAILED", "Clef custom asker cannot configure images; pass images through the low-level request instead");
  const model = options.model ?? CLEF_DEFAULT_MODEL;
  const accountId = options.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
  const images = options.images !== undefined ? validateClefImages(options.images) : undefined;
  const configuration = { kind: "clef", model, accountId, images: images ?? null } as unknown as JsonValue;
  const endpoint = clefEndpoint(accountId, model);
  const id = model === CLEF_DEFAULT_MODEL ? "clef" : `clef:${model}`;
  return { ...decisionExecutor({ asker: options.asker ?? clefAsker({ ...options, model, accountId, ...(images !== undefined ? { images } : {}) }), id, cacheIdentity: digestCanonical({ provider: "cloudflare", baseUrl: endpoint, model, images: images ?? null } as unknown as JsonValue) }), receiptFor: () => ({ configurationDigest: digestCanonical(configuration) }) };
}
