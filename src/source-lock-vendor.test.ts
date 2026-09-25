import { expect, test } from "bun:test";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { digestCanonical } from "./digest";
import { AlgalError, type ErrorCode } from "./errors";
import { CLAMP, CONSUMER, ENTRY, REPOSITORY, scratchCatalog, temporary } from "./fixtures/vendor-catalog";
import {
  createSourceLock, parseSourceLock, renderSourceLockVerification, sourceLockToJson, verifySourceLock,
  SOURCE_LOCK_BOUNDS, type SourceLockVerification,
} from "./source-lock";
import { loadSourceProject } from "./source-project";
import { canonicalize, type JsonObject, type JsonValue } from "./values";
import { vendorCatalogEntry } from "./vendor";
import { loadVendoredSources, vendorRecordToJson, VENDOR_BOUNDS, VENDOR_RECORD_FILE, type VendoredSources, type VendorRecord } from "./vendor-record";

const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const failure = async (work: Promise<unknown> | (() => unknown)): Promise<AlgalError> => {
  try { await (typeof work === "function" ? work() : work); }
  catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
const kinds = (verification: SourceLockVerification) => verification.drift.reduce<Record<string, number>>((counts, entry) => ({ ...counts, [entry.kind]: (counts[entry.kind] ?? 0) + 1 }), {});
const subjects = (verification: SourceLockVerification, kind: string) => verification.drift.filter(entry => entry.kind === kind).map(entry => entry.subject);
const ORDER = ["entry", "compiler", "source", "unit", "root", "closure", "interface", "analysis", "version", "evaluation", "vendor"];
const ordered = (verification: SourceLockVerification) => verification.drift.every((entry, index) => index === 0 || ORDER.indexOf(verification.drift[index - 1]!.kind) <= ORDER.indexOf(entry.kind));
const V_CLAMP = `vendor/algal/${CLAMP}`, V_ENTRY = `vendor/algal/${ENTRY}`;

/** A project whose main program calls the scoring entry vendored from a scratch copy of the catalog. */
async function vendoredProject(dir: string) {
  const page = await scratchCatalog(dir);
  const root = join(dir, "project");
  await mkdir(root);
  const record = await vendorCatalogEntry({ catalog: page, entry: ENTRY, into: "vendor/algal", root });
  await writeFile(join(root, "main.algal"), CONSUMER);
  const project = await loadSourceProject(join(root, "main.algal"));
  const vendored = await loadVendoredSources(project.root, Object.keys(project.sources));
  const lock = json(sourceLockToJson(await createSourceLock(project.source, project.compilerOptions, { vendored })));
  return { page, root, record, project, vendored, lock };
}
/** The same project with one vendored file's text replaced, in the compiler's modules and the vendored files alike. */
function edited(project: Awaited<ReturnType<typeof vendoredProject>>["project"], vendored: VendoredSources, key: string, text: string) {
  return { sourceOptions: { entry: project.entry, modules: { ...project.compilerOptions.modules, [key]: text } }, vendored: { records: vendored.records, files: { ...vendored.files, [key]: text } } };
}

test("a lock pins each vendored directory, and locks without vendored copies keep their bytes", async () => {
  await temporary("algal-lock-vendor-", async dir => {
    const { record, project, vendored, lock } = await vendoredProject(dir);
    expect(Object.keys(vendored.records)).toEqual(["vendor/algal"]);
    expect(Object.keys(vendored.files).sort()).toEqual([V_CLAMP, V_ENTRY]);
    expect(lock.vendored).toEqual([{ directory: "vendor/algal", origin: record.origin, catalog: record.catalog, entry: ENTRY, record: digestCanonical(vendorRecordToJson(record)) }]);
    // The vendored files are ordinary units of the project, compiled to the catalog's digests.
    const units = lock.units as { source: string; manifestDigest: string }[];
    for (const file of record.files) expect(units.find(unit => unit.source === `vendor/algal/${file.path}`)!.manifestDigest).toBe(file.manifestDigest);
    expect(canonicalize(sourceLockToJson(parseSourceLock(lock)))).toBe(canonicalize(lock));
    const verified = await verifySourceLock(project.source, project.compilerOptions, lock, { vendored });
    expect(verified).toMatchObject({ ok: true, drift: [], lockDigest: digestCanonical(lock), vendored: { directories: 1, checked: true } });
    expect(renderSourceLockVerification(verified)).toContain("The source compiles to the locked closure.\nVendored: 1 pinned directory checked offline.\n");
    const unchecked = await verifySourceLock(project.source, project.compilerOptions, lock);
    expect(unchecked).toMatchObject({ ok: true, vendored: { directories: 1, checked: false } });
    expect(renderSourceLockVerification(unchecked)).toContain("Vendored: 1 pinned directory, not checked.");
    // A project with no vendored directory writes and verifies exactly what it did before.
    const planner = await loadSourceProject(`${REPOSITORY}/examples/source/projects/task-planning/main.algal`);
    const none = await loadVendoredSources(planner.root, Object.keys(planner.sources));
    expect(none).toEqual({ records: {}, files: {} });
    const plain = json(sourceLockToJson(await createSourceLock(planner.source, planner.compilerOptions)));
    expect(canonicalize(sourceLockToJson(await createSourceLock(planner.source, planner.compilerOptions, { vendored: none })))).toBe(canonicalize(plain));
    expect(Object.keys(plain).sort()).toEqual(["analysis", "compiler", "contract", "entry", "interfaces", "modules", "root", "units"]);
    const before = await verifySourceLock(planner.source, planner.compilerOptions, plain);
    const after = await verifySourceLock(planner.source, planner.compilerOptions, plain, { vendored: none });
    expect(canonicalize(after as unknown as JsonValue)).toBe(canonicalize(before as unknown as JsonValue));
    expect(renderSourceLockVerification(after)).toBe(renderSourceLockVerification(before));
  });
});

test("vendor drift is its own kind after evaluation: edited copies, changed records, and directories that come or go", async () => {
  await temporary("algal-lock-vendor-drift-", async dir => {
    const { root, record, project, vendored, lock } = await vendoredProject(dir);
    const clamp = project.compilerOptions.modules[V_CLAMP]!;
    const verify = (variant: ReturnType<typeof edited>) => verifySourceLock(project.source, variant.sourceOptions, lock, { vendored: variant.vendored });
    // A comment changes source digests only: the project's and the record's.
    const comment = await verify(edited(project, vendored, V_CLAMP, `// Local note.\n${clamp}`));
    expect(kinds(comment)).toEqual({ source: 1, vendor: 1 });
    expect(comment.drift.at(-1)).toMatchObject({ kind: "vendor", subject: V_CLAMP, expected: record.files[0]!.sourceDigest });
    // A behavior change also moves the digests the catalog listed.
    const behavior = await verify(edited(project, vendored, V_CLAMP, clamp.replace("else { value }", "else { value + 1 }")));
    expect(subjects(behavior, "vendor")).toEqual([V_CLAMP, `${V_CLAMP}:executable`, `${V_ENTRY}:executable`]);
    expect(behavior.drift.find(entry => entry.subject === `${V_ENTRY}:executable`)).toMatchObject({ expected: record.files[1]!.manifestDigest });
    expect(ordered(behavior)).toBe(true);
    expect(behavior.drift.at(-1)!.kind).toBe("vendor");
    expect(renderSourceLockVerification(behavior)).toContain(`  vendor ${V_CLAMP}:executable: expected ${record.files[0]!.manifestDigest}, actual sha256:`);
    // A changed record is reported by field.
    const moved: VendorRecord = { ...record, origin: "https://example.com/algal/docs/library.md" };
    const relabeled = await verifySourceLock(project.source, project.compilerOptions, lock, { vendored: { ...vendored, records: { "vendor/algal": vendorRecordToJson(moved) } } });
    expect(relabeled.drift).toEqual([
      { kind: "vendor", subject: "vendor/algal", expected: digestCanonical(vendorRecordToJson(record)), actual: digestCanonical(vendorRecordToJson(moved)) },
      { kind: "vendor", subject: "vendor/algal:origin", expected: record.origin, actual: moved.origin },
    ]);
    // A listed file that is not imported still has to match: deleting it is drift.
    await vendorCatalogEntry({ catalog: join(dir, "catalog/docs/library.md"), entry: ENTRY, into: "vendor/second", root });
    await writeFile(join(root, "main.algal"), `${CONSUMER.replace("program main", 'import clamp from "./vendor/second/task-planning/lib/clamp.algal"\n\nprogram main').replace("return call score_task using { task: task, weights: weights }", "let score = call score_task using { task: task, weights: weights }\n  return call clamp using { value: score, minimum: 0, maximum: 10 }")}`);
    await rm(join(root, "vendor/second", ENTRY));
    const grown = await loadSourceProject(join(root, "main.algal"));
    const found = await loadVendoredSources(grown.root, Object.keys(grown.sources));
    expect(Object.keys(found.records).sort()).toEqual(["vendor/algal", "vendor/second"]);
    const second = await verifySourceLock(grown.source, grown.compilerOptions, lock, { vendored: found });
    const secondRecord = digestCanonical(found.records["vendor/second"] as JsonValue);
    expect(second.drift.filter(entry => entry.kind === "vendor")).toEqual([
      { kind: "vendor", subject: "vendor/second", expected: "(absent)", actual: secondRecord },
      { kind: "vendor", subject: `vendor/second/${ENTRY}`, expected: record.files[1]!.sourceDigest, actual: "(absent)" },
    ]);
    // Writing a lock refuses the copy that no longer matches its record.
    const refused = await failure(createSourceLock(grown.source, grown.compilerOptions, { vendored: found }));
    expect(refused.code).toBe("DIGEST_MISMATCH");
    expect(refused.message).toContain(`source lock: vendor/second differs from its vendor record: ${ENTRY} (expected ${record.files[1]!.sourceDigest}, actual (absent))`);
    // A pinned directory the project no longer uses is reported as absent.
    await writeFile(join(root, "main.algal"), 'program main(task: json) -> json {\n  budget { max_agent_calls: 0 }\n  return task\n}\n');
    const alone = await loadSourceProject(join(root, "main.algal"));
    const unused = await verifySourceLock(alone.source, alone.compilerOptions, lock, { vendored: await loadVendoredSources(alone.root, Object.keys(alone.sources)) });
    expect(unused.drift.filter(entry => entry.kind === "vendor")).toEqual([{ kind: "vendor", subject: "vendor/algal", expected: digestCanonical(vendorRecordToJson(record)), actual: "(absent)" }]);
    expect(ordered(unused)).toBe(true);
  });
});

test("records are read with the source loader's guards and parsed strictly", async () => {
  await temporary("algal-lock-vendor-records-", async dir => {
    const { root, record, project } = await vendoredProject(dir);
    const recordPath = join(root, "vendor/algal", VENDOR_RECORD_FILE);
    const original = await readFile(recordPath, "utf8");
    const keys = Object.keys(project.sources);
    const load = () => loadVendoredSources(project.root, keys);
    const refused = async (text: string | undefined, code: ErrorCode, message: string) => {
      if (text !== undefined) await writeFile(recordPath, text);
      const error = await failure(load());
      expect({ code: error.code, message: error.message }).toEqual({ code, message });
    };
    await refused(JSON.stringify({ ...vendorRecordToJson(record), note: "hand edited" }), "PARSE_FAILED", `vendor/algal/${VENDOR_RECORD_FILE} has unknown key "note"`);
    const files = vendorRecordToJson(record).files as JsonObject[];
    await refused(JSON.stringify({ ...vendorRecordToJson(record), files: [{ ...files[0]!, size: 1 }, files[1]!] }), "PARSE_FAILED", `vendor/algal/${VENDOR_RECORD_FILE} file 0 has unknown key "size"`);
    await refused("{not json", "PARSE_FAILED", `vendor/algal/${VENDOR_RECORD_FILE} is not valid JSON`);
    await refused(" ".repeat(VENDOR_BOUNDS.record.maxBytes + 1), "BUDGET_EXHAUSTED", `vendor record vendor/algal/${VENDOR_RECORD_FILE} exceeds ${VENDOR_BOUNDS.record.maxBytes} bytes`);
    await rm(recordPath);
    await writeFile(join(dir, "outside.json"), original);
    await symlink(join(dir, "outside.json"), recordPath);
    await refused(undefined, "PARSE_FAILED", `symlink traversal is not allowed: vendor/algal/${VENDOR_RECORD_FILE}`);
    await rm(recordPath);
    await mkdir(recordPath);
    await refused(undefined, "PARSE_FAILED", `vendor record path must contain directories and end in a regular file: vendor/algal/${VENDOR_RECORD_FILE}`);
    await rm(recordPath, { recursive: true });
    // Without a record the copy is ordinary source; a record at the project root is not a vendored directory.
    expect(await load()).toEqual({ records: {}, files: {} });
    await writeFile(join(root, VENDOR_RECORD_FILE), original);
    expect(await load()).toEqual({ records: {}, files: {} });
    await writeFile(recordPath, original);
    const clampPath = join(root, "vendor/algal", CLAMP);
    const clamp = await readFile(clampPath, "utf8");
    await rm(clampPath);
    await symlink(join(root, "vendor/algal", ENTRY), clampPath);
    await refused(undefined, "PARSE_FAILED", `symlink traversal is not allowed: ${V_CLAMP}`);
    await rm(clampPath);
    await writeFile(clampPath, clamp);
    expect(Object.keys((await load()).files).sort()).toEqual([V_CLAMP, V_ENTRY]);
  });
});

test("foreign vendored sections and sources are rejected before comparison", async () => {
  await temporary("algal-lock-vendor-foreign-", async dir => {
    const { record, project, vendored, lock } = await vendoredProject(dir);
    const pin = (lock.vendored as JsonObject[])[0]!;
    const parse = async (value: JsonObject) => failure(() => parseSourceLock({ ...lock, vendored: value as unknown as JsonValue }));
    expect((await parse([{ ...pin, note: "x" }] as unknown as JsonObject)).message).toContain('source lock vendored 0 has unknown key "note"');
    expect((await parse([] as unknown as JsonObject)).message).toContain("at least one directory");
    expect((await parse([pin, pin] as unknown as JsonObject)).message).toContain("sorted and unique");
    for (const directory of ["../vendor", "vendor/algal/", "", "/vendor/algal", "vendor\\algal", "C:vendor"]) {
      expect((await parse([{ ...pin, directory }] as unknown as JsonObject)).message, directory).toContain("normalized project-relative directory");
    }
    expect((await parse([{ ...pin, directory: "vendor/other" }] as unknown as JsonObject)).message).toContain("source lock vendored directory vendor/other holds no unit");
    expect((await parse([{ ...pin, directory: "vendor/alg" }] as unknown as JsonObject)).message).toContain("holds no unit");
    expect((await parse([{ ...pin, origin: "http://example.com/docs/library.md" }] as unknown as JsonObject)).message).toContain("normalized https or file URL");
    expect((await parse([{ ...pin, entry: "../score_task.algal" }] as unknown as JsonObject)).code).toBe("PARSE_FAILED");
    expect((await parse([{ ...pin, record: "sha256:short" }] as unknown as JsonObject)).code).toBe("PARSE_FAILED");
    expect((await parse(Array.from({ length: SOURCE_LOCK_BOUNDS.maxVendored + 1 }, () => pin) as unknown as JsonObject)).code).toBe("BUDGET_EXHAUSTED");
    // Supplied sources are closed data: no unlisted file, only text within the per-file limit, only known keys.
    const create = (value: unknown) => failure(createSourceLock(project.source, project.compilerOptions, { vendored: value as VendoredSources }));
    expect((await create({ ...vendored, files: { ...vendored.files, "vendor/algal/extra.algal": "program extra() -> text { budget { max_agent_calls: 0 } return \"x\" }" } })).message).toContain('include "vendor/algal/extra.algal", which no record lists');
    expect((await create({ ...vendored, files: { ...vendored.files, [V_CLAMP]: 42 } })).message).toContain(`vendored file ${V_CLAMP} must be text`);
    expect((await create({ ...vendored, files: { ...vendored.files, [V_CLAMP]: "x".repeat(VENDOR_BOUNDS.maxFileBytes + 1) } })).code).toBe("BUDGET_EXHAUSTED");
    expect((await create({ ...vendored, extra: {} })).message).toContain('source lock vendored sources has unknown key "extra"');
    expect((await create({ records: vendored.records })).message).toContain("require records and files");
    expect((await create({ records: { "vendor/elsewhere": vendorRecordToJson(record) }, files: {} })).message).toContain("vendored directory vendor/elsewhere holds none of the project's source files");
    const trapped = { ...vendored.files };
    Object.defineProperty(trapped, V_CLAMP, { get: () => "program clamp() -> text { budget { max_agent_calls: 0 } return \"x\" }", enumerable: true });
    expect((await create({ ...vendored, files: trapped })).message).toContain("must hold only plain data properties");
    // Sixteen fully drifted directories still fit the drift bound, so nothing is cut off.
    expect(SOURCE_LOCK_BOUNDS.maxDrift).toBeGreaterThanOrEqual(332 + SOURCE_LOCK_BOUNDS.maxVendored * (4 + 3 * VENDOR_BOUNDS.maxFiles));
    // A lock at every other limit plus 16 vendored directories with the longest fields fits the lock's byte limit.
    const widest = { directory: "d".repeat(SOURCE_LOCK_BOUNDS.maxKeyLength - 20), origin: `https://example.com/${"o".repeat(VENDOR_BOUNDS.maxOriginLength - 20)}`, catalog: record.catalog, entry: `p/${"e".repeat(VENDOR_BOUNDS.maxPathLength - 8)}.algal`, record: record.catalog };
    expect(canonicalize(Array.from({ length: SOURCE_LOCK_BOUNDS.maxVendored }, () => widest)).length).toBeLessThan(SOURCE_LOCK_BOUNDS.lock.maxBytes - 100_060);
  });
});
