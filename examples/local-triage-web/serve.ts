/** Loopback web renderer for the same captured application used by desktop
 * and terminal. The browser has no filesystem or inference authority. */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { TriageHost } from "../local-triage/host";
import { object, parseCommand, parseProposal, parseSession, reference } from "../local-triage/contract";
import { triagePage } from "./page";

export async function serveTriage(options: { directory: string; application?: string; port?: number }) {
  const host = new TriageHost(options.directory, options.application); await host.capture();
  const token = randomBytes(32).toString("hex"), nonce = randomBytes(24).toString("base64"); let origin = "";
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "content-security-policy": `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'` };
  const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
  const server = Bun.serve({ hostname: "127.0.0.1", port: options.port ?? 0, maxRequestBodySize: 16_384, async fetch(request) {
    const url = new URL(request.url);
    if (url.origin !== origin || request.headers.get("host") !== new URL(origin).host) return json({ error: "Unknown host" }, 403);
    if (request.method === "GET" && url.pathname === "/") return new Response(triagePage(nonce), { headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
    const key = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "", from = request.headers.get("origin");
    if (!/^[a-f0-9]{64}$/.test(key) || !timingSafeEqual(Buffer.from(key), Buffer.from(token)) || (from !== null && from !== origin) || request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "Local owner authorization required" }, 403);
    try {
      if (request.method === "GET" && url.pathname === "/api/open") {
        const session = await host.loadSession("browser"), capture = await host.capture(session.record?.session);
        // Another local renderer can publish between these reads. Saved draft
        // status describes this returned capture, never an earlier head.
        const changed = session.record !== null && session.record.capturedHead !== capture.head;
        const missingTask = session.record?.session.draft.taskId != null && !capture.tasks.some(task => task.id === session.record!.session.draft.taskId);
        const reason = changed ? "Application changed; inspect and explicitly rebase the retained draft." : missingTask ? "Draft names a missing task; retained for explicit recovery." : null;
        return json({ capture, session: { ...session, status: session.record === null ? "missing" : reason ? "stale" : "current", reason } });
      }
      if (request.method === "GET" && url.pathname === "/api/export") return json(await host.export());
      if (request.method !== "POST" || request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") return json({ error: "Unsupported request" }, 405);
      const bytes = await request.arrayBuffer(); if (bytes.byteLength > 16_384) return json({ error: "Command is too large" }, 413);
      const input: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      if (url.pathname === "/api/capture") return json(await host.capture(parseSession(input)));
      if (url.pathname === "/api/command") return json(await host.command(parseCommand(input)));
      if (url.pathname === "/api/propose") return json(await host.proposeEvaluate(parseProposal(input)));
      if (url.pathname === "/api/adopt") { const v = object(input, ["evaluation", "operation"]); return json(await host.adopt(reference(v.evaluation), reference(v.operation))); }
      if (url.pathname === "/api/session") { const v = object(input, ["expectedSession", "capturedHead", "session"]); return json(await host.saveSession("browser", { expectedSession: v.expectedSession === null ? null : reference(v.expectedSession), capturedHead: reference(v.capturedHead), session: parseSession(v.session) })); }
      return json({ error: "Unknown command" }, 404);
    } catch { return json({ error: "Request not admitted. Refresh and inspect before retrying; current state and saved drafts remain retained." }, 409); }
  } });
  origin = `http://127.0.0.1:${server.port}`;
  return { url: `${origin}/#token=${token}`, origin, stop: () => server.stop(true) };
}
