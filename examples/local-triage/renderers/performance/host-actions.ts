/** Separate host service work from CUA scrolling/observation. No UI or inference. */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Capture } from "../../contract";

const [packageArg, outputArg] = process.argv.slice(2);
if (!packageArg || !outputArg || process.platform !== "darwin") throw new Error("Usage on macOS: bun host-actions.ts PACKAGE_ROOT FRESH_OUTPUT");
const pkg = resolve(packageArg), output = resolve(outputArg), state = join(output, "state"), executable = join(pkg, "bin/triage-host");
await mkdir(output, { recursive: true });
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(await readFile(join(pkg, "manifest.json"), "utf8")) as { provenance: { gitHead: string; source: { sha256: string } }; files: { path: string; sha256: string }[] };
const identity = hash(await readFile(executable));
if (!manifest.files.some(file => file.path === "bin/triage-host" && file.sha256 === identity)) throw new Error("Package identity mismatch");
// A fresh, separately declared diagnostic. This does not replace the failed
// original 2 s desktop budget or establish click-to-paint latency.
const declaration = { contract: "algal.renderer-host-action-budget.v1", declaredAt: new Date().toISOString(), samples: 20, tasks: 32, actionP95MsMax: 2000, rationale: "Same explicit-action service ceiling as the original local host budget, measured before new work; includes operation digest process, JSON staging, command process, durable publication and capture parsing. Excludes UI dispatch, scrolling and paint.", scriptSha256: hash(await readFile(import.meta.path)), packageCommit: manifest.provenance.gitHead, packageSource: manifest.provenance.source.sha256, hostSha256: identity };
await writeFile(join(output, "declaration.json"), JSON.stringify(declaration, null, 2) + "\n", { flag: "wx" });
async function call(args: string[]) {
  const started = performance.now(), child = Bun.spawn([executable, state, "performance", ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const deadline = setTimeout(() => child.kill("SIGKILL"), 30000);
  try {
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    if (stdout.length > 524288 || stderr.length > 16384 || code !== 0) throw new Error(`Bounded host operation failed: ${stderr.slice(0, 2048)}`);
    return { value: JSON.parse(stdout) as unknown, ms: performance.now() - started };
  } finally { clearTimeout(deadline); if (child.exitCode === null) child.kill("SIGKILL"); await child.exited; }
}
const seedPath = join(output, "seed.json");
await writeFile(seedPath, JSON.stringify({ schemaVersion: 2, config: { sort: "priority", group: "status", allowReopen: true }, tasks: Array.from({ length: declaration.tasks }, (_, i) => ({ id: `task-${i}`, title: `Performance task ${String(i).padStart(2, "0")}`, priority: "normal", status: "open", category: "inbox" })) }), { flag: "wx" });
let capture = (await call(["init", seedPath])).value as Capture;
const samples: { ms: number; operationMs: number; commandMs: number; sequence: number }[] = [];
for (let i = 0; i < declaration.samples; i++) {
  const started = performance.now(), operation = await call(["operation", `performance-${i}`]);
  const action = { kind: i % 2 === 0 ? "complete" : "reopen", taskId: "task-0" };
  const path = join(output, `command-${i}.json`);
  await writeFile(path, JSON.stringify({ contract: "algal.triage-command.v1", expectedHead: capture.head, operation: operation.value, action }), { flag: "wx" });
  const result = await call(["command", path]);
  capture = result.value as Capture;
  if (capture.sequence !== i + 1 || capture.tasks.length !== declaration.tasks || capture.tasks.find(task => task.id === "task-0")?.status !== (i % 2 === 0 ? "done" : "open")) throw new Error("Host did not capture the expected exact-head transition");
  samples.push({ ms: performance.now() - started, operationMs: operation.ms, commandMs: result.ms, sequence: capture.sequence });
}
const values = samples.map(sample => sample.ms).sort((a, b) => a - b);
const p95Ms = values[Math.ceil(values.length * 0.95) - 1]!;
const result = { contract: "algal.renderer-host-action-performance.v1", ok: p95Ms <= declaration.actionP95MsMax, declaration, samples, p95Ms, maxMs: values.at(-1)!, finalHead: capture.head, finalSequence: capture.sequence, scope: "Packaged host service path used by Model.action, without desktop UI or accessibility observation. Does not replace the CUA result and does not isolate paint latency." };
await writeFile(join(output, "result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ ok: result.ok, p95Ms, maxMs: result.maxMs, samples: samples.length, report: join(output, "result.json") }));
if (!result.ok) process.exitCode = 1;
