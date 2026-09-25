import { expect, test } from "bun:test";
import { builtinRegistry } from "./registry";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import { verifyReceipt } from "./verify";
import type { JsonValue } from "./values";

test("pick.v1 treats inherited object members as missing fields", () => {
  const pick = builtinRegistry().get("pick.v1")!.fn;
  for (const field of ["constructor", "toString", "hasOwnProperty", "__proto__"]) expect(pick({ record: {}, field })).toEqual({ value: null });
});

test("pick.v1 preserves own constructor and __proto__ data with ordinary missing/null behavior", () => {
  const pick = builtinRegistry().get("pick.v1")!.fn;
  const record = JSON.parse('{"constructor":"own","__proto__":{"kept":true},"empty":null,"zero":0,"false":false}') as JsonValue;
  expect(pick({ record, field: "constructor" })).toEqual({ value: "own" });
  expect(pick({ record, field: "__proto__" })).toEqual({ value: { kept: true } });
  for (const field of ["empty", "missing"]) expect(pick({ record, field })).toEqual({ value: null });
  expect(pick({ record, field: "zero" })).toEqual({ value: 0 });
  expect(pick({ record, field: "false" })).toEqual({ value: false });
});

test("pick.v1 missing and own prototype-shaped fields execute and replay", async () => {
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:pick-own", name: "Pick own data", cells: [
    { id: "source", kind: "input", outputs: { record: "json", field: "text" } },
    { id: "pick", kind: "fn", fn: "pick.v1" },
  ], edges: [
    { from: { cell: "source", port: "record" }, to: { cell: "pick", port: "record" } },
    { from: { cell: "source", port: "field" }, to: { cell: "pick", port: "field" } },
  ] });
  const cases = [
    { record: {}, field: "constructor", expected: null },
    { record: JSON.parse('{"constructor":"own"}') as JsonValue, field: "constructor", expected: "own" },
    { record: JSON.parse('{"__proto__":{"kept":true}}') as JsonValue, field: "__proto__", expected: { kept: true } },
  ];
  for (const { record, field, expected } of cases) {
    const store = new MemoryStore();
    const receipt = await runOrganism({ manifest, args: { source: { record, field } }, store, fns: builtinRegistry(), executors: [] });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells.pick!.outputs!.value).toEqual(expected);
    expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store)).ok).toBe(true);
  }
});
