/** Independent encoding for the bounded product-value domain. Verification
 * metadata uses stableJson instead: its integer-key ordering is different. */
import { hashBytes } from "../lib/files";
import type { Value } from "./schema";

function index(key: string): number | null {
  if (!/^(?:0|[1-9]\d*)$/.test(key)) return null;
  const n = Number(key);
  return Number.isInteger(n) && n >= 0 && n < 4_294_967_295 && String(n) === key ? n : null;
}
export function productJson(value: Value): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(productJson).join(",")}]`;
  const keys = Object.keys(value).sort((a, b) => {
    const ai = index(a), bi = index(b);
    if (ai !== null && bi !== null) return ai - bi;
    if (ai !== null) return -1;
    if (bi !== null) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return `{${keys.map(key => `${JSON.stringify(key)}:${productJson(value[key]!)}`).join(",")}}`;
}
export const productDigest = (value: Value): string => hashBytes(productJson(value));
