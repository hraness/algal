/** Deterministic command adapter: exercises a real process, never a paid model. */
import { appendFile } from "node:fs/promises";
import { asObject, asString } from "../../src/values";

const log = process.argv[2];
if (!log) throw new Error("usage: bun decision-adapter.ts CALL_LOG");
const raw = await Bun.stdin.text();
if (Buffer.byteLength(raw) > 8192) throw new Error("fixture request exceeds 8192 bytes");
const request = asObject(JSON.parse(raw) as unknown, "request");
if (request.kind !== "agent" || request.cellId !== "recommend") {
  throw new Error("fixture only serves the recommend agent cell");
}
const context = asObject(request.context, "context");
const inputs = asObject(context.inputs, "inputs");
const evidence = asObject(inputs.evidence, "evidence");
const release = asString(evidence.release, "release", 256);
await appendFile(log, JSON.stringify({ cellId: request.cellId, release }) + "\n");
process.stdout.write(JSON.stringify({
  release,
  recommendation: "review",
  summary: "Unit, integration, and security fixture checks pass; awaiting host approval.",
}));
