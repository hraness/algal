import { expect, test } from "bun:test";
import { digestCanonical } from "./digest";
import type { JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { replayEventLoopTrace } from "./event-loop-replay";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";
import { pureEffectVectors } from "../scripts/event-loop-pure-effect-vectors";

test("pure effect counts stop at zero in shape, structural join and replay", async () => {
  const {behavior, control, vectors} = await pureEffectVectors();
  expect(vectors).toHaveLength(9);
  expect(new Set(vectors.map(({name}) => name)).size).toBe(vectors.length);
  expect(control.entries).toHaveLength(1);
  expect(control.entries[0]!.decision.effects).toEqual({requested: 0, settled: 0, receipts: []});
  expect(parseEventLoopTrace(control).digest).toBe(control.digest);
  expect(verifyEventLoopTraceStructure(control, behavior).digest).toBe(control.digest);
  expect(replayEventLoopTrace(control, behavior)).toMatchObject({digest: control.digest,
    summary: {accepted: 1, effectsRequestedClaimed: 0, effectsSettledClaimed: 0}});
  for (const {name, value, expected} of vectors) {
    const effects = value.entries[0]!.decision.effects;
    if (name.startsWith("receipts-") || name.startsWith("consistent-")) {
      const count = Number(name.split("-")[1]);
      expect(effects.receipts, name).toHaveLength(count);
      expect(effects.receipts.every((receipt) => receipt === control.digest), name).toBe(true);
    }
    const {digest: _claimed, ...body} = value;
    expect(value.digest, name).toBe(digestCanonical(body as JsonValue));
    const restored = structuredClone(value);
    restored.entries[0]!.decision.effects = structuredClone(control.entries[0]!.decision.effects);
    restored.digest = control.digest;
    expect(restored, name).toEqual(control);
    expect(value.digest, name).not.toBe(control.digest);
    for (const check of [
      () => parseEventLoopTrace(value),
      () => verifyEventLoopTraceStructure(value, behavior),
      () => replayEventLoopTrace(value, behavior),
    ]) expect(check, name).toThrow(new EventLoopContractError(expected));
  }
});
