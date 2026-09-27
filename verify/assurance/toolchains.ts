/** Phase 17 toolchain assurance: checksum-verify every pin in
 * `verify/toolchains.json` that names a provisioned artifact, bind the
 * executed Bun runtime the same way the runner's result binding does, and
 * cross-check `verify/toolchain-distributions.json` against the pin set.
 *
 * A pin that names no local artifact is reported `not-provisioned` rather than
 * failed — the pin is then simply unverified on this host, and the suites that
 * require the tool fail independently. A provisioned artifact whose bytes do
 * not match the pin is always a failure. */

import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { parseToolchains } from "../lib/claims";
import { readJson } from "../lib/files";
import { runCommand, requireSuccess } from "../lib/runner";
import { array, natural, record, requireThat, string } from "../lib/schema";

const MAX_TOOL_BYTES = 536_870_912;

export type ToolVerification = "checksum-verified" | "runtime-bound" | "toolchain-listed" | "command-resolved" | "not-provisioned" | "planned";
export type ToolCheck = {
  id: string; version: string; advertised: "available" | "planned"; pin: string | null;
  verification: ToolVerification; boundArtifacts: { path: string; sha256: string }[];
  distribution: { version: string; platform: string; sha256: string; pinMatchesArchive: boolean } | null;
};
export type ToolchainReport = { tools: ToolCheck[]; distributions: number };

export type Distributions = {
  contract: "algal.verification-toolchain-distributions.v1";
  scope: string;
  distributions: { id: string; version: string; platform: string; url: string; bytes: number; sha256: string; verification: string }[];
};

export function parseDistributions(value: unknown): Distributions {
  const root = record(value, ["contract", "distributions", "scope"], "toolchain distributions");
  requireThat(root.contract === "algal.verification-toolchain-distributions.v1", "unknown toolchain distributions contract");
  const distributions = array(root.distributions, "distributions", 1, 64).map((value, i) => {
    const item = record(value, ["bytes", "id", "platform", "sha256", "url", "verification", "version"], `distribution ${i}`);
    const url = string(item.url, `distribution ${i}.url`, 4096);
    requireThat(url.startsWith("https://"), `distribution ${i}: url must be https`);
    const bytes = natural(item.bytes, `distribution ${i}.bytes`);
    requireThat(bytes > 0 && bytes <= 1_099_511_627_776, `distribution ${i}: byte bound`);
    const sha256 = string(item.sha256, `distribution ${i}.sha256`, 64);
    requireThat(/^[0-9a-f]{64}$/.test(sha256), `distribution ${i}: expected bare sha256 hex`);
    return {
      id: string(item.id, `distribution ${i}.id`, 128), version: string(item.version, `distribution ${i}.version`, 128),
      platform: string(item.platform, `distribution ${i}.platform`, 64), url, bytes, sha256,
      verification: string(item.verification, `distribution ${i}.verification`, 4096),
    };
  });
  requireThat(new Set(distributions.map(item => item.id)).size === distributions.length, "duplicate distribution id");
  return { contract: "algal.verification-toolchain-distributions.v1", scope: string(root.scope, "distributions scope"), distributions };
}

/** Hash an absolute host path — mirrors the runner's runtimeIdentity streaming
 * read with the same 512 MiB bound, so the recorded bytes are the invoked bytes. */
async function hashAbsoluteFile(path: string): Promise<{ path: string; sha256: string }> {
  const real = await realpath(path);
  const file = await open(real, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    requireThat(info.isFile() && info.size > 0 && info.size <= MAX_TOOL_BYTES, `${path}: tool artifact size/type bound`);
    const hash = createHash("sha256");
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(65_536);
      const { bytesRead } = await file.read(chunk);
      if (bytesRead === 0) break;
      total += bytesRead;
      requireThat(total <= MAX_TOOL_BYTES, `${path}: tool artifact grew past byte bound`);
      hash.update(chunk.subarray(0, bytesRead));
    }
    return { path: real, sha256: `sha256:${hash.digest("hex")}` };
  } finally { await file.close(); }
}

async function hashCommandFiles(command: string[]): Promise<{ path: string; sha256: string }[]> {
  const bound: { path: string; sha256: string }[] = [];
  for (const argument of command) {
    if (!isAbsolute(argument)) continue;
    try { bound.push(await hashAbsoluteFile(argument)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "ENOTDIR") continue;
      throw error;
    }
  }
  return bound;
}

export async function checkToolchains(root: string): Promise<ToolchainReport> {
  const toolchains = parseToolchains(await readJson(root, "verify/toolchains.json"));
  const distributions = parseDistributions(await readJson(root, "verify/toolchain-distributions.json"));
  const byId = new Map(distributions.distributions.map(item => [item.id, item]));
  const tools: ToolCheck[] = [];
  for (const tool of toolchains.tools) {
    const distribution = byId.get(tool.id);
    if (distribution !== undefined) {
      requireThat(tool.status === "available", `${tool.id}: a distribution is recorded for a non-available tool`);
      requireThat(distribution.version === tool.version, `${tool.id}: distribution version ${distribution.version} differs from toolchain pin ${tool.version}`);
    }
    const distributionSummary = distribution === undefined ? null
      : { version: distribution.version, platform: distribution.platform, sha256: distribution.sha256, pinMatchesArchive: tool.sha256 === `sha256:${distribution.sha256}` };
    if (tool.status === "planned") {
      requireThat(tool.sha256 === null, `${tool.id}: a planned tool cannot carry a checksum pin`);
      tools.push({ id: tool.id, version: tool.version, advertised: "planned", pin: null, verification: "planned", boundArtifacts: [], distribution: distributionSummary });
      continue;
    }
    const boundArtifacts = await hashCommandFiles(tool.command);
    if (tool.sha256 !== null) {
      if (boundArtifacts.length === 0) {
        tools.push({ id: tool.id, version: tool.version, advertised: "available", pin: tool.sha256, verification: "not-provisioned", boundArtifacts, distribution: distributionSummary });
        continue;
      }
      requireThat(boundArtifacts.some(file => file.sha256 === tool.sha256), `${tool.id}: checksum pin matches no artifact in the recorded command`);
      tools.push({ id: tool.id, version: tool.version, advertised: "available", pin: tool.sha256, verification: "checksum-verified", boundArtifacts, distribution: distributionSummary });
      continue;
    }
    if (tool.id === "bun") {
      // The runner binds the executed Bun binary into every result binding;
      // verify the same identity here rather than trusting a PATH lookup.
      const runtime = await hashAbsoluteFile(process.execPath);
      requireThat(Bun.version === tool.version, `bun: executed runtime ${Bun.version} differs from pinned ${tool.version}`);
      tools.push({ id: tool.id, version: tool.version, advertised: "available", pin: null, verification: "runtime-bound", boundArtifacts: [runtime], distribution: distributionSummary });
      continue;
    }
    const resolved = Bun.which(tool.command[0]!);
    if (resolved === null) {
      tools.push({ id: tool.id, version: tool.version, advertised: "available", pin: null, verification: "not-provisioned", boundArtifacts, distribution: distributionSummary });
      continue;
    }
    if (tool.id === "rust") {
      // Read-only probe: `rustup toolchain list` never installs anything. A
      // missing named toolchain means this host has not provisioned the pin.
      const list = await runCommand([resolved, "toolchain", "list"], root, { timeoutMs: 10_000, maxOutputBytes: 65_536 });
      requireSuccess(list);
      const provisioned = list.stdout.split("\n").some(line => line === tool.version || line.startsWith(`${tool.version}-`));
      tools.push({ id: tool.id, version: tool.version, advertised: "available", pin: null, verification: provisioned ? "toolchain-listed" : "not-provisioned", boundArtifacts, distribution: distributionSummary });
      continue;
    }
    tools.push({ id: tool.id, version: tool.version, advertised: "available", pin: null, verification: "command-resolved", boundArtifacts, distribution: distributionSummary });
  }
  return { tools, distributions: distributions.distributions.length };
}
