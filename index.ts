// Algal public surface: contract, compile, run, verify, store, effects.

export { compileSource, SourceError, SOURCE_BOUNDS, SOURCE_PROFILE, SOURCE_VERSION, GENERATE_PROMPT } from "./src/source";
export type { SourceMap, SourcePosition, SourceSpan } from "./src/source";
export { createProgramDiagram, renderMermaid, renderSvg } from "./src/diagram";
export type { ProgramDiagram, DiagramOptions, DiagramNode, DiagramEdge, SvgDiagramOptions } from "./src/diagram";

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
  CompactPolicy,
  Edge,
  OrganismInterface,
  OrganismManifest,
  PortMap,
  PortType,
  RecallRerankPolicy,
  Route,
} from "./src/contract";

export { compileOrganism } from "./src/graph";
export type { CompiledOrganism } from "./src/graph";

export {
  asCapabilityClass,
  capabilityHandle,
  parseCapabilityHandle,
} from "./src/capabilities";
export type { CapabilityHandle } from "./src/capabilities";

export {
  CAPABILITY_CONTRACT,
  FileMailboxService,
  MAILBOX_BOUNDS,
  MAILBOX_CONTRACT,
  MAILBOX_DELIVERY_CONTRACT,
  MAILBOX_MESSAGE_CONTRACT,
  MAILBOX_RECEIVE,
  MAILBOX_RECEIVE_TOOL,
  MAILBOX_SEND,
  MAILBOX_SEND_TOOL,
  MemoryMailboxService,
  externalWakeKey,
  mailboxToolRegistry,
} from "./src/mailbox";
export type { MailboxConfig, MailboxService } from "./src/mailbox";

export {
  RUN_CONTRACT,
  RUNTIME_VERSION,
  parseRunReceipt,
  receiptDigest,
  runOrganism,
} from "./src/run";
export type { CellRecord, RunEvent, RunOptions, RunOutcome, RunReceipt } from "./src/run";

export {
  EFFECT_CONTRACT,
  EFFECT_KINDS,
  MODEL_EFFECT_KINDS,
  bindOutput,
  cachedExecutor,
  checkSchema,
  commandExecutor,
  effectRequestDigest,
  executorSupports,
  replayExecutor,
  scriptedExecutor,
} from "./src/effects";
export type {
  EffectKind,
  EffectReceipt,
  EffectRequest,
  Executor,
  ExecutorCapabilities,
  ExecutorMetadata,
  ExecutorResult,
} from "./src/effects";

export { VERCEL_AI_GATEWAY_BASE_URL, vercelGatewayExecutor } from "./src/gateway";
export type { GatewayExecutorOptions, GatewayFetch } from "./src/gateway";

export {
  DECISION_BOUNDS,
  decisionAnswerSchema,
  decisionExecutor,
  parseDecisionAnswer,
  parseDecisionAnswers,
  parseDecisionQuestion,
  parseDecisionQuestions,
} from "./src/decisions";
export type {
  DecisionAnswer,
  DecisionAsker,
  DecisionExecutorOptions,
  DecisionQuestion,
  DecisionQuestions,
  DecisionResponse,
  DecisionState,
  DecisionUsage,
} from "./src/decisions";

export {
  JEV_CREDENTIAL_ENV,
  JEV_DEFAULT_MODEL,
  TYPESAFE_SYSTEMONE_URL,
  jevAsker,
  jevExecutor,
} from "./src/jev";
export type { JevAskerOptions, JevExecutorOptions } from "./src/jev";

export {
  algalHome,
  checkCredentialShape,
  credentialResolver,
  credentialStatus,
  forgetCredential,
  osBackend,
  providerSpec,
  redact,
  resolveCredential,
  storeCredential,
} from "./src/credentials";
export type {
  CredentialProvider,
  CredentialResolverOptions,
  CredentialSource,
  CredentialStatus,
  VaultBackend,
} from "./src/credentials";

export {
  EMBED_BOUNDS,
  GATEWAY_EMBED_MODEL,
  LOCAL_DIM,
  LOCAL_MODEL,
  VERCEL_GATEWAY_BASE,
  checkEmbedderSpec,
  cosine,
  embedTokens,
  gatewayEmbedder,
  localEmbedder,
  localVector,
  resolveEmbedder,
  tokenOverlap,
} from "./src/embeddings";
export type { Embedder, GatewayEmbedderOptions } from "./src/embeddings";

export {
  RECALL_HIT_TEXT_BYTES,
  SEMANTIC_BOUNDS,
  SEMANTIC_INDEX_FILE,
  bindRecallOutput,
  indexSearcher,
  indexStore,
  recallExecutor,
  recallOutputSchema,
  searchIndex,
  snippet,
} from "./src/semantic";
export type {
  ChunkSource,
  IndexReport,
  RecallSearcher,
  SearchHit,
} from "./src/semantic";

export {
  emptyToolRegistry,
  mergeToolRegistries,
  parseToolSignature,
  TOOL_SIGNATURE_BOUNDS,
} from "./src/tools";
export type {
  Tool,
  ToolContext,
  ToolEffect,
  ToolRegistry,
  ToolSignature,
} from "./src/tools";

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

export { resumeRun, verifyReceipt } from "./src/verify";
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

export { SEARCH_BOUNDS, SEARCH_CONTRACT, runFoundrySearch } from "./src/search";
export type {
  SearchGeneration,
  SearchOptions,
  SearchReport,
} from "./src/search";
export { parseSearchReport, verifySearchReport } from "./src/search-verify";
export type { SearchVerifyReport } from "./src/search-verify";

export {
  axesPareto,
  BENCH_AXIS_NAMES,
  BENCH_BOUNDS,
  BENCH_CONTRACT,
  benchAxisEnv,
  benchPareto,
  runBenchmark,
} from "./src/bench";
export type {
  BenchAttribution,
  BenchAxis,
  BenchCase,
  BenchCaseResult,
  BenchOptions,
  BenchReport,
  BenchSystem,
  BenchSystemResult,
} from "./src/bench";
export { parseBenchAxes, parseBenchReport, verifyBenchReport } from "./src/bench-verify";
export type { BenchVerifyReport } from "./src/bench-verify";

export {
  evalAxis,
  evalProgram,
  checkProgram,
  evalScorer,
  parseExprEnvelope,
  parseExprScorer,
  EXPR_BOUNDS,
  EXPR_DEFAULT_FUEL,
} from "./src/expr";
export type { ExprCheck, ExprEnvelope, ExprErr, ExprResult, ExprScorer } from "./src/expr";

export { digestCanonical, digestText } from "./src/digest";
export type { Digest } from "./src/digest";

export { canonicalize, canonicalBytes } from "./src/values";
export type { JsonObject, JsonValue } from "./src/values";

export { ERROR_CODES, AlgalError, errorReport } from "./src/errors";
export type { ErrorCode } from "./src/errors";

export { ProcessSupervisor, PROCESS_CONTRACT, PROCESS_BOUNDS, parseProcessRecord, type ProcessRecord, type ProcessSnapshot, type ProcessHost } from "./src/process";

export { HostEventService, HOST_EVENT_BOUNDS, HOST_EVENT_CONTRACT, HOST_MESSAGE_CONTRACT, hostEventMessage } from "./src/host-events";
export type { HostEventInput, HostEventRecord, HostEventSnapshot, HostEventPollOptions, HostEventPollResult } from "./src/host-events";
export { ProcessJournal, JOURNAL_BOUNDS } from "./src/process-journal";
export type { RuntimeJournal, JournalBinding, JournalTicket } from "./src/process-journal";
export { GitHubClient, GITHUB_BOUNDS } from "./src/github";
export type { GitHubClientOptions, GitHubEvidence, GitHubRevision, GitHubMergeResult, GitHubTransport, GitHubRequest, GitHubResponse, GitHubRequiredCheck } from "./src/github";
export { githubCliTransport } from "./src/github-cli";

export { PullRequestShepherd, shepherdProgram, shepherdPacket, SHEPHERD_TOOL } from "./src/shepherd";
export type { ShepherdConfig, ShepherdOptions, ShepherdReport } from "./src/shepherd";

export { CODING_JOB_BOUNDS, CODING_JOB_TOOL, CodingJobService, codingJobOperationPayload } from "./src/coding-jobs";
export type { AnyCodingJobIntent, CodingJobAdapter, CodingJobIntent, CodingJobLimits, CodingJobOptions, CodingJobOperationIntent, CodingJobOperationOptions, CodingJobResult, CodingJobSnapshot, CodingJobSource, CodingJobTransport } from "./src/coding-jobs";
export { RepairWorkflow, repairProgram, REPAIR_AWAIT_TOOL, REPAIR_VALIDATE_TOOL, REPAIR_BOUNDS } from "./src/repair";
export type { RepairCheck, RepairConfig, RepairCheckResult, RepairPacket, RepairReport } from "./src/repair";

export { CODING_OPERATION_PROTOCOL, CODING_OPERATION_BOUNDS, codingOperationCommandTransport, parseCodingOperationAdapter, parseCodingOperationBinding, parseCodingOperationOutcome, parseCodingOperationRequest } from "./src/coding-operations";
export type { CodingOperationAdapter, CodingOperationBinding, CodingOperationOutcome, CodingOperationRequest, CodingOperationTransport, CodingOperationWireRequest } from "./src/coding-operations";
