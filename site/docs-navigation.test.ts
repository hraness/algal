import { expect, test } from "bun:test";
import { docsNavigation } from "./docs-navigation";

test("mobile and desktop navigation preserve the same current-page links", () => {
  const links = '<a href="/docs/">Documentation</a><ul><li><a href="/docs/browser-tasks/" aria-current="page">Browser tasks</a></li></ul>';
  const html = docsNavigation("Documentation", "Browser tasks", links);
  const navs = [...html.matchAll(/<nav[^>]*>(.*?)<\/nav>/g)].map(match => match[1]);
  expect(navs).toEqual([links, links]);
  expect(html).toContain('<details class="docs-disclosure"><summary>');
  expect(html).not.toMatch(/<details[^>]*\sopen(?:\s|>)/);
  expect(html).toContain('<span class="docs-current">Browser tasks</span>');
  expect(html).not.toMatch(/aria-expanded|onclick|tabindex/);
});

test("navigation labels and current titles cannot inject markup", () => {
  const html = docsNavigation('Docs " & <nav>', '<script>"example"</script>', "<ul></ul>");
  expect(html).toContain('aria-label="Docs &quot; &amp; &lt;nav&gt;"');
  expect(html).toContain('&lt;script&gt;&quot;example&quot;&lt;/script&gt;');
  expect(html).not.toContain("<script>");
});
