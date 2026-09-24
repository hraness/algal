/** Static-shell caching is separate from authoritative application records.
 * The build pins every response byte; an incomplete update never takes over. */
export function offlineWorkerSource(required: Record<string, string>, optional: Record<string, string>): string {
  // Filesystem enumeration order varies by host. Version only the asset paths
  // and bytes, so identical builds produce identical workers on every host.
  const ordered = (assets: Record<string, string>) => Object.fromEntries(Object.keys(assets).sort().map(path => [path, assets[path]]));
  const manifest = JSON.stringify({ required: ordered(required), optional: ordered(optional) });
  return `"use strict";
const manifest = ${manifest};
const VERSION = "algal-grow-" + ${JSON.stringify(new Bun.CryptoHasher("sha256").update(manifest).digest("hex"))};
const assets = {...manifest.required, ...manifest.optional};
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
async function retain(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(path, {cache: "no-store", redirect: "error", credentials: "same-origin", signal: controller.signal});
    if (!response.ok || response.type === "opaque") throw new Error("Offline asset unavailable");
    const bytes = await response.clone().arrayBuffer();
    if (hex(await crypto.subtle.digest("SHA-256", bytes)) !== assets[path]) throw new Error("Offline asset version changed");
    const cache = await caches.open(VERSION);
    await cache.put(path, response.clone());
    return response;
  } finally { clearTimeout(timer); }
}
async function populate() { await Promise.all(Object.keys(manifest.required).map(retain)); }
async function ready() {
  const cache = await caches.open(VERSION);
  return (await Promise.all(Object.keys(manifest.required).map(path => cache.match(path)))).every(Boolean);
}
self.addEventListener("install", event => event.waitUntil(populate()));
self.addEventListener("activate", event => event.waitUntil((async () => {
  // No skipWaiting: activation waits for the previous worker's clients to
  // close. Only our exact versioned shell caches are eligible for pruning;
  // application IndexedDB records and inference caches are never touched.
  const names = await caches.keys();
  await Promise.all(names.filter(name => /^algal-grow-[a-f0-9]{64}$/.test(name) && name !== VERSION).map(name => caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  const path = url.pathname === "/grow/" || url.pathname === "/grow/index.html" ? "/grow/" : url.pathname;
  if (!Object.hasOwn(assets, path) || (url.search && path !== "/grow/")) return;
  event.respondWith((async () => (await (await caches.open(VERSION)).match(path)) || await retain(path))());
});
self.addEventListener("message", event => {
  if (event.data !== "offline-status" && event.data !== "cache-offline") return;
  event.waitUntil((async () => {
    let complete = false;
    try {
      // An already complete pinned shell needs no network refresh. This also
      // preserves truthful readiness offline or while a newer version waits.
      if (event.data === "cache-offline" && !(await ready())) await populate();
      complete = await ready();
    } catch { try { complete = await ready(); } catch { /* Storage is unavailable. */ } }
    event.ports[0]?.postMessage({ready: complete, version: VERSION});
  })());
});
`;
}
