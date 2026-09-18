// Content-addressed store: manifests and run receipts live under their
// canonical digests. `FileStore` writes to a `.algal/` directory;
// `MemoryStore` backs tests. The interface is the Oh-adoption seam — an
// Oh-backed store implements these four methods over the op log.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  manifestToJson,
  parseOrganismManifest,
  type OrganismManifest,
} from "./contract";
import { parseEffectReceipt, type EffectReceipt } from "./effects";
import { canonicalize, type JsonValue } from "./values";

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

  async getManifest(digest: Digest) {
    try {
      const raw = await readFile(this.manifestPath(digest), "utf8");
      const parsed = parseOrganismManifest(JSON.parse(raw));
      const actual = digestCanonical(manifestToJson(parsed));
      if (actual !== digest) {
        throw new AlgalError(
          "DIGEST_MISMATCH",
          `manifest file ${digest} hashes to ${actual}`,
        );
      }
      return parsed;
    } catch (e) {
      if (e instanceof AlgalError) throw e;
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new AlgalError("PARSE_FAILED", `manifest ${digest}: ${e}`);
    }
  }

  async putManifest(manifest: OrganismManifest) {
    const d = digestCanonical(manifestToJson(manifest));
    await mkdir(join(this.dir, "manifests"), { recursive: true });
    await writeFile(this.manifestPath(d), canonicalize(manifestToJson(manifest)));
    return d;
  }

  async getReceipt(digest: Digest) {
    try {
      const raw = await readFile(this.receiptPath(digest), "utf8");
      const parsed = JSON.parse(raw) as JsonValue;
      const actual = digestCanonical(parsed);
      if (actual !== digest) {
        throw new AlgalError(
          "DIGEST_MISMATCH",
          `receipt file ${digest} hashes to ${actual}`,
        );
      }
      return parsed;
    } catch (e) {
      if (e instanceof AlgalError) throw e;
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new AlgalError("PARSE_FAILED", `receipt ${digest}: ${e}`);
    }
  }

  async putReceipt(receipt: JsonValue) {
    const d = digestCanonical(receipt);
    await mkdir(join(this.dir, "runs"), { recursive: true });
    await writeFile(this.receiptPath(d), canonicalize(receipt));
    return d;
  }

  async getValue(digest: Digest) {
    try {
      const raw = await readFile(this.valuePath(digest), "utf8");
      const parsed = JSON.parse(raw) as JsonValue;
      const actual = digestCanonical(parsed);
      if (actual !== digest) {
        throw new AlgalError(
          "DIGEST_MISMATCH",
          `value file ${digest} hashes to ${actual}`,
        );
      }
      return parsed;
    } catch (e) {
      if (e instanceof AlgalError) throw e;
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new AlgalError("PARSE_FAILED", `value ${digest}: ${e}`);
    }
  }

  async putValue(value: JsonValue) {
    const d = digestCanonical(value);
    await mkdir(join(this.dir, "values"), { recursive: true });
    await writeFile(this.valuePath(d), canonicalize(value));
    return d;
  }

  async getEffect(requestDigest: Digest, executor?: string) {
    try {
      const raw = await readFile(this.effectPath(effectKey(requestDigest, executor)), "utf8");
      const parsed = parseEffectReceipt(JSON.parse(raw));
      if (parsed.requestDigest !== requestDigest) {
        throw new AlgalError(
          "DIGEST_MISMATCH",
          `effect file ${requestDigest} claims request ${parsed.requestDigest}`,
        );
      }
      return parsed;
    } catch (e) {
      if (e instanceof AlgalError) throw e;
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new AlgalError("PARSE_FAILED", `effect ${requestDigest}: ${e}`);
    }
  }

  async putEffect(receipt: EffectReceipt, executor?: string) {
    await mkdir(join(this.dir, "effects"), { recursive: true });
    try {
      // flag "wx" fails EEXIST when an entry already claims this request —
      // the first recorded response wins, so a later differing response for
      // the same request can never overwrite the memo
      await writeFile(
        this.effectPath(effectKey(receipt.requestDigest, executor)),
        canonicalize(receipt as unknown as JsonValue),
        { flag: "wx" },
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    return receipt.requestDigest;
  }

  private slotPath(name: string) {
    if (!/^[a-z][a-z0-9._-]{0,63}$/.test(name)) {
      throw new AlgalError("PARSE_FAILED", "invalid slot name");
    }
    return join(this.dir, "slots", `${name}.json`);
  }

  async getSlot(name: string) {
    try {
      const raw = await readFile(this.slotPath(name), "utf8");
      return JSON.parse(raw) as JsonValue;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new AlgalError("PARSE_FAILED", `slot ${name}: ${e}`);
    }
  }

  async setSlot(name: string, value: JsonValue) {
    await mkdir(join(this.dir, "slots"), { recursive: true });
    await writeFile(this.slotPath(name), canonicalize(value));
  }
}
