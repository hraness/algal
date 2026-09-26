/**
 * verify/differential/run.ts — the differential driver. Executes the case
 * catalog against the committed WASM boundary (supervised batch worker in
 * `subprocess` mode, in-process in `inline` mode), the native binary when an
 * explicit path is supplied, and the Bun wrapper leg for flagged cases; then
 * compares every observation against the independent oracle and reports.
 *
 * Modes:
 *   inline     — wasm calls run in-process (tests; same artifact, no custody)
 *   subprocess — wasm calls run via worker.ts under runCommand custody
 *
 * Required input selection: wasm path is explicit; the native binary is an
 * explicit absolute path (env ALGAL_DIFFERENTIAL_NATIVE_BIN at the adapter),
 * never discovered ambiently.
 */

import { constants } from "node:fs";
import { mkdir, open, writeFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, join } from "node:path";
import { hashBytes, stableJson } from "../lib/files";
import { requireThat } from "../lib/schema";
import { runCommand, CommandFailure, type CommandResult } from "../lib/runner";
import { catalog, type Case } from "./cases";
import { compareCase, classifyResponse, wrapperFaithful, type Comparison, type TargetResponse } from "./engine";
import { predictEval, predictCheck } from "./oracle";
import { parseJsonBytes } from "./json";
import { callRaw, loadWasmModule, type WasmModule } from "./wasm";
import { shrinkBytes } from "./shrink";

export type ArtifactRef = { path: string; sha256: string; bytes: number };

/** Explicit task-owned artifact identity: absolute path, regular file, byte
 * bound, sha256. Never resolves symlinks to other identity claims. */
export async function artifactRef(path: string): Promise<ArtifactRef> {
  requireThat(isAbsolute(path), "artifact path must be explicit and absolute");
  const physical = await realpath(path);
  const fd = await open(physical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const st = await fd.stat();
    requireThat(st.isFile() && st.size > 0 && st.size <= 536_870_912, "artifact type/byte bound");
    const hash = createHash("sha256");
    let bytes = 0;
    for (;;) {
      const buf = Buffer.alloc(65_536);
      const { bytesRead } = await fd.read(buf);
      if (!bytesRead) break;
      bytes += bytesRead;
      requireThat(bytes <= 536_870_912, "artifact grew past bound");
      hash.update(buf.subarray(0, bytesRead));
    }
    return { path: physical, sha256: `sha256:${hash.digest("hex")}`, bytes };
  } finally { await fd.close(); }
}

export const LIMITS = {
  cases: 2_048,
  inputBytes: 400_000,
  outputBytes: 1_048_576,
  workerCases: 128,
  workerMs: 60_000,
  // Under runCommand's 8 MiB ceiling and above the worker's own 2 MiB
  // line bound — a shard that exceeds it is a custody failure, not silence.
  workerOutBytes: 4_194_304,
  nativeMs: 10_000,
  nativeOutBytes: 1_048_576,
  mismatchReport: 256,
  shrinkAttempts: 64,
  shrinkMs: 45_000,
} as const;

export type Report = {
  contract: "algal.differential-report.v1";
  seeds: number[];
  cases: number;
  mode: "inline" | "subprocess";
  artifacts: { wasm: ArtifactRef; native: ArtifactRef | null; bun: ArtifactRef };
  verdicts: Record<string, number>;
  oracle: { exact: number; uncovered: number };
  coverage: { ops: string[]; codes: Record<string, number>; notes: string[] };
  mismatches: { id: string; axis: string; detail: string; shrunkBytes?: number; shrunkSha256?: string }[];
  elapsedMs: number;
};

type WasmLine = { id: string; wasm: { status: string; text?: string; error?: string }; wrapper: unknown };

const parseLines = (text: string): WasmLine[] =>
  text.split("\n").filter(l => l.length > 0).map(l => JSON.parse(l) as WasmLine);

/** A worker shard completed custody-clean but returned a nonzero exit or a
 * malformed line stream — a target-side finding attributed to the shard. */
class ShardFailure extends Error {
  constructor(readonly result: CommandResult, why: string) {
    super(`worker shard ${why}: exit ${result.exitCode} signal ${result.signal} ${result.stderr.slice(0, 300)}`);
    this.name = "ShardFailure";
  }
}

async function runShard(root: string, manifest: string, cases: Case[]): Promise<WasmLine[]> {
  const result = await runCommand(
    [process.execPath, join(import.meta.dir, "worker.ts"), manifest],
    root,
    { timeoutMs: LIMITS.workerMs, maxOutputBytes: LIMITS.workerOutBytes },
  );
  if (result.exitCode !== 0) throw new ShardFailure(result, "nonzero exit");
  const lines = parseLines(result.stdout);
  if (lines.length !== cases.length) throw new ShardFailure(result, "output line count mismatch");
  return lines;
}

/** Recursive shard runner: bisects around a crashing case so one bad input
 * cannot suppress its siblings' observations. */
async function wasmBatch(root: string, dir: string, shard: number, wasm: string, cases: Case[], depth = 0): Promise<Map<string, WasmLine>> {
  requireThat(depth <= 6, "wasm shard recursion bound");
  const manifestPath = join(dir, `shard-${depth}-${shard}.manifest.json`);
  await writeFile(manifestPath, stableJson({
    wasm,
    cases: cases.map(c => ({ id: c.id, path: join(dir, `${c.id}.bin`), mode: c.mode, wrapper: c.wrapper })),
  }) + "\n", { flag: "wx", mode: 0o600 });
  try {
    const lines = await runShard(root, manifestPath, cases);
    return new Map(lines.map(l => [l.id, l]));
  } catch (error) {
    if (cases.length === 1) {
      const c = cases[0]!;
      const why = error instanceof ShardFailure ? error.message
        : error instanceof CommandFailure ? `custody failure: ${error.message}`
        : String(error);
      return new Map([[c.id, { id: c.id, wasm: { status: "crashed", error: why.slice(0, 300) }, wrapper: "skipped" }]]);
    }
    const mid = Math.ceil(cases.length / 2);
    const left = await wasmBatch(root, dir, shard * 2, wasm, cases.slice(0, mid), depth + 1);
    const right = await wasmBatch(root, dir, shard * 2 + 1, wasm, cases.slice(mid), depth + 1);
    return new Map([...left, ...right]);
  }
}

async function inlineWasm(mod: WasmModule, c: Case): Promise<WasmLine> {
  if (c.bytes.byteLength === 0) return { id: c.id, wasm: { status: "null-input", error: "zero-byte input cannot allocate" }, wrapper: "skipped" };
  let text = "";
  try {
    text = callRaw(mod, c.mode === "eval" ? "algal_eval" : "algal_check", c.bytes);
  } catch (error) {
    return { id: c.id, wasm: { status: "trap", error: String(error).slice(0, 300) }, wrapper: "skipped" };
  }
  let wrapper: unknown = "skipped";
  if (c.wrapper && wrapperFaithful(c.bytes)) {
    try {
      let doc: unknown;
      try { doc = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(c.bytes)); } catch { doc = undefined; }
      if (doc !== null && typeof doc === "object" && !Array.isArray(doc)) {
        const d = doc as Record<string, unknown>;
        const { setExprExports, evalProgram, checkProgram } = await import("../../src/expr");
        setExprExports(new WebAssembly.Instance(mod.module, {}).exports as never);
        if (c.mode === "check") {
          const names = Array.isArray(d.names) ? d.names.filter((n): n is string => typeof n === "string") : [];
          wrapper = checkProgram(d.program as never, names);
        } else {
          const env = d.env !== null && typeof d.env === "object" && !Array.isArray(d.env) ? d.env : {};
          const fuel = typeof d.fuel === "number" && Number.isFinite(d.fuel) ? d.fuel : 10_000;
          wrapper = evalProgram(d.program as never, env as never, fuel);
        }
      }
    } catch (error) {
      wrapper = { threw: String(error).slice(0, 300) };
    }
  }
  return { id: c.id, wasm: { status: "ok", text }, wrapper };
}

async function nativeCase(root: string, bin: string, file: string, mode: "eval" | "check"): Promise<TargetResponse> {
  try {
    const result = await runCommand([bin, mode, file], root, { timeoutMs: LIMITS.nativeMs, maxOutputBytes: LIMITS.nativeOutBytes });
    if (result.exitCode !== 0) return { status: "nonzero", error: `exit ${result.exitCode}: ${result.stderr.slice(0, 200)}` };
    const text = result.stdout.trim();
    if (!text.startsWith("{")) return { status: "bad-output", error: `unshaped stdout: ${text.slice(0, 100)}` };
    return { status: "ok", text };
  } catch (error) {
    if (error instanceof CommandFailure) {
      const o = error.observation;
      if (o.timedOut) return { status: "timeout", error: "deadline" };
      if (o.outputExceeded) return { status: "bad-output", error: "output bound exceeded" };
      return { status: "nonzero", error: `custody failure: ${error.message.slice(0, 200)}` };
    }
    return { status: "crashed", error: String(error).slice(0, 200) };
  }
}

export async function runDifferential(opts: {
  root: string;
  wasm: string;
  native?: string;
  seeds: readonly number[];
  archiveDir: string;
  mode: "inline" | "subprocess";
}): Promise<Report> {
  const t0 = Date.now();
  requireThat(isAbsolute(opts.root) && isAbsolute(opts.wasm) && isAbsolute(opts.archiveDir), "root/wasm/archive must be absolute");
  if (opts.native !== undefined) requireThat(isAbsolute(opts.native), "native artifact path must be explicit and absolute");
  const cases = catalog(opts.seeds);
  requireThat(cases.length > 0 && cases.length <= LIMITS.cases, "catalog case bound");
  for (const c of cases) requireThat(c.bytes.byteLength <= LIMITS.inputBytes, `case ${c.id} exceeds input bound`);

  const dir = join(opts.archiveDir, "cases");
  await mkdir(dir, { recursive: false });
  for (const c of cases) {
    await writeFile(join(dir, `${c.id}.bin`), c.bytes, { flag: "wx", mode: 0o600 });
  }
  const wasmRef = await artifactRef(opts.wasm);
  const nativeRef = opts.native ? await artifactRef(opts.native) : null;
  const bunRef = await artifactRef(process.execPath);

  // wasm leg
  let wasmLines: Map<string, WasmLine>;
  if (opts.mode === "subprocess") {
    wasmLines = new Map();
    const shards = Math.ceil(cases.length / LIMITS.workerCases);
    for (let s = 0; s < shards; s++) {
      const chunk = cases.slice(s * LIMITS.workerCases, (s + 1) * LIMITS.workerCases);
      for (const [k, v] of await wasmBatch(opts.root, dir, s, opts.wasm, chunk)) wasmLines.set(k, v);
    }
  } else {
    const mod = await loadWasmModule(opts.wasm);
    wasmLines = new Map();
    for (const c of cases) wasmLines.set(c.id, await inlineWasm(mod, c));
  }

  // native leg
  const nativeOut = new Map<string, TargetResponse>();
  if (nativeRef !== null) {
    for (const c of cases) {
      nativeOut.set(c.id, await nativeCase(opts.root, nativeRef.path, join(dir, `${c.id}.bin`), c.mode));
    }
  }

  // compare + shrink mismatches
  const codes = new Map<string, number>();
  const verdicts = new Map<string, number>();
  const mismatches: Report["mismatches"] = [];
  let oracleExact = 0;
  const comparisons: Comparison[] = [];
  for (const c of cases) {
    const line = wasmLines.get(c.id);
    requireThat(line !== undefined, `case ${c.id} missing wasm observation`);
    const wasm: TargetResponse = line.wasm.status === "ok"
      ? { status: "ok", text: line.wasm.text! }
      : line.wasm.status === "crashed"
        ? { status: "crashed", error: line.wasm.error ?? "" }
        : line.wasm.status === "null-input"
          ? { status: "null-input", error: line.wasm.error ?? "" }
          : { status: "trap", error: line.wasm.error ?? "wasm failure" };
    const comp = compareCase(c.mode, c.bytes, wasm, nativeOut.get(c.id) ?? null, line.wrapper, c.id);
    comparisons.push(comp);
    verdicts.set(comp.verdict, (verdicts.get(comp.verdict) ?? 0) + 1);
    const pred = c.mode === "eval" ? predictEval(c.bytes) : predictCheck(c.bytes);
    if (pred.ok !== "uncovered") oracleExact++;
    const cls = wasm.status === "ok" ? classifyResponse(c.mode, wasm.text) : null;
    if (cls && cls.cls.startsWith("err:")) {
      const code = cls.cls.slice(4).split(":")[0]!;
      codes.set(code, (codes.get(code) ?? 0) + 1);
    } else if (cls && cls.cls.startsWith("ok")) {
      codes.set("ok", (codes.get("ok") ?? 0) + 1);
    }
  }
  // op census over admitted program heads.
  const ops = new Set<string>();
  for (const c of cases) {
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) { const h = v[0]; if (typeof h === "string") ops.add(h); v.forEach(walk); }
      else if (v !== null && typeof v === "object" && !(v instanceof Map)) return;
      else if (v instanceof Map) for (const x of v.values()) walk(x);
    };
    try { const p = parseJsonBytes(c.bytes); if (p.ok && p.value instanceof Map) walk(p.value.get("program")); } catch { /* census is informational */ }
  }
  const modForShrink = await loadWasmModule(opts.wasm);
  for (const comp of comparisons) {
    if (comp.verdict === "agree" || comp.verdict === "uncovered" || comp.verdict === "wasm-transport") continue;
    const c = cases.find(x => x.id === comp.id)!;
    const reproduces = async (candidate: Uint8Array): Promise<boolean> => {
      const wres = await inlineWasm(modForShrink, { ...c, bytes: candidate, id: `${c.id}-cand` });
      const wcls = wres.wasm.status === "ok" ? classifyResponse(c.mode, wres.wasm.text!) : { cls: "transport", canonical: null };
      let oracleCls: string;
      if (c.mode === "eval") {
        const p = predictEval(candidate);
        oracleCls = p.ok === "uncovered" ? "uncovered" : p.ok === true ? `ok:fuel=${p.fuel}` : `err:${p.code}:fuel=${p.fuel}`;
      } else {
        const p = predictCheck(candidate);
        oracleCls = p.ok === "uncovered" ? "uncovered" : p.ok ? "ok" : `err:${p.code}`;
      }
      // reproduce the same divergence axis
      if (comp.axis === "wasm") return wres.wasm.status !== "ok";
      return wcls.cls !== oracleCls;
    };
    const entry: Report["mismatches"][number] = { id: comp.id, axis: comp.axis, detail: comp.detail };
    try {
      const shrunk = await shrinkBytes(c.bytes, reproduces, { attempts: LIMITS.shrinkAttempts, deadlineMs: LIMITS.shrinkMs });
      entry.shrunkBytes = shrunk.bytes.byteLength;
      entry.shrunkSha256 = hashBytes(shrunk.bytes);
      await writeFile(join(dir, `${c.id}.shrunk`), shrunk.bytes, { flag: "wx", mode: 0o600 });
    } catch (error) {
      entry.detail += ` | shrink-abort:${String(error).slice(0, 120)}`;
    }
    mismatches.push(entry);
    requireThat(mismatches.length <= LIMITS.mismatchReport, "mismatch report bound");
  }
  const report: Report = {
    contract: "algal.differential-report.v1",
    seeds: [...opts.seeds],
    cases: cases.length,
    mode: opts.mode,
    artifacts: { wasm: wasmRef, native: nativeRef, bun: bunRef },
    verdicts: Object.fromEntries([...verdicts.entries()].sort()),
    oracle: { exact: oracleExact, uncovered: cases.length - oracleExact },
    coverage: { ops: [...ops].sort(), codes: Object.fromEntries([...codes.entries()].sort()), notes: [] },
    mismatches,
    elapsedMs: Date.now() - t0,
  };
  await writeFile(join(opts.archiveDir, "report.json"), stableJson(report) + "\n", { flag: "wx", mode: 0o600 });
  return report;
}
