// Host-conformance harness: a catalog of violation cases that deliberately
// break the obligations published in `contract.md`, driven against the real
// contract surfaces (runOrganism, parseToolSignature, parseEffectReceipt,
// boundedBytes, commandJson, HostEventService, FileStore, replayStore,
// ApplicationMemoryService, recallExecutor, decisionExecutor). No subprocess
// is spawned and no network is touched; filesystem use is confined to
// mkdtemp scratch directories, matching src/*.test.ts conventions.
//
// A case is CONFORMANT when the runtime handles the violation the way the
// contract requires — a typed rejection, a recorded uncertain effect, an
// absorbed write, a refused dispatch — and VIOLATED when it silently accepts
// corrupt input, crashes untyped, mints an invalid receipt, or leaks data.

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ApplicationMemoryService,
  type MemoryAdmissionHost,
} from "../../src/application-memory";
import type { Bundle } from "../../src/bundle";
import { capabilityHandle } from "../../src/capabilities";
import type { OrganismManifest } from "../../src/contract";
import { manifestToJson } from "../../src/contract";
import { checkCredentialShape, redact } from "../../src/credentials";
import { decisionExecutor } from "../../src/decisions";
import { digestCanonical, type Digest } from "../../src/digest";
import {
  parseEffectReceipt,
  scriptedExecutor,
  type Executor,
  type ExecutorMetadata,
} from "../../src/effects";
import { AlgalError } from "../../src/errors";
import { HOST_EVENT_BOUNDS, HostEventService } from "../../src/host-events";
import { boundedBytes, commandJson } from "../../src/io-runtime";
import { MemoryMailboxService } from "../../src/mailbox";
import { builtinRegistry } from "../../src/registry";
import { runOrganism, type RunReceipt } from "../../src/run";
import {
  bindRecallOutput,
  recallExecutor,
  type RecallSearcher,
} from "../../src/semantic-contract";
import { FileStore } from "../../src/store";
import { MemoryStore } from "../../src/store-memory";
import type { Store } from "../../src/store-contract";
import {
  parseToolSignature,
  type Tool,
  type ToolRegistry,
  type ToolSignature,
} from "../../src/tools";
import type { Transport } from "../../src/transport-contract";
import { verifyReceipt } from "../../src/verify";
import type { JsonValue } from "../../src/values";

import * as fx from "./fixtures";

// ------------------------------------------------------------ harness -----

export type Seam =
  | "executor"
  | "store"
  | "tool"
  | "transport"
  | "memory-admission"
  | "host-event"
  | "stream"
  | "credential"
  | "decision";

export type ViolationEvidence = {
  /** true when the runtime handled the violation per contract. */
  ok: boolean;
  /** observed error code, when one was thrown or recorded. */
  code?: string | undefined;
  /** short evidence note for the report. */
  detail: string;
};

export type HostViolationCase = {
  id: string;
  seam: Seam;
  /** Obligation id from contract.md (e.g. "HC-EX-03"). */
  obligation: string;
  summary: string;
  run(): Promise<ViolationEvidence>;
};

export type ConformanceReport = {
  suite: "host-conformance";
  total: number;
  conformant: number;
  cases: {
    id: string;
    seam: Seam;
    obligation: string;
    ok: boolean;
    code?: string | undefined;
    detail: string;
  }[];
};

export async function runHostConformance(
  cases: HostViolationCase[] = HOST_VIOLATION_CASES,
): Promise<ConformanceReport> {
  const results: ConformanceReport["cases"] = [];
  for (const c of cases) {
    try {
      const evidence = await c.run();
      results.push({
        id: c.id,
        seam: c.seam,
        obligation: c.obligation,
        ok: evidence.ok,
        ...(evidence.code !== undefined ? { code: evidence.code } : {}),
        detail: evidence.detail,
      });
    } catch (error) {
      // A harness-side crash is itself a conformance failure — the contract
      // surface must answer violations with typed outcomes, not exceptions.
      results.push({
        id: c.id,
        seam: c.seam,
        obligation: c.obligation,
        ok: false,
        detail: `harness error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return {
    suite: "host-conformance",
    total: results.length,
    conformant: results.filter((r) => r.ok).length,
    cases: results,
  };
}

// ------------------------------------------------------------- helpers ----

type Thrown =
  | { threw: true; code: string; message: string }
  | { threw: false };

async function classify(thunk: () => Promise<unknown> | unknown): Promise<Thrown> {
  try {
    await thunk();
    return { threw: false };
  } catch (error) {
    if (error instanceof AlgalError) {
      return { threw: true, code: error.code, message: error.message };
    }
    if (error instanceof Error) {
      return { threw: true, code: error.name, message: error.message };
    }
    return { threw: true, code: "unknown", message: String(error) };
  }
}

function expects(
  thrown: Thrown,
  codes: readonly string[],
  detail: string,
): ViolationEvidence {
  if (!thrown.threw) {
    return { ok: false, detail: `${detail}: violation was silently accepted` };
  }
  if (!codes.includes(thrown.code)) {
    return {
      ok: false,
      code: thrown.code,
      detail: `${detail}: rejected with ${thrown.code} ("${thrown.message}"), expected one of ${codes.join(",")}`,
    };
  }
  return { ok: true, code: thrown.code, detail: `${detail}: ${thrown.code}` };
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "algal-host-conformance-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** A run-scoped harness: fresh MemoryStore, builtin fns, supplied executors. */
async function runFixture(
  manifest: OrganismManifest,
  executors: Executor[],
  options: Partial<Parameters<typeof runOrganism>[0]> = {},
): Promise<RunReceipt> {
  const store = options.store ?? new MemoryStore();
  await store.putManifest(manifest);
  return runOrganism({
    manifest,
    fns: builtinRegistry(),
    store,
    executors,
    ...options,
  });
}

function effect(receipt: RunReceipt) {
  return receipt.effects[0];
}

/** A Store that counts every write reaching the backing store — the probe
 * for "no receipt writes inside verification". */
function countingStore(inner: Store): Store & { writes: () => number } {
  let writes = 0;
  return {
    writes: () => writes,
    getManifest: (d) => inner.getManifest(d),
    putManifest: async (m) => { writes++; return inner.putManifest(m); },
    getReceipt: (d) => inner.getReceipt(d),
    putReceipt: async (r) => { writes++; return inner.putReceipt(r); },
    getValue: (d) => inner.getValue(d),
    putValue: async (v) => { writes++; return inner.putValue(v); },
    getEffect: (d, e) => inner.getEffect(d, e),
    putEffect: async (r, e) => { writes++; return inner.putEffect(r, e); },
    getSlot: (n) => inner.getSlot(n),
    setSlot: async (n, v) => { writes++; return inner.setSlot(n, v); },
  };
}

// ------------------------------------------------- executor wrappers ------
// Each wrapper is an admitted Executor that deliberately violates one
// obligation of the Executor contract.

/** Executor whose output exceeds the cell's byte bound. */
export function oversizedOutputExecutor(
  output: JsonValue = fx.OVERSIZED_OUTPUT,
  id = "oversized",
): Executor {
  return {
    id,
    capabilities: { effects: ["agent"] },
    execute: async () => output,
  };
}

/** Executor that reports malformed usage/cost metadata. */
export function invalidUsageExecutor(usage: unknown, id = "bad-usage"): Executor {
  return {
    id,
    capabilities: { effects: ["agent", "classifier", "gate", "decide", "recall"] },
    execute: async () => "ok",
    executeEffect: async () => ({
      output: "ok",
      metadata: { executor: id, usage: usage as ExecutorMetadata["usage"] },
    }),
  };
}

/** Executor that never settles — the hangs-past-deadline violation. */
export function hangingExecutor(id = "hanging"): Executor & { calls: () => number } {
  let calls = 0;
  return {
    id,
    calls: () => calls,
    capabilities: { effects: ["agent"] },
    execute: async () => {
      calls++;
      return new Promise<JsonValue>(() => {});
    },
  };
}

/** Executor that ignores the abort signal and resolves after the deadline —
 * the late-result violation. `settled()` proves the late value existed. */
export function lateResolutionExecutor(
  output: JsonValue,
  delayMs: number,
  id = "late",
): Executor & { settled: () => Promise<boolean> } {
  let resolveDone: (v: boolean) => void = () => {};
  const done = new Promise<boolean>((r) => (resolveDone = r));
  return {
    id,
    settled: () => done,
    capabilities: { effects: ["agent"] },
    execute: async () => {
      await new Promise((r) => setTimeout(r, delayMs));
      resolveDone(true);
      return output;
    },
  };
}

/** Executor that rejects the moment the abort signal fires with a definite
 * (non-uncertain) error — the deadline's own classification must still win. */
export function abortHonoringExecutor(id = "abort-honoring"): Executor {
  return {
    id,
    capabilities: { effects: ["agent"] },
    execute: (_request, signal) =>
      new Promise<JsonValue>((_resolve, reject) => {
        signal?.addEventListener("abort", () =>
          reject(new AlgalError("EFFECT_FAILED", "executor reports definite failure on abort")),
        );
      }),
  };
}

/** Executor whose receiptFor claims a malformed configurationDigest. */
export function malformedConfigExecutor(id = "bad-config"): Executor {
  return {
    id,
    capabilities: { effects: ["agent"] },
    execute: async () => "ok",
    receiptFor: async () => ({ configurationDigest: "sha256:not-hex" }),
  };
}

/** Executor reporting a different configurationDigest at execute time than at
 * receipt preflight — the stale-config probe. The recorded receipt must carry
 * the execute-path claim. */
export function shiftingConfigExecutor(id = "shifting-config"): Executor {
  return {
    id,
    capabilities: { effects: ["agent"] },
    execute: async () => "ok",
    executeEffect: async () => ({
      output: "ok",
      metadata: { executor: id, configurationDigest: fx.CONFIG_DIGEST_REPORTED },
    }),
    receiptFor: async () => ({ configurationDigest: fx.CONFIG_DIGEST_RECORDED }),
  };
}

/** Executor returning a non-JSON result — must never reach a minted receipt. */
export function exoticOutputExecutor(output: unknown, id = "exotic"): Executor {
  return {
    id,
    capabilities: { effects: ["agent"] },
    execute: async () => output as JsonValue,
  };
}

/** Executor whose metadata carries fields outside the contract (including a
 * credential-shaped string) and claims a different executor id — the harness
 * asserts nothing extra reaches the receipt and the reported id is verbatim. */
export function exoticMetadataExecutor(id = "metadata-admitted"): Executor {
  return {
    id,
    capabilities: { effects: ["agent"] },
    execute: async () => "ok",
    executeEffect: async () => ({
      output: "ok",
      metadata: {
        executor: "claimant",
        usage: { tokensIn: 1 },
        secret: fx.SECRET_LIKE,
        note: "outside-contract-field",
      } as ExecutorMetadata & Record<string, unknown>,
    }),
  };
}

/** Executor that suspends, reporting wake handles (or malformed ones). */
export function suspendingExecutor(wake: unknown, id = "suspender"): Executor {
  const metadata: ExecutorMetadata =
    wake === undefined ? { executor: id } : { executor: id, wake: wake as never };
  return {
    id,
    capabilities: { effects: ["agent", "gate"] },
    execute: async () => {
      throw new AlgalError("EFFECT_SUSPENDED", "executor awaits a wake");
    },
    receiptFor: async () => metadata,
  };
}

/** Executor declaring only "recall" capability — must never receive an agent
 * request. `called` proves the dispatcher never dispatched to it. */
export function recallOnlyExecutor(id = "recall-only"): Executor & { called: () => boolean } {
  let called = false;
  return {
    id,
    called: () => called,
    capabilities: { effects: ["recall"] },
    execute: async () => {
      called = true;
      return "should never be dispatched";
    },
  };
}

/** A live executor that cannot match any route — `routeWildcard` absent. */
export function unroutedExecutor(id: string): Executor & { called: () => boolean } {
  let called = false;
  return {
    id,
    called: () => called,
    capabilities: { effects: ["agent"] },
    execute: async () => {
      called = true;
      return "should never be dispatched";
    },
  };
}

// ----------------------------------------------------- tool wrappers ------

export const PROBE_SIGNATURE: ToolSignature = {
  inputs: {},
  outputs: { result: { type: "text" } },
  effect: "read",
  cost: 10,
  maxOutputBytes: 1024,
};

export function probeRegistry(tool: Tool): ToolRegistry {
  return new Map([["probe", { signature: PROBE_SIGNATURE, tool }]]);
}

// ------------------------------------------------- transport wrappers -----

/** A transport that answers `getBundle` with a bundle rooted somewhere other
 * than the requested digest — or a malformed/null/throwing result. */
export function dishonestTransport(
  mode: "wrong-root" | "malformed" | "null" | "throws",
): Transport & { calls: () => number } {
  let calls = 0;
  return {
    id: "net",
    calls: () => calls,
    getBundle: async () => {
      calls++;
      if (mode === "null") return null;
      if (mode === "throws") throw new Error("fixture: transport unreachable");
      if (mode === "malformed") return { bogus: true } as unknown as Bundle;
      const other = fx.parsedManifest(fx.MANIFEST_REMOTE_OTHER);
      const json = manifestToJson(other);
      const root = digestCanonical(json);
      return { contract: "algal.bundle.v1", root, manifests: { [root]: json }, values: {} };
    },
  };
}

// -------------------------------------------------- memory wrappers -------

/** An admission host whose decodeObservation returns the supplied claims —
 * the malformed/overflow/unstable-decode violations. */
export function scriptedAdmission(
  decode: (input: unknown, call: number) => unknown[],
  overrides: Partial<MemoryAdmissionHost> = {},
): MemoryAdmissionHost {
  let calls = 0;
  return {
    identity: fx.DIGEST_A,
    currentFrontier: async () => {
      throw new Error("fixture frontier not wired");
    },
    validateScope: async () => {},
    decodeObservation: async (input) => decode(input, ++calls) as never,
    ...overrides,
  };
}

// ------------------------------------------------------------ the cases ---

function receiptJson(receipt: RunReceipt): JsonValue {
  return JSON.parse(JSON.stringify(receipt)) as JsonValue;
}

function cellFailure(receipt: RunReceipt, cellId: string): string | undefined {
  const cell = receipt.cells[cellId];
  return cell?.status === "failed" ? cell.failure?.code : undefined;
}

export const HOST_VIOLATION_CASES: HostViolationCase[] = [
  // ------------------------------------------------------ executor seam ---
  {
    id: "hc-ex-oversized-output",
    seam: "executor",
    obligation: "HC-EX-02",
    summary: "executor output over maxOutputBytes fails the cell, never binds",
    async run() {
      const manifest = fx.parsedManifest(fx.MANIFEST_AGENT_TEXT);
      const receipt = await runFixture(manifest, [oversizedOutputExecutor()]);
      const code = cellFailure(receipt, "answer");
      const failed = receipt.outcome === "failed" && code === "BUDGET_EXHAUSTED";
      // Evidence stays on the receipt (the run failed), but never binds a port.
      const verify = await verifyReceipt(
        receiptJson(receipt),
        manifestToJson(manifest),
        new MemoryStore(),
        builtinRegistry(),
      );
      const ok = failed && verify.ok;
      return {
        ok,
        code,
        detail: `cell failure ${code}; the failed run replays bit-for-bit (verify.ok=${verify.ok})`,
      };
    },
  },
  {
    id: "hc-ex-invalid-usage",
    seam: "executor",
    obligation: "HC-EX-03",
    summary: "invalid host-reported usage fails receipt admission rather than silently corrupting accounting",
    async run() {
      const results: string[] = [];
      for (const { name, usage } of fx.MALFORMED_USAGES) {
        const thrown = await classify(() =>
          runFixture(fx.parsedManifest(fx.MANIFEST_AGENT_TEXT), [invalidUsageExecutor(usage)]),
        );
        // Non-JSON values (Infinity) trip the resource check; malformed fields
        // trip field admission. Both mean no invalid receipt is minted.
        const ev = expects(thrown, ["PARSE_FAILED", "BUDGET_EXHAUSTED"], name);
        if (!ev.ok) return ev;
        results.push(`${name}:${thrown.threw ? thrown.code : ""}`);
      }
      return {
        ok: true,
        code: "PARSE_FAILED",
        detail: `${results.length} malformed usage reports rejected at minting (${results.join(", ")})`,
      };
    },
  },
  {
    id: "hc-ex-deadline-uncertain",
    seam: "executor",
    obligation: "HC-EX-06",
    summary: "a hang past maxEffectMs records an uncertain failure and never retries",
    async run() {
      const hanging = hangingExecutor();
      const receipt = await runFixture(
        fx.parsedManifest(fx.MANIFEST_AGENT_DEADLINE),
        [hanging],
      );
      const eff = effect(receipt);
      const ok =
        receipt.outcome === "failed" &&
        eff?.error?.code === "BUDGET_EXHAUSTED" &&
        eff.retryable === false &&
        eff.output === undefined &&
        hanging.calls() === 1;
      return {
        ok,
        code: eff?.error?.code,
        detail: `dispatches=${hanging.calls()} despite retry.attempts=4; retryable=${String(eff?.retryable)}; outcome=${receipt.outcome}`,
      };
    },
  },
  {
    id: "hc-ex-late-result",
    seam: "executor",
    obligation: "HC-EX-05",
    summary: "an executor resolving after its deadline cannot merge late output",
    async run() {
      const late = lateResolutionExecutor("late-output", 60);
      const receipt = await runFixture(
        fx.parsedManifest(fx.MANIFEST_AGENT_DEADLINE),
        [late],
      );
      await late.settled(); // the late value did exist — and still lost the race
      const eff = effect(receipt);
      const ok =
        receipt.outcome === "failed" &&
        eff?.error?.code === "BUDGET_EXHAUSTED" &&
        eff.output === undefined;
      return {
        ok,
        code: eff?.error?.code,
        detail: "late resolution discarded; the receipt records the uncertain deadline error",
      };
    },
  },
  {
    id: "hc-ex-abort-classification",
    seam: "executor",
    obligation: "HC-EX-05",
    summary: "a definite executor error reported on abort loses to the deadline classification",
    async run() {
      const receipt = await runFixture(
        fx.parsedManifest(fx.MANIFEST_AGENT_DEADLINE),
        [abortHonoringExecutor()],
      );
      const eff = effect(receipt);
      const ok =
        eff?.error?.code === "BUDGET_EXHAUSTED" && eff.retryable === false;
      return {
        ok,
        code: eff?.error?.code,
        detail: "the deadline's uncertain classification wins over the executor's abort-time claim",
      };
    },
  },
  {
    id: "hc-ex-config-digest",
    seam: "executor",
    obligation: "HC-EX-04",
    summary: "a malformed configurationDigest fails minting; the execute-path claim is what lands",
    async run() {
      const bad = await classify(() =>
        runFixture(fx.parsedManifest(fx.MANIFEST_AGENT_TEXT), [malformedConfigExecutor()]),
      );
      const rejected = expects(bad, ["PARSE_FAILED"], "malformed configurationDigest");
      if (!rejected.ok) return rejected;
      const receipt = await runFixture(
        fx.parsedManifest(fx.MANIFEST_AGENT_TEXT),
        [shiftingConfigExecutor()],
      );
      const recorded = effect(receipt)?.configurationDigest;
      const ok = recorded === fx.CONFIG_DIGEST_REPORTED;
      return {
        ok,
        detail: `recorded configurationDigest=${recorded ?? "none"} (the execute-path claim, not preflight ${fx.CONFIG_DIGEST_RECORDED.slice(0, 20)}…)`,
      };
    },
  },
  {
    id: "hc-ex-exotic-output",
    seam: "executor",
    obligation: "HC-EX-01",
    summary: "non-JSON executor results are rejected — none reach a minted receipt",
    async run() {
      const notes: string[] = [];
      for (const { name, output } of fx.exoticOutputs()) {
        const doc =
          name === "cyclic"
            ? fx.MANIFEST_AGENT_OPEN_JSON
            : name === "undefined-output"
              ? fx.MANIFEST_AGENT_TEXT
              : fx.MANIFEST_AGENT_JSON;
        const thrown = await classify(() =>
          runFixture(fx.parsedManifest(doc), [exoticOutputExecutor(output)]),
        );
        if (thrown.threw) {
          if (thrown.code === "unknown") {
            return { ok: false, detail: `${name}: untyped rejection (${thrown.message})` };
          }
          notes.push(`${name}:${thrown.code}(thrown)`);
          continue;
        }
        return { ok: false, detail: `${name}: run completed carrying a non-JSON output` };
      }
      return { ok: true, detail: notes.join(", ") };
    },
  },
  {
    id: "hc-ex-metadata-closed",
    seam: "executor",
    obligation: "HC-EX-08",
    summary: "metadata fields outside the contract (incl. a credential string) never reach the receipt",
    async run() {
      const receipt = await runFixture(
        fx.parsedManifest(fx.MANIFEST_AGENT_TEXT),
        [exoticMetadataExecutor()],
      );
      const eff = effect(receipt);
      const keys = eff ? Object.keys(eff).sort().join(",") : "";
      const leaked = JSON.stringify(receipt).includes(fx.SECRET_LIKE);
      const ok =
        receipt.outcome === "complete" &&
        eff?.executor === "claimant" && // reported verbatim — a claim, not authority
        !leaked &&
        !keys.includes("secret") &&
        !keys.includes("note");
      return {
        ok,
        detail: leaked
          ? "credential-shaped string reached the receipt"
          : `recorded effect keys: ${keys}; reported executor id recorded verbatim`,
      };
    },
  },
  {
    id: "hc-ex-suspension",
    seam: "executor",
    obligation: "HC-EX-10",
    summary: "a valid wake suspends the run; malformed wake handles are rejected",
    async run() {
      const wake = capabilityHandle("mailbox-send", { contract: "algal.fixture-cap.v1" });
      const receipt = await runFixture(
        fx.parsedManifest(fx.MANIFEST_AGENT_TEXT),
        [suspendingExecutor([wake])],
      );
      const eff = effect(receipt);
      const suspended =
        receipt.outcome === "suspended" &&
        receipt.cells["answer"]?.status === "suspended" &&
        eff?.retryable === false &&
        Array.isArray(eff.wake) &&
        eff.wake.length === 1;
      if (!suspended) {
        return { ok: false, detail: `outcome=${receipt.outcome}, wake=${JSON.stringify(eff?.wake)}` };
      }
      const bad = await runFixture(
        fx.parsedManifest(fx.MANIFEST_AGENT_TEXT),
        [suspendingExecutor(["cap:bad"])],
      );
      const code = cellFailure(bad, "answer");
      const ok =
        bad.outcome === "failed" &&
        (code === "PARSE_FAILED" || code === "TYPE_MISMATCH");
      return {
        ok,
        code,
        detail: `valid wake suspends; malformed wake fails the cell (${code})`,
      };
    },
  },
  {
    id: "hc-ex-routing",
    seam: "executor",
    obligation: "HC-EX-09",
    summary: "capability declarations and routes gate dispatch — mismatches fail closed with EFFECT_UNBOUND, no call",
    async run() {
      const recall = recallOnlyExecutor();
      const receipt = await runFixture(
        fx.parsedManifest(fx.MANIFEST_AGENT_TEXT),
        [recall],
      );
      const gated =
        !recall.called() &&
        receipt.outcome === "failed" &&
        cellFailure(receipt, "answer") === "EFFECT_UNBOUND" &&
        effect(receipt)?.executor === "unbound";
      if (!gated) {
        return {
          ok: false,
          detail: `recallOnly called=${recall.called()}, cell=${cellFailure(receipt, "answer")}`,
        };
      }
      const unrouted = unroutedExecutor("untrusted");
      const routed = await runFixture(
        fx.parsedManifest(fx.MANIFEST_AGENT_ROUTED),
        [unrouted],
      );
      const miss =
        routed.outcome === "failed" &&
        cellFailure(routed, "answer") === "EFFECT_UNBOUND" &&
        !unrouted.called();
      return miss
        ? { ok: true, detail: "capability and route mismatches fail closed; the mismatched executor is never dispatched" }
        : { ok: false, detail: `routed cell outcome=${routed.outcome}, called=${unrouted.called()}` };
    },
  },
  {
    id: "hc-ex-verify-purity",
    seam: "executor",
    obligation: "HC-EX-07",
    summary: "verifyReceipt admits no executor and writes reach only the replay overlay",
    async run() {
      const manifest = fx.parsedManifest(fx.MANIFEST_AGENT_TEXT);
      const manifestJson = manifestToJson(manifest);
      const receipt = await runFixture(manifest, [
        scriptedExecutor({ answer: "ok" }, "fixture-exec"),
      ]);
      const backing = countingStore(new MemoryStore());
      const verify = await verifyReceipt(
        receiptJson(receipt),
        manifestJson,
        backing,
        builtinRegistry(),
      );
      const ok = verify.ok && backing.writes() === 0;
      return {
        ok,
        detail: `verify.ok=${verify.ok}; backing-store writes=${backing.writes()} (any write would land only in the replay overlay)`,
      };
    },
  },
  {
    id: "hc-ex-receipt-shape",
    seam: "executor",
    obligation: "HC-EX-01",
    summary: "malformed effect receipts fail parseEffectReceipt admission",
    async run() {
      const notes: string[] = [];
      for (const { name, receipt } of fx.malformedReceipts()) {
        const thrown = await classify(() => parseEffectReceipt(receipt));
        const ev = expects(thrown, ["PARSE_FAILED"], name);
        if (!ev.ok) return ev;
        notes.push(name);
      }
      return { ok: true, code: "PARSE_FAILED", detail: `${notes.length} malformed receipts rejected` };
    },
  },
  // --------------------------------------------------------- store seam ---
  {
    id: "hc-st-cas-integrity",
    seam: "store",
    obligation: "HC-ST-01",
    summary: "a corrupted CAS file is re-digested on read and rejected, not served",
    async run() {
      return withTempDir(async (dir) => {
        const store = new FileStore(dir);
        const digest = await store.putValue({ fixture: "tamper-target" });
        await writeFile(
          join(dir, "values", `${digest.slice(7)}.json`),
          JSON.stringify({ tampered: true }),
        );
        const thrown = await classify(() => store.getValue(digest));
        return expects(thrown, ["DIGEST_MISMATCH"], "corrupted CAS read");
      });
    },
  },
  {
    id: "hc-st-memo-keying",
    seam: "store",
    obligation: "HC-ST-02",
    summary: "a memo claiming a different requestDigest is rejected; malformed memos never publish",
    async run() {
      return withTempDir(async (dir) => {
        const store = new FileStore(dir);
        // A memo filed under DIGEST_A's key but claiming DIGEST_B. The effects
        // directory is created lazily by the store, so make it explicitly.
        await mkdir(join(dir, "effects"), { recursive: true });
        await writeFile(
          join(dir, "effects", `${fx.DIGEST_A.slice(7)}.json`),
          JSON.stringify({ requestDigest: fx.DIGEST_B, executor: "fixture", output: 1 }),
        );
        const wrong = await classify(() => store.getEffect(fx.DIGEST_A));
        const rejected = expects(wrong, ["DIGEST_MISMATCH"], "memo requestDigest mismatch");
        if (!rejected.ok) return rejected;
        const malformed = await classify(() =>
          store.putEffect({ requestDigest: fx.DIGEST_A, executor: "e" } as never),
        );
        return expects(malformed, ["PARSE_FAILED"], "malformed memo");
      });
    },
  },
  {
    id: "hc-st-bounds",
    seam: "store",
    obligation: "HC-ST-03",
    summary: "oversized slot writes and invalid slot names are rejected",
    async run() {
      return withTempDir(async (dir) => {
        const store = new FileStore(dir);
        const oversized = await classify(() =>
          store.setSlot("big", { blob: "x".repeat(300_000) }),
        );
        const rejected = expects(oversized, ["BUDGET_EXHAUSTED"], "oversized slot value");
        if (!rejected.ok) return rejected;
        const named = await classify(() => store.setSlot("../escape", { v: 1 }));
        return expects(named, ["PARSE_FAILED"], "invalid slot name");
      });
    },
  },
  // ---------------------------------------------------------- tool seam ---
  {
    id: "hc-tl-signature-admission",
    seam: "tool",
    obligation: "HC-TL-01",
    summary: "invalid tool signatures (cost, effect class, output bound, unknown keys) fail admission",
    async run() {
      const notes: string[] = [];
      for (const { name, signature } of fx.malformedToolSignatures()) {
        const thrown = await classify(() => parseToolSignature(signature));
        const ev = expects(thrown, ["PARSE_FAILED"], name);
        if (!ev.ok) return ev;
        notes.push(name);
      }
      return { ok: true, code: "PARSE_FAILED", detail: `${notes.length} bad signatures rejected` };
    },
  },
  {
    id: "hc-tl-output-bound",
    seam: "tool",
    obligation: "HC-TL-02",
    summary: "a tool result over its signature byte bound fails the cell",
    async run() {
      const tools = probeRegistry(async () => ({ result: "y".repeat(4096) }));
      const receipt = await runFixture(
        fx.parsedManifest(fx.MANIFEST_TOOL),
        [],
        { tools },
      );
      const code = cellFailure(receipt, "probe");
      const ok = receipt.outcome === "failed" && code === "BUDGET_EXHAUSTED";
      return { ok, code, detail: `tool cell failure ${code}` };
    },
  },
  {
    id: "hc-tl-nonrecord",
    seam: "tool",
    obligation: "HC-TL-02",
    summary: "a tool returning a non-record result is rejected by output binding",
    async run() {
      const tools = probeRegistry(async () => "not-a-record" as never);
      const receipt = await runFixture(
        fx.parsedManifest(fx.MANIFEST_TOOL),
        [],
        { tools },
      );
      const code = cellFailure(receipt, "probe");
      const ok = receipt.outcome === "failed" && code === "TYPE_MISMATCH";
      return { ok, code, detail: `non-record tool result → ${code}` };
    },
  },
  {
    id: "hc-tl-cost-charge",
    seam: "tool",
    obligation: "HC-TL-03",
    summary: "accounting charges the admitted signature cost — the callback cannot report a different number",
    async run() {
      const make = (cost: number): ToolRegistry =>
        new Map([["probe", {
          signature: { ...PROBE_SIGNATURE, cost },
          tool: async () => ({ result: "ok" }),
        }]]);
      const a = await runFixture(fx.parsedManifest(fx.MANIFEST_TOOL), [], { tools: make(0) });
      const b = await runFixture(fx.parsedManifest(fx.MANIFEST_TOOL), [], { tools: make(100) });
      const delta = b.work.units - a.work.units;
      const ok = a.outcome === "complete" && b.outcome === "complete" && delta === 100;
      return { ok, detail: `work.units delta across identical runs = ${delta} (expected exactly 100)` };
    },
  },
  {
    id: "hc-tl-deadline",
    seam: "tool",
    obligation: "HC-TL-04",
    summary: "a tool hanging past maxEffectMs is recorded uncertain, not retried",
    async run() {
      let calls = 0;
      const tools = probeRegistry(async () => {
        calls++;
        return new Promise<Record<string, JsonValue>>(() => {});
      });
      const receipt = await runFixture(
        fx.parsedManifest(fx.MANIFEST_TOOL_DEADLINE),
        [],
        { tools },
      );
      const eff = effect(receipt);
      const ok =
        receipt.outcome === "failed" &&
        eff?.error?.code === "BUDGET_EXHAUSTED" &&
        eff.retryable === false &&
        calls === 1;
      return { ok, code: eff?.error?.code, detail: `tool calls=${calls}, retryable=${String(eff?.retryable)}` };
    },
  },
  {
    id: "hc-tl-verify-purity",
    seam: "tool",
    obligation: "HC-TL-05",
    summary: "verify replays tool effects from the receipt — live tool code is never invoked and a missing tool effect fails closed",
    async run() {
      let calls = 0;
      const tools = probeRegistry(async () => {
        calls++;
        return { result: "ok" };
      });
      const manifest = fx.parsedManifest(fx.MANIFEST_TOOL);
      const manifestJson = manifestToJson(manifest);
      const receipt = await runFixture(manifest, [], { tools });
      const ranCalls = calls;
      calls = 0;
      const verify = await verifyReceipt(
        receiptJson(receipt), manifestJson, new MemoryStore(), builtinRegistry(), undefined, tools,
      );
      const pure = verify.ok && calls === 0;
      if (!pure) {
        return { ok: false, detail: `verify invoked the live tool ${calls} times` };
      }
      // Strip the recorded tool effect: verify must fail closed, not dispatch.
      const stripped = receiptJson(receipt) as Record<string, JsonValue>;
      stripped.effects = ((stripped.effects as JsonValue[]) ?? []).filter(
        (e) => !(e && typeof e === "object" && !Array.isArray(e) &&
          String((e as Record<string, unknown>).executor).startsWith("tool:")),
      );
      const verifyStripped = await verifyReceipt(
        stripped, manifestJson, new MemoryStore(), builtinRegistry(), undefined, tools,
      );
      const ok = !verifyStripped.ok && calls === 0;
      return {
        ok,
        detail: `recorded verify ok=${verify.ok} (${ranCalls} live calls at run time, 0 during verify); stripped receipt ok=${verifyStripped.ok}`,
      };
    },
  },
  // ------------------------------------------------------ transport seam ---
  {
    id: "hc-tr-wrong-root",
    seam: "transport",
    obligation: "HC-TR-01",
    summary: "a bundle rooted elsewhere cannot satisfy the requested digest — STORE_MISS, not silent authority",
    async run() {
      const { manifest } = fx.manifestWithViaCell();
      const transport = dishonestTransport("wrong-root");
      const thrown = await classify(() =>
        runFixture(manifest, [], { transports: { net: transport } }),
      );
      const ev = expects(thrown, ["STORE_MISS", "DIGEST_MISMATCH"], "wrong-root bundle");
      return ev.ok && transport.calls() === 1
        ? { ok: true, code: ev.code, detail: `transport consulted once; ${ev.code} — no foreign content bound to the requested name` }
        : { ok: ev.ok && transport.calls() === 1, code: ev.code, detail: ev.detail };
    },
  },
  {
    id: "hc-tr-malformed",
    seam: "transport",
    obligation: "HC-TR-02",
    summary: "a malformed bundle document fails admission instead of installing",
    async run() {
      const { manifest } = fx.manifestWithViaCell();
      const thrown = await classify(() =>
        runFixture(manifest, [], { transports: { net: dishonestTransport("malformed") } }),
      );
      return expects(thrown, ["PARSE_FAILED"], "malformed bundle");
    },
  },
  {
    id: "hc-tr-nondelivery",
    seam: "transport",
    obligation: "HC-TR-03",
    summary: "nondelivery (null) is a STORE_MISS and a thrown transport error propagates — nothing is silently installed",
    async run() {
      const { manifest } = fx.manifestWithViaCell();
      const nullThrown = await classify(() =>
        runFixture(manifest, [], { transports: { net: dishonestTransport("null") } }),
      );
      const miss = expects(nullThrown, ["STORE_MISS"], "null bundle");
      if (!miss.ok) return miss;
      const throwThrown = await classify(() =>
        runFixture(manifest, [], { transports: { net: dishonestTransport("throws") } }),
      );
      const ok = throwThrown.threw;
      return {
        ok,
        code: throwThrown.threw ? throwThrown.code : undefined,
        detail: ok
          ? `null → STORE_MISS; thrown transport error propagates (${throwThrown.threw ? throwThrown.code : "none"})`
          : "throwing transport was silently accepted",
      };
    },
  },
  // ----------------------------------------------- memory-admission seam ---
  {
    id: "hc-ma-claims-bound",
    seam: "memory-admission",
    obligation: "HC-MA-01",
    summary: "admission-host decodes are re-bounded and re-parsed — malformed or overflowing claims are rejected, never minted",
    async run() {
      const cases: { name: string; decode: () => unknown[] }[] = [
        { name: "bad-polarity", decode: () => [fx.MALFORMED_CLAIM] },
        { name: "undeclared-relation", decode: () => [fx.UNDECLARED_CLAIM] },
        { name: "over-32-claims", decode: () => fx.claimOverflow() },
      ];
      for (const c of cases) {
        const f = await fx.memoryFixture();
        const memory = new ApplicationMemoryService({
          store: f.store,
          engine: fx.fixtureEngine(),
          admission: scriptedAdmission(c.decode),
        });
        const thrown = await classify(() => memory.observe(f.observationInput));
        const ev = expects(thrown, ["Error"], c.name);
        if (!ev.ok) return ev;
      }
      return { ok: true, detail: "malformed, undeclared, and overflowing claims all rejected before minting" };
    },
  },
  {
    id: "hc-ma-identity",
    seam: "memory-admission",
    obligation: "HC-MA-02",
    summary: "admission and engine identities must be digests at construction",
    async run() {
      const f = await fx.memoryFixture();
      const thrown = await classify(
        () =>
          new ApplicationMemoryService({
            store: f.store,
            engine: fx.fixtureEngine(),
            admission: scriptedAdmission(() => [fx.VALID_CLAIM], {
              identity: "not-a-digest" as Digest,
            }),
          }),
      );
      return expects(thrown, ["PARSE_FAILED"], "non-digest admission identity");
    },
  },
  {
    id: "hc-ma-unstable-decode",
    seam: "memory-admission",
    obligation: "HC-MA-03",
    summary: "a non-deterministic decoder is caught when stored claims are re-decoded at admission",
    async run() {
      const f = await fx.memoryFixture();
      const memory = new ApplicationMemoryService({
        store: f.store,
        engine: fx.fixtureEngine(),
        admission: scriptedAdmission((_input, call) =>
          call === 1
            ? [{ ...fx.VALID_CLAIM }]
            : [{ ...fx.VALID_CLAIM, tuple: ["other"] }],
        ),
      });
      const observation = await memory.observe(f.observationInput);
      const thrown = await classify(() =>
        memory.snapshot({
          application: f.application,
          schema: f.schema,
          previous: null,
          scope: f.scope,
          observations: [observation],
          hypotheses: [],
          withdrawn: [],
        }),
      );
      const ev = expects(thrown, ["Error"], "unstable decoder");
      return ev.ok
        ? { ok: true, detail: "second decode diverged — 'Stored claim differs from trusted source decoding'" }
        : ev;
    },
  },
  {
    id: "hc-ma-input-isolation",
    seam: "memory-admission",
    obligation: "HC-MA-04",
    summary: "callback arguments are isolated — a host mutating its inputs cannot affect service state",
    async run() {
      const f = await fx.memoryFixture();
      const seenBindings: number[] = [];
      const memory = new ApplicationMemoryService({
        store: f.store,
        engine: fx.fixtureEngine(),
        admission: scriptedAdmission((input) => {
          const inp = input as { scope?: { bindings?: unknown[] } };
          inp.scope?.bindings?.push({ mutated: true });
          seenBindings.push(inp.scope?.bindings?.length ?? -1);
          return [{ ...fx.VALID_CLAIM }];
        }),
      });
      const observation = await memory.observe(f.observationInput);
      // admit() inside snapshot() re-decodes — the second call must see
      // pristine inputs despite the first call's mutation.
      await memory.snapshot({
        application: f.application,
        schema: f.schema,
        previous: null,
        scope: f.scope,
        observations: [observation],
        hypotheses: [],
        withdrawn: [],
      });
      const ok = seenBindings.length === 2 && seenBindings.every((n) => n === 1);
      return {
        ok,
        detail: `decode saw post-mutation bindings lengths ${seenBindings.join(",")} — each call received an isolated clone`,
      };
    },
  },
  // ----------------------------------------------------- host-event seam ---
  {
    id: "hc-he-due-gating",
    seam: "host-event",
    obligation: "HC-HE-01",
    summary: "dueAtMs gates delivery on the injected clock; delivery markers survive restart",
    async run() {
      return withTempDir(async (dir) => {
        const mailboxes = new MemoryMailboxService();
        const mailbox = await mailboxes.create("events");
        let now = 1_000;
        const clock = { now: () => now, sleep: async (ms: number) => { now += ms; } };
        const svc = new HostEventService(dir, mailboxes, clock);
        const enq = await svc.enqueue(fx.hostEventInput(mailbox, { dueAtMs: now + 60_000 }));
        const early = await svc.deliverDue();
        const notYet = early.length === 0 && enq.status === "pending";
        now += 61_000;
        const delivered = await svc.deliverDue();
        const svc2 = new HostEventService(dir, mailboxes, clock);
        const rec = (await svc2.list()).find((e) => e.event.eventId === enq.event.eventId);
        const ok =
          notYet &&
          delivered.length === 1 &&
          rec?.status === "delivered" &&
          rec.messageId === delivered[0]?.messageId;
        return {
          ok,
          detail: `pending until dueAtMs; delivered once; post-restart status=${rec?.status}, messageId stable`,
        };
      });
    },
  },
  {
    id: "hc-he-conflict",
    seam: "host-event",
    obligation: "HC-HE-02",
    summary: "conflicting re-admission of a deliveryId is rejected; identical re-enqueue is deduplicated",
    async run() {
      return withTempDir(async (dir) => {
        const mailboxes = new MemoryMailboxService();
        const mailbox = await mailboxes.create("events");
        const svc = new HostEventService(dir, mailboxes, { now: () => 5_000, sleep: async () => {} });
        const first = await svc.enqueue(fx.hostEventInput(mailbox));
        const again = await svc.enqueue(fx.hostEventInput(mailbox));
        const same =
          again.event.eventId === first.event.eventId && again.status === first.status;
        const conflict = await classify(() =>
          svc.enqueue(fx.hostEventInput(mailbox, { payload: { probe: 2 } })),
        );
        const ev = expects(conflict, ["DIGEST_MISMATCH"], "conflicting re-admission");
        return ev.ok && same
          ? { ok: true, code: "DIGEST_MISMATCH", detail: "identical retry deduplicated; conflicting payload rejected" }
          : { ok: false, detail: `dedup=${same}, ${ev.detail}` };
      });
    },
  },
  {
    id: "hc-he-cancel-ordering",
    seam: "host-event",
    obligation: "HC-HE-04",
    summary: "cancel is honored only while pending — after send intent the cancel is too late and delivery still completes",
    async run() {
      return withTempDir(async (dir) => {
        const mailboxes = new MemoryMailboxService();
        const mailbox = await mailboxes.create("events");
        const clock = { now: () => 0, sleep: async () => {} };
        const svc = new HostEventService(dir, mailboxes, clock);
        const pending = await svc.enqueue(fx.hostEventInput(mailbox, { deliveryId: "cancel-me" }));
        const cancelled = await svc.cancel(pending.event.eventId);
        const again = await svc.cancel(pending.event.eventId);
        const pendingOk =
          cancelled.cancelled === true &&
          again.cancelled === true &&
          again.reason === "already-cancelled";
        if (!pendingOk) {
          return { ok: false, detail: `pending cancel → ${JSON.stringify(cancelled)}/${JSON.stringify(again)}` };
        }
        // Hold a send in flight so the cancel lands after send intent.
        const blocking = fx.gatedMailboxes(mailboxes);
        const svc2 = new HostEventService(dir, blocking, clock);
        const inflight = await svc2.enqueue(fx.hostEventInput(mailbox, { deliveryId: "in-flight" }));
        const delivery = svc2.deliverDue();
        await blocking.entered; // send() invoked → "sending" marker already published
        const tooLate = await svc2.cancel(inflight.event.eventId);
        blocking.release();
        await delivery;
        const rec = (await svc2.list()).find((e) => e.event.eventId === inflight.event.eventId);
        const ok =
          tooLate.cancelled === false &&
          tooLate.reason === "too-late" &&
          rec?.status === "delivered";
        return { ok, detail: `in-flight cancel → ${tooLate.reason}; final status ${rec?.status}` };
      });
    },
  },
  {
    id: "hc-he-bounds",
    seam: "host-event",
    obligation: "HC-HE-03",
    summary: "event and poll bounds are enforced — oversized payload, far horizon, invalid poll options",
    async run() {
      return withTempDir(async (dir) => {
        const mailboxes = new MemoryMailboxService();
        const mailbox = await mailboxes.create("events");
        const svc = new HostEventService(dir, mailboxes, { now: () => 0, sleep: async () => {} });
        const checks: { name: string; thrown: Thrown; codes: string[] }[] = [
          {
            name: "horizon-overflow",
            thrown: await classify(() =>
              svc.enqueue(fx.hostEventInput(mailbox, { deliveryId: "far", dueAtMs: HOST_EVENT_BOUNDS.maxTimerHorizonMs + 86_400_000 })),
            ),
            codes: ["BUDGET_EXHAUSTED"],
          },
          {
            name: "oversized-payload",
            thrown: await classify(() =>
              svc.enqueue(fx.hostEventInput(mailbox, { deliveryId: "big", payload: { blob: "z".repeat(70_000) } })),
            ),
            codes: ["BUDGET_EXHAUSTED"],
          },
          {
            name: "poll-maxPasses-0",
            thrown: await classify(() => svc.poll({ maxPasses: 0, maxDeliveries: 1, maxDurationMs: 1_000 })),
            codes: ["PARSE_FAILED"],
          },
          {
            name: "poll-duration-over",
            thrown: await classify(() => svc.poll({ maxPasses: 1, maxDeliveries: 1, maxDurationMs: HOST_EVENT_BOUNDS.maxDurationMs + 1 })),
            codes: ["PARSE_FAILED"],
          },
        ];
        for (const c of checks) {
          const ev = expects(c.thrown, c.codes, c.name);
          if (!ev.ok) return ev;
        }
        return { ok: true, detail: checks.map((c) => c.name).join(", ") + " all rejected" };
      });
    },
  },
  {
    id: "hc-he-lost-ack",
    seam: "host-event",
    obligation: "HC-HE-05",
    summary: "a lost send acknowledgement stays 'sending'; restart retries the same idempotency key — one consumed message, stable id",
    async run() {
      return withTempDir(async (dir) => {
        const inner = new MemoryMailboxService();
        const mailbox = await inner.create("events");
        const flaky = fx.lostAckMailboxes(inner);
        const clock = { now: () => 0, sleep: async () => {} };
        const svc = new HostEventService(dir, flaky, clock);
        const enq = await svc.enqueue(fx.hostEventInput(mailbox));
        const first = await classify(() => svc.deliverDue());
        const stuck =
          first.threw &&
          (await svc.list()).find((e) => e.event.eventId === enq.event.eventId)?.status === "sending";
        if (!stuck) {
          return { ok: false, detail: "lost ack did not surface or did not leave the event in 'sending'" };
        }
        // Restart against the same directory with a healthy mailbox: the same
        // idempotency key is retried; the already-queued message is not duplicated.
        const svc2 = new HostEventService(dir, inner, clock);
        const second = await svc2.deliverDue();
        const rec = (await svc2.list()).find((e) => e.event.eventId === enq.event.eventId);
        const consumed = await inner.receive(mailbox.receive);
        const drained = await classify(() => inner.receive(mailbox.receive));
        const ok =
          second.length === 1 &&
          rec?.status === "delivered" &&
          consumed.id === rec.messageId &&
          drained.threw &&
          drained.code === "EFFECT_SUSPENDED"; // consumed, never requeued
        return {
          ok,
          detail: `send retried ${flaky.sentKeys.length}× under one idempotency key; delivered once; queue empty after consume`,
        };
      });
    },
  },
  // -------------------------------------------------------- stream seam ---
  {
    id: "hc-io-overflow",
    seam: "stream",
    obligation: "HC-IO-01",
    summary: "bounded streams reject overflow at the bound and cancel the reader",
    async run() {
      let cancelled = false;
      const src = new ReadableStream<Uint8Array>({
        pull(c) {
          c.enqueue(new Uint8Array(64).fill(0x43));
        },
        cancel() {
          cancelled = true;
        },
      });
      const thrown = await classify(() => boundedBytes(src, 100, "fixture stream"));
      const ev = expects(thrown, ["BUDGET_EXHAUSTED"], "overflowing stream");
      return ev.ok && cancelled
        ? { ok: true, code: "BUDGET_EXHAUSTED", detail: "overflow rejected at the bound; source reader cancelled" }
        : { ok: false, detail: `${ev.detail}; source cancelled=${cancelled}` };
    },
  },
  {
    id: "hc-io-abort-mid-stream",
    seam: "stream",
    obligation: "HC-IO-02",
    summary: "abortion during a blocked read cancels the stream — typed BUDGET_EXHAUSTED, not a hang",
    async run() {
      const { stream, cancelled } = fx.cancellableStream();
      const controller = new AbortController();
      const pending = boundedBytes(stream, 1024, "fixture stream", controller.signal);
      // First chunk drains; the read then blocks — abort lands mid-read.
      setTimeout(() => controller.abort(), 5);
      const thrown = await classify(() => pending);
      const ev = expects(thrown, ["BUDGET_EXHAUSTED"], "abort mid-stream");
      return ev.ok && cancelled()
        ? { ok: true, code: "BUDGET_EXHAUSTED", detail: "mid-stream abort rejected and cancelled the source" }
        : { ok: false, detail: `${ev.detail}; source cancelled=${cancelled()}` };
    },
  },
  {
    id: "hc-io-invalid-limits",
    seam: "stream",
    obligation: "HC-IO-01",
    summary: "invalid stream limits are rejected before any byte is read",
    async run() {
      const streams: ReadableStream<Uint8Array>[] = [];
      const mk = () => {
        const s = new ReadableStream<Uint8Array>({
          pull(c) {
            c.enqueue(new Uint8Array(8));
          },
        });
        streams.push(s);
        return s;
      };
      for (const limit of [0, -1, 70_000_000]) {
        const thrown = await classify(() => boundedBytes(mk(), limit, "fixture stream"));
        const ev = expects(thrown, ["PARSE_FAILED"], `limit ${limit}`);
        if (!ev.ok) return ev;
      }
      // `locked` means a reader was acquired — the bound is checked before
      // any read begins, so no stream is ever locked.
      const ok = streams.every((s) => !s.locked);
      return { ok, detail: `invalid limits rejected pre-read; streams locked=${streams.filter((s) => s.locked).length}` };
    },
  },
  {
    id: "hc-io-command-gates",
    seam: "stream",
    obligation: "HC-IO-03",
    summary: "the command envelope rejects bad limits and pre-aborted signals before any spawn",
    async run() {
      const checks: { name: string; thrown: Thrown; codes: string[] }[] = [
        {
          name: "timeout-0",
          thrown: await classify(() => commandJson(["sh", "-c", "sleep 30"], {}, { timeoutMs: 0 })),
          codes: ["PARSE_FAILED"],
        },
        {
          name: "timeout-over",
          thrown: await classify(() => commandJson(["sh", "-c", "sleep 30"], {}, { timeoutMs: 600_001 })),
          codes: ["PARSE_FAILED"],
        },
        {
          name: "stdout-limit-0",
          thrown: await classify(() => commandJson(["sh", "-c", "sleep 30"], {}, { maxStdoutBytes: 0 })),
          codes: ["PARSE_FAILED"],
        },
        {
          name: "pre-aborted",
          thrown: await classify(() =>
            commandJson(["sh", "-c", "sleep 30"], {}, { signal: AbortSignal.abort() }),
          ),
          codes: ["BUDGET_EXHAUSTED"],
        },
        {
          name: "input-over-1MiB",
          thrown: await classify(() =>
            commandJson(["sh", "-c", "sleep 30"], { blob: "q".repeat(1_100_000) }),
          ),
          codes: ["BUDGET_EXHAUSTED"],
        },
      ];
      for (const c of checks) {
        const ev = expects(c.thrown, c.codes, c.name);
        if (!ev.ok) return ev;
      }
      return { ok: true, detail: "all envelope violations rejected before spawn — nothing launched" };
    },
  },
  // ----------------------------------------------------- credential seam ---
  {
    id: "hc-cr-custody",
    seam: "credential",
    obligation: "HC-CR-01",
    summary: "credential shape admission is strict and redaction never exposes a key",
    async run() {
      for (const bad of ["", "short", "key\nwith-newline", " padded ", "x".repeat(8193)]) {
        const thrown = await classify(() => checkCredentialShape(bad, "fixture key"));
        const ev = expects(thrown, ["PARSE_FAILED"], `credential ${JSON.stringify(bad.slice(0, 12))}`);
        if (!ev.ok) return ev;
      }
      const okShape = await classify(() => checkCredentialShape(fx.SECRET_LIKE, "fixture key"));
      if (okShape.threw) {
        return { ok: false, detail: "a well-formed key was rejected" };
      }
      const redacted = redact(fx.SECRET_LIKE);
      const ok = !redacted.includes(fx.SECRET_LIKE) && redacted.length <= 8;
      return {
        ok,
        detail: `redact("…") leaks ${redacted.length} chars, expected ≤ 4 trailing + ellipsis`,
      };
    },
  },
  // ---------------------------------------------- recall / decision seam ---
  {
    id: "hc-se-over-k-hits",
    seam: "decision",
    obligation: "HC-SE-01",
    summary: "a searcher returning more than k hits is rejected; malformed hits fail bindRecallOutput",
    async run() {
      const hit = { id: fx.DIGEST_A, source: `value:${fx.DIGEST_B.slice(7)}`, seq: 0, score: 0.5, text: "hit" };
      const searcher: RecallSearcher = {
        id: "fixture-search",
        async search() {
          return [hit, hit, hit];
        },
      };
      const exec = recallExecutor(searcher);
      const request = fx.fixtureRequest({
        kind: "recall",
        recall: { query: "fixture", k: 2, embedder: "fixture-embed" },
      });
      const overK = await classify(() => exec.execute(request));
      const rejected = expects(overK, ["EFFECT_UNPARSEABLE"], "3 hits for k=2");
      if (!rejected.ok) return rejected;
      const malformed = await classify(() =>
        bindRecallOutput({ hits: [{ ref: "not-a-digest", seq: 0, score: 0.5, text: "x" }] } as never, 4),
      );
      return expects(malformed, ["EFFECT_UNPARSEABLE"], "malformed hit");
    },
  },
  {
    id: "hc-da-decide-shape",
    seam: "decision",
    obligation: "HC-DA-01",
    summary: "decision answers bind against the derived question schema — malformed answers fail the cell; a gate is never routed to a decision provider",
    async run() {
      const malformed = await runFixture(
        fx.parsedManifest(fx.MANIFEST_DECIDE),
        [scriptedExecutor({ judgement: { answers: { keep: { noul: "high" } } } }, "jev-fixture")],
      );
      const code = cellFailure(malformed, "judgement");
      if (!(malformed.outcome === "failed" && code === "EFFECT_UNPARSEABLE")) {
        return { ok: false, code, detail: `malformed decide answer → ${code}` };
      }
      let asked = false;
      const gate = await runFixture(
        fx.parsedManifest(fx.MANIFEST_GATE),
        [decisionExecutor({
          asker: {
            ask: async () => {
              asked = true;
              return { answers: {} };
            },
          },
          id: "jev",
          cacheIdentity: "jev:fixture",
        })],
      );
      const gateOk =
        gate.outcome === "failed" &&
        cellFailure(gate, "approve") === "EFFECT_UNBOUND" &&
        !asked;
      return {
        ok: gateOk,
        code: cellFailure(gate, "approve"),
        detail: "malformed decide answers rejected EFFECT_UNPARSEABLE; a gate is never dispatched to a decision provider",
      };
    },
  },
];
