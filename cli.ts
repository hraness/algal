#!/usr/bin/env bun
// morphogen — run, verify, and inspect typed workflow organisms.
// Data on stdout (JSON), diagnostics on stderr. Exit 0 ok, 1 run/verify
// failure, 2 usage or parse error.

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BOUNDS, manifestToJson, parseOrganismManifest } from "./src/contract";
import { compileOrganism } from "./src/graph";
import { digestCanonical } from "./src/digest";
import {
  commandExecutor,
  scriptedExecutor,
  type Executor,
} from "./src/effects";
import { errorReport, MorphogenError } from "./src/errors";
import { builtinRegistry } from "./src/registry";
import { parseRunReceipt, runOrganism, type RunReceipt } from "./src/run";
import { packOrganism, parseBundle, unpackBundle } from "./src/bundle";
import { FileStore } from "./src/store";
import {
  fileTransport,
  parseTransportsFile,
  type Transport,
} from "./src/transport";
import { diffReceipts, verifyReceipt } from "./src/verify";
import { canonicalize, type JsonObject, type JsonValue } from "./src/values";

const ROOT = dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = join(ROOT, "examples");

const USAGE = `morphogen — typed, replayable workflow organisms

usage:
  morphogen examples                          list bundled examples
  morphogen example <id>                      print the example manifest
  morphogen run <manifest.json> [options]     run an organism, print its receipt
      --args <file>                           input-cell values (JSON)
      --responses <file>                      scripted agent outputs (JSON map)
      --executor-cmd <shell command>          live executor: request on stdin, output on stdout
      --executors <file>                      JSON map of executor name → shell command;
                                              route.provider/route.preset pick by name
      --modules <dir>                         load *.morphogen.json into the store for organism cells
      --transports <file>                     JSON map of transport name → bundle directory;
                                              via cells resolve remote manifests through it
      --dir <path>                            store directory (default .morphogen)
      --write                                 persist manifest + receipt under --dir
  morphogen check <manifest.json> [--modules <dir>] [--transports <file>] [--dir <path>]
                                              admit a manifest without running it
  morphogen explain <manifest.json> [--modules <dir>] [--transports <file>] [--dir <path>]
                                              print the compiled signature: resolved ports, guards
  morphogen verify <receipt.json> [manifest.json] [--modules <dir>] [--transports <file>] [--dir <path>]
                                              re-run with recorded receipts and compare;
                                              manifest resolves from the store when omitted
  morphogen inspect <receipt.json>            summarize a run receipt
  morphogen diff <receipt-a.json> <receipt-b.json>
                                              compare two receipts, report divergence
  morphogen suite                             run and verify all bundled examples
  morphogen digest <manifest.json>            print the manifest's canonical digest
  morphogen store put <value.json> [--dir <path>]
                                              write a JSON value to CAS, print its ref token
  morphogen store get <sha256:…> [--dir <path>]
                                              print the payload a ref resolves to
  morphogen store has <sha256:…> [--dir <path>]
                                              report whether a ref resolves
  morphogen pack <manifest.json> [--modules <dir>] [--dir <path>] [--out <dir>]
                                              print a closure bundle: the manifest plus every
                                              embedded sub-manifest and const-ref payload;
                                              --out also writes <root-hex>.bundle.json
  morphogen unpack <bundle.json> [--dir <path>]
                                              install a bundle into the store, digests verified
  morphogen --version | --help
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
    throw new MorphogenError(
      "PARSE_FAILED",
      `${path}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

function out(v: JsonValue | JsonObject | RunReceipt): void {
  process.stdout.write(canonicalize(v as JsonValue) + "\n");
}

function diag(msg: string): void {
  process.stderr.write(msg + "\n");
}

/** Load every *.morphogen.json under dir into the store so organism cells
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
    throw new MorphogenError("IO_FAILED", `modules dir not readable: ${dir}`);
  }
  let loaded = 0;
  for (const f of files.sort()) {
    if (!f.endsWith(".morphogen.json")) continue;
    const m = parseOrganismManifest(await readJson(join(resolved, f)));
    await store.putManifest(m);
    loaded++;
  }
  return loaded;
}

/** `--transports <file>` maps transport names to bundle directories —
 * what `pack --out` writes. */
async function loadTransports(
  file: string,
): Promise<Record<string, Transport>> {
  const map = parseTransportsFile(await readJson(resolve(file)));
  const out: Record<string, Transport> = {};
  for (const [name, dir] of Object.entries(map)) {
    out[name] = fileTransport(resolve(dir), name);
  }
  return out;
}

async function main(): Promise<number> {
  const { cmd, positional, flags } = parseArgs(process.argv.slice(2));
  const dir = String(flags.dir ?? ".morphogen");
  const store = new FileStore(dir);
  const fns = builtinRegistry();

  switch (cmd) {
    case "--help":
    case "-h":
    case "help":
      process.stdout.write(USAGE);
      return 0;

    case "--version":
    case "version":
      out({ name: "morphogen", version: "0.1.0", contract: "morphogen.organism.v1" });
      return 0;

    case "examples": {
      const { readdir } = await import("node:fs/promises");
      const files = (await readdir(EXAMPLES_DIR)).filter(
        (f) => f.endsWith(".morphogen.json"),
      );
      out({ examples: files.map((f) => f.replace(/\.morphogen\.json$/, "")) });
      return 0;
    }

    case "example": {
      const id = positional[0];
      if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
        throw new MorphogenError("PARSE_FAILED", "usage: morphogen example <id>");
      }
      const m = await readJson(join(EXAMPLES_DIR, `${id}.morphogen.json`));
      out(m);
      return 0;
    }

    case "digest": {
      const file = positional[0];
      if (!file) usageError("morphogen digest <manifest.json>");
      const manifest = parseOrganismManifest(await readJson(file));
      out({ digest: digestCanonical(manifestToJson(manifest)) });
      return 0;
    }

    case "store": {
      const sub = positional[0];
      const asRefDigest = (s: string | undefined): `sha256:${string}` => {
        if (!s || !/^sha256:[0-9a-f]{64}$/.test(s)) {
          throw new MorphogenError(
            "PARSE_FAILED",
            "expected a sha256:<64 hex> ref token",
          );
        }
        return s as `sha256:${string}`;
      };
      switch (sub) {
        case "put": {
          const file = positional[1];
          if (!file) usageError("morphogen store put <value.json>");
          const v = await readJson(resolve(file));
          const bytes = canonicalize(v).length;
          if (bytes > BOUNDS.maxBlobBytes) {
            throw new MorphogenError(
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
            throw new MorphogenError("INPUT_MISSING", `ref ${d} not in store`);
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
          usageError("morphogen store put|get|has …");
      }
      return 0;
    }

    case "pack": {
      const file = positional[0];
      if (!file) usageError("morphogen pack <manifest.json> [--modules <dir>]");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const manifest = parseOrganismManifest(await readJson(resolve(file)));
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
      if (!file) usageError("morphogen unpack <bundle.json>");
      const bundle = parseBundle(await readJson(resolve(file)));
      const res = await unpackBundle(bundle, store);
      out({ ok: true, root: bundle.root, ...res });
      return 0;
    }

    case "check": {
      const file = positional[0];
      if (!file) usageError("morphogen check <manifest.json> [--modules <dir>]");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const manifest = parseOrganismManifest(await readJson(resolve(file)));
      const compiled = await compileOrganism(
        manifest,
        fns,
        store,
        0,
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined,
      );
      out({
        ok: true,
        key: manifest.key,
        digest: digestCanonical(manifestToJson(manifest)),
        cells: compiled.manifest.cells.map((c) => ({ id: c.id, kind: c.kind })),
        edges: compiled.manifest.edges.length,
      });
      return 0;
    }

    case "explain": {
      const file = positional[0];
      if (!file) {
        usageError("morphogen explain <manifest.json> [--modules <dir>]");
      }
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const manifest = parseOrganismManifest(await readJson(resolve(file)));
      const compiled = await compileOrganism(
        manifest,
        fns,
        store,
        0,
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined,
      );
      const ptJson = (p: {
        type: string;
        optional?: boolean;
        many?: boolean;
        labels?: string[];
        schema?: JsonObject;
      }): JsonValue => {
        const o: JsonObject = { type: p.type };
        if (p.optional) o.optional = true;
        if (p.many) o.many = true;
        if (p.labels) o.labels = p.labels;
        if (p.schema) o.schema = p.schema;
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
          ...(e.guard ? { guard: { equals: e.guard.equals } } : {}),
        })),
      });
      return 0;
    }

    case "run": {
      const file = positional[0];
      if (!file) usageError("morphogen run <manifest.json> [options]");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const manifest = parseOrganismManifest(await readJson(resolve(file)));

      const argsRaw =
        flags.args !== undefined
          ? asRecord(await readJson(resolve(String(flags.args))), "args")
          : {};
      const args: Record<string, Record<string, JsonValue>> = {};
      for (const [cellId, ports] of Object.entries(argsRaw)) {
        args[cellId] = asRecord(ports as JsonValue, `args.${cellId}`);
      }

      const executors: Executor[] = [];
      if (flags.responses !== undefined) {
        const map = asRecord(
          await readJson(resolve(String(flags.responses))),
          "responses",
        );
        executors.push(scriptedExecutor(map as Record<string, JsonValue>));
      }
      if (flags["executor-cmd"] !== undefined) {
        executors.push(commandExecutor(String(flags["executor-cmd"])));
      }
      if (flags.executors !== undefined) {
        const map = asRecord(
          await readJson(resolve(String(flags.executors))),
          "executors",
        );
        for (const [name, cmd] of Object.entries(map)) {
          if (typeof cmd !== "string" || cmd.length === 0) {
            throw new MorphogenError(
              "PARSE_FAILED",
              `executors.${name} must be a shell command string`,
            );
          }
          const inner = commandExecutor(cmd);
          executors.push({ id: name, execute: (r) => inner.execute(r) });
        }
        diag(`loaded ${Object.keys(map).length} named executor(s)`);
      }
      const transports =
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined;

      const receipt = await runOrganism({
        manifest,
        args,
        fns,
        store,
        executors,
        ...(transports ? { transports } : {}),
      });

      if (flags.write) {
        const md = await store.putManifest(manifest);
        const rd = await store.putReceipt(receipt as unknown as JsonValue);
        diag(`manifest ${md}`);
        diag(`receipt  ${rd}`);
      }
      out(receipt);
      return receipt.outcome === "complete" ? 0 : 1;
    }

    case "verify": {
      const [receiptFile, manifestFile] = positional;
      if (!receiptFile) {
        usageError("morphogen verify <receipt.json> [manifest.json]");
      }
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const receipt = await readJson(resolve(receiptFile));
      let manifest: JsonValue;
      if (manifestFile !== undefined) {
        manifest = await readJson(resolve(manifestFile));
      } else {
        const digest = (receipt as JsonObject).manifestDigest;
        if (typeof digest !== "string" || !digest.startsWith("sha256:")) {
          throw new MorphogenError(
            "PARSE_FAILED",
            "receipt has no manifestDigest; pass the manifest explicitly",
          );
        }
        const stored = await store.getManifest(digest as `sha256:${string}`);
        if (!stored) {
          throw new MorphogenError(
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
      );
      out(report as unknown as JsonObject);
      return report.ok ? 0 : 1;
    }

    case "diff": {
      const [aFile, bFile] = positional;
      if (!aFile || !bFile) {
        usageError("morphogen diff <receipt-a.json> <receipt-b.json>");
      }
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
      if (!file) usageError("morphogen inspect <receipt.json>");
      const raw = (await readJson(resolve(file))) as JsonObject;
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

    case "suite": {
      // Self-check: run every bundled example with its scripted responses
      // and default args, then verify each receipt offline.
      const { readdir } = await import("node:fs/promises");
      const files = (await readdir(EXAMPLES_DIR)).filter((f) =>
        f.endsWith(".morphogen.json"),
      );
      const results: JsonObject[] = [];
      let allOk = true;
      // preload every example into the store so organism cells resolve
      // regardless of iteration order
      const parsed = new Map<string, { raw: JsonValue; manifest: ReturnType<typeof parseOrganismManifest> }>();
      for (const f of files.sort()) {
        const id = f.replace(/\.morphogen\.json$/, "");
        const raw = await readJson(join(EXAMPLES_DIR, f));
        const manifest = parseOrganismManifest(raw);
        await store.putManifest(manifest);
        parsed.set(id, { raw, manifest });
      }
      for (const [id, { raw: manifestRaw, manifest }] of parsed) {
        let responses: Record<string, JsonValue> = {};
        try {
          responses = asRecord(
            await readJson(join(EXAMPLES_DIR, `${id}.responses.json`)),
            "responses",
          ) as Record<string, JsonValue>;
        } catch { /* no responses file: organism has no agent cells */ }
        const args: Record<string, Record<string, JsonValue>> = {};
        try {
          const raw = asRecord(
            await readJson(join(EXAMPLES_DIR, `${id}.args.json`)),
            "args",
          );
          for (const [k, v] of Object.entries(raw)) {
            args[k] = asRecord(v, `args.${k}`) as Record<string, JsonValue>;
          }
        } catch { /* no args file */ }
        let transports: Record<string, Transport> | undefined;
        try {
          transports = await loadTransports(
            join(EXAMPLES_DIR, `${id}.transports.json`),
          );
        } catch { /* no transports file */ }
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
        results.push({
          example: id,
          outcome: receipt.outcome,
          verifyOk: report.ok,
          receiptDigest: receipt.digest,
        });
      }
      out({ suite: "examples", ok: allOk, results });
      return allOk ? 0 : 1;
    }

    default:
      process.stderr.write(USAGE);
      return 2;
  }
}

function asRecord(v: JsonValue, what: string): Record<string, JsonValue> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    throw new MorphogenError("PARSE_FAILED", `${what} must be a JSON object`);
  }
  return v as Record<string, JsonValue>;
}

function usageError(msg: string): never {
  throw new MorphogenError("PARSE_FAILED", `usage: ${msg}`);
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    const rep = errorReport(e);
    process.stderr.write(
      canonicalize({ error: rep.code, message: rep.message }) + "\n",
    );
    process.exit(rep.code === "PARSE_FAILED" ? 2 : 1);
  });
