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
  cachedExecutor,
  commandExecutor,
  scriptedExecutor,
  type Executor,
} from "./src/effects";
import { errorReport, MorphogenError } from "./src/errors";
import { vercelGatewayExecutor } from "./src/gateway";
import { builtinRegistry } from "./src/registry";
import { parseRunReceipt, runOrganism, type RunReceipt } from "./src/run";
import { packOrganism, parseBundle, unpackBundle } from "./src/bundle";
import { FileStore } from "./src/store";
import {
  fileTransport,
  httpTransport,
  parseTransportsFile,
  type Transport,
} from "./src/transport";
import { diffReceipts, verifyReceipt } from "./src/verify";
import {
  parseToolSignature,
  TOOL_SIGNATURE_BOUNDS,
  type Tool,
  type ToolRegistry,
} from "./src/tools";
import {
  generateFoundryCandidates,
  runFoundry,
  type FoundryCase,
} from "./src/foundry";
import { parseFoundryReport, verifyFoundryReport } from "./src/foundry-verify";
import { runFoundrySearch } from "./src/search";
import { parseSearchReport, verifySearchReport } from "./src/search-verify";
import { runBenchmark, type BenchCase, type BenchPrice, type BenchSystem } from "./src/bench";
import { parseBenchReport, verifyBenchReport } from "./src/bench-verify";
import {
  canonicalBytes,
  canonicalize,
  type JsonObject,
  type JsonValue,
} from "./src/values";

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
      --gateway-model <provider/model>        Vercel AI Gateway structured-output executor
      --executors <file>                      JSON map of executor name → shell command;
                                              route.provider/route.preset pick by name
      --modules <dir>                         load *.morphogen.json into the store for organism cells
      --transports <file>                     JSON map of transport name → bundle directory;
                                              via cells resolve remote manifests through it
      --tools <file>                          tool registry: name → {signature, exec};
                                              exec is scripted:<file> or cmd:<shell>
      --dir <path>                            store directory (default .morphogen)
      --write                                 persist manifest + receipt under --dir
      --cache-effects                         memoize effects: identical request digests
                                              serve the store's recorded response
  morphogen check <manifest.json> [--modules <dir>] [--transports <file>] [--dir <path>]
                                              admit a manifest without running it
  morphogen explain <manifest.json> [--modules <dir>] [--transports <file>] [--dir <path>]
                                              print the compiled signature: resolved ports, guards
  morphogen verify <receipt.json> [manifest.json] [--modules <dir>] [--transports <file>] [--dir <path>]
                                              re-run with recorded receipts and compare;
                                              manifest resolves from the store when omitted
  morphogen inspect <receipt.json>            summarize a run receipt
  morphogen runs [--dir <path>]               list receipts stored under --dir
  morphogen diff <receipt-a.json> <receipt-b.json>
                                              compare two receipts, report divergence
  morphogen foundry <config.json> [--responses <file>] [--executor-cmd <command>]
      [--gateway-model <provider/model>]
      [--executors <file>] [--modules <dir>] [--transports <file>] [--tools <file>]
      [--cache-effects] [--dir <path>] [--out <report.json>]
                                              generate/evaluate candidates and promote a winner
  morphogen foundry verify <report.json> [--dir <path>]
                                              replay every run in a foundry report offline
  morphogen foundry inspect <report.json>     summarize scores, lineage, and promotion
  morphogen foundry pack <report.json> --out <dir> [--dir <path>]
                                              export the promoted organism's verified bundle
  morphogen foundry search <config.json> [executor/store options] [--out <report.json>]
                                              evolve candidates over bounded generations
  morphogen foundry search-verify <report.json> [--dir <path>]
  morphogen foundry search-inspect <report.json>
  morphogen foundry search-pack <report.json> --out <dir> [--dir <path>]
                                              inspect or export a verified search winner
  morphogen bench <config.json> [--modules <dir>] [--tools <file>] [--dir <path>] [--out <report.json>]
                                              measure several systems on one workload:
                                              quality, tokens, work, per-model attribution,
                                              and the non-dominated pareto set (with optional prices)
  morphogen bench verify <report.json> [--dir <path>]
                                              replay every case receipt in a bench report
  morphogen bench inspect <report.json>       summarize a pareto comparison
  morphogen suite                             run and verify all bundled examples
  morphogen digest <manifest.json>            print the manifest's canonical digest
  morphogen store put <value.json> [--dir <path>]
                                              write a JSON value to CAS, print its ref token
  morphogen store get <sha256:…> [--dir <path>]
                                              print the payload a ref resolves to
  morphogen store has <sha256:…> [--dir <path>]
                                              report whether a ref resolves
  morphogen slots [--dir <path>]              list durable slot cells' state
  morphogen manifests [--dir <path>]         list manifests stored under --dir
  morphogen manifest <sha256:…> [--dir <path>]
                                              print a stored manifest
  morphogen slot get <name> [--dir <path>]    print a slot's current value
  morphogen slot set <name> <value.json> [--dir <path>]
                                              write a slot directly (seeding)
  morphogen pack <manifest.json> [--modules <dir>] [--dir <path>] [--out <dir>]
                                              print a closure bundle: the manifest plus every
                                              embedded sub-manifest and const-ref payload;
                                              --out also writes <root-hex>.bundle.json
  morphogen unpack <bundle.json> [--dir <path>]
                                              install a bundle into the store, digests verified
  morphogen call <bundle.json> [options]
                                              run a packed organism and print a compact result:
                                              { ok, outputs, receiptDigest, manifestDigest }.
                                              options mirror morphogen run: --args, --responses,
                                              --executor-cmd, --gateway-model, --executors,
                                              --modules, --tools, --cache-effects, --dir
  morphogen tool-def <manifest.json> [--modules <dir>]
                                              print an OpenAI/Anthropic tool definition for the
                                              organism's interface: a name, description, and a
                                              JSON Schema of the arguments it expects
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

async function readJsonStdin(): Promise<JsonValue> {
  const text = await Bun.stdin.text();
  if (!text.trim()) {
    throw new MorphogenError("INPUT_MISSING", "stdin was empty");
  }
  try {
    return JSON.parse(text) as JsonValue;
  } catch (e) {
    throw new MorphogenError(
      "PARSE_FAILED",
      `stdin: ${e instanceof Error ? e.message : String(e)}`,
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
  for (const [name, target] of Object.entries(map)) {
    out[name] = /^https?:\/\//.test(target)
      ? httpTransport(target)
      : fileTransport(resolve(target), name);
  }
  return out;
}

/** Load a tool registry from a JSON file:
 *   { "<tool.name>": { "signature": {...}, "exec": "scripted:<file>" | "cmd:<shell>" } }
 * scripted maps canonical(inputs) -> output ports; cmd receives
 * { inputs, requestDigest, idempotencyKey } on stdin and must print a JSON
 * object of output ports. Both stay behind the signature's bounds. */
async function loadTools(file: string): Promise<ToolRegistry> {
  const resolved = resolve(file);
  const raw = asRecord(await readJson(resolved), "tools");
  const base = dirname(resolved);
  const registry: ToolRegistry = new Map();
  for (const [name, entry] of Object.entries(raw)) {
    if (
      !/^[a-z0-9][a-z0-9.-]*$/.test(name) ||
      name.length > TOOL_SIGNATURE_BOUNDS.maxNameLen
    ) {
      throw new MorphogenError("PARSE_FAILED", `invalid tool name "${name}"`);
    }
    const e = asRecord(entry, `tools.${name}`);
    const extra = Object.keys(e).filter(
      (k) => k !== "signature" && k !== "exec",
    );
    if (e.signature === undefined || typeof e.exec !== "string" || extra.length > 0) {
      throw new MorphogenError(
        "PARSE_FAILED",
        `tools.${name} requires "signature" and "exec"`,
      );
    }
    const signature = parseToolSignature(
      e.signature,
      `tools.${name}.signature`,
    );
    const spec = e.exec;
    let tool: Tool;
    if (spec.startsWith("scripted:")) {
      const data = asRecord(
        await readJson(resolve(base, spec.slice("scripted:".length))),
        `tools.${name} data`,
      );
      tool = async (inputs) => {
        const key = canonicalize(inputs);
        const hit = data[key];
        if (hit === null || typeof hit !== "object" || Array.isArray(hit)) {
          throw new MorphogenError(
            "TOOL_FAILED",
            `${name}: no scripted output for inputs ${key.slice(0, 200)}`,
          );
        }
        return hit as Record<string, JsonValue>;
      };
    } else if (spec.startsWith("cmd:")) {
      const command = spec.slice("cmd:".length);
      tool = async (inputs, context) => {
        const proc = Bun.spawn(["sh", "-c", command], {
          cwd: base,
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
        });
        void proc.stdin.write(
          canonicalize({
            inputs,
            requestDigest: context.requestDigest,
            idempotencyKey: context.idempotencyKey,
          } as JsonValue),
        );
        void proc.stdin.end();
        const onAbort = () => proc.kill("SIGKILL");
        const timer = setTimeout(onAbort, 30_000);
        context.signal?.addEventListener("abort", onAbort);
        let stdout: Uint8Array;
        let code: number;
        try {
          stdout = new Uint8Array(
            await new Response(proc.stdout).arrayBuffer(),
          );
          code = await proc.exited;
        } finally {
          clearTimeout(timer);
          context.signal?.removeEventListener("abort", onAbort);
        }
        if (stdout.byteLength > signature.maxOutputBytes) {
          throw new MorphogenError(
            "TOOL_FAILED",
            `${name}: output exceeds ${signature.maxOutputBytes} bytes`,
          );
        }
        if (code !== 0) {
          const stderr = (await new Response(proc.stderr).text()).slice(0, 2000);
          throw new MorphogenError(
            "TOOL_FAILED",
            `${name}: exited ${code}: ${stderr}`,
          );
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(new TextDecoder().decode(stdout));
        } catch {
          throw new MorphogenError("TOOL_FAILED", `${name}: stdout is not JSON`);
        }
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new MorphogenError(
            "TOOL_FAILED",
            `${name}: output must be a JSON object of ports`,
          );
        }
        return parsed as Record<string, JsonValue>;
      };
    } else {
      throw new MorphogenError(
        "PARSE_FAILED",
        `tools.${name}.exec must be scripted:<file> or cmd:<shell>`,
      );
    }
    registry.set(name, { signature, tool });
  }
  return registry;
}

/** Convert a Morphogen port type to a draft-07 JSON Schema fragment. */
function portToJsonSchema(p: {
  type: string;
  optional?: boolean;
  many?: boolean;
  labels?: string[];
  schema?: JsonObject;
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

    case "call": {
      const file = positional[0];
      if (!file) usageError("morphogen call <bundle.json> [options]");
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }

      const bundle = parseBundle(await readJson(resolve(file)));
      await unpackBundle(bundle, store);
      const manifest = await store.getManifest(bundle.root);
      if (!manifest) {
        throw new MorphogenError("STORE_MISS", `bundle root ${bundle.root} not in store after unpack`);
      }

      const argsRaw =
        flags.args === "-"
          ? asRecord(await readJsonStdin(), "args")
          : flags.args !== undefined
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
      if (flags["gateway-model"] !== undefined) {
        executors.push(vercelGatewayExecutor({ model: String(flags["gateway-model"]) }));
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
      const tools =
        flags.tools !== undefined
          ? await loadTools(String(flags.tools))
          : undefined;

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

      const outputs: JsonObject = {};
      for (const [id, cell] of Object.entries(receipt.cells)) {
        if (cell.outputs) {
          outputs[id] = cell.outputs as JsonValue;
        }
      }
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
      if (!file) usageError("morphogen tool-def <manifest.json> [--format openai|anthropic]");
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

      const raw = manifest.interface ?? { inputs: deriveInputs(compiled), outputs: {} };
      const properties: JsonObject = {};
      const required: string[] = [];
      for (const [name, end] of Object.entries(raw.inputs)) {
        const sig = compiled.ports.get(end.cell);
        if (!sig) {
          throw new MorphogenError("PARSE_FAILED", `interface input ${name}: cell ${end.cell} not found`);
        }
        const p = sig.outputs[end.port];
        if (!p) {
          throw new MorphogenError("PARSE_FAILED", `interface input ${name}: port ${end.port} not found on cell ${end.cell}`);
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
      if (flags["gateway-model"] !== undefined) {
        executors.push(vercelGatewayExecutor({ model: String(flags["gateway-model"]) }));
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
      const tools =
        flags.tools !== undefined
          ? await loadTools(String(flags.tools))
          : undefined;

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
      out(receipt);
      return receipt.outcome === "complete" ? 0 : 1;
    }

    case "foundry": {
      const file = positional[0];
      if (!file) usageError("morphogen foundry <config.json> | foundry verify|inspect|pack <report.json>");
      if (file === "verify") {
        const reportFile = positional[1];
        if (!reportFile) usageError("morphogen foundry verify <report.json> [--dir <path>]");
        const verified = await verifyFoundryReport(
          await readJson(resolve(reportFile)),
          store,
          fns,
          flags.tools !== undefined ? await loadTools(String(flags.tools)) : undefined,
        );
        out(verified as unknown as JsonObject);
        return verified.ok ? 0 : 1;
      }
      if (file === "inspect") {
        const reportFile = positional[1];
        if (!reportFile) usageError("morphogen foundry inspect <report.json>");
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
        if (!reportFile) usageError("morphogen foundry search-verify <report.json> [--dir <path>]");
        const verified = await verifySearchReport(
          await readJson(resolve(reportFile)),
          store,
          fns,
          flags.tools !== undefined ? await loadTools(String(flags.tools)) : undefined,
        );
        out(verified as unknown as JsonObject);
        return verified.ok ? 0 : 1;
      }
      if (file === "search-inspect") {
        const reportFile = positional[1];
        if (!reportFile) usageError("morphogen foundry search-inspect <report.json>");
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
          usageError("morphogen foundry search-pack <report.json> --out <dir> [--dir <path>]");
        }
        const raw = await readJson(resolve(reportFile));
        const report = parseSearchReport(raw);
        const verified = await verifySearchReport(
          raw,
          store,
          fns,
          flags.tools !== undefined ? await loadTools(String(flags.tools)) : undefined,
        );
        if (!verified.ok) {
          throw new MorphogenError("RECEIPT_MISMATCH", `search report failed verification: ${verified.mismatches.join("; ")}`);
        }
        const promoted = await store.getManifest(report.result.promoted);
        if (!promoted) throw new MorphogenError("STORE_MISS", `promoted manifest ${report.result.promoted} missing`);
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
          usageError("morphogen foundry pack <report.json> --out <dir> [--dir <path>]");
        }
        const raw = await readJson(resolve(reportFile));
        const report = parseFoundryReport(raw);
        const verified = await verifyFoundryReport(
          raw,
          store,
          fns,
          flags.tools !== undefined ? await loadTools(String(flags.tools)) : undefined,
        );
        if (!verified.ok) {
          throw new MorphogenError("RECEIPT_MISMATCH", `foundry report failed verification: ${verified.mismatches.join("; ")}`);
        }
        const promoted = await store.getManifest(report.promoted);
        if (!promoted) throw new MorphogenError("STORE_MISS", `promoted manifest ${report.promoted} missing`);
        const bundle = await packOrganism(promoted, store);
        const outputDir = resolve(String(flags.out));
        const { mkdir, writeFile } = await import("node:fs/promises");
        await mkdir(outputDir, { recursive: true });
        const outputFile = join(outputDir, `${report.promoted.slice(7)}.bundle.json`);
        await writeFile(outputFile, canonicalize(bundle as unknown as JsonValue));
        out({ bundle: outputFile, root: bundle.root, foundry: report.digest });
        return 0;
      }
      const searchMode = file === "search";
      const configPath = searchMode ? positional[1] : file;
      if (!configPath) usageError("morphogen foundry search <config.json>");
      const configFile = resolve(configPath);
      if (flags.modules !== undefined) {
        const n = await loadModules(String(flags.modules), store);
        diag(`loaded ${n} module(s) from ${flags.modules}`);
      }
      const config = asRecord(await readJson(configFile), "foundry config");
      const unknown = Object.keys(config).filter((k) => !["contract", "candidates", "generator", "cases", "search"].includes(k));
      if (unknown.length > 0) {
        throw new MorphogenError("PARSE_FAILED", `foundry config: unknown key "${unknown[0]}"`);
      }
      if (config.contract !== "morphogen.foundry.config.v1") {
        throw new MorphogenError("PARSE_FAILED", "foundry config.contract must be morphogen.foundry.config.v1");
      }
      if (!searchMode && config.search !== undefined) {
        throw new MorphogenError("PARSE_FAILED", "search settings require the foundry search command");
      }
      const candidateEntries = config.candidates ?? [];
      if (!Array.isArray(candidateEntries)) {
        throw new MorphogenError("PARSE_FAILED", "foundry config.candidates must be a list");
      }
      if (candidateEntries.length === 0 && config.generator === undefined) {
        throw new MorphogenError("PARSE_FAILED", "foundry config needs candidates or a generator");
      }
      if (!Array.isArray(config.cases) || config.cases.length === 0) {
        throw new MorphogenError("PARSE_FAILED", "foundry config.cases must be a non-empty list");
      }
      const base = dirname(configFile);
      const candidates = await Promise.all(candidateEntries.map(async (candidate, i) => {
        if (typeof candidate !== "string") {
          throw new MorphogenError("PARSE_FAILED", `foundry config.candidates[${i}] must be a path`);
        }
        return parseOrganismManifest(await readJson(resolve(base, candidate)));
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
          throw new MorphogenError("PARSE_FAILED", "foundry config.generator needs manifest, args, and output");
        }
        if (raw.args === undefined) {
          throw new MorphogenError("PARSE_FAILED", "foundry config.generator.args must be an object");
        }
        generator = {
          manifest: parseOrganismManifest(await readJson(resolve(base, raw.manifest))),
          args: asRecord(raw.args, "foundry config.generator.args"),
          output: raw.output,
          ...(typeof raw.field === "string" ? { field: raw.field } : {}),
        };
      }
      const cases: FoundryCase[] = config.cases.map((raw, i) => {
        const c = asRecord(raw, `foundry config.cases[${i}]`);
        const extra = Object.keys(c).filter((k) => !["id", "split", "args", "expect"].includes(k));
        if (extra.length > 0) {
          throw new MorphogenError("PARSE_FAILED", `foundry config.cases[${i}]: unknown key "${extra[0]}"`);
        }
        if (
          typeof c.id !== "string" ||
          (c.split !== "train" && c.split !== "validation" && c.split !== "holdout")
        ) {
          throw new MorphogenError("PARSE_FAILED", `foundry config.cases[${i}] needs string id and train|validation|holdout split`);
        }
        if (c.args === undefined || c.expect === undefined) {
          throw new MorphogenError("PARSE_FAILED", `foundry config.cases[${i}] needs args and expect objects`);
        }
        return {
          id: c.id,
          split: c.split,
          args: asRecord(c.args, `foundry config.cases[${i}].args`),
          expect: asRecord(c.expect, `foundry config.cases[${i}].expect`),
        };
      });
      const executors: Executor[] = [];
      if (flags.responses !== undefined) {
        executors.push(scriptedExecutor(asRecord(
          await readJson(resolve(String(flags.responses))),
          "responses",
        ) as Record<string, JsonValue>));
      }
      if (flags["executor-cmd"] !== undefined) {
        executors.push(commandExecutor(String(flags["executor-cmd"])));
      }
      if (flags["gateway-model"] !== undefined) {
        executors.push(vercelGatewayExecutor({ model: String(flags["gateway-model"]) }));
      }
      if (flags.executors !== undefined) {
        const map = asRecord(await readJson(resolve(String(flags.executors))), "executors");
        for (const [name, command] of Object.entries(map)) {
          if (typeof command !== "string" || command.length === 0) {
            throw new MorphogenError("PARSE_FAILED", `executors.${name} must be a shell command string`);
          }
          const inner = commandExecutor(command);
          executors.push({ id: name, execute: (request) => inner.execute(request) });
        }
      }
      const activeExecutors = flags["cache-effects"] !== undefined
        ? executors.map((executor) => cachedExecutor(executor, store))
        : executors;
      const transports = flags.transports !== undefined
        ? await loadTransports(String(flags.transports))
        : undefined;
      const tools = flags.tools !== undefined
        ? await loadTools(String(flags.tools))
        : undefined;
      if (searchMode) {
        if (!generator || config.search === undefined) {
          throw new MorphogenError("PARSE_FAILED", "search config needs generator and search objects");
        }
        const search = asRecord(config.search, "foundry config.search");
        const extra = Object.keys(search).filter((key) => !["maxGenerations", "feedbackInput"].includes(key));
        if (
          extra.length > 0 ||
          !Number.isInteger(search.maxGenerations) ||
          typeof search.feedbackInput !== "string"
        ) {
          throw new MorphogenError("PARSE_FAILED", "foundry config.search needs maxGenerations and feedbackInput");
        }
        const report = await runFoundrySearch({
          generator: generator.manifest,
          generatorArgs: generator.args,
          feedbackInput: search.feedbackInput,
          output: generator.output,
          ...(generator.field ? { field: generator.field } : {}),
          seeds: candidates,
          cases,
          maxGenerations: search.maxGenerations as number,
          fns,
          store,
          executors: activeExecutors,
          ...(transports ? { transports } : {}),
          ...(tools ? { tools } : {}),
        });
        if (flags.out !== undefined) {
          const { writeFile } = await import("node:fs/promises");
          await writeFile(resolve(String(flags.out)), canonicalize(report as unknown as JsonValue));
        }
        out(report as unknown as JsonObject);
        return 0;
      }
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
          })
        : undefined;
      if (generated) candidates.push(...generated.candidates);
      const report = await runFoundry({
        candidates,
        cases,
        fns,
        store,
        executors: activeExecutors,
        ...(transports ? { transports } : {}),
        ...(tools ? { tools } : {}),
        ...(generated ? {
          lineage: {
            generatorDigest: generated.generatorDigest,
            receiptDigest: generated.receiptDigest,
          },
        } : {}),
      });
      if (flags.out !== undefined) {
        const { writeFile } = await import("node:fs/promises");
        await writeFile(resolve(String(flags.out)), canonicalize(report as unknown as JsonValue));
      }
      out(report as unknown as JsonObject);
      return 0;
    }

    case "bench": {
      const file = positional[0];
      if (!file) {
        usageError("morphogen bench <config.json> | bench verify|inspect <report.json>");
      }
      if (file === "verify") {
        const reportFile = positional[1];
        if (!reportFile) usageError("morphogen bench verify <report.json> [--dir <path>]");
        const verified = await verifyBenchReport(
          await readJson(resolve(reportFile)),
          store,
          fns,
          flags.tools !== undefined ? await loadTools(String(flags.tools)) : undefined,
        );
        out(verified as unknown as JsonObject);
        return verified.ok ? 0 : 1;
      }
      if (file === "inspect") {
        const reportFile = positional[1];
        if (!reportFile) usageError("morphogen bench inspect <report.json>");
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
      const unknown = Object.keys(config).filter((k) => !["contract", "cases", "systems", "prices"].includes(k));
      if (unknown.length > 0) {
        throw new MorphogenError("PARSE_FAILED", `bench config: unknown key "${unknown[0]}"`);
      }
      if (config.contract !== "morphogen.bench.config.v1") {
        throw new MorphogenError("PARSE_FAILED", "bench config.contract must be morphogen.bench.config.v1");
      }
      if (!Array.isArray(config.cases) || config.cases.length === 0) {
        throw new MorphogenError("PARSE_FAILED", "bench config.cases must be a non-empty list");
      }
      if (!Array.isArray(config.systems) || config.systems.length === 0) {
        throw new MorphogenError("PARSE_FAILED", "bench config.systems must be a non-empty list");
      }
      const base = dirname(configFile);
      const cases: BenchCase[] = config.cases.map((raw, i) => {
        const c = asRecord(raw, `bench config.cases[${i}]`);
        const extra = Object.keys(c).filter((k) => !["id", "args", "expect"].includes(k));
        if (extra.length > 0) {
          throw new MorphogenError("PARSE_FAILED", `bench config.cases[${i}]: unknown key "${extra[0]}"`);
        }
        if (typeof c.id !== "string" || c.args === undefined || c.expect === undefined) {
          throw new MorphogenError("PARSE_FAILED", `bench config.cases[${i}] needs id, args, and expect`);
        }
        return {
          id: c.id,
          args: asRecord(c.args, `bench config.cases[${i}].args`),
          expect: asRecord(c.expect, `bench config.cases[${i}].expect`),
        };
      });
      const named = (id: string, inner: Executor): Executor => ({
        id,
        execute: (request, signal) => inner.execute(request, signal),
        ...(inner.executeEffect
          ? { executeEffect: (request: Parameters<NonNullable<Executor["executeEffect"]>>[0], signal?: AbortSignal) => inner.executeEffect!(request, signal) }
          : {}),
        ...(inner.receiptFor
          ? { receiptFor: (request: Parameters<NonNullable<Executor["receiptFor"]>>[0]) => inner.receiptFor!(request) }
          : {}),
      });
      const resolveSpec = async (id: string, spec: string): Promise<Executor> => {
        if (spec.startsWith("gateway:")) {
          return named(id, vercelGatewayExecutor({ model: spec.slice("gateway:".length) }));
        }
        if (spec.startsWith("scripted:")) {
          const responses = asRecord(
            await readJson(resolve(base, spec.slice("scripted:".length))),
            `bench executor ${id}`,
          ) as Record<string, JsonValue>;
          return named(id, scriptedExecutor(responses, id));
        }
        if (spec.startsWith("cmd:")) {
          return named(id, commandExecutor(spec.slice("cmd:".length)));
        }
        throw new MorphogenError(
          "PARSE_FAILED",
          `bench executor "${id}": unknown spec (want gateway:<model>, scripted:<file>, or cmd:<command>)`,
        );
      };
      const systems: BenchSystem[] = [];
      for (const [i, raw] of config.systems.entries()) {
        const s = asRecord(raw, `bench config.systems[${i}]`);
        const extra = Object.keys(s).filter((k) => !["id", "manifest", "executors"].includes(k));
        if (extra.length > 0) {
          throw new MorphogenError("PARSE_FAILED", `bench config.systems[${i}]: unknown key "${extra[0]}"`);
        }
        if (typeof s.id !== "string" || typeof s.manifest !== "string" || s.executors === undefined) {
          throw new MorphogenError("PARSE_FAILED", `bench config.systems[${i}] needs id, manifest, and executors`);
        }
        const specs = asRecord(s.executors, `bench config.systems[${i}].executors`);
        const executors: Executor[] = [];
        for (const [name, spec] of Object.entries(specs)) {
          if (typeof spec !== "string" || spec.length === 0) {
            throw new MorphogenError("PARSE_FAILED", `bench executor "${name}" must be a spec string`);
          }
          executors.push(await resolveSpec(name, spec));
        }
        systems.push({
          id: s.id,
          manifest: parseOrganismManifest(await readJson(resolve(base, s.manifest))),
          executors,
        });
      }
      const transports =
        flags.transports !== undefined
          ? await loadTransports(String(flags.transports))
          : undefined;
      const tools =
        flags.tools !== undefined
          ? await loadTools(String(flags.tools))
          : undefined;
      const prices = parseBenchPrices(config.prices, "bench config.prices");
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
        flags.tools !== undefined
          ? await loadTools(String(flags.tools))
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
        return usageError("morphogen manifest <sha256:…> [--dir <path>]");
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
        if (!name) usageError("morphogen slot get <name>");
        const v = await store.getSlot(name);
        if (v === undefined) {
          throw new MorphogenError("STORE_MISS", `slot "${name}" is empty`);
        }
        out(v as JsonObject);
        return 0;
      }
      if (sub === "set") {
        if (!name || !valueFile) {
          usageError("morphogen slot set <name> <value.json>");
        }
        const v = await readJson(resolve(valueFile));
        const bytes = canonicalBytes(v);
        if (bytes > BOUNDS.maxBlobBytes) {
          throw new MorphogenError(
            "BUDGET_EXHAUSTED",
            `slot value ${bytes}B exceeds maxBlobBytes ${BOUNDS.maxBlobBytes}B`,
          );
        }
        await store.setSlot(name, v);
        out({ name, set: true });
        return 0;
      }
      return usageError(
        "morphogen slot get <name> | slot set <name> <value.json>",
      );
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
        try {
          await readFile(join(EXAMPLES_DIR, `${id}.cache.json`), "utf8");
          for (const e of receipt.effects) {
            if (e.output !== undefined) await store.putEffect(e);
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
        } catch { /* no cache marker */ }
        results.push(result);
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

function parseBenchPrices(
  raw: JsonValue | undefined,
  at: string,
): Record<string, BenchPrice> | undefined {
  if (raw === undefined) return undefined;
  const map = asRecord(raw, at);
  const prices: Record<string, BenchPrice> = {};
  for (const [key, value] of Object.entries(map)) {
    if (key.length === 0 || key.length > 256) {
      throw new MorphogenError("PARSE_FAILED", `${at} has an invalid price key`);
    }
    const p = asRecord(value, `${at}.${key}`);
    const extra = Object.keys(p).filter((k) => !["input", "output"].includes(k));
    if (extra.length > 0) {
      throw new MorphogenError("PARSE_FAILED", `${at}.${key}: unknown key "${extra[0]}"`);
    }
    if (typeof p.input !== "number" || p.input < 0 || !Number.isFinite(p.input)) {
      throw new MorphogenError("PARSE_FAILED", `${at}.${key}.input must be a non-negative number`);
    }
    if (typeof p.output !== "number" || p.output < 0 || !Number.isFinite(p.output)) {
      throw new MorphogenError("PARSE_FAILED", `${at}.${key}.output must be a non-negative number`);
    }
    prices[key] = { input: p.input, output: p.output };
  }
  return prices;
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
