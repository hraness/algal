// Forgiving syntax highlighting for site code blocks. Each language is an
// ordered list of anchored patterns tried at every position; the first match
// wins and everything else passes through escaped. Highlighters never fail:
// docs show fragments, so an unterminated string or comment is colored up to
// the break rather than rejected. The algal grammar mirrors the token order
// of the lexer in src/source.ts.

// Every pattern is sticky (`y`): a match must start at the current position,
// so no `^` anchor is needed. The one exception is the line-start shell
// comment, which pairs `y` with `m` so `^` means start-of-line.
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

// A `#` opens a comment at the start of a line or after a blank, `;`, `|`,
// or `&`. Inside quotes it stays part of the string.
const SHELL_KEYWORDS =
  "if|then|else|elif|fi|for|in|do|done|while|until|case|esac|function|return|exit|local|export|readonly|set|unset|source|shift|test|echo|printf|cd|algal|bun|bunx|cargo|npm|npx|node|git|gh|curl|sh|bash|zsh|cat|ls|cp|mv|rm|mkdir|chmod|ln|tar|unzip|grep|sed|awk|xargs|jq|docker|vercel";

// Words stay whole: keywords, flags, and numbers require a preceding
// boundary that is not a word character, `.`, `/`, or `-`, so paths like
// `main.algal` and `b2-replies` do not match partway through.
const SHELL: readonly Rule[] = [
  { pattern: /"(?:\\[\s\S]|[^"\\\n])*"?/y, name: "string" },
  { pattern: /'[^\n']*'?/y, name: "string" },
  { pattern: /^#[^\n]*/my, name: "comment" },
  { pattern: /(?<=[\s;|&])#[^\n]*/y, name: "comment" },
  { pattern: new RegExp(`(?<![\\w./-])(?:${SHELL_KEYWORDS})\\b(?![\\w-])`, "y"), name: "keyword" },
  { pattern: /(?<![\w./-])--?[A-Za-z][\w-]*/y, name: "name" },
  { pattern: /\$(?:\w+|\{[^}]*\})/y, name: "name" },
  { pattern: /(?<![\w./-])[A-Za-z_][A-Za-z0-9_]*(?==(?!=))/y, name: "name" },
  { pattern: /(?<![\w:])\d+(?:\.\d+)*/y, name: "number" },
];

const TS_KEYWORDS =
  "const|let|var|function|return|if|else|for|while|switch|case|default|break|continue|new|typeof|instanceof|in|of|class|extends|super|this|null|undefined|true|false|import|from|export|async|await|try|catch|finally|throw|yield|static|get|set|interface|type|implements|enum|namespace|declare|abstract|as|satisfies|keyof|readonly|void|never|unknown|any";

const TYPESCRIPT: readonly Rule[] = [
  { pattern: /\/\/[^\n]*/y, name: "comment" },
  { pattern: /\/\*[\s\S]*?(?:\*\/|$)/y, name: "comment" },
  { pattern: /"(?:\\.|[^"\\\n])*"?/y, name: "string" },
  { pattern: /'(?:\\.|[^'\\\n])*'?/y, name: "string" },
  { pattern: /`(?:\\.|[^`\\])*`?/y, name: "string" },
  { pattern: new RegExp(`(?:${TS_KEYWORDS})\\b`, "y"), name: "keyword" },
  { pattern: /(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/y, name: "number" },
  { pattern: /[A-Za-z_$][A-Za-z0-9_$]*/y, name: null },
];

const LANGUAGES: Record<string, readonly Rule[]> = {
  algal: ALGAL,
  json: JSON_RULES,
  sh: SHELL,
  bash: SHELL,
  shell: SHELL,
  zsh: SHELL,
  ts: TYPESCRIPT,
  typescript: TYPESCRIPT,
  js: TYPESCRIPT,
  javascript: TYPESCRIPT,
  tsx: TYPESCRIPT,
  jsx: TYPESCRIPT,
};

/** Highlight one code block. Unknown or empty languages get escaped text. */
export function highlightCode(source: string, lang: string): string {
  const rules = LANGUAGES[lang.toLowerCase()];
  return rules ? highlightWith(source, rules) : escapeHtml(source);
}

/** Highlight .algal source; used for the executable examples in the build. */
export function highlightAlgal(source: string): string {
  return highlightWith(source, ALGAL);
}
