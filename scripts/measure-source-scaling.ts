/** Opt-in diagnostic: compile, pack, and run cost of source projects as reuse
 * grows, and where compilation stops. It measures every example project entry
 * point, then grows each generated shape in `source-scaling.ts` (1, 2, 4, ...
 * units, then bisection) until the loader, the compiler, or graph admission
 * refuses it. Each measured size records its deterministic structure and the
 * median and range of several timed repetitions after a warm-up:
 *
 * - compile: load the project from disk and run graph admission, as
 *   `algal compile` does without writing files, split into source and check;
 * - pack: build the closure bundle and serialize it;
 * - run: the reference runtime with scripted model answers;
 * - native run: `ALGAL_BIN run` as a separate process after `unpack`, when
 *   ALGAL_BIN names a native binary; it includes process start and printing
 *   the receipt, so it is not directly comparable with the in-process run;
 * - refusal: time until the loader, compiler, or admission rejects the project.
 *
 * Run through the host scheduler, for example:
 *   ALGAL_BIN=target/release/algal bun scripts/measure-source-scaling.ts --out scale.json
 *
 * Options (each bounded): --repeat 1-25 timed repetitions (default 5),
 * --warmup 0-5 (default 1), --only <example or shape id>, --markdown to print
 * the documentation tables instead of the text table, and --out <file> for
 * the JSON record. Without --out the JSON record goes to stdout; the table
 * always goes to stderr. Timings stay in this record; nothing is written to an
 * ALGAL store outside a temporary directory. */
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { cpus, loadavg, tmpdir, totalmem } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { packOrganism } from "../src/bundle";
import { BOUNDS, manifestToJson } from "../src/contract";
import { AlgalError } from "../src/errors";
import { COMPILE_BOUNDS, compileOrganism } from "../src/graph";
import { builtinRegistry } from "../src/registry";
import { SOURCE_PROFILE, SOURCE_PROJECT_BOUNDS } from "../src/source";
import { loadSourceProject } from "../src/source-project";
import { MemoryStore } from "../src/store-memory";
import { canonicalize, type JsonValue } from "../src/values";
import {
  EXAMPLE_COLUMNS, EXAMPLE_PROJECTS, REFUSAL_COLUMNS, REPOSITORY, SHAPES, SHAPE_COLUMNS, TABLE_HEADINGS,
  evaluate, exampleRow, failureReason, growthSizes, installed, loadShapeFixtures, markdownTable, materializeExample, materializeShape,
  referenceRun, refusalRow, shapeRow, summarizeRun,
  type Accepted, type Materialized, type Rejection, type RunSummary, type Structure,
} from "./source-scaling";

const OPTIONS = { repeat: { fallback: 5, min: 1, max: 25 }, warmup: { fallback: 1, min: 0, max: 5 } } as const;
const USAGE = "Usage: measure-source-scaling.ts [--repeat 1-25] [--warmup 0-5] [--only <id>] [--markdown] [--out file.json]";
const MAX_OUTPUT_BYTES = 268_435_456;

type Options = { repeat: number; warmup: number; only: string | undefined; markdown: boolean; out: string | undefined };
function parseOptions(argv: readonly string[]): Options {
  if (argv.length > 9) throw new Error(USAGE);
  const result: Options = { repeat: OPTIONS.repeat.fallback, warmup: OPTIONS.warmup.fallback, only: undefined, markdown: false, out: undefined };
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index]!;
    if (seen.has(flag)) throw new Error(`${flag} is repeated. ${USAGE}`);
    seen.add(flag);
    if (flag === "--markdown") { result.markdown = true; continue; }
    const raw = argv[++index];
    if (raw === undefined) throw new Error(`${flag} needs a value. ${USAGE}`);
    if (flag === "--out") { if (!raw || raw.length > 4_096) throw new Error("--out needs a file path"); result.out = raw; continue; }
    if (flag === "--only") {
      if (![...EXAMPLE_PROJECTS.map(item => item.id), ...SHAPES.map(item => item.id)].includes(raw)) throw new Error(`--only must name an example or shape: ${[...EXAMPLE_PROJECTS.map(item => item.id), ...SHAPES.map(item => item.id)].join(", ")}`);
      result.only = raw; continue;
    }
    const name = flag.startsWith("--") ? flag.slice(2) : "";
    if (name !== "repeat" && name !== "warmup") throw new Error(`Unknown option ${flag}. ${USAGE}`);
    const option = OPTIONS[name], value = Number(raw);
    if (!/^\d{1,2}$/.test(raw) || value < option.min || value > option.max) throw new Error(`--${name} must be an integer from ${option.min} through ${option.max}`);
    result[name] = value;
  }
  return result;
}
const options = parseOptions(process.argv.slice(2));
const loadAtStart = loadavg().map(value => Math.round(value * 100) / 100);
const nativeBinary = process.env.ALGAL_BIN ? resolve(process.env.ALGAL_BIN) : undefined;

// ---------------------------------------------------------------- timing ---

type Timing = { medianMs: number; minMs: number; maxMs: number; samplesMs: number[] };
const round = (value: number) => Math.round(value * 100) / 100;
const median = (values: readonly number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length % 2 ? sorted[(sorted.length - 1) / 2]! : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2; };
/** Run `work` after `warmup` untimed calls. `work` returns named phase
 * durations; each phase gets its own median and range. */
async function sample<K extends string>(work: () => Promise<Record<K, number>>): Promise<Record<K, Timing>> {
  for (let index = 0; index < options.warmup; index++) await work();
  const samples: Record<string, number[]> = {};
  for (let index = 0; index < options.repeat; index++) {
    for (const [phase, ms] of Object.entries(await work()) as [string, number][]) (samples[phase] ??= []).push(ms);
  }
  return Object.fromEntries(Object.entries(samples).map(([phase, values]) =>
    [phase, { medianMs: round(median(values)), minMs: round(Math.min(...values)), maxMs: round(Math.max(...values)), samplesMs: values.map(round) }])) as Record<K, Timing>;
}
const now = () => performance.now();

async function compileTimes(input: Materialized) {
  return sample(async () => {
    const started = now();
    const project = await loadSourceProject(input.entry, { root: input.root });
    const loaded = now();
    const store = new MemoryStore();
    for (const module of project.modules) await store.putManifest(module);
    await compileOrganism(project.manifest, builtinRegistry(), store);
    const checked = now();
    return { source: loaded - started, check: checked - loaded, compile: checked - started };
  });
}
/** Time until the refusal that `evaluate` found, and fail on any other outcome. */
async function refusalTimes(input: Materialized, rejection: Rejection) {
  return sample<string>(async () => {
    const started = now();
    let loaded = started;
    try {
      const project = await loadSourceProject(input.entry, { root: input.root });
      loaded = now();
      const store = new MemoryStore();
      for (const module of project.modules) await store.putManifest(module);
      await compileOrganism(project.manifest, builtinRegistry(), store);
    } catch (error) {
      const refused = now();
      if (!(error instanceof AlgalError) || error.message !== rejection.message) throw error;
      return rejection.stage === "source" ? { refusal: refused - started } : { source: loaded - started, check: refused - loaded, refusal: refused - started };
    }
    throw new Error(`${input.id}: expected the refusal "${rejection.message}"`);
  });
}
async function packTimes(accepted: Accepted) {
  const store = await installed(accepted.project);
  return sample(async () => {
    const started = now();
    canonicalize(await packOrganism(accepted.project.manifest, store) as unknown as JsonValue);
    return { pack: now() - started };
  });
}
async function runTimes(accepted: Accepted, input: Materialized, expected: RunSummary) {
  return sample(async () => {
    const started = now();
    const receipt = await referenceRun(accepted.project, input);
    const elapsed = now() - started;
    if (canonicalize(summarizeRun(receipt) as unknown as JsonValue) !== canonicalize(expected as unknown as JsonValue)) throw new Error(`${input.id}: the reference run changed between repetitions`);
    return { run: elapsed };
  });
}

// ---------------------------------------------------------------- native ---

async function spawnNative(args: string[]): Promise<{ code: number; stdout: string; stderr: string; ms: number }> {
  const started = now();
  const child = Bun.spawn([nativeBinary!, ...args], { stdout: "pipe", stderr: "pipe" });
  const read = async (stream: ReadableStream<Uint8Array>) => {
    const text = await new Response(stream).text();
    if (text.length > MAX_OUTPUT_BYTES) throw new Error(`native output exceeds ${MAX_OUTPUT_BYTES} bytes`);
    return text;
  };
  const [stdout, stderr, code] = await Promise.all([read(child.stdout), read(child.stderr), child.exited]);
  return { code, stdout, stderr, ms: now() - started };
}
function nativeJson(text: string): Record<string, unknown> {
  const value = JSON.parse(text) as unknown;
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("native output is not a JSON object");
  return value as Record<string, unknown>;
}
type NativeTiming = { nativeRun?: Timing; nativeCheck?: Timing; matches: true } | null;
/** Unpack once, then time the native process on the same files. Runs must
 * match the reference outcome and work; refusals must match its message. */
async function nativeTimes(input: Materialized, evaluation: Accepted | Rejection, expected: RunSummary | undefined): Promise<NativeTiming> {
  if (nativeBinary === undefined || (!evaluation.accepted && evaluation.stage === "source")) return null;
  const directory = await mkdtemp(join(tmpdir(), "algal-scale-native-"));
  try {
    const project = evaluation.accepted ? evaluation.project : await loadSourceProject(input.entry, { root: input.root });
    const bundle = evaluation.accepted ? evaluation.bundle : await packOrganism(project.manifest, await installed(project));
    const paths = { manifest: join(directory, "manifest.json"), bundle: join(directory, "bundle.json"), args: join(directory, "args.json"), responses: join(directory, "responses.json"), store: join(directory, "store") };
    await writeFile(paths.manifest, canonicalize(manifestToJson(project.manifest)));
    await writeFile(paths.bundle, canonicalize(bundle as unknown as JsonValue));
    await writeFile(paths.args, canonicalize(input.args as unknown as JsonValue));
    await writeFile(paths.responses, canonicalize(input.responses));
    const unpacked = await spawnNative(["unpack", paths.bundle, "--dir", paths.store]);
    if (unpacked.code !== 0) throw new Error(`${input.id}: native unpack failed: ${unpacked.stderr || unpacked.stdout}`);
    if (evaluation.accepted) {
      const timing = await sample(async () => {
        const result = await spawnNative(["run", paths.manifest, "--dir", paths.store, "--args", paths.args, "--responses", paths.responses]);
        const receipt = nativeJson(result.stdout), work = receipt.work as Record<string, unknown> | undefined, failure = receipt.failure as Record<string, unknown> | undefined;
        const summary = { outcome: receipt.outcome, failure: failure?.code ?? null, steps: work?.steps, attempts: work?.agentCalls, units: work?.units };
        if (canonicalize(summary as JsonValue) !== canonicalize(expected as unknown as JsonValue)) throw new Error(`${input.id}: native run ${JSON.stringify(summary)} differs from the reference ${JSON.stringify(expected)}`);
        return { nativeRun: result.ms };
      });
      return { ...timing, matches: true };
    }
    const timing = await sample(async () => {
      const result = await spawnNative(["check", paths.manifest, "--dir", paths.store]);
      const error = nativeJson(result.stdout || result.stderr).error as Record<string, unknown> | undefined;
      if (result.code === 0 || error?.code !== evaluation.code || error?.message !== evaluation.message) throw new Error(`${input.id}: native check returned ${result.code} ${JSON.stringify(error)}; the reference refused with ${evaluation.code} ${evaluation.message}`);
      return { nativeCheck: result.ms };
    });
    return { ...timing, matches: true };
  } finally { await rm(directory, { recursive: true, force: true }); }
}

// --------------------------------------------------------------- measure ---

type Measured = {
  id: string; size: number | null; accepted: boolean;
  structure?: Structure; run?: RunSummary; runFailure?: string | null; rejection?: Omit<Rejection, "accepted">;
  timings: Record<string, Timing>; native: NativeTiming;
};
async function measure(input: Materialized): Promise<Measured> {
  const evaluation = await evaluate(input);
  if (!evaluation.accepted) {
    const { accepted: _accepted, ...rejection } = evaluation;
    return { id: input.id, size: input.size, accepted: false, rejection, timings: await refusalTimes(input, evaluation), native: await nativeTimes(input, evaluation, undefined) };
  }
  const receipt = await referenceRun(evaluation.project, input), run = summarizeRun(receipt);
  const timings = { ...await compileTimes(input), ...await packTimes(evaluation), ...await runTimes(evaluation, input, run) };
  return { id: input.id, size: input.size, accepted: true, structure: evaluation.structure, run, runFailure: failureReason(receipt), timings, native: await nativeTimes(input, evaluation, run) };
}
const progress = (row: Measured) => console.error(JSON.stringify({ measurement: "source-scaling-progress", id: row.id, size: row.size, accepted: row.accepted, elapsedMs: Math.round(now()) }));

const examples: Measured[] = [];
for (const project of EXAMPLE_PROJECTS) {
  if (options.only !== undefined && options.only !== project.id) continue;
  const input = await materializeExample(project);
  examples.push(await measure(input));
  progress(examples.at(-1)!);
}
const fixtures = await loadShapeFixtures();
const shapes: { id: string; unit: string; target: string; largestAccepted: number | null; smallestRefused: number | null; sizes: Measured[] }[] = [];
for (const item of SHAPES) {
  if (options.only !== undefined && options.only !== item.id) continue;
  const growth = await growthSizes(item, fixtures);
  const sizes: Measured[] = [];
  for (const size of growth.sizes) {
    const input = await materializeShape(item, size, fixtures);
    try { sizes.push(await measure(input)); } finally { await input.cleanup(); }
    progress(sizes.at(-1)!);
  }
  shapes.push({ id: item.id, unit: item.unit, target: item.target, largestAccepted: growth.largestAccepted, smallestRefused: growth.smallestRefused, sizes });
}

const sha256 = async (path: string) => `sha256:${createHash("sha256").update(await readFile(new URL(path, import.meta.url))).digest("hex")}`;
let nativeVersion: string | null = null;
if (nativeBinary !== undefined) nativeVersion = (await spawnNative(["--version"])).stdout.trim().slice(0, 200);
const record = {
  measurement: "algal-source-scaling",
  runtime: { bun: Bun.version, platform: process.platform, arch: process.arch, compiler: `${SOURCE_PROFILE.id} ${SOURCE_PROFILE.compilerVersion}` },
  host: { cpu: cpus()[0]?.model ?? "unknown", cores: cpus().length, memoryBytes: totalmem(), loadAverage: { start: loadAtStart, end: loadavg().map(value => Math.round(value * 100) / 100) } },
  // A binary inside the checkout is named relative to it, so the record carries no home directory.
  native: nativeBinary === undefined ? null : { binary: nativeBinary.startsWith(`${REPOSITORY}/`) ? relative(REPOSITORY, nativeBinary) : basename(nativeBinary), version: nativeVersion },
  options: { repeat: options.repeat, warmup: options.warmup, only: options.only ?? null },
  limits: {
    expanded: COMPILE_BOUNDS, source: SOURCE_PROJECT_BOUNDS,
    run: { maxSteps: BOUNDS.maxSteps, maxDepth: BOUNDS.maxDepth, maxAgentCalls: BOUNDS.maxAgentCalls, maxWork: BOUNDS.maxWork },
  },
  sources: { library: await sha256("./source-scaling.ts"), diagnostic: await sha256(import.meta.url) },
  examples, shapes,
  // Duration of the whole diagnostic; not a timestamp.
  elapsedMs: Math.round(now()),
};
const json = JSON.stringify(record, null, 2);
if (options.out === undefined) console.log(json);
else await writeFile(options.out, `${json}\n`);

// ----------------------------------------------------------------- tables ---

const figure = (value: number) => value < 10 ? value.toFixed(1) : Math.round(value).toLocaleString("en-US");
const ms = (timing: Timing | undefined) => timing === undefined ? "-" : figure(timing.medianMs);
const range = (timing: Timing | undefined) => timing === undefined ? "-" : `${figure(timing.medianMs)} (${figure(timing.minMs)}–${figure(timing.maxMs)})`;
const rowsOf = (): { label: string; row: Measured }[] => [
  ...examples.map(row => ({ label: row.id, row })),
  ...shapes.flatMap(item => item.sizes.map(row => ({ label: `${row.id} ${row.size}`, row }))),
];
if (options.markdown) {
  const accepted = shapes.flatMap(item => item.sizes.filter(row => row.accepted && (row.size === 1 || row.size === item.largestAccepted)));
  const refused = shapes.flatMap(item => item.sizes.filter(row => !row.accepted));
  const code = (value: string) => `\`${value}\``;
  console.error([
    `## ${TABLE_HEADINGS.examples}`, "", markdownTable(EXAMPLE_COLUMNS, examples.map(row => exampleRow(row.id, row.structure!, row.run!))), "",
    `## ${TABLE_HEADINGS.shapes}`, "", markdownTable(SHAPE_COLUMNS, accepted.map(row => shapeRow(row.id, row.size!, row.structure!, row.run!))), "",
    `## ${TABLE_HEADINGS.refusals}`, "", markdownTable(REFUSAL_COLUMNS, refused.map(row => refusalRow(row.id, row.size!, { accepted: false, ...row.rejection! }))), "",
    "## Timings", "",
    // A refusal row's source and check times end at the refusal.
    markdownTable(["Program", "Size", "Source ms", "Check ms", "Pack ms", "Run ms", "Native ms"],
      [...examples, ...accepted, ...refused].map(row => [code(row.id), row.size === null ? "" : String(row.size),
        range(row.timings.source ?? row.timings.refusal), range(row.timings.check), range(row.timings.pack), range(row.timings.run), range(row.native?.nativeRun ?? row.native?.nativeCheck)])),
  ].join("\n"));
} else {
  const header = ["Program", "Instances", "Cells", "Edges", "Manifest MB", "Bundle KB", "Steps", "Compile ms", "Pack ms", "Run ms", "Native ms", "Result"];
  const rows = rowsOf().map(({ label, row }) => {
    const structure = row.structure, check = row.rejection?.check;
    const counts = structure ?? (check ? { instances: check.expanded.instances, cells: check.expanded.cells, edges: check.expanded.edges, manifestBytes: check.expanded.bytes, bundleBytes: check.bundleBytes } : undefined);
    return [
      label, counts ? counts.instances.toLocaleString("en-US") : "-", counts ? counts.cells.toLocaleString("en-US") : "-", counts ? counts.edges.toLocaleString("en-US") : "-",
      counts ? (counts.manifestBytes / 1_000_000).toFixed(2) : "-", counts ? (counts.bundleBytes / 1_000).toFixed(1) : "-", row.run ? String(row.run.steps) : "-",
      ms(row.timings.compile ?? row.timings.refusal), ms(row.timings.pack), ms(row.timings.run), ms(row.native?.nativeRun ?? row.native?.nativeCheck),
      row.accepted ? (row.run!.outcome === "complete" ? "complete" : `run ${row.run!.failure}`) : `refused: ${row.rejection!.limit}`,
    ];
  });
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map(row => row[column]!.length)));
  console.error([header, ...rows].map(row => row.map((cell, column) => column === 0 || column === row.length - 1 ? cell.padEnd(widths[column]!) : cell.padStart(widths[column]!)).join("  ")).join("\n"));
  console.error("Refused rows show the full expansion that graph admission never builds. Times are medians; see the JSON record for ranges.");
}
