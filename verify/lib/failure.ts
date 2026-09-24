import type { CommandFailure } from "./runner";

/** Diagnostic writes must not replace the failure that caused them. Try every
 * independently selected writer; preserve the original as cause if any fail. */
export async function retainFailure(primary: unknown, writers: readonly (() => Promise<unknown>)[]): Promise<never> {
  const secondary: unknown[] = [];
  for (const write of writers) {
    try { await write(); } catch (error) { secondary.push(error); }
  }
  if (secondary.length > 0) throw new AggregateError([primary, ...secondary], `${primary instanceof Error ? primary.message : String(primary)}; diagnostic retention also failed`, { cause: primary });
  throw primary;
}

/** Undefined means the supervisor never supplied that observation. Encode it as
 * explicit null so strict metadata serialization cannot obscure the failure. */
export function commandFailureRecord(error: CommandFailure) {
  return { message: error.message, observation: { ...error.observation,
    completion: error.observation.completion ?? null,
    drained: error.observation.drained ?? null,
    supervisorExit: error.observation.supervisorExit ?? null,
  } };
}
