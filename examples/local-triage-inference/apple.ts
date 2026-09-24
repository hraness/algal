/** One on-device proposal through the native ALGAL bridge. The native process
 * retains the inference receipt; this adapter never retries or activates it. */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, realpath } from "node:fs/promises";
import { join, resolve } from "node:path";
import { commandJson } from "../../src/io-runtime";
import { hostDirectory, hostLease, hostRead, hostWrite } from "../../src/host-state";
import { digestCanonical, type Digest } from "../../src/digest";
import { applicationJson } from "../../src/application-contract";
import { manifestToJson, parseOrganismManifest } from "../../src/contract";
import { parseRunReceipt } from "../../src/run";
import { verifyReceipt } from "../../src/verify";
import { TriageHost } from "../local-triage/host";
import { parseConfig, parseProposal, type Proposal } from "../local-triage/contract";

async function binary(path: string): Promise<{ path: string; sha256: string }> {
  const absolute = await realpath(path), stat = await lstat(absolute);
  if (!stat.isFile() || stat.size > 268_435_456 || !(stat.mode & 0o111)) throw new Error("Inference requires a bounded executable file");
  const digest = createHash("sha256"); for await (const chunk of createReadStream(absolute)) digest.update(chunk);
  return { path: absolute, sha256: digest.digest("hex") };
}
type AppleOptions = { native: string; bridge: string; attemptDirectory: string; instruction: string };
export async function proposeWithApple(host: TriageHost, options: AppleOptions): Promise<{ proposal: Proposal; receipt: Digest; evidence: Digest }> {
  const directory = resolve(options.attemptDirectory);
  await hostDirectory(directory);
  return hostLease(directory, "triage-apple-attempt", () => runAppleAttempt(host, options));
}
async function runAppleAttempt(host: TriageHost, options: AppleOptions): Promise<{ proposal: Proposal; receipt: Digest; evidence: Digest }> {
  if (!options.instruction.trim() || options.instruction.length > 512) throw new Error("A local proposal instruction must have 1–512 characters");
  const directory = resolve(options.attemptDirectory), native = await binary(options.native), bridge = await binary(options.bridge);
  await hostDirectory(directory);
  if (await hostRead(join(directory, "admission.json"), 16_384) !== undefined) throw new Error("This attempt was already admitted. Inspect retained evidence; do not retry it.");
  const capture = await host.capture(), store = host.service.store;
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:local-triage-proposal", name: "On-device task workflow proposal",
    budgets: { maxSteps: 4, maxAgentCalls: 1, maxWork: 100_000, maxContextBytes: 8192, maxOutputBytes: 2048, maxDepth: 4 },
    cells: [
      { id: "context", kind: "const", outputs: { value: { type: "json", value: { config: capture.definition.config, schemaVersion: capture.definition.schemaVersion, tasks: capture.tasks.map(task => ({ priority: task.priority, status: task.status, category: task.category })), request: options.instruction } } } },
      { id: "proposal", kind: "agent", inputs: { context: "json" }, prompt: "Propose a bounded task-triage policy responding to the supplied owner's request. Choose sort (priority, title, or created), group (none, status, priority, or category), and allowReopen (boolean). Return only {sort,group,allowReopen,rationale}; rationale is one sentence up to 160 characters. Do not change schema, tasks, authority, effects, or budgets. The host will independently check and preview this data; this is not an instruction to activate anything.", output: { kind: "json", schema: { type: "object", additionalProperties: false, required: ["sort", "group", "allowReopen", "rationale"], properties: { sort: { type: "string", enum: ["priority", "title", "created"] }, group: { type: "string", enum: ["none", "status", "priority", "category"] }, allowReopen: { type: "boolean" }, rationale: { type: "string", maxLength: 160 } } } } },
    ], edges: [{ from: { cell: "context", port: "value" }, to: { cell: "proposal", port: "context" } }],
  });
  const manifestRef = await store.putManifest(manifest), manifestFile = join(directory, "proposal.algal.json");
  await hostWrite(manifestFile, manifestToJson(manifest), 32_768);
  const admission = { contract: "algal.triage-apple-attempt.v1", application: host.application, expectedHead: capture.head, manifest: manifestRef, native, bridge, maxCalls: 1, maxDurationMs: 90_000, noRetry: true, inference: "on-device", actualCostMicrousd: null };
  // Immutable admission publication is the only entry to a model call. A
  // killed process leaves this marker and never offers an automatic retry.
  await hostWrite(join(directory, "admission.json"), applicationJson(admission), 16_384);
  try {
    const currentNative = await binary(native.path), currentBridge = await binary(bridge.path);
    if (currentNative.sha256 !== native.sha256 || currentBridge.sha256 !== bridge.sha256) throw new Error("Inference executable changed");
    const receiptValue = await commandJson([native.path, "run", manifestFile, "--args", "-", "--dir", join(directory, "native-store"), "--apple", "--apple-bridge", bridge.path, "--write"], {}, { timeoutMs: 90_000, maxStdoutBytes: 131_072 });
    await hostWrite(join(directory, "receipt.json"), receiptValue, 131_072);
    const receipt = parseRunReceipt(receiptValue), reference = await store.putReceipt(receiptValue);
    if (receipt.outcome !== "complete" || !(await verifyReceipt(receiptValue, manifestToJson(manifest), store)).ok || receipt.effects.length !== 1) throw new Error("Incomplete or unverified local proposal");
    const effect = receipt.effects[0]!;
    if (effect.executor !== "apple:system" || effect.cached === true || effect.configurationDigest !== digestCanonical({ kind: "apple", bridge: bridge.path })) throw new Error("Receipt does not bind the selected on-device bridge");
    const raw = receipt.cells.proposal?.outputs?.out;
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).sort().join(",") !== "allowReopen,group,rationale,sort") throw new Error("Local proposal shape is invalid");
    const config = parseConfig({ sort: raw.sort, group: raw.group, allowReopen: raw.allowReopen });
    const proposal = parseProposal({ contract: "algal.triage-proposal.v1", expectedHead: capture.head, config, schemaVersion: capture.definition.schemaVersion, source: "model", rationale: raw.rationale });
    const evidenceValue = applicationJson({ contract: "algal.triage-apple-result.v1", admission, receipt: reference, proposal, providerAttestation: false, tokenUsage: "unavailable", actualCostMicrousd: null });
    const evidence = await store.putValue(evidenceValue);
    await hostWrite(join(directory, "result.json"), evidenceValue, 32_768);
    return { proposal, receipt: reference, evidence };
  } catch {
    await hostWrite(join(directory, "unsettled.json"), { contract: "algal.triage-apple-unsettled.v1", manifest: manifestRef, status: "unqualified-or-uncertain", action: "inspect-retained-receipt-never-resend" }, 4096);
    throw new Error("Local inference did not produce a qualified proposal. The application is unchanged; inspect the retained attempt without retrying it.");
  }
}
