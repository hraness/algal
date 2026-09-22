import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestCanonical } from "./digest";
import { localEmbedder } from "./embeddings";
import type { EffectRequest } from "./effects";
import {
  bindRecallOutput,
  chunkText,
  indexSearcher,
  indexStore,
  openIndex,
  recallExecutor,
  recallOutputSchema,
} from "./semantic";
import { FileStore } from "./store";
import type { JsonObject } from "./values";

test("chunk byte bounds preserve Unicode and normalize paragraph runs deterministically", () => {
  expect(chunkText("é".repeat(80), 64)).toEqual(["é".repeat(32), "é".repeat(32), "é".repeat(16)]);
  expect(chunkText("😀".repeat(9), 16)).toEqual(["😀".repeat(4), "😀".repeat(4), "😀"]);
  expect(chunkText("aaaaa\n\n\nbbbbb\n\ncccccc", 8)).toEqual(["aaaaa", "bbbbb", "cccccc"]);
  for (const max of [0, 1, 3, 3.5, 65537]) expect(() => chunkText("😀", max)).toThrow();
});

test("index rows retain exact chunk text and rebuild previously corrupt text/digest pairs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-chunks-"));
  try {
    const docs = join(dir, "docs");
    await mkdir(docs);
    const source = `${"coral ".repeat(10000)}\n\n\n${"forest ".repeat(10000)}`;
    await writeFile(join(docs, "large.md"), source);
    const pieces = chunkText(source);
    expect(pieces.length).toBeGreaterThan(1);
    const embedder = localEmbedder();
    await indexStore(dir, embedder, { docs });
    const db = openIndex(dir);
    try {
      const rows = db.query("SELECT text, text_digest FROM chunks ORDER BY seq").all() as { text: string; text_digest: string }[];
      expect(rows.map(row => row.text)).toEqual(pieces);
      for (const row of rows) expect(row.text_digest).toBe(digestCanonical(row.text));
      db.prepare("UPDATE chunks SET text = ?").run(source);
    } finally { db.close(); }
    const repaired = await indexStore(dir, embedder, { docs });
    expect(repaired.embedded).toBe(pieces.length);
    expect(repaired.reused).toBe(0);
    const check = openIndex(dir);
    try {
      expect((check.query("SELECT text FROM chunks ORDER BY seq").all() as { text: string }[]).map(row => row.text)).toEqual(pieces);
    } finally { check.close(); }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

const request = (overrides: Partial<EffectRequest> = {}): EffectRequest => ({
  contract: "algal.effect.v1",
  cellId: "memory",
  kind: "recall",
  prompt: "",
  context: { inputs: { q: "coral" } },
  output: { kind: "json", schema: recallOutputSchema() },
  budget: { maxContextBytes: 4096, maxOutputBytes: 8192 },
  recall: { query: "coral habitat", k: 2, embedder: "local" },
  ...overrides,
});

describe("recall effects", () => {
  test("forwards the bounded probe and exposes value sources as refs", async () => {
    let probe: [string, number, string] | undefined;
    const ex = recallExecutor({
      id: "memory",
      async search(query, k, embedder) {
        probe = [query, k, embedder];
        return [{
          id: digestCanonical("chunk"),
          source: `value:${"a".repeat(64)}`,
          seq: 0,
          score: 0.75,
          text: "coral habitat",
        }, {
          id: digestCanonical("long-chunk"),
          source: "doc:long.txt",
          seq: 1,
          score: 0.5,
          text: `${"a".repeat(2047)}é`,
        }];
      },
    });
    const output = await ex.execute(request()) as JsonObject;
    expect(ex.capabilities?.effects).toEqual(["recall"]);
    expect(probe).toEqual(["coral habitat", 2, "local"]);
    const hits = output.hits as JsonObject[];
    expect(hits[0]!.ref).toBe(`sha256:${"a".repeat(64)}`);
    expect(hits[1]!.text).toBe("a".repeat(2047));
    expect(Buffer.byteLength(hits[1]!.text as string, "utf8")).toBeLessThanOrEqual(2048);
    expect(bindRecallOutput(output, 2)).toEqual(output);
  });

  test("queries the derived local index and returns a loadable value ref", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-recall-"));
    try {
      const store = new FileStore(dir);
      const ref = await store.putValue({ species: "coral", habitat: "warm reef" });
      const embedder = localEmbedder();
      await indexStore(dir, embedder);
      const ex = recallExecutor(indexSearcher(dir, embedder, "local"));
      const output = await ex.execute(request()) as JsonObject;
      const hits = output.hits as JsonObject[];
      expect(hits).toHaveLength(1);
      expect(hits[0]?.ref).toBe(ref);
      expect(hits[0]?.text).toContain("coral");
      expect(ex.cacheable).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("rejects wrong request kinds, excess hits, and malformed records", async () => {
    const ex = recallExecutor({
      id: "memory",
      async search() {
        return Array.from({ length: 3 }, (_, seq) => ({
          id: digestCanonical(`chunk-${seq}`),
          source: `doc:${seq}`,
          seq,
          score: 0,
          text: "x",
        }));
      },
    });
    await expect(ex.execute(request({ kind: "agent" })))
      .rejects.toThrowError();
    await expect(ex.execute(request())).rejects.toThrowError(/over k/);
    expect(() => bindRecallOutput({ hits: [{ id: "bad" }] }, 2))
      .toThrowError(/invalid/);
    expect(() => bindRecallOutput({
      hits: [{
        id: digestCanonical("mismatch"),
        source: `value:${"a".repeat(64)}`,
        seq: 0,
        score: 1,
        text: "x",
        ref: `sha256:${"b".repeat(64)}`,
      }],
    }, 2)).toThrowError(/invalid/);
    expect(() => bindRecallOutput({ hits: [], extra: true }, 2))
      .toThrowError(/only a hits array/);
  });
});
