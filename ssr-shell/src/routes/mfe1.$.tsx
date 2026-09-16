import { createFileRoute } from '@tanstack/react-router'
import { createClientOnlyFn, createServerOnlyFn } from '@tanstack/react-start'
import { getRequestHeaders, getRequestUrl } from '@tanstack/react-start/server'
import { useEffect, useRef, useState } from 'react'
import { peekHtml, putHtml } from '../utils/mfeHtmlStore'
import type { RenderResult } from '../federation/serverHost'

// The server-side federation host lives in its own rsbuild environment and
// therefore its own module graph — see rsbuild.config.ts `environments.mfHost`
// for why that separation is mandatory. `eval('require')` is what keeps it
// that way: a plain `import()`/`require()` here would pull the federation
// host back into Start's bundle, which is exactly what breaks it.
let mfHost: { renderMfe1: (input: unknown) => Promise<RenderResult> } | null =
  null

const loadMfe1 = createServerOnlyFn(async () => {
  if (!mfHost) {
    const nodeRequire = eval('require') as NodeRequire
    const { join } = nodeRequire('node:path') as typeof import('node:path')
    mfHost = nodeRequire(join(process.cwd(), 'dist/mf-host/index.js'))
  }

  const url = getRequestUrl()
  const headers = Object.fromEntries(getRequestHeaders().entries())

  const result = await mfHost!.renderMfe1({
    url: url.pathname + url.search,
    headers,
  })

  // `html` deliberately does NOT go into loader data — only a token does.
  // `data` and `head` do: MFE1's client router needs `data` to hydrate
  // without refetching, and both are small.
  return {
    data: result.data,
    head: result.head,
    htmlToken: putHtml(result.html),
  }
})

// Mirror image: `mfe1/clientEntry` is only exposed by MFE1's browser build,
// so the server compilation must never try to resolve it either.
const mountMfe1 = createClientOnlyFn(
  async (container: Element, data: unknown) => {
    const { clientEntry } = await import('mfe1/clientEntry')
    clientEntry(container, { data })
  },
)

type Mfe1LoaderData = {
  data: unknown
  head: { title: string }
  htmlToken: string
}

// Shell splat route: everything under /mfe1/* is delegated to MFE1's own
// router. This route only does two things: (1) on the initial SSR request,
// call the federated `serverEntry` in-process and embed its HTML/head, and
// (2) after hydration, hand the mount div to the federated `clientEntry` so
// MFE1's own router takes over. It never parses MFE1's routes itself.
export const Route = createFileRoute('/mfe1/$')({
  loader: async (): Promise<Mfe1LoaderData | null> => {
    // A client-side navigation *within* /mfe1/* (e.g. MFE1's own <Link>)
    // still re-matches this shell route with a new `_splat`, which would
    // re-run this loader — but the federation host is Node-only. Navigation
    // inside the MFE is entirely owned by MFE1's own router (its own history
    // instance), so the shell has nothing to do here on the client.
    if (typeof document !== 'undefined') return null

    return loadMfe1()
  },
  head: ({ loaderData }) =>
    loaderData?.head?.title ? { meta: [{ title: loaderData.head.title }] } : {},
  component: Mfe1Mount,
})

function Mfe1Mount() {
  const loaderData = Route.useLoaderData()
  // Captured once: this mount point must survive MFE-internal navigation
  // untouched by the shell (see loader comment above).
  const [initial] = useState(loaderData)
  // Resolved on the server only. On the client the container already holds
  // the server-rendered markup, so there is nothing to look up.
  const [ssrHtml] = useState(() =>
    typeof document === 'undefined' && initial?.htmlToken
      ? peekHtml(initial.htmlToken)
      : undefined,
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current || !containerRef.current) return
    mountedRef.current = true
    mountMfe1(containerRef.current, initial?.data)
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
