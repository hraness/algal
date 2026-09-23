import { createHarnessModel, parseHarnessBackend, type HarnessBackendConfig } from "../coding-harness/model";
import { parseOrganismManifest, manifestToJson } from "../../src/contract";
import { digestCanonical } from "../../src/digest";
import { applicationJson } from "../../src/application-contract";
import { runOrganism } from "../../src/run";
import { builtinRegistry } from "../../src/registry";
import { verifyReceipt } from "../../src/verify";
import { parseProposal } from "./surface";
import { MarketingHost } from "./host";

/** One explicit call, no retry/fallback. The durable backend ledger reserves
 * before dispatch. A generated proposal grants no activation authority. */
export async function generateProposal(host: MarketingHost, backendInput: unknown,
  inferenceFactory: (config: HarnessBackendConfig) => Promise<Pick<Awaited<ReturnType<typeof createHarnessModel>>, "executor" | "accounting" | "settle">> = createHarnessModel) {
  const config = parseHarnessBackend(backendInput);
  if (config.maxCalls !== 1) throw new Error("This demonstration requires a one-call proposal budget");
  const current = await host.current(), revision = await host.revision(current), signals = await host.signals(current);
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:marketing-proposal", name: "Bounded marketing proposal",
    budgets: { maxSteps: 4, maxAgentCalls: 1, maxWork: 100_000, maxContextBytes: config.maxRequestBytes, maxOutputBytes: config.maxOutputBytes, maxDepth: 4 },
    cells: [{ id: "context", kind: "const", outputs: { value: { type: "json", value: { revision, signals, signalsMeaning: "simulated demonstration inputs; not verified business facts" } } } },
      { id: "proposal", kind: "agent", inputs: { context: "json" },
        prompt: "Propose a thoughtful, clear marketing component for ALGAL, a language/runtime for bounded, inspectable, evolving software. Return only {headline,body,ctaLabel,layout,rationale}. Preserve factual modesty: no performance, conversion, adoption, cross-platform shipping, or autonomous safety claims. Headline 1–96 characters; body 1–280; ctaLabel 1–32; layout split or stack. Rationale must be one short sentence, at most 200 characters. The destination is fixed /docs/. This is a preview proposal, not an instruction to publish or execute anything.",
        output: { kind: "json", schema: { type: "object", additionalProperties: false, required: ["headline", "body", "ctaLabel", "layout", "rationale"], properties: {
          headline: { type: "string", maxLength: 96 }, body: { type: "string", maxLength: 280 }, ctaLabel: { type: "string", maxLength: 32 }, layout: { type: "string", enum: ["split", "stack"] }, rationale: { type: "string", maxLength: 200 },
        } } } }], edges: [{ from: { cell: "context", port: "value" }, to: { cell: "proposal", port: "context" } }] });
  const backend = await inferenceFactory(config), store = host.service.store;
  const manifestRef = await store.putManifest(manifest);
  let receipt;
  try { receipt = await runOrganism({ manifest, store, fns: builtinRegistry(), executors: [backend.executor] }); }
  finally { await backend.settle(); }
  const receiptRef = await store.putReceipt(applicationJson(receipt));
  const accounting = await store.putValue(applicationJson(backend.accounting));
  const intent = { contract: "algal.marketing-model-attempt.v1", parentState: current.digest, baseRevision: digestCanonical(revision), manifest: manifestRef, receipt: receiptRef, accounting, providerAttestation: false };
  const attempt = await store.putValue(applicationJson(intent));
  if (receipt.outcome !== "complete" || !(await verifyReceipt(applicationJson(receipt), manifestToJson(manifest), store)).ok) throw new Error(`Proposal inference incomplete; retained attempt ${attempt}`);
  const output = receipt.cells.proposal?.outputs?.out;
  if (!output || typeof output !== "object" || Array.isArray(output) || Object.keys(output).sort().join(",") !== "body,ctaLabel,headline,layout,rationale") throw new Error(`Invalid model proposal shape; retained attempt ${attempt}`);
  const proposal = parseProposal({ contract: "algal.marketing-proposal.v1", baseRevision: digestCanonical(revision), config: { headline: output.headline, body: output.body, ctaLabel: output.ctaLabel, layout: output.layout }, rationale: output.rationale, source: "model" });
  return { proposal, attempt, receipt: receiptRef, accounting: backend.accounting };
}
