#!/usr/bin/env bun
import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applicationJson } from "../../src/application-contract";
import { canonicalize } from "../../src/values";
import { TriageHost, hash, parseTransfer, verifyTransfer } from "./host";
import { DEFAULT_SESSION, object, text, parseConfig, parseTasks, parseCommand, parseProposal, parseSession, reference } from "./contract";
import { proposeWithApple } from "../local-triage-inference/apple";
import { serveTriage } from "../local-triage-web/serve";

async function file(path: string | undefined): Promise<unknown> {
  if (!path) throw new Error("A JSON input path is required");
  if ((await stat(path)).size > 8_388_608) throw new Error("Input file exceeds 8 MiB");
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}
export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
const [directory, application, action, ...args] = argv;
if (!directory || !application || !action) {
  console.error("Usage: bun examples/local-triage/run.ts DIRECTORY APPLICATION init [input.json] | capture [session.json] | load-session ID | save-session ID input.json | command command.json | propose-evaluate proposal.json | adopt EVALUATION OPERATION | export [output.json] | verify transfer.json | import transfer.json | fork transfer.json NEW_APPLICATION | review-merge HEAD TRANSFER | adopt-merge REVIEW resolutions.json OPERATION | operation LABEL");
  process.exitCode = 2;
} else {
  try {
    const host = new TriageHost(resolve(directory), application);
    let result: unknown;
    switch (action) {
      case "serve": console.log(JSON.stringify({ url: (await serveTriage({ directory: resolve(directory), application })).url })); return;
      case "init": {
        if (args[0]) {
          const v = object(await file(args[0]), ["schemaVersion", "config", "tasks"]);
          if (v.schemaVersion !== 1 && v.schemaVersion !== 2) throw new Error("Invalid schema version");
          result = await host.initialize({ schemaVersion: v.schemaVersion, config: parseConfig(v.config), tasks: parseTasks(v.tasks) });
        } else result = await host.initialize();
        break;
      }
      case "capture": result = await host.capture(args[0] ? parseSession(await file(args[0])) : DEFAULT_SESSION); break;
      case "load-session": if (!args[0]) throw new Error("Session ID required"); else result = await host.loadSession(args[0]); break;
      case "save-session": if (!args[0]) throw new Error("Session ID required"); else result = await host.saveSession(args[0], await file(args[1]) as Parameters<TriageHost["saveSession"]>[1]); break;
      case "command": result = await host.command(parseCommand(await file(args[0]))); break;
      case "propose-evaluate": result = await host.proposeEvaluate(parseProposal(await file(args[0]))); break;
      case "propose-apple": {
        const v = object(await file(args[0]), ["native", "bridge", "attemptDirectory", "instruction"]);
        result = await proposeWithApple(host, { native: text(v.native, 2048), bridge: text(v.bridge, 2048), attemptDirectory: text(v.attemptDirectory, 2048), instruction: text(v.instruction, 512) });
        break;
      }
      case "adopt": result = await host.adopt(reference(args[0]), reference(args[1])); break;
      case "export": {
        const transfer = await host.export();
        if (args[0]) { await writeFile(args[0], canonicalize(transfer), { flag: "wx", mode: 0o600 }); result = { file: resolve(args[0]), head: transfer.head, records: transfer.records.length }; }
        else result = transfer;
        break;
      }
      case "verify": result = await verifyTransfer(await file(args[0])); break;
      case "import": result = await host.import(parseTransfer(await file(args[0]))); break;
      case "fork": if (!args[1]) throw new Error("New application identity required"); else result = await host.fork(parseTransfer(await file(args[0])), args[1]); break;
      case "review-merge": result = await host.reviewMerge(reference(args[0]), reference(args[1])); break;
      case "adopt-merge": result = await host.adoptMerge(reference(args[0]), await file(args[1]) as Parameters<TriageHost["adoptMerge"]>[1], reference(args[2])); break;
      case "operation": if (!args[0] || args[0].length > 128) throw new Error("Bounded operation label required"); else result = hash({ application, label: args[0] }); break;
      default: throw new Error(`Unknown local triage operation: ${action}`);
    }
    // Transfer has its own bounded parser and can be larger than one core record.
    console.log(canonicalize(action === "export" && !args[0] ? parseTransfer(result) : applicationJson(result)));
  } catch (error) {
    console.error(JSON.stringify({ error: error instanceof Error ? error.message : "Local triage failed" }));
    process.exitCode = 1;
  }
}

}

if (import.meta.main) await main();
