/** Closed, bounded readers for verification metadata. No production admission is reused. */
export class VerificationError extends Error {
  constructor(message: string) { super(message); this.name = "VerificationError"; }
}

export function requireThat(value: unknown, message: string): asserts value {
  if (!value) throw new VerificationError(message);
}

export function record(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  requireThat(value !== null && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  const prototype = Object.getPrototypeOf(value);
  requireThat(prototype === Object.prototype || prototype === null, `${label}: expected plain object`);
  const result = value as Record<string, unknown>;
  for (const key of Object.keys(result)) requireThat(keys.includes(key), `${label}: unknown key ${key}`);
  for (const key of keys) requireThat(Object.hasOwn(result, key), `${label}: missing ${key}`);
  return result;
}

export function string(value: unknown, label: string, max = 4096): string {
  requireThat(typeof value === "string" && value.trim().length > 0 && Buffer.byteLength(value) <= max, `${label}: expected nonempty bounded string`);
  requireThat([...value].every(character => {
    const code = character.charCodeAt(0);
    return code >= 32 && code !== 127 || code === 9 || code === 10 || code === 13;
  }), `${label}: control character`);
  return value;
}

export function array(value: unknown, label: string, min = 0, max = 4096): unknown[] {
  requireThat(Array.isArray(value) && value.length >= min && value.length <= max, `${label}: expected ${min}..${max} entries`);
  return value;
}

export function strings(value: unknown, label: string, min = 0, max = 256): string[] {
  const result = array(value, label, min, max).map((item, i) => string(item, `${label}[${i}]`));
  requireThat(new Set(result).size === result.length, `${label}: duplicate entry`);
  return result;
}

export function natural(value: unknown, label: string): number {
  requireThat(typeof value === "number" && Number.isSafeInteger(value) && value >= 0, `${label}: expected nonnegative safe integer`);
  return value;
}

export function boolean(value: unknown, label: string): boolean {
  requireThat(typeof value === "boolean", `${label}: expected boolean`);
  return value;
}

export function member<const T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] {
  requireThat(typeof value === "string" && allowed.includes(value), `${label}: unknown value ${String(value)}`);
  return value as T[number];
}

export function digest(value: unknown, label: string): string {
  requireThat(typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value), `${label}: expected sha256 digest`);
  return value;
}

export function gitHash(value: unknown, label: string): string {
  requireThat(typeof value === "string" && /^[a-f0-9]{40}$/.test(value), `${label}: expected full Git SHA`);
  return value;
}

export function relativePath(value: unknown, label: string): string {
  const path = string(value, label, 1024);
  requireThat(!path.startsWith("/") && !/[\\:\r\n]/u.test(path) && path.split("/").every(part => part !== "" && part !== "." && part !== ".."), `${label}: expected normalized repository-relative path`);
  return path;
}

export function namedStrings(value: unknown, label: string, min = 1): Record<string, string> {
  requireThat(value !== null && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  const entries = Object.entries(value);
  requireThat(entries.length >= min && entries.length <= 256, `${label}: entry bound`);
  const result: Record<string, string> = Object.create(null);
  for (const [key, item] of entries) result[string(key, `${label} key`, 256)] = string(item, `${label}.${key}`);
  return result;
}
