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
import { canonicalize, type JsonValue } from "./values";

export interface Store {
  getManifest(digest: Digest): Promise<OrganismManifest | undefined>;
  putManifest(manifest: OrganismManifest): Promise<Digest>;
  getReceipt(digest: Digest): Promise<JsonValue | undefined>;
  putReceipt(receipt: JsonValue): Promise<Digest>;
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
}

export class FileStore implements Store {
  constructor(readonly dir: string) {}

  private manifestPath(d: Digest) {
    return join(this.dir, "manifests", `${d.slice(7)}.json`);
  }
  private receiptPath(d: Digest) {
    return join(this.dir, "runs", `${d.slice(7)}.json`);
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
}
