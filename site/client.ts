import { attachFoil, attachHeroLight } from "@hraness/design-kit/browser";

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
// The shared controller keeps pointer light bounded and suspends it offscreen.
// The cell taxonomy remains real HTML, including with JavaScript disabled.
const hero = document.querySelector<HTMLElement>(".hero");
if (hero) attachHeroLight(hero);
