// Portable closure bundles. `pack` walks a root manifest's embedded
// organisms (organism/repeat/each cells) and const-ref values, collecting
// static dependencies into one content-addressed document. `unpack` imports
// supplied records, verifying every digest; it also accepts partial closures.

import {
  BOUNDS,
  manifestToJson,
  parseOrganismManifest,
  type OrganismManifest,
} from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import type { Store } from "./store-contract";
import { asObject, reqField, type JsonValue } from "./values";

export const BUNDLE_CONTRACT = "algal.bundle.v1" as const;

// Whole-envelope admission matches the retained JSON document bounds. A value
// admitted alone can exceed these bounds once wrapped in a bundle.
const BUNDLE_DEPTH = 64;
const BUNDLE_NODES = 1_000_000;

function bundleDocumentBudget(): { visit(value: unknown, depth: number): void; member(key: string, value: unknown, depth: number, first: boolean): void } {
  let nodes = 0, bytes = 0;
  const add = (amount: number): void => {
    bytes += amount;
    if (bytes > BOUNDS.maxBundleBytes) throw new AlgalError("BUDGET_EXHAUSTED", "bundle document byte bound exceeded");
  };
  const string = (value: string): void => {
    // Count JSON's UTF-8 encoding directly from UTF-16, without allocating an
    // escaped string or relying on a host's byteLength for lone surrogates.
    const available = BOUNDS.maxBundleBytes - bytes;
    if (value.length + 2 > available) add(BOUNDS.maxBundleBytes + 1);
    let length = 2;
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      if (code < 0x80) {
        if (code < 0x20) length += code === 8 || code === 9 || code === 10 || code === 12 || code === 13 ? 2 : 6;
        else length += code === 34 || code === 92 ? 2 : 1;
      } else if (code < 0x800) length += 2;
      else if (code >= 0xd800 && code <= 0xdfff) {
        const next = value.charCodeAt(index + 1);
        if (code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) { length += 4; index++; }
        else length += 6;
      } else length += 3;
      if (length > available) add(BOUNDS.maxBundleBytes + 1);
    }
    add(length);
  };
  const visit = (value: unknown, depth: number): void => {
    if (++nodes > BUNDLE_NODES || depth > BUNDLE_DEPTH) throw new AlgalError("BUDGET_EXHAUSTED", "bundle document depth/node bound exceeded");
    if (value === null) { add(4); return; }
    if (typeof value === "string") { string(value); return; }
    if (typeof value === "boolean") { add(value ? 4 : 5); return; }
    if (typeof value === "number" && Number.isFinite(value)) { add(JSON.stringify(value).length); return; }
    if (Array.isArray(value)) {
      if (value.length > BUNDLE_NODES - nodes) throw new AlgalError("BUDGET_EXHAUSTED", "bundle document node bound exceeded");
      add(2 + Math.max(0, value.length - 1));
      // Canonical serialization counts every logical slot. Holes become null;
      // inherited/non-enumerable slots still serialize; explicit undefined is
      // not an admitted JSON value. Extra array properties do not serialize.
      for (let index = 0; index < value.length; index++) visit(index in value ? value[index] : null, depth + 1);
      return;
    }
    if (typeof value !== "object") throw new AlgalError("PARSE_FAILED", "bundle must contain only JSON values");
    add(2);
    let first = true;
    for (const key in value) {
      if (!Object.hasOwn(value, key)) continue;
      member(key, (value as Record<string, unknown>)[key], depth + 1, first);
      first = false;
    }
  };
  const member = (key: string, value: unknown, depth: number, first: boolean): void => {
    add(first ? 1 : 2); // colon, plus comma after the first property
    string(key);
    visit(value, depth);
  };
  return { visit, member };
}

function admitBundleDocument(root: unknown): void {
  bundleDocumentBudget().visit(root, 0);
}

export type Bundle = {
  contract: typeof BUNDLE_CONTRACT;
  /** digest of the root manifest */
  root: Digest;
  /** claimed digest → manifest JSON (verified on unpack) */
  manifests: Record<Digest, JsonValue>;
  /** claimed digest → payload JSON, for const-declared ref ports */
  values: Record<Digest, JsonValue>;
};

/** Walk the root manifest's embedding graph; collect every reachable
 * manifest and every payload named by a `const` `ref` port. */
export async function packOrganism(
  root: OrganismManifest,
  store: Store,
): Promise<Bundle> {
  const manifests: Record<Digest, JsonValue> = {};
  const values: Record<Digest, JsonValue> = {};
  const cap = BOUNDS.maxCells * BOUNDS.maxDepth;
  let valueCount = 0;
  const bundle: Bundle = { contract: BUNDLE_CONTRACT, root: digestCanonical(manifestToJson(root)), manifests, values };
  const resources = bundleDocumentBudget();
  resources.visit(bundle, 0);
  const visit = async (m: OrganismManifest): Promise<void> => {
    const json = manifestToJson(m);
    const d = digestCanonical(json);
    if (manifests[d] !== undefined) return;
    if (Object.keys(manifests).length >= BOUNDS.maxCells * BOUNDS.maxDepth) {
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        `bundle exceeds ${BOUNDS.maxCells * BOUNDS.maxDepth} manifests`,
      );
    }
    resources.member(d, json, 2, Object.keys(manifests).length === 0);
    manifests[d] = json;
    for (const cell of m.cells) {
      if (
        cell.kind === "organism" ||
        cell.kind === "repeat" ||
        cell.kind === "each"
      ) {
        const sub = await store.getManifest(
          asDigest(cell.manifest, `cell "${cell.id}".manifest`),
        );
        if (!sub) {
          throw new AlgalError(
            "STORE_MISS",
            `cell "${cell.id}" manifest ${cell.manifest} not in store — pack needs the full closure`,
          );
        }
        await visit(sub);
      }
      if (cell.kind === "const") {
        for (const decl of Object.values(cell.outputs)) {
          if (decl.type !== "ref") continue;
          const ref = asDigest(
            decl.value,
            `const "${cell.id}" ref value`,
          );
          if (Object.hasOwn(values, ref)) continue;
          if (valueCount >= cap) throw new AlgalError("BUDGET_EXHAUSTED", `bundle exceeds ${cap} values`);
          const v = await store.getValue(ref);
          if (v === undefined) {
            throw new AlgalError(
              "STORE_MISS",
              `const "${cell.id}" ref ${ref} not in store — pack needs the payload`,
            );
          }
          resources.member(ref, v, 2, valueCount === 0);
          values[ref] = v;
          valueCount++;
        }
      }
    }
  };
  await visit(root);
  admitBundleDocument(bundle);
  return bundle;
}

export function parseBundle(u: unknown): Bundle {
  const obj = asObject(u, "bundle");
  const allowed = ["contract", "root", "manifests", "values"];
  for (const k in obj) {
    if (!Object.hasOwn(obj, k)) continue;
    if (!allowed.includes(k)) {
      throw new AlgalError("PARSE_FAILED", `bundle: unknown key "${k}"`);
    }
  }
  if (obj.contract !== BUNDLE_CONTRACT) {
    throw new AlgalError(
      "PARSE_FAILED",
      `expected contract "${BUNDLE_CONTRACT}"`,
    );
  }
  const root = asDigest(reqField(obj, "root", "bundle"), "bundle.root");
  const manifestsRaw = asObject(reqField(obj, "manifests", "bundle"), "bundle.manifests");
  const cap = BOUNDS.maxCells * BOUNDS.maxDepth;
  const manifests: Record<Digest, JsonValue> = {};
  let manifestCount = 0;
  for (const k in manifestsRaw) {
    if (!Object.hasOwn(manifestsRaw, k)) continue;
    if (++manifestCount > cap) throw new AlgalError("BUDGET_EXHAUSTED", `bundle.manifests exceeds ${cap} entries`);
    manifests[asDigest(k, "bundle.manifests key")] = manifestsRaw[k]!;
  }
  const values: Record<Digest, JsonValue> = {};
  if (obj.values !== undefined) {
    const vraw = asObject(obj.values, "bundle.values");
    let valueCount = 0;
    for (const k in vraw) {
      if (!Object.hasOwn(vraw, k)) continue;
      if (++valueCount > cap) throw new AlgalError("BUDGET_EXHAUSTED", `bundle.values exceeds ${cap} entries`);
      values[asDigest(k, "bundle.values key")] = vraw[k]!;
    }
  }
  const bundle: Bundle = { contract: BUNDLE_CONTRACT, root, manifests, values };
  admitBundleDocument(bundle);
  return bundle;
}

/** Import supplied records, including partial closures, after checking all
 * digests and whole-envelope bounds. Successful import does not establish that
 * missing static dependencies can run. Store write failures are not rollback. */
export async function unpackBundle(
  bundle: Bundle,
  store: Store,
): Promise<{ manifests: number; values: number }> {
  bundle = parseBundle(bundle);
  if (bundle.manifests[bundle.root] === undefined) {
    throw new AlgalError("PARSE_FAILED", `bundle root ${bundle.root} is not among its manifests`);
  }
  const parsed = new Map<Digest, OrganismManifest>();
  const normalized: Record<Digest, JsonValue> = {};
  for (const [claimed, json] of Object.entries(bundle.manifests)) {
    const m = parseOrganismManifest(json);
    parsed.set(claimed as Digest, m);
    const value = manifestToJson(m);
    normalized[claimed as Digest] = value;
    const actual = digestCanonical(value);
    if (actual !== claimed) {
      throw new AlgalError(
        "DIGEST_MISMATCH",
        `bundle manifest claims ${claimed}, hashes to ${actual}`,
      );
    }
  }
  for (const [claimed, v] of Object.entries(bundle.values)) {
    const actual = digestCanonical(v);
    if (actual !== claimed) {
      throw new AlgalError(
        "DIGEST_MISMATCH",
        `bundle value claims ${claimed}, hashes to ${actual}`,
      );
    }
  }
  // Defaults added by manifest normalization also consume the envelope's
  // resources. Admit that representation before the first destination write.
  admitBundleDocument({ ...bundle, manifests: normalized });
  for (const m of parsed.values()) await store.putManifest(m);
  for (const value of Object.values(bundle.values)) await store.putValue(value);
  return {
    manifests: Object.keys(bundle.manifests).length,
    values: Object.keys(bundle.values).length,
  };
}
