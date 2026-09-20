// Durable, bounded host supervision. Dispatch intent survives a process crash;
// uncertain work is never automatically repeated. This is not an OS sandbox.
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import {
  link,
  lstat,
  mkdir,
  open,
  opendir,
  rename,
  unlink,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  parseCapabilityHandle,
  parseWakeCapabilities,
  type CapabilityHandle,
} from "./capabilities";
import {
  manifestToJson,
  parseOrganismManifest,
  type OrganismManifest,
} from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";
import { compileOrganism, type CompiledOrganism } from "./graph";
import { hostLease } from "./host-state";
import { ProcessJournal } from "./process-journal";
import {
  FileMailboxService,
  mailboxToolRegistry,
  type MailboxService,
} from "./mailbox";
import { builtinRegistry, isBuiltinRegistry, type FnRegistry } from "./registry";
import {
  checkValue,
  parseRunReceipt,
  runOrganism,
  type RunReceipt,
} from "./run";
import { FileStore, type Store } from "./store";
import type { ToolRegistry } from "./tools";
import type { Transport } from "./transport";
import { resumeRun, verifyReceipt } from "./verify";
import {
  asInt,
  asJsonValue,
  asObject,
  asSafeId,
  canonicalBytes,
  canonicalize,
  noUnknownKeys,
  type JsonValue,
} from "./values";

export const PROCESS_CONTRACT = "algal.process.v1" as const;
export const PROCESS_BOUNDS = {
  maxProcesses: 1024,
  maxGenerations: 64,
  maxArgsBytes: 250_000,
  maxRecordBytes: 512_000,
  maxManifestBytes: 1_048_576,
  maxReceiptBytes: 16_000_000,
} as const;
export type ProcessRecord = {
  contract: typeof PROCESS_CONTRACT;
  name: string;
  manifestDigest: Digest;
  args: Record<string, Record<string, JsonValue>>;
  maxGenerations: number;
  generation: number;
  status: "ready" | "uncertain" | "suspended" | "complete" | "failed" | "stuck";
  wake: CapabilityHandle[];
  previous?: Digest;
  receipt?: Digest;
  cause?: "start" | "manual" | CapabilityHandle;
};
export type ProcessSnapshot = { digest: Digest; process: ProcessRecord };
export type ProcessHost = {
  executors?: Executor[];
  fns?: FnRegistry;
  tools?: ToolRegistry;
  mailboxes?: MailboxService;
  transports?: Record<string, Transport>;
  journal?: boolean | { maxRecoveries?: number };
};
const json = (v: unknown): JsonValue => v as JsonValue;
const same = (a: unknown, b: unknown): boolean =>
  canonicalize(json(a ?? null)) === canonicalize(json(b ?? null));
function invalid(message: string): never {
  throw new AlgalError("RECEIPT_MISMATCH", message);
}

function boundedValue(value: unknown, maxBytes: number): JsonValue {
  // Bound traversal before generic JSON readers (which recurse).
  let nodes = 0;
  function visit(v: unknown, depth: number): void {
    if (depth > 64 || ++nodes > 100_000)
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "process JSON depth/count exceeded",
      );
    if (v !== null && typeof v === "object")
      for (const x of Object.values(v)) visit(x, depth + 1);
  }
  visit(value, 0);
  const checked = asJsonValue(value, "process JSON");
  if (canonicalBytes(checked) > maxBytes)
    throw new AlgalError(
      "BUDGET_EXHAUSTED",
      "process JSON byte limit exceeded",
    );
  return checked;
}
function parseArgs(value: unknown): ProcessRecord["args"] {
  const obj = asObject(
    boundedValue(value, PROCESS_BOUNDS.maxArgsBytes),
    "process args",
  );
  return Object.fromEntries(
    Object.entries(obj).map(([cell, ports]) => {
      asSafeId(cell, "input cell");
      const checked = asObject(ports, "input ports");
      for (const key of Object.keys(checked)) asSafeId(key, "input port");
      return [cell, checked];
    }),
  );
}
export function parseProcessRecord(value: unknown): ProcessRecord {
  const obj = asObject(
    boundedValue(value, PROCESS_BOUNDS.maxRecordBytes),
    "process",
  );
  noUnknownKeys(
    obj,
    [
      "contract",
      "name",
      "manifestDigest",
      "args",
      "maxGenerations",
      "generation",
      "status",
      "wake",
      "previous",
      "receipt",
      "cause",
    ],
    "process",
  );
  if (obj.contract !== PROCESS_CONTRACT) invalid("invalid process contract");
  if (
    typeof obj.status !== "string" ||
    ![
      "ready",
      "uncertain",
      "suspended",
      "complete",
      "failed",
      "stuck",
    ].includes(obj.status)
  )
    invalid("invalid process status");
  const wake =
    Array.isArray(obj.wake) && obj.wake.length === 0
      ? []
      : parseWakeCapabilities(obj.wake);
  if (!same(wake, [...wake].sort()))
    invalid("process wake handles must be sorted");
  const result: ProcessRecord = {
    contract: PROCESS_CONTRACT,
    name: asSafeId(obj.name, "process name"),
    manifestDigest: asDigest(obj.manifestDigest, "process manifest"),
    args: parseArgs(obj.args),
    maxGenerations: asInt(
      obj.maxGenerations,
      "maxGenerations",
      1,
      PROCESS_BOUNDS.maxGenerations,
    ),
    generation: asInt(
      obj.generation,
      "generation",
      0,
      PROCESS_BOUNDS.maxGenerations,
    ),
    status: obj.status as ProcessRecord["status"],
    wake,
  };
  if (result.generation > result.maxGenerations)
    invalid("process generation exceeds limit");
  if (obj.previous !== undefined)
    result.previous = asDigest(obj.previous, "previous process record");
  if (obj.receipt !== undefined)
    result.receipt = asDigest(obj.receipt, "process receipt");
  if (obj.cause !== undefined)
    result.cause =
      obj.cause === "start" || obj.cause === "manual"
        ? obj.cause
        : parseCapabilityHandle(obj.cause).handle;
  if (result.generation === 0) {
    if (
      result.status !== "ready" ||
      result.previous ||
      result.receipt ||
      result.cause ||
      result.wake.length
    )
      invalid("initial process must be ready generation zero");
  } else if (!result.previous || !result.cause || result.status === "ready")
    invalid("process generation requires parent and cause");
  if (
    ["complete", "failed", "stuck"].includes(result.status) &&
    result.wake.length
  )
    invalid("terminal process cannot carry wake evidence");
  if (
    ["complete", "failed", "stuck", "suspended"].includes(result.status) &&
    !result.receipt
  )
    invalid("process outcome requires a receipt");
  return result;
}
function wakeOf(receipt: RunReceipt): CapabilityHandle[] {
  const wake = [
    ...new Set(
      receipt.effects
        .filter((e) => e.error?.code === "EFFECT_SUSPENDED")
        .flatMap((e) => e.wake ?? []),
    ),
  ].sort();
  return wake.length ? parseWakeCapabilities(wake) : [];
}
async function noLink(path: string): Promise<void> {
  try {
    if ((await lstat(path)).isSymbolicLink())
      throw new AlgalError("IO_FAILED", "process symlinks are not admitted");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}
async function readBounded(
  path: string,
  max: number,
): Promise<JsonValue | undefined> {
  let file;
  try {
    file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw e;
  }
  try {
    const st = await file.stat();
    if (!st.isFile() || st.size > max)
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "process file type/size is not admitted",
      );
    const buffer = Buffer.alloc(max + 1);
    let count = 0;
    while (count <= max) {
      const read = await file.read(buffer, count, buffer.length - count, null);
      if (!read.bytesRead) break;
      count += read.bytesRead;
    }
    if (count > max)
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "process file exceeds byte bound",
      );
    return boundedValue(
      JSON.parse(buffer.subarray(0, count).toString("utf8")),
      max,
    );
  } finally {
    await file.close();
  }
}
async function syncDirectory(path: string): Promise<void> {
  const dir = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    await dir.sync();
  } finally {
    await dir.close();
  }
}
async function replace(path: string, value: JsonValue): Promise<void> {
  await noLink(path);
  const temporary = `${path}.${process.pid}-${randomBytes(8).toString("hex")}.tmp`;
  const file = await open(temporary, "wx", 0o600);
  try {
    await file.writeFile(canonicalize(value));
    await file.sync();
  } finally {
    await file.close();
  }
  try {
    await rename(temporary, path);
    await syncDirectory(join(path, ".."));
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

/** Read immutable process objects through the Store seam without host state. */
async function readProcessObject(
  store: Store,
  kind: "values" | "runs" | "manifests",
  digest: Digest,
  max: number,
): Promise<JsonValue> {
  const raw =
    kind === "values"
      ? await store.getValue(digest)
      : kind === "runs"
        ? await store.getReceipt(digest)
        : await store
            .getManifest(digest)
            .then((value) =>
              value === undefined ? undefined : manifestToJson(value),
            );
  if (raw === undefined)
    throw new AlgalError("STORE_MISS", `missing process ${kind} object`);
  const value = boundedValue(raw, max);
  if (digestCanonical(value) !== digest) invalid("process CAS digest mismatch");
  return value;
}

export type ProcessObjectReader = (
  kind: "values" | "runs" | "manifests",
  digest: Digest,
  max: number,
) => Promise<JsonValue>;

/** Validate a fixed process head and its complete immutable transition chain. */
export async function readProcessHistory(
  snapshot: ProcessSnapshot,
  store: Store,
  read: ProcessObjectReader = (kind, digest, max) =>
    readProcessObject(store, kind, digest, max),
): Promise<ProcessSnapshot[]> {
  snapshot = {
    digest: asDigest(snapshot.digest, "process head"),
    process: parseProcessRecord(snapshot.process),
  };
  if (digestCanonical(json(snapshot.process)) !== snapshot.digest)
    invalid("process head digest mismatch");
  const chain = [snapshot];
  let current = snapshot;
  while (current.process.previous) {
    if (chain.length >= 1 + 2 * PROCESS_BOUNDS.maxGenerations)
      invalid("process history bound exceeded");
    const digest = current.process.previous;
    current = {
      digest,
      process: parseProcessRecord(
        await read("values", digest, PROCESS_BOUNDS.maxRecordBytes),
      ),
    };
    chain.push(current);
  }
  chain.reverse();
  const first = chain[0]!.process;
  if (
    first.status !== "ready" ||
    first.generation !== 0 ||
    first.receipt ||
    first.cause ||
    first.wake.length
  )
    invalid("invalid initial process record");
  const definition = (r: ProcessRecord) => [
    r.name,
    r.manifestDigest,
    r.args,
    r.maxGenerations,
  ];
  for (let i = 1; i < chain.length; i++) {
    const prior = chain[i - 1]!.process;
    const next = chain[i]!.process;
    if (!same(definition(first), definition(next)))
      invalid("process definition changed");
    if (next.status === "uncertain") {
      if (
        !["ready", "suspended"].includes(prior.status) ||
        next.generation !== prior.generation + 1 ||
        next.receipt !== prior.receipt ||
        !same(next.wake, prior.wake)
      )
        invalid("invalid dispatch intent");
      if (
        prior.status === "ready"
          ? next.cause !== "start"
          : next.cause !== "manual" &&
            !prior.wake.includes(next.cause as CapabilityHandle)
      )
        invalid("dispatch cause does not match prior wake");
    } else {
      if (
        prior.status !== "uncertain" ||
        next.status === "ready" ||
        next.generation !== prior.generation ||
        !next.receipt ||
        next.cause !== prior.cause
      )
        invalid("invalid process completion transition");
      const receipt = parseRunReceipt(
        await read("runs", next.receipt, PROCESS_BOUNDS.maxReceiptBytes),
      );
      if (
        receipt.manifestDigest !== next.manifestDigest ||
        !same(receipt.args, next.args) ||
        receipt.outcome !== next.status ||
        !same(wakeOf(receipt), next.wake)
      )
        invalid("process receipt does not match record");
      if (prior.receipt) {
        const checkpoint = parseRunReceipt(
          await read("runs", prior.receipt, PROCESS_BOUNDS.maxReceiptBytes),
        );
        const prefix = checkpoint.effects.filter(
          (effect) => effect.error?.code !== "EFFECT_SUSPENDED",
        );
        if (!same(prefix, receipt.effects.slice(0, prefix.length)))
          invalid("process continuation changed completed effects");
        for (const [path, cell] of Object.entries(checkpoint.cells)) {
          if (
            (cell.status === "committed" || cell.status === "skipped") &&
            !same(cell, receipt.cells[path])
          )
            invalid("process continuation changed completed cells");
        }
      }
    }
  }
  return chain;
}

/** Replay retained generations without leases, head writes, or live effects. */
export async function verifyProcessSnapshot(
  snapshot: ProcessSnapshot,
  store: Store,
  fns: FnRegistry = builtinRegistry(),
  tools?: ToolRegistry,
  read: ProcessObjectReader = (kind, digest, max) =>
    readProcessObject(store, kind, digest, max),
): Promise<{
  ok: true;
  generations: number;
  receipts: number;
  digest: Digest;
}> {
  const chain = await readProcessHistory(snapshot, store, read);
  const manifest = parseOrganismManifest(
    await read(
      "manifests",
      snapshot.process.manifestDigest,
      PROCESS_BOUNDS.maxManifestBytes,
    ),
  );
  let receipts = 0;
  for (const item of chain) {
    if (item.process.status === "uncertain" || !item.process.receipt) continue;
    const raw = await read(
      "runs",
      item.process.receipt,
      PROCESS_BOUNDS.maxReceiptBytes,
    );
    const report = await verifyReceipt(
      raw,
      manifestToJson(manifest),
      store,
      fns,
      undefined,
      tools,
    );
    if (!report.ok)
      invalid(
        `process generation ${item.process.generation} does not replay: ${report.mismatches.join("; ")}`,
      );
    receipts++;
  }
  return {
    ok: true,
    generations: snapshot.process.generation,
    receipts,
    digest: snapshot.digest,
  };
}

export class ProcessSupervisor {
  readonly dir: string;
  readonly store: FileStore;
  private readonly fns: FnRegistry;
  private readonly mailboxes: MailboxService;
  private readonly tools: ToolRegistry;
  constructor(
    dir: string,
    private readonly host: ProcessHost = {},
  ) {
    this.dir = resolve(dir);
    this.store = new FileStore(this.dir);
    this.fns = host.fns ?? builtinRegistry();
    this.mailboxes = host.mailboxes ?? new FileMailboxService(this.dir);
    this.tools = host.tools ?? mailboxToolRegistry(this.mailboxes);
  }
  private async paths(name?: string): Promise<string> {
    await noLink(this.dir);
    for (const part of ["processes", "values", "runs", "manifests"])
      await noLink(join(this.dir, part));
    const base = join(this.dir, "processes");
    if (name === undefined) return base;
    const path = join(base, asSafeId(name, "process name"));
    await noLink(path);
    return path;
  }
  private async lease<T>(path: string, action: () => Promise<T>): Promise<T> {
    // Process dispatches share a process-owned SQLite mutex across Bun/Rust.
    // Creation keeps its existing non-recoverable global admission lock.
    if (dirname(path) !== join(this.dir, "processes")) {
      return hostLease(dirname(path), basename(dirname(path)), action);
    }
    let file;
    try {
      file = await open(path, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new AlgalError(
          "IO_FAILED",
          "process lease is held; interrupted work requires reconciliation",
        );
      throw error;
    }
    try {
      await file.writeFile("algal process lease\n");
      await file.sync();
      return await action();
    } finally {
      await file.close();
      await unlink(path);
    }
  }
  private async cas(
    kind: "values" | "runs" | "manifests",
    digest: Digest,
    max: number,
  ): Promise<JsonValue> {
    const value = await readBounded(
      join(
        this.dir,
        kind,
        `${asDigest(digest, "process object digest").slice(7)}.json`,
      ),
      max,
    );
    if (value === undefined)
      throw new AlgalError("STORE_MISS", `missing process ${kind} object`);
    if (digestCanonical(value) !== digest)
      invalid("process CAS digest mismatch");
    return value;
  }
  private async publish(
    kind: "values" | "runs" | "manifests",
    value: JsonValue,
  ): Promise<Digest> {
    await this.paths();
    const directory = join(this.dir, kind);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await syncDirectory(this.dir);
    const digest = digestCanonical(value);
    const path = join(directory, digest.slice(7) + ".json");
    await noLink(path);
    const temporary =
      path + "." + process.pid + "-" + randomBytes(8).toString("hex") + ".tmp";
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(canonicalize(value));
      await file.sync();
    } finally {
      await file.close();
    }
    try {
      try {
        await link(temporary, path);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      }
      // Validate existing content as well as files published by this invocation.
      const persisted = await this.cas(
        kind,
        digest,
        kind === "runs"
          ? PROCESS_BOUNDS.maxReceiptBytes
          : kind === "manifests"
            ? PROCESS_BOUNDS.maxManifestBytes
            : PROCESS_BOUNDS.maxRecordBytes,
      );
      if (!same(persisted, value)) invalid("process CAS conflict");
      await syncDirectory(directory);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
    return digest;
  }
  private async manifest(digest: Digest): Promise<OrganismManifest> {
    return parseOrganismManifest(
      await this.cas("manifests", digest, PROCESS_BOUNDS.maxManifestBytes),
    );
  }
  private async save(record: ProcessRecord): Promise<ProcessSnapshot> {
    const checked = parseProcessRecord(record);
    const digest = await this.publish("values", json(checked));
    await replace(join(await this.paths(record.name), "head.json"), {
      contract: "algal.process-head.v1",
      name: record.name,
      record: digest,
    });
    return { digest, process: checked };
  }
  private async names(): Promise<string[]> {
    const names: string[] = [];
    try {
      const directory = await opendir(await this.paths());
      for await (const entry of directory) {
        if (entry.name === ".lock") continue;
        if (entry.isSymbolicLink() || !entry.isDirectory())
          throw new AlgalError("IO_FAILED", "invalid process directory entry");
        names.push(asSafeId(entry.name, "process name"));
        if (names.length > PROCESS_BOUNDS.maxProcesses)
          throw new AlgalError("BUDGET_EXHAUSTED", "process count exceeded");
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return names.sort();
  }
  async create(
    name: string,
    manifest: OrganismManifest,
    args: unknown = {},
    maxGenerations = 16,
  ): Promise<ProcessSnapshot> {
    asSafeId(name, "process name");
    boundedValue(manifestToJson(manifest), PROCESS_BOUNDS.maxManifestBytes);
    const record = parseProcessRecord({
      contract: PROCESS_CONTRACT,
      name,
      manifestDigest: digestCanonical(manifestToJson(manifest)),
      args,
      maxGenerations,
      generation: 0,
      status: "ready",
      wake: [],
    });
    await compileOrganism(
      manifest,
      this.fns,
      this.store,
      0,
      this.host.transports,
      this.tools,
    );
    for (const [cell, ports] of Object.entries(record.args)) {
      const input = manifest.cells.find(
        (c) => c.id === cell && c.kind === "input",
      );
      if (
        !input ||
        input.kind !== "input" ||
        Object.keys(ports).some((p) => !Object.hasOwn(input.outputs, p))
      )
        throw new AlgalError(
          "INPUT_MISSING",
          "process args must name declared input ports",
        );
      for (const [port, value] of Object.entries(ports))
        checkValue(value, input.outputs[port]!, `${cell}.${port}`);
    }
    const base = await this.paths();
    await mkdir(base, { recursive: true, mode: 0o700 });
    await syncDirectory(this.dir);
    return this.lease(join(base, ".lock"), async () => {
      if ((await this.names()).length >= PROCESS_BOUNDS.maxProcesses)
        throw new AlgalError("BUDGET_EXHAUSTED", "process count exhausted");
      const path = await this.paths(name);
      await mkdir(path, { mode: 0o700 }); // Never replace an existing identity, even if initial creation was interrupted.
      await syncDirectory(base);
      await this.publish("manifests", manifestToJson(manifest));
      return this.save(record);
    });
  }
  async inspect(name: string): Promise<ProcessSnapshot> {
    const head = await readBounded(
      join(await this.paths(name), "head.json"),
      4096,
    );
    if (head === undefined)
      throw new AlgalError("STORE_MISS", "process head missing");
    const obj = asObject(head, "process head");
    noUnknownKeys(obj, ["contract", "name", "record"], "process head");
    if (obj.contract !== "algal.process-head.v1" || obj.name !== name)
      invalid("process head identity mismatch");
    const digest = asDigest(obj.record, "process record");
    const record = parseProcessRecord(
      await this.cas("values", digest, PROCESS_BOUNDS.maxRecordBytes),
    );
    if (record.name !== name) invalid("process name mismatch");
    const snapshot = { digest, process: record };
    await this.history(snapshot);
    return snapshot;
  }
  async list(): Promise<ProcessSnapshot[]> {
    const result = [];
    for (const name of await this.names())
      result.push(await this.inspect(name));
    return result;
  }
  private requireJournalSafe(compiled: CompiledOrganism): void {
    if (!isBuiltinRegistry(this.fns)) throw new AlgalError("CAPABILITY_DENIED", "journal recovery requires unchanged built-in pure functions");
    const visit = (program: CompiledOrganism): void => {
      for (const cell of program.manifest.cells) {
        if (cell.kind === "slot" || cell.kind === "spawn") throw new AlgalError("CAPABILITY_DENIED", "journal recovery does not admit slots or dynamic spawn");
      }
      for (const child of program.children.values()) visit(child);
    };
    visit(compiled);
  }

  private async executeIntent(intent: ProcessSnapshot, manifest: OrganismManifest, checkpoint: JsonValue | undefined, journal?: ProcessJournal): Promise<ProcessSnapshot> {
    const name = intent.process.name;
    const executors = this.host.executors ?? [];
    const runtime = { processName: name, ...(journal ? {journal} : {}) };
    const receipt = checkpoint
      ? await resumeRun(checkpoint, manifestToJson(manifest), this.store, executors, this.fns, this.host.transports, this.tools, runtime)
      : await runOrganism({manifest, args: intent.process.args, store: this.store, fns: this.fns, executors, tools: this.tools, ...runtime,
          ...(this.host.transports ? {transports: this.host.transports} : {})});
    journal?.assertComplete();
    boundedValue(receipt, PROCESS_BOUNDS.maxReceiptBytes);
    const receiptRef = await this.publish("runs", json(receipt));
    return this.save({...intent.process, previous: intent.digest, status: receipt.outcome, receipt: receiptRef, wake: wakeOf(receipt)});
  }

  async recover(name: string, expectedIntent: Digest): Promise<ProcessSnapshot> {
    const path = await this.paths(name);
    return this.lease(join(path, ".lock"), async () => {
      const intent = await this.inspect(name);
      if (intent.digest !== asDigest(expectedIntent, "expected intent") || intent.process.status !== "uncertain") invalid("recovery requires the exact current uncertain intent");
      const manifest = await this.manifest(intent.process.manifestDigest);
      if (!manifest) throw new AlgalError("STORE_MISS", "process manifest missing");
      const compiled = await compileOrganism(manifest, this.fns, this.store, 0, undefined, this.tools);
      this.requireJournalSafe(compiled);
      const checkpoint = intent.process.receipt ? await this.cas("runs", intent.process.receipt, PROCESS_BOUNDS.maxReceiptBytes) : undefined;
      if (checkpoint) {
        const verified = await verifyReceipt(checkpoint, manifestToJson(manifest), this.store, this.fns, undefined, this.tools);
        if (!verified.ok) invalid("recovery checkpoint does not replay");
      }
      const journal = await ProcessJournal.open(this.dir, name, intent.digest, intent.process.manifestDigest);
      await journal.beginRecovery();
      return this.executeIntent(intent, manifest, checkpoint, journal);
    });
  }

  async journal(name: string): Promise<JsonValue> {
    const snapshot = await this.inspect(name);
    const chain = await this.history(snapshot);
    const intent = [...chain].reverse().find(item => item.process.status === "uncertain");
    if (!intent) throw new AlgalError("IO_FAILED", "process has no dispatch intent");
    return (await ProcessJournal.open(this.dir, name, intent.digest, intent.process.manifestDigest)).describe();
  }
  private async history(snapshot: ProcessSnapshot): Promise<ProcessSnapshot[]> {
    return readProcessHistory(snapshot, this.store, (kind, digest, max) =>
      this.cas(kind, digest, max),
    );
  }
  async verify(
    name: string,
  ): Promise<{
    ok: true;
    generations: number;
    receipts: number;
    digest: Digest;
  }> {
    return verifyProcessSnapshot(
      await this.inspect(name),
      this.store,
      this.fns,
      this.tools,
      (kind, digest, max) => this.cas(kind, digest, max),
    );
  }
  /** Data-only signatures for portable replay; no host callbacks or identities. */
  evidenceTools(): ToolRegistry {
    if (!isBuiltinRegistry(this.fns))
      throw new AlgalError(
        "CAPABILITY_DENIED",
        "portable evidence requires unchanged built-in pure functions",
      );
    return new Map(
      [...this.tools].map(([name, entry]) => [
        name,
        {
          signature: structuredClone(entry.signature),
          tool: async () => {
            throw new AlgalError(
              "CAPABILITY_DENIED",
              "portable evidence cannot invoke live tools",
            );
          },
        },
      ]),
    );
  }
  async tick(
    name: string,
    automatic = false,
  ): Promise<ProcessSnapshot | undefined> {
    const path = await this.paths(name);
    return this.lease(join(path, ".lock"), async () => {
      const snapshot = await this.inspect(name);
      const record = snapshot.process;
      if (!["ready", "suspended"].includes(record.status)) {
        if (automatic && record.status !== "uncertain") return undefined;
        throw new AlgalError(
          "IO_FAILED",
          record.status === "uncertain"
            ? "process dispatch is uncertain; reconcile before any further execution"
            : "process is terminal",
        );
      }
      if (record.generation >= record.maxGenerations) {
        if (automatic) return undefined;
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          "process generation budget exhausted",
        );
      }
      let cause: ProcessRecord["cause"] =
        record.status === "ready" ? "start" : "manual";
      if (automatic && record.status === "suspended") {
        cause = undefined;
        for (const handle of record.wake)
          if (
            parseCapabilityHandle(handle).capability === "mailbox-receive" &&
            (await this.mailboxes.hasPending(handle))
          ) {
            cause = handle;
            break;
          }
        if (!cause) return undefined;
      }
      const manifest = await this.manifest(record.manifestDigest);
      if (!manifest)
        throw new AlgalError("STORE_MISS", "process manifest missing");
      const compiled = await compileOrganism(
        manifest,
        this.fns,
        this.store,
        0,
        this.host.transports,
        this.tools,
      );
      const checkpoint = record.receipt
        ? await this.cas("runs", record.receipt, PROCESS_BOUNDS.maxReceiptBytes)
        : undefined;
      // Verify before publishing intent and before admitting any live work.
      if (checkpoint) {
        const report = await verifyReceipt(
          checkpoint,
          manifestToJson(manifest),
          this.store,
          this.fns,
          undefined,
          this.tools,
        );
        if (!report.ok) invalid("process checkpoint does not replay");
      }
      if (this.host.journal) this.requireJournalSafe(compiled);
      const intentRecord: ProcessRecord = {
        ...record,
        generation: record.generation + 1,
        status: "uncertain",
        previous: snapshot.digest,
        cause,
      };
      const intentDigest = digestCanonical(json(intentRecord));
      const journal = this.host.journal ? await ProcessJournal.create(this.dir, name, intentDigest, record.manifestDigest,
        typeof this.host.journal === "object" ? this.host.journal.maxRecoveries ?? 2 : 2) : undefined;
      const intent = await this.save(intentRecord);
      return this.executeIntent(intent, manifest, checkpoint, journal);
    });
  }
  async schedule(
    maxTicks = 16,
  ): Promise<{ ticks: number; processes: ProcessSnapshot[] }> {
    asInt(maxTicks, "maxTicks", 1, PROCESS_BOUNDS.maxProcesses);
    const processes: ProcessSnapshot[] = [];
    for (const name of await this.names()) {
      if (processes.length >= maxTicks) break;
      const snapshot = await this.inspect(name);
      if (!["ready", "suspended"].includes(snapshot.process.status)) continue;
      const next = await this.tick(name, true);
      if (next) processes.push(next);
    }
    return { ticks: processes.length, processes };
  }
}
