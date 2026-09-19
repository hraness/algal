// Content-addressed store: manifests and run receipts live under their
// canonical digests. `FileStore` writes to a `.algal/` directory;
// `MemoryStore` backs tests. The interface is the Oh-adoption seam — an
// Oh-backed store implements these four methods over the op log.

import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, rename, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  BOUNDS,
  manifestToJson,
  parseOrganismManifest,
  type OrganismManifest,
} from "./contract";
import { parseEffectReceipt, type EffectReceipt } from "./effects";
import { asJsonValue, canonicalize, type JsonValue } from "./values";

export interface Store {
  getManifest(digest: Digest): Promise<OrganismManifest | undefined>;
  putManifest(manifest: OrganismManifest): Promise<Digest>;
  getReceipt(digest: Digest): Promise<JsonValue | undefined>;
  putReceipt(receipt: JsonValue): Promise<Digest>;
  /** Generic JSON CAS — `ref` ports point at values stored here. */
  getValue(digest: Digest): Promise<JsonValue | undefined>;
  putValue(value: JsonValue): Promise<Digest>;
  /** Effect memo index: requestDigest → recorded successful receipt.
   * Unlike the CAS methods this is keyed by *request*, not content — the
   * point is that two runs issuing the identical request share one answer.
   * `putEffect` is first-wins and idempotent. */
  getEffect(requestDigest: Digest, executor?: string): Promise<EffectReceipt | undefined>;
  putEffect(receipt: EffectReceipt, executor?: string): Promise<Digest>;
  /** Slots: named mutable cells that persist across runs — an organism's
   * memory. Not content-addressed: `setSlot` overwrites. `slot` cells are
   * the only access, so reads/writes land on the run receipt. */
  getSlot(name: string): Promise<JsonValue | undefined>;
  setSlot(name: string, value: JsonValue): Promise<void>;
}

export class MemoryStore implements Store {
  private manifests = new Map<Digest, OrganismManifest>();
  private receipts = new Map<Digest, JsonValue>();

  async getManifest(digest: Digest) {
    return structuredClone(this.manifests.get(digest));
  }
  async putManifest(manifest: OrganismManifest) {
    const d = digestCanonical(manifestToJson(manifest));
    this.manifests.set(d, structuredClone(manifest));
    return d;
  }
  async getReceipt(digest: Digest) {
    return structuredClone(this.receipts.get(digest));
  }
  async putReceipt(receipt: JsonValue) {
    const d = digestCanonical(receipt);
    this.receipts.set(d, structuredClone(receipt));
    return d;
  }
  private values = new Map<Digest, JsonValue>();
  async getValue(digest: Digest) {
    return structuredClone(this.values.get(digest));
  }
  async putValue(value: JsonValue) {
    const d = digestCanonical(value);
    this.values.set(d, structuredClone(value));
    return d;
  }
  private effects = new Map<Digest, EffectReceipt>();
  async getEffect(requestDigest: Digest, executor?: string) {
    return structuredClone(this.effects.get(effectKey(requestDigest, executor)));
  }
  async putEffect(receipt: EffectReceipt, executor?: string) {
    const key = effectKey(receipt.requestDigest, executor);
    if (!this.effects.has(key)) {
      this.effects.set(key, structuredClone(receipt));
    }
    return receipt.requestDigest;
  }
  private slots = new Map<string, JsonValue>();
  async getSlot(name: string) {
    return structuredClone(this.slots.get(name));
  }
  async setSlot(name: string, value: JsonValue) {
    this.slots.set(name, structuredClone(value));
  }
}

function effectKey(requestDigest: Digest, executor?: string): Digest {
  asDigest(requestDigest, "effect request digest");
  return executor === undefined ? requestDigest : digestCanonical({
    contract: "algal.effect-cache.v1", executor, requestDigest,
  });
}

export function replayStore(source: Store): Store {
  const overlay = new MemoryStore();
  return {
    getManifest: async (d) => await overlay.getManifest(d) ?? source.getManifest(d),
    putManifest: (m) => overlay.putManifest(m),
    getReceipt: async (d) => await overlay.getReceipt(d) ?? source.getReceipt(d),
    putReceipt: (r) => overlay.putReceipt(r),
    getValue: async (d) => {
      const value = await overlay.getValue(d);
      return value === undefined ? source.getValue(d) : value;
    },
    putValue: (v) => overlay.putValue(v),
    getEffect: (d, e) => overlay.getEffect(d, e),
    putEffect: (r, e) => overlay.putEffect(r, e),
    getSlot: (n) => overlay.getSlot(n),
    setSlot: (n, v) => overlay.setSlot(n, v),
  };
}

export const STORE_BOUNDS = { maxDocumentBytes: 67_108_864, maxDepth: 64, maxNodes: 1_000_000 } as const;

function storeJson(value: unknown): JsonValue {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length > 0) {
    const item = pending.pop()!;
    if (++nodes > STORE_BOUNDS.maxNodes || item.depth > STORE_BOUNDS.maxDepth) {
      throw new AlgalError("BUDGET_EXHAUSTED", "store JSON depth/count exceeded");
    }
    if (item.value !== null && typeof item.value === "object") {
      for (const child of Object.values(item.value)) {
        pending.push({ value: child, depth: item.depth + 1 });
        if (pending.length > STORE_BOUNDS.maxNodes) {
          throw new AlgalError("BUDGET_EXHAUSTED", "store JSON count exceeded");
        }
      }
    }
  }
  return asJsonValue(value, "store value");
}

async function guardPath(path: string, directory: boolean): Promise<void> {
  try {
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink() || (directory ? !metadata.isDirectory() : !metadata.isFile())) {
      throw new AlgalError("IO_FAILED", "store symlinks and unexpected file types are not admitted");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function syncDirectory(path: string): Promise<void> {
  const directory = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { await directory.sync(); } finally { await directory.close(); }
}

export class FileStore implements Store {
  constructor(readonly dir: string) {}

  private manifestPath(d: Digest) {
    return join(this.dir, "manifests", `${asDigest(d, "store digest").slice(7)}.json`);
  }
  private receiptPath(d: Digest) {
    return join(this.dir, "runs", `${asDigest(d, "store digest").slice(7)}.json`);
  }
  private valuePath(d: Digest) {
    return join(this.dir, "values", `${asDigest(d, "store digest").slice(7)}.json`);
  }
  private effectPath(d: Digest) {
    return join(this.dir, "effects", `${asDigest(d, "store digest").slice(7)}.json`);
  }
  private slotPath(name: string) {
    if (!/^[a-z][a-z0-9._-]{0,63}$/.test(name)) {
      throw new AlgalError("PARSE_FAILED", "invalid slot name");
    }
    return join(this.dir, "slots", `${name}.json`);
  }

  private async guard(path: string, create = false): Promise<void> {
    await guardPath(this.dir, true);
    await guardPath(dirname(path), true);
    if (create) {
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      await guardPath(this.dir, true);
      await guardPath(dirname(path), true);
    }
    await guardPath(path, false);
  }

  private async read(path: string, max: number = STORE_BOUNDS.maxDocumentBytes): Promise<JsonValue | undefined> {
    await this.guard(path);
    let file;
    try {
      file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new AlgalError("IO_FAILED", `store file cannot be opened: ${(error as NodeJS.ErrnoException).code ?? "unknown"}`);
    }
    try {
      const metadata = await file.stat();
      if (!metadata.isFile() || metadata.size > max) {
        throw new AlgalError("BUDGET_EXHAUSTED", "store file type/byte bound exceeded");
      }
      const chunks: Buffer[] = [];
      let size = 0;
      for (;;) {
        const chunk = Buffer.alloc(Math.min(65_536, max + 1 - size));
        const { bytesRead } = await file.read(chunk, 0, chunk.length, null);
        if (bytesRead === 0) break;
        size += bytesRead;
        if (size > max) {
          throw new AlgalError("BUDGET_EXHAUSTED", "store file byte bound exceeded");
        }
        chunks.push(chunk.subarray(0, bytesRead));
      }
      const value: unknown = JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
      return storeJson(value);
    } catch (error) {
      if (error instanceof AlgalError) throw error;
      if (error instanceof SyntaxError) throw new AlgalError("PARSE_FAILED", "store file contains invalid JSON");
      throw error;
    } finally { await file.close(); }
  }

  private async publish(path: string, value: JsonValue, mutable = false, max: number = STORE_BOUNDS.maxDocumentBytes): Promise<void> {
    const bytes = canonicalize(storeJson(value));
    if (Buffer.byteLength(bytes, "utf8") > max) {
      throw new AlgalError("BUDGET_EXHAUSTED", "store document byte bound exceeded");
    }
    await this.guard(path, true);
    const temporary = join(dirname(path), `.algal-${process.pid}-${randomBytes(16).toString("hex")}`);
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(bytes);
      await file.sync();
    } catch (error) {
      await file.close();
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
    await file.close();
    try {
      await this.guard(path);
      if (mutable) await rename(temporary, path);
      else {
        try { await link(temporary, path); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
      }
      await syncDirectory(dirname(path));
      await syncDirectory(this.dir);
    } finally {
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }

  private async readCas(path: string, digest: Digest, kind: string): Promise<JsonValue | undefined> {
    const value = await this.read(path);
    if (value === undefined) return undefined;
    const actual = digestCanonical(value);
    if (actual !== digest) {
      throw new AlgalError("DIGEST_MISMATCH", `${kind} file ${digest} hashes to ${actual}`);
    }
    return value;
  }

  private async writeCas(path: string, value: JsonValue, digest: Digest, kind: string): Promise<Digest> {
    await this.publish(path, value);
    // Existing immutable entries are never overwritten, including corruption.
    if (await this.readCas(path, digest, kind) === undefined) {
      throw new AlgalError("IO_FAILED", "published store object is missing");
    }
    return digest;
  }

  async getManifest(digest: Digest) {
    const value = await this.read(this.manifestPath(digest));
    if (value === undefined) return undefined;
    const manifest = parseOrganismManifest(value);
    const actual = digestCanonical(manifestToJson(manifest));
    if (actual !== digest) {
      throw new AlgalError("DIGEST_MISMATCH", `manifest file ${digest} hashes to ${actual}`);
    }
    return manifest;
  }
  async putManifest(manifest: OrganismManifest) {
    const value = storeJson(manifestToJson(manifest));
    const digest = digestCanonical(value);
    return this.writeCas(this.manifestPath(digest), value, digest, "manifest");
  }
  async getReceipt(digest: Digest) {
    return this.readCas(this.receiptPath(digest), digest, "receipt");
  }
  async putReceipt(receipt: JsonValue) {
    storeJson(receipt);
    const digest = digestCanonical(receipt);
    return this.writeCas(this.receiptPath(digest), receipt, digest, "receipt");
  }
  async getValue(digest: Digest) {
    return this.readCas(this.valuePath(digest), digest, "value");
  }
  async putValue(value: JsonValue) {
    storeJson(value);
    const digest = digestCanonical(value);
    return this.writeCas(this.valuePath(digest), value, digest, "value");
  }
  async getEffect(requestDigest: Digest, executor?: string) {
    const value = await this.read(this.effectPath(effectKey(requestDigest, executor)));
    if (value === undefined) return undefined;
    const receipt = parseEffectReceipt(value);
    if (receipt.requestDigest !== requestDigest) {
      throw new AlgalError("DIGEST_MISMATCH", `effect file ${requestDigest} claims request ${receipt.requestDigest}`);
    }
    return receipt;
  }
  async putEffect(receipt: EffectReceipt, executor?: string) {
    const path = this.effectPath(effectKey(receipt.requestDigest, executor));
    await this.publish(path, parseEffectReceipt(storeJson(receipt)) as unknown as JsonValue);
    // The memo index remains first-wins, but malformed existing claims fail closed.
    if (await this.getEffect(receipt.requestDigest, executor) === undefined) {
      throw new AlgalError("IO_FAILED", "published effect memo is missing");
    }
    return receipt.requestDigest;
  }
  async getSlot(name: string) {
    return this.read(this.slotPath(name), BOUNDS.maxBlobBytes);
  }
  async setSlot(name: string, value: JsonValue) {
    await this.publish(this.slotPath(name), value, true, BOUNDS.maxBlobBytes);
  }
}
