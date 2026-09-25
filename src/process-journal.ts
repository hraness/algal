import { join } from "node:path";
import { AlgalError } from "./errors";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { parseEffectReceipt, type EffectReceipt } from "./effects";
import { hostDirectory, hostNames, hostRead, hostValue, hostWrite } from "./host-state";
import { asInt, asObject, asSafeId, asString, canonicalBytes, canonicalize, noUnknownKeys, type JsonValue } from "./values";

export const JOURNAL_BOUNDS = { maxEntries: 4096, maxRecordBytes: 1_048_576, maxBytes: 16_777_216, maxRecoveries: 8 } as const;
import type { JournalBinding, JournalTicket, RuntimeJournal } from "./runtime-journal-contract";
export type { JournalBinding, JournalTicket, RuntimeJournal } from "./runtime-journal-contract";
type Header = { contract: "algal.process-journal.v1"; process: string; intent: Digest; manifestDigest: Digest; maxEntries: number; maxRecoveries: number };
type RecordEntry = JournalBinding & { contract: "algal.process-effect-record.v1"; intent: Digest; ordinal: number; state: "started" | "completed"; attempt: number; previous?: Digest; receipt?: EffectReceipt };
type Entry = { digest: Digest; value: RecordEntry };
const value = (v: unknown): JsonValue => v as JsonValue;
const same = (a: unknown, b: unknown): boolean => canonicalize(value(a ?? null)) === canonicalize(value(b ?? null));
function mismatch(message: string): never { throw new AlgalError("RECEIPT_MISMATCH", message); }
const ordinalName = (n: number): string => `${n.toString().padStart(6, "0")}.json`;

function parseHeader(input: unknown): Header {
  const object = asObject(input, "process journal");
  noUnknownKeys(object, ["contract", "process", "intent", "manifestDigest", "maxEntries", "maxRecoveries"], "process journal");
  if (object.contract !== "algal.process-journal.v1") mismatch("invalid journal contract");
  const result: Header = {
    contract: "algal.process-journal.v1", process: asSafeId(object.process, "journal process"),
    intent: asDigest(object.intent, "journal intent"), manifestDigest: asDigest(object.manifestDigest, "journal manifest"),
    maxEntries: asInt(object.maxEntries, "journal entries", 1, JOURNAL_BOUNDS.maxEntries),
    maxRecoveries: asInt(object.maxRecoveries, "journal recoveries", 1, JOURNAL_BOUNDS.maxRecoveries),
  };
  return result;
}
function parseBinding(input: unknown): JournalBinding {
  const object = asObject(input, "journal binding");
  if (object.recovery !== "read" && object.recovery !== "never") mismatch("invalid recovery policy");
  return {
    requestDigest: asDigest(object.requestDigest, "journal request"), executor: asString(object.executor, "journal executor", 256),
    configurationDigest: asDigest(object.configurationDigest, "journal configuration"), idempotencyKey: asDigest(object.idempotencyKey, "journal idempotency key"),
    recovery: object.recovery,
  };
}
function bindingOf(record: RecordEntry): JournalBinding {
  return { requestDigest: record.requestDigest, executor: record.executor, configurationDigest: record.configurationDigest, idempotencyKey: record.idempotencyKey, recovery: record.recovery };
}
function parseRecord(input: unknown): RecordEntry {
  const object = asObject(input, "journal record");
  noUnknownKeys(object, ["contract", "intent", "ordinal", "requestDigest", "executor", "configurationDigest", "idempotencyKey", "recovery", "state", "attempt", "previous", "receipt"], "journal record");
  if (object.contract !== "algal.process-effect-record.v1" || (object.state !== "started" && object.state !== "completed")) mismatch("invalid effect record");
  const record: RecordEntry = {
    ...parseBinding(input), contract: "algal.process-effect-record.v1", intent: asDigest(object.intent, "effect intent"),
    ordinal: asInt(object.ordinal, "effect ordinal", 0, JOURNAL_BOUNDS.maxEntries - 1), state: object.state,
    attempt: asInt(object.attempt, "effect attempt", 0, JOURNAL_BOUNDS.maxRecoveries),
  };
  if (object.previous !== undefined) record.previous = asDigest(object.previous, "previous journal record");
  if (object.receipt !== undefined) record.receipt = parseEffectReceipt(object.receipt);
  if ((record.state === "completed") !== (record.receipt !== undefined)) mismatch("journal result/state mismatch");
  if (record.receipt && record.receipt.requestDigest !== record.requestDigest) mismatch("journal receipt request mismatch");
  if (record.receipt?.configurationDigest !== undefined && record.receipt.configurationDigest !== record.configurationDigest) mismatch("journal receipt configuration mismatch");
  return record;
}

/** One journal belongs to one immutable dispatch intent. The caller holds the
 * process's SQLite lease for its entire lifetime. No clock or PID participates
 * in replay or in permission to repeat an external operation. */
export class ProcessJournal implements RuntimeJournal {
  private readonly entries: Entry[] = [];
  private readonly seen = new Set<Digest>();
  private readonly active = new Map<Digest, number>();
  private bytes = 0;
  private cursor = 0;
  private recovering = false;
  private mutating = false;
  private poisoned: unknown;
  private constructor(readonly root: string, readonly path: string, readonly header: Header) {}

  static async create(root: string, name: string, intent: Digest, manifestDigest: Digest, maxRecoveries = 2): Promise<ProcessJournal> {
    const header = parseHeader({contract: "algal.process-journal.v1", process: name, intent, manifestDigest, maxEntries: JOURNAL_BOUNDS.maxEntries, maxRecoveries});
    const path = join(root, "processes", name, "journals", intent.slice(7));
    for (const dir of [root, join(root, "processes"), join(root, "processes", name), join(root, "processes", name, "journals"), path, join(root, "values")]) await hostDirectory(dir);
    await hostWrite(join(path, "header.json"), value(header), 4096);
    const journal = await ProcessJournal.open(root, name, intent, manifestDigest);
    if (journal.entries.length !== 0 || await journal.recoveryAttempts() !== 0) mismatch("new dispatch intent already has effect history");
    return journal;
  }
  static async open(root: string, name: string, intent: Digest, manifestDigest: Digest): Promise<ProcessJournal> {
    asSafeId(name, "process name"); asDigest(intent, "intent");
    const path = join(root, "processes", name, "journals", intent.slice(7));
    for (const dir of [root, join(root, "processes"), join(root, "processes", name), join(root, "processes", name, "journals"), path, join(root, "values")]) await hostDirectory(dir);
    const raw = await hostRead(join(path, "header.json"), 4096);
    if (raw === undefined) throw new AlgalError("IO_FAILED", "dispatch has no recovery journal");
    const header = parseHeader(raw);
    if (header.process !== name || header.intent !== intent || header.manifestDigest !== manifestDigest) mismatch("journal is bound to another dispatch");
    const journal = new ProcessJournal(root, path, header);
    const names = await hostNames(join(path, "entries"), header.maxEntries, /^\d{6}\.json$/);
    for (let i = 0; i < names.length; i++) {
      if (names[i] !== ordinalName(i)) mismatch("journal ordinal gap");
      const head = asObject(await hostRead(join(path, "entries", names[i]!), 4096), "effect head");
      noUnknownKeys(head, ["contract", "record"], "effect head");
      if (head.contract !== "algal.process-effect-head.v1") mismatch("invalid effect head");
      const digest = asDigest(head.record, "effect head record");
      const record = await journal.readRecord(digest);
      if (record.intent !== intent || record.ordinal !== i) mismatch("effect belongs to another ordinal/intent");
      await journal.checkChain(digest, record);
      if (i > 0 && journal.entries[i - 1]!.value.state !== "completed") mismatch("journal contains effects after an unsettled operation");
      journal.entries.push({digest, value: record});
    }
    await journal.recoveryAttempts();
    return journal;
  }
  private async readRecord(digest: Digest): Promise<RecordEntry> {
    const raw = await hostRead(join(this.root, "values", `${digest.slice(7)}.json`), JOURNAL_BOUNDS.maxRecordBytes);
    if (raw === undefined || digestCanonical(raw) !== digest) mismatch("effect journal CAS mismatch");
    if (!this.seen.has(digest)) {
      this.bytes += canonicalBytes(raw);
      if (this.bytes > JOURNAL_BOUNDS.maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", "journal byte budget exceeded");
      this.seen.add(digest);
    }
    return parseRecord(raw);
  }
  private async checkChain(digest: Digest, record: RecordEntry): Promise<void> {
    let child = record;
    const visited = new Set<Digest>([digest]);
    for (let depth = 0; child.previous !== undefined; depth++) {
      if (depth >= 2 * (this.header.maxRecoveries + 1) || visited.has(child.previous)) mismatch("journal chain bound/cycle");
      visited.add(child.previous);
      const prior = await this.readRecord(child.previous);
      if (prior.intent !== child.intent || prior.ordinal !== child.ordinal || !same(bindingOf(prior), bindingOf(child))) mismatch("journal binding changed");
      if (prior.state !== "started") mismatch("completed effect cannot dispatch again");
      if (child.state === "completed") {
        if (child.attempt !== prior.attempt) mismatch("completion changed attempt");
      } else if (child.recovery !== "read" || child.attempt !== prior.attempt + 1) mismatch("unsafe effect retry transition");
      child = prior;
    }
    if (child.state !== "started" || child.attempt !== 0) mismatch("invalid initial effect record");
  }
  private async recoveryAttempts(): Promise<number> {
    const names = await hostNames(join(this.path, "recoveries"), this.header.maxRecoveries, /^\d{6}\.json$/);
    for (let i = 0; i < names.length; i++) {
      if (names[i] !== ordinalName(i + 1)) mismatch("recovery attempt gap");
      const expected = {contract: "algal.process-recovery-attempt.v1", intent: this.header.intent, attempt: i + 1};
      if (!same(await hostRead(join(this.path, "recoveries", names[i]!), 4096), expected)) mismatch("invalid recovery attempt");
    }
    for (const entry of this.entries) if (entry.value.attempt > names.length) mismatch("effect has no admitted recovery attempt");
    return names.length;
  }
  async beginRecovery(): Promise<void> {
    this.enterMutation();
    try {
    if (this.recovering || this.cursor !== 0) mismatch("journal recovery already started");
    for (const entry of this.entries) if (entry.value.state === "started" && entry.value.recovery !== "read") {
      throw new AlgalError("IO_FAILED", `effect ${entry.value.ordinal} has unknown completion; adapter reconciliation is required`);
    }
    const attempts = await this.recoveryAttempts();
    if (attempts >= this.header.maxRecoveries) throw new AlgalError("BUDGET_EXHAUSTED", "process recovery budget exhausted");
    await hostWrite(join(this.path, "recoveries", ordinalName(attempts + 1)), {contract: "algal.process-recovery-attempt.v1", intent: this.header.intent, attempt: attempts + 1}, 4096);
    this.assertHealthy();
    this.recovering = true;
    } catch (error) { this.poison(error); throw error; } finally { this.mutating = false; }
  }
  private async writeRecord(record: RecordEntry): Promise<Entry> {
    const raw = value(parseRecord(hostValue(record)));
    const digest = digestCanonical(raw);
    const bytes = canonicalBytes(raw);
    if (bytes > JOURNAL_BOUNDS.maxRecordBytes || this.bytes + (this.seen.has(digest) ? 0 : bytes) > JOURNAL_BOUNDS.maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", "journal byte budget exceeded");
    await hostWrite(join(this.root, "values", `${digest.slice(7)}.json`), raw, JOURNAL_BOUNDS.maxRecordBytes);
    await hostWrite(join(this.path, "entries", ordinalName(record.ordinal)), {contract: "algal.process-effect-head.v1", record: digest}, 4096, false);
    if (!this.seen.has(digest)) { this.seen.add(digest); this.bytes += bytes; }
    const entry = {digest, value: parseRecord(raw)};
    this.entries[record.ordinal] = entry;
    return entry;
  }
  assertHealthy(): void { if (this.poisoned !== undefined) throw this.poisoned; }
  poison(error: unknown): void { this.poisoned ??= error instanceof Error ? error : new AlgalError("IO_FAILED", "journal admission failed"); }
  private enterMutation(): void {
    this.assertHealthy();
    if (this.mutating) { this.poison(new AlgalError("IO_FAILED", "concurrent journal mutations are forbidden")); this.assertHealthy(); }
    this.mutating = true;
  }
  async before(input: JournalBinding): Promise<JournalTicket> {
    this.enterMutation();
    try {
      if (this.active.size) mismatch("journal effects must settle in order");
      const binding = parseBinding(input);
      const ordinal = this.cursor;
      if (ordinal >= this.header.maxEntries) throw new AlgalError("BUDGET_EXHAUSTED", "effect journal entry budget exhausted");
      const existing = this.entries[ordinal];
      if (existing && !same(bindingOf(existing.value), binding)) mismatch("journal request/configuration/order changed");
      if (existing?.value.state === "completed") {
        this.cursor++;
        return {receipt: structuredClone(existing.value.receipt!)};
      }
      if (existing && (!this.recovering || binding.recovery !== "read")) throw new AlgalError("IO_FAILED", "unsettled effect cannot be repeated");
      const record: RecordEntry = {
        ...binding, contract: "algal.process-effect-record.v1", intent: this.header.intent, ordinal,
        state: "started", attempt: existing ? existing.value.attempt + 1 : 0,
        ...(existing ? {previous: existing.digest} : {}),
      };
      const entry = await this.writeRecord(record);
      this.assertHealthy();
      this.active.set(entry.digest, ordinal);
      this.cursor++;
      return {token: entry.digest};
    } catch (error) { this.poison(error); throw error; } finally { this.mutating = false; }
  }
  async after(token: Digest, effect: EffectReceipt): Promise<void> {
    this.enterMutation();
    try {
      const ordinal = this.active.get(token);
      const entry = ordinal === undefined ? undefined : this.entries[ordinal];
      if (!entry || entry.digest !== token || entry.value.state !== "started") mismatch("journal completion has no live intent");
      const receipt = parseEffectReceipt(hostValue(effect));
      if (receipt.requestDigest !== entry.value.requestDigest) mismatch("journal result request mismatch");
      await this.writeRecord({...entry.value, state: "completed", previous: entry.digest, receipt});
      this.assertHealthy();
      this.active.delete(token);
    } catch (error) { this.poison(error); throw error; } finally { this.mutating = false; }
  }
  assertComplete(): void {
    this.assertHealthy();
    if (this.cursor !== this.entries.length || this.active.size || this.entries.some(entry => entry.value.state !== "completed")) mismatch("journal prefix was not fully consumed/settled");
  }
  describe(): JsonValue {
    return {header: value(this.header), effects: this.entries.map(entry => ({digest: entry.digest, record: value(entry.value)})), bytes: this.bytes};
  }
}
