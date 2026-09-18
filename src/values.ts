// Canonical JSON values: the only data type that crosses Algal boundaries.
// Every foreign value enters as `unknown` and is parsed through these readers.

import { AlgalError } from "./errors";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/** Canonicalize: sorted object keys, no undefined, finite numbers only. */
export function canonicalize(value: JsonValue): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const out = Object.create(null) as JsonObject;
    for (const key of Object.keys(value).sort()) {
      out[key] = sortValue(value[key]!);
    }
    return out;
  }
  return value;
}

export function canonicalBytes(value: JsonValue): number {
  return Buffer.byteLength(canonicalize(value), "utf8");
}

export function isJsonValue(u: unknown): u is JsonValue {
  if (u === null) return true;
  switch (typeof u) {
    case "boolean":
    case "string":
      return true;
    case "number":
      return Number.isFinite(u);
    case "object":
      if (Array.isArray(u)) return u.every(isJsonValue);
      return Object.values(u as object).every(isJsonValue);
    default:
      return false;
  }
}

export function asJsonValue(u: unknown, what: string): JsonValue {
  if (!isJsonValue(u)) {
    throw new AlgalError("PARSE_FAILED", `${what} is not a JSON value`);
  }
  return u;
}

export function asObject(u: unknown, what: string): JsonObject {
  if (u === null || typeof u !== "object" || Array.isArray(u)) {
    throw new AlgalError("PARSE_FAILED", `${what} must be an object`);
  }
  return u as JsonObject;
}

export function asArray(u: unknown, what: string): JsonValue[] {
  if (!Array.isArray(u)) {
    throw new AlgalError("PARSE_FAILED", `${what} must be an array`);
  }
  return u;
}

export function optField(obj: JsonObject, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

export function reqField(obj: JsonObject, key: string, what: string): unknown {
  const v = optField(obj, key);
  if (v === undefined) {
    throw new AlgalError("PARSE_FAILED", `${what} requires "${key}"`);
  }
  return v;
}

export function asString(u: unknown, what: string, maxLen: number): string {
  if (typeof u !== "string" || u.length > maxLen) {
    throw new AlgalError(
      "PARSE_FAILED",
      `${what} must be a string of at most ${maxLen} characters`,
    );
  }
  return u;
}

export function asInt(
  u: unknown,
  what: string,
  min: number,
  max: number,
): number {
  if (typeof u !== "number" || !Number.isInteger(u) || u < min || u > max) {
    throw new AlgalError(
      "PARSE_FAILED",
      `${what} must be an integer in [${min}, ${max}]`,
    );
  }
  return u;
}

export function asSafeId(u: unknown, what: string): string {
  const s = asString(u, what, 64);
  if (!/^[a-z][a-z0-9-]*$/.test(s)) {
    throw new AlgalError(
      "PARSE_FAILED",
      `${what} must be a lowercase kebab-case id`,
    );
  }
  return s;
}

export function noUnknownKeys(
  obj: JsonObject,
  allowed: readonly string[],
  what: string,
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      throw new AlgalError(
        "PARSE_FAILED",
        `${what} has unknown key "${key}"`,
      );
    }
  }
}
