/** Development-workspace organism: the coding-harness memory domain wired into
 * the application substrate. A trusted admission host decodes real bounded
 * probes through `decodeProbe`; the mutation frontier tracks the actual
 * dependency files; deliveries on the "probes" route run the real
 * `probeCommand` through a bounded terminal; episode intents run the
 * entrypoint manifest through the VM; and the drain republishes decoded
 * evidence through `appendObservation`. The dispatcher never commits — it
 * deposits raw evidence and outcome records into CAS and a durable channel;
 * the drain runs after dispatch returns and owns all state transitions. */
import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import {
  appendObservation, applicationProcessName, builtinRegistry, capabilityHandle,
  dispatchApplicationEpisode,
  getApplicationRecord, manifestToJson, parseApplicationMigration, parseApplicationRevision,
  parseApplicationState, parseMemoryFrontier, parseMemoryProcedure, parseMemoryScope,
  parseMemorySnapshot, parseOrganismManifest, putApplicationRecord, runOrganism, verifyReceipt,
  type ApplicationAdmission, type ApplicationDispatchContext, type ApplicationDispatcher,
  type ApplicationService, type Digest,
  type ApplicationMemoryService, type MemoryAdmissionHost, type MemoryClaim,
  type MemoryProcedure as SubstrateProcedure, type MemoryResourceVersion, type MemoryScope as SubstrateScope,
} from "../../index";
import type { Executor } from "../../src/effects";
import { parseInvestigationRequest } from "../../src/application-investigation";
import { decodeProbe, probeCommand } from "./memory";
import { json, keys, object, parseProcedure, parseScope, sha256 } from "./memory-records";
import type { MemoryProcedure, MemoryScope, MemoryTerminal } from "./memory-contract";
import { canonicalize } from "../../src/values";
import { digestCanonical } from "../../src/digest";
import { hostDirectory, hostLease, hostNames, hostRead, hostWrite } from "../../src/host-state";
import { parseRunReceipt } from "../../src/run";
import { verifyApplicationMigration } from "../../src/application-migration";
import { reconcileApplicationEpisode } from "../../src/application-episode";

const ref = (value: unknown): Digest => digestCanonical(json(value));
const isRef = (value: unknown): value is Digest => typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
const CHANNEL_LIMIT = 32;
function parseChannel(value: unknown, request: Digest, kind: "probe" | "proposal"): Digest[] {
  const field = kind === "probe" ? "outcomes" : "proposals";
  const row = object(value); keys(row, ["contract", "request", field]);
  const entries = row[field];
  if (row.contract !== `algal.${kind}-channel.v1` || row.request !== request || !Array.isArray(entries) || entries.length > CHANNEL_LIMIT || entries.some(r => !isRef(r)) || new Set(entries).size !== entries.length) throw new Error("Invalid bounded harness channel");
  return entries as Digest[];
}
async function appendChannel(domain: HarnessDomain, path: string, request: Digest, kind: "probe" | "proposal", refs: Digest[]): Promise<void> {
  await hostLease(domain.stateDir, "harness-" + domain.application, async () => {
    const previous = await hostRead(path, 8192);
    const merged = [...new Set([...(previous === undefined ? [] : parseChannel(previous, request, kind)), ...refs])].sort();
    if (merged.length > CHANNEL_LIMIT) throw new Error("Harness channel record bound exceeded");
    await hostWrite(path, json({ contract: `algal.${kind}-channel.v1`, request, [kind === "probe" ? "outcomes" : "proposals"]: merged }), 8192, false);
  });
}
async function verifiedDecision(store: ApplicationService["store"], manifestRef: Digest, receiptRef: Digest, args: unknown, output: string): Promise<unknown> {
  const manifest = await store.getManifest(manifestRef), raw = await store.getValue(receiptRef);
  if (!manifest || raw === undefined) throw new Error("Decision evidence is missing");
  const receipt = parseRunReceipt(raw);
  if (receipt.outcome !== "complete" || canonicalize(json(receipt.args)) !== canonicalize(json(args)) || !(await verifyReceipt(raw, manifestToJson(manifest), store)).ok) throw new Error("Decision receipt does not verify against its request");
  const port = manifest.interface?.outputs?.[output];
  if (!port) throw new Error("Decision output is missing");
  return receipt.cells[port.cell]?.outputs?.[port.port];
}

/** `algal.harness-scope.v1` — the harness memory scope carried as CAS data. */
export function parseHarnessScopeRecord(input: unknown): MemoryScope {
  const row = object(input); keys(row, ["contract", "scope"]);
  if (row.contract !== "algal.harness-scope.v1") throw new Error("Invalid harness scope record");
  return parseScope(row.scope);
}
function parseHarnessProcedureRecord(input: unknown): MemoryProcedure {
  const row = object(input); keys(row, ["contract", "procedure"]);
  if (row.contract !== "algal.harness-procedure.v1") throw new Error("Invalid harness procedure record");
  return parseProcedure(row.procedure);
}
function parseHarnessReceipt(input: unknown): { request: Digest; command: string } {
  const row = object(input); keys(row, ["contract", "request", "command"]);
  if (row.contract !== "algal.harness-probe-receipt.v1" || !isRef(row.request) || typeof row.command !== "string" || Buffer.byteLength(row.command) > 32_768) throw new Error("Invalid probe receipt");
  return { request: row.request as Digest, command: row.command };
}
function parseProbeOutcome(input: unknown): { request: Digest; procedure: Digest; scope: Digest; raw: Digest; receipt: Digest; frontier: Digest; proposal: Digest } {
  const row = object(input); keys(row, ["contract", "request", "procedure", "scope", "raw", "receipt", "frontier", "proposal"]);
  if (row.contract !== "algal.harness-probe-outcome.v1") throw new Error("Invalid probe outcome");
  for (const key of ["request", "procedure", "scope", "raw", "receipt", "frontier", "proposal"] as const) if (!isRef(row[key])) throw new Error("Invalid probe outcome reference");
  return { request: row.request as Digest, procedure: row.procedure as Digest, scope: row.scope as Digest, raw: row.raw as Digest, receipt: row.receipt as Digest, frontier: row.frontier as Digest, proposal: row.proposal as Digest };
}
/** `algal.proposal-request.v1` — asks the proposer inhabitant for a candidate
 * revision of one entrypoint, parented on the revision of a named state. */
export function parseProposalRequest(input: unknown): { application: string; entrypoint: string; state: Digest; nonce: string | null } {
  const row = object(input); keys(row, ["contract", "application", "entrypoint", "state", "nonce"]);
  if (row.contract !== "algal.proposal-request.v1" || typeof row.application !== "string" || !row.application || row.application.length > 64) throw new Error("Invalid proposal request");
  if (typeof row.entrypoint !== "string" || !/^[a-z][a-z0-9._-]{0,63}$/.test(row.entrypoint)) throw new Error("Invalid proposal request entrypoint");
  if (!isRef(row.state)) throw new Error("Invalid proposal request state");
  if (row.nonce !== undefined && row.nonce !== null && (typeof row.nonce !== "string" || Buffer.byteLength(row.nonce) > 128)) throw new Error("Invalid proposal request nonce");
  return { application: row.application, entrypoint: row.entrypoint, state: row.state as Digest, nonce: (row.nonce as string | null | undefined) ?? null };
}
/** `algal.revision-proposal.v1` — a proposer inhabitant's emitted candidate
 * manifest plus the receipt of the program that produced it. A null manifest
 * records a decision that produced no admissible candidate. */
export function parseRevisionProposal(input: unknown): { request: Digest; entrypoint: string; manifest: Digest | null; receipt: Digest } {
  const row = object(input); keys(row, ["contract", "request", "entrypoint", "manifest", "receipt"]);
  if (row.contract !== "algal.revision-proposal.v1" || !isRef(row.request)) throw new Error("Invalid revision proposal");
  if (typeof row.entrypoint !== "string" || !/^[a-z][a-z0-9._-]{0,63}$/.test(row.entrypoint)) throw new Error("Invalid proposal entrypoint");
  if (row.manifest !== null && !isRef(row.manifest)) throw new Error("Invalid proposal manifest");
  if (!isRef(row.receipt)) throw new Error("Invalid proposal receipt");
  return { request: row.request as Digest, entrypoint: row.entrypoint, manifest: row.manifest as Digest | null, receipt: row.receipt as Digest };
}

/** `algal.investigation-proposal.v1` — the inhabitant's probe decision: which
 * of the request's admitted procedures to run, plus the receipt of the ALGAL
 * program that decided. A null receipt is the default all-admitted policy. */
export function parseInvestigationProposal(input: unknown): { request: Digest; probes: Digest[]; receipt: Digest | null } {
  const row = object(input); keys(row, ["contract", "request", "probes", "receipt"]);
  if (row.contract !== "algal.investigation-proposal.v1") throw new Error("Invalid investigation proposal");
  if (!isRef(row.request)) throw new Error("Invalid proposal request");
  if (!Array.isArray(row.probes) || row.probes.length > 8 || row.probes.some(p => !isRef(p)) || new Set(row.probes as string[]).size !== (row.probes as string[]).length) throw new Error("Invalid proposal probes");
  if (row.receipt !== null && !isRef(row.receipt)) throw new Error("Invalid proposal receipt");
  return { request: row.request as Digest, probes: row.probes as Digest[], receipt: row.receipt as Digest | null };
}

export type HarnessDomain = {
  application: string; environmentId: string; taskId: string; sequenceId: string;
  /** Dependency name → normalized relative path inside `cwd`. */
  dependencies: Record<string, string>;
  procedures: MemoryProcedure[];
  cwd: string; stateDir: string; attestation: Digest;
  /** Harness procedure id → substrate `algal.application-memory-procedure.v1` ref. */
  procedureRefs: Record<string, Digest>;
  /** Genesis substrate scope + frontier for the initial memory snapshot. */
  scope: Digest; frontier: Digest;
  /** Mutation record capturing the dependency digests admitted at genesis. */
  baseline: Digest;
};

const digestDependencies = async (cwd: string, dependencies: Record<string, string>): Promise<MemoryScope["dependencies"]> => {
  const out: MemoryScope["dependencies"] = {};
  for (const [name, path] of Object.entries(dependencies).sort()) {
    const file = await open(join(cwd, path), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 1_048_576) throw new Error(`Dependency ${name} exceeds its regular-file bound`);
      const bytes = Buffer.alloc(stat.size + 1);
      let size = 0;
      while (size < bytes.length) { const part = await file.read(bytes, size, bytes.length - size, size); if (!part.bytesRead) break; size += part.bytesRead; }
      if (size !== stat.size) throw new Error(`Dependency ${name} changed while reading`);
      out[name] = { path, digest: sha256(bytes.subarray(0, size)) };
    } finally { await file.close(); }
  }
  return out;
};

/** Admits the domain's declared dependency paths and procedures, stores the
 * harness records in the application CAS, and publishes the genesis scope and
 * frontier. Idempotent: all records are content-addressed. */
export async function createHarnessDomain(store: ApplicationService["store"], input: {
  application: string; environmentId: string; taskId: string; sequenceId: string;
  /** Substrate memory schema the domain's claims are admitted under. */
  schema: Digest;
  dependencies: Record<string, string>; procedures: MemoryProcedure[]; cwd: string; stateDir: string;
}): Promise<HarnessDomain> {
  const dependencies = Object.fromEntries(Object.entries(input.dependencies).sort());
  if (Object.keys(dependencies).length > 8) throw new Error("At most eight memory dependencies");
  parseScope({ sequenceId: input.sequenceId, taskId: input.taskId, environmentId: input.environmentId, dependencies: Object.fromEntries(Object.entries(dependencies).map(([name, path]) => [name, { path, digest: "0".repeat(64) }])) });
  await hostDirectory(input.stateDir);
  const procedures = input.procedures.map(parseProcedure);
  if (!procedures.length || procedures.length > 8) throw new Error("Require one to eight procedures");
  for (const p of procedures) for (const dep of p.dependencies) if (!dependencies[dep]) throw new Error("Procedure dependency not declared in domain");
  const attestation = await putApplicationRecord(store, { contract: "algal.harness-attestation.v1", environmentId: input.environmentId, taskId: input.taskId });
  const procedureRefs: Record<string, Digest> = {};
  const observed = await digestDependencies(input.cwd, dependencies);
  const harnessScope = await putApplicationRecord(store, { contract: "algal.harness-scope.v1", scope: { sequenceId: input.sequenceId, taskId: input.taskId, environmentId: input.environmentId, dependencies: observed } });
  const baseline = await putApplicationRecord(store, { contract: "algal.harness-mutation.v1", dependencies: observed });
  const frontier = await putApplicationRecord(store, { contract: "algal.application-memory-frontier.v1", application: input.application, previous: null, sequence: 0, mutation: null, status: "settled" });
  for (const procedure of procedures) {
    const decoder = await putApplicationRecord(store, { contract: "algal.harness-procedure.v1", procedure });
    procedureRefs[procedure.id] = await putApplicationRecord(store, {
      contract: "algal.application-memory-procedure.v1", id: procedure.id, schema: input.schema,
      manifest: decoder, decoder, dependencies: procedure.dependencies, prerequisite: null,
    } satisfies SubstrateProcedure);
  }
  const bindings = [
    { key: "scope", version: { kind: "store", reference: harnessScope } as MemoryResourceVersion },
    ...Object.entries(observed).map(([key, dep]) => ({ key, version: { kind: "file", sha256: dep.digest } as MemoryResourceVersion })),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const scope = await putApplicationRecord(store, {
    contract: "algal.application-memory-scope.v1", application: input.application,
    environment: input.environmentId, task: input.taskId, frontier, bindings,
    completeFor: Object.values(procedureRefs).sort(), attestation,
  } satisfies SubstrateScope);
  const identity = ref({ application: input.application, sequenceId: input.sequenceId, environmentId: input.environmentId, taskId: input.taskId, schema: input.schema, dependencies, procedures });
  return hostLease(input.stateDir, "harness-" + input.application, async () => {
    const path = join(input.stateDir, "genesis.json"), previous = await hostRead(path, 4096);
    if (previous !== undefined) {
      const saved = object(previous); keys(saved, ["identity", "scope", "frontier", "baseline"]);
      if (saved.identity !== identity || !isRef(saved.scope) || !isRef(saved.frontier) || !isRef(saved.baseline)) throw new Error("Harness domain genesis identity changed");
      const persistedScope = await getApplicationRecord(store, saved.scope, parseMemoryScope);
      if (persistedScope.application !== input.application || persistedScope.frontier !== saved.frontier) throw new Error("Harness domain genesis scope changed");
      return { ...input, procedures, attestation, procedureRefs, scope: saved.scope, frontier: saved.frontier, baseline: saved.baseline };
    }
    await hostWrite(path, json({ identity, scope, frontier, baseline }), 4096);
    return { ...input, procedures, attestation, procedureRefs, scope, frontier, baseline };
  });
}

/** Trusted admission host for the harness domain. `currentFrontier` rehashes
 * the declared dependency files and publishes a new frontier on change; the
 * last admitted frontier persists in `stateDir/frontier.json` so a restart
 * keeps the chain. */
export function createHarnessAdmission(domain: HarnessDomain, store: ApplicationService["store"]): MemoryAdmissionHost {
  const frontierFile = join(domain.stateDir, "frontier.json");
  const lastFrontier = async (): Promise<{ ref: Digest; sequence: number } | null> => {
    const raw = await hostRead(frontierFile, 4096);
    if (raw === undefined) return null;
    const row = object(raw); keys(row, ["ref", "sequence"]);
    if (!isRef(row.ref) || !Number.isSafeInteger(row.sequence) || (row.sequence as number) < 0) throw new Error("Invalid persisted frontier");
    return { ref: row.ref as Digest, sequence: row.sequence as number };
  };
  return {
    identity: ref({ contract: "algal.harness-admission.v1", application: domain.application, dependencies: domain.dependencies, procedures: domain.procedures.map(p => p.id) }),
    async currentFrontier(application) {
      if (application !== domain.application) throw new Error("Frontier requested for another application");
      return hostLease(domain.stateDir, "harness-" + domain.application, async () => {
      const observed = await digestDependencies(domain.cwd, domain.dependencies);
      const mutation = await putApplicationRecord(store, { contract: "algal.harness-mutation.v1", dependencies: observed });
      const last = await lastFrontier();
      if (last) {
        const tip = await getApplicationRecord(store, last.ref, parseMemoryFrontier);
        if (tip.application !== application || tip.sequence !== last.sequence || tip.status !== "settled") throw new Error("Persisted frontier does not match its chain tip");
        // The chain head tracks the live dependency state; an unchanged
        // mutation record means the last frontier still describes it. A
        // mutation-free tip describes the baseline admitted at genesis.
        if ((tip.mutation ?? domain.baseline) === mutation) return last.ref;
        const next = await putApplicationRecord(store, { contract: "algal.application-memory-frontier.v1", application, previous: last.ref, sequence: last.sequence + 1, mutation, status: "settled" });
        await hostWrite(frontierFile, json({ ref: next, sequence: last.sequence + 1 }), 4096, false);
        return next;
      }
      const ref0 = mutation === domain.baseline ? domain.frontier : await putApplicationRecord(store, { contract: "algal.application-memory-frontier.v1", application, previous: domain.frontier, sequence: 1, mutation, status: "settled" });
      await hostWrite(frontierFile, json({ ref: ref0, sequence: ref0 === domain.frontier ? 0 : 1 }), 4096, false);
      return ref0;
      });
    },
    async validateScope({ scope, frontier, attestation }) {
      if (scope.application !== domain.application) throw new Error("Cross-application scope");
      const binding = scope.bindings.find(b => b.key === "scope");
      if (binding?.version.kind !== "store") throw new Error("Scope lacks the harness scope binding");
      const harness = parseHarnessScopeRecord(await store.getValue(binding.version.reference));
      if (harness.environmentId !== scope.environment || harness.taskId !== scope.task) throw new Error("Scope identity does not match the harness record");
      if (scope.attestation !== domain.attestation || harness.environmentId !== domain.environmentId || harness.taskId !== domain.taskId || harness.sequenceId !== domain.sequenceId) throw new Error("Scope is outside the admitted harness domain");
      const mutation = object(await store.getValue(frontier.mutation ?? domain.baseline));
      keys(mutation, ["contract", "dependencies"]);
      if (mutation.contract !== "algal.harness-mutation.v1" || canonicalize(json(mutation.dependencies)) !== canonicalize(json(harness.dependencies))) throw new Error("Scope dependencies do not match the observation frontier");
      for (const [name, dep] of Object.entries(harness.dependencies)) {
        const bound = scope.bindings.find(b => b.key === name);
        if (bound?.version.kind !== "file" || bound.version.sha256 !== dep.digest) throw new Error("Scope binding does not match the recorded dependency");
      }
      const att = object(attestation); keys(att, ["contract", "environmentId", "taskId"]);
      if (att.contract !== "algal.harness-attestation.v1" || att.environmentId !== harness.environmentId || att.taskId !== harness.taskId) throw new Error("Scope attestation does not cover this environment and task");
    },
    async decodeObservation({ observation, scope, procedure, raw, receipt }) {
      if (observation.decoder !== procedure.decoder) throw new Error("Observation decoder is not the admitted procedure decoder");
      const binding = scope.bindings.find(b => b.key === "scope");
      if (binding?.version.kind !== "store") throw new Error("Observation scope lacks the harness scope binding");
      const bounded = object(raw);
      // A migration observation's raw is the migration record: the admitted
      // decoder re-emits the program's claims, bound to the run receipt.
      if (bounded.contract === "algal.application-migration.v1") {
        const decoderRecord = object(await store.getValue(procedure.decoder));
        if (decoderRecord.contract !== "algal.migration-decoder.v1") throw new Error("Migration procedure decoder does not admit migrations");
        const migration = parseApplicationMigration(bounded);
        if (migration.receipt !== observation.receipt) throw new Error("Migration record does not bind the observation receipt");
        await verifyApplicationMigration(store, migration, observation.scope);
        return migration.claims;
      }
      const harnessProcedure = parseHarnessProcedureRecord(await store.getValue(procedure.decoder));
      if (domain.procedureRefs[harnessProcedure.id] !== observation.procedure) throw new Error("Observation procedure is outside the admitted harness domain");
      const harnessScope = parseHarnessScopeRecord(await store.getValue(binding.version.reference));
      keys(bounded, ["contract", "command", "result"]);
      const decoded = decodeProbe(harnessProcedure, harnessScope, bounded);
      const proof = parseHarnessReceipt(receipt);
      if (proof.command !== bounded.command) throw new Error("Receipt does not bind the raw probe command");
      if (canonicalize(json(decoded.dependencies)) !== canonicalize(json(harnessScope.dependencies))) throw new Error("Decoded dependencies differ from the recorded scope");
      const claim: MemoryClaim = { relation: "observed-result", tuple: [harnessProcedure.id, decoded.value], polarity: decoded.polarity };
      return [claim];
    },
  };
}

/** Application-level admission for the harness domain: deliveries go to the
 * durable probes channel; episodes bind the captured state exactly. */
export function harnessApplicationAdmission(): ApplicationAdmission {
  return {
    async admitCommit() {},
    async admitDispatch({ snapshot, intent }) {
      if (intent.kind === "deliver") return { kind: "delivery" as const, recipient: capabilityHandle("mailbox-send", { fixture: true }), hostProfile: ref("harness-host-profile.v1") };
      const entry = snapshot.revision.entrypoints.find(e => e.name === intent.entrypoint);
      if (!entry) throw new Error("Unknown episode entrypoint");
      const intentRef = digestCanonical(json(intent));
      return { kind: "episode" as const, binding: {
        contract: "algal.application-episode.v1" as const, application: intent.application, intent: intentRef,
        sourceState: snapshot.digest, revision: snapshot.state.revision, memory: snapshot.state.memory,
        epoch: snapshot.state.epoch, entrypoint: entry.name, manifest: entry.manifest, arguments: intent.input,
        process: applicationProcessName(intent.application, intentRef), maxGenerations: entry.maxGenerations,
        hostProfile: ref("harness-host-profile.v1"), access: "observe" as const,
      } };
    },
  };
}

/** A bounded real terminal for probes: `/bin/sh` in the declared sandbox root,
 * output capped at the request bound, timeout and cancellation join the child. */
export function harnessTerminal(cwd: string): MemoryTerminal {
  return async (request, signal) => {
    if (signal?.aborted) throw new Error("Terminal cancelled before launch");
    const child = Bun.spawn(["/bin/sh", "-c", request.command], { cwd, stdout: "pipe", stderr: "pipe" });
    let over = false;
    const kill = () => { if (child.exitCode === null) child.kill("SIGKILL"); };
    const timer = setTimeout(kill, request.timeoutMs);
    signal?.addEventListener("abort", kill, { once: true });
    const drain = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
      const chunks: Uint8Array[] = []; let size = 0;
      for await (const part of stream) { size += part.byteLength; if (size > request.maxOutputBytes) { over = true; kill(); break; } chunks.push(part); }
      return Buffer.concat(chunks).toString("utf8");
    };
    try {
      const [stdout, stderr, exitCode] = await Promise.all([drain(child.stdout), drain(child.stderr), child.exited]);
      return { exitCode: over ? 1 : exitCode, stdout, stderr };
    } finally {
      clearTimeout(timer); signal?.removeEventListener("abort", kill);
      if (child.exitCode === null) { child.kill("SIGKILL"); await child.exited; }
    }
  };
}

/** The probes-route consumer. For each procedure an investigation request
 * names, run the real probe command, deposit the bounded raw record and an
 * outcome record into CAS, and append the outcome to the durable channel file
 * `stateDir/probes/<request>.json`. The drain commits the state transition. */
export function createHarnessDispatcher(domain: HarnessDomain, store: ApplicationService["store"], terminal: MemoryTerminal, currentFrontier: (application: string) => Promise<Digest>, capabilityExecutors: Record<string, Executor[]> = {}): ApplicationDispatcher {
  const channelDir = join(domain.stateDir, "probes");
  const proposalDir = join(domain.stateDir, "proposals");
  // Inhabitants exercise only the capability classes their entrypoint
  // declares: the host maps each class to its executors, and an entrypoint
  // with an empty declaration runs with none.
  const inhabitantExecutors = (entry: { capabilities: string[] }): Executor[] =>
    [...new Set(entry.capabilities.flatMap(c => capabilityExecutors[c] ?? []))];
  return {
    configurationDigest: ref({ contract: "algal.harness-dispatcher.v1", routes: ["probes", "proposals"] }),
    async reconcile(context: ApplicationDispatchContext) {
      if (context.intent.kind !== "start-episode") return undefined;
      return reconcileApplicationEpisode(context, { store, executors: inhabitantExecutors });
    },
    async dispatch(context: ApplicationDispatchContext) {
      const work = context.intent;
      if (work.kind === "deliver" && work.route === "proposals") {
        // The proposer inhabitant: an ALGAL program (possibly model-backed)
        // emits a candidate manifest as data. Its run receipt plus the
        // parsed manifest digest are deposited as a durable proposal; the
        // drain validates it against the incumbent interface.
        const request = await getApplicationRecord(store, work.message, parseProposalRequest);
        if (request.application !== domain.application) throw new Error("Cross-application proposal request");
        const state = await getApplicationRecord(store, request.state, parseApplicationState);
        if (state.application !== request.application) throw new Error("Proposal request state belongs to another application");
        const revision = await getApplicationRecord(store, state.revision, parseApplicationRevision);
        const entry = revision.entrypoints.find(e => e.name === request.entrypoint);
        if (!entry) throw new Error("Proposal request names an unknown entrypoint");
        // The proposer is revision data: the request's state names the
        // revision whose "proposer" entrypoint emits the candidate.
        const proposerEntry = revision.entrypoints.find(e => e.name === "proposer");
        const manifest = proposerEntry ? await store.getManifest(proposerEntry.manifest) : undefined;
        if (!manifest) throw new Error("Proposer manifest missing from the store");
        const incumbent = await store.getManifest(entry.manifest);
        const decision = await runOrganism({
          manifest, fns: builtinRegistry(), store, executors: inhabitantExecutors(proposerEntry ?? { capabilities: [] }),
          args: { req: { value: json({ entrypoint: request.entrypoint, manifest: incumbent ? manifestToJson(incumbent) : null }) } },
          processName: `proposer-${work.message.slice(7, 55)}`,
        });
        const receipt = await putApplicationRecord(store, decision);
        let candidate: Digest | null = null;
        const out = manifest.interface?.outputs?.proposed;
        if (decision.outcome === "complete" && out) {
          try { candidate = await store.putManifest(parseOrganismManifest(decision.cells[out.cell]?.outputs?.[out.port])); } catch { candidate = null; }
        }
        const proposal = await putApplicationRecord(store, { contract: "algal.revision-proposal.v1", request: work.message, entrypoint: request.entrypoint, manifest: candidate, receipt });
        const channel = join(proposalDir, work.message.slice(7) + ".json");
        await appendChannel(domain, channel, work.message, "proposal", [proposal]);
        return { status: "settled" as const, result: { kind: "delivery" as const, message: work.message, idempotencyKey: context.dispatch.identity } };
      }
      if (work.kind === "deliver") {
        if (work.route !== "probes") throw new Error("Unadmitted harness delivery route");
        const request = await getApplicationRecord(store, work.message, parseInvestigationRequest);
        if (request.application !== domain.application) throw new Error("Cross-application investigation request");
        const snapshot = await getApplicationRecord(store, request.memory, parseMemorySnapshot);
        const substrateScope = await getApplicationRecord(store, snapshot.scope, parseMemoryScope);
        const binding = substrateScope.bindings.find(b => b.key === "scope");
        if (binding?.version.kind !== "store") throw new Error("Request scope lacks the harness scope binding");
        const harnessScopeRef = binding.version.reference;
        const harnessScope = parseHarnessScopeRecord(await store.getValue(harnessScopeRef));

        // The inhabitant decides which admitted procedures to probe. Its
        // decision program is revision data — the request's state names the
        // revision whose "investigator" entrypoint runs — and its receipt
        // becomes part of the proposal record the drain validates.
        const substrateProcedures = new Map<Digest, SubstrateProcedure>();
        for (const procedureRef of request.procedures) substrateProcedures.set(procedureRef, await getApplicationRecord(store, procedureRef, parseMemoryProcedure));
        const requestState = await getApplicationRecord(store, request.state, parseApplicationState);
        if (requestState.application !== request.application || requestState.memory !== request.memory) throw new Error("Investigation request does not bind its captured state");
        const requestRevision = await getApplicationRecord(store, requestState.revision, parseApplicationRevision);
        const investigatorEntry = requestRevision.entrypoints.find(e => e.name === "investigator");
        let probes = request.procedures, decisionReceipt: Digest | null = null;
        if (investigatorEntry) {
          const manifest = await store.getManifest(investigatorEntry.manifest);
          if (!manifest) throw new Error("Investigator manifest missing from the store");
          const decision = await runOrganism({
            manifest, fns: builtinRegistry(), store, executors: inhabitantExecutors(investigatorEntry),
            args: { req: { value: json({ entrypoint: request.entrypoint, procedures: [...substrateProcedures.values()].map(p => p.id) }) } },
            processName: `investigator-${work.message.slice(7, 55)}`,
          });
          decisionReceipt = await putApplicationRecord(store, decision);
          if (decision.outcome !== "complete") {
            probes = [];
          } else {
            const out = manifest.interface?.outputs?.probes;
            const chosen = object(out ? decision.cells[out.cell]?.outputs?.[out.port] : undefined, "investigator output");
            keys(chosen, ["procedures"]);
            if (!Array.isArray(chosen.procedures) || chosen.procedures.length > 8 || chosen.procedures.some((p): p is string => typeof p !== "string" || !/^[a-z][a-z0-9._-]{0,63}$/.test(p)) || new Set(chosen.procedures).size !== chosen.procedures.length) throw new Error("Investigator returned invalid procedures");
            const byId = new Map([...substrateProcedures].map(([r, p]) => [p.id, r]));
            probes = (chosen.procedures as string[]).map(id => {
              const ref = byId.get(id);
              if (!ref) throw new Error("Investigator proposed an unadmitted procedure");
              return ref;
            });
          }
        }
        const proposal = await putApplicationRecord(store, { contract: "algal.investigation-proposal.v1", request: work.message, probes, receipt: decisionReceipt });

        const outcomes: Digest[] = [];
        for (const procedureRef of probes) {
          const procedure = await getApplicationRecord(store, procedureRef, parseMemoryProcedure);
          const harnessProcedure = parseHarnessProcedureRecord(await store.getValue(procedure.decoder));
          const command = probeCommand(harnessProcedure, harnessScope);
          const frontier = await currentFrontier(domain.application);
          const result = await terminal({ command, maxOutputBytes: 8192, timeoutMs: 10_000 });
          if (await currentFrontier(domain.application) !== frontier) throw new Error("Mutation frontier changed during probe; fresh investigation required");
          const raw = await putApplicationRecord(store, { contract: "algal.harness-probe-raw.v1", command, result });
          const receipt = await putApplicationRecord(store, { contract: "algal.harness-probe-receipt.v1", request: work.message, command });
          // The frontier binds the observation to the world at probe time; a
          // later mutation makes it stale rather than silently current.
          outcomes.push(await putApplicationRecord(store, { contract: "algal.harness-probe-outcome.v1", request: work.message, procedure: procedureRef, scope: harnessScopeRef, raw, receipt, frontier, proposal }));
        }
        const channel = join(channelDir, work.message.slice(7) + ".json");
        await appendChannel(domain, channel, work.message, "probe", outcomes);
        return { status: "settled" as const, result: { kind: "delivery" as const, message: work.message, idempotencyKey: context.dispatch.identity } };
      }
      // The worker inhabitant exercises only the capabilities its entrypoint
      // declares on the binding's revision.
      return dispatchApplicationEpisode(context, { store, executors: inhabitantExecutors });
    },
  };
}

/** Drains the probes channel: decodes each deposited outcome through the real
 * `decodeProbe` (re-verified inside `decodeObservation`), publishes the
 * post-observation harness scope, and commits each observation through
 * `appendObservation` against the live head. */
export async function drainProbes(domain: HarnessDomain, lifecycle: ApplicationService, memory: ApplicationMemoryService): Promise<{ committed: Digest[]; rejected: Digest[] }> {
  const channelDir = join(domain.stateDir, "probes");
  const committed: Digest[] = [], rejected: Digest[] = [];
  const files = await hostNames(channelDir, 128, /^[a-f0-9]{64}\.json$/);
  for (const file of files) {
    const channelRequest = `sha256:${file.slice(0, -5)}` as Digest;
    const outcomes = parseChannel(await hostRead(join(channelDir, file), 8192), channelRequest, "probe");
    for (const outcomeRef of outcomes) {
      const outcome = parseProbeOutcome(await lifecycle.store.getValue(outcomeRef));
      const procedure = await getApplicationRecord(lifecycle.store, outcome.procedure, parseMemoryProcedure);
      const harnessProcedure = parseHarnessProcedureRecord(await lifecycle.store.getValue(procedure.decoder));
      const harnessScope = parseHarnessScopeRecord(await lifecycle.store.getValue(outcome.scope));
      const raw = await lifecycle.store.getValue(outcome.raw);
      let decoded: ReturnType<typeof decodeProbe>;
      try {
        decoded = decodeProbe(harnessProcedure, harnessScope, raw);
        // The outcome must carry a proposal that admits exactly this procedure
        // for this request — an unproposed probe never reaches the head.
        const proposal = parseInvestigationProposal(await lifecycle.store.getValue(outcome.proposal));
        const request = await getApplicationRecord(lifecycle.store, outcome.request, parseInvestigationRequest);
        if (outcome.request !== channelRequest || request.application !== domain.application || proposal.request !== outcome.request || !proposal.probes.includes(outcome.procedure) || !request.procedures.includes(outcome.procedure) || proposal.probes.some(p => !request.procedures.includes(p))) throw new Error("Outcome procedure was not admitted by the investigation proposal");
        if (parseHarnessReceipt(await lifecycle.store.getValue(outcome.receipt)).request !== outcome.request) throw new Error("Probe receipt belongs to another request");
        const state = await getApplicationRecord(lifecycle.store, request.state, parseApplicationState);
        if (state.application !== request.application || state.memory !== request.memory) throw new Error("Investigation state binding changed");
        const revision = await getApplicationRecord(lifecycle.store, state.revision, parseApplicationRevision);
        const investigator = revision.entrypoints.find(e => e.name === "investigator");
        if (investigator) {
          if (!proposal.receipt) throw new Error("Investigator receipt is required");
          const procedures = await Promise.all(request.procedures.map(r => getApplicationRecord(lifecycle.store, r, parseMemoryProcedure)));
          const decision = object(await verifiedDecision(lifecycle.store, investigator.manifest, proposal.receipt, { req: { value: { entrypoint: request.entrypoint, procedures: procedures.map(p => p.id) } } }, "probes"));
          keys(decision, ["procedures"]);
          const byRef = new Map(request.procedures.map((r, i) => [r, procedures[i]!.id]));
          if (canonicalize(json(decision.procedures)) !== canonicalize(json(proposal.probes.map(r => byRef.get(r))))) throw new Error("Investigation proposal differs from its decision receipt");
        } else if (proposal.receipt !== null || canonicalize(json(proposal.probes)) !== canonicalize(json(request.procedures))) throw new Error("Unbound investigation decision");
      } catch { rejected.push(outcomeRef); continue; }
      const observedScope = await putApplicationRecord(lifecycle.store, { contract: "algal.harness-scope.v1", scope: { sequenceId: harnessScope.sequenceId, taskId: harnessScope.taskId, environmentId: harnessScope.environmentId, dependencies: decoded.dependencies } });
      const bindings = [
        { key: "scope", version: { kind: "store", reference: observedScope } as MemoryResourceVersion },
        ...Object.entries(decoded.dependencies).map(([key, dep]) => ({ key, version: { kind: "file", sha256: dep.digest } as MemoryResourceVersion })),
      ].sort((a, b) => a.key.localeCompare(b.key));
      // Each admitted probe fingerprints the domain's declared dependency
      // files, including those used by its sibling procedures. Preserve that
      // host-attested coverage when this scope becomes the snapshot scope;
      // restricting it to the last observation would discard other premises
      // from a multi-procedure query. Observation presence grants no coverage.
      const completeFor = domain.procedures.filter(p => p.dependencies.every(key =>
        decoded.dependencies[key]?.path === domain.dependencies[key],
      )).map(p => domain.procedureRefs[p.id]!).sort();
      const scope = await putApplicationRecord(lifecycle.store, {
        contract: "algal.application-memory-scope.v1", application: domain.application,
        environment: harnessScope.environmentId, task: harnessScope.taskId, frontier: outcome.frontier, bindings,
        completeFor, attestation: domain.attestation,
      } satisfies SubstrateScope);
      const observation = { application: domain.application, scope, procedure: outcome.procedure, raw: outcome.raw, receipt: outcome.receipt, decoder: procedure.decoder };
      // Admitting through the trusted service is idempotent; a re-drain skips
      // observations the current memory already carries instead of committing
      // a duplicate successor under a reused operation identity.
      const admitted = await memory.observe(observation);
      const head = await lifecycle.inspect(domain.application);
      if (!head) throw new Error("Application has no published head");
      const snapshot = await getApplicationRecord(lifecycle.store, head.state.memory, parseMemorySnapshot);
      if (snapshot.observations.includes(admitted)) continue;
      await appendObservation(lifecycle, memory, {
        application: domain.application, operation: digestCanonical(json({ op: "drain", outcome: outcomeRef, head: head.digest })),
        expectedHead: head.digest, expectedMemory: head.state.memory, observation,
      });
      committed.push(scope);
    }
  }
  return { committed, rejected };
}

/** Drains the proposals channel: validates each deposited proposal — its
 * request belongs to this application and names the same entrypoint, the
 * emitted manifest resolves and parses, and its interface matches the
 * incumbent entrypoint's — before returning admissible candidates for the
 * caller to evaluate. */
export async function drainProposals(domain: HarnessDomain, lifecycle: ApplicationService): Promise<{ proposals: { ref: Digest; request: Digest; entrypoint: string; manifest: Digest }[]; rejected: Digest[] }> {
  const dir = join(domain.stateDir, "proposals");
  const proposals: { ref: Digest; request: Digest; entrypoint: string; manifest: Digest }[] = [], rejected: Digest[] = [];
  const files = await hostNames(dir, 128, /^[a-f0-9]{64}\.json$/);
  for (const file of files) {
    const channelRequest = `sha256:${file.slice(0, -5)}` as Digest;
    const refs = parseChannel(await hostRead(join(dir, file), 8192), channelRequest, "proposal");
    for (const proposalRef of refs) {
      try {
        const proposal = parseRevisionProposal(await lifecycle.store.getValue(proposalRef));
        const request = await getApplicationRecord(lifecycle.store, proposal.request, parseProposalRequest);
        if (channelRequest !== proposal.request || request.application !== domain.application || proposal.entrypoint !== request.entrypoint || proposal.manifest === null) throw new Error("Invalid proposal binding");
        const state = await getApplicationRecord(lifecycle.store, request.state, parseApplicationState);
        if (state.application !== request.application) throw new Error("Proposal state belongs to another application");
        const revision = await getApplicationRecord(lifecycle.store, state.revision, parseApplicationRevision);
        const entry = revision.entrypoints.find(e => e.name === request.entrypoint);
        if (!entry) throw new Error("Proposal names an unknown entrypoint");
        const incumbent = await lifecycle.store.getManifest(entry.manifest);
        const candidate = await lifecycle.store.getManifest(proposal.manifest);
        if (!incumbent || !candidate) throw new Error("Proposal manifest is not in the store");
        if (canonicalize(json(incumbent.interface ?? null)) !== canonicalize(json(candidate.interface ?? null))) throw new Error("Candidate interface differs from the incumbent");
        const proposer = revision.entrypoints.find(e => e.name === "proposer");
        if (!proposer) throw new Error("Proposal revision has no proposer");
        const output = await verifiedDecision(lifecycle.store, proposer.manifest, proposal.receipt, { req: { value: { entrypoint: request.entrypoint, manifest: manifestToJson(incumbent) } } }, "proposed");
        if (ref(manifestToJson(parseOrganismManifest(output))) !== proposal.manifest) throw new Error("Proposal manifest differs from its decision receipt");
        proposals.push({ ref: proposalRef, request: proposal.request, entrypoint: proposal.entrypoint, manifest: proposal.manifest });
      } catch { rejected.push(proposalRef); }
    }
  }
  return { proposals, rejected };
}
