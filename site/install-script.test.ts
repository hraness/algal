import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePublishedRelease, renderInstallScript } from "./install-script";

const SITE = import.meta.dir;

test("the hosted installer names the published release and parses as sh", async () => {
  const script = await renderInstallScript(SITE);
  const tag = parsePublishedRelease(await Bun.file(join(SITE, "published-release.json")).json());
  expect(script).toContain(`default_tag="${tag}"`);
  expect(script).not.toContain("@ALGAL_RELEASE_TAG@");
  for (const target of ["aarch64-apple-darwin", "x86_64-unknown-linux-gnu", "aarch64-unknown-linux-gnu"]) {
    expect(script).toContain(`target=${target}`);
  }
  const directory = await mkdtemp(join(tmpdir(), "algal-install-script-"));
  try {
    await writeFile(join(directory, "install.sh"), script);
    expect(spawnSync("sh", ["-n", join(directory, "install.sh")]).status).toBe(0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the release record holds exactly one tag", () => {
  expect(parsePublishedRelease({ tag: "v0.2.0-vm.10" })).toBe("v0.2.0-vm.10");
  for (const value of [{}, { tag: "0.2.0" }, { tag: "v0.2.0", extra: 1 }, { tag: "v0.2.0; rm -rf /" }, []]) {
    expect(() => parsePublishedRelease(value)).toThrow();
  }
});
