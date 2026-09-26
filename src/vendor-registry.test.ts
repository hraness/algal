import { expect, test } from "bun:test";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { realpath } from "node:fs/promises";
import { digestCanonical, digestText, type Digest } from "./digest";
import { AlgalError, type ErrorCode } from "./errors";
import { CLAMP, ENTRY, scratchCatalog, serveCatalog, temporary } from "./fixtures/vendor-catalog";
import { LIBRARY_INDEX_PROJECTS, parseLibraryIndex } from "./library-index";
import { createSourceLock, parseSourceLock, sourceLockToJson, verifySourceLock } from "./source-lock";
import { loadSourceProject } from "./source-project";
import { canonicalize, type JsonValue } from "./values";
import { vendorCatalogEntry, VENDOR_FETCH_BOUNDS } from "./vendor";
import {
  checkVendoredCatalogs, parseVendorCheck, parseVendorUpdate, proposeVendorUpdate, renderVendorCheck,
  vendorCheckToJson, vendorUpdateToJson, VENDOR_CHECK_BOUNDS, VENDOR_CHECK_CONTRACT, VENDOR_UPDATE_CONTRACT,
  type VendorCheck,
} from "./vendor-registry";
import {
  loadVendoredSources, parseVendorRegistries, readVendorRegistries, vendorRecordToJson,
  vendorRegistriesToJson, vendorRegistryOrigin, VENDOR_RECORD_FILE, VENDOR_REGISTRIES_CONTRACT,
  VENDOR_REGISTRIES_FILE, VENDOR_REGISTRY_BOUNDS,
} from "./vendor-record";

const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const failure = async (work: Promise<unknown> | (() => unknown)): Promise<AlgalError> => {
  try { await (typeof work === "function" ? work() : work); }
  catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
const program = (catalog: string, path: string) => join(catalog, "..", "..", LIBRARY_INDEX_PROJECTS, path);
/** The vendored clamp program with one behavior edit, and the page digests to match. */
async function reviseClamp(dir: string, page: string): Promise<void> {
  const clampPath = program(page, CLAMP);
  const clamp = await readFile(clampPath, "utf8");
  const listed = parseLibraryIndex(await readFile(page, "utf8")).entries;
  const oldClamp = listed.find(item => item.path === CLAMP)!;
  const oldEntry = listed.find(item => item.path === ENTRY)!;
  await writeFile(clampPath, clamp.replace("else { value }", "else { value + 1 }"));
  const compiled = await loadSourceProject(program(page, ENTRY));
  const units = new Map(Object.entries(compiled.project.units));
  const digests = { clamp: units.get("lib/clamp.algal")!.manifestDigest, entry: units.get("score_task.algal")!.manifestDigest };
  let text = await readFile(page, "utf8");
  text = text.replaceAll(oldClamp.digest, digests.clamp).replaceAll(oldEntry.digest, digests.entry);
  await writeFile(page, text);
}
/** A project importing one vendored copy of the scoring entry. */
const CONSUMER = `import score_task from "./vendor/algal/task-planning/score_task.algal"

program main(task: json, weights: json) -> json {
  budget { max_agent_calls: 0, max_depth: 2 }
  return call score_task using { task: task, weights: weights }
}
`;
async function vendoredProject(dir: string, catalog: string, into = "vendor/algal") {
  const root = join(dir, "project");
  await mkdir(root, { recursive: true });
  const record = await vendorCatalogEntry({ catalog, entry: ENTRY, into, root, ...(catalog.startsWith("http") ? { allowLoopbackHttp: true } : {}) });
  await writeFile(join(root, "main.algal"), into === "vendor/algal" ? CONSUMER : CONSUMER.replaceAll("vendor/algal", into));
  const project = await loadSourceProject(join(root, "main.algal"));
  const vendored = await loadVendoredSources(project.root, Object.keys(project.sources));
  return { root, record, project, vendored };
}

test("vendor check reports each copy against its recorded catalog, as facts in a bounded report", async () => {
  await temporary("algal-vendor-check-", async dir => {
    const page = await scratchCatalog(dir);
    // A second copy of the catalog gives the third vendored directory an
    // origin of its own, so one entry can be unreadable while another moves.
    await cp(join(dir, "catalog"), join(dir, "second"), { recursive: true });
    const routes: Record<string, import("./fixtures/vendor-catalog").CatalogRoute> = {};
    const server = serveCatalog(dir, routes);
    try {
      // Three copies: one from the local page, two from loopback addresses.
      const first = await vendoredProject(dir, page, "vendor/algal");
      const second = await vendoredProject(dir, `${server.base}/catalog/docs/library.md`, "vendor/remote");
      const third = await vendoredProject(dir, `${server.base}/second/docs/library.md`, "vendor/moved");
      const project = join(dir, "project");
      await writeFile(join(project, "main.algal"), `import score_task from "./vendor/algal/task-planning/score_task.algal"
import clamp_remote from "./vendor/remote/task-planning/lib/clamp.algal"
import clamp_moved from "./vendor/moved/task-planning/lib/clamp.algal"

program main(task: json, weights: json) -> json {
  budget { max_agent_calls: 0, max_depth: 4 }
  let score = call score_task using { task: task, weights: weights }
  let held = call clamp_remote using { value: score, minimum: 0, maximum: 10 }
  return call clamp_moved using { value: held, minimum: 0, maximum: 10 }
}
`);
      const loaded = await loadSourceProject(join(project, "main.algal"));
      const vendored = await loadVendoredSources(loaded.root, Object.keys(loaded.sources));
      const check = (from?: string) => checkVendoredCatalogs(vendored, { allowLoopbackHttp: true, ...(from === undefined ? {} : { from }) });

      // Everything pinned still matches the page: three unchanged entries.
      const first0 = await check();
      expect(first0.contract).toBe(VENDOR_CHECK_CONTRACT);
      expect(first0.from).toBeUndefined();
      expect(first0.entries.map(item => [item.directory, item.status])).toEqual([
        ["vendor/algal", "unchanged"], ["vendor/moved", "unchanged"], ["vendor/remote", "unchanged"],
      ]);
      for (const item of first0.entries) {
        expect(item.live).toBe(first.record.catalog);
        expect(item.reason).toBeUndefined();
      }
      // Entries carry the pinned page and record digests, in directory order.
      expect(first0.entries[0]).toMatchObject({ entry: ENTRY, catalog: first.record.catalog, record: digestCanonical(vendorRecordToJson(first.record)), origin: first.record.origin });
      // --from keeps only the copies whose record names that origin.
      expect((await check(second.record.origin)).entries.map(item => item.directory)).toEqual(["vendor/remote"]);
      expect((await check("https://example.com/none/library.md")).entries).toEqual([]);
      const filtered = await check(first.record.origin);
      expect(filtered.from).toBe(first.record.origin);
      expect(filtered.entries.map(item => item.directory)).toEqual(["vendor/algal"]);

      // A revision moves the page digest: every copy of that page is
      // update-available, while the second catalog keeps its pin.
      await reviseClamp(dir, page);
      const moved = await check();
      const live = digestText(await readFile(page, "utf8"));
      expect(live).not.toBe(first.record.catalog);
      expect(moved.entries.map(item => [item.directory, item.status])).toEqual([
        ["vendor/algal", "update-available"], ["vendor/moved", "unchanged"], ["vendor/remote", "update-available"],
      ]);
      for (const item of moved.entries) expect(item.live).toBe(item.directory === "vendor/moved" ? third.record.catalog : live);

      // A page that no longer lists the entry is `removed`, and a page that
      // cannot be read is `unreadable`; both are facts, not failures.
      const revisedText = await readFile(page, "utf8");
      await writeFile(page, revisedText.replace("- **Path:** [`task-planning/score_task.algal`](../examples/source/projects/task-planning/score_task.algal)", "- **Path:** [`task-planning/other.algal`](../examples/source/projects/task-planning/other.algal)"));
      routes["/catalog/docs/library.md"] = () => new Response(revisedText);
      routes["/second/docs/library.md"] = () => new Response("missing", { status: 404 });
      const partial = await check();
      expect(partial.entries.map(item => [item.directory, item.status])).toEqual([
        ["vendor/algal", "removed"], ["vendor/moved", "unreadable"], ["vendor/remote", "update-available"],
      ]);
      const removed = partial.entries[0]!;
      expect(removed.live).toBe(digestText(await readFile(page, "utf8")));
      expect(removed.reason).toContain(`the catalog lists no entry ${ENTRY}`);
      const unreadable = partial.entries[1]!;
      expect(unreadable.live).toBeUndefined();
      expect(unreadable.reason).toContain("HTTP 404");
      // The report is data: parse it strictly, render it, and serialize it back.
      const rendered = renderVendorCheck(partial);
      expect(rendered).toContain("1 removed");
      expect(rendered).toContain("vendor/algal");
      const roundTrip = parseVendorCheck(json(vendorCheckToJson(partial)));
      expect(canonicalize(vendorCheckToJson(roundTrip))).toBe(canonicalize(vendorCheckToJson(partial)));
      expect(renderVendorCheck(roundTrip)).toBe(rendered);
      // Nothing was written; the copies are exactly as vendored.
      expect(await readFile(join(project, "vendor/algal", VENDOR_RECORD_FILE), "utf8")).toBe(`${canonicalize(vendorRecordToJson(first.record))}\n`);
      expect((await readdir(join(project, "vendor"))).sort()).toEqual(["algal", "moved", "remote"]);
      expect(second.record.origin).toBe(`${server.base}/catalog/docs/library.md`);
      expect(third.record.origin).toBe(`${server.base}/second/docs/library.md`);
    } finally { server.stop(); }
  });
}, 60_000);

test("vendor update writes a fresh copy and a proposal; the pinned copy is never touched", async () => {
  await temporary("algal-vendor-update-", async dir => {
    const page = await scratchCatalog(dir);
    const { root, record } = await vendoredProject(dir, page);
    const update = (into: string) => proposeVendorUpdate({ directory: "vendor/algal", into, root });

    // An unchanged page re-vendors to the same pin: status reports it.
    const same = await update("vendor/again");
    expect(same.contract).toBe(VENDOR_UPDATE_CONTRACT);
    expect(same.status).toBe("unchanged");
    expect(same.from).toEqual({ directory: "vendor/algal", origin: record.origin, catalog: record.catalog, entry: ENTRY, record: digestCanonical(vendorRecordToJson(record)) });
    expect(same.to).toEqual({ ...same.from, directory: "vendor/again" });
    expect(canonicalize(vendorUpdateToJson(parseVendorUpdate(json(vendorUpdateToJson(same)))))).toBe(canonicalize(vendorUpdateToJson(same)));

    // A revised page produces an update-available proposal with the new pin.
    await reviseClamp(dir, page);
    const revised = await update("vendor/revised");
    expect(revised.status).toBe("update-available");
    expect(revised.from).toEqual(same.from);
    expect(revised.to.directory).toBe("vendor/revised");
    expect(revised.to.origin).toBe(record.origin);
    expect(revised.to.catalog).toBe(digestText(await readFile(page, "utf8")));
    expect(revised.to.entry).toBe(ENTRY);
    const revisedRecord = JSON.parse(await readFile(join(root, "vendor/revised", VENDOR_RECORD_FILE), "utf8")) as JsonValue;
    expect(digestCanonical(revisedRecord)).toBe(revised.to.record);
    const revisedClamp = await readFile(join(root, "vendor/revised", CLAMP), "utf8");
    expect(revisedClamp).toContain("value + 1");
    // The proposal is data only: the old copy and its record are byte-identical.
    expect(await readFile(join(root, "vendor/algal", VENDOR_RECORD_FILE), "utf8")).toBe(`${canonicalize(vendorRecordToJson(record))}\n`);
    expect(await readFile(join(root, "vendor/algal", CLAMP), "utf8")).toContain("else { value }");
    expect((await readdir(join(root, "vendor"))).sort()).toEqual(["again", "algal", "revised"]);

    // A copy whose files no longer match the listed digests refuses before writing.
    const clampPath = program(page, CLAMP);
    await writeFile(clampPath, (await readFile(clampPath, "utf8")).replace("value + 1", "value + 2"));
    const mismatch = await failure(update("vendor/bad"));
    expect(mismatch.code).toBe("DIGEST_MISMATCH");
    expect(mismatch.message).toContain("do not compile to the digests the catalog lists");
    // A page that drops the entry refuses; the record's own origin is what is read.
    await writeFile(clampPath, (await readFile(clampPath, "utf8")).replace("value + 2", "value + 1"));
    const text = await readFile(page, "utf8");
    await writeFile(page, text.replace("- **Path:** [`task-planning/score_task.algal`](../examples/source/projects/task-planning/score_task.algal)", "- **Path:** [`task-planning/other.algal`](../examples/source/projects/task-planning/other.algal)"));
    const gone = await failure(update("vendor/gone"));
    expect(gone.message).toContain(`the catalog lists no entry ${ENTRY}`);
    // Unsafe names and existing directories are refused the vendoring way.
    expect((await failure(proposeVendorUpdate({ directory: "../algal", into: "vendor/x", root }))).message).toContain("normalized project-relative directory");
    expect((await failure(proposeVendorUpdate({ directory: "vendor/algal", into: "vendor/algal", root }))).message).toContain("vendor/algal already exists");
    expect((await failure(proposeVendorUpdate({ directory: "vendor/missing", into: "vendor/x", root }))).message).toContain("vendor/missing");
    expect((await readdir(join(root, "vendor"))).sort()).toEqual(["again", "algal", "revised"]);
  });
}, 60_000);

test("vendor check and update parse foreign data strictly and stay inside their bounds", async () => {
  const pin = { directory: "vendor/algal", origin: "https://example.com/library.md", catalog: `sha256:${"0".repeat(64)}` as Digest, entry: ENTRY, record: `sha256:${"1".repeat(64)}` as Digest };
  const liveDigest = `sha256:${"2".repeat(64)}` as Digest;
  const base = { contract: VENDOR_CHECK_CONTRACT, entries: [{ ...pin, status: "unchanged", live: liveDigest }] };
  const check = (value: unknown) => failure(() => parseVendorCheck(value));
  expect((await check({ ...base, extra: 1 })).message).toContain('vendor check has unknown key "extra"');
  expect((await check({ ...base, contract: "algal.vendor.v1" })).message).toContain(`expected contract "${VENDOR_CHECK_CONTRACT}"`);
  expect((await check({ ...base, entries: [{ ...base.entries[0]!, note: 1 }] })).message).toContain('vendor check entry 0 has unknown key "note"');
  for (const [status, fields, fragment] of [
    ["unchanged", {}, 'requires "live"'],
    ["update-available", { reason: "x" }, 'must not carry "reason"'],
    ["removed", {}, 'removed requires "reason"'],
    ["removed", { reason: "x" }, 'removed requires "live"'],
    ["unreadable", {}, 'requires "reason"'],
  ] as const) {
    const error = await check({ ...base, entries: [{ ...pin, status, ...fields }] });
    expect(error.message, `${status} ${JSON.stringify(fields)}`).toContain(fragment);
  }
  // An unreadable page that was fetched still reports its live digest.
  expect(parseVendorCheck({ ...base, entries: [{ ...pin, status: "unreadable", live: pin.catalog, reason: "x" }] }).entries[0]!.live).toBe(pin.catalog);
  expect((await check({ ...base, entries: [{ ...pin, status: "stale", live: pin.catalog }] })).message).toContain("must be one of");
  const dup = { ...base, entries: [{ ...pin, status: "unchanged", live: pin.catalog }, { ...pin, status: "unchanged", live: pin.catalog }] };
  expect((await check(dup)).message).toContain("sorted by unique directory");
  expect((await check({ ...base, entries: Array.from({ length: VENDOR_CHECK_BOUNDS.maxEntries + 1 }, (_, index) => ({ ...pin, directory: `d${index}`, status: "unchanged", live: pin.catalog })) })).code).toBe("BUDGET_EXHAUSTED");
  expect((await check({ ...base, from: "http://example.com/x.md" })).message).toContain("normalized https or file URL");
  // Rendering refuses foreign objects; only produced or parsed reports render.
  expect((await failure(() => renderVendorCheck(json(vendorCheckToJson(parseVendorCheck(base))) as unknown as VendorCheck))).message).toContain("only reports created by checkVendoredCatalogs or parseVendorCheck");
  // A long reason is bounded.
  const proposal = { contract: VENDOR_UPDATE_CONTRACT, status: "update-available", from: pin, to: { ...pin, directory: "vendor/new" } };
  expect(parseVendorUpdate(proposal).status).toBe("update-available");
  const update = (value: unknown) => failure(() => parseVendorUpdate(value));
  expect((await update({ ...proposal, extra: 1 })).message).toContain('vendor update has unknown key "extra"');
  expect((await update({ ...proposal, status: "removed" })).message).toContain('must be "unchanged" or "update-available"');
  expect((await update({ ...proposal, to: pin })).message).toContain("same directory");
  expect((await update({ ...proposal, from: { ...pin, extra: 1 } })).message).toContain('vendor update from has unknown key "extra"');
});

test("named registries are bounded, strictly parsed data; locks keep their digest without them", async () => {
  await temporary("algal-registries-", async dir => {
    const page = await scratchCatalog(dir);
    const { root, project } = await vendoredProject(dir, page);
    const origin = pathToFileURL(await realpath(page)).href;
    // A registry file is optional data: absent means no names.
    expect(await readVendorRegistries(root)).toBeUndefined();
    const registries = parseVendorRegistries(json(vendorRegistriesToJson(parseVendorRegistries({
      contract: VENDOR_REGISTRIES_CONTRACT,
      registries: { local: origin, upstream: "https://example.com/docs/library.md" },
    }))));
    await writeFile(join(root, VENDOR_REGISTRIES_FILE), `${canonicalize(vendorRegistriesToJson(registries))}\n`);
    expect(await readVendorRegistries(root)).toEqual(registries);
    expect(vendorRegistryOrigin(registries, "local")).toBe(origin);
    expect((await failure(() => vendorRegistryOrigin(registries, "elsewhere"))).message).toContain('no registry named "elsewhere"');
    const refused = async (value: unknown, code: ErrorCode, fragment: string) => {
      const error = await failure(() => parseVendorRegistries(value));
      expect({ code: error.code, message: error.message }).toMatchObject({ code, message: expect.stringContaining(fragment) });
    };
    await refused({ contract: VENDOR_REGISTRIES_CONTRACT, registries: {}, extra: 1 }, "PARSE_FAILED", 'has unknown key "extra"');
    await refused({ contract: "algal.vendor.v1", registries: {} }, "PARSE_FAILED", `expected contract "${VENDOR_REGISTRIES_CONTRACT}"`);
    await refused({ contract: VENDOR_REGISTRIES_CONTRACT, registries: {} }, "PARSE_FAILED", "at least one registry");
    for (const name of ["-bad", ".bad", "a b", "a/b", "", "n".repeat(VENDOR_REGISTRY_BOUNDS.maxNameLength + 1)]) {
      await refused({ contract: VENDOR_REGISTRIES_CONTRACT, registries: { [name]: origin } }, "PARSE_FAILED", "must be a plain token");
    }
    await refused({ contract: VENDOR_REGISTRIES_CONTRACT, registries: { bad: "http://example.com/library.md" } }, "PARSE_FAILED", "normalized https or file URL");
    const wide = Object.fromEntries(Array.from({ length: VENDOR_REGISTRY_BOUNDS.maxRegistries + 1 }, (_, index) => [`r${index}`, origin]));
    await refused({ contract: VENDOR_REGISTRIES_CONTRACT, registries: wide }, "BUDGET_EXHAUSTED", "registries");
    await writeFile(join(root, VENDOR_REGISTRIES_FILE), "{not json");
    expect((await failure(readVendorRegistries(root))).message).toContain(`${VENDOR_REGISTRIES_FILE} is not valid JSON`);

    // Locks: the field is optional, recorded, and never verified.
    const vendored = await loadVendoredSources(project.root, Object.keys(project.sources));
    const plain = json(sourceLockToJson(await createSourceLock(project.source, project.compilerOptions, { vendored })));
    expect(Object.hasOwn(plain, "registries")).toBe(false);
    const named = json(sourceLockToJson(await createSourceLock(project.source, project.compilerOptions, { vendored, registries: registries.registries })));
    expect(named.registries).toEqual(registries.registries);
    expect(digestCanonical(named)).not.toBe(digestCanonical(plain));
    expect(canonicalize(sourceLockToJson(parseSourceLock(named)))).toBe(canonicalize(named));
    const verified = await verifySourceLock(project.source, project.compilerOptions, named, { vendored });
    expect(verified).toMatchObject({ ok: true, lockDigest: digestCanonical(named) });
    // Registry data arriving to createSourceLock is still foreign data.
    expect((await failure(createSourceLock(project.source, project.compilerOptions, { registries: { "bad name": origin } }))).message).toContain("plain token");
    expect((await failure(() => parseSourceLock({ ...plain, registries: { bad: "ftp://x" } }))).message).toContain("normalized https or file URL");
    expect((await failure(() => parseSourceLock({ ...plain, registries: [] }))).code).toBe("PARSE_FAILED");
  });
}, 60_000);

test("vendor check never writes and a project with no vendored copies reports an empty list", async () => {
  await temporary("algal-vendor-check-empty-", async dir => {
    await scratchCatalog(dir);
    const project = join(dir, "project");
    await mkdir(project);
    await writeFile(join(project, "main.algal"), 'program main() -> text {\n  budget { max_agent_calls: 0 }\n  return "ok"\n}\n');
    const loaded = await loadSourceProject(join(project, "main.algal"));
    const vendored = await loadVendoredSources(loaded.root, Object.keys(loaded.sources));
    const report = await checkVendoredCatalogs(vendored);
    expect(report.entries).toEqual([]);
    expect(renderVendorCheck(report)).toContain("0 directories");
    expect(renderVendorCheck(report)).toContain("pins no vendored directories");
  });
});

test("vendor check refuses fetch options outside the vendoring bounds before any request", async () => {
  await temporary("algal-vendor-check-bounds-", async dir => {
    await scratchCatalog(dir);
    const server = serveCatalog(dir);
    try {
      const { vendored } = await vendoredProject(dir, `${server.base}/catalog/docs/library.md`);
      for (const timeoutMs of [0, -1, VENDOR_FETCH_BOUNDS.maxTimeoutMs + 1, 1.5]) {
        const error = await failure(checkVendoredCatalogs(vendored, { timeoutMs }));
        expect(error.message).toContain(`timeout must be 1 to ${VENDOR_FETCH_BOUNDS.maxTimeoutMs} milliseconds`);
      }
      // Without the test seam, a record naming loopback http is unreadable,
      // not fetched: the refusal is a report fact like any other.
      const before = server.requests.length;
      const report = await checkVendoredCatalogs(vendored);
      expect(report.entries[0]!.status).toBe("unreadable");
      expect(report.entries[0]!.reason).toContain("must be an https URL");
      expect(server.requests.length).toBe(before);
    } finally { server.stop(); }
  });
});
