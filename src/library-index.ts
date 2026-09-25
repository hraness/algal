// Shared program catalog check. `docs/library.md` is parsed as data under
// fixed limits, then compared with fresh compiles: each entry from its own
// file, and every listed calling project under its declared source root.
// Nothing is fetched, installed, or executed; files are read only through the
// ordinary source loader, which rejects symlinks and paths outside its root.
import { lstat } from "node:fs/promises";
import { join } from "node:path";
import type { PortMap, PortType } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { createSourceDependencyReport, freezeDeep, type SourceDependencyReport } from "./source-dependencies";
import { createSourceLock, type SourceLock } from "./source-lock";
import { loadSourceProject } from "./source-project";
import { compareUtf8, utf8Length } from "./utf8";
import type { JsonValue } from "./values";

/** Catalog paths are relative to this directory, the widest source root a listed project may use. */
export const LIBRARY_INDEX_PROJECTS = "examples/source/projects";
export const LIBRARY_INDEX_BOUNDS = Object.freeze({
  /** UTF-8 bytes of the page; today's catalog is under 12 KiB. */
  maxBytes: 131_072,
  maxLines: 2_048,
  maxLineLength: 2_048,
  maxEntries: 32,
  maxApplications: 16,
  /** Links in one field or table cell: callers, dependencies, or tests. */
  maxLinks: 32,
  /** One field after its continuation lines are joined. */
  maxFieldLength: 4_096,
  maxPathLength: 256,
  /** Problems listed by one check; any beyond are counted in a final line. */
  maxProblems: 256,
});
export const LIBRARY_INDEX_FIELDS = Object.freeze([
  "Path", "Executable digest", "Interface digest", "Interface", "Depends on", "Inputs and result",
  "Rejected inputs", "Limits", "Callers", "Tests", "Compiler", "Maintainer", "Status",
] as const);
type FieldLabel = typeof LIBRARY_INDEX_FIELDS[number];

/** One entry point that calls listed programs, with the source root it loads under. */
export type LibraryIndexApplication = { readonly entry: string; readonly root: string; readonly purpose: string };
export type LibraryIndexEntry = {
  readonly name: string;
  /** Relative to `LIBRARY_INDEX_PROJECTS`; the first segment names the project. */
  readonly path: string;
  readonly digest: Digest;
  readonly interfaceDigest: Digest;
  readonly interface: string;
  readonly dependencies: readonly string[];
  readonly meaning: string;
  readonly rejected: string;
  readonly limits: string;
  readonly callers: readonly string[];
  /** Repository-relative test files. */
  readonly tests: readonly string[];
  readonly compiler: string;
  readonly maintainer: string;
  readonly status: string;
};
export type LibraryIndex = { readonly applications: readonly LibraryIndexApplication[]; readonly entries: readonly LibraryIndexEntry[] };

const invalid = (message: string): never => { throw new AlgalError("PARSE_FAILED", `library index: ${message}`); };
const exceeded = (message: string): never => { throw new AlgalError("BUDGET_EXHAUSTED", `library index: ${message}`); };
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
const DIGEST = /^`(sha256:[0-9a-f]{64})`$/;
const PROGRAM_NAME = /^`([a-z][a-z0-9_]{0,39})`$/;
const CODE = /^`([^`]+)`$/;
const LINK = /\[`([^`[\]]+)`\]\(([^()\s]+)\)/g;
const FIELD = /^- \*\*([^*]+):\*\* (.+)$/;
const LIST_ITEM = /^\s*([-*+]|\d+\.)\s/;

/** A relative path of plain segments: no empty, `.`, or `..` part, so joining it never leaves its base. */
function relativePath(value: string, suffix: string, what: string): string {
  if (value.length > LIBRARY_INDEX_BOUNDS.maxPathLength) exceeded(`${what} exceeds ${LIBRARY_INDEX_BOUNDS.maxPathLength} characters`);
  const parts = value.split("/");
  if (!value.endsWith(suffix) || parts.length < 2 || parts.some(part => !SEGMENT.test(part))) {
    invalid(`${what} must be a relative path of plain segments ending in ${suffix}`);
  }
  return value;
}
type Link = { readonly label: string; readonly href: string };
/** Every link in the text must have a single code span as its label, so none is silently skipped. */
function links(text: string, what: string): Link[] {
  const markers = text.split("](").length - 1;
  if (markers > LIBRARY_INDEX_BOUNDS.maxLinks) exceeded(`${what} has more than ${LIBRARY_INDEX_BOUNDS.maxLinks} links`);
  const found = [...text.matchAll(LINK)].map(match => ({ label: match[1]!, href: match[2]! }));
  if (found.length !== markers) invalid(`${what} has a link whose label is not a single code span`);
  return found;
}
function programPath(link: Link, what: string): string {
  const path = relativePath(link.label, ".algal", what);
  if (link.href !== `../${LIBRARY_INDEX_PROJECTS}/${path}`) invalid(`${what} ${path} must link to ../${LIBRARY_INDEX_PROJECTS}/${path}`);
  return path;
}
function testPath(link: Link, what: string): string {
  const path = relativePath(link.label, ".test.ts", what);
  if (link.href !== `../${path}`) invalid(`${what} ${path} must link to ../${path}`);
  return path;
}
/** The whole text is one program link and nothing else. */
function onlyProgramLink(text: string, what: string): string {
  const found = links(text, what);
  if (found.length !== 1 || text !== `[\`${found[0]!.label}\`](${found[0]!.href})`) invalid(`${what} must be exactly one link`);
  return programPath(found[0]!, what);
}
function distinct(values: string[], what: string): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) invalid(`${what} lists ${value} twice`);
    seen.add(value);
  }
  return values;
}
function cells(line: string, what: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|") || trimmed.length < 2) invalid(`${what} is not a table row`);
  return trimmed.slice(1, -1).split("|").map(cell => cell.trim());
}

/** Parse the catalog page strictly. Two `##` sections are data: "Calling
 * projects" holds one table of entry points, and "Programs" holds one `###`
 * entry per program with exactly the labeled fields in `LIBRARY_INDEX_FIELDS`.
 * Unknown fields, stray list items, unindented continuations, and links that
 * the check would not read are rejected. The result is fresh, frozen data.
 */
export function parseLibraryIndex(value: unknown): LibraryIndex {
  if (typeof value !== "string") return invalid("page must be text");
  if (value.length > LIBRARY_INDEX_BOUNDS.maxBytes || utf8Length(value) > LIBRARY_INDEX_BOUNDS.maxBytes) {
    exceeded(`page exceeds ${LIBRARY_INDEX_BOUNDS.maxBytes} bytes`);
  }
  const lines = value.split("\n");
  if (lines.length > LIBRARY_INDEX_BOUNDS.maxLines) exceeded(`page exceeds ${LIBRARY_INDEX_BOUNDS.maxLines} lines`);
  type Heading = { depth: number; text: string; line: number };
  const headings: Heading[] = [];
  const fenced: boolean[] = [];
  let fence = false;
  for (const [index, line] of lines.entries()) {
    if (line.length > LIBRARY_INDEX_BOUNDS.maxLineLength) exceeded(`line ${index + 1} exceeds ${LIBRARY_INDEX_BOUNDS.maxLineLength} characters`);
    if ([...line].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) invalid(`line ${index + 1} contains a control character`);
    if (line.startsWith("```")) { fence = !fence; fenced.push(true); continue; }
    fenced.push(fence);
    const heading = /^(#{1,6}) (.+)$/.exec(line);
    if (!fence && heading !== null) headings.push({ depth: heading[1]!.length, text: heading[2]!.trim(), line: index });
  }
  if (fence) invalid("a code fence is not closed");
  const section = (title: string): { start: number; end: number } => {
    const matches = headings.filter(heading => heading.depth === 2 && heading.text === title);
    if (matches.length !== 1) invalid(`page needs exactly one "## ${title}" section`);
    const line = matches[0]!.line;
    return { start: line + 1, end: headings.find(heading => heading.depth <= 2 && heading.line > line)?.line ?? lines.length };
  };

  const calling = section("Calling projects");
  const rows: number[] = [];
  for (let index = calling.start; index < calling.end; index++) if (!fenced[index] && lines[index]!.startsWith("|")) rows.push(index);
  if (rows.length < 3) invalid("\"Calling projects\" needs a table with at least one row");
  if (rows.some((row, index) => index > 0 && row !== rows[index - 1]! + 1)) invalid("\"Calling projects\" must contain one table");
  if (rows.length - 2 > LIBRARY_INDEX_BOUNDS.maxApplications) exceeded(`more than ${LIBRARY_INDEX_BOUNDS.maxApplications} calling entry points`);
  if (cells(lines[rows[0]!]!, "table header").join("|") !== "Entry point|Source root|Purpose") invalid("calling project columns must be Entry point, Source root, Purpose");
  const divider = cells(lines[rows[1]!]!, "table divider");
  if (divider.length !== 3 || divider.some(cell => !/^:?-{3,}:?$/.test(cell))) invalid("calling project table needs a three-column divider");
  const applications = rows.slice(2).map((row, index): LibraryIndexApplication => {
    const what = `calling project row ${index + 1}`;
    const [entryCell, rootCell, purpose, ...extra] = cells(lines[row]!, what);
    if (entryCell === undefined || rootCell === undefined || purpose === undefined || extra.length > 0) return invalid(`${what} needs three cells`);
    const entry = onlyProgramLink(entryCell, `${what} entry`);
    const root = CODE.exec(rootCell)?.[1] ?? invalid(`${what} source root must be one path in code`);
    const project = entry.split("/")[0]!;
    if (root !== LIBRARY_INDEX_PROJECTS && root !== `${LIBRARY_INDEX_PROJECTS}/${project}`) {
      invalid(`${what} source root must be ${LIBRARY_INDEX_PROJECTS} or ${LIBRARY_INDEX_PROJECTS}/${project}`);
    }
    if (!purpose) invalid(`${what} purpose is empty`);
    return { entry, root, purpose };
  });
  distinct(applications.map(application => application.entry), "\"Calling projects\"");

  const programs = section("Programs");
  const inside = headings.filter(heading => heading.line >= programs.start && heading.line < programs.end);
  if (inside.some(heading => heading.depth !== 3)) invalid("\"Programs\" may contain only ### entry headings");
  if (inside.length === 0) invalid("\"Programs\" lists no entries");
  if (inside.length > LIBRARY_INDEX_BOUNDS.maxEntries) exceeded(`more than ${LIBRARY_INDEX_BOUNDS.maxEntries} entries`);
  for (let index = programs.start; index < inside[0]!.line; index++) {
    const line = lines[index]!;
    if (fenced[index] || LIST_ITEM.test(line) || line.startsWith("|")) invalid(`line ${index + 1} before the first entry must be a paragraph`);
  }
  const entries = inside.map((heading, position): LibraryIndexEntry => {
    const name = PROGRAM_NAME.exec(heading.text)?.[1] ?? invalid(`entry heading "${heading.text}" must be one program name in code`);
    const end = inside[position + 1]?.line ?? programs.end;
    const fields = new Map<FieldLabel, string>();
    let open: FieldLabel | undefined;
    for (let index = heading.line + 1; index < end; index++) {
      const line = lines[index]!;
      if (fenced[index]) invalid(`entry ${name} contains a code block at line ${index + 1}`);
      if (line.trim() === "") { open = undefined; continue; }
      const field = FIELD.exec(line);
      if (field !== null) {
        const label = field[1]! as FieldLabel;
        if (!LIBRARY_INDEX_FIELDS.includes(label)) invalid(`entry ${name} has an unknown field "${field[1]}"`);
        if (fields.has(label)) invalid(`entry ${name} repeats the field "${label}"`);
        fields.set(label, field[2]!.trim());
        open = label;
        continue;
      }
      if (LIST_ITEM.test(line)) invalid(`entry ${name} line ${index + 1} is a list item without a field label`);
      if (open !== undefined && /^ {2,}\S/.test(line)) {
        const joined = `${fields.get(open)!} ${line.trim()}`;
        if (joined.length > LIBRARY_INDEX_BOUNDS.maxFieldLength) exceeded(`entry ${name} field "${open}" exceeds ${LIBRARY_INDEX_BOUNDS.maxFieldLength} characters`);
        fields.set(open, joined);
        continue;
      }
      // Renderers disagree on an unindented line after a list item, so the
      // page must indent a continuation or separate a paragraph.
      if (open !== undefined) invalid(`entry ${name} line ${index + 1} must be indented two spaces or follow a blank line`);
      if (/^\s/.test(line) || /^[|>]/.test(line)) invalid(`entry ${name} line ${index + 1} is neither a field nor a paragraph`);
    }
    for (const label of LIBRARY_INDEX_FIELDS) if (!fields.has(label)) invalid(`entry ${name} is missing the field "${label}"`);
    const text = (label: FieldLabel): string => fields.get(label)!;
    const digest = (label: FieldLabel): Digest => asDigest(DIGEST.exec(text(label))?.[1] ?? invalid(`entry ${name} "${label}" must be one sha256 digest in code`), `entry ${name} "${label}"`);
    const what = (label: FieldLabel) => `entry ${name} "${label}"`;
    const listed = (label: FieldLabel, parse: (link: Link, what: string) => string): string[] => {
      const found = links(text(label), what(label));
      if (found.length === 0) invalid(`${what(label)} needs at least one link`);
      return distinct(found.map(link => parse(link, what(label))), what(label));
    };
    return {
      name, path: onlyProgramLink(text("Path"), what("Path")),
      digest: digest("Executable digest"), interfaceDigest: digest("Interface digest"), interface: text("Interface"),
      dependencies: text("Depends on") === "None." ? [] : listed("Depends on", programPath),
      meaning: text("Inputs and result"), rejected: text("Rejected inputs"), limits: text("Limits"),
      callers: listed("Callers", programPath), tests: listed("Tests", testPath),
      compiler: text("Compiler"), maintainer: text("Maintainer"), status: text("Status"),
    };
  });
  distinct(entries.map(entry => entry.name), "\"Programs\"");
  distinct(entries.map(entry => entry.path), "\"Programs\"");
  distinct(entries.map(entry => entry.digest), "\"Programs\"");
  return freezeDeep({ applications, entries });
}

const ANY_JSON = ["array", "boolean", "null", "number", "object", "string"];
/** A JSON port's narrowing as the page shows it: the schema's declared type,
 * or nothing when it admits any JSON value. Deeper schemas stay covered by the
 * interface digest. */
function narrowing(port: PortType): string {
  if (port.type !== "json" || port.schema === undefined) return "";
  const type = port.schema.type;
  if (typeof type === "string") return ` (${type})`;
  if (Array.isArray(type)) {
    const names = type.map(String).sort(compareUtf8);
    return names.join(",") === ANY_JSON.join(",") ? "" : ` (${names.join(" or ")})`;
  }
  return " (schema)";
}
function portsText(ports: PortMap): string {
  const names = Object.keys(ports).sort(compareUtf8);
  if (names.length === 0) return "none";
  return names.map(name => {
    const port = ports[name]!;
    const base = port.type === "choice" ? `choice(${port.labels ? port.labels.join("|") : "*"})` : port.type === "cap" ? `cap(${port.capability})` : port.type;
    return `\`${name}: ${base}${port.many ? "[]" : ""}${port.optional ? "?" : ""}\`${narrowing(port)}`;
  }).join(", ");
}
/** The resolved interface as the page writes it: inputs, then outputs, sorted by name. */
export function libraryInterfaceText(ports: { readonly inputs: PortMap; readonly outputs: PortMap }): string {
  return `inputs ${portsText(ports.inputs)}; outputs ${portsText(ports.outputs)}.`;
}
export function libraryCompilerText(compiler: SourceLock["compiler"]): string {
  return `\`${compiler.profile}\`, version \`${compiler.version}\`.`;
}

export type LibraryIndexCheckOptions = {
  /** Repository directory containing `examples/source/projects` and the listed test files. */
  readonly repository: string;
};
type Compiled = { readonly report: SourceDependencyReport; readonly lock: SourceLock };
async function compile(repository: string, path: string, root: string): Promise<Compiled> {
  const project = await loadSourceProject(join(repository, ...LIBRARY_INDEX_PROJECTS.split("/"), ...path.split("/")), { root: join(repository, ...root.split("/")) });
  return {
    report: await createSourceDependencyReport(project.source, { sourceOptions: project.compilerOptions }),
    lock: await createSourceLock(project.source, project.compilerOptions),
  };
}
const reason = (error: unknown): string => error instanceof Error ? error.message : String(error);
const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** Compare a parsed catalog with the source and return every problem found,
 * in a fixed order; an empty list means the page matches the source.
 *
 * Each entry is compiled from its own file under the projects directory: its
 * root digest, interface digest (from both the lock and the dependency
 * report), interface text, program name, compiler, purity, and the files it
 * calls must match the page. Each calling project is compiled under its listed
 * root and matched to entries by file, so a changed file is reported once as
 * digest drift rather than as lost callers. A listed file must keep its
 * digests there, another file carrying an entry's digest is a copy, and the
 * files that call each entry must equal its caller list and span at least two
 * files in at least two projects.
 */
export async function checkLibraryIndex(index: LibraryIndex, options: LibraryIndexCheckOptions): Promise<string[]> {
  const problems: string[] = [];
  let omitted = 0;
  const note = (message: string): void => {
    if (problems.length < LIBRARY_INDEX_BOUNDS.maxProblems) problems.push(message);
    else omitted++;
  };
  const byPath = new Map(index.entries.map(entry => [entry.path, entry]));
  const byDigest = new Map<string, LibraryIndexEntry>(index.entries.map(entry => [entry.digest, entry]));

  for (const entry of index.entries) {
    let compiled: Compiled;
    try { compiled = await compile(options.repository, entry.path, LIBRARY_INDEX_PROJECTS); }
    catch (error) { note(`${entry.path}: does not compile (${reason(error)})`); continue; }
    const { report, lock } = compiled;
    const root = report.modules.find(module => module.manifestDigest === report.rootManifestDigest)!;
    if (lock.root !== entry.digest) note(`${entry.path}: page pins executable digest ${entry.digest}; the source compiles to ${lock.root}`);
    if (lock.interfaces[lock.root] !== entry.interfaceDigest) note(`${entry.path}: page pins interface digest ${entry.interfaceDigest}; the lock records ${lock.interfaces[lock.root]}`);
    const resolved = digestCanonical(root.interface as unknown as JsonValue);
    if (resolved !== entry.interfaceDigest) note(`${entry.path}: page pins interface digest ${entry.interfaceDigest}; the dependency report resolves ${resolved}`);
    if (root.name !== entry.name) note(`${entry.path}: page names the program ${entry.name}; the source names it ${root.name}`);
    const shown = libraryInterfaceText(root.interface);
    if (shown !== entry.interface) note(`${entry.path}: page shows interface "${entry.interface}"; the source resolves "${shown}"`);
    const compiler = libraryCompilerText(lock.compiler);
    if (compiler !== entry.compiler) note(`${entry.path}: page names compiler "${entry.compiler}"; the source compiles with "${compiler}"`);
    const effectful = report.modules.filter(module => module.effects.transitive.length > 0 || module.budgets.maxAgentCalls !== 0);
    if (report.analysis.maxAgentCalls !== 0 || effectful.length > 0) note(`${entry.path}: is not pure; ${effectful.map(module => module.name).join(", ") || "its closure"} can call a model`);
    // The widest root makes source keys equal catalog paths. Generated control
    // wrappers have no file; the program each one wraps is still listed.
    const calls = new Set<string>();
    for (const module of report.modules) {
      if (module.manifestDigest === report.rootManifestDigest || module.generated) continue;
      for (const source of module.sources) calls.add(source);
    }
    for (const path of [...calls].sort(compareUtf8)) {
      if (!entry.dependencies.includes(path)) note(byPath.has(path) ? `${entry.path}: calls ${path}, which "Depends on" omits` : `${entry.path}: calls ${path}, which is not an entry`);
    }
    for (const path of entry.dependencies) {
      if (!byPath.has(path)) note(`${entry.path}: "Depends on" lists ${path}, which is not an entry`);
      else if (!calls.has(path)) note(`${entry.path}: "Depends on" lists ${path}, which it does not call`);
    }
  }

  const callers = new Map<string, Set<string>>(index.entries.map(entry => [entry.path, new Set<string>()]));
  for (const application of index.applications) {
    let compiled: Compiled;
    try { compiled = await compile(options.repository, application.entry, application.root); }
    catch (error) { note(`${application.entry}: does not compile from ${application.root} (${reason(error)})`); continue; }
    const { report, lock } = compiled;
    // Source keys are relative to the listed root; a project root adds its own directory.
    const prefix = application.root === LIBRARY_INDEX_PROJECTS ? "" : `${application.entry.split("/")[0]!}/`;
    const file = (key: string): string => `${prefix}${key}`;
    for (const unit of report.sourceUnits) {
      const entry = byPath.get(file(unit.source));
      if (entry !== undefined && unit.manifestDigest !== entry.digest) note(`${application.entry}: ${entry.path} compiles to ${unit.manifestDigest}, not the listed ${entry.digest}`);
    }
    let reached = false;
    for (const module of report.modules) {
      const copied = byDigest.get(module.manifestDigest);
      for (const source of module.sources) {
        if (copied !== undefined && file(source) !== copied.path) note(`${application.entry}: ${file(source)} has the digest of ${copied.path}; import the listed file instead of a copy`);
        const entry = byPath.get(file(source));
        if (entry === undefined) continue;
        reached = true;
        const resolved = digestCanonical(module.interface as unknown as JsonValue);
        if (resolved !== entry.interfaceDigest || lock.interfaces[module.manifestDigest] !== entry.interfaceDigest) {
          note(`${application.entry}: ${entry.path} resolves interface digest ${resolved}, not the listed ${entry.interfaceDigest}`);
        }
      }
    }
    if (!reached) note(`${application.entry}: calls no listed program`);
    for (const occurrence of report.occurrences) {
      if (occurrence.source === undefined || occurrence.caller === undefined) continue;
      const entry = byPath.get(file(occurrence.source));
      if (entry === undefined) continue;
      const origin = occurrence.caller.origin;
      if (origin === undefined) { note(`${application.entry}: a generated wrapper calls ${entry.path}; the catalog cannot name that caller`); continue; }
      callers.get(entry.path)!.add(file(origin.source));
    }
  }

  for (const entry of index.entries) {
    const found = callers.get(entry.path)!;
    const listed = new Set(entry.callers);
    for (const path of [...found].sort(compareUtf8)) if (!listed.has(path)) note(`${entry.path}: caller ${path} is missing from the page`);
    for (const path of entry.callers) if (!found.has(path)) note(`${entry.path}: listed caller ${path} does not call it in any calling project`);
    const projects = new Set(entry.callers.map(path => path.split("/")[0]!));
    if (listed.size < 2 || projects.size < 2) {
      note(`${entry.path}: needs callers in at least two files across at least two projects; the page lists ${plural(listed.size, "file")} in ${plural(projects.size, "project")}`);
    }
    for (const test of entry.tests) {
      const stat = await lstat(join(options.repository, ...test.split("/"))).catch(() => undefined);
      if (stat === undefined || !stat.isFile()) note(`${entry.path}: test ${test} is not a file in the repository`);
    }
  }
  if (omitted > 0) problems.push(`${plural(omitted, "more problem")} not listed`);
  return problems;
}
