/* eslint-disable @typescript-eslint/no-explicit-any -- Redigested field omissions in a pinned behavior. */
import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError } from "./event-loop-contract";
import { summarizeEventLoopBehavior } from "./event-loop-behavior";

const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
function seal(value: any): void {
  const {digest: _old, ...body} = value;
  value.digest = `sha256:${createHash("sha256").update(canonicalize(body as JsonValue)).digest("hex")}`;
}

// A missing key must be the only edit to a valid behavior, not a stale-digest
// refusal. Restoring it must reproduce the original behavior and its digest.
test("required behavior fields refuse after rehashing, with an intact control", () => {
  const control = summarizeEventLoopBehavior(pinned, "counter");
  expect(control.digest).toBe(pinned.digest);
  const paths = [
    ["contract"],
    ...(["maxEventBytes", "maxStateBytes", "maxOutputEvents", "maxTransitionFuel", "maxMailboxDepth"] as const)
      .map((field) => ["limits", field] as const),
    ["events", 2, "id"], ["events", 2, "payload", "fields", 0, "type"],
    ["actors", 0, "id"], ["actors", 0, "state", "fields", 0, "type"],
    ["actors", 0, "transitions", 0, "outputs", 0, "kind"],
  ] as const;
  for (const path of paths) {
    const missing = structuredClone(pinned);
    let parent: any = missing;
    for (const part of path.slice(0, -1)) parent = parent[part];
    const key = path.at(-1)!;
    expect(Object.hasOwn(parent, key)).toBe(true);
    const original = parent[key];
    delete parent[key];
    seal(missing);
    expect(missing.digest).not.toBe(pinned.digest);
    expect(() => summarizeEventLoopBehavior(missing, "counter"))
      .toThrow(new EventLoopContractError("EVENT_LOOP_PARSE"));
    parent[key] = original;
    seal(missing);
    expect(missing).toEqual(pinned);
    expect(summarizeEventLoopBehavior(missing, "counter")).toEqual(control);
  }
});

test("unknown behavior limit refuses after rehashing, without changing the control", () => {
  const extra = structuredClone(pinned);
  extra.limits.timeout = 1;
  seal(extra);
  expect(extra.digest).not.toBe(pinned.digest);
  expect(() => summarizeEventLoopBehavior(extra, "counter"))
    .toThrow(new EventLoopContractError("EVENT_LOOP_UNKNOWN_KEY"));
  delete extra.limits.timeout;
  seal(extra);
  expect(extra).toEqual(pinned);
});
