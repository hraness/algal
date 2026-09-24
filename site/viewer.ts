// Progressive enhancement for generated organism diagrams. A
// `[data-diagram-view]` frame keeps its static <img> fallback until the
// algal.diagram-view.v1 document loads; then it becomes a pan/zoom canvas with
// inspectable cells and, when the build recorded a run, a faithful replay of
// the receipt's own event order — not an illustrative animation.
import type { DiagramLayout, ProgramDiagram } from "../src/diagram";

interface DiagramViewDocument {
  contract: string;
  diagram: ProgramDiagram;
  layout: DiagramLayout;
  run?: {
    receipt: string;
    outcome: string;
    steps: { event: string; node: string }[];
    cells?: Record<string, { status?: string; work?: number; args?: unknown; outputs?: unknown; failure?: { code: string; message: string } }>;
    effects?: Record<string, { executor?: string; output?: unknown; error?: { code: string; message: string } }[]>;
  };
}

const NS = "http://www.w3.org/2000/svg";
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

function text(parent: SVGElement, x: number, y: number, content: string, attrs: Record<string, string | number> = {}): void {
  const el = svgEl("text", { x, y, ...attrs });
  el.textContent = content;
  parent.appendChild(el);
}

function escapeText(value: string): string {
  return value.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Recorded args/outputs render as syntax-tinted JSON — real run values, not
// type shapes. Long values clip rather than dominate the card.
function highlightJson(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2) ?? "null";
  const source = serialized.length > 2400 ? `${serialized.slice(0, 2400)}\n…` : serialized;
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let html = "";
  let last = 0;
  for (const match of source.matchAll(re)) {
    html += escapeText(source.slice(last, match.index));
    const cls = match[1] !== undefined ? (match[2] !== undefined ? "tj-key" : "tj-str") : match[3] !== undefined ? "tj-lit" : "tj-num";
    html += `<span class="${cls}">${escapeText(match[0])}</span>`;
    last = match.index + match[0].length;
  }
  return html + escapeText(source.slice(last));
}

async function initDiagramFrame(frame: HTMLElement): Promise<void> {
  const src = frame.getAttribute("data-diagram-view");
  if (!src) return;
  const response = await fetch(src);
  if (!response.ok) return;
  const doc = (await response.json()) as DiagramViewDocument;
  if (doc.contract !== "algal.diagram-view.v1" || !doc.layout) return;

  const { diagram, layout, run } = doc;
  const nodesById = new Map(diagram.nodes.map(node => [node.id, node]));
  const layoutById = new Map(layout.nodes.map(node => [node.id, node]));
  const edgePaths = new Map<string, SVGPathElement>();
  const edgeGroups = new Map<string, SVGGElement>();
  const nodeEls = new Map<string, SVGGElement>();

  const shell = document.createElement("div");
  shell.className = "dg";

  const toolbar = document.createElement("div");
  toolbar.className = "dg-toolbar";
  const status = document.createElement("span");
  status.className = "dg-status";
  status.setAttribute("role", "status");
  status.textContent = `${diagram.name} · ${diagram.manifestDigest.slice(0, 19)}…`;
  toolbar.appendChild(status);

  const controls = document.createElement("span");
  controls.className = "dg-controls";
  toolbar.appendChild(controls);

  const canvas = document.createElement("div");
  canvas.className = "dg-canvas";
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "region");
  canvas.setAttribute("aria-label", `Interactive graph of ${diagram.name}: ${diagram.nodes.length} cells. Drag to pan, control or command scroll to zoom, arrow keys to move.`);

  const svg = svgEl("svg", { viewBox: `0 0 ${layout.width} ${layout.height}`, class: "dg-svg", role: "img" });
  const titleEl = svgEl("title");
  titleEl.textContent = `${diagram.name} · ALGAL program`;
  const descEl = svgEl("desc");
  descEl.textContent = `Data dependencies of ${diagram.key}. ${diagram.nodes.length} cells and ${diagram.edges.length} edges. ${run ? `Recorded ${run.outcome} run ${run.receipt}` : "No recorded run attached."}`;
  svg.append(titleEl, descEl);

  const markerId = `dg-arrow-${Math.random().toString(36).slice(2, 8)}`;
  const defs = svgEl("defs");
  const marker = svgEl("marker", { id: markerId, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
  marker.appendChild(svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#64748b" }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  svg.appendChild(svgEl("rect", { width: layout.width, height: layout.height, rx: 16, fill: "#ffffff", class: "dg-bg" }));
  const viewport = svgEl("g", { class: "dg-viewport" });
  svg.appendChild(viewport);

  const edgeLayer = svgEl("g");
  const nodeLayer = svgEl("g");
  const packetLayer = svgEl("g");
  viewport.append(edgeLayer, nodeLayer, packetLayer);

  for (const edge of layout.edges) {
    const g = svgEl("g", { class: `dg-edge${edge.kind === "failure" ? " is-failure" : ""}` });
    const path = svgEl("path", {
      d: edge.path, class: "dg-edge-path", fill: "none",
      stroke: edge.kind === "failure" ? "#b45309" : "#94a3b8", "stroke-width": 1.6,
      "marker-end": `url(#${markerId})`,
    });
    if (edge.kind === "failure") path.setAttribute("stroke-dasharray", "5 4");
    const title = svgEl("title");
    title.textContent = edge.label;
    path.appendChild(title);
    const labelWidth = Math.min(layout.contentWidth, [...edge.label].length * 5.8 + 12);
    g.appendChild(path);
    g.appendChild(svgEl("rect", { x: edge.labelX - labelWidth / 2, y: edge.labelY - 9, width: labelWidth, height: 16, rx: 4, fill: "#ffffff", "fill-opacity": 0.96 }));
    text(g, edge.labelX, edge.labelY + 2, edge.label, { "font-size": 10, "text-anchor": "middle", fill: edge.kind === "failure" ? "#92400e" : "#475569" });
    edgeLayer.appendChild(g);
    edgePaths.set(edge.id, path);
    edgeGroups.set(edge.id, g);
  }

  const card = document.createElement("div");
  card.className = "dg-card";
  card.hidden = true;

  const fieldsDl = (nodeId: string): string => {
    const node = nodesById.get(nodeId);
    const box = layoutById.get(nodeId);
    if (!node || !box) return "";
    const head: string[] = [];
    const tail: string[] = [];
    const push = (rows: string[]) => (label: string, value: string) =>
      rows.push(`<div class="dg-field"><dt>${escapeText(label)}</dt><dd>${escapeText(value)}</dd></div>`);
    const field = push(head);
    const fieldTail = push(tail);
    field("cell", node.id);
    field("kind", node.label);
    if (node.status) field("recorded", node.status);
    // Recorded evidence leads: the values this cell actually received and
    // produced in the run, ahead of the static contract.
    const recorded = run?.cells?.[nodeId];
    if (recorded?.work !== undefined) field("work", `${recorded.work} units`);
    if (recorded?.failure) field("failure", `${recorded.failure.code}: ${recorded.failure.message}`);
    let extras = "";
    const jsonField = (label: string, value: unknown) => {
      extras += `<div class="dg-json-label">${escapeText(label)}</div><pre class="dg-json">${highlightJson(value)}</pre>`;
    };
    if (recorded?.args !== undefined) jsonField("args", recorded.args);
    if (recorded?.outputs !== undefined) jsonField("outputs", recorded.outputs);
    for (const effect of run?.effects?.[nodeId] ?? []) {
      jsonField(`recorded effect · ${effect.executor ?? "executor"}`, effect.output ?? effect.error);
    }
    for (const line of box.lines) fieldTail("detail", line);
    for (const port of node.inputs) fieldTail("in", `${port.name}: ${typeof port.type === "string" ? port.type : JSON.stringify(port.type)}`);
    for (const port of node.outputs) fieldTail("out", `${port.name}: ${typeof port.type === "string" ? port.type : JSON.stringify(port.type)}`);
    if (node.source) {
      fieldTail("source", `${node.source.title}: ${node.source.summary}`);
      if (node.source.span) fieldTail("at", `line ${node.source.span.start.line}, column ${node.source.span.start.column}`);
    }
    return `<dl class="dg-fields">${head.join("")}</dl>${extras}${tail.length ? `<dl class="dg-fields dg-fields-contract">${tail.join("")}</dl>` : ""}`;
  };

  const showCard = (nodeId: string) => {
    const box = layoutById.get(nodeId);
    if (!box) return;
    card.innerHTML = `<div class="dg-card-head"><strong>${escapeText(box.title)}</strong><button type="button" class="dg-card-close" aria-label="Close cell details">×</button></div>${fieldsDl(nodeId)}`;
    card.hidden = false;
    card.querySelector(".dg-card-close")!.addEventListener("click", () => { card.hidden = true; });
  };

  // Frames inside hidden tab panels measure zero width; wait for a real
  // measurement so the mode decision reflects the rendered column.
  if (frame.clientWidth === 0) {
    await new Promise<void>(resolve => {
      const observer = new ResizeObserver(() => {
        if (frame.clientWidth > 0) { observer.disconnect(); resolve(); }
      });
      observer.observe(frame);
    });
  }

  // Narrow frames and graphs far wider than their container get the fossil
  // record itself: the receipt's event order as a tappable list. Cheaper than
  // squeezing a dense graph, and closer to what a receipt actually is. Tall
  // portrait organisms also prefer the list whenever the frame is wide enough
  // to show it comfortably — a sparse centered graph reads worse than the
  // record; only mid-width frames keep the follow-pan canvas for them.
  const portrait = layout.height > layout.width * 1.15;
  const narrow = !frame.hasAttribute("data-diagram-canvas")
    && (frame.clientWidth < 420
      || layout.width > frame.clientWidth * 1.8
      || (portrait && frame.clientWidth > 560));
  if (narrow) {
    const EVENT_LABEL: Record<string, string> = { "cell.commit": "committed", "cell.skip": "skipped", "cell.fail": "failed", "cell.suspend": "suspended", effect: "effect", cell: "cell" };
    const steps = run && run.steps.length ? run.steps : layout.nodes.map(node => ({ event: "cell", node: node.id }));
    const list = document.createElement("ol");
    list.className = "dg-timeline";
    list.setAttribute("aria-label", run ? `Recorded ${run.outcome} run of ${diagram.name}` : `Cells of ${diagram.name}`);
    const rows: HTMLLIElement[] = [];
    steps.forEach((step, index) => {
      const box = layoutById.get(step.node);
      const statusName = step.event === "cell.commit" ? "committed" : step.event === "cell.skip" ? "skipped" : step.event === "cell.fail" ? "failed" : step.event === "cell.suspend" ? "suspended" : step.event;
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dg-step";
      button.setAttribute("aria-expanded", "false");
      button.innerHTML = `<span class="dg-step-seq">${index + 1}</span><span class="dg-step-dot dg-dot-${statusName}"></span><span class="dg-step-main"><strong>${escapeText(box?.title ?? step.node)}</strong><span>${escapeText(box?.label ?? "")}</span></span><span class="dg-step-event">${escapeText(EVENT_LABEL[step.event] ?? step.event)}</span>`;
      const detail = document.createElement("div");
      detail.className = "dg-step-detail";
      detail.hidden = true;
      button.addEventListener("click", () => {
        detail.hidden = !detail.hidden;
        button.setAttribute("aria-expanded", String(!detail.hidden));
        if (!detail.hidden && !detail.innerHTML) detail.innerHTML = fieldsDl(step.node);
      });
      li.append(button, detail);
      list.appendChild(li);
      rows.push(li);
    });

    let playing = false;
    const replaySteps = async () => {
      if (playing || !run) return;
      playing = true;
      rows.forEach(row => row.classList.remove("is-live"));
      const wrap = list.parentElement;
      for (const [index] of run.steps.entries()) {
        const row = rows[index]!;
        row.classList.add("is-live");
        // Scroll inside the timeline's own box, never the page — nearest-edge
        // semantics so short timelines don't move at all.
        if (wrap) {
          const rowTop = row.offsetTop;
          const rowBottom = rowTop + row.offsetHeight;
          if (rowTop < wrap.scrollTop || rowBottom > wrap.scrollTop + wrap.clientHeight) {
            wrap.scrollTo({ top: rowTop - (wrap.clientHeight - row.offsetHeight) / 2, behavior: REDUCED ? "auto" : "smooth" });
          }
        }
        status.textContent = `${index + 1}/${run.steps.length} · ${run.steps[index]!.event} ${run.steps[index]!.node}`;
        if (!REDUCED) await new Promise(r => window.setTimeout(r, 340));
      }
      status.textContent = `run.end · ${run.outcome} · ${run.receipt.slice(0, 19)}…`;
      playing = false;
    };

    const controlButton = (label: string, action: () => void, name: string) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dg-button";
      button.title = label;
      button.setAttribute("aria-label", label);
      button.innerHTML = `<svg class="site-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><use href="/icons.svg#${name}"></use></svg>`;
      button.addEventListener("click", action);
      controls.appendChild(button);
    };
    if (run && run.steps.length) controlButton("Replay the recorded run", () => { void replaySteps(); }, "replay");
    const graphLink = document.createElement("a");
    graphLink.className = "dg-graph-link";
    graphLink.href = src.replace(/\.view\.json$/, ".svg");
    graphLink.textContent = "Full graph (SVG)";
    controls.appendChild(graphLink);

    shell.appendChild(toolbar);
    const wrap = document.createElement("div");
    wrap.className = "dg-timeline-wrap";
    wrap.appendChild(list);
    shell.appendChild(wrap);
    const caption = document.createElement("p");
    caption.className = "dg-caption";
    caption.textContent = run ? "Steps play back in the receipt's recorded event order. Tap a step to see its cell's contract." : "Cells in layout order. Tap one to see its contract.";
    shell.appendChild(caption);
    frame.replaceChildren(shell);
    if (frame.hasAttribute("data-diagram-autoplay") && !REDUCED && !COARSE) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect();
          window.setTimeout(() => { void replaySteps(); }, 400);
        }
      }, { threshold: 0.3 });
      observer.observe(list);
    }
    return;
  }

  const neighborsOf = (id: string) => {
    const near = new Set<string>([id]);
    const edges = new Set<string>();
    for (const edge of diagram.edges) {
      if (edge.from.cell === id) { near.add(edge.to.cell); edges.add(edge.id); }
      if (edge.to.cell === id) { near.add(edge.from.cell); edges.add(edge.id); }
    }
    return { near, edges };
  };

  let selected: string | null = null;
  const highlight = (id: string | null) => {
    selected = id;
    if (!id) {
      nodeEls.forEach(el => el.classList.remove("is-dim", "is-hot"));
      edgeGroups.forEach(el => el.classList.remove("is-dim"));
      edgePaths.forEach(el => el.classList.remove("is-hot"));
      return;
    }
    const { near, edges } = neighborsOf(id);
    nodeEls.forEach((el, key) => { el.classList.toggle("is-dim", !near.has(key)); el.classList.toggle("is-hot", key === id); });
    edgeGroups.forEach((el, key) => el.classList.toggle("is-dim", !edges.has(key)));
    edgePaths.forEach((el, key) => el.classList.toggle("is-hot", edges.has(key)));
  };

  for (const box of layout.nodes) {
    const node = nodesById.get(box.id)!;
    const g = svgEl("g", {
      class: `dg-node dg-cat-${box.category}${node.status ? ` dg-status-${node.status}` : ""}`,
      "data-node": box.id, tabindex: 0, role: "button",
      "aria-label": `${box.title}: ${node.label}${node.status ? `, recorded ${node.status}` : ""}`,
    });
    const tip = svgEl("title");
    tip.textContent = `${node.label} · ${box.id}${node.source ? ` · ${node.source.title}` : ""}`;
    g.appendChild(tip);
    g.appendChild(svgEl("rect", { class: "dg-node-box", x: box.x, y: box.y, width: box.width, height: box.height, rx: 10, fill: box.fill, stroke: box.stroke, "stroke-width": 1.4 }));
    if (node.status === "skipped") g.querySelector(".dg-node-box")!.setAttribute("stroke-dasharray", "5 4");
    g.appendChild(svgEl("rect", { x: box.x, y: box.y + 12, width: 4, height: box.height - 24, rx: 2, fill: box.accent }));
    text(g, box.x + 17, box.y + 23, box.label, { "font-size": 10, "letter-spacing": 0.5, "font-weight": 700, fill: box.accent, class: "dg-node-kind" });
    text(g, box.x + 17, box.y + 46, box.title, { "font-size": 16, "font-weight": 650 });
    box.lines.forEach((line, i) => text(g, box.x + 17, box.y + 66 + i * 17, line, { "font-size": 11, fill: line.startsWith("RECORDED ") ? box.stroke : "#475569" }));
    g.addEventListener("pointerdown", event => event.stopPropagation());
    g.addEventListener("pointerenter", () => { if (!selected) highlight(box.id); });
    g.addEventListener("pointerleave", () => { if (!selected) highlight(null); });
    g.addEventListener("click", event => { event.stopPropagation(); highlight(box.id); showCard(box.id); });
    g.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); highlight(box.id); showCard(box.id); }
    });
    nodeLayer.appendChild(g);
    nodeEls.set(box.id, g);
  }

  canvas.appendChild(svg);
  canvas.appendChild(card);
  canvas.addEventListener("click", () => { highlight(null); card.hidden = true; });
  canvas.addEventListener("keydown", event => { if (event.key === "Escape") { highlight(null); card.hidden = true; } });

  // --- pan / zoom -----------------------------------------------------------
  let scale = 1;
  let tx = 0;
  let ty = 0;
  const apply = () => viewport.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
  const clampPan = () => {
    const rect = canvas.getBoundingClientRect();
    const w = layout.width * scale;
    const h = layout.height * scale;
    tx = w <= rect.width ? (rect.width - w) / 2 : Math.min(20, Math.max(rect.width - w - 20, tx));
    ty = h <= rect.height ? (rect.height - h) / 2 : Math.min(20, Math.max(rect.height - h - 20, ty));
  };
  const fit = () => {
    const rect = canvas.getBoundingClientRect();
    const pad = 20;
    const contain = Math.min((rect.width - pad) / layout.width, (rect.height - pad) / layout.height);
    // Tall organisms read better fit to width; replay then pans to follow cells.
    const widthFit = (rect.width - pad) / layout.width;
    if (frame.hasAttribute("data-diagram-canvas")) {
      // Collage cards open as a macro shot — the organism's head cells at a
      // readable zoom, top-anchored, instead of the whole graph shrunk to fit.
      scale = Math.min(1.6, Math.max(widthFit * 2.6, 0.9));
      tx = (rect.width - layout.width * scale) / 2;
      ty = 12;
    } else {
      scale = layout.height * widthFit > rect.height * 1.5 ? widthFit : contain;
      tx = (rect.width - layout.width * scale) / 2;
      ty = layout.height * scale > rect.height ? pad : (rect.height - layout.height * scale) / 2;
    }
    apply();
  };
  const centerOn = (nodeId: string) => {
    const box = layoutById.get(nodeId);
    if (!box) return;
    const rect = canvas.getBoundingClientRect();
    tx = rect.width / 2 - (box.x + box.width / 2) * scale;
    ty = rect.height / 2 - (box.y + box.height / 2) * scale;
    clampPan();
    apply();
  };
  const zoomAt = (cx: number, cy: number, factor: number) => {
    const rect = canvas.getBoundingClientRect();
    const px = cx - rect.left;
    const py = cy - rect.top;
    const next = Math.min(4, Math.max(0.15, scale * factor));
    tx = px - (px - tx) * (next / scale);
    ty = py - (py - ty) * (next / scale);
    scale = next;
    apply();
  };

  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDistance = 0;
  canvas.addEventListener("pointerdown", event => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
    canvas.classList.add("is-panning");
  });
  canvas.addEventListener("pointermove", event => {
    if (!pointers.has(event.pointerId)) return;
    const prev = pointers.get(event.pointerId)!;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      tx += event.clientX - prev.x;
      ty += event.clientY - prev.y;
      apply();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinchDistance > 0) zoomAt((a!.x + b!.x) / 2, (a!.y + b!.y) / 2, dist / pinchDistance);
      pinchDistance = dist;
    }
  });
  const release = (event: PointerEvent) => { pointers.delete(event.pointerId); if (!pointers.size) canvas.classList.remove("is-panning"); };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("wheel", event => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.12 : 0.9);
  }, { passive: false });
  canvas.addEventListener("dblclick", event => zoomAt(event.clientX, event.clientY, 1.35));
  canvas.addEventListener("keydown", event => {
    const step = 60;
    if (event.key === "ArrowLeft") tx += step;
    else if (event.key === "ArrowRight") tx -= step;
    else if (event.key === "ArrowUp") ty += step;
    else if (event.key === "ArrowDown") ty -= step;
    else if (event.key === "+" || event.key === "=") { const r = canvas.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.2); }
    else if (event.key === "-") { const r = canvas.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 0.83); }
    else if (event.key === "0") fit();
    else return;
    event.preventDefault();
    apply();
  });

  const control = (label: string, action: () => void, name: string) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dg-button";
    button.dataset.dgAction = name;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<svg class="site-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><use href="/icons.svg#${name}"></use></svg>`;
    button.addEventListener("click", action);
    controls.appendChild(button);
    return button;
  };

  control("Zoom out", () => { const r = canvas.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 0.8); }, "zoom-out");
  control("Zoom in", () => { const r = canvas.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.25); }, "zoom-in");
  control("Fit diagram to view", fit, "fit");

  // --- recorded-run replay ---------------------------------------------------
  if (run && run.steps.length) {
    const committed = new Set<string>();
    let playing = false;

    const setStatus = (id: string, statusName: string) => {
      const el = nodeEls.get(id);
      if (!el) return;
      el.classList.remove("dg-status-committed", "dg-status-skipped", "dg-status-failed", "dg-status-suspended");
      const box = layoutById.get(id)!;
      const rect = el.querySelector<SVGRectElement>(".dg-node-box")!;
      const colors: Record<string, string> = { committed: "#16a34a", failed: "#dc2626", suspended: "#d97706", skipped: "#64748b" };
      rect.setAttribute("stroke", colors[statusName] ?? box.accent);
      rect.setAttribute("stroke-dasharray", statusName === "skipped" ? "5 4" : "");
      el.classList.add(`dg-status-${statusName}`);
    };
    const pulse = (id: string) => {
      const el = nodeEls.get(id);
      if (!el || REDUCED || COARSE) return;
      el.classList.remove("dg-pulse");
      void el.getBoundingClientRect();
      el.classList.add("dg-pulse");
    };
    const sendPackets = (nodeId: string) => {
      if (REDUCED || COARSE) return Promise.resolve();
      const jobs: Promise<void>[] = [];
      for (const edge of diagram.edges) {
        if (edge.to.cell !== nodeId) continue;
        if (!committed.has(edge.from.cell)) continue;
        const path = edgePaths.get(edge.id);
        if (!path) continue;
        jobs.push(new Promise(resolve => {
          const packet = svgEl("circle", { r: 4.5, class: "dg-packet", fill: "#16a34a" });
          packetLayer.appendChild(packet);
          const length = path.getTotalLength();
          const start = performance.now();
          const duration = Math.min(900, Math.max(240, length * 1.1));
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const point = path.getPointAtLength(t * length);
            packet.setAttribute("cx", String(point.x));
            packet.setAttribute("cy", String(point.y));
            if (t < 1) requestAnimationFrame(tick);
            else { packet.remove(); resolve(); }
          };
          requestAnimationFrame(tick);
        }));
      }
      return Promise.all(jobs).then(() => undefined);
    };

    const replay = async () => {
      if (playing) return;
      playing = true;
      card.hidden = true;
      highlight(null);
      committed.clear();
      for (const [id] of nodeEls) {
        const el = nodeEls.get(id)!;
        el.classList.remove("dg-status-committed", "dg-status-skipped", "dg-status-failed", "dg-status-suspended");
        const box = layoutById.get(id)!;
        const rect = el.querySelector<SVGRectElement>(".dg-node-box")!;
        rect.setAttribute("stroke", box.accent);
        rect.removeAttribute("stroke-dasharray");
      }
      const total = run.steps.length;
      canvas.classList.add("is-animating");
      for (const [index, step] of run.steps.entries()) {
        status.textContent = `${index + 1}/${total} · ${step.event} ${step.node}`;
        if (!REDUCED) centerOn(step.node);
        if (step.event === "effect") {
          pulse(step.node);
          if (!REDUCED) await new Promise(r => window.setTimeout(r, 420));
        } else {
          await sendPackets(step.node);
          const statusName = step.event === "cell.commit" ? "committed" : step.event === "cell.skip" ? "skipped" : step.event === "cell.fail" ? "failed" : "suspended";
          if (statusName === "committed") committed.add(step.node);
          setStatus(step.node, statusName);
          if (!REDUCED) await new Promise(r => window.setTimeout(r, 160));
        }
      }
      canvas.classList.remove("is-animating");
      status.textContent = `run.end · ${run.outcome} · ${run.receipt.slice(0, 19)}…`;
      playing = false;
    };

    control("Replay the recorded run", () => { void replay(); }, "replay");
    if (frame.hasAttribute("data-diagram-autoplay") && !REDUCED && !COARSE) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect();
          window.setTimeout(() => { void replay(); }, 500);
        }
      }, { threshold: 0.35 });
      observer.observe(canvas);
    }
  }

  shell.appendChild(toolbar);
  shell.appendChild(canvas);
  const caption = document.createElement("p");
  caption.className = "dg-caption";
  caption.textContent = `Interactive view · drag to pan · ctrl/cmd-scroll or pinch to zoom · click a cell for its contract${run ? " · replay follows the recorded event order" : ""}`;
  shell.appendChild(caption);
  frame.replaceChildren(shell);
  fit();
  new ResizeObserver(fit).observe(canvas);
}

for (const frame of document.querySelectorAll<HTMLElement>("[data-diagram-view]")) {
  void initDiagramFrame(frame).catch(() => { /* static image fallback remains */ });
}
