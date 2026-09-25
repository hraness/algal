import { expect, test } from "bun:test";
import { cp, mkdir, readdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { digestCanonical, digestText } from "./digest";
import { AlgalError } from "./errors";
import { CLAMP, CONSUMER, ENTRY, scratchCatalog, serveCatalog, temporary } from "./fixtures/vendor-catalog";
import { LIBRARY_INDEX_BOUNDS, LIBRARY_INDEX_PROJECTS, parseLibraryIndex } from "./library-index";
import { createSourceLock, sourceLockToJson, verifySourceLock } from "./source-lock";
import { loadSourceProject } from "./source-project";
import { canonicalize, type JsonObject } from "./values";
import { vendorCatalogEntry, VENDOR_FETCH_BOUNDS } from "./vendor";
import { loadVendoredSources, vendorRecordToJson, VENDOR_BOUNDS, VENDOR_RECORD_FILE } from "./vendor-record";

const failure = async (work: Promise<unknown>): Promise<AlgalError> => {
  try { await work; } catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
const program = (catalog: string, path: string) => join(catalog, "..", "..", LIBRARY_INDEX_PROJECTS, path);

test("vendoring from a local catalog copies the entry and its dependency under their catalog paths", async () => {
  await temporary("algal-vendor-local-", async dir => {
    const page = await scratchCatalog(dir);
    const project = join(dir, "project");
    await mkdir(project);
    const record = await vendorCatalogEntry({ catalog: page, entry: ENTRY, into: "vendor/algal", root: project });
    const text = await readFile(page, "utf8");
    const listed = parseLibraryIndex(text).entries;
    expect(record).toMatchObject({ contract: "algal.vendor.v1", origin: pathToFileURL(await realpath(page)).href, catalog: digestText(text), entry: ENTRY });
    expect(record.files.map(file => file.path)).toEqual([CLAMP, ENTRY]);
    for (const file of record.files) {
      const entry = listed.find(item => item.path === file.path)!;
      expect([file.manifestDigest, file.interfaceDigest]).toEqual([entry.digest, entry.interfaceDigest]);
      const copied = await readFile(join(project, "vendor/algal", file.path), "utf8");
      expect(copied).toBe(await readFile(program(page, file.path), "utf8"));
      expect(file.sourceDigest).toBe(digestText(copied));
    }
    expect(await readFile(join(project, "vendor/algal", VENDOR_RECORD_FILE), "utf8")).toBe(`${canonicalize(vendorRecordToJson(record))}\n`);
    expect((await readdir(join(project, "vendor/algal"), { recursive: true })).sort()).toEqual([VENDOR_RECORD_FILE, "task-planning", "task-planning/lib", `task-planning/lib/clamp.algal`, "task-planning/score_task.algal"]);
    // The project imports the copy by an ordinary relative path and compiles it to the catalog's digests.
    await writeFile(join(project, "main.algal"), CONSUMER);
    const loaded = await loadSourceProject(join(project, "main.algal"));
    for (const file of record.files) expect(loaded.project.units[`vendor/algal/${file.path}`]!.manifestDigest).toBe(file.manifestDigest);
    // A second copy into the same directory is refused and leaves the first untouched.
    const again = await failure(vendorCatalogEntry({ catalog: page, entry: CLAMP, into: "vendor/algal", root: project }));
    expect(again.message).toContain("vendor/algal already exists");
    expect(await readFile(join(project, "vendor/algal", VENDOR_RECORD_FILE), "utf8")).toBe(`${canonicalize(vendorRecordToJson(record))}\n`);
  });
});

test("vendoring refuses unsafe entries, directories, symlinks, and addresses without writing anything", async () => {
  await temporary("algal-vendor-refusals-", async dir => {
    const page = await scratchCatalog(dir);
    const project = join(dir, "project");
    const elsewhere = join(dir, "elsewhere");
    await mkdir(project);
    await mkdir(elsewhere);
    await symlink(elsewhere, join(project, "linked"));
    await writeFile(join(project, "notes.txt"), "not a directory");
    const refused = async (options: { catalog?: string; entry?: string; into?: string; timeoutMs?: number; allowLoopbackHttp?: boolean }, fragment: string) => {
      const error = await failure(vendorCatalogEntry({ catalog: page, entry: ENTRY, into: "vendor/algal", root: project, ...options }));
      expect({ code: error.code, message: error.message }).toMatchObject({ code: "PARSE_FAILED", message: expect.stringContaining(fragment) });
    };
    for (const entry of ["../score_task.algal", "task-planning/../score_task.algal", "score_task.algal", "task-planning/.score_task.algal", "task-planning/score_task"]) {
      await refused({ entry }, "vendor entry must be a relative path of plain segments");
    }
    await refused({ entry: "task-planning/plan_task.algal" }, "the catalog lists no entry task-planning/plan_task.algal");
    for (const into of ["../outside", "/tmp/outside", "vendor/.hidden", "vendor//algal", "vendor/", "", "a b", "x".repeat(VENDOR_FETCH_BOUNDS.maxDirectoryLength + 1)]) {
      await refused({ into }, "the directory to create must be a relative path of plain segments");
    }
    await refused({ into: "linked" }, "linked is a symlink; vendoring never follows one");
    await refused({ into: "linked/algal" }, "linked is a symlink; vendoring never follows one");
    await refused({ into: "notes.txt/algal" }, "notes.txt is not a directory");
    for (const catalog of ["http://example.com/docs/library.md", "http://127.0.0.1:9/docs/library.md", "ftp://example.com/library.md", "file:///etc/library.md", "javascript:alert(1)"]) {
      await refused({ catalog }, "the catalog must be an https URL");
    }
    await refused({ catalog: "http://example.com/docs/library.md", allowLoopbackHttp: true }, "the catalog must be an https URL");
    for (const catalog of ["https://user:secret@example.com/docs/library.md", "https://example.com/docs/library.md?ref=main", "https://example.com/docs/library.md#programs"]) {
      await refused({ catalog }, "must not carry credentials, a query, or a fragment");
    }
    await refused({ catalog: "catalog\n.md" }, "the catalog must be an https URL or a local path");
    await refused({ timeoutMs: 0 }, "timeout must be 1 to 60000 milliseconds");
    await refused({ timeoutMs: VENDOR_FETCH_BOUNDS.maxTimeoutMs + 1 }, "timeout must be 1 to 60000 milliseconds");
    // Nothing was written anywhere, including through the symlink.
    expect((await readdir(project)).sort()).toEqual(["linked", "notes.txt"]);
    expect(await readdir(elsewhere)).toEqual([]);
  });
});

test("vendoring refuses copies that do not compile to the listed digests and oversized or unsafe catalog files", async () => {
  await temporary("algal-vendor-catalog-", async dir => {
    const page = await scratchCatalog(dir);
    const project = join(dir, "project");
    await mkdir(project);
    const clampPath = program(page, CLAMP);
    const clamp = await readFile(clampPath, "utf8");
    const original = await readFile(page, "utf8");
    const attempt = (into: string) => failure(vendorCatalogEntry({ catalog: page, entry: ENTRY, into, root: project }));
    await writeFile(clampPath, clamp.replace("else { value }", "else { value + 1 }"));
    const mismatch = await attempt("vendor/changed");
    expect(mismatch.code).toBe("DIGEST_MISMATCH");
    expect(mismatch.message).toContain("do not compile to the digests the catalog lists");
    expect(mismatch.message).toContain(`${CLAMP}:executable`);
    expect(mismatch.message).toContain(`${ENTRY}:executable`);
    // The catalog pins executable digests, so a comment-only difference is accepted and recorded.
    await writeFile(clampPath, `// A local comment.\n${clamp}`);
    const commented = await vendorCatalogEntry({ catalog: page, entry: ENTRY, into: "vendor/commented", root: project });
    expect(commented.files[0]!.sourceDigest).toBe(digestText(`// A local comment.\n${clamp}`));
    await writeFile(clampPath, clamp.padEnd(VENDOR_BOUNDS.maxFileBytes + 1, " "));
    const large = await attempt("vendor/large");
    expect({ code: large.code, message: large.message }).toEqual({ code: "BUDGET_EXHAUSTED", message: `catalog program ${CLAMP} exceeds ${VENDOR_BOUNDS.maxFileBytes} bytes` });
    await rm(clampPath);
    await writeFile(join(dir, "clamp-copy.algal"), clamp);
    await symlink(join(dir, "clamp-copy.algal"), clampPath);
    expect((await attempt("vendor/linked")).message).toBe(`symlink traversal is not allowed: ${CLAMP}`);
    await rm(clampPath);
    await writeFile(clampPath, clamp);
    await writeFile(page, original.padEnd(LIBRARY_INDEX_BOUNDS.maxBytes + 1, " "));
    const oversized = await attempt("vendor/oversized");
    expect({ code: oversized.code, message: oversized.message }).toEqual({ code: "BUDGET_EXHAUSTED", message: `vendor: catalog page exceeds ${LIBRARY_INDEX_BOUNDS.maxBytes} bytes` });
    await writeFile(page, new Uint8Array([0x23, 0x20, 0xc0, 0x80]));
    expect((await attempt("vendor/latin")).message).toBe("vendor: catalog page is not valid UTF-8");
    // Every program an entry depends on must itself be listed.
    await writeFile(page, original.replace("- **Depends on:** [`task-planning/lib/clamp.algal`](../examples/source/projects/task-planning/lib/clamp.algal)", "- **Depends on:** [`task-planning/lib/other.algal`](../examples/source/projects/task-planning/lib/other.algal)"));
    expect((await attempt("vendor/unlisted")).message).toBe(`vendor: ${ENTRY} depends on task-planning/lib/other.algal, which the catalog does not list`);
    expect((await readdir(join(project, "vendor"))).sort()).toEqual(["commented"]);
  });
});

test("vendoring over loopback http follows the page's links, same-host redirects only, and its limits", async () => {
  await temporary("algal-vendor-http-", async dir => {
    const page = await scratchCatalog(dir);
    const variant = async (name: string, edit: (clamp: string) => string) => {
      await cp(join(dir, "catalog"), join(dir, name), { recursive: true });
      const path = program(join(dir, name, "docs/library.md"), CLAMP);
      await writeFile(path, edit(await readFile(path, "utf8")));
    };
    await variant("changed", clamp => clamp.replace("else { value }", "else { value + 1 }"));
    await variant("large", clamp => clamp.padEnd(VENDOR_BOUNDS.maxFileBytes + 1, " "));
    const server = serveCatalog(dir, {
      "/moved/library.md": () => new Response(null, { status: 301, headers: { location: "/catalog/docs/library.md" } }),
      "/hop/docs/library.md": (_request, base) => new Response(null, { status: 302, headers: { location: `${base.replace("127.0.0.1", "localhost")}/catalog/docs/library.md` } }),
      "/loop/docs/library.md": () => new Response(null, { status: 302, headers: { location: "/loop/docs/library.md" } }),
      "/stream/docs/library.md": () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(LIBRARY_INDEX_BOUNDS.maxBytes + 1).fill(0x61)); controller.close(); } })),
      "/declared/docs/library.md": () => new Response("a".repeat(LIBRARY_INDEX_BOUNDS.maxBytes + 1)),
      "/slow/docs/library.md": () => new Promise<Response>(() => {}),
    });
    try {
      const project = join(dir, "project");
      await mkdir(project);
      const from = (path: string, into: string, timeoutMs?: number) => vendorCatalogEntry({ catalog: `${server.base}${path}`, entry: ENTRY, into, root: project, allowLoopbackHttp: true, ...(timeoutMs === undefined ? {} : { timeoutMs }) });
      const record = await from("/catalog/docs/library.md", "vendor/algal");
      expect(record.origin).toBe(`${server.base}/catalog/docs/library.md`);
      expect(server.requests).toEqual(["/catalog/docs/library.md", `/catalog/examples/source/projects/${CLAMP}`, `/catalog/examples/source/projects/${ENTRY}`]);
      const local = await vendorCatalogEntry({ catalog: page, entry: ENTRY, into: "vendor/local", root: project });
      expect([record.catalog, record.files]).toEqual([local.catalog, local.files]);
      // A redirect within the host is followed, and the final address is the origin.
      expect((await from("/moved/library.md", "vendor/moved")).origin).toBe(`${server.base}/catalog/docs/library.md`);
      const refused = async (path: string, code: string, fragment: string, timeoutMs?: number) => {
        const error = await failure(from(path, "vendor/refused", timeoutMs));
        expect({ path, code: error.code, message: error.message }).toMatchObject({ path, code, message: expect.stringContaining(fragment) });
      };
      server.requests.length = 0;
      await refused("/hop/docs/library.md", "IO_FAILED", `redirects to localhost:${new URL(server.base).port}; only redirects within 127.0.0.1:${new URL(server.base).port} are followed`);
      expect(server.requests).toEqual(["/hop/docs/library.md"]);
      await refused("/loop/docs/library.md", "IO_FAILED", `redirects more than ${VENDOR_FETCH_BOUNDS.maxRedirects} times`);
      await refused("/stream/docs/library.md", "BUDGET_EXHAUSTED", `catalog page exceeds ${LIBRARY_INDEX_BOUNDS.maxBytes} bytes`);
      await refused("/declared/docs/library.md", "BUDGET_EXHAUSTED", `catalog page exceeds ${LIBRARY_INDEX_BOUNDS.maxBytes} bytes`);
      await refused("/large/docs/library.md", "BUDGET_EXHAUSTED", `catalog program ${CLAMP} exceeds ${VENDOR_BOUNDS.maxFileBytes} bytes`);
      await refused("/changed/docs/library.md", "DIGEST_MISMATCH", `${CLAMP}:executable`);
      await refused("/missing/docs/library.md", "IO_FAILED", "catalog page returned HTTP 404");
      await refused("/slow/docs/library.md", "IO_FAILED", "catalog page did not arrive within 300 ms", 300);
      // Without the test seam, plain http is refused before any request.
      const before = server.requests.length;
      expect((await failure(vendorCatalogEntry({ catalog: `${server.base}/catalog/docs/library.md`, entry: ENTRY, into: "vendor/plain", root: project }))).message).toContain("must be an https URL");
      expect(server.requests.length).toBe(before);
      expect((await readdir(join(project, "vendor"))).sort()).toEqual(["algal", "local", "moved"]);
    } finally { server.stop(); }
  });
}, 30_000);

test("lock and verify read a vendored copy without any network request", async () => {
  await temporary("algal-vendor-offline-", async dir => {
    await scratchCatalog(dir);
    const server = serveCatalog(dir);
    const original = globalThis.fetch;
    try {
      const project = join(dir, "project");
      await mkdir(project);
      const record = await vendorCatalogEntry({ catalog: `${server.base}/catalog/docs/library.md`, entry: ENTRY, into: "vendor/algal", root: project, allowLoopbackHttp: true });
      const served = server.requests.length;
      await writeFile(join(project, "main.algal"), CONSUMER);
      let calls = 0;
      globalThis.fetch = (async () => { calls++; throw new Error("network access during lock"); }) as unknown as typeof fetch;
      const loaded = await loadSourceProject(join(project, "main.algal"));
      const vendored = await loadVendoredSources(loaded.root, Object.keys(loaded.sources));
      const lock = JSON.parse(JSON.stringify(sourceLockToJson(await createSourceLock(loaded.source, loaded.compilerOptions, { vendored })))) as JsonObject;
      expect(lock.vendored).toEqual([{ directory: "vendor/algal", origin: record.origin, catalog: record.catalog, entry: ENTRY, record: digestCanonical(vendorRecordToJson(record)) }]);
      expect(await verifySourceLock(loaded.source, loaded.compilerOptions, lock, { vendored })).toMatchObject({ ok: true, vendored: { directories: 1, checked: true } });
      const clampPath = join(project, "vendor/algal", CLAMP);
      await writeFile(clampPath, (await readFile(clampPath, "utf8")).replace("else { value }", "else { value + 1 }"));
      const edited = await loadSourceProject(join(project, "main.algal"));
      const drifted = await verifySourceLock(edited.source, edited.compilerOptions, lock, { vendored: await loadVendoredSources(edited.root, Object.keys(edited.sources)) });
      expect(drifted.drift.filter(entry => entry.kind === "vendor").map(entry => entry.subject)).toEqual([`vendor/algal/${CLAMP}`, `vendor/algal/${CLAMP}:executable`, `vendor/algal/${ENTRY}:executable`]);
      expect(calls).toBe(0);
      expect(server.requests.length).toBe(served);
    } finally {
      globalThis.fetch = original;
      server.stop();
    }
  });
});
