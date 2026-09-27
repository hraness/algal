// ALGAL keeps the Hraness CLI style contract inline (zero runtime
// dependencies). This test pins that copy to @hraness/desktop-foundation 0.8,
// a devDependency, so any drift from the shared rule fails the check.
import { expect, test } from "bun:test";
import { AGENT_MARKERS as SDK_MARKERS, detectAudience as sdkAudience } from "@hraness/desktop-foundation/audience";
import { CLI_SYMBOLS, cliStyle, cliSymbol, renderCliError, type CliSymbol } from "@hraness/desktop-foundation/cli-style";
import { AGENT_MARKERS, detectAudience, explicitAudience, renderFailure, symbol, terminalStyle, type TerminalEnvironment } from "./cli-style";

const SYMBOLS = Object.keys(CLI_SYMBOLS) as CliSymbol[];

const AUDIENCE_VALUES = [undefined, "", "human", "agent", "quiet", "off", "AGENT", " Human ", "Off", "\tquiet\n", "robot", "humans"];
const MARKER_VALUES: TerminalEnvironment[] = [
  {}, { CLAUDECODE: "1" }, { CODEX_SANDBOX: "seatbelt" }, { AI_AGENT: "" }, { CODEX_HOME: "/x" }, { CURSOR_AGENT: "1", GEMINI_CLI: "1" },
];

const STYLE_ENVS: TerminalEnvironment[] = [
  {}, { LANG: "C" }, { LANG: "en_US.UTF-8" }, { LC_ALL: "en_US.utf8" }, { LC_CTYPE: "C.UTF-8", LANG: "C" },
  { LANG: "en_US.UTF-8", TERM: "dumb" }, { LANG: "en_US.UTF-8", HRANESS_ASCII: "1" }, { LANG: "en_US.UTF-8", HRANESS_ASCII: "0" },
  { LANG: "en_US.UTF-8", NO_COLOR: "1" }, { LANG: "en_US.UTF-8", NO_COLOR: "" }, { LANG: "en_US.UTF-8", FORCE_COLOR: "1" },
  { LANG: "en_US.UTF-8", FORCE_COLOR: "0" }, { LANG: "en_US.UTF-8", FORCE_COLOR: "false" }, { LANG: "en_US.UTF-8", FORCE_COLOR: "true" },
  { LANG: "en_US.UTF-8", FORCE_COLOR: "1", NO_COLOR: "1" }, { LANG: "en_US.UTF-8", FORCE_COLOR: "1", TERM: "dumb" },
];

test("the agent markers are the SDK's list", () => {
  expect([...AGENT_MARKERS]).toEqual([...SDK_MARKERS]);
});

test("the audience rule matches detectAudience for every override, marker and terminal", () => {
  for (const value of AUDIENCE_VALUES) {
    for (const markers of MARKER_VALUES) {
      for (const tty of [true, false]) {
        const env: TerminalEnvironment = { ...markers, ...(value === undefined ? {} : { HRANESS_AUDIENCE: value }) };
        const context = JSON.stringify({ env, tty });
        expect(`${context} ${detectAudience(env, tty)}`).toBe(`${context} ${sdkAudience({ env: env as NodeJS.ProcessEnv, stderrIsTTY: tty })}`);
      }
    }
  }
  expect(explicitAudience({ HRANESS_AUDIENCE: " AGENT " })).toBe("agent");
  expect(explicitAudience({ HRANESS_AUDIENCE: "robot" })).toBeUndefined();
});

test("style, symbols and the two-line error match cli-style", () => {
  for (const env of STYLE_ENVS) {
    for (const tty of [true, false]) {
      const context = JSON.stringify({ env, tty });
      const ours = terminalStyle(env, tty);
      const sdk = cliStyle({ isTTY: tty }, env as NodeJS.ProcessEnv);
      expect(`${context} ${JSON.stringify(ours)}`).toBe(`${context} ${JSON.stringify({ ascii: sdk.ascii, color: sdk.color })}`);
      for (const name of SYMBOLS) expect(`${context} ${name} ${symbol(name, ours)}`).toBe(`${context} ${name} ${cliSymbol(name, sdk)}`);
      expect(renderFailure("Can't find x.json.", "algal run --help", ours)).toBe(renderCliError({ message: "Can't find x.json.", next: "algal run --help" }, sdk));
    }
  }
});
