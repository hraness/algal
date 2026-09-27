/** verify/toolchain-smoke — pinned toolchain inventory smoke checks.
 *
 * Reads verify/toolchains.json and probes each recorded tool: identity is the
 * observed version string, and when the inventory pins a sha256 the digest of
 * the actual resolved bytes must match it. The Lean/Lake tools are qualified
 * by reusing verify/lean/runtime.ts — the pinned distribution's manifest and
 * full file inventory, not a version label. `rust` is probed through its
 * recorded `rustup run 1.97.1 rustc` invocation; `tlc`/`java` through the
 * pinned jar and JDK digests plus a `java -version` execution.
 *
 * A tool that is not installed reports `absent` — an empty machine is not a
 * dishonest inventory. A present tool whose version or digest disagrees with
 * the pin reports `mismatch`, which fails the suite.
 */
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute } from "node:path";
import { parseToolchains } from "../lib/claims";
import { readJson } from "../lib/files";
import { runCommand, type CommandResult } from "../lib/runner";
import { requireThat } from "../lib/schema";
import { leanRuntime } from "../lean/runtime";

export const CONTRACT = "algal.toolchain-smoke.v1";
const LIMITS = { commandMs: 30_000, outputBytes: 65_536, fileBytes: 536_870_912 };
/** Every inventory id the smoke report must carry, whether probed or not. */
const REQUIRED_IDS = ["bun", "rust", "java", "tlc", "lean", "lake"] as const;

export type ToolObservation = {
  id: string; declaredVersion: string; declaredStatus: "available" | "planned";
  /** "match" | "mismatch" | "unpinned" | "absent" — the digest honesty column. */
  digestStatus: "match" | "mismatch" | "unpinned" | "absent";
  state: "verified" | "absent" | "mismatch" | "unverified";
  observedVersion: string | null; observedSha256: string | null;
  probes: string[][]; detail: string;
};

async function hashAbsolute(path: string): Promise<string> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    requireThat(info.isFile() && info.size <= LIMITS.fileBytes, "tool file byte/type bound");
    const hash = createHash("sha256");
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(65_536);
      const { bytesRead } = await file.read(chunk);
      if (bytesRead === 0) break;
      total += bytesRead;
      requireThat(total <= LIMITS.fileBytes, "tool file grew past byte bound");
      hash.update(chunk.subarray(0, bytesRead));
    }
    return `sha256:${hash.digest("hex")}`;
  } finally { await file.close(); }
}

async function filePresent(path: string): Promise<boolean> {
  try { return (await lstat(path)).isFile(); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}

/** command[0] resolution: absolute paths are used as-is; bare names resolve
 * through the host PATH in the test process (the supervised child carries no
 * PATH by design). */
function resolveCommand(command: string[]): string | null {
  requireThat(command.length > 0, "tool command bound");
  const head = command[0]!;
  if (isAbsolute(head)) return head;
  return Bun.which(head);
}

async function probe(cwd: string, command: string[], env: string[] = []): Promise<CommandResult | null> {
  try {
    return await runCommand([...env, ...command], cwd, { timeoutMs: LIMITS.commandMs, maxOutputBytes: LIMITS.outputBytes });
  } catch { return null; }
}

type Tool = ReturnType<typeof parseToolchains>["tools"][number];

function row(tool: Tool, patch: Partial<ToolObservation>): ToolObservation {
  return {
    id: tool.id, declaredVersion: tool.version, declaredStatus: tool.status,
    digestStatus: "absent", state: "absent", observedVersion: null, observedSha256: null, probes: [], detail: "",
    ...patch,
  };
}

async function probeBun(tool: Tool): Promise<ToolObservation> {
  const binary = await realpath(process.execPath);
  const observedSha256 = await hashAbsolute(binary);
  const ok = Bun.version === tool.version;
  return row(tool, {
    digestStatus: tool.sha256 === null ? "unpinned" : tool.sha256 === observedSha256 ? "match" : "mismatch",
    state: ok ? "verified" : "mismatch",
    observedVersion: Bun.version, observedSha256, detail: `executing runtime ${binary}`,
  });
}

async function probeRust(root: string, tool: Tool): Promise<ToolObservation> {
  const rustup = resolveCommand(tool.command);
  if (rustup === null) return row(tool, { digestStatus: "unpinned", detail: `${tool.command[0]} is not on PATH` });
  // rustup resolves toolchains under $HOME/.rustup; the supervised child gets
  // an explicit minimal environment rather than the ambient session's.
  const argv = [rustup, ...tool.command.slice(1), "--version"];
  const result = await probe(root, ["/usr/bin/env", "-i", `HOME=${homedir()}`, "LANG=C", "LC_ALL=C", "TZ=UTC", ...argv]);
  const observedVersion = result && result.exitCode === 0 ? /^rustc (\S+)/.exec(result.stdout)?.[1] ?? null : null;
  if (observedVersion === null)
    return row(tool, { digestStatus: "unpinned", probes: [argv], detail: `recorded toolchain invocation did not produce a rustc version (exit ${result?.exitCode ?? "spawn failure"})` });
  return row(tool, {
    digestStatus: "unpinned", state: observedVersion === tool.version ? "verified" : "mismatch",
    observedVersion, probes: [argv],
    detail: observedVersion === tool.version ? "recorded rustup toolchain resolves" : `pin declares ${tool.version}`,
  });
}

async function probeJava(root: string, tool: Tool): Promise<ToolObservation> {
  const binary = tool.command[0]!;
  if (!(await filePresent(binary))) return row(tool, { detail: `${binary} is absent` });
  const observedSha256 = await hashAbsolute(await realpath(binary));
  if (tool.sha256 !== observedSha256) return row(tool, { digestStatus: "mismatch", state: "mismatch", observedSha256, detail: "executable digest differs from the pin" });
  const result = await probe(root, [binary, "-version"]);
  const core = /^\d+\.\d+\.\d+/.exec(tool.version)?.[0];
  const text = result ? result.stdout + result.stderr : "";
  const ok = result !== null && result.exitCode === 0 && core !== undefined && text.includes(`"${core}"`);
  return row(tool, {
    digestStatus: "match", state: ok ? "verified" : "mismatch",
    observedVersion: text.split("\n").find(line => line.includes("version"))?.trim() ?? null,
    observedSha256, probes: [[binary, "-version"]],
    detail: ok ? "pinned JDK executes and reports the recorded release line" : `java -version output did not name ${tool.version}`,
  });
}

async function probeTlc(root: string, tool: Tool): Promise<ToolObservation> {
  const jar = tool.command.find(argument => argument.endsWith(".jar"));
  requireThat(jar !== undefined && isAbsolute(jar), "TLC tool command carries no pinned jar");
  if (!(await filePresent(jar))) return row(tool, { detail: `${jar} is absent` });
  const observedSha256 = await hashAbsolute(jar);
  const ok = tool.sha256 === observedSha256;
  return row(tool, {
    digestStatus: ok ? "match" : "mismatch", state: ok ? "verified" : "mismatch", observedSha256,
    detail: ok
      ? "tla2tools jar bytes match the pin; the Java side is verified by the java row, engine identity by the tla suites"
      : "tla2tools jar digest differs from the pin",
  });
}

async function probeLean(root: string, tool: Tool): Promise<ToolObservation> {
  const binary = tool.command[0]!;
  if (process.platform !== "darwin" || process.arch !== "arm64")
    return row(tool, { detail: "the pinned Lean distribution is qualified only on darwin arm64" });
  if (!(await filePresent(binary))) return row(tool, { detail: `${binary} is absent` });
  // Present but dishonest is a failure: leanRuntime re-verifies the recorded
  // manifest digest and all 17,711 distribution file digests, and throws on
  // any deviation rather than reporting it.
  const runtime = await leanRuntime(root);
  return row(tool, {
    digestStatus: "match", state: "verified", observedVersion: runtime.version, observedSha256: runtime.filesDigest,
    detail: `manifest ${runtime.manifestSha256} over ${runtime.fileCount} files at ${runtime.root}`,
  });
}

async function probeLake(root: string, tool: Tool): Promise<ToolObservation> {
  const binary = tool.command[0]!;
  if (!(await filePresent(binary))) return row(tool, { detail: `${binary} is absent` });
  const observedSha256 = await hashAbsolute(await realpath(binary));
  const ok = tool.sha256 === observedSha256;
  return row(tool, {
    digestStatus: ok ? "match" : "mismatch", state: ok ? "verified" : "mismatch", observedSha256,
    detail: ok ? "bundled lake binary bytes match the pin" : "lake binary digest differs from the pin",
  });
}

async function probeGeneric(root: string, tool: Tool): Promise<ToolObservation> {
  const resolved = resolveCommand(tool.command);
  if (resolved === null || !(await filePresent(resolved)))
    return row(tool, { state: tool.status === "planned" ? "unverified" : "absent", detail: `${tool.command[0]} is not on PATH` });
  if (tool.sha256 !== null) {
    const observedSha256 = await hashAbsolute(await realpath(resolved));
    const ok = tool.sha256 === observedSha256;
    return row(tool, { digestStatus: ok ? "match" : "mismatch", state: ok ? "verified" : "mismatch", observedSha256, detail: "generic presence and digest probe" });
  }
  return row(tool, {
    digestStatus: "unpinned", state: tool.status === "planned" ? "unverified" : "verified",
    observedSha256: await hashAbsolute(await realpath(resolved)),
    detail: tool.status === "planned" ? "declared planned; presence observed, no pin to verify" : "resolved on PATH; no version or digest pin recorded",
  });
}

/** Probe every declared tool in inventory order. A failed or missing tool is
 * recorded in its row and never skips the remaining probes. */
export async function toolchainSmoke(root: string): Promise<{ contract: typeof CONTRACT; tools: ToolObservation[] }> {
  const tools = parseToolchains(await readJson(root, "verify/toolchains.json")).tools;
  requireThat(tools.length <= 64, "toolchain inventory bound");
  const observations: ToolObservation[] = [];
  for (const tool of tools) {
    if (tool.id === "bun") observations.push(await probeBun(tool));
    else if (tool.id === "rust") observations.push(await probeRust(root, tool));
    else if (tool.id === "java") observations.push(await probeJava(root, tool));
    else if (tool.id === "tlc") observations.push(await probeTlc(root, tool));
    else if (tool.id === "lean") observations.push(await probeLean(root, tool));
    else if (tool.id === "lake") observations.push(await probeLake(root, tool));
    else observations.push(await probeGeneric(root, tool));
  }
  const report = { contract: CONTRACT, tools: observations };
  requireThat(Buffer.byteLength(JSON.stringify(report)) <= 65_536, "toolchain-smoke report byte bound");
  return report;
}

export { REQUIRED_IDS };
