/** Opt-in diagnostic: how Browser Tasks verification work grows with saved
 * history. It adds synthetic tasks, optionally saves owner workflow
 * candidates, then edits tasks one at a time until the application refuses the
 * next edit. Every change records its private history replays, individual
 * candidate proofs, stored-record reads, and elapsed time; captures are
 * measured at checkpoints. Browser Tasks code is not modified: the controller,
 * triage core, and memory store are wrapped only to count calls. Counts and
 * timings stay outside application records, and the output carries counts and
 * digests only, never task text.
 *
 * Run through the host scheduler, for example:
 *   bun scripts/measure-history-scaling.ts --tasks 32 --title-length 120 --out history.json
 * With 32 tasks and 120-character titles, history approaches its 128-state,
 * 1,024-record, and 8 MiB limits together; shorter titles reach the record
 * limit first with far fewer bytes.
 *
 * Options (each bounded): --tasks 1-32 (default 32), --candidates 0-16
 * (default 0), --title-length 8-120 (default 24), --every 1-128 states between
 * capture checkpoints (default 16), --samples 1-5 captures per checkpoint
 * (default 3), --stop-at 2-128 states (default: continue until refused), and
 * --out <file> to write the JSON record there. Without --out the JSON record
 * goes to stdout; the text table always goes to stderr. */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { cpus, loadavg, totalmem } from "node:os";
import { BrowserTriageController } from "../examples/browser-triage/controller";
import { TriageCore } from "../examples/local-triage/core";
import { MAX_STATES, type Config, type Transfer } from "../examples/local-triage/contract";
import { applicationJson } from "../src/application-contract";
import { MemoryApplicationStorage } from "../src/application-storage";
import type { Digest } from "../src/digest";
import { MemoryStore } from "../src/store-memory";
import { utf8Length } from "../src/utf8";
import { canonicalize } from "../src/values";

/** The transfer limits that also bound the verified history (core.ts). */
const LIMITS = { states: MAX_STATES, records: 1_024, recordBytes: 8_388_608 - 65_536, transferBytes: 8_388_608 } as const;
const OPTIONS = {
  tasks: { fallback: 32, min: 1, max: 32 },
  candidates: { fallback: 0, min: 0, max: 16 },
  "title-length": { fallback: 24, min: 8, max: 120 },
  every: { fallback: 16, min: 1, max: 128 },
  samples: { fallback: 3, min: 1, max: 5 },
  "stop-at": { fallback: LIMITS.states, min: 2, max: LIMITS.states },
} as const;
type OptionName = keyof typeof OPTIONS;
const USAGE = "Usage: measure-history-scaling.ts [--tasks 1-32] [--candidates 0-16] [--title-length 8-120] [--every 1-128] [--samples 1-5] [--stop-at 2-128] [--out file.json]";

function parseOptions(argv: readonly string[]): { values: Record<OptionName, number>; out: string | undefined } {
  if (argv.length % 2 !== 0 || argv.length > 2 * (Object.keys(OPTIONS).length + 1)) throw new Error(USAGE);
  const values = Object.fromEntries(Object.entries(OPTIONS).map(([name, option]) => [name, option.fallback])) as Record<OptionName, number>;
  const seen = new Set<string>();
  let out: string | undefined;
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]!, raw = argv[index + 1]!;
    const name = flag.startsWith("--") ? flag.slice(2) : "";
    if (seen.has(name)) throw new Error(`${flag} is repeated. ${USAGE}`);
    seen.add(name);
    if (name === "out") { if (!raw || raw.length > 4_096) throw new Error("--out needs a file path"); out = raw; continue; }
    if (!Object.hasOwn(OPTIONS, name)) throw new Error(`Unknown option ${flag}. ${USAGE}`);
    const option = OPTIONS[name as OptionName], value = Number(raw);
    if (!/^\d{1,3}$/.test(raw) || !Number.isSafeInteger(value) || value < option.min || value > option.max) throw new Error(`--${name} must be an integer from ${option.min} through ${option.max}`);
    values[name as OptionName] = value;
  }
  return { values, out };
}
const { values: options, out } = parseOptions(process.argv.slice(2));
// The host is often shared: record its load beside the timings it affects.
const loadAtStart = loadavg().map(value => Math.round(value * 100) / 100);

type Reads = { value: number; manifest: number; receipt: number };
type Counts = { replays: number; individualProofs: number; live: Reads; private: Reads };
const zero = (): Counts => ({ replays: 0, individualProofs: 0, live: { value: 0, manifest: 0, receipt: 0 }, private: { value: 0, manifest: 0, receipt: 0 } });
const reads = (counts: Counts): number => Object.values(counts.live).reduce((sum, n) => sum + n, 0) + Object.values(counts.private).reduce((sum, n) => sum + n, 0);
// Private verification copies use their own stores; only this one is live.
const storage = new MemoryApplicationStorage(), liveStore: unknown = storage.store;
let active: Counts | undefined;

/** Count calls without changing arguments, results, errors, or ordering. */
function wrap(target: object, name: string, onCall: (self: unknown) => void): void {
  const methods = target as Record<string, (...input: unknown[]) => unknown>, original = methods[name];
  if (typeof original !== "function") throw new Error(`Missing diagnostic method ${name}`);
  methods[name] = function (this: unknown, ...input: unknown[]) { if (active) onCall(this); return original.apply(this, input); };
}
// Every private history replay goes through this static method, including
// transfer verification during preparation and recovery.
wrap(TriageCore, "withVerifiedTransfer", () => { active!.replays++; });
// Each first call in an operation proves one saved candidate with its own replay.
wrap(BrowserTriageController.prototype, "inspectEvaluation", () => { active!.individualProofs++; });
for (const [method, kind] of [["getValue", "value"], ["getManifest", "manifest"], ["getReceipt", "receipt"]] as const) {
  wrap(MemoryStore.prototype, method, self => { active![self === liveStore ? "live" : "private"][kind]++; });
}

async function measure<T>(operation: () => Promise<T>): Promise<{ result?: T; error?: string; ms: number; counts: Counts }> {
  const counts = zero(), started = performance.now();
  active = counts;
  try { return { result: await operation(), ms: performance.now() - started, counts }; }
  catch (error) { return { error: error instanceof Error ? error.message.slice(0, 240) : "non-error rejection", ms: performance.now() - started, counts }; }
  finally { active = undefined; }
}

type Internals = { exportRecords(extra?: Digest[]): Promise<Transfer>; evaluationRoots(refs: Digest[]): Promise<Digest[]> };
const saved: Digest[] = [];
/** The transfer a replay copies, measured as core.ts bounds it: the history
 * alone, and with every saved candidate's closure, which a replay shares only
 * while the combined transfer fits. The traversal reads records only, outside
 * every measured window. */
async function size(): Promise<{ states: number; records: number; recordBytes: number; transferBytes: number; withCandidates: { records: number; recordBytes: number } | "over-limit" | null }> {
  const core = controller.core as unknown as Internals, transfer = await core.exportRecords();
  const bytes = (rows: Transfer["records"]) => rows.reduce((sum, row) => sum + utf8Length(canonicalize(applicationJson(row))), 0);
  let withCandidates: { records: number; recordBytes: number } | "over-limit" | null = null;
  if (saved.length) {
    try { const combined = await core.exportRecords(await core.evaluationRoots(saved)); withCandidates = { records: combined.records.length, recordBytes: bytes(combined.records) }; }
    catch (error) { if (!(error instanceof Error) || !/capacity|bound/i.test(error.message)) throw error; withCandidates = "over-limit"; }
  }
  return { states: transfer.states.length, records: transfer.records.length, recordBytes: bytes(transfer.records), transferBytes: utf8Length(JSON.stringify(transfer)), withCandidates };
}

/** Deterministic printable text of an exact length, within the task title limit. */
const text = (prefix: string, length: number) => (prefix + " " + "abcdefghij".repeat(12)).slice(0, length).trimEnd().padEnd(length, "x");
function workflows(total: number): { config: Config; schemaVersion: 1 | 2; rationale: string }[] {
  const result: { config: Config; schemaVersion: 1 | 2; rationale: string }[] = [];
  for (const group of ["none", "priority", "category", "status"] as const) for (const sort of ["title", "created", "priority"] as const) for (const allowReopen of [false, true]) {
    if (result.length < total) result.push({ config: { sort, group, allowReopen }, schemaVersion: group === "category" || result.length % 2 === 1 ? 2 : 1, rationale: `Synthetic workflow candidate ${result.length + 1}` });
  }
  return result;
}
const sha256 = async (path: string) => `sha256:${createHash("sha256").update(await readFile(new URL(path, import.meta.url))).digest("hex")}`;
const summary = (counts: Counts) => ({ replays: counts.replays, individualProofs: counts.individualProofs, reads: { live: counts.live, private: counts.private, total: reads(counts) } });

type Size = Awaited<ReturnType<typeof size>>;
type Change = { kind: "add" | "propose" | "edit"; before: Size; ms: number } & ReturnType<typeof summary>;
type Capture = { at: Size; samplesMs: number[]; medianMs: number; sameWorkEachSample: boolean } & ReturnType<typeof summary>;
type Refusal = { kind: Change["kind"]; before: Size; message: string; ms: number } & ReturnType<typeof summary>;
const changes: Change[] = [], captures: Capture[] = [], outcome: { refusal: Refusal | null } = { refusal: null };
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor((sorted.length - 1) / 2)]!; };
const round = (value: number) => Math.round(value * 10) / 10;

async function checkpoint(): Promise<void> {
  const at = await size(), samples: number[] = [];
  let first: Counts | undefined, same = true;
  for (let sample = 0; sample < options.samples; sample++) {
    const run = await measure(() => controller.capture());
    if (run.error !== undefined || run.result?.head !== current.head) throw new Error(`Capture failed at ${at.states} states: ${run.error ?? "head changed"}`);
    samples.push(round(run.ms)); first ??= run.counts;
    // A capture is read-only, so each sample should repeat the same verification work.
    same &&= reads(run.counts) === reads(first) && run.counts.replays === first.replays;
  }
  captures.push({ at, samplesMs: samples, medianMs: median(samples), sameWorkEachSample: same, ...summary(first!) });
  console.error(JSON.stringify({ measurement: "history-scaling-capture", states: at.states, records: at.records, medianMs: median(samples) }));
}

const controller = new BrowserTriageController(storage);
let current = await controller.initialize();
// States at the last capture checkpoint; -1 measures the next task change.
let lastCheckpoint = -1;
async function change(kind: Change["kind"], action: () => Promise<Awaited<ReturnType<typeof controller.capture>>>): Promise<boolean> {
  const before = await size();
  if (kind !== "propose" && (lastCheckpoint < 0 || before.states - lastCheckpoint >= options.every)) { await checkpoint(); lastCheckpoint = before.states; }
  const run = await measure(action);
  if (run.error !== undefined) { outcome.refusal = { kind, before, message: run.error, ms: round(run.ms), ...summary(run.counts) }; return false; }
  current = run.result!;
  changes.push({ kind, before, ms: round(run.ms), ...summary(run.counts) });
  if (changes.length % 8 === 0) console.error(JSON.stringify({ measurement: "history-scaling-progress", changes: changes.length, states: current.history.length, lastMs: round(run.ms) }));
  return true;
}

let open = true;
for (let index = 0; open && index < options.tasks; index++) {
  open = await change("add", () => controller.act(current.head, { kind: "add", task: { id: `task-${index}`, title: text(`Synthetic task ${index}`, options["title-length"]), priority: "normal", status: "open", category: "inbox" } }));
}
for (const workflow of workflows(options.candidates)) {
  if (!open) break;
  open = await change("propose", () => controller.propose(current.head, workflow));
  if (!open) break;
  if (!current.pending) throw new Error("Workflow candidate was not saved at the task head");
  saved.push(current.pending.reference);
}
// Saved candidates change every later verification; measure at once.
if (saved.length) lastCheckpoint = -1;
for (let edit = 0; open && current.history.length < options["stop-at"]; edit++) {
  open = await change("edit", () => controller.act(current.head, { kind: "edit", taskId: `task-${edit % options.tasks}`, title: text(`Synthetic edit ${edit}`, options["title-length"]), priority: (["high", "normal", "low"] as const)[edit % 3]!, category: "inbox" }));
}
// The final size is always measured: after a refusal the history is unchanged.
if ((await size()).states !== lastCheckpoint) await checkpoint();

const record = {
  measurement: "browser-tasks-history-scaling",
  runtime: { bun: Bun.version, platform: process.platform, arch: process.arch },
  host: { cpu: cpus()[0]?.model ?? "unknown", cores: cpus().length, memoryBytes: totalmem(), loadAverage: { start: loadAtStart, end: loadavg().map(value => Math.round(value * 100) / 100) } },
  options: { tasks: options.tasks, candidates: options.candidates, titleLength: options["title-length"], every: options.every, samples: options.samples, stopAt: options["stop-at"] },
  limits: LIMITS,
  sources: { controller: await sha256("../examples/browser-triage/controller.ts"), core: await sha256("../examples/local-triage/core.ts"), diagnostic: await sha256(import.meta.url) },
  head: current.head, changes, captures, refusal: outcome.refusal,
  // Duration of the whole diagnostic, setup included; not a timestamp.
  elapsedMs: Math.round(performance.now()),
};
const json = JSON.stringify(record, null, 2);
if (out === undefined) console.log(json);
else await writeFile(out, `${json}\n`);

// Checkpoint rows pair each capture with the task change attempted at that
// size; a refused change is marked with an asterisk.
const percent = (value: number, limit: number) => `${Math.round((100 * value) / limit)}%`;
const rows = captures.map(capture => {
  const refused = outcome.refusal?.before.states === capture.at.states ? outcome.refusal : undefined;
  const edit = changes.find(row => row.before.states === capture.at.states && row.kind !== "propose") ?? refused;
  const mark = edit === refused && edit !== undefined ? "*" : "";
  const combined = capture.at.withCandidates;
  return [
    String(capture.at.states), `${capture.at.records} (${percent(capture.at.records, LIMITS.records)})`,
    `${(capture.at.recordBytes / 1_048_576).toFixed(2)} (${percent(capture.at.recordBytes, LIMITS.recordBytes)})`,
    ...(options.candidates ? [combined === null ? "-" : combined === "over-limit" ? "over limit" : String(combined.records)] : []),
    edit ? `${edit.replays}${mark}` : "-", edit ? `${edit.reads.total}${mark}` : "-", edit ? `${edit.ms.toFixed(0)}${mark}` : "-",
    String(capture.replays), String(capture.reads.total), capture.medianMs.toFixed(0),
  ];
});
const header = ["States", "Records", "MiB", ...(options.candidates ? ["With candidates"] : []), "Change replays", "Change reads", "Change ms", "Capture replays", "Capture reads", "Capture ms"];
const widths = header.map((title, column) => Math.max(title.length, ...rows.map(row => row[column]!.length)));
console.error([header, ...rows].map(row => row.map((cell, column) => cell.padStart(widths[column]!)).join("  ")).join("\n"));
if (outcome.refusal !== null) console.error(`* Refused at ${outcome.refusal.before.states} states: ${outcome.refusal.message}`);
