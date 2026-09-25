import { FormattedMessage } from 'react-intl'
import { data } from 'react-router'
import { intlFor } from '../i18n'
import { localeFromParams } from '../locale'
import type { Route } from './+types/not-found'

// Returned, not thrown: a thrown 404 is an error and gets logged by the
// framework's default handleError; a returned one is just a response whose
// status is 404.
export function loader() {
  return data(null, { status: 404 })
}

// `/fr/no-such-page` lands here with no `:locale` param; the helper reads it
// from the splat so the 404 is in the visitor's language.
export function meta({ params }: Route.MetaArgs) {
  return [{ title: intlFor(localeFromParams(params)).formatMessage({ id: 'notFound.title' }) }]
}

export default function NotFound() {
  return (
    <p style={{ padding: 8 }}>
      <FormattedMessage id="notFound.body" />
    </p>
  )
}
