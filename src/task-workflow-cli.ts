import { open, type FileHandle } from "node:fs/promises";
import { resolve } from "node:path";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";
import type { Store } from "./store-contract";
import { buildEvaluatedTaskArtifact } from "./task-artifact";
import { optimizeTask } from "./task-optimizer";
import { buildTaskWorkflowArchive, compareTaskWorkflows, inspectTaskWorkflow, parseTaskWorkflowConfig, TASK_WORKFLOW_BOUNDS, verifyTaskWorkflowArchive } from "./task-workflow";
import { canonicalize, type JsonValue } from "./values";

type TaskCliHost = {
  readJson(path: string, maximum: number, label: string): Promise<JsonValue>;
  store(): Promise<Store>;
  executors(): Promise<Executor[]>;
  out(value: JsonValue): void;
};
const json = (value: unknown) => value as JsonValue;
function usage(message: string): never { throw new AlgalError("PARSE_FAILED", `task: ${message}`); }
function outputPath(flags: Record<string, string | boolean>): string {
  if (typeof flags.out !== "string" || !flags.out) usage("--out <new-file.json> is required");
  return resolve(flags.out);
}
async function save(file: FileHandle, value: unknown, maximum: number): Promise<void> {
  const text = canonicalize(json(value));
  if (Buffer.byteLength(text) > maximum) throw new AlgalError("BUDGET_EXHAUSTED", `task output exceeds ${maximum} bytes`);
  const buffer = Buffer.from(`${text}\n`, "utf8");
  await file.truncate(0);
  let offset = 0;
  while (offset < buffer.length) {
    const { bytesWritten } = await file.write(buffer, offset, buffer.length - offset, offset);
    if (bytesWritten === 0) throw new AlgalError("PARSE_FAILED", "task output write made no progress");
    offset += bytesWritten;
  }
  await file.sync();
}

/** Offline subcommands never instantiate a store or resolve host executors. */
export async function taskWorkflowCli(positional: string[], flags: Record<string, string | boolean>, host: TaskCliHost): Promise<number> {
  const [action, path, other] = positional;
  const running = action === "evaluate" || action === "optimize";
  if (!running) {
    for (const key of Object.keys(flags)) if (key !== "out") usage(`offline commands do not accept --${key}`);
  }
  if (!path) usage("expected evaluate|optimize|inspect|compare|diff|export|replay <file>");
  if (positional.length !== (action === "compare" || action === "diff" ? 3 : 2)) usage("unexpected positional arguments");
  if (running) {
    let config = parseTaskWorkflowConfig(await host.readJson(resolve(path), TASK_WORKFLOW_BOUNDS.config.maxBytes, "task config"));
    if (action === "evaluate") {
      const { reviser: _reviser, ...base } = config;
      config = parseTaskWorkflowConfig({ ...base, strategy: "fixed" });
    }
    const target = outputPath(flags);
    const store = await host.store();
    const executors = await host.executors();
    // Claim the output before provider calls. Existing files never get replaced.
    const file = await open(target, "wx", 0o600);
    try {
      const report = await optimizeTask({ ...config, store, executors });
      const archive = await buildTaskWorkflowArchive({ config, report, store });
      await save(file, archive, TASK_WORKFLOW_BOUNDS.archive.maxBytes);
      host.out(json({ ...inspectTaskWorkflow(archive), path: target }));
      return report.status === "complete" ? 0 : 1;
    } catch (error) {
      // Receipts already written to the caller's store remain available even
      // when no complete campaign report can be produced.
      await save(file, { contract: "algal.task-workflow-failure.v1", config, error: { code: error instanceof AlgalError ? error.code : "HOST_ERROR", message: String(error).slice(0, 2048) }, receiptStore: String(flags.dir ?? ".algal") }, TASK_WORKFLOW_BOUNDS.archive.maxBytes);
      throw error;
    } finally { await file.close(); }
  }
  const archive = await host.readJson(resolve(path), TASK_WORKFLOW_BOUNDS.archive.maxBytes, "task archive");
  let result: unknown;
  if (action === "inspect") result = inspectTaskWorkflow(archive);
  else if (action === "compare" || action === "diff") result = compareTaskWorkflows(archive, await host.readJson(resolve(other!), TASK_WORKFLOW_BOUNDS.archive.maxBytes, "task archive"));
  else if (action === "replay") {
    const verified = await verifyTaskWorkflowArchive(archive);
    result = { ...inspectTaskWorkflow(verified.archive), verification: "replayed" };
  } else if (action === "export") {
    const target = outputPath(flags);
    const verified = await verifyTaskWorkflowArchive(archive);
    const artifact = await buildEvaluatedTaskArtifact({ baseTask: verified.archive.config.task, report: verified.report, store: verified.store });
    const file = await open(target, "wx", 0o600);
    try { await save(file, artifact, TASK_WORKFLOW_BOUNDS.archive.maxBytes); } finally { await file.close(); }
    host.out(json({ path: target, artifactDigest: artifact.digest, reportDigest: artifact.evaluation.reportDigest, verification: "replayed", admission: "host-owned" }));
    return 0;
  } else return usage(`unknown command ${String(action)}`);
  if (flags.out !== undefined) {
    const file = await open(outputPath(flags), "wx", 0o600);
    try { await save(file, result, TASK_WORKFLOW_BOUNDS.archive.maxBytes); } finally { await file.close(); }
  }
  host.out(json(result));
  return 0;
}
