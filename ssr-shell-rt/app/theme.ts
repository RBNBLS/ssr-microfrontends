// The shell selects the theme — light or dark — and sets it on
// <html data-theme>. MFEs never receive it: they style with the tokens in
// @platform/mfe-contract/theme.css, so the attribute restyles them too.
//
// Stored in a cookie, not localStorage, because the server has to know it to
// render the attribute into the document: that's what makes the first paint
// right, with no flash and no hydration mismatch. Safe in both bundles.

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "light";
export const THEME_COOKIE = "theme";

export const isTheme = (value: unknown): value is Theme =>
  THEMES.includes(value as Theme);
