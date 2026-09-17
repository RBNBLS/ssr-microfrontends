# MFE SSR — Architecture Decision Record & PoC Findings

**Date:** 2026-09-16
**Status:** Implemented and verified end-to-end in this repo.
**Supersedes:** `library-framework-decision.md`, `mfe-ssr-poc-synthesis.md`,
`per-mfe-server-variant.md` (all consolidated here).
**Amends:** the original `tanstack-start-mfe-ssr-architecture.md` — see
*Divergence* (§5). That file is no longer present in this repo; §5 records what
it specified and where the implementation departs from it.

---

## 1. Summary

A shell application owns the document and is server-rendered for SEO. Each
micro-frontend is an independently deployed service that renders **HTML
fragments** on request. The shell fetches those fragments over HTTP during its
own SSR, embeds them, and after hydration hands each mount point to the MFE's
own client bundle, which takes over routing beneath its mount path.

```
Browser
   │
   ▼
┌─────────────────────────────┐        POST /__fragment
│  Shell (React Router FW)    │ ──────────────────────────►  MFE1 fragment server
│  • owns the document        │ ◄──────────────────────────  { html, data, head }
│  • only SEO-bearing SSR     │        (own process)
│  • splat route /mfe1/*      │
└─────────────────────────────┘ ──────────────────────────►  MFE2, MFE3 …
   │
   │  browser: Module Federation (dependency sharing only)
   ▼
MFE1 clientEntry ── hydrates its own subtree, owns routing under /mfe1/*
```

**The contract, unchanged across every variant we tested:**

```
{ url, headers, basePath }  →  { html, data, head }
```

---

## 2. Why this architecture

This section is the point of the document. Each decision below was forced by
something we hit, not chosen on preference.

### 2.1 Exactly one thing can own the document

An HTML document has one `<html>`, one `<head>`, one hydration lifecycle. That
single fact drives everything else: the shell owns the document, and MFEs
contribute **fragments** into it.

### 2.2 Therefore an MFE cannot be a full SSR framework

A framework that owns the document assumes it is alone on the page. Concretely:

- TanStack Start emits complete documents — `<!DOCTYPE html>` wrapping, plus
  hydration scripts injected before `</body>`. There is no fragment contract, so
  embedding one means scraping a document.
- Frameworks hydrate through a single document-level global. Start's is `$_TSR`
  — hardcoded, and deleted once hydration completes. Two such apps on one page
  contend over it.

**This holds whether or not the MFE has a server.** The collision is in the
browser, and servers do not change the browser. It is the one constraint that
survived every change of approach.

### 2.3 Therefore MFEs use React Router in *library* mode

We tested the alternative. TanStack Router without Start produced `matches: []`
and an **empty HTML string**: its SSR path needs a bootstrap sequence
(`attachRouterServerSsrUtils` → `load()` → `serverSsr.dehydrate()`) whose methods
are annotated `/** Framework-only. */` in the library's own source. Finishing
that by hand means privately reimplementing Start's server handler against
internals with no stability guarantee — and it drags `$_TSR` back in.

React Router's `createStaticHandler` / `createStaticRouter` /
`StaticRouterProvider` exist precisely to be driven by an arbitrary host. With
`hydrate={false}`, hydration data is passed explicitly as plain values and no
document-level global is involved.

**Why library mode and not React Router framework mode for MFEs:** framework
mode is also a document-owning framework, so §2.2 applies to it equally.

### 2.4 Therefore MFEs own their servers

Originally the shell loaded MFE code into its own process via server-side
Module Federation. It worked, but every hard failure in the PoC traced to that
one design choice:

| Failure | Root cause |
| --- | --- |
| Every shell route 500'd with `__webpack_modules__[moduleId] is not a function` | The MF plugin rewrites the host environment to `chunkLoading: 'async-node'`, breaking the shell framework's own chunk loading |
| Shell **process died** when an MFE was unreachable | MF's `SnapshotHandler` rejects an internal floating promise; Node terminates on unhandled rejection |
| MFE edits required restarting the shell | Remote containers are cached in-process |
| Cross-request state, shared globals, shared memory, shared crash blast radius | Another team's code executing in your process |
| `--experimental-vm-modules`, a static server for the node build, `assetPrefix` juggling, a separate federation compilation | Consequences of loading remote code into the server |

All of it is one problem wearing different hats: **executing another team's code
inside your server process.** Moving MFEs behind HTTP removes the entire class.
A failed fetch is an ordinary rejected promise.

The cost is real — N services to operate, a network hop inside SSR — and that is
the trade this architecture accepts deliberately.

### 2.5 "Owns a server" does not mean "needs a framework"

The MFE's server has one job: accept a request, return `{ html, data, head }`.
The function already existed, so the server is a thin wrapper around it — Node's
built-in `http`, no framework, no new dependency. The MFE got *simpler* when it
gained a server.

This also removes the "you'd have to scrape HTML out of a document" objection:
the fragment endpoint is designed on purpose rather than parsed after the fact.

### 2.6 Module Federation is kept — but only in the browser

Server-side federation is what caused the damage above. Client-side federation
is well-supported and earns its place: it keeps `react`, `react-dom` and
`react-router` as shared singletons, so the page carries one copy of each rather
than one per MFE.

### 2.7 The shell is React Router framework mode

With MFEs on React Router library mode, a React Router shell makes
`react-router` a genuine singleton across shell and MFEs. TanStack Start would
mean shipping two router libraries with no way to dedupe them.

> **Revisit this one.** The shell runs on rsbuild because *server-side* Module
> Federation only works properly on rspack. That constraint no longer exists —
> we removed server-side federation in §2.4. So Vite is now viable, which would
> replace `rsbuild-plugin-react-router` (pre-1.0, federation flagged
> experimental) with React Router's first-party Vite plugin. This is the one
> open architectural question remaining.

---

## 3. The implemented system

### Components

| Project | Role | Ports |
| --- | --- | --- |
| `ssr-shell-rt` | Shell. React Router framework mode on rsbuild. Owns the document and URL space. | 3000 |
| `ssr-mfe` | MFE1. React Router library mode + fragment server. | 3001 browser bundle, 3002 fragment server |

### MFE endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /__fragment` | The contract. `{url, headers, basePath}` → `{html, data, head}` |
| `GET /?path=…` | SSR preview — lets an MFE developer inspect their own server output without the shell |
| `GET /health` | Liveness |

### How each half of the contract is typed

The two halves are typed by different mechanisms, which is worth knowing when
one of them drifts:

- **Browser half** (`clientEntry`) — types are **generated** by Module
  Federation's DTS plugin into `@mf-types/`, derived from MFE1's actual
  exports, and augment `loadRemote` so the call site is type-checked. Nothing
  hand-maintained, so it cannot drift from the remote.
- **Server half** (`/__fragment`) — an HTTP boundary, so it is typed by hand on
  the shell side. This one *can* drift and is the half that needs versioning
  discipline: additive changes first, and a version field when it stops being
  additive.

### Request sequence

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Shell SSR Server
    participant M as MFE1 Fragment Server
    participant A as API / BFF

    B->>S: GET /mfe1/orders
    S->>S: match /mfe1/* splat route
    S->>M: POST /__fragment { url, headers, basePath }
    M->>M: createStaticHandler().query(request)
    M->>A: fetch orders (forwarded headers)
    A-->>M: data
    M->>M: renderToString
    M-->>S: { html, data, head }
    S->>S: merge head, embed html,<br/>keep html out of hydration payload
    S-->>B: HTML document (shell + MFE fragment)

    B->>B: hydrate shell
    B->>M: GET clientEntry bundle (Module Federation)
    M-->>B: JS
    B->>B: clientEntry(container, { data, basePath })
    Note over B: MFE hydrates its own subtree,<br/>then owns routing under /mfe1/*
```

### Ownership boundary

- **Shell owns** the document, the URL space, which path each MFE occupies, and
  `<head>` composition.
- **MFE owns** everything beneath its mount path: routes, navigation, data
  fetching, and its own rendering.

`basePath` is passed in rather than hardcoded, so an MFE can be relocated or
mounted more than once without an MFE release.

### Resilience

The shell treats an MFE as a fragment, never as the page:

- Per-MFE timeout via `AbortSignal.timeout` — genuinely cancels the request.
- Any failure or non-2xx degrades that fragment to client-side rendering; the
  page still renders.
- A process-level `unhandledRejection` guard, installed once at boot.

**Verified:** with the MFE server down, `/mfe1` returns 200 with a degraded
fragment, the shell stays alive across repeated requests, and it recovers
automatically when the MFE returns — no restart.

---

## 4. How we got here — paths tested

| # | Path | Result | Evidence |
| --- | --- | --- | --- |
| 1 | MF attached to the shell framework's own SSR environment | ❌ | Every route 500s inside the framework's own `loadEntries()` |
| 2 | MF in a separate compilation, loaded via runtime `require` | ✅ worked | Needed 6 permanent workarounds |
| 3 | MFE on TanStack Router, no Start | ❌ | `matches: []`, empty HTML |
| 4 | MFE on React Router library mode | ✅ | Full SSR + loader data; **zero shell changes required** |
| 5 | MFE on TanStack Start | ⛔ reasoned | §2.2 — owns the document |
| 6 | Vite instead of rsbuild | ⛔ researched | `@module-federation/vite` is CSR-oriented with documented SSR incompatibilities |
| 7 | Shell on React Router framework mode | ✅ | MF attaches directly to its `node` env; no separate compilation |
| 8 | **MFEs own their servers** | ✅ **adopted** | Eliminated every failure in §2.4 |

Notable negative result: `experiments.asyncStartup: true` did **not** fix path 1,
with or without eager sharing — it addresses share-scope timing, not chunk
loading. Recorded so nobody repeats it.

Path 4 proved the contract is router-agnostic: swapping the MFE's router
required no shell change at all. That property is what later made the transport
swap in path 8 cheap.

---

## 5. Divergence from the original architecture doc

`tanstack-start-mfe-ssr-architecture.md` should be amended. Four of its
statements no longer hold:

| Original | Now |
| --- | --- |
| "One SSR server" | Shell + one server per SSR-capable MFE |
| "No route-level reverse proxy between applications" | The shell fetches fragments over HTTP |
| **Rule 1:** no MFE-owned server | **Dropped.** MFEs own a fragment server — but still no MFE-owned *application* server, no `createServerFn`, no MFE-owned API routes |
| "Runtime Module Federation remains the MFE integration mechanism" | Browser only. Server integration is HTTP |

What survives unchanged: MFEs contain universal React; they reach backends only
through APIs/BFFs; code must be SSR-safe; React/React-DOM/router are shared
singletons in the browser; the federation contract stays explicit — and on the
browser side is now machine-generated from the MFE's own exports rather than
hand-written, so it cannot silently drift.

**One rule to add:** MFE server code must hold no mutable module-scope state.
The fragment server handles many requests in one process, so module-level
mutable state leaks across users.

---

## 6. Accepted trade-offs

- **Operational cost.** N services to deploy, monitor, scale and secure. This is
  the price of the isolation in §2.4.
- **Latency inside SSR.** Each fragment is a network round trip. Mitigated by
  per-MFE timeouts; parallelise when a page carries several MFEs.
- **Two router libraries would ship** if the shell ever moves to TanStack Start.
  Current choice avoids this.
- **Server-side dependency sharing does not exist** and is not needed — the
  server boundary is a serialized string, so instance identity never matters.

---

## 7. Known gaps

1. **Browser hydration is unverified.** SSR output, loader data and head merging
   are all confirmed; `hydrateRoot` matching without warnings is not. Watch
   specifically that `#mfe1-root` keeps its children through shell hydration —
   the container renders with empty `__html` on the client and relies on React
   not writing `innerHTML` during hydration.
2. **Version skew between server and browser.** A deploy can leave the fragment
   server on one version while browsers still load the previous client bundle.
   Needs a deliberate strategy.
3. **Request context is minimal.** Only `headers` crosses today. Locale, user,
   tenant and feature flags will need an explicit, versioned slot — keep it
   small or it becomes a dumping ground.
4. **`validate:mfe` is unbuilt.** Should cover: no mutable module-scope state
   (a concurrency smoke test catches the realistic cases), no global mutation,
   SSR safety, and pinned versions.
5. **The shell's bundler is revisitable** — see the callout in §2.7.

---

## 8. Operating notes

Node ≥ 22.22 (React Router 8); both projects pin 24.21.0 via `.nvmrc`.

```sh
cd ssr-mfe      && nvm use && npm run dev   # 3001 browser, 3002 fragment server
cd ssr-shell-rt && nvm use && npm run dev   # 3000
```

Gotchas discovered, all recorded in the project READMEs:

- `NODE_OPTIONS=--experimental-vm-modules` is required by **rsbuild's dev
  runner** for ESM server bundles — not, as first assumed, by Module Federation.
- **`dts.consumeTypes.abortOnError` must stay `false`.** The DTS watcher fetches
  remote manifests in the build tooling process, outside any request. With the
  default it takes the entire dev server down when an MFE is unreachable — a
  normal local state now that MFEs are separate services. Our process-level
  `unhandledRejection` guard does **not** cover this: it lives in the app's
  server bundle, not the build tooling.
- The browser remote is loaded with `loadRemote('mfe1/clientEntry')` from
  `@module-federation/enhanced/runtime`, not a bare `import()`. The specifier is
  then a runtime string, so the server compilation has nothing to resolve. A
  static import instead requires marking it external on the node build, because
  the route component ships to both environments even though the call sits in a
  `useEffect` that never runs server-side.
- `@mf-types` must be in `tsconfig.json`'s `include` — that is what makes
  TypeScript pick up MF's module augmentation for `loadRemote`. It is generated,
  so it is also in `.gitignore`.
- `@react-router/dev`'s typegen imports Vite, so `vite` is a required
  devDependency even under rsbuild.
- React Router 8 renamed the `meta` argument from `data` to `loaderData`.
- MFE rendered HTML is passed to the component through a short-lived token
  store, never through loader data — otherwise the framework serializes the
  whole fragment into the page a second time.

---

## 9. References

**Build tooling**
- [`rsbuild-plugin-react-router`](https://github.com/rstackjs/rsbuild-plugin-react-router) — 0.7.1, MIT, community-maintained
- [Module Federation in that plugin](https://deepwiki.com/rspack-contrib/rsbuild-plugin-react-router/5.4-module-federation)
- [`@module-federation/rsbuild-plugin`](https://www.npmjs.com/package/@module-federation/rsbuild-plugin)
- [MF Rsbuild guide](https://module-federation.io/guide/build-plugins/plugins-rsbuild)
- [MF on Node.js](https://module-federation.io/blog/node)

**Rejected paths**
- [React Router discussion #13444 — MF with Vite](https://github.com/remix-run/react-router/discussions/13444)
- [Modern.js — first-class MF + SSR](https://modernjs.dev/guides/topic-detail/module-federation/ssr) — the only stack where neither half is glue; not evaluated, would be a larger framework commitment

**Repo**
- `ssr-shell-rt/` — the shell
- `ssr-mfe/` — MFE1, including its fragment server
- `ssr-shell/` — earlier TanStack Start shell with in-process federation, kept as reference; behind on later fixes

---

## 10. Appendix — why "Start shell + TanStack Router MFE" fails

This pairing looks like the obvious middle ground: keep TanStack Start where it
works (the shell) and drop to plain TanStack Router where a framework cannot go
(the MFE). It does not work, and it fails twice.

### Blocker 1 — TanStack Router cannot server-render on its own

Tested directly:

```ts
const router = createRouter({ routeTree, basepath: '/mfe1', history })
await router.load()
renderToString(<RouterProvider router={router} />)   // → matches: [], empty string
```

SSR needs a bootstrap sequence — `attachRouterServerSsrUtils` → `load()` →
`serverSsr.dehydrate()` — and those methods are annotated `/** Framework-only. */`
in the library's own source. They exist to be driven by TanStack Start, not by
an arbitrary host. Client-side routing works standalone; server rendering does
not.

### Blocker 2 — the `$_TSR` collision, waiting behind it

Suppose you hand-wire the bootstrap to get real markup. That is exactly what
sets up the buffer emitting TanStack's hydration scripts, and those use a single
hardcoded global:

```
@tanstack/router-core/.../ssr/constants.js   const GLOBAL_TSR = "$_TSR"
@tanstack/router-core/.../load-client.js     hydrate() reads window.$_TSR
```

Note the package: **this lives in Router, not in Start.** Start merely drives
it. The server writes the page's hydration data there, the client reads it, then
deletes it (`delete self.$_TSR`).

Two TanStack apps on one document therefore share one mailbox that each empties
after reading. They overwrite each other's data, and whichever hydrates first
deletes it before the other can read. The name is a constant with no
per-app namespace, so it cannot be configured away — the design assumes exactly
one TanStack app owns the document, which is the opposite of a micro-frontend
page.

### Why the two blockers are layered, not alternatives

Solving the first *creates* the second: you cannot get markup without attaching
the SSR utils, and attaching them is what produces the `$_TSR` scripts.

Escaping both would mean attaching the utils for the render, discarding the
buffered scripts, and passing loader data through your own channel — in effect
maintaining a private reimplementation of Start's server handler against methods
the library labels framework-only, with no stability guarantee.

### Why React Router library mode avoids this entirely

It never uses a global for hydration. Data is handed over as a plain argument:

```ts
clientEntry(container, { data, basePath })
```

No shared name, no deletion, no contention — any number of MFEs can coexist on
one page.

### The one case where the pairing would be fine

If MFEs were **CSR-only**, TanStack Router would be a perfectly good choice —
neither blocker involves client-side routing. Both appear solely because SSR is
required for SEO.
