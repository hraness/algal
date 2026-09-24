/** Evidence IO must never replace the failure that made retention necessary. */
export async function retainFailure(primary: unknown, writers: readonly (() => Promise<unknown>)[]): Promise<never> {
    const secondary: unknown[] = [];
    for (const write of writers) {
        try { await write(); } catch (error) { secondary.push(error); }
    }
    if (secondary.length) throw new AggregateError([primary, ...secondary], "Primary failure and evidence retention failed", { cause: primary });
    throw primary;
}
