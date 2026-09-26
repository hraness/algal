/**
 * Independent derivation checker for `algal.query-result.v1` memory evidence.
 *
 * Given a selected `algal.memory.v1` fact snapshot, an admitted
 * `algal.query.v1` program, and a claimed complete result (answer rows plus
 * the reachable proof DAG), this checker decides acceptance WITHOUT running
 * the production engine:
 *
 *  1. Proof-graph resolution. Every claimed row's proof id is resolved
 *     through the `proofs` map as a derivation DAG. A `fact` node must be
 *     digest-bound to a member of the selected snapshot and carry that
 *     fact's own source list. A `rule` node must be digest-bound to a
 *     program rule; its premise derivations determine a unique substitution
 *     that must instantiate the rule head to the inferred conclusion. Cycles
 *     in the reachable graph, unknown premise ids, and every consistency
 *     failure reject.
 *  2. Independent least-fixpoint enumeration. A deliberately simple nested-
 *     loop evaluator (no hash index, no production work accounting) computes
 *     the fixpoint and the exact answer set under the same semantic bounds.
 *     A claimed `complete: true` result whose rows differ rejects; a claim
 *     under which the reference cannot establish a fixpoint also rejects.
 *  3. Witness order. Each claimed row's proof id must be the first
 *     derivation under the documented canonical order: facts sorted by
 *     content digest, rules by id, candidate tuples by canonical
 *     `[relation, tuple]` byte order, bindings by left-to-right join order,
 *     first-wins per canonical row key.
 *
 * The implementation shares no code with the runtime. `node:crypto` SHA-256
 * is a platform primitive used only for content-identity digests; the
 * canonical serialization here is re-derived from the documented key order
 * (canonical u32-index keys numerically first, then UTF-16 lexicographic).
 *
 * Scope: this establishes that accepted rows are exactly the tuples
 * derivable from the selected snapshot and program. Truth of the base
 * facts, negation-as-failure, and full truth maintenance are out of scope;
 * see SCOPE.md.
 */
import { createHash } from "node:crypto";

export type Atom = null | boolean | number | string;
export type Term = Atom | { var: string };
export interface Literal { relation: string; terms: Term[] }
export interface Rule { id: string; head: Literal; body: Literal[] }
export interface Fact { relation: string; tuple: Atom[]; sources: string[] }
export interface Limits {
  maxWork: number; maxRounds: number; maxDerived: number;
  maxBindings: number; maxRows: number; maxOutputBytes: number;
}
export type ProofNode =
  | { kind: "fact"; fact: string; sources: string[] }
  | { kind: "rule"; rule: string; premises: string[] };
export interface Row { tuple: Atom[]; proof: string }
export interface Snapshot { contract: "algal.memory.v1"; facts: Fact[] }
export interface Program {
  contract: "algal.query.v1"; rules: Rule[]; query: Literal; limits: Limits;
}
export interface Claimed {
  contract: "algal.query-result.v1"; snapshot: string; program: string;
  complete: true; witnessPolicy: "first-canonical-derivation";
  rows: Row[]; proofs: Record<string, ProofNode>;
  work: number; rounds: number; baseFacts: number; derivedFacts: number;
}
/** Application-level selection context: which source digests were admissible. */
export interface Selection { allowedSources?: string[]; withdrawn?: string[] }
export interface Input {
  snapshot: Snapshot; program: Program; claimed: Claimed; selection: Selection;
}

export type Reason =
  | "malformed-input" | "snapshot-digest-mismatch" | "program-digest-mismatch"
  | "result-binding" | "output-too-large" | "row-order" | "row-not-matching-query"
  | "proof-id-not-content-digest" | "unknown-proof" | "dangling-proof"
  | "proof-cycle" | "fact-not-selected" | "fact-source-binding"
  | "withdrawn-source" | "unselected-source" | "rule-not-in-program"
  | "premise-count-mismatch" | "substitution-mismatch" | "unbound-head-variable"
  | "conclusion-mismatch" | "missing-row" | "unexpected-row"
  | "witness-not-canonical-first" | "completeness-not-established";

export type Verdict =
  | { accept: true; rows: number }
  | { accept: false; reason: Reason; detail: string };

export class CheckError extends Error {
  readonly reason: Reason;
  constructor(reason: Reason, detail: string) { super(detail); this.reason = reason; }
}
function reject(reason: Reason, detail: string): never {
  throw new CheckError(reason, detail);
}

/* ---------- bounded canonical JSON ---------- */

export type Json = Atom | Json[] | { [key: string]: Json };

function isObject(x: unknown): x is Record<string, unknown> {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const p = Object.getPrototypeOf(x);
  return (p === Object.prototype || p === null) &&
    Reflect.ownKeys(x).every(k => typeof k === "string" &&
      Object.getOwnPropertyDescriptor(x, k)?.enumerable === true);
}
function insist(value: unknown, what: string): asserts value {
  if (!value) reject("malformed-input", `checker admission: ${what}`);
}
/** UTF-16 index keys sort numerically first; all other keys UTF-16
 *  lexicographically. Matches the documented canonical key order. */
function objectKeys(value: Record<string, unknown>): string[] {
  const index = (key: string) =>
    /^(?:0|[1-9][0-9]*)$/.test(key) && Number(key) < 4294967295 && String(Number(key)) === key;
  return Object.keys(value).sort((a, b) =>
    index(a) ? (index(b) ? Number(a) - Number(b) : -1)
      : index(b) ? 1 : a < b ? -1 : a > b ? 1 : 0);
}
/** Strings must be free of lone surrogates so that the emitted text agrees
 *  byte-for-byte with the production canonical form once UTF-8 encoded. */
function wellFormed(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const n = text.charCodeAt(i + 1);
      if (!(n >= 0xdc00 && n <= 0xdfff)) return false;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) return false;
  }
  return true;
}
function admitJson(x: unknown, depth = 0): asserts x is Json {
  insist(depth <= 64, "JSON depth bound");
  if (x === null || typeof x === "boolean") return;
  if (typeof x === "number") { insist(Number.isFinite(x), "finite number"); return; }
  if (typeof x === "string") { insist(wellFormed(x), "scalar string"); return; }
  if (Array.isArray(x)) { insist(x.length <= 4096, "array bound"); for (const v of x) admitJson(v, depth + 1); return; }
  insist(isObject(x) && Object.keys(x).length <= 256, "object bound");
  for (const [k, v] of Object.entries(x)) { insist(wellFormed(k) && k.length <= 256, "object key"); admitJson(v, depth + 1); }
}
export function canonical(value: Json): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    return "{" + objectKeys(value).map(k => JSON.stringify(k) + ":" + canonical(value[k]!)).join(",") + "}";
  }
  return JSON.stringify(value);
}
const utf8 = new TextEncoder();
export function canonicalBytes(value: Json): number { return utf8.encode(canonical(value)).length; }
/** Byte-wise (UTF-8) comparison of canonical texts, matching BTreeMap order. */
export function cmpCanonical(a: string, b: string): number {
  const x = utf8.encode(a), y = utf8.encode(b);
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) if (x[i] !== y[i]) return x[i]! - y[i]!;
  return x.length - y.length;
}
export function digestDocument(value: Json): string {
  return "sha256:" + createHash("sha256").update(utf8.encode(canonical(value))).digest("hex");
}
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const ID = /^[a-z][a-z0-9-]{0,63}$/;
const isDigest = (x: unknown): x is string => typeof x === "string" && DIGEST.test(x);
const isId = (x: unknown): x is string => typeof x === "string" && ID.test(x);

/* ---------- contract admission (bounds mirror crates/algal/src/memory.rs) ---------- */

const LIMIT_CEILINGS: Record<keyof Limits, number> = {
  maxWork: 250_000, maxRounds: 32, maxDerived: 4096,
  maxBindings: 4096, maxRows: 256, maxOutputBytes: 262_144,
};
const DEFAULT_LIMITS: Limits = {
  maxWork: 250_000, maxRounds: 32, maxDerived: 4096,
  maxBindings: 4096, maxRows: 256, maxOutputBytes: 262_144,
};
const MAX_FACTS = 2048, MAX_RULES = 64, MAX_TERMS = 8, MAX_BODY = 8;
const MAX_SOURCES = 16, MAX_PROOF_NODES = 8192, MAX_PREMISES = 8;
const MAX_SNAPSHOT_BYTES = 262_144, MAX_PROGRAM_BYTES = 65_536, MAX_ATOM_BYTES = 1024;

function fields(x: unknown, allowed: string[], what: string,
    required: string[] = allowed): Record<string, unknown> {
  insist(isObject(x), `${what}: expected object`);
  const o = x as Record<string, unknown>;
  insist(Object.keys(o).every(k => allowed.includes(k)), `${what}: unknown key`);
  for (const k of required) insist(Object.hasOwn(o, k), `${what}: missing ${k}`);
  return o;
}
function atom(x: unknown): Atom {
  insist(x === null || typeof x === "boolean" || typeof x === "string" || typeof x === "number",
    "atom must be a JSON primitive");
  if (typeof x === "number") insist(Number.isFinite(x), "finite atom number");
  if (typeof x === "string") insist(wellFormed(x), "scalar atom string");
  insist(canonicalBytes(x as Json) <= MAX_ATOM_BYTES, "atom bytes bound");
  return x as Atom;
}
function term(x: unknown): Term {
  if (isObject(x)) {
    const o = fields(x, ["var"], "term");
    insist(isId(o.var), "variable id");
    return { var: o.var };
  }
  return atom(x);
}
type Arities = Map<string, number>;
function literal(x: unknown, arities: Arities, what: string): Literal {
  const o = fields(x, ["relation", "terms"], what);
  insist(isId(o.relation), `${what} relation id`);
  insist(Array.isArray(o.terms) && o.terms.length <= MAX_TERMS, `${what} arity bound`);
  const prior = arities.get(o.relation);
  if (prior === undefined) arities.set(o.relation, o.terms.length);
  else insist(prior === o.terms.length, `inconsistent arity for ${o.relation}`);
  return { relation: o.relation, terms: o.terms.map(term) };
}
const isVar = (t: Term): t is { var: string } => typeof t === "object" && t !== null && !Array.isArray(t);
const termVars = (terms: Term[]): string[] => terms.flatMap(t => isVar(t) ? [t.var] : []);

export function admitSnapshot(input: unknown, arities: Arities = new Map()): Snapshot {
  admitJson(input);
  insist(canonicalBytes(input as Json) <= MAX_SNAPSHOT_BYTES, "snapshot bytes bound");
  const o = fields(input, ["contract", "facts"], "snapshot");
  insist(o.contract === "algal.memory.v1", "snapshot contract");
  insist(Array.isArray(o.facts) && o.facts.length <= MAX_FACTS, "fact count bound");
  const facts = o.facts.map((row, i) => {
    const f = fields(row, ["relation", "tuple", "sources"], `fact[${i}]`);
    insist(isId(f.relation), `fact[${i}] relation id`);
    insist(Array.isArray(f.tuple) && f.tuple.length <= MAX_TERMS, `fact[${i}] arity bound`);
    const prior = arities.get(f.relation);
    if (prior === undefined) arities.set(f.relation, f.tuple.length);
    else insist(prior === f.tuple.length, `inconsistent arity for ${f.relation}`);
    insist(Array.isArray(f.sources) && f.sources.length >= 1 && f.sources.length <= MAX_SOURCES,
      `fact[${i}] source count`);
    return { relation: f.relation, tuple: (f.tuple as unknown[]).map(atom),
      sources: (f.sources as unknown[]).map(s => { insist(isDigest(s), "fact source digest"); return s; }) };
  });
  return { contract: "algal.memory.v1", facts };
}
export function admitProgram(input: unknown, arities: Arities = new Map()): Program {
  admitJson(input);
  insist(canonicalBytes(input as Json) <= MAX_PROGRAM_BYTES, "program bytes bound");
  const o = fields(input, ["contract", "rules", "query", "limits"], "program",
    ["contract", "rules", "query"]);
  insist(o.contract === "algal.query.v1", "program contract");
  insist(Array.isArray(o.rules) && o.rules.length <= MAX_RULES, "rule count bound");
  const rules = o.rules.map((row, i) => {
    const r = fields(row, ["id", "head", "body"], `rule[${i}]`);
    insist(isId(r.id), `rule[${i}] id`);
    const head = literal(r.head, arities, `rule ${r.id} head`);
    insist(Array.isArray(r.body) && r.body.length >= 1 && r.body.length <= MAX_BODY,
      `rule ${r.id} body bound`);
    const body = (r.body as unknown[]).map((b, j) => literal(b, arities, `rule ${r.id} body[${j}]`));
    const bound = new Set(body.flatMap(l => termVars(l.terms)));
    insist(termVars(head.terms).every(v => bound.has(v)), `rule ${r.id} is unsafe (unbound head variable)`);
    return { id: r.id, head, body };
  });
  insist(new Set(rules.map(r => r.id)).size === rules.length, "duplicate rule id");
  const query = literal(o.query, arities, "query");
  const limits = { ...DEFAULT_LIMITS };
  if (o.limits !== undefined) {
    insist(isObject(o.limits), "limits object");
    for (const [k, v] of Object.entries(o.limits)) {
      const ceiling = (LIMIT_CEILINGS as Record<string, number>)[k];
      insist(ceiling !== undefined, `unknown limit ${k}`);
      insist(Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= ceiling,
        `limit ${k} out of range`);
      (limits as Record<string, number>)[k] = v as number;
    }
  }
  return { contract: "algal.query.v1", rules, query, limits };
}
function proofNode(x: unknown, what: string): ProofNode {
  const o = fields(x, ["kind", "fact", "sources", "rule", "premises"], what, ["kind"]);
  if (o.kind === "fact") {
    fields(o, ["kind", "fact", "sources"], `${what} fact-node`);
    insist(isDigest(o.fact), `${what} fact digest`);
    insist(Array.isArray(o.sources) && o.sources.length >= 1 && o.sources.length <= MAX_SOURCES,
      `${what} source count`);
    return { kind: "fact", fact: o.fact,
      sources: (o.sources as unknown[]).map(s => { insist(isDigest(s), "proof source digest"); return s; }) };
  }
  insist(o.kind === "rule", `${what} kind`);
  fields(o, ["kind", "rule", "premises"], `${what} rule-node`);
  insist(isDigest(o.rule), `${what} rule digest`);
  insist(Array.isArray(o.premises) && o.premises.length <= MAX_PREMISES, `${what} premise bound`);
  return { kind: "rule", rule: o.rule,
    premises: (o.premises as unknown[]).map(p => { insist(isDigest(p), "premise digest"); return p; }) };
}
export function admitClaimed(input: unknown, limits: Limits): Claimed {
  admitJson(input);
  const o = fields(input, ["contract", "snapshot", "program", "complete", "witnessPolicy",
    "rows", "proofs", "work", "rounds", "baseFacts", "derivedFacts"], "result");
  insist(o.contract === "algal.query-result.v1", "result contract");
  insist(o.complete === true, "only complete results carry derivations");
  insist(o.witnessPolicy === "first-canonical-derivation", "witness policy");
  insist(isDigest(o.snapshot) && isDigest(o.program), "result identity digests");
  const integer = (v: unknown, max: number, what: string): number => {
    insist(Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= max, `${what} bound`);
    return v as number;
  };
  const work = integer(o.work, limits.maxWork, "work");
  const rounds = integer(o.rounds, limits.maxRounds, "rounds");
  const baseFacts = integer(o.baseFacts, MAX_FACTS, "baseFacts");
  const derivedFacts = integer(o.derivedFacts, limits.maxDerived, "derivedFacts");
  insist(Array.isArray(o.rows) && o.rows.length <= limits.maxRows, "row bound");
  const rows = o.rows.map((row, i) => {
    const r = fields(row, ["tuple", "proof"], `row[${i}]`);
    insist(isDigest(r.proof), `row[${i}] proof id`);
    insist(Array.isArray(r.tuple) && r.tuple.length <= MAX_TERMS, `row[${i}] arity bound`);
    return { tuple: (r.tuple as unknown[]).map(atom), proof: r.proof };
  });
  insist(isObject(o.proofs) && Object.keys(o.proofs).length <= MAX_PROOF_NODES, "proof node bound");
  const proofs: Record<string, ProofNode> = Object.create(null);
  for (const [k, v] of Object.entries(o.proofs)) {
    insist(isDigest(k), "proof id format");
    proofs[k] = proofNode(v, `proof ${k.slice(7, 19)}`);
  }
  insist(canonicalBytes(input as Json) <= limits.maxOutputBytes, "result bytes bound");
  return { contract: "algal.query-result.v1", snapshot: o.snapshot, program: o.program,
    complete: true, witnessPolicy: "first-canonical-derivation",
    rows, proofs, work, rounds, baseFacts, derivedFacts };
}
export function admitSelection(input: unknown): Selection {
  if (input === undefined) return {};
  const o = fields(input, ["allowedSources", "withdrawn"], "selection", []);
  const digests = (v: unknown, what: string) => {
    if (v === undefined) return undefined;
    insist(Array.isArray(v) && v.length <= 4096, `${what} bound`);
    return (v as unknown[]).map(s => { insist(isDigest(s), `${what} digest`); return s; });
  };
  const allowed = digests(o.allowedSources, "allowedSources");
  const withdrawn = digests(o.withdrawn, "withdrawn");
  const out: Selection = {};
  if (allowed !== undefined) out.allowedSources = allowed;
  if (withdrawn !== undefined) out.withdrawn = withdrawn;
  return out;
}

/* ---------- substitution machinery ---------- */

type Subst = Map<string, Atom>;
const sameAtom = (a: Atom, b: Atom): boolean => a === b;

/** Extend/confirm `σ` so that literal `l` matches tuple `t`, or fail.
 *  Constant terms must equal the tuple atom; variables bind on first use and
 *  must agree on every later occurrence (including repeated variables inside
 *  one literal). */
function matchLiteral(σ: Subst, l: Literal, t: { relation: string; values: Atom[] }): Subst | undefined {
  if (l.relation !== t.relation || l.terms.length !== t.values.length) return undefined;
  const next: Subst = new Map(σ);
  for (let i = 0; i < l.terms.length; i++) {
    const tm = l.terms[i]!;
    if (isVar(tm)) {
      const bound = next.get(tm.var);
      if (bound === undefined) next.set(tm.var, t.values[i]!);
      else if (!sameAtom(bound, t.values[i]!)) return undefined;
    } else if (!sameAtom(tm, t.values[i]!)) return undefined;
  }
  return next;
}
function instantiate(l: Literal, σ: Subst): Atom[] | undefined {
  const out: Atom[] = new Array(l.terms.length);
  for (let i = 0; i < l.terms.length; i++) {
    const tm = l.terms[i]!;
    if (isVar(tm)) {
      const v = σ.get(tm.var);
      if (v === undefined) return undefined;
      out[i] = v;
    } else out[i] = tm;
  }
  return out;
}
const tupleKey = (relation: string, values: Atom[]) => canonical([relation, values] as Json);

/* ---------- independent naive least-fixpoint evaluation ----------
 * Plain nested-loop joins over tuples sorted by canonical key. There is no
 * hash index and no per-probe work ledger; the semantic bounds (rounds,
 * derived tuples, join bindings, result rows) mirror the contract. */

interface StoredTuple { relation: string; values: Atom[]; proof: string }
interface Evaluation {
  ok: boolean; reason?: string;
  rounds: number; baseFacts: number; derivedFacts: number;
  known: Map<string, StoredTuple>;
  proofNodes: Record<string, ProofNode>;
  rows: Map<string, { tuple: Atom[]; proof: string }>;
}
const proofId = (node: ProofNode): string => digestDocument(node as unknown as Json);

function evaluate(facts: Fact[], rules: Rule[], query: Literal, limits: Limits): Evaluation {
  const proofNodes: Record<string, ProofNode> = Object.create(null);
  const known = new Map<string, StoredTuple>();
  const orderedFacts = [...facts].sort((a, b) => {
    const da = digestDocument({ relation: a.relation, tuple: a.tuple, sources: a.sources } as unknown as Json);
    const db = digestDocument({ relation: b.relation, tuple: b.tuple, sources: b.sources } as unknown as Json);
    return da < db ? -1 : da > db ? 1 : 0;
  }).map(f => ({ f, factDigest: digestDocument({ relation: f.relation, tuple: f.tuple, sources: f.sources } as unknown as Json) }));
  for (const { f, factDigest } of orderedFacts) {
    const key = tupleKey(f.relation, f.tuple);
    if (known.has(key)) continue;
    const node: ProofNode = { kind: "fact", fact: factDigest, sources: f.sources };
    const id = proofId(node);
    proofNodes[id] = node;
    known.set(key, { relation: f.relation, values: f.tuple, proof: id });
  }
  const sortedRules = [...rules].sort((a, b) => cmpCanonical(a.id, b.id));
  const ruleDigests = new Map(sortedRules.map(r =>
    [r.id, digestDocument({ id: r.id, head: r.head, body: r.body } as unknown as Json)] as const));
  const base = known.size;
  let rounds = 0;
  const fail = (reason: string): Evaluation =>
    ({ ok: false, reason, rounds, baseFacts: base, derivedFacts: known.size - base,
      known, proofNodes, rows: new Map() });
  for (;;) {
    if (rounds >= limits.maxRounds) return fail("rounds-exhausted");
    rounds++;
    const ordered = [...known.values()].sort((a, b) =>
      cmpCanonical(tupleKey(a.relation, a.values), tupleKey(b.relation, b.values)));
    const grouped = new Map<string, StoredTuple[]>();
    for (const t of ordered) {
      const bucket = grouped.get(t.relation);
      if (bucket) bucket.push(t); else grouped.set(t.relation, [t]);
    }
    const additions = new Map<string, StoredTuple>();
    for (const rule of sortedRules) {
      interface Binding { σ: Subst; premises: string[] }
      let bindings: Binding[] = [{ σ: new Map(), premises: [] }];
      let exhausted = false;
      for (const lit of rule.body) {
        const candidates = grouped.get(lit.relation) ?? [];
        const next: Binding[] = [];
        for (const b of bindings) {
          for (const cand of candidates) {
            const σ1 = matchLiteral(b.σ, lit, cand);
            if (σ1 === undefined) continue;
            if (next.length >= limits.maxBindings) { exhausted = true; break; }
            next.push({ σ: σ1, premises: [...b.premises, cand.proof] });
          }
          if (exhausted) break;
        }
        if (exhausted) break;
        bindings = next;
      }
      if (exhausted) return fail("bindings-exhausted");
      for (const b of bindings) {
        const values = instantiate(rule.head, b.σ);
        if (values === undefined) return fail("unsafe-rule-head");
        const key = tupleKey(rule.head.relation, values);
        if (known.has(key) || additions.has(key)) continue;
        if (known.size - base + additions.size >= limits.maxDerived)
          return fail("derived-exhausted");
        const node: ProofNode = { kind: "rule", rule: ruleDigests.get(rule.id)!, premises: b.premises };
        const id = proofId(node);
        proofNodes[id] = node;
        additions.set(key, { relation: rule.head.relation, values, proof: id });
      }
    }
    if (additions.size === 0) break;
    for (const [k, v] of additions) known.set(k, v);
  }
  const ordered = [...known.values()].sort((a, b) =>
    cmpCanonical(tupleKey(a.relation, a.values), tupleKey(b.relation, b.values)));
  const rows = new Map<string, { tuple: Atom[]; proof: string }>();
  for (const cand of ordered) {
    if (cand.relation !== query.relation) continue;
    const σ = matchLiteral(new Map(), query, cand);
    if (σ === undefined) continue;
    const values = instantiate(query, σ);
    if (values === undefined) return fail("ungroundable-query");
    const key = canonical(values as Json);
    if (!rows.has(key)) {
      rows.set(key, { tuple: values, proof: cand.proof });
      if (rows.size > limits.maxRows) return fail("rows-exhausted");
    }
  }
  const needed = new Set<string>();
  const pending = [...rows.values()].map(r => r.proof);
  while (pending.length) {
    const p = pending.pop()!;
    if (needed.has(p)) continue;
    needed.add(p);
    const node = proofNodes[p];
    if (node?.kind === "rule") pending.push(...node.premises);
  }
  for (const k of Object.keys(proofNodes)) if (!needed.has(k)) delete proofNodes[k];
  return { ok: true, rounds, baseFacts: base, derivedFacts: known.size - base,
    known, proofNodes, rows };
}

/* ---------- proof-DAG resolution ---------- */

interface Env {
  snapshot: Snapshot; program: Program; claimed: Claimed; selection: Selection;
  factByDigest: Map<string, Fact>;
  ruleByDigest: Map<string, Rule>;
}

interface Resolved { relation: string; values: Atom[] }

function resolveProof(env: Env, id: string, visiting: Set<string>, memo: Map<string, Resolved>): Resolved {
  const cached = memo.get(id);
  if (cached) return cached;
  if (visiting.has(id)) reject("proof-cycle", `proof ${id} is its own support`);
  const node = env.claimed.proofs[id];
  if (node === undefined) reject("unknown-proof", `proof ${id} is not in the proofs map`);
  visiting.add(id);
  let out: Resolved;
  if (node.kind === "fact") {
    const fact = env.factByDigest.get(node.fact);
    if (fact === undefined)
      reject("fact-not-selected", `proof ${id} cites a fact outside the selected snapshot`);
    if (node.sources.length !== fact.sources.length ||
        !node.sources.every((s, i) => s === fact.sources[i]))
      reject("fact-source-binding", `proof ${id} source list does not match the bound fact`);
    for (const s of node.sources) {
      if (env.selection.withdrawn?.includes(s))
        reject("withdrawn-source", `proof ${id} relies on a withdrawn source`);
      if (env.selection.allowedSources !== undefined && !env.selection.allowedSources.includes(s))
        reject("unselected-source", `proof ${id} relies on a source the selection did not admit`);
    }
    out = { relation: fact.relation, values: fact.tuple };
  } else {
    const rule = env.ruleByDigest.get(node.rule);
    if (rule === undefined)
      reject("rule-not-in-program", `proof ${id} cites a rule outside the program`);
    if (node.premises.length !== rule.body.length)
      reject("premise-count-mismatch",
        `proof ${id} lists ${node.premises.length} premises for a ${rule.body.length}-literal body`);
    let σ: Subst = new Map();
    for (let i = 0; i < node.premises.length; i++) {
      const sub = resolveProof(env, node.premises[i]!, visiting, memo);
      const next = matchLiteral(σ, rule.body[i]!, sub);
      if (next === undefined)
        reject("substitution-mismatch",
          `proof ${id} premise ${i} does not satisfy body literal ${i} of rule ${rule.id}`);
      σ = next;
    }
    const head = instantiate(rule.head, σ);
    if (head === undefined)
      reject("unbound-head-variable", `proof ${id} leaves a head variable unbound`);
    out = { relation: rule.head.relation, values: head };
  }
  visiting.delete(id);
  memo.set(id, out);
  return out;
}

/* ---------- main entry ---------- */

/**
 * Check a claimed `algal.query-result.v1` against the exact selected snapshot
 * and program. Pure and deterministic: identical inputs give identical
 * verdicts. Never throws for rejected derivations; admission failures are
 * reported as `malformed-input`/`result-binding` rejects.
 */
export function checkQueryResult(input: unknown): Verdict {
  try {
    insist(isObject(input), "input object");
    const o = fields(input, ["snapshot", "program", "claimed", "selection"], "input",
      ["snapshot", "program", "claimed"]);
    const arities: Arities = new Map();
    const snapshot = admitSnapshot(o.snapshot, arities);
    const program = admitProgram(o.program, arities);
    const claimed = admitClaimed(o.claimed, program.limits);
    const selection = admitSelection(o.selection);

    // Result identity binds the exact input documents.
    if (claimed.snapshot !== digestDocument(o.snapshot as Json))
      reject("snapshot-digest-mismatch", "claimed snapshot digest does not match the input snapshot");
    if (claimed.program !== digestDocument(o.program as Json))
      reject("program-digest-mismatch", "claimed program digest does not match the input program");

    const factByDigest = new Map<string, Fact>();
    for (const f of snapshot.facts)
      factByDigest.set(digestDocument({ relation: f.relation, tuple: f.tuple, sources: f.sources } as unknown as Json), f);
    const ruleByDigest = new Map<string, Rule>();
    for (const r of program.rules)
      ruleByDigest.set(digestDocument({ id: r.id, head: r.head, body: r.body } as unknown as Json), r);
    const env: Env = { snapshot, program, claimed, selection, factByDigest, ruleByDigest };

    // Rows must be in canonical order, unique, and ground the query literal.
    let previous = "";
    for (const [i, row] of claimed.rows.entries()) {
      const key = canonical(row.tuple as Json);
      if (i > 0 && cmpCanonical(key, previous) <= 0)
        reject("row-order", "rows are not strictly ordered by canonical tuple");
      previous = key;
      if (matchLiteral(new Map(), program.query,
          { relation: program.query.relation, values: row.tuple }) === undefined)
        reject("row-not-matching-query", `row ${i} does not instantiate the query literal`);
    }

    // Resolve every row's derivation DAG; the resolved conclusion must be
    // exactly the claimed tuple under the query relation.
    const memo = new Map<string, Resolved>();
    const reachable = new Set<string>();
    for (const row of claimed.rows) {
      const out = resolveProof(env, row.proof, new Set(), memo);
      if (out.relation !== program.query.relation ||
          out.values.length !== row.tuple.length ||
          !out.values.every((v, i) => sameAtom(v, row.tuple[i]!)))
        reject("conclusion-mismatch", `row proof resolves to ${canonical(out.values as Json)}`);
      const collect = (id: string) => {
        if (reachable.has(id)) return;
        reachable.add(id);
        const node = claimed.proofs[id];
        if (node?.kind === "rule") node.premises.forEach(collect);
      };
      collect(row.proof);
    }

    // Content identity: every map key must be the digest of its own node.
    // This runs after resolution so that support cycles (which are not
    // realizable under content-digest identity) still get their precise
    // reason on arbitrary admitted maps, and before the reachability pass so
    // that a forged key reports its binding failure rather than dangling.
    for (const [k, node] of Object.entries(claimed.proofs))
      if (proofId(node) !== k)
        reject("proof-id-not-content-digest", `proof key ${k.slice(7, 19)} is not the digest of its node`);
    for (const k of Object.keys(claimed.proofs))
      if (!reachable.has(k))
        reject("dangling-proof", `proof ${k.slice(7, 19)} is unreachable from any row`);

    // Independent fixpoint enumeration establishes the exact answer set and
    // the canonical first witnesses.
    const evaluation = evaluate(snapshot.facts, program.rules, program.query, program.limits);
    if (!evaluation.ok)
      reject("completeness-not-established",
        `independent evaluation cannot confirm a complete answer (${evaluation.reason})`);
    if (claimed.baseFacts !== evaluation.baseFacts)
      reject("result-binding", "baseFacts does not match the snapshot");
    if (claimed.derivedFacts !== evaluation.derivedFacts)
      reject("result-binding", "derivedFacts does not match the fixpoint");
    if (claimed.rounds !== evaluation.rounds)
      reject("result-binding", "rounds does not match the fixpoint iteration");
    const expected = evaluation.rows;
    const claimedKeys = claimed.rows.map(r => canonical(r.tuple as Json));
    for (const k of claimedKeys)
      if (!expected.has(k)) reject("unexpected-row", `row ${k} is not in the fixpoint answer set`);
    for (const [k, want] of expected) {
      const at = claimedKeys.indexOf(k);
      if (at === -1) reject("missing-row", `answer row ${k} is absent from the claim`);
      if (claimed.rows[at]!.proof !== want.proof)
        reject("witness-not-canonical-first",
          `row ${k} cites a later derivation than the canonical first witness`);
    }
    return { accept: true, rows: claimed.rows.length };
  } catch (e) {
    if (e instanceof CheckError) return { accept: false, reason: e.reason, detail: e.message };
    throw e;
  }
}

/** Exposed for tests and fixture construction; not part of the verdict path's
 *  trusted surface beyond what `checkQueryResult` already cross-checks. */
export const internals = { evaluate, matchLiteral, instantiate, tupleKey, proofId };
