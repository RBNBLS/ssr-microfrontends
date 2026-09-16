# ssr-shell

TanStack Start MFE shell PoC — see `../tanstack-start-mfe-ssr-architecture.md`
for the full architecture. This is the shell: the only production SSR server,
consuming MFE1 (`../ssr-mfe`) via Module Federation.

## Setup

Requires Node 22.12+ / 20.19+ (Rspack requirement) — see `.nvmrc`.

```sh
nvm use
npm install
```

## Running the full PoC

Both `ssr-mfe` and `ssr-shell` need to be running. From `ssr-mfe`:

```sh
npm run dev   # serves web build (3001) + node/SSR build (3002)
```

Then from `ssr-shell`:

```sh
NODE_OPTIONS=--experimental-vm-modules npm run dev
```

`/mfe1` is the splat route delegating to MFE1's own router.

## Known issue — Node/SSR federation blocked

The Node-side `pluginModuleFederation` call (consuming MFE1's `serverEntry`)
is commented out in `rsbuild.config.ts`. Adding it to the same `"ssr"`
environment TanStack Start's rsbuild plugin uses for its own server bundle
breaks Start's internal chunk loading — every route 500s, not just `/mfe1`,
with:

```
TypeError: __webpack_modules__[moduleId] is not a function
  at loadEntries (dist/server/index.js) — Start's own createStartHandler.js
```

Confirmed by bisection:
- Reproduces with `shared` fully removed from the MF config, so it isn't a
  shared-dependency/eager-consumption chunking issue.
- Reproduces regardless of `remoteType`/`runtimePlugins` settings.
- Disappears the moment the node/ssr `pluginModuleFederation` call is
  removed — everything else (browser-side federation, the `/mfe1` route
  code, MFE1's dual web/node build) is unaffected.

Root cause as currently understood: TanStack Start's rsbuild integration
does its own internal code-splitting for the request handler in the `ssr`
environment; layering Module Federation's Rspack plugins onto that same
compilation corrupts that chunk/module id map. This looks like a genuine
gap in current tooling support for "MF host + TanStack Start server bundle
in one rspack compilation," not a config mistake in this repo — see the
architecture doc's own "Main Technical Risks to Validate in the PoC".

Two fixes were confirmed necessary for whenever this is unblocked (keep
these — they're real, unrelated to the blocker above):
1. `shared: { ...eager: true }` on the node/ssr shared config — without it,
   `RUNTIME-006: Invalid loadShareSync` (Start's own bundle imports
   react/react-dom synchronously at boot, before any remote could
   negotiate a shared version).
2. Running Node with `--experimental-vm-modules` — `@module-federation/node`
   evaluates fetched remote entries via `vm`, which needs this flag for
   `import()` inside the sandboxed script.

Options to unblock, not yet tried:
- Run the MF-consuming code in a separate compilation/module graph from
  Start's server bundle (e.g. a small standalone Node module, built outside
  rsbuild's `environments`, that the shell's server `require()`s at
  runtime — avoids sharing a chunk graph with Start's handler entirely).
- Try other `@module-federation/rsbuild-plugin` / `@tanstack/react-start`
  version combinations.
- Configure explicit `output.uniqueName` isolation or drop to the raw
  `@module-federation/enhanced/rspack` `ModuleFederationPlugin` via
  `tools.rspack` for more control than the rsbuild plugin's abstraction
  gives.

## Build

```sh
npm run build
```
