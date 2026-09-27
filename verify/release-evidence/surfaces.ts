/**
 * `verify/release-evidence` — bounded surface inventory and text scanners.
 *
 * The lane audits repository-owned release surfaces textually: packaging
 * scripts, the native metadata contract, workflows, public copy, and the
 * spec/docs prose that carries mixed-version compatibility claims. Every
 * read goes through `verify/lib/files.ts` (bounded, symlink-refusing,
 * regular-file-checked). Nothing here executes repository code, spawns a
 * process, or touches the network; this is a source-level evidence lane.
 *
 * Bounds: MAX_SURFACE_BYTES per file, MAX_SURFACES files, MAX_LINES lines per
 * file, MAX_UNITS claim units per file, MAX_USES `uses:` entries per workflow.
 */
import { readdir } from "node:fs/promises";
import { readFileBounded, readJson } from "../lib/files";
import { requireThat } from "../lib/schema";

export const MAX_SURFACE_BYTES = 1_048_576;
export const MAX_SURFACES = 256;
export const MAX_LINES = 200_000;
export const MAX_UNITS = 32_768;
export const MAX_USES = 256;
export const MAX_STEPS_WITH_KEYS = 64;

/** Every text surface this lane reads as a string. JSON surfaces
 *  (package.json, verify/properties.json) are additionally parsed. */
export const TEXT_SURFACES = [
  "package.json",
  "README.md",
  "CHANGELOG.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "docs/native-release.md",
  "docs/use-cases.md",
  "docs/programmable-applications.md",
  "scripts/package-native.py",
  "scripts/unpack-native.py",
  "scripts/install-native.sh",
  "scripts/test-native-release.py",
  "scripts/test-release-workflow.py",
  "scripts/standalone-native-smoke.py",
  "scripts/build-expr-wasm.sh",
  "scripts/build-apple.sh",
  "crates/algal/build.rs",
  "crates/algal/src/build_info.rs",
  ".github/workflows/release.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/expression-artifact.yml",
  ".github/workflows/dependabot-auto-merge.yml",
  "verify/differential/SCOPE.md",
] as const;

export const WORKFLOW_PATHS = [
  ".github/workflows/release.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/expression-artifact.yml",
  ".github/workflows/dependabot-auto-merge.yml",
] as const;

export const JSON_SURFACES = ["package.json", "verify/properties.json"] as const;

/** Surfaces swept for signing/verification wording. Dated reports and
 *  working notes under docs/ are excluded from the *prose* sweep; they are
 *  covered only by the compatibility-unit sweep in claims.ts. */
export const WORDING_SURFACES = [
  "package.json",
  "README.md",
  "CHANGELOG.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "docs/native-release.md",
  "docs/use-cases.md",
  "docs/programmable-applications.md",
  "site/copy.ts",
  "site/blog-posts.ts",
  "scripts/package-native.py",
  "scripts/unpack-native.py",
  "scripts/install-native.sh",
  "scripts/test-native-release.py",
  "scripts/test-release-workflow.py",
  "scripts/standalone-native-smoke.py",
  "scripts/build-expr-wasm.sh",
  "scripts/build-apple.sh",
  "crates/algal/build.rs",
  "crates/algal/src/build_info.rs",
  ...WORKFLOW_PATHS,
] as const;

export type Surfaces = ReadonlyMap<string, string>;

/** Bounded, symlink-checked read of one repository-relative path. */
export async function readSurface(root: string, path: string): Promise<string> {
  requireThat(!path.startsWith("/") && !path.includes(".."), `surface path ${path} escapes the repository root`);
  const bytes = await readFileBounded(root, path, MAX_SURFACE_BYTES);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function readSurfaceJson(root: string, path: string): Promise<unknown> {
  requireThat(JSON_SURFACES.includes(path as never), `surface path ${path} is not an admitted JSON surface`);
  return readJson(root, path);
}

/** Enumerate a flat directory of repository files, bounded and sorted. */
export async function listDirectory(root: string, dir: string, suffix: string, max = 128): Promise<string[]> {
  requireThat(!dir.startsWith("/") && !dir.includes(".."), `directory ${dir} escapes the repository root`);
  const entries = await readdir(`${root}/${dir}`, { withFileTypes: true });
  const names: string[] = [];
  for (const entry of entries) {
    requireThat(names.length < max, `${dir}: entry count bound`);
    if (entry.isFile() && entry.name.endsWith(suffix)) names.push(`${dir}/${entry.name}`);
  }
  return names.sort();
}

/** Load every declared text surface into a path → text map. */
export async function loadSurfaces(root: string): Promise<Surfaces> {
  const map = new Map<string, string>();
  const dynamic = [
    ...(await listDirectory(root, "spec/v1", ".md")),
    ...(await listDirectory(root, "docs", ".md")),
    ...(await listDirectory(root, "site/blog", ".md")),
  ];
  for (const path of [...new Set([...TEXT_SURFACES, ...dynamic])]) {
    requireThat(map.size < MAX_SURFACES, "surface inventory bound");
    map.set(path, await readSurface(root, path));
  }
  return map;
}

export function lines(text: string): string[] {
  const result = text.split("\n");
  requireThat(result.length <= MAX_LINES, "surface line-count bound");
  return result;
}

/** Collapse all runs of whitespace to single spaces and trim. Spec prose is
 *  hard-wrapped, so every anchor in claims.ts is matched on normalized text. */
export function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Claim units: blank-line paragraphs further split at markdown list-item
 *  boundaries, so each bullet in a long list is one checkable unit. */
export function claimUnits(text: string): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\n{2,}/)) {
    for (const part of paragraph.split(/(?=\n- )|(?=^- )|(?=\n\d+\. )|(?=^\d+\. )|(?=\n\* )|(?=^\* )/m)) {
      const unit = normalize(part);
      if (unit) out.push(unit);
    }
    requireThat(out.length <= MAX_UNITS, "claim-unit bound");
  }
  return out;
}

/** Find every unit containing `anchor` (both whitespace-normalized). */
export function unitsContaining(units: readonly string[], anchor: string): string[] {
  const needle = normalize(anchor);
  requireThat(needle.length > 0 && needle.length <= 512, "anchor bound");
  return units.filter(unit => unit.includes(needle));
}

/* ------------------------------------------------------------------ */
/* Minimal workflow YAML-surface scanner (line/indentation based).     */
/* ------------------------------------------------------------------ */

export interface WorkflowUse {
  /** owner/repo (or owner/repo/path) portion of `uses:`. */
  action: string;
  /** Everything after `@`, or "" when no ref is present. */
  ref: string;
  line: number;
  /** Flattened `with:` key/value pairs belonging to this step. */
  with: Record<string, string>;
}

const indentOf = (line: string): number => /^ */.exec(line)![0].length;

/** Extract every `uses:` step with its ref and its `with:` inputs. This is
 *  a surface audit, not a YAML parser: it keys on the repository's actual
 *  workflow formatting and fails loudly on shapes it cannot read. */
export function workflowUses(text: string): WorkflowUse[] {
  const all = lines(text);
  const out: WorkflowUse[] = [];
  for (let i = 0; i < all.length; i++) {
    const match = /^(\s*)-?\s*uses:\s*([^\s#]+)/.exec(all[i]!);
    if (!match) continue;
    requireThat(out.length < MAX_USES, "workflow uses bound");
    const indent = match[1]!.length;
    const spec = match[2]!.replace(/^["']|["']$/g, "");
    const at = spec.indexOf("@");
    const withBlock: Record<string, string> = {};
    let withKeys = 0;
    for (let j = i + 1; j < all.length; j++) {
      const line = all[j]!;
      if (!line.trim() || line.trimStart().startsWith("#")) continue;
      const indent2 = indentOf(line);
      if (indent2 <= indent) break;
      const withMatch = /^(\s*)with:\s*$/.exec(line);
      if (!withMatch) continue;
      const withIndent = withMatch[1]!.length;
      for (let k = j + 1; k < all.length; k++) {
        const inner = all[k]!;
        if (!inner.trim() || inner.trimStart().startsWith("#")) continue;
        if (indentOf(inner) <= withIndent) break;
        const kv = /^\s*([A-Za-z0-9_-]+):\s*(.*)$/.exec(inner);
        if (kv) {
          requireThat(++withKeys <= MAX_STEPS_WITH_KEYS, "with: key bound");
          withBlock[kv[1]!] = kv[2]!.trim().replace(/^["']|["']$/g, "");
        }
      }
      break;
    }
    out.push({
      action: at === -1 ? spec : spec.slice(0, at),
      ref: at === -1 ? "" : spec.slice(at + 1),
      line: i + 1,
      with: withBlock,
    });
  }
  return out;
}

export type RefClass = "sha" | "semver-tag" | "minor-tag" | "major-tag" | "floating";

export function refClass(ref: string): RefClass {
  if (/^[0-9a-f]{40}$/.test(ref)) return "sha";
  if (/^v\d+\.\d+\.\d+$/.test(ref)) return "semver-tag";
  if (/^v\d+\.\d+$/.test(ref)) return "minor-tag";
  if (/^v\d+$/.test(ref)) return "major-tag";
  return "floating";
}

export type PinStrength = "exact" | "minor" | "major" | "floating" | "unpinned";

/** Classify a tool-version input. `${{ env.NAME }}` indirections resolve
 *  against the supplied top-level env map. */
export function pinStrength(value: string, env: ReadonlyMap<string, string>): PinStrength {
  const resolved = /^\$\{\{\s*env\.([A-Z0-9_]+)\s*\}\}$/.exec(value);
  const v = resolved ? env.get(resolved[1]!) : value;
  if (v === undefined) return "unpinned";
  if (/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(v)) return "exact";
  if (/^\d+\.\d+$/.test(v)) return "minor";
  if (/^\d+$/.test(v)) return "major";
  if (v === "latest" || v === "stable" || v === "*") return "floating";
  return "unpinned";
}

/** Top-level `env:` block as a name → literal map (2-space indented keys). */
export function workflowEnv(text: string): Map<string, string> {
  const all = lines(text);
  const env = new Map<string, string>();
  let inEnv = false;
  for (const line of all) {
    if (/^env:\s*$/.test(line)) { inEnv = true; continue; }
    if (inEnv) {
      if (!/^\s/.test(line) && line.trim()) break;
      const kv = /^\s{2}([A-Z0-9_]+):\s*(.*)$/.exec(line);
      if (kv) env.set(kv[1]!, kv[2]!.trim().replace(/^["']|["']$/g, ""));
    }
  }
  return env;
}

/** The top-level `on:` block as raw lines (triggers are 2-space keys). */
export function workflowTriggers(text: string): string[] {
  const all = lines(text);
  const triggers: string[] = [];
  let inOn = false;
  for (const line of all) {
    if (/^on:\s*$/.test(line)) { inOn = true; continue; }
    if (inOn) {
      if (line.trim() && indentOf(line) === 0) break;
      const key = /^  ([a-zA-Z_]+):\s*(.*)$/.exec(line);
      if (key) triggers.push(key[1]!);
      const bare = /^  ([a-zA-Z_]+)\s*$/.exec(line);
      if (bare) triggers.push(bare[1]!);
    }
  }
  return triggers;
}

/** Top-level `permissions:` entries (2-space `scope: level` pairs), plus the
 *  per-job permission blocks separately when `nested` is set. */
export function workflowPermissions(text: string): Record<string, string> {
  const all = lines(text);
  const permissions: Record<string, string> = {};
  let inPermissions = false;
  for (const line of all) {
    if (/^permissions:\s*$/.test(line)) { inPermissions = true; continue; }
    if (inPermissions) {
      if (line.trim() && indentOf(line) === 0) break;
      const kv = /^  ([a-zA-Z-]+):\s*(\S+)/.exec(line);
      if (kv) permissions[kv[1]!] = kv[2]!;
    }
  }
  return permissions;
}

/** Count `secrets.NAME` expressions across the file. */
export function secretNames(text: string): Set<string> {
  const found = new Set<string>();
  for (const match of text.matchAll(/\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}/g)) {
    requireThat(found.size < 64, "secret inventory bound");
    found.add(match[1]!);
  }
  return found;
}
