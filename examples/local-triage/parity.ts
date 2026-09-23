/** Same generated view/update programs, complete native/reference receipts,
 * cross-runtime replay and browser-expression outputs. No model calls. */
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { manifestToJson, type OrganismManifest } from "../../src/contract";
import { applicationJson } from "../../src/application-contract";
import { builtinRegistry } from "../../src/registry";
import { runOrganism } from "../../src/run";
import { MemoryStore } from "../../src/store";
import { canonicalize, type JsonValue } from "../../src/values";
import { verifyReceipt } from "../../src/verify";
import { DEFAULT_CONFIG, DEFAULT_SESSION, type Task, type Action } from "./contract";
import { evaluateView, makeRevision, updateTasks, viewManifest, updateManifest, claimsManifest, migrationManifest } from "./programs";

const root = resolve(import.meta.dir, "../.."), binary = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const temporary = await mkdtemp(join(tmpdir(), "algal-triage-parity-"));
async function native(args: string[]): Promise<JsonValue> {
  const child = Bun.spawn([binary, ...args, "--dir", join(temporary, "store")], { cwd: temporary, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const timer = setTimeout(() => child.kill("SIGKILL"), 15_000);
  const bounded = async (stream: ReadableStream<Uint8Array>, limit: number) => {
    const reader = stream.getReader(), chunks: Uint8Array[] = []; let bytes = 0;
    try { for (;;) { const row = await reader.read(); if (row.done) break; bytes += row.value.length; if (bytes > limit) { child.kill("SIGKILL"); throw new Error("Parity output bound exceeded"); } chunks.push(row.value); } return Buffer.concat(chunks).toString("utf8"); }
    finally { reader.releaseLock(); }
  };
  try {
    const [stdout, stderr, code] = await Promise.all([bounded(child.stdout, 262_144), bounded(child.stderr, 16_384), child.exited]);
    if (code !== 0) throw new Error(`Native parity command failed: ${stderr}`);
    return JSON.parse(stdout) as JsonValue;
  } finally { clearTimeout(timer); if (child.exitCode === null) child.kill("SIGKILL"); await child.exited; }
}
let cases = 0;
async function compare(name: string, manifest: OrganismManifest, input: Record<string, JsonValue>, expected: JsonValue) {
  const store = new MemoryStore(), manifestJson = manifestToJson(manifest), file = join(temporary, `${name}.algal.json`), args = join(temporary, `${name}.args.json`);
  const boundArgs = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, { value }]));
  await writeFile(file, canonicalize(manifestJson)); await writeFile(args, canonicalize(boundArgs));
  const reference = await runOrganism({ manifest, args: boundArgs, store, fns: builtinRegistry(), executors: [] });
  if (reference.outcome !== "complete" || canonicalize(reference.cells.result!.outputs!.out!) !== canonicalize(expected)) throw new Error(`${name}: expression/runtime output mismatch`);
  const actual = await native(["run", file, "--args", args]);
  if (canonicalize(actual) !== canonicalize(applicationJson(reference))) throw new Error(`${name}: complete native/reference receipts differ`);
  if (!(await verifyReceipt(actual, manifestJson, store)).ok) throw new Error(`${name}: reference cannot replay native receipt`);
  const receiptFile = join(temporary, `${name}.reference.receipt.json`);
  await writeFile(receiptFile, canonicalize(applicationJson(reference)));
  const report = await native(["verify", receiptFile, file]) as { ok?: boolean };
  if (report.ok !== true) throw new Error(`${name}: native cannot replay reference receipt`);
  cases++;
}
try {
  await access(binary);
  const tasks: Task[] = [
    { id: "first", title: "Write tests", priority: "low", status: "open", category: "work" },
    { id: "second", title: "Review evidence", priority: "high", status: "done", category: "inbox" },
    { id: "third", title: "Review docs", priority: "normal", status: "open", category: "work" },
  ];
  for (const sort of ["priority", "title", "created"] as const) for (const group of ["none", "status", "priority", "category"] as const) {
    const revision = makeRevision({ sort, group, allowReopen: sort !== "created" }, 2);
    const session = { ...DEFAULT_SESSION, filter: group === "none" ? "open" as const : "all" as const, query: sort === "title" ? "Review" : "" };
    await compare(`view-${sort}-${group}`, viewManifest(revision), { tasks, session }, applicationJson(evaluateView(revision, tasks, session)));
  }
  const actions: Action[] = [
    { kind: "add", task: { id: "fourth", title: "New task", priority: "high", status: "open", category: "work" } },
    { kind: "edit", taskId: "first", title: "Revised title", priority: "normal", category: "inbox" },
    { kind: "complete", taskId: "first" }, { kind: "reopen", taskId: "second" },
  ];
  for (const action of actions) await compare(`update-${action.kind}`, updateManifest(), { tasks, action }, updateTasks(tasks, action, makeRevision(DEFAULT_CONFIG, 2)));
  for (const version of [1, 2] as const) await compare(`claims-${version}`, claimsManifest(version), { tasks }, { claims: tasks.map(t => ({ relation: "task", tuple: [t.id, t.title, t.priority, t.status, ...(version === 2 ? [t.category] : [])], polarity: "supported" })) });
  const claims = tasks.map(t => ({ claim: { relation: "task", tuple: [t.id, t.title, t.priority, t.status], polarity: "supported" }, frontier: "sha256:" + "0".repeat(64) }));
  await compare("migration", migrationManifest(), { claims, frontier: "sha256:" + "0".repeat(64) }, { claims: claims.map(row => ({ ...row.claim, tuple: [...row.claim.tuple, "inbox"] })) });
  console.log(`triage parity: ${cases} complete native/reference receipts match; ${cases * 2} cross-runtime offline verifications; pure forms/actions/filter/order/group/claims/migration outputs match`);
} finally { await rm(temporary, { recursive: true, force: true }); }
