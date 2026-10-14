import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError } from "./event-loop-contract";
import { summarizeEventLoopTrace } from "./event-loop-summary";
import { traceFieldVectors } from "../scripts/event-loop-trace-field-vectors";

const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

test("trace-field controls and extra keys isolate the claimed refusal", () => {
  const vectors = traceFieldVectors();
  expect(vectors).toHaveLength(28);
  expect(new Set(vectors.map(({name}) => name)).size).toBe(vectors.length);
  for (const {name, control, value, expected, extra} of vectors) {
    const {digest: _oldControl, ...controlBody} = control;
    const {digest: _old, ...body} = value;
    expect(control.digest, name).toBe(hash(controlBody as JsonValue));
    expect(value.digest, name).toBe(hash(body as JsonValue));
    expect(summarizeEventLoopTrace(control).digest, name).toBe(control.digest);
    if (extra) {
      const at = (root: Record<string, unknown>): Record<string, unknown> =>
        extra.path.reduce((current, part) => current[part] as Record<string, unknown>, root);
      expect(Object.hasOwn(at(control), extra.key), name).toBe(false);
      expect(Object.hasOwn(at(value), extra.key), name).toBe(true);
      const restored = structuredClone(value);
      delete at(restored)[extra.key];
      restored.digest = control.digest;
      expect(restored, name).toEqual(control);
    }
    if (expected) {
      expect(value.digest, name).not.toBe(control.digest);
      expect(() => summarizeEventLoopTrace(value), name)
        .toThrow(new EventLoopContractError(expected as EventLoopContractError["code"]));
    } else {
      expect(summarizeEventLoopTrace(value).digest, name).toBe(value.digest);
    }
  }
});

test("shape-only actor, transition, backpressure reason and output boundaries", () => {
  const vectors = new Map(traceFieldVectors().map((vector) => [vector.name, vector]));
  for (const path of ["actor", "entries.0.decision.transition", "entries.2.decision.reason"] as const) {
    const name = path === "actor" ? "actor-id" : path.includes("transition") ? "transition-id" : "backpressure-reason";
    for (const length of [64, 65] as const) {
      const root = vectors.get(`${name}-at-${length}`)!.value;
      const field = path.split(".").reduce((value, key) => value[key], root) as string;
      expect(Buffer.byteLength(field, "utf8"), `${name}-${length}`).toBe(length);
    }
  }
  const actor = vectors.get("actor-id-at-64")!.value;
  const entry = actor.entries[0];
  expect(entry.eventDigest).toBe(hash({behavior: actor.behavior, actor: actor.actor,
    source: entry.source, sequence: entry.sequence, type: entry.type, payload: entry.payload}));
  expect(entry.messageDigest).toBe(hash({event: entry.eventDigest, target: actor.actor, delivery: entry.delivery}));
  for (const length of [64, 65] as const) {
    const root = vectors.get(`outputs-at-${length}`)!.value;
    expect(root.limits.maxOutputEvents).toBe(64);
    expect(root.entries[0].decision.outputs).toHaveLength(length);
    expect(root.entries[0].decision.resources.outputEvents).toBe(length);
  }
});
