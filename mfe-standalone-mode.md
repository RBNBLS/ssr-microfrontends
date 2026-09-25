# MFE Standalone Mode

**For:** MFE developers working without the shell.
**Companion to:** `render-and-hydration-flow.md` (the same flow *with* the
shell).

---

## The one-line version

`npm run dev` in `ssr-mfe/` gives two dev pages. **:3001** renders in the
browser only — the fast loop. **:3002/preview** renders on the server and then
hydrates, the same path the shell takes. Both mount through the same
`clientEntry`.

| Page | Server render | Hydration | Router | basePath |
| --- | --- | --- | --- | --- |
| `:3001/*` | No — empty `#root` | No — `createRoot` | browser | `''` |
| `:3002/preview/*` | Yes — `serverEntry` | Yes — `hydrateRoot` | browser | `/preview` |
| Shell `:3000/:locale/mfe1/*` | Yes — `serverEntry` via `/__fragment` | Yes — `hydrateRoot` | memory (`host` set) | `/en/mfe1`, `/fr/mfe1` |

---

## Page 1 — `:3001`, client-only

`rsbuild dev` serves a generated `index.html` with an empty `#root`. Nothing
MFE-specific happens on the server.

```mermaid
sequenceDiagram
    participant B as Browser
    participant D as rsbuild dev (:3001)

    B->>D: GET /about
    D-->>B: index.html (empty #root, deferred scripts)<br/>historyApiFallback: any path → index.html
    B->>D: GET /static/js/index.js (+ vendor chunks)
    D-->>B: bundle of src/index.tsx
    B->>B: index.tsx: no #mfe-preview → clientEntry(root, { basePath: '' })
    B->>B: clientEntry: createBrowserRouter
    B->>B: #root empty → createRoot + render
    B->>B: loader runs in the browser → "rendered on: browser"
```

---

## Page 2 — `:3002/preview`, server render + hydrate

The fragment server renders the page itself and borrows the browser bundle
from :3001.

```mermaid
sequenceDiagram
    participant B as Browser
    participant F as Fragment server (:3002)
    participant D as rsbuild dev (:3001)

    B->>F: GET /preview/about
    par in parallel
        F->>F: serverEntry({ url, basePath: '/preview' })<br/>createStaticHandler → query → renderToString
    and
        F->>D: GET / (index.html)
        D-->>F: html with script/link tags
        F->>F: clientAssetTags(): copy tags from the document head
    end
    F-->>B: status from result.status (200 / 404)<br/>#root = server markup<br/>#mfe-preview = { data, basePath }<br/>+ copied script tags

    Note over B: markup visible now — before any JS runs

    B->>D: GET /static/js/index.js (+ vendor chunks)
    D-->>B: same bundle as Page 1
    Note over B: deferred scripts run after parsing,<br/>so #mfe-preview already exists
    B->>B: index.tsx: read #mfe-preview → clientEntry(root, { data, basePath })
    B->>B: clientEntry: createBrowserRouter with hydrationData
    B->>B: #root has children → hydrateRoot (reuses server DOM)
    Note over B: loader does NOT re-run — data came from the server
```

### Navigating after hydration

```mermaid
sequenceDiagram
    participant B as Browser
    participant F as Fragment server (:3002)

    B->>B: click "Home" → router navigates to /preview<br/>loader runs in browser → "rendered on: browser"
    B->>F: reload → GET /preview
    F-->>B: server-rendered again → "rendered on: server"
```

---

## What each file does

| File | Role in standalone mode |
| --- | --- |
| `ssr-mfe/src/server.ts` | `/preview/*`: calls `serverEntry`, embeds `{ data, basePath }` in `#mfe-preview`, copies :3001's script tags. |
| `ssr-mfe/src/index.tsx` | Browser entry for both pages. `#mfe-preview` present → pass its data; absent → `{ basePath: '' }`. |
| `ssr-mfe/src/clientEntry.tsx` | Unchanged. `hydrateRoot` if `#root` has children, `createRoot` otherwise. |
| `ssr-mfe/src/serverEntry.tsx` | Unchanged. Same function the shell calls through `/__fragment`. |

---

## What standalone mode does not cover

Only the shell exercises these:

- **`loadRemote("mfe1/clientEntry")`** — standalone imports `clientEntry`
  directly from its own bundle; Module Federation's remote loading is skipped.
- **Hosted mode** — no `host` is passed, so the MFE runs a browser router and
  owns `window.history`. Under the shell it runs a memory router and reports
  navigation through `host.onNavigate`.
- **Request headers** — the preview forwards none; the shell forwards all of
  them. A loader that depends on a cookie renders logged-out in the preview.
- **Document status policy** — the preview returns `status` directly; in the
  shell only the page mount adopts it.

If :3001 is not running, `/preview` still renders the server markup, with a
note that hydration is off.

Both pages stand in for the shell's locale choice with `?locale=` (default
`en`): `:3001/about?locale=fr`, `:3002/preview/about?locale=fr`.
