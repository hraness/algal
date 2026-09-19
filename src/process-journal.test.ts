import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestCanonical } from "./digest";
import { ProcessJournal, type JournalBinding } from "./process-journal";
import { asObject, canonicalize, type JsonValue } from "./values";

const directories: string[] = [];
afterEach(async () => {
  for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true });
});
const intent = digestCanonical({ dispatch: 1 });
const manifest = digestCanonical({ manifest: 1 });
const binding: JournalBinding = {
  requestDigest: digestCanonical({ request: 1 }), executor: "admitted-provider",
  configurationDigest: digestCanonical({ configuration: 1 }),
  idempotencyKey: digestCanonical({ scope: 1 }), recovery: "never",
};
async function setup(maxRecoveries = 2) {
  const dir = await mkdtemp(join(tmpdir(), "algal-journal-contract-")); directories.push(dir);
  const journal = await ProcessJournal.create(dir, "actor", intent, manifest, maxRecoveries);
  return { dir, journal, path: join(dir, "processes", "actor", "journals", intent.slice(7)),
    open: () => ProcessJournal.open(dir, "actor", intent, manifest) };
}
const receipt = {
  requestDigest: binding.requestDigest, executor: "actual-provider", output: "done",
  configurationDigest: binding.configurationDigest,
};

describe("process effect journal invariants", () => {
  test("a header published before process intent is reusable only with its original admission", async () => {
    const { dir, path } = await setup();
    const before = await readFile(join(path, "header.json"), "utf8");
    const reopened = await ProcessJournal.create(dir, "actor", intent, manifest, 2);
    reopened.assertComplete();
    await expect(ProcessJournal.create(dir, "actor", intent, manifest, 3)).rejects.toThrow("conflicts");
    expect(await readFile(join(path, "header.json"), "utf8")).toBe(before);
    const ticket = await reopened.before(binding);
    await reopened.after(ticket.token!, receipt);
    await expect(ProcessJournal.create(dir, "actor", intent, manifest, 2)).rejects.toThrow("already has effect history");
  });

  test("receipt backend aliases are preserved but configuration must match admission", async () => {
    const good = await setup();
    const admitted = await good.journal.before(binding);
    await good.journal.after(admitted.token!, receipt);
    good.journal.assertComplete();
    const restored = await good.open();
    await restored.beginRecovery();
    expect((await restored.before(binding)).receipt).toEqual(receipt);
    restored.assertComplete();
    const bad = await setup();
    const pending = await bad.journal.before(binding);
    await expect(bad.journal.after(pending.token!, { ...receipt, configurationDigest: digestCanonical("different") })).rejects.toThrow("configuration");
    expect(() => bad.journal.assertComplete()).toThrow();
    await expect((await bad.open()).beginRecovery()).rejects.toThrow("unknown completion");
  });

  test("reopening rejects a rehashed result that claims another configuration", async () => {
    const { dir, path, journal, open } = await setup();
    const ticket = await journal.before(binding);
    await journal.after(ticket.token!, receipt);
    const report = asObject(journal.describe(), "journal");
    const effect = asObject((report.effects as JsonValue[])[0], "effect");
    const record = asObject(effect.record, "record");
    const forged = { ...record, receipt: { ...receipt, configurationDigest: digestCanonical("forged") } };
    const digest = digestCanonical(forged);
    await writeFile(join(dir, "values", `${digest.slice(7)}.json`), canonicalize(forged));
    await writeFile(join(path, "entries", "000000.json"), JSON.stringify({ contract: "algal.process-effect-head.v1", record: digest }));
    await expect(open()).rejects.toThrow("configuration");
  });

  test("concurrent callers cannot reserve the same live ordinal twice", async () => {
    const { journal } = await setup();
    const results = await Promise.allSettled([journal.before(binding), journal.before(binding)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(0);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(2);
    expect(() => journal.assertHealthy()).toThrow();
  });

  test("unpublished recognized crash residue is ignored and retained; unknown entries fail closed", async () => {
    const { path, open } = await setup();
    const temporary = join(path, "entries", `.tmp-${"a".repeat(48)}`);
    await writeFile(temporary, "partial unpublished bytes");
    const restored = await open();
    restored.assertComplete();
    expect(await readFile(temporary, "utf8")).toBe("partial unpublished bytes");
    await writeFile(join(path, "entries", "unrecognized"), "foreign");
    await expect(open()).rejects.toThrow("unexpected host state entry");
  });

  test("journal ancestors reject directory symlinks before writing outside the admitted store", async () => {
    const { dir } = await setup();
    const target = await mkdtemp(join(tmpdir(), "algal-journal-outside-")); directories.push(target);
    await mkdir(join(dir, "processes", "other"));
    await symlink(target, join(dir, "processes", "other", "journals"));
    await expect(ProcessJournal.create(dir, "other", intent, manifest)).rejects.toThrow("real directory");
    expect(await readdir(target)).toEqual([]);
  });

  test("read recovery attempts remain bounded across repeated process deaths", async () => {
    const { journal, open, path } = await setup(2);
    const readBinding: JournalBinding = { ...binding, recovery: "read" };
    await journal.before(readBinding);
    for (let i = 0; i < 2; i++) {
      const restarted = await open();
      await restarted.beginRecovery();
      expect((await restarted.before(readBinding)).token).toBeDefined();
    }
    await expect((await open()).beginRecovery()).rejects.toThrow("recovery budget exhausted");
    expect(await readdir(join(path, "recoveries"))).toHaveLength(2);
  });
});
