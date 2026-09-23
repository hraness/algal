import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestCanonical } from "../../src/digest";
import { applicationJson } from "../../src/application-contract";
import { MarketingHost, signalOperation } from "./host";
import { MarketingWorkbench, exportWorkbenchEvidence, verifyWorkbenchEvidence } from "./workbench";
import { parseBundle, unpackBundle } from "../../src/bundle";
import recordedModel from "./model-evidence.json";
import recordedProposal from "./model-proposal.json";
import recordedCostModel from "./model-cost-evidence.json";
import { parseGatewayGeneration, parseGatewayReportedCost } from "../../src/gateway-observation";
import { parseProposal } from "./surface";
import { evaluateShadow, verifyShadow } from "./shadow";

/** Deterministic recorded example built and replay-verified without inference. */
export async function buildWorkbenchFixture() {
  const directory = await mkdtemp(join(tmpdir(), "algal-workbench-build-"));
  try {
    const host = new MarketingHost(directory); await host.initialize();
    const workbench = new MarketingWorkbench(host);
    let capture = await workbench.capture();
    // Retain the already-published real Gateway execution as recorded
    // evidence. This deterministic build performs no new provider call.
    const bundle = parseBundle(recordedModel.bundle); await unpackBundle(bundle, host.service.store);
    const attempt = await workbench.beginAttempt({ operation: digestCanonical("workbench-recorded-model"), expectedHead: capture.head, expectedControls: capture.controlsRef, manifest: bundle.root, backend: "gateway", model: recordedModel.model });
    const receipt = await host.service.store.putReceipt(applicationJson(recordedModel.receipt)), accounting = await host.service.store.putValue(applicationJson(recordedModel.accounting));
    await workbench.finishAttempt(attempt, { status: "completed", proposal: parseProposal(recordedProposal), receipt, accounting, reason: null });
    // A second recorded call qualifies charge attribution. Replay its retained
    // response through the same parser; this fetch stub cannot contact a service.
    // Keep the older attempt's missing generation/cost evidence unchanged.
    const costBundle = parseBundle(recordedCostModel.bundle); await unpackBundle(costBundle, host.service.store);
    const costAttempt = await workbench.beginAttempt({ operation: digestCanonical("workbench-recorded-cost-model"), expectedHead: capture.head, expectedControls: capture.controlsRef, manifest: costBundle.root, backend: "gateway", model: recordedCostModel.model });
    await workbench.recordGeneration(costAttempt, parseGatewayGeneration(recordedCostModel.generation));
    const costReceipt = await host.service.store.putReceipt(applicationJson(recordedCostModel.receipt)), costAccounting = await host.service.store.putValue(applicationJson(recordedCostModel.accounting));
    const costProposal = parseProposal(recordedCostModel.proposal);
    await workbench.finishAttempt(costAttempt, { status: "completed", proposal: costProposal, receipt: costReceipt, accounting: costAccounting, reason: null });
    const cost = parseGatewayReportedCost(recordedCostModel.cost);
    await workbench.lookupGatewayCost(costAttempt, { credential: "recorded-response-not-a-credential", fetch: async (url, init) => {
      if (String(url) !== `https://ai-gateway.vercel.sh/v1/generation?id=${cost.generationId}` || init?.method !== "GET") throw new Error("Unexpected recorded accounting request");
      return Response.json({ data: { id: cost.generationId, model: cost.model, provider_name: cost.provider, total_cost: cost.totalCostUsd, gateway_cost: cost.gatewayCostUsd, upstream_inference_cost: cost.upstreamInferenceCostUsd, is_byok: cost.isByok, tokens_prompt: cost.tokensIn, tokens_completion: cost.tokensOut } });
    } });
    const modelShadow = await evaluateShadow(host, capture.head, costProposal); await verifyShadow(host, modelShadow.reference);
    await workbench.recordShadow({ operation: digestCanonical("workbench-recorded-cost-shadow"), parentState: capture.head, proposal: costProposal, accepted: modelShadow.report.outcome === "pass", policy: modelShadow.report.policy, evidence: modelShadow.reference, reason: modelShadow.report.outcome === "pass" ? "Recorded proposal passed declared offline guardrails; no activation or improvement claim." : modelShadow.report.outcome === "inconclusive" ? "Inconclusive: this proposal leaves the visible component unchanged. No revision was activated." : modelShadow.report.reasons.join(", ") });
    const envelope = { contract: "algal.marketing-signal-envelope.v1", source: "demo", stream: "release-feed", sequence: 1, event: { kind: "release", value: "available" } } as const;
    await workbench.execute({ contract: "algal.marketing-command.v1", actor: "human", kind: "signal", operation: signalOperation(envelope), expectedHead: capture.head, expectedControls: capture.controlsRef, envelope });
    capture = await workbench.capture();
    const proposal = parseProposal({ contract: "algal.marketing-proposal.v1", baseRevision: capture.revisionDigest, config: { ...capture.revision.config, headline: "A component with a history you can follow.", layout: "stack" }, source: "owner", rationale: "Make the relation between a visible component and its retained history easier to inspect." });
    await workbench.execute({ contract: "algal.marketing-command.v1", actor: "human", kind: "preview", operation: digestCanonical("workbench-fixture-preview"), expectedHead: capture.head, expectedControls: capture.controlsRef, proposal });
    const shadow = await evaluateShadow(host, capture.head, proposal);
    await verifyShadow(host, shadow.reference);
    await workbench.recordShadow({ operation: digestCanonical("workbench-fixture-shadow"), parentState: capture.head, proposal, accepted: shadow.report.outcome === "pass", policy: shadow.report.policy, evidence: shadow.reference, reason: "Four offline contexts passed declared presentation guardrails. No improvement or publication claim." });
    const evidence = await exportWorkbenchEvidence(workbench);
    await verifyWorkbenchEvidence(evidence, capture.head);
    return { capture: await workbench.capture(), evidence: applicationJson(evidence) };
  } finally { await rm(directory, { recursive: true, force: true }); }
}
