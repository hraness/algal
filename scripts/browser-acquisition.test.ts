import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

test("mirror helper is covered by tempfile-only Python tests", () => {
  const result = Bun.spawnSync(["python3", "-B", "scripts/test_browser_acquisition.py"], { cwd: root });
  expect(result.exitCode).toBe(0);
});

test("every browser dependency acquisition normalizes mirrors and bounds apt in order", () => {
  const commands = [
    ["ci.yml", "node node_modules/playwright-core/cli.js install --with-deps chromium"],
    ["verify-production.yml", "bun ./node_modules/playwright-core/cli.js install --with-deps chromium"],
  ];
  for (const [file, command] of commands) {
    const workflow = readFileSync(join(root, ".github/workflows", file!), "utf8");
    const blocks = workflow.split(/(?=^ {6}- )/m).filter((block) => block.includes("install --with-deps"));
    expect(blocks).toHaveLength(1);
    const block = blocks[0]!;
    const ordered = ["set -euo pipefail", "sudo python3 scripts/browser_acquisition.py", 'config=/etc/apt/apt.conf.d/99-browser-acquisition', 'sudo test ! -e "$config"', 'sudo test ! -L "$config"', "trap 'sudo rm -f \"$config\"' EXIT", 'Acquire::http::Timeout "20";', 'Acquire::https::Timeout "20";', 'Acquire::Retries "1";', command!];
    let cursor = -1;
    for (const token of ordered) {
      const next = block.indexOf(token);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
    expect(block).not.toContain("working-directory: site");
    expect(workflow.match(/install --with-deps/g)).toHaveLength(1);
  }
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  expect(manifest.scripts.test).toBe("bun test --timeout 20000");
  const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  expect(ci).toContain("bun run test --shard=${{ matrix.shard }}/3");
  expect(ci.split("  required:\n")[1]).toContain("      - test\n");
  expect(ci).toContain("key: playwright-${{ runner.os }}-${{ steps.playwright.outputs.version }}");
  expect(ci).toContain("path: ~/.cache/ms-playwright");
  expect(ci.indexOf("actions/cache/restore@v6", ci.indexOf("id: playwright"))).toBeLessThan(ci.indexOf("sudo python3 scripts/browser_acquisition.py"));
  expect(ci.indexOf("actions/cache/save@v6", ci.indexOf("sudo python3 scripts/browser_acquisition.py"))).toBeGreaterThan(ci.indexOf("install --with-deps chromium"));
});
