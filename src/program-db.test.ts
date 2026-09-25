import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseOrganismManifest, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { externalWakeKey, FileMailboxService } from "./mailbox";
import { ProcessSupervisor } from "./process";
import { FileStore } from "./store";
import { canonicalize } from "./values";
import {
  buildProgramIndex,
  parseProgramQuery,
  programIndexStatus,
  runProgramProjection,
  runProgramQuery,
} from "./program-db";

const dirs: string[] = [];
async function directory() {
  const d = await mkdtemp(join(tmpdir(), "algal-db-test-"));
  dirs.push(d);
  return d;
}
afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true });
});

function receiver(): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:db-receive",
    name: "Wait for a message",
    cells: [
      {
        id: "src",
        kind: "input",
        outputs: { inbox: { type: "cap", capability: "mailbox-receive" } },
      },
      { id: "wait", kind: "tool", tool: "mailbox.receive.v1" },
    ],
    edges: [
      { from: { cell: "src", port: "inbox" }, to: { cell: "wait", port: "mailbox" } },
    ],
  });
}

function parent(childDigest: Digest): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:db-parent",
    name: "Parent",
    cells: [
      { id: "in", kind: "input", outputs: { payload: { type: "json" } } },
      { id: "child", kind: "organism", manifest: childDigest },
    ],
    edges: [],
  });
}

/** A full store fixture through the real drivers: a mailbox, a suspended
 * then completed process (two receipts, wake handles, process records),
 * two manifests linked by an organism cell, and a hand-assembled application
 * bundle (two revisions, one transition, one state, one evaluation, one
 * operation record, one dispatch record) — enough to pin every projection. */
async function fixture(dir: string) {
  const store = new FileStore(dir);
  const mailbox = new FileMailboxService(dir);
  const box = await mailbox.create("inbox");
  const child = receiver();
  const childDigest = await store.putManifest(child);
  const parentManifest = parent(childDigest);
  const parentDigest = await store.putManifest(parentManifest);
  const supervisor = new ProcessSupervisor(dir);
  const admission = await supervisor.create("actor", child, { src: { inbox: box.receive } });
  await supervisor.tick("actor");
  const key = externalWakeKey();
  await mailbox.send(box.send, { approve: true }, key);
  const restarted = new ProcessSupervisor(dir);
  await restarted.schedule();
  const aux = await store.putValue({ contract: "algal.test-aux.v1", tag: "aux" });
  const aux2 = await store.putValue({ contract: "algal.test-aux.v1", tag: "aux2" });
  const rev1 = await store.putValue({
    contract: "algal.application-revision.v1",
    application: "demo",
    parent: null,
    schema: aux, queries: aux, views: aux, runtimeProfile: aux, evaluationPolicy: aux,
    capabilityRequirements: [],
    entrypoints: [{ name: "main", manifest: childDigest, applicability: aux, maxGenerations: 4, capabilities: [], queries: [] }],
  });
  const rev2 = await store.putValue({
    contract: "algal.application-revision.v1",
    application: "demo",
    parent: rev1,
    schema: aux, queries: aux, views: aux, runtimeProfile: aux, evaluationPolicy: aux,
    capabilityRequirements: [],
    entrypoints: [{ name: "main", manifest: parentDigest, applicability: aux, maxGenerations: 4, capabilities: [], queries: [] }],
  });
  const transition = await store.putValue({
    contract: "algal.application-transition.v1",
    application: "demo", operation: aux, request: aux, kind: "create",
    previous: null, revision: rev1, memory: aux, intents: [], evidence: [], causedBy: null,
  });
  const state0 = await store.putValue({
    contract: "algal.application-state.v1",
    application: "demo", sequence: 0, epoch: 0, revision: rev1,
    memory: aux, previous: null, transition,
  });
  await store.putValue({
    contract: "algal.application-evaluation.v1",
    request: aux, parentState: state0, candidateRevision: rev1,
    cases: aux, scorer: aux, policy: aux, foundryReport: aux, compatibility: aux,
    verdict: { status: "accepted", selectedManifest: childDigest },
  });
  const appDir = join(dir, "applications", "demo");
  await mkdir(join(appDir, "operations"), { recursive: true });
  await mkdir(join(appDir, "outbox"), { recursive: true });
  await writeFile(
    join(appDir, "head.json"),
    canonicalize({ contract: "algal.application-head.v1", application: "demo", state: state0 }),
  );
  await writeFile(
    join(appDir, "operations", `${aux.slice(7)}.json`),
    canonicalize({
      contract: "algal.application-operation.v1", application: "demo",
      operation: aux, request: aux, transition, state: state0,
    }),
  );
  await writeFile(
    join(appDir, "outbox", `${aux2.slice(7)}.json`),
    canonicalize({
      contract: "algal.application-dispatch.v1", application: "demo",
      intent: aux2, sourceState: state0, configurationDigest: aux, identity: aux,
      plan: { kind: "delivery", recipient: `cap:mailbox-send:sha256:${"0".repeat(64)}`, hostProfile: aux },
      status: "blocked", result: null, reason: "mailbox full",
    }),
  );
  return { store, box, child, childDigest, parentDigest, admission, rev1, rev2, state0, transition };
}

const hex = (ch: string) => ch.repeat(64 / ch.length);

test("empty store builds a readable index with zeroed relations", async () => {
  const dir = await directory();
  const report = await buildProgramIndex(dir);
  expect(report.schema).toBe("algal.program-db.v1");
  expect(report.records.manifests).toBe(0);
  expect(report.records.receipts).toBe(0);
  expect(report.skippedTotal).toBe(0);
  const status = await programIndexStatus(dir);
  expect(status.indexed).toBe(true);
  expect(status.stale).toBe(false);
  const rows = runProgramQuery(dir, { table: "manifests" });
  expect(rows.rows).toEqual([]);
  expect(rows.truncated).toBe(false);
});

test("index materializes store relations and every projection", async () => {
  const dir = await directory();
  const f = await fixture(dir);
  const report = await buildProgramIndex(dir);
  expect(report.skippedTotal).toBe(0);
  expect(report.records.manifests).toBe(2);
  expect(report.records.receipts).toBe(2);
  // ready + suspended + complete generations plus the uncertain intent
  // records the supervisor journals around each dispatch.
  expect(report.records.process_records).toBe(5);
  expect(report.records.processes).toBe(1);
  expect(report.records.app_revisions).toBe(2);
  expect(report.records.app_states).toBe(1);
  expect(report.records.app_evaluations).toBe(1);
  expect(report.records.app_operations).toBe(1);
  expect(report.records.app_dispatches).toBe(1);

  const callers = runProgramProjection(dir, "callers-of", [f.childDigest]);
  expect(callers.rows).toEqual([
    { digest: f.parentDigest, cell: "child", kind: "organism", key: "organism:db-parent", name: "Parent" },
  ]);

  const revisions = runProgramProjection(dir, "revisions-for-executable", [f.childDigest]);
  // rev1 runs the child directly; rev2's entrypoint embeds it through the parent.
  expect(revisions.rows).toEqual([
    { digest: f.rev1, application: "demo", parent_digest: null, entrypoint: "main" },
    { digest: f.rev2, application: "demo", parent_digest: f.rev1, entrypoint: "main" },
  ]);

  const touching = runProgramProjection(dir, "receipts-touching-capability", ["mailbox-receive"]);
  expect(touching.rows.length).toBeGreaterThan(0);
  for (const row of touching.rows) expect(["arg", "wake"]).toContain(row.source as string);

  const unevaluated = runProgramProjection(dir, "unevaluated-revisions");
  expect(unevaluated.rows).toEqual([
    { digest: f.rev2, application: "demo", parent_digest: f.rev1 },
  ]);

  const largest = runProgramProjection(dir, "largest-work");
  expect(largest.rows.length).toBe(2);
  expect((largest.rows[0]!.work_units as number) >= (largest.rows[1]!.work_units as number)).toBe(true);

  const status = runProgramProjection(dir, "process-status");
  expect(status.rows).toEqual([{ status: "complete", processes: 1 }]);

  const kinds = runProgramProjection(dir, "kinds", [], { limit: 1024 });
  const bucket = (place: string, contract: string | null) =>
    kinds.rows.find((r) => r.place === place && r.contract === contract)?.files as number | undefined;
  expect(bucket("manifests", "algal.organism.v1")).toBe(2);
  expect(bucket("runs", "algal.run.v1")).toBe(2);
  expect(bucket("values", "algal.process.v1")).toBe(5);
  expect(bucket("applications", "algal.application-head.v1")).toBe(1);
  expect(bucket("mailboxes", "algal.mailbox.v1")).toBe(1);

  const composed = runProgramQuery(dir, {
    table: "cell_ports",
    columns: ["cell", "port", "capability"],
    where: [{ column: "capability", op: "eq", value: "mailbox-receive" }],
    order: [{ column: "cell" }],
    limit: 10,
  });
  expect(composed.rows).toEqual([{ cell: "src", port: "inbox", capability: "mailbox-receive" }]);

  const processes = runProgramQuery(dir, {
    table: "processes",
    where: [{ column: "status", op: "eq", value: "complete" }, { column: "receipt_digest", op: "not-null" }],
  });
  expect(processes.rows.length).toBe(1);
  expect(processes.rows[0]!.name).toBe("actor");
});

test("query parser rejects unknown keys, tables, columns, and oversize limits", async () => {
  const dir = await directory();
  await buildProgramIndex(dir);
  const bad = (query: unknown) => expect(() => runProgramQuery(dir, query)).toThrow(AlgalError);
  bad({ table: "cells", bogus: 1 });
  bad({ table: "sqlite_master" });
  bad({ table: "cells", where: [{ column: "x' OR 1=1--", op: "eq", value: "y" }] });
  bad({ table: "cells", where: [{ column: "kind", op: "drop", value: "x" }] });
  bad({ table: "cells", where: [{ column: "kind", op: "eq" }] });
  bad({ table: "cells", where: [{ column: "kind", op: "null", value: "x" }] });
  bad({ table: "cells", where: [{ column: "cells", op: "eq", value: "x" }] }); // integer column, string value
  bad({ table: "cells", order: [{ column: "kind", direction: "sideways" }] });
  bad({ table: "cells", limit: 0 });
  bad({ table: "cells", limit: 2000 });
  bad({ table: "cells", where: [{ column: "kind", op: "in", value: [] }] });
  bad({ table: "cells", where: [{ column: "kind", op: "like", value: "tool" }].concat(
    Array.from({ length: 40 }, () => ({ column: "kind", op: "eq", value: "x" })) as never) });
  bad("select * from cells");
  bad({ table: "cells", columns: [] });
  // Over 8 KiB of JSON refuses before parsing finishes.
  bad({ table: "cells", where: [{ column: "kind", op: "eq", value: "x".repeat(9000) }] });
  expect(() => parseProgramQuery({ table: "cells" })).not.toThrow();
});

test("row and result caps mark oversized answers truncated", async () => {
  const dir = await directory();
  await fixture(dir);
  await buildProgramIndex(dir);
  const one = runProgramQuery(dir, { table: "receipts", limit: 1 });
  expect(one.rows.length).toBe(1);
  expect(one.truncated).toBe(true);
  const pinched = runProgramQuery(dir, { table: "receipts", limit: 8 }, { limits: { maxResultBytes: 256 } });
  expect(pinched.truncated).toBe(true);
  expect(pinched.rows.length).toBeLessThan(8);
});

test("malformed and foreign records are counted and skipped, never fatal", async () => {
  const dir = await directory();
  const store = new FileStore(dir);
  const good = await store.putValue({ contract: "algal.test-aux.v1", tag: "ok" });
  await mkdir(join(dir, "manifests"), { recursive: true });
  await mkdir(join(dir, "values"), { recursive: true });
  await mkdir(join(dir, "runs"), { recursive: true });
  // Foreign name inside a CAS place.
  await writeFile(join(dir, "manifests", "notes.txt"), "hello");
  // Hex-named but not JSON.
  await writeFile(join(dir, "manifests", `${hex("ab")}.json`), "not json");
  // Valid JSON whose canonical digest does not match the file name.
  await writeFile(join(dir, "values", `${hex("cd")}.json`), canonicalize({ contract: "algal.test-aux.v1", tag: "forged" }));
  // Claims a known contract but fails its record parser.
  const badProcess = canonicalize({ contract: "algal.process.v1", bogus: true });
  await writeFile(join(dir, "values", `${digestCanonical(JSON.parse(badProcess)).slice(7)}.json`), badProcess);
  // A receipt that parses as JSON but fails the receipt contract.
  const badReceipt = canonicalize({ contract: "algal.run.v1", nonsense: [] });
  await writeFile(join(dir, "runs", `${digestCanonical(JSON.parse(badReceipt)).slice(7)}.json`), badReceipt);
  const report = await buildProgramIndex(dir);
  expect(report.skippedTotal).toBe(5);
  const reasons = new Map(report.skipped.map((s) => [`${s.place}/${s.name}`, s.reason]));
  expect(reasons.get("manifests/notes.txt")).toBe("foreign name");
  expect(reasons.get(`manifests/${hex("ab")}.json`)).toMatch(/JSON|unexpected/i);
  expect(reasons.get(`values/${hex("cd")}.json`)).toMatch(/does not hash/);
  expect(reasons.get(`values/${digestCanonical(JSON.parse(badProcess)).slice(7)}.json`)).toBeTruthy();
  expect(reasons.get(`runs/${digestCanonical(JSON.parse(badReceipt)).slice(7)}.json`)).toBeTruthy();
  // The good record and the well-named malformed process record are indexed
  // as values (the latter carries its contract tag but no typed row); the
  // forged file is absent everywhere.
  const values = runProgramQuery(dir, { table: "values_index", limit: 64 });
  expect(values.rows.map((r) => r.digest).sort()).toEqual(
    [good, digestCanonical(JSON.parse(badProcess))].sort(),
  );
  expect(runProgramQuery(dir, { table: "process_records", limit: 64 }).rows).toEqual([]);
  const status = await programIndexStatus(dir);
  expect(status.stale).toBe(false);
});

test("value byte cap and file count cap bound the walk deterministically", async () => {
  const dir = await directory();
  const store = new FileStore(dir);
  const small = await store.putValue({ contract: "algal.test-aux.v1", tag: "small" });
  const large = await store.putValue({ contract: "algal.test-aux.v1", tag: "x".repeat(2048) });
  const report = await buildProgramIndex(dir, { limits: { maxValueBytes: 64 } });
  expect(report.skippedTotal).toBe(1);
  expect(report.skipped[0]).toMatchObject({ place: "values", name: `${large.slice(7)}.json` });
  const values = runProgramQuery(dir, { table: "values_index", limit: 64 });
  expect(values.rows.map((r) => r.digest)).toEqual([small]);
  // maxFiles caps the place listing; the overflow is fingerprinted as truncated.
  const dir2 = await directory();
  const store2 = new FileStore(dir2);
  await store2.putValue({ a: 1 });
  await store2.putValue({ b: 2 });
  await store2.putValue({ c: 3 });
  const capped = await buildProgramIndex(dir2, { limits: { maxFiles: 2 } });
  expect(capped.state.places.values.truncated).toBe(true);
  expect(capped.state.places.values.entries).toBe(2);
  const cappedStatus = await programIndexStatus(dir2, { limits: { maxFiles: 2 } });
  expect(cappedStatus.stale).toBe(false);
});

test("index-versus-store drift reports per place and clears on rebuild", async () => {
  const dir = await directory();
  const f = await fixture(dir);
  await buildProgramIndex(dir);
  const clean = await programIndexStatus(dir);
  expect(clean.indexed).toBe(true);
  expect(clean.stale).toBe(false);
  expect(clean.digest.indexed).toBe(clean.digest.current);
  // A new store value drifts values/ only.
  await f.store.putValue({ contract: "algal.test-aux.v1", tag: "after" });
  const drifted = await programIndexStatus(dir);
  expect(drifted.stale).toBe(true);
  expect(drifted.places?.values.match).toBe(false);
  expect(drifted.places?.manifests.match).toBe(true);
  expect(drifted.digest.indexed).not.toBe(drifted.digest.current);
  // A mutable head move drifts processes/ too.
  await mkdir(join(dir, "processes", "orphan"), { recursive: true });
  await writeFile(
    join(dir, "processes", "orphan", "head.json"),
    canonicalize({ contract: "algal.process-head.v1", name: "orphan", record: f.rev1 }),
  );
  const drifted2 = await programIndexStatus(dir);
  expect(drifted2.places?.processes.match).toBe(false);
  const rebuilt = await buildProgramIndex(dir);
  expect(rebuilt.skippedTotal).toBe(0);
  const healed = await programIndexStatus(dir);
  expect(healed.stale).toBe(false);
  // A head pointing at a non-process record lands with nulls.
  const orphan = runProgramQuery(dir, { table: "processes", where: [{ column: "name", op: "eq", value: "orphan" }] });
  expect(orphan.rows[0]!.status).toBeNull();
  // No index at all reports indexed:false without failing.
  const bare = await directory();
  const absent = await programIndexStatus(bare);
  expect(absent.indexed).toBe(false);
  expect(absent.places).toBeUndefined();
  expect(absent.digest.indexed).toBeNull();
});

test("queries refuse cleanly when no index exists", async () => {
  const dir = await directory();
  expect(() => runProgramQuery(dir, { table: "manifests" })).toThrow(AlgalError);
  expect(() => runProgramQuery(dir, { table: "manifests" })).toThrow(/algal db build/);
  expect(() => runProgramProjection(dir, "nope")).toThrow(/unknown projection/);
});
