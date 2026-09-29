import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseOrganismManifest } from "./contract";
import { generateHabitatAuthorityKeyPair, grantDigest, signHabitatGrant } from "./habitat-link-authority";
import { LocalHabitatAcceptor } from "./habitat-link-host";
import { FileMailboxService } from "./mailbox";
import { ProcessSupervisor } from "./process";
import { serveHabitatLinkSocket } from "./habitat-link-socket";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });

function frameFor(request: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(request));
  const header = Buffer.alloc(4); header.writeUInt32BE(body.length);
  return Buffer.concat([header, body]);
}
function exchange(path: string, request: unknown): Promise<Record<string, unknown> | null> { return exchangeFrame(path, frameFor(request)); }
function exchangeFrame(path: string, frame: Buffer): Promise<Record<string, unknown> | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let written = 0;
    const send = (socket: Bun.Socket) => {
      const count = socket.write(frame.subarray(written));
      if (count < 0) { reject(new Error("socket write failed")); socket.terminate(); return; }
      written += count;
      // The frame length terminates the request. Keep the response channel
      // open until the server finishes the asynchronous acceptor operation.
    };
    void Bun.connect({ unix: path, allowHalfOpen: true, socket: {
      open(socket) { socket.timeout(5); send(socket); },
      drain: send,
      data(_socket, chunk) { chunks.push(Buffer.from(chunk)); },
      error(_socket, error) { reject(error); },
      timeout(socket) { socket.terminate(); reject(new Error("socket exchange timed out")); },
      close() {
        const bytes = Buffer.concat(chunks);
        if (bytes.length === 0) { resolve(null); return; }
        try { expect(bytes.readUInt32BE()).toBe(bytes.length - 4); resolve(JSON.parse(bytes.subarray(4).toString())); }
        catch (error) { reject(error); }
      },
      end(socket) { socket.end(); },
    } }).catch(reject);
  });
}

test("Unix bridge runs a granted process, polls its outputs, and refuses revoked replay/read", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-link-socket-"));
  cleanups.push(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "link.sock");
  const habitat = "h_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const sender = { habitat: "h_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const, principal: "caller" };
  const mailboxes = new FileMailboxService(dir);
  const supervisor = new ProcessSupervisor(dir, { mailboxes });
  const keys = generateHabitatAuthorityKeyPair();
  const grant = signHabitatGrant({ contract: "algal.habitat-grant.v1", issuer: habitat, subject: sender, audience: habitat, permissions: ["invoke", "message"], terms: { maxWork: 100, maxAgentCalls: 0, maxBytes: 1024, maxHops: 1 }, notBefore: 0, expires: 1000, nonce: "socket" }, keys.privateKey);
  const acceptor = new LocalHabitatAcceptor({ habitat, supervisor, mailboxes, trustedKeys: [grant.publicKey], now: () => 1 });
  acceptor.enroll(grant);
  const target = acceptor.register("echo", "run", parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:socket-echo", name: "Socket echo", budgets: { maxWork: 100, maxAgentCalls: 0 }, interface: { inputs: { value: { cell: "src", port: "value" } }, outputs: { value: { cell: "src", port: "value" } } }, cells: [{ id: "src", kind: "input", outputs: { value: "json" } }], edges: [] }));
  const listener = await serveHabitatLinkSocket({ path, acceptor, accepted: async (process) => { await supervisor.tick(process, true); } });
  cleanups.push(() => listener.close());
  const operationId = "0123456789abcdef0123456789abcdef";
  const invocation = { contract: "algal.habitat-invocation.v1", operationId, sender, target: { application: "echo", entrypoint: "run", ...target }, args: { value: "through socket" }, reply: { kind: "poll", reference: operationId }, terms: grant.terms, grant: grantDigest(grant) };
  const badOperation = "f".repeat(32);
  const trailing = frameFor({ ...invocation, operationId: badOperation });
  expect(await exchangeFrame(path, Buffer.concat([trailing, Buffer.from([0])]))).toBeNull();
  await expect(supervisor.inspect(`link-${badOperation}`)).rejects.toMatchObject({ code: "STORE_MISS" });
  const acceptance = await exchange(path, invocation);
  expect(acceptance?.process).toBe(`link-${operationId}`);
  const query = { contract: "algal.habitat-query.v1", operationId, sender, grant: grantDigest(grant) };
  const result = await exchange(path, query);
  expect(result?.status).toBe("complete");
  expect(result?.outputs).toEqual({ value: "through socket" });
  // Optional cross-repository qualification: the probe starts real Iroh endpoints
  // and routes each envelope through Valhalla's UnixHabitatLinkHandler.
  if (process.env.ALGAL_IROH_PROBE) {
    const probe = Bun.spawn([process.env.ALGAL_IROH_PROBE, path], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
    probe.stdin.write(JSON.stringify(invocation) + "\n" + JSON.stringify(query) + "\n");
    probe.stdin.end();
    const [stdout, stderr, code] = await Promise.all([new Response(probe.stdout).text(), new Response(probe.stderr).text(), probe.exited]);
    expect(code, stderr).toBe(0);
    const replies = stdout.trim().split("\n").map((line) => JSON.parse(line));
    expect(replies[0]).toMatchObject({ contract: "algal.habitat-acceptance.v1", replayed: true });
    expect(replies[1]).toMatchObject({ status: "complete", outputs: { value: "through socket" } });
  }
  expect(await exchange(path, { ...query, sender: { ...sender, principal: "intruder" } })).toBeNull();
  expect(await exchange(path, { ...query, extra: true })).toBeNull();
  const inbox = await mailboxes.create("socket-inbox");
  const message = { contract: "algal.habitat-message.v1", messageId: operationId, sender, recipient: inbox.send, body: { hello: "socket" }, grant: grantDigest(grant) };
  expect((await exchange(path, message))?.contract).toBe("algal.habitat-message-acceptance.v1");
  expect(await mailboxes.hasPending(inbox.receive)).toBe(true);
  acceptor.revoke(grantDigest(grant));
  expect(await exchange(path, invocation)).toBeNull();
  expect(await exchange(path, query)).toBeNull();
  expect(await exchange(path, message)).toBeNull();
  expect(() => acceptor.enroll(grant)).toThrow("revoked");
  expect((await supervisor.verify(`link-${operationId}`)).ok).toBe(true);
});
