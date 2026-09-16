// Short-lived server-side handoff for federated MFE markup.
//
// The MFE's rendered HTML must reach the document, but it must NOT reach the
// route's loader data — Start serializes all loader data into the page for
// hydration, which would ship the entire MFE document a second time on every
// request. The loader stores the HTML here and returns only a token.
//
// This module is isomorphic-safe (it only touches a Map and crypto.randomUUID)
// but is used exclusively during SSR; on the client the DOM already holds the
// markup, so nothing reads from it.

const TTL_MS = 10_000

const store = new Map<string, { html: string; at: number }>()

function sweep() {
  const cutoff = Date.now() - TTL_MS
  for (const [token, entry] of store) {
    if (entry.at < cutoff) store.delete(token)
  }
}

export function putHtml(html: string): string {
  sweep()
  const token = crypto.randomUUID()
  store.set(token, { html, at: Date.now() })
  return token
}

/**
 * Non-destructive on purpose: React can render a component more than once
 * during a streaming/Suspense retry, and a take-and-delete read would return
 * undefined on the second pass. Entries expire via `sweep()` instead.
 */
export function peekHtml(token: string): string | undefined {
  return store.get(token)?.html
}
