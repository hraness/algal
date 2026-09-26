/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/** Minimal fake IndexedDB for Bun tests. It models the semantics the durable
 * drivers depend on: per-factory named databases shared across connections,
 * sequential request dispatch per transaction, serialized readwrite
 * transactions on one database, read-committed snapshots, abort discards, and
 * the strict durability hint. It does NOT model indices, cursors, or
 * keyPath/autoIncrement — the drivers only use plain string-keyed stores. */

type Row = unknown;

export class FakeIDBKeyRange {
  constructor(
    readonly lower: unknown,
    readonly upper: unknown,
  ) {}
  static bound(lower: unknown, upper: unknown): FakeIDBKeyRange {
    return new FakeIDBKeyRange(lower, upper);
  }
  contains(key: unknown): boolean {
    return (key as string) >= (this.lower as string) && (key as string) <= (this.upper as string);
  }
}

class FakeRequest {
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: unknown;
  error: Error | null = null;
}

class FakeStore {
  constructor(
    readonly name: string,
    private readonly txn: FakeTxn,
  ) {}
  private enqueue(work: () => unknown): FakeRequest {
    const req = new FakeRequest();
    this.txn.schedule(req, work);
    return req;
  }
  get(key: IDBValidKey): FakeRequest {
    return this.enqueue(() => this.txn.read(this.name).get(key as string));
  }
  getAll(query?: IDBValidKey | FakeIDBKeyRange, count?: number): FakeRequest {
    return this.enqueue(() => {
      const rows = [...this.txn.read(this.name).entries()]
        .filter(([k]) => this.match(query, k))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v);
      return count === undefined ? rows : rows.slice(0, count);
    });
  }
  getAllKeys(query?: IDBValidKey | FakeIDBKeyRange, count?: number): FakeRequest {
    return this.enqueue(() => {
      const keys = [...this.txn.read(this.name).keys()]
        .filter((k) => this.match(query, k))
        .sort((a, b) => a.localeCompare(b));
      return count === undefined ? keys : keys.slice(0, count);
    });
  }
  count(query?: IDBValidKey | FakeIDBKeyRange): FakeRequest {
    return this.enqueue(() => [...this.txn.read(this.name).keys()].filter((k) => this.match(query, k)).length);
  }
  put(value: Row, key: IDBValidKey): FakeRequest {
    return this.enqueue(() => {
      this.txn.write(this.name).set(key as string, structuredClone(value));
      return key;
    });
  }
  delete(key: IDBValidKey): FakeRequest {
    return this.enqueue(() => {
      this.txn.write(this.name).delete(key as string);
      return undefined;
    });
  }
  private match(query: IDBValidKey | FakeIDBKeyRange | undefined, key: string): boolean {
    if (query === undefined || query === null) return true;
    if (query instanceof FakeIDBKeyRange) return query.contains(key);
    return key === (query as string);
  }
}

class FakeTxn {
  state: "queued" | "active" | "done" = "queued";
  oncomplete: (() => void) | null = null;
  onabort: (() => void) | null = null;
  onerror: (() => void) | null = null;
  error: Error | null = null;
  readonly durability: string;
  private queue: Array<() => void> = [];
  private pending = 0;
  private drainScheduled = false;
  private commitScheduled = false;
  private snapshot = new Map<string, Map<string, Row>>();
  private touched = new Set<string>();
  constructor(
    private readonly database: FakeDatabase,
    private readonly stores: string[],
    readonly mode: string,
    options?: { durability?: string },
  ) {
    this.durability = options?.durability ?? "default";
    for (const store of stores) {
      if (!database.stores.has(store)) throw new Error(`NotFoundError: object store "${store}" missing`);
    }
  }
  objectStore(name: string): FakeStore {
    if (this.state !== "active" && this.state !== "queued")
      throw new Error("TransactionInactiveError: transaction is not active");
    if (!this.stores.includes(name)) throw new Error(`NotFoundError: object store "${name}" not in scope`);
    return new FakeStore(name, this);
  }
  /** Read view: readwrite transactions see their own uncommitted writes plus
   * a snapshot of committed rows; readonly sees the committed snapshot. */
  read(store: string): Map<string, Row> {
    if (this.mode !== "readwrite") return this.database.data.get(store)!;
    let merged = this.snapshot.get(store);
    if (!merged) {
      merged = new Map(this.database.data.get(store)!);
      this.snapshot.set(store, merged);
      this.touched.add(store);
    }
    return merged;
  }
  write(store: string): Map<string, Row> {
    return this.read(store);
  }
  schedule(req: FakeRequest, work: () => unknown): void {
    if (this.state !== "active" && this.state !== "queued") {
      // Requests issued outside an active transaction surface as errors.
      queueMicrotask(() => {
        req.error = new Error("TransactionInactiveError: request issued on inactive transaction");
        req.onerror?.();
        this.requestFailed(req.error);
      });
      return;
    }
    this.pending++;
    this.queue.push(() => {
      try {
        req.result = work();
        req.onsuccess?.();
      } catch (error) {
        req.error = error as Error;
        req.onerror?.();
        this.requestFailed(error);
      }
    });
    this.drain();
  }
  requestFailed(error: unknown): void {
    if (this.state === "done") return;
    this.error = error as Error;
    this.abort();
  }
  activate(): void {
    this.state = "active";
    this.drain();
  }
  abort(): void {
    if (this.state === "done") return;
    this.state = "done";
    this.queue = [];
    this.database.release(this);
    queueMicrotask(() => this.onabort?.());
  }
  private drain(): void {
    if (this.drainScheduled) return;
    this.drainScheduled = true;
    queueMicrotask(() => {
      this.drainScheduled = false;
      if (this.state !== "active") return;
      const task = this.queue.shift();
      if (task) {
        this.pending--;
        try { task(); } catch (error) { this.requestFailed(error); }
        this.drain();
        return;
      }
      // Commit on the next task when no requests are in flight. Requests
      // issued from microtask continuations before that task stay valid,
      // matching a real engine's commit boundary.
      if (this.pending === 0 && !this.commitScheduled) {
        this.commitScheduled = true;
        setTimeout(() => {
          this.commitScheduled = false;
          if (this.state === "active" && this.pending === 0 && this.queue.length === 0) this.commit();
        }, 0);
      }
    });
  }
  private commit(): void {
    this.state = "done";
    for (const store of this.touched) {
      this.database.data.set(store, this.snapshot.get(store)!);
    }
    this.database.release(this);
    this.oncomplete?.();
  }
}

class FakeDomStringList {
  constructor(private readonly items: string[]) {}
  get length(): number {
    return this.items.length;
  }
  contains(value: string): boolean {
    return this.items.includes(value);
  }
}

export class FakeDatabase {
  readonly data = new Map<string, Map<string, Row>>();
  readonly stores = new Set<string>();
  onversionchange: (() => void) | null = null;
  version = 1;
  private activeWrite: FakeTxn | null = null;
  private waiters: FakeTxn[] = [];
  constructor(readonly name: string) {}
  get objectStoreNames(): FakeDomStringList {
    return new FakeDomStringList([...this.stores]);
  }
  createObjectStore(name: string): FakeStore {
    this.stores.add(name);
    this.data.set(name, new Map());
    return { name } as unknown as FakeStore;
  }
  transaction(stores: string[] | string, mode?: string, options?: { durability?: string }): FakeTxn {
    const list = Array.isArray(stores) ? stores : [stores];
    const txn = new FakeTxn(this, list, mode ?? "readonly", options);
    if (txn.mode === "readwrite") {
      this.waiters.push(txn);
      this.pump();
    } else {
      txn.activate();
    }
    return txn;
  }
  private pump(): void {
    if (this.activeWrite) return;
    const next = this.waiters.shift();
    if (next) {
      this.activeWrite = next;
      next.activate();
    }
  }
  release(txn: FakeTxn): void {
    if (this.activeWrite === txn) {
      this.activeWrite = null;
      this.pump();
    }
  }
  close(): void {}
}

export class FakeOpenRequest {
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onblocked: (() => void) | null = null;
  onupgradeneeded: ((event: { oldVersion: number }) => void) | null = null;
  result: FakeDatabase | null = null;
  error: Error | null = null;
  transaction: { abort(): void } | null = { abort() {} };
}

export class FakeIDBFactory {
  private readonly registry: Map<string, FakeDatabase>;
  constructor(shared?: Map<string, FakeDatabase>) {
    this.registry = shared ?? new Map();
  }
  /** String keys compare by code units; the drivers only use string keys. */
  cmp(first: IDBValidKey, second: IDBValidKey): number {
    return first < second ? -1 : first > second ? 1 : 0;
  }
  databases(): Promise<Array<{ name: string; version: number }>> {
    return Promise.resolve([...this.registry.values()].map((db) => ({ name: db.name, version: db.version })));
  }
  open(name: string, _version?: number): FakeOpenRequest {
    const req = new FakeOpenRequest();
    queueMicrotask(() => {
      let database = this.registry.get(name);
      if (database === undefined) {
        database = new FakeDatabase(name);
        this.registry.set(name, database);
        req.result = database;
        req.onupgradeneeded?.({ oldVersion: 0 });
      } else {
        req.result = database;
      }
      req.onsuccess?.();
    });
    return req;
  }
  deleteDatabase(name: string): FakeOpenRequest {
    const req = new FakeOpenRequest();
    queueMicrotask(() => {
      this.registry.delete(name);
      req.onsuccess?.();
    });
    return req;
  }
}

/** The fake implements only the members the drivers use; present it to the
 * drivers through this cast, the same boundary the DOM type assumes. */
export function asIdbFactory(factory: FakeIDBFactory): IDBFactory {
  return factory as unknown as IDBFactory;
}
/** Installs the fake as ambient globals so modules resolving
 * `globalThis.indexedDB` / `globalThis.IDBKeyRange` bind to it. */
export function installFakeIdb(factory = new FakeIDBFactory()): FakeIDBFactory {
  globalThis.indexedDB = asIdbFactory(factory);
  globalThis.IDBKeyRange = FakeIDBKeyRange as unknown as typeof IDBKeyRange;
  return factory;
}
