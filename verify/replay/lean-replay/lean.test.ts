/** verify/replay/lean-replay — the `Algal.Replay` model and theorem library
 * built under the pinned Lean runtime, plus a transitive-axiom audit of every
 * theorem the module defines.
 *
 * The claim is narrow and load-bearing: the replay model compiles and every
 * replay theorem's transitive axioms stay inside the admitted standard set.
 * No claim that the model refines the TypeScript implementation — that
 * correspondence is what `verify/replay/replay-isolation` measures. Staging
 * copies bound inputs to a fresh tree so a stale `.lake` artifact cannot
 * pretend to be a build.
 */
import { expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { hashFile } from "../../lib/files";
import { requireSuccess, runCommand, type CommandResult } from "../../lib/runner";
import { requireThat } from "../../lib/schema";
import { leanRuntime } from "../../lean/runtime";
import { parseModuleAudit, parseTheoremAudit } from "../../lean/output";

const ROOT = resolve(import.meta.dir, "../../..");
const LEAN_ROOT = join(ROOT, "verify/lean");
// Algal.Audit is a build dependency of the generated audit sources, not a
// theorem target — the audit itself covers the two replay modules only.
const MODULES = ["Algal.Replay.Model", "Algal.Replay.Theorems", "Algal.Audit"] as const;
const LIMITS = { commandMs: 120_000, outputBytes: 2_097_152 };

/** Every `theorem` the replay library declares — the audit must report each
 * one as a `theorem` declaration under `Algal.Replay` with only standard
 * axioms (`propext`, `Quot.sound`, `Classical.choice`). */
const REPLAY_THEOREMS = [
  // `serve.eq_def`/`steps.eq_def` are Lean's generated function-definition
  // equations — real theorems of the module, audited alongside the rest.
  "serve.eq_def", "steps.eq_def",
  "serve_nil", "serve_cons_eq", "serve_cons_ne", "serve_request", "serve_mem",
  "serve_sublist", "serve_none_iff", "serve_occurrence",
  "dispatch_serve_hit", "dispatch_miss", "dispatch_request", "dispatch_sourced",
  "dispatch_sublist", "dispatch_miss_unbound", "verifyCfg_dispatch_miss",
  "fresh_nolive", "steps_sourced", "steps_writes_unsettled",
  "resolveSlotRead_congr", "steps_replay_reproduces", "closureSatisfied_congr",
  "run_replay_reproduces", "ite_nil_left", "diffFields_nil", "diffReceipts_total",
  "diffReceipts_self", "diffFields_detects", "verify_iff", "verify_consistent",
  "verify_rejects_manifest", "verify_produced_verifies",
  "fabricated_stamp_verifies", "recomputed_history_verifies",
  "resume_rejects_manifest", "resume_rejects_inconsistent",
  "resume_rejects_unverified", "resume_runs_continuable", "resume_tail_sourced",
  "dropSuspended_mem", "dropSuspended_sublist", "resume_stamps_resumer",
].map(name => `Algal.Replay.${name}`);

async function stageLeanProject(stage: string): Promise<void> {
  const paths: string[] = [];
  let visited = 0;
  async function walk(path: string): Promise<void> {
    for (const entry of await readdir(join(LEAN_ROOT, path), { withFileTypes: true })) {
      requireThat(++visited <= 256, "Lean replay project inventory bound");
      if (entry.name === ".lake") continue;
      const child = path ? `${path}/${entry.name}` : entry.name;
      requireThat(!entry.isSymbolicLink(), "Lean replay project symlink rejected");
      if (entry.isDirectory()) await walk(child);
      else {
        requireThat(entry.isFile(), "Lean replay project nonregular input");
        if (child.endsWith(".lean") || child === "lakefile.toml" || child === "lean-toolchain") paths.push(child);
      }
    }
  }
  await walk("");
  for (const relative of paths) {
    const digest = await hashFile(LEAN_ROOT, relative);
    await mkdir(dirname(join(stage, relative)), { recursive: true });
    await copyFile(join(LEAN_ROOT, relative), join(stage, relative));
    requireThat(await hashFile(stage, relative) === digest, `Lean replay source changed while staging: ${relative}`);
  }
}

test("Algal.Replay.Model and Algal.Replay.Theorems build under the pinned toolchain; every theorem audits to standard axioms", async () => {
  const stage = await mkdtemp(join(tmpdir(), "algal-lean-replay-"));
  const commands: { label: string; result: CommandResult }[] = [];
  try {
    const runtime = await leanRuntime(ROOT);
    await mkdir(join(stage, "home"));
    await stageLeanProject(stage);
    const environment = ["/usr/bin/env", "-i", `HOME=${join(stage, "home")}`,
      `PATH=${join(runtime.root, "bin")}:/usr/bin:/bin`, "LANG=C", "LC_ALL=C", "TZ=UTC"];
    const command = async (label: string, argv: string[]) => {
      const result = await runCommand([...environment, ...argv], stage,
        { timeoutMs: LIMITS.commandMs, maxOutputBytes: LIMITS.outputBytes });
      commands.push({ label, result });
      return result;
    };
    for (const module of MODULES)
      requireSuccess(await command(`build:${module}`, [runtime.lake, "--no-cache", "--no-ansi", "--wfail", "build", module]));
    await Bun.write(join(stage, "GeneratedAudit.lean"),
      `import Algal.Replay.Theorems\nimport Algal.Audit\n${REPLAY_THEOREMS.map(name => `audit_theorem ${name}`).join("\n")}\n`);
    const leanArgs = [runtime.lake, "env", runtime.lean, "--threads=1", "--memory=1024", "--json"];
    const audit = await command("theorem-audit", [...leanArgs, "GeneratedAudit.lean"]);
    const theorems = parseTheoremAudit(audit, "GeneratedAudit.lean", [...REPLAY_THEOREMS]);
    // The load-bearing statement, pinned: replaying a run under its own
    // produced tape reproduces the run under any oracle configuration.
    const reproduces = theorems.find(t => t.name === "Algal.Replay.steps_replay_reproduces");
    expect(reproduces?.type).toContain("RunAgree");
    // Whole-module audit: every theorem the file defines — including private
    // and generated declarations — stays inside the standard axioms.
    await Bun.write(join(stage, "GeneratedModuleAudit.lean"),
      "import Algal.Replay.Theorems\nimport Algal.Audit\naudit_modules Algal.Replay.Theorems\n");
    const moduleRows = parseModuleAudit(
      await command("module-theorem-audit", [...leanArgs, "GeneratedModuleAudit.lean"]),
      "GeneratedModuleAudit.lean", ["Algal.Replay.Theorems"],
      REPLAY_THEOREMS.map(name => ({ name, module: "Algal.Replay.Theorems" })));
    // The claimed inventory is complete over public theorems; internal
    // equation/match helpers exist too and were axiom-audited by the same run.
    expect(moduleRows.filter(row => !row.internalDetail).map(row => row.name).sort())
      .toEqual([...REPLAY_THEOREMS].sort());
  } finally { await rm(stage, { recursive: true, force: true }); }
}, 300_000);
