import { stableJson } from "../lib/files";
import { TraceMismatch } from "./check";
import { parseHistory, type History, type Value } from "./schema";

function remove(history: History, start: number, size: number): History | null {
  const removed = new Set(Array.from({ length: size }, (_, n) => start + n));
  for (const command of history.commands) if (command.action.kind === "application-commit" && typeof command.action.head === "number" && removed.has(command.action.head)) removed.add(command.id);
  const retained = history.commands.filter(c => !removed.has(c.id)); if (!retained.length) return null;
  const ids = new Map(retained.map((c, i) => [c.id, i]));
  const commands = retained.map((c, id) => ({ ...structuredClone(c), id, action: c.action.kind === "application-commit" && typeof c.action.head === "number" ? { ...c.action, head: ids.get(c.action.head)! } : c.action }));
  return parseHistory({ ...history, commands });
}
function simpler(value: Value): Value[] {
  if (value === null) return [];
  if (typeof value === "boolean") return [null, false];
  if (typeof value === "number") return [null, 0];
  if (typeof value === "string") return [null, "", Array.from(value).slice(0, Math.floor(Array.from(value).length / 2)).join("")];
  if (Array.isArray(value)) return [null, [], value.slice(0, Math.floor(value.length / 2))];
  return [null, {}, Object.fromEntries(Object.entries(value).slice(0, 1))];
}
export type ShrinkResult = { history: History; property: string; attempts: number; originalCommands: number; finalCommands: number };

/** Only the same named semantic mismatch qualifies. Tool/parse/timeout errors
 * and unresolved references cannot turn an invalid candidate into a shrink. */
export async function shrinkHistory(history: History, reproduce: (history: History) => Promise<void>, maxAttempts = 64): Promise<ShrinkResult> {
  let property: string;
  try { await reproduce(history); throw new Error("history does not reproduce a semantic mismatch"); }
  catch (error) { if (!(error instanceof TraceMismatch)) throw error; property = error.property; }
  let best = history, attempts = 0;
  const accept = async (candidate: History | null): Promise<boolean> => {
    if (!candidate || attempts >= maxAttempts || stableJson(candidate) === stableJson(best)) return false;
    attempts++;
    try { await reproduce(candidate); return false; }
    catch (error) { if (!(error instanceof TraceMismatch) || error.property !== property) return false; best = candidate; return true; }
  };
  for (let size = Math.max(1, Math.floor(best.commands.length / 2)); size >= 1 && attempts < maxAttempts; size = Math.floor(size / 2)) {
    for (let start = 0; start < best.commands.length && attempts < maxAttempts;) {
      if (!await accept(remove(best, start, size))) start++;
    }
  }
  for (let i = 0; i < best.commands.length && attempts < maxAttempts; i++) {
    const action = best.commands[i]!.action;
    if ("value" in action) for (const value of simpler(action.value)) {
      const candidate = structuredClone(best); (candidate.commands[i]!.action as { value: Value }).value = value;
      if (await accept(parseHistory(candidate))) break;
    }
    const fault = best.commands[i]!.fault;
    if (fault?.site === "fs" && fault.occurrence > 1) { const candidate = structuredClone(best); (candidate.commands[i]!.fault as typeof fault).occurrence = 1; await accept(candidate); }
  }
  // Reconfirm the selected result in a fresh replay, not merely a cached test.
  let confirmed = false;
  try { await reproduce(best); } catch (error) { if (error instanceof TraceMismatch && error.property === property) confirmed = true; else throw error; }
  if (!confirmed) throw new Error("shrunk semantic failure did not reproduce");
  return { history: best, property, attempts, originalCommands: history.commands.length, finalCommands: best.commands.length };
}
