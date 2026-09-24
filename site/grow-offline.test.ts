import { expect, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { offlineWorkerSource } from "./grow-offline";

type Reply = { ready: boolean; version: string };
type WorkerEvent = { data?: string; ports?: { postMessage(value: Reply): void }[]; waitUntil(promise: Promise<void>): void };
function fixture() {
  const bodies = new Map([["/grow/", "<main>local application</main>"], ["/grow.js", "application()"], ["/grow/browser-inference-worker.js", "optional()"]]);
  const hash = (value: string) => new Bun.CryptoHasher("sha256").update(value).digest("hex");
  const required = { "/grow/": hash(bodies.get("/grow/")!), "/grow.js": hash(bodies.get("/grow.js")!) };
  const optional = { "/grow/browser-inference-worker.js": hash(bodies.get("/grow/browser-inference-worker.js")!) };
  const stores = new Map<string, Map<string, Response>>();
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
  runInNewContext(offlineWorkerSource(required, optional), {
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
  return { bodies, stores, caches, dispatch, setOffline(value: boolean) { offline = value; }, get fetches() { return fetches; }, get claimed() { return claimed; } };
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
