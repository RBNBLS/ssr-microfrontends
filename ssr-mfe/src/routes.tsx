import { Link, Outlet, useLoaderData } from 'react-router'
import type { RouteObject } from 'react-router'

type RenderedOn = 'server' | 'browser'

/** Where the calling loader is running. 'server' on a page load (fragment
 *  server or SSR preview); 'browser' on client-side navigation, standalone
 *  CSR, or when the shell's fragment fetch failed and the MFE mounted
 *  client-side instead. */
const renderedOn = (): RenderedOn =>
  typeof document === 'undefined' ? 'server' : 'browser'

export interface GreetingData {
  message: string
  fetchedAt: string
  renderedOn: RenderedOn
}

// Stands in for a fetch() to a real API/BFF — the only backend-access
// pattern an MFE loader is allowed (architecture doc, rule 2).
async function fetchGreeting(): Promise<GreetingData> {
  return {
    message: 'Hello from MFE1.',
    fetchedAt: new Date().toISOString(),
    renderedOn: renderedOn(),
  }
}

function Layout() {
  return (
    <div style={{ border: '2px dashed #999', padding: 12, borderRadius: 8 }}>
      <strong>MFE1</strong> (own router, basename passed by the shell)
      <nav style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <Outlet />
    </div>
  )
}

function Home() {
  const loaderData = useLoaderData() as GreetingData
  return (
    <div>
      <p>{loaderData.message}</p>
      <small>
        rendered on: <strong>{loaderData.renderedOn}</strong> · fetched at{' '}
        {loaderData.fetchedAt}
      </small>
    </div>
  )
}

function About() {
  const { renderedOn } = useLoaderData() as { renderedOn: RenderedOn }
  return (
    <div>
      <p>MFE1 about route.</p>
      <small>
        rendered on: <strong>{renderedOn}</strong>
      </small>
    </div>
  )
}

export const routes: Array<RouteObject> = [
  {
    path: '/',
    Component: Layout,
    children: [
      {
        id: 'home',
        index: true,
        loader: fetchGreeting,
        Component: Home,
      },
      {
        path: 'about',
        // Direct load → 'server'; reached by clicking from Home → 'browser'.
        loader: () => ({ renderedOn: renderedOn() }),
        Component: About,
      },
    ],
  },
]
