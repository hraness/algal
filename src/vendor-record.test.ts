import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { digestText } from "./digest";
import { AlgalError } from "./errors";
import { CLAMP, ENTRY, REPOSITORY } from "./fixtures/vendor-catalog";
import { LIBRARY_INDEX_BOUNDS, LIBRARY_INDEX_PROJECTS, parseLibraryIndex } from "./library-index";
import { checkVendoredFiles, parseVendorRecord, vendorRecordToJson, VENDOR_BOUNDS, VENDOR_CONTRACT, VENDOR_RECORD_FILE } from "./vendor-record";
import { canonicalize, type JsonObject } from "./values";

const page = await readFile(join(REPOSITORY, "docs/library.md"), "utf8");
const listed = parseLibraryIndex(page).entries;
const texts = new Map(await Promise.all([ENTRY, CLAMP].map(async path => [path, await readFile(join(REPOSITORY, LIBRARY_INDEX_PROJECTS, path), "utf8")] as const)));
const file = (path: string) => {
  const entry = listed.find(item => item.path === path)!;
  return { path, sourceDigest: digestText(texts.get(path)!), manifestDigest: entry.digest, interfaceDigest: entry.interfaceDigest };
};
const raw: JsonObject = { contract: VENDOR_CONTRACT, origin: "https://example.com/docs/library.md", catalog: digestText(page), entry: ENTRY, files: [file(CLAMP), file(ENTRY)] };
const record = parseVendorRecord(raw);
const failure = (work: () => unknown): AlgalError => {
  try { work(); } catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
const rejected = (value: unknown) => failure(() => parseVendorRecord(value));

test("a record round-trips canonically and its limits match the catalog page parser", () => {
  expect(canonicalize(vendorRecordToJson(record))).toBe(canonicalize(raw));
  expect(Object.isFrozen(record) && Object.isFrozen(record.files[0])).toBe(true);
  expect(VENDOR_BOUNDS.maxPathLength).toBe(LIBRARY_INDEX_BOUNDS.maxPathLength);
  expect(VENDOR_BOUNDS.maxFiles * VENDOR_BOUNDS.maxFileBytes).toBe(1_048_576);
  // Sixteen files with the longest paths and origin fit the record's own byte limit.
  const longest = { ...raw, origin: `https://example.com/${"o".repeat(VENDOR_BOUNDS.maxOriginLength - 20)}`, files: Array.from({ length: VENDOR_BOUNDS.maxFiles }, (_, index) => ({ ...file(CLAMP), path: `p/${String(index).padStart(2, "0")}${"x".repeat(VENDOR_BOUNDS.maxPathLength - 11)}.algal` })) };
  const wide = parseVendorRecord({ ...longest, entry: longest.files[0]!.path });
  expect(canonicalize(vendorRecordToJson(wide)).length).toBeLessThan(VENDOR_BOUNDS.record.maxBytes);
  for (const origin of ["https://example.com/docs/library.md", "file:///srv/catalog/docs/library.md", "http://127.0.0.1:8080/docs/library.md", "http://localhost/docs/library.md", "http://[::1]:9/library.md"]) {
    expect(parseVendorRecord({ ...raw, origin }).origin).toBe(origin);
  }
});

test("foreign records are rejected with the failing rule named", () => {
  expect(rejected({ ...raw, note: "x" }).message).toContain('vendor record has unknown key "note"');
  expect(rejected({ ...raw, files: [{ ...file(CLAMP), size: 1 }, file(ENTRY)] }).message).toContain('vendor record file 0 has unknown key "size"');
  expect(rejected({ ...raw, contract: "algal.vendor.v2" }).message).toContain("expected contract");
  expect(rejected({ ...raw, catalog: "sha256:short" }).code).toBe("PARSE_FAILED");
  expect(rejected({ ...raw, files: [{ ...file(CLAMP), manifestDigest: "latest" }, file(ENTRY)] }).code).toBe("PARSE_FAILED");
  for (const origin of ["http://example.com/docs/library.md", "ftp://example.com/library.md", "https://user:pass@example.com/library.md", "https://example.com/library.md?ref=main", "https://example.com/library.md#top", "https://EXAMPLE.com/library.md", "docs/library.md", ""]) {
    expect(rejected({ ...raw, origin }).message, origin).toContain("normalized https or file URL");
  }
  for (const path of ["../clamp.algal", "task-planning/../clamp.algal", "clamp.algal", "task-planning/.hidden.algal", "task-planning/clamp.txt", "task-planning\\clamp.algal", "task planning/clamp.algal", `p/${"x".repeat(VENDOR_BOUNDS.maxPathLength)}.algal`]) {
    expect(rejected({ ...raw, entry: path, files: [{ ...file(CLAMP), path }] }).code, path).toBe("PARSE_FAILED");
  }
  expect(rejected({ ...raw, files: [file(ENTRY), file(CLAMP)] }).message).toContain("sorted by unique path");
  expect(rejected({ ...raw, files: [file(CLAMP), file(CLAMP), file(ENTRY)] }).message).toContain("sorted by unique path");
  expect(rejected({ ...raw, files: [file(CLAMP)] }).message).toContain("entry must be one of its files");
  expect(rejected({ ...raw, files: [] }).message).toContain("must include the entry");
  // Paths that would collide when written: letter case, a file where a directory goes, the record's own name.
  expect(rejected({ ...raw, files: [{ ...file(CLAMP), path: "Task-planning/score_task.algal" }, file(ENTRY)] }).message).toContain("more than letter case");
  expect(rejected({ ...raw, entry: "a/b.algal", files: [{ ...file(CLAMP), path: "a/b.algal" }, { ...file(ENTRY), path: "a/b.algal/c.algal" }] }).message).toContain("where a directory or the record belongs");
  expect(rejected({ ...raw, files: [{ ...file(CLAMP), path: `${VENDOR_RECORD_FILE}/x.algal` }, file(ENTRY)] }).message).toContain("where a directory or the record belongs");
  const many = Array.from({ length: VENDOR_BOUNDS.maxFiles + 1 }, (_, index) => ({ ...file(CLAMP), path: `p/f${String(index).padStart(2, "0")}.algal` }));
  expect(rejected({ ...raw, entry: many[0]!.path, files: many }).code).toBe("BUDGET_EXHAUSTED");
  // Hostile values are copied under the record's own-data limits before parsing.
  let reads = 0;
  const trapped = { ...raw } as Record<string, unknown>;
  Object.defineProperty(trapped, "entry", { get: () => { reads++; return ENTRY; }, enumerable: true });
  expect(rejected(trapped).code).toBe("PARSE_FAILED");
  expect(reads).toBe(0);
  const cyclic: Record<string, unknown> = { ...raw };
  cyclic.self = cyclic;
  expect(rejected(cyclic).code).toBe("PARSE_FAILED");
  expect(rejected({ ...raw, origin: "x".repeat(VENDOR_BOUNDS.record.maxBytes) }).code).toBe("BUDGET_EXHAUSTED");
});

test("vendored files are checked by source digest, then by the digests they compile to", async () => {
  expect(await checkVendoredFiles(record, texts)).toEqual([]);
  const clamp = texts.get(CLAMP)!;
  // A comment changes the source digest only.
  const comment = await checkVendoredFiles(record, new Map([...texts, [CLAMP, `// Local note.\n${clamp}`]]));
  expect(comment.map(item => item.subject)).toEqual([CLAMP]);
  // A behavior change moves the helper's executable digest and its caller's.
  const behavior = await checkVendoredFiles(record, new Map([...texts, [CLAMP, clamp.replace("else { value }", "else { value + 1 }")]]));
  expect(behavior.map(item => item.subject)).toEqual([CLAMP, `${CLAMP}:executable`, `${ENTRY}:executable`]);
  expect(behavior[1]).toMatchObject({ expected: file(CLAMP).manifestDigest });
  // A missing file is reported as absent and nothing is compiled.
  const missing = await checkVendoredFiles(record, new Map([[ENTRY, texts.get(ENTRY)!]]));
  expect(missing).toEqual([{ subject: CLAMP, expected: file(CLAMP).sourceDigest, actual: "(absent)" }]);
  // A copy that no longer compiles names the file and the compiler's reason.
  const broken = await checkVendoredFiles(record, new Map([...texts, [CLAMP, "program clamp(value: json) -> json { budget { max_agent_calls: 0 } return missing }"]]));
  expect(broken.map(item => item.subject)).toEqual([CLAMP, `${ENTRY}:compile`]);
  expect(broken[1]!.actual.length).toBeLessThanOrEqual(240);
  // A listed file outside the entry's calls is compiled on its own.
  const alone = parseVendorRecord({ ...raw, entry: CLAMP });
  expect(await checkVendoredFiles(alone, texts)).toEqual([]);
});
