// The shell selects the locale; MFEs are told it through the contract's
// `context` and own their translations. Safe in both bundles.
//
// Selection order: the URL prefix (/fr/...), which is what crawlers index;
// for a bare "/", the `locale` cookie the picker sets; then the default.

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (value: unknown): value is Locale =>
  LOCALES.includes(value as Locale);

/** `/en/mfe1/about` → `/fr/mfe1/about`. */
export const withLocale = (pathname: string, locale: Locale) =>
  pathname.replace(/^\/[^/]+/, `/${locale}`);

export const LOCALE_COOKIE = "locale";

/** The locale for any matched route: its `:locale` param, or — on the
 *  catch-all 404 (`/fr/no-such-page`) — the first segment of the splat.
 *  Falls back to the default. */
export function localeFromParams(params: Record<string, string | undefined>): Locale {
  const candidate = params.locale ?? params["*"]?.split("/")[0];
  return isLocale(candidate) ? candidate : DEFAULT_LOCALE;
}
