import { expect, test } from "bun:test";
import { clefFixture, fixture } from "../scripts/clef-fixture";
import { asObject, canonicalize, type JsonValue } from "./values";

test("shared offline Clef fixture preserves request, parser and replay identities", async () => {
  const result = asObject(await clefFixture(), "fixture");
  const cases = result.cases as JsonValue[];
  expect(cases).toHaveLength(fixture.cases.length);
  expect(result.invalidImages).toEqual(fixture.invalidImages.map(() => true));
  for (const value of cases) {
    const item = asObject(value, "case");
    expect(canonicalize(item.receipt!)).toBe(canonicalize(item.replay!));
    expect(asObject(item.receipt, "receipt").configurationDigest).toBe(item.configurationDigest);
  }
  const byName = Object.fromEntries(cases.map(value => { const item = asObject(value, "case"); return [String(item.name), item]; }));
  expect(byName["configured-png"]!.cacheIdentity).not.toBe(byName.text!.cacheIdentity);
  expect(byName["configured-png"]!.configurationDigest).not.toBe(byName["configured-data-url"]!.configurationDigest);
  expect(asObject(byName["direct-png"]!.receipt, "receipt").requestDigest).not.toBe(asObject(byName["configured-png"]!.receipt, "receipt").requestDigest);
});
