// Portable, data-only evidence for a fixed durable process head. Verification
// replays immutable history in memory; it cannot import or activate a process.
import { type Bundle } from "./bundle";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { compileOrganism } from "./graph";
import { mailboxToolRegistry, MemoryMailboxService } from "./mailbox";
import {
  PROCESS_BOUNDS,
  parseProcessRecord,
  readProcessHistory,
  verifyProcessSnapshot,
  type ProcessRecord,
  type ProcessSnapshot,
} from "./process";
import { builtinRegistry } from "./registry";
import { parseRunReceipt, receiptDigest, type RunReceipt } from "./run";
import { type Store } from "./store";
import {
  parseToolSignature,
  type ToolRegistry,
  type ToolSignature,
} from "./tools";
import {
  asJsonValue,
  asObject,
  asString,
  canonicalBytes,
  noUnknownKeys,
  type JsonValue,
} from "./values";

export const PROCESS_EVIDENCE_CONTRACT = "algal.process-evidence.v1" as const;
export const PROCESS_EVIDENCE_BOUNDS = {
  maxBytes: 67_108_864,
  maxDepth: 64,
  maxNodes: 1_000_000,
  maxRecords: 129,
  maxReceipts: 64,
  maxManifests: 512,
  maxValues: 512,
  maxMissing: 512,
  maxTools: 64,
} as const;
export type ProcessEvidence = {
  contract: "algal.process-evidence.v1";
  head: Digest;
  records: Record<Digest, ProcessRecord>;
  receipts: Record<Digest, RunReceipt>;
  program: Bundle;
  tools: Record<string, ToolSignature>;
  missing: { manifests: Digest[]; values: Digest[] };
};
const json = (value: unknown): JsonValue => value as JsonValue;
function fail(message: string): never {
  throw new AlgalError("RECEIPT_MISMATCH", message);
}
function bound(
  value: unknown,
  bytes: number = PROCESS_EVIDENCE_BOUNDS.maxBytes,
): JsonValue {
  const pending = [{ value, depth: 0 }];
  let nodes = 0,
    stringBytes = 0;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (
      ++nodes > PROCESS_EVIDENCE_BOUNDS.maxNodes ||
      depth > PROCESS_EVIDENCE_BOUNDS.maxDepth
    )
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "process evidence structure bound exceeded",
      );
    if (typeof value === "string") stringBytes += Buffer.byteLength(value);
    else if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        stringBytes += Buffer.byteLength(key);
        pending.push({ value: child, depth: depth + 1 });
        if (pending.length > PROCESS_EVIDENCE_BOUNDS.maxNodes)
          throw new AlgalError(
            "BUDGET_EXHAUSTED",
            "process evidence structure bound exceeded",
          );
      }
    }
    if (stringBytes > bytes)
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "process evidence byte bound exceeded",
      );
  }
  const checked = asJsonValue(value, "process evidence");
  if (canonicalBytes(checked) > bytes)
    throw new AlgalError(
      "BUDGET_EXHAUSTED",
      "process evidence byte bound exceeded",
    );
  return checked;
}
function entries(
  raw: unknown,
  max: number,
  label: string,
): [Digest, JsonValue][] {
  const object = asObject(raw, label),
    items = Object.entries(object);
  if (items.length > max)
    throw new AlgalError("BUDGET_EXHAUSTED", `${label} count exceeded`);
  return items.map(([key, value]) => {
    const digest = asDigest(key, `${label} key`);
    if (digestCanonical(value) !== digest)
      throw new AlgalError("DIGEST_MISMATCH", `${label} digest mismatch`);
    return [digest, value];
  });
}
function missing(raw: unknown, label: string): Digest[] {
  if (!Array.isArray(raw) || raw.length > PROCESS_EVIDENCE_BOUNDS.maxMissing)
    fail(`${label} count exceeded`);
  const values = raw.map((value) => asDigest(value, label));
  if (values.some((value, index) => index > 0 && value <= values[index - 1]!))
    fail(`${label} must be sorted and unique`);
  return values;
}
function signatures(raw: unknown): Record<string, ToolSignature> {
  const items = Object.entries(asObject(raw, "evidence tools"));
  if (items.length > PROCESS_EVIDENCE_BOUNDS.maxTools)
    throw new AlgalError("BUDGET_EXHAUSTED", "evidence tool count exceeded");
  return Object.fromEntries(
    items.map(([name, signature]) => {
      asString(name, "evidence tool name", 128);
      if (!name || name.includes("\0")) fail("invalid evidence tool name");
      const parsed = parseToolSignature(signature);
      return [name, parsed];
    }),
  );
}
function offlineTools(tools: Record<string, ToolSignature>): ToolRegistry {
  return new Map(
    Object.entries(tools).map(([name, signature]) => [
      name,
      {
        signature: structuredClone(signature),
        tool: async () => {
          throw new AlgalError(
            "CAPABILITY_DENIED",
            "process evidence cannot invoke live tools",
          );
        },
      },
    ]),
  );
}

/** Validate all structure, claimed digests and object bounds before admission. */
export function parseProcessEvidence(raw: unknown): ProcessEvidence {
  const value = asObject(bound(raw), "process evidence");
  noUnknownKeys(
    value,
    ["contract", "head", "records", "receipts", "program", "tools", "missing"],
    "process evidence",
  );
  if (value.contract !== "algal.process-evidence.v1")
    fail("invalid process evidence contract");
  const head = asDigest(value.head, "process evidence head");
  const records = Object.fromEntries(
    entries(
      value.records,
      PROCESS_EVIDENCE_BOUNDS.maxRecords,
      "evidence records",
    ).map(([key, raw]) => [key, parseProcessRecord(raw)]),
  ) as Record<Digest, ProcessRecord>;
  const receipts = Object.fromEntries(
    entries(
      value.receipts,
      PROCESS_EVIDENCE_BOUNDS.maxReceipts,
      "evidence receipts",
    ).map(([key, raw]) => {
      const receipt = parseRunReceipt(
        bound(raw, PROCESS_BOUNDS.maxReceiptBytes),
      );
      if (receiptDigest(receipt) !== receipt.digest)
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "evidence receipt digest mismatch",
        );
      return [key, receipt];
    }),
  ) as Record<Digest, RunReceipt>;
  const program = asObject(value.program, "evidence program");
  noUnknownKeys(
    program,
    ["contract", "root", "manifests", "values"],
    "evidence program",
  );
  if (program.contract !== "algal.bundle.v1")
    fail("invalid evidence program contract");
  const root = asDigest(program.root, "evidence program root"),
    manifests: Record<Digest, JsonValue> = {};
  for (const [key, raw] of entries(
    program.manifests,
    PROCESS_EVIDENCE_BOUNDS.maxManifests,
    "evidence manifests",
  )) {
    const parsed = parseOrganismManifest(
      bound(raw, PROCESS_BOUNDS.maxManifestBytes),
    );
    if (digestCanonical(manifestToJson(parsed)) !== key)
      throw new AlgalError(
        "DIGEST_MISMATCH",
        "evidence manifest digest mismatch",
      );
    manifests[key] = raw;
  }
  const values = Object.fromEntries(
    entries(
      program.values,
      PROCESS_EVIDENCE_BOUNDS.maxValues,
      "evidence values",
    ),
  );
  const negatives = asObject(value.missing, "evidence missing");
  noUnknownKeys(negatives, ["manifests", "values"], "evidence missing");
  const absent = {
    manifests: missing(negatives.manifests, "missing manifests"),
    values: missing(negatives.values, "missing values"),
  };
  if (
    absent.manifests.some((key) => Object.hasOwn(manifests, key)) ||
    absent.values.some(
      (key) => Object.hasOwn(values, key) || Object.hasOwn(records, key),
    )
  )
    fail("positive and missing evidence overlap");
  if (
    !records[head] ||
    records[head].manifestDigest !== root ||
    !manifests[root]
  )
    fail("process evidence head or root is missing or mismatched");
  return {
    contract: "algal.process-evidence.v1",
    head,
    records,
    receipts,
    program: { contract: "algal.bundle.v1", root, manifests, values },
    tools: signatures(value.tools),
    missing: absent,
  };
}

/** A Store that refuses ambient authority even if replay catches its errors. */
function readonlyStore(
  reads: Pick<Store, "getManifest" | "getValue" | "getReceipt">,
): { store: Store; assertHealthy(): void } {
  let violation = false;
  const deny = async (): Promise<never> => {
    violation = true;
    throw new AlgalError(
      "CAPABILITY_DENIED",
      "process evidence cannot access mutable source state",
    );
  };
  return {
    store: {
      ...reads,
      putManifest: deny,
      putValue: deny,
      putReceipt: deny,
      getEffect: deny,
      putEffect: deny,
      getSlot: deny,
      setSlot: deny,
    },
    assertHealthy: () => {
      if (violation) fail("process evidence attempted mutable source access");
    },
  };
}
async function verifyFixed(
  snapshot: ProcessSnapshot,
  store: Store,
  tools: ToolRegistry,
  receiptKeys?: string[],
) {
  const manifest = await store.getManifest(snapshot.process.manifestDigest);
  if (!manifest) throw new AlgalError("STORE_MISS", "process manifest missing");
  // Ready heads also require their static program closure and builtin functions.
  await compileOrganism(
    manifest,
    builtinRegistry(),
    store,
    0,
    undefined,
    tools,
  );
  if (receiptKeys) {
    const chain = await readProcessHistory(snapshot, store);
    const referenced = new Set(
      chain.flatMap((item) =>
        item.process.receipt ? [item.process.receipt] : [],
      ),
    );
    if (
      referenced.size !== receiptKeys.length ||
      receiptKeys.some((key) => !referenced.has(key as Digest))
    )
      fail("process evidence receipts must exactly match the retained history");
  }
  return verifyProcessSnapshot(snapshot, store, builtinRegistry(), tools);
}

export type ProcessEvidenceReport = {
  ok: true;
  digest: Digest;
  status: ProcessRecord["status"];
  generations: number;
  receipts: number;
  evidenceDigest: Digest;
};
export async function verifyProcessEvidence(
  raw: unknown,
): Promise<ProcessEvidenceReport> {
  const supplied = structuredClone(bound(raw));
  const evidence = parseProcessEvidence(supplied),
    evidenceDigest = digestCanonical(supplied),
    absentManifests = new Set(evidence.missing.manifests),
    absentValues = new Set(evidence.missing.values);
  let undeclaredRead = false;
  const undeclared = (): never => {
    undeclaredRead = true;
    throw new AlgalError(
      "STORE_MISS",
      "process evidence lacks a declared dependency",
    );
  };
  const { store, assertHealthy } = readonlyStore({
    getManifest: async (key) => {
      const value = evidence.program.manifests[key];
      if (value !== undefined)
        return parseOrganismManifest(structuredClone(value));
      if (absentManifests.has(key)) return undefined;
      return undeclared();
    },
    getValue: async (key) => {
      const value = evidence.records[key] ?? evidence.program.values[key];
      if (value !== undefined) return structuredClone(json(value));
      if (absentValues.has(key)) return undefined;
      return undeclared();
    },
    getReceipt: async (key) =>
      evidence.receipts[key] === undefined
        ? undeclared()
        : structuredClone(json(evidence.receipts[key])),
  });
  const snapshot = {
    digest: evidence.head,
    process: evidence.records[evidence.head]!,
  };
  const report = await verifyFixed(
    snapshot,
    store,
    offlineTools(evidence.tools),
    Object.keys(evidence.receipts),
  );
  assertHealthy();
  if (undeclaredRead)
    fail("process evidence accessed an undeclared dependency");
  return { ...report, status: snapshot.process.status, evidenceDigest };
}

/** Export reads a fixed head and only dependencies actually requested by replay. */
export async function exportProcessEvidence(
  snapshot: ProcessSnapshot,
  source: Store,
  tools: ToolRegistry = mailboxToolRegistry(new MemoryMailboxService()),
): Promise<ProcessEvidence> {
  snapshot = {
    digest: asDigest(snapshot.digest, "process evidence head"),
    process: parseProcessRecord(snapshot.process),
  };
  if (digestCanonical(json(snapshot.process)) !== snapshot.digest)
    throw new AlgalError(
      "DIGEST_MISMATCH",
      "process evidence head digest mismatch",
    );
  snapshot = structuredClone(snapshot);
  if (tools.size > PROCESS_EVIDENCE_BOUNDS.maxTools)
    throw new AlgalError("BUDGET_EXHAUSTED", "evidence tool count exceeded");
  const capturedTools = structuredClone(
    signatures(
      bound(
        Object.fromEntries(
          [...tools].map(([name, entry]) => [name, entry.signature]),
        ),
      ),
    ),
  );
  const records: Record<Digest, ProcessRecord> = {},
    receipts: Record<Digest, RunReceipt> = {},
    manifests: Record<Digest, JsonValue> = {},
    values: Record<Digest, JsonValue> = {};
  const missedManifests = new Set<Digest>(),
    missedValues = new Set<Digest>();
  let captureFailure = false;
  values[snapshot.digest] = json(snapshot.process);
  let retainedBytes =
    canonicalBytes(json(snapshot.process)) +
    canonicalBytes(json(capturedTools));
  const capture = (
    target: Record<Digest, JsonValue>,
    missed: Set<Digest>,
    key: Digest,
    raw: JsonValue | undefined,
    maxCount: number,
    maxBytes: number,
  ): void => {
    try {
      asDigest(key, "source dependency");
      if (raw === undefined) {
        if (Object.hasOwn(target, key))
          fail("source dependency changed during evidence export");
        if (
          !missed.has(key) &&
          missed.size >= PROCESS_EVIDENCE_BOUNDS.maxMissing
        )
          throw new AlgalError(
            "BUDGET_EXHAUSTED",
            "source missing dependency count exceeded",
          );
        missed.add(key);
        return;
      }
      if (missed.has(key))
        fail("source dependency changed during evidence export");
      if (!Object.hasOwn(target, key) && Object.keys(target).length >= maxCount)
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          "source dependency count exceeded",
        );
      const checked = bound(raw, maxBytes);
      if (digestCanonical(checked) !== key)
        throw new AlgalError(
          "DIGEST_MISMATCH",
          "source dependency digest mismatch",
        );
      if (!Object.hasOwn(target, key)) {
        const nextBytes = retainedBytes + canonicalBytes(checked);
        if (nextBytes > PROCESS_EVIDENCE_BOUNDS.maxBytes)
          throw new AlgalError(
            "BUDGET_EXHAUSTED",
            "process evidence aggregate capture byte bound exceeded",
          );
        retainedBytes = nextBytes;
        target[key] = structuredClone(checked);
      }
    } catch (error) {
      captureFailure = true;
      throw error;
    }
  };
  const { store, assertHealthy } = readonlyStore({
    getManifest: async (key) => {
      const manifest = await source.getManifest(key);
      capture(
        manifests,
        missedManifests,
        key,
        manifest === undefined ? undefined : manifestToJson(manifest),
        PROCESS_EVIDENCE_BOUNDS.maxManifests,
        PROCESS_BOUNDS.maxManifestBytes,
      );
      return manifest === undefined ? undefined : structuredClone(manifest);
    },
    getValue: async (key) => {
      const value = await source.getValue(key);
      capture(
        values,
        missedValues,
        key,
        value,
        PROCESS_EVIDENCE_BOUNDS.maxValues + PROCESS_EVIDENCE_BOUNDS.maxRecords,
        PROCESS_EVIDENCE_BOUNDS.maxBytes,
      );
      return value === undefined ? undefined : structuredClone(value);
    },
    getReceipt: async (key) => {
      const value = await source.getReceipt(key);
      if (value === undefined)
        throw new AlgalError("STORE_MISS", "process receipt missing");
      capture(
        receipts as unknown as Record<Digest, JsonValue>,
        new Set(),
        key,
        value,
        PROCESS_EVIDENCE_BOUNDS.maxReceipts,
        PROCESS_BOUNDS.maxReceiptBytes,
      );
      return structuredClone(value);
    },
  });
  const chain = await readProcessHistory(snapshot, store);
  for (const item of chain) records[item.digest] = item.process;
  await verifyFixed(snapshot, store, offlineTools(capturedTools));
  assertHealthy();
  if (captureFailure) fail("process evidence dependency capture failed");
  for (const key of Object.keys(records)) delete values[key as Digest];
  const evidence = parseProcessEvidence({
    contract: "algal.process-evidence.v1",
    head: snapshot.digest,
    records,
    receipts,
    program: {
      contract: "algal.bundle.v1",
      root: snapshot.process.manifestDigest,
      manifests,
      values,
    },
    tools: capturedTools,
    missing: {
      manifests: [...missedManifests].sort(),
      values: [...missedValues].sort(),
    },
  });
  await verifyProcessEvidence(evidence);
  return evidence;
}
