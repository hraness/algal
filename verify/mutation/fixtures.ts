/**
 * verify/mutation/fixtures.ts — mints genuine `algal.process-evidence.v1`
 * documents through the real production path: MemoryStore → typed process
 * records → runOrganism → exportProcessEvidence. Every base is exported by
 * the production exporter and re-verified before mutation, so mutants start
 * from admitted evidence, never hand-assembled fixtures.
 *
 * Bases cover the distinct evidence topologies the verifier sees:
 *   complete    — ready → uncertain → complete; one receipt, three records
 *   failed-miss — an input ref the store never served → failed receipt and
 *                 a populated `missing.values` negative-declaration list
 *   suspended   — a tool that suspends → suspended head carrying wake
 *                 handles and a tools signature table
 *   uncertain   — a suspended head dispatched again → uncertain terminal
 *                 head over a four-record chain
 *   value-dep   — an input that reads an admitted CAS value → populated
 *                 `program.values`
 */

import { capabilityHandle, suspensionDetails } from "../../src/capabilities";
import { parseOrganismManifest, type OrganismManifest } from "../../src/contract";
import { digestText, type Digest } from "../../src/digest";
import { AlgalError } from "../../src/errors";
import { exportProcessEvidence, type ProcessEvidence } from "../../src/process-evidence";
import { parseProcessRecord, type ProcessRecord, type ProcessSnapshot } from "../../src/process";
import { builtinRegistry } from "../../src/registry";
import { runOrganism, type RunReceipt } from "../../src/run";
import { MemoryStore, type Store } from "../../src/store";
import { type ToolRegistry } from "../../src/tools";
import { type JsonValue } from "../../src/values";

const json = (value: unknown): JsonValue => value as JsonValue;

export const BASE_IDS = ["complete", "failed-miss", "suspended", "uncertain", "value-dep"] as const;
export type BaseId = (typeof BASE_IDS)[number];

export function manifest(cells: unknown[], edges: unknown[] = []): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:evidence-mutation",
    name: "Evidence mutation base",
    cells,
    edges,
  });
}

async function initial(store: MemoryStore, program: OrganismManifest, args: Record<string, Record<string, JsonValue>> = {}): Promise<ProcessSnapshot> {
  const record = parseProcessRecord({
    contract: "algal.process.v1",
    name: "mutation-base",
    manifestDigest: await store.putManifest(program),
    args,
    maxGenerations: 8,
    generation: 0,
    status: "ready",
    wake: [],
  });
  return { digest: await store.putValue(json(record)), process: record };
}

async function intent(store: MemoryStore, prior: ProcessSnapshot): Promise<ProcessSnapshot> {
  const record = parseProcessRecord({
    ...prior.process,
    previous: prior.digest,
    generation: prior.process.generation + 1,
    status: "uncertain",
    cause: prior.process.status === "ready" ? "start" : "manual",
  });
  return { digest: await store.putValue(json(record)), process: record };
}

async function completion(store: MemoryStore, dispatched: ProcessSnapshot, receipt: RunReceipt): Promise<ProcessSnapshot> {
  const wake = [
    ...new Set(
      receipt.effects
        .filter(item => item.error?.code === "EFFECT_SUSPENDED")
        .flatMap(item => item.wake ?? []),
    ),
  ].sort();
  const record = parseProcessRecord({
    ...dispatched.process,
    previous: dispatched.digest,
    status: receipt.outcome,
    receipt: await store.putReceipt(json(receipt)),
    wake,
  });
  return { digest: await store.putValue(json(record)), process: record };
}

async function execute(store: MemoryStore, program: OrganismManifest, args: Record<string, Record<string, JsonValue>> = {}, tools?: ToolRegistry) {
  const ready = await initial(store, program, args);
  const dispatched = await intent(store, ready);
  const receipt = await runOrganism({
    manifest: program, args, store, fns: builtinRegistry(), executors: [],
    ...(tools ? { tools } : {}),
  });
  return { snapshot: await completion(store, dispatched, receipt), receipt, ready, dispatched };
}

function frozenSource(store: Store): Store {
  const read = new Set(["getManifest", "getReceipt", "getValue"]);
  return new Proxy(store, {
    get(target, property) {
      if (read.has(String(property))) return Reflect.get(target, property).bind(target);
      return () => { throw new Error(`source activation forbidden: ${String(property)}`); };
    },
  });
}

const SIMPLE = () => manifest([{
  id: "source", kind: "const",
  outputs: { value: { type: "json", value: { answer: 42 } } },
}]);

const WAIT_TOOLS = (): ToolRegistry => new Map([[
  "fixture.wait.v1",
  {
    signature: { inputs: {}, outputs: {}, effect: "write", cost: 1, maxOutputBytes: 256 },
    tool: async () => {
      // A suspension that carries real wake handles, so record.wake and
      // effect.wake mutations exercise the non-empty path.
      throw new AlgalError("EFFECT_SUSPENDED", "waiting", suspensionDetails(
        capabilityHandle("wait", { channel: "fixture", attempt: 1 }),
        capabilityHandle("timer", { deadline: "never" }),
      ));
    },
  },
]]);

export type Minted = { id: BaseId; evidence: ProcessEvidence; snapshot: ProcessSnapshot; store: MemoryStore; receipt?: RunReceipt };

/** Mint all bases. Deterministic — the manifest set and args are fixed. */
export async function mintBases(): Promise<Map<BaseId, Minted>> {
  const out = new Map<BaseId, Minted>();

  {
    const store = new MemoryStore();
    const { snapshot, receipt } = await execute(store, SIMPLE());
    out.set("complete", { id: "complete", evidence: await exportProcessEvidence(snapshot, frozenSource(store)), snapshot, store, receipt });
  }
  {
    const store = new MemoryStore();
    const absent = digestText("absent value");
    const program = manifest([{ id: "input", kind: "input", outputs: { ref: "ref" } }]);
    const { snapshot, receipt } = await execute(store, program, { input: { ref: absent } });
    if (receipt.outcome !== "failed") throw new Error("failed-miss base did not fail");
    out.set("failed-miss", { id: "failed-miss", evidence: await exportProcessEvidence(snapshot, frozenSource(store)), snapshot, store, receipt });
  }
  {
    const store = new MemoryStore();
    const tools = WAIT_TOOLS();
    const program = manifest([{ id: "wait", kind: "tool", tool: "fixture.wait.v1" }]);
    const { snapshot, receipt } = await execute(store, program, {}, tools);
    if (receipt.outcome !== "suspended") throw new Error("suspended base did not suspend");
    out.set("suspended", { id: "suspended", evidence: await exportProcessEvidence(snapshot, frozenSource(store), tools), snapshot, store, receipt });
  }
  {
    const store = new MemoryStore();
    const tools = WAIT_TOOLS();
    const program = manifest([{ id: "wait", kind: "tool", tool: "fixture.wait.v1" }]);
    const { snapshot } = await execute(store, program, {}, tools);
    const unresolved = await intent(store, snapshot);
    out.set("uncertain", { id: "uncertain", evidence: await exportProcessEvidence(unresolved, frozenSource(store), tools), snapshot: unresolved, store });
  }
  {
    const store = new MemoryStore();
    const ref = await store.putValue({ retained: "dependency" });
    const program = manifest([{ id: "input", kind: "input", outputs: { ref: "ref" } }]);
    const { snapshot, receipt } = await execute(store, program, { input: { ref } });
    if (receipt.outcome !== "complete") throw new Error("value-dep base did not complete");
    out.set("value-dep", { id: "value-dep", evidence: await exportProcessEvidence(snapshot, frozenSource(store)), snapshot, store, receipt });
  }
  return out;
}

export type { ProcessEvidence, ProcessRecord, ProcessSnapshot, Digest };
