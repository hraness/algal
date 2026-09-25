// Schema version 2 of the manifest's JSON schema subset (spec/v1/organism.md,
// "JSON schemas"). contract.ts checks declarations at admission; effects.ts
// checks values. Messages and check order are receipt data shared with
// crates/algal/src/contract.rs. Version 1 stays in those two files unchanged.
// This module imports only browser-clean helpers.
import { AlgalError } from "./errors";
import { compareUtf8 } from "./utf8";
import { canonicalBytes, canonicalize, type JsonObject, type JsonValue } from "./values";

/** `schemaVersion` beside a schema selects version 2; its absence means version 1. */
export type SchemaVersion = 2;
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

const KEYWORDS = ["type", "required", "properties", "items", "enum", "minimum", "maximum"];
const TYPES = ["object", "array", "string", "number", "integer", "boolean", "null"];

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

export function schemaTypeMatches(type: string, value: JsonValue): boolean {
  return (type === "string" && typeof value === "string") ||
    (type === "number" && typeof value === "number") ||
    (type === "integer" && typeof value === "number" && Number.isInteger(value)) ||
    (type === "boolean" && typeof value === "boolean") ||
    (type === "array" && Array.isArray(value)) ||
    (type === "object" && isObject(value)) ||
    (type === "null" && value === null);
}

/** Check a version 2 schema declaration before any cell runs. Each schema is
 * checked before its children, children in UTF-8 key order and then `items`,
 * so both runtimes report the same first failure. `what` locates the schema;
 * the text after it matches the native message. */
export function checkSchemaDeclarationV2(schema: JsonObject, what: string, level = 1): void {
  const fail = (reason: string, at = `${what}.`): never => { throw new AlgalError("PARSE_FAILED", `${at}${reason}`); };
  if (level > SCHEMA_V2_BOUNDS.maxLevels) fail(`schema exceeds ${SCHEMA_V2_BOUNDS.maxLevels} nested levels`, `${what}: `);
  const unknown = Object.keys(schema).filter(key => !KEYWORDS.includes(key)).sort(compareUtf8)[0];
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
      if (!types.some(item => schemaTypeMatches(item, value))) fail("enum values must match the schema type");
    }
  }
  const minimum = own(schema, "minimum"), maximum = own(schema, "maximum");
  if (minimum !== undefined && (typeof minimum !== "number" || !Number.isFinite(minimum))) fail("minimum must be a finite number");
  if (maximum !== undefined && (typeof maximum !== "number" || !Number.isFinite(maximum))) fail("maximum must be a finite number");
  if ((minimum !== undefined || maximum !== undefined) && !types.includes("number") && !types.includes("integer")) {
    fail("minimum and maximum require type number or integer");
  }
  if (typeof minimum === "number" && typeof maximum === "number" && minimum > maximum) fail("minimum exceeds maximum");
  if (isObject(properties)) {
    for (const key of Object.keys(properties).sort(compareUtf8)) {
      checkSchemaDeclarationV2(properties[key] as JsonObject, `${what}.properties.${key}`, level + 1);
    }
  }
  if (isObject(items)) checkSchemaDeclarationV2(items, `${what}.items`, level + 1);
}

/** Check a value against an admitted version 2 schema: type, allowed values,
 * inclusive number bounds, required fields, declared properties in UTF-8 key
 * order, then list elements in index order. A failing element prefixes its
 * zero-based index. */
export function checkSchemaValueV2(schema: JsonObject, value: JsonValue, code: SchemaFailureCode): void {
  const types = schemaTypes(schema);
  if (!types.some(type => schemaTypeMatches(type, value))) throw new AlgalError(code, `expected ${types.join("|")}`);
  // Allowed values are scalars, so strict equality is canonical JSON equality,
  // including 0 and -0. An object or array never matches.
  const allowed = own(schema, "enum");
  if (Array.isArray(allowed) && !allowed.includes(value)) throw new AlgalError(code, "expected an allowed value");
  if (typeof value === "number") {
    const minimum = own(schema, "minimum"), maximum = own(schema, "maximum");
    if (typeof minimum === "number" && value < minimum) throw new AlgalError(code, "number below minimum");
    if (typeof maximum === "number" && value > maximum) throw new AlgalError(code, "number above maximum");
  }
  const fields = isObject(value) ? value : undefined;
  const required = own(schema, "required");
  for (const key of Array.isArray(required) ? required as string[] : []) {
    if (fields === undefined || !Object.prototype.hasOwnProperty.call(fields, key)) throw new AlgalError(code, "missing required field");
  }
  const properties = own(schema, "properties");
  if (fields !== undefined && isObject(properties)) {
    for (const key of Object.keys(properties).sort(compareUtf8)) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) checkSchemaValueV2(properties[key] as JsonObject, fields[key]!, code);
    }
  }
  const items = own(schema, "items");
  if (Array.isArray(value) && isObject(items)) {
    for (let index = 0; index < value.length; index++) {
      try { checkSchemaValueV2(items, value[index]!, code); }
      catch (error) {
        if (error instanceof AlgalError && error.code === code) throw new AlgalError(code, `item ${index}: ${error.message}`);
        throw error;
      }
    }
  }
}
