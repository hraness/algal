// The source-level static type lattice and core-schema projection, written
// independently from `src/source.ts`. The lattice mirrors the documented
// rules: text/choice unify to text, same-kind numbers and lists drop
// refinements, different non-text kinds merge to json, and text versus
// non-text is a compile error.
import { schemaFormatMatches } from "../../src/schema";
import { utf8Length } from "../../src/utf8";
import type { JsonObject, JsonValue } from "../../src/values";
import { canonicalBytes } from "../../src/values";
import {
  SOURCE_LIMITS, isTextType,
  type FieldType, type PortType, type Record_, type SType, type SourceField,
  type SourceShape, type SourceType,
} from "./model";

export type Reject = (message: string) => never;

export const isText = isTextType;

// ------------------------------------------------------ schema projection

/** The core schema for a declared record: object type, sorted required
 *  names, per-field properties. `json` fields check presence only — unless
 *  the record is closed, where they need the any-value union so the
 *  additionalProperties gate stays meaningful. */
export function recordSchema(fields: readonly SourceField[], closed: boolean): JsonObject {
  const required = fields.filter(field => !field.optional).map(field => field.name).sort();
  const properties: JsonObject = {};
  for (const field of fields) {
    if (field.type.kind === "json") {
      if (closed) properties[field.name] = { type: ["null", "boolean", "object", "array", "number", "string"] };
      continue;
    }
    properties[field.name] = schemaOf(field.type);
  }
  return {
    type: "object",
    ...(required.length ? { required } : {}),
    ...(Object.keys(properties).length ? { properties } : {}),
    ...(closed ? { additionalProperties: false } : {}),
  };
}

/** Schema for a field or list item type: `in` becomes `enum`, bounds become
 *  minimum/maximum or minLength/maxLength, a format name becomes `format`,
 *  `[T]` becomes `items` with `uniqueItems` for `unique`. */
export function schemaOf(type: FieldType): JsonObject {
  switch (type.kind) {
    case "text":
      return type.format !== undefined ? { type: "string", format: type.format }
        : type.values ? { type: "string", enum: [...type.values] }
        : { type: "string",
            ...(type.minimum !== undefined ? { minLength: type.minimum } : {}),
            ...(type.maximum !== undefined ? { maxLength: type.maximum } : {}) };
    case "number":
      return { type: "number", ...(type.values ? { enum: [...type.values] } : {}),
        ...(type.minimum !== undefined ? { minimum: type.minimum } : {}),
        ...(type.maximum !== undefined ? { maximum: type.maximum } : {}) };
    case "integer":
      return { type: "integer", ...(type.values ? { enum: [...type.values] } : {}),
        ...(type.minimum !== undefined ? { minimum: type.minimum } : {}),
        ...(type.maximum !== undefined ? { maximum: type.maximum } : {}) };
    case "boolean": return { type: "boolean" };
    case "json": return {};
    case "record": return structuredClone(type.schema ?? recordSchema(type.fields, type.closed));
    case "list":
      return { type: "array",
        ...(type.item.kind === "json" ? {} : { items: schemaOf(type.item) }),
        ...(type.unique ? { uniqueItems: true } : {}) };
  }
}

/** Nesting measure the manifest contract uses for version-1 schemas. */
export function schemaDepth(value: JsonValue): number {
  if (value === null || typeof value !== "object") return 0;
  const children = Array.isArray(value) ? value : Object.values(value);
  return children.length ? 1 + Math.max(...children.map(schemaDepth)) : 0;
}
/** Schema-version-2 levels: the schema plus its deepest properties/items child. */
export function schemaLevels(schema: JsonObject): number {
  const properties = schema.properties !== undefined ? Object.values(schema.properties as JsonObject) as JsonObject[] : [];
  const children = [...properties, ...(schema.items !== undefined ? [schema.items as JsonObject] : [])];
  return 1 + (children.length ? Math.max(...children.map(schemaLevels)) : 0);
}
/** The lowest schema version carrying the schema's keywords: version 3 for
 *  integer/text-length/format/unique/closed forms, version 2 for lists,
 *  allowed values, bounds, or nesting deeper than version 1 admits. */
export function schemaVersion(schema: JsonObject): 2 | 3 | undefined {
  const children = (value: JsonObject): JsonObject[] => [
    ...(value.properties !== undefined ? Object.values(value.properties as JsonObject) as JsonObject[] : []),
    ...(value.items !== undefined ? [value.items as JsonObject] : []),
  ];
  const version3 = (value: JsonObject): boolean =>
    value.type === "integer" ||
    ["minLength", "maxLength", "format", "uniqueItems", "additionalProperties"].some(key => Object.hasOwn(value, key)) ||
    children(value).some(version3);
  const version2 = (value: JsonObject): boolean =>
    ["items", "enum", "minimum", "maximum"].some(key => Object.hasOwn(value, key)) ||
    children(value).some(version2);
  if (version3(schema)) return 3;
  return version2(schema) || schemaDepth(schema) > SOURCE_LIMITS.maxSchemaDepth ? 2 : undefined;
}

// ------------------------------------------------------- static types ----

/** Static view of a checked record value: optional fields read as dynamic
 *  JSON because they may be absent. */
export function recordValue(record: Record_): SType {
  return { kind: "record", declared: record, fields: new Map(record.fields.map((field): [string, SType] => [field.name,
    field.optional ? { kind: "json" } : staticType(field.type)])) };
}
/** Static view of a declared field type: allowed text values are a closed
 *  choice so `match` can cover them exactly. */
export function staticType(type: FieldType): SType {
  switch (type.kind) {
    case "text": return type.values ? { kind: "choice", labels: [...type.values] } : { kind: "text" };
    case "integer": return { kind: "number" };
    case "record": return recordValue(type);
    case "list": return { kind: "list", item: staticType(type.item) };
    default: return { kind: type.kind };
  }
}
export function sourceValue(type: SourceType): SType { return typeof type === "object" ? staticType(type) : { kind: type }; }
export function parameterType(type: SourceType): FieldType { return typeof type === "object" ? type : { kind: type }; }

export function fieldTypeText(type: FieldType): string {
  switch (type.kind) {
    case "text": return type.format !== undefined ? type.format
      : type.values ? `text in [${type.values.map(value => JSON.stringify(value)).join(", ")}]`
      : `text${type.minimum !== undefined ? ` min ${type.minimum}` : ""}${type.maximum !== undefined ? ` max ${type.maximum}` : ""}`;
    case "number": return type.values ? `number in [${type.values.join(", ")}]`
      : `number${type.minimum !== undefined ? ` min ${type.minimum}` : ""}${type.maximum !== undefined ? ` max ${type.maximum}` : ""}`;
    case "integer": return type.values ? `integer in [${type.values.join(", ")}]`
      : `integer${type.minimum !== undefined ? ` min ${type.minimum}` : ""}${type.maximum !== undefined ? ` max ${type.maximum}` : ""}`;
    case "record": return `${type.closed ? "closed " : ""}${type.name}`;
    case "list": return `[${fieldTypeText(type.item)}]${type.unique ? " unique" : ""}`;
    default: return type.kind;
  }
}

// -------------------------------------------------------- lattice rules --

export function compatible(left: SType, right: SType, reject: Reject): SType {
  if (isText(left) && isText(right)) return { kind: "text" };
  if (left.kind === right.kind && (left.kind === "number" || left.kind === "list")) return { kind: left.kind };
  if (left.kind === right.kind && left.kind !== "decision" && left.kind !== "record") return left;
  if (!isText(left) && !isText(right)) return { kind: "json" };
  return reject("branches must agree on text versus json output");
}

/** The static `require`: json is dynamic and always admitted; text admits
 *  closed choices; every other kind must match exactly. */
export function requireType(type: SType, kind: "number" | "boolean" | "text", reject: Reject): void {
  if (type.kind === "json" || type.kind === kind || (kind === "text" && isText(type))) return;
  reject(`expected ${kind}, found ${type.kind}`);
}

/** Reject a record mismatch the source proves; dynamic JSON defers to the
 *  runtime schema check at the receiving port. */
export function assign(type: SType, record: Record_, what: string, reject: Reject): void {
  if (type.kind === "json") return;
  if (type.kind !== "record") reject(`${what} must be record ${record.name}, found ${type.kind}`);
  for (const field of record.fields) {
    const actual = type.fields.get(field.name);
    if (actual === undefined) {
      if (!field.optional) reject(`${what} is missing field ${field.name} required by record ${record.name}`);
      continue;
    }
    assignField(actual, field.type, `${what} field ${field.name}`, reject);
  }
  const extra = type.declared ? undefined : [...type.fields.keys()].find(name => !record.fields.some(field => field.name === name));
  if (extra !== undefined) reject(`${what} has field ${extra}, which record ${record.name} does not declare`);
}

/** Check one field or list item against a declared field type. A literal's
 *  value and a closed choice's labels are checked against allowed values and
 *  bounds; any other value of the right kind defers to the runtime check. */
export function assignField(actual: SType, expected: FieldType, what: string, reject: Reject): void {
  if (actual.kind === "json" || expected.kind === "json") return;
  switch (expected.kind) {
    case "record": return assign(actual, expected, what, reject);
    case "list": {
      if (actual.kind !== "list") reject(`${what} must be ${fieldTypeText(expected)}, found ${actual.kind}`);
      for (const [index, item] of (actual.items ?? []).entries()) assignField(item, expected.item, `${what} item ${index}`, reject);
      if (actual.item) assignField(actual.item, expected.item, `${what} items`, reject);
      return;
    }
    case "text": {
      if (!isText(actual)) reject(`${what} must be text, found ${actual.kind}`);
      const candidates = actual.kind === "choice" ? actual.labels : actual.kind === "text" && actual.literal !== undefined ? [actual.literal] : [];
      const outside = expected.values ? candidates.find(value => !expected.values!.includes(value)) : undefined;
      if (outside !== undefined) reject(`${what} must be one of the allowed values, found ${JSON.stringify(outside)}`);
      if (actual.kind === "text" && actual.literal !== undefined) {
        const length = [...actual.literal].length;
        if (expected.minimum !== undefined && length < expected.minimum) reject(`${what} must be at least ${expected.minimum} characters, found ${length}`);
        if (expected.maximum !== undefined && length > expected.maximum) reject(`${what} must be at most ${expected.maximum} characters, found ${length}`);
        if (expected.format !== undefined && !schemaFormatMatches(expected.format as never, actual.literal)) reject(`${what} must be ${expected.format}, found ${JSON.stringify(actual.literal)}`);
      }
      return;
    }
    case "number": case "integer": {
      if (actual.kind !== "number") reject(`${what} must be ${expected.kind}, found ${actual.kind}`);
      const value = actual.kind === "number" ? actual.literal : undefined;
      if (value === undefined) return;
      if (expected.kind === "integer" && !Number.isSafeInteger(value)) reject(`${what} must be a whole number, found ${value}`);
      if (expected.values && !expected.values.includes(value)) reject(`${what} must be one of the allowed values, found ${value}`);
      if (expected.minimum !== undefined && value < expected.minimum) reject(`${what} must be at least ${expected.minimum}, found ${value}`);
      if (expected.maximum !== undefined && value > expected.maximum) reject(`${what} must be at most ${expected.maximum}, found ${value}`);
      return;
    }
    case "boolean":
      if (actual.kind !== "boolean") reject(`${what} must be boolean, found ${actual.kind}`);
      return;
  }
}

export function assignShape(type: SType, shape: SourceShape, what: string, reject: Reject): void {
  if (shape.kind === "record") assign(type, shape, what, reject);
  else assignField(type, shape, what, reject);
}

// ------------------------------------------------------------- ports -----

/** The port type a static type lowers into: choice ports keep their labels,
 *  text-ish values take text, everything else flows as json. */
export function portOf(type: SType): PortType {
  return type.kind === "choice" ? { type: "choice", labels: [...type.labels] } : { type: isText(type) ? "text" : "json" };
}
/** The output contract a static type lowers into (the `out` port of an
 *  expression cell). */
export function outputOf(type: SType): { kind: "text" | "json" | "choice"; labels?: string[]; schema?: JsonObject } {
  if (type.kind === "choice") return { kind: "choice", labels: [...type.labels] };
  if (isText(type)) return { kind: "text" };
  const schema: JsonObject = { type: type.kind === "json" ? ["null", "boolean", "object", "array", "number", "string"] : type.kind === "record" || type.kind === "decision" ? "object" : type.kind === "list" ? "array" : type.kind };
  return { kind: "json", schema };
}
export function shapePort(shape: SourceShape): PortType {
  const schema = shape.kind === "record" ? recordSchema(shape.fields, shape.closed) : schemaOf(shape);
  const version = shape.schemaVersion ?? schemaVersion(schema);
  return { type: "json", schema: structuredClone(schema), ...(version !== undefined ? { schemaVersion: version } : {}) };
}
export function shapeOutput(shape: SourceShape): { kind: "json"; schema: JsonObject; schemaVersion?: 2 | 3 } {
  const port = shapePort(shape);
  return { kind: "json", schema: port.schema!, ...(port.schemaVersion !== undefined ? { schemaVersion: port.schemaVersion } : {}) };
}
/** The interface port for a declared parameter: shaped types are json ports
 *  carrying their bounded schema; scalars take the plain port. */
export function parameterPort(type: SourceType): PortType {
  return typeof type === "object" ? shapePort(type) : { type };
}
export function fieldTypeOfSource(type: SourceType): FieldType { return parameterType(type); }

/** Canonical size helpers the checker needs for schema admission. */
export const schemaBytes = canonicalBytes;
export const schemaTextBytes = utf8Length;
