import { expect, test } from "bun:test";
import { DEFAULT_SESSION } from "../examples/local-triage/contract";
import { evaluateView, makeRevision } from "../examples/local-triage/programs";
import { sessionCompatibility } from "../examples/local-triage-web/session";
import { draftAction, triageWidgets } from "./tasks-render";

test("task submission captures a draft and respects the active category schema", () => {
  const session = structuredClone(DEFAULT_SESSION);
  session.draft.title = "Keep <script> as text"; session.draft.category = "work";
  const submitted = draftAction(session, 1, "task-new"); session.draft.title = "Typed while saving";
  expect(submitted).toEqual({ kind: "add", task: { id: "task-new", title: "Keep <script> as text", priority: "normal", category: "inbox", status: "open" } });
  session.draft.taskId = "task-original";
  expect(draftAction(session, 2, "unused")).toEqual({ kind: "edit", taskId: "task-original", title: "Typed while saving", priority: "normal", category: "work" });
});

test("schema migration preserves compatible title focus but requires draft review", () => {
  const first = triageWidgets(evaluateView(makeRevision(), [], DEFAULT_SESSION));
  const second = triageWidgets(evaluateView(makeRevision(undefined, 2), [], DEFAULT_SESSION));
  expect(sessionCompatibility(first, second, "title", true)).toEqual({ retainDraft: true, requiresRebase: true, preserveFocus: true });
  expect(second).toContainEqual({ id: "category", kind: "text", parent: "task-editor" });
  expect(sessionCompatibility(second, first, "category", true)).toEqual({ retainDraft: true, requiresRebase: true, preserveFocus: false });
});
