import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { AlgalError } from "./errors";

import type { Digest } from "./digest-type";
export type { Digest } from "./digest-type";

export function digestCanonical(value: JsonValue): Digest {
  return digestText(canonicalize(value));
}

export function digestText(text: string): Digest {
  const hex = createHash("sha256").update(text, "utf8").digest("hex");
  return `sha256:${hex}`;
}

export function asDigest(u: unknown, what: string): Digest {
  if (typeof u !== "string" || !/^sha256:[0-9a-f]{64}$/.test(u)) {
    throw new AlgalError(
      "PARSE_FAILED",
      `${what} must be a sha256:<64 lowercase hex> digest`,
    );
  }
  return u as Digest;
}
