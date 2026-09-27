/**
 * verify/change-impact/change-impact.test.ts — the Phase 17 change-impact
 * suite. Builds the governed-input → required-verification map over the
 * live tree, asserts coverage and the named indirect-dependency rules
 * (verify/lib → aggregate + readmission; src → property-bound suites), and
 * runs the policy self-test: fixture mutations of the map — including a
 * classification flip on a semantic input — must all be rejected.
 */
import { describe, expect, test } from "bun:test";
import { realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { readJson, stableJson } from "../lib/files";
import { parseRegistry } from "../lib/claims";
import { SUITES } from "../lib/suites";
import { AGGREGATE_SUITE, CLASSIFICATION_RULES, SEMANTIC_CLASSES } from "./classification";
import { buildImpactMap, type ImpactRow } from "./impact";
import { admitChangeImpactReport, checkImpact } from "./policy";
import { runChangeImpact } from "./run";
import { SELFTEST_CASES } from "./selftest";

const ROOT = await realpath(resolve(dirname(import.meta.path), "..", ".."));
const builtP = buildImpactMap(ROOT);
const reportP = runChangeImpact(ROOT);
const registryP = readJson(ROOT, "verify/properties.json").then(parseRegistry);

function rowFor(rows: ImpactRow[], path: string): ImpactRow {
  const row = rows.find(candidate => candidate.path === path);
  expect(row, `missing map row for ${path}`).toBeDefined();
  return row!;
}

/** Suites the ledger binds to a path, recomputed straight from the registry
 *  rather than the lane's own derivation — the check that the map consumes
 *  the binding instead of duplicating it. */
function ledgerSuites(registry: ReturnType<typeof parseRegistry>, path: string): Set<string> {
  const suites = new Set<string>();
  for (const property of registry.properties) {
    for (const binding of [...property.sources, ...property.specs]) {
      if (binding.path === path && property.evidence.suite !== null) suites.add(property.evidence.suite);
    }
  }
  return suites;
}

describe("change-impact", () => {
  test("map covers every governed input exactly once, in order", async () => {
    const { rows, ctx } = await builtP;
    expect(rows.length).toBe(ctx.inputPaths.size);
    expect(rows.length).toBeGreaterThan(500);
    const paths = rows.map(row => row.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect([...paths].sort()).toEqual(paths);
    for (const row of rows) expect(row.class).not.toBe("unmapped");
  }, 60_000);

  test("the gate finds no violations on the committed tree", async () => {
    const { rows, ctx } = await builtP;
    const violations = checkImpact(rows, ctx);
    if (violations.length > 0) console.error(JSON.stringify(violations.slice(0, 20), null, 2));
    expect(violations).toEqual([]);
  }, 60_000);

  test("verify/lib edits require the aggregate plus the readmission chain", async () => {
    const { rows } = await builtP;
    const chain = [AGGREGATE_SUITE, "claims", "runner-selftest"];
    for (const path of ["verify/lib/runner.ts", "verify/lib/files.ts", "verify/lib/claims.ts", "verify/lib/suites.ts", "verify/lib/evidence-retention.ts", "verify/lib/schema.ts", "scripts/verify.ts"]) {
      const row = rowFor(rows, path);
      expect(row.class).toBe("runner-core");
      for (const suite of chain) expect(row.required).toContain(suite);
    }
  });

  test("registry inputs require claims and the aggregate", async () => {
    const { rows } = await builtP;
    for (const path of ["verify/properties.json", "verify/assumptions.md", "verify/toolchains.json"]) {
      const row = rowFor(rows, path);
      expect(row.required).toContain("claims");
      expect(row.required).toContain(AGGREGATE_SUITE);
    }
  });

  test("src production files require the property-bound suites", async () => {
    const { rows } = await builtP;
    const registry = await registryP;
    // Independent recomputation: every suite the ledger binds to a governed
    // source must appear in that row's required set.
    let boundChecked = 0;
    for (const row of rows) {
      const boundSuites = ledgerSuites(registry, row.path);
      for (const suite of boundSuites) {
        expect(row.required, `${row.path} dropped bound suite ${suite}`).toContain(suite);
        boundChecked++;
      }
    }
    expect(boundChecked).toBeGreaterThan(300);
    // A concrete pin: src/contract.ts is bound to boundary-suite properties.
    const contract = rowFor(rows, "src/contract.ts");
    expect(contract.class).toBe("production");
    expect(contract.required).toContain("boundary");
    expect(contract.properties.length).toBeGreaterThan(0);
  });

  test("indirect dependencies propagate through the import closure", async () => {
    const { rows } = await builtP;
    // verify/admission/admit.ts imports the independent memory checker, so
    // the checker's edits require the lane suite that consumes it.
    const checker = rowFor(rows, "verify/reference/memory/checker.ts");
    expect(checker.required).toContain("memory-oracle");
    expect(checker.required).toContain("lean-admission");
    expect(checker.via).toContain("import-closure");
    // verify/policy-mutation imports the production application host, so an
    // edit to src/application-host.ts must re-run that lane too.
    const host = rowFor(rows, "src/application-host.ts");
    expect(host.required).toContain("policy-mutation");
    // A heavily imported core module picks up the importers' suites.
    const values = rowFor(rows, "src/values.ts");
    expect(values.required.length).toBeGreaterThan(3);
    expect(values.via).toContain("import-closure");
  });

  test("src test files are bound to the suites that execute them", async () => {
    const { rows } = await builtP;
    const values = rowFor(rows, "src/values.test.ts");
    expect(values.required).toContain("boundary");
    const mailbox = rowFor(rows, "src/mailbox.test.ts");
    expect(mailbox.required).toContain("custody");
    expect(mailbox.required).toContain("publication");
    const durableFs = rowFor(rows, "src/durable-fs.test.ts");
    expect(durableFs.required).toContain("custody");
  });

  test("semantic inputs without a finer binding fall back to the aggregate", async () => {
    const { rows } = await builtP;
    const fallback = rows.filter(row => row.via.includes("aggregate-fallback"));
    // The ledger deliberately leaves many production modules unbound; the
    // fallback is what keeps their edits gated.
    expect(fallback.length).toBeGreaterThan(0);
    for (const row of fallback) {
      expect(SEMANTIC_CLASSES.has(row.class)).toBe(true);
      expect(row.required).toContain(AGGREGATE_SUITE);
      expect(row.note).toContain("aggregate");
    }
  });

  test("non-semantic inputs are explicitly classified", async () => {
    const { rows } = await builtP;
    const readme = rowFor(rows, "README.md");
    expect(readme.class).toBe("documentation");
    const example = rowFor(rows, "examples/hello.algal.json");
    expect(example.class).toBe("fixture");
    const wasm = rowFor(rows, "src/algal_expr.wasm");
    expect(wasm.class).toBe("generated");
    expect(wasm.required).toContain("artifact");
    const docs = rows.filter(row => row.class === "documentation");
    const fixtures = rows.filter(row => row.class === "fixture");
    expect(docs.length).toBeGreaterThan(0);
    expect(fixtures.length).toBeGreaterThan(300);
  });

  test("required suite names resolve and carry their admission status", async () => {
    const report = await reportP;
    expect(report.suites[AGGREGATE_SUITE]).toBe("aggregate");
    // Every referenced suite is a registered suite name — no phantom names.
    for (const name of Object.keys(report.suites)) {
      if (name === AGGREGATE_SUITE) continue;
      expect(SUITES.has(name), `unknown suite ${name}`).toBe(true);
    }
    // Planned suites are surfaced as not-started, not silently promoted.
    expect(report.suites["change-impact"]).toBe("not-started");
    expect(report.suites["boundary"]).toBe("ready");
  });

  test("policy self-test: every fixture mutation is rejected", async () => {
    const report = await reportP;
    expect(report.selftest.cases.length).toBe(SELFTEST_CASES.length);
    for (const result of report.selftest.cases) {
      const fixture = SELFTEST_CASES.find(item => item.id === result.id)!;
      if (fixture.expect === "reject") {
        expect(result.rejected, `mutation ${result.id} was not rejected`).toBe(true);
      }
    }
    expect(report.selftest.allRejected).toBe(true);
    const control = report.selftest.cases.find(c => c.id === "control-unmodified")!;
    expect(control.rejected).toBe(false);
    const flip = report.selftest.cases.find(c => c.id === "classification-flip")!;
    expect(flip.kinds).toContain("semantic-misclassified");
    const unmapped = report.selftest.cases.find(c => c.id === "unmapped-semantic-input")!;
    expect(unmapped.kinds).toContain("unmapped-input");
  });

  test("the emitted report is admitted by the closed contract reader", async () => {
    const { ctx } = await builtP;
    const report = await reportP;
    expect(report.status).toBe("passed");
    expect(report.contract).toBe("algal.change-impact.v1");
    expect(report.violations).toEqual([]);
    // Re-admission reparses the wire shape and re-runs the gate.
    const admitted = admitChangeImpactReport(JSON.parse(stableJson(report)), ctx);
    expect(stableJson(admitted)).toBe(stableJson(report));
    // A forged report that claims success over the tampered map must fail.
    const forged = JSON.parse(stableJson(report));
    forged.map = forged.map.map((row: ImpactRow) =>
      row.class === "production" ? { ...row, class: "documentation", required: [], discharge: "classified" } : row);
    forged.violations = [];
    expect(() => admitChangeImpactReport(forged, ctx)).toThrow();
  }, 60_000);

  test("the rule table is the complete verify/ coverage authority", async () => {
    const { ctx } = await builtP;
    // Every verify/** input hits exactly one declared lane or top-level
    // rule — there is no catch-all that could silently absorb a new lane.
    for (const path of ctx.inputPaths) {
      if (!path.startsWith("verify/")) continue;
      const rule = CLASSIFICATION_RULES.find(candidate => {
        const m = candidate.match;
        if (m.exact !== undefined && m.exact !== path) return false;
        if (m.prefix !== undefined && !path.startsWith(m.prefix)) return false;
        if (m.suffixes !== undefined && !m.suffixes.some(s => path.endsWith(s))) return false;
        if (m.contains !== undefined && !path.includes(m.contains)) return false;
        return true;
      });
      expect(rule, `verify input ${path} matched no rule`).toBeDefined();
    }
  });

  test("determinism: two full builds produce byte-identical maps", async () => {
    const first = await buildImpactMap(ROOT);
    const second = await buildImpactMap(ROOT);
    expect(stableJson(second.rows)).toBe(stableJson(first.rows));
  }, 60_000);
});
