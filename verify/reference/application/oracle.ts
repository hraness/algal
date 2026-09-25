/** Independent finite projection. No product lifecycle/admission/dispatch imports.
 * Hashing and finite fixture bytes are declared premises; observed success is
 * never used to decide what should have committed or acquired effect authority. */
import { hashBytes } from "../../lib/files";
import { appName, effectText, intentSpecs, operation } from "./data";
import { hashJson, stableJson, InvalidHistory, type Bit, type Callback, type Command, type Fixtures, type History, type Intent, type Json, type ObjectValue, type Observation, type Outcome, type ResultChoice, type Snapshot, type Step, type Trace } from "./schema";
export class HistoryMismatch extends Error {
    constructor(readonly property: string, readonly step: number, message: string, readonly signature: string = property) { super(`${property} at ${step}: ${message}`); this.name = "HistoryMismatch"; }
}
/** Stable across command renumbering, but not across unrelated expected errors
 * or success/refusal reversals. Full errors include uncertainty and message. */
export function outcomeSignature(command: Command, expected: Outcome, actual: Outcome): string {
    const valueKind = (value: Json): Json => {
        if (Array.isArray(value)) return { array: value.map(valueKind) };
        if (value && typeof value === "object") return {
            contract: value.contract ?? null,
            status: value.status ?? null,
            kind: value.kind ?? (value.transition && typeof value.transition === "object" && !Array.isArray(value.transition) ? value.transition.kind ?? null : null),
            snapshot: Object.hasOwn(value, "state") && Object.hasOwn(value, "digest"),
        };
        return { type: value === null ? "null" : typeof value };
    };
    const shape = (outcome: Outcome) => outcome.status === "error" ? outcome : { status: "ok", valueKind: valueKind(outcome.value) };
    const action = command.action.kind === "commit" ? `commit:${command.action.transition}` : command.action.kind;
    return hashJson({ property: "exact-outcome", action, expected: shape(expected), actual: shape(actual) });
}
const same = (a: unknown, b: unknown) => stableJson(a) === stableJson(b);
const ok = (value: unknown): Outcome => ({ status: "ok", value: structuredClone(value) as Json });
const error = (code: string, message: string, uncertain = false, details: Json = null): Outcome => ({ status: "error", code, message, uncertain, details, wake: [] });
type ModelIntent = {
    ref: string;
    source: Snapshot;
    work: ObjectValue;
    record: ObjectValue | null;
    effect: string | null;
};
export class Projection {
    readonly witnesses = new Set<string>();
    private readonly states: [
        Snapshot[],
        Snapshot[]
    ] = [[], []];
    private readonly intents: [
        ModelIntent[],
        ModelIntent[]
    ] = [[], []];
    private readonly requests = new Map<number, ObjectValue>();
    private readonly returnedHeads = new Map<number, string>();
    private readonly operations = new Map<string, {
        request: string;
        snapshot: Snapshot;
    }>();
    private readonly callbacks: Callback[] = [];
    constructor(private readonly fixtures: Fixtures, private readonly runtime: Trace["runtime"] = "bun") {
        for (const app of [0, 1] as const) {
            if (hashJson(fixtures.revisions[app]) !== fixtures.revisionRefs[app])
                throw new Error("Fixture revision digest mismatch");
        }
        for (const n of [0, 1] as const) {
            if (hashJson({ fixture: "memory", memory: n }) !== fixtures.memories[n] || hashJson({ fixture: "message", message: n }) !== fixtures.messages[n] || hashJson({ profile: n }) !== fixtures.profiles[n] || hashJson({ configuration: n }) !== fixtures.configurations[n])
                throw new Error("Finite fixture binding mismatch");
        }
    }
    private check(property: string, id: number, actual: unknown, expected: unknown, signature = property): void { if (!same(actual, expected))
        throw new HistoryMismatch(property, id, `expected ${stableJson(expected).slice(0, 2048)}; observed ${stableJson(actual).slice(0, 2048)}`, signature); }
    snapshot(): Observation {
        const intents = this.intents.map(rows => rows.map((r): Intent => ({ ref: r.ref, source: r.source.digest, work: r.work, dispatch: r.record, rawDispatch: r.record, effect: r.effect === null ? null : { bytes: Buffer.byteLength(r.effect), sha256: hashBytes(r.effect), text: r.effect } }))) as [
            Intent[],
            Intent[]
        ];
        const effectFiles = this.intents.flat().filter(i => i.effect !== null).map(i => `${i.ref.slice(7)}.txt`).sort();
        return structuredClone({ applications: this.states, intents, effectFiles });
    }
    checkInitial(actual: Observation): void { this.check("initial-empty", -1, actual, this.snapshot()); }
    private materialize(c: Command): ObjectValue {
        const a = c.action;
        if (a.kind === "repeat") {
            const prior = this.requests.get(a.source);
            if (!prior)
                throw new InvalidHistory("Unresolved model repeat request");
            return { ...structuredClone(prior), ...(a.conflict ? { memory: prior.memory === this.fixtures.memories[0] ? this.fixtures.memories[1] : this.fixtures.memories[0] } : {}) };
        }
        if (a.kind !== "create" && a.kind !== "commit")
            throw new Error("Not a commit");
        const head = a.kind === "create" ? null : this.returnedHeads.get(a.head);
        if (head === undefined)
            throw new InvalidHistory("Unresolved model head");
        return { application: appName(a.app), operation: operation(a.app, a.key), kind: a.kind === "create" ? "create" : a.transition, expectedHead: head, revision: this.fixtures.revisionRefs[a.app], memory: this.fixtures.memories[a.memory], intents: intentSpecs(a.kind === "create" ? "none" : a.intents, this.fixtures), evidence: [], causedBy: null };
    }
    private commit(c: Command): Outcome {
        const request = this.materialize(c);
        this.requests.set(c.id, request);
        const app = (request.application === appName(0) ? 0 : 1) as Bit, states = this.states[app], current = states.at(-1), operationKey = `${app}:${request.operation}`, hash = hashJson(request), retained = this.operations.get(operationKey);
        if (retained) {
            if (retained.request !== hash) {
                this.witnesses.add("operation-conflict");
                return error("RECEIPT_MISMATCH", "Operation already claims another request");
            }
            if (states.some(s => s.digest === retained.snapshot.digest)) {
                this.returnedHeads.set(c.id, retained.snapshot.digest);
                this.witnesses.add("exact-retry");
                return ok(retained.snapshot);
            }
        }
        if ((current?.digest ?? null) !== request.expectedHead) {
            this.witnesses.add("stale-head");
            return error("RECEIPT_MISMATCH", "Stale application head");
        }
        if (!current && request.kind !== "create" || current && request.kind === "create")
            return error("RECEIPT_MISMATCH", current ? "Invalid application state succession" : "Invalid application origin");
        if (request.kind === "investigate" && (request.memory !== current?.state.memory || (request.intents as Json[]).length === 0))
            return error("RECEIPT_MISMATCH", "Invalid investigation transition");
        const works = (request.intents as ObjectValue[]).map((spec, ordinal) => ({ contract: "algal.application-intent.v1", application: request.application!, operation: request.operation!, ordinal, ...spec }));
        const transition: ObjectValue = { contract: "algal.application-transition.v1", application: request.application!, operation: request.operation!, request: hash, kind: request.kind!, previous: request.expectedHead!, revision: request.revision!, memory: request.memory!, intents: works.map(hashJson).sort(), evidence: [], causedBy: null };
        const state: ObjectValue = { contract: "algal.application-state.v1", application: request.application!, sequence: states.length, epoch: 0, revision: request.revision!, memory: request.memory!, previous: request.expectedHead!, transition: hashJson(transition) };
        const next: Snapshot = { digest: hashJson(state), state, transition, revision: this.fixtures.revisions[app] };
        if (retained && !same(retained.snapshot, next))
            return error("RECEIPT_MISMATCH", "Prepared operation changed");
        this.operations.set(operationKey, { request: hash, snapshot: next });
        const fault = c.action.kind === "create" || c.action.kind === "commit" ? c.action.fault : "none";
        if (fault === "prepared") {
            this.witnesses.add("orphan-prepared");
            return error("INTERNAL", "History fault at prepared");
        }
        states.push(next);
        this.intents[app].push(...works.map(work => ({ ref: hashJson(work), source: next, work, record: null, effect: null })));
        this.returnedHeads.set(c.id, next.digest);
        this.witnesses.add(String(request.kind));
        if (request.kind === "memory" && this.intents[app].some(i => i.record && i.record.status !== "settled"))
            this.witnesses.add("advance-with-retained-dispatch");
        if (fault === "head-published") {
            this.witnesses.add("head-acknowledgment-uncertain");
            return this.runtime === "native"
                ? error("IO_FAILED", `Application commit acknowledgment uncertain; inspect the exact operation (${String(request.operation)})`, true)
                : error("IO_FAILED", "Application commit acknowledgment uncertain; inspect the exact operation", true, { operation: request.operation! });
        }
        return ok(next);
    }
    private plan(app: Bit, row: ModelIntent, access: "observe" | "external-write"): ObjectValue {
        if (row.work.kind === "deliver")
            return { kind: "delivery", recipient: this.fixtures.recipient, hostProfile: this.fixtures.profiles[0] };
        const process = `a-${hashJson({ contract: "algal.application-process-name.v1", application: appName(app), intent: row.ref }).slice(7, 69)}`;
        return { kind: "episode", binding: { contract: "algal.application-episode.v1", application: appName(app), intent: row.ref, sourceState: row.source.digest, revision: row.source.state.revision!, memory: row.source.state.memory!, epoch: row.source.state.epoch!, entrypoint: "run", manifest: this.fixtures.manifest, arguments: this.fixtures.input, process, maxGenerations: 1, hostProfile: this.fixtures.profiles[0], access } };
    }
    private call(app: Bit, row: ModelIntent, method: "dispatch" | "reconcile", choice: ResultChoice): ObjectValue {
        if (!row.record)
            throw new Error("Model callback without admission");
        const prior = structuredClone(row.record), before = row.effect;
        if (choice !== "blocked" && row.effect === null)
            row.effect = effectText(String(prior.identity));
        this.callbacks.push({ method, intent: row.ref, source: row.source.digest, current: this.states[app].at(-1)!.digest, record: prior, durable: prior, effectBefore: before, effectAfter: row.effect });
        const plan = prior.plan as ObjectValue, binding = plan.binding as ObjectValue;
        const result = choice !== "settled" ? null : plan.kind === "delivery" ? { kind: "delivery", message: row.work.message!, idempotencyKey: prior.identity! } : { kind: "episode", binding: hashJson(binding), process: binding.process! };
        row.record = { ...prior, status: choice === "unknown" ? "uncertain" : choice, result: result === null ? null : hashJson(result), reason: choice === "settled" ? null : choice === "blocked" ? "History callback blocked" : "Dispatcher did not establish settlement; explicit reconciliation required" };
        this.witnesses.add(`${method}-${choice}`);
        if (method === "reconcile" && row.source.digest !== this.states[app].at(-1)!.digest)
            this.witnesses.add("old-source-reconcile");
        return row.record;
    }
    private predict(c: Command): Outcome {
        const a = c.action;
        if (a.kind === "create" || a.kind === "commit" || a.kind === "repeat")
            return this.commit(c);
        if (a.kind === "restart") {
            this.witnesses.add("restart");
            return ok(null);
        }
        if (a.kind === "inspect")
            return ok(this.states[a.app].at(-1) ?? null);
        if (a.kind === "scan") {
            const results: ObjectValue[] = [];
            let attempts = 0;
            let retainedSeen = false;
            for (const row of this.intents[a.app]) {
                if (row.record?.status === "settled")
                    continue;
                if (row.record) {
                    results.push(row.record);
                    retainedSeen = true;
                    this.witnesses.add("retained-without-repeat");
                    continue;
                }
                if (attempts >= a.batch)
                    continue;
                const plan = this.plan(a.app, row, a.access);
                const denial = a.deny === "all" || a.deny === "first" && row.work.ordinal === 0 ? "History host denied intent" : row.work.kind === "start-episode" && a.access === "external-write" && row.source.digest !== this.states[a.app].at(-1)!.digest ? "Stale episode cannot acquire an external writer" : null;
                if (denial) {
                    this.witnesses.add(denial.startsWith("Stale") ? "stale-writer-denied" : "host-denied");
                    results.push({ contract: "algal.application-admission-denied.v1", application: appName(a.app), intent: row.ref, sourceState: row.source.digest, currentState: this.states[a.app].at(-1)!.digest, status: "denied", reason: denial });
                    continue;
                }
                row.record = { contract: "algal.application-dispatch.v1", application: appName(a.app), intent: row.ref, sourceState: row.source.digest, configurationDigest: this.fixtures.configurations[a.configuration], identity: hashJson({ contract: "algal.application-dispatch-identity.v1", application: appName(a.app), intent: row.ref, plan }), plan, status: "started", result: null, reason: null };
                results.push(this.call(a.app, row, "dispatch", a.results[Number(row.work.ordinal) as Bit]));
                attempts++;
                if (retainedSeen && a.batch === 1)
                    this.witnesses.add("retained-does-not-spend-batch");
            }
            return ok(results);
        }
        const source = this.returnedHeads.get(a.source);
        if (!source)
            throw new InvalidHistory("Unresolved model reconcile source");
        const row = this.intents[a.app].find(i => i.source.digest === source && i.work.ordinal === a.ordinal);
        if (!row)
            throw new InvalidHistory("Unresolved model reconcile ordinal");
        if (row.record?.status === "settled")
            return ok(row.record);
        if (!row.record)
            return error(this.runtime === "native" ? "PARSE_FAILED" : "INTERNAL", "Dispatch has not been admitted");
        if (row.record.configurationDigest !== this.fixtures.configurations[a.configuration]) {
            this.witnesses.add("configuration-drift-denied");
            return error("RECEIPT_MISMATCH", "Dispatcher configuration changed");
        }
        if (a.deny) {
            this.witnesses.add("reconcile-host-denied");
            return error("INTERNAL", "History host denied intent");
        }
        if (a.plan === 1) {
            this.witnesses.add("plan-drift-denied");
            return error("RECEIPT_MISMATCH", "Reconciliation cannot change the admitted dispatch plan");
        }
        return ok(this.call(a.app, row, "reconcile", a.result));
    }
    validateDomainCommand(command: Command): void { this.predict(command); }
    /** Pure model output for explicitly synthetic archive-admission fixtures.
     * This is never a target observation and is not used by either runtime adapter. */
    predictedStep(command: Command): Step {
        this.callbacks.length = 0;
        const outcome = this.predict(command);
        return structuredClone({ id: command.id, outcome, callbacks: this.callbacks, after: this.snapshot() });
    }
    step(command: Command, actual: Step): void {
        this.callbacks.length = 0;
        const expected = this.predict(command);
        this.check("exact-outcome", command.id, actual.outcome, expected, outcomeSignature(command, expected, actual.outcome));
        this.check("callback-count", command.id, actual.callbacks.length, this.callbacks.length);
        for (let n = 0; n < this.callbacks.length; n++) {
            const observed = actual.callbacks[n]!, wanted = this.callbacks[n]!;
            this.check("started-before-effect", command.id, observed.durable, wanted.durable);
            this.check("reconcile-configuration-pinned", command.id, observed.record.configurationDigest, wanted.record.configurationDigest);
            this.check("reconcile-plan-pinned", command.id, observed.record.plan, wanted.record.plan);
        }
        this.check("callback-entry-custody", command.id, actual.callbacks, this.callbacks);
        const projected = this.snapshot();
        this.check("selected-history-prefix", command.id, actual.after.applications, projected.applications);
        this.check("retained-dispatch-and-effect", command.id, actual.after.intents, projected.intents);
        this.check("owned-effect-file-inventory", command.id, actual.after.effectFiles, projected.effectFiles);
    }
}
/** Pure candidate-domain preflight: no target or filesystem is touched. */
export function validateHistoryDomain(history: History, fixtures: Fixtures): void {
    const projection = new Projection(fixtures);
    for (const command of history.commands) projection.validateDomainCommand(command);
}
export function checkTrace(history: History, trace: Trace): {
    witnesses: string[];
} {
    if (trace.historyDigest !== hashJson(history) || trace.steps.length !== history.commands.length)
        throw new Error("Trace history/row binding mismatch");
    const model = new Projection(trace.fixtures, trace.runtime);
    model.checkInitial(trace.initial);
    for (const c of history.commands)
        model.step(c, trace.steps[c.id]!);
    return { witnesses: [...model.witnesses].sort() };
}
