/** verify/toolchain-smoke — the recorded toolchain inventory must be complete
 * and honest. Every declared tool is probed: Lean/Lake through the pinned
 * distribution manifest in verify/lean/runtime.ts, Bun/rust through their
 * recorded versions, java/tlc through their pinned digests (plus a
 * `java -version` execution for the JDK). Absent tools are reported absent —
 * the inventory is honest about what is installed — but a present tool whose
 * version or digest disagrees with the pin fails the suite. The probe list
 * always runs to completion before invariants are checked.
 */
import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { requireThat } from "../lib/schema";
import { CONTRACT, REQUIRED_IDS, toolchainSmoke } from "./smoke";

const ROOT = resolve(import.meta.dir, "../..");

test("pinned toolchain inventory is complete and honest", async () => {
  const report = await toolchainSmoke(ROOT);
  expect(report.contract).toBe(CONTRACT);
  const byId = new Map(report.tools.map(tool => [tool.id, tool]));
  // Completeness: every required id has a row.
  for (const id of REQUIRED_IDS) requireThat(byId.has(id), `toolchain-smoke report is missing ${id}`);
  // Honesty: a present tool must match its recorded pin. Absent is reported,
  // not failed; mismatch means the inventory lies.
  const mismatched = report.tools.filter(tool => tool.state === "mismatch");
  requireThat(mismatched.length === 0, `pinned tools disagree with the inventory: ${JSON.stringify(mismatched)}`);
  // The runtime executing this suite is always present and must be the pin.
  const bun = byId.get("bun")!;
  expect(bun.state).toBe("verified");
  expect(bun.observedVersion).toBe(bun.declaredVersion);
  // Every verified tool with a recorded digest proved the bytes match.
  for (const tool of report.tools)
    if (tool.state === "verified" && tool.declaredVersion !== "" && tool.id !== "bun" && tool.id !== "rust")
      expect(tool.digestStatus === "match" || tool.digestStatus === "unpinned").toBe(true);
  // Emit the algal.toolchain-smoke.v1 report for the record.
  console.log(JSON.stringify(report, null, 2));
}, 120_000);
