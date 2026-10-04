import {
  CONTEXT_HISTORY_BOUNDS as B, contextHistoryDigest, parseContextHistoryAccess,
  parseContextHistoryGrant, parseContextHistoryNode, parseContextHistoryRef, parseContextHistoryView,
  validateContextHistoryAccess, validateContextHistoryDelegation, validateContextHistoryView,
} from "./context-history-contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { boundedJsonSnapshot } from "./json-snapshot";
import { asJsonValue, asObject, noUnknownKeys } from "./values";

export function contextHistorySelection(grantInput: unknown, accessInput: unknown, requestInput: unknown): Digest {
  return digestCanonical({ schema: "algal.context-history-selection.v1",
    grant: contextHistoryDigest(parseContextHistoryGrant(grantInput)),
    access: contextHistoryDigest(parseContextHistoryAccess(accessInput)),
    request: asDigest(requestInput, "retained history request") });
}

export function validateContextHistoryViewAccess(
  historyInput: unknown, generationInput: unknown, viewInput: unknown,
  nodesInput: unknown, summariesInput: unknown, authorizationInput: unknown, cursorInput?: unknown,
): void {
  const authority = asObject(boundedJsonSnapshot(authorizationInput, {
    maxBytes: B.maxGrantBytes * 2 + B.maxRefBytes + 256, maxDepth: B.maxJsonDepth,
    maxNodes: B.maxJsonNodes, maxEntries: B.maxTreeNodes, maxStringBytes: 1024,
    sortObjectKeys: true,
  }, "history view authorization"), "history view authorization");
  noUnknownKeys(authority, ["reference", "grant", "access", "request"], "history view authorization");
  const reference = parseContextHistoryRef(authority.reference), grant = parseContextHistoryGrant(authority.grant);
  const access = parseContextHistoryAccess(authority.access), request = asDigest(authority.request, "retained history request");
  const view = parseContextHistoryView(viewInput);
  validateContextHistoryDelegation(grant, { ...grant, limits: view.limits });
  if (view.binding.selection !== contextHistorySelection(grant, access, request))
    throw new AlgalError("CAPABILITY_DENIED", "history view does not match current source selection and retained request");
  const nodes = boundedJsonSnapshot(nodesInput, {
    maxBytes: B.maxNodeBytes * B.maxTreeNodes + 2048, maxDepth: B.maxJsonDepth,
    maxNodes: B.maxJsonNodes, maxEntries: B.maxTreeNodes, maxStringBytes: 1024,
    sortObjectKeys: true,
  }, "history source nodes");
  if (!Array.isArray(nodes)) throw new AlgalError("PARSE_FAILED", "history source nodes must be an array");
  const pool = new Map(nodes.map(value => {
    const node = parseContextHistoryNode(value);
    return [contextHistoryDigest(node), node] as const;
  }));
  if (view.items.length === 0) validateContextHistoryAccess(historyInput, reference, grant, access);
  for (const item of view.items) {
    const node = pool.get(item.node);
    if (!node) throw new AlgalError("PARSE_FAILED", "history view source node is unavailable");
    validateContextHistoryAccess(historyInput, reference, grant, access, node);
  }
  validateContextHistoryView(historyInput, generationInput, view, asJsonValue(nodes, "history nodes"), summariesInput, cursorInput);
}
