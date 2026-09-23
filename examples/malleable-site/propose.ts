import { createHarnessModel, parseHarnessBackend, type HarnessBackendConfig, type HarnessModelObservations } from "../coding-harness/model";
import { parseOrganismManifest, manifestToJson } from "../../src/contract";
import { digestCanonical, type Digest } from "../../src/digest";
import { applicationJson } from "../../src/application-contract";
import { runOrganism } from "../../src/run";
import { builtinRegistry } from "../../src/registry";
import { verifyReceipt } from "../../src/verify";
import { parseProposal } from "./surface";
import { MarketingHost } from "./host";
import { MarketingWorkbench } from "./workbench";

/** One explicit call, no retry/fallback. The durable backend ledger reserves
 * before dispatch. A generated proposal grants no activation authority. */
export async function generateProposal(host: MarketingHost, backendInput: unknown,
  inferenceFactory: (config: HarnessBackendConfig, observations: HarnessModelObservations) => Promise<Pick<Awaited<ReturnType<typeof createHarnessModel>>, "executor" | "accounting" | "settle">> = (config, observations) => createHarnessModel(config, undefined, observations)) {
  const config = parseHarnessBackend(backendInput);
  if (config.maxCalls !== 1) throw new Error("This demonstration requires a one-call proposal budget");
  const workbench = new MarketingWorkbench(host), capture = await workbench.capture();
  const revision = capture.revision, signals = capture.signals;
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:marketing-proposal", name: "Bounded marketing proposal",
    budgets: { maxSteps: 4, maxAgentCalls: 1, maxWork: 100_000, maxContextBytes: config.maxRequestBytes, maxOutputBytes: config.maxOutputBytes, maxDepth: 4 },
    cells: [{ id: "context", kind: "const", outputs: { value: { type: "json", value: { revision, signals, signalsMeaning: "simulated demonstration inputs; not verified business facts" } } } },
      { id: "proposal", kind: "agent", inputs: { context: "json" },
        prompt: "Propose a thoughtful, clear marketing component for ALGAL, a language/runtime for bounded, inspectable, evolving software. Return only {headline,body,ctaLabel,layout,rationale}. Preserve factual modesty: no performance, conversion, adoption, cross-platform shipping, or autonomous safety claims. Headline 1–96 characters; body 1–280; ctaLabel 1–32; layout split or stack. Rationale must be one short sentence, at most 200 characters. The destination is fixed /docs/. This is a preview proposal, not an instruction to publish or execute anything.",
        output: { kind: "json", schema: { type: "object", additionalProperties: false, required: ["headline", "body", "ctaLabel", "layout", "rationale"], properties: {
          headline: { type: "string", maxLength: 96 }, body: { type: "string", maxLength: 280 }, ctaLabel: { type: "string", maxLength: 32 }, layout: { type: "string", enum: ["split", "stack"] }, rationale: { type: "string", maxLength: 200 },
        } } } }], edges: [{ from: { cell: "context", port: "value" }, to: { cell: "proposal", port: "context" } }] });
  const store = host.service.store;
  const manifestRef = await store.putManifest(manifest);
  // This identity is stable across a repeated invocation with the same ledger
  // and captured head. An earlier uncertain attempt must never become a retry.
  const operation = digestCanonical(applicationJson({ contract: "algal.marketing-inference-operation.v1", head: capture.head, manifest: manifestRef, configuration: digestCanonical(applicationJson(config)) }));
  const journalAttempt = await workbench.beginAttempt({ operation, expectedHead: capture.head, expectedControls: capture.controlsRef, backend: config.provider, model: config.model, manifest: manifestRef });
  let backend: Awaited<ReturnType<typeof inferenceFactory>> | undefined;
  let receiptRef: Digest | null = null, accountingRef: Digest | null = null, settlementUnknown = false;
  try {
    backend = await inferenceFactory(config, { observeGeneration: async observation => { await workbench.recordGeneration(journalAttempt, observation); } });
    let receipt: Awaited<ReturnType<typeof runOrganism>> | undefined, executionFailure: { error: unknown } | undefined;
    try {
      receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [backend.executor] });
      // Preserve the observed response before ledger settlement can fail. A
      // reconciliation needs this exact receipt; it must never rerun inference.
      receiptRef = await store.putReceipt(applicationJson(receipt));
    } catch (error) { executionFailure = { error }; }
    try { await backend.settle(); }
    catch (error) { settlementUnknown = receiptRef !== null || backend.accounting.calls > 0; throw error; }
    if (executionFailure) throw executionFailure.error;
    if (!receipt) throw new Error("Missing inference result");
    accountingRef = await store.putValue(applicationJson(backend.accounting));
    const intent = { contract: "algal.marketing-model-attempt.v1", parentState: capture.head, baseRevision: digestCanonical(revision), manifest: manifestRef, receipt: receiptRef, accounting: accountingRef, providerAttestation: false };
    const attempt = await store.putValue(applicationJson(intent));
    if (receipt.outcome !== "complete" || !(await verifyReceipt(applicationJson(receipt), manifestToJson(manifest), store)).ok) throw new Error("Proposal inference incomplete");
    const output = receipt.cells.proposal?.outputs?.out;
    if (!output || typeof output !== "object" || Array.isArray(output) || Object.keys(output).sort().join(",") !== "body,ctaLabel,headline,layout,rationale") throw new Error("Invalid model proposal shape");
    const proposal = parseProposal({ contract: "algal.marketing-proposal.v1", baseRevision: digestCanonical(revision), config: { headline: output.headline, body: output.body, ctaLabel: output.ctaLabel, layout: output.layout }, rationale: output.rationale, source: "model" });
    await workbench.finishAttempt(journalAttempt, { status: "completed", proposal, receipt: receiptRef, accounting: accountingRef, reason: null });
    return { proposal, attempt, journalAttempt, receipt: receiptRef, accounting: backend.accounting };
  } catch {
    if (backend) accountingRef ??= await store.putValue(applicationJson(backend.accounting));
    const uncertain = settlementUnknown || (backend?.accounting.records.some(row => row.status === "reserved" || row.status === "unknown") ?? false);
    // Provider error strings can carry private endpoint details. Retain a
    // closed explanation plus the bounded receipt/accounting records instead.
    await workbench.finishAttempt(journalAttempt, { status: uncertain ? "uncertain" : "failed", proposal: null, receipt: receiptRef, accounting: accountingRef, reason: uncertain ? "Inference completion is unknown; no automatic retry is permitted." : "Inference did not produce an admitted proposal. Inspect its retained evidence." });
    throw new Error(`Proposal inference ${uncertain ? "uncertain" : "failed"}; retained workbench attempt ${journalAttempt}`);
  }
}
