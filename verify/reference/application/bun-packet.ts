/** Closed correspondence check for a supervised Bun worker's two output channels. */
import { record, requireThat } from "../../lib/schema";
import { checkTrace } from "./oracle";
import { parseHistory, parseTrace, stableJson, type History, type Trace } from "./schema";
export function admitBunPacket(history: History, packet: unknown, stdout: string, mode: "replay" | "replay-direct"): Trace {
    const value = record(packet, ["history", "trace", "witnesses"], "Bun worker packet");
    requireThat(stableJson(parseHistory(value.history)) === stableJson(history), "Bun packet authorized history differs");
    const trace = parseTrace(value.trace, history);
    requireThat(trace.runtime === "bun", "Bun packet runtime identity");
    const { witnesses } = checkTrace(history, trace);
    requireThat(stableJson(value.witnesses) === stableJson(witnesses), "Bun packet recomputed witnesses differ");
    const header = record(JSON.parse(stdout), ["mode", "commands", "witnesses"], "Bun worker header");
    requireThat(JSON.stringify(header) + "\n" === stdout, "Bun header one-line framing");
    requireThat(stableJson(header) === stableJson({ mode, commands: history.commands.length, witnesses: witnesses.length }), "Bun header correspondence differs");
    return trace;
}
