import { useIntl } from "react-intl";
import { useRevalidator } from "react-router";
import { writeCookie } from "../cookies";
import { THEME_COOKIE, THEMES, type Theme } from "../theme";

// No navigation and no MFE re-render: the attribute changes and CSS restyles
// everything, MFEs included. The revalidation only brings the root loader's
// data in line with the cookie — the MFE route's `shouldRevalidate` keeps its
// fragment from being refetched.
export function ThemePicker({ theme }: { theme: Theme }) {
  const intl = useIntl();
  const { revalidate } = useRevalidator();
  return (
    <select
      name="theme"
      aria-label={intl.formatMessage({ id: "theme.label" })}
      value={theme}
      onChange={(e) => {
        const next = e.target.value as Theme;
        writeCookie(THEME_COOKIE, next);
        document.documentElement.dataset.theme = next; // instant, before the loader
        void revalidate();
      }}
    >
      {THEMES.map((t) => (
        <option key={t} value={t}>
          {intl.formatMessage({ id: `theme.${t}` })}
        </option>
      ))}
    </select>
  );
}
