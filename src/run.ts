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
import { manifestToJson } from "./contract";
import {
  bindOutput,
  effectRequestDigest,
  type EffectReceipt,
  type EffectRequest,
  type Executor,
} from "./effects";
import type { FnRegistry } from "./registry";
import type { Store } from "./store";
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
  work: number;
  effectDigest?: string;
  toolCalls?: JsonValue[];
  shadowOut?: JsonValue;
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
  const compiled = await compileOrganism(opts.manifest, opts.fns, opts.store);
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
  const state = new Map<string, "pending" | "done" | "skipped">();
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
    if (st === "skipped") {
      edgeState[i] = "dead";
      return;
    }
    if (st !== "done") return;
    const v = produced.get(src)?.get(e.from.port);
    if (v === undefined) {
      edgeState[i] = "dead";
      return;
    }
    if (e.guard && v !== e.guard.equals) {
      edgeState[i] = "dead";
      return;
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

      // input values
      const inputs: Record<string, JsonValue> = {};
      for (const { edge, port } of inbound.get(cell.id) ?? []) {
        if (edgeState[edge] === "delivered") inputs[port] = edgeValue[edge]!;
      }

      const nonEmpty = inputNames.filter((p) => inputs[p] !== undefined);
      const requiredMissing = inputNames.some(
        (p) => sig.inputs[p]!.optional !== true && inputs[p] === undefined,
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
      ctx.work.units += WORK.activation;

      try {
        const act = await activate(cell, inputs, args, compiled, ctx, cellPath(cell.id), depth);
        checkOutputs(cell, sig.outputs, act.outputs);
        produced.set(cell.id, new Map(Object.entries(act.outputs)));
        state.set(cell.id, "done");
        const rec: CellRecord = { status: "committed", work: 0 };
        if (Object.keys(act.outputs).length) rec.outputs = act.outputs;
        if (act.effectDigest) rec.effectDigest = act.effectDigest;
        if (act.toolCalls) rec.toolCalls = act.toolCalls as unknown as JsonValue[];
        if (act.shadowOut !== undefined) rec.shadowOut = act.shadowOut;
        ctx.cells[cellPath(cell.id)] = rec;
        emit(ctx, { kind: "cell.commit", path: cellPath(cell.id) });
      } catch (e) {
        const rep = errorReport(e);
        ctx.cells[cellPath(cell.id)] = { status: "failed", work: 0 };
        emit(ctx, { kind: "cell.fail", path: cellPath(cell.id) });
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
        out[port] = v;
      }
      return { outputs: out };
    }
    case "const": {
      const out: Record<string, JsonValue> = {};
      for (const [port, decl] of Object.entries(cell.outputs)) {
        checkValue(decl.value, decl, `${cell.id}.${port}`);
        out[port] = decl.value;
      }
      return { outputs: out };
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
    case "classifier": {
      const budgets = ctx.budgets;
      const maxCtx = cell.budget?.maxContextBytes ?? budgets.maxContextBytes;
      const maxOut = cell.budget?.maxOutputBytes ?? budgets.maxOutputBytes;
      const maxTurns = cell.budget?.maxTurns ?? (cell.tools?.length ? 8 : 1);

      const viewInputs: Record<string, JsonValue> = {};
      const wanted = cell.view.inputs;
      for (const [k, v] of Object.entries(inputs)) {
        if (wanted === "*" || wanted.includes(k)) viewInputs[k] = v;
      }
      const executor = pickExecutor(ctx.opts.executors, cell);
      const toolLog: { fn: string; inputs: JsonValue; output: JsonValue }[] = [];

      for (let turn = 0; ; turn++) {
        if (turn >= maxTurns) {
          throw new MorphogenError(
            "BUDGET_EXHAUSTED",
            `cell "${cell.id}" produced no final output within maxTurns ${maxTurns}`,
          );
        }
        const context: JsonObject = { inputs: viewInputs, turn };
        if (cell.view.note !== undefined) context.note = cell.view.note;
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

        if (ctx.work.agentCalls + 1 > budgets.maxAgentCalls) {
          throw new MorphogenError("BUDGET_EXHAUSTED", "maxAgentCalls exhausted");
        }
        ctx.work.agentCalls += 1;
        ctx.work.units += WORK.effectBase + contextBytes * WORK.perContextByte;
        emit(ctx, { kind: "effect", path, digest: requestDigest });

        const raw = await executor.execute(request);
        const outBytes = canonicalBytes(raw);
        if (outBytes > maxOut) {
          throw new MorphogenError(
            "BUDGET_EXHAUSTED",
            `effect output ${outBytes}B exceeds maxOutputBytes ${maxOut}B`,
          );
        }
        ctx.work.units += outBytes * WORK.perOutputByte;
        const meta = executor.receiptFor?.(request);
        const eff: EffectReceipt = {
          requestDigest,
          output: raw,
          executor: meta?.executor ?? executor.id,
        };
        if (meta?.usage) eff.usage = meta.usage;
        ctx.effects.push(eff);

        const call = asToolCall(raw, cell.tools);
        if (!call) {
          const bound = bindOutput(cell.output, raw, cell.id);
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
  const route = cell.kind === "agent" || cell.kind === "classifier" ? cell.route : undefined;
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
    case "json":
      return;
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
  ctx.failure = { code, message, ...(path ? { path } : {}) };
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
