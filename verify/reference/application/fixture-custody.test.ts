import { expect, test } from "bun:test";
import { FixtureCustody, IntendedUnknown } from "./fixture-custody";
test("ordinary fixture IO failure remains fatal after a product catcher and blocks later effects", async () => {
  const custody = new FixtureCustody(), failure = new Error("synthetic second read failed"); let effects = 0;
  await expect(custody.callback(async () => { effects++; throw failure; })).rejects.toBe(failure);
  expect(() => custody.assertHealthy()).toThrow(failure);
  await expect(custody.callback(async () => { effects++; })).rejects.toBe(failure);
  expect(effects).toBe(1);
});
test("only explicit injected acknowledgment loss may become a modeled unknown result", async () => {
  const custody = new FixtureCustody();
  await expect(custody.callback(async () => { throw new IntendedUnknown(); })).rejects.toBeInstanceOf(IntendedUnknown);
  expect(() => custody.assertHealthy()).not.toThrow();
  await expect(custody.callback(async () => "settled")).resolves.toBe("settled");
});
test("history-total callback bound fails before callback33 can perform an effect", async () => {
  const custody = new FixtureCustody(); let effects = 0;
  for (let n = 0; n < 32; n++) await custody.callback(async () => { effects++; });
  await expect(custody.callback(async () => { effects++; })).rejects.toThrow("total callback count bound");
  expect(effects).toBe(32); expect(() => custody.assertHealthy()).toThrow("total callback count bound");
});
