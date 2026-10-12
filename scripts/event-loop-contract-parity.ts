import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError, parseEventLoopTrace } from "../src/event-loop-contract";

export type Vector = { name: string; value: unknown; expected: string };
type Patch = { name: string; path: string; value: unknown; code: string; reidentify?: boolean };
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

export async function eventLoopVectors(): Promise<Vector[]> {
  const fixture = await Bun.file(new URL("./fixtures/event-loop-contract.json", import.meta.url)).json() as {
    base: Record<string, JsonValue>; failed: Record<string, JsonValue>; invalid: Patch[]; invalidFailed: Patch[];
  };
  const vectors: Vector[] = [];
  for (const [base, patches, label] of [
    [fixture.base, fixture.invalid, "valid"], [fixture.failed, fixture.invalidFailed, "failed"],
  ] as const) {
    vectors.push({ name: label, value: base, expected: base.digest as string });
    for (const patch of patches) {
      const value = structuredClone(base);
      const parts = patch.path.split("/").slice(1);
      let parent: JsonValue = value;
      for (const part of parts.slice(0, -1)) {
        parent = Array.isArray(parent) ? parent[Number(part)]! : (parent as Record<string, JsonValue>)[part]!;
      }
      const last = parts.at(-1)!;
      if (Array.isArray(parent)) parent[Number(last)] = patch.value as JsonValue;
      else (parent as Record<string, JsonValue>)[last] = patch.value as JsonValue;
      if (patch.reidentify) {
        const entryIndex = Number(parts[1]);
        const entry = (value.entries as JsonValue[])[entryIndex] as Record<string, JsonValue>;
        entry.eventDigest = hash({
          behavior: value.behavior!, actor: value.actor!, source: entry.source!,
          sequence: entry.sequence!, type: entry.type!, payload: entry.payload!,
        });
        entry.messageDigest = hash({event: entry.eventDigest, target: value.actor!, delivery: entry.delivery!});
      }
      vectors.push({ name: patch.name, value, expected: patch.code });
    }
  }
  return vectors;
}

export function tsResults(vectors: Vector[]): {name: string; result: {digest: string} | {code: string}}[] {
  return vectors.map(({ name, value }) => {
    try { return { name, result: { digest: parseEventLoopTrace(value).digest } }; }
    catch (error) {
      if (!(error instanceof EventLoopContractError)) throw error;
      return { name, result: { code: error.code } };
    }
  });
}

if (import.meta.main) {
  const vectors = await eventLoopVectors();
  const expected = vectors.map((v) => v.expected);
  const typescript = tsResults(vectors);
  for (const [index, item] of typescript.entries()) {
    if (Object.values(item.result)[0] !== expected[index]) throw new Error(`TypeScript mismatch in ${item.name}`);
  }
  const rust = Bun.spawn([
    "cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_contract_parity",
  ], { stdin: "pipe", stdout: "pipe", stderr: "pipe", env: { ...process.env, CARGO_TARGET_DIR: `${process.cwd()}/target` } });
  rust.stdin.write(JSON.stringify(vectors.map(({ name, value }) => ({ name, value }))));
  rust.stdin.end();
  const [stdout, stderr, status] = await Promise.all([
    new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited,
  ]);
  if (status !== 0) throw new Error(`Rust trace parity failed (${status}): ${stderr}`);
  const native = JSON.parse(stdout) as typeof typescript;
  if (canonicalize(native as JsonValue) !== canonicalize(typescript as JsonValue)) {
    throw new Error(`event-loop trace parity mismatch: ${JSON.stringify({ typescript, native })}`);
  }
  console.log(`event-loop trace shape parity: ${vectors.length} shared vectors, matching digests and refusal codes`);
}
