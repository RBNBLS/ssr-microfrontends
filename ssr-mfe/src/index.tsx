// Standalone dev entry — lets MFE devs run this app on its own, without the
// shell. Mounts through the same `clientEntry` the shell uses, so what you
// develop against is the real integration path.
//
// Two pages load it:
//   :3001          — client-only; basePath '' since the MFE owns the origin.
//   :3002/preview  — server-rendered by the fragment server, which leaves its
//                    loader data in #mfe-preview; `clientEntry` then hydrates,
//                    as it does under the shell.
//
// Standing in for the shell, both take the locale from `?locale=` (default en).
// Standalone, nothing else defines the theme tokens; under the shell, the
// shell does. `?theme=dark` stands in for the shell's choice.
import '@platform/mfe-contract/theme.css'
import { clientEntry } from './clientEntry'

const theme = new URLSearchParams(location.search).get('theme')
if (theme) document.documentElement.dataset.theme = theme
// The page around MFE1, as the shell's <body> would be (and /preview's is).
document.body.style.background = 'var(--theme-bg)'
document.body.style.color = 'var(--theme-fg)'

const rootEl = document.getElementById('root')
const preview = document.getElementById('mfe-preview')
if (rootEl) {
  clientEntry(
    rootEl,
    preview
      ? JSON.parse(preview.textContent ?? '')
      : {
          basePath: '',
          context: {
            locale: new URLSearchParams(location.search).get('locale') ?? 'en',
          },
        },
  )
}
