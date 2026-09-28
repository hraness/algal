import { expect, test } from "bun:test";
import { highlightAlgal, highlightCode } from "./highlight";
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
  expect(highlightCode(`let <x>`, "unknown-lang")).toBe("let &lt;x&gt;");
});

test("json highlights keys, values, numbers, and literals", () => {
  const html = highlightCode(`{"kind": "algal.organism.v1", "budget": {"cells": 8}, "ok": true, "err": null}`, "json");
  expect(html).toContain('<span class="code-name">&quot;kind&quot;</span>');
  expect(html).toContain('<span class="code-string">&quot;algal.organism.v1&quot;</span>');
  expect(html).toContain('<span class="code-number">8</span>');
  expect(html).toContain('<span class="code-keyword">true</span>');
  expect(html).toContain('<span class="code-keyword">null</span>');
});

test("sh highlights commands, flags, comments, and strings", () => {
  const html = highlightCode(`algal verify receipt.json --source main.algal  # replay offline\nexport TOKEN="a # not a comment"`, "sh");
  expect(html).toContain('<span class="code-keyword">algal</span>');
  expect(html).toContain('<span class="code-name">--source</span>');
  expect(html).toContain('<span class="code-comment"># replay offline</span>');
  expect(html).toContain('<span class="code-name">TOKEN</span>=');
  expect(html).toContain('<span class="code-string">&quot;a # not a comment&quot;</span>');
  expect(html).not.toContain('<span class="code-comment"># not a comment</span>');
  // `in` inside `main` and `algal` after the dot are not keywords.
  expect(html).toContain("main.algal");
});

test("sh keeps words whole inside paths and arguments", () => {
  const html = highlightCode(`bun cli.ts diagram examples/source/reply.algal --out reply.svg`, "sh");
  expect(html).toContain('<span class="code-keyword">bun</span>');
  expect(html).toContain("cli.ts");
  expect(html).toContain("reply.algal");
  expect(html).toContain('<span class="code-name">--out</span>');
});

test("ts highlights keywords, strings, and comments", () => {
  const html = highlightCode(`const run = async () => { // go\n  return "ok"; };`, "ts");
  expect(html).toContain('<span class="code-keyword">const</span>');
  expect(html).toContain('<span class="code-keyword">async</span>');
  expect(html).toContain('<span class="code-comment">// go</span>');
  expect(html).toContain('<span class="code-string">&quot;ok&quot;</span>');
});

test("markdown fenced blocks highlight known languages and escape the rest", () => {
  const doc = renderMarkdown("```algal\nlet x = 1\n```\n\n```text\na < b\n```");
  expect(doc.html).toContain('<span class="code-keyword">let</span>');
  expect(doc.html).toContain('<span class="code-lang">algal</span>');
  expect(doc.html).toContain("a &lt; b");
});
