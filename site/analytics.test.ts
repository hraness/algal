import { ctaClickedProperties } from "@hraness/posthog/event";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { classifyAnalyticsRoute } from "@hraness/posthog";
import { checkPostHogContract } from "@hraness/posthog/testing";
import { analyticsSite, analyticsCtaForUrl } from "./analytics-site";

test("real SDK preserves the portfolio analytics contract", () => {
  expect(checkPostHogContract({ site: analyticsSite, sensitivePath: "/account", customEvents: [{ event: "cta clicked", properties: { cta: "quickstart", placement: "nav" } }, { event: "outbound link opened", properties: { target_host: "github.com", placement: "nav" } }, { event: "download started", properties: { platform: "web", artifact: "benchmark", placement: "inline" } }] }).violations).toEqual([]);
});
test("routes retain public paths and reject preview hosts", () => {
  expect(classifyAnalyticsRoute(analyticsSite, "https://algal.computer/docs/")?.page_kind).toBe("docs");
  expect(classifyAnalyticsRoute(analyticsSite, "https://algal.computer/blog/example")?.content_slug).toBe("example");
  expect(classifyAnalyticsRoute(analyticsSite, "https://algal-preview.vercel.app/")).toBeNull();
});
test("shared head includes analytics on every page, marking the 404", () => {
  const chrome = readFileSync(new URL("./chrome.ts", import.meta.url), "utf8");
  expect(chrome).toContain('src="/analytics.js"');
  expect(chrome).toContain('data-analytics-not-found="true"');
});

test("CTA identifiers describe known destinations and satisfy the bounded event schema", () => {
  for (const [path, expected] of [["https://github.com/hraness/repo", "github"], ["/install", "install"], ["/docs/guide", "docs"], ["/compare/tool", "compare"], ["/#use", "use_cases"], ["/", "get_started"]]) {
    const cta = analyticsCtaForUrl(new URL(path!, `https://${analyticsSite.canonicalDomain}`));
    expect(cta).toBe(expected!);
    expect(ctaClickedProperties({ cta, placement: "nav" })).not.toBeNull();
  }
});
