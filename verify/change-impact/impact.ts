/**
 * verify/change-impact/impact.ts — build the semantic-input →
 * required-verification map over the governed input set.
 *
 * The governed input set is exactly what `captureBinding` in
 * verify/lib/runner.ts hashes for every suite result: `inputBindings`
 * (governed source inventory ∪ verification inputs) plus every per-property
 * `sources`/`specs` reference outside those roots. Each input resolves to a
 * row: a class from the ordered rule table, the required suites derived from
 * (a) property bindings in verify/properties.json, (b) the lane/runner
 * dispatch the file participates in, (c) the TLA adapter's declared
 * live/adapter sources, and (d) the transitive TypeScript import closure —
 * an edit to a file also requires the suites bound to everything that
 * imports it. Semantic rows with no finer binding fall back to the
 * `all-required` aggregate and are reported as coverage gaps.
 */
import { hashFile, hashJson, inputBindings, readFileBounded, readJson } from "../lib/files";
import { parseRegistry, type Registry } from "../lib/claims";
import { requireThat } from "../lib/schema";
import { SUITES } from "../lib/suites";
import { ADAPTER_SOURCES, LIVE_SOURCES, MODEL_PROFILES } from "../tla/definitions";
import {
  AGGREGATE_SUITE, CLASSIFICATION_RULES, GATE_HINTS, TLC_SUITE_NAME,
  ruleMatches, type InputClass,
} from "./classification";

const MAX_INPUTS = 20_000;
const MAX_IMPORTS_PER_FILE = 128;
const MAX_REQUIRED = 64;

export type ImpactRow = {
  path: string;
  sha256: string;
  class: InputClass;
  rule: string | null;             // rule name that classified this path
  properties: string[];            // sorted property IDs binding this path
  required: string[];              // sorted suite names incl. "all-required"
  via: string[];                   // mechanisms that contributed suites
  discharge: "suite" | "classified";
  gate: string | null;             // advisory preserved-gate command
  note: string | null;
};

/** Everything the checker needs that does not come from the mutable rule
 *  table: the input set with digests, the registry-pinned set, the
 *  property→suite binding, and the known suite names. */
export type ImpactContext = {
  inputPaths: Set<string>;
  digests: Map<string, string>;
  pinned: Set<string>;
  pinnedDigests: Map<string, string>;
  bound: Map<string, { properties: string[]; suites: string[] }>;
  knownSuites: Set<string>;
};

type Contribution = { vias: Set<string>; suites: Set<string> };

function addContribution(map: Map<string, Contribution>, path: string, via: string, suites: Iterable<string>): void {
  let entry = map.get(path);
  if (entry === undefined) { entry = { vias: new Set(), suites: new Set() }; map.set(path, entry); }
  const list = [...suites];
  if (list.length > 0) entry.vias.add(via);
  for (const suite of list) entry.suites.add(suite);
}

function addSuite(target: { required: Set<string>; via: Set<string> }, suite: string, via: string): void {
  requireThat(target.required.size < MAX_REQUIRED || target.required.has(suite), "required suite bound exceeded");
  target.required.add(suite);
  target.via.add(via);
}

/** The input inventory mirrors captureBinding exactly: governed ∪
 *  verification paths, then property sources/specs outside those roots. */
export async function collectInputs(root: string, registry: Registry): Promise<{ path: string; sha256: string }[]> {
  const inputs = await inputBindings(root);
  const present = new Set(inputs.map(input => input.path));
  for (const property of registry.properties) {
    for (const binding of [...property.sources, ...property.specs]) {
      if (!present.has(binding.path)) {
        present.add(binding.path);
        inputs.push({ path: binding.path, sha256: await hashFile(root, binding.path) });
        requireThat(inputs.length <= MAX_INPUTS, "governed input bound exceeded");
      }
    }
  }
  inputs.sort((a, b) => a.path < b.path ? -1 : a.path === b.path ? 0 : 1);
  return inputs;
}

export async function buildContext(root: string): Promise<{ ctx: ImpactContext; registry: Registry; inputs: { path: string; sha256: string }[] }> {
  const registry = parseRegistry(await readJson(root, "verify/properties.json"));
  const inputs = await collectInputs(root, registry);
  const bound = new Map<string, { properties: string[]; suites: string[] }>();
  const pinned = new Set<string>();
  const pinnedDigests = new Map<string, string>();
  for (const dependency of registry.dependencies) { pinned.add(dependency.path); pinnedDigests.set(dependency.path, dependency.sha256); }
  for (const property of registry.properties) {
    for (const binding of [...property.sources, ...property.specs]) {
      pinned.add(binding.path);
      pinnedDigests.set(binding.path, binding.sha256);
      let entry = bound.get(binding.path);
      if (entry === undefined) { entry = { properties: [], suites: [] }; bound.set(binding.path, entry); }
      entry.properties.push(property.id);
      if (property.evidence.suite !== null) entry.suites.push(property.evidence.suite);
    }
  }
  for (const entry of bound.values()) {
    entry.properties = [...new Set(entry.properties)].sort();
    entry.suites = [...new Set(entry.suites)].sort();
    requireThat(entry.properties.length <= 512 && entry.suites.length <= 64, "property binding bound exceeded");
  }
  return {
    registry,
    inputs,
    ctx: {
      inputPaths: new Set(inputs.map(input => input.path)),
      digests: new Map(inputs.map(input => [input.path, input.sha256])),
      pinned,
      pinnedDigests,
      bound,
      knownSuites: new Set([...SUITES.keys(), AGGREGATE_SUITE]),
    },
  };
}

/** Extract which suites' runner commands execute each `src/*.test.ts`
 *  file. Only the top-level `if (suite === ...)` dispatch blocks at
 *  two-space indent are scanned, so nested conditions cannot split a
 *  shared command list across suites. */
export function runnerTestBindings(source: string): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const starts = [...source.matchAll(/^ {2}if \(suite === /gm)].flatMap(match => match.index === undefined ? [] : [match.index]);
  requireThat(starts.length > 0 && starts.length <= 128, "runner dispatch table shape changed");
  for (const [index, start] of starts.entries()) {
    const end = index + 1 < starts.length ? starts[index + 1]! : source.length;
    const block = source.slice(start, end);
    const brace = block.indexOf(") {");
    const header = block.slice(0, brace === -1 ? 512 : brace);
    const names = [...header.matchAll(/suite === "([^"]+)"/g)].map(match => match[1]!);
    requireThat(names.length > 0 && names.length <= 16, "runner dispatch header shape changed");
    for (const match of block.matchAll(/src\/[A-Za-z0-9._/-]+\.test\.ts/g)) {
      let suites = result.get(match[0]);
      if (suites === undefined) { suites = new Set(); result.set(match[0], suites); }
      for (const name of names) suites.add(name);
    }
  }
  return result;
}

/** The TLA lane's declared correspondence: which production/spec/harness
 *  files each model suite's evidence binds (LIVE_SOURCES), which shared
 *  inputs feed every model suite (ADAPTER_SOURCES), and which files are the
 *  checked models themselves (MODEL_PROFILES paths). */
export function tlaBindings(): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const put = (path: string, suite: string): void => {
    let suites = result.get(path);
    if (suites === undefined) { suites = new Set(); result.set(path, suites); }
    suites.add(suite);
  };
  const allModelSuites = new Set(Object.values(TLC_SUITE_NAME));
  for (const [tlaSuite, paths] of Object.entries(LIVE_SOURCES)) {
    const suite = TLC_SUITE_NAME[tlaSuite];
    requireThat(suite !== undefined, `unknown TLA suite ${tlaSuite}`);
    for (const path of paths) put(path, suite);
  }
  for (const path of ADAPTER_SOURCES) for (const suite of allModelSuites) put(path, suite);
  for (const profile of MODEL_PROFILES) {
    const suite = TLC_SUITE_NAME[profile.suite];
    requireThat(suite !== undefined, `unknown TLA suite ${profile.suite}`);
    put(profile.path, suite);
  }
  return result;
}

const IMPORT_SPECIFIER = /(?:import|export)\s[^'";]*?from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;
const SCANNABLE = /\.(ts|tsx)$/;

/** Normalize a repo-relative POSIX path, resolving "." and ".." segments
 *  lexically. Returns null for paths that escape the root. */
function normalizeRelative(path: string): string | null {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") { if (parts.length === 0) return null; parts.pop(); continue; }
    parts.push(part);
    if (parts.length > 64) return null;
  }
  return parts.join("/");
}

/** Resolve a relative import specifier against the input set. Only
 *  specifiers that land on a governed input become edges; node built-ins,
 *  bare packages and unresolvable relatives contribute no edge. */
function resolveSpecifier(from: string, specifier: string, inputs: Set<string>): string | null {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) return null;
  const directory = from.includes("/") ? from.slice(0, from.lastIndexOf("/")) : "";
  const base = normalizeRelative(`${directory}/${specifier}`);
  if (base === null) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, `${base}.d.ts`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (inputs.has(candidate)) return candidate;
  }
  return null;
}

export function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(IMPORT_SPECIFIER)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier !== undefined) {
      specifiers.push(specifier);
      requireThat(specifiers.length <= MAX_IMPORTS_PER_FILE, "import specifier bound exceeded");
    }
  }
  return specifiers;
}

/** Reverse import graph: for every governed TypeScript input, the set of
 *  governed inputs that import it (directly). Callers walk it transitively
 *  to find every file whose change propagates to a dependent. */
export async function reverseImportGraph(root: string, inputPaths: Set<string>): Promise<{ reverse: Map<string, Set<string>>; unresolved: number }> {
  const reverse = new Map<string, Set<string>>();
  let unresolved = 0;
  for (const path of inputPaths) {
    if (!SCANNABLE.test(path)) continue;
    const text = new TextDecoder("utf-8", { fatal: false }).decode(await readFileBounded(root, path));
    for (const specifier of importSpecifiers(text)) {
      const target = resolveSpecifier(path, specifier, inputPaths);
      if (target === null) {
        if (specifier.startsWith("./") || specifier.startsWith("../")) unresolved++;
        continue;
      }
      if (target === path) continue;
      let importers = reverse.get(target);
      if (importers === undefined) { importers = new Set(); reverse.set(target, importers); }
      importers.add(path);
    }
  }
  return { reverse, unresolved };
}

/** All transitive importers of `path` — every input whose build could be
 *  affected by an edit here. Bounded by the input count. */
function importersOf(path: string, reverse: Map<string, Set<string>>): Set<string> {
  const seen = new Set<string>();
  const queue = [path];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const importer of reverse.get(current) ?? []) {
      if (!seen.has(importer)) { seen.add(importer); queue.push(importer); }
    }
  }
  return seen;
}

export async function buildImpactMap(root: string): Promise<{ rows: ImpactRow[]; ctx: ImpactContext; registry: Registry; runnerSource: string; unresolvedImports: number }> {
  const { ctx, registry, inputs } = await buildContext(root);
  const runnerSource = new TextDecoder("utf-8", { fatal: true }).decode(await readFileBounded(root, "verify/lib/runner.ts"));
  const runnerExec = runnerTestBindings(runnerSource);
  const tla = tlaBindings();
  const { reverse, unresolved } = await reverseImportGraph(root, ctx.inputPaths);

  // Per-path direct contributions before propagation. `claims` is added
  // separately below because readmission alone is not semantic coverage.
  const direct = new Map<string, Contribution>();
  for (const input of inputs) {
    const bound = ctx.bound.get(input.path);
    if (bound !== undefined) addContribution(direct, input.path, "property", bound.suites);
    const exec = runnerExec.get(input.path);
    if (exec !== undefined) addContribution(direct, input.path, "runner", exec);
    const adapter = tla.get(input.path);
    if (adapter !== undefined) addContribution(direct, input.path, "tla-adapter", adapter);
    const rule = CLASSIFICATION_RULES.find(candidate => ruleMatches(candidate.match, input.path));
    if (rule !== undefined) {
      addContribution(direct, input.path, rule.class === "suite-source" ? "lane" : "policy", rule.suites);
    }
  }

  const rows: ImpactRow[] = [];
  for (const input of inputs) {
    const rule = CLASSIFICATION_RULES.find(candidate => ruleMatches(candidate.match, input.path));
    const cls: InputClass = rule === undefined ? "unmapped" : rule.class;
    const required = new Set<string>();
    const via = new Set<string>();
    const own = direct.get(input.path);
    if (own !== undefined) for (const suite of own.suites) { required.add(suite); for (const v of own.vias) via.add(v); }
    // Indirect dependencies: every transitive importer's direct suites are
    // required for this input's edits.
    for (const importer of importersOf(input.path, reverse)) {
      const contribution = direct.get(importer);
      if (contribution !== undefined && contribution.suites.size > 0) {
        for (const suite of contribution.suites) addSuite({ required, via }, suite, "import-closure");
      }
    }
    let note: string | undefined;
    // The aggregate fallback: a semantic input no finer binding covers
    // cannot name a narrower requirement, so the whole required chain runs.
    // `claims` alone is readmission, not semantic coverage.
    if (SEMANTIC_CLASSES.has(cls) && [...required].every(suite => suite === "claims")) {
      required.add(AGGREGATE_SUITE);
      via.add("aggregate-fallback");
      note = "no property, lane, runner or adapter binding covers this semantic input; the aggregate is required";
    }
    // Readmission: every digest-pinned input change re-opens the ledger.
    if (ctx.pinned.has(input.path)) { required.add("claims"); via.add("readmission"); }
    const requiredList = [...required].sort();
    const row: ImpactRow = {
      path: input.path,
      sha256: input.sha256,
      class: cls,
      rule: rule?.name ?? null,
      properties: ctx.bound.get(input.path)?.properties ?? [],
      required: requiredList,
      via: [...via].sort(),
      discharge: requiredList.some(suite => suite !== "claims") ? "suite" : "classified",
      gate: GATE_HINTS[input.path] ?? null,
      note: cls === "unmapped" ? "no classification rule matched this governed input" : note ?? null,
    };
    rows.push(row);
  }
  requireThat(rows.length === ctx.inputPaths.size, "impact map must cover every input exactly once");
  return { rows, ctx, registry, runnerSource, unresolvedImports: unresolved };
}

/** Determinism helper — the canonical digest of a finished map. */
export function mapDigest(rows: ImpactRow[]): string {
  return hashJson(rows);
}
