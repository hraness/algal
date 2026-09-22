import {
  AiBrain01Icon, ArrowDown01Icon, ArrowRight01Icon, ArrowUpRight01Icon,
  CheckmarkCircle02Icon, CommandLineIcon, ComputerIcon, CpuIcon, DatabaseIcon,
  DnaIcon, Download01Icon, FileSearchIcon, FileValidationIcon, FitToScreenIcon,
  GitBranchIcon, HistoryIcon, HourglassIcon, InformationCircleIcon, Leaf01Icon,
  LockIcon, MemoryStickIcon, Moon02Icon, PauseCircleIcon, PlayIcon, RefreshIcon,
  ReplayIcon, RotateCcwIcon, Sun03Icon, ZoomInIcon, ZoomOutIcon,
} from "@hugeicons/core-free-icons";

// The marketing surface uses the same published icon family as the shared
// design system. Render its standard geometry at build time, without React.
const icons = {
  "arrow-down": ArrowDown01Icon,
  "arrow-right": ArrowRight01Icon,
  "arrow-up-right": ArrowUpRight01Icon,
  "check-circle": CheckmarkCircle02Icon,
  "terminal": CommandLineIcon,
  "computer": ComputerIcon,
  "download": Download01Icon,
  "file-search": FileSearchIcon,
  "file-check": FileValidationIcon,
  "branch": GitBranchIcon,
  "info": InformationCircleIcon,
  "moon": Moon02Icon,
  "pause-circle": PauseCircleIcon,
  "refresh": RefreshIcon,
  "sun": Sun03Icon,
  "play": PlayIcon,
  "replay": ReplayIcon,
  "zoom-in": ZoomInIcon,
  "zoom-out": ZoomOutIcon,
  "fit": FitToScreenIcon,
  "reset": RotateCcwIcon,
  "brain": AiBrain01Icon,
  "cpu": CpuIcon,
  "database": DatabaseIcon,
  "dna": DnaIcon,
  "history": HistoryIcon,
  "hourglass": HourglassIcon,
  "leaf": Leaf01Icon,
  "lock": LockIcon,
  "memory": MemoryStickIcon,
} as const;
export type SiteIconName = keyof typeof icons;

function escape(value: string | number): string {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("'", "&#39;");
}

export function siteIcon(name: SiteIconName): string {
  if (!Object.hasOwn(icons, name)) throw new Error(`Unknown site icon: ${name}`);
  return `<svg class="site-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><use href="/icons.svg#${name}"></use></svg>`;
}

export function renderIconSprite(): string {
  const symbols = Object.entries(icons).map(([name, elements]) => {
    const shapes = elements.map(([tag, attributes]) => {
      if (!["path", "circle", "ellipse", "line", "polyline", "polygon", "rect"].includes(tag)) {
        throw new Error(`Unsupported standard icon element: ${tag}`);
      }
      const attrs = Object.entries(attributes).filter(([key]) => key !== "key").map(([key, value]) => {
        const attribute = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
        if (!/^[a-z][a-z0-9-]*$/.test(attribute) || attribute.startsWith("on")) {
          throw new Error(`Unsupported standard icon attribute: ${key}`);
        }
        return ` ${attribute}="${escape(value)}"`;
      }).join("");
      return `<${tag}${attrs}/>`;
    }).join("");
    return `<symbol id="${name}" viewBox="0 0 24 24">${shapes}</symbol>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols}\n</svg>\n`;
}
