import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";
import { parseEventLoopTrace, type EventLoopCode } from "../src/event-loop-contract";
import { eventLoopNotificationDigest } from "../src/event-loop-replay";

type Effects = {requested: number; settled: number; receipts: string[]};
type Trace = {digest: string; entries: Array<{messageDigest: string; decision: {
  outputs: string[]; resources: {fuel: number}; effects: Effects;
}}>};
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
function seal(trace: Trace): Trace {
  const {digest: _old, ...body} = trace;
  trace.digest = hash(body as JsonValue);
  return trace;
}

export type PureEffectVector = {name: string; control: Trace; value: Trace; expected: EventLoopCode};

// The fixture is a valid shape-only trace. Repair its first decision's output
// identity and measured fuel before using it as a replay control.
export async function pureEffectVectors(): Promise<{behavior: unknown; control: Trace; vectors: PureEffectVector[]}> {
  const source: unknown = await Bun.file(new URL("./fixtures/event-loop-contract.json", import.meta.url)).json();
  const behavior: unknown = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
  if (source === null || typeof source !== "object" || !("base" in source)) throw new Error("trace fixture missing");
  parseEventLoopTrace(source.base);
  const control = structuredClone(source.base) as Trace;
  control.entries = control.entries.slice(0, 1);
  const entry = control.entries[0]!;
  entry.decision.resources.fuel = 27;
  entry.decision.outputs[0] = eventLoopNotificationDigest(entry.messageDigest, "increment", 0,
    "counter", "incremented", {amount: 1});
  seal(control);
  parseEventLoopTrace(control);

  const vectors: PureEffectVector[] = [];
  function add(name: string, expected: EventLoopCode, change: (effects: Effects) => void): void {
    const value = structuredClone(control);
    change(value.entries[0]!.decision.effects);
    seal(value);
    vectors.push({name, control, value, expected});
  }
  for (const [count, code] of [[1, "EVENT_LOOP_SEMANTIC"], [64, "EVENT_LOOP_SEMANTIC"],
    [65, "EVENT_LOOP_BOUNDS"]] as const) {
    add(`requested-${count}`, code, (effects) => { effects.requested = count; });
  }
  for (const count of [1, 65]) {
    add(`settled-${count}`, "EVENT_LOOP_BOUNDS", (effects) => { effects.settled = count; });
    add(`receipts-${count}`, "EVENT_LOOP_BOUNDS", (effects) => {
      effects.receipts = Array(count).fill(control.digest);
    });
  }
  add("consistent-1", "EVENT_LOOP_SEMANTIC", (effects) => {
    effects.requested = effects.settled = 1;
    effects.receipts = [control.digest];
  });
  add("consistent-64", "EVENT_LOOP_SEMANTIC", (effects) => {
    effects.requested = effects.settled = 64;
    effects.receipts = Array(64).fill(control.digest);
  });
  if (vectors.length !== 9) throw new Error("pure-effect vector inventory changed");
  return {behavior, control, vectors};
}
