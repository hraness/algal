// Host-owned, foreground coding jobs. A launch intent is never erased or retried.
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, opendir, realpath, readlink } from "node:fs/promises";
import {
  dirname,
  basename,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { asDigest, digestCanonical, digestText, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { hostDirectory, hostLease, hostRead, hostWrite } from "./host-state";
import { FileStore } from "./store";
import type { ToolRegistry } from "./tools";
import {
  asInt,
  asObject,
  asString,
  canonicalBytes,
  noUnknownKeys,
  type JsonValue,
} from "./values";
import { codingCommand, parseXcbEnvelope, xcbTransport } from "./xcb";

export const CODING_JOB_TOOL = "coding.job.observe.v1";
export const CODING_JOB_BOUNDS = {
  maxJobs: 256,
  maxPromptBytes: 65_536,
  maxRuntimeMs: 600_000,
  maxOutputBytes: 1_048_576,
  maxPatchBytes: 1_048_576,
  maxChangedFiles: 64,
  maxTrackedFiles: 16_384,
  maxWorkspaceBytes: 134_217_728,
} as const;
export type CodingJobLimits = {
  maxRuntimeMs: number;
  maxOutputBytes: number;
  maxPatchBytes: number;
  maxChangedFiles: number;
};
export type CodingJobAdapter = {
  executable: string;
  account?: string;
  model?: string;
};
export type CodingJobSource = {
  repository: string;
  pullNumber: number;
  headSha: string;
  baseSha: string;
  mergeSha: string | null;
  baseRef: string;
  evidenceRef: Digest;
};
export type CodingJobOptions = {
  workspace: string;
  expectedHead: string;
  prompt: string;
  adapter: CodingJobAdapter;
  source?: CodingJobSource;
  limits?: Partial<CodingJobLimits>;
};
export type CodingJobIntent = {
  contract: "algal.coding-job.v1";
  workspace: string;
  expectedHead: string;
  sourceTree: string;
  sourceRawDigest: Digest;
  gitDirectory: string;
  workspaceIdentity: { device: string; inode: string };
  prompt: string;
  adapter: CodingJobAdapter;
  limits: CodingJobLimits;
  source?: CodingJobSource;
};
export type CodingJobResult = {
  session: string;
  exitCode: number;
  outputRef: Digest;
  patchRef?: Digest;
  patchDigest?: Digest;
  changedFiles?: number;
};
export type CodingJobSnapshot = {
  jobId: Digest;
  intent: CodingJobIntent;
  status: "prepared" | "uncertain" | "completed" | "failed";
  result?: CodingJobResult;
  reason?: string;
};
export type CodingJobTransport = (request: {
  intent: CodingJobIntent;
  signal: AbortSignal;
}) => Promise<{ exitCode: number; envelope: unknown }>;
type Terminal = {
  contract: "algal.coding-job-result.v1";
  jobId: Digest;
  status: "uncertain" | "completed" | "failed";
  result?: CodingJobResult;
  reason?: string;
};
const json = (value: unknown): JsonValue => value as JsonValue;
const HEAD = /^[0-9a-f]{40}$/;
function invalid(message: string): never {
  throw new AlgalError("PARSE_FAILED", message);
}
function sha(raw: unknown, label: string): string {
  const value = asString(raw, label, 40);
  if (!HEAD.test(value)) invalid(`invalid ${label}`);
  return value;
}
function text(raw: unknown, label: string, max: number): string {
  const value = asString(raw, label, max);
  if (!value || /\0/.test(value)) invalid(`invalid ${label}`);
  return value;
}
function adapter(raw: unknown): CodingJobAdapter {
  const value = asObject(raw, "coding adapter");
  noUnknownKeys(value, ["executable", "account", "model"], "coding adapter");
  const executable = text(value.executable, "xcb executable", 4096);
  if (!isAbsolute(executable) || /[\r\n]/.test(executable))
    invalid("xcb executable must be an absolute host-selected path");
  return {
    executable,
    ...(value.account === undefined
      ? {}
      : { account: text(value.account, "xcb account", 160) }),
    ...(value.model === undefined
      ? {}
      : { model: text(value.model, "xcb model", 256) }),
  };
}
function limits(raw: unknown): CodingJobLimits {
  const value = asObject(raw ?? {}, "coding limits");
  noUnknownKeys(
    value,
    ["maxRuntimeMs", "maxOutputBytes", "maxPatchBytes", "maxChangedFiles"],
    "coding limits",
  );
  return {
    maxRuntimeMs: asInt(
      value.maxRuntimeMs ?? 600_000,
      "maxRuntimeMs",
      1000,
      CODING_JOB_BOUNDS.maxRuntimeMs,
    ),
    maxOutputBytes: asInt(
      value.maxOutputBytes ?? 262_144,
      "maxOutputBytes",
      1024,
      CODING_JOB_BOUNDS.maxOutputBytes,
    ),
    maxPatchBytes: asInt(
      value.maxPatchBytes ?? 262_144,
      "maxPatchBytes",
      1024,
      CODING_JOB_BOUNDS.maxPatchBytes,
    ),
    maxChangedFiles: asInt(
      value.maxChangedFiles ?? 32,
      "maxChangedFiles",
      1,
      CODING_JOB_BOUNDS.maxChangedFiles,
    ),
  };
}
function source(raw: unknown, expectedHead: string): CodingJobSource {
  const value = asObject(raw, "coding source");
  noUnknownKeys(
    value,
    [
      "repository",
      "pullNumber",
      "headSha",
      "baseSha",
      "mergeSha",
      "baseRef",
      "evidenceRef",
    ],
    "coding source",
  );
  const repository = text(value.repository, "source repository", 140);
  if (
    !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(repository)
  )
    invalid("invalid source repository");
  const headSha = sha(value.headSha, "source head");
  if (headSha !== expectedHead)
    invalid("source head does not match expectedHead");
  return {
    repository,
    pullNumber: asInt(value.pullNumber, "source pull", 1, 2_147_483_647),
    headSha,
    baseSha: sha(value.baseSha, "source base"),
    mergeSha:
      value.mergeSha === null ? null : sha(value.mergeSha, "source merge"),
    baseRef: text(value.baseRef, "baseRef", 256),
    evidenceRef: asDigest(value.evidenceRef, "evidenceRef"),
  };
}
function options(raw: unknown): CodingJobOptions & { limits: CodingJobLimits } {
  const value = asObject(raw, "coding options");
  noUnknownKeys(
    value,
    ["workspace", "expectedHead", "prompt", "adapter", "source", "limits"],
    "coding options",
  );
  const expectedHead = sha(value.expectedHead, "expectedHead"),
    prompt = text(
      value.prompt,
      "coding prompt",
      CODING_JOB_BOUNDS.maxPromptBytes,
    );
  if (Buffer.byteLength(prompt) > CODING_JOB_BOUNDS.maxPromptBytes)
    invalid("coding prompt exceeds byte limit");
  const workspace = text(value.workspace, "workspace", 4096);
  if (!isAbsolute(workspace)) invalid("workspace must be absolute");
  return {
    workspace,
    expectedHead,
    prompt,
    adapter: adapter(value.adapter),
    limits: limits(value.limits),
    ...(value.source === undefined
      ? {}
      : { source: source(value.source, expectedHead) }),
  };
}
function parseIntent(raw: unknown): CodingJobIntent {
  const value = asObject(raw, "coding intent");
  noUnknownKeys(
    value,
    [
      "contract",
      "workspace",
      "expectedHead",
      "sourceTree",
      "sourceRawDigest",
      "gitDirectory",
      "workspaceIdentity",
      "prompt",
      "adapter",
      "source",
      "limits",
    ],
    "coding intent",
  );
  if (value.contract !== "algal.coding-job.v1")
    invalid("invalid coding intent contract");
  const {
    contract: _contract,
    sourceTree,
    sourceRawDigest,
    gitDirectory,
    workspaceIdentity,
    ...input
  } = value;
  const parsed = options(input),
    identity = asObject(workspaceIdentity, "workspace identity");
  noUnknownKeys(identity, ["device", "inode"], "workspace identity");
  const device = text(identity.device, "device", 32),
    inode = text(identity.inode, "inode", 32);
  if (!/^\d+$/.test(device) || !/^\d+$/.test(inode))
    invalid("invalid workspace identity");
  const git = text(gitDirectory, "git directory", 4096);
  if (!isAbsolute(git)) invalid("git directory must be absolute");
  return {
    contract: "algal.coding-job.v1",
    ...parsed,
    sourceTree: sha(sourceTree, "source tree"),
    sourceRawDigest: asDigest(sourceRawDigest, "sourceRawDigest"),
    gitDirectory: git,
    workspaceIdentity: { device, inode },
  };
}
function parseTerminal(raw: unknown, jobId: Digest): Terminal {
  const value = asObject(raw, "coding result");
  noUnknownKeys(
    value,
    ["contract", "jobId", "status", "result", "reason"],
    "coding result",
  );
  if (
    value.contract !== "algal.coding-job-result.v1" ||
    value.jobId !== jobId ||
    typeof value.status !== "string" ||
    !["uncertain", "completed", "failed"].includes(value.status)
  )
    invalid("invalid coding result binding");
  const result: Terminal = {
    contract: "algal.coding-job-result.v1",
    jobId,
    status: value.status as Terminal["status"],
  };
  if (value.reason !== undefined)
    result.reason = text(value.reason, "coding reason", 256);
  if (value.result !== undefined) {
    const item = asObject(value.result, "coding artifacts");
    noUnknownKeys(
      item,
      [
        "session",
        "exitCode",
        "outputRef",
        "patchRef",
        "patchDigest",
        "changedFiles",
      ],
      "coding artifacts",
    );
    result.result = {
      session: text(item.session, "coding session", 160),
      exitCode: asInt(item.exitCode, "coding exit code", 0, 255),
      outputRef: asDigest(item.outputRef, "outputRef"),
    };
    if (item.patchRef !== undefined) {
      const ref = asDigest(item.patchRef, "patchRef");
      if (item.patchDigest !== ref) invalid("coding patch digest mismatch");
      result.result.patchRef = ref;
      result.result.patchDigest = ref;
      result.result.changedFiles = asInt(
        item.changedFiles,
        "changedFiles",
        0,
        CODING_JOB_BOUNDS.maxChangedFiles,
      );
    } else if (
      item.patchDigest !== undefined ||
      item.changedFiles !== undefined
    )
      invalid("partial coding patch reference");
  }
  if (result.status === "completed" && !result.result?.patchRef)
    invalid("completed coding job requires patch evidence");
  return result;
}
async function git(
  workspace: string,
  argv: string[],
  max = 1_048_576,
  signal = new AbortController().signal,
): Promise<string> {
  const result = await codingCommand(
    ["git", "--no-pager", "-c", "core.fileMode=true", "-C", workspace, ...argv],
    { cwd: workspace, signal, maxOutputBytes: max, cleanGitEnvironment: true },
  );
  if (result.exitCode !== 0)
    throw new AlgalError(
      "IO_FAILED",
      "read-only Git inspection failed; diagnostics withheld",
    );
  return new TextDecoder("utf-8", { fatal: true }).decode(result.stdout);
}
async function workspaceIdentity(
  workspace: string,
): Promise<{ workspace: string; identity: { device: string; inode: string } }> {
  const stat = await lstat(workspace, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new AlgalError(
      "IO_FAILED",
      "workspace must be a real directory, not a symlink",
    );
  return {
    workspace: await realpath(workspace),
    identity: { device: String(stat.dev), inode: String(stat.ino) },
  };
}
async function rawTrackedDigest(
  workspace: string,
  paths: string[],
  signal?: AbortSignal,
): Promise<Digest> {
  let total = 0;
  const entries: JsonValue[] = [];
  for (const path of paths) {
    if (signal?.aborted)
      throw new AlgalError("BUDGET_EXHAUSTED", "raw workspace scan cancelled");
    const parts = path.split("/");
    if (
      path.length > 4096 ||
      isAbsolute(path) ||
      parts.some(
        (part) => !part || part === "." || part === ".." || part === ".git",
      )
    )
      invalid("unsafe tracked path");
    let parent = workspace,
      missing = false;
    for (const part of parts.slice(0, -1)) {
      parent = join(parent, part);
      try {
        const stat = await lstat(parent);
        if (!stat.isDirectory() || stat.isSymbolicLink())
          throw new AlgalError(
            "CAPABILITY_DENIED",
            "tracked path crosses a symlink or non-directory",
          );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        missing = true;
        break;
      }
    }
    const full = join(workspace, path);
    let stat;
    if (!missing) {
      try {
        stat = await lstat(full, { bigint: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    if (!stat) {
      entries.push({ path, kind: "missing" });
      continue;
    }
    const mode = Number(stat.mode & 0o7777n).toString(8);
    if (stat.isSymbolicLink()) {
      const target = await readlink(full, { encoding: "buffer" });
      if (target.byteLength > 4096)
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          "tracked symlink target exceeds byte bound",
        );
      total += target.byteLength;
      if (total > CODING_JOB_BOUNDS.maxWorkspaceBytes)
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          "raw workspace byte bound exceeded",
        );
      entries.push({
        path,
        kind: "symlink",
        mode,
        digest: `sha256:${createHash("sha256").update(target).digest("hex")}`,
      });
      continue;
    }
    if (!stat.isFile())
      throw new AlgalError(
        "CAPABILITY_DENIED",
        "tracked submodules and special files are not admitted",
      );
    const file = await open(
      full,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      const before = await file.stat({ bigint: true });
      if (
        !before.isFile() ||
        before.dev !== stat.dev ||
        before.ino !== stat.ino ||
        before.size > BigInt(CODING_JOB_BOUNDS.maxWorkspaceBytes - total)
      )
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          "raw workspace type, identity, or byte bound exceeded",
        );
      const hash = createHash("sha256"),
        bytes = Buffer.alloc(65_536);
      let count = 0;
      for (;;) {
        if (signal?.aborted)
          throw new AlgalError(
            "BUDGET_EXHAUSTED",
            "raw workspace scan cancelled",
          );
        const read = await file.read(bytes, 0, bytes.length, count);
        if (!read.bytesRead) break;
        count += read.bytesRead;
        total += read.bytesRead;
        if (
          total > CODING_JOB_BOUNDS.maxWorkspaceBytes ||
          BigInt(count) > before.size
        )
          throw new AlgalError(
            "BUDGET_EXHAUSTED",
            "raw workspace byte bound exceeded",
          );
        hash.update(bytes.subarray(0, read.bytesRead));
      }
      const after = await file.stat({ bigint: true });
      if (
        BigInt(count) !== before.size ||
        before.size !== after.size ||
        before.mtimeNs !== after.mtimeNs ||
        before.ctimeNs !== after.ctimeNs ||
        before.mode !== after.mode
      )
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "tracked file changed during raw capture",
        );
      entries.push({
        path,
        kind: "file",
        mode: Number(before.mode & 0o7777n).toString(8),
        bytes: count,
        digest: `sha256:${hash.digest("hex")}`,
      });
    } finally {
      await file.close();
    }
  }
  return digestCanonical({ contract: "algal.raw-workspace.v1", entries });
}
async function repository(
  workspace: string,
  signal?: AbortSignal,
): Promise<{
  head: string;
  tree: string;
  gitDirectory: string;
  status: string;
  rawDigest: Digest;
}> {
  const root = (
    await git(workspace, ["rev-parse", "--show-toplevel"], 8192, signal)
  ).trim();
  if ((await realpath(root)) !== workspace)
    throw new AlgalError(
      "CAPABILITY_DENIED",
      "workspace must be the repository root",
    );
  const gitDirectory = await realpath(
    (
      await git(workspace, ["rev-parse", "--absolute-git-dir"], 8192, signal)
    ).trim(),
  );
  const head = sha(
    (
      await git(workspace, ["rev-parse", "--verify", "HEAD"], 128, signal)
    ).trim(),
    "Git HEAD",
  );
  const tree = sha(
    (
      await git(
        workspace,
        ["rev-parse", "--verify", "HEAD^{tree}"],
        128,
        signal,
      )
    ).trim(),
    "Git tree",
  );
  const tracked = await git(
    workspace,
    ["ls-files", "-v", "-z"],
    1_048_576,
    signal,
  );
  const trackedEntries = tracked ? tracked.split("\0").slice(0, -1) : [];
  if (
    trackedEntries.length > CODING_JOB_BOUNDS.maxTrackedFiles ||
    trackedEntries.some((entry) => !entry.startsWith("H "))
  )
    throw new AlgalError(
      "CAPABILITY_DENIED",
      "hidden, unmerged, or oversized Git index is not admitted",
    );
  const status = await git(
    workspace,
    [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--ignore-submodules=none",
      "--no-renames",
    ],
    32_768,
    signal,
  );
  const rawDigest = await rawTrackedDigest(
    workspace,
    trackedEntries.map((entry) => entry.slice(2)),
    signal,
  );
  return { head, tree, gitDirectory, status, rawDigest };
}
function inside(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return (
    !path ||
    (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
  );
}
async function canonicalTarget(path: string): Promise<string> {
  const parts: string[] = [];
  let cursor = resolve(path);
  for (let depth = 0; depth < 128; depth++) {
    try {
      return join(await realpath(cursor), ...parts.reverse());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    parts.push(basename(cursor));
    cursor = parent;
  }
  throw new AlgalError(
    "IO_FAILED",
    "coding store path cannot be resolved within its bound",
  );
}
async function readUntracked(
  workspace: string,
  path: string,
  max: number,
): Promise<{ path: string; mode: string; contentBase64: string }> {
  const parts = path.split("/");
  if (
    isAbsolute(path) ||
    parts.some(
      (part) => !part || part === "." || part === ".." || part === ".git",
    )
  )
    invalid("unsafe patch path");
  let current = workspace;
  for (const part of parts.slice(0, -1)) {
    current = join(current, part);
    const stat = await lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new AlgalError("CAPABILITY_DENIED", "patch path crosses a symlink");
  }
  const file = await open(
    join(workspace, path),
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const before = await file.stat();
    if (!before.isFile() || before.size > max)
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "untracked file type or bytes exceed patch bound",
      );
    const bytes = Buffer.alloc(Math.min(before.size + 1, max + 1));
    let count = 0;
    while (count < bytes.length) {
      const next = await file.read(bytes, count, bytes.length - count, count);
      if (!next.bytesRead) break;
      count += next.bytesRead;
    }
    const after = await file.stat();
    if (
      count !== before.size ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      count > max
    )
      throw new AlgalError(
        "DIGEST_MISMATCH",
        "untracked file changed during capture",
      );
    return {
      path,
      mode: before.mode & 0o111 ? "100755" : "100644",
      contentBase64: bytes.subarray(0, count).toString("base64"),
    };
  } finally {
    await file.close();
  }
}
async function patch(
  intent: CodingJobIntent,
  signal?: AbortSignal,
): Promise<JsonValue> {
  const capture = async (): Promise<JsonValue> => {
    const identity = await workspaceIdentity(intent.workspace);
    if (
      identity.workspace !== intent.workspace ||
      digestCanonical(identity.identity) !==
        digestCanonical(intent.workspaceIdentity)
    )
      throw new AlgalError("DIGEST_MISMATCH", "workspace identity changed");
    const repo = await repository(intent.workspace, signal);
    if (
      repo.head !== intent.expectedHead ||
      repo.tree !== intent.sourceTree ||
      repo.gitDirectory !== intent.gitDirectory
    )
      throw new AlgalError(
        "DIGEST_MISMATCH",
        "coding job changed Git HEAD or repository identity",
      );
    const entries = repo.status ? repo.status.split("\0").slice(0, -1) : [];
    if (entries.length > intent.limits.maxChangedFiles)
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "coding job changed too many files",
      );
    const untracked: JsonValue[] = [];
    for (const entry of entries) {
      if (entry.length < 4 || entry[2] !== " ")
        invalid("invalid Git status entry");
      const path = entry.slice(3);
      if (
        path.length > 4096 ||
        isAbsolute(path) ||
        path
          .split("/")
          .some(
            (part) => !part || part === "." || part === ".." || part === ".git",
          )
      )
        invalid("unsafe Git status path");
      if (entry.slice(0, 2) === "??")
        untracked.push(
          json(
            await readUntracked(
              intent.workspace,
              path,
              intent.limits.maxPatchBytes,
            ),
          ),
        );
      else {
        try {
          const stat = await lstat(join(intent.workspace, path));
          if (!stat.isFile() || stat.isSymbolicLink())
            throw new AlgalError(
              "CAPABILITY_DENIED",
              "changed symlinks and submodules are not admitted",
            );
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
    }
    const trackedPatch = await git(
      intent.workspace,
      [
        "diff",
        "--no-ext-diff",
        "--no-textconv",
        "--no-renames",
        "--binary",
        "--full-index",
        intent.expectedHead,
        "--",
      ],
      intent.limits.maxPatchBytes,
      signal,
    );
    const artifact = {
      contract: "algal.coding-patch.v1",
      sourceHead: intent.expectedHead,
      sourceTree: intent.sourceTree,
      sourceRawDigest: intent.sourceRawDigest,
      workspaceRawDigest: repo.rawDigest,
      trackedPatch,
      untracked,
      statusDigest: digestText(repo.status),
      changedFiles: entries.length,
      ignoredFilesExcluded: true,
    };
    if (canonicalBytes(artifact) > intent.limits.maxPatchBytes)
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "coding patch exceeds byte bound",
      );
    return artifact;
  };
  const first = await capture(),
    second = await capture();
  if (digestCanonical(first) !== digestCanonical(second))
    throw new AlgalError(
      "DIGEST_MISMATCH",
      "workspace changed during patch capture",
    );
  return second;
}

export class CodingJobService {
  readonly root: string;
  private readonly transport: CodingJobTransport;
  private readonly store: FileStore;
  constructor(root: string, options: { transport?: CodingJobTransport } = {}) {
    this.root = resolve(root);
    this.transport = options.transport ?? xcbTransport;
    this.store = new FileStore(this.root);
  }
  private path(jobId: Digest): string {
    return join(this.root, "coding-jobs", asDigest(jobId, "jobId").slice(7));
  }
  private async job(jobId: Digest): Promise<CodingJobIntent> {
    for (const path of [
      this.root,
      join(this.root, "coding-jobs"),
      this.path(jobId),
    ]) {
      const stat = await lstat(path);
      if (!stat.isDirectory() || stat.isSymbolicLink())
        throw new AlgalError(
          "IO_FAILED",
          "coding state directories must not be symlinks",
        );
    }
    const raw = await hostRead(join(this.path(jobId), "intent.json"), 131_072);
    if (raw === undefined)
      throw new AlgalError("STORE_MISS", "coding job not found");
    const intent = parseIntent(raw);
    if (digestCanonical(json(intent)) !== jobId)
      throw new AlgalError("DIGEST_MISMATCH", "coding intent digest mismatch");
    return intent;
  }
  private workspacePath(workspace: string): string {
    return join(this.root, "coding-workspaces", digestText(workspace).slice(7));
  }
  private async assertWorkspaceClaim(
    intent: CodingJobIntent,
    jobId: Digest,
    allowOwn: boolean,
  ): Promise<void> {
    const raw = await hostRead(
      join(this.workspacePath(intent.workspace), "claim.json"),
      8192,
    );
    if (raw === undefined) return;
    const claim = asObject(raw, "coding workspace claim");
    noUnknownKeys(
      claim,
      ["contract", "workspace", "jobId"],
      "coding workspace claim",
    );
    if (
      claim.contract !== "algal.coding-workspace-claim.v1" ||
      claim.workspace !== intent.workspace
    )
      throw new AlgalError(
        "DIGEST_MISMATCH",
        "coding workspace claim binding mismatch",
      );
    const ownerId = asDigest(claim.jobId, "workspace claim jobId");
    const owner = await this.inspect(ownerId);
    if (owner.intent.workspace !== intent.workspace)
      throw new AlgalError(
        "DIGEST_MISMATCH",
        "coding workspace claim names another workspace",
      );
    // The same prepared job may finish the claim-before-launch publication gap.
    // A started job is observed by run(), never submitted a second time.
    if (allowOwn && ownerId === jobId) return;
    if (
      (owner.status !== "completed" && owner.status !== "failed") ||
      !owner.result
    )
      throw new AlgalError(
        "CAPABILITY_DENIED",
        "workspace has an unresolved coding job claim",
      );
    const envelope = parseXcbEnvelope(
      await this.store.getValue(owner.result.outputRef),
      owner.intent.limits.maxOutputBytes,
    );
    if (!envelope.outcome.joined || envelope.outcome.effects === "uncertain")
      throw new AlgalError(
        "CAPABILITY_DENIED",
        "workspace claim has no proven settled result",
      );
  }
  async prepare(input: CodingJobOptions): Promise<CodingJobSnapshot> {
    const admitted = options(input); // Copy caller-owned configuration before awaiting.
    const { workspace, identity } = await workspaceIdentity(admitted.workspace);
    const stateRoot = await canonicalTarget(this.root);
    if (inside(workspace, stateRoot) || inside(stateRoot, workspace))
      throw new AlgalError(
        "CAPABILITY_DENIED",
        "coding job store and workspace must be separate",
      );
    return hostLease(
      this.workspacePath(workspace),
      "coding-workspace",
      async () => {
        const repo = await repository(workspace);
        if (repo.head !== admitted.expectedHead || repo.status)
          throw new AlgalError(
            "DIGEST_MISMATCH",
            "prepare requires the exact clean Git HEAD",
          );
        const intent: CodingJobIntent = {
          contract: "algal.coding-job.v1",
          ...admitted,
          workspace,
          sourceTree: repo.tree,
          sourceRawDigest: repo.rawDigest,
          gitDirectory: repo.gitDirectory,
          workspaceIdentity: identity,
        };
        const jobId = digestCanonical(json(intent));
        await this.assertWorkspaceClaim(intent, jobId, true);
        await hostDirectory(this.root);
        await hostDirectory(join(this.root, "coding-jobs"));
        await hostLease(
          join(this.root, "coding-jobs"),
          "coding-jobs",
          async () => {
            let count = 0,
              scanned = 0;
            for await (const entry of await opendir(
              join(this.root, "coding-jobs"),
            )) {
              if (++scanned > CODING_JOB_BOUNDS.maxJobs * 2 + 16)
                throw new AlgalError(
                  "BUDGET_EXHAUSTED",
                  "coding job directory scan limit",
                );
              if (/^\.tmp-[a-f0-9]{48}$/.test(entry.name)) {
                if (!entry.isFile())
                  throw new AlgalError(
                    "IO_FAILED",
                    "invalid unpublished coding state entry",
                  );
                continue;
              }
              if (/^[a-f0-9]{64}$/.test(entry.name)) {
                if (!entry.isDirectory())
                  throw new AlgalError(
                    "IO_FAILED",
                    "invalid coding job directory",
                  );
                count++;
              } else if (
                ![
                  ".owner.sqlite",
                  ".owner.sqlite-journal",
                  ".lock",
                  "owners",
                ].includes(entry.name)
              )
                throw new AlgalError(
                  "IO_FAILED",
                  "unexpected coding job state entry",
                );
              if (count > CODING_JOB_BOUNDS.maxJobs)
                throw new AlgalError(
                  "BUDGET_EXHAUSTED",
                  "coding job count limit",
                );
            }
            const existing = await hostRead(
              join(this.path(jobId), "intent.json"),
              131_072,
            );
            if (count >= CODING_JOB_BOUNDS.maxJobs && existing === undefined)
              throw new AlgalError(
                "BUDGET_EXHAUSTED",
                "coding job count limit",
              );
            await hostDirectory(this.path(jobId));
            await hostWrite(
              join(this.path(jobId), "intent.json"),
              json(intent),
              131_072,
            );
          },
        );
        return this.inspect(jobId);
      },
    );
  }
  async inspect(jobId: Digest): Promise<CodingJobSnapshot> {
    const intent = await this.job(jobId);
    const started = await hostRead(
      join(this.path(jobId), "started.json"),
      1024,
    );
    if (started !== undefined) {
      const item = asObject(started, "coding launch");
      noUnknownKeys(item, ["contract", "jobId"], "coding launch");
      if (
        item.contract !== "algal.coding-job-started.v1" ||
        item.jobId !== jobId
      )
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "coding launch binding mismatch",
        );
    }
    const raw = await hostRead(join(this.path(jobId), "result.json"), 4096);
    if (raw !== undefined) {
      if (started === undefined)
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "coding result has no launch intent",
        );
      const terminal = parseTerminal(raw, jobId);
      if (terminal.result) {
        const output = await this.store.getValue(terminal.result.outputRef);
        if (output === undefined)
          throw new AlgalError("STORE_MISS", "coding output missing");
        const envelope = parseXcbEnvelope(output, intent.limits.maxOutputBytes);
        if (envelope.session !== terminal.result.session)
          throw new AlgalError("DIGEST_MISMATCH", "coding session mismatch");
        if (
          terminal.status === "completed" &&
          (terminal.result.exitCode !== 0 ||
            envelope.state !== "idle" ||
            envelope.outcome.terminal !== "completed" ||
            !envelope.outcome.joined ||
            envelope.outcome.effects === "uncertain" ||
            envelope.outcome.pending_attention ||
            envelope.outcome.failure !== null)
        )
          throw new AlgalError(
            "DIGEST_MISMATCH",
            "completed coding job has no successful settled output",
          );
        if (terminal.result.patchRef) {
          const rawPatch = await this.store.getValue(terminal.result.patchRef);
          if (rawPatch === undefined)
            throw new AlgalError("STORE_MISS", "coding patch missing");
          const artifact = asObject(rawPatch, "coding patch");
          if (
            artifact.contract !== "algal.coding-patch.v1" ||
            artifact.sourceHead !== intent.expectedHead ||
            artifact.sourceTree !== intent.sourceTree ||
            artifact.sourceRawDigest !== intent.sourceRawDigest ||
            artifact.changedFiles !== terminal.result.changedFiles ||
            canonicalBytes(artifact) > intent.limits.maxPatchBytes
          )
            throw new AlgalError(
              "DIGEST_MISMATCH",
              "coding patch binding mismatch",
            );
        }
      }
      return {
        jobId,
        intent,
        status: terminal.status,
        ...(terminal.result ? { result: terminal.result } : {}),
        ...(terminal.reason ? { reason: terminal.reason } : {}),
      };
    }
    return {
      jobId,
      intent,
      status: started === undefined ? "prepared" : "uncertain",
      ...(started === undefined
        ? {}
        : { reason: "launch-started-without-terminal-acknowledgement" }),
    };
  }
  async run(
    jobId: Digest,
    options: { signal?: AbortSignal } = {},
  ): Promise<CodingJobSnapshot> {
    await this.job(jobId);
    return hostLease(
      this.path(jobId),
      `coding-${jobId.slice(7, 31)}`,
      async () => {
        const before = await this.inspect(jobId);
        if (before.status !== "prepared") return before;
        const intent = before.intent;
        const lock = this.workspacePath(intent.workspace);
        return hostLease(lock, "coding-workspace", async () => {
          if (options.signal?.aborted)
            throw new AlgalError(
              "BUDGET_EXHAUSTED",
              "coding job cancelled before launch",
            );
          const current = await workspaceIdentity(intent.workspace),
            repo = await repository(intent.workspace, options.signal);
          if (
            current.workspace !== intent.workspace ||
            digestCanonical(current.identity) !==
              digestCanonical(intent.workspaceIdentity) ||
            repo.head !== intent.expectedHead ||
            repo.tree !== intent.sourceTree ||
            repo.rawDigest !== intent.sourceRawDigest ||
            repo.gitDirectory !== intent.gitDirectory ||
            repo.status
          )
            throw new AlgalError(
              "DIGEST_MISMATCH",
              "run requires the admitted unchanged clean workspace",
            );
          if (options.signal?.aborted)
            throw new AlgalError(
              "BUDGET_EXHAUSTED",
              "coding job cancelled before launch",
            );
          await this.assertWorkspaceClaim(intent, jobId, true);
          await hostWrite(
            join(lock, "claim.json"),
            {
              contract: "algal.coding-workspace-claim.v1",
              workspace: intent.workspace,
              jobId,
            },
            8192,
            false,
          );
          await hostWrite(
            join(this.path(jobId), "started.json"),
            { contract: "algal.coding-job-started.v1", jobId },
            1024,
          );
          const controller = new AbortController();
          const signal = options.signal
            ? AbortSignal.any([options.signal, controller.signal])
            : controller.signal;
          const timer = setTimeout(
            () => controller.abort(),
            intent.limits.maxRuntimeMs,
          );
          let abort: (() => void) | undefined;
          let terminal: Terminal;
          try {
            if (signal.aborted)
              throw new AlgalError(
                "BUDGET_EXHAUSTED",
                "coding job cancelled after launch intent; completion unknown",
              );
            const interrupted = new Promise<never>((_resolve, reject) => {
              abort = () =>
                reject(
                  new AlgalError(
                    "BUDGET_EXHAUSTED",
                    "coding job interrupted; completion unknown",
                  ),
                );
              signal.addEventListener("abort", abort, { once: true });
              if (signal.aborted) abort();
            });
            const response = await Promise.race([
              this.transport({ intent: structuredClone(intent), signal }),
              interrupted,
            ]);
            const exitCode = asInt(
                response.exitCode,
                "coding exit code",
                0,
                255,
              ),
              envelope = parseXcbEnvelope(
                response.envelope,
                intent.limits.maxOutputBytes,
              );
            const outputRef = await this.store.putValue(json(envelope));
            const result: CodingJobResult = {
              session: envelope.session,
              exitCode,
              outputRef,
            };
            const settled =
              envelope.outcome.joined &&
              envelope.outcome.effects !== "uncertain";
            if (!settled || signal.aborted)
              terminal = {
                contract: "algal.coding-job-result.v1",
                jobId,
                status: "uncertain",
                result,
                reason: "external-task-not-proven-settled",
              };
            else {
              const artifact = await patch(intent, signal),
                patchRef = await this.store.putValue(artifact);
              result.patchRef = patchRef;
              result.patchDigest = patchRef;
              result.changedFiles = asObject(artifact, "patch")
                .changedFiles as number;
              const completed =
                !signal.aborted &&
                exitCode === 0 &&
                envelope.state === "idle" &&
                envelope.outcome.terminal === "completed" &&
                !envelope.outcome.pending_attention &&
                envelope.outcome.failure === null;
              terminal = {
                contract: "algal.coding-job-result.v1",
                jobId,
                status: completed ? "completed" : "failed",
                result,
                ...(completed
                  ? {}
                  : { reason: "external-task-did-not-complete-successfully" }),
              };
            }
          } catch (error) {
            terminal = {
              contract: "algal.coding-job-result.v1",
              jobId,
              status: "uncertain",
              reason:
                error instanceof AlgalError
                  ? `external-result-unavailable:${error.code}`
                  : "external-result-unavailable",
            };
          } finally {
            clearTimeout(timer);
            controller.abort();
            if (abort) signal.removeEventListener("abort", abort);
          }
          await hostWrite(
            join(this.path(jobId), "result.json"),
            json(terminal),
            4096,
          );
          return this.inspect(jobId);
        });
      },
    );
  }
  async verifyWorkspace(jobId: Digest): Promise<void> {
    const snapshot = await this.inspect(jobId);
    if (snapshot.status !== "completed" || !snapshot.result?.patchDigest)
      throw new AlgalError(
        "CAPABILITY_DENIED",
        "workspace verification requires a completed coding job",
      );
    await this.assertWorkspaceClaim(snapshot.intent, jobId, false);
    const artifact = await patch(snapshot.intent);
    await this.assertWorkspaceClaim(snapshot.intent, jobId, false);
    if (digestCanonical(artifact) !== snapshot.result.patchDigest)
      throw new AlgalError(
        "DIGEST_MISMATCH",
        "workspace no longer matches the completed coding patch",
      );
  }
  tools(jobId: Digest): ToolRegistry {
    asDigest(jobId, "jobId");
    return new Map([
      [
        CODING_JOB_TOOL,
        {
          configurationDigest: digestCanonical({
            tool: CODING_JOB_TOOL,
            root: this.root,
            jobId,
          }),
          signature: {
            inputs: {},
            outputs: { observation: { type: "json" }, done: { type: "text" } },
            effect: "read",
            cost: 1,
            maxOutputBytes: 8192,
          },
          tool: async () => {
            const snapshot = await this.inspect(jobId);
            const observation = {
              contract: "algal.coding-job-observation.v1",
              jobId,
              status: snapshot.status,
              expectedHead: snapshot.intent.expectedHead,
              ...(snapshot.result ? { result: json(snapshot.result) } : {}),
              ...(snapshot.reason ? { reason: snapshot.reason } : {}),
            };
            return {
              observation,
              done:
                snapshot.status === "completed" || snapshot.status === "failed"
                  ? "done"
                  : "continue",
            };
          },
        },
      ],
    ]);
  }
}
