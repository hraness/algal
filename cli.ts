#!/usr/bin/env bun
// algal — run, verify, and inspect typed workflow organisms.
// Data on stdout (JSON), diagnostics on stderr. Exit 0 ok, 1 run/verify
// failure, 2 usage or parse error.

import { lstat, open, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { constants, writeSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BOUNDS, manifestToJson, parseOrganismManifest, type OrganismManifest } from "./src/contract";
import { asDigest, digestCanonical } from "./src/digest";
import { errorReport, AlgalError } from "./src/errors";
import {
  asInt,
  asJsonValue,
  canonicalBytes,
  canonicalize,
  type JsonObject,
  type JsonValue,
} from "./src/values";
import packageJson from "./package.json" with { type: "json" };
// Every other module arrives through `await import()` at the subcommand (or
// helper) that needs it: `--help`, `store`, and the listing commands never
// pay for the run graph, executors, or the job/repair/shepherd stack.
import type { Executor } from "./src/effects";
import type { CommandIsolation, IsolationLimits } from "./src/isolation";
import type { FileStore, Store } from "./src/store";
import type { RunReceipt } from "./src/run";
import type { Transport } from "./src/transport";
import type { Tool, ToolRegistry } from "./src/tools";
import type { FoundryCase, FoundryReport, FoundryScorer } from "./src/foundry";
import type { HabitatBudget, HabitatLedger } from "./src/habitat-budget";
import type { SearchReport } from "./src/search";
import type { BenchCase, BenchPrice, BenchSystem } from "./src/bench";
import type { CodingJobOptions, CodingJobOperationOptions } from "./src/coding-jobs";
import type { RepairCheck } from "./src/repair";

const ROOT = dirname(fileURLToPath(import.meta.url));
/** The npm package version. Receipts stamp `RUNTIME_VERSION` from src/run.ts
 * instead: that is the shared `algal.run.v1` wire constant, not this release. */
const PACKAGE_VERSION: string = packageJson.version;
const EXAMPLES_DIR = join(ROOT, "examples");
let diagnosticFormat: "json" | "text" = "json";

/** Wrap an executor under a route-selectable id (bench/foundry systems and
 * `--executors` maps name executors; receipts record the named id). */
const named = (id: string, inner: Executor): Executor => ({
  ...inner,
  id,
  ...(inner.receiptFor !== undefined
    ? { receiptFor: inner.receiptFor.bind(inner) }
    : {}),
});

/** `jev` / `jev:<model>` executor spec → a Jev decision executor whose
 * credential resolves through the vault chain at call time. Undefined when
 * the spec isn't a Jev spec. */
async function jevSpecExecutor(spec: string): Promise<Executor | undefined> {
  if (spec !== "jev" && !spec.startsWith("jev:")) return undefined;
  const { jevExecutor } = await import("./src/jev");
  const { credentialResolver } = await import("./src/credentials");
  const model = spec === "jev" ? undefined : spec.slice(4);
  return jevExecutor({
    credential: credentialResolver("jev"),
    ...(model !== undefined && model.length > 0 ? { model } : {}),
  });
}

async function recallSpecExecutor(spec: string, dir: string): Promise<Executor | undefined> {
  if (spec !== "recall" && !spec.startsWith("recall:")) return undefined;
  const embedderSpec = spec === "recall" ? "local" : spec.slice(7);
  if (embedderSpec.length === 0) {
    throw new AlgalError("PARSE_FAILED", "recall embedder spec must not be empty");
  }
  const { resolveEmbedder } = await import("./src/embeddings");
  const { indexSearcher, recallExecutor } = await import("./src/semantic");
  const embedder = resolveEmbedder(embedderSpec);
  return {
    ...recallExecutor(indexSearcher(dir, embedder, embedderSpec)),
    // the backend configuration digest mirrors the native recall backend —
    // `{dir, embedder, kind:"recall"}` — so receipts agree across runtimes
    receiptFor: () => ({
      configurationDigest: digestCanonical({
        dir,
        embedder: embedderSpec,
        kind: "recall",
      }),
    }),
  };
}

const USAGE = `algal: Language and VM for agent programs that wait for approval and resume

usage:
  algal compile <program.algal> [--out <manifest.json>] [--source-map <map.json>]
      [--bundle-out <bundle.json>] [--source-root <dir>]
                                              compile source; bundle its complete local import closure
  algal fmt <program.algal|dir> [more ...] [--check] [--write] [--out <file>]
                                              canonical source layout; --check exits 1 when a file
                                              is not canonical; --write rewrites files in place;
                                              --out or stdout formats a single file
  algal diagram <program.algal|manifest.json> [--format mermaid|svg|json]
      [--source <program.algal>] [--receipt <receipt.json>] [--focus <invocation>] [--out <file>]
      [--modules <dir>] [--tools <file>]
                                              render dependencies, bounds, and recorded cell states
                                              .algal source is also accepted by manifest commands
                                              --source-root bounds imports (default: entry directory)
  algal diagnose <receipt.json> --source <program.algal>
      [--source-root <dir>] [--format json|text] [--out <file>]
                                              locate a recorded failure in its original source
  algal dependencies <program.algal> [--source-root <dir>] [--bundle <bundle.json>]
      [--receipt <run.json>] [--estimate] [--application <name> [--dir <path>] [--episodes]]
      [--format json|text] [--out <file>]
                                              report source files, modules, call paths, and effects;
                                              --bundle checks an artifact against the compiled closure;
                                              --receipt attributes recorded cells and work to each call;
                                              --estimate bounds how many times each call can run;
                                              --application links each module to the application
                                              revisions, evaluations, and activations that contain it;
                                              --episodes also counts each settled episode's recorded
                                              invocations against the calls its program contains
  algal envelope <program.algal|manifest.json> [--capability <class[,class]>]
      [--modules <dir>] [--tools <file>] [--transports <file>]
      [--format json|text] [--out <file>]
                                              the static authority and work envelope: capability
                                              verdicts, the channels that can exercise each class,
                                              declared costs, and worst-case work for one
                                              invocation — computed before anything runs
  algal lock <program.algal> [--source-root <dir>] [--out <lock.json>]
      [--evaluation <cases.json>] [--versions <labels.json>]
      [--verify <lock.json> [--evaluate]] [--format json|text]
                                              pin a source project to its compiled closure;
                                              --evaluation pins fixture cases' outcomes and outputs;
                                              --versions labels closure digests for people;
                                              --verify recompiles and reports drift (exit 1);
                                              --evaluate also replays pinned cases offline;
                                              vendored copies are pinned and checked offline
  algal vendor <catalog.md|https-url> --entry <path.algal> --into <dir>
                                              copy a catalog entry and the entries it calls into
                                              a new directory; refuses unless they compile to the
                                              digests the catalog lists; https only, no symlinks
                                              or overwrites; lock never contacts the catalog
  algal examples                          list bundled examples
  algal example <id>                      print the example manifest
  algal run <manifest.json> [options]     run an organism, print its receipt
      --args <file>                           input-cell values (JSON)
      --responses <file>                      scripted agent outputs (JSON map)
      --executor-cmd <shell command>          live executor: request on stdin, output on stdout
      --executor-timeout-ms <ms>              command-executor effect timeout (default 120000, max 600000)
      --executor-profile isolated             run command executors under a declared isolation
                                                profile: scrubbed environment, fixed working
                                                directory, OS-applied resource limits
      --executor-cwd <dir>                    isolated command working directory (default: .)
      --executor-env <list>                   child-visible variables: NAME or NAME=value,
                                                comma-separated, up to 32
      --executor-limits <list>                declared resource limits (replaces the default
                                                cpuSeconds=60,noCore set): cpuSeconds,
                                                fileSizeBlocks, openFiles, processes,
                                                addressSpaceKiB, stackKiB, noCore; "none" clears
      --gateway-model <provider/model>        Vercel AI Gateway structured-output executor
      --base-url <url> --model <model>         OpenAI-compatible endpoint (HTTPS or loopback HTTP)
      --credential-env <name>                 endpoint credential environment variable (optional)
      --response-format <format>              json_schema (default), json_object, or prompt
      --jev [model]                           TypeSafe Jev decision executor — serves
                                                decide and classifier cells (never gates:
                                                approvals stay host/policy-routed)
      --recall [embedder]                     derived-index recall executor; embedder is
                                                local or gateway[:<model>] (default local)
      --executors <file>                      JSON map of executor name → shell command;
                                              route.provider/route.preset pick by name
      --modules <dir>                         load *.algal.json into the store for organism cells
      --transports <file>                     JSON map of transport name → bundle directory;
                                              via cells resolve remote manifests through it
      --tools <file>                          tool registry: name → {signature, exec};
                                              exec is scripted:<file> or cmd:<shell>
      --dir <path>                            store directory (default .algal)
      --write                                 persist manifest + receipt under --dir
      --cache-effects                         memoize effects: identical request digests
                                              serve the store's recorded response
  algal check <program.algal|manifest.json> [--modules <dir>] [--transports <file>] [--dir <path>]
                                              admit without running; source includes attempt/depth bounds
  algal explain <manifest.json> [--modules <dir>] [--transports <file>] [--dir <path>]
                                              print the compiled signature: resolved ports, guards
  algal verify <receipt.json> [manifest.json] [--modules <dir>] [--transports <file>] [--dir <path>]
                                              re-run with recorded receipts and compare;
                                              manifest resolves from the store when omitted
  algal resume <receipt.json> [manifest.json] [executor options]
                                              continue a suspended run: recorded effects
                                              replay, the rest routes to live executors
  algal replay <receipt.json> --with <manifest.json> [--args <file>] [executor options]
      [--modules <dir>] [--transports <file>] [--dir <path>] [--write] [--out <file>]
                                              counterfactual: run a revised manifest over the
                                              recorded run's evidence; emit an
                                              algal.replay-comparison.v1 record
  algal ordering <scenario.json> [--dir <path>] [--out <file>]
                                              enumerate a durable-process scenario's delivery
                                              and dispatch orderings under a habitat budget and
                                              check an invariant over each terminal state;
                                              emit an algal.ordering-report.v1 record
  algal process create <name> <manifest.json> [--args <file>] [--max-generations 16]
      [--modules <dir>] [--tools <file>] [--dir <path>]
                                              admit a durable, bounded process
  algal process export <name> [--dir <path>] [--tools <file>]
                                              write portable process evidence JSON to stdout
  algal process verify-evidence <file>          verify evidence without a store or host configuration
  algal process recover <name> --expected-intent SHA [same tool/executor options]
  algal process journal <name>
  algal job prepare <config.json>           admit a bounded coding job in a clean checkout
  algal job prepare-operation <config.json> admit an explicitly keyed operation adapter job
  algal job run|inspect <job-digest>         run once in foreground or inspect retained state
  algal job reconcile <job-digest>          observe an admitted v2 operation; never resubmit
  algal repair start <name> --job <digest> --checks <checks.json>
  algal repair tick|inspect|verify <name>    wait for the job, validate its exact patch, or replay
  algal shepherd start <name> --repo owner/repo --pr NUMBER [--max-polls 16]
  algal shepherd tick|watch|inspect|verify <name> [--gh /path/to/gh]
  algal shepherd wake <name> --delivery stable-event-id
  algal process tick <name> [executor options] execute one generation under a lease
  algal process schedule [--max-ticks 16] [executor options]
                                              run ready processes and recorded mailbox wakeups
  algal process list|inspect <name>|verify <name> [--dir <path>] [--tools <file>]
                                              inspect retained state or verify history offline
  algal process replay <name> --with <manifest.json> [executor options]
      [--args <file>] [--dir <path>] [--out <file>]
                                              replay the process's latest recorded run under a
                                              revised manifest
  algal inspect <receipt.json>            summarize a run receipt
  algal runs [--dir <path>]               list receipts stored under --dir
  algal observe [--dir <path>] [--max-items <n>]
      [--follow [--interval-ms <ms>] [--max-polls <n>] [--max-events <n>]]
                                              one read-only snapshot of live store state; every
                                              listing carries totals and truncation flags;
                                              --follow streams each change in a fixed order
  algal tail [--dir <path>] [--max-items <n>] [follow options]
                                              alias for observe --follow
  algal diff <receipt-a.json> <receipt-b.json>
                                              compare two receipts, report divergence
  algal foundry <config.json> [--responses <file>] [--executor-cmd <command>]
      [--gateway-model <provider/model>]
      [--executors <file>] [--modules <dir>] [--transports <file>] [--tools <file>]
      [--cache-effects] [--dir <path>] [--out <report.json>]
                                              generate/evaluate candidates and promote a winner
  algal foundry verify <report.json> [--dir <path>]
                                              replay every run in a foundry report or budget record offline
  algal foundry inspect <report.json>     summarize scores, lineage, and promotion
  algal foundry pack <report.json> --out <dir> [--dir <path>]
                                              export the promoted organism's verified bundle
  algal foundry search <config.json> [executor/store options] [--out <report.json>]
                                              evolve candidates over bounded generations
  algal foundry search-verify <report.json> [--dir <path>]
  algal foundry search-inspect <report.json>
  algal foundry search-pack <report.json> --out <dir> [--dir <path>]
                                              inspect or export a verified search winner
  algal foundry schedule <schedule.json> [executor/store options] [--journal <dir>] [--out <record.json>]
                                              run several foundry and search configs under one budget,
                                              taking turns; --journal resumes an interrupted schedule
  algal foundry schedule-verify <record.json> [--dir <path>]
                                              replay every run a schedule record lists offline
  algal bench <config.json> [--modules <dir>] [--tools <file>] [--dir <path>] [--out <report.json>]
                                              measure several systems on one workload:
                                              quality, tokens, work, per-model attribution,
                                              and the non-dominated pareto set (with optional prices)
  algal bench verify <report.json> [--dir <path>]
                                              replay every case receipt in a bench report
  algal bench inspect <report.json>       summarize a pareto comparison
  algal suite                             run and verify all bundled examples
  algal digest <manifest.json>            print the manifest's canonical digest
  algal library compare <name> <revision.algal> [--unseen <cases.json>]
      [--repository <dir>] [--verify <record.json>] [--format json|text] [--out <file>]
                                              compare a revision of a shared catalog program
                                              with its listed version on each caller's cases
                                              and the pinned unseen cases (exit 1 if it fails);
                                              --verify reruns it and checks a saved record
  algal library unseen <cases.json>       check an unseen case file, print its digest
  algal store put <value.json> [--dir <path>]
                                              write a JSON value to CAS, print its ref token
  algal store get <sha256:…> [--dir <path>]
                                              print the payload a ref resolves to
  algal store has <sha256:…> [--dir <path>]
                                              report whether a ref resolves
  algal slots [--dir <path>]              list durable slot cells' state
  algal manifests [--dir <path>]         list manifests stored under --dir
  algal manifest <sha256:…> [--dir <path>]
                                              print a stored manifest
  algal application lineage <name> [--dir <path>]
                                              print retained application history, genesis→head
  algal slot get <name> [--dir <path>]    print a slot's current value
  algal slot set <name> <value.json> [--dir <path>]
                                              write a slot directly (seeding)
  algal mailbox create <name> [--max-messages <n>] [--max-message-bytes <n>]
                                              create bounded send/receive capabilities
  algal mailbox list [--dir <path>]          list admitted mailboxes and handles
  algal mailbox send <send-cap> <value.json> [--idempotency-key <sha256:…>]
                                              enqueue an external wakeup
  algal mailbox receive <receive-cap>        consume one message or suspend
  algal mailbox revoke <cap>                 revoke one mailbox capability
  algal application drain <input.json> [--dir <path>]
                                              produce an algal.application-drain.v1
                                              record disposing every undispatched
                                              pending intent at a parent state
  algal application verify-drain <input.json> [--dir <path>]
                                              re-verify a drain against a state
  algal pack <manifest.json> [--modules <dir>] [--dir <path>] [--out <dir>]
                                              print a closure bundle: the manifest plus every
                                              embedded sub-manifest and const-ref payload;
                                              --out also writes <root-hex>.bundle.json
  algal unpack <bundle.json> [--dir <path>]
                                              install a bundle into the store, digests verified
  algal call <bundle.json> [--interface] [options]
                                              run a packed organism and print a compact result:
                                              { ok, outputs, receiptDigest, manifestDigest }.
                                              --interface maps named interface arguments and
                                              returns only declared interface outputs.
                                              options mirror algal run: --args, --responses,
                                              --executor-cmd, --executor-profile, --gateway-model,
                                              --jev, --recall,
                                              --executors, --modules, --tools, --cache-effects, --dir
  algal tool-def <manifest.json> [--modules <dir>]
                                              print an OpenAI/Anthropic tool definition for the
                                              organism's interface: a name, description, and a
                                              JSON Schema of the arguments it expects
  algal index [--dir <path>] [--docs <dir>] [--embedder local|gateway[:<model>]]
                                              rebuild the derived semantic index over the
                                              store's manifests/runs/values (plus docs)
  algal search <query> [--dir <path>] [-k <n>] [--embedder local|gateway[:<model>]]
                                              hybrid rank: embedding cosine ⊕ token overlap
  algal db build [--dir <path>]              rebuild the derived program index (program.db)
  algal db status [--dir <path>]             report index-versus-store drift; exit 1 when stale
  algal db tables                            list the queryable relations, columns, and projections
  algal db query <json|@file> [--dir <path>]
                                              run a declarative query: {"table", "columns",
                                              "where", "order", "limit"} over the built index
  algal db <projection> [args] [--dir <path>] [--limit <n>]
                                              canned joins: callers-of <digest>,
                                              revisions-for-executable <digest>,
                                              receipts-touching-capability <class>,
                                              unevaluated-revisions, largest-work,
                                              process-status, kinds
  algal auth <provider> [--status | --forget | --clipboard]
                                              vault a provider credential locally — keychain
                                              when available, permission-checked file otherwise;
                                              never echoes the key
  algal doctor [--jev]                        runtime and provider availability check
  algal --version | --help

Source diagnostics (all commands that load .algal files):
  --diagnostic-format json|text               stderr format for compile errors (default json)
                                              JSON preserves error/message and adds diagnostic
`;

type ParsedArgs = {
  cmd: string;
  positional: string[];
  flags: Record<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const [cmd = "help", ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (key === "interface") {
        if (Object.hasOwn(flags, key)) usageError("--interface may be supplied only once");
        flags[key] = true;
        continue;
      }
      if (key.startsWith("interface=")) usageError("--interface is a boolean flag without a value");
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { cmd, positional, flags };
}

async function readJson(path: string): Promise<JsonValue> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as JsonValue;
  } catch (e) {
    throw new AlgalError(
      "PARSE_FAILED",
      `${path}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

async function readOptionalJson(path: string): Promise<JsonValue | undefined> {
  let source: string;
  try { source = await readFile(path, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  try { return asJsonValue(JSON.parse(source), path); }
  catch (error) { throw new AlgalError("PARSE_FAILED", `${path}: ${error instanceof Error ? error.message : String(error)}`); }
}

async function readJsonBounded(
  path: string,
  maxBytes: number,
  label: string,
): Promise<JsonValue> {
  try {
    // Explicit input symlinks may name regular files. Nonblocking admission
    // rejects FIFOs/devices before a byte bound could otherwise take effect.
    const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size > maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", `${label}: regular file byte bound`);
      const chunks: Buffer[] = [];
      let size = 0;
      for (;;) {
        const buffer = Buffer.alloc(Math.min(65_536, maxBytes + 1 - size));
        const { bytesRead } = await file.read(buffer, 0, buffer.length, null);
        if (bytesRead === 0) break;
        size += bytesRead;
        if (size > maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", `${label} exceeds ${maxBytes} bytes`);
        chunks.push(buffer.subarray(0, bytesRead));
      }
      return JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks))) as JsonValue;
    } finally { await file.close(); }
  } catch (error) {
    if (error instanceof AlgalError) throw error;
    throw new AlgalError(
      "PARSE_FAILED",
      `${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function artifactFlag(flags: ParsedArgs["flags"], key: string): string | undefined {
  const value = flags[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) usageError(`--${key} requires a value`);
  return value;
}

/** An output must not overwrite a source, receipt, or the other output. */
async function distinctArtifactPaths(inputs: string[], outputs: Array<string | undefined>): Promise<void> {
  const canonical = async (path: string): Promise<string> => {
    const absolute = resolve(path);
    try { return await realpath(absolute); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = dirname(absolute);
      if (parent === absolute) throw error;
      return join(await canonical(parent), basename(absolute));
    }
  };
  const identities = async (path: string): Promise<string[]> => {
    const name = await canonical(path);
    const information = await stat(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return undefined;
    });
    return [`path:${name}`, ...(information ? [`inode:${information.dev}:${information.ino}`] : [])];
  };
  const seen = new Set((await Promise.all(inputs.map(identities))).flat());
  for (const path of outputs) {
    if (path === undefined) continue;
    const names = await identities(path);
    if (names.some(name => seen.has(name))) usageError(`output path aliases an input or another output: ${path}`);
    for (const name of names) seen.add(name);
  }
}

async function emitArtifact(contents: string, path: string | undefined): Promise<void> {
  const text = contents.endsWith("\n") ? contents : `${contents}\n`;
  if (path === undefined) process.stdout.write(text);
  else {
    await writeFile(resolve(path), text);
    diag(`wrote ${path}`);
  }
}

async function readJsonStdin(): Promise<JsonValue> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of Bun.stdin.stream()) {
    size += chunk.byteLength;
    if (size > BOUNDS.maxArgsBytes) throw new AlgalError("BUDGET_EXHAUSTED", "stdin arguments exceed the byte bound");
    chunks.push(chunk);
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks));
    if (!text.trim()) throw new Error("stdin was empty");
    return JSON.parse(text) as JsonValue;
  } catch (e) {
    throw new AlgalError(
      "PARSE_FAILED",
      `stdin: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

function out(v: JsonValue | JsonObject | RunReceipt): void {
  const line = canonicalize(v as JsonValue) + "\n";
  try {
    // Drain fully before the process can exit: async process.stdout.write
    // drops data past the OS pipe buffer (~64KiB) when a large receipt is
    // the last thing printed, and a single writeSync may short-write on
    // a non-blocking fd.
    const buf = Buffer.from(line);
    let off = 0;
    while (off < buf.length) off += writeSync(1, buf, off, buf.length - off);
  } catch {
    process.stdout.write(line);
  }
}

function diag(msg: string): void {
  process.stderr.write(msg + "\n");
}

/** Explain an `EFFECT_UNBOUND` run failure on stderr: which cell asked for
 * which route, and which executors the host actually admitted. The receipt
 * itself is shared wire bytes with the native runtime and stays unchanged. */
function unboundHint(
  receipt: { failure?: { code: string; path?: string } },
  manifest: { cells: readonly { id: string; route?: { provider?: string; preset?: string } }[] },
  executors: readonly Executor[],
): void {
  if (receipt.failure?.code !== "EFFECT_UNBOUND") return;
  const path = receipt.failure.path;
  const cell = path === undefined ? undefined : manifest.cells.find((c) => c.id === path.split("/").at(-1));
  const route = cell?.route;
  const asked = route?.provider !== undefined ? `route.provider "${route.provider}"`
    : route?.preset !== undefined ? `route.preset "${route.preset}"`
    : "no route";
  const admitted = executors.filter((e) => e.replay !== true).map((e) => `"${e.id}"`);
  diag(`hint: cell "${path ?? "?"}" requested ${asked}; admitted executors: ${admitted.length ? admitted.join(", ") : "none"}. `
    + `Routes match an executor by id (--executors maps names; --responses serves any route).`);
}

/** Load every *.algal.json under dir into the store so organism cells
 * resolve by digest. */
async function loadModules(
  dir: string,
  store: FileStore,
): Promise<number> {
  const { readdir } = await import("node:fs/promises");
  const resolved = resolve(dir);
  let files: string[];
  try {
    files = await readdir(resolved);
  } catch {
    throw new AlgalError("IO_FAILED", `modules dir not readable: ${dir}`);
  }
  let loaded = 0;
  for (const f of files.sort()) {
    if (!/\.algal\.json$/.test(f)) continue;
    const m = parseOrganismManifest(await readJsonBounded(join(resolved, f), BOUNDS.maxManifestBytes, "manifest"));
    await store.putManifest(m);
    loaded++;
  }
  return loaded;
}

/** `--transports <file>` maps transport names to bundle directories —
 * what `pack --out` writes. */
async function loadTransports(
  file: string,
  base = process.cwd(),
): Promise<Record<string, Transport>> {
  const { fileTransport, httpTransport, parseTransportsFile } = await import("./src/transport");
  const map = parseTransportsFile(await readJson(resolve(file)));
  const out: Record<string, Transport> = {};
  for (const [name, target] of Object.entries(map)) {
    out[name] = /^https?:\/\//.test(target)
      ? httpTransport(target)
      : fileTransport(resolve(base, target), name);
  }
  return out;
}

/** Load a tool registry from a JSON file:
 *   { "<tool.name>": { "signature": {...}, "exec": "scripted:<file>" | "cmd:<shell>" } }
 * scripted maps canonical(inputs) -> output ports; cmd receives
 * { inputs, requestDigest, idempotencyKey } on stdin and must print a JSON
 * object of output ports. Both stay behind the signature's bounds. */
async function loadTools(file: string): Promise<ToolRegistry> {
  const { commandJson } = await import("./src/io");
  const { parseToolSignature, TOOL_SIGNATURE_BOUNDS } = await import("./src/tools");
  const resolved = resolve(file);
  const raw = asRecord(await readJson(resolved), "tools");
  const base = dirname(resolved);
  const registry: ToolRegistry = new Map();
  for (const [name, entry] of Object.entries(raw)) {
    if (
      !/^[a-z0-9][a-z0-9.-]*$/.test(name) ||
      name.length > TOOL_SIGNATURE_BOUNDS.maxNameLen
    ) {
      throw new AlgalError("PARSE_FAILED", `invalid tool name "${name}"`);
    }
    const e = asRecord(entry, `tools.${name}`);
    const extra = Object.keys(e).filter(
      (k) => k !== "signature" && k !== "exec",
    );
    if (e.signature === undefined || typeof e.exec !== "string" || extra.length > 0) {
      throw new AlgalError(
        "PARSE_FAILED",
        `tools.${name} requires "signature" and "exec"`,
      );
    }
    const signature = parseToolSignature(
      e.signature,
      `tools.${name}.signature`,
    );
    const spec = e.exec;
    const configuration: JsonObject = {contract: "algal.cli-tool-binding.v1", signature: e.signature, exec: spec, cwd: await realpath(base)};
    let tool: Tool;
    if (spec.startsWith("scripted:")) {
      const data = asRecord(
        await readJson(resolve(base, spec.slice("scripted:".length))),
        `tools.${name} data`,
      );
      configuration.responses = data as JsonObject;
      tool = async (inputs) => {
        const key = canonicalize(inputs);
        const hit = data[key];
        if (hit === null || typeof hit !== "object" || Array.isArray(hit)) {
          throw new AlgalError(
            "TOOL_FAILED",
            `${name}: no scripted output for inputs ${key.slice(0, 200)}`,
          );
        }
        return hit as Record<string, JsonValue>;
      };
    } else if (spec.startsWith("cmd:")) {
      const command = spec.slice("cmd:".length);
      tool = async (inputs, context) => {
        const parsed = await commandJson(["sh", "-c", command], {
          inputs,
          requestDigest: context.requestDigest,
          ...(context.idempotencyKey ? { idempotencyKey: context.idempotencyKey } : {}),
        }, {
          cwd: base, timeoutMs: 30_000,
          maxStdoutBytes: signature.maxOutputBytes, ...(context.signal ? { signal: context.signal } : {}),
        });
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new AlgalError(
            "TOOL_FAILED",
            `${name}: output must be a JSON object of ports`,
          );
        }
        return parsed as Record<string, JsonValue>;
      };
    } else {
      throw new AlgalError(
        "PARSE_FAILED",
        `tools.${name}.exec must be scripted:<file> or cmd:<shell>`,
      );
    }
    registry.set(name, { signature, tool, configurationDigest: digestCanonical(configuration) });
  }
  return registry;
}

/** Export only needs declarations: never open scripted data or bind commands. */
async function evidenceTools(file: string | undefined, dir: string): Promise<ToolRegistry> {
  const { FileMailboxService, mailboxToolRegistry } = await import("./src/mailbox");
  const { mergeToolRegistries, parseToolSignature, TOOL_SIGNATURE_BOUNDS } = await import("./src/tools");
  const standard = mailboxToolRegistry(new FileMailboxService(dir));
  if (file === undefined) return standard;
  const entries = asRecord(await readJsonBounded(resolve(file), 1_048_576, "evidence tools"), "tools");
  if (Object.keys(entries).length > 64) usageError("evidence tools exceeds 64 entries");
  const registry: ToolRegistry = new Map();
  for (const [name, raw] of Object.entries(entries)) {
    if (!/^[a-z0-9][a-z0-9.-]*$/.test(name) || name.length > TOOL_SIGNATURE_BOUNDS.maxNameLen)
      usageError("invalid evidence tool name");
    const entry = asRecord(raw, `tools.${name}`);
    if (entry.signature === undefined || Object.keys(entry).some(key => key !== "signature" && key !== "exec") ||
        (entry.exec !== undefined && typeof entry.exec !== "string"))
      usageError(`tools.${name} requires signature and optional exec`);
    registry.set(name, {signature: parseToolSignature(entry.signature, `tools.${name}.signature`),
      tool: async () => { throw new AlgalError("RECEIPT_MISMATCH", "evidence cannot execute a host tool"); }});
  }
  return mergeToolRegistries(standard, registry);
}

async function resolveTools(
  flags: Record<string, string | boolean>,
  dir: string,
): Promise<ToolRegistry> {
  const { FileMailboxService, mailboxToolRegistry } = await import("./src/mailbox");
  const { mergeToolRegistries } = await import("./src/tools");
  const standard = mailboxToolRegistry(new FileMailboxService(dir));
  return flags.tools === undefined
    ? standard
    : mergeToolRegistries(standard, await loadTools(String(flags.tools)));
}

/** `--executor-profile isolated` plus its sub-flags → the declared isolation
 * posture every command executor in this invocation runs under. Without the
 * profile the sub-flags are usage errors; with it, bare `isolated` means a
 * scrubbed environment, a fixed directory, and the default CPU/core limits. */
async function commandIsolationFlags(
  flags: Record<string, string | boolean>,
): Promise<CommandIsolation | undefined> {
  const profile = artifactFlag(flags, "executor-profile");
  const dependent = ["executor-cwd", "executor-env", "executor-limits"].find((k) => flags[k] !== undefined);
  if (profile === undefined) {
    if (dependent !== undefined) usageError(`--${dependent} requires --executor-profile isolated`);
    return undefined;
  }
  if (profile !== "isolated") usageError("--executor-profile must be isolated");
  const cwdFlag = artifactFlag(flags, "executor-cwd");
  let cwd: string;
  try {
    // Canonicalize so the recorded directory is the physical one.
    cwd = await realpath(cwdFlag === undefined ? process.cwd() : resolve(cwdFlag));
  } catch {
    usageError(`--executor-cwd does not resolve to a directory: ${cwdFlag ?? process.cwd()}`);
  }
  const envInherit: string[] = [];
  const envSet: Record<string, string> = {};
  const envFlag = artifactFlag(flags, "executor-env");
  if (envFlag !== undefined) {
    for (const entry of envFlag.split(",")) {
      const eq = entry.indexOf("=");
      if (entry.length === 0 || eq === 0) {
        usageError("--executor-env entries are NAME or NAME=value");
      }
      if (eq < 0) envInherit.push(entry);
      else envSet[entry.slice(0, eq)] = entry.slice(eq + 1);
    }
  }
  // Replaceable default: a bare `isolated` profile still bounds CPU and
  // refuses core dumps. `--executor-limits` restates the whole set; `none`
  // leaves the limits empty.
  let limits: IsolationLimits = { cpuSeconds: 60, noCore: true };
  const limitsFlag = artifactFlag(flags, "executor-limits");
  if (limitsFlag !== undefined) {
    const parsed: { -readonly [K in keyof IsolationLimits]?: IsolationLimits[K] } = {};
    if (limitsFlag !== "none") {
      for (const entry of limitsFlag.split(",")) {
        const eq = entry.indexOf("=");
        const key = (eq < 0 ? entry : entry.slice(0, eq)).trim();
        const raw = eq < 0 ? undefined : entry.slice(eq + 1);
        if (key === "noCore") {
          if (raw !== undefined && raw !== "true" && raw !== "1") {
            usageError("executor limit noCore takes no value");
          }
          parsed.noCore = true;
          continue;
        }
        if (!["cpuSeconds", "fileSizeBlocks", "openFiles", "processes", "addressSpaceKiB", "stackKiB"].includes(key)) {
          usageError(`unknown executor limit "${key}" (want cpuSeconds, fileSizeBlocks, openFiles, processes, addressSpaceKiB, stackKiB, or noCore)`);
        }
        if (raw === undefined) usageError(`executor limit ${key} requires a value`);
        const value = Number(raw);
        if (!Number.isInteger(value)) usageError(`executor limit ${key} must be an integer`);
        (parsed as Record<string, number>)[key] = value;
      }
    }
    limits = parsed;
  }
  return { cwd, envInherit, envSet, limits };
}

/** Live executors from the shared run/call/resume flag set: `--responses`
 * fixtures are wildcard scripted executors, `--executors` names host
 * adapters (cmd / jev / recall specs keep their capability declarations). */
async function resolveExecutors(
  flags: Record<string, string | boolean>,
  dir: string,
): Promise<Executor[]> {
  for (const key of ["apple", "apple-bridge", "agent", "host"]) {
    if (flags[key] !== undefined) usageError(`--${key} requires the native ALGAL CLI; it is not supported by the Bun runtime`);
  }
  const baseUrl = artifactFlag(flags, "base-url");
  const endpointModel = artifactFlag(flags, "model");
  const credentialEnv = artifactFlag(flags, "credential-env");
  const responseFormat = artifactFlag(flags, "response-format");
  if ((baseUrl !== undefined) !== (endpointModel !== undefined))
    usageError("--base-url and --model must be supplied together");
  if (baseUrl === undefined && (credentialEnv !== undefined || responseFormat !== undefined))
    usageError("--credential-env and --response-format require --base-url and --model");
  if (baseUrl !== undefined && ["responses", "executor-cmd", "gateway-model", "jev", "recall"].some(key => flags[key] !== undefined))
    usageError("choose one default executor; --base-url cannot be combined with another provider");
  if (responseFormat !== undefined && !["json_schema", "json_object", "prompt"].includes(responseFormat))
    usageError("--response-format must be json_schema, json_object, or prompt");
  const { commandExecutor, scriptedExecutor } = await import("./src/effects");
  const isolation = await commandIsolationFlags(flags);
  const { isolatedCommandExecutor } = isolation === undefined
    ? { isolatedCommandExecutor: undefined }
    : await import("./src/isolation");
  const forCommand = (cmd: string, opts: { timeoutMs?: number } = {}): Executor =>
    isolation === undefined
      ? commandExecutor(cmd, opts)
      : isolatedCommandExecutor!(cmd, { ...opts, isolation });
  const executors: Executor[] = [];
  if (baseUrl !== undefined && endpointModel !== undefined) {
    const { openAICompatibleExecutor } = await import("./src/openai-compatible");
    executors.push(named("default", openAICompatibleExecutor({ baseUrl, model: endpointModel,
      ...(credentialEnv !== undefined ? { credentialEnv } : {}),
      ...(responseFormat !== undefined ? { responseFormat: responseFormat as "json_schema" | "json_object" | "prompt" } : {}),
    })));
  }
  if (flags.responses !== undefined) {
    const map = asRecord(
      await readJson(resolve(String(flags.responses))),
      "responses",
    );
    executors.push(scriptedExecutor(map as Record<string, JsonValue>));
  }
  if (flags["executor-cmd"] !== undefined) {
    const tms = flags["executor-timeout-ms"];
    executors.push(forCommand(String(flags["executor-cmd"]),
      tms !== undefined
        ? { timeoutMs: asInt(Number(tms), "executor-timeout-ms", 1, 600_000) }
        : {}));
  }
  if (flags["gateway-model"] !== undefined) {
    const model = String(flags["gateway-model"]);
    if (process.env.AI_GATEWAY_API_KEY === undefined && process.env.VERCEL_OIDC_TOKEN === undefined) {
      throw new AlgalError(
        "EFFECT_UNBOUND",
        `--gateway-model ${model}: no AI Gateway credential; set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN before running`,
      );
    }
    const { vercelGatewayExecutor } = await import("./src/gateway");
    executors.push(vercelGatewayExecutor({ model }));
  }
  if (flags.jev !== undefined) {
    executors.push((await jevSpecExecutor(typeof flags.jev === "string" ? `jev:${flags.jev}` : "jev"))!);
  }
  if (flags.recall !== undefined) {
    const spec = typeof flags.recall === "string" ? `recall:${flags.recall}` : "recall";
    executors.push(named("recall", (await recallSpecExecutor(spec, dir))!));
  }
  if (flags.executors !== undefined) {
    const map = asRecord(
      await readJson(resolve(String(flags.executors))),
      "executors",
    );
    for (const [name, cmd] of Object.entries(map)) {
      if (typeof cmd !== "string" || cmd.length === 0) {
        throw new AlgalError(
          "PARSE_FAILED",
          `executors.${name} must be a shell command string`,
        );
      }
      const jev = await jevSpecExecutor(cmd);
      if (jev !== undefined) {
        executors.push(named(name, jev));
        continue;
      }
      const recall = await recallSpecExecutor(cmd, dir);
      if (recall !== undefined) {
        executors.push(named(name, recall));
        continue;
      }
      const inner = forCommand(cmd);
      executors.push(named(name, inner));
    }
    diag(`loaded ${Object.keys(map).length} named executor(s)`);
  }
  return executors;
}

/** Convert a Algal port type to a draft-07 JSON Schema fragment. */
function portToJsonSchema(p: {
  type: string;
  optional?: boolean;
  many?: boolean;
  labels?: string[];
  schema?: JsonObject;
  capability?: string;
}): JsonValue {
  let base: JsonObject;
  switch (p.type) {
    case "text":
      base = { type: "string" };
      break;
    case "int":
      base = { type: "integer" };
      break;
    case "number":
      base = { type: "number" };
      break;
    case "bool":
      base = { type: "boolean" };
      break;
    case "json":
      base = p.schema ? { ...p.schema } : { type: "object" };
      break;
    case "choice":
      base = { type: "string", enum: p.labels ?? [] };
      break;
    case "ref":
      base = { type: "string", pattern: "^sha256:[a-f0-9]{64}$" };
      break;
    case "cap":
      base = {
        type: "string",
        pattern: `^cap:${p.capability ?? "[a-z][a-z0-9-]*"}:sha256:[a-f0-9]{64}$`,
      };
      break;
    default:
      base = {};
  }
  return p.many ? { type: "array", items: base } : (base as JsonValue);
}

/** Derive a public interface from the manifest's input cells when the
 * manifest does not declare one. Input cells export their first output port. */
function deriveInputs(c: {
  manifest: { cells: { id: string; kind: string }[] };
  ports: Map<string, { inputs: Record<string, unknown>; outputs: Record<string, unknown> }>;
}): Record<string, { cell: string; port: string }> {
  const inputs: Record<string, { cell: string; port: string }> = {};
  for (const cell of c.manifest.cells) {
    if (cell.kind !== "input") continue;
    const sig = c.ports.get(cell.id);
    if (!sig) continue;
    const first = Object.keys(sig.outputs)[0];
    if (!first) continue;
    inputs[cell.id] = { cell: cell.id, port: first };
  }
  return inputs;
}

async function main(): Promise<number> {
  const { cmd, positional, flags } = parseArgs(process.argv.slice(2));
  const requestedDiagnosticFormat = artifactFlag(flags, "diagnostic-format") ?? "json";
  if (requestedDiagnosticFormat !== "json" && requestedDiagnosticFormat !== "text") {
    usageError("--diagnostic-format must be json or text");
  }
  diagnosticFormat = requestedDiagnosticFormat;
  delete flags["diagnostic-format"];
  if (cmd === "process" && positional[0] === "verify-evidence") {
    if (positional.length !== 2 || Object.keys(flags).length !== 0)
      usageError("algal process verify-evidence <file> accepts no host flags");
    const { PROCESS_EVIDENCE_BOUNDS, verifyProcessEvidence } = await import("./src/process-evidence");
    out(await verifyProcessEvidence(await readJsonBounded(resolve(positional[1]!),
      PROCESS_EVIDENCE_BOUNDS.maxBytes, "process evidence")) as unknown as JsonValue);
    return 0;
  }
  const dir = String(flags.dir ?? ".algal");
  const { FileStore } = await import("./src/store");
  const store = new FileStore(dir);
  const { builtinRegistry } = await import("./src/registry");
  const fns = builtinRegistry();
  const sourceRoot = artifactFlag(flags, "source-root");
  const readProject = async (path: string) => (await import("./src/source-project")).loadSourceProject(resolve(path),
    sourceRoot === undefined ? {} : { root: resolve(sourceRoot) });
  const installSource = async (project: Awaited<ReturnType<typeof readProject>>, target: Store) => {
    for (const module of project.modules) await target.putManifest(module);
  };
  // Every manifest command receives the same source closure, including verify,
  // foundry, and durable processes. No ambient module directory is required.
  const readManifest = async (path: string): Promise<OrganismManifest> => {
    if (!path.endsWith(".algal")) return parseOrganismManifest(await readJsonBounded(path, BOUNDS.maxManifestBytes, "manifest"));
    const project = await readProject(path);
    await installSource(project, store);
    return project.manifest;
  };

  switch (cmd) {
    case "compile": {
      if (positional.length !== 1) usageError("algal compile <program.algal> [--out <manifest.json>] [--source-map <map.json>] [--bundle-out <bundle.json>] [--source-root <dir>]");
      for (const key of Object.keys(flags)) {
        if (!["out", "source-map", "bundle-out", "source-root"].includes(key)) usageError(`unknown compile option --${key}`);
      }
      const { MemoryStore } = await import("./src/store");
      const { compileOrganism } = await import("./src/graph");
      const { packOrganism } = await import("./src/bundle");
      const file = positional[0]!;
      const output = artifactFlag(flags, "out");
      const mapPath = artifactFlag(flags, "source-map");
      const bundlePath = artifactFlag(flags, "bundle-out");
      const result = await readProject(file);
      await distinctArtifactPaths(result.files, [output, mapPath, bundlePath]);
      const compilationStore = new MemoryStore();
      await installSource(result, compilationStore);
      await compileOrganism(result.manifest, fns, compilationStore);
      const bundle = bundlePath === undefined ? undefined : await packOrganism(result.manifest, compilationStore);
      if (mapPath !== undefined) await emitArtifact(canonicalize(result.sourceMap as unknown as JsonValue), mapPath);
      if (bundle !== undefined) await emitArtifact(canonicalize(bundle as unknown as JsonValue), bundlePath);
      await emitArtifact(canonicalize(manifestToJson(result.manifest)), output);
      return 0;
    }

    case "fmt": {
      if (positional.length === 0) usageError("algal fmt <program.algal|dir> [more ...] [--check] [--write] [--out <file>]");
      for (const key of Object.keys(flags)) {
        if (!["check", "write", "out"].includes(key)) usageError(`unknown fmt option --${key}`);
        if (key === "out") continue;
        if (flags[key] !== true) usageError(`--${key} is a boolean flag without a value`);
      }
      const check = flags.check === true;
      const write = flags.write === true;
      const output = artifactFlag(flags, "out");
      if (check && write) usageError("--check and --write are exclusive");
      if (output !== undefined && (check || write)) usageError("--out formats a file elsewhere; it cannot combine with --check or --write");
      if (output === undefined && !check && !write && positional.length !== 1) usageError("stdout formatting takes exactly one file; use --check or --write for several");
      if (output !== undefined && positional.length !== 1) usageError("--out formats exactly one file");
      const { SOURCE_BOUNDS, SourceError } = await import("./src/source");
      const { formatSource } = await import("./src/source-format");
      const { loadSourceFiles } = await import("./src/source-project");
      // A directory argument scans for .algal sources beneath it: regular
      // files only, no symlink traversal, with scan size and depth bounded.
      const FMT_BOUNDS = { maxFiles: 1_024, maxDepth: 16, maxScanEntries: 65_536 };
      const scan = async (root: string, dir: string, keys: string[], depth: number, left: { entries: number }): Promise<void> => {
        if (depth > FMT_BOUNDS.maxDepth) throw new AlgalError("BUDGET_EXHAUSTED", `fmt: directory depth exceeds ${FMT_BOUNDS.maxDepth}: ${dir}`);
        for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
          if (left.entries-- <= 0) throw new AlgalError("BUDGET_EXHAUSTED", `fmt: directory entries exceed ${FMT_BOUNDS.maxScanEntries}: ${root}`);
          const key = dir === "" ? entry.name : `${dir}/${entry.name}`;
          if (entry.isSymbolicLink()) {
            if (entry.name.endsWith(".algal")) throw new AlgalError("PARSE_FAILED", `symlink traversal is not allowed: ${key}`);
            continue;
          }
          if (entry.isDirectory()) await scan(root, key, keys, depth + 1, left);
          else if (entry.isFile() && entry.name.endsWith(".algal")) keys.push(key);
        }
      };
      // Collect every input as resolved path → display path → text. Explicit
      // files read through the same bounded, symlink-free loader as projects.
      const targets = new Map<string, { path: string; source: string }>();
      for (const path of positional) {
        const absolute = resolve(path);
        let info;
        try { info = await lstat(absolute); }
        catch (error) { throw new AlgalError("IO_FAILED", `cannot read ${path} (${(error as NodeJS.ErrnoException).code ?? "IO_FAILED"})`); }
        if (info.isDirectory()) {
          if (!check && !write) usageError("a directory input needs --check or --write");
          const root = await realpath(absolute);
          const keys: string[] = [];
          await scan(root, "", keys, 0, { entries: FMT_BOUNDS.maxScanEntries });
          if (keys.length === 0) throw new AlgalError("INPUT_MISSING", `no .algal source files found in ${path}`);
          if (keys.length > FMT_BOUNDS.maxFiles) throw new AlgalError("BUDGET_EXHAUSTED", `fmt: more than ${FMT_BOUNDS.maxFiles} .algal files beneath ${path}`);
          keys.sort();
          const sources = await loadSourceFiles(root, keys, SOURCE_BOUNDS.maxSourceBytes, { noun: "source" });
          for (const key of keys) targets.set(join(root, ...key.split("/")), { path: join(path, ...key.split("/")), source: sources[key]! });
        } else if (info.isFile()) {
          const root = await realpath(dirname(absolute));
          const sources = await loadSourceFiles(root, [basename(absolute)], SOURCE_BOUNDS.maxSourceBytes, { noun: "source" });
          targets.set(join(root, basename(absolute)), { path, source: sources[basename(absolute)]! });
        } else throw new AlgalError("PARSE_FAILED", `fmt: not a regular file or directory: ${path}`);
      }
      const files = new Map<string, { path: string; source: string; formatted: string }>();
      for (const [absolute, target] of targets) {
        try {
          files.set(absolute, { ...target, formatted: formatSource(target.source) });
        } catch (error) {
          if (error instanceof SourceError) throw new SourceError(error.diagnostic.message, error.diagnostic.span, { source: target.path });
          throw error;
        }
      }
      const changed = [...files.values()].filter(file => file.formatted !== file.source).map(file => file.path);
      if (check) {
        out({ ok: changed.length === 0, changed });
        // Exit-code rule shared with the native CLI: 1 means the check ran and found drift.
        return changed.length === 0 ? 0 : 1;
      }
      if (write) {
        for (const [absolute, file] of files) if (file.formatted !== file.source) await writeFile(absolute, file.formatted);
        out({ ok: true, changed });
        return 0;
      }
      await distinctArtifactPaths([...files.keys()], [output]);
      await emitArtifact(files.values().next().value!.formatted, output);
      return 0;
    }

    case "diagram": {
      if (positional.length !== 1) usageError("algal diagram <program.algal|manifest.json> [--source <program.algal>] [--format mermaid|svg|json] [--receipt <file>] [--out <file>]");
      for (const key of Object.keys(flags)) {
        if (!["out", "format", "receipt", "source", "source-root", "focus", "modules", "tools", "transports", "dir"].includes(key)) {
          usageError(`unknown diagram option --${key}`);
        }
        artifactFlag(flags, key);
      }
      const { createProgramDiagram, renderMermaid, renderSvg } = await import("./src/diagram");
      const { compileOrganism } = await import("./src/graph");
      const { parseRunReceipt, RECEIPT_BOUNDS } = await import("./src/run");
      const file = positional[0]!;
      const format = artifactFlag(flags, "format") ?? "mermaid";
      if (!["mermaid", "svg", "json"].includes(format)) usageError("diagram format must be mermaid, svg, or json");
      const output = artifactFlag(flags, "out");
      const receiptPath = artifactFlag(flags, "receipt");
      const sourcePath = artifactFlag(flags, "source");
      const focus = artifactFlag(flags, "focus");
      if (file.endsWith(".algal") && sourcePath !== undefined) usageError("a .algal input already supplies source; --source is for compiled manifests");
      const project = file.endsWith(".algal") ? await readProject(file)
        : sourcePath === undefined ? undefined : await readProject(sourcePath);
      await distinctArtifactPaths([file, ...(receiptPath === undefined ? [] : [receiptPath]), ...(project?.files ?? [])], [output]);
      const manifest = file.endsWith(".algal") ? project!.manifest : await readManifest(resolve(file));
      if (project !== undefined && project.sourceMap.manifestDigest !== digestCanonical(manifestToJson(manifest))) {
        throw new AlgalError("MANIFEST_INVALID", "diagram: source does not compile to this manifest");
      }
      if (project !== undefined) await installSource(project, store);
      const receipt = receiptPath === undefined ? undefined : parseRunReceipt(await readJsonBounded(resolve(receiptPath), RECEIPT_BOUNDS.maxBytes, "run receipt"));
      if (flags.modules !== undefined) await loadModules(String(flags.modules), store);
      const compiled = project !== undefined || flags.modules !== undefined || flags.tools !== undefined || flags.transports !== undefined
        ? await compileOrganism(manifest, fns, store, 0,
          flags.transports === undefined ? undefined : await loadTransports(String(flags.transports)),
          await resolveTools(flags, dir))
        : undefined;
      const view = createProgramDiagram(manifest, {
        ...(project === undefined ? {} : { source: project.source, sourceOptions: project.compilerOptions }),
        ...(receipt === undefined ? {} : { receipt }),
        ...(compiled === undefined || focus !== undefined ? {} : { ports: compiled.ports }),
        ...(focus === undefined ? {} : { focus }),
      });
      const contents = format === "svg" ? renderSvg(view)
        : format === "json" ? canonicalize(view as unknown as JsonValue)
        : renderMermaid(view);
      await emitArtifact(contents, output);
      return 0;
    }

    case "diagnose": {
      if (positional.length !== 1) usageError("algal diagnose <receipt.json> --source <program.algal> [--format json|text] [--source-root <dir>] [--out <file>]");
      for (const key of Object.keys(flags)) {
        if (!["source", "source-root", "format", "out"].includes(key)) usageError(`unknown diagnose option --${key}`);
        artifactFlag(flags, key);
      }
      const { RECEIPT_BOUNDS } = await import("./src/run");
      const { diagnoseSource, renderSourceDiagnostics } = await import("./src/source-diagnostics");
      const sourcePath = artifactFlag(flags, "source");
      if (sourcePath === undefined) usageError("diagnose requires --source <program.algal>");
      const format = artifactFlag(flags, "format") ?? "json";
      if (format !== "json" && format !== "text") usageError("diagnose format must be json or text");
      const output = artifactFlag(flags, "out");
      const receiptPath = resolve(positional[0]!);
      const project = await readProject(sourcePath);
      await distinctArtifactPaths([receiptPath, ...project.files], [output]);
      const receipt = await readJsonBounded(receiptPath, RECEIPT_BOUNDS.maxBytes, "run receipt");
      const report = diagnoseSource(receipt, project.source, project.compilerOptions);
      await emitArtifact(format === "text" ? renderSourceDiagnostics(report) : canonicalize(report as unknown as JsonValue), output);
      return 0;
    }

    case "dependencies": {
      if (positional.length !== 1) usageError("algal dependencies <program.algal> [--source-root <dir>] [--bundle <bundle.json>] [--receipt <run.json>] [--estimate] [--application <name> [--dir <path>] [--episodes]] [--format json|text] [--out <file>]");
      for (const key of Object.keys(flags)) {
        if (!["source-root", "bundle", "receipt", "estimate", "application", "dir", "episodes", "format", "out"].includes(key)) usageError(`unknown dependencies option --${key}`);
        if (key !== "estimate" && key !== "episodes") artifactFlag(flags, key);
      }
      if (flags.estimate !== undefined && flags.estimate !== true) usageError("--estimate is a boolean flag without a value");
      if (flags.episodes !== undefined && flags.episodes !== true) usageError("--episodes is a boolean flag without a value");
      const applicationName = artifactFlag(flags, "application");
      if (flags.dir !== undefined && applicationName === undefined) usageError("--dir names the application store and requires --application");
      if (flags.episodes === true && applicationName === undefined) usageError("--episodes attributes settled episode evidence and requires --application");
      const { createSourceDependencyReport, renderSourceDependencies } = await import("./src/source-dependencies");
      const { RECEIPT_BOUNDS } = await import("./src/run");
      const format = artifactFlag(flags, "format") ?? "json";
      if (format !== "json" && format !== "text") usageError("dependencies format must be json or text");
      const output = artifactFlag(flags, "out");
      const bundlePath = artifactFlag(flags, "bundle");
      const receiptPath = artifactFlag(flags, "receipt");
      const project = await readProject(positional[0]!);
      await distinctArtifactPaths([...project.files, ...(bundlePath === undefined ? [] : [resolve(bundlePath)]), ...(receiptPath === undefined ? [] : [resolve(receiptPath)])], [output]);
      if (applicationName !== undefined && output !== undefined) {
        // The application store is an input: a report must not overwrite its records.
        const root = await realpath(resolve(dir)).catch(() => resolve(dir));
        const target = resolve(output);
        const parent = await realpath(dirname(target)).catch(() => dirname(target));
        const inside = join(parent, basename(target));
        if (inside === root || inside.startsWith(`${root}/`)) usageError("--out must not write inside the application store");
      }
      // Both files are ordinary parsed data; the report still checks them under its own limits.
      const bundle = bundlePath === undefined ? undefined : await readJsonBounded(resolve(bundlePath), BOUNDS.maxBundleBytes, "bundle");
      const receipt = receiptPath === undefined ? undefined : await readJsonBounded(resolve(receiptPath), RECEIPT_BOUNDS.maxBytes, "run receipt");
      // Reading validated history needs no admission authority; this host refuses every commit.
      const application = applicationName === undefined ? undefined : {
        name: applicationName,
        ...(flags.episodes === true ? { episodes: true } : {}),
        reader: new (await import("./src/application")).ApplicationService(dir, {
          admitCommit() { return Promise.reject(new AlgalError("CAPABILITY_DENIED", "dependencies reads application history only")); },
        }),
      };
      const report = await createSourceDependencyReport(project.source, {
        sourceOptions: project.compilerOptions, ...(bundle === undefined ? {} : { bundle }), ...(receipt === undefined ? {} : { receipt }),
        ...(flags.estimate === true ? { estimate: true } : {}), ...(application === undefined ? {} : { application }),
      });
      await emitArtifact(format === "text" ? renderSourceDependencies(report) : canonicalize(report as unknown as JsonValue), output);
      return 0;
    }

    case "envelope": {
      if (positional.length !== 1) usageError("algal envelope <program.algal|manifest.json> [--capability <class[,class]>] [--modules <dir>] [--tools <file>] [--transports <file>] [--format json|text] [--out <file>]");
      for (const key of Object.keys(flags)) {
        if (!["capability", "modules", "tools", "transports", "dir", "format", "out", "source-root"].includes(key)) usageError(`unknown envelope option --${key}`);
        artifactFlag(flags, key);
      }
      const { createAuthorityEnvelope, renderAuthorityEnvelope } = await import("./src/envelope");
      const format = artifactFlag(flags, "format") ?? "json";
      if (format !== "json" && format !== "text") usageError("envelope format must be json or text");
      const output = artifactFlag(flags, "out");
      const project = positional[0]!.endsWith(".algal") ? await readProject(positional[0]!) : undefined;
      if (project !== undefined) await installSource(project, store);
      const manifest = project?.manifest ?? parseOrganismManifest(await readJsonBounded(resolve(positional[0]!), BOUNDS.maxManifestBytes, "manifest"));
      await distinctArtifactPaths([resolve(positional[0]!), ...(project?.files ?? [])], [output]);
      if (flags.modules !== undefined) await loadModules(String(flags.modules), store);
      // Named classes are answered even when the program never declares them.
      const capabilities = artifactFlag(flags, "capability")
        ?.split(",").map(name => name.trim()).filter(name => name.length > 0);
      const report = await createAuthorityEnvelope(manifest, {
        fns, store,
        tools: await resolveTools(flags, dir),
        ...(flags.transports === undefined ? {} : { transports: await loadTransports(String(flags.transports)) }),
        ...(capabilities === undefined || capabilities.length === 0 ? {} : { capabilities }),
      });
      await emitArtifact(format === "text" ? renderAuthorityEnvelope(report) : canonicalize(report as unknown as JsonValue), output);
      return 0;
    }

    case "lock": {
      if (positional.length !== 1) usageError("algal lock <program.algal> [--source-root <dir>] [--out <lock.json>] [--evaluation <cases.json>] [--versions <labels.json>] [--verify <lock.json> [--evaluate]] [--format json|text]");
      for (const key of Object.keys(flags)) {
        if (!["source-root", "out", "verify", "format", "evaluation", "versions", "evaluate"].includes(key)) usageError(`unknown lock option --${key}`);
        if (key !== "evaluate") artifactFlag(flags, key);
      }
      if (flags.evaluate !== undefined && flags.evaluate !== true) usageError("--evaluate is a boolean flag without a value");
      const { createSourceLock, parseSourceLock, parseSourceLockCases, sourceLockFixtureKeys, verifySourceLock, renderSourceLockVerification, sourceLockToJson, SOURCE_LOCK_BOUNDS } = await import("./src/source-lock");
      const format = artifactFlag(flags, "format") ?? "json";
      if (format !== "json" && format !== "text") usageError("lock format must be json or text");
      const output = artifactFlag(flags, "out");
      const verifyPath = artifactFlag(flags, "verify");
      const casesPath = artifactFlag(flags, "evaluation");
      const versionsPath = artifactFlag(flags, "versions");
      const evaluate = flags.evaluate === true;
      if (verifyPath === undefined && format === "text") usageError("lock text output is only available with --verify");
      if (verifyPath === undefined && evaluate) usageError("--evaluate is only available with --verify");
      if (verifyPath !== undefined && (casesPath !== undefined || versionsPath !== undefined)) usageError("--evaluation and --versions write a lock; --verify reads them from the lock");
      const project = await readProject(positional[0]!);
      const inputs = [verifyPath, casesPath, versionsPath].flatMap(path => path === undefined ? [] : [resolve(path)]);
      const cases = casesPath === undefined ? undefined : parseSourceLockCases(await readJsonBounded(resolve(casesPath), SOURCE_LOCK_BOUNDS.lock.maxBytes, "lock evaluation cases"));
      const labels = versionsPath === undefined ? undefined : await readJsonBounded(resolve(versionsPath), SOURCE_LOCK_BOUNDS.lock.maxBytes, "lock versions");
      const lockValue = verifyPath === undefined ? undefined : await readJsonBounded(resolve(verifyPath), SOURCE_LOCK_BOUNDS.lock.maxBytes, "source lock");
      // Fixtures are read only when named, beneath the source root, with the source loader's guards.
      const keys = cases !== undefined ? sourceLockFixtureKeys(cases) : evaluate ? sourceLockFixtureKeys(parseSourceLock(lockValue)) : [];
      // Vendored copies are found beside the project's own files and read the same way; nothing is fetched.
      const { loadVendoredSources, VENDOR_RECORD_FILE } = await import("./src/vendor-record");
      const vendored = await loadVendoredSources(project.root, Object.keys(project.sources));
      const vendoredPaths = [...Object.keys(vendored.records).map(directory => `${directory}/${VENDOR_RECORD_FILE}`), ...Object.keys(vendored.files)];
      await distinctArtifactPaths([...project.files, ...inputs, ...[...keys, ...vendoredPaths].map(key => join(project.root, ...key.split("/")))], [output]);
      const { loadSourceFixtures } = await import("./src/source-project");
      const fixtures = keys.length === 0 ? {} : await loadSourceFixtures(project.root, keys, SOURCE_LOCK_BOUNDS.evaluation.maxFixtureBytes);
      if (lockValue === undefined) {
        const lock = await createSourceLock(project.source, project.compilerOptions, {
          ...(cases === undefined ? {} : { evaluation: cases, fixtures }),
          ...(labels === undefined ? {} : { versions: labels as Record<string, string> }),
          vendored,
        });
        await emitArtifact(canonicalize(sourceLockToJson(lock)), output);
        return 0;
      }
      const verification = await verifySourceLock(project.source, project.compilerOptions, lockValue, { ...(evaluate ? { fixtures } : {}), vendored });
      await emitArtifact(format === "text" ? renderSourceLockVerification(verification) : canonicalize(verification as unknown as JsonValue), output);
      // Exit-code rule shared with the native CLI: 1 means the check ran and found drift.
      return verification.ok ? 0 : 1;
    }

    case "vendor": {
      const usage = "algal vendor <catalog.md|https-url> --entry <path.algal> --into <dir>";
      if (positional.length !== 1) usageError(usage);
      for (const key of Object.keys(flags)) {
        if (!["entry", "into"].includes(key)) usageError(`unknown vendor option --${key}`);
        artifactFlag(flags, key);
      }
      const entry = artifactFlag(flags, "entry");
      const into = artifactFlag(flags, "into");
      if (entry === undefined || into === undefined) usageError(usage);
      // Vendoring's only network step; lock and verify read the copy offline. The
      // directory is created beneath the current one.
      const { vendorCatalogEntry } = await import("./src/vendor");
      const { vendorRecordToJson } = await import("./src/vendor-record");
      const record = await vendorCatalogEntry({ catalog: positional[0]!, entry, into, root: process.cwd() });
      out(vendorRecordToJson(record));
      diag(`vendored ${record.files.length} file${record.files.length === 1 ? "" : "s"} into ${into}`);
      return 0;
    }

    case "--help":
    case "-h":
    case "help":
      process.stdout.write(USAGE);
      return 0;

    case "--version":
    case "version":
      out({ name: "algal", version: PACKAGE_VERSION, contract: "algal.organism.v1" });
      return 0;

    case "examples": {
      const { readdir } = await import("node:fs/promises");
      const files = (await readdir(EXAMPLES_DIR)).filter(
        (f) => /\.algal\.json$/.test(f),
      );
      out({ examples: files.map((f) => f.replace(/\.algal\.json$/, "")) });
      return 0;
    }

    case "example": {
      const id = positional[0];
      if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
        throw new AlgalError("PARSE_FAILED", "usage: algal example <id>");
      }
      const m = await readJson(join(EXAMPLES_DIR, `${id}.algal.json`));
      out(m);
      return 0;
    }

    case "digest": {
      const file = positional[0];
      if (!file) usageError("algal digest <manifest.json>");
      const manifest = await readManifest(file);
      out({ digest: digestCanonical(manifestToJson(manifest)) });
      return 0;
    }

    case "library": {
      const { libraryComparisonToJson, parseLibraryUnseenCases, renderLibraryComparison, LIBRARY_COMPARISON_BOUNDS, LIBRARY_UNSEEN_CASES_CONTRACT } = await import("./src/library-comparison");
      if (positional[0] === "unseen") {
        if (positional.length !== 2 || Object.keys(flags).length > 0) usageError("algal library unseen <cases.json>");
        const parsed = parseLibraryUnseenCases(await readJsonBounded(resolve(positional[1]!), LIBRARY_COMPARISON_BOUNDS.unseen.maxBytes, "unseen cases"));
        out({ contract: LIBRARY_UNSEEN_CASES_CONTRACT, cases: parsed.cases.length, digest: parsed.digest });
        return 0;
      }
      const usage = "algal library compare <name> <revision.algal> [--unseen <cases.json>] [--intended <declaration.json>] [--repository <dir>] [--verify <record.json>] [--format json|text] [--out <file>]";
      if (positional[0] !== "compare" || positional.length !== 3 || !positional[2]!.endsWith(".algal")) usageError(usage);
      for (const key of Object.keys(flags)) {
        if (!["unseen", "intended", "repository", "verify", "format", "out"].includes(key)) usageError(`unknown library compare option --${key}`);
        artifactFlag(flags, key);
      }
      const format = artifactFlag(flags, "format") ?? "json";
      if (format !== "json" && format !== "text") usageError("library compare format must be json or text");
      const { compareLibraryRevision, verifyLibraryComparison, LIBRARY_INDEX_PAGE } = await import("./src/library-compare");
      const { loadSourceFixtures } = await import("./src/source-project");
      const { SOURCE_BOUNDS } = await import("./src/source");
      const repository = resolve(artifactFlag(flags, "repository") ?? ".");
      const output = artifactFlag(flags, "out");
      const unseenPath = artifactFlag(flags, "unseen");
      const intendedPath = artifactFlag(flags, "intended");
      const verifyPath = artifactFlag(flags, "verify");
      const revisionPath = resolve(positional[2]!);
      await distinctArtifactPaths([revisionPath, join(repository, LIBRARY_INDEX_PAGE), ...[unseenPath, intendedPath, verifyPath].flatMap(path => path === undefined ? [] : [resolve(path)])], [output]);
      // The revision is read like a source file: a regular UTF-8 file within the source byte limit.
      const revisionFile = await realpath(revisionPath).catch((error: NodeJS.ErrnoException) => {
        throw new AlgalError("IO_FAILED", `cannot read revision ${positional[2]!} (${error.code ?? "IO_FAILED"})`);
      });
      const revision = (await loadSourceFixtures(dirname(revisionFile), [basename(revisionFile)], SOURCE_BOUNDS.maxSourceBytes))[basename(revisionFile)]!;
      const unseen = unseenPath === undefined ? undefined : await readJsonBounded(resolve(unseenPath), LIBRARY_COMPARISON_BOUNDS.unseen.maxBytes, "unseen cases");
      const intended = intendedPath === undefined ? undefined : await readJsonBounded(resolve(intendedPath), LIBRARY_COMPARISON_BOUNDS.record.maxBytes, "intended change declaration");
      const options = { repository, name: positional[1]!, revision, ...(unseen === undefined ? {} : { unseen }), ...(intended === undefined ? {} : { intended }) };
      const record = verifyPath === undefined ? await compareLibraryRevision(options)
        : await verifyLibraryComparison(await readJsonBounded(resolve(verifyPath), LIBRARY_COMPARISON_BOUNDS.record.maxBytes, "library comparison"), options);
      await emitArtifact(format === "text" ? renderLibraryComparison(record) : canonicalize(libraryComparisonToJson(record)), output);
      // 1 means the comparison ran and did not pass; a record that --verify cannot reproduce exits 2.
      return record.verdict.passed ? 0 : 1;
    }

    case "store": {
      const sub = positional[0];
      const asRefDigest = (s: string | undefined): `sha256:${string}` => {
        if (!s || !/^sha256:[0-9a-f]{64}$/.test(s)) {
          throw new AlgalError(
            "PARSE_FAILED",
            "expected a sha256:<64 hex> ref token",
          );
        }
        return s as `sha256:${string}`;
      };
      switch (sub) {
        case "put": {
          const file = positional[1];
          if (!file) usageError("algal store put <value.json>");
          const v = await readJson(resolve(file));
          const bytes = canonicalize(v).length;
          if (bytes > BOUNDS.maxBlobBytes) {
            throw new AlgalError(
              "BUDGET_EXHAUSTED",
              `value ${bytes}B exceeds maxBlobBytes ${BOUNDS.maxBlobBytes}B — a run could never load this ref`,
            );
          }
          const d = await store.putValue(v);
          out({ ref: d, bytes });
          return 0;
        }
        case "get": {
          const d = asRefDigest(positional[1]);
          const v = await store.getValue(d);
          if (v === undefined) {
            throw new AlgalError("INPUT_MISSING", `ref ${d} not in store`);
          }
          out(v);
          return 0;
        }
        case "has": {
          const d = asRefDigest(positional[1]);
          out({ ref: d, ok: (await store.getValue(d)) !== undefined });
          return 0;
        }
        default:
          usageError("algal store put|get|has …");
      }
      return 0;
    }

    case "application": {
      // Durable application lifecycle evidence commands — the same verbs the
      // native `algal application` CLI serves. `--policy` supplies the
      // `algal.application-host.v1` record that admits commits; without it a
      // deny-all host keeps the structural and read-only commands working.
      const sub = positional[0];
      for (const key of Object.keys(flags)) {
        if (!["dir", "policy", "channels", "restoration-policy", "selection-environment"].includes(key)) usageError(`unknown application option --${key}`);
      }
      const { ApplicationService } = await import("./src/application");
      type ApplicationAdmission = import("./src/application").ApplicationAdmission;
      const { createApplicationPolicyHost } = await import("./src/application-host");
      const { produceApplicationDrain, verifyApplicationDrain } = await import("./src/application-drain");
      const { applicationObject, applicationRef } = await import("./src/application-contract");
      const channelsDir = resolve(String(flags.channels ?? join(dir, "channels")));
      let admission: ApplicationAdmission;
      if (flags.policy === undefined) {
        admission = {
          admitCommit() { return Promise.reject(new AlgalError("CAPABILITY_DENIED", "No application admission host")); },
        };
      } else {
        const policy = await readJsonBounded(resolve(String(flags.policy)), 262_144, "application host policy");
        admission = createApplicationPolicyHost(policy, {
          channelsDir,
          ...(flags["restoration-policy"] !== undefined
            ? { restorationPolicy: (await import("./src/application-restoration")).parseApplicationRestorationPolicy(await readJsonBounded(resolve(String(flags["restoration-policy"])), 262_144, "application restoration policy")) }
            : {}),
          ...(flags["selection-environment"] !== undefined
            ? { selectionEnvironment: String(flags["selection-environment"]) }
            : {}),
        });
      }
      const service = new ApplicationService(dir, admission);
      switch (sub) {
        case "drain": {
          if (positional.length !== 2) usageError("algal application drain <input.json>");
          const input = await readJsonBounded(resolve(positional[1]!), 262_144, "application drain input");
          out({ drain: await produceApplicationDrain(service, input) });
          return 0;
        }
        case "verify-drain": {
          if (positional.length !== 2) usageError("algal application verify-drain <input.json>");
          const input = await readJsonBounded(resolve(positional[1]!), 262_144, "application verify-drain input");
          const v = applicationObject(input, ["drain", "expectedState"]);
          await verifyApplicationDrain(service, v.drain, v.expectedState);
          out({ verified: true });
          return 0;
        }
        case "lineage": {
          if (positional.length !== 2) usageError("algal application lineage <name> [--dir <path>]");
          out(await service.lineage(positional[1]!) as unknown as JsonValue);
          return 0;
        }
        case "verify-message": {
          if (positional.length !== 2) usageError("algal application [--policy <policy.json>] verify-message <input.json>");
          const { verifyInterappDelivery } = await import("./src/application-message");
          const input = applicationObject(await readJsonBounded(resolve(positional[1]!), 262_144, "verify-message input"), ["message"]);
          const verified = await verifyInterappDelivery(service, applicationRef(input.message), { channelsDir });
          out({ ok: true, application: verified.application, operation: verified.operation, intent: verified.intent, route: verified.route, to: verified.to });
          return 0;
        }
        case "contend": {
          if (positional.length !== 2) usageError("algal application [--policy <policy.json>] contend <input.json>");
          const { produceApplicationContention } = await import("./src/application-contention");
          const produced = await produceApplicationContention(service, await readJsonBounded(resolve(positional[1]!), 262_144, "contend input") as never);
          out({ contention: produced.contention, winner: produced.record.winner });
          return 0;
        }
        case "verify-contention": {
          if (positional.length !== 2) usageError("algal application [--policy <policy.json>] verify-contention <input.json>");
          const { verifyApplicationContention } = await import("./src/application-contention");
          const input = applicationObject(await readJsonBounded(resolve(positional[1]!), 262_144, "verify-contention input"), ["contention"]);
          const record = await verifyApplicationContention(service, applicationRef(input.contention));
          out({ ok: true, winner: record.winner });
          return 0;
        }
        default:
          usageError("algal application [--policy <policy.json>] drain|verify-drain|lineage|verify-message|contend|verify-contention …");
      }
      return 0;
    }

    case "pack": {
      const file = positional[0];
      if (!file) usageError("algal pack <manifest.json> [--modules <dir>]");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const { packOrganism } = await import("./src/bundle");
      const manifest = await readManifest(resolve(file));
      const bundle = await packOrganism(manifest, store);
      if (flags.out !== undefined) {
        const { mkdir, writeFile } = await import("node:fs/promises");
        const dirPath = resolve(String(flags.out));
        await mkdir(dirPath, { recursive: true });
        const target = join(
          dirPath,
          `${bundle.root.slice("sha256:".length)}.bundle.json`,
        );
        await writeFile(target, canonicalize(bundle as unknown as JsonValue));
        diag(`wrote ${target}`);
      }
      out(bundle as unknown as JsonValue);
      return 0;
    }

    case "unpack": {
      const file = positional[0];
      if (!file) usageError("algal unpack <bundle.json>");
      const { parseBundle, unpackBundle } = await import("./src/bundle");
      const bundle = parseBundle(await readJson(resolve(file)));
      const res = await unpackBundle(bundle, store);
      out({ ok: true, root: bundle.root, ...res });
      return 0;
    }

    case "call": {
      const file = positional[0];
      if (!file || positional.length !== 1) usageError("algal call <bundle.json> [--interface] [options]");
      const { parseBundle, unpackBundle } = await import("./src/bundle");
      const { cachedExecutor } = await import("./src/effects");
      const { runOrganism } = await import("./src/run");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }

      const bundle = parseBundle(await readJson(resolve(file)));
      await unpackBundle(bundle, store);
      const manifest = await store.getManifest(bundle.root);
      if (!manifest) {
        throw new AlgalError("STORE_MISS", `bundle root ${bundle.root} not in store after unpack`);
      }

      const argsRaw =
        flags.args === "-"
          ? asRecord(await readJsonStdin(), "args")
          : flags.args !== undefined
            ? asRecord(await readJsonBounded(resolve(String(flags.args)), BOUNDS.maxArgsBytes, "call arguments"), "args")
            : {};
      if (flags.interface !== undefined && flags.interface !== true) usageError("--interface is a boolean flag");
      const viaInterface = flags.interface === true;
      const args: Record<string, Record<string, JsonValue>> = Object.create(null);
      if (viaInterface) {
        const declared = manifest.interface;
        if (!declared) usageError("call --interface requires a declared manifest interface");
        if (Object.keys(argsRaw).length !== Object.keys(declared.inputs).length || Object.keys(argsRaw).some(name => !Object.hasOwn(declared.inputs, name))) usageError("call --interface requires exactly the declared input names");
        for (const [name, target] of Object.entries(declared.inputs)) {
          const ports = args[target.cell] ??= Object.create(null) as Record<string, JsonValue>;
          if (Object.hasOwn(ports, target.port) && canonicalize(ports[target.port]!) !== canonicalize(argsRaw[name]!)) usageError("call --interface aliases contain conflicting arguments");
          ports[target.port] = argsRaw[name]!;
        }
      } else {
        for (const [cellId, ports] of Object.entries(argsRaw)) args[cellId] = asRecord(ports, `args.${cellId}`);
      }

      const executors = await resolveExecutors(flags, dir);
      const transports =
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined;
      const tools = await resolveTools(flags, dir);

      const receipt = await runOrganism({
        manifest,
        args,
        fns,
        store,
        executors:
          flags["cache-effects"] !== undefined
            ? executors.map((e) => cachedExecutor(e, store))
            : executors,
        ...(transports ? { transports } : {}),
        ...(tools ? { tools } : {}),
      });

      const outputs: JsonObject = Object.create(null);
      if (viaInterface) {
        for (const [name, target] of Object.entries(manifest.interface!.outputs)) {
          const ports = receipt.cells[target.cell]?.outputs;
          if (ports && Object.hasOwn(ports, target.port)) outputs[name] = ports[target.port]!;
        }
      } else {
        for (const [id, cell] of Object.entries(receipt.cells)) if (cell.outputs) outputs[id] = cell.outputs as JsonValue;
      }
      unboundHint(receipt, manifest, executors);
      const rd = await store.putReceipt(receipt as unknown as JsonValue);
      const compact: JsonObject = {
        ok: receipt.outcome === "complete",
        outputs,
        receiptDigest: rd,
        manifestDigest: receipt.manifestDigest,
      };
      if (receipt.outcome !== "complete") {
        compact.error = receipt.failure
          ? { code: receipt.failure.code, message: receipt.failure.message }
          : { code: "FAILED", message: receipt.outcome };
      }
      out(compact);
      return receipt.outcome === "complete" ? 0 : 1;
    }

    case "tool-def": {
      const file = positional[0];
      if (!file) usageError("algal tool-def <manifest.json> [--format openai|anthropic]");
      const { compileOrganism } = await import("./src/graph");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const manifest = await readManifest(resolve(file));
      const compiled = await compileOrganism(
        manifest,
        fns,
        store,
        0,
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined,
        await resolveTools(flags, dir),
      );

      const raw = manifest.interface ?? { inputs: deriveInputs(compiled), outputs: {} };
      const properties: JsonObject = {};
      const required: string[] = [];
      for (const [name, end] of Object.entries(raw.inputs)) {
        const sig = compiled.ports.get(end.cell);
        if (!sig) {
          throw new AlgalError("PARSE_FAILED", `interface input ${name}: cell ${end.cell} not found`);
        }
        const p = sig.outputs[end.port];
        if (!p) {
          throw new AlgalError("PARSE_FAILED", `interface input ${name}: port ${end.port} not found on cell ${end.cell}`);
        }
        properties[name] = portToJsonSchema(p as never) as JsonObject;
        if (!p.optional) required.push(name);
      }
      const parameters: JsonObject = {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        additionalProperties: false,
        properties,
      };
      if (required.length) parameters.required = required;

      const baseName =
        (manifest.key.split(":").pop() ?? manifest.name)
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "") || "organism";
      const functionName = baseName.slice(0, 64) || "organism";
      const description = manifest.note ?? manifest.name;

      const fmt = String(flags.format ?? "openai");
      if (fmt === "anthropic") {
        out({
          name: functionName,
          description,
          input_schema: parameters,
        });
      } else {
        out({
          type: "function",
          function: {
            name: functionName,
            description,
            parameters,
          },
        });
      }
      return 0;
    }

    case "check": {
      const file = positional[0];
      if (!file) usageError("algal check <program.algal|manifest.json> [--modules <dir>]");
      const { compileOrganism } = await import("./src/graph");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const project = file.endsWith(".algal") ? await readProject(file) : undefined;
      if (project !== undefined) await installSource(project, store);
      const manifest = project?.manifest ?? await readManifest(resolve(file));
      const compiled = await compileOrganism(
        manifest,
        fns,
        store,
        0,
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined,
        await resolveTools(flags, dir),
      );
      out({
        ok: true,
        key: manifest.key,
        digest: digestCanonical(manifestToJson(manifest)),
        cells: compiled.manifest.cells.map((c) => ({ id: c.id, kind: c.kind })),
        edges: compiled.manifest.edges.length,
        ...(project === undefined ? {} : {
          source: { entry: project.entry, files: project.files.length, ...project.analysis },
        }),
      });
      return 0;
    }

    case "explain": {
      const file = positional[0];
      if (!file) {
        usageError("algal explain <manifest.json> [--modules <dir>]");
      }
      const { compileOrganism } = await import("./src/graph");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const manifest = await readManifest(resolve(file));
      const compiled = await compileOrganism(
        manifest,
        fns,
        store,
        0,
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined,
        await resolveTools(flags, dir),
      );
      const ptJson = (p: {
        type: string;
        optional?: boolean;
        many?: boolean;
        labels?: string[];
        schema?: JsonObject;
        schemaVersion?: number;
        capability?: string;
      }): JsonValue => {
        const o: JsonObject = { type: p.type };
        if (p.optional) o.optional = true;
        if (p.many) o.many = true;
        if (p.labels) o.labels = p.labels;
        if (p.schema) o.schema = p.schema;
        if (p.schemaVersion) o.schemaVersion = p.schemaVersion;
        if (p.capability) o.capability = p.capability;
        return o as JsonValue;
      };
      const cells: JsonObject = {};
      for (const c of compiled.manifest.cells) {
        const sig = compiled.ports.get(c.id)!;
        cells[c.id] = {
          kind: c.kind,
          inputs: Object.fromEntries(
            Object.entries(sig.inputs).map(([k, v]) => [k, ptJson(v)]),
          ),
          outputs: Object.fromEntries(
            Object.entries(sig.outputs).map(([k, v]) => [k, ptJson(v)]),
          ),
        };
      }
      out({
        key: manifest.key,
        digest: digestCanonical(manifestToJson(manifest)),
        cells,
        edges: manifest.edges.map((e) => ({
          from: `${e.from.cell}.${e.from.port}`,
          to: `${e.to.cell}.${e.to.port}`,
          ...(e.guard ? { guard: e.guard } : {}),
          ...(e.on ? { on: e.on } : {}),
        })),
      });
      return 0;
    }

    case "run": {
      const file = positional[0];
      if (!file) usageError("algal run <manifest.json> [options]");
      const { cachedExecutor } = await import("./src/effects");
      const { runOrganism } = await import("./src/run");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const manifest = await readManifest(resolve(file));

      const argsRaw =
        flags.args !== undefined
          ? asRecord(await readJson(resolve(String(flags.args))), "args")
          : {};
      const args: Record<string, Record<string, JsonValue>> = {};
      for (const [cellId, ports] of Object.entries(argsRaw)) {
        args[cellId] = asRecord(ports as JsonValue, `args.${cellId}`);
      }

      const executors = await resolveExecutors(flags, dir);
      const transports =
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined;
      const tools = await resolveTools(flags, dir);

      const receipt = await runOrganism({
        manifest,
        args,
        fns,
        store,
        executors:
          flags["cache-effects"] !== undefined
            ? executors.map((e) => cachedExecutor(e, store))
            : executors,
        ...(transports ? { transports } : {}),
        ...(tools ? { tools } : {}),
      });

      if (flags.write) {
        const md = await store.putManifest(manifest);
        const rd = await store.putReceipt(receipt as unknown as JsonValue);
        diag(`manifest ${md}`);
        diag(`receipt  ${rd}`);
      }
      unboundHint(receipt, manifest, executors);
      out(receipt);
      return receipt.outcome === "complete" ? 0 : 1;
    }

    case "foundry": {
      const file = positional[0];
      if (!file) usageError("algal foundry <config.json> | foundry verify|inspect|pack <report.json>");
      const { packOrganism } = await import("./src/bundle");
      const { cachedExecutor } = await import("./src/effects");
      const { parseExprScorer } = await import("./src/expr");
      const { generateFoundryCandidates, runFoundry, runFoundryWithin } = await import("./src/foundry");
      const { parseFoundryReport, verifyFoundryReport } = await import("./src/foundry-verify");
      const { runFoundrySearch } = await import("./src/search");
      const { parseSearchReport, verifySearchReport } = await import("./src/search-verify");
      const { HABITAT_BUDGET_CONTRACT, HabitatAccount, parseHabitatLimits, verifyHabitatBudget } = await import("./src/habitat-budget");
      if (file === "verify") {
        const reportFile = positional[1];
        if (!reportFile) usageError("algal foundry verify <report.json> [--dir <path>]");
        const raw = await readJson(resolve(reportFile));
        // An exhausted foundry writes its terminal habitat budget record in
        // place of a report; `verify` accepts whichever the run wrote.
        const verified = raw !== null && typeof raw === "object" && !Array.isArray(raw) && raw.contract === HABITAT_BUDGET_CONTRACT
          ? await verifyHabitatBudget(raw, store, fns, await resolveTools(flags, dir))
          : await verifyFoundryReport(raw, store, fns, await resolveTools(flags, dir));
        out(verified as unknown as JsonObject);
        return verified.ok ? 0 : 1;
      }
      if (file === "inspect") {
        const reportFile = positional[1];
        if (!reportFile) usageError("algal foundry inspect <report.json>");
        const report = parseFoundryReport(await readJson(resolve(reportFile)));
        out({
          contract: report.contract,
          digest: report.digest,
          promoted: report.promoted,
          lineage: report.lineage ?? null,
          candidates: report.candidates.map((candidate) => ({
            manifestDigest: candidate.manifestDigest,
            manifestKey: candidate.manifestKey,
            train: candidate.train,
            validation: candidate.validation,
            work: candidate.work,
            usage: candidate.usage,
          })),
          holdout: { passed: report.holdout.passed, total: report.holdout.total },
        });
        return 0;
      }
      if (file === "search-verify") {
        const reportFile = positional[1];
        if (!reportFile) usageError("algal foundry search-verify <report.json> [--dir <path>]");
        const raw = await readJson(resolve(reportFile));
        // An exhausted search writes its terminal habitat budget record in
        // place of a report; `search-verify` accepts either.
        const verified = raw !== null && typeof raw === "object" && !Array.isArray(raw) && raw.contract === HABITAT_BUDGET_CONTRACT
          ? await verifyHabitatBudget(raw, store, fns, await resolveTools(flags, dir), "search")
          : await verifySearchReport(raw, store, fns, await resolveTools(flags, dir));
        out(verified as unknown as JsonObject);
        return verified.ok ? 0 : 1;
      }
      if (file === "search-inspect") {
        const reportFile = positional[1];
        if (!reportFile) usageError("algal foundry search-inspect <report.json>");
        const report = parseSearchReport(await readJson(resolve(reportFile)));
        out({
          contract: report.contract,
          digest: report.digest,
          generatorDigest: report.generatorDigest,
          generations: report.generations.map((generation) => ({
            generation: generation.generation,
            proposed: generation.proposed.length,
            population: generation.candidates.length,
            promoted: generation.promoted,
          })),
          promoted: report.result.promoted,
          holdout: { passed: report.result.holdout.passed, total: report.result.holdout.total },
        });
        return 0;
      }
      if (file === "search-pack") {
        const reportFile = positional[1];
        if (!reportFile || flags.out === undefined) {
          usageError("algal foundry search-pack <report.json> --out <dir> [--dir <path>]");
        }
        const raw = await readJson(resolve(reportFile));
        const report = parseSearchReport(raw);
        const verified = await verifySearchReport(
          raw,
          store,
          fns,
          await resolveTools(flags, dir),
        );
        if (!verified.ok) {
          throw new AlgalError("RECEIPT_MISMATCH", `search report failed verification: ${verified.mismatches.join("; ")}`);
        }
        const promoted = await store.getManifest(report.result.promoted);
        if (!promoted) throw new AlgalError("STORE_MISS", `promoted manifest ${report.result.promoted} missing`);
        const bundle = await packOrganism(promoted, store);
        const outputDir = resolve(String(flags.out));
        const { mkdir, writeFile } = await import("node:fs/promises");
        await mkdir(outputDir, { recursive: true });
        const outputFile = join(outputDir, `${report.result.promoted.slice(7)}.bundle.json`);
        await writeFile(outputFile, canonicalize(bundle as unknown as JsonValue));
        out({ bundle: outputFile, root: bundle.root, search: report.digest });
        return 0;
      }
      if (file === "pack") {
        const reportFile = positional[1];
        if (!reportFile || flags.out === undefined) {
          usageError("algal foundry pack <report.json> --out <dir> [--dir <path>]");
        }
        const raw = await readJson(resolve(reportFile));
        const report = parseFoundryReport(raw);
        const verified = await verifyFoundryReport(
          raw,
          store,
          fns,
          await resolveTools(flags, dir),
        );
        if (!verified.ok) {
          throw new AlgalError("RECEIPT_MISMATCH", `foundry report failed verification: ${verified.mismatches.join("; ")}`);
        }
        const promoted = await store.getManifest(report.promoted);
        if (!promoted) throw new AlgalError("STORE_MISS", `promoted manifest ${report.promoted} missing`);
        const bundle = await packOrganism(promoted, store);
        const outputDir = resolve(String(flags.out));
        const { mkdir, writeFile } = await import("node:fs/promises");
        await mkdir(outputDir, { recursive: true });
        const outputFile = join(outputDir, `${report.promoted.slice(7)}.bundle.json`);
        await writeFile(outputFile, canonicalize(bundle as unknown as JsonValue));
        out({ bundle: outputFile, root: bundle.root, foundry: report.digest });
        return 0;
      }
      if (file === "schedule-verify") {
        const recordFile = positional[1];
        if (!recordFile) usageError("algal foundry schedule-verify <record.json> [--dir <path>]");
        const { verifyHabitatSchedule } = await import("./src/habitat-schedule");
        const verified = await verifyHabitatSchedule(await readJson(resolve(recordFile)), store, fns, await resolveTools(flags, dir));
        out(verified as unknown as JsonObject);
        return verified.ok ? 0 : 1;
      }
      // One `algal.foundry.config.v1` file, as the foundry, search, and
      // schedule commands read it; paths resolve relative to the file.
      const loadConfig = async (configFile: string, searchMode: boolean) => {
        const config = asRecord(await readJson(configFile), "foundry config");
        const unknown = Object.keys(config).filter((k) => !["contract", "candidates", "generator", "cases", "search", "scorer", "budget"].includes(k));
        if (unknown.length > 0) {
          throw new AlgalError("PARSE_FAILED", `foundry config: unknown key "${unknown[0]}"`);
        }
        if (config.contract !== "algal.foundry.config.v1") {
          throw new AlgalError("PARSE_FAILED", "foundry config.contract must be algal.foundry.config.v1");
        }
        if (!searchMode && config.search !== undefined) {
          throw new AlgalError("PARSE_FAILED", "search settings require the foundry search command");
        }
        const budget = config.budget === undefined ? undefined : parseHabitatLimits(config.budget);
        const candidateEntries = config.candidates ?? [];
        if (!Array.isArray(candidateEntries)) {
          throw new AlgalError("PARSE_FAILED", "foundry config.candidates must be a list");
        }
        if (candidateEntries.length === 0 && config.generator === undefined) {
          throw new AlgalError("PARSE_FAILED", "foundry config needs candidates or a generator");
        }
        if (!Array.isArray(config.cases) || config.cases.length === 0) {
          throw new AlgalError("PARSE_FAILED", "foundry config.cases must be a non-empty list");
        }
        const base = dirname(configFile);
        const candidates = await Promise.all(candidateEntries.map(async (candidate, i) => {
          if (typeof candidate !== "string") {
            throw new AlgalError("PARSE_FAILED", `foundry config.candidates[${i}] must be a path`);
          }
          return await readManifest(resolve(base, candidate));
        }));
        let generator: { manifest: ReturnType<typeof parseOrganismManifest>; args: Record<string, JsonValue>; output: string; field?: string } | undefined;
        if (config.generator !== undefined) {
          const raw = asRecord(config.generator, "foundry config.generator");
          const extra = Object.keys(raw).filter((k) => !["manifest", "args", "output", "field"].includes(k));
          if (
            extra.length > 0 ||
            typeof raw.manifest !== "string" ||
            typeof raw.output !== "string" ||
            (raw.field !== undefined && typeof raw.field !== "string")
          ) {
            throw new AlgalError("PARSE_FAILED", "foundry config.generator needs manifest, args, and output");
          }
          if (raw.args === undefined) {
            throw new AlgalError("PARSE_FAILED", "foundry config.generator.args must be an object");
          }
          generator = {
            manifest: await readManifest(resolve(base, raw.manifest)),
            args: asRecord(raw.args, "foundry config.generator.args"),
            output: raw.output,
            ...(typeof raw.field === "string" ? { field: raw.field } : {}),
          };
        }
        const cases: FoundryCase[] = config.cases.map((raw, i) => {
          const c = asRecord(raw, `foundry config.cases[${i}]`);
          const extra = Object.keys(c).filter((k) => !["id", "split", "args", "expect"].includes(k));
          if (extra.length > 0) {
            throw new AlgalError("PARSE_FAILED", `foundry config.cases[${i}]: unknown key "${extra[0]}"`);
          }
          if (
            typeof c.id !== "string" ||
            (c.split !== "train" && c.split !== "validation" && c.split !== "holdout")
          ) {
            throw new AlgalError("PARSE_FAILED", `foundry config.cases[${i}] needs string id and train|validation|holdout split`);
          }
          if (c.args === undefined || c.expect === undefined) {
            throw new AlgalError("PARSE_FAILED", `foundry config.cases[${i}] needs args and expect objects`);
          }
          return {
            id: c.id,
            split: c.split,
            args: asRecord(c.args, `foundry config.cases[${i}].args`),
            expect: asRecord(c.expect, `foundry config.cases[${i}].expect`),
          };
        });
        let scorer: FoundryScorer | undefined;
        if (config.scorer !== undefined) {
          scorer = parseExprScorer(config.scorer, "foundry config.scorer");
        }
        let search: { generator: NonNullable<typeof generator>; maxGenerations: number; feedbackInput: string } | undefined;
        if (searchMode) {
          if (!generator || config.search === undefined) {
            throw new AlgalError("PARSE_FAILED", "search config needs generator and search objects");
          }
          const block = asRecord(config.search, "foundry config.search");
          const extra = Object.keys(block).filter((key) => !["maxGenerations", "feedbackInput"].includes(key));
          if (
            extra.length > 0 ||
            !Number.isInteger(block.maxGenerations) ||
            typeof block.feedbackInput !== "string"
          ) {
            throw new AlgalError("PARSE_FAILED", "foundry config.search needs maxGenerations and feedbackInput");
          }
          search = { generator, maxGenerations: block.maxGenerations as number, feedbackInput: block.feedbackInput };
        }
        return { candidates, generator, cases, scorer, budget, search };
      };
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const executorsFor = async () => {
        const executors = await resolveExecutors(flags, dir);
        return flags["cache-effects"] !== undefined
          ? executors.map((executor) => cachedExecutor(executor, store))
          : executors;
      };
      const transportsFor = async () => flags.transports !== undefined
        ? await loadTransports(String(flags.transports))
        : undefined;
      if (file === "schedule") {
        const schedulePath = positional[1];
        if (!schedulePath) usageError("algal foundry schedule <schedule.json> [--journal <dir>] [--out <record.json>]");
        const { openHabitatJournal, parseHabitatScheduleConfig, runHabitatSchedule } = await import("./src/habitat-schedule");
        const scheduleFile = resolve(schedulePath);
        const schedule = parseHabitatScheduleConfig(await readJson(scheduleFile));
        const activeExecutors = await executorsFor();
        const transports = await transportsFor();
        const tools = await resolveTools(flags, dir);
        const shared = {
          fns, store, executors: activeExecutors,
          ...(transports ? { transports } : {}),
          ...(tools ? { tools } : {}),
        };
        const activities = await Promise.all(schedule.activities.map(async (activity, i) => {
          const loaded = await loadConfig(resolve(dirname(scheduleFile), activity.config), activity.kind === "search");
          // One account covers the schedule; an activity brings none.
          if (loaded.budget !== undefined) {
            throw new AlgalError("PARSE_FAILED", `habitat schedule activity ${i}: a scheduled config draws on the schedule budget and cannot set its own`);
          }
          const scoring = loaded.scorer ? { scorer: loaded.scorer } : {};
          return {
            kind: activity.kind,
            run: async (account: HabitatLedger) => {
              const search = loaded.search;
              if (search) {
                return await runFoundrySearch({
                  ...shared, ...scoring, account,
                  generator: search.generator.manifest,
                  generatorArgs: search.generator.args,
                  feedbackInput: search.feedbackInput,
                  output: search.generator.output,
                  ...(search.generator.field ? { field: search.generator.field } : {}),
                  seeds: loaded.candidates,
                  cases: loaded.cases,
                  maxGenerations: search.maxGenerations,
                });
              }
              const generated = loaded.generator
                ? await generateFoundryCandidates({
                    ...shared, account,
                    generator: loaded.generator.manifest,
                    args: loaded.generator.args,
                    output: loaded.generator.output,
                    ...(loaded.generator.field ? { field: loaded.generator.field } : {}),
                  })
                : undefined;
              return await runFoundryWithin({
                ...shared, ...scoring, account,
                candidates: [...loaded.candidates, ...(generated?.candidates ?? [])],
                cases: loaded.cases,
                ...(generated ? { lineage: { generatorDigest: generated.generatorDigest, receiptDigest: generated.receiptDigest } } : {}),
              });
            },
          };
        }));
        if (flags.journal !== undefined && typeof flags.journal !== "string") usageError("--journal needs a directory");
        const journal = typeof flags.journal === "string"
          ? await openHabitatJournal(resolve(flags.journal), schedule.order, schedule.budget)
          : undefined;
        const { schedule: record } = await runHabitatSchedule({
          order: schedule.order, limits: schedule.budget, activities, store, ...(journal ? { journal } : {}),
        });
        if (flags.out !== undefined) {
          const { writeFile } = await import("node:fs/promises");
          await writeFile(resolve(String(flags.out)), canonicalize(record as unknown as JsonValue));
        }
        out(record as unknown as JsonObject);
        return record.outcome === "complete" ? 0 : 1;
      }
      const searchMode = file === "search";
      const configPath = searchMode ? positional[1] : file;
      if (!configPath) usageError("algal foundry search <config.json>");
      const { candidates, generator, cases, scorer, budget, search } = await loadConfig(resolve(configPath), searchMode);
      const activeExecutors = await executorsFor();
      const transports = await transportsFor();
      const tools = await resolveTools(flags, dir);
      if (search) {
        // One account admits every run of the search: each generation's
        // generator and candidates, then the final epoch.
        const searchAccount = budget ? new HabitatAccount("search", budget) : undefined;
        let report: SearchReport | HabitatBudget;
        try {
          report = await runFoundrySearch({
            generator: search.generator.manifest,
            generatorArgs: search.generator.args,
            feedbackInput: search.feedbackInput,
            output: search.generator.output,
            ...(search.generator.field ? { field: search.generator.field } : {}),
            seeds: candidates,
            cases,
            maxGenerations: search.maxGenerations,
            fns,
            store,
            executors: activeExecutors,
            ...(transports ? { transports } : {}),
            ...(tools ? { tools } : {}),
            ...(scorer ? { scorer } : {}),
            ...(searchAccount ? { account: searchAccount } : {}),
          });
        } catch (error) {
          if (!searchAccount?.exhausted) throw error;
          // Exhaustion is a terminal outcome, not a partial report: emit the
          // account record. Completed runs keep their stored receipts.
          report = searchAccount.record();
        }
        if (flags.out !== undefined) {
          const { writeFile } = await import("node:fs/promises");
          await writeFile(resolve(String(flags.out)), canonicalize(report as unknown as JsonValue));
        }
        out(report as unknown as JsonObject);
        return report.contract === HABITAT_BUDGET_CONTRACT ? 1 : 0;
      }
      // One account admits every run of this activity: the generator, each
      // selection case, then holdout.
      const account = budget ? new HabitatAccount("foundry", budget) : undefined;
      let report: FoundryReport | HabitatBudget;
      try {
        const generated = generator
          ? await generateFoundryCandidates({
              generator: generator.manifest,
              args: generator.args,
              output: generator.output,
              ...(generator.field ? { field: generator.field } : {}),
              fns,
              store,
              executors: activeExecutors,
              ...(transports ? { transports } : {}),
              ...(tools ? { tools } : {}),
              ...(account ? { account } : {}),
            })
          : undefined;
        if (generated) candidates.push(...generated.candidates);
        report = await runFoundry({
          candidates,
          cases,
          fns,
          store,
          executors: activeExecutors,
          ...(transports ? { transports } : {}),
          ...(tools ? { tools } : {}),
          ...(scorer ? { scorer } : {}),
          ...(generated ? {
            lineage: {
              generatorDigest: generated.generatorDigest,
              receiptDigest: generated.receiptDigest,
            },
          } : {}),
          ...(account ? { account } : {}),
        });
      } catch (error) {
        if (!account?.exhausted) throw error;
        // Exhaustion is a terminal outcome, not a partial report: emit the
        // account record. Completed runs keep their stored receipts.
        report = account.record();
      }
      if (flags.out !== undefined) {
        const { writeFile } = await import("node:fs/promises");
        await writeFile(resolve(String(flags.out)), canonicalize(report as unknown as JsonValue));
      }
      out(report as unknown as JsonObject);
      return report.contract === HABITAT_BUDGET_CONTRACT ? 1 : 0;
    }

    case "bench": {
      const file = positional[0];
      if (!file) {
        usageError("algal bench <config.json> | bench verify|inspect <report.json>");
      }
      const { runBenchmark } = await import("./src/bench");
      const { parseBenchAxes, parseBenchReport, verifyBenchReport } = await import("./src/bench-verify");
      const { cachedExecutor, commandExecutor, scriptedExecutor } = await import("./src/effects");
      const { parseExprScorer } = await import("./src/expr");
      if (file === "verify") {
        const reportFile = positional[1];
        if (!reportFile) usageError("algal bench verify <report.json> [--dir <path>]");
        const verified = await verifyBenchReport(
          await readJson(resolve(reportFile)),
          store,
          fns,
          await resolveTools(flags, dir),
        );
        out(verified as unknown as JsonObject);
        return verified.ok ? 0 : 1;
      }
      if (file === "inspect") {
        const reportFile = positional[1];
        if (!reportFile) usageError("algal bench inspect <report.json>");
        const report = parseBenchReport(await readJson(resolve(reportFile)));
        out({
          contract: report.contract,
          digest: report.digest,
          workload: report.workload,
          pareto: report.pareto,
          systems: report.systems.map((system) => ({
            id: system.id,
            manifestKey: system.manifestKey,
            manifestDigest: system.manifestDigest,
            passed: system.passed,
            total: system.total,
            effectCalls: system.effectCalls,
            work: system.work,
            usage: system.usage,
            attribution: system.attribution,
            pareto: report.pareto.includes(system.id),
          })),
        });
        return 0;
      }
      const configFile = resolve(file);
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const config = asRecord(await readJson(configFile), "bench config");
      const unknown = Object.keys(config).filter((k) => !["contract", "cases", "systems", "prices", "scorer", "axes"].includes(k));
      if (unknown.length > 0) {
        throw new AlgalError("PARSE_FAILED", `bench config: unknown key "${unknown[0]}"`);
      }
      if (config.contract !== "algal.bench.config.v1") {
        throw new AlgalError("PARSE_FAILED", "bench config.contract must be algal.bench.config.v1");
      }
      if (!Array.isArray(config.cases) || config.cases.length === 0) {
        throw new AlgalError("PARSE_FAILED", "bench config.cases must be a non-empty list");
      }
      if (!Array.isArray(config.systems) || config.systems.length === 0) {
        throw new AlgalError("PARSE_FAILED", "bench config.systems must be a non-empty list");
      }
      const base = dirname(configFile);
      const cases: BenchCase[] = config.cases.map((raw, i) => {
        const c = asRecord(raw, `bench config.cases[${i}]`);
        const extra = Object.keys(c).filter((k) => !["id", "args", "expect"].includes(k));
        if (extra.length > 0) {
          throw new AlgalError("PARSE_FAILED", `bench config.cases[${i}]: unknown key "${extra[0]}"`);
        }
        if (typeof c.id !== "string" || c.args === undefined || c.expect === undefined) {
          throw new AlgalError("PARSE_FAILED", `bench config.cases[${i}] needs id, args, and expect`);
        }
        return {
          id: c.id,
          args: asRecord(c.args, `bench config.cases[${i}].args`),
          expect: asRecord(c.expect, `bench config.cases[${i}].expect`),
        };
      });
      const benchIsolation = await commandIsolationFlags(flags);
      const resolveSpec = async (id: string, spec: string): Promise<Executor> => {
        if (spec.startsWith("gateway:")) {
          const { vercelGatewayExecutor } = await import("./src/gateway");
          return named(id, vercelGatewayExecutor({ model: spec.slice("gateway:".length) }));
        }
        const jev = await jevSpecExecutor(spec);
        if (jev !== undefined) return named(id, jev);
        const recall = await recallSpecExecutor(spec, dir);
        if (recall !== undefined) return named(id, recall);
        if (spec.startsWith("scripted:")) {
          const responses = asRecord(
            await readJson(resolve(base, spec.slice("scripted:".length))),
            `bench executor ${id}`,
          ) as Record<string, JsonValue>;
          return named(id, scriptedExecutor(responses, id));
        }
        if (spec.startsWith("cmd:")) {
          const specCommand = spec.slice("cmd:".length);
          const specExecutor = benchIsolation === undefined
            ? commandExecutor(specCommand)
            : (await import("./src/isolation")).isolatedCommandExecutor(specCommand, { isolation: benchIsolation });
          return named(id, specExecutor);
        }
        throw new AlgalError(
          "PARSE_FAILED",
          `bench executor "${id}": unknown spec (want gateway:<model>, jev[:<model>], recall[:<embedder>], scripted:<file>, or cmd:<command>)`,
        );
      };
      const systems: BenchSystem[] = [];
      for (const [i, raw] of config.systems.entries()) {
        const s = asRecord(raw, `bench config.systems[${i}]`);
        const extra = Object.keys(s).filter((k) => !["id", "manifest", "executors"].includes(k));
        if (extra.length > 0) {
          throw new AlgalError("PARSE_FAILED", `bench config.systems[${i}]: unknown key "${extra[0]}"`);
        }
        if (typeof s.id !== "string" || typeof s.manifest !== "string" || s.executors === undefined) {
          throw new AlgalError("PARSE_FAILED", `bench config.systems[${i}] needs id, manifest, and executors`);
        }
        const specs = asRecord(s.executors, `bench config.systems[${i}].executors`);
        const executors: Executor[] = [];
        for (const [name, spec] of Object.entries(specs)) {
          if (typeof spec !== "string" || spec.length === 0) {
            throw new AlgalError("PARSE_FAILED", `bench executor "${name}" must be a spec string`);
          }
          executors.push(await resolveSpec(name, spec));
        }
        systems.push({
          id: s.id,
          manifest: await readManifest(resolve(base, s.manifest)),
          executors,
        });
      }
      const transports =
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined;
      const tools = await resolveTools(flags, dir);
      const prices = parseBenchPrices(config.prices, "bench config.prices");
      const scorer = config.scorer === undefined
        ? undefined
        : parseExprScorer(config.scorer, "bench config.scorer");
      const axes = config.axes === undefined
        ? undefined
        : parseBenchAxes(config.axes, "bench config.axes");
      const report = await runBenchmark({
        systems: systems.map((system) => ({
          ...system,
          executors:
            flags["cache-effects"] !== undefined
              ? system.executors.map((e) => cachedExecutor(e, store))
              : system.executors,
        })),
        cases,
        fns,
        store,
        ...(transports ? { transports } : {}),
        ...(tools ? { tools } : {}),
        ...(prices ? { prices } : {}),
        ...(scorer ? { scorer } : {}),
        ...(axes ? { axes } : {}),
      });
      if (flags.out !== undefined) {
        const { writeFile } = await import("node:fs/promises");
        await writeFile(resolve(String(flags.out)), canonicalize(report as unknown as JsonValue));
      }
      out(report as unknown as JsonObject);
      return 0;
    }

    case "verify": {
      const [receiptFile, manifestFile] = positional;
      if (!receiptFile) {
        usageError("algal verify <receipt.json> [manifest.json]");
      }
      const { verifyReceipt } = await import("./src/verify");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const receipt = await readJson(resolve(receiptFile));
      let manifest: JsonValue;
      if (manifestFile !== undefined) {
        manifest = manifestToJson(await readManifest(resolve(manifestFile)));
      } else {
        const digest = (receipt as JsonObject).manifestDigest;
        if (typeof digest !== "string" || !digest.startsWith("sha256:")) {
          throw new AlgalError(
            "PARSE_FAILED",
            "receipt has no manifestDigest; pass the manifest explicitly",
          );
        }
        const stored = await store.getManifest(digest as `sha256:${string}`);
        if (!stored) {
          throw new AlgalError(
            "STORE_MISS",
            `manifest ${digest} not in store; pass it explicitly or use --modules`,
          );
        }
        manifest = manifestToJson(stored);
        diag(`resolved manifest ${digest} from store`);
      }
      const report = await verifyReceipt(
        receipt,
        manifest,
        store,
        fns,
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined,
        await resolveTools(flags, dir),
      );
      out(report as unknown as JsonObject);
      return report.ok ? 0 : 1;
    }

    case "resume": {
      const [receiptFile, manifestFile] = positional;
      if (!receiptFile) {
        usageError("algal resume <receipt.json> [manifest.json] [executor options]");
      }
      const { cachedExecutor } = await import("./src/effects");
      const { resumeRun } = await import("./src/verify");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const receipt = await readJson(resolve(receiptFile));
      let manifest: JsonValue;
      if (manifestFile !== undefined) {
        manifest = manifestToJson(await readManifest(resolve(manifestFile)));
      } else {
        const digest = (receipt as JsonObject).manifestDigest;
        if (typeof digest !== "string" || !digest.startsWith("sha256:")) {
          throw new AlgalError(
            "PARSE_FAILED",
            "receipt has no manifestDigest; pass the manifest explicitly",
          );
        }
        const stored = await store.getManifest(digest as `sha256:${string}`);
        if (!stored) {
          throw new AlgalError(
            "STORE_MISS",
            `manifest ${digest} not in store; pass it explicitly or use --modules`,
          );
        }
        manifest = manifestToJson(stored);
        diag(`resolved manifest ${digest} from store`);
      }
      const executors = await resolveExecutors(flags, dir);
      const transports =
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined;
      const tools = await resolveTools(flags, dir);
      const resumed = await resumeRun(
        receipt,
        manifest,
        store,
        flags["cache-effects"] !== undefined
          ? executors.map((e) => cachedExecutor(e, store))
          : executors,
        fns,
        transports,
        tools,
      );
      if (flags.write) {
        const rd = await store.putReceipt(resumed as unknown as JsonValue);
        diag(`receipt  ${rd}`);
      }
      out(resumed);
      return resumed.outcome === "complete" ? 0 : 1;
    }

    case "replay": {
      const [receiptFile] = positional;
      if (!receiptFile) {
        usageError("algal replay <receipt.json> --with <manifest.json> [--args <file>] [executor options]");
      }
      const withFile = artifactFlag(flags, "with");
      if (!withFile) usageError("algal replay requires --with <manifest.json>");
      const { replayComparison, replayComparisonToJson } = await import("./src/replay");
      const { cachedExecutor } = await import("./src/effects");
      const { RECEIPT_BOUNDS } = await import("./src/run");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const receipt = await readJsonBounded(resolve(receiptFile), RECEIPT_BOUNDS.maxBytes, "run receipt");
      const revision = await readJsonBounded(resolve(withFile), BOUNDS.maxManifestBytes, "revised manifest");
      const executors = await resolveExecutors(flags, dir);
      const result = await replayComparison({
        receipt,
        revision,
        ...(flags.args !== undefined
          ? { args: await readJsonBounded(resolve(String(flags.args)), BOUNDS.maxArgsBytes, "replay args") as Record<string, Record<string, JsonValue>> }
          : {}),
        store,
        fns,
        executors: flags["cache-effects"] !== undefined
          ? executors.map((e) => cachedExecutor(e, store))
          : executors,
        tools: await resolveTools(flags, dir),
        ...(flags.transports !== undefined
          ? { transports: await loadTransports(String(flags.transports)) }
          : {}),
      });
      if (flags.write && result.revised) {
        const rd = await store.putReceipt(result.revised as unknown as JsonValue);
        diag(`revised receipt  ${rd}`);
      }
      const comparison = replayComparisonToJson(result.comparison);
      const outFile = artifactFlag(flags, "out");
      if (outFile) {
        await writeFile(resolve(outFile), `${canonicalize(comparison)}\n`);
        diag(`comparison  ${outFile}`);
      }
      out(comparison);
      return result.comparison.verdict === "could-not-replay" ? 1 : 0;
    }

    case "ordering": {
      const [scenarioFile] = positional;
      if (!scenarioFile) {
        usageError("algal ordering <scenario.json> [--dir <path>] [--out <file>]");
      }
      const { exploreOrdering, ORDERING_BOUNDS } = await import("./src/ordering");
      const scenario = await readJsonBounded(
        resolve(scenarioFile), ORDERING_BOUNDS.maxScenarioBytes, "ordering scenario",
      );
      const result = await exploreOrdering(scenario, { store });
      const report = result.report as unknown as JsonObject;
      const outFile = artifactFlag(flags, "out");
      if (outFile) {
        await writeFile(resolve(outFile), `${canonicalize(report)}\n`);
        diag(`ordering report  ${outFile}`);
      }
      out(report);
      return result.report.outcome === "complete" ? 0 : 1;
    }

    case "diff": {
      const [aFile, bFile] = positional;
      if (!aFile || !bFile) {
        usageError("algal diff <receipt-a.json> <receipt-b.json>");
      }
      const { parseRunReceipt } = await import("./src/run");
      const { diffReceipts } = await import("./src/verify");
      const a = parseRunReceipt(await readJson(resolve(aFile)));
      const b = parseRunReceipt(await readJson(resolve(bFile)));
      const mismatches = diffReceipts(a, b);
      if (a.manifestDigest !== b.manifestDigest) {
        mismatches.unshift(
          `manifestDigest: ${a.manifestDigest} vs ${b.manifestDigest}`,
        );
      }
      out({
        same: mismatches.length === 0,
        a: a.digest,
        b: b.digest,
        mismatches,
      });
      return mismatches.length === 0 ? 0 : 1;
    }

    case "inspect": {
      const file = positional[0];
      if (!file) usageError("algal inspect <receipt.json>");
      const { parseRunReceipt } = await import("./src/run");
      const raw = parseRunReceipt(await readJson(resolve(file))) as unknown as JsonObject;
      const cells = (raw.cells ?? {}) as JsonObject;
      const summary: JsonObject = {
        contract: raw.contract ?? null,
        manifestKey: raw.manifestKey ?? null,
        outcome: raw.outcome ?? null,
        work: raw.work ?? null,
        cells: Object.fromEntries(
          Object.entries(cells).map(([k, v]) => {
            const c = v as JsonObject;
            const entry: JsonObject = { status: c.status ?? null };
            if (typeof c.work === "number" && c.work > 0) entry.work = c.work;
            if (c.failure !== undefined) entry.failure = c.failure;
            if (c.shadowOut !== undefined) entry.shadowOut = c.shadowOut;
            if (c.rounds !== undefined) entry.rounds = c.rounds;
            if (c.items !== undefined) entry.items = c.items;
            if (c.via !== undefined) entry.via = c.via;
            if (c.slot !== undefined) entry.slot = c.slot;
            const tc = c.toolCalls;
            if (Array.isArray(tc) && tc.length) entry.toolCalls = tc.length;
            if (c.effectDigest !== undefined) entry.effectDigest = c.effectDigest;
            return [k, entry];
          }),
        ),
        effects: ((raw.effects as JsonValue[]) ?? []).length,
        failure: raw.failure ?? null,
        digest: raw.digest ?? null,
      };
      out(summary);
      return 0;
    }

    case "observe":
    case "tail": {
      if (positional.length !== 0)
        usageError(
          "algal observe|tail [--dir <path>] [--max-items <n>] [--follow [--interval-ms <ms>] [--max-polls <n>] [--max-events <n>]]",
        );
      const { observeStore, followStore, OBSERVE_BOUNDS } = await import("./src/observe");
      for (const key of Object.keys(flags))
        if (!["dir", "follow", "max-items", "interval-ms", "max-polls", "max-events"].includes(key))
          usageError(`unknown observe option --${key}`);
      if (flags.follow !== undefined && flags.follow !== true)
        usageError("--follow is a boolean flag without a value");
      const follow = cmd === "tail" || flags.follow === true;
      const observeInt = (key: string, max: number): number | undefined => {
        const value = artifactFlag(flags, key);
        if (value === undefined) return undefined;
        const n = Number(value);
        if (!Number.isSafeInteger(n) || n < 1 || n > max)
          usageError(`--${key} must be an integer in 1..${max}`);
        return n;
      };
      const maxItems = observeInt("max-items", OBSERVE_BOUNDS.maxItems);
      if (!follow) {
        for (const key of ["interval-ms", "max-polls", "max-events"])
          if (flags[key] !== undefined) usageError(`--${key} requires --follow`);
        out(await observeStore(dir, maxItems === undefined ? {} : { maxItems }) as unknown as JsonValue);
        return 0;
      }
      const intervalMs = observeInt("interval-ms", OBSERVE_BOUNDS.maxIntervalMs);
      const maxPolls = observeInt("max-polls", OBSERVE_BOUNDS.maxPolls);
      const maxEvents = observeInt("max-events", OBSERVE_BOUNDS.maxEvents);
      const controller = new AbortController();
      const stop = () => controller.abort();
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
      try {
        await followStore(dir, (event) => out(event as unknown as JsonValue), {
          ...(maxItems === undefined ? {} : { maxItems }),
          ...(intervalMs === undefined ? {} : { intervalMs }),
          ...(maxPolls === undefined ? {} : { maxPolls }),
          ...(maxEvents === undefined ? {} : { maxEvents }),
          signal: controller.signal,
        });
      } finally {
        process.removeListener("SIGINT", stop);
        process.removeListener("SIGTERM", stop);
      }
      return 0;
    }

    case "runs": {
      const { readdir } = await import("node:fs/promises");
      let files: string[] = [];
      try {
        files = (await readdir(join(dir, "runs"))).filter((f) =>
          f.endsWith(".json"),
        );
      } catch { /* no runs directory yet */ }
      const rows: JsonObject[] = [];
      for (const f of files.sort()) {
        const digest = `sha256:${f.replace(/\.json$/, "")}`;
        try {
          const raw = (await readJson(join(dir, "runs", f))) as JsonObject;
          rows.push({
            digest,
            manifestKey: raw.manifestKey ?? null,
            outcome: raw.outcome ?? null,
            effects: Array.isArray(raw.effects) ? raw.effects.length : 0,
          });
        } catch (e) {
          rows.push({ digest, error: errorReport(e).message });
        }
      }
      rows.sort((a, b) =>
        `${a.manifestKey ?? ""}${a.digest}`.localeCompare(
          `${b.manifestKey ?? ""}${b.digest}`,
        ),
      );
      out({ dir: join(dir, "runs"), runs: rows });
      return 0;
    }

    case "slots": {
      const { readdir } = await import("node:fs/promises");
      let files: string[] = [];
      try {
        files = (await readdir(join(dir, "slots"))).filter((f) =>
          f.endsWith(".json"),
        );
      } catch { /* no slots directory yet */ }
      const rows: JsonObject[] = [];
      for (const f of files.sort()) {
        const name = f.replace(/\.json$/, "");
        try {
          const value = await readJson(join(dir, "slots", f));
          rows.push({ name, value });
        } catch (e) {
          rows.push({ name, error: errorReport(e).message });
        }
      }
      out({ dir: join(dir, "slots"), slots: rows });
      return 0;
    }

    case "manifests": {
      const { readdir } = await import("node:fs/promises");
      let files: string[] = [];
      try {
        files = (await readdir(join(dir, "manifests"))).filter((f) =>
          f.endsWith(".json"),
        );
      } catch { /* no manifests directory yet */ }
      const rows: JsonObject[] = [];
      for (const f of files.sort()) {
        const digest = `sha256:${f.replace(/\.json$/, "")}`;
        try {
          const raw = (await readJson(join(dir, "manifests", f))) as JsonObject;
          rows.push({
            digest,
            key: raw.key ?? null,
            name: raw.name ?? null,
            cells: Array.isArray(raw.cells) ? raw.cells.length : 0,
          });
        } catch (e) {
          rows.push({ digest, error: errorReport(e).message });
        }
      }
      rows.sort((a, b) =>
        `${a.key ?? ""}${a.digest}`.localeCompare(
          `${b.key ?? ""}${b.digest}`,
        ),
      );
      out({ dir: join(dir, "manifests"), manifests: rows });
      return 0;
    }

    case "manifest": {
      const digest = positional[0];
      if (!digest) {
        return usageError("algal manifest <sha256:…> [--dir <path>]");
      }
      const m = await store.getManifest(digest as `sha256:${string}`);
      if (!m) {
        return usageError(`manifest ${digest} not found in ${dir}`);
      }
      out(manifestToJson(m));
      return 0;
    }
    case "slot": {
      const [sub, name, valueFile] = positional;
      if (sub === "get") {
        if (!name) usageError("algal slot get <name>");
        const v = await store.getSlot(name);
        if (v === undefined) {
          throw new AlgalError("STORE_MISS", `slot "${name}" is empty`);
        }
        out(v as JsonObject);
        return 0;
      }
      if (sub === "set") {
        if (!name || !valueFile) {
          usageError("algal slot set <name> <value.json>");
        }
        const v = await readJson(resolve(valueFile));
        const bytes = canonicalBytes(v);
        if (bytes > BOUNDS.maxBlobBytes) {
          throw new AlgalError(
            "BUDGET_EXHAUSTED",
            `slot value ${bytes}B exceeds maxBlobBytes ${BOUNDS.maxBlobBytes}B`,
          );
        }
        await store.setSlot(name, v);
        out({ name, set: true });
        return 0;
      }
      return usageError(
        "algal slot get <name> | slot set <name> <value.json>",
      );
    }

    case "job": {
      const [sub, target] = positional;
      if (!target) usageError("algal job prepare|prepare-operation <config.json> | run|inspect|reconcile <job-digest>");
      const { CodingJobService } = await import("./src/coding-jobs");
      const jobs = new CodingJobService(dir);
      if (sub === "prepare") {
        const config = await readJsonBounded(resolve(target), 131_072, "coding job config");
        out(await jobs.prepare(config as unknown as CodingJobOptions) as unknown as JsonValue);
      } else if (sub === "prepare-operation") {
        const config = await readJsonBounded(resolve(target), 131_072, "coding operation config");
        out(await jobs.prepareOperation(config as unknown as CodingJobOperationOptions) as unknown as JsonValue);
      } else if (sub === "inspect") out(await jobs.inspect(asDigest(target, "job digest")) as unknown as JsonValue);
      else if (sub === "run" || sub === "reconcile") {
        const controller = new AbortController();
        const stop = () => controller.abort();
        process.once("SIGINT", stop); process.once("SIGTERM", stop);
        try {
          const jobId = asDigest(target, "job digest");
          const result = sub === "run"
            ? await jobs.run(jobId, {signal: controller.signal})
            : await jobs.reconcile(jobId, {signal: controller.signal});
          out(result as unknown as JsonValue);
          return result.status === "completed" ? 0 : 1;
        } finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); }
      } else usageError("algal job prepare|prepare-operation|run|inspect|reconcile");
      return 0;
    }

    case "repair": {
      const [sub, name] = positional;
      if (!name) usageError("algal repair start|tick|inspect|verify <name>");
      const { RepairWorkflow } = await import("./src/repair");
      const repair = new RepairWorkflow(dir);
      if (sub === "start") {
        if (typeof flags.job !== "string" || typeof flags.checks !== "string") usageError("repair start requires --job <digest> --checks <checks.json>");
        const checks = await readJsonBounded(resolve(flags.checks), 65_536, "repair checks");
        out(await repair.start(name, asDigest(flags.job, "job digest"), checks as unknown as RepairCheck[]) as unknown as JsonValue);
      } else if (sub === "tick") {
        const report = await repair.tick(name);
        const { CodingJobService } = await import("./src/coding-jobs");
        const uncertainJob = report.process.process.status === "suspended" &&
          (await new CodingJobService(dir).inspect(report.config.jobId)).status === "uncertain";
        out(report as unknown as JsonValue);
        return uncertainJob || report.result?.action === "rejected" || ["failed", "uncertain", "stuck"].includes(report.process.process.status) ? 1 : 0;
      } else if (sub === "inspect") out(await repair.inspect(name) as unknown as JsonValue);
      else if (sub === "verify") out(await repair.verify(name) as unknown as JsonValue);
      else usageError("algal repair start|tick|inspect|verify <name>");
      return 0;
    }

    case "shepherd": {
      const [sub, name] = positional;
      if (!name) usageError("algal shepherd start|tick|watch|inspect|wake|verify|recover <name>");
      const { githubCliTransport } = await import("./src/github-cli");
      const { PullRequestShepherd } = await import("./src/shepherd");
      const shepherd = new PullRequestShepherd(dir, githubCliTransport({executable: String(flags.gh ?? "gh")}));
      if (sub === "start") {
        if (typeof flags.repo !== "string" || flags.pr === undefined) usageError("algal shepherd start <name> --repo owner/repo --pr NUMBER");
        out(await shepherd.start({name, repository: flags.repo, pullNumber: Number(flags.pr), intervalMs: Number(flags["interval-ms"] ?? 30_000), maxPolls: Number(flags["max-polls"] ?? 16),
          requiredChecks: flags["required-checks"] === undefined ? [] : String(flags["required-checks"]).split(",").map(name => ({name}))}) as unknown as JsonValue);
      } else if (sub === "tick") out(await shepherd.tick(name) as unknown as JsonValue);
      else if (sub === "inspect") out(await shepherd.inspect(name) as unknown as JsonValue);
      else if (sub === "watch") {
        const controller = new AbortController();
        const stop = () => controller.abort();
        process.once("SIGINT", stop); process.once("SIGTERM", stop);
        try {out(await shepherd.watch(name, {maxPasses: Number(flags["max-passes"] ?? 64), maxDurationMs: Number(flags["max-duration-ms"] ?? 60_000), signal: controller.signal}) as unknown as JsonValue);}
        finally {process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);}
      }
      else if (sub === "verify") out(await shepherd.verify(name));
      else if (sub === "wake") {
        if (typeof flags.delivery !== "string") usageError("shepherd wake requires --delivery stable-event-id");
        out(await shepherd.wake(name, flags.delivery));
      } else if (sub === "recover") {
        if (typeof flags["expected-intent"] !== "string") usageError("shepherd recover requires --expected-intent SHA");
        out(await shepherd.recover(name, asDigest(flags["expected-intent"], "--expected-intent")) as unknown as JsonValue);
      } else usageError("algal shepherd start|tick|watch|inspect|wake|verify|recover <name>");
      return 0;
    }

    case "process": {
      const sub = positional[0];
      const name = positional[1];
      const { cachedExecutor } = await import("./src/effects");
      const { ProcessSupervisor, PROCESS_BOUNDS } = await import("./src/process");
      if (sub === "export") {
        if (positional.length !== 2 || !name || Object.keys(flags).some(key => key !== "dir" && key !== "tools"))
          usageError("algal process export <name> [--dir <path>] [--tools <file>]");
        artifactFlag(flags, "dir");
        const { exportProcessEvidence } = await import("./src/process-evidence");
        const supervisor = new ProcessSupervisor(dir, {tools: await evidenceTools(artifactFlag(flags, "tools"), dir)});
        const evidence = await exportProcessEvidence(await supervisor.inspect(name), supervisor.store, supervisor.evidenceTools());
        // The complete exported file, including framing, must fit the reader bound.
        process.stdout.write(canonicalize(evidence as unknown as JsonValue));
        return 0;
      }
      if (flags.modules !== undefined) await loadModules(String(flags.modules), store);
      const tools = await resolveTools(flags, dir);
      const executors = sub === "tick" || sub === "schedule" || sub === "recover" || sub === "replay" ? await resolveExecutors(flags, dir) : [];
      const transports = flags.transports === undefined ? undefined : await loadTransports(String(flags.transports));
      const supervisor = new ProcessSupervisor(dir, {
        fns, tools,
        executors: flags["cache-effects"] !== undefined
          ? executors.map((executor) => cachedExecutor(executor, store))
          : executors,
        ...(transports ? { transports } : {}),
        ...(flags.journal === undefined ? {} : {journal: {maxRecoveries: asInt(Number(flags["max-recoveries"] ?? 2), "--max-recoveries", 1, 8)}}),
      });
      if (sub === "list") { out({ processes: await supervisor.list() } as unknown as JsonValue); return 0; }
      if (sub === "schedule") {
        out(await supervisor.schedule(flags["max-ticks"] === undefined ? 16 : Number(flags["max-ticks"])) as unknown as JsonValue);
        return 0;
      }
      if (!name) usageError("algal process create|inspect|tick|verify|replay <name>");
      if (sub === "create") {
        const file = positional[2]; if (!file) usageError("algal process create <name> <manifest.json>");
        const manifest = await readManifest(resolve(file));
        const args = flags.args === undefined ? {} : await readJsonBounded(resolve(String(flags.args)), PROCESS_BOUNDS.maxArgsBytes, "process args");
        out(await supervisor.create(name, manifest, args, flags["max-generations"] === undefined ? 16 : Number(flags["max-generations"])) as unknown as JsonValue);
      } else if (sub === "inspect") out(await supervisor.inspect(name) as unknown as JsonValue);
      else if (sub === "tick") {
        const next = await supervisor.tick(name);
        out(next as unknown as JsonValue);
        return next?.process.status === "failed" || next?.process.status === "stuck" ? 1 : 0;
      } else if (sub === "recover") {
        if (typeof flags["expected-intent"] !== "string") usageError("process recover requires --expected-intent SHA");
        const next = await supervisor.recover(name, asDigest(flags["expected-intent"], "--expected-intent"));
        out(next as unknown as JsonValue);
        return next.process.status === "failed" || next.process.status === "stuck" ? 1 : 0;
      } else if (sub === "journal") out(await supervisor.journal(name));
      else if (sub === "verify") out(await supervisor.verify(name));
      else if (sub === "replay") {
        const withFile = artifactFlag(flags, "with");
        if (!withFile) usageError("algal process replay <name> --with <manifest.json>");
        const { replayComparison, replayComparisonToJson } = await import("./src/replay");
        const snapshot = await supervisor.inspect(name);
        if (!snapshot.process.receipt) {
          usageError(`process "${name}" has no recorded run to replay`);
        }
        const head = await store.getReceipt(snapshot.process.receipt);
        if (!head) {
          throw new AlgalError("STORE_MISS", `process receipt ${snapshot.process.receipt} missing`);
        }
        const result = await replayComparison({
          receipt: head,
          revision: await readJsonBounded(resolve(withFile), BOUNDS.maxManifestBytes, "revised manifest"),
          ...(flags.args !== undefined
            ? { args: await readJsonBounded(resolve(String(flags.args)), BOUNDS.maxArgsBytes, "replay args") as Record<string, Record<string, JsonValue>> }
            : {}),
          store,
          fns,
          executors,
          tools,
          ...(transports ? { transports } : {}),
        });
        const comparison = replayComparisonToJson(result.comparison);
        const outFile = artifactFlag(flags, "out");
        if (outFile) {
          await writeFile(resolve(outFile), `${canonicalize(comparison)}\n`);
          diag(`comparison  ${outFile}`);
        }
        out(comparison);
        return result.comparison.verdict === "could-not-replay" ? 1 : 0;
      }
      else usageError("algal process create|list|inspect|tick|schedule|recover|journal|verify|replay|export|verify-evidence");
      return 0;
    }

    case "mailbox": {
      const { parseCapabilityHandle } = await import("./src/capabilities");
      const { externalWakeKey, FileMailboxService, MAILBOX_BOUNDS } = await import("./src/mailbox");
      const service = new FileMailboxService(dir);
      const [sub, target, valueFile] = positional;
      if (sub === "create") {
        if (!target) usageError("algal mailbox create <name>");
        const maxMessages = asInt(
          Number(flags["max-messages"] ?? 64),
          "--max-messages",
          1,
          MAILBOX_BOUNDS.maxMessages,
        );
        const maxMessageBytes = asInt(
          Number(flags["max-message-bytes"] ?? 65_536),
          "--max-message-bytes",
          1,
          MAILBOX_BOUNDS.maxMessageBytes,
        );
        out(await service.create(target, { maxMessages, maxMessageBytes }));
        return 0;
      }
      if (sub === "list") {
        out({ dir: join(dir, "mailboxes"), mailboxes: await service.list() });
        return 0;
      }
      if (sub === "send") {
        if (!target || !valueFile) {
          usageError("algal mailbox send <send-cap> <value.json>");
        }
        const handle = parseCapabilityHandle(target, "mailbox-send").handle;
        out(await service.send(
          handle,
          await readJsonBounded(resolve(valueFile), 1_048_576, "mailbox message file"),
          flags["idempotency-key"] === undefined
            ? externalWakeKey()
            : asDigest(String(flags["idempotency-key"]), "--idempotency-key"),
        ));
        return 0;
      }
      if (sub === "receive") {
        if (!target) usageError("algal mailbox receive <receive-cap>");
        const handle = parseCapabilityHandle(target, "mailbox-receive").handle;
        out(await service.receive(handle));
        return 0;
      }
      if (sub === "revoke") {
        if (!target) usageError("algal mailbox revoke <cap>");
        await service.revoke(parseCapabilityHandle(target).handle);
        out({ handle: target, revoked: true });
        return 0;
      }
      return usageError(
        "algal mailbox create|list|send|receive|revoke",
      );
    }

    case "suite": {
      // Self-check: run every bundled example with its scripted responses
      // and default args, then verify each receipt offline.
      const { readdir } = await import("node:fs/promises");
      const { cachedExecutor, scriptedExecutor } = await import("./src/effects");
      const { runOrganism } = await import("./src/run");
      const { verifyReceipt } = await import("./src/verify");
      const examplesDir = flags.examples === undefined ? EXAMPLES_DIR : resolve(String(flags.examples));
      const files = (await readdir(examplesDir)).filter((f) =>
        /\.algal\.json$/.test(f),
      );
      if (!files.length || files.length > 256) throw new AlgalError("BUDGET_EXHAUSTED", "suite requires between 1 and 256 examples");
      const results: JsonObject[] = [];
      let allOk = true;
      // preload every example into the store so organism cells resolve
      // regardless of iteration order
      const parsed = new Map<string, { raw: JsonValue; manifest: ReturnType<typeof parseOrganismManifest> }>();
      for (const f of files.sort()) {
        const id = f.replace(/\.algal\.json$/, "");
        const raw = await readJson(join(examplesDir, f));
        const manifest = parseOrganismManifest(raw);
        await store.putManifest(manifest);
        parsed.set(id, { raw, manifest });
      }
      for (const [id, { raw: manifestRaw, manifest }] of parsed) {
        let responses: Record<string, JsonValue> = {};
        const responseValue = await readOptionalJson(join(examplesDir, `${id}.responses.json`));
        if (responseValue !== undefined) responses = asRecord(responseValue, "responses");
        const args: Record<string, Record<string, JsonValue>> = {};
        const argsValue = await readOptionalJson(join(examplesDir, `${id}.args.json`));
        if (argsValue !== undefined) {
          const raw = asRecord(argsValue, "args");
          for (const [k, v] of Object.entries(raw)) {
            args[k] = asRecord(v, `args.${k}`) as Record<string, JsonValue>;
          }
        }
        let transports: Record<string, Transport> | undefined;
        try {
          await readFile(join(examplesDir, `${id}.transports.json`), "utf8");
          // bundled transport targets are written relative to the examples
          // directory's parent (the checkout root), as the native suite reads them
          transports = await loadTransports(
            join(examplesDir, `${id}.transports.json`),
            dirname(examplesDir),
          );
        } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
        const receipt = await runOrganism({
          manifest,
          args,
          fns,
          store,
          executors: [scriptedExecutor(responses)],
          ...(transports ? { transports } : {}),
        });
        const report = await verifyReceipt(
          receipt as unknown as JsonValue,
          manifestRaw,
          store,
          fns,
          transports,
        );
        const ok = receipt.outcome === "complete" && report.ok;
        allOk = allOk && ok;
        const result: JsonObject = {
          example: id,
          outcome: receipt.outcome,
          verifyOk: report.ok,
          receiptDigest: receipt.digest,
        };
        // a `<id>.cache.json` marker asks for a second run through
        // cachedExecutor: the first run's recorded effects are seeded into
        // the memo index, the rerun must serve them (cached: true), and the
        // memoized run must still verify bit-for-bit
        let cacheMarker = false;
        try { await readFile(join(examplesDir, `${id}.cache.json`), "utf8"); cacheMarker = true; }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
        if (cacheMarker) {
          for (const e of receipt.effects) {
            if (e.output !== undefined) await store.putEffect(e, scriptedExecutor(responses).cacheIdentity);
          }
          const receipt2 = await runOrganism({
            manifest,
            args,
            fns,
            store,
            executors: [cachedExecutor(scriptedExecutor(responses), store)],
            ...(transports ? { transports } : {}),
          });
          const report2 = await verifyReceipt(
            receipt2 as unknown as JsonValue,
            manifestRaw,
            store,
            fns,
            transports,
          );
          const hits = receipt2.effects.filter((e) => e.cached === true);
          const cacheOk =
            receipt2.outcome === "complete" && report2.ok && hits.length > 0;
          result.cacheOk = cacheOk;
          result.cacheHits = hits.length;
          allOk = allOk && cacheOk;
        }
        results.push(result);
      }
      out({ suite: "examples", ok: allOk, results });
      return allOk ? 0 : 1;
    }

    case "index": {
      // rebuild the derived semantic index over the store + optional docs
      const dir = typeof flags.dir === "string" ? flags.dir : ".algal";
      const { resolveEmbedder } = await import("./src/embeddings");
      const { indexStore } = await import("./src/semantic");
      const embedder = resolveEmbedder(
        typeof flags.embedder === "string" ? flags.embedder : undefined,
      );
      const report = await indexStore(dir, embedder, {
        ...(typeof flags.docs === "string" ? { docs: flags.docs } : {}),
      });
      out({ ok: true, ...report } as unknown as JsonObject);
      return 0;
    }

    case "search": {
      const query = positional.join(" ");
      if (query.length === 0) usageError("algal search <query>");
      const dir = typeof flags.dir === "string" ? flags.dir : ".algal";
      const { resolveEmbedder } = await import("./src/embeddings");
      const { searchIndex, snippet } = await import("./src/semantic");
      const embedder = resolveEmbedder(
        typeof flags.embedder === "string" ? flags.embedder : undefined,
      );
      const k =
        flags.k === undefined
          ? 8
          : Number.parseInt(String(flags.k), 10);
      const hits = await searchIndex(dir, embedder, query, k);
      out({
        query,
        hits: hits.map((h) => ({
          score: h.score,
          source: h.source,
          seq: h.seq,
          snippet: snippet(h.text),
        })),
      } as unknown as JsonObject);
      return hits.length > 0 ? 0 : 1;
    }

    case "db": {
      // Derived program index: `program.db` under --dir is host tooling —
      // rebuildable from the store at any time, never contract data.
      const sub = positional[0];
      if (sub === undefined) {
        usageError("algal db <build|status|tables|query|<projection>>");
      }
      const {
        buildProgramIndex,
        programIndexStatus,
        runProgramProjection,
        runProgramQuery,
        PROGRAM_DB_TABLES,
        PROGRAM_PROJECTIONS,
      } = await import("./src/program-db");
      for (const key of Object.keys(flags)) {
        if (!["dir", "limit"].includes(key)) usageError(`unknown db option --${key}`);
      }
      if (sub === "build") {
        if (positional.length !== 1 || flags.limit !== undefined) {
          usageError("algal db build [--dir <path>]");
        }
        out((await buildProgramIndex(dir)) as unknown as JsonObject);
        return 0;
      }
      if (sub === "status") {
        if (positional.length !== 1 || flags.limit !== undefined) {
          usageError("algal db status [--dir <path>]");
        }
        const status = await programIndexStatus(dir);
        out(status as unknown as JsonObject);
        return status.stale ? 1 : 0;
      }
      if (sub === "tables") {
        if (positional.length !== 1 || flags.limit !== undefined) {
          usageError("algal db tables");
        }
        out({
          ok: true,
          tables: Object.entries(PROGRAM_DB_TABLES).map(([name, t]) => ({
            table: name, columns: t.columns, description: t.description,
          })),
          projections: Object.entries(PROGRAM_PROJECTIONS).map(([name, p]) => ({
            projection: name, args: p.args, description: p.description,
          })),
        } as unknown as JsonObject);
        return 0;
      }
      const limit = flags.limit === undefined ? undefined
        : asInt(Number(String(flags.limit)), "--limit", 1, 1024);
      if (sub === "query") {
        const arg = positional[1];
        if (arg === undefined || positional.length !== 2) {
          usageError("algal db query <json|@file> [--dir <path>]");
        }
        const raw = arg.startsWith("@")
          ? await readJsonBounded(resolve(arg.slice(1)), 65_536, "program query")
          : (JSON.parse(arg) as unknown);
        out(
          runProgramQuery(dir, raw, {
            ...(limit !== undefined ? { limits: { maxRows: limit } } : {}),
          }) as unknown as JsonObject,
        );
        return 0;
      }
      out(
        runProgramProjection(dir, sub, positional.slice(1), {
          ...(limit !== undefined ? { limit } : {}),
        }) as unknown as JsonObject,
      );
      return 0;
    }

    case "auth": {
      const provider = positional[0];
      if (provider !== "jev") usageError("algal auth <jev> [--status|--forget|--stdin|--clipboard]");
      const { credentialStatus, forgetCredential, providerSpec, storeCredential } = await import("./src/credentials");
      if (flags.status !== undefined) {
        out((await credentialStatus(provider)) as unknown as JsonObject);
        return 0;
      }
      if (flags.forget !== undefined) {
        const { removed } = await forgetCredential(provider);
        out({ provider, removed } as unknown as JsonObject);
        return removed.length > 0 ? 0 : 1;
      }
      const spec = providerSpec(provider);
      let key: string;
      if (flags.clipboard !== undefined) {
        key = await readClipboard();
        if (key.length === 0) {
          throw new AlgalError("IO_FAILED", "clipboard is empty or unavailable");
        }
      } else {
        key = await readSecretLine(
          `paste your TypeSafe Jev key (env ${spec.env} also works): `,
        );
      }
      const stored = await storeCredential(provider, key);
      if (stored.source === "file") {
        diag(`warning: no OS vault was available; the key is stored as plaintext (mode 0600) at ${stored.location}`);
      }
      out({
        ok: true,
        provider,
        stored: stored.source,
        location: stored.location,
        hint: `…${key.slice(-4)}`,
      } as unknown as JsonObject);
      return 0;
    }

    case "doctor": {
      if (flags.jev !== undefined) {
        const { credentialResolver, credentialStatus, providerSpec } = await import("./src/credentials");
        const { jevAsker } = await import("./src/jev");
        const status = await credentialStatus("jev");
        const report: JsonObject = {
          provider: "jev",
          credential: status as unknown as JsonValue,
        };
        if (!status.configured) {
          report.available = false;
          report.error = `credential not configured — run \`algal auth jev\` or set ${providerSpec("jev").env}`;
          out(report);
          return 1;
        }
        try {
          const asker = jevAsker({ credential: credentialResolver("jev") });
          const res = await asker.ask(
            { check: "algal doctor connectivity probe" },
            { probe: { type: "noul", instructions: "Is this a connectivity check?" } },
          );
          report.available = true;
          const probe = res.answers.probe;
          if (probe !== undefined && "noul" in probe) report.noul = probe.noul;
          if (res.usage !== undefined) report.usage = res.usage as unknown as JsonValue;
          out(report);
          return 0;
        } catch (e) {
          const rep = errorReport(e);
          report.available = false;
          report.error = `${rep.code}: ${rep.message}`;
          out(report);
          return 1;
        }
      }
      out({
        runtime: "algal",
        version: PACKAGE_VERSION,
        native: false,
        platform: process.platform,
        wireContract: "algal.organism.v1",
      });
      return 0;
    }

    default:
      process.stderr.write(`unknown command "${cmd}"; see algal --help\n`);
      return 2;
  }
}

/** Read one line of secret input without echoing it: raw-mode TTY when
 * interactive, piped stdin when not. Never prints what it read. */
async function readSecretLine(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const text = await Bun.stdin.text();
    return text.trim();
  }
  process.stderr.write(prompt);
  const stdin = process.stdin as NodeJS.ReadStream & {
    setRawMode?: (mode: boolean) => void;
  };
  const canHide = typeof stdin.setRawMode === "function";
  if (canHide) stdin.setRawMode!(true);
  stdin.resume();
  try {
    return await new Promise<string>((resolveP) => {
      let buf = "";
      stdin.on("data", (chunk: Buffer) => {
        for (const b of chunk) {
          if (b === 3) process.exit(130);
          if (b === 10 || b === 13) {
            resolveP(buf.trim());
            return;
          }
          if (b === 127 || b === 8) {
            buf = buf.slice(0, -1);
            continue;
          }
          buf += String.fromCharCode(b);
        }
      });
    });
  } finally {
    if (canHide) stdin.setRawMode!(false);
    process.stderr.write("\n");
  }
}

/** Best-effort clipboard read across platforms; "" when unavailable. */
async function readClipboard(): Promise<string> {
  const candidates: string[][] =
    process.platform === "darwin"
      ? [["pbpaste"]]
      : process.platform === "win32"
        ? [["powershell", "-NoProfile", "-NonInteractive", "-Command", "Get-Clipboard"]]
        : [["wl-paste", "-n"], ["xclip", "-o", "-selection", "clipboard"], ["xsel", "-b", "-o"]];
  for (const argv of candidates) {
    try {
      const proc = Bun.spawn(argv, { stdout: "pipe", stderr: "ignore" });
      const text = await new Response(proc.stdout).text();
      const code = await proc.exited;
      if (code === 0 && text.trim().length > 0) return text.trim();
    } catch { /* tool absent */ }
  }
  return "";
}

function asRecord(v: JsonValue, what: string): Record<string, JsonValue> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    throw new AlgalError("PARSE_FAILED", `${what} must be a JSON object`);
  }
  return v as Record<string, JsonValue>;
}

function parseBenchPrices(
  raw: JsonValue | undefined,
  at: string,
): Record<string, BenchPrice> | undefined {
  if (raw === undefined) return undefined;
  const map = asRecord(raw, at);
  const prices: Record<string, BenchPrice> = {};
  for (const [key, value] of Object.entries(map)) {
    if (key.length === 0 || key.length > 256) {
      throw new AlgalError("PARSE_FAILED", `${at} has an invalid price key`);
    }
    const p = asRecord(value, `${at}.${key}`);
    const extra = Object.keys(p).filter((k) => !["input", "output"].includes(k));
    if (extra.length > 0) {
      throw new AlgalError("PARSE_FAILED", `${at}.${key}: unknown key "${extra[0]}"`);
    }
    if (typeof p.input !== "number" || p.input < 0 || !Number.isFinite(p.input)) {
      throw new AlgalError("PARSE_FAILED", `${at}.${key}.input must be a non-negative number`);
    }
    if (typeof p.output !== "number" || p.output < 0 || !Number.isFinite(p.output)) {
      throw new AlgalError("PARSE_FAILED", `${at}.${key}.output must be a non-negative number`);
    }
    prices[key] = { input: p.input, output: p.output };
  }
  return prices;
}

function usageError(msg: string): never {
  throw new AlgalError("PARSE_FAILED", `usage: ${msg}`);
}

main()
  .then((code) => process.exit(code))
  .catch(async (e) => {
    const rep = errorReport(e);
    const { SourceError } = await import("./src/source");
    if (e instanceof SourceError) {
      const { createSourceErrorReport, renderSourceError } = await import("./src/source-errors");
      const diagnostic = createSourceErrorReport(e);
      const location = [diagnostic.source, diagnostic.span?.start.line, diagnostic.span?.start.column]
        .filter(value => value !== undefined).join(":");
      process.stderr.write(diagnosticFormat === "text"
        ? renderSourceError(diagnostic)
        : canonicalize({ error: rep.code, message: `${location ? `${location}: ` : ""}${diagnostic.message}`,
          diagnostic: diagnostic as unknown as JsonValue }) + "\n");
      process.exit(2);
    }
    process.stderr.write(
      canonicalize({ error: rep.code, message: rep.message }) + "\n",
    );
    // Exit-code rule shared with the native CLI: 0 the command succeeded,
    // 1 it ran and reported a negative result, 2 it could not run.
    process.exit(2);
  });
