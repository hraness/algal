import { commandFailureRecord, retainFailure } from "../../lib/failure";
/** Bounded local model diagnosis. Operational evidence uses the shared TLC suite. */
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { hashBytes, stableJson } from "../../lib/files";
import { admitTlcCommandOutput, renderTlcConfiguration, TLC_OPTIONS, type TlcExpected } from "../../lib/tlc";
import { CommandFailure, runCommand } from "../../lib/runner";
import type { TlcConfiguration } from "../../lib/proof";
import { MAILBOX_MUTATIONS, MAILBOX_PROFILES } from "./profiles";

const root = resolve(import.meta.dir, "../../.."), id = process.argv[2], requested = process.argv[3];
const mutation = MAILBOX_MUTATIONS.find(item => item.id === id);
const profile = MAILBOX_PROFILES.find(item => item.id === (mutation?.base ?? id));
if (!profile || process.argv.length > 4) throw new Error("name one static mailbox profile/mutation and optional declared action property");
const action = requested === undefined ? undefined : profile.actions.find(item => item.property === requested);
if (requested !== undefined && (!action || mutation)) throw new Error("unknown or incompatible action witness");
const config: TlcConfiguration = {
  contract: "algal.verification-tlc-config.v1", mode: "model-check", behavior: "temporal",
  constants: { ...profile.constants, ...(mutation?.mutation ? { Mutation: JSON.stringify(mutation.mutation) } : {}) },
  specification: mutation?.specification ?? profile.specification,
  invariants: profile.invariants, properties: action ? [action.property] : profile.properties,
  importantActions: profile.actions.map(item => item.action), constraints: [], actionConstraints: [], overrides: [], symmetry: null,
};
const expected: TlcExpected = { kind: mutation?.kind ?? (action ? "action" : "success"), property: mutation?.property ?? action?.property ?? null, action: action?.action ?? null };
const directory = await mkdtemp(join(tmpdir(), "algal-mailbox-model-"));
for (const child of ["home", "tmp"]) await mkdir(join(directory, child));
const source = await readFile(join(root, profile.path)), cfg = renderTlcConfiguration(config);
await writeFile(join(directory, `${profile.module}.tla`), source);
await writeFile(join(directory, "Model.cfg"), cfg);
const metadata = JSON.parse(await readFile(join(root, "verify/toolchains.json"), "utf8")) as { tools: { id: string; command: string[]; sha256: string }[] };
const java = metadata.tools.find(tool => tool.id === "java")!, tlc = metadata.tools.find(tool => tool.id === "tlc")!;
if (hashBytes(await readFile(java.command[0]!)) !== java.sha256 || hashBytes(await readFile(tlc.command[2]!)) !== tlc.sha256) throw new Error("diagnostic executable/JAR pin changed");
const command = [java.command[0]!, "-XX:+UseParallelGC", "-Xmx256m", `-Duser.home=${join(directory, "home")}`, `-Djava.io.tmpdir=${join(directory, "tmp")}`, "-cp", tlc.command[2]!, "tlc2.TLC", ...TLC_OPTIONS, "-metadir", join(directory, "states"), "-config", "Model.cfg", profile.module];
try {
  const result = await runCommand(command, directory, { timeoutMs: 30_000, maxOutputBytes: 2_097_152 });
  await writeFile(join(directory, "command.json"), stableJson(result) + "\n");
  await writeFile(join(directory, "stdout.log"), result.stdout); await writeFile(join(directory, "stderr.log"), result.stderr);
  const admitted = admitTlcCommandOutput(result, profile.module, config, expected);
  const { trace, ...summary } = admitted;
  console.log(stableJson({ id, requested: requested ?? null, directory, diagnosticOnly: true, sourceSha256: hashBytes(source), configurationSha256: hashBytes(cfg), expected, ...summary, traceStates: trace.length }));
} catch (error) {
  console.error(`Retained mailbox diagnostic: ${directory}`);
  await retainFailure(error, error instanceof CommandFailure ? [
    () => writeFile(join(directory, "stdout.log"), error.rawStdout),
    () => writeFile(join(directory, "stderr.log"), error.rawStderr),
    () => writeFile(join(directory, "failure.json"), stableJson(commandFailureRecord(error)) + "\n"),
  ] : []);
}
