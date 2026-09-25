import { afterEach, test as bunTest } from "bun:test";
import { AsyncLocalStorage } from "node:async_hooks";
import { rm } from "node:fs/promises";

/** Ownership for these filesystem-heavy application tests, including a body
 * that Bun times out without cancelling its outstanding promises. */
export class ApplicationTestScope {
  private readonly directories = new Set<string>();
  private readonly pending = new Set<Promise<unknown>>();
  private readonly releases = new Set<() => void>();
  private stopping = false;
  private cleanupTask?: Promise<void>;

  constructor(private readonly joinTimeoutMs = 5_000) {}

  checkActive(): void {
    if (this.stopping) throw new Error("Application test teardown has started");
  }
  directory(path: string): string { this.directories.add(path); return path; }
  own<T>(task: Promise<T>): Promise<T> {
    this.pending.add(task);
    // Install a rejection observer immediately, including before a barrier is
    // entered; the caller still receives the original rejecting promise.
    void task.then(() => this.pending.delete(task), () => this.pending.delete(task));
    return task;
  }
  barrier(): {wait: Promise<void>; release: () => void} {
    this.checkActive();
    let resolve!: () => void;
    const wait = new Promise<void>(done => { resolve = done; });
    const release = () => { this.releases.delete(release); resolve(); };
    this.releases.add(release);
    return {wait, release};
  }
  cleanup(): Promise<void> {
    return this.cleanupTask ??= this.finish();
  }
  private async finish(): Promise<void> {
    this.stopping = true;
    for (const release of [...this.releases]) release();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        (async () => { while (this.pending.size) await Promise.allSettled([...this.pending]); })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Application test work did not finish; retained ${[...this.directories].join(", ")}`)), this.joinTimeoutMs);
        }),
      ]);
    } finally { clearTimeout(timer); }
    // A failed bounded join exits before deletion. Late work retains its owned
    // root rather than racing recursive cleanup or another test's namespace.
    for (const directory of this.directories) await rm(directory, {recursive: true, force: true});
    this.directories.clear();
  }
}

export function applicationTests(): {
  test: (name: string, body: () => Promise<void>) => void;
  resources: () => ApplicationTestScope;
} {
  const current = new AsyncLocalStorage<ApplicationTestScope>();
  const scopes: ApplicationTestScope[] = [];
  afterEach(async () => { for (const scope of scopes.splice(0)) await scope.cleanup(); });
  return {
    test(name, body) {
      bunTest(name, () => {
        const scope = new ApplicationTestScope(); scopes.push(scope);
        return current.run(scope, () => scope.own(Promise.resolve().then(body)));
      });
    },
    resources() {
      const scope = current.getStore();
      if (!scope) throw new Error("Application test has no resource owner");
      return scope;
    },
  };
}
