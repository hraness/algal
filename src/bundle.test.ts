import { describe, expect, test } from "bun:test";
import {
  packOrganism,
  parseBundle,
  unpackBundle,
  BUNDLE_CONTRACT,
} from "./bundle";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";

const inner = parseOrganismManifest({
  contract: "algal.organism.v1",
  key: "organism:b-inner",
  name: "Inner",
  cells: [
    { id: "in", kind: "input", outputs: { v: "text" } },
    { id: "e", kind: "fn", fn: "echo.v1" },
  ],
  edges: [
    { from: { cell: "in", port: "v" }, to: { cell: "e", port: "value" } },
  ],
  interface: {
    inputs: { v: { cell: "in", port: "v" } },
    outputs: { v: { cell: "e", port: "value" } },
  },
});

describe("pack/unpack", () => {
  test("packs a manifest closure and unpacks it into a fresh store", async () => {
    const src = new MemoryStore();
    const innerDigest = await src.putManifest(inner);
    const payload = { doc: "pinned" };
    const valueDigest = await src.putValue(payload);
    const outer = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:b-outer",
      name: "Outer",
      cells: [
        { id: "src", kind: "input", outputs: { v: "text" } },
        { id: "sub", kind: "organism", manifest: innerDigest },
        {
          id: "c",
          kind: "const",
          outputs: { r: { type: "ref", value: valueDigest } },
        },
      ],
      edges: [
        { from: { cell: "src", port: "v" }, to: { cell: "sub", port: "v" } },
      ],
      interface: { outputs: { v: { cell: "sub", port: "v" } } },
    });

    const bundle = await packOrganism(outer, src);
    expect(bundle.contract).toBe(BUNDLE_CONTRACT);
    expect(Object.keys(bundle.manifests).length).toBe(2);
    expect(bundle.values[valueDigest]).toEqual(payload);

    // unpack into an empty store — everything the run needs arrives
    const dst = new MemoryStore();
    const res = await unpackBundle(bundle, dst);
    expect(res).toEqual({ manifests: 2, values: 1 });
    expect(await dst.getValue(valueDigest)).toEqual(payload);

    // and the unpacked closure runs
    const r = await runOrganism({
      manifest: outer,
      args: { src: { v: "hi" } },
      fns: builtinRegistry(),
      store: dst,
      executors: [],
    });
    expect(r.outcome).toBe("complete");
    expect(r.cells["sub/e"]?.outputs?.value).toBe("hi");
  });

  test("pack fails closed when a sub-manifest is missing", async () => {
    const m = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:b-miss",
      name: "Miss",
      cells: [
        {
          id: "sub",
          kind: "organism",
          manifest:
            "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        },
      ],
    });
    await expect(packOrganism(m, new MemoryStore())).rejects.toThrow(
      "not in store",
    );
  });

  test("a tampered bundle fails digest verification on unpack", async () => {
    const src = new MemoryStore();
    const d = await src.putManifest(inner);
    const outer = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:b-tamper",
      name: "Tamper",
      cells: [{ id: "sub", kind: "organism", manifest: d }],
    });
    const bundle = await packOrganism(outer, src);
    // tamper: rewrite the inner manifest's name under its claimed digest
    const tampered = JSON.parse(JSON.stringify(bundle)) as typeof bundle;
    const innerJson = tampered.manifests[d] as Record<string, unknown>;
    innerJson.name = "Forged";
    await expect(unpackBundle(tampered, new MemoryStore())).rejects.toThrow(
      "hashes to",
    );
  });

  test("parseBundle rejects wrong contracts and malformed digests", () => {
    expect(() => parseBundle({ contract: "other" })).toThrow(/contract/);
    expect(() =>
      parseBundle({
        contract: BUNDLE_CONTRACT,
        root: "notadigest",
        manifests: {},
      }),
    ).toThrow(/digest/);
    expect(() =>
      parseBundle({
        contract: BUNDLE_CONTRACT,
        root: digestCanonical({}),
        manifests: {},
        surprise: true,
      }),
    ).toThrow(/unknown key/);
  });

  test("bundle root must be among its manifests", async () => {
    const src = new MemoryStore();
    const bundle = await packOrganism(inner, src);
    bundle.root =
      "sha256:1111111111111111111111111111111111111111111111111111111111111111";
    await expect(unpackBundle(bundle, new MemoryStore())).rejects.toThrow(
      /root .* not among/,
    );
  });

  test("manifestToJson round-trips bundle manifests unchanged", async () => {
    // a packed manifest digests identically after a store round-trip —
    // canonicalization is stable across the bundle boundary
    const src = new MemoryStore();
    const bundle = await packOrganism(inner, src);
    const reparsed = parseOrganismManifest(
      bundle.manifests[bundle.root]!,
    );
    expect(digestCanonical(manifestToJson(reparsed))).toBe(bundle.root);
  });
});
