/** Fixed owned-root worker, invoked only by the existing bounded supervisor. */
import { writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute } from "node:path";
import { readFileBounded } from "../../lib/files";
import { requireThat } from "../../lib/schema";
import { parseCanonical } from "./archive";
import { encodeRecord, LIMITS } from "./bounded";
import { replay } from "./bun";
import { checkGenerated } from "./generate";
import { generate } from "./generate-runtime";
import { checkTrace } from "./oracle";
import { parseHistory } from "./schema";

const [mode, argument, output, root] = process.argv.slice(2);
requireThat(process.argv.length === 6 && typeof argument === "string" && typeof output === "string" && isAbsolute(output) && typeof root === "string" && isAbsolute(root), "history worker fixed arguments");
if (mode === "generate") {
  const parts = argument.split(":");
  requireThat(parts.length === 2 && /^(?:0|[1-9][0-9]{0,9})$/.test(parts[0]!) && (parts[1] === "delivery" || parts[1] === "writer"), "history generation arguments");
  const seed = Number(parts[0]), profile = parts[1];
  requireThat(Number.isSafeInteger(seed) && seed <= 4294967295, "history generator seed");
  const result = await generate(seed, profile, root);
  await writeFile(output, encodeRecord(result, LIMITS.packetBytes), { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ mode, seed, profile, commands: result.history.commands.length, witnesses: result.witnesses.length }));
} else if (mode === "replay") {
  requireThat(isAbsolute(argument), "history replay absolute input");
  const history = parseHistory(parseCanonical(await readFileBounded(dirname(argument), basename(argument), LIMITS.historyBytes)));
  const trace = await replay(history, root); checkGenerated(history, trace);
  const result = { history, trace, ...checkTrace(history, trace) };
  await writeFile(output, encodeRecord(result, LIMITS.packetBytes), { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ mode, commands: history.commands.length, witnesses: result.witnesses.length }));
} else throw new Error("history worker mode");
