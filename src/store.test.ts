import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, open, readFile, readdir, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BOUNDS, manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { FileStore, MemoryStore, replayStore, STORE_BOUNDS } from "./store";
import { runOrganism } from "./run";
import { asJsonValue } from "./values";

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
  for (const [name, bytes] of [
    ["invalid leading byte", Buffer.from([0x22, 0xff, 0x22])],
    ["overlong encoding", Buffer.from([0x22, 0xc0, 0xaf, 0x22])],
    ["truncated sequence", Buffer.from([0x22, 0xe2, 0x82, 0x22])],
    ["UTF-8 encoded surrogate", Buffer.from([0x22, 0xed, 0xa0, 0x80, 0x22])],
    ["invalid object key", Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x3a, 0x31, 0x7d])],
    ["invalid overwritten value", Buffer.concat([Buffer.from('{"x":"'), Buffer.from([0xff]), Buffer.from('","x":1}')])],
  ] as const) {
    test(`rejects malformed UTF-8 ${name} without replacing the artifact`, async () => {
      const dir = await mkdtemp(join(tmpdir(), "algal-store-utf8-"));
      try {
        const value = asJsonValue(JSON.parse(bytes.toString("utf8")), "lossy fixture");
        const digest = digestCanonical(value);
        const path = join(dir, "values", `${digest.slice(7)}.json`);
        await mkdir(join(dir, "values"));
        await writeFile(path, bytes);
        const store = new FileStore(dir);
        await expect(store.getValue(digest)).rejects.toThrow();
        await expect(store.putValue(value)).rejects.toThrow();
        expect(await readFile(path)).toEqual(bytes);
        expect(await readdir(join(dir, "values"))).toEqual([`${digest.slice(7)}.json`]);
      } finally { await rm(dir, { recursive: true, force: true }); }
    });
  }

  test("byte admission preserves JSON normalization and legacy escaped lone surrogates", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-store-json-domain-"));
    try {
      const store = new FileStore(dir);
      await mkdir(join(dir, "values"));
      for (const raw of [
        ' \n{"x":0,"x":1e0,"replacement":"�"}\t',
        '"\\ud800"',
        '{"\\ud800":"\\udfff","x":"\\ud800","x":1}',
        '"\\ud83d\\ude00"',
      ]) {
        const value = asJsonValue(JSON.parse(raw), "JSON fixture");
        const digest = digestCanonical(value);
        const path = join(dir, "values", `${digest.slice(7)}.json`);
        await writeFile(path, raw);
        expect(await store.getValue(digest)).toEqual(value);
        expect(await store.putValue(value)).toBe(digest);
        expect(await readFile(path, "utf8")).toBe(raw);
      }
      const digest = digestCanonical("bom");
      const path = join(dir, "values", `${digest.slice(7)}.json`);
      const bom = Buffer.from('\ufeff"bom"');
      await writeFile(path, bom);
      await expect(store.getValue(digest)).rejects.toThrow();
      await expect(store.putValue("bom")).rejects.toThrow();
      expect(await readFile(path)).toEqual(bom);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

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

describe("FileStore publication safety", () => {
  test("all store namespaces reject leaf symlinks without touching the target", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-store-links-"));
    try {
      const store = new FileStore(dir);
      const value = { preserve: true };
      const valueDigest = digestCanonical(value);
      const manifestDigest = digestCanonical(manifestToJson(m));
      const effect = { requestDigest: valueDigest, executor: "test", output: value };
      const cases = [
        { kind: "values", leaf: valueDigest.slice(7), write: () => store.putValue(value), read: () => store.getValue(valueDigest) },
        { kind: "runs", leaf: valueDigest.slice(7), write: () => store.putReceipt(value), read: () => store.getReceipt(valueDigest) },
        { kind: "manifests", leaf: manifestDigest.slice(7), write: () => store.putManifest(m), read: () => store.getManifest(manifestDigest) },
        { kind: "effects", leaf: valueDigest.slice(7), write: () => store.putEffect(effect), read: () => store.getEffect(valueDigest) },
        { kind: "slots", leaf: "state", write: () => store.setSlot("state", value), read: () => store.getSlot("state") },
      ];
      for (const entry of cases) {
        await mkdir(join(dir, entry.kind));
        const victim = join(dir, `${entry.kind}-victim.txt`);
        await writeFile(victim, "preserve");
        await symlink(victim, join(dir, entry.kind, `${entry.leaf}.json`));
        await expect(entry.write()).rejects.toMatchObject({ code: "IO_FAILED" });
        await expect(entry.read()).rejects.toMatchObject({ code: "IO_FAILED" });
        expect(await readFile(victim, "utf8")).toBe("preserve");
      }
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("runtime store and slot cells cannot follow planted leaf symlinks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-guest-store-links-"));
    try {
      const value = { message: "guest-controlled" };
      const store = new FileStore(dir);
      for (const kind of ["store", "slot"] as const) {
        const namespace = kind === "store" ? "values" : "slots";
        await mkdir(join(dir, namespace));
        const victim = join(dir, `${kind}-victim.txt`);
        await writeFile(victim, "preserve");
        const leaf = kind === "store" ? digestCanonical(value).slice(7) : "state";
        await symlink(victim, join(dir, namespace, `${leaf}.json`));
        const manifest = parseOrganismManifest({
          contract: "algal.organism.v1", key: `organism:guest-${kind}`, name: "Guest store",
          cells: [
            { id: "source", kind: "const", outputs: { value: { type: "json", value } } },
            kind === "store" ? { id: "write", kind: "store" } : { id: "write", kind: "slot", name: "state", mode: "write" },
          ],
          edges: [{ from: { cell: "source", port: "value" }, to: { cell: "write", port: "data" } }],
        });
        const receipt = await runOrganism({ manifest, store, fns: new Map(), executors: [] });
        expect(receipt.outcome).toBe("failed");
        expect(receipt.failure?.code).toBe("IO_FAILED");
        expect(await readFile(victim, "utf8")).toBe("preserve");
      }
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("namespace symlinks are rejected and corrupt immutable objects are preserved", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-store-namespace-"));
    try {
      const outside = join(dir, "outside"); await mkdir(outside);
      await symlink(outside, join(dir, "values"));
      const store = new FileStore(dir);
      const value = { safe: true }; const digest = digestCanonical(value);
      await expect(store.putValue(value)).rejects.toMatchObject({ code: "IO_FAILED" });
      expect(await readdir(outside)).toEqual([]);
      await unlink(join(dir, "values")); await mkdir(join(dir, "values"));
      const path = join(dir, "values", `${digest.slice(7)}.json`);
      await writeFile(path, '{"corrupt":true}');
      await expect(store.putValue(value)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
      expect(await readFile(path, "utf8")).toBe('{"corrupt":true}');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("concurrent writers publish complete CAS objects and slot values", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-store-publish-"));
    try {
      const store = new FileStore(dir);
      const value = { payload: "x".repeat(100_000), version: "canonical" };
      const digest = digestCanonical(value);
      const initial = { payload: "0".repeat(100_000), version: 0 };
      await store.setSlot("state", initial);
      let finished = false;
      const writers = Promise.all(Array.from({ length: 8 }, async (_, index) => {
        const concurrent = new FileStore(dir);
        await concurrent.putValue(value);
        await concurrent.setSlot("state", { payload: String(index).repeat(100_000), version: index });
      })).finally(() => { finished = true; });
      while (!finished) {
        const stored = await store.getValue(digest);
        if (stored !== undefined) expect(stored).toEqual(value);
        const slot = await store.getSlot("state") as { payload: string; version: number };
        expect(slot.payload).toBe(String(slot.version).repeat(100_000));
      }
      await writers;
      expect(await store.getValue(digest)).toEqual(value);
      expect((await readdir(join(dir, "values"))).filter(name => name.startsWith(".algal-"))).toEqual([]);
      expect((await readdir(join(dir, "slots"))).filter(name => name.startsWith(".algal-"))).toEqual([]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("oversized files are rejected before reading and missing overlay slots stay isolated", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-store-bounds-"));
    try {
      const store = new FileStore(dir); await mkdir(join(dir, "values"));
      const digest = digestCanonical(null);
      const file = await open(join(dir, "values", `${digest.slice(7)}.json`), "w");
      try { await file.truncate(STORE_BOUNDS.maxDocumentBytes + 1); } finally { await file.close(); }
      await expect(store.getValue(digest)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
      await expect(store.setSlot("oversized", "x".repeat(BOUNDS.maxBlobBytes))).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
      let deep: unknown = null;
      for (let i = 0; i < 65; i++) deep = { next: deep };
      await expect(store.putValue(deep as never)).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
      await store.setSlot("shared", "live");
      const overlay = replayStore(store);
      expect(await overlay.getSlot("shared")).toBeUndefined();
      await overlay.setSlot("shared", null);
      expect(await overlay.getSlot("shared")).toBeNull();
      expect(await store.getSlot("shared")).toBe("live");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
