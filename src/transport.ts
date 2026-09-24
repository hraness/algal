// Transports resolve remote manifest closures. An embedding cell's `via`
// names a configured transport; when the local store misses, the transport
// supplies a digest-keyed bundle that `unpackBundle` verifies on install.
// Content-addressing is the trust model: a transport can only deliver
// content the manifest already named — worst case is nondelivery, which
// fails the cell like any other miss.

import { join } from "node:path";
import { parseBundle } from "./bundle";
import { BOUNDS } from "./contract";
import { AlgalError } from "./errors";
import { boundedBytes, boundedFileBytes } from "./io";

import type { Transport } from "./transport-contract";
export type { Transport } from "./transport-contract";

/** A directory of `<hex>.bundle.json` files — what `pack --out` writes. */
export function fileTransport(dir: string, id = dir): Transport {
  return {
    id,
    async getBundle(root) {
      const file = join(dir, `${root.slice("sha256:".length)}.bundle.json`);
      let text: string;
      try {
        // Configured bundle files may be regular-file symlinks, as before.
        // The descriptor is admitted before any bytes are read.
        const bytes = await boundedFileBytes(file, BOUNDS.maxBundleBytes, `transport "${id}"`, true);
        try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
        catch { throw new AlgalError("PARSE_FAILED", `transport "${id}": invalid UTF-8`); }
      } catch (e) {
        if (e instanceof AlgalError) throw e;
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw new AlgalError(
          "IO_FAILED",
          `transport "${id}": ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new AlgalError(
          "PARSE_FAILED",
          `transport "${id}": ${file} is not JSON`,
        );
      }
      const bundle = parseBundle(raw);
      if (bundle.root !== root) {
        throw new AlgalError(
          "DIGEST_MISMATCH",
          `transport "${id}": ${file} roots at ${bundle.root}, not ${root}`,
        );
      }
      return bundle;
    },
  };
}

/** A remote bundle source over HTTP(S): `GET <base>/<hex>.bundle.json`.
 * Same trust model as FileTransport — the bundle's digests verify on
 * install, so the wire can only deliver what the manifest named. */
export function httpTransport(
  base: string,
  opts: { timeoutMs?: number } = {},
): Transport {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000) {
    throw new AlgalError("PARSE_FAILED", "transport timeout must be 1–600000 milliseconds");
  }
  const url = base.endsWith("/") ? base : base + "/";
  return {
    id: base,
    async getBundle(root) {
      const target = `${url}${root.slice("sha256:".length)}.bundle.json`;
      const signal = AbortSignal.timeout(timeoutMs);
      let res: Response;
      try {
        res = await fetch(target, {
          signal,
        });
      } catch (e) {
        throw new AlgalError(
          "IO_FAILED",
          `transport "${base}": ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      if (res.status === 404) { await res.body?.cancel().catch(() => {}); return null; }
      if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        throw new AlgalError(
          "IO_FAILED",
          `transport "${base}": HTTP ${res.status} for ${target}`,
        );
      }
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > BOUNDS.maxBundleBytes) {
        await res.body?.cancel().catch(() => {});
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          `transport "${base}": bundle exceeds ${BOUNDS.maxBundleBytes} bytes`,
        );
      }
      let bytes: Uint8Array;
      try { bytes = await boundedBytes(res.body, BOUNDS.maxBundleBytes, `transport "${base}"`, signal); }
      catch (error) {
        if (error instanceof AlgalError) throw error;
        throw new AlgalError("IO_FAILED", `transport "${base}": response body unavailable`);
      }
      let raw: unknown;
      try {
        raw = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes));
      } catch {
        throw new AlgalError(
          "PARSE_FAILED",
          `transport "${base}": ${target} is not JSON`,
        );
      }
      const bundle = parseBundle(raw);
      if (bundle.root !== root) {
        throw new AlgalError(
          "DIGEST_MISMATCH",
          `transport "${base}": ${target} roots at ${bundle.root}, not ${root}`,
        );
      }
      return bundle;
    },
  };
}

/** Parse a `--transports` file: `{"name": "<dir>" | "https://…"}`. */
export function parseTransportsFile(u: unknown): Record<string, string> {
  const obj = u as Record<string, unknown>;
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    throw new AlgalError("PARSE_FAILED", "transports file must be an object");
  }
  const keys = Object.keys(obj);
  if (keys.length > BOUNDS.maxTransports) {
    throw new AlgalError(
      "PARSE_FAILED",
      `transports file exceeds ${BOUNDS.maxTransports} entries`,
    );
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.length > BOUNDS.maxIdLen) {
      throw new AlgalError("PARSE_FAILED", `transport name "${k}" too long`);
    }
    if (typeof v !== "string" || v.length === 0 || v.length > 4096) {
      throw new AlgalError(
        "PARSE_FAILED",
        `transport "${k}": directory must be a non-empty string`,
      );
    }
    out[k] = v;
  }
  return out;
}
