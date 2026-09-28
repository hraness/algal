import { expect, test } from "bun:test";
import { highlightAlgal, highlightJson } from "./highlight";
import { renderMarkdown } from "./markdown";

test("algal keywords, strings, comments, and numbers get spans", () => {
  const html = highlightAlgal(`program reply(email: text) -> text {
  budget { max_agent_calls: 2 }
  // pick one
  let task = match intent.value {
    help => "Draft a helpful reply.",
  }
  return generate task using email
}`);
  expect(html).toContain('<span class="code-keyword">program</span>');
  expect(html).toContain('<span class="code-keyword">text</span>');
  expect(html).toContain('<span class="code-keyword">match</span>');
  expect(html).toContain('<span class="code-keyword">return</span>');
  expect(html).toContain('<span class="code-keyword">generate</span>');
  expect(html).toContain('<span class="code-string">&quot;Draft a helpful reply.&quot;</span>');
  expect(html).toContain('<span class="code-comment">// pick one</span>');
  expect(html).toContain('<span class="code-number">2</span>');
  expect(html).toContain('intent');
  expect(html).not.toContain('<span class="code-keyword">reply</span>');
});

test("algal highlights record declarations and field-type words", () => {
  const html = highlightAlgal(`closed record Task { title: text min 2 max 40, tries: integer min 0 }`);
  expect(html).toContain('<span class="code-keyword">closed</span>');
  expect(html).toContain('<span class="code-keyword">record</span>');
  expect(html).toContain('<span class="code-name">Task</span>');
  expect(html).toContain('<span class="code-keyword">integer</span>');
  expect(html).toContain('<span class="code-keyword">min</span>');
});

test("algal block comments and fragments never throw", () => {
  expect(highlightAlgal(`/* half a comment`)).toContain("code-comment");
  expect(highlightAlgal(`let x = "unterminated`)).toContain("code-string");
  expect(highlightAlgal(`let task =`)).toContain("code-keyword");
});

test("highlighting escapes markup inside tokens and plain text", () => {
  const html = highlightAlgal(`let a = "<b>" & x < y`);
  expect(html).not.toContain("<b>");
  expect(html).toContain("&lt;b&gt;");
  expect(html).toContain("&amp;");
});

test("json highlights keys, values, numbers, and literals", () => {
  const html = highlightJson(`{"kind": "algal.organism.v1", "budget": {"cells": 8}, "ok": true, "err": null}`);
  expect(html).toContain('<span class="code-name">&quot;kind&quot;</span>');
  expect(html).toContain('<span class="code-string">&quot;algal.organism.v1&quot;</span>');
  expect(html).toContain('<span class="code-number">8</span>');
  expect(html).toContain('<span class="code-keyword">true</span>');
  expect(html).toContain('<span class="code-keyword">null</span>');
});

test("markdown fences use the algal grammar for algal and the kit for the rest", () => {
  const doc = renderMarkdown("```algal\nlet x = 1\n```\n\n```sh\nalgal verify r.json  # replay\n```\n\n```text\na < b\n```");
  expect(doc.html).toContain('class="syntax-code language-algal"');
  expect(doc.html).toContain('<span class="code-keyword">let</span>');
  expect(doc.html).toContain('class="syntax-code language-shell"');
  expect(doc.html).toContain('syntax-token--command');
  expect(doc.html).toContain('class="syntax-code language-text"');
  expect(doc.html).toContain("a &lt; b");
});

test("markdown infers a language for untagged fences conservatively", () => {
  const doc = renderMarkdown("```\nbun run build\n```\n\n```\nplain prose diagram a → b\n```");
  expect(doc.html).toContain('class="syntax-code language-shell"');
  expect(doc.html).toContain('class="syntax-code language-text"');
});
