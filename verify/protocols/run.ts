import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { governedPaths, hashFile, hashJson, stableJson, type FileBinding } from "../lib/files";
import { CommandFailure, admitSelftestOutput, runCommand, type CommandResult } from "../lib/runner";
import { requireThat } from "../lib/schema";
import { admitNativeTest } from "../stateful/run";
import { artifactIdentity } from "../traces/native";

export type Protocol = "process" | "mailbox" | "lease";
export const PROTOCOLS: Record<Protocol, { bun: string[]; native: string[] }> = {
  process: {
    bun: ["src/process-journal.test.ts", "src/process-journal-model.test.ts", "src/process-recovery.test.ts", "src/process-creation-crash.test.ts", "src/process.test.ts"],
    native: [
      "completed_prefix_replays_exactly_before_retrying_pending_read",
      "unknown_write_blocks_before_consuming_recovery_budget",
      "changed_host_binding_poison_prevents_later_dispatch_and_outcome",
      "read_recovery_budget_is_durable_and_bounded",
      "tampered_immutable_record_rejects_open",
      "identical_requests_replay_their_ordinal_and_new_binding_applies_only_to_new_ordinal",
      "lost_recovery_charge_return_remains_charged_through_real_maximum",
    ].map(name => `journal::tests::${name}`),
  },
  mailbox: {
    bun: ["src/mailbox.test.ts", "src/mailbox-admission.test.ts", "src/mailbox-model.test.ts", "src/mailbox-journal.test.ts"],
    native: [
      ...["exact_mailbox_outcomes_retain_consumed_evidence_and_authority", "failed_receive_preserves_both_delivery_markers_without_implicit_reconciliation"].map(name => `verification_trace::${name}`),
      ...["send_rechecks_authority_after_prelock_revocation", "receive_rechecks_authority_after_prelock_revocation", "orphan_claim_needs_capacity_and_consumed_retry_never_enqueues", "failed_return_after_transfer_does_not_restore_a_dequeued_message", "lost_receive_return_keeps_journal_started_and_blocks_fallback_and_recovery", "uncertainty_begins_at_mutation_attempt_and_survives_release_failure"].map(name => `mailbox_model::${name}`),
    ],
  },
  lease: {
    bun: ["src/host-state.test.ts", "src/host-lease-model.test.ts"],
    native: ["sqlite_excludes_live_owners_and_releases_after_drop", "recognized_stale_marker_is_archived_but_legacy_marker_is_retained", "unfinished_publications_are_preserved_and_bounded", "lease_database_symlink_is_rejected", "model_owner_archive_admits_256_then_preserves_refused_257th", "model_full_archive_admits_equal_and_preserves_conflicting_winner", "model_archive_is_retained_before_old_marker_removal_failure", "model_native_drop_suppresses_cleanup_error_but_releases_live_custody"].map(name => `lease::tests::${name}`),
  },
};

async function definition(root: string, protocol: Protocol) {
  const paths = [...new Set([...await governedPaths(root), ...PROTOCOLS[protocol].bun, "verify/protocols/run.ts", "verify/lib/runner.ts", "verify/lib/command-supervisor.ts", "verify/lib/files.ts", "verify/lib/schema.ts", "verify/lib/suites.ts", "verify/stateful/run.ts", "verify/traces/native.ts"])].sort();
  const sources: FileBinding[] = await Promise.all(paths.map(async path => ({ path, sha256: await hashFile(root, path) })));
  return { protocol, inventory: PROTOCOLS[protocol], sources };
}

/** Bun accepts a missing filename alongside a present one. Require every
 * declared file to exist, then collect a positive result for each separately. */
export async function runBunInventory(root: string, paths: string[], execute: (argv: string[], timeoutMs: number) => Promise<CommandResult>) {
  requireThat(paths.length > 0 && new Set(paths).size === paths.length, "protocol Bun inventory is empty or duplicated");
  await Promise.all(paths.map(path => hashFile(root, path)));
  const files: { path: string; tests: number }[] = [];
  for (const path of paths) {
    const result = await execute([process.execPath, "test", "--timeout", "20000", `./${path}`], 120_000);
    files.push({ path, tests: admitSelftestOutput(result) });
  }
  return files;
}

/** These are executed correspondence examples; the model/source map remains
 * reviewed and sampled. A byte hash does not establish native build provenance. */
export async function runProtocolConformance(root: string, protocol: Protocol, binary: string): Promise<unknown> {
  const artifact = await artifactIdentity(binary), before = await definition(root, protocol);
  const archive = await mkdtemp(join(tmpdir(), `algal-${protocol}-conformance-`));
  await writeFile(join(archive, "start.json"), stableJson({ artifact, definition: before }) + "\n", { flag: "wx", mode: 0o600 });
  const commands: CommandResult[] = [];
  async function execute(argv: string[], timeoutMs: number): Promise<CommandResult> {
    const directory = join(archive, String(commands.length)); await mkdir(directory);
    try {
      const result = await runCommand(argv, root, { timeoutMs, maxOutputBytes: 1_048_576 });
      await writeFile(join(directory, "command.json"), stableJson(result) + "\n", { flag: "wx", mode: 0o600 });
      commands.push(result); return result;
    } catch (error) {
      if (error instanceof CommandFailure) {
        await writeFile(join(directory, "stdout.bin"), error.rawStdout);
        await writeFile(join(directory, "stderr.bin"), error.rawStderr);
        await writeFile(join(directory, "custody-failure.json"), stableJson({ message: error.message, ...error.observation }) + "\n");
      }
      throw error;
    }
  }
  try {
    const inventory = PROTOCOLS[protocol];
    requireThat(inventory.native.length > 0 && new Set(inventory.native).size === inventory.native.length, "protocol native inventory is empty or duplicated");
    for (const name of inventory.native) {
      const result = await execute([artifact.path, "--exact", name, "--show-output", "--test-threads=1"], 60_000);
      requireThat(admitNativeTest(result, name) === "", "protocol native test emitted unexpected output");
    }
    const bunFiles = await runBunInventory(root, inventory.bun, execute);
    const bunTests = bunFiles.reduce((total, file) => total + file.tests, 0);
    requireThat(hashJson(before) === hashJson(await definition(root, protocol)) && hashJson(artifact) === hashJson(await artifactIdentity(binary)), "protocol source/artifact changed during execution");
    return { contract: "algal.protocol-conformance-evidence.v1", protocol, definition: before, artifact, archive,
      nativeTests: inventory.native.length, bunTests, bunFiles, commands,
      scope: "Executed production journal/lease/mailbox correspondence cases with real local persistence and controlled faults; no proved source refinement or machine power-loss qualification. Native source/build correspondence and separate process/CLI parity remain required gates." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeFile(join(archive, "failure.json"), stableJson({ message }) + "\n");
    throw new Error(`${protocol} conformance rejected; raw evidence retained at ${archive}: ${message}`, { cause: error });
  }
}
