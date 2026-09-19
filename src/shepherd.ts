import { join, resolve } from "node:path";
import { parseOrganismManifest, manifestToJson, type OrganismManifest } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { GitHubClient, type GitHubEvidence, type GitHubTransport, type GitHubRequiredCheck } from "./github";
import { HostEventService } from "./host-events";
import { hostDirectory, hostLease, hostRead, hostWrite } from "./host-state";
import { FileMailboxService, mailboxToolRegistry, type MailboxConfig } from "./mailbox";
import { ProcessSupervisor, type ProcessSnapshot } from "./process";
import { FileStore } from "./store";
import { mergeToolRegistries, type ToolRegistry } from "./tools";
import { asInt, asObject, asSafeId, asString, canonicalBytes, canonicalize, noUnknownKeys, type JsonValue } from "./values";

export const SHEPHERD_TOOL = "github.shepherd.observe.v1";
export type ShepherdConfig = {
  contract: "algal.shepherd.v1"; name: string; repository: string; pullNumber: number;
  intervalMs: number; maxPolls: number; requiredChecks: GitHubRequiredCheck[];
};
export type ShepherdOptions = { name: string; repository: string; pullNumber: number; intervalMs?: number; maxPolls?: number; requiredChecks?: GitHubRequiredCheck[] };
export type ShepherdReport = { config: ShepherdConfig; process: ProcessSnapshot; result: JsonValue | null; nextTimer: Digest | null };
const json = (value: unknown): JsonValue => value as JsonValue;
const same = (a: unknown, b: unknown): boolean => canonicalize(json(a)) === canonicalize(json(b));
function parseConfig(input: unknown): ShepherdConfig {
  const value = asObject(input, "shepherd config");
  noUnknownKeys(value, ["contract", "name", "repository", "pullNumber", "intervalMs", "maxPolls", "requiredChecks"], "shepherd config");
  if (value.contract !== "algal.shepherd.v1") throw new AlgalError("PARSE_FAILED", "invalid shepherd contract");
  const name = asSafeId(value.name, "shepherd name");
  if (name.length > 55) throw new AlgalError("PARSE_FAILED", "shepherd name exceeds 55 characters");
  const repository = asString(value.repository, "repository", 256);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new AlgalError("PARSE_FAILED", "repository must be owner/name");
  if (!Array.isArray(value.requiredChecks) || value.requiredChecks.length > 64) throw new AlgalError("PARSE_FAILED", "invalid required checks");
  const requiredChecks = value.requiredChecks.map(raw => {
    const check = asObject(raw, "required check");
    noUnknownKeys(check, ["name", "appId"], "required check");
    return {name: asString(check.name, "check name", 256), ...(check.appId === undefined ? {} : {appId: asInt(check.appId, "check app", 1, Number.MAX_SAFE_INTEGER)})};
  });
  return {contract: "algal.shepherd.v1", name, repository, pullNumber: asInt(value.pullNumber, "pull number", 1, 1_000_000_000),
    intervalMs: asInt(value.intervalMs, "intervalMs", 1000, 3_600_000), maxPolls: asInt(value.maxPolls, "maxPolls", 1, 16), requiredChecks};
}

/** Portable, finite episode. Each poll follows a mailbox delivery; waiting and
 * policy evaluation never call a model. A new revision requires a new episode. */
export function shepherdProgram(maxPolls = 16): { round: OrganismManifest; program: OrganismManifest } {
  asInt(maxPolls, "maxPolls", 1, 16);
  const round = parseOrganismManifest({contract: "algal.organism.v1", key: "organism:github-shepherd-round", name: "Wait for an event and collect exact-revision CI evidence",
    cells: [
      {id: "input", kind: "input", outputs: {inbox: {type: "cap", capability: "mailbox-receive"}, previous: "json"}},
      {id: "wait", kind: "tool", tool: "mailbox.receive.v1"},
      {id: "observe", kind: "tool", tool: SHEPHERD_TOOL},
    ], edges: [
      {from: {cell: "input", port: "inbox"}, to: {cell: "wait", port: "mailbox"}},
      {from: {cell: "wait", port: "message"}, to: {cell: "observe", port: "wake"}},
      {from: {cell: "input", port: "previous"}, to: {cell: "observe", port: "previous"}},
    ], interface: {inputs: {inbox: {cell: "input", port: "inbox"}, previous: {cell: "input", port: "previous"}},
      outputs: {inbox: {cell: "input", port: "inbox"}, previous: {cell: "observe", port: "previous"}, result: {cell: "observe", port: "result"}, done: {cell: "observe", port: "done"}}}});
  const program = parseOrganismManifest({contract: "algal.organism.v1", key: "organism:github-shepherd", name: "Bounded durable PR and CI shepherd",
    budgets: {maxSteps: 256, maxAgentCalls: 1, maxWork: 10_000_000, maxDepth: 4},
    cells: [
      {id: "input", kind: "input", outputs: {inbox: {type: "cap", capability: "mailbox-receive"}, previous: "json"}},
      {id: "watch", kind: "repeat", manifest: digestCanonical(manifestToJson(round)), maxRounds: maxPolls, carry: {inbox: "inbox", previous: "previous"}, until: {output: "done", equals: "done"}},
    ], edges: [
      {from: {cell: "input", port: "inbox"}, to: {cell: "watch", port: "inbox"}},
      {from: {cell: "input", port: "previous"}, to: {cell: "watch", port: "previous"}},
    ], interface: {inputs: {inbox: {cell: "input", port: "inbox"}, previous: {cell: "input", port: "previous"}}, outputs: {result: {cell: "watch", port: "result"}}}});
  return {round, program};
}

export function shepherdPacket(evidence: GitHubEvidence): JsonValue {
  const failed = evidence.checks.filter(check => (check.kind === "status" && ["failure", "error"].includes(check.status)) || (check.kind === "check" && check.status === "completed" && check.conclusion !== null && !["success", "neutral", "skipped"].includes(check.conclusion)));
  const action = evidence.state !== "open" ? "blocked" : evidence.status === "ready" ? "review" : evidence.status === "pending" ? "wait" : evidence.status === "stale" ? "refresh" : failed.length ? "repair" : "blocked";
  const packet = {contract: "algal.shepherd-packet.v1", repository: evidence.repository, pullNumber: evidence.pullNumber,
    revision: json(evidence.revision), evidenceDigest: evidence.digest, status: evidence.status, action,
    reasons: evidence.reasons.slice(0, 20).map(reason => reason.slice(0, 512)), reasonsTruncated: evidence.reasons.length > 20 || evidence.reasons.some(reason => reason.length > 512),
    checks: evidence.checks.length, failedChecks: failed.slice(0, 8).map(check => json(check)), failedChecksTruncated: failed.length > 8,
    requiredChecks: evidence.policy.requiredChecks.slice(0, 32).map(check => json(check)), requiredChecksTruncated: evidence.policy.requiredChecks.length > 32,
    review: json(evidence.review), remoteWriteAuthorized: false};
  while (canonicalBytes(json(packet)) > 32_768) {
    if (packet.failedChecks.length) {packet.failedChecks.pop(); packet.failedChecksTruncated = true;}
    else if (packet.requiredChecks.length) {packet.requiredChecks.pop(); packet.requiredChecksTruncated = true;}
    else if (packet.reasons.length) {packet.reasons.pop(); packet.reasonsTruncated = true;}
    else throw new AlgalError("BUDGET_EXHAUSTED", "shepherd packet metadata exceeds byte bound");
  }
  return json(packet);
}

/** Host application, not a second workflow interpreter. The VM owns the loop,
 * completed work, suspension and receipts; this host owns GitHub and the clock. */
export class PullRequestShepherd {
  readonly dir: string;
  readonly events: HostEventService;
  private readonly mailboxes: FileMailboxService;
  private readonly store: FileStore;
  constructor(dir: string, private readonly transport: GitHubTransport, private readonly now: () => number = Date.now) {
    this.dir = resolve(dir); this.mailboxes = new FileMailboxService(this.dir); this.store = new FileStore(this.dir);
    this.events = new HostEventService(this.dir, this.mailboxes, {now});
  }
  private async path(name: string): Promise<string> {
    asSafeId(name, "shepherd name");
    for (const path of [this.dir, join(this.dir, "shepherds"), join(this.dir, "shepherds", name)]) await hostDirectory(path);
    return join(this.dir, "shepherds", name);
  }
  private async config(name: string): Promise<ShepherdConfig> {
    const result = parseConfig(await hostRead(join(await this.path(name), "config.json"), 32_768));
    if (result.name !== name) throw new AlgalError("RECEIPT_MISMATCH", "shepherd name mismatch");
    return result;
  }
  private async box(config: ShepherdConfig): Promise<MailboxConfig> {
    const box = await this.mailboxes.inspect(`shepherd-${config.name}`);
    if (!box) throw new AlgalError("STORE_MISS", "shepherd mailbox missing");
    return box;
  }
  private tools(config: ShepherdConfig): ToolRegistry {
    const client = new GitHubClient({repository: config.repository, pullNumber: config.pullNumber, requiredChecks: config.requiredChecks, transport: this.transport});
    return mergeToolRegistries(mailboxToolRegistry(this.mailboxes), new Map([[SHEPHERD_TOOL, {
      configurationDigest: digestCanonical(json({tool: SHEPHERD_TOOL, config})),
      signature: {inputs: {wake: {type: "json"}, previous: {type: "json"}}, outputs: {result: {type: "json"}, previous: {type: "json"}, done: {type: "text"}}, effect: "read", cost: 100, maxOutputBytes: 65_536},
      tool: async (inputs) => {
        let evidence: GitHubEvidence;
        if (inputs.previous === null) evidence = await client.collect();
        else {
          const prior = asObject(await this.store.getValue(asDigest(inputs.previous, "previous evidence reference")), "previous evidence");
          const {digest, ...body} = prior;
          if (prior.contract !== "algal.github-evidence.v1" || digestCanonical(body) !== asDigest(digest, "previous evidence digest")) throw new AlgalError("RECEIPT_MISMATCH", "previous GitHub evidence integrity failed");
          evidence = await client.refresh(prior as unknown as GitHubEvidence);
        }
        const ref = await this.store.putValue(json(evidence));
        const packet = asObject(shepherdPacket(evidence), "shepherd packet");
        return {result: {...packet, evidenceRef: ref}, previous: ref, done: evidence.status !== "pending" ? "done" : "continue"};
      },
    }]]));
  }
  private vm(config: ShepherdConfig): ProcessSupervisor { return new ProcessSupervisor(this.dir, {tools: this.tools(config), journal: true}); }
  async start(options: ShepherdOptions): Promise<ShepherdReport> {
    const config = parseConfig({contract: "algal.shepherd.v1", ...options, intervalMs: options.intervalMs ?? 30_000, maxPolls: options.maxPolls ?? 16, requiredChecks: options.requiredChecks ?? []});
    return hostLease(await this.path(config.name), `shepherd-${config.name}`, async () => {
      await hostWrite(join(await this.path(config.name), "config.json"), json(config), 32_768);
      const box = await this.mailboxes.create(`shepherd-${config.name}`, {maxMessages: 64, maxMessageBytes: 4096});
      const {round, program} = shepherdProgram(config.maxPolls);
      await this.store.putManifest(round);
      const vm = this.vm(config);
      const existing = (await vm.list()).find(item => item.process.name === config.name);
      const args = {input: {inbox: box.receive, previous: null}};
      if (existing) {
        if (existing.process.manifestDigest !== digestCanonical(manifestToJson(program)) || !same(existing.process.args, args)) throw new AlgalError("RECEIPT_MISMATCH", "shepherd process identity conflict");
      } else await vm.create(config.name, program, args, config.maxPolls + 1);
      await this.events.enqueue({source: "shepherd", deliveryId: `${config.name}:start`, target: box.send, payload: {kind: "start"}});
      return this.report(config);
    });
  }
  private async report(config: ShepherdConfig): Promise<ShepherdReport> {
    const process = await this.vm(config).inspect(config.name);
    let result: JsonValue | null = null;
    if (process.process.receipt) {
      const receipt = asObject(await hostRead(join(this.dir, "runs", `${process.process.receipt.slice(7)}.json`), 16_000_000), "receipt");
      const cells = asObject(receipt.cells, "cells");
      const watch = cells.watch ? asObject(cells.watch, "watch") : undefined;
      result = watch?.outputs ? asObject(watch.outputs, "watch outputs").result ?? null : null;
      if (result === null) {
        for (let round = config.maxPolls - 1; round >= 0; round--) {
          const raw = cells[`watch/r${round}/observe`];
          if (raw === undefined) continue;
          const cell = asObject(raw, "observation");
          if (cell.outputs !== undefined) { result = asObject(cell.outputs, "observation outputs").result ?? null; if (result !== null) break; }
        }
      }
      if (process.process.status === "complete" && result && asObject(result, "result").action === "wait") result = {...asObject(result, "result"), action: "budget-exhausted"};
    }
    const timer = (await this.events.list()).find(item => item.event.source === "shepherd-timer" && item.event.deliveryId === `${config.name}:${process.process.generation}` && item.status === "pending");
    return {config, process, result, nextTimer: timer?.event.eventId ?? null};
  }
  async inspect(name: string): Promise<ShepherdReport> { return this.report(await this.config(name)); }
  async watch(name: string, options: {maxPasses?: number; maxDurationMs?: number; signal?: AbortSignal} = {}): Promise<{report: ShepherdReport; reason: string; passes: number}> {
    const maxPasses = asInt(options.maxPasses ?? 64, "maxPasses", 1, 1024);
    const maxDurationMs = asInt(options.maxDurationMs ?? 60_000, "maxDurationMs", 1, 3_600_000);
    if (options.signal?.aborted) return {report: await this.inspect(name), reason: "cancelled", passes: 0};
    let report = await this.tick(name);
    const terminal = () => !["ready", "suspended"].includes(report.process.process.status);
    if (terminal()) return {report, reason: report.process.process.status, passes: 0};
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, {once: true});
    if (options.signal?.aborted) abort();
    try {
      const polled = await this.events.poll({maxPasses, maxDurationMs, maxDeliveries: 64, intervalMs: 1000, signal: controller.signal,
        afterPass: async (_delivered, signal) => {
          if (!signal?.aborted) {report = await this.tick(name); if (terminal()) controller.abort();}
        }});
      return {report: await this.inspect(name), reason: terminal() ? report.process.process.status : polled.reason, passes: polled.passes};
    } finally {options.signal?.removeEventListener("abort", abort);}
  }

  async tick(name: string): Promise<ShepherdReport> {
    return hostLease(await this.path(name), `shepherd-${name}`, async () => {
      const config = await this.config(name);
      await this.events.deliverDue({maxEvents: 64});
      const vm = this.vm(config);
      await vm.tick(name, true);
      const current = await vm.inspect(name);
      const deliveryId = `${name}:${current.process.generation}`;
      for (const event of await this.events.list()) {
        if (event.event.source === "shepherd-timer" && event.event.deliveryId.startsWith(`${name}:`) && (event.event.deliveryId !== deliveryId || current.process.status !== "suspended") && event.status === "pending") await this.events.cancel(event.event.eventId);
      }
      if (current.process.status === "suspended") {
        const prior = (await this.events.list()).find(item => item.event.source === "shepherd-timer" && item.event.deliveryId === deliveryId);
        if (!prior) await this.events.enqueue({source: "shepherd-timer", deliveryId, target: (await this.box(config)).send, payload: {kind: "poll"}, dueAtMs: this.now() + config.intervalMs});
      }
      return this.report(config);
    });
  }
  async wake(name: string, deliveryId: string): Promise<JsonValue> {
    const config = await this.config(name);
    return json(await this.events.enqueue({source: "shepherd-wake", deliveryId: `${name}:${asString(deliveryId, "deliveryId", 128)}`, target: (await this.box(config)).send, payload: {kind: "refresh"}}));
  }
  async verify(name: string): Promise<JsonValue> { const config = await this.config(name); return json(await this.vm(config).verify(name)); }
  async recover(name: string, expectedIntent: Digest): Promise<ShepherdReport> {
    return hostLease(await this.path(name), `shepherd-${name}`, async () => {
      const config = await this.config(name);
      await this.vm(config).recover(name, asDigest(expectedIntent, "expectedIntent"));
      return this.report(config);
    });
  }
}
