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

export type FileApplicationStorageOptions = {
  /** Host diagnostic barrier after the namespace scan, before application
   * custody. It grants no authority and is not part of any durable record. */
  custodySelected?: () => void | Promise<void>;
};

export class FileApplicationStorage implements ApplicationStorage {
  readonly dir: string;
  readonly store: FileStore;
  // Accessed only under this application's stable pending lease. Tracking by
  // application keeps independent callbacks on one adapter from sharing state.
  private readonly legacyHeld = new Set<string>();
  constructor(dir: string, private readonly options: FileApplicationStorageOptions = {}) { this.dir = resolve(dir); this.store = new FileStore(this.dir); }
  private path(application: string): string { return join(this.dir, "applications", applicationId(application)); }
  private legacyCustody<T>(application: string, action: () => Promise<T>): Promise<T> {
    return hostLease(this.path(application), "application-" + application, async () => {
      this.legacyHeld.add(application);
      try { return await action(); }
      finally { this.legacyHeld.delete(application); }
    });
  }
  async custody<T>(application: string, creating: boolean, action: () => Promise<T>): Promise<T> {
    const root = join(this.dir, "applications");
    await hostDirectory(root);
    // The namespace scan never selects a different mutex after publication.
    // Pending is retained as the stable per-application identity. Its residue
    // stays outside the application count, including refused first commits.
    await hostLease(join(root, ".creation"), "application-creation", async () => {
      let count = 0, present = false, scanned = 0;
      for await (const entry of await opendir(root)) {
        if (++scanned > APPLICATION_SERVICE_LIMITS.applications + 2) throw new Error("Application directory bound exceeded");
        if (entry.name === ".creation") continue;
        // Stray regular files (editor/OS residue such as .DS_Store) are not
        // applications and never brick custody; symlinks and special files do.
        if (entry.isFile() && !entry.isSymbolicLink()) continue;
        if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error("Invalid application directory");
        applicationId(entry.name); count++;
        if (entry.name === application) present = true;
      }
      // A prepared namespace already occupies its slot and may finish at the
      // count limit. The quota ledger rechecks allocation before publication.
      if (creating && !present && count >= APPLICATION_SERVICE_LIMITS.applications) throw new Error("Application count exhausted");
    }, SHARED_LEASE_RETRY);
    await this.options.custodySelected?.();
    return hostLease(join(root, ".creation", "pending", applicationId(application)), "application-" + application, async () => {
      let present = false;
      try {
        const entry = await lstat(this.path(application));
        if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error("Invalid application directory");
        present = true;
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      // Existing stores still take the permanent mutex: live old writers and
      // unrecognized legacy markers must never be bypassed by the new path.
      // A genuinely new namespace is delayed until admission and quota pass.
      return present ? this.legacyCustody(application, action) : action();
    });
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
    return withApplicationQuota(this.dir, application, writes, () =>
      this.legacyHeld.has(application) ? action() : this.legacyCustody(application, action));
  }
}
