// Portable closure bundles. `pack` walks a root manifest's embedded
// organisms (organism/repeat/each cells) and const-ref values, collecting
// everything the run needs into one content-addressed document. `unpack`
// writes the closure into a store, verifying every digest.

import {
  BOUNDS,
  manifestToJson,
  parseOrganismManifest,
  type OrganismManifest,
} from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { MorphogenError } from "./errors";
import type { Store } from "./store";
import { asObject, reqField, type JsonValue } from "./values";

export const BUNDLE_CONTRACT = "morphogen.bundle.v1" as const;

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
  const visit = async (m: OrganismManifest): Promise<void> => {
    const json = manifestToJson(m);
    const d = digestCanonical(json);
    if (manifests[d] !== undefined) return;
    if (Object.keys(manifests).length >= BOUNDS.maxCells * BOUNDS.maxDepth) {
      throw new MorphogenError(
        "BUDGET_EXHAUSTED",
        `bundle exceeds ${BOUNDS.maxCells * BOUNDS.maxDepth} manifests`,
      );
    }
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
          throw new MorphogenError(
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
          const v = await store.getValue(ref);
          if (v === undefined) {
            throw new MorphogenError(
              "STORE_MISS",
              `const "${cell.id}" ref ${ref} not in store — pack needs the payload`,
            );
          }
          values[ref] = v;
        }
      }
    }
  };
  await visit(root);
  return {
    contract: BUNDLE_CONTRACT,
    root: digestCanonical(manifestToJson(root)),
    manifests,
    values,
  };
}

export function parseBundle(u: unknown): Bundle {
  const obj = asObject(u, "bundle");
  const allowed = ["contract", "root", "manifests", "values"];
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) {
      throw new MorphogenError("PARSE_FAILED", `bundle: unknown key "${k}"`);
    }
  }
  if (obj.contract !== BUNDLE_CONTRACT) {
    throw new MorphogenError(
      "PARSE_FAILED",
      `expected contract "${BUNDLE_CONTRACT}"`,
    );
  }
  const root = asDigest(reqField(obj, "root", "bundle"), "bundle.root");
  const manifestsRaw = asObject(reqField(obj, "manifests", "bundle"), "bundle.manifests");
  const cap = BOUNDS.maxCells * BOUNDS.maxDepth;
  if (Object.keys(manifestsRaw).length > cap) {
    throw new MorphogenError(
      "BUDGET_EXHAUSTED",
      `bundle.manifests exceeds ${cap} entries`,
    );
  }
  const manifests: Record<Digest, JsonValue> = {};
  for (const [k, v] of Object.entries(manifestsRaw)) {
    manifests[asDigest(k, "bundle.manifests key")] = v;
  }
  const values: Record<Digest, JsonValue> = {};
  if (obj.values !== undefined) {
    const vraw = asObject(obj.values, "bundle.values");
    if (Object.keys(vraw).length > cap) {
      throw new MorphogenError(
        "BUDGET_EXHAUSTED",
        `bundle.values exceeds ${cap} entries`,
      );
    }
    for (const [k, v] of Object.entries(vraw)) {
      values[asDigest(k, "bundle.values key")] = v;
    }
  }
  return { contract: BUNDLE_CONTRACT, root, manifests, values };
}

/** Write a bundle's closure into the store. Every claimed digest is
 * recomputed — a manifest or payload that doesn't hash to its key fails
 * DIGEST_MISMATCH, so a tampered bundle never installs. */
export async function unpackBundle(
  bundle: Bundle,
  store: Store,
): Promise<{ manifests: number; values: number }> {
  for (const [claimed, json] of Object.entries(bundle.manifests)) {
    const m = parseOrganismManifest(json);
    const actual = await store.putManifest(m);
    if (actual !== claimed) {
      throw new MorphogenError(
        "DIGEST_MISMATCH",
        `bundle manifest claims ${claimed}, hashes to ${actual}`,
      );
    }
  }
  for (const [claimed, v] of Object.entries(bundle.values)) {
    const actual = await store.putValue(v);
    if (actual !== claimed) {
      throw new MorphogenError(
        "DIGEST_MISMATCH",
        `bundle value claims ${claimed}, hashes to ${actual}`,
      );
    }
  }
  if (bundle.manifests[bundle.root] === undefined) {
    throw new MorphogenError(
      "PARSE_FAILED",
      `bundle root ${bundle.root} is not among its manifests`,
    );
  }
  return {
    manifests: Object.keys(bundle.manifests).length,
    values: Object.keys(bundle.values).length,
  };
}
