/**
 * verify/change-impact/selftest.ts — the policy self-test fixtures.
 *
 * The Phase 17 acceptance criterion is that a deliberate unmapped semantic
 * change fails the gate. Each case below mutates a copy of the freshly
 * computed map rows — not a synthetic toy map — and the suite requires the
 * gate to reject every mutation while accepting the unmodified control.
 * The mutations target the exact ways a real change could evade review:
 * flipping a semantic input's classification to a non-semantic class,
 * dropping a row entirely, dropping a registry-bound suite, naming a
 * nonexistent suite, forging the content digest, or pointing the row at a
 * rule that does not match it.
 */
import { requireThat } from "../lib/schema";
import { checkImpact, type Violation } from "./policy";
import type { ImpactContext, ImpactRow } from "./impact";

export type SelftestCase = {
  id: string;
  detail: string;
  expect: "pass" | "reject";
  /** Return the mutated row list against the live map and context. */
  apply: (rows: ImpactRow[], ctx: ImpactContext) => ImpactRow[] | null;
  /** Expected violation kinds (advisory detail for the report). */
  kinds: readonly string[];
};

const FORGED_DIGEST = `sha256:${"0".repeat(64)}`;

function replaceRow(rows: ImpactRow[], index: number, edit: Partial<ImpactRow>): ImpactRow[] {
  const copy = rows.slice();
  copy[index] = { ...copy[index]!, ...edit };
  return copy;
}

/** Canonical mutation target: a bound semantic production input. */
function productionIndex(rows: ImpactRow[]): number {
  const preferred = rows.findIndex(row => row.path === "src/contract.ts");
  if (preferred >= 0) return preferred;
  return rows.findIndex(row => row.class === "production" && row.properties.length > 0);
}

export const SELFTEST_CASES: readonly SelftestCase[] = [
  {
    id: "control-unmodified",
    detail: "the unmodified map must pass the gate",
    expect: "pass",
    apply: rows => rows,
    kinds: [],
  },
  {
    id: "classification-flip",
    detail: "a semantic production input flipped to a documentation-only class with no required suites",
    expect: "reject",
    apply: rows => {
      const index = productionIndex(rows);
      if (index < 0) return null;
      return replaceRow(rows, index, { class: "documentation", rule: "prose", required: [], discharge: "classified" });
    },
    kinds: ["semantic-misclassified", "semantic-unmapped", "rule-mismatch"],
  },
  {
    id: "unmapped-semantic-input",
    detail: "a semantic input silently dropped from the map",
    expect: "reject",
    apply: rows => {
      const index = productionIndex(rows);
      if (index < 0) return null;
      return rows.filter((_, i) => i !== index);
    },
    kinds: ["unmapped-input"],
  },
  {
    id: "extraneous-row",
    detail: "a fabricated semantic path inserted without an input",
    expect: "reject",
    apply: rows => [
      ...rows,
      { path: "zz-forged-input.ts", sha256: FORGED_DIGEST, class: "production", rule: null, properties: [], required: [], via: [], discharge: "classified", gate: null, note: null },
    ],
    kinds: ["extraneous-row"],
  },
  {
    id: "dropped-binding",
    detail: "one registry-bound suite removed from a bound input's required set",
    expect: "reject",
    apply: (rows, ctx) => {
      const index = rows.findIndex(row => (ctx.bound.get(row.path)?.suites.length ?? 0) > 0);
      if (index < 0) return null;
      const row = rows[index]!;
      const boundSuite = ctx.bound.get(row.path)!.suites[0]!;
      return replaceRow(rows, index, { required: row.required.filter(suite => suite !== boundSuite) });
    },
    kinds: ["dropped-binding"],
  },
  {
    id: "unknown-suite",
    detail: "a required suite name that no suite registry knows",
    expect: "reject",
    apply: rows => {
      const index = rows.findIndex(row => row.required.length > 0);
      if (index < 0) return null;
      const row = rows[index]!;
      return replaceRow(rows, index, { required: [...row.required, "change-impact-bogus"].sort() });
    },
    kinds: ["unknown-suite"],
  },
  {
    id: "digest-forgery",
    detail: "a row whose recorded content digest was rewritten",
    expect: "reject",
    apply: rows => {
      const index = productionIndex(rows);
      if (index < 0) return null;
      return replaceRow(rows, index, { sha256: FORGED_DIGEST });
    },
    kinds: ["digest-drift"],
  },
  {
    id: "rule-mismatch",
    detail: "a row claiming a rule that does not match its path",
    expect: "reject",
    apply: rows => {
      const index = productionIndex(rows);
      if (index < 0) return null;
      return replaceRow(rows, index, { rule: "prose" });
    },
    kinds: ["rule-mismatch"],
  },
  {
    id: "binding-field-tamper",
    detail: "a row whose recorded property list was emptied while required stayed intact",
    expect: "reject",
    apply: rows => {
      const index = rows.findIndex(row => row.properties.length > 0);
      if (index < 0) return null;
      return replaceRow(rows, index, { properties: [] });
    },
    kinds: ["binding-mismatch"],
  },
];

export type SelftestResult = {
  cases: { id: string; rejected: boolean; kinds: string[] }[];
  allRejected: boolean;
};

/** Run every fixture through the gate. A mutation is rejected when the
 *  checker reports at least one violation OR the malformed structure throws
 *  — both are gate failures, which is what the policy requires. The control
 *  case must produce zero violations. */
export function runSelftest(rows: ImpactRow[], ctx: ImpactContext): SelftestResult {
  const cases: SelftestResult["cases"] = [];
  let allRejected = true;
  for (const fixture of SELFTEST_CASES) {
    const mutated = fixture.apply(rows, ctx);
    requireThat(mutated !== null, `selftest fixture ${fixture.id} could not select a target row`);
    let violations: Violation[];
    try {
      violations = checkImpact(mutated, ctx);
    } catch {
      violations = [{ kind: "malformed-row", path: null, detail: "checker threw" }];
    }
    const rejected = violations.length > 0;
    if (fixture.expect === "reject" && !rejected) allRejected = false;
    if (fixture.expect === "pass" && rejected) allRejected = false;
    cases.push({ id: fixture.id, rejected, kinds: [...new Set(violations.map(v => v.kind))].slice(0, 8) });
  }
  return { cases, allRejected };
}
