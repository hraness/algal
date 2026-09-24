/** Widget identity is semantic, not merely a DOM key. Drafts survive every
 * replacement; incompatible controls lose focus and require explicit rebase. */
export type WidgetIdentity = { id: string; kind: string; parent: string };
export function sessionCompatibility(before: WidgetIdentity[], after: WidgetIdentity[], focusedField: string | null, headChanged: boolean) {
  const previous = before.find(field => field.id === focusedField), next = after.find(field => field.id === focusedField);
  const preserveFocus = focusedField === null || !!(previous && next && previous.id === next.id && previous.kind === next.kind && previous.parent === next.parent);
  return { retainDraft: true, requiresRebase: headChanged || !preserveFocus, preserveFocus };
}
