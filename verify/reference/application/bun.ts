import { lstat, mkdir, readdir, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { ApplicationService, applicationProcessName, type ApplicationAdmission, type ApplicationCommand, type ApplicationDispatchContext, type ApplicationDispatcher, type ApplicationDispatchPlan } from "../../../src/application";
import { capabilityHandle } from "../../../src/capabilities";
import { parseOrganismManifest } from "../../../src/contract";
import { digestCanonical, type Digest } from "../../../src/digest";
import { hashBytes, readFileBounded } from "../../lib/files";
import { checkTrace } from "./oracle";
import { retainFailure } from "./retention";
import { FixtureCustody, IntendedUnknown } from "./fixture-custody";
import { encodeRecord, LIMITS } from "./bounded";
import { appName, effectText, intentSpecs, operation } from "./data";
import { hashJson, json, object, parseHistory, parseTrace, type Action, type Bit, type Callback, type Command, type Fixtures, type History, type Intent, type Json, type ObjectValue, type Observation, type Outcome, type ResultChoice, type Snapshot, type Step, type Trace } from "./schema";
export class InvalidReference extends Error {
    constructor(message: string) { super(message); this.name = "InvalidReference"; }
}
const ref = (value: unknown) => digestCanonical(value as never);
const missing = (e: unknown) => e instanceof Error && "code" in e && e.code === "ENOENT";
export class BunHistoryDriver {
    private service!: ApplicationService;
    private readonly custody = new FixtureCustody();
    private action: Action = { kind: "restart" };
    private callbacks: Callback[] = [];
    private readonly requests = new Map<number, ApplicationCommand>();
    private readonly heads = new Map<number, Digest>();
    private readonly steps: Step[] = [];
    private initial!: Observation;
    fixtures!: Fixtures;
    private constructor(readonly root: string) { }
    private admission(): ApplicationAdmission {
        return { async admitCommit() { }, admitDispatch: async (context) => {
                const a = this.action;
                if (a.kind !== "scan" && a.kind !== "reconcile")
                    throw new Error("Fixture did not select a dispatch action");
                if (a.kind === "scan" && (a.deny === "all" || a.deny === "first" && context.intent.ordinal === 0) || a.kind === "reconcile" && a.deny)
                    throw new Error("History host denied intent");
                if (context.previousDispatch) {
                    const plan = structuredClone(context.previousDispatch.plan);
                    if (a.kind === "reconcile" && a.plan === 1) {
                        if (plan.kind === "delivery")
                            plan.hostProfile = this.fixtures.profiles[1] as Digest;
                        else
                            plan.binding.hostProfile = this.fixtures.profiles[1] as Digest;
                    }
                    return plan;
                }
                if (context.intent.kind === "deliver")
                    return { kind: "delivery", recipient: this.fixtures.recipient, hostProfile: this.fixtures.profiles[0] };
                const intent = ref(context.intent);
                const plan: ApplicationDispatchPlan = { kind: "episode", binding: { contract: "algal.application-episode.v1", application: context.snapshot.state.application, intent, sourceState: context.snapshot.digest, revision: context.snapshot.state.revision, memory: context.snapshot.state.memory, epoch: context.snapshot.state.epoch, entrypoint: "run", manifest: this.fixtures.manifest as Digest, arguments: context.intent.input, process: applicationProcessName(context.snapshot.state.application, intent), maxGenerations: 1, hostProfile: this.fixtures.profiles[0] as Digest, access: a.kind === "scan" ? a.access : "external-write" } };
                return plan;
            } };
    }
    private reopen(): ApplicationService {
        return new ApplicationService(this.root, this.admission(), { fault: point => { const a = this.action; if ((a.kind === "create" || a.kind === "commit") && a.fault === point)
                throw new Error(`History fault at ${point}`); } });
    }
    static async create(root: string): Promise<BunHistoryDriver> {
        const info = await lstat(root);
        if (!isAbsolute(root) || !info.isDirectory() || info.isSymbolicLink() || (await readdir(root)).length !== 0) throw new Error("Owned empty application history root required");
        const driver = new BunHistoryDriver(root);
        driver.service = driver.reopen();
        const store = driver.service.store;
        const manifest = await store.putManifest(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:history-fixture", name: "History fixture", cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [] }));
        const schema = await store.putValue({ fixture: "schema" }), queries = await store.putValue({ fixture: "queries" }), views = await store.putValue({ fixture: "views" }), runtimeProfile = await store.putValue({ fixture: "runtime" }), evaluationPolicy = await store.putValue({ fixture: "policy" }), applicability = await store.putValue({ fixture: "query" });
        const revisions = ([0, 1] as const).map(app => object({ contract: "algal.application-revision.v1", application: appName(app), parent: null, schema, queries, views, runtimeProfile, evaluationPolicy, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability, maxGenerations: 1, capabilities: [], queries: [applicability] }] })) as [
            ObjectValue,
            ObjectValue
        ];
        const revisionRefs = await Promise.all(revisions.map(r => store.putValue(r))) as [
            string,
            string
        ];
        const memories = await Promise.all(([0, 1] as const).map(memory => store.putValue({ fixture: "memory", memory }))) as [
            string,
            string
        ];
        const messages = await Promise.all(([0, 1] as const).map(message => store.putValue({ fixture: "message", message }))) as [
            string,
            string
        ];
        driver.fixtures = { revisions, revisionRefs, memories, messages, manifest, input: await store.putValue({ fixture: "input" }), profiles: [hashJson({ profile: 0 }), hashJson({ profile: 1 })], configurations: [hashJson({ configuration: 0 }), hashJson({ configuration: 1 })], recipient: capabilityHandle("mailbox-send", { history: true }) };
        await mkdir(join(root, "owned-effects"));
        driver.initial = await driver.observe();
        return driver;
    }
    private async rawDispatch(app: string, intent: string): Promise<ObjectValue | null> {
        try {
            return object(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readFileBounded(this.root, `applications/${app}/outbox/${intent.slice(7)}.json`, 65_536))));
        }
        catch (e) {
            if (missing(e))
                return null;
            throw e;
        }
    }
    private effectPath(intent: string) { return join(this.root, "owned-effects", `${intent.slice(7)}.txt`); }
    private async effect(intent: string): Promise<Intent["effect"]> {
        try {
            const bytes = await readFileBounded(this.root, `owned-effects/${intent.slice(7)}.txt`, 4096);
            return { bytes: bytes.length, sha256: hashBytes(bytes), text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
        }
        catch (e) {
            if (missing(e))
                return null;
            throw e;
        }
    }
    async observe(): Promise<Observation> {
        // Each observation is a cold service read, plus raw retained bytes. The
        // oracle does not accept callback assertions as persistence evidence.
        const reader = this.reopen(), applications: [
            Snapshot[],
            Snapshot[]
        ] = [[], []], intents: [
            Intent[],
            Intent[]
        ] = [[], []];
        for (const app of [0, 1] as const) {
            const history = await reader.history(appName(app));
            applications[app] = history as unknown as Snapshot[];
            for (const snapshot of history) {
                const works = await Promise.all(snapshot.transition.intents.map(async (ref) => ({ ref, work: await reader.store.getValue(ref) })));
                works.sort((a, b) => Number((a.work as ObjectValue).ordinal) - Number((b.work as ObjectValue).ordinal));
                for (const row of works) {
                    const work = object(row.work);
                    const dispatch = await reader.readDispatch(appName(app), row.ref, work as never, snapshot);
                    intents[app].push({ ref: row.ref, source: snapshot.digest, work, dispatch: dispatch as unknown as ObjectValue | null, rawDispatch: await this.rawDispatch(appName(app), row.ref), effect: await this.effect(row.ref) });
                }
            }
        }
        const effectFiles = (await readdir(join(this.root, "owned-effects"))).sort();
        if (effectFiles.length > 32)
            throw new Error("owned effect file count bound");
        return { applications, intents, effectFiles };
    }
    private head(source: number): Digest { const head = this.heads.get(source); if (!head)
        throw new InvalidReference(`Command ${source} has no selected state`); return head; }
    private materialize(c: Command): ApplicationCommand {
        const a = c.action;
        if (a.kind === "repeat") {
            const prior = this.requests.get(a.source);
            if (!prior)
                throw new InvalidReference("Repeat source has no request");
            return { ...structuredClone(prior), ...(a.conflict ? { memory: (prior.memory === this.fixtures.memories[0] ? this.fixtures.memories[1] : this.fixtures.memories[0]) as Digest } : {}) };
        }
        if (a.kind !== "create" && a.kind !== "commit")
            throw new InvalidReference("Not a commit action");
        return { application: appName(a.app), operation: operation(a.app, a.key) as Digest, kind: a.kind === "create" ? "create" : a.transition, expectedHead: a.kind === "create" ? null : this.head(a.head), revision: this.fixtures.revisionRefs[a.app] as Digest, memory: this.fixtures.memories[a.memory] as Digest, intents: intentSpecs(a.kind === "create" ? "none" : a.intents, this.fixtures) as never, evidence: [], causedBy: null };
    }
    private dispatcher(configuration: Bit): ApplicationDispatcher {
        const callback = async (context: ApplicationDispatchContext, method: "dispatch" | "reconcile") => this.custody.callback(async () => {
            const a = this.action;
            if (a.kind !== "scan" && a.kind !== "reconcile")
                throw new Error("No fixture callback choice");
            const choice: ResultChoice = a.kind === "scan" ? a.results[context.intent.ordinal as Bit] : a.result;
            const durable = await this.rawDispatch(context.dispatch.application, context.dispatch.intent), before = await this.effect(context.dispatch.intent);
            const row: Callback = { method, intent: context.dispatch.intent, source: context.snapshot.digest, current: context.current.digest, record: object(context.dispatch), durable, effectBefore: before?.text ?? null, effectAfter: before?.text ?? null };
            this.callbacks.push(row);
            if (choice !== "blocked" && (method === "dispatch" || before === null))
                await writeFile(this.effectPath(context.dispatch.intent), effectText(context.dispatch.identity), { flag: "wx" });
            row.effectAfter = (await this.effect(context.dispatch.intent))?.text ?? null;
            if (choice === "unknown")
                throw new IntendedUnknown();
            if (choice === "blocked")
                return { status: "blocked", reason: "History callback blocked" };
            return { status: "settled", result: context.dispatch.plan.kind === "delivery" ? { kind: "delivery", message: context.intent.kind === "deliver" ? context.intent.message : null, idempotencyKey: context.dispatch.identity } : { kind: "episode", binding: ref(context.dispatch.plan.binding), process: context.dispatch.plan.binding.process } };
        });
        return { configurationDigest: this.fixtures.configurations[configuration] as Digest, dispatch: c => callback(c, "dispatch"), reconcile: c => callback(c, "reconcile") };
    }
    async step(command: Command): Promise<Step> {
        this.custody.assertHealthy();
        this.action = command.action;
        this.callbacks = [];
        const a = command.action;
        let request: ApplicationCommand | undefined;
        let intent: Digest | undefined;
        // Invalid references are harness failures, never product refusals.
        if (a.kind === "create" || a.kind === "commit" || a.kind === "repeat") {
            request = this.materialize(command);
            this.requests.set(command.id, request);
        }
        if (a.kind === "reconcile") {
            const source = this.head(a.source);
            const snapshot = (await this.service.history(appName(a.app))).find(s => s.digest === source);
            if (!snapshot)
                throw new InvalidReference("Reconcile source not in application history");
            for (const ref of snapshot.transition.intents) {
                const work = object(await this.service.store.getValue(ref));
                if (work.ordinal === a.ordinal)
                    intent = ref;
            }
            if (!intent)
                throw new InvalidReference("Reconcile source lacks ordinal");
        }
        let outcome: Outcome;
        try {
            let value: unknown = null;
            if (request)
                value = a.kind === "create" ? await this.service.create(request) : await this.service.commit(request);
            else if (a.kind === "scan")
                value = await this.service.dispatchPending(appName(a.app), this.dispatcher(a.configuration), a.batch);
            else if (a.kind === "reconcile")
                value = await this.service.reconcileDispatch(appName(a.app), intent!, this.dispatcher(a.configuration));
            else if (a.kind === "inspect")
                value = await this.service.inspect(appName(a.app));
            else if (a.kind === "restart")
                this.service = this.reopen();
            outcome = { status: "ok", value: structuredClone(value) as Json };
        }
        catch (error) {
            const e = error as {
                code?: unknown;
                message?: unknown;
                uncertain?: unknown;
                details?: unknown;
                wake?: unknown;
            };
            if (e.wake !== undefined && (!Array.isArray(e.wake) || !e.wake.every(v => typeof v === "string"))) throw new Error("Unsupported raw error wake evidence");
            outcome = { status: "error", code: typeof e.code === "string" ? e.code : "INTERNAL", message: typeof e.message === "string" ? e.message : String(error), uncertain: e.uncertain === true, details: json(e.details ?? null), wake: e.wake === undefined ? [] : structuredClone(e.wake as string[]) };
        }
        this.custody.assertHealthy();
        const after = await this.observe();
        if (request) {
            const found = after.applications.flat().find(s => s.transition.operation === request!.operation && s.transition.request === ref(request));
            if (found)
                this.heads.set(command.id, found.digest as Digest);
        }
        const row = { id: command.id, outcome, callbacks: structuredClone(this.callbacks), after };
        this.steps.push(row);
        return row;
    }
    finish(history: History): Trace { return { contract: "algal.application-trace.v1", runtime: "bun", historyDigest: hashJson(history), fixtures: this.fixtures, initial: this.initial, steps: structuredClone(this.steps) }; }
}
export async function replay(history: History, root: string): Promise<Trace> {
    parseHistory(history);
    let driver: BunHistoryDriver | undefined;
    try {
        driver = await BunHistoryDriver.create(root);
        for (const c of history.commands)
            await driver.step(c);
        const trace = parseTrace(driver.finish(history), history);
        checkTrace(history, trace);
        return trace;
    }
    catch (error) {
        const primary = new Error(`History replay failed; retained ${root}`, { cause: error });
        return await retainFailure(primary, [
            () => writeFile(join(root, "failed-history.json"), encodeRecord(history, LIMITS.historyBytes)),
            ...driver ? [() => writeFile(join(root, "failed-trace.json"), encodeRecord(driver!.finish(history), LIMITS.packetBytes))] : [],
        ]);
    }
}
