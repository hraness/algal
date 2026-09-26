/**
 * Terminal style for human CLI output: status symbols with ASCII fallbacks,
 * symbol-only color, and the shared audience rule.
 *
 * TODO(df-0.8): use detectAudience and cli-style from @hraness/desktop-foundation
 * once 0.8.0 is released. This file copies the Hraness CLI style contract
 * (audience rule and symbol table) verbatim so the output already matches it.
 */

export type TerminalEnvironment = Readonly<Record<string, string | undefined>>;

export type CliSymbol = "ok" | "fail" | "warn" | "next" | "on" | "off" | "skip" | "progress" | "notice";

const UNICODE: Readonly<Record<CliSymbol, string>> = {
  ok: "✓", fail: "✗", warn: "⚠", next: "→", on: "●", off: "○", skip: "–", progress: "↻", notice: "🔐",
};

const ASCII: Readonly<Record<CliSymbol, string>> = {
  ok: "OK", fail: "FAIL", warn: "WARN", next: "->", on: "*", off: "o", skip: "-", progress: "...", notice: "NOTE",
};

const COLORS: Readonly<Partial<Record<CliSymbol, string>>> = {
  ok: "32", fail: "31", warn: "33", next: "2", on: "32", skip: "2",
};

export type TerminalStyle = { readonly ascii: boolean; readonly color: boolean };

function nonEmpty(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}

/** ASCII fallbacks for `TERM=dumb`, `HRANESS_ASCII=1`, or a locale that does not name UTF-8. */
export function prefersAscii(env: TerminalEnvironment): boolean {
  if (env.TERM === "dumb" || env.HRANESS_ASCII === "1") return true;
  const locale = [env.LC_ALL, env.LC_CTYPE, env.LANG].find(nonEmpty);
  return locale === undefined || !/utf-?8/iu.test(locale);
}

/** Color only on a terminal that is not `dumb` and when `NO_COLOR` is unset or empty; `FORCE_COLOR=1` forces it. */
export function prefersColor(env: TerminalEnvironment, isTTY: boolean): boolean {
  if (env.FORCE_COLOR === "1") return true;
  if (nonEmpty(env.NO_COLOR)) return false;
  return isTTY && env.TERM !== "dumb";
}

export function terminalStyle(env: TerminalEnvironment, isTTY: boolean): TerminalStyle {
  return { ascii: prefersAscii(env), color: prefersColor(env, isTTY) };
}

/** One status symbol. Only the symbol is ever colored, never the sentence. */
export function symbol(name: CliSymbol, style: TerminalStyle): string {
  const glyph = style.ascii ? ASCII[name] : UNICODE[name];
  const color = COLORS[name];
  return style.color && color !== undefined ? `\u001b[${color}m${glyph}\u001b[0m` : glyph;
}

export type Audience = "human" | "agent" | "quiet";

const AGENT_MARKERS = [
  "AI_AGENT",
  "CLAUDECODE",
  "CODEX_SANDBOX",
  "CODEX_SANDBOX_NETWORK_DISABLED",
  "CURSOR_AGENT",
  "GEMINI_CLI",
] as const;

/**
 * Who reads stderr: `HRANESS_AUDIENCE` wins, then exact agent markers, then a
 * terminal on stderr means a person, and anything else stays quiet.
 */
export function detectAudience(env: TerminalEnvironment, stderrIsTTY: boolean): Audience {
  const explicit = env.HRANESS_AUDIENCE;
  if (explicit === "human" || explicit === "agent" || explicit === "quiet") return explicit;
  if (explicit === "off") return "quiet";
  if (AGENT_MARKERS.some((marker) => nonEmpty(env[marker]))) return "agent";
  return stderrIsTTY ? "human" : "quiet";
}

/** A message as one sentence: a leading `usage: ` dropped, capitalized, with a final period. */
export function sentence(message: string): string {
  const trimmed = message.trim().replace(/^usage:\s*/u, "");
  // Capitalize only a plain word: never a path, flag, or identifier.
  const plain = /^[a-z]+[,:]?(?:\s|$)/u.test(trimmed);
  const capitalized = plain ? `${trimmed[0]!.toUpperCase()}${trimmed.slice(1)}` : trimmed;
  return /[.!?]$/u.test(capitalized) ? capitalized : `${capitalized}.`;
}

/** The two-line human error: what happened, then exactly one next command. */
export function renderFailure(text: string, next: string, style: TerminalStyle): string {
  return `${symbol("fail", style)} ${text}\n${symbol("next", style)} ${next}\n`;
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0]!;
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column]!;
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      previous[column] = Math.min(above + 1, previous[column - 1]! + 1, diagonal + cost);
      diagonal = above;
    }
  }
  return previous[right.length]!;
}

/** Closest candidate close enough to be a likely typo, for "Did you mean" hints. */
export function closestMatch(input: string, candidates: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestDistance = Math.max(1, Math.floor(input.length / 3)) + 1;
  for (const candidate of candidates) {
    const distance = editDistance(input, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
