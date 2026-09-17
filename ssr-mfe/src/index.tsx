// Standalone dev entry — lets MFE devs run this app on its own at :3001,
// without the shell. Mounts through the same `clientEntry` the shell uses, so
// what you develop against is the real integration path.
//
// basePath is '' here because standalone the MFE owns the whole origin; the
// shell passes its own mount path in production.
import { clientEntry } from './clientEntry'

const rootEl = document.getElementById('root')
if (rootEl) {
  clientEntry(rootEl, { basePath: '' })
}
