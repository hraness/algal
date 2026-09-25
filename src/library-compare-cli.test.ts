import { expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { libraryCaseId, parseLibraryComparison, LIBRARY_UNSEEN_CASES_CONTRACT } from "./library-comparison";
import { LIBRARY_INDEX_PROJECTS } from "./library-index";
import { canonicalize, type JsonObject } from "./values";

const root = resolve(import.meta.dir, "..");
async function cli(cwd: string, ...args: string[]) {
  const child = Bun.spawn([process.execPath, join(root, "cli.ts"), ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
}

test("library compare writes a canonical record, exits by its verdict, and checks a saved record", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-library-cli-"));
  try {
    await cp(join(root, LIBRARY_INDEX_PROJECTS), join(dir, LIBRARY_INDEX_PROJECTS), { recursive: true });
    const unseenFile = join(dir, "clamp.unseen.json");
    await writeFile(unseenFile, JSON.stringify({
      contract: LIBRARY_UNSEEN_CASES_CONTRACT,
      cases: [{ name: "urgency-above-range", entry: "task-planning/inspect_task.algal", args: { input: { task: { id: "keys", title: "Rotate keys", status: "open", urgency: 9, impact: 3 }, weights: { urgency: 2, impact: 1 }, threshold: 12 } } }],
    }, null, 2));
    const pinned = await cli(dir, "library", "unseen", unseenFile);
    expect(pinned.code, pinned.stderr).toBe(0);
    const summary = JSON.parse(pinned.stdout) as JsonObject;
    expect(summary).toMatchObject({ contract: LIBRARY_UNSEEN_CASES_CONTRACT, cases: 1 });
    // Pin the file on clamp's entry, the way maintainers would before a revision is proposed.
    const page = await readFile(join(root, "docs/library.md"), "utf8");
    const clampLine = page.indexOf("- **Unseen cases:** None pinned.");
    await mkdir(join(dir, "docs"));
    await writeFile(join(dir, "docs/library.md"), `${page.slice(0, clampLine)}- **Unseen cases:** \`${String(summary.digest)}\`${page.slice(clampLine + "- **Unseen cases:** None pinned.".length)}`);
    const clamp = await readFile(join(root, LIBRARY_INDEX_PROJECTS, "task-planning/lib/clamp.algal"), "utf8");
    const revision = join(dir, "clamp-revision.algal");
    await writeFile(revision, clamp.replace("value < minimum", "minimum > value").replace("value > maximum", "maximum < value"));
    const recordPath = join(dir, "clamp.comparison.json");
    // The repository defaults to the working directory.
    const compared = await cli(dir, "library", "compare", "clamp", revision, "--unseen", unseenFile, "--out", recordPath);
    expect(compared.code, compared.stderr).toBe(0);
    expect(compared.stdout).toBe("");
    const text = await readFile(recordPath, "utf8");
    expect(text).toBe(`${canonicalize(JSON.parse(text))}\n`);
    expect(parseLibraryComparison(JSON.parse(text)).verdict.passed).toBe(true);
    const verified = await cli(root, "library", "compare", "clamp", revision, "--unseen", unseenFile, "--repository", dir, "--verify", recordPath, "--format", "text");
    expect(verified.code, verified.stderr).toBe(0);
    expect(verified.stdout).toStartWith("ALGAL library comparison · passed · clamp (task-planning/lib/clamp.algal)\n");
    // A revision that changes a result exits 1 with its record, and the saved record no longer verifies.
    const failing = join(dir, "clamp-plus-one.algal");
    await writeFile(failing, clamp.replace("else { value }", "else { value + 1 }"));
    const failed = await cli(dir, "library", "compare", "clamp", failing, "--unseen", unseenFile);
    expect(failed.code, failed.stderr).toBe(1);
    expect(parseLibraryComparison(JSON.parse(failed.stdout)).verdict.changed).toContain("pinned:task-planning/main.algal#three-tasks");
    const mismatch = await cli(dir, "library", "compare", "clamp", failing, "--unseen", unseenFile, "--verify", recordPath);
    expect(mismatch.code).toBe(2);
    expect(mismatch.stdout).toBe("");
    expect(JSON.parse(mismatch.stderr)).toMatchObject({ error: "RECEIPT_MISMATCH", message: expect.stringContaining("differs from a fresh comparison") });
    // The same failing revision passes when a declaration names exactly the
    // observed changes; the declaration must be supplied to verify it too.
    const intendedFile = join(dir, "clamp.intended.json");
    const changedIds = parseLibraryComparison(JSON.parse(failed.stdout)).cases
      .filter(row => row.candidate !== null && (row.candidate.outcome !== row.base.outcome || row.candidate.outputs !== row.base.outputs))
      .map(libraryCaseId).sort();
    expect(changedIds).toEqual([
      "pinned:support-queue/main.algal#three-tickets", "pinned:task-planning/inspect_task.algal#polish", "pinned:task-planning/main.algal#three-tasks",
      "unseen:task-planning/inspect_task.algal#urgency-above-range",
    ]);
    await writeFile(intendedFile, JSON.stringify({ changed: changedIds, reason: "corrected" }));
    const authorized = await cli(dir, "library", "compare", "clamp", failing, "--unseen", unseenFile, "--intended", intendedFile, "--out", intendedFile + ".record.json");
    expect(authorized.code, authorized.stderr).toBe(0);
    expect(authorized.stdout).toBe("");
    const declared = parseLibraryComparison(JSON.parse(await readFile(`${intendedFile}.record.json`, "utf8")));
    expect(declared.verdict).toMatchObject({ passed: true, changed: changedIds });
    expect(declared.intended).toEqual({ changed: changedIds, reason: "corrected" });
    const verifiedIntended = await cli(dir, "library", "compare", "clamp", failing, "--unseen", unseenFile, "--intended", intendedFile, "--verify", `${intendedFile}.record.json`);
    expect(verifiedIntended.code, verifiedIntended.stderr).toBe(0);
    const missingIntended = await cli(dir, "library", "compare", "clamp", failing, "--unseen", unseenFile, "--verify", `${intendedFile}.record.json`);
    expect(missingIntended.code).toBe(2);
    expect(JSON.parse(missingIntended.stderr)).toMatchObject({ error: "RECEIPT_MISMATCH", message: expect.stringContaining("in intended, verdict") });
    // A declaration that names fewer cases than changed still exits 1; a
    // malformed declaration is refused before the comparison runs.
    await writeFile(intendedFile, JSON.stringify({ changed: ["pinned:task-planning/main.algal#three-tasks"], reason: "corrected" }));
    const underdeclared = await cli(dir, "library", "compare", "clamp", failing, "--unseen", unseenFile, "--intended", intendedFile);
    expect(underdeclared.code).toBe(1);
    expect(parseLibraryComparison(JSON.parse(underdeclared.stdout)).verdict.passed).toBe(false);
    await writeFile(intendedFile, JSON.stringify({ changed: changedIds, reason: "improved" }));
    const malformedIntended = await cli(dir, "library", "compare", "clamp", failing, "--unseen", unseenFile, "--intended", intendedFile);
    expect(malformedIntended.code).toBe(2);
    expect(JSON.parse(malformedIntended.stderr)).toMatchObject({ error: "PARSE_FAILED", message: expect.stringContaining("reason must be one of corrected, extended, restricted") });
    const unpinned = await cli(root, "library", "compare", "clamp", revision, "--unseen", unseenFile);
    expect(unpinned.code).toBe(2);
    expect(JSON.parse(unpinned.stderr)).toMatchObject({ error: "DIGEST_MISMATCH", message: expect.stringContaining(`pin ${String(summary.digest)}`) });
    for (const [args, fragment] of [
      [["library"], "usage: algal library compare"],
      [["library", "compare", "clamp"], "usage: algal library compare"],
      [["library", "compare", "clamp", unseenFile], "usage: algal library compare"],
      [["library", "compare", "clamp", revision, "--modules", dir], "unknown library compare option --modules"],
      [["library", "compare", "clamp", revision, "--episodes"], "unknown library compare option --episodes"],
      [["library", "compare", "clamp", revision, "--format", "yaml"], "json or text"],
      [["library", "compare", "clamp", revision, "--unseen", unseenFile, "--out", revision], "aliases an input"],
      [["library", "compare", "clamp", join(dir, "missing.algal")], "cannot read revision"],
      [["library", "compare", "clamp", revision, "--repository", join(dir, "missing")], "cannot resolve the repository directory"],
      [["library", "unseen"], "usage: algal library unseen"],
      [["library", "unseen", unseenFile, "--out", recordPath], "usage: algal library unseen"],
      [["library", "unseen", revision], "JSON Parse error"],
    ] as const) {
      const result = await cli(dir, ...args);
      expect({ args, code: result.code, stdout: result.stdout }).toEqual({ args, code: 2, stdout: "" });
      expect(String((JSON.parse(result.stderr) as JsonObject).message)).toContain(fragment);
    }
    expect(parseLibraryComparison(JSON.parse(await readFile(recordPath, "utf8"))).verdict.passed).toBe(true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 120_000);
