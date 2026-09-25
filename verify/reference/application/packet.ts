import { basename, dirname } from "node:path";
import { hashBytes, readFileBounded } from "../../lib/files";
export async function requireRetainedInput(path: string, original: string): Promise<void> {
    const retained = await readFileBounded(dirname(path), basename(path), 32_768);
    if (!Buffer.from(retained).equals(Buffer.from(original))) throw new Error("Retained history input bytes changed");
}
/** Hash the exact bounded bytes that are decoded and parsed. File paths are
 * chosen by the supervising driver, never supplied by history actions. */
export async function readPacket(path: string): Promise<{ value: unknown; bytes: number; sha256: string }> {
    const bytes = await readFileBounded(dirname(path), basename(path), 1_048_576);
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    if (text.startsWith("\ufeff")) throw new Error("History packet BOM is not admitted");
    return { value: JSON.parse(text) as unknown, bytes: bytes.length, sha256: hashBytes(bytes) };
}
