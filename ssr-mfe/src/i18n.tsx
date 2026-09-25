import { createContext, useContext, type ReactNode } from 'react'

// MFE1's own translations. The shell only says which locale; the words are
// this MFE's. Bundled statically because they're tiny — a larger MFE would
// load one file per locale before rendering.
const en = {
  tagline: '(own router, basename passed by the shell)',
  home: 'Home',
  about: 'About',
  greeting: 'Hello from MFE1.',
  aboutText: 'MFE1 about route.',
  renderedOn: 'rendered on',
  fetchedAt: 'fetched at',
  notFound: 'Not found.',
  error: 'Something went wrong.',
}

/** English defines the keys; every other locale must provide all of them. */
type Messages = Record<keyof typeof en, string>

const messages: Record<string, Messages> = {
  en,
  fr: {
    tagline: '(routeur propre, basename fourni par le shell)',
    home: 'Accueil',
    about: 'À propos',
    greeting: 'Bonjour de MFE1.',
    aboutText: 'Page « à propos » de MFE1.',
    renderedOn: 'rendu sur',
    fetchedAt: 'récupéré à',
    notFound: 'Introuvable.',
    error: 'Une erreur est survenue.',
  },
}

/** A locale this MFE has no translations for falls back to English. */
const messagesFor = (locale: string): Messages => messages[locale] ?? en

const I18n = createContext<Messages>(en)

export function I18nProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return <I18n.Provider value={messagesFor(locale)}>{children}</I18n.Provider>
}

export const useT = () => useContext(I18n)
