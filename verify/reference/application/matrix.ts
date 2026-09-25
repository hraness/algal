import type { History } from "./schema";

export const MATRIX = Object.freeze([
  { profile: "delivery", seed: 1 }, { profile: "delivery", seed: 4294967295 },
  { profile: "writer", seed: 1 }, { profile: "writer", seed: 4294967295 },
] as const satisfies readonly { profile: History["profile"]; seed: number }[]);
export const RELATION = "Finite staged generated application histories and independent per-prefix public-API observations; partial Phase06 slice, no source refinement or process-crash claim";
export const CASE_FILES = ["generate.command.json", "generated.json", "history.json", "bun.command.json", "bun.json", "native-a.command.json", "native-a.json", "native-b.command.json", "native-b.json", "result.json"] as const;
export const ATTEMPT_FILES = ["history.json", "native.command.json", "native.json"] as const;
