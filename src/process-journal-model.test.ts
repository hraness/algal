import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestCanonical } from "./digest";
import { withDurableFsProbe } from "./durable-fs";
import { AlgalError } from "./errors";
import { JOURNAL_BOUNDS, ProcessJournal, type JournalBinding } from "./process-journal";

const directories: string[] = [];
afterEach(async () => { for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });
const intent = digestCanonical("model-intent"), manifest = digestCanonical("model-manifest");
const binding: JournalBinding = { requestDigest: digestCanonical("same-request"), executor: "model-provider",
  configurationDigest: digestCanonical("configuration"), idempotencyKey: digestCanonical("same-key"), recovery: "read" };
const receipt = (output: string) => ({ requestDigest: binding.requestDigest, executor: binding.executor, configurationDigest: binding.configurationDigest, output });
async function setup(maxRecoveries = 2) {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "algal-journal-model-"))); directories.push(dir);
  const journal = await ProcessJournal.create(dir, "actor", intent, manifest, maxRecoveries);
  return { journal, path: join(dir, "processes/actor/journals", intent.slice(7)), open: () => ProcessJournal.open(dir, "actor", intent, manifest) };
}

test("identical requests replay their own ordinal receipts and fresh ordinals admit fresh bindings", async () => {
  const { journal, open } = await setup();
  for (const output of ["first", "second"]) {
    const ticket = await journal.before(binding);
    await journal.after(ticket.token!, receipt(output));
  }
  journal.assertComplete();
  const restored = await open(); await restored.beginRecovery();
  expect(() => restored.assertComplete()).toThrow("fully consumed");
  expect(await restored.before(binding)).toEqual({ receipt: receipt("first") });
  expect(() => restored.assertComplete()).toThrow("fully consumed");
  expect(await restored.before(binding)).toEqual({ receipt: receipt("second") });
  restored.assertComplete();
  const fresh = { ...binding, configurationDigest: digestCanonical("new-unrecorded-configuration") };
  const ticket = await restored.before(fresh);
  expect(ticket.receipt).toBeUndefined(); expect(ticket.token).toBeDefined();
  await restored.after(ticket.token!, { ...receipt("third"), configurationDigest: fresh.configurationDigest });
  restored.assertComplete();
  const reopened = await open(); await reopened.beginRecovery();
  expect((await reopened.before(binding)).receipt?.output).toBe("first");
  expect((await reopened.before(binding)).receipt?.output).toBe("second");
  expect((await reopened.before(fresh)).receipt?.output).toBe("third");
  reopened.assertComplete();
});

test.each(["before", "after"] as const)("concurrent poison after %s publication refuses the returned admission", async stage => {
  const { journal, open, path } = await setup();
  const ticket = stage === "after" ? await journal.before(binding) : undefined;
  const entered = Promise.withResolvers<void>(), release = Promise.withResolvers<void>();
  let published = false, paused = false;
  const pending = withDurableFsProbe<unknown>(async event => {
    if (event.step === "replace" && event.phase === "after" && event.target === join(path, "entries/000000.json")) published = true;
    if (!paused && published && event.step === "dir-sync" && event.phase === "after" && event.path === join(path, "entries")) {
      paused = true; entered.resolve(); await release.promise;
    }
  }, () => stage === "before" ? journal.before(binding) : journal.after(ticket!.token!, receipt("durable")));
  // Observe failure immediately so a failed first operation never leaves an
  // unhandled rejection or a latch wait without an owner.
  const observed = pending.then(() => ({ ok: true as const }), error => ({ ok: false as const, error }));
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([entered.promise, observed.then(() => { throw new Error("journal completed before the publication barrier"); }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("publication barrier not reached")), 5000); })]);
    await expect(journal.before(binding)).rejects.toThrow("concurrent journal mutations");
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    release.resolve();
    // Collect the owned publication even when the barrier assertion fails,
    // before afterEach can remove its filesystem state.
    await observed;
  }
  const result = await observed;
  expect(paused).toBe(true); expect(result.ok).toBe(false);
  if (!result.ok) expect(String(result.error)).toContain("concurrent journal mutations");
  expect(() => journal.assertComplete()).toThrow("concurrent journal mutations");
  const restored = await open(); await restored.beginRecovery();
  const replay = await restored.before(binding);
  if (stage === "before") {
    expect(replay.receipt).toBeUndefined(); expect(replay.token).toBeDefined();
    await restored.after(replay.token!, receipt("recovered"));
  } else expect(replay).toEqual({ receipt: receipt("durable") });
  restored.assertComplete();
});

test("lost recovery-charge return remains charged through the real maximum of eight", async () => {
  expect(JOURNAL_BOUNDS.maxRecoveries).toBe(8);
  const { journal, open, path } = await setup(JOURNAL_BOUNDS.maxRecoveries);
  await journal.before(binding);
  const restored = await open(), cut = new AlgalError("IO_FAILED", "lost recovery-charge return");
  const directory = join(path, "recoveries"), charge = join(directory, "000001.json");
  let published = false, reached = false;
  await expect(withDurableFsProbe(event => {
    if (event.step === "link" && event.phase === "after" && event.target === charge) published = true;
    if (published && event.step === "dir-sync" && event.phase === "after" && event.path === directory) { reached = true; throw cut; }
  }, () => restored.beginRecovery())).rejects.toBe(cut);
  expect(reached).toBe(true);
  expect(JSON.parse(await readFile(charge, "utf8"))).toEqual({ contract: "algal.process-recovery-attempt.v1", intent, attempt: 1 });
  await expect(restored.before(binding)).rejects.toBe(cut);
  // Charges without dispatch model death/abandonment immediately after admission.
  for (let attempt = 2; attempt <= 8; attempt++) {
    await (await open()).beginRecovery();
    expect(await readdir(directory)).toHaveLength(attempt);
  }
  await expect((await open()).beginRecovery()).rejects.toThrow("recovery budget exhausted");
  expect(await readdir(directory)).toHaveLength(8);
  expect((await open()).describe()).toMatchObject({ effects: [{ record: { state: "started", attempt: 0 } }] });
});
