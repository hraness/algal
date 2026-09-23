import { AlgalError } from "./errors";
import { constants } from "node:fs";
import { open } from "node:fs/promises";

/** Admit the opened descriptor before reading; special files never wait for a writer. */
export async function boundedFileBytes(
  path: string,
  maxBytes: number,
  label: string,
  followLinks = false,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 67_108_864) {
    throw new AlgalError("PARSE_FAILED", `${label}: invalid byte limit`);
  }
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK | (followLinks ? 0 : constants.O_NOFOLLOW));
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maxBytes) {
      throw new AlgalError("BUDGET_EXHAUSTED", `${label}: regular file byte bound`);
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for (;;) {
      const buffer = Buffer.alloc(Math.min(65_536, maxBytes + 1 - size));
      const { bytesRead } = await file.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      size += bytesRead;
      if (size > maxBytes) throw new AlgalError("BUDGET_EXHAUSTED", `${label} exceeds ${maxBytes} bytes`);
      chunks.push(buffer.subarray(0, bytesRead));
    }
    return Buffer.concat(chunks, size);
  } finally { await file.close(); }
}

export { boundedBytes, commandJson } from "./io-runtime";
