// The scheduler. A run sweeps the organism's cells in declared order;
// a cell activates when every declared input is resolved (each incoming
// edge delivered or dead) and the required/emptiness rules hold. Each
// activation is atomic and bounded; effect requests leave through the
// executor seam and return as receipts. No wall-clock values are recorded:
// a receipt is replayable bit-for-bit.

import { MorphogenError, errorReport, type ErrorCode } from "./errors";
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
  type EffectReceipt,
  type EffectRequest,
  type Executor,
} from "./effects";
import type { FnRegistry } from "./registry";
import type { Store } from "./store";
import type { Transport } from "./transport";
import { digestCanonical, type Digest } from "./digest";
import {
  canonicalBytes,
  canonicalize,
  type JsonObject,
  type JsonValue,
} from "./values";

export const RUN_CONTRACT = "morphogen.run.v1" as const;
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
    | "effect"
    | "run.end";
  path?: string;
  digest?: string;
  outcome?: string;
};

export type CellRecord = {
  status: "committed" | "skipped" | "failed";
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

export type RunReceipt = {
  contract: typeof RUN_CONTRACT;
  runtime: { name: "morphogen"; version: string };
  manifestDigest: Digest;
  manifestKey: string;
  args: Record<string, Record<string, JsonValue>>;
  outcome: "complete" | "failed" | "stuck";
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
  seq: number;
};

export async function runOrganism(opts: RunOptions): Promise<RunReceipt> {
  const manifestDigest = digestCanonical(manifestToJson(opts.manifest));
  const ctx: RunContext = {
    opts,
    budgets: opts.manifest.budgets,
    cells: {},
    effects: [],
    events: [],
    work: { steps: 0, agentCalls: 0, units: 0 },
    seq: 0,
  };
  emit(ctx, { kind: "run.start", digest: manifestDigest });
  const compiled = await compileOrganism(
    opts.manifest,
    opts.fns,
    opts.store,
    0,
    opts.transports,
  );
  const outcome = await runInto(compiled, opts.args ?? {}, "", ctx, 0);
  emit(ctx, { kind: "run.end", outcome });
  const receipt: Omit<RunReceipt, "digest"> = {
    contract: RUN_CONTRACT,
    runtime: { name: "morphogen", version: RUNTIME_VERSION },
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
): Promise<"complete" | "failed" | "stuck"> {
  const { manifest, ports, inbound } = compiled;
  const budgets = ctx.budgets;
  if (depth > budgets.maxDepth) {
    return fail(ctx, pathPrefix, "DEPTH_EXCEEDED", `depth ${depth} exceeds maxDepth ${budgets.maxDepth}`);
  }

  // produced outputs per cell: cellId -> port -> value
  const produced = new Map<string, Map<string, JsonValue>>();
  const state = new Map<string, "pending" | "done" | "skipped" | "failed">();
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
      const hit =
        e.guard.field === undefined
          ? v === e.guard.equals
          : typeof v === "object" &&
            v !== null &&
            !Array.isArray(v) &&
            v[e.guard.field] === e.guard.equals;
      if (!hit) {
        edgeState[i] = "dead";
        return;
      }
    }
    edgeState[i] = "delivered";
    edgeValue[i] = v;
  };

  const cellPath = (id: string) => (pathPrefix ? `${pathPrefix}/${id}` : id);

  let outcome: "complete" | "failed" | "stuck" = "complete";
  let progress = true;
  while (progress && !ctx.failure) {
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
        const rep = errorReport(e);
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

  if (ctx.failure) {
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

async function activate(
  cell: Cell,
  inputs: Record<string, JsonValue>,
  args: Record<string, Record<string, JsonValue>>,
  compiled: CompiledOrganism,
  ctx: RunContext,
  path: string,
  depth: number,
): Promise<Activation> {
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
        throw new MorphogenError(
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
        throw new MorphogenError(
          "INPUT_MISSING",
          `${cell.id}: ref ${ref} not in store`,
        );
      }
      const bytes = canonicalBytes(v);
      if (bytes > BOUNDS.maxBlobBytes) {
        throw new MorphogenError(
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
          throw new MorphogenError(
            "BUDGET_EXHAUSTED",
            `${cell.id}: slot payload ${bytes}B exceeds maxBlobBytes ${BOUNDS.maxBlobBytes}B`,
          );
        }
        ctx.work.units += bytes * WORK.perOutputByte;
        await ctx.opts.store.setSlot(cell.name, data);
        return { outputs: { data } };
      }
      // read: replay serves the recorded outcome — a live slot may have
      // been overwritten since the run being verified
      const rep = ctx.opts.replaySlots?.[path];
      if (rep !== undefined) {
        if (rep.missing) {
          throw new MorphogenError(
            "INPUT_MISSING",
            `slot cell "${cell.id}": slot "${cell.name}" is empty and declares no default`,
          );
        }
        return { outputs: { data: rep.value! } };
      }
      const stored = await ctx.opts.store.getSlot(cell.name);
      const v = stored !== undefined ? stored : cell.default;
      if (v === undefined) {
        throw new MorphogenError(
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
      );
      const rawArgs = inputs.args ?? {};
      if (
        rawArgs === null ||
        typeof rawArgs !== "object" ||
        Array.isArray(rawArgs)
      ) {
        throw new MorphogenError(
          "TYPE_MISMATCH",
          `spawn cell "${cell.id}": args must be a record of interface inputs`,
        );
      }
      const subArgs = argsForSubOrganism(
        subManifest,
        rawArgs as Record<string, JsonValue>,
      );
      await runInto(subCompiled, subArgs, path, ctx, depth + 1);
      if (ctx.failure) {
        throw new MorphogenError(ctx.failure.code, ctx.failure.message);
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
    case "agent":
    case "classifier":
    case "gate": {
      const budgets = ctx.budgets;
      const maxCtx = cell.budget?.maxContextBytes ?? budgets.maxContextBytes;
      const maxOut = cell.budget?.maxOutputBytes ?? budgets.maxOutputBytes;
      const tools = cell.kind === "gate" ? undefined : cell.tools;
      const maxTurns = cell.budget?.maxTurns ?? (tools?.length ? 8 : 1);

      const viewInputs: Record<string, JsonValue> = {};
      const wanted = cell.view.inputs;
      for (const [k, v] of Object.entries(inputs)) {
        if (wanted === "*" || wanted.includes(k)) viewInputs[k] = v;
      }
      const executor = pickExecutor(ctx.opts.executors, cell);
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
          throw new MorphogenError(
            "BUDGET_EXHAUSTED",
            `cell "${cell.id}" produced no final output within maxTurns ${maxTurns}`,
          );
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
                      guard: {
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
          throw new MorphogenError(
            "BUDGET_EXHAUSTED",
            `context view ${contextBytes}B exceeds maxContextBytes ${maxCtx}B`,
          );
        }

        const request: EffectRequest = {
          contract: "morphogen.effect.v1",
          cellId: cell.id,
          kind: cell.kind,
          prompt: cell.prompt,
          context,
          output: cell.output,
          budget: { maxContextBytes: maxCtx, maxOutputBytes: maxOut },
          ...(cell.route ? { route: cell.route } : {}),
        };
        const requestDigest = effectRequestDigest(request);

        // retry: each attempt is a separate effect — request, receipt, work
        // charge, agent-call count. A failed or contract-violating attempt
        // is recorded and the same request re-issued until `attempts` is
        // exhausted; replay serves the recorded attempts in order.
        const maxAttempts =
          (cell.kind === "agent" ||
            cell.kind === "classifier" ||
            cell.kind === "gate"
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
          if (ctx.work.agentCalls + 1 > budgets.maxAgentCalls) {
            throw new MorphogenError("BUDGET_EXHAUSTED", "maxAgentCalls exhausted");
          }
          ctx.work.agentCalls += 1;
          ctx.work.units += WORK.effectBase + contextBytes * WORK.perContextByte;
          emit(ctx, { kind: "effect", path, digest: requestDigest });

          const meta = await executor.receiptFor?.(request);
          let raw: JsonValue;
          // budget.maxEffectMs bounds each call wall-clock; the timeout is
          // recorded as an effect error so retry and replay both see it
          const effectMs = cell.budget?.maxEffectMs;
          try {
            if (effectMs === undefined) {
              raw = await executor.execute(request);
            } else {
              const ac = new AbortController();
              const timer = setTimeout(() => ac.abort(), effectMs);
              try {
                raw = await Promise.race([
                  executor.execute(request, ac.signal),
                  new Promise<never>((_, reject) =>
                    ac.signal.addEventListener(
                      "abort",
                      () =>
                        reject(
                          new MorphogenError(
                            "BUDGET_EXHAUSTED",
                            `cell "${cell.id}" effect exceeded maxEffectMs ${effectMs}`,
                          ),
                        ),
                      { once: true },
                    ),
                  ),
                ]);
              } finally {
                clearTimeout(timer);
              }
            }
          } catch (e) {
            // a failed effect is recorded too — replay must reproduce the
            // same failure for the run to verify bit-for-bit
            const rep = errorReport(e);
            const eff: EffectReceipt = {
              requestDigest,
              error: { code: rep.code, message: rep.message },
              executor: meta?.executor ?? executor.id,
            };
            if (meta?.usage) eff.usage = meta.usage;
            if (meta?.cached) eff.cached = true;
            ctx.effects.push(eff);
            lastErr = e;
            continue;
          }
          // the response is a fact of the run: it is recorded before any
          // contract check so replay reproduces bad output verbatim
          const eff: EffectReceipt = {
            requestDigest,
            output: raw,
            executor: meta?.executor ?? executor.id,
          };
          if (meta?.usage) eff.usage = meta.usage;
          if (meta?.cached) eff.cached = true;
          ctx.effects.push(eff);

          const outBytes = canonicalBytes(raw);
          if (outBytes > maxOut) {
            lastErr = new MorphogenError(
              "BUDGET_EXHAUSTED",
              `effect output ${outBytes}B exceeds maxOutputBytes ${maxOut}B`,
            );
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
              bound: bindOutput(cell.output, raw, cell.id),
            };
          } catch (e) {
            lastErr = e;
            continue;
          }
        }
        if (settled === undefined) {
          throw lastErr instanceof Error
            ? lastErr
            : new MorphogenError(
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
        const entry = ctx.opts.fns.get(call.fn)!;
        ctx.work.units += entry.signature.cost;
        for (const [p, decl] of Object.entries(entry.signature.inputs)) {
          const v = (call.inputs as Record<string, JsonValue>)[p];
          if (v === undefined) {
            if (!decl.optional) {
              throw new MorphogenError(
                "EFFECT_FAILED",
                `cell "${cell.id}" tool call to ${call.fn} missing required input "${p}"`,
              );
            }
            continue;
          }
          checkValue(v, decl, `${cell.id}.tool.${p}`);
        }
        const toolOut = entry.fn(call.inputs as Record<string, JsonValue>);
        toolLog.push({ fn: call.fn, inputs: call.inputs, output: toolOut as JsonValue });
      }
    }
    case "organism": {
      const subCompiled = compiled.children.get(cell.id)!;
      const subArgs = argsForSubOrganism(subCompiled.manifest, inputs);
      await runInto(subCompiled, subArgs, path, ctx, depth + 1);
      if (ctx.failure) {
        throw new MorphogenError(ctx.failure.code, ctx.failure.message);
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
          const code = ctx.failure?.code ?? "STUCK";
          throw new MorphogenError(
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
        throw new MorphogenError(
          "TYPE_MISMATCH",
          `each cell "${cell.id}" over "${cell.over}" expected a list`,
        );
      }
      if (list.length > cell.maxItems) {
        throw new MorphogenError(
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
          const code = ctx.failure?.code ?? "STUCK";
          throw new MorphogenError(
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

function pickExecutor(executors: Executor[], cell: Cell): Executor {
  if (executors.length === 0) {
    throw new MorphogenError(
      "EFFECT_UNBOUND",
      `no executor available for cell "${cell.id}"`,
    );
  }
  // route.provider / route.preset select an executor by id; a bare id or a
  // "provider:<name>"/"preset:<name>" prefixed id both match
  const route =
    cell.kind === "agent" || cell.kind === "classifier" || cell.kind === "gate"
      ? cell.route
      : undefined;
  if (route) {
    const wanted = [
      ...(route.provider ? [route.provider, `provider:${route.provider}`] : []),
      ...(route.preset ? [route.preset, `preset:${route.preset}`] : []),
    ];
    const hit = executors.find((e) => wanted.includes(e.id));
    if (hit) return hit;
  }
  return executors[0]!;
}

function checkValue(v: JsonValue, decl: PortType, what: string): void {
  // a port never carries a value over maxValueBytes — bulk goes through CAS
  const bytes = canonicalBytes(v);
  if (bytes > BOUNDS.maxValueBytes) {
    throw new MorphogenError(
      "BUDGET_EXHAUSTED",
      `${what}: value ${bytes}B exceeds maxValueBytes ${BOUNDS.maxValueBytes}B — pin large payloads through a store cell`,
    );
  }
  if (decl.many) {
    if (!Array.isArray(v)) {
      throw new MorphogenError("TYPE_MISMATCH", `${what}: expected a list`);
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
        throw new MorphogenError("TYPE_MISMATCH", `${what}: expected text`);
      }
      return;
    case "choice":
      if (typeof v !== "string") {
        throw new MorphogenError("TYPE_MISMATCH", `${what}: expected choice label`);
      }
      if (decl.labels && !decl.labels.includes(v)) {
        throw new MorphogenError(
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
        throw new MorphogenError(
          "TYPE_MISMATCH",
          `${what}: expected a sha256 ref token`,
        );
      }
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
      throw new MorphogenError(
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
      throw new MorphogenError(
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

export function parseRunReceipt(u: unknown): RunReceipt {
  const r = u as RunReceipt;
  if (r?.contract !== RUN_CONTRACT) {
    throw new MorphogenError("PARSE_FAILED", `expected contract "${RUN_CONTRACT}"`);
  }
  return r;
}

export function canonicalizeReceipt(r: RunReceipt): string {
  return canonicalize(r as unknown as JsonValue);
}
