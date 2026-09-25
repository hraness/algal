import { productDigest, productJson } from "./product";
/** Independent bounded history checker. Production callbacks do not supply verdicts. */
import { dirname } from "node:path";
import { hashBytes, stableJson } from "../lib/files";
import { requireThat } from "../lib/schema";
import { parseTrace, type Action, type Command, type History, type ObservationTarget, type Outcome, type Snapshot, type Step, type Target, type Trace, type Value } from "./schema";
import { MEMORY, MISSING, RECORD, appName, authority, boxName, compareText, inventory, keyDigest, slotName } from "./shared";

export class TraceMismatch extends Error {
  constructor(readonly property: string, readonly step: number, detail: string) { super(`${property} at step ${step}: ${detail}`); this.name = "TraceMismatch"; }
}
const same = (a: unknown, b: unknown): boolean => stableJson(a) === stableJson(b);
function check(test: unknown, property: string, step: number, detail: string): asserts test { if (!test) throw new TraceMismatch(property, step, detail); }
function object(v: Value): Record<string, Value> { requireThat(v !== null && typeof v === "object" && !Array.isArray(v), "expected observed object"); return v; }
export function observation(snapshot: Snapshot, target: ObservationTarget): Outcome {
  const o = snapshot.observations.find(o => same(o.target, target)); requireThat(o !== undefined, "missing observation target"); return o.outcome;
}
function file(snapshot: Snapshot, target: Target) { const f = snapshot.files.find(f => same(f.target, target)); requireThat(f !== undefined, "missing file observation"); return f; }
function get(snapshot: Snapshot, target: ObservationTarget): Value | undefined {
  const o = observation(snapshot, target); if (o.status === "error") return undefined;
  const v = object(o.value); return v.found === true ? v.value! : undefined;
}
function semantic(outcome: Outcome): unknown { return outcome.status === "ok" ? outcome : { status: "error", code: outcome.code, wake: outcome.wake, uncertain: outcome.uncertain }; }
function expectValue(row: Step, expected: Value): void { check(row.outcome.status === "ok" && same(row.outcome.value, expected), "api-result", row.id, `expected ${stableJson(expected)}, got ${stableJson(semantic(row.outcome))}`); }
function expectError(row: Step, code: string, wake: string[] = []): void { check(row.outcome.status === "error" && row.outcome.code === code && same(row.outcome.wake, wake), "api-rejection", row.id, `expected ${code}, got ${stableJson(semantic(row.outcome))}`); }
function targetOf(a: Action): Target | undefined {
  if (a.kind === "store-put" || a.kind === "store-get") return { kind: "value", value: a.value };
  if (a.kind === "effect-put" || a.kind === "effect-get") return { kind: "effect", key: a.key };
  if (a.kind === "slot-set" || a.kind === "slot-get") return { kind: "slot", key: a.key };
  return undefined;
}
export function semanticSnapshot(snapshot: Snapshot): unknown {
  return { observations: snapshot.observations.map(o => ({ target: o.target, outcome: semantic(o.outcome) })), files: snapshot.files };
}
export type Abstraction = { step: number; classification: "transition" | "stutter" | "rejection" | "uncertain"; possibleStates: ("pre" | "observed-post" | "partial")[]; reason: string };

/** Closed namespace of this fixture, not a catch-all filesystem stutter. */
function pathClass(path: string): "directory" | "file" | "temporary" | "mailbox-lock" | "external" | null {
  if (/^@ancestor\/[1-9]\d{0,2}$/.test(path)) return "external";
  if (path === "." || /^(?:values|effects|slots|capabilities|mailboxes|applications|\.application-quota|\.mailbox-admission)$/.test(path)
    || /^mailboxes\/trace-box-[01](?:\/(?:messages|pending|consumed))?$/.test(path)
    || /^applications\/(?:\.creation(?:\/pending(?:\/trace-app-[01])?)?|trace-app-[01](?:\/operations)?)$/.test(path)) return "directory";
  if (/\/\.temp-(?:0|[1-9]\d*)$/.test(path) && pathClass(dirname(path)) === "directory") return "temporary";
  if (/^mailboxes\/trace-box-[01]\/\.lock$/.test(path)) return "mailbox-lock";
  if (/^(?:values|effects|capabilities)\/[a-f0-9]{64}\.json$/.test(path)
    || /^slots\/trace-slot-[0-3]\.json$/.test(path)
    || /^mailboxes\/trace-box-[01]\/(?:config\.json|(?:messages|pending|consumed)\/[a-f0-9]{64}\.json)$/.test(path)
    || /^applications\/trace-app-[01]\/(?:head\.json|operations\/[a-f0-9]{64}\.json)$/.test(path)
    || /^\.application-quota\/ledger\.json$/.test(path)
    || /^(?:\.application-quota|\.mailbox-admission|applications\/\.creation(?:\/pending\/trace-app-[01])?|applications\/trace-app-[01])\/\.lock$/.test(path)) return "file";
  return null;
}
function checkPathEvent(event: Extract<Step["events"][number], { kind: "fs" }>, step: number): void {
  const kind = pathClass(event.path), target = event.target === null ? null : pathClass(event.target);
  check(kind !== null, "event-domain", step, `outside-model managed path ${event.path}`);
  const valid = event.step === "dir-sync" ? kind === "directory" || kind === "external"
    : event.step === "mkdir" ? kind === "directory"
    : event.step === "write-temp" || event.step === "unlink-temp" ? kind === "temporary"
    : event.step === "file-sync" ? kind === "temporary" || kind === "file" || kind === "mailbox-lock"
    : event.step === "link" || event.step === "replace" ? kind === "temporary" && target === "file"
    : event.step === "unlink-pending" ? /^mailboxes\/trace-box-[01]\/pending\/[a-f0-9]{64}\.json$/.test(event.path)
    : event.step === "unlink-lock" ? kind === "mailbox-lock" || kind === "file" && event.path.endsWith("/.lock") : kind === "mailbox-lock";
  check(valid && ((event.step === "link" || event.step === "replace") === (event.target !== null)), "event-domain", step, `checkpoint does not map to an admitted path/action: ${stableJson(event)}`);
}

function checkSnapshot(snapshot: Snapshot, history: History, step: number): void {
  const expected = inventory(history);
  check(same(snapshot.observations.map(o => o.target), expected.observations) && same(snapshot.files.map(o => o.target), expected.files), "observation-population", step, "snapshot must cover each governed target exactly once in canonical order");
  for (const f of snapshot.files) {
    const o = observation(snapshot, f.target);
    if (o.status !== "ok") { check(f.exists, "read-file-coherence", step, "reader error over absent fixture file"); continue; }
    const v = object(o.value);
    check(typeof v.found === "boolean" && Object.keys(v).length === 2 && Object.hasOwn(v, "value"), "read-file-coherence", step, "reader must separate missing from JSON null");
    check(v.found === f.exists, "read-file-coherence", step, "reader/file existence differs");
    if (f.exists) check(hashBytes(productJson(v.value!)) === f.sha256 && Buffer.byteLength(productJson(v.value!)) === f.bytes, "read-file-coherence", step, "cold reader does not describe retained canonical bytes");
    else check(v.value === null, "read-file-coherence", step, "missing reader has a value");
    if (f.target.kind === "value" && v.found) check(productDigest(v.value!) === productDigest(f.target.value), "cas-binding", step, "CAS reader returned another digest's value");
  }
  for (const app of [0, 1] as const) {
    const history = observation(snapshot, { kind: "application-history", app });
    if (history.status !== "ok") continue; // A corrupt dependency is an explicit error, not a fabricated history.
    check(Array.isArray(history.value), "application-history-shape", step, "history is not an array");
    const operations = new Set<string>(), digests = new Set<string>();
    for (const [index, item] of history.value.entries()) {
      const row = object(item);
      check(row.sequence === index && row.previous === (index === 0 ? null : object(history.value[index - 1]!).digest)
        && typeof row.digest === "string" && /^sha256:[a-f0-9]{64}$/.test(row.digest)
        && typeof row.operation === "string" && /^sha256:[a-f0-9]{64}$/.test(row.operation)
        && !digests.has(row.digest) && !operations.has(row.operation), "application-history-chain", step, "history has a repeated identity or invalid predecessor/sequence");
      operations.add(row.operation); digests.add(row.digest);
    }
    const head = observation(snapshot, { kind: "application-head", app });
    check(head.status === "ok", "application-head-history-binding", step, "readable history has an unreadable selected head");
    const selected = object(head.value);
    if (selected.found === false) check(history.value.length === 0, "application-head-history-binding", step, "absent head selected a history");
    else {
      const pointer = object(selected.value!);
      check(pointer.contract === "algal.application-head.v1" && pointer.application === appName(app)
        && history.value.length > 0 && pointer.state === object(history.value.at(-1)!).digest, "application-head-history-binding", step, "cold selected head differs from history tail");
    }
  }
}

function checkInitial(snapshot: Snapshot): void {
  for (const o of snapshot.observations) {
    const target = o.target;
    const seeded = target.kind === "application-memory" ? MEMORY[target.memory]
      : target.kind === "value" ? [RECORD, ...MEMORY].find(v => same(v, target.value)) : undefined;
    const expected = target.kind === "application-history" ? [] : { found: seeded !== undefined, value: seeded ?? null };
    check(o.outcome.status === "ok" && same(o.outcome.value, expected), "initial-bootstrap", -1, "fresh fixture bootstrap differs from its independently specified state");
  }
}

function targetPath(target: Target): string {
  if (target.kind === "value") return `values/${productDigest(target.value).slice(7)}.json`;
  if (target.kind === "application-memory") return `values/${productDigest(MEMORY[target.memory]!).slice(7)}.json`;
  if (target.kind === "effect") return `effects/${productDigest({ contract: "algal.effect-cache.v1", executor: "trace.v1", requestDigest: keyDigest(target.key) }).slice(7)}.json`;
  if (target.kind === "slot") return `slots/${slotName(target.key)}.json`;
  if (target.kind === "application-head") return `applications/${appName(target.app)}/head.json`;
  if (target.kind === "mailbox-lock") return `mailboxes/${boxName(target.box)}/.lock`;
  check("box" in target && "key" in target, "target-domain", -1, "unmapped logical target");
  return `mailboxes/${boxName(target.box)}/${target.kind === "mailbox-message" ? "messages" : target.kind.slice("mailbox-".length)}/${keyDigest(target.key).slice(7)}.json`;
}

/** Presence is required as well as conditional ordering. An erased successful
 * publication trace cannot pass merely because no remaining link violates fsync. */
function checkPositiveWitnesses(command: Command, row: Step, before: Snapshot, after: Snapshot, trace: Trace): void {
  const a = command.action;
  if (row.outcome.status !== "ok" || a.kind === "tamper" || a.kind === "restart") return;
  function event(step: Extract<Step["events"][number], { kind: "fs" }>["step"], path: string, afterIndex = -1): number {
    const index = row.events.findIndex((e, index) => index > afterIndex && e.kind === "fs" && e.phase === "after" && e.step === step && (step === "link" || step === "replace" ? e.target : e.path) === path);
    check(index >= 0, "positive-io-witness", row.id, `successful ${a.kind} lacks ${step} for ${path}`); return index;
  }
  function retain(path: string): number {
    const synced = event("file-sync", path);
    for (let parent = dirname(path);; parent = dirname(parent)) { event("dir-sync", parent, synced); if (parent === ".") break; }
    return synced;
  }
  for (const f of after.files) {
    const old = file(before, f.target);
    if (same(f, old)) continue;
    const path = targetPath(f.target);
    if (!f.exists) { check(f.target.kind === "mailbox-pending", "positive-io-witness", row.id, "unexpected successful deletion"); event("unlink-pending", path); }
    else event(f.target.kind === "application-head" || f.target.kind === "slot" ? "replace" : "link", path);
  }
  const target = targetOf(a);
  if (target && (a.kind === "store-put" || a.kind === "effect-put") && file(before, target).exists) retain(targetPath(target));
  if (a.kind === "slot-set") event("replace", targetPath({ kind: "slot", key: a.key }));
  const capabilityPath = (box: 0 | 1, right: "send" | "receive"): string => {
    const bound = trace.authorities.find(a => a.alias === authority(box, right));
    check(bound !== undefined, "authority-binding", row.id, "successful mailbox operation has no actual authority binding");
    return `capabilities/${bound.handle.slice(-64)}.json`;
  };
  if (a.kind === "mailbox-create") {
    const existing = get(before, { kind: "mailbox-config", box: a.box }) !== undefined;
    for (const path of [capabilityPath(a.box, "send"), capabilityPath(a.box, "receive"), `mailboxes/${boxName(a.box)}/config.json`]) {
      if (existing) retain(path); else event("link", path);
    }
  } else if ("box" in a) {
    const lock = `mailboxes/${boxName(a.box)}/.lock`, acquired = event("create-lock", lock);
    const released = event("unlink-lock", lock, acquired); event("dir-sync", dirname(lock), released);
    if (a.kind === "mailbox-revoke") event("replace", capabilityPath(a.box, a.right));
    if (a.kind === "mailbox-send") {
      const mt: Target = { kind: "mailbox-message", box: a.box, key: a.key };
      if (file(before, mt).exists) retain(targetPath(mt));
      for (const kind of ["mailbox-pending", "mailbox-consumed"] as const) {
        const marker: Target = { kind, box: a.box, key: a.key }; if (file(before, marker).exists) retain(targetPath(marker));
      }
    }
    if (a.kind === "mailbox-receive") {
      const removed = before.files.find(f => f.target.kind === "mailbox-pending" && f.target.box === a.box && f.exists && !file(after, f.target).exists);
      check(removed?.target.kind === "mailbox-pending", "positive-io-witness", row.id, "receive lacks a concrete removed pending marker");
      const pending = targetPath(removed.target), consumed = targetPath({ ...removed.target, kind: "mailbox-consumed" });
      const published = event("link", consumed), durable = event("dir-sync", dirname(consumed), published);
      event("unlink-pending", pending, durable);
    }
  }
  if (a.kind === "application-create" || a.kind === "application-commit") {
    check(row.events.some(e => e.kind === "application" && e.point === "selected"), "positive-application-witness", row.id, "successful application operation lacks selection checkpoint");
    // These are marker publication observations, not a proof of SQLite lease
    // ownership or native OwnerLease::Drop's ignored cleanup errors.
    event("link", `applications/.creation/pending/${appName(a.app)}/.lock`);
    event("link", `applications/${appName(a.app)}/.lock`);
    if (!same(file(before, { kind: "application-head", app: a.app }), file(after, { kind: "application-head", app: a.app })))
      for (const point of ["admitted", "prepared", "head-published"]) check(row.events.some(e => e.kind === "application" && e.point === point), "positive-application-witness", row.id, `successful application publication lacks ${point}`);
  }
}

function checkEvents(command: Command, row: Step): { mutating: boolean } {
  const pending = new Map<string, number>(), synced = new Set<string>(), directories = new Set<string>(), dirtyDirectories = new Set<string>(), locks = new Set<string>();
  let mutating = false, matchedFault = false, occurrence = 0;
  const appOrder = ["selected", "admitted", "prepared", "head-published"];
  let previousApp = -1;
  for (const event of row.events) {
    if (event.kind === "application") {
      check(command.action.kind === "application-create" || command.action.kind === "application-commit", "event-domain", row.id, "application checkpoint on another API");
      const index = appOrder.indexOf(event.point);
      check(index > previousApp, "application-checkpoint-order", row.id, "application checkpoints repeated/reordered"); previousApp = index;
      if (command.fault?.site === "application" && command.fault.point === event.point) matchedFault = true;
      continue;
    }
    const { step, phase, path, target, inode } = event;
    checkPathEvent(event, row.id);
    if (command.fault?.site === "fs" && command.fault.step === step && command.fault.phase === phase && ++occurrence === command.fault.occurrence) matchedFault = true;
    const id = stableJson({ step, path, target, inode });
    if (phase === "before") { pending.set(id, (pending.get(id) ?? 0) + 1); continue; }
    check((pending.get(id) ?? 0) > 0, "checkpoint-pair", row.id, "after event lacks matching actual before event"); pending.set(id, pending.get(id)! - 1);
    // Even unchanged visible content can have a changed durable image after
    // mkdir/fsync. Ancestors above the declared anchor are explicit stutters.
    if (!path.startsWith("@ancestor/")) mutating = true;
    if (step === "file-sync") { check(inode !== null, "sync-inode", row.id, "file sync lacks opened inode identity"); synced.add(path); }
    if (step === "dir-sync") { check(inode !== null, "sync-inode", row.id, "directory sync lacks opened inode identity"); directories.add(path); dirtyDirectories.delete(path); }
    if (step === "write-temp") {
      mutating = true; check(path.includes(".temp-"), "temp-identity", row.id, "unrecognized publication temporary");
      for (let parent = dirname(path);; parent = dirname(parent)) {
        check(directories.has(parent), "publication-ancestor-barrier", row.id, `fresh write lacks prior qualification of ${parent}`);
        if (parent === ".") break;
      }
    }
    if (step === "link" || step === "replace") {
      check(target !== null && synced.has(path), "publication-file-barrier", row.id, "publication lacks preceding sync of its written temporary");
      dirtyDirectories.add(dirname(target)); mutating = true;
    }
    if (step === "unlink-pending" || step === "unlink-lock") { dirtyDirectories.add(dirname(path)); mutating = true; if (step === "unlink-lock") locks.delete(path); }
    if (step === "create-lock") { locks.add(path); mutating = true; }
  }
  check(row.faultTriggered === (command.fault !== null) && matchedFault === row.faultTriggered, "fault-reachability", row.id, "required fault was not witnessed at its exact checkpoint");
  if (row.faultTriggered) check(row.outcome.status === "error", "fault-return", row.id, "injected failure produced a public acknowledgment");
  if (row.outcome.status === "ok") {
    check(dirtyDirectories.size === 0, "ack-directory-barrier", row.id, "public return lacks destination/deletion directory sync");
    check(locks.size === 0, "ack-lock-release", row.id, "public return retains acquired mailbox lock");
  }
  return { mutating };
}

function unchangedExcept(before: Snapshot, after: Snapshot, allowed: Target[], step: number): void {
  for (const prior of before.files) if (!allowed.some(t => same(t, prior.target))) check(same(prior, file(after, prior.target)), "unrelated-state-preserved", step, `changed ${stableJson(prior.target)}`);
}
/** For this bounded filesystem-fault domain, the first parent-directory sync
 * enters the publication helper after the public operation's mutation marker.
 * Retained reads may sync too, so distinguish fresh publication from exact retry
 * using independently observed prior claim/marker state. No raw error flag is an
 * oracle for whether a message transferred. */
function mailboxMutationAttempted(action: Action, row: Step, before: Snapshot): boolean {
  let parent: string | undefined;
  if (action.kind === "mailbox-revoke") parent = "capabilities";
  if (action.kind === "mailbox-receive") parent = `mailboxes/${boxName(action.box)}/consumed`;
  if (action.kind === "mailbox-send") {
    const box = action.box, key = action.key;
    if (!file(before, { kind: "mailbox-message", box, key }).exists) parent = `mailboxes/${boxName(box)}/messages`;
    else if (!file(before, { kind: "mailbox-pending", box, key }).exists && !file(before, { kind: "mailbox-consumed", box, key }).exists)
      parent = `mailboxes/${boxName(box)}/pending`;
  }
  return parent !== undefined && row.events.some(event => event.kind === "fs" && event.step === "dir-sync" && event.phase === "before" && event.path === parent);
}
/** Necessary constraints on injected failure histories. These do not enumerate
 * every allowed intermediate filesystem state or prove durable survival. */
function checkFault(command: Command, row: Step, before: Snapshot, after: Snapshot, trace: Trace): void {
  const a = command.action, fault = command.fault!;
  expectError(row, "IO_FAILED");
  if (fault.site === "application") {
    check(row.outcome.status === "error" && row.outcome.uncertain === (fault.point === "head-published"), "fault-api-uncertainty", row.id, "application checkpoint uncertainty was rewritten");
  } else if (!(a.kind === "application-create" || a.kind === "application-commit")) {
    check(row.outcome.status === "error" && row.outcome.uncertain === mailboxMutationAttempted(a, row, before), "fault-api-uncertainty", row.id, "injected error differs from its modeled mutation-attempt boundary");
  }
  const allowed: Target[] = [], target = targetOf(a);
  if (target && (a.kind === "store-put" || a.kind === "effect-put" || a.kind === "slot-set")) allowed.push(target);
  if (a.kind === "application-create" || a.kind === "application-commit") allowed.push({ kind: "application-head", app: a.app });
  if ("box" in a) {
    allowed.push({ kind: "mailbox-lock", box: a.box });
    if (a.kind === "mailbox-send") allowed.push({ kind: "mailbox-message", box: a.box, key: a.key }, { kind: "mailbox-pending", box: a.box, key: a.key });
    if (a.kind === "mailbox-receive") for (const key of [0, 1, 2, 3] as const) allowed.push({ kind: "mailbox-pending", box: a.box, key }, { kind: "mailbox-consumed", box: a.box, key });
  }
  unchangedExcept(before, after, allowed, row.id);
  for (const o of before.observations) {
    const t = o.target;
    if (t.kind === "application-history" && !("app" in a && a.app === t.app)
      || t.kind === "mailbox-config" && !(a.kind === "mailbox-create" && a.box === t.box))
      check(same(semantic(o.outcome), semantic(observation(after, t))), "fault-unrelated-observation", row.id, "failure changed an unrelated history/config");
  }
  if (target && (a.kind === "store-put" || a.kind === "effect-put" || a.kind === "slot-set")) {
    const published = get(after, target), old = get(before, target);
    const candidate = a.kind === "effect-put" ? old ?? { requestDigest: keyDigest(a.key), executor: "trace.v1", output: a.value } : a.value;
    check(same(observation(before, target), observation(after, target)) || published !== undefined && same(published, candidate), "fault-publication-candidates", row.id, "failed publication retained neither the prior nor admitted candidate");
  }
  if ((a.kind === "application-create" || a.kind === "application-commit") && fault.site === "application") {
    const old = observation(before, { kind: "application-history", app: a.app }), next = observation(after, { kind: "application-history", app: a.app });
    if (fault.point !== "head-published") {
      check(same(semantic(old), semantic(next)) && same(file(before, { kind: "application-head", app: a.app }), file(after, { kind: "application-head", app: a.app })), "fault-prepublication-head", row.id, "prepublication failure changed committed application state");
    } else {
      check(old.status === "ok" && next.status === "ok" && Array.isArray(old.value) && Array.isArray(next.value), "fault-published-history", row.id, "published application head cannot be read");
      const head = a.kind === "application-create" || a.head === null ? null : a.head === "missing" ? MISSING : object((trace.steps[a.head]!.outcome as { value: Value }).value).digest!;
      const last = object(next.value.at(-1)!);
      check(next.value.length === old.value.length + 1 && same(next.value.slice(0, -1), old.value)
        && last.previous === head && last.sequence === old.value.length && last.operation === keyDigest(a.key)
        && last.memory === (a.memory === "missing" ? MISSING : productDigest(MEMORY[a.memory]!)), "fault-published-history", row.id, "uncertain post-publication state is not the requested single successor");
    }
  }
}
function mailboxExpected(a: Extract<Action, { box: number }>, row: Step, before: Snapshot, after: Snapshot, revoked: Set<string>): Target[] {
  const box = a.box;
  if (a.kind === "mailbox-create") {
    const config = get(before, { kind: "mailbox-config", box });
    if (config !== undefined && object(config).capacity !== a.capacity) { expectError(row, "PARSE_FAILED"); return []; }
    expectValue(row, { name: boxName(box), capacity: a.capacity, send: authority(box, "send"), receive: authority(box, "receive") });
    check(same(get(after, { kind: "mailbox-config", box }), row.outcome.status === "ok" ? row.outcome.value : null), "mailbox-config-published", row.id, "returned config is not independently visible"); return [];
  }
  const right = a.kind === "mailbox-send" ? "send" : a.kind === "mailbox-revoke" ? a.right : "receive";
  if (revoked.has(authority(box, right))) { expectError(row, "CAPABILITY_DENIED"); return []; }
  if (file(before, { kind: "mailbox-lock", box }).exists) { expectError(row, "IO_FAILED"); return []; }
  if (a.kind === "mailbox-revoke") { expectValue(row, null); revoked.add(authority(box, a.right)); return []; }
  const pending = ([0, 1, 2, 3] as const).filter(key => file(before, { kind: "mailbox-pending", box, key }).exists).sort((a, b) => compareText(keyDigest(a), keyDigest(b)));
  const markerError = (key: 0 | 1 | 2 | 3): string | null => {
    for (const kind of ["mailbox-pending", "mailbox-consumed"] as const) { const o = observation(before, { kind, box, key }); if (o.status === "error") return o.code; }
    return get(before, { kind: "mailbox-pending", box, key }) !== undefined && get(before, { kind: "mailbox-consumed", box, key }) !== undefined ? "IO_FAILED" : null;
  };
  if (a.kind === "mailbox-send") {
    const mt: Target = { kind: "mailbox-message", box, key: a.key }, pt: Target = { kind: "mailbox-pending", box, key: a.key };
    const old = observation(before, mt);
    if (old.status === "error") { expectError(row, old.code); return []; }
    const id = productDigest({ contract: "algal.mailbox-message.v1", mailbox: boxName(box), idempotencyKey: keyDigest(a.key), value: a.value });
    const message = get(before, mt);
    if (message !== undefined && object(message).id !== id) { expectError(row, "DIGEST_MISMATCH"); return []; }
    const error = markerError(a.key); if (error) { expectError(row, error); return []; }
    const consumed = get(before, { kind: "mailbox-consumed", box, key: a.key });
    if (message === undefined && (get(before, pt) !== undefined || consumed !== undefined)) { expectError(row, "DIGEST_MISMATCH"); return []; }
    const config = object(get(before, { kind: "mailbox-config", box })!);
    if (get(before, pt) === undefined && consumed === undefined && pending.length >= Number(config.capacity)) { expectError(row, "MAILBOX_FULL"); return []; }
    expectValue(row, { id });
    check(same(get(after, mt), { contract: "algal.mailbox-message.v1", id, mailbox: boxName(box), idempotencyKey: keyDigest(a.key), value: a.value }), "mailbox-message-binding", row.id, "send did not retain exact immutable message");
    check(get(after, pt) !== undefined || consumed !== undefined, "mailbox-send-marker", row.id, "acknowledged send has no retained delivery evidence"); return [mt, pt];
  }
  for (const key of pending) { const error = markerError(key); if (error) { expectError(row, error); return []; } }
  if (a.kind === "mailbox-pending") { expectValue(row, pending.length > 0); return []; }
  if (pending.length === 0) { expectError(row, "EFFECT_SUSPENDED", [authority(box, "receive")]); return []; }
  const key = pending[0]!, messageTarget: Target = { kind: "mailbox-message", box, key };
  const observed = observation(before, messageTarget);
  if (observed.status === "error") { expectError(row, observed.code); return []; }
  const message = get(before, messageTarget);
  if (message === undefined) { expectError(row, "PARSE_FAILED"); return []; }
  const m = object(message);
  expectValue(row, { id: m.id!, message: m.value! });
  const pt: Target = { kind: "mailbox-pending", box, key }, ct: Target = { kind: "mailbox-consumed", box, key };
  check(!file(after, pt).exists && same(get(after, ct), { contract: "algal.mailbox-delivery.v1", id: m.id! }), "mailbox-transfer", row.id, "receive must retain consumed evidence and remove pending");
  check(row.events.some(e => e.kind === "fs" && e.phase === "after" && e.step === "unlink-pending"), "mailbox-transfer-witness", row.id, "receive lacks actual pending deletion witness");
  return [pt, ct];
}

function applicationExpected(a: Extract<Action, { app: number }>, row: Step, before: Snapshot, after: Snapshot, trace: Trace, requests: Map<string, string>): Target[] {
  const target: ObservationTarget = { kind: "application-history", app: a.app }, prior = observation(before, target), next = observation(after, target);
  if (prior.status === "error") { expectError(row, prior.code); return []; }
  requireThat(Array.isArray(prior.value), "application history array");
  if (a.kind === "application-inspect") { expectValue(row, prior.value.at(-1) ?? null); return []; }
  const previous = prior.value.at(-1) ?? null;
  const head = a.kind === "application-create" || a.head === null ? null : a.head === "missing" ? MISSING : object((trace.steps[a.head]!.outcome as { status: "ok"; value: Value }).value).digest!;
  const memory = a.memory === "missing" ? MISSING : productDigest(MEMORY[a.memory]!);
  const request = stableJson({ kind: a.kind, head, memory }), requestKey = `${a.app}:${a.key}`;
  const retained = prior.value.find(v => object(v).operation === keyDigest(a.key));
  if (retained !== undefined) {
    if (requests.get(requestKey) === request) expectValue(row, retained); else expectError(row, "RECEIPT_MISMATCH"); return [];
  }
  if ((previous === null ? null : object(previous).digest) !== head) { expectError(row, "RECEIPT_MISMATCH"); return []; }
  if (a.memory === "missing") { expectError(row, "PARSE_FAILED"); return []; }
  const memoryRead = observation(before, { kind: "application-memory", memory: a.memory });
  if (memoryRead.status === "error") { expectError(row, memoryRead.code); return []; }
  if (object(memoryRead.value).found === false) { expectError(row, "PARSE_FAILED"); return []; }
  check(row.outcome.status === "ok" && next.status === "ok" && Array.isArray(next.value), "application-return", row.id, "valid bounded commit failed");
  const value = object(row.outcome.value);
  check(value.previous === head && value.sequence === prior.value.length && value.operation === keyDigest(a.key) && value.memory === memory, "application-successor", row.id, "commit returned wrong predecessor/sequence/identity/memory");
  check(same(next.value, [...prior.value, row.outcome.value]), "application-history-append", row.id, "committed history is not exactly one extension");
  requests.set(requestKey, request); return [{ kind: "application-head", app: a.app }];
}

export function checkTrace(history: History, raw: unknown): { trace: Trace; abstractions: Abstraction[]; witnesses: string[] } {
  const trace = parseTrace(raw, history), abstractions: Abstraction[] = [], witnesses = new Set<string>(), revoked = new Set<string>(), requests = new Map<string, string>();
  for (const a of trace.authorities) check(new RegExp(`^cap:mailbox-${a.alias.endsWith(":send") ? "send" : "receive"}:sha256:[a-f0-9]{64}$`).test(a.handle), "authority-class", -1, "authority alias widened or malformed");
  checkSnapshot(trace.initial, history, -1);
  checkInitial(trace.initial);
  for (const command of history.commands) {
    const row = trace.steps[command.id]!, before = command.id === 0 ? trace.initial : trace.steps[command.id - 1]!.after, after = row.after, a = command.action;
    checkSnapshot(after, history, row.id);
    const { mutating } = checkEvents(command, row);
    const changed = !same(semanticSnapshot(before), semanticSnapshot(after));
    if (command.fault) {
      checkFault(command, row, before, after, trace);
      // A real syscall failure can have effects even without an after marker.
      // The independently observed post-state is retained; no atomic rollback
      // or durable survival is inferred from an error or unchanged projection.
      const partial = mutating || row.outcome.status === "error" && row.outcome.uncertain || changed;
      abstractions.push({ step: row.id, classification: partial ? "uncertain" : "rejection", possibleStates: partial ? ["pre", "observed-post", "partial"] : ["pre"], reason: `injected-${command.fault.mode}-cut-${command.fault.site}` });
      witnesses.add(`injected-${command.fault.mode}-cut:${command.fault.site}`);
      witnesses.add(command.fault.site === "application" ? `cut:application:${command.fault.point}` : `cut:fs:${command.fault.step}:${command.fault.phase}`);
      if (a.kind === "application-create" || a.kind === "application-commit") {
        const historyAfter = observation(after, { kind: "application-history", app: a.app });
        if (historyAfter.status === "ok" && Array.isArray(historyAfter.value) && historyAfter.value.some(v => object(v).operation === keyDigest(a.key))) {
          const head = a.kind === "application-create" || a.head === null ? null : a.head === "missing" ? MISSING : object((trace.steps[a.head]!.outcome as { value: Value }).value).digest!;
          requests.set(`${a.app}:${a.key}`, stableJson({ kind: a.kind, head, memory: a.memory === "missing" ? MISSING : productDigest(MEMORY[a.memory]!) }));
        }
      }
      continue;
    }
    // Every ordinary rejection in this bounded command domain is definite.
    // Unexpected host failures remain outside this model rather than being
    // classified as rejection while silently discarding API uncertainty.
    check(row.outcome.status !== "error" || !row.outcome.uncertain, "nonfault-api-uncertainty", row.id, "modeled ordinary rejection acquired an invented API uncertainty flag");
    let allowed: Target[] = [];
    const target = targetOf(a);
    if (target) {
      const prior = observation(before, target);
      if (a.kind === "store-get" || a.kind === "effect-get" || a.kind === "slot-get") check(same(semantic(row.outcome), semantic(prior)), "read-after-state-change", row.id, "public command differs from independent pre-state reader");
      else if (a.kind === "slot-set") { expectValue(row, null); check(same(get(after, target), a.value), "slot-last-write", row.id, "slot did not select the requested value"); allowed = [target]; }
      else if (prior.status === "error") expectError(row, prior.code);
      else if (a.kind === "store-put" || a.kind === "effect-put") {
        expectValue(row, a.kind === "store-put" ? productDigest(a.value) : keyDigest(a.key));
        const old = get(before, target), expected = a.kind === "store-put" ? a.value : old ?? { requestDigest: keyDigest(a.key), executor: "trace.v1", output: a.value };
        check(same(get(after, target), expected), a.kind === "store-put" ? "cas-retained-value" : "effect-first-wins", row.id, "publication changed or omitted its admitted winner"); allowed = [target];
      }
    } else if ("box" in a) allowed = mailboxExpected(a, row, before, after, revoked);
    else if ("app" in a) allowed = applicationExpected(a, row, before, after, trace, requests);
    else if (a.kind === "restart") expectValue(row, null);
    else if (a.kind === "tamper") {
      expectValue(row, null); allowed = [a.target];
      const observed = file(after, a.target);
      check(a.mode === "remove" ? !observed.exists : observed.exists && observed.bytes === 7 && observed.sha256 === hashBytes("{broken"), "tamper-observed", row.id, "requested fixture tamper did not happen");
    }
    unchangedExcept(before, after, allowed, row.id);
    checkPositiveWitnesses(command, row, before, after, trace);
    const classification = row.outcome.status === "error" ? "rejection" : changed ? "transition" : "stutter";
    const reason = classification !== "stutter" ? a.kind : a.kind === "restart" ? "reopen-same-visible-state"
      : a.kind.endsWith("-get") || a.kind === "mailbox-pending" || a.kind === "application-inspect" ? "observed-read"
      : a.kind === "store-put" || a.kind === "effect-put" ? "retained-immutable-winner"
      : a.kind === "application-create" || a.kind === "application-commit" ? "retained-operation-retry"
      : a.kind === "tamper" ? "already-absent-fixture-target" : "same-visible-projection-with-validated-io";
    abstractions.push({ step: row.id, classification, possibleStates: changed ? ["observed-post"] : ["pre"], reason });
    witnesses.add(a.kind); witnesses.add(classification);
    if (row.outcome.status === "error") witnesses.add(`error:${row.outcome.code}`);
  }
  return { trace, abstractions, witnesses: [...witnesses].sort(compareText) };
}

/** Exact portable observation comparison, with diagnostics explicitly excluded. */
export function compareTraces(history: History, left: unknown, right: unknown): { left: ReturnType<typeof checkTrace>; right: ReturnType<typeof checkTrace> } {
  const admittedLeft = checkTrace(history, left), admittedRight = checkTrace(history, right);
  const l = admittedLeft.trace, r = admittedRight.trace;
  check(l.runtime !== r.runtime, "runtime-independence", -1, "two reports from one runtime cannot establish parity");
  check(same(semanticSnapshot(l.initial), semanticSnapshot(r.initial)), "runtime-initial-state", -1, "bootstrap differs");
  for (let i = 0; i < l.steps.length; i++) {
    check(same(semantic(l.steps[i]!.outcome), semantic(r.steps[i]!.outcome)), "runtime-result-parity", i, "actual public results differ");
    check(same(semanticSnapshot(l.steps[i]!.after), semanticSnapshot(r.steps[i]!.after)), "runtime-state-parity", i, "cold persisted observations differ");
  }
  return { left: admittedLeft, right: admittedRight };
}
