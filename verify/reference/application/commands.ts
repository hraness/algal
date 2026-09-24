/** Pure evidence admission. This module never invokes a target. */
import { hashBytes } from "../../lib/files";
import { record, requireThat } from "../../lib/schema";
import { jsonSize, LIMITS, utf8Size } from "./bounded";
import { checkGenerated, requireCoverage } from "./generate";
import { checkTrace } from "./oracle";
import { parseHistory, parseTrace, stableJson, type History, type Trace } from "./schema";

export function requireCommandArgv(value: unknown, label: string): void {
  requireThat(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype && value.length > 0 && value.length <= 64, `history ${label} argv count`);
  requireThat(Reflect.ownKeys(value).length === value.length + 1, `history ${label} closed argv array`);
  for (let index = 0; index < value.length; index++) {
    const item = Object.getOwnPropertyDescriptor(value, String(index));
    requireThat(item && Object.hasOwn(item, "value") && item.enumerable, `history ${label} dense own argv data`);
    const argument: unknown = item.value;
    requireThat(typeof argument === "string" && argument.length > 0 && argument.length <= 4096 && !argument.includes("\0") && utf8Size(argument) <= 4096, `history ${label} argv argument`);
  }
}
export function admitCommand(raw: unknown, argv: readonly string[], outputCapacity: number): string {
  requireCommandArgv(argv, "expected");
  const value = record(raw, ["command", "exitCode", "signal", "timedOut", "outputExceeded", "cleanupObserved", "stdout", "stderr"], "history command");
  requireCommandArgv(value.command, "recorded");
  requireThat(stableJson(value.command) === stableJson(argv), "history exact command argv");
  requireThat(value.exitCode === 0 && value.signal === null && value.timedOut === false && value.outputExceeded === false && value.cleanupObserved === true, "history command status/custody");
  requireThat(Number.isSafeInteger(outputCapacity) && outputCapacity > 0 && outputCapacity <= LIMITS.outputBytes, "history command capture capacity");
  requireThat(typeof value.stdout === "string" && value.stderr === "" && utf8Size(value.stdout) <= outputCapacity, "history command output/diagnostics");
  return value.stdout;
}
function frame(stdout: string, keys: string[]): Record<string, unknown> {
  const raw: unknown = JSON.parse(stdout); jsonSize(raw, LIMITS.outputBytes);
  const value = record(raw, keys, "history worker header");
  requireThat(JSON.stringify(value) + "\n" === stdout, "history worker exact one-line stdout"); return value;
}
export function admitNative(history: History, raw: unknown, stdout: string, traceBytes: number): Trace {
  const input = stableJson(history) + "\n";
  const header = frame(stdout, ["contract", "historyInputSha256", "historyInputBytes", "commands", "traceBytes"]);
  requireThat(stableJson(header) === stableJson({ contract: "algal.native-history-worker.v1", historyInputSha256: hashBytes(input), historyInputBytes: utf8Size(input), commands: history.commands.length, traceBytes }), "native exact input/output identity");
  const trace = parseTrace(raw, history);
  requireThat(trace.runtime === "native", "native runtime identity"); checkTrace(history, trace); return trace;
}
export function admitBun(raw: unknown, stdout: string, selected: { mode: "generate"; profile: History["profile"]; seed: number } | { mode: "replay"; history: History }): { history: History; trace: Trace; witnesses: string[] } {
  const packet = record(raw, ["history", "trace", "witnesses"], "Bun history packet");
  const history = parseHistory(packet.history), trace = parseTrace(packet.trace, history);
  requireThat(trace.runtime === "bun", "Bun runtime identity");
  const { witnesses } = checkTrace(history, trace);
  requireThat(stableJson(packet.witnesses) === stableJson(witnesses), "Bun recomputed witnesses");
  const expected = selected.mode === "generate"
    ? { mode: selected.mode, seed: selected.seed, profile: selected.profile, commands: history.commands.length, witnesses: witnesses.length }
    : { mode: selected.mode, commands: history.commands.length, witnesses: witnesses.length };
  requireThat(stableJson(frame(stdout, Object.keys(expected))) === stableJson(expected), "Bun worker header correspondence");
  if (selected.mode === "generate") {
    requireThat(history.profile === selected.profile && history.seed === selected.seed && history.commands.length === LIMITS.historyCommands, "generated matrix identity");
    requireCoverage(witnesses, history.profile);
  } else requireThat(stableJson(history) === stableJson(selected.history), "authorized replay history");
  checkGenerated(history, trace); return { history, trace, witnesses };
}
export function sharedProjection(trace: Trace): unknown {
  return { fixtures: trace.fixtures, initial: trace.initial, steps: trace.steps.map(row => ({ id: row.id, callbacks: row.callbacks, after: row.after })) };
}
export function requireSharedAgreement(traces: readonly Trace[]): void {
  requireThat(traces.length === 4, "four-runtime-observation matrix");
  const first = stableJson(sharedProjection(traces[0]!));
  for (const trace of traces.slice(1)) requireThat(stableJson(sharedProjection(trace)) === first, "runtime physical observations/callbacks differ");
  requireThat(stableJson(traces[0]) === stableJson(traces[1]), "Bun fresh-root replay differs");
  requireThat(stableJson(traces[2]) === stableJson(traces[3]), "native fresh-root replay differs");
}
