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
  run?: { receipt: string; outcome: string; steps: { event: string; node: string }[] };
}

const NS = "http://www.w3.org/2000/svg";
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  titleEl.textContent = `${diagram.name} — ALGAL program`;
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
  }

  const card = document.createElement("div");
  card.className = "dg-card";
  card.hidden = true;

  const showCard = (nodeId: string) => {
    const node = nodesById.get(nodeId);
    const box = layoutById.get(nodeId);
    if (!node || !box) return;
    const rows: string[] = [];
    const field = (label: string, value: string) => rows.push(`<div class="dg-field"><dt>${escapeText(label)}</dt><dd>${escapeText(value)}</dd></div>`);
    field("cell", node.id);
    field("kind", node.label);
    if (node.status) field("recorded", node.status);
    for (const line of box.lines) field("detail", line);
    for (const port of node.inputs) field("in", `${port.name}: ${typeof port.type === "string" ? port.type : JSON.stringify(port.type)}`);
    for (const port of node.outputs) field("out", `${port.name}: ${typeof port.type === "string" ? port.type : JSON.stringify(port.type)}`);
    if (node.source) {
      field("source", `${node.source.title} — ${node.source.summary}`);
      if (node.source.span) field("at", `${node.source.source}:${node.source.span.start.line}:${node.source.span.start.col}`);
    }
    card.innerHTML = `<div class="dg-card-head"><strong>${escapeText(box.title)}</strong><button type="button" class="dg-card-close" aria-label="Close cell details">×</button></div><dl class="dg-fields">${rows.join("")}</dl>`;
    card.hidden = false;
    card.querySelector(".dg-card-close")!.addEventListener("click", () => { card.hidden = true; });
  };

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
      edgePaths.forEach(el => el.classList.remove("is-dim", "is-hot"));
      return;
    }
    const { near, edges } = neighborsOf(id);
    nodeEls.forEach((el, key) => { el.classList.toggle("is-dim", !near.has(key)); el.classList.toggle("is-hot", key === id); });
    edgePaths.forEach((el, key) => { el.classList.toggle("is-dim", !edges.has(key)); el.classList.toggle("is-hot", edges.has(key)); });
  };

  for (const box of layout.nodes) {
    const node = nodesById.get(box.id)!;
    const g = svgEl("g", {
      class: `dg-node dg-cat-${box.category}${node.status ? ` dg-status-${node.status}` : ""}`,
      "data-node": box.id, tabindex: 0, role: "button",
      "aria-label": `${box.title} — ${node.label}${node.status ? `, recorded ${node.status}` : ""}`,
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
    scale = layout.height * widthFit > rect.height * 1.5 ? widthFit : contain;
    tx = (rect.width - layout.width * scale) / 2;
    ty = layout.height * scale > rect.height ? pad : (rect.height - layout.height * scale) / 2;
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
      if (!el || REDUCED) return;
      el.classList.remove("dg-pulse");
      void el.getBoundingClientRect();
      el.classList.add("dg-pulse");
    };
    const sendPackets = (nodeId: string) => {
      if (REDUCED) return Promise.resolve();
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
    if (frame.hasAttribute("data-diagram-autoplay") && !REDUCED) {
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
  caption.textContent = `Interactive view · drag to pan · ctrl/cmd-scroll or pinch to zoom · click a cell for its contract${run ? " · replay is the recorded event order, not a simulation" : ""}`;
  shell.appendChild(caption);
  frame.replaceChildren(shell);
  fit();
  new ResizeObserver(fit).observe(canvas);
}

for (const frame of document.querySelectorAll<HTMLElement>("[data-diagram-view]")) {
  void initDiagramFrame(frame).catch(() => { /* static image fallback remains */ });
}
