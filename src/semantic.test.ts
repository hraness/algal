import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestCanonical } from "./digest";
import { localEmbedder } from "./embeddings";
import type { EffectRequest } from "./effects";
import {
  bindRecallOutput,
  indexSearcher,
  indexStore,
  recallExecutor,
  recallOutputSchema,
} from "./semantic";
import { FileStore } from "./store";
import type { JsonObject } from "./values";

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
