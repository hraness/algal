import { HistoryMismatch } from "./oracle";
import { InvalidHistory, parseHistory, stableJson, type Action, type History } from "./schema";
export type ShrinkResult = {
    history: History;
    property: string;
    signature: string;
    attempts: number;
    originalCommands: number;
    finalCommands: number;
};
export function remove(history: History, start: number, size: number): History | null {
    const removed = new Set(Array.from({ length: size }, (_, i) => start + i));
    // Ascending IDs make dependency removal transitive in this single pass.
    for (const c of history.commands) {
        const a = c.action;
        const ref = a.kind === "commit" ? a.head : a.kind === "repeat" || a.kind === "reconcile" ? a.source : null;
        if (ref !== null && removed.has(ref))
            removed.add(c.id);
    }
    const kept = history.commands.filter(c => !removed.has(c.id));
    if (!kept.length)
        return null;
    const ids = new Map(kept.map((c, id) => [c.id, id]));
    const commands = kept.map((c, id) => { const a = structuredClone(c.action); if (a.kind === "commit")
        a.head = ids.get(a.head)!; if (a.kind === "repeat" || a.kind === "reconcile")
        a.source = ids.get(a.source)!; return { id, action: a }; });
    return parseHistory({ ...history, commands });
}
export async function shrink(history: History, reproduce: (history: History) => Promise<void>, maxAttempts = 48): Promise<ShrinkResult> {
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 64)
        throw new Error("Shrink attempts must be an integer in 1..64");
    parseHistory(history);
    let property: string, signature: string, firstStep: number;
    try {
        await reproduce(history);
        throw new Error("No semantic failure to shrink");
    }
    catch (e) {
        if (!(e instanceof HistoryMismatch))
            throw e;
        property = e.property;
        signature = e.signature;
        firstStep = e.step;
        if (!Number.isSafeInteger(firstStep) || firstStep < 0 || firstStep >= history.commands.length)
            throw new Error("Semantic mismatch step is outside history");
    }
    let best = history, attempts = 0;
    const accept = async (candidate: History | null) => { if (!candidate || attempts >= maxAttempts || stableJson(candidate) === stableJson(best))
        return false; attempts++; try {
        await reproduce(candidate);
        return false;
    }
    catch (e) {
        if (e instanceof InvalidHistory)
            return false;
        if (!(e instanceof HistoryMismatch))
            throw e;
        if (e.property !== property || e.signature !== signature)
            return false;
        best = candidate;
        return true;
    } };
    // Find the causal prefix before deleting commands or reducing choices.
    await accept(parseHistory({ ...history, commands: history.commands.slice(0, firstStep + 1) }));
    for (let size = Math.max(1, Math.floor(best.commands.length / 2)); size >= 1 && attempts < maxAttempts; size = Math.floor(size / 2)) {
        for (let start = 0; start < best.commands.length && attempts < maxAttempts;) {
            if (!await accept(remove(best, start, size)))
                start++;
        }
    }
    for (let i = 0; i < best.commands.length && attempts < maxAttempts; i++) {
        const a = best.commands[i]!.action;
        const alternatives: Action[] = [];
        if (a.kind === "scan" && a.batch === 2)
            alternatives.push({ ...a, batch: 1 });
        if ((a.kind === "create" || a.kind === "commit") && a.memory === 1)
            alternatives.push({ ...a, memory: 0 });
        if (a.kind === "scan" && a.configuration === 1)
            alternatives.push({ ...a, configuration: 0 });
        for (const action of alternatives) {
            const candidate = structuredClone(best);
            candidate.commands[i]!.action = action;
            if (await accept(parseHistory(candidate)))
                break;
        }
    }
    let confirmed = false;
    try {
        await reproduce(best);
    }
    catch (e) {
        if (!(e instanceof HistoryMismatch) || e.property !== property || e.signature !== signature)
            throw e;
        confirmed = true;
    }
    if (!confirmed)
        throw new Error("Minimized semantic failure did not replay");
    return { history: best, property, signature, attempts, originalCommands: history.commands.length, finalCommands: best.commands.length };
}
