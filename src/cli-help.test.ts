import { expect, test } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { DESCRIPTION, commandHelp, commandWords } from "./cli-help";
import { closestMatch, detectAudience, prefersAscii, prefersColor, renderFailure, sentence, symbol, terminalStyle } from "./cli-style";
import { SITE_DESCRIPTION } from "../site/copy";
import packageJson from "../package.json" with { type: "json" };

const root = resolve(import.meta.dir, "..");
const GOLDEN = join(import.meta.dir, "cli-golden");
const UPDATE = process.env.ALGAL_UPDATE_GOLDEN === "1";

const BASE_ENV: Record<string, string> = {
  PATH: process.env.PATH ?? "",
  HOME: process.env.HOME ?? "",
  LANG: "en_US.UTF-8",
  // A fixed telemetry and support posture keeps output deterministic.
  HRANESS_TELEMETRY: "off",
  HRANESS_SUPPORT: "off",
};

async function cli(args: readonly string[], env: Record<string, string> = {}) {
  const child = Bun.spawn([process.execPath, "cli.ts", ...args], {
    cwd: root, stdout: "pipe", stderr: "pipe", env: { ...BASE_ENV, ...env },
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  return { stdout, stderr, code };
}

async function golden(name: string, actual: string): Promise<void> {
  const path = join(GOLDEN, name);
  if (UPDATE) {
    await mkdir(GOLDEN, { recursive: true });
    await writeFile(path, actual);
  }
  expect(actual).toBe(await readFile(path, "utf8"));
}

const lines = (text: string) => text.replace(/\n$/u, "").split("\n");
const HUMAN = { HRANESS_AUDIENCE: "human" };

test("bare algal is a start screen: at most 25 lines, 80 columns, version last", async () => {
  const result = await cli([]);
  expect(result.code).toBe(0);
  expect(result.stderr).toBe("");
  expect(lines(result.stdout).length).toBeLessThanOrEqual(25);
  expect(lines(result.stdout).every((line) => line.length <= 80)).toBe(true);
  expect(lines(result.stdout).at(-1)).toBe(`algal ${packageJson.version}`);
  await golden("bare.txt", result.stdout.replace(`algal ${packageJson.version}\n`, "algal <version>\n"));
});

test("the first lines carry the registry description", () => {
  expect(DESCRIPTION).toBe(SITE_DESCRIPTION);
});

test("--help, -h, and help print the same grouped help within 60 lines", async () => {
  const first = await cli(["--help"]);
  expect(first.code).toBe(0);
  expect(lines(first.stdout).length).toBeLessThanOrEqual(60);
  expect(lines(first.stdout).every((line) => line.length <= 80)).toBe(true);
  expect((await cli(["-h"])).stdout).toBe(first.stdout);
  expect((await cli(["help"])).stdout).toBe(first.stdout);
  await golden("help.txt", first.stdout);
});

test("help advanced and help all", async () => {
  const advanced = await cli(["help", "advanced"]);
  expect(advanced.code).toBe(0);
  expect(advanced.stdout).toContain("foundry <config.json>");
  expect((await cli(["--help"])).stdout).not.toContain("foundry");
  await golden("help-advanced.txt", advanced.stdout);
  const all = await cli(["help", "all"]);
  expect(all.code).toBe(0);
  expect(all.stdout).toContain("algal foundry schedule-verify");
});

test("root help leads with the first commands a person runs and avoids jargon", async () => {
  const help = (await cli(["--help"])).stdout;
  const start = help.indexOf("Start here");
  expect(start).toBeGreaterThan(0);
  expect(help.slice(start)).toMatch(/^Start here\n {2}examples/u);
  for (const word of ["admit", "admission", "organism", "habitat", "custody", "foundry", "civ"]) {
    expect(`${help}${(await cli([])).stdout}`.toLowerCase()).not.toContain(word);
  }
});

test("every command word answers <command> --help with exit 0", async () => {
  const words = commandWords().filter((word) => word !== "help" && word !== "version");
  const results = await Promise.all(words.map(async (word) => ({ word, ...(await cli([word, "--help"])) })));
  for (const { word, code, stderr, stdout } of results) {
    expect({ word, code, stderr }).toEqual({ word, code: 0, stderr: "" });
    expect(stdout).toStartWith("Usage:\n  algal ");
  }
}, 180_000);

test("<command> -h and help <command> match <command> --help", async () => {
  for (const word of ["run", "process", "store"]) {
    const [long, short, topic] = await Promise.all([cli([word, "--help"]), cli([word, "-h"]), cli(["help", word])]);
    expect(short.stdout).toBe(long.stdout);
    expect(topic.stdout).toBe(long.stdout);
  }
}, 60_000);

test("--help after arguments narrows to the action", async () => {
  const result = await cli(["process", "create", "demo", "x.json", "--help"]);
  expect(result.code).toBe(0);
  expect(result.stdout).toContain("algal process create <name>");
  expect(result.stdout).not.toContain("algal process journal");
});

test("--version prints the bin name and version; --json keeps the object", async () => {
  for (const flag of ["--version", "-V", "version"]) {
    expect(await cli([flag])).toEqual({ stdout: `algal ${packageJson.version}\n`, stderr: "", code: 0 });
  }
  expect(JSON.parse((await cli(["--version", "--json"])).stdout)).toEqual({
    name: "algal", version: packageJson.version, contract: "algal.organism.v1",
  });
});

test("a person sees two-line errors; scripts keep the JSON line", async () => {
  const human = await cli(["run"], HUMAN);
  expect(human.code).toBe(2);
  expect(human.stdout).toBe("");
  expect(human.stderr).toBe("✗ Missing or invalid arguments. Usage: algal run <manifest.json> [options]\n→ algal run --help\n");
  const piped = await cli(["run"]);
  expect(piped.code).toBe(2);
  expect(JSON.parse(piped.stderr)).toEqual({ error: "PARSE_FAILED", message: "usage: algal run <manifest.json> [options]" });
  const json = await cli(["run", "--json"], HUMAN);
  expect(JSON.parse(json.stderr).error).toBe("PARSE_FAILED");
  const agent = await cli(["run"], { CLAUDECODE: "1" });
  expect(JSON.parse(agent.stderr).error).toBe("PARSE_FAILED");
});

test("a missing file says so plainly", async () => {
  const result = await cli(["run", "no-such-file.json"], HUMAN);
  expect(result.code).toBe(2);
  expect(lines(result.stderr)).toEqual([`✗ Can't find ${join(root, "no-such-file.json")}.`, "→ algal run --help"]);
});

test("HRANESS_DEBUG adds the error code", async () => {
  const result = await cli(["run"], { ...HUMAN, HRANESS_DEBUG: "1" });
  expect(lines(result.stderr).at(-1)).toBe("  code: PARSE_FAILED");
});

test("unknown commands suggest the closest command", async () => {
  const result = await cli(["serch"], HUMAN);
  expect(result).toEqual({ code: 2, stdout: "", stderr: '✗ Unknown command "serch". Did you mean "search"?\n→ algal --help\n' });
  const unsafe = await cli(["\u001b[31mx"], HUMAN);
  expect(unsafe.stderr).toBe("✗ Unknown command.\n→ algal --help\n");
});

test("TERM=dumb and NO_COLOR", async () => {
  const dumb = await cli(["serch"], { ...HUMAN, TERM: "dumb" });
  expect(dumb.stderr).toBe('FAIL Unknown command "serch". Did you mean "search"?\n-> algal --help\n');
  const noColor = await cli(["serch"], { ...HUMAN, NO_COLOR: "1" });
  expect(noColor.stderr).not.toContain("\u001b[");
});

test("doctor prints sentences for a person and the object for scripts", async () => {
  const human = await cli(["doctor"], HUMAN);
  expect(human.code).toBe(0);
  expect(lines(human.stdout)[0]).toMatch(/^✓ ALGAL \d+\.\d+\.\d+ is ready \(Bun reference runtime on .+\)\.$/u);
  expect(human.stderr).toBe("Next: algal examples\n");
  const piped = await cli(["doctor"]);
  expect(JSON.parse(piped.stdout)).toMatchObject({ runtime: "algal", native: false, wireContract: "algal.organism.v1" });
  const json = await cli(["doctor", "--json"], HUMAN);
  expect(JSON.parse(json.stdout)).toMatchObject({ runtime: "algal" });
});

test("help pages cut from the reference keep each synopsis with its lines", () => {
  const reference = "usage:\n  algal a <x>\n      --flag   does a thing\n  algal b\n  algal a sub <y>\n";
  expect(commandHelp(reference, ["a"])).toStartWith("Usage:\n  algal a <x>\n      --flag   does a thing\n  algal a sub <y>\n");
  expect(commandHelp(reference, ["a", "sub"])).toStartWith("Usage:\n  algal a sub <y>\n\n");
  expect(commandHelp(reference, ["zzz"])).toBeUndefined();
});

test("style helpers follow the shared contract", () => {
  expect(prefersAscii({ LANG: "C" })).toBe(true);
  expect(prefersAscii({ LANG: "en_US.UTF-8", HRANESS_ASCII: "1" })).toBe(true);
  expect(prefersColor({ NO_COLOR: "1" }, true)).toBe(false);
  expect(prefersColor({ FORCE_COLOR: "1" }, false)).toBe(true);
  const ascii = terminalStyle({ TERM: "dumb" }, false);
  expect(["ok", "fail", "warn", "next", "skip"].map((name) => symbol(name as never, ascii)).join(" ")).toBe("OK FAIL WARN -> -");
  expect(renderFailure("Nope.", "algal --help", terminalStyle({ LANG: "en_US.UTF-8" }, false))).toBe("✗ Nope.\n→ algal --help\n");
  expect(sentence("usage: bad thing")).toBe("Bad thing.");
  expect(sentence("x.json: not found")).toBe("x.json: not found.");
  expect(detectAudience({ CODEX_HOME: "/x" }, true)).toBe("human");
  expect(detectAudience({ CODEX_SANDBOX: "seatbelt" }, true)).toBe("agent");
  expect(detectAudience({}, false)).toBe("quiet");
  expect(closestMatch("verfy", commandWords())).toBe("verify");
});
