import { AlgalError } from "./errors";
import type { JsonObject, JsonValue } from "./values";

export type SnapshotLimits = { readonly maxBytes: number; readonly maxDepth: number; readonly maxNodes: number; readonly maxEntries: number; readonly maxStringBytes: number; readonly sortObjectKeys?: boolean };
/** UTF-8 length of `JSON.stringify(text)`, counted without building the
 * escaped text: quotes, backslash and C0 escapes, lone surrogates as `\uXXXX`. */
function jsonStringBytes(text: string): number {
  let bytes = 2;
  for (let index = 0; index < text.length; index++) {
    const unit = text.charCodeAt(index);
    if (unit === 0x22 || unit === 0x5c) bytes += 2;
    else if (unit < 0x20) bytes += unit === 8 || unit === 9 || unit === 10 || unit === 12 || unit === 13 ? 2 : 6;
    else if (unit < 0x80) bytes += 1;
    else if (unit < 0x800) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) { bytes += 4; index++; } else bytes += 6;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) bytes += 6;
    else bytes += 3;
  }
  return bytes;
}
/** Copy foreign data into fresh JSON under explicit limits before any parsing.
 * Only data properties are read; getters, `toJSON`, prototypes, symbols, and
 * unusual own properties are rejected rather than invoked or dropped. This is a
 * data boundary, not a sandbox: same-realm Proxy traps can still observe reads.
 */
export function boundedJsonSnapshot(value: unknown, limits: SnapshotLimits, label: string): JsonValue {
  let nodes = 0;
  let bytes = 0;
  const active = new Set<object>();
  const budget = (message: string): never => { throw new AlgalError("BUDGET_EXHAUSTED", `${label}: ${message}`); };
  const invalid = (message: string): never => { throw new AlgalError("PARSE_FAILED", `${label}: ${message}`); };
  const charge = (count: number): void => {
    bytes += count;
    if (bytes > limits.maxBytes) budget(`exceeds ${limits.maxBytes} JSON bytes`);
  };
  const dataValue = (descriptor: PropertyDescriptor | undefined, what: string): unknown => {
    if (descriptor === undefined) return invalid(`${what} is missing`);
    if (!Object.hasOwn(descriptor, "value")) return invalid(`${what} is an accessor property`);
    if (!descriptor.enumerable) return invalid(`${what} is not enumerable`);
    return descriptor.value;
  };
  // Every UTF-16 unit costs at least one escaped byte, so length screens first.
  const text = (value: string, what: string): number => {
    if (value.length > limits.maxStringBytes) budget(`${what} exceeds ${limits.maxStringBytes} bytes`);
    const encoded = jsonStringBytes(value);
    if (encoded - 2 > limits.maxStringBytes) budget(`${what} exceeds ${limits.maxStringBytes} bytes`);
    return encoded;
  };
  const visit = (value: unknown, depth: number): JsonValue => {
    if (++nodes > limits.maxNodes) budget(`exceeds ${limits.maxNodes} JSON nodes`);
    if (value === null) { charge(4); return null; }
    switch (typeof value) {
      case "boolean": charge(value ? 4 : 5); return value;
      case "number":
        if (!Number.isFinite(value)) return invalid("numbers must be finite");
        charge(String(value).length);
        return value === 0 ? 0 : value;
      case "string": charge(text(value, "string")); return value;
      case "object": break;
      default: return invalid(`unsupported ${typeof value} value`);
    }
    const target = value as object;
    if (depth >= limits.maxDepth) budget(`exceeds nesting depth ${limits.maxDepth}`);
    if (active.has(target)) return invalid("cyclic data");
    // Prototype and length are checked before any key list exists: listing the
    // keys of a huge array or typed array would allocate one string per index.
    const prototype = Object.getPrototypeOf(target) as unknown;
    active.add(target);
    try {
      if (Array.isArray(target)) {
        if (prototype !== Array.prototype) return invalid("arrays must be ordinary arrays");
        const lengthDescriptor = Object.getOwnPropertyDescriptor(target, "length");
        const length: unknown = lengthDescriptor !== undefined && Object.hasOwn(lengthDescriptor, "value") ? lengthDescriptor.value : undefined;
        if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) return invalid("array length is not an integer");
        if (length > limits.maxEntries) budget(`array exceeds ${limits.maxEntries} entries`);
        const keys = Reflect.ownKeys(target);
        if (keys.some(key => typeof key === "symbol")) return invalid("symbol-keyed properties are not JSON");
        if (keys.length !== length + 1) return invalid("arrays must be dense without extra properties");
        charge(2 + Math.max(0, length - 1));
        const out: JsonValue[] = [];
        for (let index = 0; index < length; index++) {
          out.push(visit(dataValue(Object.getOwnPropertyDescriptor(target, index), `array index ${index}`), depth + 1));
        }
        return out;
      }
      if (prototype !== Object.prototype && prototype !== null) return invalid("objects must be plain data objects");
      const keys = Reflect.ownKeys(target);
      if (keys.length > limits.maxEntries) budget(`object exceeds ${limits.maxEntries} entries`);
      if (keys.some(key => typeof key === "symbol")) return invalid("symbol-keyed properties are not JSON");
      const names = keys as string[];
      // Canonical JSON orders property names by UTF-16 code units. Opt-in
      // traversal also makes competing malformed-field errors reproducible.
      if (limits.sortObjectKeys) names.sort();
      charge(2 + Math.max(0, names.length - 1));
      const out: JsonObject = {};
      for (const name of names) {
        charge(text(name, "key") + 1);
        const copied = visit(dataValue(Object.getOwnPropertyDescriptor(target, name), `property ${JSON.stringify(name)}`), depth + 1);
        // defineProperty keeps a foreign "__proto__" key as ordinary data.
        Object.defineProperty(out, name, { value: copied, enumerable: true, writable: true, configurable: true });
      }
      return out;
    } finally { active.delete(target); }
  };
  return visit(value, 0);
}
