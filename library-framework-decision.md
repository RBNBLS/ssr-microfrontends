# Library / Framework Decision — MFE SSR Architecture

**Date:** 2026-09-16
**Status:** Proposed
**Context:** Companion to `tanstack-start-mfe-ssr-architecture.md`. Records which
framework each side of the shell/MFE boundary uses, and why.

---

## Decision

- **Shell: TanStack Start.** It is the only SSR server. Confirmed working,
  including server-side Module Federation.
- **MFEs: universal React + a client-side router. Not TanStack Start.**
- **MFE router: React Router**, in preference to TanStack Router. See
  "Why not TanStack Router either".

The MFE contract is unchanged from the architecture doc: each MFE exposes
`serverEntry` (called in-process by the shell's server) and `clientEntry`
(loaded by the shell's browser bundle).

---

## Why not TanStack Start in the MFEs

**TanStack Start is a server framework that owns the request, the build, and the
document. An MFE owns none of those — it renders a fragment, inside the shell's
document, inside the shell's process.** Running Start on both sides means two
frameworks each assuming they are the only one on the page.

### 1. Start's output is an HTTP request handler, not a renderable unit

Start's build emits a server entry whose contract is `Request → Response`,
returning a complete `<!DOCTYPE html>…</html>` document. There is no supported
export that returns a fragment.

To federate a Start-based MFE we would have to expose its request handler, have
the shell synthesize a fake `Request`, receive a full HTML document, and scrape
the body out of it. That is not module federation — it is an HTTP call with
extra steps, and it reintroduces the per-MFE server this architecture exists to
eliminate.

### 2. Two build plugins cannot own the same compilation

Start's rsbuild plugin creates and controls the `client` and `ssr` environments —
their entries, targets, and output paths — and raises a hard error on
conflicting user configuration.

This is not theoretical. In the PoC, adding the Module Federation plugin to
Start's `ssr` environment rewrote that environment to `target: 'async-node'` and
`output.chunkLoading: 'async-node'`. Start's server bundle requires the default
node/`require` chunk loading for its own internal `loadEntries()`, so **every
route on the shell began returning 500** with:

```
TypeError: __webpack_modules__[moduleId] is not a function
    at loadEntries (dist/server/index.js)   // Start's own createStartHandler
```

The resolution was to move federation into a **separate compilation** entirely.
An MFE built with Start cannot apply that resolution: it would need to be both a
Start application and a federation remote container in one build, so there is
nothing left to separate.

### 3. Start's hydration protocol assumes it owns the page

Start's SSR/hydration handshake uses a single document-scoped global, `$_TSR`,
defined as a hardcoded constant with no namespacing option, and **deleted** once
hydration completes. Two Start apps on one document would both write it and both
delete it. This is a protocol assumption, not a tunable setting.

### 4. Our own rules already remove the reason to use it

Rule 1 of the architecture doc forbids MFE-owned servers, `createServerFn`, and
MFE-owned server routes. Subtract those from TanStack Start and what remains is
TanStack Router.

Using Start in an MFE means paying the full integration cost of a server
framework in order to use none of its server features.

---

## Why not TanStack Router either (without Start)

The natural fallback — "MFEs use TanStack Router alone, since they don't need a
server" — does not hold up in practice.

TanStack Router's SSR path is not a render function that can be called directly.
It requires a bootstrap sequence owned by Start (`attachRouterServerSsrUtils` →
`load()` → `serverSsr.dehydrate()`), and the methods involved are annotated
`/** Framework-only. */` in the library source.

Verified in the PoC: calling `router.load()` followed by `renderToString()`
without that bootstrap produces `matches: []` and an **empty HTML string**. The
MFE's module executed correctly in the shell's process — its `head.title`
reached the shell's document — but rendered nothing.

Completing the bootstrap by hand is possible, but it pulls the `$_TSR`
document-global back in (problem 3 above, now with the shell's own Start
hydration already owning that global). In effect we would be maintaining a
private reimplementation of Start's server handler against internals that carry
no API-stability guarantee.

**React Router does not have this constraint.** Its `createStaticHandler`,
`createStaticRouter`, and `StaticRouterProvider` are explicitly designed to be
driven by an arbitrary host: the host calls the handler, renders to string,
serializes loader data itself, and rehydrates via `hydrationData`. No
framework-only APIs, no document-level global.

The MFE contract, the shell splat route, the separate federation host, and the
`{ html, data, head }` boundary are all identical either way. Only one of the two
requires fighting the library.

---

## Evidence from the PoC

| Claim | How it was established |
| --- | --- |
| Server-side federation works | Shell's Node process fetched MFE1's remote container and executed its `serverEntry`; MFE-authored `head.title` appeared in the shell's rendered document |
| MF plugin breaks Start's `ssr` environment | Bisected: reproduces with `shared` removed and with every `remoteType`/`runtimePlugins` variant; disappears the moment the plugin is detached from that environment |
| Root cause of that break | MF plugin's `patchNodeConfig` sets `target: 'async-node'` + `output.chunkLoading: 'async-node'` on the attached environment |
| Start owns its build environments | `RSBUILD_ENVIRONMENT_NAMES = { client: 'client', server: 'ssr' }`; plugin throws on conflicting user config |
| `$_TSR` is a single hardcoded global | `GLOBAL_TSR = "$_TSR"` constant; read by `hydrate()`, deleted on hydration completion |
| TanStack Router can't SSR standalone | `router.load()` + `renderToString()` without Start's bootstrap yields `matches: []`, empty HTML |

---

## Consequences accepted

- **A second router library ships to the browser.** The shell uses TanStack
  Router (required by Start); MFEs use React Router. These cannot be deduplicated
  against each other.
- **Router singleton sharing is limited to MFE-to-MFE**, not shell-to-MFE.
  `react` and `react-dom` remain shared singletons across everything, which is
  what actually matters for correctness.
- **Server-side federation requires its own compilation** in the shell, loaded by
  the Start server via a runtime `require()`. This is structural and should be
  treated as part of the architecture, not as a workaround.
- **The server-side boundary is a serialized string** (`{ html, data, head }`),
  not React elements. This is a feature: it makes React instance duplication
  across the server boundary harmless.

---

## Anticipated objections

**"Version alignment is easier if every team runs the same framework."**
Alignment that matters is React, React DOM, and the Module Federation runtime —
all of which stay shared singletons regardless of router choice. Start in the
MFEs does not buy alignment; it buys a second server framework that never gets to
act as a server.

**"Can we revisit if TanStack Start adds fragment rendering or federation support?"**
Yes. The decision that would change is the MFE router, and the `serverEntry` /
`clientEntry` contract is deliberately independent of it — an MFE can be ported
without the shell changing.

**"Do all MFEs need SSR at all?"**
No, and this should be decided per MFE. The architecture already supports CSR-only
MFEs (client entry only, placeholder during SSR). Only MFEs whose content must be
indexed or link-previewed need the SSR path. MFEs behind authentication generally
do not.
