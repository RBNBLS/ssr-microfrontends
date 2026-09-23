// Standalone dev entry — lets MFE devs run this app on its own, without the
// shell. Mounts through the same `clientEntry` the shell uses, so what you
// develop against is the real integration path.
//
// Two pages load it:
//   :3001          — client-only; basePath '' since the MFE owns the origin.
//   :3002/preview  — server-rendered by the fragment server, which leaves its
//                    loader data in #mfe-preview; `clientEntry` then hydrates,
//                    as it does under the shell.
import { clientEntry } from './clientEntry'

const rootEl = document.getElementById('root')
const preview = document.getElementById('mfe-preview')
if (rootEl) {
  clientEntry(
    rootEl,
    preview ? JSON.parse(preview.textContent ?? '') : { basePath: '' },
  )
}
