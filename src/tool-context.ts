import type { CompactPolicy } from "./contract";
import { digestCanonical } from "./digest";
import { canonicalBytes, type JsonObject, type JsonValue } from "./values";

/** Project only stale tool result bodies. The source log remains the receipt's
 * authoritative toolCalls, including pure results and external effect output.
 * maxLogBytes is a reduction target, not permission to discard protected data.
 * The caller still applies the exact complete-context bound before dispatch. */
export function elideToolContext(
  context: JsonObject,
  policy: CompactPolicy,
  maxContextBytes: number,
): JsonObject {
  if (!Array.isArray(context.toolLog)) return context;
  const log = context.toolLog;
  if (canonicalBytes(log) <= policy.maxLogBytes && canonicalBytes(context) <= maxContextBytes) return context;
  const projected: JsonValue[] = log.slice();
  const view: JsonObject = { ...context, toolLog: projected };
  const end = Math.max(0, log.length - (policy.keepRecent ?? 0));
  for (let i = 0; i < end; i++) {
    if (canonicalBytes(projected) <= policy.maxLogBytes && canonicalBytes(view) <= maxContextBytes) break;
    const entry = log[i] as JsonObject;
    const output = entry.output!;
    if (output !== null && typeof output === "object" && !Array.isArray(output) && output.contract === "algal.tool-output-ref.v1") continue;
    const bytes = canonicalBytes(output);
    const stub: JsonObject = { contract: "algal.tool-output-ref.v1", source: digestCanonical(output), bytes };
    if (canonicalBytes(stub) >= bytes) continue;
    projected[i] = { ...entry, output: stub };
  }
  return view;
}
