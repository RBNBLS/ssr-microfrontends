import type { ReactNode } from "react";
import { createIntl, IntlProvider } from "react-intl";
import { DEFAULT_LOCALE, type Locale } from "./locale";
import en from "./locales/en.json";
import frMessages from "./locales/fr.json";

// The shell's own text. MFEs translate theirs; this covers only what the
// shell renders — navigation, the picker, not-found, titles.

// English defines the keys; every other locale must provide all of them — a
// missing one fails typecheck.
const fr: Record<keyof typeof en, string> = frMessages;

const messages: Record<Locale, typeof en> = { en, fr };

/** react-intl keeps its state in the provider — no global, no detection — so
 *  each server render gets its own, fixed to the URL's locale. */
export function ShellIntl({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <IntlProvider locale={locale} defaultLocale={DEFAULT_LOCALE} messages={messages[locale]}>
      {children}
    </IntlProvider>
  );
}

/** For code outside the React tree, like `meta`. A plain object per call. */
export function intlFor(locale: Locale) {
  return createIntl({ locale, defaultLocale: DEFAULT_LOCALE, messages: messages[locale] });
}

// Types message ids from the English file.
declare global {
  namespace FormatjsIntl {
    interface Message {
      ids: keyof typeof en;
    }
  }
}
