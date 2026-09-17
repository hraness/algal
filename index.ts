// Morphogen public surface: contract, compile, run, verify, store, effects.

export {
  BOUNDS,
  CONTRACT,
  DEFAULT_BUDGETS,
  manifestToJson,
  parseOrganismManifest,
} from "./src/contract";
export type {
  AgentOutput,
  AgentView,
  Budgets,
  Cell,
  Edge,
  OrganismInterface,
  OrganismManifest,
  PortMap,
  PortType,
  Route,
} from "./src/contract";

export { compileOrganism } from "./src/graph";
export type { CompiledOrganism } from "./src/graph";

export {
  RUN_CONTRACT,
  RUNTIME_VERSION,
  parseRunReceipt,
  receiptDigest,
  runOrganism,
} from "./src/run";
export type { CellRecord, RunEvent, RunOptions, RunReceipt } from "./src/run";

export {
  EFFECT_CONTRACT,
  bindOutput,
  cachedExecutor,
  checkSchema,
  commandExecutor,
  effectRequestDigest,
  replayExecutor,
  scriptedExecutor,
} from "./src/effects";
export type { EffectReceipt, EffectRequest, Executor } from "./src/effects";

export { builtinRegistry } from "./src/registry";
export type { Fn, FnRegistry, FnSignature } from "./src/registry";

export { FileStore, MemoryStore } from "./src/store";
export type { Store } from "./src/store";

export {
  BUNDLE_CONTRACT,
  packOrganism,
  parseBundle,
  unpackBundle,
} from "./src/bundle";
export type { Bundle } from "./src/bundle";

export {
  fileTransport,
  httpTransport,
  parseTransportsFile,
} from "./src/transport";
export type { Transport } from "./src/transport";

export { verifyReceipt } from "./src/verify";
export type { VerifyReport } from "./src/verify";

export {
  FOUNDRY_BOUNDS,
  FOUNDRY_CONTRACT,
  generateFoundryCandidates,
  runFoundry,
  selectFoundryCandidate,
} from "./src/foundry";
export type {
  FoundryCandidateResult,
  FoundryCase,
  FoundryCaseResult,
  FoundryLineage,
  FoundryOptions,
  FoundryReport,
  GenerateCandidatesOptions,
  GeneratedCandidates,
} from "./src/foundry";
export { parseFoundryReport, verifyFoundryReport } from "./src/foundry-verify";
export type { FoundryVerifyReport } from "./src/foundry-verify";

export { digestCanonical, digestText } from "./src/digest";
export type { Digest } from "./src/digest";

export { canonicalize, canonicalBytes } from "./src/values";
export type { JsonObject, JsonValue } from "./src/values";

export { ERROR_CODES, MorphogenError, errorReport } from "./src/errors";
export type { ErrorCode } from "./src/errors";
