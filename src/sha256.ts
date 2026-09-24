/** Synchronous SHA-256 over UTF-8. The synchronous digest contract is shared
 * by receipts, CAS identities and browser admission; WebCrypto is asynchronous.
 * FIPS 180-4's compression function, with bounded per-block working storage. */
import { utf8Bytes } from "./utf8";
const constants = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const rotate = (value: number, bits: number): number => (value >>> bits) | (value << (32 - bits));

export function sha256Text(text: string): string {
  const bytes = utf8Bytes(text);
  const hash = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const words = new Uint32Array(64);
  const compress = (block: Uint8Array, offset: number): void => {
    for (let index = 0; index < 16; index++) {
      const at = offset + index * 4;
      words[index] = (block[at]! << 24) | (block[at + 1]! << 16) | (block[at + 2]! << 8) | block[at + 3]!;
    }
    for (let index = 16; index < 64; index++) {
      const a = words[index - 15]!, b = words[index - 2]!;
      const small0 = rotate(a, 7) ^ rotate(a, 18) ^ (a >>> 3);
      const small1 = rotate(b, 17) ^ rotate(b, 19) ^ (b >>> 10);
      words[index] = words[index - 16]! + small0 + words[index - 7]! + small1;
    }
    let a = hash[0]!, b = hash[1]!, c = hash[2]!, d = hash[3]!, e = hash[4]!, f = hash[5]!, g = hash[6]!, h = hash[7]!;
    for (let index = 0; index < 64; index++) {
      const large1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choose = (e & f) ^ (~e & g);
      const first = (h + large1 + choose + constants[index]! + words[index]!) | 0;
      const large0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      h = g; g = f; f = e; e = (d + first) | 0; d = c; c = b; b = a; a = (first + large0 + majority) | 0;
    }
    hash[0] = hash[0]! + a; hash[1] = hash[1]! + b; hash[2] = hash[2]! + c; hash[3] = hash[3]! + d;
    hash[4] = hash[4]! + e; hash[5] = hash[5]! + f; hash[6] = hash[6]! + g; hash[7] = hash[7]! + h;
  };
  const complete = bytes.length - bytes.length % 64;
  for (let offset = 0; offset < complete; offset += 64) compress(bytes, offset);
  const tail = new Uint8Array(bytes.length - complete < 56 ? 64 : 128);
  tail.set(bytes.subarray(complete)); tail[bytes.length - complete] = 0x80;
  const length = new DataView(tail.buffer);
  length.setUint32(tail.length - 8, Math.floor(bytes.length / 0x20000000), false);
  length.setUint32(tail.length - 4, (bytes.length * 8) >>> 0, false);
  for (let offset = 0; offset < tail.length; offset += 64) compress(tail, offset);
  return Array.from(hash, word => word.toString(16).padStart(8, "0")).join("");
}
