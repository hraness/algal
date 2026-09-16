// Static site build: copy site sources into site/dist. No framework.

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = dirname(fileURLToPath(import.meta.url));
const DIST = join(SITE, "dist");

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const f of ["index.html", "styles.css"]) {
  await cp(join(SITE, f), join(DIST, f));
}

console.log(`site built → ${DIST}`);
