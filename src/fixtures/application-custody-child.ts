import { join } from "node:path";
import { ApplicationService } from "../application";
import { custodyControl, readCustodyJson, writeCustodyJson, type CustodyActor, type CustodyPhase } from "./application-custody";

const [directory, actorText, token] = process.argv.slice(2);
if (!directory || !actorText || !["creator", "late", "live"].includes(actorText) || !token || !/^[a-f0-9]{48}$/.test(token)) throw new Error("Invalid custody child parameters");
const actor = actorText as CustodyActor;
async function pause(phase: CustodyPhase) {
  await writeCustodyJson(custodyControl(directory!, actor, phase), { token: token!, actor, phase, pid: process.pid });
  const deadline = performance.now() + 30_000;
  for (;;) {
    try {
      const value = await readCustodyJson(custodyControl(directory!, actor, `${phase}.release`));
      if (JSON.stringify(value) !== JSON.stringify({ actor, phase, token })) throw new Error("Invalid custody release");
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    }
    if (performance.now() >= deadline) throw new Error("Custody child barrier timed out");
    await Bun.sleep(5);
  }
}
const service = new ApplicationService(directory, {
  async admitCommit() { if (actor === "live") await pause("admitted"); },
}, { custodySelected: async () => { if (actor === "late") await pause("selected"); } });
const scenario = await readCustodyJson(join(directory, "custody-control", "scenario.json"));
if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) throw new Error("Invalid custody scenario");
try {
  const snapshot = await service.commit(scenario[actor]);
  await writeCustodyJson(custodyControl(directory, actor, "result"), { token, actor, pid: process.pid, ok: true, digest: snapshot.digest, previous: snapshot.state.previous, sequence: snapshot.state.sequence });
} catch (error) {
  await writeCustodyJson(custodyControl(directory, actor, "result"), { token, actor, pid: process.pid, ok: false, message: String(error instanceof Error ? error.message : error).slice(0, 1024) });
}
