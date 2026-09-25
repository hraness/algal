import { stableJson } from "../../lib/files";

export const LIMITS = Object.freeze({
  histories: 4, historyCommands: 24, historyBytes: 32_768, packetBytes: 1_048_576,
  workerMs: 120_000, outputBytes: 262_144, targetCommands: 186, shrinkAttempts: 32,
  recordBytes: 1_310_720, archiveBytes: 50_331_648, failureBytes: 16_384,
  retainedFiles: 2_048, physicalEntries: 2_048, archiveDepth: 3, capturedOutputBytes: 8_388_608, nodes: 1_000_000, depth: 64,
});
function require_(condition: unknown, why: string): asserts condition { if (!condition) throw new Error(`Application history bound: ${why}`); }

/** UTF-8 length of a string, or of its JSON string spelling, without an encoded copy. */
export function utf8Size(value: string, quoted = false): number {
  let size = quoted ? 2 : 0;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (quoted && (c === 34 || c === 92 || c === 8 || c === 9 || c === 10 || c === 12 || c === 13)) size += 2;
    else if (quoted && c < 32) size += 6;
    else if (c < 128) size++;
    else if (c < 2048) size += 2;
    else if (c >= 0xd800 && c <= 0xdbff && value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) { size += 4; i++; }
    else if (c >= 0xd800 && c <= 0xdfff) size += quoted ? 6 : 3;
    else size += 3;
  }
  return size;
}

/** Admit the serialized representation before stableJson allocates it. */
export function jsonSize(value: unknown, max: number): number {
  require_(Number.isSafeInteger(max) && max >= 0 && max <= LIMITS.recordBytes, "record limit");
  let size = 0, nodes = 0;
  const ancestors = new Set<object>();
  const add = (n: number) => { size += n; require_(size <= max, "encoded record bytes"); };
  const stringSize = (text: string) => { require_(text.length <= max - size, "encoded record bytes"); return utf8Size(text, true); };
  function visit(v: unknown, depth: number): void {
    require_(++nodes <= LIMITS.nodes && depth <= LIMITS.depth, "JSON shape");
    if (typeof v === "string") { add(stringSize(v)); return; }
    if (v === null || typeof v === "boolean") { add(JSON.stringify(v).length); return; }
    if (typeof v === "number") {
      require_(Number.isFinite(v) && !Object.is(v, -0), "finite nonnegative-zero number");
      add(JSON.stringify(v).length); return;
    }
    require_(v !== null && typeof v === "object" && !ancestors.has(v), "acyclic JSON object");
    ancestors.add(v);
    if (Array.isArray(v)) {
      require_(Object.getPrototypeOf(v) === Array.prototype && v.length <= LIMITS.nodes - nodes, "array shape");
      let entries = 0;
      for (const key in v) if (Object.hasOwn(v, key)) {
        require_(String(Number(key)) === key && Number.isSafeInteger(Number(key)) && Number(key) >= 0 && Number(key) < v.length, "array extra field");
        require_(++entries <= v.length, "array fields");
      }
      add(2);
      for (let i = 0; i < v.length; i++) {
        const item = Object.getOwnPropertyDescriptor(v, String(i));
        require_(item && Object.hasOwn(item, "value") && item.enumerable, "dense own array data");
        if (i) add(1); visit(item.value, depth + 1);
      }
    } else {
      require_(Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null, "plain object");
      add(2); let entries = 0;
      for (const key in v) if (Object.hasOwn(v, key)) {
        const item = Object.getOwnPropertyDescriptor(v, key)!;
        require_(Object.hasOwn(item, "value"), "object own data");
        if (entries++) add(1); add(stringSize(key) + 1); visit(item.value, depth + 1);
      }
    }
    ancestors.delete(v);
  }
  visit(value, 0); return size;
}

export function encodeRecord(value: unknown, max: number = LIMITS.recordBytes): string {
  const size = jsonSize(value, max - 1) + 1, encoded = stableJson(value) + "\n";
  require_(utf8Size(encoded) === size, "size preflight disagrees");
  return encoded;
}

/** Reserve capacity before a launch or retained-file allocation. */
export class CaptureBudget {
  archiveBytes = 0;
  capturedOutputBytes = 0;
  retainedFiles = 0;
  targetCommands = 0;
  remainingRecordLimit(): number {
    require_(this.retainedFiles < LIMITS.retainedFiles - 1, "file inventory");
    const remaining = Math.min(LIMITS.recordBytes, LIMITS.archiveBytes - LIMITS.failureBytes - this.archiveBytes);
    require_(remaining > 0, "archive capacity"); return remaining;
  }
  reserveFile(bytes: number): void {
    require_(Number.isSafeInteger(bytes) && bytes >= 0 && bytes <= this.remainingRecordLimit(), "retained file bytes");
    this.archiveBytes += bytes; this.retainedFiles++;
  }
  beginCommand(): number {
    require_(this.targetCommands < LIMITS.targetCommands, "target command count");
    require_(this.retainedFiles + 3 < LIMITS.retainedFiles && this.archiveBytes + LIMITS.recordBytes * 3 <= LIMITS.archiveBytes - LIMITS.failureBytes, "command evidence reservation");
    const remaining = Math.min(LIMITS.outputBytes, LIMITS.capturedOutputBytes - this.capturedOutputBytes);
    require_(remaining > 0, "captured output capacity");
    this.targetCommands++; return remaining;
  }
  capture(bytes: number): void {
    require_(Number.isSafeInteger(bytes) && bytes >= 0 && bytes <= LIMITS.outputBytes && this.capturedOutputBytes + bytes <= LIMITS.capturedOutputBytes, "captured output bytes");
    this.capturedOutputBytes += bytes;
  }
}
