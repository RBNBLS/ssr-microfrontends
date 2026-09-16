# MFE SSR PoC — Synthesis of All Paths Tested

**Date:** 2026-09-16
**Purpose:** Record every architecture path evaluated for the SSR micro-frontend
platform, what was actually run vs. reasoned, and the evidence behind the
recommendation.
**Related:** `tanstack-start-mfe-ssr-architecture.md` (target architecture),
`library-framework-decision.md` (earlier decision record — superseded in part by
this document).

---

## TL;DR

Two combinations work. Both were run end-to-end.

| | Shell | MFE | Custom glue you maintain |
| --- | --- | --- | --- |
| **Option 1** | TanStack Start | React Router (library mode) | Separate federation compilation + 4 workarounds |
| **Option 2** ✅ | React Router (framework mode) | React Router (library mode) | One Node flag |

**Recommended: Option 2**, if you accept a pre-1.0, community-maintained build
plugin whose federation support is labelled experimental. It eliminates nearly
all custom build configuration.

**Option 1** is the conservative fallback: a more established shell framework,
but you permanently own the federation integration.

The MFE side is settled either way: **React Router in library/data mode**, with
zero custom glue.

---

## The goal

One TanStack-Start-style shell that owns the document and is the only SSR server.
MFEs are independently built, expose `serverEntry` (called in-process by the
shell during SSR) and `clientEntry` (loaded by the shell's browser bundle), and
run no server of their own. MFE content must be server-rendered for SEO.

---

## The two structural constraints everything else follows from

Nearly every failure traces back to one of these. They are worth internalising
before reading the path-by-path results.

### Constraint A — A framework's build plugin and Module Federation fight over one compilation

`@module-federation/rsbuild-plugin` rewrites whatever rsbuild environment it
attaches to: `target: 'async-node'` and `output.chunkLoading: 'async-node'` (its
`patchNodeConfig`). If the host framework's server bundle relies on the default
node/`require` chunk loading for its *own* internal chunks, it breaks — hard,
and for every route, not just federated ones.

### Constraint B — SSR frameworks assume they own the document and the hydration channel

A framework that emits a complete `<!DOCTYPE html>…</html>` and hydrates via a
single hardcoded global cannot be embedded as a fragment inside another
framework's document. This is what disqualifies any full SSR framework *inside*
an MFE, independent of whether that MFE has a server.

---

## Paths tested

| # | Path | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Start shell, MF on Start's own `ssr` environment | ❌ Failed | Every route 500s: `__webpack_modules__[moduleId] is not a function` inside Start's `loadEntries()` |
| 2 | Start shell, MF in a separate compilation | ✅ Works | `/mfe1` SSR'd with MFE content + merged title |
| 3 | MFE on TanStack Router (no Start) | ❌ Failed | `matches: []`, empty HTML string |
| 4 | MFE on React Router (library mode) | ✅ Works | Full SSR markup + loader data; **zero shell changes required** |
| 5 | MFE on TanStack Start | ⛔ Ruled out (reasoned) | Constraint B |
| 6 | Vite instead of rsbuild | ⛔ Ruled out (research) | `@module-federation/vite` is CSR-oriented, documented SSR incompatibilities |
| 7 | RR framework-mode shell + `rsbuild-plugin-react-router` | ✅ Works, simplest | MF attaches directly to its `node` environment; no separate compilation |
| 8 | Drop the "no MFE server" rule | ⛔ Not tested | Removes both blockers but sacrifices "one SSR server" — see below |

---

### Path 1 — Start shell, federation on Start's `ssr` environment ❌

The obvious approach, and it fails completely. Bisected thoroughly:

- Reproduces with `shared` removed entirely → not a shared-deps problem.
- Reproduces across every `remoteType` / `runtimePlugins` variant.
- Reproduces with `experiments.asyncStartup: true`, with **and** without eager
  sharing → `asyncStartup` addresses share-scope initialisation timing, which is
  the wrong layer.
- Disappears the instant the plugin is detached from that environment.

Cause: **Constraint A**. Start's rsbuild plugin has no awareness of Module
Federation whatsoever.

Two genuine prerequisites were discovered here and remain true for Option 1:
`shared` must be `eager: true` on the node side (otherwise
`RUNTIME-006: loadShareSync`), and Node needs `--experimental-vm-modules`.

### Path 2 — Start shell, federation in its own compilation ✅

Give federation a separate rsbuild environment, build it to its own directory,
and have Start's server load it at runtime through a native `require()` that
rspack cannot rewrite.

Works. Costs, all permanent:

1. A separate `environments.mfHost` block
2. A `serverHost.ts` federation-host module
3. `eval('require')` bootstrapping in the route (a plain import would pull it
   back into Start's graph)
4. A `{"type":"commonjs"}` marker copied into the output (the package is
   `"type": "module"`, so Node would otherwise read the CJS bundle as ESM)
5. `--experimental-vm-modules`
6. `createServerOnlyFn` / `createClientOnlyFn` wrappers to keep each federated
   import out of the wrong bundle

### Path 3 — MFE on TanStack Router alone ❌

The natural reading of "MFEs don't need a server, so Router is enough". It does
not hold.

`router.load()` + `renderToString()` produced `matches: []` and an **empty
string**. TanStack Router's SSR path requires a bootstrap sequence owned by Start
(`attachRouterServerSsrUtils` → `load()` → `serverSsr.dehydrate()`), and those
methods are annotated `/** Framework-only. */` in the library source.

Completing it by hand pulls in `$_TSR` — a single hardcoded document-global that
the shell's own Start hydration already owns. That is a private reimplementation
of Start's server handler against unstable internals.

### Path 4 — MFE on React Router, library/data mode ✅

`createStaticHandler` → `query(request)` → `createStaticRouter` →
`StaticRouterProvider`, then `createBrowserRouter` with `hydrationData` on the
client. Canonical, documented, host-agnostic APIs — they exist precisely to be
driven by an arbitrary server.

`hydrate={false}` suppresses React Router's own
`window.__staticRouterHydrationData` script; loader data rides back to
`clientEntry` as plain data instead, so nothing depends on a document-level
global.

Verified: index route SSR with loader data, deep-link SSR at `/mfe1/about`,
MFE-authored `<title>` merged into the shell's head.

**Critically: zero shell changes were needed.** The `serverEntry` / `clientEntry`
contract is genuinely router-agnostic, which makes this decision reversible.

### Path 5 — MFE on TanStack Start ⛔

Not tested; ruled out structurally. Start emits complete documents with no
fragment contract, so the shell would have to synthesize a fake `Request` and
scrape a body out of the response — an HTTP call with extra steps that
reintroduces the per-MFE server the architecture exists to remove. Plus
Constraints A and B, plus Rule 1 of the architecture doc already forbids the
server features that would justify using Start at all.

### Path 6 — Vite instead of rsbuild ⛔

Evaluated because React Router's *official* build tooling is Vite, which would
remove the community-plugin risk in Option 2.

It makes things worse. `@module-federation/vite` is designed primarily for CSR
and has documented incompatibilities with SSR frameworks, React Router framework
mode specifically. The commonly cited workaround is to drop the federation plugin
and use `@module-federation/runtime` client-side only — i.e. abandon server-side
federation, the entire capability being built.

**The trade is unavoidable:** first-party *framework* tooling (Vite) or
first-party *federation* tooling (rspack). Since server-side federation is
load-bearing for SEO, rsbuild/rspack is the correct side.

### Path 7 — React Router framework mode shell ✅ (recommended)

`pluginReactRouter({ federation: true })` plus `experiments.asyncStartup: true`,
with the MF plugin attached to the plugin's own `web` and `node` environments.

> **Why `rsbuild-plugin-react-router` is needed at all**
>
> React Router has two modes. **Library mode** is just a routing library you
> import — any bundler works, no plugin needed; that is what the MFEs use.
> **Framework mode** is the full framework (`app/routes.ts`, `loader`,
> automatic server rendering), and that is what the shell uses.
>
> Framework mode's conveniences are not runtime features — they are build-time
> transformations. Something has to strip `loader` out of the browser bundle
> because it is server-only code, turn the route list into real code-split
> chunks, generate the client and server entry files nobody wrote, and build the
> asset manifest that `<Links>`/`<Scripts>` rely on.
>
> React Router ships that machinery as a **Vite plugin** — the only one they
> publish. We cannot use Vite (Path 6: it breaks server-side federation), so we
> need the same machinery for rsbuild. `rsbuild-plugin-react-router` is exactly
> that: a reimplementation of React Router's official Vite plugin for rsbuild.
>
> Concrete example from this repo: in `app/routes/mfe1.tsx` the `loader`
> contains `import('mfe1/serverEntry')`, which must never reach the browser.
> The plugin removes it. On the TanStack Start shell the same guarantee had to
> be hand-built with `createServerOnlyFn`.
>
> Without this plugin, framework mode simply does not run on rsbuild — the
> fallback would be library mode for the shell plus a hand-written SSR server,
> document, route splitting and head management.

Works, and **Constraint A does not bite** — the plugin is federation-aware, so
federation lives directly in the server compilation.

Everything in Path 2's cost list disappears except `--experimental-vm-modules`.
Notably, framework mode's `loader` is server-only by construction, so the
Node-only federated import needs no `createServerOnlyFn` equivalent.

Total: **163 lines across 7 files**, including the root document, two routes and
all configuration.

Four things surfaced that you must know:

- **Shared deps had to be removed from the node environment.** With
  `react-router` shared there, the RR server entry consumes it synchronously
  before the share scope is ready → the same `__webpack_modules__` error.
- **Node ≥ 22.22 required** (React Router 8). Node 22.16 fails outright.
- **`@react-router/dev` typegen imports Vite** even under rsbuild — the build
  fails unless `vite` is installed as a devDependency.
- **`--legacy-peer-deps` was needed** to install the React Router 8 line
  alongside the plugin.

### Path 8 — Drop the "no MFE server" rule ⛔ (not tested)

Would remove both blockers, because you'd stop needing server-side federation
entirely: each MFE runs its own server and the shell composes fragments over
HTTP. That is a well-trodden pattern (Podium, Tailor, ESI-style).

But it does **not** solve Constraint B — Start still has no fragment contract, so
you'd own an HTML extraction layer — and it introduces two hydration roots per
page. It also sacrifices three of the four benefits the architecture doc claims:
one SSR server, no route-level reverse proxy, no Start server per MFE. Plus a
network hop inside the SSR critical path.

Worth revisiting only if independent deployability outranks "one SSR server".

---

## Comparison

### Shell options

| | TanStack Start (Path 2) | React Router framework mode (Path 7) |
| --- | --- | --- |
| **Status** | Verified working | Verified working |
| **Federation placement** | Separate compilation, loaded via `eval('require')` | Directly in the server environment |
| **Custom glue** | Separate env, host module, CJS marker, eval-require, server/client-only wrappers | None |
| **Node flag** | `--experimental-vm-modules` | `--experimental-vm-modules` |
| **Router sharing with MFEs** | Impossible (different libraries) | Possible client-side (same library) |
| **Framework maturity** | Established; rsbuild support newer | Remix lineage, very established |
| **Plugin maturity** | First-party plugin, but MF-unaware | `0.7.1`, community, federation flagged experimental |
| **Pros** | Established framework; `createServerFn`/server routes for BFF; you control the workarounds | Minimal config; integration maintained upstream; one router ecosystem; `loader` is server-only by construction |
| **Cons** | You own the federation integration permanently; 6 workarounds; two router ecosystems on the page | Pre-1.0 plugin; experimental federation; Vite dev-dep quirk; `--legacy-peer-deps`; Node ≥ 22.22 |
| **Failure mode if abandoned upstream** | None — the glue is yours | You inherit the plugin or migrate |

### MFE options

| | React Router (library) | TanStack Router | TanStack Start |
| --- | --- | --- | --- |
| **Status** | ✅ Verified | ❌ Renders empty | ⛔ Structurally unsuitable |
| **Why** | Static handler APIs are built to be host-driven | SSR bootstrap is `Framework-only`, Start-owned | Owns the document; no fragment contract |
| **Custom glue** | None | Reimplement Start's server handler | N/A |
| **Pros** | Canonical APIs; no globals; shareable with an RR shell | Stack uniformity with a Start shell | — |
| **Cons** | Second router library if the shell is Start | Unstable internals; `$_TSR` collision | Violates Rule 1; two build plugins collide |

### Build tooling

| | rsbuild / rspack | Vite |
| --- | --- | --- |
| **Module Federation** | Flagship implementation, same vendor; SSR supported | CSR-oriented; documented SSR incompatibilities |
| **React Router support** | Community plugin (`0.7.1`) | Official |
| **Verdict** | ✅ Required — server-side MF is load-bearing | ⛔ Would cost the core capability |

---

## Findings that apply regardless of choice

1. **Server-side singleton sharing does not actually work.** Start needed
   `eager: true`; React Router needed `shared` removed from the node environment
   entirely. Harmless — the server boundary is a serialized string, so instance
   identity never matters there — but do not claim it in the architecture.
   Client-side sharing is unaffected and works normally.

2. **MFE content is currently serialized three times** (~3 copies per page):
   once as rendered HTML, twice inside the shell's hydration payload, because the
   route loader returns `{ html, data, head }` and the framework serializes all
   loader data. This is our design, not a framework limitation. Fix by keeping
   `html` out of serialized loader data.

3. **rsbuild's dev server only serves the `web` environment.** The MFE's Node
   federation build must be served separately (a ~25-line static file server in
   dev; a CDN/object-store origin in production).

4. **The Node build needs its own `dev.assetPrefix`.** Otherwise its manifest
   advertises the browser dev-server origin and the shell fetches the remote from
   the wrong port.

5. **Client hydration has never been browser-verified.** The loader data reaches
   the page and the client chunk is wired, but `hydrateRoot` matching without
   warnings remains unproven. This is the largest untested risk.

6. **React Router 8 renamed the `meta` argument** from `data` to `loaderData`.

---

## Recommendation

**Adopt Option 2 — React Router framework mode shell + React Router library-mode
MFEs — if** the team is comfortable pinning `rsbuild-plugin-react-router` to an
exact version and tracking its changelog.

The reasoning is directly against the stated criteria (robust, minimal,
production-ready, minimal maintained configuration): it removes essentially all
custom build glue, and what remains is maintained upstream rather than by us.

**Choose Option 1 instead if** an experimental, pre-1.0, community-maintained
plugin in the critical build path is unacceptable for a platform many teams
depend on. The cost is roughly six permanent workarounds that you own — but they
are build wiring, not framework-internals tracking, so they will not rot on a
patch release.

**Do not** use TanStack Router or TanStack Start inside the MFEs. Both were
eliminated on evidence, not preference.

### Before committing

- Browser-verify hydration on whichever shell is chosen (finding 5).
- Fix the triple-serialization issue (finding 2).
- Decide per-MFE whether SSR is needed at all — authenticated MFEs do not need
  the SSR path and can stay CSR-only, which the architecture already supports.

---

## References

**Build plugins**
- [`rsbuild-plugin-react-router`](https://github.com/rstackjs/rsbuild-plugin-react-router) — the React Router framework-mode plugin used in Path 7
- [Module Federation in `rsbuild-plugin-react-router`](https://deepwiki.com/rspack-contrib/rsbuild-plugin-react-router/5.4-module-federation) — federation options (`federation: true`, `serverOutput`, `asyncStartup`)
- [Federation example](https://deepwiki.com/rspack-contrib/rsbuild-plugin-react-router/6.5-module-federation-example)
- [Issue #23 — MF in framework mode without a custom server script](https://github.com/rspack-contrib/rsbuild-plugin-react-router/issues/23)
- [`@module-federation/rsbuild-plugin`](https://www.npmjs.com/package/@module-federation/rsbuild-plugin)

**Module Federation**
- [Rsbuild plugin guide](https://module-federation.io/guide/build-plugins/plugins-rsbuild)
- [Module Federation on Node.js](https://module-federation.io/blog/node) — `remoteType: 'script'`, node runtime plugin
- [React SSR examples](https://deepwiki.com/module-federation/module-federation-examples/3.2-react-server-side-rendering)
- [Modern.js — MF with SSR](https://modernjs.dev/guides/topic-detail/module-federation/ssr) — first-party MF+SSR framework, if a larger framework change were ever on the table

**Vite path (rejected)**
- [React Router discussion #13444 — MF with Vite](https://github.com/remix-run/react-router/discussions/13444)
- [Vite SSR guide](https://vite.dev/guide/ssr)

**Projects in this repo**
- `ssr-shell/` — Option 1 (TanStack Start shell, separate federation compilation)
- `ssr-shell-rt/` — Option 2 (React Router framework-mode shell)
- `ssr-mfe/` — shared MFE, React Router library mode, unchanged between both
