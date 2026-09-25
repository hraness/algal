/** Static bounded worker. The integration adapter owns process-group custody. */
import { writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { manifestToJson } from "../../../src/contract";
import { digestCanonical } from "../../../src/digest";
import { scriptedExecutor, type Executor } from "../../../src/effects";
import { errorReport, AlgalError } from "../../../src/errors";
import { commandJson } from "../../../src/io";
import { builtinRegistry } from "../../../src/registry";
import { runOrganism } from "../../../src/run";
import { ProcessSupervisor } from "../../../src/process";
import { FileStore } from "../../../src/store";
import { hashBytes, stableJson } from "../../lib/files";
import { requireThat } from "../../lib/schema";
import { materialize } from "./adapter";
import { fixtures } from "./fixtures";
import { DEFAULT, foreignFixtures } from "./foreign";

export const EXECUTOR = "scheduler-fixture";
export function commandConfiguration(directory: string, mode: string, bun: string) {
  return { kind: "command", argv: [bun, fileURLToPath(new URL("./command.ts", import.meta.url)), directory, mode], cwd: null, timeoutMs: 10_000 };
}
export function workerSummary(id: string, result: unknown): string {
  return stableJson({ contract: "algal.scheduler-worker.v1", id, resultDigest: hashBytes(stableJson(result) + "\n") });
}
if (import.meta.main) {
  const [mode, id, directory] = process.argv.slice(2);
  requireThat(process.argv.length === 5 && (mode === "ordinary" || mode === "foreign") && id !== undefined && directory !== undefined && isAbsolute(directory), "scheduler worker static mode/id/absolute directory");
  const store = new FileStore(join(directory, "state"));
  const persist = (name: string, value: unknown) => writeFile(join(directory, name), stableJson(value) + "\n", { flag: "wx", mode: 0o600 });
  let result: unknown;
  if (mode === "ordinary") {
    const fixture = fixtures().find(f => f.id === id); requireThat(fixture !== undefined, "scheduler fixture inventory");
    const manifest = await materialize(fixture.program, store, fixture.budget);
    const responses: Record<string, import("./oracle").Json[]> = {};
    for (const t of fixture.tape) { requireThat(t.response.kind === "output", "ordinary response inventory"); (responses[t.cell] ??= []).push(t.response.value); }
    await persist("manifest.json", manifestToJson(manifest)); await persist("responses.json", responses); await persist("args.json", fixture.args);
    result = await runOrganism({ manifest, args: fixture.args, store, fns: builtinRegistry(), executors: [scriptedExecutor(responses)] });
  } else {
    const fixture = foreignFixtures().find(f => f.id === id); requireThat(fixture !== undefined, "foreign fixture inventory");
    const manifest = await materialize(fixture.program, store, DEFAULT), configuration = commandConfiguration(directory, fixture.mode, process.execPath);
    await persist("manifest.json", manifestToJson(manifest));
    const configurationDigest = digestCanonical(configuration);
    const executor: Executor = { id: EXECUTOR, capabilities: { effects: ["agent"] }, cacheable: false, retryable: false,
      receiptFor: () => ({ configurationDigest }), execute: (request, signal) => commandJson(configuration.argv, request, { timeoutMs: configuration.timeoutMs, ...(signal ? { signal } : {}) }) };
    if (!fixture.journal) result = await runOrganism({ manifest, args: {}, store, fns: builtinRegistry(), executors: [executor] });
    else {
      const service = new ProcessSupervisor(store.dir, { journal: true, executors: [executor] }); await service.create("worker", manifest);
      let failure: unknown; try { await service.tick("worker"); } catch (error) { failure = error; }
      requireThat(failure instanceof AlgalError && failure.code === "EFFECT_FAILED" && failure.uncertain, "Bun poison must abort without a process result");
      const head = await service.inspect("worker"), journal = await service.journal("worker");
      let recovery: unknown; try { await service.recover("worker", head.digest); } catch (error) { recovery = error; }
      requireThat(recovery instanceof AlgalError, "Bun poison recovery must reject");
      result = { head, journal, error: { ...errorReport(failure), uncertain: failure.uncertain }, recovery: errorReport(recovery), reopened: await new ProcessSupervisor(store.dir).inspect("worker") };
    }
  }
  await persist("result.json", result); console.log(workerSummary(id, result));
}
