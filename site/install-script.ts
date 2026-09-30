import { readFile } from "node:fs/promises";
import { join } from "node:path";

const TAG = /^v[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?$/;
const PLACEHOLDER = "@ALGAL_RELEASE_TAG@";

/** The release tag the hosted installer installs by default. */
export function parsePublishedRelease(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("published-release.json must be an object");
  const keys = Object.keys(value);
  const tag = (value as Record<string, unknown>).tag;
  if (keys.length !== 1 || keys[0] !== "tag" || typeof tag !== "string" || tag.length > 64 || !TAG.test(tag)) {
    throw new Error("published-release.json must hold exactly one release tag");
  }
  return tag;
}

/** Render site/install.sh with the published release tag. */
export async function renderInstallScript(siteDirectory: string): Promise<string> {
  const tag = parsePublishedRelease(JSON.parse(await readFile(join(siteDirectory, "published-release.json"), "utf8")));
  const template = await readFile(join(siteDirectory, "install.sh"), "utf8");
  if (template.split(PLACEHOLDER).length !== 2) throw new Error("install.sh must hold the release placeholder exactly once");
  return template.replace(PLACEHOLDER, tag);
}
