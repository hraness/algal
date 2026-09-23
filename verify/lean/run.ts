import { copyFile, mkdir, mkdtemp, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { hashFile, hashJson, readJson, type FileBinding } from "../lib/files";
import { CommandFailure, requireSuccess, runCommand, type CommandResult } from "../lib/runner";
import { array, boolean, record, requireThat, string, strings } from "../lib/schema";
import { leanRuntime } from "./runtime";
import { parseModuleAudit, parseTheoremAudit, parseVectorOutput, theoremNames } from "./output";
import { compareBunStringVectors, compareBunVectors, compareNativeStringVectors, compareNativeVectors } from "./vectors";

const MODULES = ["Binary64", "Text", "JsonString", "OwnMap", "KeyOrder", "Json", "Normalize", "Ports", "Graph", "Accounting", "Oracle"];
const MODULE_NAMES = MODULES.map(name => `Algal.Core.${name}`);
const MODULE_AUDIT_SOURCE = `import Algal\naudit_modules ${MODULE_NAMES.join(", ")}\n`;
const MODULE_CONTROL_SOURCE = "import Algal.Audit\nimport Hidden\naudit_modules Hidden\n";
const LIMITS = { leanMemoryMiB: 1024, leanThreads: 1, commandMs: 120_000, outputBytes: 2_097_152 };
const ASSUMPTIONS = [
  "Pinned imported standard-library oleans are trusted; this is not whole-import trust=0 checking.",
  "The audit extension, Lean kernel, compiler/runtime, OS and cooperating local source/tool installation are trusted.",
  "Lean memory setting is a per-process Lean limit, not a measured OS RSS cap.",
  "Sampled Bun/native correspondence is not a mechanized production refinement or canonical JSON byte-codec proof.",
  "The caller must supply a native driver freshly built from the bound source and lockfile; its byte hash alone is not build provenance.",
];
const CONTROLS = [
  { file: "ImportedAxiom", name: "AlgalControl.imported", axiom: "AlgalControl.hidden" },
  { file: "Sorry", name: "AlgalControl.admitted", axiom: "sorryAx" },
  // Lean 4.34 emits a scoped compiler-backed axiom for this native_decide.
  { file: "Native", name: "AlgalControl.native", axiom: "AlgalControl.native._native.native_decide.ax_1_1" },
  { file: "Definition", name: "AlgalControl.definition", error: "audit requires a theorem declaration" },
  { file: "False", name: "AlgalControl.invalid", error: "Type mismatch" },
  { file: "Missing", name: "AlgalControl.missing", error: "Unknown constant" },
] as const;

async function projectPaths(root: string): Promise<string[]> {
  const paths: string[] = []; let visited = 0;
  async function walk(path: string): Promise<void> {
    for (const entry of await readdir(join(root, path), { withFileTypes: true })) {
      requireThat(++visited <= 256, "Lean project inventory bound");
      if (entry.name === ".lake") continue;
      const child = `${path}/${entry.name}`;
      requireThat(!entry.isSymbolicLink(), "Lean project symlink rejected");
      if (entry.isDirectory()) await walk(child);
      else { requireThat(entry.isFile(), "Lean project nonregular input"); paths.push(child); }
    }
  }
  await walk("verify/lean");
  return paths.sort();
}

/** Source correspondence here is sampled; changing either runtime invalidates it.
 * These bindings deliberately do not license the broader property ledger. */
export async function leanInputs(root: string): Promise<FileBinding[]> {
  const paths = [...await projectPaths(root), "verify/tests/lean-output.test.ts", "verify/tests/lean-vectors.test.ts",
    "verify/toolchains.json", "verify/toolchain-distributions.json", "verify/lib/runner.ts", "verify/lib/command-supervisor.ts",
    "verify/lib/files.ts", "verify/lib/schema.ts", "verify/lib/proof.ts", "verify/lib/claims.ts", "verify/lib/suites.ts",
    "src/values.ts", "src/errors.ts", "crates/algal/examples/verification_lean_vectors.rs", "crates/algal/src/canonical.rs",
    "crates/algal/src/lib.rs", "crates/algal/src/error.rs", "Cargo.toml", "Cargo.lock", "crates/algal/Cargo.toml"];
  // Every domain's correspondence targets belong to its recorded identity.
  const inventory = await readJson(root, "verify/lean/Algal/Core/theorems.json"); theoremNames(inventory);
  for (const domain of (inventory as { domains: { sources: string[] }[] }).domains) paths.push(...domain.sources);
  return Promise.all([...new Set(paths)].sort().map(async path => ({ path, sha256: await hashFile(root, path) })));
}

function negativeWitness(result: CommandResult, control: typeof CONTROLS[number]): void {
  requireThat(!result.timedOut && !result.outputExceeded && result.cleanupObserved && result.signal === null && result.stderr === "", "Lean control did not complete under custody");
  const messages = result.stdout.trim().split("\n").map(line => JSON.parse(line) as { severity: string; data: string });
  if ("axiom" in control) {
    requireThat(result.exitCode === 0, "Lean axiom control did not elaborate");
    const facts = messages.filter(message => message.severity === "information").map(message => JSON.parse(message.data) as { name: string; transitiveAxioms: string[] });
    requireThat(facts.length === 1 && facts[0]!.name === control.name && facts[0]!.transitiveAxioms.includes(control.axiom), `Lean control did not witness expected axiom ${control.axiom}`);
  } else {
    requireThat(result.exitCode === 1 && messages.some(message => message.severity === "error" && message.data.includes(control.error)), "Lean control failed for an unrelated reason");
  }
  let rejected = false;
  try { parseTheoremAudit(result, `${control.file}.lean`, [control.name]); }
  catch (error) { rejected = !("axiom" in control) || error instanceof Error && error.message === `unreviewed transitive Lean axiom ${control.axiom}`; }
  requireThat(rejected, "Lean negative control was incorrectly admitted");
}

function negativeModuleWitness(result: CommandResult): void {
  requireSuccess(result);
  const message = JSON.parse(result.stdout) as { data: string };
  const data = JSON.parse(message.data) as { theorems: { name: string; transitiveAxioms: string[] }[] };
  requireThat(data.theorems.some(row => row.name === "AlgalControl.indirect" && row.transitiveAxioms.includes("AlgalControl.hidden")), "module control did not expose the unclaimed theorem's custom axiom");
  requireThat(data.theorems.some(row => row.name === "AlgalControl.safe" && row.transitiveAxioms.length === 0), "module control omitted its independently valid claimed theorem");
  let rejected = false;
  try { parseModuleAudit(result, "GeneratedModuleControl.lean", ["Hidden"], [{ name: "AlgalControl.safe", module: "Hidden" }]); }
  catch (error) { rejected = error instanceof Error && error.message === "unreviewed transitive Lean axiom AlgalControl.hidden"; }
  requireThat(rejected, "module axiom audit incorrectly admitted an unreviewed dependency");
}

function inventoryClaims(inventory: unknown): { name: string; module: string }[] {
  theoremNames(inventory);
  const admitted = inventory as { domains: { module: string }[]; theorems: { name: string; module: string }[] };
  requireThat(hashJson(admitted.domains.map(domain => domain.module)) === hashJson(MODULE_NAMES), "Lean inventory modules differ from complete environment audit");
  return admitted.theorems.map(({ name, module }) => ({ name, module }));
}

export async function runLeanCore(root: string, nativeExecutable: string): Promise<unknown> {
  requireThat(isAbsolute(nativeExecutable), "Lean native vector driver must be absolute");
  const native = await realpath(nativeExecutable), nativeSha256 = await hashFile(dirname(native), native.split("/").at(-1)!);
  const inputs = await leanInputs(root), runtime = await leanRuntime(root);
  const stage = await mkdtemp(join(tmpdir(), "algal-lean-core-"));
  const commands: { label: string; result: CommandResult }[] = [];
  let closed = true, passed = false;
  try {
    for (const input of inputs.filter(input => input.path.startsWith("verify/lean/") && (input.path.endsWith(".lean") || input.path.endsWith(".toml") || input.path.endsWith("lean-toolchain")))) {
      const path = input.path.slice("verify/lean/".length);
      await mkdir(dirname(join(stage, path)), { recursive: true }); await copyFile(join(root, input.path), join(stage, path));
      requireThat(await hashFile(stage, path) === input.sha256, "Lean source changed while staging");
    }
    await mkdir(join(stage, "home"));
    const environment = ["/usr/bin/env", "-i", `HOME=${join(stage, "home")}`, `PATH=${join(runtime.root, "bin")}:/usr/bin:/bin`, "LANG=C", "LC_ALL=C", "TZ=UTC"];
    async function command(label: string, argv: string[]): Promise<CommandResult> {
      closed = false;
      const result = await runCommand([...environment, ...argv], stage, { timeoutMs: LIMITS.commandMs, maxOutputBytes: LIMITS.outputBytes });
      closed = result.cleanupObserved; commands.push({ label, result });
      await Bun.write(join(stage, "commands.json"), JSON.stringify(commands, null, 2) + "\n");
      return result;
    }
    // Explicit sequential modules bound simultaneous compiler processes. Every
    // invocation is fresh-source or depends on an earlier build in this stage.
    for (const module of [...MODULES.map(name => `Algal.Core.${name}`), "Algal.Audit", "Algal"]) {
      requireSuccess(await command(`build:${module}`, [runtime.lake, "--no-cache", "--no-ansi", "--wfail", "build", module]));
    }
    const inventory = await readJson(root, "verify/lean/Algal/Core/theorems.json"), names = theoremNames(inventory);
    const source = `import Algal\n${names.map(name => `audit_theorem ${name}`).join("\n")}\n`;
    await Bun.write(join(stage, "GeneratedAudit.lean"), source);
    const leanArgs = [runtime.lake, "env", runtime.lean, "--threads=1", "--memory=1024", "--json"];
    const audit = await command("theorem-audit", [...leanArgs, "GeneratedAudit.lean"]);
    const theorems = parseTheoremAudit(audit, "GeneratedAudit.lean", names);
    await Bun.write(join(stage, "GeneratedModuleAudit.lean"), MODULE_AUDIT_SOURCE);
    const moduleTheorems = parseModuleAudit(await command("module-theorem-audit", [...leanArgs, "GeneratedModuleAudit.lean"]), "GeneratedModuleAudit.lean", MODULE_NAMES, inventoryClaims(inventory));
    // Compile a separate imported axiom to expose transitive dependencies, not
    // merely an authored local #print summary or a synthetic parser fixture.
    for (const file of ["Hidden", ...CONTROLS.map(control => control.file)]) await copyFile(join(stage, "controls", `${file}.lean`), join(stage, `${file}.lean`));
    requireSuccess(await command("control:compile-hidden", [...leanArgs, "-o", ".lake/build/lib/lean/Hidden.olean", "Hidden.lean"]));
    for (const control of CONTROLS) negativeWitness(await command(`control:${control.file}`, [...leanArgs, `${control.file}.lean`]), control);
    await Bun.write(join(stage, "GeneratedModuleControl.lean"), MODULE_CONTROL_SOURCE);
    negativeModuleWitness(await command("control:unclaimed-module-axiom", [...leanArgs, "GeneratedModuleControl.lean"]));
    const vectors = await command("model-vectors", [...leanArgs, "--run", "Algal/Core/Vectors.lean"]);
    const expected = compareBunVectors(parseVectorOutput(vectors));
    await Bun.write(join(stage, "vectors.json"), vectors.stdout);
    const nativeResult = await command("native-vectors", [native, join(stage, "vectors.json")]);
    compareNativeVectors(parseVectorOutput(nativeResult), expected);
    const stringVectors = await command("string-vectors", [...leanArgs, "--run", "Algal/Core/StringVectors.lean"]);
    const expectedStrings = compareBunStringVectors(parseVectorOutput(stringVectors));
    await Bun.write(join(stage, "strings.json"), stringVectors.stdout);
    const nativeStrings = await command("native-string-vectors", [native, join(stage, "strings.json")]);
    compareNativeStringVectors(parseVectorOutput(nativeStrings), expectedStrings);
    const after = await leanInputs(root), runtimeAfter = await leanRuntime(root);
    requireThat(hashJson(after) === hashJson(inputs) && hashJson(runtimeAfter) === hashJson(runtime), "Lean source/runtime changed during checking");
    requireThat(await hashFile(dirname(native), native.split("/").at(-1)!) === nativeSha256, "native vector binary changed during checking");
    passed = true;
    return { contract: "algal.lean-core-evidence.v1", scope: "semantic-model-only", stage, inputs, runtime, limits: LIMITS,
      native: { path: native, sha256: nativeSha256 }, generatedAudit: source, generatedModuleAudit: MODULE_AUDIT_SOURCE, theorems, moduleTheorems, vectors: expected, stringVectors: expectedStrings, commands,
      unmetCriteria: (inventory as { unmetCriteria: unknown }).unmetCriteria,
      assumptions: ASSUMPTIONS };
  } catch (error) {
    if (error instanceof CommandFailure) {
      await Bun.write(join(stage, "custody-failure-stdout.bin"), error.rawStdout);
      await Bun.write(join(stage, "custody-failure-stderr.bin"), error.rawStderr);
      await Bun.write(join(stage, "custody-failure.json"), JSON.stringify(error.observation, null, 2));
    }
    throw new Error(`Lean qualification failed; diagnostics retained at ${stage}: ${String(error)}`, { cause: error });
  } finally {
    if (passed && closed) await rm(stage, { recursive: true });
  }
}

function commandResult(value: unknown): CommandResult {
  const result = record(value, ["command", "exitCode", "signal", "timedOut", "outputExceeded", "cleanupObserved", "stdout", "stderr"], "Lean command result");
  requireThat(result.exitCode === null || Number.isInteger(result.exitCode) && (result.exitCode as number) >= 0 && (result.exitCode as number) <= 255, "invalid Lean command exit");
  requireThat(result.signal === null || typeof result.signal === "string", "invalid Lean command signal");
  for (const key of ["timedOut", "outputExceeded", "cleanupObserved"] as const) boolean(result[key], key);
  requireThat(typeof result.stdout === "string" && typeof result.stderr === "string" && Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr) <= LIMITS.outputBytes, "Lean command output bound");
  const command = strings(result.command, "Lean command argv", 1, 64);
  requireThat(command.every(argument => argument.length <= 4096), "Lean argument bound");
  return { ...result, command } as CommandResult;
}

/** Re-admit retained raw results against the current source/tool identities.
 * Receipts are local execution evidence, not signed remote attestations. This
 * does not replace execution at an integration/release gate. */
export async function recheckLeanCoreEvidence(root: string, value: unknown): Promise<{ scope: "semantic-model-only"; theorems: number; moduleTheorems: number; negativeControls: number; vectorDigest: string; stringVectorDigest: string }> {
  const receipt = record(value, ["contract", "scope", "stage", "inputs", "runtime", "limits", "native", "generatedAudit", "generatedModuleAudit", "theorems", "moduleTheorems", "vectors", "stringVectors", "commands", "unmetCriteria", "assumptions"], "Lean evidence");
  requireThat(receipt.contract === "algal.lean-core-evidence.v1" && receipt.scope === "semantic-model-only", "Lean receipt overstates proof scope");
  const stage = string(receipt.stage, "Lean staging path", 4096); requireThat(isAbsolute(stage), "Lean stage must be absolute");
  const inputs = await leanInputs(root), runtime = await leanRuntime(root);
  requireThat(hashJson(receipt.inputs) === hashJson(inputs) && hashJson(receipt.runtime) === hashJson(runtime) && hashJson(receipt.limits) === hashJson(LIMITS), "stale Lean source/runtime/limit binding");
  const native = record(receipt.native, ["path", "sha256"], "Lean native driver");
  const nativePath = string(native.path, "native driver path", 4096); requireThat(isAbsolute(nativePath) && await realpath(nativePath) === nativePath, "native path identity changed");
  requireThat(await hashFile(dirname(nativePath), nativePath.split("/").at(-1)!) === native.sha256, "native driver bytes changed");
  const inventory = await readJson(root, "verify/lean/Algal/Core/theorems.json"), names = theoremNames(inventory);
  const generatedAudit = `import Algal\n${names.map(name => `audit_theorem ${name}`).join("\n")}\n`;
  requireThat(receipt.generatedAudit === generatedAudit && hashJson(receipt.unmetCriteria) === hashJson((inventory as { unmetCriteria: unknown }).unmetCriteria), "Lean inventory or limitations differ");
  requireThat(receipt.generatedModuleAudit === MODULE_AUDIT_SOURCE, "Lean module audit program differs");
  requireThat(hashJson(receipt.assumptions) === hashJson(ASSUMPTIONS), "Lean trust assumptions differ");
  const environment = ["/usr/bin/env", "-i", `HOME=${join(stage, "home")}`, `PATH=${join(runtime.root, "bin")}:/usr/bin:/bin`, "LANG=C", "LC_ALL=C", "TZ=UTC"];
  const leanArgs = [runtime.lake, "env", runtime.lean, "--threads=1", "--memory=1024", "--json"];
  const rows = array(receipt.commands, "Lean command history", MODULES.length + CONTROLS.length + 10, MODULES.length + CONTROLS.length + 10);
  let next = 0;
  function take(label: string, argv: string[]): CommandResult {
    const row = record(rows[next++], ["label", "result"], "Lean command history row");
    requireThat(row.label === label, "missing/reordered Lean command");
    const result = commandResult(row.result);
    requireThat(hashJson(result.command) === hashJson([...environment, ...argv]), "Lean command/configuration identity differs");
    return result;
  }
  for (const module of [...MODULES.map(name => `Algal.Core.${name}`), "Algal.Audit", "Algal"]) requireSuccess(take(`build:${module}`, [runtime.lake, "--no-cache", "--no-ansi", "--wfail", "build", module]));
  const theorems = parseTheoremAudit(take("theorem-audit", [...leanArgs, "GeneratedAudit.lean"]), "GeneratedAudit.lean", names);
  requireThat(hashJson(receipt.theorems) === hashJson(theorems), "Lean normalized theorem report differs from actual environment output");
  const moduleTheorems = parseModuleAudit(take("module-theorem-audit", [...leanArgs, "GeneratedModuleAudit.lean"]), "GeneratedModuleAudit.lean", MODULE_NAMES, inventoryClaims(inventory));
  requireThat(hashJson(receipt.moduleTheorems) === hashJson(moduleTheorems), "Lean module theorem report differs from actual environment output");
  requireSuccess(take("control:compile-hidden", [...leanArgs, "-o", ".lake/build/lib/lean/Hidden.olean", "Hidden.lean"]));
  for (const control of CONTROLS) negativeWitness(take(`control:${control.file}`, [...leanArgs, `${control.file}.lean`]), control);
  negativeModuleWitness(take("control:unclaimed-module-axiom", [...leanArgs, "GeneratedModuleControl.lean"]));
  const vectors = take("model-vectors", [...leanArgs, "--run", "Algal/Core/Vectors.lean"]);
  const nativeResult = take("native-vectors", [nativePath, join(stage, "vectors.json")]);
  const expected = compareBunVectors(parseVectorOutput(vectors));
  compareNativeVectors(parseVectorOutput(nativeResult), expected);
  const stringVectors = take("string-vectors", [...leanArgs, "--run", "Algal/Core/StringVectors.lean"]);
  const nativeStrings = take("native-string-vectors", [nativePath, join(stage, "strings.json")]);
  const expectedStrings = compareBunStringVectors(parseVectorOutput(stringVectors));
  compareNativeStringVectors(parseVectorOutput(nativeStrings), expectedStrings);
  requireThat(hashJson(receipt.vectors) === hashJson(expected) && hashJson(receipt.stringVectors) === hashJson(expectedStrings) && next === rows.length, "normalized vector report/command history differs");
  return { scope: "semantic-model-only", theorems: theorems.length, moduleTheorems: moduleTheorems.length, negativeControls: CONTROLS.length + 1, vectorDigest: hashJson(expected), stringVectorDigest: hashJson(expectedStrings) };
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "../..");
  const native = process.env.ALGAL_LEAN_NATIVE_BIN;
  requireThat(native !== undefined, "ALGAL_LEAN_NATIVE_BIN is required; build verification_lean_vectors with the pinned locked toolchain");
  console.log(JSON.stringify(await runLeanCore(root, native)));
}
