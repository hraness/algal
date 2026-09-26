/**
 * Mutation controls for the independent memory derivation checker
 * (`verify/reference/memory/checker.ts`).
 *
 * Each case takes a derivation that `checkQueryResult` accepts and applies
 * one targeted semantic mutation — a flipped premise order, a dropped
 * premise, a substituted conclusion, a swapped rule identity, a fact outside
 * the selected snapshot, a withdrawn or never-admitted source, a forged
 * proof-map key, a support cycle, an off-by-one iteration bound — then
 * asserts the *typed* rejection reason, not merely any failure. A mutant
 * that only corrupts bytes at random could pass with `malformed-input`
 * without exercising the intended invariant; these cases are constructed so
 * that the declared reason is the honest outcome, and every baseline
 * derivation is re-checked as accepted before the mutants run.
 *
 * Expectations are written by hand from the contract semantics documented in
 * `verify/reference/memory/SCOPE.md`, not sampled from the checker's own
 * output, so a drift in the checker's reason table cannot re-map a mutant's
 * expectation silently.
 */
import {
  checkQueryResult, type Atom, type Fact, type Input, type ProofNode,
  type Program, type Reason, type Rule, type Snapshot, type Verdict,
} from "../reference/memory/checker";
import {
  claimed, factId, factNode, lit, pid, program, ruleId, ruleNode, snapshot,
  source, v, type Counts,
} from "../reference/memory/fixtures";

/** Mutation classes named by the Phase 11 deliverable. */
export type MutationClass =
  | "premise-order"          // flipped premise order inside a rule proof node
  | "premise-count"          // dropped (or appended) premise vs the bound rule body
  | "premise-substituted"    // a valid proof node resolving to the wrong relation/tuple
  | "conclusion-substituted" // row tuple or proof binding claims another conclusion
  | "rule-identity"          // rule digest swapped for another declared/foreign rule
  | "snapshot-membership"    // terminal fact not a member of the selected snapshot
  | "observation-authority"  // withdrawn / unselected / rebound source digests
  | "proof-identity"         // forged, unknown or unreachable proof-map entries
  | "cycle"                  // cyclic self-support reachable from a row
  | "iteration-bound"        // off-by-one on rounds/derived/base/limits counters
  | "row-set"                // dropped, duplicated, reordered or non-matching rows
  | "envelope-identity";     // claimed input digests bound to the wrong documents

export interface MutationCase {
  /** Stable id — `<base>.<class>.<detail>`. */
  readonly id: string;
  readonly class: MutationClass;
  /** Which baseline derivation this mutates. */
  readonly base: string;
  /** What changed, in one line, for reviewer/audit reading. */
  readonly mutation: string;
  /** The exact checker input after mutation. */
  readonly input: Input;
  /** The typed rejection reason the contract requires — never "any failure". */
  readonly expect: Reason;
}

export interface BaseCase {
  readonly id: string;
  readonly description: string;
  readonly input: Input;
}

/* ------------------------------------------------------------------ bases */

const SRC = source("chain observation");
const OTHER_SRC = source("second observation");
const WITHDRAWN_SRC = source("withdrawn observation");

/** Shared two-hop dependency chain, mirroring the production fixture. */
const F1: Fact = { relation: "depends", tuple: ["app", "parser"], sources: [SRC] };
const F2: Fact = { relation: "depends", tuple: ["parser", "lexer"], sources: [SRC] };
const DIRECT: Rule = {
  id: "direct",
  head: lit("affects", [v("x"), v("y")]),
  body: [lit("depends", [v("x"), v("y")])],
};
const TRANSITIVE: Rule = {
  id: "transitive",
  head: lit("affects", [v("x"), v("z")]),
  body: [lit("affects", [v("x"), v("y")]), lit("depends", [v("y"), v("z")])],
};
/** A second rule with an identical head/body shape whose id sorts *after*
 *  `direct`, so `direct` stays the canonical first witness. Used to prove
 *  the checker binds rule identity, not just the resolved conclusion. */
const SHADOW: Rule = {
  id: "zz-shadow",
  head: lit("affects", [v("x"), v("y")]),
  body: [lit("depends", [v("x"), v("y")])],
};

const P1 = pid(factNode(F1));
const P2 = pid(factNode(F2));
const R1 = pid(ruleNode(DIRECT, [P1]));            // affects(app, parser)
const R2 = pid(ruleNode(TRANSITIVE, [R1, P2]));    // affects(app, lexer)
/** The transitive derivation with its premises exchanged, and its id. */
const R2_FLIPPED_NODE = ruleNode(TRANSITIVE, [P2, R1]);
const R2_FLIPPED = pid(R2_FLIPPED_NODE);
/** The direct derivation rebuilt over the second fact: affects(parser,lexer). */
const R1_ON_F2_NODE = ruleNode(DIRECT, [P2]);
const R1_ON_F2 = pid(R1_ON_F2_NODE);
/** The transitive derivation with premise 1 replaced by fact 1. */
const R2_P1_NODE = ruleNode(TRANSITIVE, [R1, P1]);
const R2_P1 = pid(R2_P1_NODE);

const CHAIN_SNAPSHOT = (): Snapshot => snapshot([F1, F2]);
const CHAIN_PROGRAM = (): Program =>
  program([DIRECT, TRANSITIVE], lit("affects", ["app", v("target")]));
const CHAIN_PROGRAM_SHADOW = (): Program =>
  program([DIRECT, TRANSITIVE, SHADOW], lit("affects", ["app", v("target")]));
const CHAIN_PROOFS = (): Record<string, ProofNode> => ({
  [P1]: factNode(F1), [P2]: factNode(F2),
  [R1]: ruleNode(DIRECT, [P1]), [R2]: ruleNode(TRANSITIVE, [R1, P2]),
});
/** Canonical row order: `["app","lexer"]` sorts before `["app","parser"]`. */
const CHAIN_ROWS = () => [
  { tuple: ["app", "lexer"] as Atom[], proof: R2 },
  { tuple: ["app", "parser"] as Atom[], proof: R1 },
];
/** Round 1 fires `direct` twice; round 2 adds affects(app,lexer); round 3 is
 *  empty. derivedFacts counts the unqueried affects(parser,lexer) too. */
const CHAIN_COUNTS: Counts = { rounds: 3, baseFacts: 2, derivedFacts: 3 };

function chainInput(over: {
  snap?: Snapshot; prog?: Program;
  rows?: { tuple: Atom[]; proof: string }[];
  proofs?: Record<string, ProofNode>;
  counts?: Counts;
  selection?: Input["selection"];
} = {}): Input {
  const snap = over.snap ?? CHAIN_SNAPSHOT();
  const prog = over.prog ?? CHAIN_PROGRAM();
  const out: Input = {
    snapshot: snap, program: prog,
    claimed: claimed(snap, prog,
      over.rows ?? CHAIN_ROWS(), over.proofs ?? CHAIN_PROOFS(),
      over.counts ?? CHAIN_COUNTS),
    selection: {},
  };
  if (over.selection !== undefined) out.selection = over.selection;
  return out;
}

/** Shared-premise DAG: edge(a,b), edge(b,c) under hop + concatenation rules
 *  deriving path(a,b), path(b,c), path(a,c) — one derivation reuses another. */
const E1: Fact = { relation: "edge", tuple: ["a", "b"], sources: [SRC] };
const E2: Fact = { relation: "edge", tuple: ["b", "c"], sources: [SRC] };
const HOP: Rule = {
  id: "hop",
  head: lit("path", [v("x"), v("y")]),
  body: [lit("edge", [v("x"), v("y")])],
};
const CAT: Rule = {
  id: "cat",
  head: lit("path", [v("x"), v("z")]),
  body: [lit("path", [v("x"), v("y")]), lit("edge", [v("y"), v("z")])],
};
const PE1 = pid(factNode(E1));
const PE2 = pid(factNode(E2));
const H1 = pid(ruleNode(HOP, [PE1]));              // path(a,b)
const H2 = pid(ruleNode(HOP, [PE2]));              // path(b,c)
const CC = pid(ruleNode(CAT, [H1, PE2]));          // path(a,c)
const CC_FLIPPED_NODE = ruleNode(CAT, [PE2, H1]);
const CC_FLIPPED = pid(CC_FLIPPED_NODE);
const CC_EDGE_PREMISE_NODE = ruleNode(CAT, [PE1, PE2]);
const CC_EDGE_PREMISE = pid(CC_EDGE_PREMISE_NODE);
const CC_PATH_PREMISE_NODE = ruleNode(CAT, [H1, H2]);
const CC_PATH_PREMISE = pid(CC_PATH_PREMISE_NODE);

const DAG_SNAPSHOT = (): Snapshot => snapshot([E1, E2]);
const DAG_PROGRAM = (): Program =>
  program([HOP, CAT], lit("path", [v("x"), v("z")]));
const DAG_PROOFS = (): Record<string, ProofNode> => ({
  [PE1]: factNode(E1), [PE2]: factNode(E2),
  [H1]: ruleNode(HOP, [PE1]), [H2]: ruleNode(HOP, [PE2]),
  [CC]: ruleNode(CAT, [H1, PE2]),
});
const DAG_ROWS = () => [
  { tuple: ["a", "b"] as Atom[], proof: H1 },
  { tuple: ["a", "c"] as Atom[], proof: CC },
  { tuple: ["b", "c"] as Atom[], proof: H2 },
];
const DAG_COUNTS: Counts = { rounds: 3, baseFacts: 2, derivedFacts: 3 };

function dagInput(over: {
  snap?: Snapshot; prog?: Program;
  rows?: { tuple: Atom[]; proof: string }[];
  proofs?: Record<string, ProofNode>;
  counts?: Counts;
  selection?: Input["selection"];
} = {}): Input {
  const snap = over.snap ?? DAG_SNAPSHOT();
  const prog = over.prog ?? DAG_PROGRAM();
  const out: Input = {
    snapshot: snap, program: prog,
    claimed: claimed(snap, prog,
      over.rows ?? DAG_ROWS(), over.proofs ?? DAG_PROOFS(),
      over.counts ?? DAG_COUNTS),
    selection: {},
  };
  if (over.selection !== undefined) out.selection = over.selection;
  return out;
}

/** A base fact carrying two admissible source digests — exercises partial
 *  withdrawal and ordered source-list binding. */
const M1: Fact = { relation: "depends", tuple: ["lib", "core"], sources: [SRC, OTHER_SRC] };
const PM1 = pid(factNode(M1));
const RM1 = pid(ruleNode(DIRECT, [PM1]));          // affects(lib, core)

const MULTI_SNAPSHOT = (): Snapshot => snapshot([M1]);
const MULTI_PROGRAM = (): Program =>
  program([DIRECT], lit("affects", [v("x"), v("y")]));
const MULTI_PROOFS = (): Record<string, ProofNode> => ({
  [PM1]: factNode(M1), [RM1]: ruleNode(DIRECT, [PM1]),
});
const MULTI_ROWS = () => [{ tuple: ["lib", "core"] as Atom[], proof: RM1 }];
const MULTI_COUNTS: Counts = { rounds: 2, baseFacts: 1, derivedFacts: 1 };

function multiInput(over: {
  snap?: Snapshot; prog?: Program;
  rows?: { tuple: Atom[]; proof: string }[];
  proofs?: Record<string, ProofNode>;
  counts?: Counts;
  selection?: Input["selection"];
} = {}): Input {
  const snap = over.snap ?? MULTI_SNAPSHOT();
  const prog = over.prog ?? MULTI_PROGRAM();
  const out: Input = {
    snapshot: snap, program: prog,
    claimed: claimed(snap, prog,
      over.rows ?? MULTI_ROWS(), over.proofs ?? MULTI_PROOFS(),
      over.counts ?? MULTI_COUNTS),
    selection: {},
  };
  if (over.selection !== undefined) out.selection = over.selection;
  return out;
}

/** Chain program with the shadow rule declared — the canonical first
 *  witness for affects(app,parser) is still `direct` (id order). */
function shadowInput(over: {
  rows?: { tuple: Atom[]; proof: string }[];
  proofs?: Record<string, ProofNode>;
} = {}): Input {
  const snap = CHAIN_SNAPSHOT();
  const prog = CHAIN_PROGRAM_SHADOW();
  return {
    snapshot: snap, program: prog,
    claimed: claimed(snap, prog,
      over.rows ?? CHAIN_ROWS(), over.proofs ?? CHAIN_PROOFS(), CHAIN_COUNTS),
    selection: {},
  };
}

export const BASES: BaseCase[] = [
  { id: "chain", description: "two-hop depends chain under direct+transitive rules", input: chainInput() },
  { id: "chain-shadow", description: "same chain with the same-shape shadow rule declared", input: shadowInput() },
  { id: "dag", description: "shared-premise path DAG under hop+cat rules", input: dagInput() },
  { id: "multi-source", description: "single derivation over a two-source fact", input: multiInput() },
];

/* ---------------------------------------------------------------- mutants */

const FORGED = "sha256:" + "f0".repeat(32);
const FORGED_2 = "sha256:" + "e1".repeat(32);
const FORGED_3 = "sha256:" + "d2".repeat(32);

function catalog(): MutationCase[] {
  const out: MutationCase[] = [];
  const push = (base: string, cls: MutationClass, detail: string,
    mutation: string, input: Input, expect: Reason) =>
    out.push({ id: `${base}.${cls}.${detail}`, class: cls, base, mutation, input, expect });

  /* ---------- premise order (flipped) ---------- */

  // R2 premises [R1,P2] → [P2,R1]: premise 0 now resolves depends(parser,lexer),
  // which cannot satisfy body literal affects(x,y).
  push("chain", "premise-order", "transitive-flip",
    "transitive rule node lists [fact2, rule1] instead of [rule1, fact2]",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: R2_FLIPPED },
             { tuple: ["app", "parser"], proof: R1 }],
      proofs: { ...CHAIN_PROOFS(), [R2_FLIPPED]: R2_FLIPPED_NODE },
    }), "substitution-mismatch");

  // CC premises [H1,PE2] → [PE2,H1]: premise 0 resolves edge(b,c) against
  // body literal path(x,y) — a relation mismatch, not a reorder detail.
  push("dag", "premise-order", "cat-flip",
    "cat rule node lists [edge2, hop1] instead of [hop1, edge2]",
    dagInput({
      rows: [{ tuple: ["a", "b"], proof: H1 },
             { tuple: ["a", "c"], proof: CC_FLIPPED },
             { tuple: ["b", "c"], proof: H2 }],
      proofs: { ...DAG_PROOFS(), [CC_FLIPPED]: CC_FLIPPED_NODE },
    }), "substitution-mismatch");

  /* ---------- premise count (dropped / appended) ---------- */

  const DIRECT_EMPTY_NODE = ruleNode(DIRECT, []);
  push("chain", "premise-count", "direct-drop",
    "direct rule node drops its only premise (0 vs 1)",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: R2 },
             { tuple: ["app", "parser"], proof: pid(DIRECT_EMPTY_NODE) }],
      proofs: { ...CHAIN_PROOFS(), [pid(DIRECT_EMPTY_NODE)]: DIRECT_EMPTY_NODE },
    }), "premise-count-mismatch");

  const TRANS_FIRST_NODE = ruleNode(TRANSITIVE, [P2]);
  push("chain", "premise-count", "transitive-drop-first",
    "transitive rule node drops premise 0 (1 vs 2)",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: pid(TRANS_FIRST_NODE) },
             { tuple: ["app", "parser"], proof: R1 }],
      proofs: { ...CHAIN_PROOFS(), [pid(TRANS_FIRST_NODE)]: TRANS_FIRST_NODE },
    }), "premise-count-mismatch");

  const TRANS_LAST_NODE = ruleNode(TRANSITIVE, [R1]);
  push("chain", "premise-count", "transitive-drop-last",
    "transitive rule node drops premise 1 (1 vs 2)",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: pid(TRANS_LAST_NODE) },
             { tuple: ["app", "parser"], proof: R1 }],
      proofs: { ...CHAIN_PROOFS(), [pid(TRANS_LAST_NODE)]: TRANS_LAST_NODE },
    }), "premise-count-mismatch");

  const TRANS_APPEND_NODE = ruleNode(TRANSITIVE, [R1, P2, P1]);
  push("chain", "premise-count", "transitive-append",
    "transitive rule node appends a third premise (3 vs 2)",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: pid(TRANS_APPEND_NODE) },
             { tuple: ["app", "parser"], proof: R1 }],
      proofs: { ...CHAIN_PROOFS(), [pid(TRANS_APPEND_NODE)]: TRANS_APPEND_NODE },
    }), "premise-count-mismatch");

  const CAT_DROP_NODE = ruleNode(CAT, [H1]);
  push("dag", "premise-count", "cat-drop-last",
    "cat rule node drops its edge premise (1 vs 2)",
    dagInput({
      rows: [{ tuple: ["a", "b"], proof: H1 },
             { tuple: ["a", "c"], proof: pid(CAT_DROP_NODE) },
             { tuple: ["b", "c"], proof: H2 }],
      proofs: { ...DAG_PROOFS(), [pid(CAT_DROP_NODE)]: CAT_DROP_NODE },
    }), "premise-count-mismatch");

  /* ---------- premise substituted for another valid node ---------- */

  // DIRECT over P2 derives affects(parser,lexer) — a real derivation of a
  // different tuple; the row still claims (app,parser).
  push("chain", "premise-substituted", "direct-uses-fact2",
    "direct rule node cites fact2's proof; resolves affects(parser,lexer) while the row claims (app,parser)",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: R2 },
             { tuple: ["app", "parser"], proof: R1_ON_F2 }],
      proofs: { ...CHAIN_PROOFS(), [R1_ON_F2]: R1_ON_F2_NODE },
    }), "conclusion-mismatch");

  // R2 premises [R1,P1]: premise 1 resolves depends(app,parser) but the
  // accumulated substitution needs depends(parser,z) — a conflict found
  // inside the body, not at the conclusion.
  push("chain", "premise-substituted", "transitive-uses-fact1",
    "transitive rule node replaces premise 1 with fact1's proof; y=parser conflicts with depends(app,parser)",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: R2_P1 },
             { tuple: ["app", "parser"], proof: R1 }],
      proofs: { ...CHAIN_PROOFS(), [R2_P1]: R2_P1_NODE },
    }), "substitution-mismatch");

  // CAT premise 0 replaced by a fact node (edge(a,b) cannot serve path(x,y)).
  push("dag", "premise-substituted", "cat-premise0-is-fact",
    "cat rule node replaces premise 0 with edge1's proof; edge relation cannot satisfy path(x,y)",
    dagInput({
      rows: [{ tuple: ["a", "b"], proof: H1 },
             { tuple: ["a", "c"], proof: CC_EDGE_PREMISE },
             { tuple: ["b", "c"], proof: H2 }],
      proofs: { ...DAG_PROOFS(), [CC_EDGE_PREMISE]: CC_EDGE_PREMISE_NODE },
    }), "substitution-mismatch");

  // CAT premise 1 replaced by another path derivation (path(b,c) cannot
  // serve edge(y,z)).
  push("dag", "premise-substituted", "cat-premise1-is-rule",
    "cat rule node replaces premise 1 with hop2's proof; path relation cannot satisfy edge(y,z)",
    dagInput({
      rows: [{ tuple: ["a", "b"], proof: H1 },
             { tuple: ["a", "c"], proof: CC_PATH_PREMISE },
             { tuple: ["b", "c"], proof: H2 }],
      proofs: { ...DAG_PROOFS(), [CC_PATH_PREMISE]: CC_PATH_PREMISE_NODE },
    }), "substitution-mismatch");

  /* ---------- conclusion tuple substituted ---------- */

  // The DAG resolves honestly; the row claims a different tuple.
  push("chain", "conclusion-substituted", "row-claims-other-tuple",
    "row tuple mutated to (app,app); its proof still resolves (app,lexer)",
    chainInput({
      rows: [{ tuple: ["app", "app"], proof: R2 },
             { tuple: ["app", "parser"], proof: R1 }],
    }), "conclusion-mismatch");

  // Same mutation class, different atom type: number for string. Canonical
  // numbers serialise without quotes, so `["app",7]` sorts *after*
  // `["app","lexer"]` — the mutated tuple replaces the second row.
  push("chain", "conclusion-substituted", "row-claims-number-tuple",
    "row tuple mutated to (app,7); its proof still resolves (app,parser)",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: R2 },
             { tuple: ["app", 7], proof: R1 }],
    }), "conclusion-mismatch");

  // The row borrows another row's proof: R1 resolves (app,parser) ≠ (app,lexer).
  push("chain", "conclusion-substituted", "row-borrows-proof",
    "row (app,lexer) cites the derivation of (app,parser)",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: R1 },
             { tuple: ["app", "parser"], proof: R1 }],
    }), "conclusion-mismatch");

  /* ---------- rule identity swapped ---------- */

  // A rule proof cites a rule the admitted program never declared.
  const FOREIGN: Rule = {
    id: "foreign",
    head: lit("affects", [v("x"), v("y")]),
    body: [lit("depends", [v("x"), v("y")])],
  };
  const foreignNode = ruleNode(FOREIGN, [P1]);
  push("chain", "rule-identity", "foreign-rule",
    "rule node cites the digest of a rule absent from the program",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: R2 },
             { tuple: ["app", "parser"], proof: pid(foreignNode) }],
      proofs: { ...CHAIN_PROOFS(), [pid(foreignNode)]: foreignNode },
    }), "rule-not-in-program");

  // The transitive derivation is re-issued under the direct rule's digest:
  // premises [R1,P2] (2) cannot match direct's single-literal body.
  const SWAPPED_RULE_NODE = ruleNode(DIRECT, [R1, P2]);
  push("chain", "rule-identity", "long-body-under-short-rule",
    "transitive derivation re-labelled as the direct rule (2 premises vs 1-literal body)",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: pid(SWAPPED_RULE_NODE) },
             { tuple: ["app", "parser"], proof: R1 }],
      proofs: { ...CHAIN_PROOFS(), [pid(SWAPPED_RULE_NODE)]: SWAPPED_RULE_NODE },
    }), "premise-count-mismatch");

  // Same shape, different identity: with zz-shadow declared, a derivation
  // through it resolves the same tuple — but it is not the canonical first
  // witness, which enumerates rules by id and keeps "direct" first. The R2
  // path through R1 keeps R1 reachable, so nothing dangles.
  const SHADOW_NODE = ruleNode(SHADOW, [P1]);
  push("chain-shadow", "rule-identity", "same-shape-shadow-rule",
    "row cites a derivation through zz-shadow instead of the canonical direct derivation",
    shadowInput({
      rows: [{ tuple: ["app", "lexer"], proof: R2 },
             { tuple: ["app", "parser"], proof: pid(SHADOW_NODE) }],
      proofs: { ...CHAIN_PROOFS(), [pid(SHADOW_NODE)]: SHADOW_NODE },
    }), "witness-not-canonical-first");

  /* ---------- snapshot membership ---------- */

  // A fact leaf bound to a tuple the selected snapshot never carried.
  // Canonical order places (app,ghost) first: "ghost" < "lexer" < "parser".
  {
    const ghost: Fact = { relation: "depends", tuple: ["app", "ghost"], sources: [SRC] };
    const ghostNode = factNode(ghost);
    const r = ruleNode(DIRECT, [pid(ghostNode)]);
    push("chain", "snapshot-membership", "ghost-fact-leaf",
      "rule premise resolves to a fact digest the selected snapshot does not contain",
      chainInput({
        rows: [{ tuple: ["app", "ghost"], proof: pid(r) },
               { tuple: ["app", "lexer"], proof: R2 },
               { tuple: ["app", "parser"], proof: R1 }],
        proofs: { ...CHAIN_PROOFS(), [pid(ghostNode)]: ghostNode, [pid(r)]: r },
      }), "fact-not-selected");
  }

  // The snapshot record itself is swapped: a fact's source list changed, so
  // the proof's digest-bound leaf no longer matches any selected member.
  {
    const tamperedF1: Fact = { ...F1, sources: [OTHER_SRC] };
    push("chain", "snapshot-membership", "snapshot-fact-rebound",
      "snapshot carries depends(app,parser) under a different source list; the proof's bound leaf is absent",
      chainInput({ snap: snapshot([tamperedF1, F2]) }), "fact-not-selected");
  }

  // A member fact is silently dropped from the snapshot while the proof
  // still cites it.
  push("chain", "snapshot-membership", "member-fact-dropped",
    "snapshot omits depends(app,parser) while the proof DAG still cites it",
    chainInput({ snap: snapshot([F2]) }), "fact-not-selected");

  /* ---------- observation authority (stale / withdrawn / rebound) ------- */

  push("chain", "observation-authority", "withdrawn-source",
    "selection withdraws the only source digest the terminal facts carry",
    chainInput({ selection: { withdrawn: [SRC] } }), "withdrawn-source");

  push("chain", "observation-authority", "unselected-source",
    "selection admits a different scope; the facts' source was never admitted",
    chainInput({ selection: { allowedSources: [OTHER_SRC] } }), "unselected-source");

  // Partial withdrawal: the fact remains, but one of its two declared
  // sources was withdrawn — support must not survive on the other alone.
  // Listing the source in allowedSources too proves withdrawal wins.
  push("multi-source", "observation-authority", "partial-withdrawal",
    "selection withdraws one of the two bound source digests (still listed in allowedSources)",
    multiInput({ selection: { allowedSources: [SRC, OTHER_SRC], withdrawn: [OTHER_SRC] } }),
    "withdrawn-source");

  // The proof node claims a source the bound fact never carried.
  {
    const tamperedNode: ProofNode = { kind: "fact", fact: factId(M1), sources: [SRC, WITHDRAWN_SRC] };
    const r = ruleNode(DIRECT, [pid(tamperedNode)]);
    push("multi-source", "observation-authority", "node-claims-extra-source",
      "proof node appends a source digest the digest-bound fact does not declare",
      multiInput({
        rows: [{ tuple: ["lib", "core"], proof: pid(r) }],
        proofs: { [pid(tamperedNode)]: tamperedNode, [pid(r)]: r },
      }), "fact-source-binding");
  }

  // Source order is part of the binding, not a set.
  {
    const reordered: ProofNode = { kind: "fact", fact: factId(M1), sources: [OTHER_SRC, SRC] };
    const r = ruleNode(DIRECT, [pid(reordered)]);
    push("multi-source", "observation-authority", "node-sources-reordered",
      "proof node lists the bound fact's sources in the opposite order",
      multiInput({
        rows: [{ tuple: ["lib", "core"], proof: pid(r) }],
        proofs: { [pid(reordered)]: reordered, [pid(r)]: r },
      }), "fact-source-binding");
  }

  /* ---------- proof identity ---------- */

  // A map key that is not its node's content digest (unreachable entry).
  push("chain", "proof-identity", "forged-unreferenced-key",
    "proofs map gains an entry whose key is not the digest of its node",
    chainInput({
      proofs: { ...CHAIN_PROOFS(), [FORGED]: factNode(F1) },
    }), "proof-id-not-content-digest");

  // The derivation resolves fully — but the row's cited key is forged.
  {
    const forgedNode = ruleNode(TRANSITIVE, [R1, P2]);
    push("chain", "proof-identity", "forged-referenced-key",
      "row cites a forged key whose node resolves correctly; content identity still fails",
      chainInput({
        rows: [{ tuple: ["app", "lexer"], proof: FORGED },
               { tuple: ["app", "parser"], proof: R1 }],
        proofs: { [FORGED]: forgedNode, [R1]: ruleNode(DIRECT, [P1]), [P1]: factNode(F1), [P2]: factNode(F2) },
      }), "proof-id-not-content-digest");
  }

  // A row cites a proof id absent from the map entirely.
  push("chain", "proof-identity", "unknown-proof",
    "row cites a proof id that is not a key in the proofs map",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: R2 },
             { tuple: ["app", "parser"], proof: FORGED }],
    }), "unknown-proof");

  // A well-formed node that no row reaches: seeding evidence the claim
  // never used. The extra fact is a snapshot member, so the node itself is
  // honest — it simply is not part of any row's support. With a third base
  // fact the fixpoint gains affects(tools,misc): derivedFacts 4.
  {
    const extra: Fact = { relation: "depends", tuple: ["tools", "misc"], sources: [SRC] };
    push("chain", "proof-identity", "dangling-proof",
      "proofs map carries a reachable-from-nothing fact node",
      chainInput({
        snap: snapshot([F1, F2, extra]),
        counts: { rounds: 3, baseFacts: 3, derivedFacts: 4 },
        proofs: { ...CHAIN_PROOFS(), [pid(factNode(extra))]: factNode(extra) },
      }), "dangling-proof");
  }

  /* ---------- cyclic self-support ---------- */

  {
    const cyclic: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [FORGED] };
    push("chain", "cycle", "self-loop",
      "a rule node's premise list contains its own key",
      chainInput({
        rows: [{ tuple: ["app", "lexer"], proof: R2 },
               { tuple: ["app", "parser"], proof: FORGED }],
        proofs: { ...CHAIN_PROOFS(), [FORGED]: cyclic },
      }), "proof-cycle");
  }
  {
    const nodeA: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [FORGED_2] };
    const nodeB: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [FORGED] };
    push("chain", "cycle", "two-node",
      "two rule nodes cite each other as premises",
      chainInput({
        rows: [{ tuple: ["app", "lexer"], proof: R2 },
               { tuple: ["app", "parser"], proof: FORGED }],
        proofs: { ...CHAIN_PROOFS(), [FORGED]: nodeA, [FORGED_2]: nodeB },
      }), "proof-cycle");
  }
  {
    const nodeA: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [FORGED_2] };
    const nodeB: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [FORGED_3] };
    const nodeC: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [FORGED] };
    push("chain", "cycle", "three-node",
      "three rule nodes form a support cycle a→b→c→a",
      chainInput({
        rows: [{ tuple: ["app", "lexer"], proof: R2 },
               { tuple: ["app", "parser"], proof: FORGED }],
        proofs: { ...CHAIN_PROOFS(), [FORGED]: nodeA, [FORGED_2]: nodeB, [FORGED_3]: nodeC },
      }), "proof-cycle");
  }
  {
    // The cycle sits behind an honest prefix: premise 0 (R1) resolves to
    // affects(app,parser), premise 1 enters the loop.
    const loop: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [FORGED_3] };
    const cycNode: ProofNode = { kind: "rule", rule: ruleId(TRANSITIVE), premises: [R1, FORGED_3] };
    push("chain", "cycle", "behind-prefix",
      "a rule node's first premise is honest and its second premise's support loops back",
      chainInput({
        rows: [{ tuple: ["app", "lexer"], proof: pid(cycNode) },
               { tuple: ["app", "parser"], proof: R1 }],
        proofs: { ...CHAIN_PROOFS(), [pid(cycNode)]: cycNode, [FORGED_3]: loop },
      }), "proof-cycle");
  }

  /* ---------- off-by-one iteration bounds ---------- */

  // Envelope counters one off the recomputed fixpoint in each direction.
  for (const [field, up] of [["rounds", 1], ["rounds", -1], ["derivedFacts", 1],
    ["derivedFacts", -1], ["baseFacts", 1], ["baseFacts", -1]] as const) {
    const counts: Counts = { ...CHAIN_COUNTS, [field]: CHAIN_COUNTS[field] + up };
    push("chain", "iteration-bound", `${field}${up > 0 ? "-plus-one" : "-minus-one"}`,
      `claimed ${field} is off by one (${CHAIN_COUNTS[field]} → ${counts[field]})`,
      chainInput({ counts }), "result-binding");
  }

  // The program's own limits shrink below what the honest fixpoint needs:
  // the claim stays internally consistent yet is unprovable complete. The
  // claimed counters stay inside the mutated limits so the rejection comes
  // from the independent evaluation, not envelope admission.
  push("chain", "iteration-bound", "program-maxRounds-minus-one",
    "program maxRounds lowered to 2 while the fixpoint needs 3 iterations",
    chainInput({
      prog: program([DIRECT, TRANSITIVE], lit("affects", ["app", v("target")]), { maxRounds: 2 }),
      counts: { rounds: 2, baseFacts: 2, derivedFacts: 3 },
    }), "completeness-not-established");

  push("chain", "iteration-bound", "program-maxDerived-minus-one",
    "program maxDerived lowered to 2 while the fixpoint derives 3 tuples",
    chainInput({
      prog: program([DIRECT, TRANSITIVE], lit("affects", ["app", v("target")]), { maxDerived: 2 }),
      counts: { rounds: 3, baseFacts: 2, derivedFacts: 2 },
    }), "completeness-not-established");

  push("chain", "iteration-bound", "program-maxBindings-under-width",
    "program maxBindings lowered to 1 while the direct rule joins 2 candidates",
    chainInput({
      prog: program([DIRECT, TRANSITIVE], lit("affects", ["app", v("target")]), { maxBindings: 1 }),
    }), "completeness-not-established");

  // The row cap admits the claim (1 row ≤ maxRows 1) but cannot cover the
  // fixpoint answer of 2 — completeness, not admission, rejects it.
  push("chain", "iteration-bound", "program-maxRows-minus-one",
    "program maxRows lowered to 1 and the claim drops to one row; the fixpoint has 2 answers",
    chainInput({
      prog: program([DIRECT, TRANSITIVE], lit("affects", ["app", v("target")]), { maxRows: 1 }),
      rows: [{ tuple: ["app", "lexer"], proof: R2 }],
    }), "completeness-not-established");

  // Claimed work that exceeds the declared ceiling rejects at admission.
  {
    const input = chainInput();
    push("chain", "iteration-bound", "work-over-ceiling",
      "claimed work exceeds the declared maxWork ceiling by one",
      { ...input, claimed: { ...input.claimed, work: 250_001 } },
      "malformed-input");
  }

  /* ---------- row set ---------- */

  // Dropping the (app,parser) row leaves its support reachable through the
  // transitive row — the rejection comes from fixpoint completeness.
  push("chain", "row-set", "missing-row",
    "claim omits the (app,parser) answer row while its DAG stays shared via the transitive row",
    chainInput({ rows: [{ tuple: ["app", "lexer"], proof: R2 }] }), "missing-row");

  // The other direction: dropping the transitive row orphans its exclusive
  // proof nodes, so the reachability check rejects first.
  push("chain", "row-set", "dropped-row-orphans-proofs",
    "claim omits the (app,lexer) row, leaving its exclusive proof nodes unreachable",
    chainInput({ rows: [{ tuple: ["app", "parser"], proof: R1 }] }), "dangling-proof");

  // On the shared-premise DAG, dropping the composed row and its now-
  // unreachable node leaves an incomplete answer set.
  {
    const proofs = DAG_PROOFS();
    delete proofs[CC];
    push("dag", "row-set", "missing-row-dag",
      "claim omits the path(a,c) row and its cat proof node",
      dagInput({
        rows: [{ tuple: ["a", "b"], proof: H1 },
               { tuple: ["b", "c"], proof: H2 }],
        proofs,
      }), "missing-row");
  }

  push("chain", "row-set", "row-order",
    "rows listed in reverse canonical order",
    chainInput({
      rows: [{ tuple: ["app", "parser"], proof: R1 },
             { tuple: ["app", "lexer"], proof: R2 }],
    }), "row-order");

  push("chain", "row-set", "duplicate-row",
    "the same row tuple appears twice",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: R2 },
             { tuple: ["app", "lexer"], proof: R2 },
             { tuple: ["app", "parser"], proof: R1 }],
    }), "row-order");

  // A row that cannot instantiate the query's constant position.
  push("chain", "row-set", "row-violates-query-constant",
    "row (parser,lexer) does not match query affects(\"app\", target)",
    chainInput({
      rows: [{ tuple: ["app", "lexer"], proof: R2 },
             { tuple: ["app", "parser"], proof: R1 },
             { tuple: ["parser", "lexer"], proof: R1 }],
    }), "row-not-matching-query");

  // A row tuple whose arity cannot match the query literal.
  push("chain", "row-set", "row-arity-mismatch",
    "row (app) has arity 1 against the 2-column query",
    chainInput({
      rows: [{ tuple: ["app"], proof: R2 },
             { tuple: ["app", "lexer"], proof: R2 },
             { tuple: ["app", "parser"], proof: R1 }],
    }), "row-not-matching-query");

  /* ---------- envelope identity ---------- */

  {
    const input = chainInput();
    push("chain", "envelope-identity", "snapshot-digest",
      "claimed snapshot digest names a different document",
      { ...input, claimed: { ...input.claimed, snapshot: FORGED } }, "snapshot-digest-mismatch");
  }
  {
    const input = chainInput();
    push("chain", "envelope-identity", "program-digest",
      "claimed program digest names a different document",
      { ...input, claimed: { ...input.claimed, program: FORGED } }, "program-digest-mismatch");
  }

  return out;
}

export const MUTATION_CASES: MutationCase[] = catalog();

/** Mutations the checker *contractually accepts* — recorded so the boundary
 *  is explicit rather than discovered by accident later. `claimed.work` is
 *  range-checked against maxWork but never recomputed (see the checker's
 *  SCOPE.md "work accounting is not modeled"), so a different in-range value
 *  must still verify. */
export interface SurvivorCase {
  readonly id: string;
  readonly mutation: string;
  readonly input: Input;
}
export const SURVIVOR_CASES: SurvivorCase[] = [
  {
    id: "chain.envelope.work-in-range",
    mutation: "claimed work replaced by another value inside maxWork — the contract range-checks but does not recompute it",
    input: (() => {
      const input = chainInput();
      return { ...input, claimed: { ...input.claimed, work: 12_345 } };
    })(),
  },
];

/** Execute the whole catalog and report per-case verdicts. A mutant counts
 *  as caught only when the checker rejects it with the declared reason —
 *  a crash or a different reason is reported, not smoothed over. */
export function runMutationSuite(cases: MutationCase[] = MUTATION_CASES) {
  const baseline = BASES.map(b => ({
    id: b.id,
    verdict: checkQueryResult(b.input) as Verdict,
  }));
  const results = cases.map(c => {
    const verdict = checkQueryResult(c.input) as Verdict;
    return {
      id: c.id,
      class: c.class,
      expect: c.expect,
      caught: verdict.accept === false && verdict.reason === c.expect,
      detail: verdict.accept ? "unexpectedly accepted" : verdict.detail,
    };
  });
  return {
    suite: "memory-mutation" as const,
    basesAccepted: baseline.every(b => b.verdict.accept === true),
    total: results.length,
    caught: results.filter(r => r.caught).length,
    cases: results,
  };
}
