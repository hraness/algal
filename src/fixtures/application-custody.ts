import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { ApplicationService, type ApplicationCommand } from "../application";
import { parseOrganismManifest } from "../contract";
import { digestCanonical } from "../digest";
import { canonicalize, type JsonValue } from "../values";

export const allowCustody = { async admitCommit() {} };
export const custodyHash = (value: JsonValue) => digestCanonical(value);
export async function seedCustody(directory: string, application = "fixture") {
  const service = new ApplicationService(directory, allowCustody);
  const manifest = await service.store.putManifest(parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:custody-fixture", name: "Custody fixture",
    cells: [{ id: "output", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [],
  }));
  const record = await service.store.putValue({ contract: "algal.custody.fixture.v1" });
  const revision = await service.store.putValue({
    contract: "algal.application-revision.v1", application, parent: null,
    schema: record, queries: record, views: record, runtimeProfile: record, evaluationPolicy: record,
    capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: record, maxGenerations: 1, capabilities: [], queries: [record] }],
  });
  const memory = await service.store.putValue({ contract: "algal.memory.fixture.v1", facts: [] });
  const create: ApplicationCommand = {
    application, operation: custodyHash("create"), kind: "create", expectedHead: null,
    revision, memory, intents: [], evidence: [], causedBy: null,
  };
  return { service, create };
}

export function barrier() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

export async function custodyDeadline<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Custody fixture barrier timed out")), ms); })]); }
  finally { clearTimeout(timer); }
}

export type CustodyActor = "creator" | "late" | "live";
export type CustodyPhase = "selected" | "admitted";
export type CustodyScenario = Record<CustodyActor, ApplicationCommand>;
export function custodyControl(directory: string, actor: CustodyActor, phase: string) {
  return join(directory, "custody-control", `${actor}.${phase}.json`);
}
export async function readCustodyJson(path: string): Promise<JsonValue> {
  const raw = await readFile(path);
  if (raw.length > 16_384) throw new Error("Custody fixture record exceeds bound");
  return JSON.parse(raw.toString("utf8")) as JsonValue;
}
export async function writeCustodyJson(path: string, value: JsonValue): Promise<void> {
  const text = canonicalize(value);
  if (Buffer.byteLength(text) > 16_384) throw new Error("Custody fixture record exceeds bound");
  await writeFile(path, text, { flag: "wx", mode: 0o600 });
}
