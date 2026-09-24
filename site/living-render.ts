/** Rendering and bounded local-preview files. No browser or durable-host state. */
import {
  parseProposal, parseRevision, parseSignals, parseView,
  type SurfaceConfig, type SurfaceNode, type SurfaceProposal,
  type SurfaceRevision, type SurfaceSignals, type SurfaceView,
} from "../examples/malleable-site/surface";

export const WORKSPACE_LIMIT = 24;
export const WORKSPACE_BYTES = 131_072;
export type PreviewEntry = { revision: SurfaceRevision; source: "original" | "owner" | "model" | "restore" };
// Drafts can be incomplete. Admission happens only when preview is requested.
export type PreviewWorkspace = {
  contract: "algal.marketing-preview.v1";
  entries: PreviewEntry[];
  signals: SurfaceSignals;
  draft: SurfaceConfig;
  pending: SurfaceProposal | null;
};

function object(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new Error("Expected a plain preview object.");
  if (Object.keys(input).sort().join("\0") !== [...keys].sort().join("\0")) throw new Error("Unknown or missing preview field.");
  return input as Record<string, unknown>;
}

export function parseDraft(input: unknown): SurfaceConfig {
  const v = object(input, ["headline", "body", "ctaLabel", "layout"]);
  for (const [key, limit] of [["headline", 96], ["body", 280], ["ctaLabel", 32]] as const) {
    // Reject invisible control codes in imported editor text.
    // eslint-disable-next-line no-control-regex
    if (typeof v[key] !== "string" || v[key].length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v[key])) throw new Error("Draft text exceeds the preview limits.");
  }
  if (v.layout !== "split" && v.layout !== "stack") throw new Error("Unknown draft layout.");
  return { headline: v.headline as string, body: v.body as string, ctaLabel: v.ctaLabel as string, layout: v.layout };
}

export function parseWorkspace(input: unknown): PreviewWorkspace {
  const v = object(input, ["contract", "entries", "signals", "draft", "pending"]);
  if (v.contract !== "algal.marketing-preview.v1") throw new Error("This file is not a local preview workspace.");
  if (!Array.isArray(v.entries) || !v.entries.length || v.entries.length > WORKSPACE_LIMIT) throw new Error("A preview needs between 1 and 24 versions.");
  const entries = v.entries.map(raw => {
    const entry = object(raw, ["revision", "source"]);
    if (entry.source !== "original" && entry.source !== "owner" && entry.source !== "model" && entry.source !== "restore") throw new Error("Unknown preview version source.");
    return { revision: parseRevision(entry.revision), source: entry.source } as PreviewEntry;
  });
  return { contract: "algal.marketing-preview.v1", entries, signals: parseSignals(v.signals), draft: parseDraft(v.draft), pending: v.pending === null ? null : parseProposal(v.pending) };
}

export function parsePreviewFile(text: string): PreviewWorkspace | SurfaceProposal {
  if (new TextEncoder().encode(text).length > WORKSPACE_BYTES) throw new Error("Preview files must be smaller than 128 KiB.");
  const value: unknown = JSON.parse(text);
  if (value && typeof value === "object" && "contract" in value && value.contract === "algal.marketing-proposal.v1") return parseProposal(value);
  return parseWorkspace(value);
}

export function assertProposalBase(proposal: SurfaceProposal, digest: string): void {
  if (proposal.baseRevision !== digest) throw new Error("This proposal belongs to another version. Restore its starting version or create a new proposal.");
}

export function changedFields(before: SurfaceConfig, after: SurfaceConfig): string[] {
  return ([["headline", "Headline"], ["body", "Body"], ["ctaLabel", "Link label"], ["layout", "Layout"]] as const)
    .filter(([key]) => before[key] !== after[key]).map(([, label]) => label);
}

export function surfaceTag(node: SurfaceNode): "div" | "h3" | "p" | "a" {
  return node.kind === "stack" ? "div" : node.kind === "link" ? "a" : node.role === "heading" ? "h3" : "p";
}
export function surfaceClass(node: SurfaceNode): string {
  return node.kind === "stack" ? `living-node-stack living-node-${node.layout}` : node.kind === "link" ? "living-node-link" : `living-node-text living-node-${node.role}`;
}
function escape(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Used by the static site builder. The DOM adapter uses the same vocabulary. */
export function renderSurfaceHtml(input: SurfaceView): string {
  const render = (node: SurfaceNode): string => {
    const tag = surfaceTag(node);
    const content = node.kind === "stack" ? node.children.map(render).join("") : escape(node.kind === "link" ? node.label : node.text);
    return `<${tag} class="${surfaceClass(node)}" data-surface-id="${escape(node.id)}"${node.kind === "link" ? ' href="/docs/"' : ""}>${content}</${tag}>`;
  };
  return render(parseView(input));
}
