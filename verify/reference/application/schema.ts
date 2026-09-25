/** Test-only closed history extension; not a product wire contract. */
import { array, boolean, digest, member, natural, record, requireThat, string } from "../../lib/schema";
import { hashJson, stableJson } from "../../lib/files";
export { hashJson, stableJson };
/** A syntactically valid shrink can lose a dynamically successful reference.
 * This typed rejection is distinct from a failed tool or filesystem observer. */
export class InvalidHistory extends Error {
    constructor(message: string, options?: ErrorOptions) { super(message, options); this.name = "InvalidHistory"; }
}
export const LIMITS = { commands: 24, histories: 64, transcriptBytes: 1048576, callbacks: 32 } as const;
export type Bit = 0 | 1;
export type Key = 0 | 1 | 2 | 3;
export type Json = null | boolean | number | string | Json[] | {
    [key: string]: Json;
};
export type ObjectValue = {
    [key: string]: Json;
};
export type Fault = "none" | "prepared" | "head-published";
export type ResultChoice = "settled" | "blocked" | "unknown";
export type Action = {
    kind: "create";
    app: Bit;
    key: Key;
    memory: Bit;
    fault: Fault;
} | {
    kind: "commit";
    app: Bit;
    key: Key;
    transition: "memory" | "investigate";
    head: number;
    memory: Bit;
    intents: "none" | "deliveries" | "writer";
    fault: Fault;
} | {
    kind: "repeat";
    source: number;
    conflict: boolean;
} | {
    kind: "scan";
    app: Bit;
    configuration: Bit;
    batch: 1 | 2;
    deny: "none" | "first" | "all";
    results: [
        ResultChoice,
        ResultChoice
    ];
    access: "observe" | "external-write";
} | {
    kind: "reconcile";
    app: Bit;
    source: number;
    ordinal: Bit;
    configuration: Bit;
    plan: Bit;
    deny: boolean;
    result: ResultChoice;
} | {
    kind: "inspect";
    app: Bit;
} | {
    kind: "restart";
};
export type Command = {
    id: number;
    action: Action;
};
export type History = {
    contract: "algal.application-history.v1";
    generator: "state-selected-v1";
    seed: number;
    profile: "delivery" | "writer";
    commands: Command[];
};
export type Outcome = {
    status: "ok";
    value: Json;
} | {
    status: "error";
    code: string;
    message: string;
    uncertain: boolean;
    details: Json;
    wake: string[];
};
export type Snapshot = {
    digest: string;
    state: ObjectValue;
    transition: ObjectValue;
    revision: ObjectValue;
};
export type Intent = {
    ref: string;
    source: string;
    work: ObjectValue;
    dispatch: ObjectValue | null;
    rawDispatch: ObjectValue | null;
    effect: {
        bytes: number;
        sha256: string;
        text: string;
    } | null;
};
export type Observation = {
    applications: [
        Snapshot[],
        Snapshot[]
    ];
    intents: [
        Intent[],
        Intent[]
    ];
    effectFiles: string[];
};
export type Callback = {
    method: "dispatch" | "reconcile";
    intent: string;
    source: string;
    current: string;
    record: ObjectValue;
    durable: ObjectValue | null;
    effectBefore: string | null;
    effectAfter: string | null;
};
export type Step = {
    id: number;
    outcome: Outcome;
    callbacks: Callback[];
    after: Observation;
};
export type Fixtures = {
    revisions: [
        ObjectValue,
        ObjectValue
    ];
    revisionRefs: [
        string,
        string
    ];
    memories: [
        string,
        string
    ];
    messages: [
        string,
        string
    ];
    manifest: string;
    input: string;
    profiles: [
        string,
        string
    ];
    configurations: [
        string,
        string
    ];
    recipient: string;
};
export type Trace = {
    contract: "algal.application-trace.v1";
    runtime: "bun" | "native";
    historyDigest: string;
    fixtures: Fixtures;
    initial: Observation;
    steps: Step[];
};
const bounded = (v: unknown, max: number, label: string) => { const n = natural(v, label); requireThat(n <= max, `${label}: bound`); return n; };
const bit = (v: unknown) => bounded(v, 1, "finite bit") as Bit;
const key = (v: unknown) => bounded(v, 3, "operation key") as Key;
const reference = (v: unknown, id: number) => { const n = natural(v, "command reference"); requireThat(n < id, "reference must precede command"); return n; };
const fault = (v: unknown) => member(v, ["none", "prepared", "head-published"], "fault");
const result = (v: unknown) => member(v, ["settled", "blocked", "unknown"], "callback result");
export function parseHistory(raw: unknown): History {
    requireThat(Buffer.byteLength(stableJson(raw)) <= 32768, "history bytes");
    const h = record(raw, ["contract", "generator", "seed", "profile", "commands"], "history");
    requireThat(h.contract === "algal.application-history.v1" && h.generator === "state-selected-v1", "history contract/generator");
    const commands = array(h.commands, "commands", 1, LIMITS.commands).map((raw, id): Command => {
        const c = record(raw, ["id", "action"], "command");
        requireThat(c.id === id, "contiguous command IDs");
        requireThat(c.action !== null && typeof c.action === "object", "action object");
        const kind = (c.action as {
            kind?: unknown;
        }).kind;
        let action: Action;
        switch (kind) {
            case "create": {
                const a = record(c.action, ["kind", "app", "key", "memory", "fault"], "create");
                action = { kind, app: bit(a.app), key: key(a.key), memory: bit(a.memory), fault: fault(a.fault) };
                break;
            }
            case "commit": {
                const a = record(c.action, ["kind", "app", "key", "transition", "head", "memory", "intents", "fault"], "commit");
                action = { kind, app: bit(a.app), key: key(a.key), transition: member(a.transition, ["memory", "investigate"], "transition"), head: reference(a.head, id), memory: bit(a.memory), intents: member(a.intents, ["none", "deliveries", "writer"], "intents"), fault: fault(a.fault) };
                break;
            }
            case "repeat": {
                const a = record(c.action, ["kind", "source", "conflict"], "repeat");
                action = { kind, source: reference(a.source, id), conflict: boolean(a.conflict, "conflict") };
                break;
            }
            case "scan": {
                const a = record(c.action, ["kind", "app", "configuration", "batch", "deny", "results", "access"], "scan");
                const batch = natural(a.batch, "batch");
                requireThat(batch === 1 || batch === 2, "batch domain");
                action = { kind, app: bit(a.app), configuration: bit(a.configuration), batch, deny: member(a.deny, ["none", "first", "all"], "denial"), results: array(a.results, "results", 2, 2).map(result) as [
                        ResultChoice,
                        ResultChoice
                    ], access: member(a.access, ["observe", "external-write"], "access") };
                break;
            }
            case "reconcile": {
                const a = record(c.action, ["kind", "app", "source", "ordinal", "configuration", "plan", "deny", "result"], "reconcile");
                action = { kind, app: bit(a.app), source: reference(a.source, id), ordinal: bit(a.ordinal), configuration: bit(a.configuration), plan: bit(a.plan), deny: boolean(a.deny, "deny"), result: result(a.result) };
                break;
            }
            case "inspect": {
                const a = record(c.action, ["kind", "app"], "inspect");
                action = { kind, app: bit(a.app) };
                break;
            }
            case "restart":
                record(c.action, ["kind"], "restart");
                action = { kind };
                break;
            default: throw new Error("Unknown application history action");
        }
        return { id, action };
    });
    for (const c of commands) {
        const a = c.action, source = a.kind === "commit" ? a.head : a.kind === "repeat" || a.kind === "reconcile" ? a.source : null;
        if (source !== null)
            requireThat(["create", "commit", "repeat"].includes(commands[source]!.action.kind), "reference must name a commit operation");
    }
    return { contract: "algal.application-history.v1", generator: "state-selected-v1", seed: bounded(h.seed, 4294967295, "seed"), profile: member(h.profile, ["delivery", "writer"], "profile"), commands };
}
/** Metadata trust boundary: finite JSON only; product admission is not reused. */
export function json(raw: unknown, depth = 0): Json {
    requireThat(depth <= 16, "trace depth");
    if (raw === null || typeof raw === "boolean" || typeof raw === "string")
        return raw;
    if (typeof raw === "number") {
        requireThat(Number.isSafeInteger(raw), "trace safe integer");
        return raw;
    }
    if (Array.isArray(raw)) {
        requireThat(raw.length <= 128, "trace array bound");
        return raw.map(x => json(x, depth + 1));
    }
    requireThat(raw !== null && typeof raw === "object", "trace JSON");
    requireThat(Object.getPrototypeOf(raw) === Object.prototype || Object.getPrototypeOf(raw) === null, "trace plain record");
    const entries = Object.entries(raw);
    requireThat(entries.length <= 32, "trace record bound");
    return Object.fromEntries(entries.map(([k, v]) => [k, json(v, depth + 1)]));
}
export function object(raw: unknown): ObjectValue { const value = json(raw); requireThat(value !== null && typeof value === "object" && !Array.isArray(value), "expected JSON object"); return value; }
export function parseTrace(raw: unknown, history: History): Trace {
    requireThat(Buffer.byteLength(stableJson(raw)) <= LIMITS.transcriptBytes, "trace byte bound");
    const t = record(raw, ["contract", "runtime", "historyDigest", "fixtures", "initial", "steps"], "trace");
    requireThat(t.contract === "algal.application-trace.v1" && (t.runtime === "bun" || t.runtime === "native") && digest(t.historyDigest, "history digest") === hashJson(history), "trace/history binding");
    const fixture = record(t.fixtures, ["revisions", "revisionRefs", "memories", "messages", "manifest", "input", "profiles", "configurations", "recipient"], "fixtures");
    const pair = (v: unknown) => array(v, "fixture pair", 2, 2).map(v => digest(v, "fixture digest")) as [
        string,
        string
    ];
    const fixtures: Fixtures = { revisions: array(fixture.revisions, "revisions", 2, 2).map(object) as [
            ObjectValue,
            ObjectValue
        ], revisionRefs: pair(fixture.revisionRefs), memories: pair(fixture.memories), messages: pair(fixture.messages), manifest: digest(fixture.manifest, "manifest"), input: digest(fixture.input, "input"), profiles: pair(fixture.profiles), configurations: pair(fixture.configurations), recipient: string(fixture.recipient, "recipient", 256) };
    const observe = (raw: unknown): Observation => {
        const o = record(raw, ["applications", "intents", "effectFiles"], "observation");
        const applications = array(o.applications, "applications", 2, 2).map(rows => array(rows, "states", 0, 4).map(raw => { const r = record(raw, ["digest", "state", "transition", "revision"], "snapshot"); return { digest: digest(r.digest, "state digest"), state: object(r.state), transition: object(r.transition), revision: object(r.revision) }; })) as [
            Snapshot[],
            Snapshot[]
        ];
        const intents = array(o.intents, "intent apps", 2, 2).map(rows => array(rows, "intents", 0, 4).map(raw => { const r = record(raw, ["ref", "source", "work", "dispatch", "rawDispatch", "effect"], "intent"); let effect: Intent["effect"] = null; if (r.effect !== null) {
            const e = record(r.effect, ["bytes", "sha256", "text"], "effect");
            effect = { bytes: bounded(e.bytes, 4096, "effect bytes"), sha256: digest(e.sha256, "effect hash"), text: string(e.text, "effect text", 4096) };
        } return { ref: digest(r.ref, "intent ref"), source: digest(r.source, "intent source"), work: object(r.work), dispatch: r.dispatch === null ? null : object(r.dispatch), rawDispatch: r.rawDispatch === null ? null : object(r.rawDispatch), effect }; })) as [
            Intent[],
            Intent[]
        ];
        const effectFiles = array(o.effectFiles, "effect file names", 0, LIMITS.callbacks).map(v => { const name = string(v, "effect file", 68); requireThat(/^[a-f0-9]{64}\.txt$/.test(name), "effect file identity"); return name; });
        requireThat(new Set(effectFiles).size === effectFiles.length && effectFiles.every((n, i) => i === 0 || effectFiles[i - 1]! < n), "sorted unique effect files");
        return { applications, intents, effectFiles };
    };
    const outcome = (raw: unknown): Outcome => { requireThat(raw !== null && typeof raw === "object", "outcome"); if ((raw as {
        status?: unknown;
    }).status === "ok") {
        const r = record(raw, ["status", "value"], "outcome");
        return { status: "ok", value: json(r.value) };
    } const r = record(raw, ["status", "code", "message", "uncertain", "details", "wake"], "error"); requireThat(r.status === "error", "outcome status"); return { status: "error", code: string(r.code, "code", 64), message: string(r.message, "message", 4096), uncertain: boolean(r.uncertain, "uncertainty"), details: json(r.details), wake: array(r.wake, "wake", 0, 32).map(v => string(v, "wake entry", 256)) }; };
    const steps = array(t.steps, "steps", history.commands.length, history.commands.length).map((raw, id): Step => { const s = record(raw, ["id", "outcome", "callbacks", "after"], "step"); requireThat(s.id === id, "step index"); const callbacks = array(s.callbacks, "callbacks", 0, LIMITS.callbacks).map(raw => { const c = record(raw, ["method", "intent", "source", "current", "record", "durable", "effectBefore", "effectAfter"], "callback"); const maybe = (v: unknown) => v === null ? null : string(v, "effect text", 4096); return { method: member(c.method, ["dispatch", "reconcile"], "callback method"), intent: digest(c.intent, "callback intent"), source: digest(c.source, "callback source"), current: digest(c.current, "callback current"), record: object(c.record), durable: c.durable === null ? null : object(c.durable), effectBefore: maybe(c.effectBefore), effectAfter: maybe(c.effectAfter) }; }); return { id, outcome: outcome(s.outcome), callbacks, after: observe(s.after) }; });
    requireThat(steps.reduce((total, row) => total + row.callbacks.length, 0) <= LIMITS.callbacks, "history total callback bound");
    return { contract: "algal.application-trace.v1", runtime: t.runtime, historyDigest: t.historyDigest as string, fixtures, initial: observe(t.initial), steps };
}
