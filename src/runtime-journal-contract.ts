/** Optional host-owned effect journal. Pure runtimes need no filesystem. */
import type { Digest } from "./digest-type";
import type { EffectReceipt } from "./effects";

export type JournalBinding = { requestDigest: Digest; executor: string; configurationDigest: Digest; idempotencyKey: Digest; recovery: "never" | "read" };
export type JournalTicket = { token?: Digest; receipt?: EffectReceipt };
export interface RuntimeJournal {
  before(binding: JournalBinding): Promise<JournalTicket>;
  after(token: Digest, receipt: EffectReceipt): Promise<void>;
  assertHealthy(): void;
  poison(error: unknown): void;
}
