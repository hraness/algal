import { describe, expect, test } from "bun:test";
import { digestCanonical } from "./digest";
import { parseMemoryFrontier, parseMemoryProcedure, parseMemoryResourceVersion, parseMemoryScope, parseMemorySchema } from "./application-memory";

const ref = digestCanonical("memory-fixture");

describe("application memory records", () => {
  test("keeps resource versions and scopes closed", () => {
    expect(parseMemoryResourceVersion({kind: "store", reference: ref})).toEqual({kind: "store", reference: ref});
    expect(parseMemoryResourceVersion({kind: "file", sha256: "a".repeat(64)})).toEqual({kind: "file", sha256: "a".repeat(64)});
    expect(() => parseMemoryResourceVersion({kind: "file", sha256: "a".repeat(64), reference: ref})).toThrow();
    expect(() => parseMemorySchema({contract: "algal.application-memory-schema.v1", relations: [{name: "available", arity: 2, extra: true}]})).toThrow();
    expect(parseMemoryFrontier({contract: "algal.application-memory-frontier.v1", application: "workspace", previous: null, sequence: 0, mutation: null, status: "settled"}).sequence).toBe(0);
  });
  test("requires complete dependency coverage for a procedure", () => {
    const procedure = parseMemoryProcedure({contract: "algal.application-memory-procedure.v1", id: "discover", schema: ref, manifest: ref, decoder: ref, dependencies: ["tool"], prerequisite: null});
    expect(procedure.dependencies).toEqual(["tool"]);
    expect(() => parseMemoryScope({contract: "algal.application-memory-scope.v1", application: "workspace", environment: "dev", task: "t1", frontier: ref, bindings: [], completeFor: [ref], attestation: ref})).not.toThrow();
  });
});
