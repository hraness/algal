import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TriageHost, hash } from "../local-triage/host";
import { DEFAULT_SESSION, type Capture, type SessionLoad } from "../local-triage/contract";
import { serveTriage } from "./serve";

test("web presentation shares exact-head commands and persistent drafts while refusing unauthenticated or cross-origin writes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-triage-web-")); const host = new TriageHost(directory), initial = await host.initialize();
  const server = await serveTriage({ directory }), authorization = `Bearer ${new URL(server.url).hash.slice(7)}`;
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) => fetch(server.origin + path, { method: "POST", headers: { authorization, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  try {
    expect((await fetch(server.origin + "/api/open")).status).toBe(403);
    expect((await fetch(server.origin + "/api/open", { headers: { authorization, host: "foreign.invalid" } })).status).toBe(403);
    expect((await fetch(server.origin + "/api/open", { headers: { authorization, "sec-fetch-site": "cross-site" } })).status).toBe(403);
    const open = await fetch(server.origin + "/api/open", { headers: { authorization } }); expect(open.status).toBe(200);
    expect(open.headers.get("cache-control")).toBe("no-store"); expect(open.headers.get("referrer-policy")).toBe("no-referrer");
    const session = { ...DEFAULT_SESSION, draft: { ...DEFAULT_SESSION.draft, title: "Keep this independent draft" } };
    expect((await post("/api/session", { expectedSession: null, capturedHead: initial.head, session }, { origin: "https://foreign.invalid" })).status).toBe(403);
    const saved = await post("/api/session", { expectedSession: null, capturedHead: initial.head, session }); expect(saved.status).toBe(200);
    const reopened = await (await fetch(server.origin + "/api/open", { headers: { authorization } })).json() as { capture: Capture; session: SessionLoad };
    expect(reopened.capture.session).toEqual(session); expect(reopened.session.status).toBe("current");
    expect(reopened.capture.head).toBe(reopened.session.record!.capturedHead);
    const cmd = { contract: "algal.triage-command.v1", expectedHead: initial.head, operation: hash("web-add"), action: { kind: "add", task: { id: "first", title: "Shared task", priority: "high", status: "open", category: "inbox" } } };
    expect((await post("/api/command", cmd)).status).toBe(200); const current = await host.capture(); expect(current.tasks[0]?.title).toBe("Shared task");
    expect((await post("/api/command", cmd)).status).toBe(200); expect((await host.capture()).head).toBe(current.head);
    expect((await post("/api/command", { ...cmd, operation: hash("stale"), action: { kind: "complete", taskId: "first" } })).status).toBe(409);
    expect((await post("/api/command", { ...cmd, shell: "unadmitted" })).status).toBe(409);
    expect((await host.loadSession("browser")).record?.session.draft.title).toBe(session.draft.title);
    expect((await host.loadSession("browser")).status).toBe("stale");
    const staleOpen = await (await fetch(server.origin + "/api/open", { headers: { authorization } })).json() as { capture: Capture; session: SessionLoad };
    expect(staleOpen.capture.head).toBe(current.head); expect(staleOpen.capture.session.draft.title).toBe(session.draft.title); expect(staleOpen.session.status).toBe("stale");
    expect((await post("/api/session", { expectedSession: null, capturedHead: current.head, session }, { "content-type": "application/json-extra" })).status).toBe(405);
    expect((await fetch(server.origin + "/api/session", { method: "POST", headers: { authorization, "content-type": "application/json" }, body: "x".repeat(16_385) })).status).toBe(413);
    expect((await fetch(server.origin + "/private-state", { headers: { authorization } })).status).toBe(405);
    const html = await (await fetch(server.origin)).text(); expect(html).not.toContain(authorization); expect(html).not.toContain(directory);
    const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)?.[1]; expect(script).toBeDefined(); expect(() => new Function(script!)).not.toThrow();
  } finally { server.stop(); await rm(directory, { recursive: true, force: true }); }
}, 30_000);
