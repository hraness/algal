/** Pinned TLC 1.7.4 raw-output adapter. A finite model result is not implementation refinement. */
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, mkdtemp, open, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { parseToolchains } from "./claims";
import { hashBytes, hashFile, hashJson, readFileBounded, readJson, stableJson, type FileBinding } from "./files";
import { admitMutation, admitTlcConfiguration, admitTlcResult, type TlcConfiguration } from "./proof";
import { CommandFailure, runCommand, type CommandResult } from "./runner";
import { array, digest, record, relativePath, requireThat, string } from "./schema";
import { ADAPTER_SOURCES, LIVE_SOURCES, MODEL_MUTATIONS, MODEL_PROFILES, type ModelMutation, type ModelProfile, type TlcSuite } from "../tla/definitions";

const ENGINE = "TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)";
const JAR_SHA256 = "sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88";
const JAVA_SHA256 = "sha256:9be1d0a740ff6502df1a762145e62860f5de4b7e17658d9cb9498da3acf9d16c";
const MAX_LOG = 2_097_152;
const MAX_RUNS = 128;
const MAX_STATES = 1_000_000;
const RELATION = "finite checks of explicitly bounded abstract models; source correspondence is reviewed, not proved refinement or hardware power-loss qualification";
type Frame = { code: number; kind: number; body: string };
export type TlcTraceState = { index: number; action: string | null; body: string };
export type ParsedTlcOutput = {
  initialStates: number; generatedStates: number; distinctStates: number; statesLeft: number;
  checkedInvariants: string[]; temporalComplete: boolean;
  fingerprintEstimate: number | null; violation: { kind: "invariant" | "action" | "liveness"; property: string | null } | null;
  trace: TlcTraceState[]; loop: string | null; success: boolean;
};
const ORDINARY_CODES = new Set([2185, 2186, 2187, 2189, 2190, 2192, 2193, 2194, 2199, 2200, 2201, 2202, 2212, 2219, 2220, 2221, 2262, 2267, 2268, 2772, 2773, 2774, 2775]);
const ERROR_CODES = new Set([2110, 2112, 2116, 2121, 2264]);
const STATE_CODES = new Set([2217, 2218, 2122]);
function numeric(text: string, label: string): number {
  requireThat(/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)$/.test(text), `${label}: invalid count`);
  const n = Number(text.replaceAll(",", ""));
  requireThat(Number.isSafeInteger(n) && n >= 0 && n <= 20 * MAX_STATES, `${label}: excessive count`);
  return n;
}
function frames(output: string, module: string): Frame[] {
  requireThat(Buffer.byteLength(output) > 0 && Buffer.byteLength(output) <= MAX_LOG && output.endsWith("\n") && !output.includes("\r"), "TLC output byte/line bound");
  const lines = output.split("\n"), result: Frame[] = [];
  const modules = new Set([module, "Naturals", "FiniteSets", "Sequences"]);
  let sany = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line === "") continue;
    const start = /^@!@!@STARTMSG (\d+):(\d+) @!@!@$/.exec(line);
    if (!start) {
      const parse = /^Parsing file [^\r\n]+\/([A-Za-z][A-Za-z0-9_]*)\.tla$/.exec(line);
      const semantic = /^Semantic processing of module ([A-Za-z][A-Za-z0-9_]*)$/.exec(line);
      requireThat(sany && !!(parse ?? semantic) && modules.has((parse ?? semantic)![1]!), `TLC unframed diagnostic: ${line.slice(0, 256)}`);
      continue;
    }
    const code = Number(start[1]), kind = Number(start[2]);
    requireThat(ORDINARY_CODES.has(code) && kind === 0 || ERROR_CODES.has(code) && kind === 1 || STATE_CODES.has(code) && kind === 4, `TLC unexpected message ${code}:${kind}`);
    const body: string[] = [];
    const end = `@!@!@ENDMSG ${code} @!@!@`;
    for (i++; i < lines.length && lines[i] !== end; i++) {
      requireThat(!lines[i]!.includes("@!@!@"), "TLC nested or mismatched frame");
      body.push(lines[i]!);
    }
    requireThat(i < lines.length && body.join("\n").length <= 65_536, "TLC truncated or oversized frame");
    result.push({ code, kind, body: body.join("\n").trimEnd() });
    requireThat(result.length <= 10_000, "TLC frame count bound");
    if (code === 2220) { requireThat(!sany, "TLC duplicate SANY start"); sany = true; }
    if (code === 2219) { requireThat(sany, "TLC SANY finish without start"); sany = false; }
  }
  requireThat(!sany && result[0]?.code === 2262 && result.at(-1)?.code === 2186, "TLC missing version or terminal completion");
  return result;
}

/** Re-admits raw captured bytes, including genuine negative controls. No normalized result is trusted. */
export function parseTlcOutput(output: string, module: string): ParsedTlcOutput {
  requireThat(/^[A-Z][A-Za-z0-9]*$/.test(module), "invalid TLC module name");
  const messages = frames(output, module);
  const one = (code: number): Frame => {
    const found = messages.filter(message => message.code === code);
    requireThat(found.length === 1, `TLC missing or duplicate message ${code}`);
    return found[0]!;
  };
  requireThat(one(2262).body === ENGINE, "unsupported TLC engine");
  requireThat(/^Running breadth-first search Model-Checking with fp 0 and seed 1 with 1 worker\b/.test(one(2187).body), "TLC mode, fingerprint, seed or worker mismatch");
  one(2220); one(2219); one(2185); one(2189); one(2186);
  const initial = /^Finished computing initial states: ([\d,]+) distinct state(?:s)? generated at .+\.$/.exec(one(2190).body);
  requireThat(initial !== null, "TLC initial-state diagnostic mismatch");
  const stats = /^([\d,]+) states generated, ([\d,]+) distinct states found, ([\d,]+) states left on queue\.$/.exec(one(2199).body);
  requireThat(stats !== null, "TLC final statistics mismatch");
  const initialStates = numeric(initial[1]!, "initial"), generatedStates = numeric(stats[1]!, "generated"), distinctStates = numeric(stats[2]!, "distinct"), statesLeft = numeric(stats[3]!, "queue");
  requireThat(initialStates > 0 && distinctStates >= initialStates && distinctStates <= MAX_STATES && generatedStates >= distinctStates, "TLC empty or inconsistent exploration");
  const names = messages.filter(message => message.code === 2774).map(message => {
    const name = /^<([A-Za-z][A-Za-z0-9_]*) line \d+, col \d+ to line \d+, col \d+ of module ([A-Za-z][A-Za-z0-9_]*)>$/.exec(message.body);
    requireThat(name !== null && name[2] === module, "TLC property coverage mismatch");
    return name[1]!;
  });
  requireThat(names.length > 0, "TLC omitted named invariant coverage");
  const violations = messages.filter(message => [2110, 2112, 2116].includes(message.code));
  requireThat(violations.length <= 1, "TLC multiple property failures");
  let violation: ParsedTlcOutput["violation"] = null;
  if (violations.length) {
    const message = violations[0]!;
    if (message.code === 2116) {
      requireThat(message.body === "Temporal properties were violated.", "TLC liveness diagnostic mismatch");
      violation = { kind: "liveness", property: null };
    } else {
      const label = message.code === 2110 ? "Invariant" : "Action property";
      const match = new RegExp(`^${label} ([A-Za-z][A-Za-z0-9_]*) is violated\\.$`).exec(message.body);
      requireThat(match !== null, "TLC violation diagnostic mismatch");
      violation = { kind: message.code === 2110 ? "invariant" : "action", property: match[1]! };
    }
  }
  const contexts = messages.filter(message => message.code === 2121 || message.code === 2264);
  if (violation) {
    const code = violation.kind === "liveness" ? 2264 : 2121;
    const body = violation.kind === "liveness" ? "The following behavior constitutes a counter-example:" : "The behavior up to this point is:";
    requireThat(contexts.length === 1 && contexts[0]!.code === code && contexts[0]!.body === body, "TLC counterexample context mismatch");
    requireThat(messages.indexOf(violations[0]!) < messages.indexOf(contexts[0]!) && messages.indexOf(contexts[0]!) < messages.findIndex(message => message.code === 2217), "TLC counterexample diagnostic ordering mismatch");
  } else requireThat(contexts.length === 0, "TLC unexpected counterexample context");
  const trace = messages.filter(message => message.code === 2217).map((message, i): TlcTraceState => {
    const lines = message.body.split("\n"), label = lines.shift()!;
    const match = /^(\d+): <(.+)>$/.exec(label);
    requireThat(match !== null && Number(match[1]) === i + 1, "TLC noncontiguous state trace");
    const action = i === 0 ? null : /^([A-Za-z][A-Za-z0-9_]*) line \d+, col \d+ to line \d+, col \d+ of module ([A-Za-z][A-Za-z0-9_]*)$/.exec(match[2]!);
    requireThat(i === 0 ? match[2] === "Initial predicate" : action !== null && action[2] === module, "TLC trace does not begin at Init or has an unknown action");
    const body = lines.join("\n").trimEnd();
    requireThat(body.startsWith("/\\ ") && body.length > 0 && body.length <= 16_384, "TLC missing or excessive state body");
    return { index: i + 1, action: action?.[1] ?? null, body };
  });
  requireThat(trace.length <= 10_000, "TLC trace state bound");
  const loops = messages.filter(message => message.code === 2218 || message.code === 2122);
  requireThat(loops.length <= 1, "TLC multiple loop markers");
  let loop: string | null = null;
  if (loops.length) {
    loop = loops[0]!.body;
    const stutter = /^(\d+): Stuttering$/.exec(loop);
    const back = /^(\d+): Back to state (\d+)(?:.*)$/.exec(loop);
    requireThat(stutter !== null && Number(stutter[1]) === trace.length + 1 || back !== null && Number(back[1]) === trace.length + 1 && Number(back[2]) > 0 && Number(back[2]) <= trace.length, "TLC malformed liveness loop");
  }
  const successes = messages.filter(message => message.code === 2193);
  requireThat(successes.length <= 1 && !(successes.length && violation), "TLC contradictory success/failure");
  const temporalStart = messages.filter(message => message.code === 2192 && /^Checking temporal properties for the complete state space with /.test(message.body));
  const temporalEnd = messages.filter(message => message.code === 2267);
  const temporalComplete = temporalStart.length === 1 && temporalEnd.length === 1;
  if (temporalStart.length) {
    requireThat(temporalStart.length === 1, "TLC duplicate complete temporal check");
    const total = /^Checking temporal properties for the complete state space with ([\d,]+) total distinct states at .+$/.exec(temporalStart[0]!.body);
    requireThat(total !== null && numeric(total[1]!, "temporal state space") === distinctStates, "TLC temporal state-space count mismatch");
  }
  let fingerprintEstimate: number | null = null;
  if (successes.length) {
    const match = /^Model checking completed\. No error has been found\.\n {2}Estimates of the probability that TLC did not check all reachable states\n {2}because two distinct states had the same fingerprint:\n {2}calculated \(optimistic\): {2}val = ([0-9.Ee+-]+)(?:\n {2}based on the actual fingerprints: {2}val = [0-9.Ee+-]+)?$/.exec(successes[0]!.body);
    requireThat(match !== null, "TLC missing fingerprint estimate");
    fingerprintEstimate = Number(match[1]);
    requireThat(Number.isFinite(fingerprintEstimate) && fingerprintEstimate >= 0 && fingerprintEstimate <= 1e-6, "TLC optimistic fingerprint estimate exceeds threshold");
    requireThat(trace.length === 0 && loop === null && !messages.some(message => message.kind === 1), "TLC success includes error/trace diagnostics");
  } else {
    requireThat(violation !== null && trace.length >= 2, "TLC stopped without an attributable counterexample");
    requireThat(violation.kind === "liveness" ? loop !== null && temporalComplete : loop === null, "TLC counterexample loop/completion mismatch");
  }
  return { initialStates, generatedStates, distinctStates, statesLeft, checkedInvariants: [...new Set(names)], temporalComplete, fingerprintEstimate, violation, trace, loop, success: successes.length === 1 };
}

type RunPlan = { id: string; profile: ModelProfile; configuration: TlcConfiguration; expected: "success" | "invariant" | "action" | "liveness"; property: string | null; action: string | null };
function configuration(profile: ModelProfile, overrides: { constants?: Record<string, string>; specification?: string; properties?: string[] } = {}): TlcConfiguration {
  const value = { contract: "algal.verification-tlc-config.v1", mode: "model-check", behavior: "temporal", specification: overrides.specification ?? profile.specification,
    constants: overrides.constants ?? profile.constants, invariants: profile.invariants, properties: overrides.properties ?? profile.properties,
    importantActions: profile.actions.map(item => item.action), constraints: [], actionConstraints: [], overrides: [], symmetry: null };
  return admitTlcConfiguration(value, { invariants: profile.invariants, properties: overrides.properties ?? profile.properties, importantActions: profile.actions.map(item => item.action) });
}
function plans(suite: TlcSuite): RunPlan[] {
  const profiles = MODEL_PROFILES.filter(profile => profile.suite === suite);
  const result: RunPlan[] = [];
  for (const profile of profiles) {
    result.push({ id: profile.id, profile, configuration: configuration(profile), expected: "success", property: null, action: null });
    for (const { action, property } of profile.actions) result.push({ id: `${profile.id}--witness-${action}`, profile, configuration: configuration(profile, { properties: [property] }), expected: "action", property, action });
  }
  for (const mutation of MODEL_MUTATIONS) {
    const profile = profiles.find(profile => profile.id === mutation.base);
    if (profile) result.push({ id: mutation.id, profile, configuration: configuration(profile, { constants: mutation.mutation ? { ...profile.constants, Mutation: JSON.stringify(mutation.mutation) } : profile.constants, specification: mutation.specification ?? profile.specification }), expected: mutation.kind, property: mutation.property, action: null });
  }
  requireThat(result.length > 0 && result.length <= MAX_RUNS && new Set(result.map(item => item.id)).size === result.length, "invalid TLC run inventory");
  return result;
}
export function renderTlcConfiguration(config: TlcConfiguration): string {
  requireThat(config.constraints.length === 0 && config.actionConstraints.length === 0 && config.overrides.length === 0 && config.symmetry === null, "this adapter admits no reductions or overrides");
  const name = (value: string): string => { requireThat(/^[A-Za-z][A-Za-z0-9_]*$/.test(value), "invalid TLC operator name"); return value; };
  const constants = Object.keys(config.constants).sort().map(key => {
    const value = config.constants[key]!;
    requireThat(/^(?:TRUE|FALSE|0|[1-9]\d{0,5}|"[a-z0-9-]+")$/.test(value), "unsupported TLC constant syntax");
    return `CONSTANT ${name(key)} = ${value}`;
  });
  return [...constants, `SPECIFICATION ${name(config.specification)}`, ...config.invariants.map(value => `INVARIANT ${name(value)}`), ...config.properties.map(value => `PROPERTY ${name(value)}`)].join("\n") + "\n";
}

export type TlcDefinition = { contract: "algal.verification-tlc-definition.v1"; suite: TlcSuite; profiles: ModelProfile[]; mutations: ModelMutation[]; inputs: FileBinding[]; relation: string };
export async function tlcDefinition(root: string, suite: TlcSuite): Promise<TlcDefinition> {
  requireThat(suite === "custody" || suite === "publication", "unknown TLC suite");
  const profiles = MODEL_PROFILES.filter(profile => profile.suite === suite);
  const mutations = MODEL_MUTATIONS.filter(mutation => profiles.some(profile => profile.id === mutation.base));
  const paths = [...new Set([...ADAPTER_SOURCES, ...LIVE_SOURCES[suite], ...profiles.map(profile => profile.path)])].sort();
  const inputs: FileBinding[] = [];
  for (const path of paths) inputs.push({ path, sha256: await hashFile(root, path) });
  return { contract: "algal.verification-tlc-definition.v1", suite, profiles, mutations, inputs, relation: RELATION };
}
type ToolIdentity = { java: { path: string; sha256: string }; jar: { path: string; sha256: string }; runtime: { root: string; files: FileBinding[]; sha256: string } };
const JAVA_ARCHIVE_SHA256 = "sha256:3623232f33a9c3baadf304480b2535f9a3cba8a58d42ecbb438ba267315d9998";
function expectedRuntimeFiles(value: unknown): FileBinding[] {
  const manifest = record(value, ["contract", "version", "platform", "archive", "files", "assumptions"], "qualified Java runtime");
  requireThat(manifest.contract === "algal.verification-java-runtime.v1" && manifest.version === "21.0.12.1+1" && manifest.platform === "darwin-arm64", "unqualified Java runtime manifest");
  const archive = record(manifest.archive, ["url", "bytes", "sha256", "prefix"], "qualified Java archive");
  requireThat(archive.sha256 === JAVA_ARCHIVE_SHA256 && archive.bytes === 200_073_404 && archive.prefix === "jdk-21.0.12.1+1/Contents/Home/" && archive.url === "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.12.1_1.tar.gz", "unqualified Java archive binding");
  const files = array(manifest.files, "qualified Java files", 456, 456).map(value => {
    const file = record(value, ["path", "sha256"], "qualified Java file");
    return { path: relativePath(file.path, "qualified Java path"), sha256: digest(file.sha256, "qualified Java digest") };
  });
  requireThat(new Set(files.map(file => file.path)).size === files.length && files.some(file => file.path === "bin/java" && file.sha256 === JAVA_SHA256), "qualified Java inventory mismatch");
  return files;
}
export function admitJavaRuntimeFiles(manifest: unknown, actual: FileBinding[]): void {
  requireThat(stableJson(actual) === stableJson(expectedRuntimeFiles(manifest)), "Java runtime differs from checksum-verified distribution files");
}
async function hashArtifact(path: string, max: number): Promise<{ sha256: string; bytes: number }> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    requireThat(stat.isFile() && stat.size >= 0 && stat.size <= max, "TLC tool file type/byte bound");
    const hash = createHash("sha256"); let bytes = 0;
    for (;;) {
      const chunk = Buffer.alloc(65_536), read = await file.read(chunk);
      if (read.bytesRead === 0) break;
      bytes += read.bytesRead; requireThat(bytes <= max, "TLC tool grew past byte bound"); hash.update(chunk.subarray(0, read.bytesRead));
    }
    return { sha256: `sha256:${hash.digest("hex")}`, bytes };
  } finally { await file.close(); }
}
async function toolIdentity(root: string): Promise<ToolIdentity> {
  const metadata = parseToolchains(await readJson(root, "verify/toolchains.json"));
  const java = metadata.tools.find(tool => tool.id === "java"), tlc = metadata.tools.find(tool => tool.id === "tlc");
  requireThat(java?.status === "available" && java.version === "21.0.12.1+1" && java.command.length === 1 && java.sha256 === JAVA_SHA256, "unqualified Java pin");
  requireThat(tlc?.status === "available" && tlc.version === "1.7.4" && tlc.sha256 === JAR_SHA256 && tlc.command.length === 4 && tlc.command[0] === java.command[0] && tlc.command[1] === "-cp" && tlc.command[3] === "tlc2.TLC", "unqualified TLC pin");
  requireThat(process.platform === "darwin" && process.arch === "arm64", "TLC Java distribution currently qualified only on darwin arm64");
  const javaPath = await realpath(java.command[0]!), jarPath = await realpath(tlc.command[2]!);
  const javaHash = await hashArtifact(javaPath, 16_777_216), jarHash = await hashArtifact(jarPath, 16_777_216);
  requireThat(javaHash.sha256 === java.sha256 && jarHash.sha256 === JAR_SHA256, "TLC/Java executable pin mismatch");
  const runtimeRoot = dirname(dirname(javaPath)), files: FileBinding[] = [];
  let visited = 0, total = 0;
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(join(runtimeRoot, directory), { withFileTypes: true })) {
      requireThat(++visited <= 4096, "Java runtime file count bound");
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      requireThat(!entry.isSymbolicLink(), "Java runtime symbolic link is not admitted");
      if (entry.isDirectory()) await walk(path);
      else {
        requireThat(entry.isFile(), "Java runtime nonregular input");
        const artifact = await hashArtifact(join(runtimeRoot, path), 536_870_912);
        total += artifact.bytes; requireThat(total <= 1_073_741_824, "Java runtime total byte bound");
        files.push({ path, sha256: artifact.sha256 });
      }
    }
  }
  await walk(""); files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  admitJavaRuntimeFiles(await readJson(root, "verify/tla/java-runtime.json"), files);
  return { java: { path: javaPath, sha256: javaHash.sha256 }, jar: { path: jarPath, sha256: jarHash.sha256 }, runtime: { root: runtimeRoot, files, sha256: hashJson(files) } };
}
function command(tools: ToolIdentity, directory: string, plan: RunPlan): string[] {
  return [tools.java.path, "-XX:+UseParallelGC", "-Xmx256m", `-Duser.home=${join(directory, "home")}`, `-Djava.io.tmpdir=${join(directory, "tmp")}`, "-cp", tools.jar.path, "tlc2.TLC", "-tool", "-workers", "1", "-coverage", "1", "-seed", "1", "-fp", "0", "-metadir", join(directory, "states"), "-config", "Model.cfg", plan.profile.module];
}
export type TlcRawRun = { id: string; directory: string; configuration: string; stdoutSha256: string; stderrSha256: string; commandResult: CommandResult };
export type TlcSuiteEvidence = { contract: "algal.verification-tlc-suite.v1"; suite: TlcSuite; definitionDigest: string; tools: ToolIdentity; runs: TlcRawRun[] };
export type TlcExpected = { kind: "success" | "invariant" | "action" | "liveness"; property: string | null; action: string | null };

/** Raw-output semantic admission, also exposed for parser rejection tests.
 * Static command/tool/configuration binding is additionally required by suite admission. */
export function admitTlcCommandOutput(result: CommandResult, module: string, config: TlcConfiguration, expected: TlcExpected): ParsedTlcOutput {
  requireThat(result.signal === null && result.timedOut === false && result.outputExceeded === false && result.cleanupObserved === true, "TLC command lacked bounded clean completion");
  requireThat(result.exitCode === (expected.kind === "success" ? 0 : expected.kind === "invariant" ? 12 : 13), "TLC command exited at the wrong semantic boundary");
  const stdout = string(result.stdout, "TLC stdout", MAX_LOG);
  requireThat(result.stderr === "", "TLC stderr is not empty");
  const parsed = parseTlcOutput(stdout, module);
  requireThat(stableJson([...parsed.checkedInvariants].sort()) === stableJson([...config.invariants].sort()), "TLC omitted or added an enabled invariant");
  if (expected.kind === "success") {
    requireThat(parsed.success && parsed.statesLeft === 0 && parsed.distinctStates > parsed.initialStates, "TLC search did not exhaust a nonconstant state graph");
    requireThat(config.properties.length === 0 || parsed.temporalComplete, "TLC temporal property checking did not complete");
  } else {
    requireThat(expected.kind === "invariant" ? config.invariants.includes(expected.property!) : config.properties.length === 1 && config.properties[0] === expected.property, "TLC expected failing property is not the exact enabled property");
    requireThat(!parsed.success && parsed.violation?.kind === expected.kind, "TLC failed at another property class");
    requireThat(expected.kind === "liveness" ? config.properties.length === 1 && config.properties[0] === expected.property : parsed.violation.property === expected.property, "TLC failed at another named property");
    admitMutation({ completion: "counterexample", violations: [expected.property], errors: [], witness: parsed.trace.map(state => state.body) }, expected.property!);
    if (expected.kind === "action") {
      const last = parsed.trace.at(-1)!, before = parsed.trace.at(-2)!;
      requireThat(last.action === expected.action && before.body !== last.body, "TLC important action lacks a reachable nonstuttering transition");
    }
  }
  return parsed;
}

function admitRawRun(value: unknown, plan: RunPlan, tools: ToolIdentity): { raw: TlcRawRun; parsed: ParsedTlcOutput } {
  const item = record(value, ["id", "directory", "configuration", "stdoutSha256", "stderrSha256", "commandResult"], "TLC raw run");
  requireThat(item.id === plan.id, "TLC run identity mismatch");
  const directory = string(item.directory, "TLC temporary directory");
  requireThat(isAbsolute(directory) && directory === resolve(directory), "TLC noncanonical temporary directory");
  requireThat(item.configuration === renderTlcConfiguration(plan.configuration), "TLC raw configuration differs from reviewed inventory");
  const result = record(item.commandResult, ["command", "exitCode", "signal", "timedOut", "outputExceeded", "cleanupObserved", "stdout", "stderr"], "TLC command result");
  requireThat(stableJson(result.command) === stableJson(command(tools, directory, plan)), "TLC command differs from static argv");
  const stdout = string(result.stdout, "TLC stdout", MAX_LOG);
  requireThat(result.stderr === "", "TLC stderr is not empty");
  const stderr = result.stderr;
  requireThat(digest(item.stdoutSha256, "TLC stdout digest") === hashBytes(stdout) && digest(item.stderrSha256, "TLC stderr digest") === hashBytes(stderr), "TLC raw log digest mismatch");
  const parsed = admitTlcCommandOutput(result as unknown as CommandResult, plan.profile.module, plan.configuration, { kind: plan.expected, property: plan.property, action: plan.action });
  return { raw: item as unknown as TlcRawRun, parsed };
}

/** The caller supplies a freshly read definition. Raw logs are parsed again; summaries cannot promote claims. */
export function admitTlcSuiteEvidence(value: unknown, definition: TlcDefinition) {
  const item = record(value, ["contract", "suite", "definitionDigest", "tools", "runs"], "TLC suite evidence");
  requireThat(item.contract === "algal.verification-tlc-suite.v1" && item.suite === definition.suite && item.definitionDigest === hashJson(definition), "TLC evidence definition is stale or mismatched");
  const toolItem = record(item.tools, ["java", "jar", "runtime"], "TLC tools");
  const artifact = (value: unknown, expected: string) => {
    const a = record(value, ["path", "sha256"], "TLC tool artifact");
    const path = string(a.path, "TLC tool path");
    requireThat(isAbsolute(path) && path === resolve(path) && digest(a.sha256, "TLC tool digest") === expected, "TLC tool artifact pin/path mismatch");
    return { path, sha256: expected };
  };
  const runtime = record(toolItem.runtime, ["root", "files", "sha256"], "TLC Java runtime");
  const runtimeRoot = string(runtime.root, "TLC Java runtime root");
  const files = array(runtime.files, "TLC runtime files", 1, 4096).map(value => {
    const file = record(value, ["path", "sha256"], "TLC runtime file");
    return { path: relativePath(file.path, "TLC runtime file path"), sha256: digest(file.sha256, "TLC runtime file digest") };
  });
  requireThat(new Set(files.map(file => file.path)).size === files.length && hashJson(files) === digest(runtime.sha256, "TLC runtime digest"), "TLC Java runtime binding mismatch");
  const tools: ToolIdentity = { java: artifact(toolItem.java, JAVA_SHA256), jar: artifact(toolItem.jar, JAR_SHA256), runtime: { root: runtimeRoot, files, sha256: hashJson(files) } };
  requireThat(runtimeRoot === dirname(dirname(tools.java.path)) && files.some(file => file.path === "bin/java" && file.sha256 === JAVA_SHA256), "TLC Java executable missing from runtime closure");
  const expected = plans(definition.suite);
  const runs = array(item.runs, "TLC runs", 1, MAX_RUNS);
  requireThat(runs.length === expected.length, "TLC incomplete run inventory");
  const checked = expected.map((plan, i) => ({ plan, ...admitRawRun(runs[i], plan, tools) }));
  const models = checked.filter(run => run.plan.expected === "success").map(run => {
    const transitions = Object.fromEntries(run.plan.profile.actions.map(({ action }) => {
      const witness = checked.find(candidate => candidate.plan.id === `${run.plan.id}--witness-${action}`)!;
      requireThat(witness !== undefined, "TLC missing action witness run");
      return [action, { traceDigest: hashJson(witness.parsed.trace), fromState: hashBytes(witness.parsed.trace.at(-2)!.body), toState: hashBytes(witness.parsed.trace.at(-1)!.body) }];
    }));
    const normalized = { contract: "algal.verification-tlc-result.v1", origin: "tool", configurationDigest: hashJson(run.plan.configuration), completion: "complete", exitCode: 0, timedOut: false,
      initialStates: run.parsed.initialStates, distinctStates: run.parsed.distinctStates, generatedStates: run.parsed.generatedStates, statesLeft: run.parsed.statesLeft,
      checkedInvariants: run.parsed.checkedInvariants, checkedProperties: run.plan.configuration.properties, actionTransitions: transitions, errors: [], violations: [], fingerprint: { bits: 64, seed: "1; polynomial 0", collisionProbability: run.parsed.fingerprintEstimate } };
    const admitted = admitTlcResult(normalized, run.plan.configuration);
    return { id: run.plan.id, ...admitted, configuration: run.plan.configuration, bounds: run.plan.profile.bounds, assumptions: run.plan.profile.assumptions,
      actionTransitions: transitions, fingerprint: { method: "TLC calculated optimistic estimate; not a guaranteed upper bound", value: run.parsed.fingerprintEstimate } };
  });
  return { suite: definition.suite, definitionDigest: item.definitionDigest, models, witnesses: checked.filter(run => run.plan.expected === "action").length,
    mutations: checked.filter(run => run.plan.expected === "invariant" || run.plan.expected === "liveness").map(run => ({ id: run.plan.id, property: run.plan.property, traceDigest: hashJson({ states: run.parsed.trace, loop: run.parsed.loop }) })), relation: RELATION };
}

/** Re-read tools and live source definitions before admitting stored evidence. */
export async function recheckTlcSuiteEvidence(root: string, value: unknown, suite: TlcSuite) {
  const definition = await tlcDefinition(root, suite), tools = await toolIdentity(root);
  const item = record(value, ["contract", "suite", "definitionDigest", "tools", "runs"], "TLC suite evidence");
  requireThat(stableJson(item.tools) === stableJson(tools), "TLC runtime/tool files changed since execution");
  const admitted = admitTlcSuiteEvidence(value, definition);
  requireThat(hashJson(await tlcDefinition(root, suite)) === hashJson(definition), "TLC definition/live source changed during readmission");
  return admitted;
}

export async function runTlcSuite(root: string, suite: TlcSuite): Promise<TlcSuiteEvidence> {
  const definition = await tlcDefinition(root, suite), tools = await toolIdentity(root), runs: TlcRawRun[] = [];
  const base = await mkdtemp(join(tmpdir(), `algal-tlc-${suite}-`));
  try {
    for (const plan of plans(suite)) {
      const directory = join(base, plan.id), source = await readFileBounded(root, plan.profile.path, 262_144);
      await mkdir(join(directory, "home/.tlaplus"), { recursive: true }); await mkdir(join(directory, "tmp"));
      await writeFile(join(directory, "home/.tlaplus/esc.txt"), "NO_STATISTICS\n");
      const config = renderTlcConfiguration(plan.configuration);
      await writeFile(join(directory, `${plan.profile.module}.tla`), source); await writeFile(join(directory, "Model.cfg"), config);
      let result: CommandResult;
      try { result = await runCommand(command(tools, directory, plan), directory, { timeoutMs: 30_000, maxOutputBytes: MAX_LOG }); }
      catch (error) {
        if (error instanceof CommandFailure) {
          await writeFile(join(directory, "stdout.log"), error.rawStdout);
          await writeFile(join(directory, "stderr.log"), error.rawStderr);
          await writeFile(join(directory, "command-failure.json"), JSON.stringify({ message: error.message, observation: error.observation }));
        }
        throw error;
      }
      const raw: TlcRawRun = { id: plan.id, directory, configuration: config, stdoutSha256: hashBytes(result.stdout), stderrSha256: hashBytes(result.stderr), commandResult: result };
      // Retain diagnostic bytes even when the semantic admission fails.
      await writeFile(join(directory, "stdout.log"), result.stdout); await writeFile(join(directory, "stderr.log"), result.stderr);
      try { admitRawRun(raw, plan, tools); }
      catch (error) { throw new Error(`${plan.id}: ${error instanceof Error ? error.message : String(error)}; raw output retained at ${directory}`); }
      requireThat(hashBytes(await readFileBounded(directory, `${plan.profile.module}.tla`, 262_144)) === hashBytes(source) && hashBytes(await readFileBounded(directory, "Model.cfg", 65_536)) === hashBytes(config), "TLC rewrote its checked model/configuration");
      runs.push(raw);
    }
    const evidence: TlcSuiteEvidence = { contract: "algal.verification-tlc-suite.v1", suite, definitionDigest: hashJson(definition), tools, runs };
    requireThat(hashJson(await tlcDefinition(root, suite)) === hashJson(definition), "TLC definition/live source changed during execution");
    requireThat(stableJson(await toolIdentity(root)) === stableJson(tools), "TLC tool runtime changed during execution");
    admitTlcSuiteEvidence(evidence, definition);
    await rm(base, { recursive: true });
    return evidence;
  } catch (error) {
    // Only successful scratch trees are deleted. Failure logs are bounded and
    // contain models/tool diagnostics, not host application data or credentials.
    throw new Error(`${error instanceof Error ? error.message : String(error)}; TLC scratch ${base}`);
  }
}
