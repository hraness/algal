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
