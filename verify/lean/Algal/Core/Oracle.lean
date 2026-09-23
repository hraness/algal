import Algal.Core.Json

/-!
External outcomes are selected by a fixed ordered tape of occurrence + request
bindings. A digest alone does not identify a non-cacheable invocation. These
are replay identities, not truth, provider attestation or exactly-once effects.
-/
namespace Algal.Core.Oracle
open Json

structure Occurrence where
  path : List String
  ordinal : Nat
  deriving DecidableEq

structure Request where
  executor : String
  kind : String
  input : Value
  deriving DecidableEq

inductive ErrorCode where
  | badInput | exhausted | executorFailure | suspended | replayMismatch
  deriving DecidableEq

inductive Reply where
  | success (value : Value)
  | failure (code : ErrorCode)
  | suspended (wakeHandles : List String)
  deriving DecidableEq

structure Record where
  occurrence : Occurrence
  request : Request
  reply : Reply
  deriving DecidableEq

abbrev Tape := List Record

def consume (tape : Tape) (occurrence : Occurrence) (request : Request) :
    Except ErrorCode (Reply × Tape) :=
  match tape with
  | [] => .error .replayMismatch
  | record :: rest =>
    if record.occurrence = occurrence ∧ record.request = request then .ok (record.reply, rest)
    else .error .replayMismatch

theorem successful_replay_binds_head (tape rest : Tape) (occurrence : Occurrence)
    (request : Request) (reply : Reply)
    (h : consume tape occurrence request = .ok (reply, rest)) :
    tape = { occurrence, request, reply } :: rest := by
  cases tape with
  | nil => simp [consume] at h
  | cons record tail =>
    simp only [consume] at h
    split at h
    next hb =>
      cases record
      simp_all
    · contradiction

theorem successful_replay_consumes_exactly_one (tape rest : Tape) (occurrence : Occurrence)
    (request : Request) (reply : Reply)
    (h : consume tape occurrence request = .ok (reply, rest)) : tape.length = rest.length + 1 := by
  rw [successful_replay_binds_head tape rest occurrence request reply h]
  rfl

theorem changed_occurrence_rejected (record : Record) (rest : Tape) (occurrence : Occurrence)
    (h : record.occurrence ≠ occurrence) :
    consume (record :: rest) occurrence record.request = .error .replayMismatch := by
  simp [consume, h]

theorem changed_request_rejected (record : Record) (rest : Tape) (request : Request)
    (h : record.request ≠ request) :
    consume (record :: rest) record.occurrence request = .error .replayMismatch := by
  simp [consume, h]

theorem replay_deterministic (tape : Tape) (occurrence : Occurrence) (request : Request)
    (a b : Reply × Tape)
    (ha : consume tape occurrence request = .ok a)
    (hb : consume tape occurrence request = .ok b) : a = b := by
  exact Except.ok.inj (ha.symm.trans hb)

def exampleRequest : Request := ⟨"executor.v1", "tool", .text "same request"⟩
def firstOccurrence : Occurrence := ⟨["root", "a"], 0⟩
def secondOccurrence : Occurrence := ⟨["root", "a"], 1⟩
def firstRecord : Record := ⟨firstOccurrence, exampleRequest, .success (.text "first")⟩
def secondRecord : Record := ⟨secondOccurrence, exampleRequest, .failure .executorFailure⟩

theorem successful_replay_witness :
    consume [firstRecord, secondRecord] firstOccurrence exampleRequest =
      .ok (.success (.text "first"), [secondRecord]) := by
  simp [consume, firstRecord]

theorem same_request_different_occurrence_is_not_replay :
    consume [firstRecord, secondRecord] secondOccurrence exampleRequest = .error .replayMismatch := by
  simp [consume, firstRecord, firstOccurrence, secondOccurrence]

theorem external_failure_is_replayable :
    consume [secondRecord] secondOccurrence exampleRequest = .ok (.failure .executorFailure, []) := by
  simp [consume, secondRecord]

theorem reordered_tape_rejected :
    consume [secondRecord, firstRecord] firstOccurrence exampleRequest = .error .replayMismatch := by
  simp [consume, secondRecord, firstOccurrence, secondOccurrence]

end Algal.Core.Oracle
