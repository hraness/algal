/** `algal.interapp-message.v1` — the verifiable inter-application message
 * record a settled `deliver` dispatch retains. Durable channel outcomes only
 * pin `{identity, message}`; this record additionally binds the sender
 * application, the committing operation, the exact work intent, the declared
 * route, the admitted recipient capability, and the payload body, so a
 * recipient can check authorship claims against the content-addressed store
 * without trusting a transient dispatcher result.
 *
 * The record is minted inside `ApplicationCore.execute` before outbox
 * settlement publication: the mint reads the retained settlement result and the
 * intent's message value back out of CAS rather than trusting the dispatcher
 * return. A later quota or publication failure can leave the record in CAS
 * while the outbox still says started. Payloads too large for the application record bound mint nothing —
 * the channel still carries `{identity, message}` and verification reports
 * the record absent. Reconciliation remints idempotently: the same settled
 * dispatch derives the same record digest.
 *
 * CAS-level verification binds the application, operation, intent, route and
 * body. Only full delivery verification additionally establishes a reachable
 * settled dispatch and its exact admitted recipient; optional channel checking
 * establishes the retained identity/message pair. None of these checks proves
 * external receipt, human intent, or current destination capability authority. */
import {
  applicationId, applicationJson, applicationObject, applicationRef, applicationTag,
  getApplicationRecord, parseWorkIntent, putApplicationRecord,
  type WorkIntent,
} from "./application-contract";
import type { ApplicationDispatch } from "./application";
import { parseCapabilityHandle } from "./capabilities";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import type { Store } from "./store";
import type { JsonValue } from "./values";

export type InterappMessage = {
  contract: "algal.interapp-message.v1";
  /** Sender application — the committed transition's application. */
  application: string;
  /** Operation digest whose committed transition minted the intent. */
  operation: Digest;
  /** The `algal.application-intent.v1` digest this message binds. */
  intent: Digest;
  /** The declared route the delivery plan admitted. */
  route: string;
  /** `cap:mailbox-send:…` recipient handle from the admitted delivery plan. */
  to: string;
  /** The payload value the intent's `message` reference resolves to. */
  body: JsonValue;
};

// A `function` (not an arrow const): TypeScript's control-flow analysis only
// treats declared functions returning `never` as terminating, which the
// guards below rely on to narrow `WorkIntent` and `ApplicationDispatch`.
function fail(message: string): never { throw new AlgalError("RECEIPT_MISMATCH", message); }

export function parseInterappMessage(input: unknown): InterappMessage {
  const v = applicationObject(input, ["contract", "application", "operation", "intent", "route", "to", "body"]);
  applicationTag(v.contract, "algal.interapp-message.v1");
  return {
    contract: "algal.interapp-message.v1",
    application: applicationId(v.application),
    operation: applicationRef(v.operation),
    intent: applicationRef(v.intent),
    route: applicationId(v.route),
    to: parseCapabilityHandle(v.to, "mailbox-send").handle,
    body: applicationJson(v.body),
  };
}

/** The record a settled delivery retains, or `null` for any other dispatch
 * shape. Pure: callers wanting the retained digest go through
 * `mintInterappMessage`. */
export function interappMessageRecord(dispatch: ApplicationDispatch, work: WorkIntent, body: JsonValue): InterappMessage | null {
  if (work.kind !== "deliver" || dispatch.plan.kind !== "delivery" || dispatch.status !== "settled" || dispatch.result === null) return null;
  return {
    contract: "algal.interapp-message.v1",
    application: work.application,
    operation: work.operation,
    intent: dispatch.intent,
    route: work.route,
    to: dispatch.plan.recipient,
    body,
  };
}

/** Mint the message record for a freshly settled delivery. Returns `null`
 * when the dispatch is not a settled delivery or when the bound record would
 * exceed the application record bound (the channel outcome still stands; the
 * verifier simply finds no record). Re-running the mint is idempotent. */
export async function mintInterappMessage(store: Store, dispatch: ApplicationDispatch, work: WorkIntent): Promise<Digest | null> {
  if (work.kind !== "deliver" || dispatch.plan.kind !== "delivery" || dispatch.status !== "settled" || dispatch.result === null) return null;
  if (work.application !== dispatch.application || digestCanonical(applicationJson(work)) !== dispatch.intent) fail("Interapp message intent binding mismatch");
  // Re-derive the settlement binding from CAS: the record claims only what
  // the retained result and the intent's own message reference establish.
  const result = await getApplicationRecord(store, dispatch.result, applicationJson);
  const value = applicationObject(result, ["kind", "message", "idempotencyKey"]);
  applicationTag(value.kind, "delivery");
  if (applicationRef(value.idempotencyKey) !== dispatch.identity || applicationRef(value.message) !== work.message) fail("Delivery settlement changed its identity or message");
  const body = await getApplicationRecord(store, work.message, applicationJson);
  const record = interappMessageRecord(dispatch, work, body);
  if (record === null) return null;
  try {
    applicationJson(record);
  } catch {
    return null;
  }
  return putApplicationRecord(store, record);
}

/** CAS-level verification: parse the record, load the intent it names, and
 * confirm every binding the record asserts — sender, operation, route — plus
 * re-resolve the payload digest to the embedded body. Does not consult the
 * application history or channel; `verifyInterappDelivery` adds those. */
export async function verifyInterappMessage(store: Store, reference: Digest): Promise<InterappMessage> {
  const record = await getApplicationRecord(store, reference, parseInterappMessage);
  const work = await getApplicationRecord(store, record.intent, parseWorkIntent);
  if (work.kind !== "deliver" || work.application !== record.application || work.operation !== record.operation || work.route !== record.route) {
    fail("Interapp message does not bind its intent");
  }
  const body = await getApplicationRecord(store, work.message, applicationJson);
  if (digestCanonical(body) !== digestCanonical(record.body)) fail("Interapp message does not bind its payload");
  return record;
}
