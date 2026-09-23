import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { hashFile, hashJson, readFileBounded, stableJson, type FileBinding } from "../lib/files";
import { CommandFailure, admitSelftestOutput, requireSuccess, runCommand, type CommandResult } from "../lib/runner";
import { requireThat } from "../lib/schema";
import { artifactIdentity } from "../traces/native";
import { traceDefinition } from "../traces/run";

const STATEFUL = "verification_trace::sixty_four_state_dependent_native_histories_preserve_exact_semantics";
const SHRINK = "verification_trace::shrinking_exports_concrete_histories_and_replays_the_same_named_negative_control";
const CONTROLS = [
  "rejects_invalid_histories_and_unresolved_authority_without_api_fallback",
  "exact_mailbox_outcomes_retain_consumed_evidence_and_authority",
  "failed_receive_preserves_both_delivery_markers_without_implicit_reconciliation",
  "after_link_error_records_real_visible_publication_without_promising_acknowledgment",
  "stale_application_writers_exact_retries_and_conflicting_retries_are_distinct",
  "every_application_checkpoint_has_distinct_persisted_failure_observation",
  "persistent_store_commands_admit_retained_files_even_after_prior_cache_fill",
  "portable_target_inventory_uses_utf16_order_for_scalar_unicode",
  "aborting_the_real_admission_future_releases_custody_without_publishing_a_head",
].map(name => `verification_trace::${name}`);

/** Pinned libtest --show-output framing, including a single captured-output
 * section. --nocapture interleaves test prints with the unfinished status line. */
export function admitNativeTest(result: CommandResult, name: string): string {
  requireSuccess(result);
  requireThat(/^[A-Za-z_][A-Za-z0-9_:]*$/.test(name), "invalid native verification selector");
  requireThat(result.stderr === "", "native verification emitted uncaptured diagnostics");
  const framing = new RegExp(`^\\nrunning 1 test\\ntest ${name} \\.\\.\\. ok\\n\\nsuccesses:\\n(?:\\n---- ${name} stdout ----\\n([\\s\\S]*?)\\n\\n)?\\nsuccesses:\\n    ${name}\\n\\ntest result: ok\\. 1 passed; 0 failed; 0 ignored; 0 measured; (?:0|[1-9]\\d*) filtered out; finished in \\d+(?:\\.\\d+)?s\\n\\n$`);
  const matched = framing.exec(result.stdout);
  requireThat(matched !== null, "native verification selector did not execute exactly its one test");
  const output = matched[1] ?? "";
  requireThat(!/^(?:running \d+ tests?|test .* \.\.\.|test result:|successes:|failures:|---- .* (?:stdout|stderr) ----)/m.test(output), "native verification captured conflicting test framing");
  return output;
}

/** The only accepted progress records are inside the matching captured section. */
export function admitNativeProgress(name: string, output: string, shrunkHistory: string): void {
  if (name === STATEFUL) requireThat(output === "native-stateful: 64 completed histories; hegel=0.46.1 engine=0.43.1 seed=1097623393", "native stateful generator did not complete64 fixed-profile histories");
  else if (name === SHRINK) {
    // Hegel 0.46.1 prints this diagnostic for the deliberately failing oracle;
    // its opaque blob is not the portable replay evidence below it.
    const match = /^\nTo reproduce this failure, add the attribute below #\[hegel::test\]:\n {4}#\[hegel::reproduce_failure\("[A-Za-z0-9+/]{1,4096}={0,2}"\)\]\nnative-shrunk-negative-control: ([^\n]+)$/.exec(output);
    requireThat(match !== null && match[1] === shrunkHistory, "native shrink did not retain its exact concrete same-property replay");
  } else requireThat(output === "", "native verification control emitted unexpected output");
}

async function definition(root: string) {
  const trace = await traceDefinition(root);
  const adapters: FileBinding[] = await Promise.all(["verify/stateful/run.ts", "verify/tests/stateful-output.test.ts", "verify/lib/suites.ts"]
    .map(async path => ({ path, sha256: await hashFile(root, path) })));
  return { trace, adapters };
}

export async function runNativeVerification(root: string, suite: "stateful" | "fault-harness", binary: string): Promise<unknown> {
  requireThat(isAbsolute(binary), "ALGAL_TRACE_TEST_BIN must be an absolute task-owned native test artifact");
  const before = await definition(root), artifact = await artifactIdentity(binary);
  const archive = await mkdtemp(join(tmpdir(), "algal-native-verification-"));
  await writeFile(join(archive, "start.json"), stableJson({ suite, definition: before, artifact }) + "\n", { flag: "wx", mode: 0o600 });
  const shrunkHistory = stableJson(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readFileBounded(root, "crates/algal/tests/fixtures/verification_trace/hegel-first-wins-negative.json", 32_768))));
  const commands: { name: string; result: CommandResult }[] = [];
  let ordinal = 0;
  async function execute(command: string[], timeoutMs: number): Promise<CommandResult> {
    const directory = join(archive, String(ordinal++));
    await mkdir(directory);
    try {
      const result = await runCommand(command, root, { timeoutMs, maxOutputBytes: 1_048_576 });
      await writeFile(join(directory, "command.json"), stableJson(result) + "\n", { flag: "wx", mode: 0o600 });
      return result;
    } catch (error) {
      if (error instanceof CommandFailure) {
        await writeFile(join(directory, "stdout.bin"), error.rawStdout, { flag: "wx", mode: 0o600 });
        await writeFile(join(directory, "stderr.bin"), error.rawStderr, { flag: "wx", mode: 0o600 });
        await writeFile(join(directory, "custody-failure.json"), stableJson({ message: error.message, ...error.observation }) + "\n", { flag: "wx", mode: 0o600 });
      }
      throw error;
    }
  }
  try {
    for (const name of suite === "stateful" ? [STATEFUL, SHRINK] : CONTROLS) {
      // Minimal runner environment excludes every ambient Hegel override. The
      // test independently fixes case count, seed and disabled database.
      const result = await execute([artifact.path, "--exact", name, "--show-output", "--test-threads=1"], suite === "stateful" ? 600_000 : 60_000);
      admitNativeProgress(name, admitNativeTest(result, name), shrunkHistory);
      commands.push({ name, result });
    }
    let bun: { tests: number; result: CommandResult } | null = null;
    if (suite === "fault-harness") {
      const result = await execute([process.execPath, "test", "--timeout", "20000", "verify/traces/trace.test.ts", "src/application-cancellation.test.ts"], 120_000);
      bun = { tests: admitSelftestOutput(result), result };
    }
    requireThat(hashJson(before) === hashJson(await definition(root)) && hashJson(artifact) === hashJson(await artifactIdentity(binary)), "native verification source/artifact changed during execution");
    return { contract: "algal.native-verification-evidence.v1", suite, definition: before, artifact, archive, commands, bun,
      scope: "Sampled real filesystem histories and actual cancellation/fault/shrink controls. The built artifact/source correspondence is a separate build obligation; no implementation refinement or physical power-loss proof." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeFile(join(archive, "failure.json"), stableJson({ message }) + "\n", { flag: "wx", mode: 0o600 });
    throw new Error(`native verification rejected; raw evidence retained at ${archive}: ${message}`, { cause: error });
  }
}
