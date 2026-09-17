// Transports resolve remote manifest closures. An embedding cell's `via`
// names a configured transport; when the local store misses, the transport
// supplies a digest-keyed bundle that `unpackBundle` verifies on install.
// Content-addressing is the trust model: a transport can only deliver
// content the manifest already named — worst case is nondelivery, which
// fails the cell like any other miss.

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseBundle, type Bundle } from "./bundle";
import { BOUNDS } from "./contract";
import type { Digest } from "./digest";
import { MorphogenError } from "./errors";

export interface Transport {
  id: string;
  /** The closure rooted at `root`, or null when the transport doesn't
   * hold it. Implementations bound their own latency and size. */
  getBundle(root: Digest): Promise<Bundle | null>;
}

/** A directory of `<hex>.bundle.json` files — what `pack --out` writes. */
export function fileTransport(dir: string, id = dir): Transport {
  return {
    id,
    async getBundle(root) {
      const file = join(dir, `${root.slice("sha256:".length)}.bundle.json`);
      let text: string;
      try {
        const st = await stat(file);
        if (st.size > BOUNDS.maxBundleBytes) {
          throw new MorphogenError(
            "BUDGET_EXHAUSTED",
            `transport "${id}": bundle ${file} exceeds ${BOUNDS.maxBundleBytes} bytes`,
          );
        }
        text = await readFile(file, "utf8");
      } catch (e) {
        if (e instanceof MorphogenError) throw e;
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw new MorphogenError(
          "IO_FAILED",
          `transport "${id}": ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new MorphogenError(
          "PARSE_FAILED",
          `transport "${id}": ${file} is not JSON`,
        );
      }
      const bundle = parseBundle(raw);
      if (bundle.root !== root) {
        throw new MorphogenError(
          "DIGEST_MISMATCH",
          `transport "${id}": ${file} roots at ${bundle.root}, not ${root}`,
        );
      }
      return bundle;
    },
  };
}

/** Parse a `--transports` file: `{"name": "<dir>"}`. */
export function parseTransportsFile(u: unknown): Record<string, string> {
  const obj = u as Record<string, unknown>;
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    throw new MorphogenError("PARSE_FAILED", "transports file must be an object");
  }
  const keys = Object.keys(obj);
  if (keys.length > BOUNDS.maxTransports) {
    throw new MorphogenError(
      "PARSE_FAILED",
      `transports file exceeds ${BOUNDS.maxTransports} entries`,
    );
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.length > BOUNDS.maxIdLen) {
      throw new MorphogenError("PARSE_FAILED", `transport name "${k}" too long`);
    }
    if (typeof v !== "string" || v.length === 0 || v.length > 4096) {
      throw new MorphogenError(
        "PARSE_FAILED",
        `transport "${k}": directory must be a non-empty string`,
      );
    }
    out[k] = v;
  }
  return out;
}
