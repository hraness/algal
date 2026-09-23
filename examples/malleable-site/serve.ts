/** Owner workbench on loopback. A short-lived token authorizes this process;
 * portable capture/command data never grants caller authority. */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { lstat, realpath } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { MarketingHost } from "./host";
import { MarketingWorkbench } from "./workbench";
import { WORKBENCH_LIMITS } from "./workbench-contract";
import { evaluateShadow, verifyShadow } from "./shadow";
import { applicationJson } from "../../src/application-contract";
import { digestCanonical } from "../../src/digest";
import { parseProposal } from "./surface";

export async function startWorkbenchServer(options: { directory: string; assets: string; port?: number }) {
  const assets = await realpath(options.assets), workbench = new MarketingWorkbench(new MarketingHost(options.directory));
  await workbench.capture(); // Refuse a missing/corrupt host before opening a socket.
  const token = randomBytes(32).toString("hex");
  let origin = "";
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" };
  const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
  const server = Bun.serve({ hostname: "127.0.0.1", port: options.port ?? 0, maxRequestBodySize: WORKBENCH_LIMITS.recordBytes,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.origin !== origin || request.headers.get("host") !== new URL(origin).host) return json({ error: "Unrecognized local host" }, 403);
      if (url.pathname.startsWith("/api/")) {
        const presented = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
        const crossOrigin = request.headers.get("origin");
        if (!/^[a-f0-9]{64}$/.test(presented) || !timingSafeEqual(Buffer.from(presented), Buffer.from(token)) || (crossOrigin !== null && crossOrigin !== origin) || request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "Local owner authorization required" }, 403);
        try {
          if (request.method === "GET" && url.pathname === "/api/capture") return json(await workbench.capture());
          if (request.method !== "POST" || request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") return json({ error: "Unsupported workbench request" }, 405);
          const bytes = await request.arrayBuffer();
          if (bytes.byteLength > WORKBENCH_LIMITS.recordBytes) return json({ error: "Command exceeds its bound" }, 413);
          const input: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
          if (url.pathname === "/api/command") return json(await workbench.execute(input));
          if (url.pathname === "/api/shadow") {
            if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).sort().join(",") !== "expectedHead,proposal") return json({ error: "Invalid shadow request" }, 400);
            const raw = input as { expectedHead: unknown; proposal: unknown }, capture = await workbench.capture();
            if (raw.expectedHead !== capture.head) return json({ error: "The application changed; refresh before evaluating." }, 409);
            const proposal = parseProposal(raw.proposal), result = await evaluateShadow(workbench.host, capture.head, proposal);
            await verifyShadow(workbench.host, result.reference);
            await workbench.recordShadow({ operation: digestCanonical(applicationJson({ kind: "shadow", report: result.reference })), parentState: capture.head, proposal, accepted: result.report.outcome === "pass", policy: result.report.policy, evidence: result.reference, reason: result.report.outcome === "pass" ? "Passed four offline presentation guardrails; no promotion authority." : result.report.reasons.join(", ") });
            return json({ report: result.report, capture: await workbench.capture() });
          }
          return json({ error: "Unknown workbench command" }, 404);
        } catch {
          // The owner CLI exposes detailed diagnostics. The web boundary must
          // not reflect provider errors, private paths, or rejected payloads.
          return json({ error: "The request was not admitted. Refresh to inspect the current state; your draft is kept." }, 409);
        }
      }
      if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Read-only assets" }, 405);
      let file: string;
      try {
        const path = decodeURIComponent(url.pathname);
        if (path.includes("\0") || path.includes("\\")) return json({ error: "Unknown asset" }, 404);
        file = resolve(assets, `.${path.endsWith("/") ? `${path}index.html` : path}`);
        if (!file.startsWith(assets + sep) || !(await lstat(file)).isFile() || await realpath(file) !== file) return json({ error: "Unknown asset" }, 404);
        if (![".html", ".js", ".css", ".json", ".wasm", ".svg", ".png", ".ico", ".woff", ".woff2", ".txt"].includes(extname(file))) return json({ error: "Unknown asset" }, 404);
      } catch { return json({ error: "Unknown asset" }, 404); }
      return new Response(request.method === "HEAD" ? null : Bun.file(file), { headers });
    },
  });
  origin = `http://127.0.0.1:${server.port}`;
  return { url: `${origin}/workbench/#token=${token}`, origin, token, stop: () => server.stop(true) };
}

export const defaultWorkbenchAssets = resolve(import.meta.dir, "../../site/dist");
// No inference endpoint: model admission remains an explicit bounded CLI action.
