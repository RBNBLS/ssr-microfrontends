import { useIntl } from "react-intl";
import { useLocation, useNavigate } from "react-router";
import { LOCALE_COOKIE, LOCALES, withLocale, type Locale } from "../locale";

// A plain navigation: the new URL re-selects the locale, and the MFE route's
// `shouldRevalidate` refetches its fragment for it. Nothing subscribes.
export function LocalePicker({ locale }: { locale: Locale }) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  return (
    <select
      name="locale"
      aria-label={intl.formatMessage({ id: "locale.label" })}
      value={locale}
      onChange={(e) => {
        const next = e.target.value as Locale;
        // Remembered for a bare "/" (routes/locale-redirect.tsx).
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        void navigate(withLocale(pathname, next) + search);
      }}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {l.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
