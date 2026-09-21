import { describe, expect, test } from "bun:test";
import { parseApplicationRuntimeProfile, parseApplicationViewSpec, projectApplicationView } from "./application-view";
import { digestCanonical } from "./digest";
import type { ApplicationSnapshot } from "./application";

const ref = (value: unknown) => digestCanonical(value as never);
const snapshot = (): ApplicationSnapshot => {
  const schema = ref("schema"), query = ref("query"), view = ref({contract: "algal.application-view-spec.v1", title: "x", widgets: []}), profile = ref({contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1"}), policy = ref("policy"), manifest = ref("manifest"), memory = ref("memory"), transition = ref("transition");
  const revision = {contract: "algal.application-revision.v1" as const, application: "demo", parent: null, schema, queries: query, views: view, runtimeProfile: profile, evaluationPolicy: policy, capabilityRequirements: [], entrypoints: [{name: "discover", manifest, applicability: query, maxGenerations: 1}]};
  const state = {contract: "algal.application-state.v1" as const, application: "demo", sequence: 0, epoch: 0, revision: ref(revision), memory, previous: null, transition};
  return {digest: ref(state), state, revision, transition: {contract: "algal.application-transition.v1", application: "demo", operation: ref("op"), request: ref("request"), kind: "create", previous: null, revision: ref(revision), memory, intents: [], evidence: [], causedBy: null}};
};

describe("application reflection", () => {
  test("parses only fixed widgets and runtime policy", () => {
    expect(parseApplicationViewSpec({contract: "algal.application-view-spec.v1", title: "Demo", widgets: ["history", "procedures"]}).widgets).toEqual(["history", "procedures"]);
    expect(() => parseApplicationViewSpec({contract: "algal.application-view-spec.v1", title: "Demo", widgets: ["html"]})).toThrow();
    expect(parseApplicationRuntimeProfile({contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1"}).policy).toBe("pure-case-evaluation.v1");
  });
  test("projects one captured state and fences supported actions to it", () => {
    const current = snapshot(), result = ref({contract: "algal.query-result.v1"});
    const view = projectApplicationView({snapshot: current, spec: parseApplicationViewSpec({contract: "algal.application-view-spec.v1", title: "Demo", widgets: ["procedures"]}), applicability: {discover: {status: "supported", queryResult: result}}});
    expect(view.state).toBe(current.digest);
    expect(view.actions).toEqual([{kind: "execute-procedure", expectedState: current.digest, procedure: current.revision.entrypoints[0]!.manifest, queryResult: result}]);
    expect(view.investigations).toEqual([]);
  });
});
