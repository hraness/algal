export type EventLoopCode =
  | "EVENT_LOOP_PARSE" | "EVENT_LOOP_CONTRACT" | "EVENT_LOOP_UNKNOWN_KEY"
  | "EVENT_LOOP_ID" | "EVENT_LOOP_DIGEST" | "EVENT_LOOP_BOUNDS"
  | "EVENT_LOOP_SCHEMA" | "EVENT_LOOP_REFERENCE" | "EVENT_LOOP_SEMANTIC";

export class EventLoopContractError extends Error {
  constructor(readonly code: EventLoopCode) { super(code); }
}
