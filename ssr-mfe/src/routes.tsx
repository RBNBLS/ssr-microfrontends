import {
  isRouteErrorResponse,
  Link,
  Outlet,
  useLoaderData,
  useRouteError,
} from 'react-router'
import type { ReactNode } from 'react'
import { useT } from './i18n'
import type { RouteObject } from 'react-router'

type RenderedOn = 'server' | 'browser'

/** Where the calling loader is running. 'server' on a page load (fragment
 *  server or SSR preview); 'browser' on client-side navigation, standalone
 *  CSR, or when the shell's fragment fetch failed and the MFE mounted
 *  client-side instead. */
const renderedOn = (): RenderedOn =>
  typeof document === 'undefined' ? 'server' : 'browser'

export interface GreetingData {
  fetchedAt: string
  renderedOn: RenderedOn
}

// Stands in for a fetch() to a real API/BFF — the only backend-access
// pattern an MFE loader is allowed (architecture doc, rule 2).
async function fetchGreeting(): Promise<GreetingData> {
  return {
    fetchedAt: new Date().toISOString(),
    renderedOn: renderedOn(),
  }
}

function Frame({ children }: { children: ReactNode }) {
  const t = useT()
  return (
    <div style={{ border: '2px dashed #999', padding: 12, borderRadius: 8 }}>
      <strong>MFE1</strong> {t.tagline}
      <nav style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
        <Link to="/">{t.home}</Link>
        <Link to="/about">{t.about}</Link>
      </nav>
      {children}
    </div>
  )
}

function Layout() {
  return (
    <Frame>
      <Outlet />
    </Frame>
  )
}

// Replaces React Router's dev-only default screen. Keeps the frame and nav so
// an unknown path inside MFE1 is still navigable; the 404 itself reaches the
// shell as `status` on the fragment.
function ErrorBoundary() {
  const error = useRouteError()
  const t = useT()
  return (
    <Frame>
      <p>
        {isRouteErrorResponse(error) && error.status === 404
          ? t.notFound
          : t.error}
      </p>
    </Frame>
  )
}

function Home() {
  const loaderData = useLoaderData() as GreetingData
  const t = useT()
  return (
    <div>
      <p>{t.greeting}</p>
      <small>
        {t.renderedOn}: <strong>{loaderData.renderedOn}</strong> · {t.fetchedAt}{' '}
        {loaderData.fetchedAt}
      </small>
    </div>
  )
}

function About() {
  const { renderedOn } = useLoaderData() as { renderedOn: RenderedOn }
  const t = useT()
  return (
    <div>
      <p>{t.aboutText}</p>
      <small>
        {t.renderedOn}: <strong>{renderedOn}</strong>
      </small>
    </div>
  )
}

export const routes: Array<RouteObject> = [
  {
    path: '/',
    Component: Layout,
    ErrorBoundary,
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
