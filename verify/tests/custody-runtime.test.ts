import { expect, test } from "bun:test";
import { admitCustodyRuntime } from "../custody/runtime";

const nativeSha256 = "a".repeat(64);
const observed = ["late-selected", "creator-returned", "live-admitted", "late-rejected", "live-returned", "reopened-linear-history", "stale-late-rejected", "live-idempotent"];
function report() {
  return { contract: "algal.custody-test.v1", nativeSha256, profiles: ["bun", "native"].flatMap(creator => ["bun", "native"].flatMap(late => ["bun", "native"].map(live => ({ runtimes: [creator, late, live], ok: true, initial: `sha256:${"1".repeat(64)}`, head: `sha256:${"2".repeat(64)}`, observed })))) };
}

test("custody completion requires all eight exact runtime combinations and every observation", () => {
  expect(() => admitCustodyRuntime(report(), nativeSha256)).not.toThrow();
  for (const alter of [
    (value: ReturnType<typeof report>) => { value.profiles.pop(); },
    (value: ReturnType<typeof report>) => { value.profiles[1] = value.profiles[0]!; },
    (value: ReturnType<typeof report>) => { value.profiles[0]!.ok = false; },
    (value: ReturnType<typeof report>) => { value.profiles[0]!.head = value.profiles[0]!.initial; },
    (value: ReturnType<typeof report>) => { value.profiles[1]!.head = `sha256:${"3".repeat(64)}`; },
    (value: ReturnType<typeof report>) => { value.profiles[0]!.observed = observed.slice(1); },
    (value: ReturnType<typeof report>) => { value.nativeSha256 = "b".repeat(64); },
  ]) {
    const value = report(); alter(value);
    expect(() => admitCustodyRuntime(value, nativeSha256)).toThrow();
  }
});
