import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MarketingHost } from "./host";
import { startWorkbenchServer } from "./serve";
import { digestCanonical } from "../../src/digest";

test("local workbench requires owner token and origin, fences commands, and serves no host files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-workbench-http-"));
  let server: Awaited<ReturnType<typeof startWorkbenchServer>> | undefined;
  try {
    const host = new MarketingHost(join(directory, "host")); await host.initialize();
    const assets = join(directory, "assets"); await mkdir(join(assets, "workbench"), { recursive: true }); await writeFile(join(assets, "workbench/index.html"), "<main>Static fallback</main>");
    server = await startWorkbenchServer({ directory: host.service.dir, assets });
    const api = server.origin + "/api/capture", authorization = `Bearer ${server.token}`;
    expect((await fetch(api)).status).toBe(403);
    expect((await fetch(api, { headers: { authorization, host: "rebound.invalid" } })).status).toBe(403);
    expect((await fetch(api, { headers: { authorization, "sec-fetch-site": "cross-site" } })).status).toBe(403);
    expect((await fetch(api, { headers: { authorization, origin: "null" } })).status).toBe(403);
    expect((await fetch(api, { headers: { authorization, origin: "https://unrelated.invalid" } })).status).toBe(403);
    const response = await fetch(api, { headers: { authorization } });
    expect(response.status).toBe(200);
    const capture = await response.json() as { head: string; controlsRef: string; controls: { inferencePaused: boolean; modelActivationPaused: boolean; pinnedRevision: null } };
    const command = { contract: "algal.marketing-command.v1", actor: "human", operation: digestCanonical("http-pause"), expectedHead: capture.head, expectedControls: capture.controlsRef, kind: "set-controls", controls: { ...capture.controls, inferencePaused: true } };
    const send = (input: unknown) => fetch(server!.origin + "/api/command", { method: "POST", headers: { authorization, origin: server!.origin, "content-type": "application/json" }, body: JSON.stringify(input) });
    expect((await send(command)).status).toBe(200);
    expect((await send({ ...command, operation: digestCanonical("stale-http-pause") })).status).toBe(409);
    const page = await fetch(server.origin + "/workbench/");
    expect(page.status).toBe(200);
    expect(page.headers.get("referrer-policy")).toBe("no-referrer");
    expect(page.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    await writeFile(join(directory, "private.json"), JSON.stringify({ retained: "outside asset root" }));
    await symlink(join(directory, "private.json"), join(assets, "escape.json"));
    await symlink(directory, join(assets, "escape-directory"));
    for (const path of ["/escape.json", "/escape-directory/private.json", "/%2f..%2fprivate.json", "/%00.json", "/%5cprivate.json"]) expect((await fetch(server.origin + path)).status).toBe(404);
    expect(await (await fetch(server.origin + "/workbench/", { method: "HEAD" })).text()).toBe("");
    expect((await fetch(server.origin + "/api/command", { method: "POST", headers: { authorization, "content-type": "application/json-extra" }, body: JSON.stringify(command) })).status).toBe(405);
    const oversized = await fetch(server.origin + "/api/command", { method: "POST", headers: { authorization, "content-type": "application/json" }, body: JSON.stringify({ ...command, operation: digestCanonical("oversized"), extra: "x".repeat(40_000) }) });
    expect(oversized.status).toBe(413);
    expect((await host.current()).digest).not.toBe(capture.head);
    expect((await fetch(server.origin + "/host/applications/malleable-marketing/head.json")).status).toBe(404);
    expect((await fetch(server.origin + "/api/command", { method: "POST", headers: { authorization, "content-type": "text/plain" }, body: JSON.stringify(command) })).status).toBe(405);
  } finally { server?.stop(); await rm(directory, { recursive: true, force: true }); }
}, 30_000);
