/** Authored, synthetic warehouse routes. This is a small controlled study,
 * not a Harbor task, an external benchmark, or a representative workload. */
export type RouteCase = {
  id: string; split: "development" | "holdout";
  start: string; edges: [string, string][]; expected: string[];
};

export const ROUTE_CASES: RouteCase[] = [
  { id: "dev-chain", split: "development", start: "dock", edges: [["dock", "a"], ["a", "b"], ["b", "c"]], expected: ["a", "b", "c"] },
  { id: "dev-branch", split: "development", start: "dock", edges: [["dock", "a"], ["dock", "b"], ["a", "c"], ["b", "c"], ["isolated", "d"]], expected: ["a", "b", "c"] },
  { id: "dev-cycle", split: "development", start: "dock", edges: [["dock", "a"], ["a", "b"], ["b", "dock"], ["b", "c"], ["reverse", "dock"]], expected: ["a", "b", "c", "dock"] },
  { id: "dev-direction", split: "development", start: "dock", edges: [["a", "dock"], ["dock", "b"], ["b", "c"], ["c", "d"], ["e", "d"]], expected: ["b", "c", "d"] },
  { id: "holdout-merge", split: "holdout", start: "hub", edges: [["hub", "p"], ["hub", "q"], ["p", "r"], ["q", "r"], ["r", "s"], ["s", "t"], ["remote", "q"]], expected: ["p", "q", "r", "s", "t"] },
  { id: "holdout-loop", split: "holdout", start: "hub", edges: [["hub", "p"], ["p", "q"], ["q", "p"], ["q", "r"], ["r", "s"], ["s", "hub"], ["remote", "s"]], expected: ["hub", "p", "q", "r", "s"] },
  { id: "holdout-disconnected", split: "holdout", start: "hub", edges: [["hub", "p"], ["p", "q"], ["q", "r"], ["r", "s"], ["remote", "t"], ["t", "u"], ["u", "remote"], ["v", "hub"]], expected: ["p", "q", "r", "s"] },
  { id: "holdout-empty", split: "holdout", start: "hub", edges: [["p", "hub"], ["p", "q"], ["q", "r"], ["r", "p"]], expected: [] },
];
