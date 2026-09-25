// Standalone dev page at :3003 — lets MFE2 devs work without the shell. Mounts
// through the same `clientEntry` the shell uses, so what you develop against
// is the real integration path. MFE2 has no server, so there is no SSR
// preview: this page is the whole story.
//
// Standing in for the shell: `?locale=fr`, `?theme=dark`. Nothing else defines
// the theme tokens standalone; under the shell, the shell does.
import '@platform/mfe-contract/theme.css'
import { clientEntry } from './clientEntry'

const params = new URLSearchParams(location.search)
const theme = params.get('theme')
if (theme) document.documentElement.dataset.theme = theme
// The page around MFE2, as the shell's <body> would be.
document.body.style.background = 'var(--theme-bg)'
document.body.style.color = 'var(--theme-fg)'

const rootEl = document.getElementById('root')
if (rootEl) {
  clientEntry(rootEl, {
    basePath: '',
    context: { locale: params.get('locale') ?? 'en' },
  })
}
