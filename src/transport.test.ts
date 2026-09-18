import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packOrganism } from "./bundle";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { fileTransport, httpTransport, parseTransportsFile } from "./transport";
import { verifyReceipt } from "./verify";
import { canonicalize, type JsonValue } from "./values";

const inner = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:t-inner",
  name: "TInner",
  cells: [
    { id: "in", kind: "input", outputs: { v: "text" } },
    { id: "e", kind: "fn", fn: "echo.v1" },
  ],
  edges: [
    { from: { cell: "in", port: "v" }, to: { cell: "e", port: "value" } },
  ],
  interface: {
    inputs: { v: { cell: "in", port: "v" } },
    outputs: { v: { cell: "e", port: "value" } },
  },
});
const innerDigest = digestCanonical(manifestToJson(inner));

const outerJson = (via?: string) => ({
  contract: "algal.organism.v1",
  key: "organism:t-outer",
  name: "TOuter",
  cells: [
    { id: "src", kind: "input", outputs: { v: "text" } },
    {
      id: "sub",
      kind: "organism",
      manifest: innerDigest,
      ...(via ? { via } : {}),
    },
    { id: "emit", kind: "fn", fn: "echo.v1" },
  ],
  edges: [
    { from: { cell: "src", port: "v" }, to: { cell: "sub", port: "v" } },
    { from: { cell: "sub", port: "v" }, to: { cell: "emit", port: "value" } },
  ],
});

async function withTmpDir(
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "mg-transport-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("via transports", () => {
  test("a missing sub-manifest resolves through a FileTransport bundle", async () =>
    withTmpDir(async (dir) => {
      // The remote holds the closure; the local store is empty.
      const remoteStore = new MemoryStore();
      await remoteStore.putManifest(inner);
      const bundle = await packOrganism(inner, remoteStore);
      await writeFile(
        join(dir, `${innerDigest.slice(7)}.bundle.json`),
        canonicalize(bundle as unknown as JsonValue),
      );

      const receipt = await runOrganism({
        manifest: parseOrganismManifest(outerJson("bundles")),
        args: { src: { v: "hello" } },
        fns: builtinRegistry(),
        store: new MemoryStore(),
        executors: [],
        transports: { bundles: fileTransport(dir, "bundles") },
      });
      expect(receipt.outcome).toBe("complete");
      expect(receipt.cells["emit"]?.outputs?.value).toBe("hello");
      // provenance: the organism cell records which transport served it
      expect(receipt.cells["sub"]?.via).toBe("bundles");
    }));

  test("a via run verifies bit-for-bit without the transport", async () =>
    withTmpDir(async (dir) => {
      const remoteStore = new MemoryStore();
      await remoteStore.putManifest(inner);
      const bundle = await packOrganism(inner, remoteStore);
      await writeFile(
        join(dir, `${innerDigest.slice(7)}.bundle.json`),
        canonicalize(bundle as unknown as JsonValue),
      );
      const m = parseOrganismManifest(outerJson("bundles"));
      const store = new MemoryStore();
      const receipt = await runOrganism({
        manifest: m,
        args: { src: { v: "x" } },
        fns: builtinRegistry(),
        store,
        executors: [],
        transports: { bundles: fileTransport(dir, "bundles") },
      });
      // verify in a *fresh* store? no — the bundle installed the manifest,
      // and the recorded `via` replays as provenance, not a fetch.
      const report = await verifyReceipt(
        receipt as unknown as JsonValue,
        manifestToJson(m),
        store,
      );
      expect(report.ok).toBe(true);
      expect(report.digest).toBe(receipt.digest);
    }));

  test("a via cell without a configured transport fails closed", async () => {
    await expect(
      runOrganism({
        manifest: parseOrganismManifest(outerJson("bundles")),
        args: { src: { v: "x" } },
        fns: builtinRegistry(),
        store: new MemoryStore(),
        executors: [],
      }),
    ).rejects.toThrow('transport "bundles" is not configured');
  });

  test("a transport that lacks the bundle fails closed", async () =>
    withTmpDir(async (dir) => {
      await expect(
        runOrganism({
          manifest: parseOrganismManifest(outerJson("bundles")),
          args: { src: { v: "x" } },
          fns: builtinRegistry(),
          store: new MemoryStore(),
          executors: [],
          transports: { bundles: fileTransport(dir, "bundles") },
        }),
      ).rejects.toThrow("has no bundle rooted at");
    }));

  test("a tampered transport bundle fails digest verification", async () =>
    withTmpDir(async (dir) => {
      const remoteStore = new MemoryStore();
      await remoteStore.putManifest(inner);
      const bundle = await packOrganism(inner, remoteStore);
      const tampered = JSON.parse(JSON.stringify(bundle));
      tampered.manifests[innerDigest].name = "Forged";
      await writeFile(
        join(dir, `${innerDigest.slice(7)}.bundle.json`),
        canonicalize(tampered as JsonValue),
      );
      await expect(
        runOrganism({
          manifest: parseOrganismManifest(outerJson("bundles")),
          args: { src: { v: "x" } },
          fns: builtinRegistry(),
          store: new MemoryStore(),
          executors: [],
          transports: { bundles: fileTransport(dir, "bundles") },
        }),
      ).rejects.toThrow(/hashes to|roots at/);
    }));

  test("a locally-present manifest ignores via entirely", async () => {
    const store = new MemoryStore();
    await store.putManifest(inner);
    const receipt = await runOrganism({
      manifest: parseOrganismManifest(outerJson("bundles")),
      args: { src: { v: "x" } },
      fns: builtinRegistry(),
      store,
      executors: [],
      // no transports configured — never consulted on a local hit
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["sub"]?.via).toBeUndefined();
  });

  test("fileTransport rejects a wrong-rooted bundle file", async () =>
    withTmpDir(async (dir) => {
      const remoteStore = new MemoryStore();
      await remoteStore.putManifest(inner);
      const bundle = await packOrganism(inner, remoteStore);
      const wrong = { ...bundle, root: bundle.root };
      // rename: file claims root A, served under a different digest name
      await writeFile(
        join(dir, `${"0".repeat(64)}.bundle.json`),
        canonicalize(wrong as JsonValue),
      );
      const t = fileTransport(dir, "t");
      const other = `sha256:${"0".repeat(64)}` as Digest;
      await expect(t.getBundle(other)).rejects.toThrow("roots at");
    }));

  test("parseTransportsFile validates the name→dir map", () => {
    expect(parseTransportsFile({ a: "/tmp/x" })).toEqual({ a: "/tmp/x" });
    expect(() => parseTransportsFile([])).toThrow("object");
    expect(() => parseTransportsFile({ a: 1 })).toThrow("non-empty string");
    const tooMany: Record<string, string> = {};
    for (let i = 0; i < 17; i++) tooMany[`t${i}`] = "/tmp";
    expect(() => parseTransportsFile(tooMany)).toThrow("exceeds");
  });
});

describe("httpTransport", () => {
  test("serves a bundle over HTTP and installs it verified", async () => {
    const remoteStore = new MemoryStore();
    await remoteStore.putManifest(inner);
    const bundle = await packOrganism(inner, remoteStore);
    const body = canonicalize(bundle as unknown as JsonValue);
    const server = Bun.serve({
      port: 0,
      fetch(req) {
        const path = new URL(req.url).pathname;
        return path === `/${innerDigest.slice(7)}.bundle.json`
          ? new Response(body, { headers: { "content-type": "application/json" } })
          : new Response("nope", { status: 404 });
      },
    });
    try {
      const receipt = await runOrganism({
        manifest: parseOrganismManifest(outerJson("net")),
        args: { src: { v: "wire" } },
        fns: builtinRegistry(),
        store: new MemoryStore(),
        executors: [],
        transports: {
          net: httpTransport(`http://127.0.0.1:${server.port}`),
        },
      });
      expect(receipt.outcome).toBe("complete");
      expect(receipt.cells["emit"]?.outputs?.value).toBe("wire");
      expect(receipt.cells["sub"]?.via).toBe("net");
    } finally {
      server.stop(true);
    }
  });

  test("a 404 is a miss; a tampered body fails the digest check", async () => {
    const remoteStore = new MemoryStore();
    await remoteStore.putManifest(inner);
    const bundle = await packOrganism(inner, remoteStore);
    const tampered = JSON.parse(JSON.stringify(bundle));
    tampered.manifests[innerDigest].name = "Forged";
    const bad = canonicalize(tampered as JsonValue);
    const server = Bun.serve({
      port: 0,
      fetch(req) {
        return new URL(req.url).pathname === `/${innerDigest.slice(7)}.bundle.json`
          ? new Response(bad)
          : new Response("nope", { status: 404 });
      },
    });
    try {
      const t = httpTransport(`http://127.0.0.1:${server.port}`);
      await expect(
        t.getBundle(`sha256:${"f".repeat(64)}` as Digest),
      ).resolves.toBeNull();
      // the tampered entry passes getBundle's root check but fails the
      // per-entry rehash when unpack installs it
      await expect(
        runOrganism({
          manifest: parseOrganismManifest(outerJson("net")),
          args: { src: { v: "x" } },
          fns: builtinRegistry(),
          store: new MemoryStore(),
          executors: [],
          transports: { net: t },
        }),
      ).rejects.toThrow("hashes to");
    } finally {
      server.stop(true);
    }
  });
});
