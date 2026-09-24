import { open, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applicationJson } from "../../src/application-contract";
import { asDigest, digestCanonical } from "../../src/digest";
import { canonicalize } from "../../src/values";
import { MarketingHost, exportEvidence, verifyEvidence, buildSurfaceFixture } from "./host";
import { parseConfig, parseProposal, parseSignalEvent } from "./surface";
import { generateProposal } from "./propose";
import { MarketingWorkbench, exportWorkbenchEvidence, verifyWorkbenchEvidence } from "./workbench";
import { evaluateShadow, verifyShadow } from "./shadow";
import { startWorkbenchServer, defaultWorkbenchAssets } from "./serve";

async function read(path: string, max = 262_144): Promise<unknown> {
  const handle = await open(path, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > max) throw new Error("Input must be a bounded regular JSON file");
    const bytes = Buffer.alloc(max + 1), { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    if (bytesRead > max) throw new Error("Input grew beyond byte bound");
    return JSON.parse(bytes.subarray(0, bytesRead).toString("utf8"));
  } finally { await handle.close(); }
}
const usage = `Usage: bun examples/malleable-site/run.ts COMMAND DIRECTORY [arguments]
  init [config.json]                   initialize an explicit local owner workspace
  inspect | render                    current state / pure view with receipt
  capture                             same-head component explanation and commands
  command command.json                execute a typed, revision-bound owner command
  serve [PORT]                        local authenticated owner workbench
  shadow proposal.json                independent offline guardrails; no activation
  export-workbench output.json         retain lifecycle, attempts and shadow evidence
  verify-workbench evidence.json HEAD  replay exported workbench evidence
  edit config.json proposal.json       write an owner proposal fenced to current revision
  preview proposal.json               retain an exact-head preview; print reference
  activate PREVIEW_DIGEST OPERATION    explicitly adopt preview; operation is a stable label
  signal EXPECTED_HEAD event.json OPERATION
  restore EXPECTED_HEAD TARGET_STATE OPERATION
  export output.json                  export bounded lifecycle/pure execution evidence
  verify evidence.json EXPECTED_HEAD   DIRECTORY is unused; externally pin the head
  propose backend.json proposal.json   one budgeted model call; no activation
  gateway-cost ATTEMPT_DIGEST          read and retain one Gateway charge lookup
  fixture                             print standalone default view fixture`;
export async function main(args: string[]): Promise<unknown> {
  const [command, directory, ...rest] = args;
  if (!command || !directory) throw new Error(usage);
  const host = new MarketingHost(resolve(directory));
  const workbench = new MarketingWorkbench(host);
  const count = (n: number) => { if (rest.length !== n) throw new Error(usage); };
  const digest = (index: number) => asDigest(rest[index], "CLI digest");
  const operation = (index: number) => {
    const label = rest[index];
    if (!label || label.length > 128 || /[\0\r\n]/.test(label)) throw new Error("Operation label must be 1–128 characters");
    return digestCanonical({ contract: "algal.marketing-cli-operation.v1", label });
  };
  if (command === "init") { if (rest.length > 1) throw new Error(usage); return host.initialize(rest[0] ? parseConfig(await read(rest[0])) : undefined); }
  if (command === "inspect") { count(0); return { snapshot: await host.current(), revision: await host.revision(), signals: await host.signals() }; }
  if (command === "render") { count(0); return host.render(); }
  if (command === "capture") { count(0); return workbench.capture(); }
  if (command === "gateway-cost") {
    count(1);
    const credential = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
    if (!credential) throw new Error("Gateway accounting credential is not configured");
    return workbench.lookupGatewayCost(digest(0), { credential });
  }
  if (command === "command") { count(1); return workbench.execute(await read(rest[0]!)); }
  if (command === "serve") {
    if (rest.length > 1 || (rest[0] !== undefined && (!/^\d+$/.test(rest[0]) || Number(rest[0]) > 65535))) throw new Error(usage);
    const server = await startWorkbenchServer({ directory: resolve(directory), assets: defaultWorkbenchAssets, ...(rest[0] === undefined ? {} : { port: Number(rest[0]) }) });
    return { url: server.url, scope: "local-owner", note: "This URL grants access to this local workspace until the server stops." };
  }
  if (command === "shadow") {
    count(1); const proposal = parseProposal(await read(rest[0]!)), capture = await workbench.capture();
    const result = await evaluateShadow(host, capture.head, proposal); await verifyShadow(host, result.reference);
    await workbench.recordShadow({ operation: digestCanonical(applicationJson({ kind: "shadow", report: result.reference })), parentState: capture.head, proposal, accepted: result.report.outcome === "pass", policy: result.report.policy, evidence: result.reference, reason: result.report.outcome === "pass" ? "Passed four offline presentation guardrails; no promotion authority." : result.report.reasons.join(", ") });
    return result;
  }
  if (command === "export-workbench") { count(1); const evidence = await exportWorkbenchEvidence(workbench); await writeFile(rest[0]!, canonicalize(applicationJson(evidence)) + "\n", { flag: "wx", mode: 0o600 }); return { output: resolve(rest[0]!), head: evidence.surface.head }; }
  if (command === "verify-workbench") { count(2); return verifyWorkbenchEvidence(await read(rest[0]!, 8_388_608), digest(1)); }
  if (command === "edit") {
    count(2);
    const proposal = parseProposal({ contract: "algal.marketing-proposal.v1", baseRevision: digestCanonical(await host.revision()), config: parseConfig(await read(rest[0]!)), source: "owner", rationale: "An explicit owner edit for this local preview." });
    await writeFile(rest[1]!, canonicalize(proposal) + "\n", { flag: "wx", mode: 0o600 });
    return { proposal: resolve(rest[1]!) };
  }
  if (command === "preview") { count(1); return host.preview((await host.current()).digest, parseProposal(await read(rest[0]!))); }
  if (command === "activate") { count(2); return host.activate(digest(0), operation(1)); }
  if (command === "signal") { count(3); return host.signal(digest(0), parseSignalEvent(await read(rest[1]!)), operation(2)); }
  if (command === "restore") { count(3); return host.restore(digest(0), digest(1), operation(2)); }
  if (command === "export") { count(1); const evidence = await exportEvidence(host); await writeFile(rest[0]!, canonicalize(evidence) + "\n", { flag: "wx", mode: 0o600 }); return { output: resolve(rest[0]!), head: evidence.head, states: evidence.states.length }; }
  if (command === "verify") { count(2); return verifyEvidence(await read(rest[0]!, 4_194_304), digest(1)); }
  if (command === "propose") {
    count(2);
    // Reserve the output path before a paid call, so an existing proposal is
    // never overwritten and filesystem failure cannot invite an accidental retry.
    const file = await open(rest[1]!, "wx", 0o600);
    try { const result = await generateProposal(host, await read(rest[0]!)); await file.writeFile(canonicalize(result.proposal) + "\n"); await file.sync(); return { output: resolve(rest[1]!), attempt: result.attempt, journalAttempt: result.journalAttempt, receipt: result.receipt, accounting: result.accounting }; }
    finally { await file.close(); }
  }
  if (command === "fixture") { count(0); return buildSurfaceFixture(); }
  throw new Error(usage);
}
if (import.meta.main) {
  try { console.log(canonicalize(applicationJson(await main(Bun.argv.slice(2))))); }
  catch (error) { console.error(error instanceof Error ? error.message : "Surface command failed"); process.exitCode = 1; }
}
