# ssr-shell-rt

MFE shell on **React Router framework mode** (`rsbuild-plugin-react-router`),
consuming MFE1 over Module Federation — server-side for SSR, client-side for
hydration. See `../mfe-ssr-poc-synthesis.md` for why this stack was chosen.

## Requirements

Node **≥ 22.22** (React Router 8). `.nvmrc` pins 24.21.0 — same as `ssr-mfe`,
so one `nvm use` covers both.

## Running

Two terminals. **Start the MFE first** — the shell fetches its remote manifests
at request time.

```sh
# terminal 1
cd ssr-mfe && nvm use && npm install && npm run dev
#   :3001  browser federation build
#   :3002  node/SSR federation build (static file server)

# terminal 2
cd ssr-shell-rt && nvm use && npm install && npm run dev
#   :3000  the shell
```

Then open http://localhost:3000/mfe1

`npm run dev` already sets `NODE_OPTIONS=--experimental-vm-modules`, which
`@module-federation/node` needs to evaluate fetched remote entries via `vm`.

## How it fits together

| File | Role |
| --- | --- |
| `app/routes/mfe1.tsx` | Splat route for `/mfe1/*`. `loader` calls the federated `serverEntry`; `useEffect` hands the mount div to `clientEntry`. |
| `app/mfeHtmlStore.ts` | Keeps the MFE's rendered HTML out of serialized loader data — loader returns a token instead. |
| `rsbuild.config.ts` | `pluginReactRouter({ federation: true })` plus the MF plugin on the `web` and `node` environments. |
| `app/mfe1.d.ts` | Hand-written types for the `mfe1/*` federation contract. |

The shell never parses MFE1's routes. It matches `/mfe1/*` once and delegates;
everything below that belongs to MFE1's own router.

## Gotchas discovered during the PoC

- **`shared` must be omitted on the `node` environment.** With `react-router`
  shared there, the server entry consumes it before the share scope is ready →
  `__webpack_modules__[moduleId] is not a function`. Harmless: the server
  boundary is a serialized string, so instance identity doesn't matter. Client
  sharing is unaffected.
- **`vite` is a required devDependency** even though rsbuild does the building —
  `@react-router/dev`'s typegen imports it.
- **Installs need `--legacy-peer-deps`** for the React Router 8 line.
- **React Router 8 renamed the `meta` arg** from `data` to `loaderData`.
- `rsbuild-plugin-react-router` is pre-1.0 and its federation support is
  experimental — pin the exact version.

## Still unverified

Browser hydration. SSR output, loader data and head merging are all confirmed;
`hydrateRoot` matching without warnings is not. See the synthesis doc.
