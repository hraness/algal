import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

test("vercel.json sends baseline security headers on every path", () => {
  const config = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const all = config.headers.find((entry) => entry.source === "/(.*)");
  const byKey = new Map((all?.headers ?? []).map((header) => [header.key, header.value]));
  expect(byKey.get("X-Content-Type-Options")).toBe("nosniff");
  expect(byKey.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  expect(byKey.get("Permissions-Policy")).toContain("camera=()");
  expect(byKey.get("Strict-Transport-Security")).toContain("max-age=");
  const csp = byKey.get("Content-Security-Policy") ?? "";
  for (const directive of ["base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'"]) {
    expect(csp).toContain(directive);
  }
});

test("security.txt points at the advisory channel and carries a future expiry", () => {
  const text = readFileSync(join(ROOT, "site/.well-known/security.txt"), "utf8");
  expect(text).toContain("Contact: https://github.com/hraness/algal/security/advisories/new");
  const expires = /^Expires: (.+)$/m.exec(text)?.[1];
  expect(expires).toBeDefined();
  expect(Date.parse(expires ?? "")).toBeGreaterThan(Date.now());
});

test("Dependabot covers Actions, Bun, and Cargo", () => {
  const text = readFileSync(join(ROOT, ".github/dependabot.yml"), "utf8");
  for (const ecosystem of ["github-actions", "bun", "cargo"]) expect(text).toContain(`package-ecosystem: ${ecosystem}`);
});
