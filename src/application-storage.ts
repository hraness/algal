/** Host storage port for the durable application algorithm. No filesystem or
 * runtime-specific database dependency. A host must preserve these ordering
 * and custody obligations; CAS alone is not an application storage adapter. */
import { APPLICATION_LIMITS, applicationId, applicationJson, applicationRef } from "./application-contract";
import type { Digest } from "./digest";
import { AlgalError } from "./errors";
import type { Store } from "./store";
import { MemoryStore } from "./store-memory";
import { canonicalize, type JsonValue } from "./values";

export interface ApplicationStorage {
  readonly store: Store;
  /** Reads neither create nor reserve an application name. Each row is an
   * atomic snapshot; absent and malformed/corrupt records are distinct. */
  readHead(application: string): Promise<JsonValue | undefined>;
  readOperation(application: string, operation: Digest): Promise<JsonValue | undefined>;
  readDispatch(application: string, intent: Digest): Promise<JsonValue | undefined>;
  operationCount(application: string): Promise<number>;
  /** A resolved write is durable. The head may replace an existing row;
   * operation rows and first dispatch writes are immutable, compare-or-fail.
   * Bounds: head 512 bytes, operation 2048, dispatch recordBytes. */
  writeHead(application: string, value: JsonValue): Promise<void>;
  writeOperation(application: string, operation: Digest, value: JsonValue): Promise<void>;
  writeDispatch(application: string, intent: Digest, value: JsonValue, immutable: boolean): Promise<void>;
  /** Exclusive across ALL owners of this application for the entire callback,
   * including awaits/external dispatch. Must not wrap the callback in a DB
   * transaction that rolls back an already-written dispatch-started marker.
   * A failed first admission must not reserve an application name. */
  custody<T>(application: string, creating: boolean, action: () => Promise<T>): Promise<T>;
  /** Reserve bounded namespace capacity before publication; retain the charge
   * on callback failure. Writes and callbacks retain their individual commit
   * boundaries: prepared operations and published heads survive later faults.
   * Never hold this shared allocation lane while waiting on external effects. */
  publication<T>(application: string, writes: JsonValue[], action: () => Promise<T>): Promise<T>;
}

/** Volatile reference adapter for host conformance and simulations. Reusing
 * the same adapter across ApplicationCore instances models owner restart; it
 * does not claim persistence after the host process exits. No copied intents
 * may be dispatched merely because a simulation uses this adapter. */
export class MemoryApplicationStorage implements ApplicationStorage {
  readonly store: Store;
  private readonly rows = new Map<string, JsonValue>();
  private readonly owners = new Map<string, Promise<void>>();
  private readonly charges = new Map<string, number>();
  constructor(store: Store = new MemoryStore()) { this.store = store; }
  private key(application: string, kind: string, ref?: Digest): string {
    return `${applicationId(application)}/${kind}${ref === undefined ? "" : "/" + applicationRef(ref).slice(7)}`;
  }
  private async serial<T>(key: string, action: () => Promise<T>): Promise<T> {
    const previous = this.owners.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>(resolve => { release = resolve; });
    this.owners.set(key, current);
    await previous;
    try { return await action(); }
    finally { release(); if (this.owners.get(key) === current) this.owners.delete(key); }
  }
  private read(key: string): Promise<JsonValue | undefined> { return Promise.resolve(structuredClone(this.rows.get(key))); }
  private async write(key: string, value: JsonValue, maxBytes: number, immutable: boolean): Promise<void> {
    const record = applicationJson(value), bytes = canonicalize(record);
    if (new TextEncoder().encode(bytes).length > maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", "host state byte bound exceeded");
    const prior = this.rows.get(key);
    if (prior !== undefined && immutable && canonicalize(prior) !== bytes) throw new AlgalError("DIGEST_MISMATCH", "immutable host state conflicts");
    this.rows.set(key, record);
  }
  readHead(application: string): Promise<JsonValue | undefined> { return this.read(this.key(application, "head")); }
  readOperation(application: string, operation: Digest): Promise<JsonValue | undefined> { return this.read(this.key(application, "operations", operation)); }
  readDispatch(application: string, intent: Digest): Promise<JsonValue | undefined> { return this.read(this.key(application, "outbox", intent)); }
  async operationCount(application: string): Promise<number> {
    const prefix = this.key(application, "operations") + "/";
    const count = [...this.rows.keys()].filter(key => key.startsWith(prefix)).length;
    if (count > APPLICATION_LIMITS.states) throw new Error("Application operation bound exhausted");
    return count;
  }
  writeHead(application: string, value: JsonValue): Promise<void> { return this.write(this.key(application, "head"), value, 512, false); }
  writeOperation(application: string, operation: Digest, value: JsonValue): Promise<void> { return this.write(this.key(application, "operations", operation), value, 2048, true); }
  writeDispatch(application: string, intent: Digest, value: JsonValue, immutable: boolean): Promise<void> { return this.write(this.key(application, "outbox", intent), value, APPLICATION_LIMITS.recordBytes, immutable); }
  custody<T>(application: string, creating: boolean, action: () => Promise<T>): Promise<T> {
    const name = applicationId(application);
    return this.serial("application:" + name, async () => {
      const names = new Set([...this.rows.keys()].map(key => key.split("/")[0]!));
      if (creating && !names.has(name) && names.size >= 32) throw new Error("Application count exhausted");
      return action();
    });
  }
  publication<T>(application: string, writes: JsonValue[], action: () => Promise<T>): Promise<T> {
    const name = applicationId(application);
    if (!writes.length || writes.length > 64) throw new AlgalError("BUDGET_EXHAUSTED", "Application namespace quota: invalid publication count");
    const reservation = writes.reduce<number>((sum, value) => sum + 2 * new TextEncoder().encode(canonicalize(applicationJson(value))).length, 0);
    return this.serial("publication", async () => {
      // Match the filesystem quota's per-owner reservation and hard ceilings.
      // Filesystem scan overhead has no analogue in this volatile host.
      const charge = Math.max(this.charges.get(name) ?? 0, 2 * 1024 * 1024) + reservation;
      const total = [...this.charges.values()].reduce((sum, value) => sum + value, 0) - (this.charges.get(name) ?? 0) + charge;
      if ((!this.charges.has(name) && this.charges.size >= 32) || charge > 256 * 1024 * 1024 || total + 4 * 1024 * 1024 + 16_384 > 1024 * 1024 * 1024) throw new AlgalError("BUDGET_EXHAUSTED", "Application namespace quota exhausted");
      this.charges.set(name, charge);
      return action();
    });
  }
}
