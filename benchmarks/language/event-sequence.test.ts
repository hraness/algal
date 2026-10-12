import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { canonicalize, type JsonValue } from "../../src/values";
import { checkEventSequence, EventSequenceError } from "./event-sequence";

type CheckedEvent = { source: string; sequence: number; type: string; payload: JsonValue };

const fixture = JSON.parse(await readFile(`${import.meta.dir}/actors/echo.events.json`, "utf8")) as {
  events: CheckedEvent[];
  digest: string;
};
const first = fixture.events[0]!;

function conflict(events: CheckedEvent[], index: number): void {
  try {
    checkEventSequence(events);
    throw new Error("conflicting sequence was accepted");
  } catch (error) {
    if (!(error instanceof EventSequenceError)) throw error;
    expect(error.code).toBe("EVENT_LOOP_ID");
    expect(error.at).toEqual(["events", index, "sequence"]);
  }
}

test("one actor's source/sequence is bound to type and payload, even after rehashing", () => {
  expect(checkEventSequence(fixture.events)).toEqual({ duplicates: [] });
  const changedPayload = [...fixture.events, { ...first, payload: { amount: 4 } }];
  const changedType = [...fixture.events, { ...first, type: "reset", payload: {} }];
  for (const events of [changedPayload, changedType]) {
    // A whole-vector digest can be recomputed for either changed event. It
    // cannot authorize reusing an already bound logical-event key.
    const digest = `sha256:${createHash("sha256").update(canonicalize({
      contract: "algal.event-loop.events.v1", actor: "counter", events,
    })).digest("hex")}`;
    expect(digest).not.toBe(fixture.digest);
    conflict(events, fixture.events.length);
  }
});

test("identical redelivery is a duplicate, while another source or sequence is distinct", () => {
  expect(checkEventSequence([...fixture.events, { ...first, payload: { amount: 2 } }])).toEqual({ duplicates: [3] });
  expect(checkEventSequence([...fixture.events, { ...first, source: "other-source" }])).toEqual({ duplicates: [] });
  expect(checkEventSequence([...fixture.events, { ...first, sequence: 3 }])).toEqual({ duplicates: [] });
  // Each vector is scoped to one actor and behavior revision; another actor's
  // independent vector cannot inherit this vector's seen-event set.
  expect(checkEventSequence([{ ...first, payload: { amount: 4 } }])).toEqual({ duplicates: [] });
  const a = { source: "fixture", sequence: 0, type: "json", payload: { a: 1, b: 2 } };
  expect(checkEventSequence([a, { ...a, payload: { b: 2, a: 1 } }])).toEqual({ duplicates: [1] });
});

test("identity check retains the event-vector count bound", () => {
  for (const events of [[], Array.from({ length: 257 }, (_, sequence) => ({ ...first, sequence }))]) {
    try {
      checkEventSequence(events);
      throw new Error("out-of-range vector was accepted");
    } catch (error) {
      if (!(error instanceof EventSequenceError)) throw error;
      expect(error.code).toBe("EVENT_LOOP_BOUNDS");
      expect(error.at).toEqual(["events"]);
    }
  }
  expect(checkEventSequence([first])).toEqual({ duplicates: [] });
  expect(checkEventSequence(Array.from({ length: 256 }, (_, sequence) => ({ ...first, sequence }))).duplicates).toEqual([]);
});
