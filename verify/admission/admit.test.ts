/**
 * `verify/admission` — executable correspondence for `Algal.Admission`.
 *
 * The fixture mirrors the Lean witness (`Theorems.lean` `Witness` section)
 * on the Phase-11 base example: two `depends` facts, `direct`/`transitive`
 * rules producing `affects`, and a proof DAG over the same shape. Each test
 * pairs a mutation with the model-level rejection it corresponds to.
 */
import { describe, expect, test } from "bun:test";
import {
  digestDocument, type Atom, type Fact, type Json, type ProofNode,
  type Program, type Rule, type Snapshot,
} from "../reference/memory/checker";
import {
  claimed, factNode, lit, pid, program, ruleId, ruleNode, snapshot, source, v,
} from "../reference/memory/fixtures";
import {
  admitResult, type AdmissionClaim, type AdmissionContext,
} from "./admit";

/* ---------- shared fixture (the Lean `Witness` program) ---------- */

const SRC = source("observed dependencies");
const SRC2 = source("supplemental observation");

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

const SNAP: Snapshot = snapshot([f1, f2]);
const PROG: Program = program([DIRECT, TRANSITIVE], lit("affects", ["app", v("target")]));

const P1 = pid(factNode(f1)), P2 = pid(factNode(f2));
const R1 = pid(ruleNode(DIRECT, [P1]));
const R2 = pid(ruleNode(TRANSITIVE, [R1, P2]));

const proofs = (): Record<string, ProofNode> => ({
  [P1]: factNode(f1), [P2]: factNode(f2),
  [R1]: ruleNode(DIRECT, [P1]), [R2]: ruleNode(TRANSITIVE, [R1, P2]),
});
const ROWS: { tuple: Atom[]; proof: string }[] = [
  { tuple: ["app", "lexer"], proof: R2 },
  { tuple: ["app", "parser"], proof: R1 },
];
const BASE_COUNTS = { rounds: 3, baseFacts: 2, derivedFacts: 3 };
const RESULT = () => claimed(SNAP, PROG, ROWS, proofs(), BASE_COUNTS);

const CTX: AdmissionContext = {
  snapshot: SNAP as unknown as Json,
  program: PROG as unknown as Json,
  host: "host-alpha", engine: "engine-1",
};

/** Bind a claim to a context the way `Claim.binds` does in the model. */
const bind = (ctx: AdmissionContext, result: unknown): AdmissionClaim => ({
  snapshot: digestDocument(ctx.snapshot),
  program: digestDocument(ctx.program),
  host: ctx.host, engine: ctx.engine, result,
});

const CLAIM: AdmissionClaim = bind(CTX, RESULT());

describe("admission authority", () => {
  test("baseline claim admits (model: admit = true)", () => {
    expect(admitResult(CTX, CLAIM)).toEqual({ accept: true, rows: 2 });
  });

  test("admitted claim re-presents under the same context", () => {
    // admit_context_unique: the admitting context is the unique bound one.
    expect(admitResult(CTX, CLAIM).accept).toBe(true);
  });

  test("changed snapshot rejects (admit_snapshot_changed_rejects)", () => {
    const ctx2: AdmissionContext = {
      ...CTX, snapshot: snapshot([f1]) as unknown as Json,
    };
    expect(admitResult(ctx2, CLAIM))
      .toMatchObject({ accept: false, reason: "snapshot-identity-mismatch" });
  });

  test("changed program rejects (admit_rules_changed_rejects)", () => {
    const ctx2: AdmissionContext = {
      ...CTX, program: program([DIRECT], lit("affects", ["app", v("target")])) as unknown as Json,
    };
    expect(admitResult(ctx2, CLAIM))
      .toMatchObject({ accept: false, reason: "program-identity-mismatch" });
  });

  test("authority non-transfer: changed host rejects (admit_host_changed_rejects)", () => {
    expect(admitResult({ ...CTX, host: "host-beta" }, CLAIM))
      .toMatchObject({ accept: false, reason: "host-identity-mismatch" });
  });

  test("authority non-transfer: changed engine rejects (admit_engine_changed_rejects)", () => {
    expect(admitResult({ ...CTX, engine: "engine-2" }, CLAIM))
      .toMatchObject({ accept: false, reason: "engine-identity-mismatch" });
  });

  test("claim-side host binding does not transfer either", () => {
    expect(admitResult(CTX, { ...CLAIM, host: "host-beta" }))
      .toMatchObject({ accept: false, reason: "host-identity-mismatch" });
  });

  test("forged claim digest rejects", () => {
    expect(admitResult(CTX, { ...CLAIM, snapshot: "sha256:" + "00".repeat(32) }))
      .toMatchObject({ accept: false, reason: "snapshot-identity-mismatch" });
  });
});

describe("frontier semantics", () => {
  test("frontier extension re-admits the re-bound claim (admission_extends)", () => {
    // `note` enters no rule body: the fixpoint is unchanged, baseFacts grows.
    const note: Fact = { relation: "note", tuple: ["x"], sources: [SRC2] };
    const snapX = snapshot([f1, f2, note]);
    const ctxX: AdmissionContext = { ...CTX, snapshot: snapX as unknown as Json };
    const resultX = claimed(snapX, PROG, ROWS, proofs(),
      { rounds: 3, baseFacts: 3, derivedFacts: 3 });
    expect(admitResult(ctxX, bind(ctxX, resultX))).toEqual({ accept: true, rows: 2 });
  });

  test("retraction of a used premise row fails closed (admission_stale_rejects)", () => {
    // The re-bound claim carries the same proof DAG, which still cites f2's
    // digest; under the retracted snapshot the derivation is invalid.
    const snapR = snapshot([f1]);
    const ctxR: AdmissionContext = { ...CTX, snapshot: snapR as unknown as Json };
    const resultR = claimed(snapR, PROG, ROWS, proofs(), BASE_COUNTS);
    expect(admitResult(ctxR, bind(ctxR, resultR)))
      .toMatchObject({ accept: false, reason: "fact-not-selected" });
  });

  test("retraction rejects even for an internally consistent result", () => {
    // Re-derive the shrunken answer honestly: only affects(app,parser)
    // remains; f2's row and its proof are dropped. The stale row cannot be
    // smuggled back — omitting it is required for this to accept.
    const snapR = snapshot([f1]);
    const ctxR: AdmissionContext = { ...CTX, snapshot: snapR as unknown as Json };
    const freshProofs = { [P1]: factNode(f1), [R1]: ruleNode(DIRECT, [P1]) };
    const freshRows = [{ tuple: ["app", "parser"] as Atom[], proof: R1 }];
    const resultR = claimed(snapR, PROG, freshRows, freshProofs,
      { rounds: 2, baseFacts: 1, derivedFacts: 1 });
    expect(admitResult(ctxR, bind(ctxR, resultR))).toEqual({ accept: true, rows: 1 });
    // ...but a claim that keeps a stale row rejects.
    const staleRows = [...freshRows, { tuple: ["app", "lexer"] as Atom[], proof: R2 }];
    const staleResult = claimed(snapR, PROG, staleRows, proofs(), BASE_COUNTS);
    expect(admitResult(ctxR, bind(ctxR, staleResult)).accept).toBe(false);
  });
});

describe("exact-parent binding", () => {
  test("permuted premises reject (admission_premise_edit_rejects)", () => {
    const bad: ProofNode = { kind: "rule", rule: ruleId(TRANSITIVE), premises: [P2, R1] };
    const badId = pid(bad);
    const rows = [
      { tuple: ["app", "lexer"] as Atom[], proof: badId },
      { tuple: ["app", "parser"] as Atom[], proof: R1 },
    ];
    const m = proofs(); m[badId] = bad; delete m[R2];
    const result = claimed(SNAP, PROG, rows, m, BASE_COUNTS);
    expect(admitResult(CTX, bind(CTX, result)))
      .toMatchObject({ accept: false, reason: "substitution-mismatch" });
  });

  test("substituted premise rejects (admission_premise_edit_rejects)", () => {
    const bad: ProofNode = { kind: "rule", rule: ruleId(TRANSITIVE), premises: [R1, P1] };
    const badId = pid(bad);
    const rows = [
      { tuple: ["app", "lexer"] as Atom[], proof: badId },
      { tuple: ["app", "parser"] as Atom[], proof: R1 },
    ];
    const m = proofs(); m[badId] = bad; delete m[R2];
    const result = claimed(SNAP, PROG, rows, m, BASE_COUNTS);
    expect(admitResult(CTX, bind(CTX, result)))
      .toMatchObject({ accept: false, reason: "substitution-mismatch" });
  });

  test("forward/cyclic parent rejects (acyclic-by-position analogue)", () => {
    const aId = "sha256:" + "a1".repeat(32);
    const bId = "sha256:" + "b2".repeat(32);
    const nodeA: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [bId] };
    const nodeB: ProofNode = { kind: "rule", rule: ruleId(DIRECT), premises: [aId] };
    const result = claimed(SNAP, PROG,
      [{ tuple: ["app", "parser"] as Atom[], proof: aId }],
      { [aId]: nodeA, [bId]: nodeB }, BASE_COUNTS);
    expect(admitResult(CTX, bind(CTX, result)))
      .toMatchObject({ accept: false, reason: "proof-cycle" });
  });

  test("row citing a non-concluding step rejects (wrong-witness analogue)", () => {
    const rows = [
      { tuple: ["app", "lexer"] as Atom[], proof: R2 },
      { tuple: ["app", "parser"] as Atom[], proof: R2 },
    ];
    const result = claimed(SNAP, PROG, rows, proofs(), BASE_COUNTS);
    expect(admitResult(CTX, bind(CTX, result)))
      .toMatchObject({ accept: false, reason: "conclusion-mismatch" });
  });

  test("row citing an absent proof rejects (empty-support analogue)", () => {
    const missing = "sha256:" + "cd".repeat(32);
    const rows = [
      { tuple: ["app", "lexer"] as Atom[], proof: R2 },
      { tuple: ["app", "parser"] as Atom[], proof: missing },
    ];
    const result = claimed(SNAP, PROG, rows, proofs(), BASE_COUNTS);
    expect(admitResult(CTX, bind(CTX, result)))
      .toMatchObject({ accept: false, reason: "unknown-proof" });
  });
});

