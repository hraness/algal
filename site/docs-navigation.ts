import { escapeHtml } from "./markdown";

/** Both layouts share the same generated links. CSS exposes only one nav;
 * the mobile disclosure stays keyboard-operable without client JavaScript. */
export function docsNavigation(label: string, current: string, links: string): string {
  const name = escapeHtml(label);
  return `<aside class="docs-rail"><nav class="docs-nav docs-nav-desktop" aria-label="${name}">${links}</nav><details class="docs-disclosure"><summary><span>${name}</span><span class="docs-current">${escapeHtml(current)}</span></summary><nav class="docs-nav" aria-label="${name}">${links}</nav></details></aside>`;
}
