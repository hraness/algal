import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseOrganismManifest, type OrganismManifest } from "../src/contract";
import { type Digest } from "../src/digest";
import { COMPILE_BOUNDS, compileOrganism } from "../src/graph";
import { builtinRegistry } from "../src/registry";
import { type JsonValue } from "../src/values";
import {
  CountingStore, EXAMPLE_COLUMNS, REFUSAL_COLUMNS, REPOSITORY, SCALING_BOUNDS, SHAPES, SHAPE_COLUMNS, TABLE_HEADINGS,
  checkBoundaries, checkExampleRows, checkRefusalRows, checkShapeRows, closure, evaluate, growthSizes, loadShapeFixtures,
  materializeShape, parseArgs, parsePublishedTable, rowKey, shape, simulateAdmission,
} from "./source-scaling";

const PAGE = "docs/scale-measurements.md";
const page = await readFile(join(REPOSITORY, PAGE), "utf8");
const fixtures = await loadShapeFixtures();
const tables = {
  examples: parsePublishedTable(page, TABLE_HEADINGS.examples, EXAMPLE_COLUMNS),
  shapes: parsePublishedTable(page, TABLE_HEADINGS.shapes, SHAPE_COLUMNS),
  refusals: parsePublishedTable(page, TABLE_HEADINGS.refusals, REFUSAL_COLUMNS),
};
// A difference names the row and prints the fresh row to paste into the page.
const clean = (messages: string[]) => expect(messages.join("\n")).toBe("");

test("the example project table matches fresh compiles and reference runs of every entry point", async () => {
  clean(await checkExampleRows(tables.examples));
}, 60_000);

test("each generated shape compiles and runs as its rows show, up to the largest size admission accepts", async () => {
  clean(await checkShapeRows(tables.shapes, fixtures));
}, 120_000);

test("each shape stops one unit past its largest compiled size, on the ceiling it was built to reach", async () => {
  clean(checkBoundaries(tables.shapes, tables.refusals));
  clean(await checkRefusalRows(tables.refusals, fixtures));
  for (const row of tables.refusals.rows) {
    const { id, size } = rowKey(row, true);
    const input = await materializeShape(shape(id), size!, fixtures);
    try {
      const result = await evaluate(input);
      if (result.accepted) throw new Error(`${id} ${size} compiled`);
      expect({ id, limit: result.limit }).toEqual({ id, limit: shape(id).target });
      // Admission refuses after a bounded prefix, never after the full expansion.
      if (result.check) expect(result.check.visited).toBeLessThan(result.check.expanded.instances);
    } finally { await input.cleanup(); }
  }
}, 120_000);

test("growth doubles the size until a refusal, then bisects to the exact boundary", async () => {
  expect(await growthSizes(shape("import-chain"), fixtures)).toEqual({ sizes: [1, 2, 4, 8, 9, 10], largestAccepted: 9, smallestRefused: 10 });
  expect(await growthSizes(shape("drafts"), fixtures)).toEqual({ sizes: [1, 2, 4, 8, 9], largestAccepted: 8, smallestRefused: 9 });
}, 60_000);

test("the admission simulation follows graph admission, including the depth ceiling source cannot reach", async () => {
  const module = (name: string, cells: JsonValue[]): OrganismManifest => parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:${name}`, name,
    cells, edges: [], interface: { inputs: {}, outputs: {} }, budgets: { maxSteps: 1024, maxDepth: 8 } });
  const child = (digest: Digest, count = 1): JsonValue[] => Array.from({ length: count }, (_, i) => ({ id: `child-${i}`, kind: "organism", manifest: digest }));
  const refuse = async (root: OrganismManifest, store: CountingStore) => {
    const error = await compileOrganism(root, builtinRegistry(), store).then(() => undefined, (reason: unknown) => reason as Error & { code: string });
    return { code: error?.code, message: error?.message, reads: store.reads };
  };
  // A chain one level past the static depth ceiling.
  const deep = new CountingStore();
  let current = module("leaf", [{ id: "value", kind: "const", outputs: { out: { type: "text", value: "ok" } } }]);
  for (let level = 0; level <= COMPILE_BOUNDS.maxDepth; level++) current = module(`level-${level}`, child(await deep.putManifest(current)));
  const depthVerdict = simulateAdmission(await closure(current, deep));
  deep.reads = 0;
  expect(await refuse(current, deep)).toEqual({ code: "DEPTH_EXCEEDED", message: `embedding chain exceeds compile depth ${COMPILE_BOUNDS.maxDepth}`, reads: COMPILE_BOUNDS.maxDepth + 1 });
  expect(depthVerdict).toMatchObject({ accepted: false, exceeded: ["depth"], visited: COMPILE_BOUNDS.maxDepth + 2 });
  // A root of 64 calls to a 64-cell child: the last child crosses the cell ceiling.
  const wide = new CountingStore();
  const leaf = await wide.putManifest(module("wide", Array.from({ length: 64 }, (_, i) => ({ id: `v-${i}`, kind: "const", outputs: { out: { type: "text", value: "x" } } }))));
  const root = module("over-cells", child(leaf, 64));
  const verdict = simulateAdmission(await closure(root, wide));
  wide.reads = 0;
  expect(await refuse(root, wide)).toEqual({ code: "BUDGET_EXHAUSTED", message: "expanded compilation count budget exceeded", reads: 64 });
  expect(verdict).toMatchObject({ accepted: false, exceeded: ["cells"], visited: 65, before: { instances: 64, cells: 64 * 64 } });
});

test("published tables are data: unknown, missing, malformed, and oversized content is rejected", () => {
  const rejects = (text: unknown, pattern: RegExp, heading: string = TABLE_HEADINGS.examples) =>
    expect(() => parsePublishedTable(text, heading, EXAMPLE_COLUMNS)).toThrow(pattern);
  rejects(42, /page must be text/);
  rejects("x".repeat(SCALING_BOUNDS.maxPageBytes + 1), /exceeds 131072 bytes/);
  rejects(page.replace(`## ${TABLE_HEADINGS.examples}`, "## Examples"), /exactly one "## Example projects" section/);
  rejects(`${page}\n## ${TABLE_HEADINGS.examples}\n`, /exactly one/);
  rejects(page.replace("| Program | Files |", "| Project | Files |"), /columns must be Program, Files/);
  const lines = page.split("\n"), header = lines.indexOf(lines.find(line => line.startsWith("| Program | Files |"))!);
  rejects([...lines.slice(0, header + 1), ...lines.slice(header + 2)].join("\n"), /needs a divider row/);
  rejects([...lines.slice(0, header + 2), `${lines[header + 2]} extra |`, ...lines.slice(header + 3)].join("\n"), /row 1 has 16 cells, not 15/);
  const row = lines[header + 2]!;
  rejects([...lines.slice(0, header + 2), ...Array.from({ length: SCALING_BOUNDS.maxTableRows + 1 }, () => row), ...lines.slice(header + 3)].join("\n"), /more than 64 rows/);
  expect(() => rowKey(["task-planning/main", "6"], false)).toThrow(/must be one id in code/);
  expect(() => rowKey(["`drafts`", "0"], true)).toThrow(/integer from 1 through 24/);
  expect(() => rowKey(["`drafts`", "1,0"], true)).toThrow(/integer from 1 through 24/);
  const duplicated = { ...tables.refusals, rows: [tables.refusals.rows[0]!, tables.refusals.rows[0]!] };
  expect(() => checkBoundaries(tables.shapes, duplicated)).toThrow(/lists .* twice/);
});

test("a drifted number or a missing boundary row is reported with the fresh row", async () => {
  const inbox = tables.examples.rows.find(row => row[0] === "`inbox/inbox`")!;
  const edited = { ...tables.examples, rows: [inbox.map((cell, column) => column === EXAMPLE_COLUMNS.indexOf("Cells") ? "18" : cell)] };
  const messages = await checkExampleRows(edited);
  expect(messages.filter(message => message.startsWith("inbox/inbox: page shows"))).toHaveLength(1);
  expect(messages.filter(message => message.endsWith("missing from \"## Example projects\""))).toHaveLength(5);
  const withoutChain = { ...tables.refusals, rows: tables.refusals.rows.filter(row => row[0] !== "`import-chain`") };
  expect(checkBoundaries(tables.shapes, withoutChain)).toEqual([`import-chain: "## ${TABLE_HEADINGS.refusals}" needs size 10, one more than the largest compiled size 9`]);
  expect(SHAPES.every(item => tables.shapes.rows.some(row => row[0] === `\`${item.id}\``))).toBe(true);
}, 60_000);

test("run fixtures are parsed from unknown JSON", () => {
  expect(parseArgs({ input: { value: 1 } })).toEqual({ input: { value: 1 } });
  expect(() => parseArgs([])).toThrow(/must be a JSON object/);
  expect(() => parseArgs({ input: 1 })).toThrow(/arguments.input must be a JSON object/);
  expect(() => parseArgs({ input: { value: undefined } })).toThrow(/must be a JSON object/);
});
