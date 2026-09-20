// Source tracing is presentation-only: reconstruct origins from original source
// and walk exact manifest boundaries. Never interpret receipt text as source.
import { BOUNDS, manifestToJson, type Cell, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { compileSource, type SourceAnnotation, type SourceCallOrigin, type SourceCompilation, type SourceCompilerOptions, type SourceMap, type SourceSpan } from "./source";

export const SOURCE_TRACE_BOUNDS = Object.freeze({ maxPathLength: 1024, maxSegments: BOUNDS.maxDepth * 2 + 1, maxFrames: BOUNDS.maxDepth });
export type SourceTraceLocation = { source: string; cellId: string; role: string; span: SourceSpan; annotation?: SourceAnnotation };
export type SourceTraceFrame = {
  /** Exact execution prefix of the invoked child (including an item/round). */
  path: string;
  kind: "call" | "each" | "repeat";
  location?: SourceTraceLocation;
  index?: number;
  /** Digest of the child entered at this boundary. */
  manifestDigest: Digest;
};
export type SourceTraceContext = { compilation: SourceCompilation; sources: Readonly<Record<string, string>> };
export type SourcePathResult = {
  ok: true;
  path: string;
  mode: "cell" | "invocation";
  manifest: OrganismManifest;
  manifestDigest: Digest;
  invocationPath: string;
  source?: string;
  sourceMap?: SourceMap;
  cell?: Cell;
  location?: SourceTraceLocation;
  frames: SourceTraceFrame[];
  generated: boolean;
} | { ok: false; path: string; reason: string };

const contexts = new WeakSet<SourceTraceContext>();
const contextManifests = new WeakMap<SourceTraceContext, ReadonlyMap<Digest, OrganismManifest>>();
function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

/** Compile a closed source set without filesystem, network, or executor access.
 * Only contexts created here are accepted; mutable/serialized origin maps never
 * become authority for source labels. All returned context data is frozen.
 */
export function createSourceTrace(source: string, options: SourceCompilerOptions = {}): SourceTraceContext {
  const compilation = compileSource(source, options);
  const sources: Record<string, string> = Object.create(null);
  for (const key of Object.keys(compilation.project.units)) {
    sources[key] = key === compilation.project.entry ? source : options.modules![key]!;
  }
  const context = freeze({ compilation, sources });
  const manifests = new Map<Digest, OrganismManifest>();
  for (const manifest of [compilation.manifest, ...compilation.modules]) manifests.set(digestCanonical(manifestToJson(manifest)), manifest);
  contextManifests.set(context, manifests);
  contexts.add(context);
  return context;
}

/** Resolve a source cell or a concrete invocation prefix, independently of
 * whether a receipt recorded it. Callers must distinguish static structure
 * from observed execution. Unknown paths return no guessed source location.
 */
export function resolveSourcePath(context: SourceTraceContext, path: string, mode: "cell" | "invocation"): SourcePathResult {
  const missing = (reason: string): SourcePathResult => ({ ok: false, path, reason });
  if (!contexts.has(context)) return missing("source trace context must be created from original source");
  if (typeof path !== "string" || path.length > SOURCE_TRACE_BOUNDS.maxPathLength) return missing("execution path is not bounded text");
  if (mode !== "cell" && mode !== "invocation") return missing("unknown source path mode");
  const segments = path === "" ? [] : path.split("/");
  if (segments.length > SOURCE_TRACE_BOUNDS.maxSegments || segments.some(segment => !/^[a-z][a-z0-9-]*$/.test(segment) || segment.length > BOUNDS.maxIdLen)) return missing("execution path has invalid or excessive segments");
  const { compilation } = context;
  const manifests = contextManifests.get(context)!;
  let manifest = compilation.manifest;
  let manifestDigest = compilation.sourceMap.manifestDigest;
  let source: string | undefined = compilation.project.entry;
  let invocationPath = "";
  let wrapper: SourceCallOrigin | undefined;
  let cursor = 0;
  const frames: SourceTraceFrame[] = [];
  const location = (cell: Cell): SourceTraceLocation | undefined => {
    if (source === undefined) return undefined;
    const map = compilation.project.units[source];
    if (!map || map.manifestDigest !== manifestDigest) return undefined;
    const origin = map.cells.find(entry => entry.cellId === cell.id);
    return origin ? { source, cellId: cell.id, role: origin.role, span: origin.span, ...(origin.annotation ? { annotation: origin.annotation } : {}) } : undefined;
  };
  const success = (cell?: Cell): SourcePathResult => {
    const sourceMap = source === undefined ? undefined : compilation.project.units[source];
    const cellLocation = cell === undefined ? undefined : location(cell);
    return {
      ok: true, path, mode, manifest, manifestDigest, invocationPath,
      ...(source === undefined ? {} : { source }),
      ...(sourceMap === undefined ? {} : { sourceMap }),
      ...(cell === undefined ? {} : { cell }),
      ...(cellLocation === undefined ? {} : { location: cellLocation }),
      frames, generated: source === undefined,
    };
  };
  while (true) {
    if (cursor === segments.length) return mode === "invocation" ? success() : missing("execution path ends at an invocation, not a cell");
    const cell = manifest.cells.find(candidate => candidate.id === segments[cursor]);
    if (!cell) return missing(`no cell ${segments[cursor]} in the selected manifest`);
    cursor++;
    if (cursor === segments.length && mode === "cell") return success(cell);
    if (cell.kind !== "organism" && cell.kind !== "each" && cell.kind !== "repeat") return missing("execution path descends through a non-composition cell");
    let index: number | undefined;
    if (cell.kind === "each" || cell.kind === "repeat") {
      const marker = cell.kind === "each" ? "i" : "r";
      const segment = segments[cursor];
      if (!segment || !new RegExp(`^${marker}(0|[1-9][0-9]*)$`).test(segment)) return missing(`a ${cell.kind} invocation requires a canonical ${marker}N index`);
      index = Number(segment.slice(1));
      if (!Number.isSafeInteger(index) || index >= (cell.kind === "each" ? cell.maxItems : cell.maxRounds)) return missing(`${cell.kind} invocation index exceeds its declared bound`);
      cursor++;
    }
    if (frames.length >= SOURCE_TRACE_BOUNDS.maxFrames) return missing("execution path exceeds the supported invocation depth");
    const digest = cell.manifest as Digest;
    const child = manifests.get(digest);
    if (!child) return missing("child manifest is unavailable in the compiled closure");
    const origin = source === undefined ? undefined : compilation.project.calls.find(call => call.source === source && call.cellId === cell.id);
    let nextSource: string | undefined;
    let nextWrapper: SourceCallOrigin | undefined;
    if (origin) {
      if (origin.wrapper) {
        if (origin.wrapper.manifestDigest !== digest) return missing("wrapper origin does not match the declared child digest");
        nextWrapper = origin;
      } else {
        if (origin.childManifestDigest !== digest) return missing("source origin does not match the declared child digest");
        nextSource = origin.childSource;
      }
    } else if (wrapper) {
      if (cell.id !== wrapper.wrapper?.innerCellId || digest !== wrapper.childManifestDigest) return missing("generated wrapper path does not match compiler origins");
      nextSource = wrapper.childSource;
    } else return missing("child source origin is unavailable");
    if (nextSource !== undefined && compilation.project.units[nextSource]?.manifestDigest !== digest) return missing("child source map does not match the declared child digest");
    invocationPath = segments.slice(0, cursor).join("/");
    const callerLocation = location(cell);
    frames.push({ path: invocationPath, kind: cell.kind === "organism" ? "call" : cell.kind, ...(callerLocation === undefined ? {} : { location: callerLocation }), ...(index === undefined ? {} : { index }), manifestDigest: digest });
    manifest = child; manifestDigest = digest; source = nextSource; wrapper = nextWrapper;
  }
}
