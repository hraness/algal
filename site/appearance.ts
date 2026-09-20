import { installAppearanceMenus } from "@hraness/design-kit/browser";

// This small head script applies the saved/System appearance before CSS paints.
// The shared installer waits for parsed markup and owns the entire menu behavior.
installAppearanceMenus({
  darkThemeColor: "#12100f",
  lightThemeColor: "#f8f7f4",
  storageKey: "algal-appearance",
});
