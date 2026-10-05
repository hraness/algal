/** Exact packaged CLI/TUI qualification. Run through mac-native custody. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import budgets from "./budgets.json";

const packageRoot = process.argv[2], output = process.argv[3];
if (!packageRoot || !output || process.platform !== "darwin") throw new Error("Usage on macOS: bun native.ts PACKAGE_ROOT FRESH_OUTPUT");
const directory = resolve(output), pkg = resolve(packageRoot), state = join(directory, "state");
await mkdir(directory, { recursive: true });
const hash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(await readFile(join(pkg, "manifest.json"), "utf8")) as { provenance: { gitHead: string; source: { sha256: string } }; files: { path: string; sha256: string }[] };
const declared = { contract: "algal.renderer-performance-declaration.v1", declaredAt: new Date().toISOString(), budgets, budgetsSha256: hash(await readFile(new URL("./budgets.json", import.meta.url))), scriptSha256: hash(await readFile(import.meta.path)), packageSource: manifest.provenance.source.sha256, gitHead: manifest.provenance.gitHead };
await writeFile(join(directory, "declaration.json"), JSON.stringify(declared, null, 2) + "\n", { flag: "wx" });
const checks: { name: string; passed: boolean; observed: unknown; maximum?: number }[] = [];
const check = (name: string, passed: boolean, observed: unknown, maximum?: number) => checks.push({ name, passed, observed, ...(maximum === undefined ? {} : { maximum }) });
const quantiles = (values: number[]) => ({ count: values.length, min: Math.min(...values), median: [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!, p95: [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1]!, max: Math.max(...values) });
async function command(args: string[], deadlineMs = 30000) {
  const started = performance.now(), child = Bun.spawn(args, { cwd: directory, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const deadline = setTimeout(() => child.kill("SIGKILL"), deadlineMs);
  try {
    const [stdout, stderr, status] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    if (stdout.length > 524288 || stderr.length > 16384) throw new Error("Qualification output exceeded its bound");
    return { stdout, stderr, status, ms: performance.now() - started };
  } finally { clearTimeout(deadline); if (child.exitCode === null) child.kill("SIGKILL"); await child.exited; }
}
for (const path of ["bin/triage-host", "bin/triage-tui"]) {
  const expected = manifest.files.find(file => file.path === path);
  if (!expected || hash(await readFile(join(pkg, path))) !== expected.sha256) throw new Error("Package identity mismatch");
}
const seed = { schemaVersion: 2, config: { sort: "priority", group: "status", allowReopen: true }, tasks: Array.from({ length: budgets.local.tasks }, (_, i) => ({ id: `task-${i}`, title: `Performance task ${String(i).padStart(2, "0")}`, priority: "normal", status: "open", category: "inbox" })) };
const seedPath = join(directory, "seed.json"); await writeFile(seedPath, JSON.stringify(seed));
const init = await command([join(pkg, "bin/triage-host"), state, "performance", "init", seedPath]);
if (init.status !== 0) throw new Error(init.stderr);
const hostSamples: number[] = [], terminalSamples: number[] = [], peakRss: number[] = [];
for (const [samples, args] of [
  [hostSamples, [join(pkg, "bin/triage-host"), state, "performance", "capture"]],
  [terminalSamples, [join(pkg, "bin/triage-tui"), "--dir", state, "--application", "performance", "--snapshot"]],
] as const) {
  for (let i = 0; i < budgets.local.samples; i++) {
    const result = await command(["/usr/bin/time", "-l", ...args]);
    if (result.status !== 0) throw new Error(result.stderr);
    samples.push(result.ms);
    const rss = /([0-9]+)\s+maximum resident set size/.exec(result.stderr);
    if (!rss) throw new Error("Darwin time did not return peak resident memory");
    peakRss.push(Number(rss[1]));
  }
}
const host = quantiles(hostSamples), terminal = quantiles(terminalSamples);
check("Packaged host cold process capture p95", host.p95 <= budgets.local.hostCaptureP95MsMax, host, budgets.local.hostCaptureP95MsMax);
check("Packaged TUI process-to-complete-snapshot p95", terminal.p95 <= budgets.local.terminalStartupP95MsMax, terminal, budgets.local.terminalStartupP95MsMax);
check("CLI/TUI Darwin peak resident bytes", Math.max(...peakRss) <= budgets.local.processPeakRssBytesMax, peakRss, budgets.local.processPeakRssBytesMax);
const report = { contract: "algal.renderer-native-performance.v1", ok: checks.every(item => item.passed), declaration: declared, platform: { platform: process.platform, arch: process.arch }, initMs: init.ms, host, terminal, checks, limitations: ["Local development Mac and bounded 32-task profile only; not a production SLO or cross-platform benchmark", "CLI/TUI memory is Darwin time maximum resident size", "No model call, provider network operation or generated revision occurred in this measurement"] };
await writeFile(join(directory, "result.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ ok: report.ok, report: join(directory, "result.json"), checks }));
if (!report.ok) process.exitCode = 1;
