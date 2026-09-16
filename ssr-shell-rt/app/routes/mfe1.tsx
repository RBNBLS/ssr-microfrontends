import { useEffect, useRef, useState } from 'react'
import { useLoaderData } from 'react-router'
import { MFE1_BASE, MFE_SSR_TIMEOUT_MS } from '../mfeConfig'
import { peekHtml, putHtml } from '../mfeHtmlStore'

/**
 * Stops waiting after `ms`. Note this does not cancel the underlying work —
 * the MFE's render keeps running to completion in the background; we simply
 * stop blocking the response on it.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`MFE SSR exceeded ${ms}ms budget`)),
          ms,
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

// In framework mode `loader` is server-only by construction — React Router
// strips it from the client bundle — so the Node-only federated import needs
// no `createServerOnlyFn` equivalent.
export async function loader({ request }: { request: Request }) {
  try {
    const { serverEntry } = await import('mfe1/serverEntry')
    const url = new URL(request.url)

    const result = await withTimeout(
      serverEntry({
        url: url.pathname + url.search,
        headers: Object.fromEntries(request.headers.entries()),
        basePath: MFE1_BASE,
      }),
      MFE_SSR_TIMEOUT_MS,
    )

    // `html` deliberately does NOT go into loader data — only a token does.
    // `data` and `head` do: the MFE's client router needs `data` to hydrate
    // without refetching, and both are small.
    return {
      data: result.data,
      head: result.head,
      htmlToken: putHtml(result.html),
    }
  } catch (error) {
    // The MFE is a fragment, not the page. A broken or slow one costs SEO for
    // that fragment and falls back to client rendering — it must never take
    // down the shell's response.
    console.error('[shell] MFE1 server render failed, falling back to CSR:', error)
    return null
  }
}

// Navigation *within* the MFE is owned by its own router; don't re-run
// the shell loader (which would re-render the MFE server-side).
export function shouldRevalidate() {
  return false
}

// NB: React Router 8 names this `loaderData` (it was `data` in v7).
export function meta({
  loaderData,
}: {
  loaderData?: { head?: { title?: string } } | null
}) {
  return loaderData?.head?.title ? [{ title: loaderData.head.title }] : []
}

export default function Mfe1Mount() {
  const initial = useLoaderData<typeof loader>()
  // Resolved on the server only. On the client the container already holds the
  // server-rendered markup, so there is nothing to look up. Null when SSR
  // failed — the container renders empty and the MFE mounts client-side.
  const [ssrHtml] = useState(() =>
    typeof document === 'undefined' && initial
      ? peekHtml(initial.htmlToken)
      : undefined,
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current || !containerRef.current) return
    mountedRef.current = true
    const container = containerRef.current

    import('mfe1/clientEntry')
      .then(({ clientEntry }) => {
        clientEntry(container, {
          data: initial?.data,
          basePath: MFE1_BASE,
        })
      })
      .catch((error) => {
        console.error('[shell] MFE1 client entry failed to load:', error)
      })
  }, [initial])

  return (
    <div
      id="mfe1-root"
      ref={containerRef}
      // The container's contents are owned by MFE1, not by this React tree:
      // server-rendered here, then hydrated by MFE1's own root. React does not
      // write innerHTML during hydration, so the server markup survives the
      // client's empty value; suppressHydrationWarning silences the dev-only
      // mismatch notice for that intentional difference.
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: ssrHtml ?? '' }}
    />
  )
}
