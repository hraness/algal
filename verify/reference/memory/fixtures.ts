/** Deterministic fixture inventory for the independent memory derivation
 *  checker. Proof graphs are constructed by hand; content digests bind node
 *  identity exactly as the contract specifies (sha256 over canonical text). */
import {
  digestDocument, type Atom, type Fact, type Json, type Literal,
  type ProofNode, type Program, type Rule, type Snapshot,
} from "./checker";

export const source = (name: string): string => digestDocument(name as Json);
export const factId = (f: Fact): string =>
  digestDocument({ relation: f.relation, tuple: f.tuple, sources: f.sources } as unknown as Json);
export const ruleId = (r: Rule): string =>
  digestDocument({ id: r.id, head: r.head, body: r.body } as unknown as Json);
export const factNode = (f: Fact): ProofNode =>
  ({ kind: "fact", fact: factId(f), sources: f.sources });
export const ruleNode = (r: Rule, premises: string[]): ProofNode =>
  ({ kind: "rule", rule: ruleId(r), premises });
export const pid = (n: ProofNode): string => digestDocument(n as unknown as Json);

export const lit = (relation: string, terms: (Atom | { var: string })[]): Literal =>
  ({ relation, terms });
export const v = (name: string): { var: string } => ({ var: name });

export function snapshot(facts: Fact[]): Snapshot {
  return { contract: "algal.memory.v1", facts };
}
export function program(rules: Rule[], query: Literal,
    limits?: Partial<Program["limits"]>): Program {
  const p: Program = {
    contract: "algal.query.v1", rules, query,
    limits: { maxWork: 250_000, maxRounds: 32, maxDerived: 4096,
      maxBindings: 4096, maxRows: 256, maxOutputBytes: 262_144 },
  };
  if (limits) Object.assign(p.limits, limits);
  return p;
}
export interface Counts { work?: number; rounds: number; baseFacts: number; derivedFacts: number }
export function claimed(snap: Snapshot, prog: Program,
    rows: { tuple: Atom[]; proof: string }[], proofs: Record<string, ProofNode>,
    counts: Counts) {
  return {
    contract: "algal.query-result.v1" as const,
    snapshot: digestDocument(snap as unknown as Json),
    program: digestDocument(prog as unknown as Json),
    complete: true as const,
    witnessPolicy: "first-canonical-derivation" as const,
    rows, proofs,
    work: counts.work ?? 0, rounds: counts.rounds,
    baseFacts: counts.baseFacts, derivedFacts: counts.derivedFacts,
  };
}
export interface NamedFixture {
  id: string;
  input: { snapshot: unknown; program: unknown; claimed: unknown; selection?: unknown };
  expect: { accept: true; rows?: number } | { accept: false; reason: string };
}

/* The shared example mirrors crates/algal/src/memory.rs::fixture: a two-hop
 * dependency chain closed under direct and transitive affect rules. */
const SRC = source("observed dependencies");
const f1: Fact = { relation: "depends", tuple: ["app", "parser"], sources: [SRC] };
const f2: Fact = { relation: "depends", tuple: ["parser", "lexer"], sources: [SRC] };
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
const baseProgram = () =>
  program([DIRECT, TRANSITIVE], lit("affects", ["app", v("target")]));
const baseSnapshot = () => snapshot([f1, f2]);

const P1 = pid(factNode(f1)), P2 = pid(factNode(f2));
const R1 = pid(ruleNode(DIRECT, [P1]));                 // affects(app,parser)
const R2 = pid(ruleNode(TRANSITIVE, [R1, P2]));         // affects(app,lexer)

function baseProofs(): Record<string, ProofNode> {
  return {
    [P1]: factNode(f1), [P2]: factNode(f2),
    [R1]: ruleNode(DIRECT, [P1]), [R2]: ruleNode(TRANSITIVE, [R1, P2]),
  };
}
/** Canonical row order: canonical(["app","lexer"]) < canonical(["app","parser"]). */
function baseRows() {
  return [
    { tuple: ["app", "lexer"] as Atom[], proof: R2 },
    { tuple: ["app", "parser"] as Atom[], proof: R1 },
  ];
}
/** rounds: R1 adds affects(app,parser) and affects(parser,lexer); R2 adds
 *  affects(app,lexer); R3 empty. derivedFacts counts every derived tuple,
 *  including the unqueried affects(parser,lexer). */
const BASE_COUNTS: Counts = { rounds: 3, baseFacts: 2, derivedFacts: 3 };

export function fixtures(): NamedFixture[] {
  const all: NamedFixture[] = [];
  const add = (id: string,
      parts: { snapshot?: unknown; program?: unknown; claimed?: unknown; selection?: unknown },
      expect: NamedFixture["expect"]) => {
    const snap = parts.snapshot ?? baseSnapshot();
    const prog = parts.program ?? baseProgram();
    all.push({
      id,
      input: {
        snapshot: snap, program: prog,
        claimed: parts.claimed ?? claimed(snap as Snapshot, prog as Program, baseRows(), baseProofs(), BASE_COUNTS),
        ...(parts.selection !== undefined ? { selection: parts.selection } : {}),
      },
      expect,
    });
  };
  const mutateProofs = (f: (m: Record<string, ProofNode>) => void) => {
    const m = baseProofs(); f(m); return m;
  };

  /* ---------- accepted derivations ---------- */

  add("transitive-chain-accepts", {}, { accept: true, rows: 2 });

  // A single-level derivation and a query literal with a leading constant.
  {
    const snap = snapshot([
      { relation: "depends", tuple: ["a", "b"], sources: [SRC] },
      { relation: "depends", tuple: ["a", "c"], sources: [SRC] },
      { relation: "depends", tuple: ["d", "e"], sources: [SRC] },
    ]);
    const rule: Rule = {
      id: "of-a", head: lit("reaches", [v("y")]),
      body: [lit("depends", ["a", v("y")])],
    };
    const prog = program([rule], lit("reaches", [v("w")]));
    const fb = snap.facts[0]!, fc = snap.facts[1]!;
    const pb = pid(factNode(fb)), pc = pid(factNode(fc));
    const rb = pid(ruleNode(rule, [pb])), rc = pid(ruleNode(rule, [pc]));
    const rows = [
      { tuple: ["b"] as Atom[], proof: rb },
      { tuple: ["c"] as Atom[], proof: rc },
    ]; // canonical(["b"]) < canonical(["c"])
    const proofs = {
      [pb]: factNode(fb), [pc]: factNode(fc),
      [rb]: ruleNode(rule, [pb]), [rc]: ruleNode(rule, [pc]),
    };
    add("constant-in-body-accepts", {
      snapshot: snap, program: prog,
      claimed: claimed(snap, prog, rows, proofs, { rounds: 2, baseFacts: 3, derivedFacts: 2 }),
    }, { accept: true, rows: 2 });
  }

  // Repeated variable inside one literal: depends(x,x) matches only loops.
  {
    const snap = snapshot([
      { relation: "depends", tuple: ["l", "l"], sources: [SRC] },
      { relation: "depends", tuple: ["m", "n"], sources: [SRC] },
    ]);
    const rule: Rule = {
      id: "loops", head: lit("loops", [v("x")]), body: [lit("depends", [v("x"), v("x")])],
    };
    const prog = program([rule], lit("loops", [v("x")]));
    const fl = snap.facts[0]!;
    const pl = pid(factNode(fl));
    const rl = pid(ruleNode(rule, [pl]));
    const proofs = { [pl]: factNode(fl), [rl]: ruleNode(rule, [pl]) };
    add("repeated-variable-accepts", {
      snapshot: snap, program: prog,
      claimed: claimed(snap, prog, [{ tuple: ["l"], proof: rl }], proofs,
        { rounds: 2, baseFacts: 2, derivedFacts: 1 }),
    }, { accept: true, rows: 1 });
  }

  // A shared base fact may support several derivations; the DAG is not a tree.
  {
    const snap = snapshot([
      { relation: "edge", tuple: ["a", "b"], sources: [SRC] },
      { relation: "edge", tuple: ["b", "c"], sources: [SRC] },
    ]);
    const hop: Rule = {
      id: "hop", head: lit("path", [v("x"), v("y")]), body: [lit("edge", [v("x"), v("y")])],
    };
    const cat: Rule = {
      id: "cat", head: lit("path", [v("x"), v("z")]),
      body: [lit("path", [v("x"), v("y")]), lit("edge", [v("y"), v("z")])],
    };
    const prog = program([hop, cat], lit("path", [v("x"), v("z")]));
    const e1 = snap.facts[0]!, e2 = snap.facts[1]!;
    const pe1 = pid(factNode(e1)), pe2 = pid(factNode(e2));
    const h1 = pid(ruleNode(hop, [pe1])), h2 = pid(ruleNode(hop, [pe2]));
    const cc = pid(ruleNode(cat, [h1, pe2]));
    const proofs = {
      [pe1]: factNode(e1), [pe2]: factNode(e2),
      [h1]: ruleNode(hop, [pe1]), [h2]: ruleNode(hop, [pe2]),
      [cc]: ruleNode(cat, [h1, pe2]),
    };
    // Canonical order of ["a","b"],["a","c"],["b","c"]:
    const rows = [
      { tuple: ["a", "b"] as Atom[], proof: h1 },
      { tuple: ["a", "c"] as Atom[], proof: cc },
      { tuple: ["b", "c"] as Atom[], proof: h2 },
    ];
    add("shared-premise-dag-accepts", {
      snapshot: snap, program: prog,
      claimed: claimed(snap, prog, rows, proofs, { rounds: 3, baseFacts: 2, derivedFacts: 3 }),
    }, { accept: true, rows: 3 });
  }

  // Duplicate base facts collapse: the record with the smaller fact digest
  // wins the canonical seeding order, so its proof is the only legal witness.
  {
    const other = source("second observation");
    const dupA: Fact = { relation: "depends", tuple: ["a", "b"], sources: [SRC] };
    const dupB: Fact = { relation: "depends", tuple: ["a", "b"], sources: [other] };
    const first = factId(dupA) < factId(dupB) ? dupA : dupB;
    const snap = snapshot([dupB, dupA]); // declaration order irrelevant
    const pf = pid(factNode(first));
    const rf = pid(ruleNode(DIRECT, [pf]));
    const proofs = { [pf]: factNode(first), [rf]: ruleNode(DIRECT, [pf]) };
    add("duplicate-fact-canonical-seed-accepts", {
      snapshot: snap,
      program: program([DIRECT], lit("affects", [v("x"), v("y")])),
      claimed: claimed(snap, program([DIRECT], lit("affects", [v("x"), v("y")])),
        [{ tuple: ["a", "b"], proof: rf }], proofs,
        { rounds: 2, baseFacts: 1, derivedFacts: 1 }),
    }, { accept: true, rows: 1 });
  }

  // Empty answer: no rule fires, rows empty, proofs map empty.
  {
    const snap = snapshot([{ relation: "depends", tuple: ["x", "y"], sources: [SRC] }]);
    const prog = program([TRANSITIVE], lit("affects", [v("x"), v("z")]));
    add("empty-answer-accepts", {
      snapshot: snap, program: prog,
      claimed: claimed(snap, prog, [], {}, { rounds: 1, baseFacts: 1, derivedFacts: 0 }),
    }, { accept: true, rows: 0 });
  }

  // limits may be omitted entirely (contract defaults apply).
  {
    const snap = snapshot([{ relation: "depends", tuple: ["a", "b"], sources: [SRC] }]);
    const prog = program([DIRECT], lit("affects", [v("x"), v("y")]));
    delete (prog as unknown as Record<string, unknown>).limits;
    const fa = snap.facts[0]!;
    const pa = pid(factNode(fa));
    const ra = pid(ruleNode(DIRECT, [pa]));
    const proofs = { [pa]: factNode(fa), [ra]: ruleNode(DIRECT, [pa]) };
    add("default-limits-accept", {
      snapshot: snap, program: prog,
      claimed: claimed(snap, prog, [{ tuple: ["a", "b"], proof: ra }], proofs,
        { rounds: 2, baseFacts: 1, derivedFacts: 1 }),
    }, { accept: true, rows: 1 });
  }

  /* ---------- rejections: proof-DAG integrity ---------- */

  // Premises listed in the wrong order: the first premise concludes
  // depends(parser,lexer), which cannot satisfy affects(x,y) — a fabricated
  // support chain, not merely a reordering mistake.
  add("fabricated-premise-order-rejects", {
    claimed: (() => {
      const bad: ProofNode = { kind: "rule", rule: ruleId(TRANSITIVE), premises: [P2, R1] };
      const badId = pid(bad);
      return claimed(baseSnapshot(), baseProgram(),
        [{ tuple: ["app", "lexer"], proof: badId }, { tuple: ["app", "parser"], proof: R1 }],
        mutateProofs(m => { m[badId] = bad; delete m[R2]; }), BASE_COUNTS);
    })(),
  }, { accept: false, reason: "substitution-mismatch" });

  // Self-loop and two-node cycle both reject. Under content-digest identity a
  // cycle cannot have every key equal its node's digest, so the cycle check
  // runs on the admitted map before content binding is enforced.
  {
    const cId = "sha256:" + "c1".repeat(32);
    const cyclic: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [cId] };
    add("self-cycle-rejects", {
      claimed: claimed(baseSnapshot(), baseProgram(),
        [{ tuple: ["app", "parser"], proof: cId }],
        { [cId]: cyclic, [P1]: factNode(f1), [P2]: factNode(f2) }, BASE_COUNTS),
    }, { accept: false, reason: "proof-cycle" });
  }
  {
    const aId = "sha256:" + "a1".repeat(32);
    const bId = "sha256:" + "b2".repeat(32);
    const nodeA: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [bId] };
    const nodeB: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [aId] };
    add("two-node-cycle-rejects", {
      claimed: claimed(baseSnapshot(), baseProgram(),
        [{ tuple: ["app", "parser"], proof: aId }],
        { [aId]: nodeA, [bId]: nodeB, [P1]: factNode(f1), [P2]: factNode(f2) }, BASE_COUNTS),
    }, { accept: false, reason: "proof-cycle" });
  }

  // A fact leaf whose digest is not among the selected snapshot's facts.
  {
    const ghost: Fact = { relation: "depends", tuple: ["app", "zz"], sources: [SRC] };
    const ghostNode = factNode(ghost);
    const gId = pid(ghostNode);
    const r = ruleNode(DIRECT, [gId]);
    const rId = pid(r);
    add("fact-outside-snapshot-rejects", {
      claimed: claimed(baseSnapshot(), baseProgram(),
        [...baseRows(), { tuple: ["app", "zz"], proof: rId }],
        { ...baseProofs(), [gId]: ghostNode, [rId]: r }, BASE_COUNTS),
    }, { accept: false, reason: "fact-not-selected" });
  }

  // The fact exists, but the proof node lists different sources than the
  // digest-bound snapshot record carries.
  {
    const wrongSources: ProofNode = { kind: "fact", fact: factId(f1), sources: [source("elsewhere")] };
    const wId = pid(wrongSources);
    const r = ruleNode(DIRECT, [wId]);
    const rId = pid(r);
    add("fact-source-binding-rejects", {
      claimed: claimed(baseSnapshot(), baseProgram(),
        [{ tuple: ["app", "parser"], proof: rId }],
        { [wId]: wrongSources, [rId]: r }, BASE_COUNTS),
    }, { accept: false, reason: "fact-source-binding" });
  }

  // Stale/withdrawn support: the derivation's terminal fact cites an
  // observation the selection declared withdrawn or never admitted.
  add("withdrawn-observation-rejects", {
    selection: { withdrawn: [SRC] },
  }, { accept: false, reason: "withdrawn-source" });
  add("unselected-observation-rejects", {
    selection: { allowedSources: [source("other-scope")] },
  }, { accept: false, reason: "unselected-source" });
  add("declared-sources-accept", {
    selection: { allowedSources: [SRC], withdrawn: [source("old")] },
  }, { accept: true, rows: 2 });

  // Constant-position substitution conflict: premise depends(b,y) cannot
  // satisfy depends(a,y).
  {
    const snap = snapshot([{ relation: "depends", tuple: ["b", "c"], sources: [SRC] }]);
    const rule: Rule = {
      id: "of-a", head: lit("reaches", [v("y")]), body: [lit("depends", ["a", v("y")])],
    };
    const prog = program([rule], lit("reaches", [v("w")]));
    const fb = snap.facts[0]!;
    const pb = pid(factNode(fb));
    const r = ruleNode(rule, [pb]);
    const rId = pid(r);
    add("substitution-conflict-rejects", {
      snapshot: snap, program: prog,
      claimed: claimed(snap, prog, [{ tuple: ["c"], proof: rId }],
        { [pb]: factNode(fb), [rId]: r }, { rounds: 2, baseFacts: 1, derivedFacts: 0 }),
    }, { accept: false, reason: "substitution-mismatch" });
  }

  // The proof DAG resolves, but to a different tuple than the row claims.
  add("conclusion-mismatch-tuple-rejects", {
    claimed: claimed(baseSnapshot(), baseProgram(),
      [{ tuple: ["app", "lexer"], proof: R2 },
       { tuple: ["app", "parser"], proof: R2 }],   // R2 concludes lexer, not parser
      baseProofs(), BASE_COUNTS),
  }, { accept: false, reason: "conclusion-mismatch" });

  // A rule proof naming a rule that is not in the program.
  {
    const foreign: Rule = {
      id: "foreign", head: lit("affects", [v("x"), v("y")]),
      body: [lit("depends", [v("x"), v("y")])],
    };
    const r = ruleNode(foreign, [P1]);
    const rId = pid(r);
    add("rule-outside-program-rejects", {
      claimed: claimed(baseSnapshot(), baseProgram(),
        [{ tuple: ["app", "lexer"], proof: R2 }, { tuple: ["app", "parser"], proof: rId }],
        mutateProofs(m => { m[rId] = r; }), BASE_COUNTS),
    }, { accept: false, reason: "rule-not-in-program" });
  }

  // Premise count must equal the body length of the digest-bound rule.
  {
    const r = ruleNode(DIRECT, [P1, P2]);
    const rId = pid(r);
    add("premise-count-mismatch-rejects", {
      claimed: claimed(baseSnapshot(), baseProgram(),
        [{ tuple: ["app", "lexer"], proof: R2 }, { tuple: ["app", "parser"], proof: rId }],
        mutateProofs(m => { m[rId] = r; }), BASE_COUNTS),
    }, { accept: false, reason: "premise-count-mismatch" });
  }

  // A proofs-map key that is not the content digest of its node.
  {
    const fake = "sha256:" + "ab".repeat(32);
    add("forged-proof-id-rejects", {
      claimed: claimed(baseSnapshot(), baseProgram(), baseRows(),
        mutateProofs(m => { m[fake] = { kind: "fact", fact: factId(f1), sources: [SRC] }; }),
        BASE_COUNTS),
    }, { accept: false, reason: "proof-id-not-content-digest" });
  }

  // A proof node unreachable from every row must not be present.
  {
    const stray: ProofNode = {
      kind: "fact",
      fact: factId({ relation: "depends", tuple: ["z", "z"], sources: [SRC] }),
      sources: [SRC],
    };
    add("dangling-proof-rejects", {
      claimed: claimed(baseSnapshot(), baseProgram(), baseRows(),
        mutateProofs(m => { m[pid(stray)] = stray; }), BASE_COUNTS),
    }, { accept: false, reason: "dangling-proof" });
  }

  // Row cites a proof id absent from the map.
  {
    const missing = "sha256:" + "cd".repeat(32);
    add("unknown-proof-rejects", {
      claimed: claimed(baseSnapshot(), baseProgram(),
        [{ tuple: ["app", "lexer"], proof: R2 }, { tuple: ["app", "parser"], proof: missing }],
        baseProofs(), BASE_COUNTS),
    }, { accept: false, reason: "unknown-proof" });
  }

  /* ---------- rejections: result envelope and answer set ---------- */

  add("snapshot-digest-mismatch-rejects", {
    claimed: {
      ...claimed(baseSnapshot(), baseProgram(), baseRows(), baseProofs(), BASE_COUNTS),
      snapshot: "sha256:" + "00".repeat(32),
    },
  }, { accept: false, reason: "snapshot-digest-mismatch" });

  add("row-order-rejects", {
    claimed: claimed(baseSnapshot(), baseProgram(),
      [{ tuple: ["app", "parser"], proof: R1 }, { tuple: ["app", "lexer"], proof: R2 }],
      baseProofs(), BASE_COUNTS),
  }, { accept: false, reason: "row-order" });

  // The row tuple cannot instantiate the query literal's constant position.
  add("row-violates-query-rejects", {
    claimed: claimed(baseSnapshot(), baseProgram(),
      [{ tuple: ["app", "lexer"], proof: R2 }, { tuple: ["parser", "app"], proof: R1 }],
      baseProofs(), BASE_COUNTS),
  }, { accept: false, reason: "row-not-matching-query" });

  // A derivable row omitted from the claim; the remaining proof DAG is still
  // internally consistent, so the rejection must come from fixpoint
  // completeness rather than a dangling premise.
  add("missing-row-rejects", {
    claimed: claimed(baseSnapshot(), baseProgram(),
      [{ tuple: ["app", "lexer"], proof: R2 }],
      baseProofs(), BASE_COUNTS),
  }, { accept: false, reason: "missing-row" });

  // A valid-but-later witness violates first-canonical-derivation.
  {
    const copy: Rule = {
      id: "zz-copy", head: lit("affects", [v("x"), v("y")]),
      body: [lit("depends", [v("x"), v("y")])],
    };
    const prog = program([DIRECT, TRANSITIVE, copy], lit("affects", ["app", v("target")]));
    const alt = ruleNode(copy, [P1]);
    const altId = pid(alt);
    add("noncanonical-witness-rejects", {
      program: prog,
      claimed: claimed(baseSnapshot(), prog,
        [{ tuple: ["app", "lexer"], proof: R2 }, { tuple: ["app", "parser"], proof: altId }],
        { ...baseProofs(), [altId]: alt }, BASE_COUNTS),
    }, { accept: false, reason: "witness-not-canonical-first" });
  }

  /* ---------- rejections: exhaustion and admission ---------- */

  // The claim says complete, but the declared limits cannot establish the
  // fixpoint: three derived tuples against maxDerived 1; a fixpoint reached
  // after three rounds against maxRounds 1. Claimed counters stay inside the
  // bounds so the rejection comes from the independent evaluation.
  {
    const prog = program([DIRECT, TRANSITIVE], lit("affects", ["app", v("target")]),
      { maxDerived: 1 });
    add("derived-bound-exhaustion-rejects", {
      program: prog,
      claimed: claimed(baseSnapshot(), prog, baseRows(), baseProofs(),
        { rounds: 1, baseFacts: 2, derivedFacts: 1 }),
    }, { accept: false, reason: "completeness-not-established" });
  }
  {
    const prog = program([DIRECT, TRANSITIVE], lit("affects", ["app", v("target")]),
      { maxRounds: 1 });
    add("rounds-bound-exhaustion-rejects", {
      program: prog,
      claimed: claimed(baseSnapshot(), prog, baseRows(), baseProofs(),
        { rounds: 1, baseFacts: 2, derivedFacts: 3 }),
    }, { accept: false, reason: "completeness-not-established" });
  }
  // Proof graph exceeding the admitted node bound rejects at admission.
  {
    const proofs = baseProofs();
    add("proof-map-bound-rejects", {
      claimed: (() => {
        const c = claimed(baseSnapshot(), baseProgram(), baseRows(), proofs, BASE_COUNTS);
        for (let i = 0; i < 8192; i++)
          proofs["sha256:" + i.toString(16).padStart(4, "0") + "f".repeat(60)] = factNode(f1);
        return c;
      })(),
    }, { accept: false, reason: "malformed-input" });
  }
  // Admission failures: unsafe rule, missing sources, unknown key.
  {
    const bad = program(
      [{ ...DIRECT, head: lit("affects", [v("x"), v("unbound")]) }, TRANSITIVE],
      lit("affects", ["app", v("target")]));
    add("unsafe-rule-admission-rejects", { program: bad }, { accept: false, reason: "malformed-input" });
    const snap = { contract: "algal.memory.v1", facts: [{ relation: "depends", tuple: ["a"], sources: [] }] };
    add("source-free-fact-admission-rejects", { snapshot: snap }, { accept: false, reason: "malformed-input" });
    const extra = { ...baseSnapshot(), bogus: true };
    add("unknown-key-admission-rejects", { snapshot: extra }, { accept: false, reason: "malformed-input" });
  }

  // Envelope counters inconsistent with the snapshot/fixpoint reject.
  add("wrong-base-facts-rejects", {
    claimed: claimed(baseSnapshot(), baseProgram(), baseRows(), baseProofs(),
      { rounds: 3, baseFacts: 1, derivedFacts: 2 }),
  }, { accept: false, reason: "result-binding" });
  add("wrong-rounds-rejects", {
    claimed: claimed(baseSnapshot(), baseProgram(), baseRows(), baseProofs(),
      { rounds: 2, baseFacts: 2, derivedFacts: 2 }),
  }, { accept: false, reason: "result-binding" });

  return all;
}
