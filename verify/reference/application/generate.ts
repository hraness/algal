import { operation } from "./data";
import { hashJson, stableJson, type Action, type Bit, type Command, type History, type Observation, type Step, type Trace } from "./schema";
class Random {
    private state: number;
    constructor(seed: number) { this.state = seed >>> 0 || 0x9e3779b9; }
    draw(n: number): number { let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state = x >>> 0; return this.state % n; }
}
/** A finite staged grammar, with every reference and memory choice selected
 * from the preceding real observation. Stages make semantic reachability an
 * obligation rather than relying on a lucky seed. Random choices vary app,
 * memory, configuration, late scan batch and callback outcomes. */
export class Generator {
    private readonly random: Random;
    private readonly primary: Bit;
    private readonly initialMemory: Bit;
    private readonly configuration: Bit;
    private readonly prior: {
        command: Command;
        row: Step;
    }[] = [];
    constructor(seed: number, private readonly profile: History["profile"]) { this.random = new Random(seed); this.primary = this.random.draw(2) as Bit; this.initialMemory = this.random.draw(2) as Bit; this.configuration = this.random.draw(2) as Bit; }
    observe(command: Command, row: Step) { this.prior.push({ command, row }); }
    next(id: number, state: Observation, memories: [
        string,
        string
    ]): Command {
        const app = this.primary, other = (1 - app) as Bit, configuration = this.configuration;
        const head = (which: Bit) => state.applications[which].at(-1);
        const memory = (which: Bit): Bit => head(which)?.state.memory === memories[1] ? 1 : 0;
        const ref = (which: Bit, key: number): number => { const wanted = state.applications[which].find(s => s.transition.operation === operation(which, key)); if (!wanted)
            throw new Error("Generator prerequisite state absent"); const found = this.prior.find(({ row }) => row.after.applications[which].some(s => s.digest === wanted.digest)); if (!found)
            throw new Error("Generator prerequisite command absent"); return found.command.id; };
        const current = (which: Bit): number => { const wanted = head(which); if (!wanted)
            throw new Error("Generator selected app absent"); const found = this.prior.find(({ row }) => row.after.applications[which].some(s => s.digest === wanted.digest)); if (!found)
            throw new Error("Generator current reference absent"); return found.command.id; };
        const scan = (which: Bit, deny: "none" | "all" = "none", batch: 1 | 2 = 1): Action => ({ kind: "scan", app: which, configuration, batch, deny, results: [this.profile === "delivery" ? "blocked" : "unknown", "unknown"], access: "external-write" });
        const reconcile = (plan: Bit, deny = false, config: Bit = configuration): Action => ({ kind: "reconcile", app, source: ref(app, 1), ordinal: 0, configuration: config, plan, deny, result: "settled" });
        let action: Action;
        switch (id) {
            case 0:
                action = { kind: "create", app, key: 0, memory: this.initialMemory, fault: "none" };
                break;
            case 1:
                action = { kind: "commit", app, key: 1, transition: "investigate", head: current(app), memory: memory(app), intents: this.profile === "delivery" ? "deliveries" : "writer", fault: "none" };
                break;
            case 2:
                action = scan(app, "all");
                break;
            case 3:
                action = scan(app);
                break;
            case 4:
                action = scan(app);
                break;
            case 5:
                action = { kind: "commit", app, key: 2, transition: "memory", head: current(app), memory: (1 - memory(app)) as Bit, intents: "none", fault: "none" };
                break;
            case 6:
                action = reconcile(0, false, (1 - configuration) as Bit);
                break;
            case 7:
                action = reconcile(1);
                break;
            case 8:
                action = reconcile(0, true);
                break;
            case 9:
                action = reconcile(0);
                break;
            case 10:
                action = { kind: "repeat", source: ref(app, 1), conflict: false };
                break;
            case 11:
                action = { kind: "repeat", source: ref(app, 1), conflict: true };
                break;
            case 12:
                action = { kind: "commit", app, key: 3, transition: "memory", head: ref(app, 0), memory: this.random.draw(2) as Bit, intents: "none", fault: "none" };
                break;
            case 13:
                action = { kind: "restart" };
                break;
            case 14:
                action = scan(app, "none", this.random.draw(2) === 0 ? 1 : 2);
                break;
            case 15:
                action = { kind: "create", app: other, key: 0, memory: this.random.draw(2) as Bit, fault: "none" };
                break;
            case 16:
                action = { kind: "commit", app: other, key: 1, transition: "investigate", head: current(other), memory: memory(other), intents: "writer", fault: "none" };
                break;
            case 17:
                action = { kind: "commit", app: other, key: 2, transition: "memory", head: current(other), memory: (1 - memory(other)) as Bit, intents: "none", fault: "none" };
                break;
            case 18:
                action = scan(other);
                break;
            case 19:
                action = { kind: "repeat", source: ref(other, 0), conflict: false };
                break;
            case 20:
                action = { kind: "commit", app: other, key: 3, transition: "memory", head: current(other), memory: this.random.draw(2) as Bit, intents: "none", fault: "prepared" };
                break;
            case 21:
                action = { kind: "repeat", source: 20, conflict: false };
                break;
            case 22:
                action = { kind: "inspect", app: this.random.draw(2) as Bit };
                break;
            case 23:
                action = { kind: "commit", app, key: 3, transition: "memory", head: current(app), memory: this.random.draw(2) as Bit, intents: "none", fault: "head-published" };
                break;
            default: throw new Error("Generator command bound");
        }
        return { id, action };
    }
}
export function checkGenerated(history: History, trace: Trace): void {
    const generator = new Generator(history.seed, history.profile);
    for (const command of history.commands) {
        const state = command.id === 0 ? trace.initial : trace.steps[command.id - 1]!.after;
        if (stableJson(generator.next(command.id, state, trace.fixtures.memories)) !== stableJson(command))
            throw new Error("Generator seed/history/observation binding differs");
        generator.observe(command, trace.steps[command.id]!);
    }
}
export const REQUIRED = ["create", "investigate", "memory", "host-denied", "dispatch-unknown", "reconcile-settled", "old-source-reconcile", "advance-with-retained-dispatch", "configuration-drift-denied", "plan-drift-denied", "reconcile-host-denied", "exact-retry", "operation-conflict", "stale-head", "restart", "retained-without-repeat", "stale-writer-denied", "orphan-prepared", "head-acknowledgment-uncertain"] as const;
export function requireCoverage(witnesses: string[], profile: History["profile"]): void { const wanted = [...REQUIRED, ...profile === "delivery" ? ["dispatch-blocked", "retained-does-not-spend-batch"] : []]; for (const w of wanted)
    if (!witnesses.includes(w))
        throw new Error(`Missing required positive witness: ${w}`); }
export const generatorIdentity = hashJson({ contract: "algal.application-history.v1", generator: "state-selected-v1", profiles: ["delivery", "writer"], commands: 24 });
