import {
  isRouteErrorResponse,
  Link,
  Outlet,
  useLoaderData,
  useRouteError,
  data,
} from 'react-router'
import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import { FormattedMessage } from 'react-intl'

// MFE2 is client-rendered only, so every loader runs in the browser — on the
// first mount as much as on navigation.
const renderedOn = () => (typeof document === 'undefined' ? 'server' : 'browser')

interface Item {
  id: string
  name: string
}

// Stands in for a fetch() to a real API/BFF. The delay is deliberate: it keeps
// the router in its "loading" state long enough to exercise the host sync,
// which must report only settled navigations (see clientEntry).
const ITEMS: Array<Item> = [
  { id: '1', name: 'Lamp' },
  { id: '2', name: 'Chair' },
  { id: '3', name: 'Desk' },
]
const api = <T,>(value: T) => new Promise<T>((r) => setTimeout(() => r(value), 150))

function Frame({ children }: { children: ReactNode }) {
  return (
    // Theme-token colours (styles.css): the shell's <html data-theme>
    // restyles this without MFE2 knowing the theme.
    <div className="mfetwo:rounded-lg mfetwo:border-2 mfetwo:border-dotted mfetwo:border-line mfetwo:bg-surface mfetwo:p-3 mfetwo:text-content">
      <strong>MFE2</strong> <FormattedMessage id="tagline" />
      <nav className="mfetwo:my-2 mfetwo:flex mfetwo:gap-2">
        <Link to="/"><FormattedMessage id="home" /></Link>
        <Link to="/items"><FormattedMessage id="items" /></Link>
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

function ErrorBoundary() {
  const error = useRouteError()
  return (
    <Frame>
      <p id="mfe2-page">
        {isRouteErrorResponse(error) && error.status === 404
          ? <FormattedMessage id="notFound" />
          : <FormattedMessage id="error" />}
      </p>
    </Frame>
  )
}

// Shown while the first loaders run in the browser — i.e. whenever there is
// no server data to hydrate from: always for a client-rendered MFE, and for a
// server-rendered one standalone or after its fragment fetch failed. Without
// it React Router renders nothing and warns.
function HydrateFallback() {
  return (
    <Frame>
      <p><FormattedMessage id="loading" /></p>
    </Frame>
  )
}

function Home() {
  const { renderedOn } = useLoaderData() as { renderedOn: string }
  return (
    <div id="mfe2-page">
      <p><FormattedMessage id="greeting" /></p>
      <small className="mfetwo:text-muted">
        <FormattedMessage id="renderedOn" />: <strong>{renderedOn}</strong>
      </small>
    </div>
  )
}

function Items() {
  const { items } = useLoaderData() as { items: Array<Item> }
  return (
    <div id="mfe2-page">
      <h3><FormattedMessage id="itemsTitle" /></h3>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/items/${item.id}`}>{item.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ItemDetail() {
  const { item } = useLoaderData() as { item: Item }
  return (
    <div id="mfe2-page">
      <h3><FormattedMessage id="itemTitle" values={{ id: item.id }} />: {item.name}</h3>
      <Link to="/items"><FormattedMessage id="back" /></Link>
    </div>
  )
}

export const routes: Array<RouteObject> = [
  {
    path: '/',
    Component: Layout,
    ErrorBoundary,
    HydrateFallback,
    children: [
      { index: true, loader: () => api({ renderedOn: renderedOn() }), Component: Home },
      { path: 'items', loader: () => api({ items: ITEMS }), Component: Items },
      {
        path: 'items/:id',
        loader: async ({ params }) => {
          const item = await api(ITEMS.find((i) => i.id === params.id))
          if (!item) throw data(null, { status: 404 })
          return { item }
        },
        Component: ItemDetail,
      },
    ],
  },
]
