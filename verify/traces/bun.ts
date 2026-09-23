import { productDigest } from "./product";
/** Real Bun public-API driver. It never fabricates an API acknowledgment. */
import { constants } from "node:fs";
import { lstat, mkdir, mkdtemp, open, readdir, realpath, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { ApplicationService, type ApplicationSnapshot } from "../../src/application";
import { parseOrganismManifest } from "../../src/contract";
import type { Digest } from "../../src/digest";
import { withDurableFsProbe, type DurableFsEvent } from "../../src/durable-fs";
import { AlgalError, errorReport } from "../../src/errors";
import { FileMailboxService, type MailboxConfig } from "../../src/mailbox";
import { FileStore } from "../../src/store";
import { hashBytes, hashJson, stableJson } from "../lib/files";
import { requireThat } from "../lib/schema";
import { APP_POINTS, FS_STEPS, LIMITS, parseHistory, parseTrace, value, type Command, type Event, type History, type Name, type ObservationTarget, type Outcome, type Snapshot, type Step, type Target, type Trace, type Value } from "./schema";
import { MANIFEST, MEMORY, MISSING, RECORD, appName, authority, boxName, compareText, inventory, keyDigest, revision, slotName } from "./shared";

export class HarnessError extends Error { constructor(message: string) { super(message); this.name = "HarnessError"; } }
const ok = (value: Value): Outcome => ({ status: "ok", value });
const found = (result: Value | undefined): Value => ({ found: result !== undefined, value: result ?? null });
const project = (s: ApplicationSnapshot): Value => ({ digest: s.digest, previous: s.state.previous, sequence: s.state.sequence, operation: s.transition.operation, memory: s.state.memory });
const EMPTY: History = { contract: "algal.verification-history.v1", seed: 0, commands: [] };

export class BunTraceRuntime {
  private store: FileStore;
  private mailbox: FileMailboxService;
  private readonly aliases = new Map<string, string>();
  private readonly temps = new Map<string, string>();
  private readonly inodes = new Map<string, string>();
  private readonly revisions: string[] = [];
  private readonly rows: Step[] = [];
  private readonly executed: Command[] = [];
  private initial!: Snapshot;
  private active: { command: Command; events: Event[]; occurrence: number; fired: boolean } | null = null;
  private constructor(readonly root: string, private readonly universe: ReturnType<typeof inventory>) {
    this.store = new FileStore(root); this.mailbox = new FileMailboxService(root);
  }
  static async create(root: string, history: History = EMPTY): Promise<BunTraceRuntime> {
    requireThat(isAbsolute(root), "trace root must be absolute");
    const physical = await realpath(root);
    requireThat((await readdir(physical)).length === 0, "trace root must be a fresh empty owned directory");
    const runtime = new BunTraceRuntime(physical, inventory(history));
    const manifest = await runtime.store.putManifest(parseOrganismManifest(MANIFEST));
    const record = await runtime.store.putValue(RECORD);
    for (const app of [0, 1] as const) runtime.revisions.push(await runtime.store.putValue(revision(app, manifest, record)));
    for (const memory of MEMORY) await runtime.store.putValue(memory);
    runtime.initial = await runtime.snapshot();
    return runtime;
  }
  private error(error: unknown): Outcome {
    if (error instanceof HarnessError) throw error;
    const reported = errorReport(error);
    const rawWake: unknown = error instanceof AlgalError && error.details && typeof error.details === "object" && "wake" in error.details ? error.details.wake : [];
    requireThat(Array.isArray(rawWake), "invalid real wake evidence");
    const wake = rawWake.map(handle => {
      const alias = [...this.aliases].find(([, actual]) => actual === handle)?.[0];
      if (!alias) throw new HarnessError("unbound real wake authority");
      return alias;
    }).sort(compareText);
    return { status: "error", ...reported, wake, uncertain: error instanceof AlgalError && error.uncertain };
  }
  private application(): ApplicationService {
    return new ApplicationService(this.root, { admitCommit: async () => { this.appEvent("admitted"); } }, {
      custodySelected: () => this.appEvent("selected"),
      fault: point => { if (point === "prepared" || point === "head-published") this.appEvent(point); },
    });
  }
  private inject(): never {
    const state = this.active!; state.fired = true;
    throw new AlgalError("IO_FAILED", state.command.fault!.mode === "cancel" ? "trace injected cancellation" : "trace injected error");
  }
  private appEvent(point: typeof APP_POINTS[number]): void {
    const state = this.active;
    if (!state) return;
    state.events.push({ kind: "application", point });
    if (!state.fired && state.command.fault?.site === "application" && state.command.fault.point === point) this.inject();
  }
  private logicalPath(raw: string): string {
    const physical = resolve(raw), rel = relative(this.root, physical);
    if (rel === "") return ".";
    if (rel === ".." || rel.startsWith("../")) {
      let ancestor = this.root;
      for (let n = 1; n <= 256; n++) { const next = dirname(ancestor); if (next === ancestor) break; ancestor = next; if (ancestor === physical) return `@ancestor/${n}`; }
      throw new HarnessError("checkpoint escaped the owned fixture namespace");
    }
    if (isAbsolute(rel) || rel.split("/").includes("..")) throw new HarnessError("nonrelative checkpoint path");
    if (basename(physical).startsWith(".tmp-")) {
      let logical = this.temps.get(physical);
      if (!logical) { logical = join(dirname(rel), `.temp-${this.temps.size}`); this.temps.set(physical, logical); }
      return logical;
    }
    return rel;
  }
  private fsEvent(event: DurableFsEvent): void {
    const state = this.active!;
    if (!FS_STEPS.includes(event.step)) throw new HarnessError("unknown managed checkpoint");
    let inode: string | null = null;
    if (event.inode !== undefined) {
      if (!this.inodes.has(event.inode)) this.inodes.set(event.inode, `i${this.inodes.size}`);
      inode = this.inodes.get(event.inode)!;
    }
    state.events.push({ kind: "fs", step: event.step, phase: event.phase, path: this.logicalPath(event.path), target: event.target === undefined ? null : this.logicalPath(event.target), inode });
    if (state.events.length > LIMITS.events) throw new HarnessError("checkpoint event count bound");
    const fault = state.command.fault;
    if (!state.fired && fault?.site === "fs" && fault.step === event.step && fault.phase === event.phase && ++state.occurrence === fault.occurrence) this.inject();
  }
  private remember(box: Name, config: MailboxConfig): void {
    for (const right of ["send", "receive"] as const) {
      const alias = authority(box, right), prior = this.aliases.get(alias), handle = config[right];
      if (prior !== undefined && prior !== handle) throw new HarnessError("mailbox identity changed without a new logical name");
      this.aliases.set(alias, handle);
    }
  }
  private async config(box: Name): Promise<MailboxConfig> {
    const config = await this.mailbox.inspect(boxName(box));
    if (!config) throw new HarnessError("unresolved mailbox authority alias");
    this.remember(box, config); return config;
  }
  private configValue(box: Name, config: MailboxConfig): Value {
    this.remember(box, config);
    return { name: config.name, capacity: config.maxMessages, send: authority(box, "send"), receive: authority(box, "receive") };
  }
  targetPath(target: Target): string {
    if (target.kind === "value") return join(this.root, "values", productDigest(target.value).slice(7) + ".json");
    if (target.kind === "effect") return join(this.root, "effects", productDigest({ contract: "algal.effect-cache.v1", executor: "trace.v1", requestDigest: keyDigest(target.key) }).slice(7) + ".json");
    if (target.kind === "slot") return join(this.root, "slots", slotName(target.key) + ".json");
    if (target.kind === "application-memory") return join(this.root, "values", productDigest(MEMORY[target.memory]!).slice(7) + ".json");
    if (target.kind === "application-head") return join(this.root, "applications", appName(target.app), "head.json");
    if (target.kind === "mailbox-lock") return join(this.root, "mailboxes", boxName(target.box), ".lock");
    if (target.kind === "mailbox-message" || target.kind === "mailbox-pending" || target.kind === "mailbox-consumed") return join(this.root, "mailboxes", boxName(target.box), target.kind === "mailbox-message" ? "messages" : target.kind.slice("mailbox-".length), keyDigest(target.key).slice(7) + ".json");
    throw new HarnessError("unknown filesystem target");
  }
  private async file(target: Target): Promise<Buffer | undefined> {
    let fd;
    try { fd = await open(this.targetPath(target), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw new AlgalError("IO_FAILED", String(e)); }
    try {
      const stat = await fd.stat();
      if (!stat.isFile() || stat.size > 1_048_576) throw new HarnessError("fixture target type/byte bound");
      const bytes = await fd.readFile(); if (bytes.byteLength > 1_048_576) throw new HarnessError("fixture target grew past bound");
      return bytes;
    } finally { await fd.close(); }
  }
  private async rawValue(target: Target): Promise<Value | undefined> {
    const bytes = await this.file(target); if (!bytes) return undefined;
    try { return value(JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes)), 32_768); }
    catch { throw new AlgalError("PARSE_FAILED", "invalid trace fixture JSON"); }
  }
  private async observe(target: ObservationTarget): Promise<Outcome> {
    try {
      const reader = new FileStore(this.root);
      if (target.kind === "value") return ok(found(await reader.getValue(productDigest(target.value) as Digest)));
      if (target.kind === "effect") return ok(found(await reader.getEffect(keyDigest(target.key) as Digest, "trace.v1") as Value | undefined));
      if (target.kind === "slot") return ok(found(await reader.getSlot(slotName(target.key))));
      if (target.kind === "mailbox-config") { const c = await this.mailbox.inspect(boxName(target.box)); return ok(found(c ? this.configValue(target.box, c) : undefined)); }
      if (target.kind === "application-history") return ok((await this.application().history(appName(target.app))).map(project));
      return ok(found(await this.rawValue(target)));
    } catch (error) { return this.error(error); }
  }
  async snapshot(): Promise<Snapshot> {
    const observations = [];
    for (const target of this.universe.observations) observations.push({ target, outcome: await this.observe(target) });
    const files = [];
    for (const target of this.universe.files) {
      const bytes = await this.file(target);
      files.push({ target, exists: bytes !== undefined, bytes: bytes?.byteLength ?? 0, sha256: bytes === undefined ? null : hashBytes(bytes) });
    }
    return { observations, files };
  }
  private async invoke(command: Command): Promise<Value> {
    const a = command.action;
    if (a.kind === "store-put") return this.store.putValue(a.value);
    if (a.kind === "store-get") return found(await this.store.getValue(productDigest(a.value) as Digest));
    if (a.kind === "effect-put") return this.store.putEffect({ requestDigest: keyDigest(a.key) as Digest, executor: "trace.v1", output: a.value }, "trace.v1");
    if (a.kind === "effect-get") return found(await this.store.getEffect(keyDigest(a.key) as Digest, "trace.v1") as Value | undefined);
    if (a.kind === "slot-set") { await this.store.setSlot(slotName(a.key), a.value); return null; }
    if (a.kind === "slot-get") return found(await this.store.getSlot(slotName(a.key)));
    if (a.kind === "mailbox-create") return this.configValue(a.box, await this.mailbox.create(boxName(a.box), { maxMessages: a.capacity, maxMessageBytes: 256 }));
    if (a.kind === "mailbox-send") return this.mailbox.send((await this.config(a.box)).send, a.value, keyDigest(a.key) as Digest);
    if (a.kind === "mailbox-receive") return this.mailbox.receive((await this.config(a.box)).receive);
    if (a.kind === "mailbox-pending") return this.mailbox.hasPending((await this.config(a.box)).receive);
    if (a.kind === "mailbox-revoke") { await this.mailbox.revoke((await this.config(a.box))[a.right]); return null; }
    if (a.kind === "application-inspect") { const s = await this.application().inspect(appName(a.app)); return s ? project(s) : null; }
    if (a.kind === "application-create" || a.kind === "application-commit") {
      let expectedHead: string | null = null;
      if (a.kind === "application-commit") {
        if (a.head === "missing") expectedHead = MISSING;
        else if (a.head !== null) {
          const priorAction = this.executed[a.head]?.action;
          if (!priorAction || !["application-create", "application-commit", "application-inspect"].includes(priorAction.kind) || !("app" in priorAction) || priorAction.app !== a.app) throw new HarnessError("head reference belongs to another command/application");
          const previous = this.rows[a.head];
          const v = previous?.outcome.status === "ok" ? previous.outcome.value : null;
          if (!v || typeof v !== "object" || Array.isArray(v) || typeof v.digest !== "string") throw new HarnessError("unresolved prior application head reference");
          expectedHead = v.digest;
        }
      }
      const input = { application: appName(a.app), operation: keyDigest(a.key), kind: a.kind === "application-create" ? "create" : "memory", expectedHead,
        revision: this.revisions[a.app]!, memory: a.memory === "missing" ? MISSING : productDigest(MEMORY[a.memory]!), intents: [], evidence: [], causedBy: null };
      return project(await (a.kind === "application-create" ? this.application().create(input) : this.application().commit(input)));
    }
    if (a.kind === "restart") { this.store = new FileStore(this.root); this.mailbox = new FileMailboxService(this.root); return null; }
    if (a.kind === "tamper") {
      const path = this.targetPath(a.target);
      const metadata = await lstat(dirname(path));
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new HarnessError("tamper parent is not an admitted fixture directory");
      if (a.mode === "remove") { try { await unlink(path); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; } }
      else await writeFile(path, "{broken", { mode: 0o600 });
      return null;
    }
    throw new HarnessError("unknown action");
  }
  async step(command: Command): Promise<Step> {
    if (command.id !== this.rows.length) throw new HarnessError("command execution order mismatch");
    const active = { command, events: [] as Event[], occurrence: 0, fired: false }; this.active = active;
    let outcome: Outcome;
    try { outcome = ok(await withDurableFsProbe(event => this.fsEvent(event), () => this.invoke(command))); }
    catch (error) { outcome = this.error(error); }
    finally { this.active = null; }
    if (command.fault !== null && !active.fired) throw new HarnessError("requested trace fault was not reached");
    const row = { id: command.id, outcome, events: active.events, faultTriggered: active.fired, after: await this.snapshot() };
    this.rows.push(row); this.executed.push(command); return row;
  }
  finish(history: History): Trace {
    return parseTrace({ contract: "algal.verification-trace.v1", runtime: "bun", historyDigest: hashJson(history), initial: this.initial, steps: this.rows,
      authorities: [...this.aliases].sort(([a], [b]) => compareText(a, b)).map(([alias, handle]) => ({ alias, handle })) }, history);
  }
}

export async function replayBun(history: History, ownedRoot?: string): Promise<Trace> {
  const root = ownedRoot ?? await mkdtemp(join(tmpdir(), "algal-trace-bun-"));
  try {
    const runtime = await BunTraceRuntime.create(root, history);
    for (const command of history.commands) await runtime.step(command);
    return runtime.finish(history);
  } finally { if (!ownedRoot) await rm(root, { recursive: true, force: true }); }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  requireThat(args.length === 6 && args[0] === "--input" && args[2] === "--output" && args[4] === "--root", "usage: bun verify/traces/bun.ts --input FIXTURE --output TRACE --root EMPTY_OWNED_DIRECTORY");
  const fd = await open(resolve(args[1]!), constants.O_RDONLY | constants.O_NOFOLLOW);
  let history;
  try { requireThat((await fd.stat()).size <= LIMITS.transcriptBytes, "history file bound"); history = parseHistory(JSON.parse(await fd.readFile("utf8"))); }
  finally { await fd.close(); }
  await mkdir(resolve(args[5]!), { recursive: true });
  const trace = await replayBun(history, resolve(args[5]!));
  await writeFile(resolve(args[3]!), stableJson(trace) + "\n", { flag: "wx", mode: 0o600 });
}
