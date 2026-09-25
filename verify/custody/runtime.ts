import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { hashBytes } from "../lib/files";
import { requireSuccess, runCommand } from "../lib/runner";
import { array, boolean, digest, record, requireThat, string, strings } from "../lib/schema";

const OBSERVED = ["late-selected", "creator-returned", "live-admitted", "late-rejected", "live-returned", "reopened-linear-history", "stale-late-rejected", "live-idempotent"];

export function admitCustodyRuntime(value: unknown, nativeSha256: string): void {
  const report = record(value, ["contract", "nativeSha256", "profiles"], "custody runtime report");
  requireThat(report.contract === "algal.custody-test.v1" && report.nativeSha256 === nativeSha256, "custody fixture identity mismatch");
  const profiles = array(report.profiles, "custody runtime profiles", 8, 8);
  const expected = ["bun", "native"].flatMap(creator => ["bun", "native"].flatMap(late => ["bun", "native"].map(live => [creator, late, live])));
  let canonicalPair: string | undefined;
  for (const [index, value] of profiles.entries()) {
    const row = record(value, ["runtimes", "ok", "initial", "head", "observed"], `custody runtime profile ${index}`);
    requireThat(boolean(row.ok, "custody profile success"), "failed custody runtime profile");
    const runtimes = array(row.runtimes, "custody runtimes", 3, 3).map(value => string(value, "custody runtime", 16));
    requireThat(JSON.stringify(runtimes) === JSON.stringify(expected[index]), "custody runtime combination missing/repeated/reordered");
    requireThat(digest(row.initial, "custody initial") !== digest(row.head, "custody head"), "custody profile made no transition");
    const pair = JSON.stringify([row.initial, row.head]);
    canonicalPair ??= pair;
    requireThat(pair === canonicalPair, "identical custody commands diverged across runtime combinations");
    requireThat(JSON.stringify(strings(row.observed, "custody observations", OBSERVED.length, OBSERVED.length)) === JSON.stringify(OBSERVED), "custody profile omitted required observations");
  }
}

async function artifactHash(path: string): Promise<string> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    const max = 134_217_728;
    requireThat(stat.isFile() && stat.size > 0 && stat.size <= max, "custody fixture artifact bound");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const buffer = Buffer.alloc(Math.min(65_536, max + 1 - total));
      const { bytesRead } = await file.read(buffer);
      if (!bytesRead) break;
      requireThat((total += bytesRead) <= max, "custody fixture grew beyond bound");
      chunks.push(buffer.subarray(0, bytesRead));
    }
    return hashBytes(Buffer.concat(chunks)).slice(7);
  } finally { await file.close(); }
}

export async function runCustodyRuntime(root: string): Promise<unknown> {
  const configured = process.env.ALGAL_CUSTODY_TEST_BIN;
  requireThat(configured !== undefined && isAbsolute(configured), "build the native application_custody test and set its exact absolute ALGAL_CUSTODY_TEST_BIN; missing native evidence cannot skip");
  const native = await realpath(configured), before = await artifactHash(native);
  const result = await runCommand(["/usr/bin/env", `ALGAL_CUSTODY_TEST_BIN=${native}`, process.execPath, "scripts/application-custody-parity.ts"], root, { timeoutMs: 120_000, maxOutputBytes: 1_048_576 });
  requireSuccess(result);
  const summary: unknown = JSON.parse(result.stdout);
  admitCustodyRuntime(summary, before);
  requireThat(await artifactHash(native) === before, "custody fixture changed during execution");
  return { summary, commandResult: result,
    relation: "Eight deterministic Bun/native three-caller schedules through actual application services; sampled conformance, not exhaustive implementation refinement. Native fixture provenance depends on the separately required pinned Cargo build." };
}
