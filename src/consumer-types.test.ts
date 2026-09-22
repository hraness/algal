import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("public TypeScript imports support consumers with unused-symbol checks", async () => {
  const root = resolve(import.meta.dir, "..");
  const process = Bun.spawn(["bun", resolve(root, "node_modules/typescript/bin/tsc"), "--noEmit", "--noUnusedLocals", "--noUnusedParameters", "--strict", "--exactOptionalPropertyTypes", "--noUncheckedIndexedAccess", "--lib", "ES2022", "--skipLibCheck", "--allowImportingTsExtensions", "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "bundler", "--types", "bun", resolve(root, "index.ts")], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(process.stdout).text(), new Response(process.stderr).text(), process.exited]);
  expect({ code, stdout, stderr }).toEqual({ code: 0, stdout: "", stderr: "" });
}, 30_000);
