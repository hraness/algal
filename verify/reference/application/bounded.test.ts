import { expect, test } from "bun:test";
import { CaptureBudget, encodeRecord, jsonSize, LIMITS, utf8Size } from "./bounded";

test("JSON preflight counts escapes, UTF-8, lone surrogates and repeated acyclic values exactly", () => {
  const shared = { key: "\ud800\n\udc00\u0000é🦎" };
  const value = { z: shared, a: [shared, true, false, null, 1, 1.25, 1e20] };
  const encoded = encodeRecord(value);
  expect(utf8Size(encoded)).toBe(Buffer.byteLength(encoded));
  expect(jsonSize(value, LIMITS.recordBytes)).toBe(Buffer.byteLength(encoded) - 1);
  expect(() => encodeRecord(value, Buffer.byteLength(encoded) - 1)).toThrow("encoded record bytes");
});
test("sparse arrays, array extra fields and accessors fail without reading the accessor", () => {
  expect(() => encodeRecord(new Array(1))).toThrow("dense own array data");
  const extra = Object.assign([1], { bad: true });
  expect(() => encodeRecord(extra)).toThrow("array extra field");
  let invoked = false;
  const getter = Object.defineProperty([], "0", { get() { invoked = true; return 1; }, enumerable: true });
  expect(() => encodeRecord(getter)).toThrow("dense own array data");
  expect(invoked).toBe(false);
});
test("negative zero, nonfinite values, cycles, exotic objects and oversized shapes reject", () => {
  for (const value of [-0, NaN, Infinity, undefined, 1n, new Date()]) expect(() => encodeRecord(value)).toThrow();
  const cycle: unknown[] = []; cycle.push(cycle);
  expect(() => encodeRecord(cycle)).toThrow("acyclic JSON object");
  expect(() => encodeRecord(new Array(LIMITS.nodes))).toThrow("array shape");
  let deep: unknown = null;
  for (let i = 0; i < 65; i++) deep = [deep];
  expect(() => encodeRecord(deep)).toThrow("JSON shape");
});
test("capacity is charged before target launch and bounded on both archive and capture", () => {
  const budget = new CaptureBudget();
  expect(budget.beginCommand()).toBe(LIMITS.outputBytes);
  expect(budget.targetCommands).toBe(1);
  budget.capture(LIMITS.outputBytes);
  expect(() => budget.capture(LIMITS.outputBytes + 1)).toThrow("captured output bytes");
  budget.archiveBytes = LIMITS.archiveBytes - LIMITS.failureBytes;
  expect(() => budget.beginCommand()).toThrow("command evidence reservation");
  expect(budget.targetCommands).toBe(1);
  expect(() => budget.reserveFile(1)).toThrow("archive capacity");
});
test("fixed command inventory cannot be extended and final diagnostic capacity is reserved", () => {
  const budget = new CaptureBudget();
  for (let i = 0; i < LIMITS.targetCommands; i++) budget.beginCommand();
  expect(() => budget.beginCommand()).toThrow("target command count");
  budget.retainedFiles = LIMITS.retainedFiles - 1;
  expect(() => budget.reserveFile(0)).toThrow("file inventory");
});
