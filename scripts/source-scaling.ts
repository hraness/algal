/** Deterministic structure of source projects as reuse grows.
 *
 * The example projects and a set of generated projects that share helpers are
 * compiled the way `algal compile` does it: load the source project from disk,
 * install its modules, and run graph admission, whose expanded-compilation
 * ceilings count every child occurrence. This module reports only facts that
 * do not depend on the machine: source files and bytes, unique modules, the
 * expanded instances, cells, edges, and canonical manifest bytes that
 * admission counts, bundle bytes, the compiler's inferred executor attempts
 * and depth, and the reference run's steps and work. `measure-source-scaling.ts`
 * adds timings; `source-scaling.test.ts` checks the published tables against it.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { packOrganism, type Bundle } from "../src/bundle";
import { manifestToJson, type OrganismManifest } from "../src/contract";
import { digestCanonical, type Digest } from "../src/digest";
import { scriptedExecutor } from "../src/effects";
import { AlgalError } from "../src/errors";
import { COMPILE_BOUNDS, compileOrganism } from "../src/graph";
import { builtinRegistry } from "../src/registry";
import { runOrganism, type RunReceipt } from "../src/run";
import { SOURCE_PROJECT_BOUNDS, SourceError } from "../src/source";
import { loadSourceProject, type SourceProject } from "../src/source-project";
import { MemoryStore } from "../src/store-memory";
import { utf8Length } from "../src/utf8";
import { canonicalBytes, canonicalize, isJsonValue, type JsonValue } from "../src/values";

export const REPOSITORY = resolve(import.meta.dir, "..");
export const PROJECTS = "examples/source/projects";
/** Ceilings on this diagnostic's own inputs. */
export const SCALING_BOUNDS = Object.freeze({
  /** Unique manifests in one closure; `pack` stops at the same number. */
  maxModules: 512,
  /** A shape's size parameter; the root declares one call per unit. */
  maxSize: 24,
  maxFixtureBytes: 1_048_576,
  maxPageBytes: 131_072,
  maxTableRows: 64,
});

export type Args = Record<string, Record<string, JsonValue>>;
export type Responses = Record<string, JsonValue>;
/** Source files keyed by project-relative path, with the entry and fixtures. */
export type GeneratedProject = { files: Record<string, string>; entry: string; args: Args; responses: Responses };

// ------------------------------------------------------------ fixtures ---

function fixtureObject(value: unknown, what: string): Record<string, JsonValue> {
  if (!isJsonValue(value) || value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${what} must be a JSON object`);
  return value;
}
/** Run arguments name input cells, each with an object of port values. */
export function parseArgs(value: unknown, what = "arguments"): Args {
  const root = fixtureObject(value, what), args: Args = {};
  for (const [cell, ports] of Object.entries(root)) args[cell] = fixtureObject(ports, `${what}.${cell}`);
  return args;
}
async function readFixture(path: string): Promise<unknown> {
  const text = await readFile(path, "utf8");
  if (utf8Length(text) > SCALING_BOUNDS.maxFixtureBytes) throw new Error(`${path} exceeds ${SCALING_BOUNDS.maxFixtureBytes} bytes`);
  return JSON.parse(text) as unknown;
}

// ------------------------------------------------------ example projects ---

export type ExampleProject = { id: string; entry: string; root: string; args: string; responses: string | null };
/** Every example project entry point with its committed run fixture. Paths are
 * relative to `examples/source/projects`; the support queue imports the task
 * planner's files, so it loads with the wider root. */
export const EXAMPLE_PROJECTS: readonly ExampleProject[] = Object.freeze([
  { id: "task-planning/main", entry: "task-planning/main.algal", root: "task-planning", args: "task-planning/main.args.json", responses: "task-planning/main.responses.json" },
  { id: "task-planning/inspect_task", entry: "task-planning/inspect_task.algal", root: "task-planning", args: "task-planning/inspect_task.args.json", responses: "task-planning/inspect_task.responses.json" },
  { id: "support-queue/main", entry: "support-queue/main.algal", root: ".", args: "support-queue/main.args.json", responses: "support-queue/main.responses.json" },
  { id: "typed-tasks/scores", entry: "typed-tasks/scores.algal", root: "typed-tasks", args: "typed-tasks/scores.args.json", responses: null },
  { id: "inbox/inbox", entry: "inbox/inbox.algal", root: "inbox", args: "inbox/inbox.args.json", responses: "inbox/inbox.responses.json" },
  { id: "ratios/ratios", entry: "ratios/ratios.algal", root: "ratios", args: "ratios/ratios.args.json", responses: null },
].map(item => Object.freeze(item)));

// ------------------------------------------------------ generated shapes ---

export type ShapeLimit = "instances" | "cells" | "edges" | "bytes" | "import depth" | "executor attempts";
export type Shape = {
  id: string;
  /** What one unit of size adds. */
  unit: string;
  /** The ceiling this shape is built to reach first. */
  target: ShapeLimit;
  /** Largest size tried while growing. */
  max: number;
  /** Sizes measured beyond the growth steps, such as the deepest legal chain. */
  extra: readonly number[];
  generate(size: number, fixtures: ShapeFixtures): GeneratedProject;
};
/** The task planner files that `planner-fan-in` reuses, read once. */
export type ShapeFixtures = { planner: Readonly<Record<string, string>> };
const PLANNER_FILES = ["plan_task.algal", "score_task.algal", "choose_action.algal", "present_task.algal", "lib/clamp.algal"] as const;
export async function loadShapeFixtures(repository = REPOSITORY): Promise<ShapeFixtures> {
  const planner: Record<string, string> = {};
  for (const file of PLANNER_FILES) planner[file] = await readFile(join(repository, PROJECTS, "task-planning", file), "utf8");
  return { planner: Object.freeze(planner) };
}

const numbered = (count: number) => Array.from({ length: count }, (_, index) => index + 1);
function source(parts: { imports?: [string, string][]; records?: string[]; header: string; budget: string; bindings?: string[]; result: string }): string {
  return [
    ...(parts.imports ?? []).map(([alias, path]) => `import ${alias} from "${path}"`),
    ...(parts.imports?.length ? [""] : []),
    ...(parts.records ?? []).flatMap(record => [record, ""]),
    `program ${parts.header} {`,
    `  budget { ${parts.budget} }`,
    "",
    ...(parts.bindings ?? []).map(binding => `  let ${binding}`),
    `  return ${parts.result}`,
    "}",
    "",
  ].join("\n");
}
const budget = (depth: number, extra = "") => `max_agent_calls: 0${depth ? `, max_depth: ${depth}` : ""}${extra}`;
/** Roots declare the largest step and work allowances, so a run stops only at
 * the 1,024-step ceiling. */
const ROOT = ", max_steps: 1024, max_work: 100000000";

const TABLES = ["priority", "status", "queue", "region", "channel", "tier", "window", "owner"] as const;
/** Instances: parameterless lookup tables cost one cell per call and one per
 * table, so the instance ceiling is reached before the cell ceiling. */
const tableFanIn: Shape = {
  id: "table-fan-in", unit: "section, each 12 stages that call 8 shared lookup tables", target: "instances", max: SCALING_BOUNDS.maxSize, extra: [],
  generate(size) {
    const files: Record<string, string> = {};
    for (const [index, name] of TABLES.entries()) {
      files[`tables/${name}.algal`] = source({ header: `${name}() -> json`, budget: budget(0), result: `{ name: "${name}", low: ${index}, high: ${index + 10} }` });
    }
    files["stage.algal"] = source({
      imports: TABLES.map(name => [name, `./tables/${name}.algal`]), header: "stage(item: json) -> json", budget: budget(1),
      bindings: TABLES.map(name => `${name}_table = call ${name} using {}`),
      result: `{ item: item, ${TABLES.map(name => `${name}: ${name}_table`).join(", ")} }`,
    });
    files["section.algal"] = source({
      imports: [["stage", "./stage.algal"]], header: "section(items: json) -> json", budget: budget(2),
      bindings: numbered(12).map(i => `stage_${i} = call stage using { item: items.a${i} }`), result: `[${numbered(12).map(i => `stage_${i}`).join(", ")}]`,
    });
    files["board.algal"] = source({
      imports: [["section", "./section.algal"]], header: "board(sections: json) -> json", budget: budget(3, ROOT),
      bindings: numbered(size).map(i => `section_${i} = call section using { items: sections.s${i} }`), result: `[${numbered(size).map(i => `section_${i}`).join(", ")}]`,
    });
    const section = Object.fromEntries(numbered(12).map(i => [`a${i}`, i]));
    return { files, entry: "board.algal", args: { input: { sections: Object.fromEntries(numbered(size).map(i => [`s${i}`, section])) } }, responses: {} };
  },
};

/** Cells: the task planner's own files, unchanged, called 16 times per batch. */
const plannerFanIn: Shape = {
  id: "planner-fan-in", unit: "batch of 16 calls to the task planner's plan_task", target: "cells", max: SCALING_BOUNDS.maxSize, extra: [],
  generate(size, fixtures) {
    const files: Record<string, string> = {};
    for (const file of PLANNER_FILES) {
      const text = fixtures.planner[file];
      if (text === undefined) throw new Error(`missing planner fixture ${file}`);
      files[`planner/${file}`] = text;
    }
    files["batch.algal"] = source({
      imports: [["plan_task", "./planner/plan_task.algal"]], header: "batch(tasks: json, weights: json) -> json", budget: budget(3),
      bindings: numbered(16).map(i => `plan_${i} = call plan_task using { task: tasks.t${i}, weights: weights }`), result: `[${numbered(16).map(i => `plan_${i}`).join(", ")}]`,
    });
    files["board.algal"] = source({
      imports: [["batch", "./batch.algal"]], header: "board(groups: json, weights: json) -> json", budget: budget(4, ROOT),
      bindings: numbered(size).map(i => `batch_${i} = call batch using { tasks: groups.g${i}, weights: weights }`), result: `[${numbered(size).map(i => `batch_${i}`).join(", ")}]`,
    });
    const tasks = Object.fromEntries(numbered(16).map(i => [`t${i}`, { id: `task-${i}`, title: `Task ${i}`, status: i % 5 === 0 ? "done" : "open", urgency: i % 6, impact: (i * 2) % 6 }]));
    return { files, entry: "board.algal", args: { input: { groups: Object.fromEntries(numbered(size).map(i => [`g${i}`, tasks])), weights: { urgency: 2, impact: 1 } } }, responses: {} };
  },
};

/** Edges: each metric reads all twelve readings, so one scorecard has 20
 * cells and 234 edges, and its twelve-argument calls add more edges than cells. */
const denseScorecard: Shape = {
  id: "dense-scorecard", unit: "mixer, each 4 calls to a 12-input scorecard", target: "edges", max: SCALING_BOUNDS.maxSize, extra: [],
  generate(size) {
    const readings = numbered(12).map(i => `p${i}`);
    const files: Record<string, string> = {};
    files["scorecard.algal"] = source({
      header: `scorecard(${readings.map(name => `${name}: json`).join(", ")}) -> json`, budget: budget(0),
      bindings: numbered(18).map(i => `metric_${i} = (${readings.join(" + ")}) * ${i}`),
      result: `{ ${numbered(18).map(i => `metric_${i}: metric_${i}`).join(", ")} }`,
    });
    files["mixer.algal"] = source({
      imports: [["scorecard", "./scorecard.algal"]], header: "mixer(readings: json) -> json", budget: budget(1),
      bindings: numbered(4).map(i => `card_${i} = call scorecard using { ${readings.map((name, index) => `${name}: readings.r${index + 1}`).join(", ")} }`),
      result: `[${numbered(4).map(i => `card_${i}`).join(", ")}]`,
    });
    files["board.algal"] = source({
      imports: [["mixer", "./mixer.algal"]], header: "board(sensors: json) -> json", budget: budget(2, ROOT),
      bindings: numbered(size).map(i => `mix_${i} = call mixer using { readings: sensors.m${i} }`), result: `[${numbered(size).map(i => `mix_${i}`).join(", ")}]`,
    });
    const sensor = Object.fromEntries(numbered(12).map(i => [`r${i}`, i]));
    return { files, entry: "board.algal", args: { input: { sensors: Object.fromEntries(numbered(size).map(i => [`m${i}`, sensor])) } }, responses: {} };
  },
};

const longName = (prefix: string, index: number) => `${prefix}_${String(index).padStart(2, "0")}_abcdefghijklmnopqrstuvwxyz0123456789`.slice(0, 40);
const LINE_FIELDS = numbered(32).map(i => longName("line", i));
const ORDER_FIELDS = numbered(32).map(i => longName("order", i));
/** Bytes: a record parameter's port carries the record's lowered schema. The
 * 32-field `Order` of 32-field `Line` records lowers to about 47 KB, and each of
 * the sixteen parameters carries a copy, so a 3.7 KB file compiles to a
 * manifest of about 770 KB. Each comparison reads at most four orders, which
 * keeps one expression's inputs under the 256 KiB evaluation limit. */
const recordOrders: Shape = {
  id: "record-orders", unit: "region, each 4 desks of 3 calls to a 16-order check", target: "bytes", max: SCALING_BOUNDS.maxSize, extra: [],
  generate(size) {
    const orders = numbered(16).map(i => `o${i}`);
    const files: Record<string, string> = {};
    files["validate.algal"] = source({
      records: [
        `record Line {\n${LINE_FIELDS.map(name => `  ${name}: json,`).join("\n")}\n}`,
        `record Order {\n${ORDER_FIELDS.map(name => `  ${name}: Line,`).join("\n")}\n}`,
      ],
      header: `validate(${orders.map(name => `${name}: Order`).join(", ")}) -> json`, budget: budget(0),
      bindings: numbered(5).map(group => `same_${group} = ${orders.slice(3 * group - 2, 3 * group + 1).map(name => `o1 == ${name}`).join(" && ")}`),
      result: `{ agreed: ${numbered(5).map(group => `same_${group}`).join(" && ")} }`,
    });
    files["desk.algal"] = source({
      imports: [["validate", "./validate.algal"]], header: "desk(orders: json) -> json", budget: budget(1),
      bindings: numbered(3).map(i => `check_${i} = call validate using { ${orders.map(name => `${name}: orders`).join(", ")} }`),
      result: `[${numbered(3).map(i => `check_${i}`).join(", ")}]`,
    });
    files["region.algal"] = source({
      imports: [["desk", "./desk.algal"]], header: "region(orders: json) -> json", budget: budget(2),
      bindings: numbered(4).map(i => `desk_${i} = call desk using { orders: orders }`), result: `[${numbered(4).map(i => `desk_${i}`).join(", ")}]`,
    });
    files["ledger.algal"] = source({
      imports: [["region", "./region.algal"]], header: "ledger(order: json) -> json", budget: budget(3, ROOT),
      bindings: numbered(size).map(i => `region_${i} = call region using { orders: order }`), result: `[${numbered(size).map(i => `region_${i}`).join(", ")}]`,
    });
    const line = Object.fromEntries(LINE_FIELDS.map((name, index) => [name, index]));
    return { files, entry: "ledger.algal", args: { input: { order: Object.fromEntries(ORDER_FIELDS.map(name => [name, line])) } }, responses: {} };
  },
};

/** Import depth: each file calls the next once. Size counts files. */
const importChain: Shape = {
  id: "import-chain", unit: "file, each calling the next", target: "import depth", max: SOURCE_PROJECT_BOUNDS.maxImportDepth + 2, extra: [],
  generate(size) {
    const files: Record<string, string> = {};
    for (const k of numbered(size)) {
      files[`link_${k}.algal`] = k === size
        ? source({ header: `link_${k}(value: json) -> json`, budget: budget(0), result: "value + 1" })
        : source({ imports: [["next", `./link_${k + 1}.algal`]], header: `link_${k}(value: json) -> json`, budget: budget(Math.min(8, size - k), k === 1 ? ROOT : ""), result: "call next using { value: value + 1 }" });
    }
    return { files, entry: "link_1.algal", args: { input: { value: 0 } }, responses: {} };
  },
};

/** A compact graph: each level calls the next 24 times, so nine small files
 * would expand to more than 10^11 instances. Size counts levels. */
const compactDag: Shape = {
  id: "compact-dag", unit: "level, each calling the next 24 times", target: "cells", max: SOURCE_PROJECT_BOUNDS.maxImportDepth + 1,
  extra: [SOURCE_PROJECT_BOUNDS.maxImportDepth + 1],
  generate(size) {
    const files: Record<string, string> = {};
    for (const k of numbered(size)) {
      files[`level_${k}.algal`] = k === size
        ? source({ header: `level_${k}(value: json) -> json`, budget: budget(0), result: "value * 2" })
        : source({
          imports: [["next", `./level_${k + 1}.algal`]], header: `level_${k}(value: json) -> json`, budget: budget(size - k, k === 1 ? ROOT : ""),
          bindings: numbered(24).map(i => `branch_${i} = call next using { value: value + ${i} }`), result: `[${numbered(24).map(i => `branch_${i}`).join(", ")}]`,
        });
    }
    return { files, entry: "level_1.algal", args: { input: { value: 1 } }, responses: {} };
  },
};

/** Executor attempts: one model call per draft, eight drafts per batch. The
 * root may declare at most 64 attempts. */
const drafts: Shape = {
  id: "drafts", unit: "batch of 8 calls to a one-model-call draft", target: "executor attempts", max: SCALING_BOUNDS.maxSize, extra: [],
  generate(size) {
    const files: Record<string, string> = {};
    files["draft.algal"] = source({ header: "draft(message: text) -> text", budget: "max_agent_calls: 1", result: `generate "Draft a short, polite reply." using { message: message }` });
    files["batch.algal"] = source({
      imports: [["draft", "./draft.algal"]], header: "batch(messages: json) -> json", budget: "max_agent_calls: 8, max_depth: 1",
      bindings: numbered(8).map(i => `reply_${i} = call draft using { message: messages.m${i} }`), result: `[${numbered(8).map(i => `reply_${i}`).join(", ")}]`,
    });
    files["inbox.algal"] = source({
      imports: [["batch", "./batch.algal"]], header: "inbox(mail: json) -> json", budget: `max_agent_calls: ${Math.min(64, 8 * size)}, max_depth: 2${ROOT}`,
      bindings: numbered(size).map(i => `batch_${i} = call batch using { messages: mail.b${i} }`), result: `[${numbered(size).map(i => `batch_${i}`).join(", ")}]`,
    });
    const mail = Object.fromEntries(numbered(size).map(b => [`b${b}`, Object.fromEntries(numbered(8).map(m => [`m${m}`, `Message ${b}.${m}`]))]));
    return { files, entry: "inbox.algal", args: { input: { mail } }, responses: { result: numbered(8 * size).map(i => `Reply ${i}`) } };
  },
};

export const SHAPES: readonly Shape[] = Object.freeze([tableFanIn, plannerFanIn, denseScorecard, recordOrders, importChain, compactDag, drafts]);
export function shape(id: string): Shape {
  const found = SHAPES.find(item => item.id === id);
  if (!found) throw new Error(`unknown shape ${JSON.stringify(id)}`);
  return found;
}

// ------------------------------------------------------- materialization ---

/** A project on disk, ready for the same loader the CLI uses. */
export type Materialized = { id: string; size: number | null; entry: string; root: string; files: Record<string, string>; args: Args; responses: Responses; cleanup(): Promise<void> };

export async function materializeExample(project: ExampleProject, repository = REPOSITORY): Promise<Materialized> {
  const base = join(repository, PROJECTS);
  const args = parseArgs(await readFixture(join(base, project.args)), project.args);
  const responses = project.responses === null ? {} : fixtureObject(await readFixture(join(base, project.responses)), project.responses);
  return { id: project.id, size: null, entry: join(base, project.entry), root: join(base, project.root), files: {}, args, responses, cleanup: async () => undefined };
}

export async function materializeShape(item: Shape, size: number, fixtures: ShapeFixtures): Promise<Materialized> {
  if (!Number.isSafeInteger(size) || size < 1 || size > item.max) throw new Error(`${item.id} size must be an integer from 1 through ${item.max}`);
  const generated = item.generate(size, fixtures);
  if (Object.keys(generated.files).length > SOURCE_PROJECT_BOUNDS.maxFiles) throw new Error(`${item.id} generates more than ${SOURCE_PROJECT_BOUNDS.maxFiles} files`);
  const root = await mkdtemp(join(tmpdir(), `algal-scale-${item.id}-`));
  try {
    for (const [path, text] of Object.entries(generated.files)) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), text);
    }
  } catch (error) { await rm(root, { recursive: true, force: true }); throw error; }
  return { id: item.id, size, entry: join(root, generated.entry), root, files: generated.files, args: generated.args, responses: generated.responses, cleanup: () => rm(root, { recursive: true, force: true }) };
}

// ------------------------------------------------------ expanded structure ---

type Node = { cells: number; edges: number; bytes: number; children: Digest[] };
export type Totals = { instances: number; cells: number; edges: number; bytes: number; /** deepest embedding below the root, root at zero */ depth: number };
export type Closure = { root: Digest; nodes: ReadonlyMap<Digest, Node> };

/** Read every distinct manifest reachable from the root once. */
export async function closure(root: OrganismManifest, store: MemoryStore): Promise<Closure> {
  const nodes = new Map<Digest, Node>();
  const rootDigest = digestCanonical(manifestToJson(root));
  const pending: [Digest, OrganismManifest][] = [[rootDigest, root]];
  while (pending.length) {
    const [digest, manifest] = pending.pop()!;
    if (nodes.has(digest)) continue;
    if (nodes.size >= SCALING_BOUNDS.maxModules) throw new Error(`closure exceeds ${SCALING_BOUNDS.maxModules} manifests`);
    const children = manifest.cells.flatMap(cell => cell.kind === "organism" || cell.kind === "repeat" || cell.kind === "each" ? [cell.manifest as Digest] : []);
    nodes.set(digest, { cells: manifest.cells.length, edges: manifest.edges.length, bytes: canonicalBytes(manifestToJson(manifest)), children });
    for (const child of new Set(children)) {
      if (nodes.has(child)) continue;
      const found = await store.getManifest(child);
      if (!found) throw new Error(`manifest ${child} is missing from the closure`);
      pending.push([child, found]);
    }
  }
  return { root: rootDigest, nodes };
}

/** Totals over the complete expansion, computed once per distinct manifest,
 * so a graph far beyond the ceilings is measured without expanding it. */
export function expandedTotals(graph: Closure): (digest: Digest) => Totals {
  const memo = new Map<Digest, Totals>();
  const visit = (digest: Digest): Totals => {
    const cached = memo.get(digest);
    if (cached) return cached;
    const node = graph.nodes.get(digest);
    if (!node) throw new Error(`manifest ${digest} is missing from the closure`);
    const total: Totals = { instances: 1, cells: node.cells, edges: node.edges, bytes: node.bytes, depth: 0 };
    for (const child of node.children) {
      const sub = visit(child);
      total.instances += sub.instances; total.cells += sub.cells; total.edges += sub.edges; total.bytes += sub.bytes;
      total.depth = Math.max(total.depth, sub.depth + 1);
    }
    if (![total.instances, total.cells, total.edges, total.bytes].every(Number.isSafeInteger)) throw new Error("expanded totals exceed exact integer arithmetic");
    memo.set(digest, total);
    return total;
  };
  return visit;
}

export type AdmissionLimit = "instances" | "cells" | "edges" | "bytes" | "depth";
export type Counters = { instances: number; cells: number; edges: number; bytes: number };
export type AdmissionVerdict =
  | { accepted: true; used: Counters }
  | { accepted: false; exceeded: AdmissionLimit[]; /** occurrence that failed, counting the root as 1 */ visited: number; module: Digest; before: Counters };

/** Replay graph admission's order and checks (`compileWithBudget` in
 * src/graph.ts): a pre-order walk that checks depth, then the three counts,
 * then bytes, before resolving any child. A child subtree that fits entirely
 * is added at once; counters only grow, so no check inside it could fail. */
export function simulateAdmission(graph: Closure): AdmissionVerdict {
  const totals = expandedTotals(graph);
  const used: Counters = { instances: 0, cells: 0, edges: 0, bytes: 0 };
  const limits = { instances: COMPILE_BOUNDS.maxInstances, cells: COMPILE_BOUNDS.maxCells, edges: COMPILE_BOUNDS.maxEdges, bytes: COMPILE_BOUNDS.maxManifestBytes };
  const visit = (digest: Digest, depth: number): Exclude<AdmissionVerdict, { accepted: true }> | undefined => {
    if (depth > COMPILE_BOUNDS.maxDepth) return { accepted: false, exceeded: ["depth"], visited: used.instances + 1, module: digest, before: { ...used } };
    const node = graph.nodes.get(digest)!;
    const next = { instances: used.instances + 1, cells: used.cells + node.cells, edges: used.edges + node.edges };
    const counts = (["instances", "cells", "edges"] as const).filter(key => next[key] > limits[key]);
    if (counts.length) return { accepted: false, exceeded: counts, visited: next.instances, module: digest, before: { ...used } };
    if (used.bytes + node.bytes > limits.bytes) return { accepted: false, exceeded: ["bytes"], visited: next.instances, module: digest, before: { ...used } };
    Object.assign(used, next, { bytes: used.bytes + node.bytes });
    for (const child of node.children) {
      const sub = totals(child);
      if (depth + 1 + sub.depth <= COMPILE_BOUNDS.maxDepth && used.instances + sub.instances <= limits.instances && used.cells + sub.cells <= limits.cells
        && used.edges + sub.edges <= limits.edges && used.bytes + sub.bytes <= limits.bytes) {
        used.instances += sub.instances; used.cells += sub.cells; used.edges += sub.edges; used.bytes += sub.bytes;
        continue;
      }
      const verdict = visit(child, depth + 1);
      if (verdict) return verdict;
    }
    return undefined;
  };
  return visit(graph.root, 0) ?? { accepted: true, used: { ...used } };
}

// ------------------------------------------------------------- evaluation ---

/** Counts child resolutions during admission, as src/graph-admission.test.ts does. */
export class CountingStore extends MemoryStore {
  reads = 0;
  override async getManifest(digest: Digest) {
    this.reads++;
    return super.getManifest(digest);
  }
}

export type SourceSize = { files: number; bytes: number };
export type Structure = SourceSize & {
  modules: number; callSites: number;
  instances: number; cells: number; edges: number; manifestBytes: number; depth: number;
  bundleBytes: number; attempts: number; requiredDepth: number;
};
export type RunSummary = { outcome: RunReceipt["outcome"]; failure: string | null; steps: number; attempts: number; units: number };
/** The run's failure message, kept in the JSON record beside the summary. */
export const failureReason = (receipt: RunReceipt): string | null => receipt.failure === undefined ? null : receipt.failure.message.slice(0, 200);
export type Accepted = { accepted: true; structure: Structure; project: SourceProject; bundle: Bundle };
export type Rejection = {
  accepted: false;
  /** `source`: the loader or compiler refused the files; `check`: graph admission refused the expansion. */
  stage: "source" | "check";
  code: string; message: string;
  limit: ShapeLimit | AdmissionLimit | "other";
  source: SourceSize;
  /** Present when the source compiled and graph admission refused it. */
  check?: {
    modules: number; callSites: number; bundleBytes: number; attempts: number; requiredDepth: number;
    /** Totals of the complete expansion, which admission never builds. */
    expanded: Totals;
    exceeded: AdmissionLimit[]; visited: number; reads: number; before: Counters;
  };
};
export type Evaluation = Accepted | Rejection;

const sourceSize = (files: Readonly<Record<string, string>>): SourceSize =>
  ({ files: Object.keys(files).length, bytes: Object.values(files).reduce((sum, text) => sum + utf8Length(text), 0) });
function sourceLimit(message: string): ShapeLimit | "other" {
  if (/import depth exceeds/.test(message)) return "import depth";
  if (/explicit effects exceed max_agent_calls/.test(message)) return "executor attempts";
  return "other";
}
const admissionMessage = (exceeded: readonly AdmissionLimit[]) => exceeded[0] === "depth" ? `embedding chain exceeds compile depth ${COMPILE_BOUNDS.maxDepth}`
  : exceeded[0] === "bytes" ? "expanded compilation manifest byte budget exceeded" : "expanded compilation count budget exceeded";

/** Load and check one project as `algal compile` does, then describe it. A
 * refusal is a result, not an error; any disagreement between graph admission
 * and its simulation is an error. */
export async function evaluate(input: Materialized): Promise<Evaluation> {
  let project: SourceProject;
  try { project = await loadSourceProject(input.entry, { root: input.root }); }
  catch (error) {
    if (!(error instanceof SourceError)) throw error;
    return { accepted: false, stage: "source", code: error.code, message: error.message, limit: sourceLimit(error.message), source: sourceSize(input.files) };
  }
  const store = new CountingStore();
  for (const module of project.modules) await store.putManifest(module);
  let refusal: AlgalError | undefined;
  try { await compileOrganism(project.manifest, builtinRegistry(), store); }
  catch (error) { if (!(error instanceof AlgalError)) throw error; refusal = error; }
  const reads = store.reads;
  const graph = await closure(project.manifest, store);
  const verdict = simulateAdmission(graph);
  const bundle = await packOrganism(project.manifest, store);
  const common = {
    source: sourceSize(project.sources), modules: Object.keys(bundle.manifests).length, callSites: project.project.calls.length,
    bundleBytes: utf8Length(canonicalize(bundle as unknown as JsonValue)), attempts: project.analysis.maxAgentCalls, requiredDepth: project.analysis.requiredDepth,
  };
  const total = expandedTotals(graph)(graph.root);
  if (refusal === undefined) {
    if (!verdict.accepted) throw new Error(`${input.id}: admission accepted a graph its simulation refuses on ${verdict.exceeded.join(", ")}`);
    const { source, ...rest } = common;
    return { accepted: true, project, bundle, structure: { ...source, ...rest, instances: total.instances, cells: total.cells, edges: total.edges, manifestBytes: total.bytes, depth: total.depth } };
  }
  if (verdict.accepted) throw new Error(`${input.id}: admission refused (${refusal.message}) a graph its simulation accepts`);
  if (refusal.message !== admissionMessage(verdict.exceeded) || reads !== verdict.visited - 1) {
    throw new Error(`${input.id}: admission refused "${refusal.message}" after ${reads} reads; the simulation expects "${admissionMessage(verdict.exceeded)}" after ${verdict.visited - 1}`);
  }
  const { source, ...rest } = common;
  return {
    accepted: false, stage: "check", code: refusal.code, message: refusal.message, limit: verdict.exceeded[0]!, source,
    check: { ...rest, expanded: total, exceeded: verdict.exceeded, visited: verdict.visited, reads, before: verdict.before },
  };
}

/** Install a checked project's closure in a fresh store. */
export async function installed(project: SourceProject): Promise<MemoryStore> {
  const store = new MemoryStore();
  for (const module of project.modules) await store.putManifest(module);
  return store;
}
export async function referenceRun(project: SourceProject, input: Pick<Materialized, "args" | "responses">): Promise<RunReceipt> {
  return runOrganism({ manifest: project.manifest, args: input.args, store: await installed(project), fns: builtinRegistry(), executors: [scriptedExecutor(input.responses)] });
}
export const summarizeRun = (receipt: RunReceipt): RunSummary => ({
  outcome: receipt.outcome, failure: receipt.failure?.code ?? null,
  steps: receipt.work.steps, attempts: receipt.work.agentCalls, units: receipt.work.units,
});
/** A run whose minted evidence would exceed the receipt and store envelopes
 * ends in a thrown `BUDGET_EXHAUSTED` that still carries its measured work. */
const unmintableRun = (error: unknown): RunSummary | null => {
  if (!(error instanceof AlgalError) || error.code !== "BUDGET_EXHAUSTED") return null;
  const work = (error.details as { work?: unknown } | undefined)?.work;
  if (typeof work !== "object" || work === null) return null;
  const { steps, agentCalls, units } = work as { steps?: unknown; agentCalls?: unknown; units?: unknown };
  if (typeof steps !== "number" || typeof agentCalls !== "number" || typeof units !== "number") return null;
  return { outcome: "failed", failure: error.code, steps, attempts: agentCalls, units };
};
export type MeasuredRun = { summary: RunSummary; receipt: RunReceipt | null; failure: string | null };
export async function measuredRun(project: SourceProject, input: Pick<Materialized, "args" | "responses">): Promise<MeasuredRun> {
  try {
    const receipt = await referenceRun(project, input);
    return { summary: summarizeRun(receipt), receipt, failure: failureReason(receipt) };
  } catch (error) {
    const summary = unmintableRun(error);
    if (summary) return { summary, receipt: null, failure: error instanceof Error ? error.message.slice(0, 200) : null };
    throw error;
  }
}

// ------------------------------------------------------------------ growth ---

/** Sizes 1, 2, 4, ... up to the shape's maximum until the first refusal, then
 * the exact boundary by bisection. Returns the growth sizes that were accepted,
 * the largest accepted size, the smallest refused size, and any extra sizes. */
export async function growthSizes(item: Shape, fixtures: ShapeFixtures): Promise<{ sizes: number[]; largestAccepted: number | null; smallestRefused: number | null }> {
  const accepted = new Map<number, boolean>();
  const admits = async (size: number): Promise<boolean> => {
    const known = accepted.get(size);
    if (known !== undefined) return known;
    const input = await materializeShape(item, size, fixtures);
    try { const result = (await evaluate(input)).accepted; accepted.set(size, result); return result; }
    finally { await input.cleanup(); }
  };
  const steps: number[] = [];
  for (let size = 1; ; size = Math.min(size * 2, item.max)) {
    steps.push(size);
    if (!await admits(size) || size === item.max) break;
  }
  const refused = steps.find(size => accepted.get(size) === false) ?? null;
  let low = refused === null ? steps.at(-1)! : Math.max(0, ...steps.filter(size => size < refused));
  let high = refused;
  if (high !== null) {
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (await admits(middle)) low = middle; else high = middle;
    }
  }
  const largest = low >= 1 ? low : null;
  const sizes = [...new Set([...steps.filter(size => accepted.get(size)), ...(largest === null ? [] : [largest]), ...(high === null ? [] : [high]), ...item.extra])].sort((a, b) => a - b);
  return { sizes, largestAccepted: largest, smallestRefused: high };
}

// ------------------------------------------------------- published tables ---

const STRUCTURE_COLUMNS = ["Files", "Source bytes", "Modules", "Call sites", "Instances", "Cells", "Edges", "Manifest bytes", "Bundle bytes", "Attempts", "Depth", "Steps", "Work", "Run"] as const;
export const EXAMPLE_COLUMNS = ["Program", ...STRUCTURE_COLUMNS] as const;
export const SHAPE_COLUMNS = ["Program", "Size", ...STRUCTURE_COLUMNS] as const;
export const REFUSAL_COLUMNS = ["Program", "Size", "Limit", "Message", "Instances checked", "Full expansion"] as const;
export const TABLE_HEADINGS = Object.freeze({ examples: "Example projects", shapes: "Programs that share helpers", refusals: "Where compilation stops" });
const TEXT_COLUMNS = new Set(["Program", "Run", "Limit", "Message"]);

const number = (value: number) => value.toLocaleString("en-US");
const code = (value: string) => `\`${value}\``;
/** A failed run shows its error code; its step count shows which budget ended it. */
const runCell = (run: RunSummary) => run.outcome === "complete" ? "complete" : code(run.failure ?? run.outcome);
const structureCells = (structure: Structure, run: RunSummary) => [
  ...[structure.files, structure.bytes, structure.modules, structure.callSites, structure.instances, structure.cells, structure.edges,
    structure.manifestBytes, structure.bundleBytes, structure.attempts, structure.requiredDepth, run.steps, run.units].map(number),
  runCell(run),
];
export const exampleRow = (id: string, structure: Structure, run: RunSummary): string[] => [code(id), ...structureCells(structure, run)];
export const shapeRow = (id: string, size: number, structure: Structure, run: RunSummary): string[] => [code(id), number(size), ...structureCells(structure, run)];
const LIMIT_TEXT: Record<Rejection["limit"], string> = {
  instances: "1,024 instances", cells: "4,096 cells", edges: "16,384 edges", bytes: "64 MiB of manifest JSON", depth: "compile depth 64",
  "import depth": "8 import levels", "executor attempts": "64 executor attempts", other: "other",
};
/** "Checked" is how many instances admission accepted before refusing; a
 * source-stage refusal happens before any manifest exists. */
export function refusalRow(id: string, size: number, rejection: Rejection): string[] {
  const message = rejection.stage === "check" ? rejection.message : rejection.message.replace(/^.*?:\d+:\d+: /, "");
  return [code(id), number(size), LIMIT_TEXT[rejection.limit], code(message),
    rejection.check ? number(rejection.check.visited - 1) : "none", rejection.check ? number(rejection.check.expanded.instances) : "not compiled"];
}
export const markdownRow = (cells: readonly string[]) => `| ${cells.join(" | ")} |`;
/** Text columns align left and numeric columns right. */
export const markdownTable = (columns: readonly string[], rows: readonly (readonly string[])[]) =>
  [markdownRow(columns), markdownRow(columns.map(column => TEXT_COLUMNS.has(column) ? "---" : "---:")), ...rows.map(markdownRow)].join("\n");

export type PublishedTable = { heading: string; columns: string[]; rows: string[][] };
/** Read the first table under each `## heading` of a page. Tables are data:
 * a heading must appear once, with exactly the expected columns. */
export function parsePublishedTable(page: unknown, heading: string, columns: readonly string[]): PublishedTable {
  if (typeof page !== "string") throw new Error("page must be text");
  if (utf8Length(page) > SCALING_BOUNDS.maxPageBytes) throw new Error(`page exceeds ${SCALING_BOUNDS.maxPageBytes} bytes`);
  const lines = page.split("\n");
  const starts = lines.flatMap((line, index) => line === `## ${heading}` ? [index] : []);
  if (starts.length !== 1) throw new Error(`page needs exactly one "## ${heading}" section`);
  let index = starts[0]! + 1;
  while (index < lines.length && !lines[index]!.startsWith("|") && !lines[index]!.startsWith("## ")) index++;
  if (index >= lines.length || !lines[index]!.startsWith("|")) throw new Error(`"## ${heading}" has no table`);
  const split = (line: string) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
  const header = split(lines[index]!);
  if (header.length !== columns.length || header.some((cell, column) => cell !== columns[column])) throw new Error(`"## ${heading}" columns must be ${columns.join(", ")}`);
  if (!/^\|(\s*-+:?\s*\|)+$/.test(lines[index + 1] ?? "")) throw new Error(`"## ${heading}" table needs a divider row`);
  const rows: string[][] = [];
  for (index += 2; index < lines.length && lines[index]!.startsWith("|"); index++) {
    if (rows.length >= SCALING_BOUNDS.maxTableRows) throw new Error(`"## ${heading}" has more than ${SCALING_BOUNDS.maxTableRows} rows`);
    const row = split(lines[index]!);
    if (row.length !== columns.length) throw new Error(`"## ${heading}" row ${rows.length + 1} has ${row.length} cells, not ${columns.length}`);
    rows.push(row);
  }
  if (!rows.length) throw new Error(`"## ${heading}" table has no rows`);
  return { heading, columns: [...header], rows };
}
/** A row's program id and, for generated shapes, its size. */
export function rowKey(row: readonly string[], sized: boolean): { id: string; size: number | null } {
  const id = /^`([a-z0-9/_-]{1,64})`$/.exec(row[0] ?? "")?.[1];
  if (id === undefined) throw new Error(`row program ${JSON.stringify(row[0])} must be one id in code`);
  if (!sized) return { id, size: null };
  const size = Number(row[1]);
  if (!/^[0-9]{1,2}$/.test(row[1] ?? "") || size < 1 || size > SCALING_BOUNDS.maxSize) throw new Error(`row ${id} size ${JSON.stringify(row[1])} must be an integer from 1 through ${SCALING_BOUNDS.maxSize}`);
  return { id, size };
}

const drift = (label: string, page: readonly string[], fresh: readonly string[]) =>
  markdownRow(page) === markdownRow(fresh) ? [] : [`${label}: page shows ${markdownRow(page)}; fresh compile gives ${markdownRow(fresh)}`];
function unique(table: PublishedTable, sized: boolean): { id: string; size: number | null; row: string[] }[] {
  const seen = new Set<string>();
  return table.rows.map(row => {
    const key = rowKey(row, sized), label = `${key.id}${key.size === null ? "" : ` ${key.size}`}`;
    if (seen.has(label)) throw new Error(`"## ${table.heading}" lists ${label} twice`);
    seen.add(label);
    return { ...key, row };
  });
}

/** Every example entry point appears once, and each row matches a fresh
 * compile and reference run. Returns one message per difference. */
export async function checkExampleRows(table: PublishedTable, repository = REPOSITORY): Promise<string[]> {
  const rows = unique(table, false), messages: string[] = [];
  for (const project of EXAMPLE_PROJECTS) if (!rows.some(row => row.id === project.id)) messages.push(`${project.id}: missing from "## ${table.heading}"`);
  for (const { id, row } of rows) {
    const project = EXAMPLE_PROJECTS.find(item => item.id === id);
    if (!project) { messages.push(`${id}: not an example project entry point`); continue; }
    const input = await materializeExample(project, repository), result = await evaluate(input);
    if (!result.accepted) { messages.push(`${id}: page shows a compiled project; compilation stops with "${result.message}"`); continue; }
    messages.push(...drift(id, row, exampleRow(id, result.structure, (await measuredRun(result.project, input)).summary)));
  }
  return messages;
}

/** Each generated row compiles and runs as shown. */
export async function checkShapeRows(table: PublishedTable, fixtures: ShapeFixtures): Promise<string[]> {
  const messages: string[] = [];
  for (const { id, size, row } of unique(table, true)) {
    const item = SHAPES.find(candidate => candidate.id === id);
    if (!item) { messages.push(`${id}: not a generated shape`); continue; }
    const input = await materializeShape(item, size!, fixtures);
    try {
      const result = await evaluate(input);
      if (!result.accepted) { messages.push(`${id} ${size}: page shows a compiled program; compilation stops with "${result.message}"`); continue; }
      messages.push(...drift(`${id} ${size}`, row, shapeRow(id, size!, result.structure, (await measuredRun(result.project, input)).summary)));
    } finally { await input.cleanup(); }
  }
  return messages;
}

/** Each refusal row stops where and how the page says. */
export async function checkRefusalRows(table: PublishedTable, fixtures: ShapeFixtures): Promise<string[]> {
  const messages: string[] = [];
  for (const { id, size, row } of unique(table, true)) {
    const item = SHAPES.find(candidate => candidate.id === id);
    if (!item) { messages.push(`${id}: not a generated shape`); continue; }
    const input = await materializeShape(item, size!, fixtures);
    try {
      const result = await evaluate(input);
      if (result.accepted) { messages.push(`${id} ${size}: page shows a refusal; the program compiles`); continue; }
      messages.push(...drift(`${id} ${size}`, row, refusalRow(id, size!, result)));
    } finally { await input.cleanup(); }
  }
  return messages;
}

/** Every shape shows its largest compiled size and, one unit larger, its first
 * refusal, so the two tables pin the exact boundary without a search. */
export function checkBoundaries(shapes: PublishedTable, refusals: PublishedTable): string[] {
  const accepted = unique(shapes, true), refused = unique(refusals, true), messages: string[] = [];
  for (const item of SHAPES) {
    const largest = Math.max(0, ...accepted.filter(row => row.id === item.id).map(row => row.size!));
    if (!largest) { messages.push(`${item.id}: missing from "## ${shapes.heading}"`); continue; }
    if (!refused.some(row => row.id === item.id && row.size === largest + 1)) messages.push(`${item.id}: "## ${refusals.heading}" needs size ${largest + 1}, one more than the largest compiled size ${largest}`);
  }
  return messages;
}
