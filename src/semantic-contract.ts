/** Portable recall contract and executor. Index storage is host-owned. */
import { AlgalError } from "./errors";
import type { EffectRequest, Executor } from "./effects";
import type { JsonObject, JsonValue } from "./values";

export const SEMANTIC_BOUNDS = {
  maxChunks: 65_536,
  maxTextBytes: 65_536,
  maxDocBytes: 262_144,
  maxQueryBytes: 8_192,
  maxDocs: 4_096,
  maxK: 64,
  maxFiles: 65_536,
} as const;

export type SearchHit = {
  id: string;
  source: string;
  seq: number;
  score: number;
  text: string;
};

/** Per-hit text cap inside a `recall` response — enough for a downstream
 * `decide` rerank or prompt, small enough that k hits stay well inside
 * maxOutputBytes. The chunk's full payload stays in CAS behind `ref`. */
export const RECALL_HIT_TEXT_BYTES = 2048;

/** The derived output contract every `kind:"recall"` response binds
 * against — `{hits: [{id, source, seq, score, text, ref?}]}`, shallow-checked
 * like every effect contract; the response itself is recorded verbatim. */
export function recallOutputSchema(): JsonObject {
  return {
    type: "object",
    required: ["hits"],
    properties: { hits: { type: "array" } },
  };
}

function hitJson(hit: SearchHit): JsonObject {
  const encoded = Buffer.from(hit.text, "utf8");
  let end = Math.min(encoded.length, RECALL_HIT_TEXT_BYTES);
  while (end < encoded.length && end > 0 && (encoded[end]! & 0xc0) === 0x80) end--;
  const text = encoded.subarray(0, end).toString("utf8");
  const out: JsonObject = {
    id: hit.id,
    source: hit.source,
    seq: hit.seq,
    score: hit.score,
    text,
  };
  // `value:<digest>` chunks are CAS-resolvable — surface the digest as a
  // `ref` so `recall → load` resolves the full payload without parsing.
  if (hit.source.startsWith("value:")) {
    const id = hit.source.slice(6);
    const ref = id.startsWith("sha256:") ? id : `sha256:${id}`;
    if (/^sha256:[0-9a-f]{64}$/.test(ref)) out.ref = ref;
  }
  return out;
}

export function bindRecallOutput(raw: JsonValue, k: number): JsonObject {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AlgalError("EFFECT_UNPARSEABLE", "recall output must be an object");
  }
  const obj = raw as JsonObject;
  if (Object.keys(obj).some((key) => key !== "hits") || !Array.isArray(obj.hits)) {
    throw new AlgalError("EFFECT_UNPARSEABLE", "recall output must contain only a hits array");
  }
  if (obj.hits.length > k) {
    throw new AlgalError(
      "EFFECT_UNPARSEABLE",
      `recall output returned ${obj.hits.length} hits over k ${k}`,
    );
  }
  for (const [i, rawHit] of obj.hits.entries()) {
    if (rawHit === null || typeof rawHit !== "object" || Array.isArray(rawHit)) {
      throw new AlgalError("EFFECT_UNPARSEABLE", `recall output hits[${i}] must be an object`);
    }
    const hit = rawHit as JsonObject;
    const allowed = new Set(["id", "source", "seq", "score", "text", "ref"]);
    if (Object.keys(hit).some((key) => !allowed.has(key))) {
      throw new AlgalError("EFFECT_UNPARSEABLE", `recall output hits[${i}] has an unknown key`);
    }
    const sourceId = typeof hit.source === "string" && hit.source.startsWith("value:")
      ? hit.source.slice(6)
      : undefined;
    const sourceRef = sourceId === undefined
      ? undefined
      : sourceId.startsWith("sha256:") ? sourceId : `sha256:${sourceId}`;
    if (
      typeof hit.id !== "string" || !/^sha256:[0-9a-f]{64}$/.test(hit.id) ||
      typeof hit.source !== "string" || hit.source.length > 512 ||
      typeof hit.seq !== "number" || !Number.isInteger(hit.seq) ||
        hit.seq < 0 || hit.seq >= SEMANTIC_BOUNDS.maxChunks ||
      typeof hit.score !== "number" || !Number.isFinite(hit.score) ||
      typeof hit.text !== "string" || Buffer.byteLength(hit.text, "utf8") > RECALL_HIT_TEXT_BYTES ||
      (hit.ref !== undefined &&
        (typeof hit.ref !== "string" || !/^sha256:[0-9a-f]{64}$/.test(hit.ref) ||
          hit.ref !== sourceRef))
    ) {
      throw new AlgalError("EFFECT_UNPARSEABLE", `recall output hits[${i}] is invalid`);
    }
  }
  return obj;
}

/** The provider-neutral recall seam — a host supplies a searcher over its
 * derived index (a store directory, a remote service, a fixture); the
 * executor shapes `kind:"recall"` requests into hits and refuses every
 * other kind, the same way `decisionExecutor` refuses non-decision work. */
export type RecallSearcher = {
  id: string;
  search(query: string, k: number, embedder: string): Promise<SearchHit[]>;
};

export function recallExecutor(searcher: RecallSearcher): Executor {
  return {
    id: searcher.id,
    capabilities: { effects: ["recall"] },
    cacheable: false,
    async execute(request: EffectRequest) {
      if (request.kind !== "recall" || request.recall === undefined) {
        throw new AlgalError(
          "EFFECT_UNBOUND",
          `recall executor cannot serve "${request.kind}" requests`,
        );
      }
      const hits = await searcher.search(
        request.recall.query,
        request.recall.k,
        request.recall.embedder,
      );
      if (hits.length > request.recall.k) {
        throw new AlgalError(
          "EFFECT_UNPARSEABLE",
          `recall searcher returned ${hits.length} hits over k ${request.recall.k}`,
        );
      }
      return { hits: hits.map(hitJson) } as JsonObject;
    },
  };
}

