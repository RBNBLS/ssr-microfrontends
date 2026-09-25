import {
  isRouteErrorResponse,
  Link,
  Outlet,
  useLoaderData,
  useRouteError,
} from 'react-router'
import type { ReactNode } from 'react'
import { FormattedMessage } from 'react-intl'
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
  return (
    // Theme-token colours (styles.css): the shell's <html data-theme>
    // restyles this without MFE1 knowing the theme.
    <div className="mfeone:rounded-lg mfeone:border-2 mfeone:border-dashed mfeone:border-line mfeone:bg-surface mfeone:p-3 mfeone:text-content">
      <strong>MFE1</strong> <FormattedMessage id="tagline" />
      <nav className="mfeone:my-2 mfeone:flex mfeone:gap-2">
        <Link to="/"><FormattedMessage id="home" /></Link>
        <Link to="/about"><FormattedMessage id="about" /></Link>
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
  return (
    <Frame>
      <p>
        {isRouteErrorResponse(error) && error.status === 404
          ? <FormattedMessage id="notFound" />
          : <FormattedMessage id="error" />}
      </p>
    </Frame>
  )
}

function Home() {
  const loaderData = useLoaderData() as GreetingData
  return (
    <div>
      <p><FormattedMessage id="greeting" /></p>
      <small>
        <FormattedMessage id="renderedOn" />: <strong>{loaderData.renderedOn}</strong> · <FormattedMessage id="fetchedAt" />{' '}
        {loaderData.fetchedAt}
      </small>
    </div>
  )
}

function About() {
  const { renderedOn } = useLoaderData() as { renderedOn: RenderedOn }
  return (
    <div>
      <p><FormattedMessage id="aboutText" /></p>
      <small>
        <FormattedMessage id="renderedOn" />: <strong>{renderedOn}</strong>
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
