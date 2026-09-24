import type { Action, Capture, Session, View } from "../examples/local-triage/contract";
import type { WidgetIdentity } from "../examples/local-triage-web/session";

export function triageWidgets(view: View): WidgetIdentity[] {
  return [...view.form.fields.map(field => ({ id: field.name, kind: field.options.length ? "select" : "text", parent: view.form.id })), { id: "query", kind: "text", parent: "task-filter" }];
}

/** Read the submitted draft once so later typing cannot change an in-flight action. */
export function draftAction(session: Session, schema: 1 | 2, newId: string): Action {
  const draft = session.draft;
  const fields = { title: draft.title, priority: draft.priority, category: schema === 1 ? "inbox" : draft.category };
  return draft.taskId === null ? { kind: "add", task: { id: newId, ...fields, status: "open" } } : { kind: "edit", taskId: draft.taskId, ...fields };
}

export function workflowSummary(config: Capture["definition"]["config"], schema: 1 | 2): string {
  return `Order: ${config.sort}. Group: ${config.group}. Reopening completed tasks: ${config.allowReopen ? "allowed" : "disabled"}. Task fields: v${schema}${schema === 2 ? " with categories" : ""}.`;
}

const labels: Record<string, string> = {
  "schema-forward-only": "Task fields do not revert to an older version",
  "configuration-changes": "The workflow differs from the current version",
  "facts-and-task-capacity-preserved": "Task count stays within the limit",
  "filter-all-preserves-exact-facts": "All tasks keep their data",
  "filter-open-preserves-exact-facts": "The Open filter keeps the correct tasks",
  "filter-done-preserves-exact-facts": "The Done filter keeps the correct tasks",
};
export function checkLabel(name: string): string { return labels[name] ?? name; }

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderTaskGroups(root: HTMLElement, view: View, options: { blocked?: boolean; onAction?: (action: "edit" | "complete" | "reopen", taskId: string) => void } = {}): void {
  const fragment = document.createDocumentFragment();
  for (const group of view.groups) {
    const heading = element("h3", group.label); heading.className = "tasks-group-heading"; fragment.append(heading);
    for (const row of group.tasks) {
      const item = element("article"); item.className = "tasks-row"; item.dataset.taskId = row.task.id; item.dataset.status = row.task.status;
      const copy = element("div"); copy.className = "tasks-row-copy";
      copy.append(element("h3", row.task.title), element("p", `${row.task.priority} · ${row.task.status}${view.form.fields.some(field => field.name === "category") ? ` · ${row.task.category}` : ""}`));
      item.append(copy);
      if (options.onAction) {
        const actions = element("div"); actions.className = "tasks-row-actions";
        for (const action of row.actions) {
          const button = element("button", action.label); button.type = "button"; button.className = "living-text-button";
          button.dataset.action = action.kind; button.dataset.taskId = row.task.id;
          button.dataset.enabled = String(action.enabled);
          button.disabled = !!options.blocked || !action.enabled;
          button.setAttribute("aria-label", `${action.label}: ${row.task.title}`);
          if (action.reason) button.title = action.reason;
          button.addEventListener("click", () => options.onAction?.(action.kind, row.task.id));
          actions.append(button);
        }
        item.append(actions);
      }
      fragment.append(item);
    }
  }
  if (!view.groups.some(group => group.tasks.length)) { const empty = element("p", "No tasks in this view."); empty.className = "tasks-empty"; fragment.append(empty); }
  root.replaceChildren(fragment);
}

/** Preserve compatible controls and avoid resetting selection on ordinary typing. */
export function renderEditor(root: HTMLElement, view: View): void {
  const wanted = new Set(view.form.fields.map(field => field.name));
  for (const child of Array.from(root.children)) {
    if (child instanceof HTMLElement && !wanted.has(child.dataset.field as View["form"]["fields"][number]["name"])) child.remove();
  }
  view.form.fields.forEach((field, index) => {
    const tag = field.options.length ? "select" : "input";
    let wrapper = Array.from(root.children).find(child => child instanceof HTMLElement && child.dataset.field === field.name) as HTMLLabelElement | undefined;
    let control = wrapper?.querySelector<HTMLInputElement | HTMLSelectElement>("input,select");
    if (!wrapper || !control || control.localName !== tag) {
      wrapper?.remove(); wrapper = element("label"); wrapper.dataset.field = field.name;
      const label = element("span"); label.dataset.fieldLabel = "true";
      control = tag === "select" ? element("select") : element("input");
      control.id = `tasks-${field.name}`; control.name = field.name; wrapper.htmlFor = control.id;
      if (control instanceof HTMLInputElement) { control.type = "text"; control.autocomplete = "off"; }
      wrapper.append(label, control);
    }
    wrapper.querySelector<HTMLElement>("[data-field-label]")!.textContent = field.label;
    if (control instanceof HTMLInputElement) { control.maxLength = field.maxLength; control.required = true; }
    else {
      const existing = Array.from(control.options).map(option => option.value);
      if (existing.join("\0") !== field.options.join("\0")) {
        control.replaceChildren(...field.options.map(value => { const option = element("option", value.charAt(0).toUpperCase() + value.slice(1)); option.value = value; return option; }));
      }
    }
    if (control.value !== field.value) {
      const selection = control instanceof HTMLInputElement && document.activeElement === control ? [control.selectionStart, control.selectionEnd, control.selectionDirection] as const : null;
      control.value = field.value;
      if (selection && control instanceof HTMLInputElement && selection[0] !== null && selection[1] !== null) control.setSelectionRange(Math.min(selection[0], field.value.length), Math.min(selection[1], field.value.length), selection[2] ?? undefined);
    }
    if (root.children[index] !== wrapper) root.insertBefore(wrapper, root.children[index] ?? null);
  });
}
