#!/usr/bin/env bun
import { repositoryRoot } from "../verify/lib/files";
import { runSuite } from "../verify/lib/runner";
import { requireThat } from "../verify/lib/schema";
import { SUITES } from "../verify/lib/suites";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--list") {
    console.log(JSON.stringify({ suites: Object.fromEntries(SUITES), "all-required": "implemented infrastructure plus active required claims; pending claims stay pending" }, null, 2));
    return;
  }
  requireThat(args.length === 2 || args.length === 3 && args[2] === "--json", "usage: bun scripts/verify.ts --suite <name> [--json] | --list");
  requireThat(args[0] === "--suite" && typeof args[1] === "string", "a single --suite is required");
  const result = await runSuite(await repositoryRoot(import.meta.path), args[1]);
  if (args[2] === "--json") console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`${result.suite}: passed (infrastructure only; 0 formal claims)`);
    console.log(`Inputs: ${result.binding.inputDigest}; Bun ${result.binding.runtime.version} ${result.binding.runtime.sha256}`);
    console.log(JSON.stringify(result.details, null, 2));
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(JSON.stringify({ status: "failed", error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  });
}
