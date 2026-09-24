/** Portable CAS, effect-cache and slot port. No host implementation imports. */
import type { Digest } from "./digest-type";
import type { OrganismManifest } from "./contract";
import type { EffectReceipt } from "./effects";
import type { JsonValue } from "./values";

export interface Store {
  getManifest(digest: Digest): Promise<OrganismManifest | undefined>;
  putManifest(manifest: OrganismManifest): Promise<Digest>;
  getReceipt(digest: Digest): Promise<JsonValue | undefined>;
  putReceipt(receipt: JsonValue): Promise<Digest>;
  /** Generic JSON CAS — `ref` ports point at values stored here. */
  getValue(digest: Digest): Promise<JsonValue | undefined>;
  putValue(value: JsonValue): Promise<Digest>;
  /** Effect memo index: requestDigest → recorded successful receipt.
   * Unlike the CAS methods this is keyed by *request*, not content — the
   * point is that two runs issuing the identical request share one answer.
   * `putEffect` is first-wins and idempotent. */
  getEffect(requestDigest: Digest, executor?: string): Promise<EffectReceipt | undefined>;
  putEffect(receipt: EffectReceipt, executor?: string): Promise<Digest>;
  /** Slots: named mutable cells that persist across runs — an organism's
   * memory. Not content-addressed: `setSlot` overwrites. `slot` cells are
   * the only access, so reads/writes land on the run receipt. */
  getSlot(name: string): Promise<JsonValue | undefined>;
  setSlot(name: string, value: JsonValue): Promise<void>;
}
