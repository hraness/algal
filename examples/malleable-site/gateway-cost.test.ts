import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGatewayInference } from "../coding-harness/model";
import { MarketingHost } from "./host";
import { generateProposal } from "./propose";
import { MarketingWorkbench, exportWorkbenchEvidence, verifyWorkbenchEvidence } from "./workbench";
import { DEFAULT_CONFIG } from "./surface";
import { parseWorkbenchCapture } from "./workbench-contract";

const directories: string[] = [], id = "gen_01ARZ3NDEKTSV4RRFFQ69G5FAV";
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
async function fixture(failObservation: false | "before" | "after" = false) {
  const directory = await mkdtemp(join(tmpdir(), "algal-gateway-cost-")); directories.push(directory);
  const host = new MarketingHost(directory); await host.initialize();
  const workbench = new MarketingWorkbench(host), output = { ...DEFAULT_CONFIG, headline: "One observed proposal.", rationale: "A bounded fixture." };
  const config = { provider: "gateway" as const, model: "test/model", gatewayProvider: "test", ledgerPath: join(directory, "ledger"), maxCalls: 1, maxCostMicrousd: 40_000, maxInputTokens: 16384, maxOutputTokens: 256, inputMicrousdPerToken: 1, outputMicrousdPerToken: 1, maxRequestBytes: 32768, maxOutputBytes: 4096 };
  let calls = 0;
  const run = () => generateProposal(host, config, async (_config, observations) => createGatewayInference(config, { credential: "fixture-private-credential", ...observations, ...(failObservation ? { observeGeneration: async observation => { if (failObservation === "after") await observations.observeGeneration?.(observation); throw new Error("Fixture persistence failure"); } } : {}), fetch: async () => {
    calls++; return Response.json({ id, model: config.model, choices: [{ message: { content: JSON.stringify({ value: output }) } }], usage: { prompt_tokens: 20, completion_tokens: 30 } });
  } }));
  return { directory, host, workbench, run, calls: () => calls };
}
const costData = { id, total_cost: 0.00017, gateway_cost: 0.00017, upstream_inference_cost: 0, is_byok: false, model: "test/model", provider_name: "test", tokens_prompt: 20, tokens_completion: 30 };
test("reported cost joins durable generation, exact receipt and restart/export; retries never redispatch", async () => {
  const f = await fixture(), result = await f.run(), attempt = result.journalAttempt;
  const captured = await f.workbench.capture();
  expect(captured.observation.gatewayCosts?.[0]).toMatchObject({ attempt, status: "lookup-pending", generationId: id, cost: null });
  expect(captured.observation.journalEntries).toBe(3);
  let lookups = 0;
  expect((await f.workbench.lookupGatewayCost(attempt, { credential: "fixture-private-credential", fetch: async () => { lookups++; return new Response("not yet", { status: 404 }); } })).status).toBe("lookup-pending");
  expect((await f.workbench.capture()).observation.journalEntries).toBe(3);
  const reported = await f.workbench.lookupGatewayCost(attempt, { credential: "fixture-private-credential", fetch: async () => { lookups++; return Response.json({ data: costData }); } });
  expect(reported).toMatchObject({ status: "reported", cost: { gatewayCostUsd: 0.00017, providerAttestation: false } });
  const reopened = new MarketingWorkbench(new MarketingHost(f.directory));
  const reportedCapture = await reopened.capture();
  expect(reportedCapture.observation.gatewayCosts?.[0]).toEqual(reported);
  const absent = structuredClone(reportedCapture); delete absent.observation.gatewayCosts;
  expect(parseWorkbenchCapture(absent).observation.gatewayCosts).toEqual([]);
  expect(() => parseWorkbenchCapture({ ...reportedCapture, observation: { ...reportedCapture.observation, gatewayCosts: null } })).toThrow("list bound");
  const mismatchedModel = structuredClone(reportedCapture); mismatchedModel.observation.gatewayCosts![0]!.cost!.model = "different/model";
  expect(() => parseWorkbenchCapture(mismatchedModel)).toThrow("Gateway cost attempt binding");
  const noReceipt = structuredClone(reportedCapture); noReceipt.attempts[0]!.settlement = null; noReceipt.attempts[0]!.settlements = [];
  noReceipt.observation.pendingAttempts = 1; noReceipt.observation.completedAttempts = 0;
  expect(() => parseWorkbenchCapture(noReceipt)).toThrow("Gateway cost attempt binding");
  Object.assign(noReceipt.observation.gatewayCosts![0]!, { status: "lookup-pending", cost: null, lookup: null });
  expect(() => parseWorkbenchCapture(noReceipt)).toThrow("Gateway cost attempt binding");
  expect(await reopened.lookupGatewayCost(attempt, { credential: "fixture-private-credential", fetch: async () => { throw new Error("Should not look up twice"); } })).toEqual(reported);
  expect(lookups).toBe(2); expect(f.calls()).toBe(1);
  expect(result.accounting.costUsd).toBeNull();
  await expect(f.run()).rejects.toThrow("already admitted");
  const exported = await exportWorkbenchEvidence(reopened);
  expect(await verifyWorkbenchEvidence(exported, captured.head)).toMatchObject({ ok: true, journalEntries: 4 });
  const missing = structuredClone(exported); missing.records = missing.records.filter(row => row.reference !== reported.lookup);
  await expect(verifyWorkbenchEvidence(missing, captured.head)).rejects.toThrow("journal content");
  await rm(join(f.directory, "runs", `${result.receipt!.slice(7)}.json`));
  await expect(reopened.capture()).rejects.toThrow("Missing Gateway generation receipt");
}, 30_000);
test("cost lookup refuses conflicting generation usage without changing retained observation", async () => {
  const f = await fixture(), result = await f.run();
  await expect(f.workbench.lookupGatewayCost(result.journalAttempt, { credential: "fixture-private-credential", fetch: async () => Response.json({ data: { ...costData, tokens_prompt: 21 } }) })).rejects.toThrow("exact generation");
  expect((await f.workbench.capture()).observation.gatewayCosts?.[0]?.status).toBe("lookup-pending");
  expect((await f.workbench.capture()).observation.journalEntries).toBe(3);
  expect(f.calls()).toBe(1);
}, 30_000);
test("generation persistence failure retains uncertain attempt and blocks resend", async () => {
  const f = await fixture("before");
  await expect(f.run()).rejects.toThrow("uncertain");
  const capture = await f.workbench.capture();
  expect(capture.attempts[0]?.settlement?.status).toBe("uncertain");
  expect(capture.observation.gatewayCosts?.[0]?.status).toBe("generation-unavailable");
  await expect(f.run()).rejects.toThrow("already admitted"); expect(f.calls()).toBe(1);
  let lookups = 0;
  await expect(f.workbench.lookupGatewayCost(capture.attempts[0]!.reference, { credential: "fixture-private-credential", fetch: async () => { lookups++; return Response.json({ data: costData }); } })).rejects.toThrow("requires retained generation");
  expect(lookups).toBe(0);
}, 30_000);

test("acknowledgement failure after durable generation preserves its ID but does not claim bound billing", async () => {
  const f = await fixture("after");
  await expect(f.run()).rejects.toThrow("uncertain");
  const capture = await new MarketingWorkbench(new MarketingHost(f.directory)).capture();
  expect(capture.observation.gatewayCosts?.[0]).toMatchObject({ status: "receipt-unavailable", generationId: id, cost: null });
  expect(capture.attempts[0]?.settlement?.status).toBe("uncertain");
  await expect(f.run()).rejects.toThrow("already admitted"); expect(f.calls()).toBe(1);
  expect(await verifyWorkbenchEvidence(await exportWorkbenchEvidence(f.workbench), capture.head)).toMatchObject({ ok: true });
}, 30_000);
