#!/usr/bin/env bun
// morphogen — run, verify, and inspect typed workflow organisms.
// Data on stdout (JSON), diagnostics on stderr. Exit 0 ok, 1 run/verify
// failure, 2 usage or parse error.

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { manifestToJson, parseOrganismManifest } from "./src/contract";
import { digestCanonical } from "./src/digest";
import {
  commandExecutor,
  scriptedExecutor,
  type Executor,
} from "./src/effects";
import { errorReport, MorphogenError } from "./src/errors";
import { builtinRegistry } from "./src/registry";
import { runOrganism, type RunReceipt } from "./src/run";
import { FileStore } from "./src/store";
import { verifyReceipt } from "./src/verify";
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
      --dir <path>                            store directory (default .morphogen)
      --write                                 persist manifest + receipt under --dir
  morphogen verify <receipt.json> <manifest.json> [--dir <path>]
                                              re-run with recorded receipts and compare
  morphogen inspect <receipt.json>            summarize a run receipt
  morphogen digest <manifest.json>            print the manifest's canonical digest
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

    case "run": {
      const file = positional[0];
      if (!file) usageError("morphogen run <manifest.json> [options]");
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

      const receipt = await runOrganism({ manifest, args, fns, store, executors });

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
      if (!receiptFile || !manifestFile) {
        usageError("morphogen verify <receipt.json> <manifest.json>");
      }
      const receipt = await readJson(resolve(receiptFile!));
      const manifest = await readJson(resolve(manifestFile!));
      const report = await verifyReceipt(receipt, manifest, store, fns);
      out(report as unknown as JsonObject);
      return report.ok ? 0 : 1;
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
          Object.entries(cells).map(([k, v]) => [
            k,
            (v as JsonObject).status ?? null,
          ]),
        ),
        effects: ((raw.effects as JsonValue[]) ?? []).length,
        failure: raw.failure ?? null,
        digest: raw.digest ?? null,
      };
      out(summary);
      return 0;
    }

    case "suite": {
      // Self-check: run the bundled example with its scripted responses,
      // then verify the receipt offline.
      const manifestRaw = await readJson(
        join(EXAMPLES_DIR, "triage.morphogen.json"),
      );
      const manifest = parseOrganismManifest(manifestRaw);
      const responses = asRecord(
        await readJson(join(EXAMPLES_DIR, "triage.responses.json")),
        "responses",
      );
      const receipt = await runOrganism({
        manifest,
        args: {
          ticket: { text: "App crashes when I press export twice" },
        },
        fns,
        store,
        executors: [scriptedExecutor(responses as Record<string, JsonValue>)],
      });
      const report = await verifyReceipt(
        receipt as unknown as JsonValue,
        manifestRaw,
        store,
        fns,
      );
      out({
        example: "triage",
        outcome: receipt.outcome,
        verifyOk: report.ok,
        receiptDigest: receipt.digest,
        cells: Object.fromEntries(
          Object.entries(receipt.cells).map(([k, v]) => [k, v.status]),
        ),
      });
      return receipt.outcome === "complete" && report.ok ? 0 : 1;
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
