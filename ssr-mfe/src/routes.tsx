import { Link, Outlet, useLoaderData } from 'react-router'
import type { RouteObject } from 'react-router'

export interface GreetingData {
  message: string
  fetchedAt: string
}

// Stands in for a fetch() to a real API/BFF — the only backend-access
// pattern an MFE loader is allowed (architecture doc, rule 2).
async function fetchGreeting(): Promise<GreetingData> {
  return {
    message: 'Hello from MFE1 — this content was rendered on the server.',
    fetchedAt: new Date().toISOString(),
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
      <small>fetched at {loaderData.fetchedAt}</small>
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
        Component: () => <p>MFE1 about route — client-side navigation.</p>,
      },
    ],
  },
]
