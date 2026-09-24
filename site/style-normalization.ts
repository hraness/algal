/** Canonicalize the duplicated shared pattern reset before offline asset hashing.
 * Bun 1.3.14 can retain or merge this rule when bundling Lantern and the marketing
 * preset. Keep the first copy only after proving the later copy cannot change
 * the cascade. This is deliberately not a general CSS optimizer. */
const PATTERNS = ["cells", "weave", "contour", "mesh"] as const;
const SELECTORS = ["-webkit-any", "-moz-any", "is"].map(name =>
  `:${name}(${PATTERNS.map(pattern => `[data-hraness-pattern=${pattern}]`).join(",")})`);
const RESET = "--hraness-material-wall-images:initial;--hraness-pattern-decoration:initial";
const PROPERTY = /--hraness-(?:material-wall-images|pattern-decoration)\s*:/;
const LAYER = "@layer components.hraness-design-kit.legacy";
const MAX_CSS_BYTES = 2_097_152;
const MAX_RULES = 20_000;

interface Rule {
  readonly start: number;
  readonly end: number;
  readonly selector: string;
  readonly body: string;
  readonly ancestry: readonly string[];
}

function requireCondition(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`Site pattern reset: ${message}`);
}

/** Locate structural delimiters without interpreting braces in strings, URLs,
 * attribute selectors or comments as rule boundaries. */
function delimiter(css: string, start: number, end: number): number {
  let quote = "", round = 0, square = 0;
  for (let i = start; i < end; i++) {
    const c = css[i]!;
    if (c === "\\") { i++; continue; }
    if (quote) { if (c === quote) quote = ""; continue; }
    if (c === "\"" || c === "'") { quote = c; continue; }
    if (c === "/" && css[i + 1] === "*") {
      const close = css.indexOf("*/", i + 2);
      requireCondition(close >= 0 && close < end, "unterminated comment");
      i = close + 1; continue;
    }
    if (c === "(") round++;
    else if (c === ")") { round--; requireCondition(round >= 0, "unbalanced parentheses"); }
    else if (c === "[") square++;
    else if (c === "]") { square--; requireCondition(square >= 0, "unbalanced brackets"); }
    else if (!round && !square && (c === "{" || c === "}" || c === ";")) return i;
  }
  requireCondition(!quote && !round && !square, "unterminated CSS token");
  return end;
}

const clean = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, "").trim();

function writesReset(body: string): boolean {
  // Escapes and comments cannot hide an intervening custom-property assignment.
  // A match inside a string is conservatively treated as a possible write.
  const decoded = clean(body).replace(/\\([0-9a-fA-F]{1,6})\s?|\\([^\n\r\f])/g,
    (_match, hex: string | undefined, character: string | undefined) => {
      if (hex === undefined) return character!;
      const point = Number.parseInt(hex, 16);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "\ufffd";
    });
  return PROPERTY.test(decoded);
}

function rules(css: string): Rule[] {
  const result: Rule[] = [];
  function visit(start: number, end: number, ancestry: readonly string[], depth: number): void {
    requireCondition(depth <= 32, "nesting exceeds 32");
    let cursor = start;
    while (cursor < end) {
      const at = delimiter(css, cursor, end);
      if (at === end) { requireCondition(clean(css.slice(cursor, end)) === "", "trailing rule text"); break; }
      if (css[at] === ";") { cursor = at + 1; continue; }
      requireCondition(css[at] === "{", "unexpected closing brace");
      const selector = clean(css.slice(cursor, at));
      let after = at + 1, braces = 1;
      while (after < end && braces) {
        const token = delimiter(css, after, end);
        requireCondition(token < end, "unclosed rule");
        if (css[token] === "{") braces++;
        if (css[token] === "}") braces--;
        after = token + 1;
      }
      requireCondition(braces === 0 && selector !== "", "invalid rule");
      if (selector.startsWith("@") && !/^@(?:font-face|property)\b/.test(selector)) {
        visit(at + 1, after - 1, [...ancestry, selector], depth + 1);
      } else {
        requireCondition(result.length < MAX_RULES, "rule count exceeds 20000");
        result.push({ start: cursor, end: after, selector, body: css.slice(at + 1, after - 1), ancestry });
      }
      cursor = after;
    }
  }
  visit(0, css.length, [], 0);
  return result;
}

export function normalizeSitePatternResets(css: string): string {
  requireCondition(Buffer.byteLength(css) <= MAX_CSS_BYTES, "CSS exceeds 2 MiB");
  const all = rules(css);
  const resets = all.filter(rule => SELECTORS.includes(rule.selector) && writesReset(rule.body));
  requireCondition(resets.length === 3 || resets.length === 6, "expected one or two complete reset families");
  for (const [i, rule] of resets.entries()) {
    requireCondition(rule.selector === SELECTORS[i % 3], "reset selector order changed");
    requireCondition(rule.body.replace(/;$/, "") === RESET, "reset declarations changed");
    requireCondition(rule.ancestry.length === 1 && rule.ancestry[0] === LAYER, "reset layer or conditional ancestry changed");
    if (i % 3) requireCondition(clean(css.slice(resets[i - 1]!.end, rule.start)) === "", "reset family is not adjacent");
  }
  if (resets.length === 3) return css;
  const firstEnd = resets[2]!.end, duplicateStart = resets[3]!.start;
  for (const rule of all) {
    if (rule.start < firstEnd || rule.end > duplicateStart || !writesReset(rule.body)) continue;
    // A single attribute cannot equal none and any reset value simultaneously.
    // Refuse descendant, compound, nested or conditional-selector guesses.
    requireCondition(rule.selector === "[data-hraness-pattern=none]" && !/[{}]/.test(rule.body),
      `intervening write may change the cascade: ${rule.selector.slice(0, 160)}`);
  }
  return css.slice(0, duplicateStart) + css.slice(resets[5]!.end);
}
