import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { checkProgram, EXPR_BOUNDS } from "../../src/expr";
import { canonicalize, isJsonValue, type JsonValue } from "../../src/values";
import { locateJsonSpan, type ByteSpan } from "./span";
import { ProjectClosureError, verifyProjectClosure } from "./project-closure";

const ROOT = import.meta.dir;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TYPES = new Set(["null", "boolean", "number", "string", "json"]);

type RecordValue = Record<string, unknown>;
type ErrorCode =
  | "EVENT_LOOP_PARSE"
  | "EVENT_LOOP_CONTRACT"
  | "EVENT_LOOP_UNKNOWN_KEY"
  | "EVENT_LOOP_ID"
  | "EVENT_LOOP_DIGEST"
  | "EVENT_LOOP_BOUNDS"
  | "EVENT_LOOP_SCHEMA"
  | "EVENT_LOOP_REFERENCE"
  | "EVENT_LOOP_SEMANTIC";

const ERROR_CODES: ReadonlySet<string> = new Set<ErrorCode>([
  "EVENT_LOOP_PARSE",
  "EVENT_LOOP_CONTRACT",
  "EVENT_LOOP_UNKNOWN_KEY",
  "EVENT_LOOP_ID",
  "EVENT_LOOP_DIGEST",
  "EVENT_LOOP_BOUNDS",
  "EVENT_LOOP_SCHEMA",
  "EVENT_LOOP_REFERENCE",
  "EVENT_LOOP_SEMANTIC",
]);
const MAX_ERROR_CODE_BYTES = 22;

class FixtureError extends Error {
  constructor(readonly code: ErrorCode, message: string, readonly at?: readonly (string | number)[]) {
    super(message);
  }
}

function fail(code: ErrorCode, message: string, at?: readonly (string | number)[]): never {
  throw new FixtureError(code, message, at);
}

function object(value: unknown, what: string, at?: readonly (string | number)[]): RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("EVENT_LOOP_PARSE", `${what} must be an object`, at);
  }
  return value as RecordValue;
}

function exact(value: RecordValue, keys: readonly string[], what: string, at?: readonly (string | number)[]): void {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail("EVENT_LOOP_UNKNOWN_KEY", `${what}.${key}`, at && [...at, key]);
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) fail("EVENT_LOOP_PARSE", `${what}.${key} is missing`, at);
  }
}

function text(value: unknown, what: string, maxBytes = 128, at?: readonly (string | number)[]): string {
  if (typeof value !== "string" || value.length === 0 || new TextEncoder().encode(value).byteLength > maxBytes) {
    fail("EVENT_LOOP_PARSE", `${what} must be a non-empty bounded string`, at);
  }
  return value;
}

function identifier(value: unknown, what: string, at?: readonly (string | number)[]): string {
  const id = text(value, what, 64, at);
  if (!ID.test(id)) fail("EVENT_LOOP_ID", `${what} is not lower kebab case`, at);
  return id;
}

function integer(value: unknown, what: string, min: number, max: number, at?: readonly (string | number)[]): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    fail("EVENT_LOOP_BOUNDS", `${what} is outside ${min}..${max}`, at);
  }
  return value;
}

function digest(value: unknown, what: string, at?: readonly (string | number)[]): string {
  if (typeof value !== "string" || !DIGEST.test(value)) fail("EVENT_LOOP_DIGEST", `${what} is not a digest`, at);
  return value;
}

// Apply the expression value limits to caller-owned JSON too, before
// canonicalization or a recursive unbounded isJsonValue walk.
function json(value: unknown, what: string, at?: readonly (string | number)[]): JsonValue {
  const encoder = new TextEncoder();
  const ancestors = new Set<object>();
  const maxBytes = EXPR_BOUNDS.maxValueBytes;
  function size(node: unknown, depth: number, location?: readonly (string | number)[]): number {
    if (depth > EXPR_BOUNDS.maxValueDepth ||
        (node !== null && typeof node === "object" && depth === EXPR_BOUNDS.maxValueDepth)) {
      fail("EVENT_LOOP_BOUNDS", `${what} exceeds JSON value depth`, location);
    }
    if (typeof node === "string" && encoder.encode(node).byteLength > EXPR_BOUNDS.maxStringBytes) {
      fail("EVENT_LOOP_BOUNDS", `${what} exceeds JSON string bytes`, location);
    }
    if (Array.isArray(node)) {
      if (node.length > EXPR_BOUNDS.maxListLen) fail("EVENT_LOOP_BOUNDS", `${what} exceeds JSON list length`, location);
      if (ancestors.has(node)) fail("EVENT_LOOP_PARSE", `${what} is cyclic`, location);
      ancestors.add(node);
      let bytes = 2;
      for (let i = 0; i < node.length; i++) {
        if (!Object.hasOwn(node, i)) fail("EVENT_LOOP_PARSE", `${what} has a sparse list`, location);
        bytes += Number(i > 0) + size(node[i], depth + 1, location && [...location, i]);
        if (bytes > maxBytes) fail("EVENT_LOOP_BOUNDS", `${what} exceeds JSON value bytes`, location);
      }
      ancestors.delete(node);
      return bytes;
    }
    if (node !== null && typeof node === "object") {
      const proto = Object.getPrototypeOf(node);
      if (proto !== Object.prototype && proto !== null) fail("EVENT_LOOP_PARSE", `${what} is not a JSON object`, location);
      if (ancestors.has(node)) fail("EVENT_LOOP_PARSE", `${what} is cyclic`, location);
      const keys = Object.keys(node);
      if (keys.length > EXPR_BOUNDS.maxObjectKeys) fail("EVENT_LOOP_BOUNDS", `${what} exceeds JSON object keys`, location);
      ancestors.add(node);
      let bytes = 2;
      for (const [index, key] of keys.entries()) {
        if (encoder.encode(key).byteLength > EXPR_BOUNDS.maxStringBytes) {
          fail("EVENT_LOOP_BOUNDS", `${what} exceeds JSON key bytes`, location);
        }
        bytes += Number(index > 0) + encoder.encode(JSON.stringify(key)).byteLength + 1 +
          size((node as Record<string, unknown>)[key], depth + 1, location && [...location, key]);
        if (bytes > maxBytes) fail("EVENT_LOOP_BOUNDS", `${what} exceeds JSON value bytes`, location);
      }
      ancestors.delete(node);
      return bytes;
    }
    if (node !== null && typeof node !== "boolean" &&
        !(typeof node === "number" && Number.isFinite(node)) && typeof node !== "string") {
      fail("EVENT_LOOP_PARSE", `${what} is not canonical JSON`, location);
    }
    const scalar = JSON.stringify(node);
    if (typeof scalar !== "string") fail("EVENT_LOOP_PARSE", `${what} is not canonical JSON`, location);
    return encoder.encode(scalar).byteLength;
  }
  if (size(value, 0, at) > maxBytes) fail("EVENT_LOOP_BOUNDS", `${what} exceeds JSON value bytes`, at);
  return value as JsonValue;
}

function canonicalBytes(value: unknown, what: string, at?: readonly (string | number)[]): number {
  return new TextEncoder().encode(canonicalize(json(value, what, at))).byteLength;
}

function jsonBytes(value: unknown, what: string, at?: readonly (string | number)[]): number {
  const size = canonicalBytes(value, what, at);
  if (size > EXPR_BOUNDS.maxProgramBytes) fail("EVENT_LOOP_BOUNDS", `${what} exceeds expression bytes`, at);
  return size;
}

// Include quoted data in the depth check: the evaluator's static walk skips
// quote payloads, but they still contribute to the program's JSON depth.
function expressionShape(value: unknown, what: string, at?: readonly (string | number)[]): void {
  let nodes = 0;
  function visit(node: unknown, depth: number, location?: readonly (string | number)[]): void {
    nodes++;
    if (nodes > EXPR_BOUNDS.maxProgramNodes || depth > EXPR_BOUNDS.maxProgramDepth) {
      fail("EVENT_LOOP_BOUNDS", `${what} exceeds expression nodes or depth`, location);
    }
    if (Array.isArray(node)) {
      for (const [index, child] of node.entries()) visit(child, depth + 1, location && [...location, index]);
    } else if (node !== null && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) visit(child, depth + 1, location && [...location, key]);
    }
  }
  visit(value, 1, at);
}

function expression(value: unknown, what: string, at?: readonly (string | number)[]): void {
  const record = object(value, what, at);
  exact(record, ["contract", "program"], what, at);
  if (record.contract !== "algal.expr.v1") fail("EVENT_LOOP_CONTRACT", `${what}.contract`, at && [...at, "contract"]);
  expressionShape(record.program, `${what}.program`, at && [...at, "program"]);
  const program = json(record.program, `${what}.program`, at && [...at, "program"]);
  jsonBytes(program, `${what}.program`, at && [...at, "program"]);
  const checked = checkProgram(program, ["state", "event"]);
  if (!checked.ok) {
    if (checked.err.code === "EXPR_BOUNDS") fail("EVENT_LOOP_BOUNDS", `${what}.program exceeds expression bounds`, at && [...at, "program"]);
    if (checked.err.code === "EXPR_PATH") fail("EVENT_LOOP_REFERENCE", `${what}.program names an undeclared value`, at && [...at, "program"]);
    fail("EVENT_LOOP_PARSE", `${what}.program is not a valid expression`, at && [...at, "program"]);
  }
}

function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case "null":
      return value === null;
    case "boolean":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "string":
      return typeof value === "string";
    case "json":
      return isJsonValue(value);
    default:
      return false;
  }
}

function parseSchema(value: unknown, withInitial: boolean, what: string, at?: readonly (string | number)[]): Map<string, string> {
  const record = object(value, what, at);
  exact(record, ["kind", "fields"], what, at);
  if (record.kind !== "record") fail("EVENT_LOOP_SCHEMA", `${what}.kind`, at && [...at, "kind"]);
  if (!Array.isArray(record.fields) || record.fields.length > 64) {
    fail("EVENT_LOOP_SCHEMA", `${what}.fields must be a bounded list`, at && [...at, "fields"]);
  }
  const fields = new Map<string, string>();
  for (const [index, raw] of record.fields.entries()) {
    const fieldAt = at && [...at, "fields", index];
    const field = object(raw, `${what}.fields[${index}]`, fieldAt);
    const keys = withInitial ? ["name", "type", "initial"] : ["name", "type"];
    exact(field, keys, `${what}.fields[${index}]`, fieldAt);
    const name = identifier(field.name, `${what}.fields[${index}].name`, fieldAt && [...fieldAt, "name"]);
    if (fields.has(name)) fail("EVENT_LOOP_ID", `${what} duplicates ${name}`, fieldAt && [...fieldAt, "name"]);
    const type = field.type;
    if (typeof type !== "string" || !TYPES.has(type)) {
      fail("EVENT_LOOP_SCHEMA", `${what}.fields[${index}].type`, fieldAt && [...fieldAt, "type"]);
    }
    fields.set(name, type);
    if (withInitial) {
      json(field.initial, `${what}.fields[${index}].initial`, fieldAt && [...fieldAt, "initial"]);
      if (!matchesType(field.initial, type)) {
        fail("EVENT_LOOP_SCHEMA", `${what}.fields[${index}].initial does not match ${type}`, fieldAt && [...fieldAt, "initial"]);
      }
    }
  }
  return fields;
}

function parseEvent(value: unknown, index: number): string {
  const at = ["events", index];
  const record = object(value, `events[${index}]`, at);
  exact(record, ["id", "payload"], `events[${index}]`, at);
  const id = identifier(record.id, `events[${index}].id`, [...at, "id"]);
  parseSchema(record.payload, false, `events[${index}].payload`, [...at, "payload"]);
  return id;
}

function parseResult(value: unknown, writes: number, outputs: number, what: string, at?: readonly (string | number)[]): void {
  const record = object(value, what, at);
  if (typeof record.kind !== "string") fail("EVENT_LOOP_SEMANTIC", `${what}.kind`, at && [...at, "kind"]);
  if (record.kind === "continue" || record.kind === "quiet") {
    exact(record, ["kind"], what, at);
  } else if (record.kind === "defer") {
    exact(record, ["kind", "key"], what, at);
    expression(record.key, `${what}.key`, at && [...at, "key"]);
  } else if (record.kind === "escalate") {
    exact(record, ["kind", "request"], what, at);
    expression(record.request, `${what}.request`, at && [...at, "request"]);
  } else {
    fail("EVENT_LOOP_SEMANTIC", `${what}.kind`, at && [...at, "kind"]);
  }
  if ((record.kind === "defer" || record.kind === "escalate") && (writes !== 0 || outputs !== 0)) {
    fail("EVENT_LOOP_SEMANTIC", `${what} cannot commit writes or outputs`, at && [...at, "kind"]);
  }
  if (record.kind === "quiet" && outputs !== 0) fail("EVENT_LOOP_SEMANTIC", `${what} quiet cannot emit outputs`, at && [...at, "kind"]);
}

function parseActor(
  value: unknown,
  index: number,
  eventIds: Set<string>,
  actorIds: Set<string>,
  maxOutputs: number,
  maxStateBytes: number,
): string {
  const at = ["actors", index];
  const record = object(value, `actors[${index}]`, at);
  exact(record, ["id", "state", "transitions"], `actors[${index}]`, at);
  const actorId = identifier(record.id, `actors[${index}].id`, [...at, "id"]);
  const stateFields = parseSchema(record.state, true, `actors[${index}].state`, [...at, "state"]);
  const state = object(record.state, `actors[${index}].state`, [...at, "state"]);
  const initial: Record<string, JsonValue> = {};
  for (const [fieldIndex, raw] of (state.fields as unknown[]).entries()) {
    const fieldAt = [...at, "state", "fields", fieldIndex];
    const field = object(raw, "state field", fieldAt);
    initial[identifier(field.name, "state field name", [...fieldAt, "name"])] =
      json(field.initial, "initial state field", [...fieldAt, "initial"]);
  }
  if (canonicalBytes(initial, `actors[${index}].initial`, [...at, "state"]) > maxStateBytes) {
    fail("EVENT_LOOP_BOUNDS", `actors[${index}].initial exceeds maxStateBytes`, ["limits", "maxStateBytes"]);
  }
  if (!Array.isArray(record.transitions) || record.transitions.length < 1 || record.transitions.length > 256) {
    fail("EVENT_LOOP_BOUNDS", `actors[${index}].transitions`, [...at, "transitions"]);
  }
  const transitionIds = new Set<string>();
  for (const [transitionIndex, raw] of record.transitions.entries()) {
    const transitionAt = [...at, "transitions", transitionIndex];
    const transition = object(raw, `actors[${index}].transitions[${transitionIndex}]`, transitionAt);
    exact(transition, ["id", "on", "when", "writes", "outputs", "result"], `actors[${index}].transitions[${transitionIndex}]`, transitionAt);
    const transitionId = identifier(transition.id, "transition.id", [...transitionAt, "id"]);
    if (transitionIds.has(transitionId)) fail("EVENT_LOOP_ID", `duplicate transition ${transitionId}`, [...transitionAt, "id"]);
    transitionIds.add(transitionId);
    if (typeof transition.on !== "string" || !eventIds.has(transition.on)) {
      fail("EVENT_LOOP_REFERENCE", `transition ${transitionId} event`, [...transitionAt, "on"]);
    }
    if (transition.when !== null) expression(transition.when, `transition ${transitionId}.when`, [...transitionAt, "when"]);
    if (!Array.isArray(transition.writes) || transition.writes.length > 64) fail("EVENT_LOOP_BOUNDS", `transition ${transitionId}.writes`, [...transitionAt, "writes"]);
    for (const [writeIndex, rawWrite] of transition.writes.entries()) {
      const writeAt = [...transitionAt, "writes", writeIndex];
      const write = object(rawWrite, `transition ${transitionId}.writes[${writeIndex}]`, writeAt);
      exact(write, ["path", "value"], `transition ${transitionId}.writes[${writeIndex}]`, writeAt);
      if (!Array.isArray(write.path) || write.path.length !== 1) {
        fail("EVENT_LOOP_BOUNDS", `transition ${transitionId}.path`, [...writeAt, "path"]);
      }
      if (typeof write.path[0] !== "string" || !stateFields.has(write.path[0])) {
        fail("EVENT_LOOP_REFERENCE", `transition ${transitionId}.state field`, [...writeAt, "path", 0]);
      }
      for (const [pathIndex, segment] of write.path.entries()) identifier(segment, `transition ${transitionId}.path[${pathIndex}]`, [...writeAt, "path", pathIndex]);
      expression(write.value, `transition ${transitionId}.value`, [...writeAt, "value"]);
    }
    if (!Array.isArray(transition.outputs) || transition.outputs.length > 64) {
      fail("EVENT_LOOP_BOUNDS", `transition ${transitionId}.outputs`, [...transitionAt, "outputs"]);
    }
    if (transition.outputs.length > maxOutputs) {
      fail("EVENT_LOOP_BOUNDS", `transition ${transitionId}.outputs exceeds maxOutputEvents`, ["limits", "maxOutputEvents"]);
    }
    for (const [outputIndex, rawOutput] of transition.outputs.entries()) {
      const outputAt = [...transitionAt, "outputs", outputIndex];
      const output = object(rawOutput, `transition ${transitionId}.outputs[${outputIndex}]`, outputAt);
      exact(output, ["kind", "target", "event", "payload"], `transition ${transitionId}.outputs[${outputIndex}]`, outputAt);
      if (output.kind !== "notify") fail("EVENT_LOOP_SEMANTIC", `transition ${transitionId}.output kind`, [...outputAt, "kind"]);
      if (output.target !== "self" && (typeof output.target !== "string" || !actorIds.has(output.target))) {
        fail("EVENT_LOOP_REFERENCE", `transition ${transitionId}.output target`, [...outputAt, "target"]);
      }
      if (typeof output.event !== "string" || !eventIds.has(output.event)) {
        fail("EVENT_LOOP_REFERENCE", `transition ${transitionId}.output event`, [...outputAt, "event"]);
      }
      expression(output.payload, `transition ${transitionId}.output payload`, [...outputAt, "payload"]);
    }
    parseResult(transition.result, transition.writes.length, transition.outputs.length, `transition ${transitionId}.result`, [...transitionAt, "result"]);
  }
  return actorId;
}

function parseEventLoop(value: unknown): RecordValue {
  const root = object(value, "event-loop", []);
  exact(root, ["contract", "behavior", "limits", "events", "actors", "digest"], "event-loop", []);
  if (root.contract !== "algal.event-loop.v1") fail("EVENT_LOOP_CONTRACT", "event-loop.contract", ["contract"]);
  const behavior = object(root.behavior, "behavior", ["behavior"]);
  exact(behavior, ["id", "revision", "sourceDigest", "digest"], "behavior", ["behavior"]);
  identifier(behavior.id, "behavior.id", ["behavior", "id"]);
  integer(behavior.revision, "behavior.revision", 1, 2_147_483_647, ["behavior", "revision"]);
  digest(behavior.sourceDigest, "behavior.sourceDigest", ["behavior", "sourceDigest"]);
  verifyDigest(behavior, "behavior", ["behavior"]);
  const limits = object(root.limits, "limits", ["limits"]);
  exact(limits, ["maxEventBytes", "maxStateBytes", "maxOutputEvents", "maxTransitionFuel", "maxMailboxDepth"], "limits", ["limits"]);
  integer(limits.maxEventBytes, "limits.maxEventBytes", 1, 65_536, ["limits", "maxEventBytes"]);
  integer(limits.maxStateBytes, "limits.maxStateBytes", 1, 262_144, ["limits", "maxStateBytes"]);
  integer(limits.maxOutputEvents, "limits.maxOutputEvents", 0, 64, ["limits", "maxOutputEvents"]);
  integer(limits.maxTransitionFuel, "limits.maxTransitionFuel", 1, 100_000, ["limits", "maxTransitionFuel"]);
  integer(limits.maxMailboxDepth, "limits.maxMailboxDepth", 1, 1_024, ["limits", "maxMailboxDepth"]);
  if (!Array.isArray(root.events) || root.events.length < 1 || root.events.length > 128) fail("EVENT_LOOP_BOUNDS", "events", ["events"]);
  const eventIds = new Set<string>();
  for (const [index, raw] of root.events.entries()) {
    const id = parseEvent(raw, index);
    if (eventIds.has(id)) fail("EVENT_LOOP_ID", `duplicate event ${id}`, ["events", index, "id"]);
    eventIds.add(id);
  }
  if (!Array.isArray(root.actors) || root.actors.length < 1 || root.actors.length > 64) fail("EVENT_LOOP_BOUNDS", "actors", ["actors"]);
  const actorIds = new Set<string>();
  for (const [index, raw] of root.actors.entries()) {
    const actorAt = ["actors", index];
    const actor = object(raw, `actors[${index}]`, actorAt);
    exact(actor, ["id", "state", "transitions"], `actors[${index}]`, actorAt);
    const id = identifier(actor.id, `actors[${index}].id`, [...actorAt, "id"]);
    if (actorIds.has(id)) fail("EVENT_LOOP_ID", `duplicate actor ${id}`, [...actorAt, "id"]);
    actorIds.add(id);
  }
  for (const [index, raw] of root.actors.entries()) parseActor(raw, index, eventIds, actorIds, limits.maxOutputEvents as number, limits.maxStateBytes as number);
  verifyDigest(root, "event-loop", []);
  return root;
}

function parseEvents(value: unknown, behaviorValue: unknown): RecordValue {
  const behavior = parseEventLoop(behaviorValue);
  const limits = object(behavior.limits, "behavior.limits");
  const declarations = new Map<string, Map<string, string>>();
  for (const raw of behavior.events as unknown[]) {
    const declaration = object(raw, "event declaration");
    const id = identifier(declaration.id, "event declaration id");
    declarations.set(id, parseSchema(declaration.payload, false, `event ${id}.payload`));
  }
  const root = object(value, "events");
  exact(root, ["contract", "actor", "events", "digest"], "events");
  if (root.contract !== "algal.event-loop.events.v1") fail("EVENT_LOOP_CONTRACT", "events.contract");
  const actor = identifier(root.actor, "events.actor");
  if (!(behavior.actors as RecordValue[]).some((raw) => raw.id === actor)) fail("EVENT_LOOP_REFERENCE", "events.actor");
  if (!Array.isArray(root.events) || root.events.length < 1 || root.events.length > 256) fail("EVENT_LOOP_BOUNDS", "events.events");
  for (const [index, raw] of root.events.entries()) {
    const event = object(raw, `events.events[${index}]`);
    exact(event, ["source", "sequence", "type", "payload"], `events.events[${index}]`);
    identifier(event.source, `events.events[${index}].source`);
    integer(event.sequence, `events.events[${index}].sequence`, 0, 2_147_483_647);
    const type = identifier(event.type, `events.events[${index}].type`);
    const schema = declarations.get(type);
    if (!schema) fail("EVENT_LOOP_REFERENCE", `events.events[${index}].type`);
    const payload = object(event.payload, `events.events[${index}].payload`);
    exact(payload, [...schema.keys()], `events.events[${index}].payload`);
    for (const [name, fieldType] of schema) {
      json(payload[name], `events.events[${index}].payload.${name}`);
      if (!matchesType(payload[name], fieldType)) fail("EVENT_LOOP_SCHEMA", `events.events[${index}].payload.${name}`);
    }
    if (canonicalBytes(event, `events.events[${index}]`) > (limits.maxEventBytes as number)) {
      fail("EVENT_LOOP_BOUNDS", `events.events[${index}] exceeds maxEventBytes`);
    }
  }
  verifyDigest(root, "events");
  return root;
}

function path(value: unknown, what: string): string {
  const result = text(value, what, 512);
  if (result.startsWith("/") || result.includes("\\") || result.split("/").some((part) => part.length === 0 || part === "." || part === "..")) {
    fail("EVENT_LOOP_PARSE", `${what} is not a relative POSIX path`);
  }
  return result;
}

function parseProjectRecord(value: unknown): RecordValue {
  const root = object(value, "project");
  exact(root, ["contract", "id", "entry", "files", "digest"], "project");
  if (root.contract !== "algal.language-project.v1") fail("EVENT_LOOP_CONTRACT", "project.contract");
  identifier(root.id, "project.id");
  const entry = path(root.entry, "project.entry");
  if (!Array.isArray(root.files) || root.files.length < 1 || root.files.length > 64) fail("EVENT_LOOP_BOUNDS", "project.files");
  const paths = new Set<string>();
  for (const [index, raw] of root.files.entries()) {
    const file = object(raw, `project.files[${index}]`);
    exact(file, ["path", "digest"], `project.files[${index}]`);
    const filePath = path(file.path, `project.files[${index}].path`);
    if (paths.has(filePath)) fail("EVENT_LOOP_ID", `duplicate project path ${filePath}`);
    paths.add(filePath);
    digest(file.digest, `project.files[${index}].digest`);
  }
  if (!paths.has(entry)) fail("EVENT_LOOP_REFERENCE", "project.entry");
  verifyDigest(root, "project");
  return root;
}

// The fixture-reading boundary checks the bytes of every referenced file.
// Record-only validation cannot establish the project closure's byte limit.
async function parseProject(
  value: unknown,
  readBytes: (path: string) => Promise<Uint8Array> = (filePath) => readFile(join(ROOT, filePath)),
): Promise<{ byteLength: number; projectDigest: string; closureDigest: string }> {
  parseProjectRecord(value);
  return verifyProjectClosure(value, readBytes);
}

function parseFixtureEntry(value: unknown, expectedKind: "actor" | "project" | "invalid"): void {
  const entry = object(value, "fixture");
  exact(entry, ["id", "path", "kind", "sha256", "expected"], "fixture");
  identifier(entry.id, "fixture.id");
  path(entry.path, "fixture.path");
  if (entry.kind !== expectedKind) fail("EVENT_LOOP_PARSE", "fixture.kind");
  digest(entry.sha256, "fixture.sha256");
  const expected = object(entry.expected, "fixture.expected");
  if (expectedKind === "actor") {
    exact(expected, ["check", "artifactDigest", "interfaceDigest", "eventPath", "eventSha256", "eventDigest"], "fixture.expected");
    if (expected.check !== "accepted") fail("EVENT_LOOP_PARSE", "fixture.expected.check");
    digest(expected.artifactDigest, "fixture.expected.artifactDigest");
    digest(expected.interfaceDigest, "fixture.expected.interfaceDigest");
    path(expected.eventPath, "fixture.expected.eventPath");
    digest(expected.eventSha256, "fixture.expected.eventSha256");
    digest(expected.eventDigest, "fixture.expected.eventDigest");
  } else if (expectedKind === "project") {
    exact(expected, ["check", "projectDigest", "closureDigest"], "fixture.expected");
    if (expected.check !== "accepted") fail("EVENT_LOOP_PARSE", "fixture.expected.check");
    digest(expected.projectDigest, "fixture.expected.projectDigest");
    digest(expected.closureDigest, "fixture.expected.closureDigest");
  } else {
    exact(expected, ["check", "code", "span"], "fixture.expected");
    if (expected.check !== "rejected") fail("EVENT_LOOP_PARSE", "fixture.expected.check");
    const code = text(expected.code, "fixture.expected.code", MAX_ERROR_CODE_BYTES);
    if (!ERROR_CODES.has(code)) fail("EVENT_LOOP_PARSE", "fixture.expected.code");
    const span = object(expected.span, "fixture.expected.span");
    exact(span, ["start", "end"], "fixture.expected.span");
    const start = integer(span.start, "fixture.expected.span.start", 0, 16_383);
    integer(span.end, "fixture.expected.span.end", start + 1, 16_384);
  }
}

function parseCorpus(value: unknown): RecordValue {
  const root = object(value, "corpus");
  exact(root, ["contract", "kind", "id", "revision", "identities", "protocol", "fixtures", "digest"], "corpus");
  if (root.contract !== "algal.language-benchmark.corpus.v1" || root.kind !== "corpus") fail("EVENT_LOOP_CONTRACT", "corpus identity");
  identifier(root.id, "corpus.id");
  integer(root.revision, "corpus.revision", 1, 2_147_483_647);
  const identities = object(root.identities, "corpus.identities");
  exact(identities, ["encoding", "digest", "compiler", "runtimes", "machine"], "corpus.identities");
  if (identities.encoding !== "utf-8" || identities.digest !== "sha256-canonical-json") fail("EVENT_LOOP_CONTRACT", "corpus.identities");
  const compiler = object(identities.compiler, "corpus.identities.compiler");
  exact(compiler, ["id", "version"], "corpus.identities.compiler");
  text(compiler.id, "corpus.identities.compiler.id");
  text(compiler.version, "corpus.identities.compiler.version");
  if (!Array.isArray(identities.runtimes) || identities.runtimes.length !== 2) fail("EVENT_LOOP_BOUNDS", "corpus.identities.runtimes");
  const runtimes = new Set<string>();
  for (const [index, runtime] of identities.runtimes.entries()) {
    const id = text(runtime, `corpus.identities.runtimes[${index}]`);
    if (runtimes.has(id)) fail("EVENT_LOOP_ID", `duplicate runtime ${id}`);
    runtimes.add(id);
  }
  const machine = object(identities.machine, "corpus.identities.machine");
  exact(machine, ["os", "arch", "cpu"], "corpus.identities.machine");
  for (const key of ["os", "arch", "cpu"] as const) text(machine[key], `corpus.identities.machine.${key}`);
  const protocol = object(root.protocol, "corpus.protocol");
  exact(protocol, ["warmupSamples", "measuredSamples", "phases", "order", "quantile", "outliers", "regressionPercent"], "corpus.protocol");
  integer(protocol.warmupSamples, "corpus.protocol.warmupSamples", 0, 100);
  integer(protocol.measuredSamples, "corpus.protocol.measuredSamples", 1, 1_000);
  if (!Array.isArray(protocol.phases) || protocol.phases.length !== 2 || protocol.phases[0] !== "cold" || protocol.phases[1] !== "warm") fail("EVENT_LOOP_CONTRACT", "corpus.protocol.phases");
  if (protocol.order !== "path" || protocol.quantile !== "nearest-rank" || protocol.outliers !== "none") fail("EVENT_LOOP_CONTRACT", "corpus.protocol");
  integer(protocol.regressionPercent, "corpus.protocol.regressionPercent", 0, 100);
  const fixtures = object(root.fixtures, "corpus.fixtures");
  exact(fixtures, ["actors", "projects", "invalid"], "corpus.fixtures");
  if (!Array.isArray(fixtures.actors) || !Array.isArray(fixtures.projects) || !Array.isArray(fixtures.invalid)) fail("EVENT_LOOP_PARSE", "corpus.fixtures");
  if (fixtures.actors.length + fixtures.projects.length + fixtures.invalid.length < 1 || fixtures.actors.length + fixtures.projects.length + fixtures.invalid.length > 256 || fixtures.invalid.length > 128) fail("EVENT_LOOP_BOUNDS", "corpus.fixtures");
  const fixtureIds = new Set<string>();
  const fixturePaths = new Set<string>();
  const parseFixtureGroup = (entries: unknown[], kind: "actor" | "project" | "invalid"): void => {
    for (const entry of entries) {
      parseFixtureEntry(entry, kind);
      const record = object(entry, "fixture");
      const id = identifier(record.id, "fixture.id");
      const fixturePath = path(record.path, "fixture.path");
      if (fixtureIds.has(id)) fail("EVENT_LOOP_ID", `duplicate fixture ${id}`);
      if (fixturePaths.has(fixturePath)) fail("EVENT_LOOP_ID", `duplicate fixture path ${fixturePath}`);
      fixtureIds.add(id);
      fixturePaths.add(fixturePath);
    }
  };
  parseFixtureGroup(fixtures.actors, "actor");
  parseFixtureGroup(fixtures.projects, "project");
  parseFixtureGroup(fixtures.invalid, "invalid");
  verifyDigest(root, "corpus");
  return root;
}

function canonicalDigest(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalize(json(value, "digest value"))).digest("hex")}`;
}

function rawDigest(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function withoutDigest(value: unknown): JsonValue {
  const copy = structuredClone(json(value, "record")) as RecordValue;
  delete copy.digest;
  return json(copy, "record without digest");
}

function verifyDigest(record: RecordValue, what: string, at?: readonly (string | number)[]): void {
  if (digest(record.digest, `${what}.digest`, at && [...at, "digest"]) !== canonicalDigest(withoutDigest(record))) {
    fail("EVENT_LOOP_DIGEST", `${what}.digest does not match canonical content`, at && [...at, "digest"]);
  }
}

function eventIdentity(artifactDigest: unknown, actor: unknown, value: unknown): string {
  const event = object(value, "event identity");
  return canonicalDigest({
    behavior: digest(artifactDigest, "behavior artifact digest"),
    actor: identifier(actor, "actor id"),
    source: identifier(event.source, "event source"),
    sequence: integer(event.sequence, "event sequence", 0, 2_147_483_647),
    type: identifier(event.type, "event type"),
    payload: json(event.payload, "event payload"),
  });
}

async function load(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(ROOT, path), "utf8")) as unknown;
}

function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof FixtureError) return error.code;
    throw error;
  }
  return "ACCEPTED";
}

// The diagnostic is emitted from the checked source bytes and a structured
// failure path, never copied from the expected corpus entry.
function checkEventLoopBytes(bytes: Uint8Array): { code: "ACCEPTED" } | { code: ErrorCode; span: ByteSpan } {
  if (bytes.byteLength < 1 || bytes.byteLength > 16_384) {
    throw new Error("fixture source exceeds 1..16384 bytes");
  }
  let source: unknown;
  try {
    source = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    // Malformed JSON and UTF-8 have no structured path. Point at the entire
    // bounded source rather than inventing a token location.
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return { code: "EVENT_LOOP_PARSE", span: { start: 0, end: bytes.byteLength } };
    }
    throw error;
  }
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return { code: "EVENT_LOOP_PARSE", span: { start: 0, end: bytes.byteLength } };
  }
  try {
    parseEventLoop(source);
    return { code: "ACCEPTED" };
  } catch (error) {
    if (!(error instanceof FixtureError) || !error.at) throw error;
    return { code: error.code, span: locateJsonSpan(bytes, error.at, error.code === "EVENT_LOOP_UNKNOWN_KEY") };
  }
}

type BenchmarkPhase = "cold" | "warm";
type BenchmarkOutcome = "accepted" | "rejected";

function parseBenchmarkProtocol(value: unknown, what: string): { measuredSamples: number } {
  const protocol = object(value, what);
  exact(protocol, ["warmupSamples", "measuredSamples", "phases", "order", "quantile", "outliers"], what);
  integer(protocol.warmupSamples, `${what}.warmupSamples`, 0, 100);
  const measuredSamples = integer(protocol.measuredSamples, `${what}.measuredSamples`, 1, 1_000);
  if (!Array.isArray(protocol.phases) || protocol.phases.length !== 2 || protocol.phases[0] !== "cold" || protocol.phases[1] !== "warm") {
    fail("EVENT_LOOP_CONTRACT", `${what}.phases`);
  }
  if (protocol.order !== "path" || protocol.quantile !== "nearest-rank" || protocol.outliers !== "none") {
    fail("EVENT_LOOP_CONTRACT", what);
  }
  return { measuredSamples };
}

function parseBenchmarkSample(value: unknown, index: number, what: string): { phase: BenchmarkPhase; sampleIndex: number; durationNs: number; outcome: BenchmarkOutcome } {
  const sample = object(value, `${what}[${index}]`);
  exact(sample, ["phase", "index", "durationNs", "outcome"], `${what}[${index}]`);
  if (sample.phase !== "cold" && sample.phase !== "warm") fail("EVENT_LOOP_CONTRACT", `${what}[${index}].phase`);
  const sampleIndex = integer(sample.index, `${what}[${index}].index`, 0, 999);
  const durationNs = integer(sample.durationNs, `${what}[${index}].durationNs`, 0, 86_400_000_000_000);
  if (sample.outcome !== "accepted" && sample.outcome !== "rejected") fail("EVENT_LOOP_CONTRACT", `${what}[${index}].outcome`);
  return { phase: sample.phase, sampleIndex, durationNs, outcome: sample.outcome };
}

function nearestRank(values: readonly number[], fraction: number): number {
  const ordered = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(ordered.length * fraction));
  return ordered[rank - 1]!;
}

function parseBenchmarkSummary(value: unknown, values: readonly number[], measuredSamples: number, what: string): void {
  const summary = object(value, what);
  exact(summary, ["count", "p50Ns", "p95Ns"], what);
  if (integer(summary.count, `${what}.count`, 1, 1_000) !== measuredSamples) fail("EVENT_LOOP_BOUNDS", `${what}.count`);
  if (integer(summary.p50Ns, `${what}.p50Ns`, 0, 86_400_000_000_000) !== nearestRank(values, 0.5)) fail("EVENT_LOOP_SEMANTIC", `${what}.p50Ns`);
  if (integer(summary.p95Ns, `${what}.p95Ns`, 0, 86_400_000_000_000) !== nearestRank(values, 0.95)) fail("EVENT_LOOP_SEMANTIC", `${what}.p95Ns`);
}

function parseBenchmarkCase(value: unknown, caseIndex: number, measuredSamples: number): { id: string; summaries: Map<BenchmarkPhase, { count: number; p50Ns: number; p95Ns: number }> } {
  const raw = object(value, `result.cases[${caseIndex}]`);
  const expected = raw.expected;
  if (expected !== "accepted" && expected !== "rejected") fail("EVENT_LOOP_CONTRACT", `result.cases[${caseIndex}].expected`);
  const keys = expected === "accepted"
    ? ["id", "kind", "sourceDigest", "expected", "observed", "samples", "summary"]
    : ["id", "kind", "sourceDigest", "expected", "code", "span", "samples", "summary"];
  exact(raw, keys, `result.cases[${caseIndex}]`);
  const id = identifier(raw.id, `result.cases[${caseIndex}].id`);
  if (raw.kind !== "actor" && raw.kind !== "project" && raw.kind !== "invalid") fail("EVENT_LOOP_CONTRACT", `result.cases[${caseIndex}].kind`);
  if ((expected === "rejected") !== (raw.kind === "invalid")) fail("EVENT_LOOP_SEMANTIC", `result.cases[${caseIndex}] kind and outcome`);
  digest(raw.sourceDigest, `result.cases[${caseIndex}].sourceDigest`);
  if (expected === "accepted") {
    const observed = object(raw.observed, `result.cases[${caseIndex}].observed`);
    const keys = raw.kind === "actor" ? ["artifactDigest", "interfaceDigest", "eventDigest"] : ["projectDigest", "closureDigest"];
    exact(observed, keys, `result.cases[${caseIndex}].observed`);
    for (const key of keys) digest(observed[key], `result.cases[${caseIndex}].observed.${key}`);
  }
  if (expected === "rejected") {
    const code = text(raw.code, `result.cases[${caseIndex}].code`, MAX_ERROR_CODE_BYTES);
    if (!ERROR_CODES.has(code)) fail("EVENT_LOOP_PARSE", `result.cases[${caseIndex}].code`);
    const span = object(raw.span, `result.cases[${caseIndex}].span`);
    exact(span, ["start", "end"], `result.cases[${caseIndex}].span`);
    const start = integer(span.start, `result.cases[${caseIndex}].span.start`, 0, 16_383);
    integer(span.end, `result.cases[${caseIndex}].span.end`, start + 1, 16_384);
  }
  if (!Array.isArray(raw.samples) || raw.samples.length !== measuredSamples * 2 || raw.samples.length > 2_000) {
    fail("EVENT_LOOP_BOUNDS", `result.cases[${caseIndex}].samples`);
  }
  const seen = new Set<string>();
  const byPhase = new Map<BenchmarkPhase, number[]>();
  for (const [sampleIndex, rawSample] of raw.samples.entries()) {
    const sample = parseBenchmarkSample(rawSample, sampleIndex, `result.cases[${caseIndex}].samples`);
    if (sample.sampleIndex >= measuredSamples) fail("EVENT_LOOP_BOUNDS", `result.cases[${caseIndex}].samples[${sampleIndex}].index`);
    const key = `${sample.phase}:${sample.sampleIndex}`;
    if (seen.has(key)) fail("EVENT_LOOP_ID", `duplicate benchmark sample ${key}`);
    seen.add(key);
    if (sample.outcome !== expected) fail("EVENT_LOOP_SEMANTIC", `result.cases[${caseIndex}].samples[${sampleIndex}].outcome`);
    const values = byPhase.get(sample.phase) ?? [];
    values.push(sample.durationNs);
    byPhase.set(sample.phase, values);
  }
  for (const phase of ["cold", "warm"] as const) {
    const values = byPhase.get(phase);
    if (!values || values.length !== measuredSamples) fail("EVENT_LOOP_BOUNDS", `result.cases[${caseIndex}].samples.${phase}`);
  }
  const summary = object(raw.summary, `result.cases[${caseIndex}].summary`);
  exact(summary, ["cold", "warm"], `result.cases[${caseIndex}].summary`);
  const summaries = new Map<BenchmarkPhase, { count: number; p50Ns: number; p95Ns: number }>();
  for (const phase of ["cold", "warm"] as const) {
    const values = byPhase.get(phase)!;
    parseBenchmarkSummary(summary[phase], values, measuredSamples, `result.cases[${caseIndex}].summary.${phase}`);
    const parsed = object(summary[phase], `result.cases[${caseIndex}].summary.${phase}`);
    summaries.set(phase, { count: parsed.count as number, p50Ns: parsed.p50Ns as number, p95Ns: parsed.p95Ns as number });
  }
  return { id, summaries };
}

function parseBenchmarkResult(value: unknown, corpusValue: unknown): RecordValue {
  const corpus = parseCorpus(corpusValue);
  const root = object(value, "result");
  exact(root, ["contract", "kind", "corpusDigest", "protocol", "toolchain", "environment", "cases", "aggregate", "digest"], "result");
  if (root.contract !== "algal.language-benchmark.v1" || root.kind !== "result") fail("EVENT_LOOP_CONTRACT", "result.identity");
  if (digest(root.corpusDigest, "result.corpusDigest") !== corpus.digest) fail("EVENT_LOOP_REFERENCE", "result.corpusDigest does not name the checked corpus");
  const protocol = parseBenchmarkProtocol(root.protocol, "result.protocol");
  const corpusProtocol = object(corpus.protocol, "corpus.protocol");
  const resultProtocol = object(root.protocol, "result.protocol");
  for (const key of ["warmupSamples", "measuredSamples", "phases", "order", "quantile", "outliers"] as const) {
    if (canonicalize(json(resultProtocol[key], `result.protocol.${key}`)) !==
        canonicalize(json(corpusProtocol[key], `corpus.protocol.${key}`))) {
      fail("EVENT_LOOP_REFERENCE", `result.protocol.${key} differs from checked corpus`);
    }
  }
  const toolchain = object(root.toolchain, "result.toolchain");
  exact(toolchain, ["compiler", "runtime", "native"], "result.toolchain");
  text(toolchain.compiler, "result.toolchain.compiler");
  text(toolchain.runtime, "result.toolchain.runtime");
  text(toolchain.native, "result.toolchain.native");
  const identities = object(corpus.identities, "corpus.identities");
  const compiler = object(identities.compiler, "corpus.identities.compiler");
  if (toolchain.compiler !== `${compiler.id}@${compiler.version}`) fail("EVENT_LOOP_REFERENCE", "result.toolchain.compiler");
  const runtimeIds = new Set(identities.runtimes as string[]);
  const measuredRuntimeIds = new Set<string>();
  for (const key of ["runtime", "native"] as const) {
    const value = toolchain[key] as string;
    const separator = value.indexOf("@");
    if (separator < 1 || separator === value.length - 1 || value.indexOf("@", separator + 1) !== -1) {
      fail("EVENT_LOOP_REFERENCE", `result.toolchain.${key}`);
    }
    const name = identifier(value.slice(0, separator), `result.toolchain.${key} id`);
    if (!runtimeIds.has(name) || measuredRuntimeIds.has(name)) fail("EVENT_LOOP_REFERENCE", `result.toolchain.${key}`);
    measuredRuntimeIds.add(name);
  }
  const environment = object(root.environment, "result.environment");
  exact(environment, ["os", "arch", "cpu"], "result.environment");
  text(environment.os, "result.environment.os");
  text(environment.arch, "result.environment.arch");
  text(environment.cpu, "result.environment.cpu");
  const machine = object(identities.machine, "corpus.identities.machine");
  for (const key of ["os", "arch", "cpu"] as const) {
    if (environment[key] !== machine[key]) fail("EVENT_LOOP_REFERENCE", `result.environment.${key}`);
  }
  const fixtures = object(corpus.fixtures, "corpus.fixtures");
  const fixtureCases = new Map<string, { kind: string; path: string; sha256: string; expected: RecordValue }>();
  for (const kind of ["actors", "projects", "invalid"] as const) {
    for (const raw of fixtures[kind] as unknown[]) {
      const fixture = object(raw, `corpus.fixtures.${kind}`);
      fixtureCases.set(fixture.id as string, {
        kind: fixture.kind as string,
        path: fixture.path as string,
        sha256: fixture.sha256 as string,
        expected: object(fixture.expected, "fixture.expected"),
      });
    }
  }
  if (!Array.isArray(root.cases) || root.cases.length < 1 || root.cases.length > 256) fail("EVENT_LOOP_BOUNDS", "result.cases");
  if (root.cases.length !== fixtureCases.size) fail("EVENT_LOOP_REFERENCE", "result.cases must cover the checked corpus exactly");
  const orderedFixtures = [...fixtureCases.entries()].sort((a, b) =>
    a[1].path < b[1].path ? -1 : a[1].path > b[1].path ? 1 : 0);
  const cases = new Map<string, { summaries: Map<BenchmarkPhase, { count: number; p50Ns: number; p95Ns: number }> }>();
  for (const [index, rawCase] of root.cases.entries()) {
    const parsed = parseBenchmarkCase(rawCase, index, protocol.measuredSamples);
    if (cases.has(parsed.id)) fail("EVENT_LOOP_ID", `duplicate benchmark case ${parsed.id}`);
    const fixture = fixtureCases.get(parsed.id);
    if (!fixture || orderedFixtures[index]?.[0] !== parsed.id) fail("EVENT_LOOP_REFERENCE", `result.cases[${index}].id or path order`);
    const value = object(rawCase, `result.cases[${index}]`);
    if (value.kind !== fixture.kind || value.sourceDigest !== fixture.sha256 ||
        value.expected !== fixture.expected.check) {
      fail("EVENT_LOOP_REFERENCE", `result.cases[${index}] differs from checked fixture`);
    }
    if (fixture.kind !== "invalid") {
      const observed = object(value.observed, `result.cases[${index}].observed`);
      const keys = fixture.kind === "actor" ? ["artifactDigest", "interfaceDigest", "eventDigest"] : ["projectDigest", "closureDigest"];
      for (const key of keys) {
        if (observed[key] !== fixture.expected[key]) fail("EVENT_LOOP_REFERENCE", `result.cases[${index}].observed.${key} differs from checked fixture`);
      }
    } else {
      const span = object(value.span, `result.cases[${index}].span`);
      const pinned = object(fixture.expected.span, "fixture.expected.span");
      if (value.code !== fixture.expected.code || span.start !== pinned.start || span.end !== pinned.end) {
        fail("EVENT_LOOP_REFERENCE", `result.cases[${index}] diagnostic differs from checked fixture`);
      }
    }
    cases.set(parsed.id, parsed);
  }
  for (const id of fixtureCases.keys()) {
    if (!cases.has(id)) fail("EVENT_LOOP_REFERENCE", `result.cases missing ${id}`);
  }
  if (!Array.isArray(root.aggregate) || root.aggregate.length !== cases.size * 2 || root.aggregate.length > 512) fail("EVENT_LOOP_BOUNDS", "result.aggregate");
  const aggregateIds = new Set<string>();
  for (const [index, rawAggregate] of root.aggregate.entries()) {
    const aggregate = object(rawAggregate, `result.aggregate[${index}]`);
    exact(aggregate, ["id", "phase", "count", "p50Ns", "p95Ns"], `result.aggregate[${index}]`);
    const id = identifier(aggregate.id, `result.aggregate[${index}].id`);
    if (aggregate.phase !== "cold" && aggregate.phase !== "warm") fail("EVENT_LOOP_CONTRACT", `result.aggregate[${index}].phase`);
    const key = `${id}:${aggregate.phase}`;
    if (aggregateIds.has(key)) fail("EVENT_LOOP_ID", `duplicate benchmark aggregate ${key}`);
    aggregateIds.add(key);
    const parsedCase = cases.get(id);
    if (!parsedCase) fail("EVENT_LOOP_REFERENCE", `result.aggregate[${index}].id`);
    const expected = parsedCase.summaries.get(aggregate.phase);
    if (!expected) fail("EVENT_LOOP_REFERENCE", `result.aggregate[${index}].phase`);
    if (integer(aggregate.count, `result.aggregate[${index}].count`, 1, 1_000) !== expected.count) fail("EVENT_LOOP_SEMANTIC", `result.aggregate[${index}].count`);
    if (integer(aggregate.p50Ns, `result.aggregate[${index}].p50Ns`, 0, 86_400_000_000_000) !== expected.p50Ns) fail("EVENT_LOOP_SEMANTIC", `result.aggregate[${index}].p50Ns`);
    if (integer(aggregate.p95Ns, `result.aggregate[${index}].p95Ns`, 0, 86_400_000_000_000) !== expected.p95Ns) fail("EVENT_LOOP_SEMANTIC", `result.aggregate[${index}].p95Ns`);
  }
  for (const [id] of cases) {
    for (const phase of ["cold", "warm"] as const) {
      if (!aggregateIds.has(`${id}:${phase}`)) fail("EVENT_LOOP_REFERENCE", `missing aggregate ${id}:${phase}`);
    }
  }
  verifyDigest(root, "result");
  return root;
}

describe("language benchmark contract fixtures", () => {
  test("valid actor, event vector, project, and corpus records are strict", async () => {
    const actor = await load("actors/echo.json");
    const events = await load("actors/echo.events.json");
    const project = await load("projects/echo.project.json");
    const corpus = await load("corpus.json");
    parseEventLoop(actor);
    parseEvents(events, actor);
    await parseProject(project);
    parseCorpus(corpus);
    const actorRecord = object(actor, "actor");
    const behavior = object(actorRecord.behavior, "behavior");
    expect(canonicalDigest(withoutDigest(behavior))).toBe(digest(behavior.digest, "behavior.digest"));
    expect(canonicalDigest(withoutDigest(actor))).toBe(digest(actorRecord.digest, "actor.digest"));
    const eventRecord = object(events, "events");
    expect(canonicalDigest(withoutDigest(events))).toBe(digest(eventRecord.digest, "events.digest"));
    const projectRecord = object(project, "project");
    expect(canonicalDigest(withoutDigest(project))).toBe(digest(projectRecord.digest, "project.digest"));
    const corpusRecord = object(corpus, "corpus");
    expect(canonicalDigest(withoutDigest(corpus))).toBe(digest(corpusRecord.digest, "corpus.digest"));
  });

  test("valid language benchmark result is strict and sample-derived", async () => {
    const result = await load("results/smoke.json");
    const corpus = await load("corpus.json");
    parseBenchmarkResult(result, corpus);
    const resultRecord = object(result, "result");
    const corpusRecord = object(corpus, "corpus");
    expect(resultRecord.corpusDigest).toBe(corpusRecord.digest);
    expect(canonicalDigest(withoutDigest(result))).toBe(digest(resultRecord.digest, "result.digest"));
  });

  test("benchmark result rejects unknown keys and over-limit samples", async () => {
    const corpus = await load("corpus.json");
    const result = structuredClone(await load("results/smoke.json")) as RecordValue;
    result.unexpected = true;
    expect(errorCode(() => parseBenchmarkResult(result, corpus))).toBe("EVENT_LOOP_UNKNOWN_KEY");
    const tooLarge = structuredClone(await load("results/smoke.json")) as RecordValue;
    const cases = tooLarge.cases;
    if (!Array.isArray(cases)) throw new Error("benchmark cases did not parse");
    const first = object(cases[0], "result.cases[0]");
    const samples = first.samples;
    if (!Array.isArray(samples)) throw new Error("benchmark samples did not parse");
    const firstSample = object(samples[0], "result.cases[0].samples[0]");
    firstSample.durationNs = 86_400_000_000_001;
    expect(errorCode(() => parseBenchmarkResult(tooLarge, corpus))).toBe("EVENT_LOOP_BOUNDS");
    const invalidCode = structuredClone(await load("results/smoke.json")) as RecordValue;
    const invalidCase = object((invalidCode.cases as unknown[])[0], "result.cases[0]");
    invalidCase.kind = "invalid";
    invalidCase.expected = "rejected";
    invalidCase.code = "x".repeat(MAX_ERROR_CODE_BYTES + 1);
    invalidCase.span = { start: 0, end: 1 };
    delete invalidCase.observed;
    expect(errorCode(() => parseBenchmarkResult(invalidCode, corpus))).toBe("EVENT_LOOP_PARSE");
  });

  test("corpus fixture entries pin raw bytes and expected identities", async () => {
    const corpus = object(await load("corpus.json"), "corpus");
    const fixtures = object(corpus.fixtures, "corpus.fixtures");
    for (const group of [fixtures.actors, fixtures.projects, fixtures.invalid]) {
      if (!Array.isArray(group)) throw new Error("corpus fixture group did not parse");
      for (const raw of group) {
        const entry = object(raw, "fixture");
        const bytes = await readFile(join(ROOT, text(entry.path, "fixture.path", 512)));
        expect(bytes.byteLength).toBeGreaterThan(0);
        expect(bytes.byteLength).toBeLessThanOrEqual(16_384);
        expect(rawDigest(bytes)).toBe(digest(entry.sha256, "fixture.sha256"));
      }
    }
    const actorEntry = object((fixtures.actors as unknown[])[0], "actor fixture");
    const actorExpected = object(actorEntry.expected, "actor expected");
    const actor = object(await load(path(actorEntry.path, "actor fixture path")), "actor");
    parseEventLoop(actor);
    expect(actorExpected.artifactDigest).toBe(actor.digest);
    const actorSchemas = (actor.actors as unknown[]).map((raw) => {
      const record = object(raw, "actor schema");
      return { id: record.id, state: record.state };
    });
    expect(actorExpected.interfaceDigest).toBe(canonicalDigest({ events: actor.events, actors: actorSchemas }));
    const eventPath = path(actorExpected.eventPath, "event fixture path");
    const eventVector = object(await load(eventPath), "event vector");
    parseEvents(eventVector, actor);
    expect(actorExpected.eventDigest).toBe(eventVector.digest);
    expect(actorExpected.eventSha256).toBe(rawDigest(await readFile(join(ROOT, eventPath))));
    const projectEntry = object((fixtures.projects as unknown[])[0], "project fixture");
    const projectExpected = object(projectEntry.expected, "project expected");
    const project = object(await load(path(projectEntry.path, "project fixture path")), "project");
    const closure = await parseProject(project);
    expect(projectExpected.projectDigest).toBe(closure.projectDigest);
    expect(projectExpected.closureDigest).toBe(closure.closureDigest);
    expect(closure.byteLength).toBeGreaterThan(0);
    expect(closure.byteLength).toBeLessThanOrEqual(262_144);
    const result = object(await load("results/smoke.json"), "result");
    const cases = result.cases as unknown[];
    const actorObserved = object(object(cases.find((raw) => object(raw, "case").id === actorEntry.id), "actor case").observed, "actor observed");
    expect(actorObserved.artifactDigest).toBe(actor.digest);
    expect(actorObserved.interfaceDigest).toBe(canonicalDigest({ events: actor.events, actors: actorSchemas }));
    expect(actorObserved.eventDigest).toBe(eventVector.digest);
    const projectObserved = object(object(cases.find((raw) => object(raw, "case").id === projectEntry.id), "project case").observed, "project observed");
    expect(projectObserved.projectDigest).toBe(closure.projectDigest);
    expect(projectObserved.closureDigest).toBe(closure.closureDigest);
  });

  test("every invalid fixture fails with its recorded code and bounded span", async () => {
    const corpus = object(await load("corpus.json"), "corpus");
    const fixtures = object(corpus.fixtures, "corpus.fixtures");
    if (!Array.isArray(fixtures.invalid)) throw new Error("invalid fixture group did not parse");
    for (const raw of fixtures.invalid) {
      const entry = object(raw, "fixture");
      const expected = object(entry.expected, "fixture.expected");
      const bytes = await readFile(join(ROOT, text(entry.path, "fixture.path", 512)));
      expect<unknown>(checkEventLoopBytes(bytes), text(entry.id, "fixture.id")).toEqual({
        code: expected.code, span: expected.span,
      });
    }
  });

  test("diagnostic spans use UTF-8 offsets and reject unlocated or oversized source", () => {
    const bytes = new TextEncoder().encode('{"méta": ["x", {"value": "é"}]}');
    expect(locateJsonSpan(bytes, ["méta"], true)).toEqual({ start: 2, end: 7 });
    expect(locateJsonSpan(bytes, ["méta", 1, "value"])).toEqual({ start: 27, end: 29 });
    expect(() => locateJsonSpan(bytes, ["méta", 2])).toThrow("path not found");
    expect(locateJsonSpan(new TextEncoder().encode("0"), [])).toEqual({ start: 0, end: 1 });
    expect(() => locateJsonSpan(new Uint8Array(), [])).toThrow("exceeds its limit");
    const maxSource = new TextEncoder().encode('{"x":0}' + " ".repeat(16_384 - 7));
    expect(locateJsonSpan(maxSource, ["x"])).toEqual({ start: 5, end: 6 });
    expect(() => locateJsonSpan(new Uint8Array(16_385), ["méta"])).toThrow("exceeds its limit");
    let source = "0";
    for (let i = 0; i < 64; i++) source = `[${source}]`;
    expect(locateJsonSpan(new TextEncoder().encode(source), Array(64).fill(0))).toEqual({ start: 64, end: 65 });
    expect(() => locateJsonSpan(bytes, Array(65).fill("x"))).toThrow("exceeds its limit");
    expect(() => locateJsonSpan(new TextEncoder().encode(`[${source}]`), [0])).toThrow("depth or node limit");
  });

  test("malformed JSON, invalid UTF-8, and non-object roots return located parse errors", async () => {
    const valid = await readFile(join(ROOT, "actors/echo.json"));
    expect(checkEventLoopBytes(valid)).toEqual({ code: "ACCEPTED" });
    const invalidSources = [
      new TextEncoder().encode('{"contract":'),
      new TextEncoder().encode("{}x"),
      Uint8Array.of(123, 34, 255, 34, 125),
      Uint8Array.of(195),
    ];
    for (const bytes of invalidSources) {
      expect(checkEventLoopBytes(bytes)).toEqual({
        code: "EVENT_LOOP_PARSE", span: { start: 0, end: bytes.byteLength },
      });
    }
    for (const input of ["null", "0", "[]"]) {
      const bytes = new TextEncoder().encode(input);
      expect(checkEventLoopBytes(bytes)).toEqual({
        code: "EVENT_LOOP_PARSE", span: { start: 0, end: bytes.byteLength },
      });
    }
    const scalar = new TextEncoder().encode('"text"');
    expect(checkEventLoopBytes(scalar)).toEqual({
      code: "EVENT_LOOP_PARSE", span: { start: 0, end: scalar.byteLength },
    });
    let nested = "null";
    for (let i = 0; i < 65; i++) nested = `[${nested}]`;
    const deepArray = new TextEncoder().encode(nested);
    expect(checkEventLoopBytes(deepArray)).toEqual({
      code: "EVENT_LOOP_PARSE", span: { start: 0, end: deepArray.byteLength },
    });
    expect(() => checkEventLoopBytes(new Uint8Array())).toThrow("1..16384 bytes");
    expect(() => checkEventLoopBytes(new Uint8Array(16_385))).toThrow("1..16384 bytes");
  });

  test("fixture error codes are closed and limited to 22 UTF-8 bytes", async () => {
    const corpus = structuredClone(await load("corpus.json")) as RecordValue;
    const fixtures = object(corpus.fixtures, "corpus.fixtures");
    const invalid = fixtures.invalid;
    if (!Array.isArray(invalid)) throw new Error("invalid fixtures did not parse");
    const entry = object(invalid[0], "fixture");
    const expected = object(entry.expected, "fixture.expected");
    expect(expected.code).toBe("EVENT_LOOP_UNKNOWN_KEY");
    expect(new TextEncoder().encode(expected.code as string).byteLength).toBe(MAX_ERROR_CODE_BYTES);
    expect(errorCode(() => parseCorpus(corpus))).toBe("ACCEPTED");
    const duplicateRuntime = structuredClone(corpus) as RecordValue;
    const duplicateIdentities = object(duplicateRuntime.identities, "corpus.identities");
    duplicateIdentities.runtimes = ["bun", "bun"];
    expect(errorCode(() => parseCorpus(duplicateRuntime))).toBe("EVENT_LOOP_ID");
    const duplicateFixture = structuredClone(corpus) as RecordValue;
    const duplicateFixtures = object(duplicateFixture.fixtures, "corpus.fixtures");
    const duplicateProject = object((duplicateFixtures.projects as unknown[])[0], "duplicate project");
    const firstActorFixture = object((duplicateFixtures.actors as unknown[])[0], "first actor fixture");
    duplicateProject.id = firstActorFixture.id;
    expect(errorCode(() => parseCorpus(duplicateFixture))).toBe("EVENT_LOOP_ID");
    for (const code of ["", "NOT_A_CODE", "x".repeat(MAX_ERROR_CODE_BYTES + 1)]) {
      expected.code = code;
      corpus.digest = canonicalDigest(withoutDigest(corpus));
      expect(errorCode(() => parseCorpus(corpus)), `invalid code ${JSON.stringify(code)}`).toBe("EVENT_LOOP_PARSE");
    }
  });

  test("expression names use only state and event, including write and output programs", async () => {
    const actor = structuredClone(await load("actors/echo.json")) as RecordValue;
    const firstActor = object((actor.actors as unknown[])[0], "actor");
    const transition = object((firstActor.transitions as unknown[])[0], "transition");
    const guard = object(transition.when, "guard");
    guard.program = ["get", "undeclared"];
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("EVENT_LOOP_REFERENCE");
    guard.program = ["get", "event", "amount"];
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("ACCEPTED");
    const write = object((transition.writes as unknown[])[0], "write");
    const value = object(write.value, "write value");
    value.program = ["get", "undeclared"];
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("EVENT_LOOP_REFERENCE");
    value.program = ["get", "state", "count"];
    const output = object((transition.outputs as unknown[])[0], "output");
    const payload = object(output.payload, "output payload");
    payload.program = ["get", "undeclared"];
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("EVENT_LOOP_REFERENCE");
  });

  test("expression node and depth limits include quoted data", () => {
    const envelope = (program: JsonValue): RecordValue => ({ contract: "algal.expr.v1", program });
    const atMost512 = ["list", ...Array(510).fill(0)];
    expect(errorCode(() => expression(envelope(atMost512), "expression"))).toBe("ACCEPTED");
    expect(errorCode(() => expression(envelope([...atMost512, 0]), "expression"))).toBe("EVENT_LOOP_BOUNDS");
    let program: JsonValue = true;
    for (let depth = 1; depth <= 15; depth++) program = ["not", program];
    expect(errorCode(() => expression(envelope(program), "expression"))).toBe("ACCEPTED");
    expect(errorCode(() => expression(envelope(["not", program]), "expression"))).toBe("EVENT_LOOP_BOUNDS");
    let quoted: JsonValue = true;
    for (let depth = 1; depth <= 14; depth++) quoted = [quoted];
    expect(errorCode(() => expression(envelope(["quote", quoted]), "expression"))).toBe("ACCEPTED");
    expect(errorCode(() => expression(envelope(["quote", [quoted]]), "expression"))).toBe("EVENT_LOOP_BOUNDS");
  });

  test("contract-owned unknown keys have exact UTF-8 key spans at each depth", async () => {
    const base = await load("actors/echo.json");
    const paths: readonly (readonly (string | number)[])[] = [
      [], ["behavior"], ["limits"], ["events", 0], ["events", 0, "payload"],
      ["events", 0, "payload", "fields", 0], ["actors", 0], ["actors", 0, "state"],
      ["actors", 0, "state", "fields", 0], ["actors", 0, "transitions", 0],
      ["actors", 0, "transitions", 0, "when"],
      ["actors", 0, "transitions", 0, "writes", 0],
      ["actors", 0, "transitions", 0, "writes", 0, "value"],
      ["actors", 0, "transitions", 0, "outputs", 0],
      ["actors", 0, "transitions", 0, "outputs", 0, "payload"],
      ["actors", 0, "transitions", 0, "result"],
    ];
    for (const at of paths) {
      const actor = structuredClone(base) as RecordValue;
      let field: unknown = actor;
      for (const part of at) field = (field as Record<string | number, unknown>)[part];
      const key = "éxtra";
      (field as RecordValue)[key] = true;
      const bytes = new TextEncoder().encode(JSON.stringify(actor));
      const span = locateJsonSpan(bytes, [...at, key], true);
      expect(checkEventLoopBytes(bytes), at.join(".")).toEqual({ code: "EVENT_LOOP_UNKNOWN_KEY", span });
      expect(new TextDecoder().decode(bytes.subarray(span.start, span.end))).toBe(key);
    }
  });

  test("all behavior numeric bounds return exact UTF-8 value spans", async () => {
    const base = await load("actors/echo.json");
    for (const [key, min, max] of [
      ["maxEventBytes", 1, 65_536], ["maxStateBytes", 1, 262_144],
      ["maxOutputEvents", 0, 64], ["maxTransitionFuel", 1, 100_000],
      ["maxMailboxDepth", 1, 1_024],
    ] as const) {
      for (const value of [min - 1, max + 1, 1.5, "2"]) {
        const actor = structuredClone(base) as RecordValue;
        object(actor.limits, "limits")[key] = value;
        const bytes = new TextEncoder().encode(JSON.stringify(actor));
        const span = locateJsonSpan(bytes, ["limits", key]);
        expect(checkEventLoopBytes(bytes), `${key}=${value}`).toEqual({ code: "EVENT_LOOP_BOUNDS", span });
        expect(new TextDecoder().decode(bytes.subarray(span.start, span.end))).toBe(String(value));
      }
      const actor = structuredClone(base) as RecordValue;
      object(actor.limits, "limits")[key] = max;
      actor.digest = canonicalDigest(withoutDigest(actor));
      expect(checkEventLoopBytes(new TextEncoder().encode(JSON.stringify(actor))), `${key} max`).toEqual({ code: "ACCEPTED" });
    }
    const atZero = structuredClone(base) as RecordValue;
    object(atZero.limits, "limits").maxOutputEvents = 0;
    const transition = object((object((atZero.actors as unknown[])[0], "actor").transitions as unknown[])[0], "transition");
    transition.outputs = [];
    atZero.digest = canonicalDigest(withoutDigest(atZero));
    expect(checkEventLoopBytes(new TextEncoder().encode(JSON.stringify(atZero)))).toEqual({ code: "ACCEPTED" });
    for (const revision of [0, 2_147_483_648, 1.5]) {
      const actor = structuredClone(base) as RecordValue;
      object(actor.behavior, "behavior").revision = revision;
      const bytes = new TextEncoder().encode(JSON.stringify(actor));
      expect(checkEventLoopBytes(bytes)).toEqual({
        code: "EVENT_LOOP_BOUNDS", span: locateJsonSpan(bytes, ["behavior", "revision"]),
      });
    }
    const highRevision = structuredClone(base) as RecordValue;
    const behavior = object(highRevision.behavior, "behavior");
    behavior.revision = 2_147_483_647;
    behavior.digest = canonicalDigest(withoutDigest(behavior));
    highRevision.digest = canonicalDigest(withoutDigest(highRevision));
    expect(checkEventLoopBytes(new TextEncoder().encode(JSON.stringify(highRevision)))).toEqual({ code: "ACCEPTED" });
  });

  test("project fixture boundary rejects a closure one byte over the limit", async () => {
    const contents = new Map<string, Uint8Array>(Array.from({ length: 17 }, (_, i) =>
      [`file-${i}`, new Uint8Array(i === 16 ? 1 : 16_384).fill(97)] as const));
    const files = [...contents].map(([filePath, bytes]) => ({ path: filePath, digest: rawDigest(bytes) }));
    const body = { contract: "algal.language-project.v1", id: "fixture", entry: "file-0", files };
    const project = { ...body, digest: canonicalDigest(body) };
    const readBytes = async (filePath: string): Promise<Uint8Array> => contents.get(filePath)!;
    const full = { ...project, files: files.slice(0, 16) };
    full.digest = canonicalDigest(withoutDigest(full));
    expect((await parseProject(full, readBytes)).byteLength).toBe(262_144);
    try {
      await parseProject(project, readBytes);
      throw new Error("closure above limit was accepted");
    } catch (error) {
      if (!(error instanceof ProjectClosureError)) throw error;
      expect(error.code).toBe("EVENT_LOOP_BOUNDS");
      expect(error.at).toEqual(["files", 16, "path"]);
      const bytes = new TextEncoder().encode(JSON.stringify(project));
      const span = locateJsonSpan(bytes, error.at);
      expect(new TextDecoder().decode(bytes.subarray(span.start, span.end))).toBe("file-16");
    }
  });

  test("unknown keys and first out-of-range limits are rejected", async () => {
    const actor = object(await load("actors/echo.json"), "actor");
    const unknown = structuredClone(actor) as RecordValue;
    unknown.unexpected = true;
    expect(errorCode(() => parseEventLoop(unknown))).toBe("EVENT_LOOP_UNKNOWN_KEY");
    const tooLarge = structuredClone(actor) as RecordValue;
    const limits = object(tooLarge.limits, "limits");
    limits.maxEventBytes = 65_537;
    expect(errorCode(() => parseEventLoop(tooLarge))).toBe("EVENT_LOOP_BOUNDS");
  });

  test("all record parsers reject well-formed but incorrect digests", async () => {
    const actor = await load("actors/echo.json");
    const events = await load("actors/echo.events.json");
    const awaitCorpus = await load("corpus.json");
    const records: [unknown, (value: unknown) => unknown][] = [
      [actor, parseEventLoop],
      [events, (value) => parseEvents(value, actor)],
      [await load("projects/echo.project.json"), parseProjectRecord],
      [await load("corpus.json"), parseCorpus],
      [await load("results/smoke.json"), (value) => parseBenchmarkResult(value, awaitCorpus)],
    ];
    for (const [record, parse] of records) {
      const changed = structuredClone(record) as RecordValue;
      changed.digest = `sha256:${"0".repeat(64)}`;
      expect(errorCode(() => parse(changed))).toBe("EVENT_LOOP_DIGEST");
    }
    const changedBehavior = structuredClone(actor) as RecordValue;
    object(changedBehavior.behavior, "behavior").sourceDigest = `sha256:${"0".repeat(64)}`;
    expect(errorCode(() => parseEventLoop(changedBehavior))).toBe("EVENT_LOOP_DIGEST");
  });

  test("event payload schema and complete event byte limit are checked against the behavior", async () => {
    const actor = structuredClone(await load("actors/echo.json")) as RecordValue;
    const events = structuredClone(await load("actors/echo.events.json")) as RecordValue;
    const first = object((events.events as unknown[])[0], "event");
    const payload = object(first.payload, "payload");
    payload.extra = true;
    expect(errorCode(() => parseEvents(events, actor))).toBe("EVENT_LOOP_UNKNOWN_KEY");
    delete payload.extra;
    payload.amount = "two";
    expect(errorCode(() => parseEvents(events, actor))).toBe("EVENT_LOOP_SCHEMA");
    payload.amount = 2;
    delete payload.amount;
    expect(errorCode(() => parseEvents(events, actor))).toBe("EVENT_LOOP_PARSE");
    payload.amount = 2;
    const size = Math.max(...(events.events as unknown[]).map((event) => canonicalBytes(event, "event")));
    const limits = object(actor.limits, "limits");
    limits.maxEventBytes = size;
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEvents(events, actor))).toBe("ACCEPTED");
    limits.maxEventBytes = size - 1;
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEvents(events, actor))).toBe("EVENT_LOOP_BOUNDS");
    limits.maxEventBytes = 65_536;
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEvents(events, actor))).toBe("ACCEPTED");
    limits.maxEventBytes = 65_537;
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEvents(events, actor))).toBe("EVENT_LOOP_BOUNDS");
  });

  test("complete initial state is limited and v1 writes address one field", async () => {
    const actor = structuredClone(await load("actors/echo.json")) as RecordValue;
    const limits = object(actor.limits, "limits");
    const actors = actor.actors as unknown[];
    const firstActor = object(actors[0], "actor");
    const initialBytes = canonicalBytes({ count: 0 }, "initial state");
    limits.maxStateBytes = initialBytes;
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("ACCEPTED");
    limits.maxStateBytes = initialBytes - 1;
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("EVENT_LOOP_BOUNDS");
    limits.maxStateBytes = 262_144;
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("ACCEPTED");
    limits.maxStateBytes = 262_145;
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("EVENT_LOOP_BOUNDS");
    limits.maxStateBytes = 16_384;
    const transition = object((firstActor.transitions as unknown[])[0], "transition");
    const write = object((transition.writes as unknown[])[0], "write");
    write.path = ["count", "nested"];
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("EVENT_LOOP_BOUNDS");
    write.path = [];
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("EVENT_LOOP_BOUNDS");
  });

  test("quiet forbids outputs, and sources cannot collide in event identity", async () => {
    const actor = structuredClone(await load("actors/echo.json")) as RecordValue;
    const artifactDigest = actor.digest;
    const firstActor = object((actor.actors as unknown[])[0], "actor");
    const transition = object((firstActor.transitions as unknown[])[0], "transition");
    transition.result = { kind: "quiet" };
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("EVENT_LOOP_SEMANTIC");
    const events = object(await load("actors/echo.events.json"), "events");
    const firstEvent = object((events.events as unknown[])[0], "event");
    const otherSource = { ...firstEvent, source: "another-source" };
    expect(eventIdentity(artifactDigest, firstActor.id, firstEvent)).not.toBe(eventIdentity(artifactDigest, firstActor.id, otherSource));
    expect(eventIdentity(artifactDigest, firstActor.id, firstEvent)).toBe(eventIdentity(artifactDigest, firstActor.id, { ...firstEvent }));
  });

  test("nested JSON limits cover state initials and event payloads", async () => {
    const actor = structuredClone(await load("actors/echo.json")) as RecordValue;
    // State and event schema fields are edited only in memory; no fixture digest is rewritten.
    const fields = (object(object((actor.actors as unknown[])[0], "actor").state, "state").fields as unknown[]);
    const field = object(fields[0], "state field");
    field.type = "json";
    field.initial = { nested: [1] };
    actor.digest = canonicalDigest(withoutDigest(actor));
    expect(errorCode(() => parseEventLoop(actor))).toBe("ACCEPTED");
    field.initial = [Array(EXPR_BOUNDS.maxListLen + 1).fill(0)];
    expect(errorCode(() => parseEventLoop(actor))).toBe("EVENT_LOOP_BOUNDS");

    field.initial = null;
    const declarations = actor.events as unknown[];
    const increment = object(declarations[0], "increment event");
    const payloadSchema = object(increment.payload, "payload schema");
    object((payloadSchema.fields as unknown[])[0], "amount schema").type = "json";
    actor.digest = canonicalDigest(withoutDigest(actor));
    const events = structuredClone(await load("actors/echo.events.json")) as RecordValue;
    const first = object((events.events as unknown[])[0], "event");
    const payload = object(first.payload, "payload");
    payload.amount = { nested: [2] };
    events.digest = canonicalDigest(withoutDigest(events));
    expect(errorCode(() => parseEvents(events, actor))).toBe("ACCEPTED");
    let tooDeep: JsonValue = null;
    for (let i = 0; i < EXPR_BOUNDS.maxValueDepth + 1; i++) tooDeep = [tooDeep];
    payload.amount = tooDeep;
    expect(errorCode(() => parseEvents(events, actor))).toBe("EVENT_LOOP_BOUNDS");
  });

  test("JSON values enforce depth, list, keys, UTF-8 strings, and canonical bytes", () => {
    const check = (value: unknown): string => errorCode(() => json(value, "value"));
    let deep: JsonValue = null;
    for (let i = 0; i < EXPR_BOUNDS.maxValueDepth; i++) deep = [deep];
    expect(check(deep)).toBe("ACCEPTED");
    expect(check([deep])).toBe("EVENT_LOOP_BOUNDS");
    expect(check(Array(EXPR_BOUNDS.maxListLen).fill(0))).toBe("ACCEPTED");
    expect(check(Array(EXPR_BOUNDS.maxListLen + 1).fill(0))).toBe("EVENT_LOOP_BOUNDS");
    const keys = Object.fromEntries(Array.from({ length: EXPR_BOUNDS.maxObjectKeys }, (_, i) => [String(i), 0]));
    expect(check(keys)).toBe("ACCEPTED");
    expect(check({ ...keys, extra: 0 })).toBe("EVENT_LOOP_BOUNDS");
    expect(check("x".repeat(EXPR_BOUNDS.maxStringBytes))).toBe("ACCEPTED");
    expect(check("x".repeat(EXPR_BOUNDS.maxStringBytes + 1))).toBe("EVENT_LOOP_BOUNDS");
    expect(check({ ["x".repeat(EXPR_BOUNDS.maxStringBytes + 1)]: 0 })).toBe("EVENT_LOOP_BOUNDS");
    const atLimit = Array(EXPR_BOUNDS.maxListLen).fill("x".repeat(253));
    atLimit[0] = "x".repeat(252);
    expect(canonicalBytes(atLimit, "value")).toBe(EXPR_BOUNDS.maxValueBytes);
    expect(check(atLimit)).toBe("ACCEPTED");
    atLimit[0] = "x".repeat(253);
    expect(check(atLimit)).toBe("EVENT_LOOP_BOUNDS");
    const cyclic: unknown[] = [];
    cyclic.push(cyclic);
    expect(check(cyclic)).toBe("EVENT_LOOP_PARSE");
    expect(check(Array(1))).toBe("EVENT_LOOP_PARSE");
  });

  test("state initial values obey their declared schema types", async () => {
    const actor = structuredClone(await load("actors/echo.json")) as RecordValue;
    const actors = actor.actors;
    if (!Array.isArray(actors)) throw new Error("actor list did not parse");
    const firstActor = object(actors[0], "actor");
    const state = object(firstActor.state, "state");
    const fields = state.fields;
    if (!Array.isArray(fields)) throw new Error("state fields did not parse");
    const firstField = object(fields[0], "state field");
    firstField.initial = "zero";
    expect(errorCode(() => parseEventLoop(actor))).toBe("EVENT_LOOP_SCHEMA");
  });

  test("result joins all pinned fixture identities, protocol, toolchain, and machine", async () => {
    const corpus = await load("corpus.json");
    const base = await load("results/smoke.json");
    const result = object(base, "result");
    const fixtures = object(object(corpus, "corpus").fixtures, "fixtures");
    const ids = new Set([...fixtures.actors as unknown[], ...fixtures.projects as unknown[], ...fixtures.invalid as unknown[]]
      .map((value) => object(value, "fixture").id));
    const cases = result.cases as unknown[];
    expect(cases.length).toBe(12);
    expect(new Set(cases.map((value) => object(value, "case").id))).toEqual(ids);
    expect((result.aggregate as unknown[]).length).toBe(24);
    expect(cases.reduce<number>((count, value) => count + (object(value, "case").samples as unknown[]).length, 0)).toBe(360);

    const reject = (change: (value: RecordValue) => void, code = "EVENT_LOOP_REFERENCE"): void => {
      const changed = structuredClone(base) as RecordValue;
      change(changed);
      changed.digest = canonicalDigest(withoutDigest(changed));
      expect(errorCode(() => parseBenchmarkResult(changed, corpus))).toBe(code);
    };
    reject((value) => { value.corpusDigest = `sha256:${"0".repeat(64)}`; });
    reject((value) => { object(value.protocol, "protocol").warmupSamples = 4; });
    reject((value) => { object(value.toolchain, "toolchain").compiler = "other@proposal"; });
    reject((value) => { object(value.toolchain, "toolchain").runtime = "other@1"; });
    reject((value) => { object(value.toolchain, "toolchain").native = "bun@1"; });
    reject((value) => { object(value.environment, "environment").os = "darwin"; });
    reject((value) => { object(object((value.cases as unknown[])[0], "case").observed, "observed").artifactDigest = `sha256:${"0".repeat(64)}`; });
    reject((value) => { object(object((value.cases as unknown[]).find((raw) => object(raw, "case").kind === "project"), "case").observed, "observed").closureDigest = `sha256:${"0".repeat(64)}`; });
    reject((value) => { (value.cases as unknown[]).pop(); });
    reject((value) => { (value.cases as unknown[]).reverse(); });
    reject((value) => { (value.cases as unknown[]).push({ ...object((value.cases as unknown[])[0], "case"), id: "extra" }); });
    reject((value) => { object((value.cases as unknown[])[1], "case").id = object((value.cases as unknown[])[0], "case").id; }, "EVENT_LOOP_ID");
    reject((value) => { object((value.cases as unknown[])[0], "case").id = "unknown-case"; });
    reject((value) => {
      const first = object((value.cases as unknown[])[0], "case");
      first.kind = "project";
      first.observed = object((value.cases as unknown[]).find((raw) => object(raw, "case").id === "counter-project"), "project case").observed;
    });
    reject((value) => { object((value.cases as unknown[])[0], "case").sourceDigest = `sha256:${"0".repeat(64)}`; });
    reject((value) => {
      const first = object((value.cases as unknown[])[0], "case");
      first.kind = "invalid";
      first.expected = "rejected";
      first.code = "EVENT_LOOP_PARSE";
      first.span = { start: 0, end: 1 };
      delete first.observed;
      for (const sample of first.samples as unknown[]) object(sample, "sample").outcome = "rejected";
    });
    const invalidIndex = cases.findIndex((value) => object(value, "case").kind === "invalid");
    reject((value) => { object((value.cases as unknown[])[invalidIndex], "case").code = "EVENT_LOOP_PARSE"; });
    reject((value) => { object(object((value.cases as unknown[])[invalidIndex], "case").span, "span").end = 2491; });
  });

  test("new machine profile is closed, limited in UTF-8 bytes, and joined", async () => {
    const originalCorpus = await load("corpus.json");
    const originalResult = await load("results/smoke.json");
    const corpus = structuredClone(originalCorpus) as RecordValue;
    const identities = object(corpus.identities, "identities");
    const machine = object(identities.machine, "machine");
    machine.extra = true;
    expect(errorCode(() => parseCorpus(corpus))).toBe("EVENT_LOOP_UNKNOWN_KEY");
    delete machine.extra;
    const result = structuredClone(originalResult) as RecordValue;
    for (const key of ["os", "arch", "cpu"] as const) {
      machine[key] = "a".repeat(128);
      corpus.digest = canonicalDigest(withoutDigest(corpus));
      object(result.environment, "environment")[key] = machine[key];
      result.corpusDigest = corpus.digest;
      result.digest = canonicalDigest(withoutDigest(result));
      expect(errorCode(() => parseBenchmarkResult(result, corpus)), key).toBe("ACCEPTED");
      machine[key] = "a".repeat(129);
      expect(errorCode(() => parseCorpus(corpus)), key).toBe("EVENT_LOOP_PARSE");
      machine[key] = "";
      expect(errorCode(() => parseCorpus(corpus)), key).toBe("EVENT_LOOP_PARSE");
      machine[key] = "a".repeat(128);
    }
    expect(errorCode(() => text("é".repeat(64), "profile"))).toBe("ACCEPTED");
    expect(errorCode(() => text("é".repeat(65), "profile"))).toBe("EVENT_LOOP_PARSE");
  });

  test("count, byte, and list limits reject their first excess", async () => {
    const actor = object(await load("actors/echo.json"), "actor");
    const events = object(await load("actors/echo.events.json"), "events");
    const corpus = object(await load("corpus.json"), "corpus");
    const result = object(await load("results/smoke.json"), "result");
    const project = object(await load("projects/echo.project.json"), "project");
    for (const [key, min, max] of [
      ["maxEventBytes", 1, 65_536], ["maxStateBytes", 1, 262_144],
      ["maxOutputEvents", 0, 64], ["maxTransitionFuel", 1, 100_000],
      ["maxMailboxDepth", 1, 1_024], ["revision", 1, 2_147_483_647],
    ] as const) {
      expect(errorCode(() => integer(min, key, min, max)), key).toBe("ACCEPTED");
      expect(errorCode(() => integer(max, key, min, max)), key).toBe("ACCEPTED");
      expect(errorCode(() => integer(min - 1, key, min, max)), key).toBe("EVENT_LOOP_BOUNDS");
      expect(errorCode(() => integer(max + 1, key, min, max)), key).toBe("EVENT_LOOP_BOUNDS");
    }
    expect(errorCode(() => identifier("a".repeat(64), "id"))).toBe("ACCEPTED");
    expect(errorCode(() => identifier("a".repeat(65), "id"))).toBe("EVENT_LOOP_PARSE");
    expect(errorCode(() => path("a".repeat(512), "path"))).toBe("ACCEPTED");
    expect(errorCode(() => path("a".repeat(513), "path"))).toBe("EVENT_LOOP_PARSE");
    const expectMutation = (base: RecordValue, parse: (input: unknown) => unknown, change: (input: RecordValue) => void, code: string): void => {
      const copy = structuredClone(base) as RecordValue;
      change(copy);
      expect(errorCode(() => parse(copy))).toBe(code);
    };
    for (const [field, length] of [["events", 129], ["actors", 65]] as const) {
      expectMutation(actor, parseEventLoop, (copy) => { copy[field] = Array(length).fill((actor[field] as unknown[])[0]); }, "EVENT_LOOP_BOUNDS");
    }
    expectMutation(actor, parseEventLoop, (copy) => {
      const transition = (object((actor.actors as unknown[])[0], "actor").transitions as unknown[])[0];
      object((copy.actors as unknown[])[0], "actor").transitions = Array(257).fill(transition);
    }, "EVENT_LOOP_BOUNDS");
    expectMutation(actor, parseEventLoop, (copy) => { object(object((copy.events as unknown[])[0], "event").payload, "payload").fields = Array(65).fill({ name: "x", type: "number" }); }, "EVENT_LOOP_SCHEMA");
    expectMutation(actor, parseEventLoop, (copy) => { object((object((copy.actors as unknown[])[0], "actor").transitions as unknown[])[0], "transition").writes = Array(65).fill({}); }, "EVENT_LOOP_BOUNDS");
    expectMutation(actor, parseEventLoop, (copy) => { object((object((copy.actors as unknown[])[0], "actor").transitions as unknown[])[0], "transition").outputs = Array(65).fill({}); }, "EVENT_LOOP_BOUNDS");
    expectMutation(events, (value) => parseEvents(value, actor), (copy) => { copy.events = Array(257).fill((events.events as unknown[])[0]); }, "EVENT_LOOP_BOUNDS");
    expectMutation(project, parseProjectRecord, (copy) => { copy.files = Array(65).fill((project.files as unknown[])[0]); }, "EVENT_LOOP_BOUNDS");
    expectMutation(corpus, parseCorpus, (copy) => { object(copy.fixtures, "fixtures").invalid = Array(129).fill((object(corpus.fixtures, "fixtures").invalid as unknown[])[0]); }, "EVENT_LOOP_BOUNDS");
    expectMutation(result, (value) => parseBenchmarkResult(value, corpus), (copy) => { object(copy.protocol, "protocol").warmupSamples = 101; }, "EVENT_LOOP_BOUNDS");
    const protocol = object(result.protocol, "protocol");
    expect(errorCode(() => parseBenchmarkProtocol({ ...protocol, warmupSamples: 100 }, "protocol"))).toBe("ACCEPTED");
    expect(errorCode(() => parseBenchmarkProtocol({ ...protocol, measuredSamples: 0 }, "protocol"))).toBe("EVENT_LOOP_BOUNDS");
    expect(errorCode(() => parseBenchmarkProtocol({ ...protocol, measuredSamples: 1_000 }, "protocol"))).toBe("ACCEPTED");
    expect(errorCode(() => parseBenchmarkProtocol({ ...protocol, measuredSamples: 1_001 }, "protocol"))).toBe("EVENT_LOOP_BOUNDS");
    const sample = { phase: "cold", index: 999, durationNs: 86_400_000_000_000, outcome: "accepted" };
    expect(errorCode(() => parseBenchmarkSample(sample, 0, "sample"))).toBe("ACCEPTED");
    expect(errorCode(() => parseBenchmarkSample({ ...sample, index: 1_000 }, 0, "sample"))).toBe("EVENT_LOOP_BOUNDS");
    expect(errorCode(() => parseBenchmarkSample({ ...sample, durationNs: 86_400_000_000_001 }, 0, "sample"))).toBe("EVENT_LOOP_BOUNDS");
  });
});
