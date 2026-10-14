import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError } from "../src/event-loop-contract";
import { summarizeEventLoopTrace } from "../src/event-loop-summary";

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
  // Derive an A -> B -> A trace from the fixed base so both runtimes check
  // a nonadjacent state claim, not just the latest accepted state.
  const revisit = structuredClone(fixture.base);
  const entries = revisit.entries as JsonValue[];
  const first = entries[0] as Record<string, JsonValue>;
  const second = entries[3] as Record<string, JsonValue>;
  const third = structuredClone(second);
  third.source = "source-c";
  third.delivery = "return";
  (third.decision as Record<string, JsonValue>).stateDigest = (first.decision as Record<string, JsonValue>).stateDigest!;
  third.eventDigest = hash({behavior: revisit.behavior!, actor: revisit.actor!, source: third.source,
    sequence: third.sequence!, type: third.type!, payload: third.payload!});
  third.messageDigest = hash({event: third.eventDigest, target: revisit.actor!, delivery: third.delivery});
  revisit.entries = [first, second, third];
  const { digest: _original, ...revisitBody } = revisit;
  revisit.digest = hash(revisitBody);
  vectors.push({name: "revisited-state", value: revisit, expected: revisit.digest});
  const invalidRevisit = structuredClone(revisit);
  ((invalidRevisit.entries as JsonValue[])[2] as Record<string, JsonValue>).decision = {
    ...(third.decision as Record<string, JsonValue>),
    resources: {...((third.decision as Record<string, JsonValue>).resources as Record<string, JsonValue>), stateBytes: 10},
  };
  const { digest: _valid, ...invalidBody } = invalidRevisit;
  invalidRevisit.digest = hash(invalidBody);
  vectors.push({name: "revisited-state-byte-conflict", value: invalidRevisit, expected: "EVENT_LOOP_SEMANTIC"});

  // A failed first delivery also binds the state's claimed byte length.
  const failedFirst = structuredClone(fixture.failed);
  const failedEntries = failedFirst.entries as JsonValue[];
  failedFirst.entries = [failedEntries[1]!, failedEntries[0]!];
  const { digest: _failedDigest, ...failedBody } = failedFirst;
  failedFirst.digest = hash(failedBody);
  vectors.push({name: "failed-before-accepted", value: failedFirst, expected: failedFirst.digest});
  const conflictingSize = structuredClone(failedFirst);
  const accepted = ((conflictingSize.entries as JsonValue[])[1] as Record<string, JsonValue>).decision as Record<string, JsonValue>;
  (accepted.resources as Record<string, JsonValue>).stateBytes = 10;
  const { digest: _unchanged, ...conflictingBody } = conflictingSize;
  conflictingSize.digest = hash(conflictingBody);
  vectors.push({name: "failed-before-accepted-byte-conflict", value: conflictingSize, expected: "EVENT_LOOP_SEMANTIC"});

  // Both implementations must sum the same checked claims at the entry and
  // notification limits, without treating the counts as measured execution.
  const maximum = structuredClone(fixture.base);
  maximum.limits = {...(maximum.limits as Record<string, JsonValue>), maxOutputEvents: 64, maxTransitionFuel: 100_000};
  const one = structuredClone((maximum.entries as JsonValue[])[0] as Record<string, JsonValue>);
  const outcome = one.decision as Record<string, JsonValue>;
  outcome.outputs = Array(64).fill((outcome.outputs as JsonValue[])[0]);
  outcome.resources = {...(outcome.resources as Record<string, JsonValue>), fuel: 100_000, outputEvents: 64};
  maximum.entries = [one];
  const {digest: _oldMax, ...maxBody} = maximum;
  maximum.digest = hash(maxBody);
  vectors.push({name: "summary-per-entry-limits", value: maximum, expected: maximum.digest});

  // Shared parity also covers the aggregate limit; individual TS/Rust tests
  // alone cannot detect a disagreement in the 256-entry summary projection.
  const aggregate = structuredClone(maximum);
  const aggregateEntries: Record<string, JsonValue>[] = [];
  for (let sequence = 0; sequence < 256; sequence++) {
    const entry = structuredClone(one);
    entry.sequence = sequence;
    entry.delivery = `attempt-${sequence}`;
    const decision = entry.decision as Record<string, JsonValue>;
    decision.outcome = "quiet";
    decision.outputs = [];
    decision.resources = {...(decision.resources as Record<string, JsonValue>), outputEvents: 0};
    entry.eventDigest = hash({behavior: aggregate.behavior!, actor: aggregate.actor!, source: entry.source!,
      sequence: entry.sequence!, type: entry.type!, payload: entry.payload!});
    entry.messageDigest = hash({event: entry.eventDigest, target: aggregate.actor!, delivery: entry.delivery});
    aggregateEntries.push(entry);
  }
  aggregate.entries = aggregateEntries;
  const {digest: _aggregateDigest, ...aggregateBody} = aggregate;
  aggregate.digest = hash(aggregateBody);
  vectors.push({name: "summary-aggregate-limits", value: aggregate, expected: aggregate.digest});

  // Isolate one accepted delivery to test each trace identity field without
  // a later duplicate or backpressure decision obscuring the first refusal.
  // Valid mutations are fully reidentified and redigested before both parsers
  // see them. Missing keys intentionally stop before identity hashing.
  function fieldVector(name: string, mutate: (root: Record<string, JsonValue>, entry: Record<string, JsonValue>) => void,
                       expected?: string, reidentify = true): void {
    const root = structuredClone(fixture.base);
    const entry = (root.entries as Record<string, JsonValue>[])[0]!;
    root.entries = [entry];
    mutate(root, entry);
    if (reidentify) {
      entry.eventDigest = hash({behavior: root.behavior!, actor: root.actor!, source: entry.source!,
        sequence: entry.sequence!, type: entry.type!, payload: entry.payload!});
      entry.messageDigest = hash({event: entry.eventDigest, target: root.actor!, delivery: entry.delivery!});
      const {digest: _prior, ...body} = root;
      root.digest = hash(body);
    }
    vectors.push({name, value: root, expected: expected ?? root.digest as string});
  }
  for (const field of ["source", "type", "delivery"] as const) {
    fieldVector(`${field}-id-max`, (_root, entry) => { entry[field] = "a".repeat(64); });
    fieldVector(`${field}-id-excess`, (_root, entry) => { entry[field] = "a".repeat(65); }, "EVENT_LOOP_ID", false);
    fieldVector(`${field}-id-malformed`, (_root, entry) => { entry[field] = "Invalid"; }, "EVENT_LOOP_ID", false);
    fieldVector(`${field}-id-missing`, (_root, entry) => { delete entry[field]; }, "EVENT_LOOP_PARSE", false);
  }
  fieldVector("sequence-max", (_root, entry) => { entry.sequence = 2_147_483_647; });
  fieldVector("sequence-excess", (_root, entry) => { entry.sequence = 2_147_483_648; }, "EVENT_LOOP_BOUNDS", false);
  fieldVector("sequence-malformed", (_root, entry) => { entry.sequence = 0.5; }, "EVENT_LOOP_BOUNDS", false);
  fieldVector("sequence-missing", (_root, entry) => { delete entry.sequence; }, "EVENT_LOOP_PARSE", false);
  fieldVector("entry-extra", (_root, entry) => { entry.createdAt = 0; }, "EVENT_LOOP_UNKNOWN_KEY", false);
  fieldVector("limits-extra", (root) => { (root.limits as Record<string, JsonValue>).timeout = 1; }, "EVENT_LOOP_UNKNOWN_KEY", false);
  fieldVector("limits-missing", (root) => { delete (root.limits as Record<string, JsonValue>).maxEventBytes; }, "EVENT_LOOP_PARSE", false);
  fieldVector("root-extra", (root) => { root.createdAt = 0; }, "EVENT_LOOP_UNKNOWN_KEY", false);
  fieldVector("root-missing", (root) => { delete root.actor; }, "EVENT_LOOP_PARSE", false);
  return vectors;
}

export function tsResults(vectors: Vector[]): {name: string; result: {digest: string; summary: ReturnType<typeof summarizeEventLoopTrace>["summary"]} | {code: string}}[] {
  return vectors.map(({ name, value }) => {
    try { return { name, result: summarizeEventLoopTrace(value) }; }
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
  const aggregate = typescript.find(({name}) => name === "summary-aggregate-limits")?.result;
  if (!aggregate || !("summary" in aggregate) || aggregate.summary.accepted !== 256 ||
      aggregate.summary.fuelClaimed !== 25_600_000 || aggregate.summary.quiet !== 256) {
    throw new Error("aggregate trace summary did not reach its checked limits");
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
  console.log(`event-loop trace shape and summary parity: ${vectors.length} shared vectors, matching digests, refusal codes and claimed counts`);
}
