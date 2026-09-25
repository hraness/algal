import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, readdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { parseToolchains } from "../lib/claims";
import { hashFile, hashJson, readJson, type FileBinding } from "../lib/files";
import { array, digest, record, relativePath, requireThat } from "../lib/schema";

const MANIFEST = "verify/lean/runtime.json";
const MANIFEST_SHA256 = "sha256:3dbc8435f7a07710e8b82fa776492b7f4e2eb0eda1aaf73ac2d29cc793efdb1a";
const LEAN_SHA256 = "sha256:1b370cfcbf44e80d1b004ab1b1ab9a4c73951f9f7c242140bcff9bc577576554";
const LAKE_SHA256 = "sha256:c8c24f1398162ab4004e2a869952d8469f54293651151feaad4526f2b8474c6e";

export type LeanRuntime = {
  root: string; lean: string; lake: string; version: "4.34.0";
  manifestSha256: string; filesDigest: string; fileCount: number;
};

/** Expected hashes come from the checksum-qualified immutable archive, never
 * from a newly observed installation. Imported .olean files are included. */
export async function leanRuntime(root: string): Promise<LeanRuntime> {
  requireThat(process.platform === "darwin" && process.arch === "arm64", "Lean runtime is currently qualified only on darwin arm64");
  requireThat(await hashFile(root, MANIFEST) === MANIFEST_SHA256, "Lean distribution inventory changed without qualification");
  const metadata = record(await readJson(root, MANIFEST), ["contract", "version", "commit", "platform", "archive", "files", "assumptions"], "Lean distribution");
  requireThat(metadata.contract === "algal.verification-lean-runtime.v1" && metadata.version === "4.34.0" && metadata.commit === "293d5d0c0c3f3dded4688b3ccd6a33939ac5102b" && metadata.platform === "darwin-arm64", "Lean distribution identity mismatch");
  const expected = array(metadata.files, "Lean distribution files", 17_711, 17_711).map(value => {
    const file = record(value, ["path", "sha256"], "Lean distribution file");
    return { path: relativePath(file.path, "Lean file path"), sha256: digest(file.sha256, "Lean file digest") };
  });
  requireThat(new Set(expected.map(file => file.path)).size === expected.length, "duplicate Lean distribution file");
  const tools = parseToolchains(await readJson(root, "verify/toolchains.json")).tools;
  const lean = tools.find(tool => tool.id === "lean"), lake = tools.find(tool => tool.id === "lake");
  requireThat(lean?.status === "available" && lean.version === "4.34.0" && lean.sha256 === LEAN_SHA256 && lean.command.length === 1 && isAbsolute(lean.command[0]!), "Lean tool pin mismatch");
  requireThat(lake?.status === "available" && lake.version === "5.0.0-src+293d5d0" && lake.sha256 === LAKE_SHA256 && lake.command.length === 1 && isAbsolute(lake.command[0]!), "Lake tool pin mismatch");
  const leanPath = await realpath(lean.command[0]!), lakePath = await realpath(lake.command[0]!);
  const runtimeRoot = dirname(dirname(leanPath));
  requireThat(leanPath === join(runtimeRoot, "bin/lean") && lakePath === join(runtimeRoot, "bin/lake"), "Lean and Lake must use the same pinned runtime");
  const paths: string[] = [];
  let visited = 0;
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(join(runtimeRoot, directory), { withFileTypes: true })) {
      requireThat(++visited <= 20_000, "Lean runtime inventory bound");
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      requireThat(!entry.isSymbolicLink(), "Lean runtime symlink is not admitted");
      if (entry.isDirectory()) await walk(path);
      else { requireThat(entry.isFile(), "Lean runtime nonregular file"); paths.push(path); }
    }
  }
  await walk(""); paths.sort();
  requireThat(JSON.stringify(paths) === JSON.stringify(expected.map(file => file.path)), "Lean runtime file inventory differs");
  const actual: FileBinding[] = [];
  let total = 0;
  for (const path of paths) {
    const file = await open(join(runtimeRoot, path), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const stat = await file.stat();
      requireThat(stat.isFile() && stat.size <= 536_870_912, "Lean runtime file byte/type bound");
      const hash = createHash("sha256"); let bytes = 0;
      for (;;) {
        const chunk = Buffer.alloc(65_536), read = await file.read(chunk);
        if (!read.bytesRead) break;
        bytes += read.bytesRead; total += read.bytesRead;
        requireThat(bytes <= 536_870_912 && total <= 2_860_122_955, "Lean runtime grew beyond qualified bound");
        hash.update(chunk.subarray(0, read.bytesRead));
      }
      actual.push({ path, sha256: `sha256:${hash.digest("hex")}` });
    } finally { await file.close(); }
  }
  requireThat(total === 2_860_122_955 && hashJson(actual) === hashJson(expected), "Lean runtime bytes differ from qualified distribution");
  return { root: runtimeRoot, lean: leanPath, lake: lakePath, version: "4.34.0", manifestSha256: MANIFEST_SHA256, filesDigest: hashJson(actual), fileCount: actual.length };
}
