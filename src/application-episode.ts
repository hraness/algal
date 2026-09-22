/** Durable domain episode execution — the `start-episode` dispatch leg shared by the
 * coding harness and the parity driver. The admitted episode binding carries
 * the captured application state: the bound manifest runs under the
 * entrypoint's declared capabilities, its run receipt embeds in an
 * `algal.episode-outcome.v1` record, and the dispatch settles with
 * `{kind: "episode", binding, process, outcome}`. Settlement is not a task claim —
 * the run outcome and process state live in the evidence, so a failed episode still settles
 * (its receipt records the failure). Mirrors
 * `crates/algal/src/application_episode.rs`. */
import { getApplicationRecord, parseApplicationRevision, putApplicationRecord, type ApplicationRevision } from "./application-contract";
import type { ApplicationDispatchContext, ApplicationDispatchOutcome } from "./application";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";
import { compileOrganism, type CompiledOrganism } from "./graph";
import { ProcessSupervisor, type ProcessSnapshot } from "./process";
import { builtinRegistry } from "./registry";
import { parseRunReceipt } from "./run";
import { FileStore, type Store } from "./store";
import { asObject, canonicalize } from "./values";

export type EpisodeExecutors = (entry: ApplicationRevision["entrypoints"][number]) => Executor[] | Promise<Executor[]>;

function journalSafe(program: CompiledOrganism): boolean {
  return !program.manifest.cells.some(cell => cell.kind === "slot" || cell.kind === "spawn") &&
    [...program.children.values()].every(journalSafe);
}

async function episode(
  context: ApplicationDispatchContext,
  runtime: { store: Store; executors?: EpisodeExecutors },
  reconciliation: boolean,
): Promise<ApplicationDispatchOutcome> {
  if (!(runtime.store instanceof FileStore)) throw new Error("Durable episodes require the application's FileStore custody");
  const plan = context.dispatch.plan;
  if (plan.kind !== "episode") throw new Error("expected episode plan");
  const binding = plan.binding;
  const manifest = await runtime.store.getManifest(binding.manifest);
  if (!manifest) throw new Error("Episode manifest missing from the store");
  // The entrypoint's declared capabilities select the executors the domain
  // host supplies; an empty declaration runs with none.
  const revision = await getApplicationRecord(runtime.store, binding.revision, parseApplicationRevision);
  const entry = revision.entrypoints.find(e => e.name === binding.entrypoint);
  if (!entry || entry.manifest !== binding.manifest || entry.maxGenerations !== binding.maxGenerations) throw new Error("Episode entrypoint binding changed");
  const executors = entry && runtime.executors ? await runtime.executors(entry) : [];
  const args = asObject(await runtime.store.getValue(binding.arguments), "episode arguments");
  const tools = new Map(), fns = builtinRegistry();
  const journal = journalSafe(await compileOrganism(manifest, fns, runtime.store, 0, undefined, tools));
  const processes = new ProcessSupervisor(runtime.store.dir, { fns, tools, executors, journal });
  const bindingRef = await putApplicationRecord(runtime.store, binding);
  let state: ProcessSnapshot;
  try { state = await processes.inspect(binding.process); }
  catch (error) {
    if (!(error instanceof AlgalError) || error.code !== "STORE_MISS") throw error;
    try { state = await processes.create(binding.process, manifest, args, binding.maxGenerations); }
    catch (creationError) {
      // An acknowledged head may have won a concurrent create or survived a
      // lost acknowledgement. Only its exact immutable binding may be reused.
      try { state = await processes.inspect(binding.process); } catch { throw creationError; }
    }
  }
  if (state.process.name !== binding.process || state.process.manifestDigest !== binding.manifest ||
      state.process.maxGenerations !== binding.maxGenerations || canonicalize(state.process.args) !== canonicalize(args)) throw new Error("Existing process does not match the episode binding");
  if (state.process.status === "ready") state = (await processes.tick(binding.process))!;
  else if (state.process.status === "uncertain") {
    if (!reconciliation || !journal) return { status: "blocked", reason: "Uncertain process requires explicit journal-safe or adapter reconciliation" };
    try { state = await processes.recover(binding.process, state.digest); }
    catch { return { status: "blocked", reason: "Process journal could not establish safe recovery; adapter reconciliation required" }; }
  } else if (state.process.status === "suspended" && reconciliation) {
    state = await processes.tick(binding.process, true) ?? state;
  }
  if (state.process.status === "suspended") return { status: "blocked", reason: state.process.generation >= state.process.maxGenerations ? "Episode process generation budget exhausted" : "Episode process is suspended awaiting an admitted wake" };
  if (!["complete", "failed", "stuck"].includes(state.process.status) || !state.process.receipt) return { status: "blocked", reason: "Episode process has no terminal receipt" };
  const receipt = parseRunReceipt(await processes.store.getReceipt(state.process.receipt));
  if (receipt.manifestDigest !== binding.manifest || canonicalize(receipt.args) !== canonicalize(args)) throw new Error("Episode process receipt binding changed");
  const outcome = await putApplicationRecord(runtime.store, { contract: "algal.episode-outcome.v1", binding: bindingRef, processState: state.digest, receipt });
  return { status: "settled", result: { kind: "episode", binding: bindingRef, process: binding.process, outcome } };
}

export function dispatchApplicationEpisode(context: ApplicationDispatchContext, runtime: { store: Store; executors?: EpisodeExecutors }): Promise<ApplicationDispatchOutcome> {
  return episode(context, runtime, false);
}

/** Explicit reconciliation reuses durable process state; unknown writes stay blocked. */
export function reconcileApplicationEpisode(context: ApplicationDispatchContext, runtime: { store: Store; executors?: EpisodeExecutors }): Promise<ApplicationDispatchOutcome> {
  return episode(context, runtime, true);
}
