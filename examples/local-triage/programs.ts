import { evalProgram } from "../../src/expr";
import { parseOrganismManifest, type OrganismManifest } from "../../src/contract";
import { applicationJson } from "../../src/application-contract";
import { canonicalize, type JsonValue } from "../../src/values";
import { DEFAULT_CONFIG, MAX_TASKS, object, parseConfig, parseTasks, parseAction, parseSession, type Config, type Revision, type Task, type Action, type Session, type View } from "./contract";

const get = (name: string, ...path: string[]): JsonValue => ["get", name, ...path];
const task = (field: string) => get("task", field);
export function orderProgram(config: Config): JsonValue {
  if (config.sort === "created") return get("tasks");
  const key: JsonValue = config.sort === "title" ? ["lower", task("title")] : ["if", ["eq", task("priority"), "high"], 0, ["if", ["eq", task("priority"), "normal"], 1, 2]];
  return ["map", ["sort", ["map", get("tasks"), "task", ["list", key, task("id"), get("task")]]], "ranked", ["get", "ranked", 2]];
}
function program(config: Config): JsonValue {
  const group: JsonValue = config.group === "none" ? "Tasks" : get("task", config.group);
  return { tasks: orderProgram(config), group: config.group, allowReopen: config.allowReopen, ordering: `Ordered by ${config.sort}; grouped by ${config.group}. ${config.sort === "created" ? "Retained insertion order." : "Equal keys use stable task ID order."}`, groups: ["unique", ["map", orderProgram(config), "task", group]] };
}
export function makeRevision(config: Config = DEFAULT_CONFIG, schemaVersion: 1 | 2 = 1): Revision {
  const checked = parseConfig(config);
  if (schemaVersion !== 1 && schemaVersion !== 2) throw new Error("Invalid schema version");
  if (schemaVersion === 1 && checked.group === "category") throw new Error("Category grouping needs schema v2");
  return { contract: "algal.triage-revision.v1", schemaVersion, config: checked, program: program(checked) };
}
export function parseRevision(input: unknown): Revision {
  const v = object(input, ["contract", "schemaVersion", "config", "program"]);
  if (v.contract !== "algal.triage-revision.v1" || (v.schemaVersion !== 1 && v.schemaVersion !== 2)) throw new Error("Invalid triage revision");
  const r = makeRevision(parseConfig(v.config), v.schemaVersion);
  // Bound untrusted data before recursive canonicalization.
  let nodes = 0;
  const inspect = (x: unknown, depth: number): void => { if (++nodes > 512 || depth > 16) throw new Error("Triage program bound"); if (x && typeof x === "object") { if (Object.keys(x).length > 64) throw new Error("Triage collection bound"); for (const y of Object.values(x)) inspect(y, depth + 1); } else if (typeof x === "string" ? x.length > 1024 : x !== null && typeof x !== "boolean" && !(typeof x === "number" && Number.isFinite(x))) throw new Error("Invalid program value"); };
  inspect(v.program, 0);
  if (canonicalize(applicationJson(v.program)) !== canonicalize(r.program)) throw new Error("Revision program must match admitted builder");
  return r;
}
export const UPDATE_PROGRAM: JsonValue = ["if", ["eq", get("action", "kind"), "add"], ["concat", get("tasks"), ["list", get("action", "task")]], ["map", get("tasks"), "task", ["if", ["eq", task("id"), get("action", "taskId")], ["if", ["eq", get("action", "kind"), "edit"], ["merge", get("task"), { title: get("action", "title"), priority: get("action", "priority"), category: get("action", "category") }], ["merge", get("task"), { status: ["if", ["eq", get("action", "kind"), "complete"], "done", "open"] }]], get("task")]]];
export function updateTasks(tasksInput: Task[], actionInput: Action, revision: Revision): Task[] {
  const tasks = parseTasks(tasksInput), action = parseAction(actionInput), r = parseRevision(revision);
  if (action.kind === "add") {
    if (tasks.length >= MAX_TASKS || tasks.some(t => t.id === action.task.id)) throw new Error("Task capacity or duplicate ID");
    if (r.schemaVersion === 1 && action.task.category !== "inbox") throw new Error("Category editing needs schema v2");
  } else {
    const target = tasks.find(t => t.id === action.taskId); if (!target) throw new Error("Unknown task");
    if (action.kind === "reopen" && (!r.config.allowReopen || target.status !== "done")) throw new Error("Reopen unavailable in this workflow/state");
    if (action.kind === "complete" && target.status !== "open") throw new Error("Task already complete");
    if (action.kind === "edit" && r.schemaVersion === 1 && action.category !== "inbox") throw new Error("Category editing needs schema v2");
  }
  const output = evalProgram(UPDATE_PROGRAM, { tasks, action }, 90_000); if (!output.ok) throw new Error(`Update failed: ${output.err.code}`);
  return parseTasks(output.value);
}
/** This presentation projection is an ALGAL expr execution, including filtering,
 * keyed groups and action availability. Draft fields never enter task facts. */
export function viewProgram(revision: Revision): JsonValue {
  const r = parseRevision(revision), c = r.config;
  const group: JsonValue = c.group === "none" ? "Tasks" : task(c.group);
  const filtered: JsonValue = ["filter", get("tasks"), "task", ["and", ["or", ["eq", get("session", "filter"), "all"], ["eq", task("status"), get("session", "filter")]], ["scontains", ["lower", task("title")], ["lower", get("session", "query")]]]];
  const row: JsonValue = { task: get("task"), actions: ["list", { kind: "edit", label: "Edit", enabled: true, reason: null }, { kind: "complete", label: "Complete", enabled: ["eq", task("status"), "open"], reason: ["if", ["eq", task("status"), "open"], null, "Already complete"] }, { kind: "reopen", label: "Reopen", enabled: ["and", c.allowReopen, ["eq", task("status"), "done"]], reason: ["if", c.allowReopen, ["if", ["eq", task("status"), "done"], null, "Already open"], "Reopening disabled by workflow"] }] };
  const fields: JsonValue[] = [{ name: "title", label: "Task", value: get("session", "draft", "title"), maxLength: 120, options: ["list"] }, { name: "priority", label: "Priority", value: get("session", "draft", "priority"), maxLength: 6, options: ["list", "high", "normal", "low"] }];
  if (r.schemaVersion === 2) fields.push({ name: "category", label: "Category", value: get("session", "draft", "category"), maxLength: 24, options: ["list"] });
  return ["let", "ordered", orderProgram(c), ["let", "visible", ["let", "tasks", get("ordered"), filtered], {
    kind: "triage", title: "Local triage", ordering: `Ordered by ${c.sort}; grouped by ${c.group}. ${c.sort === "created" ? "Retained insertion order." : "Equal keys use stable task ID order."}`,
    groups: ["map", ["unique", ["map", get("visible"), "task", group]], "group", { id: get("group"), label: get("group"), tasks: ["map", ["filter", get("visible"), "task", ["eq", group, get("group")]], "task", row] }],
    form: { kind: "form", id: "task-editor", fields: ["list", ...fields], submit: { label: ["if", ["isNull", get("session", "draft", "taskId")], "Add task", "Save task"], enabled: ["and", ["gt", ["slen", ["trim", get("session", "draft", "title")]], 0], ["if", ["isNull", get("session", "draft", "taskId")], ["lt", ["len", get("tasks")], MAX_TASKS], ["contains", ["map", get("tasks"), "task", task("id")], get("session", "draft", "taskId")]], ["gt", ["slen", ["trim", get("session", "draft", "category")]], 0]], reason: ["if", ["eq", ["len", get("tasks")], MAX_TASKS], "Task capacity reached; edits remain available", null] } },
    filters: ["list", ...["all", "open", "done"].map(value => ({ value, label: value === "all" ? "All tasks" : value === "open" ? "Open" : "Done", selected: ["eq", get("session", "filter"), value] }))],
  }]];
}
export function evaluateView(revision: Revision, tasks: Task[], session: Session): View {
  const output = evalProgram(viewProgram(revision), { tasks: parseTasks(tasks), session: parseSession(session) }, 90_000);
  if (!output.ok) throw new Error(`View failed: ${output.err.code}`);
  return output.value as unknown as View;
}
function manifest(name: string, ports: string[], program: JsonValue, output = "value", definition?: Revision): OrganismManifest {
  return parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:triage-${name}`, name: `Local triage ${name}`, budgets: { maxSteps: 8, maxAgentCalls: 0, maxWork: 100_000, maxContextBytes: 32768, maxOutputBytes: 32768, maxDepth: 4 }, interface: { inputs: Object.fromEntries(ports.map(port => [port, { cell: port, port: "value" }])), outputs: { [output]: { cell: "result", port: "out" } } }, cells: [...ports.map(port => ({ id: port, kind: "input", outputs: { value: "json" } })), ...(definition ? [{ id: "definition", kind: "const", outputs: { value: { type: "json", value: definition } } }] : []), { id: "result", kind: "expr", inputs: Object.fromEntries(ports.map(port => [port, "json"])), expr: { contract: "algal.expr.v1", program }, output: { kind: "json", schema: { type: name === "update" ? "array" : "object" } } }], edges: ports.map(port => ({ from: { cell: port, port: "value" }, to: { cell: "result", port } })) });
}
export function viewManifest(revision: Revision): OrganismManifest { const r = parseRevision(revision); return manifest("view", ["tasks", "session"], viewProgram(r), "value", r); }
export function updateManifest(): OrganismManifest { return manifest("update", ["tasks", "action"], UPDATE_PROGRAM); }
export function claimsManifest(schemaVersion: 1 | 2): OrganismManifest { return manifest(`claims-${schemaVersion}`, ["tasks"], { claims: ["map", get("tasks"), "task", { relation: "task", tuple: ["list", task("id"), task("title"), task("priority"), task("status"), ...(schemaVersion === 2 ? [task("category")] : [])], polarity: "supported" }] }); }
export function migrationManifest(): OrganismManifest { return manifest("migration", ["claims", "frontier"], { claims: ["map", get("claims"), "item", { relation: "task", tuple: ["concat", get("item", "claim", "tuple"), ["list", "inbox"]], polarity: "supported" }] }, "migrated"); }
