import { type PostHogSiteDefinition, POSTHOG_SCHEMA_VERSION } from "@hraness/posthog";

const privatePaths = [{ match: "prefix", path: "/account" }, { match: "prefix", path: "/auth" }] as const;

export const analyticsSite = {
  id: "algal",
  canonicalDomain: "algal.computer",
  allowedHosts: ["algal.computer", "www.algal.computer"],
  schemaVersion: POSTHOG_SCHEMA_VERSION,
  routes: [
    { match: "exact", path: "/", pageKind: "home" },
    { match: "prefix", path: "/docs", pageKind: "docs" },
    { match: "prefix", path: "/compare", pageKind: "compare" },
    { match: "prefix", path: "/blog", pageKind: "article", contentGroup: "blog", captureSlug: true },
  ],
  sensitivePaths: privatePaths,
  excludedPaths: privatePaths,
  customEvents: ["cta clicked", "outbound link opened", "download started", "install command copied"],
} as const satisfies PostHogSiteDefinition;


/** Only bounded semantic names reach analytics; URLs and link text are never event IDs. */
export function analyticsCtaForUrl(url: URL): string {
  if (url.hostname.replace(/^www\./, "") === "github.com") return "github";
  if (["/install", "/download"].includes(url.pathname.replace(/\/$/, "")) || url.hash === "#install") return "install";
  if (url.pathname === "/docs" || url.pathname.startsWith("/docs/")) return "docs";
  if (url.pathname === "/compare" || url.pathname.startsWith("/compare/")) return "compare";
  if (url.pathname === "/connect") return "connect";
  if (url.pathname === "/use-cases" || url.hash === "#use") return "use_cases";
  return "get_started";
}
