import { installAppearanceMenus } from "@hraness/design-kit/browser";

// This small head script applies the saved/System appearance before CSS paints.
// The shared installer waits for parsed markup and owns the entire menu behavior.
installAppearanceMenus({
  darkThemeColor: "#1a1b26",
  lightThemeColor: "#e1e2e7",
  storageKey: "algal-appearance",
});
