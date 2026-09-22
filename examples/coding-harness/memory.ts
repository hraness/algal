import { readFile } from "node:fs/promises";
import { constants, closeSync, openSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalize, digestCanonical, type JsonValue } from "../../index";
import type { HarnessMemory, HarnessMemoryConfig, MemoryAction, MemoryProcedure, MemoryScope, MemoryTerminal } from "./memory-contract";
import { applicable, getMemoryRecord, json, keys, MEMORY_ADAPTER_VERSION, object, parseHarnessMemoryConfig, parseObservation, parseProcedure, prepareMemoryStore, putMemoryRecord, readBoundedFile, recordRefPath, sha256, type Observation } from "./memory-records";
export { parseHarnessMemoryConfig } from "./memory-records";

const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
const scalar = (value: unknown): value is string | number | boolean | null => value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
/** The program is host-authored. Arguments are data; no procedure text is evaluated. */
export function probeCommand(procedure: MemoryProcedure, scope: MemoryScope): string {
  const op = procedure.operation;
  const args = [op.kind, op.kind === "resolve-tool" ? op.tool : op.path, ...Object.entries(scope.dependencies).sort().flatMap(([name, dep]) => [name, dep.path])];
  const script = `use strict; use warnings;
my $HAS_SHA=eval { require Digest::SHA; 1 };
sub hash_cmd { for my $c (["sha256sum"],["shasum","-a","256"]) { for my $dir (split /:/,($ENV{PATH}//""),-1) { $dir="." if $dir eq ""; my $p="$dir/".$c->[0]; return $c if -f $p && -x $p; } } return undef; }
sub hash_file { my ($p)=@_; die "dependency missing" unless -f $p; if ($HAS_SHA) { my $d=eval { Digest::SHA->new(256)->addfile($p,"b")->hexdigest }; die "hash failed" unless defined($d) && $d=~/^[a-f0-9]{64}$/; return $d; } my $c=hash_cmd(); die "hash unavailable" unless $c; open my $h,"-|",@$c,"--",$p or die "hash launch"; my $s=<$h>; close $h or die "hash failed"; die "hash format" unless defined($s) && $s=~/^([a-f0-9]{64})[ *]/; return $1; }
my ($kind,$arg,@deps)=@ARGV; my @before; while(@deps){ my $name=shift @deps; my $path=shift @deps; push @before,[$name,$path,hash_file($path)]; }
my ($present,$payload)=(0,"");
if($kind eq "resolve-tool"){ for my $dir(split /:/,($ENV{PATH}//""),-1){ $dir="." if $dir eq ""; my $p="$dir/$arg"; if(-f $p && -x $p){($present,$payload)=(1,$p);last;} } }
elsif($kind eq "fingerprint-file"){ if(-f $arg){($present,$payload)=(1,hash_file($arg));} }
else { if(-f $arg){open my $f,"<",$arg or die "read failed";binmode $f;my $n=read($f,$payload,2049);die "read bound" unless defined($n) && $n<=2048;close $f; $present=1;} }
die "payload bound" if length($payload)>2048;
for my $d(@before){die "scope changed during probe" if hash_file($d->[1]) ne $d->[2];}
print "algal-probe-v1\\n";for my $d(@before){print "$d->[0]\\t$d->[2]\\n";}print "result\\t$present\\t",unpack("H*",$payload),"\\n";`;
  return `perl -e ${quote(script)} -- ${args.map(quote).join(" ")}`;
}
type Raw = { contract: "algal.harness-probe-raw.v1"; command: string; result: { exitCode: number; stdout: string; stderr: string } };
type Decoded = { polarity: "supported" | "opposed"; value: string | number | boolean | null; dependencies: MemoryScope["dependencies"] };
export function decodeProbe(procedure: MemoryProcedure, scope: MemoryScope, input: unknown): Decoded {
  const raw = object(input); keys(raw, ["contract", "command", "result"]);
  if (raw.contract !== "algal.harness-probe-raw.v1" || raw.command !== probeCommand(procedure, scope)) throw new Error("Observation command is not the admitted procedure");
  const result = object(raw.result); keys(result, ["exitCode", "stdout", "stderr"]);
  if (result.exitCode !== 0 || typeof result.stdout !== "string" || typeof result.stderr !== "string" || Buffer.byteLength(result.stdout) > 8192 || Buffer.byteLength(result.stderr) > 8192 || result.stderr !== "") throw new Error("Probe was not a successful bounded observation");
  const lines = result.stdout.split("\n");
  if (lines.shift() !== "algal-probe-v1" || lines.pop() !== "") throw new Error("Malformed probe frame");
  const dependencies: MemoryScope["dependencies"] = {};
  for (const [name, dep] of Object.entries(scope.dependencies).sort()) {
    const match = lines.shift()?.match(/^([a-z][a-z0-9._-]{0,63})\t([a-f0-9]{64})$/);
    if (!match || match[1] !== name) throw new Error("Probe dependency frame mismatch");
    dependencies[name] = { path: dep.path, digest: match[2]! };
  }
  const match = lines.shift()?.match(/^result\t([01])\t([a-f0-9]*)$/);
  if (!match || lines.length !== 0 || match[2]!.length % 2 !== 0 || match[2]!.length > 4096 || (match[1] === "0" && match[2] !== "")) throw new Error("Malformed probe payload");
  const bytes = Buffer.from(match[2]!, "hex"), payload = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  let value: unknown = null;
  let present = match[1] === "1";
  if (present && procedure.operation.kind === "read-json-field") {
    value = JSON.parse(payload) as unknown;
    for (const component of procedure.operation.field.split(".")) {
      if (!value || typeof value !== "object" || Array.isArray(value) || !Object.hasOwn(value, component)) { present = false; value = null; break; }
      value = (value as Record<string, unknown>)[component];
    }
  } else if (present) value = payload;
  if (!scalar(value) || Buffer.byteLength(JSON.stringify(value)) > 512) throw new Error("Probe value must be a bounded scalar");
  if (present && procedure.operation.kind === "fingerprint-file" && (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value))) throw new Error("Invalid observed fingerprint");
  if (present && procedure.operation.kind === "resolve-tool" && (typeof value !== "string" || !value.endsWith(`/${procedure.operation.tool}`))) throw new Error("Invalid observed tool path");
  return { polarity: present ? "supported" : "opposed", value, dependencies };
}
type Admitted = { ref: string; observation: Observation; procedure: MemoryProcedure; raw: Raw; decoded: Decoded };
const RULES: JsonValue[] = [
  { id: "start-prerequisites", head: { relation: "matching-prefix", terms: [{ var: "r" }, { var: "s" }, 0] }, body: [{ relation: "observed-result", terms: [{ var: "r" }, { var: "s" }, { var: "polarity" }, { var: "v" }] }] },
  { id: "match-dependency", head: { relation: "matching-prefix", terms: [{ var: "r" }, { var: "s" }, { var: "next" }] }, body: [
    { relation: "matching-prefix", terms: [{ var: "r" }, { var: "s" }, { var: "index" }] },
    { relation: "requires", terms: [{ var: "r" }, { var: "index" }, { var: "dependency" }, { var: "digest" }, { var: "next" }] },
    { relation: "depends-on", terms: [{ var: "s" }, { var: "dependency" }, { var: "digest" }] },
  ] },
  { id: "answer-with-prerequisites", head: { relation: "answer", terms: [{ var: "p" }, { var: "polarity" }, { var: "v" }] }, body: [
    { relation: "observed-result", terms: [{ var: "r" }, { var: "s" }, { var: "polarity" }, { var: "v" }] },
    { relation: "matching-prefix", terms: [{ var: "r" }, { var: "s" }, { var: "count" }] },
    { relation: "requirement-count", terms: [{ var: "r" }, { var: "count" }] },
    { relation: "source-current", terms: [{ var: "s" }, { var: "scope" }] },
    { relation: "procedure-active", terms: [{ var: "r" }, { var: "p" }, { var: "scope" }] },
  ] },
];
class NativeFailure extends Error { constructor(message: string, readonly exhausted: boolean) { super(message); } }
async function invokeNative(config: HarnessMemoryConfig, args: string[], signal?: AbortSignal): Promise<unknown> {
  if (signal?.aborted) throw new Error("Memory query cancelled before launch");
  if (sha256(await readFile(config.nativeExecutable)) !== config.expectedNativeSha256) throw new Error("Pinned memory executable changed");
  const child = Bun.spawn([config.nativeExecutable, "memory", ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  let killed = false, overflow = false;
  let force: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { killed = true; child.kill("SIGTERM"); force ??= setTimeout(() => child.kill("SIGKILL"), 250); };
  const timer = setTimeout(stop, 10_000);
  signal?.addEventListener("abort", stop, { once: true });
  if (signal?.aborted) stop();
  const drain = async (stream: ReadableStream<Uint8Array>, max: number): Promise<string> => {
    const chunks: Uint8Array[] = []; let size = 0;
    for await (const part of stream) { size += part.byteLength; if (size > max) { overflow = true; stop(); } else if (!overflow) chunks.push(part); }
    return Buffer.concat(chunks).toString("utf8");
  };
  try {
    const [stdout, stderr, code] = await Promise.all([drain(child.stdout, 262_144), drain(child.stderr, 8192), child.exited]);
    if (overflow) throw new Error("Native memory output exceeded bounds; child joined");
    if (killed || signal?.aborted) throw new Error("Native memory cancelled or timed out; child joined");
    if (code !== 0) throw new NativeFailure(stderr.slice(0, 1000), /exhausted|result rows|result bytes|derived tuples|bindings/.test(stderr));
    return JSON.parse(stdout) as unknown;
  } finally {
    clearTimeout(timer); if (force) clearTimeout(force); signal?.removeEventListener("abort", stop);
    if (child.exitCode === null) { child.kill("SIGKILL"); await child.exited; }
  }
}

/** Lossless indexed representation of the full native witness, not a clipped proof. */
function compactResult(result: Record<string, unknown>): JsonValue {
  const proofs = object(result.proofs), ids = Object.keys(proofs).sort();
  const references: string[] = [];
  const refIndex = (value: unknown): number => {
    if (typeof value !== "string") throw new Error("Invalid proof reference");
    let index = references.indexOf(value); if (index < 0) { index = references.length; references.push(value); } return index;
  };
  const nodeIndex = (value: unknown): number => {
    const index = typeof value === "string" ? ids.indexOf(value) : -1;
    if (index < 0) throw new Error("Missing proof node"); return index;
  };
  const nodes = ids.map((id) => {
    const proof = object(proofs[id]);
    if (proof.kind === "fact" && Array.isArray(proof.sources)) return ["fact", refIndex(proof.fact), proof.sources.map(refIndex)];
    if (proof.kind === "rule" && Array.isArray(proof.premises)) return ["rule", refIndex(proof.rule), proof.premises.map(nodeIndex)];
    throw new Error("Invalid proof node");
  });
  return json({ contract: "algal.harness-compact-witness.v1", complete: result.complete, witnessPolicy: result.witnessPolicy,
    rows: (result.rows as unknown[]).map((value) => { const row = object(value); return { tuple: row.tuple, proof: nodeIndex(row.proof) }; }),
    references, nodes, work: result.work, rounds: result.rounds,
    encoding: "fact nodes: [fact,factDigestIndex,sourceDigestIndexes]; rule nodes: [rule,ruleDigestIndex,premiseNodeIndexes]; row proof indexes nodes" });
}

export async function createHarnessMemory(input: unknown): Promise<HarnessMemory> {
  const config = parseHarnessMemoryConfig(input);
  if ((config.maxVisibleBytes ?? 8192) < 256) throw new Error("Memory visible-byte allowance must be at least 256");
  if (sha256(await readFile(config.nativeExecutable)) !== config.expectedNativeSha256) throw new Error("Pinned memory executable digest mismatch");
  await prepareMemoryStore(config.storeDir);
  const procedureRefs: Record<string, string> = {};
  for (const procedure of config.procedures) procedureRefs[procedure.id] = await putMemoryRecord(config.storeDir, json({ contract: "algal.harness-procedure.v1", procedure }));
  const indexPath = join(config.storeDir, `index-${sha256(canonicalize(json([config.owner, config.scope.sequenceId])))}.json`);
  let liveRefs: string[] = [], restoredInvalidated: string[] = [], mutationSeen = false;
  try {
    const index = object(JSON.parse(await readBoundedFile(indexPath, 32_768)));
    const required = ["contract", "owner", "sequenceId", "taskId", "sourceRefs", "invalidatedRefs"];
    keys(index, [...required, "mutationSeen"], required);
    if (index.contract !== "algal.harness-memory-index.v1" || index.owner !== config.owner || index.sequenceId !== config.scope.sequenceId || !Array.isArray(index.sourceRefs) || index.sourceRefs.length > 128 || index.sourceRefs.some((r) => typeof r !== "string" || !/^sha256:[a-f0-9]{64}$/.test(r))) throw new Error("Invalid memory index");
    if (typeof index.taskId !== "string" || !/^[a-z][a-z0-9._-]{0,63}$/.test(index.taskId) || !Array.isArray(index.invalidatedRefs) || index.invalidatedRefs.length > 128 || index.invalidatedRefs.some((r) => typeof r !== "string" || !/^sha256:[a-f0-9]{64}$/.test(r))) throw new Error("Invalid persisted memory invalidations");
    liveRefs = index.sourceRefs as string[];
    if (index.mutationSeen !== undefined && typeof index.mutationSeen !== "boolean") throw new Error("Invalid persisted mutation state");
    restoredInvalidated = index.invalidatedRefs as string[];
    mutationSeen = index.mutationSeen !== false;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const initialRefs = [...new Set([...(config.seedRefs ?? []), ...liveRefs])];
  if (initialRefs.length > 128) throw new Error("Memory source count exceeded");
  const seeds = new Set(config.seedRefs), excluded = new Set(config.excludedRefs);
  if ([...excluded].some((ref) => !initialRefs.includes(ref))) throw new Error("Correction references an unadmitted source");
  let sourceRefs = config.mode === "none" ? [] : initialRefs;
  if (restoredInvalidated.some((ref) => !initialRefs.includes(ref))) throw new Error("Persisted invalidation references an unadmitted source");
  let scope = structuredClone(config.scope), dirty = restoredInvalidated.length > 0;
  const invalidated = new Set(restoredInvalidated);
  const initialMutationSeen = mutationSeen;
  function saveIndex(): void {
    const index = canonicalize(json({ contract: "algal.harness-memory-index.v1", owner: config.owner, sequenceId: scope.sequenceId, taskId: scope.taskId, sourceRefs: liveRefs, invalidatedRefs: [...invalidated], mutationSeen }));
    const temp = `${indexPath}.${process.pid}.tmp`;
    const fd = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try { writeFileSync(fd, index); } finally { closeSync(fd); }
    renameSync(temp, indexPath);
  }
  let operations = 0, visibleBytes = 0, probeCalls = 0, queryCalls = 0, nativeCalls = 0, nativeWork = 0;
  const queries: JsonValue[] = [], probes: JsonValue[] = [], outcomes: JsonValue[] = [];
  let pending: Promise<JsonValue> | undefined;
  const configurationDigest = digestCanonical(json({ adapter: MEMORY_ADAPTER_VERSION, mode: config.mode, owner: config.owner, scope: config.scope, sources: initialRefs, invalidatedRefs: restoredInvalidated, mutationSeen, exclusions: config.excludedRefs, procedureRefs, rules: RULES, limits: { maxOperations: config.maxOperations, maxVisibleBytes: config.maxVisibleBytes, maxWork: config.maxWork }, native: config.expectedNativeSha256 }));
  async function admit(ref: string): Promise<Admitted> {
    const observation = parseObservation(await getMemoryRecord(config.storeDir, ref));
    if (observation.scope.sequenceId !== config.scope.sequenceId || (!seeds.has(ref) && observation.owner !== config.owner)) throw new Error("Cross-owner or out-of-sequence memory source rejected");
    const p = object(await getMemoryRecord(config.storeDir, observation.procedureRef)); keys(p, ["contract", "procedure"]);
    if (p.contract !== "algal.harness-procedure.v1") throw new Error("Invalid procedure source");
    const procedure = parseProcedure(p.procedure);
    for (const name of procedure.dependencies) if (!observation.scope.dependencies[name]) throw new Error("Observation lacks a declared procedure dependency");
    const raw = await getMemoryRecord(config.storeDir, observation.rawRef);
    const decoded = decodeProbe(procedure, observation.scope, raw);
    if (canonicalize(json(decoded.dependencies)) !== canonicalize(json(observation.scope.dependencies))) throw new Error("Observation dependency digest differs from recorded scope");
    return { ref, observation, procedure, raw: raw as Raw, decoded };
  }
  // Even explicit seeds are validated, including in the no-memory treatment.
  for (const ref of initialRefs) await admit(ref);
  const admitted = async (): Promise<Admitted[]> => {
    const entries = await Promise.all(sourceRefs.filter((ref) => !excluded.has(ref)).map(admit));
    return entries.sort((a, b) => a.observation.ordinal - b.observation.ordinal || a.ref.localeCompare(b.ref));
  };
  const current = (row: Admitted): boolean => !invalidated.has(row.ref) && (row.observation.reuse === "dependencies" || row.observation.scope.taskId === scope.taskId) && row.observation.procedureRef === procedureRefs[row.procedure.id] && applicable(row.observation.scope, scope, row.procedure);
  const visible = (value: JsonValue): JsonValue => {
    let output = value; const bytes = Buffer.byteLength(canonicalize(value));
    const limit = config.maxVisibleBytes ?? 8192;
    if (bytes > limit - visibleBytes - 128) output = { status: "exhausted", reason: "memory-visible-byte-limit" };
    const cost = Buffer.byteLength(canonicalize(output));
    if (visibleBytes + cost > limit) throw new Error("Memory visible-byte allowance exhausted");
    visibleBytes += cost; return output;
  };
  const historyView = (row: Admitted): JsonValue => json({ sourceRef: row.ref, procedure: row.procedure.id, scope: row.observation.scope, applicability: current(row) ? "current" : "stale", procedureRef: row.observation.procedureRef, command: row.procedure.operation, rawRef: row.observation.rawRef, result: row.raw.result });
  async function execute(action: MemoryAction, terminal: MemoryTerminal, signal?: AbortSignal): Promise<JsonValue> {
    if (signal?.aborted) throw new Error("Memory action cancelled before execution");
    if (operations >= (config.maxOperations ?? 4)) return visible({ status: "exhausted", reason: "memory-operation-limit" });
    operations++;
    const rawAction = object(action);
    if (action.type === "memory.read") keys(rawAction, ["type"]); else keys(rawAction, ["type", "procedure"]);
    const procedure = action.type === "memory.read" ? undefined : config.procedures.find((p) => p.id === action.procedure);
    if (action.type !== "memory.read" && !procedure) throw new Error("Unknown admitted memory procedure");
    if (action.type === "memory.read") {
      const rows = await admitted();
      return visible(json({ status: "read", mode: config.mode, procedures: config.procedures, rules: RULES, observations: rows.map(historyView) }));
    }
    if (action.type === "memory.probe") {
      if (sourceRefs.length >= 128 || liveRefs.length >= 128) return visible({ status: "exhausted", reason: "memory-source-limit" });
      const command = probeCommand(procedure!, scope);
      probeCalls++;
      const result = await terminal({ command, maxOutputBytes: 8192, timeoutMs: 10_000 }, signal);
      if (signal?.aborted) throw new Error("Memory probe cancelled; terminal joined");
      const raw: Raw = { contract: "algal.harness-probe-raw.v1", command, result };
      // Failed bounded probe attempts are audit artifacts, never accepted observations.
      const rawRef = Buffer.byteLength(canonicalize(json(raw))) <= 32_768 ? await putMemoryRecord(config.storeDir, json(raw)) : null;
      let decoded: Decoded;
      try { decoded = decodeProbe(procedure!, scope, raw); } catch (error) {
        probes.push(json({ procedure: procedure!.id, status: "error", rawRef, reason: String(error) }));
        return visible({ status: "error", reason: "probe-rejected", detail: String(error).slice(0, 512) });
      }
      scope = { ...scope, dependencies: decoded.dependencies }; dirty = false;
      if (!rawRef) throw new Error("Accepted probe exceeds raw record bound");
      const observation: Observation = { contract: "algal.harness-observation.v1", owner: config.owner, ordinal: initialRefs.length + probes.filter((p) => object(p).status === "observed").length + 1, scope: structuredClone(scope), procedureRef: procedureRefs[procedure!.id]!, rawRef, decoder: "algal.harness-probe.v1", reuse: mutationSeen ? "task" : "dependencies" };
      const sourceRef = await putMemoryRecord(config.storeDir, json(observation));
      sourceRefs = [...new Set([...sourceRefs, sourceRef])]; liveRefs = [...new Set([...liveRefs, sourceRef])];
      saveIndex();
      probes.push(json({ procedure: procedure!.id, status: "observed", sourceRef, scope, polarity: decoded.polarity, value: decoded.value }));
      return visible(json({ status: "observed", sourceRef, procedure: procedure!.id, scope, result: { polarity: decoded.polarity, value: decoded.value } }));
    }
    if (action.type !== "memory.query") throw new Error("Unknown memory action");
    queryCalls++;
    const all = await admitted();
    const rows = all.filter((row) => row.procedure.id === procedure!.id);
    if (config.mode === "episodic") return visible(json({ status: "episodic", procedure: procedure!.id, observations: rows.map(historyView) }));
    const active = all.filter(current);
    const scopeRef = await putMemoryRecord(config.storeDir, json({ contract: "algal.harness-scope.v1", scope }));
    const facts: { relation: string; tuple: JsonValue[]; sources: string[] }[] = [];
    for (const row of all) {
      facts.push({ relation: "observed-result", tuple: [row.observation.procedureRef, row.ref, row.decoded.polarity, row.decoded.value], sources: [row.ref] });
      for (const name of row.procedure.dependencies) {
        const dep = row.observation.scope.dependencies[name];
        if (!dep) throw new Error("Observation lacks a required dependency");
        facts.push({ relation: "depends-on", tuple: [row.ref, name, dep.digest], sources: [row.ref] });
      }
      if (current(row)) facts.push({ relation: "source-current", tuple: [row.ref, scopeRef], sources: [row.ref, scopeRef] });
    }
    for (const p of config.procedures) {
      const ref = procedureRefs[p.id]!;
      facts.push({ relation: "procedure-active", tuple: [ref, p.id, scopeRef], sources: [ref, scopeRef] });
      facts.push({ relation: "requirement-count", tuple: [ref, p.dependencies.length], sources: [ref] });
      p.dependencies.forEach((name, index) => facts.push({ relation: "requires", tuple: [ref, index, name, scope.dependencies[name]!.digest, index + 1], sources: [ref, scopeRef] }));
    }
    if (facts.length > 128) return visible({ status: "exhausted", reason: "memory-fact-limit" });
    const snapshot = json({ contract: "algal.memory.v1", facts });
    const program = json({ contract: "algal.query.v1", rules: RULES, query: { relation: "answer", terms: [procedure!.id, { var: "polarity" }, { var: "value" }] }, limits: { maxWork: config.maxWork, maxRounds: 8, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144 } });
    const snapshotRef = await putMemoryRecord(config.storeDir, snapshot), programRef = await putMemoryRecord(config.storeDir, program);
    const base = { procedure: procedure!.id, snapshotRef, programRef, scope: structuredClone(scope), sourceRefs: active.map((r) => r.ref) };
    try {
      nativeCalls++;
      const result = object(await invokeNative(config, ["query", recordRefPath(config.storeDir, snapshotRef), recordRefPath(config.storeDir, programRef)], signal));
      if (result.contract !== "algal.query-result.v1" || result.complete !== true || result.snapshot !== snapshotRef || result.program !== programRef || typeof result.work !== "number" || result.work < 0 || result.work > (config.maxWork ?? 50_000) || !Array.isArray(result.rows) || result.rows.length > 16) throw new Error("Invalid complete native query result");
      const resultRef = await putMemoryRecord(config.storeDir, json(result));
      nativeCalls++;
      const verification = object(await invokeNative(config, ["verify", recordRefPath(config.storeDir, snapshotRef), recordRefPath(config.storeDir, programRef), recordRefPath(config.storeDir, resultRef)], signal));
      if (verification.ok !== true) throw new Error("Native memory proof verification failed");
      const answers = result.rows.map((row) => object(row).tuple).map((tuple) => { if (!Array.isArray(tuple) || tuple.length !== 3) throw new Error("Invalid native answer tuple"); return tuple; });
      const supports = answers.filter((row) => row[1] === "supported"), opposes = answers.filter((row) => row[1] === "opposed");
      const status = (supports.length && opposes.length) || new Set(supports.map((r) => canonicalize(json(r[2])))).size > 1 ? "conflicted" : supports.length ? "supported" : opposes.length ? "opposed" : rows.length ? "stale" : "unknown";
      nativeWork += typeof result.work === "number" ? result.work * 2 : 0;
      const entry = json({ ...base, status, resultRef, verified: true, work: result.work, verificationWork: result.work, answers }); queries.push(entry);
      return visible(json({ status, procedure: procedure!.id, snapshotRef, programRef, resultRef, sourceRefs: active.filter((r) => r.procedure.id === procedure!.id).map((r) => r.ref), result: compactResult(result) }));
    } catch (error) {
      if (signal?.aborted) throw error;
      const status = error instanceof NativeFailure && error.exhausted ? "exhausted" : "error";
      queries.push(json({ ...base, status, verified: false, work: null, reason: String(error).slice(0, 512) }));
      return visible(json({ status, reason: "native-query", detail: String(error).slice(0, 512), snapshotRef, programRef }));
    }
  }
  return {
    configurationDigest,
    description: `Memory treatment: ${config.mode}. Available actions: memory.read; memory.query with procedure ID; memory.probe with procedure ID. Reading/querying never executes a probe. Procedures: ${canonicalize(json(config.procedures))}. Every memory action uses one model attempt; at most ${config.maxOperations} memory operations and ${config.maxVisibleBytes} visible bytes per episode. A normal terminal may invalidate observations; use explicit memory.probe to refresh. Missing means unknown. Stale, conflict, exhausted, and error are not usable conclusions. Rules and observations are conditional evidence, not world-truth attestation.`,
    execute(action, terminal, signal) {
      if (pending) return Promise.reject(new Error("Concurrent memory operations are not admitted"));
      pending = execute(action, terminal, signal).then((value) => { outcomes.push(json({ action, status: value && typeof value === "object" && !Array.isArray(value) ? value.status ?? null : null })); return value; });
      return pending.finally(() => { pending = undefined; });
    },
    invalidate() { dirty = true; mutationSeen = true; for (const ref of sourceRefs) invalidated.add(ref); saveIndex(); },
    async settle() { if (pending) await pending; },
    evidence() { return json({ version: MEMORY_ADAPTER_VERSION, mode: config.mode, configurationDigest, owner: config.owner, scope, scopePolicy: "declared-dependencies-with-persistent-mutation-fencing", sourceRefs, excludedRefs: [...excluded], procedureRefs, operations, probeCalls, queryCalls, visibleBytes, nativeCalls, nativeWork, nativeWorkIsLowerBound: queries.some((q) => object(q).work === null), initialInvalidatedRefs: restoredInvalidated, invalidatedRefs: [...invalidated], initialMutationSeen, mutationSeen, queries, probes, outcomes, dirty }); },
  };
}
