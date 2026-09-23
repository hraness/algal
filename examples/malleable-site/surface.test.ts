import { describe, expect, test } from "bun:test";
import { digestCanonical } from "../../src/digest";
import { DEFAULT_CONFIG, DEFAULT_SIGNALS, evaluateView, makeRevision, parseConfig, parseProposal, parseRevision, parseSignals, parseView, revisionDigest, updateSignals } from "./surface";
import { buildSurfaceFixture } from "./host";

describe("bounded marketing surface", () => {
  test("the shared Rust evaluator produces signal-specific content and stable identities", async () => {
    const revision = makeRevision(DEFAULT_CONFIG), builders = evaluateView(revision, DEFAULT_SIGNALS);
    const signals = updateSignals(updateSignals(DEFAULT_SIGNALS, { kind: "audience", value: "operators" }), { kind: "release", value: "available" });
    const operators = evaluateView(revision, signals);
    expect(signals).toEqual({ audience: "operators", release: "available" });
    expect(builders.children.map(row => row.id)).toEqual(operators.children.map(row => row.id));
    expect(operators.children[0]).toMatchObject({ text: "For people who operate" });
    expect(operators.children[4]).toMatchObject({ text: "Available to explore" });
    expect(await revisionDigest(revision)).toBe(digestCanonical(revision));
    expect((await buildSurfaceFixture()).view).toEqual(builders);
  });
  test("only content/layout edits are admitted, and markup-looking text stays data", () => {
    const revision = makeRevision({ ...DEFAULT_CONFIG, headline: "<script> is text, never code", layout: "stack" });
    expect(evaluateView(revision, DEFAULT_SIGNALS).children[1]).toMatchObject({ text: "<script> is text, never code" });
    expect(() => parseConfig({ ...DEFAULT_CONFIG, href: "javascript:alert(1)" })).toThrow();
    expect(() => parseConfig({ ...DEFAULT_CONFIG, headline: "x".repeat(97) })).toThrow();
    expect(() => parseConfig({ ...DEFAULT_CONFIG, body: "\ud800" })).toThrow();
    expect(() => parseConfig({ ...DEFAULT_CONFIG, ctaLabel: " " })).toThrow();
    expect(() => parseSignals({ ...DEFAULT_SIGNALS, traffic: 100 })).toThrow();
    expect(() => parseRevision({ ...revision, program: ["quote", { html: "bad" }] })).toThrow("builder");
    let deep: unknown = null; for (let i = 0; i < 18; i++) deep = [deep];
    expect(() => parseRevision({ ...revision, program: deep })).toThrow("bound");
    expect(() => parseRevision({ ...revision, program: { x: undefined } })).toThrow();
  });
  test("closed tree validation rejects duplicate IDs, wide/deep trees and external links", () => {
    const view = evaluateView(makeRevision(DEFAULT_CONFIG), DEFAULT_SIGNALS);
    expect(() => parseView({ ...view, children: [...view.children, view.children[0]] })).toThrow("unique");
    expect(() => parseView({ ...view, children: [{ kind: "link", id: "external", href: "https://example.org", label: "go" }] })).toThrow();
    expect(() => parseView({ ...view, children: Array.from({ length: 17 }, (_, i) => ({ kind: "text", id: `n-${i}`, role: "body", text: "body" })) })).toThrow();
    let nested: unknown = view; for (let i = 0; i < 6; i++) nested = { kind: "stack", id: `nested-${i}`, layout: "stack", children: [nested] };
    expect(() => parseView(nested)).toThrow("bound");
    expect(() => parseProposal({ contract: "algal.marketing-proposal.v1", baseRevision: digestCanonical("base"), config: DEFAULT_CONFIG, source: "model", rationale: "x".repeat(769) })).toThrow();
  });
});
