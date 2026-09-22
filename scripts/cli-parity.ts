/** Execute the public command surfaces through both CLIs. Compare complete
 * canonical records and expected exit status, including failed and suspended
 * runs. No provider, network, or credential access is required. */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { canonicalize, type JsonObject, type JsonValue } from "../src/values";
import { receiptDigest, type RunReceipt } from "../src/run";

const root = resolve(import.meta.dir, "..");
const binary = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const temp = await mkdtemp(join(tmpdir(), "algal-cli-parity-"));
const stores = [join(temp, "reference"), join(temp, "native")];
await Promise.all(stores.map(dir => mkdir(dir, { recursive: true })));
let checked = 0;

async function invoke(native: boolean, args: string[], expected: number, input?: string): Promise<JsonValue> {
  const child = Bun.spawn(native ? [binary, ...args, "--dir", stores[1]!] : [process.execPath, join(root, "cli.ts"), ...args, "--dir", stores[0]!], {
    cwd: root, stdout: "pipe", stderr: "pipe", stdin: input === undefined ? "ignore" : new TextEncoder().encode(input),
  });
  const timeout = setTimeout(() => child.kill(), 60_000);
  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    if (code !== expected) throw new Error(`${native ? "native" : "reference"} ${args.slice(0, 2).join(" ")}: exit ${code}, expected ${expected}: ${(stderr || stdout).slice(-4000)}`);
    return JSON.parse(stdout) as JsonValue;
  } finally { clearTimeout(timeout); }
}
async function compare(name: string, args: string[], expected = 0, input?: string): Promise<JsonValue> {
  const [reference, native] = await Promise.all([invoke(false, args, expected, input), invoke(true, args, expected, input)]);
  if (canonicalize(reference!) !== canonicalize(native!)) throw new Error(`${name}: records differ\nreference: ${canonicalize(reference!).slice(0,6000)}\nnative: ${canonicalize(native!).slice(0,6000)}`);
  checked++;
  return reference!;
}
async function fixture(name: string, value: JsonValue): Promise<string> {
  const path = join(temp, name);
  await writeFile(path, canonicalize(value));
  return path;
}
async function reject(name: string, args: string[]): Promise<void> {
  for (const native of [false, true]) {
    const child = Bun.spawn(native ? [binary, ...args, "--dir", stores[1]!] : [process.execPath, join(root, "cli.ts"), ...args, "--dir", stores[0]!], {cwd: root, stdout: "pipe", stderr: "pipe"});
    const timeout = setTimeout(() => child.kill(), 60_000);
    try {
      const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      if (code === 0) throw new Error(`${name}: ${native ? "native" : "reference"} accepted malformed data: ${stdout || stderr}`);
    } finally { clearTimeout(timeout); }
  }
  checked++;
}

try {
  for (const name of ["hello", "triage", "expr-rate", "refine", "bench-batch-each"]) {
    const file = join(root, "examples", `${name}.algal.json`);
    // Explicit fixtures never silently skip.
    await readFile(file);
    await compare(`check-${name}`, ["check", file, "--modules", join(root, "examples")]);
    await compare(`explain-${name}`, ["explain", file, "--modules", join(root, "examples")]);
  }
  const fieldGuard = await fixture("field-guard.json", {
    contract: "algal.organism.v1", key: "organism:cli-field-guard", name: "field guard",
    cells: [
      { id: "source", kind: "const", outputs: { value: { type: "json", value: { enabled: "yes" } } } },
      { id: "sink", kind: "expr", inputs: { value: "json" }, expr: { contract: "algal.expr.v1", program: ["get", "value"] }, output: { kind: "json", schema: {} } },
    ],
    edges: [{ from: { cell: "source", port: "value" }, to: { cell: "sink", port: "value" }, guard: { field: "enabled", equals: "yes" } }],
  });
  await compare("explain-preserves-guard-field", ["explain", fieldGuard]);
  const triage = join(root, "examples/triage.algal.json");
  const execution = ["--args", join(root, "examples/triage.args.json"), "--responses", join(root, "examples/triage.responses.json")];
  const receipt = await compare("run", ["run", triage, ...execution, "--write"]) as JsonObject;
  const receiptFile = await fixture("receipt.json", receipt);
  await compare("inspect", ["inspect", receiptFile]);
  await compare("verify-explicit-manifest", ["verify", receiptFile, triage]);
  await compare("verify-stored-manifest", ["verify", receiptFile]);
  const tamperedDigest = structuredClone(receipt);
  tamperedDigest.digest = `sha256:${"0".repeat(64)}`;
  await compare("verify-tampered-digest", ["verify", await fixture("tampered-digest.json", tamperedDigest), triage], 1);
  await compare("verify-wrong-manifest", ["verify", receiptFile, join(root, "examples/hello.algal.json")], 1);
  await compare("diff-equal", ["diff", receiptFile, receiptFile]);
  for (const [name, mutate] of [
    ["runtime", (copy: JsonObject) => { (copy.runtime as JsonObject).name = "foreign-runtime"; }],
    ["foreign-field", (copy: JsonObject) => { copy.unrecognized = true; }],
    ["missing-work", (copy: JsonObject) => { delete (copy.work as JsonObject).units; }],
  ] as const) {
    const malformed = structuredClone(receipt);
    mutate(malformed);
    malformed.digest = receiptDigest(malformed as unknown as RunReceipt);
    const file = await fixture(`malformed-${name}.json`, malformed);
    await reject(`inspect-${name}`, ["inspect", file]);
    await reject(`diff-${name}`, ["diff", file, file]);
    await reject(`verify-${name}`, ["verify", file, triage]);
  }
  const changed = structuredClone(receipt);
  (changed.args as JsonObject).ticket = { text: "different source argument" };
  changed.digest = receiptDigest(changed as unknown as RunReceipt);
  const changedFile = await fixture("changed.json", changed);
  await compare("verify-tampered-arguments", ["verify", changedFile, triage], 1);
  const difference = await compare("diff-different-args", ["diff", receiptFile, changedFile], 1) as JsonObject;
  if (difference.same !== false) throw new Error("diff ignored changed arguments");
  const bundle = await compare("pack", ["pack", triage]);
  const bundleFile = await fixture("bundle.json", bundle);
  await compare("call-file", ["call", bundleFile, ...execution]);
  await compare("call-stdin", ["call", bundleFile, "--args", "-", "--responses", join(root, "examples/triage.responses.json")], 0, await readFile(join(root, "examples/triage.args.json"), "utf8"));
  const failedManifest = await fixture("failure.json", {
    contract: "algal.organism.v1", key: "organism:cli-failure", name: "failure",
    cells: [{ id: "divide", kind: "expr", inputs: {}, expr: { contract: "algal.expr.v1", program: ["div", 1, 0] }, output: { kind: "json", schema: {} } }], edges: [],
  });
  const failedBundle = await compare("pack-failure", ["pack", failedManifest]);
  const failedBundleFile = await fixture("failure.bundle.json", failedBundle);
  await compare("call-failure", ["call", failedBundleFile], 1);
  const agent = await fixture("agent.json", {
    contract: "algal.organism.v1", key: "organism:cli-suspension", name: "suspension",
    cells: [{ id: "answer", kind: "agent", prompt: "Return done", output: { kind: "text" } }], edges: [],
  });
  const ready = join(temp, "ready");
  const command = `cat >/dev/null; test -f '${ready}' || exit 75; printf '"done"'`;
  const suspended = await compare("run-suspended", ["run", agent, "--executor-cmd", command, "--write"], 1);
  const suspendedFile = await fixture("suspended.json", suspended);
  await compare("inspect-suspended", ["inspect", suspendedFile]);
  await writeFile(ready, "ready");
  const resumed = await compare("resume-stored-manifest", ["resume", suspendedFile, "--executor-cmd", command, "--write"]);
  const resumedFile = await fixture("resumed.json", resumed);
  await compare("verify-resumed", ["verify", resumedFile, agent]);
  await compare("resume-explicit-manifest", ["resume", suspendedFile, agent, "--executor-cmd", command]);
  await compare("suite", ["suite"]);
  const badExamples = join(temp, "bad-examples");
  await mkdir(badExamples);
  await writeFile(join(badExamples, "hello.algal.json"), await readFile(join(root, "examples/hello.algal.json")));
  await writeFile(join(badExamples, "hello.responses.json"), "{malformed");
  await reject("suite-corrupt-optional-evidence", ["suite", "--examples", badExamples]);
  console.log(`CLI parity: ${checked} command results identical across TypeScript and native`);
} finally { await rm(temp, { recursive: true, force: true }); }
