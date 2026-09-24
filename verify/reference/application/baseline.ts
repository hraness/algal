/** Only the explicit post-mutation check may produce shrink's semantic mismatch. */
export async function requireBaseline<T>(admit: () => Promise<T>): Promise<T> {
    try { return await admit(); }
    catch (cause) { throw new Error("History baseline admission failed before projection mutation", { cause }); }
}
