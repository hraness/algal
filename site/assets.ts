import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import type { BunPlugin } from "bun";

const FONT_EXTENSION = /\.(woff2?|ttf|otf)$/i;
const CSS_URL = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g;
const FONT_ASSET = /^\.\/assets\/font-[a-zA-Z0-9_-]+-[a-f0-9]{16}\.(woff2?|ttf|otf)$/;

/** Keep shared @font-face declarations while making font bytes lazy-loadable.
 * Bun 1.3 CSS can inline font loaders, and external resolution preserves the
 * original URL. Rewrite that URL in onLoad before marking it external. */
function selfHostedFonts(outdir: string): BunPlugin {
  const fonts = new Map<string, Promise<string>>();
  const fontAsset = (source: string): Promise<string> => {
    const cached = fonts.get(source);
    if (cached) return cached;
    if (fonts.size >= 64) throw new Error("Site font count exceeds 64");
    const pending = (async () => {
      const file = Bun.file(source);
      if (file.size > 2_097_152) throw new Error("Site font exceeds 2 MiB");
      const bytes = await file.bytes();
      if (bytes.length > 2_097_152) throw new Error("Site font exceeds 2 MiB");
      const extension = extname(source).toLowerCase();
      const name = basename(source, extname(source)).replace(/[^a-zA-Z0-9_-]/g, "-");
      const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
      const asset = `assets/font-${name}-${hash}${extension}`;
      await mkdir(join(outdir, "assets"), { recursive: true });
      await writeFile(join(outdir, asset), bytes);
      return `./${asset}`;
    })();
    fonts.set(source, pending);
    return pending;
  };
  return {
    name: "site-self-hosted-fonts",
    setup(build) {
      build.onLoad({ filter: /\.css$/ }, async ({ path }) => {
        const css = await readFile(path, "utf8");
        const parts: string[] = [];
        let cursor = 0;
        for (const match of css.matchAll(CSS_URL)) {
          const url = match[1] ?? match[2] ?? match[3]!;
          if (!FONT_EXTENSION.test(url)) continue;
          if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) throw new Error("Site fonts must be local files");
          const asset = await fontAsset(resolve(dirname(path), url));
          parts.push(css.slice(cursor, match.index), `url("${asset}")`);
          cursor = match.index + match[0].length;
        }
        parts.push(css.slice(cursor));
        return { contents: parts.join(""), loader: "css" };
      });
      build.onResolve({ filter: FONT_ASSET }, ({ path }) => ({ path, external: true }));
    },
  };
}

export async function buildSiteStyles(outdir: string): Promise<Bun.BuildOutput> {
  return Bun.build({
    entrypoints: [join(import.meta.dir, "styles.css")], outdir, target: "browser", minify: true,
    naming: { entry: "[name].[ext]", asset: "assets/[name]-[hash].[ext]" },
    plugins: [selfHostedFonts(outdir)],
  });
}
