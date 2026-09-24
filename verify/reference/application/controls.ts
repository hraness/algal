/** Deliberately false test projections. These never mutate product code. */
import type { History, Trace } from "./schema";
export const MUTANTS = ["ignore-stale-head", "ignore-operation-binding", "omit-started", "forget-retained-dispatch", "change-old-configuration"] as const;
export type Mutant = typeof MUTANTS[number];
export function mutate(history: History, trace: Trace, mutant: Mutant): Trace {
    const changed = structuredClone(trace);
    for (const row of changed.steps) {
        const action = history.commands[row.id]!.action;
        if ((mutant === "ignore-stale-head" || mutant === "ignore-operation-binding") && row.outcome.status === "error" && row.outcome.message === (mutant === "ignore-stale-head" ? "Stale application head" : "Operation already claims another request")) {
            row.outcome = { status: "ok", value: null };
            break;
        }
        if (mutant === "omit-started") {
            const callback = row.callbacks.find(c => c.method === "dispatch");
            if (callback) {
                callback.durable = null;
                break;
            }
        }
        if (mutant === "forget-retained-dispatch" && action.kind === "commit" && action.transition === "memory") {
            const retained = row.after.intents[action.app].find(i => i.dispatch && i.dispatch.status !== "settled" && i.source !== row.after.applications[action.app].at(-1)?.digest);
            if (retained) {
                retained.dispatch = null;
                retained.rawDispatch = null;
                break;
            }
        }
        if (mutant === "change-old-configuration") {
            const callback = row.callbacks.find(c => c.method === "reconcile" && c.source !== c.current);
            if (callback) {
                callback.record.configurationDigest = changed.fixtures.configurations.find(c => c !== callback.record.configurationDigest)!;
                break;
            }
        }
    }
    return changed;
}
