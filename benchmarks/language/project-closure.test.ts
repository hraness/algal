import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { canonicalize } from "../../src/values";
import { locateJsonSpan } from "./span";
import { ProjectClosureError, verifyProjectClosure } from "./project-closure";

const hash = (value: Uint8Array | string): string => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const source = (length: number): Uint8Array => new Uint8Array(length).fill(97);
const root = import.meta.dir;

type Project = {
  contract: "algal.language-project.v1";
  id: string;
  entry: string;
  files: { path: string; digest: string }[];
  digest: string;
};

function fixture(chunks: readonly Uint8Array[]): { project: Project; read: (path: string) => Promise<Uint8Array> } {
  const contents = new Map(chunks.map((bytes, index) => [`file-${index}`, bytes]));
  const files = [...contents].map(([path, bytes]) => ({ path, digest: hash(bytes) }));
  const body = { contract: "algal.language-project.v1" as const, id: "fixture", entry: "file-0", files };
  return {
    project: { ...body, digest: hash(canonicalize(body)) },
    read: async (path) => {
      const bytes = contents.get(path);
      if (!bytes) throw new Error("missing file");
      return bytes;
    },
  };
}

function rehash(project: Project): void {
  const { digest: _digest, ...body } = project;
  project.digest = hash(canonicalize(body));
}

async function rejected(value: unknown, read: (path: string) => Promise<Uint8Array>): Promise<ProjectClosureError> {
  try {
    await verifyProjectClosure(value, read);
  } catch (error) {
    if (error instanceof ProjectClosureError) return error;
    throw error;
  }
  throw new Error("expected a rejected project closure");
}

test("checked project fixture closes over its actual pinned file bytes", async () => {
  const project = JSON.parse(await readFile(join(root, "projects/echo.project.json"), "utf8")) as unknown;
  const result = await verifyProjectClosure(project, (path) => readFile(join(root, path)));
  expect(result).toEqual({
    byteLength: (await readFile(join(root, "actors/echo.json"))).byteLength +
      (await readFile(join(root, "actors/echo.events.json"))).byteLength,
    projectDigest: "sha256:fbf02f7559fe86742d9e8e36b1cb01f80686dad35022c46613dd6dcd368b41dc",
    closureDigest: "sha256:7f79a6f4e1bd22c9006b8c0c691d9e2b670eb2a6417dfc3f22940ad9834791a9",
  });
});

test("closure accepts 262144 bytes and rejects 262145 with a UTF-8 file-path span", async () => {
  const full = fixture(Array.from({ length: 16 }, () => source(16_384)));
  expect((await verifyProjectClosure(full.project, full.read)).byteLength).toBe(262_144);
  const excess = fixture([...Array.from({ length: 16 }, () => source(16_384)), source(1)]);
  const error = await rejected(excess.project, excess.read);
  expect(error.code).toBe("EVENT_LOOP_BOUNDS");
  expect(error.at).toEqual(["files", 16, "path"]);
  const encoded = new TextEncoder().encode(JSON.stringify(excess.project));
  const span = locateJsonSpan(encoded, error.at);
  expect(new TextDecoder().decode(encoded.subarray(span.start, span.end))).toBe("file-16");
});

test("file size, file count, id and path limits reject the first excess", async () => {
  const one = fixture([source(1)]);
  expect((await verifyProjectClosure(one.project, one.read)).byteLength).toBe(1);
  const largestFile = fixture([source(16_384)]);
  expect((await verifyProjectClosure(largestFile.project, largestFile.read)).byteLength).toBe(16_384);
  for (const length of [0, 16_385]) {
    const data = fixture([source(length)]);
    expect((await rejected(data.project, data.read)).code).toBe("EVENT_LOOP_BOUNDS");
  }
  const sixtyFour = fixture(Array.from({ length: 64 }, () => source(1)));
  expect((await verifyProjectClosure(sixtyFour.project, sixtyFour.read)).byteLength).toBe(64);
  for (const count of [0, 65]) {
    const data = fixture(Array.from({ length: count }, () => source(1)));
    expect((await rejected(data.project, data.read)).code).toBe("EVENT_LOOP_BOUNDS");
  }
  const data = fixture([source(1)]);
  for (const length of [1, 64]) {
    data.project.id = "a".repeat(length);
    rehash(data.project);
    expect((await verifyProjectClosure(data.project, data.read)).byteLength).toBe(1);
  }
  for (const id of ["", "a".repeat(65), "é"]) {
    data.project.id = id;
    expect((await rejected(data.project, data.read)).code).toBe("EVENT_LOOP_ID");
  }
  data.project.id = "fixture";
  for (const path of ["a", "a".repeat(512), "é".repeat(256), "a\u00a0b"]) {
    data.project.entry = path;
    data.project.files[0]!.path = path;
    rehash(data.project);
    expect((await verifyProjectClosure(data.project, async () => source(1))).byteLength).toBe(1);
  }
  for (const path of ["", "a".repeat(513), "é".repeat(257), "../escape", "a\\b", "C:/escape", "C:escape", "a\0b", "a\nb", "a\u0080b", "a\u009fb"]) {
    data.project.entry = path;
    expect((await rejected(data.project, data.read)).code).toBe("EVENT_LOOP_PARSE");
  }
  for (const path of ["C:/escape", "a\0b", "a\u0085b", "a\u009fb"]) {
    data.project.entry = "file-0";
    data.project.files[0]!.path = path;
    rehash(data.project);
    const error = await rejected(data.project, async () => { throw new Error("must not read"); });
    expect(error.code).toBe("EVENT_LOOP_PARSE");
    expect(error.at).toEqual(["files", 0, "path"]);
    const encoded = new TextEncoder().encode(JSON.stringify(data.project));
    const span = locateJsonSpan(encoded, error.at);
    expect(new TextDecoder().decode(encoded.subarray(span.start, span.end))).toBe(JSON.stringify(path).slice(1, -1));
  }
});

test("lone surrogates cannot alias project paths, but paired Unicode and 512 UTF-8 bytes work", async () => {
  const data = fixture([source(1)]);
  for (const valid of ["actor-\u{1f680}.json", "a".repeat(508) + "\u{1f680}"]) {
    expect(Buffer.byteLength(valid, "utf8")).toBeLessThanOrEqual(512);
    data.project.entry = valid;
    data.project.files[0]!.path = valid;
    rehash(data.project);
    expect((await verifyProjectClosure(data.project, async (path) => {
      expect(path).toBe(valid);
      return source(1);
    })).byteLength).toBe(1);
  }
  expect(Buffer.byteLength("a".repeat(508) + "\u{1f680}", "utf8")).toBe(512);

  for (const invalid of ["actor-\ud800.json", "actor-\udc00.json", "\ud800\ud800", "\udc00\ud800", "a".repeat(509) + "\ud800", "a".repeat(509) + "\u{1f680}"]) {
    for (const location of ["entry", "file"] as const) {
      const project = structuredClone(data.project);
      const at = location === "entry" ? ["entry"] : ["files", 0, "path"];
      if (location === "entry") project.entry = invalid;
      else project.files[0]!.path = invalid;
      let reads = 0;
      const error = await rejected(project, async () => { reads++; return source(1); });
      expect(error.code).toBe("EVENT_LOOP_PARSE");
      expect(error.at).toEqual(at);
      expect(reads).toBe(0);
      const encoded = new TextEncoder().encode(JSON.stringify(project));
      const span = locateJsonSpan(encoded, at);
      expect(new TextDecoder().decode(encoded.subarray(span.start, span.end))).toBe(JSON.stringify(invalid).slice(1, -1));
    }
  }
});

test("closed project records reject unknown fields, changed bytes and missing files", async () => {
  const data = fixture([source(1)]);
  const wrongContract = { ...data.project, contract: "algal.language-project.v2" };
  const error = await rejected(wrongContract, data.read);
  expect(error.code).toBe("EVENT_LOOP_CONTRACT");
  expect(error.at).toEqual(["contract"]);
  expect((await rejected({ ...data.project, extra: 1 }, data.read)).code).toBe("EVENT_LOOP_UNKNOWN_KEY");
  const extra = structuredClone(data.project);
  Object.assign(extra.files[0]!, { extra: 1 });
  const unknown = await rejected(extra, data.read);
  expect(unknown.code).toBe("EVENT_LOOP_UNKNOWN_KEY");
  expect(unknown.at).toEqual(["files", 0, "extra"]);
  const encoded = new TextEncoder().encode(JSON.stringify(extra));
  const span = locateJsonSpan(encoded, unknown.at, true);
  expect(new TextDecoder().decode(encoded.subarray(span.start, span.end))).toBe("extra");
  expect((await rejected(data.project, async () => source(2))).code).toBe("EVENT_LOOP_DIGEST");
  expect((await rejected(data.project, async () => { throw new Error("missing"); })).code).toBe("EVENT_LOOP_REFERENCE");
  const wrongDigest = structuredClone(data.project);
  wrongDigest.digest = `sha256:${"0".repeat(64)}`;
  expect((await rejected(wrongDigest, data.read)).code).toBe("EVENT_LOOP_DIGEST");
});
