import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BunHistoryDriver } from "./bun";
import { checkTrace } from "./oracle";
import { retainFailure } from "./retention";
import { encodeRecord, LIMITS } from "./bounded";
import { Generator, checkGenerated, requireCoverage } from "./generate";
import { parseHistory, parseTrace, type History, type Trace } from "./schema";
export async function generate(seed: number, profile: History["profile"], root: string): Promise<{
    history: History;
    trace: Trace;
    witnesses: string[];
}> {
    const history: History = { contract: "algal.application-history.v1", generator: "state-selected-v1", seed, profile, commands: [] };
    let driver: BunHistoryDriver | undefined;
    try {
        driver = await BunHistoryDriver.create(root);
        const generator = new Generator(seed, profile);
        let state = await driver.observe();
        for (let id = 0; id < 24; id++) {
            const command = generator.next(id, state, driver.fixtures.memories);
            history.commands.push(command);
            const row = await driver.step(command);
            generator.observe(command, row);
            state = row.after;
            checkTrace(history, driver.finish(history));
        }
        parseHistory(history);
        const trace = parseTrace(driver.finish(history), history), { witnesses } = checkTrace(history, trace);
        checkGenerated(history, trace);
        requireCoverage(witnesses, profile);
        return { history, trace, witnesses };
    }
    catch (error) {
        const primary = new Error(`Generated history failed; retained ${root}`, { cause: error });
        return await retainFailure(primary, [
            () => writeFile(join(root, "failure-history.json"), encodeRecord(history, LIMITS.historyBytes), { flag: "wx" }),
            ...driver ? [() => writeFile(join(root, "failure-trace.json"), encodeRecord(driver!.finish(history), LIMITS.packetBytes), { flag: "wx" })] : [],
        ]);
    }
}
