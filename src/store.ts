// Content-addressed store: manifests and run receipts live under their
// canonical digests. `FileStore` writes to a `.morphogen/` directory;
// `MemoryStore` backs tests. The interface is the Oh-adoption seam — an
// Oh-backed store implements these four methods over the op log.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { digestCanonical, type Digest } from "./digest";
import { MorphogenError } from "./errors";
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
  getEffect(requestDigest: Digest): Promise<EffectReceipt | undefined>;
  putEffect(receipt: EffectReceipt): Promise<Digest>;
}

export class MemoryStore implements Store {
  private manifests = new Map<Digest, OrganismManifest>();
  private receipts = new Map<Digest, JsonValue>();

  async getManifest(digest: Digest) {
    return this.manifests.get(digest);
  }
  async putManifest(manifest: OrganismManifest) {
    const d = digestCanonical(manifestToJson(manifest));
    this.manifests.set(d, manifest);
    return d;
  }
  async getReceipt(digest: Digest) {
    return this.receipts.get(digest);
  }
  async putReceipt(receipt: JsonValue) {
    const d = digestCanonical(receipt);
    this.receipts.set(d, receipt);
    return d;
  }
  private values = new Map<Digest, JsonValue>();
  async getValue(digest: Digest) {
    return this.values.get(digest);
  }
  async putValue(value: JsonValue) {
    const d = digestCanonical(value);
    this.values.set(d, value);
    return d;
  }
  private effects = new Map<Digest, EffectReceipt>();
  async getEffect(requestDigest: Digest) {
    return this.effects.get(requestDigest);
  }
  async putEffect(receipt: EffectReceipt) {
    if (!this.effects.has(receipt.requestDigest)) {
      this.effects.set(receipt.requestDigest, receipt);
    }
    return receipt.requestDigest;
  }
}

export class FileStore implements Store {
  constructor(readonly dir: string) {}

  private manifestPath(d: Digest) {
    return join(this.dir, "manifests", `${d.slice(7)}.json`);
  }
  private receiptPath(d: Digest) {
    return join(this.dir, "runs", `${d.slice(7)}.json`);
  }
  private valuePath(d: Digest) {
    return join(this.dir, "values", `${d.slice(7)}.json`);
  }
  private effectPath(d: Digest) {
    return join(this.dir, "effects", `${d.slice(7)}.json`);
  }

  async getManifest(digest: Digest) {
    try {
      const raw = await readFile(this.manifestPath(digest), "utf8");
      const parsed = parseOrganismManifest(JSON.parse(raw));
      const actual = digestCanonical(manifestToJson(parsed));
      if (actual !== digest) {
        throw new MorphogenError(
          "DIGEST_MISMATCH",
          `manifest file ${digest} hashes to ${actual}`,
        );
      }
      return parsed;
    } catch (e) {
      if (e instanceof MorphogenError) throw e;
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new MorphogenError("PARSE_FAILED", `manifest ${digest}: ${e}`);
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
        throw new MorphogenError(
          "DIGEST_MISMATCH",
          `receipt file ${digest} hashes to ${actual}`,
        );
      }
      return parsed;
    } catch (e) {
      if (e instanceof MorphogenError) throw e;
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new MorphogenError("PARSE_FAILED", `receipt ${digest}: ${e}`);
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
        throw new MorphogenError(
          "DIGEST_MISMATCH",
          `value file ${digest} hashes to ${actual}`,
        );
      }
      return parsed;
    } catch (e) {
      if (e instanceof MorphogenError) throw e;
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new MorphogenError("PARSE_FAILED", `value ${digest}: ${e}`);
    }
  }

  async putValue(value: JsonValue) {
    const d = digestCanonical(value);
    await mkdir(join(this.dir, "values"), { recursive: true });
    await writeFile(this.valuePath(d), canonicalize(value));
    return d;
  }

  async getEffect(requestDigest: Digest) {
    try {
      const raw = await readFile(this.effectPath(requestDigest), "utf8");
      const parsed = parseEffectReceipt(JSON.parse(raw));
      if (parsed.requestDigest !== requestDigest) {
        throw new MorphogenError(
          "DIGEST_MISMATCH",
          `effect file ${requestDigest} claims request ${parsed.requestDigest}`,
        );
      }
      return parsed;
    } catch (e) {
      if (e instanceof MorphogenError) throw e;
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new MorphogenError("PARSE_FAILED", `effect ${requestDigest}: ${e}`);
    }
  }

  async putEffect(receipt: EffectReceipt) {
    await mkdir(join(this.dir, "effects"), { recursive: true });
    try {
      // flag "wx" fails EEXIST when an entry already claims this request —
      // the first recorded response wins, so a later differing response for
      // the same request can never overwrite the memo
      await writeFile(
        this.effectPath(receipt.requestDigest),
        canonicalize(receipt as unknown as JsonValue),
        { flag: "wx" },
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    return receipt.requestDigest;
  }
}
