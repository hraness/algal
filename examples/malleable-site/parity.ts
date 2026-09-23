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
import { DEFAULT_CONFIG, DEFAULT_SIGNALS, evaluateView, makeRevision, updateSignals, type SurfaceSignals } from "./surface";
import { viewManifest, updateManifest } from "./host";

const root = resolve(import.meta.dir, "../.."), binary = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const temporary = await mkdtemp(join(tmpdir(), "algal-marketing-parity-"));
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
  await writeFile(file, canonicalize(manifestJson)); await writeFile(args, canonicalize({ input }));
  const reference = await runOrganism({ manifest, args: { input }, store, fns: builtinRegistry(), executors: [] });
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
  for (const layout of ["split", "stack"] as const) {
    const revision = makeRevision({ ...DEFAULT_CONFIG, layout, ...(layout === "stack" ? { headline: "A new <component> 🌱" } : {}) });
    for (const audience of ["builders", "operators"] as const) for (const release of ["preview", "available"] as const) {
      const signals: SurfaceSignals = { audience, release };
      await compare(`view-${layout}-${audience}-${release}`, viewManifest(revision), { signals }, evaluateView(revision, signals));
    }
  }
  for (const event of [{ kind: "audience", value: "operators" }, { kind: "release", value: "available" }] as const) {
    await compare(`update-${event.kind}`, updateManifest(), { signals: DEFAULT_SIGNALS, event }, updateSignals(DEFAULT_SIGNALS, event));
  }
  console.log(`marketing parity: ${cases} complete native/reference receipts match; ${cases * 2} cross-runtime offline verifications; expression view/update outputs match`);
} finally { await rm(temporary, { recursive: true, force: true }); }
