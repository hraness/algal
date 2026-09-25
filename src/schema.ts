// Schema versions 2 and 3 of the manifest's JSON schema subset
// (spec/v1/organism.md, "JSON schemas"). contract.ts checks declarations at
// admission; effects.ts checks values. Messages and check order are receipt
// data shared with crates/algal/src/contract.rs. Version 1 stays in those two
// files unchanged. This module imports only browser-clean helpers.
import { AlgalError } from "./errors";
import { compareUtf8 } from "./utf8";
import { canonicalBytes, canonicalize, type JsonObject, type JsonValue } from "./values";

/** `schemaVersion` beside a schema selects that version; its absence means version 1. */
export type SchemaVersion = 2 | 3;
export type SchemaFailureCode = "EFFECT_UNPARSEABLE" | "TYPE_MISMATCH";

export const SCHEMA_V2_BOUNDS = Object.freeze({
  /** Nested schemas, root included; each `properties` child or `items` adds one. */
  maxLevels: 8,
  maxProperties: 64,
  maxRequired: 64,
  maxNameLength: 64,
  maxEnumValues: 32,
  maxEnumValueBytes: 256,
  maxTypes: 7,
});

export const SCHEMA_V3_BOUNDS = Object.freeze({
  ...SCHEMA_V2_BOUNDS,
  /** `minLength`/`maxLength` bound a string's Unicode code points. */
  maxTextLength: 1_000_000,
  /** `format` names a bounded character test. */
  maxFormatNameLength: 32,
  /** The whole-number range an `integer` keeps exact in both runtimes. */
  maxInteger: 9_007_199_254_740_991,
});

const KEYWORDS_V2 = ["type", "required", "properties", "items", "enum", "minimum", "maximum"];
const KEYWORDS_V3 = [...KEYWORDS_V2, "minLength", "maxLength", "format", "uniqueItems", "additionalProperties"];
const TYPES = ["object", "array", "string", "number", "integer", "boolean", "null"];
export const SCHEMA_FORMATS = ["digest", "name", "slug", "uri"] as const;
export type SchemaFormat = (typeof SCHEMA_FORMATS)[number];

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** Own members only, so a polluted prototype cannot add a keyword. */
function own(schema: JsonObject, key: string): JsonValue | undefined {
  return Object.prototype.hasOwnProperty.call(schema, key) ? schema[key] : undefined;
}
/** The declared types, with an omitted `type` meaning object. */
function schemaTypes(schema: JsonObject): string[] {
  const type = own(schema, "type");
  return Array.isArray(type) ? type as string[] : [typeof type === "string" ? type : "object"];
}

export function schemaTypeMatches(type: string, value: JsonValue, v3 = false): boolean {
  // Version 3 bounds an integer to the range both runtimes keep exact;
  // earlier versions keep the unbounded whole-number check they shipped.
  return (type === "string" && typeof value === "string") ||
    (type === "number" && typeof value === "number") ||
    (type === "integer" && typeof value === "number" &&
      (v3 ? Number.isSafeInteger(value) : Number.isInteger(value))) ||
    (type === "boolean" && typeof value === "boolean") ||
    (type === "array" && Array.isArray(value)) ||
    (type === "object" && isObject(value)) ||
    (type === "null" && value === null);
}

/** Each named format is a fixed character test, so the check runs in the
 * value's length; a general regular expression is not part of the subset. */
export function schemaFormatMatches(format: string, value: string): boolean {
  switch (format) {
    case "digest": return /^sha256:[0-9a-f]{64}$/.test(value);
    case "name": return value.length <= 64 && /^[a-z][a-z0-9-]*$/.test(value);
    case "slug": return value.length <= 128 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
    case "uri": return value.length <= 2048 && /^[A-Za-z][A-Za-z0-9+.-]*:[A-Za-z0-9\-._~!$&'()*+,;=:@/?#[\]%]+$/.test(value);
    default: return false;
  }
}

/** Check a version 2 or 3 schema declaration before any cell runs. Each
 * schema is checked before its children, children in UTF-8 key order and
 * then `items`, so both runtimes report the same first failure. `what`
 * locates the schema; the text after it matches the native message. */
function checkDeclaration(schema: JsonObject, what: string, version: SchemaVersion, level: number): void {
  const fail = (reason: string, at = `${what}.`): never => { throw new AlgalError("PARSE_FAILED", `${at}${reason}`); };
  if (level > SCHEMA_V2_BOUNDS.maxLevels) fail(`schema exceeds ${SCHEMA_V2_BOUNDS.maxLevels} nested levels`, `${what}: `);
  const keywords = version === 3 ? KEYWORDS_V3 : KEYWORDS_V2;
  const unknown = Object.keys(schema).filter(key => !keywords.includes(key)).sort(compareUtf8)[0];
  if (unknown !== undefined) fail(`unknown schema keyword ${JSON.stringify(unknown)}`, `${what}: `);
  const type = own(schema, "type");
  if (type !== undefined) {
    const types = Array.isArray(type) ? type : [type];
    if (types.length < 1 || types.length > SCHEMA_V2_BOUNDS.maxTypes || new Set(types).size !== types.length ||
        types.some(item => typeof item !== "string" || !TYPES.includes(item))) {
      fail("type must name a supported JSON type or a nonempty unique union");
    }
  }
  const types = schemaTypes(schema);
  const required = own(schema, "required");
  if (required !== undefined && (!Array.isArray(required) || required.length > SCHEMA_V2_BOUNDS.maxRequired ||
      required.some(name => typeof name !== "string" || name.length > SCHEMA_V2_BOUNDS.maxNameLength) ||
      new Set(required).size !== required.length)) {
    fail(`required must list at most ${SCHEMA_V2_BOUNDS.maxRequired} distinct names of at most ${SCHEMA_V2_BOUNDS.maxNameLength} UTF-16 code units`);
  }
  const properties = own(schema, "properties");
  if (properties !== undefined && (!isObject(properties) || Object.keys(properties).length > SCHEMA_V2_BOUNDS.maxProperties ||
      Object.keys(properties).some(key => !isObject(properties[key])))) {
    fail(`properties must map at most ${SCHEMA_V2_BOUNDS.maxProperties} names to schemas`);
  }
  const items = own(schema, "items");
  if (items !== undefined) {
    if (!isObject(items)) fail("items must be a schema");
    if (!types.includes("array")) fail("items requires type array");
  }
  const allowed = own(schema, "enum");
  if (allowed !== undefined) {
    const count = `enum must list 1 to ${SCHEMA_V2_BOUNDS.maxEnumValues} distinct values`;
    if (!Array.isArray(allowed) || allowed.length < 1 || allowed.length > SCHEMA_V2_BOUNDS.maxEnumValues) return fail(count);
    const seen = new Set<string>();
    for (const value of allowed) {
      const scalar = value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
      if (!scalar || canonicalBytes(value) > SCHEMA_V2_BOUNDS.maxEnumValueBytes) {
        fail(`enum values must be strings, finite numbers, booleans, or null of at most ${SCHEMA_V2_BOUNDS.maxEnumValueBytes} canonical JSON bytes`);
      }
      const key = canonicalize(value);
      if (seen.has(key)) fail(count);
      seen.add(key);
      if (!types.some(item => schemaTypeMatches(item, value, version === 3))) fail("enum values must match the schema type");
    }
  }
  const minimum = own(schema, "minimum"), maximum = own(schema, "maximum");
  if (minimum !== undefined && (typeof minimum !== "number" || !Number.isFinite(minimum))) fail("minimum must be a finite number");
  if (maximum !== undefined && (typeof maximum !== "number" || !Number.isFinite(maximum))) fail("maximum must be a finite number");
  if ((minimum !== undefined || maximum !== undefined) && !types.includes("number") && !types.includes("integer")) {
    fail("minimum and maximum require type number or integer");
  }
  if (typeof minimum === "number" && typeof maximum === "number" && minimum > maximum) fail("minimum exceeds maximum");
  if (version === 3) {
    const minLength = own(schema, "minLength"), maxLength = own(schema, "maxLength");
    for (const [key, bound] of [["minLength", minLength], ["maxLength", maxLength]] as const) {
      if (bound !== undefined && (typeof bound !== "number" || !Number.isInteger(bound) || bound < 0 || bound > SCHEMA_V3_BOUNDS.maxTextLength)) {
        fail(`${key} must be an integer from 0 to ${SCHEMA_V3_BOUNDS.maxTextLength}`);
      }
    }
    if ((minLength !== undefined || maxLength !== undefined) && !types.includes("string")) {
      fail("minLength and maxLength require type string");
    }
    if (typeof minLength === "number" && typeof maxLength === "number" && minLength > maxLength) fail("minLength exceeds maxLength");
    const format = own(schema, "format");
    if (format !== undefined) {
      if (typeof format !== "string" || format.length > SCHEMA_V3_BOUNDS.maxFormatNameLength) {
        fail(`format must be a name of at most ${SCHEMA_V3_BOUNDS.maxFormatNameLength} UTF-16 code units`);
      }
      if (!SCHEMA_FORMATS.includes(format as SchemaFormat)) fail(`format must name ${SCHEMA_FORMATS.slice(0, -1).join(", ")}, or ${SCHEMA_FORMATS[SCHEMA_FORMATS.length - 1]}`);
      if (!types.includes("string")) fail("format requires type string");
    }
    const unique = own(schema, "uniqueItems");
    if (unique !== undefined) {
      if (unique !== true) fail("uniqueItems must be the boolean true");
      if (!types.includes("array")) fail("uniqueItems requires type array");
    }
    const closed = own(schema, "additionalProperties");
    if (closed !== undefined) {
      if (closed !== false) fail("additionalProperties must be the boolean false");
      if (!types.includes("object")) fail("additionalProperties requires type object");
      if (!isObject(properties)) fail("additionalProperties requires a properties map");
    }
  }
  if (isObject(properties)) {
    for (const key of Object.keys(properties).sort(compareUtf8)) {
      checkDeclaration(properties[key] as JsonObject, `${what}.properties.${key}`, version, level + 1);
    }
  }
  if (isObject(items)) checkDeclaration(items, `${what}.items`, version, level + 1);
}

export function checkSchemaDeclarationV2(schema: JsonObject, what: string): void {
  checkDeclaration(schema, what, 2, 1);
}
export function checkSchemaDeclarationV3(schema: JsonObject, what: string): void {
  checkDeclaration(schema, what, 3, 1);
}

/** Check a value against an admitted version 2 or 3 schema: type, allowed
 * values, inclusive number bounds, text length and format, required fields,
 * undeclared fields, declared properties in UTF-8 key order, unique list
 * elements, then list elements in index order. A failing element prefixes
 * its zero-based index. */
function checkValue(schema: JsonObject, value: JsonValue, code: SchemaFailureCode, version: SchemaVersion): void {
  const types = schemaTypes(schema);
  if (!types.some(type => schemaTypeMatches(type, value, version === 3))) throw new AlgalError(code, `expected ${types.join("|")}`);
  // Allowed values are scalars, so strict equality is canonical JSON equality,
  // including 0 and -0. An object or array never matches.
  const allowed = own(schema, "enum");
  if (Array.isArray(allowed) && !allowed.includes(value)) throw new AlgalError(code, "expected an allowed value");
  if (typeof value === "number") {
    const minimum = own(schema, "minimum"), maximum = own(schema, "maximum");
    if (typeof minimum === "number" && value < minimum) throw new AlgalError(code, "number below minimum");
    if (typeof maximum === "number" && value > maximum) throw new AlgalError(code, "number above maximum");
  }
  if (version === 3 && typeof value === "string") {
    // The spread iterator counts Unicode code points, not UTF-16 code units.
    const length = [...value].length;
    const minLength = own(schema, "minLength"), maxLength = own(schema, "maxLength");
    if (typeof minLength === "number" && length < minLength) throw new AlgalError(code, "text shorter than minLength");
    if (typeof maxLength === "number" && length > maxLength) throw new AlgalError(code, "text longer than maxLength");
    const format = own(schema, "format");
    if (typeof format === "string" && !schemaFormatMatches(format, value)) {
      throw new AlgalError(code, `text is not a ${format}`);
    }
  }
  const fields = isObject(value) ? value : undefined;
  const required = own(schema, "required");
  for (const key of Array.isArray(required) ? required as string[] : []) {
    if (fields === undefined || !Object.prototype.hasOwnProperty.call(fields, key)) throw new AlgalError(code, "missing required field");
  }
  const properties = own(schema, "properties");
  if (version === 3 && fields !== undefined && own(schema, "additionalProperties") === false && isObject(properties)) {
    for (const key of Object.keys(fields)) {
      if (!Object.prototype.hasOwnProperty.call(properties, key)) throw new AlgalError(code, "undeclared field");
    }
  }
  if (fields !== undefined && isObject(properties)) {
    for (const key of Object.keys(properties).sort(compareUtf8)) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) checkValue(properties[key] as JsonObject, fields[key]!, code, version);
    }
  }
  if (version === 3 && Array.isArray(value) && own(schema, "uniqueItems") === true) {
    // Canonical JSON identity: 1 and 1.0 repeat, as do reordered records.
    const seen = new Set<string>();
    for (const item of value) {
      const key = canonicalize(item);
      if (seen.has(key)) throw new AlgalError(code, "repeated item");
      seen.add(key);
    }
  }
  const items = own(schema, "items");
  if (Array.isArray(value) && isObject(items)) {
    for (let index = 0; index < value.length; index++) {
      try { checkValue(items, value[index]!, code, version); }
      catch (error) {
        if (error instanceof AlgalError && error.code === code) throw new AlgalError(code, `item ${index}: ${error.message}`);
        throw error;
      }
    }
  }
}

export function checkSchemaValueV2(schema: JsonObject, value: JsonValue, code: SchemaFailureCode): void {
  checkValue(schema, value, code, 2);
}
export function checkSchemaValueV3(schema: JsonObject, value: JsonValue, code: SchemaFailureCode): void {
  checkValue(schema, value, code, 3);
}
