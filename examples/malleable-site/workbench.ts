/** Example-owned bounded journal. ApplicationService alone owns application
 * head publication; this journal retains observations and unactivated work. */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applicationJson, getApplicationRecord, parseApplicationState, parseApplicationTransition } from "../../src/application-contract";
import { digestCanonical, type Digest } from "../../src/digest";
import { hostLease, hostNames, hostRead, hostWrite, SHARED_LEASE_RETRY } from "../../src/host-state";
import { APPLICATION, MarketingHost, exportEvidence, signalOperation, verifyEvidence, type SurfaceEvidence } from "./host";
import { parseProposal, type SurfaceNode } from "./surface";
import { WORKBENCH_LIMITS, boundWorkbench, parseAttemptAdmission, parseAttemptSettlement, parseShadowRecord, parseWorkbenchCapture, parseWorkbenchCommand, parseWorkbenchPreview, workbenchObject, workbenchRef, type AttemptAdmission, type AttemptSettlement, type NodeExplanation, type ShadowRecord, type WorkbenchAttempt, type WorkbenchCapture, type WorkbenchCommand, type WorkbenchPreview, type WorkbenchResult, type WorkbenchShadow, type WorkbenchUsage } from "./workbench-contract";

const hash = (value: unknown): Digest => digestCanonical(applicationJson(value));
type JournalPayload = { kind: "preview"; data: WorkbenchPreview } | { kind: "attempt"; data: AttemptAdmission } | { kind: "settlement" | "reconciliation"; data: { attempt: Digest; settlement: AttemptSettlement } } | { kind: "shadow"; data: ShadowRecord };
type JournalEntry = { contract: "algal.marketing-journal.v1"; sequence: number; previous: Digest | null; payload: JournalPayload };
function payload(input: unknown): JournalPayload {
  const v = workbenchObject(input, ["kind", "data"]);
  if (v.kind === "preview") return { kind: v.kind, data: parseWorkbenchPreview(v.data) };
  if (v.kind === "attempt") return { kind: v.kind, data: parseAttemptAdmission(v.data) };
  if (v.kind === "shadow") return { kind: v.kind, data: parseShadowRecord(v.data) };
  if (v.kind === "settlement" || v.kind === "reconciliation") { const d = workbenchObject(v.data, ["attempt", "settlement"]); return { kind: v.kind, data: { attempt: workbenchRef(d.attempt), settlement: parseAttemptSettlement(d.settlement) } }; }
  throw new Error("Unknown journal entry kind");
}
function journalEntry(input: unknown): JournalEntry {
  boundWorkbench(input);
  const v = workbenchObject(input, ["contract", "sequence", "previous", "payload"]);
  if (v.contract !== "algal.marketing-journal.v1" || !Number.isSafeInteger(v.sequence) || (v.sequence as number) < 0 || (v.sequence as number) >= WORKBENCH_LIMITS.journal) throw new Error("Invalid journal sequence/contract");
  return { contract: v.contract, sequence: v.sequence as number, previous: v.previous === null ? null : workbenchRef(v.previous), payload: payload(v.payload) };
}
const JOURNAL_ANCHOR = { contract: "algal.marketing-journal-anchor.v1", application: APPLICATION };
type JournalState = { contract: "algal.marketing-journal-state.v1"; phase: "initializing" | "ready"; count: number; head: Digest | null; prepared: Digest | null };
function journalState(input: unknown): JournalState {
  const v = workbenchObject(input, ["contract", "phase", "count", "head", "prepared"]);
  if (v.contract !== "algal.marketing-journal-state.v1" || (v.phase !== "initializing" && v.phase !== "ready") || !Number.isSafeInteger(v.count) || (v.count as number) < 0 || (v.count as number) > WORKBENCH_LIMITS.journal) throw new Error("Invalid journal checkpoint");
  const value: JournalState = { contract: v.contract, phase: v.phase, count: v.count as number, head: v.head === null ? null : workbenchRef(v.head), prepared: v.prepared === null ? null : workbenchRef(v.prepared) };
  if ((value.count === 0) !== (value.head === null) || value.prepared !== null && (value.phase !== "ready" || value.count === WORKBENCH_LIMITS.journal)) throw new Error("Invalid journal checkpoint position");
  return value;
}
type WorkbenchOptions = { fault?: (point: "journal-prepared" | "journal-record-published" | "journal-committed") => void | Promise<void> };
function projection(entries: JournalEntry[]): { previews: WorkbenchPreview[]; attempts: WorkbenchAttempt[]; shadows: WorkbenchShadow[] } {
  const previews: WorkbenchPreview[] = [], attempts: WorkbenchAttempt[] = [], shadows: WorkbenchShadow[] = [];
  for (const entry of entries) {
    const reference = hash(entry), p = entry.payload;
    if (p.kind === "preview") { if (previews.some(row => row.reference === p.data.reference)) throw new Error("Duplicate journal preview"); previews.push(p.data); }
    else if (p.kind === "attempt") { if (attempts.some(row => row.admission.operation === p.data.operation)) throw new Error("Duplicate inference operation"); attempts.push({ reference, admission: p.data, settlement: null, settlements: [] }); }
    else if (p.kind === "shadow") { if (shadows.some(row => row.operation === p.data.operation)) throw new Error("Duplicate shadow operation"); shadows.push({ ...p.data, reference }); }
    else {
      const attempt = attempts.find(row => row.reference === p.data.attempt);
      if (!attempt || (p.kind === "settlement" ? attempt.settlement !== null : attempt.settlement?.status !== "uncertain" || p.data.settlement.status !== "completed")) throw new Error("Settlement must close an admitted attempt or reconcile retained uncertainty");
      attempt.settlement = p.data.settlement;
      attempt.settlements.push({ reference, outcome: p.data.settlement, reconciled: p.kind === "reconciliation" });
    }
  }
  return { previews, attempts, shadows };
}
function reservedSlots(rows: ReturnType<typeof projection>): number {
  return rows.attempts.reduce((sum, row) => sum + (row.settlement === null ? 2 : row.settlement.status === "uncertain" ? 1 : 0), 0);
}
async function readAccounting(host: MarketingHost, reference: Digest) {
  const raw = await host.service.store.getValue(reference);
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw.schema !== "algal.inference-accounting.v1") throw new Error("Missing known inference accounting");
      const a = workbenchObject(raw, ["schema", "configurationDigest", "calls", "completedCalls", "reservedMicrousd", "inputTokens", "outputTokens", "costUsd", "billing", "stopped", "records"]);
      if (!Array.isArray(a.records) || a.records.length > 64 || a.costUsd !== null || a.billing !== "host-reserved" || typeof a.stopped !== "boolean") throw new Error("Invalid retained accounting");
      const values = a.records.map((value, i) => {
        const r = workbenchObject(value, ["sequence", "requestDigest", "status", "reservedMicrousd", "tokensIn", "tokensOut", "outputDigest"]);
        if (r.sequence !== i + 1 || !["reserved", "completed", "unknown"].includes(String(r.status)) || (r.status === "completed") !== (r.outputDigest !== null)) throw new Error("Invalid retained accounting record");
        workbenchRef(r.requestDigest); if (r.outputDigest !== null) workbenchRef(r.outputDigest);
        for (const field of ["reservedMicrousd", "tokensIn", "tokensOut"] as const) if (!(field !== "reservedMicrousd" && r[field] === null) && (!Number.isSafeInteger(r[field]) || (r[field] as number) < 0 || (r[field] as number) > 1_000_000_000)) throw new Error("Invalid accounting count");
        return r;
      });
      const total = (field: "tokensIn" | "tokensOut") => values.some(row => row[field] === null) ? null : values.reduce((sum, row) => sum + (row[field] as number), 0);
      const summary = { calls: values.length, completedCalls: values.filter(row => row.status === "completed").length, reservedMicrousd: values.reduce((sum, row) => sum + (row.reservedMicrousd as number), 0), inputTokens: total("tokensIn"), outputTokens: total("tokensOut") };
      if (Object.entries(summary).some(([key, value]) => a[key] !== value)) throw new Error("Retained accounting totals mismatch");
  return { usage: { accounting: reference, configuration: workbenchRef(a.configurationDigest), ...summary, billing: "host-reserved" as const }, records: values, stopped: a.stopped };
}
async function validateAttemptAdmission(host: MarketingHost, admission: AttemptAdmission): Promise<void> {
  const parent = await host.snapshot(admission.expectedHead), details = await host.memoryDetails(parent), manifest = await host.service.store.getManifest(admission.manifest);
  if (hash(details.controls) !== admission.expectedControls) throw new Error("Inference admission controls do not bind its captured head");
  if (details.controls.inferencePaused) throw new Error("Inference admission refers to paused controls");
  if (!manifest) throw new Error("Missing admitted inference manifest");
  const context = manifest.cells.find(cell => cell.id === "context"), agent = manifest.cells.find(cell => cell.id === "proposal");
  if (manifest.cells.length !== 2 || context?.kind !== "const" || agent?.kind !== "agent" || manifest.budgets.maxAgentCalls !== 1 || manifest.budgets.maxSteps > 4 || manifest.budgets.maxDepth > 4) throw new Error("Inference admission requires one bounded proposal agent and pure captured context");
  const value = context.outputs.value?.value;
  if (!value || typeof value !== "object" || Array.isArray(value) || hash(value.revision) !== hash(await host.revision(parent)) || hash(value.signals) !== hash(await host.signals(parent))) throw new Error("Inference manifest does not bind captured revision and signals");
}
async function validateSettlement(host: MarketingHost, attempt: WorkbenchAttempt, settlement: AttemptSettlement, prior?: AttemptSettlement): Promise<void> {
  const store = host.service.store;
  if (settlement.receipt && !await store.getReceipt(settlement.receipt)) throw new Error("Missing inference receipt");
  const accounting = settlement.accounting ? await readAccounting(host, settlement.accounting) : null;
  if (settlement.status === "failed" && accounting?.records.some(row => row.status === "reserved" || row.status === "unknown")) throw new Error("Unsettled accounting must remain uncertain, never failed");
  if (settlement.status !== "completed") return;
  if (!settlement.proposal || !settlement.receipt || !accounting) throw new Error("Incomplete settlement evidence");
  const parent = await host.snapshot(attempt.admission.expectedHead), revision = await host.revision(parent);
  if (settlement.proposal.source !== "model" || settlement.proposal.baseRevision !== hash(revision)) throw new Error("Attempt proposal does not bind admitted base");
  const { parseRunReceipt } = await import("../../src/run"), { manifestToJson } = await import("../../src/contract"), { verifyReceipt } = await import("../../src/verify");
  const receipt = parseRunReceipt(await store.getReceipt(settlement.receipt)), manifest = await store.getManifest(attempt.admission.manifest);
  if (!manifest || receipt.manifestDigest !== attempt.admission.manifest || receipt.outcome !== "complete" || Object.keys(receipt.args).length || receipt.effects.length !== 1 || !(await verifyReceipt(applicationJson(receipt), manifestToJson(manifest), store)).ok) throw new Error("Completed attempt receipt does not replay its admitted execution");
  const effect = receipt.effects[0]!, row = accounting.records[0];
  const admitted = attempt.admission;
  if (admitted.backend === "gateway" ? effect.executor !== `vercel:${admitted.model}` : admitted.backend === "local" ? !/^(?:reserved:)?openai:sha256:[a-f0-9]{64}$/.test(effect.executor) : effect.executor !== "apple:system") throw new Error("Completed receipt does not bind the admitted backend and model configuration");
  const expected = { ...settlement.proposal.config, rationale: settlement.proposal.rationale };
  if (!row || accounting.records.length !== 1 || accounting.usage.completedCalls !== 1 || accounting.stopped || row.status !== "completed" || effect.cached || effect.error || !effect.output || row.requestDigest !== effect.requestDigest || row.outputDigest !== hash(effect.output) || accounting.usage.configuration !== effect.configurationDigest || hash(effect.output) !== hash(expected) || hash(receipt.cells.proposal?.outputs?.out) !== hash(expected) || (effect.usage?.tokensIn ?? null) !== row.tokensIn || (effect.usage?.tokensOut ?? null) !== row.tokensOut) throw new Error("Completed receipt, proposal and accounting identities disagree");
  if (prior) {
    if (prior.status !== "uncertain" || !prior.accounting) throw new Error("Missing retained uncertain execution identity");
    const previous = await readAccounting(host, prior.accounting), before = previous.records[0];
    const sameObservedOutput = before?.status === "completed" && before.outputDigest === row.outputDigest && before.tokensIn === row.tokensIn && before.tokensOut === row.tokensOut;
    if (previous.records.length !== 1 || !before || !(sameObservedOutput || ["reserved", "unknown"].includes(String(before.status)) && before.outputDigest === null) || previous.usage.configuration !== accounting.usage.configuration || before.requestDigest !== row.requestDigest || before.sequence !== row.sequence || before.reservedMicrousd !== row.reservedMicrousd) throw new Error("Reconciliation changes the admitted uncertain execution identity");
  }
}
export class MarketingWorkbench {
  readonly directory: string;
  constructor(readonly host: MarketingHost, private readonly options: WorkbenchOptions = {}) { this.directory = join(host.directory, "marketing-workbench"); }
  private locked<T>(action: () => Promise<T>): Promise<T> { return hostLease(join(this.directory, "custody"), "marketing-workbench", action, SHARED_LEASE_RETRY); }
  private async readJournal(): Promise<{ entries: JournalEntry[]; legacy: boolean; prepared: boolean }> {
    for (let retry = 0; retry < 4; retry++) {
      const rawState = await hostRead(join(this.directory, "state.json"), 2048), state = rawState === undefined ? null : journalState(rawState);
      const anchor = await this.host.service.store.getValue(hash(JOURNAL_ANCHOR));
      if ((!state && anchor !== undefined) || state?.phase === "ready" && (anchor === undefined || hash(anchor) !== hash(JOURNAL_ANCHOR))) {
        if (hash(rawState ?? null) !== hash(await hostRead(join(this.directory, "state.json"), 2048) ?? null)) continue;
        throw new Error("Missing or changed journal checkpoint/anchor; retained evidence was not repaired");
      }
      const names = await hostNames(join(this.directory, "records"), WORKBENCH_LIMITS.journal, /^\d{3}\.json$/), entries: JournalEntry[] = [];
      const committed = state?.count ?? names.length;
      for (let sequence = 0; sequence < committed; sequence++) {
        const name = `${String(sequence).padStart(3, "0")}.json`, raw = await hostRead(join(this.directory, "records", name), WORKBENCH_LIMITS.recordBytes);
        if (raw === undefined) throw new Error("Missing committed journal record; retained evidence was not repaired");
        const entry = journalEntry(raw);
        if (entry.sequence !== sequence || entry.previous !== (entries.length ? hash(entries.at(-1)!) : null)) throw new Error("Journal chain changed");
        const retained = await getApplicationRecord(this.host.service.store, hash(entry), journalEntry);
        if (hash(retained) !== hash(entry)) throw new Error("Journal content record changed");
        entries.push(entry);
      }
      if (state && state.head !== (entries.length ? hash(entries.at(-1)!) : null)) throw new Error("Journal checkpoint does not bind retained prefix");
      if (state?.prepared) {
        const entry = await getApplicationRecord(this.host.service.store, state.prepared, journalEntry);
        if (entry.sequence !== entries.length || entry.previous !== state.head) throw new Error("Prepared journal append does not extend its checkpoint");
        const file = await hostRead(join(this.directory, "records", `${String(entry.sequence).padStart(3, "0")}.json`), WORKBENCH_LIMITS.recordBytes);
        if (file !== undefined && hash(file) !== state.prepared) throw new Error("Prepared journal publication conflicts");
        entries.push(entry);
      }
      const after = await hostRead(join(this.directory, "state.json"), 2048);
      if (hash(rawState ?? null) !== hash(after ?? null)) continue; // A concurrent append published a new immutable prefix.
      if (names.some(name => { const index = Number(name.slice(0, 3)); return index >= entries.length || name !== `${String(index).padStart(3, "0")}.json`; }) || names.length < committed) throw new Error("Journal sequence gap or unbound tail");
      projection(entries);
      return { entries, legacy: state === null || state.phase === "initializing", prepared: state?.prepared !== null && state?.prepared !== undefined };
    }
    throw new Error("Journal advanced during capture; recapture its retained prefix");
  }
  async journal(): Promise<JournalEntry[]> { return (await this.readJournal()).entries; }
  /** Finalize only explicitly prepared retained bytes. Missing committed data
   * never regenerates from CAS, and recovery never reruns external inference. */
  private async checkpoint(entries: JournalEntry[]): Promise<JournalState> {
    const path = join(this.directory, "state.json"), raw = await hostRead(path, 2048);
    let state = raw === undefined ? null : journalState(raw);
    if (!state) {
      if (await this.host.service.store.getValue(hash(JOURNAL_ANCHOR)) !== undefined) throw new Error("Missing retained journal checkpoint");
      state = { contract: "algal.marketing-journal-state.v1", phase: "initializing", count: entries.length, head: entries.length ? hash(entries.at(-1)!) : null, prepared: null };
      await hostWrite(path, applicationJson(state), 2048);
    }
    if (state.phase === "initializing") {
      await this.host.service.store.putValue(applicationJson(JOURNAL_ANCHOR));
      state = { ...state, phase: "ready" };
      await hostWrite(path, applicationJson(state), 2048, false);
    }
    if (state.prepared) {
      const entry = entries[state.count];
      if (!entry || hash(entry) !== state.prepared) throw new Error("Prepared journal evidence changed during recovery");
      // A prior process may have linked this exact prepared record but died
      // before syncing its directory. Republish and sync it before making the
      // checkpoint committed; an immutable same-bytes no-op is insufficient.
      await hostWrite(join(this.directory, "records", `${String(state.count).padStart(3, "0")}.json`), applicationJson(entry), WORKBENCH_LIMITS.recordBytes, false);
      state = { ...state, count: state.count + 1, head: state.prepared, prepared: null };
      await hostWrite(path, applicationJson(state), 2048, false);
    }
    if (state.count !== entries.length || state.head !== (entries.length ? hash(entries.at(-1)!) : null)) throw new Error("Journal checkpoint changed before append");
    return state;
  }
  private async append(entries: JournalEntry[], data: JournalPayload): Promise<Digest> {
    if (entries.length >= WORKBENCH_LIMITS.journal) throw new Error("Workbench journal bound exhausted; no retained evidence was pruned");

    const entry = journalEntry({ contract: "algal.marketing-journal.v1", sequence: entries.length, previous: entries.length ? hash(entries.at(-1)!) : null, payload: data });
    if (entries.length + 1 + reservedSlots(projection([...entries, entry])) > WORKBENCH_LIMITS.journal) throw new Error("Journal capacity is reserved for admitted settlement and reconciliation");
    const state = await this.checkpoint(entries), reference = await this.host.service.store.putValue(applicationJson(entry));
    await hostWrite(join(this.directory, "state.json"), applicationJson({ ...state, prepared: reference }), 2048, false);
    await this.options.fault?.("journal-prepared");
    await hostWrite(join(this.directory, "records", `${String(entries.length).padStart(3, "0")}.json`), applicationJson(entry), WORKBENCH_LIMITS.recordBytes);
    await this.options.fault?.("journal-record-published");
    await hostWrite(join(this.directory, "state.json"), applicationJson({ ...state, count: entries.length + 1, head: reference, prepared: null }), 2048, false);
    await this.options.fault?.("journal-committed");
    return reference;
  }
  private async admitModelPreview(preview: WorkbenchPreview, rows: ReturnType<typeof projection>): Promise<void> {
    if (preview.proposal.source !== "model") return;
    const attempt = rows.attempts.find(row => row.admission.expectedHead === preview.parentState && row.settlement?.status === "completed" && hash(row.settlement.proposal) === hash(preview.proposal));
    if (!attempt || !attempt.settlement) throw new Error("Model preview lacks an exact-head completed inference attempt");
    for (const [index, row] of attempt.settlements.entries()) await validateSettlement(this.host, attempt, row.outcome, row.reconciled ? attempt.settlements[index - 1]?.outcome : undefined);
    const shadow = rows.shadows.find(row => row.parentState === preview.parentState && row.accepted && hash(row.proposal) === hash(preview.proposal));
    if (!shadow) throw new Error("Model preview requires matching passing shadow evidence");
    const { verifyShadow } = await import("./shadow");
    const report = await verifyShadow(this.host, shadow.evidence);
    if (report.outcome !== "pass" || report.parentState !== preview.parentState || report.proposal !== hash(preview.proposal) || report.policy !== shadow.policy || report.candidateRevision !== preview.candidateRevision) throw new Error("Model preview shadow binding failed");
  }
  async capture(): Promise<WorkbenchCapture> {
    // Read application history exactly once. Every immutable part below is
    // derived from its terminal snapshot, even if another writer advances head.
    const history = await this.host.service.history(APPLICATION), snapshot = history.at(-1);
    if (!snapshot || history.length > WORKBENCH_LIMITS.states) throw new Error("Initialize a bounded surface first");
    const [revision, memory, journal] = await Promise.all([this.host.revision(snapshot), this.host.memoryDetails(snapshot), this.readJournal()]);
    const entries = journal.entries, rows = projection(entries), nodes: NodeExplanation[] = [], usage: WorkbenchUsage[] = [];
    // Journal dependencies must exist before a fresh pure render can produce
    // identical bytes. These checks do not re-read the application head.
    for (const preview of rows.previews) {
      const raw = await this.host.service.store.getReceipt(preview.receipt);
      if (!raw || hash(raw) !== preview.receipt) throw new Error("Missing retained preview receipt before capture");
    }
    for (const shadow of rows.shadows) if (shadow.accepted) {
      const { readRetainedShadow } = await import("./shadow"), { report } = await readRetainedShadow(this.host, shadow.evidence);
      if (report.parentState !== shadow.parentState || report.proposal !== hash(shadow.proposal) || report.policy !== shadow.policy || report.outcome !== "pass") throw new Error("Retained shadow binding failed before capture");
    }
    const rendered = await this.host.render(snapshot, history);
    for (const attempt of rows.attempts) if (attempt.settlement?.accounting) usage.push((await readAccounting(this.host, attempt.settlement.accounting)).usage);
    const visit = (node: SurfaceNode): void => {
      nodes.push({ node: node.id, revision: rendered.revision, signalFields: node.id === "audience" ? ["audience"] : node.id === "release" ? ["release"] : [], configFields: node.id === "headline" ? ["headline"] : node.id === "body" ? ["body"] : node.id === "cta" ? ["ctaLabel"] : node.id === "surface" ? ["layout"] : [], receipt: rendered.receipt });
      if (node.kind === "stack") node.children.forEach(visit);
    }; visit(rendered.view);
    const full = history.length >= WORKBENCH_LIMITS.states, journalFull = entries.length + reservedSlots(rows) + 1 > WORKBENCH_LIMITS.journal, pinned = memory.controls.pinnedRevision !== null;
    const available = (kind: WorkbenchCapture["actions"][number]["kind"], reason: string | null) => ({ kind, allowed: reason === null, reason });
    const candidate = rows.previews.some(preview => preview.parentState === snapshot.digest && (preview.proposal.source === "owner" || !memory.controls.modelActivationPaused && rows.attempts.some(row => row.admission.expectedHead === snapshot.digest && row.settlement?.status === "completed" && hash(row.settlement.proposal) === hash(preview.proposal)) && rows.shadows.some(row => row.parentState === snapshot.digest && row.accepted && hash(row.proposal) === hash(preview.proposal))));
    return parseWorkbenchCapture({ contract: "algal.marketing-capture.v1", application: APPLICATION, head: snapshot.digest, sequence: snapshot.state.sequence, revision, revisionDigest: rendered.revision, applicationRevision: snapshot.state.revision, signals: rendered.signals, view: rendered.view,
      provenance: { memory: snapshot.state.memory, receipt: rendered.receipt, cursors: memory.cursors, nodes }, controls: memory.controls, controlsRef: hash(memory.controls), history: history.map(row => ({ head: row.digest, sequence: row.state.sequence, kind: row.transition.kind, applicationRevision: row.state.revision, memory: row.state.memory, evidence: row.transition.evidence })), ...rows,
      observation: { journalEntries: entries.length, pendingAttempts: rows.attempts.filter(row => row.settlement === null).length, completedAttempts: rows.attempts.filter(row => row.settlement?.status === "completed").length, failedAttempts: rows.attempts.filter(row => row.settlement?.status === "failed").length, uncertainAttempts: rows.attempts.filter(row => row.settlement?.status === "uncertain").length, actualCostMicrousd: null, usage },
      actions: [available("preview", journalFull ? "Retained journal capacity exhausted" : null), available("activate", full ? "Retained state capacity exhausted" : pinned ? "Surface revision is pinned" : !candidate ? "No eligible exact-head preview with required execution and shadow evidence" : null), available("signal", full ? "Retained state capacity exhausted" : null), available("restore", full ? "Retained state capacity exhausted" : pinned ? "Surface revision is pinned" : null), available("set-controls", full ? "Retained state capacity exhausted" : null), available("infer", rows.attempts.some(row => !row.settlement || row.settlement.status === "uncertain") ? "Pending or uncertain inference requires reconciliation" : memory.controls.inferencePaused ? "New inference is paused; admitted settlement remains allowed" : entries.length + reservedSlots(rows) + 3 > WORKBENCH_LIMITS.journal ? "Journal cannot reserve admission, settlement and reconciliation" : null)],
      gaps: ["Identity is admitted by this trusted local host; source labels are not authentication credentials.", "Journal and provider observations can advance independently of this immutable application snapshot.", "Actual provider billing and marketing quality are unknown.", "Action hints use this captured state; execution replays candidate evidence and rechecks the authoritative head.", ...(journal.legacy ? ["Legacy journal has no durable deletion checkpoint; the next append seals its retained prefix."] : []), ...(journal.prepared ? ["A prepared journal append remains retained; the next write completes publication without rerunning inference."] : []), ...(memory.legacy ? ["Legacy memory has no ordered signal provenance; the first admitted envelope starts its stream at one."] : []), ...(rows.attempts.some(row => !row.settlement) ? ["Pending attempts may have crossed an external boundary; reconcile evidence, never automatically retry."] : [])],
    });
  }
  async execute(input: WorkbenchCommand | unknown): Promise<WorkbenchResult> {
    const command = parseWorkbenchCommand(input);
    return this.locked(async () => {
      const current = await this.host.current(), details = await this.host.memoryDetails(current);
      // Exact signal identity is durable across restarts and subsequent heads.
      if (command.kind === "signal" && command.operation !== signalOperation(command.envelope)) throw new Error("Signal operation must derive from source, stream and sequence");
      const duplicate = command.kind !== "preview" && (await this.host.service.history(APPLICATION)).find(row => row.transition.operation === command.operation);
      if (duplicate && command.kind !== "signal") {
        const original = await this.host.snapshot(command.expectedHead), priorControls = await this.host.memoryDetails(original);
        if (duplicate.state.previous !== command.expectedHead || hash(priorControls.controls) !== command.expectedControls) throw new Error("Operation retry changed its admitted head or controls");
      }
      if (!duplicate && (current.digest !== command.expectedHead || hash(details.controls) !== command.expectedControls)) throw new Error("Stale workbench head or controls");
      let preview: WorkbenchPreview | null = null;
      if (command.kind === "preview") {
        if (command.actor === "agent" && command.proposal.source !== "model") throw new Error("Agent preview must preserve model provenance");
        const entries = await this.journal();
        const existing = projection(entries).previews.find(row => row.parentState === command.expectedHead && hash(row.proposal) === hash(command.proposal));
        if (!existing && entries.length + reservedSlots(projection(entries)) + 1 > WORKBENCH_LIMITS.journal) throw new Error("Workbench journal capacity is reserved or exhausted");
        const p = existing ? await this.host.previewDetails(existing.reference) : await this.host.preview(command.expectedHead, command.proposal);
        preview = { reference: p.reference, parentState: p.record.parentState, proposal: command.proposal, candidateRevision: p.record.candidateRevision, receipt: p.record.receipt, view: p.view };
        if (existing) { if (hash(existing) !== hash(preview)) throw new Error("Retained preview differs from its evidence"); await this.checkpoint(entries); }
        else await this.append(entries, { kind: "preview", data: preview });
      } else if (command.kind === "activate") {
        const rows = projection(await this.journal()), candidate = rows.previews.find(row => row.reference === command.preview);
        if (!candidate || candidate.parentState !== command.expectedHead) throw new Error("Unknown or stale workbench preview");
        if (command.actor === "agent" && candidate.proposal.source !== "model") throw new Error("Agent cannot relabel an owner preview");
        await this.admitModelPreview(candidate, rows);
        await this.host.activate(command.preview, command.operation);
      } else if (command.kind === "signal") await this.host.signalEnvelope(command.expectedHead, command.envelope);
      else if (command.kind === "restore") await this.host.restore(command.expectedHead, command.targetState, command.operation);
      else {
        if (command.actor !== "human") throw new Error("Only the owner can change controls");
        await this.host.setControls(command.expectedHead, command.expectedControls, command.controls, command.operation);
      }
      return { capture: await this.capture(), preview };
    });
  }
  async beginAttempt(input: AttemptAdmission): Promise<Digest> {
    const admission = parseAttemptAdmission(input);
    return this.locked(async () => {
      const entries = await this.journal(), rows = projection(entries), current = await this.host.current(), details = await this.host.memoryDetails(current);
      if (rows.attempts.some(row => row.admission.operation === admission.operation)) throw new Error("Inference operation already admitted; reconcile without retry");
      if (current.digest !== admission.expectedHead || hash(details.controls) !== admission.expectedControls) throw new Error("Stale inference head or controls");
      if (details.controls.inferencePaused) throw new Error("New inference is paused");
      await validateAttemptAdmission(this.host, admission);
      if (rows.attempts.some(row => !row.settlement || row.settlement.status === "uncertain")) throw new Error("Pending or uncertain inference requires reconciliation; new calls are blocked");
      // Reserve both an uncertain settlement and its later reconciliation.
      // Other observations cannot consume those slots (enforced by append).
      if (entries.length + reservedSlots(rows) + 3 > WORKBENCH_LIMITS.journal) throw new Error("Journal cannot reserve admission, settlement and reconciliation");
      return this.append(entries, { kind: "attempt", data: admission });
    });
  }
  async finishAttempt(reference: Digest, input: AttemptSettlement): Promise<void> {
    const settlement = parseAttemptSettlement(input); workbenchRef(reference);
    await this.locked(async () => {
      const entries = await this.journal(), attempt = projection(entries).attempts.find(row => row.reference === reference);
      if (!attempt) throw new Error("Unknown admitted inference attempt");
      if (attempt.settlement) {
        if (hash(attempt.settlement) !== hash(settlement)) throw new Error("Attempt settlement conflicts with retained outcome");
        for (const [index, row] of attempt.settlements.entries()) await validateSettlement(this.host, attempt, row.outcome, row.reconciled ? attempt.settlements[index - 1]?.outcome : undefined);
        await this.checkpoint(entries); return;
      }
      await validateSettlement(this.host, attempt, settlement);
      await this.append(entries, { kind: "settlement", data: { attempt: reference, settlement } });
    });
  }
  async reconcileAttempt(reference: Digest, input: AttemptSettlement): Promise<void> {
    const settlement = parseAttemptSettlement(input); workbenchRef(reference);
    if (settlement.status !== "completed") throw new Error("Reconciliation requires completed evidence, never a resend");
    await this.locked(async () => {
      const entries = await this.journal(), attempt = projection(entries).attempts.find(row => row.reference === reference);
      if (!attempt) throw new Error("Unknown admitted inference attempt");
      if (attempt.settlements.at(-1)?.reconciled) {
        if (hash(attempt.settlement) !== hash(settlement)) throw new Error("Reconciliation conflicts");
        for (const [index, row] of attempt.settlements.entries()) await validateSettlement(this.host, attempt, row.outcome, row.reconciled ? attempt.settlements[index - 1]?.outcome : undefined);
        await this.checkpoint(entries); return;
      }
      if (attempt.settlement?.status !== "uncertain" || !attempt.settlement.accounting) throw new Error("Reconciliation requires retained uncertain accounting identity");
      await validateSettlement(this.host, attempt, settlement, attempt.settlement);
      await this.append(entries, { kind: "reconciliation", data: { attempt: reference, settlement } });
    });
  }
  async recordShadow(input: ShadowRecord): Promise<Digest> {
    const shadow = parseShadowRecord(input);
    return this.locked(async () => {
      const entries = await this.journal(), existing = projection(entries).shadows.find(row => row.operation === shadow.operation);
      if (existing) { const { reference: _reference, ...retained } = existing; if (hash(retained) !== hash(shadow)) throw new Error("Shadow operation conflicts"); }
      const parent = await this.host.snapshot(shadow.parentState);
      if (shadow.proposal.baseRevision !== hash(await this.host.revision(parent))) throw new Error("Shadow proposal base mismatch");
      if (!await this.host.service.store.getValue(shadow.policy) || !await this.host.service.store.getValue(shadow.evidence)) throw new Error("Missing shadow policy/evidence");
      if (shadow.accepted) {
        const { verifyShadow } = await import("./shadow"), report = await verifyShadow(this.host, shadow.evidence);
        if (report.outcome !== "pass" || report.parentState !== shadow.parentState || report.policy !== shadow.policy || report.proposal !== hash(shadow.proposal)) throw new Error("Accepted shadow observation does not bind passing independent evidence");
      }
      if (existing) { await this.checkpoint(entries); return existing.reference; }
      return this.append(entries, { kind: "shadow", data: shadow });
    });
  }
}

export type WorkbenchEvidence = { contract: "algal.marketing-workbench-evidence.v1"; claim: "content-integrity-and-pure-replay"; surface: SurfaceEvidence; journal: JournalEntry[]; records: { kind: "value" | "receipt" | "manifest"; reference: Digest; value: unknown }[] };
/** Operational observations are retained alongside the application export.
 * They never grant external dispatch authority or establish provider billing. */
export async function exportWorkbenchEvidence(workbench: MarketingWorkbench): Promise<WorkbenchEvidence> {
  const surface = await exportEvidence(workbench.host), journal = await workbench.journal(), store = workbench.host.service.store;
  const seen = new Set(surface.records.map(row => row.reference)), pending: Digest[] = [], records: WorkbenchEvidence["records"] = [];
  const scan = (value: unknown): void => { if (typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value)) pending.push(value as Digest); else if (value && typeof value === "object") Object.values(value).forEach(scan); };
  scan(journal); journal.forEach(entry => pending.push(hash(entry)));
  while (pending.length) {
    const reference = pending.pop()!; if (seen.has(reference)) continue; seen.add(reference);
    if (seen.size > 4096) throw new Error("Workbench evidence reference bound exceeded");
    let value: unknown = await store.getValue(reference), kind: WorkbenchEvidence["records"][number]["kind"] = "value";
    if (value === undefined) { value = await store.getReceipt(reference); kind = "receipt"; }
    if (value === undefined) { const manifest = await store.getManifest(reference); if (manifest) { const { manifestToJson } = await import("../../src/contract"); value = manifestToJson(manifest); } kind = "manifest"; }
    if (value === undefined) continue;
    records.push({ kind, reference, value }); scan(value);
    if (records.length > 1024) throw new Error("Workbench evidence record bound exceeded");
  }
  const evidence: WorkbenchEvidence = { contract: "algal.marketing-workbench-evidence.v1", claim: "content-integrity-and-pure-replay", surface, journal, records: records.sort((a, b) => a.reference.localeCompare(b.reference)) };
  boundWorkbench(evidence, 8_388_608); return evidence;
}
export async function verifyWorkbenchEvidence(input: unknown, expectedHead: Digest): Promise<{ ok: true; head: Digest; journalEntries: number; claim: string }> {
  boundWorkbench(input, 8_388_608);
  const v = workbenchObject(input, ["contract", "claim", "surface", "journal", "records"]);
  if (v.contract !== "algal.marketing-workbench-evidence.v1" || v.claim !== "content-integrity-and-pure-replay" || !Array.isArray(v.journal) || v.journal.length > WORKBENCH_LIMITS.journal || !Array.isArray(v.records) || v.records.length > 1024) throw new Error("Invalid workbench evidence");
  await verifyEvidence(v.surface, expectedHead);
  const directory = await mkdtemp(join(tmpdir(), "algal-workbench-verify-"));
  try {
    const host = new MarketingHost(directory), store = host.service.store, seen = new Set<Digest>();
    const { parseOrganismManifest, manifestToJson } = await import("../../src/contract"), { parseRunReceipt } = await import("../../src/run"), { verifyReceipt } = await import("../../src/verify");
    const surface = v.surface as SurfaceEvidence;
    for (const raw of [...surface.records, ...v.records]) {
      const row = workbenchObject(raw, ["kind", "reference", "value"]), reference = workbenchRef(row.reference);
      if (seen.has(reference) || hash(row.value) !== reference) throw new Error("Duplicate or tampered workbench evidence"); seen.add(reference);
      if (row.kind === "value") await store.putValue(applicationJson(row.value));
      else if (row.kind === "receipt") { parseRunReceipt(row.value); await store.putReceipt(applicationJson(row.value)); }
      else if (row.kind === "manifest") await store.putManifest(parseOrganismManifest(row.value));
      else throw new Error("Invalid workbench evidence record kind");
    }
    for (const reference of surface.states) {
      const state = await getApplicationRecord(store, reference, parseApplicationState), transition = await getApplicationRecord(store, state.transition, parseApplicationTransition);
      const replayed = await host.service.commit({ application: transition.application, operation: transition.operation, kind: transition.kind, expectedHead: transition.previous, revision: transition.revision, memory: transition.memory, intents: [], evidence: transition.evidence, causedBy: transition.causedBy });
      if (replayed.digest !== reference) throw new Error("Workbench application replay mismatch");
    }
    const entries = v.journal.map(journalEntry);
    for (const [index, entry] of entries.entries()) {
      if (entry.sequence !== index || entry.previous !== (index ? hash(entries[index - 1]) : null)) throw new Error("Journal chain changed");
      if (!seen.has(hash(entry))) throw new Error("Missing journal content record");
    }
    const projected = projection(entries);
    for (const preview of projected.previews) {
      const raw = await store.getValue(preview.reference);
      if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw.parentState !== preview.parentState || raw.candidateRevision !== preview.candidateRevision || raw.receipt !== preview.receipt || raw.proposal !== hash(preview.proposal) || !surface.states.includes(preview.parentState)) throw new Error("Preview journal binding failed");
      parseProposal(await store.getValue(hash(preview.proposal)));
      const admitted = await host.previewDetails(preview.reference);
      if (hash(admitted.view) !== hash(preview.view) || hash(admitted.proposal) !== hash(preview.proposal)) throw new Error("Preview journal view/proposal mismatch");
    }
    for (const attempt of projected.attempts) {
      if (!surface.states.includes(attempt.admission.expectedHead)) throw new Error("Attempt refers to an unknown application head");
      await validateAttemptAdmission(host, attempt.admission);
      if (attempt.settlement?.receipt && !seen.has(attempt.settlement.receipt)) throw new Error("Missing attempt receipt");
      if (attempt.settlement?.accounting && !seen.has(attempt.settlement.accounting)) throw new Error("Missing attempt accounting");
      for (const [index, row] of attempt.settlements.entries()) await validateSettlement(host, attempt, row.outcome, row.reconciled ? attempt.settlements[index - 1]?.outcome : undefined);
    }
    for (const shadow of projected.shadows) {
      if (!surface.states.includes(shadow.parentState) || !seen.has(shadow.policy) || !seen.has(shadow.evidence)) throw new Error("Missing shadow binding/evidence");
      if (shadow.accepted) {
        const { verifyShadow } = await import("./shadow"), report = await verifyShadow(host, shadow.evidence);
        if (report.outcome !== "pass" || report.parentState !== shadow.parentState || report.policy !== shadow.policy || report.proposal !== hash(shadow.proposal)) throw new Error("Accepted shadow evidence does not replay");
      }
    }
    for (const raw of v.records) {
      const row = raw as WorkbenchEvidence["records"][number]; if (row.kind !== "receipt") continue;
      const receipt = parseRunReceipt(row.value), manifest = await store.getManifest(receipt.manifestDigest);
      if (!manifest || !(await verifyReceipt(applicationJson(row.value), manifestToJson(manifest), store)).ok) throw new Error("Workbench receipt replay failed");
    }
    return { ok: true, head: expectedHead, journalEntries: entries.length, claim: "content-integrity-and-pure-replay; not authorship, billing, quality or filesystem custody" };
  } finally { await rm(directory, { recursive: true, force: true }); }
}
