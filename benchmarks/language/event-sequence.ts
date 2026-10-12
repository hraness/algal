import { canonicalize, type JsonValue } from "../../src/values";

// P0 event-vector identity check. Call only after the closed event/schema and
// byte-limit checks: this handles the cross-row condition they cannot detect.
// One vector targets one actor under one checked behavior revision.
type CheckedEvent = {
  source: string;
  sequence: number;
  type: string;
  payload: JsonValue;
};

export class EventSequenceError extends Error {
  readonly code: "EVENT_LOOP_BOUNDS" | "EVENT_LOOP_ID";
  readonly at: readonly (string | number)[];

  constructor(code: "EVENT_LOOP_BOUNDS" | "EVENT_LOOP_ID", at: readonly (string | number)[]) {
    super(`${code} at ${at.join(".")}`);
    this.code = code;
    this.at = at;
  }
}

export function checkEventSequence(events: readonly CheckedEvent[]): { duplicates: number[] } {
  if (events.length < 1 || events.length > 256) {
    throw new EventSequenceError("EVENT_LOOP_BOUNDS", ["events"]);
  }
  const seen = new Map<string, string>();
  const duplicates: number[] = [];
  for (const [index, event] of events.entries()) {
    // Source ids are lower kebab case and sequence numbers are bounded by the
    // caller's schema check. The separator therefore cannot alias either one.
    const key = `${event.source}\0${event.sequence}`;
    const content = canonicalize({ type: event.type, payload: event.payload });
    const previous = seen.get(key);
    if (previous !== undefined) {
      if (previous !== content) {
        throw new EventSequenceError("EVENT_LOOP_ID", ["events", index, "sequence"]);
      }
      duplicates.push(index);
    } else {
      seen.set(key, content);
    }
  }
  return { duplicates };
}
