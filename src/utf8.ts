/** UTF-8 operations shared by the reference runtime and browser hosts. The
 * replacement of unpaired UTF-16 surrogates matches TextEncoder / Node UTF-8. */
const decoder = new TextDecoder("utf-8", { ignoreBOM: true });

export function utf8Length(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length && text.charCodeAt(index + 1) >= 0xdc00 && text.charCodeAt(index + 1) <= 0xdfff) { bytes += 4; index++; }
    else bytes += 3;
  }
  return bytes;
}

/** Encode explicitly so receipt identity does not depend on host encoder fast
 * paths. In particular Bun 1.3.14 misencodes some long Latin-1 string tails. */
export function utf8Bytes(text: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(utf8Length(text));
  let offset = 0;
  for (let index = 0; index < text.length; index++) {
    let code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length && text.charCodeAt(index + 1) >= 0xdc00 && text.charCodeAt(index + 1) <= 0xdfff) {
      code = 0x10000 + ((code - 0xd800) << 10) + text.charCodeAt(++index) - 0xdc00;
    } else if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;
    if (code < 0x80) bytes[offset++] = code;
    else if (code < 0x800) { bytes[offset++] = 0xc0 | (code >>> 6); bytes[offset++] = 0x80 | (code & 0x3f); }
    else if (code < 0x10000) { bytes[offset++] = 0xe0 | (code >>> 12); bytes[offset++] = 0x80 | ((code >>> 6) & 0x3f); bytes[offset++] = 0x80 | (code & 0x3f); }
    else { bytes[offset++] = 0xf0 | (code >>> 18); bytes[offset++] = 0x80 | ((code >>> 12) & 0x3f); bytes[offset++] = 0x80 | ((code >>> 6) & 0x3f); bytes[offset++] = 0x80 | (code & 0x3f); }
  }
  return bytes;
}

/** Receipt diagnostics use UTF-8 byte order, including non-BMP property names. */
export function compareUtf8(left: string, right: string): number {
  const a = utf8Bytes(left), b = utf8Bytes(right);
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    if (a[index] !== b[index]) return a[index]! - b[index]!;
  }
  return a.length - b.length;
}

/** Retain complete scalar values within a byte cap; a leading BOM is content. */
export function truncateUtf8(text: string, maxBytes: number): string {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new Error("Invalid UTF-8 byte cap");
  const bytes = utf8Bytes(text);
  let end = Math.min(bytes.length, maxBytes);
  while (end < bytes.length && end > 0 && (bytes[end]! & 0xc0) === 0x80) end--;
  return decoder.decode(bytes.subarray(0, end));
}
