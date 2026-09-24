import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService, type ApplicationCommand } from "./application";
import { putApplicationRecord } from "./application-contract";
import {
  CONTENTION_LIMITS, parseApplicationContention,
  produceApplicationContention, verifyApplicationContention,
} from "./application-contention";
import { digestCanonical } from "./digest";
import { parseOrganismManifest } from "./contract";
import { FileStore } from "./store";
import type { JsonValue } from "./values";

const directories: string[] = [];
afterEach(async () => { for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });
const hash = (value: unknown) => digestCanonical(value as JsonValue);

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "algal-contention-")); directories.push(dir);
  const store = new FileStore(dir), put = (v: unknown) => store.putValue(v as JsonValue);
  const service = new ApplicationService(dir, { async admitCommit() {} });
  const manifest = await store.putManifest(parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:contention-fixture", name: "fixture",
    cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [],
  }));
  const schema = await put({ contract: "algal.schema.fixture.v1" });
  const queries = await put({ contract: "algal.queries.fixture.v1" });
  const views = await put({ contract: "algal.views.fixture.v1" });
  const runtime = await put({ contract: "algal.runtime.fixture.v1" });
  const policy = await put({ contract: "algal.policy.fixture.v1" });
  const applicability = await put({ contract: "algal.query.fixture.v1" });
  const revision = await put({ contract: "algal.application-revision.v1", application: "fixture", parent: null, schema, queries, views, runtimeProfile: runtime, evaluationPolicy: policy, capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability, maxGenerations: 1, capabilities: [], queries: [applicability] }] });
  const memory = await put({ contract: "algal.memory.fixture.v1", facts: [] });
  const genesis = await service.create({ application: "fixture", operation: hash("create"), kind: "create", expectedHead: null, revision, memory, intents: [], evidence: [], causedBy: null });
  const command = (operation: string, extra: Record<string, unknown> = {}): ApplicationCommand => ({
    application: "fixture", operation: hash(operation), kind: "memory", expectedHead: genesis.digest,
    revision, memory, intents: [], evidence: [], causedBy: null, ...extra,
  }) as ApplicationCommand;
  return { dir, put, store, service, revision, memory, genesis, command };
}

describe("algal.application-contention.v1", () => {
  test("produces and verifies a retained race: one winner, stale-head losers", async () => {
    const f = await fixture();
    const attempts = [f.command("loser-a"), f.command("winner"), f.command("loser-b")];
    const produced = await produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts });
    const { record, contention } = produced;
    expect(record.contract).toBe("algal.application-contention.v1");
    expect(record.parentState).toBe(f.genesis.digest);
    expect(record.attempts).toHaveLength(3);
    // Attempts are sorted unique by command digest regardless of input order.
    const refs = record.attempts.map(a => a.command);
    expect(refs).toEqual([...refs].sort());
    const committed = record.attempts.filter(a => a.status === "committed");
    expect(committed).toHaveLength(1);
    expect(committed[0]!.command).toBe(record.winner);
    expect(committed[0]!.reason).toBeUndefined();
    for (const attempt of record.attempts.filter(a => a.status === "rejected")) {
      expect(attempt.reason).toBe("Stale application head");
    }
    // The winner is the first committed attempt — input order decides the race.
    expect(record.winner).toBe(await putApplicationRecord(f.store, attempts[0]!));
    expect(produced.snapshot.state.previous).toBe(f.genesis.digest);
    // Verification is side-effect free and passes.
    const verified = await verifyApplicationContention(f.service, contention);
    expect(verified.winner).toBe(record.winner);
    // The history grew by exactly the winning transition.
    expect((await f.service.history("fixture")).map(s => s.state.sequence)).toEqual([0, 1]);
  });

  test("production is idempotent: replaying the race reproduces the same record", async () => {
    const f = await fixture();
    const attempts = [f.command("first"), f.command("second")];
    const produced = await produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts });
    // The winner's committed operation replays idempotently; losers still
    // fence — the second run derives the identical record digest.
    const replayed = await produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts });
    expect(replayed.contention).toBe(produced.contention);
    expect(replayed.record).toEqual(produced.record);
  });

  test("a single committed attempt is a valid degenerate race", async () => {
    const f = await fixture();
    const produced = await produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts: [f.command("solo")] });
    expect(produced.record.attempts).toEqual([{ command: produced.record.winner, status: "committed" }]);
    await verifyApplicationContention(f.service, produced.contention);
  });

  test("a later valid commit using the losing operation invalidates its old stale-head evidence", async () => {
    const f = await fixture(), winner = f.command("winner"), loser = f.command("reused-loser");
    const produced = await produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts: [winner, loser] });
    expect((await verifyApplicationContention(f.service, produced.contention)).winner).toBe(produced.record.winner);
    const retained = await f.store.getValue(produced.contention);
    const later = await f.service.commit({ ...loser, expectedHead: produced.snapshot.digest });
    expect(later.transition.operation).toBe(loser.operation);
    // Verification re-derives rejection against current history. The unchanged
    // record's former stale-head reason no longer describes this operation.
    await expect(verifyApplicationContention(f.service, produced.contention)).rejects.toThrow("not reproducible");
    await expect(f.service.commit(loser)).rejects.toThrow("another request");
    expect(await f.store.getValue(produced.contention)).toEqual(retained);
    expect((await f.service.inspect("fixture"))!.digest).toBe(later.digest);
    expect((await f.service.history("fixture")).map(row => row.transition.operation)).toEqual([f.genesis.transition.operation, winner.operation, loser.operation]);
  });

  test("production rejects malformed races before committing", async () => {
    const f = await fixture();
    const later = await f.service.commit(f.command("advance"));
    // Attempts must race the same declared parent.
    await expect(produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts: [f.command("x"), f.command("y", { expectedHead: later.digest })] })).rejects.toThrow("does not race the expected head");
    // Duplicate commands are not a race.
    const dup = f.command("dup");
    await expect(produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts: [dup, dup] })).rejects.toThrow("unique");
    // Commands for another application cannot join the race.
    await expect(produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts: [f.command("a"), f.command("b", { application: "foreign" })] })).rejects.toThrow("one application");
    // Bound checks: empty and oversized attempt lists.
    await expect(produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts: [] })).rejects.toThrow("bound");
    await expect(produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts: Array.from({ length: CONTENTION_LIMITS.attempts + 1 }, (_, i) => f.command(`c${i}`)) })).rejects.toThrow("bound");
    // A non-stale-head failure aborts production without a record: the
    // revision is missing so the first commit cannot be constructed.
    await expect(produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts: [f.command("bad", { revision: hash("missing-revision") })] })).rejects.toThrow();
    // The failed production committed nothing new (only the `advance` state).
    expect((await f.service.history("fixture")).map(s => s.state.sequence)).toEqual([0, 1]);
  });

  test("verification rejects a winner that is not the committed child", async () => {
    const f = await fixture();
    const attempts = [f.command("w"), f.command("l")];
    const produced = await produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts });
    // Swap the declared winner for the losing command: parse itself refuses
    // because exactly one committed attempt must equal the winner — so forge
    // a record that flips the statuses instead.
    const forged = await putApplicationRecord(f.store, {
      contract: "algal.application-contention.v1", parentState: f.genesis.digest,
      attempts: produced.record.attempts.map(a => a.command === produced.record.winner
        ? { command: a.command, status: "rejected", reason: "Stale application head" }
        : { command: a.command, status: "committed" })[0]
        ? produced.record.attempts.map(a => a.command === produced.record.winner
            ? { command: a.command, status: "rejected", reason: "Stale application head" }
            : { command: a.command, status: "committed" })
        : [],
      winner: produced.record.attempts.find(a => a.command !== produced.record.winner)!.command,
    });
    await expect(verifyApplicationContention(f.service, forged)).rejects.toThrow("not committed on the expected head");
  });

  test("verification rejects losers whose rejection is not reproducible", async () => {
    const f = await fixture();
    const attempts = [f.command("win"), f.command("lose")];
    const produced = await produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts });
    const loser = produced.record.attempts.find(a => a.status === "rejected")!;
    // Claim the loser was rejected for a reason the lifecycle would not
    // derive — its operation was never committed, so "already committed" is
    // not reproducible.
    const forged = await putApplicationRecord(f.store, {
      contract: "algal.application-contention.v1", parentState: f.genesis.digest,
      attempts: produced.record.attempts.map(a => a.command === loser.command
        ? { command: a.command, status: "rejected", reason: "Operation already committed in application history" }
        : a),
      winner: produced.record.winner,
    });
    await expect(verifyApplicationContention(f.service, forged)).rejects.toThrow("not reproducible");
    // A loser whose command does not race the recorded parent is refused at
    // the binding check.
    const other = f.command("other", { expectedHead: (await f.service.inspect("fixture"))!.digest });
    const otherRef = await putApplicationRecord(f.store, other);
    const foreign = await putApplicationRecord(f.store, {
      contract: "algal.application-contention.v1", parentState: f.genesis.digest,
      attempts: [...produced.record.attempts, { command: otherRef, status: "rejected", reason: "Stale application head" }].sort((a, b) => (a.command < b.command ? -1 : 1)),
      winner: produced.record.winner,
    });
    await expect(verifyApplicationContention(f.service, foreign)).rejects.toThrow("does not race the expected head");
  });

  test("verification rejects a contention whose parent is outside the history", async () => {
    const f = await fixture();
    const produced = await produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts: [f.command("w1"), f.command("l1")] });
    // Re-root the record on a state digest that exists nowhere in history —
    // every command still parses but the parent lookup fails.
    const orphan = hash("no-such-state");
    const forged = await putApplicationRecord(f.store, { ...produced.record, parentState: orphan });
    await expect(verifyApplicationContention(f.service, forged)).rejects.toThrow("does not race the expected head");
  });

  test("parse rejects malformed records", async () => {
    const f = await fixture();
    const produced = await produceApplicationContention(f.service, { parentState: f.genesis.digest, attempts: [f.command("pw"), f.command("pl")] });
    const r = produced.record;
    const [a, b] = r.attempts;
    // Unsorted attempts.
    expect(() => parseApplicationContention({ ...r, attempts: [b!, a!] })).toThrow("sorted and unique");
    // Duplicate attempts.
    expect(() => parseApplicationContention({ ...r, attempts: [a!, a!] })).toThrow("sorted and unique");
    // Zero committed.
    expect(() => parseApplicationContention({ ...r, attempts: r.attempts.map(x => ({ command: x.command, status: "rejected", reason: "Stale application head" })) })).toThrow("exactly one committed");
    // Two committed.
    expect(() => parseApplicationContention({ ...r, winner: a!.command, attempts: r.attempts.map(x => ({ command: x.command, status: "committed" })) })).toThrow("exactly one committed");
    // Committed with a reason / rejected without one.
    expect(() => parseApplicationContention({ ...r, attempts: r.attempts.map(x => x.status === "committed" ? { ...x, reason: "why" } : x) })).toThrow("status/reason mismatch");
    expect(() => parseApplicationContention({ ...r, attempts: r.attempts.map(x => x.status === "rejected" ? { command: x.command, status: "rejected" } : x) })).toThrow("status/reason mismatch");
    // Unknown fields and tag errors.
    expect(() => parseApplicationContention({ ...r, extra: 1 })).toThrow("Unknown or missing");
    expect(() => parseApplicationContention({ ...r, contract: "algal.other.v1" })).toThrow();
    expect(() => parseApplicationContention({ ...r, attempts: [{ command: "x", status: "committed" }], winner: a!.command })).toThrow();
    // Winner that is not the committed attempt.
    expect(() => parseApplicationContention({ ...r, winner: b!.command === r.winner ? a!.command : b!.command })).toThrow("exactly one committed");
  });
});
