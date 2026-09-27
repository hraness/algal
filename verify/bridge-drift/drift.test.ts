/** verify/bridge-drift — drift gate for the Kani bridge pilot.
 *
 * The suite recomputes the proof-input bindings (every verify/rust-bridge
 * input, each harnessed canonical.rs item, the kani harness inventory) and
 * compares them with the recorded verify/bridge-drift/bindings.json. A match
 * means the retained proof run still describes this tree; a diff is a test
 * failure naming the drifted inputs, because the recorded kani evidence may
 * no longer cover the code it claims to prove.
 */
import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { readJson } from "../lib/files";
import { requireThat } from "../lib/schema";
import { BINDINGS_PATH, computeBindings, diffBindings, parseBindings, rustItems, REQUIRED_INPUTS, SYMBOLS } from "./bindings";

const ROOT = resolve(import.meta.dir, "../..");

test("rust item extraction isolates braces inside literals and comments", () => {
  const source = [
    "//! doc comment with { a brace } and \"quotes\"",
    "pub fn alpha(x: &str) -> bool {",
    "  let c = '}'; // trailing } in comment",
    '  x == "{" && c == \'}\'',
    "}",
    "",
    "const B: usize = 2; // inline ; terminator",
    "",
    "/* block { comment } */ fn gamma() {",
    "  let s = format!(\"{:?}\", B);",
    "}",
    "",
    "#[cfg(test)]",
    "mod tests {",
    "  fn not_top_level() {}",
    "}",
    "",
  ].join("\n");
  const items = rustItems(source);
  expect(items.get("alpha")).toBe(source.slice(source.indexOf("pub fn alpha"), source.indexOf("\n\nconst B")));
  expect(items.get("B")).toBe("const B: usize = 2;");
  expect(items.get("gamma")).toBe(source.slice(source.indexOf("fn gamma"), source.indexOf("\n\n#[cfg(test)]")));
  expect(items.has("not_top_level")).toBe(false);
});

test("literal-free extraction still detects a tampered body", () => {
  const before = rustItems("pub fn check_digest(s: &str) -> bool { s.len() == 71 }\n");
  const after = rustItems("pub fn check_digest(s: &str) -> bool { s.len() == 72 }\n");
  expect(before.get("check_digest")).not.toBe(after.get("check_digest"));
});

test("the recorded bindings match the current tree; any diff is drift", async () => {
  const recorded = parseBindings(await readJson(ROOT, BINDINGS_PATH));
  const actual = await computeBindings(ROOT);
  // Guard the collector itself: an under-inclusive walk cannot produce a
  // self-agreeing but empty binding set.
  for (const path of REQUIRED_INPUTS)
    requireThat(actual.inputs.some(input => input.path === path), `bridge binding walk missed required input ${path}`);
  for (const symbol of SYMBOLS)
    requireThat(actual.symbols.some(entry => entry.symbol === symbol), `bridge symbol extraction missed ${symbol}`);
  const diffs = diffBindings(recorded, actual);
  requireThat(diffs.length === 0,
    `bridge drift detected; the recorded kani evidence may be stale. ` +
    `Re-verify the proofs, then refresh ${BINDINGS_PATH} with 'bun verify/bridge-drift/bind.ts':\n  ${diffs.join("\n  ")}`);
});

test("the gate flags a forged recording and an untracked production change", async () => {
  const actual = await computeBindings(ROOT);
  const forged = parseBindings(JSON.parse(JSON.stringify(actual)) as unknown);
  forged.inputs.find(input => input.path.endsWith("src/proofs.rs"))!.sha256 = `sha256:${"0".repeat(64)}`;
  const forgedDiffs = diffBindings(forged, actual);
  expect(forgedDiffs.some(line => line.includes("src/proofs.rs"))).toBe(true);
  const drifted = JSON.parse(JSON.stringify(actual)) as typeof actual;
  const canonical = drifted.symbols.find(symbol => symbol.symbol === "check_digest")!;
  canonical.sha256 = `sha256:${"f".repeat(64)}`;
  drifted.proofTarget.sha256 = canonical.sha256;
  const driftDiffs = diffBindings(actual, drifted);
  expect(driftDiffs.some(line => line.includes("check_digest"))).toBe(true);
  expect(driftDiffs.some(line => line.includes("canonical.rs"))).toBe(true);
});
