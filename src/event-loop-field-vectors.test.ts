import { expect, test } from "bun:test";
import { eventLoopVectors, tsResults } from "../scripts/event-loop-contract-parity";

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
