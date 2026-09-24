/** Filesystem channel verification; pure inter-application records are portable. */
import { applicationJson, getApplicationRecord, parseWorkIntent } from "./application-contract";
import type { ApplicationService } from "./application";
import { readApplicationChannel } from "./application-host";
import { interappMessageRecord, verifyInterappMessage, type InterappMessage } from "./application-message-contract";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
export * from "./application-message-contract";
function fail(message: string): never { throw new AlgalError("RECEIPT_MISMATCH", message); }

/** Full delivery verification: the CAS bindings above, plus the retained
 * dispatch for the cited intent must be the settled delivery the record
 * describes (same recipient, same settled result), inside the application's
 * validated history. When `channelsDir` is supplied the durable channel must
 * also retain the outcome `{identity, message}` the record implies. This is
 * local route-channel evidence, not destination mailbox or external receipt. */
export async function verifyInterappDelivery(
  service: ApplicationService,
  reference: Digest,
  options: { channelsDir?: string } = {},
): Promise<InterappMessage> {
  const record = await verifyInterappMessage(service.store, reference);
  const work = await getApplicationRecord(service.store, record.intent, parseWorkIntent);
  if (work.kind !== "deliver") fail("Interapp message does not bind its intent");
  const history = await service.history(record.application);
  const source = history.find(s => s.transition.intents.includes(record.intent));
  if (!source) fail("Interapp message intent is not in application history");
  const dispatch = await service.readDispatch(record.application, record.intent, work, source);
  if (dispatch === null || dispatch.status !== "settled") fail("Interapp message delivery did not settle");
  if (dispatch.plan.kind !== "delivery" || dispatch.plan.recipient !== record.to) fail("Interapp message recipient mismatch");
  // The minted record is itself content-addressed: recomputing it from the
  // retained dispatch proves no field was relabelled after settlement.
  const body = await getApplicationRecord(service.store, work.message, applicationJson);
  const expected = interappMessageRecord(dispatch, work, body);
  if (expected === null || digestCanonical(applicationJson(expected)) !== reference) fail("Interapp message record does not reproduce");
  if (options.channelsDir !== undefined) {
    const outcomes = await readApplicationChannel(options.channelsDir, record.route);
    if (!outcomes.some(outcome => outcome.identity === dispatch.identity && outcome.message === work.message)) {
      fail("Interapp message lacks its channel outcome");
    }
  }
  return record;
}
