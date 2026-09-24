/** Portable remote-closure lookup port, with host-selected delivery. */
import type { Bundle } from "./bundle";
import type { Digest } from "./digest-type";

export interface Transport {
  id: string;
  /** The closure rooted at `root`, or null when the transport doesn't
   * hold it. Implementations bound their own latency and size. */
  getBundle(root: Digest): Promise<Bundle | null>;
}

