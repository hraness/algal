/** Host-owned offline guardrails. Passing grants no publication authority and
 * is not evidence of conversion uplift or factual correctness. */
import { applicationJson, getApplicationRecord, parseApplicationRevision } from "../../src/application-contract";
import { checkApplicationCompatibility } from "../../src/application-adaptation";
import { digestCanonical, type Digest } from "../../src/digest";
import { manifestToJson } from "../../src/contract";
import { builtinRegistry } from "../../src/registry";
import { parseRunReceipt, runOrganism } from "../../src/run";
import { verifyReceipt } from "../../src/verify";
import { MarketingCore, viewManifest } from "./core";
import { evaluateView, makeRevision, parseProposal, parseSignals, type SurfaceProposal, type SurfaceSignals } from "./surface";
import { boundWorkbench, workbenchObject, workbenchRef } from "./workbench-contract";

const hash = (v: unknown): Digest => digestCanonical(applicationJson(v));
export const SHADOW_POLICY = Object.freeze({
  contract: "algal.marketing-shadow-policy.v1",
  version: 1,
  contexts: [
    { audience: "builders", release: "preview" }, { audience: "builders", release: "available" },
    { audience: "operators", release: "preview" }, { audience: "operators", release: "available" },
  ] as SurfaceSignals[],
  fixedDestination: "/docs/",
  fixedNodes: ["surface", "audience", "headline", "body", "cta", "release"],
  // A deliberately narrow editorial rule. It detects these literal claim
  // patterns; it cannot establish that arbitrary copy is true or helpful.
  prohibitedClaims: ["guaranteed", "100% safe", "zero risk", "10x", "double your conversion"],
  promotionAuthority: "none",
});
type CaseResult = { signals: SurfaceSignals; incumbentReceipt: Digest; candidateReceipt: Digest; stableNodes: boolean; fixedDestination: boolean; signalMeaning: boolean; changed: boolean };
export type ShadowReport = {
  contract: "algal.marketing-shadow-report.v1"; parentState: Digest; proposal: Digest;
  candidateRevision: Digest; policy: Digest; compatibility: Digest; cases: CaseResult[];
  outcome: "pass" | "fail" | "inconclusive"; reasons: string[]; promotionAuthority: "none";
};
function parseReport(input: unknown): ShadowReport {
  boundWorkbench(input);
  const v = workbenchObject(input, ["contract", "parentState", "proposal", "candidateRevision", "policy", "compatibility", "cases", "outcome", "reasons", "promotionAuthority"]);
  if (v.contract !== "algal.marketing-shadow-report.v1" || v.promotionAuthority !== "none" || !["pass", "fail", "inconclusive"].includes(String(v.outcome))) throw new Error("Invalid shadow report");
  if (!Array.isArray(v.cases) || v.cases.length !== 4 || !Array.isArray(v.reasons) || v.reasons.length > 8 || v.reasons.some(r => typeof r !== "string" || r.length > 128)) throw new Error("Invalid shadow report bounds");
  const cases: CaseResult[] = v.cases.map(raw => {
    const row = workbenchObject(raw, ["signals", "incumbentReceipt", "candidateReceipt", "stableNodes", "fixedDestination", "signalMeaning", "changed"]);
    if ([row.stableNodes, row.fixedDestination, row.signalMeaning, row.changed].some(value => typeof value !== "boolean")) throw new Error("Invalid shadow case result");
    return { signals: parseSignals(row.signals), incumbentReceipt: workbenchRef(row.incumbentReceipt), candidateReceipt: workbenchRef(row.candidateReceipt), stableNodes: row.stableNodes as boolean, fixedDestination: row.fixedDestination as boolean, signalMeaning: row.signalMeaning as boolean, changed: row.changed as boolean };
  });
  // Full semantic validation is replay below; a stored pass grants no trust.
  return { contract: v.contract, parentState: workbenchRef(v.parentState), proposal: workbenchRef(v.proposal), candidateRevision: workbenchRef(v.candidateRevision), policy: workbenchRef(v.policy), compatibility: workbenchRef(v.compatibility), cases, outcome: v.outcome as ShadowReport["outcome"], reasons: v.reasons as string[], promotionAuthority: "none" };
}

async function evaluate(host: MarketingCore, parentState: Digest, proposal: SurfaceProposal): Promise<ShadowReport> {
  const store = host.service.store, parent = await host.snapshot(parentState), before = await host.revision(parent);
  if (hash(before) !== proposal.baseRevision) throw new Error("Shadow proposal belongs to a different revision");
  const after = makeRevision(proposal.config), candidateManifest = viewManifest(after), manifestRef = await store.putManifest(candidateManifest);
  const candidateRevision = await store.putValue(applicationJson({ ...parent.revision, parent: parent.state.revision, entrypoints: parent.revision.entrypoints.map(e => e.name === "view" ? { ...e, manifest: manifestRef } : e) }));
  const compatibility = await checkApplicationCompatibility(store, parent.state.revision, candidateRevision);
  const cases: CaseResult[] = [];
  const receipt = async (revision: typeof before, signals: SurfaceSignals): Promise<Digest> => {
    const manifest = viewManifest(revision); await store.putManifest(manifest);
    const run = await runOrganism({ manifest, args: { input: { signals } }, store, fns: builtinRegistry(), executors: [] });
    if (run.outcome !== "complete" || !(await verifyReceipt(applicationJson(run), manifestToJson(manifest), store)).ok) throw new Error("Shadow render replay failed");
    return store.putReceipt(applicationJson(run));
  };
  for (const signals of SHADOW_POLICY.contexts) {
    const incumbent = evaluateView(before, signals), candidate = evaluateView(after, signals);
    const nodes = [candidate.id, ...candidate.children.map(n => n.id)];
    const fixedDestination = candidate.children.every(n => n.kind !== "link" || n.href === SHADOW_POLICY.fixedDestination);
    const signalMeaning = ["audience", "release"].every(id => hash(candidate.children.find(n => n.id === id)) === hash(incumbent.children.find(n => n.id === id)));
    cases.push({ signals, incumbentReceipt: await receipt(before, signals), candidateReceipt: await receipt(after, signals), stableNodes: hash(nodes) === hash(SHADOW_POLICY.fixedNodes), fixedDestination, signalMeaning, changed: hash(incumbent) !== hash(candidate) });
  }
  const text = `${proposal.config.headline} ${proposal.config.body} ${proposal.config.ctaLabel}`.toLowerCase();
  const reasons: string[] = [];
  if (compatibility.status !== "compatible") reasons.push("incompatible-revision");
  if (cases.some(c => !c.stableNodes || !c.fixedDestination || !c.signalMeaning)) reasons.push("presentation-contract-regression");
  if (SHADOW_POLICY.prohibitedClaims.some(claim => text.includes(claim))) reasons.push("prohibited-editorial-claim");
  const outcome = reasons.length ? "fail" : cases.some(c => c.changed) ? "pass" : "inconclusive";
  if (outcome === "inconclusive") reasons.push("no-observable-change");
  return { contract: "algal.marketing-shadow-report.v1", parentState, proposal: await store.putValue(applicationJson(proposal)), candidateRevision, policy: await store.putValue(applicationJson(SHADOW_POLICY)), compatibility: await store.putValue(applicationJson(compatibility)), cases, outcome, reasons, promotionAuthority: "none" };
}

export async function evaluateShadow(host: MarketingCore, expectedHead: Digest, raw: unknown): Promise<{ reference: Digest; report: ShadowReport }> {
  const proposal = parseProposal(raw);
  if ((await host.current()).digest !== expectedHead) throw new Error("Stale shadow evaluation head");
  const report = await evaluate(host, expectedHead, proposal);
  return { reference: await host.service.store.putValue(applicationJson(report)), report };
}
/** Read and replay retained dependencies without evaluating or publishing a
 * new report. Capture uses this before a fresh view could recreate a receipt. */
export async function readRetainedShadow(host: MarketingCore, reference: Digest): Promise<{ report: ShadowReport; proposal: SurfaceProposal }> {
  const store = host.service.store, report = await getApplicationRecord(store, reference, parseReport);
  if (report.policy !== hash(SHADOW_POLICY)) throw new Error("Unadmitted shadow policy");
  // Verify the retained dependency closure before replay, which writes the
  // deterministic result back to CAS. Replay must not repair missing evidence.
  const policy = await getApplicationRecord(store, report.policy, applicationJson);
  if (hash(policy) !== hash(SHADOW_POLICY)) throw new Error("Changed shadow policy");
  await getApplicationRecord(store, report.compatibility, applicationJson);
  const candidate = await getApplicationRecord(store, report.candidateRevision, parseApplicationRevision);
  for (const entry of candidate.entrypoints) {
    const manifest = await store.getManifest(entry.manifest);
    if (!manifest || hash(manifestToJson(manifest)) !== entry.manifest) throw new Error("Missing or changed shadow candidate manifest");
  }
  for (const row of report.cases) for (const ref of [row.incumbentReceipt, row.candidateReceipt]) {
    const raw = await store.getReceipt(workbenchRef(ref));
    if (!raw || hash(raw) !== ref) throw new Error("Missing shadow receipt");
    const receipt = parseRunReceipt(raw), manifest = await store.getManifest(receipt.manifestDigest);
    if (!manifest || hash(manifestToJson(manifest)) !== receipt.manifestDigest || !(await verifyReceipt(raw, manifestToJson(manifest), store)).ok) throw new Error("Shadow receipt replay failed");
  }
  const proposal = await getApplicationRecord(store, report.proposal, parseProposal);
  return { report, proposal };
}
export async function verifyShadow(host: MarketingCore, reference: Digest): Promise<ShadowReport> {
  const { report, proposal } = await readRetainedShadow(host, reference);
  const replay = await evaluate(host, report.parentState, proposal);
  if (hash(replay) !== reference) throw new Error("Shadow report replay mismatch");
  return report;
}
