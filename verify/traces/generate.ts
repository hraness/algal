import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BunTraceRuntime } from "./bun";
import { checkTrace, observation, TraceMismatch } from "./check";
import { stableJson } from "../lib/files";
import { BASE_VALUES } from "./shared";
import { LIMITS, type Action, type Command, type Fault, type History, type Key, type Name, type Outcome, type Snapshot, type Step, type Trace, type Value } from "./schema";

export class GenerationFailure extends Error {
  constructor(readonly history: History, readonly directory: string, cause: unknown) { super(`stateful history failed; retained at ${directory}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause }); this.name = "GenerationFailure"; }
}

export const GENERATOR_VERSION = "algal.trace-generator.xorshift32.v1";
export class Random {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0 || 0x9e3779b9; }
  draw(bound: number): number { let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state = x >>> 0; return this.state % bound; }
}
function found(o: Outcome): boolean { return o.status === "ok" && o.value !== null && typeof o.value === "object" && !Array.isArray(o.value) && o.value.found === true; }
function rows(o: Outcome): Value[] | null { return o.status === "ok" && Array.isArray(o.value) ? o.value : null; }
function hasMemory(snapshot: Snapshot, n: Name): boolean { return found(observation(snapshot, { kind: "application-memory", memory: n })); }

/** Deterministic choices consume the preceding real observation. The same
 * decision routine re-admits the archived seed/history relation; semantic
 * outcomes remain checked independently by checkTrace. */
export class StatefulGenerator {
  private readonly rng: Random;
  private readonly priorHeads: { step: number; app: Name }[] = [];
  private readonly usedKeys = new Map<Name, Set<Key>>([[0, new Set()], [1, new Set()]]);
  private readonly successful: Command[] = [];
  constructor(seed: number) { this.rng = new Random(seed); }
  next(id: number, state: Snapshot): Command {
    const key = this.rng.draw(4) as Key, value = BASE_VALUES[this.rng.draw(BASE_VALUES.length)]!, box = this.rng.draw(2) as Name, app = this.rng.draw(2) as Name;
    const availableBoxes = ([0, 1] as const).filter(box => found(observation(state, { kind: "mailbox-config", box })));
    const selectedBox = availableBoxes.length ? availableBoxes[this.rng.draw(availableBoxes.length)]! : box;
    let action: Action, fault: Fault | null = null;
    switch (this.rng.draw(18)) {
      case 0: action = { kind: "store-put", value }; break;
      case 1: action = { kind: "store-get", value }; break;
      case 2: action = { kind: "effect-put", key, value }; break;
      case 3: action = { kind: "effect-get", key }; break;
      case 4: action = { kind: "slot-set", key, value }; break;
      case 5: action = { kind: "slot-get", key }; break;
      case 6: action = availableBoxes.length ? { kind: "mailbox-send", box: selectedBox, key, value } : { kind: "mailbox-create", box, capacity: this.rng.draw(2) ? 1 : 2 }; break;
      case 7: action = availableBoxes.length ? { kind: "mailbox-receive", box: selectedBox } : { kind: "mailbox-create", box, capacity: 2 }; break;
      case 8: action = availableBoxes.length ? { kind: "mailbox-pending", box: selectedBox } : { kind: "mailbox-create", box, capacity: 1 }; break;
      case 9: {
        const retries = this.successful.filter(c => ["store-put", "effect-put", "mailbox-send", "application-create", "application-commit"].includes(c.action.kind));
        action = retries.length ? structuredClone(retries[this.rng.draw(retries.length)]!.action) : { kind: "store-put", value }; break;
      }
      case 10: action = availableBoxes.length ? { kind: "mailbox-revoke", box: selectedBox, right: this.rng.draw(2) ? "send" : "receive" } : { kind: "mailbox-create", box, capacity: 1 }; break;
      case 11: {
        const current = rows(observation(state, { kind: "application-history", app }));
        const heads = this.priorHeads.filter(h => h.app === app);
        action = current?.length && heads.length ? { kind: "application-commit", app, key, head: heads.at(-1)!.step, memory: this.rng.draw(2) as Name } : { kind: "application-create", app, key, memory: 0 }; break;
      }
      case 12: action = { kind: "application-inspect", app }; break;
      case 13: {
        const heads = this.priorHeads.filter(h => h.app === app);
        action = { kind: "application-commit", app, key, head: heads.length ? heads[this.rng.draw(heads.length)]!.step : "missing", memory: 0 }; break;
      }
      case 14: action = { kind: "restart" }; break;
      case 15: {
        const candidates = state.files.filter(f => f.exists && ["value", "effect", "slot", "application-memory"].includes(f.target.kind));
        action = candidates.length ? { kind: "tamper", target: candidates[this.rng.draw(candidates.length)]!.target, mode: this.rng.draw(2) ? "corrupt" : "remove" } : { kind: "store-put", value }; break;
      }
      case 16: {
        const heads = this.priorHeads.filter(h => h.app === app);
        action = heads.length ? { kind: "application-commit", app, key, head: heads.at(-1)!.step, memory: "missing" } : { kind: "application-create", app, key, memory: "missing" }; break;
      }
      default: {
        const fresh = ([0, 1, 2, 3] as const).filter(k => !this.usedKeys.get(app)!.has(k));
        const current = rows(observation(state, { kind: "application-history", app })), heads = this.priorHeads.filter(h => h.app === app);
        if (this.rng.draw(3) === 0 && fresh.length && current !== null && hasMemory(state, 0) && (!current.length || heads.length)) {
          action = current.length ? { kind: "application-commit", app, key: fresh[0]!, head: heads.at(-1)!.step, memory: 0 } : { kind: "application-create", app, key: fresh[0]!, memory: 0 };
          fault = { site: "application", point: (["selected", "admitted", "prepared", "head-published"] as const)[this.rng.draw(4)]!, mode: this.rng.draw(2) ? "error" : "cancel" };
        } else {
          action = { kind: "slot-set", key, value };
          fault = { site: "fs", step: (["write-temp", "file-sync", "replace", "dir-sync", "unlink-temp"] as const)[this.rng.draw(5)]!, phase: this.rng.draw(2) ? "before" : "after", occurrence: 1, mode: this.rng.draw(2) ? "error" : "cancel" };
        }
      }
    }
    return { id, action, fault };
  }
  observe(command: Command, row: Step): void {
    if ((command.action.kind === "application-create" || command.action.kind === "application-commit") && row.events.some(e => e.kind === "application" && e.point === "prepared")) this.usedKeys.get(command.action.app)!.add(command.action.key);
    if (row.outcome.status === "ok") {
      this.successful.push(command);
      if ((command.action.kind === "application-create" || command.action.kind === "application-commit" || command.action.kind === "application-inspect") && row.outcome.value !== null) this.priorHeads.push({ step: command.id, app: command.action.app });
    }
  }
}
export function checkGeneratedHistory(history: History, trace: Trace): void {
  const generator = new StatefulGenerator(history.seed);
  for (const command of history.commands) {
    const state = command.id === 0 ? trace.initial : trace.steps[command.id - 1]!.after;
    if (stableJson(generator.next(command.id, state)) !== stableJson(command)) throw new TraceMismatch("generator-history-binding", command.id, "seed/state-dependent command differs from concrete history");
    generator.observe(command, trace.steps[command.id]!);
  }
}

/** Commands are drawn only after the previous real step and exact oracle check. */
export async function generateBun(seed: number, length: number = LIMITS.commands, ownedRoot?: string): Promise<{ history: History; trace: Trace; witnesses: string[] }> {
  if (!Number.isInteger(length) || length < 1 || length > LIMITS.commands) throw new Error("generated command bound");
  const root = ownedRoot ?? await mkdtemp(join(tmpdir(), "algal-trace-generated-"));
  const history: History = { contract: "algal.verification-history.v1", seed: seed >>> 0, commands: [] };
  const generator = new StatefulGenerator(seed);
  let failed = false, runtime: BunTraceRuntime | undefined;
  try {
    runtime = await BunTraceRuntime.create(root);
    let state = await runtime.snapshot();
    for (let id = 0; id < length; id++) {
      const command = generator.next(id, state); history.commands.push(command);
      const row = await runtime.step(command); state = row.after;
      generator.observe(command, row);
      checkTrace(history, runtime.finish(history));
    }
    const trace = runtime.finish(history), admitted = checkTrace(history, trace);
    return { history, trace, witnesses: admitted.witnesses };
  } catch (error) {
    failed = true;
    await writeFile(join(root, "failure-history.json"), JSON.stringify(history, null, 2));
    try { if (runtime) await writeFile(join(root, "failure-trace.json"), JSON.stringify(runtime.finish(history))); } catch { /* keep the original failure and incomplete history */ }
    throw new GenerationFailure(history, root, error);
  } finally { if (!failed && !ownedRoot) await rm(root, { recursive: true, force: true }); }
}
