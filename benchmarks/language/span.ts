// Source-byte locations for the P0 JSON diagnostic fixtures. This does not
// implement the event-loop checker or infer a source-language location.
export type ByteSpan = { start: number; end: number };

export function locateJsonSpan(bytes: Uint8Array, at: readonly (string | number)[], key = false): ByteSpan {
  if (bytes.byteLength < 1 || bytes.byteLength > 16_384 || at.length > 64) {
    throw new Error("diagnostic source or path exceeds its limit");
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  JSON.parse(decoder.decode(bytes)); // The cursor below only accepts valid JSON.
  let cursor = 0;
  let nodes = 0;
  let found: ByteSpan | undefined;
  const space = (): void => {
    while (bytes[cursor] === 32 || bytes[cursor] === 10 || bytes[cursor] === 13 || bytes[cursor] === 9) cursor++;
  };
  const same = (path: readonly (string | number)[]): boolean =>
    path.length === at.length && path.every((part, index) => part === at[index]);
  const string = (): { name: string; span: ByteSpan } => {
    if (bytes[cursor++] !== 34) throw new Error("expected JSON string");
    const start = cursor;
    while (cursor < bytes.byteLength && bytes[cursor] !== 34) {
      cursor += bytes[cursor] === 92 ? 2 : 1;
    }
    const end = cursor++;
    return {
      name: JSON.parse(decoder.decode(bytes.subarray(start - 1, cursor))) as string,
      // Empty strings have no bytes between the quotes. Include both quote
      // bytes so a located diagnostic still has a non-empty source span.
      span: start === end ? { start: start - 1, end: end + 1 } : { start, end },
    };
  };
  const value = (path: readonly (string | number)[], depth: number): ByteSpan => {
    if (depth > 64 || ++nodes > 16_384) throw new Error("diagnostic source exceeds depth or node limit");
    space();
    const start = cursor;
    const first = bytes[cursor];
    if (first === 34) return string().span;
    if (first === 123) {
      cursor++;
      space();
      while (bytes[cursor] !== 125) {
        const property = string();
        const child = [...path, property.name];
        if (key && same(child)) found = property.span;
        space();
        if (bytes[cursor++] !== 58) throw new Error("expected JSON colon");
        const span = value(child, depth + 1);
        if (!key && same(child)) found = span;
        space();
        if (bytes[cursor] !== 44) break;
        cursor++;
        space();
      }
      if (bytes[cursor++] !== 125) throw new Error("expected JSON object end");
    } else if (first === 91) {
      cursor++;
      space();
      let index = 0;
      while (bytes[cursor] !== 93) {
        const child = [...path, index++];
        const span = value(child, depth + 1);
        if (!key && same(child)) found = span;
        space();
        if (bytes[cursor] !== 44) break;
        cursor++;
        space();
      }
      if (bytes[cursor++] !== 93) throw new Error("expected JSON array end");
    } else {
      while (cursor < bytes.byteLength && ![32, 10, 13, 9, 44, 93, 125].includes(bytes[cursor]!)) cursor++;
    }
    return { start, end: cursor };
  };
  const root = value([], 0);
  if (!key && same([])) found = root;
  space();
  if (cursor !== bytes.byteLength || !found || found.end <= found.start) {
    throw new Error("diagnostic source path not found");
  }
  return found;
}
