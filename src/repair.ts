import { isAbsolute, join, resolve } from "node:path";
import { CodingJobService, type CodingJobSnapshot } from "./coding-jobs";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { asDigest, digestCanonical, digestText, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { hostDirectory, hostLease, hostRead, hostWrite } from "./host-state";
import { ProcessSupervisor, type ProcessSnapshot } from "./process";
import { FileStore } from "./store";
import type { ToolRegistry } from "./tools";
import { asInt, asObject, asSafeId, asString, canonicalBytes, canonicalize, noUnknownKeys, type JsonValue } from "./values";
import { codingCommand } from "./xcb";

export const REPAIR_AWAIT_TOOL = "coding.job.await.v1";
export const REPAIR_VALIDATE_TOOL = "coding.patch.validate.v1";
export const REPAIR_BOUNDS = {maxChecks: 8, maxArgs: 32, maxConfigBytes: 65_536, maxPacketBytes: 8192, maxOutputBytes: 65_536, maxTimeoutMs: 600_000} as const;
export type RepairCheck = {name: string; argv: string[]; timeoutMs: number; maxOutputBytes: number};
export type RepairConfig = {contract: "algal.repair.v1"; name: string; jobId: Digest; checks: RepairCheck[]};
export type RepairCheckResult = {name: string; exitCode: number; outputRef: Digest; outputBytes: number};
export type RepairPacket = {contract: "algal.repair-packet.v1"; jobId: Digest; patchRef: Digest | null; patchDigest: Digest | null;
  checks: RepairCheckResult[]; action: "review" | "rejected"; reason?: string; remoteWriteAuthorized: false};
export type RepairReport = {config: RepairConfig; process: ProcessSnapshot; result: RepairPacket | null};
type Observation = {contract: "algal.repair-job.v1"; jobId: Digest; status: "completed" | "failed"; patchRef: Digest | null; patchDigest: Digest | null};
const json = (value: unknown): JsonValue => value as JsonValue;
const same = (a: unknown, b: unknown): boolean => canonicalize(json(a)) === canonicalize(json(b));
function invalid(message: string): never {throw new AlgalError("PARSE_FAILED", message);}
function parseConfig(input: unknown): RepairConfig {
  const value = asObject(input, "repair config");
  noUnknownKeys(value, ["contract", "name", "jobId", "checks"], "repair config");
  if (value.contract !== "algal.repair.v1") invalid("invalid repair config contract");
  const name = asSafeId(value.name, "repair name");
  if (name.length > 55) invalid("repair name exceeds 55 characters");
  if (!Array.isArray(value.checks) || value.checks.length < 1 || value.checks.length > REPAIR_BOUNDS.maxChecks) invalid("repair requires 1–8 checks");
  const seen = new Set<string>();
  const checks = value.checks.map(raw => {
    const check = asObject(raw, "repair check");
    noUnknownKeys(check, ["name", "argv", "timeoutMs", "maxOutputBytes"], "repair check");
    const name = asSafeId(check.name, "check name");
    if (seen.has(name)) invalid("duplicate repair check name");
    seen.add(name);
    if (!Array.isArray(check.argv) || check.argv.length < 1 || check.argv.length > REPAIR_BOUNDS.maxArgs) invalid("repair check argv requires 1–32 arguments");
    const argv = check.argv.map(arg => {
      const text = asString(arg, "check argument", 4096);
      if (text.includes("\0")) invalid("check argument contains NUL");
      return text;
    });
    if (!isAbsolute(argv[0]!)) invalid("check executable must be an absolute host-selected path");
    return {name, argv, timeoutMs: asInt(check.timeoutMs, "check timeoutMs", 1, REPAIR_BOUNDS.maxTimeoutMs),
      maxOutputBytes: asInt(check.maxOutputBytes, "check maxOutputBytes", 1, REPAIR_BOUNDS.maxOutputBytes)};
  });
  const config: RepairConfig = {contract: "algal.repair.v1", name, jobId: asDigest(value.jobId, "jobId"), checks};
  if (canonicalBytes(json(config)) > REPAIR_BOUNDS.maxConfigBytes) invalid("repair configuration exceeds byte bound");
  return config;
}
function observation(snapshot: CodingJobSnapshot): Observation {
  if (snapshot.status !== "completed" && snapshot.status !== "failed") throw new AlgalError("EFFECT_SUSPENDED", "coding job has no settled terminal result");
  return {contract: "algal.repair-job.v1", jobId: snapshot.jobId, status: snapshot.status,
    patchRef: snapshot.result?.patchRef ?? null, patchDigest: snapshot.result?.patchDigest ?? null};
}
function parseObservation(input: unknown, jobId: Digest): Observation {
  const value = asObject(input, "coding job observation");
  noUnknownKeys(value, ["contract", "jobId", "status", "patchRef", "patchDigest"], "coding job observation");
  if (value.contract !== "algal.repair-job.v1" || value.jobId !== jobId || (value.status !== "completed" && value.status !== "failed")) invalid("repair observation binding mismatch");
  const patchRef = value.patchRef === null ? null : asDigest(value.patchRef, "patchRef");
  const patchDigest = value.patchDigest === null ? null : asDigest(value.patchDigest, "patchDigest");
  if (patchRef !== patchDigest || (value.status === "completed" && patchRef === null)) invalid("repair observation patch mismatch");
  return {contract: "algal.repair-job.v1", jobId, status: value.status, patchRef, patchDigest};
}
export function repairProgram(): OrganismManifest {
  return parseOrganismManifest({contract: "algal.organism.v1", key: "organism:coding-repair", name: "Wait for a coding job and validate its exact patch",
    cells: [{id: "await", kind: "tool", tool: REPAIR_AWAIT_TOOL}, {id: "validate", kind: "tool", tool: REPAIR_VALIDATE_TOOL}],
    edges: [{from: {cell: "await", port: "observation"}, to: {cell: "validate", port: "observation"}}],
    interface: {outputs: {result: {cell: "validate", port: "result"}}}});
}

/** The VM owns waiting and replay. This host binds one durable job to fixed
 * validation commands; starting an episode never launches a coding adapter. */
export class RepairWorkflow {
  readonly dir: string;
  readonly jobs: CodingJobService;
  private readonly store: FileStore;
  constructor(dir: string, options: {jobs?: CodingJobService} = {}) {
    this.dir = resolve(dir); this.jobs = options.jobs ?? new CodingJobService(this.dir); this.store = new FileStore(this.dir);
  }
  private async path(name: string): Promise<string> {
    asSafeId(name, "repair name");
    if (name.length > 55) invalid("repair name exceeds 55 characters");
    await hostDirectory(this.dir); await hostDirectory(join(this.dir, "repairs"));
    const path = join(this.dir, "repairs", name); await hostDirectory(path); return path;
  }
  private async config(name: string): Promise<RepairConfig> {
    const raw = await hostRead(join(await this.path(name), "config.json"), REPAIR_BOUNDS.maxConfigBytes);
    if (raw === undefined) throw new AlgalError("STORE_MISS", "repair workflow not found");
    const config = parseConfig(raw);
    if (config.name !== name) invalid("repair name binding mismatch");
    return config;
  }
  private tools(config: RepairConfig): ToolRegistry {
    return new Map<string, NonNullable<ReturnType<ToolRegistry["get"]>>>([
      [REPAIR_AWAIT_TOOL, {configurationDigest: digestCanonical({tool: REPAIR_AWAIT_TOOL, jobId: config.jobId, root: this.jobs.root}),
        signature: {inputs: {}, outputs: {observation: {type: "json"}}, effect: "read", cost: 1, maxOutputBytes: 1024},
        tool: async () => ({observation: json(observation(await this.jobs.inspect(config.jobId)))})}],
      [REPAIR_VALIDATE_TOOL, {configurationDigest: digestCanonical({tool: REPAIR_VALIDATE_TOOL, config: json(config), root: this.jobs.root}),
        signature: {inputs: {observation: {type: "json"}}, outputs: {result: {type: "json"}}, effect: "write", cost: 100, maxOutputBytes: REPAIR_BOUNDS.maxPacketBytes},
        tool: async (inputs, context) => ({result: json(await this.validate(config, parseObservation(inputs.observation, config.jobId), context.signal))})}],
    ]);
  }
  private vm(config: RepairConfig): ProcessSupervisor {return new ProcessSupervisor(this.dir, {tools: this.tools(config), journal: true});}
  private async validate(config: RepairConfig, observed: Observation, signal?: AbortSignal): Promise<RepairPacket> {
    const report: RepairPacket = {contract: "algal.repair-packet.v1", jobId: config.jobId, patchRef: observed.patchRef, patchDigest: observed.patchDigest,
      checks: [], action: "rejected", remoteWriteAuthorized: false};
    if (observed.status === "failed") return {...report, reason: "coding-job-failed"};
    const current = await this.jobs.inspect(config.jobId);
    if (!same(observation(current), observed)) return {...report, reason: "coding-job-result-changed"};
    // Share custody with coding jobs admitted through this same host store.
    return hostLease(join(this.jobs.root, "coding-workspaces", digestText(current.intent.workspace).slice(7)), "coding-workspace", async () => {
      for (const check of config.checks) {
        try {await this.jobs.verifyWorkspace(config.jobId);}
        catch {return {...report, reason: `workspace-changed-before:${check.name}`};}
        if (signal?.aborted) throw new AlgalError("BUDGET_EXHAUSTED", "repair validation cancelled before command launch");
        let result: {exitCode: number; stdout: Uint8Array};
        try {
          result = await codingCommand(check.argv, {cwd: current.intent.workspace, signal: signal ?? new AbortController().signal,
            timeoutMs: check.timeoutMs, maxOutputBytes: check.maxOutputBytes});
        } catch (error) {
          throw new AlgalError(error instanceof AlgalError ? error.code : "EFFECT_FAILED", "repair validation command interrupted; external completion uncertain", undefined, {uncertain: true});
        }
        const outputRef = await this.store.putValue({contract: "algal.repair-check-output.v1", jobId: config.jobId, check: check.name,
          encoding: "base64", stdout: Buffer.from(result.stdout).toString("base64")});
        report.checks.push({name: check.name, exitCode: result.exitCode, outputRef, outputBytes: result.stdout.byteLength});
        try {await this.jobs.verifyWorkspace(config.jobId);}
        catch {return {...report, reason: `workspace-changed-after:${check.name}`};}
        if (result.exitCode !== 0) return {...report, reason: `check-failed:${check.name}`};
      }
      return {...report, action: "review"};
    });
  }
  async start(name: string, jobId: Digest, checks: RepairCheck[]): Promise<RepairReport> {
    const config = parseConfig({contract: "algal.repair.v1", name, jobId, checks});
    await this.jobs.inspect(config.jobId); // Admission proves the durable job exists; never launches it.
    return hostLease(await this.path(name), `repair-${name}`, async () => {
      await hostWrite(join(await this.path(name), "config.json"), json(config), REPAIR_BOUNDS.maxConfigBytes);
      const vm = this.vm(config), program = repairProgram();
      let existing: ProcessSnapshot | undefined;
      try {existing = await vm.inspect(name);} catch (error) {if (!(error instanceof AlgalError) || error.code !== "STORE_MISS") throw error;}
      if (existing) {
        if (existing.process.manifestDigest !== digestCanonical(manifestToJson(program)) || !same(existing.process.args, {}) || existing.process.maxGenerations !== 4)
          throw new AlgalError("DIGEST_MISMATCH", "repair process identity conflicts");
      } else await vm.create(name, program, {}, 4);
      return this.report(config);
    });
  }
  private async report(config: RepairConfig): Promise<RepairReport> {
    const process = await this.vm(config).inspect(config.name);
    let result: RepairPacket | null = null;
    if (process.process.receipt) {
      const receipt = asObject(await this.store.getReceipt(process.process.receipt), "repair receipt");
      const cells = asObject(receipt.cells, "repair cells");
      const validate = cells.validate === undefined ? undefined : asObject(cells.validate, "validation cell");
      if (validate?.outputs !== undefined) {
        const packet = asObject(asObject(validate.outputs, "validation outputs").result, "repair packet");
        if (packet.contract !== "algal.repair-packet.v1" || packet.jobId !== config.jobId || packet.remoteWriteAuthorized !== false || (packet.action !== "review" && packet.action !== "rejected") || canonicalBytes(packet) > REPAIR_BOUNDS.maxPacketBytes)
          throw new AlgalError("DIGEST_MISMATCH", "repair receipt packet binding mismatch");
        result = packet as unknown as RepairPacket;
      }
    }
    return {config, process, result};
  }
  async inspect(name: string): Promise<RepairReport> {return this.report(await this.config(name));}
  async tick(name: string): Promise<RepairReport> {
    return hostLease(await this.path(name), `repair-${name}`, async () => {
      const config = await this.config(name), vm = this.vm(config), current = await vm.inspect(name);
      if (current.process.status === "suspended") {
        const job = await this.jobs.inspect(config.jobId);
        if (job.status === "prepared" || job.status === "uncertain") return this.report(config);
      }
      if (current.process.status === "ready" || current.process.status === "suspended" || current.process.status === "uncertain") await vm.tick(name);
      return this.report(config);
    });
  }
  async verify(name: string): Promise<JsonValue> {return json(await this.vm(await this.config(name)).verify(name));}
}
