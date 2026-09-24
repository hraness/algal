import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { digestCanonical, digestText } from "./digest";

test("portable SHA-256 preserves published vectors and block padding boundaries", () => {
  const vectors = [
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    ["abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq", "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"],
    ["a".repeat(1_000_000), "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0"],
  ];
  for (const [input, hex] of vectors) expect(digestText(input!)).toBe(`sha256:${hex}`);
  for (const length of [1, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 1024, 16_384]) {
    const input = "0123456789abcdef".repeat(Math.ceil(length / 16)).slice(0, length);
    expect(digestText(input)).toBe(`sha256:${createHash("sha256").update(input).digest("hex")}`);
  }
});

test("portable digests match native UTF-8 and WebCrypto including surrogate replacement", async () => {
  const inputs = ["\ufeffleading BOM", "café\0東京😀", "\ud800", "\udfff", "x\ud800\ud800y\udfff", "\ud83d\ude00".repeat(65), "a".repeat(2047) + "é"];
  let seed = 19;
  for (let run = 0; run < 24; run++) {
    let input = "";
    for (let index = 0; index < run * 17; index++) { seed = Math.imul(seed, 1664525) + 1013904223 | 0; input += String.fromCharCode(seed & 0xffff); }
    inputs.push(input);
  }
  for (const input of inputs) {
    const expected = createHash("sha256").update(input, "utf8").digest("hex");
    expect(digestText(input)).toBe(`sha256:${expected}`);
    const web = await crypto.subtle.digest("SHA-256", new Uint8Array(Buffer.from(input)));
    expect(digestText(input)).toBe(`sha256:${Array.from(new Uint8Array(web), byte => byte.toString(16).padStart(2, "0")).join("")}`);
  }
  expect(digestCanonical({ b: "two", a: "one" })).toBe(digestText('{"a":"one","b":"two"}'));
});
