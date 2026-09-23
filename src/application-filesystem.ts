/** Existing filesystem ABI and owner leases for the portable lifecycle. */
import { lstat, opendir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { APPLICATION_LIMITS, applicationId, applicationRef } from "./application-contract";
import { APPLICATION_SERVICE_LIMITS } from "./application-core";
import { withApplicationQuota } from "./application-quota";
import type { ApplicationStorage } from "./application-storage";
import type { Digest } from "./digest";
import { SHARED_LEASE_RETRY, hostDirectory, hostLease, hostNames, hostRead, hostWrite } from "./host-state";
import { FileStore } from "./store";
import type { JsonValue } from "./values";

export class FileApplicationStorage implements ApplicationStorage {
  readonly dir: string;
  readonly store: FileStore;
  constructor(dir: string) { this.dir = resolve(dir); this.store = new FileStore(this.dir); }
  private path(application: string): string { return join(this.dir, "applications", applicationId(application)); }
  async custody<T>(application: string, creating: boolean, action: () => Promise<T>): Promise<T> {
    const root = join(this.dir, "applications");
    await hostDirectory(root);
    // The shared creation lease serializes only the namespace scan and the
    // committed-head check; admission then runs under the application's own
    // mutex. Until a head exists that mutex is a per-application creation
    // lease inside `.creation` — coordination residue, never a reserved
    // namespace — so independent creations and a refused first commit never
    // queue behind or consume capacity through a trusted host call.
    const selected = await hostLease(join(root, ".creation"), "application-creation", async (): Promise<{existing: true} | {creating: true} | {result: T}> => {
      let count = 0, committed = false, scanned = 0;
      for await (const entry of await opendir(root)) {
        if (++scanned > APPLICATION_SERVICE_LIMITS.applications + 2) throw new Error("Application directory bound exceeded");
        if (entry.name === ".creation") continue;
        // Stray regular files (editor/OS residue such as .DS_Store) are not
        // applications and never brick custody; symlinks and special files do.
        if (entry.isFile() && !entry.isSymbolicLink()) continue;
        if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error("Invalid application directory");
        applicationId(entry.name); count++;
        if (entry.name === application) {
          try {
            const head = await lstat(join(root, entry.name, "head.json"));
            committed = head.isFile() && !head.isSymbolicLink();
          } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
        }
      }
      if (committed) return {existing: true};
      if (!creating) return {result: await action()};
      if (count >= APPLICATION_SERVICE_LIMITS.applications) throw new Error("Application count exhausted");
      return {creating: true};
    }, SHARED_LEASE_RETRY);
    if ("result" in selected) return selected.result;
    if ("creating" in selected) return hostLease(join(root, ".creation", "pending", applicationId(application)), "application-" + application, action);
    return hostLease(this.path(application), "application-" + application, action);
  }

  async readHead(application: string): Promise<JsonValue | undefined> {
    const name = applicationId(application);
    for (const path of [this.dir, join(this.dir, "applications"), this.path(name)]) {
      try {
        const stat = await lstat(path);
        if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Invalid application directory");
      } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
    }
    return hostRead(join(this.path(name), "head.json"), 512);
  }
  readOperation(application: string, operation: Digest): Promise<JsonValue | undefined> {
    return hostRead(join(this.path(application), "operations", applicationRef(operation).slice(7) + ".json"), 2048);
  }
  readDispatch(application: string, intent: Digest): Promise<JsonValue | undefined> {
    return hostRead(join(this.path(application), "outbox", applicationRef(intent).slice(7) + ".json"), APPLICATION_LIMITS.recordBytes);
  }
  async operationCount(application: string): Promise<number> {
    const path = join(this.path(application), "operations");
    try { await lstat(path); return (await hostNames(path, APPLICATION_LIMITS.states, /^[a-f0-9]{64}\.json$/, false)).length; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0; throw error; }
  }
  writeHead(application: string, value: JsonValue): Promise<void> {
    return hostWrite(join(this.path(application), "head.json"), value, 512, false);
  }
  writeOperation(application: string, operation: Digest, value: JsonValue): Promise<void> {
    return hostWrite(join(this.path(application), "operations", applicationRef(operation).slice(7) + ".json"), value, 2048);
  }
  writeDispatch(application: string, intent: Digest, value: JsonValue, immutable: boolean): Promise<void> {
    return hostWrite(join(this.path(application), "outbox", applicationRef(intent).slice(7) + ".json"), value, APPLICATION_LIMITS.recordBytes, immutable);
  }
  publication<T>(application: string, writes: JsonValue[], action: () => Promise<T>): Promise<T> {
    return withApplicationQuota(this.dir, application, writes, action);
  }
}
