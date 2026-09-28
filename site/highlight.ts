// Forgiving syntax highlighting for the two languages the shared design-kit
// highlighter does not know: .algal source and the JSON the browser viewers
// render. Each grammar is an ordered list of sticky patterns tried at every
// position; the first match wins and everything else passes through escaped.
// Highlighters never fail: docs show fragments, so an unterminated string or
// comment is colored up to the break rather than rejected. The algal grammar
// mirrors the token order of the lexer in src/source.ts. This module stays
// dependency-free so browser bundles can import it without sugar-high.
type Rule = { pattern: RegExp; name: string | null };

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function highlightWith(source: string, rules: readonly Rule[]): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    let matched = false;
    for (const rule of rules) {
      rule.pattern.lastIndex = i;
      const match = rule.pattern.exec(source);
      if (match !== null && match[0].length > 0) {
        out += rule.name === null
          ? escapeHtml(match[0])
          : `<span class="code-${rule.name}">${escapeHtml(match[0])}</span>`;
        i += match[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += escapeHtml(source[i]!);
      i += 1;
    }
  }
  return out;
}

// Reserved words from src/source.ts plus the contextual field-type words
// (record, closed, min, max, unique, format and the text formats). `name`
// stays plain because it is a common binding identifier.
const ALGAL_KEYWORDS =
  "program|budget|let|return|decide|generate|using|as|choice|match|if|else|true|false|null|import|from|call|each|over|in|max_items|map|filter|fold|record|closed|text|number|integer|boolean|json|min|max|unique|format|digest|slug|uri";

const ALGAL: readonly Rule[] = [
  { pattern: /\/\/[^\n]*/y, name: "comment" },
  { pattern: /\/\*[\s\S]*?(?:\*\/|$)/y, name: "comment" },
  { pattern: /"(?:\\[\s\S]|[^"\\\n])*"?/y, name: "string" },
  { pattern: new RegExp(`(?:${ALGAL_KEYWORDS})\\b`, "y"), name: "keyword" },
  // Capitalized identifiers name declared record types.
  { pattern: /[A-Z][A-Za-z0-9_]*/y, name: "name" },
  { pattern: /\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y, name: "number" },
  { pattern: /[A-Za-z_][A-Za-z0-9_]*/y, name: null },
];

const JSON_RULES: readonly Rule[] = [
  { pattern: /"(?:\\.|[^"\\\n])*"(?=[ \t]*:)/y, name: "name" },
  { pattern: /"(?:\\.|[^"\\\n])*"?/y, name: "string" },
  { pattern: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y, name: "number" },
  { pattern: /(?:true|false|null)\b/y, name: "keyword" },
];

/** Highlight .algal source; used for executable examples and `algal` fences. */
export function highlightAlgal(source: string): string {
  return highlightWith(source, ALGAL);
}

/** Highlight JSON; used by the browser program and evidence viewers. */
export function highlightJson(source: string): string {
  return highlightWith(source, JSON_RULES);
}
