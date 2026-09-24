/** A declared local objective, not a claim about conversion or human preference. */
import { parseConfig, parseSignals, type SurfaceConfig, type SurfaceSignals } from "../malleable-site/surface";

export const GROW_POLICY = Object.freeze({
  contract: "algal.browser-grow-policy.v1",
  objective: "Match explicit audience and release context in headline, body, layout and link label.",
  checks: ["audience-headline", "release-body", "audience-layout", "release-link"] as const,
  adoption: "strict-fit-improvement-and-four-context-shadow-pass",
  effects: "none",
  maxCandidates: 16,
  maxCandidatesPerHead: 1,
});
export type FitCheck = { name: typeof GROW_POLICY.checks[number]; before: boolean; after: boolean };
export type GrowFit = { before: number; after: number; checks: FitCheck[]; strictlyImproves: boolean };

export function ruleConfig(input: SurfaceSignals): SurfaceConfig {
  const signals = parseSignals(input);
  return parseConfig({
    headline: signals.audience === "builders" ? "Build applications that can grow with you." : "Operate applications with an inspectable history.",
    body: signals.release === "preview" ? "Explore this preview. Change one component, inspect its evidence, and keep a way back." : "Available to explore. Change one component, inspect its evidence, and keep a way back.",
    ctaLabel: signals.release === "preview" ? "Explore the preview" : "Explore ALGAL",
    layout: signals.audience === "builders" ? "split" : "stack",
  });
}
function checks(config: SurfaceConfig, signals: SurfaceSignals): boolean[] {
  const c = parseConfig(config), s = parseSignals(signals);
  return [
    (s.audience === "builders" ? /\bbuild(?:er|ers|ing)?\b/i : /\boperat(?:e|es|ing|ion|ions|or|ors)\b/i).test(c.headline),
    (s.release === "preview" ? /\bpreview\b/i : /\bavailable\b/i).test(c.body),
    c.layout === (s.audience === "builders" ? "split" : "stack"),
    (s.release === "preview" ? /\bpreview\b/i : /\bexplore\b/i).test(c.ctaLabel),
  ];
}
export function evaluateFit(before: SurfaceConfig, after: SurfaceConfig, signals: SurfaceSignals): GrowFit {
  const old = checks(before, signals), next = checks(after, signals);
  const oldScore = old.filter(Boolean).length, newScore = next.filter(Boolean).length;
  return { before: oldScore, after: newScore, checks: GROW_POLICY.checks.map((name, index) => ({ name, before: old[index]!, after: next[index]! })), strictlyImproves: newScore > oldScore };
}
