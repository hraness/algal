import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { FileStore, MemoryStore } from "./store";

const m = parseOrganismManifest({
  contract: "morphogen.organism.v1",
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
    const dir = await mkdtemp(join(tmpdir(), "morphogen-test-"));
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
    const dir = await mkdtemp(join(tmpdir(), "morphogen-test-"));
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
