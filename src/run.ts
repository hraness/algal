// The scheduler. A run sweeps the organism's cells in declared order;
// a cell activates when every declared input is resolved (each incoming
// edge delivered or dead) and the required/emptiness rules hold. Each
// activation is atomic and bounded; effect requests leave through the
// executor seam and return as receipts. No wall-clock values are recorded:
// a receipt is replayable bit-for-bit.

import {
  parseCapabilityHandle,
  suspensionWake,
} from "./capabilities";
import { AlgalError, ERROR_CODES, errorReport, type ErrorCode } from "./errors";
import { evalProgram } from "./expr";
import {
  decisionAnswerSchema,
  parseDecisionAnswers,
  type DecisionQuestions,
} from "./decisions";
import {
  argsForSubOrganism,
  compileOrganism,
  type CompiledOrganism,
} from "./graph";
import type {
  Budgets,
  Cell,
  OrganismManifest,
  PortType,
} from "./contract";
import {
  BOUNDS,
  manifestToJson,
  parseOrganismManifest,
} from "./contract";
import {
  bindOutput,
  checkSchema,
  effectRequestDigest,
  executorSupports,
  parseEffectReceipt,
  type EffectKind,
  type EffectReceipt,
  type EffectRequest,
  type Executor,
  type ExecutorMetadata,
} from "./effects";
import type { FnRegistry } from "./registry";
import type { Store } from "./store";
import type { Transport } from "./transport";
import type { ToolRegistry } from "./tools";
import type { JournalBinding, JournalTicket, RuntimeJournal } from "./process-journal";
import { bindRecallOutput, recallOutputSchema } from "./semantic";
import { asDigest, digestCanonical, type Digest } from "./digest";
import {
  asArray,
  asInt,
  asObject,
  asString,
  asSafeId,
  canonicalBytes,
  canonicalize,
  noUnknownKeys,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";

export const RUN_CONTRACT = "algal.run.v1" as const;
export const RUNTIME_VERSION = "0.1.0" as const;

const WORK = {
  activation: 100,
  effectBase: 500,
  perContextByte: 1,
  perOutputByte: 1,
} as const;

export type RunEvent = {
  seq: number;
  kind:
    | "run.start"
    | "cell.commit"
    | "cell.skip"
    | "cell.fail"
    | "cell.suspend"
    | "effect"
    | "run.end";
  path?: string;
  digest?: string;
  outcome?: string;
};

export type CellRecord = {
  status: "committed" | "skipped" | "failed" | "suspended";
  outputs?: Record<string, JsonValue>;
  /** Present when status is "failed" — what the activation reported. */
  failure?: { code: ErrorCode; message: string };
  work: number;
  effectDigest?: string;
  toolCalls?: JsonValue[];
  shadowOut?: JsonValue;
  rounds?: number;
  items?: number;
  /** Present when the cell's sub-manifest resolved through a transport. */
  via?: string;
  /** `slot` cells record what they touched: the durable name and mode —
   * enough for `verify` to rebuild the replay map. */
  slot?: { name: string; mode: "read" | "write" };
};

export type RunOutcome = "complete" | "failed" | "stuck" | "suspended";

export type RunReceipt = {
  contract: typeof RUN_CONTRACT;
  runtime: { name: "algal"; version: string };
  manifestDigest: Digest;
  manifestKey: string;
  args: Record<string, Record<string, JsonValue>>;
  outcome: RunOutcome;
  cells: Record<string, CellRecord>;
  effects: EffectReceipt[];
  events: RunEvent[];
  work: { steps: number; agentCalls: number; units: number };
  failure?: { code: ErrorCode; message: string; path?: string };
  digest: Digest;
};

export type RunOptions = {
  manifest: OrganismManifest;
  args?: Record<string, Record<string, JsonValue>>;
  fns: FnRegistry;
  store: Store;
  executors: Executor[];
  tools?: ToolRegistry;
  /** A journal covers only this dispatch's live suffix, never checkpoint replay. */
  journal?: RuntimeJournal;
  /** Namespaces host tool idempotency and provider journal audit keys. */
  processName?: string;
  /** Named transports for `via` cells — remote manifest resolution. */
  transports?: Record<string, Transport>;
  /** Provenance replay: cell path → transport name recorded by the run
   * being verified. Replay can't re-derive where bytes came from (the
   * store already holds them), so — like recorded effects — the record
   * itself is the source. */
  replayVia?: Record<string, string>;
  /** Slot-read replay: cell path → the value the recorded run was served
   * (`missing: true` when the recorded read found an empty slot and had no
   * default — the failure replays too). A live slot may have been
   * overwritten since; the record is authoritative. */
  replaySlots?: Record<string, { value?: JsonValue; missing?: boolean }>;
  /** Completed prefix writes produce their recorded output without mutating live slots. */
  replaySlotWrites?: ReadonlySet<string>;
  replayToolEffects?: EffectReceipt[];
  replayToolFallthrough?: boolean;
  /** The runtime stamp to put on the replayed receipt — `verify` passes
   * the recorded run's stamp so a receipt produced under another runtime
   * version replays bit-for-bit instead of being re-stamped. */
  replayRuntime?: { name: "algal"; version: string };
};

type EdgeState = "pending" | "delivered" | "dead";

type RunContext = {
  opts: RunOptions;
  /** The root manifest's budgets govern the whole run, nested levels included. */
  budgets: Budgets;
  cells: Record<string, CellRecord>;
  effects: EffectReceipt[];
  events: RunEvent[];
  work: { steps: number; agentCalls: number; units: number };
  failure?: { code: ErrorCode; message: string; path?: string };
  suspended?: boolean;
  seq: number;
  toolReplay: Map<Digest, EffectReceipt[]>;
  journalFailure?: { error: unknown };
};

export async function runOrganism(opts: RunOptions): Promise<RunReceipt> {
  if (opts.processName !== undefined) asSafeId(opts.processName, "process name");
  opts.journal?.assertHealthy();
  const manifestDigest = digestCanonical(manifestToJson(opts.manifest));
  const ctx: RunContext = {
    opts,
    budgets: opts.manifest.budgets,
    cells: {},
    effects: [],
    events: [],
    work: { steps: 0, agentCalls: 0, units: 0 },
    seq: 0,
    toolReplay: new Map(),
  };
  for (const effect of opts.replayToolEffects ?? []) {
    const queue = ctx.toolReplay.get(effect.requestDigest) ?? [];
    queue.push(effect);
    ctx.toolReplay.set(effect.requestDigest, queue);
  }
  emit(ctx, { kind: "run.start", digest: manifestDigest });
  const compiled = await compileOrganism(
    opts.manifest,
    opts.fns,
    opts.store,
    0,
    opts.transports,
    opts.tools,
  );
  const outcome = await runInto(compiled, opts.args ?? {}, "", ctx, 0);
  assertJournal(ctx);
  emit(ctx, { kind: "run.end", outcome });
  const receipt: Omit<RunReceipt, "digest"> = {
    contract: RUN_CONTRACT,
    runtime: opts.replayRuntime ?? { name: "algal", version: RUNTIME_VERSION },
    manifestDigest,
    manifestKey: opts.manifest.key,
    args: opts.args ?? {},
    outcome,
    cells: ctx.cells,
    effects: ctx.effects,
    events: ctx.events,
    work: ctx.work,
    ...(ctx.failure ? { failure: ctx.failure } : {}),
  };
  return { ...receipt, digest: receiptDigest(receipt as RunReceipt) };
}

export function receiptDigest(r: Omit<RunReceipt, "digest">): Digest {
  const { digest: _d, ...rest } = r as RunReceipt & { digest?: Digest };
  return digestCanonical(rest as unknown as JsonValue);
}

function emit(ctx: RunContext, e: Omit<RunEvent, "seq">): void {
  if (ctx.events.length >= 4096) return;
  ctx.events.push({ seq: ctx.seq++, ...e });
}

async function runInto(
  compiled: CompiledOrganism,
  args: Record<string, Record<string, JsonValue>>,
  pathPrefix: string,
  ctx: RunContext,
  depth: number,
): Promise<"complete" | "failed" | "stuck" | "suspended"> {
  const { manifest, ports, inbound } = compiled;
  const budgets = ctx.budgets;
  if (depth > budgets.maxDepth) {
    return fail(ctx, pathPrefix, "DEPTH_EXCEEDED", `depth ${depth} exceeds maxDepth ${budgets.maxDepth}`);
  }

  // produced outputs per cell: cellId -> port -> value
  const produced = new Map<string, Map<string, JsonValue>>();
  const state = new Map<
    string,
    "pending" | "done" | "skipped" | "failed" | "suspended"
  >();
  const failedInfo = new Map<string, { code: ErrorCode; message: string }>();
  for (const c of manifest.cells) state.set(c.id, "pending");

  // edge liveness
  const edgeState: EdgeState[] = manifest.edges.map(() => "pending");
  const edgeValue: (JsonValue | undefined)[] = manifest.edges.map(() => undefined);

  const markDownstreamDead = (cellId: string) => {
    manifest.edges.forEach((e, i) => {
      if (e.from.cell === cellId && edgeState[i] === "pending") {
        edgeState[i] = "dead";
      }
    });
  };

  const resolveEdge = (i: number) => {
    const e = manifest.edges[i]!;
    const src = e.from.cell;
    const st = state.get(src);
    if (e.on === "fail") {
      if (st === "failed") {
        const f = failedInfo.get(src)!;
        edgeState[i] = "delivered";
        edgeValue[i] = { code: f.code, message: f.message };
      } else if (st === "done" || st === "skipped") {
        edgeState[i] = "dead";
      }
      return;
    }
    if (st === "skipped" || st === "failed") {
      edgeState[i] = "dead";
      return;
    }
    if (st !== "done") return;
    const v = produced.get(src)?.get(e.from.port);
    if (v === undefined) {
      edgeState[i] = "dead";
      return;
    }
    if (e.guard) {
      let hit: boolean;
      if ("expr" in e.guard) {
        const r = evalProgram(
          e.guard.expr.program,
          { value: v },
          BOUNDS.maxExprFuel,
        );
        ctx.work.units += r.fuel;
        if (!r.ok) {
          throw new AlgalError(
            "GUARD_INVALID",
            `guard expr ${canonicalize(r.err)}`,
          );
        }
        if (typeof r.value !== "boolean") {
          const got = Array.isArray(r.value)
            ? "list"
            : r.value === null
              ? "null"
              : typeof r.value;
          throw new AlgalError(
            "GUARD_INVALID",
            `guard expr must produce boolean, got ${got}`,
          );
        }
        hit = r.value;
      } else {
        hit =
          e.guard.field === undefined
            ? v === e.guard.equals
            : typeof v === "object" &&
              v !== null &&
              !Array.isArray(v) &&
              v[e.guard.field] === e.guard.equals;
      }
      if (!hit) {
        edgeState[i] = "dead";
        return;
      }
    }
    edgeState[i] = "delivered";
    edgeValue[i] = v;
  };

  const cellPath = (id: string) => (pathPrefix ? `${pathPrefix}/${id}` : id);

  let outcome: "complete" | "failed" | "stuck" | "suspended" = "complete";
  let progress = true;
  while (progress && !ctx.failure && !ctx.suspended) {
    progress = false;
    for (const cell of manifest.cells) {
      if (state.get(cell.id) !== "pending") continue;
      const sig = ports.get(cell.id)!;
      const inputNames = Object.keys(sig.inputs);

      // resolve all edges targeting this cell's inputs
      for (const { edge } of inbound.get(cell.id) ?? []) resolveEdge(edge);

      const resolved = inputNames.every((p) =>
        (inbound.get(cell.id) ?? [])
          .filter((x) => x.port === p)
          .every((x) => edgeState[x.edge] !== "pending"),
      );
      if (!resolved) continue;

      // input values: single ports take the one delivered edge; many ports
      // collect every delivered edge in manifest order. A many producer's
      // edge flattens element-wise into a many consumer.
      const inputs: Record<string, JsonValue> = {};
      const delivered = new Map<string, number>();
      for (const p of inputNames) {
        const sigp = sig.inputs[p]!;
        const hits = (inbound.get(cell.id) ?? []).filter(
          (x) => x.port === p && edgeState[x.edge] === "delivered",
        );
        if (sigp.many) {
          const items: JsonValue[] = [];
          for (const x of hits) {
            const e = manifest.edges[x.edge]!;
            const pt = ports.get(e.from.cell)!.outputs[e.from.port]!;
            const v = edgeValue[x.edge]!;
            if (pt.many && Array.isArray(v)) items.push(...v);
            else items.push(v);
          }
          delivered.set(p, items.length);
          if (items.length > 0 || sigp.optional === true) inputs[p] = items;
        } else {
          delivered.set(p, hits.length);
          if (hits.length > 0) inputs[p] = edgeValue[hits[0]!.edge]!;
        }
      }

      const nonEmpty = inputNames.filter((p) => (delivered.get(p) ?? 0) > 0);
      const requiredMissing = inputNames.some(
        (p) =>
          sig.inputs[p]!.optional !== true && (delivered.get(p) ?? 0) === 0,
      );

      if (inputNames.length > 0 && (nonEmpty.length === 0 || requiredMissing)) {
        state.set(cell.id, "skipped");
        markDownstreamDead(cell.id);
        ctx.cells[cellPath(cell.id)] = { status: "skipped", work: 0 };
        emit(ctx, { kind: "cell.skip", path: cellPath(cell.id) });
        progress = true;
        continue;
      }

      // ---- activate ----
      if (ctx.work.steps + 1 > budgets.maxSteps) {
        fail(ctx, cellPath(cell.id), "BUDGET_EXHAUSTED", "maxSteps exhausted");
        break;
      }
      ctx.work.steps += 1;
      const workBefore = ctx.work.units;
      ctx.work.units += WORK.activation;

      try {
        // the consumer's declared ports are the last contract check: a
        // delivered value that violates a declared schema fails this cell
        // (routable via on:"fail"), never silently enters activation
        for (const p of inputNames) {
          const v = inputs[p];
          if (v !== undefined) checkValue(v, sig.inputs[p]!, `${cell.id}.${p}`);
        }
        const act = await activate(cell, inputs, args, compiled, ctx, cellPath(cell.id), depth);
        checkOutputs(cell, sig.outputs, act.outputs);
        produced.set(cell.id, new Map(Object.entries(act.outputs)));
        state.set(cell.id, "done");
        const rec: CellRecord = {
          status: "committed",
          work: ctx.work.units - workBefore,
        };
        if (Object.keys(act.outputs).length) rec.outputs = act.outputs;
        if (act.effectDigest) rec.effectDigest = act.effectDigest;
        if (act.toolCalls) rec.toolCalls = act.toolCalls as unknown as JsonValue[];
        if (act.shadowOut !== undefined) rec.shadowOut = act.shadowOut;
        if (act.rounds !== undefined) rec.rounds = act.rounds;
        if (act.items !== undefined) rec.items = act.items;
        const via =
          compiled.resolvedVia.get(cell.id) ??
          ctx.opts.replayVia?.[cellPath(cell.id)];
        if (via) rec.via = via;
        if (cell.kind === "slot") rec.slot = { name: cell.name, mode: cell.mode };
        ctx.cells[cellPath(cell.id)] = rec;
        emit(ctx, { kind: "cell.commit", path: cellPath(cell.id) });
      } catch (e) {
        // Journal integrity failures cannot be routed through guest fail edges.
        assertJournal(ctx);
        const rep = errorReport(e);
        // suspension is not failure: the cell's effect asked the host to
        // pause the process (a gate awaiting a decision, a delegated task
        // still pending). The attempt is already on the receipt — record
        // the suspension, halt the sweep, and leave fail edges dead.
        if (rep.code === "EFFECT_SUSPENDED") {
          state.set(cell.id, "suspended");
          const susRec: CellRecord = {
            status: "suspended",
            work: ctx.work.units - workBefore,
          };
          if (cell.kind === "slot") {
            susRec.slot = { name: cell.name, mode: cell.mode };
          }
          ctx.cells[cellPath(cell.id)] = susRec;
          emit(ctx, { kind: "cell.suspend", path: cellPath(cell.id) });
          ctx.suspended = true;
          break;
        }
        state.set(cell.id, "failed");
        failedInfo.set(cell.id, { code: rep.code, message: rep.message });
        const failRec: CellRecord = {
          status: "failed",
          failure: { code: rep.code, message: rep.message },
          work: ctx.work.units - workBefore,
        };
        if (cell.kind === "slot") {
          failRec.slot = { name: cell.name, mode: cell.mode };
        }
        ctx.cells[cellPath(cell.id)] = failRec;
        emit(ctx, { kind: "cell.fail", path: cellPath(cell.id) });
        // normal outbound edges die; on:"fail" edges deliver the record.
        // A declared fail edge means the structure handles this failure —
        // the run continues and any inner run-level failure is absorbed.
        const handled = manifest.edges.some(
          (x) => x.from.cell === cell.id && x.on === "fail",
        );
        if (handled) {
          delete ctx.failure;
          progress = true;
          continue;
        }
        fail(ctx, cellPath(cell.id), rep.code, rep.message);
        break;
      }
      progress = true;
      if (ctx.work.units > budgets.maxWork) {
        fail(ctx, cellPath(cell.id), "BUDGET_EXHAUSTED", "maxWork exhausted");
        break;
      }
    }
  }

  if (ctx.suspended) {
    outcome = "suspended";
  } else if (ctx.failure) {
    outcome = "failed";
  } else {
    const pending = manifest.cells.filter((c) => state.get(c.id) === "pending");
    if (pending.length > 0) outcome = "stuck";
  }
  return outcome;
}

type Activation = {
  outputs: Record<string, JsonValue>;
  effectDigest?: Digest;
  toolCalls?: { fn: string; inputs: JsonValue; output: JsonValue }[];
  shadowOut?: JsonValue;
  rounds?: number;
  items?: number;
};

/** The reserved tool-call shape. Only recognized when the cell declares the
 * ref in `tools`; otherwise the value binds as ordinary output. */
function asToolCall(
  raw: JsonValue,
  tools: string[] | undefined,
): { fn: string; inputs: JsonValue } | undefined {
  if (!tools || raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const o = raw as Record<string, JsonValue>;
  const fn = o.tool;
  const inputs = o.inputs;
  if (
    typeof fn === "string" &&
    tools.includes(fn) &&
    inputs !== undefined &&
    inputs !== null &&
    typeof inputs === "object" &&
    !Array.isArray(inputs)
  ) {
    return { fn, inputs };
  }
  return undefined;
}

function assertJournal(ctx: RunContext): void {
  if (ctx.journalFailure !== undefined) throw ctx.journalFailure.error;
  ctx.opts.journal?.assertHealthy();
}
async function journalStep<T>(ctx: RunContext, operation: () => Promise<T>): Promise<T> {
  try { assertJournal(ctx); return await operation(); }
  catch (error) { ctx.journalFailure = { error }; ctx.opts.journal?.poison(error); throw error; }
}
function processEffectKey(ctx: RunContext, requestDigest: Digest): Digest {
  return ctx.opts.processName === undefined ? requestDigest : digestCanonical({
    contract: "algal.process-effect.v1", process: ctx.opts.processName, requestDigest,
  });
}
async function journalBefore(ctx: RunContext, binding: JournalBinding): Promise<JournalTicket> {
  return journalStep(ctx, async () => {
    const ticket = await ctx.opts.journal!.before(binding);
    if ((ticket.token === undefined) === (ticket.receipt === undefined))
      throw new AlgalError("RECEIPT_MISMATCH", "journal must return exactly one intent or receipt");
    if (ticket.receipt !== undefined) {
      const receipt = parseEffectReceipt(ticket.receipt);
      if (receipt.requestDigest !== binding.requestDigest)
        throw new AlgalError("RECEIPT_MISMATCH", "journal returned another request's receipt");
      return { receipt: structuredClone(receipt) };
    }
    return { token: asDigest(ticket.token, "journal token") };
  });
}
async function boundedCall<T>(invoke: (signal?: AbortSignal) => Promise<T>, timeout: number | undefined, message: string): Promise<T> {
  if (timeout === undefined) return invoke();
  if (timeout <= 0) throw new AlgalError("BUDGET_EXHAUSTED", message);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await Promise.race([
      invoke(controller.signal),
      new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => {
        reject(new AlgalError("BUDGET_EXHAUSTED", message));
      }, { once: true })),
    ]);
  } finally { clearTimeout(timer); }
}
/** One attempt owns one terminal receipt. The losing timeout promise never
 * writes the journal or refines the receipt after that terminal is selected. */
async function providerAttempt(
  ctx: RunContext, request: EffectRequest, executor: Executor,
  timeout: number | undefined, retryPolicy = true,
): Promise<EffectReceipt> {
  assertJournal(ctx);
  const requestDigest = effectRequestDigest(request);
  const journal = executor.replay === true ? undefined : ctx.opts.journal;
  const deadline = timeout === undefined ? undefined : performance.now() + timeout;
  const remaining = () => deadline === undefined ? undefined : Math.max(0, deadline - performance.now());
  const timeoutMessage = `cell "${request.cellId}" effect exceeded maxEffectMs ${timeout}`;
  let meta: ExecutorMetadata | undefined;
  let ticket: JournalTicket | undefined;
  if (journal) {
    ticket = await journalStep(ctx, async () => {
      const prepared = await boundedCall(async (signal) => {
        const metadata = await executor.receiptFor?.(request);
        if (signal?.aborted) throw new AlgalError("BUDGET_EXHAUSTED", timeoutMessage);
        const configurationDigest = asDigest(executor.journalConfigurationFor
          ? await executor.journalConfigurationFor(request)
          : metadata?.configurationDigest ?? executor.cacheIdentity, "journal executor configuration");
        return { metadata, configurationDigest };
      }, remaining(), timeoutMessage);
      meta = prepared.metadata;
      return journalBefore(ctx, {
        requestDigest, executor: executor.id, configurationDigest: prepared.configurationDigest,
        idempotencyKey: processEffectKey(ctx, requestDigest), recovery: "never",
      });
    });
    if (ticket.receipt !== undefined) return ticket.receipt;
  }
  let effect: EffectReceipt;
  try {
    const result = await boundedCall(async (signal) => {
      if (!journal) meta = await executor.receiptFor?.(request);
      if (executor.executeEffect) {
        const result = await executor.executeEffect(request, signal);
        return { output: result.output, metadata: { ...meta, ...result.metadata } };
      }
      return { output: await executor.execute(request, signal), metadata: meta };
    }, remaining(), timeoutMessage);
    meta = result.metadata;
    effect = { requestDigest, output: result.output, executor: meta?.executor ?? executor.id };
  } catch (error) {
    const report = errorReport(error);
    effect = { requestDigest, error: { code: report.code, message: report.message }, executor: meta?.executor ?? executor.id };
    const wake = suspensionWake(error, meta?.wake);
    if (wake.length > 0) effect.wake = wake;
    if (report.code === "EFFECT_SUSPENDED") effect.retryable = false;
  }
  if (meta?.usage) effect.usage = structuredClone(meta.usage);
  if (meta?.cached) effect.cached = true;
  if (meta?.configurationDigest) effect.configurationDigest = meta.configurationDigest;
  if (retryPolicy && (executor.retryable === false || meta?.retryable === false)) effect.retryable = false;
  // Adapter-owned output objects must not change while persistence awaits I/O.
  const terminal = journal ? await journalStep(ctx, async () => structuredClone(effect)) : effect;
  if (journal && ticket?.token !== undefined)
    await journalStep(ctx, () => journal.after(ticket.token!, structuredClone(terminal)));
  return terminal;
}
async function toolAttempt(
  ctx: RunContext, name: string, entry: NonNullable<ReturnType<ToolRegistry["get"]>>,
  inputs: Record<string, JsonValue>, requestDigest: Digest,
  timeout: number | undefined, timeoutMessage: string,
): Promise<EffectReceipt> {
  assertJournal(ctx);
  const journal = ctx.opts.journal;
  let ticket: JournalTicket | undefined;
  if (journal) {
    ticket = await journalStep(ctx, async () => journalBefore(ctx, {
      requestDigest, executor: `tool:${name}`,
      configurationDigest: asDigest(entry.configurationDigest, "journal tool configuration"),
      idempotencyKey: processEffectKey(ctx, requestDigest),
      recovery: entry.signature.effect === "read" ? "read" : "never",
    }));
    if (ticket.receipt !== undefined) return ticket.receipt;
  }
  let effect: EffectReceipt;
  try {
    const outputs = await boundedCall((signal) => entry.tool(inputs, {
      requestDigest, idempotencyKey: processEffectKey(ctx, requestDigest), ...(signal ? { signal } : {}),
    }), timeout, timeoutMessage);
    effect = { requestDigest, output: outputs as JsonValue, executor: `tool:${name}` };
  } catch (error) {
    const report = errorReport(error);
    const code = report.code === "INTERNAL" ? "TOOL_FAILED" : report.code;
    const wake = suspensionWake(error);
    effect = {
      requestDigest, error: { code, message: report.message }, executor: `tool:${name}`,
      ...(code === "EFFECT_SUSPENDED" ? { retryable: false as const } : {}),
      ...(wake.length > 0 ? { wake } : {}),
    };
  }
  // Adapter-owned output objects must not change while persistence awaits I/O.
  const terminal = journal ? await journalStep(ctx, async () => structuredClone(effect)) : effect;
  if (journal && ticket?.token !== undefined)
    await journalStep(ctx, () => journal.after(ticket.token!, structuredClone(terminal)));
  return terminal;
}

async function executeBoundedEffect<T>(
  ctx: RunContext,
  path: string,
  request: EffectRequest,
  maxAttempts: number,
  effectMs: number | undefined,
  contextBytes: number,
  maxOut: number,
  bind: (raw: JsonValue) => T,
): Promise<{ value: T; requestDigest: Digest }> {
  const requestDigest = effectRequestDigest(request);
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const executor = pickExecutor(request, ctx.opts.executors);
    if (ctx.work.agentCalls + 1 > ctx.budgets.maxAgentCalls) {
      throw new AlgalError("BUDGET_EXHAUSTED", "maxAgentCalls exhausted");
    }
    ctx.work.agentCalls += 1;
    ctx.work.units += WORK.effectBase + contextBytes * WORK.perContextByte;
    emit(ctx, { kind: "effect", path, digest: requestDigest });
    const effect = await providerAttempt(ctx, request, executor, effectMs);
    ctx.effects.push(effect);
    if (effect.error) {
      lastErr = new AlgalError(effect.error.code, effect.error.message);
      if (effect.retryable === false) break;
      continue;
    }
    const raw = effect.output!;
    const bytes = canonicalBytes(raw);
    if (bytes > maxOut) {
      lastErr = new AlgalError(
        "BUDGET_EXHAUSTED",
        `effect output ${bytes}B exceeds maxOutputBytes ${maxOut}B`,
      );
      if (effect.retryable === false) break;
      continue;
    }
    ctx.work.units += bytes * WORK.perOutputByte;
    try {
      return { value: bind(raw), requestDigest };
    } catch (error) {
      lastErr = error;
      if (effect.retryable === false) break;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new AlgalError(
        "EFFECT_FAILED",
        `cell "${request.cellId}" exhausted ${maxAttempts} attempt(s)`,
      );
}

async function activate(
  cell: Cell,
  inputs: Record<string, JsonValue>,
  args: Record<string, Record<string, JsonValue>>,
  compiled: CompiledOrganism,
  ctx: RunContext,
  path: string,
  depth: number,
): Promise<Activation> {
  assertJournal(ctx);
  switch (cell.kind) {
    case "input": {
      const supplied = args[cell.id] ?? {};
      const out: Record<string, JsonValue> = {};
      for (const [port, decl] of Object.entries(cell.outputs)) {
        const v = supplied[port];
        if (v === undefined) continue;
        checkValue(v, decl, `${cell.id}.${port}`);
        await checkRefsResolve(ctx, decl, v, `${cell.id}.${port}`);
        out[port] = v;
      }
      return { outputs: out };
    }
    case "const": {
      const out: Record<string, JsonValue> = {};
      for (const [port, decl] of Object.entries(cell.outputs)) {
        checkValue(decl.value, decl, `${cell.id}.${port}`);
        await checkRefsResolve(ctx, decl, decl.value, `${cell.id}.${port}`);
        out[port] = decl.value;
      }
      return { outputs: out };
    }
    case "store": {
      const data = inputs.data!;
      const bytes = canonicalBytes(data);
      if (bytes > BOUNDS.maxBlobBytes) {
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          `${cell.id}: payload ${bytes}B exceeds maxBlobBytes ${BOUNDS.maxBlobBytes}B`,
        );
      }
      ctx.work.units += bytes * WORK.perOutputByte;
      const d = await ctx.opts.store.putValue(data);
      return { outputs: { ref: d } };
    }
    case "load": {
      const ref = inputs.ref!;
      checkValue(ref, { type: "ref" }, `${cell.id}.ref`);
      const v = await ctx.opts.store.getValue(ref as Digest);
      if (v === undefined) {
        throw new AlgalError(
          "INPUT_MISSING",
          `${cell.id}: ref ${ref} not in store`,
        );
      }
      const bytes = canonicalBytes(v);
      if (bytes > BOUNDS.maxBlobBytes) {
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          `${cell.id}: payload ${bytes}B exceeds maxBlobBytes ${BOUNDS.maxBlobBytes}B`,
        );
      }
      ctx.work.units += bytes * WORK.perOutputByte;
      return { outputs: { data: v } };
    }
    case "slot": {
      if (cell.mode === "write") {
        const data = inputs.data!;
        const bytes = canonicalBytes(data);
        if (bytes > BOUNDS.maxBlobBytes) {
          throw new AlgalError(
            "BUDGET_EXHAUSTED",
            `${cell.id}: slot payload ${bytes}B exceeds maxBlobBytes ${BOUNDS.maxBlobBytes}B`,
          );
        }
        ctx.work.units += bytes * WORK.perOutputByte;
        if (!ctx.opts.replaySlotWrites?.has(path)) {
          await ctx.opts.store.setSlot(cell.name, data);
        }
        return { outputs: { data } };
      }
      // read: replay serves the recorded outcome — a live slot may have
      // been overwritten since the run being verified
      const rep = ctx.opts.replaySlots?.[path];
      if (rep !== undefined) {
        if (rep.missing) {
          throw new AlgalError(
            "INPUT_MISSING",
            `slot cell "${cell.id}": slot "${cell.name}" is empty and declares no default`,
          );
        }
        return { outputs: { data: rep.value! } };
      }
      const stored = await ctx.opts.store.getSlot(cell.name);
      const v = stored !== undefined ? stored : cell.default;
      if (v === undefined) {
        throw new AlgalError(
          "INPUT_MISSING",
          `slot cell "${cell.id}": slot "${cell.name}" is empty and declares no default`,
        );
      }
      return { outputs: { data: v } };
    }
    case "spawn": {
      // the manifest is runtime data — parse it through the same contract a
      // static manifest faces, admit it to CAS, compile, and run it under
      // the root manifest's budgets and depth bound
      const subManifest = parseOrganismManifest(inputs.manifest);
      const subDigest = await ctx.opts.store.putManifest(subManifest);
      const subCompiled = await compileOrganism(
        subManifest,
        ctx.opts.fns,
        ctx.opts.store,
        depth + 1,
        ctx.opts.transports,
        ctx.opts.tools,
      );
      const rawArgs = inputs.args ?? {};
      if (
        rawArgs === null ||
        typeof rawArgs !== "object" ||
        Array.isArray(rawArgs)
      ) {
        throw new AlgalError(
          "TYPE_MISMATCH",
          `spawn cell "${cell.id}": args must be a record of interface inputs`,
        );
      }
      const subArgs = argsForSubOrganism(
        subManifest,
        rawArgs as Record<string, JsonValue>,
      );
      const outcome = await runInto(subCompiled, subArgs, path, ctx, depth + 1);
      if (outcome !== "complete") {
        if (ctx.suspended) {
          throw new AlgalError("EFFECT_SUSPENDED", `inner run at "${path}" suspended`);
        }
        throw new AlgalError(ctx.failure?.code ?? "STUCK", ctx.failure?.message ?? "inner run stuck");
      }
      const data: Record<string, JsonValue> = {};
      const iface = subManifest.interface ?? { inputs: {}, outputs: {} };
      for (const [name, target] of Object.entries(iface.outputs)) {
        const rec = ctx.cells[`${path}/${target.cell}`];
        const v = rec?.outputs?.[target.port];
        if (v !== undefined) data[name] = v;
      }
      return { outputs: { data, digest: subDigest } };
    }
    case "fn": {
      const entry = ctx.opts.fns.get(cell.fn)!;
      ctx.work.units += entry.signature.cost;
      for (const [p, decl] of Object.entries(entry.signature.inputs)) {
        const v = inputs[p];
        if (v !== undefined) checkValue(v, decl, `${cell.id}.${p}`);
      }
      return { outputs: entry.fn(inputs) };
    }
    case "expr": {
      const r = evalProgram(
        cell.expr.program,
        inputs as JsonObject,
        BOUNDS.maxExprFuel,
      );
      ctx.work.units += r.fuel;
      if (!r.ok) {
        throw new AlgalError(
          r.err.code === "EXPR_FUEL" ? "BUDGET_EXHAUSTED" : "EXPR_FAILED",
          `expr ${canonicalize(r.err)}`,
        );
      }
      return { outputs: { out: r.value } };
    }
    case "recall": {
      const evaluated = evalProgram(
        cell.query.program,
        inputs as JsonObject,
        BOUNDS.maxExprFuel,
      );
      ctx.work.units += evaluated.fuel;
      if (!evaluated.ok) {
        throw new AlgalError(
          evaluated.err.code === "EXPR_FUEL" ? "BUDGET_EXHAUSTED" : "EXPR_FAILED",
          `recall query ${canonicalize(evaluated.err)}`,
        );
      }
      if (typeof evaluated.value !== "string") {
        throw new AlgalError("EXPR_FAILED", `recall cell "${cell.id}" query must evaluate to text`);
      }
      const query = evaluated.value;
      if (query.length === 0) {
        throw new AlgalError("EXPR_FAILED", `recall cell "${cell.id}" query must not be empty`);
      }
      if (Buffer.byteLength(query, "utf8") > BOUNDS.maxRecallQueryBytes) {
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          `recall cell "${cell.id}" query exceeds maxRecallQueryBytes ${BOUNDS.maxRecallQueryBytes}`,
        );
      }
      const maxCtx = cell.budget?.maxContextBytes ?? ctx.budgets.maxContextBytes;
      const maxOut = cell.budget?.maxOutputBytes ?? ctx.budgets.maxOutputBytes;
      const context: JsonObject = { inputs };
      const contextBytes = canonicalBytes(context);
      if (contextBytes > maxCtx) {
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          `recall context ${contextBytes}B exceeds maxContextBytes ${maxCtx}B`,
        );
      }
      const k = cell.k ?? 8;
      const embedder = cell.embedder ?? "local";
      const output = { kind: "json" as const, schema: recallOutputSchema() };
      const request: EffectRequest = {
        contract: "algal.effect.v1",
        cellId: cell.id,
        kind: "recall",
        prompt: "",
        context,
        output,
        budget: { maxContextBytes: maxCtx, maxOutputBytes: maxOut },
        ...(cell.route ? { route: cell.route } : {}),
        recall: { query, k, embedder },
      };
      const maxAttempts = cell.retry?.attempts ?? 1;
      const effectMs = cell.budget?.maxEffectMs;
      const recallEffect = await executeBoundedEffect(
        ctx,
        path,
        request,
        maxAttempts,
        effectMs,
        contextBytes,
        maxOut,
        (raw) => {
          bindOutput(output, raw, cell.id);
          return bindRecallOutput(raw, k);
        },
      );
      let recalled = recallEffect.value;
      let effectDigest = recallEffect.requestDigest;
      const hits = recalled.hits as JsonObject[];
      if (cell.rerank && hits.length > 1) {
        const questions: DecisionQuestions = {};
        for (let i = 0; i < hits.length; i++) {
          questions[`hit_${i}`] = {
            type: "noul",
            instructions: `Is context.hits[${i}] directly relevant to context.query?`,
            criteria: {
              true: "The hit directly helps answer context.query.",
              false: "The hit does not help answer context.query.",
            },
          };
        }
        const rerankContext: JsonObject = { query, hits };
        const rerankContextBytes = canonicalBytes(rerankContext);
        if (rerankContextBytes > maxCtx) {
          throw new AlgalError(
            "BUDGET_EXHAUSTED",
            `recall rerank context ${rerankContextBytes}B exceeds maxContextBytes ${maxCtx}B`,
          );
        }
        const rerankOutput = {
          kind: "json" as const,
          schema: decisionAnswerSchema(questions),
        };
        const rerankRequest: EffectRequest = {
          contract: "algal.effect.v1",
          cellId: cell.id,
          kind: "decide",
          prompt:
            `Semantic rerank for recall cell "${cell.id}". Score every hit's direct relevance ` +
            `to the query; do not summarize or rewrite the source text.`,
          context: rerankContext,
          output: rerankOutput,
          budget: { maxContextBytes: maxCtx, maxOutputBytes: maxOut },
          route: cell.rerank.route,
          questions,
        };
        const rerankEffect = await executeBoundedEffect(
          ctx,
          path,
          rerankRequest,
          maxAttempts,
          effectMs,
          rerankContextBytes,
          maxOut,
          (raw) => {
            const bound = bindOutput(rerankOutput, raw, `${cell.id} rerank`) as JsonObject;
            return parseDecisionAnswers(bound.answers, questions, `${cell.id} rerank answers`);
          },
        );
        const scored = hits.map((hit, index) => {
          const answer = rerankEffect.value[`hit_${index}`];
          if (answer?.type !== "noul") {
            throw new AlgalError("EFFECT_UNPARSEABLE", `recall rerank answer hit_${index} is invalid`);
          }
          return { hit, index, score: answer.noul };
        });
        scored.sort((a, b) => b.score - a.score || a.index - b.index);
        recalled = {
          hits: scored.slice(0, cell.rerank.take ?? scored.length).map(({ hit }) => hit),
        };
        effectDigest = rerankEffect.requestDigest;
      }
      const first = (recalled.hits as JsonObject[])[0];
      return {
        outputs: {
          out: recalled,
          ...(typeof first?.ref === "string" ? { ref: first.ref } : {}),
        },
        effectDigest,
      };
    }
    case "tool": {
      const entry = ctx.opts.tools?.get(cell.tool);
      if (!entry) {
        throw new AlgalError("TOOL_UNKNOWN", `tool "${cell.tool}" is not configured`);
      }
      const requestDigest = digestCanonical({
        contract: "algal.tool-effect.v1",
        path,
        tool: cell.tool,
        effect: entry.signature.effect,
        inputs,
      } as unknown as JsonValue);
      emit(ctx, { kind: "effect", path, digest: requestDigest });
      const replay = ctx.toolReplay.get(requestDigest)?.shift();
      if (
        !replay &&
        ctx.opts.replayToolEffects !== undefined &&
        ctx.opts.replayToolFallthrough !== true
      ) {
        throw new AlgalError("EFFECT_UNBOUND", `replay has no tool receipt for ${requestDigest}`);
      }
      const effect = replay ?? await toolAttempt(ctx, cell.tool, entry, inputs, requestDigest,
        cell.budget?.maxEffectMs, `tool cell "${cell.id}" exceeded maxEffectMs ${cell.budget?.maxEffectMs}`);
      ctx.effects.push(effect);
      if (effect.error) throw new AlgalError(effect.error.code, effect.error.message);
      const outputs = effect.output as Record<string, JsonValue>;
      const bytes = canonicalBytes(effect.output!);
      if (bytes > entry.signature.maxOutputBytes)
        throw new AlgalError("BUDGET_EXHAUSTED", `tool cell "${cell.id}" output ${bytes}B exceeds ${entry.signature.maxOutputBytes}B`);
      ctx.work.units += entry.signature.cost + bytes;
      return { outputs, effectDigest: requestDigest };
    }
    case "agent":
    case "classifier":
    case "gate":
    case "decide": {
      const budgets = ctx.budgets;
      const maxCtx = cell.budget?.maxContextBytes ?? budgets.maxContextBytes;
      const maxOut = cell.budget?.maxOutputBytes ?? budgets.maxOutputBytes;
      const tools =
        cell.kind === "gate" || cell.kind === "decide" ? undefined : cell.tools;
      const maxTurns = cell.kind === "decide" ? 1
        : cell.budget?.maxTurns ?? (tools?.length ? 8 : 1);
      // decide cells carry no declared output — the contract is derived from
      // the question map (an answers record shaped per question type)
      const output = cell.kind === "decide"
        ? { kind: "json" as const, schema: decisionAnswerSchema(cell.questions) }
        : cell.output;

      const viewInputs: Record<string, JsonValue> = {};
      const wanted = cell.view.inputs;
      for (const [k, v] of Object.entries(inputs)) {
        if (wanted === "*" || wanted.includes(k)) viewInputs[k] = v;
      }
      const toolLog: { fn: string; inputs: JsonValue; output: JsonValue }[] = [];

      // declared cross-cell context: records of ancestor cells in this scope.
      // `path` is this cell's own path; the scope is its parent prefix.
      const scope = path.includes("/")
        ? path.slice(0, path.lastIndexOf("/"))
        : "";
      const cellView: JsonObject | undefined = cell.view.cells?.length
        ? Object.fromEntries(
            cell.view.cells.map((cv) => {
              const rec = ctx.cells[scope ? `${scope}/${cv.cell}` : cv.cell];
              let outputs = rec?.outputs;
              if (outputs && cv.ports) {
                outputs = Object.fromEntries(
                  Object.entries(outputs).filter(([p]) => cv.ports!.includes(p)),
                );
              }
              return [
                cv.cell,
                rec
                  ? {
                      status: rec.status,
                      ...(outputs ? { outputs } : {}),
                    }
                  : null,
              ] as [string, JsonValue];
            }),
          )
        : undefined;

      for (let turn = 0; ; turn++) {
        if (turn >= maxTurns) {
          throw new AlgalError(
            "BUDGET_EXHAUSTED",
            `cell "${cell.id}" produced no final output within maxTurns ${maxTurns}`,
          );
        }

        // recorded tool-log compaction: when the canonical log exceeds the
        // declared threshold, a `decide` effect triages every unpinned entry
        // (keep = noul >= 0.5). The effect rides the receipt like any other —
        // the request covers the pre-compaction log, the answers record the
        // keep/drop, and replay reproduces the rebuilt log bit-for-bit.
        if (
          cell.kind === "agent" &&
          cell.compact &&
          toolLog.length > (cell.compact.keepRecent ?? 0) &&
          canonicalBytes(toolLog) > cell.compact.maxLogBytes
        ) {
          const pinned = cell.compact.keepRecent ?? 0;
          const droppable = toolLog.length - pinned;
          const questions: DecisionQuestions = {};
          for (let i = 0; i < droppable; i++) {
            questions[`keep_${i}`] = {
              type: "noul",
              instructions:
                `Retain context.toolLog[${i}] verbatim — the ` +
                `"${toolLog[i]!.fn}" call and its result. Is it still needed ` +
                `for the remaining task?`,
            };
          }
          const compactCtx: JsonObject = { inputs: viewInputs, turn, toolLog };
          const compactCtxBytes = canonicalBytes(compactCtx);
          if (compactCtxBytes > maxCtx) {
            throw new AlgalError(
              "BUDGET_EXHAUSTED",
              `compaction context ${compactCtxBytes}B exceeds maxContextBytes ${maxCtx}B`,
            );
          }
          const compactRoute = cell.compact.route ?? cell.route;
          const compactReq: EffectRequest = {
            contract: "algal.effect.v1",
            cellId: cell.id,
            kind: "decide",
            prompt:
              `Tool-log triage for cell "${cell.id}". The log exceeds ` +
              `${cell.compact.maxLogBytes}B; for each indexed entry decide ` +
              `whether the call and its result must be preserved verbatim ` +
              `for the remaining work. Task: ${cell.prompt}`,
            context: compactCtx,
            output: { kind: "json", schema: decisionAnswerSchema(questions) },
            budget: { maxContextBytes: maxCtx, maxOutputBytes: maxOut },
            ...(compactRoute ? { route: compactRoute } : {}),
            questions,
          };
          const compactDigest = effectRequestDigest(compactReq);
          const compactExec = pickExecutor(compactReq, ctx.opts.executors);
          if (ctx.work.agentCalls + 1 > budgets.maxAgentCalls) {
            throw new AlgalError("BUDGET_EXHAUSTED", "maxAgentCalls exhausted");
          }
          ctx.work.agentCalls += 1;
          ctx.work.units +=
            WORK.effectBase + compactCtxBytes * WORK.perContextByte;
          emit(ctx, { kind: "effect", path, digest: compactDigest });
          const eff = await providerAttempt(ctx, compactReq, compactExec, undefined, false);
          ctx.effects.push(eff);
          if (eff.error) throw new AlgalError(eff.error.code, eff.error.message);
          const raw = eff.output!;
          ctx.work.units += canonicalBytes(raw) * WORK.perOutputByte;
          const bound = bindOutput(
            compactReq.output,
            raw,
            `cell "${cell.id}" compaction`,
          );
          const answers = (bound as JsonObject).answers as JsonObject;
          const kept = toolLog.slice(0, droppable).filter((_, i) => {
            const a = answers[`keep_${i}`] as JsonObject;
            return typeof a.noul === "number" && a.noul >= 0.5;
          });
          toolLog.splice(0, droppable, ...kept);
        }

        const context: JsonObject = { inputs: viewInputs, turn };
        if (cell.view.note !== undefined) context.note = cell.view.note;
        if (cellView) context.cells = cellView;
        if (cell.view.graph && cell.view.cells?.length) {
          const named = new Set(cell.view.cells.map((cv) => cv.cell));
          context.graph = {
            edges: compiled.manifest.edges
              .filter(
                (e) =>
                  named.has(e.from.cell) &&
                  (named.has(e.to.cell) || e.to.cell === cell.id),
              )
              .map((e) => ({
                from: `${e.from.cell}.${e.from.port}`,
                to: `${e.to.cell}.${e.to.port}`,
                ...(e.guard
                  ? {
                      guard:
                        "expr" in e.guard
                          ? { expr: e.guard.expr }
                          : {
                              equals: e.guard.equals,
                              ...(e.guard.field !== undefined
                                ? { field: e.guard.field }
                                : {}),
                            },
                    }
                  : {}),
              })),
          } as unknown as JsonValue;
        }
        if (toolLog.length) {
          context.toolLog = toolLog as unknown as JsonValue;
        }
        const contextBytes = canonicalBytes(context);
        if (contextBytes > maxCtx) {
          throw new AlgalError(
            "BUDGET_EXHAUSTED",
            `context view ${contextBytes}B exceeds maxContextBytes ${maxCtx}B`,
          );
        }

        const request: EffectRequest = {
          contract: "algal.effect.v1",
          cellId: cell.id,
          kind: cell.kind,
          prompt: cell.prompt ?? "",
          context,
          output,
          budget: { maxContextBytes: maxCtx, maxOutputBytes: maxOut },
          ...(cell.route ? { route: cell.route } : {}),
          ...(cell.kind === "decide" ? { questions: cell.questions } : {}),
        };
        const requestDigest = effectRequestDigest(request);
        // retry: each attempt is a separate effect — request, receipt, work
        // charge, agent-call count. A failed or contract-violating attempt
        // is recorded and the same request re-issued until `attempts` is
        // exhausted; replay serves the recorded attempts in order.
        const maxAttempts =
          (cell.kind === "agent" ||
            cell.kind === "classifier" ||
            cell.kind === "gate" ||
            cell.kind === "decide"
            ? cell.retry?.attempts
            : undefined) ?? 1;
        let settled:
          | { kind: "tool"; fn: string; inputs: JsonValue }
          | { kind: "final"; bound: JsonValue }
          | undefined;
        let lastErr: unknown;
        for (
          let attempt = 0;
          attempt < maxAttempts && settled === undefined;
          attempt++
        ) {
          // A replay prefix may end between attempts of the same request.
          const executor = pickExecutor(request, ctx.opts.executors);
          if (ctx.work.agentCalls + 1 > budgets.maxAgentCalls) {
            throw new AlgalError("BUDGET_EXHAUSTED", "maxAgentCalls exhausted");
          }
          ctx.work.agentCalls += 1;
          ctx.work.units += WORK.effectBase + contextBytes * WORK.perContextByte;
          emit(ctx, { kind: "effect", path, digest: requestDigest });

          const eff = await providerAttempt(ctx, request, executor, cell.budget?.maxEffectMs);
          ctx.effects.push(eff);
          if (eff.error) {
            lastErr = new AlgalError(eff.error.code, eff.error.message);
            if (eff.retryable === false) break;
            continue;
          }
          const raw = eff.output!;

          const outBytes = canonicalBytes(raw);
          if (outBytes > maxOut) {
            lastErr = new AlgalError(
              "BUDGET_EXHAUSTED",
              `effect output ${outBytes}B exceeds maxOutputBytes ${maxOut}B`,
            );
            if (eff.retryable === false) break;
            continue;
          }
          ctx.work.units += outBytes * WORK.perOutputByte;

          const call = asToolCall(raw, tools);
          if (call) {
            settled = { kind: "tool", fn: call.fn, inputs: call.inputs };
            break;
          }
          try {
            settled = {
              kind: "final",
              bound: bindOutput(output, raw, cell.id),
            };
          } catch (e) {
            lastErr = e;
            if (eff.retryable === false) break;
            continue;
          }
        }
        if (settled === undefined) {
          throw lastErr instanceof Error
            ? lastErr
            : new AlgalError(
                "EFFECT_FAILED",
                `cell "${cell.id}" exhausted ${maxAttempts} attempt(s)`,
              );
        }
        if (settled.kind === "final") {
          const bound = settled.bound;
          // shadow mode: the model's decision is recorded, not taken — the
          // declared label stays authoritative until shadow data earns the
          // promotion through review
          const final =
            cell.kind === "classifier" && cell.shadow
              ? cell.shadow.take
              : bound;
          const act: Activation = {
            outputs: { out: final },
            effectDigest: requestDigest,
          };
          if (final !== bound) act.shadowOut = bound;
          if (toolLog.length) act.toolCalls = toolLog;
          return act;
        }
        // bounded callback into the automaton: run the declared fn, log the
        // result, re-request with the updated tool log
        const call = settled;
        const fn = ctx.opts.fns.get(call.fn);
        const external = ctx.opts.tools?.get(call.fn);
        const signature = fn?.signature ?? external?.signature;
        if (!signature) throw new AlgalError("TOOL_UNKNOWN", `tool "${call.fn}" is not configured`);
        for (const [p, decl] of Object.entries(signature.inputs)) {
          const v = (call.inputs as Record<string, JsonValue>)[p];
          if (v === undefined) {
            if (!decl.optional) {
              throw new AlgalError(
                "EFFECT_FAILED",
                `cell "${cell.id}" tool call to ${call.fn} missing required input "${p}"`,
              );
            }
            continue;
          }
          checkValue(v, decl, `${cell.id}.tool.${p}`);
        }
        let toolOut: Record<string, JsonValue>;
        if (fn) {
          ctx.work.units += fn.signature.cost;
          toolOut = fn.fn(call.inputs as Record<string, JsonValue>);
        } else {
          const tool = external!;
          const toolDigest = digestCanonical({
            contract: "algal.tool-effect.v1",
            path: `${path}/t${turn}`,
            tool: call.fn,
            effect: tool.signature.effect,
            inputs: call.inputs,
          } as unknown as JsonValue);
          emit(ctx, { kind: "effect", path, digest: toolDigest });
          const replay = ctx.toolReplay.get(toolDigest)?.shift();
          if (
            !replay &&
            ctx.opts.replayToolEffects !== undefined &&
            ctx.opts.replayToolFallthrough !== true
          ) {
            throw new AlgalError("EFFECT_UNBOUND", `replay has no tool receipt for ${toolDigest}`);
          }
          if (replay) {
            ctx.effects.push(replay);
            if (replay.error) throw new AlgalError(replay.error.code, replay.error.message);
            toolOut = replay.output as Record<string, JsonValue>;
          } else {
            const effect = await toolAttempt(ctx, call.fn, tool,
              call.inputs as Record<string, JsonValue>, toolDigest, cell.budget?.maxEffectMs,
              `agent tool ${call.fn} exceeded maxEffectMs ${cell.budget?.maxEffectMs}`);
            ctx.effects.push(effect);
            if (effect.error) throw new AlgalError(effect.error.code, effect.error.message);
            toolOut = effect.output as Record<string, JsonValue>;
          }
          const bytes = canonicalBytes(toolOut as unknown as JsonValue);
          if (bytes > tool.signature.maxOutputBytes) {
            throw new AlgalError("BUDGET_EXHAUSTED", `tool ${call.fn} output exceeds its byte bound`);
          }
          ctx.work.units += tool.signature.cost + bytes;
        }
        checkOutputs(cell, signature.outputs, toolOut);
        toolLog.push({ fn: call.fn, inputs: call.inputs, output: toolOut as JsonValue });
      }
    }
    case "organism": {
      const subCompiled = compiled.children.get(cell.id)!;
      const subArgs = argsForSubOrganism(subCompiled.manifest, inputs);
      const outcome = await runInto(subCompiled, subArgs, path, ctx, depth + 1);
      if (outcome !== "complete") {
        if (ctx.suspended) {
          throw new AlgalError("EFFECT_SUSPENDED", `inner run at "${path}" suspended`);
        }
        throw new AlgalError(ctx.failure?.code ?? "STUCK", ctx.failure?.message ?? "inner run stuck");
      }
      const out: Record<string, JsonValue> = {};
      const iface = subCompiled.manifest.interface ?? { inputs: {}, outputs: {} };
      for (const [name, target] of Object.entries(iface.outputs)) {
        const rec = ctx.cells[`${path}/${target.cell}`];
        const v = rec?.outputs?.[target.port];
        if (v !== undefined) out[name] = v;
      }
      return { outputs: out };
    }
    case "repeat": {
      const subCompiled = compiled.children.get(cell.id)!;
      const iface = subCompiled.manifest.interface ?? { inputs: {}, outputs: {} };
      const carried: Record<string, JsonValue> = {};
      let out: Record<string, JsonValue> = {};
      let rounds = 0;
      for (let r = 0; r < cell.maxRounds; r++) {
        rounds = r + 1;
        // round inputs: edge-fed values, overridden by carried outputs
        const roundInputs = { ...inputs, ...carried };
        const subArgs = argsForSubOrganism(subCompiled.manifest, roundInputs);
        const roundPath = `${path}/r${r}`;
        const outcome = await runInto(
          subCompiled,
          subArgs,
          roundPath,
          ctx,
          depth + 1,
        );
        if (outcome !== "complete") {
          if (ctx.suspended) {
            throw new AlgalError(
              "EFFECT_SUSPENDED",
              `repeat cell "${cell.id}" round ${r}: inner run suspended`,
            );
          }
          const code = ctx.failure?.code ?? "STUCK";
          throw new AlgalError(
            code,
            ctx.failure?.message ??
              `repeat cell "${cell.id}" round ${r}: inner run ${outcome}`,
          );
        }
        out = {};
        for (const [name, target] of Object.entries(iface.outputs)) {
          const rec = ctx.cells[`${roundPath}/${target.cell}`];
          const v = rec?.outputs?.[target.port];
          if (v !== undefined) out[name] = v;
        }
        for (const [outName, inName] of Object.entries(cell.carry ?? {})) {
          const v = out[outName];
          if (v !== undefined) carried[inName] = v;
        }
        if (cell.until) {
          const v = out[cell.until.output];
          const hit =
            v !== undefined &&
            (cell.until.field === undefined
              ? canonicalize(v) === canonicalize(cell.until.equals)
              : typeof v === "object" &&
                v !== null &&
                !Array.isArray(v) &&
                v[cell.until.field] === cell.until.equals);
          if (hit) break;
        }
      }
      const act: Activation = { outputs: out };
      if (rounds > 1) act.rounds = rounds;
      return act;
    }
    case "each": {
      const subCompiled = compiled.children.get(cell.id)!;
      const iface = subCompiled.manifest.interface ?? { inputs: {}, outputs: {} };
      const list = inputs[cell.over];
      if (!Array.isArray(list)) {
        throw new AlgalError(
          "TYPE_MISMATCH",
          `each cell "${cell.id}" over "${cell.over}" expected a list`,
        );
      }
      if (list.length > cell.maxItems) {
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          `each cell "${cell.id}" got ${list.length} items, maxItems ${cell.maxItems}`,
        );
      }
      // element type check against the inner input port's declared type
      const overTarget = iface.inputs[cell.over]!;
      const elDecl =
        subCompiled.ports.get(overTarget.cell)?.outputs[overTarget.port];
      const out: Record<string, JsonValue> = {};
      for (const name of Object.keys(iface.outputs)) out[name] = [];
      for (let i = 0; i < list.length; i++) {
        const item = list[i]!;
        if (elDecl) checkValue(item, elDecl, `${cell.id}.${cell.over}[${i}]`);
        const subArgs = argsForSubOrganism(subCompiled.manifest, {
          ...inputs,
          [cell.over]: item,
        });
        const itemPath = `${path}/i${i}`;
        const outcome = await runInto(subCompiled, subArgs, itemPath, ctx, depth + 1);
        if (outcome !== "complete") {
          if (ctx.suspended) {
            throw new AlgalError(
              "EFFECT_SUSPENDED",
              `each cell "${cell.id}" item ${i}: inner run suspended`,
            );
          }
          const code = ctx.failure?.code ?? "STUCK";
          throw new AlgalError(
            code,
            ctx.failure?.message ??
              `each cell "${cell.id}" item ${i}: inner run ${outcome}`,
          );
        }
        for (const [name, target] of Object.entries(iface.outputs)) {
          const rec = ctx.cells[`${itemPath}/${target.cell}`];
          const v = rec?.outputs?.[target.port];
          if (v !== undefined) (out[name] as JsonValue[]).push(v);
        }
      }
      const act: Activation = { outputs: out };
      if (list.length > 0) act.items = list.length;
      return act;
    }
  }
}

function unboundExecutor(kind: EffectKind): Executor {
  return {
    id: "unbound",
    capabilities: { effects: [kind] },
    cacheable: false,
    retryable: false,
    async execute() {
      throw new AlgalError(
        "EFFECT_UNBOUND",
        "no host-admitted executor for this request",
      );
    },
  };
}

function pickExecutor(
  request: EffectRequest,
  executors: Executor[],
): Executor {
  // replay resolves by request digest before live routing — but only when it
  // actually holds a receipt: a resume run replays the recorded prefix and
  // falls through to live selection for everything the checkpoint lacks
  const replay = executors.find(
    (executor) => executor.replay === true && executor.serves?.(request) !== false,
  );
  if (replay) return replay;
  const live = executors.filter((executor) => executor.replay !== true);
  const kind = request.kind;
  const route = request.route;
  const wanted = [
    ...(route?.provider ? [route.provider, `provider:${route.provider}`] : []),
    ...(route?.preset ? [route.preset, `preset:${route.preset}`] : []),
  ];
  if (wanted.length > 0) {
    const routed = live.find((executor) => wanted.includes(executor.id));
    if (routed) return executorSupports(routed, kind) ? routed : unboundExecutor(kind);
    return live.find((executor) =>
      executor.routeWildcard === true && executorSupports(executor, kind)
    ) ?? unboundExecutor(kind);
  }
  return live.find((executor) => executorSupports(executor, kind)) ?? unboundExecutor(kind);
}

export function checkValue(v: JsonValue, decl: PortType, what: string): void {
  // a port never carries a value over maxValueBytes — bulk goes through CAS
  const bytes = canonicalBytes(v);
  if (bytes > BOUNDS.maxValueBytes) {
    throw new AlgalError(
      "BUDGET_EXHAUSTED",
      `${what}: value ${bytes}B exceeds maxValueBytes ${BOUNDS.maxValueBytes}B — pin large payloads through a store cell`,
    );
  }
  if (decl.many) {
    if (!Array.isArray(v)) {
      throw new AlgalError("TYPE_MISMATCH", `${what}: expected a list`);
    }
    const { many: _many, ...el } = decl;
    for (let i = 0; i < v.length; i++) {
      checkValue(v[i]!, el, `${what}[${i}]`);
    }
    return;
  }
  switch (decl.type) {
    case "text":
      if (typeof v !== "string") {
        throw new AlgalError("TYPE_MISMATCH", `${what}: expected text`);
      }
      return;
    case "choice":
      if (typeof v !== "string") {
        throw new AlgalError("TYPE_MISMATCH", `${what}: expected choice label`);
      }
      if (decl.labels && !decl.labels.includes(v)) {
        throw new AlgalError(
          "TYPE_MISMATCH",
          `${what}: "${v}" not in declared labels`,
        );
      }
      return;
    case "ref":
      if (
        typeof v !== "string" ||
        !/^sha256:[0-9a-f]{64}$/.test(v)
      ) {
        throw new AlgalError(
          "TYPE_MISMATCH",
          `${what}: expected a sha256 ref token`,
        );
      }
      return;
    case "cap":
      parseCapabilityHandle(v, decl.capability, what);
      return;
    case "json":
      if (decl.schema) checkSchema(decl.schema, v, what, "TYPE_MISMATCH");
      return;
  }
}

/** A ref token admitted through `input`/`const` must already point at CAS —
 * refs are minted by `store` cells or supplied by the caller, never invented. */
async function checkRefsResolve(
  ctx: RunContext,
  decl: PortType & { value?: JsonValue },
  v: JsonValue,
  what: string,
): Promise<void> {
  if (decl.type !== "ref") return;
  const tokens = decl.many ? (v as JsonValue[]) : [v];
  for (const t of tokens) {
    if ((await ctx.opts.store.getValue(t as Digest)) === undefined) {
      throw new AlgalError(
        "INPUT_MISSING",
        `${what}: ref ${t} not in store`,
      );
    }
  }
}

function checkOutputs(
  cell: Cell,
  outputs: Record<string, PortType>,
  produced: Record<string, JsonValue>,
): void {
  for (const [port, decl] of Object.entries(outputs)) {
    const v = produced[port];
    if (v === undefined) continue;
    checkValue(v, decl, `${cell.id}.${port}`);
  }
  for (const port of Object.keys(produced)) {
    if (!outputs[port]) {
      throw new AlgalError(
        "TYPE_MISMATCH",
        `${cell.id}: produced undeclared output "${port}"`,
      );
    }
  }
}

function fail(
  ctx: RunContext,
  path: string | undefined,
  code: ErrorCode,
  message: string,
): "failed" {
  // first failure wins — a nested failure keeps its innermost path
  if (!ctx.failure) {
    ctx.failure = { code, message, ...(path ? { path } : {}) };
  }
  return "failed";
}

// ------------------------------------------------------------ parse/verify ---

export const RECEIPT_BOUNDS = {
  maxBytes: 67_108_864,
  maxDepth: 64,
  maxNodes: 1_000_000,
  maxCells: BOUNDS.maxSteps * BOUNDS.maxCells,
  maxEffects: BOUNDS.maxSteps * BOUNDS.maxTurns + BOUNDS.maxAgentCalls,
} as const;

/** Validate foreign checkpoints before inspecting or replaying them. Digest
 * consistency is checked by resume; verify still reports tampering as a diff. */
export function parseRunReceipt(u: unknown): RunReceipt {
  const pending: { value: unknown; depth: number }[] = [{ value: u, depth: 0 }];
  let nodes = 0;
  let stringBytes = 0;
  while (pending.length > 0) {
    const { value, depth } = pending.pop()!;
    if (++nodes > RECEIPT_BOUNDS.maxNodes || depth > RECEIPT_BOUNDS.maxDepth) {
      throw new AlgalError("PARSE_FAILED", "receipt structural bounds exceeded");
    }
    if (typeof value === "string") {
      stringBytes += Buffer.byteLength(value, "utf8");
      if (stringBytes > RECEIPT_BOUNDS.maxBytes) {
        throw new AlgalError("PARSE_FAILED", "receipt byte bound exceeded");
      }
    } else if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        stringBytes += Buffer.byteLength(key, "utf8");
        pending.push({ value: child, depth: depth + 1 });
        if (pending.length > RECEIPT_BOUNDS.maxNodes) {
          throw new AlgalError("PARSE_FAILED", "receipt node bound exceeded");
        }
      }
    } else if (value !== null && typeof value !== "boolean" &&
      (typeof value !== "number" || !Number.isFinite(value))) {
      throw new AlgalError("PARSE_FAILED", "receipt must contain only JSON values");
    }
  }
  if (canonicalBytes(u as JsonValue) > RECEIPT_BOUNDS.maxBytes) {
    throw new AlgalError("PARSE_FAILED", "receipt byte bound exceeded");
  }
  const r = asObject(u, "receipt");
  noUnknownKeys(r, ["contract", "runtime", "manifestDigest", "manifestKey", "args",
    "outcome", "cells", "effects", "events", "work", "failure", "digest"], "receipt");
  if (r.contract !== RUN_CONTRACT) {
    throw new AlgalError("PARSE_FAILED", `expected contract "${RUN_CONTRACT}"`);
  }
  const runtime = asObject(reqField(r, "runtime", "receipt"), "receipt.runtime");
  noUnknownKeys(runtime, ["name", "version"], "receipt.runtime");
  if (runtime.name !== "algal") throw new AlgalError("PARSE_FAILED", "unknown receipt runtime");
  asString(reqField(runtime, "version", "receipt.runtime"), "runtime.version", 128);
  asDigest(reqField(r, "digest", "receipt"), "receipt.digest");
  asDigest(reqField(r, "manifestDigest", "receipt"), "receipt.manifestDigest");
  asString(reqField(r, "manifestKey", "receipt"), "receipt.manifestKey", 256);
  const args = asObject(reqField(r, "args", "receipt"), "receipt.args");
  if (canonicalBytes(args) > BOUNDS.maxArgsBytes) throw new AlgalError("PARSE_FAILED", "receipt args too large");
  for (const value of Object.values(args)) asObject(value, "receipt input args");
  if (typeof r.outcome !== "string" || !["complete", "failed", "stuck", "suspended"].includes(r.outcome)) {
    throw new AlgalError("PARSE_FAILED", "unknown receipt outcome");
  }
  const work = asObject(reqField(r, "work", "receipt"), "receipt.work");
  noUnknownKeys(work, ["steps", "agentCalls", "units"], "receipt.work");
  for (const key of ["steps", "agentCalls", "units"]) {
    asInt(reqField(work, key, "receipt.work"), `receipt.work.${key}`, 0, Number.MAX_SAFE_INTEGER);
  }
  const failure = (value: unknown, what: string, path: boolean): void => {
    const f = asObject(value, what);
    noUnknownKeys(f, path ? ["code", "message", "path"] : ["code", "message"], what);
    if (!ERROR_CODES.includes(f.code as ErrorCode)) throw new AlgalError("PARSE_FAILED", `${what}.code is unknown`);
    asString(reqField(f, "message", what), `${what}.message`, RECEIPT_BOUNDS.maxBytes);
    if (f.path !== undefined) asString(f.path, `${what}.path`, 4096);
  };
  if (r.failure !== undefined) failure(r.failure, "receipt.failure", true);
  const cells = asObject(reqField(r, "cells", "receipt"), "receipt.cells");
  if (Object.keys(cells).length > RECEIPT_BOUNDS.maxCells) throw new AlgalError("PARSE_FAILED", "too many receipt cells");
  for (const [path, value] of Object.entries(cells)) {
    asString(path, "cell path", 4096);
    const cell = asObject(value, "receipt cell");
    noUnknownKeys(cell, ["status", "outputs", "failure", "work", "effectDigest", "toolCalls",
      "shadowOut", "rounds", "items", "via", "slot"], "receipt cell");
    if (typeof cell.status !== "string" || !["committed", "skipped", "failed", "suspended"].includes(cell.status)) {
      throw new AlgalError("PARSE_FAILED", "unknown receipt cell status");
    }
    asInt(reqField(cell, "work", "receipt cell"), "cell.work", 0, Number.MAX_SAFE_INTEGER);
    if (cell.outputs !== undefined) asObject(cell.outputs, "cell.outputs");
    if (cell.failure !== undefined) failure(cell.failure, "cell.failure", false);
    if (cell.effectDigest !== undefined) asDigest(cell.effectDigest, "cell.effectDigest");
    if (cell.toolCalls !== undefined) asArray(cell.toolCalls, "cell.toolCalls");
    for (const key of ["rounds", "items"]) {
      if (cell[key] !== undefined) asInt(cell[key], `cell.${key}`, 0, Number.MAX_SAFE_INTEGER);
    }
    if (cell.via !== undefined) asString(cell.via, "cell.via", 128);
    if (cell.slot !== undefined) {
      const slot = asObject(cell.slot, "cell.slot");
      noUnknownKeys(slot, ["name", "mode"], "cell.slot");
      asString(reqField(slot, "name", "cell.slot"), "slot.name", 128);
      if (slot.mode !== "read" && slot.mode !== "write") throw new AlgalError("PARSE_FAILED", "unknown slot mode");
    }
  }
  const effects = asArray(reqField(r, "effects", "receipt"), "receipt.effects");
  if (effects.length > RECEIPT_BOUNDS.maxEffects) throw new AlgalError("PARSE_FAILED", "too many receipt effects");
  for (const effect of effects) parseEffectReceipt(effect);
  const events = asArray(reqField(r, "events", "receipt"), "receipt.events");
  if (events.length > BOUNDS.maxEvents) throw new AlgalError("PARSE_FAILED", "too many receipt events");
  for (const value of events) {
    const event = asObject(value, "receipt event");
    noUnknownKeys(event, ["seq", "kind", "path", "digest", "outcome"], "receipt event");
    asInt(reqField(event, "seq", "receipt event"), "event.seq", 0, Number.MAX_SAFE_INTEGER);
    if (typeof event.kind !== "string" || !["run.start", "cell.commit", "cell.skip", "cell.fail", "cell.suspend", "effect", "run.end"].includes(event.kind)) {
      throw new AlgalError("PARSE_FAILED", "unknown receipt event kind");
    }
    if (event.path !== undefined) asString(event.path, "event.path", 4096);
    if (event.digest !== undefined) asDigest(event.digest, "event.digest");
    if (event.outcome !== undefined) asString(event.outcome, "event.outcome", 32);
  }
  return r as unknown as RunReceipt;
}

export function canonicalizeReceipt(r: RunReceipt): string {
  return canonicalize(r as unknown as JsonValue);
}
