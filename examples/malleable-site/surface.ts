/** Experimental, browser-safe marketing vocabulary. The Rust expression
 * evaluator owns view/update semantics; this module only admits bounded data. */
import { evalProgram } from "../../src/expr";
import { canonicalize, type JsonValue } from "../../src/values";

export type SurfaceConfig = { headline: string; body: string; ctaLabel: string; layout: "split" | "stack" };
export type SurfaceSignals = { audience: "builders" | "operators"; release: "available" | "preview" };
export type SurfaceNode =
  | { kind: "stack"; id: string; layout: "split" | "stack"; children: SurfaceNode[] }
  | { kind: "text"; id: string; role: "eyebrow" | "heading" | "body" | "status"; text: string }
  | { kind: "link"; id: string; label: string; href: "/docs/" };
export type SurfaceView = Extract<SurfaceNode, { kind: "stack" }>;
export type SurfaceRevision = { contract: "algal.marketing-revision.v1"; config: SurfaceConfig; program: JsonValue };
export type SurfaceSignalEvent = { kind: "audience"; value: "builders" | "operators" } | { kind: "release"; value: "available" | "preview" };
export type SurfaceProposal = { contract: "algal.marketing-proposal.v1"; baseRevision: string; config: SurfaceConfig; source: "owner" | "model"; rationale: string };

export const DEFAULT_CONFIG: Readonly<SurfaceConfig> = Object.freeze({
  headline: "Software that can grow with you.",
  body: "Build inspectable applications that can change their behavior while keeping their history. Start with one living component.",
  ctaLabel: "Explore ALGAL", layout: "split",
});
export const DEFAULT_SIGNALS: Readonly<SurfaceSignals> = Object.freeze({ audience: "builders", release: "preview" });

function object(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new Error("Expected plain surface object");
  if (Object.keys(input).sort().join("\0") !== [...keys].sort().join("\0")) throw new Error("Unknown or missing surface field");
  return input as Record<string, unknown>;
}
function text(input: unknown, max: number): string {
  // Text nodes can contain markup-looking text safely. Control codes and lone
  // surrogates are rejected to keep every adapter's rendering/digest stable.
  if (typeof input !== "string" || input.length > max || !input.trim() || /[\uD800-\uDFFF]/u.test(input)) throw new Error("Invalid surface text");
  if (Array.from(input).some(char => { const code = char.charCodeAt(0); return code === 127 || (code < 32 && code !== 9 && code !== 10 && code !== 13); })) throw new Error("Invalid surface control character");
  return input;
}
function choice<T extends string>(input: unknown, values: readonly T[]): T {
  if (typeof input !== "string" || !values.includes(input as T)) throw new Error("Invalid surface choice");
  return input as T;
}
export function parseConfig(input: unknown): SurfaceConfig {
  const v = object(input, ["headline", "body", "ctaLabel", "layout"]);
  return { headline: text(v.headline, 96), body: text(v.body, 280), ctaLabel: text(v.ctaLabel, 32), layout: choice(v.layout, ["split", "stack"]) };
}
export function parseSignals(input: unknown): SurfaceSignals {
  const v = object(input, ["audience", "release"]);
  return { audience: choice(v.audience, ["builders", "operators"]), release: choice(v.release, ["available", "preview"]) };
}
export function parseSignalEvent(input: unknown): SurfaceSignalEvent {
  const v = object(input, ["kind", "value"]);
  if (v.kind === "audience") return { kind: "audience", value: choice(v.value, ["builders", "operators"]) };
  if (v.kind === "release") return { kind: "release", value: choice(v.value, ["available", "preview"]) };
  throw new Error("Invalid signal event");
}
export function parseView(input: unknown): SurfaceView {
  let count = 0;
  const ids = new Set<string>();
  const node = (raw: unknown, depth: number): SurfaceNode => {
    if (++count > 32 || depth > 4) throw new Error("Surface tree bound exceeded");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid surface node");
    const kind = (raw as Record<string, unknown>).kind;
    const v = object(raw, kind === "stack" ? ["kind", "id", "layout", "children"] : kind === "text" ? ["kind", "id", "role", "text"] : ["kind", "id", "label", "href"]);
    const id = text(v.id, 64);
    if (!/^[a-z][a-z0-9-]*$/.test(id) || ids.has(id)) throw new Error("Surface IDs must be stable and unique");
    ids.add(id);
    if (kind === "stack") {
      if (!Array.isArray(v.children) || !v.children.length || v.children.length > 16) throw new Error("Invalid surface children");
      return { kind, id, layout: choice(v.layout, ["split", "stack"]), children: v.children.map(child => node(child, depth + 1)) };
    }
    if (kind === "text") return { kind, id, role: choice(v.role, ["eyebrow", "heading", "body", "status"]), text: text(v.text, 280) };
    if (kind === "link" && v.href === "/docs/") return { kind, id, label: text(v.label, 32), href: "/docs/" };
    throw new Error("Invalid surface node or link destination");
  };
  const root = node(input, 0);
  if (root.kind !== "stack") throw new Error("Surface root must be a stack");
  return root;
}

function viewProgram(config: SurfaceConfig): JsonValue {
  return { kind: "stack", id: "surface", layout: config.layout, children: ["list",
    { kind: "text", id: "audience", role: "eyebrow", text: ["if", ["eq", ["get", "signals", "audience"], "builders"], "For people who build", "For people who operate"] },
    { kind: "text", id: "headline", role: "heading", text: config.headline },
    { kind: "text", id: "body", role: "body", text: config.body },
    { kind: "link", id: "cta", label: config.ctaLabel, href: "/docs/" },
    { kind: "text", id: "release", role: "status", text: ["if", ["eq", ["get", "signals", "release"], "available"], "Available to explore", "A living preview"] },
  ] };
}
export function makeRevision(input: SurfaceConfig): SurfaceRevision {
  const config = parseConfig(input);
  return { contract: "algal.marketing-revision.v1", config, program: viewProgram(config) };
}
export function parseRevision(input: unknown): SurfaceRevision {
  const v = object(input, ["contract", "config", "program"]);
  if (v.contract !== "algal.marketing-revision.v1") throw new Error("Invalid surface revision contract");
  const expected = makeRevision(parseConfig(v.config));
  // A hostile program is bounded before canonicalization; the editing
  // vocabulary cannot substitute operations, authority, or arbitrary code.
  let nodes = 0;
  const inspect = (x: unknown, depth: number): void => {
    if (++nodes > 512 || depth > 16) throw new Error("Surface program bound exceeded");
    if (x && typeof x === "object") {
      if (Object.keys(x).length > 64) throw new Error("Surface program collection bound exceeded");
      for (const child of Object.values(x)) inspect(child, depth + 1);
    } else if (typeof x === "string" ? x.length > 1024 : x !== null && typeof x !== "boolean" && !(typeof x === "number" && Number.isFinite(x))) throw new Error("Invalid surface program value");
  };
  inspect(v.program, 0);
  if (canonicalize(v.program as JsonValue) !== canonicalize(expected.program)) throw new Error("Surface program differs from the admitted builder");
  return expected;
}
export function evaluateView(input: SurfaceRevision, signals: SurfaceSignals): SurfaceView {
  const revision = parseRevision(input), state = parseSignals(signals);
  const result = evalProgram(revision.program, { signals: state }, 10_000);
  if (!result.ok) throw new Error(`Surface view failed: ${result.err.code}`);
  return parseView(result.value);
}
export const SIGNAL_UPDATE_PROGRAM: JsonValue = {
  audience: ["if", ["eq", ["get", "event", "kind"], "audience"], ["get", "event", "value"], ["get", "signals", "audience"]],
  release: ["if", ["eq", ["get", "event", "kind"], "release"], ["get", "event", "value"], ["get", "signals", "release"]],
};
export function updateSignals(signals: SurfaceSignals, event: SurfaceSignalEvent): SurfaceSignals {
  const result = evalProgram(SIGNAL_UPDATE_PROGRAM, { signals: parseSignals(signals), event: parseSignalEvent(event) }, 10_000);
  if (!result.ok) throw new Error(`Surface update failed: ${result.err.code}`);
  return parseSignals(result.value);
}
export async function revisionDigest(input: SurfaceRevision): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalize(parseRevision(input)));
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}
export function parseProposal(input: unknown): SurfaceProposal {
  const v = object(input, ["contract", "baseRevision", "config", "source", "rationale"]);
  if (v.contract !== "algal.marketing-proposal.v1" || typeof v.baseRevision !== "string" || !/^sha256:[a-f0-9]{64}$/.test(v.baseRevision)) throw new Error("Invalid proposal contract or base revision");
  return { contract: "algal.marketing-proposal.v1", baseRevision: v.baseRevision, config: parseConfig(v.config), source: choice(v.source, ["owner", "model"]), rationale: text(v.rationale, 768) };
}
