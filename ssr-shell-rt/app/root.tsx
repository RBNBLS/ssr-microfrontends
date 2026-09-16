import { Links, Meta, Outlet, Scripts, Link } from 'react-router'
import { installServerGuards } from './serverGuards'

// Once per server process, before any request. No-op in the browser.
installServerGuards()

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
  return <Outlet />
}
