/** In-memory CAS and replay overlays. No filesystem imports. */
import { asDigest, digestCanonical, type Digest } from "./digest";
import { manifestToJson, type OrganismManifest } from "./contract";
import type { EffectReceipt } from "./effects";
import type { Store } from "./store";
import type { JsonValue } from "./values";

export class MemoryStore implements Store {
  private manifests = new Map<Digest, OrganismManifest>();
  private receipts = new Map<Digest, JsonValue>();

  async getManifest(digest: Digest) {
    return structuredClone(this.manifests.get(digest));
  }
  async putManifest(manifest: OrganismManifest) {
    const d = digestCanonical(manifestToJson(manifest));
    this.manifests.set(d, structuredClone(manifest));
    return d;
  }
  async getReceipt(digest: Digest) {
    return structuredClone(this.receipts.get(digest));
  }
  async putReceipt(receipt: JsonValue) {
    const d = digestCanonical(receipt);
    this.receipts.set(d, structuredClone(receipt));
    return d;
  }
  private values = new Map<Digest, JsonValue>();
  async getValue(digest: Digest) {
    return structuredClone(this.values.get(digest));
  }
  async putValue(value: JsonValue) {
    const d = digestCanonical(value);
    this.values.set(d, structuredClone(value));
    return d;
  }
  private effects = new Map<Digest, EffectReceipt>();
  async getEffect(requestDigest: Digest, executor?: string) {
    return structuredClone(this.effects.get(effectKey(requestDigest, executor)));
  }
  async putEffect(receipt: EffectReceipt, executor?: string) {
    const key = effectKey(receipt.requestDigest, executor);
    if (!this.effects.has(key)) {
      this.effects.set(key, structuredClone(receipt));
    }
    return receipt.requestDigest;
  }
  private slots = new Map<string, JsonValue>();
  async getSlot(name: string) {
    return structuredClone(this.slots.get(name));
  }
  async setSlot(name: string, value: JsonValue) {
    this.slots.set(name, structuredClone(value));
  }
}

export function effectKey(requestDigest: Digest, executor?: string): Digest {
  asDigest(requestDigest, "effect request digest");
  return executor === undefined ? requestDigest : digestCanonical({
    contract: "algal.effect-cache.v1", executor, requestDigest,
  });
}

export function replayStore(source: Store): Store {
  const overlay = new MemoryStore();
  return {
    getManifest: async (d) => await overlay.getManifest(d) ?? source.getManifest(d),
    putManifest: (m) => overlay.putManifest(m),
    getReceipt: async (d) => await overlay.getReceipt(d) ?? source.getReceipt(d),
    putReceipt: (r) => overlay.putReceipt(r),
    getValue: async (d) => {
      const value = await overlay.getValue(d);
      return value === undefined ? source.getValue(d) : value;
    },
    putValue: (v) => overlay.putValue(v),
    getEffect: (d, e) => overlay.getEffect(d, e),
    putEffect: (r, e) => overlay.putEffect(r, e),
    getSlot: (n) => overlay.getSlot(n),
    setSlot: (n, v) => overlay.setSlot(n, v),
  };
}
