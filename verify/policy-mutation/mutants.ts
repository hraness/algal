/**
 * Policy-mutation catalog for the `policy-mutation` suite (Phase 15).
 *
 * Every entry mutates ONE decision-relevant input of the
 * `algal.application-host.v1` surface — a policy-record field, a host
 * constructor option (deployed authority), or a consumed context row
 * (command/intent/scope/observation/dispatch record/channel file) — then a
 * named probe re-runs the production decision. Expected outcomes are typed:
 * construction reject, decision reject (substring of the thrown message or
 * denial record's reason), an admitted decision whose normalized payload
 * changed, a flip (a widening mutant admits what the base policy denied),
 * or a documented survivor.
 *
 * Survivors are contractual boundaries, not escapes: they pin where the
 * contract deliberately does not consult a field (see `survivor` on each
 * entry and SCOPE.md).
 */
import { capabilityHandle } from "../../src/capabilities";
import type { Digest } from "../../src/digest";
import type { JsonValue } from "../../src/values";
import type {
  HostOptions, LiteWorld, PolicyFixture,
} from "./harness";
import {
  APPLICATION, ENVIRONMENT, FOREIGN_APPLICATION, FOREIGN_PROFILE, ref,
} from "./harness";

/** Decision surfaces exercised by the catalog. */
export type ProbeId =
  | "identity"
  | "current-frontier"
  | "commit-create"
  | "commit-create-research"
  | "commit-memory"
  | "commit-deliver"
  | "commit-episode"
  | "commit-activate"
  | "commit-activate-selection"
  | "commit-restore"
  | "commit-migrate"
  | "admit-deliver"
  | "admit-deliver-alerts"
  | "admit-episode"
  | "validate-scope"
  | "scope-mint"
  | "validate-memory"
  | "decode-raw"
  | "decode-receipted"
  | "exec-deliver"
  | "exec-episode"
  | "exec-reconcile"
  | "dispatch-pending"
  | "dispatch-reconcile"
  | "research-verify"
  | "research-activate";

export type MutantClass =
  | "envelope"          // contract tag, closed-shape, and bound guards
  | "identifier"        // application/route/entrypoint identifier fields
  | "reference"         // digest/reference well-formedness
  | "order"             // sorted-and-unique row invariants
  | "allowlist"         // route/decoder/scope membership mutations
  | "authority"         // identity, profile, engine, verifier, option authority
  | "attestation"       // scope-attestation contract requirements
  | "binding"           // raw↔receipt binding contracts
  | "stale"             // stale/divergent digests and parent states
  | "command"           // command/revision context fields
  | "intent"            // work-intent fields
  | "evidence"          // evidence citation mutations
  | "channel"           // durable channel file mutations
  | "engine"            // query-engine identity/option mutations
  | "scope"             // scope-record field mutations
  | "reconciliation"    // recorded-plan replay boundaries
  | "canonicalization"; // wire-representation non-mutations

export type ProbeOutcome =
  | { outcome: "reject"; at: "construct" | "decision"; code: string; message: string }
  | { outcome: "admit"; detail: JsonValue };

export type MutantExpect =
  | { kind: "reject"; at: "construct" | "decision"; part: string }
  | { kind: "admit"; change: "different" | "same" }
  | { kind: "flip"; from: "reject"; to: "admit" }
  | { kind: "identity"; admission: "same" | "different"; configuration: "same" | "different" };

export interface ProbeEnv {
  readonly fx: PolicyFixture;
  /** The world the probe runs against: `fx.lite` unless the mutant declared
   *  `ownWorld` (a parallel world minted under the mutated policy). */
  world: LiteWorld;
  /** The mutated `algal.application-host.v1` input (a JSON value; mutants
   *  may replace it wholesale, including with non-objects). */
  policy: JsonValue;
  options: HostOptions;
  ctx: Record<string, unknown>;
}

export type MutantTarget =
  | "policy" | "option" | "command" | "intent" | "evidence"
  | "scope" | "observation" | "dispatch" | "channel" | "seam";

export interface PolicyMutant {
  readonly id: string;
  readonly field: string;
  readonly class: MutantClass;
  readonly target: MutantTarget;
  readonly summary: string;
  readonly probe: ProbeId;
  readonly mutate: (env: ProbeEnv) => void | Promise<void>;
  readonly expect: MutantExpect;
  /** Declared effect on the constructed host's admission identity:
   *  "identity" — `identity` changes; "configuration" — `identity` is
   *  preserved while `configurationDigest` rebinds; "none" — both
   *  unchanged. Checked whenever the mutant constructs. */
  readonly identityEffect?: "identity" | "configuration" | "none";
  /** Rebuild `env.world` under the mutated policy before probing — needed
   *  when the decision must run over the mutant's own admitted evidence. */
  readonly ownWorld?: boolean;
  /** Contractual survivor rationale — REQUIRED when `expect` is
   *  `admit/same` (the mutation provably does not change the decision). */
  readonly survivor?: string;
}

const p = (env: ProbeEnv): Record<string, JsonValue> => env.policy as Record<string, JsonValue>;
const c = (env: ProbeEnv): Record<string, unknown> => env.ctx;
const policyRows = (env: ProbeEnv, key: string): Record<string, JsonValue>[] =>
  (p(env)[key] as JsonValue[]).map(row => row as Record<string, JsonValue>);

const FOREIGN_DIGEST = ref({ contract: "algal.probe-foreign.v1" });
const FOREIGN_HANDLE = capabilityHandle("mailbox-send", "foreign-policy");

const construct = (part: string) => ({ kind: "reject", at: "construct", part }) as const;
const deny = (part: string) => ({ kind: "reject", at: "decision", part }) as const;
const change = { kind: "admit", change: "different" } as const;
const flip = { kind: "flip", from: "reject", to: "admit" } as const;

export const MUTANTS: PolicyMutant[] = [
  // ----------------------------------------------------------------
  // Envelope + field-type mutants: the closed bounded parser must fail
  // closed before any decision runs (construction rejects).
  // ----------------------------------------------------------------
  {
    id: "policy-contract-v2", field: "contract", class: "envelope", target: "policy",
    summary: "unknown forward policy version must not admit",
    probe: "commit-memory",
    mutate: env => { p(env)["contract"] = "algal.application-host.v2"; },
    expect: construct("Expected algal.application-host.v1"),
  },
  {
    id: "policy-contract-v0", field: "contract", class: "envelope", target: "policy",
    summary: "unknown legacy policy version must not admit",
    probe: "commit-memory",
    mutate: env => { p(env)["contract"] = "algal.application-host.v0"; },
    expect: construct("Expected algal.application-host.v1"),
  },
  {
    id: "policy-contract-nonstring", field: "contract", class: "envelope", target: "policy",
    summary: "non-string contract tag must not admit",
    probe: "commit-memory",
    mutate: env => { p(env)["contract"] = 1; },
    expect: construct("Expected algal.application-host.v1"),
  },
  {
    id: "policy-nonobject-array", field: "(document)", class: "envelope", target: "policy",
    summary: "array-shaped policy input must not admit",
    probe: "commit-memory",
    mutate: env => { env.policy = []; },
    expect: construct("Expected application object"),
  },
  {
    id: "policy-nonobject-scalar", field: "(document)", class: "envelope", target: "policy",
    summary: "scalar policy input must not admit",
    probe: "commit-memory",
    mutate: env => { env.policy = 42; },
    expect: construct("Expected application object"),
  },
  {
    id: "policy-field-missing-decoders", field: "decoders", class: "envelope", target: "policy",
    summary: "required row withheld at admission",
    probe: "commit-memory",
    mutate: env => { delete p(env)["decoders"]; },
    expect: construct("Unknown or missing application field"),
  },
  {
    id: "policy-field-missing-frontier", field: "frontier", class: "envelope", target: "policy",
    summary: "required frontier withheld at admission",
    probe: "commit-memory",
    mutate: env => { delete p(env)["frontier"]; },
    expect: construct("Unknown or missing application field"),
  },
  {
    id: "policy-field-missing-attestation", field: "attestation", class: "envelope", target: "policy",
    summary: "required attestation field withheld at admission",
    probe: "commit-memory",
    mutate: env => { delete p(env)["attestation"]; },
    expect: construct("Unknown or missing application field"),
  },
  {
    id: "policy-field-extra", field: "(unknown-keys)", class: "envelope", target: "policy",
    summary: "extra key cannot smuggle authority past the closed schema",
    probe: "commit-memory",
    mutate: env => { p(env)["executor"] = FOREIGN_HANDLE; },
    expect: construct("Unknown or missing application field"),
  },
  {
    id: "policy-bound-bytes", field: "(bounds)", class: "envelope", target: "policy",
    summary: "record byte bound fires before field admission",
    probe: "commit-memory",
    mutate: env => { p(env)["attestation"] = "x".repeat(300_000); },
    expect: construct("Application byte bound exceeded"),
  },
  {
    id: "policy-bound-depth", field: "(bounds)", class: "envelope", target: "policy",
    summary: "structure depth bound fires before field admission",
    probe: "commit-memory",
    mutate: env => {
      let deep: JsonValue = "leaf";
      for (let i = 0; i < 30; i++) deep = [deep];
      p(env)["routes"] = deep;
    },
    expect: construct("Application structure bound exceeded"),
  },
  {
    id: "policy-application-invalid", field: "application", class: "identifier", target: "policy",
    summary: "uppercase application id is not an admitted identifier",
    probe: "commit-memory",
    mutate: env => { p(env)["application"] = "Workspace"; },
    expect: construct("Invalid application identifier"),
  },
  {
    id: "policy-frontier-nondigest", field: "frontier", class: "reference", target: "policy",
    summary: "frontier must be a well-formed digest reference",
    probe: "commit-memory",
    mutate: env => { p(env)["frontier"] = "sha256:XYZ"; },
    expect: construct("must be a sha256:<64 lowercase hex> digest"),
  },
  {
    id: "policy-hostprofile-nondigest", field: "hostProfile", class: "reference", target: "policy",
    summary: "hostProfile must be a well-formed digest reference",
    probe: "commit-memory",
    mutate: env => { p(env)["hostProfile"] = "profile"; },
    expect: construct("must be a sha256:<64 lowercase hex> digest"),
  },
  {
    id: "policy-episodeaccess-invalid", field: "episodeAccess", class: "envelope", target: "policy",
    summary: "episodeAccess admits only the two declared modes",
    probe: "commit-memory",
    mutate: env => { p(env)["episodeAccess"] = "admin"; },
    expect: construct("Invalid episode access"),
  },
  {
    id: "policy-episodeaccess-null", field: "episodeAccess", class: "envelope", target: "policy",
    summary: "withheld episodeAccess must not default to a permissive mode",
    probe: "commit-memory",
    mutate: env => { p(env)["episodeAccess"] = null; },
    expect: construct("Invalid episode access"),
  },
  {
    id: "policy-routes-nonlist", field: "routes", class: "envelope", target: "policy",
    summary: "routes must be a bounded list",
    probe: "commit-memory",
    mutate: env => { p(env)["routes"] = { inbox: true }; },
    expect: construct("Application list bound exceeded"),
  },
  {
    id: "policy-routes-overbound", field: "routes", class: "envelope", target: "policy",
    summary: "route allowlist is bounded at 16 rows",
    probe: "commit-memory",
    mutate: env => {
      p(env)["routes"] = Array.from({ length: 17 }, (_, i) => ({
        route: `route-${String(i).padStart(2, "0")}`, recipient: FOREIGN_HANDLE, hostProfile: FOREIGN_PROFILE,
      }));
    },
    expect: construct("Application list bound exceeded"),
  },
  {
    id: "policy-routes-unsorted", field: "routes", class: "order", target: "policy",
    summary: "route rows must be sorted and unique",
    probe: "commit-memory",
    mutate: env => {
      p(env)["routes"] = [
        { route: "inbox", recipient: FOREIGN_HANDLE, hostProfile: FOREIGN_PROFILE },
        { route: "alerts", recipient: FOREIGN_HANDLE, hostProfile: FOREIGN_PROFILE },
      ];
    },
    expect: construct("Host routes must be sorted and unique"),
  },
  {
    id: "policy-routes-duplicate", field: "routes", class: "order", target: "policy",
    summary: "duplicate route rows cannot widen authority",
    probe: "commit-memory",
    mutate: env => {
      const row = policyRows(env, "routes")[0]!;
      p(env)["routes"] = [row, row];
    },
    expect: construct("Host routes must be sorted and unique"),
  },
  {
    id: "policy-route-extra-key", field: "routes[].*", class: "envelope", target: "policy",
    summary: "route rows are closed objects",
    probe: "commit-memory",
    mutate: env => { policyRows(env, "routes")[0]!["note"] = "extra"; },
    expect: construct("Unknown or missing application field"),
  },
  {
    id: "policy-route-missing-key", field: "routes[].hostProfile", class: "envelope", target: "policy",
    summary: "route rows cannot withhold the bound profile",
    probe: "commit-memory",
    mutate: env => { delete policyRows(env, "routes")[0]!["hostProfile"]; },
    expect: construct("Unknown or missing application field"),
  },
  {
    id: "policy-route-id-invalid", field: "routes[].route", class: "identifier", target: "policy",
    summary: "route identifiers share the bounded identifier grammar",
    probe: "commit-memory",
    mutate: env => { policyRows(env, "routes")[0]!["route"] = "Inbox"; },
    expect: construct("Invalid application identifier"),
  },
  {
    id: "policy-route-recipient-plain", field: "routes[].recipient", class: "authority", target: "policy",
    summary: "a plain string cannot substitute for a mailbox-send capability handle",
    probe: "commit-memory",
    mutate: env => { policyRows(env, "routes")[0]!["recipient"] = "mailbox-send:anywhere"; },
    expect: construct("capability handle"),
  },
  {
    id: "policy-route-recipient-wrong-class", field: "routes[].recipient", class: "authority", target: "policy",
    summary: "a capability of another class cannot supply delivery authority",
    probe: "commit-memory",
    mutate: env => {
      policyRows(env, "routes")[0]!["recipient"] = capabilityHandle("mailbox-read", "policy-mutation");
    },
    expect: construct("carries mailbox-read, expected mailbox-send"),
  },
  {
    id: "policy-route-hostprofile-nondigest", field: "routes[].hostProfile", class: "reference", target: "policy",
    summary: "route hostProfile must be a well-formed digest reference",
    probe: "commit-memory",
    mutate: env => { policyRows(env, "routes")[0]!["hostProfile"] = "x"; },
    expect: construct("must be a sha256:<64 lowercase hex> digest"),
  },
  {
    id: "policy-decoders-overbound", field: "decoders", class: "envelope", target: "policy",
    summary: "decoder allowlist is bounded at 16 rows",
    probe: "commit-memory",
    mutate: env => {
      p(env)["decoders"] = Array.from({ length: 17 }, (_, i) => ({
        decoder: ref({ n: i }), rawContract: `algal.raw-${i}.v1`,
        receiptContract: "algal.probe-receipt.v1", receiptBinding: "names-raw",
      })).sort((a, b) => (a.decoder < b.decoder ? -1 : 1));
    },
    expect: construct("Application list bound exceeded"),
  },
  {
    id: "policy-decoders-unsorted", field: "decoders", class: "order", target: "policy",
    summary: "decoder rows must be sorted and unique",
    probe: "commit-memory",
    mutate: env => {
      const rows = policyRows(env, "decoders");
      p(env)["decoders"] = [rows[1]!, rows[0]!];
    },
    expect: construct("Host decoder policies must be sorted and unique"),
  },
  {
    id: "policy-decoders-duplicate", field: "decoders", class: "order", target: "policy",
    summary: "duplicate decoder rows cannot widen authority",
    probe: "commit-memory",
    mutate: env => {
      const row = policyRows(env, "decoders")[0]!;
      p(env)["decoders"] = [row, row];
    },
    expect: construct("Host decoder policies must be sorted and unique"),
  },
  {
    id: "policy-decoder-extra-key", field: "decoders[].*", class: "envelope", target: "policy",
    summary: "decoder rows are closed objects",
    probe: "commit-memory",
    mutate: env => { policyRows(env, "decoders")[0]!["fallback"] = "any"; },
    expect: construct("Unknown or missing application field"),
  },
  {
    id: "policy-decoder-nondigest", field: "decoders[].decoder", class: "reference", target: "policy",
    summary: "decoder row identity must be a well-formed digest reference",
    probe: "commit-memory",
    mutate: env => { policyRows(env, "decoders")[0]!["decoder"] = "decoder"; },
    expect: construct("must be a sha256:<64 lowercase hex> digest"),
  },
  {
    id: "policy-decoder-rawcontract-empty", field: "decoders[].rawContract", class: "envelope", target: "policy",
    summary: "empty raw contract is not an admitted contract name",
    probe: "commit-memory",
    mutate: env => { policyRows(env, "decoders")[0]!["rawContract"] = ""; },
    expect: construct("Invalid host policy text"),
  },
  {
    id: "policy-decoder-rawcontract-oversized", field: "decoders[].rawContract", class: "envelope", target: "policy",
    summary: "raw contract text is bounded at 128 characters",
    probe: "commit-memory",
    mutate: env => { policyRows(env, "decoders")[0]!["rawContract"] = "a".repeat(129); },
    expect: construct("Invalid host policy text"),
  },
  {
    id: "policy-decoder-rawcontract-nul", field: "decoders[].rawContract", class: "envelope", target: "policy",
    summary: "contract text rejects NUL bytes",
    probe: "commit-memory",
    mutate: env => { policyRows(env, "decoders")[0]!["rawContract"] = "algal.x.v1\0"; },
    expect: construct("Invalid host policy text"),
  },
  {
    id: "policy-decoder-binding-invalid", field: "decoders[].receiptBinding", class: "envelope", target: "policy",
    summary: "receiptBinding admits only the two declared modes",
    probe: "commit-memory",
    mutate: env => { policyRows(env, "decoders")[0]!["receiptBinding"] = "names-both"; },
    expect: construct("Invalid receipt binding mode"),
  },
  {
    id: "policy-attestation-nonstring", field: "attestation", class: "envelope", target: "policy",
    summary: "attestation contract must be a string or null",
    probe: "commit-memory",
    mutate: env => { p(env)["attestation"] = 7; },
    expect: construct("Invalid host policy text"),
  },
  {
    id: "policy-attestation-oversized", field: "attestation", class: "envelope", target: "policy",
    summary: "attestation contract text is bounded",
    probe: "commit-memory",
    mutate: env => { p(env)["attestation"] = "a".repeat(129); },
    expect: construct("Invalid host policy text"),
  },

  // ----------------------------------------------------------------
  // Policy-record decision mutants: the record parses but must deny or
  // observably change the probed decision. Every entry also declares the
  // admission-identity effect it must have.
  // ----------------------------------------------------------------
  {
    id: "application-renamed-commit", field: "application", class: "authority", target: "policy",
    summary: "a policy minted for another application denies every commit",
    probe: "commit-memory",
    mutate: env => { p(env)["application"] = FOREIGN_APPLICATION; },
    expect: deny("belongs to another application"),
    identityEffect: "identity",
  },
  {
    id: "application-renamed-dispatch", field: "application", class: "authority", target: "policy",
    summary: "the foreign-application fence fires on dispatch admission too",
    probe: "admit-deliver",
    mutate: env => { p(env)["application"] = FOREIGN_APPLICATION; },
    expect: deny("belongs to another application"),
    identityEffect: "identity",
  },
  {
    id: "application-renamed-scope", field: "application", class: "authority", target: "policy",
    summary: "cross-application scope is refused at scope validation",
    probe: "validate-scope",
    mutate: env => { p(env)["application"] = FOREIGN_APPLICATION; },
    expect: deny("Cross-application scope"),
    identityEffect: "identity",
  },
  {
    id: "application-renamed-frontier", field: "application", class: "authority", target: "policy",
    summary: "frontier service refuses another application",
    probe: "current-frontier",
    mutate: env => { p(env)["application"] = FOREIGN_APPLICATION; },
    expect: deny("Frontier requested for another application"),
    identityEffect: "identity",
  },
  {
    id: "application-renamed-memory", field: "application", class: "authority", target: "policy",
    summary: "a stored world minted under one policy admits nothing under a renamed application",
    probe: "validate-memory",
    mutate: env => { p(env)["application"] = FOREIGN_APPLICATION; },
    expect: deny("Cross-application scope"),
    identityEffect: "identity",
  },
  {
    id: "frontier-moved-current", field: "frontier", class: "authority", target: "policy",
    summary: "moving the attested frontier changes the served selection",
    probe: "current-frontier",
    mutate: env => { p(env)["frontier"] = env.fx.lite.records.frontier1; },
    expect: change,
    identityEffect: "configuration",
  },
  {
    id: "frontier-moved-identity", field: "frontier", class: "authority", target: "policy",
    summary: "frontier rebinds the dispatcher configuration, never the admission identity",
    probe: "identity",
    mutate: env => { p(env)["frontier"] = env.fx.lite.records.frontier1; },
    expect: { kind: "identity", admission: "same", configuration: "different" },
    identityEffect: "configuration",
    survivor: "the frontier is the movable attested selection: excluded from the admission identity, bound in configurationDigest",
  },
  {
    id: "frontier-moved-memory", field: "frontier", class: "authority", target: "policy",
    summary: "a moved frontier does not re-mint host authority over admitted observations",
    probe: "validate-memory",
    mutate: env => { p(env)["frontier"] = env.fx.lite.records.frontier1; },
    expect: { kind: "admit", change: "same" },
    identityEffect: "configuration",
    survivor: "observation admission binds host.identity, which excludes frontier — the same authority serves a new selection; frontier freshness is MEM-02's surface, not identity",
  },
  {
    id: "hostprofile-swapped-episode", field: "hostProfile", class: "authority", target: "policy",
    summary: "episode bindings echo the policy's host profile",
    probe: "admit-episode",
    ownWorld: true,
    mutate: env => { p(env)["hostProfile"] = FOREIGN_PROFILE; },
    expect: change,
    identityEffect: "identity",
  },
  {
    id: "hostprofile-swapped-deliver", field: "hostProfile", class: "authority", target: "policy",
    summary: "delivery plans echo the route row's profile, not the policy's",
    probe: "admit-deliver",
    mutate: env => { p(env)["hostProfile"] = FOREIGN_PROFILE; },
    expect: { kind: "admit", change: "same" },
    identityEffect: "identity",
    survivor: "route.hostProfile carries the delivery binding; the policy-level hostProfile is consulted only on episode plans — the delivery plan is provably unchanged",
  },
  {
    id: "hostprofile-swapped-memory", field: "hostProfile", class: "authority", target: "policy",
    summary: "observations admitted under H admit nothing under a different profile identity",
    probe: "validate-memory",
    mutate: env => { p(env)["hostProfile"] = FOREIGN_PROFILE; },
    expect: deny("Unadmitted observation authority"),
    identityEffect: "identity",
  },
  {
    id: "episodeaccess-external", field: "episodeAccess", class: "authority", target: "policy",
    summary: "widened episode access is written into every episode binding the mutant host admits",
    probe: "admit-episode",
    ownWorld: true,
    mutate: env => { p(env)["episodeAccess"] = "external-write"; },
    expect: change,
    identityEffect: "identity",
  },
  {
    id: "route-dropped", field: "routes", class: "allowlist", target: "policy",
    summary: "an emptied route allowlist denies delivery admission",
    probe: "admit-deliver",
    mutate: env => { p(env)["routes"] = []; },
    expect: deny("Host policy denies this route"),
    identityEffect: "identity",
  },
  {
    id: "route-renamed", field: "routes[].route", class: "allowlist", target: "policy",
    summary: "renaming the only route forfeits admission on the old name",
    probe: "admit-deliver",
    mutate: env => { policyRows(env, "routes")[0]!["route"] = "alerts"; },
    expect: deny("Host policy denies this route"),
    identityEffect: "identity",
  },
  {
    id: "route-added", field: "routes", class: "allowlist", target: "policy",
    summary: "a widened route allowlist admits what the base policy denied",
    probe: "admit-deliver-alerts",
    mutate: env => {
      p(env)["routes"] = [
        { route: "alerts", recipient: FOREIGN_HANDLE, hostProfile: FOREIGN_PROFILE },
        ...policyRows(env, "routes"),
      ];
    },
    expect: flip,
    identityEffect: "identity",
  },
  {
    id: "route-recipient-swapped", field: "routes[].recipient", class: "authority", target: "policy",
    summary: "the admitted delivery binds the policy row's capability handle exactly",
    probe: "admit-deliver",
    mutate: env => { policyRows(env, "routes")[0]!["recipient"] = FOREIGN_HANDLE; },
    expect: change,
    identityEffect: "identity",
  },
  {
    id: "route-hostprofile-swapped", field: "routes[].hostProfile", class: "authority", target: "policy",
    summary: "the admitted delivery binds the route row's host profile exactly",
    probe: "admit-deliver",
    mutate: env => { policyRows(env, "routes")[0]!["hostProfile"] = FOREIGN_PROFILE; },
    expect: change,
    identityEffect: "identity",
  },
  {
    id: "attestation-renamed", field: "attestation", class: "attestation", target: "policy",
    summary: "a scope attestation minted under another contract is refused",
    probe: "validate-scope",
    mutate: env => { p(env)["attestation"] = "algal.foreign-attestation.v1"; },
    expect: deny("Scope attestation is not the admitted contract"),
    identityEffect: "identity",
  },
  {
    id: "attestation-renamed-memory", field: "attestation", class: "attestation", target: "policy",
    summary: "the attestation fence holds through the composed memory path",
    probe: "validate-memory",
    mutate: env => { p(env)["attestation"] = "algal.foreign-attestation.v1"; },
    expect: deny("Scope attestation is not the admitted contract"),
    identityEffect: "identity",
  },
  {
    id: "attestation-null", field: "attestation", class: "attestation", target: "policy",
    summary: "a policy with no required attestation contract admits a foreign attestation",
    probe: "validate-scope",
    mutate: env => {
      p(env)["attestation"] = null;
      c(env)["attestation"] = env.fx.lite.records.attestationForeignRecord;
    },
    expect: flip,
    identityEffect: "identity",
  },
  {
    id: "decoder-dropped", field: "decoders", class: "allowlist", target: "policy",
    summary: "a narrowed decoder allowlist denies the removed decoder",
    probe: "decode-raw",
    mutate: env => {
      p(env)["decoders"] = policyRows(env, "decoders").filter(row => row["decoder"] !== env.fx.lite.records.decoder);
    },
    expect: deny("Host policy denies this decoder"),
    identityEffect: "identity",
  },
  {
    id: "decoder-swapped-foreign", field: "decoders[].decoder", class: "allowlist", target: "policy",
    summary: "a decoder digest that was never admitted cannot decode",
    probe: "decode-raw",
    mutate: env => {
      const rows = policyRows(env, "decoders");
      rows.find(r => r["decoder"] === env.fx.lite.records.decoder)!["decoder"] = env.fx.lite.records.decoderForeign;
      p(env)["decoders"] = rows.sort((a, b) => (a["decoder"] as string) < (b["decoder"] as string) ? -1 : 1);
    },
    expect: deny("Host policy denies this decoder"),
    identityEffect: "identity",
  },
  {
    id: "decoders-emptied", field: "decoders", class: "allowlist", target: "policy",
    summary: "an emptied decoder allowlist denies all decode admission",
    probe: "decode-raw",
    mutate: env => { p(env)["decoders"] = []; },
    expect: deny("Host policy denies this decoder"),
    identityEffect: "identity",
  },
  {
    id: "decoder-rawcontract-renamed", field: "decoders[].rawContract", class: "binding", target: "policy",
    summary: "the decoder row's raw contract is binding at decode time",
    probe: "decode-raw",
    mutate: env => {
      policyRows(env, "decoders").find(r => r["decoder"] === env.fx.lite.records.decoder)!["rawContract"] = "algal.other-raw.v1";
    },
    expect: deny("Raw evidence is not the admitted contract"),
    identityEffect: "identity",
  },
  {
    id: "decoder-rawcontract-renamed-memory", field: "decoders[].rawContract", class: "binding", target: "policy",
    summary: "a decoder-policy change re-mints admission identity, so the stored world is un-admittable under it",
    probe: "validate-memory",
    mutate: env => {
      policyRows(env, "decoders").find(r => r["decoder"] === env.fx.lite.records.decoder)!["rawContract"] = "algal.other-raw.v1";
    },
    expect: deny("Unadmitted observation authority"),
    identityEffect: "identity",
  },
  {
    id: "decoder-receiptcontract-renamed", field: "decoders[].receiptContract", class: "binding", target: "policy",
    summary: "the decoder row's receipt contract is binding at decode time",
    probe: "decode-raw",
    mutate: env => {
      policyRows(env, "decoders").find(r => r["decoder"] === env.fx.lite.records.decoder)!["receiptContract"] = "algal.other-receipt.v1";
    },
    expect: deny("Receipt does not bind the raw evidence"),
    identityEffect: "identity",
  },
  {
    id: "decoder-binding-raw-to-receipt", field: "decoders[].receiptBinding", class: "binding", target: "policy",
    summary: "names-raw evidence cannot satisfy a names-receipt binding",
    probe: "decode-raw",
    mutate: env => { policyRows(env, "decoders").find(r => r["decoder"] === env.fx.lite.records.decoder)!["receiptBinding"] = "names-receipt"; },
    expect: deny("Receipt does not bind the raw evidence"),
    identityEffect: "identity",
  },
  {
    id: "decoder-binding-receipt-to-raw", field: "decoders[].receiptBinding", class: "binding", target: "policy",
    summary: "names-receipt evidence cannot satisfy a names-raw binding",
    probe: "decode-receipted",
    mutate: env => { policyRows(env, "decoders").find(r => r["decoder"] === env.fx.lite.records.decoder2)!["receiptBinding"] = "names-raw"; },
    expect: deny("Receipt does not bind the raw evidence"),
    identityEffect: "identity",
  },
  {
    id: "policy-key-order", field: "(document)", class: "canonicalization", target: "policy",
    summary: "object member order on the wire carries no authority",
    probe: "identity",
    mutate: env => {
      const record = p(env);
      env.policy = Object.fromEntries(Object.entries(record).reverse()) as Record<string, JsonValue>;
    },
    expect: { kind: "identity", admission: "same", configuration: "same" },
    survivor: "canonical identity binds the semantic document, not member order — canonicalization is VAL-04's surface",
  },
  {
    id: "options-excluded-from-identity", field: "(options)", class: "authority", target: "option",
    summary: "host options are deployed authority outside the admitted record",
    probe: "identity",
    mutate: env => {
      env.options.restorationPolicy = env.fx.restorationPolicy;
      env.options.selectionEnvironment = ENVIRONMENT;
      env.options.researchVerifier = env.fx.research.verifierV;
    },
    expect: { kind: "identity", admission: "same", configuration: "same" },
    survivor: "admission identity and dispatcher configuration bind the policy record only; option authority is pinned by the decision gates it opens (restoration/selection/research mutants below)",
  },

  // ----------------------------------------------------------------
  // Host-option mutants: deployed authority the record cannot mint.
  // ----------------------------------------------------------------
  {
    id: "engine-withheld-commit", field: "options.memoryEngine", class: "authority", target: "option",
    summary: "episode commit admission fails closed without an explicit engine",
    probe: "commit-episode",
    mutate: env => { delete env.options.memoryEngine; },
    expect: deny("Episode admission requires an explicit memory query engine"),
    identityEffect: "none",
  },
  {
    id: "engine-withheld-dispatch", field: "options.memoryEngine", class: "authority", target: "option",
    summary: "episode dispatch admission fails closed without an explicit engine",
    probe: "admit-episode",
    mutate: env => { delete env.options.memoryEngine; },
    expect: deny("Episode admission requires an explicit memory query engine"),
    identityEffect: "none",
  },
  {
    id: "engine-withheld-commit-memory", field: "options.memoryEngine", class: "authority", target: "option",
    summary: "memory commits never consult the episode engine",
    probe: "commit-memory",
    mutate: env => { delete env.options.memoryEngine; },
    expect: { kind: "admit", change: "same" },
    identityEffect: "none",
    survivor: "the query engine is consulted only by episode applicability reproduction — non-episode commits admit identically",
  },
  {
    id: "engine-swapped-commit", field: "options.memoryEngine", class: "engine", target: "option",
    summary: "an engine of another identity cannot reproduce the admitted derivation",
    probe: "commit-episode",
    mutate: env => { env.options.memoryEngine = env.fx.engineB; },
    expect: deny("Execution requires reproduced supported applicability evidence"),
    identityEffect: "none",
  },
  {
    id: "engine-swapped-dispatch", field: "options.memoryEngine", class: "engine", target: "option",
    summary: "an honest engine of another identity replans episodes identically",
    probe: "admit-episode",
    mutate: env => { env.options.memoryEngine = env.fx.engineB; },
    expect: { kind: "admit", change: "same" },
    identityEffect: "none",
    survivor: "dispatch admission reruns the configured engine for truth (status+verified); engine provenance binds the derivation record, which is exactly what the commit-side evidence citation denies on swap",
  },
  {
    id: "restoration-withheld", field: "options.restorationPolicy", class: "authority", target: "option",
    summary: "a stored restoration policy grants nothing without host opt-in",
    probe: "commit-restore",
    mutate: env => { delete env.options.restorationPolicy; },
    expect: deny("Host policy denies restoration"),
    identityEffect: "none",
  },
  {
    id: "restoration-foreign-application", field: "options.restorationPolicy", class: "authority", target: "option",
    summary: "a restoration policy for another application fails at construction",
    probe: "commit-restore",
    mutate: env => { env.options.restorationPolicy = env.fx.restorationPolicyForeign; },
    expect: construct("Restoration policy belongs to another application"),
  },
  {
    id: "selection-env-withheld", field: "options.selectionEnvironment", class: "authority", target: "option",
    summary: "selection policy evidence grants nothing without a named environment",
    probe: "commit-activate-selection",
    mutate: env => { delete env.options.selectionEnvironment; },
    expect: deny("Host policy denies selection policy"),
    identityEffect: "none",
  },
  {
    id: "selection-env-foreign", field: "options.selectionEnvironment", class: "authority", target: "option",
    summary: "a named environment with no policy row still denies",
    probe: "commit-activate-selection",
    mutate: env => { env.options.selectionEnvironment = "other-env"; },
    expect: deny("Selection policy has no row for this environment"),
    identityEffect: "none",
  },
  {
    id: "research-verifier-withheld", field: "options.researchVerifier", class: "authority", target: "option",
    summary: "sealed-research runtime requires the explicit trusted verifier",
    probe: "commit-create-research",
    mutate: env => { delete env.options.researchVerifier; },
    expect: deny("requires a pinned policy and explicit trusted verifier"),
    identityEffect: "none",
  },
  {
    id: "research-verifier-foreign", field: "options.researchVerifier", class: "authority", target: "option",
    summary: "a verifier whose identity is not the pinned evaluator denies",
    probe: "commit-create-research",
    mutate: env => { env.options.researchVerifier = env.fx.research.verifierV2; },
    expect: deny("Research verifier differs from the pinned evaluator"),
    identityEffect: "none",
  },

  // ----------------------------------------------------------------
  // Context mutants: malformed/withheld rows and stale digests on the
  // inputs the host consumes.
  // ----------------------------------------------------------------
  {
    id: "command-application-foreign", field: "command.application", class: "command", target: "command",
    summary: "a command naming another application denies",
    probe: "commit-memory",
    mutate: env => { (c(env)["command"] as { application: string }).application = FOREIGN_APPLICATION; },
    expect: deny("belongs to another application"),
  },
  {
    id: "command-revision-foreign-app", field: "revision.application", class: "command", target: "command",
    summary: "a revision naming another application denies",
    probe: "commit-memory",
    mutate: env => { (c(env)["revision"] as { application: string }).application = FOREIGN_APPLICATION; },
    expect: deny("belongs to another application"),
  },
  {
    id: "command-kind-propose", field: "command.kind", class: "command", target: "command",
    summary: "a propose transition without an incumbent denies",
    probe: "commit-create",
    mutate: env => { (c(env)["command"] as { kind: string }).kind = "propose"; },
    expect: deny("Proposal requires an incumbent"),
  },
  {
    id: "command-memory-missing", field: "command.memory", class: "stale", target: "command",
    summary: "a withheld memory row fails closed",
    probe: "commit-memory",
    mutate: env => { (c(env)["command"] as { memory: Digest }).memory = FOREIGN_DIGEST; },
    expect: deny("Missing or changed application record"),
  },
  {
    id: "command-memory-foreign-schema", field: "command.memory", class: "command", target: "command",
    summary: "a memory snapshot under another schema denies",
    probe: "commit-memory",
    mutate: env => { (c(env)["command"] as { memory: Digest }).memory = env.fx.lite.records.memoryForeignSchema; },
    expect: deny("Memory incompatible with application revision schema"),
  },
  {
    id: "command-memory-bad-predecessor", field: "command.memory", class: "stale", target: "command",
    summary: "a memory successor that skips the current snapshot denies",
    probe: "commit-memory",
    mutate: env => { (c(env)["command"] as { memory: Digest }).memory = env.fx.lite.records.memoryBadPredecessor; },
    expect: deny("must preserve the current snapshot as its predecessor"),
  },
  {
    id: "revision-manifest-missing", field: "revision.entrypoints[].manifest", class: "stale", target: "command",
    summary: "a revision citing a withheld manifest fails closed",
    probe: "commit-create",
    mutate: env => {
      const command = c(env)["command"] as { revision: Digest };
      command.revision = env.fx.lite.records.revisionForeignManifest;
      c(env)["revision"] = env.fx.lite.records.revisionForeignManifestParsed;
    },
    expect: deny("Entrypoint manifest is missing"),
  },
  {
    id: "revision-view-widened", field: "revision.entrypoints[].queries", class: "authority", target: "command",
    summary: "an entrypoint memory view outside the revision's query bundle denies",
    probe: "commit-memory",
    mutate: env => {
      const revision = c(env)["revision"] as { entrypoints: { queries: Digest[] }[] };
      revision.entrypoints[0]!.queries = [...revision.entrypoints[0]!.queries, FOREIGN_DIGEST].sort();
    },
    expect: deny("exceeds the revision's queries"),
  },
  {
    id: "episode-memory-mismatch", field: "command.memory", class: "stale", target: "command",
    summary: "an episode intent against a stale memory selection denies",
    probe: "commit-episode",
    mutate: env => { (c(env)["command"] as { memory: Digest }).memory = env.fx.lite.records.genesisMemory; },
    expect: deny("preserve the current snapshot as its predecessor"),
  },
  {
    id: "episode-revision-mismatch", field: "command.revision", class: "stale", target: "command",
    summary: "an episode intent against a stale revision selection denies",
    probe: "commit-episode",
    mutate: env => {
      const command = c(env)["command"] as { revision: Digest };
      command.revision = env.fx.lite.records.revision2;
      c(env)["revision"] = env.fx.lite.records.revision2Parsed;
    },
    expect: deny("Execution must preserve the selected memory and revision"),
  },
  {
    id: "episode-evidence-withheld", field: "command.evidence", class: "evidence", target: "evidence",
    summary: "episode admission requires the reproduced derivation citation",
    probe: "commit-episode",
    mutate: env => { (c(env)["command"] as { evidence: Digest[] }).evidence = []; },
    expect: deny("reproduced supported applicability evidence"),
  },
  {
    id: "episode-evidence-foreign", field: "command.evidence", class: "evidence", target: "evidence",
    summary: "an unrelated digest cannot substitute for the reproduced derivation",
    probe: "commit-episode",
    mutate: env => { (c(env)["command"] as { evidence: Digest[] }).evidence = [FOREIGN_DIGEST]; },
    expect: deny("reproduced supported applicability evidence"),
  },
  {
    id: "episode-evidence-stale", field: "command.evidence", class: "evidence", target: "evidence",
    summary: "a derivation bound to an older captured state denies at the new head",
    probe: "commit-episode",
    mutate: env => { (c(env)["command"] as { evidence: Digest[] }).evidence = [env.fx.lite.derivationB]; },
    expect: deny("reproduced supported applicability evidence"),
  },
  {
    id: "episode-entrypoint-unknown", field: "intent.entrypoint", class: "intent", target: "intent",
    summary: "unknown intent entrypoint denies — the lifecycle's 'Unknown intent entrypoint' check is the typed fence upstream",
    probe: "commit-episode",
    mutate: env => {
      const command = c(env)["command"] as { intents: { kind: string; entrypoint: string }[] };
      command.intents[0]!.entrypoint = "nope";
    },
    expect: deny("applicability"),
  },
  {
    id: "activate-widen-generations", field: "revision.entrypoints[].maxGenerations", class: "authority", target: "command",
    summary: "a candidate widening the generation budget denies",
    probe: "commit-activate",
    mutate: env => {
      const command = c(env)["command"] as { revision: Digest; evidence: Digest[] };
      command.revision = env.fx.lite.records.revisionWidenGenerations;
      command.evidence = [];
      c(env)["revision"] = env.fx.lite.records.revisionWidenGenerationsParsed;
    },
    expect: deny("widens an entrypoint's budget or authority"),
  },
  {
    id: "activate-widen-capabilities", field: "revision.entrypoints[].capabilities", class: "authority", target: "command",
    summary: "a candidate widening entrypoint capabilities denies",
    probe: "commit-activate",
    mutate: env => {
      const command = c(env)["command"] as { revision: Digest; evidence: Digest[] };
      command.revision = env.fx.lite.records.revisionWidenCapabilities;
      command.evidence = [];
      c(env)["revision"] = env.fx.lite.records.revisionWidenCapabilitiesParsed;
    },
    expect: deny("widens an entrypoint's budget or authority"),
  },
  {
    id: "activate-evidence-missing", field: "command.evidence", class: "evidence", target: "evidence",
    summary: "activation requires reproducibly accepted evaluation evidence",
    probe: "commit-activate",
    mutate: env => { (c(env)["command"] as { evidence: Digest[] }).evidence = []; },
    expect: deny("reproducibly accepted evaluation evidence"),
  },
  {
    id: "activate-evidence-wrong-candidate", field: "command.evidence", class: "evidence", target: "evidence",
    summary: "an accepted evaluation of another candidate cannot install this revision",
    probe: "commit-activate",
    mutate: env => { (c(env)["command"] as { evidence: Digest[] }).evidence = [env.fx.evalM3]; },
    expect: deny("reproducibly accepted candidate revision"),
  },
  {
    id: "activate-stale-evaluation", field: "evaluation.parentState", class: "stale", target: "evidence",
    summary: "evaluation evidence bound to an older state denies at the new head",
    probe: "commit-activate",
    mutate: env => {
      const command = c(env)["command"] as { expectedHead: Digest; memory: Digest };
      c(env)["current"] = env.fx.sA;
      command.expectedHead = env.fx.sA.digest;
      command.memory = env.fx.sA.state.memory;
    },
    expect: deny("Evaluation parent state is stale"),
  },
  {
    id: "activate-policy-mismatch", field: "request.policy", class: "stale", target: "command",
    summary: "evaluation evidence whose policy is not the candidate revision's policy denies",
    probe: "commit-activate",
    mutate: env => {
      const command = c(env)["command"] as { revision: Digest; evidence: Digest[] };
      command.revision = env.fx.revisionForeignPolicy;
      command.evidence = [env.fx.forgedEvaluation];
      c(env)["revision"] = env.fx.revisionForeignPolicyParsed;
    },
    expect: deny("Evaluation policy is not bound to candidate revision"),
  },
  {
    id: "activate-research-evidence-pure", field: "command.evidence", class: "authority", target: "evidence",
    summary: "sealed research evidence cannot attach to a pure-case runtime",
    probe: "commit-activate",
    mutate: env => { (c(env)["command"] as { evidence: Digest[] }).evidence = [env.fx.research.evaluationRef]; },
    expect: deny("Host policy denies research evaluation"),
  },
  {
    id: "migrate-selection-evidence", field: "command.evidence", class: "evidence", target: "evidence",
    summary: "selection policy evidence cannot attach to a migration",
    probe: "commit-migrate",
    mutate: env => { (c(env)["command"] as { evidence: Digest[] }).evidence = [env.fx.selectionPolicy]; },
    expect: deny("Selection policy cannot attach to a migration"),
  },
  {
    id: "migrate-drain-foreign", field: "command.evidence", class: "evidence", target: "evidence",
    summary: "a drain record bound to another application denies",
    probe: "commit-migrate",
    mutate: env => { (c(env)["command"] as { evidence: Digest[] }).evidence = [env.fx.drainForeign]; },
    expect: deny("Drain evidence does not bind this transition"),
  },
  {
    id: "migrate-drain-coverage", field: "command.evidence", class: "evidence", target: "evidence",
    summary: "a drain that does not cover the undispatched set denies",
    probe: "commit-migrate",
    mutate: env => { (c(env)["command"] as { evidence: Digest[] }).evidence = [env.fx.drainCoverage]; },
    expect: deny("Drain dispositions must match the undispatched pending intents"),
  },
  {
    id: "selection-evidence-twice", field: "command.evidence", class: "evidence", target: "evidence",
    summary: "activation admits exactly one selection policy",
    probe: "commit-activate-selection",
    mutate: env => {
      (c(env)["command"] as { evidence: Digest[] }).evidence =
        [env.fx.evalM2, env.fx.selectionPolicy, env.fx.selectionPolicyB].sort();
    },
    expect: deny("exactly one selection policy"),
  },
  {
    id: "selection-policy-foreign", field: "selectionPolicy.application", class: "authority", target: "evidence",
    summary: "a selection policy for another application cannot bind this comparison",
    probe: "commit-activate-selection",
    mutate: env => {
      (c(env)["command"] as { evidence: Digest[] }).evidence =
        [env.fx.evalM2, env.fx.selectionPolicyForeign].sort();
    },
    expect: deny("Selection row comparison does not bind this policy"),
  },
  {
    id: "selection-policy-stale", field: "selectionPolicy.parentState", class: "stale", target: "evidence",
    summary: "a selection policy bound to an older parent denies",
    probe: "commit-activate-selection",
    mutate: env => {
      (c(env)["command"] as { evidence: Digest[] }).evidence =
        [env.fx.evalM2, env.fx.selectionPolicyStale].sort();
    },
    expect: deny("Selection policy parent state is stale"),
  },
  {
    id: "selection-installs-unselected", field: "selectionPolicy.selections[].manifest", class: "authority", target: "command",
    summary: "under a selection environment the revision must install exactly the selected strategy",
    probe: "commit-activate-selection",
    mutate: env => {
      const command = c(env)["command"] as { revision: Digest; evidence: Digest[] };
      command.revision = env.fx.lite.records.revision3;
      command.evidence = [env.fx.evalM3, env.fx.selectionPolicy].sort();
      c(env)["revision"] = env.fx.lite.records.revision3Parsed;
    },
    expect: deny("does not install the selected strategy"),
  },

  {
    id: "restore-evidence-stripped", field: "command.evidence", class: "evidence", target: "evidence",
    summary: "withheld restoration evidence denies at the replay seam",
    probe: "commit-restore",
    mutate: env => { (c(env)["command"] as { evidence: Digest[] }).evidence = []; },
    expect: deny("exactly one restoration record"),
  },
  {
    id: "restore-record-stale-parent", field: "restoration.parentState", class: "stale", target: "evidence",
    summary: "a restoration record bound to another parent denies",
    probe: "commit-restore",
    mutate: env => { (c(env)["command"] as { evidence: Digest[] }).evidence = [env.fx.restorationRecordStaleParent]; },
    expect: deny("Restoration evidence does not bind this transition"),
  },

  // ----------------------------------------------------------------
  // Dispatch-admission mutants (admitDispatch surface).
  // ----------------------------------------------------------------
  {
    id: "intent-application-foreign", field: "intent.application", class: "intent", target: "intent",
    summary: "an intent naming another application denies",
    probe: "admit-deliver",
    mutate: env => { (c(env)["intent"] as { application: string }).application = FOREIGN_APPLICATION; },
    expect: deny("belongs to another application"),
  },
  {
    id: "intent-route-undeclared", field: "intent.route", class: "allowlist", target: "intent",
    summary: "an undeclared route denies even when the policy is intact",
    probe: "admit-deliver",
    mutate: env => { (c(env)["intent"] as { route: string }).route = "alerts"; },
    expect: deny("Host policy denies this route"),
  },
  {
    id: "intent-entrypoint-unknown", field: "intent.entrypoint", class: "intent", target: "intent",
    summary: "an unknown episode entrypoint denies with the typed reason",
    probe: "admit-episode",
    mutate: env => { (c(env)["intent"] as { entrypoint: string }).entrypoint = "nope"; },
    expect: deny("Unknown episode entrypoint"),
  },
  {
    id: "episode-source-stale", field: "snapshot.state.memory", class: "stale", target: "dispatch",
    summary: "an episode whose source memory is no longer selected denies",
    probe: "admit-episode",
    mutate: env => { c(env)["snapshot"] = env.fx.lite.sB; },
    expect: deny("no longer selected"),
  },
  {
    id: "snapshot-application-foreign", field: "snapshot.state.application", class: "stale", target: "dispatch",
    summary: "a snapshot of another application denies",
    probe: "admit-episode",
    mutate: env => {
      const snapshot = structuredClone(env.fx.lite.sC);
      (snapshot.state as { application: string }).application = FOREIGN_APPLICATION;
      c(env)["snapshot"] = snapshot;
    },
    expect: deny("belongs to another application"),
  },
  {
    id: "dispatch-replay-under-dropped-route", field: "previousDispatch.plan", class: "reconciliation", target: "policy",
    summary: "reconciliation replays the recorded plan without re-running the allowlist",
    probe: "admit-deliver",
    mutate: env => {
      p(env)["routes"] = [];
      c(env)["previousDispatch"] = env.fx.dispatchRecordDelivery;
    },
    expect: { kind: "admit", change: "same" },
    survivor: "previousDispatch is the recorded plan — replay returns it verbatim; the route allowlist gates only fresh admission, and ApplicationCore.validatePlan fences the replay against the intent",
  },

  // ----------------------------------------------------------------
  // Execution surface: dispatch(), reconcile(), dispatchPending() and the
  // durable channel file.
  // ----------------------------------------------------------------
  {
    id: "exec-foreign-application", field: "intent.application", class: "intent", target: "intent",
    summary: "the execution path refuses another application before any channel write",
    probe: "exec-deliver",
    mutate: env => { (c(env)["intent"] as { application: string }).application = FOREIGN_APPLICATION; },
    expect: deny("belongs to another application"),
  },
  {
    id: "exec-route-dropped-settles", field: "routes", class: "reconciliation", target: "policy",
    summary: "settlement executes the admitted plan; the allowlist is admission-time only",
    probe: "exec-deliver",
    mutate: env => { p(env)["routes"] = []; },
    expect: { kind: "admit", change: "same" },
    survivor: "dispatch() carries a plan already admitted by admitDispatch — it consults the intent, not the allowlist; route authority is enforced at the admission seam, which the sibling admit-deliver mutants kill",
  },
  {
    id: "exec-episode-foreign-application", field: "intent.application", class: "intent", target: "intent",
    summary: "episode execution refuses another application before returning blocked",
    probe: "exec-episode",
    mutate: env => { (c(env)["intent"] as { application: string }).application = FOREIGN_APPLICATION; },
    expect: deny("belongs to another application"),
  },
  {
    id: "dispatch-reconcile-config-changed", field: "frontier", class: "reconciliation", target: "policy",
    summary: "a dispatch recorded under one dispatcher configuration cannot be reconciled under another",
    probe: "dispatch-reconcile",
    mutate: env => { p(env)["frontier"] = env.fx.lite.records.frontier1; },
    expect: deny("Dispatcher configuration changed"),
    identityEffect: "configuration",
  },
  {
    id: "dispatch-pending-route-dropped", field: "routes", class: "allowlist", target: "policy",
    summary: "dispatchPending converts the route denial into a typed admission-denied record",
    probe: "dispatch-pending",
    mutate: env => { p(env)["routes"] = []; },
    expect: deny("denies this route"),
    identityEffect: "identity",
  },
  {
    id: "channel-legacy-v1", field: "channel.contract", class: "channel", target: "channel",
    summary: "a legacy channel file cannot silently grant delivery custody",
    probe: "exec-reconcile",
    mutate: env => {
      c(env)["channelFile"] = {
        contract: "algal.host-channel.v1", route: "inbox",
        outcomes: [env.fx.lite.records.message],
      };
    },
    expect: deny("explicit migration required"),
  },
  {
    id: "channel-route-mismatch", field: "channel.route", class: "channel", target: "channel",
    summary: "a channel file under another route name cannot serve this route",
    probe: "exec-reconcile",
    mutate: env => { (c(env)["channelFile"] as { route: string }).route = "alerts"; },
    expect: deny("Channel route mismatch"),
  },
  {
    id: "channel-duplicate-identity", field: "channel.outcomes", class: "channel", target: "channel",
    summary: "duplicate dispatch identities in a channel deny",
    probe: "exec-reconcile",
    mutate: env => {
      const file = c(env)["channelFile"] as { outcomes: JsonValue[] };
      file.outcomes = [file.outcomes[0]!, file.outcomes[0]!];
    },
    expect: deny("Duplicate channel dispatch identity"),
  },
  {
    id: "channel-over-bound", field: "channel.outcomes", class: "channel", target: "channel",
    summary: "the retained outcome list is bounded (the channel byte bound fires first at this size)",
    probe: "exec-reconcile",
    mutate: env => {
      const file = c(env)["channelFile"] as { outcomes: JsonValue[] };
      file.outcomes = Array.from({ length: 4097 }, (_, i) => ({
        identity: ref({ n: i }), message: env.fx.lite.records.message,
      }));
    },
    expect: deny("bound exceeded"),
  },
  {
    id: "channel-unknown-field", field: "channel.*", class: "channel", target: "channel",
    summary: "channel files are closed objects",
    probe: "exec-reconcile",
    mutate: env => { (c(env)["channelFile"] as Record<string, JsonValue>)["extra"] = true; },
    expect: deny("Unknown or missing channel field"),
  },

  // ----------------------------------------------------------------
  // Scope/observation inputs at the memory admission surface.
  // ----------------------------------------------------------------
  {
    id: "scope-foreign-application", field: "scope.application", class: "scope", target: "scope",
    summary: "a scope naming another application denies",
    probe: "validate-scope",
    mutate: env => { (c(env)["scope"] as { application: string }).application = FOREIGN_APPLICATION; },
    expect: deny("Cross-application scope"),
  },
  {
    id: "scope-attestation-foreign", field: "scope.attestation", class: "attestation", target: "scope",
    summary: "an attestation record under another contract denies",
    probe: "validate-scope",
    mutate: env => { c(env)["attestation"] = env.fx.lite.records.attestationForeignRecord; },
    expect: deny("Scope attestation is not the admitted contract"),
  },
  {
    id: "scope-attestation-withheld", field: "scope.attestation", class: "attestation", target: "scope",
    summary: "a withheld attestation row fails closed, not open",
    probe: "validate-scope",
    mutate: env => { c(env)["attestation"] = null; },
    expect: deny("scope attestation must be an object"),
  },
  {
    id: "scope-frontier-malformed", field: "scope.frontier", class: "stale", target: "scope",
    summary: "a scope citing a malformed frontier lineage fails closed at scope mint",
    probe: "scope-mint",
    mutate: env => {
      (c(env)["scopeInput"] as { frontier: Digest }).frontier = env.fx.lite.records.frontierMalformed;
    },
    expect: deny("Invalid mutation frontier lineage"),
  },
  {
    id: "scope-frontier-foreign", field: "scope.frontier", class: "reconciliation", target: "scope",
    summary: "host scope validation does not re-check the frontier row",
    probe: "validate-scope",
    mutate: env => { c(env)["frontier"] = env.fx.lite.records.frontier1; },
    expect: { kind: "admit", change: "same" },
    survivor: "the host's scope check consults application+attestation only; frontier freshness is the service's usableScope check upstream — the field is deliberately echoed but not consulted here",
  },
  {
    id: "decode-foreign-decoder", field: "observation.decoder", class: "allowlist", target: "observation",
    summary: "a decoder outside the policy allowlist denies",
    probe: "decode-raw",
    mutate: env => { (c(env)["observation"] as { decoder: Digest }).decoder = env.fx.lite.records.decoderForeign; },
    expect: deny("Host policy denies this decoder"),
  },
  {
    id: "decode-raw-contract-mismatch", field: "raw.contract", class: "binding", target: "observation",
    summary: "raw evidence under another contract denies",
    probe: "decode-raw",
    mutate: env => { c(env)["raw"] = { contract: "algal.foreign-raw.v1", claims: [] }; },
    expect: deny("Raw evidence is not the admitted contract"),
  },
  {
    id: "decode-raw-nonobject", field: "raw", class: "binding", target: "observation",
    summary: "non-object raw evidence fails closed",
    probe: "decode-raw",
    mutate: env => { c(env)["raw"] = 42; },
    expect: deny("raw evidence must be an object"),
  },
  {
    id: "decode-raw-claims-bound", field: "raw.claims", class: "binding", target: "observation",
    summary: "the decoded claim list is bounded",
    probe: "decode-raw",
    mutate: async env => { c(env)["raw"] = await env.fx.lite.store.getValue(env.fx.lite.records.rawClaimsBound); },
    expect: deny("Application list bound exceeded"),
  },
  {
    id: "decode-receipt-contract-mismatch", field: "receipt.contract", class: "binding", target: "observation",
    summary: "a receipt under another contract cannot bind the raw evidence",
    probe: "decode-raw",
    mutate: env => { c(env)["receipt"] = { contract: "algal.foreign-receipt.v1", raw: env.fx.lite.records.raw }; },
    expect: deny("Receipt does not bind the raw evidence"),
  },
  {
    id: "decode-receipt-stale-raw", field: "receipt.raw", class: "binding", target: "observation",
    summary: "a receipt naming another raw digest cannot bind this evidence",
    probe: "decode-raw",
    mutate: env => { c(env)["receipt"] = { contract: "algal.probe-receipt.v1", raw: env.fx.lite.records.raw2 }; },
    expect: deny("Receipt does not bind the raw evidence"),
  },
  {
    id: "decode-receipted-binding-mismatch", field: "raw.receipt", class: "binding", target: "observation",
    summary: "names-receipt raw evidence must name the presented receipt",
    probe: "decode-receipted",
    mutate: env => { (c(env)["observation"] as { receipt: Digest }).receipt = env.fx.lite.records.receipt; },
    expect: deny("Receipt does not bind the raw evidence"),
  },
  {
    id: "decode-procedure-foreign", field: "observation.procedure", class: "reconciliation", target: "observation",
    summary: "the host decode consults the decoder row, not the procedure identity",
    probe: "decode-raw",
    mutate: env => { (c(env)["observation"] as { procedure: Digest }).procedure = env.fx.lite.records.procedureForeign; },
    expect: { kind: "admit", change: "same" },
    survivor: "procedure↔decoder binding is the service's check (`input.decoder !== procedure.decoder` upstream); the host's decoder row deliberately carries no procedure field",
  },
  {
    id: "decode-application-foreign", field: "observation.application", class: "reconciliation", target: "observation",
    summary: "the host decode does not re-check the observation's application",
    probe: "decode-raw",
    mutate: env => { (c(env)["observation"] as { application: string }).application = FOREIGN_APPLICATION; },
    expect: { kind: "admit", change: "same" },
    survivor: "decodeObservation is deliberately application-agnostic; the cross-application fence is validateScope, which the service runs before decode",
  },

  // ----------------------------------------------------------------
  // Research seam: evaluator-sealed evidence under a foreign or lying
  // verifier does not transfer.
  // ----------------------------------------------------------------
  {
    id: "research-verify-under-v2", field: "options.researchVerifier", class: "authority", target: "seam",
    summary: "an evaluation admitted under verifier V does not transfer under V'",
    probe: "research-verify",
    mutate: env => { env.options.researchVerifier = env.fx.research.verifierV2; },
    expect: deny("differs from the pinned evaluator"),
  },
  {
    id: "research-verify-lying", field: "options.researchVerifier", class: "authority", target: "seam",
    summary: "a verifier whose seal check fails denies even under the right identity",
    probe: "research-verify",
    mutate: env => { env.options.researchVerifier = env.fx.research.verifierLiar; },
    expect: deny("seal or evaluator evidence did not verify"),
  },
  {
    id: "research-verify-absent", field: "options.researchVerifier", class: "authority", target: "seam",
    summary: "no verifier object means no research authority at all",
    probe: "research-verify",
    mutate: env => { delete env.options.researchVerifier; },
    expect: deny("explicit trusted verifier"),
  },
  {
    id: "research-verify-stale-state", field: "request.parentState", class: "stale", target: "seam",
    summary: "research evaluation bound to another state is stale",
    probe: "research-verify",
    mutate: env => { c(env)["expectedState"] = env.fx.lite.genesis.digest; },
    expect: deny("Research evaluation is stale"),
  },
  {
    id: "research-activate-under-v2", field: "options.researchVerifier", class: "authority", target: "seam",
    summary: "the host's research-activation call site refuses the foreign verifier",
    probe: "research-activate",
    mutate: env => { env.options.researchVerifier = env.fx.research.verifierV2; },
    expect: deny("differs from the pinned evaluator"),
  },
];

// FIELD_LEDGER — every security-relevant field on the mutated surface,
// with the mutants that cover it or the reason it is declared instead.
export interface FieldLedgerRow {
  readonly field: string;
  readonly surface: "policy" | "option" | "context" | "channel" | "seam";
  /** "admission" — consulted and decision-relevant; "echo" — echoed into
   *  plans/bindings but its consultation boundary is pinned; "excluded" —
   *  deliberately not covered by this lane. */
  readonly kind: "admission" | "echo" | "excluded";
  readonly coveredBy: readonly string[];
  readonly note: string;
}

export const FIELD_LEDGER: FieldLedgerRow[] = [
  { field: "contract", surface: "policy", kind: "admission",
    coveredBy: ["policy-contract-v2", "policy-contract-v0", "policy-contract-nonstring"],
    note: "exact tag; unknown versions reject before any decision" },
  { field: "(document)", surface: "policy", kind: "admission",
    coveredBy: ["policy-nonobject-array", "policy-nonobject-scalar", "policy-key-order"],
    note: "closed object shape; member order is canonicalization only" },
  { field: "(unknown-keys)", surface: "policy", kind: "admission",
    coveredBy: ["policy-field-extra"],
    note: "extra keys cannot smuggle authority" },
  { field: "(missing-fields)", surface: "policy", kind: "admission",
    coveredBy: ["policy-field-missing-decoders", "policy-field-missing-frontier", "policy-field-missing-attestation"],
    note: "required rows withheld at admission reject" },
  { field: "(bounds)", surface: "policy", kind: "admission",
    coveredBy: ["policy-bound-bytes", "policy-bound-depth"],
    note: "record byte/depth bounds fire before field admission" },
  { field: "application", surface: "policy", kind: "admission",
    coveredBy: ["application-renamed-commit", "application-renamed-dispatch", "application-renamed-scope", "application-renamed-frontier", "application-renamed-memory", "policy-application-invalid"],
    note: "the admitted application id fences every surface" },
  { field: "frontier", surface: "policy", kind: "admission",
    coveredBy: ["frontier-moved-current", "frontier-moved-identity", "frontier-moved-memory", "policy-frontier-nondigest"],
    note: "movable selection: changes the served frontier and configurationDigest, never the admission identity" },
  { field: "hostProfile", surface: "policy", kind: "echo",
    coveredBy: ["hostprofile-swapped-episode", "hostprofile-swapped-deliver", "hostprofile-swapped-memory", "policy-hostprofile-nondigest"],
    note: "echoed into episode bindings; the delivery plan reads the route row's own profile" },
  { field: "episodeAccess", surface: "policy", kind: "echo",
    coveredBy: ["episodeaccess-external", "policy-episodeaccess-invalid", "policy-episodeaccess-null"],
    note: "echoed into episode bindings; widened access is visible in the plan and re-mints identity" },
  { field: "routes", surface: "policy", kind: "admission",
    coveredBy: ["route-dropped", "route-added", "policy-routes-nonlist", "policy-routes-overbound", "policy-routes-unsorted", "policy-routes-duplicate", "dispatch-pending-route-dropped"],
    note: "delivery allowlist — membership, order, bound, and typed denial record at dispatchPending" },
  { field: "routes[].route", surface: "policy", kind: "admission",
    coveredBy: ["route-renamed", "policy-route-id-invalid"],
    note: "route identifier is the allowlist key" },
  { field: "routes[].recipient", surface: "policy", kind: "admission",
    coveredBy: ["route-recipient-swapped", "policy-route-recipient-plain", "policy-route-recipient-wrong-class"],
    note: "a mailbox-send capability handle, bound exactly into the plan" },
  { field: "routes[].hostProfile", surface: "policy", kind: "echo",
    coveredBy: ["route-hostprofile-swapped", "policy-route-hostprofile-nondigest", "policy-route-missing-key"],
    note: "echoed into the delivery plan" },
  { field: "routes[].*", surface: "policy", kind: "admission",
    coveredBy: ["policy-route-extra-key"],
    note: "route rows are closed objects" },
  { field: "attestation", surface: "policy", kind: "admission",
    coveredBy: ["attestation-renamed", "attestation-renamed-memory", "attestation-null", "policy-attestation-nonstring", "policy-attestation-oversized"],
    note: "the required scope-attestation contract; null removes the check (a widening the ledger pins explicitly)" },
  { field: "decoders", surface: "policy", kind: "admission",
    coveredBy: ["decoder-dropped", "decoders-emptied", "policy-decoders-overbound", "policy-decoders-unsorted", "policy-decoders-duplicate"],
    note: "decoder allowlist — membership, order, bound" },
  { field: "decoders[].decoder", surface: "policy", kind: "admission",
    coveredBy: ["decoder-swapped-foreign", "policy-decoder-nondigest", "decode-foreign-decoder"],
    note: "allowlist identity" },
  { field: "decoders[].rawContract", surface: "policy", kind: "admission",
    coveredBy: ["decoder-rawcontract-renamed", "decoder-rawcontract-renamed-memory", "policy-decoder-rawcontract-empty", "policy-decoder-rawcontract-oversized", "policy-decoder-rawcontract-nul"],
    note: "binds the admitted raw contract at decode" },
  { field: "decoders[].receiptContract", surface: "policy", kind: "admission",
    coveredBy: ["decoder-receiptcontract-renamed"],
    note: "binds the admitted receipt contract" },
  { field: "decoders[].receiptBinding", surface: "policy", kind: "admission",
    coveredBy: ["decoder-binding-raw-to-receipt", "decoder-binding-receipt-to-raw", "policy-decoder-binding-invalid", "decode-receipt-stale-raw", "decode-receipted-binding-mismatch"],
    note: "both binding modes exercised in both directions" },
  { field: "decoders[].*", surface: "policy", kind: "admission",
    coveredBy: ["policy-decoder-extra-key"],
    note: "decoder rows are closed objects" },
  { field: "options.memoryEngine", surface: "option", kind: "admission",
    coveredBy: ["engine-withheld-commit", "engine-withheld-dispatch", "engine-withheld-commit-memory", "engine-swapped-commit", "engine-swapped-dispatch"],
    note: "episode applicability reproduces under this engine; identity is bound in the derivation record" },
  { field: "options.restorationPolicy", surface: "option", kind: "admission",
    coveredBy: ["restoration-withheld", "restoration-foreign-application", "restore-evidence-stripped", "restore-record-stale-parent"],
    note: "stored restoration policy grants nothing without host opt-in" },
  { field: "options.selectionEnvironment", surface: "option", kind: "admission",
    coveredBy: ["selection-env-withheld", "selection-env-foreign", "selection-installs-unselected"],
    note: "selection policy narrows installs only under a named environment" },
  { field: "options.researchVerifier", surface: "option", kind: "admission",
    coveredBy: ["research-verifier-withheld", "research-verifier-foreign", "research-verify-under-v2", "research-verify-lying", "research-verify-absent", "research-activate-under-v2"],
    note: "evaluator-sealed research requires the configured trusted verifier; identity narrowing is pinned both at commit construction and at evaluation replay" },
  { field: "options.channelsDir", surface: "option", kind: "excluded",
    coveredBy: [],
    note: "channel custody root — exercised to its file seam by the channel mutants; filesystem custody invariants are the host-conformance lane's surface" },
  { field: "command.application/kind/memory/revision/evidence", surface: "context", kind: "admission",
    coveredBy: ["command-application-foreign", "command-kind-propose", "command-memory-missing", "command-memory-foreign-schema", "command-memory-bad-predecessor", "episode-memory-mismatch", "episode-revision-mismatch", "episode-evidence-withheld", "episode-evidence-foreign", "episode-evidence-stale"],
    note: "command rows the host re-checks" },
  { field: "revision.application / entrypoints", surface: "context", kind: "admission",
    coveredBy: ["command-revision-foreign-app", "revision-manifest-missing", "revision-view-widened", "activate-widen-generations", "activate-widen-capabilities"],
    note: "revision rows consulted by the host — budget/authority fields included" },
  { field: "intent.application/route/entrypoint", surface: "context", kind: "admission",
    coveredBy: ["intent-application-foreign", "intent-route-undeclared", "intent-entrypoint-unknown", "episode-entrypoint-unknown", "exec-foreign-application", "exec-episode-foreign-application"],
    note: "work-intent fields at dispatch and commit admission" },
  { field: "snapshot/current binding", surface: "context", kind: "admission",
    coveredBy: ["episode-source-stale", "snapshot-application-foreign"],
    note: "the selected-source binding inside admitDispatch" },
  { field: "previousDispatch.plan", surface: "context", kind: "echo",
    coveredBy: ["dispatch-replay-under-dropped-route", "exec-route-dropped-settles", "dispatch-reconcile-config-changed"],
    note: "the recorded plan replays verbatim on reconciliation/settlement — admission is not re-decided" },
  { field: "scope.application/attestation/frontier", surface: "context", kind: "admission",
    coveredBy: ["scope-foreign-application", "scope-attestation-foreign", "scope-attestation-withheld", "scope-frontier-foreign", "scope-frontier-malformed"],
    note: "application and attestation are consulted; frontier is pinned as deliberately un-consulted" },
  { field: "observation.decoder/raw/receipt/procedure/application", surface: "context", kind: "admission",
    coveredBy: ["decode-foreign-decoder", "decode-raw-contract-mismatch", "decode-raw-nonobject", "decode-raw-claims-bound", "decode-receipt-contract-mismatch", "decode-receipt-stale-raw", "decode-receipted-binding-mismatch", "decode-procedure-foreign", "decode-application-foreign"],
    note: "decoder allowlist and raw/receipt binding are consulted; procedure and application are pinned as upstream-owned" },
  { field: "channel file", surface: "channel", kind: "admission",
    coveredBy: ["channel-legacy-v1", "channel-route-mismatch", "channel-duplicate-identity", "channel-over-bound", "channel-unknown-field"],
    note: "the durable channel row read at settle/reconcile" },
  { field: "(host identity / configurationDigest)", surface: "seam", kind: "admission",
    coveredBy: ["frontier-moved-identity", "options-excluded-from-identity", "policy-key-order"],
    note: "admission identity excludes frontier and all host options; configurationDigest binds the full policy record — every policy-record mutant also declares its identityEffect" },
  { field: "evaluation/selection/restoration/drain evidence", surface: "context", kind: "admission",
    coveredBy: ["activate-evidence-missing", "activate-evidence-wrong-candidate", "activate-stale-evaluation", "activate-policy-mismatch", "activate-research-evidence-pure", "migrate-selection-evidence", "migrate-drain-foreign", "migrate-drain-coverage", "selection-evidence-twice", "selection-policy-foreign", "selection-policy-stale", "restore-evidence-stripped", "restore-record-stale-parent"],
    note: "cited evidence is replayed and bound to this exact transition — withheld, stale, foreign, or doubled rows deny" },
  { field: "research evaluation seam (verifier/parentState/revision)", surface: "seam", kind: "admission",
    coveredBy: ["research-verify-under-v2", "research-verify-lying", "research-verify-absent", "research-verify-stale-state", "research-activate-under-v2"],
    note: "the delegated seam the host calls at activation" },
];
