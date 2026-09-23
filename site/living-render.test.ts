import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, DEFAULT_SIGNALS, evaluateView, makeRevision, revisionDigest } from "../examples/malleable-site/surface";
import {
  assertProposalBase, changedFields, parsePreviewFile, parseWorkspace,
  renderSurfaceHtml, WORKSPACE_BYTES, type PreviewWorkspace,
} from "./living-render";

const revision = makeRevision(DEFAULT_CONFIG);
function workspace(): PreviewWorkspace {
  return { contract: "algal.marketing-preview.v1", entries: [{ revision, source: "original" }], signals: { ...DEFAULT_SIGNALS }, draft: { ...DEFAULT_CONFIG }, pending: null };
}

describe("local marketing preview boundary", () => {
  test("incomplete drafts survive export and reload without becoming active content", () => {
    const value = workspace();
    value.draft.headline = "";
    const parsed = parsePreviewFile(JSON.stringify(value));
    expect(parsed).toEqual(value);
    if (parsed.contract !== "algal.marketing-preview.v1") throw new Error("Expected workspace");
    expect(parsed.entries[0]!.revision.config.headline).toBe(DEFAULT_CONFIG.headline);
  });

  test("rejects unknown workspace fields, excess history, text, bytes, and altered programs", () => {
    expect(() => parseWorkspace({ ...workspace(), authority: "publish" })).toThrow("Unknown");
    expect(() => parseWorkspace({ ...workspace(), entries: [] })).toThrow("between 1 and 24");
    expect(() => parseWorkspace({ ...workspace(), entries: Array(25).fill({ revision, source: "owner" }) })).toThrow("between 1 and 24");
    expect(() => parseWorkspace({ ...workspace(), draft: { ...DEFAULT_CONFIG, body: "x".repeat(281) } })).toThrow("text");
    expect(() => parsePreviewFile(" ".repeat(WORKSPACE_BYTES + 1))).toThrow("128 KiB");
    expect(() => parsePreviewFile(`"${"é".repeat(WORKSPACE_BYTES / 2)}"`)).toThrow("128 KiB");
    const altered = workspace();
    altered.entries = [{ revision: { ...revision, program: "different" }, source: "owner" }];
    expect(() => parseWorkspace(altered)).toThrow("admitted builder");
  });

  test("proposal imports retain exact base and reject an outdated revision", async () => {
    const base = await revisionDigest(revision);
    const proposal = { contract: "algal.marketing-proposal.v1", baseRevision: base, config: { ...DEFAULT_CONFIG, headline: "A revised component." }, source: "model", rationale: "A recorded suggestion, not measured improvement." };
    const parsed = parsePreviewFile(JSON.stringify(proposal));
    if (parsed.contract !== "algal.marketing-proposal.v1") throw new Error("Expected proposal");
    expect(() => assertProposalBase(parsed, base)).not.toThrow();
    const changed = await revisionDigest(makeRevision(parsed.config));
    expect(() => assertProposalBase(parsed, changed)).toThrow("another version");
  });

  test("SSR treats proposed markup as text and only renders the host-owned link", () => {
    const dangerous = makeRevision({ ...DEFAULT_CONFIG, headline: '<img src=x onerror="alert(1)">', body: "One & two < three > zero.", ctaLabel: '<script>alert("x")</script>' });
    const html = renderSurfaceHtml(evaluateView(dangerous, DEFAULT_SIGNALS));
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("One &amp; two &lt; three &gt; zero.");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain('href="/docs/"');
    expect(html).toContain('data-surface-id="headline"');
    expect(html).not.toMatch(/\sid="/);
  });

  test("render boundary rejects unknown destinations, duplicate IDs and arbitrary node types", () => {
    const view = evaluateView(revision, DEFAULT_SIGNALS);
    const invalidLink = { ...view, children: [{ kind: "link", id: "cta", label: "Click", href: "javascript:alert(1)" }] };
    expect(() => renderSurfaceHtml(invalidLink as typeof view)).toThrow("destination");
    expect(() => renderSurfaceHtml({ ...view, children: [view.children[0]!, view.children[0]!] })).toThrow("unique");
    expect(() => renderSurfaceHtml({ ...view, children: [{ kind: "script", id: "bad", label: "bad", href: "/docs/" }] } as unknown as typeof view)).toThrow();
  });

  test("renders all four signal contexts and both layouts without conflating drafts", () => {
    for (const layout of ["split", "stack"] as const) for (const audience of ["builders", "operators"] as const) for (const release of ["available", "preview"] as const) {
      const html = renderSurfaceHtml(evaluateView(makeRevision({ ...DEFAULT_CONFIG, layout }), { audience, release }));
      expect(html).toContain(`living-node-${layout}`);
      expect(html).toContain(audience === "builders" ? "For people who build" : "For people who operate");
      expect(html).toContain(release === "preview" ? "A living preview" : "Available to explore");
    }
    expect(changedFields(DEFAULT_CONFIG, { ...DEFAULT_CONFIG, layout: "stack", headline: "Next." })).toEqual(["Headline", "Layout"]);
  });
});
