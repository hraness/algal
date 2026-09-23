/** Verify a fresh extracted package with an empty working directory and a PATH
 * containing no Bun/Cargo/project tools. Native window/network QA is separate. */
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Capture, Proposal, SessionLoad, Transfer } from "./contract";

const archive = process.argv[2], reportPath = process.argv[3];
if (!archive) throw new Error("Usage: bun package-smoke.ts ARCHIVE [REPORT.json]");
const temporary = await mkdtemp(join(tmpdir(), "algal-triage-extracted-"));
const root = join(temporary, "algal-triage-macos-arm64"), empty = join(temporary, "empty-cwd"), state = join(temporary, "state");
const checks: string[] = [];
const assert = (condition: unknown, message: string): void => { if (!condition) throw new Error(message); checks.push(message); };
async function command(argv: string[], maxBytes = 262144): Promise<string> {
  const child = Bun.spawn(argv, { cwd: empty, env: { PATH: "/usr/bin:/bin", LANG: "en_US.UTF-8" }, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const timer = setTimeout(() => child.kill("SIGKILL"), 60000);
  try {
    const read = async (stream: ReadableStream<Uint8Array>, limit: number) => { const reader = stream.getReader(), chunks: Uint8Array[] = []; let size = 0; try { for (;;) { const item = await reader.read(); if (item.done) break; size += item.value.length; if (size > limit) { child.kill("SIGKILL"); throw new Error("Smoke subprocess output bound"); } chunks.push(item.value); } return Buffer.concat(chunks).toString("utf8"); } finally { reader.releaseLock(); } };
    const [output, errors, status] = await Promise.all([read(child.stdout, maxBytes), read(child.stderr, 16384), child.exited]);
    if (status !== 0) throw new Error(`Extracted command failed: ${errors}`);
    return output;
  } finally { clearTimeout(timer); if (child.exitCode === null) child.kill("SIGKILL"); await child.exited; }
}
let sequence = 0;
async function host<T>(action: string, input?: unknown, tail: string[] = [], application = "smoke"): Promise<T> {
  const args = [join(root, "bin/triage-host"), state, application, action];
  if (input !== undefined) { const file = join(temporary, `input-${sequence++}.json`); await writeFile(file, JSON.stringify(input)); args.push(file); }
  return JSON.parse(await command([...args, ...tail])) as T;
}
try {
  await mkdir(empty);
  const contents = await command(["/usr/bin/tar", "-tzf", resolve(archive)]);
  assert(contents.trim().split("\n").every(path => path.startsWith("algal-triage-macos-arm64/") && !path.split("/").includes("..")), "Archive paths are contained");
  const types = await command(["/usr/bin/tar", "-tvzf", resolve(archive)]);
  assert(types.trim().split("\n").every(line => line.startsWith("-") || line.startsWith("d")), "Archive contains only regular files/directories");
  await command(["/usr/bin/tar", "-xzf", resolve(archive), "-C", temporary]);
  const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8")) as { contract: string; files: { path: string; bytes: number; sha256: string }[]; provenance: { gitHead: string; gitWorktreeDirty: boolean; bunVersion: string; rustcVersion: string; source: { sha256: string; files: unknown[] } } };
  assert(manifest.contract === "algal.triage-package.v1", "Package manifest contract matches");
  assert(/^[a-f0-9]{40,64}$/.test(manifest.provenance.gitHead) && typeof manifest.provenance.gitWorktreeDirty === "boolean" && !!manifest.provenance.bunVersion && !!manifest.provenance.rustcVersion && manifest.provenance.source.files.length > 0 && createHash("sha256").update(JSON.stringify(manifest.provenance.source.files)).digest("hex") === manifest.provenance.source.sha256, "Retained source identity and toolchain provenance match manifest");
  for (const file of manifest.files) { const bytes = await readFile(join(root, file.path)); assert(bytes.length === file.bytes && createHash("sha256").update(bytes).digest("hex") === file.sha256, `Exact packaged bytes: ${file.path}`); }
  for (const file of manifest.files.filter(item => item.path.startsWith("bin/") || item.path.includes("/Resources/bin/") || item.path.includes("/MacOS/"))) {
    const dependencies = (await command(["/usr/bin/otool", "-L", join(root, file.path)])).trim().split("\n").slice(1).map(line => line.trim().split(" (", 1)[0]!);
    assert(dependencies.length > 0 && dependencies.every(path => path.startsWith("/usr/lib/") || path.startsWith("/System/Library/")), `Only system dynamic libraries: ${file.path}`);
  }
  let capture = await host<Capture>("init");
  assert(capture.tasks.length === 0 && capture.capacity.tasks === 32, "Standalone host initializes without checkout/Bun");
  const operation = await host<string>("operation", undefined, ["add"]);
  const event = { contract: "algal.triage-command.v1", expectedHead: capture.head, operation, action: { kind: "add", task: { id: "first", title: "Extracted app task", priority: "high", status: "open", category: "inbox" } } };
  capture = await host<Capture>("command", event);
  assert((await host<Capture>("command", event)).head === capture.head, "Compiled command retry is idempotent");
  assert((await host<Capture>("capture")).tasks[0]?.title === "Extracted app task", "Compiled host restarts with retained facts");
  const session = { ...capture.session, draft: { ...capture.session.draft, title: "Keep this draft" }, focusedField: "title" };
  const sessionFile = join(temporary, "session-save.json"); await writeFile(sessionFile, JSON.stringify({ expectedSession: null, capturedHead: capture.head, session }));
  const saved = JSON.parse(await command([join(root, "bin/triage-host"), state, "smoke", "save-session", "native", sessionFile])) as SessionLoad;
  const restored = await host<SessionLoad>("load-session", undefined, ["native"]);
  assert(saved.reference === restored.reference && restored.record?.session.draft.title === "Keep this draft", "Compiled host retains separate session drafts");
  const proposal: Proposal = { contract: "algal.triage-proposal.v1", expectedHead: capture.head, schemaVersion: 2, config: { sort: "title", group: "category", allowReopen: true }, source: "owner", rationale: "Package smoke: retain facts through core migration." };
  const evaluated = await host<{ reference: string; evaluation: { accepted: boolean } }>("propose-evaluate", proposal);
  assert(evaluated.evaluation.accepted, "Compiled host evaluates schema/workflow revision");
  capture = await host<Capture>("adopt", undefined, [evaluated.reference, await host<string>("operation", undefined, ["adopt"])]);
  assert(capture.definition.schemaVersion === 2 && capture.tasks[0]?.title === "Extracted app task", "Compiled core migration preserves task facts");
  assert((await host<SessionLoad>("load-session", undefined, ["native"])).status === "stale", "Upgrade retains and marks old draft stale");
  const transfer = await host<Transfer>("export");
  const file = join(temporary, "transfer.json"); await writeFile(file, JSON.stringify(transfer));
  assert((await host<{ ok: boolean }>("verify", transfer)).ok, "Extracted package replays exported migration evidence");
  const forked = await host<Capture>("fork", undefined, [file, "forked"]);
  assert(forked.application === "forked" && forked.tasks.length === 1, "Extracted package forks into new authority-free identity");
  const tui = await command([join(root, "bin/triage-tui"), "--dir", state, "--application", "smoke", "--snapshot"]);
  assert(tui.includes("Extracted app task") && tui.includes("Keep this draft"), "Extracted TUI renders actual retained tasks and stale draft");
  const server = Bun.spawn([join(root, "bin/triage-host"), state, "smoke", "serve"], { cwd: empty, env: { PATH: "/usr/bin:/bin", LANG: "en_US.UTF-8" }, stdin: "ignore", stdout: "pipe", stderr: "ignore" });
  const serverTimer = setTimeout(() => server.kill("SIGKILL"), 30000);
  const reader = server.stdout.getReader();
  try {
    let line = "";
    while (!line.includes("\n")) { const chunk = await reader.read(); if (chunk.done) throw new Error("Compiled web host exited before readiness"); line += new TextDecoder().decode(chunk.value); if (line.length > 4096) throw new Error("Compiled web host readiness exceeded bound"); }
    const ready = JSON.parse(line.trim()) as { url: string }, url = new URL(ready.url);
    assert(url.hostname === "127.0.0.1" && url.protocol === "http:", "Extracted web host binds loopback");
    const token = new URLSearchParams(url.hash.slice(1)).get("token");
    const page = await fetch(url.origin, { signal: AbortSignal.timeout(5000) });
    assert(page.status === 200 && page.headers.get("content-security-policy")?.includes("default-src 'none'"), "Extracted web renderer loads with bounded local policy");
    const opened = await fetch(`${url.origin}/api/open`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
    const body = await opened.json() as { capture: Capture };
    assert(opened.status === 200 && body.capture.head === capture.head && body.capture.tasks[0]?.title === "Extracted app task", "Extracted browser host serves the same captured application");
    assert((await fetch(`${url.origin}/api/open`, { signal: AbortSignal.timeout(5000) })).status === 403, "Extracted browser host requires owner authorization");
  } finally { reader.releaseLock(); clearTimeout(serverTimer); if (server.exitCode === null) server.kill("SIGKILL"); await server.exited; }
  await command(["/usr/bin/codesign", "--verify", "--deep", "--strict", join(root, "ALGAL Triage.app")]);
  checks.push("Extracted .app ad-hoc signature verifies");
  const report = { contract: "algal.triage-package-smoke.v1", ok: true, archive: resolve(archive), archiveSha256: createHash("sha256").update(await readFile(resolve(archive))).digest("hex"), sourceSha256: manifest.provenance.source.sha256, gitHeadAtBuild: manifest.provenance.gitHead, dirtyAtBuild: manifest.provenance.gitWorktreeDirty, platform: `${process.platform}-${process.arch}`, noSourceCheckoutRequired: true, noBunInstallationRequired: true, networkDenied: "not-tested-here", checks, finalHead: capture.head, states: transfer.states.length };
  if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} finally { await rm(temporary, { recursive: true, force: true }); }
