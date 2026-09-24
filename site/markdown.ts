// Minimal CommonMark renderer for the repository's own docs corpus. Covers
// the constructs the shipped docs actually use: ATX headings with stable
// slug ids, paragraphs, nested lists, fenced code, tables, blockquotes,
// horizontal rules, inline code, bold/emphasis, and links. Everything is
// escaped before markup is emitted.

export interface RenderedDoc {
  title: string;
  html: string;
  headings: { depth: number; slug: string; text: string }[];
  description: string;
}

export type LinkRewriter = (href: string) => string;

export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/** Longest page description the site derives from a paragraph. */
export const DESCRIPTION_MAX = 160;

/** Plain text of an inline Markdown run: link labels without their targets,
 * code and emphasis without their markers. */
export function plainInline(source: string): string {
  return source
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** A page description from a paragraph: whole sentences up to `max`
 * characters. Only when the first sentence alone is too long does it cut at a
 * word boundary and end with an ellipsis. It never ends mid-word. */
export function describeParagraph(source: string, max = DESCRIPTION_MAX): string {
  const text = plainInline(source);
  if (text.length <= max && /[.!?]["”')]?$/.test(text)) return text;
  let summary = "";
  for (const sentence of text.split(/(?<=[.!?]["”')]?)\s+(?=["“(]?[A-Z0-9])/)) {
    if (!/[.!?]["”')]?$/.test(sentence)) break;
    const next = summary ? `${summary} ${sentence}` : sentence;
    if (next.length > max) break;
    summary = next;
  }
  if (summary) return summary;
  const words = text.length < max ? text : text.slice(0, max - 1).replace(/\s+\S*$/, "");
  return `${words.replace(/[\s,;:(—–-]+$/, "")}…`;
}

export function slugifyHeading(text: string, used: Map<string, number>): string {
  const base = text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
  const seen = used.get(base) ?? 0;
  used.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen}`;
}

function renderInline(source: string, rewrite: LinkRewriter): string {
  let out = "";
  let i = 0;
  const len = source.length;
  const text = (chunk: string) => escapeHtml(chunk);
  while (i < len) {
    const ch = source[i]!;
    if (ch === "`") {
      const end = source.indexOf("`", i + 1);
      if (end > i) { out += `<code>${text(source.slice(i + 1, end))}</code>`; i = end + 1; continue; }
    }
    if (ch === "[" ) {
      const close = source.indexOf("]", i + 1);
      if (close > i && source[close + 1] === "(") {
        const endParen = source.indexOf(")", close + 2);
        if (endParen > close) {
          const label = source.slice(i + 1, close);
          const href = source.slice(close + 2, endParen).split(/\s+/)[0]!;
          const external = /^https?:/u.test(href);
          const resolved = rewrite(href);
          out += `<a href="${escapeHtml(resolved)}"${external ? ' target="_blank" rel="noopener"' : ""}>${renderInline(label, rewrite)}</a>`;
          i = endParen + 1;
          continue;
        }
      }
    }
    if (source.startsWith("**", i)) {
      const end = source.indexOf("**", i + 2);
      if (end > i) { out += `<strong>${renderInline(source.slice(i + 2, end), rewrite)}</strong>`; i = end + 2; continue; }
    }
    if (ch === "*" || ch === "_") {
      const end = source.indexOf(ch, i + 1);
      if (end > i + 1) { out += `<em>${renderInline(source.slice(i + 1, end), rewrite)}</em>`; i = end + 1; continue; }
    }
    out += text(ch);
    i += 1;
  }
  return out;
}

function isTableDivider(line: string): boolean {
  return /^\|?[\s:|-]+\|?$/.test(line.trim()) && line.includes("-");
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map(cell => cell.trim());
}

export function renderMarkdown(markdown: string, rewrite: LinkRewriter = href => href): RenderedDoc {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const html: string[] = [];
  const headings: RenderedDoc["headings"] = [];
  const used = new Map<string, number>();
  let title = "";
  let description = "";
  let i = 0;

  const paragraphBuffer: string[] = [];
  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const text = paragraphBuffer.join(" ").trim();
    if (text) {
      if (!description) description = describeParagraph(text);
      html.push(`<p>${renderInline(text, rewrite)}</p>`);
    }
    paragraphBuffer.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i]!;

    // fenced code
    const fence = line.match(/^```([a-zA-Z0-9]*)\s*$/);
    if (fence) {
      flushParagraph();
      const lang = fence[1] ?? "";
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) { body.push(lines[i]!); i += 1; }
      i += 1;
      const label = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : "";
      html.push(`<div class="code-block">${label}<pre><code>${escapeHtml(body.join("\n"))}</code></pre></div>`);
      continue;
    }

    // heading
    const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*$/);
    if (heading) {
      flushParagraph();
      const depth = heading[1]!.length;
      const raw = heading[2]!.trim();
      const slug = slugifyHeading(raw, used);
      if (!title && depth === 1) title = raw;
      headings.push({ depth, slug, text: raw });
      html.push(`<h${depth} id="${slug}">${renderInline(raw, rewrite)}</h${depth}>`);
      i += 1;
      continue;
    }

    // table
    if (line.trimStart().startsWith("|") && i + 1 < lines.length && isTableDivider(lines[i + 1]!)) {
      flushParagraph();
      const headerCells = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trimStart().startsWith("|")) { rows.push(splitRow(lines[i]!)); i += 1; }
      html.push(`<div class="table-wrap"><table><thead><tr>${headerCells.map(c => `<th>${renderInline(c, rewrite)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${renderInline(c, rewrite)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }

    // horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushParagraph();
      html.push("<hr>");
      i += 1;
      continue;
    }

    // blockquote
    if (/^\s*>/.test(line)) {
      flushParagraph();
      const parts: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]!)) { parts.push(lines[i]!.replace(/^\s*>\s?/, "")); i += 1; }
      html.push(`<blockquote>${renderMarkdown(parts.join("\n"), rewrite).html}</blockquote>`);
      continue;
    }

    // list
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      const items: { indent: number; ordered: boolean; text: string }[] = [];
      while (i < lines.length) {
        const m = lines[i]!.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (!m) break;
        items.push({ indent: m[1]!.length, ordered: /\d/.test(m[2]![0]!), text: m[3]! });
        i += 1;
        // continuation line (indented, not a new item)
        while (i < lines.length && lines[i]!.trim() !== "" && !/^(\s*)([-*+]|\d+\.)\s+/.test(lines[i]!) && /^\s{2,}\S/.test(lines[i]!) && !/^#{1,6}\s/.test(lines[i]!)) {
          items[items.length - 1]!.text += ` ${lines[i]!.trim()}`;
          i += 1;
        }
      }
      const open: string[] = [];
      let lastIndent = 0;
      for (const item of items) {
        const indent = item.indent;
        if (indent > lastIndent) {
          const tag = item.ordered ? "ol" : "ul";
          open.push(tag);
          html.push(`<${tag}>`);
        } else if (indent < lastIndent) {
          while (open.length && indent <= lastIndent - 2) { html.push(`</${open.pop()}>`); lastIndent -= 2; }
          if (open.length && indent < lastIndent) { html.push(`</${open.pop()}>`); }
        }
        lastIndent = indent;
        html.push(`<li>${renderInline(item.text, rewrite)}</li>`);
      }
      while (open.length) html.push(`</${open.pop()}>`);
      continue;
    }

    // blank
    if (line.trim() === "") { flushParagraph(); i += 1; continue; }

    paragraphBuffer.push(line.trim());
    i += 1;
  }
  flushParagraph();
  if (!title) title = "Documentation";
  return { title, html: html.join("\n"), headings, description };
}
