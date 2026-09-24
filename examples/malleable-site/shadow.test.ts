import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestCanonical } from "../../src/digest";
import { applicationJson } from "../../src/application-contract";
import { MarketingHost } from "./host";
import { evaluateShadow, verifyShadow } from "./shadow";

test("offline guardrails independently pass, reject harmful copy, and retain inconclusive results without activation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-shadow-"));
  try {
    const host = new MarketingHost(directory), initial = await host.initialize(), revision = await host.revision(initial);
    const base = { contract: "algal.marketing-proposal.v1", baseRevision: digestCanonical(applicationJson(revision)), config: revision.config, source: "model", rationale: "A test proposal, never an instruction to activate." };
    const good = await evaluateShadow(host, initial.digest, { ...base, config: { ...base.config, headline: "Inspect and reshape a running component." } });
    expect(good.report.outcome).toBe("pass");
    expect(good.report.promotionAuthority).toBe("none");
    expect((await verifyShadow(host, good.reference)).cases.length).toBe(4);
    const bad = await evaluateShadow(host, initial.digest, { ...base, config: { ...base.config, headline: "Guaranteed 10x conversions with zero risk." } });
    expect(bad.report.outcome).toBe("fail");
    expect(bad.report.reasons).toContain("prohibited-editorial-claim");
    expect((await evaluateShadow(host, initial.digest, base)).report.outcome).toBe("inconclusive");
    expect((await host.current()).digest).toBe(initial.digest);
    const tampered = await host.service.store.putValue(applicationJson({ ...bad.report, outcome: "pass", reasons: [] }));
    await expect(verifyShadow(host, tampered)).rejects.toThrow("replay mismatch");
    await host.signal(initial.digest, { kind: "release", value: "available" }, digestCanonical("change"));
    await expect(evaluateShadow(host, initial.digest, base)).rejects.toThrow("Stale");
    expect((await verifyShadow(host, good.reference)).outcome).toBe("pass");
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test("shadow verification rejects missing or corrupt retained dependencies instead of rebuilding them", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-shadow-integrity-"));
  try {
    const host = new MarketingHost(directory), initial = await host.initialize(), revision = await host.revision(initial);
    const result = await evaluateShadow(host, initial.digest, { contract: "algal.marketing-proposal.v1", baseRevision: digestCanonical(applicationJson(revision)), config: { ...revision.config, headline: "Inspect every retained revision." }, source: "owner", rationale: "Offline dependency integrity fixture." });
    const candidate = await host.service.store.getValue(result.report.candidateRevision) as { entrypoints: { name: string; manifest: string }[] };
    const view = candidate.entrypoints.find(entry => entry.name === "view")!.manifest;
    for (const [kind, reference] of [["values", result.report.policy], ["values", result.report.compatibility], ["values", result.report.candidateRevision], ["manifests", view], ["runs", result.report.cases[0]!.incumbentReceipt]]) {
      const path = join(directory, kind!, reference!.slice(7) + ".json"), bytes = await readFile(path);
      await unlink(path);
      try {
        await expect(verifyShadow(host, result.reference)).rejects.toThrow();
        expect(await Bun.file(path).exists()).toBe(false);
      } finally { await writeFile(path, bytes); }
    }
    const policyPath = join(directory, "values", result.report.policy.slice(7) + ".json"), policyBytes = await readFile(policyPath);
    await writeFile(policyPath, JSON.stringify({ replaced: true }));
    try { await expect(verifyShadow(host, result.reference)).rejects.toThrow("hashes"); }
    finally { await writeFile(policyPath, policyBytes); }
    const widened = await host.service.store.putValue(applicationJson({ ...result.report, cases: result.report.cases.map(row => ({ ...row, hidden: true })) }));
    await expect(verifyShadow(host, widened)).rejects.toThrow("field");
    expect((await verifyShadow(host, result.reference)).outcome).toBe("pass");
    expect((await host.current()).digest).toBe(initial.digest);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);
