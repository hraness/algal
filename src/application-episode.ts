/** Domain episode execution — the `start-episode` dispatch leg shared by the
 * coding harness and the parity driver. The admitted episode binding carries
 * the captured application state: the bound manifest runs under the
 * entrypoint's declared capabilities, its run receipt embeds in an
 * `algal.episode-outcome.v1` record, and the dispatch settles with
 * `{kind: "episode", binding, process}`. Settlement is not a task claim —
 * the run outcome lives in the evidence, so a failed episode still settles
 * (its receipt records the failure). Mirrors
 * `crates/algal/src/application_episode.rs`. */
import { getApplicationRecord, parseApplicationRevision, putApplicationRecord, type ApplicationRevision } from "./application-contract";
import type { ApplicationDispatchContext, ApplicationDispatchOutcome } from "./application";
import type { Executor } from "./effects";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import type { Store } from "./store";
import { asObject, type JsonValue } from "./values";

export type EpisodeExecutors = (entry: ApplicationRevision["entrypoints"][number]) => Executor[] | Promise<Executor[]>;

export async function dispatchApplicationEpisode(
  context: ApplicationDispatchContext,
  runtime: { store: Store; executors?: EpisodeExecutors },
): Promise<ApplicationDispatchOutcome> {
  const plan = context.dispatch.plan;
  if (plan.kind !== "episode") throw new Error("expected episode plan");
  const binding = plan.binding;
  const manifest = await runtime.store.getManifest(binding.manifest);
  if (!manifest) throw new Error("Episode manifest missing from the store");
  // The entrypoint's declared capabilities select the executors the domain
  // host supplies; an empty declaration runs with none.
  const revision = await getApplicationRecord(runtime.store, binding.revision, parseApplicationRevision);
  const entry = revision.entrypoints.find(e => e.name === binding.entrypoint);
  const executors = entry && runtime.executors ? await runtime.executors(entry) : [];
  const args = asObject(await runtime.store.getValue(binding.arguments), "episode arguments");
  const receipt = await runOrganism({
    manifest, fns: builtinRegistry(), store: runtime.store, executors,
    args: args as Record<string, Record<string, JsonValue>>, processName: binding.process,
  });
  const bindingRef = await putApplicationRecord(runtime.store, binding);
  await putApplicationRecord(runtime.store, { contract: "algal.episode-outcome.v1", binding: bindingRef, receipt });
  return { status: "settled", result: { kind: "episode", binding: bindingRef, process: binding.process } };
}
