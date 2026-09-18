// Seeded property-style checks: canonicalization and digest stability over
// generated JSON values, including key-permutation invariance. Deterministic
// generator, no fuzzing dependency.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { canonicalize, type JsonValue } from "./values";
import { digestCanonical } from "./digest";
import { manifestToJson, parseOrganismManifest } from "./contract";

// mulberry32: tiny seeded PRNG, deterministic across runs and platforms.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genValue(rand: () => number, depth: number): JsonValue {
  const r = rand();
  if (depth > 3 || r < 0.45) {
    const pick = rand();
    if (pick < 0.3) return null;
    if (pick < 0.55) return rand() < 0.5;
    if (pick < 0.8) return Math.floor(rand() * 1e6) / 97;
    const len = Math.floor(rand() * 12);
    return Array.from({ length: len }, () =>
      String.fromCharCode(32 + Math.floor(rand() * 600)),
    ).join("");
  }
  if (r < 0.75) {
    const len = Math.floor(rand() * 5);
    return Array.from({ length: len }, () => genValue(rand, depth + 1));
  }
  const obj: Record<string, JsonValue> = {};
  const keys = Math.floor(rand() * 6);
  for (let i = 0; i < keys; i++) {
    obj[`k${i}_${Math.floor(rand() * 100)}`] = genValue(rand, depth + 1);
  }
  return obj;
}

function shuffleKeys(v: JsonValue, rand: () => number): JsonValue {
  if (Array.isArray(v)) return v.map((x) => shuffleKeys(x, rand));
  if (v !== null && typeof v === "object") {
    const entries = Object.entries(v);
    // deterministic Fisher-Yates under the same seed
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [entries[i], entries[j]] = [entries[j]!, entries[i]!];
    }
    return Object.fromEntries(
      entries.map(([k, x]) => [k, shuffleKeys(x, rand)]),
    );
  }
  return v;
}

describe("canonicalization properties", () => {
  test("key permutation never changes the canonical form", () => {
    const rand = rng(0x5eed);
    for (let i = 0; i < 200; i++) {
      const v = genValue(rand, 0);
      const shuffled = shuffleKeys(v, rand);
      expect(canonicalize(shuffled)).toBe(canonicalize(v));
      expect(digestCanonical(shuffled)).toBe(digestCanonical(v));
    }
  });

  test("round-trip: canonical form reparses to an equal digest", () => {
    const rand = rng(0xc0ffee);
    for (let i = 0; i < 200; i++) {
      const v = genValue(rand, 0);
      const reparsed = JSON.parse(canonicalize(v)) as JsonValue;
      expect(digestCanonical(reparsed)).toBe(digestCanonical(v));
    }
  });
});

describe("manifest corpus properties", () => {
  const EXAMPLES = join(import.meta.dir, "..", "examples");

  test("every bundled example parses to a stable canonical form", async () => {
    const files = (await readdir(EXAMPLES)).filter((f) =>
      f.endsWith(".algal.json"),
    );
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const raw = JSON.parse(
        await Bun.file(join(EXAMPLES, f)).text(),
      ) as JsonValue;
      const once = manifestToJson(parseOrganismManifest(raw));
      const twice = manifestToJson(parseOrganismManifest(once));
      expect(twice).toEqual(once);
    }
  });

  test("key permutation at any depth preserves the parsed manifest", async () => {
    const raw = JSON.parse(
      await Bun.file(join(EXAMPLES, "triage.algal.json")).text(),
    ) as JsonValue;
    const permuted = shuffleKeys(raw, rng(0xdead));
    expect(manifestToJson(parseOrganismManifest(permuted))).toEqual(
      manifestToJson(parseOrganismManifest(raw)),
    );
  });
});
