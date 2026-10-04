import { expect, test } from "bun:test";
import fixture from "../scripts/fixtures/context-history.json";
import { contextHistorySelection, validateContextHistoryViewAccess } from "./context-history-access";
import { contextHistoryRef } from "./context-history-contract";
import { digestCanonical, type Digest } from "./digest";
import { asJsonValue, type JsonValue } from "./values";

const records = fixture.records as unknown as Record<string, JsonValue>;
const record = (name: string): JsonValue => structuredClone(records[name]!);
const request = digestCanonical({ op: "overview", keepRecent: 1 });
const nodes = () => ["leaf0", "leaf1", "leaf2", "leaf3", "left", "right", "root"].map(record);
const summaries = () => ["summaryLeft", "summaryRight", "summaryRoot"].map(record);
function authorization(grant = record("grant"), access = record("access"), selected: Digest = request) {
  return { reference: contextHistoryRef(grant), grant, access, request: selected };
}
function page(access = record("access"), grant = record("grant")) {
  const value = record("view") as Record<string, JsonValue>;
  (value.binding as Record<string, JsonValue>).selection = contextHistorySelection(grant, access, request);
  if (value.cursor !== null) (value.cursor as Record<string, JsonValue>).binding = structuredClone(value.binding!);
  return value;
}
function validate(view: unknown, authority: unknown = authorization()) {
  validateContextHistoryViewAccess(record("history"), record("generation"), view, nodes(), summaries(), authority);
}

test("source-containing views join the current grant, access and retained request", () => {
  validate(page());
  const selection = contextHistorySelection(record("grant"), record("access"), request);
  expect(request).toBe(fixture.selection.request as Digest);
  expect(selection).toBe(fixture.selection.digest as Digest);
  expect(selection).toBe(contextHistorySelection(record("grant"), record("access"), request));
});

test("a structurally consistent cached page cannot bypass revocation or narrowing", () => {
  const original = page();
  const access = record("access") as Record<string, JsonValue>;
  for (const state of ["revoked", "unavailable"]) {
    access.state = state;
    expect(() => validate(original, authorization(record("grant"), access))).toThrow();
    expect(() => validate(page(access), authorization(record("grant"), access))).toThrow("scope does not authorize");
  }
  access.state = "active";
  access.indices = [0, 1];
  validate(page(access), authorization(record("grant"), access));
  access.indices = [0];
  expect(() => validate(page(access), authorization(record("grant"), access))).toThrow("scope does not authorize");
});

test("pending and unavailable metadata requires every contributing source", () => {
  const access = record("access") as Record<string, JsonValue>;
  access.indices = [0];
  const root = record("root");
  for (const kind of ["pending", "unavailable"]) {
    const metadata = page(access);
    metadata.start = 0;
    metadata.end = 4;
    metadata.cursor = null;
    metadata.status = kind === "pending" ? "incomplete" : "unavailable";
    metadata.reason = kind === "pending" ? "missing-summary" : "source-unavailable";
    metadata.items = [{ kind, node: digestCanonical(asJsonValue(root, "node")), start: 0, end: 4, reason: metadata.reason }];
    metadata.usage = { readBytes: 0, scanBytes: 0, nodeVisits: 1, work: 1 };
    expect(() => validate(metadata, authorization(record("grant"), access))).toThrow("scope does not authorize");
  }
});

test("access revision, retained request and every grant limit cannot be substituted", () => {
  const original = page();
  const access = record("access") as Record<string, JsonValue>;
  access.revision = Number(access.revision) + 1;
  expect(() => validate(original, authorization(record("grant"), access))).toThrow();
  expect(() => validate(original, authorization(record("grant"), record("access"), digestCanonical({ op: "search", query: "hidden" })))).toThrow();
  for (const key of ["maxReadBytes", "maxScanBytes", "maxOutputBytes", "maxNodes", "maxWork", "maxSearchResults"]) {
    const grant = record("grant") as Record<string, JsonValue>;
    const limits = grant.limits as Record<string, JsonValue>;
    limits[key] = Number(limits[key]) - 1;
    expect(() => validate(page(record("access"), grant), authorization(grant))).toThrow("scope does not authorize");
  }
});

test("authorization ingress rejects getters, unknown fields and wrong references", () => {
  let calls = 0;
  const invalid = { ...authorization(), get request() { calls++; return request; } };
  expect(() => validate(page(), invalid)).toThrow();
  expect(calls).toBe(0);
  expect(() => validate(page(), { ...authorization(), unknown: true })).toThrow();
  expect(() => validate(page(), { ...authorization(), reference: { schema: "algal.context-history-ref.v1", history: request, capability: `cap:context-history:${request}` } })).toThrow();
});
