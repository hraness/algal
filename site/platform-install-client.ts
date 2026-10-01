import { detectPlatform, matchDetectedPlatform } from "@hraness/design-kit";

/** Enhance build-time PlatformInstall markup the way the kit's React component
 * behaves after hydration: ARIA tab keys, OS detection, and Copy with a
 * select-to-copy fallback. Without JavaScript the kit CSS shows every panel. */
const COPY_RESET_MS = 2000;

function selectContents(element: HTMLElement): void {
  try {
    const selection = document.getSelection();
    if (selection === null) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch {
    // Selection is a convenience; the failure is still announced.
  }
}

async function copyText(value: string, pre: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    selectContents(pre);
    try { return document.execCommand("copy"); } catch { return false; }
  }
}

export function enhancePlatformInstalls(root: ParentNode = document): void {
  for (const block of root.querySelectorAll<HTMLElement>("[data-hraness-platform-install]")) {
    if (block.dataset.enhanced === "true") continue;
    const tablist = block.querySelector<HTMLElement>("[role=tablist]");
    const status = block.querySelector<HTMLElement>(":scope > [role=status]");
    const tabs = [...block.querySelectorAll<HTMLButtonElement>("[role=tab]")];
    const panels = [...block.querySelectorAll<HTMLElement>("[role=tabpanel]")];
    if (tablist === null || status === null || tabs.length === 0 || tabs.length !== panels.length) continue;
    // StyleX encodes selected appearance in classes, so preserve both SSR states
    // before OS detection or a visitor changes the selected platform.
    const selectedClass = tabs.find(tab => tab.getAttribute("aria-selected") === "true")?.className;
    const idleClass = tabs.find(tab => tab.getAttribute("aria-selected") !== "true")?.className;
    const ids = tabs.map(tab => tab.dataset.platform ?? "");
    let chosen = false;
    const select = (id: string, source: "default" | "detected" | "chosen", focus: boolean) => {
      block.dataset.selectedPlatform = id;
      block.dataset.selectionSource = source;
      for (const tab of tabs) {
        const selected = tab.dataset.platform === id;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        const stateClass = selected ? selectedClass : idleClass;
        if (stateClass !== undefined) tab.className = stateClass;
        if (selected && focus) tab.focus();
      }
      for (const panel of panels) panel.hidden = panel.dataset.platform !== id;
    };
    for (const tab of tabs) {
      tab.addEventListener("click", () => { chosen = true; select(tab.dataset.platform ?? ids[0]!, "chosen", false); });
    }
    tablist.addEventListener("keydown", event => {
      const index = ids.indexOf(block.dataset.selectedPlatform ?? "");
      let next: number;
      switch (event.key) {
        case "ArrowRight": next = (index + 1) % ids.length; break;
        case "ArrowLeft": next = (index - 1 + ids.length) % ids.length; break;
        case "Home": next = 0; break;
        case "End": next = ids.length - 1; break;
        default: return;
      }
      event.preventDefault();
      chosen = true;
      select(ids[next]!, "chosen", true);
    });
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    for (const command of block.querySelectorAll<HTMLElement>(".hraness-platform-install__command")) {
      const button = command.querySelector<HTMLButtonElement>(".hraness-platform-install__copy");
      const label = button?.querySelector<HTMLElement>(":scope > span:not([class])");
      const pre = command.querySelector<HTMLElement>("pre");
      if (!button || !label || !pre) continue;
      const subject = pre.getAttribute("aria-label") ?? "install command";
      button.addEventListener("click", async () => {
        const ok = await copyText(pre.textContent ?? "", pre);
        if (ok) document.dispatchEvent(new CustomEvent("analytics-install-copied", { detail: /\bbrew\b/.test(pre.textContent ?? "") ? "brew" : "curl" }));
        if (!ok) selectContents(pre);
        for (const other of block.querySelectorAll<HTMLElement>("[data-copy-state]")) other.dataset.copyState = "idle";
        command.dataset.copyState = button.dataset.copyState = ok ? "copied" : "failed";
        label.textContent = ok ? "Copied" : "Select to copy";
        status.textContent = ok ? `Copied the ${subject}.` : `Copying failed. The ${subject} is selected; copy it with your keyboard.`;
        if (resetTimer !== undefined) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          command.dataset.copyState = button.dataset.copyState = "idle";
          label.textContent = "Copy";
          status.textContent = "";
        }, COPY_RESET_MS);
      });
    }
    block.dataset.enhanced = "true";
    const match = matchDetectedPlatform(detectPlatform(navigator), ids);
    if (match !== null && !chosen) select(match, "detected", false);
  }
}
