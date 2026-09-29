# Forced-colors compatibility snapshot

Unmodified official `@hraness/design-kit` stylesheet for marketing actions and status-page actions. This narrow snapshot preserves this site's existing package version and normal light/dark appearance.

- Repository: https://github.com/hraness/design-kit
- Release: `v0.29.1`
- Commit: `3d28bc3ceceecd98e5ec1ccff57b7da0ec17539c`
- Source: [`src/marketing-forced-colors.css`](https://github.com/hraness/design-kit/blob/3d28bc3ceceecd98e5ec1ccff57b7da0ec17539c/src/marketing-forced-colors.css)
- CSS SHA-256: `11b42385c6a0380b1101a5504e6959fa432d3801cff2f29f2cdb718d3eb4925a`
- License: upstream MIT `LICENSE`, copied unchanged
- License SHA-256: `763eaf6783097cac7303f10321b33ffc6a88c35845ba1e592b6a750e4568c5e0`

Load after existing shared marketing styles. Keep product-specific overrides outside this snapshot, scoped to `@media (forced-colors: active)`. On refresh, verify both file digests against the immutable source and recheck primary/secondary action text, hover, and focus in normal and forced-colors modes.
