import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderIconSprite, siteIcon, type SiteIconName } from "./icons";

test("every standard icon referenced by static markup is present in the sprite", () => {
  const markup = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const sprite = renderIconSprite();
  const references = [...markup.matchAll(/href="icons\.svg#([a-z-]+)"/g)].map(match => match[1]!);
  expect(references.length).toBeGreaterThan(10);
  for (const name of references) {
    expect(sprite).toContain(`<symbol id="${name}"`);
    expect(siteIcon(name as SiteIconName)).toContain('aria-hidden="true"');
  }
  expect(() => siteIcon("unadmitted" as SiteIconName)).toThrow("Unknown site icon");
  expect(sprite).not.toContain("<script");
  expect(markup).not.toMatch(/[↗↓◌]/u);
});

test("shared appearance and generated evidence remain progressively discoverable", () => {
  const markup = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  expect(markup).toContain('data-hraness-theme="paper"');
  expect(markup).toContain('data-hraness-marketing-preset="editorial"');
  expect(markup.match(/data-hraness-appearance-menu/g)?.length).toBe(1);
  expect(markup.indexOf('src="appearance.js"')).toBeLessThan(markup.indexOf('href="styles.css"'));
  for (const theme of ["light", "dark", "system"]) {
    expect(markup).toContain(`data-theme-value="${theme}"`);
  }
  for (const placeholder of ["REPLY_SOURCE", "ROUTE_PANELS", "INBOX_CHILD_PANELS", "AUTHORING_ERROR", "SOURCE_DIAGNOSTIC"]) {
    expect(markup).toContain(`{{${placeholder}}}`);
  }
  expect(markup).toContain('src="client.js" defer');
  expect(markup).not.toContain("document.querySelectorAll");
});
