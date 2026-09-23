/** Hold scheduled native custody while the authorized CUA service observes the
 * exact packaged app. A delayed launch lets the observer be ready before start.
 * This driver synthesizes no UI events and requests no accessibility permission. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import budgets from "./budgets.json";

const [packageArg, stateArg, outputArg] = process.argv.slice(2);
if (!packageArg || !stateArg || !outputArg) throw new Error("Usage: bun cua-lease.ts PACKAGE_ROOT INITIALIZED_STATE FRESH_OUTPUT");
const pkg = resolve(packageArg), state = resolve(stateArg), output = resolve(outputArg), executable = join(pkg, "ALGAL Triage.app/Contents/MacOS/triage-desktop");
await mkdir(output, { recursive: true });
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(await readFile(join(pkg, "manifest.json"), "utf8")) as { provenance: { gitHead: string; source: { sha256: string } }; files: { path: string; sha256: string }[] };
const identity = hash(await readFile(executable));
if (!manifest.files.some(file => file.path === "ALGAL Triage.app/Contents/MacOS/triage-desktop" && file.sha256 === identity)) throw new Error("Package identity mismatch");
await writeFile(join(output, "declaration.json"), JSON.stringify({ budgets, budgetsSha256: hash(await readFile(new URL("./budgets.json", import.meta.url))), scriptSha256: hash(await readFile(import.meta.path)), declaredAt: new Date().toISOString(), packageCommit: manifest.provenance.gitHead, packageSource: manifest.provenance.source.sha256, desktopSha256: identity, method: "Exact packaged app launch and main-process RSS; interactions and visible readiness observed only through authorized CUA service" }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ armed: true, launchDelayMs: 6000, output }));
await new Promise(resolve => setTimeout(resolve, 6000));
const startedEpochMs = Date.now();
const child = Bun.spawn([executable, "--dir", state, "--application", "performance"], { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
await writeFile(join(output, "started.json"), JSON.stringify({ pid: child.pid, startedEpochMs, tasks: budgets.local.tasks }) + "\n", { flag: "wx" });
console.log(JSON.stringify({ pid: child.pid, startedEpochMs }));
const samples: { epochMs: number; rssBytes: number }[] = [];
let reading = false;
const sample = async () => {
  if (reading || child.exitCode !== null) return;
  reading = true;
  try {
    const probe = Bun.spawn(["/bin/ps", "-o", "rss=", "-p", String(child.pid)], { stdout: "pipe", stderr: "ignore" });
    const rssBytes = Number((await new Response(probe.stdout).text()).trim()) * 1024;
    if (await probe.exited === 0 && Number.isFinite(rssBytes) && rssBytes > 0) samples.push({ epochMs: Date.now(), rssBytes });
  } finally { reading = false; }
};
const timer = setInterval(() => { void sample(); }, 500);
const deadline = setTimeout(() => child.kill("SIGTERM"), 180000);
try { await child.exited; } finally { clearInterval(timer); clearTimeout(deadline); }
while (reading) await new Promise(resolve => setTimeout(resolve, 10));
await writeFile(join(output, "process.json"), JSON.stringify({ startedEpochMs, exitedEpochMs: Date.now(), exitCode: child.exitCode, samples, memoryScope: "Main process RSS only; separately managed WebKit processes excluded" }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ closed: true, output, samples: samples.length }));
