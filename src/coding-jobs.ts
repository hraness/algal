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
import {
  hostDirectory,
  hostLease,
  hostNames,
  hostRead,
  hostWrite,
} from "./host-state";
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
import {
  codingOperationCommandTransport,
  parseCodingOperationAdapter,
  parseCodingOperationBinding,
  parseCodingOperationOutcome,
  type CodingOperationAdapter,
  type CodingOperationBinding,
  type CodingOperationOutcome,
  type CodingOperationTransport,
} from "./coding-operations";

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
export type CodingJobOperationOptions = Omit<CodingJobOptions, "adapter"> & {
  operationId: string;
  adapter: CodingOperationAdapter;
};
export type CodingJobOperationIntent = Omit<
  CodingJobIntent,
  "contract" | "adapter"
> & {
  contract: "algal.coding-job.v2";
  adapter: CodingOperationAdapter;
  operation: CodingOperationBinding;
};
export type AnyCodingJobIntent = CodingJobIntent | CodingJobOperationIntent;
export type CodingJobResult = {
  session: string;
  operationId?: string;
  exitCode: number;
  outputRef: Digest;
  patchRef?: Digest;
  patchDigest?: Digest;
  changedFiles?: number;
};
export type CodingJobSnapshot = {
  jobId: Digest;
  intent: AnyCodingJobIntent;
  status: "prepared" | "uncertain" | "completed" | "failed";
  result?: CodingJobResult;
  reason?: string;
};
export type CodingJobTransport = (request: {
  intent: CodingJobIntent;
  signal: AbortSignal;
}) => Promise<{ exitCode: number; envelope: unknown }>;
type Terminal = {
  contract: "algal.coding-job-result.v1" | "algal.coding-job-result.v2";
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
function parseV1Intent(raw: unknown): CodingJobIntent {
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
/** The immutable provider request binds the complete admitted source and route. */
export function codingJobOperationPayload(
  intent: CodingJobOperationIntent,
): JsonValue {
  const { contract: _contract, operation, ...request } = intent;
  return json({
    contract: "algal.coding-job-request.v2",
    operationId: operation.operationId,
    ...request,
  });
}
function operationOptions(
  raw: unknown,
): CodingJobOperationOptions & { limits: CodingJobLimits } {
  const value = asObject(raw, "coding operation options");
  noUnknownKeys(
    value,
    [
      "workspace",
      "expectedHead",
      "prompt",
      "adapter",
      "operationId",
      "source",
      "limits",
    ],
    "coding operation options",
  );
  const route = parseCodingOperationAdapter(value.adapter);
  const binding = parseCodingOperationBinding({
    operationId: value.operationId,
    authorityId: route.authorityId,
    requestDigest: digestText(""),
  });
  const { operationId: _operationId, adapter: _adapter, ...common } = value;
  const parsed = options({
    ...common,
    adapter: { executable: route.executable },
  });
  return { ...parsed, operationId: binding.operationId, adapter: route };
}
function parseIntent(raw: unknown): AnyCodingJobIntent {
  const value = asObject(raw, "coding intent");
  if (value.contract !== "algal.coding-job.v2") return parseV1Intent(raw);
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
      "operation",
    ],
    "coding operation intent",
  );
  const route = parseCodingOperationAdapter(value.adapter),
    operation = parseCodingOperationBinding(value.operation);
  const { operation: _operation, ...common } = value;
  const parsed = parseV1Intent({
    ...common,
    contract: "algal.coding-job.v1",
    adapter: { executable: route.executable },
  });
  const intent: CodingJobOperationIntent = {
    ...parsed,
    contract: "algal.coding-job.v2",
    adapter: route,
    operation,
  };
  if (
    operation.authorityId !== route.authorityId ||
    digestCanonical(codingJobOperationPayload(intent)) !==
      operation.requestDigest
  )
    throw new AlgalError(
      "DIGEST_MISMATCH",
      "coding operation request binding mismatch",
    );
  return intent;
}
function parseTerminal(
  raw: unknown,
  jobId: Digest,
  contract: Terminal["contract"] = "algal.coding-job-result.v1",
): Terminal {
  const value = asObject(raw, "coding result");
  noUnknownKeys(
    value,
    ["contract", "jobId", "status", "result", "reason"],
    "coding result",
  );
  if (
    value.contract !== contract ||
    value.jobId !== jobId ||
    typeof value.status !== "string" ||
    !["uncertain", "completed", "failed"].includes(value.status)
  )
    invalid("invalid coding result binding");
  const result: Terminal = {
    contract,
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
        ...(contract === "algal.coding-job-result.v2" ? ["operationId"] : []),
      ],
      "coding artifacts",
    );
    result.result = {
      session: text(item.session, "coding session", 160),
      exitCode: asInt(item.exitCode, "coding exit code", 0, 255),
      outputRef: asDigest(item.outputRef, "outputRef"),
    };
    if (contract === "algal.coding-job-result.v2")
      result.result.operationId = text(
        item.operationId,
        "coding operationId",
        160,
      );
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
  intent: AnyCodingJobIntent,
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
  private readonly operationTransport: CodingOperationTransport | undefined;
  constructor(
    root: string,
    options: {
      transport?: CodingJobTransport;
      operationTransport?: CodingOperationTransport;
    } = {},
  ) {
    this.root = resolve(root);
    this.transport = options.transport ?? xcbTransport;
    this.operationTransport = options.operationTransport;
    this.store = new FileStore(this.root);
  }
  private path(jobId: Digest): string {
    return join(this.root, "coding-jobs", asDigest(jobId, "jobId").slice(7));
  }
  private async job(jobId: Digest): Promise<AnyCodingJobIntent> {
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
    if (intent.contract === "algal.coding-job.v2") {
      const key = digestCanonical({
        authorityId: intent.operation.authorityId,
        operationId: intent.operation.operationId,
      });
      const directory = join(this.root, "coding-operations"),
        stat = await lstat(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink())
        throw new AlgalError(
          "IO_FAILED",
          "operation admission directory must not be a symlink",
        );
      const admission = await hostRead(
        join(directory, `${key.slice(7)}.json`),
        4096,
      );
      if (
        digestCanonical(admission ?? null) !==
        digestCanonical({
          contract: "algal.coding-operation-admission.v1",
          jobId,
          ...intent.operation,
        })
      )
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "operation admission binding mismatch",
        );
    }
    return intent;
  }
  private workspacePath(workspace: string): string {
    return join(this.root, "coding-workspaces", digestText(workspace).slice(7));
  }
  private async assertWorkspaceClaim(
    intent: AnyCodingJobIntent,
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
    if (owner.intent.contract === "algal.coding-job.v2") {
      const outcome = parseCodingOperationOutcome(
        await this.store.getValue(owner.result.outputRef),
        owner.intent.operation,
        { maxOutputBytes: owner.intent.limits.maxOutputBytes },
      );
      if (outcome.state !== "terminal")
        throw new AlgalError(
          "CAPABILITY_DENIED",
          "workspace claim has no proven settled operation",
        );
      return;
    }
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
    return this.admit(options(input));
  }
  async prepareOperation(
    input: CodingJobOperationOptions,
  ): Promise<CodingJobSnapshot> {
    return this.admit(operationOptions(input));
  }
  private async admit(
    admitted: (CodingJobOptions | CodingJobOperationOptions) & {
      limits: CodingJobLimits;
    },
  ): Promise<CodingJobSnapshot> {
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
        const { adapter: route, ...admission } = admitted;
        const { operationId: _operationId, ...common } =
          admission as typeof admission & { operationId?: string };
        const fields = {
          ...common,
          workspace,
          sourceTree: repo.tree,
          sourceRawDigest: repo.rawDigest,
          gitDirectory: repo.gitDirectory,
          workspaceIdentity: identity,
        };
        let intent: AnyCodingJobIntent;
        if ("operationId" in admitted) {
          const adapter = route as CodingOperationAdapter;
          const draft: CodingJobOperationIntent = {
            ...fields,
            contract: "algal.coding-job.v2",
            adapter,
            operation: {
              operationId: admitted.operationId,
              authorityId: adapter.authorityId,
              requestDigest: digestText(""),
            },
          };
          draft.operation.requestDigest = digestCanonical(
            codingJobOperationPayload(draft),
          );
          intent = parseIntent(draft);
        } else
          intent = {
            ...fields,
            contract: "algal.coding-job.v1",
            adapter: route as CodingJobAdapter,
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
            if (intent.contract === "algal.coding-job.v2") {
              const operationKey = digestCanonical({
                authorityId: intent.operation.authorityId,
                operationId: intent.operation.operationId,
              });
              const operationDirectory = join(this.root, "coding-operations"),
                operationName = `${operationKey.slice(7)}.json`;
              const admittedNames = await hostNames(
                operationDirectory,
                CODING_JOB_BOUNDS.maxJobs,
                /^[a-f0-9]{64}\.json$/,
              );
              if (
                admittedNames.length >= CODING_JOB_BOUNDS.maxJobs &&
                !admittedNames.includes(operationName)
              )
                throw new AlgalError(
                  "BUDGET_EXHAUSTED",
                  "operation admission count limit",
                );
              await hostWrite(
                join(operationDirectory, operationName),
                {
                  contract: "algal.coding-operation-admission.v1",
                  jobId,
                  ...intent.operation,
                },
                4096,
              );
            }
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
    if (intent.contract === "algal.coding-job.v2")
      return this.inspectOperation(jobId, intent, started !== undefined);
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
        if (intent.contract === "algal.coding-job.v2")
          return this.runOperation(jobId, intent, options);
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
  private async operationHistory(
    jobId: Digest,
    intent: CodingJobOperationIntent,
  ): Promise<{ ref: Digest; outcome: CodingOperationOutcome }[]> {
    const directory = join(this.path(jobId), "observations");
    let names: string[];
    try {
      const stat = await lstat(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink())
        throw new AlgalError(
          "IO_FAILED",
          "invalid operation evidence directory",
        );
      names = await hostNames(directory, 16, /^[0-9]{4}\.json$/);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const history: { ref: Digest; outcome: CodingOperationOutcome }[] = [];
    for (const [index, name] of names.entries()) {
      if (name !== `${String(index + 1).padStart(4, "0")}.json`)
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "operation evidence sequence gap",
        );
      const record = asObject(
        await hostRead(
          join(directory, name),
          intent.limits.maxOutputBytes + 1024,
        ),
        "operation evidence",
      );
      noUnknownKeys(
        record,
        ["contract", "jobId", "previousRef", "outcomeRef", "outcome"],
        "operation evidence",
      );
      if (
        record.contract !== "algal.coding-job-observation.v1" ||
        record.jobId !== jobId ||
        record.previousRef !== (history.at(-1)?.ref ?? null)
      )
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "operation evidence chain mismatch",
        );
      const ref = asDigest(record.outcomeRef, "outcomeRef"),
        raw = record.outcome;
      if (digestCanonical(raw!) !== ref)
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "operation evidence digest mismatch",
        );
      const outcome = parseCodingOperationOutcome(raw, intent.operation, {
        maxOutputBytes: intent.limits.maxOutputBytes,
      });
      for (const previous of history)
        parseCodingOperationOutcome(raw, intent.operation, {
          maxOutputBytes: intent.limits.maxOutputBytes,
          previous: previous.outcome,
        });
      history.push({ ref, outcome });
    }
    return history;
  }
  private async retainOperationOutcome(
    jobId: Digest,
    intent: CodingJobOperationIntent,
    raw: unknown,
  ): Promise<{ ref: Digest; outcome: CodingOperationOutcome }> {
    const history = await this.operationHistory(jobId, intent);
    const outcome = parseCodingOperationOutcome(raw, intent.operation, {
      maxOutputBytes: intent.limits.maxOutputBytes,
    });
    for (const previous of history)
      parseCodingOperationOutcome(outcome, intent.operation, {
        maxOutputBytes: intent.limits.maxOutputBytes,
        previous: previous.outcome,
      });
    const ref = digestCanonical(json(outcome)),
      last = history.at(-1);
    if (last?.ref === ref) {
      await this.store.putValue(json(outcome));
      return last;
    }
    // Reject capacity, regressions and foreign proofs before writing any CAS object.
    if (history.length >= 16)
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "operation evidence count limit",
      );
    await hostWrite(
      join(
        this.path(jobId),
        "observations",
        `${String(history.length + 1).padStart(4, "0")}.json`,
      ),
      {
        contract: "algal.coding-job-observation.v1",
        jobId,
        previousRef: last?.ref ?? null,
        outcomeRef: ref,
        outcome: json(outcome),
      },
      intent.limits.maxOutputBytes + 1024,
    );
    await this.store.putValue(json(outcome));
    return { ref, outcome };
  }
  private async inspectOperation(
    jobId: Digest,
    intent: CodingJobOperationIntent,
    started: boolean,
  ): Promise<CodingJobSnapshot> {
    const history = await this.operationHistory(jobId, intent);
    const initial = await hostRead(join(this.path(jobId), "result.json"), 4096),
      resolution = await hostRead(
        join(this.path(jobId), "resolution.json"),
        4096,
      );
    const reservation = await hostRead(
      join(this.path(jobId), "settlement.json"),
      intent.limits.maxPatchBytes + 8192,
    );
    if (
      !started &&
      (initial !== undefined ||
        resolution !== undefined ||
        reservation !== undefined ||
        history.length)
    )
      throw new AlgalError(
        "DIGEST_MISMATCH",
        "operation evidence has no launch intent",
      );
    let reserved: Terminal | undefined,
      missingPublication = false;
    if (reservation !== undefined) {
      const latest = history.at(-1);
      if (!latest)
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "settlement has no operation evidence",
        );
      reserved = this.parseOperationSettlement(
        reservation,
        jobId,
        intent,
        latest,
      ).terminal;
    }
    const terminals = [initial, resolution]
      .filter((value) => value !== undefined)
      .map((value) =>
        parseTerminal(value, jobId, "algal.coding-job-result.v2"),
      );
    for (const terminal of terminals) {
      if (
        terminal.status !== "uncertain" &&
        (!reserved ||
          digestCanonical(json(terminal)) !== digestCanonical(json(reserved)))
      )
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "operation result conflicts with immutable settlement",
        );
      if (terminal.result) {
        const evidence = history.find(
          (item) => item.ref === terminal.result!.outputRef,
        );
        if (
          !evidence ||
          terminal.result.session !== intent.operation.operationId ||
          terminal.result.operationId !== intent.operation.operationId
        )
          throw new AlgalError(
            "DIGEST_MISMATCH",
            "operation result binding mismatch",
          );
        if ((await this.store.getValue(evidence.ref)) === undefined)
          missingPublication = true;
        if (
          terminal.status !== "uncertain" &&
          evidence.outcome.state !== "terminal"
        )
          throw new AlgalError(
            "DIGEST_MISMATCH",
            "operation result has no settlement proof",
          );
        if (
          terminal.status === "completed" &&
          (evidence.outcome.state !== "terminal" ||
            evidence.outcome.outcome !== "completed" ||
            terminal.result.exitCode !== 0)
        )
          throw new AlgalError(
            "DIGEST_MISMATCH",
            "completed operation lacks successful settlement",
          );
        if (terminal.result.patchRef) {
          const rawPatch = await this.store.getValue(terminal.result.patchRef);
          if (rawPatch === undefined) {
            missingPublication = true;
            continue;
          }
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
      } else if (terminal.status !== "uncertain")
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "settled operation result requires evidence",
        );
    }
    if (resolution !== undefined) {
      const final = terminals.at(-1)!;
      if (
        final.status === "uncertain" ||
        final.result?.outputRef !== history.at(-1)?.ref ||
        (initial !== undefined && terminals[0]!.status !== "uncertain")
      )
        throw new AlgalError("DIGEST_MISMATCH", "invalid operation resolution");
    }
    if (missingPublication)
      return {
        jobId,
        intent,
        status: "uncertain",
        reason: "operation-evidence-publication-incomplete",
      };
    const terminal = terminals.at(-1);
    return {
      jobId,
      intent,
      status: terminal?.status ?? (started ? "uncertain" : "prepared"),
      ...(terminal?.result ? { result: terminal.result } : {}),
      ...(terminal?.reason
        ? { reason: terminal.reason }
        : started && !terminal
          ? { reason: "launch-started-without-terminal-acknowledgement" }
          : {}),
    };
  }
  private parseOperationSettlement(
    raw: JsonValue,
    jobId: Digest,
    intent: CodingJobOperationIntent,
    evidence: { ref: Digest; outcome: CodingOperationOutcome },
  ): { terminal: Terminal; artifact?: JsonValue } {
    const { ref: outputRef, outcome } = evidence;
    if (outcome.state !== "terminal")
      throw new AlgalError(
        "DIGEST_MISMATCH",
        "settlement lacks terminal operation evidence",
      );
    const record = asObject(raw, "operation settlement");
    noUnknownKeys(
      record,
      ["contract", "jobId", "outputRef", "terminal", "patch"],
      "operation settlement",
    );
    if (
      record.contract !== "algal.coding-job-settlement.v1" ||
      record.jobId !== jobId ||
      record.outputRef !== outputRef
    )
      throw new AlgalError(
        "DIGEST_MISMATCH",
        "operation settlement binding mismatch",
      );
    const terminal = parseTerminal(
      record.terminal,
      jobId,
      "algal.coding-job-result.v2",
    );
    if (
      terminal.status === "uncertain" ||
      terminal.result?.outputRef !== outputRef ||
      terminal.result.operationId !== intent.operation.operationId ||
      terminal.result.session !== intent.operation.operationId ||
      (terminal.status === "completed" && outcome.outcome !== "completed")
    )
      throw new AlgalError(
        "DIGEST_MISMATCH",
        "invalid retained operation settlement",
      );
    const artifact = record.patch;
    if (artifact !== undefined) {
      const captured = asObject(artifact, "retained coding patch");
      if (
        digestCanonical(artifact) !== terminal.result.patchRef ||
        captured.contract !== "algal.coding-patch.v1" ||
        captured.sourceHead !== intent.expectedHead ||
        captured.sourceTree !== intent.sourceTree ||
        captured.sourceRawDigest !== intent.sourceRawDigest ||
        captured.changedFiles !== terminal.result.changedFiles ||
        canonicalBytes(artifact) > intent.limits.maxPatchBytes
      )
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "retained patch binding mismatch",
        );
    } else if (terminal.result.patchRef)
      throw new AlgalError("STORE_MISS", "retained settlement patch missing");
    return { terminal, ...(artifact === undefined ? {} : { artifact }) };
  }
  private async settleOperation(
    jobId: Digest,
    intent: CodingJobOperationIntent,
    evidence: { ref: Digest; outcome: CodingOperationOutcome },
    signal: AbortSignal,
  ): Promise<Terminal> {
    const { outcome, ref: outputRef } = evidence;
    const result: CodingJobResult = {
      session: intent.operation.operationId,
      operationId: intent.operation.operationId,
      exitCode:
        outcome.state === "terminal" && outcome.outcome === "completed"
          ? 0
          : outcome.state === "terminal" && outcome.outcome === "cancelled"
            ? 130
            : 1,
      outputRef,
    };
    if (outcome.state !== "terminal")
      return {
        contract: "algal.coding-job-result.v2",
        jobId,
        status: "uncertain",
        result,
        reason: "external-task-not-proven-settled",
      };
    const settlementPath = join(this.path(jobId), "settlement.json"),
      bound = intent.limits.maxPatchBytes + 8192;
    const existing = await hostRead(settlementPath, bound);
    let terminal: Terminal, artifact: JsonValue | undefined;
    if (existing !== undefined) {
      const retained = this.parseOperationSettlement(
        existing,
        jobId,
        intent,
        evidence,
      );
      terminal = retained.terminal;
      artifact = retained.artifact;
    } else {
      // Provider settlement is independent of patch admission. Invalid local
      // files are retained, but cannot make a settled operation run again.
      try {
        artifact = await patch(intent, signal);
        const patchRef = digestCanonical(artifact);
        result.patchRef = patchRef;
        result.patchDigest = patchRef;
        result.changedFiles = asObject(artifact, "patch")
          .changedFiles as number;
        const completed = outcome.outcome === "completed";
        terminal = {
          contract: "algal.coding-job-result.v2",
          jobId,
          status: completed ? "completed" : "failed",
          result,
          ...(completed ? {} : { reason: `external-task-${outcome.outcome}` }),
        };
      } catch (error) {
        terminal = {
          contract: "algal.coding-job-result.v2",
          jobId,
          status: "failed",
          result,
          reason:
            error instanceof AlgalError
              ? `settled-patch-rejected:${error.code}`
              : "settled-patch-rejected",
        };
      }
      // Reserve one immutable patch before CAS writes. Recovery reuses these
      // bytes even if a host later changes the workspace during the crash gap.
      await hostWrite(
        settlementPath,
        json({
          contract: "algal.coding-job-settlement.v1",
          jobId,
          outputRef,
          terminal,
          ...(artifact === undefined ? {} : { patch: artifact }),
        }),
        bound,
      );
    }
    if (artifact !== undefined) await this.store.putValue(artifact);
    return terminal;
  }
  private async operationCall(
    intent: CodingJobOperationIntent,
    action: "submit" | "observe",
    signal: AbortSignal | undefined,
  ): Promise<unknown> {
    const transport =
        this.operationTransport ??
        codingOperationCommandTransport(intent.adapter),
      controller = new AbortController();
    const combined = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;
    const timer = setTimeout(
      () => controller.abort(),
      intent.limits.maxRuntimeMs,
    );
    let abort: (() => void) | undefined;
    try {
      if (combined.aborted)
        throw new AlgalError("BUDGET_EXHAUSTED", "operation call cancelled");
      const interrupted = new Promise<never>((_resolve, reject) => {
        abort = () =>
          reject(
            new AlgalError(
              "BUDGET_EXHAUSTED",
              "operation call interrupted; completion unknown",
            ),
          );
        combined.addEventListener("abort", abort, { once: true });
      });
      const request = {
        binding: structuredClone(intent.operation),
        signal: combined,
        timeoutMs: intent.limits.maxRuntimeMs,
        maxOutputBytes: intent.limits.maxOutputBytes,
      };
      return await Promise.race([
        action === "submit"
          ? transport.submit({
              ...request,
              payload: structuredClone(codingJobOperationPayload(intent)),
            })
          : transport.observe(request),
        interrupted,
      ]);
    } finally {
      clearTimeout(timer);
      if (abort) combined.removeEventListener("abort", abort);
      controller.abort();
    }
  }
  private async runOperation(
    jobId: Digest,
    intent: CodingJobOperationIntent,
    options: { signal?: AbortSignal },
  ): Promise<CodingJobSnapshot> {
    return hostLease(
      this.workspacePath(intent.workspace),
      "coding-workspace",
      async () => {
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
          join(this.workspacePath(intent.workspace), "claim.json"),
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
        const controller = new AbortController(),
          signal = options.signal
            ? AbortSignal.any([options.signal, controller.signal])
            : controller.signal;
        const timer = setTimeout(
          () => controller.abort(),
          intent.limits.maxRuntimeMs,
        );
        let terminal: Terminal;
        try {
          const raw = await this.operationCall(intent, "submit", signal);
          const evidence = await this.retainOperationOutcome(
            jobId,
            intent,
            raw,
          );
          terminal = await this.settleOperation(
            jobId,
            intent,
            evidence,
            signal,
          );
        } catch (error) {
          terminal = {
            contract: "algal.coding-job-result.v2",
            jobId,
            status: "uncertain",
            reason:
              error instanceof AlgalError
                ? `external-result-unavailable:${error.code}`
                : "external-result-unavailable",
          };
        }
        clearTimeout(timer);
        controller.abort();
        await hostWrite(
          join(this.path(jobId), "result.json"),
          json(terminal),
          4096,
        );
        return this.inspect(jobId);
      },
    );
  }
  /** Explicit host-only, read-only provider lookup. It never submits or clears a claim. */
  async reconcile(
    jobId: Digest,
    options: { signal?: AbortSignal } = {},
  ): Promise<CodingJobSnapshot> {
    const admitted = await this.job(jobId);
    if (admitted.contract !== "algal.coding-job.v2")
      throw new AlgalError(
        "CAPABILITY_DENIED",
        "legacy coding jobs have no operation reconciliation protocol",
      );
    return hostLease(
      this.path(jobId),
      `coding-${jobId.slice(7, 31)}`,
      async () => {
        const before = await this.inspect(jobId);
        if (before.status === "prepared")
          throw new AlgalError(
            "CAPABILITY_DENIED",
            "operation has not been submitted",
          );
        if (before.status !== "uncertain") return before;
        return hostLease(
          this.workspacePath(admitted.workspace),
          "coding-workspace",
          async () => {
            const claim = await hostRead(
              join(this.workspacePath(admitted.workspace), "claim.json"),
              8192,
            );
            if (!claim || asObject(claim, "workspace claim").jobId !== jobId)
              throw new AlgalError(
                "CAPABILITY_DENIED",
                "reconciliation requires the retained workspace claim",
              );
            await this.assertWorkspaceClaim(admitted, jobId, true);
            const controller = new AbortController(),
              signal = options.signal
                ? AbortSignal.any([options.signal, controller.signal])
                : controller.signal;
            const timer = setTimeout(
              () => controller.abort(),
              admitted.limits.maxRuntimeMs,
            );
            try {
              if (signal.aborted)
                throw new AlgalError(
                  "BUDGET_EXHAUSTED",
                  "reconciliation cancelled",
                );
              const history = await this.operationHistory(jobId, admitted),
                last = history.at(-1);
              for (const retained of history)
                await this.store.putValue(json(retained.outcome));
              const evidence =
                last?.outcome.state === "terminal"
                  ? last
                  : await this.retainOperationOutcome(
                      jobId,
                      admitted,
                      await this.operationCall(admitted, "observe", signal),
                    );
              if (evidence.outcome.state !== "terminal")
                return this.inspect(jobId);
              await this.store.putValue(json(evidence.outcome));
              const terminal = await this.settleOperation(
                jobId,
                admitted,
                evidence,
                signal,
              );
              const initial = await hostRead(
                join(this.path(jobId), "result.json"),
                4096,
              );
              if (
                initial === undefined ||
                parseTerminal(initial, jobId, "algal.coding-job-result.v2")
                  .status === "uncertain"
              )
                await hostWrite(
                  join(this.path(jobId), "resolution.json"),
                  json(terminal),
                  4096,
                );
              return this.inspect(jobId);
            } finally {
              clearTimeout(timer);
              controller.abort();
            }
          },
        );
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
