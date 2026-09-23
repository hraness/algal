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
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; child.kill(); }, 60_000);
  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    if (timedOut || child.signalCode !== null || code !== expected) throw new Error(`${native ? "native" : "reference"} ${args.slice(0, 2).join(" ")}: exit ${code}, signal ${child.signalCode}, timeout ${timedOut}, expected ${expected}: ${(stderr || stdout).slice(-4000)}`);
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
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; child.kill(); }, 60_000);
    try {
      const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      if (timedOut || child.signalCode !== null || code !== 2) throw new Error(`${name}: ${native ? "native" : "reference"} expected rejection exit 2; got ${code}, signal ${child.signalCode}, timeout ${timedOut}: ${(stdout || stderr).slice(-4000)}`);
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
  for (const field of ["rounds", "items"]) {
    const optional = structuredClone(receipt);
    ((optional.cells as JsonObject).ticket as JsonObject)[field] = 1;
    optional.digest = receiptDigest(optional as unknown as RunReceipt);
    await compare(`diff-optional-${field}`, ["diff", receiptFile, await fixture(`optional-${field}.json`, optional)], 1);
  }
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
  const namedTicket = {ticket: "App crashes when I press export twice"};
  const namedTicketFile = await fixture("named-ticket.json", namedTicket);
  const interfaceCall = await compare("call-interface-file", ["call", bundleFile, "--interface", "--args", namedTicketFile, "--responses", join(root, "examples/triage.responses.json")]) as JsonObject;
  const expectedSummary = ((receipt.cells as JsonObject).result as JsonObject).outputs as JsonObject;
  if (canonicalize(interfaceCall.outputs!) !== canonicalize({summary: expectedSummary.value!})) throw new Error("interface call exposed undeclared outputs");
  await compare("call-interface-stdin", ["call", bundleFile, "--interface", "--args", "-", "--responses", join(root, "examples/triage.responses.json")], 0, canonicalize(namedTicket));
  await compare("call-interface-before-bundle", ["call", "--interface", bundleFile, "--args", namedTicketFile, "--responses", join(root, "examples/triage.responses.json")]);
  await reject("call-interface-duplicate-flag", ["call", bundleFile, "--interface", "--interface", "--args", namedTicketFile]);
  await reject("call-interface-assigned-value", ["call", bundleFile, "--interface=true", "--args", namedTicketFile]);
  await reject("call-interface-extra-positional", ["call", bundleFile, "--interface", "unexpected-bundle", "--args", namedTicketFile]);
  await reject("call-interface-missing-input", ["call", bundleFile, "--interface", "--args", await fixture("missing-interface-args.json", {})]);
  await reject("call-interface-unknown-input", ["call", bundleFile, "--interface", "--args", await fixture("extra-interface-args.json", {...namedTicket, extra: true})]);
  const helloBundle = await compare("pack-interface-empty", ["pack", join(root, "examples/hello.algal.json")]);
  const helloCall = await compare("call-interface-empty", ["call", await fixture("hello.bundle.json", helloBundle), "--interface"]) as JsonObject;
  if (canonicalize(helloCall.outputs!) !== canonicalize({greeting: "Programs that grow."})) throw new Error("parameterless interface call output mismatch");
  const jsonInterface = await fixture("json-interface.json", {
    contract: "algal.organism.v1", key: "organism:cli-json-interface", name: "JSON interface",
    interface: {inputs: {payload: {cell: "input", port: "value"}}, outputs: {echo: {cell: "input", port: "value"}}},
    cells: [{id: "input", kind: "input", outputs: {value: "json"}}], edges: [],
  });
  const jsonBundle = await compare("pack-interface-json", ["pack", jsonInterface]);
  const nested = {input: {value: "opaque interface data"}};
  const jsonCall = await compare("call-interface-json", ["call", await fixture("json-interface.bundle.json", jsonBundle), "--interface", "--args", await fixture("named-json.json", {payload: nested})]) as JsonObject;
  if (canonicalize(jsonCall.outputs!) !== canonicalize({echo: nested})) throw new Error("interface JSON input was reinterpreted as cell arguments");
  const aliasedInterface = await fixture("aliased-interface.json", {
    ...JSON.parse(await readFile(jsonInterface, "utf8")), key: "organism:cli-aliased-interface",
    interface: {inputs: {left: {cell: "input", port: "value"}, right: {cell: "input", port: "value"}}, outputs: {echo: {cell: "input", port: "value"}}},
  });
  const aliasBundle = await compare("pack-interface-alias", ["pack", aliasedInterface]);
  const aliasBundleFile = await fixture("alias.bundle.json", aliasBundle);
  const identicalAliases = await compare("call-interface-identical-aliases", ["call", aliasBundleFile, "--interface", "--args", await fixture("alias-identical.json", {left: {a: 1, b: 2}, right: {b: 2, a: 1}})]) as JsonObject;
  if (canonicalize(identicalAliases.outputs!) !== canonicalize({echo: {a: 1, b: 2}})) throw new Error("identical interface aliases did not preserve the input");
  await reject("call-interface-conflicting-aliases", ["call", aliasBundleFile, "--interface", "--args", await fixture("alias-conflicting.json", {left: {a: 1}, right: {a: 2}})]);
  const constructorInterface = await fixture("constructor-interface.json", {
    contract: "algal.organism.v1", key: "organism:cli-constructor-interface", name: "Constructor names",
    interface: {inputs: {constructor: {cell: "constructor", port: "constructor"}}, outputs: {constructor: {cell: "constructor", port: "constructor"}}},
    cells: [{id: "constructor", kind: "input", outputs: {constructor: "json"}}], edges: [],
  });
  const constructorBundle = await compare("pack-interface-constructor", ["pack", constructorInterface]);
  const constructorCall = await compare("call-interface-constructor", ["call", await fixture("constructor.bundle.json", constructorBundle), "--interface", "--args", await fixture("constructor-args.json", {constructor: {constructor: 42}})]) as JsonObject;
  if (canonicalize(constructorCall.outputs!) !== canonicalize({constructor: {constructor: 42}})) throw new Error("constructor interface name resolved an inherited property");
  const failedManifest = await fixture("failure.json", {
    contract: "algal.organism.v1", key: "organism:cli-failure", name: "failure",
    cells: [{ id: "divide", kind: "expr", inputs: {}, expr: { contract: "algal.expr.v1", program: ["div", 1, 0] }, output: { kind: "json", schema: {} } }], edges: [],
  });
  const failedBundle = await compare("pack-failure", ["pack", failedManifest]);
  const failedBundleFile = await fixture("failure.bundle.json", failedBundle);
  await compare("call-failure", ["call", failedBundleFile], 1);
  await reject("call-interface-without-declaration", ["call", failedBundleFile, "--interface"]);
  const failedInterfaceManifest = await fixture("failure-interface.json", {...JSON.parse(await readFile(failedManifest, "utf8")), interface: {inputs: {}, outputs: {value: {cell: "divide", port: "out"}}}});
  const failedInterfaceBundle = await compare("pack-failure-interface", ["pack", failedInterfaceManifest]);
  const failedInterfaceCall = await compare("call-interface-failure", ["call", await fixture("failure-interface.bundle.json", failedInterfaceBundle), "--interface"], 1) as JsonObject;
  if (failedInterfaceCall.ok !== false || canonicalize(failedInterfaceCall.outputs!) !== "{}") throw new Error("failed interface call fabricated an output");
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
  // Application lineage is read-only: an absent application emits `[]` on both CLIs.
  await compare("application-lineage-empty", ["application", "lineage", "missing-app"]);
  await reject("application-lineage-extra-positional", ["application", "lineage", "a", "b"]);
  console.log(`CLI parity: ${checked} cases passed (canonical results and rejection statuses)`);
} finally { await rm(temp, { recursive: true, force: true }); }
