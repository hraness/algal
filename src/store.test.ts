import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { FileStore, MemoryStore } from "./store";

const m = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:stored",
  name: "Stored",
  cells: [{ id: "x", kind: "input", outputs: { v: "json" } }],
});

describe("MemoryStore", () => {
  test("round-trips manifests by digest", async () => {
    const s = new MemoryStore();
    const d = await s.putManifest(m);
    const got = await s.getManifest(d);
    expect(got?.key).toBe("organism:stored");
  });

  test("round-trips values by digest", async () => {
    const s = new MemoryStore();
    const v = { doc: "payload", n: 3 };
    const d = await s.putValue(v);
    expect(d).toBe(digestCanonical(v));
    expect(await s.getValue(d)).toEqual(v);
    expect(
      await s.getValue(
        "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      ),
    ).toBeUndefined();
  });
});

describe("FileStore", () => {
  test("round-trips and detects tampering", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-test-"));
    try {
      const s = new FileStore(dir);
      const d = await s.putManifest(m);
      const got = await s.getManifest(d);
      expect(got?.name).toBe("Stored");

      // tamper with the file on disk
      const path = join(dir, "manifests", `${d.slice(7)}.json`);
      await Bun.write(path, JSON.stringify({ contract: "evil" }));
      await expect(s.getManifest(d)).rejects.toThrow();

      // receipts are content-addressed too
      const rd = await s.putReceipt({ hello: "world" });
      const r = await s.getReceipt(rd);
      expect((r as Record<string, unknown>).hello).toBe("world");
      expect(rd).toBe(digestCanonical({ hello: "world" }));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("values round-trip and corrupt files are detected", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-test-"));
    try {
      const s = new FileStore(dir);
      const v = { doc: "payload", items: [1, 2, 3] };
      const d = await s.putValue(v);
      expect(await s.getValue(d)).toEqual(v);

      // tamper: rewrite the file under the same name
      const path = join(dir, "values", `${d.slice(7)}.json`);
      await Bun.write(path, JSON.stringify({ doc: "forged" }));
      await expect(s.getValue(d)).rejects.toThrow("hashes to");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("effect memo index", () => {
  const rec = {
    requestDigest: `sha256:${"a".repeat(64)}` as `sha256:${string}`,
    executor: "test",
    output: "the answer",
    usage: { tokensIn: 3 },
  } as const;

  test("MemoryStore round-trips and is first-wins", async () => {
    const s = new MemoryStore();
    await s.putEffect({ ...rec });
    const got = await s.getEffect(rec.requestDigest);
    expect(got?.output).toBe("the answer");
    // a different response for the same request must not overwrite
    await s.putEffect({ ...rec, output: "different" });
    expect((await s.getEffect(rec.requestDigest))?.output).toBe("the answer");
  });

  test("FileStore round-trips, is first-wins, and detects claim mismatch", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-test-"));
    try {
      const s = new FileStore(dir);
      await s.putEffect({ ...rec });
      expect((await s.getEffect(rec.requestDigest))?.output).toBe(
        "the answer",
      );
      await s.putEffect({ ...rec, output: "different" });
      expect((await s.getEffect(rec.requestDigest))?.output).toBe(
        "the answer",
      );

      // a file whose content claims a different request digest is rejected
      const bad = {
        requestDigest: `sha256:${"b".repeat(64)}`,
        executor: "x",
        output: 1,
      };
      await Bun.write(
        join(dir, "effects", "c".repeat(64) + ".json"),
        JSON.stringify(bad),
      );
      await expect(
        s.getEffect(`sha256:${"c".repeat(64)}` as `sha256:${string}`),
      ).rejects.toThrow("claims request");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
