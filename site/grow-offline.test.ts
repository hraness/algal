import { expect, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { offlineWorkerSource, type OfflineShellScope } from "./grow-offline";

type Reply = { ready: boolean; version: string };
type WorkerEvent = { data?: string; ports?: { postMessage(value: Reply): void }[]; request?: { method: string; url: string }; respondWith?(response: Promise<Response>): void; waitUntil(promise: Promise<void>): void };

test("worker bytes and cache versions depend on assets, not filesystem enumeration order", () => {
  const first = offlineWorkerSource({ "/z.js": "z", "/a.js": "a" }, { "/y.js": "y", "/b.js": "b" });
  const reordered = offlineWorkerSource({ "/a.js": "a", "/z.js": "z" }, { "/b.js": "b", "/y.js": "y" });
  expect(reordered).toBe(first);
  const version = (source: string) => source.match(/const VERSION = .*;/)?.[0];
  expect(version(first)).toBeDefined();
  expect(version(offlineWorkerSource({ "/a.js": "changed", "/z.js": "z" }, { "/b.js": "b", "/y.js": "y" }))).not.toBe(version(first));
  expect(version(offlineWorkerSource({ "/a.js": "a", "/z.js": "z" }, { "/b.js": "b", "/y.js": "changed" }))).not.toBe(version(first));
});

function fixture(scope: OfflineShellScope = { path: "/grow/", cachePrefix: "algal-grow-" }, stores = new Map<string, Map<string, Response>>()) {
  const entry = `${scope.path.slice(0, -1)}.js`, worker = `${scope.path}browser-inference-worker.js`;
  const bodies = new Map([[scope.path, "<main>local application</main>"], [entry, "application()"], [worker, "optional()"]]);
  const hash = (value: string) => new Bun.CryptoHasher("sha256").update(value).digest("hex");
  const required = { [scope.path]: hash(bodies.get(scope.path)!), [entry]: hash(bodies.get(entry)!) };
  const optional = { [worker]: hash(bodies.get(worker)!) };
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  let offline = false, fetches = 0, claimed = false;
  const caches = {
    async open(name: string) {
      let rows = stores.get(name);
      if (!rows) { rows = new Map(); stores.set(name, rows); }
      const saved = rows;
      return {
        async match(path: string): Promise<Response | undefined> { return saved.get(path)?.clone(); },
        async put(path: string, response: Response): Promise<void> { saved.set(path, response.clone()); },
      };
    },
    async keys(): Promise<string[]> { return [...stores.keys()]; },
    async delete(name: string): Promise<boolean> { return stores.delete(name); },
  };
  runInNewContext(offlineWorkerSource(required, optional, scope), {
    self: { location: { origin: "https://example.test" }, clients: { async claim() { claimed = true; } }, addEventListener(name: string, listener: (event: WorkerEvent) => void) { listeners.set(name, listener); } },
    caches, crypto, Response, URL, AbortController, setTimeout, clearTimeout,
    async fetch(path: string): Promise<Response> {
      fetches++;
      if (offline) throw new Error("Offline");
      const body = bodies.get(path);
      return body === undefined ? new Response("Missing", { status: 404 }) : new Response(body, { headers: { "Content-Type": path.endsWith("js") ? "text/javascript" : "text/html" } });
    },
  });
  async function dispatch(name: string, data?: string): Promise<Reply | undefined> {
    let completion: Promise<void> | undefined, reply: Reply | undefined;
    listeners.get(name)!({ ...(data ? { data } : {}), ports: [{ postMessage(value) { reply = value; } }], waitUntil(promise) { completion = promise; } });
    await completion;
    return reply;
  }
  async function request(path: string): Promise<Response | undefined> {
    let response: Promise<Response> | undefined;
    listeners.get("fetch")!({ request: { method: "GET", url: `https://example.test${path}` }, respondWith(value) { response = value; }, waitUntil() {} });
    return response;
  }
  return { bodies, stores, caches, dispatch, request, setOffline(value: boolean) { offline = value; }, get fetches() { return fetches; }, get claimed() { return claimed; } };
}

test("a complete pinned shell stays ready without refetching while offline or after deployment", async () => {
  const f = fixture(); await f.dispatch("install");
  expect(f.fetches).toBe(2);
  f.setOffline(true);
  expect((await f.dispatch("message", "cache-offline"))?.ready).toBe(true);
  expect(f.fetches).toBe(2);
  f.setOffline(false); f.bodies.set("/grow.js", "new deployment");
  expect((await f.dispatch("message", "cache-offline"))?.ready).toBe(true);
  expect(f.fetches).toBe(2);
});

test("incomplete offline shell reports unavailable and preserves all retained records", async () => {
  const f = fixture(); await f.dispatch("install");
  const state = await f.dispatch("message", "offline-status");
  const cache = f.stores.get(state!.version)!;
  cache.delete("/grow.js");
  f.setOffline(true);
  expect((await f.dispatch("message", "cache-offline"))?.ready).toBe(false);
  expect(await cache.get("/grow/")!.text()).toBe("<main>local application</main>");
});

test("a changed asset prevents installing an incomplete version and does not erase the old cache", async () => {
  const f = fixture(), old = `algal-grow-${"a".repeat(64)}`;
  const previous = await f.caches.open(old); await previous.put("/grow/", new Response("previous version"));
  f.bodies.set("/grow.js", "different bytes");
  await expect(f.dispatch("install")).rejects.toThrow("version changed");
  expect(await (await previous.match("/grow/"))!.text()).toBe("previous version");
  expect(f.claimed).toBe(false);
  expect((await f.dispatch("message", "offline-status"))?.ready).toBe(false);
});

test("activation prunes only retired shell versions and never optional model or foreign caches", async () => {
  const f = fixture(), old = `algal-grow-${"b".repeat(64)}`;
  for (const name of [old, "algal-grow-other-data", "webllm/model", "another-application"]) await f.caches.open(name);
  await f.dispatch("install");
  const current = await f.dispatch("message", "offline-status");
  await f.dispatch("activate");
  expect(f.claimed).toBe(true);
  expect([...f.stores.keys()].sort()).toEqual(["algal-grow-other-data", "webllm/model", "another-application", current!.version].sort());
  expect((await f.dispatch("message", "offline-status"))?.ready).toBe(true);
  expect(f.stores.get(current!.version)?.has("/grow/browser-inference-worker.js")).toBe(false);
});

test("separate applications retain each other's offline shells and normalize only their own workspace URLs", async () => {
  const grow = fixture(), tasks = fixture({ path: "/tasks/", cachePrefix: "algal-tasks-" }, grow.stores);
  const retiredGrow = `algal-grow-${"c".repeat(64)}`, retiredTasks = `algal-tasks-${"d".repeat(64)}`;
  await grow.caches.open(retiredGrow); await tasks.caches.open(retiredTasks);
  await grow.dispatch("install"); await tasks.dispatch("install");
  const growVersion = (await grow.dispatch("message", "offline-status"))!.version;
  const tasksVersion = (await tasks.dispatch("message", "offline-status"))!.version;
  await tasks.dispatch("activate");
  expect(grow.stores.has(retiredGrow)).toBe(true);
  expect(grow.stores.has(retiredTasks)).toBe(false);
  expect(grow.stores.has(growVersion)).toBe(true);
  await grow.dispatch("activate");
  expect(grow.stores.has(retiredGrow)).toBe(false);
  expect(grow.stores.has(tasksVersion)).toBe(true);
  tasks.setOffline(true); grow.setOffline(true);
  expect(await (await tasks.request("/tasks/?workspace=one"))?.text()).toBe("<main>local application</main>");
  expect(await (await tasks.request("/tasks/index.html?workspace=two"))?.text()).toBe("<main>local application</main>");
  expect(await tasks.request("/grow/?workspace=one")).toBeUndefined();
  expect(await tasks.request("/tasks.js?unversioned=true")).toBeUndefined();
  expect(await (await grow.request("/grow/?workspace=one"))?.text()).toBe("<main>local application</main>");
});
