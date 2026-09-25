import { lstat, mkdir, mkdtemp, readdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { hashBytes, hashJson, readFileBounded, stableJson } from "../lib/files";
import { artifactIdentity } from "../traces/native";
import { CommandFailure, requireSuccess, runCommand, type CommandResult } from "../lib/runner";
import { catalog, SEEDS } from "./generate";
import { expected, inputBytes, LIMITS, parseCase, VERSION, type Case } from "./schema";
import { project } from "./oracle";
import { Mismatch, shrink } from "./shrink";
import { corpusDefinition } from "./definition";
const ROOT = resolve(import.meta.dir, "../..");
const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
export type Options = { profile: "local" | "native" | "full"; native?: string; rebuilt?: string; replay?: string };
export class CommandRejected extends Error {
  readonly category: string;
  constructor(readonly result: CommandResult) {
    super("corpus target command refused");
    this.category = !result.cleanupObserved ? "custody-failure" : result.timedOut ? "timeout" : result.outputExceeded ? "output-exhaustion" : result.signal !== null ? "signal" : "command-nonzero";
  }
}
function require_(condition: unknown, why: string): asserts condition { if (!condition) throw new Error(why); }
/** Exact UTF-8 size without allocating an encoded copy (unpaired UTF-16 uses replacement). */
export function utf8Size(value: string, jsonString = false): number {
  let size = jsonString ? 2 : 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (jsonString && (code === 34 || code === 92 || code === 8 || code === 9 || code === 10 || code === 12 || code === 13)) size += 2;
    else if (jsonString && code < 32) size += 6;
    else if (code < 128) size++;
    else if (code < 2048) size += 2;
    else if (code >= 0xd800 && code <= 0xdbff && value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) { size += 4; i++; }
    else if (code >= 0xd800 && code <= 0xdfff) size += jsonString ? 6 : 3;
    else size += 3;
  }
  return size;
}
export function requireCommandArgv(value: unknown, label: string): void {
  require_(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype && value.length > 0 && value.length <= 64, `corpus ${label} argv count`);
  require_(Reflect.ownKeys(value).length === value.length + 1, `corpus ${label} closed argv array`);
  for (let index = 0; index < value.length; index++) {
    const item = Object.getOwnPropertyDescriptor(value, String(index));
    require_(item && Object.hasOwn(item, "value") && item.enumerable, `corpus ${label} dense own argv data`);
    const argument: unknown = item.value;
    require_(typeof argument === "string" && argument.length > 0 && argument.length <= 4096 && !argument.includes("\0") && utf8Size(argument) <= 4096, `corpus ${label} argv argument`);
  }
}
export function requireAbsolutePath(value: unknown): asserts value is string {
  require_(typeof value === "string" && value.length <= 4096 && utf8Size(value) <= 4096 && isAbsolute(value), "authorized absolute path");
  for (let index = 0; index < value.length; index++) require_(value.charCodeAt(index) >= 32, "authorized absolute path");
}
/** Preflight owned JSON data before stableJson creates the serialized record. */
export function jsonSize(value: unknown, limit: number): number {
  let size = 0, nodes = 0;
  const ancestors = new Set<object>();
  const add = (count: number) => { size += count; require_(size <= limit, "encoded record bound"); };
  function visit(x: unknown, depth: number): void {
    require_(++nodes <= 1_000_000 && depth <= 64, "metadata shape bound");
    if (typeof x === "string") { add(utf8Size(x, true)); return; }
    if (x === null || typeof x === "boolean" || typeof x === "number" && Number.isFinite(x)) { add(JSON.stringify(x).length); return; }
    require_(x !== null && typeof x === "object" && !ancestors.has(x), "metadata JSON domain");
    ancestors.add(x);
    if (Array.isArray(x)) {
      add(2);
      for (let i = 0; i < x.length; i++) {
        const item = Object.getOwnPropertyDescriptor(x, String(i));
        require_(item !== undefined && Object.hasOwn(item, "value"), "metadata array own data");
        if (i) add(1); visit(item.value, depth + 1);
      }
    } else {
      require_(Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null, "metadata plain object");
      add(2); let entries = 0;
      for (const key in x) if (Object.hasOwn(x, key)) {
        const item = Object.getOwnPropertyDescriptor(x, key)!;
        require_(Object.hasOwn(item, "value"), "metadata object own data");
        if (entries++) add(1); add(utf8Size(key, true) + 1); visit(item.value, depth + 1);
      }
    }
    ancestors.delete(x);
  }
  visit(value, 0); return size;
}
export function encodeRecord(value: unknown, budget: CaptureBudget): string {
  const limit = Math.min(LIMITS.recordBytes, LIMITS.archiveBytes - LIMITS.failureBytes - budget.archiveBytes);
  const size = jsonSize(value, limit - 1) + 1;
  budget.reserveRecord(size); // Admission occurs before serialized-record allocation and IO.
  const data = stableJson(value) + "\n";
  require_(utf8Size(data) === size, "metadata size preflight disagrees");
  return data;
}
export function primaryFailure(error: unknown): unknown {
  return error instanceof AggregateError && error.cause !== undefined ? primaryFailure(error.cause) : error;
}
export async function retainFailure(primary: unknown, write: () => Promise<unknown>): Promise<void> {
  try { await write(); }
  catch (retention) { throw new AggregateError([primary, retention], "primary failure and evidence retention failed", { cause: primary }); }
}
export function failureRecord(error: unknown, state: { completedRows: number; invocations: number; archiveBytes: number; capturedOutputBytes: number }): string {
  const primary = primaryFailure(error), description = String(error);
  const category = primary instanceof Mismatch ? "semantic-mismatch" : primary instanceof CommandRejected ? primary.category : primary instanceof CommandFailure ? "custody-failure" : "admission-or-infrastructure";
  const semantic = primary instanceof Mismatch ? { property: primary.property.slice(0, 256), target: primary.target.slice(0, 128), caseId: primary.caseId.slice(0, 96),
    truncated: primary.property.length > 256 || primary.target.length > 128 || primary.caseId.length > 96 } : null;
  const value = { category, error: description.slice(0, 8192), errorTruncated: description.length > 8192, semantic, ...state };
  jsonSize(value, LIMITS.failureBytes - 1); // Preflight even terminal metadata before serialization.
  return stableJson(value) + "\n";
}
export class CaptureBudget {
  archiveBytes = 0;
  capturedOutputBytes = 0;
  files = 0;
  reserveRecord(size: number): void {
    require_(Number.isSafeInteger(size) && size >= 0 && size <= LIMITS.recordBytes && this.archiveBytes + size <= LIMITS.archiveBytes - LIMITS.failureBytes && this.files < LIMITS.retainedFiles - 1, "aggregate archive bound");
    this.archiveBytes += size; this.files++;
  }
  nextCommandLimit(): number {
    const remaining = LIMITS.aggregateOutputBytes - this.capturedOutputBytes;
    require_(remaining > 0 && this.archiveBytes + LIMITS.recordBytes <= LIMITS.archiveBytes - LIMITS.failureBytes && this.files + 3 < LIMITS.retainedFiles, "no aggregate command/output capacity");
    return Math.min(LIMITS.outputBytes, remaining);
  }
  capture(size: number): void {
    require_(Number.isSafeInteger(size) && size >= 0 && this.capturedOutputBytes + size <= LIMITS.aggregateOutputBytes, "aggregate captured output bound");
    this.capturedOutputBytes += size;
  }
}
async function bytes(path: string, max: number = LIMITS.outputBytes): Promise<Uint8Array> { return readFileBounded(dirname(path), basename(path), max); }
async function binding() {
  return corpusDefinition(ROOT, import.meta.dir);
}
export function admitCommand(result: CommandResult, argv: string[]): void {
  requireCommandArgv(argv, "expected");
  requireCommandArgv(result.command, "recorded");
  if (result.exitCode !== 0 || result.signal !== null || !result.cleanupObserved || result.timedOut || result.outputExceeded) throw new CommandRejected(result);
  requireSuccess(result);
  require_(stableJson(result.command) === stableJson(argv) && result.stderr === "", "worker command or diagnostics differ");
}
export function admitWorker(c: Case, raw: unknown, wasmSha256: string, wrapper: boolean, target = "committed-wasm"): { raw: string; bun: unknown } {
  require_(raw !== null && typeof raw === "object" && !Array.isArray(raw), "worker output object");
  const output = raw as Record<string, unknown>;
  require_(output.contract === "algal.corpus-worker.v1" && output.id === c.id && output.inputSha256 === hashBytes(inputBytes(c)) && output.wasmSha256 === wasmSha256
    && Object.keys(output).sort().join() === "bun,contract,id,inputSha256,raw,wasmSha256" && typeof output.raw === "string", "worker exact input/output identity");
  compare(c, output.raw, target);
  if (wrapper && c.domain === "grammar") {
    compare(c, JSON.stringify(output.bun), "bun-wrapper");
    if (stableJson(output.bun) !== stableJson(JSON.parse(output.raw))) throw new Mismatch("full-result", c.id, "bun-wrapper", "Bun public wrapper/full result differs");
  } else require_(output.bun === null, "unexpected wrapper comparison");
  return { raw: output.raw, bun: output.bun };
}
export function compare(c: Case, output: string, target: string): void {
  let actual: ReturnType<typeof project>;
  try { actual = project(JSON.parse(output)); }
  catch (error) { throw new Mismatch("response-shape", c.id, target, String(error)); }
  const want = expected(c);
  if (stableJson(actual) !== stableJson(want)) {
    const property = want.ok ? actual.ok ? `wrong-value:${typeof want.value}:${typeof actual.value}` : `unexpected-error:${typeof want.value}:${actual.code}`
      : actual.ok ? `unexpected-success:${want.code}:${typeof actual.value}` : `wrong-error:${want.code}:${actual.code}`;
    throw new Mismatch(property, c.id, target, stableJson({ want, actual }));
  }
}
export function admitInventory(cases: Case[]): void {
  require_(cases.length > 0 && cases.length <= LIMITS.cases, "nonempty bounded case inventory");
  require_(new Set(cases.map(c => c.id)).size === cases.length, "duplicate case identity");
  for (const c of cases) parseCase(c);
}
export async function run(options: Options, selectedArchive?: string): Promise<unknown> {
  require_(["local", "native", "full"].includes(options.profile), "profile");
  require_(options.profile === "local" ? options.native === undefined && options.rebuilt === undefined : options.native !== undefined && isAbsolute(options.native), "explicit native profile/artifact");
  require_(options.profile === "full" ? options.rebuilt !== undefined && isAbsolute(options.rebuilt) : options.rebuilt === undefined, "explicit rebuilt profile/artifact");
  for (const path of [ROOT, import.meta.dir, options.native, options.rebuilt, options.replay]) if (path !== undefined) requireAbsolutePath(path);
  const archive = selectedArchive ?? await mkdtemp(join(tmpdir(), "algal-corpus-expression-"));
  requireAbsolutePath(archive);
  const info = await lstat(archive);
  require_(info.isDirectory() && !info.isSymbolicLink() && (await readdir(archive)).length === 0, "empty owned archive directory");
  require_(await realpath(archive) !== await realpath(ROOT), "archive must be separate from repository");
  const before = await binding();
  const artifact = { bun: await artifactIdentity(process.execPath), committed: await artifactIdentity(join(ROOT, "src/algal_expr.wasm")),
    native: options.native ? await artifactIdentity(options.native) : null, rebuilt: options.rebuilt ? await artifactIdentity(options.rebuilt) : null };
  for (const item of Object.values(artifact)) if (item) requireAbsolutePath(item.path);
  require_(artifact.committed.bytes <= 16_777_216 && (!artifact.rebuilt || artifact.rebuilt.bytes <= 16_777_216), "WASM artifact size");
  const cases = options.replay ? [parseCase(JSON.parse(text.decode(await bytes(options.replay, 65_536))))] : catalog();
  admitInventory(cases);
  require_(options.replay !== undefined || cases.length === 115, "fixed catalog count");
  const rows: unknown[] = [];
  const retained: { path: string; sha256: string }[] = [];
  const budget = new CaptureBudget();
  async function persist(path: string, data: Uint8Array | string) {
    await writeFile(join(archive, path), data, { flag: "wx", mode: 0o600 });
    const item = { path, sha256: hashBytes(data) }; retained.push(item); return item;
  }
  async function retainBytes(path: string, data: Uint8Array | string) {
    budget.reserveRecord(typeof data === "string" ? utf8Size(data) : data.byteLength);
    return persist(path, data);
  }
  async function retain(path: string, value: unknown) {
    return persist(path, encodeRecord(value, budget));
  }
  async function command(path: string, argv: string[]) {
    requireCommandArgv(argv, "selected before launch");
    const maxOutputBytes = budget.nextCommandLimit();
    try {
      const result = await runCommand(argv, ROOT, { timeoutMs: LIMITS.workerMs, maxOutputBytes });
      budget.capture(utf8Size(result.stdout) + utf8Size(result.stderr));
      await retain(path, result); return result;
    }
    catch (error) {
      if (error instanceof CommandFailure) {
        try {
          budget.capture(error.rawStdout.byteLength + error.rawStderr.byteLength);
          await retainBytes(`${path}.stdout.bin`, error.rawStdout);
          await retainBytes(`${path}.stderr.bin`, error.rawStderr);
          await retain(`${path}.custody.json`, error.observation);
        } catch (retention) { throw new AggregateError([error, retention], "command custody and evidence retention failed", { cause: error }); }
      }
      throw error;
    }
  }
  let invocations = 0;
  async function replay(c: Case, label: string): Promise<unknown> {
    const directory = join(archive, label); await mkdir(directory);
    const input = inputBytes(c);
    await retain(`${label}/case.json`, c);
    await retainBytes(`${label}/input.bin`, input);
    const outputs: Record<string, string> = {};
    for (const [target, wasm, mode] of [["committed-wasm", artifact.committed, "both"], ...(artifact.rebuilt ? [["rebuilt-wasm", artifact.rebuilt, "raw"]] : [])] as const) {
      const binary = wasm as typeof artifact.committed;
      const argv = [artifact.bun.path, join(import.meta.dir, "worker.ts"), join(directory, "case.json"), binary.path, mode as string];
      const result = await command(`${label}/${target}.command.json`, argv); invocations++; admitCommand(result, argv);
      require_(result.stdout.endsWith("\n"), "worker terminal framing");
      const output = admitWorker(c, JSON.parse(result.stdout), binary.sha256, mode === "both", target as string);
      compare(c, output.raw, target as string); outputs[target as string] = output.raw;
      if (mode === "both" && c.domain === "grammar") {
        const value = JSON.stringify(output.bun); compare(c, value, "bun-wrapper");
        if (stableJson(output.bun) !== stableJson(JSON.parse(output.raw))) throw new Mismatch("full-result", c.id, "bun-wrapper", "Bun public wrapper/full result differs");
        outputs["bun-wrapper"] = value;
      } else require_(output.bun === null, "unexpected wrapper comparison");
    }
    if (artifact.native) {
      const argv = [artifact.native.path, "eval", join(directory, "input.bin")];
      const result = await command(`${label}/native.command.json`, argv); invocations++; admitCommand(result, argv);
      require_(result.stdout.endsWith("\n"), "native terminal framing");
      outputs.native = result.stdout.slice(0, -1); compare(c, outputs.native, "native");
    }
    for (const name of ["native", "rebuilt-wasm"]) if (outputs[name] !== undefined && outputs[name] !== outputs["committed-wasm"])
      throw new Mismatch("full-byte-response", c.id, name, "full raw result/fuel bytes differ from committed WASM");
    return { id: c.id, domain: c.domain, inputSha256: hashBytes(input), expected: expected(c), targets: Object.keys(outputs), outputs };
  }
  try {
    await retain("start.json", { contract: "algal.corpus-run-start.v1", version: VERSION, seeds: SEEDS, limits: LIMITS, options, definition: before, artifact, cases });
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i]!;
      try {
        const result = await replay(c, `case-${i}`), file = await retain(`case-${i}/result.json`, result);
        rows.push({ id: c.id, domain: c.domain, inputSha256: hashBytes(inputBytes(c)), result: file });
      }
      catch (error) {
        if (error instanceof Mismatch) {
          let n = 0;
          try { await retain("counterexample.json", await shrink(c, async candidate => { await replay(candidate, `shrink-${n++}`); })); }
          catch (shrinkError) { await retainFailure(error, () => retain("shrink-failure.json", { original: c, failure: String(shrinkError) })); }
        }
        throw error;
      }
    }
    require_(stableJson(before) === stableJson(await binding()), "source binding changed");
    for (const item of Object.values(artifact)) if (item) require_(stableJson(item) === stableJson(await artifactIdentity(item.path)), "artifact changed");
    for (const item of retained) require_(hashBytes(await readFileBounded(archive, item.path)) === item.sha256, "raw retained evidence changed");
    const summary = { contract: "algal.corpus-expression-result.v1", profile: options.profile, status: "passed", formalClaims: 0,
      relation: "finite independent value/error oracle and sampled expression target/wrapper agreement; build provenance separately required",
      definitionDigest: hashJson(before), artifacts: artifact, inventoryDigest: hashJson(cases), caseCount: cases.length, grammarCount: cases.filter(c => c.domain === "grammar").length,
      rawCount: cases.filter(c => c.domain === "raw").length, invocations, archive, archiveBytesBeforeSummary: budget.archiveBytes, capturedOutputBytes: budget.capturedOutputBytes, limits: LIMITS, rows, retained: [...retained] };
    await retain("result.json", summary); return summary;
  } catch (error) {
    // Reserved terminal record contains bounded previews; exact command evidence stays separate.
    try {
      const final = failureRecord(error, { completedRows: rows.length, invocations, archiveBytes: budget.archiveBytes, capturedOutputBytes: budget.capturedOutputBytes });
      await writeFile(join(archive, "failure.json"), final, { flag: "wx", mode: 0o600 });
    } catch (retention) { throw new AggregateError([error, retention], `Corpus primary failure and terminal retention failure; archive ${archive}`, { cause: error }); }
    throw new Error(`Corpus failed; retained ${archive}: ${String(error)}`, { cause: error });
  }
}
if (import.meta.main) {
  const [profile, native, rebuilt, replay] = process.argv.slice(2);
  const options: Options = { profile: profile as Options["profile"] };
  if (native && native !== "-") options.native = native;
  if (rebuilt && rebuilt !== "-") options.rebuilt = rebuilt;
  if (replay) options.replay = replay;
  const result = await run(options);
  const r = result as { archive: string; caseCount: number; invocations: number };
  console.log(JSON.stringify({ status: "passed", profile, archive: r.archive, cases: r.caseCount, invocations: r.invocations }));
}
