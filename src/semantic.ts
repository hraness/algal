// Semantic index — a derived, disposable index over the content-addressed
// store (manifests, runs, values) plus host-owned docs. `bun:sqlite` holds
// chunk text and f32 vectors; ranking is in-process hybrid scoring
// (cosine ⊕ token overlap) — the same deterministic formula the native
// index uses, so top-K is stable across runtimes. Rebuild any time: every
// chunk re-derives from content-addressed source data.
//
// The index is host tooling, not contract data: it never feeds manifests,
// request digests, or receipts.

import { Database } from "bun:sqlite";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { AlgalError } from "./errors";
import { digestCanonical } from "./digest";
import {
  cosine,
  tokenOverlap,
  type Embedder,
} from "./embeddings";
import type { JsonValue } from "./values";

export const SEMANTIC_BOUNDS = {
  maxChunks: 65_536,
  maxTextBytes: 65_536,
  maxDocBytes: 262_144,
  maxQueryBytes: 8_192,
  maxDocs: 4_096,
  maxK: 64,
  maxFiles: 65_536,
} as const;

export const SEMANTIC_INDEX_FILE = "semantic.db";

/** How a chunk's source text was derived — recorded for explainability. */
export type ChunkSource = {
  /** `manifest:<digest>` | `run:<digest>` | `value:<digest>` | `doc:<path>` */
  ref: string;
  /** Chunk ordinal within the source (0 for single-chunk sources). */
  seq: number;
};

export type Chunk = ChunkSource & {
  /** `sha256(model | ref | seq | textDigest)` — the row's stable identity. */
  id: string;
  text: string;
  /** Canonical digest of the chunk's text — change detection. */
  textDigest: string;
  vec: number[];
};

export type SearchHit = {
  id: string;
  source: string;
  seq: number;
  score: number;
  text: string;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS chunks(
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  source TEXT NOT NULL,
  seq INTEGER NOT NULL,
  text_digest TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  text TEXT NOT NULL,
  vec BLOB NOT NULL
);
CREATE INDEX IF NOT EXISTS chunks_model ON chunks(model);
`;

export function semanticPath(dir: string): string {
  return join(dir, SEMANTIC_INDEX_FILE);
}

/** Open (and lazily schema) the derived index under a store directory. */
export function openIndex(dir: string): Database {
  const db = new Database(semanticPath(dir));
  db.exec(SCHEMA);
  return db;
}

function vecBlob(vec: number[]): Buffer {
  const buf = Buffer.alloc(vec.length * 4);
  for (const [i, v] of vec.entries()) buf.writeFloatLE(v, i * 4);
  return buf;
}

function blobVec(blob: Uint8Array): number[] {
  const out = new Array<number>(blob.length / 4);
  const view = Buffer.from(blob);
  for (let i = 0; i < out.length; i++) out[i] = view.readFloatLE(i * 4);
  return out;
}

/** Split doc text into ≤maxTextBytes chunks on paragraph boundaries;
 * single-chunk for store objects. Deterministic — same bytes, same split. */
export function chunkText(text: string, max = SEMANTIC_BOUNDS.maxTextBytes): string[] {
  if (Buffer.byteLength(text, "utf8") <= max) return [text];
  const parts = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";
  for (const part of parts) {
    const next = current.length === 0 ? part : `${current}\n\n${part}`;
    if (Buffer.byteLength(next, "utf8") <= max) {
      current = next;
      continue;
    }
    if (current.length > 0) chunks.push(current);
    if (Buffer.byteLength(part, "utf8") > max) {
      // a single oversized paragraph splits on byte boundaries
      let rest = part;
      while (Buffer.byteLength(rest, "utf8") > max) {
        const cut = rest.slice(0, max);
        const last = cut.lastIndexOf("\n");
        const take = last > 0 ? cut.slice(0, last) : cut;
        chunks.push(take);
        rest = rest.slice(take.length).replace(/^\n+/, "");
      }
      current = rest;
    } else {
      current = part;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks.slice(0, SEMANTIC_BOUNDS.maxChunks);
}

async function listJson(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((n) => n.endsWith(".json")).sort();
  } catch {
    return [];
  }
}

async function* sources(
  dir: string,
  docs?: string,
): AsyncGenerator<{ ref: string; text: string }> {
  let count = 0;
  for (const [kind, sub] of [
    ["manifest", "manifests"],
    ["run", "runs"],
    ["value", "values"],
  ] as const) {
    for (const name of await listJson(join(dir, sub))) {
      if (++count > SEMANTIC_BOUNDS.maxFiles) return;
      const text = await readFile(join(dir, sub, name), "utf8");
      yield { ref: `${kind}:${name.slice(0, -5)}`, text };
    }
  }
  if (docs !== undefined) {
    const entries = (await readdir(docs)).sort();
    let seen = 0;
    for (const name of entries) {
      if (++seen > SEMANTIC_BOUNDS.maxDocs) return;
      if (!/\.(md|markdown|txt|json)$/i.test(name)) continue;
      const text = await readFile(join(docs, name), "utf8");
      if (Buffer.byteLength(text, "utf8") > SEMANTIC_BOUNDS.maxDocBytes) continue;
      yield { ref: `doc:${name}`, text };
    }
  }
}

export type IndexReport = {
  model: string;
  dimension: number;
  sources: number;
  chunks: number;
  embedded: number;
  reused: number;
};

/** (Re)build the derived index for a store directory. Incremental: chunks
 * whose `(model, source, seq, textDigest)` is unchanged reuse their stored
 * vector — re-indexing a growing store re-embeds only new/changed text. */
export async function indexStore(
  dir: string,
  embedder: Embedder,
  options: { docs?: string; signal?: AbortSignal } = {},
): Promise<IndexReport> {
  const db = openIndex(dir);
  const existing = new Map<string, string>();
  for (const row of db
    .query("SELECT id, text_digest FROM chunks WHERE model = ?")
    .all(embedder.model) as { id: string; text_digest: string }[]) {
    existing.set(row.id, row.text_digest);
  }
  const insert = db.prepare(
    "INSERT OR REPLACE INTO chunks(id, model, source, seq, text_digest, bytes, text, vec) VALUES(?,?,?,?,?,?,?,?)",
  );
  const pending: { chunk: Omit<Chunk, "vec">; text: string }[] = [];
  const seen = new Set<string>();
  let sourcesSeen = 0;
  let chunks = 0;
  let reused = 0;
  for await (const { ref, text } of sources(dir, options.docs)) {
    sourcesSeen++;
    for (const [seq, piece] of chunkText(text).entries()) {
      if (chunks >= SEMANTIC_BOUNDS.maxChunks) break;
      const textDigest = digestCanonical(piece as unknown as JsonValue);
      const id = digestCanonical(
        `${embedder.model}|${ref}|${seq}` as unknown as JsonValue,
      );
      seen.add(id);
      chunks++;
      if (existing.get(id) === textDigest) {
        reused++;
        continue;
      }
      pending.push({
        chunk: { id, ref, seq, text, textDigest },
        text: piece,
      });
    }
  }
  // prune rows whose source vanished or shrank — the index tracks the store
  const prune = db.prepare("DELETE FROM chunks WHERE model = ? AND id = ?");
  for (const id of existing.keys()) {
    if (!seen.has(id)) prune.run(embedder.model, id);
  }
  let embedded = 0;
  const BATCH = 64;
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const vectors = await embedder.embed(
      slice.map((s) => s.text),
      options.signal,
    );
    if (vectors.length !== slice.length) {
      throw new AlgalError("EFFECT_UNPARSEABLE", "embedder returned wrong count");
    }
    const tx = db.transaction(() => {
      for (const [j, vec] of vectors.entries()) {
        const { chunk } = slice[j]!;
        insert.run(
          chunk.id,
          embedder.model,
          chunk.ref,
          chunk.seq,
          chunk.textDigest,
          Buffer.byteLength(chunk.text, "utf8"),
          chunk.text,
          vecBlob(vec),
        );
        embedded++;
      }
    });
    tx();
  }
  db.prepare("INSERT OR REPLACE INTO meta(k, v) VALUES('model', ?)").run(embedder.model);
  return {
    model: embedder.model,
    dimension: embedder.dimension,
    sources: sourcesSeen,
    chunks,
    embedded,
    reused,
  };
}

const VEC_WEIGHT = 0.65;
const LEX_WEIGHT = 0.35;

/** Hybrid rank over the stored chunks: `0.65·cosine + 0.35·tokenOverlap`,
 * ties broken by chunk id for total determinism. The formula is the
 * cross-runtime contract — storage is incidental. */
export async function searchIndex(
  dir: string,
  embedder: Embedder,
  query: string,
  k = 8,
): Promise<SearchHit[]> {
  if (k < 1 || k > SEMANTIC_BOUNDS.maxK) {
    throw new AlgalError("PARSE_FAILED", `k must be 1..${SEMANTIC_BOUNDS.maxK}`);
  }
  if (Buffer.byteLength(query, "utf8") > SEMANTIC_BOUNDS.maxQueryBytes) {
    throw new AlgalError("BUDGET_EXHAUSTED", "query exceeds maxQueryBytes");
  }
  const db = openIndex(dir);
  const rows = db
    .query("SELECT id, source, seq, text, vec FROM chunks WHERE model = ?")
    .all(embedder.model) as {
    id: string;
    source: string;
    seq: number;
    text: string;
    vec: Uint8Array;
  }[];
  const [qv] = await embedder.embed([query]);
  const hits: SearchHit[] = rows.map((row) => {
    const score =
      VEC_WEIGHT * cosine(qv!, blobVec(row.vec)) +
      LEX_WEIGHT * tokenOverlap(query, row.text);
    return {
      id: row.id,
      source: row.source,
      seq: row.seq,
      score,
      text: row.text,
    };
  });
  hits.sort(
    (a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return hits.slice(0, k);
}

/** A human-readable snippet for a hit — first non-empty line of the chunk. */
export function snippet(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}
