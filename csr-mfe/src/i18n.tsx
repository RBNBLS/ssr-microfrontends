import type { ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import en from './locales/en.json'
import frMessages from './locales/fr.json'

// MFE2's own translations. The shell only says which locale (`context.locale`,
// a BCP 47 tag); the words are this MFE's.

// English defines the keys; every other locale must provide all of them — a
// missing one fails typecheck.
const fr: Record<keyof typeof en, string> = frMessages

const messages: Record<string, typeof en> = { en, fr }

/**
 * react-intl keeps everything in the provider — no global instance, no
 * language detection, synchronous — so each server render and each browser
 * mount gets its own, fixed to the shell's locale. A locale this MFE has no
 * translations for gets English text, still formatted for the requested locale.
 */
export function I18nProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return (
    <IntlProvider locale={locale} defaultLocale="en" messages={messages[locale] ?? en}>
      {children}
    </IntlProvider>
  )
}

// Types message ids from the English file: `id: 'greting'` is a compile error.
declare global {
  namespace FormatjsIntl {
    interface Message {
      ids: keyof typeof en
    }
  }
}
