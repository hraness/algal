// Algal public surface: contract, compile, run, verify, store, effects.
export { ApplicationCore } from "./src/application-core";
export { MemoryApplicationStorage } from "./src/application-storage";
export type { ApplicationStorage } from "./src/application-storage";

export { compileSource, sourceImports, SourceError, SOURCE_BOUNDS, SOURCE_PROJECT_BOUNDS, SOURCE_PROFILE, SOURCE_VERSION, GENERATE_PROMPT } from "./src/source";
export type { SourceAnnotation, SourceCallOrigin, SourceCompilation, SourceCompilerOptions, SourceErrorContext, SourceErrorImport, SourceImport, SourceMap, SourcePosition, SourceProjectIndex, SourceSpan } from "./src/source";
export { createSourceErrorReport, renderSourceError, SOURCE_ERROR_BOUNDS } from "./src/source-errors";
export type { SourceErrorExcerptLine, SourceErrorReport } from "./src/source-errors";
export { loadSourceProject } from "./src/source-project";
export type { SourceProject, SourceProjectOptions } from "./src/source-project";
export { diagnoseSource, renderSourceDiagnostics, SOURCE_DIAGNOSTIC_BOUNDS } from "./src/source-diagnostics";
export type { SourceDiagnostics, SourceDiagnosticIssue, SourceDiagnosticLocation, SourceDiagnosticCaller } from "./src/source-diagnostics";
export { createSourceTrace, resolveSourcePath, SOURCE_TRACE_BOUNDS } from "./src/source-trace";
export type { SourceTraceContext, SourcePathResult, SourceTraceLocation, SourceTraceFrame } from "./src/source-trace";
export { classifySourceDependencyCells, createSourceDependencyReport, renderSourceDependencies, SOURCE_DEPENDENCY_BOUNDS, SOURCE_DEPENDENCY_CELL_KINDS, SOURCE_DEPENDENCY_CONTRACT } from "./src/source-dependencies";
export type { SourceDependencyBundle, SourceDependencyCaller, SourceDependencyEffect, SourceDependencyInterface, SourceDependencyModule, SourceDependencyOccurrence, SourceDependencyOptions, SourceDependencyOrigin, SourceDependencyReport, SourceDependencyUnit } from "./src/source-dependencies";
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
export { lookupGatewayGenerationCost } from "./src/gateway-accounting";
export { parseGatewayGeneration, parseGatewayReportedCost } from "./src/gateway-observation";
export type { GatewayGeneration, GatewayReportedCost } from "./src/gateway-observation";
export { openAICompatibleExecutor } from "./src/openai-compatible";
export type { OpenAICompatibleExecutorOptions, ChatCompletionsFetch, ChatCompletionsFormat } from "./src/openai-compatible";

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

export { PROCESS_EVIDENCE_CONTRACT, PROCESS_EVIDENCE_BOUNDS, parseProcessEvidence, exportProcessEvidence, verifyProcessEvidence } from "./src/process-evidence";
export type { ProcessEvidence, ProcessEvidenceReport } from "./src/process-evidence";

// Programmable-application records, lifecycle, and captured evidence.
export {
  ApplicationService,
  applicationProcessName,
  parseApplicationCommand,
} from "./src/application";
export type {
  ApplicationAdmission,
  ApplicationCommand,
  ApplicationDispatcher,
  ApplicationDispatch,
  ApplicationDispatchAttempt,
  ApplicationDispatchContext,
  ApplicationDispatchOutcome,
  ApplicationDispatchResult,
  ApplicationLineageRow,
  ApplicationOptions,
  ApplicationSnapshot,
} from "./src/application";
export {
  applicationJson,
  getApplicationRecord,
  parseApplicationHead,
  parseApplicationRevision,
  parseApplicationState,
  parseApplicationTransition,
  parseEpisodeBinding,
  parseWorkIntent,
  putApplicationRecord,
} from "./src/application-contract";
export type {
  ApplicationHead,
  ApplicationRevision,
  ApplicationState,
  ApplicationTransition,
  EpisodeBinding,
  WorkIntent,
} from "./src/application-contract";
export {
  ApplicationMemoryService,
  validateMemoryForRevision,
  parseMemoryFrontier,
  parseMemoryDerivation,
  parseMemoryHypothesis,
  parseMemoryNativeProgram,
  parseMemoryObservation,
  parseMemoryProcedure,
  parseMemoryQuery,
  parseMemoryQueries,
  parseMemoryResourceVersion,
  parseMemorySchema,
  parseMemoryScope,
  parseMemorySnapshot,
  parseMemoryArchive,
  APPLICATION_MEMORY_ARCHIVE_LIMIT,
} from "./src/application-memory";
export type {
  MemoryAdmissionHost,
  MemoryClaim,
  MemoryDerivation,
  MemoryEngineResult,
  MemoryFrontier,
  MemoryHypothesis,
  MemoryObservation,
  MemoryObservationInput,
  MemoryProcedure,
  MemoryQuery,
  MemoryQueryEngine,
  MemoryQueries,
  MemoryResourceVersion,
  MemorySchema,
  MemoryScope,
  MemorySnapshot,
  MemorySnapshotInput,
  MemoryArchive,
  MemoryArchiveEntry,
  MemoryRolloverInput,
  MemoryRollover,
} from "./src/application-memory";
export { createApplicationDomainDispatcher, createApplicationPolicyHost, parseApplicationHostPolicy } from "./src/application-host";
export type { ApplicationHostPolicy } from "./src/application-host";
export { dispatchApplicationEpisode, reconcileApplicationEpisode } from "./src/application-episode";
export type { EpisodeExecutors } from "./src/application-episode";
export {
  parseApplicationGoal,
  parseApplicationGoalCapture,
  validateApplicationGoals,
  bindApplicationGoalCaptures,
  captureApplicationGoals,
  evaluateApplicationGoals,
} from "./src/application-goal";
export type { ApplicationGoal, ApplicationGoalCapture } from "./src/application-goal";
export { APPLICATION_QUOTA_LIMITS } from "./src/application-quota";
export { NativeMemoryQueryEngine } from "./src/application-native-memory";
export { appendObservation } from "./src/application-observation";
export type { AppendObservationInput, AppendedObservation } from "./src/application-observation";
export { rolloverApplicationMemory } from "./src/application-rollover";
export type { RolloverApplicationMemoryInput, RolledApplicationMemory } from "./src/application-rollover";
export { migrateApplicationMemory, parseApplicationMigration } from "./src/application-migration";
export type { ApplicationMigration, MigrateMemoryInput } from "./src/application-migration";
export { APPLICATION_DRAIN_LIMITS, checkApplicationDrainBinding, checkApplicationDrainCoverage, parseApplicationDrain, produceApplicationDrain, verifyApplicationDrain } from "./src/application-drain";
export type { ApplicationDrain, ApplicationDrainDisposition, ApplicationDrainStatus } from "./src/application-drain";
export { parseInvestigationRequest, requestExecution, scheduleInvestigations } from "./src/application-investigation";
export type {
  EntrypointDerivation, InvestigationRequest, RequestExecutionInput,
  ScheduledInvestigations, ScheduleInvestigationsInput,
} from "./src/application-investigation";
export {
  admitApplicationActivation,
  checkApplicationCompatibility,
  evaluateApplicationRevision,
  loadRevision,
  parseApplicationEvaluationRequest,
  parseEvaluationCases,
  parseEvaluationPolicy,
  parseEvaluationScorer,
  pureManifest,
  verifyApplicationEvaluation,
} from "./src/application-adaptation";
export {
  APPLICATION_VIEW_WIDGETS,
  loadApplicationRuntimeProfile,
  loadApplicationViewSpec,
  parseApplicationRuntimeProfile,
  parseApplicationView,
  parseApplicationViewSpec,
  projectApplicationView,
  collectApplicationViewEvidence,
  parseApplicationViewEvidence,
} from "./src/application-view";
export type {
  ApplicationRuntimeProfile,
  ApplicationView,
  ApplicationViewAction,
  ApplicationViewSpec,
  ApplicationViewWidget,
  ApplicationViewEvidence,
} from "./src/application-view";
export type {
  AdaptationRuntime,
  ApplicationEvaluation,
  ApplicationEvaluationRequest,
  CompatibilityResult,
  EvaluationCaseSet,
  EvaluationPolicy,
  EvaluationScorer,
} from "./src/application-adaptation";

export { restoreApplicationRevision, parseApplicationRestoration, parseApplicationRestorationPolicy, verifyApplicationRestoration } from "./src/application-restoration";
export type { ApplicationRestoration, ApplicationRestorationPolicy, RestoreApplicationRevisionInput, RestoredApplicationRevision } from "./src/application-restoration";
export { COMPARISON_LIMITS, checkComparisonBinding, comparisonDigest, parseApplicationComparison, produceApplicationComparison, verifyApplicationComparison } from "./src/application-comparison";
export type { ApplicationComparison, ApplicationComparisonResult, ComparisonVerdict, ProduceComparisonInput } from "./src/application-comparison";
export { PROPOSAL_LIMITS, parseApplicationProposal, parseProposalRequest, produceApplicationProposal, proposeApplicationRevision, verifyApplicationProposal, verifyApplicationProposalBinding } from "./src/application-proposal";
export type { ApplicationProposal, ApplicationProposalCandidate, ApplicationProposalRequest, ApplicationProposalStatus, ProposeApplicationRevisionInput, ProposedApplicationRevision } from "./src/application-proposal";
export { SELECTION_LIMITS, parseApplicationSelectionPolicy, parseApplicationSelectionRecord, produceApplicationSelection, selectApplicationStrategy, verifyApplicationSelection, verifyApplicationSelectionPolicy } from "./src/application-selection";
export type { ApplicationSelection, ApplicationSelectionPolicy, ApplicationSelectionRecord, ApplicationSelectionRow } from "./src/application-selection";
export { EXPERIMENT_LIMITS, checkExperimentBinding, experimentDigest, parseApplicationExperiment, produceApplicationExperiment, verifyApplicationExperiment } from "./src/application-experiment";
export type { ApplicationExperiment, ApplicationExperimentResult, ProduceExperimentInput } from "./src/application-experiment";
export {
  interappMessageRecord, mintInterappMessage, parseInterappMessage,
  verifyInterappDelivery, verifyInterappMessage,
} from "./src/application-message";
export type { InterappMessage } from "./src/application-message";
export {
  CONTENTION_LIMITS, parseApplicationContention,
  produceApplicationContention, verifyApplicationContention,
} from "./src/application-contention";
export type {
  ApplicationContention, ContentionAttempt, ContentionStatus,
  ProduceContentionInput, ProducedContention,
} from "./src/application-contention";

export {
  admitApplicationResearchEvaluation, verifyApplicationResearchEvaluation, admitApplicationResearchActivation,
  parseApplicationResearchPolicy, parseApplicationResearchCorpus, parseApplicationResearchRequest,
  parseApplicationResearchReport, parseApplicationResearchEvaluation,
} from "./src/application-research";
export type {
  ApplicationResearchPolicy, ApplicationResearchCorpus, ApplicationResearchRequest, ApplicationResearchAttempt,
  ApplicationResearchReport, ApplicationResearchVerdict, ApplicationResearchEvaluation,
  ApplicationResearchVerifier, ApplicationResearchVerifierContext,
} from "./src/application-research";
