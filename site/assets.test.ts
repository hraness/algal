import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSiteStyles } from "./assets";
import { normalizeSitePatternResets } from "./style-normalization";

test("site CSS references separate hashed fonts with exact shared font bytes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-site-assets-"));
  try {
    const result = await buildSiteStyles(directory);
    if (!result.success) throw new AggregateError(result.logs, "Site style build failed");
    const css = await readFile(join(directory, "styles.css"), "utf8");
    expect(normalizeSitePatternResets(css)).toBe(css);
    expect(css.match(/--hraness-material-wall-images:initial;--hraness-pattern-decoration:initial/g)).toHaveLength(3);
    const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
    const fontsDirectory = join(import.meta.dir, "../node_modules/@hraness/design-kit/src/fonts");
    const originals = new Set<string>();
    for await (const path of new Bun.Glob("**/*.woff2").scan(fontsDirectory)) {
      originals.add(createHash("sha256").update(await readFile(join(fontsDirectory, path))).digest("hex"));
    }
    expect(faces.length).toBe(originals.size);
    expect(faces.length).toBeGreaterThan(0);
    expect(Buffer.byteLength(css)).toBeLessThan(524_288);
    const references = new Set<string>();
    const hashes = new Set<string>();
    for (const face of faces) {
      expect(face).toContain("font-display:swap");
      expect(face).not.toMatch(/(?:data:|https?:|\/\/)/i);
      const urls = [...face.matchAll(/url\((?:"([^"]+)"|'([^']+)'|([^\s)]+))\)/g)];
      expect(urls).toHaveLength(1);
      const url = urls[0]![1] ?? urls[0]![2] ?? urls[0]![3]!;
      expect(url).toMatch(/^\.\/assets\/font-[a-zA-Z0-9_-]+-[a-f0-9]{16}\.woff2$/);
      references.add(url.slice("./assets/".length));
      const bytes = await readFile(join(directory, url));
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("wOF2");
      const hash = createHash("sha256").update(bytes).digest("hex");
      expect(url).toEndWith(`-${hash.slice(0, 16)}.woff2`);
      expect(originals.has(hash)).toBe(true);
      hashes.add(hash);
    }
    expect(hashes).toEqual(originals);
    expect(new Set((await readdir(join(directory, "assets"))).filter(name => name.endsWith(".woff2")))).toEqual(references);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 10_000);
