/**
 * Context-laws harness: algebraic/property laws of `context.compact` and
 * memory recall over an instrumented host, driven against the real code
 * paths — `elideToolContext` (`src/tool-context.ts`), the recorded
 * decide-effect compaction inside `runOrganism` (`src/run.ts`), the derived
 * semantic index (`src/semantic.ts`), the recall executor
 * (`src/semantic-contract.ts`) and `ApplicationMemoryService`
 * (`src/application-memory.ts`) on `MemoryStore` with the instrumented
 * `probeAdmissionHost`/`checkerEngine` from `harness.ts`. No provider, no
 * network, no wall clock; filesystem use is confined to mkdtemp scratch
 * directories for the bun:sqlite index.
 *
 * A law case is SATISFIED when the implementation exhibits the algebraic
 * property the contract publishes — idempotent projection, byte-identical
 * retained sources, deterministic recall, fail-closed authority — and
 * VIOLATED when it loses source binding, diverges on identical inputs, or
 * grants authority the records do not carry.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { putApplicationRecord } from "../../src/application-contract";
import {
  manifestToJson, parseOrganismManifest, type CompactPolicy,
} from "../../src/contract";
import { decisionAnswerSchema } from "../../src/decisions";
import { digestCanonical, type Digest } from "../../src/digest";
import {
  effectRequestDigest, scriptedExecutor, type DecisionQuestions, type EffectRequest,
} from "../../src/effects";
import { localEmbedder } from "../../src/embeddings";
import { builtinRegistry } from "../../src/registry";
import { runOrganism } from "../../src/run";
import { indexSearcher, indexStore, searchIndex } from "../../src/semantic";
import {
  bindRecallOutput, recallExecutor, recallOutputSchema,
} from "../../src/semantic-contract";
import { FileStore } from "../../src/store";
import { MemoryStore } from "../../src/store-memory";
import { elideToolContext } from "../../src/tool-context";
import {
  canonicalBytes, canonicalize, type JsonObject, type JsonValue,
} from "../../src/values";
import { verifyReceipt } from "../../src/verify";
import {
  ApplicationMemoryService, type MemoryQueryEngine,
} from "../../src/application-memory";
import { memoryFixture, ref } from "./harness";

export type LawEvidence = {
  /** true when the implementation satisfies the stated law. */
  ok: boolean;
  /** short evidence note for the report. */
  detail: string;
};

export type LawCase = {
  readonly id: string;
  /** Obligation family: CTX-01..03, MEM-01..06. */
  readonly property: string;
  readonly summary: string;
  run(): Promise<LawEvidence>;
};

export type ContextLawsReport = {
  suite: "context-laws";
  total: number;
  satisfied: number;
  cases: { id: string; property: string; ok: boolean; detail: string }[];
};

export async function runContextLaws(
  cases: LawCase[] = LAW_CASES,
): Promise<ContextLawsReport> {
  const results: ContextLawsReport["cases"] = [];
  for (const c of cases) {
    try {
      const evidence = await c.run();
      results.push({ id: c.id, property: c.property, ok: evidence.ok, detail: evidence.detail });
    } catch (error) {
      results.push({
        id: c.id, property: c.property, ok: false,
        detail: `threw: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return {
    suite: "context-laws",
    total: results.length,
    satisfied: results.filter(r => r.ok).length,
    cases: results,
  };
}

/* ------------------------------------------------------------- fixtures -- */

const dirs: string[] = [];
export async function cleanupContextLaws(): Promise<void> {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
}
async function scratch(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}

/** A scripted pick.v1 call spec — the executor response shape `asToolCall`
 *  recognizes is flat `{tool, inputs}`. */
const pickSpec = (letter: string) =>
  ({ tool: "pick.v1", inputs: { record: { data: letter.repeat(250) }, field: "data" } });
/** A scripted executor response that makes one tool call. */
const pickCall = (letter: string) => pickSpec(letter);
/** The tool-log entry pick.v1 produces for that call — byte-for-byte what
 *  `runOrganism` appends: `{fn, inputs, output}` where output is the fn's
 *  result. */
const logEntry = (letter: string): JsonObject =>
  ({ fn: "pick.v1", inputs: pickSpec(letter).inputs, output: { value: letter.repeat(250) } });
const REF_CONTRACT = "algal.tool-output-ref.v1";

const isRefStub = (output: unknown): output is JsonObject =>
  output !== null && typeof output === "object" && !Array.isArray(output) &&
  (output as JsonObject).contract === REF_CONTRACT;

function policy(over: Partial<CompactPolicy> = {}): CompactPolicy {
  return { mode: "elide", maxLogBytes: 400, ...over };
}

/** Bounded context domain for the projection laws: big and small bodies,
 *  already-projected markers, an empty log, notes and turns. */
function contextDomain(): JsonObject[] {
  return [
    { inputs: {}, turn: 1, toolLog: [logEntry("a"), logEntry("b")] },
    { inputs: {}, turn: 3, note: "n".repeat(200),
      toolLog: [{ fn: "probe.v1", inputs: { id: "s" }, output: { value: "s".repeat(40) } }, logEntry("b"), logEntry("c")] },
    { inputs: {}, turn: 2,
      toolLog: [{ fn: "probe.v1", inputs: { id: "t" },
        output: { contract: REF_CONTRACT, source: ref("prior-stub"), bytes: 1000 } }, logEntry("b")] },
    { inputs: {}, turn: 0, toolLog: [logEntry("a")] },
    { inputs: {}, turn: 2, toolLog: [] },
  ];
}

/** Indexes of entries whose output was replaced by an output-ref stub. */
function stubbedIndexes(context: JsonObject, source: JsonObject): number[] {
  const view = context.toolLog as JsonObject[] | undefined;
  const src = source.toolLog as JsonObject[] | undefined;
  if (!Array.isArray(view) || !Array.isArray(src)) return [];
  const out: number[] = [];
  for (const [i, entry] of view.entries()) {
    if (isRefStub(entry.output) && !isRefStub(src[i]?.output)) out.push(i);
  }
  return out;
}

function decideManifest(compact: CompactPolicy, maxContextBytes = 4000) {
  return parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:context-laws", name: "Context laws",
    cells: [{
      id: "a", kind: "agent", inputs: {},
      prompt: "Read both records then answer",
      output: { kind: "text" }, tools: ["pick.v1"], compact,
      budget: { maxTurns: 5, maxContextBytes, maxOutputBytes: 2000 },
    }],
    edges: [],
  });
}

/** Rebuild the exact compaction request `runOrganism` issued — the digest
 *  binds the pre-compaction log, proving the decide effect covered the full
 *  source record rather than the rebuilt view. */
function compactionRequest(options: {
  cellId: string; maxLogBytes: number; prompt: string;
  turn: number; toolLog: JsonObject[]; droppable: number;
  maxContextBytes: number; maxOutputBytes: number;
}): EffectRequest {
  const questions: DecisionQuestions = {};
  for (let i = 0; i < options.droppable; i++) {
    questions[`keep_${i}`] = {
      type: "noul",
      instructions:
        `Retain context.toolLog[${i}] verbatim — the ` +
        `"${options.toolLog[i]!.fn as string}" call and its result. Is it still needed ` +
        `for the remaining task?`,
    };
  }
  return {
    contract: "algal.effect.v1",
    cellId: options.cellId,
    kind: "decide",
    prompt:
      `Tool-log triage for cell "${options.cellId}". The log exceeds ` +
      `${options.maxLogBytes}B; for each indexed entry decide ` +
      `whether the call and its result must be preserved verbatim ` +
      `for the remaining work. Task: ${options.prompt}`,
    context: { inputs: {}, turn: options.turn, toolLog: options.toolLog },
    output: { kind: "json", schema: decisionAnswerSchema(questions) },
    budget: { maxContextBytes: options.maxContextBytes, maxOutputBytes: options.maxOutputBytes },
    questions,
  };
}

async function decideRun(answers: Record<string, number>, compact: CompactPolicy, maxContextBytes = 4000) {
  const manifest = decideManifest(compact, maxContextBytes);
  const decideAnswers: JsonObject = {
    answers: Object.fromEntries(Object.entries(answers).map(([k, noul]) => [k, { noul }])),
  };
  const executor = scriptedExecutor({ a: [pickCall("a"), pickCall("b"), decideAnswers, "done"] });
  const receipt = await runOrganism({
    manifest, args: {}, fns: builtinRegistry(), store: new MemoryStore(), executors: [executor],
  });
  return { manifest, receipt };
}

/* ------------------------------------------------------------------ laws -- */

export const LAW_CASES: LawCase[] = [
  {
    id: "elide-idempotent",
    property: "CTX-03",
    summary: "compaction is idempotent: projecting an already-projected context changes nothing",
    async run() {
      const ctxs = contextDomain();
      const keepRecents = [0, 1, 2];
      const maxLogs = [100, 400, 4096];
      const maxCtxs = [800, 2048, 8192];
      let cases = 0;
      for (const ctx of ctxs) {
        for (const keepRecent of keepRecents) for (const maxLogBytes of maxLogs) for (const maxContextBytes of maxCtxs) {
          const p = policy({ keepRecent, maxLogBytes });
          const once = elideToolContext(structuredClone(ctx), p, maxContextBytes);
          const twice = elideToolContext(structuredClone(once), p, maxContextBytes);
          if (canonicalize(twice) !== canonicalize(once)) {
            return { ok: false, detail: `E(E(c)) ≠ E(c) for keepRecent=${keepRecent} maxLogBytes=${maxLogBytes} maxCtx=${maxContextBytes}` };
          }
          cases++;
        }
      }
      return { ok: true, detail: `${cases} context/policy combinations idempotent` };
    },
  },
  {
    id: "elide-source-binding",
    property: "CTX-01,CTX-02",
    summary: "every stub binds its source output exactly; retained entries are byte-identical; inputs are never mutated",
    async run() {
      let stubs = 0, kept = 0;
      for (const ctx of contextDomain()) {
        const p = policy({ keepRecent: 0, maxLogBytes: 1 });
        const before = structuredClone(ctx);
        const view = elideToolContext(ctx, p, 128);
        if (canonicalize(ctx) !== canonicalize(before)) {
          return { ok: false, detail: "projection mutated its input context" };
        }
        const srcLog = ctx.toolLog as JsonObject[];
        const outLog = view.toolLog as JsonObject[];
        if (!Array.isArray(outLog) || outLog.length !== srcLog.length) {
          return { ok: false, detail: "tool log length or shape changed" };
        }
        for (const [i, entry] of outLog.entries()) {
          const src = srcLog[i]!;
          if (entry.fn !== src.fn || canonicalize(entry.inputs as JsonValue) !== canonicalize(src.inputs as JsonValue)) {
            return { ok: false, detail: `entry ${i} lost fn/inputs binding` };
          }
          if (isRefStub(entry.output)) {
            stubs++;
            if (isRefStub(src.output)) {
              if (canonicalize(entry.output) !== canonicalize(src.output)) {
                return { ok: false, detail: `entry ${i}: existing marker was rewritten` };
              }
            } else {
              if (entry.output.source !== digestCanonical(src.output as JsonValue) ||
                  entry.output.bytes !== canonicalBytes(src.output as JsonValue)) {
                return { ok: false, detail: `entry ${i}: stub does not bind the exact source output` };
              }
            }
          } else {
            kept++;
            if (canonicalize(entry) !== canonicalize(src)) {
              return { ok: false, detail: `entry ${i}: retained entry is not byte-identical` };
            }
          }
        }
      }
      return { ok: true, detail: `${stubs} stubs bound, ${kept} entries byte-identical across ${contextDomain().length} contexts` };
    },
  },
  {
    id: "elide-budget-monotone",
    property: "CTX-03",
    summary: "the stubbed index set shrinks monotonically as budgets grow — more room never forces more projection",
    async run() {
      const ctxs = contextDomain().slice(0, 3);
      let checks = 0;
      const subset = (a: number[], b: number[]) => a.every(i => b.includes(i));
      for (const ctx of ctxs) {
        // maxLogBytes ascending
        let prev: number[] | undefined;
        for (const maxLogBytes of [100, 400, 4096]) {
          const set = stubbedIndexes(elideToolContext(ctx, policy({ keepRecent: 0, maxLogBytes }), 800), ctx);
          if (prev !== undefined && !subset(set, prev)) {
            return { ok: false, detail: `maxLogBytes ${maxLogBytes} enlarged the stub set` };
          }
          prev = set; checks++;
        }
        // keepRecent ascending
        prev = undefined;
        for (const keepRecent of [0, 1, 2]) {
          const set = stubbedIndexes(elideToolContext(ctx, policy({ keepRecent, maxLogBytes: 1 }), 128), ctx);
          if (prev !== undefined && !subset(set, prev)) {
            return { ok: false, detail: `keepRecent ${keepRecent} enlarged the stub set` };
          }
          prev = set; checks++;
        }
        // maxContextBytes ascending
        prev = undefined;
        for (const maxContextBytes of [128, 800, 8192]) {
          const set = stubbedIndexes(elideToolContext(ctx, policy({ keepRecent: 0, maxLogBytes: 4096 }), maxContextBytes), ctx);
          if (prev !== undefined && !subset(set, prev)) {
            return { ok: false, detail: `maxContextBytes ${maxContextBytes} enlarged the stub set` };
          }
          prev = set; checks++;
        }
      }
      return { ok: true, detail: `${checks} monotone-budget checks over ${ctxs.length} contexts` };
    },
  },
  {
    id: "elide-nonexpanding",
    property: "CTX-03",
    summary: "projection never expands the context: canonical bytes only shrink or stay; markers are used only when strictly smaller",
    async run() {
      let checks = 0, reductions = 0;
      for (const ctx of contextDomain()) {
        for (const p of [policy({ maxLogBytes: 1 }), policy({ maxLogBytes: 400 }), policy({ maxLogBytes: 4096 })]) {
          for (const maxContextBytes of [128, 800, 8192]) {
            const view = elideToolContext(ctx, p, maxContextBytes);
            const before = canonicalBytes(ctx), after = canonicalBytes(view);
            if (after > before) {
              return { ok: false, detail: `projection grew context ${before}B → ${after}B` };
            }
            if (after < before) reductions++;
            const srcLog = ctx.toolLog as JsonObject[] | undefined;
            const outLog = view.toolLog as JsonObject[] | undefined;
            if (Array.isArray(srcLog) && Array.isArray(outLog)) {
              for (const [i, entry] of outLog.entries()) {
                if (isRefStub(entry.output) && !isRefStub(srcLog[i]?.output) &&
                    canonicalBytes(entry.output) >= canonicalBytes(srcLog[i]!.output as JsonValue)) {
                  return { ok: false, detail: `entry ${i}: marker no smaller than its source` };
                }
              }
            }
            checks++;
          }
        }
      }
      return { ok: true, detail: `${checks} non-expansion checks, ${reductions} real reductions` };
    },
  },
  {
    id: "decide-keep-exact",
    property: "CTX-01",
    summary: "the decide-effect triage keeps exactly the entries whose noul ≥ 0.5, byte-identical, pinned tail preserved",
    async run() {
      const compact: CompactPolicy = { maxLogBytes: 700, keepRecent: 0 };
      const { manifest, receipt } = await decideRun({ keep_0: 0.1, keep_1: 0.9 }, compact);
      if (receipt.outcome !== "complete") {
        return { ok: false, detail: `run failed: ${receipt.failure?.message}` };
      }
      const kept = receipt.cells.a!.toolCalls as JsonObject[] | undefined;
      const expected = [logEntry("b")];
      if (canonicalize(kept as unknown as JsonValue) !== canonicalize(expected as unknown as JsonValue)) {
        return { ok: false, detail: `kept log ${canonicalize(kept as unknown as JsonValue)} ≠ expected` };
      }
      const verified = await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), new MemoryStore());
      if (!verified.ok) return { ok: false, detail: `receipt did not replay: ${verified.mismatches.join("; ")}` };
      return { ok: true, detail: "kept entry byte-identical; failed run replays bit-for-bit" };
    },
  },
  {
    id: "decide-pinned-tail",
    property: "CTX-01",
    summary: "keepRecent pins the log tail out of triage — the pinned entry survives a drop answer verbatim",
    async run() {
      const compact: CompactPolicy = { maxLogBytes: 700, keepRecent: 1 };
      const { receipt } = await decideRun({ keep_0: 0.0 }, compact);
      if (receipt.outcome !== "complete") {
        return { ok: false, detail: `run failed: ${receipt.failure?.message}` };
      }
      const kept = receipt.cells.a!.toolCalls as JsonObject[] | undefined;
      const expected = [logEntry("b")];
      if (canonicalize(kept as unknown as JsonValue) !== canonicalize(expected as unknown as JsonValue)) {
        return { ok: false, detail: `pinned tail ${canonicalize(kept as unknown as JsonValue)} ≠ expected` };
      }
      return { ok: true, detail: "pinned tail entry retained byte-identical under a drop-everything triage" };
    },
  },
  {
    id: "decide-preimage-bound",
    property: "CTX-01,CTX-02",
    summary: "the recorded compaction request digest binds the *pre-compaction* log — the projection can never claim the source it masked",
    async run() {
      const compact: CompactPolicy = { maxLogBytes: 700, keepRecent: 0 };
      const { receipt } = await decideRun({ keep_0: 0.0, keep_1: 0.0 }, compact);
      if (receipt.outcome !== "complete") {
        return { ok: false, detail: `run failed: ${receipt.failure?.message}` };
      }
      const full = [logEntry("a"), logEntry("b")];
      const request = compactionRequest({
        cellId: "a", maxLogBytes: 700, prompt: "Read both records then answer",
        turn: 2, toolLog: full, droppable: 2,
        maxContextBytes: 4000, maxOutputBytes: 2000,
      });
      const digest = effectRequestDigest(request);
      const effect = receipt.effects.find(e => e.requestDigest === digest);
      if (!effect) {
        return { ok: false, detail: "no recorded effect binds the pre-compaction log" };
      }
      const answers = (effect.output as JsonObject).answers as JsonObject;
      if (typeof (answers.keep_0 as JsonObject).noul !== "number" || typeof (answers.keep_1 as JsonObject).noul !== "number") {
        return { ok: false, detail: "recorded triage lacks the per-entry keep/drop answers" };
      }
      return { ok: true, detail: "compaction request digest binds both source entries plus the full answer record" };
    },
  },
  {
    id: "decide-monotone",
    property: "CTX-01",
    summary: "kept sets are monotone in the answer vector — stronger keep answers retain a superset, never lose an already-kept entry",
    async run() {
      const compact: CompactPolicy = { maxLogBytes: 700, keepRecent: 0 };
      const runs = await Promise.all([
        decideRun({ keep_0: 0.0, keep_1: 0.0 }, compact),
        decideRun({ keep_0: 0.9, keep_1: 0.0 }, compact),
        decideRun({ keep_0: 0.9, keep_1: 0.9 }, compact),
      ]);
      const keptSets = runs.map(({ receipt }) =>
        new Set(((receipt.cells.a!.toolCalls ?? []) as JsonObject[])
          .map(e => canonicalize(e as unknown as JsonValue))));
      for (const { receipt } of runs) {
        if (receipt.outcome !== "complete") return { ok: false, detail: "a monotone run failed" };
      }
      const ascending = [0, 1, 2] as const;
      for (const i of ascending.slice(1)) {
        if (![...keptSets[i - 1]!].every(k => keptSets[i]!.has(k))) {
          return { ok: false, detail: `kept set ${i - 1} ⊄ kept set ${i}` };
        }
      }
      const sizes = keptSets.map(s => s.size);
      if (!(sizes[0] === 0 && sizes[1] === 1 && sizes[2] === 2)) {
        return { ok: false, detail: `unexpected kept sizes ${sizes}` };
      }
      return { ok: true, detail: `kept sets ∅ ⊆ {entry-a} ⊆ {entry-a,entry-b} monotone (sizes ${sizes})` };
    },
  },
  {
    id: "decide-fail-closed",
    property: "CTX-01,MEM-06",
    summary: "when protected material cannot fit the declared budget the cell fails before any further model call — compaction never silently truncates",
    async run() {
      const compact: CompactPolicy = { maxLogBytes: 700, keepRecent: 0 };
      const { manifest, receipt } = await decideRun({ keep_0: 0.0, keep_1: 0.0 }, compact, 800);
      if (receipt.outcome !== "failed" || receipt.failure?.code !== "BUDGET_EXHAUSTED") {
        return { ok: false, detail: `expected BUDGET_EXHAUSTED failure, got ${receipt.outcome}` };
      }
      if (!receipt.failure.message.includes("compaction context")) {
        return { ok: false, detail: `unexpected failure: ${receipt.failure.message}` };
      }
      if (receipt.effects.length !== 2 || receipt.work.agentCalls !== 2) {
        return { ok: false, detail: `a third model call ran before the bound rejected (${receipt.effects.length} effects)` };
      }
      const verified = await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), new MemoryStore());
      if (!verified.ok) return { ok: false, detail: "failed run did not replay" };
      return { ok: true, detail: "over-budget protected context failed closed before the triage effect issued" };
    },
  },
  {
    id: "decide-replay-deterministic",
    property: "CTX-01,MEM-05",
    summary: "identical inputs produce identical receipts — the triage decision is a recorded effect, not a live dice roll",
    async run() {
      const compact: CompactPolicy = { maxLogBytes: 700, keepRecent: 0 };
      const a = await decideRun({ keep_0: 0.9, keep_1: 0.1 }, compact);
      const b = await decideRun({ keep_0: 0.9, keep_1: 0.1 }, compact);
      if (a.receipt.digest !== b.receipt.digest) {
        return { ok: false, detail: "identical runs produced different receipts" };
      }
      return { ok: true, detail: `receipt digest ${a.receipt.digest.slice(0, 23)}… reproduced` };
    },
  },
  {
    id: "elide-run-retains-source",
    property: "CTX-01,CTX-02",
    summary: "the elide-mode run records the *full* tool log in the receipt while the model saw only the projection — verified by rebuilding the exact request digest",
    async run() {
      const compact: CompactPolicy = { mode: "elide", maxLogBytes: 700, keepRecent: 1 };
      const manifest = decideManifest(compact, 1100);
      const receipt = await runOrganism({
        manifest, args: {}, fns: builtinRegistry(), store: new MemoryStore(),
        executors: [scriptedExecutor({ a: [pickCall("a"), pickCall("b"), "done"] })],
      });
      if (receipt.outcome !== "complete") {
        return { ok: false, detail: `run failed: ${receipt.failure?.message}` };
      }
      const full = receipt.cells.a!.toolCalls as JsonObject[];
      if (canonicalize(full as unknown as JsonValue) !== canonicalize([logEntry("a"), logEntry("b")] as unknown as JsonValue)) {
        return { ok: false, detail: "receipt lost the pre-projection log" };
      }
      // The third effect is the final agent request: rebuild what the model
      // actually saw — the projected context — and bind it by digest.
      const projected = elideToolContext(
        { inputs: {}, turn: 2, toolLog: [logEntry("a"), logEntry("b")] } as JsonObject,
        compact, 1100);
      const request: EffectRequest = {
        contract: "algal.effect.v1", cellId: "a", kind: "agent",
        prompt: "Read both records then answer",
        context: projected,
        output: { kind: "text" },
        budget: { maxContextBytes: 1100, maxOutputBytes: 2000 },
      };
      const digest = effectRequestDigest(request);
      const final = receipt.effects.find(e => e.requestDigest === digest);
      if (!final) {
        return { ok: false, detail: "the recorded final request does not match the projected context" };
      }
      const verified = await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), new MemoryStore());
      if (!verified.ok) return { ok: false, detail: "receipt did not replay" };
      return { ok: true, detail: "receipt holds full source; the served context is bound to the projection" };
    },
  },
  {
    id: "recall-deterministic",
    property: "CTX-02,MEM-05",
    summary: "identical index contents give identical hit lists — same dir, repeated query, rebuilt index, and a byte-identical second store",
    async run() {
      const embedder = localEmbedder();
      const build = async () => {
        const dir = await scratch("algal-law-recall-");
        const store = new FileStore(dir);
        await store.putValue({ species: "coral", habitat: "warm reef" });
        await store.putValue({ species: "krill", habitat: "cold current" });
        await store.putValue({ species: "kelp", habitat: "temperate forest" });
        await indexStore(dir, embedder);
        return dir;
      };
      const dirA = await build();
      const dirB = await build();
      const q1 = await searchIndex(dirA, embedder, "warm reef coral", 4);
      const q2 = await searchIndex(dirA, embedder, "warm reef coral", 4);
      if (canonicalize(q1 as unknown as JsonValue) !== canonicalize(q2 as unknown as JsonValue)) {
        return { ok: false, detail: "repeated query on the same index diverged" };
      }
      // Re-index is content-addressed: every chunk reuses, nothing re-embeds.
      const again = await indexStore(dirA, embedder);
      if (again.embedded !== 0 || again.reused !== again.chunks) {
        return { ok: false, detail: `re-index was not idempotent: ${JSON.stringify(again)}` };
      }
      const q3 = await searchIndex(dirA, embedder, "warm reef coral", 4);
      if (canonicalize(q3 as unknown as JsonValue) !== canonicalize(q1 as unknown as JsonValue)) {
        return { ok: false, detail: "rebuild changed the hit list" };
      }
      const qB = await searchIndex(dirB, embedder, "warm reef coral", 4);
      if (canonicalize(qB as unknown as JsonValue) !== canonicalize(q1 as unknown as JsonValue)) {
        return { ok: false, detail: "byte-identical stores in different dirs diverged" };
      }
      if (q1.length < 1 || !q1[0]!.text.includes("coral")) {
        return { ok: false, detail: "expected the coral chunk to rank first" };
      }
      return { ok: true, detail: `${q1.length} hits stable across repeat, rebuild and a second identical store` };
    },
  },
  {
    id: "recall-fail-closed",
    property: "CTX-02,MEM-06",
    summary: "the recall seam refuses to serve outside its admitted authority — wrong embedder spec, over-k hits, forged refs all reject",
    async run() {
      const dir = await scratch("algal-law-recall-fc-");
      const embedder = localEmbedder();
      const store = new FileStore(dir);
      await store.putValue({ species: "coral" });
      await indexStore(dir, embedder);
      const executor = recallExecutor(indexSearcher(dir, embedder, "local"));
      const req = (embedderSpec: string): EffectRequest => ({
        contract: "algal.effect.v1", cellId: "memory", kind: "recall",
        prompt: "", context: { inputs: { q: "coral" } },
        output: { kind: "json", schema: recallOutputSchema() },
        budget: { maxContextBytes: 4096, maxOutputBytes: 8192 },
        recall: { query: "coral", k: 2, embedder: embedderSpec },
      });
      // An index served under a different embedder spec has no authority.
      let refused = false;
      try { await executor.execute(req("other-embedder")); } catch { refused = true; }
      if (!refused) return { ok: false, detail: "searcher served a foreign embedder spec" };
      // A searcher returning more hits than k loses its bound.
      const over = recallExecutor({
        id: "memory",
        async search() {
          return Array.from({ length: 3 }, (_, seq) => ({
            id: digestCanonical(`chunk-${seq}` as unknown as JsonValue), source: `doc:${seq}`,
            seq, score: 0, text: "x",
          }));
        },
      });
      let overRefused = false;
      try { await over.execute(req("local")); } catch { overRefused = true; }
      if (!overRefused) return { ok: false, detail: "over-k hit list accepted" };
      // A hit whose ref does not equal its own value: source digest.
      let forged = false;
      try {
        bindRecallOutput({
          hits: [{
            id: digestCanonical("mismatch" as unknown as JsonValue),
            source: `value:${"a".repeat(64)}`, seq: 0, score: 1, text: "x",
            ref: `sha256:${"b".repeat(64)}`,
          }],
        } as unknown as JsonValue, 2);
      } catch { forged = true; }
      if (!forged) return { ok: false, detail: "a hit with a forged ref bound successfully" };
      return { ok: true, detail: "foreign spec, over-k list and forged ref each fail closed" };
    },
  },
  {
    id: "memory-status-map",
    property: "MEM-02,MEM-06",
    summary: "supported / conflicted / opposed / stale / withdrawn statuses map to the exact admission state without inventing authority",
    async run() {
      const f = await memoryFixture();
      // unknown: no observations at all, scope fresh.
      const unknown = await f.service.query(f.genesisState, f.query);
      if (unknown.derivation.status !== "unknown" || unknown.derivation.sourceRefs.length !== 0) {
        return { ok: false, detail: `empty memory gave ${unknown.derivation.status}` };
      }
      // supported: one supported observation through the full admit path.
      const step1 = await f.observe("tool-a", "supported",
        { memory: f.genesisMemory, state: f.genesisState, sequence: 0 });
      const supported = await f.service.query(step1.state, f.query);
      if (supported.derivation.status !== "supported" ||
          supported.derivation.sourceRefs.join() !== step1.observation ||
          !supported.derivation.verified) {
        return { ok: false, detail: `supported observation gave ${supported.derivation.status}` };
      }
      // opposed + conflicted: a second observation opposing the same tool.
      const step2 = await f.observe("tool-a", "opposed",
        { memory: step1.memory, state: step1.state, sequence: 1 });
      const conflicted = await f.service.query(step2.state, f.query);
      if (conflicted.derivation.status !== "conflicted") {
        return { ok: false, detail: `opposing evidence gave ${conflicted.derivation.status}` };
      }
      // opposed alone.
      const stepO = await f.observe("tool-b", "opposed",
        { memory: f.genesisMemory, state: f.genesisState, sequence: 0 });
      const opposed = await f.service.query(stepO.state, f.query);
      if (opposed.derivation.status !== "opposed") {
        return { ok: false, detail: `opposed observation gave ${opposed.derivation.status}` };
      }
      // stale: the host's attested frontier moved past the scope's.
      const f2 = await memoryFixture();
      const stepS = await f2.observe("tool-a", "supported",
        { memory: f2.genesisMemory, state: f2.genesisState, sequence: 0 });
      await f2.advanceFrontier();
      const stale = await f2.service.query(stepS.state, f2.query);
      if (stale.derivation.status !== "stale" || stale.derivation.sourceRefs.length !== 0) {
        return { ok: false, detail: `moved frontier gave ${stale.derivation.status} with ${stale.derivation.sourceRefs.length} sources` };
      }
      // withdrawn: admitted then withdrawn — excluded from facts, not a failure.
      const f3 = await memoryFixture();
      const stepW = await f3.observe("tool-a", "supported",
        { memory: f3.genesisMemory, state: f3.genesisState, sequence: 0 });
      const withdrawnMemory = await f3.service.snapshot({
        application: "workspace", schema: f3.schema, previous: f3.genesisMemory,
        scope: f3.scope, observations: [stepW.observation], hypotheses: [],
        withdrawn: [stepW.observation],
      });
      const withdrawnTransition = await putState(f3, withdrawnMemory, f3.genesisState, 1, "withdrawn");
      const withdrawn = await f3.service.query(withdrawnTransition, f3.query);
      if (withdrawn.derivation.status !== "unknown" || withdrawn.derivation.sourceRefs.length !== 0) {
        return { ok: false, detail: `withdrawn observation gave ${withdrawn.derivation.status} with ${withdrawn.derivation.sourceRefs.length} sources` };
      }
      return { ok: true, detail: "unknown/supported/conflicted/opposed/stale/withdrawn statuses mapped exactly; sources ⊆ admitted−withdrawn" };
    },
  },
  {
    id: "memory-deterministic",
    property: "MEM-05",
    summary: "identical captured state + query produce identical derivations — same ref, same fields, deterministic host call sequence",
    async run() {
      const f = await memoryFixture();
      const step = await f.observe("tool-a", "supported",
        { memory: f.genesisMemory, state: f.genesisState, sequence: 0 });
      const before = f.host.calls.length;
      const q1 = await f.service.query(step.state, f.query);
      const mid = f.host.calls.length;
      const q2 = await f.service.query(step.state, f.query);
      const after = f.host.calls.length;
      if (q1.ref !== q2.ref) {
        return { ok: false, detail: "identical queries produced different derivation refs" };
      }
      if (canonicalize(q1.derivation as unknown as JsonValue) !== canonicalize(q2.derivation as unknown as JsonValue)) {
        return { ok: false, detail: "identical queries produced different derivations" };
      }
      if (mid - before !== after - mid) {
        return { ok: false, detail: `host call sequence diverged (${mid - before} vs ${after - mid})` };
      }
      return { ok: true, detail: `two identical queries share ref ${q1.ref.slice(0, 23)}… and ${mid - before} host calls each` };
    },
  },
  {
    id: "memory-authority-fail-closed",
    property: "MEM-01,MEM-02,MEM-06",
    summary: "evidence whose stored claims differ from trusted decoding — or whose admission identity is foreign — is never admitted into a snapshot",
    async run() {
      const f = await memoryFixture();
      // Stored claims that do not match what the host decoder produces.
      const forged = await f.forgeObservation([
        { relation: "available", tuple: ["phantom"], polarity: "supported" },
      ]);
      let rejected = false;
      try {
        await f.service.snapshot({
          application: "workspace", schema: f.schema, previous: f.genesisMemory,
          scope: f.scope, observations: [forged], hypotheses: [], withdrawn: [],
        });
      } catch (error) {
        rejected = error instanceof Error && error.message.includes("differs from trusted source decoding");
      }
      if (!rejected) {
        return { ok: false, detail: "claims not matching trusted decoding were admitted" };
      }
      // A record carrying another admission identity — the record exists in
      // CAS but the host never issued it.
      const foreign = await f.forgeObservation(
        [{ relation: "available", tuple: ["forged"], polarity: "supported" }],
        ref({ contract: "algal.foreign-admission.v1" }));
      rejected = false;
      try {
        await f.service.snapshot({
          application: "workspace", schema: f.schema, previous: f.genesisMemory,
          scope: f.scope, observations: [foreign], hypotheses: [], withdrawn: [],
        });
      } catch (error) {
        rejected = error instanceof Error && error.message.includes("Unadmitted observation authority");
      }
      if (!rejected) {
        return { ok: false, detail: "foreign-admission evidence was admitted" };
      }
      return { ok: true, detail: "claim tamper and foreign admission both reject at snapshot admission" };
    },
  },
  {
    id: "memory-engine-failure-closed",
    property: "MEM-04,MEM-06",
    summary: "a derivation that fails the independent check, an engine that cannot establish the fixpoint, and an aborted query each map to their declared status — never supported",
    async run() {
      const f = await memoryFixture();
      const step = await f.observe("tool-a", "supported",
        { memory: f.genesisMemory, state: f.genesisState, sequence: 0 });
      // An engine whose output the checker cannot verify → failed, unverified.
      const real = f.engine;
      const tampered: MemoryQueryEngine = {
        identity: real.identity,
        async query(snapshot, program) {
          const out = await real.query(snapshot, program);
          if (out.kind !== "complete") return out;
          const result = structuredClone(out.result) as JsonObject;
          const rows = result.rows as JsonObject[];
          if (rows.length) rows[0]!.proof = "sha256:" + "ff".repeat(32);
          return { kind: "complete", result: result as JsonValue };
        },
        verify: real.verify.bind(real),
        settle: real.settle.bind(real),
      };
      const failed = await new ApplicationMemoryService({ store: f.store, engine: tampered, admission: f.host })
        .query(step.state, f.query);
      if (failed.derivation.status !== "failed" || failed.derivation.verified ||
          failed.derivation.result !== null) {
        return { ok: false, detail: `unverifiable derivation gave ${failed.derivation.status}` };
      }
      // An engine that cannot reach the fixpoint → exhausted, reason carried.
      const exhausted: MemoryQueryEngine = {
        identity: real.identity,
        async query() {
          return { kind: "incomplete", status: "exhausted", reason: "rounds-exhausted", work: null };
        },
        verify: real.verify.bind(real),
        settle: real.settle.bind(real),
      };
      const tired = await new ApplicationMemoryService({ store: f.store, engine: exhausted, admission: f.host })
        .query(step.state, f.query);
      if (tired.derivation.status !== "exhausted" || tired.derivation.reason !== "rounds-exhausted" ||
          tired.derivation.verified || tired.derivation.result !== null) {
        return { ok: false, detail: `incomplete engine gave ${tired.derivation.status}` };
      }
      // An aborted query → cancelled before the engine ran.
      const ctrl = new AbortController();
      ctrl.abort();
      const cancelled = await f.service.query(step.state, f.query, ctrl.signal);
      if (cancelled.derivation.status !== "cancelled" || cancelled.derivation.verified) {
        return { ok: false, detail: `aborted query gave ${cancelled.derivation.status}` };
      }
      return { ok: true, detail: "failed/exhausted/cancelled statuses map exactly; none claims a result" };
    },
  },
  {
    id: "memory-evidence-checks-out",
    property: "MEM-03,MEM-04",
    summary: "service-produced derivation evidence passes the independent checker — snapshot, program, rows and proof DAG recomputed end-to-end",
    async run() {
      const f = await memoryFixture();
      const step = await f.observe("tool-a", "supported",
        { memory: f.genesisMemory, state: f.genesisState, sequence: 0 });
      const { derivation } = await f.service.query(step.state, f.query);
      if (derivation.status !== "supported" || !derivation.verified) {
        return { ok: false, detail: `expected supported derivation, got ${derivation.status}` };
      }
      if (!(await f.checkDerivation(derivation))) {
        return { ok: false, detail: "the independent checker rejected service-produced evidence" };
      }
      // The derivation's retained sources are exactly the admitted, unwithdrawn
      // observations — monotone binding: adding admitted evidence extends the
      // source set, withdrawal removes from it.
      if (derivation.sourceRefs.length !== 1 || derivation.sourceRefs[0] !== step.observation) {
        return { ok: false, detail: `sourceRefs ${derivation.sourceRefs} ≠ [observation]` };
      }
      return { ok: true, detail: "supported derivation re-verified by the independent checker; sourceRefs exactly the admitted observation" };
    },
  },
];

/** Helper for the withdrawn case: a state record pointing at a hand-built
 *  memory snapshot, through the same CAS write path the fixture uses. */
async function putState(f: Awaited<ReturnType<typeof memoryFixture>>,
  memory: Digest, previous: Digest, sequence: number, tag: string): Promise<Digest> {
  const transition = await putApplicationRecord(f.store, {
    contract: "algal.application-transition.v1",
    application: "workspace", operation: ref(`op-${tag}`), request: ref(`req-${tag}`),
    kind: "memory", previous, revision: f.revision, memory,
    intents: [], evidence: [], causedBy: null,
  });
  return putApplicationRecord(f.store, {
    contract: "algal.application-state.v1",
    application: "workspace", sequence, epoch: 0, revision: f.revision,
    memory, previous, transition,
  });
}
