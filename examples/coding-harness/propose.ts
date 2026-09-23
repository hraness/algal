import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { parseCandidateProposal, parseExperimentSplit, parseHarnessPolicy, parseTrialOutcome, policyId } from "./protocol";
import { createXcbModel, type XcbConfig } from "./xcb";
import { createHarnessModel, parseHarnessBackend, type HarnessBackendConfig } from "./model";

/** Only bounded development outcomes enter this one-call proposer. No task files,
 * verifier output, holdout outcomes, or tool authority are provided to it. */
export function proposalEvidence(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected proposal input object");
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).sort().join(",") !== "outcomes,parentPolicy,split") throw new Error("Unknown proposal input fields");
  const split = parseExperimentSplit(value.split);
  const parentPolicy = parseHarnessPolicy(value.parentPolicy);
  const parentPolicyId = policyId(parentPolicy);
  if (!Array.isArray(value.outcomes) || value.outcomes.length < 1 || value.outcomes.length > 32) throw new Error("Expected 1..32 development outcomes");
  const outcomes = value.outcomes.map(parseTrialOutcome);
  if (outcomes.some(outcome => !split.devTaskIds.includes(outcome.taskId) || outcome.policyId !== parentPolicyId)) {
    throw new Error("Proposal evidence must come from the parent policy on development tasks only");
  }
  const evidenceTaskIds = [...new Set(outcomes.map(outcome => outcome.taskId))].sort();
  return { split, parentPolicy, parentPolicyId, outcomes, evidenceTaskIds };
}

export async function propose(inputPath: string, outputPath: string, config: XcbConfig | HarnessBackendConfig): Promise<void> {
  if (!isAbsolute(inputPath) || !isAbsolute(outputPath)) throw new Error("Absolute evidence/output paths required");
  const text = await readFile(inputPath, "utf8");
  if (Buffer.byteLength(text) > 65536) throw new Error("Proposal evidence exceeds 64 KiB");
  const evidence = proposalEvidence(JSON.parse(text) as unknown);
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.on("SIGTERM", abort);
  process.on("SIGINT", abort);
  const start = Date.now();
  const record: Record<string, unknown> = {
    schema: "algal.coding-harness.proposal.v1", status: "pending", source: "model-generated",
    evidence, proposal: null, usage: null,
  };
  // Reserve the output before inference; a second launch cannot overwrite an
  // earlier paid/uncertain attempt. Rejected candidates retain their usage too.
  try {
    await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  } catch (error) {
    process.off("SIGTERM", abort); process.off("SIGINT", abort); throw error;
  }
  let settle = async () => {};
  try {
    const backend = "provider" in config
      ? await createHarnessModel(config, controller.signal)
      : await createXcbModel({ ...config, maxCalls: 1 }, controller.signal);
    settle = backend.settle;
    record.accounting = backend.accounting;
    const response = await backend.model({
      prompt: [
        "Propose exactly one bounded coding-harness policy mutation using only the development outcomes supplied.",
        "Return one JSON object with exactly policy,parentPolicyId,evidenceTaskIds. Copy the supplied parentPolicyId and evidenceTaskIds exactly.",
        "policy has exactly version:1, context, testPolicy, recoveryPolicy.",
        'context is {"mode":"full"} or {"mode":"recent-with-first","maxMessages":3..128}.',
        'testPolicy is "focused-first" or "test-after-edit"; recoveryPolicy is "diagnose-once" or "retry-with-context".',
        "Change at least one parent policy field. Prefer a small mutation. Context retains the instruction and complete action/result pairs; use maxMessages3 or5 for a small window.",
        "These few outcomes justify a hypothesis to test, not a conclusion. Do not invent reasons for task failures.",
      ].join("\n"),
      context: [{ role: "user", content: JSON.stringify({ parentPolicy: evidence.parentPolicy,
        parentPolicyId: evidence.parentPolicyId, evidenceTaskIds: evidence.evidenceTaskIds, outcomes: evidence.outcomes }) }],
      maxOutputBytes: 4096,
    }, controller.signal);
    record.rawResponse = response;
    const proposal = parseCandidateProposal(typeof response === "string" ? JSON.parse(response) as unknown : response, evidence.split);
    if (proposal.parentPolicyId !== evidence.parentPolicyId || JSON.stringify(proposal.evidenceTaskIds) !== JSON.stringify(evidence.evidenceTaskIds)) {
      throw new Error("Proposal changed its ancestry or evidence binding");
    }
    if (policyId(proposal.policy) === evidence.parentPolicyId) throw new Error("Proposal did not mutate its parent policy");
    record.proposal = proposal;
    record.status = "admitted";
  } catch (error) {
    record.status = record.rawResponse === undefined ? "failed" : "rejected";
    record.error = error instanceof Error ? error.message : "Proposal failed";
    throw error;
  } finally {
    await settle();
    const accounting = record.accounting as { costUsd?: number | null; inputTokens?: number | null; outputTokens?: number | null } | undefined;
    record.usage = { durationMs: Date.now() - start, paidCostUsd: accounting?.costUsd ?? null,
      inputTokens: accounting?.inputTokens ?? null, outputTokens: accounting?.outputTokens ?? null };
    await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
    process.off("SIGTERM", abort); process.off("SIGINT", abort);
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 4 && args[2] === "--backend-config") {
    const [input, output, , config] = args;
    if (!input || !output || !config || !isAbsolute(config)) throw new Error("Absolute proposal/backend paths required");
    const text = await readFile(config, "utf8");
    if (Buffer.byteLength(text) > 16384) throw new Error("Backend configuration exceeds 16 KiB");
    await propose(input, output, parseHarnessBackend(JSON.parse(text) as unknown));
  } else {
    const [input, output, executable, account, model] = args;
    if (!input || !output || !executable || !account || !model || process.argv.length !== 7) {
      throw new Error("Usage: bun propose.ts ABS_EVIDENCE ABS_OUTPUT ABS_XCB ACCOUNT MODEL, or ABS_EVIDENCE ABS_OUTPUT --backend-config ABS_CONFIG");
    }
    await propose(input, output, { executable, account, model, timeoutMs: 60000 });
  }
}
