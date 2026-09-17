import { Links, Meta, Outlet, Scripts, Link, useLoaderData } from 'react-router'
import { buildMfeRegistry } from './mfeConfig.server'
import { registerMfeRemotes } from './mfeRegistry'
import { installServerGuards } from './serverGuards'

// Once per server process, before any request. No-op in the browser.
installServerGuards()

// Server-only: reads env, so it never reaches the browser bundle. React Router
// serialises the return value into the document as ordinary loader data, which
// is how the registry reaches the client — no bespoke global needed.
export function loader() {
  return { mfeRegistry: buildMfeRegistry() }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div style={{ display: 'flex', gap: 12, padding: 8, fontSize: 18 }}>
          <Link to="/">Home</Link>
          <Link to="/mfe1">MFE1</Link>
        </div>
        <hr />
        {children}
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  const { mfeRegistry } = useLoaderData<typeof loader>()

  // In render, not an effect — see registerMfeRemotes. Idempotent, so React's
  // double-render in development is harmless.
  registerMfeRemotes(mfeRegistry)

  return <Outlet />
}
