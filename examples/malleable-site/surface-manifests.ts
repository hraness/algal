/** Portable admitted surface manifest builders; no host filesystem or service. */
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../../src/contract";
import { canonicalize, type JsonValue } from "../../src/values";
import { SIGNAL_UPDATE_PROGRAM, parseRevision, type SurfaceRevision } from "./surface";

const BUDGETS = { maxSteps: 8, maxAgentCalls: 0, maxWork: 50_000, maxContextBytes: 8192, maxOutputBytes: 8192, maxDepth: 4 };

function manifest(name: "view" | "update", program: JsonValue, definition?: SurfaceRevision): OrganismManifest {
  const ports = name === "view" ? ["signals"] : ["signals", "event"];
  return parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:marketing-${name}`, name: `Marketing ${name}`, budgets: BUDGETS,
    interface: { inputs: Object.fromEntries(ports.map(port => [port, { cell: "input", port }])), outputs: { value: { cell: "result", port: "out" } } },
    cells: [{ id: "input", kind: "input", outputs: Object.fromEntries(ports.map(port => [port, "json"])) },
      ...(definition ? [{ id: "definition", kind: "const", outputs: { value: { type: "json", value: definition } } }] : []),
      { id: "result", kind: "expr", inputs: Object.fromEntries(ports.map(port => [port, "json"])), expr: { contract: "algal.expr.v1", program }, output: { kind: "json", schema: { type: "object" } } }],
    edges: ports.map(port => ({ from: { cell: "input", port }, to: { cell: "result", port } })) });
}
export function viewManifest(input: SurfaceRevision): OrganismManifest { const revision = parseRevision(input); return manifest("view", revision.program, revision); }
export function updateManifest(): OrganismManifest { return manifest("update", SIGNAL_UPDATE_PROGRAM); }
export function parseSurfaceManifest(m: OrganismManifest): SurfaceRevision {
  const cell = m.cells.find(c => c.id === "definition");
  if (!cell || cell.kind !== "const") throw new Error("Missing marketing definition");
  const revision = parseRevision(cell.outputs.value?.value);
  if (canonicalize(manifestToJson(m)) !== canonicalize(manifestToJson(viewManifest(revision)))) throw new Error("View manifest differs from the known builder");
  return revision;
}
