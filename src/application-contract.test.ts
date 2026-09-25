import { describe, expect, test } from "bun:test";
import {
  applicationJson, getApplicationRecord, parseApplicationHead, parseApplicationRevision,
  parseApplicationState, parseApplicationTransition, parseEpisodeBinding, parseWorkIntent, putApplicationRecord,
} from "./application-contract";
import { digestCanonical } from "./digest";
import { FileStore, MemoryStore } from "./store";

const ref = digestCanonical("fixture");
const revision = () => ({
  contract: "algal.application-revision.v1", application: "workspace", parent: null,
  schema: ref, queries: ref, views: ref, runtimeProfile: ref, evaluationPolicy: ref,
  capabilityRequirements: [], entrypoints: [{name: "discover", manifest: ref, applicability: ref, maxGenerations: 8, capabilities: [], queries: [ref]}],
});
const state = () => ({contract: "algal.application-state.v1", application: "workspace", sequence: 0, epoch: 0, revision: ref, memory: ref, previous: null, transition: ref});

describe("experimental application contract", () => {
  test("closes every envelope and distinguishes digest from application identity", () => {
    const cases: [unknown, (v: unknown) => unknown][] = [
      [revision(), parseApplicationRevision], [state(), parseApplicationState],
      [{contract: "algal.application-head.v1", application: "workspace", state: ref}, parseApplicationHead],
      [{contract: "algal.application-transition.v1", application: "workspace", operation: ref, request: ref, kind: "create", previous: null, revision: ref, memory: ref, intents: [], evidence: [], causedBy: null}, parseApplicationTransition],
      [{contract: "algal.application-intent.v1", application: "workspace", operation: ref, ordinal: 0, kind: "deliver", route: "investigate", message: ref}, parseWorkIntent],
      [{contract: "algal.application-episode.v1", application: "workspace", intent: ref, sourceState: ref, revision: ref, memory: ref, epoch: 0, entrypoint: "discover", manifest: ref, arguments: ref, process: "episode-1", maxGenerations: 1, hostProfile: ref, access: "observe"}, parseEpisodeBinding],
    ];
    for (const [input, parse] of cases) {
      expect(() => parse(input)).not.toThrow();
      expect(() => parse({...input as object, injected: true})).toThrow();
      expect(() => parse({...input as object, application: "../../escape"})).toThrow();
    }
    expect(() => parseApplicationHead({contract: "algal.application-head.v1", application: "workspace", state: ref.slice(7)})).toThrow();
    const transition = {contract: "algal.application-transition.v1", application: "workspace", operation: ref, request: ref, kind: "propose", previous: ref, revision: ref, memory: ref, intents: [], evidence: [ref], causedBy: null};
    expect(parseApplicationTransition(transition).kind).toBe("propose");
    expect(() => parseApplicationTransition({...transition, kind: "generate"})).toThrow("transition kind");
  });
  test("bounds records, sequence, epoch, collections, and unique stable names", () => {
    expect(() => applicationJson("x".repeat(262145))).toThrow();
    let deep: unknown = null;
    for (let i = 0; i < 26; i++) deep = [deep];
    expect(() => applicationJson(deep)).toThrow();
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    expect(() => applicationJson(cyclic)).toThrow();
    expect(() => applicationJson({number: NaN})).toThrow();
    expect(() => parseApplicationState({...state(), sequence: 1})).toThrow();
    expect(() => parseApplicationState({...state(), epoch: 1})).toThrow();
    expect(() => parseApplicationState({...state(), sequence: 4096, previous: ref})).toThrow();
    expect(() => parseApplicationRevision({...revision(), entrypoints: []})).toThrow();
    expect(() => parseApplicationRevision({...revision(), entrypoints: [...revision().entrypoints, ...revision().entrypoints]})).toThrow();
    expect(() => parseApplicationRevision({...revision(), capabilityRequirements: ["write", "read"]})).toThrow();
    expect(() => parseApplicationRevision({...revision(), entrypoints: [{...revision().entrypoints[0], maxGenerations: 65}]})).toThrow();
  });
  test("copies input before asynchronous publication and checks CAS identity and record kind", async () => {
    const store = new MemoryStore(), input = revision();
    const pending = putApplicationRecord(store, input);
    input.entrypoints[0]!.name = "changed";
    const address = await pending;
    expect((await getApplicationRecord(store, address, parseApplicationRevision)).entrypoints[0]!.name).toBe("discover");
    await expect(getApplicationRecord(store, address, parseApplicationState)).rejects.toThrow();
    await expect(getApplicationRecord(store, ref, parseApplicationRevision)).rejects.toMatchObject({ code: "PARSE_FAILED", uncertain: false });
    const corrupt = Object.create(store) as MemoryStore;
    corrupt.getValue = async () => applicationJson(revision());
    await expect(getApplicationRecord(corrupt, ref, parseApplicationRevision)).rejects.toMatchObject({ code: "DIGEST_MISMATCH", uncertain: false });
  });
  test("binds overridden FileStore results and parses the admitted copy", async () => {
    class OverriddenStore extends FileStore {
      override async getValue() { return applicationJson(revision()); }
    }
    // No filesystem operation is performed by this deliberately overridden read.
    await expect(getApplicationRecord(new OverriddenStore("/unused"), ref, parseApplicationRevision))
      .rejects.toMatchObject({ code: "DIGEST_MISMATCH", uncertain: false });
    const input = revision(), address = digestCanonical(applicationJson(input));
    const store = new MemoryStore(); store.getValue = async () => input;
    const parsed = await getApplicationRecord(store, address, value => {
      input.entrypoints[0]!.name = "changed-after-admission";
      return parseApplicationRevision(value);
    });
    expect(parsed.entrypoints[0]!.name).toBe("discover");
  });
});
