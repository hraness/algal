import { createHash } from "node:crypto";
import { canonicalize } from "../../src/values";

// This checks a project and the raw files it names. A project digest alone
// cannot establish the size or contents of the referenced closure.
const MAX_FILES = 64;
const MAX_ID_BYTES = 64;
const MAX_PATH_BYTES = 512;
const MAX_FILE_BYTES = 16_384;
const MAX_CLOSURE_BYTES = 262_144;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
type At = readonly (string | number)[];
type File = { path: string; digest: string };

export class ProjectClosureError extends Error {
  constructor(readonly code: "EVENT_LOOP_PARSE" | "EVENT_LOOP_CONTRACT" | "EVENT_LOOP_UNKNOWN_KEY" | "EVENT_LOOP_ID" |
    "EVENT_LOOP_BOUNDS" | "EVENT_LOOP_REFERENCE" | "EVENT_LOOP_DIGEST", readonly at: At) {
    super(`${code} at ${at.join(".")}`);
  }
}

function fail(code: ProjectClosureError["code"], at: At): never {
  throw new ProjectClosureError(code, at);
}

function record(value: unknown, keys: readonly string[], at: At): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("EVENT_LOOP_PARSE", at);
  const result = value as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (!keys.includes(key)) fail("EVENT_LOOP_UNKNOWN_KEY", [...at, key]);
  }
  for (const key of keys) {
    if (!Object.hasOwn(result, key)) fail("EVENT_LOOP_PARSE", [...at, key]);
  }
  return result;
}

function id(value: unknown, at: At): string {
  if (typeof value !== "string" || value.length === 0 ||
      Buffer.byteLength(value, "utf8") > MAX_ID_BYTES || !ID.test(value)) fail("EVENT_LOOP_ID", at);
  return value;
}

function path(value: unknown, at: At): string {
  if (typeof value !== "string" || value.length === 0 ||
      Buffer.byteLength(value, "utf8") > MAX_PATH_BYTES || value.startsWith("/") ||
      value.includes("\\") || value.split("/").some((part) => !part || part === "." || part === "..")) {
    fail("EVENT_LOOP_PARSE", at);
  }
  return value;
}

function sha(value: unknown, at: At): string {
  if (typeof value !== "string" || !DIGEST.test(value)) fail("EVENT_LOOP_DIGEST", at);
  return value;
}

function hash(bytes: Uint8Array | string): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export async function verifyProjectClosure(
  value: unknown,
  readBytes: (path: string) => Promise<Uint8Array>,
): Promise<{ byteLength: number; projectDigest: string; closureDigest: string }> {
  const root = record(value, ["contract", "id", "entry", "files", "digest"], []);
  if (root.contract !== "algal.language-project.v1") fail("EVENT_LOOP_CONTRACT", ["contract"]);
  const projectId = id(root.id, ["id"]);
  const entry = path(root.entry, ["entry"]);
  if (!Array.isArray(root.files) || root.files.length < 1 || root.files.length > MAX_FILES) {
    fail("EVENT_LOOP_BOUNDS", ["files"]);
  }
  const files: File[] = [];
  const paths = new Set<string>();
  for (const [index, raw] of root.files.entries()) {
    const at: At = ["files", index];
    const file = record(raw, ["path", "digest"], at);
    const filePath = path(file.path, [...at, "path"]);
    if (paths.has(filePath)) fail("EVENT_LOOP_ID", [...at, "path"]);
    paths.add(filePath);
    files.push({ path: filePath, digest: sha(file.digest, [...at, "digest"]) });
  }
  if (!paths.has(entry)) fail("EVENT_LOOP_REFERENCE", ["entry"]);
  const projectDigest = hash(canonicalize({ contract: root.contract, id: projectId, entry, files }));
  if (sha(root.digest, ["digest"]) !== projectDigest) fail("EVENT_LOOP_DIGEST", ["digest"]);

  let byteLength = 0;
  for (const [index, file] of files.entries()) {
    let bytes: Uint8Array;
    try {
      bytes = await readBytes(file.path);
    } catch {
      fail("EVENT_LOOP_REFERENCE", ["files", index, "path"]);
    }
    if (!(bytes instanceof Uint8Array)) fail("EVENT_LOOP_PARSE", ["files", index, "path"]);
    if (bytes.byteLength < 1 || bytes.byteLength > MAX_FILE_BYTES) {
      fail("EVENT_LOOP_BOUNDS", ["files", index, "path"]);
    }
    byteLength += bytes.byteLength;
    if (byteLength > MAX_CLOSURE_BYTES) fail("EVENT_LOOP_BOUNDS", ["files", index, "path"]);
    if (hash(bytes) !== file.digest) fail("EVENT_LOOP_DIGEST", ["files", index, "digest"]);
  }
  return { byteLength, projectDigest, closureDigest: hash(canonicalize(files)) };
}
