import { attachFoil } from "@hraness/design-kit/browser";

const header = document.querySelector<HTMLElement>(".site-header");
if (header) attachFoil(header);

// Preserve anchors published on the old single-page site. Fragments never
// reach the server, so the homepage forwards them to their new sections.
if (location.pathname === "/" && location.hash) {
  const moved: Record<string, string> = {
    "#branch-demo": "/tour/#branches",
    "#reuse": "/tour/#reuse",
    "#inspect-children": "/tour/#inspect-children",
    "#authoring-error": "/tour/#authoring-error",
    "#source-failure": "/tour/#source-failure",
    "#grow": "/tour/#grow",
    "#use-cases": "/use-cases/",
    "#adopt": "/use-cases/#adopt",
    "#try": "/#install",
    "#source": "/#language",
    "#evolution": "/#evolution",
  };
  const target = moved[location.hash];
  if (target) location.replace(target);
}

// Progressive recorded-run tabs. Without JavaScript every retained panel stays
// visible; enhancement changes presentation only and never starts a VM run.
document.querySelectorAll<HTMLElement>("[data-tabset]").forEach(tablist => {
  const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>("[role=tab]"));
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute("aria-controls") ?? ""));
  if (tabs.length === 0 || panels.some(panel => panel === null)) return;

  function select(index: number, focus: boolean): void {
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i]!.hidden = i !== index;
    });
    if (focus) tabs[index]!.focus();
  }

  tabs.forEach((tab, index) => {
    const panel = panels[index]!;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    panel.tabIndex = 0;
    tab.addEventListener("click", () => select(index, false));
    tab.addEventListener("keydown", event => {
      let next: number | undefined;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        select(next, true);
      }
    });
  });
  select(0, false);
  tablist.hidden = false;
});

// Hero specimen chooser — swaps which organism's graph/source/evidence set is
// pinned to the board. Progressive enhancement: the first set is visible
// without JavaScript.
document.querySelectorAll<HTMLElement>(".hero-chooser").forEach(chooser => {
  const stage = chooser.closest(".hero-grid")?.querySelector<HTMLElement>("[data-hero-stage]");
  const buttons = Array.from(chooser.querySelectorAll<HTMLButtonElement>("[data-hero-choose]"));
  if (!stage || buttons.length === 0) return;
  const sets = Array.from(stage.querySelectorAll<HTMLElement>("[data-example-set]"));
  const selectExample = (key: string) => {
    for (const set of sets) set.hidden = set.dataset.exampleSet !== key;
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.heroChoose === key));
  };
  for (const button of buttons) button.addEventListener("click", () => selectExample(button.dataset.heroChoose!));
});

// --- Amoeba field -------------------------------------------------------------
// The hero backdrop is a culture of cell kinds. Each amoeba is a blurred,
// slowly morphing organism carrying its typed signature; organisms drift on
// their own, occasionally surface into focus, sharpen under the cursor like a
// microscope lens, and spawn a drifting daughter on click. Entirely decorative:
// the field is pointer-events:none and aria-hidden, so the hero's content and
// links behave exactly as before.
const amoebaField = document.querySelector<HTMLElement>(".amoeba-field");
if (amoebaField && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const host = amoebaField.parentElement as HTMLElement;
  const KINDS: [name: string, signature: string, kind: string][] = [
    ["decide", "text → choice", "model"],
    ["match", "value → branch", "pure"],
    ["each", "list → map", "composition"],
    ["slot.read", "key → value", "state"],
    ["in", "param: text", "input"],
    ["tool", "cap → result", "effect"],
    ["generate", "text → text", "model"],
    ["expr", "fuel · bounded", "pure"],
    ["spawn", "manifest → run", "composition"],
    ["recall", "query → memories", "state"],
    ["call", "args → child", "composition"],
    ["wait", "event → resume", "state"],
    ["gate", "evidence → admit", "effect"],
    ["emit", "value → out", "pure"],
  ];
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  interface Amoeba {
    el: HTMLElement; x: number; y: number; vx: number; vy: number;
    w: number; h: number; dir: number; size: number; focus: number;
    pulsePhase: number; pulseSpeed: number; ttl: number; born: number;
  }
  const amoebas: Amoeba[] = [];
  const make = (tag: readonly [string, string, string], x: number, y: number, ttl = Infinity): Amoeba => {
    const el = document.createElement("div");
    el.className = `amoeba am-${tag[2]}`;
    el.innerHTML = `<span class="am-tag"><b>${tag[0]}</b><i>${tag[1]}</i></span>`;
    el.style.setProperty("--am-dur", `${rand(6.5, 12).toFixed(1)}s`);
    amoebaField.appendChild(el);
    const dir = rand(0, Math.PI * 2);
    const speed = rand(3.5, 9);
    return {
      el, x, y, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
      w: el.offsetWidth, h: el.offsetHeight, dir, size: rand(0.82, 1.08),
      focus: 0, pulsePhase: rand(0, 40), pulseSpeed: rand(0.05, 0.13), ttl, born: performance.now(),
    };
  };

  let W = host.clientWidth, H = host.clientHeight;
  const count = Math.max(6, Math.min(14, Math.round((W * H) / 64000)));
  for (let i = 0; i < count; i++) amoebas.push(make(KINDS[i % KINDS.length]!, rand(-20, W), rand(-10, H)));

  let mouseX = -1e4, mouseY = -1e4;
  host.addEventListener("pointermove", event => {
    const r = amoebaField.getBoundingClientRect();
    mouseX = event.clientX - r.left;
    mouseY = event.clientY - r.top;
  });
  host.addEventListener("pointerleave", () => { mouseX = mouseY = -1e4; });

  // Reproduction: click near an organism and it buds a daughter that drifts off.
  host.addEventListener("click", event => {
    if ((event.target as HTMLElement).closest("a,button,summary")) return;
    const r = amoebaField.getBoundingClientRect();
    const cx = event.clientX - r.left, cy = event.clientY - r.top;
    let best: Amoeba | undefined, bestDist = 170;
    for (const a of amoebas) {
      const d = Math.hypot(a.x + a.w / 2 - cx, a.y + a.h / 2 - cy);
      if (d < bestDist) { bestDist = d; best = a; }
    }
    if (!best) return;
    best.focus = 1;
    best.el.classList.remove("am-pop");
    void best.el.offsetWidth;
    best.el.classList.add("am-pop");
    if (amoebas.filter(a => a.ttl !== Infinity).length >= 5) return;
    const tag = KINDS[Math.floor(Math.random() * KINDS.length)]!;
    const daughter = make(tag, best.x + best.w / 2, best.y + best.h / 2, 5200);
    daughter.el.classList.add("am-daughter");
    daughter.vx = rand(-16, 16);
    daughter.vy = rand(-16, 16);
    daughter.focus = 0.9;
    amoebas.push(daughter);
  });

  let last = performance.now(), raf = 0, running = false;
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    for (let i = amoebas.length - 1; i >= 0; i--) {
      const a = amoebas[i]!;
      // Organic wander: the heading slowly precesses instead of bouncing.
      a.dir += (Math.sin(t * 0.4 + a.pulsePhase) * 0.6 + rand(-0.5, 0.5)) * dt;
      const sp = Math.hypot(a.vx, a.vy);
      a.vx = Math.cos(a.dir) * sp;
      a.vy = Math.sin(a.dir) * sp;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      const m = a.w * 0.55;
      if (a.x < -m) a.x = W - a.w + m; else if (a.x > W - a.w + m) a.x = -m;
      if (a.y < -m) a.y = H - a.h + m; else if (a.y > H - a.h + m) a.y = -m;
      // Focus = cursor proximity + a rare self-reveal pulse, smoothed.
      const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
      const dx = mouseX - cx, dy = mouseY - cy;
      const md = Math.hypot(dx, dy);
      // A soft gravitational band: the cursor gently stirs nearby organisms'
      // headings, so they drift toward the pointer and orbit past it.
      if (md > 55 && md < 260) {
        let diff = Math.atan2(dy, dx) - a.dir;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.dir += diff * Math.min(1, (1 - md / 260) * 2.4 * dt);
      }
      const mFocus = md < 115 ? 1 : Math.max(0, 1 - (md - 115) / 190);
      const pulse = Math.max(0, Math.sin(t * a.pulseSpeed * Math.PI * 2 + a.pulsePhase) - 0.84) / 0.16;
      const target = Math.min(1, mFocus + pulse);
      a.focus += (target - a.focus) * Math.min(1, dt * 6);
      if (a.ttl !== Infinity) {
        const left = a.born + a.ttl - now;
        if (left < 0) { a.el.remove(); amoebas.splice(i, 1); continue; }
        if (left < 1000) a.el.style.opacity = `${(left / 1000) * 0.6}`;
      }
      a.el.style.transform = `translate3d(${a.x}px, ${a.y}px, 0) scale(${(a.size + a.focus * 0.09).toFixed(3)})`;
      a.el.style.setProperty("--am-focus", a.focus.toFixed(3));
    }
    if (running) raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  new IntersectionObserver(([entry]) => (entry?.isIntersecting ? start() : stop())).observe(amoebaField);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  new ResizeObserver(() => { W = host.clientWidth; H = host.clientHeight; }).observe(host);
}
