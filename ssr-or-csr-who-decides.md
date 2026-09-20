# SSR or CSR — who decides, and where

**For:** developers working on the shell or an MFE.
**Companion to:** `render-and-hydration-flow.md` (how a request flows end to end).
This one answers a narrower question: *for a given request, what makes an MFE
route server-rendered rather than client-rendered?*

---

## The short answer

Nobody decides. There is no flag, no per-route setting, no "SSR mode". Whether
an MFE route is server-rendered falls out of three structural facts about the
shell, stacked.

### 1. A URL maps to one shell route

```ts
// ssr-shell-rt/app/routes.ts
route(`${MFE1_SEGMENT}/*`, 'routes/mfe1.tsx')
```

The splat means every URL under `/mfe1` — `/mfe1`, `/mfe1/about`, `/mfe1/a/b` —
lands in the same shell route module. The shell does not know the MFE's route
table and does not need to.

### 2. That module has a `loader`, and the loader *is* the fragment call

```ts
// ssr-shell-rt/app/routes/mfe1.tsx
export async function loader({ request }) {
  const result = await fetchFragment(MFE1_FRAGMENT_URL, { url, headers, basePath })
  return { data: result.data, head: result.head, htmlToken: putHtml(result.html) }
}
```

Framework mode's rule: on a document request, every matched route's `loader`
runs **on the server, before rendering**. So "MFE1 is server-rendered" means
exactly and only: *the route that owns `/mfe1/*` has a loader that POSTs
`/__fragment`.* Delete that loader and MFE1 becomes client-rendered, with no
other change anywhere.

### 3. `shouldRevalidate` returns `false`

```ts
export function shouldRevalidate() { return false }
```

Once the user is inside `/mfe1/*`, the shell stops re-running that loader on
URL changes. Navigation within the MFE never reaches the shell's server; the
MFE's own router handles it in the browser.

---

## What that means per request

| Request | Shell loader runs? | `POST /__fragment`? | Who renders MFE1 |
| --- | --- | --- | --- |
| Page load `/mfe1/about` (typed URL, reload, crawler) | yes — server | yes | fragment server |
| Click the shell's **MFE1** link from `/` | yes — server, via a `.data` request | yes | `data` feeds `hydrationData`; the returned HTML is unused (container is empty, `clientEntry` mounts fresh) |
| Click **About** inside MFE1 | no | no | MFE's router, in the browser |
| Page load `/` | route not matched | no | — |

Two consequences worth stating plainly:

- **"Server-rendered" is true per page load, not per route.** Each full
  document fetch server-renders exactly one MFE route — whichever the URL
  points at. Everything reached by clicking afterwards is client-rendered.
  Refresh, and the cycle starts over from the new URL.
- **Every MFE route is therefore crawler-visible**, because a crawler only ever
  does the first row.

The `rendered on: server | browser` badge in MFE1's routes shows this live: the
loader records `typeof document === 'undefined'`. Land on `/mfe1/about`
directly → *server*. Reach it by clicking from Home → *browser*.

---

## One level down: the fragment server renders whatever it is handed

The same principle holds inside the MFE. `serverEntry` has no notion of which
of its routes "should" be SSR'd — it renders the URL it receives.

```ts
// ssr-mfe/src/serverEntry.tsx
const handler = createStaticHandler(routes, { basename: basePath })  // 1
const request = new Request(url, { headers })                        // 2
const context = await handler.query(request)                         // 3
const router  = createStaticRouter(handler.dataRoutes, context)      // 4
const html    = renderToString(                                      // 5
  <StaticRouterProvider router={router} context={context} hydrate={false} />,
)
return { html, data: context.loaderData, head }
```

| # | API | Library | What it does |
| --- | --- | --- | --- |
| 1 | `createStaticHandler(routes, { basename })` | React Router | The routing brain: can match a URL and run loaders. No React, no DOM, no history. `basename` makes `/mfe1/about` resolve to route `about`. |
| 2 | `new Request(url, { headers })` | Web standard | The handler speaks `Request`/`Response`, like `fetch`. Origin is a dummy; only the path matters. Headers ride along so loaders can forward auth/cookies. |
| 3 | `handler.query(request)` | React Router | The work: matches, runs every matching loader, waits, returns a **context** — `{ matches, loaderData, statusCode, … }`. Returns a `Response` instead if a loader redirected or threw one. |
| 4 | `createStaticRouter(handler.dataRoutes, context)` | React Router | Packages the result for React. `handler.dataRoutes` is the route table as the handler normalised it (ids assigned, defaults filled) — pass that, not the raw `routes`, so `useLoaderData()` finds its data by the same route id. "Static" = frozen at this URL; `createBrowserRouter`'s server-side twin. |
| 5 | `<StaticRouterProvider>` inside `renderToString` | React Router / **React DOM** | The provider puts the router in context so `<Outlet>`, `<Link>`, `useLoaderData` work. `renderToString` walks the tree once and emits HTML. `hydrate={false}` suppresses React Router's own `window.__staticRouterHydrationData` script — data goes back as a plain field instead, so no document-level global. |

One sentence: *handler decides and fetches, static router packages, provider
exposes, `renderToString` paints.*

---

## Verifying it like a crawler would

A crawler is an HTTP client that does not run JavaScript. That is `curl`, or
Postman with a bot User-Agent:

```sh
curl -s -A "Googlebot/2.1" localhost:3000/mfe1/about \
  | grep -o "<title>[^<]*\|rendered on: <strong>[a-z]*"
# <title>MFE1
# rendered on: <strong>server
```

The bot User-Agent matters slightly: the generated `entry.server.tsx` checks
`isbot()` and switches from `onShellReady` to `onAllReady`, buffering the full
document rather than streaming it. Same content here (nothing suspends), but it
is the crawler code path.

Repeat with the fragment server stopped: still `200`, but the MFE section is
empty in the body. That is what a crawler sees during an MFE outage — degraded
SEO for that fragment, shell still indexable.

Caveat on realism: Googlebot *does* render JavaScript in a deferred second pass,
so CSR content is late and unreliable rather than invisible. Bing, social
previews (Slack, LinkedIn, X) and most others do not render at all. The raw-body
test is the one that matters for those.

---

## A known inefficiency, recorded

Second row of the table: on client navigation *into* `/mfe1`, the fragment
server renders HTML the browser never uses — only `data` and `head` matter
there. Harmless at this size. If fragment renders become expensive, the request
could carry `render: false` for data requests. It is not a correctness issue.
