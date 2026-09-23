import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService } from "./application";
import { allowCustody, barrier, custodyDeadline, custodyHash, seedCustody } from "./fixtures/application-custody";
import { hostLease, hostRead, hostWrite } from "./host-state";

const directories: string[] = [];
async function directory() { const path = await mkdtemp(join(tmpdir(), "algal-custody-")); directories.push(path); return path; }
afterEach(async () => { for (const path of directories.splice(0)) await rm(path, { recursive: true, force: true }); });

test("three callers cannot acknowledge siblings across first-head custody selection", async () => {
  const oracle = await seedCustody(await directory());
  const expected = await oracle.service.create(oracle.create);
  const { service, create } = await seedCustody(await directory());
  const selected = barrier(), resumeLate = barrier(), admitted = barrier(), resumeLive = barrier();
  const lateCommand = { ...create, kind: "memory", expectedHead: expected.digest, operation: custodyHash("late") };
  const liveCommand = { ...lateCommand, operation: custodyHash("live") };
  const lateService = new ApplicationService(service.dir, allowCustody, { custodySelected: async () => { selected.release(); await resumeLate.promise; } });
  const liveService = new ApplicationService(service.dir, { async admitCommit() { admitted.release(); await resumeLive.promise; } });
  const late = lateService.commit(lateCommand).then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error: error as Error }));
  let live: ReturnType<ApplicationService["commit"]> | undefined;
  try {
    await custodyDeadline(selected.promise);
    expect((await service.create(create)).digest).toBe(expected.digest);
    live = liveService.commit(liveCommand);
    await custodyDeadline(admitted.promise);
    resumeLate.release();
    const contender = await late;
    resumeLive.release();
    const winner = await live;
    // The pre-fix schedule acknowledged both distinct children of the same H0.
    expect(contender.ok).toBe(false);
    if (!contender.ok) expect(contender.error.message).toContain("held by another live operation");
    expect(winner.state.previous).toBe(expected.digest);
    expect((await service.history("fixture")).map(row => row.digest)).toEqual([expected.digest, winner.digest]);
    await expect(service.commit(lateCommand)).rejects.toThrow("Stale application head");
    expect((await service.commit(liveCommand)).digest).toBe(winner.digest);
  } finally {
    resumeLate.release(); resumeLive.release();
    await late; await live?.catch(() => undefined);
  }
}, 20000);

test("selected first head stays under primary custody through public return", async () => {
  const { service, create } = await seedCustody(await directory());
  const published = barrier(), resume = barrier();
  const paused = new ApplicationService(service.dir, allowCustody, { fault: async point => {
    if (point === "head-published") { published.release(); await custodyDeadline(resume.promise); }
  } });
  const creating = paused.create(create);
  try {
    await custodyDeadline(published.promise);
    const initial = await service.inspect("fixture");
    expect(initial?.state.sequence).toBe(0);
    await expect(service.commit({ ...create, operation: custodyHash("after-publication"), kind: "memory", expectedHead: initial!.digest })).rejects.toThrow("held by another live operation");
    await expect(service.dispatchPending("fixture", { configurationDigest: custodyHash("unused"), async dispatch() { throw new Error("unexpected dispatch"); } })).rejects.toThrow("held by another live operation");
  } finally { resume.release(); await creating; }
  expect((await service.create(create)).state.sequence).toBe(0);
}, 20000);

test("different applications can both enter host admission before either returns", async () => {
  const root = await directory();
  const left = await seedCustody(root, "left"), right = await seedCustody(root, "right");
  const enteredLeft = barrier(), enteredRight = barrier(), resume = barrier();
  const admissions = [left, right].map(({ create }, index) => new ApplicationService(root, { async admitCommit() {
    (index === 0 ? enteredLeft : enteredRight).release(); await custodyDeadline(resume.promise);
  } }).create(create));
  try { await custodyDeadline(Promise.all([enteredLeft.promise, enteredRight.promise])); }
  finally { resume.release(); await Promise.allSettled(admissions); }
  const results = await Promise.all(admissions);
  expect(results.map(row => row.state.application)).toEqual(["left", "right"]);
  expect(results.map(row => row.state.sequence)).toEqual([0, 0]);
}, 20000);

test("prepared genesis can finish when all 32 namespace slots are occupied", async () => {
  const { service, create } = await seedCustody(await directory());
  const interrupted = new ApplicationService(service.dir, allowCustody, { fault: point => { if (point === "prepared") throw new Error("prepared interruption"); } });
  await expect(interrupted.create(create)).rejects.toThrow("prepared interruption");
  expect(await service.inspect("fixture")).toBeNull();
  for (let i = 1; i < 32; i++) await mkdir(join(service.dir, "applications", `prepared-${i}`));
  expect((await service.create(create)).state.sequence).toBe(0);
  expect((await service.history("fixture")).length).toBe(1);
  await expect(service.create({ ...create, application: "overflow" })).rejects.toThrow("Application count exhausted");
}, 20000);

test("permanent old-writer custody and legacy markers remain authoritative", async () => {
  const { service, create } = await seedCustody(await directory());
  const initial = await service.create(create);
  const path = join(service.dir, "applications", "fixture");
  let admitted = 0;
  const current = new ApplicationService(service.dir, { async admitCommit() { admitted++; } });
  const next = { ...create, operation: custodyHash("legacy-next"), kind: "memory", expectedHead: initial.digest };
  const held = barrier(), release = barrier();
  const owner = hostLease(path, "application-fixture", async () => { held.release(); await custodyDeadline(release.promise); });
  try {
    await custodyDeadline(held.promise);
    await expect(current.commit(next)).rejects.toThrow("held by another live operation");
    expect(admitted).toBe(0);
  } finally { release.release(); await owner; }
  const lock = join(path, ".lock");
  await hostWrite(lock, { contract: "legacy-unrecognized", pid: 1 }, 4096);
  const retained = await readFile(lock);
  await expect(current.commit(next)).rejects.toThrow("operator reconciliation");
  expect(await readFile(lock)).toEqual(retained);
  expect(admitted).toBe(0);
  // This fixture owns the malformed marker and removes only that exact file.
  await rm(lock);
  const nonce = "a".repeat(64), stale = { contract: "algal.process-owner.v2", process: "application-fixture", nonce };
  await hostWrite(lock, stale, 4096);
  expect((await current.commit(next)).state.sequence).toBe(1);
  expect(await hostRead(join(path, "owners", nonce + ".json"), 4096)).toEqual(stale);
  expect(admitted).toBe(1);
}, 20000);

test("failure releasing custody after head publication stays uncertain and reconcilable", async () => {
  const { service, create } = await seedCustody(await directory());
  const primary = join(service.dir, "applications", ".creation", "pending", "fixture", ".lock");
  const nonce = "b".repeat(64), replacement = { contract: "algal.process-owner.v2", process: "application-fixture", nonce };
  const changed = new ApplicationService(service.dir, allowCustody, { fault: async point => {
    if (point === "head-published") await hostWrite(primary, replacement, 4096, false);
  } });
  await expect(changed.create(create)).rejects.toMatchObject({ uncertain: true });
  const selected = await service.inspect("fixture");
  expect(selected?.state.sequence).toBe(0);
  expect((await service.create(create)).digest).toBe(selected!.digest);
  expect(await hostRead(join(service.dir, "applications", ".creation", "pending", "fixture", "owners", nonce + ".json"), 4096)).toEqual(replacement);
  expect((await service.history("fixture")).length).toBe(1);
}, 20000);
