/** Fixture for Valhalla's two-runner Habitat Link qualification workflow.
 * Uses throwaway habitats and signed grants, with no tenant or provider credential.
 */
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { parseOrganismManifest } from "../src/contract";
import { digestCanonical } from "../src/digest";
import { generateHabitatAuthorityKeyPair, grantDigest, signHabitatDescriptor, signHabitatGrant, type HabitatGrant, type SignedHabitatDescriptor } from "../src/habitat-link-authority";
import { HABITAT_INVOKE, HabitatLinkService, LocalHabitatAcceptor, parseHabitatLinkReply, type HabitatLinkPeer } from "../src/habitat-link-host";
import { parseHabitatAcceptance, parseHabitatResult, type HabitatInvocation } from "../src/habitat-link";
import { serveHabitatLinkSocket } from "../src/habitat-link-socket";
import { FileMailboxService, mailboxToolRegistry } from "../src/mailbox";
import { ProcessSupervisor } from "../src/process";
import { mergeToolRegistries } from "../src/tools";
import type { RunReceipt } from "../src/run";

const config = await Bun.file(process.env.VHALLA_IROH_QUALIFICATION_CONFIG!).json() as { role: "host" | "client"; work: string; source_sha: string; run_id: string; run_attempt: string; nonce: string; machine: string };
const probePath = process.env.ALGAL_IROH_PROBE;
if (!probePath) throw new Error("ALGAL_IROH_PROBE required");
const work = config.work;
await mkdir(work, { recursive: true, mode: 0o700 });
const habitat = "h_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const sender = { habitat: "h_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const, principal: "caller" };
const endpointPath = join(work, "endpoint.json");
const stopPath = join(work, "stop");
const mailboxes = new FileMailboxService(join(work, "habitat"));
const endpointManifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:iroh-echo", name: "Iroh echo", budgets: { maxWork: 100, maxAgentCalls: 0 }, interface: { inputs: { value: { cell: "src", port: "value" } }, outputs: { value: { cell: "src", port: "value" } } }, cells: [{ id: "src", kind: "input", outputs: { value: "json" } }], edges: [] });
function ensure(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function waitFile(path: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (!(await Bun.file(path).exists())) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${path}`);
    await Bun.sleep(100);
  }
}

if (config.role === "host") {
  const supervisor = new ProcessSupervisor(join(work, "habitat"), { mailboxes });
  const keys = generateHabitatAuthorityKeyPair();
  const publicKey = keys.publicKey.export({ format: "der", type: "spki" }).toString("base64");
  const acceptor = new LocalHabitatAcceptor({ habitat, supervisor, mailboxes, now: Date.now, trustedKeys: [publicKey] });
  const target = acceptor.register("echo", "run", endpointManifest);
  const grant = signHabitatGrant({ contract: "algal.habitat-grant.v1", issuer: habitat, subject: sender, audience: habitat, permissions: ["invoke"], application: "echo", entrypoint: "run", interface: target.interface, manifest: target.manifest, terms: { maxWork: 100, maxAgentCalls: 0, maxBytes: 1024, maxHops: 1 }, notBefore: Date.now() - 1000, expires: Date.now() + 900_000, nonce: config.nonce }, keys.privateKey);
  acceptor.enroll(grant);
  let completed = false;
  const socketPath = join(work, "link.sock");
  const listener = await serveHabitatLinkSocket({ path: socketPath, acceptor, accepted: async (name) => { const snapshot = await supervisor.tick(name, true); completed ||= snapshot?.process.status === "complete"; } });
  const probe = Bun.spawn([probePath, "host", socketPath, endpointPath, stopPath], { stdout: "inherit", stderr: "inherit", stdin: "ignore" });
  try {
    await waitFile(endpointPath, 60_000);
    const endpoint = await Bun.file(endpointPath).json() as { endpoint_id: string; relay_url: string };
    const descriptor = signHabitatDescriptor({ contract: "algal.habitat-descriptor.v1", habitat, key: digestCanonical({ publicKey }), protocols: ["algal.habitat-link.v1"], transports: [{ kind: "iroh", base: endpoint.endpoint_id }], expires: grant.expires }, keys.privateKey);
    await Bun.write(join(work, "descriptor.tmp"), JSON.stringify({ source_sha: config.source_sha, run_id: config.run_id, run_attempt: config.run_attempt, nonce: config.nonce, machine: config.machine, endpoint, habitat, sender, target, grant, descriptor }));
    await rename(join(work, "descriptor.tmp"), join(work, "descriptor.json"));
    await waitFile(stopPath, 600_000);
    ensure(await probe.exited === 0, "Iroh host failed");
  } finally {
    if (probe.exitCode === null) probe.kill();
    await probe.exited;
    await listener.close();
  }
  await Bun.write(join(work, "host-result.json"), JSON.stringify({ stopped_on_request: true, service_joined: true, remote_process_completed: completed }));
} else {
  const remote = await Bun.file(join(work, "descriptor.json")).json() as { endpoint: unknown; machine: string; target: { manifest: `sha256:${string}`; interface: `sha256:${string}` }; grant: HabitatGrant; descriptor: SignedHabitatDescriptor };
  await Bun.write(endpointPath, JSON.stringify(remote.endpoint));
  async function exchange(value: unknown): Promise<Record<string, unknown>> {
    const probe = Bun.spawn([probePath!, "client", endpointPath], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
    probe.stdin.write(JSON.stringify(value) + "\n"); probe.stdin.end();
    const [stdout, stderr, exit] = await Promise.all([new Response(probe.stdout).text(), new Response(probe.stderr).text(), probe.exited]);
    ensure(exit === 0, `Iroh exchange failed: ${stderr}`);
    return JSON.parse(stdout.trim());
  }
  let submitted: HabitatInvocation | undefined;
  const peer: HabitatLinkPeer = {
    async invoke(request) { submitted = request; return parseHabitatAcceptance(await exchange(request)); },
    async getInvocation(operationId) { return parseHabitatResult(await exchange({ contract: "algal.habitat-query.v1", operationId, sender, grant: grantDigest(remote.grant) })); },
    async sendMessage() { throw new Error("message not used by invocation fixture"); },
  };
  const service = new HabitatLinkService({ habitat: sender.habitat, mailboxes, now: Date.now, trustedKeys: [remote.descriptor.publicKey] });
  service.connect(remote.descriptor, peer);
  const capability = service.admit({ capability: HABITAT_INVOKE, grant: remote.grant });
  const reply = await mailboxes.create("reply");
  const tools = mergeToolRegistries(mailboxToolRegistry(mailboxes), service.tools());
  const supervisor = new ProcessSupervisor(join(work, "habitat"), { mailboxes, tools });
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:iroh-caller", name: "Iroh caller",
    cells: [
      { id: "src", kind: "input", outputs: { peer: { type: "cap", capability: HABITAT_INVOKE }, reply: { type: "cap", capability: "mailbox-send" }, inbox: { type: "cap", capability: "mailbox-receive" }, application: "text", entrypoint: "text", manifest: "text", interface: "text", args: "json" } },
      { id: "call", kind: "tool", tool: "habitat.invoke.v1" },
      { id: "wait", kind: "tool", tool: "mailbox.receive.v1" },
    ],
    edges: [...["peer", "reply", "application", "entrypoint", "manifest", "interface", "args"].map((port) => ({ from: { cell: "src", port }, to: { cell: "call", port } })), { from: { cell: "src", port: "inbox" }, to: { cell: "wait", port: "mailbox" } }],
  });
  await supervisor.create("caller", manifest, { src: { peer: capability.handle, reply: reply.send, inbox: reply.receive, application: "echo", entrypoint: "run", ...remote.target, args: { value: config.nonce } } });
  ensure((await supervisor.tick("caller"))?.process.status === "suspended", "caller did not suspend");
  ensure(submitted, "no invocation submitted");
  const duplicate = parseHabitatAcceptance(await exchange(submitted));
  ensure(duplicate.replayed, "duplicate was not replayed");
  const denied = await exchange({ ...submitted, operationId: "0".repeat(32), grant: digestCanonical({ missing: config.nonce }) }) as { error?: string };
  ensure(denied.error === "handler_refused", "missing grant was not refused");
  ensure((await service.reconcile()).settled === 1, "result was not delivered");
  const resumed = await supervisor.schedule();
  ensure(resumed.ticks === 1 && resumed.processes[0]?.process.name === "caller" && resumed.processes[0].process.status === "complete", "same caller did not wake");
  const receipt = await supervisor.store.getReceipt(resumed.processes[0].process.receipt!) as RunReceipt;
  const result = parseHabitatLinkReply(receipt.cells.wait?.outputs?.message);
  ensure(JSON.stringify(result.result.outputs) === JSON.stringify({ value: config.nonce }), "remote result differs");
  ensure((await supervisor.verify("caller")).ok, "caller receipt failed verification");
  await Bun.write(join(work, "client-result.json"), JSON.stringify({ caller_woke: true, remote_result: true, grant_refused: true, exact_duplicate: true, forced_relay_paths_observed: true, host_machine: remote.machine }));
}
