/** Conservative named-namespace quota, not attribution of shared CAS objects.
 * Reservations survive failed writes and crashes; v1 has no implicit refund. */
import { constants } from "node:fs";
import { lstat, open, opendir } from "node:fs/promises";
import { join } from "node:path";
import { applicationId, applicationInt, applicationList, applicationObject, applicationTag } from "./application-contract";
import { AlgalError } from "./errors";
import { SHARED_LEASE_RETRY, hostLease, hostRead, hostWrite } from "./host-state";
import { canonicalize, type JsonValue } from "./values";

export const APPLICATION_QUOTA_LIMITS = Object.freeze({ applicationBytes: 256 * 1024 * 1024, aggregateBytes: 1024 * 1024 * 1024,
  // Each owner retains at most 256 records of 4096 bytes, four SQLite files
  // of 65536 bytes and a 4096-byte marker. Allow that future growth per owner.
  ownerHeadroom: 2 * 1024 * 1024, entries: 300_000, applicationEntries: 10_000, depth: 4 });
const fail = (message: string): never => { throw new AlgalError("BUDGET_EXHAUSTED", "Application namespace quota: " + message); };

async function measure(path: string, budget: {entries: number}, maximumEntries: number): Promise<number> {
  const start = budget.entries;
  async function visit(current: string, depth: number): Promise<number> {
    if (++budget.entries > APPLICATION_QUOTA_LIMITS.entries || budget.entries - start > maximumEntries || depth > APPLICATION_QUOTA_LIMITS.depth) fail("scan bound exceeded");
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) fail("symlink is not admitted");
    if (stat.isDirectory()) {
      let bytes = 0;
      for await (const entry of await opendir(current)) {
        bytes += await visit(join(current, entry.name), depth + 1);
        if (bytes > APPLICATION_QUOTA_LIMITS.aggregateBytes) fail("aggregate bytes exhausted");
      }
      return bytes;
    }
    if (!stat.isFile()) fail("nonregular file is not admitted");
    const file = await open(current, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const opened = await file.stat();
      if (!opened.isFile() || opened.size > APPLICATION_QUOTA_LIMITS.aggregateBytes) fail("file bytes/type exceeded");
      return opened.size;
    } finally { await file.close(); }
  }
  try { return await visit(path, 0); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") {
    // Only an absent namespace root is empty; disappearing descendants cannot
    // silently reduce a reservation under the trusted-filesystem contract.
    try { await lstat(path); } catch (rootError) { if ((rootError as NodeJS.ErrnoException).code === "ENOENT") return 0; }
  } throw error; }
}

/** The service passes the actual canonical namespace values it will publish.
 * Shared custody covers allocation and publication only, never live effects. */
export async function withApplicationQuota<T>(root: string, application: string, writes: JsonValue[], action: () => Promise<T>): Promise<T> {
  application = applicationId(application);
  if (!writes.length || writes.length > 64) fail("invalid publication count");
  const reservation = writes.reduce<number>((sum, value) => sum + 2 * Buffer.byteLength(canonicalize(value)), 0);
  const quota = join(root, ".application-quota");
  return hostLease(quota, "application-quota", async () => {
    const ledgerPath = join(quota, "ledger.json"), raw = await hostRead(ledgerPath, 8192);
    const charged = new Map<string, number>();
    if (raw !== undefined) {
      const ledger = applicationObject(raw, ["contract", "applications"]);
      applicationTag(ledger.contract, "algal.application-quota.v1");
      for (const row of applicationList(ledger.applications, 32, value => {
        const v = applicationObject(value, ["application", "bytes"]);
        return {application: applicationId(v.application), bytes: applicationInt(v.bytes, 0, APPLICATION_QUOTA_LIMITS.applicationBytes)};
      })) {
        if (charged.has(row.application)) fail("duplicate ledger identity");
        charged.set(row.application, row.bytes);
      }
    }
    const budget = {entries: 0}, applications = join(root, "applications");
    let common = await measure(quota, budget, APPLICATION_QUOTA_LIMITS.applicationEntries);
    let present = true;
    try { await lstat(applications); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") present = false; else throw error; }
    if (present) {
      const stat = await lstat(applications);
      if (!stat.isDirectory() || stat.isSymbolicLink()) fail("invalid namespace root");
      let count = 0;
      for await (const entry of await opendir(applications)) {
        if (++count > 33) fail("application count exceeded");
        // Stray regular files are shared residue: charged to the common
        // allocation, never admitted as an application namespace.
        if (entry.isFile() && !entry.isSymbolicLink()) { common += await measure(join(applications, entry.name), budget, APPLICATION_QUOTA_LIMITS.applicationEntries); continue; }
        if (!entry.isDirectory() || entry.isSymbolicLink()) fail("invalid namespace entry");
        const bytes = await measure(join(applications, entry.name), budget, APPLICATION_QUOTA_LIMITS.applicationEntries);
        if (entry.name === ".creation") { common += bytes; continue; }
        applicationId(entry.name);
        charged.set(entry.name, Math.max(charged.get(entry.name) ?? 0, bytes + APPLICATION_QUOTA_LIMITS.ownerHeadroom));
      }
    }
    charged.set(application, Math.max(charged.get(application) ?? 0, APPLICATION_QUOTA_LIMITS.ownerHeadroom) + reservation);
    if (charged.size > 32) fail("retained application count exceeded");
    if ([...charged.values()].some(bytes => bytes > APPLICATION_QUOTA_LIMITS.applicationBytes)) fail("per-application bytes exhausted");
    // Supervisor and quota owner each retain their own bounded recovery files.
    if ([...charged.values()].reduce((sum, bytes) => sum + bytes, common + 2 * APPLICATION_QUOTA_LIMITS.ownerHeadroom + 16_384) > APPLICATION_QUOTA_LIMITS.aggregateBytes) fail("aggregate bytes exhausted");
    await hostWrite(ledgerPath, {contract: "algal.application-quota.v1", applications: [...charged].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([application, bytes]) => ({application, bytes}))}, 8192, false);
    return action();
  }, SHARED_LEASE_RETRY);
}
