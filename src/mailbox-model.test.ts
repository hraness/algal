import { expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestCanonical } from "./digest";
import { withDurableFsProbe } from "./durable-fs";
import { AlgalError } from "./errors";
import { FileMailboxService } from "./mailbox";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  return { promise: new Promise<void>(yes => { resolve = yes; }), resolve: () => resolve() };
}
async function bounded(promise: Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("mailbox checkpoint was not reached")), 5000); })]); }
  finally { clearTimeout(timer); }
}
async function deliveryBytes(root: string): Promise<Record<string, string>> {
  const entries: [string, string][] = [];
  for (const kind of ["messages", "pending", "consumed"]) {
    const base = join(root, "mailboxes", "model", kind);
    for (const name of (await readdir(base)).sort()) entries.push([`${kind}/${name}`, (await readFile(join(base, name))).toString("hex")]);
  }
  return Object.fromEntries(entries);
}

for (const right of ["send", "receive"] as const) test(`mailbox model: ${right} rechecks authority after a pre-lock revocation`, async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "algal-mailbox-model-race-")));
  const selected = deferred(), resume = deferred();
  let operation: Promise<{ ok: boolean; error?: unknown }> | undefined;
  try {
    const service = new FileMailboxService(root), config = await service.create("model", { maxMessages: 1, maxMessageBytes: 64 });
    await service.send(config.send, "retained", digestCanonical("seed"));
    const before = await deliveryBytes(root), lock = join(root, "mailboxes", "model", ".lock");
    let paused = false, acquired = 0;
    operation = withDurableFsProbe(async event => {
      if (event.step !== "create-lock" || event.path !== lock) return;
      if (event.phase === "after") { acquired++; return; }
      if (!paused) { paused = true; selected.resolve(); await resume.promise; }
    }, () => right === "send" ? service.send(config.send, "new", digestCanonical("new")) : service.receive(config.receive))
      .then(() => ({ ok: true }), error => ({ ok: false, error }));
    await bounded(selected.promise);
    await new FileMailboxService(root).revoke(config[right]);
    resume.resolve();
    const outcome = await operation;
    expect(paused).toBe(true); expect(acquired).toBe(1);
    expect(outcome).toMatchObject({ ok: false, error: { code: "CAPABILITY_DENIED", uncertain: false } });
    expect(await deliveryBytes(root)).toEqual(before);
    expect(await readdir(join(root, "mailboxes", "model"))).not.toContain(".lock");
  } finally {
    resume.resolve();
    if (operation) await operation;
    await rm(root, { recursive: true, force: true });
  }
}, 20_000);

test("mailbox model: an orphan claim still needs remaining capacity and a consumed retry never enqueues", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "algal-mailbox-model-orphan-")));
  try {
    const service = new FileMailboxService(root), config = await service.create("model", { maxMessages: 1, maxMessageBytes: 64 });
    const orphan = digestCanonical("orphan"), occupied = digestCanonical("occupied"), base = join(root, "mailboxes", "model");
    const marker = join(base, "pending", `${orphan.slice(7)}.json`), claim = join(base, "messages", `${orphan.slice(7)}.json`);
    let reached = false;
    await expect(withDurableFsProbe(event => {
      if (event.step === "link" && event.phase === "before" && event.target === marker) {
        reached = true; throw new AlgalError("IO_FAILED", "model cut before pending publication");
      }
    }, () => service.send(config.send, "orphan", orphan))).rejects.toMatchObject({ code: "IO_FAILED", uncertain: true });
    expect(reached).toBe(true);
    const retained = await readFile(claim);
    expect(await readdir(join(base, "pending"))).toEqual([]);
    const other = await service.send(config.send, "occupied", occupied);
    await expect(new FileMailboxService(root).send(config.send, "orphan", orphan)).rejects.toMatchObject({ code: "MAILBOX_FULL", uncertain: false });
    expect(await readFile(claim)).toEqual(retained);
    expect(await service.receive(config.receive)).toEqual({ id: other.id, message: "occupied" });
    const admitted = await service.send(config.send, "orphan", orphan);
    expect(await service.receive(config.receive)).toEqual({ id: admitted.id, message: "orphan" });
    expect(await new FileMailboxService(root).send(config.send, "orphan", orphan)).toEqual(admitted);
    expect(await readFile(claim)).toEqual(retained);
    expect(await readdir(join(base, "pending"))).toEqual([]);
    await expect(service.receive(config.receive)).rejects.toMatchObject({ code: "EFFECT_SUSPENDED", uncertain: false });
  } finally { await rm(root, { recursive: true, force: true }); }
}, 20_000);

test("mailbox model: failed caller return after transfer does not restore a dequeued message", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "algal-mailbox-model-return-")));
  try {
    const service = new FileMailboxService(root), config = await service.create("model", { maxMessages: 1, maxMessageBytes: 64 });
    const key = digestCanonical("lost return"), sent = await service.send(config.send, "message", key), base = join(root, "mailboxes", "model");
    let unlinked = false, failed = false;
    await expect(withDurableFsProbe(event => {
      if (event.step === "unlink-lock" && event.phase === "after" && event.path === join(base, ".lock")) unlinked = true;
      if (unlinked && event.step === "dir-sync" && event.phase === "after" && event.path === base) {
        failed = true; throw new AlgalError("IO_FAILED", "model cut after lock release barrier");
      }
    }, () => service.receive(config.receive))).rejects.toMatchObject({ code: "IO_FAILED", uncertain: true });
    expect(unlinked && failed).toBe(true);
    expect(await readdir(join(base, "pending"))).toEqual([]);
    expect(JSON.parse(await readFile(join(base, "consumed", `${key.slice(7)}.json`), "utf8"))).toEqual({ contract: "algal.mailbox-delivery.v1", id: sent.id });
    expect(await readdir(base)).not.toContain(".lock");
    const reopened = new FileMailboxService(root);
    await expect(reopened.receive(config.receive)).rejects.toMatchObject({ code: "EFFECT_SUSPENDED" });
    expect(await reopened.send(config.send, "message", key)).toEqual(sent);
    expect(await reopened.hasPending(config.receive)).toBe(false);
  } finally { await rm(root, { recursive: true, force: true }); }
}, 20_000);

test("mailbox model: uncertainty begins at a mutation attempt and survives release failure", async () => {
  for (const operation of ["send", "receive", "revoke", "retry", "pending"] as const) {
    for (const cut of ["admission", "publication", "release"] as const) {
      if (cut === "publication" && (operation === "retry" || operation === "pending")) continue;
      const root = await realpath(await mkdtemp(join(tmpdir(), "algal-mailbox-model-uncertainty-")));
      try {
        const service = new FileMailboxService(root), config = await service.create("model", { maxMessages: 1, maxMessageBytes: 64 });
        const key = digestCanonical("boundary"), base = join(root, "mailboxes", "model");
        if (operation !== "send" && operation !== "revoke") await service.send(config.send, "message", key);
        const publication = operation === "revoke" ? join(root, "capabilities") : join(base, operation === "send" ? "messages" : "consumed");
        let reached = false;
        const result = await withDurableFsProbe<unknown>(event => {
          const match = event.phase === "before" && (cut === "admission" ? event.step === "create-lock"
            : cut === "publication" ? event.step === "dir-sync" && event.path === publication
            : event.step === "unlink-lock");
          if (!reached && match) { reached = true; throw new AlgalError("IO_FAILED", "bounded mailbox failure", { retained: "diagnostic" }); }
        }, () => operation === "send" || operation === "retry" ? service.send(config.send, "message", key)
          : operation === "receive" ? service.receive(config.receive)
          : operation === "revoke" ? service.revoke(config.send) : service.hasPending(config.receive))
          .then(value => ({ value }), error => ({ error }));
        expect(reached).toBe(true);
        expect(result).toMatchObject({ error: { code: "IO_FAILED", message: "bounded mailbox failure", details: { retained: "diagnostic" },
          uncertain: cut !== "admission" && operation !== "retry" && operation !== "pending" } });
      } finally { await rm(root, { recursive: true, force: true }); }
    }
  }
}, 20_000);

test("mailbox model: an uncertain host failure keeps the original error report", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "algal-mailbox-model-error-")));
  try {
    const service = new FileMailboxService(root), config = await service.create("model", { maxMessages: 1, maxMessageBytes: 64 });
    const key = digestCanonical("unknown error");
    let reached = false;
    await expect(withDurableFsProbe(event => {
      if (event.step === "link" && event.phase === "after") {
        reached = true;
        throw Object.assign(new Error("raw filesystem diagnostic"), { code: "EIO" });
      }
    }, () => service.send(config.send, "message", key))).rejects.toMatchObject({ code: "INTERNAL", message: "raw filesystem diagnostic", uncertain: true });
    expect(reached).toBe(true);
    await expect(withDurableFsProbe(event => {
      if (event.step === "create-lock" && event.phase === "before") throw new AlgalError("IO_FAILED", "already uncertain", undefined, { uncertain: true });
    }, () => service.hasPending(config.receive))).rejects.toMatchObject({ code: "IO_FAILED", message: "already uncertain", uncertain: true });
  } finally { await rm(root, { recursive: true, force: true }); }
}, 20_000);
