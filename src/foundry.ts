import type { OrganismManifest } from "./contract";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import type { Executor } from "./effects";
import { MorphogenError } from "./errors";
import type { FnRegistry } from "./registry";
import { runOrganism } from "./run";
import type { Store } from "./store";
import type { Transport } from "./transport";
import { canonicalize, type JsonValue } from "./values";

export const FOUNDRY_CONTRACT = "morphogen.foundry.v1" as const;

export const FOUNDRY_BOUNDS = {
  maxCandidates: 32,
  maxCases: 256,
  maxCaseIdLen: 64,
} as const;

export type FoundryCase = {
  id: string;
  split: "train" | "validation" | "holdout";
  args: Record<string, JsonValue>;
  expect: Record<string, JsonValue>;
};

export type FoundryCaseResult = {
  id: string;
  split: "train" | "validation" | "holdout";
  passed: boolean;
  outcome: "complete" | "failed" | "stuck";
  outputs: Record<string, JsonValue>;
  expect: Record<string, JsonValue>;
  receiptDigest: Digest;
  work: { steps: number; agentCalls: number; units: number };
};

export type FoundryCandidateResult = {
  manifestDigest: Digest;
  manifestKey: string;
  train: { passed: number; total: number };
  validation: { passed: number; total: number };
  work: { steps: number; agentCalls: number; units: number };
  cases: FoundryCaseResult[];
};

export type FoundryReport = {
  contract: typeof FOUNDRY_CONTRACT;
  candidates: FoundryCandidateResult[];
  promoted: Digest;
  holdout: { passed: number; total: number; cases: FoundryCaseResult[] };
  lineage?: FoundryLineage;
  digest: Digest;
};

export type FoundryLineage = {
  generatorDigest: Digest;
  receiptDigest: Digest;
};

export type FoundryOptions = {
  candidates: OrganismManifest[];
  cases: FoundryCase[];
  fns: FnRegistry;
  store: Store;
  executors: Executor[];
  transports?: Record<string, Transport>;
  lineage?: FoundryLineage;
};

export type GenerateCandidatesOptions = {
  generator: OrganismManifest;
  args: Record<string, JsonValue>;
  output: string;
  field?: string;
  fns: FnRegistry;
  store: Store;
  executors: Executor[];
  transports?: Record<string, Transport>;
};

export type GeneratedCandidates = FoundryLineage & {
  candidates: OrganismManifest[];
};

function fail(message: string): never {
  throw new MorphogenError("PARSE_FAILED", message);
}

function validate(opts: FoundryOptions): void {
  if (opts.candidates.length === 0) fail("foundry requires at least one candidate");
  if (opts.candidates.length > FOUNDRY_BOUNDS.maxCandidates) {
    fail(`foundry candidates exceed ${FOUNDRY_BOUNDS.maxCandidates}`);
  }
  if (opts.cases.length === 0) fail("foundry requires at least one case");
  if (opts.cases.length > FOUNDRY_BOUNDS.maxCases) {
    fail(`foundry cases exceed ${FOUNDRY_BOUNDS.maxCases}`);
  }
  if (!opts.cases.some((c) => c.split === "train")) {
    fail("foundry requires at least one train case");
  }
  if (!opts.cases.some((c) => c.split === "validation")) {
    fail("foundry requires at least one validation case");
  }
  if (!opts.cases.some((c) => c.split === "holdout")) {
    fail("foundry requires at least one holdout case");
  }
  const ids = new Set<string>();
  for (const c of opts.cases) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id) || c.id.length > FOUNDRY_BOUNDS.maxCaseIdLen) {
      fail(`invalid foundry case id "${c.id}"`);
    }
    if (ids.has(c.id)) fail(`duplicate foundry case id "${c.id}"`);
    ids.add(c.id);
  }
  const digests = new Set<Digest>();
  for (const candidate of opts.candidates) {
    if (!candidate.interface) fail(`candidate ${candidate.key} must declare an interface`);
    const digest = digestCanonical(manifestToJson(candidate));
    if (digests.has(digest)) fail(`duplicate foundry candidate ${digest}`);
    digests.add(digest);
    const inputs = new Set(Object.keys(candidate.interface.inputs));
    const outputs = new Set(Object.keys(candidate.interface.outputs));
    for (const c of opts.cases) {
      for (const name of Object.keys(c.args)) {
        if (!inputs.has(name)) fail(`case ${c.id}: unknown candidate input "${name}"`);
      }
      for (const name of outputs) {
        if (!(name in c.expect)) fail(`case ${c.id}: missing expected output "${name}"`);
      }
      for (const name of Object.keys(c.expect)) {
        if (!outputs.has(name)) fail(`case ${c.id}: unknown candidate output "${name}"`);
      }
    }
  }
}

function caseArgs(candidate: OrganismManifest, c: FoundryCase): Record<string, Record<string, JsonValue>> {
  const args: Record<string, Record<string, JsonValue>> = {};
  for (const [name, value] of Object.entries(c.args)) {
    const target = candidate.interface!.inputs[name]!;
    (args[target.cell] ??= {})[target.port] = value;
  }
  return args;
}

function caseOutputs(candidate: OrganismManifest, cells: Awaited<ReturnType<typeof runOrganism>>["cells"]): Record<string, JsonValue> {
  const outputs: Record<string, JsonValue> = {};
  for (const [name, source] of Object.entries(candidate.interface!.outputs)) {
    const value = cells[source.cell]?.outputs?.[source.port];
    if (value !== undefined) outputs[name] = value;
  }
  return outputs;
}

function score(cases: FoundryCaseResult[], split: FoundryCase["split"]) {
  const selected = cases.filter((c) => c.split === split);
  return { passed: selected.filter((c) => c.passed).length, total: selected.length };
}

function better(a: FoundryCandidateResult, b: FoundryCandidateResult): number {
  const ah = a.validation.passed / a.validation.total;
  const bh = b.validation.passed / b.validation.total;
  if (ah !== bh) return bh - ah;
  const at = a.train.passed / a.train.total;
  const bt = b.train.passed / b.train.total;
  if (at !== bt) return bt - at;
  if (a.work.agentCalls !== b.work.agentCalls) return a.work.agentCalls - b.work.agentCalls;
  if (a.work.units !== b.work.units) return a.work.units - b.work.units;
  return a.manifestDigest.localeCompare(b.manifestDigest);
}

export function selectFoundryCandidate(candidates: FoundryCandidateResult[]): Digest {
  if (candidates.length === 0) fail("foundry requires at least one candidate result");
  return [...candidates].sort(better)[0]!.manifestDigest;
}

async function evaluateCase(
  candidate: OrganismManifest,
  c: FoundryCase,
  opts: FoundryOptions,
): Promise<FoundryCaseResult> {
  const receipt = await runOrganism({
    manifest: candidate,
    args: caseArgs(candidate, c),
    fns: opts.fns,
    store: opts.store,
    executors: opts.executors,
    ...(opts.transports ? { transports: opts.transports } : {}),
  });
  const receiptDigest = await opts.store.putReceipt(receipt as unknown as JsonValue);
  const outputs = caseOutputs(candidate, receipt.cells);
  return {
    id: c.id,
    split: c.split,
    passed: receipt.outcome === "complete" && canonicalize(outputs) === canonicalize(c.expect),
    outcome: receipt.outcome,
    outputs,
    expect: c.expect,
    receiptDigest,
    work: receipt.work,
  };
}

export async function generateFoundryCandidates(
  opts: GenerateCandidatesOptions,
): Promise<GeneratedCandidates> {
  const iface = opts.generator.interface;
  if (!iface) fail(`generator ${opts.generator.key} must declare an interface`);
  const source = iface.outputs[opts.output];
  if (!source) fail(`generator ${opts.generator.key}: unknown interface output "${opts.output}"`);
  const args: Record<string, Record<string, JsonValue>> = {};
  for (const [name, value] of Object.entries(opts.args)) {
    const target = iface.inputs[name];
    if (!target) fail(`generator ${opts.generator.key}: unknown interface input "${name}"`);
    (args[target.cell] ??= {})[target.port] = value;
  }
  const generatorDigest = await opts.store.putManifest(opts.generator);
  const receipt = await runOrganism({
    manifest: opts.generator,
    args,
    fns: opts.fns,
    store: opts.store,
    executors: opts.executors,
    ...(opts.transports ? { transports: opts.transports } : {}),
  });
  const receiptDigest = await opts.store.putReceipt(receipt as unknown as JsonValue);
  if (receipt.outcome !== "complete") {
    fail(`generator ${opts.generator.key} ended ${receipt.outcome}`);
  }
  const output = receipt.cells[source.cell]?.outputs?.[source.port];
  const value = opts.field !== undefined && output !== null && typeof output === "object" && !Array.isArray(output)
    ? output[opts.field]
    : output;
  if (!Array.isArray(value) || value.length === 0) {
    fail(`generator ${opts.generator.key}.${opts.output} must emit a non-empty manifest list`);
  }
  if (value.length > FOUNDRY_BOUNDS.maxCandidates) {
    fail(`generated candidates exceed ${FOUNDRY_BOUNDS.maxCandidates}`);
  }
  const candidates = value.map((candidate, i) => {
    try {
      return parseOrganismManifest(candidate);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      fail(`generated candidate ${i}: ${message}`);
    }
  });
  return { generatorDigest, receiptDigest, candidates };
}

async function evaluateCases(
  candidate: OrganismManifest,
  cases: FoundryCase[],
  opts: FoundryOptions,
): Promise<FoundryCaseResult[]> {
  const results: FoundryCaseResult[] = [];
  for (const c of cases) results.push(await evaluateCase(candidate, c, opts));
  return results;
}

export async function runFoundry(opts: FoundryOptions): Promise<FoundryReport> {
  validate(opts);
  const candidates: FoundryCandidateResult[] = [];
  const selectionCases = opts.cases.filter((c) => c.split !== "holdout");
  for (const candidate of opts.candidates) {
    const manifestDigest = await opts.store.putManifest(candidate);
    const cases = await evaluateCases(candidate, selectionCases, opts);
    candidates.push({
      manifestDigest,
      manifestKey: candidate.key,
      train: score(cases, "train"),
      validation: score(cases, "validation"),
      work: cases.reduce(
        (total, c) => ({
          steps: total.steps + c.work.steps,
          agentCalls: total.agentCalls + c.work.agentCalls,
          units: total.units + c.work.units,
        }),
        { steps: 0, agentCalls: 0, units: 0 },
      ),
      cases,
    });
  }
  const promoted = selectFoundryCandidate(candidates);
  const promotedManifest = opts.candidates.find(
    (candidate) => digestCanonical(manifestToJson(candidate)) === promoted,
  )!;
  const holdoutCases = await evaluateCases(
    promotedManifest,
    opts.cases.filter((c) => c.split === "holdout"),
    opts,
  );
  const holdoutScore = score(holdoutCases, "holdout");
  const base = {
    contract: FOUNDRY_CONTRACT,
    candidates,
    promoted,
    holdout: { ...holdoutScore, cases: holdoutCases },
    ...(opts.lineage ? { lineage: opts.lineage } : {}),
  };
  return { ...base, digest: digestCanonical(base as unknown as JsonValue) };
}
