import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import { eventLoopVectors, tsResults } from "../scripts/event-loop-contract-parity";
import { canonicalize, type JsonValue } from "./values";

const digest = (body: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(body)).digest("hex")}`;

// The shape-only boundary still binds source/type to the logical event and
// delivery to the message. These are portable fixture checks, not host replay.
test("isolated entry identity limits and digests survive shared trace vectors", async () => {
  const vectors = await eventLoopVectors();
  const byName = new Map(vectors.map((vector) => [vector.name, vector]));
  const results = new Map(tsResults(vectors).map((vector) => [vector.name, vector.result]));
  for (const field of ["source", "type", "delivery"] as const) {
    for (const [suffix, code] of [
      ["id-excess", "EVENT_LOOP_ID"], ["id-malformed", "EVENT_LOOP_ID"],
      ["id-missing", "EVENT_LOOP_PARSE"],
    ] as const) {
      expect(results.get(`${field}-${suffix}`)).toEqual({code});
    }
    const maximum = byName.get(`${field}-id-max`)!;
    const root = maximum.value as {entries: {eventDigest: string; messageDigest: string; [key: string]: unknown}[]};
    expect((root.entries[0]![field] as string).length).toBe(64);
    expect(results.get(maximum.name)).toMatchObject({digest: maximum.expected});
  }
  const base = (byName.get("valid")!.value as {entries: {eventDigest: string; messageDigest: string}[]}).entries[0]!;
  const source = (byName.get("source-id-max")!.value as {entries: typeof base[]}).entries[0]!;
  const type = (byName.get("type-id-max")!.value as {entries: typeof base[]}).entries[0]!;
  const delivery = (byName.get("delivery-id-max")!.value as {entries: typeof base[]}).entries[0]!;
  expect(source.eventDigest).not.toBe(base.eventDigest);
  expect(type.eventDigest).not.toBe(base.eventDigest);
  expect(delivery.eventDigest).toBe(base.eventDigest);
  expect(delivery.messageDigest).not.toBe(base.messageDigest);
});

// Each omission starts from a single accepted delivery with one key deleted.
// The parity driver checks the same named vectors and refusal codes in Rust.
test("required trace root, limit and entry omissions are isolated", async () => {
  const vectors = await eventLoopVectors();
  const byName = new Map(vectors.map((vector) => [vector.name, vector]));
  const results = new Map(tsResults(vectors).map((vector) => [vector.name, vector.result]));
  const control = structuredClone(byName.get("valid")!.value) as {
    digest: string; entries: Record<string, unknown>[]; limits: Record<string, unknown>; [key: string]: unknown;
  };
  control.entries = [control.entries[0]!];
  const {digest: _prior, ...controlBody} = control;
  control.digest = digest(controlBody as JsonValue);
  expect(tsResults([{name: "control", value: control, expected: control.digest}])[0]!.result)
    .toMatchObject({digest: control.digest});
  for (const [level, fields] of [
    ["root", ["contract", "behavior", "limits", "entries", "digest"]],
    ["limits", ["maxStateBytes", "maxOutputEvents", "maxTransitionFuel", "maxMailboxDepth"]],
    ["entry", ["payload", "eventDigest", "messageDigest", "depthBefore", "decision"]],
  ] as const) {
    for (const field of fields) {
      const name = `${level}-${field}-missing`;
      const root = byName.get(name)!.value as typeof control;
      const object = level === "root" ? root : level === "limits" ? root.limits : root.entries[0]!;
      const original = level === "root" ? control : level === "limits" ? control.limits : control.entries[0]!;
      expect(Object.hasOwn(object, field)).toBe(false);
      expect(results.get(name)).toEqual({code: "EVENT_LOOP_PARSE"});
      if (field !== "digest") {
        const {digest: _old, ...body} = root;
        expect(root.digest).toBe(digest(body as JsonValue));
        expect(root.digest).not.toBe(control.digest);
      }
      const restored = structuredClone(root);
      const destination = level === "root" ? restored : level === "limits" ? restored.limits : restored.entries[0]!;
      destination[field] = original[field];
      restored.digest = control.digest;
      expect(restored).toEqual(control);
    }
  }
});

// The reference prefix for each decision must pass before deleting a field.
// Restoring the omitted value and digest must reproduce that exact prefix.
test("decision omissions refuse on both trace shapes without stale-digest masking", async () => {
  const vectors = await eventLoopVectors();
  expect(vectors.length).toBeLessThanOrEqual(128); // Rust parity input limit.
  const byName = new Map(vectors.map((vector) => [vector.name, vector]));
  expect(byName.size).toBe(vectors.length);
  const results = new Map(tsResults(vectors).map((vector) => [vector.name, vector.result]));
  for (const [kind, index, paths] of [
    ["accepted", 0, ["kind", "transition", "outcome", "stateDigest", "outputs", "effects", "resources",
      "effects-requested", "effects-settled", "effects-receipts", "resources-fuel", "resources-stateBytes", "resources-outputEvents"]],
    ["duplicate", 1, ["kind"]],
    ["backpressure", 2, ["policy", "reason"]],
    ["failed", 1, ["reason", "transition", "stateDigest", "resources",
      "resources-fuel", "resources-stateBytes", "resources-outputEvents"]],
  ] as const) {
    const control = byName.get(`decision-${kind}-control`)!;
    expect(results.get(control.name)).toMatchObject({digest: control.expected});
    for (const path of paths) {
      const name = `decision-${kind}-${path}-missing`;
      const missing = byName.get(name)!;
      const root = missing.value as {digest: string; entries: {decision: Record<string, unknown>}[]};
      const intact = control.value as typeof root;
      const keys = path.split("-");
      let absent: Record<string, unknown> = root.entries[index]!.decision;
      let original: Record<string, unknown> = intact.entries[index]!.decision;
      for (const key of keys.slice(0, -1)) {
        absent = absent[key] as Record<string, unknown>;
        original = original[key] as Record<string, unknown>;
      }
      const field = keys.at(-1)!;
      expect(Object.hasOwn(original, field)).toBe(true);
      expect(Object.hasOwn(absent, field)).toBe(false);
      const restored = structuredClone(root);
      let destination: Record<string, unknown> = restored.entries[index]!.decision;
      for (const key of keys.slice(0, -1)) destination = destination[key] as Record<string, unknown>;
      destination[field] = original[field];
      restored.digest = intact.digest;
      expect(restored).toEqual(intact);
      expect(root.digest).not.toBe(intact.digest);
      // With kind absent from an accepted row, its other keys become unknown
      // before the parser can report the missing discriminator.
      const code = kind === "accepted" && path === "kind" ? "EVENT_LOOP_UNKNOWN_KEY" : "EVENT_LOOP_PARSE";
      expect(results.get(name)).toEqual({code});
    }
  }
});
