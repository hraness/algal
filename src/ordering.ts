// Ordering exploration: `algal ordering <scenario>` replays a durable-process
// setup under every dispatch-and-delivery ordering inside a bounded search
// space and checks an invariant over each terminal state. The scenario is a
// versioned `algal.ordering-scenario.v1` value: named mailboxes, named
// processes (manifest + args), a bounded set of external sends, an
// `algal.expr.v1` invariant over {"processes","mailboxes"}, and the limits
// that bound the search. Every process dispatch is charged to a habitat
// account — the closed `algal.habitat-budget.v1` record is part of the
// report, so exhaustion is recorded, never silent. The result is a bounded
// `algal.ordering-report.v1` listing each ordering tried, its terminal state,
// and the first counterexample ordering, if any.
//
// Determinism: capability handles derive from the scenario by digest, not
// from randomness, so one scenario file reproduces one report bit-for-bit.
// The explorer simulates the supervisor's dispatch semantics (first dispatch
// runs the manifest; later dispatches resume the checkpointed receipt) — it
// does not exercise the on-disk supervisor.

import {
  capabilityHandle,
  parseCapabilityHandle,
  suspensionDetails,
  type CapabilityHandle,
} from "./capabilities";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { digestCanonical, asDigest, type Digest } from "./digest";
import { scriptedExecutor, type Executor } from "./effects";
import { AlgalError } from "./errors";
import {
  checkProgram,
  evalProgram,
  parseExprEnvelope,
  type ExprEnvelope,
} from "./expr";
import { compileOrganism } from "./graph";
import {
  HabitatAccount,
  parseHabitatBudget,
  parseHabitatLimits,
  type HabitatBudget,
  type HabitatLimits,
} from "./habitat-budget";
import {
  mailboxToolRegistry,
  MAILBOX_RECEIVE,
  MAILBOX_SEND,
  type MailboxService,
  type MailboxConfig,
} from "./mailbox";
import { builtinRegistry, type FnRegistry } from "./registry";
import { runOrganism, type RunReceipt } from "./run";
import { MemoryStore } from "./store-memory";
import type { Store } from "./store-contract";
import {
  asArray,
  asInt,
  asJsonValue,
  asObject,
  asSafeId,
  asString,
  canonicalBytes,
  noUnknownKeys,
  optField,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";
import { resumeRun } from "./verify";

export const ORDERING_SCENARIO_CONTRACT = "algal.ordering-scenario.v1" as const;
export const ORDERING_REPORT_CONTRACT = "algal.ordering-report.v1" as const;
/** Descriptor contract for deterministically derived capability nonces. */
const ORDERING_MAILBOX_CONTRACT = "algal.ordering-mailbox.v1" as const;

export const ORDERING_BOUNDS = {
  maxScenarioBytes: 1_048_576,
  maxReportBytes: 1_048_576,
  maxMailboxes: 8,
  maxProcesses: 8,
  maxSends: 32,
  maxOrderings: 64,
  maxDepth: 64,
  maxMailboxMessages: 64,
  maxMessageBytes: 65_536,
  maxNameLen: 64,
  maxActionLen: 128,
  maxActions: 64,
  invariantFuel: 100_000,
} as const;

// ---------------------------------------------------------------- types ---

export type OrderingLimits = HabitatLimits & { orderings: number; depth: number };

export type OrderingScenario = {
  contract: typeof ORDERING_SCENARIO_CONTRACT;
  mailboxes: { name: string; maxMessages: number; maxMessageBytes: number }[];
  processes: {
    name: string;
    manifest: OrganismManifest;
    args: Record<string, Record<string, JsonValue>>;
  }[];
  sends: { mailbox: string; value: JsonValue; key: Digest }[];
  invariant: ExprEnvelope;
  limits: OrderingLimits;
  /** Scripted executor responses keyed by cell id or request digest — the
   * only provider answers the exploration admits. */
  responses: Record<string, JsonValue>;
};

export type OrderingRow = {
  /** The action labels in the order this exploration took them:
   * `send:<index>` or `tick:<process>`. */
  actions: string[];
  /** True when no action remained enabled — every process terminal or
   * blocked with no pending delivery and no send left. */
  quiescent: boolean;
  /** The invariant's value over the terminal state — null only for a
   * budget-stopped partial ordering. */
  invariant: boolean | null;
  processes: {
    name: string;
    status: string;
    generation: number;
    /** Intrinsic digest of the last receipt the process recorded. */
    receipt: Digest | null;
  }[];
  mailboxes: { name: string; pending: number; delivered: number }[];
};

export type OrderingReport = {
  contract: typeof ORDERING_REPORT_CONTRACT;
  /** Canonical digest of the scenario JSON as supplied. */
  scenario: Digest;
  limits: OrderingLimits;
  orderings: OrderingRow[];
  /** Index into `orderings` of the first ordering whose invariant evaluated
   * false — the counterexample witness. Null when none failed. */
  counterexample: number | null;
  outcome: "complete" | "counterexample" | "exhausted";
  /** Present exactly when outcome is "exhausted": the bound that stopped the
   * search with unexplored orderings remaining. */
  exhaustion: { reason: "orderings" | "budget"; detail?: string } | null;
  /** The closed habitat account every dispatch was charged to. */
  account: HabitatBudget;
};

// ------------------------------------------------- deterministic mailbox ---

/** The capability descriptor a capabilityHandle digests — identical in shape
 * to the file and memory drivers so handles interoperate at the boundary. */
function capabilityRecord(
  capability: string,
  mailbox: string,
  nonce: string,
): { handle: CapabilityHandle; mailbox: string; revoked: boolean } {
  return {
    handle: capabilityHandle(capability, {
      capability,
      contract: "algal.capability.v1",
      mailbox,
      nonce,
    }),
    mailbox,
    revoked: false,
  };
}

/** A `MailboxService` whose capability handles derive from the mailbox name,
 * not from a random nonce: one scenario produces the same args, the same
 * request digests, the same receipts, and the same report on every run.
 * Delivery order within a mailbox follows the file driver's rule — the
 * lowest sorted idempotency key — and send/receive/hasPending keep the file
 * driver's checks and effects. */
export class DeterministicMailboxService implements MailboxService {
  private configs = new Map<string, MailboxConfig>();
  private records = new Map<
    CapabilityHandle,
    { mailbox: string; revoked: boolean }
  >();
  private pending = new Map<string, Map<Digest, { id: Digest; value: JsonValue }>>();
  private claimed = new Map<string, Map<Digest, Digest>>(); // idempotencyKey → id
  private delivered = new Map<string, number>();

  async create(
    name: string,
    options?: { maxMessages?: number; maxMessageBytes?: number },
  ): Promise<MailboxConfig> {
    const checked = asSafeId(name, "mailbox name");
    const maxMessages = asInt(options?.maxMessages ?? 64, "mailbox maxMessages", 1, ORDERING_BOUNDS.maxMailboxMessages);
    const maxMessageBytes = asInt(options?.maxMessageBytes ?? 65_536, "mailbox maxMessageBytes", 1, ORDERING_BOUNDS.maxMessageBytes);
    const existing = this.configs.get(checked);
    if (existing) {
      if (existing.maxMessages !== maxMessages || existing.maxMessageBytes !== maxMessageBytes) {
        throw new AlgalError("PARSE_FAILED", `mailbox "${checked}" already has different bounds`);
      }
      return structuredClone(existing);
    }
    if (this.configs.size >= ORDERING_BOUNDS.maxMailboxes) {
      throw new AlgalError("BUDGET_EXHAUSTED", "mailbox count exhausted");
    }
    const base = digestCanonical({
      contract: ORDERING_MAILBOX_CONTRACT,
      mailbox: checked,
    } as JsonValue).slice(7);
    const send = capabilityRecord(MAILBOX_SEND, checked, `${base}-send`);
    const receive = capabilityRecord(MAILBOX_RECEIVE, checked, `${base}-receive`);
    const config: MailboxConfig = {
      contract: "algal.mailbox.v1",
      name: checked,
      maxMessages,
      maxMessageBytes,
      send: send.handle,
      receive: receive.handle,
    };
    this.configs.set(checked, config);
    this.records.set(send.handle, send);
    this.records.set(receive.handle, receive);
    this.pending.set(checked, new Map());
    this.claimed.set(checked, new Map());
    this.delivered.set(checked, 0);
    return structuredClone(config);
  }

  async list(): Promise<MailboxConfig[]> {
    return [...this.configs.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((config) => structuredClone(config));
  }

  async inspect(name: string): Promise<MailboxConfig | undefined> {
    return structuredClone(this.configs.get(asSafeId(name, "mailbox name")));
  }

  async revoke(handle: CapabilityHandle): Promise<void> {
    const record = this.records.get(parseCapabilityHandle(handle).handle);
    if (!record) {
      throw new AlgalError("CAPABILITY_DENIED", "capability is not admitted");
    }
    record.revoked = true;
  }

  private resolve(handle: CapabilityHandle, expected: string): MailboxConfig {
    const parsed = parseCapabilityHandle(handle, expected);
    const record = this.records.get(parsed.handle);
    if (!record || record.revoked) {
      throw new AlgalError("CAPABILITY_DENIED", "capability is not active");
    }
    const config = this.configs.get(record.mailbox);
    const key = expected === MAILBOX_SEND ? "send" : "receive";
    if (!config || config[key] !== handle) {
      throw new AlgalError("CAPABILITY_DENIED", "capability admission does not match its mailbox");
    }
    return config;
  }

  async send(
    handle: CapabilityHandle,
    value: JsonValue,
    idempotencyKey: Digest,
  ): Promise<{ id: Digest }> {
    idempotencyKey = asDigest(idempotencyKey, "mailbox idempotency key");
    value = asJsonValue(value, "mailbox message");
    const config = this.resolve(handle, MAILBOX_SEND);
    const bytes = canonicalBytes(value);
    if (bytes > config.maxMessageBytes) {
      throw new AlgalError("BUDGET_EXHAUSTED", `mailbox message ${bytes}B exceeds ${config.maxMessageBytes}B`);
    }
    const id = digestCanonical({
      contract: "algal.mailbox-message.v1",
      idempotencyKey,
      mailbox: config.name,
      value,
    } as JsonValue);
    const claimed = this.claimed.get(config.name)!;
    const existing = claimed.get(idempotencyKey);
    if (existing !== undefined) {
      if (existing !== id) {
        throw new AlgalError("DIGEST_MISMATCH", "idempotency key already claims a different mailbox message");
      }
      return { id };
    }
    const queue = this.pending.get(config.name)!;
    if (queue.size >= config.maxMessages) {
      throw new AlgalError("MAILBOX_FULL", `mailbox "${config.name}" is full`);
    }
    claimed.set(idempotencyKey, id);
    queue.set(idempotencyKey, { id, value: structuredClone(value) });
    return { id };
  }

  async receive(handle: CapabilityHandle): Promise<{ id: Digest; message: JsonValue }> {
    const config = this.resolve(handle, MAILBOX_RECEIVE);
    const queue = this.pending.get(config.name)!;
    const delivery = [...queue.keys()].sort()[0];
    if (!delivery) {
      throw new AlgalError(
        "EFFECT_SUSPENDED",
        `mailbox "${config.name}" is empty`,
        suspensionDetails(handle),
      );
    }
    const message = queue.get(delivery)!;
    queue.delete(delivery);
    this.delivered.set(config.name, this.delivered.get(config.name)! + 1);
    return { id: message.id, message: structuredClone(message.value) };
  }

  async hasPending(handle: CapabilityHandle): Promise<boolean> {
    const config = this.resolve(handle, MAILBOX_RECEIVE);
    return this.pending.get(config.name)!.size > 0;
  }

  /** Counts for the report's terminal state. */
  counts(name: string): { pending: number; delivered: number } {
    return {
      pending: this.pending.get(name)?.size ?? 0,
      delivered: this.delivered.get(name) ?? 0,
    };
  }

  /** True while a send can still queue on the mailbox — a full mailbox means
   * the delivery waits for the consumers, never throws mid-exploration. */
  hasCapacity(name: string): boolean {
    const config = this.configs.get(name);
    return config !== undefined &&
      (this.pending.get(name)?.size ?? 0) < config.maxMessages;
  }
}

// ------------------------------------------------------------- scenario ---

const MAILBOX_ARG = /^mailbox:([a-z][a-z0-9-]{0,63}):(send|receive)$/;

/** Args carry `mailbox:<name>:<access>` markers in place of capability
 * handles; the marker resolves against the scenario's mailboxes at setup.
 * Only string values on declared `cap` input ports are markers — any other
 * string passes through unchanged. */
function resolveArgs(
  args: Record<string, Record<string, JsonValue>>,
  manifest: OrganismManifest,
  handles: Map<string, MailboxConfig>,
): Record<string, Record<string, JsonValue>> {
  const capPorts = new Map<string, Set<string>>(); // cellId → cap port names
  for (const cell of manifest.cells) {
    if (cell.kind !== "input") continue;
    const ports = new Set<string>();
    for (const [port, decl] of Object.entries(cell.outputs)) {
      if (decl.type === "cap") ports.add(port);
    }
    if (ports.size > 0) capPorts.set(cell.id, ports);
  }
  const out: Record<string, Record<string, JsonValue>> = {};
  for (const [cell, ports] of Object.entries(args)) {
    out[cell] = {};
    for (const [port, value] of Object.entries(ports)) {
      if (capPorts.get(cell)?.has(port) && typeof value === "string") {
        const marker = MAILBOX_ARG.exec(value);
        if (marker) {
          const config = handles.get(marker[1]!);
          if (!config) {
            throw new AlgalError(
              "PARSE_FAILED",
              `args ${cell}.${port} reference unknown mailbox "${marker[1]}"`,
            );
          }
          out[cell]![port] = marker[2] === "send" ? config.send : config.receive;
          continue;
        }
      }
      out[cell]![port] = value;
    }
  }
  return out;
}

/** Parse and admit an `algal.ordering-scenario.v1`. Every manifest is
 * compiled once here — a scenario whose programs never run is a usage error,
 * not a report row. */
export async function parseOrderingScenario(
  u: unknown,
  fns: FnRegistry = builtinRegistry(),
): Promise<OrderingScenario> {
  if (canonicalBytes(asJsonValue(u, "ordering scenario")) > ORDERING_BOUNDS.maxScenarioBytes) {
    throw new AlgalError("PARSE_FAILED", "ordering scenario exceeds its byte bound");
  }
  const o = asObject(u, "ordering scenario");
  noUnknownKeys(
    o,
    ["contract", "mailboxes", "processes", "sends", "invariant", "limits", "responses"],
    "ordering scenario",
  );
  if (o.contract !== ORDERING_SCENARIO_CONTRACT) {
    throw new AlgalError("PARSE_FAILED", `expected contract "${ORDERING_SCENARIO_CONTRACT}"`);
  }

  const mailboxesRaw = asArray(reqField(o, "mailboxes", "ordering scenario"), "mailboxes");
  if (mailboxesRaw.length < 1 || mailboxesRaw.length > ORDERING_BOUNDS.maxMailboxes) {
    throw new AlgalError("PARSE_FAILED", `mailboxes must contain 1..${ORDERING_BOUNDS.maxMailboxes} entries`);
  }
  const mailboxes = mailboxesRaw.map((entry, index) => {
    const e = asObject(entry, `mailboxes[${index}]`);
    noUnknownKeys(e, ["name", "maxMessages", "maxMessageBytes"], `mailboxes[${index}]`);
    return {
      name: asSafeId(reqField(e, "name", `mailboxes[${index}]`), `mailboxes[${index}].name`),
      maxMessages: asInt(reqField(e, "maxMessages", `mailboxes[${index}]`), `mailboxes[${index}].maxMessages`, 1, ORDERING_BOUNDS.maxMailboxMessages),
      maxMessageBytes: asInt(reqField(e, "maxMessageBytes", `mailboxes[${index}]`), `mailboxes[${index}].maxMessageBytes`, 1, ORDERING_BOUNDS.maxMessageBytes),
    };
  });
  if (new Set(mailboxes.map((m) => m.name)).size !== mailboxes.length) {
    throw new AlgalError("PARSE_FAILED", "mailbox names must be unique");
  }
  const mailboxByName = new Map(mailboxes.map((m) => [m.name, m]));

  const processesRaw = asArray(reqField(o, "processes", "ordering scenario"), "processes");
  if (processesRaw.length < 1 || processesRaw.length > ORDERING_BOUNDS.maxProcesses) {
    throw new AlgalError("PARSE_FAILED", `processes must contain 1..${ORDERING_BOUNDS.maxProcesses} entries`);
  }
  const processes = processesRaw.map((entry, index) => {
    const at = `processes[${index}]`;
    const e = asObject(entry, at);
    noUnknownKeys(e, ["name", "manifest", "args"], at);
    const manifest = parseOrganismManifest(reqField(e, "manifest", at));
    const argsRaw = asObject(reqField(e, "args", at), `${at}.args`);
    const args: Record<string, Record<string, JsonValue>> = {};
    for (const [cell, ports] of Object.entries(argsRaw)) {
      const p = asObject(ports, `${at}.args.${cell}`);
      args[cell] = {};
      for (const [port, value] of Object.entries(p)) {
        args[cell]![port] = asJsonValue(value, `${at}.args.${cell}.${port}`);
      }
    }
    return {
      name: asSafeId(reqField(e, "name", at), `${at}.name`),
      manifest,
      args,
    };
  });
  const processNames = processes.map((p) => p.name);
  if (new Set(processNames).size !== processes.length) {
    throw new AlgalError("PARSE_FAILED", "process names must be unique");
  }

  const sendsRaw = asArray(reqField(o, "sends", "ordering scenario"), "sends");
  if (sendsRaw.length > ORDERING_BOUNDS.maxSends) {
    throw new AlgalError("PARSE_FAILED", `sends must contain at most ${ORDERING_BOUNDS.maxSends} entries`);
  }
  const sendKeys = new Set<string>();
  const sends = sendsRaw.map((entry, index) => {
    const at = `sends[${index}]`;
    const e = asObject(entry, at);
    noUnknownKeys(e, ["mailbox", "value", "key"], at);
    const mailbox = asSafeId(reqField(e, "mailbox", at), `${at}.mailbox`);
    const config = mailboxByName.get(mailbox);
    if (!config) {
      throw new AlgalError("PARSE_FAILED", `sends[${index}] names unknown mailbox "${mailbox}"`);
    }
    const value = asJsonValue(reqField(e, "value", at), `${at}.value`);
    if (canonicalBytes(value) > config.maxMessageBytes) {
      throw new AlgalError("BUDGET_EXHAUSTED", `sends[${index}] value exceeds ${config.maxMessageBytes}B`);
    }
    const key = asDigest(reqField(e, "key", at), `${at}.key`);
    const claim = `${mailbox}:${key}`;
    if (sendKeys.has(claim)) {
      throw new AlgalError("PARSE_FAILED", `duplicate send idempotency key for mailbox "${mailbox}"`);
    }
    sendKeys.add(claim);
    return { mailbox, value, key };
  });

  const invariant = parseExprEnvelope(reqField(o, "invariant", "ordering scenario"), "invariant");
  const check = checkProgram(invariant.program, ["processes", "mailboxes"]);
  if (!check.ok) {
    throw new AlgalError("EXPR_FAILED", `ordering invariant does not check: ${check.err.message}`);
  }

  const limitsRaw = asObject(reqField(o, "limits", "ordering scenario"), "limits");
  noUnknownKeys(limitsRaw, ["orderings", "depth", "work", "attempts", "runs"], "limits");
  const limits: OrderingLimits = {
    ...parseHabitatLimits({ work: limitsRaw.work, attempts: limitsRaw.attempts, runs: limitsRaw.runs }),
    orderings: asInt(reqField(limitsRaw, "orderings", "limits"), "limits.orderings", 1, ORDERING_BOUNDS.maxOrderings),
    depth: asInt(reqField(limitsRaw, "depth", "limits"), "limits.depth", 1, ORDERING_BOUNDS.maxDepth),
  };

  const responsesRaw = optField(o, "responses");
  const responses: Record<string, JsonValue> = {};
  if (responsesRaw !== undefined) {
    const r = asObject(responsesRaw, "responses");
    for (const [key, value] of Object.entries(r)) {
      responses[asString(key, "responses key", 256)] = asJsonValue(value, `responses.${key}`);
    }
  }

  // Admit every manifest up front against an empty ordering environment:
  // capability handles resolve identically at run time because the service
  // derives them deterministically.
  const probe = new DeterministicMailboxService();
  const probeConfigs = new Map<string, MailboxConfig>();
  for (const mailbox of mailboxes) {
    probeConfigs.set(mailbox.name, await probe.create(mailbox.name, mailbox));
  }
  const tools = mailboxToolRegistry(probe);
  const probeStore = new MemoryStore();
  for (const process of processes) {
    // Markers resolve at admission: a scenario naming an unknown mailbox is a
    // usage error, never a mid-exploration surprise.
    resolveArgs(process.args, process.manifest, probeConfigs);
    await compileOrganism(process.manifest, fns, probeStore, 0, undefined, tools);
  }

  return {
    contract: ORDERING_SCENARIO_CONTRACT,
    mailboxes,
    processes,
    sends,
    invariant,
    limits,
    responses,
  };
}

// ------------------------------------------------------------- explorer ---

type ProcState = {
  name: string;
  manifest: OrganismManifest;
  manifestDigest: Digest;
  args: Record<string, Record<string, JsonValue>>;
  status: "ready" | "suspended" | "complete" | "failed" | "stuck";
  generation: number;
  wake: CapabilityHandle[];
  checkpoint: RunReceipt | null;
  /** Storage digest of the last receipt — the identity the evidence store
   * and the habitat account record under. */
  receipt: Digest | null;
};

type OrderingAction =
  | { kind: "send"; index: number }
  | { kind: "tick"; process: string };

function actionLabel(action: OrderingAction): string {
  return action.kind === "send" ? `send:${action.index}` : `tick:${action.process}`;
}

/** The enabled actions at a state, in the order the explorer enumerates
 * them: every unsent declared send by index, then every dispatchable process
 * by name — ready processes and suspended processes with a pending wake. */
async function enabledActions(
  scenario: OrderingScenario,
  sent: Set<number>,
  procs: Map<string, ProcState>,
  mailboxes: DeterministicMailboxService,
): Promise<OrderingAction[]> {
  const actions: OrderingAction[] = [];
  for (let index = 0; index < scenario.sends.length; index++) {
    // A send waits while its mailbox is full — it stays an open branch in
    // the ordering space but cannot force a delivery that would throw.
    if (!sent.has(index) && mailboxes.hasCapacity(scenario.sends[index]!.mailbox)) {
      actions.push({ kind: "send", index });
    }
  }
  for (const proc of [...procs.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    if (proc.status === "ready") {
      actions.push({ kind: "tick", process: proc.name });
      continue;
    }
    if (proc.status !== "suspended") continue;
    for (const handle of proc.wake) {
      let mailboxWake = false;
      try {
        mailboxWake = parseCapabilityHandle(handle).capability === MAILBOX_RECEIVE;
      } catch {
        mailboxWake = false;
      }
      if (mailboxWake && (await mailboxes.hasPending(handle))) {
        actions.push({ kind: "tick", process: proc.name });
        break;
      }
    }
  }
  return actions;
}

type SimulateOutcome =
  | { kind: "invalid" }
  | {
      kind: "budget";
      labels: string[];
      procs: ProcState[];
      mailboxes: DeterministicMailboxService;
    }
  | {
      kind: "leaf";
      labels: string[];
      quiescent: boolean;
      procs: ProcState[];
      mailboxes: DeterministicMailboxService;
    }
  | {
      kind: "internal";
      labels: string[];
      enabledCount: number;
      procs: ProcState[];
      mailboxes: DeterministicMailboxService;
    };

/** Run one action sequence from a fresh environment. A vector longer than
 * the reachable trace is invalid; a vector consumed while actions remain
 * enabled reports the enabled count for expansion; a vector ending on a
 * quiescent state or the depth bound is a leaf. A refused reservation ends
 * the simulation — and the exploration — at once. */
async function simulate(
  scenario: OrderingScenario,
  choices: readonly number[],
  account: HabitatAccount,
  fns: FnRegistry,
  evidence: Store | null,
  receipts: RunReceipt[],
): Promise<SimulateOutcome> {
  const store = new MemoryStore();
  const mailboxes = new DeterministicMailboxService();
  const mailboxConfigs = new Map<string, MailboxConfig>();
  for (const mailbox of scenario.mailboxes) {
    mailboxConfigs.set(mailbox.name, await mailboxes.create(mailbox.name, mailbox));
  }
  const tools = mailboxToolRegistry(mailboxes);
  const executors: Executor[] = [scriptedExecutor(structuredClone(scenario.responses))];

  const procs = new Map<string, ProcState>();
  for (const declared of scenario.processes) {
    const manifestDigest = digestCanonical(manifestToJson(declared.manifest) as JsonValue);
    await store.putManifest(declared.manifest);
    if (evidence) await evidence.putManifest(declared.manifest);
    procs.set(declared.name, {
      name: declared.name,
      manifest: declared.manifest,
      manifestDigest,
      args: resolveArgs(declared.args, declared.manifest, mailboxConfigs),
      status: "ready",
      generation: 0,
      wake: [],
      checkpoint: null,
      receipt: null,
    });
  }

  const sent = new Set<number>();
  const labels: string[] = [];
  let enabled = await enabledActions(scenario, sent, procs, mailboxes);

  for (let step = 0; step < scenario.limits.depth; step++) {
    if (enabled.length === 0) {
      return { kind: "leaf", labels, quiescent: true, procs: [...procs.values()], mailboxes };
    }
    if (step >= choices.length) {
      return { kind: "internal", labels, enabledCount: enabled.length, procs: [...procs.values()], mailboxes };
    }
    const pick = choices[step]!;
    if (pick < 0 || pick >= enabled.length) return { kind: "invalid" };
    const action = enabled[pick]!;
    labels.push(actionLabel(action));

    if (action.kind === "send") {
      const send = scenario.sends[action.index]!;
      await mailboxes.send(mailboxConfigs.get(send.mailbox)!.send, send.value, send.key);
      sent.add(action.index);
    } else {
      const proc = procs.get(action.process)!;
      let receipt: RunReceipt;
      let receiptDigest: Digest;
      try {
        const admitted = await account.admit(
          {
            manifest: proc.manifestDigest,
            budgets: proc.manifest.budgets,
            args: proc.args,
          },
          async () => {
            if (proc.checkpoint === null) {
              return await runOrganism({
                manifest: proc.manifest,
                args: proc.args,
                fns,
                store,
                executors,
                tools,
                processName: proc.name,
              });
            }
            return await resumeRun(
              proc.checkpoint as unknown as JsonValue,
              manifestToJson(proc.manifest) as JsonValue,
              store,
              executors,
              fns,
              undefined,
              tools,
              { processName: proc.name },
            );
          },
          store,
        );
        receipt = admitted.receipt;
        receiptDigest = admitted.receiptDigest;
      } catch (error) {
        // A refused reservation exhausts the account itself — that ends the
        // exploration. Any other budget error is the run's own outcome or a
        // scenario error, and propagates.
        if (
          error instanceof AlgalError &&
          error.code === "BUDGET_EXHAUSTED" &&
          account.exhausted
        ) {
          return {
            kind: "budget",
            labels,
            procs: [...procs.values()],
            mailboxes,
          };
        }
        throw error;
      }
      receipts.push(receipt);
      if (evidence) await evidence.putReceipt(receipt as unknown as JsonValue);
      proc.generation += 1;
      proc.checkpoint = receipt;
      proc.receipt = receiptDigest;
      proc.status = receipt.outcome;
      proc.wake = [
        ...new Set(
          receipt.effects.flatMap((effect) => effect.wake ?? []),
        ),
      ];
    }
    enabled = await enabledActions(scenario, sent, procs, mailboxes);
  }
  return { kind: "leaf", labels, quiescent: false, procs: [...procs.values()], mailboxes };
}

function terminalRow(
  labels: string[],
  quiescent: boolean,
  invariant: boolean | null,
  procs: ProcState[],
  mailboxes: DeterministicMailboxService,
  names: string[],
): OrderingRow {
  return {
    actions: labels,
    quiescent,
    invariant,
    processes: procs
      .map((proc) => ({
        name: proc.name,
        status: proc.status,
        generation: proc.generation,
        receipt: proc.receipt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    mailboxes: names
      .map((name) => ({ name, ...mailboxes.counts(name) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function invariantEnv(row: OrderingRow): JsonObject {
  return {
    processes: Object.fromEntries(
      row.processes.map((proc) => [
        proc.name,
        {
          status: proc.status,
          generation: proc.generation,
          receipt: proc.receipt,
        },
      ]),
    ),
    mailboxes: Object.fromEntries(
      row.mailboxes.map((mailbox) => [
        mailbox.name,
        { pending: mailbox.pending, delivered: mailbox.delivered },
      ]),
    ),
  };
}

export type OrderingResult = {
  report: OrderingReport;
  /** Every dispatch receipt the exploration produced, in dispatch order —
   * already stored in `evidence` when a store was passed. */
  receipts: RunReceipt[];
};

/** Enumerate the scenario's orderings in deterministic depth-first order,
 * bounded by `limits.orderings` and `limits.depth`, charging every dispatch
 * to a single habitat account. Exploration stops on the first failing
 * ordering (`counterexample`), on an exhausted reservation or ordering bound
 * (`exhausted`), or when the bounded space is fully enumerated (`complete`). */
export async function exploreOrdering(
  value: unknown,
  options: {
    /** Evidence sink: every manifest and dispatch receipt is stored here. */
    store?: Store;
    fns?: FnRegistry;
  } = {},
): Promise<OrderingResult> {
  const scenarioDigest = digestCanonical(asJsonValue(value, "ordering scenario"));
  const scenario = await parseOrderingScenario(value, options.fns);
  const account = new HabitatAccount("experiment", {
    work: scenario.limits.work,
    attempts: scenario.limits.attempts,
    runs: scenario.limits.runs,
  });
  const evidence = options.store ?? null;
  const receipts: RunReceipt[] = [];
  const rows: OrderingRow[] = [];

  const frontier: number[][] = [[]];
  let outcome: OrderingReport["outcome"] = "complete";
  let exhaustion: OrderingReport["exhaustion"] = null;
  let counterexample: number | null = null;

  while (frontier.length > 0 && rows.length < scenario.limits.orderings) {
    const choices = frontier.pop()!;
    const sim = await simulate(
      scenario, choices, account, options.fns ?? builtinRegistry(), evidence, receipts,
    );

    if (sim.kind === "invalid") continue;
    if (sim.kind === "budget") {
      // The refused dispatch is still recorded: a partial row carries the
      // actions taken and the state the search reached.
      rows.push(terminalRow(
        sim.labels,
        false,
        null,
        sim.procs,
        sim.mailboxes,
        scenario.mailboxes.map((mailbox) => mailbox.name),
      ));
      outcome = "exhausted";
      exhaustion = { reason: "budget", detail: "a dispatch reservation was refused mid-ordering" };
      break;
    }

    if (sim.kind === "internal") {
      // The prefix consumed `choices` and still had enabled actions: expand.
      for (let i = sim.enabledCount - 1; i >= 0; i--) {
        frontier.push([...choices, i]);
      }
      continue;
    }

    const row = terminalRow(
      sim.labels,
      sim.quiescent,
      null,
      sim.procs,
      sim.mailboxes,
      scenario.mailboxes.map((mailbox) => mailbox.name),
    );

    // Leaf: evaluate the invariant over the terminal state.
    const result = evalProgram(
      scenario.invariant.program,
      invariantEnv(row),
      ORDERING_BOUNDS.invariantFuel,
    );
    if (!result.ok || typeof result.value !== "boolean") {
      throw new AlgalError(
        "EXPR_FAILED",
        `ordering invariant must evaluate to a boolean over each terminal state: ${
          result.ok ? "returned a non-boolean" : result.err.message
        }`,
      );
    }
    row.invariant = result.value;
    rows.push(row);
    if (result.value === false) {
      counterexample = rows.length - 1;
      outcome = "counterexample";
      break;
    }
  }

  // The loop ends on a counterexample or budget stop (both recorded), on the
  // ordering bound with frontier remaining (exhausted), or on an emptied
  // frontier (complete — every sequence up to `limits.depth` was tried).
  if (outcome === "complete" && frontier.length > 0) {
    outcome = "exhausted";
    exhaustion = {
      reason: "orderings",
      detail: `ordering bound ${scenario.limits.orderings} reached with unexplored orderings`,
    };
  }

  return {
    report: parseOrderingReport({
      contract: ORDERING_REPORT_CONTRACT,
      scenario: scenarioDigest,
      limits: scenario.limits,
      orderings: rows,
      counterexample,
      outcome,
      exhaustion,
      account: account.record(),
    }),
    receipts,
  };
}

// ----------------------------------------------------------------- parse ---

function parseRow(u: unknown, index: number, depthBound: number): OrderingRow {
  const at = `orderings[${index}]`;
  const o = asObject(u, at);
  noUnknownKeys(o, ["actions", "quiescent", "invariant", "processes", "mailboxes"], at);
  const actionsRaw = asArray(reqField(o, "actions", at), `${at}.actions`);
  if (actionsRaw.length > Math.min(depthBound, ORDERING_BOUNDS.maxActions)) {
    throw new AlgalError("PARSE_FAILED", `${at}.actions exceeds the depth bound`);
  }
  const actions = actionsRaw.map((action, i) => {
    const label = asString(action, `${at}.actions[${i}]`, ORDERING_BOUNDS.maxActionLen);
    if (!/^(send:[0-9]+|tick:[a-z][a-z0-9-]{0,63})$/.test(label)) {
      throw new AlgalError("PARSE_FAILED", `${at}.actions[${i}] is not an action label`);
    }
    return label;
  });
  if (reqField(o, "quiescent", at) !== true && reqField(o, "quiescent", at) !== false) {
    throw new AlgalError("PARSE_FAILED", `${at}.quiescent must be a boolean`);
  }
  const invariantRaw = reqField(o, "invariant", at);
  if (invariantRaw !== null && typeof invariantRaw !== "boolean") {
    throw new AlgalError("PARSE_FAILED", `${at}.invariant must be a boolean or null`);
  }
  const processesRaw = asArray(reqField(o, "processes", at), `${at}.processes`);
  if (processesRaw.length > ORDERING_BOUNDS.maxProcesses) {
    throw new AlgalError("PARSE_FAILED", `${at}.processes exceeds the bound`);
  }
  const processes = processesRaw.map((entry, i) => {
    const e = asObject(entry, `${at}.processes[${i}]`);
    noUnknownKeys(e, ["name", "status", "generation", "receipt"], `${at}.processes[${i}]`);
    const receipt = reqField(e, "receipt", `${at}.processes[${i}]`);
    if (receipt !== null) asDigest(receipt, `${at}.processes[${i}].receipt`);
    return {
      name: asSafeId(reqField(e, "name", `${at}.processes[${i}]`), `${at}.processes[${i}].name`),
      status: asString(reqField(e, "status", `${at}.processes[${i}]`), `${at}.processes[${i}].status`, 32),
      generation: asInt(reqField(e, "generation", `${at}.processes[${i}]`), `${at}.processes[${i}].generation`, 0, 64),
      receipt: receipt === null ? null : (receipt as Digest),
    };
  });
  const mailboxesRaw = asArray(reqField(o, "mailboxes", at), `${at}.mailboxes`);
  if (mailboxesRaw.length > ORDERING_BOUNDS.maxMailboxes) {
    throw new AlgalError("PARSE_FAILED", `${at}.mailboxes exceeds the bound`);
  }
  const mailboxes = mailboxesRaw.map((entry, i) => {
    const e = asObject(entry, `${at}.mailboxes[${i}]`);
    noUnknownKeys(e, ["name", "pending", "delivered"], `${at}.mailboxes[${i}]`);
    return {
      name: asSafeId(reqField(e, "name", `${at}.mailboxes[${i}]`), `${at}.mailboxes[${i}].name`),
      pending: asInt(reqField(e, "pending", `${at}.mailboxes[${i}]`), `${at}.mailboxes[${i}].pending`, 0, ORDERING_BOUNDS.maxMailboxMessages),
      delivered: asInt(reqField(e, "delivered", `${at}.mailboxes[${i}]`), `${at}.mailboxes[${i}].delivered`, 0, ORDERING_BOUNDS.maxSends),
    };
  });
  return {
    actions,
    quiescent: reqField(o, "quiescent", at) === true,
    invariant: invariantRaw as boolean | null,
    processes,
    mailboxes,
  };
}

/** Parse an `algal.ordering-report.v1` from `unknown`: closed objects,
 * bounds, and the coherence rules a forged record cannot pass — a
 * counterexample must name a failing row that no earlier row precedes, and
 * the outcome must match its evidence fields. */
export function parseOrderingReport(u: unknown): OrderingReport {
  if (canonicalBytes(asJsonValue(u, "ordering report")) > ORDERING_BOUNDS.maxReportBytes) {
    throw new AlgalError("PARSE_FAILED", "ordering report exceeds its byte bound");
  }
  const o = asObject(u, "ordering report");
  noUnknownKeys(
    o,
    ["contract", "scenario", "limits", "orderings", "counterexample", "outcome", "exhaustion", "account"],
    "ordering report",
  );
  if (o.contract !== ORDERING_REPORT_CONTRACT) {
    throw new AlgalError("PARSE_FAILED", `expected contract "${ORDERING_REPORT_CONTRACT}"`);
  }
  const limitsRaw = asObject(reqField(o, "limits", "ordering report"), "limits");
  noUnknownKeys(limitsRaw, ["orderings", "depth", "work", "attempts", "runs"], "limits");
  const limits: OrderingLimits = {
    ...parseHabitatLimits({ work: limitsRaw.work, attempts: limitsRaw.attempts, runs: limitsRaw.runs }),
    orderings: asInt(reqField(limitsRaw, "orderings", "limits"), "limits.orderings", 1, ORDERING_BOUNDS.maxOrderings),
    depth: asInt(reqField(limitsRaw, "depth", "limits"), "limits.depth", 1, ORDERING_BOUNDS.maxDepth),
  };

  const rowsRaw = asArray(reqField(o, "orderings", "ordering report"), "orderings");
  if (rowsRaw.length > limits.orderings) {
    throw new AlgalError("PARSE_FAILED", "orderings exceed the declared bound");
  }
  const orderings = rowsRaw.map((row, index) => parseRow(row, index, limits.depth));

  const counterexampleRaw = reqField(o, "counterexample", "ordering report");
  let counterexample: number | null = null;
  if (counterexampleRaw !== null) {
    counterexample = asInt(counterexampleRaw, "counterexample", 0, orderings.length - 1);
    if (orderings[counterexample]!.invariant !== false) {
      throw new AlgalError("PARSE_FAILED", "counterexample must name a failing ordering");
    }
    for (let i = 0; i < counterexample; i++) {
      if (orderings[i]!.invariant === false) {
        throw new AlgalError("PARSE_FAILED", "an earlier ordering already failed the invariant");
      }
    }
  }

  const outcome = asString(reqField(o, "outcome", "ordering report"), "outcome", 32);
  if (!["complete", "counterexample", "exhausted"].includes(outcome)) {
    throw new AlgalError("PARSE_FAILED", `unknown ordering outcome "${outcome}"`);
  }
  const exhaustionRaw = reqField(o, "exhaustion", "ordering report");
  let exhaustion: OrderingReport["exhaustion"] = null;
  if (exhaustionRaw !== null) {
    const e = asObject(exhaustionRaw, "exhaustion");
    noUnknownKeys(e, ["reason", "detail"], "exhaustion");
    const reason = asString(reqField(e, "reason", "exhaustion"), "exhaustion.reason", 32);
    if (reason !== "orderings" && reason !== "budget") {
      throw new AlgalError("PARSE_FAILED", `unknown exhaustion reason "${reason}"`);
    }
    const detail = optField(e, "detail");
    if (detail !== undefined) asString(detail, "exhaustion.detail", 2048);
    exhaustion = { reason, ...(detail !== undefined ? { detail: detail as string } : {}) };
  }
  if (outcome === "counterexample" && counterexample === null) {
    throw new AlgalError("PARSE_FAILED", "counterexample outcome requires a counterexample index");
  }
  if (outcome === "complete" && (counterexample !== null || exhaustion !== null)) {
    throw new AlgalError("PARSE_FAILED", "complete outcome carries no counterexample or exhaustion");
  }
  if (outcome === "exhausted" && exhaustion === null) {
    throw new AlgalError("PARSE_FAILED", "exhausted outcome requires an exhaustion record");
  }

  return {
    contract: ORDERING_REPORT_CONTRACT,
    scenario: asDigest(reqField(o, "scenario", "ordering report"), "scenario"),
    limits,
    orderings,
    counterexample,
    outcome: outcome as OrderingReport["outcome"],
    exhaustion,
    account: parseHabitatBudget(reqField(o, "account", "ordering report")),
  };
}
