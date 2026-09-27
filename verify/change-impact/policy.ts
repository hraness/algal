/**
 * verify/change-impact/policy.ts — the gate over a built impact map.
 *
 * `checkImpact` is the policy self-test target: it takes the produced rows
 * plus the independently derived context (input set, digests, registry
 * bindings, known suites) and returns every violation. The checks that make
 * a deliberate unmapped semantic change fail:
 *
 *  - coverage: every governed input has exactly one row, in sorted order;
 *  - floor: a `semanticFloor` path may not be discharged by classification
 *    alone and may not carry a non-semantic class;
 *  - bindings: the registry-derived property suites must be a subset of the
 *    row's required set, and the row's `properties` list must equal the
 *    registry's (a mutation cannot launder a dropped binding);
 *  - suites: every required name must be a registered suite or the
 *    `all-required` aggregate;
 *  - identity: the recorded sha256 must equal the current file digest, and
 *    the recorded rule must be the first rule matching the path.
 */
import { array, digest, member, natural, record, requireThat, string, strings } from "../lib/schema";
import { hashJson } from "../lib/files";
import { SEMANTIC_CLASSES, ruleFor, semanticFloor, CLASSES } from "./classification";
import type { ImpactContext, ImpactRow } from "./impact";

export const VIOLATION_KINDS = [
  "unmapped-input",
  "extraneous-row",
  "duplicate-row",
  "unsorted-map",
  "unknown-suite",
  "dropped-binding",
  "binding-mismatch",
  "semantic-unmapped",
  "semantic-misclassified",
  "digest-drift",
  "rule-mismatch",
  "discharge-inconsistent",
  "malformed-row",
] as const;
export type ViolationKind = (typeof VIOLATION_KINDS)[number];
export type Violation = { kind: ViolationKind; path: string | null; detail: string };

const MAX_ROWS = 20_000;
const MAX_VIOLATIONS = 1_024;

function rowShape(row: ImpactRow, label: string): void {
  requireThat(typeof row.path === "string" && row.path.length > 0 && row.path.length <= 1024, `${label}: path bound`);
  requireThat(/^sha256:[a-f0-9]{64}$/.test(row.sha256), `${label}: digest shape`);
  requireThat(row.properties.length <= 512 && row.required.length <= 64 && row.via.length <= 16, `${label}: row bounds`);
  requireThat(new Set(row.required).size === row.required.length, `${label}: duplicate required suite`);
  requireThat(row.required.every((s, i, a) => i === 0 || a[i - 1]! < s), `${label}: required suites unsorted`);
}

/** The complete gate. Returns at most MAX_VIOLATIONS findings; a full map
 *  on a conforming tree returns none. Never throws on semantic findings —
 *  they are reported, which is what makes a mutation *falsifiable*. */
export function checkImpact(rows: ImpactRow[], ctx: ImpactContext): Violation[] {
  const violations: Violation[] = [];
  const fail = (kind: ViolationKind, path: string | null, detail: string): void => {
    if (violations.length < MAX_VIOLATIONS) violations.push({ kind, path, detail: detail.slice(0, 512) });
  };
  requireThat(Array.isArray(rows) && rows.length <= MAX_ROWS, "impact map row bound");

  const seen = new Set<string>();
  let previous = "";
  for (const [index, row] of rows.entries()) {
    const label = `map row ${index}`;
    if (typeof row !== "object" || row === null) { fail("malformed-row", null, `${label}: not an object`); continue; }
    try { rowShape(row, label); } catch (error) { fail("malformed-row", row.path ?? null, `${label}: ${error instanceof Error ? error.message : String(error)}`); continue; }
    if (row.path <= previous) fail("unsorted-map", row.path, "map rows must be sorted by path");
    previous = row.path;
    if (seen.has(row.path)) fail("duplicate-row", row.path, "input has more than one row");
    seen.add(row.path);
    if (!ctx.inputPaths.has(row.path)) fail("extraneous-row", row.path, "row names a path outside the governed input set");
    if (!(CLASSES as readonly string[]).includes(row.class)) fail("malformed-row", row.path, `unknown class ${row.class}`);

    const rule = ruleFor(row.path);
    if (rule === undefined) {
      if (row.class !== "unmapped") fail("rule-mismatch", row.path, "row names a rule but no rule matches the path");
      fail("unmapped-input", row.path, "governed input matched no classification rule");
    } else {
      if (row.rule !== rule.name) fail("rule-mismatch", row.path, `recorded rule ${row.rule ?? "null"} is not the first matching rule ${rule.name}`);
      if (row.class !== rule.class) fail("rule-mismatch", row.path, `row class ${row.class} does not match rule class ${rule.class}`);
    }

    if (semanticFloor(row.path)) {
      // Readmission (`claims`) alone is not semantic coverage: a floor input
      // needs at least one suite that re-executes evidence over it.
      if (row.required.every(suite => suite === "claims")) {
        fail("semantic-unmapped", row.path, "semantic input discharged with no required semantic suite");
      }
      if (!SEMANTIC_CLASSES.has(row.class)) fail("semantic-misclassified", row.path, `semantic input carries non-semantic class ${row.class}`);
    }
    for (const suite of row.required) {
      if (!ctx.knownSuites.has(suite)) fail("unknown-suite", row.path, `required suite ${suite} is not registered`);
    }
    const bound = ctx.bound.get(row.path);
    const boundSuites = bound?.suites ?? [];
    for (const suite of boundSuites) {
      if (!row.required.includes(suite)) fail("dropped-binding", row.path, `registry binds suite ${suite} but the row omits it`);
    }
    const boundProperties = bound?.properties ?? [];
    if (hashJson(row.properties) !== hashJson(boundProperties)) {
      fail("binding-mismatch", row.path, "row's property list differs from the registry binding");
    }
    if (ctx.digests.get(row.path) !== undefined && ctx.digests.get(row.path) !== row.sha256) {
      fail("digest-drift", row.path, "recorded digest differs from current input content");
    }
    const consistent = row.required.some(suite => suite !== "claims") === (row.discharge === "suite");
    if (!consistent) fail("discharge-inconsistent", row.path, `discharge ${row.discharge} contradicts ${row.required.length} required suites`);
    if (row.discharge === "classified" && SEMANTIC_CLASSES.has(row.class)) {
      fail("discharge-inconsistent", row.path, `semantic class ${row.class} cannot discharge by classification`);
    }
  }
  for (const path of ctx.inputPaths) {
    if (!seen.has(path)) fail("unmapped-input", path, "governed input has no map row");
  }
  return violations;
}

/** The wire report contract. `status` is "passed" only when the map is
 *  complete, the gate found no violations, and every selftest fixture was
 *  rejected — the report is evidence, not a label. */
export type ChangeImpactReport = {
  contract: "algal.change-impact.v1";
  status: "passed" | "failed";
  inputs: { total: number; suite: number; classified: number; unresolvedImports: number };
  classes: Record<string, number>;
  suites: Record<string, "ready" | "not-started" | "aggregate">;
  coverage: { propertyBound: number; laneBound: number; importClosure: number; aggregateFallback: number; classifiedOnly: number };
  reviewQueue: string[];
  staleBindings: string[];
  map: ImpactRow[];
  selftest: { cases: { id: string; rejected: boolean; kinds: string[] }[]; allRejected: boolean };
  violations: Violation[];
  digests: { map: string; rules: string; registry: string; runner: string };
};

function admitRow(value: unknown, label: string): ImpactRow {
  const item = record(value, ["path", "sha256", "class", "rule", "properties", "required", "via", "discharge", "gate", "note"], label);
  const row: ImpactRow = {
    path: string(item.path, `${label}.path`, 1024),
    sha256: digest(item.sha256, `${label}.sha256`),
    class: member(item.class, CLASSES, `${label}.class`),
    rule: item.rule === null ? null : string(item.rule, `${label}.rule`, 128),
    properties: strings(item.properties, `${label}.properties`),
    required: strings(item.required, `${label}.required`),
    via: strings(item.via, `${label}.via`),
    discharge: member(item.discharge, ["suite", "classified"] as const, `${label}.discharge`),
    gate: item.gate === null ? null : string(item.gate, `${label}.gate`, 512),
    note: item.note === null ? null : string(item.note, `${label}.note`, 512),
  };
  return row;
}

/** Re-admit a report: parse its closed shape, re-run the gate on the
 *  embedded map against the live context, and require that the recomputed
 *  violations equal the reported ones and the selftest rejected every
 *  mutation. A report that claims "passed" over a defective map fails here. */
export function admitChangeImpactReport(value: unknown, ctx: ImpactContext): ChangeImpactReport {
  const item = record(value, ["contract", "status", "inputs", "classes", "suites", "coverage", "reviewQueue", "staleBindings", "map", "selftest", "violations", "digests"], "change-impact report");
  requireThat(item.contract === "algal.change-impact.v1", "report contract");
  const status = member(item.status, ["passed", "failed"] as const, "report.status");
  const inputs = record(item.inputs, ["total", "suite", "classified", "unresolvedImports"], "report.inputs");
  natural(inputs.total, "inputs.total"); natural(inputs.suite, "inputs.suite"); natural(inputs.classified, "inputs.classified"); natural(inputs.unresolvedImports, "inputs.unresolvedImports");
  const coverage = record(item.coverage, ["propertyBound", "laneBound", "importClosure", "aggregateFallback", "classifiedOnly"], "report.coverage");
  for (const key of Object.keys(coverage)) natural(coverage[key], `coverage.${key}`);
  requireThat(item.classes !== null && typeof item.classes === "object" && !Array.isArray(item.classes), "report.classes: expected object");
  const classEntries = Object.entries(item.classes);
  requireThat(classEntries.length <= 32, "report.classes bound");
  for (const [name, count] of classEntries) {
    requireThat((CLASSES as readonly string[]).includes(name), `report.classes: unknown class ${name}`);
    natural(count, `report.classes.${name}`);
  }
  requireThat(item.suites !== null && typeof item.suites === "object" && !Array.isArray(item.suites), "report.suites: expected object");
  const suiteEntries = Object.entries(item.suites);
  requireThat(suiteEntries.length <= 128, "report.suites bound");
  for (const [name, suiteStatus] of suiteEntries) {
    requireThat(ctx.knownSuites.has(name), `report.suites: unknown suite ${name}`);
    member(suiteStatus, ["ready", "not-started", "aggregate"] as const, `report.suites.${name}`);
  }
  const selftest = record(item.selftest, ["cases", "allRejected"], "report.selftest");
  const cases = array(selftest.cases, "selftest.cases", 1, 64).map((entry, i) => {
    const c = record(entry, ["id", "rejected", "kinds"], `selftest.cases[${i}]`);
    return { id: string(c.id, "case id", 128), rejected: c.rejected === true, kinds: strings(c.kinds, "case kinds") };
  });
  requireThat(typeof selftest.allRejected === "boolean", "selftest.allRejected");
  const violations = array(item.violations, "report.violations", 0, MAX_VIOLATIONS).map((entry, i) => {
    const v = record(entry, ["kind", "path", "detail"], `violations[${i}]`);
    return { kind: member(v.kind, VIOLATION_KINDS, "violation.kind"), path: v.path === null ? null : string(v.path, "violation.path", 1024), detail: string(v.detail, "violation.detail", 1024) };
  });
  const map = array(item.map, "report.map", 0, MAX_ROWS).map((entry, i) => admitRow(entry, `map[${i}]`));
  const digests = record(item.digests, ["map", "rules", "registry", "runner"], "report.digests");
  digest(digests.map, "digests.map"); digest(digests.rules, "digests.rules");
  digest(digests.registry, "digests.registry"); digest(digests.runner, "digests.runner");
  array(item.reviewQueue, "report.reviewQueue", 0, MAX_ROWS);
  array(item.staleBindings, "report.staleBindings", 0, MAX_ROWS);

  // The gate is re-run on the admitted map, not trusted.
  const recomputed = checkImpact(map, ctx);
  requireThat(hashJson(recomputed) === hashJson(violations), "reported violations differ from the recomputed gate");
  if (status === "passed") {
    requireThat(violations.length === 0, "a passed report carries violations");
    requireThat(selftest.allRejected === true && cases.every(c => c.rejected), "a passed report has an unrejected selftest mutation");
    requireThat(map.length === ctx.inputPaths.size, "passed report map does not cover the input set");
  }
  return value as ChangeImpactReport;
}
